/**
 * The language classes, and where the course's languages sit among them.
 *
 * Two figures, joined. Fig. 9.2 (p. 374) draws the recursive languages inside
 * the RE languages inside all languages, with L_u in the middle ring and L_d
 * outside every ring. Everything before Chapter 9 sits inside the innermost of
 * those, and the whole course is the sequence of separations that proves each
 * containment proper: the pumping lemma of §4.1 separates regular from
 * context-free, the pumping lemma of §7.2 separates context-free from what lies
 * beyond, and diagonalization separates RE from everything.
 *
 * **Scope.** Every class here carries a citation except the context-sensitive
 * languages, whose `citation` is null. The prescribed sections do not cover
 * linear bounded automata or context-sensitive grammars; the ring is listed
 * because the syllabus's own tutorial component ("Language Classification —
 * Regular, CFL, CSL, Recursive, RE") names it, and leaving a hole where a
 * student is told to expect a class would be worse. It claims nothing about
 * where in Hopcroft it can be read, because it cannot be read there.
 *
 * Nothing here is a link. Classes and languages name *topics*; the web app maps
 * a topic to a route, because routes are the app's business and not the
 * engine's.
 */

// ---------------------------------------------------------------------------
// The rings
// ---------------------------------------------------------------------------

export type ClassId = 'regular' | 'cfl' | 'csl' | 'recursive' | 're' | 'all'

export interface LanguageClass {
  id: ClassId
  title: string
  /** How deep the ring is: 0 is innermost. Containment is exactly this order. */
  depth: number
  /** The machine that defines the class. */
  machine: string
  /** The grammar that defines it, where the course names one. */
  grammar?: string
  /** What it is closed under, and what it is not. */
  closure: string
  /** The pumping lemma for the class, where there is one in scope. */
  pumping?: string
  /** What can be decided about a language in the class. */
  decision: string
  /** Hopcroft 2e, or null where the prescribed sections do not carry the class. */
  citation: string | null
  /** Topic ids the app turns into links. */
  topics: string[]
}

/** Innermost first. `depth` is the containment order, and it is proper at every step. */
export const LANGUAGE_CLASSES: LanguageClass[] = [
  {
    id: 'regular',
    title: 'Regular',
    depth: 0,
    machine: 'A finite automaton — deterministic, nondeterministic or with ε-transitions. All three accept exactly this class.',
    grammar: 'A regular expression. Theorem 3.7 turns one into an ε-NFA, and state elimination turns a DFA back into one.',
    closure:
      'Closed under everything the course meets: union, intersection, complement, difference, concatenation, closure, reversal, homomorphism and inverse homomorphism.',
    pumping:
      'Theorem 4.1. Every string of length at least n splits as xyz with |xy| ≤ n and y non-empty, and xyᵏz stays in the language.',
    decision:
      'Membership, emptiness, finiteness and equivalence of two machines are all decidable, and the minimal DFA is unique.',
    citation: '2, 3, 4',
    topics: ['fa.dfa', 'regex.basics', 'regular.closure', 'regular.pumping', 'fa.minimize'],
  },
  {
    id: 'cfl',
    title: 'Context-free',
    depth: 1,
    machine: 'A pushdown automaton. Nondeterministic PDAs accept exactly this class; deterministic ones accept strictly less.',
    grammar: 'A context-free grammar, every production A → α with a single variable on the left.',
    closure:
      'Closed under union, concatenation, closure, reversal, substitution, homomorphism, inverse homomorphism, and intersection with a regular language. Not closed under intersection, complement or difference.',
    pumping:
      'Theorem 7.18. Every string of length at least n splits as uvwxy with |vwx| ≤ n and vx non-empty, and uvᵏwxᵏy stays in the language.',
    decision:
      'Membership and emptiness are decidable. Ambiguity, equivalence, and whether a CFL is regular are not — §7.4 lists them, and this course does not.',
    citation: '5, 6, 7',
    topics: ['cfg.basics', 'pda.basics', 'cfl.pumping', 'cfl.closure', 'cfg.cnf'],
  },
  {
    id: 'csl',
    title: 'Context-sensitive',
    depth: 2,
    machine: 'A linear bounded automaton: a Turing machine whose head never leaves the cells the input occupies.',
    grammar: 'A context-sensitive grammar, every production α → β with |α| ≤ |β|.',
    closure: 'Closed under union, intersection, concatenation, closure and complement.',
    decision: 'Membership is decidable, so every context-sensitive language is recursive. Emptiness is not.',
    citation: null,
    topics: [],
  },
  {
    id: 'recursive',
    title: 'Recursive (decidable)',
    depth: 3,
    machine: 'A Turing machine that always halts: it accepts the strings in the language and halts without accepting on every other string.',
    closure:
      'Closed under complement — Theorem 9.3 — and under union, intersection, concatenation and closure. Not closed under homomorphism, because erasing symbols destroys the bound on how many preimages there are to test.',
    decision: 'Membership is decidable, by definition: that is what this class is.',
    citation: '9.2.1',
    topics: ['undecidability.recursive', 'tm.basics'],
  },
  {
    id: 're',
    title: 'Recursively enumerable',
    depth: 4,
    machine: 'A Turing machine. It accepts every string in the language, and on a string outside it may halt without accepting — or may run forever.',
    closure:
      'Closed under union, intersection, concatenation, closure, homomorphism and inverse homomorphism. Not closed under complement: the complement of L_u is not RE.',
    decision:
      'Membership is only semi-decidable: a yes eventually arrives, and a no may never. L_u is the language of exactly this question, and Theorem 9.6 says it is not recursive.',
    citation: '9.1, 9.2',
    topics: ['undecidability.universal', 'undecidability.reduction'],
  },
  {
    id: 'all',
    title: 'Every language',
    depth: 5,
    machine: 'None. Outside the RE ring there is no Turing machine at all, which is more than saying there is no algorithm.',
    closure: 'Not a question with an answer here: this is the set of all subsets of Σ*, and there are uncountably many of them while there are only countably many Turing machines.',
    decision: 'Nothing. L_d is the concrete witness, built by diagonalization in §9.1.3.',
    citation: '9.1.3, 9.1.4',
    topics: ['undecidability.diagonalization'],
  },
]

