import type { ReactNode } from 'react'

/** A full-page message, used for blocked entry, errors and the end of the study. */
export function Message({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="page">
      <h1>{title}</h1>
      {children}
    </main>
  )
}
