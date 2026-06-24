"""Release evidence helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


REQUIRED_FULL_REGRESSION_FIELDS = {
    "evidenceId",
    "command",
    "result",
    "durationSeconds",
    "logPath",
    "timeoutStatus",
    "lastTest",
    "headCommit",
    "generatedAt",
    "generatedBy",
}


def load_full_regression_evidence(repo_root: str | Path) -> dict[str, Any]:
    path = Path(repo_root) / "_ops/evidence/release/v21-full-regression.json"
    return json.loads(path.read_text(encoding="utf-8"))


def missing_full_regression_fields(evidence: dict[str, Any]) -> list[str]:
    return sorted(REQUIRED_FULL_REGRESSION_FIELDS - set(evidence))
