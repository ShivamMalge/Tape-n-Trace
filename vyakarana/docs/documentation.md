# Vyakarana — Python Library Documentation

> **Status: released as `vyakarana` 0.1** — `pip install vyakarana`. Everything below is real and tested:
>
> | Works today | Since |
> |---|---|
> | `DFA`, `NFA`, `ENFA` — construct, validate, simulate, convert, minimise, compare | 0.0.1 |
> | `RegularExpression` — parse tree, Thompson, minimal DFA, matching | 0.0.1 |
> | `CFG` — derivations, ambiguity (bounded, and says so), the CNF pipeline, → PDA | 0.0.2 |
> | `PDA` — simulation with the ID log, acceptance conversions, determinism | 0.0.2 |
> | `TM` — simulation with the step guard, multitape → single tape, the gallery | 0.0.2 |
> | The notebook widget in Colab, JupyterLab, Notebook, VS Code, `nbconvert` | 0.1.0 |
>
> The per-environment evidence is [docs/environments.md](../../docs/environments.md); the plan that
> built it is [phases-vyakarana.md](../../phases-vyakarana.md).

Companion documents: [README.md](../../README.md) · [architecture.md](../../architecture.md) · [phases.md](../../phases.md) · [phases-vyakarana.md](../../phases-vyakarana.md) — how this gets built

---

## 1. What Vyakarana is

Vyakarana is the Python face of the Tape-n-Trace engine. It lets you build a DFA, NFA, regular
expression, context-free grammar, PDA or Turing machine in a notebook cell and render it — live,
animated, and correct — inline in Jupyter, JupyterLab, VS Code notebooks, or Google Colab.

```python
from vyakarana import NFA

NFA.from_regex("(0|1)*01").to_dfa()      # renders the subset-construction stepper
```

**The name.** *Vyakarana* (व्याकरण) is the Sanskrit science of grammar. Pāṇini's *Aṣṭādhyāyī* is the
ancestor of every formal grammar in this syllabus — its rewrite rules predate Chomsky by some
twenty-five centuries. It is the sibling of `pratyaksha`, the same author's DSA notebook library.

### 1.1 The design contract

**The engine stays in TypeScript. Python never reimplements an algorithm.**

Python builds the machine object, hands it to the bundled JS engine, and receives a `Trace` back. There
is exactly one subset construction in this project, one CNF conversion, one equivalence checker — and
they are the same ones the web app runs. A CI test asserts the two API surfaces have not drifted.

This is not a stylistic preference. Two implementations of subset construction means two sets of bugs,
and the one that disagrees with the web app is the one a student will hit the night before an exam.

---

## 2. Installation

```bash
pip install vyakarana
```

The JS bundle ships as package data inside the wheel. **No Node toolchain is required on your machine.**

If the bundle is missing — which should only happen in a broken development checkout — importing raises
a `RuntimeError` naming the expected path and the command that builds it. It never fails silently or
degrades to a blank widget.

**Supported environments** (all are release criteria for 0.1, not aspirations):

| Environment | Notes |
|---|---|
| Google Colab | The one students actually use. Blocking for release. |
| JupyterLab 4+ | |
| Jupyter Notebook 7+ | |
| VS Code notebooks | |
| `nbconvert` / headless | Value-returning calls work; widgets render as a static fallback image. |

---

## 3. Quickstart

```python
from vyakarana import DFA

d = DFA(
    states={"q0", "q1"},
    alphabet={"0", "1"},
    transitions={
        ("q0", "0"): "q1", ("q0", "1"): "q0",
        ("q1", "0"): "q0", ("q1", "1"): "q1",
    },
    start="q0",
    accepting={"q0"},
)

d                       # renders the diagram inline
d.run("0110")           # renders the animated run with transport controls
d.accepts("0110")       # -> True   (a plain value, no rendering)
```

A bare object at the end of a cell renders. A method that answers a question returns a value. A method
that *does* something — a conversion, a simulation — renders the process and returns the result, so
calls chain:

```python
d.to_regex()                     # renders state elimination, returns a RegularExpression
d.minimize()                     # renders table-filling, returns a DFA
d.minimize().to_regex()          # renders both steppers in order
```

### 3.1 Where the engine executes — decided

**ADR-004 is closed (2026-08-24): the package embeds V8 via `mini-racer` and every value-returning
call is synchronous.** `d.accepts("0110")` returns a plain `bool` — there is no `await` anywhere in
this API, including under `pytest` and `nbconvert` with no frontend attached. Rendering still goes
through `anywidget` to the browser; under Pyodide the binding uses the browser's own JS engine instead
of the embedded one. The measurements, the options not chosen, and the fallback plan are recorded in
architecture.md ADR-004; the spike that produced them is `spikes/adr-004/spike.py`. Every signature in
§5 is the synchronous form it always showed — now by decision rather than by assumption.

