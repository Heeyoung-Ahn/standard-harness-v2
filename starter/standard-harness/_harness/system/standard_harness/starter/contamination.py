"""Starter payload contamination checks."""

from __future__ import annotations

from pathlib import Path
from pathlib import PurePosixPath


REQUIRED_STARTER_FILES = {
    "README.md": "missing_starter_readme",
    "START_HERE.md": "missing_starter_start_here",
    "_harness/README.md": "missing_starter_harness_readme",
    "_harness/bin/harness_cli.py": "missing_starter_harness_bin_cli",
    "_harness/policies/project-operating-folders.yaml": "missing_starter_project_operating_folders_policy",
    "_harness/schemas/operating-folder-contract.schema.json": "missing_starter_operating_folder_contract_schema",
}


REQUIRED_STARTER_DIRECTORIES = {
    "_harness": "missing_starter_harness_root",
    "_harness/bin": "missing_starter_harness_bin",
    "_harness/system/standard_harness": "missing_starter_harness_system_standard_harness",
    "_harness/policies": "missing_starter_harness_policies",
    "_harness/schemas": "missing_starter_harness_schemas",
    "_harness/catalog": "missing_starter_harness_catalog",
    "_harness/contracts": "missing_starter_harness_contracts",
    "_harness/examples": "missing_starter_harness_examples",
    "_ops/packets": "missing_starter_ops_packets",
    "_ops/evidence": "missing_starter_ops_evidence",
    "_ops/decisions/records": "missing_starter_ops_decision_records",
    "_ops/wiki-proposals": "missing_starter_ops_wiki_proposals",
    "_ops/wiki": "missing_starter_ops_wiki",
    "_ops/backlog": "missing_starter_ops_backlog",
    "_ops/metrics": "missing_starter_ops_metrics",
    "_ops/active-context": "missing_starter_ops_active_context",
    "product/src": "missing_starter_product_src",
    "product/tests": "missing_starter_product_tests",
    "product/docs/project/planning": "missing_starter_product_docs_project_planning",
    "product/docs/project/architecture": "missing_starter_product_docs_project_architecture",
    "product/docs/project/implementation": "missing_starter_product_docs_project_implementation",
    "product/docs/project/api": "missing_starter_product_docs_project_api",
    "product/docs/project/database": "missing_starter_product_docs_project_database",
    "product/docs/project/ui-design": "missing_starter_product_docs_project_ui_design",
    "product/docs/packets": "missing_starter_product_docs_packets",
    "product/docs/pmo": "missing_starter_product_docs_pmo",
    "product/docs/pmo/day-wrap-up": "missing_starter_product_docs_pmo_day_wrap_up",
    "product/docs/pmo/wbs": "missing_starter_product_docs_pmo_wbs",
}

FORBIDDEN_STARTER_DIRECTORIES = {
    "product/docs/pmo/daily-wrap-up": "legacy_pmo_folder",
    "product/docs/pmo/source-intake": "structured_pmo_state_as_markdown_folder",
    "product/docs/pmo/daily-reports": "structured_pmo_state_as_markdown_folder",
    "product/docs/pmo/status": "structured_pmo_state_as_markdown_folder",
    "product/docs/pmo/risks": "structured_pmo_state_as_markdown_folder",
    "product/docs/pmo/blockers": "structured_pmo_state_as_markdown_folder",
    "product/docs/pmo/day-start": "generated_pmo_view_as_required_markdown_folder",
}


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
                    "boundary_zone": "starter",
                }
            )
        return diagnostics

    def check_root(
        self,
        root: str | Path,
        *,
        allow_runtime_generated: bool = False,
    ) -> list[dict[str, object]]:
        starter_root = Path(root)
        diagnostics: list[dict[str, object]] = []
        if not starter_root.exists():
            diagnostics.append(_path_diagnostic("missing_starter_root", str(starter_root)))
            return diagnostics
        diagnostics.extend(_missing_required_paths(starter_root))
        paths = [str(path) for path in starter_root.rglob("*")]
        diagnostics.extend(self.check_paths(paths))
        if allow_runtime_generated:
            diagnostics = [
                diagnostic
                for diagnostic in diagnostics
                if not _is_runtime_generated_diagnostic(starter_root, diagnostic)
            ]
        return diagnostics


