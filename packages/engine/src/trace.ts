/**
 * The trace protocol — architecture.md §5 and ADR-001.
 *
 * Every algorithm in the engine returns a trace, not just an answer. This file
 * is how one gets built, frozen, and put on the wire.
 *
 * ADR-001 in one sentence: a snapshot is *logically* the complete artifact,
 * *physically* shared with the previous step, and frozen so that an accidental
 * mutation of a shared substructure fails loudly instead of corrupting history.
 */

import { EngineInvariantError } from './result.js'
import type { Highlight, Step, Trace, TraceKind, TraceMeta, TraceResult } from './types.js'

/**
 * Stamped into every trace so a replayed or graded trace records which engine
 * produced it. `test/version.test.ts` asserts this matches package.json.
 */
export const ENGINE_VERSION = '0.1.0'

/**
 * Size guards — architecture.md §9. These are guards, not performance targets:
 * clarity of the trace beats speed, and no optimisation happens beyond them.
 * Every guard that fires sets `meta.truncated`. A silent cap is a defect.
 */
export const LIMITS = {
  /** Warn past this; subset construction offers reachable-only mode. */
  FA_STATES: 200,
  /** Hard stop — this is the pedagogical point of Hopcroft 2.3.6. */
  SUBSET_STATES: 2 ** 12,
  /** PDA / TM simulation, and any other unbounded search over configurations. */
  SIMULATION_STEPS: 10_000,
  CFG_PRODUCTIONS: 300,
  SEARCH_DEPTH: 100,
  /**
   * The most steps any one trace will narrate.
   *
   * Separate from the caps above, and for a different reason. Those bound how
   * big an *object* the engine will build; this bounds how much of the building
   * it will describe. Every step carries a complete snapshot (§5), so a trace of
   * n steps over an artifact of n parts costs O(n²) — at the 2^12 subset cap
   * that is millions of entries and a trace `JSON.stringify` cannot even
   * represent, which is the blow-up ADR-001 predicts.
   *
   * Past this, the algorithm keeps running and still reports its real result;
   * it simply stops emitting per-step snapshots and says so in `meta.truncated`.
   * Nobody scrubs four thousand steps anyway — the value of the exponential case
   * is watching it start to explode and being told how far it went.
   */
  TRACE_STEPS: 300,
  /** Applies to the serialised form, per ADR-001. */
  TRACE_BYTES: 5 * 1024 * 1024,
} as const

/** Text a narration must never ship with. Checked in development and in tests. */
const PLACEHOLDER_MARKERS = ['TODO', 'FIXME', 'XXX', 'lorem ipsum', '<placeholder>']

function isDev(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return env?.['NODE_ENV'] !== 'production'
}

/**
 * Freeze an artifact and everything it holds.
 *
 * Already-frozen substructures are skipped, which is what makes ADR-001 work:
 * step *n*'s snapshot shares most of its structure with step *n-1*'s, that
 * shared part is already frozen, and so freezing costs O(what changed) rather
 * than O(whole artifact) per step. It also makes cycles safe.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Object.isFrozen(value)) return value

  Object.freeze(value)
  for (const key of Object.keys(value as object)) {
    deepFreeze((value as Record<string, unknown>)[key])
  }
  return value
}

export interface StepInput<TSnapshot> {
  narration: string
  snapshot: TSnapshot
  highlight?: Highlight[]
  /** Hopcroft 2e section or theorem, e.g. "2.3.5, Thm 2.11". */
  citation?: string
}

/**
 * Builds a trace one step at a time.
 *
 * Engine code must extend snapshots structurally — `{ ...prev, state: next }` —
 * and never deep-clone one (§14). The builder freezes what it is handed, so a
 * later mutation of a shared substructure throws rather than silently rewriting
 * a step that has already been emitted.
 */
export class TraceBuilder<TSnapshot> {
  private readonly steps: Step<TSnapshot>[] = []
  private readonly counters: Record<string, number> = {}
  private truncation: { reason: string; cap: number } | undefined

  constructor(
    private readonly kind: TraceKind,
    private readonly input: unknown,
  ) {}

  /** How many steps have been emitted so far. */
  get length(): number {
    return this.steps.length
  }

  /** Emit one step. The snapshot is frozen on the way in. */
  step(input: StepInput<TSnapshot>): this {
    if (isDev()) assertNarration(input.narration, this.steps.length)

    this.steps.push({
      index: this.steps.length,
      narration: input.narration,
      highlight: deepFreeze(input.highlight ?? []),
      snapshot: deepFreeze(input.snapshot),
      ...(input.citation === undefined ? {} : { citation: input.citation }),
    })

    return this
  }

  /** Increment a `meta.counters` entry — transitionsTaken, statesCreated, ... */
  bump(counter: string, by = 1): this {
    this.counters[counter] = (this.counters[counter] ?? 0) + by
    return this
  }

  /**
   * Record that a §9 guard fired. The UI surfaces this as prose.
   *
   * First reason wins, so a repeated guard does not overwrite the explanation of
   * why the run stopped. `replace` is for the case where a *harder* guard fires
   * later: a run that stopped narrating at the step cap and then hit the subset
   * state cap should report the state cap, because that is the one that changed
   * the answer rather than the commentary.
   */
  truncate(reason: string, cap: number, options: { replace?: boolean } = {}): this {
    if (this.truncation === undefined || options.replace === true) {
      this.truncation = { reason, cap }
    }
    return this
  }

  /** Whether a guard has already fired, so a loop knows to stop. */
  get truncated(): boolean {
    return this.truncation !== undefined
  }

