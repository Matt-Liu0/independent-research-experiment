import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { logEvent, setEventSink } from '../log/logEvent'
import { Closing } from '../surveys/Closing'
import { SettingsCheck } from '../surveys/SettingsCheck'
import { Sus } from '../surveys/Sus'
import { Suspicion } from '../surveys/Suspicion'
import { Consent } from './Consent'
import { detectDevice } from './device'
import { DeviceCheck } from './DeviceCheck'
import { Message } from './Message'
import type { Entry } from './entry'
import type { StageProps } from './stageProps'
import type { StudyStore } from './store'
import { TaskStage } from './TaskStage'
import { nextStage, type DeviceInfo, type ParticipantDoc, type Stage, type TimestampField } from './types'
import { Welcome } from './Welcome'

type Boot =
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'blocked'; reason: 'missing_params' | 'invalid_agent' | 'taken' | 'pid_mismatch' | 'error' }

interface Props {
  entry: Entry
  store: StudyStore
  detect?: () => DeviceInfo
}

const STAGE_COMPONENTS: Record<Exclude<Stage, 'device'>, ComponentType<StageProps>> = {
  consent: Consent,
  welcome: Welcome,
  tasks: TaskStage,
  sus: Sus,
  suspicion: Suspicion,
  settings: SettingsCheck,
  done: Closing,
}

export function StudyApp({ entry, store, detect = detectDevice }: Props) {
  const [boot, setBoot] = useState<Boot>(
    entry.params
      ? { state: 'loading' }
      : { state: 'blocked', reason: entry.mode === 'agent' ? 'invalid_agent' : 'missing_params' },
  )
  const [participant, setParticipant] = useState<ParticipantDoc | null>(null)
  // Mirrors `participant` so `advance` can read the latest stage without re-creating callbacks.
  const participantRef = useRef<ParticipantDoc | null>(null)
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
        if (result.kind === 'resumed') logEvent('resume', { stage: result.participant.stage })
        else logEvent('stage', { name: 'entry', mode: entry.mode })
        participantRef.current = result.participant
        setParticipant(result.participant)
        setBoot({ state: 'ready' })
      })
      .catch((err) => {
        console.error(err)
        setBoot({ state: 'blocked', reason: 'error' })
      })
  }, [entry, store])

  const update = useCallback(
    (fields: Partial<ParticipantDoc>, stamp: TimestampField[] = []) => {
      store.update(fields, stamp)
      if (participantRef.current) participantRef.current = { ...participantRef.current, ...fields }
      setParticipant((p) => (p ? { ...p, ...fields } : p))
    },
    [store],
  )

  const advance = useCallback(
    (fields: Partial<ParticipantDoc> = {}, stamp: TimestampField[] = []) => {
      const current = participantRef.current
      if (!current) return
      const stage = nextStage(current.stage, entry.mode)
      logEvent('stage', { from: current.stage, to: stage })
      update({ ...fields, stage }, stamp)
    },
    [update, entry.mode],
  )

  if (boot.state === 'loading') {
    return <Message title="Loading…" />
  }

  if (boot.state === 'blocked') {
    switch (boot.reason) {
      case 'invalid_agent':
        return (
          <Message title="Invalid agent link">
            <p>{entry.invalid}</p>
          </Message>
        )
      case 'missing_params':
        return (
          <Message title="Please use the link you were given">
            <p>
              This link is missing your participant code. Open the study again from the link in your invitation.
            </p>
          </Message>
        )
      case 'taken':
        return (
          <Message title="You've already started">
            <p>
              You started this study in another browser or on another phone. Please go back to that one to continue.
            </p>
          </Message>
        )
      case 'pid_mismatch':
        return (
          <Message title="This phone has already been used">
            <p>Someone has already taken part in this study on this browser. Please contact the researchers.</p>
          </Message>
        )
      case 'error':
        return (
          <Message title="We couldn't connect">
            <p>Check your signal, then try again.</p>
            <button className="btn btn-study" onClick={() => window.location.reload()}>
              Try again
            </button>
          </Message>
        )
    }
  }

  if (!participant) return null
  const props: StageProps = { participant, mode: entry.mode, store, update, advance }
  const Stage = participant.stage === 'device' ? null : STAGE_COMPONENTS[participant.stage]

  return (
    <>
      {entry.mode === 'demo' && (
        <div className="demo-tag" aria-hidden="true">
          Demo · nudged: {participant.pattern || 'none'}{participant.appOrder ? ` · ${participant.appOrder === 'stride_first' ? 'Stride' : 'Bramble'} first` : ''} · nothing saved
        </div>
      )}
      {entry.mode === 'pilot' && (
        <div className="demo-tag" aria-hidden="true">
          Pilot
        </div>
      )}
      {Stage ? <Stage key={participant.stage} {...props} /> : <DeviceCheck {...props} detect={detect} skipCheck={entry.skipDeviceCheck === true} />}
      <div className="rotate-overlay">Please turn your phone upright to continue.</div>
    </>
  )
}
