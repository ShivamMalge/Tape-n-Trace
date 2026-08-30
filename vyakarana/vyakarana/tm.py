"""Turing machines — documentation.md §5.6. The step guard never lies: a
machine that does not halt within the cap returns an explicit stopped result
with an offer to continue — never a silent False."""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from . import runtime
from .errors import ValidationError
from .results import Halted, Simulation
from .widget import show

DEFAULT_MAX_STEPS = 10_000


def _tuple_of(value: str | Iterable[str]) -> tuple[str, ...]:
    return (value,) if isinstance(value, str) else tuple(value)


def _tm_transition_id(state: str, read: tuple[str, ...], write: tuple[str, ...], move: tuple[str, ...], to: str) -> str:
    return f"{state}-[{' '.join(read)}/{' '.join(write)},{' '.join(move)}]->{to}"


class TM:
    def __init__(
        self,
        states: Iterable[str],
        input_alphabet: Iterable[str],
        tape_alphabet: Iterable[str],
        blank: str,
        transitions: Mapping[tuple[str, Any], Any],
        start: str,
        accepting: Iterable[str],
        rejecting: Iterable[str] | None = None,
        tapes: int = 1,
    ):
        payload_transitions: list[dict[str, Any]] = []
        for (state, read), moves in dict(transitions).items():
            read_tuple = _tuple_of(read)
            # One move, or a set of moves for a nondeterministic machine.
            triples = [moves] if isinstance(moves, tuple) and len(moves) == 3 and isinstance(moves[0], str) else list(moves)
            for to, write, move in triples:
                write_tuple, move_tuple = _tuple_of(write), _tuple_of(move)
                payload_transitions.append(
                    {
                        "id": _tm_transition_id(state, read_tuple, write_tuple, move_tuple, to),
                        "from": state,
                        "read": list(read_tuple),
                        "to": to,
                        "write": list(write_tuple),
                        "move": list(move_tuple),
                    }
                )
        self._machine: dict[str, Any] = {
            "states": sorted(set(states)),
            "inputAlphabet": sorted(set(input_alphabet)),
            "tapeAlphabet": sorted(set(tape_alphabet)),
            "blank": blank,
            "transitions": payload_transitions,
            "start": start,
            "accepting": sorted(set(accepting)),
            **({} if rejecting is None else {"rejecting": sorted(set(rejecting))}),
            "tapes": int(tapes),
        }
        problems = runtime.call("validateTM", self._machine)
        if problems:
            raise ValidationError(problems)
        self._last_trace: dict[str, Any] | None = None
        self._encode = None

    @classmethod
    def _from_machine(cls, machine: dict[str, Any], trace: dict[str, Any] | None = None) -> "TM":
        instance = object.__new__(cls)
        instance._machine = machine
        instance._last_trace = trace
        instance._encode = None
        return instance

    def run(self, word: str, max_steps: int = DEFAULT_MAX_STEPS, **overrides: Any) -> Simulation:
        symbols = self._encode(word) if self._encode is not None else word
        trace = runtime.call_result("simulateTM", self._machine, symbols, {"maxSteps": int(max_steps)})
        self._last_trace = trace
        rendered = show(trace=trace, **overrides)
        result = trace["result"]
        accepted = result.get("accepted") if result["type"] == "acceptance" else None
        return Simulation(
            accepted=accepted,
            trace=trace,
            _widget=rendered,
            _continue=lambda more: self.run(word, max_steps=int(max_steps) + more, **overrides),
        )

    def accepts(self, word: str, max_steps: int = DEFAULT_MAX_STEPS) -> bool | Halted:
        symbols = self._encode(word) if self._encode is not None else word
        trace = runtime.call_result("simulateTM", self._machine, symbols, {"maxSteps": int(max_steps)})
        result = trace["result"]
        if result["type"] == "incomplete":
            return Halted.NO
        return bool(result["accepted"])

    def to_single_tape(self, show_run: str | None = None, **overrides: Any) -> "TM":
        """Theorem 8.9's one-tape machine. Pass an input as `show_run` to watch
        it simulate this machine on that input, with the 4n + 2k cost counted."""
        single = runtime.call_result("multitapeToSingle", self._machine)
        if show_run is not None:
            trace = runtime.call_result("simulateReduction", self._machine, show_run, {"maxSteps": 3000})
            show(trace=trace, **overrides)
        return TM._from_machine(single)

    def tape_view(self, convention: str = "head-moves", **overrides: Any):
        """Re-render the last run under the chosen convention: "head-moves"
        (tape fixed) or "tape-moves" (head fixed, the tape scrolls)."""
        if convention not in ("head-moves", "tape-moves"):
            raise ValueError("convention is 'head-moves' or 'tape-moves'")
        if self._last_trace is None:
            raise ValueError("run the machine first — there is nothing to view yet")
        return show(trace=self._last_trace, convention=convention, **overrides)

    def validate(self) -> list[dict[str, Any]]:
        return list(runtime.call("validateTM", self._machine))

    def export_trace(self) -> dict[str, Any]:
        if self._last_trace is None:
            raise ValueError("no trace yet — run an operation first")
        return self._last_trace

    @property
    def states(self) -> list[str]:
        return list(self._machine["states"])

    @property
    def tapes(self) -> int:
        return int(self._machine["tapes"])

    def __repr__(self) -> str:
        m = self._machine
        return f"TM({len(m['states'])} states, {m['tapes']} tape{'s' if m['tapes'] != 1 else ''}, blank {m['blank']!r})"
