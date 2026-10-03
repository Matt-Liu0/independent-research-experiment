import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app name and build version', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'bramble' })).toBeInTheDocument()
    expect(screen.getByText(`Version ${__APP_VERSION__}`)).toBeInTheDocument()
  })
})
