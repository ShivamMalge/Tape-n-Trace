# Vyakarana — the environments record

The dated evidence phases-vyakarana.md V4 requires: each environment, the version
tested, and how the result was obtained. A row is either evidenced or says it is
not — an unchecked box here is honest; a guessed ✅ is not.

**Package under test:** `vyakarana 0.1.0rc1`, the wheel built by
`python -m build --wheel vyakarana` (pure `py3-none-any`, ~0.2 MB, all four
`static/` files inside — `widget.js`, `engine.js`, `widget.css`,
`engine-manifest.json`).

**Where the wheel is:** GitHub pre-release
[`v0.1.0rc1`](https://github.com/ShivamMalge/Tape-n-Trace/releases/tag/v0.1.0rc1) (created 2026-08-31),
wheel and sdist attached. The Colab gate installs it by URL; open the notebook straight from GitHub:
<https://colab.research.google.com/github/ShivamMalge/Tape-n-Trace/blob/main/docs/colab-gate.ipynb>.

**Python floor:** `requires-python = ">=3.10"`. Colab ships Python **3.12.13 on
Ubuntu 22.04** (checked 2026-08-30 against Colab's runtime documentation), so
the floor keeps two versions of headroom below the one environment the release
criterion names.

## The record

| Environment | Date | Version tested | Result | Evidence |
|---|---|---|---|---|
| Windows 11, clean venv, no compiler | 2026-08-30 | Python 3.11.9, wheel install | ✅ install + full suite | `pip install <wheel>` into a fresh venv; the 48-test suite run from a neutral cwd against the site-packages install (`vyakarana.__file__` checked to be the wheel's), plus a headless smoke: `accepts`, the `minimize().to_regex()` chain, `CFG.derive`, the Fig 8.9 `id_log`, the `Halted.NO` guard |
| Linux, clean venv, no compiler | pending CI | py3.10 + py3.12, ubuntu-latest | 🔄 gated in CI | the `vyakarana` job in `.github/workflows/ci.yml`: bridge build → freshness → wheel build → wheel install → pytest; first green run on `main` is the evidence |
| nbconvert (headless execute) | 2026-08-30 | nbconvert 7.x, fresh-venv wheel install | ✅ | `jupyter nbconvert --execute` over `vyakarana/notebooks/quickstart.ipynb`: every value-returning cell produced its value (version, `True`, the subset states `{p}`/`{p,q}`/`{p,r}`, the derivation, the verbatim Fig 8.9 ID log, the `Halted.NO` repr). Widget cells are **not blank**: each carries the `application/vnd.jupyter.widget-view+json` MIME with embedded state (live in an HTML export) plus a `text/plain` repr |
| JupyterLab 4+ | 2026-08-24 (V1) | dev install, 0.0.x bridge | ☑ rendering verified by the author at V1; **re-check with the 0.1.0rc1 wheel pending** | run `vyakarana/notebooks/quickstart.ipynb` in JupyterLab from a venv with the wheel installed; record the JupyterLab version here |
| Jupyter Notebook 7+ | — | — | ⬜ pending | same notebook, `jupyter notebook`; record the version here |
| VS Code notebooks | — | — | ⬜ pending | same notebook in VS Code; record the extension version here |
| **Colab (the release criterion)** | — | — | ⬜ **pending — blocks V4 closure** | open [colab-gate.ipynb in Colab](https://colab.research.google.com/github/ShivamMalge/Tape-n-Trace/blob/main/docs/colab-gate.ipynb), Runtime → Run all, save **with outputs** back to `docs/colab-gate.ipynb`, commit. The wheel it installs is on the pre-release; the same URL install was verified from a clean Windows venv on 2026-08-31 |

## Reproducing the local rows

```sh
pnpm -F @tape-n-trace/bridge build          # static/ into the package
python -m pip install build
python -m build --wheel vyakarana           # dist/vyakarana-0.1.0rc1-py3-none-any.whl
python -m venv fresh && fresh/Scripts/pip install vyakarana/dist/*.whl pytest jsonschema
fresh/Scripts/python -m pytest -q vyakarana/tests   # from the repo root, not vyakarana/
```

The wheel-not-checkout trap: running `python -m pytest` with `vyakarana/` as the
working directory puts the source tree ahead of the wheel on `sys.path` and
quietly tests the checkout. Run from anywhere else and check
`vyakarana.__file__` points into `site-packages` when in doubt.
