/**
 * The department's own case studies, as working machines.
 *
 * These are not invented examples. They are the assignment list from
 * `TOC Case Study.docx` — Modules 1 and 2, with the Bloom's level and SDG tag
 * the department recorded against each, because those tags are what the
 * accreditation paperwork asks for and re-deriving them by hand is exactly the
 * kind of work a tool should absorb.
 *
 * **On the alphabets.** A DFA over real ASCII would have a hundred and twenty
 * transitions per state and would be unreadable as a diagram, which defeats the
 * point. Several cases therefore abstract the alphabet — `a` for a letter, `d`
 * for a digit — and each says so in its own framing. That is a simplification a
 * student should see stated, not discover.
 */

import { keywordDFA } from './textSearch.js'
import { faTransitionId } from '../ids.js'
import type { FATransition, FiniteAutomaton, Read, StateId, Sym } from '../types.js'

function t(from: StateId, read: Read, to: StateId): FATransition {
  return { id: faTransitionId(from, read, to), from, read, to }
}

/** Bloom's level, as the department writes it. */
export type BloomLevel = 'BTL 3 – Apply' | 'BTL 4 – Analyze'

/**
 * Some cases are naturally an expression and some are naturally a diagram, and
 * forcing either into the other loses the point. A union rather than a machine
 * with an optional expression beside it: there is no case with neither, and no
 * placeholder standing in for one.
 */
export type AppliedSource =
  | { kind: 'regex'; source: string; alphabet: Sym[] }
  | { kind: 'machine'; machine: FiniteAutomaton }

export interface AppliedCase {
  id: string
  title: string
  /** 1 or 2 — the module the case study sits under. */
  module: 1 | 2
  co: 'CO1' | 'CO2'
  bloom: BloomLevel
  /** The UN Sustainable Development Goal the department tagged it with. */
  sdg: string
  /** A paragraph on what the machine models and where it is simplified. */
  framing: string
  source: AppliedSource
  suggested: string[]
}

// ---------------------------------------------------------------------------

/** A four-digit PIN lock is the keyword recogniser for one keyword. */
const PIN = '2317'
const digitLock = keywordDFA([PIN], ['1', '2', '3', '7'])

/**
 * Red → RedAmber → Green → Amber → Red on each tick, with an emergency override
 * that drops straight to Red.
 */
const trafficLight: FiniteAutomaton = {
  kind: 'DFA',
  states: ['Red', 'RedAmber', 'Green', 'Amber'],
  alphabet: ['t', 'e'],
  transitions: [
    t('Red', 't', 'RedAmber'),
    t('RedAmber', 't', 'Green'),
    t('Green', 't', 'Amber'),
    t('Amber', 't', 'Red'),
    t('Red', 'e', 'Red'),
    t('RedAmber', 'e', 'Red'),
    t('Green', 'e', 'Red'),
    t('Amber', 'e', 'Red'),
  ],
  start: 'Red',
  accepting: ['Green'],
  layout: {
    Red: { x: 80, y: 90 },
    RedAmber: { x: 220, y: 90 },
    Green: { x: 360, y: 90 },
    Amber: { x: 500, y: 90 },
  },
}

const EMAIL: AppliedSource = { kind: 'regex', source: 'aa*@aa*.aa*(.aa*)*', alphabet: ['a', '@', '.'] }
const PASSWORD: AppliedSource = { kind: 'regex', source: 'a(a+d+s)*d(a+d+s)*', alphabet: ['a', 'd', 's'] }
const MOBILE: AppliedSource = { kind: 'regex', source: 'hddddddddd', alphabet: ['h', 'd'] }
const LOG: AppliedSource = { kind: 'regex', source: '(E+W+I)*E(E+W+I)*', alphabet: ['E', 'W', 'I'] }