export function languageClass(id: ClassId): LanguageClass | undefined {
  return LANGUAGE_CLASSES.find((c) => c.id === id)
}

// ---------------------------------------------------------------------------
// The languages plotted on the map
// ---------------------------------------------------------------------------

export interface CanonicalLanguage {
  id: string
  /** As the book writes it. */
  notation: string
  /** The innermost class that contains it. */
  ring: ClassId
  /** Why it is in that ring rather than the one inside it. */
  why: string
  /** The topic whose page carries the proof. */
  proofTopic?: string
  citation: string | null
}

/**
 * One or two languages per ring, each placed by a proof the course actually
 * carries out. A language is listed only where the separation that puts it there
 * is one a student is examined on.
 */
export const CANONICAL_LANGUAGES: CanonicalLanguage[] = [
  {
    id: 'contains-01',
    notation: '{w | w has 01 as a substring}',
    ring: 'regular',
    why: 'A four-state DFA accepts it — Fig. 2.4 — and a regular expression describes it: (0+1)*01(0+1)*.',
    proofTopic: 'fa.dfa',
    citation: '2.2',
  },
  {
    id: 'ends-01',
    notation: '{w | w ends in 01}',
    ring: 'regular',
    why: 'An NFA guesses where the final 01 begins (Fig. 2.9); the subset construction turns the guess into a DFA.',
    proofTopic: 'fa.subset',
    citation: '2.3',
  },
  {
    id: 'zeros-ones',
    notation: '{0ⁿ1ⁿ | n ≥ 1}',
    ring: 'cfl',
    why: 'Not regular: pump the 0s of 0ⁿ1ⁿ and the counts stop matching. Context-free by the grammar S → 0S1 | 01, and a Turing machine for it is Fig. 8.9.',
    proofTopic: 'regular.pumping',
    citation: '4.1.2, 7.2',
  },
  {
    id: 'wwr',
    notation: '{wwᴿ | w in (0+1)*}',
    ring: 'cfl',
    why: 'The PDA of Fig. 6.2 pushes w, guesses the middle, and pops against wᴿ. It is not regular, and no deterministic PDA accepts it — the guess is essential.',
    proofTopic: 'pda.basics',
    citation: '6.1, 6.4.1',
  },
  {
    id: 'abc-equal',
    notation: '{aⁿbⁿcⁿ | n ≥ 1}',
    ring: 'csl',
    why: 'Not context-free: the CFL pumping lemma splits uvwxy so that vwx spans at most two of the three blocks, and pumping unbalances the third. A Turing machine accepts it by crossing off one of each in turn.',
    proofTopic: 'cfl.pumping',
    citation: '7.2.2',
  },
  {
    id: 'ww',
    notation: '{ww | w in (0+1)*}',
    ring: 'csl',
    why: 'Not context-free, by the same lemma — and note the contrast with wwᴿ, which is. Reversing lets a stack match the halves; repeating does not.',
    proofTopic: 'cfl.pumping',
    citation: '7.2.2',
  },
  {
    id: 'l-u',
    notation: 'L_u = {(M, w) | M accepts w}',
    ring: 're',
    why: 'RE because the universal Turing machine of §9.2.3 accepts it. Not recursive by Theorem 9.6: a decider for it would give a Turing machine for L_d.',
    proofTopic: 'undecidability.universal',
    citation: '9.2.3, 9.2.4, Thm 9.6',
  },
  {
    id: 'halting',
    notation: '{(M, w) | M halts on w}',
    ring: 're',
    why: 'The halting problem, and the box in §9.2.4 places it here: RE but not recursive, like L_u. Turing’s own machines accepted by halting rather than by final state.',
    proofTopic: 'undecidability.reduction',
    citation: '9.2.4',
  },
  {
    id: 'complement-l-d',
    notation: 'the complement of L_d',
    ring: 're',
    why: 'Example 9.5. L_d is not RE, so its complement is either non-RE or RE-but-not-recursive, and it is the latter — it is the set of wᵢ that Mᵢ accepts, which the universal machine can look for.',
    proofTopic: 'undecidability.diagonalization',
    citation: '9.2.2, Example 9.5',
  },
  {
    id: 'l-d',
    notation: 'L_d = {wᵢ | Mᵢ does not accept wᵢ}',
    ring: 'all',
    why: 'Theorem 9.2: no Turing machine accepts it. Complementing the diagonal of Fig. 9.1 gives a characteristic vector that differs from every row, and every machine is a row.',
    proofTopic: 'undecidability.diagonalization',
    citation: '9.1.3, 9.1.4, Thm 9.2',
  },
  {
    id: 'complement-l-u',
    notation: 'the complement of L_u',
    ring: 'all',
    why: 'If it were RE then both it and L_u would be, and Theorem 9.4 would make L_u recursive — which Theorem 9.6 forbids. So it is not RE.',
    proofTopic: 'undecidability.reduction',
    citation: '9.2.2, Thm 9.4',
  },
]

