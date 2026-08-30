# Build Phases — Vyakarana

> **Status: V0 closed 2026-08-24** — ADR-004 is decided (embedded V8 via `mini-racer`, synchronous API).
> V1 onward not started. This is the execution plan for the Python package, which
> [phases.md](phases.md) carries as the single row **P1.8** and which is too large to plan at that
> resolution.

Companion documents: [documentation.md](documentation.md) — the target API · [architecture.md](architecture.md) §10.2 and ADR-004 · [phases.md](phases.md) · [README.md](README.md)

---

## 1. How to use this document

Same rules as [phases.md](phases.md), with one substitution. There, *the engine leads*: no UI phase began
before the engine functions it renders existed and were tested. Here, **the bridge leads, and the spike
leads the bridge.** No Python signature is frozen before ADR-004 is closed, because the answer decides
whether every value-returning call in the package is `d.accepts(w)` or `await d.accepts(w)` — and that is
not a detail that can be retrofitted across a published API.

**Rules:**

1. Do not start phase *N+1* while any acceptance criterion of phase *N* is unmet. The gate is binary.
2. Every criterion below is testable, and names how it is tested. "Renders correctly" is not a criterion;
   "renders in Colab from a clean `pip install`, evidenced by a dated notebook committed to `docs/`" is.
3. The README status table and [documentation.md](documentation.md)'s status banner are updated in the
   same commit as the feature. This package's documentation currently describes an API that does not
   exist — that is honest only while the banner at its top says so.
4. Estimates assume one developer working with a coding agent, and are held in §8 against the evidence
   that every estimate in phases.md ran about ten times pessimistic. **Do not assume that repeats here**;
   §8 explains why this phase is differently shaped.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done and gated

---

## 2. Status tracker

Updated in the same commit as the work it describes. ✅ done and pushed · 🔨 in progress · ⬜ not started.

| Phase | Ships | Status | Notes |
|---|---|---|---|
| V0 ADR-004 spike | a decision, no code | ✅ | 2026-08-24 · `mini-racer` (V8), sync API; spike committed under `spikes/adr-004/` |
| V1 The bridge | `bridge/` + `vyakarana/static/` | 🔨 | 2026-08-24: all automated gates green (6 tests, typecheck, lint, freshness, 205 KB bundle); awaiting the one human check — open `bridge/notebooks/v1-smoke.ipynb` in JupyterLab and look |
| V2 The Python core | `vyakarana` 0.0.1, unreleased | ⬜ | Regular languages only: DFA, NFA, ENFA, RE |
| V3 The rest of the surface | `vyakarana` 0.0.2, unreleased | ⬜ | CFG, PDA, TM, gallery, result objects |
| V4 Packaging and the four environments | `vyakarana` 0.1.0rc | ⬜ | Colab is the blocking one |
| V5 Release | **`vyakarana` 0.1** | ⬜ | PyPI, docs move, README table |

---

## 3. What is being built

One sentence: **a `pip install`-able Python package that builds a machine in a notebook cell and renders
the Tape-n-Trace engine's trace of it, inline, in Colab.**

The design contract, from [documentation.md](documentation.md) §1.1, is the thing every phase below is
arranged to protect:

> **The engine stays in TypeScript. Python never reimplements an algorithm.**

Python builds the object, hands it to the bundled JS engine, and receives a `Trace`. There is exactly one
subset construction in this project. Two implementations means two sets of bugs, and the one that
disagrees with the web app is the one a student hits the night before an exam.

**Done means:** a student opens Colab, runs `!pip install vyakarana`, types six lines, and watches the
subset construction happen — with no Node on the machine, no extension to enable, and no notebook
restart.

---

## 4. Why this needs its own plan

Every phase in [phases.md](phases.md) from P0.1 to P1.7 was more TypeScript, over an engine that already
existed, behind a test harness that already worked, verified by `vitest` in a repository that was already
green. That is why the estimates collapsed the way they did.

