/**
 * Turing-machine simulation — Hopcroft 2e §8.2.3 (IDs), §8.2.5–8.2.6
 * (acceptance and halting), §8.4.1 (multitape), §8.4.4 (nondeterminism).
 *
 * One search for every variety. A deterministic machine's run is a path; a
 * nondeterministic machine's is the breadth-first tree Theorem 8.11's DTM
 * explores; a multitape machine reads, writes and moves on every tape in one
 * move. The ID is written the way §8.2.3 writes it — the state immediately to
 * the left of the scanned cell, only the cells between the leftmost and
 * rightmost nonblanks, plus any blanks between them and the head — because
 * that string is what the exam marks.
 *
 * A machine that does not halt is a fact about Turing machines (§8.2.6), not a
 * bug: the move cap stops the run, says so, and reports `incomplete`. The
 * caller may run again with a larger cap — the "continue for N more" action.
 */

import { LIMITS, TraceBuilder } from '../trace.js'
import { err, ok, validationError, type Result, type ValidationError } from '../result.js'
import type { Highlight, Step, Sym, TMTransition, Trace, TuringMachine } from '../types.js'

/** One tape: a window of cells, `cells[i]` at absolute position `offset + i`, and the head's absolute position. */
export interface Tape {
  cells: Sym[]
  offset: number
  head: number
}

export interface TmConfig {
  state: string
  tapes: Tape[]
}

export interface TmBranchNode extends TmConfig {
  id: string
  /** Moves made on the path to this node — the branch tree's column. */
  position: number
  parent: string | null
  via: string | null
  status: 'live' | 'dead' | 'accepting'
  diedAtStep?: number
  note?: string
}

export interface TmSnapshot {
  machine: TuringMachine
  input: Sym[]
  nodes: TmBranchNode[]
  /** The configuration this step is about — the one expanded, or the accepting one. */
  current: TmConfig
  status: 'running' | 'accepted' | 'rejected' | 'stopped' | 'loops'
  /** Moves made along the path to `current`. */
  moves: number
  [key: string]: unknown
}

export type TmTrace = Trace<Step<TmSnapshot>>

export interface SimulateTmOptions {
  /** Configurations expanded before the run is stopped. Defaults to LIMITS.SIMULATION_STEPS. */
  maxSteps?: number
}

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'

/** q0 → q₀, as the book typesets states; anything else is left alone. */
export function stateText(state: string): string {
  const match = /^q(\d+)$/.exec(state)
  if (match === null) return state
  return 'q' + [...(match[1] as string)].map((d) => SUBSCRIPTS[Number(d)] as string).join('')
}

export function readCell(tape: Tape, position: number, blank: Sym): Sym {
  const i = position - tape.offset
  return i >= 0 && i < tape.cells.length ? (tape.cells[i] as Sym) : blank
}

/** A fresh tape with `symbol` at `position`, the window grown if needed. */
export function writeCell(tape: Tape, position: number, symbol: Sym, blank: Sym): Tape {
  let { cells, offset } = tape
  if (position < offset) {
    cells = [...Array<Sym>(offset - position).fill(blank), ...cells]
    offset = position
  } else if (position >= offset + cells.length) {
    cells = [...cells, ...Array<Sym>(position - offset - cells.length + 1).fill(blank)]
  } else {
    cells = [...cells]
  }
  cells[position - offset] = symbol
  return { cells, offset, head: tape.head }
}

/** The nonblank span, as the book's X₁…Xₙ: [first, last] absolute positions, or null when the tape is blank. */
export function nonblankSpan(tape: Tape, blank: Sym): [number, number] | null {
  let first = -1
  let last = -1
  tape.cells.forEach((c, i) => {
    if (c === blank) return
    if (first === -1) first = i
    last = i
  })
  return first === -1 ? null : [tape.offset + first, tape.offset + last]
}

/** The tape's nonblank content, as a string — what a function-computing machine leaves behind. */
export function tapeContents(tape: Tape, blank: Sym): string {
  const span = nonblankSpan(tape, blank)
  if (span === null) return ''
  const out: Sym[] = []
  for (let p = span[0]; p <= span[1]; p++) out.push(readCell(tape, p, blank))
  return out.join('')
}

/**
 * One tape's ID — §8.2.3. Cells from the leftmost nonblank to the rightmost,
 * widened to include the head when it stands on a blank outside that span,
 * with the state written immediately left of the scanned cell.
 */
