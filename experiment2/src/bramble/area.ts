// Where the store finder is: the participant's own area (from the ZIP code they gave on the
// welcome page), or the default neighborhood (Clintonville, Columbus) when there is no ZIP, it
// isn't found, or the US map isn't set up. Agents and tests always get the default.
//
// The participant's area uses real supermarkets at their real places, read from the same map
// files the phone draws the map from (OpenStreetMap via Protomaps, regional files in our own
// Cloud Storage bucket), so no outside service ever sees the ZIP. The ZIP, the area and the store names stay
// on the phone (localStorage); the participant record only gets store IDs like "r3" (the third
// nearest), which say nothing about where the person is.
import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'
import { NEARBY_STORES, ZIP_STORES, type Store } from './data'
import { MAP_BOUNDS, STORE_LNGLAT, YOU_ARE_HERE_LNGLAT } from './mapConfig'
import { regionFor } from './mapRegions'

export type LngLat = [number, number]

export interface Area {
  /** participant: their ZIP's area. default: the built-in neighborhood. */
  kind: 'participant' | 'default'
  center: LngLat
  /** How far the map can be dragged: west, south, east, north. */
  bounds: [number, number, number, number]
  /** Stores near the location, nearest first (location allowed). */
  nearby: Store[]
  /** Stores after a ZIP search, A to Z (location refused). */
  zipList: Store[]
  /** Map position of every store with a pin. */
  lnglat: Record<string, LngLat>
  /** The regional map file the participant's area is drawn from. */
  archive?: string
}

export const DEFAULT_AREA: Area = {
  kind: 'default',
  center: YOU_ARE_HERE_LNGLAT,
  bounds: MAP_BOUNDS,
  nearby: NEARBY_STORES,
  zipList: ZIP_STORES,
  lnglat: STORE_LNGLAT,
}

/** Where the regional map files are (PMTiles), e.g. https://storage.googleapis.com/<bucket>. Unset: default area only. */
export const MAP_BASE_URL: string = (import.meta.env.VITE_MAP_BASE_URL ?? '').replace(/\/$/, '')

/** Zoom of the tiles read for supermarkets (they are all present from zoom 14). */
const POI_ZOOM = 14
/** Rings of tiles searched around the location: 1 → 3 × 3 tiles, 3 → 7 × 7 (about ±6 km). */
const MAX_RING = 3
/** Stores in the ZIP list, as in the default (24, A to Z). */
const POOL_SIZE = 24
/** Like the default: the 3rd and 5th nearest have oat milk (the two nearest don't), and one more further away. */
const OAT_MILK_RANKS = new Set([2, 4, 11])
const HOURS = ['Open until 9 PM', 'Open until 10 PM', 'Open until 10 PM', 'Open until 9 PM', 'Open until 11 PM']
const STORAGE_KEY = 'study.area'

let current: Area = restore() ?? DEFAULT_AREA

export function getArea(): Area {
  return current
}

/** Tests and agent episodes: back to the default neighborhood. */
export function resetArea(): void {
  current = DEFAULT_AREA
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: nothing saved anyway.
  }
}

function restore(): Area | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Area) : null
  } catch {
    return null
  }
}

function save(area: Area): void {
  current = area
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(area))
  } catch {
    // Private mode: the area lasts for this visit only.
  }
}

// ---------------------------------------------------------------------------------------------
// Geometry

export function milesBetween([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const r = Math.PI / 180
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(a))
}

export function tileOf([lng, lat]: LngLat, z: number): [number, number] {
  const n = 2 ** z
  const r = (lat * Math.PI) / 180
  return [Math.floor(((lng + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)]
}

function tilePointToLngLat(z: number, x: number, y: number, px: number, py: number, extent: number): LngLat {
  const n = 2 ** z
  const lng = ((x + px / extent) / n) * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + py / extent)) / n))) * 180) / Math.PI
  return [lng, lat]
}

// ---------------------------------------------------------------------------------------------
// Supermarkets from map tiles

export interface Poi {
  name: string
  lnglat: LngLat
}

/** Reads a tile's (gzip-free) bytes; undefined when the archive has no tile there. */
export type TileReader = (z: number, x: number, y: number) => Promise<ArrayBuffer | undefined>

/** Named supermarkets and grocery stores in one vector tile. */
export function poisInTile(bytes: ArrayBuffer, z: number, x: number, y: number): Poi[] {
  // vector-tile reads protobuf through pbf's reader interface.
  const tile = new VectorTile(new PbfReader(new Uint8Array(bytes)) as never)
  const layer = tile.layers.pois
  if (!layer) return []
  const out: Poi[] = []
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i)
    const { kind, name } = f.properties
    if ((kind !== 'supermarket' && kind !== 'grocery') || typeof name !== 'string' || !name.trim()) continue
    const [[p]] = f.loadGeometry()
    if (!p) continue
    out.push({ name: name.trim(), lnglat: tilePointToLngLat(z, x, y, p.x, p.y, f.extent) })
  }
  return out
}

