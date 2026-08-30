"""The API parity test — documentation.md §9, phases-vyakarana.md V3.

Every public member of every class resolves through ENGINE_MAP; every engine
export is either surfaced or consciously excluded in UNBOUND. Drift in either
direction fails, and the test demonstrates its own teeth by deleting an entry.
"""

import json
import pathlib

from vyakarana import (
    CFG,
    DFA,
    ENFA,
    NFA,
    PDA,
    TM,
    Ambiguous,
    Derivation,
    DeterminismResult,
    EquivalenceResult,
    ParseTree,
    RegularExpression,
    Simulation,
)
from vyakarana import gallery
from vyakarana._engine_map import ENGINE_MAP, UNBOUND, parity_problems

MANIFEST = json.loads(
    (pathlib.Path(__file__).resolve().parents[1] / "vyakarana" / "static" / "engine-manifest.json").read_text(encoding="utf-8")
)

SURFACE = {
    "DFA": DFA,
    "NFA": NFA,
    "ENFA": ENFA,
    "RegularExpression": RegularExpression,
    "CFG": CFG,
    "PDA": PDA,
    "TM": TM,
    "Simulation": Simulation,
    "Derivation": Derivation,
    "EquivalenceResult": EquivalenceResult,
    "ParseTree": ParseTree,
    "Ambiguous": Ambiguous,
    "DeterminismResult": DeterminismResult,
    "gallery": type("gallery", (), {"all_machines": gallery.all_machines}),
}


def test_the_two_surfaces_have_not_drifted():
    problems = parity_problems(SURFACE, ENGINE_MAP, UNBOUND, MANIFEST["exports"])
    assert problems == []


def test_the_parity_test_has_teeth():
    # Deleting one entry must fail in the python-side direction…
    broken = dict(ENGINE_MAP)
    del broken["DFA.minimize"]
    problems = parity_problems(SURFACE, broken, UNBOUND, MANIFEST["exports"])
    assert any("DFA.minimize" in p for p in problems)

    # …and dropping an engine export from both tables fails the other way.
    smaller_unbound = dict(UNBOUND)
    del smaller_unbound["searchText"]
    problems = parity_problems(SURFACE, ENGINE_MAP, smaller_unbound, MANIFEST["exports"])
    assert any("searchText" in p for p in problems)