/**
 * A separation the course does not exhibit, recorded rather than papered over.
 *
 * Every other containment on the map comes with a language that proves it
 * proper. This one does not: recursive-but-not-context-sensitive languages exist
 * by a diagonal argument over the linear bounded automata, and no natural
 * example is standard at this level. Saying so is better than inventing one.
 */
export const UNWITNESSED_SEPARATION = {
  inner: 'csl' as ClassId,
  outer: 'recursive' as ClassId,
  why: 'The containment is proper — a diagonal argument over the linear bounded automata produces a recursive language that no LBA accepts — but no memorable language is standard here, and the prescribed sections do not carry the argument. The map says so rather than naming one.',
}

// ---------------------------------------------------------------------------
// Closure for the recursive and RE languages — §9.2.2 and Exercise 9.2.6
// ---------------------------------------------------------------------------

export type Closedness = 'closed' | 'not-closed'

export interface ClosureRow {
  op: string
  recursive: Closedness
  re: Closedness
  /** The construction that shows closure, or the language that shows there is none. */
  recursiveWhy: string
  reWhy: string
  /**
   * Whether the book carries the result out or sets it as an exercise.
   * §9.2.2 proves complementation; §9.2.6 asks for the rest and prints no
   * answers, so those rows are worked here and say so.
   */
  source: 'printed' | 'exercise'
  citation: string
}

