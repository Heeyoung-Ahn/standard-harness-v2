"""Friction capture for harness self-improvement."""

from __future__ import annotations

import json
from hashlib import sha256
from typing import Any

from standard_harness.state.store import HarnessStore


SEED_FRICTION_TYPES = {
    "pycache_residue",
    "npm_node_path_failure",
    "validation_pass_with_warnings",
    "dirty_generated_state",
    "packet_prose_without_durable_evidence",
    "stale_active_context",
    "missing_required_evidence",
    "manual_rework_repeated",
    "validator_failure",
    "closeout_state_mismatch",
    "token_overuse",
    "boundary_violation",
}

MINIMUM_CAPTURE_SURFACES = {
    "validation_failure",
    "validation_pass_with_warnings",
    "review_finding_or_evidence_gap",
    "pm_report_status_friction",
    "closeout_state_mismatch",
    "context_token_budget_overrun",
    "authority_boundary_violation",
}

DOCS_ONLY_CAPTURE_SURFACES = {
    "manual_documented_entrypoint",
    "documentation_only",
    "manual_only",
}

SEVERITIES = {"low", "medium", "high"}


class FrictionCapturePolicy:
    """Validates that friction capture is wired to real runtime/service surfaces."""

    def validate_capture_surfaces(self, configured_surfaces: list[str]) -> dict[str, Any]:
        configured = {str(surface) for surface in configured_surfaces}
        diagnostics = [
            f"missing_capture_surface:{surface}"
            for surface in sorted(MINIMUM_CAPTURE_SURFACES - configured)
        ]
        if configured and configured.issubset(DOCS_ONLY_CAPTURE_SURFACES):
            diagnostics.append("docs_only_capture_entrypoint")
        return {
            "status": "blocked" if diagnostics else "pass",
            "configured_surfaces": sorted(configured),
            "required_surfaces": sorted(MINIMUM_CAPTURE_SURFACES),
            "diagnostic_ids": diagnostics,
            "authority": "capture-policy",
        }


class FrictionSignalRegistry:
    """In-memory registry for structured PKT-10 friction signals.

    The starter already has an event-store backed FrictionService for durable records.
    This registry keeps the reusable lifecycle contract small and testable; callers can
    persist the returned signal through the event store or an _ops record.
    """

    def __init__(self) -> None:
        self.signals: list[dict[str, Any]] = []

    def record_signal(self, signal: dict[str, Any]) -> dict[str, Any]:
        normalized = _normalize_signal(signal)
        diagnostics = _validate_signal(normalized)
        if diagnostics:
            return {
                "status": "blocked",
                "signal": normalized,
                "diagnostic_ids": diagnostics,
                "authority": "friction-signal",
            }
        self.signals.append(normalized)
        return {
            "status": "recorded",
            "signal": normalized,
            "diagnostic_ids": [],
            "authority": "friction-signal",
        }

    def capture_from_surface(
        self,
        *,
        surface: str,
        friction_type: str,
        source_ref: str,
        recurrence_key: str,
        evidence_ref: str,
        severity: str = "medium",
        suggested_route: str = "Developer",
        sensitive_evidence: bool = False,
        redaction_status: str = "clean",
    ) -> dict[str, Any]:
        if surface in DOCS_ONLY_CAPTURE_SURFACES:
            return {
                "status": "blocked",
                "diagnostic_ids": ["docs_only_capture_entrypoint"],
                "authority": "friction-signal",
            }
        return self.record_signal(
            {
                "type": friction_type,
                "severity": severity,
                "source_surface": surface,
                "source_ref": source_ref,
                "recurrence_key": recurrence_key,
                "evidence_ref": evidence_ref,
                "suggested_route": suggested_route,
                "authority_boundary": "evidence-only",
                "sensitive_evidence": sensitive_evidence,
                "redaction_status": redaction_status,
            }
        )


class StoredFrictionSignalRegistry:
    """Event-store backed friction signal registry for runtime/service entrypoints."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def record_signal(self, signal: dict[str, Any], *, idempotency_key: str | None = None) -> dict[str, Any]:
        result = FrictionSignalRegistry().record_signal(signal)
        if result["status"] == "blocked":
            return result
        event_signal = result["signal"]
        key = idempotency_key or f"friction-signal:{event_signal['signalId']}"
        if self.store.event_for_idempotency_key(key) is not None:
            return {"status": "recorded", "signal": event_signal, "diagnostic_ids": [], "authority": "friction-signal-store"}
        self.store.append_event(
            event_type="friction_signal_recorded",
            actor_id="compound-feedback",
            actor_role="System",
            authority_basis="friction signal capture",
            idempotency_key=key,
            payload=event_signal,
        )
        return {"status": "recorded", "signal": event_signal, "diagnostic_ids": [], "authority": "friction-signal-store"}

    def list_signals(self) -> list[dict[str, Any]]:
        if not self.store.db_path.exists():
            return []
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select payload_json from events
                where event_type = 'friction_signal_recorded'
                order by event_seq asc
                """
            ).fetchall()
        return [json.loads(row["payload_json"]) for row in rows]


