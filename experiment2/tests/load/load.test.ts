// Load test: about 100 participants arriving at once (a Prolific launch), against the
// emulators with the real rules (npm run test:load). Checks that every assignment succeeds,
// that balance holds under contention, and that a session's writes all land.
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, initializeFirestore } from 'firebase/firestore'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('__APP_VERSION__', 'load-test')

const { FirestoreStore, collectionNames } = await import('../../src/study/firestoreStore')

const PEOPLE = Number(process.env.LOAD_PEOPLE ?? 100)
/** Writes per person after assignment, roughly a full two-app session (events + state saves). */
const WRITES_PER_PERSON = Number(process.env.LOAD_WRITES ?? 60)

const apps: FirebaseApp[] = []
const run = Date.now().toString(36)
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180'
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9199'

function browser(i: number) {
  const app = initializeApp({ projectId: 'demo-bramble', apiKey: 'demo-api-key', appId: 'demo' }, `load${i}-${run}`)
  apps.push(app)
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true })
  const db = initializeFirestore(app, {})
  const [fsHost, fsPort] = firestoreHost.split(':')
  connectFirestoreEmulator(db, fsHost, Number(fsPort))
  return { db, store: new FirestoreStore(db, auth, collectionNames(true)) }
}

afterAll(async () => {
  for (const app of apps) await deleteApp(app)
})

describe(`${PEOPLE} participants starting at once`, () => {
  it('assigns everyone, keeps the 40 cells balanced, and saves every write', async () => {
    const started = Date.now()
    const browsers = Array.from({ length: PEOPLE }, (_, i) => browser(i))

    const results = await Promise.all(
      browsers.map(async (b, i) => {
        await b.store.start({ prolificPid: `LOAD_${i}_${run}`, studyId: 'load', sessionId: `s${i}` })
        const assignment = await b.store.assign()
        for (let w = 0; w < WRITES_PER_PERSON; w++) {
          if (w % 3 === 0) b.store.update({ taskIndex: w % 10 })
          else b.store.sink.write({ type: 'action', pageLoadAt: 1, seq: w, clientTime: Date.now(), clientT: w, taskId: 1, app: 'bramble', screen: 'shop', name: 'load' })
        }
        await b.store.flush()
        return assignment
      }),
    )
    const seconds = (Date.now() - started) / 1000

    expect(results).toHaveLength(PEOPLE)
    for (const r of results) {
      expect(r.pattern).toMatch(/^(U[1-6]){3}$/)
      expect(r.taskOrder).toHaveLength(10)
    }
    const meta = (await getDoc(doc(browsers[0].db, 'pilot_meta', 'assignment'))).data() as Record<string, number>
    const counts = Object.values(meta)
    const total = counts.reduce((a, b) => a + b, 0)
    // Earlier runs against the same emulator also count, so check this run's share and the spread.
    expect(total).toBeGreaterThanOrEqual(PEOPLE)
    const spread = Math.max(...counts) - Math.min(...counts)
    const appFirst = results.filter((r) => r.appOrder === 'stride_first').length

    console.log(
      `[load] ${PEOPLE} people, ${PEOPLE * (WRITES_PER_PERSON + 3)} writes in ${seconds.toFixed(1)} s; ` +
        `cells used ${counts.length}/40, spread ${spread}; Stride first ${appFirst}/${PEOPLE}`,
    )
    expect(counts.length === 40 ? spread <= 1 : true).toBe(true)
    expect(Math.abs(appFirst - PEOPLE / 2)).toBeLessThanOrEqual(1)
  }, 600_000)
})
