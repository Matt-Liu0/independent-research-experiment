import type { Friction, FlowDef, FlowId, FlowValues, LevelDef } from './types'
import { FLOW_IDS } from './types'

// The two levels follow Utz et al. (2019), "(Un)informed Consent", CCS:
//  - one-tap prompts: nudging = only the sharing option highlighted; non-nudging = all
//    options formatted the same.
//  - settings: nudging = pre-checked (sharing on); non-nudging = unchecked (sharing off).

/** Non-nudging one-tap prompt: equal buttons, nothing preset. */
const equalButtons: LevelDef = { control: 'buttons', default: null, emphasis: null }

/** Non-nudging setting: the same switch, unchecked (the least-sharing option). */
const unchecked = (privacyOption: string): LevelDef => ({ control: 'switch', default: privacyOption, emphasis: null })

/**
 * The 12 site flows. This is the only place the two friction levels differ:
 * screens draw every flow through <FlowChoice>, which reads `nudged` or `neutral`.
 * Wording, labels and points are shared by both levels.
 */
export const FLOWS: readonly FlowDef[] = [
  {
    id: 'store_location',
    task: 1,
    screen: 'find_store',
    kind: 'prompt',
    settleOn: 'choice',
    options: ['while_using', 'once', 'dont_allow'],
    labels: { while_using: 'Allow while using Bramble', once: 'Allow once', dont_allow: "Don't allow" },
    title: 'Allow Bramble to use your location?',
    description: "Bramble uses your location to find stores near you and show what's in stock.",
    privacyOption: 'dont_allow',
    dependsOn: null,
    account: {
      label: 'Location access',
      labels: { while_using: 'While using', once: 'Ask each time', dont_allow: 'Never' },
    },
    ci: {
      sender: 'participant',
      recipient: 'bramble',
      recipientType: 'first_party',
      subject: 'participant',
      informationType: 'current_location',
      transmissionPrinciple: { aim: 'find_stores', condition: 'with_permission', temporal: 'once_or_while_using', consideration: null },
      statement: "The participant's phone sends their current location to Bramble, with permission, while using the app (or once), to find nearby stores and stock.",
    },
    nudged: { control: 'buttons', default: null, emphasis: 'while_using' },
    neutral: equalButtons,
  },
  {
    id: 'store_precise',
    task: 1,
    screen: 'find_store',
    kind: 'setting',
    settleOn: 'commit',
    options: ['exact', 'general'],
    labels: { exact: 'Exact location', general: 'General area only' },
    title: 'Precise location',
    description: 'Your exact spot, or only your general area.',
    privacyOption: 'general',
    dependsOn: { flowId: 'store_location', notEquals: 'dont_allow' },
    account: { label: 'Precise location', labels: { exact: 'On', general: 'Off' } },
    ci: {
      sender: 'participant',
      recipient: 'bramble',
      recipientType: 'first_party',
      subject: 'participant',
      informationType: 'location_precision',
      transmissionPrinciple: { aim: 'find_stores', condition: 'with_permission', temporal: 'once_or_while_using', consideration: null },
      statement: "The participant's phone sends Bramble their exact location rather than only their general area, with permission, to find nearby stores.",
    },
    nudged: { control: 'switch', default: 'exact', emphasis: null },
    neutral: unchecked('general'),
  },
  {
    id: 'courier_live',
    task: 2,
    screen: 'checkout',
    kind: 'setting',
    settleOn: 'commit',
    options: ['share', 'dont_share'],
    labels: { share: 'Share', dont_share: "Don't share" },
    title: 'Share my live location with my courier until my order arrives',
    description: "Helps your courier find you if you're not at the door.",
    privacyOption: 'dont_share',
    dependsOn: null,
    account: { label: 'Live location with courier', labels: { share: 'On', dont_share: 'Off' } },
    ci: {
      sender: 'participant',
      recipient: 'courier',
      recipientType: 'service_provider',
      subject: 'participant',
      informationType: 'live_location',
      transmissionPrinciple: { aim: 'courier_handoff', condition: 'with_consent', temporal: 'until_delivery', consideration: null },
      statement: "Bramble shares the participant's live location with their courier, with consent, until the order arrives, to help the courier find them.",
    },
    nudged: { control: 'switch', default: 'share', emphasis: null },
    neutral: unchecked('dont_share'),
  },
  {
    id: 'checkout_partner_offers',
    task: 2,
    screen: 'checkout',
    kind: 'setting',
    settleOn: 'commit',
    options: ['checked', 'unchecked'],
    labels: { checked: 'Checked', unchecked: 'Unchecked' },
    title: "Send me offers from Bramble's partner brands based on my delivery address.",
    description: '',
    privacyOption: 'unchecked',
    dependsOn: null,
    account: { label: 'Partner offers by address', labels: { checked: 'On', unchecked: 'Off' } },
    ci: {
      sender: 'bramble',
      recipient: 'partner_brands',
      recipientType: 'third_party_commercial',
      subject: 'participant',
      informationType: 'home_address',
      transmissionPrinciple: { aim: 'marketing_offers', condition: 'with_consent', temporal: 'ongoing', consideration: null },
      statement: "Bramble shares the participant's delivery address with partner brands, with consent, so they can send marketing offers.",
    },
    nudged: { control: 'checkbox', default: 'checked', emphasis: null },
    neutral: { control: 'checkbox', default: 'unchecked', emphasis: null },
  },
  {
    id: 'bg_during_order',
    task: 3,
    screen: 'orders',
    kind: 'prompt',
    settleOn: 'choice',
    options: ['allow', 'not_now'],
    labels: { allow: 'Allow in background', not_now: 'Not now' },
    title: 'Keep your arrival time accurate?',
    description: 'Let Bramble use your location in the background while this order is on its way.',
    privacyOption: 'not_now',
    dependsOn: null,
    account: { label: 'Background location during orders', labels: { allow: 'On', not_now: 'Off' } },
    ci: {
      sender: 'participant',
      recipient: 'bramble',
      recipientType: 'first_party',
      subject: 'participant',
      informationType: 'background_location',
      transmissionPrinciple: { aim: 'accurate_arrival_time', condition: 'with_permission', temporal: 'while_order_active', consideration: null },
      statement: "The participant's phone sends Bramble their location in the background, with permission, while an order is on its way, to keep the arrival time accurate.",
    },
    nudged: { control: 'buttons', default: null, emphasis: 'allow' },
    neutral: equalButtons,
  },
  {
    id: 'sam_share',
    task: 3,
    screen: 'orders',
    kind: 'prompt',
    settleOn: 'choice',
    options: ['live_location', 'arrival_only'],
    labels: { live_location: 'Share my live location with Sam', arrival_only: 'Send arrival time only' },
    title: 'Let Sam know',
    description: 'Your housemate Sam wants to know when the groceries will arrive.',
    privacyOption: 'arrival_only',
    dependsOn: null,
    account: { label: 'Live location with Sam', labels: { live_location: 'On', arrival_only: 'Off' } },
    ci: {
      sender: 'participant',
      recipient: 'housemate_sam',
      recipientType: 'personal',
      subject: 'participant',
      informationType: 'live_location',
      transmissionPrinciple: { aim: 'coordinate_with_housemate', condition: 'with_consent', temporal: 'until_delivery', consideration: null },
      statement: "Bramble shares the participant's live location (rather than only the arrival time) with their housemate, with consent, until the order arrives.",
    },
    nudged: { control: 'buttons', default: null, emphasis: 'live_location' },
    neutral: equalButtons,
  },
  {
    id: 'bg_between_orders',
    task: 3,
    screen: 'orders',
    kind: 'prompt',
    settleOn: 'choice',
    options: ['keep_on', 'turn_off'],
    labels: { keep_on: 'Keep it on', turn_off: 'Turn it off' },
    title: 'Keep background location on?',
    description:
      "Bramble can keep using your location in the background to speed up your next order, even when you don't have an order in progress.",
    privacyOption: 'turn_off',
    dependsOn: { flowId: 'bg_during_order', equals: 'allow' },
    account: { label: 'Background location between orders', labels: { keep_on: 'On', turn_off: 'Off' } },
    ci: {
      sender: 'participant',
      recipient: 'bramble',
      recipientType: 'first_party',
      subject: 'participant',
      informationType: 'background_location',
      transmissionPrinciple: { aim: 'speed_up_future_orders', condition: 'with_permission', temporal: 'ongoing', consideration: null },
      statement: "The participant's phone keeps sending Bramble their location in the background, with permission, even with no order in progress, to speed up future orders.",
    },
    nudged: { control: 'buttons', default: null, emphasis: 'keep_on' },
    neutral: equalButtons,
  },
  {
    id: 'deals_personalized',
    task: 4,
    screen: 'deals',
    kind: 'setting',
    settleOn: 'leave',
    options: ['on', 'off'],
    labels: { on: 'On', off: 'Off' },
    title: 'Deals picked for you',
    description: 'Bramble uses the stores you visit (your location history) to choose deals.',
    privacyOption: 'off',
    dependsOn: null,
    account: { label: 'Deals picked for you', labels: { on: 'On', off: 'Off' } },
    ci: {
      sender: 'bramble',
      recipient: 'bramble_deals',
      recipientType: 'first_party_secondary_use',
      subject: 'participant',
      informationType: 'location_history',
      transmissionPrinciple: { aim: 'personalized_deals', condition: 'with_consent', temporal: 'ongoing', consideration: null },
      statement: "Bramble uses the participant's location history (stores visited), with consent, to choose personalized deals.",
    },
    nudged: { control: 'switch', default: 'on', emphasis: null },
    neutral: unchecked('off'),
  },
  {
    id: 'deals_partner_offers',
    task: 4,
    screen: 'deals',
    kind: 'setting',
    settleOn: 'leave',
    options: ['on', 'off'],
    labels: { on: 'On', off: 'Off' },
    title: 'Offers from partner brands',
    description: 'Partner brands send you offers based on your location history.',
    privacyOption: 'off',
    dependsOn: null,
    account: { label: 'Offers from partner brands', labels: { on: 'On', off: 'Off' } },
    ci: {
      sender: 'bramble',
      recipient: 'partner_brands',
      recipientType: 'third_party_commercial',
      subject: 'participant',
      informationType: 'location_history',
      transmissionPrinciple: { aim: 'marketing_offers', condition: 'with_consent', temporal: 'ongoing', consideration: null },
      statement: "Bramble shares the participant's location history with partner brands, with consent, so they can send marketing offers.",
    },
    nudged: { control: 'switch', default: 'on', emphasis: null },
    neutral: unchecked('off'),
  },
  {
    id: 'reward_keel',
    task: 5,
    screen: 'rewards',
    kind: 'prompt',
    settleOn: 'choice',
    options: ['accept', 'decline'],
    labels: { accept: 'Link', decline: 'No thanks' },
    title: 'Keel Auto Insurance',
    description: 'Link your Bramble location history to Keel Auto for a safe-driving discount.',
    privacyOption: 'decline',
    dependsOn: null,
    points: 200,
    account: { label: 'Keel Auto Insurance', labels: { accept: 'Linked', decline: 'Not linked' } },
    ci: {
      sender: 'bramble',
      recipient: 'keel_auto_insurance',
      recipientType: 'third_party_commercial',
      subject: 'participant',
      informationType: 'location_history',
      transmissionPrinciple: { aim: 'insurance_pricing', condition: 'with_consent_for_payment', temporal: 'ongoing', consideration: { points: 200, usd: 0.20 } },
      statement: "Bramble shares the participant's location history with an auto insurer, with consent and in exchange for 200 points, for a safe-driving discount.",
    },
    nudged: { control: 'buttons', default: null, emphasis: 'accept' },
    neutral: equalButtons,
  },
  {
    id: 'reward_university',
    task: 5,
    screen: 'rewards',
    kind: 'prompt',
    settleOn: 'choice',
    options: ['accept', 'decline'],
    labels: { accept: 'Donate', decline: 'No thanks' },
    title: 'University traffic study',
    description: 'Donate your de-identified location history to a university traffic lab.',
    privacyOption: 'decline',
    dependsOn: null,
    points: 100,
    account: { label: 'University traffic study', labels: { accept: 'Donating', decline: 'Not donating' } },
    ci: {
      sender: 'bramble',
      recipient: 'university_traffic_lab',
      recipientType: 'third_party_research',
      subject: 'participant',
      informationType: 'deidentified_location_history',
      transmissionPrinciple: { aim: 'research', condition: 'with_consent_for_payment', temporal: 'ongoing', consideration: { points: 100, usd: 0.10 } },
      statement: "Bramble shares the participant's de-identified location history with a university traffic lab, with consent and in exchange for 100 points, for research.",
    },
    nudged: { control: 'buttons', default: null, emphasis: 'accept' },
    neutral: equalButtons,
  },
  {
    id: 'reward_data_partners',
    task: 5,
    screen: 'rewards',
    kind: 'prompt',
    settleOn: 'choice',
    options: ['accept', 'decline'],
    labels: { accept: 'Share', decline: 'No thanks' },
    title: 'Bramble data partners',
    description: 'Let Bramble share your location history with data partners for market research.',
    privacyOption: 'decline',
    dependsOn: null,
    points: 150,
    account: { label: 'Bramble data partners', labels: { accept: 'Sharing', decline: 'Not sharing' } },
    ci: {
      sender: 'bramble',
      recipient: 'data_partners',
      recipientType: 'third_party_commercial',
      subject: 'participant',
      informationType: 'location_history',
      transmissionPrinciple: { aim: 'market_research', condition: 'with_consent_for_payment', temporal: 'ongoing', consideration: { points: 150, usd: 0.15 } },
      statement: "Bramble shares the participant's location history with data partners, with consent and in exchange for 150 points, for market research.",
    },
    nudged: { control: 'buttons', default: null, emphasis: 'accept' },
    neutral: equalButtons,
  },
]

const BY_ID = new Map(FLOWS.map((f) => [f.id, f]))

export function getFlow(id: FlowId): FlowDef {
  const flow = BY_ID.get(id)
  if (!flow) throw new Error(`Unknown flow: ${id}`)
  return flow
}

export function levelOf(flow: FlowDef, friction: Friction): LevelDef {
  return flow[friction]
}

/** Whether a dependent flow applies, given the current values of the flows it depends on. */
export function isApplicable(id: FlowId, values: FlowValues): boolean {
  const dep = getFlow(id).dependsOn
  if (!dep) return true
  const parent = values[dep.flowId]
  if (parent === null) return false
  if (dep.equals !== undefined) return parent === dep.equals
  if (dep.notEquals !== undefined) return parent !== dep.notEquals
  return true
}

/** Flows whose applicability depends on the given flow. */
export function dependentsOf(id: FlowId): FlowId[] {
  return FLOWS.filter((f) => f.dependsOn?.flowId === id).map((f) => f.id)
}

export function emptyFlowValues(): FlowValues {
  return Object.fromEntries(FLOW_IDS.map((id) => [id, null])) as FlowValues
}
