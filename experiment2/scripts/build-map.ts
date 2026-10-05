// One-time download of the store-finder map, so participants' phones never contact a map
// provider: every tile and font is served from our own site (public/map/).
//
//   npm run build:map
//
// Reads only the tiles covering MAP_BOUNDS from a Protomaps OpenStreetMap build, and writes
// them as plain vector tiles ({z}/{x}/{y}.mvt) so no special server support is needed.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { FetchSource, PMTiles } from 'pmtiles'
import { MAP_BOUNDS, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from '../src/bramble/mapConfig'

const BUILD = process.argv[2] ?? '20261003'
const SOURCE = `https://build.protomaps.com/${BUILD}.pmtiles`
const FONTS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic']
const FONT_RANGES = ['0-255', '256-511', '8192-8447']
const OUT = 'public/map'

function tileRange(z: number) {
  const [west, south, east, north] = MAP_BOUNDS
  const n = 2 ** z
  const x = (lng: number) => Math.floor(((lng + 180) / 360) * n)
  const y = (lat: number) => {
    const r = (lat * Math.PI) / 180
    return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)
  }
  return { x0: x(west), x1: x(east), y0: y(north), y1: y(south) }
}

async function main() {
  rmSync(OUT, { recursive: true, force: true })
  const archive = new PMTiles(new FetchSource(SOURCE))
  let count = 0
  let bytes = 0
  for (let z = MAP_MIN_ZOOM; z <= MAP_MAX_ZOOM; z++) {
    const { x0, x1, y0, y1 } = tileRange(z)
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const tile = await archive.getZxy(z, x, y)
        if (!tile) continue
        const file = join(OUT, 'tiles', String(z), String(x), `${y}.mvt`)
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, new Uint8Array(tile.data))
        count++
        bytes += tile.data.byteLength
      }
    }
    console.log(`zoom ${z}: tiles x ${x0}–${x1}, y ${y0}–${y1}`)
  }

  for (const font of FONTS) {
    for (const range of FONT_RANGES) {
      const url = `https://raw.githubusercontent.com/protomaps/basemaps-assets/main/fonts/${encodeURIComponent(font)}/${range}.pbf`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${url}: ${res.status}`)
      const file = join(OUT, 'fonts', font, `${range}.pbf`)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, new Uint8Array(await res.arrayBuffer()))
    }
  }

  writeFileSync(
    join(OUT, 'ATTRIBUTION.txt'),
    [
      `Map data © OpenStreetMap contributors (ODbL), via Protomaps build ${BUILD}.`,
      'Fonts: Noto Sans (SIL Open Font License), from protomaps/basemaps-assets.',
      `Area: ${MAP_BOUNDS.join(', ')} (west, south, east, north), zooms ${MAP_MIN_ZOOM}–${MAP_MAX_ZOOM}.`,
      '',
    ].join('\n'),
  )
  console.log(`${count} tiles, ${(bytes / 1024 / 1024).toFixed(1)} MB → ${OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
