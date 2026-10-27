import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui.css'
import { installVisibilityLogging, logEvent } from './log/logEvent'
import { createAgentStore, exposeAgentApi } from './study/agentMode'
import { installBackGuard } from './study/backGuard'
import { ErrorBoundary } from './study/ErrorBoundary'
import { getFirebase } from './study/firebase'
import { FirestoreStore, collectionNames } from './study/firestoreStore'
import { setName } from './study/name'
import { parseEntry } from './study/entry'
import { MemoryStore, type StudyStore } from './study/store'
import { StudyApp } from './study/StudyApp'

const entry = parseEntry(window.location.search)

function createStore(): StudyStore {
  if (entry.mode === 'agent' && entry.agent) {
    const store = createAgentStore(entry.agent)
    exposeAgentApi(store, entry.agent)
    if (entry.agent.name) setName(entry.agent.name)
    return store
  }
  if (entry.mode === 'agent') return new MemoryStore()
  if (entry.mode === 'demo') return new MemoryStore({ pattern: entry.demoPattern ?? undefined, appOrder: entry.demoAppOrder ?? undefined })
  const { db, auth } = getFirebase()
  return new FirestoreStore(db, auth, collectionNames(entry.mode === 'pilot'))
}

const store = createStore()

installVisibilityLogging()
installBackGuard()
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