export function tapeIdText(state: string, tape: Tape, blank: Sym): string {
  const span = nonblankSpan(tape, blank)
  const from = span === null ? tape.head : Math.min(span[0], tape.head)
  const to = span === null ? tape.head : Math.max(span[1], tape.head)
  let text = ''
  for (let p = from; p <= to; p++) {
    if (p === tape.head) text += stateText(state)
    text += readCell(tape, p, blank)
  }
  return text
}

/** The ID of a configuration; multitape IDs list one tape per ‖-separated part (the book gives no notation, §8.4.1). */
export function idText(config: TmConfig, blank: Sym): string {
  return config.tapes.map((tape) => tapeIdText(config.state, tape, blank)).join(' ‖ ')
}

/**
 * A configuration as a lookup key: the state and, per tape, the cells from the
 * leftmost nonblank-or-head to the rightmost, with the head's place among them.
 * Unlike the ID text this is injective — state names and symbols are free-form,
 * so `p` on 1x and `p1` on x write the same ID but are different configurations.
 */
function configKey(config: TmConfig, blank: Sym): string {
  const tapes = config.tapes.map((tape) => {
    const span = nonblankSpan(tape, blank)
    const from = span === null ? tape.head : Math.min(span[0], tape.head)
    const to = span === null ? tape.head : Math.max(span[1], tape.head)
    const cells: Sym[] = []
    for (let p = from; p <= to; p++) cells.push(readCell(tape, p, blank))
    return [tape.head - from, cells]
  })
  return JSON.stringify([config.state, tapes])
}

const moveOf = (d: 'L' | 'R' | 'S'): number => (d === 'L' ? -1 : d === 'R' ? 1 : 0)

export function validateTM(machine: TuringMachine): ValidationError[] {
  const problems: ValidationError[] = []
  const states = new Set(machine.states)
  const k = Math.max(1, machine.tapes)

  if (!states.has(machine.start)) {
    problems.push(validationError('TM_START_UNKNOWN', `The start state "${machine.start}" is not a state.`, { kind: 'machine' }))
  }
  if (!machine.tapeAlphabet.includes(machine.blank)) {
    problems.push(validationError('TM_BLANK_UNKNOWN', `The blank "${machine.blank}" is not in the tape alphabet.`, { kind: 'machine' }))
  }
  if (machine.inputAlphabet.includes(machine.blank)) {
    problems.push(validationError('TM_BLANK_IS_INPUT', `The blank "${machine.blank}" must not be an input symbol (§8.2.2).`, { kind: 'machine' }))
  }
  for (const a of machine.inputAlphabet) {
    if (!machine.tapeAlphabet.includes(a)) {
      problems.push(validationError('TM_INPUT_NOT_TAPE', `The input symbol "${a}" is not in the tape alphabet; Σ ⊆ Γ.`, { kind: 'machine' }))
    }
  }
  for (const s of machine.accepting) {
    if (!states.has(s)) problems.push(validationError('TM_ACCEPTING_UNKNOWN', `"${s}" is marked accepting but is not a state.`, { kind: 'state', id: s }))
  }
  for (const t of machine.transitions) {
    if (!states.has(t.from)) problems.push(validationError('TM_FROM_UNKNOWN', `A transition leaves "${t.from}", which is not a state.`, { kind: 'transition', id: t.id }))
    if (!states.has(t.to)) problems.push(validationError('TM_TO_UNKNOWN', `A transition enters "${t.to}", which is not a state.`, { kind: 'transition', id: t.id }))
    if (t.read.length !== k || t.write.length !== k || t.move.length !== k) {
      problems.push(validationError('TM_ARITY', `A transition from "${t.from}" does not have one read, write and move per tape (${k}).`, { kind: 'transition', id: t.id }))
    }
    for (const s of [...t.read, ...t.write]) {
      if (!machine.tapeAlphabet.includes(s)) {
        problems.push(validationError('TM_SYMBOL_UNKNOWN', `A transition uses "${s}", which is not in the tape alphabet.`, { kind: 'transition', id: t.id }))
      }
    }
    if (k === 1 && t.move[0] === 'S') {
      problems.push(validationError('TM_STATIONARY', `A single-tape machine's head must move left or right on every move (§8.2.2); the move from "${t.from}" stays put.`, { kind: 'transition', id: t.id }))
    }
  }
  return problems
}

