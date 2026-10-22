import type { Functions } from 'firebase/functions'
import type { Arm } from './types'

/** What the participant sees of the conversation. */
export interface ChatTurn {
  role: 'interviewer' | 'participant'
  text: string
}

export interface ChatView {
  done: boolean
  turns: ChatTurn[]
}

/** Talks to the interviewer. message null = load the conversation (first open, or after a reload). */
export interface Interviewer {
  send(message: string | null, turnCount: number): Promise<ChatView>
}

/** Longest message the participant can send (the server trims to the same). */
export const MAX_MESSAGE_CHARS = 1000

/** The real interviewer: the interviewTurn Cloud Function (functions/src/index.ts). */
export class CallableInterviewer implements Interviewer {
  private readonly functions: Functions
  private readonly pilot: boolean
  private readonly arm: Arm | undefined

  constructor(functions: Functions, pilot: boolean, arm?: Arm) {
    this.functions = functions
    this.pilot = pilot
    this.arm = arm
  }

  async send(message: string | null, turnCount: number): Promise<ChatView> {
    // Loaded on first use, so demo pages and tests never pull in the Functions SDK.
    const { httpsCallable } = await import('firebase/functions')
    const call = httpsCallable<object, ChatView>(this.functions, 'interviewTurn', { timeout: 120_000 })
    const result = await call({ pilot: this.pilot, message, turnCount, ...(this.pilot && this.arm ? { arm: this.arm } : {}) })
    return result.data
  }
}

/**
 * Demo links and tests: a stand-in that follows the same shape (fixed opener, a few follow-ups
 * per app, a fixed closing) without calling any model. Not the real interviewer's wording.
 */
export class ScriptedInterviewer implements Interviewer {
  private turns: ChatTurn[]
  private done = false

  constructor(arm: Arm = 'open') {
    this.turns = [{ role: 'interviewer', text: `[Demo interviewer, ${arm} arm] Let's start with a grocery delivery app. How would you want it to handle information about where you are?` }]
  }

  async send(message: string | null): Promise<ChatView> {
    if (message !== null && !this.done) {
      this.turns.push({ role: 'participant', text: message.trim().slice(0, MAX_MESSAGE_CHARS) })
      const answered = this.turns.filter((t) => t.role === 'participant').length
      const reply =
        answered === 2
          ? 'Thanks. Now think about a fitness app. How would you want it to handle your health information?'
          : answered >= 4
            ? "Thank you, that's everything I need for now. Please click Continue."
            : 'Is there anything else I should keep in mind?'
      this.turns.push({ role: 'interviewer', text: reply })
      if (answered >= 4) this.done = true
    }
    return { done: this.done, turns: [...this.turns] }
  }
}
