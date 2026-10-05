import { useEffect, useId, useRef, type ReactNode } from 'react'

let openSheets = 0

/** A prompt sheet is on screen; Back must not close it (prompts can't be dismissed). */
export function isSheetOpen(): boolean {
  return openSheets > 0
}

/**
 * Bottom sheet that can't be dismissed: no drag handle, no tap-outside, no Escape.
 * It closes only when the screen stops rendering it (after a choice).
 */
export function Sheet({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus()
    openSheets++
    return () => {
      openSheets--
    }
  }, [])

  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={ref}>
        <div className="sheet-icon">{icon}</div>
        <h2 id={titleId} className="sheet-title">
          {title}
        </h2>
        <p className="sheet-description">{description}</p>
        {children}
      </div>
    </div>
  )
}
