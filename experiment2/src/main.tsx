import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui.css'
import { installVisibilityLogging, logEvent } from './log/logEvent'
import { ErrorBoundary } from './study/ErrorBoundary'
import { getFirebase } from './study/firebase'
import { FirestoreStore, collectionNames } from './study/firestoreStore'
import { parseEntry } from './study/prolific'
import { MemoryStore, type StudyStore } from './study/store'
import { StudyApp } from './study/StudyApp'

const entry = parseEntry(window.location.search)

function createStore(): StudyStore {
  if (entry.mode === 'demo') return new MemoryStore({ friction: entry.demoFriction ?? undefined })
  const { db, auth } = getFirebase()
  return new FirestoreStore(db, auth, collectionNames(entry.mode === 'pilot'))
}

const store = createStore()

installVisibilityLogging()
window.addEventListener('error', (e) => logEvent('error', { where: 'window', message: String(e.message) }))
window.addEventListener('unhandledrejection', (e) =>
  logEvent('error', { where: 'promise', message: String(e.reason) }),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <StudyApp entry={entry} store={store} />
    </ErrorBoundary>
  </StrictMode>,
)
