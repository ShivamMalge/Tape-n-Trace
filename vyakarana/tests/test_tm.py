"""§5.6 — Turing machines, the gallery, and a step guard that never lies."""

import pytest

from vyakarana import TM, Halted, ValidationError
from vyakarana import gallery


class TestGallery:
    def test_the_worked_example_reproduces_the_textbook_id_log(self):
        sim = gallery.zeros_ones.run("0011")
        assert sim.accepted is True
        assert sim.id_log() == (
            "q₀0011 ⊢ Xq₁011 ⊢ X0q₁11 ⊢ Xq₂0Y1 ⊢ q₂X0Y1 ⊢ Xq₀0Y1 ⊢ XXq₁Y1 ⊢ XXYq₁1 "
            "⊢ XXq₂YY ⊢ Xq₂XYY ⊢ XXq₀YY ⊢ XXYq₃Y ⊢ XXYYq₃B ⊢ XXYYBq₄B"
        )

    def test_the_gallery_is_complete_and_the_nonhalting_machine_is_labelled(self):
        machines = gallery.all_machines()
        assert len(machines) == 15
        assert "DOES NOT HALT" in gallery.never_halts.__doc__

    def test_the_tracks_machine_encodes_typed_input(self):
        assert gallery.tracks.accepts("01c01") is True
        assert gallery.tracks.accepts("01c10") is False


class TestStepGuard:
    def test_never_a_silent_false_driven_twice_through_the_cap(self):
        verdict = gallery.never_halts.accepts("1", max_steps=50)
        assert verdict is Halted.NO
        assert not verdict  # falsy, so `if accepts(...)` stays safe
        assert verdict is not False  # but never the claim of a rejection

        sim = gallery.never_halts.run("1", max_steps=50)
        assert sim.stopped is True
        assert sim.accepted is None

        further = sim.continue_for(50)
        assert further.stopped is True
        assert further.trace["steps"][-1]["snapshot"]["moves"] >= sim.trace["steps"][-1]["snapshot"]["moves"]

    def test_a_halting_run_refuses_to_continue(self):
        sim = gallery.zeros_ones.run("01")
        with pytest.raises(ValueError, match="halted on its own"):
            sim.continue_for(100)


class TestConstruction:
    def test_a_two_tape_machine_and_its_reduction(self):
        two = TM(
            states={"p0", "p1", "pa"},
            input_alphabet={"0", "1"},
            tape_alphabet={"0", "1", "B"},
            blank="B",
            transitions={
                ("p0", ("0", "B")): ("p0", ("0", "0"), ("R", "R")),
                ("p0", ("1", "B")): ("p1", ("1", "B"), ("S", "L")),
                ("p0", ("B", "B")): ("pa", ("B", "B"), ("S", "S")),
                ("p1", ("1", "0")): ("p1", ("1", "0"), ("R", "L")),
                ("p1", ("B", "B")): ("pa", ("B", "B"), ("S", "S")),
            },
            start="p0",
            accepting={"pa"},
            tapes=2,
        )
        assert two.accepts("0011") is True
        single = two.to_single_tape()
        assert single.tapes == 1

    def test_single_tape_validation_all_at_once(self):
        with pytest.raises(ValidationError) as exc:
            TM(
                states={"q"},
                input_alphabet={"0", "B"},
                tape_alphabet={"0", "B"},
                blank="B",
                transitions={("q", "0"): ("q", "0", "S")},
                start="q",
                accepting=set(),
            )
        codes = [p["code"] for p in exc.value.problems]
        assert "TM_STATIONARY" in codes
        assert "TM_BLANK_IS_INPUT" in codes

    def test_nondeterministic_runs_carry_the_branch_tree(self):
        sim = gallery.nondeterministic.run("01")
        nodes = sim.trace["steps"][-1]["snapshot"]["nodes"]
        assert len(nodes) > 3  # a tree of IDs, not a single path
        assert sim.accepted is True

    def test_tape_view_requires_a_run_and_a_real_convention(self):
        machine = gallery.busy_beaver_2
        with pytest.raises(ValueError, match="run the machine first"):
            TM._from_machine(machine._machine).tape_view()
        machine.run("")
        with pytest.raises(ValueError, match="convention"):
            machine.tape_view(convention="upside-down")
        assert machine.tape_view(convention="head-moves") is None  # headless: nothing displays
