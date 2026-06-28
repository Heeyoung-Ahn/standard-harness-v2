"""Long-memory source index and bounded question answering."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from standard_harness.security.evidence_classification import EvidenceClassifier
from standard_harness.validation.sensitive_evidence import SensitiveEvidenceValidator


SCHEMA_VERSION = "standard-harness-long-memory-source-index/v1"
ANSWER_SCHEMA_VERSION = "standard-harness-question-answer/v1"
REQUIRED_MEMORY_CATEGORIES = [
    "project_intent",
    "architecture_decision",
    "current_convention",
    "packet_history",
    "known_friction",
    "open_risk",
    "deprecated_context",
]
LOW_AUTHORITY_TIERS = {"generated", "low-authority", "llm-summary"}
SENSITIVE_CLASSIFICATIONS = {"SENSITIVE", "SECRET"}
SOURCE_PATTERNS = [
    ("_ops/packets/**/*.md", "packet", "packet_history", "canonical"),
    ("product/docs/packets/**/*.md", "closeout", "packet_history", "canonical"),
    ("_ops/evidence/**/*", "evidence", "packet_history", "canonical"),
    ("_ops/wiki-proposals/**/*", "wiki_proposal", None, "canonical"),
    ("_ops/wiki/**/*.md", "wiki", None, "canonical"),
    ("_ops/decisions/**/*", "decision", "architecture_decision", "canonical"),
    ("_ops/risks/**/*", "risk", "open_risk", "canonical"),
    ("_ops/blockers/**/*", "blocker", "open_risk", "canonical"),
    ("_ops/pmo/**/*.md", "pmo", "known_friction", "coordination"),
    ("product/docs/pmo/**/*.md", "pmo", "known_friction", "coordination"),
    ("_ops/active-context/**/*", "active_context", "packet_history", "generated"),
]
EVIDENCE_REF_RE = re.compile(r"(?P<path>(?:_ops|product|reference)[^\s`'\"<>)]*evidence-index\.json)")


class LongMemorySourceDiscovery:
    """Discovers starter operating records that can feed the long-memory read model."""

    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)
        try:
            self.classifier = EvidenceClassifier.from_repo(self.repo_root)
        except (FileNotFoundError, json.JSONDecodeError, ValueError):
            self.classifier = None

    def discover(self) -> list[dict[str, Any]]:
        sources: list[dict[str, Any]] = []
        for pattern, source_type, default_category, authority_tier in SOURCE_PATTERNS:
            for path in sorted(self.repo_root.glob(pattern)):
                if not path.is_file():
                    continue
                relative_path = _relative_path(self.repo_root, path)
                content = _read_text(path)
                category = default_category or _category_from_path(relative_path)
                source_refs = _extract_evidence_refs(content)
                if source_type == "evidence":
                    source_refs = [relative_path]
                sources.append(
                    {
                        "source_type": source_type,
                        "category": category,
                        "path": relative_path,
                        "authority_tier": authority_tier,
                        "freshness_status": _freshness_from_content(content),
                        "summary": _summary_from_content(content, relative_path),
                        "evidence_refs": source_refs,
                        "classification": self._classification_for(content=content, relative_path=relative_path),
                    }
                )
        return sources

    def _classification_for(self, *, content: str, relative_path: str) -> str:
        if self.classifier is None:
            return "INTERNAL"
        return str(
            self.classifier.classify(content=content, artifact_path=relative_path).get("classification", "INTERNAL")
        ).upper()


class LongMemorySourceIndexBuilder:
    """Builds a read-model index over canonical memory sources."""

    def __init__(self, repo_root: str | Path | None = None):
        self.repo_root = Path(repo_root) if repo_root is not None else None
        try:
            self.sensitive_validator = (
                SensitiveEvidenceValidator.from_repo(self.repo_root)
                if self.repo_root is not None
                else None
            )
        except (FileNotFoundError, json.JSONDecodeError, ValueError):
            self.sensitive_validator = None

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "LongMemorySourceIndexBuilder":
        return cls(repo_root)

    def build(self, sources: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        normalized_sources: list[dict[str, Any]] = []
        diagnostic_ids: set[str] = set()
        omitted_source_diagnostics: list[dict[str, Any]] = []
        promotion_diagnostics: list[dict[str, Any]] = []

        for raw_source in sources or []:
            source = _normalize_source(raw_source)
            if source["classification"] in SENSITIVE_CLASSIFICATIONS:
                diagnostic_ids.add("omitted_sensitive_source")
                omitted_source_diagnostics.append(
                    {
                        "code": "omitted_sensitive_source",
                        "path": source["path"],
                        "classification": source["classification"],
                        "reason": "Sensitive or secret evidence cannot enter memory/query context.",
                    }
                )
                promotion_diagnostics.extend(self._promotion_diagnostics(source))
                continue
            source["evidenceRefs"] = self._validated_evidence_refs(source["evidenceRefs"], diagnostic_ids)
            if source["freshnessStatus"] != "fresh":
                diagnostic_ids.add("stale_source")
            if source["authorityTier"] in LOW_AUTHORITY_TIERS:
                diagnostic_ids.add("low_authority_source")
            if _is_claim_supporting_source(source) and not source.get("evidenceRefs"):
                diagnostic_ids.add("missing_evidence_link")
            normalized_sources.append(source)

        covered_categories = {
            source["category"]
            for source in normalized_sources
            if _is_claim_supporting_source(source)
        }
        for category in REQUIRED_MEMORY_CATEGORIES:
            if category not in covered_categories:
                diagnostic_ids.add(f"no_source:{category}")

        return {
            "schemaVersion": SCHEMA_VERSION,
            "readModel": True,
            "authority": "read-model",
            "canonicalAuthority": "canonical source records remain authority",
            "requiredCategories": list(REQUIRED_MEMORY_CATEGORIES),
            "sources": normalized_sources,
            "sourceCategories": sorted(covered_categories),
            "diagnostic_ids": sorted(diagnostic_ids),
            "omittedSourceDiagnostics": omitted_source_diagnostics,
            "promotionDiagnostics": promotion_diagnostics,
            "resetPolicy": {
                "resetCommandImplemented": False,
                "evidenceRetentionBypassed": False,
                "disposition": "reset mechanics deferred; evidence retention remains enforceable",
            },
        }

    def _validated_evidence_refs(self, refs: list[str], diagnostic_ids: set[str]) -> list[str]:
        if self.repo_root is None:
            return refs
        valid_refs: list[str] = []
        for ref in refs:
            if _valid_evidence_ref(self.repo_root, ref):
                valid_refs.append(ref)
            else:
                diagnostic_ids.add("invalid_evidence_ref")
        return valid_refs

    def _promotion_diagnostics(self, source: dict[str, Any]) -> list[dict[str, Any]]:
        diagnostics: list[dict[str, Any]] = []
        evidence = {
            "classification": source["classification"],
            "sourcePath": source["path"],
        }
        for target in ("wiki", "handoff"):
            if self.sensitive_validator is None:
                codes = ["sensitive_wiki_promotion"] if target == "wiki" else ["secret_evidence_registered"]
            else:
                codes = self.sensitive_validator.validate_promotion(evidence, target=target)["diagnostic_ids"]
            for code in codes:
                diagnostics.append(
                    {
                        "code": code,
                        "target": target,
                        "path": source["path"],
                        "classification": source["classification"],
                    }
                )
        diagnostics.append(
            {
                "code": "sensitive_context_pack_promotion",
                "target": "context_pack",
                "path": source["path"],
                "classification": source["classification"],
            }
        )
        diagnostics.append(
            {
                "code": "omitted_sensitive_source",
                "target": "answer",
                "path": source["path"],
                "classification": source["classification"],
            }
        )
        return diagnostics


class LongMemoryQuestionAnsweringService:
    """Composes compact status answers without becoming source authority."""

    def answer(
        self,
        index: dict[str, Any],
        question: str,
        *,
        max_answer_chars: int = 800,
    ) -> dict[str, Any]:
        canonical_sources = [
            source
            for source in index.get("sources", [])
            if isinstance(source, dict) and _is_claim_supporting_source(source)
        ]
        contextual_sources = [
            source
            for source in index.get("sources", [])
            if isinstance(source, dict)
            and _is_contextual_source_for_question(source, question)
            and source not in canonical_sources
        ]
        sources = canonical_sources + contextual_sources
        diagnostics = set(index.get("diagnostic_ids", []))
        evidence_refs = _unique(
            ref
            for source in sources
            for ref in source.get("evidenceRefs", [])
            if _text(ref)
        )
        if sources and not evidence_refs:
            diagnostics.add("missing_evidence_link")
        status = "pass" if canonical_sources and not _blocking_diagnostics(diagnostics) else "blocked"
        answer_text = _compose_answer(question=question, sources=canonical_sources, status=status)
        if len(answer_text) > max_answer_chars:
            answer_text = answer_text[: max(0, max_answer_chars - 3)].rstrip() + "..."

        source_refs = [
            {
                "type": source["sourceType"],
                "pathOrId": source["path"],
                "category": source["category"],
                "authorityTier": source["authorityTier"],
                "freshnessStatus": source["freshnessStatus"],
            }
            for source in sources
        ]
        redaction_disposition = (
            "sensitive-sources-omitted"
            if any(item.get("code") == "omitted_sensitive_source" for item in index.get("omittedSourceDiagnostics", []))
            else "not-sensitive"
        )
        return {
            "status": status,
            "readModel": True,
            "answer": answer_text,
            "sourceRefs": source_refs,
            "evidenceRefs": evidence_refs,
            "diagnostic_ids": sorted(diagnostics),
            "omittedSourceDiagnostics": list(index.get("omittedSourceDiagnostics", [])),
            "promotionDiagnostics": list(index.get("promotionDiagnostics", [])),
            "redactionDisposition": redaction_disposition,
            "nextBoundary": "next-boundary: answers may recommend next work but cannot approve implementation, closeout, release, or residual risk.",
            "tokenEstimate": max(1, len(answer_text) // 4),
        }


def _normalize_source(source: dict[str, Any]) -> dict[str, Any]:
    source_type = _text(source.get("source_type") or source.get("sourceType") or source.get("type"))
    path = _text(source.get("path") or source.get("sourcePath") or source.get("id"))
    category = _text(source.get("category"))
    return {
        "sourceId": _text(source.get("source_id") or source.get("sourceId")) or f"{source_type}:{category}:{path}",
        "sourceType": source_type or "unknown",
        "category": category or "uncategorized",
        "path": path,
        "authorityTier": _text(source.get("authority_tier") or source.get("authorityTier")) or "untrusted-content",
        "freshnessStatus": _text(source.get("freshness_status") or source.get("freshnessStatus")) or "unknown",
        "summary": _text(source.get("summary")),
        "evidenceRefs": [_text(ref) for ref in source.get("evidence_refs", source.get("evidenceRefs", [])) if _text(ref)],
        "classification": _text(source.get("classification") or source.get("sensitivity") or "INTERNAL").upper(),
    }


def _is_claim_supporting_source(source: dict[str, Any]) -> bool:
    return (
        source.get("classification") not in SENSITIVE_CLASSIFICATIONS
        and source.get("freshnessStatus") == "fresh"
        and source.get("authorityTier") not in LOW_AUTHORITY_TIERS
    )


def _is_contextual_source_for_question(source: dict[str, Any], question: str) -> bool:
    normalized = question.lower()
    return (
        ("next" in normalized or "current" in normalized)
        and source.get("sourceType") == "active_context"
        and source.get("freshnessStatus") == "fresh"
        and bool(source.get("evidenceRefs"))
        and source.get("classification") not in SENSITIVE_CLASSIFICATIONS
    )


def _blocking_diagnostics(diagnostics: set[str]) -> bool:
    return any(
        diagnostic == "stale_source"
        or diagnostic == "omitted_sensitive_source"
        or diagnostic == "missing_evidence_link"
        or diagnostic.startswith("no_source:")
        for diagnostic in diagnostics
    )


def _compose_answer(*, question: str, sources: list[dict[str, Any]], status: str) -> str:
    if status != "pass":
        return "Unsupported claim: canonical fresh non-sensitive sources are missing or insufficient."
    prefix = _answer_prefix(question)
    summaries = "; ".join(source["summary"] for source in sources if source.get("summary"))
    return f"{prefix} {summaries}".strip()


def _answer_prefix(question: str) -> str:
    normalized = question.lower()
    if "why" in normalized:
        return "Why:"
    if "evidence" in normalized:
        return "Evidence:"
    if "risk" in normalized or "blocked" in normalized or "blocker" in normalized:
        return "Risk/blocker:"
    if "next" in normalized:
        return "Next:"
    return "Status:"


def _asks_for_evidence(question: str) -> bool:
    return "evidence" in question.lower() or "support" in question.lower()


def _unique(values) -> list[str]:
    result: list[str] = []
    for value in values:
        text = _text(value)
        if text and text not in result:
            result.append(text)
    return result


def _text(value: Any) -> str:
    return str(value or "").strip()


def _relative_path(repo_root: Path, path: Path) -> str:
    return path.resolve().relative_to(repo_root.resolve()).as_posix()


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")


def _read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _extract_evidence_refs(content: str) -> list[str]:
    return _unique(match.group("path").replace("\\", "/").rstrip(".,") for match in EVIDENCE_REF_RE.finditer(content))


def _valid_evidence_ref(repo_root: Path, ref: str) -> bool:
    normalized = ref.replace("\\", "/").strip()
    if not normalized.startswith("_ops/evidence/"):
        return False
    path = (repo_root / normalized).resolve()
    try:
        path.relative_to(repo_root.resolve())
    except ValueError:
        return False
    if not path.is_file():
        return False
    if path.name != "evidence-index.json":
        return True
    data = _read_json(path)
    entries = data.get("entries")
    if not isinstance(entries, list) or not entries:
        return False
    return any(_passing_evidence_entry(entry) for entry in entries if isinstance(entry, dict))


def _passing_evidence_entry(entry: dict[str, Any]) -> bool:
    return (
        str(entry.get("status", "")).lower() == "pass"
        and str(entry.get("trustStatus", entry.get("trust_status", ""))).lower() == "trusted"
        and str(entry.get("freshnessStatus", entry.get("freshness_status", ""))).lower() == "fresh"
        and str(entry.get("resolutionStatus", entry.get("resolution_status", ""))).lower() == "resolved"
        and str(entry.get("redactionStatus", entry.get("redaction_status", ""))).lower() in {"clean", "not-sensitive", "not_sensitive"}
    )


def _category_from_path(relative_path: str) -> str:
    normalized = relative_path.lower()
    if "project-intent" in normalized or "intent" in normalized:
        return "project_intent"
    if "architecture" in normalized or "decision" in normalized:
        return "architecture_decision"
    if "convention" in normalized:
        return "current_convention"
    if "friction" in normalized:
        return "known_friction"
    if "risk" in normalized or "blocker" in normalized:
        return "open_risk"
    if "deprecated" in normalized or "legacy" in normalized:
        return "deprecated_context"
    return "packet_history"


def _freshness_from_content(content: str) -> str:
    normalized = content.lower()
    if "freshnessstatus" in normalized and "stale" in normalized:
        return "stale"
    if "stale" in normalized and "fresh" not in normalized:
        return "stale"
    return "fresh"


def _summary_from_content(content: str, fallback: str) -> str:
    for line in content.splitlines():
        cleaned = line.strip().lstrip("#").strip()
        if cleaned:
            return cleaned[:240]
    return fallback
