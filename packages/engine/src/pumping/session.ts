/**
 * A pumping-game session — phases.md P1.2.
 *
 * The game is a pure reducer: the UI feeds student moves, every engine response
 * is computed inside `advance`, and the whole session replays from its move
 * list. `sessionTrace` turns a session into an ordinary `Trace`, which is what
 * makes a game replayable and shareable exactly like a simulation — same wire
 * format, same transport bar, no special case anywhere.
 *
 * Two modes:
 *   'prove'  — the student attacks a (non-regular) language: engine fixes n,
 *              student picks w, engine plays the hardest split, student picks i.
 *   'defend' — reverse mode: the student defends a *regular* language: student
 *              claims n, engine picks w, student splits, engine hunts for i.
 *              The engine failing to find one is the lesson — and also why
 *              surviving the game never proves regularity.
 */

import { TraceBuilder } from '../trace.js'
import { err, ok, validationError, type Result } from '../result.js'
import {
  PUMP_I_BOUND,
  adversarySplit,
  checkPump,
  engineAttackIndex,
  engineAttackWord,
  pumped,
  type Decomposition,
} from './regular.js'
import { cflAdversarySplit, cflCheckPump, cflPumped, type CflDecomposition } from './cfl.js'
import type { PumpingLanguage } from './oracles.js'
import type { Highlight, Sym, Trace } from '../types.js'

export type GameMode = 'prove' | 'defend'
export type GameVariant = 'regular' | 'cfl'
export type GamePhase = 'pick-n' | 'pick-w' | 'pick-i' | 'pick-split' | 'won' | 'lost'

interface GameEvent {
  narration: string
  /** The string in play when the event happened, for the snapshot. */
  w: string
  /** Start and length of each pumped span within w, for highlighting. */
  pumpedSpans: { start: number; length: number }[]
  phase: GamePhase
}

export interface PumpingSession {
  languageId: string
  mode: GameMode
  variant: GameVariant
  phase: GamePhase
  /** The claimed pumping length — engine's in prove mode, student's in defend. */
  n: number
  w: string
  split: Decomposition | null
  cflSplit: CflDecomposition | null
  /** Set when the adversary's split survives the whole bounded search. */
  splitSurvives: boolean
  events: GameEvent[]
  /** The i that won, when the game is over. */
  winningI: number | null
}

export type Move =
  | { type: 'choose-n'; n: number }
  | { type: 'choose-w'; w: string }
  | { type: 'choose-i'; i: number }
  | { type: 'choose-split'; x: string; y: string; z: string }
  | { type: 'concede' }

const spanOf = (before: string, part: string): { start: number; length: number } => ({
  start: before.length,
  length: part.length,
})

/** Start a session. In prove mode the engine's n is chosen by difficulty. */
export function startSession(
  language: PumpingLanguage,
  mode: GameMode,
  variant: GameVariant = 'regular',
): PumpingSession {
  const n = mode === 'prove' ? (language.difficulty === 'easy' ? 4 : language.difficulty === 'medium' ? 5 : 6) : 0

  const opening: GameEvent =
    mode === 'prove'
      ? {
          narration: `The engine claims ${language.notation} is ${variant === 'cfl' ? 'context-free' : 'regular'} and announces a pumping length of n = ${n}. Choose a string in the language with at least ${n} symbols.`,
          w: '',
          pumpedSpans: [],
          phase: 'pick-w',
        }
      : {
          narration: `You are defending ${language.notation}. Claim a pumping length n — the engine will then choose a string and try to break your decomposition of it.`,
          w: '',
          pumpedSpans: [],
          phase: 'pick-n',
        }

  return {
    languageId: language.id,
    mode,
    variant,
    phase: opening.phase,
    n,
    w: '',
    split: null,
    cflSplit: null,
    splitSurvives: false,
    events: [opening],
    winningI: null,
  }
}

