import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { visibleMs } from '../../log/clock'
import { useBramble } from '../BrambleContext'
import {
  NEARBY_STORES,
  YOU_ARE_HERE,
  ZIP_PAGE_SIZE,
  ZIP_STORES,
  distanceLabel,
  searchStores,
  type Store,
} from '../data'
import { FlowChoice } from '../FlowChoice'
import { getFlow, levelOf } from '../flows'
import { PinIcon, SearchIcon } from '../icons'
import { LoadingBlock, Spinner } from '../Loading'
import { Sheet } from '../Sheet'
import { useBusy } from '../useBusy'

const RealStoreMap = lazy(() => import('./RealStoreMap'))

/** Real maps need WebGL. Phones without it (and the test environment) get the drawn map. */
function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function FindStore() {
  const { state, dispatch, friction, settleFlow } = useBramble()
  const [busy, run] = useBusy()
  const location = state.flows.store_location
  const askLocation = !state.settled.includes('store_location')

  useEffect(() => {
    dispatch({ type: 'visitFindStore', atMs: visibleMs() })
  }, [dispatch])

  // Neutral: "Allow" needs an exact/general choice first; "Don't allow" never does.
  const preciseRequired = levelOf(getFlow('store_precise'), friction).required === true
  const allowBlocked = preciseRequired && state.flows.store_precise === null

  const onLocationChosen = (value: string) => {
    if (value !== 'dont_allow') settleFlow('store_precise')
    // Same wait whatever the answer, so neither choice feels faster.
    run('findingStores', () => {})
  }

  const flow = getFlow('store_location')

  let body
  if (askLocation || location === null) body = <div className="map-placeholder" aria-hidden="true" />
  else if (busy === 'findingStores') body = <LoadingBlock label="Finding stores near you…" />
  else if (location === 'dont_allow') body = <ZipSearch />
  else body = <NearbyStores />

  return (
    <section className="screen">
      <h1 className="screen-title">Find a store</h1>
      {body}
      {askLocation && (
        <Sheet icon={<PinIcon />} title={flow.title} description={flow.description}>
          <FlowChoice flowId="store_precise" />
          <FlowChoice
            flowId="store_location"
            disabledOptions={allowBlocked ? ['while_using', 'once'] : []}
            onChosen={onLocationChosen}
          />
        </Sheet>
      )}
    </section>
  )
}

/** Location allowed: a map of nearby stores, plus the searchable list. */
function NearbyStores() {
  const { state } = useBramble()
  const [selected, setSelected] = useState<string | null>(null)
  const precise = state.flows.store_precise !== 'general'
  return (
    <>
      <StoreMap precise={precise} selected={selected} onSelect={setSelected} />
      <StoreFinder stores={NEARBY_STORES} precise={precise} selected={selected} onSelect={setSelected} heading="Stores near you" />
    </>
  )
}

/** Real street map, or the drawn one where the phone can't show it. Logs which was shown. */
function StoreMap(props: { precise: boolean; selected: string | null; onSelect: (id: string, via: 'pin') => void }) {
  const { act } = useBramble()
  const [real, setReal] = useState(webglAvailable)
  const logged = useRef<string | null>(null)
  const kind = real ? 'real' : 'drawn'

  useEffect(() => {
    if (logged.current === kind) return
    logged.current = kind
    act('map_shown', { kind })
  }, [kind, act])

  const onPin = (id: string) => {
    act('store_card_opened', { storeId: id, via: 'pin' })
    props.onSelect(id, 'pin')
  }

  if (!real) return <DrawnStoreMap {...props} />
  return (
    <Suspense fallback={<div className="real-map skeleton" aria-hidden="true" />}>
      <RealStoreMap precise={props.precise} selected={props.selected} onSelect={onPin} onFail={() => setReal(false)} />
    </Suspense>
  )
}

