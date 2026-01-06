import { SCHEDULE_TYPES } from '../constants/scheduleTypes'

const { CLIMB, INDUCTION, DRILLING, DESCENT, REST, EMPTY } = SCHEDULE_TYPES

export function generateSchedule(config) {
  const { workDays, restDays, inductionDays, totalDrillingDays } = config

  // Uso de Math.max para asegurar al menos 1 dia de descanso real
  // Evita errores en regímenes muy cortos
  const realRestDays = Math.max(1, restDays - 2)
  const totalDays = calculateTotalDays(totalDrillingDays, workDays, restDays)

  const s1 = new Array(totalDays).fill(EMPTY)
  const s2 = new Array(totalDays).fill(EMPTY)
  const s3 = new Array(totalDays).fill(EMPTY)

  generateStandardCycle(s1, 0, totalDays, workDays, inductionDays, realRestDays, totalDrillingDays)

  const s1FirstDescent = s1.indexOf(DESCENT)
  const s3Entry = Math.max(0, s1FirstDescent - inductionDays - 1)

  generateStandardCycle(s3, s3Entry, totalDays, workDays, inductionDays, realRestDays, totalDrillingDays)

  generateAdaptiveS2(s2, s1, s3, totalDays, workDays, inductionDays, realRestDays, totalDrillingDays)

  // Se recorta el cronograma al último día activo para no mostrar días vacíos innecesarios
  const trimmedLength = findLastActiveDay(s1, s2, s3) + 1

  return {
    schedules: {
      S1: s1.slice(0, trimmedLength),
      S2: s2.slice(0, trimmedLength),
      S3: s3.slice(0, trimmedLength)
    },
    totalDays: trimmedLength,
    config
  }
}

// Fórmula simplificada: totalDrillingDays * 4 asegura espacio suficiente
// Mas simple y predecible que cálculos complejos de ciclos
function calculateTotalDays(totalDrillingDays, workDays, restDays) {
  return totalDrillingDays * 4
}

function generateStandardCycle(schedule, startDay, totalDays, workDays, inductionDays, realRestDays, targetDrilling) {
  let day = startDay
  let drilled = 0
  let firstCycle = true

  while (day < totalDays && drilled < targetDrilling) {
    schedule[day++] = CLIMB
    if (day >= totalDays) break

    if (firstCycle) {
      for (let i = 0; i < inductionDays && day < totalDays; i++) {
        schedule[day++] = INDUCTION
      }
    }
    if (day >= totalDays) break

    const drillingDays = firstCycle ? workDays - inductionDays - 1 : workDays - 1

    for (let i = 0; i < drillingDays && day < totalDays && drilled < targetDrilling; i++) {
      schedule[day++] = DRILLING
      drilled++
    }

    if (drilled >= targetDrilling || day >= totalDays) break

    schedule[day++] = DESCENT
    if (day >= totalDays) break

    for (let i = 0; i < realRestDays && day < totalDays; i++) {
      schedule[day++] = REST
    }

    firstCycle = false
  }
}

// Máquina de estados para S2: más predecible que condicionales anidadas
// Estados: INIT -> INDUCTION -> DRILLING <-> REST <-> CLIMBING_BACK
// Mejora sobre versión anterior al hacer transiciones más explícitas
function generateAdaptiveS2(s2, s1, s3, totalDays, workDays, inductionDays, realRestDays, targetDrilling) {
  let drilled = 0
  let state = 'INIT'
  let daysInState = 0

  for (let day = 0; day < totalDays && drilled < targetDrilling; day++) {
    const s1D = s1[day] === DRILLING
    const s3D = s3[day] === DRILLING
    const s3Active = isS3ActiveAtDay(s3, day)
    const othersCount = (s1D ? 1 : 0) + (s3D ? 1 : 0)

    switch (state) {
      case 'INIT':
        s2[day] = CLIMB
        state = 'INDUCTION'
        daysInState = 0
        break

      case 'INDUCTION':
        s2[day] = INDUCTION
        daysInState++
        if (daysInState >= inductionDays) {
          state = 'DRILLING'
          daysInState = 0
        }
        break

      case 'DRILLING':
        // Si ya hay 2 perforando, S2 debe descansar
        if (othersCount >= 2 && s3Active) {
          const nextNeed = findNextGapDay(s1, s3, day, totalDays)
          if (nextNeed !== -1) {
            const cycleNeeded = 1 + realRestDays + 1

            // Solo descansa si tiene tiempo de hacer ciclo completo y volver
            if (nextNeed - day >= cycleNeeded) {
              s2[day] = DESCENT
              state = 'REST'
              daysInState = 0
              break
            }
          }
          s2[day] = DESCENT
          state = 'REST'
          daysInState = 0
        } else {
          s2[day] = DRILLING
          drilled++
          daysInState++
        }
        break

      case 'REST':
        s2[day] = REST
        daysInState++

        const needNow = othersCount < 2 && s3Active
        const enoughRest = daysInState >= realRestDays

        // Vuelve antes si es urgente (solo 1 perforando) o si ya descanso suficiente
        if (needNow || (enoughRest && othersCount < 2)) {
          state = 'CLIMBING_BACK'
        }
        break

      case 'CLIMBING_BACK':
        s2[day] = CLIMB
        state = 'DRILLING'
        daysInState = 0
        break
    }
  }

  refineS2Schedule(s2, s1, s3, totalDays, realRestDays, targetDrilling)
}

