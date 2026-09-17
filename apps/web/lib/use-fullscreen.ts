'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Full screen for one element — the classroom board on a projector.
 *
 * Uses the Fullscreen API where the browser has it. Where it does not (iPhone
 * Safari) or refuses, `fullscreen` is still set and the element's CSS fills the
 * viewport with a fixed layout instead; Esc or the same toggle leaves either.
 */
export function useFullscreen<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>
  fullscreen: boolean
  toggle: () => void
} {
  const ref = useRef<T>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const sync = (): void => setFullscreen(ref.current !== null && document.fullscreenElement === ref.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggle = useCallback(() => {
    const element = ref.current
    if (element === null) return
    if (document.fullscreenElement === element) {
      void document.exitFullscreen().catch(() => setFullscreen(false))
    } else if (fullscreen) {
      // In the CSS fallback — including after the browser refused the API —
      // leaving must not ask for full screen again.
      setFullscreen(false)
    } else if (document.fullscreenEnabled && typeof element.requestFullscreen === 'function') {
      element.requestFullscreen().catch(() => setFullscreen(true))
    } else {
      setFullscreen(true)
    }
  }, [fullscreen])

  // The CSS fallback has no browser-provided exit, so Esc is wired by hand.
  useEffect(() => {
    if (!fullscreen || (document.fullscreenElement ?? null) !== null) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fullscreen])

  return { ref, fullscreen, toggle }
}