/** The initial configuration: the input on tape 1, every other tape blank, heads at the left. */
export function initialConfig(machine: TuringMachine, input: readonly Sym[]): TmConfig {
  const k = Math.max(1, machine.tapes)
  const tapes: Tape[] = []
  for (let i = 0; i < k; i++) {
    tapes.push({ cells: i === 0 ? [...input] : [], offset: 0, head: 0 })
  }
  return { state: machine.start, tapes }
}

function applies(t: TMTransition, config: TmConfig, blank: Sym): boolean {
  if (t.from !== config.state) return false
  return t.read.every((symbol, i) => readCell(config.tapes[i] as Tape, (config.tapes[i] as Tape).head, blank) === symbol)
}

function apply(t: TMTransition, config: TmConfig, blank: Sym): TmConfig {
  const tapes = config.tapes.map((tape, i) => {
    const written = writeCell(tape, tape.head, t.write[i] as Sym, blank)
    return { ...written, head: tape.head + moveOf(t.move[i] as 'L' | 'R' | 'S') }
  })
  return { state: t.to, tapes }
}

function describeMove(t: TMTransition, before: TmConfig, after: TmConfig, blank: Sym, k: number): string {
  if (k === 1) {
    const dir = t.move[0] === 'L' ? 'left' : t.move[0] === 'R' ? 'right' : 'nowhere'
    return `In ${stateText(t.from)} scanning ${t.read[0]}: write ${t.write[0]}, move ${dir}, enter ${stateText(t.to)}. ${idText(before, blank)} ⊢ ${idText(after, blank)}.`
  }
  const parts = t.read.map((r, i) => `tape ${i + 1} reads ${r}, writes ${t.write[i]}, moves ${t.move[i]}`)
  return `In ${stateText(t.from)}: ${parts.join('; ')}; enter ${stateText(t.to)}. ${idText(before, blank)} ⊢ ${idText(after, blank)}.`
}

