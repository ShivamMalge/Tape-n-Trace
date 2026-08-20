# Architecture — Tape-n-Trace

> **Status: pre-implementation.** This document specifies the system to be built. No code exists yet.
> It is authoritative over the PRD where the two disagree; divergences are recorded in §12 (ADRs).

Companion documents: [phases.md](phases.md) · [documentation.md](documentation.md) · [README.md](README.md)

---

## 1. Purpose

Tape-n-Trace is a Theory of Computation workbench. It simulates machines, animates conversions between
representations, and answers decidable questions about languages — and it emits a replayable **trace**
for every one of those operations. The same engine is published as a Python package (**Vyakarana**) that
renders inside Jupyter and Colab.

This document fixes the boundaries, the contracts across them, and the decisions that are expensive to
reverse.

---

## 2. Principles

These are enforced by lint, CI, or code review — not by good intentions.

1. **The engine is pure TypeScript.** No React, no Next, no DOM, no `window`, no timers. Enforced by
   `no-restricted-imports` in the engine's own ESLint config, failing CI.
2. **Every algorithm returns a trace, not just an answer.** A function that returns only a result is
   incomplete even if the result is correct. See §5.
3. **The UI is a pure function of `(trace, stepIndex)`.** Renderers never call the engine.
4. **Renderer / controller / docs triads.** No component both computes and renders. No component over
   ~300 lines. Enforced by a line-count lint rule.
5. **Determinism is a correctness property.** Same input produces byte-identical output, including
   generated state names. Grading and trace diffing depend on it.
6. **Bounded results are reported as bounded.** The UI never says a language "is regular" or a grammar
   "is unambiguous" on the strength of a finite search. It says *"no counterexample up to length 12."*
7. **Documentation never claims a capability the code lacks.** The README status table is updated in the
   same commit as the feature.
8. **One implementation of every algorithm, forever.** Python does not reimplement the engine. See §10.

---

## 3. Repository layout

A pnpm workspace monorepo. The engine must be consumable by the web app, the test suite, the CLI, and
the Python package's bundled JS without any of them reaching into Next.js internals.

