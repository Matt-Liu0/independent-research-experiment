import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseEntry } from './prolific'
import { MemoryStore } from './store'
import { StudyApp } from './StudyApp'
import { newParticipant, type DeviceInfo } from './types'

const PARAMS = '?PROLIFIC_PID=pid123&STUDY_ID=study1&SESSION_ID=sess1'
const phone = (): DeviceInfo => ({
  os: 'ios',
  screenW: 390,
  screenH: 844,
  userAgent: 'iPhone',
  touch: true,
  passedCheck: true,
})
const computer = (): DeviceInfo => ({ ...phone(), os: 'other', touch: false, passedCheck: false })

describe('StudyApp', () => {
  beforeEach(() => localStorage.clear())

  it('asks people without Prolific parameters to start from Prolific, and saves nothing', () => {
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry('')} store={store} detect={phone} />)
    expect(screen.getByRole('heading', { name: /open this study from prolific/i })).toBeInTheDocument()
    expect(store.participant).toBeNull()
  })

  it('stops computers at the device check and records the device', async () => {
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} detect={computer} />)
    expect(await screen.findByRole('heading', { name: /open this on your phone/i })).toBeInTheDocument()
    expect(store.participant?.stage).toBe('device')
    expect(store.participant?.device?.passedCheck).toBe(false)
  })

  it('assigns friction only after consent, then shows the welcome page', async () => {
    const user = userEvent.setup()
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} detect={phone} />)

    await screen.findByRole('button', { name: /i agree/i })
    expect(store.participant?.stage).toBe('consent')
    expect(store.participant?.friction).toBeNull()

    await user.click(screen.getByRole('button', { name: /i agree/i }))
    expect(await screen.findByRole('heading', { name: /welcome to bramble/i })).toBeInTheDocument()
    expect(store.participant?.friction).toMatch(/nudged|neutral/)
    expect(store.participant?.taskOrder).toHaveLength(6)
    expect(store.participant?.consentVersion).toBeTruthy()
    expect(store.participant?.consentAt).toBeTypeOf('number')
    expect(store.events.some((e) => e.type === 'stage' && e.to === 'welcome')).toBe(true)
  })

  it('records a refusal to consent without assigning a level', async () => {
    const user = userEvent.setup()
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} detect={phone} />)
    await user.click(await screen.findByRole('button', { name: /do not agree/i }))
    expect(screen.getByText(/return this study on prolific/i)).toBeInTheDocument()
    expect(store.participant?.consentDeclined).toBe(true)
    expect(store.participant?.friction).toBeNull()
  })

  it('keeps the name on the phone and out of the participant record', async () => {
    const user = userEvent.setup()
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} detect={phone} />)
    await user.click(await screen.findByRole('button', { name: /i agree/i }))
    await user.type(await screen.findByLabelText(/what should bramble call you/i), 'Riley')
    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(localStorage.getItem('bramble.name')).toBe('Riley')
    expect(JSON.stringify(store.participant)).not.toContain('Riley')
    expect(JSON.stringify(store.events)).not.toContain('Riley')
    expect(store.participant?.stage).toBe('tasks')
  })

  it('resumes at the saved stage and counts the resume', async () => {
    const existing = { ...newParticipant({ prolificPid: 'pid123', studyId: 'study1', sessionId: 'sess1' }), stage: 'sus' as const }
    const store = new MemoryStore({ existing })
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} detect={phone} />)
    expect(await screen.findByRole('heading', { name: /usability survey|how much do you agree/i })).toBeInTheDocument()
    expect(store.participant?.resumeCount).toBe(1)
    expect(store.events.find((e) => e.type === 'resume')).toMatchObject({ stage: 'sus' })
  })

  it('refuses a second Prolific ID on a browser that already has a record', async () => {
    const existing = newParticipant({ prolificPid: 'someone_else', studyId: 's', sessionId: 'x' })
    render(<StudyApp entry={parseEntry(PARAMS)} store={new MemoryStore({ existing })} detect={phone} />)
    expect(await screen.findByRole('heading', { name: /already been used/i })).toBeInTheDocument()
  })

  it('lets demo links through on any device with the chosen level', async () => {
    const user = userEvent.setup()
    const entry = parseEntry('?demo=neutral')
    const store = new MemoryStore({ friction: entry.demoFriction ?? undefined })
    render(<StudyApp entry={entry} store={store} detect={computer} />)
    await user.click(await screen.findByRole('button', { name: /i agree/i }))
    await screen.findByRole('heading', { name: /welcome/i })
    expect(store.participant?.friction).toBe('neutral')
  })
})
