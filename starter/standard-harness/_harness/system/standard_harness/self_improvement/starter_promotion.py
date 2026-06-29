"""Starter promotion candidate registry."""

from __future__ import annotations

from collections import Counter
from hashlib import sha256
from pathlib import PurePosixPath
from typing import Any


REQUIRED_PROMOTION_SAFETY_GATES = {
    "contamination_check",
    "clean_export_validation",
    "copied_starter_smoke_validation",
    "sensitive_evidence_no_leak",
    "root_history_no_leak",
    "generated_residue_no_leak",
    "human_approval_boundary",
}

ALLOWED_PROMOTION_STATUSES = {"candidate", "dry-run", "validation", "approval-needed", "rejected"}
TRUSTED_GATE_PROVENANCE = {
    "trusted-harness",
    "trusted-ci",
    "starter-smoke",
    "contamination-checker",
    "security-review",
}
FORBIDDEN_EVIDENCE_KEYS = {
    "api_key",
    "auth",
    "auth_token",
    "body",
    "cache",
    "cookie",
    "content",
    "credential",
    "generated",
    "generated_state",
    "local_db",
    "log",
    "raw",
    "raw_secret",
    "refresh_token",
    "root",
    "root_history",
    "secret",
    "session",
    "session_token",
    "token",
    "transcript",
}
FORBIDDEN_PATH_PARTS = {
    ".agents",
    ".claude",
    ".codex",
    ".git",
    ".harness",
    "__pycache__",
    "AGENTS.md",
}
FORBIDDEN_PATH_FRAGMENTS = (
    ".sqlite",
    ".db",
    ".pyc",
    "api-key",
    "apikey",
    "auth-",
    "auth_",
    "auth-token",
    "auth_token",
    "bearer-token",
    "bearer_token",
    "cache",
    "cookie",
    "generated-state",
    "local-db",
    "packet-evidence",
    "provider-cache",
    "raw-log",
    "raw-transcript",
    "secret",
    "session",
    "session-token",
    "session_token",
    "-token",
    "_token",
    "token.",
    "tokens.",
    "transcript",
    "validation_report",
    "wiki-state",
)


