import { describe, it, expect } from 'vitest'
import { generateSchedule, countDrillingPerDay, isS3Active } from './scheduler'
import { SCHEDULE_TYPES } from '../constants/scheduleTypes'

const { DRILLING, EMPTY, CLIMB, DESCENT } = SCHEDULE_TYPES

describe('generateSchedule', () => {
  describe('basic functionality', () => {
    it('should generate a schedule with all three supervisors', () => {
      const config = {
        workDays: 14,
        restDays: 7,
        inductionDays: 5,
        totalDrillingDays: 30
      }

      const result = generateSchedule(config)

      expect(result.schedules).toHaveProperty('S1')
      expect(result.schedules).toHaveProperty('S2')
      expect(result.schedules).toHaveProperty('S3')
    })

    it('should start S1 and S2 on day 0', () => {
      const config = {
        workDays: 14,
        restDays: 7,
        inductionDays: 5,
        totalDrillingDays: 30
      }

      const result = generateSchedule(config)

      expect(result.schedules.S1[0]).toBe(CLIMB)
      expect(result.schedules.S2[0]).toBe(CLIMB)
    })

    it('should have S3 start later than S1 and S2', () => {
      const config = {
        workDays: 14,
        restDays: 7,
        inductionDays: 5,
        totalDrillingDays: 30
      }

      const result = generateSchedule(config)
      const s3FirstActive = result.schedules.S3.findIndex(d => d !== EMPTY)

      expect(s3FirstActive).toBeGreaterThan(0)
    })
  })

  describe('regime 14x7 with 5 induction days', () => {
    const config = {
      workDays: 14,
      restDays: 7,
      inductionDays: 5,
      totalDrillingDays: 90
    }

    it('should generate valid schedule', () => {
      const result = generateSchedule(config)
      expect(result.totalDays).toBeGreaterThan(0)
    })

    it('should never have 3 supervisors drilling simultaneously', () => {
      const result = generateSchedule(config)
      const counts = countDrillingPerDay(result.schedules, result.totalDays)

      const hasThree = counts.some(c => c === 3)
      expect(hasThree).toBe(false)
    })
  })

  describe('regime 21x7 with 3 induction days', () => {
    const config = {
      workDays: 21,
      restDays: 7,
      inductionDays: 3,
      totalDrillingDays: 90
    }

    it('should generate valid schedule', () => {
      const result = generateSchedule(config)
      expect(result.totalDays).toBeGreaterThan(0)
    })

    it('should never have 3 supervisors drilling simultaneously', () => {
      const result = generateSchedule(config)
      const counts = countDrillingPerDay(result.schedules, result.totalDays)

      const hasThree = counts.some(c => c === 3)
      expect(hasThree).toBe(false)
    })
  })

  describe('regime 10x5 with 2 induction days', () => {
    const config = {
      workDays: 10,
      restDays: 5,
      inductionDays: 2,
      totalDrillingDays: 90
    }

    it('should generate valid schedule', () => {
      const result = generateSchedule(config)
      expect(result.totalDays).toBeGreaterThan(0)
    })
  })

  describe('regime 14x6 with 4 induction days', () => {
    const config = {
      workDays: 14,
      restDays: 6,
      inductionDays: 4,
      totalDrillingDays: 90
    }

    it('should generate valid schedule', () => {
      const result = generateSchedule(config)
      expect(result.totalDays).toBeGreaterThan(0)
    })
  })
})

describe('countDrillingPerDay', () => {
  it('should count drilling supervisors correctly', () => {
    const schedules = {
      S1: [DRILLING, DRILLING, EMPTY],
      S2: [DRILLING, EMPTY, DRILLING],
      S3: [EMPTY, DRILLING, DRILLING]
    }

    const counts = countDrillingPerDay(schedules, 3)

    expect(counts).toEqual([2, 2, 2])
  })
})

describe('isS3Active', () => {
  it('should return false when S3 has not started', () => {
    const s3 = [EMPTY, EMPTY, EMPTY]
    expect(isS3Active(s3, 2)).toBe(false)
  })

  it('should return true after S3 starts', () => {
    const s3 = [EMPTY, EMPTY, CLIMB, DRILLING]
    expect(isS3Active(s3, 3)).toBe(true)
  })
})