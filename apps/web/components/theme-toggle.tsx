'use client'

/**
 * The theme switch — the design ships two themes (artboards 00 and 06).
 *
 * Writes `data-tnt-theme` on `<html>`, which is the attribute `tokens.css`
 * keys the dark and light palettes on; "system" removes it and lets
 * `prefers-color-scheme` decide. The choice persists in `localStorage`, and
 * the inline script in `layout.tsx` applies it before first paint so a dark
 * reader never sees a light flash. A `?theme=` query sets and persists the
 * same choice, which is how screenshots are taken in either theme.
 */

import { useEffect, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'

const ORDER: Theme[] = ['system', 'light', 'dark']
const LABEL: Record<Theme, string> = { system: 'Auto', light: 'Light', dark: 'Dark' }

export const THEME_KEY = 'tnt-theme'

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset['tntTheme']
  else root.dataset['tntTheme'] = theme
}

export function ThemeToggle(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_KEY)
      if (stored === 'light' || stored === 'dark') setTheme(stored)
    } catch {
      /* storage may be unavailable; the toggle still works for the session */
    }
  }, [])

  const cycle = (): void => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] as Theme
    setTheme(next)
    applyTheme(next)
    try {
      if (next === 'system') window.localStorage.removeItem(THEME_KEY)
      else window.localStorage.setItem(THEME_KEY, next)
    } catch {
      /* see above */
    }
  }

  return (
    <button
      type="button"
      className="tnt-theme-btn"
      onClick={cycle}
      aria-label={`Theme: ${LABEL[theme]}. Switch theme`}
      title="Switch theme"
    >
      <span aria-hidden="true" className="tnt-theme-dot" />
      {LABEL[theme]}
    </button>
  )
}
