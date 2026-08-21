# Build Phases — Tape-n-Trace

> **Status: pre-implementation.** Nothing below is built. This is the execution plan.

Companion documents: [architecture.md](architecture.md) · [documentation.md](documentation.md) · [README.md](README.md)

---

## 1. How to use this document

Phases are sequenced by *(teaching value) / (effort)*, with one hard constraint: **the engine leads.**
Every screen is a thin renderer over engine output, so no UI phase begins before the engine functions it
renders exist and are tested.

**Rules:**

1. Do not start phase *N+1* while any acceptance criterion of phase *N* is unmet. The exit gate is
   binary, not a judgement call.
2. Every criterion below is testable. "Looks right" is not a criterion.
3. Each phase ends with the README status table updated in the same commit as the feature. A feature
   that works but is undocumented, or documented but not working, fails its gate.
4. Estimates assume one developer working with a coding agent. They are optimistic; see §6.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done and gated

---

## Status tracker

Updated in the same commit as the work it describes. ✅ done and pushed · 🔨 in progress · ⬜ not started.

| Phase | Ships | Status | Notes |
|---|---|---|---|
| P0.1 Foundations | engine | ✅ | 2026-08-19 · trace protocol, FA simulation, harness |
| P0.2 Renderers, editor | v0.1 | ✅ | 2026-08-19 · simulator, editor, export |
| P0.3 Conversions | v0.2 | ✅ | 2026-08-19/20 · grand round-trip green, 6 stepper routes |
| P0.4 RE playground, closure, search | v0.3 | ✅ | 2026-08-21 · Modules 1–2 complete |
| P1.1 Equivalence, exercises | v0.4 | ⬜ | engine half already done in P0.3 |
| P1.2 Pumping game | v0.5 | ⬜ | |
| P1.3 Grammars, parse trees | v0.6 | ⬜ | |
| P1.4 PDA | v0.7 | ⬜ | |
| P1.5 CFL properties, CNF | v0.8 | ⬜ | |
| P1.6 Turing machines | v0.9 | ⬜ | |
| P1.7 Undecidability, hierarchy | v1.0 | ⬜ | |
| P1.8 Vyakarana (Python) | pkg 0.1 | ⬜ | ADR-004 spike first |

**Deadline note (added 2026-08-21): 10 days remain.** The outstanding plan is ~11 estimated weeks,
so v1.0 as specified does not fit. The cut that preserves the most value: P1.1 → P1.2 → P1.3 → P1.4
in order (each ships alone), then reassess. P1.8 and P1.6/P1.7 are the natural sacrifices — the
Python package is a separate deliverable, and Module 5 is explainer-heavy. Prefer shipping
Modules 1–3 excellently over five modules shakily (§6, first risk).

## 2. Scope baseline — BTOCH503 (autonomous)

**Default scheme: `atria-2026-btoch503`.** Theory of Computation, BTOCH503, semester V — Atria Institute
of Technology (autonomous), Dept. of Information Science & Engineering, AY 2026-27. Source:
`3.Pcc-ToC.docx`.

| Module | Hours | Sections (as printed) | CO |
|---|---|---|---|
| 1 | 8 | 1.1, 1.5, 2.2, 2.3, 2.4, 2.5 | CO1 |
| 2 | 8 | 3.1, **3.2 (Except 3.2.1)**, 3.3, 4.1, 4.2, 4.4 | CO2 |
| 3 | 8 | 5.1, 5.2, 5.4, 6.1, 6.2, **6.3.1**, 6.4 | CO3 |
| 4 | 8 | 7.1, 7.2, 7.3 | CO4 |
| 5 | 8 | 8.1, 8.2, 8.3, 8.4, 9.1, 9.2 | CO5 |

**The section list is identical to VTU 2022 BCS503**, confirmed against both the syllabus document and
the module-wise textbook extracts, which are named for their ranges
(`Module2_3.1_3.2ex3.2.1_3.3_4.1_4.2_4.4.pdf`). Every scope decision in §2.3 therefore holds unchanged
for both schemes, and `vtu-2022-bcs503` ships as a second config at near-zero cost.

Credits **3**. **L:T:P:S = 42:0:0:56** — 42 lecture hours, **zero tutorial hours, 56 self-study hours**.
Textbook: **Hopcroft, Motwani & Ullman, 2nd edition, Pearson** (architecture.md ADR-005).

> **The 56 self-study hours are the design target.** More than half of a student's contact with this
> subject is unsupervised, with no tutorial slot at all. That is the gap this tool exists to fill, and it
> is why the trace protocol matters more than any individual feature: a student working alone at 1 a.m.
> needs to see *why* a step happened, not just that it did.

**Assessment.** CIA 50 / SEE 50, weighted CIE-I 12.5%, CIE-II 12.5%, Assignment/Activities 25%, SEE 50%.

The SEE is 3 hours, 100 marks: ten questions, **two per module as an OR pair**, the student answers five,
one per module. Every question is **20 marks split a=6, b=6, c=8**, and every sub-part carries its own
Bloom's level and CO tag. This is a far more precise target than a bare difficulty rating, and P1.1's
`Exercise` type encodes it directly.

**Course outcomes.** Note these differ from VTU's and sit at higher Bloom's levels — one Explain, one
Apply, three Analyze.

| CO | Outcome | CL | Module | Delivered by |
|---|---|---|---|---|
| CO1 | Explain the concepts of finite automata, regular languages, context-free languages and Turing machines | 2 | 1 | P0.1-P0.2 |
| CO2 | Apply automata theory principles to construct FA, RE, CFG, PDA and their equivalent models | 3 | 2 | P0.3-P0.4 |
| CO3 | Analyze formal languages and computational models to determine language properties, automata equivalence, closure properties | 4 | 3 | P1.1, P1.3, P1.4 |
| CO4 | Analyze CFGs, PDAs and TMs to solve computational problems and distinguish classes of formal languages | 4 | 4 | P1.5, P1.6 |
| CO5 | Analyze decidability, undecidability and computability to classify problems by solvability | 4 | 5 | P1.2, P1.7 |