/** Apply one student move; every engine response happens inside. */
export function advance(
  language: PumpingLanguage,
  session: PumpingSession,
  move: Move,
): Result<PumpingSession> {
  switch (move.type) {
    case 'choose-n':
      return chooseN(language, session, move.n)
    case 'choose-w':
      return chooseW(language, session, move.w)
    case 'choose-i':
      return chooseI(language, session, move.i)
    case 'choose-split':
      return chooseSplit(language, session, move)
    case 'concede': {
      const event: GameEvent = {
        narration: `You concede the round. ${session.mode === 'prove' ? 'The adversary’s decomposition stands — try a different string, or a different index.' : 'The engine’s attack stands — a larger n gives you more room.'}`,
        w: session.w,
        pumpedSpans: [],
        phase: 'lost',
      }
      return ok({ ...session, phase: 'lost', events: [...session.events, event] })
    }
  }
}

function fail(code: string, message: string): Result<never> {
  return err([validationError(code, message, { kind: 'machine' })])
}

function chooseN(language: PumpingLanguage, session: PumpingSession, n: number): Result<PumpingSession> {
  if (session.phase !== 'pick-n') return fail('PUMP_WRONG_PHASE', 'It is not the moment to choose n.')
  if (!Number.isInteger(n) || n < 1 || n > 8) {
    return fail('PUMP_BAD_N', 'Choose a whole pumping length between 1 and 8 — the search is exhaustive, so it must stay small.')
  }

  const attack = engineAttackWord(language, n)
  const event: GameEvent = {
    narration: attack.unanswerable
      ? `You claimed n = ${n}. The engine chooses w = ${attack.w} — and warns that no decomposition with |xy| ≤ ${n} survives its bounded search, so this n is too small. Split it anyway to see why.`
      : `You claimed n = ${n}. The engine chooses w = ${attack.w}. Decompose it as w = xyz with |xy| ≤ ${n} and |y| ≥ 1.`,
    w: attack.w,
    pumpedSpans: [],
    phase: 'pick-split',
  }

  return ok({ ...session, n, w: attack.w, phase: 'pick-split', events: [...session.events, event] })
}

function chooseW(language: PumpingLanguage, session: PumpingSession, w: string): Result<PumpingSession> {
  if (session.phase !== 'pick-w') return fail('PUMP_WRONG_PHASE', 'It is not the moment to choose w.')
  if (!language.membership([...w] as Sym[])) {
    return fail('PUMP_W_NOT_IN_L', `"${w}" is not in ${language.notation} — the string you pump must be in the language.`)
  }
  if (w.length < session.n) {
    return fail('PUMP_W_TOO_SHORT', `The lemma only speaks about strings of length at least n = ${session.n}; "${w}" is shorter.`)
  }
  if (w.length > 24) {
    return fail('PUMP_W_TOO_LONG', 'Keep w to 24 symbols or fewer — the adversary checks every decomposition exhaustively.')
  }

  if (session.variant === 'cfl') {
    const choice = cflAdversarySplit(language, w, session.n)
    const d = choice.decomposition
    const survives = choice.failingIs.length === 0
    const event: GameEvent = {
      narration: survives
        ? `The adversary examined ${choice.candidateCount} decompositions and found one that survives every i up to ${choice.bound}: u=${part(d.u)}, v=${part(d.v)}, x=${part(d.x)}, y=${part(d.y)}, z=${part(d.z)}. You cannot win with this w — choose a better one.`
        : `The adversary examined ${choice.candidateCount} decompositions and plays the hardest: u=${part(d.u)}, v=${part(d.v)}, x=${part(d.x)}, y=${part(d.y)}, z=${part(d.z)}. Choose i to pump v and y together (the search is bounded at i ≤ ${choice.bound}).`,
      w,
      pumpedSpans: [
        spanOf(d.u, d.v),
        { start: (d.u + d.v + d.x).length, length: d.y.length },
      ],
      phase: survives ? 'pick-w' : 'pick-i',
    }
    return ok({
      ...session,
      w,
      cflSplit: d,
      splitSurvives: survives,
      phase: survives ? 'pick-w' : 'pick-i',
      events: [...session.events, event],
    })
  }

  const choice = adversarySplit(language, w, session.n)
  const d = choice.decomposition
  const survives = choice.failingIs.length === 0
  const event: GameEvent = {
    narration: survives
      ? `The adversary examined ${choice.candidates.length} decompositions and found one that survives every i up to ${choice.bound}: x=${part(d.x)}, y=${part(d.y)}, z=${part(d.z)}. You cannot win with this w — choose a better one.`
      : `The adversary examined ${choice.candidates.length} decompositions and plays the hardest: x=${part(d.x)}, y=${part(d.y)}, z=${part(d.z)}. Choose i ≥ 0, i ≠ 1 (the search is bounded at i ≤ ${choice.bound}).`,
    w,
    pumpedSpans: [spanOf(d.x, d.y)],
    phase: survives ? 'pick-w' : 'pick-i',
  }

  return ok({
    ...session,
    w,
    split: d,
    splitSurvives: survives,
    phase: survives ? 'pick-w' : 'pick-i',
    events: [...session.events, event],
  })
}

