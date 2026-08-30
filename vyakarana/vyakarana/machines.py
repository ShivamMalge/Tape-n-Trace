"""DFA, NFA and ENFA — documentation.md §5.1–5.2.

Python normalises loose iterables into the engine's payload shape and raises
`ValidationError` with every problem at once; every algorithm runs in the
engine (ADR-004), synchronously. Epsilon is `None`, never the string "ε"
(ADR-002), so an alphabet containing the character ε stays representable.
"""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from . import runtime
from .errors import ValidationError
from .results import EquivalenceResult, Simulation
from .widget import show

TNT_FORMAT = "tape-n-trace/machine@1"


def _transition_id(state: str, symbol: str | None, target: str) -> str:
    return f"{state}-[{'' if symbol is None else symbol}]->{target}"


def _engine_problems(machine: dict[str, Any]) -> list[dict[str, Any]]:
    """validateFA returns Result<FiniteAutomaton>: unwrap it into a problem list."""
    try:
        runtime.call_result("validateFA", machine)
        return []
    except ValidationError as error:
        return error.problems


class _Machine:
    kind = "DFA"

    def __init__(
        self,
        states: Iterable[str],
        alphabet: Iterable[str],
        transitions: Mapping[tuple[str, str | None], Any],
        start: str,
        accepting: Iterable[str],
    ):
        problems: list[dict[str, Any]] = []
        payload_transitions: list[dict[str, Any]] = []
        for key, target in dict(transitions).items():
            try:
                state, symbol = key
            except (TypeError, ValueError):
                problems.append({"code": "VYK_BAD_KEY", "message": f"Transition key {key!r} is not a (state, symbol) pair.", "subject": {"kind": "transition"}})
                continue
            if symbol is None and self.kind != "ENFA":
                problems.append({"code": "VYK_EPSILON_HERE", "message": f"A {self.kind} has no ε-moves; ({state!r}, None) needs an ENFA.", "subject": {"kind": "transition"}})
                continue
            targets = [target] if isinstance(target, str) else sorted(target)
            if self.kind == "DFA" and not isinstance(target, str):
                problems.append({"code": "VYK_DFA_SET", "message": f"A DFA transition maps to one state; ({state!r}, {symbol!r}) maps to {target!r}. Use an NFA for a set.", "subject": {"kind": "transition"}})
                continue
            for to in targets:
                payload_transitions.append({"id": _transition_id(state, symbol, to), "from": state, "read": symbol, "to": to})

        self._machine: dict[str, Any] = {
            "kind": self.kind,
            "states": sorted(set(states)),
            "alphabet": sorted(set(alphabet)),
            "transitions": payload_transitions,
            "start": start,
            "accepting": sorted(set(accepting)),
        }
        problems.extend(_engine_problems(self._machine))
        if problems:
            raise ValidationError(problems)
        self._last_trace: dict[str, Any] | None = None

    # -- construction without re-normalising, for engine-produced machines ----
    @classmethod
    def _from_machine(cls, machine: dict[str, Any], trace: dict[str, Any] | None = None) -> "_Machine":
        instance = object.__new__(cls)
        instance._machine = machine
        instance._last_trace = trace
        return instance

    # -- the shared surface ----------------------------------------------------
    def accepts(self, word: str) -> bool:
        trace = runtime.call_result("simulate", self._machine, word)
        result = trace["result"]
        if result["type"] != "acceptance":
            raise RuntimeError(f"the run did not reach a verdict: {result}")
        return bool(result["accepted"])

    def run(self, word: str, **overrides: Any) -> Simulation:
        trace = runtime.call_result("simulate", self._machine, word)
        self._last_trace = trace
        rendered = show(trace=trace, **overrides)
        accepted = trace["result"].get("accepted") if trace["result"]["type"] == "acceptance" else None
        return Simulation(accepted=accepted, trace=trace, _widget=rendered)

    def run_all(self, words: Iterable[str]) -> dict[str, bool]:
        return {word: self.accepts(word) for word in words}

    def validate(self) -> list[dict[str, Any]]:
        return _engine_problems(self._machine)

    def export_trace(self) -> dict[str, Any]:
        if self._last_trace is None:
            raise ValueError("no trace yet — run an operation first (run, to_dfa, minimize, …)")
        return self._last_trace

    def to_json(self) -> dict[str, Any]:
        return {"format": TNT_FORMAT, "machine": self._machine}

    @classmethod
    def from_json(cls, data: Mapping[str, Any]) -> "_Machine":
        if data.get("format") != TNT_FORMAT:
            raise ValueError(f"not a Tape-n-Trace machine: the format header should be {TNT_FORMAT!r}")
        machine = data.get("machine")
        if not isinstance(machine, Mapping):
            raise ValueError("the file has a format header but no machine in it")
        machine = dict(machine)
        target = _CLASS_FOR_KIND.get(str(machine.get("kind")), cls)
        problems = _engine_problems(machine)
        if problems:
            raise ValidationError(problems)
        return target._from_machine(machine)

    def equivalent_to(self, other: "_Machine") -> EquivalenceResult:
        detail = runtime.call_result("areEquivalentDetailed", self._machine, other._machine)
        return EquivalenceResult(
            equivalent=bool(detail["equivalent"]),
            witness=detail.get("witness"),
            side=detail.get("side"),
            _machines=(self._machine, other._machine),
        )

    def reverse(self) -> "NFA":
        return self._convert("reverseFA", NFA, self._machine)

    def _convert(self, name: str, target: type, *args: Any, **overrides: Any) -> Any:
        trace = runtime.call_result(name, *args)
        machine = trace["result"]["machine"]
        show(trace=trace, **overrides)
        return target._from_machine(machine, trace)

    def __repr__(self) -> str:
        m = self._machine
        return f"{self.kind}({len(m['states'])} states over {{{', '.join(m['alphabet'])}}}, start {m['start']})"

    # convenience accessors
    @property
    def states(self) -> list[str]:
        return list(self._machine["states"])

    @property
    def alphabet(self) -> list[str]:
        return list(self._machine["alphabet"])


