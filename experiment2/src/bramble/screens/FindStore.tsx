import { useEffect, useState, type FormEvent } from 'react'
import { visibleMs } from '../../log/clock'
import { useBramble } from '../BrambleContext'
import { NEARBY_STORES, ZIP_PAGE_SIZE, ZIP_STORES, type Store } from '../data'
import { FlowChoice } from '../FlowChoice'
import { getFlow, levelOf } from '../flows'
import { PinIcon } from '../icons'
import { Sheet } from '../Sheet'

export function FindStore() {
  const { state, dispatch, friction, settleFlow, act } = useBramble()
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
  }

  const setStore = (store: Store) => {
    dispatch({ type: 'setStore', storeId: store.id, atMs: visibleMs() })
    act('store_set', { storeId: store.id, hasOatMilk: store.hasOatMilk })
  }

  const flow = getFlow('store_location')

  return (
    <section className="screen">
      <h1 className="screen-title">Find a store</h1>
      {location === null || askLocation ? (
        <div className="map-placeholder" aria-hidden="true" />
      ) : location === 'dont_allow' ? (
        <ZipSearch onSetStore={setStore} currentStoreId={state.storeId} />
      ) : (
        <>
          <div className="map-placeholder" aria-hidden="true">
            <span className="map-pin">
              <PinIcon />
            </span>
          </div>
          <h2 className="section-title">Stores near you</h2>
          <StoreList
            stores={NEARBY_STORES}
            currentStoreId={state.storeId}
            onSetStore={setStore}
            approximate={state.flows.store_precise === 'general'}
          />
        </>
      )}

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

function StoreList({
  stores,
  currentStoreId,
  onSetStore,
  approximate = false,
}: {
  stores: Store[]
  currentStoreId: string | null
  onSetStore: (store: Store) => void
  approximate?: boolean
}) {
  return (
    <ul className="store-list">
      {stores.map((store) => {
        const isCurrent = store.id === currentStoreId
        return (
          <li key={store.id} className="card store-row">
            <div className="store-info">
              <div className="store-name">{store.name}</div>
              <div className="muted small">
                {store.hours}
                {store.distance && ` · ${approximate ? 'about 1 mi' : store.distance}`}
              </div>
              <div className={`stock ${store.hasOatMilk ? 'stock-in' : 'stock-out'}`}>
                Oat milk {store.hasOatMilk ? 'in stock' : 'out of stock'}
              </div>
            </div>
            <button
              type="button"
              className={`btn btn-small ${isCurrent ? 'btn-equal' : 'btn-outline'}`}
              aria-pressed={isCurrent}
              onClick={() => onSetStore(store)}
            >
              {isCurrent ? 'Your store' : 'Set as my store'}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function ZipSearch({ onSetStore, currentStoreId }: { onSetStore: (s: Store) => void; currentStoreId: string | null }) {
  const { state, dispatch, act } = useBramble()
  const [zip, setZip] = useState('')
  const [searched, setSearched] = useState(state.storeSearch.usedZipSearch)
  const [showAll, setShowAll] = useState(state.storeSearch.storesViewed > ZIP_PAGE_SIZE)
  const valid = /^\d{5}$/.test(zip)

  const search = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    // The ZIP itself is never saved: participants might type their real one.
    dispatch({ type: 'zipSearch', storesViewed: ZIP_PAGE_SIZE })
    act('zip_search')
    setSearched(true)
  }

  const showMore = () => {
    dispatch({ type: 'viewStores', storesViewed: ZIP_STORES.length })
    act('zip_show_more')
    setShowAll(true)
  }

  const visible = showAll ? ZIP_STORES : ZIP_STORES.slice(0, ZIP_PAGE_SIZE)

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
        <button type="submit" className="btn btn-green btn-auto" disabled={!valid}>
          Search
        </button>
      </form>
      {searched && (
        <>
          <h2 className="section-title muted">{ZIP_STORES.length} stores in this ZIP code · A to Z</h2>
          <StoreList stores={visible} currentStoreId={currentStoreId} onSetStore={onSetStore} />
          {!showAll && (
            <button type="button" className="btn btn-outline" onClick={showMore}>
              Show {ZIP_STORES.length - ZIP_PAGE_SIZE} more
            </button>
          )}
        </>
      )}
    </>
  )
}
