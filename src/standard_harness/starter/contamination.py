"""Starter payload contamination checks."""

from __future__ import annotations

from pathlib import Path
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

    def check_root(self, root: str | Path) -> list[dict[str, object]]:
        starter_root = Path(root)
        diagnostics: list[dict[str, object]] = []
        readme = starter_root / "README.md"
        start_here = starter_root / "START_HERE.md"
        if not readme.exists():
            diagnostics.append(_path_diagnostic("missing_starter_readme", str(readme)))
        if not start_here.exists():
            diagnostics.append(_path_diagnostic("missing_starter_start_here", str(start_here)))
        if not starter_root.exists():
            diagnostics.append(_path_diagnostic("missing_starter_root", str(starter_root)))
            return diagnostics
        paths = [str(path) for path in starter_root.rglob("*")]
        diagnostics.extend(self.check_paths(paths))
        return diagnostics


def _classify(path: str) -> str | None:
    parts = PurePosixPath(path).parts
    lower = path.lower()
    name = PurePosixPath(path).name.lower()
    lowered_parts = {part.lower() for part in parts}
    if lowered_parts.intersection({".git", ".agents", ".codex"}):
        return "development_artifact"
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


def _path_diagnostic(error_code: str, path: str) -> dict[str, object]:
    normalized = path.replace("\\", "/")
    return {
        "error_code": error_code,
        "severity": "high",
        "category": "starter_contamination",
        "message": f"Starter payload path is not valid: {normalized}",
        "repair_hint": "Ensure the starter payload root contains README.md and START_HERE.md and excludes development artifacts.",
        "affected_entity_type": "path",
        "affected_entity_id": normalized,
    }
