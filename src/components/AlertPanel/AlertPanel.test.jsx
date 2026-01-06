import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AlertPanel from './AlertPanel'

describe('AlertPanel', () => {
  it('should show success message when valid', () => {
    const validation = {
      errors: [],
      warnings: [],
      isValid: true
    }

    render(<AlertPanel validation={validation} />)

    expect(screen.getByText(/cumple con todas las reglas/i)).toBeInTheDocument()
  })

  it('should show errors when present', () => {
    const validation = {
      errors: [
        { type: 'THREE_DRILLING', day: 5, message: 'Dia 5: 3 supervisores perforando' }
      ],
      warnings: [],
      isValid: false
    }

    render(<AlertPanel validation={validation} />)

    expect(screen.getByText(/errores detectados/i)).toBeInTheDocument()
    expect(screen.getByText(/3 supervisores perforando/i)).toBeInTheDocument()
  })

  it('should limit displayed errors to 10', () => {
    const errors = Array.from({ length: 15 }, (_, i) => ({
      type: 'THREE_DRILLING',
      day: i,
      message: `Dia ${i}: Error`
    }))

    const validation = {
      errors,
      warnings: [],
      isValid: false
    }

    render(<AlertPanel validation={validation} />)

    expect(screen.getByText(/y 5 errores más/i)).toBeInTheDocument()
  })
})
