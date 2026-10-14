// Exports study data to CSV.
//
//   npm run export                 # study data (Part 1, Part 2 and the norming survey)
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
import { buildExport, flowCodebook, prolificBonusLines, toCsv, type ExportResult, type RawParticipant } from './transform'
import { batteryCodebook, buildPart2Export } from './transformPart2'

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
  // Links study codes back to Prolific IDs (for paying bonuses). Keep it off shared drives.
  writeFileSync(join(outDir, 'id-map.csv'), toCsv(result.idMap))
  // Bonuses to paste into Prolific (contains Prolific IDs, so it's as private as id-map.csv).
  writeFileSync(join(outDir, 'prolific-bonuses.txt'), prolificBonusLines(result) + '\n')
  return result
}

/**
 * Part 2 and the norming survey. verdicts.csv is the main Part 2 table: one row per person ×
 * battery item, with the stated verdict, its repeat, and the same person's verdict on the site.
 */
export function writePart2Export(
  outDir: string,
  pilot: boolean,
  part2: RawParticipant[],
  norming: RawParticipant[],
  part1: ExportResult | null,
) {
  const p2 = buildPart2Export(part2, 'part2', pilot, part1)
  const nm = buildPart2Export(norming, 'norming', pilot, null)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'part2-participants.csv'), toCsv(p2.participants))
  writeFileSync(join(outDir, 'verdicts.csv'), toCsv(p2.verdicts))
  writeFileSync(join(outDir, 'norming-participants.csv'), toCsv(nm.participants))
  writeFileSync(join(outDir, 'norming-verdicts.csv'), toCsv(nm.verdicts))
  writeFileSync(join(outDir, 'battery-codebook.csv'), toCsv(batteryCodebook()))
  // Private, like id-map.csv.
  writeFileSync(join(outDir, 'part2-id-map.csv'), toCsv([...p2.idMap, ...nm.idMap]))
  return { part2: p2, norming: nm }
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
  const raw = await loadParticipants(getFirestore(), collection)
  const result = writeExport(outDir, collection, raw)
  const withdrawn = raw.length - result.participants.length
  console.log(
    `Exported ${result.participants.length} participants (${withdrawn} withdrawn, left out), ` +
      `${result.events.length} events, ${result.flows.length} flow rows → ${outDir}`,
  )
  const prefix = pilot ? 'pilot_' : ''
  const part2 = await loadParticipants(getFirestore(), `${prefix}part2`)
  const norming = await loadParticipants(getFirestore(), `${prefix}norming`)
  const p2 = writePart2Export(outDir, pilot, part2, norming, result)
  console.log(`Exported Part 2 for ${p2.part2.participants.length} and the norming survey for ${p2.norming.participants.length} → ${outDir}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
