import { SCHEDULE_TYPES } from '../constants/scheduleTypes'

const { CLIMB, INDUCTION, DRILLING, DESCENT, REST, EMPTY } = SCHEDULE_TYPES

// ============================================================================
// FUNCIÓN PRINCIPAL: Genera el cronograma para los 3 supervisores
// ============================================================================
// Reglas fundamentales:
// 1. Siempre debe haber EXACTAMENTE 2 supervisores perforando (después de que S3 entre)
// 2. NUNCA deben estar 3 supervisores perforando al mismo tiempo
// 3. S1 cumple el régimen completo sin modificaciones
// 4. S2 y S3 se ajustan para cumplir las reglas
// ============================================================================
export function generateSchedule(config) {
  const { workDays, restDays, inductionDays, totalDrillingDays } = config

  const realRestDays = Math.max(1, restDays - 2)

  // Buffer de días suficiente para generar todos los ciclos
  const totalDays = calculateTotalDays(totalDrillingDays, workDays, restDays)

  const s1 = new Array(totalDays).fill(EMPTY)
  const s2 = new Array(totalDays).fill(EMPTY)
  const s3 = new Array(totalDays).fill(EMPTY)

  // Calcular el número mínimo de días de perforación para cada supervisor
  // Con 2 supervisores perforando siempre, cada uno necesita perforar aproximadamente la mitad de los días del proyecto, más margen para ciclos de descanso
  const estimatedDrillingDaysPerSupervisor = Math.ceil(totalDrillingDays * 1.2)

  // PASO 1: Generar S1 (ciclo estándar, no se modifica)
  generateStandardCycle(s1, 0, totalDays, workDays, inductionDays, realRestDays, estimatedDrillingDaysPerSupervisor)

  // PASO 2: Calcular cuándo debe entrar S3
  // S3 debe entrar para que empiece a perforar justo cuando S1 baja
  const s1FirstDescent = s1.indexOf(DESCENT)
  const s3Entry = Math.max(0, s1FirstDescent - inductionDays - 1)

  // PASO 3: Generar S3 (ciclo estándar desde su día de entrada)
  generateStandardCycle(s3, s3Entry, totalDays, workDays, inductionDays, realRestDays, estimatedDrillingDaysPerSupervisor)

  // PASO 4: Generar S2 (ADAPTATIVO - se ajusta a S1 y S3)
  generateAdaptiveS2(s2, s1, s3, totalDays, workDays, inductionDays, realRestDays, totalDrillingDays)

  // PASO 5: Recortar el cronograma cuando se alcancen los días de proyecto requeridos
  // Buscar el día donde se hayan completado aproximadamente totalDrillingDays días calendario con 2 supervisores perforando
  const trimmedLength = findProjectEndDay(s1, s2, s3, totalDays, totalDrillingDays)

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

// Buffer de días: totalDrillingDays * 4 asegura espacio suficiente
function calculateTotalDays(totalDrillingDays, workDays, restDays) {
  return totalDrillingDays * 4
}

// ============================================================================
// Genera ciclo estándar para S1 y S3
// Secuencia: SUBIDA -> INDUCCIÓN (solo primer ciclo) -> PERFORACIÓN -> BAJADA -> DESCANSO
// ============================================================================
function generateStandardCycle(schedule, startDay, totalDays, workDays, inductionDays, realRestDays, targetDrilling) {
  let day = startDay
  let drilled = 0
  let firstCycle = true

  while (day < totalDays && drilled < targetDrilling) {
    // SUBIDA (1 día)
    schedule[day++] = CLIMB
    if (day >= totalDays) break

    // INDUCCIÓN (solo primer ciclo)
    if (firstCycle) {
      for (let i = 0; i < inductionDays && day < totalDays; i++) {
        schedule[day++] = INDUCTION
      }
    }
    if (day >= totalDays) break

    // PERFORACIÓN
    // Primer ciclo: workDays - inductionDays - 1 (resta subida e inducción)
    // Ciclos siguientes: workDays - 1 (resta subida)
    const drillingDays = firstCycle ? workDays - inductionDays - 1 : workDays - 1

    for (let i = 0; i < drillingDays && day < totalDays && drilled < targetDrilling; i++) {
      schedule[day++] = DRILLING
      drilled++
    }

    if (drilled >= targetDrilling || day >= totalDays) break

    // BAJADA (1 día)
    schedule[day++] = DESCENT
    if (day >= totalDays) break

    // DESCANSO
    for (let i = 0; i < realRestDays && day < totalDays; i++) {
      schedule[day++] = REST
    }

    firstCycle = false
  }
}

// ============================================================================
// ALGORITMO ADAPTATIVO PARA S2
// ============================================================================
// Enfoque: S2 perfora siempre que se necesite completar 2 supervisores perforando.
//
// La estrategia es:
// 1. S2 empieza igual que S1 (subida + inducción)
// 2. S2 perfora mientras se necesite (cuando S1+S3 < 2)
// 3. S2 descansa cuando S1+S3 = 2 (y tiene tiempo para su ciclo de descanso)
// 4. S2 vuelve cuando S1+S3 < 2 de nuevo
// ============================================================================
function generateAdaptiveS2(s2, s1, s3, totalDays, workDays, inductionDays, realRestDays, targetDrilling) {
  // Encontrar el día en que S3 empieza a perforar por primera vez
  const s3FirstDrilling = s3.indexOf(DRILLING)

  // Encontrar el último día de actividad relevante
  const lastRelevantDay = findLastDrillingDay(s1, s3, totalDays)

  let day = 0

  // FASE 1: Ciclo inicial de S2 (igual que S1)
  // Subida
  s2[day++] = CLIMB

  // Inducción
  for (let i = 0; i < inductionDays && day < totalDays; i++) {
    s2[day++] = INDUCTION
  }

  // FASE 2: Perforación adaptativa
  let consecutiveRest = 0
  let state = 'DRILLING' // Estados: DRILLING, DESCENDING, RESTING, CLIMBING

  while (day <= lastRelevantDay && day < totalDays) {
    const s1Drilling = s1[day] === DRILLING
    const s3Drilling = s3[day] === DRILLING
    const othersCount = (s1Drilling ? 1 : 0) + (s3Drilling ? 1 : 0)
    const s3Active = day >= s3FirstDrilling

    switch (state) {
      case 'DRILLING':
        if (othersCount >= 2 && s3Active) {
          // Ya hay 2 perforando sin S2, puede descansar si tiene tiempo
          const nextGapDay = findNextGapDayFrom(s1, s3, day, totalDays)
          const minCycleDays = 1 + 1 + 1 // bajada + descanso + subida

          if (nextGapDay !== -1 && (nextGapDay - day) >= minCycleDays) {
            s2[day] = DESCENT
            state = 'DESCENDING'
          } else {
            // No hay tiempo para descansar, S2 también perfora
            s2[day] = DRILLING
          }
        } else {
          // Se necesita a S2 perforando
          s2[day] = DRILLING
        }
        break

      case 'DESCENDING':
        // Día después de bajada = descanso
        s2[day] = REST
        state = 'RESTING'
        consecutiveRest = 1
        break

      case 'RESTING':
        // Buscar gap desde día SIGUIENTE para anticipar
        const nextGapDayFromRest = findNextGapDayFrom(s1, s3, day + 1, totalDays)

        if (othersCount < 2 && s3Active) {
          // Se necesita a S2 HOY
          s2[day] = CLIMB
          state = 'CLIMBING'
          consecutiveRest = 0
        } else if (nextGapDayFromRest !== -1 && (nextGapDayFromRest - day) === 1) {
          // Gap es MAÑANA, debe subir HOY
          s2[day] = CLIMB
          state = 'CLIMBING'
          consecutiveRest = 0
        } else if (consecutiveRest >= realRestDays && nextGapDayFromRest !== -1 && (nextGapDayFromRest - day) <= 2) {
          // Ya descansó suficiente y gap está cerca
          s2[day] = CLIMB
          state = 'CLIMBING'
          consecutiveRest = 0
        } else {
          // Continuar descansando
          s2[day] = REST
          consecutiveRest++
        }
        break

      case 'CLIMBING':
        // Día después de subida = perforación
        s2[day] = DRILLING
        state = 'DRILLING'
        break
    }

    day++
  }

  // Fase final: Corregir cualquier problema de 3 perforando
  correctThreeDrilling(s2, s1, s3, lastRelevantDay + 1)

  // Rellenar huecos y corregir patrones
  fillEmptyDays(s2, totalDays)
  fixPatternErrors(s2, totalDays)
}

// Encuentra el último día donde hay perforación en S1 o S3
function findLastDrillingDay(s1, s3, totalDays) {
  for (let day = totalDays - 1; day >= 0; day--) {
    if (s1[day] === DRILLING || s3[day] === DRILLING) {
      return day
    }
  }
  return 0
}

// Encuentra el día donde se completan los días de proyecto requeridos
// Cuenta los días calendario donde hay 2 supervisores perforando
function findProjectEndDay(s1, s2, s3, totalDays, targetProjectDays) {
  let daysWithTwoDrilling = 0
  let lastDayWithTwo = 0

  for (let day = 0; day < totalDays; day++) {
    const count = (s1[day] === DRILLING ? 1 : 0) +
                  (s2[day] === DRILLING ? 1 : 0) +
                  (s3[day] === DRILLING ? 1 : 0)

    if (count === 2) {
      daysWithTwoDrilling++
      lastDayWithTwo = day

      // Terminar cuando hayamos alcanzado los días objetivo
      if (daysWithTwoDrilling >= targetProjectDays) {
        return day + 1 // +1 porque se quiere la longitud, no el índice
      }
    }
  }

  // Si no se alcanza el objetivo, devolver el último día con 2 perforando más un margen para incluir los días finales de transición
  return lastDayWithTwo + 1
}

// Encuentra el último día donde hay 2 supervisores perforando
function findLastTwoDrillingDay(s1, s2, s3, totalDays) {
  for (let day = totalDays - 1; day >= 0; day--) {
    const count = (s1[day] === DRILLING ? 1 : 0) +
                  (s2[day] === DRILLING ? 1 : 0) +
                  (s3[day] === DRILLING ? 1 : 0)
    if (count === 2) {
      return day
    }
  }
  return findLastActiveDay(s1, s2, s3)
}

// Encuentra el próximo día donde S1+S3 < 2 perforando
function findNextGapDayFrom(s1, s3, fromDay, totalDays) {
  for (let day = fromDay; day < totalDays; day++) {
    const s1D = s1[day] === DRILLING ? 1 : 0
    const s3D = s3[day] === DRILLING ? 1 : 0
    if (s1D + s3D < 2) {
      return day
    }
  }
  return -1
}

// Corrige días donde hay 3 supervisores perforando
function correctThreeDrilling(s2, s1, s3, totalDays) {
  for (let day = 0; day < totalDays; day++) {
    const s1D = s1[day] === DRILLING
    const s3D = s3[day] === DRILLING
    const s2D = s2[day] === DRILLING

    if (s1D && s3D && s2D) {
      // 3 perforando, S2 debe no perforar
      const prev = day > 0 ? s2[day - 1] : EMPTY
      if (prev === DRILLING) {
        s2[day] = DESCENT
      } else {
        s2[day] = REST
      }
    }
  }
}

// Rellena días vacíos con DESCANSO para evitar gaps en el cronograma
function fillEmptyDays(schedule, totalDays) {
  for (let day = 0; day < totalDays; day++) {
    if (schedule[day] === EMPTY) {
      const hasBefore = day > 0 && schedule[day - 1] !== EMPTY
      const hasAfter = schedule.slice(day + 1).some(d => d !== EMPTY)

      if (hasBefore && hasAfter) {
        schedule[day] = REST
      }
    }
  }
}

// Corrige patrones sintácticos inválidos (S-S, S-B, B-B)
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

// ============================================================================
// FUNCIONES EXPORTADAS AUXILIARES
// ============================================================================

// Cuenta cuántos supervisores están perforando cada día
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

// Verifica si S3 ya ha iniciado actividad hasta el día dado
export function isS3Active(s3Schedule, day) {
  for (let i = 0; i <= day; i++) {
    if (s3Schedule[i] !== EMPTY) return true
  }
  return false
}

// Cuenta el total de días de perforación de un cronograma
export function getTotalDrillingDays(schedule) {
  return schedule.filter(day => day === DRILLING).length
}
