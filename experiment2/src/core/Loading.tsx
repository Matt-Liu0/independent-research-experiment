// Loading visuals: screen skeletons, the task-start splash, and inline spinners.

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  )
}

/** Gray placeholder shapes shown while a screen "loads". */
export function ScreenSkeleton() {
  return (
    <section className="screen" aria-busy="true" aria-label="Loading">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-block" />
      <div className="skeleton skeleton-row" />
      <div className="skeleton skeleton-row" />
      <div className="skeleton skeleton-row" />
    </section>
  )
}

/** Shown in place of a section while something loads, e.g. "Finding stores near you…". */
export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="loading-block" aria-busy="true">
      <Spinner label={label} />
    </div>
  )
}

/** The app "opening" at the start of each task. */
export function Splash({ name = 'Bramble' }: { name?: string }) {
  return (
    <div className="splash" aria-busy="true" aria-label={`Opening ${name}`}>
      <span className="logo splash-logo">{name.toLowerCase()}</span>
      <Spinner />
    </div>
  )
}
