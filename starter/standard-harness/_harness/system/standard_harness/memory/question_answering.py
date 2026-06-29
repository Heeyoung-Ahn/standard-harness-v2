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
SAFE_CLASSIFICATIONS = {"PUBLIC", "INTERNAL"}
UNKNOWN_CLASSIFICATION = "UNCLASSIFIED"
PROMPT_LIKE_PATTERNS = [
    re.compile(r"(?i)\bignore (?:all )?(?:previous|prior|above) instructions\b"),
    re.compile(r"(?i)\bdisregard (?:all )?(?:previous|prior|above) instructions\b"),
    re.compile(r"(?i)\b(system|developer) prompt\b"),
    re.compile(r"(?i)\bapprove (?:release|closeout|ready for code|residual risk)\b"),
]
SOURCE_PATTERNS = [
    ("_ops/packets/**/*.md", "packet", "packet_history", "canonical"),
    ("reference/packets/**/*.md", "packet", "packet_history", "canonical"),
    ("product/docs/packets/**/*.md", "closeout", "packet_history", "canonical"),
    ("reference/reports/closeout/**/*.md", "closeout", "packet_history", "canonical"),
    ("_ops/evidence/**/*", "evidence", "packet_history", "canonical"),
    ("reference/reports/validation/**/*", "evidence", "packet_history", "canonical"),
    ("_ops/reviews/**/*.md", "review", "packet_history", "canonical"),
    ("reference/reports/review/**/*.md", "review", "packet_history", "canonical"),
    ("_ops/wiki-proposals/**/*", "wiki_proposal", None, "canonical"),
    ("_ops/wiki/**/*.md", "wiki", None, "canonical"),
    ("_ops/decisions/**/*", "decision", "architecture_decision", "canonical"),
    ("_ops/risks/**/*", "risk", "open_risk", "canonical"),
    ("_ops/blockers/**/*", "blocker", "open_risk", "canonical"),
    ("_ops/friction/**/*", "friction", "known_friction", "canonical"),
    ("reference/reports/friction/**/*", "friction", "known_friction", "canonical"),
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
                if path.name.startswith("."):
                    continue
                relative_path = _relative_path(self.repo_root, path)
                if source_type == "evidence" and not _is_index_like_evidence_path(relative_path):
                    if not _sensitive_path_hint(relative_path):
                        continue
                    content = ""
                    summary = f"Raw evidence body omitted from long-memory discovery: {relative_path}"
                else:
                    content = _read_text(path)
                    summary = _summary_from_content(content, relative_path)
                category = default_category or _category_from_path(relative_path)
                source_refs = _extract_evidence_refs(content)
                if source_type == "evidence":
                    source_refs = [relative_path]
                source = {
                    "source_type": source_type,
                    "category": category,
                    "path": relative_path,
                    "authority_tier": authority_tier,
                    "freshness_status": _freshness_from_content(content),
                    "summary": summary,
                    "evidence_refs": source_refs,
                    "classification": self._classification_for(content=content, relative_path=relative_path),
                    "classification_policy_available": self.classifier is not None,
                    "prompt_like": _contains_prompt_like_content(content),
                }
                sources.append(source)
                if source_type == "evidence" and _is_index_like_evidence_path(relative_path):
                    sources.extend(
                        _memory_sources_from_evidence_index(
                            relative_path=relative_path,
                            content=content,
                            default_classification=source["classification"],
                        )
                    )
        return sources

    def _classification_for(self, *, content: str, relative_path: str) -> str:
        if self.classifier is None:
            return UNKNOWN_CLASSIFICATION
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
            if source["classification"] == UNKNOWN_CLASSIFICATION:
                diagnostic_ids.add("classification_policy_unavailable")
            if source["promptLike"]:
                diagnostic_ids.add("prompt_like_source_omitted")
                omitted_source_diagnostics.append(
                    {
                        "code": "prompt_like_source_omitted",
                        "path": source["path"],
                        "reason": "Prompt-like or approval-like source text cannot enter operating QA answers, wiki, handoff, or context packs.",
                    }
                )
                promotion_diagnostics.extend(_prompt_like_promotion_diagnostics(source))
                continue
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
                "resetCommand": "ops-reset",
                "resetCommandImplemented": True,
                "resettableReadModels": [
                    "_ops/active-context/**",
                    "_ops/evidence/**",
                    "_ops/friction/**",
                    "_ops/packets/**",
                    "_ops/pmo/**",
                    "_ops/reviews/**",
                    "_ops/wiki/**",
                    "_ops/wiki-proposals/**",
                ],
                "preservedPaths": ["_harness/**", "product/**", "reference/**"],
                "evidenceRetentionBypassed": False,
                "postResetBehavior": "fail closed with no_source and freshness diagnostics until sources are regenerated",
                "disposition": "implemented by ops-reset; resettable _ops read models are removed while product and _harness paths are preserved",
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
        max_sources: int = 16,
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
        sources = _order_sources_for_question(canonical_sources + contextual_sources, question)
        diagnostics = set(index.get("diagnostic_ids", []))
        if len(sources) > max_sources:
            sources = sources[:max_sources]
            diagnostics.add("source_budget_limited")
        if _asks_for_approval(question):
            diagnostics.add("approval_authority_refused")
        evidence_refs = _unique(
            ref
            for source in sources
            for ref in source.get("evidenceRefs", [])
            if _text(ref)
        )
        if sources and not evidence_refs:
            diagnostics.add("missing_evidence_link")
        status = "pass" if canonical_sources and not _blocking_diagnostics(diagnostics) else "blocked"
        answer_sources = [source for source in sources if source in canonical_sources]
        answer_text = _compose_answer(question=question, sources=answer_sources, status=status)
        if len(answer_text) > max_answer_chars:
            answer_text = answer_text[: max(0, max_answer_chars - 3)].rstrip() + "..."

        source_refs = [
            {
                "type": source["sourceType"],
                "pathOrId": source["path"],
                "category": source["category"],
                "authorityTier": source["authorityTier"],
                "trustStatus": source["trustStatus"],
                "freshnessStatus": source["freshnessStatus"],
                "answerEligibility": source["answerEligibility"],
            }
            for source in sources
        ]
        redaction_disposition = (
            "sensitive-sources-omitted"
            if any(item.get("code") == "omitted_sensitive_source" for item in index.get("omittedSourceDiagnostics", []))
            else "not-sensitive"
        )
        authority_boundary = (
            "read-model only: operating-qa cannot approve Ready For Code, implementation, closeout, "
            "release, residual risk, or human gates."
        )
        return {
            "schemaVersion": ANSWER_SCHEMA_VERSION,
            "question": question,
            "status": status,
            "readModel": True,
            "answer": answer_text,
            "whatHappened": _compose_section("what_happened", sources, status),
            "why": _compose_section("why", sources, status),
            "sourceRefs": source_refs,
            "evidenceRefs": evidence_refs,
            "risk": _compose_section("risk", sources, status),
            "nextAction": _compose_section("next", sources, status),
            "diagnostic_ids": sorted(diagnostics),
            "omittedSourceDiagnostics": list(index.get("omittedSourceDiagnostics", [])),
            "promotionDiagnostics": list(index.get("promotionDiagnostics", [])),
            "redactionDisposition": redaction_disposition,
            "freshnessStatus": _aggregate_freshness(sources, diagnostics),
            "authorityBoundary": authority_boundary,
            "nextBoundary": "next-boundary: answers may recommend next work but cannot approve implementation, closeout, release, or residual risk.",
            "tokenEstimate": max(1, len(answer_text) // 4),
        }


def _normalize_source(source: dict[str, Any]) -> dict[str, Any]:
    source_type = _text(source.get("source_type") or source.get("sourceType") or source.get("type"))
    path = _text(source.get("path") or source.get("sourcePath") or source.get("id"))
    category = _text(source.get("category"))
    normalized = {
        "sourceId": _text(source.get("source_id") or source.get("sourceId")) or f"{source_type}:{category}:{path}",
        "sourceType": source_type or "unknown",
        "category": category or "uncategorized",
        "path": path,
        "authorityTier": _text(source.get("authority_tier") or source.get("authorityTier")) or "untrusted-content",
        "freshnessStatus": _text(source.get("freshness_status") or source.get("freshnessStatus")) or "unknown",
        "summary": _text(source.get("summary")),
        "evidenceRefs": [_text(ref) for ref in source.get("evidence_refs", source.get("evidenceRefs", [])) if _text(ref)],
        "classification": _text(source.get("classification") or source.get("sensitivity") or "INTERNAL").upper(),
        "promptLike": bool(source.get("prompt_like") or source.get("promptLike") or _contains_prompt_like_content(_text(source.get("summary")))),
    }
    normalized["trustStatus"] = _trust_status(source, normalized)
    normalized["answerEligibility"] = _is_claim_supporting_source(normalized)
    return normalized


def _trust_status(raw_source: dict[str, Any], source: dict[str, Any]) -> str:
    declared = _text(raw_source.get("trust_status") or raw_source.get("trustStatus"))
    if declared:
        return declared
    if source["classification"] in SENSITIVE_CLASSIFICATIONS:
        return "omitted-sensitive"
    if source["classification"] == UNKNOWN_CLASSIFICATION:
        return "classification-policy-unavailable"
    if source["freshnessStatus"] != "fresh":
        return "stale"
    if source["authorityTier"] in LOW_AUTHORITY_TIERS:
        return "low-authority"
    return "trusted"


def _is_claim_supporting_source(source: dict[str, Any]) -> bool:
    return (
        source.get("classification") not in SENSITIVE_CLASSIFICATIONS
        and source.get("classification") in SAFE_CLASSIFICATIONS
        and not source.get("promptLike")
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
        and source.get("classification") in SAFE_CLASSIFICATIONS
        and not source.get("promptLike")
    )


def _blocking_diagnostics(diagnostics: set[str]) -> bool:
    return any(
        diagnostic == "stale_source"
        or diagnostic == "omitted_sensitive_source"
        or diagnostic == "prompt_like_source_omitted"
        or diagnostic == "classification_policy_unavailable"
        or diagnostic == "missing_evidence_link"
        or diagnostic.startswith("no_source:")
        for diagnostic in diagnostics
    )


def _order_sources_for_question(sources: list[dict[str, Any]], question: str) -> list[dict[str, Any]]:
    preferred_types = _preferred_source_types_for_question(question)
    if not preferred_types:
        return sources
    ordered = sorted(
        enumerate(sources),
        key=lambda item: (
            0 if item[1].get("sourceType") in preferred_types else 1,
            item[0],
        ),
    )
    return [source for _, source in ordered]


def _preferred_source_types_for_question(question: str) -> set[str]:
    normalized = question.lower()
    preferred: set[str] = set()
    if "risk" in normalized or "blocked" in normalized or "blocker" in normalized:
        preferred.update({"risk", "blocker", "friction"})
    if "next" in normalized or "current" in normalized:
        preferred.update({"active_context", "pmo"})
    if "why" in normalized:
        preferred.update({"decision", "wiki", "wiki_proposal", "review"})
    if "evidence" in normalized or "support" in normalized:
        preferred.update({"evidence", "review", "closeout", "packet"})
    return preferred


def _compose_section(section: str, sources: list[dict[str, Any]], status: str) -> str:
    if status != "pass":
        return "Unsupported by fresh trusted source records."
    preferred_types = {
        "what_happened": {"packet", "closeout", "review", "evidence"},
        "why": {"decision", "wiki", "wiki_proposal"},
        "risk": {"risk", "blocker", "friction"},
        "next": {"active_context", "pmo"},
    }[section]
    summaries = [source["summary"] for source in sources if source.get("sourceType") in preferred_types and source.get("summary")]
    if not summaries and section in {"what_happened", "why"}:
        summaries = [source["summary"] for source in sources if source.get("summary")]
    return "; ".join(summaries[:3]) if summaries else "No eligible source summary."


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


def _asks_for_approval(question: str) -> bool:
    normalized = question.lower()
    approval_terms = ("approve", "approval", "closeout", "release", "residual risk", "ready for code")
    return any(term in normalized for term in approval_terms)


def _contains_prompt_like_content(content: str) -> bool:
    return any(pattern.search(content) for pattern in PROMPT_LIKE_PATTERNS)


def _prompt_like_promotion_diagnostics(source: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "code": "prompt_like_source_omitted",
            "target": target,
            "path": source["path"],
            "classification": source["classification"],
        }
        for target in ("answer", "wiki", "handoff", "context_pack")
    ]


def _aggregate_freshness(sources: list[dict[str, Any]], diagnostics: set[str]) -> str:
    statuses = {source.get("freshnessStatus", "unknown") for source in sources}
    if "stale_source" in diagnostics:
        return "stale" if statuses == {"stale"} else "mixed"
    if statuses == {"fresh"}:
        return "fresh"
    if not statuses:
        return "unknown"
    return "mixed"


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


def _memory_sources_from_evidence_index(
    *,
    relative_path: str,
    content: str,
    default_classification: str,
) -> list[dict[str, Any]]:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, dict):
        return []
    memory_sources = data.get("memorySources")
    if not isinstance(memory_sources, list):
        return []
    sources: list[dict[str, Any]] = []
    for index, item in enumerate(memory_sources):
        if not isinstance(item, dict):
            continue
        category = _text(item.get("category"))
        source_type = _text(item.get("source_type") or item.get("sourceType")) or "evidence"
        summary = _text(item.get("summary"))
        if not category or not summary:
            continue
        source_path = _text(item.get("path")) or f"{relative_path}#memorySources/{index}"
        refs = item.get("evidence_refs", item.get("evidenceRefs", [relative_path]))
        evidence_refs = [_text(ref) for ref in refs if _text(ref)] if isinstance(refs, list) else [relative_path]
        sources.append(
            {
                "source_type": source_type,
                "category": category,
                "path": source_path,
                "authority_tier": _text(item.get("authority_tier") or item.get("authorityTier")) or "canonical",
                "freshness_status": _text(item.get("freshness_status") or item.get("freshnessStatus")) or "fresh",
                "summary": summary,
                "evidence_refs": evidence_refs or [relative_path],
                "classification": _text(item.get("classification")) or default_classification,
                "classification_policy_available": True,
                "prompt_like": _contains_prompt_like_content(summary),
            }
        )
    return sources


