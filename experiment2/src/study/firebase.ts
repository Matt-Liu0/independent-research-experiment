import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions'

const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-bramble.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-bramble',
  appId: env.VITE_FIREBASE_APP_ID || 'demo-app-id',
}

/** demo-* project IDs only exist in the emulator, so they always use it. */
export const usesEmulators = env.VITE_USE_EMULATORS === 'true' || firebaseConfig.projectId.startsWith('demo-')

let instance: { app: FirebaseApp; db: Firestore; auth: Auth; functions: Functions } | null = null

/** Created on first use, so tests and demo mode never touch Firebase. */
export function getFirebase() {
  if (instance) return instance
  const app = initializeApp(firebaseConfig)
  // Offline cache: writes made with no signal are queued and sent when it returns.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  const auth = getAuth(app)
  // The Part 2 interviewer (functions/). Same region as the function's default.
  const functions = getFunctions(app, 'us-central1')
  if (usesEmulators) {
    const host = window.location.hostname
    connectFirestoreEmulator(db, host, 8080)
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
    connectFunctionsEmulator(functions, host, 5001)
  }
  instance = { app, db, auth, functions }
  return instance
}
