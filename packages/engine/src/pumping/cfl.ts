/**
 * The CFL variant — phases.md P1.2, Hopcroft 2e §7.2.
 *
 * Same game, richer decomposition: w = uvxyz with |vxy| ≤ n and |vy| ≥ 1, and
 * pumping raises v and y together: uvⁱxyⁱz. The window that must fit in n
 * symbols is the reason {aⁿbⁿcⁿ} falls — it can straddle at most two of the
 * three blocks, and whichever two pump, the third is left behind.
 *
 * The adversary is the same shape as the regular one: enumerate every legal
 * quintuple, score each by its bounded pumping record, play the hardest.
 */

import { PUMP_I_BOUND } from './regular.js'
import type { PumpingLanguage } from './oracles.js'
import type { Sym } from '../types.js'

export interface CflDecomposition {
  u: string
  v: string
  x: string
  y: string
  z: string
}

export interface CflScoredSplit {
  decomposition: CflDecomposition
  failingIs: number[]
}

export interface CflAdversaryChoice {
  decomposition: CflDecomposition
  failingIs: number[]
  /** How many quintuples were enumerated — reported, since it is the search space. */
  candidateCount: number
  bound: number
}

/** uvⁱxyⁱz. */
export function cflPumped(d: CflDecomposition, i: number): string {
  return d.u + d.v.repeat(i) + d.x + d.y.repeat(i) + d.z
}

export function cflCheckPump(language: PumpingLanguage, d: CflDecomposition, i: number): boolean {
  return language.membership([...cflPumped(d, i)] as Sym[])
}

/** Every uvxyz with |vxy| ≤ n and |vy| ≥ 1. */
export function allCflSplits(w: string, n: number): CflDecomposition[] {
  const splits: CflDecomposition[] = []

  // The vxy window starts at u's end and spans at most n symbols.
  for (let uEnd = 0; uEnd <= w.length; uEnd++) {
    const windowMax = Math.min(uEnd + n, w.length)
    for (let vEnd = uEnd; vEnd <= windowMax; vEnd++) {
      for (let xEnd = vEnd; xEnd <= windowMax; xEnd++) {
        for (let yEnd = xEnd; yEnd <= windowMax; yEnd++) {
          // |vy| ≥ 1 — at least one of the pumped parts is non-empty.
          if (vEnd === uEnd && yEnd === xEnd) continue
          splits.push({
            u: w.slice(0, uEnd),
            v: w.slice(uEnd, vEnd),
            x: w.slice(vEnd, xEnd),
            y: w.slice(xEnd, yEnd),
            z: w.slice(yEnd),
          })
        }
      }
    }
  }
  return splits
}

export function cflFailingIndices(language: PumpingLanguage, d: CflDecomposition): number[] {
  const failing: number[] = []
  for (let i = 0; i <= PUMP_I_BOUND; i++) {
    if (i === 1) continue
    if (!cflCheckPump(language, d, i)) failing.push(i)
  }
  return failing
}

/** The hardest legal quintuple, by the same ranking the regular adversary uses. */
export function cflAdversarySplit(language: PumpingLanguage, w: string, n: number): CflAdversaryChoice {
  let best: CflScoredSplit | null = null
  let count = 0

  for (const decomposition of allCflSplits(w, n)) {
    count += 1
    const failingIs = cflFailingIndices(language, decomposition)
    const candidate: CflScoredSplit = { decomposition, failingIs }

    if (best === null || cflBetter(candidate, best)) best = candidate
    // A surviving split cannot be beaten; stop the scan early.
    if (best.failingIs.length === 0) break
  }

  const chosen = best ?? {
    decomposition: { u: '', v: w, x: '', y: '', z: '' },
    failingIs: [],
  }
  return {
    decomposition: chosen.decomposition,
    failingIs: chosen.failingIs,
    candidateCount: count,
    bound: PUMP_I_BOUND,
  }
}

function cflBetter(a: CflScoredSplit, b: CflScoredSplit): boolean {
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