class RuntimeFrictionCapture:
    """Bounded adapters for real harness runtime surfaces.

    These methods are the stable service hooks that validation, review, PM, closeout,
    context-budget, and boundary code can call without turning prose into authority.
    """

    def __init__(self, registry: FrictionSignalRegistry | StoredFrictionSignalRegistry):
        self.registry = registry

    def validation_failure(self, *, source_ref: str, evidence_ref: str) -> dict[str, Any]:
        return self._capture(
            surface="validation_failure",
            friction_type="validator_failure",
            source_ref=source_ref,
            evidence_ref=evidence_ref,
            severity="high",
            suggested_route="Developer",
        )

    def validation_pass_with_warnings(self, *, source_ref: str, evidence_ref: str) -> dict[str, Any]:
        return self._capture(
            surface="validation_pass_with_warnings",
            friction_type="validation_pass_with_warnings",
            source_ref=source_ref,
            evidence_ref=evidence_ref,
            severity="medium",
            suggested_route="Developer",
        )

    def review_finding_or_evidence_gap(self, *, source_ref: str, evidence_ref: str) -> dict[str, Any]:
        return self._capture(
            surface="review_finding_or_evidence_gap",
            friction_type="missing_required_evidence",
            source_ref=source_ref,
            evidence_ref=evidence_ref,
            severity="high",
            suggested_route="Reviewer",
        )

    def pm_report_status_friction(self, *, source_ref: str, evidence_ref: str) -> dict[str, Any]:
        return self._capture(
            surface="pm_report_status_friction",
            friction_type="manual_rework_repeated",
            source_ref=source_ref,
            evidence_ref=evidence_ref,
            severity="medium",
            suggested_route="PM",
        )

    def closeout_state_mismatch(self, *, source_ref: str, evidence_ref: str) -> dict[str, Any]:
        return self._capture(
            surface="closeout_state_mismatch",
            friction_type="closeout_state_mismatch",
            source_ref=source_ref,
            evidence_ref=evidence_ref,
            severity="high",
            suggested_route="Orchestrator",
        )

    def context_token_budget_overrun(self, *, source_ref: str, evidence_ref: str) -> dict[str, Any]:
        return self._capture(
            surface="context_token_budget_overrun",
            friction_type="token_overuse",
            source_ref=source_ref,
            evidence_ref=evidence_ref,
            severity="medium",
            suggested_route="Planner",
        )

    def authority_boundary_violation(self, *, source_ref: str, evidence_ref: str) -> dict[str, Any]:
        return self._capture(
            surface="authority_boundary_violation",
            friction_type="boundary_violation",
            source_ref=source_ref,
            evidence_ref=evidence_ref,
            severity="high",
            suggested_route="Reviewer",
        )

    def _capture(
        self,
        *,
        surface: str,
        friction_type: str,
        source_ref: str,
        evidence_ref: str,
        severity: str,
        suggested_route: str,
    ) -> dict[str, Any]:
        return self.registry.record_signal(
            {
                "signalType": friction_type,
                "severity": severity,
                "sourceSurface": surface,
                "sourceRef": source_ref,
                "recurrenceKey": f"{surface}:{friction_type}",
                "evidenceRef": evidence_ref,
                "suggestedRoute": suggested_route,
                "authorityBoundary": "evidence-only",
                "sensitiveEvidence": False,
                "redactionStatus": "clean",
            }
        )