This phase shares none of that:

| | P0.1 – P1.7 | Vyakarana |
|---|---|---|
| Language | TypeScript | Python **and** TypeScript, across a boundary |
| Toolchain | already configured | new: build backend, wheel, package data, `pytest` |
| Distribution | `next build` | a wheel on PyPI, immutable once published |
| Verification | `vitest`, in-repo | partly **manual**, in four notebook hosts we do not control |
| Blocking unknown | none | **ADR-004 is open**, and it shapes the public API |
| Cost of being wrong | edit and re-run | a published version number cannot be recalled |

The last row is the one that matters. Everything before this shipped behind a URL and could be corrected
by pushing. A wheel on PyPI is a promise, and `vyakarana 0.1` with an API that has to change in 0.2
is a worse outcome than `vyakarana 0.1` that covers only regular languages and says so.

**Two artifacts the P1.8 acceptance criteria assume, which do not exist yet.** Both are called out where
they land, and neither is hard — but neither is free, and planning at one row hid them:

- **A trace JSON Schema.** P1.8 requires `export_trace()` to "validate against the same JSON schema the
  web app's traces use". There is no such schema. The engine has `serialise`/`deserialise` and a
  `tnt-trace/1` wire format, and the shape is enforced by TypeScript types and `assertTraceInvariants` —
  neither of which a Python test can read. Writing it is a **V2** deliverable.
- **`docs/engine-contract.md`.** architecture.md §3 lists it as "the trace protocol, authoritative" and
  `docs/` contains only `citations.md`. The parity test needs a machine-readable engine surface, which is
  a related but separate artifact — a build-time manifest, see **V1**.

---

## 5. The phases

### V0 — The ADR-004 spike · 1 day, timeboxed · ships a decision

**Goal.** Close ADR-004 with evidence, and record ADR-004-final **before** any Python signature is
written. Nothing else in this document may start ahead of it except V1.

**The question, stated precisely.** Rendering is not in doubt: it always goes through `anywidget` to the
browser, in every environment, whichever option wins. The question is only what happens to a
value-returning call — `d.accepts("0110")`, `g.generates("aabb")`, `d.is_minimal()` — **when no frontend
is attached**, which is the case under `pytest`, under `nbconvert`, and in a plain script.

**The options.** ADR-004's table, restated with what each one actually costs.

| Option | Sync API | Headless | Real cost |
|---|---|---|---|
| Round-trip through the notebook frontend | No — `await` | **No** | Free. Works in every notebook, including Colab. Dies under `pytest` and `nbconvert` |
| Embed a native JS runtime (`quickjs`, `py_mini_racer`) | Yes | Yes | A binary wheel per platform, and a dependency whose maintenance we do not control |
| Engine compiled to WASM, run under `wasmtime-py` | Yes | Yes | Pure-Python wheels on every platform; one more build step; needs the engine to build to WASM (Javy or a QuickJS-WASM host) |
| Pure-Python reimplementation of predicates | Yes | Yes | **Violates architecture.md §2 and §14.** Last resort, and gated forever after |

**What the spike must actually produce.** Not an opinion — four measurements:

- For each of the top three options, a throwaway script that answers `accepts("0110")` for a two-state
  DFA, run in three places: a JupyterLab cell, a `pytest` test, and `nbconvert`. Record which return a
  value, which raise, and which hang.