```
tape-n-trace/
├── packages/
│   ├── engine/                     # THE CORE. Pure TypeScript. Zero React, zero DOM.
│   │   ├── src/
│   │   │   ├── types.ts                # FA, PDA, TM, CFG, RE, Trace, Step
│   │   │   ├── result.ts               # Result<T, ValidationError[]>
│   │   │   ├── validate.ts             # per-machine invariant checks, all violations
│   │   │   ├── trace.ts                # TraceBuilder, step emitter, serialisation
│   │   │   ├── ids.ts                  # canonical state naming, stable transition ids
│   │   │   ├── fa/
│   │   │   │   ├── simulate.ts         # DFA / NFA / eNFA run to SimulationTrace
│   │   │   │   ├── subset.ts           # NFA to DFA
│   │   │   │   ├── epsilon.ts          # epsilon-closure, epsilon-elimination
│   │   │   │   ├── minimize.ts         # table-filling + partition refinement
│   │   │   │   ├── equivalence.ts      # product construction, shortest witness
│   │   │   │   ├── closure.ts          # union/intersect/complement/reverse/hom/inv-hom
│   │   │   │   ├── regularGrammar.ts   # regular grammar to/from NFA
│   │   │   │   ├── textSearch.ts       # keyword NFA + DFA  (Hopcroft 2.4)
│   │   │   │   └── properties.ts       # [enrichment] empty / finite / infinite
│   │   │   ├── regex/
│   │   │   │   ├── parse.ts            # RE string to AST (precedence star > concat > union)
│   │   │   │   ├── thompson.ts         # AST to epsilon-NFA
│   │   │   │   ├── stateElim.ts        # DFA to RE by state elimination
│   │   │   │   └── rij.ts              # [enrichment] R(k)ij induction — enrichment, see ADR-003
│   │   │   ├── cfg/
│   │   │   │   ├── parse.ts            # BNF-ish text to CFG, with positioned errors
│   │   │   │   ├── derive.ts           # leftmost / rightmost, sentential forms
│   │   │   │   ├── parseTree.ts        # tree construction + yield
│   │   │   │   ├── ambiguity.ts        # two distinct leftmost derivations, bounded
│   │   │   │   ├── useless.ts          # generating + reachable
│   │   │   │   ├── epsilonProd.ts      # nullable symbols, epsilon-production removal
│   │   │   │   ├── unitProd.ts         # unit pairs, unit-production removal
│   │   │   │   ├── leftRecursion.ts    # immediate + general left-recursion elimination
│   │   │   │   ├── cnf.ts              # Chomsky Normal Form
│   │   │   │   ├── closure.ts          # CFL closure lab, incl. CFL-intersect-regular
│   │   │   │   ├── cyk.ts              # [enrichment] CYK — enrichment, see ADR-003
│   │   │   │   └── properties.ts       # [enrichment] emptiness / infiniteness
│   │   │   ├── pda/
│   │   │   │   ├── simulate.ts         # ID sequence, nondeterministic branch tree
│   │   │   │   ├── acceptance.ts       # final-state / empty-stack conversions
│   │   │   │   ├── determinism.ts      # DPDA condition checker
│   │   │   │   ├── fromCFG.ts          # CFG to PDA
│   │   │   │   └── toCFG.ts            # [enrichment] [pXq] — enrichment, see ADR-003
│   │   │   ├── tm/
│   │   │   │   ├── simulate.ts         # single-tape ID sequence
│   │   │   │   ├── multitape.ts        # multitape sim + reduction to single tape
│   │   │   │   ├── nondeterministic.ts # branch tree + BFS-by-DTM explainer data
│   │   │   │   └── gallery.ts          # canonical machines
│   │   │   ├── pumping/
│   │   │   │   ├── oracles.ts          # decidable membership for every preset language
│   │   │   │   ├── regular.ts          # adversary strategy, regular lemma
│   │   │   │   └── cfl.ts              # adversary strategy, CFL lemma
│   │   │   ├── grade/
│   │   │   │   ├── languageEquivalence.ts
│   │   │   │   ├── traceMatch.ts       # first divergent step
│   │   │   │   └── sample.ts           # bounded sample checks for CFG/PDA/TM
│   │   │   └── io/
│   │   │       ├── json.ts             # native .tnt format
│   │   │       └── jflap.ts            # [P2] .jff import/export
│   │   └── test/                       # vitest + fast-check. The project's rigour lives here.
│   │
│   ├── ui/                         # Pure renderers. React, no fetching, no engine calls.
│   │   └── src/
│   │       ├── automaton/          # graph canvas, state node, transition edge, self-loop
│   │       ├── tape/               # TM tape strip, head, multi-track, multi-tape
│   │       ├── stack/              # PDA stack column
│   │       ├── tree/               # parse tree, branch tree, derivation tree
│   │       ├── table/              # subset table, table-filling triangle, generic grid
│   │       ├── controls/           # transport bar (play/pause/step/scrub/speed)
│   │       └── tokens.css          # design tokens, shared with the widget build
│   │
│   └── cli/                        # [P2] `tnt run machine.tnt "0110"` — grading pipelines
│
├── apps/
│   └── web/                        # Next.js 15 App Router. Routes, controllers, docs panels.
│       ├── app/
│       │   ├── simulate/[machine]/
│       │   ├── convert/[conversion]/
│       │   ├── grammar/[tool]/
│       │   ├── prove/[topic]/
│       │   ├── hierarchy/
│       │   ├── syllabus/
│       │   ├── practice/
│       │   └── ide/                    # [P2]
│       ├── content/
│       │   └── exercises/*.ts          # the exercise bank — content, not code
│       └── lib/
│           ├── catalog.ts              # THE ONE LIST of tools
│           ├── topics.ts               # the scheme-independent topic graph
│           └── schemes/                # vtu-2022-bcs503.ts, autonomous.ts, ...
│
├── bridge/                         # anywidget React entry, bundled by tsup
├── vyakarana/                      # the Python package
└── docs/
    ├── adr/                        # architecture decision records
    └── engine-contract.md          # the trace protocol, authoritative
```

