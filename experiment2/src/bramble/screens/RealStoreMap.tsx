// Real street map for the store finder. Loaded lazily (MapLibre is large) and served
// entirely from our own site: tiles and fonts live in public/map (npm run build:map).
import { layers, namedFlavor } from '@protomaps/basemaps'
import { Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource, type LayerSpecification, type StyleSpecification } from 'maplibre-gl'
// MapLibre parses tiles in a web worker; Vite bundles it and gives us its URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { Feature, Polygon } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import { NEARBY_STORES } from '../data'
import {
  GENERAL_AREA_RADIUS_M,
  MAP_BOUNDS,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  STORE_LNGLAT,
  YOU_ARE_HERE_LNGLAT,
} from '../mapConfig'

setWorkerUrl(workerUrl)

/** Business pins, house numbers, highway shields and place names are left out: only Bramble's stores show. */
const HIDDEN_LAYERS = new Set(['pois', 'address_label', 'roads_oneway', 'roads_shields'])

function mapStyle(): StyleSpecification {
  const origin = window.location.origin
  const base = layers('protomaps', namedFlavor('light'), { lang: 'en' }).filter(
    (l) => !HIDDEN_LAYERS.has(l.id) && !l.id.startsWith('places_'),
  ) as LayerSpecification[]
  return {
    version: 8,
    glyphs: `${origin}/map/fonts/{fontstack}/{range}.pbf`,
    sources: {
      protomaps: {
        type: 'vector',
        tiles: [`${origin}/map/tiles/{z}/{x}/{y}.mvt`],
        minzoom: MAP_MIN_ZOOM,
        maxzoom: MAP_MAX_ZOOM,
        bounds: MAP_BOUNDS,
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

/** Shifted so the general-area circle doesn't sit exactly on the true simulated spot. */
const GENERAL_CENTER: [number, number] = [YOU_ARE_HERE_LNGLAT[0] + 0.003, YOU_ARE_HERE_LNGLAT[1] - 0.002]

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
function fitAll(map: MapLibreMap, animate: boolean) {
  const lnglats = [YOU_ARE_HERE_LNGLAT, ...Object.values(STORE_LNGLAT)]
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
    let map: MapLibreMap
    try {
      map = new MapLibreMap({
        container: el,
        style: mapStyle(),
        // Drag and zoom stay inside the downloaded neighborhood, so there are no blank edges.
        maxBounds: MAP_BOUNDS,
        maxZoom: 17,
        // One finger scrolls the page; two fingers (or Ctrl/⌘ + scroll) move the map.
        cooperativeGestures: true,
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

    fitAll(map, false)
    // Can't zoom out past the starting view (the downloaded area ends just beyond it).
    map.setMinZoom(map.getZoom() - 0.3)

    // Only gestures by the participant count, not the recenter animation.
    map.on('dragend', (e) => e.originalEvent && handlers.current.onGesture?.('drag'))
    map.on('zoomend', (e) => e.originalEvent && handlers.current.onGesture?.('zoom'))

    for (const store of NEARBY_STORES) {
      const lnglat = STORE_LNGLAT[store.id]
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
    new Marker({ element: here }).setLngLat(precise ? YOU_ARE_HERE_LNGLAT : GENERAL_CENTER).addTo(map)

    map.on('load', () => {
      if (!precise) {
        const source = map.getSource('area') as GeoJSONSource | undefined
        source?.setData(circle(GENERAL_CENTER, GENERAL_AREA_RADIUS_M))
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
    fitAll(mapRef.current, true)
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