export const RECURSIVE_RE_CLOSURE: ClosureRow[] = [
  {
    op: 'Union',
    recursive: 'closed',
    re: 'closed',
    recursiveWhy:
      'Run M₁ on w; if it accepts, accept. Otherwise run M₂. Both are guaranteed to halt, so the combination is too.',
    reWhy:
      'Simulate M₁ and M₂ in parallel, one on each tape, the way Fig. 9.4 does, and accept as soon as either accepts. Neither need halt, and neither has to.',
    source: 'exercise',
    citation: '9.2.5, Exercise 9.2.6(a)',
  },
  {
    op: 'Intersection',
    recursive: 'closed',
    re: 'closed',
    recursiveWhy: 'Run both machines and accept only if both accepted. Both halt, so the test finishes.',
    reWhy: 'Simulate both in parallel and accept only once both have accepted. If either never does, the machine never accepts — which is allowed.',
    source: 'exercise',
    citation: '9.2.5, Exercise 9.2.6(b)',
  },
  {
    op: 'Concatenation',
    recursive: 'closed',
    re: 'closed',
    recursiveWhy:
      'A string w has exactly |w| + 1 splits into xy. Test each one — is x in L₁ and y in L₂ — and accept if any works. Finitely many halting tests.',
    reWhy: 'Guess the split nondeterministically, then run both machines on the two halves. Theorem 8.11 turns the guess back into a deterministic machine.',
    source: 'exercise',
    citation: '9.2.5, Exercise 9.2.6(c)',
  },
  {
    op: 'Kleene closure',
    recursive: 'closed',
    re: 'closed',
    recursiveWhy:
      'w is in L* when some prefix is in L and what remains is in L*. There are finitely many prefixes and each subproblem is shorter, so the recursion halts.',
    reWhy: 'Guess how to cut w into pieces and accept once every piece has been accepted.',
    source: 'exercise',
    citation: '9.2.5, Exercise 9.2.6(d)',
  },
  {
    op: 'Complement',
    recursive: 'closed',
    re: 'not-closed',
    recursiveWhy:
      'Theorem 9.3, and Fig. 9.3 is the construction: make M’s accepting states halt without accepting, add one new accepting state, and send every configuration where M halted without accepting to it. M always halts, so the swap is total.',
    reWhy:
      'L_u is RE. If its complement were RE as well, Theorem 9.4 would make L_u recursive — and Theorem 9.6 says it is not. So the complement of L_u is RE for no machine at all.',
    source: 'printed',
    citation: '9.2.2, Thms 9.3 and 9.4',
  },
  {
    op: 'Homomorphism',
    recursive: 'not-closed',
    re: 'closed',
    recursiveWhy:
      'Deciding whether w is in h(L) means asking whether any preimage of w is in L. If h never erases, a preimage is no longer than w, so there are finitely many to try and the class is closed. If h may erase, that bound is gone: the preimages are unbounded in length, and the image of a recursive language can be any RE language — L_u among them.',
    reWhy: 'Guess a preimage x, check that h(x) = w, and run M on x. Nothing has to halt, so nothing needs bounding.',
    source: 'exercise',
    citation: '9.2.5, Exercise 9.2.6(e)',
  },
  {
    op: 'Inverse homomorphism',
    recursive: 'closed',
    re: 'closed',
    recursiveWhy: 'w is in h⁻¹(L) exactly when h(w) is in L. Compute h(w) — one string — and decide it. A single halting test.',
    reWhy: 'The same construction, run on a machine that need not halt.',
    source: 'exercise',
    citation: '9.2.5, Exercise 9.2.6(f)',
  },
]

/**
 * The four places a language and its complement can sit — §9.2.2, p. 377.
 *
 * "Of the nine possible ways to place a language L and its complement in the
 * diagram of Fig. 9.2, only the following four are possible." Theorem 9.3 rules
 * out a recursive language whose complement is not, and Theorem 9.4 rules out
 * both being RE without both being recursive.
 */
export const COMPLEMENT_PLACEMENTS = [
  { language: 'recursive', complement: 'recursive', possible: true, why: 'Both in the inner ring. Theorem 9.3 makes this the only option once either one is recursive.' },
  { language: 'not-re', complement: 'not-re', possible: true, why: 'Both in the outer region. Neither has a Turing machine.' },
  { language: 're-not-recursive', complement: 'not-re', possible: true, why: 'One in the middle ring, the other outside — L_u and its complement.' },
  { language: 'not-re', complement: 're-not-recursive', possible: true, why: 'The same, the other way round — L_d and its complement.' },
  { language: 'recursive', complement: 're-not-recursive', possible: false, why: 'Ruled out by Theorem 9.3: if L is recursive then so is its complement.' },
  { language: 'recursive', complement: 'not-re', possible: false, why: 'Ruled out by Theorem 9.3, for the same reason.' },
  { language: 're-not-recursive', complement: 'recursive', possible: false, why: 'Ruled out by Theorem 9.3 applied to the complement.' },
  { language: 're-not-recursive', complement: 're-not-recursive', possible: false, why: 'Ruled out by Theorem 9.4: if both are RE, both are recursive.' },
  { language: 'not-re', complement: 'recursive', possible: false, why: 'Ruled out by Theorem 9.3 applied to the complement.' },
] as const