---

## 4. The engine contract

`packages/engine` is pure, and the purity is mechanically enforced.

- **No forbidden imports.** `react`, `react-dom`, `next`, `framer-motion`, and any module touching
  `window` or `document` are banned by `no-restricted-imports`. CI fails on violation.
- **No exceptions for user error.** Invalid input returns `Result<T, ValidationError[]>`. The editor must
  be able to show *every* problem with a half-drawn automaton, not the first one.

  ```ts
  type Result<T> = { ok: true; value: T } | { ok: false; errors: ValidationError[] }

  interface ValidationError {
    code: string                  // "DFA_NONDETERMINISTIC", "UNREACHABLE_START", ...
    message: string               // exam-language prose
    subject: { kind: "state" | "transition" | "production" | "machine"; id?: string }
  }
  ```

  Exceptions are reserved for programmer error (a violated internal invariant), never for user input.

- **Canonical naming.** The subset-construction state for `{q1, q0, q2}` is always `{q0,q1,q2}` — sorted,
  comma-joined, brace-wrapped. Generated CNF variables, product-construction pairs, and eliminated-state
  expressions all follow a documented canonical form in `ids.ts`. Running a conversion twice produces
  identical ids.

- **Coverage gate.** At least 90% line coverage on `packages/engine`, enforced in CI. The engine is the
  whole product; a wrong subset construction shipped to a student is worse than no app.

---

## 5. The Trace protocol

The central abstraction. Everything else is a consequence of it.

```ts
interface Trace<TStep extends Step = Step> {
  kind: TraceKind
  engineVersion: string
  input: unknown                 // the machine / grammar / string this trace came from
  steps: TStep[]                 // ordered, replayable, serialisable
  result: TraceResult            // accept/reject, the produced machine, the verdict
  meta: {
    stepCount: number
    counters: Record<string, number>            // transitionsTaken, statesCreated, tapeMoves
    truncated?: { reason: string; cap: number } // set when a §9 guard fired
  }
}

interface Step {
  index: number
  /** One sentence of prose, exam-language. Rendered verbatim in the explanation panel. */
  narration: string
  /** What the renderer highlights this step. Renderer-agnostic, semantic. */
  highlight: Highlight[]
  /** The full logical artifact state after this step. See ADR-001. */
  snapshot: unknown
  /** Textbook citation, Hopcroft 2e. e.g. "2.3.5, Thm 2.11" */
  citation?: string
}

type Highlight =
  | { type: "state";      id: StateId;      role: "current" | "new" | "dead" | "accepting" | "start" | "marked" }
  | { type: "transition"; id: TransitionId; role: "taken" | "candidate" | "added" | "removed" }
  | { type: "input";      position: number; role?: "read" | "consumed" | "lookahead" }
  | { type: "stackCell";  depth: number;    role: "top" | "pushed" | "popped" }
  | { type: "tapeCell";   tape: number; index: number; role: "head" | "written" | "read" }
  | { type: "tableCell";  row: string; col: string;    role: "filling" | "filled" | "marked" | "witness" }
  | { type: "production"; index: number;    role: "applied" | "added" | "removed" | "nullable" | "unit" }
  | { type: "treeNode";   id: string;       role: "expanding" | "matched" | "dead" | "accepting" }
  | { type: "symbolSet";  ids: string[];    role: "generating" | "reachable" | "nullable" | "closure" }
```

**Trace invariants**, asserted by one shared test helper applied to every trace-producing function:

- step indices are contiguous from 0
- every `narration` is non-empty, ends in a period, and contains no placeholder text
- every `highlight` references an id that exists in that step's snapshot
- the trace round-trips through `JSON.stringify` / `parse` unchanged
- the final snapshot is consistent with the declared `result`
- `meta.stepCount === steps.length`

**What the protocol buys, once, for everything:**

