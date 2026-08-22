# Tape-n-Trace

**An interactive Theory of Computation workbench.** Draw a machine, run it, watch it move. Convert
between representations and watch the *construction* happen. Ask decidable questions and get answers with
evidence — including the shortest string on which two automata disagree.

Published as a web app, and as **Vyakarana**, a Python package that renders the same machines inline in
Jupyter and Colab.

---

## ⚠ What actually works today

**Modules 1–4 complete — v0.8.** Everything BTOCH503's first four modules examine is built, verified
and on screen: simulation, all the conversions, closure operations, keyword search, regular
expressions, the practice bank, the pumping game, grammars, pushdown automata, and now the
simplification pipeline to Chomsky Normal Form and the CFL closure lab. Module 5 has not started.

| Area | Status | Notes |
|---|---|---|
| Engine — trace protocol, validation, canonical naming | ✅ P0.1 | frozen shared snapshots, every violation reported |
| Engine — FA simulation (DFA / NFA / ε-NFA) | ✅ P0.1 | branch tree for NFAs, explicit ε-closure steps |
| Renderers — automaton, branch tree, tables, parse tree | ✅ P0.2–0.3 | pure SVG, theme-aware, screen-reader labelled |
| Web app — simulate and draw a machine | ✅ P0.2 | 7 presets, editor, multi-run table, export |
| Engine — Module 1–2 conversions | ✅ P0.3 | subset, ε-elimination, minimisation, state elimination, Thompson |
| Web app — conversion steppers | ✅ P0.3 | six `/convert` routes on one shared shell |
| Engine — closure operations and keyword search | ✅ P0.4 | Hopcroft §4.2 and §2.4 |
| Web app — RE playground, closure lab, text search | ✅ P0.4 | four synced panels, case studies, UNIX-RE explainer |
| Practice — exact grading, compare view, 61 exercises | ✅ P1.1 | any correct machine passes; witness + lockstep compare |
| Pumping lemma game | ✅ P1.2 | attack and defend, CFL variant, exportable proof prose |
| Grammars — derivations, ambiguity, left recursion | ✅ P1.3 | parse trees grow with the derivation |
| PDA — simulator, editor, acceptance conversions, CFG→PDA, DPDA checker | ✅ P1.4 | ID log in textbook notation, branch tree for guesses |
| CFL properties — simplification pipeline, CNF, closure lab | ✅ P1.5 | the book's safe order, the grammar diffed per stage, the intersection that fails |
| Engine — TM | ❌ Not started | P1.6 |
| Vyakarana (Python package) | ❌ Not started | P1.8 |

P0.3’s exit gate is the **grand round-trip**: 200 random NFAs pushed through
`subset → minimise → state elimination → Thompson → ε-elimination → subset → minimise`, with the DFA that
comes out required to accept exactly the language that went in. It is green.

**776 tests**: 602 engine (96.8% line coverage, CI-gated at 90%), 43 renderer, 131 web app.

Every citation the engine emits has been checked against a printed copy of Hopcroft 2e rather than
written from memory — the audit, including six corrections and four deliberate divergences, is in
[docs/citations.md](docs/citations.md).

*This table is updated in the same commit as the feature it describes. A capability is never claimed here
before it is real — a rule this project inherits from a sibling whose docs advertised animations nothing
imported and a QuickSort that did not sort.*

---

## The idea

Theory of Computation is the subject where a visualiser has the highest teaching leverage and the worst
existing tooling. Three reasons:

**The objects are already diagrams.** A DFA *is* a labelled graph. A parse tree *is* a tree. A Turing
machine *is* a tape and a head. Students are asked to reason about pictures, examined on pictures, and
taught with static pictures on a blackboard that cannot move.

**The hard part is the transformation, not the object.** Nobody fails this subject because they cannot
draw a DFA. They fail because subset construction, state elimination, and CNF conversion are multi-step
mechanical procedures whose intermediate artifacts a textbook prints only as a final answer.

**Correctness is decidable, so feedback can be exact.** Language equivalence for regular languages is
decidable. The app can tell a student *"your DFA is wrong, and the shortest string it disagrees with the
answer on is `0110`"*. No data-structures visualiser can do that, and it is what turns this from a demo
into something a department can assign homework on.

---

## Three verbs

Everything in the product is one of exactly three things. This taxonomy is what keeps the codebase from
sprawling into forty unrelated pages.

