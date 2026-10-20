/** 100 points (Bramble) or coins (Stride) = $1.00, so 1 point = 1 cent. */
export function bonusDollars(points: number): number {
  return Math.round(points) / 100
}

/** The session bonus: each app's balance converted, then added in whole cents. */
export function totalBonus(...balances: number[]): number {
  return balances.reduce((cents, b) => cents + Math.round(b), 0) / 100
}