| Capability | How it falls out |
|---|---|
| Transport controls | Written once in `packages/ui/controls`, reused by every feature |
| Replay | A trace is a JSON file; `/replay/<id>` needs no engine on the client |
| Predict-the-next-step quizzes | Hide step *n*'s snapshot, diff the student's answer against it |
| Trace-diff grading | Compare student trace to reference trace, report first divergence |
| The notebook path | Python ships a machine, receives a trace, React renders it |

### Trace kinds

Fixed strings; the discriminants everything switches on. `[E]` marks enrichment kinds not required by
the default scheme (see ADR-003).

```
simulate.dfa            simulate.nfa            simulate.enfa
simulate.pda            simulate.tm             simulate.tm.multitape
convert.nfa-to-dfa      convert.enfa-to-nfa     convert.re-to-enfa
convert.dfa-to-re.elim  convert.minimize        convert.grammar-to-nfa
convert.pda-acceptance  convert.cfg-to-pda      convert.tm-multitape-to-single
grammar.derive          grammar.parse-tree      grammar.ambiguity
grammar.useless         grammar.epsilon-prod    grammar.unit-prod
grammar.cnf             grammar.left-recursion
decide.membership       decide.equivalence      decide.state-equivalence
closure.regular.*       closure.cfl.*
game.pumping.regular    game.pumping.cfl
grade.language          grade.trace-match       grade.sample

[E] convert.dfa-to-re.rij   [E] convert.pda-to-cfg   [E] grammar.cyk
[E] decide.emptiness        [E] decide.finiteness
```

---

## 6. Core types

Match the textbook tuples exactly. A student should read the type and see the 5-tuple.

```ts
type StateId = string
type TransitionId = string
type Sym = string                 // exactly one symbol

/** Epsilon is encoded as `null`, never as a string. See ADR-002. */
type Read = Sym | null

interface FiniteAutomaton {       // covers DFA, NFA, epsilon-NFA — one type, a discriminant
  kind: "DFA" | "NFA" | "ENFA"
  states: StateId[]               // Q
  alphabet: Sym[]                 // Sigma
  transitions: FATransition[]     // delta, flat — renders directly as edges
  start: StateId                  // q0
  accepting: StateId[]            // F
  layout?: Record<StateId, { x: number; y: number }>   // editor-only; engine ignores it
}

interface FATransition { id: TransitionId; from: StateId; read: Read; to: StateId }

interface PDA {
  states: StateId[]; inputAlphabet: Sym[]; stackAlphabet: Sym[]
  transitions: PDATransition[]
  start: StateId; startStack: Sym; accepting: StateId[]
  acceptBy: "finalState" | "emptyStack"
  layout?: Record<StateId, { x: number; y: number }>
}

interface PDATransition {
  id: TransitionId
  from: StateId; read: Read; pop: Read   // pop null = no pop (JFLAP compat; Hopcroft always pops)
  to: StateId; push: Sym[]               // leftmost = new top; [] = pop only
}

interface TuringMachine {
  states: StateId[]; inputAlphabet: Sym[]; tapeAlphabet: Sym[]
  blank: Sym
  transitions: TMTransition[]
  start: StateId; accepting: StateId[]; rejecting?: StateId[]
  tapes: number                   // 1 = single-tape; >1 activates the multitape renderer
  layout?: Record<StateId, { x: number; y: number }>
}

interface TMTransition {
  id: TransitionId
  from: StateId; read: Sym[]      // one per tape
  to: StateId; write: Sym[]; move: ("L" | "R" | "S")[]
}

interface CFG {
  variables: string[]             // V
  terminals: Sym[]                // T
  productions: Production[]       // P
  start: string                   // S
}

interface Production { head: string; body: (string | Sym)[] }   // [] = epsilon-production
```

**Design notes that must not be "improved":**

- `transitions` is a **flat list**, not a nested map. A nested `Record<state, Record<symbol, ...>>`
  cannot represent an NFA's multiple targets cleanly, cannot render as edges without inversion, and
  makes the partial and invalid machines the editor must hold unrepresentable.
