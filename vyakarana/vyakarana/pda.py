"""Pushdown automata — documentation.md §5.5. The ID log is the point: the
textbook notation, copy-pasteable, because that is what the exam marks."""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from . import runtime
from .errors import ValidationError
from .results import DeterminismResult, Simulation
from .widget import show


def _pda_transition_id(state: str, read: str | None, pop: str | None, push: tuple[str, ...], to: str) -> str:
    return f"{state}-[{read or ''},{pop or ''}/{''.join(push)}]->{to}"


class PDA:
    def __init__(
        self,
        states: Iterable[str],
        input_alphabet: Iterable[str],
        stack_alphabet: Iterable[str],
        transitions: Mapping[tuple[str, str | None, str | None], Any],
        start: str,
        start_stack: str,
        accepting: Iterable[str] = (),
        accept_by: str = "finalState",
    ):
        if accept_by not in ("finalState", "emptyStack"):
            raise ValueError("accept_by is 'finalState' (L(P)) or 'emptyStack' (N(P)) — Hopcroft §6.2")
        payload_transitions: list[dict[str, Any]] = []
        for (state, read, pop), moves in dict(transitions).items():
            pairs = [moves] if isinstance(moves, tuple) and len(moves) == 2 and isinstance(moves[0], str) else list(moves)
            for to, push in pairs:
                push_tuple = tuple(push)
                payload_transitions.append(
                    {"id": _pda_transition_id(state, read, pop, push_tuple, to), "from": state, "read": read, "pop": pop, "to": to, "push": list(push_tuple)}
                )
        self._machine: dict[str, Any] = {
            "states": sorted(set(states)),
            "inputAlphabet": sorted(set(input_alphabet)),
            "stackAlphabet": sorted(set(stack_alphabet)),
            "transitions": payload_transitions,
            "start": start,
            "startStack": start_stack,
            "accepting": sorted(set(accepting)),
            "acceptBy": accept_by,
        }
        problems = runtime.call("validatePDA", self._machine)
        if problems:
            raise ValidationError(problems)
        self._last_trace: dict[str, Any] | None = None

    @classmethod
    def _from_machine(cls, machine: dict[str, Any], trace: dict[str, Any] | None = None) -> "PDA":
        instance = object.__new__(cls)
        instance._machine = machine
        instance._last_trace = trace
        return instance

    def run(self, word: str, **overrides: Any) -> Simulation:
        trace = runtime.call_result("simulatePDA", self._machine, word)
        self._last_trace = trace
        rendered = show(trace=trace, **overrides)
        result = trace["result"]
        accepted = result.get("accepted") if result["type"] == "acceptance" else None
        return Simulation(accepted=accepted, trace=trace, _widget=rendered)

    def accepts(self, word: str) -> bool:
        verdict = runtime.call("acceptsPDA", self._machine, word)
        if verdict is None:
            raise RuntimeError("the bounded search hit its cap without a verdict — run(word) shows how far it got")
        return bool(verdict)

    def to_empty_stack(self, **overrides: Any) -> "PDA":
        return self._convert("finalStateToEmptyStack", **overrides)

    def to_final_state(self, **overrides: Any) -> "PDA":
        return self._convert("emptyStackToFinalState", **overrides)

    def _convert(self, name: str, **overrides: Any) -> "PDA":
        trace = runtime.call_result(name, self._machine)
        show(trace=trace, **overrides)
        return PDA._from_machine(trace["result"]["machine"], trace)

    def is_deterministic(self) -> DeterminismResult:
        report = runtime.call("checkDeterminism", self._machine)
        return DeterminismResult(deterministic=bool(report["deterministic"]), violations=list(report["violations"]))

    def to_cfg(self) -> None:
        raise NotImplementedError(
            "PDA → CFG (the [pXq] construction, Hopcroft §6.3.2) is enrichment, scheduled after v1.0 — "
            "the prescribed syllabus lists §6.3.1 only (ADR-003)."
        )

    def validate(self) -> list[dict[str, Any]]:
        return list(runtime.call("validatePDA", self._machine))

    def export_trace(self) -> dict[str, Any]:
        if self._last_trace is None:
            raise ValueError("no trace yet — run an operation first")
        return self._last_trace

    @property
    def states(self) -> list[str]:
        return list(self._machine["states"])

    def __repr__(self) -> str:
        m = self._machine
        by = "final state" if m["acceptBy"] == "finalState" else "empty stack"
        return f"PDA({len(m['states'])} states, accepts by {by}, start stack {m['startStack']})"