/** Drawn neighborhood map: streets, a park, the river, store pins and the shared location. */
function DrawnStoreMap({
  precise,
  selected,
  onSelect,
}: {
  precise: boolean
  selected: string | null
  onSelect: (id: string, via: 'pin') => void
}) {
  const { act } = useBramble()
  const [hx, hy] = YOU_ARE_HERE
  return (
    <svg className="store-map" viewBox="0 0 340 190" role="group" aria-label="Map of stores near you">
      <rect width="340" height="190" rx="18" fill="#e4ebe2" />
      <path d="M0 170 C 80 150, 140 185, 230 165 S 320 150, 340 160 V190 H0 Z" fill="#cfe0e6" />
      <rect x="185" y="112" width="70" height="38" rx="8" fill="#d3e4cf" />
      <path d="M0 80 H340 M0 125 H180 M100 0 V190 M215 0 V112 M290 0 V160" stroke="#fff" strokeWidth="9" />
      <path d="M20 20 L320 175" stroke="#fff" strokeWidth="6" opacity="0.8" />
      {precise ? (
        <g aria-label="Your location">
          <circle cx={hx} cy={hy} r="14" fill="#3b7dd8" opacity="0.18" />
          <circle cx={hx} cy={hy} r="7" fill="#3b7dd8" stroke="#fff" strokeWidth="2.5" />
        </g>
      ) : (
        <circle cx={hx + 12} cy={hy - 6} r="46" fill="#3b7dd8" opacity="0.16" stroke="#3b7dd8" strokeOpacity="0.4" aria-label="Your general area" />
      )}
      {NEARBY_STORES.map((store) => {
        const [x, y] = store.pin!
        const isSelected = store.id === selected
        return (
          <g
            key={store.id}
            className={`map-pin-button ${isSelected ? 'selected' : ''}`}
            transform={`translate(${x} ${y})`}
            role="button"
            tabIndex={0}
            aria-label={`${store.name} on the map`}
            onClick={() => {
              act('store_card_opened', { storeId: store.id, via: 'pin' })
              onSelect(store.id, 'pin')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                act('store_card_opened', { storeId: store.id, via: 'pin' })
                onSelect(store.id, 'pin')
              }
            }}
          >
            <circle r="22" fill="transparent" />
            <path d="M0 0 C -9 -10, -10 -14, -10 -18 A 10 10 0 1 1 10 -18 C 10 -14, 9 -10, 0 0 Z" fill={isSelected ? 'var(--berry)' : 'var(--green)'} />
            <circle cy="-18" r="3.5" fill="#fff" />
          </g>
        )
      })}
    </svg>
  )
}

