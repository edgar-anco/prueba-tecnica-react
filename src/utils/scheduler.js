import { SCHEDULE_TYPES } from '../constants/scheduleTypes'

const { CLIMB, INDUCTION, DRILLING, DESCENT, REST, EMPTY } = SCHEDULE_TYPES

export function generateSchedule(config) {
  const { workDays, restDays, inductionDays, totalDrillingDays } = config

  const realRestDays = restDays - 2

  const totalDays = calculateTotalDays(totalDrillingDays, workDays, restDays, inductionDays)

  const s1Schedule = new Array(totalDays).fill(EMPTY)
  const s2Schedule = new Array(totalDays).fill(EMPTY)
  const s3Schedule = new Array(totalDays).fill(EMPTY)

  generateSupervisorCycle(s1Schedule, 0, totalDays, workDays, inductionDays, realRestDays, totalDrillingDays, true)

  const s1FirstDescentDay = s1Schedule.indexOf(DESCENT)
  const s3StartDay = Math.max(0, s1FirstDescentDay - inductionDays - 1)

  generateSupervisorCycle(s3Schedule, s3StartDay, totalDays, workDays, inductionDays, realRestDays, totalDrillingDays, true)

  generateS2Adaptive(s2Schedule, s1Schedule, s3Schedule, totalDays, workDays, inductionDays, realRestDays, totalDrillingDays)

  return {
    schedules: {
      S1: s1Schedule,
      S2: s2Schedule,
      S3: s3Schedule
    },
    totalDays,
    config
  }
}

// Se estiman días totales con margen amplio porque es más eficiente sobredimensionar el array y recortarlo después, que quedarse corto
function calculateTotalDays(totalDrillingDays, workDays, restDays, inductionDays) {
  const drillingPerCycle = workDays - inductionDays - 1
  const cycleLength = workDays + restDays
  const estimatedCycles = Math.ceil(totalDrillingDays / drillingPerCycle) * 3

  return Math.max(estimatedCycles * cycleLength, totalDrillingDays * 3)
}

// Genera un ciclo estándar S->I->P->B->D repetido hasta completar dias objetivo
// Usado para S1 y S3 porque siguen el patrón regular sin ajustes dinámicos
function generateSupervisorCycle(schedule, startDay, totalDays, workDays, inductionDays, realRestDays, targetDrillingDays, includeInduction) {
  let day = startDay
  let drillingCount = 0
  let isFirstCycle = true

  while (day < totalDays && drillingCount < targetDrillingDays) {
    schedule[day] = CLIMB
    day++
    if (day >= totalDays) break

    const inductionForCycle = (isFirstCycle && includeInduction) ? inductionDays : 0
    for (let i = 0; i < inductionForCycle && day < totalDays; i++) {
      schedule[day] = INDUCTION
      day++
    }
    if (day >= totalDays) break

    const baseDrillingDays = isFirstCycle
      ? workDays - inductionDays - 1
      : workDays - 1

    for (let i = 0; i < baseDrillingDays && day < totalDays && drillingCount < targetDrillingDays; i++) {
      schedule[day] = DRILLING
      drillingCount++
      day++
    }

    if (drillingCount >= targetDrillingDays || day >= totalDays) break

    schedule[day] = DESCENT
    day++
    if (day >= totalDays) break

    for (let i = 0; i < realRestDays && day < totalDays; i++) {
      schedule[day] = REST
      day++
    }

    isFirstCycle = false
  }
}

