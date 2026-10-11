/** 100 points (Bramble) or coins (Stride) = $0.10. */
export function bonusDollars(points: number): number {
  return Math.round(points / 10) / 100
}

/** The session bonus: each app's balance converted, then added in whole cents. */
export function totalBonus(...balances: number[]): number {
  return balances.reduce((cents, b) => cents + Math.round(b / 10), 0) / 100
}
