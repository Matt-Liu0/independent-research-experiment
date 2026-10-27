/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The US map file (PMTiles) in our Cloud Storage bucket; unset = default neighborhood only. */
  readonly VITE_MAP_ARCHIVE_URL?: string
}

/** Set at build time from package.json; stamped on every participant record. */
declare const __APP_VERSION__: string
