"""The Turing-machine gallery — the chapter 8 machines P1.6 built, re-exported.

    from vyakarana.gallery import binary_increment, busy_beaver_3, never_halts
    binary_increment.run("$1011")

`never_halts` is exactly what its name says: on any input beginning with 1 it
moves right forever. Its runs stop at the step guard with the reason — it
introduces the halting discussion instead of hanging your kernel (§8.2.6).
"""

from __future__ import annotations

import json

from . import runtime
from .tm import TM

_PYTHON_NAMES = {
    "zeros-ones": "zeros_ones",
    "monus": "monus",
    "binary-increment": "binary_increment",
    "unary-add": "unary_addition",
    "palindrome": "palindrome",
    "anbncn": "anbncn",
    "copy": "copy_machine",
    "multiply": "multiply",
    "busy-beaver-2": "busy_beaver_2",
    "busy-beaver-3": "busy_beaver_3",
    "never-halts": "never_halts",
    "storage-in-state": "storage_in_state",
    "tracks": "tracks",
    "ntm": "nondeterministic",
    "two-tape-zeros-ones": "two_tape_zeros_ones",
}


def _load() -> dict[str, TM]:
    raw = runtime.engine()._racer.eval(
        "JSON.stringify(TNT.TM_PRESETS.map(p => ({id: p.id, title: p.title, blurb: p.blurb, machine: p.machine, "
        "suggested: p.suggested, nonHalting: p.nonHalting ?? null, tracks: p.technique === 'tracks'})))"
    )
    machines: dict[str, TM] = {}
    for preset in json.loads(raw):
        name = _PYTHON_NAMES[preset["id"]]
        machine = TM._from_machine(preset["machine"])
        if preset["tracks"]:
            machine._encode = lambda word: [f"B|{c}" for c in word]
        doc = f"{preset['title']} — {preset['blurb']} Try: {', '.join(repr(w) for w in preset['suggested'])}."
        if preset["nonHalting"]:
            doc += (
                f" DOES NOT HALT on {preset['nonHalting']['inputs']}: {preset['nonHalting']['why']}"
                " Runs stop at the step guard and say so."
            )
        machine.__doc__ = doc
        machines[name] = machine
    return machines


_MACHINES = _load()
globals().update(_MACHINES)

__all__ = sorted(_MACHINES)


def all_machines() -> dict[str, TM]:
    """Every gallery machine, by its Python name."""
    return dict(_MACHINES)
