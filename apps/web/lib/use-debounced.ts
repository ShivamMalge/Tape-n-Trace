'use client'

import { useEffect, useState } from 'react'

/**
 * The value, once it has stopped changing for `delay` milliseconds.
 *
 * The RE playground rebuilds a parse tree, a Thompson ε-NFA, a minimal DFA and a
 * membership table on every keystroke. Doing that per character is wasted work
 * on the way to an expression that is usually unparseable mid-typing — `(0+`
 * is an error the student is about to fix, not one worth reporting.
 */
export function useDebounced<T>(value: T, delay = 250): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
