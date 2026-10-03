import type { DeviceOs } from '../study/types'

export interface SettingsQuestion {
  id: string
  text: string
  /** Where to look, per phone type. */
  help?: Partial<Record<'ios' | 'android', string>>
  options: { value: string; label: string }[]
  multiple?: boolean
  /** In a multi-select, picking this clears the others. */
  exclusive?: string
}

const couldntFind = { value: 'couldnt_find', label: "I couldn't find it" }

/** The protocol's settings check, word for word. */
export const SETTINGS_QUESTIONS: SettingsQuestion[] = [
  {
    id: 'q1',
    text: 'Which of these do you use at least once a month?',
    multiple: true,
    exclusive: 'none',
    options: [
      { value: 'grocery_delivery', label: 'Grocery or food delivery app' },
      { value: 'maps', label: 'Maps' },
      { value: 'weather', label: 'Weather' },
      { value: 'ride_hailing', label: 'Ride-hailing' },
      { value: 'none', label: 'None of these' },
    ],
  },
  {
    id: 'q2',
    text: 'Think of the grocery or food delivery app you use most. What is its location setting?',
    help: {
      ios: 'iPhone: Settings → Privacy & Security → Location Services → the app.',
      android:
        'Android: Settings → Location → App location permissions → the app (names vary; you can type "location" in the Settings search bar).',
    },
    options: [
      { value: 'never', label: 'Never' },
      { value: 'ask_next_time', label: 'Ask next time' },
      { value: 'while_using', label: 'While using the app' },
      { value: 'always', label: 'Always' },
      couldntFind,
      { value: 'dont_use_one', label: "I don't use one" },
    ],
  },
  {
    id: 'q3',
    text: 'On that same screen, is precise location on?',
    help: {
      ios: 'It’s called "Precise Location" on iPhone.',
      android: 'It’s called "Use precise location" on Android.',
    },
    options: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }, couldntFind],
  },
  {
    id: 'q4',
    text: 'Is any app on this phone allowed to use your location all the time?',
    help: {
      ios: 'On iPhone, the Location Services list shows "Always" next to those apps.',
      android: 'On Android, look for "Allowed all the time".',
    },
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    id: 'q5',
    text: 'Is personalized advertising turned on for this phone?',
    help: {
      ios: 'iPhone: Settings → Privacy & Security → Apple Advertising → Personalized Ads.',
      android: 'Android: search "ads" in Settings.',
    },
    options: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }, couldntFind],
  },
  {
    id: 'q6',
    text: 'In the web browser you use most, have you turned on a setting that tells websites not to sell or share your data (for example, Global Privacy Control)?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'dont_know', label: "I don't know what that is" },
    ],
  },
  {
    id: 'q7',
    text: 'Did you change any of these settings while answering?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
]

/** Help text for this phone; both versions when the OS is unknown. */
export function helpFor(question: SettingsQuestion, os: DeviceOs): string[] {
  if (!question.help) return []
  if (os === 'ios' || os === 'android') return question.help[os] ? [question.help[os]] : []
  return Object.values(question.help)
}
