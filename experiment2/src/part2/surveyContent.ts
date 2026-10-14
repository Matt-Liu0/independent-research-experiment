// Recall check and background survey content (protocol, Part 2).

/** Recall questions, three per app as matched pairs. `flowId` and each option's `value` let the export score recall against the site. */
export interface RecallQuestion {
  id: string
  flowId: string
  text: string
  options: { label: string; value: string | null }[]
}

const DONT_REMEMBER = { label: "I don't remember", value: null }

export const RECALL_QUESTIONS: RecallQuestion[] = [
  {
    id: 'recall_store_location',
    flowId: 'store_location',
    text: 'When Bramble asked to use your location to find stores, what did you choose?',
    options: [
      { label: 'Allowed while using the app', value: 'while_using' },
      { label: 'Allowed once', value: 'once' },
      { label: "Didn't allow", value: 'dont_allow' },
      DONT_REMEMBER,
    ],
  },
  {
    id: 'recall_health_access',
    flowId: 'stride_health_access',
    text: 'When Stride asked to read your heart rate, sleep and activity, what did you choose?',
    options: [
      { label: 'Allowed while using the app', value: 'while_using' },
      { label: 'Allowed once', value: 'once' },
      { label: "Didn't allow", value: 'dont_allow' },
      DONT_REMEMBER,
    ],
  },
  {
    id: 'recall_sam_share',
    flowId: 'sam_share',
    text: 'How did you let Sam know when your Bramble order would arrive?',
    options: [
      { label: 'Shared my live location', value: 'live_location' },
      { label: 'Sent the arrival time only', value: 'arrival_only' },
      DONT_REMEMBER,
    ],
  },
  {
    id: 'recall_stride_sam_share',
    flowId: 'stride_sam_share',
    text: 'How did you let Sam know how your Stride workout was going?',
    options: [
      { label: 'Shared my live workout', value: 'live_workout' },
      { label: 'Sent a summary only', value: 'summary_only' },
      DONT_REMEMBER,
    ],
  },
  {
    id: 'recall_data_partners',
    flowId: 'reward_data_partners',
    text: "On Bramble's Rewards page, did you accept the offer to share your location history with data partners?",
    options: [{ label: 'Accepted', value: 'accept' }, { label: 'Declined', value: 'decline' }, DONT_REMEMBER],
  },
  {
    id: 'recall_stride_data_partners',
    flowId: 'stride_reward_data_partners',
    text: "On Stride's Rewards page, did you accept the offer to share your activity history with data partners?",
    options: [{ label: 'Accepted', value: 'accept' }, { label: 'Declined', value: 'decline' }, DONT_REMEMBER],
  },
]

/**
 * IUIPC (Malhotra, Kim & Agarwal, 2004): control (3), awareness (3), collection (4), 7-point
 * agreement. CHECK THE WORDING AGAINST THE PAPER'S APPENDIX BEFORE LAUNCH.
 */
export const IUIPC_ITEMS: { dimension: 'control' | 'awareness' | 'collection'; text: string }[] = [
  {
    dimension: 'control',
    text: "Consumer online privacy is really a matter of consumers' right to exercise control and autonomy over decisions about how their information is collected, used, and shared.",
  },
  { dimension: 'control', text: 'Consumer control of personal information lies at the heart of consumer privacy.' },
  {
    dimension: 'control',
    text: 'I believe that online privacy is invaded when control is lost or unwillingly reduced as a result of a marketing transaction.',
  },
  { dimension: 'awareness', text: 'Companies seeking information online should disclose the way the data are collected, processed, and used.' },
  { dimension: 'awareness', text: 'A good consumer online privacy policy should have a clear and conspicuous disclosure.' },
  { dimension: 'awareness', text: 'It is very important to me that I am aware and knowledgeable about how my personal information will be used.' },
  { dimension: 'collection', text: 'It usually bothers me when online companies ask me for personal information.' },
  { dimension: 'collection', text: 'When online companies ask me for personal information, I sometimes think twice before providing it.' },
  { dimension: 'collection', text: 'It bothers me to give personal information to so many online companies.' },
  { dimension: 'collection', text: "I'm concerned that online companies are collecting too much personal information about me." },
]

export const AGE_RANGES = ['18–24', '25–34', '35–44', '45–54', '55–64', '65 or older', 'Prefer not to say']
export const GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer to self-describe', 'Prefer not to say']
export const AI_USE = ['Never', 'Less than once a month', 'About once a month', 'About once a week', 'Every day or almost every day']
