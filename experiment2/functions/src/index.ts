// The Part 2 interviewer: one callable function, interviewTurn.
//
// The participant's browser sends its latest message; this function assigns the arm (first
// call only, balanced across arms), adds the message, asks Claude for the interviewer's reply
// when the script calls for it, and saves the transcript where participants can't read or edit
// it (<col>_interviews/<uid>, which no security rule opens). The API key is a Secret Manager
// secret (ANTHROPIC_API_KEY), so it never reaches the browser.
import Anthropic from '@anthropic-ai/sdk'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, type DocumentReference } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import {
  addFixed,
  addModelReply,
  addParticipant,
  apiMessages,
  finish,
  pickArm,
  publicView,
  startInterview,
  startNextDomain,
  step,
  summary,
  type InterviewState,
} from './interview.js'
import { DOMAINS, PROMPTS_VERSION, systemPrompt, type Arm } from './prompts.js'

/** One fixed interviewer for every participant (pipeline, Experiment 1, "Interviewer"). */
export const MODEL = 'claude-sonnet-5-5'

/** Said instead of a reply if the model declines; the interview carries on. */
const DECLINED_REPLY = 'Thanks. Is there anything else about how you want this information handled?'

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

initializeApp()
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

interface Request {
  pilot: boolean
  /** null: just return the conversation (first open, or after a reload). */
  message: string | null
  /** How many turns the browser has; a message sent from an out-of-date view is ignored. */
  turnCount: number
  /** Pilot only: force an arm, to try each one. */
  arm?: Arm
}

function parse(data: unknown): Request {
  const d = (data ?? {}) as Record<string, unknown>
  const arm = d.arm === 'open' || d.arm === 'structured' || d.arm === 'case' ? d.arm : undefined
  if (d.message !== null && typeof d.message !== 'string') throw new HttpsError('invalid-argument', 'message')
  if (typeof d.turnCount !== 'number') throw new HttpsError('invalid-argument', 'turnCount')
  return { pilot: d.pilot === true, message: d.message as string | null, turnCount: d.turnCount, arm: d.pilot === true ? arm : undefined }
}

/** Loads the interview, or starts it: picks the arm and saves the opener, in one transaction. */
async function loadOrStart(recordRef: DocumentReference, interviewRef: DocumentReference, pilot: boolean, forced: Arm | undefined) {
  const metaRef = db.doc(`${pilot ? 'pilot_' : ''}part2_meta/arms`)
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(interviewRef)
    if (existing.exists) return existing.data()!.state as InterviewState
    const counts = (await tx.get(metaRef)).data() ?? {}
    const arm = forced ?? pickArm(counts)
    const state = startInterview(arm, Date.now())
    tx.set(metaRef, { [arm]: FieldValue.increment(1) }, { merge: true })
    tx.set(interviewRef, { state, model: MODEL, promptsVersion: PROMPTS_VERSION, createdAt: FieldValue.serverTimestamp() })
    tx.update(recordRef, { arm, interview: summary(state) })
    logger.info('interview started', { arm, pilot })
    return state
  })
}

async function askModel(client: Anthropic, s: InterviewState): Promise<{ text: string; model: string }> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    // A short conversational reply: low effort is enough, and keeps replies quick.
    output_config: { effort: 'low' },
    // If the model declines (a safety refusal), the API reruns the turn on a fallback model;
    // response.model records which model actually answered, saved with each turn.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    cache_control: { type: 'ephemeral' },
    system: systemPrompt(s.arm),
    messages: apiMessages(s) as Anthropic.Beta.BetaMessageParam[],
  })
  if (response.stop_reason === 'refusal') {
    logger.warn('interviewer declined', { category: response.stop_details?.category ?? null })
    return { text: DECLINED_REPLY, model: 'declined' }
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  return { text: text || DECLINED_REPLY, model: response.model }
}

/** Runs the script after the participant's message until the interviewer has said something (or finished). */
async function respond(client: Anthropic, s: InterviewState): Promise<InterviewState> {
  const now = Date.now()
  const next = step(s, now)
  if (next.kind === 'fixed') return addFixed(s, next.turn, now)
  if (next.kind === 'next_domain') return startNextDomain(s, now)
  if (next.kind === 'finish') return finish(s, now)
  const reply = await askModel(client, s)
  const { state, domainDone } = addModelReply(s, reply.text, reply.model, Date.now())
  if (!domainDone) return state
  return state.domainIndex < DOMAINS.length - 1 ? startNextDomain(state, Date.now()) : finish(state, Date.now())
}

export const interviewTurn = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 120, maxInstances: 20, memory: '256MiB' },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in first')
    const req = parse(request.data)
    const col = req.pilot ? 'pilot_part2' : 'part2'
    const recordRef = db.doc(`${col}/${uid}`)
    const interviewRef = db.doc(`${col}_interviews/${uid}`)

    const record = await recordRef.get()
    if (!record.exists) throw new HttpsError('not-found', 'No Part 2 record')
    if (record.data()!.stage !== 'chat') throw new HttpsError('failed-precondition', 'Not at the chat')

    const state = await loadOrStart(recordRef, interviewRef, req.pilot, req.arm)
    // Opening or reloading the page, a finished interview, or a message from an out-of-date view: show where things are.
    if (req.message === null || state.done || req.turnCount !== state.turns.length) return publicView(state)

    const withMessage = addParticipant(state, req.message, Date.now())
    if (!withMessage) throw new HttpsError('invalid-argument', 'Empty message')

    let updated: InterviewState
    try {
      updated = await respond(new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() }), withMessage)
    } catch (err) {
      // Nothing is saved, so the participant can send the same message again.
      logger.error('interviewer call failed', err)
      throw new HttpsError('unavailable', 'The assistant could not reply. Please try again.')
    }

    // Save only if no other request changed the conversation meanwhile (e.g. a double click).
    await db.runTransaction(async (tx) => {
      const current = (await tx.get(interviewRef)).data()?.state as InterviewState | undefined
      if (!current || current.turns.length !== state.turns.length) throw new HttpsError('aborted', 'The conversation changed. Please reload.')
      tx.update(interviewRef, { state: updated, updatedAt: FieldValue.serverTimestamp() })
      tx.update(recordRef, { interview: summary(updated) })
    })
    return publicView(updated)
  },
)
