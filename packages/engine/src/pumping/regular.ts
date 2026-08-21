/**
 * The adversary for the regular pumping game — phases.md P1.2.
 *
 * The lemma is a two-player game with alternating quantifiers:
 *
 *     ∃n  ∀w∈L,|w|≥n  ∃ w=xyz, |xy|≤n, |y|≥1  ∀i≥0 : xyⁱz ∈ L
 *
 * The engine plays the ∃ moves (defending "L is regular"), the student plays
 * the ∀ moves. What makes the game honest is that the engine's decomposition
 * choice is **genuinely adversarial**: it enumerates every legal split, scores
 * each by how long it survives pumping, and plays the hardest one. Beating the
 * best split the defender has is what a pumping-lemma proof *is*.
 *
 * The search over pumping indices is explicitly bounded and the bound travels
 * with every answer (§2.6): "fails for some i ≤ 12" is a checked fact, "fails
 * for some i" would be a claim nobody verified.
 */

import type { PumpingLanguage } from './oracles.js'
import type { Sym } from '../types.js'

/**
 * The bound on the pumping indices the engine searches.
 *
 * i = 1 is never checked — xy¹z is w itself, which is in L by assumption.
 * Everything else from 0 to the bound is. Twelve is far past where any preset
 * needs to look, and small enough that the exhaustive split-by-split search
 * stays instant.
 */
export const PUMP_I_BOUND = 12

export interface Decomposition {
  x: string
  y: string
  z: string
}

/** One candidate split, with its record against the bounded pumping search. */
export interface ScoredSplit {
  decomposition: Decomposition
  /** The i ≤ bound for which xyⁱz ∉ L. Empty = survives the whole search. */
  failingIs: number[]
}

export interface AdversaryChoice {
  decomposition: Decomposition
  /** Empty when the split survives every i ≤ bound — the student cannot win. */
  failingIs: number[]
  /** Every split the engine considered, for the "I checked them all" claim. */
  candidates: ScoredSplit[]
  bound: number
}

/** xyⁱz. */
export function pumped(decomposition: Decomposition, i: number): string {
  return decomposition.x + decomposition.y.repeat(i) + decomposition.z
}

/** Whether xyⁱz ∈ L, by the oracle. */
export function checkPump(language: PumpingLanguage, decomposition: Decomposition, i: number): boolean {
  return language.membership([...pumped(decomposition, i)] as Sym[])
}

/** Every legal decomposition of w: |xy| ≤ n, |y| ≥ 1. */
export function allSplits(w: string, n: number): Decomposition[] {
  const splits: Decomposition[] = []
  const xyMax = Math.min(n, w.length)
  for (let xEnd = 0; xEnd < xyMax; xEnd++) {
    for (let yEnd = xEnd + 1; yEnd <= xyMax; yEnd++) {
      splits.push({ x: w.slice(0, xEnd), y: w.slice(xEnd, yEnd), z: w.slice(yEnd) })
    }
  }
  return splits
}

/** The is ≤ bound (skipping 1) for which this split fails. */
export function failingIndices(language: PumpingLanguage, decomposition: Decomposition): number[] {
  const failing: number[] = []
  for (let i = 0; i <= PUMP_I_BOUND; i++) {
    if (i === 1) continue
    if (!checkPump(language, decomposition, i)) failing.push(i)
  }
  return failing
}

/**
 * The engine's move: the hardest legal decomposition of w.
 *
 * Ranking, best first:
 *   1. A split with no failing i in the bound — the student cannot win with
 *      this w, and should be told to choose a better one.
 *   2. Otherwise, the split whose *smallest* failing i is largest: the student
 *      has to search furthest to beat it. Ties: fewest failing is, then the
 *      earliest in enumeration order, so the choice is deterministic.
 *
 * This is what stops the naive play. For L = {0ⁱ : i prime} and w = 0⁵, the
 * lazy split y = 0 dies instantly at i = 2 (six is composite) — but y = 00
 * survives i = 2 because seven is prime, so that is the split a real defender
 * plays, and the one this function returns.
 */
