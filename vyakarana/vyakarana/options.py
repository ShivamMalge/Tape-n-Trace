"""Global rendering options — documentation.md §6. Rendering only: nothing
here changes what the engine computes."""

from __future__ import annotations

from typing import Any

_DEFAULTS: dict[str, Any] = {"theme": "auto", "speed": 1.0, "layout": "layered", "max_steps": 10_000}
_ALLOWED = {
    "theme": ("light", "dark", "auto"),
    "layout": ("layered", "manual"),
}
_current = dict(_DEFAULTS)


def options(**overrides: Any) -> dict[str, Any]:
    """Set global options; returns the effective set. ``options()`` reads."""
    for key, value in overrides.items():
        if key not in _DEFAULTS:
            raise ValueError(f"unknown option {key!r}; the options are {sorted(_DEFAULTS)}")
        if key in _ALLOWED and value not in _ALLOWED[key]:
            raise ValueError(f"{key} must be one of {_ALLOWED[key]}, not {value!r}")
        if key == "speed" and not 0.25 <= float(value) <= 4.0:
            raise ValueError("speed must be between 0.25 and 4.0")
        _current[key] = value
    return dict(_current)


def merged(overrides: dict[str, Any]) -> dict[str, Any]:
    out = dict(_current)
    out.update(overrides)
    return out