> **Known inconsistencies in the source documents.** The lesson plan states 40 teaching hours and a
> different CO-to-module mapping (CO1 and CO2 spanning modules 1-4, CO3 and CO4 spanning 3-4); the
> syllabus document gives a clean 1:1 mapping and 42 lecture hours. The model question papers tag
> everything CL2/CL3 while the syllabus claims CL4 for CO3-CO5. The gap-analysis document still carries
> the old `BCS503` code. **The syllabus document (`3.Pcc-ToC.docx`) is treated as authoritative**; the
> scheme config records the discrepancies in a comment rather than silently picking a side.

### 2.1 Tutorial components — already on the roadmap

The syllabus lists seven tutorial components. Six are existing planned features; the mapping is a
ready-made adoption argument and should be surfaced on `/syllabus`.

| Tutorial component | Delivered by |
|---|---|
| Lexical Analyzer Design using Regular Expressions | P0.4 lexical analysis demo |
| Pattern Matching and Search Engine Simulation using Finite Automata | P0.4 text search |
| Balanced Parentheses Checker using Pushdown Automata | P1.4 PDA simulator |
| Syntax Validation of Simple Programming Statements using CFGs | P1.3 grammar editor + derivation |
| String Processing Problems using Turing Machine concepts | P1.6 TM gallery |
| Language Classification (Regular, CFL, CSL, Recursive, RE) | P1.7 hierarchy map |
| Automata Simulation using JFLAP Tool | P2 `.jff` import — deliberately not prioritised |

### 2.2 Departmental gap analysis — the adoption case

`New_TOC_Gap_Analysis.docx` records four gaps the faculty have already identified, with planned
remediation dates across Aug-Nov 2026. They map onto the roadmap one-to-one, which is a stronger
adoption argument than anything in the PRD:

| # | Faculty-stated gap | Addressed by |
|---|---|---|
| 1 | Difficulty in designing and visualizing FA, RE and automata conversions | P0.2, P0.3, P0.4 |
| 2 | Difficulty in constructing CFGs, parse trees and PDAs | P1.3, P1.4 |
| 3 | Limited understanding of language classification, pumping lemma and computational limitations | P1.2, P1.7 |
| 4 | Limited practical exposure to Turing Machines and real-world applications of automata | P1.6, P0.4 |

Independently, `LEAP TOC.docx` proposes physical classroom activities including a "Pumping Lemma Human
Chain" (students hold cards for x, y, z and pump y) and a "Language Classification Game" (zones labelled
Regular, CFL, CSL, Recursive, RE). Those are the pumping game of P1.2 and the hierarchy map of P1.7,
arrived at independently. Build those two well.

### 2.3 Demoted to enrichment

Five topics the PRD scoped that the published syllabus excludes. They stay in the topic graph, flagged
`enrichment`, and are built **after v1.0** (see §5). Rationale in architecture.md ADR-003.

| Topic | Hopcroft | Why demoted | Was |
|---|---|---|---|
| PDA to CFG, the `[pXq]` construction | 6.3.2 | Module 3 lists **6.3.1 only** | PRD 7.4, a core P1 item |
| CYK, and CFL decision properties | 7.4 | Module 4 lists **7.1-7.3 only** | PRD 7.5 centrepiece |
| DFA to RE by R(k)ij induction | 3.2.1 | Syllabus says **"Except 3.2.1"** | PRD 7.2 — which claimed the reverse |
| Decision properties of regular languages | 4.3 | Module 2 lists 4.1, 4.2, **4.4** | PRD 5.3 DECIDE rows |
| Formal proof, induction, mutual induction | 1.2, 1.4 | Module 1 lists **1.1 and 1.5 only** | PRD 7.7 docs pages |

Note that **minimization stays in scope** — it lives in 4.4 ("Equivalence and Minimization of Automata"),
which is listed. The PRD cited it as 4.3, which is a different section and is excluded.

### 2.4 Examined beyond the section list

The model papers and question bank test four things the textbook section list does not strictly cover.
The section list bounds *reading*; the question papers bound *examination*, and where they disagree the
question papers are what a student actually faces.

| Item | Where it appears | Status |
|---|---|---|
| **Left recursion elimination** (`E -> E+T \| T` etc.) | Model QP Set 1, Q5c, 8 marks, Module 3 | **In scope, built in P1.3.** Outside Hopcroft 5.1/5.2/5.4 — it is a parsing topic — but examined at 8 marks, and a student who cannot do it loses them. |
| **Divisible-by-K DFA construction** | Q1c, Q2b, question bank #3, #5 | In scope (2.2), but a recurring stock pattern. Ships as a preset family plus a generator rather than as one-off exercises. |
| **HALT_TM undecidability** | Model QP Set 1, Q10b | Just past 9.1/9.2, but the P1.7 reduction builder already presets halting-to-L_u, so it is covered without new scope. |
| **DFSM / NDFSM terminology** | Throughout every paper | Not new content — a synonym for DFA/NFA. The UI and docs should recognise both spellings so search and revision work. |

---

## 3. P0 — The engine and Modules 1-2

**Goal of P0:** a correct, tested, fully traced engine for regular languages, and a web app that is
already worth using standing alone. **Target: 5 weeks.**

---

### ✅ P0.1 — Foundations · 1 week · ships: engine package, no UI — **DONE**

**Goal.** The trace protocol, the type layer, and FA simulation, with the test harness that every later
phase reuses.

**Deliverables**

- pnpm workspace; shared `tsconfig.base.json`; ESLint with the engine import ban; vitest + fast-check;
  GitHub Actions CI skeleton.