---

## 4. The rendering model

```
Python object ──serialise──▶ engine ──▶ Trace ──anywidget traitlet──▶ React renderer
```

Python owns the machine. The engine owns the algorithm. React owns the pixels. Python never sends
animation instructions — only state. The renderers are the *same components the web app uses*, imported
from `packages/ui`, not a second Python-side implementation.

Widget state is exposed as traitlets, all synced:

| Trait | Meaning |
|---|---|
| `payload` | the machine or grammar being displayed |
| `trace` | the trace being replayed, if any |
| `step` | the current step index — writable, so you can drive playback from Python |
| `options` | theme, speed, layout mode |

```python
run = d.run("0110")
run.step = 3          # jumps the widget to step 3
run.step              # -> 3
```

**CSS isolation.** The widget's Tailwind build is scoped to a `.vyakarana-container` class with Preflight
disabled, because `anywidget` injects CSS into the host notebook document. Your notebook's own styling is
not repainted. This is verified by a test that renders into a notebook with custom host styling and
asserts nothing outside the container changed.

---

## 5. API reference

Types below use `Set[str]` and `Dict` loosely; the package accepts any iterable and normalises. Every
constructor validates and raises `ValidationError` listing **all** problems, not the first.

### 5.1 `DFA`

```python
DFA(states, alphabet, transitions, start, accepting)
```

| Parameter | Type | Meaning |
|---|---|---|
| `states` | `Set[str]` | Q |
| `alphabet` | `Set[str]` | Σ |
| `transitions` | `Dict[Tuple[str, str], str]` | δ, keyed `(state, symbol)` |
| `start` | `str` | q0 |
| `accepting` | `Set[str]` | F |

**Methods**