export function adversarySplit(language: PumpingLanguage, w: string, n: number): AdversaryChoice {
  const candidates: ScoredSplit[] = allSplits(w, n).map((decomposition) => ({
    decomposition,
    failingIs: failingIndices(language, decomposition),
  }))

  let best: ScoredSplit | null = null
  for (const candidate of candidates) {
    if (best === null) {
      best = candidate
      continue
    }
    if (better(candidate, best)) best = candidate
  }

  // allSplits is empty only for w = '' — which pick-w validation forbids.
  const chosen = best ?? { decomposition: { x: '', y: w, z: '' }, failingIs: [] }
  return {
    decomposition: chosen.decomposition,
    failingIs: chosen.failingIs,
    candidates,
    bound: PUMP_I_BOUND,
  }
}

function better(a: ScoredSplit, b: ScoredSplit): boolean {
  const aSurvives = a.failingIs.length === 0
  const bSurvives = b.failingIs.length === 0
  if (aSurvives !== bSurvives) return aSurvives

  if (!aSurvives) {
    const aMin = a.failingIs[0] as number
    const bMin = b.failingIs[0] as number
    if (aMin !== bMin) return aMin > bMin
    if (a.failingIs.length !== b.failingIs.length) return a.failingIs.length < b.failingIs.length
  }
  return false
}

/**
 * The defender's winning decomposition for a *regular* language.
 *
 * Run w through the DFA and find the first repeated state among the first n+1
 * configurations — the pigeonhole loop. x drives to the loop, y goes round it,
 * so xyⁱz stays in L for every i. This is the strategy reverse mode teaches,
 * and the constructive content of the lemma's proof.
 */
export function defenderSplit(language: PumpingLanguage, w: string): Decomposition | null {
  const dfa = language.dfa
  if (dfa === undefined) return null

  const move = (from: string, sym: string): string | null =>
    dfa.transitions.find((t) => t.from === from && t.read === sym)?.to ?? null

  const visited = new Map<string, number>()
  let state = dfa.start
  visited.set(state, 0)

  for (let at = 0; at < w.length; at++) {
    const next = move(state, w[at] as string)
    if (next === null) return null
    state = next

    const seenAt = visited.get(state)
    if (seenAt !== undefined) {
      return { x: w.slice(0, seenAt), y: w.slice(seenAt, at + 1), z: w.slice(at + 1) }
    }
    visited.set(state, at + 1)
  }

  return null
}

/** The true pumping length of a regular preset: its state count. */
export function truePumpingLength(language: PumpingLanguage): number | null {
  return language.dfa?.states.length ?? null
}

export interface EngineAttack {
  /** The string the engine challenges with. */
  w: string
  /**
   * Whether, for this w, *every* legal split fails for some i in the bound —
   * i.e. the student cannot answer, and their n was too small.
   */
  unanswerable: boolean
}

/**
 * Reverse mode: the engine's choice of w against a student-claimed n.
 *
 * The engine wants a w ∈ L, |w| ≥ n, for which no split survives. For a
 * regular language with n at least the true pumping length, no such w exists —
 * which is the point reverse mode makes — so the engine settles for the
 * suggested string and loses gracefully. For an n that is too small, the
 * bounded search can find a genuinely unanswerable w.
 */
export function engineAttackWord(language: PumpingLanguage, n: number): EngineAttack {
  // Candidate strings: the preset's suggestion at several lengths.
  const candidates = [language.suggestedW(n), language.suggestedW(n + 1), language.suggestedW(n + 2)]
    .filter((w) => w.length >= n && language.membership([...w] as Sym[]))

  for (const w of candidates) {
    const splits = allSplits(w, n)
    const unanswerable =
      splits.length > 0 && splits.every((d) => failingIndices(language, d).length > 0)
    if (unanswerable) return { w, unanswerable: true }
  }

  const fallback = candidates[0] ?? language.suggestedW(n)
  return { w: fallback, unanswerable: false }
}

/** The engine's i against a student split in reverse mode, or null to concede. */
export function engineAttackIndex(
  language: PumpingLanguage,
  decomposition: Decomposition,
): number | null {
  const failing = failingIndices(language, decomposition)
  return failing.length > 0 ? (failing[0] as number) : null
}
