"""CI gate: the installed vyakarana is this checkout's, not a release.

`pip install vyakarana==<version> --find-links dist` also matches the released
wheel of that version on PyPI, and pip may pick either. When it picks PyPI, the
whole pytest job silently tests the last release: a fix shipped in the commit
passes CI while still being broken in the tree. CI installs the built wheel by
path now; this proves it worked, by comparing every module in the package.
"""

from __future__ import annotations

import pathlib
import sys


def modules(root: pathlib.Path) -> dict[str, str]:
    return {p.relative_to(root).as_posix(): p.read_text(encoding="utf-8") for p in sorted(root.rglob("*.py"))}


def main() -> int:
    import vyakarana

    # Beside this script, not relative to the cwd, so it reads the same from
    # the repository root and from the project directory.
    checkout = (pathlib.Path(__file__).resolve().parent.parent / "vyakarana").resolve()
    if not checkout.is_dir():
        print(f"no package to compare against at {checkout}")
        return 1
    installed = pathlib.Path(vyakarana.__file__).parent.resolve()
    if installed == checkout:
        print(f"the checkout itself is on sys.path at {installed}; the wheel is not under test")
        return 1

    here, there = modules(checkout), modules(installed)
    differing = sorted({name for name in here.keys() | there.keys() if here.get(name) != there.get(name)})
    if differing:
        print(f"the installed vyakarana at {installed} is not this checkout's.")
        print("differing modules: " + ", ".join(differing))
        return 1

    print(f"installed from {installed}, matching the checkout ({len(here)} modules)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
