// The US street map is split into regional PMTiles files (scripts/us-map/build.ts), small
// enough to download in one go. Neighbors overlap by at least 0.3° (about 30 km), so the
// stores and map around any location fit inside one file.

/** id → west, south, east, north. */
export const MAP_REGIONS: Record<string, [number, number, number, number]> = {
  pacific: [-125.0, 32.3, -114.0, 49.5],
  mountain: [-114.3, 31.0, -102.0, 49.5],
  plains: [-102.3, 25.8, -93.5, 49.5],
  midwest: [-93.8, 36.0, -84.5, 49.5],
  south: [-93.8, 24.3, -84.5, 36.3],
  southeast: [-84.8, 24.3, -75.0, 37.0],
  northeast: [-84.8, 36.7, -66.8, 47.6],
  alaska: [-170.0, 51.0, -129.9, 71.5],
  hawaii: [-160.5, 18.8, -154.6, 22.4],
  puerto_rico: [-67.4, 17.8, -65.2, 18.6],
}

/** The region whose edges are farthest from the point (so the area around it is inside), or null outside them all. */
export function regionFor([lng, lat]: [number, number]): string | null {
  let best: string | null = null
  let bestMargin = 0
  for (const [id, [w, s, e, n]] of Object.entries(MAP_REGIONS)) {
    const margin = Math.min(lng - w, e - lng, lat - s, n - lat)
    if (margin > bestMargin) {
      best = id
      bestMargin = margin
    }
  }
  return best
}
