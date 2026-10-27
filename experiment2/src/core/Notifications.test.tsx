import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Notifications, type Notice } from './Notifications'
import { Sheet } from './Sheet'
import { setTimingScale } from './timing'

const packed: Notice = { id: 'packed', from: 'Bramble', text: 'Your order is packed.' }
const sam: Notice = { id: 'sam', from: 'Sam', person: true, text: 'Thanks!', after: 'noticeReply' }

describe('Notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setTimingScale(1)
  })
  afterEach(() => {
    vi.useRealTimers()
    setTimingScale(0)
  })

  it('shows a notice when it becomes due, once, and hides it after a few seconds', () => {
    const { rerender } = render(<Notifications due={[]} accent="#000" />)
    rerender(<Notifications due={[packed]} accent="#000" />)
    expect(screen.getByText('Your order is packed.')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4500))
    expect(screen.queryByText('Your order is packed.')).not.toBeInTheDocument()
    rerender(<Notifications due={[packed]} accent="#000" />)
    expect(screen.queryByText('Your order is packed.')).not.toBeInTheDocument()
  })

  it("doesn't replay notices already due when the app opens (e.g. after a reload)", () => {
    render(<Notifications due={[packed]} accent="#000" />)
    expect(screen.queryByText('Your order is packed.')).not.toBeInTheDocument()
  })

  it('keeps quiet notices off screen, and waits the reply delay for messages', () => {
    const { rerender } = render(<Notifications due={[]} accent="#000" />)
    rerender(<Notifications due={[{ ...packed, quiet: true }, sam]} accent="#000" />)
    expect(screen.queryByText('Your order is packed.')).not.toBeInTheDocument()
    expect(screen.queryByText('Thanks!')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2600))
    expect(screen.getByText('Thanks!')).toBeInTheDocument()
  })

  it('never shows while a prompt sheet is open', () => {
    const page = (sheet: boolean, due: Notice[]) => (
      <>
        {sheet && (
          <Sheet icon={null} title="Allow?" description="">
            <button>Allow</button>
          </Sheet>
        )}
        <Notifications due={due} accent="#000" />
      </>
    )
    const { rerender } = render(page(true, []))
    rerender(page(true, [packed]))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByText('Your order is packed.')).not.toBeInTheDocument()
    // The prompt is answered: the notice shows.
    rerender(page(false, [packed]))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByText('Your order is packed.')).toBeInTheDocument()
  })
})