class StarterPromotionCandidateRegistry:
    def create_candidate(
        self,
        *,
        proposal: dict[str, Any],
        evidence_manifest: dict[str, Any],
        changed_surface_plan: dict[str, Any],
        rollback_note: str,
    ) -> dict[str, Any]:
        diagnostics: list[str] = []
        if proposal.get("status") != "accepted":
            diagnostics.append("proposal_not_accepted")
        sanitized_manifest, manifest_diagnostics = _sanitize_evidence_manifest(evidence_manifest)
        diagnostics.extend(manifest_diagnostics)
        sanitized_plan, plan_diagnostics = _sanitize_changed_surface_plan(changed_surface_plan)
        diagnostics.extend(plan_diagnostics)
        if not sanitized_manifest.get("evidence_refs"):
            diagnostics.append("missing_evidence_manifest")
        if not sanitized_plan.get("paths"):
            diagnostics.append("missing_changed_surface_plan")
        if not rollback_note:
            diagnostics.append("missing_rollback_note")
        candidate_id = "starter-candidate-" + sha256(
            str(proposal.get("proposal_id", "")).encode("utf-8")
        ).hexdigest()[:12]
        if diagnostics:
            return {
                "status": "blocked",
                "candidate_id": candidate_id,
                "proposal_id": proposal.get("proposal_id"),
                "diagnostic_ids": diagnostics,
                "blocked_reasons": diagnostics,
            }
        return {
            "status": "candidate",
            "candidate_id": candidate_id,
            "proposal_id": proposal.get("proposal_id"),
            "evidence_manifest": sanitized_manifest,
            "changed_surface_plan": sanitized_plan,
            "rollback_note": rollback_note,
            "approval_boundary": "approval-needed-is-not-approval",
            "diagnostic_ids": [],
            "blocked_reasons": [],
        }

    def dry_run(self, candidate: dict[str, Any], dry_run_report: dict[str, Any]) -> dict[str, Any]:
        if candidate.get("status") not in {"candidate", "dry-run"}:
            return _blocked(candidate, ["candidate_not_ready_for_dry_run"])
        sanitized_report, diagnostics = _sanitize_dry_run_report(dry_run_report)
        if diagnostics:
            return _blocked(candidate, diagnostics)
        if not sanitized_report or sanitized_report.get("status") != "pass":
            return _blocked(candidate, ["missing_dry_run_report"])
        if sanitized_report.get("mutates_starter"):
            return _blocked(candidate, ["candidate_direct_starter_mutation_blocked"])
        updated = dict(candidate)
        updated["status"] = "dry-run"
        updated["dry_run_report"] = sanitized_report
        return updated

    def validate_candidate(
        self, candidate: dict[str, Any], validation_result: dict[str, Any]
    ) -> dict[str, Any]:
        diagnostics: list[str] = []
        if candidate.get("status") != "dry-run" or not candidate.get("dry_run_report"):
            diagnostics.append("missing_dry_run_report")
        sanitized_result: dict[str, Any] = {}
        for gate in sorted(REQUIRED_PROMOTION_SAFETY_GATES):
            value = validation_result.get(gate)
            if gate == "human_approval_boundary":
                gate_result, gate_diagnostics = _sanitize_human_boundary_gate(gate, value)
                diagnostics.extend(gate_diagnostics)
                if gate_result.get("status") != "present":
                    diagnostics.append(f"missing_safety_gate:{gate}")
                sanitized_result[gate] = gate_result
                continue
            gate_result, gate_diagnostics = _sanitize_safety_gate(gate, value)
            diagnostics.extend(gate_diagnostics)
            if gate_result.get("status") != "pass":
                diagnostics.append(f"missing_safety_gate:{gate}")
            sanitized_result[gate] = gate_result
        if diagnostics:
            return _blocked(candidate, diagnostics)
        updated = dict(candidate)
        updated["status"] = "approval-needed"
        updated["validation_result"] = sanitized_result
        updated["approval_boundary"] = "human-decision-required-before-promotion"
        return updated

    def register(self, candidate: dict[str, Any]) -> dict[str, Any]:
        candidate = dict(candidate)
        if candidate.get("sourceImprovementId") and not candidate.get("source"):
            candidate.update(
                {
                    "sourceXp": candidate.get("sourceXp", "XP-09"),
                    "source": {"type": "friction", "id": candidate["sourceImprovementId"]},
                    "proposedChange": candidate.get("proposedChange")
                    or candidate.get("promotionRationale", ""),
                    "expectedBenefit": candidate.get("expectedBenefit")
                    or candidate.get("promotionRationale", ""),
                    "risk": candidate.get("risk", "unknown"),
                    "requiresHarnessPacket": candidate.get("requiresHarnessPacket", True),
                    "promotionStatus": candidate.get("promotionStatus", "candidate"),
                }
            )
        diagnostics = []
        required = (
            "candidateId",
            "sourceXp",
            "source",
            "proposedChange",
            "expectedBenefit",
            "risk",
            "requiresHarnessPacket",
            "promotionStatus",
        )
        for field in required:
            if not candidate.get(field):
                diagnostics.append("invalid_starter_promotion_candidate")
        if candidate.get("promotionStatus") not in ALLOWED_PROMOTION_STATUSES:
            diagnostics.append("invalid_starter_promotion_status")
        if candidate.get("promotionStatus") in {"approved", "promoted"}:
            diagnostics.append("promotion_execution_out_of_scope")
        if candidate.get("requiresHarnessPacket") is not True:
            diagnostics.append("invalid_starter_promotion_candidate")
        source = candidate.get("source")
        if not isinstance(source, dict) or source.get("type") not in {
            "friction",
            "metric",
            "harness-packet-closeout",
        } or not source.get("id"):
            diagnostics.append("invalid_starter_promotion_candidate")
        if not candidate.get("evidenceIds"):
            diagnostics.append("missing_starter_promotion_evidence")
        return {
            "status": "blocked" if diagnostics else "registered",
            "candidate": candidate,
            "diagnostic_ids": diagnostics,
            "frictionSignalBehavior": "emit missing_starter_promotion_evidence when blocked",
            "metricSignalBehavior": "emit starter_promotion_candidate_count by status",
        }


