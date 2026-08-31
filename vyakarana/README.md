# Vyakarana

The Python face of [Tape-n-Trace](https://github.com/ShivamMalge/Tape-n-Trace), an interactive
Theory of Computation workbench built for BTOCH503 (Hopcroft, Motwani & Ullman, 2nd edition).
Build a machine in a notebook cell; the bundled TypeScript engine computes the trace and the web
app's own renderers draw it inline — the diagram, the tape, the ID sequence, with transport controls.

```python
from vyakarana import DFA

d = DFA(states={"a", "b"}, alphabet={"0", "1"},
        transitions={("a", "0"): "b", ("a", "1"): "a", ("b", "0"): "a", ("b", "1"): "b"},
        start="a", accepting={"b"})
d.accepts("011")   # True — an odd number of 0s
d.run("011")       # the run, step by step, in the cell
```

Works in Colab, JupyterLab, Jupyter Notebook, VS Code and under `nbconvert` — no Node, no
extension to enable. Every value-returning call is synchronous: the engine runs in an embedded V8
(`mini-racer`), the same engine the web app runs in the browser.

**Covers:** `DFA`, `NFA`, `ENFA`, `RegularExpression`, `CFG`, `PDA`, `TM`, and a gallery of the
textbook's machines — simulation, the subset construction, minimisation, state elimination,
Thompson's construction, derivations and ambiguity, the CNF pipeline, PDA acceptance conversions,
the multitape reduction. Python never reimplements an algorithm: it builds the object, the engine
computes, a `Trace` comes back.

**Honest by construction.** A search that stops at a bound says so (`NoCounterexample` is not a
proof of unambiguity); a Turing machine that runs past the move cap returns `Halted.NO` — falsy,
but never `False` — and offers to continue; the ID sequence is the textbook's, character for
character.

Documentation: [vyakarana/docs/documentation.md](https://github.com/ShivamMalge/Tape-n-Trace/blob/main/vyakarana/docs/documentation.md).
Licence: MIT.
