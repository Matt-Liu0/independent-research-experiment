import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { setTimingScale } from '../bramble/timing'

// Loading delays and the order timeline run instantly in tests, unless a test turns them back on.
setTimingScale(0)

afterEach(() => {
  cleanup()
  setTimingScale(0)
})