- `packages/engine/src/`: `types.ts`, `result.ts`, `validate.ts`, `trace.ts`, `ids.ts`.
- `fa/simulate.ts`: `simulateDFA`, `simulateNFA`, `simulateENFA`, `epsilonClosure`.
- Test harness: the shared trace-invariant helper, `bruteForceMembership` oracle, `fast-check`
  arbitraries for small FAs, committed random seed.

**Acceptance criteria**

- ✅ `packages/engine` has zero React/DOM imports, enforced by lint, failing CI.
- ✅ At least 90% line coverage on `fa/simulate.ts` and `trace.ts`. — both at 100%, engine at 99.8%.
- ✅ `simulateDFA` agrees with the brute-force oracle on all strings up to length 12, for 200 random DFAs.
- ✅ `simulateNFA` retains dead branches in its branch tree, flagged dead at the step they died.
- ✅ Every trace produced passes all six trace invariants (architecture.md §5).
- ✅ A trace round-trips through `JSON.stringify` / `parse` byte-identically.
- ✅ `validateFA` on a DFA with two transitions for the same `(state, symbol)` returns **all** violations,
      not the first.
- ✅ Deep-cloning a snapshot is impossible by construction: snapshots are frozen, and a mutation attempt
      throws in development (ADR-001).

**Exit gate.** CI is green, coverage gate active, and the trace-invariant helper is importable by any
future test file.

---

### ✅ P0.2 — Renderers, editor, transport · 1.5 weeks · ships **v0.1, a usable DFA/NFA simulator** — **DONE**

**Goal.** The renderer/controller/docs triad pattern, established once, correctly, so every later feature
inherits it.

**Deliverables**

- `packages/ui`: `automaton-renderer`, `state-node`, `transition-edge`, `self-loop`, `branch-tree`,
  `controls/transport-bar`, `tokens.css`.
- `apps/web`: Next.js 15 scaffold, `lib/catalog.ts`, `/simulate/[machine]`, plus the
  `automaton-controller` and `automaton-docs` halves of the triad.
- Editor: click to add a state, drag state-to-state for a transition, click an edge to edit its label,
  double-click to toggle accepting, right-click to set start. Undo/redo. Layered auto-layout via `elkjs`.
- Multi-run table: paste a list of strings, get accept/reject for all at once, click a row to load its trace.
- Strings and languages primer page (Hopcroft 1.5): alphabets, powers, Sigma-star, length, concatenation,
  with a live "generate all strings of length <= k" widget.
