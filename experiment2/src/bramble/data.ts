// Fixed content for the practice app. Nothing here comes from the participant.

export interface Store {
  id: string
  name: string
  hours: string
  hasOatMilk: boolean
  /** Shown when the participant shares location. */
  distance?: string
}

/** Stores listed when location is allowed (mockup p. 1). */
export const NEARBY_STORES: Store[] = [
  { id: 'elm', name: 'Bramble Market · Elm Street', hours: 'Open until 10 PM', hasOatMilk: true, distance: '0.4 mi' },
  { id: 'riverside', name: 'Bramble Market · Riverside', hours: 'Open until 9 PM', hasOatMilk: false, distance: '1.2 mi' },
]

const ZIP_STORE_NAMES: [string, string, boolean][] = [
  ['Alder Road', 'Until 9 PM', false],
  ['Bay Street', 'Until 10 PM', false],
  ['Cedar Plaza', 'Until 9 PM', false],
  ['Dover Avenue', 'Until 11 PM', false],
  ['Elm Street', 'Until 10 PM', true],
  ['Fenwick Commons', 'Until 9 PM', false],
  ['Garden Row', 'Until 10 PM', false],
  ['Harbor Point', 'Until 9 PM', true],
  ['Ivy Lane', 'Until 10 PM', false],
  ['Juniper Court', 'Until 9 PM', false],
  ['Kestrel Way', 'Until 11 PM', false],
  ['Linden Square', 'Until 10 PM', false],
  ['Maple Crossing', 'Until 9 PM', true],
  ['North Gate', 'Until 10 PM', false],
  ['Orchard Hill', 'Until 9 PM', false],
  ['Pine Street', 'Until 10 PM', false],
  ['Quarry Road', 'Until 9 PM', false],
  ['Riverside', 'Until 9 PM', false],
  ['Spruce Avenue', 'Until 11 PM', false],
  ['Tanner Mill', 'Until 10 PM', false],
  ['Union Place', 'Until 9 PM', false],
  ['Vale Street', 'Until 10 PM', false],
  ['Willow Park', 'Until 9 PM', false],
  ['York Commons', 'Until 10 PM', false],
]

/** Stores listed after a ZIP search when location is off (mockup p. 12): 24, A to Z. */
export const ZIP_STORES: Store[] = ZIP_STORE_NAMES.map(([street, hours, hasOatMilk]) => ({
  id: street === 'Elm Street' ? 'elm' : street === 'Riverside' ? 'riverside' : street.toLowerCase().replace(/\s+/g, '-'),
  name: `Bramble Market · ${street}`,
  hours,
  hasOatMilk,
}))

/** How many ZIP results show before "Show 18 more". */
export const ZIP_PAGE_SIZE = 6

export function findStore(id: string | null): Store | undefined {
  if (!id) return undefined
  return [...NEARBY_STORES, ...ZIP_STORES].find((s) => s.id === id)
}

export interface Product {
  id: string
  name: string
  price: number
}

export const PRODUCTS: Product[] = [
  { id: 'oat_milk', name: 'Oat milk, 64 oz', price: 4.49 },
  { id: 'sourdough', name: 'Sourdough loaf', price: 5.99 },
  { id: 'apples', name: 'Honeycrisp apples, 1 lb', price: 1.99 },
  { id: 'yogurt', name: 'Greek yogurt, 32 oz', price: 4.29 },
  { id: 'eggs', name: 'Eggs, dozen', price: 3.79 },
  { id: 'bananas', name: 'Bananas, bunch', price: 1.49 },
]

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export const DELIVERY_FEE = 3.99

export interface Deal {
  id: string
  name: string
  price: string
  swatch: string
}

export const DEALS: Deal[] = [
  { id: 'oat_milk', name: 'Oat milk, 64 oz', price: '2 for $7.00', swatch: '#e6edf3' },
  { id: 'apples', name: 'Honeycrisp apples', price: '$1.99 / lb', swatch: '#f2e5e3' },
  { id: 'sourdough', name: 'Sourdough loaf', price: '$4.99', swatch: '#f3ecdc' },
  { id: 'yogurt', name: 'Greek yogurt, 32 oz', price: '$4.29', swatch: '#e2ede5' },
]

/** Practice delivery address (the participant's real address is never asked for). */
export const PRACTICE_ADDRESS = '12 Birch Lane, Apt 3'
export const MOVE_ADDRESS = '40 Oak Street'

export const START_POINTS = 420
export const REDEEM_COST = 300
