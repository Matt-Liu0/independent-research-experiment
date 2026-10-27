import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { logEvent, setEventSink } from '../log/logEvent'
import { Message } from '../study/Message'
import { detectPart2Device, type Part2Entry } from './entry'
import { Briefing, Chat } from './Interview'
import type { Interviewer } from './interviewer'
import { Comprehension, Intro, Items, Practice } from './Questionnaire'
import type { Part2StageProps } from './stageProps'
import type { Part2Store } from './store'
import { BackgroundSurvey, Recall } from './Surveys'
import { Debrief, Filler } from './Wrapup'
import { nextPart2Stage, type Part2Doc, type Part2Stage, type Part2TimestampField } from './types'

type Boot = { state: 'loading' } | { state: 'ready' } | { state: 'blocked'; reason: 'missing_params' | 'taken' | 'pid_mismatch' | 'error' }

const STAGES: Record<Exclude<Part2Stage, 'device'>, ComponentType<Part2StageProps>> = {
  briefing: Briefing,
  chat: Chat,
  filler: Filler,
  intro: Intro,
  practice: Practice,
  comprehension: Comprehension,
  items: Items,
  recall: Recall,
  background: BackgroundSurvey,
  debrief: Debrief,
  done: Done,
}

interface Props {
  entry: Part2Entry
  store: Part2Store
  interviewer: Interviewer
  detect?: () => ReturnType<typeof detectPart2Device>
}

/** Part 2 (Day 8, computer): the stages in types.ts, one after another. */
export function Part2App({ entry, store, interviewer, detect = detectPart2Device }: Props) {
  const [boot, setBoot] = useState<Boot>(entry.params ? { state: 'loading' } : { state: 'blocked', reason: 'missing_params' })
  const [doc, setDoc] = useState<Part2Doc | null>(null)
  const docRef = useRef<Part2Doc | null>(null)
  const started = useRef(false)

  useEffect(() => {
    setEventSink(store.sink)
    if (!entry.params || started.current) return
    started.current = true
    store
      .start(entry.params)
      .then((result) => {
        if (result.kind === 'taken' || result.kind === 'pid_mismatch') {
          setBoot({ state: 'blocked', reason: result.kind })
          return
        }
        logEvent(result.kind === 'resumed' ? 'resume' : 'stage', { name: 'entry', mode: entry.mode, stage: result.doc.stage })
        docRef.current = result.doc
        setDoc(result.doc)
        setBoot({ state: 'ready' })
      })
      .catch((err) => {
        console.error(err)
        setBoot({ state: 'blocked', reason: 'error' })
      })
  }, [entry, store])

  const update = useCallback(
    (fields: Partial<Part2Doc>, stamp: Part2TimestampField[] = []) => {
      store.update(fields, stamp)
      if (docRef.current) docRef.current = { ...docRef.current, ...fields }
      setDoc((d) => (d ? { ...d, ...fields } : d))
    },
    [store],
  )

  const advance = useCallback(
    (fields: Partial<Part2Doc> = {}, stamp: Part2TimestampField[] = []) => {
      const current = docRef.current
      if (!current) return
      const stage = nextPart2Stage(current.stage)
      logEvent('stage', { from: current.stage, to: stage })
      update({ ...fields, stage }, stamp)
    },
    [update],
  )

  if (boot.state === 'loading') return <Message title="Loading…" />
  if (boot.state === 'blocked') {
    const text = {
      missing_params: 'This link is missing your participant code. Open Part 2 again from the link in your invitation.',
      taken: "You've already started this part in another browser. Please go back to that one to continue.",
      pid_mismatch: 'Someone has already taken part on this browser. Please contact the researchers.',
      error: "We couldn't connect. Check your connection, then reload the page.",
    }[boot.reason]
    return (
      <Message title={boot.reason === 'missing_params' ? 'Please use the link you were given' : "Something's not right"}>
        <p>{text}</p>
      </Message>
    )
  }
  if (!doc) return null

  const props: Part2StageProps = { doc, store, interviewer, update, advance }
  const Stage = doc.stage === 'device' ? null : STAGES[doc.stage]
  return (
    <>
      {entry.mode !== 'study' && (
        <div className="demo-tag" aria-hidden="true">
          {entry.mode === 'demo' ? 'Demo · nothing saved' : 'Pilot'} · Part 2
        </div>
      )}
      {Stage ? <Stage key={doc.stage} {...props} /> : <DeviceGate {...props} detect={detect} skip={entry.skipDeviceCheck === true} />}
    </>
  )
}

function DeviceGate({
  update,
  advance,
  detect,
  skip,
}: Part2StageProps & { detect: Props['detect'] & {}; skip: boolean }) {
  const [device] = useState(() => detect())
  const passed = device.passedCheck || skip
  useEffect(() => {
    logEvent('stage', { name: 'device_check', passed, os: device.os, skipped: skip && !device.passedCheck })
    if (passed) advance({ device: { ...device, ...(skip && !device.passedCheck ? { checkSkipped: true } : {}) } })
    else update({ device })
    // Runs once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (passed) return null
  return (
    <Message title="Please use a computer">
      <p>Part 2 needs a computer with a keyboard, because you'll type answers. Open this link on a computer to continue.</p>
    </Message>
  )
}

function Done({ store }: Part2StageProps) {
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    store.flush().then(() => setSaved(true), () => setSaved(true))
  }, [store])
  return (
    <main className="page page-wide">
      <h1>Thank you</h1>
      <p>That's the end of Part 2. Thank you for taking part in both parts of the study.</p>
      {!saved && (
        <p className="muted" role="status">
          Saving your answers…
        </p>
      )}
      {saved && <p>Your answers are saved. You can close this page.</p>}
    </main>
  )
}