def _is_index_like_evidence_path(relative_path: str) -> bool:
    normalized = relative_path.replace("\\", "/").lower()
    name = Path(normalized).name
    return name in {"evidence-index.json", "evidence-manifest.json"} or name.endswith("-evidence-index.json")


def _sensitive_path_hint(relative_path: str) -> bool:
    normalized = relative_path.replace("\\", "/").lower()
    name = Path(normalized).name
    return (
        name in {".env", ".env.local"}
        or name.endswith((".pem", ".key"))
        or "secret" in normalized
        or "api_key" in normalized
        or "credential" in normalized
    )


def _extract_evidence_refs(content: str) -> list[str]:
    return _unique(match.group("path").replace("\\", "/").rstrip(".,") for match in EVIDENCE_REF_RE.finditer(content))


def _valid_evidence_ref(repo_root: Path, ref: str) -> bool:
    normalized = ref.replace("\\", "/").strip()
    if normalized.startswith("reference/"):
        return _valid_retained_reference_ref(repo_root, normalized)
    if normalized.startswith("product/docs/packets/"):
        return _path_within_repo_exists(repo_root, normalized)
    if not normalized.startswith("_ops/evidence/"):
        return False
    path = (repo_root / normalized).resolve()
    if not _is_within_repo(repo_root, path):
        return False
    if not path.is_file():
        return False
    if not _is_index_like_evidence_path(normalized):
        return True
    return _has_passing_evidence_entry(path)


def _valid_retained_reference_ref(repo_root: Path, ref: str) -> bool:
    path = (repo_root / ref).resolve()
    if not _is_within_repo(repo_root, path) or not path.is_file():
        return False
    if _is_index_like_evidence_path(ref):
        return _has_passing_evidence_entry(path)
    return True


def _has_passing_evidence_entry(path: Path) -> bool:
    data = _read_json(path)
    entries = data.get("entries")
    if not isinstance(entries, list) or not entries:
        return False
    return any(_passing_evidence_entry(entry) for entry in entries if isinstance(entry, dict))


def _path_within_repo_exists(repo_root: Path, ref: str) -> bool:
    path = (repo_root / ref).resolve()
    return _is_within_repo(repo_root, path) and path.is_file()


def _is_within_repo(repo_root: Path, path: Path) -> bool:
    try:
        path.relative_to(repo_root.resolve())
    except ValueError:
        return False
    return True


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
