"""Release-blocking Wiki knowledge validation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


BLOCKED_CURRENT_SOURCE_TIERS = {"seed", "projection", "generated", "low-authority"}
AUTHORITY_OVERRIDE_TERMS = (
    "override",
    "overrides",
    "authoritative over",
    "takes precedence over",
)
CANONICAL_TARGET_TERMS = (
    "_harness",
    "requirements",
    "policies",
    "schemas",
    "validators",
    "gate results",
    "trusted evidence",
    "human decisions",
    "release gate",
)
SKILL_AUTHORITY_TERMS = (
    "selectedby:",
    "can authorize skills",
    "can authorise skills",
    "may authorize skills",
    "may authorise skills",
    "can authorize gates",
    "may authorize gates",
    "can authorize release",
    "may authorize release",
    "release gates",
    "permission grant",
)


class WikiKnowledgeValidator:
    validator_id = "wiki-knowledge-validator"
    gate_id = "wiki-governance-gate"

    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)

    def validate_release(self) -> dict[str, Any]:
        diagnostics: list[str] = []
        wiki_root = self.repo_root / "_ops" / "wiki"
        if wiki_root.exists():
            pages_by_path: dict[str, dict[str, Any]] = {}
            for path in sorted(wiki_root.glob("*.md")):
                relative = path.relative_to(self.repo_root).as_posix()
                metadata, body = _front_matter(path)
                pages_by_path[relative] = metadata
                self._validate_page(relative, metadata, body, diagnostics)
            self._validate_index(wiki_root / "index.yaml", pages_by_path, diagnostics)
        return self._result(diagnostics)

    def _validate_page(
        self,
        relative: str,
        metadata: dict[str, Any],
        body: str,
        diagnostics: list[str],
    ) -> None:
        source_tier = str(metadata.get("sourceTier", "")).lower()
        review_status = str(metadata.get("reviewStatus", "")).lower()
        if review_status == "current":
            if source_tier in BLOCKED_CURRENT_SOURCE_TIERS:
                _add(diagnostics, "stale_wiki_reference")
            provenance = metadata.get("provenance")
            evidence_ids = metadata.get("evidenceIds")
            if not _has_provenance(provenance, evidence_ids):
                _add(diagnostics, "missing_wiki_provenance")
            if not _non_empty_list(metadata.get("canonicalSources")):
                _add(diagnostics, "missing_wiki_canonical_source")
        if _claims_canonical_override(body):
            _add(diagnostics, "wiki_authority_override")
        if relative == "_ops/wiki/skill-facing-index.md" and _claims_skill_authority(body, metadata):
            _add(diagnostics, "skill_facing_index_authority_violation")

    def _validate_index(
        self,
        index_path: Path,
        pages_by_path: dict[str, dict[str, Any]],
        diagnostics: list[str],
    ) -> None:
        if not index_path.exists():
            return
        try:
            data = json.loads(index_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            _add(diagnostics, "invalid_wiki_index")
            return
        if data.get("projectionOnly") is not True:
            _add(diagnostics, "invalid_wiki_index")
        pages = data.get("pages")
        if not isinstance(pages, list):
            _add(diagnostics, "invalid_wiki_index")
            return
        for item in pages:
            if not isinstance(item, dict):
                _add(diagnostics, "invalid_wiki_index")
                continue
            actual = pages_by_path.get(str(item.get("path", "")))
            if actual is None:
                _add(diagnostics, "invalid_wiki_index")
                continue
            for field in ("entryType", "sourceTier", "reviewStatus"):
                if item.get(field) != actual.get(field):
                    _add(diagnostics, "invalid_wiki_index")
                    break

    def _result(self, diagnostics: list[str]) -> dict[str, Any]:
        unique = sorted(set(diagnostics))
        return {
            "status": "blocked" if unique else "pass",
            "diagnostic_ids": unique,
            "releaseBlocking": True,
            "gateResult": {
                "gate": self.gate_id,
                "status": "BLOCKED" if unique else "PASS",
                "validatorId": self.validator_id,
                "diagnosticIds": unique,
            },
            "frictionSignalBehavior": "emit docs_drift, stale_context, or lost_long_term_context when Wiki knowledge validation blocks release",
            "metricSignalBehavior": "emit wiki_knowledge_validation_count, wiki_current_page_provenance_ratio, and stale_wiki_reference_count",
        }


def _front_matter(path: Path) -> tuple[dict[str, Any], str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    metadata: dict[str, Any] = {}
    for line in parts[1].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = _parse_metadata_value(value.strip())
    return metadata, parts[2]


def _parse_metadata_value(value: str) -> Any:
    if value.startswith(("{", "[")):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def _has_provenance(provenance: Any, evidence_ids: Any) -> bool:
    if isinstance(provenance, dict):
        if provenance.get("packetId") and _non_empty_list(provenance.get("evidenceIds")):
            return True
    return _non_empty_list(evidence_ids)


def _non_empty_list(value: Any) -> bool:
    return isinstance(value, list) and bool(value)


def _claims_canonical_override(text: str) -> bool:
    normalized = text.lower()
    return any(term in normalized for term in AUTHORITY_OVERRIDE_TERMS) and any(
        term in normalized for term in CANONICAL_TARGET_TERMS
    )


def _claims_skill_authority(body: str, metadata: dict[str, Any]) -> bool:
    combined = body.lower() + "\n" + json.dumps(metadata, sort_keys=True).lower()
    return any(term in combined for term in SKILL_AUTHORITY_TERMS)


def _add(diagnostic_ids: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostic_ids:
        diagnostic_ids.append(diagnostic_id)