export const APPLIED: AppliedCase[] = [
  {
    id: 'email-validation',
    title: 'Email and URL validation',
    module: 1,
    co: 'CO1',
    bloom: 'BTL 3 – Apply',
    sdg: 'SDG 9 — Industry, Innovation & Infrastructure',
    framing:
      'A local part, an @, a domain, and at least one dot-separated label after it. The alphabet is abstracted so the diagram stays readable: "a" stands for any letter, and "." and "@" are themselves. Real address syntax (RFC 5322) is far larger, and notably is *not* regular once quoted local parts and nested comments are allowed — which is itself worth knowing.',
    source: EMAIL,
    suggested: ['a@a.a', 'aa@aa.aa', 'a@a.a.a', 'a@a', '@a.a'],
  },
  {
    id: 'digital-lock',
    title: 'Digital lock',
    module: 1,
    co: 'CO1',
    bloom: 'BTL 4 – Analyze',
    sdg: 'SDG 16 — Peace, Justice & Strong Institutions',
    framing: `A PIN pad that opens on ${PIN}. It is exactly the keyword-recognising DFA of §2.4 with a single keyword, which is the interesting observation: a lock does not need to remember what you typed, only how much of the PIN you are currently part-way through. A wrong digit does not reset it to the start — it drops to the longest prefix of the PIN that the last few digits still match.`,
    source: { kind: 'machine', machine: digitLock },
    suggested: [PIN, '2317', '22317', '231', '23172317'],
  },
  {
    id: 'traffic-light',
    title: 'Traffic light controller',
    module: 1,
    co: 'CO1',
    bloom: 'BTL 4 – Analyze',
    sdg: 'SDG 11 — Sustainable Cities & Communities',
    framing:
      'Red, red-amber, green, amber, back to red — one step per tick "t", with an emergency "e" that drops straight to red from wherever it is. Green is the accepting state, so the machine accepts exactly those tick sequences that leave the light on green. A controller is not really an acceptor, and framing it as one is the modelling step worth noticing.',
    source: { kind: 'machine', machine: trafficLight },
    suggested: ['tt', 'tttttt', 'tte', 'ttettt', 't'],
  },
  {
    id: 'password-validator',
    title: 'Password pattern validator',
    module: 2,
    co: 'CO2',
    bloom: 'BTL 3 – Apply',
    sdg: 'SDG 16 — Peace, Justice & Strong Institutions',
    framing:
      'Starts with a letter and contains at least one digit. The alphabet abstracts a password into three classes: "a" a letter, "d" a digit, "s" a symbol. Note what is *hard* here — "at least one of each class" is an intersection of three conditions, and writing it as a single expression is painful even though the language is plainly regular. That is a good argument for the closure lab.',
    source: PASSWORD,
    suggested: ['ad', 'aad', 'asd', 'a', 'da'],
  },
  {
    id: 'mobile-validator',
    title: 'Mobile number validator',
    module: 2,
    co: 'CO2',
    bloom: 'BTL 3 – Apply',
    sdg: 'SDG 9 — Industry, Innovation & Infrastructure',
    framing:
      'An Indian mobile number: ten digits, the first between 6 and 9. "h" stands for a high leading digit and "d" for any digit, so the machine is a chain of ten states rather than a chain of ten states each with ten outgoing edges. The abstraction is the whole trick — the language over real digits is the same shape.',
    source: MOBILE,
    suggested: ['hddddddddd', 'hdddddddd', 'dddddddddd', 'hddddddddddd'],
  },
  {
    id: 'log-analysis',
    title: 'Log file analysis',
    module: 2,
    co: 'CO2',
    bloom: 'BTL 4 – Analyze',
    sdg: 'SDG 9 — Industry, Innovation & Infrastructure',
    framing:
      'A log is a sequence of lines, each INFO, WARN or ERROR; this accepts a log containing at least one error. Abstracting a whole line to one symbol is the move that makes it finite-state — and shows why real log analysis reaches for keyword search over the raw characters instead, which is the next case along.',
    source: LOG,
    suggested: ['IIE', 'E', 'IIWI', 'IEWE', ''],
  },
  {
    id: 'keyword-search',
    title: 'Text and keyword search',
    module: 1,
    co: 'CO1',
    bloom: 'BTL 3 – Apply',
    sdg: 'SDG 9 — Industry, Innovation & Infrastructure',
    framing:
      'Detecting keywords in a document, built as the two machines of §2.4. This one has a page of its own, because the interesting part is watching the head scan real text and finding overlapping matches rather than looking at the diagram.',
    source: { kind: 'machine', machine: keywordDFA(['web', 'ebay'], ['w', 'e', 'b', 'a', 'y']) },
    suggested: ['web', 'ebay', 'webay'],
  },
]

export function appliedCase(id: string): AppliedCase | undefined {
  return APPLIED.find((entry) => entry.id === id)
}
