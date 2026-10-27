import { useRef } from 'react'

/** "How easy was that task?" 1 (very hard) to 7 (very easy). One tap answers and moves on. */
export function EaseRating({ taskNumber, total, onSubmit }: { taskNumber: number; total: number; onSubmit: (value: number) => void }) {
  // A second tap before the next page appears must not count twice.
  const answered = useRef(false)
  const choose = (n: number) => {
    if (answered.current) return
    answered.current = true
    onSubmit(n)
  }
  return (
    <main className="page">
      <p className="eyebrow">
        Task {taskNumber} of {total} done
      </p>
      <h1 id="ease-q">How easy was that task?</h1>
      <div className="scale" role="radiogroup" aria-labelledby="ease-q">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={false} className="scale-point" onClick={() => choose(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="scale-anchors muted small">
        <span>1 = very hard</span>
        <span>7 = very easy</span>
      </div>
    </main>
  )
}
