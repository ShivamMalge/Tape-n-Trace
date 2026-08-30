"""Regular expressions — documentation.md §5.3. Precedence is star, then
concatenation, then union, as Hopcroft 3.1.3 defines it; the engine's parser
is the arbiter, not Python's."""

from __future__ import annotations

from typing import Any

from . import runtime
from .machines import DFA, ENFA
from .results import ParseTree, Simulation
from .widget import show


class RegularExpression:
    def __init__(self, pattern: str):
        self._node = runtime.call_result("parseRegex", pattern)
        self._pattern = pattern
        self._enfa: ENFA | None = None

    @classmethod
    def _from_node(cls, node: dict[str, Any]) -> "RegularExpression":
        instance = object.__new__(cls)
        instance._node = node
        instance._pattern = str(runtime.call("regexToString", node))
        instance._enfa = None
        return instance

    @property
    def pattern(self) -> str:
        return self._pattern

    def parse_tree(self) -> ParseTree:
        return ParseTree(root=self._node)

    def to_enfa(self, **overrides: Any) -> ENFA:
        trace = runtime.call_result("regexToENFA", self._node)
        show(trace=trace, **overrides)
        return ENFA._from_machine(trace["result"]["machine"], trace)

    def to_dfa(self, **overrides: Any) -> DFA:
        """Thompson, then subset, then minimise — the minimisation stepper renders."""
        enfa_trace = runtime.call_result("regexToENFA", self._node)
        dfa_trace = runtime.call_result("nfaToDfa", enfa_trace["result"]["machine"])
        min_trace = runtime.call_result("minimize", dfa_trace["result"]["machine"])
        show(trace=min_trace, **overrides)
        return DFA._from_machine(min_trace["result"]["machine"], min_trace)

    def matches(self, word: str) -> bool:
        if self._enfa is None:
            machine = runtime.call_result("regexToENFA", self._node)["result"]["machine"]
            self._enfa = ENFA._from_machine(machine)
        return self._enfa.accepts(word)

    def run(self, word: str, **overrides: Any) -> Simulation:
        if self._enfa is None:
            self.matches("")
        assert self._enfa is not None
        return self._enfa.run(word, **overrides)

    def playground(self, **overrides: Any):
        """Render the Thompson construction. (The four synced panels of the web
        app's playground land with the bridge's next phase; this shows the
        construction that links the representations.)"""
        trace = runtime.call_result("regexToENFA", self._node)
        return show(trace=trace, **overrides)

    def __repr__(self) -> str:
        return f"RegularExpression({self._pattern!r})"


RE = RegularExpression
