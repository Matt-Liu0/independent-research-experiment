import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { initialAppState } from '../bramble/appState'
import { initialStrideState } from '../stride/state'
import type { StageProps } from '../study/stageProps'
import { MemoryStore } from '../study/store'
import { newParticipant, type DeviceOs } from '../study/types'
import { Closing } from './Closing'
import { SettingsCheck } from './SettingsCheck'
import { SUS_ITEMS, Sus } from './Sus'
import { Suspicion } from './Suspicion'

function props(os: DeviceOs = 'ios') {
  const participant = {
    ...newParticipant({ participantCode: 'p' }),
    device: { os, screenW: 390, screenH: 844, userAgent: '', touch: true, passedCheck: true, automated: false },
  }
  const advance = vi.fn<StageProps['advance']>()
  const base: StageProps = { participant, mode: 'study', store: new MemoryStore(), update: vi.fn(), advance }
  return { ...base, advance }
}

describe('SUS', () => {
  it('has the ten standard items and needs every answer', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<Sus {...p} />)
    expect(SUS_ITEMS).toHaveLength(10)
    const groups = screen.getAllByRole('radiogroup')
    expect(groups).toHaveLength(10)
    for (const [i, group] of groups.entries()) {
      if (i < 9) await user.click(within(group).getByRole('radio', { name: '4' }))
    }
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.click(within(groups[9]).getByRole('radio', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(p.update).toHaveBeenCalledWith({ sus: { bramble: [4, 4, 4, 4, 4, 4, 4, 4, 4, 2] } })
    expect(p.advance).not.toHaveBeenCalled()
  })

  it('asks about each app in the order they were used, then moves on', async () => {
    const user = userEvent.setup()
    const p = props()
    p.participant = { ...p.participant, appOrder: 'stride_first' }
    const view = render(<Sus {...p} />)
    expect(screen.getByRole('heading', { name: 'What did you think of Stride?' })).toBeInTheDocument()

    // Once Stride is answered, the Bramble questions follow (the record now holds Stride's).
    p.participant = { ...p.participant, sus: { stride: Array(10).fill(3) } }
    view.rerender(<Sus {...p} />)
    expect(screen.getByRole('heading', { name: 'What did you think of Bramble?' })).toBeInTheDocument()
    for (const group of screen.getAllByRole('radiogroup')) await user.click(within(group).getByRole('radio', { name: '5' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(p.advance).toHaveBeenCalledWith({ sus: { stride: Array(10).fill(3), bramble: Array(10).fill(5) } })
  })
})

describe('Suspicion question', () => {
  it('needs a non-blank answer and saves it trimmed', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<Suspicion {...p} />)
    const box = screen.getByRole('textbox', { name: /what do you think this study is about/i })
    await user.type(box, '   ')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.type(box, 'Testing a grocery app. ')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(p.advance).toHaveBeenCalledWith({ suspicion: 'Testing a grocery app.' })
  })
})

describe('Settings check', () => {
  it('shows only the iPhone paths on an iPhone', () => {
    render(<SettingsCheck {...props('ios')} />)
    expect(screen.getByText('iPhone: Settings → Privacy & Security → Location Services → the app.')).toBeInTheDocument()
    expect(screen.queryByText(/App location permissions/)).not.toBeInTheDocument()
  })

  it('shows only the Android paths on Android', () => {
    render(<SettingsCheck {...props('android')} />)
    expect(screen.getByText(/App location permissions/)).toBeInTheDocument()
    expect(screen.queryByText(/Apple Advertising/)).not.toBeInTheDocument()
  })

  it('makes "None of these" exclusive and needs all seven answers', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<SettingsCheck {...p} />)
    const q1 = screen.getByRole('group', { name: /at least once a month/i })
    await user.click(within(q1).getByRole('checkbox', { name: 'Maps' }))
    await user.click(within(q1).getByRole('checkbox', { name: 'Weather' }))
    await user.click(within(q1).getByRole('checkbox', { name: 'None of these' }))
    expect(within(q1).getByRole('checkbox', { name: 'Maps' })).toHaveAttribute('aria-checked', 'false')
    await user.click(within(q1).getByRole('checkbox', { name: 'Maps' }))
    expect(within(q1).getByRole('checkbox', { name: 'None of these' })).toHaveAttribute('aria-checked', 'false')

    const radios = screen.getAllByRole('radiogroup')
    expect(radios).toHaveLength(6)
    for (const group of radios) await user.click(within(group).getAllByRole('radio')[0])
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(p.advance).toHaveBeenCalledWith(
      { settingsCheck: { q1: ['maps'], q2: 'never', q3: 'on', q4: 'yes', q5: 'on', q6: 'yes', q7: 'yes' } },
      ['completedAt'],
    )
  })
})

describe('Closing', () => {
  it('shows the bonus, and says the participant is done only once the answers are saved', async () => {
    let release = () => {}
    const store = new MemoryStore()
    store.flush = () => new Promise<void>((resolve) => (release = resolve))
    const p = { ...props(), store }
    p.participant = {
      ...p.participant,
      appState: { ...initialAppState(), points: 270 },
      strideState: { ...initialStrideState(), points: 220 },
    }
    render(<Closing {...p} />)
    // Both balances: 270 points ($2.70) plus 220 coins ($2.20).
    expect(screen.getByText(/270 Bramble points and 220 Stride coins, so your bonus is \$4\.90/)).toBeInTheDocument()
    expect(screen.getByText(/paid as described in your invitation/)).toBeInTheDocument()
    expect(screen.getByText('Saving your answers…')).toBeInTheDocument()
    expect(screen.queryByText(/all done for today/)).not.toBeInTheDocument()
    release()
    expect(await screen.findByText("You're all done for today. You can close this page.")).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('says nothing was saved in demo mode', () => {
    render(<Closing {...props()} mode="demo" />)
    expect(screen.getByText('Demo: nothing was saved.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
