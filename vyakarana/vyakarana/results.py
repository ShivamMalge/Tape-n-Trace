"""Result objects — documentation.md §5.7. Each wraps a trace or a verdict;
the trace is the artifact, the object is the ergonomics. Bounded results say
they are bounded — architecture.md §2.6 does not stop applying because the
caller is Python."""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Any, Callable

from . import runtime, widget


class Halted(enum.Enum):
    """`TM.accepts` returns this when the step guard fires: not a verdict.

    Falsy on purpose — `if tm.accepts(w):` stays safe — but distinguishable
    from `False`, which would claim the machine halted and rejected."""

    NO = "no halt within the step cap"

    def __bool__(self) -> bool:
        return False

    def __repr__(self) -> str:
        return "Halted.NO  (the machine made every allowed move without halting — not a rejection)"


@dataclass
class Simulation:
    """One run of a machine: the verdict, the trace, and the widget if one rendered."""

    accepted: bool | None
    trace: dict[str, Any] = field(repr=False)
    _widget: Any = field(default=None, repr=False)
    _continue: Callable[[int], "Simulation"] | None = field(default=None, repr=False)

    @property
    def stopped(self) -> bool:
        """True when a step guard cut the run short — visible, never silent."""
        return self.trace["result"]["type"] == "incomplete"

    @property
    def step(self) -> int:
        return int(self._widget.step) if self._widget is not None else 0

    @step.setter
    def step(self, value: int) -> None:
        if self._widget is not None:
            self._widget.step = int(value)

    def continue_for(self, more_steps: int) -> "Simulation":
        """Re-run with a larger cap — the guard's offer to continue."""
        if not self.stopped:
            raise ValueError("the run halted on its own; there is nothing to continue")
        if self._continue is None:
            raise ValueError("this run cannot be continued from here")
        return self._continue(int(more_steps))

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
    """A tree: a regular expression's AST, or a derivation's parse tree."""

    root: Any = field(repr=False)

    def yield_(self) -> str:
        if isinstance(self.root, list):
            return "".join(runtime.call("treeYield", self.root))
        return str(runtime.call("regexToString", self.root))


@dataclass
class Derivation:
    """A bounded search for a derivation. `derived=None` means the search hit
    its bound — a bound, not a verdict, and the repr says which."""

    derived: bool | None
    steps: int | None
    trace: dict[str, Any] = field(repr=False)
    _widget: Any = field(default=None, repr=False)

    def __repr__(self) -> str:
        if self.derived:
            return f"Derivation(derived=True, steps={self.steps})"
        reason = self.trace["result"].get("reason", "")
        return f"Derivation(derived=None)  {reason} A bound, not a verdict."

    def parse_tree(self) -> ParseTree:
        nodes = self.trace["steps"][-1]["snapshot"].get("nodes")
        if not nodes:
            raise ValueError("no derivation was found, so there is no tree")
        return ParseTree(root=nodes)

    def export_trace(self) -> dict[str, Any]:
        return self.trace


@dataclass
class Ambiguous:
    """A proof: one string, two distinct leftmost derivations."""

    witness: str
    tree_a: ParseTree = field(repr=False)
    tree_b: ParseTree = field(repr=False)

    def __repr__(self) -> str:
        return f"Ambiguous(witness={self.witness!r})  Two distinct leftmost derivations exist — a proof."


class NoCounterexample:
    """The bounded outcome — and NOT a proof of unambiguity."""

    def __init__(self, max_length: int = 10):
        self.max_length = max_length

    def __repr__(self) -> str:
        return (
            f"NoCounterexample(max_length={self.max_length})\n"
            f"  No string up to length {self.max_length} has two distinct leftmost derivations.\n"
            "  This is NOT a proof of unambiguity — ambiguity of a CFG is undecidable."
        )


AmbiguityResult = Ambiguous | NoCounterexample


@dataclass
class DeterminismResult:
    """Hopcroft §6.4.1's two conditions, checked pair by pair."""

    deterministic: bool
    violations: list[dict[str, Any]]

    def __repr__(self) -> str:
        if self.deterministic:
            return "DeterminismResult(deterministic=True)"
        lines = [f"DeterminismResult(deterministic=False, {len(self.violations)} overlapping pairs)"]
        for violation in self.violations:
            lines.append(f"  - {violation.get('reason', violation)}")
        return "\n".join(lines)

    def __bool__(self) -> bool:
        return self.deterministic