class CompoundFeedbackMetrics:
    """Summarizes compound feedback state without granting authority."""

    def summarize(
        self,
        *,
        signals: list[dict[str, Any]],
        groups: list[dict[str, Any]],
        proposals: list[dict[str, Any]],
        candidates: list[dict[str, Any]],
    ) -> dict[str, Any]:
        signal_counts = Counter(
            str(signal.get("signalType") or signal.get("type") or "unknown")
            for signal in signals
        )
        severity_counts = Counter(str(signal.get("severity", "unknown")) for signal in signals)
        source_counts = Counter(
            str(signal.get("sourceSurface") or signal.get("source_surface") or "unknown")
            for signal in signals
        )
        group_counts = Counter(str(group.get("status", "unknown")) for group in groups)
        proposal_counts = Counter(str(proposal.get("status", "unknown")) for proposal in proposals)
        candidate_counts = Counter(str(candidate.get("status", "unknown")) for candidate in candidates)
        blocked_reasons: Counter[str] = Counter()
        for candidate in candidates:
            for reason in candidate.get("blocked_reasons", []):
                blocked_reasons[str(reason)] += 1
            for reason in candidate.get("diagnostic_ids", []):
                if str(candidate.get("status")) == "blocked":
                    blocked_reasons[str(reason)] += 1
        return {
            "authority": "operational-evidence-only",
            "canApprovePromotion": False,
            "signalTypeCounts": dict(signal_counts),
            "signalSeverityCounts": dict(severity_counts),
            "signalSourceCounts": dict(source_counts),
            "recurringGroupStatusCounts": dict(group_counts),
            "proposalStatusCounts": dict(proposal_counts),
            "candidateStatusCounts": dict(candidate_counts),
            "blockedPromotionReasons": dict(blocked_reasons),
            "safetyGateFailureCounts": dict(blocked_reasons),
        }


def _blocked(candidate: dict[str, Any], diagnostics: list[str]) -> dict[str, Any]:
    updated = dict(candidate)
    updated["status"] = "blocked"
    existing = list(updated.get("diagnostic_ids", []))
    updated["diagnostic_ids"] = sorted(set(existing + diagnostics))
    updated["blocked_reasons"] = sorted(set(list(updated.get("blocked_reasons", [])) + diagnostics))
    return updated


