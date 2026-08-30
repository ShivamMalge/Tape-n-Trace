"""§5.5 — PDAs, the textbook ID log, and the DPDA report."""

import pytest

from vyakarana import PDA, ValidationError

ANBN = dict(
    states={"q0", "q1", "q2"},
    input_alphabet={"a", "b"},
    stack_alphabet={"Z0", "A"},
    transitions={
        ("q0", "a", "Z0"): {("q0", ("A", "Z0"))},
        ("q0", "a", "A"): {("q0", ("A", "A"))},
        ("q0", "b", "A"): {("q1", ())},
        ("q1", "b", "A"): {("q1", ())},
        ("q0", None, "Z0"): {("q2", ("Z0",))},
        ("q1", None, "Z0"): {("q2", ("Z0",))},
    },
    start="q0",
    start_stack="Z0",
    accepting={"q2"},
)


def anbn() -> PDA:
    return PDA(**ANBN)


def test_accepts_and_the_textbook_id_log():
    p = anbn()
    assert p.accepts("aabb") is True
    assert p.accepts("aab") is False
    log = p.run("aabb").id_log()
    assert log.startswith("(q0, aabb, Z0) ⊢ ")
    assert log.endswith("(q2, ε, Z0)")
    assert " ⊢ " in log


def test_acceptance_conversions_round_trip_on_a_sample():
    p = anbn()
    n = p.to_empty_stack()
    back = n.to_final_state()
    for word in ["", "ab", "aabb", "abab", "ba", "aaabbb"]:
        assert n.accepts(word) == p.accepts(word), word
        assert back.accepts(word) == p.accepts(word), word


def test_determinism_report_names_the_overlapping_pairs():
    report = anbn().is_deterministic()
    assert report.deterministic is False
    assert bool(report) is False
    assert any("ε-move" in v["reason"] for v in report.violations)


def test_to_cfg_is_an_honest_refusal():
    with pytest.raises(NotImplementedError, match="6.3.2"):
        anbn().to_cfg()


def test_validation_every_problem_at_once():
    with pytest.raises(ValidationError) as exc:
        PDA(
            states={"q"},
            input_alphabet={"a"},
            stack_alphabet={"Z"},
            transitions={("q", "x", "Y"): {("ghost", ("W",))}},
            start="nowhere",
            start_stack="Z",
        )
    assert len(exc.value.problems) >= 4