- `layout` lives on the machine but is **ignored by every engine function**. Coordinates never influence
  semantics. Auto-layout is a UI concern.
- **One** `FiniteAutomaton` type with a `kind` discriminant, not three types. A DFA *is* an NFA with a
  determinism invariant; `validate()` checks the invariant and the UI shows the violation. Three types
  would triple every conversion signature.
- Transitions carry a **stable `id`**. Highlighting by `(from, symbol, to)` is ambiguous for NFAs with
  parallel edges, and ids make trace highlights survive relabelling.

---

## 7. Layout

Graph layout is the most underestimated risk in the project — an ugly diagram makes a correct engine
feel amateur.

| Machine origin | Strategy |
|---|---|
| User-drawn | Manual positions, always persisted in `layout`. Never re-laid-out without an explicit action. |
| Generated by a conversion | **Layered, ranked by BFS distance from the start state** (`elkjs`, layered algorithm). A subset-construction DFA laid out by distance reads far better than a force blob. |
| Gallery / preset | Hand-authored `layout`, committed alongside the machine. |

Force-directed layout is deferred until there is evidence it beats layered-plus-drag. Adding it early
costs a dependency and buys little.

Edge rules that matter for readability: self-loops render above the node; parallel edges between the
same pair merge into one edge with a comma-joined label; bidirectional pairs bow apart symmetrically.

---

## 8. The syllabus model

The syllabus is **data**, not code. Three consumers exist from day one (VTU 2022, the autonomous
curriculum, and whatever VTU publishes for 2025), so the indirection is load-bearing rather than
speculative.

```ts
// apps/web/lib/topics.ts — scheme-independent. The stable spine.
interface TopicNode {
  id: TopicId                     // "fa.subset-construction" — stable forever, never renumbered
  title: string
  kind: "simulate" | "transform" | "decide" | "concept" | "proof"
  hopcroft: string[]              // ["2.3.5"] — 2nd edition
  features: CatalogId[]           // the tools that teach it
}

// apps/web/lib/schemes/atria-2026-btoch503.ts
interface Scheme {
  id: string                      // "atria-2026-btoch503"
  institution: string             // "Atria Institute of Technology"
  department?: string
  courseCode: string              // "BTOCH503"
  courseTitle: string
  academicYear?: string           // "2026-27"
  credits: number
  hours: { lecture: number; tutorial: number; practical: number; selfStudy: number }
  textbook: { authors: string; title: string; edition: string }
  modules: SchemeModule[]
  outcomes: CourseOutcome[]
  enrichment: TopicId[]           // available in the app, not examinable under this scheme
  assessment: Assessment
  tutorialComponents?: { text: string; topics: TopicId[] }[]
  /** Contradictions between the syllabus, lesson plan and model papers, recorded not resolved. */
  notes?: string[]
}

interface SchemeModule {
  number: number; title: string; hours: number
  sections: string[]              // as printed in the syllabus, e.g. "3.2 (Except 3.2.1)"
  topics: TopicId[]               // in teaching order
  outcome: string                 // the CO id this module carries
}

interface CourseOutcome {
  id: string                      // "CO3"
  text: string
  bloom: 1 | 2 | 3 | 4 | 5 | 6    // highest cognitive level
  modules: number[]
  topics: TopicId[]
}

interface Assessment {
  cia: number; see: number                    // 50 / 50
  weights: Record<string, number>             // { "CIE-I": 12.5, "CIE-II": 12.5, "Activities": 25, "SEE": 50 }
  see: {
    totalMarks: number                        // 100
    durationHours: number                     // 3
    questionsPerModule: number                // 2, as an OR pair
    answered: number                          // 5 — one per module
    partMarks: number[]                       // [6, 6, 8]
  }
}
```

The `partMarks` shape is what lets `/practice` assemble individual exercises into a full 20-mark
examination question — the form students are actually tested in.

Consequences:

