<p align="center">
  <img src="apps/web/public/logo.svg" alt="Tape-n-Trace" width="140">
</p>

<h1 align="center">Tape-n-Trace</h1>

<p align="center">
  <strong>An interactive Theory of Computation workbench.</strong><br>
  Draw a machine, run it, and watch every step — in the language your exam expects.
</p>

<p align="center">
  <a href="https://tape-n-trace.vercel.app"><strong>Open the app →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://pypi.org/project/vyakarana/">Python package <code>vyakarana</code></a>
  &nbsp;·&nbsp;
  <a href="https://colab.research.google.com/github/ShivamMalge/Tape-n-Trace/blob/main/docs/colab-gate.ipynb">Try it in Colab</a>
</p>

<p align="center">
  <a href="https://github.com/ShivamMalge/Tape-n-Trace/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ShivamMalge/Tape-n-Trace/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://pypi.org/project/vyakarana/"><img alt="PyPI" src="https://img.shields.io/pypi/v/vyakarana?label=vyakarana&color=3B63C4"></a>
  <img alt="Python 3.10+" src="https://img.shields.io/badge/python-3.10%2B-3B63C4">
  <img alt="MIT" src="https://img.shields.io/badge/licence-MIT-211E1A">
</p>

---

Tape-n-Trace covers a full university course in the theory of computation — finite automata, regular
expressions, grammars, pushdown automata, Turing machines and undecidability — as **twenty-seven
instruments** that all work the same way. Every tool runs its algorithm step by step and writes down
what it did: one sentence of textbook language per step, the diagram updated, the working shown.
Nothing here hides its working, and nothing here reports more than it knows.

It follows *Hopcroft, Motwani & Ullman, Introduction to Automata Theory, Languages, and Computation*
(2nd edition), and every step cites the section it comes from.

## Using the site

