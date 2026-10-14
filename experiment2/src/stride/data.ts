// Stride's practice content. Health numbers are made up and the same for everyone.

export const START_COINS = 420
export const REPORT_COST = 300

/** Today's practice stats, shown once health data is connected. */
export const TODAY_STATS = { steps: '6,412', sleep: '7h 10m', restingHeartRate: 61 }

export interface Plan {
  id: string
  name: string
  detail: string
  swatch: string
  /** CC0 photo (public/images/plans/CREDITS.md); the swatch shows while it loads. */
  image: string
}

export const PLANS: Plan[] = [
  { id: 'run_5k', name: '5K in 6 weeks', detail: '3 runs a week · beginner', swatch: '#dbe7f6', image: '/images/plans/run_5k.jpg' },
  { id: 'sleep_yoga', name: 'Wind-down yoga', detail: '15 min before bed', swatch: '#e8e2f4', image: '/images/plans/sleep_yoga.jpg' },
  { id: 'strength', name: 'Strength basics', detail: '2 sessions a week · no equipment', swatch: '#fbe4dc', image: '/images/plans/strength.jpg' },
  { id: 'walking', name: 'Heart-health walking', detail: '30 min a day', swatch: '#dff1e8', image: '/images/plans/walking.jpg' },
]

/** The guided workout, as shown (the real timeline is compressed). */
export const WORKOUT = { name: 'Morning intervals', coach: 'Maya', minutes: 10 }
