import { useState } from 'react'

/** "How easy was that task?" 1 (very hard) to 7 (very easy). */
export function EaseRating({ taskNumber, total, onSubmit }: { taskNumber: number; total: number; onSubmit: (value: number) => void }) {
  const [value, setValue] = useState<number | null>(null)
  return (
    <main className="page">
      <p className="eyebrow">
        Task {taskNumber} of {total} done
      </p>
      <h1 id="ease-q">How easy was that task?</h1>
      <div className="scale" role="radiogroup" aria-labelledby="ease-q">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            className="scale-point"
            onClick={() => setValue(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="scale-anchors muted small">
        <span>1 = very hard</span>
        <span>7 = very easy</span>
      </div>
      <div className="page-spacer" />
      <button type="button" className="btn btn-study" disabled={value === null} onClick={() => value !== null && onSubmit(value)}>
        Continue
      </button>
    </main>
  )
}
