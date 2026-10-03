// The participant's first name or nickname is only used to greet them in the app.
// It stays on the phone (localStorage) and is never sent to Firestore.

const KEY = 'bramble.name'
let fallback = ''

export function getName(): string {
  try {
    return localStorage.getItem(KEY) ?? fallback
  } catch {
    return fallback
  }
}

export function setName(name: string): void {
  fallback = name
  try {
    localStorage.setItem(KEY, name)
  } catch {
    // Private mode or storage blocked: keep it in memory for this visit.
  }
}
