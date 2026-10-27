// End-to-end check of the app's FirestoreStore against the Auth and Firestore emulators,
// with the real security rules loaded (npm run test:rules).
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signOut } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, getDocs, collection, initializeFirestore } from 'firebase/firestore'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import type { Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('__APP_VERSION__', 'test')

const { FirestoreStore, collectionNames } = await import('../../src/study/firestoreStore')

const apps: FirebaseApp[] = []
const run = Date.now().toString(36)

// emulators:exec sets these to the test emulators' ports (firebase.test.json).
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180'
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9199'

/** A separate "browser": its own Firebase app, auth session and Firestore client. */
function browser() {
  const app = initializeApp({ projectId: 'demo-bramble', apiKey: 'demo-api-key', appId: 'demo' }, `b${apps.length}-${run}`)
  apps.push(app)
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true })
  const db = initializeFirestore(app, {})
  const [fsHost, fsPort] = firestoreHost.split(':')
  connectFirestoreEmulator(db, fsHost, Number(fsPort))
  return { app, auth, db, store: new FirestoreStore(db, auth, collectionNames(true)) }
}

const params = (pid: string) => ({ prolificPid: `${pid}_${run}`, studyId: 'study1', sessionId: 'sess1' })

let env: RulesTestEnvironment

beforeAll(async () => {
  // Rules come from the emulator's own config; this is only for reading past them.
  env = await initializeTestEnvironment({ projectId: 'demo-bramble' })
})

afterAll(async () => {
  for (const app of apps) await deleteApp(app)
  await env.cleanup()
})

describe('FirestoreStore with the real rules', () => {
  it('creates a record, assigns a pattern, logs events and resumes', async () => {
    const b = browser()
    const first = await b.store.start(params('alice'))
    expect(first.kind).toBe('new')

    const { pattern, appOrder, taskOrder } = await b.store.assign()
    expect(pattern).toMatch(/^(U[1-6]){3}$/)
    expect(['bramble_first', 'stride_first']).toContain(appOrder)
    expect(taskOrder).toHaveLength(9)

    b.store.update({ stage: 'welcome' }, ['consentAt'])
    b.store.sink.write({ type: 'stage', pageLoadAt: 1, seq: 1, clientTime: 1, clientT: 10, taskId: null, app: null, screen: null, to: 'welcome' })
    await b.store.flush()

    const uid = b.auth.currentUser!.uid
    const snap = await getDoc(doc(b.db, 'pilot_participants', uid))
    expect(snap.data()).toMatchObject({ pattern, appOrder, stage: 'welcome', prolificPid: params('alice').prolificPid })
    expect(snap.data()?.consentAt).toBeTruthy()

    // Assigning again returns the same pattern instead of re-randomizing.
    expect((await b.store.assign()).pattern).toBe(pattern)

    // A reload in the same browser resumes.
    const again = new FirestoreStore(b.db, b.auth, collectionNames(true))
    const resumed = await again.start(params('alice'))
    expect(resumed.kind).toBe('resumed')
    await again.flush()
    expect((await getDoc(doc(b.db, 'pilot_participants', uid))).data()?.resumeCount).toBe(1)
  })

  it('refuses the same Prolific ID in a second browser', async () => {
    const a = browser()
    expect((await a.store.start(params('carol'))).kind).toBe('new')
    const b = browser()
    expect((await b.store.start(params('carol'))).kind).toBe('taken')
  })

  it('refuses a different Prolific ID in a browser that already has a record', async () => {
    const a = browser()
    await a.store.start(params('dan'))
    const again = new FirestoreStore(a.db, a.auth, collectionNames(true))
    expect((await again.start(params('erin'))).kind).toBe('pid_mismatch')
  })

  it('keeps assignment balanced across many participants', async () => {
    const before = await countsNow()
    const patterns: string[] = []
    for (let i = 0; i < 6; i++) {
      const b = browser()
      await b.store.start(params(`bal${i}`))
      patterns.push((await b.store.assign()).pattern)
      await signOut(b.auth)
    }
    const after = await countsNow()
    const total = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0)
    expect(total(after) - total(before)).toBe(6)
    // Least-used first: once all 40 cells exist, no two counts differ by more than 1.
    const spread = Math.max(...Object.values(after)) - Math.min(...Object.values(after))
    expect(Object.keys(after).length < 40 || spread <= 1).toBe(true)
    for (const key of Object.keys(after)) expect(key).toMatch(/^(U[1-6]){3}[BS]$/)
    expect(patterns).toHaveLength(6)
  })

  it('queues events logged before sign-in and writes them once the record exists', async () => {
    const b = browser()
    b.store.sink.write({ type: 'stage', pageLoadAt: 1, seq: 1, clientTime: 1, clientT: 1, taskId: null, app: null, screen: null, name: 'early' })
    await b.store.start(params('frank'))
    await b.store.flush()
    const uid = b.auth.currentUser!.uid
    // Participants can't read events back, so check as an admin.
    let names: unknown[] = []
    await env.withSecurityRulesDisabled(async (ctx) => {
      const admin = ctx.firestore() as unknown as Firestore
      const events = await getDocs(collection(admin, 'pilot_participants', uid, 'events'))
      names = events.docs.map((d) => d.data().name)
    })
    expect(names).toContain('early')
  })
})

async function countsNow() {
  const b = browser()
  await b.store.start(params(`probe${Math.random().toString(36).slice(2)}`))
  const snap = await getDoc(doc(b.db, 'pilot_meta', 'assignment'))
  return (snap.data() as Record<string, number> | undefined) ?? {}
}
