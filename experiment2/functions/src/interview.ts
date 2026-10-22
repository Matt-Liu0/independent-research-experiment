// The interview as a state machine, with no Firebase or API calls, so it can be tested.
// The server (index.ts) loads the state, calls step() to learn what to do, asks the model
// when step() says so, and saves the result.
import { CASE_SET, CLOSING, DOMAINS, OPENERS, caseArmReady, caseMessage, domainNote, type Arm, type Domain } from './prompts.js'

/** Each domain gets this much time; after it, the next participant message moves on (spec: about 15 minutes in all). */
export const DOMAIN_MS = 7.5 * 60_000

/** Participant messages per domain before it moves on, whatever the model does. */
export const MAX_PARTICIPANT_TURNS: Record<Arm, number> = {
  // The answer to the opener plus three generic follow-ups (spec).
  open: 4,
  // Six coordinates, with room for a few "it depends" clarifications.
  structured: 10,
  // Set per domain below: one answer per case, plus up to three rounds on the inferred rule.
  case: 0,
}

/** Rounds of "is this rule right?" in the case arm. */
export const RULE_ROUNDS = 3

/** Longest participant message accepted. */
export const MAX_MESSAGE_CHARS = 1000

/** The marker the model ends a message with when it has finished a domain (structured and case arms). */
export const NEXT_MARKER = '[[NEXT]]'

export interface Turn {
  role: 'interviewer' | 'participant'
  text: string
  domain: Domain
  /** Server time, ms. */
  at: number
  /** Where the interviewer's text came from: fixed wording, or the model (with the model that served it). */
  source?: 'fixed' | 'model'
  model?: string
  caseId?: string
}

export interface InterviewState {
  arm: Arm
  domainIndex: number
  domainStartedAt: number
  startedAt: number
  endedAt: number | null
  done: boolean
  turns: Turn[]
}

export function newInterview(arm: Arm, now: number): InterviewState {
  return {
    arm,
    domainIndex: 0,
    domainStartedAt: now,
    startedAt: now,
    endedAt: null,
    done: false,
    turns: [{ role: 'interviewer', text: OPENERS[arm].location, domain: 'location', at: now, source: 'fixed' }],
  }
}

/** Arms that can be assigned: the case arm only once T has cases for both domains. */
export function availableArms(): Arm[] {
  return caseArmReady() ? ['open', 'structured', 'case'] : ['open', 'structured']
}

/** The least-used available arm (ties at random), for balanced assignment across arms. */
export function pickArm(counts: Partial<Record<Arm, number>>, random: () => number = Math.random): Arm {
  const arms = availableArms()
  const least = Math.min(...arms.map((a) => counts[a] ?? 0))
  const tied = arms.filter((a) => (counts[a] ?? 0) === least)
  return tied[Math.floor(random() * tied.length)]
}

export function currentDomain(s: InterviewState): Domain {
  return DOMAINS[s.domainIndex]
}

function domainTurns(s: InterviewState) {
  const domain = currentDomain(s)
  return s.turns.filter((t) => t.domain === domain)
}

function participantTurnsInDomain(s: InterviewState): number {
  return domainTurns(s).filter((t) => t.role === 'participant').length
}

function maxTurns(s: InterviewState): number {
  if (s.arm !== 'case') return MAX_PARTICIPANT_TURNS[s.arm]
  return CASE_SET[currentDomain(s)].length + RULE_ROUNDS
}

/** The next case to show in the case arm, or null once every case in this domain has been answered. */
function nextCase(s: InterviewState): { index: number; total: number; id: string; text: string } | null {
  const cases = CASE_SET[currentDomain(s)]
  const shown = domainTurns(s).filter((t) => t.caseId).length
  return shown < cases.length ? { index: shown, total: cases.length, ...cases[shown] } : null
}

/** What the server should do after the participant's latest message. */
export type Step =
  | { kind: 'ask_model' }
  | { kind: 'fixed'; turn: Omit<Turn, 'at'> }
  | { kind: 'next_domain' }
  | { kind: 'finish' }

export function step(s: InterviewState, now: number): Step {
  const overTime = now - s.domainStartedAt >= DOMAIN_MS
  if (overTime || participantTurnsInDomain(s) >= maxTurns(s)) return s.domainIndex < DOMAINS.length - 1 ? { kind: 'next_domain' } : { kind: 'finish' }
  if (s.arm === 'case') {
    const c = nextCase(s)
    if (c) return { kind: 'fixed', turn: { role: 'interviewer', text: caseMessage(c.index, c.total, c.text), domain: currentDomain(s), source: 'fixed', caseId: c.id } }
  }
  return { kind: 'ask_model' }
}

