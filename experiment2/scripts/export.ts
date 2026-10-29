// Exports study data to CSV.
//
//   npm run export                 # study data (Part 1 and Part 2)
//   npm run export -- --pilot      # pilot data instead
//   npm run export -- --out dir    # output folder (default exports/<date>)
//
// Needs admin access: set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file
// (kept out of git), or FIRESTORE_EMULATOR_HOST to export from the emulator.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { bonusPayments, buildExport, flowCodebook, toCsv, type ExportResult, type RawParticipant } from './transform'
import { batteryCodebook, buildPart2Export, buildTranscripts, type RawInterview } from './transformPart2'

export async function loadParticipants(db: Firestore, collection: string): Promise<RawParticipant[]> {
  const snapshot = await db.collection(collection).get()
  return Promise.all(
    snapshot.docs.map(async (doc) => {
      const events = await doc.ref.collection('events').get()
      return { uid: doc.id, data: doc.data(), events: events.docs.map((e) => ({ id: e.id, ...e.data() })) }
    }),
  )
}

export function writeExport(outDir: string, collection: string, raw: RawParticipant[]) {
  const result = buildExport(collection, raw)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'participants.csv'), toCsv(result.participants))
  writeFileSync(join(outDir, 'events.csv'), toCsv(result.events))
  writeFileSync(join(outDir, 'flows.csv'), toCsv(result.flows))
  // GKC-CI description of every flow in both apps, for matching with Part 2 questionnaire items.
  writeFileSync(join(outDir, 'flow-codebook.csv'), toCsv(flowCodebook()))
  // Links study codes back to participant codes (for paying bonuses). Keep it off shared drives.
  writeFileSync(join(outDir, 'id-map.csv'), toCsv(result.idMap))
  // Gift-card bonuses by participant code (as private as id-map.csv).
  writeFileSync(join(outDir, 'bonus-payments.csv'), toCsv(bonusPayments(result)))
  return result
}

/** Each Part 2 participant's instructions text (D0), by uid, for transcripts.jsonl. */
function instructionsOf(part2: RawParticipant[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const p of part2) {
    const w = p.data.writtenInstructions as { text?: unknown } | null | undefined
    if (typeof w?.text === 'string') out.set(p.uid, w.text)
  }
  return out
}

/**
 * Part 2. verdicts.csv is the main Part 2 table: one row per person ×
 * battery item, with the stated verdict, its repeat, and the same person's verdict on the site.
 */
export function writePart2Export(
  outDir: string,
  pilot: boolean,
  part2: RawParticipant[],
  part1: ExportResult | null,
  interviews: RawInterview[] = [],
) {
  const p2 = buildPart2Export(part2, pilot, part1)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'part2-participants.csv'), toCsv(p2.participants))
  writeFileSync(join(outDir, 'verdicts.csv'), toCsv(p2.verdicts))
  writeFileSync(join(outDir, 'battery-codebook.csv'), toCsv(batteryCodebook()))
  // The interview transcripts D (one JSON object per line). Free text: participants were asked
  // not to type identifying details, but read them before sharing.
  writeFileSync(join(outDir, 'transcripts.jsonl'), buildTranscripts(interviews, p2.idMap, instructionsOf(part2)) + '\n')
  // Private, like id-map.csv.
  writeFileSync(join(outDir, 'part2-id-map.csv'), toCsv(p2.idMap))
  return p2
}

async function main() {
  const args = process.argv.slice(2)
  const pilot = args.includes('--pilot')
  const outIndex = args.indexOf('--out')
  const date = new Date().toISOString().slice(0, 10)
  const outDir = outIndex >= 0 ? args[outIndex + 1] : join('exports', `${date}${pilot ? '-pilot' : ''}`)
  const projectId = process.env.GCLOUD_PROJECT ?? process.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-bramble'
  const collection = pilot ? 'pilot_participants' : 'participants'

  initializeApp({ projectId })
  const prefix = pilot ? 'pilot_' : ''
  const part2 = await loadParticipants(getFirestore(), `${prefix}part2`)
  // Asked on the Part 2 debrief to have their data removed: left out of Part 1 too.
  const removePids = new Set(part2.filter((p) => p.data.withdrawRequested === true).map((p) => String(p.data.participantCode)))
  const raw = (await loadParticipants(getFirestore(), collection)).filter((p) => !removePids.has(String(p.data.participantCode)))
  const result = writeExport(outDir, collection, raw)
  const withdrawn = raw.length - result.participants.length
  console.log(
    `Exported ${result.participants.length} participants (${withdrawn} withdrawn and ${removePids.size} who asked on the debrief, left out), ` +
      `${result.events.length} events, ${result.flows.length} flow rows → ${outDir}`,
  )
  const interviews = (await getFirestore().collection(`${prefix}part2_interviews`).get()).docs.map((d) => ({ uid: d.id, data: d.data() }))
  const p2 = writePart2Export(outDir, pilot, part2, result, interviews)
  console.log(
    `Exported Part 2 for ${p2.participants.length} (${interviews.length} interviews) → ${outDir}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
