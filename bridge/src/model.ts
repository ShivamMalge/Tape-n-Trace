/**
 * The slice of anywidget's model the bridge uses — written out rather than
 * imported so the bridge carries no dependency for four method signatures.
 * https://anywidget.dev — the contract is stable and documented.
 */

import type { Trace } from '@tape-n-trace/engine'

export interface AnyModel {
  get(key: string): unknown
  set(key: string, value: unknown): void
  save_changes(): void
  on(event: string, callback: () => void): void
  off?(event: string, callback: () => void): void
}

export interface WidgetState {
  payload: Record<string, unknown> | null
  trace: Trace | null
  step: number
  options: Record<string, unknown>
}

/** The four synced traits — documentation.md §4. */
export const TRAITS = ['payload', 'trace', 'step', 'options'] as const

export function readState(model: AnyModel): WidgetState {
  const payload = model.get('payload')
  const trace = model.get('trace')
  const step = model.get('step')
  const options = model.get('options')
  return {
    payload: typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : null,
    trace: typeof trace === 'object' && trace !== null && 'steps' in (trace as object) ? (trace as Trace) : null,
    step: typeof step === 'number' && Number.isFinite(step) ? step : 0,
    options: typeof options === 'object' && options !== null ? (options as Record<string, unknown>) : {},
  }
}