def _sanitize_evidence_manifest(manifest: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    diagnostics = _detect_forbidden_payload(manifest)
    if not isinstance(manifest, dict):
        return {}, diagnostics + ["missing_evidence_manifest"]
    allowed = {"evidence_refs"}
    if set(manifest) - allowed:
        diagnostics.append("untrusted_evidence_manifest_field")
    refs = manifest.get("evidence_refs") or []
    safe_refs, ref_diagnostics = _sanitize_refs(refs, kind="evidence")
    return {"evidence_refs": safe_refs}, diagnostics + ref_diagnostics


def _sanitize_changed_surface_plan(plan: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    diagnostics = _detect_forbidden_payload(plan)
    if not isinstance(plan, dict):
        return {}, diagnostics + ["missing_changed_surface_plan"]
    allowed = {"paths"}
    if set(plan) - allowed:
        diagnostics.append("untrusted_changed_surface_plan_field")
    paths = plan.get("paths") or []
    safe_paths, path_diagnostics = _sanitize_refs(paths, kind="path")
    return {"paths": safe_paths}, diagnostics + path_diagnostics


def _sanitize_dry_run_report(report: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    diagnostics = _detect_forbidden_payload(report)
    if not isinstance(report, dict):
        return {}, diagnostics + ["missing_dry_run_report"]
    allowed = {"status", "mutates_starter", "evidence_ref"}
    if set(report) - allowed:
        diagnostics.append("untrusted_dry_run_report_field")
    evidence_ref = str(report.get("evidence_ref", ""))
    ref_diagnostics = _validate_safe_ref(evidence_ref, kind="evidence")
    return {
        "status": report.get("status"),
        "mutates_starter": bool(report.get("mutates_starter", False)),
        "evidence_ref": evidence_ref,
    }, diagnostics + ref_diagnostics


def _sanitize_safety_gate(gate: str, value: Any) -> tuple[dict[str, Any], list[str]]:
    diagnostics = _detect_forbidden_payload(value)
    if not isinstance(value, dict):
        return {}, diagnostics + [f"untrusted_safety_gate_assertion:{gate}"]
    allowed = {"status", "evidence_ref", "provenance"}
    if set(value) - allowed:
        diagnostics.append(f"untrusted_safety_gate_field:{gate}")
    if value.get("provenance") not in TRUSTED_GATE_PROVENANCE:
        diagnostics.append(f"untrusted_safety_gate_provenance:{gate}")
    evidence_ref = str(value.get("evidence_ref", ""))
    diagnostics.extend(_validate_safe_ref(evidence_ref, kind="evidence"))
    return {
        "status": value.get("status"),
        "evidence_ref": evidence_ref,
        "provenance": value.get("provenance"),
    }, diagnostics


def _sanitize_human_boundary_gate(gate: str, value: Any) -> tuple[dict[str, Any], list[str]]:
    diagnostics = _detect_forbidden_payload(value)
    if not isinstance(value, dict):
        return {}, diagnostics + [f"untrusted_safety_gate_assertion:{gate}"]
    allowed = {"status", "evidence_ref", "provenance"}
    if set(value) - allowed:
        diagnostics.append(f"untrusted_safety_gate_field:{gate}")
    if value.get("provenance") not in {"trusted-harness", "security-review"}:
        diagnostics.append(f"untrusted_safety_gate_provenance:{gate}")
    evidence_ref = str(value.get("evidence_ref", ""))
    diagnostics.extend(_validate_safe_ref(evidence_ref, kind="evidence"))
    return {
        "status": value.get("status"),
        "evidence_ref": evidence_ref,
        "provenance": value.get("provenance"),
    }, diagnostics


def _sanitize_refs(refs: Any, *, kind: str) -> tuple[list[str], list[str]]:
    if not isinstance(refs, list):
        return [], [f"invalid_{kind}_list"]
    safe: list[str] = []
    diagnostics: list[str] = []
    for ref in refs:
        value = str(ref)
        item_diagnostics = _validate_safe_ref(value, kind=kind)
        diagnostics.extend(item_diagnostics)
        if not item_diagnostics:
            safe.append(value.replace("\\", "/"))
    return safe, diagnostics


def _validate_safe_ref(value: str, *, kind: str) -> list[str]:
    diagnostics: list[str] = []
    if not value:
        return [f"missing_{kind}_ref"]
    normalized = value.replace("\\", "/")
    path = PurePosixPath(normalized)
    parts = set(path.parts)
    lowered_parts = {part.lower() for part in path.parts}
    if path.is_absolute() or ".." in path.parts:
        diagnostics.append(f"unsafe_{kind}_path")
    if parts & FORBIDDEN_PATH_PARTS or lowered_parts & {part.lower() for part in FORBIDDEN_PATH_PARTS}:
        diagnostics.append(f"unsafe_{kind}_path")
    lowered = normalized.lower()
    if any(fragment in lowered for fragment in FORBIDDEN_PATH_FRAGMENTS):
        diagnostics.append(f"unsafe_{kind}_path")
    if kind == "path" and not normalized.startswith(("_harness/", "product/")):
        diagnostics.append("changed_surface_outside_starter_contract")
    if kind == "evidence" and not normalized.startswith(("_ops/evidence/", "_ops/decisions/")):
        diagnostics.append("evidence_ref_outside_ops_boundary")
    return diagnostics


def _detect_forbidden_payload(value: Any) -> list[str]:
    diagnostics: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            lowered = str(key).lower()
            if lowered in FORBIDDEN_EVIDENCE_KEYS or any(token in lowered for token in ("secret", "token", "raw")):
                diagnostics.append("forbidden_raw_or_sensitive_evidence")
            diagnostics.extend(_detect_forbidden_payload(child))
    elif isinstance(value, list):
        for child in value:
            diagnostics.extend(_detect_forbidden_payload(child))
    elif isinstance(value, str):
        lowered = value.lower()
        if any(
            token in lowered
            for token in (
                "sk-",
                "authorization:",
                "bearer ",
                "secret=",
                "token=",
                "api_key=",
                "cookie:",
                "session_token",
                "raw_secret",
            )
        ):
            diagnostics.append("forbidden_raw_or_sensitive_evidence")
    return diagnostics
