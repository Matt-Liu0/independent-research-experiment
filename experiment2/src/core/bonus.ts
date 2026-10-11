/** 100 points (Bramble) or coins (Stride) = $0.10. */
export function bonusDollars(points: number): number {
  return Math.round(points / 10) / 100
}