/** Search box, store card and list. Shared by both paths, so declining costs no extra taps. */
function StoreFinder({
  stores,
  precise,
  selected,
  onSelect,
  heading,
  footer,
  limit,
}: {
  stores: Store[]
  /** Without a search, show only this many (the ZIP list's "Show 18 more"). A search covers all. */
  limit?: number
  precise: boolean | null
  selected: string | null
  onSelect: (id: string | null, via?: 'list') => void
  heading: string
  footer?: ReactNode
}) {
  const { act } = useBramble()
  const [query, setQuery] = useState('')
  const [logged, setLogged] = useState('')
  const searching = query.trim() !== ''
  const result = searchStores(searching || limit === undefined ? stores : stores.slice(0, limit), query)
  const selectedStore = stores.find((s) => s.id === selected) ?? null

  // Only that a search happened is logged, never what was typed.
  const logSearch = () => {
    if (!query.trim() || query === logged) return
    setLogged(query)
    act('store_search', { item: result.item, results: result.stores.length })
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    logSearch()
    ;(document.activeElement as HTMLElement | null)?.blur?.()
  }

  return (
    <>
      <form className="search-box" role="search" onSubmit={onSubmit}>
        <SearchIcon />
        <input
          type="search"
          aria-label="Search stores or items"
          placeholder="Search stores or items"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={logSearch}
        />
      </form>

      {selectedStore && <StoreCard store={selectedStore} precise={precise} onClose={() => onSelect(null)} />}

      <h2 className="section-title">
        {result.item === 'oat_milk'
          ? `${result.stores.length} ${result.stores.length === 1 ? 'store has' : 'stores have'} oat milk in stock`
          : heading}
      </h2>
      {result.stores.length === 0 ? (
        <p className="notice small">No stores match "{query.trim()}".</p>
      ) : (
        <ul className="store-list" aria-label="Stores">
          {result.stores.map((store) => (
            <li key={store.id}>
              <button
                type="button"
                className={`card store-row ${store.id === selected ? 'selected' : ''}`}
                aria-expanded={store.id === selected}
                onClick={() => {
                  act('store_card_opened', { storeId: store.id, via: 'list' })
                  onSelect(store.id, 'list')
                }}
              >
                <span className="store-info">
                  <span className="store-name">{store.name}</span>
                  <span className="muted small">
                    {store.hours}
                    {store.miles !== undefined && precise !== null && ` · ${distanceLabel(store.miles, precise)}`}
                  </span>
                  {result.item === 'oat_milk' && <span className="stock stock-in">Oat milk in stock</span>}
                </span>
                <YourStoreTag storeId={store.id} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!searching && footer}
    </>
  )
}

function YourStoreTag({ storeId }: { storeId: string }) {
  const { state } = useBramble()
  return state.storeId === storeId ? <span className="your-store-tag">Your store</span> : null
}

/** Details for one store, with "Set as my store". */
function StoreCard({ store, precise, onClose }: { store: Store; precise: boolean | null; onClose: () => void }) {
  const { state, dispatch, act } = useBramble()
  const [busy, run] = useBusy()
  const isCurrent = state.storeId === store.id

  const setStore = () => {
    const atMs = visibleMs()
    run('setStore', () => {
      dispatch({ type: 'setStore', storeId: store.id, atMs })
      act('store_set', { storeId: store.id, hasOatMilk: store.hasOatMilk })
    })
  }

  return (
    <div className="card store-card" role="region" aria-label={store.name}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="store-name">{store.name}</div>
          <div className="muted small">
            {store.hours}
            {store.miles !== undefined && precise !== null && ` · ${distanceLabel(store.miles, precise)}`}
          </div>
        </div>
        <button type="button" className="icon-button close-button" aria-label="Close store details" onClick={onClose}>
          ×
        </button>
      </div>
      <ul className="stock-list">
        <li>
          <span>Oat milk, 64 oz</span>
          <span className={store.hasOatMilk ? 'stock-in' : 'stock-out'}>{store.hasOatMilk ? 'In stock · Aisle 4' : 'Out of stock'}</span>
        </li>
        <li>
          <span>Sourdough loaf</span>
          <span className="stock-in">In stock · Bakery</span>
        </li>
      </ul>
      <button
        type="button"
        className={`btn ${isCurrent ? 'btn-equal' : 'btn-green'}`}
        aria-pressed={isCurrent}
        disabled={busy !== null}
        onClick={setStore}
      >
        {busy ? <Spinner label="Saving…" /> : isCurrent ? 'Your store ✓' : 'Set as my store'}
      </button>
    </div>
  )
}

/** Location refused: ZIP code first, then every store in that ZIP, A to Z (mockup p. 12). */
function ZipSearch() {
  const { state, dispatch, act } = useBramble()
  const [busy, run] = useBusy()
  const [zip, setZip] = useState('')
  const [searched, setSearched] = useState(state.storeSearch.usedZipSearch)
  const [showAll, setShowAll] = useState(state.storeSearch.storesViewed > ZIP_PAGE_SIZE)
  const [selected, setSelected] = useState<string | null>(null)
  const valid = /^\d{5}$/.test(zip)

  const search = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    // The ZIP itself is never saved: participants might type their real one.
    act('zip_search')
    run('zipSearch', () => {
      dispatch({ type: 'zipSearch', storesViewed: ZIP_PAGE_SIZE })
      setSearched(true)
    })
  }

  const showMore = () => {
    dispatch({ type: 'viewStores', storesViewed: ZIP_STORES.length })
    act('zip_show_more')
    setShowAll(true)
  }

  return (
    <>
      <p className="notice">Location is off. Enter a ZIP code to see stores.</p>
      <form className="row" onSubmit={search}>
        <input
          className="input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          placeholder="ZIP code"
          aria-label="ZIP code"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
        />
        <button type="submit" className="btn btn-green btn-auto" disabled={!valid || busy !== null}>
          {busy ? <Spinner /> : 'Search'}
        </button>
      </form>
      {busy === 'zipSearch' && <LoadingBlock label="Searching…" />}
      {searched && busy === null && (
        <StoreFinder
          stores={ZIP_STORES}
          limit={showAll ? undefined : ZIP_PAGE_SIZE}
          precise={null}
          selected={selected}
          onSelect={setSelected}
          heading={`${ZIP_STORES.length} stores in this ZIP code · A to Z`}
          footer={
            !showAll && (
              <button type="button" className="btn btn-outline" onClick={showMore}>
                Show {ZIP_STORES.length - ZIP_PAGE_SIZE} more
              </button>
            )
          }
        />
      )}
    </>
  )
}
