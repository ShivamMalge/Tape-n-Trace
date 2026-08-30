"""V2 acceptance criteria — the regular-language surface, headless."""

import pytest

from vyakarana import DFA, ENFA, NFA, RE, ValidationError

ODD_ZEROS = dict(
    states={"a", "b"},
    alphabet={"0", "1"},
    transitions={("a", "0"): "b", ("a", "1"): "a", ("b", "0"): "a", ("b", "1"): "b"},
    start="a",
    accepting={"b"},
)


def odd_zeros() -> DFA:
    return DFA(**ODD_ZEROS)


class TestValues:
    def test_accepts_returns_a_plain_bool(self):
        d = odd_zeros()
        assert d.accepts("011") is True
        assert d.accepts("0110") is False
        assert d.accepts("") is False

    def test_run_returns_a_simulation_and_run_all_a_dict(self):
        d = odd_zeros()
        sim = d.run("011")
        assert sim.accepted is True
        assert sim.export_trace()["kind"] == "simulate.dfa"
        assert d.run_all(["0", "00", "000"]) == {"0": True, "00": False, "000": True}


class TestValidation:
    def test_every_problem_at_once(self):
        with pytest.raises(ValidationError) as exc:
            DFA(
                states={"a"},
                alphabet={"0"},
                transitions={("a", "0"): "ghost", ("a", "9"): "a"},
                start="nowhere",
                accepting={"gone"},
            )
        assert len(exc.value.problems) >= 3
        text = str(exc.value)
        assert "nowhere" in text and "ghost" in text

    def test_epsilon_is_none_and_only_in_enfa(self):
        with pytest.raises(ValidationError, match="needs an ENFA"):
            NFA(states={"q"}, alphabet={"a"}, transitions={("q", None): {"q"}}, start="q", accepting=set())

        n = ENFA(
            states={"q0", "q1", "q2"},
            alphabet={"a", "b"},
            transitions={("q0", None): {"q1"}, ("q1", "a"): {"q2"}},
            start="q0",
            accepting={"q2"},
        )
        assert n.epsilon_closure("q0") == {"q0", "q1"}
        assert n.accepts("a") is True


class TestConversions:
    def test_minimize_to_regex_chains(self):
        regex = odd_zeros().minimize().to_regex()
        assert regex.pattern
        assert regex.matches("011") is True
        assert regex.matches("0110") is False

    def test_nfa_to_dfa_preserves_the_language(self):
        n = NFA(
            states={"p", "q"},
            alphabet={"0", "1"},
            transitions={("p", "0"): {"p", "q"}, ("p", "1"): {"p"}},
            start="p",
            accepting={"q"},
        )
        d = n.to_dfa()
        for word in ["0", "10", "110", "01", "1", ""]:
            assert d.accepts(word) == n.accepts(word), word

    def test_complement_requires_completeness_and_points_at_completed(self):
        partial = DFA(
            states={"a", "b"},
            alphabet={"0", "1"},
            transitions={("a", "0"): "b"},
            start="a",
            accepting={"b"},
        )
        with pytest.raises(ValidationError, match="completed"):
            partial.complement()
        flipped = partial.completed().complement()
        assert flipped.accepts("0") is False
        assert flipped.accepts("1") is True

    def test_reverse_returns_an_nfa(self):
        r = odd_zeros().reverse()
        assert isinstance(r, NFA)
        assert r.accepts("110") is True


class TestEquivalence:
    def test_shortest_witness_and_side(self):
        ends_zero = DFA(
            states={"e", "z"},
            alphabet={"0", "1"},
            transitions={("e", "0"): "z", ("e", "1"): "e", ("z", "0"): "z", ("z", "1"): "e"},
            start="e",
            accepting={"z"},
        )
        ends_one = DFA(
            states={"e", "o"},
            alphabet={"0", "1"},
            transitions={("e", "0"): "e", ("e", "1"): "o", ("o", "0"): "e", ("o", "1"): "o"},
            start="e",
            accepting={"o"},
        )
        result = ends_zero.equivalent_to(ends_one)
        assert result.equivalent is False
        assert result.witness in {"0", "1"}
        assert "accepts" in (result.side or "")

        same = odd_zeros().equivalent_to(odd_zeros())
        assert same.equivalent is True
        assert same.witness is None


class TestJson:
    def test_round_trip_in_the_native_format(self):
        d = odd_zeros()
        data = d.to_json()
        assert data["format"] == "tape-n-trace/machine@1"
        back = DFA.from_json(data)
        assert isinstance(back, DFA)
        assert back.to_json() == data

    def test_wrong_header_is_refused(self):
        with pytest.raises(ValueError, match="format header"):
            DFA.from_json({"machine": {}})


class TestRegularExpressions:
    def test_parse_tree_and_matching(self):
        r = RE("(0|1)*01")
        assert r.matches("0101") is True
        assert r.matches("010") is False
        assert r.parse_tree().yield_()

    def test_parse_errors_are_validation_errors(self):
        with pytest.raises(ValidationError):
            RE("(0|1")

    def test_to_dfa_accepts_the_same_strings(self):
        d = RE("(0|1)*01").to_dfa()
        assert d.accepts("11101") is True
        assert d.accepts("10") is False

    def test_keyword_nfa(self):
        d = NFA.for_keywords(["ab"]).to_dfa()
        assert d.accepts("ab") is True
