import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Legend from './Legend'

describe('Legend', () => {
  it('should render all schedule types', () => {
    render(<Legend />)

    expect(screen.getByText('Subida')).toBeInTheDocument()
    expect(screen.getByText('Inducción')).toBeInTheDocument()
    expect(screen.getByText('Perforación')).toBeInTheDocument()
    expect(screen.getByText('Bajada')).toBeInTheDocument()
    expect(screen.getByText('Descanso')).toBeInTheDocument()
    expect(screen.getByText('Vacío')).toBeInTheDocument()
  })

  it('should display schedule type codes', () => {
    render(<Legend />)

    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('I')).toBeInTheDocument()
    expect(screen.getByText('P')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
  })
})