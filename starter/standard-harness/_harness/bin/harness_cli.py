"""Thin wrapper for the Standard Harness starter CLI."""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SYSTEM = ROOT / "_harness" / "system"

if str(SYSTEM) not in sys.path:
    sys.path.insert(0, str(SYSTEM))

from standard_harness.cli.main import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
