import type { CIFlow } from '../core/ci'

/** The CI parameters that tell two flows apart for the held-out distance. */
const PARAMETERS: { name: string; of: (ci: CIFlow) => string }[] = [
  { name: 'recipient', of: (ci) => ci.recipient },
  { name: 'attribute', of: (ci) => ci.attribute },
  { name: 'temporality', of: (ci) => ci.temporality },
  { name: 'identifiability', of: (ci) => ci.identifiability },
  { name: 'aim', of: (ci) => ci.transmissionPrinciple.aim },
  { name: 'temporal', of: (ci) => ci.transmissionPrinciple.temporal },
  { name: 'reward', of: (ci) => (ci.transmissionPrinciple.consideration ? 'paid' : 'unpaid') },
]

/** Parameters on which two flows differ. */
export function differingParameters(a: CIFlow, b: CIFlow): string[] {
  return PARAMETERS.filter((p) => p.of(a) !== p.of(b)).map((p) => p.name)
}

/**
 * Distance from a held-out flow to a reference set (the site flows now; the case-based arm's
 * training set T once it exists): the fewest parameters it differs on from any reference flow.
 * Ties go to the first reference flow in order.
 */
export function heldOutDistance(
  ci: CIFlow,
  reference: readonly { id: string; ci: CIFlow }[],
): { nearest: string; distance: number; differs: string[] } {
  let best: { nearest: string; distance: number; differs: string[] } | null = null
  for (const ref of reference) {
    const differs = differingParameters(ci, ref.ci)
    if (!best || differs.length < best.distance) best = { nearest: ref.id, distance: differs.length, differs }
  }
  if (!best) throw new Error('Empty reference set')
  return best
}
