/**
 * Many tapes to one — Hopcroft 2e §8.4.2, Theorem 8.9, and the running-time
 * bound of §8.4.3, Theorem 8.10.
 *
 * The one-tape machine N keeps 2k tracks: for each tape of M, a track with its
 * contents and a track holding a single head marker. One move of M costs N a
 * sweep right (collect the k scanned symbols, remembering them in the finite
 * control), a sweep left (write, and move each marker), and at most two extra
 * moves per marker that has to move right against the sweep — the "4n + 2k"
 * of Theorem 8.10, made countable.
 *
 * A cell of N is written `^0|_B`: per tape, `^` for "head here" or `_` for not,
 * then the symbol. N's states carry M's state and the phase of the sweep.
 */

import { LIMITS, TraceBuilder } from '../trace.js'
import { tmTransitionId } from '../ids.js'
import { err, ok, validationError, type Result } from '../result.js'
import { idText, initialConfig, simulateTM, stateText, validateTM, type Tape, type TmConfig, type TmSnapshot } from './simulate.js'
import type { Step, Sym, TMTransition, Trace, TuringMachine } from '../types.js'

const HERE = '^'
const AWAY = '_'
const UNREAD = '?'

/** Split a track cell back into its k (marker, symbol) pairs. */
export function splitTracks(cell: Sym): { marker: boolean; symbol: Sym }[] {
  return cell.split('|').map((part) => ({ marker: part.startsWith(HERE), symbol: part.slice(1) }))
}

function joinTracks(parts: readonly { marker: boolean; symbol: Sym }[]): Sym {
  return parts.map((p) => `${p.marker ? HERE : AWAY}${p.symbol}`).join('|')
}

/** The input w as N reads it: w on track 1, every head on the first cell. */
export function encodeInput(machine: TuringMachine, input: string | readonly Sym[]): Sym[] {
  const k = Math.max(1, machine.tapes)
  const symbols = typeof input === 'string' ? [...input] : [...input]
  if (symbols.length === 0) {
    return [joinTracks(Array.from({ length: k }, () => ({ marker: true, symbol: machine.blank })))]
  }
  return symbols.map((s, i) =>
    joinTracks(Array.from({ length: k }, (_, tape) => ({ marker: i === 0, symbol: tape === 0 ? s : machine.blank }))),
  )
}

type Phase =
  | { kind: 'scan'; q: string; reads: string[] }
  | { kind: 'sweep'; p: string; writes: string[]; moves: string[]; remaining: boolean[]; pending: boolean[] }
  | { kind: 'bounce'; p: string; writes: string[]; moves: string[]; remaining: boolean[]; pending: boolean[]; set: boolean[] }
  | { kind: 'back'; p: string; writes: string[]; moves: string[]; remaining: boolean[]; pending: boolean[] }

const bits = (flags: readonly boolean[]): string => flags.map((f) => (f ? '1' : '0')).join('')

function phaseName(phase: Phase): string {
  switch (phase.kind) {
    case 'scan':
      return `${phase.q}·scan·${phase.reads.join('')}`
    case 'sweep':
      return `${phase.p}·sweep·${phase.writes.map((w, i) => `${w}${phase.moves[i]}`).join('')}·${bits(phase.remaining)}·${bits(phase.pending)}`
    case 'bounce':
      return `${phase.p}·bounce·${phase.writes.map((w, i) => `${w}${phase.moves[i]}`).join('')}·${bits(phase.remaining)}·${bits(phase.pending)}·${bits(phase.set)}`
    case 'back':
      return `${phase.p}·back·${phase.writes.map((w, i) => `${w}${phase.moves[i]}`).join('')}·${bits(phase.remaining)}·${bits(phase.pending)}`
  }
}

/** The M state a phase is simulating, and whether N has just started a fresh scan (one M move done). */
export function phaseOf(state: string): { mState: string; kind: string; freshScan: boolean } {
  const [mState, kind, detail] = state.split('·') as [string, string, string | undefined]
  return { mState, kind, freshScan: kind === 'scan' && (detail ?? '').split('').every((c) => c === UNREAD) }
}

/**
 * Theorem 8.9's one-tape machine for a k-tape M. Built by exploring N's state
 * graph from its start state over every track symbol, so δ_N is total where
 * it needs to be and nothing unreachable is generated.
 */