- Exercises key on `topic: TopicId`, never on a bare module number. Module numbers are **derived** per
  scheme, so the same exercise can appear under Module 2 in one scheme and Module 3 in another.
- Every tool page's breadcrumb ("*Module 2 · Hopcroft 3.2.2*") is rendered from the active scheme, never
  hardcoded.
- A CI test walks every `TopicId` in every scheme and fails on a dead or missing target.
- Adding a university is a file in `lib/schemes/`. Adding a tool is one `catalog.ts` entry, one
  `topics.ts` mapping, and one loader line.

**Active default scheme: `atria-2026-btoch503`** (Atria Institute of Technology, autonomous).
`vtu-2022-bcs503` ships alongside it: the two have an identical section list, so the second config costs
almost nothing and serves every non-autonomous VTU college. Both mappings are in [phases.md](phases.md) §2.

---

## 9. Size envelope

An educational tool, not a verification engine. These are guards, not performance targets — clarity of
the trace beats speed, and no optimisation work happens beyond them.

| Object | Cap | Behaviour past the cap |
|---|---|---|
| FA states | 200 | Warn; subset construction offers reachable-only mode |
| Subset construction output | 2^12 states | **Hard stop with the explanation** — this is the pedagogical point of Hopcroft 2.3.6 |
| PDA / TM simulation steps | 10,000 | Stop, report "no halt within N steps", offer "continue for N more" |
| CFG productions | 300 | Warn |
| Derivation / search depth | 100 | Stop, report as bounded |
| Serialised trace | 5 MB | Truncate, set `meta.truncated`, say so in the UI |

Every guard that fires sets `meta.truncated` and surfaces prose in the UI. A silent cap is a defect.

---

## 10. Data flow

### 10.1 Web

```
user input ──▶ controller (apps/web) ──▶ engine fn ──▶ Trace
                     │                                   │
                     └──── trace + stepIndex ────────────▶ renderer (packages/ui) ──▶ SVG/DOM
```

The controller owns all state: the machine being edited, the current trace, the step index, transport
playback. The renderer receives `{ machine, step, mini?, theme? }` and draws. The renderer has no effects
and no engine import — which is exactly what lets the notebook bridge reuse it, and is the retrofit
Stack-n-Flow never finished for twelve of its fourteen visualizers.

Animation stays in React (Framer Motion `layout` + `AnimatePresence` + stable keys). The engine never
emits timing or animation instructions, only semantic highlights. If Framer Motion appears in
`package.json`, it must actually be imported, or be removed.

### 10.2 Notebook

```
Python object ──serialise──▶ engine (bundled JS) ──▶ Trace ──anywidget traitlet──▶ React renderer
```

Traits, all `.tag(sync=True)`: `payload` (machine or grammar), `trace`, `step`, `options` (theme, speed,
layout mode).

**Where the engine actually executes in the Python path is an open decision** — see ADR-004. It
materially shapes the public Python API (sync `d.accepts(w)` versus `await d.accepts(w)`), so it is
resolved by a spike **before** the API is frozen, in P1.8.

The React bridge is bundled with `tsup` into `vyakarana/static/` and shipped as package data, so
`pip install` works with no Node on the user's machine. A missing bundle raises a `RuntimeError` naming
the expected path and the build command — never a silent failure.

Tailwind for the widget is built with a **scoped, Preflight-disabled** config (`.vyakarana-container`),
because anywidget injects CSS into the host notebook document. This bug has been paid for once already
in Pratyaksha.

---

## 11. Testing architecture

The engine is a mathematical artifact. Test it like one.

1. **Textbook unit tests.** Every engine function against Hopcroft's own worked examples, citing the
   section in the test name: `test("subset construction — Hopcroft Fig 2.12")`.
2. **Oracle and property tests** (the backbone), over randomly generated small machines via `fast-check`:
   - `simulate(M, w) === bruteForceMembership(M, w)` for all `|w| <= 12`
   - `L(nfaToDfa(N)) === L(N)`, `L(minimize(D)) === L(D)`, `L(thompson(re)) === L(re)`
   - `minimize(minimize(D)) === minimize(D)` (idempotence)
   - `|minimize(D).states|` is minimal, cross-checked against an independently written Hopcroft
     partition-refinement implementation used **only** in tests
   - the Module 1-2 grand round-trip (see phases.md, P0.3)
   - each CFG simplification stage preserves the language on a sample
