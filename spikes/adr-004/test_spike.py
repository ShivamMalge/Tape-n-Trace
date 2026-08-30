"""ADR-004's headless question, as a test: value-returning calls must work
under pytest with no notebook frontend attached."""

import spike


def setup_module() -> None:
    spike.ensure_bundle()


def test_quickjs_headless() -> None:
    result = spike.run_quickjs()
    assert spike.check(result) == []


def test_mini_racer_headless() -> None:
    result = spike.run_mini_racer()
    assert spike.check(result) == []
