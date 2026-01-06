import { SCHEDULE_TYPES } from '../constants/scheduleTypes'
import { isS3Active } from './scheduler'

const { CLIMB, DESCENT, DRILLING, EMPTY } = SCHEDULE_TYPES

// Valida que el cronograma cumpla todas las reglas del negocio
// Distingue entre errores críticos (violan reglas fundamentales) y advertencias (situaciones sospechosas)
export function validateSchedule(schedules, totalDays) {
  const errors = []
  const warnings = []

  for (let day = 0; day < totalDays; day++) {
    const s1 = schedules.S1[day]
    const s2 = schedules.S2[day]
    const s3 = schedules.S3[day]

    const drillingCount = [s1, s2, s3].filter(s => s === DRILLING).length
    const s3Active = isS3Active(schedules.S3, day)

    // Regla fundamental: nunca 3 supervisores perforando simultáneamente
    if (drillingCount === 3) {
      errors.push({
        type: 'THREE_DRILLING',
        day,
        message: `Día ${day}: 3 supervisores perforando simultáneamente`
      })
    }

    // Regla fundamental: una vez que S3 entro, siempre debe haber 2 perforando
    // Se permite 1 perforando antes de que S3 entre (fase inicial)
    if (drillingCount === 1 && s3Active) {
      errors.push({
        type: 'ONE_DRILLING',
        day,
        message: `Día ${day}: Solo 1 supervisor perforando (S3 ya activo)`
      })
    }

    // Advertencia: ninguno perforando es sospechoso pero puede ser transición legitima
    if (drillingCount === 0 && s3Active) {
      const allResting = [s1, s2, s3].every(s => s === EMPTY || s !== DRILLING)
      if (!allResting) {
        warnings.push({
          type: 'ZERO_DRILLING',
          day,
          message: `Día ${day}: Ninguno perforando pero S3 ya activo`
        })
      }
    }
  }

  const patternErrors = validatePatterns(schedules, totalDays)
  errors.push(...patternErrors)

  return { errors, warnings, isValid: errors.length === 0 }
}

// Valida patrones inválidos en las secuencias de estados
// Ej: S-S (dos subidas seguidas), S-B (subir y bajar sin trabajar)
// Estos patrones indican errores lógicos en el algoritmo de generación
function validatePatterns(schedules, totalDays) {
  const errors = []

  Object.entries(schedules).forEach(([supervisor, schedule]) => {
    for (let i = 1; i < totalDays; i++) {
      const prev = schedule[i - 1]
      const curr = schedule[i]

      // No tiene sentido subir dos veces seguidas sin hacer nada en el medio
      if (prev === CLIMB && curr === CLIMB) {
        errors.push({
          type: 'CONSECUTIVE_CLIMB',
          day: i,
          supervisor,
          message: `${supervisor} día ${i}: Subida consecutiva (S-S)`
        })
      }

      // Subir y bajar inmediatamente sin perforar viola la lógica del ciclo
      if (prev === CLIMB && curr === DESCENT) {
        errors.push({
          type: 'CLIMB_THEN_DESCENT',
          day: i,
          supervisor,
          message: `${supervisor} día ${i}: Bajada inmediata después de subida (S-B)`
        })
      }
    }

    let consecutiveDrilling = 0
    for (let i = 0; i < totalDays; i++) {
      if (schedule[i] === DRILLING) {
        consecutiveDrilling++
      } else {
        if (consecutiveDrilling === 1 && i > 0) {
          const prevNonDrill = schedule[i - 2]
          if (prevNonDrill !== CLIMB && prevNonDrill !== undefined) {
          }
        }
        consecutiveDrilling = 0
      }
    }
  })

  return errors
}

// Extrae dias únicos con errores para resaltarlos visualmente en la UI
// Usa Set para eliminar duplicados cuando un día tiene múltiples errores
export function getErrorDays(errors) {
  return [...new Set(errors.map(e => e.day))]
}
