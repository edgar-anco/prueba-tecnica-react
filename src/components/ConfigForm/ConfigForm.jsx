import { useState } from 'react'
import styles from './ConfigForm.module.css'

function ConfigForm({ onCalculate, isCalculating }) {
  const [workDays, setWorkDays] = useState(14)
  const [restDays, setRestDays] = useState(7)
  const [inductionDays, setInductionDays] = useState(5)
  const [totalDrillingDays, setTotalDrillingDays] = useState(90)

  const handleSubmit = (e) => {
    e.preventDefault()
    onCalculate({
      workDays: parseInt(workDays),
      restDays: parseInt(restDays),
      inductionDays: parseInt(inductionDays),
      totalDrillingDays: parseInt(totalDrillingDays)
    })
  }

  const realRestDays = restDays - 2
  const drillingPerCycle = workDays - inductionDays - 1

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>Configuración del Régimen</h2>

      <div className={styles.inputGroup}>
        <div className={styles.inputWrapper}>
          <label htmlFor="workDays">Días de trabajo (N)</label>
          <input
            type="number"
            id="workDays"
            value={workDays}
            onChange={(e) => setWorkDays(e.target.value)}
            min="5"
            max="30"
            required
          />
          <span className={styles.hint}>Incluye subida + inducción + perforación</span>
        </div>

        <div className={styles.inputWrapper}>
          <label htmlFor="restDays">Días de descanso total (M)</label>
          <input
            type="number"
            id="restDays"
            value={restDays}
            onChange={(e) => setRestDays(e.target.value)}
            min="3"
            max="15"
            required
          />
          <span className={styles.hint}>Descanso real: {realRestDays} dias (M - 2)</span>
        </div>

        <div className={styles.inputWrapper}>
          <label htmlFor="inductionDays">Días de inducción</label>
          <input
            type="number"
            id="inductionDays"
            value={inductionDays}
            onChange={(e) => setInductionDays(e.target.value)}
            min="1"
            max="5"
            required
          />
          <span className={styles.hint}>Solo aplica en el primer ciclo</span>
        </div>

        <div className={styles.inputWrapper}>
          <label htmlFor="totalDrillingDays">Total días de perforación</label>
          <input
            type="number"
            id="totalDrillingDays"
            value={totalDrillingDays}
            onChange={(e) => setTotalDrillingDays(e.target.value)}
            min="10"
            max="365"
            required
          />
          <span className={styles.hint}>Perforación por ciclo: ~{drillingPerCycle} días</span>
        </div>
      </div>

      <div className={styles.summary}>
        <h3>Resumen del Régimen {workDays}x{restDays}</h3>
        <ul>
          <li>Ciclo total: {workDays + restDays} días</li>
          <li>Perforación primer ciclo: {drillingPerCycle} días</li>
          <li>Perforación ciclos siguientes: {workDays - 1} días</li>
          <li>Descanso efectivo: {realRestDays} días</li>
        </ul>
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isCalculating}
      >
        {isCalculating ? 'Calculando...' : 'Calcular Cronograma'}
      </button>
    </form>
  )
}

export default ConfigForm
