// The interviewer function in the Functions emulator, called through the app's own client code
// (FirestorePart2Store + CallableInterviewer), with the real security rules. Nothing here makes
// the function call the model: only opening the chat, which uses the fixed opener.
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, initializeFirestore, setDoc } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('__APP_VERSION__', 'test')

const { FirestorePart2Store } = await import('../../src/part2/store')
const { CallableInterviewer } = await import('../../src/part2/interviewer')

const run = Date.now().toString(36)
const apps: FirebaseApp[] = []
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180'
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9199'
const functionsPort = 5101

function browser() {
  const app = initializeApp({ projectId: 'demo-bramble', apiKey: 'demo-api-key', appId: 'demo' }, `f${apps.length}-${run}`)
  apps.push(app)
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true })
  const db = initializeFirestore(app, {})
  const [host, port] = firestoreHost.split(':')
  connectFirestoreEmulator(db, host, Number(port))
  const functions = getFunctions(app, 'us-central1')
  connectFunctionsEmulator(functions, '127.0.0.1', functionsPort)
  return { auth, db, functions, store: new FirestorePart2Store(db, auth, true), part3: new FirestorePart2Store(db, auth, true, 3) }
}

/** A pilot Part 2 participant who has reached the chat. */
async function atChat(pid: string, stage = 'chat') {
  const b = browser()
  await b.store.start({ participantCode: `${pid}_${run}` })
  b.store.update({ stage: stage as 'chat' })
  await b.store.flush()
  return { ...b, uid: b.auth.currentUser!.uid }
}

let env: RulesTestEnvironment
const asAdmin = <T>(fn: (db: ReturnType<ReturnType<RulesTestEnvironment['unauthenticatedContext']>['firestore']>) => Promise<T>) =>
  new Promise<T>((resolve, reject) => env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()).then(resolve, reject)))

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-bramble' })
})

afterAll(async () => {
  await Promise.all(apps.map((a) => deleteApp(a)))
  await env.cleanup()
})

describe('interviewTurn', () => {
  it('assigns the arm once, saves the opener server-side, and records the arm on the participant', async () => {
    const p = await atChat('arm')
    const interviewer = new CallableInterviewer(p.functions, true, 'structured')
    const first = await interviewer.send(null, 0)
    expect(first.done).toBe(false)
    expect(first.turns).toEqual([{ role: 'interviewer', text: expect.stringContaining('grocery delivery app') }])

    // Opening again (a reload) returns the same conversation and doesn't assign again.
    expect(await interviewer.send(null, 0)).toEqual(first)
    const record = await asAdmin((db) => getDoc(doc(db, 'pilot_part2', p.uid)))
    expect(record.data()).toMatchObject({ arm: 'structured', interview: { done: false, turns: 1, participantTurns: 0 } })
    const saved = await asAdmin((db) => getDoc(doc(db, 'pilot_part2_interviews', p.uid)))
    expect(saved.data()).toMatchObject({ model: 'claude-sonnet-5-5', state: { arm: 'structured', domainIndex: 0 } })
    expect(saved.data()!.state.turns[0]).toMatchObject({ source: 'fixed', domain: 'location' })
  })

  it('balances arms when none is forced', async () => {
    const arms: string[] = []
    for (const name of ['bal1', 'bal2']) {
      const p = await atChat(name)
      await new CallableInterviewer(p.functions, true).send(null, 0)
      const record = await asAdmin((db) => getDoc(doc(db, 'pilot_part2', p.uid)))
      arms.push(record.data()!.arm)
    }
    expect(arms.every((a) => a === 'open' || a === 'structured' || a === 'case')).toBe(true)
    const counts = (await asAdmin((db) => getDoc(doc(db, 'pilot_part2_meta', 'arms')))).data()!
    const used = ['open', 'structured', 'case'].map((a) => counts[a] ?? 0)
    expect(Math.max(...used) - Math.min(...used)).toBeLessThanOrEqual(1)
  })

  it('ignores a message sent from an out-of-date view, without calling the model', async () => {
    const p = await atChat('stale')
    const interviewer = new CallableInterviewer(p.functions, true, 'open')
    await interviewer.send(null, 0)
    const view = await interviewer.send('hello', 7)
    expect(view.turns).toHaveLength(1)
  })

  it('refuses participants who are not at the chat, and callers who are not signed in', async () => {
    const early = await atChat('early', 'briefing')
    await expect(new CallableInterviewer(early.functions, true).send(null, 0)).rejects.toMatchObject({ code: 'functions/failed-precondition' })
    const anonymous = browser()
    await expect(new CallableInterviewer(anonymous.functions, true).send(null, 0)).rejects.toMatchObject({ code: 'functions/unauthenticated' })
  })

  it('never shows the participant the saved transcript or the counters', async () => {
    const p = await atChat('private')
    await new CallableInterviewer(p.functions, true).send(null, 0)
    await expect(getDoc(doc(p.db, 'pilot_part2_interviews', p.uid))).rejects.toMatchObject({ code: 'permission-denied' })
    await expect(getDoc(doc(p.db, 'pilot_part2_meta', 'arms'))).rejects.toMatchObject({ code: 'permission-denied' })
  })

  it('opens Part 3 for the code once its Part 2 chat finishes, and not before', async () => {
    const p = await atChat('handoff')
    const code = `handoff_${run}`
    const interviewer = new CallableInterviewer(p.functions, true, 'open')
    await interviewer.send(null, 0)
    // On the fitness app with its time used up, so the next message ends the chat without a model call.
    const ref = doc(p.db, 'pilot_part2_interviews', p.uid).path
    await asAdmin(async (db) => {
      const saved = (await getDoc(doc(db, ref))).data()!
      await setDoc(doc(db, ref), { ...saved, state: { ...saved.state, domainIndex: 1, domainStartedAt: 0 } })
    })

    // Part 3 on another device, too early: refused without claiming the code.
    const phone = browser()
    expect(await phone.part3.start({ participantCode: code })).toEqual({ kind: 'part2_not_done' })

    const end = await interviewer.send('that is all', 1)
    expect(end.done).toBe(true)
    expect((await asAdmin((db) => getDoc(doc(db, 'pilot_part2_done', code)))).exists()).toBe(true)

    const later = await phone.part3.start({ participantCode: code })
    expect(later).toMatchObject({ kind: 'new', doc: { participantCode: code, stage: 'device' } })
  })
})
