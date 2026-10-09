import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bramble',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
})

const db = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore

function newRecord(pid: string) {
  return {
    prolificPid: pid,
    studyId: 'study1',
    sessionId: 'sess1',
    appVersion: '0.1.0',
    consentVersion: null,
    consentDeclined: false,
    pattern: null,
    taskOrder: null,
    withdrawn: false,
    device: null,
    stage: 'device',
    taskIndex: 0,
    taskPhase: 'doing',
    resumeCount: 0,
    createdAt: serverTimestamp(),
  }
}

/** Claim a Prolific ID and create the record, as the app does on first entry. */
async function enroll(uid: string, pid = `pid_${uid}`, prefix = '') {
  const d = db(uid)
  await setDoc(doc(d, `${prefix}pids`, pid), { uid, createdAt: serverTimestamp() })
  await setDoc(doc(d, `${prefix}participants`, uid), newRecord(pid))
  return d
}

type Counts = Record<string, number>

/** The assignment transaction's writes, as one batch: this pattern's counter + 1, and the pattern on the record. */
function assignBatch(d: Firestore, uid: string, pattern: string, counts: Counts | null, prefix = '') {
  const batch = writeBatch(d)
  const meta = doc(d, `${prefix}meta`, 'assignment')
  const next = { [pattern]: (counts?.[pattern] ?? 0) + 1 }
  if (counts) batch.set(meta, next, { merge: true })
  else batch.set(meta, next)
  batch.update(doc(d, `${prefix}participants`, uid), { pattern, taskOrder: [1, 2, 3, 4, 5, 6] })
  return batch
}

async function seedCounts(counts: Counts, prefix = '') {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, `${prefix}meta`, 'assignment'), counts)
  })
}

describe('participant records', () => {
  it('lets a participant create their own record after claiming their Prolific ID', async () => {
    await assertSucceeds(enroll('alice'))
  })

  it('refuses a record for an ID the user has not claimed', async () => {
    const d = db('alice')
    await assertFails(setDoc(doc(d, 'participants', 'alice'), newRecord('unclaimed')))
  })

  it("refuses a record under someone else's uid", async () => {
    const d = db('alice')
    await setDoc(doc(d, 'pids', 'pid_a'), { uid: 'alice', createdAt: serverTimestamp() })
    await assertFails(setDoc(doc(d, 'participants', 'bob'), newRecord('pid_a')))
  })

  it('refuses a record that arrives with a pattern already set', async () => {
    const d = db('alice')
    await setDoc(doc(d, 'pids', 'pid_a'), { uid: 'alice', createdAt: serverTimestamp() })
    await assertFails(setDoc(doc(d, 'participants', 'alice'), { ...newRecord('pid_a'), pattern: 'U1U2U3' }))
  })

  it('lets the owner read and update their progress', async () => {
    const d = await enroll('alice')
    await assertSucceeds(getDoc(doc(d, 'participants', 'alice')))
    await assertSucceeds(
      setDoc(doc(d, 'participants', 'alice'), { stage: 'consent', appState: { points: 420 } }, { merge: true }),
    )
  })

  it("hides one participant's record from another", async () => {
    await enroll('alice')
    await assertFails(getDoc(doc(db('bob'), 'participants', 'alice')))
    await assertFails(setDoc(doc(db('bob'), 'participants', 'alice'), { stage: 'done' }, { merge: true }))
  })

  it('refuses unauthenticated access', async () => {
    await enroll('alice')
    const anon = env.unauthenticatedContext().firestore() as unknown as Firestore
    await assertFails(getDoc(doc(anon, 'participants', 'alice')))
  })

  it.each(['prolificPid', 'studyId', 'sessionId', 'appVersion', 'withdrawn'])('locks %s after creation', async (field) => {
    const d = await enroll('alice')
    await assertFails(updateDoc(doc(d, 'participants', 'alice'), { [field]: field === 'withdrawn' ? true : 'changed' }))
  })

  it('never lets participants delete their record', async () => {
    const d = await enroll('alice')
    await assertFails(deleteDoc(doc(d, 'participants', 'alice')))
  })
})

describe('Prolific ID claims', () => {
  it('lets only one user claim an ID', async () => {
    await enroll('alice', 'pid_shared')
    await assertFails(setDoc(doc(db('bob'), 'pids', 'pid_shared'), { uid: 'bob', createdAt: serverTimestamp() }))
  })

  it('lets the owner, and only the owner, read a claim', async () => {
    await enroll('alice', 'pid_a')
    await assertSucceeds(getDoc(doc(db('alice'), 'pids', 'pid_a')))
    await assertFails(getDoc(doc(db('bob'), 'pids', 'pid_a')))
  })

  it('refuses claims made out in another user’s name', async () => {
    await assertFails(setDoc(doc(db('bob'), 'pids', 'pid_x'), { uid: 'alice', createdAt: serverTimestamp() }))
  })
})