function isS3ActiveAtDay(s3, day) {
  for (let i = 0; i <= day; i++) {
    if (s3[i] !== EMPTY) return true
  }
  return false
}

function findNextGapDay(s1, s3, fromDay, totalDays) {
  for (let i = fromDay + 1; i < totalDays; i++) {
    const s1D = s1[i] === DRILLING
    const s3D = s3[i] === DRILLING
    if ((s1D ? 1 : 0) + (s3D ? 1 : 0) < 2) {
      return i
    }
  }
  return -1
}

// Segunda pasada sobre S2 para llenar gaps que la máquina de estados pudo haber dejado
// Necesario porque la máquina de estados es secuencial y puede perder oportunidades de optimización
function refineS2Schedule(s2, s1, s3, totalDays, realRestDays, targetDrilling) {
  let drilled = s2.filter(d => d === DRILLING).length

  for (let day = 0; day < totalDays; day++) {
    const s1D = s1[day] === DRILLING
    const s3D = s3[day] === DRILLING
    const s2D = s2[day] === DRILLING
    const s3Active = isS3ActiveAtDay(s3, day)

    const total = (s1D ? 1 : 0) + (s3D ? 1 : 0) + (s2D ? 1 : 0)

    // Si hay menos de 2 perforando, intentar agregar a S2
    if (total < 2 && s3Active && drilled < targetDrilling) {
      const prev = day > 0 ? s2[day - 1] : EMPTY

      if (s2[day] === EMPTY || s2[day] === REST) {
        if (prev === REST || prev === EMPTY || prev === DESCENT) {
          s2[day] = CLIMB

          // Proyectar hacia adelante para crear ciclo coherente
          for (let j = day + 1; j < totalDays && drilled < targetDrilling; j++) {
            const os1 = s1[j] === DRILLING
            const os3 = s3[j] === DRILLING
            const oCount = (os1 ? 1 : 0) + (os3 ? 1 : 0)

            if (oCount < 2) {
              if (s2[j] !== DRILLING) {
                s2[j] = DRILLING
                drilled++
              }
            } else if (oCount >= 2) {
              if (s2[j] !== DESCENT) {
                s2[j] = DESCENT
              }
              break
            }
          }
        } else if (prev === DRILLING || prev === CLIMB || prev === INDUCTION) {
          s2[day] = DRILLING
          drilled++
        }
      }
    }

    // Si hay más de 2 perforando, forzar a S2 a bajar
    if (total > 2) {
      if (s2D) {
        s2[day] = DESCENT
        drilled--
      }
    }
  }

  fixPatternErrors(s2, totalDays)
}

// Corrige patrones sintácticos inválidos que pueden surgir del refinamiento
// Versión simplificada vs algoritmo anterior (menos casos edge)
function fixPatternErrors(schedule, totalDays) {
  for (let i = 1; i < totalDays; i++) {
    const prev = schedule[i - 1]
    const curr = schedule[i]

    if (prev === CLIMB && curr === CLIMB) {
      schedule[i] = INDUCTION
    }

    if (prev === CLIMB && curr === DESCENT) {
      schedule[i] = DRILLING
    }

    if (prev === DESCENT && curr === DESCENT) {
      schedule[i] = REST
    }
  }
}

// Encuentra el último día donde algún supervisor está activo
// Permite recortar días vacíos al final del cronograma
function findLastActiveDay(s1, s2, s3) {
  let last = 0
  const schedules = [s1, s2, s3]

  for (const s of schedules) {
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i] !== EMPTY) {
        last = Math.max(last, i)
        break
      }
    }
  }

  return last
}

export function countDrillingPerDay(schedules, totalDays) {
  const counts = []
  for (let day = 0; day < totalDays; day++) {
    let count = 0
    if (schedules.S1[day] === DRILLING) count++
    if (schedules.S2[day] === DRILLING) count++
    if (schedules.S3[day] === DRILLING) count++
    counts.push(count)
  }
  return counts
}

export function isS3Active(s3Schedule, day) {
  for (let i = 0; i <= day; i++) {
    if (s3Schedule[i] !== EMPTY) return true
  }
  return false
}

export function getTotalDrillingDays(schedule) {
  return schedule.filter(day => day === DRILLING).length
}
