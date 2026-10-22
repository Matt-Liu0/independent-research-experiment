import type { Interviewer } from './interviewer'
import type { Part2Store } from './store'
import type { Part2Doc, Part2TimestampField } from './types'

export interface Part2StageProps {
  doc: Part2Doc
  store: Part2Store
  /** The Part 2 interviewer (the chat stage only uses it). */
  interviewer: Interviewer
  /** Save fields without leaving the stage. */
  update: (fields: Partial<Part2Doc>, stamp?: Part2TimestampField[]) => void
  /** Save fields and move to the next stage. */
  advance: (fields?: Partial<Part2Doc>, stamp?: Part2TimestampField[]) => void
}
