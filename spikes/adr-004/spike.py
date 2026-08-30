"""ADR-004 spike: where does the engine execute in the Python path?

Reproduces the decisive measurement in one command:

    python spikes/adr-004/spike.py

Prerequisites: `pip install quickjs mini-racer` (each ships binary wheels; no
compiler), and pnpm installed for the one-time engine bundle build. The bundle
(`engine-bundle.js`, gitignored) is rebuilt automatically when missing, via:

    pnpm exec esbuild packages/engine/src/index.ts --bundle --format=iife
        --global-name=TNT --outfile=spikes/adr-004/engine-bundle.js

What is measured, per candidate runtime (quickjs, mini-racer):

  1. That the *real* engine bundle evaluates — not a toy script.
  2. That a value-returning call works synchronously with no frontend:
     accepts("011") on a two-state odd-number-of-0s DFA.
  3. That the full trace protocol survives the boundary: the Turing-machine
     gallery's Fig. 8.9 run on 0011 must produce the textbook ID sequence,
     character for character, through JSON.
  3b. That serialise/deserialise work — they use TextEncoder, a web API an
      embedded runtime may not provide, and export_trace() depends on them.
  4. Wall-clock times for engine load and for each call.

`test_spike.py` beside this file runs the same measurements under pytest,
which is ADR-004's "headless" question turned into a test.
"""

from __future__ import annotations

import json
import pathlib
import subprocess
import time

HERE = pathlib.Path(__file__).parent
REPO = HERE.parent.parent
BUNDLE = HERE / "engine-bundle.js"

EXPECTED_ID_LOG = (
    "q\u20800011 \u22a2 Xq\u2081011 \u22a2 X0q\u208111 \u22a2 Xq\u20820Y1 \u22a2 q\u2082X0Y1 \u22a2 "
    "Xq\u20800Y1 \u22a2 XXq\u2081Y1 \u22a2 XXYq\u20811 \u22a2 XXq\u2082YY \u22a2 Xq\u2082XYY \u22a2 "
    "XXq\u2080YY \u22a2 XXYq\u2083Y \u22a2 XXYYq\u2083B \u22a2 XXYYBq\u2084B"
)

DFA_PAYLOAD = {
    "kind": "DFA",
    "states": ["a", "b"],
    "alphabet": ["0", "1"],
    "transitions": [
        {"id": "t1", "from": "a", "read": "0", "to": "b"},
        {"id": "t2", "from": "a", "read": "1", "to": "a"},
        {"id": "t3", "from": "b", "read": "0", "to": "a"},
        {"id": "t4", "from": "b", "read": "1", "to": "b"},
    ],
    "start": "a",
    "accepting": ["b"],
}

# QuickJS (the PyPI wheel wraps a 2021-era engine) predates Array.prototype.at,
# which the engine uses throughout. esbuild transpiles syntax, not runtime
# APIs, so the binding must ship this prelude. Recorded as a cost of the
# quickjs option; V8 needs nothing.
PRELUDE = """
if (!Array.prototype.at) {
    Object.defineProperty(Array.prototype, 'at', { value: function (n) {
        n = Math.trunc(n) || 0; if (n < 0) n += this.length;
        return n < 0 || n >= this.length ? undefined : this[n];
    }});
    Object.defineProperty(String.prototype, 'at', { value: function (n) {
        n = Math.trunc(n) || 0; if (n < 0) n += this.length;
        return n < 0 || n >= this.length ? undefined : this[n];
    }});
}
"""

# Every candidate evaluates this after the bundle; results come back as JSON
# strings so the conversion story is identical across runtimes.
PROBE = """
function __probe(payloadJson, word) {
    const machine = JSON.parse(payloadJson);
    const run = TNT.simulate(machine, word);
    if (!run.ok) return JSON.stringify({ ok: false, errors: run.errors });
    const tm = TNT.unwrap(TNT.simulateTM(TNT.tmPreset('zeros-ones').machine, '0011'));
    let serialised = 'ok';
    try {
        const wire = TNT.serialise(run.value);
        const back = TNT.deserialise(wire);
        if (back.steps.length !== run.value.steps.length) serialised = 'round trip lost steps';
    } catch (e) {
        serialised = String(e);
    }
    return JSON.stringify({
        ok: true,
        accepted: run.value.result.accepted,
        steps: run.value.steps.length,
        idLog: TNT.tmIdLog(tm),
        tmSteps: tm.steps.length,
        serialised,
    });
}
"""


def ensure_bundle() -> None:
    if BUNDLE.exists():
        return
    subprocess.run(
        [
            "pnpm.cmd" if pathlib.Path("C:/").exists() else "pnpm",
            "exec",
            "esbuild",
            "packages/engine/src/index.ts",
            "--bundle",
            "--format=iife",
            "--global-name=TNT",
            f"--outfile={BUNDLE}",
        ],
        cwd=REPO,
        check=True,
    )


def run_quickjs() -> dict:
    import quickjs

    source = BUNDLE.read_text(encoding="utf-8")
    t0 = time.perf_counter()
    ctx = quickjs.Context()
    ctx.eval(PRELUDE)
    ctx.eval(source)
    ctx.eval(PROBE)
    load = time.perf_counter() - t0
    t0 = time.perf_counter()
    raw = ctx.eval(f"__probe({json.dumps(json.dumps(DFA_PAYLOAD))}, '011')")
    call = time.perf_counter() - t0
    out = json.loads(raw)
    out.update(runtime="quickjs", load_s=round(load, 4), call_s=round(call, 4))
    return out


def run_mini_racer() -> dict:
    from py_mini_racer import MiniRacer

    source = BUNDLE.read_text(encoding="utf-8")
    t0 = time.perf_counter()
    mr = MiniRacer()
    mr.eval(source)
    mr.eval(PROBE)
    load = time.perf_counter() - t0
    t0 = time.perf_counter()
    raw = mr.eval(f"__probe({json.dumps(json.dumps(DFA_PAYLOAD))}, '011')")
    call = time.perf_counter() - t0
    out = json.loads(raw)
    out.update(runtime="mini-racer", load_s=round(load, 4), call_s=round(call, 4))
    return out


def check(result: dict) -> list[str]:
    problems = []
    if not result.get("ok"):
        problems.append(f"engine returned errors: {result}")
        return problems
    if result["accepted"] is not True:
        problems.append("accepts('011') was not True")
    if result["idLog"] != EXPECTED_ID_LOG:
        problems.append("the Fig. 8.9 ID log does not match the textbook")
    if result["serialised"] != "ok":
        problems.append(f"serialise/deserialise: {result['serialised']}")
    return problems


def main() -> int:
    ensure_bundle()
    print(f"engine bundle: {BUNDLE.stat().st_size / 1024:.1f} KB")
    failures = 0
    for runner in (run_quickjs, run_mini_racer):
        try:
            result = runner()
        except Exception as exc:  # noqa: BLE001 — a spike reports, it does not hide
            print(f"{runner.__name__}: FAILED to run — {type(exc).__name__}: {exc}")
            failures += 1
            continue
        problems = check(result)
        status = "OK " if not problems else "BAD"
        print(
            f"{status} {result['runtime']:>10}: load {result['load_s']*1000:7.1f} ms · "
            f"call {result['call_s']*1000:6.1f} ms · accepted={result['accepted']} · "
            f"DFA steps={result['steps']} · TM steps={result['tmSteps']} · ID log matches book={result['idLog'] == EXPECTED_ID_LOG} · serialise={result['serialised']}"
        )
        for p in problems:
            print("     -", p)
        failures += len(problems)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