export function multitapeToSingle(machine: TuringMachine): Result<TuringMachine> {
  const problems = validateTM(machine)
  if (problems.length > 0) return err(problems)
  const k = Math.max(1, machine.tapes)
  if (k < 2) {
    return err([validationError('TM_ALREADY_SINGLE', 'The machine already has one tape; there is nothing to reduce.', { kind: 'machine' })])
  }

  const gamma = machine.tapeAlphabet
  const blank = machine.blank
  const byState = new Map<string, TMTransition[]>()
  for (const t of machine.transitions) byState.set(t.from, [...(byState.get(t.from) ?? []), t])

  // Every track symbol: markers × symbols, per tape.
  const cells: Sym[] = []
  const build = (prefix: { marker: boolean; symbol: Sym }[]): void => {
    if (prefix.length === k) {
      cells.push(joinTracks(prefix))
      return
    }
    for (const marker of [false, true]) for (const symbol of gamma) build([...prefix, { marker, symbol }])
  }
  build([])
  const nBlank = joinTracks(Array.from({ length: k }, () => ({ marker: false, symbol: blank })))

  const transitions: TMTransition[] = []
  const states: string[] = []
  const seen = new Map<string, Phase>()
  const queue: Phase[] = []
  const enqueue = (phase: Phase): string => {
    const name = phaseName(phase)
    if (!seen.has(name)) {
      seen.set(name, phase)
      states.push(name)
      queue.push(phase)
    }
    return name
  }
  const add = (from: string, read: Sym, to: string, write: Sym, move: 'L' | 'R'): void => {
    transitions.push({ id: tmTransitionId(from, [read], [write], [move], to), from, read: [read], to, write: [write], move: [move] })
  }

  const start = enqueue({ kind: 'scan', q: machine.start, reads: Array.from({ length: k }, () => UNREAD) })

  while (queue.length > 0) {
    const phase = queue.shift() as Phase
    const name = phaseName(phase)

    for (const cell of cells) {
      const parts = splitTracks(cell)

      if (phase.kind === 'scan') {
        // Collect the symbols under the markers here; keep going right until all k are known.
        const reads = phase.reads.map((r, i) => ((parts[i] as { marker: boolean; symbol: Sym }).marker ? (parts[i] as { symbol: Sym }).symbol : r))
        if (reads.some((r) => r === UNREAD)) {
          add(name, cell, enqueue({ kind: 'scan', q: phase.q, reads }), cell, 'R')
          continue
        }
        // All k symbols known: this is M's move, if M has one.
        const move = (byState.get(phase.q) ?? []).find((t) => t.read.every((r, i) => r === reads[i]))
        if (move === undefined) continue // N dies here, as M would.
        const remaining = Array.from({ length: k }, () => true)
        const pending = Array.from({ length: k }, () => false)
        // Start the sweep back on this very cell — it may hold markers — by
        // entering the sweep state with a leftward move after re-reading it.
        // To process this cell too, hand it to a sweep state arriving from the right.
        const sweep = enqueue({ kind: 'sweep', p: move.to, writes: [...move.write], moves: [...move.move], remaining, pending })
        // Move right (off the cell), then the sweep state will come back onto it.
        const turn = enqueue({ kind: 'back', p: move.to, writes: [...move.write], moves: [...move.move], remaining, pending })
        add(name, cell, turn, cell, 'R')
        void sweep
        continue
      }

      if (phase.kind === 'back') {
        // One cell right of where the sweep must resume: step left into the sweep.
        const sweep = enqueue({ kind: 'sweep', p: phase.p, writes: phase.writes, moves: phase.moves, remaining: phase.remaining, pending: phase.pending })
        add(name, cell, sweep, cell, 'L')
        continue
      }

      if (phase.kind === 'bounce') {
        // On the cell to the right of the one being processed: plant the markers that moved right, then go back.
        const planted = parts.map((part, i) => ((phase.set[i] as boolean) ? { ...part, marker: true } : part))
        const back = enqueue({ kind: 'back', p: phase.p, writes: phase.writes, moves: phase.moves, remaining: phase.remaining, pending: phase.pending })
        add(name, cell, back, joinTracks(planted), 'L')
        continue
      }

      // Sweep: arriving on a cell from the right. Plant pending markers (tracks that moved left
      // from the cell to the right), then process every unprocessed marker on this cell.
      const here = parts.map((part, i) => ((phase.pending[i] as boolean) ? { ...part, marker: true } : part))
      const processing = here.map((part, i) => part.marker && (phase.remaining[i] as boolean))
      const written = here.map((part, i) => (processing[i] ? { ...part, symbol: phase.writes[i] as Sym } : part))
      const remaining = phase.remaining.map((r, i) => r && !processing[i])
      const goesLeft = processing.map((p, i) => p && phase.moves[i] === 'L')
      const goesRight = processing.map((p, i) => p && phase.moves[i] === 'R')
      const afterMove = written.map((part, i) => (goesLeft[i] || goesRight[i] ? { ...part, marker: false } : part))
      const nextPending = goesLeft

      if (goesRight.some(Boolean)) {
        const bounce = enqueue({ kind: 'bounce', p: phase.p, writes: phase.writes, moves: phase.moves, remaining, pending: nextPending, set: goesRight })
        add(name, cell, bounce, joinTracks(afterMove), 'R')
        continue
      }
      if (remaining.some(Boolean) || nextPending.some(Boolean)) {
        const sweep = enqueue({ kind: 'sweep', p: phase.p, writes: phase.writes, moves: phase.moves, remaining, pending: nextPending })
        add(name, cell, sweep, joinTracks(afterMove), 'L')
        continue
      }
      // Every marker handled and nothing left to plant: M's move is complete.
      // Record the symbols under any markers on this cell and begin the next scan rightwards.
      const reads = afterMove.map((part) => (part.marker ? part.symbol : UNREAD))
      const scan = enqueue({ kind: 'scan', q: phase.p, reads })
      add(name, cell, scan, joinTracks(afterMove), 'R')
    }
  }

  const accepting = states.filter((s) => {
    const { mState, kind } = phaseOf(s)
    return kind === 'scan' && machine.accepting.includes(mState)
  })

  const inputCells = new Set<Sym>()
  for (const a of machine.inputAlphabet) {
    inputCells.add(joinTracks(Array.from({ length: k }, (_, tape) => ({ marker: true, symbol: tape === 0 ? a : blank }))))
    inputCells.add(joinTracks(Array.from({ length: k }, (_, tape) => ({ marker: false, symbol: tape === 0 ? a : blank }))))
  }
  inputCells.add(joinTracks(Array.from({ length: k }, () => ({ marker: true, symbol: blank }))))

  return ok({
    states,
    inputAlphabet: [...inputCells],
    tapeAlphabet: cells,
    blank: nBlank,
    transitions,
    start,
    accepting,
    tapes: 1,
  })
}