class DFA(_Machine):
    kind = "DFA"

    def minimize(self, **overrides: Any) -> "DFA":
        return self._convert("minimize", DFA, self._machine, **overrides)

    def is_minimal(self) -> bool:
        trace = runtime.call_result("minimize", self._machine)
        return len(trace["result"]["machine"]["states"]) == len(self._machine["states"])

    def to_regex(self, **overrides: Any):
        from .regular import RegularExpression

        trace = runtime.call_result("dfaToRegex", self._machine)
        self._last_trace = trace
        show(trace=trace, **overrides)
        return RegularExpression._from_node(trace["result"]["regex"])

    def complement(self, **overrides: Any) -> "DFA":
        if not runtime.call("isComplete", self._machine):
            raise ValidationError([
                {
                    "code": "DFA_INCOMPLETE",
                    "message": "complement() needs a complete DFA — some (state, symbol) pairs have no move, so the flipped machine would be wrong on them. Call .completed() first to add the trap state explicitly.",
                    "subject": {"kind": "machine"},
                }
            ])
        return self._convert("complement", DFA, self._machine, **overrides)

    def completed(self) -> "DFA":
        return DFA._from_machine(runtime.call("completeDFA", self._machine))

    def union(self, other: "DFA", **overrides: Any) -> "DFA":
        return self._convert("unionFA", DFA, self._machine, other._machine, **overrides)

    def intersection(self, other: "DFA", **overrides: Any) -> "DFA":
        return self._convert("intersection", DFA, self._machine, other._machine, **overrides)

    def difference(self, other: "DFA", **overrides: Any) -> "DFA":
        return self._convert("difference", DFA, self._machine, other._machine, **overrides)


class NFA(_Machine):
    kind = "NFA"

    def to_dfa(self, **overrides: Any) -> DFA:
        return self._convert("nfaToDfa", DFA, self._machine, **overrides)

    def epsilon_closure(self, state: str) -> set[str]:
        return set(runtime.call("epsilonClosure", self._machine, [state]))

    def remove_epsilon(self, **overrides: Any) -> "NFA":
        return self._convert("epsilonElim", NFA, self._machine, **overrides)

    def minimize(self, **overrides: Any) -> DFA:
        """Determinise, then minimise — minimisation is a DFA notion."""
        return self.to_dfa(**overrides).minimize(**overrides)

    @classmethod
    def from_regex(cls, pattern: str) -> "ENFA":
        from .regular import RegularExpression

        return RegularExpression(pattern).to_enfa()

    @classmethod
    def for_keywords(cls, words: Iterable[str]) -> "NFA":
        machines = runtime.call_result("keywordMachines", sorted(words))
        return NFA._from_machine(machines["nfa"])


class ENFA(NFA):
    kind = "ENFA"


_CLASS_FOR_KIND: dict[str, type] = {"DFA": DFA, "NFA": NFA, "ENFA": ENFA}
