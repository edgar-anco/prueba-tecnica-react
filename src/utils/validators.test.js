import { describe, it, expect } from 'vitest'
import { validateSchedule, getErrorDays } from './validators'
import { SCHEDULE_TYPES } from '../constants/scheduleTypes'

const { DRILLING, EMPTY, CLIMB, DESCENT, REST, INDUCTION } = SCHEDULE_TYPES

describe('validateSchedule', () => {
  describe('drilling count validation', () => {
    it('should detect when 3 supervisors are drilling', () => {
      const schedules = {
        S1: [DRILLING, DRILLING],
        S2: [DRILLING, DRILLING],
        S3: [DRILLING, DRILLING]
      }

      const result = validateSchedule(schedules, 2)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'THREE_DRILLING')).toBe(true)
    })

    it('should detect when only 1 supervisor is drilling after S3 started', () => {
      const schedules = {
        S1: [DRILLING, REST, REST],
        S2: [DRILLING, REST, REST],
        S3: [EMPTY, CLIMB, DRILLING]
      }

      const result = validateSchedule(schedules, 3)

      expect(result.errors.some(e => e.type === 'ONE_DRILLING')).toBe(true)
    })

    it('should accept exactly 2 supervisors drilling', () => {
      const schedules = {
        S1: [DRILLING, DRILLING],
        S2: [DRILLING, DRILLING],
        S3: [EMPTY, EMPTY]
      }

      const result = validateSchedule(schedules, 2)

      expect(result.errors.filter(e =>
        e.type === 'THREE_DRILLING' || e.type === 'ONE_DRILLING'
      ).length).toBe(0)
    })
  })

  describe('pattern validation', () => {
    it('should detect consecutive climbs (S-S)', () => {
      const schedules = {
        S1: [CLIMB, CLIMB],
        S2: [DRILLING, DRILLING],
        S3: [EMPTY, EMPTY]
      }

      const result = validateSchedule(schedules, 2)

      expect(result.errors.some(e => e.type === 'CONSECUTIVE_CLIMB')).toBe(true)
    })

    it('should detect climb then descent (S-B)', () => {
      const schedules = {
        S1: [CLIMB, DESCENT],
        S2: [DRILLING, DRILLING],
        S3: [EMPTY, EMPTY]
      }

      const result = validateSchedule(schedules, 2)

      expect(result.errors.some(e => e.type === 'CLIMB_THEN_DESCENT')).toBe(true)
    })
  })
})

describe('getErrorDays', () => {
  it('should return unique error days', () => {
    const errors = [
      { day: 5, type: 'THREE_DRILLING' },
      { day: 5, type: 'CONSECUTIVE_CLIMB' },
      { day: 10, type: 'ONE_DRILLING' }
    ]

    const days = getErrorDays(errors)

    expect(days).toEqual([5, 10])
  })
})