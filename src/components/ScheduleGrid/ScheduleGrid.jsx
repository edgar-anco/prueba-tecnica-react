import { useMemo } from 'react'
import { SCHEDULE_TYPES, SCHEDULE_LABELS } from '../../constants/scheduleTypes'
import { countDrillingPerDay, isS3Active } from '../../utils/scheduler'
import styles from './ScheduleGrid.module.css'

function ScheduleGrid({ scheduleData, errorDays }) {
  const { schedules, totalDays } = scheduleData

  const drillingCounts = useMemo(() =>
    countDrillingPerDay(schedules, totalDays),
    [schedules, totalDays]
  )

  const visibleDays = useMemo(() => {
    let lastActiveDay = 0
    for (let i = totalDays - 1; i >= 0; i--) {
      if (schedules.S1[i] !== SCHEDULE_TYPES.EMPTY ||
          schedules.S2[i] !== SCHEDULE_TYPES.EMPTY ||
          schedules.S3[i] !== SCHEDULE_TYPES.EMPTY) {
        lastActiveDay = i
        break
      }
    }
    return Math.min(lastActiveDay + 5, totalDays)
  }, [schedules, totalDays])

  const getCellClass = (type) => {
    const classMap = {
      [SCHEDULE_TYPES.CLIMB]: styles.climb,
      [SCHEDULE_TYPES.INDUCTION]: styles.induction,
      [SCHEDULE_TYPES.DRILLING]: styles.drilling,
      [SCHEDULE_TYPES.DESCENT]: styles.descent,
      [SCHEDULE_TYPES.REST]: styles.rest,
      [SCHEDULE_TYPES.EMPTY]: styles.empty
    }
    return classMap[type] || styles.empty
  }

  const isErrorDay = (day) => errorDays.includes(day)

  const getCountClass = (count, day) => {
    const s3Active = isS3Active(schedules.S3, day)

    if (count === 3) return styles.countError
    if (count === 1 && s3Active) return styles.countError
    if (count === 2) return styles.countOk
    if (count === 0 && !s3Active) return styles.countNeutral
    return styles.countWarning
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Cronograma Generado</h2>

      <div className={styles.gridWrapper}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={styles.headerCell}>Día</th>
              {Array.from({ length: visibleDays }, (_, i) => (
                <th
                  key={i}
                  className={`${styles.headerCell} ${isErrorDay(i) ? styles.errorHeader : ''}`}
                >
                  {i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(schedules).map(([supervisor, schedule]) => (
              <tr key={supervisor}>
                <td className={styles.supervisorCell}>{supervisor}</td>
                {schedule.slice(0, visibleDays).map((type, day) => (
                  <td
                    key={day}
                    className={`${styles.cell} ${getCellClass(type)} ${isErrorDay(day) ? styles.errorCell : ''}`}
                    title={`${supervisor} - Dia ${day}: ${SCHEDULE_LABELS[type]}`}
                  >
                    {type}
                  </td>
                ))}
              </tr>
            ))}
            <tr className={styles.countRow}>
              <td className={styles.supervisorCell}>#P</td>
              {drillingCounts.slice(0, visibleDays).map((count, day) => (
                <td
                  key={day}
                  className={`${styles.cell} ${styles.countCell} ${getCountClass(count, day)}`}
                >
                  {count}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ScheduleGrid