/** Supermarkets around a point, searching outward ring by ring until there are enough. */
export async function findPois(center: LngLat, readTile: TileReader): Promise<Poi[]> {
  const [cx, cy] = tileOf(center, POI_ZOOM)
  const found: Poi[] = []
  for (let ring = 0; ring <= MAX_RING; ring++) {
    const tiles: [number, number][] = []
    for (let dx = -ring; dx <= ring; dx++)
      for (let dy = -ring; dy <= ring; dy++) if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) tiles.push([cx + dx, cy + dy])
    const results = await Promise.all(
      tiles.map(async ([x, y]) => {
        const bytes = await readTile(POI_ZOOM, x, y)
        return bytes ? poisInTile(bytes, POI_ZOOM, x, y) : []
      }),
    )
    found.push(...results.flat())
    // Everything within the searched square is found once a full ring is in; stop when there are enough.
    if (ring >= 1 && found.length >= POOL_SIZE) break
  }
  return found
}

/** Real stores as the app's stores: nearest first, duplicates (same name within 150 m) removed. */
export function areaFromPois(center: LngLat, pois: Poi[]): Area | null {
  const sorted = pois
    .map((p) => ({ ...p, miles: milesBetween(center, p.lnglat) }))
    .sort((a, b) => a.miles - b.miles)
  const unique: typeof sorted = []
  for (const p of sorted) {
    if (unique.some((u) => u.name === p.name && milesBetween(u.lnglat, p.lnglat) < 0.1)) continue
    unique.push(p)
    if (unique.length === POOL_SIZE) break
  }
  // Too few real stores nearby (rural areas): use the default neighborhood rather than a thin list.
  if (unique.length < NEARBY_STORES.length) return null

  const stores: (Store & { lnglat: LngLat })[] = unique.map((p, rank) => ({
    id: `r${rank + 1}`,
    name: p.name,
    hours: HOURS[rank % HOURS.length],
    hasOatMilk: OAT_MILK_RANKS.has(rank),
    miles: Math.round(p.miles * 10) / 10,
    lnglat: p.lnglat,
  }))
  const nearby = stores.slice(0, NEARBY_STORES.length)
  const lngs = [center[0], ...stores.map((s) => s.lnglat[0])]
  const lats = [center[1], ...stores.map((s) => s.lnglat[1])]
  const pad = 0.03
  return {
    kind: 'participant',
    center,
    bounds: [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad],
    nearby: nearby.map(({ lnglat: _, ...s }) => s),
    zipList: stores.map(({ lnglat: _, miles: __, ...s }) => s).sort((a, b) => a.name.localeCompare(b.name)),
    lnglat: Object.fromEntries(nearby.map((s) => [s.id, s.lnglat])),
  }
}

// ---------------------------------------------------------------------------------------------
// ZIP code → location

/** The ZIP's center (Census ZCTA internal point), from our own copy (public/map/zips, npm run build:zips). */
export async function zipCenter(zip: string, fetcher: typeof fetch = fetch): Promise<LngLat | null> {
  if (!/^\d{5}$/.test(zip)) return null
  try {
    const res = await fetcher(`/map/zips/${zip.slice(0, 3)}.json`)
    if (!res.ok) return null
    const table = (await res.json()) as Record<string, LngLat>
    return table[zip] ?? null
  } catch {
    return null
  }
}

async function archiveReader(url: string): Promise<TileReader> {
  const { PMTiles } = await import('pmtiles')
  const archive = new PMTiles(url)
  return async (z, x, y) => (await archive.getZxy(z, x, y))?.data
}

/**
 * Sets up the participant's area from their ZIP. Resolves to the area used ('participant' or
 * 'default'); never throws, and gives up after `timeoutMs` so the session can go on.
 */
export async function prepareArea(
  zip: string,
  { timeoutMs = 10_000, readTile, fetcher }: { timeoutMs?: number; readTile?: TileReader; fetcher?: typeof fetch } = {},
): Promise<Area['kind']> {
  if (!readTile && !MAP_BASE_URL) return 'default'
  const work = (async () => {
    const center = await zipCenter(zip, fetcher)
    if (!center) return null
    const region = regionFor(center)
    if (!region) return null
    const archive = `${MAP_BASE_URL}/${region}.pmtiles`
    const reader = readTile ?? (await archiveReader(archive))
    const area = areaFromPois(center, await findPois(center, reader))
    return area && { ...area, archive }
  })().catch(() => null)
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
  const area = await Promise.race([work, timeout])
  if (!area) return 'default'
  save(area)
  return 'participant'
}

/** A store by ID, in the current area or the default one (a record from before a reload, or a test). */
export function storeById(id: string | null): Store | undefined {
  if (!id) return undefined
  return [...current.nearby, ...current.zipList, ...NEARBY_STORES, ...ZIP_STORES].find((s) => s.id === id)
}
