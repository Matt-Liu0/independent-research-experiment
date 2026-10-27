// One-time: the US street map for participants' own areas (src/bramble/area.ts), as regional
// PMTiles files in our own Cloud Storage bucket. Phones read them with range requests, so no map
// provider ever sees where a participant is.
//
//   npm run build:us-map -- <BUILD> <BUCKET>
//   e.g. npm run build:us-map -- 20261026 privacy-say-do-study-map
//
// BUILD: a recent date from https://maps.protomaps.com/builds (old builds are deleted).
// Needs the pmtiles CLI (brew install pmtiles) and gcloud, signed in (Blaze plan).
//
// One file per region (src/bramble/mapRegions.ts), so a dropped connection only costs that
// region: each is retried up to 3 times, and regions already uploaded are skipped when you run
// it again. Zoom 0–14 only: the app zooms in further by scaling, and supermarkets are all in zoom 14.
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { MAP_REGIONS } from '../../src/bramble/mapRegions'

const [BUILD, BUCKET] = process.argv.slice(2)
if (!BUILD || !BUCKET) {
  console.error('Usage: npm run build:us-map -- <BUILD> <BUCKET>')
  process.exit(1)
}
const PROJECT = 'privacy-say-do-study'
const SOURCE = `https://build.protomaps.com/${BUILD}.pmtiles`
const THREADS = process.env.THREADS ?? '2'

function run(cmd: string, args: string[], quiet = false): boolean {
  return spawnSync(cmd, args, { stdio: quiet ? 'ignore' : 'inherit' }).status === 0
}

const uploaded = (id: string) => run('gcloud', ['storage', 'ls', `gs://${BUCKET}/${id}.pmtiles`], true)

function main() {
  if (!run('gcloud', ['storage', 'buckets', 'describe', `gs://${BUCKET}`, `--project=${PROJECT}`], true)) {
    console.log(`Creating bucket gs://${BUCKET}…`)
    if (!run('gcloud', ['storage', 'buckets', 'create', `gs://${BUCKET}`, `--project=${PROJECT}`, '--location=us-central1', '--uniform-bucket-level-access']))
      throw new Error('Could not create the bucket (is the project on the Blaze plan, and are you signed in?)')
  }

  const failed: string[] = []
  for (const [id, bbox] of Object.entries(MAP_REGIONS)) {
    if (uploaded(id)) {
      console.log(`✓ ${id}: already uploaded`)
      continue
    }
    const file = `${id}.pmtiles`
    let ok = false
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      console.log(`\n${id} (attempt ${attempt} of 3)…`)
      rmSync(file, { force: true })
      ok = run('pmtiles', ['extract', SOURCE, file, `--bbox=${bbox.join(',')}`, '--maxzoom=14', `--download-threads=${THREADS}`])
      if (!ok) spawnSync('sleep', ['20'])
    }
    if (!ok || !existsSync(file)) {
      failed.push(id)
      continue
    }
    if (!run('gcloud', ['storage', 'cp', file, `gs://${BUCKET}/${file}`])) {
      failed.push(id)
      continue
    }
    rmSync(file, { force: true })
    console.log(`✓ ${id}: uploaded`)
  }

  run('gcloud', ['storage', 'buckets', 'update', `gs://${BUCKET}`, '--cors-file=scripts/us-map/cors.json'])
  run('gcloud', ['storage', 'buckets', 'add-iam-policy-binding', `gs://${BUCKET}`, '--member=allUsers', '--role=roles/storage.objectViewer'], true)

  if (failed.length) {
    console.log(`\nNot done yet: ${failed.join(', ')}. Run the same command again; finished regions are skipped.`)
    process.exit(1)
  }
  console.log('\nAll regions done. Add this line to experiment2/.env.local, then rebuild and deploy:')
  console.log(`VITE_MAP_BASE_URL=https://storage.googleapis.com/${BUCKET}`)
  console.log(`Attribution: Map data © OpenStreetMap contributors (ODbL), via Protomaps build ${BUILD}.`)
}

main()
