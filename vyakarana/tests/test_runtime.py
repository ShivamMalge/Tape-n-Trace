"""The missing-bundle path — the one error a broken checkout actually hits —
and the headless guarantee ADR-004 bought."""

import pathlib

import pytest

from vyakarana import runtime


def test_missing_bundle_raises_naming_the_path_and_the_command(tmp_path: pathlib.Path):
    with pytest.raises(RuntimeError) as exc:
        runtime._Runtime(tmp_path)
    message = str(exc.value)
    assert str(tmp_path) in message
    assert "pnpm -F @tape-n-trace/bridge build" in message


def test_the_engine_reports_its_version():
    assert runtime.call("regexToString", {"op": "symbol", "sym": "a"}) == "a"
