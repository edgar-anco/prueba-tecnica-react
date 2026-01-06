import { useMemo } from 'react'
import { SCHEDULE_TYPES } from '../../constants/scheduleTypes'
import styles from './Statistics.module.css'

function Statistics({ scheduleData }) {
  const { schedules, totalDays, config } = scheduleData

  const stats = useMemo(() => {
    const supervisorStats = {}

    Object.entries(schedules).forEach(([name, schedule]) => {
      supervisorStats[name] = {
        drilling: schedule.filter(d => d === SCHEDULE_TYPES.DRILLING).length,
        induction: schedule.filter(d => d === SCHEDULE_TYPES.INDUCTION).length,
        rest: schedule.filter(d => d === SCHEDULE_TYPES.REST).length,
        travel: schedule.filter(d => d === SCHEDULE_TYPES.CLIMB || d === SCHEDULE_TYPES.DESCENT).length
      }
    })

    return supervisorStats
  }, [schedules])

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Estadísticas del Cronograma</h2>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Configuración</h3>
          <ul>
            <li>Régimen: {config.workDays}x{config.restDays}</li>
            <li>Días inducción: {config.inductionDays}</li>
            <li>Días perforación objetivo: {config.totalDrillingDays}</li>
            <li>Total días generados: {totalDays}</li>
          </ul>
        </div>

        {Object.entries(stats).map(([name, data]) => (
          <div key={name} className={styles.card}>
            <h3>{name}</h3>
            <ul>
              <li>Días perforando: {data.drilling}</li>
              <li>Días inducción: {data.induction}</li>
              <li>Días descanso: {data.rest}</li>
              <li>Días viaje: {data.travel}</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Statistics
