"""Context-free grammars — documentation.md §5.4."""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from . import runtime
from .errors import ValidationError
from .results import Ambiguous, AmbiguityResult, Derivation, NoCounterexample, ParseTree
from .widget import show


class CFG:
    def __init__(
        self,
        variables: Iterable[str],
        terminals: Iterable[str],
        productions: Iterable[tuple[str, Iterable[str]]],
        start: str,
    ):
        variables = sorted(set(variables))
        terminals = sorted(set(terminals))
        known = set(variables) | set(terminals)
        problems: list[dict[str, Any]] = []
        body_list: list[dict[str, Any]] = []
        for head, body in productions:
            symbols = list(body)
            if head not in variables:
                problems.append({"code": "VYK_HEAD_UNKNOWN", "message": f"The production head {head!r} is not a variable.", "subject": {"kind": "production"}})
            for symbol in symbols:
                if symbol not in known:
                    problems.append({"code": "VYK_SYMBOL_UNKNOWN", "message": f"{symbol!r} in a body of {head} is neither a variable nor a terminal.", "subject": {"kind": "production"}})
            body_list.append({"head": head, "body": symbols})
        if start not in variables:
            problems.append({"code": "VYK_START_UNKNOWN", "message": f"The start symbol {start!r} is not a variable.", "subject": {"kind": "production"}})
        if problems:
            raise ValidationError(problems)
        self._grammar: dict[str, Any] = {"variables": variables, "terminals": terminals, "productions": body_list, "start": start}
        self._last_trace: dict[str, Any] | None = None
        self._pda: dict[str, Any] | None = None

    @classmethod
    def from_text(cls, source: str, start: str | None = None) -> "CFG":
        grammar = runtime.call_result("parseGrammar", source, {} if start is None else {"start": start})
        return cls._from_grammar(grammar)

    @classmethod
    def _from_grammar(cls, grammar: dict[str, Any], trace: dict[str, Any] | None = None) -> "CFG":
        instance = object.__new__(cls)
        instance._grammar = grammar
        instance._last_trace = trace
        instance._pda = None
        return instance

    # -- derivations -----------------------------------------------------------
    def derive(self, word: str, order: str = "leftmost", **overrides: Any) -> Derivation:
        if order not in ("leftmost", "rightmost"):
            raise ValueError("order is 'leftmost' or 'rightmost' (Hopcroft §5.1.4)")
        trace = runtime.call_result("deriveString", self._grammar, self._tokens(word), order)
        self._last_trace = trace
        rendered = show(trace=trace, **overrides)
        result = trace["result"]
        if result["type"] == "value":
            return Derivation(derived=True, steps=result["value"]["steps"], trace=trace, _widget=rendered)
        return Derivation(derived=None, steps=None, trace=trace, _widget=rendered)

    def parse_tree(self, word: str, **overrides: Any) -> ParseTree:
        return self.derive(word, **overrides).parse_tree()

    def is_ambiguous(self, max_length: int = 10) -> AmbiguityResult:
        if max_length != 10:
            raise ValueError("the engine searches sentential forms to length 10; other bounds need an engine-side cap change")
        outcome = runtime.call_result("detectAmbiguity", self._grammar)
        if outcome["ambiguous"]:
            trees = outcome.get("trees") or [None, None]
            witness = outcome["witness"]
            word = witness if isinstance(witness, str) else "".join(witness)
            return Ambiguous(witness=word, tree_a=ParseTree(root=trees[0]), tree_b=ParseTree(root=trees[1]))
        return NoCounterexample(max_length=max_length)

    # -- the simplification pipeline, in Theorem 7.14's safe order -------------
    def remove_epsilon(self, **overrides: Any) -> "CFG":
        return self._stage("eliminateEpsilon", **overrides)

    def remove_unit(self, **overrides: Any) -> "CFG":
        return self._stage("eliminateUnit", **overrides)

    def remove_useless(self, **overrides: Any) -> "CFG":
        return self._stage("eliminateUseless", **overrides)

    def to_cnf(self, **overrides: Any) -> "CFG":
        """ε-productions, unit productions, useless symbols, then CNF — the
        safe order of Hopcroft Thm 7.14; each stage renders."""
        stage = self.remove_epsilon(**overrides).remove_unit(**overrides).remove_useless(**overrides)
        return stage._stage("toCNF", **overrides)

    def _stage(self, name: str, **overrides: Any) -> "CFG":
        trace = runtime.call_result(name, self._grammar)
        show(trace=trace, **overrides)
        return CFG._from_grammar(trace["result"]["grammar"], trace)

    # -- machines and membership ----------------------------------------------
    def to_pda(self, **overrides: Any):
        from .pda import PDA

        trace = runtime.call_result("cfgToPDA", self._grammar)
        self._last_trace = trace
        show(trace=trace, **overrides)
        return PDA._from_machine(trace["result"]["machine"], trace)

    def generates(self, word: str) -> bool:
        if self._pda is None:
            self._pda = runtime.call_result("cfgToPDA", self._grammar)["result"]["machine"]
        verdict = runtime.call("acceptsPDA", self._pda, self._tokens(word))
        if verdict is None:
            raise RuntimeError(
                "the bounded search hit its cap without a verdict — this grammar's PDA does not settle "
                "membership within the step guard (a left-recursive grammar can do this)"
            )
        return bool(verdict)

    def sample(self, n: int = 10, max_length: int = 8) -> list[str]:
        words = sorted(runtime.call("generatedStrings", self._grammar, max_length), key=lambda w: (len(w), w))
        return words[: int(n)]

    def to_text(self) -> str:
        return str(runtime.call("grammarToText", self._grammar))

    def export_trace(self) -> dict[str, Any]:
        if self._last_trace is None:
            raise ValueError("no trace yet — run an operation first (derive, to_cnf, to_pda, …)")
        return self._last_trace

    def _tokens(self, word: str | Iterable[str]) -> list[str]:
        if isinstance(word, str):
            # Multi-character terminals (id, +, …) need explicit token lists;
            # a plain string splits per character, matching the web app.
            return list(word)
        return list(word)

    @property
    def variables(self) -> list[str]:
        return list(self._grammar["variables"])

    @property
    def terminals(self) -> list[str]:
        return list(self._grammar["terminals"])

    @property
    def start(self) -> str:
        return str(self._grammar["start"])

    def __repr__(self) -> str:
        g = self._grammar
        return f"CFG({len(g['variables'])} variables, {len(g['productions'])} productions, start {g['start']})"
