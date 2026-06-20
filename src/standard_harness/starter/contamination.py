"""Starter payload contamination checks."""

from __future__ import annotations

from pathlib import PurePosixPath


class StarterContaminationChecker:
    def check_paths(self, paths: list[str]) -> list[dict[str, object]]:
        diagnostics: list[dict[str, object]] = []
        for path in paths:
            normalized = path.replace("\\", "/")
            error_code = _classify(normalized)
            if error_code is None:
                continue
            diagnostics.append(
                {
                    "error_code": error_code,
                    "severity": "high",
                    "category": "starter_contamination",
                    "message": f"Starter payload path is not allowed: {normalized}",
                    "repair_hint": "Remove local state, evidence, logs, secrets, caches, or generated reports from the starter payload.",
                    "affected_entity_type": "path",
                    "affected_entity_id": normalized,
                }
            )
        return diagnostics


def _classify(path: str) -> str | None:
    parts = PurePosixPath(path).parts
    lower = path.lower()
    name = PurePosixPath(path).name.lower()
    if ".harness" in parts and ("state" in parts or name.endswith(".sqlite3")):
        return "development_packet_state"
    if ".harness" in parts and "evidence" in parts:
        return "local_evidence"
    if "/logs/" in lower or name.endswith(".log"):
        return "local_logs"
    if name in {".env", ".env.local"} or "secret" in lower or "api_key" in lower:
        return "secrets"
    if "__pycache__" in parts or ".pytest_cache" in parts or ".mypy_cache" in parts:
        return "cache_files"
    if "external-review-attachments" in lower or "pasted-text" in lower:
        return "external_review_attachments"
    if "validation-report" in lower or "generated-validation" in lower:
        return "generated_validation_report"
    return None