Open **[tape-n-trace.vercel.app](https://tape-n-trace.vercel.app)**. The top bar is the course's five
modules; press one and a strip opens with that module's tools. Every tool page has the same shape, so
once you have used one you have used them all:

| On the page | What it does |
|---|---|
| **Try chips** | One press loads a textbook example — `0011`, `aabb`, `(0+1)*01` — and runs it. |
| **The diagram** | The machine, with the current state ringed in blue and the transition just taken lit. |
| **The transport** | ◀ Play ▶, a scrub bar, and a speed slider. Step through at your own pace, or press Play and watch. Arrow keys work too. |
| **Narration** | One sentence per step, in exam language, with the Hopcroft section beside it. |
| **The ID sequence** | The run written the way an answer sheet wants it — `q₀0011 ⊢ Xq₁011 ⊢ …` — with a Copy button. |
| **The verdict** | Green **Accepted**, red **Rejected**, or amber **Stopped** when a machine ran past its step budget. Three states, never two: a run that was cut short is never reported as a rejection. |
| **Docs cards** | Why the construction works, folded away until you want it, each with its citation. |

There is a light and a dark theme (the switch is at the top right), and every page works on a phone.

## What's inside

### Module 1 · Automata
- **DFA / NFA simulator** — seven textbook machines. Nondeterminism is drawn as a **tree, not a path**: every live branch at once, dead branches greyed at the step they died, the accepting branch lit at the end.
- **Draw a machine** — click to add states, drag to connect them, and see every problem with the machine listed as you work rather than one at a time.
- **Classroom board** — for the lecture theatre. Draw with a pen or a finger on a dark board: a loop becomes a state, a stroke between two states an arc, a loop inside a state makes it accepting. Pick each arc's symbols from the chips, then press **Simulate** and the transition table slides in with the run. Nothing is guessed from handwriting.
- **Text search** — keywords to a guessing NFA to a recognising DFA, scanning real text with overlapping matches, both machines side by side so the cost of guessing is visible.
- **Strings and languages** — Σ*, powers, ε, and every string up to a length you choose.

### Module 2 · Equivalence & conversion
- **NFA → DFA** — the subset construction, the table filling row by row and the new state appearing as a set.
- **ε-NFA → NFA**, **minimise a DFA** (table filling with the distinguishable pairs marked as they are found), **DFA → regular expression** (state elimination) and **regular expression → ε-NFA** (Thompson), all on one stepper.
- **Regular expression playground** — four views of one expression kept in step: the parse tree, the Thompson ε-NFA, the minimal DFA and the strings it accepts.
- **Closure lab** — union, intersection, difference, complement, reversal and homomorphisms, each built as a construction rather than stated as a fact.

### Module 3 · Properties & proofs
- **The pumping lemma game** — the lemma as the two-player game it really is. You choose the string, the engine plays the hardest decomposition, you pump. Win the round and the proof writes itself, ready to copy. A defend mode shows why the lemma cannot prove a language regular; a CFL variant pumps `v` and `y` together.
- **Practice** — the department's question bank, sixty-one exercises graded **exactly**: any correct machine passes, and a wrong one is answered with the shortest string it gets wrong, both machines run on it side by side. Prose questions say "marked by hand" rather than pretending.
- **The hierarchy of language classes** — the whole course on one picture, each ring opening onto its machine, grammar, closure properties and pumping lemma.

### Module 4 · Grammars & pushdown automata
- **Grammars** — type a grammar, derive a string, and watch the parse tree grow with the derivation; the ambiguity detector shows two trees for one string when it finds them, and says how far it looked when it does not.
- **PDA simulator and editor** — the instantaneous description `(q, w, γ)` as three synced panels, the branch tree for every guess, the ID sequence written out; a determinism check that names the overlapping pairs.
- **Acceptance conversions** — final state ↔ empty stack, and **grammar → PDA** (the one-state construction), each run on real inputs afterwards.
- **Simplification and CNF** — ε-productions, unit productions, useless symbols, then Chomsky normal form, in the one order that is safe, the grammar diffed at every stage.
- **CFL closure lab** — union, concatenation, star, reversal, substitution, and the intersection that fails.

### Module 5 · Turing machines & undecidability
- **Turing machine simulator** — the chapter's machines on a tape that scrolls under a fixed head or a head that walks a fixed tape, the ID sequence in §8.2.3's notation. A machine that does not halt is stopped at a stated budget and **says so** — never reported as rejecting.
- **Build a Turing machine** — type δ one move per line; the diagram, the checks and the run follow.
- **Many tapes to one** — Theorem 8.9 animated, the 4n + 2k cost of Theorem 8.10 counted live.
- **Undecidability** — the diagonalization table with every cell a real machine run under a step budget, the reduction builder that refuses a reduction pointed the wrong way, and where each language lives.

## In a notebook: `vyakarana`

The same engine, from Python, drawing in the cell.

```bash
pip install vyakarana
```

```python
from vyakarana import DFA, NFA, CFG, gallery

d = DFA(states={"a", "b"}, alphabet={"0", "1"},
        transitions={("a", "0"): "b", ("a", "1"): "a", ("b", "0"): "a", ("b", "1"): "b"},
        start="a", accepting={"b"})
d.accepts("011")            # True — an odd number of 0s
d.run("011")                # the run, step by step, with transport controls

NFA(...).to_dfa()           # the subset construction, animated
CFG.from_text("S -> a S b | a b").derive("aabb")
gallery.zeros_ones.run("0011").id_log()   # 'q₀0011 ⊢ Xq₁011 ⊢ … ⊢ XXYYBq₄B'
```

Works in Colab, JupyterLab, Jupyter Notebook, VS Code and under `nbconvert`, with no Node and no
extension: the TypeScript engine runs inside Python in an embedded V8, so every call returns
synchronously. Python never reimplements an algorithm — it builds the object, the engine computes, a
trace comes back and the web app's own renderers draw it. The API is documented in
[vyakarana/docs/documentation.md](vyakarana/docs/documentation.md).

## How it works

**Everything returns a trace.** Every simulation, conversion and decision procedure returns an ordered,
serialisable list of steps — each with one sentence of narration, a set of highlights, and the full state
of the artifact being built. The screen is a pure function of `(trace, stepIndex)`. That single rule is
what makes the transport controls work identically everywhere, lets a notebook replay a trace with no
engine on the client, and lets the grader compare a student's trace against a reference step by step.

**The engine is one TypeScript package with no UI in it** — ~715 tests, 97% line coverage, and a
round-trip property test that pushes random NFAs through every conversion and back and requires the same
language to come out. The renderers are pure SVG. The web app and the notebook widget share both.

**It does not overclaim.** A bounded search reports its bound (*"no counterexample up to length 10"*), a
capped run reports the cap, and no document in this repository describes a feature that does not exist.

The design is written up in [architecture.md](architecture.md); the citations were checked against a
printed copy of the textbook, and the audit is in [docs/citations.md](docs/citations.md).

## Run it locally

```bash
pnpm install
pnpm --filter @tape-n-trace/web dev      # http://localhost:3000
pnpm test                                 # engine, renderers, web app
```

For the Python package from a checkout: `pnpm -F @tape-n-trace/bridge build` then
`pip install -e ./vyakarana` (tests: `pytest vyakarana/tests`).

```
packages/engine     the algorithms and the trace protocol — TypeScript, no React, no DOM
packages/ui         the renderers — props in, SVG out
apps/web            the Next.js site
bridge/             the notebook widget (anywidget), bundled into the Python package
vyakarana/          the Python package
docs/               citations audit, environment record, the Colab gate, brand
```

## Documentation

| Document | What it covers |
|---|---|
| [architecture.md](architecture.md) | Boundaries, the trace protocol, core types, decisions, prohibitions |
| [vyakarana/docs/documentation.md](vyakarana/docs/documentation.md) | The Python API |
| [docs/citations.md](docs/citations.md) | Every Hopcroft 2e citation, verified against the printed edition |
| [docs/environments.md](docs/environments.md) | Where the notebook widget has been verified, and how to release |
| [phases.md](phases.md) · [phases-vyakarana.md](phases-vyakarana.md) · [phases-ui.md](phases-ui.md) | How it was built, phase by phase, with each gate's evidence |

## The course

Built for **BTOCH503 — Theory of Computation** (Atria Institute of Technology, semester V), with VTU's
**BCS503** as a second scheme; the syllabus is data, so another university is a config file, not a code
change. The course gives students 42 lecture hours and 56 hours alone with the subject — the tool is for
the 56.

## Prior art

[JFLAP](https://www.jflap.org/) is the canonical academic tool; [Automata Tutor](https://arxiv.org/abs/2005.01419)
showed that exact feedback on automata exercises helps students; [Automatarium](https://github.com/automatarium/automatarium)
is the closest modern editor. Tape-n-Trace's addition is that simulation, conversion *and* decision are
all traceable step by step, every trace is data that can be replayed and graded, and the same engine runs
in a notebook.

Sibling project: [Stack-n-Flow](https://github.com/ShivamMalge/Stack-n-Flow), the same architecture for
data structures and algorithms.

## Licence

MIT.
