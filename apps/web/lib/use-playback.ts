'use client'

/**
 * Stepping and playing a trace.
 *
 * The transport bar is deliberately effect-free (§10.1) — it renders controls
 * and reports intent, and something else owns the clock. This is that something
 * else, extracted so the simulator, the conversion stepper and the closure lab
 * do not each grow their own slightly different notion of "playing".
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Trace } from '@tape-n-trace/engine'

/** Milliseconds per step at 1×. Slow enough to read the narration. */
const BASE_INTERVAL = 1100

export interface Playback {
  stepIndex: number
  stepCount: number
  playing: boolean
  speed: number
  atEnd: boolean
  setStepIndex: (index: number) => void
  setPlaying: (playing: boolean) => void
  setSpeed: (speed: number) => void
  jumpToEnd: () => void
}

export function usePlayback(trace: Trace | null): Playback {
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const stepCount = trace?.steps.length ?? 0
  const atEnd = stepIndex >= stepCount - 1

  // A new trace means the scrubber must go back to the start, or it would be
  // pointing at a step index that belongs to the previous machine.
  useEffect(() => {
    setStepIndex(0)
    setPlaying(false)
  }, [trace])

  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!playing || stepCount === 0) return
    if (atEnd) {
      setPlaying(false)
      return
    }
    timer.current = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, stepCount - 1))
    }, BASE_INTERVAL / speed)
    return () => {
      if (timer.current !== null) clearInterval(timer.current)
    }
  }, [playing, speed, stepCount, atEnd])

  const seek = useCallback(
    (index: number) => setStepIndex(Math.min(Math.max(0, index), Math.max(0, stepCount - 1))),
    [stepCount],
  )
  const jumpToEnd = useCallback(() => seek(stepCount - 1), [seek, stepCount])

  return {
    stepIndex,
    stepCount,
    playing,
    speed,
    atEnd,
    setStepIndex: seek,
    setPlaying,
    setSpeed,
    jumpToEnd,
  }
}
