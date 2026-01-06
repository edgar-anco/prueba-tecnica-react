import { useState, useCallback } from 'react'
import { generateSchedule } from '../utils/scheduler'
import { validateSchedule, getErrorDays } from '../utils/validators'

export function useScheduler() {
  const [scheduleData, setScheduleData] = useState(null)
  const [validation, setValidation] = useState(null)
  const [errorDays, setErrorDays] = useState([])
  const [isCalculating, setIsCalculating] = useState(false)

  const calculate = useCallback((config) => {
    setIsCalculating(true)

    setTimeout(() => {
      try {
        const result = generateSchedule(config)
        setScheduleData(result)

        const validationResult = validateSchedule(result.schedules, result.totalDays)
        setValidation(validationResult)
        setErrorDays(getErrorDays(validationResult.errors))
      } catch (error) {
        console.error('Error generating schedule:', error)
        setValidation({
          errors: [{ type: 'GENERATION_ERROR', message: error.message }],
          warnings: [],
          isValid: false
        })
      } finally {
        setIsCalculating(false)
      }
    }, 100)
  }, [])

  const reset = useCallback(() => {
    setScheduleData(null)
    setValidation(null)
    setErrorDays([])
  }, [])

  return {
    scheduleData,
    validation,
    errorDays,
    isCalculating,
    calculate,
    reset
  }
}
