import type { StudyStore } from './store'
import type { Mode, ParticipantDoc, TimestampField } from './types'

export interface StageProps {
  participant: ParticipantDoc
  mode: Mode
  store: StudyStore
  /** Save fields without leaving the stage. */
  update: (fields: Partial<ParticipantDoc>, stamp?: TimestampField[]) => void
  /** Save fields and move to the next stage. */
  advance: (fields?: Partial<ParticipantDoc>, stamp?: TimestampField[]) => void
}
