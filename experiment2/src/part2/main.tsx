import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import '../ui.css'
import './part2.css'
import { installVisibilityLogging, logEvent } from '../log/logEvent'
import { ErrorBoundary } from '../study/ErrorBoundary'
import { getFirebase } from '../study/firebase'
import { parsePart2Entry } from './entry'
import { CallableInterviewer, ScriptedInterviewer, type Interviewer } from './interviewer'
import { Part2App } from './Part2App'
import { FirestorePart2Store, MemoryPart2Store, type Part2Store } from './store'

const entry = parsePart2Entry(window.location.search)

function createStore(): Part2Store {
  if (entry.mode === 'demo') return new MemoryPart2Store()
  const { db, auth } = getFirebase()
  return new FirestorePart2Store(db, auth, entry.mode === 'pilot')
}

/** Demo replies wait about as long as the real model (Sonnet, a short reply: 1 to 2 seconds). */
const DEMO_THINK_MS = 1500

function createInterviewer(): Interviewer {
  if (entry.mode === 'demo') return new ScriptedInterviewer(entry.arm, DEMO_THINK_MS)
  return new CallableInterviewer(getFirebase().functions, entry.mode === 'pilot', entry.arm)
}

const store = createStore()
const interviewer = createInterviewer()
installVisibilityLogging()
window.addEventListener('error', (e) => logEvent('error', { where: 'window', message: String(e.message) }))
window.addEventListener('unhandledrejection', (e) => logEvent('error', { where: 'promise', message: String(e.reason) }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Part2App entry={entry} store={store} interviewer={interviewer} />
    </ErrorBoundary>
  </StrictMode>,
)
