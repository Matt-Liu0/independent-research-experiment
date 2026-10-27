/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the regional US map files (PMTiles) are, in our Cloud Storage bucket; unset = default neighborhood only. */
  readonly VITE_MAP_BASE_URL?: string
}

/** Set at build time from package.json; stamped on every participant record. */
declare const __APP_VERSION__: string
