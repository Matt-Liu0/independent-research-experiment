// Runs the export against seeded emulator data (npm run test:rules).
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadParticipants, writeExport } from '../../scripts/export'
import { FLOWS } from '../../src/bramble/flows'

let env: RulesTestEnvironment
let outDir: string
const COLLECTION = 'pilot_participants'
const run = Date.now().toString(36)

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-bramble' })
  outDir = mkdtempSync(join(tmpdir(), 'bramble-export-'))
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore
    const t = (m: number) => Timestamp.fromDate(new Date(Date.UTC(2026, 10, 1, 12, m)))
    await setDoc(doc(db, COLLECTION, `exp_a_${run}`), {
      prolificPid: `EXPORT_A_${run}`,
      createdAt: t(0),
      pattern: 'U1U2U6',
      withdrawn: false,
      stage: 'done',
      appState: { points: 220, flows: { reward_university: 'accept' } },
    })
    await setDoc(doc(db, COLLECTION, `exp_a_${run}`, 'events', 'e1'), {
      type: 'prompt_shown', flowId: 'reward_university', defaultShown: null, clientT: 10, t: t(1),
    })
    await setDoc(doc(db, COLLECTION, `exp_a_${run}`, 'events', 'e2'), {
      type: 'settled', flowId: 'reward_university', value: 'accept', msSincePrompt: 1500, clientT: 20, t: t(2),
    })
    await setDoc(doc(db, COLLECTION, `exp_w_${run}`), {
      prolificPid: `EXPORT_W_${run}`, createdAt: t(3), pattern: 'U3U4U5', withdrawn: true, stage: 'done',
    })
  })
  if (!getApps().length) initializeApp({ projectId: 'demo-bramble' })
})

afterAll(async () => {
  await env.cleanup()
  for (const app of getApps()) await deleteApp(app)
  rmSync(outDir, { recursive: true, force: true })
})

describe('export from Firestore', () => {
  it('writes the CSVs and the flow codebook, without withdrawn participants', async () => {
    const raw = (await loadParticipants(getFirestore(), COLLECTION)).filter((p) => p.uid.endsWith(run))
    expect(raw).toHaveLength(2)
    writeExport(outDir, COLLECTION, raw)

    const participants = readFileSync(join(outDir, 'participants.csv'), 'utf8')
    const flows = readFileSync(join(outDir, 'flows.csv'), 'utf8')
    const events = readFileSync(join(outDir, 'events.csv'), 'utf8')
    const idMap = readFileSync(join(outDir, 'id-map.csv'), 'utf8')

    expect(participants.trim().split('\n')).toHaveLength(2)
    expect(participants).toContain('PL001')
    expect(participants).toContain('0.22')
    expect(participants).not.toContain('EXPORT_')
    const [header, ...rows] = flows.trim().split('\n').map((line) => line.split(','))
    const uni = Object.fromEntries(header.map((h, i) => [h, rows.find((r) => r.includes('reward_university'))![i]]))
    expect(uni).toMatchObject({
      studyCode: 'PL001',
      unit: 'U6',
      friction: 'nudged',
      consentForm: 'nudged_choice',
      ci_recipient: 'university_traffic_lab',
      status: 'chosen',
      firstChoice: 'accept',
      finalValue: 'accept',
    })
    expect(readFileSync(join(outDir, 'flow-codebook.csv'), 'utf8').trim().split('\n')).toHaveLength(FLOWS.length + 1)
    expect(events).toContain('2026-11-01T12:02:00.000Z')
    expect(idMap).toContain(`EXPORT_A_${run}`)
    expect(idMap).not.toContain(`EXPORT_W_${run}`)
  })
})
