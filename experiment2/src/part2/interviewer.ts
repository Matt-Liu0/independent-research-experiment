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
 * The interviewer's fixed texts, copied from functions/src/prompts.ts (the browser can't import
 * the function's code). A test checks that the copies match.
 */
export const DEMO_FIXED = {
  openers: {
    open: {
      location:
        "Hi! I'm going to help you with your apps. Let's start with a grocery delivery app. How would you want an app like that to handle information about where you are and where you go?",
      health:
        'Thanks. Now think about a fitness app. How would you want it to handle your health information, like your heart rate, workouts and sleep?',
    },
    structured: {
      location:
        "Hi! I'm going to help you with your apps. Let's start with a grocery delivery app and information about where you are. First: which apps or services are you comfortable having your location at all?",
      health:
        'Thanks. Now think about a fitness app and your health information, like your heart rate, workouts and sleep. Which apps or services are you comfortable having that information at all?',
    },
    case: {
      location:
        "Hi! I'm going to help you with your apps. Let's start with a grocery delivery app. I'll describe a few situations; for each, tell me whether you'd allow it, block it, or want to be asked first, and why.",
      health:
        "Thanks. Now a fitness app. Again I'll describe a few situations; for each, tell me whether you'd allow it, block it, or want to be asked first, and why.",
    },
  } satisfies Record<Arm, Record<'location' | 'health', string>>,
  closing: "Thank you, that's everything I need for now. Please click Continue.",
}

const caseMessage = (index: number, total: number, text: string) =>
  `Situation ${index + 1} of ${total}: ${text} Would you allow this, block it, or want to be asked first?`

/**
 * Example situations for the demo only. The real case set T isn't chosen yet
 * (functions/src/prompts.ts, CASE_SET); these are site flows' questionnaire wording.
 */
const DEMO_CASES = {
  location: [
    "Your grocery delivery app wants your current location to show nearby stores and what they have in stock, while you're using the app.",
    'Partner brands of your grocery delivery app want your location history to send you marketing offers.',
    'A car insurance company wants your location history from your grocery delivery app to offer you a safe-driving discount, and the app gives you a $2.00 reward.',
  ],
  health: [
    'Your workout coach wants your live heart rate to adjust your pace, during workouts.',
    "Your fitness app wants your heart rate in the background at all times, even when you're not working out, to track your fitness.",
    'A health insurance company wants your heart-rate and activity history from your fitness app to offer you a wellness discount, and the app gives you a $2.00 reward.',
  ],
}

/** What the structured arm asks after its opener (coordinates 2 to 6), per domain. Demo wording. */
const DEMO_STRUCTURED = {
  location: [
    'Who would you be comfortable receiving it: the app itself, partner companies, advertisers, insurers, researchers, or friends and family?',
    "Is it only your own location, or also the location of people you're with?",
    'Exactly what information: your exact location, or just your general area?',
    'What would you be comfortable with it being used for: running the service, personalizing, advertising, pricing insurance, or research?',
    "Under what conditions: only with your permission, only while you're using the app, once or ongoing, how long it's kept, or in return for a reward?",
  ],
  health: [
    'Who would you be comfortable receiving it: the app itself, partner companies, advertisers, insurers, researchers, or friends and family?',
    "Is it only your own information, or also information about people you're with?",
    'Exactly what information: specific readings like each heart-rate measurement, or just daily summaries?',
    'What would you be comfortable with it being used for: running the service, personalizing, advertising, pricing insurance, or research?',
    "Under what conditions: only with your permission, only during workouts, once or ongoing, how long it's kept, or in return for a reward?",
  ],
}

const DEMO_RULE =
  "[Demo: here the assistant states, in a sentence or two, the rule it infers from your answers: what you'd allow, block or want to be asked about, and why.] Is that right?"

/**
 * The interviewer's messages for one arm, as rounds: round 0 opens the chat, and each answer
 * from the participant brings the next round. Fixed texts match the real interviewer; the
 * follow-ups the model would write are stand-ins.
 */
function demoScript(arm: Arm): string[][] {
  const o = DEMO_FIXED.openers[arm]
  if (arm === 'open') {
    const more = 'Is there anything else I should keep in mind?'
    return [[o.location], [more], [o.health], [more], [DEMO_FIXED.closing]]
  }
  if (arm === 'structured') {
    return [
      [o.location],
      ...DEMO_STRUCTURED.location.map((q) => [q]),
      [o.health],
      ...DEMO_STRUCTURED.health.map((q) => [q]),
      [DEMO_FIXED.closing],
    ]
  }
  const cases = (d: 'location' | 'health') => DEMO_CASES[d].map((c, i, all) => caseMessage(i, all.length, c))
  const [l0, ...lRest] = cases('location')
  const [h0, ...hRest] = cases('health')
  return [[o.location, l0], ...lRest.map((c) => [c]), [DEMO_RULE], [o.health, h0], ...hRest.map((c) => [c]), [DEMO_RULE], [DEMO_FIXED.closing]]
}

/**
 * Demo links and tests: a stand-in that follows each arm's real shape without calling any model.
 * Fixed messages (openers, cases, closing) are the real ones; the follow-ups are stand-ins.
 */
export class ScriptedInterviewer implements Interviewer {
  private turns: ChatTurn[]
  private readonly script: string[][]
  private round = 0

  constructor(arm: Arm = 'open') {
    this.script = demoScript(arm)
    this.turns = this.script[0].map((text) => ({ role: 'interviewer' as const, text }))
  }

  private get done(): boolean {
    return this.round >= this.script.length - 1
  }

  async send(message: string | null): Promise<ChatView> {
    if (message !== null && !this.done) {
      this.turns.push({ role: 'participant', text: message.trim().slice(0, MAX_MESSAGE_CHARS) })
      this.round++
      for (const text of this.script[this.round]) this.turns.push({ role: 'interviewer', text })
    }
    return { done: this.done, turns: [...this.turns] }
  }
}
