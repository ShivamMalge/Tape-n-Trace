"""Result objects — documentation.md §5.7. Each wraps a trace; the trace is
the artifact, the object is the ergonomics."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from . import runtime, widget


@dataclass
class Simulation:
    """One run of a machine: the verdict, the trace, and the widget if one rendered."""

    accepted: bool | None
    trace: dict[str, Any] = field(repr=False)
    _widget: Any = field(default=None, repr=False)

    @property
    def step(self) -> int:
        return int(self._widget.step) if self._widget is not None else 0

    @step.setter
    def step(self, value: int) -> None:
        if self._widget is not None:
            self._widget.step = int(value)

    def id_log(self) -> str:
        """The ID sequence in textbook notation — PDA and TM runs carry one."""
        kind = self.trace.get("kind", "")
        if kind == "simulate.pda":
            return str(runtime.call("idLog", self.trace))
        if kind == "simulate.tm":
            return str(runtime.call("tmIdLog", self.trace))
        raise ValueError(
            f"ID logs are the PDA and TM notation (Hopcroft §6.1.4, §8.2.3); a {kind} run narrates per step instead."
        )

    def export_trace(self) -> dict[str, Any]:
        return self.trace


@dataclass
class EquivalenceResult:
    equivalent: bool
    witness: str | None
    side: str | None
    _machines: tuple[dict[str, Any], dict[str, Any]] | None = field(default=None, repr=False)

    def compare(self) -> None:
        """Render both machines run on the witness. (The single lockstep view lands with the bridge's next phase.)"""
        if self.equivalent or self.witness is None or self._machines is None:
            return None
        for machine in self._machines:
            trace = runtime.call_result("simulate", machine, self.witness)
            widget.show(trace=trace)
        return None


@dataclass
class ParseTree:
    """An abstract syntax tree — for a regular expression, the precedence made visible."""

    root: dict[str, Any] = field(repr=False)

    def yield_(self) -> str:
        """For a regular expression's tree: the expression read back off the leaves."""
        return str(runtime.call("regexToString", self.root))