function chooseI(language: PumpingLanguage, session: PumpingSession, i: number): Result<PumpingSession> {
  if (session.phase !== 'pick-i') return fail('PUMP_WRONG_PHASE', 'It is not the moment to choose i.')
  if (!Number.isInteger(i) || i < 0 || i > PUMP_I_BOUND) {
    return fail('PUMP_BAD_I', `Choose a whole i between 0 and ${PUMP_I_BOUND}.`)
  }
  if (i === 1) {
    return fail('PUMP_I_ONE', 'i = 1 gives back w itself, which is in the language by assumption — it can never win.')
  }

  const isCfl = session.variant === 'cfl'
  const inL = isCfl
    ? session.cflSplit !== null && cflCheckPump(language, session.cflSplit, i)
    : session.split !== null && checkPump(language, session.split, i)
  const result = isCfl
    ? session.cflSplit === null
      ? ''
      : cflPumped(session.cflSplit, i)
    : session.split === null
      ? ''
      : pumped(session.split, i)

  const shown = result === '' ? 'the empty string' : result
  const event: GameEvent = {
    narration: inL
      ? `Pumping with i = ${i} gives ${shown}, which is still in the language — the oracle accepts it. Try another i, or concede.`
      : `Pumping with i = ${i} gives ${shown}, which is NOT in the language. The adversary’s best decomposition has failed: you win the round.`,
    w: session.w,
    pumpedSpans: [],
    phase: inL ? 'pick-i' : 'won',
  }

  return ok({
    ...session,
    phase: inL ? 'pick-i' : 'won',
    winningI: inL ? null : i,
    events: [...session.events, event],
  })
}

function chooseSplit(
  language: PumpingLanguage,
  session: PumpingSession,
  move: { x: string; y: string; z: string },
): Result<PumpingSession> {
  if (session.phase !== 'pick-split') return fail('PUMP_WRONG_PHASE', 'It is not the moment to choose a split.')
  const { x, y, z } = move
  if (x + y + z !== session.w) return fail('PUMP_SPLIT_MISMATCH', 'x, y and z must concatenate to exactly w.')
  if (y.length === 0) return fail('PUMP_EMPTY_Y', 'The pumped part y must be non-empty — |y| ≥ 1.')
  if (x.length + y.length > session.n) {
    return fail('PUMP_XY_TOO_LONG', `|xy| must be at most your claimed n = ${session.n}.`)
  }

  const split: Decomposition = { x, y, z }
  const attack = engineAttackIndex(language, split)

  if (attack === null) {
    const event: GameEvent = {
      narration: `The engine searched every i up to ${PUMP_I_BOUND} and xyⁱz stayed in the language throughout — it concedes, and your decomposition pumps. Surviving the game is evidence, not proof: the lemma’s converse does not hold.`,
      w: session.w,
      pumpedSpans: [spanOf(x, y)],
      phase: 'won',
    }
    return ok({ ...session, split, phase: 'won', events: [...session.events, event] })
  }

  const broken = pumped(split, attack)
  const event: GameEvent = {
    narration: `The engine plays i = ${attack}: xyⁱz = ${broken === '' ? 'the empty string' : broken}, which is not in the language. Your decomposition breaks — choose another split of the same w.`,
    w: session.w,
    pumpedSpans: [spanOf(x, y)],
    phase: 'pick-split',
  }
  return ok({ ...session, split, events: [...session.events, event] })
}

function part(s: string): string {
  return s === '' ? 'ε' : s
}

// ---------------------------------------------------------------------------
// The session as a Trace
// ---------------------------------------------------------------------------

