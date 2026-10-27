// The participant's-area store finder, with the default neighborhood's own map tiles (public/map)
// standing in for the US map file: the same Protomaps tiles, just a smaller area.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { MAP_REGIONS, regionFor } from './mapRegions'
import { DEFAULT_AREA, areaFromPois, getArea, milesBetween, prepareArea, resetArea, storeById, tileOf, zipCenter, type TileReader } from './area'

const TILES = join(process.cwd(), 'public/map/tiles')
const readLocal: TileReader = async (z, x, y) => {
  const file = join(TILES, String(z), String(x), `${y}.mvt`)
  if (!existsSync(file)) return undefined
  const b = readFileSync(file)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}
/** Clintonville, Columbus (inside the downloaded tiles). */
const ZIP = '43202'
const fakeZips = (async (url: string) =>
  url === '/map/zips/432.json' ? new Response(JSON.stringify({ [ZIP]: [-83.013, 40.0216] })) : new Response('', { status: 404 })) as typeof fetch

afterEach(() => resetArea())

describe('participant area', () => {
  it('looks a ZIP up in our own table only', async () => {
    expect(await zipCenter(ZIP, fakeZips)).toEqual([-83.013, 40.0216])
    expect(await zipCenter('99999', fakeZips)).toBeNull()
    expect(await zipCenter('abc', fakeZips)).toBeNull()
  })

  it('lists the real supermarkets nearest the ZIP, with the default oat-milk pattern', async () => {
    expect(await prepareArea(ZIP, { readTile: readLocal, fetcher: fakeZips })).toBe('participant')
    const area = getArea()
    expect(area.kind).toBe('participant')
    expect(area.nearby.map((s) => s.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5'])
    // Real names from OpenStreetMap, nearest first.
    expect(area.nearby.every((s) => s.name && !s.name.startsWith('Bramble Market'))).toBe(true)
    const miles = area.nearby.map((s) => s.miles!)
    expect([...miles].sort((a, b) => a - b)).toEqual(miles)
    expect(area.nearby.map((s) => s.hasOatMilk)).toEqual([false, false, true, false, true])
    // The ZIP list: up to 24, A to Z, and the nearby stores are in it with the same stock.
    expect(area.zipList.length).toBe(24)
    expect(area.zipList.map((s) => s.name)).toEqual([...area.zipList.map((s) => s.name)].sort((a, b) => a.localeCompare(b)))
    for (const s of area.nearby) expect(area.zipList.find((z) => z.id === s.id)?.hasOatMilk).toBe(s.hasOatMilk)
    // Every nearby store has a pin, and the map can be dragged around all of them.
    for (const s of area.nearby) {
      const [lng, lat] = area.lnglat[s.id]
      expect(lng).toBeGreaterThan(area.bounds[0])
      expect(lat).toBeLessThan(area.bounds[3])
    }
    expect(storeById('r3')?.hasOatMilk).toBe(true)
    // Drawn from the regional map file that covers Columbus.
    expect(area.archive).toMatch(/\/northeast\.pmtiles$/)
  })

  it('keeps the default neighborhood when the ZIP is unknown, the map file is missing, or too few stores are found', async () => {
    expect(await prepareArea('99999', { readTile: readLocal, fetcher: fakeZips })).toBe('default')
    expect(await prepareArea(ZIP, { fetcher: fakeZips })).toBe('default')
    expect(await prepareArea(ZIP, { readTile: async () => undefined, fetcher: fakeZips })).toBe('default')
    expect(getArea()).toBe(DEFAULT_AREA)
    expect(areaFromPois([-83, 40], [{ name: 'Only one', lnglat: [-83.001, 40] }])).toBeNull()
  })

  it('gives up after the time limit', async () => {
    const slow: TileReader = () => new Promise(() => {})
    expect(await prepareArea(ZIP, { readTile: slow, fetcher: fakeZips, timeoutMs: 20 })).toBe('default')
  })

  it('removes duplicates of the same store', () => {
    const pois = Array.from({ length: 6 }, (_, i) => ({ name: `Store ${i}`, lnglat: [-83 + i * 0.01, 40] as [number, number] }))
    const area = areaFromPois([-83, 40], [...pois, { name: 'Store 0', lnglat: [-83.0005, 40] }])!
    expect(area.zipList.filter((s) => s.name === 'Store 0')).toHaveLength(1)
  })

  it('measures distance and tiles correctly', () => {
    expect(milesBetween([-83, 40], [-83, 41])).toBeCloseTo(69.1, 0)
    expect(tileOf([-83.0175, 40.0405], 14)).toEqual([4413, 6200])
    expect(existsSync(join(TILES, "14/4413/6200.mvt"))).toBe(true)
  })

  it('picks the regional map file that covers each place, with room around it', () => {
    expect(regionFor([-83.013, 40.0216])).toBe('northeast') // Columbus
    expect(regionFor([-75.53, 42.83])).toBe('northeast') // Hamilton, NY
    expect(regionFor([-118.24, 34.05])).toBe('pacific') // Los Angeles
    expect(regionFor([-87.63, 41.88])).toBe('midwest') // Chicago
    expect(regionFor([-95.37, 29.76])).toBe('plains') // Houston
    expect(regionFor([-80.19, 25.76])).toBe('southeast') // Miami
    expect(regionFor([-149.9, 61.22])).toBe('alaska')
    expect(regionFor([0, 51.5])).toBeNull() // London
    // Every state capital-ish point in the lower 48 is at least 0.15° inside its file.
    for (const p of [[-104.99, 39.74], [-112.07, 33.45], [-90.07, 29.95], [-84.39, 33.75], [-71.06, 42.36], [-93.27, 44.98], [-122.33, 47.61], [-97.74, 30.27], [-86.78, 36.16], [-77.04, 38.91]] as [number, number][]) {
      const [w, s2, e, n] = MAP_REGIONS[regionFor(p)!]
      expect(Math.min(p[0] - w, e - p[0], p[1] - s2, n - p[1])).toBeGreaterThan(0.15)
    }
  })

  it("uses a small town's few stores, however far, counting a store found on two tiles once", () => {
    const center: [number, number] = [-75.5464, 42.8208]
    // One store in town, the rest 5–10 miles out (as around Hamilton, NY); one sits on two tiles.
    const stores: [string, number, number][] = [['Town Market', 0.02, 0], ['Farm Shop', 0.09, 0], ['Country Store', 0.14, 0], ['Country Store', 0.1401, 0], ['Valley Grocer', 0, 0.11], ['Hill Market', -0.18, 0]]
    const area = areaFromPois(center, stores.map(([name, dx, dy]) => ({ name, lnglat: [center[0] + dx, center[1] + dy] as [number, number] })))!
    expect(area.nearby.map((s) => s.name)).toEqual(['Town Market', 'Farm Shop', 'Country Store', 'Valley Grocer', 'Hill Market'])
    expect(area.nearby[4].miles).toBeGreaterThan(8)
    expect(area.zipList).toHaveLength(5)
  })
})
