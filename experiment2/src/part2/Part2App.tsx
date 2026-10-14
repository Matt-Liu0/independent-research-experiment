import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { logEvent, setEventSink } from '../log/logEvent'
import { NORMING_CONSENT } from '../study/consentText'
import { Message } from '../study/Message'
import { completionUrl, fromProlific } from '../study/prolific'
import { NORMING_COMPLETION_CODE, PART2_COMPLETION_CODE, detectPart2Device, type Part2Entry } from './entry'
import { Comprehension, Intro, Items, Practice } from './Questionnaire'
import type { Part2StageProps } from './stageProps'
import type { Part2Store } from './store'
import { BackgroundSurvey, Recall } from './Surveys'
import { nextPart2Stage, type Part2Doc, type Part2Stage, type Part2TimestampField, type Variant } from './types'

type Boot = { state: 'loading' } | { state: 'ready' } | { state: 'blocked'; reason: 'missing_params' | 'taken' | 'pid_mismatch' | 'error' }

const STAGES: Record<Exclude<Part2Stage, 'device'>, ComponentType<Part2StageProps>> = {
  consent: NormingConsent,
  intro: Intro,
  practice: Practice,
  comprehension: Comprehension,
  items: Items,
  recall: Recall,
  background: BackgroundSurvey,
  done: Done,
}

interface Props {
  entry: Part2Entry
  store: Part2Store
  detect?: (variant: Variant) => ReturnType<typeof detectPart2Device>
}

/** Part 2 (Day 8, computer) and the norming survey: the same shell, different stages (types.ts). */
export function Part2App({ entry, store, detect = detectPart2Device }: Props) {
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
        logEvent(result.kind === 'resumed' ? 'resume' : 'stage', { name: 'entry', variant: entry.variant, mode: entry.mode, stage: result.doc.stage })
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
      const stage = nextPart2Stage(current.variant, current.stage)
      logEvent('stage', { from: current.stage, to: stage })
      update({ ...fields, stage }, stamp)
    },
    [update],
  )

  if (boot.state === 'loading') return <Message title="Loading…" />
  if (boot.state === 'blocked') {
    const text = {
      missing_params: 'This link is missing some information. Open the study again from Prolific, or from the invitation with your participant code.',
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

  const props: Part2StageProps = { doc, store, update, advance }
  const Stage = doc.stage === 'device' ? null : STAGES[doc.stage]
  return (
    <>
      {entry.mode !== 'study' && (
        <div className="demo-tag" aria-hidden="true">
          {entry.mode === 'demo' ? 'Demo · nothing saved' : 'Pilot'} · {entry.variant === 'part2' ? 'Part 2' : 'Norming survey'}
        </div>
      )}
      {Stage ? <Stage key={doc.stage} {...props} /> : <DeviceGate {...props} variant={entry.variant} detect={detect} skip={entry.skipDeviceCheck === true} />}
    </>
  )
}

function DeviceGate({
  doc,
  update,
  advance,
  variant,
  detect,
  skip,
}: Part2StageProps & { variant: Variant; detect: Props['detect'] & {}; skip: boolean }) {
  const [device] = useState(() => detect(variant))
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
      <p>
        Part 2 needs a computer with a keyboard, because you'll type answers. Open this link on a computer to continue
        {fromProlific(doc.recruitment) ? ' (it is also in your Prolific messages).' : '.'}
      </p>
    </Message>
  )
}

function NormingConsent({ doc, update, advance }: Part2StageProps) {
  const [declined, setDeclined] = useState(false)
  if (declined) {
    return (
      <Message title="Thank you">
        <p>
          {fromProlific(doc.recruitment)
            ? "You've chosen not to take part. Please return this study on Prolific. You won't be penalized."
            : "You've chosen not to take part. You can close this page."}
        </p>
      </Message>
    )
  }
  return (
    <main className="page page-wide">
      {NORMING_CONSENT.isDraft && <p className="notice notice-warn small">DRAFT consent text. Replace before launch.</p>}
      <h1>{NORMING_CONSENT.title}</h1>
      <p>{NORMING_CONSENT.intro}</p>
      <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>
        {NORMING_CONSENT.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="muted small">{NORMING_CONSENT.contact}</p>
      <div className="page-spacer" />
      <button
        type="button"
        className="btn btn-study"
        onClick={() => {
          logEvent('stage', { name: 'consent', agreed: true, version: NORMING_CONSENT.version })
          advance({ consentVersion: NORMING_CONSENT.version }, ['consentAt'])
        }}
      >
        {NORMING_CONSENT.agree}
      </button>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => {
          logEvent('stage', { name: 'consent', agreed: false, version: NORMING_CONSENT.version })
          update({ consentDeclined: true })
          setDeclined(true)
        }}
      >
        {NORMING_CONSENT.decline}
      </button>
    </main>
  )
}

function Done({ doc, store }: Part2StageProps) {
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    store.flush().then(() => setSaved(true), () => setSaved(true))
  }, [store])
  const code = doc.variant === 'part2' ? PART2_COMPLETION_CODE : NORMING_COMPLETION_CODE
  return (
    <main className="page page-wide">
      <h1>Thank you</h1>
      <p>
        {doc.variant === 'part2'
          ? 'That was the last of the questions. The rest of Part 2 is still being built.'
          : 'Your payment will arrive within 3 days.'}
      </p>
      {!saved && (
        <p className="muted" role="status">
          Saving your answers…
        </p>
      )}
      {saved && fromProlific(doc.recruitment) && (
        <a className="btn btn-study" href={completionUrl(code)}>
          Back to Prolific
        </a>
      )}
      {saved && !fromProlific(doc.recruitment) && <p>Your answers are saved. You can close this page.</p>}
    </main>
  )
}
