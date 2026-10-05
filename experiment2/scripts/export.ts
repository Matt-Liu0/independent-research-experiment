// Exports study data to CSV.
//
//   npm run export                 # study data
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
import { buildExport, flowCodebook, toCsv, type RawParticipant } from './transform'

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
  // GKC-CI description of the 12 flows, for matching with Part 2 questionnaire items.
  writeFileSync(join(outDir, 'flow-codebook.csv'), toCsv(flowCodebook()))
  // Links study codes back to Prolific IDs (for paying bonuses). Keep it off shared drives.
  writeFileSync(join(outDir, 'id-map.csv'), toCsv(result.idMap))
  return result
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
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
