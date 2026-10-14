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
    appOrder: null,
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

const TEN_TASKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * The assignment transaction's writes, as one batch: the cell's counter + 1 (cell = pattern
 * plus B or S for the app order), and the pattern, app order and task order on the record.
 */
function assignBatch(
  d: Firestore,
  uid: string,
  pattern: string,
  counts: Counts | null,
  prefix = '',
  appOrder: string = 'bramble_first',
) {
  const batch = writeBatch(d)
  const meta = doc(d, `${prefix}meta`, 'assignment')
  const cell = pattern + (appOrder === 'bramble_first' ? 'B' : 'S')
  const next = { [cell]: (counts?.[cell] ?? 0) + 1 }
  if (counts) batch.set(meta, next, { merge: true })
  else batch.set(meta, next)
  batch.update(doc(d, `${prefix}participants`, uid), { pattern, appOrder, taskOrder: TEN_TASKS })
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

  it("adds 1 to an existing cell's counter", async () => {
    await seedCounts({ U1U3U5B: 2, U2U4U6B: 1 })
    const d = await enroll('alice')
    await assertSucceeds(assignBatch(d, 'alice', 'U2U4U6', { U1U3U5B: 2, U2U4U6B: 1 }).commit())
  })

  it('starts a new counter for a cell not used yet', async () => {
    await seedCounts({ U1U3U5B: 2 })
    const d = await enroll('alice')
    await assertSucceeds(assignBatch(d, 'alice', 'U4U5U6', { U1U3U5B: 2 }).commit())
  })

  it('refuses patterns that are not 3 of the 6 screens', async () => {
    for (const bad of ['U1U3', 'U1U3U5U6', 'U1U3U7', 'nudged']) {
      await env.clearFirestore()
      const d = await enroll('alice')
      await assertFails(assignBatch(d, 'alice', bad, null).commit())
    }
  })

  it('refuses setting a pattern without incrementing its counter', async () => {
    await seedCounts({ U1U3U5B: 0 })
    const d = await enroll('alice')
    await assertFails(updateDoc(doc(d, 'participants', 'alice'), { pattern: 'U1U3U5', appOrder: 'bramble_first', taskOrder: TEN_TASKS }))
  })

  it('refuses bumping a counter without assigning yourself', async () => {
    await seedCounts({ U1U3U5B: 0 })
    const d = await enroll('alice')
    await assertFails(updateDoc(doc(d, 'meta', 'assignment'), { U1U3U5B: 1 }))
  })

  it("refuses changing another cell's counter in the same write", async () => {
    await seedCounts({ U1U3U5B: 1, U2U4U6B: 1 })
    const d = await enroll('alice')
    const batch = writeBatch(d)
    batch.set(doc(d, 'meta', 'assignment'), { U1U3U5B: 2, U2U4U6B: 0 }, { merge: true })
    batch.update(doc(d, 'participants', 'alice'), { pattern: 'U1U3U5', appOrder: 'bramble_first', taskOrder: TEN_TASKS })
    await assertFails(batch.commit())
  })

  it('refuses incrementing by more than 1', async () => {
    await seedCounts({ U1U3U5B: 0 })
    const d = await enroll('alice')
    const batch = writeBatch(d)
    batch.set(doc(d, 'meta', 'assignment'), { U1U3U5B: 2 }, { merge: true })
    batch.update(doc(d, 'participants', 'alice'), { pattern: 'U1U3U5', appOrder: 'bramble_first', taskOrder: TEN_TASKS })
    await assertFails(batch.commit())
  })

  it('refuses a second assignment', async () => {
    const d = await enroll('alice')
    await assertSucceeds(assignBatch(d, 'alice', 'U1U3U5', null).commit())
    await assertFails(assignBatch(d, 'alice', 'U2U4U6', { U1U3U5B: 1 }).commit())
  })

  it('assigns Stride-first cells, and refuses a missing or unknown app order', async () => {
    const d = await enroll('alice')
    await assertSucceeds(assignBatch(d, 'alice', 'U1U3U5', null, '', 'stride_first').commit())
    for (const bad of ['first', 'stride']) {
      await env.clearFirestore()
      const d2 = await enroll('bob')
      await assertFails(assignBatch(d2, 'bob', 'U1U3U5', null, '', bad).commit())
    }
  })

  it('refuses a counter for the wrong app order', async () => {
    const d = await enroll('alice')
    const batch = writeBatch(d)
    batch.set(doc(d, 'meta', 'assignment'), { U1U3U5S: 1 })
    batch.update(doc(d, 'participants', 'alice'), { pattern: 'U1U3U5', appOrder: 'bramble_first', taskOrder: TEN_TASKS })
    await assertFails(batch.commit())
  })

  it('refuses a malformed task order (it must list all 10 tasks)', async () => {
    for (const taskOrder of [[1, 2], [1, 2, 3, 4, 5, 6]]) {
      await env.clearFirestore()
      const d = await enroll('alice')
      const batch = writeBatch(d)
      batch.set(doc(d, 'meta', 'assignment'), { U1U3U5B: 1 })
      batch.update(doc(d, 'participants', 'alice'), { pattern: 'U1U3U5', appOrder: 'bramble_first', taskOrder })
      await assertFails(batch.commit())
    }
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

describe('Part 2 and norming records', () => {
  function part2Record(pid: string, variant: 'part2' | 'norming') {
    return {
      prolificPid: pid, studyId: 's', sessionId: 'x', variant, appVersion: '0.16.0', stage: 'device', withdrawn: false,
      sequence: null, answers: {}, createdAt: serverTimestamp(),
    }
  }

  async function enrollPart2(uid: string, col: string, pid = `pid_${uid}`) {
    const d = db(uid)
    await setDoc(doc(d, `${col}_pids`, pid), { uid, createdAt: serverTimestamp() })
    await setDoc(doc(d, col, uid), part2Record(pid, col.endsWith('norming') ? 'norming' : 'part2'))
    return d
  }

  it('lets a participant create, read and update their own Part 2 or norming record', async () => {
    for (const col of ['part2', 'pilot_part2', 'norming', 'pilot_norming']) {
      const d = await enrollPart2(`u_${col}`, col)
      await assertSucceeds(updateDoc(doc(d, col, `u_${col}`), { stage: 'items', answers: { 'store_location:A': { verdict: 'allow' } } }))
      await assertSucceeds(getDoc(doc(d, col, `u_${col}`)))
      await assertSucceeds(addDoc(collection(d, col, `u_${col}`, 'events'), { type: 'item', clientT: 1, t: serverTimestamp() }))
    }
  })

  it('refuses a record without a claim, with the wrong variant, or under another uid', async () => {
    const d = db('a')
    await assertFails(setDoc(doc(d, 'part2', 'a'), part2Record('pid_a', 'part2')))
    await setDoc(doc(d, 'part2_pids', 'pid_a'), { uid: 'a', createdAt: serverTimestamp() })
    await assertFails(setDoc(doc(d, 'part2', 'a'), part2Record('pid_a', 'norming')))
    await assertFails(setDoc(doc(d, 'part2', 'b'), part2Record('pid_a', 'part2')))
    await assertSucceeds(setDoc(doc(d, 'part2', 'a'), part2Record('pid_a', 'part2')))
  })

  it('locks identity fields, hides records from others, and refuses deletes', async () => {
    const d = await enrollPart2('a', 'part2')
    await assertFails(updateDoc(doc(d, 'part2', 'a'), { prolificPid: 'other' }))
    await assertFails(updateDoc(doc(d, 'part2', 'a'), { variant: 'norming' }))
    await assertFails(updateDoc(doc(d, 'part2', 'a'), { withdrawn: true }))
    await assertFails(getDoc(doc(db('b'), 'part2', 'a')))
    await assertFails(deleteDoc(doc(d, 'part2', 'a')))
  })

  it('lets only one user claim a Prolific ID for Part 2, separately from Part 1', async () => {
    await assertSucceeds(setDoc(doc(db('a'), 'part2_pids', 'P'), { uid: 'a', createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(db('b'), 'part2_pids', 'P'), { uid: 'b', createdAt: serverTimestamp() }))
    // The same person has a Part 1 record on their phone under a different uid.
    await assertSucceeds(setDoc(doc(db('phone'), 'pids', 'P'), { uid: 'phone', createdAt: serverTimestamp() }))
  })

  it('opens no other collection through the wildcard', async () => {
    const d = db('a')
    await assertFails(setDoc(doc(d, 'anything', 'a'), part2Record('pid_a', 'part2')))
    await assertFails(setDoc(doc(d, 'anything_pids', 'x'), { uid: 'a', createdAt: serverTimestamp() }))
  })
})