/** Adds the participant's message. Returns null if it can't be accepted. */
export function addParticipant(s: InterviewState, text: string, now: number): InterviewState | null {
  const clean = text.trim().slice(0, MAX_MESSAGE_CHARS)
  if (!clean || s.done) return null
  return { ...s, turns: [...s.turns, { role: 'participant', text: clean, domain: currentDomain(s), at: now }] }
}

/** Adds a model reply. If it ends a domain (the marker), the caller moves on next. */
export function addModelReply(s: InterviewState, raw: string, model: string, now: number): { state: InterviewState; domainDone: boolean } {
  const domainDone = s.arm !== 'open' && raw.includes(NEXT_MARKER)
  const text = raw.replaceAll(NEXT_MARKER, '').trim()
  const turn: Turn = { role: 'interviewer', text, domain: currentDomain(s), at: now, source: 'model', model }
  return { state: { ...s, turns: [...s.turns, turn] }, domainDone }
}

export function addFixed(s: InterviewState, turn: Omit<Turn, 'at'>, now: number): InterviewState {
  return { ...s, turns: [...s.turns, { ...turn, at: now }] }
}

/** Moves to the next domain and adds its fixed opener; in the case arm, also its first case. */
export function startNextDomain(s: InterviewState, now: number): InterviewState {
  const domainIndex = s.domainIndex + 1
  const domain = DOMAINS[domainIndex]
  let next: InterviewState = {
    ...s,
    domainIndex,
    domainStartedAt: now,
    turns: [...s.turns, { role: 'interviewer', text: OPENERS[s.arm][domain], domain, at: now, source: 'fixed' }],
  }
  if (s.arm === 'case') {
    const c = nextCase(next)
    if (c) next = addFixed(next, { role: 'interviewer', text: caseMessage(c.index, c.total, c.text), domain, source: 'fixed', caseId: c.id }, now)
  }
  return next
}

export function finish(s: InterviewState, now: number): InterviewState {
  return {
    ...s,
    done: true,
    endedAt: now,
    turns: [...s.turns, { role: 'interviewer', text: CLOSING, domain: currentDomain(s), at: now, source: 'fixed' }],
  }
}

/** The case arm starts with the opener and then the first case. */
export function startInterview(arm: Arm, now: number): InterviewState {
  const s = newInterview(arm, now)
  if (arm !== 'case') return s
  const c = nextCase(s)
  return c ? addFixed(s, { role: 'interviewer', text: caseMessage(c.index, c.total, c.text), domain: 'location', source: 'fixed', caseId: c.id }, now) : s
}

/** The participant-facing view: no models, sources or case IDs. */
export function publicView(s: InterviewState) {
  return {
    done: s.done,
    turns: s.turns.map((t) => ({ role: t.role, text: t.text })),
  }
}

/** Summary saved on the participant record (for the export). */
export function summary(s: InterviewState) {
  const participant = s.turns.filter((t) => t.role === 'participant')
  return {
    done: s.done,
    turns: s.turns.length,
    participantTurns: participant.length,
    participantChars: participant.reduce((n, t) => n + t.text.length, 0),
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    minutes: s.endedAt ? Math.round((s.endedAt - s.startedAt) / 600) / 100 : null,
  }
}

/** Shown to the model as the first user turn, since the transcript opens with the interviewer. */
export const CHAT_OPENED = '(The user has opened the chat.)'

/**
 * The transcript as Messages API turns: interviewer → assistant, participant → user. When the
 * second domain starts, an operator note (a mid-conversation system message) goes right after
 * the participant's last message of the first domain.
 */
export function apiMessages(s: InterviewState): { role: 'user' | 'assistant' | 'system'; content: string }[] {
  const out: { role: 'user' | 'assistant' | 'system'; content: string }[] = [{ role: 'user', content: CHAT_OPENED }]
  let domain: Domain = 'location'
  for (const t of s.turns) {
    if (t.domain !== domain) {
      domain = t.domain
      out.push({ role: 'system', content: domainNote(domain) })
    }
    out.push({ role: t.role === 'interviewer' ? 'assistant' : 'user', content: t.text })
  }
  return out
}
