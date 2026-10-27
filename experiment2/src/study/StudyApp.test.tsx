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
  automated: false,
})
const computer = (): DeviceInfo => ({ ...phone(), os: 'other', touch: false, passedCheck: false })

describe('StudyApp', () => {
  beforeEach(() => localStorage.clear())

  it('asks people without Prolific parameters to start from Prolific, and saves nothing', () => {
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry('')} store={store} detect={phone} />)
    expect(screen.getByRole('heading', { name: /use the link you were given/i })).toBeInTheDocument()
    expect(store.participant).toBeNull()
  })

  it('runs a participant-code entry like a Prolific one, and records the recruitment', async () => {
    const user = userEvent.setup()
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry('?code=S0123')} store={store} detect={phone} />)
    await user.click(await screen.findByRole('button', { name: /i agree/i }))
    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    expect(store.participant).toMatchObject({ prolificPid: 'S0123', recruitment: 'code' })
  })

  it('lets local testing skip the phone check with &anydevice=1, and records the skip', async () => {
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry(`${PARAMS}&anydevice=1`, true)} store={store} detect={computer} />)
    expect(await screen.findByRole('button', { name: /i agree/i })).toBeInTheDocument()
    expect(store.participant?.device).toMatchObject({ passedCheck: false, checkSkipped: true })
  })

  it('ignores &anydevice=1 on the deployed study', async () => {
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry(`${PARAMS}&anydevice=1`, false)} store={store} detect={computer} />)
    expect(await screen.findByRole('heading', { name: /open this on your phone/i }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('stops computers at the device check and records the device', async () => {
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} detect={computer} />)
    expect(await screen.findByRole('heading', { name: /open this on your phone/i }, { timeout: 5000 })).toBeInTheDocument()
    expect(store.participant?.stage).toBe('device')
    expect(store.participant?.device?.passedCheck).toBe(false)
  })

  it('assigns the nudged-screen pattern only after consent, then shows the welcome page', async () => {
    const user = userEvent.setup()
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} detect={phone} />)

    await screen.findByRole('button', { name: /i agree/i })
    expect(store.participant?.stage).toBe('consent')
    expect(store.participant?.pattern).toBeNull()

    await user.click(screen.getByRole('button', { name: /i agree/i }))
    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    expect(store.participant?.pattern).toMatch(/^(U[1-6]){3}$/)
    expect(['bramble_first', 'stride_first']).toContain(store.participant?.appOrder)
    expect(store.participant?.taskOrder).toHaveLength(9)
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
    expect(store.participant?.pattern).toBeNull()
  })

  it('keeps the name on the phone and out of the participant record', async () => {
    const user = userEvent.setup()
    const store = new MemoryStore()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} detect={phone} />)
    await user.click(await screen.findByRole('button', { name: /i agree/i }))
    await user.type(await screen.findByLabelText(/what should the apps call you/i), 'Riley')
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
    expect(await screen.findByRole('heading', { name: /what did you think of bramble/i })).toBeInTheDocument()
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
    const store = new MemoryStore({ pattern: entry.demoPattern ?? undefined })
    render(<StudyApp entry={entry} store={store} detect={computer} />)
    await user.click(await screen.findByRole('button', { name: /i agree/i }))
    await screen.findByRole('heading', { name: /welcome/i })
    expect(store.participant?.pattern).toBe('')
  })
})