interface GameSnapshot {
  languageId: string
  mode: GameMode
  variant: GameVariant
  phase: GamePhase
  n: number
  input: Sym[]
  [key: string]: unknown
}

export function sessionTrace(language: PumpingLanguage, session: PumpingSession): Trace {
  const builder = new TraceBuilder<GameSnapshot>(
    session.variant === 'cfl' ? 'game.pumping.cfl' : 'game.pumping.regular',
    { languageId: session.languageId, mode: session.mode, n: session.n },
  )

  for (const event of session.events) {
    const input = [...event.w] as Sym[]
    const highlight: Highlight[] = event.pumpedSpans.flatMap((span) =>
      Array.from({ length: span.length }, (_, k) => ({
        type: 'input' as const,
        position: span.start + k,
        role: 'read' as const,
      })),
    ).filter((h) => h.position < input.length)

    builder.step({
      narration: event.narration,
      highlight,
      snapshot: {
        languageId: session.languageId,
        mode: session.mode,
        variant: session.variant,
        phase: event.phase,
        n: session.n,
        input,
      },
    })
  }

  return builder.build({
    type: 'value',
    value: { outcome: session.phase, winningI: session.winningI, w: session.w },
  }) as Trace
}

// ---------------------------------------------------------------------------
// The proof paragraph
// ---------------------------------------------------------------------------

/**
 * Exam prose for a won round. Honest about what was checked: the adversary
 * enumerated every decomposition of *this* w and each failed within the bound,
 * which is exactly the ∀-decomposition step of the written proof, instantiated.
 */
export function proofParagraph(language: PumpingLanguage, session: PumpingSession): string | null {
  if (session.phase !== 'won') return null

  if (session.mode === 'defend') {
    return (
      `Claim: ${language.notation} satisfies the pumping lemma with pumping length n = ${session.n}. ` +
      `For the challenge string w = ${session.w}, the decomposition x = ${part(session.split?.x ?? '')}, ` +
      `y = ${part(session.split?.y ?? '')}, z = ${part(session.split?.z ?? '')} satisfies |xy| ≤ n and |y| ≥ 1, ` +
      `and xyⁱz remained in L for every i ≤ ${PUMP_I_BOUND} the engine tried — ${language.proofNote}. ` +
      `Note what this does and does not show: a language that pumps is not thereby regular; the lemma runs in one direction only.`
    )
  }

  const isCfl = session.variant === 'cfl'
  const d = session.split
  const cd = session.cflSplit
  const splitText = isCfl
    ? `u = ${part(cd?.u ?? '')}, v = ${part(cd?.v ?? '')}, x = ${part(cd?.x ?? '')}, y = ${part(cd?.y ?? '')}, z = ${part(cd?.z ?? '')}`
    : `x = ${part(d?.x ?? '')}, y = ${part(d?.y ?? '')}, z = ${part(d?.z ?? '')}`
  const pumpedWord = isCfl
    ? cd === null
      ? ''
      : cflPumped(cd, session.winningI ?? 0)
    : d === null
      ? ''
      : pumped(d, session.winningI ?? 0)
  const lemmaName = isCfl ? 'pumping lemma for context-free languages' : 'pumping lemma for regular languages'
  const property = isCfl ? 'context-free' : 'regular'
  const shape = isCfl ? 'w = uvxyz with |vxy| ≤ n and |vy| ≥ 1' : 'w = xyz with |xy| ≤ n and |y| ≥ 1'

  return (
    `Suppose ${language.notation} were ${property}. The ${lemmaName} then gives a pumping length n; ` +
    `take n = ${session.n} as played. Choose w = ${session.w} ∈ L, with |w| = ${session.w.length} ≥ n. ` +
    `Consider any decomposition ${shape}: ${language.proofNote}. ` +
    `The adversary played its strongest decomposition, ${splitText}, and pumping with i = ${session.winningI} ` +
    `gives ${pumpedWord === '' ? 'the empty string' : pumpedWord}, which is not in L — and the engine verified that ` +
    `every other legal decomposition of this w also fails for some i ≤ ${PUMP_I_BOUND}. ` +
    `This contradicts the lemma, so L is not ${property}. ∎`
  )
}
