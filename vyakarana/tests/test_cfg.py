"""§5.4 — grammars, derivations, the pipeline, and the honesty of bounds."""

import pytest

from vyakarana import CFG, Ambiguous, NoCounterexample, ValidationError


def anbn() -> CFG:
    return CFG.from_text("S -> a S b | ε")


class TestConstruction:
    def test_from_text_and_direct_agree(self):
        direct = CFG(variables={"S"}, terminals={"a", "b"}, productions=[("S", ["a", "S", "b"]), ("S", [])], start="S")
        assert sorted(direct.sample(5)) == sorted(anbn().sample(5))

    def test_every_problem_at_once(self):
        with pytest.raises(ValidationError) as exc:
            CFG(variables={"S"}, terminals={"a"}, productions=[("T", ["a"]), ("S", ["z"])], start="X")
        assert len(exc.value.problems) == 3

    def test_parse_errors_carry_positions(self):
        with pytest.raises(ValidationError) as exc:
            CFG.from_text("no arrow here\nS -> a | | b")
        assert len(exc.value.problems) >= 2
        assert any("position" in p for p in exc.value.problems)


class TestDerivations:
    def test_derive_finds_aabb_and_the_tree_yields_it(self):
        d = anbn().derive("aabb")
        assert d.derived is True
        assert d.steps == 3
        assert d.parse_tree().yield_() == "aabb"
        assert d.export_trace()["kind"] == "grammar.derive"

    def test_a_bounded_miss_is_a_bound_not_a_verdict(self):
        d = anbn().derive("aab")
        assert d.derived is None
        assert "bound, not a verdict" in repr(d)

    def test_rightmost_order_is_accepted(self):
        assert anbn().derive("ab", order="rightmost").derived is True
        with pytest.raises(ValueError):
            anbn().derive("ab", order="sideways")


class TestAmbiguity:
    def test_the_classic_grammar_is_proven_ambiguous(self):
        g = CFG.from_text("E -> E + E | id")
        result = g.is_ambiguous()
        assert isinstance(result, Ambiguous)
        assert result.witness
        assert result.tree_a.root is not None

    def test_no_counterexample_prints_the_disclaimer_verbatim(self):
        result = anbn().is_ambiguous(max_length=10)
        assert isinstance(result, NoCounterexample)
        assert repr(result) == (
            "NoCounterexample(max_length=10)\n"
            "  No string up to length 10 has two distinct leftmost derivations.\n"
            "  This is NOT a proof of unambiguity — ambiguity of a CFG is undecidable."
        )


class TestPipeline:
    def test_to_cnf_runs_the_safe_order_and_lands_in_cnf(self):
        g = CFG.from_text("S -> A S B | ε\nA -> a A S | a\nB -> S b S | A | b b")
        cnf = g.to_cnf()
        for head, body in [(p["head"], p["body"]) for p in cnf._grammar["productions"]]:
            assert len(body) in (1, 2)
            if len(body) == 1:
                assert body[0] in cnf.terminals
            else:
                assert all(s in cnf.variables for s in body)
        # The language survives, minus ε (Thm 7.16).
        original = set(g.sample(50, max_length=5)) - {""}
        assert set(cnf.sample(50, max_length=5)) == original

    def test_stages_exist_individually(self):
        g = CFG.from_text("S -> A | a\nA -> S")
        no_unit = g.remove_unit()
        assert all(
            not (len(p["body"]) == 1 and p["body"][0] in no_unit.variables)
            for p in no_unit._grammar["productions"]
        )


class TestMembership:
    def test_generates_and_sample_and_pda(self):
        g = anbn()
        assert g.generates("aabb") is True
        assert g.generates("aab") is False
        assert g.sample(3, max_length=4) == ["", "ab", "aabb"]
        p = g.to_pda()
        assert p.accepts("aaabbb") is True
        assert g.to_text().startswith("S ->")
