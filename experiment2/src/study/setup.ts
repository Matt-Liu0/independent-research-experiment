// What the participant picked in each app's first-run setup ("What do you usually buy?",
// "What's your goal?"). Like the name, it stays on the phone (localStorage) and is never sent to
// Firestore: the apps only use it to feel personal. Events record that setup happened, not the picks.
import type { AppId } from '../core/flowTypes'

export const GROCERY_CATEGORIES = [
  { id: 'dairy', label: 'Milk & dairy' },
  { id: 'bakery', label: 'Bread & bakery' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'meat', label: 'Meat & fish' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'coffee', label: 'Coffee & tea' },
  { id: 'frozen', label: 'Frozen' },
  { id: 'pantry', label: 'Pasta & rice' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'household', label: 'Household' },
] as const

export const FITNESS_GOALS = [
  { id: 'move', label: 'Move more' },
  { id: 'sleep', label: 'Sleep better' },
  { id: 'stress', label: 'Feel less stressed' },
  { id: 'event', label: 'Train for an event' },
] as const

export const ACTIVE_DAYS = ['0–1', '2–3', '4–5', '6–7'] as const

export interface Setup {
  bramble?: { usuals: string[] }
  stride?: { goal: string; activeDays: string }
}

const KEY = 'study.setup'
let fallback: Setup = {}

function read(): Setup {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Setup) : {}
  } catch {
    return fallback
  }
}

export function getSetup(): Setup {
  return read()
}

export function isSetUp(app: AppId): boolean {
  return read()[app] !== undefined
}

export function saveSetup<A extends AppId>(app: A, value: NonNullable<Setup[A]>): void {
  const next = { ...read(), [app]: value }
  fallback = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode or storage blocked: keep it in memory for this visit.
  }
}

/** Agent episodes and tests skip the setup screens. */
export function skipSetup(): void {
  saveSetup('bramble', { usuals: [] })
  saveSetup('stride', { goal: '', activeDays: '' })
}
