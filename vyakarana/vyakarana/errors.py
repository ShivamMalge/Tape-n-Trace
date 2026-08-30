"""The one exception user input can raise — carrying every problem, not the
first, exactly as the engine's Result contract does (architecture.md §4)."""

from __future__ import annotations

from typing import Any


class ValidationError(Exception):
    """Raised with the full list of problems a machine, grammar or expression has.

    Each problem is a dict with at least ``code`` and ``message``; typed input
    (regular expressions, grammars) may add ``position``, a character offset.
    """

    def __init__(self, problems: list[dict[str, Any]]):
        self.problems = list(problems)
        super().__init__(self._render())

    def _render(self) -> str:
        if len(self.problems) == 1:
            return str(self.problems[0].get("message", self.problems[0]))
        lines = [f"{len(self.problems)} problems:"]
        for problem in self.problems:
            lines.append(f"  - {problem.get('message', problem)}")
        return "\n".join(lines)
