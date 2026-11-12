import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { logEvent, setEventSink } from '../log/logEvent'
import { Message } from '../study/Message'
import { detectPart2Device, type Part2Entry } from './entry'
import { Briefing, Chat } from './Interview'
import type { Interviewer } from './interviewer'
import { Comprehension, Intro, Items, Practice, TOTAL_ITEMS } from './Questionnaire'
import { Instructions } from './Setup'
import type { Part2StageProps } from './stageProps'
import type { Part2Store } from './store'
import { BackgroundSurvey, Recall } from './Surveys'
import { Debrief } from './Wrapup'
import { nextPart2Stage, type Part2Doc, type Part2Stage, type Part2TimestampField } from './types'

type Boot =
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'blocked'; reason: 'missing_params' | 'taken' | 'pid_mismatch' | 'part2_not_done' | 'error' }

const STAGES: Record<Exclude<Part2Stage, 'device'>, ComponentType<Part2StageProps>> = {
  briefing: Briefing,
  instructions: Instructions,
  chat: Chat,
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

/** Part 2 (computer) or Part 3 (2-3 days later, any device): the stages in types.ts, one after another. */
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
        if (result.kind === 'taken' || result.kind === 'pid_mismatch' || result.kind === 'part2_not_done') {
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
      const stage = nextPart2Stage(current.stage, entry.part)
      logEvent('stage', { from: current.stage, to: stage })
      update({ ...fields, stage }, stamp)
    },
    [update, entry.part],
  )

  if (boot.state === 'loading') return <Message title="Loading…" />
  if (boot.state === 'blocked') {
    const text = {
      missing_params: `This link is missing your participant code. Open Part ${entry.part} again from the link in your invitation.`,
      taken: "You've already started this part in another browser. Please go back to that one to continue.",
      pid_mismatch: 'Someone has already taken part on this browser. Please contact the researchers.',
      part2_not_done: "Part 3 opens once you've finished Part 2. Please finish Part 2 first, using the link in your earlier email.",
      error: "We couldn't connect. Check your connection, then reload the page.",
    }[boot.reason]
    const titles: Partial<Record<typeof boot.reason, string>> = { missing_params: 'Please use the link you were given', part2_not_done: 'Please finish Part 2 first' }
    const title = titles[boot.reason]
    return (
      <Message title={title ?? "Something's not right"}>
        <p>{text}</p>
      </Message>
    )
  }
  if (!doc) return null

  const props: Part2StageProps = { doc, store, interviewer, update, advance, part: entry.part }
  const Stage = doc.stage === 'device' ? null : STAGES[doc.stage]
  const progress = entry.part === 3 ? part3Progress(doc) : null
  return (
    <>
      {entry.mode !== 'study' && (
        <div className="demo-tag demo-tag-top" aria-hidden="true">
          {entry.mode === 'demo' ? 'Demo · nothing saved' : 'Pilot'} · Part {entry.part}
        </div>
      )}
      {progress !== null && (
        <div className="part-progress" role="progressbar" aria-label="Progress through Part 3" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      {Stage ? (
        <Stage key={doc.stage} {...props} />
      ) : (
        <DeviceGate {...props} detect={detect} skip={entry.skipDeviceCheck === true} anyDevice={entry.part === 3} />
      )}
    </>
  )
}

/** Part 3's pages before and after the situations, which count one step each. */
const BEFORE_ITEMS: Part2Stage[] = ['intro', 'practice', 'comprehension']
const AFTER_ITEMS: Part2Stage[] = ['recall', 'background', 'debrief']

/**
 * Percent of Part 3 done, counting every situation as one step, so the bar moves on each page.
 * Null where no bar shows (the device check and the end page).
 */
export function part3Progress(doc: Part2Doc): number | null {
  const total = BEFORE_ITEMS.length + TOTAL_ITEMS + AFTER_ITEMS.length
  let done: number
  if (BEFORE_ITEMS.includes(doc.stage)) done = BEFORE_ITEMS.indexOf(doc.stage)
  else if (doc.stage === 'items') done = BEFORE_ITEMS.length + Object.keys(doc.answers).length
  else if (AFTER_ITEMS.includes(doc.stage)) done = BEFORE_ITEMS.length + TOTAL_ITEMS + AFTER_ITEMS.indexOf(doc.stage)
  else return null
  return Math.round((done / total) * 100)
}

function DeviceGate({
  update,
  advance,
  detect,
  skip,
  anyDevice,
}: Part2StageProps & { detect: Props['detect'] & {}; skip: boolean; anyDevice: boolean }) {
  const [device] = useState(() => detect())
  // Part 3 works on a phone or a computer; the device is still recorded.
  const passed = device.passedCheck || skip || anyDevice
  const checked = useRef(false)
  useEffect(() => {
    // Once, even where effects run twice (React's development mode), so it never advances two stages.
    if (checked.current) return
    checked.current = true
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

function Done({ store, part }: Part2StageProps) {
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    store.flush().then(() => setSaved(true), () => setSaved(true))
  }, [store])
  return (
    <main className="page page-wide">
      <h1>Thank you</h1>
      {part === 2 ? (
        <p>That's the end of Part 2. In 2 to 3 days we'll email you the link to Part 3, the last part of the study.</p>
      ) : (
        <p>That's the end of the study. Thank you for taking part in all three parts.</p>
      )}
      {!saved && (
        <p className="muted" role="status">
          Saving your answers…
        </p>
      )}
      {saved && <p>Your answers are saved. You can close this page.</p>}
    </main>
  )
}