3. **Trace invariants** — one shared helper (§5) applied to every trace-producing function.
4. **Snapshot tests** on renderers with fixed traces, so a rendering regression shows in a diff.
5. **Accessibility** — machine editing is keyboard-navigable; every state and transition is reachable and
   announced. A diagram-only tool that cannot be keyboard-driven excludes students.
6. **API parity** — a test asserts the Vyakarana surface and the engine surface have not drifted.

**CI gates:** engine coverage >= 90% · lint (including the import ban and the component line-count rule)
· `next build` · `pytest` · bundle-freshness check for `vyakarana/static/`.

Randomised tests use a **fixed seed** committed to the repo, so a failure is reproducible. Property
generators are bounded (at most 4 states, 2 symbols for round-trips) because state elimination blows up
regular-expression size super-exponentially, and an unbounded generator makes CI flaky rather than
thorough.

---

## 12. Architecture decision records

### ADR-001 — Snapshots are logically full, physically shared, delta-encoded on the wire

**Context.** The PRD mandates full snapshots per step so scrubbing is O(1) and never replays from step 0.
Taken literally as deep copies, this breaks at the caps the PRD itself sets: a subset construction at the
2^12 cap produces roughly 4096 steps each holding a DFA that grows to 4096 states — millions of copied
entries, far past the 5 MB trace budget.

**Decision.**

- **In memory:** snapshots are frozen immutable structures that **share references** with the previous
  step. Step *n*'s partial DFA is step *n-1*'s plus the new state and edges; unchanged sub-objects are the
  same objects. Cost is O(total artifact size), not O(steps x artifact size).
- **On the wire:** `serialise(trace)` emits a delta-encoded format. `deserialise()` rehydrates full
  snapshots eagerly. The 5 MB budget applies to the serialised form.
- **To every consumer:** `trace.steps[n].snapshot` is a complete artifact. Renderers, the notebook bridge,
  and the grader never see a delta.

**Consequences.** The §5 contract is unchanged and the UI stays a pure function of `(trace, index)`. The
cost is discipline: engine code must build snapshots by structural extension, never by deep clone, and
snapshots must be frozen so accidental mutation of a shared substructure is caught in development.

### ADR-002 — Epsilon is `null`, not the string `"ε"`

**Context.** The PRD types epsilon as `read: Sym | typeof EPSILON` with `EPSILON = "ε"`. Since `Sym` is
`string`, that union collapses to `string` and enforces nothing. It also makes an alphabet legitimately
containing `ε` unrepresentable, and invites `=== "ε"` comparisons scattered through the codebase.

**Decision.** Epsilon is `null`. `type Read = Sym | null`. It is type-safe, JSON-serialisable, admits no
collision with any alphabet symbol, and narrows correctly under `if (t.read === null)`. Renderers map
`null` to the glyph `ε`. A helper `isEpsilon(r): r is null` exists for readability; the display constant
`EPSILON_GLYPH` lives in `packages/ui`, not in the engine.

**Consequences.** Every `read` and `pop` field is nullable. Validation rejects a `null` read on a machine
whose `kind` is `"DFA"` or `"NFA"`.

### ADR-003 — Scope follows the published syllabus; out-of-scope topics are demoted, not deleted

**Context.** The PRD's §4 was derived from Hopcroft chapter extracts rather than from the syllabus
document. The published VTU 2022 BCS503 syllabus is narrower in five places (detailed in phases.md §2),
including two of the most expensive builds in the project: PDA to CFG, and CYK.

**Decision.** The default scheme's module-to-topic mapping follows the published syllabus exactly. The
five out-of-scope topics remain as `TopicNode`s marked `enrichment` and are scheduled after v1.0. They
are still real engine modules with real tests when built — they are simply off the v1.0 critical path.

