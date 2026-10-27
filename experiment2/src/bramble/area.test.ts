// The participant's-area store finder, with the default neighborhood's own map tiles (public/map)
// standing in for the US map file: the same Protomaps tiles, just a smaller area.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
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
})