export interface ReductionSnapshot {
  multitape: TuringMachine
  single: TuringMachine
  /** M's configuration after `mMoves` moves. */
  mConfig: TmConfig
  /** N's configuration — also under `current`, for the tape highlights. */
  current: TmConfig
  mMoves: number
  nMoves: number
  status: 'running' | 'accepted' | 'rejected' | 'stopped'
  [key: string]: unknown
}

export type ReductionTrace = Trace<Step<ReductionSnapshot>>

/** M's configuration after each move of its (deterministic) run. */
function pathOf(trace: Trace<Step<TmSnapshot>>): TmConfig[] {
  const last = trace.steps.at(-1) as Step<TmSnapshot>
  const nodes = last.snapshot.nodes
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const tip = nodes.find((n) => n.status === 'accepting') ?? [...nodes].sort((a, b) => b.position - a.position)[0]
  const path: TmConfig[] = []
  for (let n = tip; n !== undefined; n = n.parent === null ? undefined : byId.get(n.parent)) {
    path.unshift({ state: n.state, tapes: n.tapes })
  }
  return path
}

/**
 * M and N run side by side on the same input: one step per move of N, with
 * M's configuration advancing each time N finishes simulating a move. The
 * counters are the point — Theorem 8.10's bound, watched rather than quoted.
 */