/** Run a Turing machine on an input. */
export function simulateTM(
  machine: TuringMachine,
  input: string | readonly Sym[],
  options: SimulateTmOptions = {},
): Result<TmTrace> {
  const problems = validateTM(machine)
  if (problems.length > 0) return err(problems)

  const symbols = (typeof input === 'string' ? [...input] : [...input]) as Sym[]
  const offAlphabet = [...new Set(symbols.filter((s) => !machine.inputAlphabet.includes(s)))]
  if (offAlphabet.length > 0) {
    return err(
      offAlphabet.map((s) =>
        validationError('TM_INPUT_UNKNOWN', `The input contains "${s}", which is not an input symbol.`, { kind: 'machine' }),
      ),
    )
  }

  const maxSteps = options.maxSteps ?? LIMITS.SIMULATION_STEPS
  const blank = machine.blank
  const k = Math.max(1, machine.tapes)
  const builder = new TraceBuilder<TmSnapshot>('simulate.tm', { machine, input: symbols, maxSteps })

  let counter = 0
  const fresh = (): string => `n${counter++}`
  const root: TmBranchNode = { id: fresh(), ...initialConfig(machine, symbols), position: 0, parent: null, via: null, status: 'live' }
  // The branch tree under construction. Mutable while the search runs — an
  // emitted snapshot gets its own copy — so a move costs O(what changed), not a
  // copy and a scan of every node: long runs to the cap used to freeze the page.
  const nodes: TmBranchNode[] = [root]
  const indexOf = new Map<string, number>([[root.id, 0]])
  const update = (id: string, patch: Partial<TmBranchNode>): void => {
    const i = indexOf.get(id) as number
    nodes[i] = { ...(nodes[i] as TmBranchNode), ...patch }
  }
  const add = (node: TmBranchNode): void => {
    indexOf.set(node.id, nodes.length)
    nodes.push(node)
  }
  const rootKey = configKey(root, blank)
  const seen = new Set<string>([rootKey])
  // Each node's ID and parent, to tell a loop (an ID repeated on its own path)
  // from two branches merely meeting at the same ID.
  const keyOf = new Map<string, string>([[root.id, rootKey]])
  // The node each explored ID lives at, and every move into an ID found first by
  // another branch. A cycle can run through such merges without any one path
  // repeating an ID, so they are kept to check for one once the search ends.
  const nodeOfKey = new Map<string, string>([[rootKey, root.id]])
  const merges: [string, string][] = []
  const parentOf = new Map<string, string | null>([[root.id, null]])
  const onPath = (nodeId: string | null, key: string): boolean => {
    for (let id = nodeId; id !== null; id = parentOf.get(id) ?? null) if (keyOf.get(id) === key) return true
    return false
  }
  let loop: { from: TmBranchNode; to: string } | null = null
  /** A move that closes a cycle in the explored graph of IDs, tree moves and merges together — or null. */
  const cycleThroughMerges = (): { from: TmBranchNode; to: string } | null => {
    const next = new Map<string, string[]>()
    const link = (from: string, to: string): void => {
      const list = next.get(from)
      if (list === undefined) next.set(from, [to])
      else list.push(to)
    }
    for (const [id, parent] of parentOf) if (parent !== null) link(parent, id)
    for (const [id, key] of merges) link(id, nodeOfKey.get(key) as string)
    // Iterative depth-first search; an edge into a node still on the stack closes a cycle.
    const colour = new Map<string, 1 | 2>()
    for (const start of parentOf.keys()) {
      if (colour.has(start)) continue
      colour.set(start, 1)
      const stack: [string, number][] = [[start, 0]]
      while (stack.length > 0) {
        const frame = stack[stack.length - 1] as [string, number]
        const out = next.get(frame[0]) ?? []
        if (frame[1] >= out.length) {
          colour.set(frame[0], 2)
          stack.pop()
          continue
        }
        const to = out[frame[1]++] as string
        const c = colour.get(to)
        if (c === 1) {
          const from = nodes[indexOf.get(frame[0]) as number] as TmBranchNode
          return { from, to: idText(nodes[indexOf.get(to) as number] as TmBranchNode, blank) }
        }
        if (c === undefined) {
          colour.set(to, 1)
          stack.push([to, 0])
        }
      }
    }
    return null
  }
  const queue: TmBranchNode[] = [root]
  let head = 0
  const byIndex = new Map<string, TMTransition[]>()
  for (const t of machine.transitions) {
    const list = byIndex.get(t.from) ?? []
    list.push(t)
    byIndex.set(t.from, list)
  }

  // Narration may be passed as a thunk: past the step cap it is never shown,
  // and writing out long tapes as IDs for every move is most of a long run's cost.
  const emit = (
    narration: string | (() => string),
    highlight: Highlight[],
    current: TmConfig,
    moves: number,
    status: TmSnapshot['status'],
  ): void => {
    if (status === 'running' && builder.length >= LIMITS.TRACE_STEPS) {
      builder.truncate(`The run passed ${LIMITS.TRACE_STEPS} narrated moves and continues without commentary.`, LIMITS.TRACE_STEPS)
      return
    }
    builder.step({
      narration: typeof narration === 'string' ? narration : narration(),
      highlight,
      citation: '8.2.3',
      snapshot: { machine, input: symbols, nodes: [...nodes], current: { state: current.state, tapes: current.tapes }, status, moves },
    })
  }

  const headHighlights = (config: TmConfig): Highlight[] =>
    config.tapes.map((tape, i) => ({ type: 'tapeCell' as const, tape: i, index: tape.head, role: 'head' as const }))

  emit(
    `Start in ${stateText(machine.start)} with the input on the tape and the head on its leftmost cell: the initial ID is ${idText(root, blank)}.`,
    [{ type: 'state', id: machine.start, role: 'start' }, ...headHighlights(root)],
    root,
    0,
    'running',
  )

  if (machine.accepting.includes(machine.start)) {
    update(root.id, { status: 'accepting' })
    emit(`The start state is accepting, so the machine accepts at once.`, [{ type: 'state', id: machine.start, role: 'accepting' }], root, 0, 'accepted')
    return ok(builder.build({ type: 'acceptance', accepted: true, note: `Accepted in ${stateText(machine.start)} after 0 moves.` }))
  }

  let expanded = 0
  let acceptingNode: TmBranchNode | null = null
  let deepest: TmBranchNode = root

  while (head < queue.length && acceptingNode === null) {
    if (expanded >= maxSteps) {
      deepest = nodes.reduce((best, n) => (n.position > best.position ? n : best), deepest)
      builder.truncate(`The machine made ${maxSteps} moves without halting, so the run was stopped — a Turing machine need not halt (§8.2.6).`, maxSteps, { replace: true })
      emit(
        `${maxSteps} moves and the machine has not halted. The run is stopped here; it may not halt at all (§8.2.6), or it may need more moves — continue to find out.`,
        headHighlights(deepest),
        deepest,
        deepest.position,
        'stopped',
      )
      return ok(
        builder.build({
          type: 'incomplete',
          reason: `The machine made ${maxSteps} moves without halting.`,
          bounded: { searchedUpTo: maxSteps, unit: 'steps' },
        }),
      )
    }

    // Queued nodes are still live: a node's status changes only when it is expanded.
    const node = queue[head++] as TmBranchNode
    const nodeId = node.id
    expanded++
    if (node.position > deepest.position) deepest = node

    const moves = (byIndex.get(node.state) ?? []).filter((t) => applies(t, node, blank))
    const stepIndex = builder.length

    if (moves.length === 0 || machine.rejecting?.includes(node.state) === true) {
      const scanned = node.tapes.map((tape) => readCell(tape, tape.head, blank)).join(', ')
      update(nodeId, { status: 'dead', diedAtStep: stepIndex, note: 'no move' })
      emit(
        () => `${idText(node, blank)}: in ${stateText(node.state)} there is no move on ${scanned}. The machine halts without accepting — it dies (§8.2.6).`,
        [{ type: 'treeNode', id: nodeId, role: 'dead' }, { type: 'state', id: node.state, role: 'dead' }, ...headHighlights(node)],
        node,
        node.position,
        'running',
      )
      continue
    }

    const children: TmBranchNode[] = []
    for (const t of moves) {
      const next = apply(t, node, blank)
      const key = configKey(next, blank)
      if (seen.has(key)) {
        if (onPath(nodeId, key)) {
          if (loop === null) loop = { from: node, to: idText(next, blank) }
        } else {
          merges.push([nodeId, key])
        }
        continue
      }
      seen.add(key)
      const child: TmBranchNode = { id: fresh(), ...next, position: node.position + 1, parent: nodeId, via: t.id, status: 'live' }
      keyOf.set(child.id, key)
      nodeOfKey.set(key, child.id)
      parentOf.set(child.id, nodeId)
      children.push(child)
    }
    for (const child of children) add(child)
    if (children.length === 0) {
      const note = loop?.from === node ? 'loops: repeats an ID on its own path' : 'repeats an explored ID'
      update(nodeId, { status: 'dead', diedAtStep: stepIndex, note })
    }
    builder.bump('tapeMoves', moves.length)

    const winner = children.find((c) => machine.accepting.includes(c.state))
    if (winner !== undefined) {
      acceptingNode = winner
      update(winner.id, { status: 'accepting' })
    }

    const focus = winner ?? children[0] ?? node
    const narration = (): string =>
      moves.length === 1 && children.length === 1
        ? describeMove(moves[0] as TMTransition, node, children[0] as TmBranchNode, blank, k) +
          (winner !== undefined ? ` ${stateText(winner.state)} is accepting: the machine halts and accepts.` : '')
        : children.length === 0
          ? loop?.from === node
            ? `${idText(node, blank)} ⊢ ${loop.to}, an ID this computation was already in: from here it repeats the same moves forever.`
            : `${idText(node, blank)} has moves, but each leads to an ID already explored — this branch adds nothing new.`
          : `${idText(node, blank)} has ${moves.length} possible moves (a nondeterministic choice): ${children.map((c) => idText(c, blank)).join(' | ')}.${
              winner !== undefined ? ` ${idText(winner, blank)} is in an accepting state: the machine accepts.` : ''
            }`

    emit(
      narration,
      [
        { type: 'treeNode', id: nodeId, role: 'expanding' },
        ...children.map((c) => ({ type: 'treeNode' as const, id: c.id, role: winner?.id === c.id ? ('accepting' as const) : ('matched' as const) })),
        ...moves.map((t) => ({ type: 'transition' as const, id: t.id, role: 'taken' as const })),
        { type: 'state', id: focus.state, role: winner !== undefined ? 'accepting' : 'current' },
        ...headHighlights(focus),
        ...focus.tapes.map((tape, i) => ({ type: 'tapeCell' as const, tape: i, index: (node.tapes[i] as Tape).head, role: 'written' as const })),
      ],
      focus,
      focus.position,
      winner !== undefined ? 'accepted' : 'running',
    )

    for (const child of children) if (child.id !== acceptingNode?.id) queue.push(child)
  }

  if (acceptingNode !== null) {
    return ok(
      builder.build({
        type: 'acceptance',
        accepted: true,
        note: `Accepted in ${stateText(acceptingNode.state)} after ${acceptingNode.position} moves; the tape reads ${tapeContents(acceptingNode.tapes[0] as Tape, blank) || 'all blanks'}.`,
      }),
    )
  }

  if (loop === null && merges.length > 0) loop = cycleThroughMerges()

  if (loop !== null) {
    // Every reachable ID was explored and none accepts, but a computation came
    // back to an ID it had been in: it runs forever. Not accepted — and not a
    // rejection, which is a halt (§8.2.6).
    const { from, to } = loop
    const deterministic = isDeterministicTM(machine)
    for (const n of [...nodes]) if (n.status === 'live') update(n.id, { status: 'dead', diedAtStep: builder.length, note: 'exhausted' })
    emit(
      deterministic
        ? `The machine returned to ${to}, an ID it was already in, so it repeats the same moves forever: it never halts, and never accepts.`
        : `No branch accepts, and at least one runs forever — it returns to ${to}, an ID it was already in. The input is not accepted, but the machine does not halt on it.`,
      headHighlights(from),
      from,
      from.position,
      'loops',
    )
    return ok(
      builder.build({
        type: 'acceptance',
        accepted: false,
        loops: true,
        note: deterministic
          ? `Never halts: after ${from.position + 1} moves it is back in ${to} and loops forever.`
          : `Not accepted: no branch accepts, and a branch loops forever (it returns to ${to}).`,
      }),
    )
  }

  // A computation that halted — not a branch cut short because its ID was already explored.
  const last = nodes.filter((n) => n.status === 'dead' && n.note === 'no move').sort((a, b) => b.position - a.position)[0] ?? root
  const finalStep = builder.length
  for (const n of [...nodes]) if (n.status === 'live') update(n.id, { status: 'dead', diedAtStep: finalStep, note: 'exhausted' })
  emit(
    k === 1 && nodes.length === last.position + 1
      ? `The machine halted in ${stateText(last.state)}, which is not accepting: the input is rejected after ${last.position} moves.`
      : `Every branch has halted without reaching an accepting state: the input is rejected.`,
    headHighlights(last),
    last,
    last.position,
    'rejected',
  )
  return ok(
    builder.build({
      type: 'acceptance',
      accepted: false,
      note: `Halted in ${stateText(last.state)} after ${last.position} moves without accepting; the tape reads ${tapeContents(last.tapes[0] as Tape, blank) || 'all blanks'}.`,
    }),
  )
}