  build(result: TraceResult): Trace<Step<TSnapshot>> {
    const meta: TraceMeta = {
      stepCount: this.steps.length,
      counters: { ...this.counters },
      ...(this.truncation === undefined ? {} : { truncated: this.truncation }),
    }

    return {
      kind: this.kind,
      engineVersion: ENGINE_VERSION,
      input: this.input,
      steps: this.steps,
      result,
      meta,
    }
  }
}

function assertNarration(narration: string, index: number): void {
  const where = `step ${index}`
  if (narration.trim() === '') {
    throw new EngineInvariantError(`${where} has an empty narration.`)
  }
  if (!narration.trimEnd().endsWith('.')) {
    throw new EngineInvariantError(`${where} narration does not end in a period: "${narration}"`)
  }
  for (const marker of PLACEHOLDER_MARKERS) {
    if (narration.toLowerCase().includes(marker.toLowerCase())) {
      throw new EngineInvariantError(`${where} narration contains placeholder text "${marker}".`)
    }
  }
}

// ---------------------------------------------------------------------------
// Serialisation — ADR-001, "delta-encoded on the wire"
// ---------------------------------------------------------------------------

/**
 * The wire format. Objects and arrays live once in `heap`; every other position
 * holds either a primitive or a `{ $: index }` reference into it.
 *
 * This is what keeps a trace inside the 5 MB budget. Consecutive snapshots share
 * almost all of their structure, and identity-keyed deduplication collapses that
 * sharing to one heap entry rather than one copy per step — the same property
 * ADR-001 relies on in memory, carried to the wire.
 *
 * `deserialise` rehydrates eagerly: every consumer sees complete snapshots and
 * never a delta (§5).
 */
interface Wire {
  format: 'tnt-trace/1'
  root: WireValue
  heap: WireEntry[]
}

type WireValue = string | number | boolean | null | { $: number }
type WireEntry = { a: WireValue[] } | { o: Record<string, WireValue> }

export interface SerialiseOptions {
  /** Defaults to `LIMITS.TRACE_BYTES`. Pass `Infinity` to disable truncation. */
  maxBytes?: number
}

/**
 * Encode a trace for transport or storage.
 *
 * If the result exceeds the byte budget, trailing steps are dropped until it
 * fits and `meta.truncated` is set on the encoded trace — the UI says so rather
 * than quietly showing a short trace.
 */
export function serialise<T extends Trace>(trace: T, options: SerialiseOptions = {}): string {
  const maxBytes = options.maxBytes ?? LIMITS.TRACE_BYTES

  let candidate: Trace = trace
  let encoded = encode(candidate)

  while (byteLength(encoded) > maxBytes && candidate.steps.length > 1) {
    const keep = Math.max(1, Math.floor(candidate.steps.length * 0.9))
    const steps = candidate.steps.slice(0, keep)
    candidate = {
      ...candidate,
      steps,
      meta: {
        ...candidate.meta,
        stepCount: steps.length,
        truncated: {
          reason: `The full trace exceeded the ${Math.round(maxBytes / 1024 / 1024)} MB transport budget, so it was cut to its first ${steps.length} steps.`,
          cap: maxBytes,
        },
      },
    }
    encoded = encode(candidate)
  }

  return encoded
}

function encode(trace: Trace): string {
  const heap: WireEntry[] = []
  const indexOf = new Map<object, number>()

  const walk = (value: unknown): WireValue => {
    if (value === null) return null
    if (typeof value === 'undefined') return null
    if (typeof value !== 'object') {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value
      }
      throw new EngineInvariantError(`A trace holds a non-serialisable value of type ${typeof value}.`)
    }

    const existing = indexOf.get(value as object)
    if (existing !== undefined) return { $: existing }

    const slot = heap.length
    indexOf.set(value as object, slot)

    if (Array.isArray(value)) {
      const entry: WireEntry = { a: [] }
      heap.push(entry)
      entry.a = value.map(walk)
      return { $: slot }
    }

    const entry: WireEntry = { o: {} }
    heap.push(entry)
    const out: Record<string, WireValue> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue // an absent optional stays absent
      out[k] = walk(v)
    }
    entry.o = out
    return { $: slot }
  }

  const root = walk(trace)
  const wire: Wire = { format: 'tnt-trace/1', root, heap }
  return JSON.stringify(wire)
}

/** Rehydrate a serialised trace. Snapshots come back complete, shared, and frozen. */
export function deserialise<T extends Trace = Trace>(text: string): T {
  const wire = JSON.parse(text) as Wire

  if (wire.format !== 'tnt-trace/1') {
    throw new EngineInvariantError(`Unknown trace format "${String(wire.format)}".`)
  }

  // Two passes: build empty shells first so shared references resolve to the
  // same object, then fill them.
  const shells: (unknown[] | Record<string, unknown>)[] = wire.heap.map((entry) =>
    'a' in entry ? [] : {},
  )

  const resolve = (value: WireValue): unknown =>
    value !== null && typeof value === 'object' ? shells[value.$] : value

  wire.heap.forEach((entry, i) => {
    if ('a' in entry) {
      const target = shells[i] as unknown[]
      for (const v of entry.a) target.push(resolve(v))
    } else {
      const target = shells[i] as Record<string, unknown>
      for (const [k, v] of Object.entries(entry.o)) target[k] = resolve(v)
    }
  })

  const root = resolve(wire.root)
  deepFreeze(root)
  return root as T
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}
