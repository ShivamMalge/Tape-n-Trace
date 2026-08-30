"""The anywidget class and the display helper.

Rendering goes to the browser through anywidget in every environment
(ADR-004); values never do. In a plain script or under pytest there is no
IPython shell, so `show` quietly returns None and the caller's plain value is
the whole story — which is exactly the headless behaviour V0 measured."""

from __future__ import annotations

from typing import Any

import anywidget
import traitlets

from . import options as _options
from .runtime import STATIC


class TntWidget(anywidget.AnyWidget):
    _esm = STATIC / "widget.js"
    _css = STATIC / "widget.css"

    payload = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)
    trace = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)
    step = traitlets.Int(0).tag(sync=True)
    options = traitlets.Dict().tag(sync=True)


def show(
    trace: dict[str, Any] | None = None,
    payload: dict[str, Any] | None = None,
    **overrides: Any,
) -> TntWidget | None:
    """Display a widget when a notebook is attached; otherwise do nothing."""
    try:
        from IPython import get_ipython
        from IPython.display import display
    except ImportError:
        return None
    if get_ipython() is None:
        return None
    widget = TntWidget(trace=trace, payload=payload, options=_options.merged(overrides))
    display(widget)
    return widget
