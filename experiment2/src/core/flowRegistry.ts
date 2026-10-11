import type { FlowDef, Friction, LevelDef } from './flowTypes'

/** Lookups over one app's flows. */
export interface FlowRegistry<F extends string = string, Scr extends string = string, T extends number = number> {
  flows: readonly FlowDef<F, Scr, T>[]
  getFlow: (id: F) => FlowDef<F, Scr, T>
  /** Whether a dependent flow applies, given the current values of the flows it depends on. */
  isApplicable: (id: F, values: Record<F, string | null>) => boolean
  /** Flows whose applicability depends on the given flow. */
  dependentsOf: (id: F) => F[]
  emptyFlowValues: () => Record<F, string | null>
}

export function levelOf(flow: FlowDef, friction: Friction): LevelDef {
  return flow[friction]
}

export function createFlowRegistry<F extends string, Scr extends string, T extends number>(
  flows: readonly FlowDef<F, Scr, T>[],
): FlowRegistry<F, Scr, T> {
  const byId = new Map(flows.map((f) => [f.id, f]))
  const getFlow = (id: F) => {
    const flow = byId.get(id)
    if (!flow) throw new Error(`Unknown flow: ${id}`)
    return flow
  }
  return {
    flows,
    getFlow,
    isApplicable: (id, values) => {
      const dep = getFlow(id).dependsOn
      if (!dep) return true
      const parent = values[dep.flowId]
      if (parent === null) return false
      if (dep.equals !== undefined) return parent === dep.equals
      if (dep.notEquals !== undefined) return parent !== dep.notEquals
      return true
    },
    dependentsOf: (id) => flows.filter((f) => f.dependsOn?.flowId === id).map((f) => f.id),
    emptyFlowValues: () => Object.fromEntries(flows.map((f) => [f.id, null])) as Record<F, string | null>,
  }
}
