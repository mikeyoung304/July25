import { render, screen } from '@testing-library/react'
import { KioskVoiceCapture } from './KioskVoiceCapture'

describe('KioskVoiceCapture', () => {
  it('renders without crashing', () => {
    render(<KioskVoiceCapture />)
    expect(screen.getByText('KioskVoiceCapture Component')).toBeInTheDocument()
  })

  // Add more tests here
})