export function simulateReduction(
  machine: TuringMachine,
  input: string | readonly Sym[],
  options: { maxSteps?: number } = {},
): Result<ReductionTrace> {
  const built = multitapeToSingle(machine)
  if (!built.ok) return built
  const single = built.value
  const k = Math.max(1, machine.tapes)
  const maxSteps = options.maxSteps ?? LIMITS.SIMULATION_STEPS

  const mRun = simulateTM(machine, input, { maxSteps })
  if (!mRun.ok) return mRun
  const nRun = simulateTM(single, encodeInput(machine, input), { maxSteps })
  if (!nRun.ok) return nRun

  const mPath = pathOf(mRun.value)
  const nPath = pathOf(nRun.value)
  const builder = new TraceBuilder<ReductionSnapshot>('convert.tm-multitape-to-single', { machine, input })
  const symbols = typeof input === 'string' ? [...input] : [...input]

  let mMoves = 0
  let previousKind = 'scan'
  let status: ReductionSnapshot['status'] = 'running'
  const nStatus = nRun.value.result.type === 'acceptance' ? (nRun.value.result.accepted ? 'accepted' : 'rejected') : 'stopped'

  nPath.forEach((nConfig, nMoves) => {
    const { kind } = phaseOf(nConfig.state)
    const freshScan = kind === 'scan' && previousKind !== 'scan'
    previousKind = kind
    if (freshScan) mMoves = Math.min(mMoves + 1, mPath.length - 1)
    const mConfig = mPath[mMoves] as TmConfig
    const isLast = nMoves === nPath.length - 1
    if (isLast) status = nStatus

    const narration =
      nMoves === 0
        ? `N starts on the ${2 * k}-track encoding of the input: every head marker on the first cell, M's tapes one per track. ${idText(nConfig, single.blank)}.`
        : kind === 'scan' && freshScan
          ? `N has finished simulating move ${mMoves} of M and starts the next scan: ${nMoves} moves of N so far for ${mMoves} of M. M is now at ${idText(mConfig, machine.blank)}.`
          : kind === 'scan'
            ? `Scanning right: N remembers the symbol under each head marker it passes in its finite control (state ${nConfig.state}).`
            : kind === 'bounce'
              ? `A marker moves right, against the sweep: N steps right to plant it, then steps back — the 2k extra moves of Theorem 8.10.`
              : `Sweeping left: at each marker N writes M's new symbol and moves the marker as M moved that head.`

    if (builder.length < LIMITS.TRACE_STEPS || isLast) {
      builder.step({
        narration,
        citation: '8.4.2, Thm 8.9',
        highlight: [
          { type: 'state', id: nConfig.state, role: isLast && status === 'accepted' ? 'accepting' : 'current' },
          ...nConfig.tapes.map((tape, i) => ({ type: 'tapeCell' as const, tape: i, index: tape.head, role: 'head' as const })),
        ],
        snapshot: { multitape: machine, single, mConfig, current: nConfig, input: symbols, mMoves, nMoves, status },
      })
    } else {
      builder.truncate(`N's run passed ${LIMITS.TRACE_STEPS} narrated moves and continues without commentary.`, LIMITS.TRACE_STEPS)
    }
  })

  builder.bump('singleTapeMoves', nPath.length - 1)
  builder.bump('multitapeMoves', mPath.length - 1)

  if (nStatus === 'stopped') {
    return ok(
      builder.build({
        type: 'incomplete',
        reason: `N made ${maxSteps} moves without halting.`,
        bounded: { searchedUpTo: maxSteps, unit: 'steps' },
      }),
    )
  }
  return ok(
    builder.build({
      type: 'acceptance',
      accepted: nStatus === 'accepted',
      note: `N made ${nPath.length - 1} moves to simulate M's ${mPath.length - 1}; Theorem 8.10 bounds each simulated move by 4n + 2k.`,
    }),
  )
}

/** The initial one-tape configuration N starts from, for display. */
export function encodedStart(machine: TuringMachine, input: string | readonly Sym[]): TmConfig | null {
  const built = multitapeToSingle(machine)
  if (!built.ok) return null
  return initialConfig(built.value, encodeInput(machine, input))
}

/** For display: each track of a one-tape cell, top to bottom. */
export function trackRows(tape: Tape, k: number): { marker: boolean; symbol: Sym }[][] {
  return tape.cells.map((cell) => {
    const parts = splitTracks(cell)
    return parts.length === k ? parts : Array.from({ length: k }, () => ({ marker: false, symbol: cell }))
  })
}

export { stateText }
