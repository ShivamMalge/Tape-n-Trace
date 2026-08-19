# PRD — Tape-n-Trace

**An interactive Theory of Computation workbench, in the shape of Stack-n-Flow.**

| | |
|---|---|
| Working name (web app) | **Tape-n-Trace** |
| Working name (Python library) | **Vyakarana** (`pip install vyakarana`) |
| Sibling project | [Stack-n-Flow / Pratyaksha](https://github.com/ShivamMalge/Stack-n-Flow) |
| Target syllabus | VTU **BCS503 — Theory of Computation**, 5th semester CSE |
| Reference text | Hopcroft, Motwani & Ullman, *Introduction to Automata Theory, Languages, and Computation*, 3e |
| Status | Pre-implementation. This document is the specification. |
| Document owner | Shivam Malge |

---

## 0. How to read this document (agent instructions)

This PRD is written to be executed by a coding agent. Read it in full before writing code.

**Hard rules for the agent:**

1. **Do not start with the UI.** §6 defines a headless engine. The engine ships first, with tests,
   before a single React component exists. Every screen in §7 is a thin renderer over engine output.
2. **Every algorithm returns a trace, not just an answer.** This is the single most important rule in
   this document. See §6.3. A function that returns only a result is a bug, even if the result is correct.
3. **Never write a monolith component.** Stack-n-Flow accumulated 800-line visualizer files that later
   had to be split into renderer/controller/docs triads. Here that split is mandatory from the first
   component. See §6.5.
4. **Never claim a capability in documentation that the code does not have.** Stack-n-Flow's docs
   claimed Framer Motion animations that nothing imported, and shipped `QuickSort` that did not sort.
   The README carries a "What actually works today" table from commit one, and it is updated in the
   same PR as the feature.
5. **Ask before inventing scope.** If a section says "out of scope", it is out of scope. If something
   is genuinely ambiguous, stop and ask rather than guess.
6. Sections marked **[P0]**, **[P1]**, **[P2]** are the build order. Do not start P1 work while P0
   acceptance criteria are unmet.

---

## 1. Context

### 1.1 What the sibling project is

Stack-n-Flow is a Next.js web application that visualizes data structures and algorithms — 15 data
structures, 8 algorithms, each with an interactive canvas, an operations panel, and a docs panel. It
is being extended by **Pratyaksha**, a Python package that drives the *same* React renderers inside a
Jupyter notebook through `anywidget`, so that `s = Stack(); s.push(10)` in a notebook cell renders the
web app's stack visualizer.

The architecture that emerged there, and that this project adopts deliberately rather than
rediscovering:

- **Python owns logic. React owns rendering. anywidget owns state sync.** Python never sends animation
  instructions, only state.
- **An event-sourced telemetry core.** Every operation emits an event; a reducer folds events into an
  immutable snapshot; the full history is retained and `export_trace()` serialises it.
- **A single catalog file** (`lib/visualizer-catalog.ts`) is the one list that the nav, the index page,
  `generateStaticParams`, and the component loader all read. Adding a visualizer is one catalog entry
  plus one loader line.
- **Renderer / controller / docs triads** (`stack-renderer.tsx`, `stack-controller.tsx`,
  `stack-docs.tsx`) so the pure renderer can be reused headlessly by the notebook bridge.
- **A scoped Tailwind build** for the widget (`tailwind.bridge.config.ts`, Preflight disabled, base
  rules scoped to a container class) because anywidget injects CSS into the host notebook document.

### 1.2 Why Theory of Computation is the right next subject

TOC is the subject where a visualiser has the *highest* teaching leverage and the *worst* existing
tooling. Three reasons:

1. **The objects are already diagrams.** A DFA *is* a labelled graph. A parse tree *is* a tree. A
   Turing machine *is* a tape and a head. Students are asked to reason about pictures, then examined on
   pictures, but are taught with static pictures on a blackboard that cannot move.
2. **The hard part is the transformation, not the object.** Nobody fails BCS503 because they cannot
   draw a DFA. They fail because subset construction, state elimination, CNF conversion, and CFG→PDA
   are multi-step mechanical procedures with intermediate artifacts that a textbook prints only as a
   final answer. An animated intermediate table is worth more here than in any DSA topic.
3. **Correctness is decidable, so grading is automatic and rigorous.** Language equivalence for regular
   languages is decidable. This means the app can tell a student *"your DFA is wrong, and here is the
   shortest string it disagrees with the answer on: `0110`"*. No DSA visualiser can do that. This one
   feature turns the project from a demo into something a department can actually assign homework on.

### 1.3 Prior art, honestly assessed

| Tool | What it is | Why this project is still worth building |
|---|---|---|
| [JFLAP](https://www.jflap.org/) | The canonical academic tool. Java desktop, comprehensive (FA, PDA, TM, grammars, parsing, L-systems), used in TOC courses worldwide since the late 1990s. | Java desktop install, dated UI, no web deployment, no notebook story, no syllabus mapping, no classroom/progress layer. Its `.jff` file format is however the de-facto interchange format — **we import it** (§7.11). |
| [Automata Tutor v3](https://arxiv.org/abs/2005.01419) | Research tool from TUM/UW-Madison/UCSD; web-based, strong *automated grading and feedback* for automata exercises. | Grading-first, not exploration-first; not a visual simulator or a conversion stepper; no notebook integration; not syllabus-mapped to VTU. It validates that auto-grading TOC is both feasible and valuable — which is exactly §7.9. |
| [Automatarium](https://github.com/automatarium/automatarium) | Modern open-source web automata editor (FSA/PDA/TM). | Closest in spirit for the editor surface. No Python/notebook bridge, no step-by-step *conversion* traces, no grammar/CNF/CYK work, no course integration. |
| Ad-hoc regex visualisers | regex101, regexper, etc. | Show regex only; disconnected from the automata equivalence that is the actual syllabus content. |

**The gap this project fills:** a modern web workbench where *simulation, transformation, and decision
procedures* are all traceable step-by-step; where every trace is data that can be replayed, quizzed,
and graded; and where the same engine runs inside a Jupyter notebook. Nothing on the list above does
all four.

---

## 2. The product, in one paragraph

Tape-n-Trace is a web workbench for formal languages and automata. You draw or type a machine — DFA,
NFA, ε-NFA, PDA, Turing machine — or a grammar, or a regular expression. You run it on an input string
and watch the configuration move: state highlights, input head advances, stack pushes and pops, tape
cells rewrite. You convert between representations and watch the *construction* happen: the subset
table fills row by row, states are eliminated one at a time, ε-productions are struck out in sequence.
You test claims: is this language empty, finite, regular? Are these two automata equivalent, and if not
what is the shortest string that separates them? You play the pumping lemma as a two-player game against
the machine. Every one of these produces a **trace** — a serialisable list of steps — which means it can
be scrubbed, replayed, exported, turned into a quiz, or compared against a reference answer for grading.
The same engine is published as a Python package so a lecturer can build a DFA in a notebook cell and
have it render inline.

---

## 3. Users and jobs

| User | Job to be done | Feature that serves it |
|---|---|---|
| **BCS503 student, night before the exam** | "I need to do subset construction on this NFA and check my answer." | Conversion steppers (§7.2), equivalence checker (§7.9) |
| **BCS503 student, mid-semester, stuck** | "I do not understand why `aⁿbⁿ` is not regular." | Pumping lemma game (§7.8), hierarchy map (§7.10) |
| **Lecturer, in a lecture hall** | "I want to build this PDA live on the projector while explaining it." | Presentation mode, live editor (§7.4) |
| **Lecturer, setting an assignment** | "Give me 40 auto-graded DFA construction problems." | Assignment + grader (§7.9) |
| **Lecturer, writing notes** | "I want a correct, rendered NFA→DFA table in my Jupyter-based course notes." | Vyakarana notebook library (§7.12) |
| **Self-learner / interview prep** | "Show me how a Turing machine actually computes." | TM simulator + gallery (§7.6) |
| **The project author** | A portfolio-grade, department-demonstrable system that reuses hard-won architecture. | All of it |

**Primary user is the student.** When a design decision trades lecturer convenience for student
clarity, take student clarity.

---

## 4. Scope — the syllabus

This is the actual content of the five attached BCS503 module extracts, verified against the PDFs.
Every numbered item below must map to at least one feature in §7. Items marked ⚠ are *proof* content
with no direct simulation — they get an interactive explainer, not a simulator (see §7.7).

### Module 1 — Automata fundamentals & finite automata (Hopcroft Ch. 1–2)

- 1.1 Why study automata theory; finite automata informally; structural representations; automata and complexity
- 1.2 Introduction to formal proof ⚠ (deductive, inductive, mutual induction)
- 1.5 Central concepts: alphabets, strings, empty string, length, powers of an alphabet Σᵏ, Σ*, languages, problems
- 2.2 **DFA**: formal 5-tuple definition, how a DFA processes strings, transition table and transition diagram notation, extended transition function δ̂, the language of a DFA
- 2.3 **NFA**: informal view, formal definition, extended δ̂, language of an NFA, **equivalence of DFA and NFA via subset construction**, the bad case (exponential blow-up)
- 2.4 Application: **text search** — finding strings in text, NFA for text search, DFA recognising a set of keywords
- 2.5 **ε-NFA**: uses of ε-transitions, formal notation, **ε-closure**, extended transitions, **eliminating ε-transitions**

### Module 2 — Regular expressions & properties of regular languages (Ch. 3–4)

- 3.1 **Regular expressions**: operators, building REs, operator precedence
- 3.2 **FA ↔ RE**: DFA→RE (both the R⁽ᵏ⁾ᵢⱼ inductive method *and* state elimination), RE→ε-NFA
- 3.3 Applications: REs in UNIX, **lexical analysis**, finding patterns in text
- 4.1 **Pumping lemma for regular languages**: statement and applications
- 4.2 **Closure properties**: union, intersection, complement, difference, **reversal**, **homomorphism**, **inverse homomorphism**
- 4.3 **Minimization of DFA**
- 4.4 **Equivalence and minimization of automata**: testing equivalence of states (table-filling), testing equivalence of regular languages, minimising a DFA

### Module 3 — Context-free grammars & pushdown automata (Ch. 5–6)

- 5.1 **CFGs**: informal example, formal definition, derivations, **leftmost and rightmost derivations**, the language of a grammar, sentential forms
- 5.2 **Parse trees**: constructing, the yield, the equivalence of inference ⇄ derivation ⇄ parse tree (all six directions in 5.2.3–5.2.6)
- 5.4 **Ambiguity**: ambiguous grammars, removing ambiguity, leftmost derivations as a way to express ambiguity, **inherent ambiguity**
- 6.1 **PDA**: informal introduction, formal 7-tuple, transition diagram, **instantaneous descriptions (IDs)**
- 6.2 **Languages of a PDA**: acceptance by final state, acceptance by empty stack, and **both conversions between them**
- 6.3 **Equivalence of PDA and CFG**: CFG→PDA, PDA→CFG
- 6.4 **Deterministic PDA**: definition, regular languages and DPDAs, DPDAs and CFLs, DPDAs and ambiguous grammars

### Module 4 — Properties of context-free languages (Ch. 7)

- 7.1 **Normal forms**: eliminating useless symbols (generating + reachable), computing generating and reachable symbols, **eliminating ε-productions**, **eliminating unit productions**, **Chomsky Normal Form**
- 7.2 **Pumping lemma for CFLs**: size of parse trees, statement, applications
- 7.3 **Closure properties of CFLs**: substitutions, applications of the substitution theorem, reversal, **intersection with a regular language**, inverse homomorphism (and the non-closures: intersection, complement)
- 7.4 **Decision properties of CFLs**: emptiness, membership (**CYK algorithm**), infiniteness; the undecidable questions about CFLs

### Module 5 — Turing machines & undecidability (Ch. 8–9)

- 8.1 ⚠ Problems computers cannot solve: the "Hello, World" problem, the hypothetical tester, **reducing one problem to another**
- 8.2 **The Turing machine**: notation (7-tuple), **instantaneous descriptions**, transition diagrams, the language of a TM, TMs and halting
- 8.3 **Programming techniques**: storage in the state, **multiple tracks**, subroutines
- 8.4 **Extensions**: **multitape TMs**, equivalence of one-tape and multitape, running time and the many-tapes-to-one construction, **nondeterministic TMs**
- 9.1 ⚠ A language that is not RE: enumerating binary strings, **codes for Turing machines**, the **diagonalization language L_d**, proof that L_d is not RE
- 9.2 ⚠ An undecidable problem that is RE: recursive languages, complements of recursive and RE languages, the **universal language L_u**, undecidability of L_u

> **Note on Module 5 boundary.** The attached extract ends at §9.2 and its exercises (closure of
> recursive/RE languages under union, intersection, concatenation, star, homomorphism, inverse
> homomorphism). Post's Correspondence Problem (§9.4) and the classes P/NP (Ch. 10) are **not** in the
> supplied material. Build the §9.1–9.2 explainers; treat PCP and P/NP as **optional stretch** and
> confirm against the current VTU scheme before spending effort there.

---

## 5. The three primitives

Everything in the product is one of exactly three verbs. Hold this taxonomy — it is what keeps the
codebase from sprawling into 40 unrelated pages the way a "one visualizer per topic" approach does.

### 5.1 SIMULATE — run a machine on an input

Given a machine `M` and a string `w`, produce the sequence of configurations. The configuration type
differs per machine but the trace shape does not:

| Machine | Configuration |
|---|---|
| DFA | `(state, position)` |
| NFA / ε-NFA | `(set of states, position)` — a *frontier*, plus the branch tree |
| PDA | `(state, remaining input, stack)` — the textbook ID |
| TM | `(state, tape, head position)` — the textbook ID |

**Non-determinism is rendered as a tree, not a path.** This is a deliberate differentiator. An NFA run
shows every live branch simultaneously with dead branches greyed at the step they died, and the accepting
path highlighted at the end. Students' single biggest NFA misconception is that the machine "guesses
correctly"; showing all branches at once fixes it.

### 5.2 TRANSFORM — convert one representation into another

The full transformation matrix the syllabus requires:

```
RE ──Thompson──▶ ε-NFA ──ε-elimination──▶ NFA ──subset──▶ DFA ──table-filling──▶ min-DFA
 ▲                                                          │
 └──────── state elimination / R(k)ij ──────────────────────┘

Regular grammar ⇄ NFA
CFG ──useless──▶ ──ε-prod──▶ ──unit-prod──▶ CNF ──CYK──▶ membership + parse tree
CFG ⇄ PDA
PDA(final state) ⇄ PDA(empty stack)
NDTM ──▶ DTM        multitape TM ──▶ single-tape TM
```

Each edge is one function in the engine. Each returns a trace whose steps are the *intermediate
artifacts a student would write on paper* — that is the pedagogical contract. Subset construction's
steps are rows of the subset table. ε-elimination's steps are per-state closure computations. Unit
production removal's steps are edges added to the unit-pair graph.

### 5.3 DECIDE — answer a question about a language

| Question | Procedure | Output the UI shows |
|---|---|---|
| Is `w ∈ L(M)`? | simulate | accept/reject + the trace |
| Is `L(M) = ∅`? | reachability of a final state | the reachable set, highlighted |
| Is `L(M)` infinite? | cycle on a live, reachable, co-reachable path | the witness cycle, highlighted |
| Is `L(A) = L(B)`? | product construction + BFS | **the shortest distinguishing string**, or a proof of equivalence |
| Are states `p, q` equivalent? | table-filling | the filled triangular table with the round each pair was marked |
| Is `L` regular? | ⚠ not decidable in general — pumping lemma *game* | see §7.8 |
| Is `w ∈ L(G)` for CFG `G`? | CYK on CNF | the filled CYK triangle + extracted parse tree |
| Is `L(G) = ∅` / infinite? | generating symbols / cycle in the CNF dependency graph | highlighted symbol sets |

**The distinguishing-string output is the product's sharpest edge.** Design the equivalence checker
first among the decision procedures; §7.9 depends on it entirely.

---

## 6. Architecture

### 6.1 Repository layout

A pnpm workspace monorepo. This is a change from Stack-n-Flow's single-package layout, and it is
deliberate: the engine must be consumable by the web app, the test suite, the CLI, and the Python
package's bundled JS without any of them reaching into Next.js internals.

```
tape-n-trace/
├── packages/
│   ├── engine/                 # [P0] THE CORE. Pure TypeScript. Zero React, zero DOM.
│   │   ├── src/
│   │   │   ├── types.ts            # FA, PDA, TM, CFG, RE, Trace, Step  (§6.4)
│   │   │   ├── fa/
│   │   │   │   ├── simulate.ts     # DFA/NFA/eNFA run → SimulationTrace
│   │   │   │   ├── subset.ts       # NFA → DFA
│   │   │   │   ├── epsilon.ts      # ε-closure, ε-elimination
│   │   │   │   ├── minimize.ts     # table-filling + partition refinement
│   │   │   │   ├── equivalence.ts  # product construction, distinguishing string
│   │   │   │   ├── closure.ts      # union/intersect/complement/reverse/hom/inv-hom
│   │   │   │   └── properties.ts   # empty / finite / infinite
│   │   │   ├── regex/
│   │   │   │   ├── parse.ts        # RE string → AST (precedence per §3.1.3)
│   │   │   │   ├── thompson.ts     # AST → ε-NFA
│   │   │   │   ├── stateElim.ts    # DFA → RE by state elimination
│   │   │   │   └── rij.ts          # DFA → RE by the R(k)ij induction
│   │   │   ├── cfg/
│   │   │   │   ├── derive.ts       # leftmost/rightmost derivation, sentential forms
│   │   │   │   ├── parseTree.ts    # tree construction + yield
│   │   │   │   ├── ambiguity.ts    # two distinct leftmost derivations for one string
│   │   │   │   ├── useless.ts      # generating + reachable
│   │   │   │   ├── epsilonProd.ts  # nullable symbols, ε-production removal
│   │   │   │   ├── unitProd.ts     # unit pairs, unit-production removal
│   │   │   │   ├── cnf.ts          # Chomsky Normal Form
│   │   │   │   └── cyk.ts          # CYK membership + parse tree extraction
│   │   │   ├── pda/
│   │   │   │   ├── simulate.ts     # ID sequence, nondeterministic branch tree
│   │   │   │   ├── acceptance.ts   # final-state ⇄ empty-stack conversions
│   │   │   │   ├── fromCFG.ts      # CFG → PDA
│   │   │   │   └── toCFG.ts        # PDA → CFG  (the [pXq] construction)
│   │   │   ├── tm/
│   │   │   │   ├── simulate.ts     # single-tape ID sequence
│   │   │   │   ├── multitape.ts    # multitape sim + reduction to single tape
│   │   │   │   ├── nondeterministic.ts
│   │   │   │   └── gallery.ts      # canonical machines (§7.6)
│   │   │   ├── pumping/
│   │   │   │   ├── regular.ts      # adversary strategy for the RL game
│   │   │   │   └── cfl.ts          # adversary strategy for the CFL game
│   │   │   ├── trace.ts            # Trace builder, step emitter, serialisation
│   │   │   └── io/
│   │   │       ├── jflap.ts        # .jff import/export  (§7.11)
│   │   │       └── json.ts         # native .tnt format
│   │   └── test/                   # vitest. This is where the project's rigour lives.
│   │
│   ├── ui/                     # [P0] Pure renderers. React, no data fetching, no state machines.
│   │   └── src/
│   │       ├── automaton/      # graph canvas, state node, transition edge, self-loop
│   │       ├── tape/           # TM tape strip, head, multi-track
│   │       ├── stack/          # PDA stack column
│   │       ├── tree/           # parse tree, computation/branch tree, derivation tree
│   │       ├── table/          # subset table, table-filling triangle, CYK triangle
│   │       └── controls/       # transport bar (play/pause/step/scrub/speed)
│   │
│   └── cli/                    # [P2] `tnt run machine.json "0110"` — useful for grading pipelines
│
├── apps/
│   └── web/                    # [P0] Next.js 15 app. Routes, controllers, docs panels, auth, DB.
│       ├── app/
│       │   ├── simulate/[machine]/
│       │   ├── convert/[conversion]/
│       │   ├── grammar/[tool]/
│       │   ├── prove/[topic]/          # pumping game, diagonalization, reductions
│       │   ├── hierarchy/              # the Chomsky map (§7.10)
│       │   ├── syllabus/               # BCS503 module → feature index
│       │   ├── practice/               # graded exercises (§7.9)
│       │   └── ide/                    # [P2] browser IDE (§7.13)
│       └── lib/
│           ├── catalog.ts              # THE ONE LIST. Same pattern as visualizer-catalog.ts.
│           └── syllabus.ts             # data-driven scheme config, not hardcoded
│
├── bridge/                     # [P1] anywidget React entry, bundled by tsup
├── vyakarana/                  # [P1] the Python package (§7.12)
└── docs/
    ├── adr/                    # architecture decision records
    └── engine-contract.md      # the trace protocol, authoritative
```

### 6.2 The engine contract

`packages/engine` is **pure**. Enforced, not merely requested:

- No import of `react`, `next`, `framer-motion`, or anything touching `window`/`document`.
  Add an ESLint `no-restricted-imports` rule in the package's own config and fail CI on violation.
- Every exported function is deterministic. Same input → byte-identical output, including generated
  state names. **State naming must be canonical**: the subset-construction state for `{q1, q0, q2}` is
  always `{q0,q1,q2}` (sorted, comma-joined, brace-wrapped), never insertion-ordered. Grading and trace
  diffing both depend on this.
- No exceptions for user error. Invalid machines return `Result<T, ValidationError[]>`, because the
  editor needs to show *all* the problems with a half-drawn automaton, not the first one.
- Target ≥ 90% line coverage on `packages/engine`. This number is a CI gate, not an aspiration. The
  engine is the whole product; a wrong subset construction shipped to a student is worse than no app.

### 6.3 The Trace protocol — **the central abstraction**

Every simulation, every conversion, every decision procedure returns a `Trace`. The UI is a **pure
function of a trace and a step index**. Nothing else.

```ts
interface Trace<TStep = Step> {
  kind: TraceKind            // "simulate.dfa" | "convert.nfa-to-dfa" | "decide.equivalence" | ...
  input: unknown             // the machine/grammar/string the trace was produced from
  steps: TStep[]             // ordered, replayable, serialisable
  result: TraceResult        // accept/reject, the produced machine, the verdict
  meta: {
    engineVersion: string
    stepCount: number
    counters: Record<string, number>   // transitions taken, states created, comparisons...
  }
}

interface Step {
  index: number
  /** One sentence of prose, exam-language. Rendered verbatim in the explanation panel. */
  narration: string
  /** What the renderer should highlight this step. Renderer-agnostic, semantic. */
  highlight: Highlight[]
  /** The full artifact state after this step — NOT a delta. Enables O(1) scrubbing. */
  snapshot: unknown
  /** Optional: the textbook citation, e.g. "Hopcroft §2.3.5, Thm 2.11" */
  citation?: string
}

type Highlight =
  | { type: "state"; id: string; role: "current" | "new" | "dead" | "accepting" | "marked" }
  | { type: "transition"; from: string; symbol: string; to: string; role: "taken" | "candidate" }
  | { type: "input"; position: number }
  | { type: "stackTop" } | { type: "tapeCell"; index: number }
  | { type: "tableCell"; row: string; col: string; role: "filling" | "filled" | "marked" }
  | { type: "production"; index: number; role: "applied" | "removed" | "added" }
  | { type: "treeNode"; id: string; role: "expanding" | "matched" }
```

**Why full snapshots instead of deltas.** Scrubbing a slider backwards must be instant and must not
require replaying from step 0. Traces here are small (a 20-state subset construction is ~30 steps of
a few KB); correctness and simplicity beat the memory saving. If a trace ever exceeds ~5 MB, that is a
signal the input is out of the educational size envelope (§6.6) — cap it and say so, do not optimise.

**What this buys, all for free:**

- Transport controls (play / pause / step / scrub / speed) written **once** in `packages/ui/controls`
  and reused by every feature.
- Replay: a trace is a JSON file. `/replay/<id>` needs no engine on the client.
- **Quiz generation**: hide step *n*'s snapshot, ask the student to predict it, diff their answer
  against the real snapshot. Every algorithm gets quizzes for free, forever.
- **Grading**: compare a student trace against a reference trace and report the first divergent step.
- The Python notebook path: Python sends a trace, React renders it. No second implementation.

### 6.4 Core types

Sketch, not final — but the shape is fixed. Match the textbook tuples exactly; students should be able
to read the type and see the 5-tuple.

```ts
type StateId = string
type Symbol_ = string          // single symbol; "" is never used — see Epsilon
const EPSILON = "ε" as const

interface FiniteAutomaton {         // covers DFA, NFA, ε-NFA — one type, a discriminant flag
  kind: "DFA" | "NFA" | "ENFA"
  states: StateId[]                 // Q
  alphabet: Symbol_[]               // Σ
  transitions: FATransition[]       // δ, as a flat list (renders directly as a diagram)
  start: StateId                    // q0
  accepting: StateId[]              // F
  layout?: Record<StateId, { x: number; y: number }>   // editor-only, ignored by the engine
}
interface FATransition { from: StateId; read: Symbol_ | typeof EPSILON; to: StateId }

interface PDA {
  states: StateId[]; inputAlphabet: Symbol_[]; stackAlphabet: Symbol_[]
  transitions: PDATransition[]
  start: StateId; startStack: Symbol_; accepting: StateId[]
  acceptBy: "finalState" | "emptyStack"
}
interface PDATransition {
  from: StateId; read: Symbol_ | typeof EPSILON; pop: Symbol_
  to: StateId; push: Symbol_[]      // leftmost = new top; [] = pop only
}

interface TuringMachine {
  states: StateId[]; inputAlphabet: Symbol_[]; tapeAlphabet: Symbol_[]
  blank: Symbol_
  transitions: TMTransition[]
  start: StateId; accepting: StateId[]; rejecting?: StateId[]
  tapes: number                     // 1 for single-tape; >1 activates the multitape renderer
}
interface TMTransition {
  from: StateId; read: Symbol_[]    // one per tape
  to: StateId; write: Symbol_[]; move: ("L" | "R" | "S")[]
}

interface CFG {
  variables: string[]               // V
  terminals: Symbol_[]              // T
  productions: Production[]         // P
  start: string                     // S
}
interface Production { head: string; body: (string | Symbol_)[] }   // [] = ε-production
```

**Design notes the agent must not "improve":**

- `transitions` is a **flat list**, not a nested map. A nested `Record<state, Record<symbol, ...>>`
  cannot represent an NFA's multiple targets cleanly, cannot be rendered as edges without inversion,
  and makes partial/invalid machines (which the editor must hold) unrepresentable.
- `layout` lives on the machine but is **ignored by every engine function**. Never let coordinates
  influence semantics. Auto-layout is a UI concern.
- One `FiniteAutomaton` type with a `kind` discriminant rather than three types. A DFA *is* an NFA
  with a determinism invariant; a `validate()` function checks the invariant and the UI shows the
  violation. Three types would triple every conversion signature.

### 6.5 Renderer layer rules

Carried directly from the Stack-n-Flow post-mortem. Each visual feature is a **triad**:

```
packages/ui/src/automaton/automaton-renderer.tsx    # pure. props in, SVG out. no state, no fetch.
apps/web/.../automaton-controller.tsx               # inputs, buttons, engine calls, trace state
apps/web/.../automaton-docs.tsx                     # theory panel, textbook citations, exam notes
```

- **The renderer never calls the engine.** It receives `{ machine, step }` and draws. This is what lets
  the Python bridge reuse it, and it is what Stack-n-Flow had to retrofit for Stack and Queue and never
  finished for the other twelve. Do not repeat that.
- Renderers take an optional `mini` prop for embedding in docs/learn pages and an optional `theme`.
- Animation stays in React (Framer Motion `layout` + `AnimatePresence` + stable keys). The engine never
  emits timing or animation instructions — only semantic highlights. **If Framer Motion is in
  `package.json`, it must actually be imported and used, or removed.**
- Design tokens in one CSS file shared by the web build and the widget build, exactly as
  `app/theme-tokens.css` is today.

### 6.6 Size envelope

Educational tool, not a verification engine. Assume and enforce:

| Object | Practical cap | Behaviour past the cap |
|---|---|---|
| FA states | 200 | Warn; subset construction offers "lazy/reachable-only" mode |
| Subset construction output | 2¹² states | Hard stop with a clear message — *this is the pedagogical point of §2.3.6* |
| PDA / TM simulation steps | 10,000 | Stop, report "no halt within N steps", offer to continue |
| CFG productions | 300 | Warn |
| CYK input string | 40 symbols | Hard stop (n³ table) |
| Grammar/derivation depth | 100 | Stop |

Do not add performance optimisations beyond these guards. Clarity of the trace beats speed.

---

## 7. Feature specification

Each feature: **why it matters → what to build → acceptance criteria**. Acceptance criteria are
binary and testable; a feature is not done until all of its criteria pass in CI or in a recorded manual
check.

---

### 7.0 [P0] The engine and the automaton simulator — *Module 1*

**Why.** Everything else is built on this. Also, the DFA/NFA simulator alone is already a usable tool.

**What.**

- The full type layer (§6.4), `validate()` for each machine type, and the trace builder (§6.3).
- `simulateDFA(dfa, w)` → trace with one step per symbol consumed. Steps carry `(state, position)`.
- `simulateNFA(nfa, w)` → trace whose snapshot is the **set** of live states *and* the branch tree.
  Dead branches are retained in the tree, flagged dead at the step they died.
- `epsilonClosure(nfa, states)` → set + the trace of how it was computed (BFS over ε-edges).
- `simulateENFA` — like NFA, but each step is a pair (ε-closure, then consume).
- **Automaton editor**: click canvas to add a state, drag state→state to add a transition, click a
  transition to edit its label, double-click a state to toggle accepting, right-click to set start.
  Undo/redo. Auto-layout button (force-directed for arbitrary graphs; layered for machines produced by
  conversions — a subset-construction DFA laid out by distance from the start state reads far better
  than a force blob).
- **Multi-run table**: paste a list of strings, get accept/reject for all of them at once, click any
  row to load its trace. (JFLAP has this; it is the single most-used feature in practice.)
- Strings/languages primer page: Σᵏ, Σ*, |w|, ε, concatenation — with a live "generate all strings of
  length ≤ k" widget. Small, cheap, and it is literally §1.5.

**Acceptance criteria**

- [ ] `packages/engine` has zero React/DOM imports, enforced by lint, enforced in CI.
- [ ] ≥ 90% line coverage on `packages/engine/src/fa/`.
- [ ] A DFA for "even number of 0s" accepts exactly the strings a brute-force oracle accepts, verified
      over all strings up to length 12 in a property test.
- [ ] An NFA run on a string with 3 accepting paths renders a branch tree with 3 highlighted paths.
- [ ] Scrubbing the transport slider to any step renders in < 16 ms with no re-simulation.
- [ ] Editing a machine to be invalid (two δ(q,a) in a DFA) shows *all* violations, not the first.
- [ ] A trace round-trips through `JSON.stringify`/`parse` and renders identically.

---

### 7.1 [P0] Text search application — *Module 1 §2.4*

**Why.** It is explicitly in the syllabus, it is the one place students see automata do something they
recognise, and it is a 1-day build on top of 7.0.

**What.** Enter a set of keywords → build the NFA for text search → convert to the keyword-recognising
DFA → paste a body of text → watch the head scan, with matches highlighted as the accepting states are
entered. Show the state count for both machines side by side.

**Acceptance criteria**

- [ ] Keywords `{web, ebay}` on input `"webay"` reports the match set the textbook's example does.
- [ ] Reuses `simulateDFA` and the automaton renderer; no bespoke simulator.

---

### 7.2 [P0] Conversion steppers — *Modules 1–2*

**Why.** This is the heart of the exam and the heart of the product. **Every conversion is animated as
the sequence of intermediate artifacts a student would write on paper.**

**What.** Each conversion is one engine function returning a trace, one route, one shared "before →
steps → after" layout with the source on the left, the growing target on the right, and the artifact
table underneath.

| Conversion | The steps the trace must contain |
|---|---|
| **NFA → DFA** (subset) | One step per subset table row: the subset being processed, its δ on each symbol, whether each target is new. New DFA states appear on the right as they are discovered. |
| **ε-NFA → NFA** | One step per state: its ε-closure computed (with the BFS visible), then the induced transitions added. |
| **RE → ε-NFA** (Thompson) | One step per AST node, bottom-up. Show the RE parse tree with the current node highlighted and the fragment it produced. |
| **DFA → RE (state elimination)** | One step per eliminated state, showing the ripped state, the affected edge set, and the newly-labelled edges with their concatenation/star expression. |
| **DFA → RE (R⁽ᵏ⁾ᵢⱼ)** | One step per k, filling the R table. The syllabus asks for **both** methods (§3.2.1, §3.2.2) — build both. |
| **DFA minimization** | Table-filling: one step per marking round, the triangular table filling in with the round number in each marked cell; then the merged machine. |
| **Regular grammar ⇄ NFA** | One step per production/transition mapped. |

**Acceptance criteria**

- [ ] Every conversion is a pure function `(input) → Trace`, tested independently of any UI.
- [ ] Round-trip property test: for 200 randomly generated small NFAs, `nfaToDfa` then `minimize` then
      `dfaToRegex` then `regexToENFA` then `epsilonElim` then `nfaToDfa` then `minimize` yields a DFA
      **equivalent** to the original (checked with the §7.9 equivalence procedure). This one test
      exercises the entire Module 1–2 engine and will catch nearly every conversion bug.
- [ ] The subset construction on the textbook's 2ⁿ bad case (§2.3.6) reaches the state cap and shows the
      "this is the point" explanation rather than hanging.
- [ ] Every step's `narration` reads as a sentence a lecturer would say. No `"step 4"`.
- [ ] Canonical state naming: running the same conversion twice produces identical state IDs.

---

### 7.3 [P0] Regular expressions & properties — *Module 2*

**Why.** §3.1, §3.3, §4.1, §4.2 in one surface.

**What.**

- **RE playground**: type an RE, see its parse tree (proving precedence `* > · > +`), its Thompson
  ε-NFA, its minimal DFA, and a live list of accepted/rejected strings — **all four panels in sync**.
  Changing the RE updates everything. This is the "one language, many views" idea and it is the single
  best conceptual page in the product.
- **UNIX RE vs formal RE** comparison table (§3.3.1) — a static docs page with a live "does this
  extended feature keep the language regular?" toggle (backreferences: no).
- **Lexical analysis demo** (§3.3.2): a set of token REs → combined NFA → DFA → tokenise a snippet of
  source with longest-match, showing which token rule won at each position.
- **Closure property lab** (§4.2): pick two machines from a palette, pick an operation (∪, ∩, complement,
  −, reversal, homomorphism, inverse homomorphism), and see the product/modified construction built
  step by step. The homomorphism ones need a small `h: Σ → Δ*` editor.

**Acceptance criteria**

- [ ] RE precedence is tested against a table of ≥ 30 expressions with their intended parse.
- [ ] All four panels of the playground stay in sync under rapid typing (debounced, no stale renders).
- [ ] The closure lab's product construction for ∩ is verified against brute-force membership on all
      strings up to length 10, for 50 random machine pairs.
- [ ] Complement is refused with an explanation when the input is an NFA (must be a complete DFA first)
      — and offers the one-click fix.

---

### 7.4 [P1] Grammars, derivations, parse trees & PDAs — *Module 3*

**Why.** Module 3 is the largest module in the attached material (67 pages) and the least well served by
existing tools.

**What.**

- **Grammar editor**: plain-text BNF-ish input (`S -> aSb | ε`), parsed into the `CFG` type, with
  inline errors. Terminals/variables inferred, overridable.
- **Derivation stepper**: choose leftmost or rightmost, step through, with the sentential form shown as
  a token strip and the applied production highlighted in the grammar. A "derive this string" mode
  searches for a derivation (bounded) and replays it.
- **Parse tree builder**: the tree grows alongside the derivation, one node per applied production; the
  yield is shown under the leaves so the tree↔derivation correspondence (§5.2.3–5.2.6) is visible rather
  than asserted.
- **Ambiguity detector**: search for a string with two distinct leftmost derivations, bounded by
  length/depth; display **the two parse trees side by side**. When found, that is a proof of ambiguity;
  when not found within bounds, say exactly that — *never* claim unambiguity. Include the classic
  ambiguous expression grammar and its unambiguous rewrite as presets (§5.4.2), and a docs note on
  inherent ambiguity (§5.4.4) which is undecidable and therefore explainer-only.
- **PDA editor + simulator**: transitions as `a, X / YX` labels exactly as the textbook writes them.
  The run view shows the **ID** `(q, w, γ)` as three synced panels — state, remaining input, stack
  column — plus the ID sequence as a scrollable text log in textbook notation, because that is what
  students must reproduce in the exam.
- **Nondeterministic PDA runs** show the branch tree, same as NFA.
- **Acceptance conversions** (§6.2.3–6.2.4): final-state ⇄ empty-stack, animated (new start state, new
  bottom marker `X₀`, the ε-transitions added).
- **CFG → PDA** (§6.3.1) and **PDA → CFG** (§6.3.2). The `[pXq]` triple construction is the hardest
  thing in the module — its trace must show each triple as it is generated and which PDA transition
  produced it.
- **DPDA page** (§6.4): a determinism checker for a PDA that reports exactly which transition pairs
  violate the DPDA condition; docs for the DCFL/CFL/regular relationships.

**Acceptance criteria**

- [ ] `S -> aSb | ε` derives `aaabbb` in 4 leftmost steps with a correct parse tree.
- [ ] The ambiguity detector finds two parse trees for `id + id * id` in the classic grammar and finds
      none (within bounds, reported as such) for the unambiguous rewrite.
- [ ] A PDA converted final-state → empty-stack accepts the same 200-string sample as the original.
- [ ] `cfgToPDA(G)` then simulating accepts exactly the strings `G` derives, over a random sample.
- [ ] `pdaToCFG(P)` produces a grammar whose language matches `P` on a random sample of ≤ length 8.
- [ ] The ID log is copy-pasteable in textbook notation.

---

### 7.5 [P1] CFL properties — *Module 4*

**Why.** §7.1 is a four-stage pipeline that students must perform in exact order, and getting the order
wrong is the most common lost-marks mistake in the subject. Showing the pipeline as a pipeline fixes it.

**What.**

- **The simplification pipeline**, as four chained steppers with the grammar diffed at each stage:
  1. Eliminate useless symbols — compute **generating** symbols (bottom-up), then **reachable** symbols
     (top-down), highlighting each set as it grows, and *show why the order matters* by offering the
     wrong order and displaying the residual useless symbol it leaves behind.
  2. Eliminate ε-productions — compute nullable symbols, then expand each production over subsets of
     its nullable occurrences.
  3. Eliminate unit productions — build the unit-pair graph, take its transitive closure, rewrite.
  4. **Chomsky Normal Form** — terminal-isolation productions, then binarisation, with the new variables
     named systematically.
- **CYK algorithm** (§7.4.2): the triangular table filling cell by cell, each cell showing the variable
  set and, on hover, which (B, C) split produced each variable. On success, **extract and draw the parse
  tree from the table** — that link is almost never shown and it is what makes CYK click.
- **CFL decision procedures** (§7.4): emptiness (is S generating?), infiniteness (cycle in the CNF
  dependency graph — show the cycle), membership (CYK). Docs panel listing the *undecidable* ones
  (equivalence, ambiguity, CFL-ness of the intersection) with the reason.
- **CFL closure lab** (§7.3): substitution, union/concat/star, reversal, **intersection with a regular
  language** (the PDA×DFA product construction, animated), inverse homomorphism. Explicitly demonstrate
  the **non**-closures: give `L₁ = {aⁿbⁿcᵐ}`, `L₂ = {aᵐbⁿcⁿ}`, show both are CFLs, show the intersection
  is `{aⁿbⁿcⁿ}`, and link to the CFL pumping lemma proof that it is not a CFL.

**Acceptance criteria**

- [ ] The four-stage pipeline run on the textbook's worked example reproduces the book's final CNF
      grammar exactly (allowing for variable renaming, checked by language equivalence on a sample).
- [ ] Every stage preserves the language (minus ε where applicable), verified on a random string sample
      after each stage, for 100 random grammars.
- [ ] CYK on a CNF grammar agrees with the derivation search for all strings up to length 10.
- [ ] The extracted parse tree's yield equals the input string.
- [ ] The wrong-order demo for useless symbols visibly leaves a useless symbol behind.

---

### 7.6 [P1] Turing machines — *Module 5 §8*

**Why.** The tape is the iconic image of the subject and every student wants to see one run.

**What.**

- **TM editor and simulator**: transitions written `a → b, R` on the diagram, exactly as the textbook
  draws them. The tape is an infinite scrolling strip with the head fixed centre or the tape fixed with
  a moving head (user toggle — different lecturers teach different conventions). Blank symbol
  configurable. Step counter and a halt/loop guard.
- **ID log** in textbook notation (`X₁…X_{i−1} q X_i…X_n`), copy-pasteable, alongside the visual tape.
- **Programming techniques** (§8.3), each as a preset with an explanation of the encoding:
  storage in the state (state = `[q, A]` pairs, rendered as a compound label), multiple tracks
  (rendered as stacked tape rows), subroutines (a callable sub-machine, rendered as a collapsible box).
- **Multitape TMs** (§8.4.1) with n tape strips and n heads, plus the **animated reduction to a
  single tape** (§8.4.2): the multi-track encoding with head markers, and the running-time cost shown
  as a counter (O(n²) blow-up made concrete rather than asserted).
- **Nondeterministic TMs** (§8.4.4): branch tree, plus the BFS-simulation-by-a-DTM explainer.
- **The gallery** — canonical machines, each with a one-line description and a step count:
  binary increment, unary addition, `{0ⁿ1ⁿ}`, palindrome checker, `{aⁿbⁿcⁿ}` (the CSL that makes the
  hierarchy concrete), copy/duplicate, a small **busy beaver** (2- and 3-state), and a machine that
  provably does not halt on some input — used to introduce §8.2.6 and set up Module 5's second half.

**Acceptance criteria**

- [ ] Every gallery machine halts with the documented output and within the documented step count,
      asserted in tests.
- [ ] A multitape machine and its single-tape reduction accept the same 100-string sample.
- [ ] The step guard stops at the cap with a clear message and an explicit "continue for N more" action.
- [ ] The ID log matches the textbook's notation character for character on the worked example.

---

### 7.7 [P1] Undecidability explainers — *Module 5 §8.1, §9* ⚠

**Why.** This content **cannot be simulated** — it is proof. The temptation is either to skip it or to
fake an animation. Do neither. Build genuine interactive explainers for the three proof mechanics.

**What.**

- **The diagonalization table** (§9.1.3): a scrollable grid, row *i* = TM *M_i*, column *j* = string
  *w_j*, cell = does *M_i* accept *w_j*. The diagonal is highlighted; a toggle flips it and shows why
  the flipped diagonal cannot be any row. Let the user click a cell to see the encoding of that TM
  (§9.1.2) and that string (§9.1.1). This is the clearest possible rendering of the argument and it is
  a table, not a hand-wave.
- **The reduction builder** (§8.1.3): drag problem A onto problem B to construct A ≤ B, with the
  contradiction diagram (hypothetical decider → the impossible machine) drawn automatically. Preset
  reductions: hello-world tester → halting, halting → L_u.
- **The language-class map for §9.2**: recursive ⊂ RE ⊂ all languages, with L_d, L_u, and complements
  placed on it, and the closure results from the §9.2 exercises (union, intersection, concatenation,
  star, homomorphism, inverse homomorphism for both recursive and RE) as an interactive table where
  clicking a cell shows the construction sketch or the counterexample.
- **Docs pages** for §1.2 formal proof (deductive, inductive, mutual induction) with the on/off switch
  mutual-induction example from §1.4 rendered as an actual automaton the student can step.

**Acceptance criteria**

- [ ] The diagonalization table computes real cells for a real small TM enumeration (bounded step
      budget, cells that exceed it marked "no answer within budget" — which is itself the honest and
      instructive display).
- [ ] No page in this section claims to "simulate" an undecidable problem.
- [ ] Each explainer cites its textbook section.

---

### 7.8 [P1] ⭐ The Pumping Lemma Game — *Modules 2 & 4*

**Why.** The pumping lemma is the hardest thing in the course for most students, and the reason is that
it is taught as a formula when it is actually **a two-player game with alternating quantifiers**. Make
the quantifier alternation literal and it becomes obvious. This is the feature students will remember.

**What.** An adversarial game, played against the engine, for both the regular (§4.1) and CFL (§7.2)
lemmas. Both roles playable.

*Student proves L is not regular (student = ∀-breaker):*

1. **Engine picks** the pumping length `n` (it may pick adversarially; the student must handle any `n`).
2. **Student picks** `w ∈ L` with `|w| ≥ n`. Engine validates membership and length and explains any
   rejection.
3. **Engine picks** a decomposition `w = xyz` with `|xy| ≤ n`, `|y| ≥ 1` — choosing, by design, the
   decomposition that is *hardest* for the student, so that a student who wins has really won.
4. **Student picks** a pumping index `i ≥ 0`.
5. Engine checks `xy^i z ∈ L`. If it is not in L, the student has won this round; the engine shows the
   completed contradiction written out as an exam-ready proof paragraph.

*Reverse mode:* the student defends a regular language and the engine attacks, which teaches why the
lemma does **not** prove regularity.

The CFL version has the same structure with `w = uvxyz`, `|vxy| ≤ n`, `|vy| ≥ 1`.

Presets with difficulty ratings: `{0ⁿ1ⁿ}`, `{ww}`, `{aⁿbⁿcⁿ}`, `{0ⁱ | i prime}`, balanced parens
(regular? no — CFL), `{0ⁿ1ᵐ | n ≤ m}`, and at least two languages that **are** regular so the reverse
mode has teeth.

**Acceptance criteria**

- [ ] Language membership for every preset is decided by an oracle in the engine, not by pattern matching.
- [ ] The engine's decomposition choice is genuinely adversarial: for a language where a naive `y = 0`
      split loses immediately, the engine does not choose it.
- [ ] Winning a round emits a written proof paragraph in exam prose, exportable.
- [ ] The reverse mode correctly demonstrates that a regular language survives all pumping attempts.
- [ ] Every game session is a `Trace` and can be replayed and shared.

---

### 7.9 [P1] ⭐ The equivalence checker, exercises, and auto-grading

**Why.** This is the feature no DSA visualiser can have and the one that makes a department adopt the
tool. Regular language equivalence is decidable, so the app can grade construction problems *exactly*
and give a counterexample rather than a score.

**What.**

- **`areEquivalent(A, B)`** via product construction + BFS from the start pair, returning either
  `{equivalent: true, proof: <the bisimulation/partition witness>}` or
  `{equivalent: false, witness: "0110", side: "A accepts, B rejects"}`.
- **The compare view**: two machines side by side, the witness string entered into both, and the two
  traces stepped in lockstep until they diverge — **the divergence step is highlighted in both**. This
  is the single most useful debugging experience in the whole product.
- **Exercise bank** (`/practice`), data-driven from a repo file so exercises are content, not code:

  ```ts
  interface Exercise {
    id: string
    module: 1 | 2 | 3 | 4 | 5
    topic: string                      // matches a syllabus node id
    prompt: string                     // "Construct a DFA over {0,1} accepting strings with an even number of 0s"
    kind: "construct-dfa" | "construct-nfa" | "construct-re" | "construct-cfg"
        | "construct-pda" | "construct-tm" | "convert" | "minimize" | "mcq" | "pumping"
    reference: unknown                 // the reference machine/grammar/RE
    grader: "language-equivalence" | "trace-match" | "exact" | "manual"
    hints: string[]                    // revealed progressively
    difficulty: 1 | 2 | 3
    vtuTag?: string                    // "Asked Dec-2023, Model QP 2" — cheap, high perceived value
  }
  ```

- **Grading behaviour by kind:**
  - Construct-DFA/NFA/RE → `language-equivalence` against the reference. Feedback is the witness string
    *and* the trace showing where the student's machine goes wrong on it. **Never** compare state counts
    or structure; any correct machine passes.
  - Convert/minimize → `trace-match`: compare the student's trace against the reference trace and report
    the **first divergent step**, which is the actual teaching signal.
  - Construct-CFG → sample-based: check the student grammar derives a sample of in-language strings and
    derives none of a sample of out-of-language strings. Report which sample string failed. Be explicit
    in the UI that this is a **sample check, not a proof** — CFG equivalence is undecidable, and saying
    so is itself a lesson.
  - Construct-PDA/TM → sample-based simulation with a step budget, same honesty caveat.
- **Minimality bonus, reported separately**: "correct, and minimal (4 states)" vs "correct, but 6 states —
  the minimal DFA has 4. See the minimization stepper." Never fail a correct answer for being non-minimal.
- **Assignments** [P2]: a lecturer picks exercises into a set, students complete them, the lecturer sees
  a per-student, per-topic completion heatmap. Builds on the existing Prisma/auth layer pattern from
  Stack-n-Flow.

**Acceptance criteria**

- [ ] `areEquivalent` agrees with brute-force membership comparison over all strings up to length 12,
      for 500 random machine pairs.
- [ ] The witness string returned is the **shortest** distinguishing string (BFS order guarantees this);
      asserted in tests.
- [ ] A student DFA with a different but correct structure grades as correct.
- [ ] A student DFA that is wrong on exactly one long string gets that string as feedback.
- [ ] CFG/PDA/TM grading UI displays the "sample check, not a proof" caveat prominently.
- [ ] The exercise bank ships with ≥ 60 exercises spanning all five modules at launch of this feature.

---

### 7.10 [P1] The Chomsky hierarchy map and the syllabus index

**Why.** Students learn TOC as five disconnected modules. It is one structure. One good page fixes that,
and it is also the page that makes a head of department understand the project in ten seconds.

**What.**

- **`/hierarchy`** — nested containment rings (Regular ⊂ CFL ⊂ CSL ⊂ Recursive ⊂ RE ⊂ All). Each ring
  is clickable and reveals its machine model, its grammar type, its closure properties, its pumping
  lemma, and its decision properties, each linking to the live tool. Canonical languages are plotted as
  points in the correct ring — `{0ⁿ1ⁿ}` just outside Regular, `{0ⁿ1ⁿ2ⁿ}` just outside CFL, `L_u` in
  RE\Recursive, `L_d` outside RE — and clicking a point opens the proof that places it there
  (the pumping game, or the diagonalization explainer). **The map is the navigation.**
- **`/syllabus`** — the BCS503 module table, each row linking to the matching tool, docs page, and
  exercises. Driven by `apps/web/lib/syllabus.ts` so another university's scheme is a config file, not
  a code change — the same lesson already learned in `lib/config/institutions.ts`.
- Every tool page shows a "BCS503 Module N · Hopcroft §x.y" breadcrumb.

**Acceptance criteria**

- [ ] Every syllabus item in §4 of this PRD resolves to a live link. A CI test walks
      `syllabus.ts` and fails on any dead or missing target.
- [ ] Adding a tool requires editing `catalog.ts` and `syllabus.ts` only.

---

### 7.11 [P2] JFLAP interoperability

**Why.** JFLAP `.jff` is the de-facto interchange format for TOC coursework; a lecturer with fifteen
years of `.jff` files can adopt this tool in one afternoon if it opens them. This is the cheapest
adoption lever available.

**What.** Import and export `.jff` for FA, PDA, and TM. Native `.tnt` JSON for everything (including
grammars and traces, which `.jff` cannot represent). Drag-and-drop import. A clear, non-silent report of
anything in a `.jff` that cannot be represented.

**Acceptance criteria**

- [ ] A corpus of ≥ 20 real `.jff` files imports and simulates identically to JFLAP's result.
- [ ] Export → re-import round-trips losslessly for the supported types.
- [ ] Unsupported constructs produce a visible warning listing them; nothing is dropped silently.

---

### 7.12 [P1] Vyakarana — the Python notebook library

**Why.** This is the direct architectural transplant from Pratyaksha and the thing that makes the
project more than "another automata website". A lecturer writing course notes in Jupyter can build a
machine in a cell and get a live, correct rendering.

**Name.** `vyakarana` (व्याकरण) — the Sanskrit science of grammar; Pāṇini's *Aṣṭādhyāyī* is the
ancestor of every formal grammar in this syllabus. Sibling to `pratyaksha`. Verified available on PyPI.

**What.**

```python
from vyakarana import DFA, NFA, CFG, PDA, TM, RE

d = DFA(
    states={"q0", "q1"}, alphabet={"0", "1"},
    transitions={("q0", "0"): "q1", ("q0", "1"): "q0",
                 ("q1", "0"): "q0", ("q1", "1"): "q1"},
    start="q0", accepting={"q0"},
)
d                          # renders the diagram inline
d.run("0110")              # renders the animated run with transport controls
d.accepts("0110")          # -> True   (plain value, no rendering)

n = NFA.from_regex("(0|1)*01")
n.to_dfa()                 # renders the subset-construction stepper, returns the DFA
n.to_dfa().minimize()      # chains; each call renders its own stepper

g = CFG.from_text("S -> a S b | ε")
g.derive("aabb", order="leftmost")   # renders derivation + parse tree
g.to_cnf()                           # renders the four-stage pipeline

d.equivalent_to(other)     # -> EquivalenceResult(equivalent=False, witness="0110")
d.export_trace()           # JSON, same schema as the web app  (§6.3)
```

**Architecture — identical to Pratyaksha's, and non-negotiable:**

- **The engine stays in TypeScript.** Python does *not* reimplement subset construction. Python builds
  the machine object, ships it to the bundled JS engine through `anywidget` traitlets, and receives the
  trace back. **One implementation of every algorithm, forever.** Python-side pure-Python fallbacks for
  `accepts()` and other cheap predicates are permitted only if they are tested against the engine's
  answer on a shared fixture corpus in CI.
- Traits: `payload` (the machine or grammar), `trace` (the returned trace), `step` (current index),
  `options` (theme, speed, layout mode). All `.tag(sync=True)`.
- The React bridge is bundled with `tsup` into `vyakarana/static/`, shipped as package data, so
  `pip install` works with no Node on the user's machine. Import raises a clear `RuntimeError` naming
  the missing bundle path and the build command if the bundle is absent — never fail silently.
- Tailwind built with a **scoped, Preflight-disabled** config (`.vyakarana-container`) so the widget's
  CSS cannot repaint the host notebook. This bug has already been paid for once in Pratyaksha; do not
  pay for it again.
- `_repr_mimebundle_` for automatic rendering on bare display.
- Works in Jupyter, JupyterLab, VS Code notebooks, and **Google Colab**. Colab is the one students
  actually use; it is a release criterion, not a nice-to-have.

**Acceptance criteria**

- [ ] `pip install` from a clean virtualenv renders a DFA in Colab with no Node toolchain present.
- [ ] Every public Python method has a corresponding engine function; a CI test asserts the two API
      surfaces have not drifted.
- [ ] Widget CSS provably does not leak: a test notebook with custom host styling renders unchanged
      outside the container.
- [ ] The README's "what actually works today" table is accurate, per §0 rule 4.
- [ ] `export_trace()` output validates against the same JSON schema the web app's traces use.

---

### 7.13 [P2] Browser IDE — "define it, run it, watch it"

**Why.** The flagship of Stack-n-Flow's roadmap (F5), and it is **materially easier and safer here**:
students submit a *machine definition* or a *grammar*, not arbitrary code, so there is nothing to
sandbox for the core experience.

**What.**

- **Stage 1** — a textual machine DSL with Monaco, syntax highlighting, and live error squiggles:

  ```
  dfa EvenZeros {
    alphabet = {0, 1}
    start q0
    accept q0
    q0 -0-> q1 ;  q0 -1-> q0
    q1 -0-> q0 ;  q1 -1-> q1
  }
  ```

  The diagram renders live beside the text, and the text updates live when the diagram is edited —
  bidirectional, which is what makes it feel like a real IDE.
- **Stage 2** — Pyodide + Vyakarana in the browser: the student writes actual Python against the
  library, and the traces stream into the same React renderers. Requires the Vyakarana wheel to be
  Pyodide-compatible (pure Python + bundled JS assets — it already is, by construction).
- **Stage 3** [stretch] — a "language checker" arena: write a Python predicate for a language, and the
  engine differential-tests it against your submitted DFA over all strings up to length k, reporting
  every disagreement.

**Acceptance criteria**

- [ ] Text ⇄ diagram sync survives 100 random edit operations without divergence (property test).
- [ ] The DSL grammar is documented on one page with a complete example per machine type.
- [ ] Stage 2 runs entirely client-side; no code execution endpoint exists on the server.

---

### 7.14 [P2] Classroom and platform layer

Carried over conceptually from Stack-n-Flow's F4/F6/F7. Lower priority than the engine work, and
explicitly **after** the exercise bank exists — progress tracking with nothing to track is empty.

- Student progress per syllabus node; streaks; weak-topic surfacing.
- Lecturer dashboard: class roster, per-topic completion heatmap, per-exercise failure clustering
  ("18 of 40 students' DFAs fail on strings ending in `01`" — a genuinely new teaching signal that
  falls out of witness strings for free).
- **Presentation mode**: chrome-free, large-type, keyboard-driven view of any tool for projector use.
  Trivial to build, disproportionately used.
- **Predict-the-next-step quizzes**, generated automatically from any trace (§6.3).
- **Live counters** on every run: transitions taken, states created, comparisons, tape moves — displayed
  next to the complexity note.
- Share-by-link for any machine or trace (`/s/<id>`).

---

## 8. Non-goals and prohibitions

**Non-goals** (say no to these explicitly; revisit only after P2 ships):

- A general-purpose model checker, SAT/SMT solver, or verification tool.
- Compiler construction beyond the lexical-analysis demo of §3.3.2. No parser generators, no LR tables.
- Linear-bounded automata / context-sensitive grammars beyond their box on the hierarchy map — not in
  the attached syllabus material.
- Complexity theory (P, NP, reductions between NP-complete problems) — not in the supplied Module 5
  extract. Confirm against the current VTU scheme before building.
- Mobile-first editing. The tool is responsive and *readable* on a phone; graph editing is desktop-first.
- Real-time collaborative editing.

**Prohibitions** (violating these is a defect regardless of whether tests pass):

- ✗ Any engine code that imports React, Next, or touches the DOM.
- ✗ Any algorithm that returns a result without a trace.
- ✗ Any component over ~300 lines, or any component that both fetches/computes and renders.
- ✗ Any non-deterministic state naming in a conversion.
- ✗ Any claim in a docs file that the code does not support — including the README status table.
- ✗ Any UI that says a language "is regular" or "is not ambiguous" on the basis of a bounded search.
  Bounded results are always reported as bounded: *"no counterexample found up to length 12."*
- ✗ Reimplementing any algorithm in Python. The engine is TypeScript, once.
- ✗ A server-side arbitrary-code execution endpoint. Ever.

---

## 9. Roadmap

Sequenced by (teaching value) ÷ (effort), with the constraint that the engine leads. Estimates assume a
single developer working with an agent.

| Phase | Contents | Estimate | Ships as |
|---|---|---|---|
| **P0.1** | Monorepo, types, trace protocol, FA simulate (DFA/NFA/ε-NFA), test harness | 1 wk | engine package, no UI |
| **P0.2** | Automaton editor, renderer triad, transport controls, multi-run table | 1.5 wks | **v0.1 — a usable DFA/NFA simulator** |
| **P0.3** | All Module 1–2 conversions + minimization + the round-trip property test | 1.5 wks | v0.2 |
| **P0.4** | RE playground (4 synced panels), closure lab, text search | 1 wk | **v0.3 — Modules 1–2 complete** |
| **P1.1** | Equivalence checker + compare view + first 60 exercises | 1 wk | **v0.4 — auto-graded practice** |
| **P1.2** | Pumping lemma game, both variants | 1 wk | v0.5 — the memorable feature |
| **P1.3** | CFG editor, derivations, parse trees, ambiguity detector | 1.5 wks | v0.6 |
| **P1.4** | PDA: editor, ID simulator, acceptance conversions, CFG⇄PDA, DPDA check | 2 wks | **v0.7 — Module 3 complete** |
| **P1.5** | Simplification pipeline, CNF, CYK, CFL closure lab | 1.5 wks | **v0.8 — Module 4 complete** |
| **P1.6** | TM editor, simulator, gallery, multitape, programming techniques | 2 wks | v0.9 |
| **P1.7** | Undecidability explainers; hierarchy map; syllabus index | 1 wk | **v1.0 — full BCS503 coverage** |
| **P1.8** | Vyakarana: bridge, package, Colab verification, PyPI release | 2 wks | `vyakarana` v0.1 |
| **P2** | JFLAP I/O, browser IDE, classroom layer, presentation mode, quizzes | 4–6 wks | v1.x |

**v1.0 is the milestone that matters**: complete, correct, syllabus-mapped coverage of BCS503. Ship it
before anything in P2.

---

## 10. Verification strategy

The engine is a mathematical artifact, so test it like one. This section is not optional.

1. **Unit tests** on every engine function against the textbook's own worked examples. Cite the section
   in the test name: `test("subset construction — Hopcroft Fig 2.12")`.
2. **Oracle/property tests** — the backbone. For randomly generated small machines:
   - `simulate(M, w) === bruteForceMembership(M, w)` for all `w` with `|w| ≤ 12`.
   - `L(nfaToDfa(N)) === L(N)`, `L(minimize(D)) === L(D)`, `L(thompson(re)) === L(re)`.
   - `minimize(minimize(D)) === minimize(D)` (idempotence).
   - `|minimize(D).states|` is minimal — cross-checked against Hopcroft's algorithm as a second,
     independently-written implementation used **only in tests**.
   - The Module 1–2 grand round-trip of §7.2.
   - Each CFG simplification stage preserves the language on a sample.
3. **Differential test against JFLAP** [P2]: for the `.jff` corpus, compare accept/reject verdicts.
4. **Trace invariants** (one shared test helper applied to every trace-producing function):
   step indices are contiguous from 0; every `narration` is non-empty and does not contain the word
   "step"; every `highlight` references an id that exists in the corresponding snapshot; the trace
   round-trips through JSON; the final snapshot equals the declared `result`.
5. **Snapshot tests** on renderers with fixed traces, so a rendering regression is visible in a diff.
6. **Accessibility**: keyboard-navigable machine editing, and every state/transition reachable and
   announced by a screen reader. A diagram-only tool that cannot be keyboard-driven excludes students.
7. **CI gates**: `pnpm -F engine test --coverage` ≥ 90%; lint; `next build`; `pytest`;
   bundle-freshness check for `vyakarana/static/` (Stack-n-Flow already has
   `scripts/check-bundle-freshness.mjs` — port it).

---

## 11. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Scope explosion.** TOC is enormous; every subsection invites a feature. | High | §4 is the fence. If it is not in the attached module extracts, it is P2 or out. §8 is binding. |
| **A wrong algorithm ships and a student loses marks.** | Medium | This is the worst outcome in the project. Oracle/property tests (§10.2), 90% coverage gate, textbook-example tests. Do not ship a conversion without its round-trip test. |
| **Graph layout is ugly and the tool feels amateur.** | High | Layout is a real, underestimated problem. Budget for it: force-directed for user-drawn, **layered/BFS-by-distance for generated** machines, manual drag always available and always persisted. Evaluate `elkjs` or `dagre` early rather than hand-rolling. |
| **Non-determinism rendering is confusing rather than clarifying.** | Medium | Prototype the branch tree on paper first. Fall back to a stepped frontier-set view if the tree does not read well at 8+ branches. |
| **Repeating Stack-n-Flow's monolith mistake.** | Medium | §6.5 triad rule, a component line-count lint, and the fact that the engine boundary makes monoliths hard to write by accident. |
| **The Python bridge diverges from the web engine.** | Medium | The engine is TypeScript only (§7.12). A CI test asserts API-surface parity. Never a second implementation. |
| **Effort estimate is optimistic.** | High | It is. Phases ship independently; v0.2 is already useful standing alone. Prefer shipping Module 1–2 excellently over all five modules shakily. |

---

## 12. Appendix

### 12.1 Naming

Recommended: **Tape-n-Trace** (web) / **Vyakarana** (Python).

*Tape-n-Trace* keeps the sibling `X-n-Y` cadence; "tape" is the subject's iconic image and "trace" is
the product's core verb — every feature in this document produces a trace.

Alternates, if you prefer: **Sigma-n-Star** (Σ / Σ*, covers the whole subject rather than leaning on
TMs), **Delta-n-Star** (δ, the transition function), **State-n-Tape** (the two ends of the hierarchy),
**Automatika**. Pick before P0.1 — the name is in the package names, the repo, and the DSL keyword
namespace, and changing it later is annoying.

### 12.2 Glossary of trace kinds

Fix these strings early; they are the discriminants everything switches on.

```
simulate.dfa           simulate.nfa           simulate.enfa
simulate.pda           simulate.tm            simulate.tm.multitape
convert.nfa-to-dfa     convert.enfa-to-nfa    convert.re-to-enfa
convert.dfa-to-re.elim convert.dfa-to-re.rij  convert.minimize
convert.grammar-to-nfa convert.pda-acceptance convert.cfg-to-pda
convert.pda-to-cfg     convert.tm-multitape-to-single
grammar.derive         grammar.parse-tree     grammar.ambiguity
grammar.useless        grammar.epsilon-prod   grammar.unit-prod
grammar.cnf            grammar.cyk
decide.membership      decide.emptiness       decide.finiteness
decide.equivalence     decide.state-equivalence
closure.regular.*      closure.cfl.*
game.pumping.regular   game.pumping.cfl
```

### 12.3 Reference material

- Hopcroft, Motwani, Ullman — *Introduction to Automata Theory, Languages, and Computation*, 3rd ed.
  The attached BCS503 module extracts are Ch. 1–2 (M1), 3–4 (M2), 5–6 (M3), 7 (M4), 8–9 (M5).
  **Section numbers in this PRD refer to this book and should be cited in code comments and docs pages.**
- Sipser — *Introduction to the Theory of Computation* — for alternative phrasings when Hopcroft's
  notation is heavy (especially the TM chapter).
- [JFLAP](https://www.jflap.org/) — for the `.jff` format and as a UX reference for what to beat.
- [Automata Tutor v3 (CAV 2020)](https://arxiv.org/abs/2005.01419) — read the paper before building
  §7.9; it has empirical results on what feedback actually helps students.
- [Automatarium](https://github.com/automatarium/automatarium) — modern web prior art; useful for
  editor interaction patterns.
- Stack-n-Flow's own `pratyaksha_phases.md`, `fixes_phases.md`, and `.agent/rules.md` — the bridge,
  scoped-Tailwind, and renderer-extraction lessons are all already written down there. Read them before
  starting §7.12; they will save a week.

### 12.4 Open questions for the author

1. Confirm the current VTU BCS503 scheme: does Module 5 include Post's Correspondence Problem and/or
   the classes P and NP? The attached extract stops at §9.2.
2. One repo or two? This PRD assumes a **new repo** (`tape-n-trace`) rather than a folder inside
   Stack-n-Flow, because the engine-first monorepo layout differs structurally. Shared design tokens
   could be extracted to a third small package later if both projects are maintained.
3. Is auth/classroom (§7.14) in scope for the first department demo, or is v1.0 (anonymous, no login)
   enough? Recommendation: v1.0 anonymous, add auth only when assignments are real.
