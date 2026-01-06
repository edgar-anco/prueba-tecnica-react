import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfigForm from './ConfigForm'

describe('ConfigForm', () => {
  it('should render all input fields', () => {
    render(<ConfigForm onCalculate={() => {}} isCalculating={false} />)

    expect(screen.getByLabelText(/días de trabajo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/días de descanso/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/días de inducción/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/total días de perforación/i)).toBeInTheDocument()
  })

  it('should have default values', () => {
    render(<ConfigForm onCalculate={() => {}} isCalculating={false} />)

    expect(screen.getByLabelText(/días de trabajo/i)).toHaveValue(14)
    expect(screen.getByLabelText(/días de descanso total/i)).toHaveValue(7)
  })

  it('should call onCalculate with form values when submitted', async () => {
    const onCalculate = vi.fn()
    const user = userEvent.setup()

    render(<ConfigForm onCalculate={onCalculate} isCalculating={false} />)

    await user.click(screen.getByRole('button', { name: /calcular/i }))

    expect(onCalculate).toHaveBeenCalledWith({
      workDays: 14,
      restDays: 7,
      inductionDays: 5,
      totalDrillingDays: 90
    })
  })

  it('should disable button when calculating', () => {
    render(<ConfigForm onCalculate={() => {}} isCalculating={true} />)

    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveTextContent(/calculando/i)
  })

  it('should update summary when values change', async () => {
    const user = userEvent.setup()
    render(<ConfigForm onCalculate={() => {}} isCalculating={false} />)

    const workDaysInput = screen.getByLabelText(/días de trabajo/i)
    await user.clear(workDaysInput)
    await user.type(workDaysInput, '21')

    expect(screen.getByText(/21x7/)).toBeInTheDocument()
  })
})
