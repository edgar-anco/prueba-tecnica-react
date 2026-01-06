import { ConfigForm, ScheduleGrid, AlertPanel, Legend, Statistics } from './components'
import { useScheduler } from './hooks/useScheduler'
import styles from './App.module.css'

function App() {
  const {
    scheduleData,
    validation,
    errorDays,
    isCalculating,
    calculate
  } = useScheduler()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Cronograma de Supervisores</h1>
        <p>Sistema de planificación de turnos para supervisores de perforación</p>
      </header>

      <main className={styles.main}>
        <ConfigForm onCalculate={calculate} isCalculating={isCalculating} />

        <Legend />

        {validation && (
          <AlertPanel validation={validation} />
        )}

        {scheduleData && (
          <>
            <Statistics scheduleData={scheduleData} />
            <ScheduleGrid
              scheduleData={scheduleData}
              errorDays={errorDays}
            />
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Sistema de Planificación de Turnos - Supervisores de Perforación</p>
      </footer>
    </div>
  )
}

export default App
