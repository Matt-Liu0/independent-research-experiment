import { getName } from '../../study/name'
import { getSetup } from '../../study/setup'
import { useBramble } from '../BrambleContext'
import { PRODUCTS, PRODUCT_CATEGORY, findStore } from '../data'

export function Shop() {
  const { state, dispatch, navigate, act } = useBramble()
  const store = findStore(state.storeId)
  const name = getName()
  // What the participant said they usually buy (first-run setup) comes first.
  const usuals = getSetup().bramble?.usuals ?? []
  const products = [...PRODUCTS].sort((a, b) => Number(usuals.includes(PRODUCT_CATEGORY[b.id])) - Number(usuals.includes(PRODUCT_CATEGORY[a.id])))
  const personal = products.some((p) => usuals.includes(PRODUCT_CATEGORY[p.id]))

  const toggle = (productId: string) => {
    const inCart = state.cart.includes(productId)
    dispatch({ type: inCart ? 'removeFromCart' : 'addToCart', productId })
    act(inCart ? 'cart_remove' : 'cart_add', { productId })
  }

  return (
    <section className="screen">
      <h1 className="screen-title">{name ? `Hi, ${name}` : 'Shop'}</h1>

      <div className="card row">
        <div style={{ flex: 1 }}>
          <div className="muted small">Your store</div>
          <div className="store-name">{store ? store.name : 'No store chosen yet'}</div>
        </div>
        <button type="button" className="btn btn-outline btn-small" onClick={() => navigate('find_store')}>
          {store ? 'Change' : 'Find a store'}
        </button>
      </div>

      <h2 className="section-title">{personal ? 'Your usuals first' : 'Groceries'}</h2>
      <ul className="product-list">
        {products.map((product) => {
          const inCart = state.cart.includes(product.id)
          return (
            <li key={product.id} className="card product-row">
              <div style={{ flex: 1 }}>
                <div className="product-name">{product.name}</div>
                <div className="muted small">${product.price.toFixed(2)}</div>
              </div>
              <button
                type="button"
                className={`btn btn-small ${inCart ? 'btn-equal' : 'btn-outline'}`}
                aria-pressed={inCart}
                aria-label={`${inCart ? 'Remove' : 'Add'} ${product.name}`}
                onClick={() => toggle(product.id)}
              >
                {inCart ? 'In cart' : 'Add'}
              </button>
            </li>
          )
        })}
      </ul>

      {state.cart.length > 0 && (
        <div className="sticky-action">
          <button type="button" className="btn btn-green" onClick={() => navigate('checkout')}>
            Go to checkout · {state.cart.length} {state.cart.length === 1 ? 'item' : 'items'}
          </button>
        </div>
      )}
    </section>
  )
}