**Confirmed.** The autonomous BTOCH503 syllabus, obtained after this ADR was written, carries a section
list **identical** to VTU 2022 — including "3.2 (Except 3.2.1)" and "6.3.1" — corroborated independently
by the module-wise textbook extracts, whose filenames encode their ranges. Both schemes exclude all five
demoted topics, so the decision holds for every scheme currently in play.

**Consequences.** v1.0 gets roughly two weeks cheaper. Another scheme that includes CYK enables it by
listing the topic id, with no engine change — which is the whole point of §8.

**Sixth demoted topic: regular grammars.** Verified against the printed 2e and every course document
after P0.3 shipped. Hopcroft 2e has no section on them at all — Chapter 3 is regular expressions and
Chapter 5 starts at context-free grammars — and the syllabus, lesson plan, question bank and all three
model papers examine none. `fa/regularGrammar.ts` is built and tested, carries no citation, and is
enrichment. See [docs/citations.md](docs/citations.md).

One caveat recorded in phases.md §2.4: the section list bounds *reading*, while the model question
papers bound *examination*, and they do not perfectly agree. Left recursion elimination is examined at
8 marks despite sitting outside Hopcroft 5.1/5.2/5.4. Scheme configs therefore carry topics that no
prescribed section covers, and that is expected rather than a data error.

### ADR-004 — [OPEN] How the engine executes in the Python path

**Context.** §2 forbids reimplementing any algorithm in Python, but Vyakarana's API includes
value-returning calls such as `d.accepts("0110") -> True` that must work headless — under `pytest`,
under `nbconvert`, and in a notebook with no frontend attached. Rendering can round-trip through
anywidget to the browser; plain values cannot, at least not synchronously.

| Option | Sync API | Headless | Cost |
|---|---|---|---|
| Round-trip through the frontend | No — `await` | No | Free, but breaks nbconvert and pytest |
| Embed a JS runtime (QuickJS / V8 bindings) | Yes | Yes | One binary dependency; needs a Pyodide story for the P2 browser IDE |
| Pure-Python reimplementation of predicates | Yes | Yes | Violates §2; two implementations to keep in sync forever |

**Status.** Unresolved. A one-day spike in P1.8 evaluates embedded-runtime options and records the
outcome as ADR-004-final **before** the Python API is frozen. The pure-Python option is the last resort;
if it is ever taken, the fallback is confined to `accepts()` and gated behind a CI test that compares it
against the engine on a shared fixture corpus on every run.

### ADR-005 — Hopcroft 2nd edition is the citation baseline

The published syllabus prescribes the **2nd edition**. Every `Step.citation`, docs reference, and test
name cites 2e section and figure numbers, because that is the book students actually hold.

---

## 13. Non-goals

Explicitly out. Revisit only after P2 ships.

- A general-purpose model checker, SAT/SMT solver, or verification tool.
- Compiler construction beyond the lexical-analysis demo. No parser generators, no LR tables.
- Linear-bounded automata and context-sensitive grammars beyond their box on the hierarchy map.
- Complexity theory (P, NP). Confirmed absent from the published scheme.
- Post's Correspondence Problem. Confirmed absent from the published scheme.
- Mobile-first editing. The tool is responsive and readable on a phone; graph editing is desktop-first.
- Real-time collaborative editing.
- A server-side arbitrary-code execution endpoint. Ever.

---

## 14. Prohibitions

Violating these is a defect regardless of whether tests pass.

- Engine code that imports React, Next, or touches the DOM.
- Any algorithm that returns a result without a trace.
- Any component over ~300 lines, or any component that both computes and renders.
- Non-deterministic state naming in a conversion.
- Any claim in a docs file that the code does not support, including the README status table.
- Any UI that asserts a language "is regular" or a grammar "is unambiguous" from a bounded search.
- Reimplementing an engine algorithm in Python (see ADR-004 for the one narrow, gated exception path).
- Deep-cloning a snapshot (see ADR-001).
