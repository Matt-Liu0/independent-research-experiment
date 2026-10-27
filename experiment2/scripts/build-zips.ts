// One-time download of the ZIP code → location table, so the welcome page can place the store
// finder in the participant's area without sending their ZIP anywhere: the phone fetches only the
// small file for the ZIP's first three digits from our own site.
//
//   npm run build:zips
//
// Source: US Census Bureau Gazetteer, ZIP Code Tabulation Areas (public domain). Each ZIP gets its
// internal point (INTPTLAT, INTPTLONG), rounded to 4 decimals (about 10 m).
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const YEAR = process.argv[2] ?? '2024'
const SOURCE = `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/${YEAR}_Gazetteer/${YEAR}_Gaz_zcta_national.zip`
const OUT = 'public/map/zips'

async function main() {
  const res = await fetch(SOURCE)
  if (!res.ok) throw new Error(`${SOURCE}: ${res.status}`)
  const work = mkdtempSync(join(tmpdir(), 'zcta-'))
  try {
    const archive = join(work, 'zcta.zip')
    writeFileSync(archive, new Uint8Array(await res.arrayBuffer()))
    execFileSync('unzip', ['-q', archive, '-d', work])
    const txt = readdirSync(work).find((f) => f.endsWith('.txt'))
    if (!txt) throw new Error('No .txt in the Census download')
    const [header, ...rows] = readFileSync(join(work, txt), 'utf8').trim().split('\n')
    const cols = header.split('\t').map((c) => c.trim())
    const [iZip, iLat, iLng] = ['GEOID', 'INTPTLAT', 'INTPTLONG'].map((c) => cols.indexOf(c))
    if (iZip < 0 || iLat < 0 || iLng < 0) throw new Error(`Unexpected columns: ${cols.join(', ')}`)

    const byPrefix = new Map<string, Record<string, [number, number]>>()
    for (const row of rows) {
      const f = row.split('\t').map((c) => c.trim())
      const zip = f[iZip]
      if (!/^\d{5}$/.test(zip)) continue
      const point: [number, number] = [Number(Number(f[iLng]).toFixed(4)), Number(Number(f[iLat]).toFixed(4))]
      const prefix = zip.slice(0, 3)
      byPrefix.set(prefix, { ...byPrefix.get(prefix), [zip]: point })
    }

    rmSync(OUT, { recursive: true, force: true })
    mkdirSync(OUT, { recursive: true })
    for (const [prefix, table] of byPrefix) writeFileSync(join(OUT, `${prefix}.json`), JSON.stringify(table))
    writeFileSync(
      join(OUT, 'ATTRIBUTION.txt'),
      `ZIP Code Tabulation Area internal points from the US Census Bureau ${YEAR} Gazetteer (public domain): ${SOURCE}\n`,
    )
    console.log(`${rows.length} ZIPs in ${byPrefix.size} files → ${OUT}`)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
