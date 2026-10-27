import { onAuthStateChanged, signInAnonymously, type Auth, type User } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
  waitForPendingWrites,
  type Firestore,
} from 'firebase/firestore'
import type { EventSink, StudyEvent } from '../log/logEvent'
import { buildTaskOrder, cellKey, pickAssignment, type CellCounts } from './randomize'
import type { Assignment, StudyStore } from './store'
import type { ParticipantDoc, EntryParams, StartResult, TimestampField } from './types'
import { newParticipant } from './types'

export interface CollectionNames {
  participants: string
  pids: string
  meta: string
}

export function collectionNames(pilot: boolean): CollectionNames {
  const prefix = pilot ? 'pilot_' : ''
  return { participants: `${prefix}participants`, pids: `${prefix}pids`, meta: `${prefix}meta` }
}

function currentUser(auth: Auth): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

function isPermissionDenied(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'permission-denied'
}

/** Assignment attempts before giving up (the participant then sees "try again"). */
const ASSIGN_ATTEMPTS = 8

/** Refusals that come from another participant's assignment landing first. */
function isContention(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code
  return code === 'permission-denied' || code === 'aborted' || code === 'failed-precondition'
}

export class FirestoreStore implements StudyStore {
  private readonly db: Firestore
  private readonly auth: Auth
  private readonly names: CollectionNames
  private uid: string | null = null
  private pending: StudyEvent[] = []
  readonly sink: EventSink

  constructor(db: Firestore, auth: Auth, names: CollectionNames) {
    this.db = db
    this.auth = auth
    this.names = names
    this.sink = { write: (event) => this.writeEvent(event) }
  }

  private participantRef() {
    if (!this.uid) throw new Error('Not started')
    return doc(this.db, this.names.participants, this.uid)
  }

  async start(params: EntryParams): Promise<StartResult> {
    // Anonymous auth persists in this browser, so a reload keeps the same uid.
    const user = (await currentUser(this.auth)) ?? (await signInAnonymously(this.auth)).user
    this.uid = user.uid
    const ref = this.participantRef()

    const existing = await getDoc(ref)
    if (existing.exists()) {
      const participant = existing.data() as ParticipantDoc
      if (participant.participantCode !== params.participantCode) return { kind: 'pid_mismatch' }
      this.flushPending()
      this.update({ resumeCount: increment(1) as unknown as number })
      return { kind: 'resumed', participant: { ...participant, resumeCount: participant.resumeCount + 1 } }
    }

    // One record per participant code: claiming a code someone else holds is refused by the rules.
    const pidRef = doc(this.db, this.names.pids, params.participantCode)
    try {
      await setDoc(pidRef, { uid: user.uid, createdAt: serverTimestamp() })
    } catch (err) {
      if (!isPermissionDenied(err)) throw err
      // Refused either because another browser holds it, or because this browser claimed it
      // and then failed to create its record. Only the owner may read it.
      try {
        const claim = await getDoc(pidRef)
        if (claim.data()?.uid !== user.uid) return { kind: 'taken' }
      } catch (readErr) {
        if (isPermissionDenied(readErr)) return { kind: 'taken' }
        throw readErr
      }
    }

    const participant = newParticipant(params)
    await setDoc(ref, { ...participant, createdAt: serverTimestamp() })
    this.flushPending()
    return { kind: 'new', participant }
  }

  update(fields: Partial<ParticipantDoc>, stamp: TimestampField[] = []): void {
    const data: Record<string, unknown> = { ...fields }
    for (const field of stamp) data[field] = serverTimestamp()
    setDoc(this.participantRef(), data, { merge: true }).catch((err) => console.error('update failed', err))
  }

  /**
   * Many people starting at once (e.g. right after invitations go out) can read the same counts and pick the
   * same cell. The rules then refuse the second write, because its counter is no longer +1, so
   * the assignment is retried with fresh counts after a short random wait.
   */
  async assign(): Promise<Assignment> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.assignOnce()
      } catch (err) {
        if (attempt >= ASSIGN_ATTEMPTS || !isContention(err)) throw err
        await new Promise((resolve) => setTimeout(resolve, (100 + Math.random() * 300) * attempt))
      }
    }
  }

  private async assignOnce(): Promise<Assignment> {
    const ref = this.participantRef()
    const metaRef = doc(this.db, this.names.meta, 'assignment')
    return runTransaction(this.db, async (tx) => {
      const participant = (await tx.get(ref)).data() as ParticipantDoc | undefined
      if (participant?.pattern && participant.appOrder && participant.taskOrder) {
        return { pattern: participant.pattern, appOrder: participant.appOrder, taskOrder: participant.taskOrder }
      }
      const meta = await tx.get(metaRef)
      const counts = (meta.exists() ? meta.data() : {}) as CellCounts
      const { pattern, appOrder } = pickAssignment(counts)
      const taskOrder = buildTaskOrder(appOrder)
      const key = cellKey(pattern, appOrder)
      // Only this cell's counter changes (the security rules check exactly that).
      tx.set(metaRef, { [key]: (counts[key] ?? 0) + 1 }, { merge: true })
      tx.update(ref, { pattern, appOrder, taskOrder })
      return { pattern, appOrder, taskOrder }
    })
  }

  private writeEvent(event: StudyEvent): void {
    if (!this.uid) {
      this.pending.push(event)
      return
    }
    addDoc(collection(this.db, this.names.participants, this.uid, 'events'), {
      ...event,
      t: serverTimestamp(),
    }).catch((err) => console.error('event write failed', err))
  }

  private flushPending(): void {
    const queued = this.pending
    this.pending = []
    for (const event of queued) this.writeEvent(event)
  }

  async flush(): Promise<void> {
    await waitForPendingWrites(this.db)
  }
}
