// A phone home screen between the task card and the app: each task starts by tapping the app's
// icon, as on a real phone. Only the study apps open; the other icons are decoration. The same
// for everyone and in both friction levels.
import { useEffect, useState, type ReactNode } from 'react'
import type { AppId } from '../core/flowTypes'
import { logEvent } from '../log/logEvent'
import { APP_NAMES } from './apps'

interface Props {
  /** The app this task uses: the only icon that opens. */
  app: AppId
  /** Study apps installed so far (the second appears when its first task starts). */
  installed: AppId[]
  /** Marks this app "new" (just installed). */
  isNew: boolean
  /** Shows "Tap … to open it" (each app's first task). */
  hint: boolean
  onOpen: () => void
}

const STUDY_ICONS: Record<AppId, { color: string; glyph: ReactNode }> = {
  bramble: {
    color: '#2f6b4f',
    glyph: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9h12l-1.2 10H7.2z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 9a3 3 0 0 1 6 0" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M12 3c2 0 3 1 3 3-2 0-3-1-3-3z" fill="#bfe3c9" />
      </svg>
    ),
  },
  stride: {
    color: '#2563a8',
    glyph: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 13h4l2-5 3 10 2-6 2 1h5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
}

/** Decorative icons: generic names, simple shapes, no real brands. */
const OTHER_ICONS: { name: string; color: string; glyph: ReactNode }[] = [
  { name: 'Messages', color: '#34a853', glyph: <path d="M5 6h14v9H10l-4 3v-3H5z" fill="#fff" /> },
  { name: 'Camera', color: '#5f6368', glyph: <><rect x="4" y="8" width="16" height="11" rx="2" fill="#fff" /><circle cx="12" cy="13.5" r="3" fill="#5f6368" /><rect x="9" y="5.5" width="6" height="3" rx="1" fill="#fff" /></> },
  { name: 'Photos', color: '#f4b400', glyph: <><circle cx="9" cy="9" r="2" fill="#fff" /><path d="M4 18l5-5 3 3 3-4 5 6z" fill="#fff" /></> },
  { name: 'Weather', color: '#4a90d9', glyph: <><circle cx="10" cy="10" r="3.5" fill="#ffd54f" /><path d="M8 18h9a3 3 0 0 0 0-6 4 4 0 0 0-7.5 1A2.5 2.5 0 0 0 8 18z" fill="#fff" /></> },
  { name: 'Maps', color: '#7cb342', glyph: <path d="M12 4a5 5 0 0 1 5 5c0 4-5 10-5 10S7 13 7 9a5 5 0 0 1 5-5zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="#fff" /> },
  { name: 'Notes', color: '#fbc02d', glyph: <><rect x="6" y="4" width="12" height="16" rx="2" fill="#fff" /><path d="M9 9h6M9 12h6M9 15h4" stroke="#fbc02d" strokeWidth="1.5" /></> },
  { name: 'Clock', color: '#263238', glyph: <><circle cx="12" cy="12" r="7" fill="#fff" /><path d="M12 8v4l3 2" stroke="#263238" strokeWidth="1.6" fill="none" strokeLinecap="round" /></> },
  { name: 'Settings', color: '#8e8e93', glyph: <><circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="3 2" /><circle cx="12" cy="12" r="2.5" fill="#fff" /></> },
]

const DOCK: { name: string; color: string; glyph: ReactNode }[] = [
  { name: 'Phone', color: '#34a853', glyph: <path d="M8 4l2 4-2 2a10 10 0 0 0 6 6l2-2 4 2-1 3c-8 0-14-6-14-14z" fill="#fff" /> },
  { name: 'Browser', color: '#1e88e5', glyph: <><circle cx="12" cy="12" r="7" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M5 12h14M12 5c3 3 3 11 0 14M12 5c-3 3-3 11 0 14" stroke="#fff" strokeWidth="1.4" fill="none" /></> },
  { name: 'Mail', color: '#e53935', glyph: <><rect x="4" y="7" width="16" height="11" rx="1.5" fill="#fff" /><path d="M4.5 7.5l7.5 6 7.5-6" stroke="#e53935" strokeWidth="1.5" fill="none" /></> },
  { name: 'Music', color: '#ec407a', glyph: <path d="M15 5v9.5a2.5 2.5 0 1 1-1.5-2.3V7.5L9 8.5v7a2.5 2.5 0 1 1-1.5-2.3V7z" fill="#fff" /> },
]

function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function HomeScreen({ app, installed, isNew, hint, onOpen }: Props) {
  const now = useClock()
  const [nudge, setNudge] = useState(false)

  const tapOther = (name: string) => {
    logEvent('task', { event: 'home_tap', target: name })
    // A tap on another icon gently points at the right one.
    setNudge(true)
    setTimeout(() => setNudge(false), 900)
  }

  const studyIcon = (id: AppId) => {
    const { color, glyph } = STUDY_ICONS[id]
    const name = APP_NAMES[id]
    const opens = id === app
    return (
      <button
        key={id}
        type="button"
        aria-label={name}
        className={`home-app ${opens && nudge ? 'home-app-nudge' : ''}`}
        onClick={() => {
          if (!opens) return tapOther(name)
          logEvent('task', { event: 'app_opened', app: id })
          onOpen()
        }}
      >
        <span className="home-icon" style={{ background: color }}>
          {glyph}
          {opens && isNew && <span className="home-new-dot" aria-hidden="true" />}
        </span>
        <span className="home-label">{opens && isNew ? `• ${name}` : name}</span>
      </button>
    )
  }

  const decorIcon = ({ name, color, glyph }: { name: string; color: string; glyph: ReactNode }, label = true) => (
    <button key={name} type="button" className="home-app" aria-label={name} onClick={() => tapOther(name)}>
      <span className="home-icon" style={{ background: color }}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {glyph}
        </svg>
      </span>
      {label && <span className="home-label">{name}</span>}
    </button>
  )

  return (
    <div className="home-screen">
      <div className="home-widget" aria-hidden="true">
        <div className="home-time">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
        <div className="home-date">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      </div>
      <div className="home-grid">
        {OTHER_ICONS.slice(0, 4).map((i) => decorIcon(i))}
        {installed.map(studyIcon)}
        {OTHER_ICONS.slice(4).map((i) => decorIcon(i))}
      </div>
      <div className="home-spacer" />
      {hint && <p className="home-hint">Tap {APP_NAMES[app]} to open it</p>}
      <div className="home-dock">{DOCK.map((i) => decorIcon(i, false))}</div>
    </div>
  )
}
