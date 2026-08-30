"""Where the engine executes — ADR-004, decided: an embedded V8 (mini-racer)
evaluates the bundled engine, and every call is synchronous.

Python builds JSON, the engine computes, JSON comes back. There is exactly one
subset construction in this project, and this module is why the Python package
did not become the second."""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

from .errors import ValidationError

STATIC = Path(__file__).resolve().parent / "static"
BUILD_COMMAND = "pnpm -F @tape-n-trace/bridge build"

# JSON round-trips everything except the engine's occasional Set return.
_CALL_HELPER = """
function __vyk(name, argsJson) {
    try {
        const parts = name.split('.');
        let fn = TNT;
        for (const part of parts) fn = fn[part];
        if (typeof fn !== 'function') {
            return JSON.stringify({ ok: false, thrown: 'not an engine function: ' + name });
        }
        let value = fn(...JSON.parse(argsJson));
        if (value instanceof Set) value = [...value];
        if (value instanceof Map) value = Object.fromEntries(value);
        return JSON.stringify({ ok: true, value: value === undefined ? null : value });
    } catch (error) {
        return JSON.stringify({ ok: false, thrown: String((error && error.message) || error) });
    }
}
"""


class _Runtime:
    def __init__(self, static_dir: Path):
        engine_path = static_dir / "engine.js"
        if not engine_path.exists():
            raise RuntimeError(
                f"JS engine bundle not found at {engine_path}. "
                f"This is a development checkout without a built bundle — run: {BUILD_COMMAND}. "
                "(A pip-installed vyakarana always ships it.)"
            )
        from py_mini_racer import MiniRacer

        self._racer = MiniRacer()
        self._racer.eval(engine_path.read_text(encoding="utf-8"))
        self._racer.eval(_CALL_HELPER)

    def call(self, name: str, *args: Any) -> Any:
        """Call an engine export and return its value, engine exceptions surfaced."""
        raw = self._racer.eval(f"__vyk({json.dumps(name)}, {json.dumps(json.dumps(list(args)))})")
        out = json.loads(raw)
        if not out["ok"]:
            raise RuntimeError(f"engine call {name} threw: {out['thrown']}")
        return out["value"]

    def call_result(self, name: str, *args: Any) -> Any:
        """Call an engine export returning `Result<T>`: unwrap, or raise with every problem."""
        value = self.call(name, *args)
        if isinstance(value, dict) and set(value) >= {"ok"}:
            if value["ok"]:
                return value["value"]
            raise ValidationError(value["errors"])
        return value


_instance: _Runtime | None = None
_lock = threading.Lock()


def engine() -> _Runtime:
    global _instance
    if _instance is None:
        with _lock:
            if _instance is None:
                _instance = _Runtime(STATIC)
    return _instance


def call(name: str, *args: Any) -> Any:
    return engine().call(name, *args)


def call_result(name: str, *args: Any) -> Any:
    return engine().call_result(name, *args)