**SIMULATE** — run a machine on an input and produce the sequence of configurations. Nondeterminism is
rendered as a **tree, not a path**: every live branch at once, dead branches greyed at the step they died,
the accepting path highlighted at the end.

**TRANSFORM** — convert one representation into another, animated as the sequence of intermediate
artifacts a student would write on paper. The subset table fills row by row. States are eliminated one at
a time. ε-productions are struck out in sequence.

```
RE ──Thompson──▶ ε-NFA ──ε-elimination──▶ NFA ──subset──▶ DFA ──table-filling──▶ min-DFA
 ▲                                                         │
 └──────────────── state elimination ─────────────────────┘

Regular grammar ⇄ NFA          CFG ──ε-prod──▶ ──unit-prod──▶ ──useless──▶ CNF
CFG ──▶ PDA                    PDA(final state) ⇄ PDA(empty stack)
CFG ──left-recursion──▶ CFG    multitape TM ──▶ single-tape TM
```

**DECIDE** — answer a question about a language, and show the evidence. Is `w ∈ L(M)`? Is `L(A) = L(B)`,
and if not, what is the shortest string that separates them? Are states `p` and `q` equivalent?

---

## Everything returns a trace

The single most important rule in the codebase: **a function that returns only an answer is incomplete,
even when the answer is correct.** Every simulation, conversion and decision procedure returns a `Trace` —
an ordered, serialisable list of steps, each carrying one sentence of exam-language narration, a set of
semantic highlights, and the full artifact state.

The UI is a pure function of `(trace, stepIndex)`. Nothing else. That one constraint buys, for free and
forever: transport controls written once and reused everywhere; replay from a JSON file with no engine on
the client; predict-the-next-step quizzes generated from any algorithm; grading by diffing a student's
trace against a reference and reporting the first divergent step; and the Python notebook path, where
Python ships a machine and React renders the trace that comes back.

See [architecture.md](architecture.md) §5 for the protocol.

---

## Repository layout

```
packages/engine     THE CORE. Pure TypeScript. Zero React, zero DOM. ≥90% coverage, CI-gated.
packages/ui         Pure renderers. Props in, SVG out. Never calls the engine.
packages/cli        [P2] grading pipelines
apps/web            Next.js 15. Routes, controllers, docs panels.
bridge/             anywidget React entry, bundled by tsup
vyakarana/          the Python package
docs/adr/           architecture decision records
```

Full tree and rationale in [architecture.md](architecture.md) §3.

---

## Documentation

| Document | What it covers |
|---|---|
| [architecture.md](architecture.md) | Boundaries, the trace protocol, core types, ADRs, prohibitions |
| [phases.md](phases.md) | Build order, per-phase acceptance criteria, schedule, open decisions |
| [documentation.md](documentation.md) | The Vyakarana Python API (specification — not yet released) |
| [docs/citations.md](docs/citations.md) | Every Hopcroft 2e citation, verified against the printed edition |
| `prd (2).md` | The original product requirements document |

---

## Syllabus

The default scheme is **BTOCH503 — Theory of Computation**, Atria Institute of Technology (autonomous),
semester V, 3 credits, AY 2026–27. Reference text: **Hopcroft, Motwani & Ullman, 2nd edition**.

| Module | Hours | Sections | CO | Covered by |
|---|---|---|---|---|
| 1 | 8 | 1.1, 1.5, 2.2–2.5 | CO1 | FA simulator, ε-closure, subset construction, text search |
| 2 | 8 | 3.1, 3.2 (except 3.2.1), 3.3, 4.1, 4.2, 4.4 | CO2 | RE playground, state elimination, closure lab, minimization, pumping game |
| 3 | 8 | 5.1, 5.2, 5.4, 6.1, 6.2, 6.3.1, 6.4 | CO3 | Grammar editor, derivations, parse trees, ambiguity, PDA simulator, CFG→PDA |
| 4 | 8 | 7.1, 7.2, 7.3 | CO4 | Simplification pipeline, CNF, CFL pumping game, CFL closure lab |
| 5 | 8 | 8.1–8.4, 9.1, 9.2 | CO5 | TM simulator, gallery, multitape, diagonalization and reduction explainers |

**VTU 2022 BCS503 ships as a second scheme** — its section list is identical, so it costs almost nothing
and serves every non-autonomous VTU college.

The syllabus is **data, not code** — one scheme-independent topic graph, one config file per institution.
Adding a university is a file in `apps/web/lib/schemes/`, not a code change.

