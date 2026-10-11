// Every flow in the session, Bramble's then Stride's: for exports, codebooks and checks
// that span both apps.
import { FLOWS } from './bramble/flows'
import type { FlowDef } from './core/flowTypes'
import { STRIDE_FLOW_LIST } from './stride/flows'

export const ALL_FLOWS: readonly FlowDef[] = [...FLOWS, ...STRIDE_FLOW_LIST]
