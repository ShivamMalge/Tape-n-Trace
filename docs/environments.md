# Vyakarana — the environments record

The dated evidence phases-vyakarana.md V4 requires: each environment, the version
tested, and how the result was obtained. A row is either evidenced or says it is
not — an unchecked box here is honest; a guessed ✅ is not.

**Package under test:** `vyakarana 0.1.0` (verified through rc1–rc3), the wheel built by
`python -m build --wheel vyakarana` (pure `py3-none-any`, ~0.2 MB, all four
`static/` files inside — `widget.js`, `engine.js`, `widget.css`,
`engine-manifest.json`).

**Where the wheel is:** GitHub pre-release
[`v0.1.0rc3`](https://github.com/ShivamMalge/Tape-n-Trace/releases/tag/v0.1.0rc3) (rc2 created 2026-08-31 after the author's Colab run of rc1 showed the
widget too large — diagrams now draw at half the web scale), wheel and sdist attached. The Colab gate installs it by URL; open the notebook straight from GitHub:
<https://colab.research.google.com/github/ShivamMalge/Tape-n-Trace/blob/main/docs/colab-gate.ipynb>.

**Python floor:** `requires-python = ">=3.10"`. Colab's documentation said Python 3.12.13
(checked 2026-08-30); the author's run on 2026-08-31 reported **Python 3.13.15 on Ubuntu 22.04**
(glibc 2.35), so 3.13 is now in the CI matrix and the floor keeps three versions of headroom.

## The record

| Environment | Date | Version tested | Result | Evidence |
|---|---|---|---|---|
| Windows 11, clean venv, no compiler | 2026-08-30 | Python 3.11.9, wheel install | ✅ install + full suite | `pip install <wheel>` into a fresh venv; the 48-test suite run from a neutral cwd against the site-packages install (`vyakarana.__file__` checked to be the wheel's), plus a headless smoke: `accepts`, the `minimize().to_regex()` chain, `CFG.derive`, the Fig 8.9 `id_log`, the `Halted.NO` guard |
| Linux, clean venv, no compiler | 2026-08-31 | py3.10 + py3.12, ubuntu-latest (and windows-latest) | ✅ green on every push since `dbfe54f` | the `vyakarana` CI job: bridge build → `check-fresh` → wheel build through the hook → wheel install → pytest, four legs; e.g. [run 33355659897](https://github.com/ShivamMalge/Tape-n-Trace/actions/runs/33355659897) on `f0c0aa2` |
| nbconvert (headless execute) | 2026-08-30 | nbconvert 7.x, fresh-venv wheel install | ✅ | `jupyter nbconvert --execute` over `vyakarana/notebooks/quickstart.ipynb`: every value-returning cell produced its value (version, `True`, the subset states `{p}`/`{p,q}`/`{p,r}`, the derivation, the verbatim Fig 8.9 ID log, the `Halted.NO` repr). Widget cells are **not blank**: each carries the `application/vnd.jupyter.widget-view+json` MIME with embedded state (live in an HTML export) plus a `text/plain` repr |
| JupyterLab 4+ | 2026-08-24 (V1) | dev install, 0.0.x bridge | ☑ rendering verified by the author at V1; **re-check with the 0.1.0rc3 wheel pending** | run `vyakarana/notebooks/quickstart.ipynb` in JupyterLab from a venv with the wheel installed; record the JupyterLab version here |
| Jupyter Notebook 7+ | — | — | ⬜ pending | same notebook, `jupyter notebook`; record the version here |
| VS Code notebooks | — | — | ⬜ pending | same notebook in VS Code; record the extension version here |
| **Colab (the release criterion)** | 2026-08-31 | Python 3.13.15, Ubuntu 22.04; rc1 (committed run), then rc3 | ✅ **verified by the author** | [colab-gate.ipynb](colab-gate.ipynb) is the rc1 run with its outputs: `pip install <wheel URL>` from a fresh runtime, `accepts("011") → True`, the DFA widget rendered (the widget MIME is in the output), the Fig 8.9 log verbatim. That run found the widget about twice a cell's size and a one-state result machine filling the cell — fixed in rc2/rc3, which the author re-ran and confirmed. One correction to the criterion's wording: Colab's image *does* ship a `node` binary (`/tools/node/bin/node`); the package never invokes it — the engine runs in embedded V8 via `mini-racer` — which is what the criterion was protecting |

## Reproducing the local rows

```sh
pnpm -F @tape-n-trace/bridge build          # static/ into the package
python -m pip install build
python -m build --wheel vyakarana           # dist/vyakarana-0.1.0rc3-py3-none-any.whl
python -m venv fresh && fresh/Scripts/pip install vyakarana/dist/*.whl pytest jsonschema
fresh/Scripts/python -m pytest -q vyakarana/tests   # from the repo root, not vyakarana/
```

The wheel-not-checkout trap: running `python -m pytest` with `vyakarana/` as the
working directory puts the source tree ahead of the wheel on `sys.path` and
quietly tests the checkout. Run from anywhere else and check
`vyakarana.__file__` points into `site-packages` when in doubt.

## Releasing

`.github/workflows/release.yml` runs on a `v*` tag: it builds the bridge and the wheel, tests the
wheel, refuses a tag that does not match `pyproject.toml` and `__version__`, publishes to PyPI by
**trusted publishing**, and creates the GitHub release with the wheel and sdist attached.

One-time setup on PyPI (a human, once): <https://pypi.org/manage/account/publishing/> → *Add a new
pending publisher* — PyPI project name `vyakarana`, owner `ShivamMalge`, repository `Tape-n-Trace`,
workflow `release.yml`, environment `pypi`. Then `git tag v0.1.0 && git push origin v0.1.0`.