// S2 es adaptativo porque debe reaccionar a S1 y S3 para mantener siempre 2 perforando
// Observa día a día cuántos otros están perforando y decide si perforar, descansar o volver
function generateS2Adaptive(s2Schedule, s1Schedule, s3Schedule, totalDays, workDays, inductionDays, realRestDays, targetDrillingDays) {
  let day = 0
  let drillingCount = 0

  s2Schedule[day] = CLIMB
  day++

  for (let i = 0; i < inductionDays && day < totalDays; i++) {
    s2Schedule[day] = INDUCTION
    day++
  }

  while (day < totalDays && drillingCount < targetDrillingDays) {
    const s1Drilling = s1Schedule[day] === DRILLING
    const s3Drilling = s3Schedule[day] === DRILLING
    const s3HasStarted = hasS3Started(s3Schedule, day)
    const othersCount = (s1Drilling ? 1 : 0) + (s3Drilling ? 1 : 0)

    if (!s3HasStarted) {
      s2Schedule[day] = DRILLING
      drillingCount++
      day++
      continue
    }

    if (othersCount === 2) {
      const lookAhead = findNextGap(s1Schedule, s3Schedule, day, totalDays)

      if (lookAhead.gapStart !== -1) {
        const daysUntilGap = lookAhead.gapStart - day
        const minCycleToReturn = realRestDays + 2

        // Solo se toma descanso completo si hay tiempo suficiente para volver cuando se necesite
        // Evita fragmentacion de ciclos que podría crear patrones inválidos
        if (daysUntilGap >= minCycleToReturn) {
          startRestCycle(s2Schedule, day, realRestDays, totalDays)
          day = findNextClimbPosition(s2Schedule, day)
          continue
        }
      }

      s2Schedule[day] = REST
      day++
      continue
    }

    if (othersCount === 1) {
      const prevState = day > 0 ? s2Schedule[day - 1] : EMPTY

      // Si S2 estaba descansando y ahora solo hay 1 perforando, debe volver urgente
      if (prevState === REST || prevState === EMPTY) {
        s2Schedule[day] = CLIMB
        day++
        if (day < totalDays && drillingCount < targetDrillingDays) {
          s2Schedule[day] = DRILLING
          drillingCount++
        }
        day++
        continue
      }

      if (prevState === DRILLING || prevState === INDUCTION || prevState === CLIMB) {
        s2Schedule[day] = DRILLING
        drillingCount++
        day++
        continue
      }

      if (prevState === DESCENT) {
        s2Schedule[day] = REST
        day++
        continue
      }
    }

    if (othersCount === 0) {
      const prevState = day > 0 ? s2Schedule[day - 1] : EMPTY

      if (prevState === REST || prevState === EMPTY) {
        s2Schedule[day] = CLIMB
      } else {
        s2Schedule[day] = DRILLING
        drillingCount++
      }
      day++
      continue
    }

    day++
  }

  fixSchedulePatterns(s2Schedule, totalDays)
}

function hasS3Started(s3Schedule, upToDay) {
  for (let i = 0; i <= upToDay; i++) {
    if (s3Schedule[i] !== EMPTY) return true
  }
  return false
}

// Busca el próximo momento donde habrá menos de 2 perforando
// Permite a S2 planificar descansos completos en vez de fragmentados
function findNextGap(s1Schedule, s3Schedule, fromDay, totalDays) {
  for (let i = fromDay; i < totalDays; i++) {
    const s1D = s1Schedule[i] === DRILLING
    const s3D = s3Schedule[i] === DRILLING
    const count = (s1D ? 1 : 0) + (s3D ? 1 : 0)

    if (count < 2) {
      let gapLength = 0
      for (let j = i; j < totalDays; j++) {
        const c1 = s1Schedule[j] === DRILLING
        const c3 = s3Schedule[j] === DRILLING
        if ((c1 ? 1 : 0) + (c3 ? 1 : 0) < 2) {
          gapLength++
        } else {
          break
        }
      }
      return { gapStart: i, gapLength }
    }
  }
  return { gapStart: -1, gapLength: 0 }
}

function startRestCycle(schedule, fromDay, realRestDays, totalDays) {
  if (fromDay < totalDays) {
    schedule[fromDay] = DESCENT
  }
  for (let i = 1; i <= realRestDays && fromDay + i < totalDays; i++) {
    schedule[fromDay + i] = REST
  }
}

function findNextClimbPosition(schedule, fromDay) {
  for (let i = fromDay; i < schedule.length; i++) {
    if (schedule[i] === EMPTY) return i
  }
  return schedule.length
}

// Corrige patrones inválidos que pueden surgir del algoritmo adaptativo
// Ej: S-S (doble subida), S-B (subir y bajar sin perforar)
function fixSchedulePatterns(schedule, totalDays) {
  for (let i = 1; i < totalDays; i++) {
    if (schedule[i - 1] === CLIMB && schedule[i] === CLIMB) {
      schedule[i - 1] = REST
    }

    if (schedule[i - 1] === CLIMB && schedule[i] === DESCENT) {
      schedule[i] = DRILLING
    }

    if (schedule[i - 1] === DESCENT && schedule[i] === CLIMB) {
      schedule[i - 1] = REST
      let j = i - 2
      while (j >= 0 && schedule[j] === DRILLING) {
        j--
      }
      if (j >= 0 && schedule[j] === REST) {
        schedule[j] = DESCENT
      }
    }
  }
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
