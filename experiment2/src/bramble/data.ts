// Fixed content for the practice app. Nothing here comes from the participant.

export interface Store {
  id: string
  name: string
  hours: string
  hasOatMilk: boolean
  /** Miles from the simulated location (stores near you only). */
  miles?: number
  /** Pin position on the drawn map, in its 340 × 190 coordinate space. */
  pin?: [number, number]
}

/**
 * Stores listed when location is allowed, nearest first. The two nearest are out of oat
 * milk, so finding one takes a little checking, as in a real store finder.
 */
export const NEARBY_STORES: Store[] = [
  { id: 'cedar-plaza', name: 'Bramble Market · Cedar Plaza', hours: 'Open until 9 PM', hasOatMilk: false, miles: 0.3, pin: [128, 58] },
  { id: 'riverside', name: 'Bramble Market · Riverside', hours: 'Open until 9 PM', hasOatMilk: false, miles: 0.6, pin: [250, 140] },
  { id: 'elm', name: 'Bramble Market · Elm Street', hours: 'Open until 10 PM', hasOatMilk: true, miles: 0.9, pin: [262, 50] },
  { id: 'north-gate', name: 'Bramble Market · North Gate', hours: 'Open until 10 PM', hasOatMilk: false, miles: 1.4, pin: [60, 30] },
  { id: 'harbor-point', name: 'Bramble Market · Harbor Point', hours: 'Open until 9 PM', hasOatMilk: true, miles: 2.1, pin: [36, 160] },
]

/** Where the simulated location sits on the drawn map. */
export const YOU_ARE_HERE: [number, number] = [170, 100]

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

/** Distance text: exact miles with precise location, a rounded "about" with general area only. */
export function distanceLabel(miles: number, precise: boolean): string {
  return precise ? `${miles.toFixed(1)} mi` : `about ${Math.max(1, Math.round(miles))} mi`
}

/**
 * What a store-finder search matches: an item (oat milk, sourdough) or part of a store name.
 * Anything else (a town, an address) matches every store, flagged `unmatched`, so a search
 * never ends in an empty list.
 */
export function searchStores(
  stores: Store[],
  query: string,
): { stores: Store[]; item: 'oat_milk' | 'sourdough' | null; unmatched: boolean } {
  const q = query.trim().toLowerCase()
  if (!q) return { stores, item: null, unmatched: false }
  if (/oat|milk/.test(q)) return { stores: stores.filter((s) => s.hasOatMilk), item: 'oat_milk', unmatched: false }
  if (/sourdough|bread|loaf/.test(q)) return { stores, item: 'sourdough', unmatched: false }
  const named = stores.filter((s) => s.name.toLowerCase().includes(q))
  return named.length > 0 ? { stores: named, item: null, unmatched: false } : { stores, item: null, unmatched: true }
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

/** Each product's category in the first-run setup ("What do you usually buy?"; study/setup.ts). */
export const PRODUCT_CATEGORY: Record<string, string> = {
  oat_milk: 'dairy',
  sourdough: 'bakery',
  apples: 'fruit',
  yogurt: 'dairy',
  eggs: 'eggs',
  bananas: 'fruit',
}

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export const DELIVERY_FEE = 3.99

export interface Deal {
  id: string
  name: string
  price: string
  /** Shown behind the photo while it loads. */
  swatch: string
  /** CC0 photo served from our own site (public/images/deals; credits in CREDITS.md there). */
  image: string
}

export const DEALS: Deal[] = [
  { id: 'oat_milk', name: 'Oat milk, 64 oz', price: '2 for $7.00', swatch: '#e6edf3', image: '/images/deals/oat_milk.jpg' },
  { id: 'apples', name: 'Honeycrisp apples', price: '$1.99 / lb', swatch: '#f2e5e3', image: '/images/deals/apples.jpg' },
  { id: 'sourdough', name: 'Sourdough loaf', price: '$4.99', swatch: '#f3ecdc', image: '/images/deals/sourdough.jpg' },
  { id: 'yogurt', name: 'Greek yogurt, 32 oz', price: '$4.29', swatch: '#e2ede5', image: '/images/deals/yogurt.jpg' },
]

/** Practice delivery address (the participant's real address is never asked for). */
export const PRACTICE_ADDRESS = '12 Birch Lane, Apt 3'
export const MOVE_ADDRESS = '40 Oak Street'

/** Practice profile details used by flows (never the participant's own). */
export const PRACTICE_BIRTHDAY = 'May 14'
export const PRACTICE_CARD = 'Visa ending 4242'

export const START_POINTS = 150
export const REDEEM_COST = 100