describe('events', () => {
  const event = () => ({ type: 'decision', clientT: 1234, flowId: 'courier_live', value: 'share', t: serverTimestamp() })

  it('lets the owner add events', async () => {
    const d = await enroll('alice')
    await assertSucceeds(addDoc(collection(d, 'participants', 'alice', 'events'), event()))
  })

  it('refuses events written to another participant', async () => {
    await enroll('alice')
    await assertFails(addDoc(collection(db('bob'), 'participants', 'alice', 'events'), event()))
  })

  it('makes events append-only', async () => {
    const d = await enroll('alice')
    const ref = doc(d, 'participants', 'alice', 'events', 'e1')
    await assertSucceeds(setDoc(ref, event()))
    await assertFails(updateDoc(ref, { value: 'dont_share' }))
    await assertFails(deleteDoc(ref))
    await assertFails(getDoc(ref))
  })

  it('refuses events without a server timestamp', async () => {
    const d = await enroll('alice')
    await assertFails(addDoc(collection(d, 'participants', 'alice', 'events'), { ...event(), t: 5 }))
  })
})

describe('assignment', () => {
  it('assigns the first participant and creates the counter', async () => {
    const d = await enroll('alice')
    await assertSucceeds(assignBatch(d, 'alice', 'U1U3U5', null).commit())
  })

  it("adds 1 to an existing pattern's counter", async () => {
    await seedCounts({ U1U3U5: 2, U2U4U6: 1 })
    const d = await enroll('alice')
    await assertSucceeds(assignBatch(d, 'alice', 'U2U4U6', { U1U3U5: 2, U2U4U6: 1 }).commit())
  })

  it('starts a new counter for a pattern not used yet', async () => {
    await seedCounts({ U1U3U5: 2 })
    const d = await enroll('alice')
    await assertSucceeds(assignBatch(d, 'alice', 'U4U5U6', { U1U3U5: 2 }).commit())
  })

  it('refuses patterns that are not 3 of the 6 screens', async () => {
    for (const bad of ['U1U3', 'U1U3U5U6', 'U1U3U7', 'nudged']) {
      await env.clearFirestore()
      const d = await enroll('alice')
      await assertFails(assignBatch(d, 'alice', bad, null).commit())
    }
  })

  it('refuses setting a pattern without incrementing its counter', async () => {
    await seedCounts({ U1U3U5: 0 })
    const d = await enroll('alice')
    await assertFails(updateDoc(doc(d, 'participants', 'alice'), { pattern: 'U1U3U5', taskOrder: [1, 2, 3, 4, 5, 6] }))
  })

  it('refuses bumping a counter without assigning yourself', async () => {
    await seedCounts({ U1U3U5: 0 })
    const d = await enroll('alice')
    await assertFails(updateDoc(doc(d, 'meta', 'assignment'), { U1U3U5: 1 }))
  })

  it("refuses changing another pattern's counter in the same write", async () => {
    await seedCounts({ U1U3U5: 1, U2U4U6: 1 })
    const d = await enroll('alice')
    const batch = writeBatch(d)
    batch.set(doc(d, 'meta', 'assignment'), { U1U3U5: 2, U2U4U6: 0 }, { merge: true })
    batch.update(doc(d, 'participants', 'alice'), { pattern: 'U1U3U5', taskOrder: [1, 2, 3, 4, 5, 6] })
    await assertFails(batch.commit())
  })

  it('refuses incrementing by more than 1', async () => {
    await seedCounts({ U1U3U5: 0 })
    const d = await enroll('alice')
    const batch = writeBatch(d)
    batch.set(doc(d, 'meta', 'assignment'), { U1U3U5: 2 }, { merge: true })
    batch.update(doc(d, 'participants', 'alice'), { pattern: 'U1U3U5', taskOrder: [1, 2, 3, 4, 5, 6] })
    await assertFails(batch.commit())
  })

  it('refuses a second assignment', async () => {
    const d = await enroll('alice')
    await assertSucceeds(assignBatch(d, 'alice', 'U1U3U5', null).commit())
    await assertFails(assignBatch(d, 'alice', 'U2U4U6', { U1U3U5: 1 }).commit())
  })

  it('refuses a malformed task order', async () => {
    const d = await enroll('alice')
    const batch = writeBatch(d)
    batch.set(doc(d, 'meta', 'assignment'), { U1U3U5: 1 })
    batch.update(doc(d, 'participants', 'alice'), { pattern: 'U1U3U5', taskOrder: [1, 2] })
    await assertFails(batch.commit())
  })
})

describe('pilot collections', () => {
  it('apply the same rules under the pilot_ prefix', async () => {
    const d = await enroll('alice', 'pid_p', 'pilot_')
    await assertSucceeds(assignBatch(d, 'alice', 'U2U4U6', null, 'pilot_').commit())
    await assertFails(getDoc(doc(db('bob'), 'pilot_participants', 'alice')))
  })

  it('keep pilot and study claims separate', async () => {
    await enroll('alice', 'pid_same', 'pilot_')
    await assertSucceeds(enroll('alice2', 'pid_same'))
  })
})
