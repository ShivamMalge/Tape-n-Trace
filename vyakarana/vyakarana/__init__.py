"""Vyakarana — the Python face of the Tape-n-Trace engine.

Build a machine in a notebook cell; the bundled TypeScript engine computes the
trace and the web app's own renderers draw it inline. Python never
reimplements an algorithm (architecture.md §2, ADR-004).

    from vyakarana import DFA
    d = DFA(states={"a", "b"}, alphabet={"0", "1"},
            transitions={("a", "0"): "b", ("a", "1"): "a",
                         ("b", "0"): "a", ("b", "1"): "b"},
            start="a", accepting={"b"})
    d.accepts("011")        # True — an odd number of 0s
    d.run("011")            # renders the run with transport controls
"""

from .cfg import CFG
from .errors import ValidationError
from .machines import DFA, ENFA, NFA
from .options import options
from .pda import PDA
from .regular import RE, RegularExpression
from .results import (
    Ambiguous,
    AmbiguityResult,
    Derivation,
    DeterminismResult,
    EquivalenceResult,
    Halted,
    NoCounterexample,
    ParseTree,
    Simulation,
)
from .tm import TM
from .widget import TntWidget

__version__ = "0.0.2"

__all__ = [
    "DFA",
    "NFA",
    "ENFA",
    "RE",
    "RegularExpression",
    "CFG",
    "PDA",
    "TM",
    "Simulation",
    "Derivation",
    "EquivalenceResult",
    "ParseTree",
    "Ambiguous",
    "AmbiguityResult",
    "NoCounterexample",
    "DeterminismResult",
    "Halted",
    "TntWidget",
    "ValidationError",
    "options",
    "__version__",
]