**Why this tool, for this course specifically.** The course allocates **42 lecture hours, zero tutorial
hours, and 56 self-study hours**. More than half of a student's time with the subject is unsupervised and
unsupported. That is the gap the trace protocol exists to fill: someone working alone needs to see *why*
a step happened, not just that it did.

The department's own gap analysis names four problem areas, and they map onto the roadmap one to one:
difficulty visualising FA/RE conversions; difficulty constructing CFGs, parse trees and PDAs; weak grasp
of language classification and the pumping lemma; and limited practical exposure to Turing machines. Six
of the seven prescribed tutorial components — lexical analyser, pattern matching, balanced-parentheses
PDA, CFG syntax validation, TM string processing, and language classification — are existing planned
features.

**Deliberately out of scope for v1.0**, because the published syllabus excludes them: PDA→CFG (6.3.2),
CYK and CFL decision properties (7.4), the R⁽ᵏ⁾ᵢⱼ construction (3.2.1), decision properties of regular
languages (4.3), and the formal-proof sections (1.2, 1.4). They remain in the topic graph as enrichment
and are scheduled after v1.0. Post's Correspondence Problem and P/NP are absent from the scheme entirely.

---

## Roadmap

| Ships | Contents |
|---|---|
| **v0.1** | A usable DFA/NFA simulator — editor, branch trees, transport controls, multi-run table |
| v0.2 | All Module 1–2 conversions, minimization, the grand round-trip property test |
| **v0.3** | RE playground with four synced panels, closure lab, text search — Modules 1–2 complete |
| **v0.4** | Equivalence checker, lockstep compare view, 60 auto-graded exercises |
| v0.5 | The pumping lemma game, both variants |
| v0.6 | Grammar editor, derivations, parse trees, ambiguity detector, left recursion elimination |
| **v0.7** | PDA editor, ID simulator, acceptance conversions, CFG→PDA — Module 3 complete |
| **v0.8** | Simplification pipeline, CNF, CFL closure lab — Module 4 complete |
| v0.9 | TM editor, simulator, gallery, multitape, programming techniques |
| **v1.0** | Undecidability explainers, Chomsky hierarchy map, syllabus index — **full syllabus coverage** |
| `vyakarana` 0.1 | The Python package, verified in Colab |
| v1.x | Enrichment topics, JFLAP import, browser IDE, classroom layer |

Roughly 16 weeks to v1.0 for one developer working with a coding agent. The estimate is optimistic, which
is why phases ship independently — v0.1 is useful standing alone. Prefer shipping Modules 1–2 excellently
over five modules shakily.

Detail and acceptance criteria in [phases.md](phases.md).

---

## Contributing

Read [architecture.md](architecture.md) before writing code. These rules are enforced by lint and CI, and
violating them is a defect regardless of whether tests pass:

- The engine imports no React, no Next, and never touches the DOM.
- Every algorithm returns a trace, not just a result.
- No component exceeds ~300 lines, and no component both computes and renders.
- State naming in conversions is canonical and deterministic — same input, byte-identical output.
- No documentation claims a capability the code lacks, including the table at the top of this file.
- Nothing asserts that a language "is regular" or a grammar "is unambiguous" from a bounded search.
  Bounded results are always reported as bounded: *"no counterexample found up to length 12."*
- No algorithm is reimplemented in Python. The engine is TypeScript, once.
- No server-side arbitrary-code execution endpoint. Ever.

---

## Prior art

[JFLAP](https://www.jflap.org/) is the canonical academic tool and has been since the late 1990s — Java
desktop, comprehensive, and the source of the de-facto `.jff` interchange format, which this project
imports. [Automata Tutor v3](https://arxiv.org/abs/2005.01419) demonstrated that automated grading and
feedback for automata exercises genuinely helps students. [Automatarium](https://github.com/automatarium/automatarium)
is the closest modern web editor in spirit.

The gap: a workbench where simulation, transformation *and* decision procedures are all traceable step by
step; where every trace is data that can be replayed, quizzed and graded; and where the same engine runs
inside a Jupyter notebook. Nothing above does all four.

---

## Related

Sibling project: [Stack-n-Flow / Pratyaksha](https://github.com/ShivamMalge/Stack-n-Flow) — the same
architecture applied to data structures and algorithms. The engine-first monorepo layout, the
renderer/controller/docs triad, and the scoped Tailwind widget build are all lessons learned there first.
