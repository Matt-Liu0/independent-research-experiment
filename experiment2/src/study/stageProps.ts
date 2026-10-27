import type { StudyStore } from './store'
import type { Mode, ParticipantDoc, TimestampField } from './types'

export interface StageProps {
  participant: ParticipantDoc
  mode: Mode
  /** Demo links with &skip=1 only: unfinished tasks can be skipped. */
  allowTaskSkip?: boolean
  store: StudyStore
  /** Save fields without leaving the stage. */
  update: (fields: Partial<ParticipantDoc>, stamp?: TimestampField[]) => void
  /** Save fields and move to the next stage. */
  advance: (fields?: Partial<ParticipantDoc>, stamp?: TimestampField[]) => void
}