- **Divisible-by-K preset family.** "Construct a DFA accepting decimal strings divisible by 3 / by 5"
  recurs across the model papers and the question bank (Q1c, Q2b, bank #3, #5). Ships as a parameterised
  preset over base and divisor, with the residue-class construction explained — one stock exam pattern
  handled properly rather than as six unrelated exercises.
- **Terminology synonyms.** The question papers write DFSM and NDFSM where Hopcroft writes DFA and NFA.
  Both spellings are recognised in search and shown in docs, so revision against past papers works.
- **Export a machine or a trace** as PNG, SVG or `.tnt` JSON. Assignments and activities are 25% of the
  course marks; students need something submittable, and the alternative is a phone photo of a screen.

**Acceptance criteria**

- ✅ The renderer imports nothing from `packages/engine` — verified by lint. Type-only imports are
      allowed and erase at build time; a runtime import fails the build.
- ✅ No component exceeds 300 lines; the line-count lint rule is active in CI.
- ⚠️ Scrubbing re-simulates nothing — proven exactly: the engine call is counted, and moving the
      slider across every step leaves the count at 1. Cost is also independent of machine size
      (1.0x for 17x the transitions), which is what the memoised renderers and the identity caches in
      `geometry.ts` buy. **The 16 ms itself is still unverified**: it is a browser budget, and the
      measurement runs in jsdom, where DOM mutation is an order of magnitude slower. Asserting the
      number there would be choosing a threshold to fit the tooling rather than measuring the thing.
- ✅ An NFA run on a string with 3 accepting paths renders a branch tree with 3 highlighted paths and
      the dead branches greyed at their death step.
- ✅ An invalid machine shows every violation simultaneously in the editor.
- ✅ A trace loaded from JSON renders identically to the same trace produced in-process.
- ✅ Machine editing is fully keyboard-navigable; every state and transition is screen-reader
      announced. Tested by building a machine end to end through labelled controls alone.
- ✅ The README status table lists exactly what works.

**Exit gate.** v0.1 is deployable and a student can simulate DFAs and NFAs end to end.

---

### ✅ P0.3 — Module 1-2 conversions · 1.5 weeks · ships v0.2 — **DONE**

**Goal.** The conversion steppers. This is the heart of the exam and the heart of the product.

**Deliverables**

- `fa/subset.ts`, `fa/epsilon.ts`, `fa/minimize.ts`, `fa/equivalence.ts`, `fa/regularGrammar.ts`.
- `regex/parse.ts`, `regex/thompson.ts`, `regex/stateElim.ts`. **Not** `regex/rij.ts` — enrichment.
- One shared "source left, growing target right, artifact table underneath" stepper shell, plus one route
  per conversion under `/convert/[conversion]`. **Built** — six routes, one shell, driven by a registry
  (`lib/conversions.ts`) so a new conversion is an entry rather than a page.

Steps each trace must contain:

| Conversion | Step content |
|---|---|
| NFA to DFA (subset) | One step per subset table row: the subset processed, its delta on each symbol, whether each target is new. New DFA states appear on the right as discovered. |
| epsilon-NFA to NFA | One step per state: its epsilon-closure computed with the BFS visible, then the induced transitions added. |
| RE to epsilon-NFA (Thompson) | One step per AST node, bottom-up, with the RE parse tree showing the current node and the fragment it produced. |
| DFA to RE (state elimination) | One step per eliminated state: the ripped state, the affected edge set, the newly-labelled edges with their concatenation/star expression. |
| DFA minimization | Table-filling: one step per marking round, the triangular table filling in with the round number in each marked cell; then the merged machine. |
| Regular grammar to/from NFA | One step per production or transition mapped. |

**Acceptance criteria**

- ✅ Every conversion is a pure function `(input) -> Trace`, tested with no UI present.
- ✅ **The grand round-trip.** For 200 random NFAs bounded to 4 states and 2 symbols:
      `nfaToDfa` then `minimize` then `dfaToRegex` then `regexToENFA` then `epsilonElim` then `nfaToDfa`
      then `minimize` yields a DFA equivalent to the original. Bounds are mandatory — state elimination
      blows up RE size super-exponentially and an unbounded generator makes CI flaky.
- ✅ `minimize(minimize(D))` equals `minimize(D)`, and the state count matches an independently written
      partition-refinement implementation used only in tests.
- ✅ Subset construction on Hopcroft's 2^n bad case reaches the state cap and shows the "this is the
      point" explanation rather than hanging.
- ✅ Canonical state naming: running the same conversion twice produces byte-identical state ids.
- ✅ Every step's `narration` reads as a sentence a lecturer would say. No `"step 4"` — the
      `TraceBuilder` refuses a narration that is empty, lacks a final period, or carries placeholder text.
- ✅ Each conversion cites its Hopcroft 2e section in `Step.citation`, **checked against a printed
      copy** rather than from memory. The audit is in [docs/citations.md](docs/citations.md); it found
      four wrong citations, all now fixed — most seriously `equivalence` citing §4.1 (the pumping
      lemma) where it meant §4.4.2, and `stateElim` citing a theorem from §3.2.1, the one subsection
      this scheme explicitly excludes.
      `fa/regularGrammar.ts` alone cites nothing, and that is now a settled answer rather than a gap:
      Hopcroft 2e has no section on regular grammars, and the syllabus, lesson plan, question bank and
      all three model papers examine none. It is **enrichment under ADR-003** — demoted, not deleted.

**Exit gate.** The grand round-trip is green. It exercises the whole Module 1-2 engine and catches nearly
every conversion bug; nothing proceeds until it passes.

---

### ✅ P0.4 — RE playground, closure lab, text search · 1 week · ships **v0.3, Modules 1-2 complete** — **DONE**

**Deliverables**

- **RE playground**, four panels in sync: the RE, its parse tree (proving precedence star > concat >
  union), its Thompson epsilon-NFA, its minimal DFA, and a live accepted/rejected string list. Changing
  the RE updates everything.
- **Closure lab** (`fa/closure.ts`): pick two machines and an operation — union, intersection, complement,
  difference, reversal, homomorphism, inverse homomorphism — and watch the construction built step by
  step. Includes a small `h: Sigma -> Delta*` editor.
- **Text search** (`fa/textSearch.ts`, Hopcroft 2.4): keywords to search NFA to keyword-recognising DFA,
  paste text, watch the head scan with matches highlighted. State counts shown side by side.
- **UNIX RE vs formal RE** docs page (3.3.1) with a live "does this extended feature keep the language
  regular?" toggle. **Lexical analysis demo** (3.3.2): token REs to combined NFA to DFA, tokenise a
  snippet with longest-match, showing which rule won at each position.
- **Applied preset gallery**, drawn from the department's own case-study list: email and URL validation,
  keyword search, a digital lock, a traffic-light controller, password and mobile-number validators, and
  log-file pattern extraction. Each is a working machine plus a one-paragraph framing. These are the
  assigned case studies, so shipping them as presets makes the 25% activity component tractable — and
  they carry the department's Bloom's and SDG tags, which are what the accreditation paperwork wants.

**Acceptance criteria**

- ✅ RE precedence tested against a table of at least 30 expressions with their intended parse — 42,
      each written out fully bracketed. It found a real printer defect: a symbol that is itself an
      operator printed unescaped, so an alphabet containing `*` produced output that would not parse back.
- ✅ All four playground panels stay in sync under rapid typing — debounced, no stale renders. Sync is
      structural rather than careful: `buildPlayground` derives all four from one string in one call, so
      a render pairing the tree for one expression with the machine for another is unrepresentable.
- ✅ The intersection product construction is verified against brute-force membership on all strings up
      to length 10, for 50 random machine pairs.
- ✅ Complement is refused with an explanation when the input is an NFA, and offers the one-click
      "convert to a complete DFA first" fix.
- ✅ Text search on keywords `{web, ebay}` with input `webay` reports the textbook's match set — both
      overlapping occurrences. Getting there fixed two real bugs: the DFA accepted only when the whole
      prefix was a keyword, and the head-scan path read one step too many from the trace.
- ✅ Text search reuses `simulateDFA` and the automaton renderer. No bespoke simulator. Meeting this
      properly meant widening the keyword DFA's alphabet to cover the *text*, not just the keywords —
      a machine that cannot read a full stop cannot be run over a sentence.

**Exit gate.** Modules 1 and 2 are completely covered. v0.3 is a genuinely useful tool for half the course.

---

## 4. P1 — Modules 3-5, grading, and the notebook

**Goal of P1:** complete, correct, syllabus-mapped coverage of BTOCH503, plus the Python package.
**Target: 10.5 weeks.**

---

### P1.1 — Equivalence, compare view, exercise bank · 1 week · ships **v0.4, auto-graded practice**

**Goal.** The feature no DSA visualiser can have. Regular language equivalence is decidable, so the app
grades construction problems exactly and returns a counterexample instead of a score.

**Deliverables**

- `fa/equivalence.ts` hardened: `areEquivalent(A, B)` returns either `{ equivalent: true, proof }` or
  `{ equivalent: false, witness: "0110", side: "A accepts, B rejects" }`. **Precondition: both inputs are
  determinized and completed first** — BFS over the product guarantees the shortest witness only for
  complete DFAs.
- **Compare view**: two machines side by side, the witness entered into both, traces stepped in lockstep
  until they diverge, with the divergence step highlighted in both.
- `grade/`: `languageEquivalence.ts`, `traceMatch.ts` (first divergent step), `sample.ts` (bounded checks).
- `/practice` with the exercise bank as data in `apps/web/content/exercises/`.

```ts
interface Exercise {
  id: string
  topic: TopicId                     // NOT a module number — see architecture.md §8
  prompt: string
  kind: "construct-dfa" | "construct-nfa" | "construct-re" | "construct-cfg"
      | "construct-pda" | "construct-tm" | "convert" | "minimize" | "mcq" | "pumping"
      | "explain"                    // CL2 prose questions — graded manually or by rubric
  reference: unknown
  grader: "language-equivalence" | "trace-match" | "sample" | "exact" | "manual"
  hints: string[]                    // revealed progressively
  marks: 5 | 6 | 8                   // the real SEE / question-bank mark values
  bloom: "CL1" | "CL2" | "CL3" | "CL4"
  co: "CO1" | "CO2" | "CO3" | "CO4" | "CO5"
  part?: "a" | "b" | "c"             // position in a 20-mark SEE question (6/6/8)
  source?: string                    // "Model QP Set 1, Q5c" | "Question Bank #34" | "Dec-2024"
}
```

**The exercise bank already exists as content.** The course folder ships an 82-question bank
(`QUESTION BANK TOC.docx`), three model question paper sets, and two past papers, every item already
tagged with marks, Bloom's level, CO and module. P1.1's job is therefore **encoding and authoring
reference answers**, not inventing prompts — a materially different and smaller task than the PRD
assumed.

Two caveats on import: a number of bank questions read "Convert the given NFA to DFA" with the machine
supplied only as an embedded image, so those need their reference machine authored by hand before they
can be graded; and CL2 "explain" questions (roughly a third of the bank) have no automatable grader and
should be marked `grader: "manual"` rather than faked.

**A composed-question view is worth building here**, since it is nearly free once exercises carry
`marks` and `part`: assemble a, b and c into a full 20-mark question and let a student attempt a whole
SEE question under time. That is the form they are actually examined in.

**Grading behaviour by kind:** construct-DFA/NFA/RE grade by language equivalence, feedback is the witness
string *and* the trace showing where the student's machine goes wrong on it — never a structural or
state-count comparison, so any correct machine passes. Convert and minimize grade by trace-match, reporting
the first divergent step. CFG, PDA and TM grade by bounded sample, with the "sample check, not a proof"
caveat shown prominently, because CFG equivalence is undecidable and saying so is itself a lesson.

**Minimality is a bonus, never a failure:** "correct, and minimal (4 states)" versus "correct, but 6 states
— the minimal DFA has 4, see the minimization stepper."

**Acceptance criteria**

- [ ] `areEquivalent` agrees with brute-force membership comparison over all strings up to length 12, for
      500 random machine pairs.
- [ ] The witness returned is the **shortest** distinguishing string, asserted in tests.
- [ ] A student DFA with a different but correct structure grades as correct.
- [ ] A student DFA wrong on exactly one long string receives that string as feedback.
- [ ] Sample-based graders display the "not a proof" caveat prominently in the UI.
- [ ] At least 60 exercises ship, spanning every module of the default scheme, sourced from the
      department question bank and model papers with `source` recorded on each.
- [ ] Exercises key on `TopicId`; a CI test fails on any exercise pointing at an unknown topic.
- [ ] Every auto-graded exercise has a reference answer that its own grader marks correct — a CI test
      runs the reference through the grader, so a broken reference cannot ship.
- [ ] `marks`, `bloom` and `co` are present on every exercise; a CI test fails on a missing tag.
- [ ] The bank can be filtered to **CIE-I scope** (first 40-50% of the syllabus) and **CIE-II scope**
      (85-90%), because that is when the internal tests actually fall.
- [ ] Divisible-by-K exercises are generated from the P0.2 preset family over base and divisor, not
      hand-written one at a time.

---

### P1.2 — The pumping lemma game · 1 week · ships v0.5

**Goal.** The pumping lemma is taught as a formula when it is actually a two-player game with alternating
quantifiers. Make the alternation literal and it becomes obvious.

**Deliverables**

- `pumping/oracles.ts`: real decidable membership for every preset language. No pattern matching.
- `pumping/regular.ts` and `pumping/cfl.ts`: the adversary strategies.
- Game UI for both directions. Student proves non-regularity: the engine picks the pumping length `n`;
  the student picks `w` in L with `|w| >= n`; the engine picks the decomposition `w = xyz` with
  `|xy| <= n` and `|y| >= 1`, choosing the split that is *hardest* for the student; the student picks
  `i >= 0`; the engine checks whether `xy^i z` is in L. **Reverse mode**: the student defends a regular
  language and the engine attacks, which teaches why the lemma does not prove regularity.
- The CFL variant with `w = uvxyz`, `|vxy| <= n`, `|vy| >= 1`.
- Presets with difficulty ratings: `{0^n 1^n}`, `{ww}`, `{a^n b^n c^n}`, `{0^i : i prime}`, balanced
  parentheses, `{0^n 1^m : n <= m}`, and at least two languages that **are** regular so reverse mode has
  teeth.

**Acceptance criteria**

- [ ] Membership for every preset is decided by an oracle, not by pattern matching.
- [ ] The decomposition choice is genuinely adversarial: for a language where a naive `y = 0` split loses
      immediately, the engine does not choose it.
- [ ] The adversary's search over pumping indices is explicitly bounded, and the bound is reported.
- [ ] Winning a round emits a written proof paragraph in exam prose, exportable.
- [ ] Reverse mode correctly demonstrates that a regular language survives every pumping attempt.
- [ ] Every game session is a `Trace`, replayable and shareable.

---

### P1.3 — Grammars, derivations, parse trees · 2 weeks · ships v0.6

**Deliverables**

- `cfg/parse.ts`: plain-text BNF-ish input (`S -> a S b | ε`) to the `CFG` type, with positioned inline
  errors. Terminals and variables inferred, overridable.
- `cfg/derive.ts`, `cfg/parseTree.ts`, `cfg/ambiguity.ts`.
- `cfg/leftRecursion.ts` — **left recursion elimination** (§2.4). Immediate recursion
  `A -> Aα | β` becomes `A -> βA'`, `A' -> αA' | ε`; general recursion via the standard variable-ordering
  algorithm with substitution. The trace shows one step per variable in order: the substitutions performed
  into it, then the immediate elimination, with the new primed variable named canonically. Presets include
  the exam's own `E -> E+T | T; T -> T*F | F; F -> (E) | id`.
- **Derivation stepper**: leftmost or rightmost, sentential form as a token strip, applied production
  highlighted in the grammar. A bounded "derive this string" search mode that replays what it finds.
- **Parse tree builder**: the tree grows alongside the derivation, one node per applied production, the
  yield shown under the leaves so the tree-derivation correspondence (5.2.3-5.2.6) is visible rather than
  asserted.
- **Ambiguity detector**: bounded search for a string with two distinct leftmost derivations; display both
  parse trees side by side. Presets include the classic ambiguous expression grammar and its unambiguous
  rewrite (5.4.2), plus a docs note on inherent ambiguity (5.4.4), which is undecidable and therefore
  explainer-only.

**Acceptance criteria**

- [ ] `S -> a S b | ε` derives `aaabbb` in 4 leftmost steps with a correct parse tree.
- [ ] The ambiguity detector finds two parse trees for `id + id * id` in the classic grammar.
- [ ] For the unambiguous rewrite it reports **"no counterexample within bounds"** and never claims
      unambiguity.
- [ ] Every parse tree's yield equals the derived string, property-tested over 200 random grammars.
- [ ] Grammar parse errors carry a source position and all errors surface at once.
- [ ] Left recursion elimination on the exam's expression grammar produces the textbook answer, and the
      result has no left-recursive variable — checked structurally, not by eye.
- [ ] The transformed grammar is language-equivalent to the original on a bounded sample, for 100 random
      left-recursive grammars.
- [ ] The docs panel states plainly that elimination **introduces ε-productions**, and links to the P1.5
      ε-removal stage that clears them. The two transformations are taught in different modules and
      students routinely apply them in the wrong order.

---

### P1.4 — Pushdown automata · 1.5 weeks · ships **v0.7, Module 3 complete**

**Deliverables**

- `pda/simulate.ts`: the ID sequence `(q, w, gamma)` as three synced panels — state, remaining input,
  stack column — plus the ID sequence as a scrollable text log in textbook notation, because that is what
  students must reproduce in the exam. Nondeterministic runs show the branch tree, as NFA runs do.
- PDA editor with transitions labelled `a, X / YX` exactly as the textbook writes them.
- `pda/acceptance.ts`: final-state to empty-stack and back (6.2.3-6.2.4), animated — the new start state,
  the new bottom marker, the epsilon-transitions added.
- `pda/fromCFG.ts`: CFG to PDA (6.3.1).
- `pda/determinism.ts`: a DPDA checker reporting exactly which transition pairs violate the condition,
  plus docs for the DCFL / CFL / regular relationships (6.4).
- **Not** `pda/toCFG.ts` — enrichment, see §2.3.

**Acceptance criteria**

- [ ] A PDA converted final-state to empty-stack accepts the same 200-string sample as the original, and
      the reverse conversion likewise.
- [ ] `cfgToPDA(G)` simulated accepts exactly the strings `G` derives, over a random sample.
- [ ] The ID log is copy-pasteable and matches textbook notation on the worked example.
- [ ] The DPDA checker's reported violations are exactly the transition pairs that overlap.
- [ ] A nondeterministic PDA run renders its branch tree with dead branches flagged at death.

---

### P1.5 — CFL properties · 1 week · ships **v0.8, Module 4 complete**

**Goal.** The four-stage simplification pipeline must be performed in exact order, and getting the order
wrong is the most common lost-marks mistake in the subject. Showing the pipeline as a pipeline fixes it.

**Deliverables**

- `cfg/useless.ts`, `cfg/epsilonProd.ts`, `cfg/unitProd.ts`, `cfg/cnf.ts`, chained as four steppers with
  the grammar diffed at each stage:
  1. Useless symbols — compute **generating** (bottom-up), then **reachable** (top-down), highlighting
     each set as it grows, and **show why the order matters** by offering the wrong order and displaying
     the residual useless symbol it leaves behind.
  2. Epsilon-productions — nullable symbols, then expansion over subsets of nullable occurrences.
  3. Unit productions — the unit-pair graph, its transitive closure, the rewrite.
  4. Chomsky Normal Form — terminal isolation, then binarisation, with new variables named systematically.
- `cfg/closure.ts`: the CFL closure lab (7.3) — substitution, union, concatenation, star, reversal,
  **intersection with a regular language** as an animated PDA-times-DFA product, inverse homomorphism.
  Explicitly demonstrate the **non**-closures: give `L1 = {a^n b^n c^m}` and `L2 = {a^m b^n c^n}`, show
  both are CFLs, show the intersection is `{a^n b^n c^n}`, and link to the CFL pumping game proving it is
  not a CFL.
- CFL pumping lemma (7.2) wired to the P1.2 game.
- **Not** `cfg/cyk.ts` or `cfg/properties.ts` — enrichment, see §2.3.

**Acceptance criteria**

- [ ] The four-stage pipeline on the textbook's worked example reproduces the book's final CNF grammar,
      allowing for variable renaming, checked by language equivalence on a sample.
- [ ] Every stage preserves the language (minus epsilon where applicable), verified on a random string
      sample after each stage, for 100 random grammars.
- [ ] The wrong-order demo visibly leaves a useless symbol behind.
- [ ] The CFL-intersect-regular construction agrees with brute-force membership on a bounded sample.
- [ ] The docs panel lists the undecidable CFL questions with the reason, and claims nothing about them.

---

### P1.6 — Turing machines · 2 weeks · ships v0.9

**Deliverables**

- `tm/simulate.ts` and the TM editor: transitions drawn `a -> b, R` exactly as the textbook draws them.
  The tape is an infinite scrolling strip, with a user toggle between head-fixed and tape-fixed
  conventions because different lecturers teach different ones. Configurable blank symbol, step counter,
  halt/loop guard.
- ID log in textbook notation, copy-pasteable, beside the visual tape.
- **Programming techniques** (8.3), each a preset with its encoding explained: storage in the state
  (rendered as a compound label), multiple tracks (stacked tape rows), subroutines (a collapsible box).
- `tm/multitape.ts` (8.4.1-8.4.2): n tape strips and n heads, plus the **animated reduction to a single
  tape** — the multi-track encoding with head markers, and the running-time cost shown as a live counter,
  making the quadratic blow-up concrete rather than asserted.
- `tm/nondeterministic.ts` (8.4.4): branch tree plus the BFS-simulation-by-a-DTM explainer.
- `tm/gallery.ts`: binary increment, unary addition, `{0^n 1^n}`, palindrome checker, `{a^n b^n c^n}`,
  copy/duplicate, a small busy beaver (2- and 3-state), and a machine that provably does not halt on some
  input — which introduces 8.2.6 and sets up Module 5's second half.

**Acceptance criteria**

- [ ] Every gallery machine halts with the documented output within the documented step count, asserted
      in tests.
- [ ] A multitape machine and its single-tape reduction accept the same 100-string sample.
- [ ] The step guard stops at the cap with a clear message and an explicit "continue for N more" action.
- [ ] The ID log matches the textbook's notation character for character on the worked example.
- [ ] The non-halting gallery machine is labelled as such and does not hang the UI.

---

### P1.7 — Undecidability, hierarchy, syllabus index · 1 week · ships **v1.0, full syllabus coverage**

**Goal.** This content **cannot be simulated** — it is proof. The temptation is to skip it or to fake an
animation. Do neither.

**Deliverables**

- **The diagonalization table** (9.1.3): a scrollable grid, row *i* is TM *M_i*, column *j* is string
  *w_j*, cell is whether *M_i* accepts *w_j*. The diagonal is highlighted; a toggle flips it and shows why
  the flipped diagonal cannot be any row. Clicking a cell shows the encoding of that TM (9.1.2) and that
  string (9.1.1).
- **The reduction builder** (8.1.3): drag problem A onto problem B to construct A <= B, with the
  contradiction diagram drawn automatically. Presets: hello-world tester to halting, halting to L_u.
- **The language-class map for 9.2**: recursive inside RE inside all languages, with L_d, L_u and
  complements placed on it, and the closure results from the 9.2 exercises as an interactive table where
  clicking a cell shows the construction sketch or the counterexample.
- **`/hierarchy`**: nested containment rings, each clickable to reveal its machine model, grammar type,
  closure properties, pumping lemma and decision properties, each linking to the live tool. Canonical
  languages plotted as points in the correct ring, each clicking through to the proof that places it
  there. **The map is the navigation.**
- **`/syllabus`** and the scheme layer: `lib/topics.ts`, `lib/schemes/vtu-2022-bcs503.ts`, the derived
  breadcrumb on every tool page, and CO mapping.

**Acceptance criteria**

- [ ] Every topic in the default scheme resolves to a live link. A CI test walks the scheme and fails on
      any dead or missing target.
- [ ] The diagonalization table computes real cells for a real small TM enumeration, with a bounded step
      budget; cells exceeding it are marked "no answer within budget", which is itself the honest and
      instructive display.
- [ ] No page in this section claims to "simulate" an undecidable problem.
- [ ] Every explainer cites its Hopcroft 2e section.
- [ ] Adding a tool requires editing `catalog.ts` and `topics.ts` only — verified by adding one in review.

**Exit gate. v1.0 is the milestone that matters.** Complete, correct, syllabus-mapped coverage of BTOCH503 and BCS503 alike.
Ship it before anything in P2.

---

### P1.8 — Vyakarana, the Python package · 2 weeks · ships `vyakarana` 0.1

**Deliverables**

- **Day 1: the ADR-004 spike.** Decide where the engine executes in the Python path and record
  ADR-004-final **before** any public API is frozen. Everything else in this phase depends on the answer,
  because it determines whether `d.accepts(w)` is synchronous.
- `bridge/`: the anywidget React entry, bundled by `tsup` into `vyakarana/static/`.
- `vyakarana/`: the Python package per [documentation.md](documentation.md).
- Scoped, Preflight-disabled Tailwind build for the widget container.
- `_repr_mimebundle_` for automatic rendering on bare display.
- Bundle-freshness check script wired into CI.

**Acceptance criteria**

- [ ] ADR-004 is closed and recorded before the API freeze.
- [ ] `pip install` from a clean virtualenv renders a DFA in **Google Colab** with no Node toolchain
      present. Colab is a release criterion, not a nice-to-have — it is what students actually use.
- [ ] Renders correctly in Jupyter Notebook, JupyterLab, and VS Code notebooks.
- [ ] Every public Python method maps to an engine function; a CI test asserts the two API surfaces have
      not drifted.
- [ ] Widget CSS provably does not leak: a test notebook with custom host styling renders unchanged
      outside the container.
- [ ] `export_trace()` output validates against the same JSON schema the web app's traces use.
- [ ] A missing JS bundle raises a `RuntimeError` naming the expected path and the build command.
- [ ] The README status table for the Python package is accurate.

---

## 5. P2 — Enrichment and platform

Unsequenced. Pick by demand. **Nothing here starts before v1.0 ships.**

**Enrichment topics** (see §2.3) — build when a scheme needs them or when the teaching value justifies it.
CYK is the strongest candidate: it is standard at most other universities, and the
extract-the-parse-tree-from-the-table link is genuinely well worth showing.

- `cfg/cyk.ts` and `cfg/properties.ts` — CYK triangle, emptiness, infiniteness.
  **Note:** CYK at the 40-symbol cap is the worst case for trace size; verify against ADR-001's
  structural sharing before enabling it, or lower the cap.
- `pda/toCFG.ts` — the `[pXq]` construction.
- `regex/rij.ts` — the R(k)ij induction.
- `fa/properties.ts` — decision properties of regular languages.
- Formal proof and induction explainers (1.2, 1.4).

**Platform work**

- **JFLAP interoperability** (`io/jflap.ts`). Import and export `.jff` for FA, PDA and TM; drag-and-drop;
  a visible, non-silent report of anything that cannot be represented. Positioned as a convenience for
  lecturers with existing `.jff` files, **not** as an adoption strategy — the syllabus' 10-mark JFLAP lab
  activity is, in practice, a box-ticking exercise nobody engages with.
- **Browser IDE**: a textual machine DSL in Monaco with bidirectional text-diagram sync, then Pyodide plus
  Vyakarana running fully client-side. No server-side execution endpoint, ever.
- **Classroom layer**: per-topic progress, lecturer dashboard, per-exercise failure clustering
  ("18 of 40 students' DFAs fail on strings ending in 01" — a genuinely new teaching signal that falls
  out of witness strings for free).
- **Presentation mode**: chrome-free, large-type, keyboard-driven. Trivial to build, disproportionately used.
- **Predict-the-next-step quizzes**, generated automatically from any trace.
- **Share-by-link** for any machine or trace.
- `packages/cli` for grading pipelines.

---

## 6. Schedule and risk

| Phase | Contents | Est. | Ships |
|---|---|---|---|
| P0.1 | Monorepo, types, trace protocol, FA simulation, test harness | 1 wk | engine only |
| P0.2 | Renderers, editor, transport, multi-run table | 1.5 wks | **v0.1** |
| P0.3 | Module 1-2 conversions, minimization, grand round-trip | 1.5 wks | v0.2 |
| P0.4 | RE playground, closure lab, text search | 1 wk | **v0.3** |
| P1.1 | Equivalence, compare view, 60 exercises | 1 wk | **v0.4** |
| P1.2 | Pumping lemma game, both variants | 1 wk | v0.5 |
| P1.3 | CFG editor, derivations, parse trees, ambiguity, left recursion | 2 wks | v0.6 |
| P1.4 | PDA editor, ID simulator, acceptance conversions, CFG to PDA, DPDA | 1.5 wks | **v0.7** |
| P1.5 | Simplification pipeline, CNF, CFL closure lab | 1 wk | **v0.8** |
| P1.6 | TM editor, simulator, gallery, multitape, programming techniques | 2 wks | v0.9 |
| P1.7 | Undecidability explainers, hierarchy map, syllabus index | 1 wk | **v1.0** |
| P1.8 | Vyakarana: spike, bridge, package, Colab, PyPI | 2 wks | `vyakarana` 0.1 |
| P2 | Enrichment, JFLAP, IDE, classroom | open | v1.x |

**P0: 5 weeks. P1: 11 weeks. To v1.0: ~16 weeks.**

Still a week less than the PRD's original plan. ADR-003 removed roughly two weeks — PDA-to-CFG and CYK
were two of the most expensive builds in the project and neither is examinable — and left recursion
elimination adds half a week back.

**Risks worth naming.**

| Risk | Likelihood | Mitigation |
|---|---|---|
| The estimate is optimistic | High | It is. Phases ship independently; v0.1 is useful standing alone. Prefer shipping Modules 1-2 excellently over five modules shakily. |
| A wrong algorithm ships and a student loses marks | Medium | The worst outcome in the project. Oracle and property tests, the 90% gate, textbook-example tests. No conversion ships without its round-trip test. |
| Graph layout is ugly and the tool feels amateur | High | Budgeted explicitly in P0.2. Layered for generated machines, manual drag always available and always persisted. Evaluate `elkjs` in week 1, not week 10. |
| Branch-tree rendering confuses rather than clarifies | Medium | Prototype on paper before P0.2. Fall back to a stepped frontier-set view if it does not read well at 8+ branches. |
| The Python bridge diverges from the web engine | Medium | The engine is TypeScript only. ADR-004 must close before the API freezes, and an API-parity test runs in CI. |
| Scope creep back into the enrichment set | Medium | §2.1 is the fence. Enrichment work is P2 by definition, regardless of how interesting it looks mid-build. |

---

## 7. Open decisions

| # | Decision | Owner | Needed by |
|---|---|---|---|
| 1 | **ADR-004** — where the engine executes in the Python path. | Author + spike | P1.8 day 1 |
| 2 | **Hosting and auth.** v1.0 is anonymous with no login; the classroom layer in P2 is when auth becomes real. | Author | Before P2 |
| 3 | **Source-document conflicts** (§2, note). Teaching hours (40 vs 42), the CO-to-module mapping, and the Bloom's levels differ between the syllabus, the lesson plan and the model papers. Worth one clarification from the course faculty before the scheme config is frozen. | Author | Before P1.7 |

**Resolved**

- **Project name — `Tape-n-Trace`.** Fixed. It carries into the repo name, the package scope
  (`@tape-n-trace/engine`, `@tape-n-trace/ui`), the CLI binary `tnt`, the native file extension `.tnt`,
  and the DSL keyword namespace. The working folder has been renamed from `Track-n-trace` to
  `Tape-n-trace`, so `git init` picks up the right repo name from the directory.
- **Left recursion elimination — in scope**, built in P1.3. See §2.4.
- **Autonomous scheme config** — the autonomous syllabus has a section list identical to VTU 2022;
  `atria-2026-btoch503` is the default scheme and `vtu-2022-bcs503` ships alongside it.