| Method | Renders | Returns |
|---|---|---|
| `accepts(w)` | — | `bool` |
| `run(w)` | animated run, transport controls | `Simulation` |
| `run_all(strings)` | — (the multi-run table lands with the bridge viewer's growth) | `Dict[str, bool]` |
| `minimize()` | table-filling stepper | `DFA` |
| `to_regex()` | state-elimination stepper | `RegularExpression` |
| `complement()` | construction | `DFA` |
| `union(other)`, `intersection(other)`, `difference(other)` | product construction | `DFA` |
| `reverse()` | construction | `NFA` |
| `equivalent_to(other)` | lockstep compare view | `EquivalenceResult` |
| `is_minimal()` | — | `bool` |
| `validate()` | — | `List[ValidationError]` |
| `export_trace()` | — | `dict` |
| `to_json()` / `DFA.from_json(d)` | — | native `.tnt` format |

`complement()` requires a **complete** DFA. If the machine has missing transitions, it raises with an
explanation and points at `.completed()`, which adds the trap state explicitly.

### 5.2 `NFA` and `ENFA`

```python
NFA(states, alphabet, transitions, start, accepting)     # transitions: Dict[(str, str), Set[str]]
ENFA(...)                                                 # epsilon transitions keyed with None
```

Epsilon is `None`, never the string `"ε"` — the same decision the engine makes (architecture.md ADR-002).
This keeps an alphabet that legitimately contains the character `ε` representable.

```python
n = ENFA(
    states={"q0", "q1", "q2"},
    alphabet={"a", "b"},
    transitions={("q0", None): {"q1"}, ("q1", "a"): {"q2"}},
    start="q0",
    accepting={"q2"},
)
n.epsilon_closure("q0")     # renders the BFS, returns {"q0", "q1"}
```

**Additional methods beyond `DFA`'s**

| Method | Renders | Returns |
|---|---|---|
| `to_dfa()` | subset-construction stepper, table filling row by row | `DFA` |
| `epsilon_closure(state)` | — | `Set[str]` |
| `remove_epsilon()` | per-state closure stepper | `NFA` |
| `NFA.from_regex(re)` | Thompson construction, bottom-up | `ENFA` |
| `NFA.for_keywords(words)` | the text-search NFA (Hopcroft 2.4) | `NFA` |

Nondeterministic runs render the **branch tree**, not a single path — every live branch simultaneously,
dead branches greyed at the step they died, the accepting path highlighted at the end. Students' biggest
NFA misconception is that the machine "guesses correctly"; showing all branches at once fixes it.

### 5.3 `RegularExpression`

```python
RE("(0|1)*01")
```

Operator precedence is star, then concatenation, then union — as Hopcroft 3.1.3 defines it.

| Method | Renders | Returns |
|---|---|---|
| `parse_tree()` | the AST, proving precedence | `ParseTree` |
| `to_enfa()` | Thompson construction | `ENFA` |
| `to_dfa()` | Thompson, then subset, then minimize | `DFA` |
| `matches(w)` | — | `bool` |
| `playground()` | the Thompson construction (the four synced panels land with the bridge's next phase) | widget |

`playground()` is the single best conceptual view in the project — one language, four representations,
all updating together.

### 5.4 `CFG`

```python
g = CFG.from_text("S -> a S b | ε")

CFG(variables, terminals, productions, start)
```

`from_text` accepts BNF-ish input with `|` alternation and `ε` (or `epsilon`, or an empty right-hand
side) for the empty string. Terminals and variables are inferred and can be overridden. Parse errors
carry a source position and all surface at once.

| Method | Renders | Returns |
|---|---|---|
| `derive(w, order="leftmost")` | derivation stepper + growing parse tree | `Derivation` |
| `parse_tree(w)` | the tree, with its yield under the leaves | `ParseTree` |
| `is_ambiguous(max_length=10)` | — (the two trees come back on the result; the side-by-side view lands with the bridge's growth) | `AmbiguityResult` |
| `remove_useless()` | generating then reachable, each set highlighted as it grows | `CFG` |
| `remove_epsilon()` | nullable symbols, then expansion | `CFG` |
| `remove_unit()` | the unit-pair graph and its transitive closure | `CFG` |
| `to_cnf()` | **the full four-stage pipeline**, grammar diffed at each stage | `CFG` |
| `to_pda()` | CFG to PDA construction | `PDA` |
| `generates(w)` | — | `bool` |
| `sample(n, max_length)` | — | `List[str]` |

**`is_ambiguous` never returns `True` for unambiguity.** It returns a result that is either
`Ambiguous(witness, tree_a, tree_b)` — a proof — or `NoCounterexample(max_length=10)`, which is *not* a
proof of unambiguity, because the question is undecidable. The repr says so:

```python
>>> g.is_ambiguous(max_length=10)
NoCounterexample(max_length=10)
  No string up to length 10 has two distinct leftmost derivations.
  This is NOT a proof of unambiguity — ambiguity of a CFG is undecidable.
```

### 5.5 `PDA`

```python
PDA(states, input_alphabet, stack_alphabet, transitions,
    start, start_stack, accepting, accept_by="finalState")
```

Transitions are keyed `(state, read, pop)` mapping to a set of `(next_state, push)` pairs, where `read`
and `pop` may be `None` for epsilon. `push` is a tuple with the **leftmost symbol becoming the new stack
top**; `()` means pop only.

| Method | Renders | Returns |
|---|---|---|
| `run(w)` | the branch tree of IDs; the textbook ID log via `.id_log()` | `Simulation` |
| `accepts(w)` | — | `bool` |
| `to_empty_stack()` / `to_final_state()` | the conversion, animated | `PDA` |
| `is_deterministic()` | the violating transition pairs, if any | `DeterminismResult` |
| `to_cfg()` | *(enrichment, post-v1.0)* | `CFG` |

The ID log is copy-pasteable in textbook notation, because that is what students must reproduce in the
exam:

```python
>>> p.run("aabb").id_log()
(q0, aabb, Z0) ⊢ (q1, abb, AZ0) ⊢ (q1, bb, AAZ0) ⊢ (q2, b, AZ0) ⊢ (q2, ε, Z0) ⊢ (q3, ε, Z0)
```

### 5.6 `TM`

```python
TM(states, input_alphabet, tape_alphabet, blank, transitions,
   start, accepting, rejecting=None, tapes=1)
```

Transitions map `(state, read_tuple)` to `(next_state, write_tuple, move_tuple)` with moves in
`{"L", "R", "S"}`. For a single-tape machine the tuples are length 1.

| Method | Renders | Returns |
|---|---|---|
| `run(w, max_steps=10000)` | the tape strip with a moving head, plus the ID log | `Simulation` |
| `accepts(w, max_steps=10000)` | — | `bool` or `Halted.NO` if the guard fires |
| `to_single_tape(show_run=None)` | pass an input as `show_run` to watch the reduction simulate it | `TM` |
| `tape_view(convention="head-moves")` | toggles head-fixed vs tape-fixed rendering | widget |

```python
from vyakarana.gallery import binary_increment, palindrome, busy_beaver_3

binary_increment.run("$1011")    # renders the tape, the head, the ID log — Exercise 8.2.3's $N input
```

The gallery ships binary increment, unary addition, `{0ⁿ1ⁿ}`, a palindrome checker, `{aⁿbⁿcⁿ}`,
copy/duplicate, small busy beavers, and one machine that provably does not halt on some input — clearly
labelled, so it introduces the halting discussion rather than hanging your kernel.

**The step guard never lies.** If a machine does not halt within `max_steps`, you get an explicit
"no halt within N steps" result and an offer to continue — never a silent `False`.

### 5.7 Result objects

```python
@dataclass
class EquivalenceResult:
    equivalent: bool
    witness: str | None        # the SHORTEST distinguishing string, when not equivalent
    side: str | None           # "A accepts, B rejects"
    def compare(self): ...     # renders both traces in lockstep, divergence highlighted
```

```python
>>> a.equivalent_to(b)
EquivalenceResult(equivalent=False, witness='0110', side='A accepts, B rejects')
```

The witness is guaranteed shortest — BFS over the product construction gives that for free, and it is
asserted in the engine's tests. This is the single most useful debugging output in the whole project:
you do not get told *that* your machine is wrong, you get told the shortest string it is wrong on.

Other results follow the same shape: `Simulation` (with `.step`, `.id_log()`, `.accepted`),
`Derivation`, `ParseTree` (with `.yield_()`), `AmbiguityResult`, `DeterminismResult`, `ValidationError`.

### 5.8 Traces

Every operation produces a trace with the same schema the web app uses.

```python
run = d.run("0110")
t = run.export_trace()

t["kind"]                 # "simulate.dfa"
t["steps"][3]["narration"]
t["steps"][3]["snapshot"]
t["result"]
t["meta"]["counters"]     # transitionsTaken, statesCreated, ...
```

```python
import json
json.dump(d.to_dfa().export_trace(), open("subset.json", "w"))
```

That file replays in the web app at `/replay`, feeds a grader, or becomes a figure in your notes. A
trace is data, not a rendering — which is the entire point of the architecture.

---

## 6. Options and theming

```python
import vyakarana as vy

vy.options(theme="dark", speed=1.5, layout="layered")

d.run("0110", theme="light")     # per-call override
```

| Option | Values | Default |
|---|---|---|
| `theme` | `"light"`, `"dark"`, `"auto"` | `"auto"` (follows the notebook) |
| `speed` | float, 0.25 to 4.0 | `1.0` |
| `layout` | `"layered"`, `"manual"` | `"layered"` |
| `max_steps` | int | `10000` |

---

## 7. Size limits

The same guards the engine enforces (architecture.md §9). They are pedagogical, not performance
tuning — hitting the subset-construction cap *is* the lesson of Hopcroft 2.3.6.

| Object | Cap | Behaviour |
|---|---|---|
| FA states | 200 | warns, offers reachable-only mode |
| Subset construction output | 4096 states | hard stop, with the explanation |
| PDA / TM steps | 10,000 | stops, offers to continue |
| CFG productions | 300 | warns |
| Derivation depth | 100 | stops, reports as bounded |

Every guard that fires is visible in `trace["meta"]["truncated"]`. A silent cap would be a defect.

---

## 8. Troubleshooting

**Nothing renders; I see `<vyakarana.DFA object at 0x...>`.** The widget frontend did not load. In
JupyterLab check that `anywidget` is installed in the *same* environment as the kernel. In VS Code,
reload the window. In Colab this should not happen — if it does, it is a bug worth reporting.

**`RuntimeError: JS engine bundle not found at .../static/engine.js`.** You are on a development
checkout without a built bundle. Run `pnpm -F @tape-n-trace/bridge build`. This error never appears
from a `pip install`.

**My notebook's styling changed after importing vyakarana.** It should not — this is the exact bug the
scoped Preflight-disabled build exists to prevent. Report it with your notebook theme; it is a
regression against a test.

**`accepts()` in a script or under pytest.** Works, synchronously — the engine runs in an embedded V8
(§3.1), and no frontend is involved in a value. Only *rendering* needs a notebook.

**The diagram is unreadable — states overlap.** Try `layout="manual"` and drag, or reduce the machine.
Layered layout is tuned for machines produced by conversions; hand-drawn graphs with many crossing edges
may still need manual positioning.

---

## 9. Development

```bash
git clone <repo> && cd tape-n-trace
pnpm install
pnpm -F bridge build            # builds vyakarana/static/
pip install -e ./vyakarana
pytest
```

The bundle must be rebuilt whenever `packages/engine` or `packages/ui` changes. CI runs a
bundle-freshness check that fails if `vyakarana/static/` is stale relative to its sources — a lesson
already paid for once in the sibling project.

**The API parity test** walks every public method on every Vyakarana class and asserts a corresponding
engine export exists. It fails on drift in either direction: a Python method with no engine function
behind it, or an engine function the Python surface forgot to expose.

---

## 10. What Vyakarana will not do

- **Reimplement the engine in Python.** See §1.1. If you want an algorithm, it lives in TypeScript.
- **Emit animation instructions.** Python sends state; React decides how to move.
- **Execute arbitrary user code server-side.** There is no server.
- **Be a general-purpose automata library for production use.** It is a teaching instrument with
  deliberate size caps. If you need to determinize a 10,000-state NFA, this is the wrong tool and it
  will tell you so.