/** The configuration a finished trace ended in — for function-computing machines, where the output is. */
export function finalConfig(trace: TmTrace): TmConfig {
  const last = trace.steps.at(-1) as Step<TmSnapshot>
  return last.snapshot.current
}

/** How many moves the run made along its reported path. */
export function movesMade(trace: TmTrace): number {
  const last = trace.steps.at(-1) as Step<TmSnapshot>
  return last.snapshot.moves
}

/**
 * The ID sequence in §8.2.3's notation: the accepting computation, or the
 * longest halting one when the input was rejected, or the path explored so
 * far when the run was stopped.
 */
export function tmIdLog(trace: TmTrace): string {
  const last = trace.steps.at(-1) as Step<TmSnapshot>
  const { nodes, machine } = last.snapshot
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const target =
    nodes.find((n) => n.status === 'accepting') ??
    [...nodes].sort((a, b) => b.position - a.position || a.id.localeCompare(b.id))[0]
  if (target === undefined) return ''
  const path: TmBranchNode[] = []
  for (let n: TmBranchNode | undefined = target; n !== undefined; n = n.parent === null ? undefined : byId.get(n.parent)) path.unshift(n)
  return path.map((n) => idText(n, machine.blank)).join(' ⊢ ')
}

/** Whether every (state, scanned symbols) pair has at most one move — a DTM. */
export function isDeterministicTM(machine: TuringMachine): boolean {
  const seen = new Set<string>()
  for (const t of machine.transitions) {
    const key = `${t.from}|${t.read.join(' ')}`
    if (seen.has(key)) return false
    seen.add(key)
  }
  return true
}
