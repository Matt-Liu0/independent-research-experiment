// Real street map for the store finder. Loaded lazily (MapLibre is large). The default
// neighborhood's tiles and all fonts live in public/map (npm run build:map); a participant's own
// area reads tiles from our regional US map files in Cloud Storage (bramble/area.ts). No map provider is
// ever contacted.
import { layers, namedFlavor } from '@protomaps/basemaps'
import { Map as MapLibreMap, Marker, addProtocol, setWorkerUrl, type GeoJSONSource, type LayerSpecification, type StyleSpecification } from 'maplibre-gl'
import { Protocol } from 'pmtiles'
// MapLibre parses tiles in a web worker; Vite bundles it and gives us its URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { Feature, Polygon } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import { getArea, type Area, type LngLat } from '../area'
import { GENERAL_AREA_RADIUS_M, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from '../mapConfig'

setWorkerUrl(workerUrl)
// Lets MapLibre read tiles straight from the PMTiles file (HTTP range requests).
addProtocol('pmtiles', new Protocol().tile)

/** Business pins, house numbers, highway shields and place names are left out: only Bramble's stores show. */
const HIDDEN_LAYERS = new Set(['pois', 'address_label', 'roads_oneway', 'roads_shields'])

function mapStyle(area: Area): StyleSpecification {
  const origin = window.location.origin
  const base = layers('protomaps', namedFlavor('light'), { lang: 'en' }).filter(
    (l) => !HIDDEN_LAYERS.has(l.id) && !l.id.startsWith('places_'),
  ) as LayerSpecification[]
  return {
    version: 8,
    glyphs: `${origin}/map/fonts/{fontstack}/{range}.pbf`,
    sources: {
      protomaps:
        area.kind === 'participant' && area.archive
          ? { type: 'vector', url: `pmtiles://${area.archive}`, attribution: '© OpenStreetMap' }
          : {
              type: 'vector',
              tiles: [`${origin}/map/tiles/{z}/{x}/{y}.mvt`],
              minzoom: MAP_MIN_ZOOM,
              maxzoom: MAP_MAX_ZOOM,
              bounds: area.bounds,
              attribution: '© OpenStreetMap',
            },
      area: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      ...base,
      { id: 'area-fill', type: 'fill', source: 'area', paint: { 'fill-color': '#3b7dd8', 'fill-opacity': 0.14 } },
      { id: 'area-line', type: 'line', source: 'area', paint: { 'line-color': '#3b7dd8', 'line-opacity': 0.45, 'line-width': 1.5 } },
    ],
  }
}

/** Circle of radius `meters` around a point, as a GeoJSON polygon. */
function circle([lng, lat]: [number, number], meters: number): Feature<Polygon> {
  const points: [number, number][] = []
  const dLat = meters / 111_320
  const dLng = meters / (111_320 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI
    points.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [points] } }
}

/** Shifted so the general-area circle doesn't sit exactly on the location itself. */
const generalCenter = ([lng, lat]: LngLat): LngLat => [lng + 0.003, lat - 0.002]

export type MapGesture = 'drag' | 'zoom' | 'recenter'

interface Props {
  precise: boolean
  selected: string | null
  onSelect: (id: string) => void
  onFail: () => void
  /** The participant moved the map (logged as a sign of exploring). */
  onGesture?: (gesture: MapGesture) => void
}

/** Starting view: the simulated location and every store. */
function fitAll(map: MapLibreMap, area: Area, animate: boolean) {
  const lnglats = [area.center, ...Object.values(area.lnglat)]
  const lngs = lnglats.map((p) => p[0])
  const lats = lnglats.map((p) => p[1])
  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    { padding: { top: 34, bottom: 14, left: 20, right: 20 }, animate },
  )
}

export default function RealStoreMap({ precise, selected, onSelect, onFail, onGesture }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const pins = useRef(new Map<string, HTMLButtonElement>())
  const mapRef = useRef<MapLibreMap | null>(null)
  const handlers = useRef({ onSelect, onFail, onGesture })
  useEffect(() => {
    handlers.current = { onSelect, onFail, onGesture }
  }, [onSelect, onFail, onGesture])

  useEffect(() => {
    const el = container.current
    if (!el) return
    const area = getArea()
    let map: MapLibreMap
    try {
      map = new MapLibreMap({
        container: el,
        style: mapStyle(area),
        // Drag and zoom stay around the stores (and, by default, inside the downloaded neighborhood).
        maxBounds: area.bounds,
        maxZoom: 17,
        // Like an app: one finger drags, two fingers pinch-zoom. Swiping outside the map scrolls the page.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: { compact: true },
      })
    } catch {
      handlers.current.onFail()
      return
    }
    mapRef.current = map
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    // A missing tile or font range is harmless; log it and carry on.
    map.on('error', (e) => console.warn('map error', e.error?.message))

    fitAll(map, area, false)
    // Can't zoom out much past the starting view, and never below the lowest zoom we have tiles
    // for (below MAP_MIN_ZOOM the map would be blank gray with only the pins).
    // (The regional map files have every zoom, so a spread-out small-town area can zoom out further.)
    map.setMinZoom(Math.max(map.getZoom() - 0.3, area.kind === 'default' ? MAP_MIN_ZOOM : 0))

    // Only gestures by the participant count, not the recenter animation.
    map.on('dragend', (e) => e.originalEvent && handlers.current.onGesture?.('drag'))
    map.on('zoomend', (e) => e.originalEvent && handlers.current.onGesture?.('zoom'))

    for (const store of area.nearby) {
      const lnglat = area.lnglat[store.id]
      if (!lnglat) continue
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'map-pin-marker'
      button.setAttribute('aria-label', `${store.name} on the map`)
      button.addEventListener('click', () => handlers.current.onSelect(store.id))
      pins.current.set(store.id, button)
      new Marker({ element: button, anchor: 'bottom' }).setLngLat(lnglat).addTo(map)
    }

    const here = document.createElement('div')
    here.className = precise ? 'map-you-dot' : 'map-you-area'
    here.setAttribute('role', 'img')
    here.setAttribute('aria-label', precise ? 'Your location' : 'Your general area')
    new Marker({ element: here }).setLngLat(precise ? area.center : generalCenter(area.center)).addTo(map)

    map.on('load', () => {
      if (!precise) {
        const source = map.getSource('area') as GeoJSONSource | undefined
        source?.setData(circle(generalCenter(area.center), GENERAL_AREA_RADIUS_M))
      }
    })

    const currentPins = pins.current
    return () => {
      currentPins.clear()
      mapRef.current = null
      map.remove()
    }
  }, [precise])

  useEffect(() => {
    for (const [id, button] of pins.current) button.classList.toggle('selected', id === selected)
  }, [selected])

  const recenter = () => {
    if (!mapRef.current) return
    fitAll(mapRef.current, getArea(), true)
    handlers.current.onGesture?.('recenter')
  }

  return (
    <div className="real-map-wrap">
      <div ref={container} className="real-map" role="group" aria-label="Map of stores near you" />
      <button type="button" className="map-recenter" aria-label="Show all stores" onClick={recenter}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
    </div>
  )
}