- Wheel availability and install time for the candidate dependency on Linux (Colab's platform) and on
  the developer's Windows machine. A dependency that needs a compiler on `pip install` fails §3's
  "done means" and is disqualified regardless of how well it runs.
- Added wheel size. The package ships the JS bundle already; a runtime that triples the download is a
  real cost to a student on a phone tether.
- Whether the option has a story for the P2 browser IDE, where Pyodide runs the *Python* in the browser
  and a native extension will not load.

**Acceptance criteria**

- [x] ADR-004 in [architecture.md](architecture.md) is rewritten from `[OPEN]` to a decision, with the
      measurements above recorded — including the numbers for the options **not** chosen, so the next
      person can see the trade rather than the conclusion.
- [x] [documentation.md](documentation.md) §3.1 is replaced by the outcome, and every value-returning
      signature in §5 is corrected to match if the answer is `await`. *(The answer is sync; §5 stood.)*
- [x] A committed spike script reproduces the decisive measurement in one command:
      `python spikes/adr-004/spike.py`, plus the same measurements as `pytest` and under `nbconvert`
      (`spikes/adr-004/headless.ipynb`). The spike also caught and fixed the engine's unconditional
      `TextEncoder` use, which would have crashed `export_trace()` in any embedded runtime.
- [x] If the answer is the pure-Python fallback … — **not applicable**: the fallback was not taken,
      and remains forbidden.

> **Timebox.** One day. If the top three options are all still open at the end of it, take the
> round-trip option, ship `await`, and record *that* as the decision with the reason — an `await` that
> ships beats a synchronous API that does not. The fallback is chosen deliberately, not by drift.

---

### V1 — The bridge · 2 days · ships `bridge/` and a built `vyakarana/static/`

**Goal.** A React bundle that takes a trace and draws it, inside a notebook, using the *same* renderers
the web app uses. No Python API yet — the phase is finished when a hand-written trace renders.

This is the one phase with **no dependency on V0**, because rendering goes to the browser either way. If
the spike stalls, build this.

**Deliverables**

- `bridge/` — the `anywidget` React entry, importing renderers from `packages/ui` and *nothing* from
  `apps/web`. Bundled by `tsup` into `vyakarana/static/`.
- The four synced traitlets of [documentation.md](documentation.md) §4: `payload`, `trace`, `step`,
  `options`. `step` is writable from Python, which is what makes `run.step = 3` work.
- **Scoped, Preflight-disabled Tailwind** on a `.vyakarana-container` class. `anywidget` injects CSS into
  the host notebook document, and this bug has already been paid for once in Pratyaksha.
- A **build-time engine manifest**: `bridge` emits the list of engine exports it bundles, as JSON, into
  `vyakarana/static/engine-manifest.json`. This is what makes V3's parity test possible without a Python
  test parsing TypeScript.
- The build backend decision, recorded: **`hatchling` + `hatch-jupyter-builder`** is the recommendation,
  because it is `anywidget`'s own documented path and it solves "build the JS before the wheel" rather
  than leaving it to a developer's memory.

**Acceptance criteria**

- [~] A hand-written `simulate.dfa` trace, pasted into a notebook cell, renders with working transport
      controls in JupyterLab. *(Evidenced headless: the same bundle renders the same hand-written trace
      with a working transport under jsdom — `bridge/test/render.test.tsx` — and the committed
      `bridge/notebooks/v1-smoke.ipynb` executes end to end under nbconvert with real anywidget.
      Remaining: a human opens it in JupyterLab and looks, per this plan's own evidence rule.)*
- [x] Setting `step` from Python moves the widget; reading it back returns what the widget shows.
      *(jsdom: `model.set('step', 2)` re-renders to step 2; dragging the transport writes the trait and
      calls `save_changes`. Notebook: `w.step = 2` reads back 2 under nbconvert.)*
- [x] **CSS does not leak** — asserted structurally, which is stronger than a styled test notebook:
      `bridge/test/css-scope.test.ts` parses the emitted stylesheet and fails on any selector that does
      not begin (or, for the theme-attribute forms, end) with `.vyakarana-container`, naming the escapee.
      One deviation from this phase's text, recorded: there is no Tailwind to scope — the design system
      is the shared `tokens.css`, and it is that file the build scopes.
- [x] The bundle imports from `packages/ui` and `packages/engine` only. Enforced twice: the
      `no-restricted-imports` override on `bridge/**` in `eslint.config.js`, and the build itself walks
      esbuild's metafile and throws if any bundled input came from `apps/web`.
- [x] `pnpm -F @tape-n-trace/bridge build` produces `vyakarana/static/` (widget.js 205 KB minified with
      React bundled, widget.css, engine-manifest.json with all 227 engine exports), and
      `bridge/check-fresh.mjs` exits non-zero when `static/` is missing or older than `bridge/src`,
      `packages/ui/src` or `packages/engine/src`. Wired into CI in V4.

---

### V2 — The Python core · 3 days · ships `vyakarana` 0.0.1, unreleased

**Goal.** The regular-language half of [documentation.md](documentation.md) §5, end to end, with the
trace contract pinned down on both sides of the boundary.

**Deliverables**

- `vyakarana/` package skeleton: `__init__.py`, the widget class, `options()`, `ValidationError`.
- `DFA`, `NFA`, `ENFA`, `RegularExpression` — constructors, normalisation of loose iterables,
  serialisation to the engine's payload shape, and every method in §5.1–5.3.
- **Epsilon is `None`**, never `"ε"` — ADR-002, on the Python side too, so an alphabet containing the
  character ε stays representable.
- `ValidationError` raised with **every** problem found, not the first — matching the engine's `Result`
  contract, because a half-drawn machine with four faults should report four.
- `Simulation`, `EquivalenceResult`, `ParseTree` result objects (§5.7), including the `repr` that says a
  bounded result is bounded.
- **`docs/trace-schema.json`** — the JSON Schema for a trace, generated from the engine's types rather
  than hand-written, so it cannot drift. This is the artifact §4 flagged as missing, and both
  `export_trace()` and the web app validate against it.
- A `RuntimeError` on a missing bundle, naming the expected path *and* `pnpm -F bridge build`.

**Acceptance criteria**

- [ ] `DFA(...).accepts("0110")` returns a plain `bool`, in whatever form V0 decided.
- [ ] `d.to_dfa()`, `d.minimize()`, `d.to_regex()` each render their stepper and return the right object,
      so `d.minimize().to_regex()` chains.
- [ ] `export_trace()` output validates against `docs/trace-schema.json`, and so does a trace produced by
      the web app for the same machine. **One schema, both sides** — this is the criterion phases.md
      P1.8 states and the schema is now real.
- [ ] A DFA round-trips `to_json()` → `from_json()` unchanged, in the native `.tnt` format the web app
      reads.
- [ ] `pytest` passes with no notebook frontend attached.
- [ ] Importing with `vyakarana/static/` deleted raises the naming `RuntimeError`, asserted in a test.

---

### V3 — The rest of the surface · 3 days · ships `vyakarana` 0.0.2, unreleased

**Goal.** `CFG`, `PDA`, `TM`, the gallery, and the parity test that stops the two API surfaces drifting.

**Deliverables**

- `CFG` (§5.4) including `from_text`, `derive`, `to_cnf`, and `is_ambiguous` with the
  `NoCounterexample(max_length=10)` repr that **says it is not a proof of unambiguity**.
- `PDA` (§5.5) with `id_log()` copy-pasteable in textbook notation.
- `TM` (§5.6) with the step guard that reports "no halt within N steps" and offers to continue — never a
  silent `False`.
- `vyakarana.gallery` — the machines P1.6 built, re-exported, including the one labelled as not halting.
- **The API parity test.** Walks every public method on every class, resolves it through a declarative
  `_ENGINE_MAP`, and asserts against `engine-manifest.json` from V1. Fails on drift **in either
  direction**: a Python method with no engine function behind it, and an engine export the Python surface
  forgot.

**Acceptance criteria**

- [ ] Every method in [documentation.md](documentation.md) §5.4–5.6 exists and does what the table says,
      or the table is corrected in the same commit.
- [ ] The parity test passes, and is demonstrated to fail by deleting one entry from `_ENGINE_MAP`.
- [ ] `is_ambiguous` on an unambiguous grammar prints the three-line disclaimer verbatim. Bounded results
      are reported as bounded — architecture.md §2.6, which does not stop applying because the caller is
      Python.
- [ ] A TM that does not halt returns the guard result and does **not** hang the kernel, driven twice
      through the cap in a test.
- [ ] Nondeterministic runs render the branch tree, not a single path.

---

### V4 — Packaging and the four environments · 2 days · ships `vyakarana` 0.1.0rc

**Goal.** The wheel, and proof it works where students are.

**Deliverables**

- Wheel with `vyakarana/static/` as package data, built by `hatch-jupyter-builder` so the JS cannot be
  forgotten.
- Python version floor, pinned to what Colab actually ships, recorded with the date it was checked.
- Bundle-freshness check wired into CI, plus `pytest` on the CI matrix.
- `docs/environments.md` — a dated record of each environment, the version tested, and the evidence.

**Acceptance criteria**

- [ ] **Colab, from a clean runtime: `!pip install vyakarana` and a DFA renders, with no Node present.**
      This is a release criterion, not a nice-to-have — it is what students use.
- [ ] JupyterLab 4+, Jupyter Notebook 7+, and VS Code notebooks each render.
- [ ] `nbconvert` produces a document in which value-returning calls worked and widgets fell back to a
      static image rather than a blank box.
- [ ] Installing into a virtualenv with no compiler succeeds on Linux and Windows.
- [ ] CI fails when `static/` is stale.

> **On the Colab gate.** It cannot be automated from this repository, and pretending otherwise would be
> the exact failure this project's documentation rules exist to prevent. It is evidenced by a notebook
> committed under `docs/`, carrying the date, the Colab Python version, and the installed
> `vyakarana` version. A criterion checked by a human is still a criterion; one checked by nobody is not.

---

### V5 — Release · 1 day · ships **`vyakarana` 0.1**

**Deliverables**

- PyPI release, from a tag, with the wheel CI built rather than one built locally.
- [documentation.md](documentation.md) moves to `vyakarana/docs/`, loses its "specification, not
  released" banner, and gains a "what actually works today" table matching the README's.
- README status table: the Python package row goes from ❌ to ✅, with what it covers.
- [phases.md](phases.md)'s P1.8 row closed, pointing here.

**Acceptance criteria**

- [ ] `pip install vyakarana` from PyPI, in a fresh Colab runtime, renders a DFA.
- [ ] No document in the repository describes a Vyakarana capability that does not exist. Specifically:
      documentation.md's status banner is gone **because** the API is real, not because it was deleted.
- [ ] The version on PyPI matches the tag matches `__version__`.

---

## 6. Testing architecture

The engine is tested as a mathematical artifact ([architecture.md](architecture.md) §11). Vyakarana is
not a mathematical artifact — it is a **binding**, and bindings fail at their edges. Test the edges.

1. **Parity, not correctness.** Do not re-test subset construction here; it has 715 tests. Test that the
   Python call reaches the right engine function and returns its result unmangled.
2. **The boundary round-trip.** Python object → payload → engine → trace → Python. Assert the trace
   validates against `docs/trace-schema.json` and that the machine survives `to_json`/`from_json`.
3. **Headless.** Every value-returning call, under `pytest` with no frontend. This is ADR-004's question
   turned into a test suite, and it is the one that catches a regression in the decision.
4. **CSS isolation**, per V1 — a rendered notebook with hostile host styling, asserted.
5. **Notebook execution** — `nbmake` or `nbval` over a committed example notebook, so the quickstart in
   the documentation is executed by CI rather than trusted.
6. **The missing-bundle path**, which is the one error a user in a broken checkout will actually hit.

**CI gates for this package:** `pytest` · bundle freshness · the parity test · the trace schema check ·
lint on `bridge/`.

---

## 7. Prohibitions

From [architecture.md](architecture.md) §14 and [documentation.md](documentation.md) §10. These are
defects regardless of whether tests pass.

- **No algorithm is reimplemented in Python.** The one narrow exception path is gated in ADR-004 and, if
  ever taken, is confined to `accepts()` and compared against the engine on every CI run.
- **Python never emits animation instructions.** It sends state; React decides how to move.
- **No server-side arbitrary-code execution endpoint.** There is no server.
- **No silent failure.** A missing bundle raises. A guard that fires is visible in
  `trace["meta"]["truncated"]`. A blank widget is a bug, not a degraded mode.
- **No bounded result presented as a proof.** `NoCounterexample` is not unambiguity, in Python exactly as
  in the web app.
- Vyakarana is **not** a general-purpose automata library. It has deliberate size caps and says so.

---

## 8. Schedule, risk, and the cut

| Phase | Contents | Est. | Ships |
|---|---|---|---|
| V0 | The ADR-004 spike | 1 day | a decision |
| V1 | Bridge, traitlets, scoped Tailwind, engine manifest | 2 days | `vyakarana/static/` |
| V2 | Python core, regular languages, trace schema | 3 days | 0.0.1 |
| V3 | CFG, PDA, TM, gallery, parity test | 3 days | 0.0.2 |
| V4 | Wheel, four environments, CI | 2 days | 0.1.0rc |
| V5 | PyPI, docs, README | 1 day | **0.1** |
| | | **12 days** | |

**Against the deadline.** [phases.md](phases.md)'s note gives until **2026-08-31**; as of 2026-08-24 that
is seven days. Twelve days of estimate does not fit — and the estimates in phases.md ran roughly ten
times pessimistic, so on recent form it fits easily. **Do not plan on that.** §4 is the reason: every
phase that beat its estimate was TypeScript over a working engine behind a working harness. V0's answer
is not knowable in advance, V4's gate is in someone else's product, and V5 is irreversible.

**The cut, if the week runs out.** Ship a smaller Vyakarana, not a later one:

> **V0 → V1 → V2 → V4 → V5**, skipping V3. That is `vyakarana` 0.1 covering **regular languages only** —
> DFA, NFA, ε-NFA, regular expressions, and every conversion between them — installed from PyPI and
> rendering in Colab. CFG, PDA and TM become 0.2.

That cut is defensible in a way that a half-finished V3 is not. Modules 1 and 2 are what a student meets
first and what the notebook demo is for; a package that does them completely and says so beats one that
lists six machine types and renders four of them. It also keeps the API surface small at the moment it
becomes irreversible, which is the right time to have a small API surface.

**The risk that is not on the estimate.** ADR-004 going the wrong way *after* V2 is written. The
mitigation is the rule at the top of this document — signatures are not frozen before V0 closes — and
the reason V0 is timeboxed to a day with a stated fallback rather than left to run until it feels
resolved.

---

## 9. Open decisions

| # | Decision | Owner | By |
|---|---|---|---|
| 1 | ~~**ADR-004**~~ — **decided 2026-08-24**: embedded V8 via `mini-racer`, synchronous API. | Author + spike | ✅ V0 |
| 2 | **Build backend.** `hatchling` + `hatch-jupyter-builder` is the recommendation (anywidget's own path, and it makes forgetting the JS build impossible). Alternatives are `setuptools` with a custom command, or `uv`. | Author | V1 |
| 3 | **Python version floor.** Set by what Colab ships, checked and dated rather than assumed. | Author | V4 |
| 4 | ~~The name on PyPI~~ — **checked 2026-08-24: `vyakarana` is free** (PyPI returns 404). | Author | ✅ |
| 5 | **Whether `docs/engine-contract.md` is written** (architecture.md §3 lists it, `docs/` does not contain it) or the layout is corrected to match reality. The V1 manifest covers what the parity test needs either way. | Author | V1 |
