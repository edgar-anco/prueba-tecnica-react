import styles from './AlertPanel.module.css'

function AlertPanel({ validation }) {
  const { errors, warnings, isValid } = validation

  if (isValid && warnings.length === 0) {
    return (
      <div className={`${styles.panel} ${styles.success}`}>
        <h3>Estado del Cronograma</h3>
        <p>El cronograma cumple con todas las reglas establecidas.</p>
        <ul className={styles.ruleList}>
          <li>Siempre hay exactamente 2 supervisores perforando</li>
          <li>No hay patrones inválidos (S-S, S-B)</li>
          <li>S3 entra en el momento correcto</li>
        </ul>
      </div>
    )
  }

  return (
    <div className={`${styles.panel} ${errors.length > 0 ? styles.error : styles.warning}`}>
      <h3>
        {errors.length > 0 ? 'Errores Detectados' : 'Advertencias'}
      </h3>

      {errors.length > 0 && (
        <div className={styles.section}>
          <h4>Errores ({errors.length})</h4>
          <ul className={styles.errorList}>
            {errors.slice(0, 10).map((error, index) => (
              <li key={index}>
                <span className={styles.errorType}>{getErrorLabel(error.type)}</span>
                <span className={styles.errorMessage}>{error.message}</span>
              </li>
            ))}
            {errors.length > 10 && (
              <li className={styles.moreErrors}>
                ... y {errors.length - 10} errores más
              </li>
            )}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className={styles.section}>
          <h4>Advertencias ({warnings.length})</h4>
          <ul className={styles.warningList}>
            {warnings.slice(0, 5).map((warning, index) => (
              <li key={index}>{warning.message}</li>
            ))}
            {warnings.length > 5 && (
              <li className={styles.moreErrors}>
                ... y {warnings.length - 5} advertencias más
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function getErrorLabel(type) {
  const labels = {
    THREE_DRILLING: '3 Perforando',
    ONE_DRILLING: '1 Perforando',
    CONSECUTIVE_CLIMB: 'Subida Consecutiva',
    CLIMB_THEN_DESCENT: 'Subida-Bajada'
  }
  return labels[type] || type
}

export default AlertPanel
