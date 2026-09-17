'use client'

import { useEffect, useState } from 'react'
import type { FiniteAutomaton } from '@tape-n-trace/engine'

/**
 * Keeps a drawn machine in `localStorage` so a reload does not wipe the board.
 *
 * Nothing is read during render: the server has no storage, and a board that
 * rendered differently on the client would not hydrate. The saved machine is
 * loaded once after mount (through `reset`, so it is not an undo step), and
 * every machine after that is written back. Storage can be missing or full —
 * a private window, blocked site data — and the board then just doesn't persist.
 */
export function useStoredMachine(
  key: string | undefined,
  machine: FiniteAutomaton,
  reset: (next: FiniteAutomaton) => void,
): void {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (key === undefined) return
    const saved = read(key)
    if (saved !== null) reset({ ...saved, alphabet: [...new Set([...machine.alphabet, ...saved.alphabet])] })
    setLoaded(true)
    // Load once per key; the alphabet merged in is the initial machine's, so
    // chips added since the drawing was saved still show.
  }, [key, reset])

  useEffect(() => {
    if (key === undefined || !loaded) return
    try {
      window.localStorage.setItem(key, JSON.stringify(machine))
    } catch {
      // Storage unavailable or full: keep drawing, just unsaved.
    }
  }, [key, loaded, machine])
}

function read(key: string): FiniteAutomaton | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
    return isMachine(value) ? value : null
  } catch {
    return null
  }
}

function isMachine(value: unknown): value is FiniteAutomaton {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Record<string, unknown>
  const strings = (v: unknown): boolean => Array.isArray(v) && v.every((s) => typeof s === 'string')
  return (
    (m.kind === 'DFA' || m.kind === 'NFA' || m.kind === 'ENFA') &&
    strings(m.states) &&
    strings(m.alphabet) &&
    strings(m.accepting) &&
    typeof m.start === 'string' &&
    Array.isArray(m.transitions) &&
    (m.layout === undefined || (typeof m.layout === 'object' && m.layout !== null))
  )
}
