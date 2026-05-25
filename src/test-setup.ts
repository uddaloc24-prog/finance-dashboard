// Vitest test setup. Only applies to files running in jsdom (component
// tests opt in with `// @vitest-environment jsdom` at the top, so the
// engine tests stay in node). Adds jest-dom matchers, cleans up the
// DOM after each test, and wipes localStorage between tests so quiz
// state doesn't bleed across cases.

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear()
  }
})
