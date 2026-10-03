import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-bramble.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-bramble',
  appId: env.VITE_FIREBASE_APP_ID || 'demo-app-id',
}

/** demo-* project IDs only exist in the emulator, so they always use it. */
export const usesEmulators = env.VITE_USE_EMULATORS === 'true' || firebaseConfig.projectId.startsWith('demo-')

let instance: { app: FirebaseApp; db: Firestore; auth: Auth } | null = null

/** Created on first use, so tests and demo mode never touch Firebase. */
export function getFirebase() {
  if (instance) return instance
  const app = initializeApp(firebaseConfig)
  // Offline cache: writes made with no signal are queued and sent when it returns.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  const auth = getAuth(app)
  if (usesEmulators) {
    const host = window.location.hostname
    connectFirestoreEmulator(db, host, 8080)
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  }
  instance = { app, db, auth }
  return instance
}
