// The simulated location for the store finder: a residential grid in an ordinary mid-size
// US city (Clintonville, Columbus, Ohio). The same for every participant; nothing here comes
// from their phone. Positions are [longitude, latitude].

export const YOU_ARE_HERE_LNGLAT: [number, number] = [-83.0175, 40.0405]

/** Store pins, placed so the map roughly matches the distances shown in the list. */
export const STORE_LNGLAT: Record<string, [number, number]> = {
  'cedar-plaza': [-83.0215, 40.0435],
  riverside: [-83.0105, 40.0347],
  elm: [-83.0085, 40.0495],
  'north-gate': [-83.0195, 40.0605],
  'harbor-point': [-83.0435, 40.0215],
}

/** Area downloaded by `npm run build:map`: west, south, east, north. About 18 × 13 km, so the map can be dragged a good way in every direction from the starting view. */
export const MAP_BOUNDS: [number, number, number, number] = [-83.135, 39.985, -82.92, 40.1]

export const MAP_MIN_ZOOM = 11
export const MAP_MAX_ZOOM = 15

/** Radius of the "general area" circle, in meters. */
export const GENERAL_AREA_RADIUS_M = 900