def _classify(path: str) -> str | None:
    parts = PurePosixPath(path).parts
    lower = path.lower()
    name = PurePosixPath(path).name.lower()
    lowered_parts = {part.lower() for part in parts}
    normalized_parts = tuple(part.lower() for part in parts)
    if lowered_parts.intersection({".git", ".agents", ".codex"}):
        return "development_artifact"
    if name in {"agents.md", "agent.md", "claude.md", "gemini.md"}:
        return "provider_specific_entry_contract"
    if name.endswith((".sqlite", ".sqlite3", ".db")):
        return "development_packet_state"
    if ".harness" in lowered_parts and ("state" in lowered_parts or name.endswith(".sqlite3")):
        return "development_packet_state"
    if ".harness" in lowered_parts and "evidence" in lowered_parts:
        return "local_evidence"
    if "/logs/" in lower or name.endswith(".log"):
        return "local_logs"
    if name in {".env", ".env.local"} or "secret" in lower or "api_key" in lower:
        return "secrets"
    if "__pycache__" in lowered_parts or ".pytest_cache" in lowered_parts or ".mypy_cache" in lowered_parts:
        return "cache_files"
    if "external-review-attachments" in lower or "pasted-text" in lower:
        return "external_review_attachments"
    if "validation-report" in lower or "generated-validation" in lower:
        return "generated_validation_report"
    if "_ops/evidence/release" in lower or "docs/release/evidence" in lower:
        return "release_evidence"
    if _is_real_ops_history(normalized_parts, name):
        if _contains_sequence(normalized_parts, ("_ops", "packets")):
            return "real_packet_history"
        if _contains_sequence(normalized_parts, ("_ops", "evidence")):
            return "real_evidence_history"
        if _contains_sequence(normalized_parts, ("_ops", "active-context")):
            return "generated_active_context"
    return None


def _is_real_ops_history(parts: tuple[str, ...], name: str) -> bool:
    if name == ".gitkeep":
        return False
    return (
        _contains_sequence_with_child(parts, ("_ops", "packets"))
        or _contains_sequence_with_child(parts, ("_ops", "evidence"))
        or _contains_sequence_with_child(parts, ("_ops", "active-context"))
    )


def _starts_with(parts: tuple[str, ...], prefix: tuple[str, ...]) -> bool:
    return len(parts) >= len(prefix) and parts[: len(prefix)] == prefix


def _contains_sequence(parts: tuple[str, ...], sequence: tuple[str, ...]) -> bool:
    if len(parts) < len(sequence):
        return False
    return any(parts[index : index + len(sequence)] == sequence for index in range(len(parts) - len(sequence) + 1))


def _contains_sequence_with_child(parts: tuple[str, ...], sequence: tuple[str, ...]) -> bool:
    if len(parts) <= len(sequence):
        return False
    return any(
        parts[index : index + len(sequence)] == sequence and len(parts) > index + len(sequence)
        for index in range(len(parts) - len(sequence) + 1)
    )


def _missing_required_paths(starter_root: Path) -> list[dict[str, object]]:
    diagnostics: list[dict[str, object]] = []
    for relative, error_code in REQUIRED_STARTER_FILES.items():
        path = starter_root / relative
        if not path.is_file():
            diagnostics.append(_path_diagnostic(error_code, str(path)))
    for relative, error_code in REQUIRED_STARTER_DIRECTORIES.items():
        path = starter_root / relative
        if not path.is_dir():
            diagnostics.append(_path_diagnostic(error_code, str(path)))
    for relative, error_code in FORBIDDEN_STARTER_DIRECTORIES.items():
        path = starter_root / relative
        if path.is_dir():
            diagnostics.append(_path_diagnostic(error_code, str(path)))
    return diagnostics


def _is_runtime_generated_diagnostic(starter_root: Path, diagnostic: dict[str, object]) -> bool:
    error_code = str(diagnostic.get("error_code", ""))
    path = Path(str(diagnostic.get("affected_entity_id", "")))
    try:
        relative = path.resolve().relative_to(starter_root.resolve())
    except (OSError, ValueError):
        return False
    normalized = relative.as_posix().lower()
    if error_code == "cache_files" and "__pycache__" in normalized:
        return True
    if error_code == "development_packet_state" and normalized.startswith(".harness/"):
        return True
    return False


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
        "boundary_zone": "starter",
    }
