import { SCHEDULE_TYPES, SCHEDULE_LABELS } from '../../constants/scheduleTypes'
import styles from './Legend.module.css'

function Legend() {
  const legendItems = [
    { type: SCHEDULE_TYPES.CLIMB, label: SCHEDULE_LABELS.S, className: styles.climb },
    { type: SCHEDULE_TYPES.INDUCTION, label: SCHEDULE_LABELS.I, className: styles.induction },
    { type: SCHEDULE_TYPES.DRILLING, label: SCHEDULE_LABELS.P, className: styles.drilling },
    { type: SCHEDULE_TYPES.DESCENT, label: SCHEDULE_LABELS.B, className: styles.descent },
    { type: SCHEDULE_TYPES.REST, label: SCHEDULE_LABELS.D, className: styles.rest },
    { type: SCHEDULE_TYPES.EMPTY, label: SCHEDULE_LABELS['-'], className: styles.empty }
  ]

  return (
    <div className={styles.legend}>
      <h3 className={styles.title}>Leyenda</h3>
      <div className={styles.items}>
        {legendItems.map(({ type, label, className }) => (
          <div key={type} className={styles.item}>
            <span className={`${styles.color} ${className}`}>{type}</span>
            <span className={styles.label}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Legend
