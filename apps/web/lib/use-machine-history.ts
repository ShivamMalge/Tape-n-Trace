'use client'

/**
 * Undo/redo for the machine editor.
 *
 * A past/present/future stack of whole machines. That is affordable precisely
 * because the edit operations are immutable and share structure — an undo entry
 * is a handful of new arrays plus references to everything that did not change,
 * not a deep copy of the automaton.
 *
 * Dragging a state would otherwise push one entry per pointer move, so a commit
 * can be marked `coalesce`: consecutive commits with the same coalesce key
 * replace one another instead of stacking. One drag becomes one undo.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { FiniteAutomaton } from '@tape-n-trace/engine'

const LIMIT = 100

interface History {
  past: FiniteAutomaton[]
  present: FiniteAutomaton
  future: FiniteAutomaton[]
}

export interface CommitOptions {
  /**
   * Consecutive commits sharing a key collapse into one undo entry. Use it for
   * anything continuous — a drag, a label being typed a character at a time.
   */
  coalesce?: string
}

export interface MachineHistory {
  machine: FiniteAutomaton
  commit: (next: FiniteAutomaton, options?: CommitOptions) => void
  /** Replace the machine and clear the history, as loading a new one does. */
  reset: (next: FiniteAutomaton) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function useMachineHistory(initial: FiniteAutomaton): MachineHistory {
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] })
  const lastCoalesceKey = useRef<string | null>(null)

  const commit = useCallback((next: FiniteAutomaton, options: CommitOptions = {}) => {
    const key = options.coalesce ?? null
    const continuing = key !== null && key === lastCoalesceKey.current
    lastCoalesceKey.current = key

    setHistory((current) => {
      if (next === current.present) return current

      // Continuing the same gesture: overwrite the present rather than pushing.
      const past = continuing ? current.past : [...current.past, current.present].slice(-LIMIT)
      return { past, present: next, future: [] }
    })
  }, [])

  const reset = useCallback((next: FiniteAutomaton) => {
    lastCoalesceKey.current = null
    setHistory({ past: [], present: next, future: [] })
  }, [])

  const undo = useCallback(() => {
    lastCoalesceKey.current = null
    setHistory((current) => {
      const previous = current.past.at(-1)
      if (previous === undefined) return current
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    lastCoalesceKey.current = null
    setHistory((current) => {
      const next = current.future[0]
      if (next === undefined) return current
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      }
    })
  }, [])

  return useMemo(
    () => ({
      machine: history.present,
      commit,
      reset,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    }),
    [history, commit, reset, undo, redo],
  )
}