class FrictionService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def record_friction(
        self,
        *,
        friction_record_id: str,
        friction_type: str,
        owner: str,
        evidence_ids: list[str],
        occurrence_count: int,
        source: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_friction(friction_record_id)
        record = {
            "friction_record_id": friction_record_id,
            "friction_type": friction_type,
            "owner": owner,
            "evidence_ids": evidence_ids,
            "occurrence_count": occurrence_count,
            "status": "recorded",
            "source": source,
            "source_watermark": self.store.latest_event_seq(),
        }
        with self.store.transaction() as conn:
            trace = self.store.append_event(
                event_type="friction_recorded",
                actor_id="self-improvement",
                actor_role="System",
                authority_basis="friction capture",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into friction_records (
                  friction_record_id, friction_type, owner, evidence_ids_json,
                  occurrence_count, status, source, source_watermark,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    friction_record_id,
                    friction_type,
                    owner,
                    json.dumps(evidence_ids, sort_keys=True),
                    occurrence_count,
                    record["status"],
                    source,
                    record["source_watermark"],
                    trace["event_id"],
                    trace["event_seq"],
                ),
            )
        return self.get_friction(friction_record_id)

    def get_friction(self, friction_record_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from friction_records where friction_record_id = ?",
                (friction_record_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown friction record: {friction_record_id}")
        return _friction_from_row(dict(row))


def _friction_from_row(row: dict[str, Any]) -> dict[str, Any]:
    row["evidence_ids"] = json.loads(row.pop("evidence_ids_json"))
    return row


def _normalize_signal(signal: dict[str, Any]) -> dict[str, Any]:
    signal_type = signal.get("type") or signal.get("signal_type") or signal.get("signalType")
    source_surface = signal.get("source_surface") or signal.get("sourceSurface") or signal.get("observedAtGate")
    recurrence_key = signal.get("recurrence_key") or signal.get("recurrenceKey") or signal.get("dedupeKey")
    evidence_ref = signal.get("evidence_ref") or signal.get("evidenceRef")
    source_ref = signal.get("source_ref") or signal.get("sourceRef") or source_surface
    source_xp = signal.get("sourceXp") or signal.get("source_xp") or "XP-09"
    dedupe_key = signal.get("dedupeKey") or f"{source_xp}:{source_surface}:{recurrence_key}:{signal_type}"
    evidence_ids = signal.get("evidenceIds") or signal.get("evidence_ids") or ([evidence_ref] if evidence_ref else [])
    normalized = {
        "eventType": "friction.signal",
        "sourceXp": source_xp,
        "packetId": signal.get("packetId") or signal.get("packet_id"),
        "signalType": signal_type,
        "severity": signal.get("severity", "medium"),
        "observedAtGate": source_surface,
        "evidenceIds": list(evidence_ids),
        "dedupeKey": dedupe_key,
        "preventableByHarness": bool(signal.get("preventableByHarness", True)),
        "candidateFixType": signal.get("candidateFixType") or "validator",
        "remediationTarget": signal.get("remediationTarget") or "compound-engineering",
        "sourceSurface": source_surface,
        "sourceRef": source_ref,
        "recurrenceKey": recurrence_key,
        "evidenceRef": evidence_ref,
        "suggestedRoute": signal.get("suggested_route") or signal.get("suggestedRoute"),
        "authorityBoundary": signal.get("authority_boundary") or signal.get("authorityBoundary") or "evidence-only",
        "sensitiveEvidence": bool(signal.get("sensitive_evidence", signal.get("sensitiveEvidence", False))),
        "redactionStatus": signal.get("redaction_status") or signal.get("redactionStatus") or "clean",
    }
    if not signal.get("id"):
        digest = sha256(
            "|".join(
                str(normalized.get(field, ""))
                for field in ("signalType", "sourceSurface", "recurrenceKey", "evidenceRef")
            ).encode("utf-8")
        ).hexdigest()[:12]
        normalized["signalId"] = f"friction-{digest}"
    else:
        normalized["signalId"] = signal.get("id")
    return normalized


def _validate_signal(signal: dict[str, Any]) -> list[str]:
    diagnostics: list[str] = []
    required = {
        "eventType",
        "sourceXp",
        "signalType",
        "severity",
        "observedAtGate",
        "evidenceIds",
        "dedupeKey",
        "sourceSurface",
        "sourceRef",
        "recurrenceKey",
        "evidenceRef",
        "suggestedRoute",
        "authorityBoundary",
        "redactionStatus",
    }
    for field in sorted(required):
        value = signal.get(field)
        if value is None or value == "" or value == []:
            diagnostics.append(f"missing_signal_field:{field}")
    if signal.get("signalType") not in SEED_FRICTION_TYPES:
        diagnostics.append("unknown_friction_type")
    if signal.get("severity") not in SEVERITIES:
        diagnostics.append("invalid_friction_severity")
    if signal.get("sourceSurface") not in MINIMUM_CAPTURE_SURFACES:
        diagnostics.append("untrusted_capture_surface")
    if not signal.get("evidenceRef") or not signal.get("evidenceIds"):
        diagnostics.append("missing_evidence_ref")
    if signal.get("sensitiveEvidence") and signal.get("redactionStatus") != "redacted":
        diagnostics.append("sensitive_evidence_not_redacted")
    return diagnostics
