"""Conductor-facing routing, entry, and delegated approval contracts."""

from __future__ import annotations

from dataclasses import dataclass
import re
import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from standard_harness.policy.risk import RISK_ORDER
from standard_harness.policy.risk import normalize_risk_level
from standard_harness.policy.risk import risk_value
from standard_harness.state.store import HarnessStore


PROVIDER_ENTRY_FILES = {
    "codex": "AGENTS.md",
    "claude_code": "CLAUDE.md",
}

TRUSTED_APPROVAL_CHANNELS = {"trusted_harness_command", "trusted_harness_service"}
_SAFE_DELEGATION_GRANT_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
_SERVICE_CREATED_GRANT_SNAPSHOTS: dict[str, str] = {}


@dataclass(frozen=True)
class ConductorSelectionService:
    """Create provider-neutral Conductor selection records."""

    def select(
        self,
        *,
        conductor_id: str,
        provider_example: str,
        selected_by: str,
        selected_at: str,
    ) -> dict[str, Any]:
        provider = provider_example.strip().lower().replace("-", "_")
        if provider not in PROVIDER_ENTRY_FILES:
            return {
                "status": "rejected",
                "diagnostics": ["unsupported_conductor_provider"],
                "provider_example": provider_example,
                "product_identity": False,
                "approval_authority_granted": False,
            }
        return {
            "status": "active",
            "conductor_id": conductor_id,
            "provider_example": provider,
            "surface": "app",
            "selected_entry_file": PROVIDER_ENTRY_FILES[provider],
            "selected_by": selected_by,
            "selected_at": selected_at,
            "approval_authority_granted": False,
            "product_identity": False,
        }


class ConductorEntryFileService:
    """Generate and validate initialized-project entry files."""

    def __init__(self, project_root: str | Path):
        self.project_root = Path(project_root)

    def generate(self, selection: dict[str, Any]) -> dict[str, Any]:
        entry_name = str(selection.get("selected_entry_file", ""))
        diagnostics = self.validate_entry_path(self.project_root / entry_name)
        if diagnostics:
            return {"status": "rejected", "diagnostics": diagnostics}
        entry_path = self.project_root / entry_name
        text = self._entry_text(selection)
        text_diagnostics = self.validate_entry_text(entry_name, text)
        if text_diagnostics:
            return {"status": "rejected", "diagnostics": text_diagnostics}
        entry_path.write_text(text, encoding="utf-8")
        return {
            "status": "written",
            "entry_path": str(entry_path),
            "selected_entry_file": entry_name,
            "product_identity": False,
        }

    def validate_entry_path(self, entry_path: str | Path) -> list[str]:
        path = Path(entry_path)
        diagnostics: list[str] = []
        if path.name not in set(PROVIDER_ENTRY_FILES.values()):
            diagnostics.append("unsupported_entry_file")
        try:
            path.resolve().relative_to(self.project_root.resolve())
        except (OSError, ValueError):
            diagnostics.append("entry_path_escape")
        return diagnostics

    def validate_entry_text(self, entry_name: str, text: str) -> list[str]:
        lowered = text.lower()
        diagnostics: list[str] = []
        if entry_name not in set(PROVIDER_ENTRY_FILES.values()):
            diagnostics.append("unsupported_entry_file")
        if "harness authority" not in lowered or "packet boundary" not in lowered:
            diagnostics.append("missing_harness_authority_warning")
        forbidden_patterns = [
            "approve ready for code without packet review",
            "approve closeout without evidence",
            "llm output is truth",
            "skip packet_doc_review",
            "store api key",
            "store session token",
        ]
        if any(pattern in lowered for pattern in forbidden_patterns):
            diagnostics.append("forbidden_approval_bypass")
        return diagnostics

    def validate_command_descriptor(self, descriptor: dict[str, Any]) -> list[str]:
        argv = descriptor.get("argv")
        if not isinstance(argv, list) or not all(isinstance(part, str) for part in argv):
            return ["invalid_command_descriptor"]
        diagnostics: list[str] = []
        shell_tokens = ["$(", "`", "&&", "||", ";", "|", ">", "<"]
        if any(any(token in part for token in shell_tokens) for part in argv):
            diagnostics.append("untrusted_shell_interpolation")
        if any("\n" in part or "\r" in part for part in argv):
            diagnostics.append("untrusted_command_newline")
        return diagnostics

    def _entry_text(self, selection: dict[str, Any]) -> str:
        return "\n".join(
            [
                "# Standard Harness Conductor Entry",
                "",
                f"Conductor id: {selection['conductor_id']}",
                f"Provider example: {selection['provider_example']}",
                "",
                "Follow harness authority, approved packet boundary, trusted evidence,",
                "and explicit Human or valid scoped Conductor approval records.",
                "This entry is generated for an initialized project and is not product identity.",
                "Worker output is evidence input only and cannot create approval state.",
                "",
            ]
        )


class ConductorLedger:
    """Persist Conductor read-model records as queryable events."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def record_selection(
        self, *, selection: dict[str, Any], idempotency_key: str
    ) -> dict[str, Any]:
        return self._append(
            event_type="conductor.selection_recorded",
            record=selection,
            packet_id=None,
            idempotency_key=idempotency_key,
            authority_basis="conductor selection read model",
        )

    def record_entry_metadata(
        self, *, metadata: dict[str, Any], idempotency_key: str
    ) -> dict[str, Any]:
        return self._append(
            event_type="conductor.entry_metadata_recorded",
            record=metadata,
            packet_id=None,
            idempotency_key=idempotency_key,
            authority_basis="conductor entry metadata read model",
        )

    def record_delegation_grant(
        self, *, grant: dict[str, Any], idempotency_key: str
    ) -> dict[str, Any]:
        record = dict(grant)
        record.pop("grant_provenance", None)
        return self._append(
            event_type="conductor.delegation_grant_recorded",
            record=record,
            packet_id=record.get("packet_id"),
            idempotency_key=idempotency_key,
            authority_basis="conductor delegation grant read model",
        )

    def record_routing_decision(
        self, *, routing_decision: dict[str, Any], idempotency_key: str
    ) -> dict[str, Any]:
        return self._append(
            event_type="conductor.routing_decision_recorded",
            record=routing_decision,
            packet_id=routing_decision.get("packet_id"),
            idempotency_key=idempotency_key,
            authority_basis="conductor routing read model",
        )

    def record_worker_output_ref(
        self, *, worker_output_ref: dict[str, Any], idempotency_key: str
    ) -> dict[str, Any]:
        return self._append(
            event_type="conductor.worker_output_ref_recorded",
            record=worker_output_ref,
            packet_id=worker_output_ref.get("packet_id"),
            idempotency_key=idempotency_key,
            authority_basis="worker output evidence reference read model",
        )

    def record_adjudication(
        self, *, adjudication: dict[str, Any], idempotency_key: str
    ) -> dict[str, Any]:
        return self._append(
            event_type="conductor.adjudication_recorded",
            record=adjudication,
            packet_id=adjudication.get("packet_id"),
            idempotency_key=idempotency_key,
            authority_basis="conductor adjudication read model",
        )

    def record_approval_decision(
        self, *, approval_decision: dict[str, Any], idempotency_key: str
    ) -> dict[str, Any]:
        return self._append(
            event_type="conductor.approval_decision_recorded",
            record=approval_decision,
            packet_id=approval_decision.get("packet_id"),
            idempotency_key=idempotency_key,
            authority_basis="conductor approval decision read model",
        )

    def query(self, event_type: str, *, packet_id: str | None = None) -> list[dict[str, Any]]:
        records = self._events(event_type)
        return [
            record
            for record in records
            if packet_id is None or record.get("packet_id") == packet_id
        ]

    def _append(
        self,
        *,
        event_type: str,
        record: dict[str, Any],
        packet_id: str | None,
        idempotency_key: str,
        authority_basis: str,
    ) -> dict[str, Any]:
        existing = self.store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            return dict(existing["payload"])
        payload = dict(record)
        payload.setdefault("truth_claim", False)
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type=event_type,
                actor_id="conductor-ledger",
                actor_role="System",
                authority_basis=authority_basis,
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=payload,
                conn=conn,
            )
        result = dict(payload)
        result["trace_event_id"] = event["event_id"]
        result["trace_event_seq"] = event["event_seq"]
        return result

    def _events(self, event_type: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select payload_json, event_id, event_seq from events where event_type = ? order by event_seq",
                (event_type,),
            ).fetchall()
        records: list[dict[str, Any]] = []
        for row in rows:
            payload = json.loads(row["payload_json"])
            payload["trace_event_id"] = row["event_id"]
            payload["trace_event_seq"] = row["event_seq"]
            records.append(payload)
        return records


@dataclass(frozen=True)
class ConductorApprovalService:
    """Validate Human direct and scoped Conductor delegated approvals."""

    def create_grant(
        self,
        *,
        delegation_grant_id: str,
        delegating_human_owner: str,
        conductor_id: str,
        packet_id: str,
        approval_type: str,
        risk_ceiling: str,
        evidence_prerequisites: list[str],
        valid_from: str,
        valid_until: str,
        packet_hash: str | None = None,
        status: str = "active",
    ) -> dict[str, Any]:
        _validate_delegation_grant_id(delegation_grant_id)
        grant = {
            "delegation_grant_id": delegation_grant_id,
            "delegating_human_owner": delegating_human_owner,
            "conductor_id": conductor_id,
            "packet_id": packet_id,
            "approval_type": approval_type,
            "risk_ceiling": _normalize_risk(risk_ceiling),
            "evidence_prerequisites": list(evidence_prerequisites),
            "valid_from": valid_from,
            "valid_until": valid_until,
            "packet_hash": packet_hash,
            "status": status,
            "revoked_by": None,
            "revoked_at": None,
            "invalidated_reason": None,
            "trusted_harness_surface": False,
        }
        creation_token = uuid4().hex
        grant["_service_creation_token"] = creation_token
        _SERVICE_CREATED_GRANT_SNAPSHOTS[creation_token] = _canonical_grant_json(grant)
        return grant

    def get_persisted_grant(
        self,
        store: HarnessStore,
        delegation_grant_id: str,
    ) -> dict[str, Any] | None:
        if not _safe_delegation_grant_id(delegation_grant_id):
            return None
        with store.connection() as conn:
            row = conn.execute(
                """
                select grant_json, source_event_id, source_event_seq
                from conductor_delegation_grants
                where delegation_grant_id = ?
                """,
                (delegation_grant_id,),
            ).fetchone()
        if row is None:
            return None
        grant = json.loads(row["grant_json"])
        grant["trace_event_id"] = row["source_event_id"]
        grant["trace_event_seq"] = row["source_event_seq"]
        return grant

    def record_grant(
        self,
        store: HarnessStore,
        grant: dict[str, Any],
        *,
        idempotency_key: str,
    ) -> dict[str, Any]:
        """Persist a scoped delegation grant through the trusted service path."""

        record = dict(grant)
        record.pop("grant_provenance", None)
        _validate_delegation_grant_id(str(record.get("delegation_grant_id") or ""))
        existing = store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            existing_grant_id = str(existing["payload"].get("delegation_grant_id") or "")
            incoming_grant_id = str(record.get("delegation_grant_id") or "")
            if incoming_grant_id and existing_grant_id and incoming_grant_id != existing_grant_id:
                raise ValueError("idempotent_grant_replay_mismatch")
            persisted = self.get_persisted_grant(
                store,
                str(existing_grant_id or incoming_grant_id),
            )
            if persisted is None:
                raise ValueError("trusted_grant_row_missing_for_idempotency_replay")
            return persisted

        creation_token = str(record.pop("_service_creation_token", "") or "")
        expected_snapshot = _SERVICE_CREATED_GRANT_SNAPSHOTS.pop(creation_token, None)
        if expected_snapshot is None or expected_snapshot != _canonical_grant_json(record):
            raise ValueError("untrusted_delegation_grant_record")
        record["trusted_harness_surface"] = True
        record["grant_provenance"] = {
            "source": "trusted_harness_service",
            "created_by_trusted_harness_service": True,
            "delegation_grant_id": record["delegation_grant_id"],
        }
        with store.transaction() as conn:
            event = store.append_event(
                event_type="conductor.delegation_grant_recorded",
                actor_id="conductor-approval-service",
                actor_role="System",
                authority_basis="trusted conductor delegation grant service",
                idempotency_key=idempotency_key,
                packet_id=record.get("packet_id"),
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert or replace into conductor_delegation_grants (
                  delegation_grant_id, packet_id, conductor_id, approval_type,
                  status, risk_ceiling, valid_from, valid_until, grant_json,
                  source_event_id, source_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["delegation_grant_id"],
                    record["packet_id"],
                    record["conductor_id"],
                    record["approval_type"],
                    record["status"],
                    record["risk_ceiling"],
                    record["valid_from"],
                    record["valid_until"],
                    json.dumps(record, sort_keys=True, separators=(",", ":")),
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        result = dict(record)
        result["trace_event_id"] = event["event_id"]
        result["trace_event_seq"] = event["event_seq"]
        return result

    def validate_delegation_grant(
        self,
        *,
        grant: dict[str, Any] | None,
        approval_type: str,
        conductor_id: str | None,
        packet_id: str,
        packet_hash: str,
        risk_level: str,
        evidence_prerequisite_status: dict[str, bool | str],
        decided_at: str,
        hard_stop_status: dict[str, bool] | None = None,
    ) -> list[str]:
        return self._diagnostics(
            approval_type=approval_type,
            actor_type="conductor",
            conductor_id=conductor_id,
            approval_channel="trusted_harness_service",
            authority_source=grant,
            packet_id=packet_id,
            packet_hash=packet_hash,
            risk_level=risk_level,
            evidence_prerequisite_status=evidence_prerequisite_status,
            decided_at=decided_at,
            hard_stop_status=hard_stop_status or {},
        )

    def transition_grant(
        self,
        grant: dict[str, Any],
        *,
        status: str,
        reason: str | None = None,
        actor: str | None = None,
        transitioned_at: str | None = None,
    ) -> dict[str, Any]:
        allowed = {
            "draft",
            "active",
            "consumed",
            "expired",
            "revoked",
            "invalidated_by_packet_change",
            "invalidated_by_risk_change",
            "invalidated_by_hard_stop",
            "invalidated_by_evidence_prerequisite_change",
        }
        if status not in allowed:
            raise ValueError(f"Unknown delegation status: {status}")
        transitioned = dict(grant)
        transitioned["status"] = status
        transitioned["invalidated_reason"] = reason
        if status == "revoked":
            transitioned["revoked_by"] = actor
            transitioned["revoked_at"] = transitioned_at
        return transitioned

    def decide(
        self,
        *,
        approval_type: str,
        actor_type: str,
        conductor_id: str | None,
        approval_channel: str,
        authority_source: dict[str, Any] | None,
        packet_id: str,
        packet_hash: str,
        risk_level: str,
        evidence_prerequisite_status: dict[str, bool],
        decision: str,
        decided_at: str,
        hard_stop_status: dict[str, bool] | None = None,
    ) -> dict[str, Any]:
        actor = {
            "actor_type": actor_type,
            "conductor_id": conductor_id,
            "approval_channel": approval_channel,
            "authority_source": (authority_source or {}).get("delegation_grant_id"),
        }
        diagnostics = self._diagnostics(
            approval_type=approval_type,
            actor_type=actor_type,
            conductor_id=conductor_id,
            approval_channel=approval_channel,
            authority_source=authority_source,
            packet_id=packet_id,
            packet_hash=packet_hash,
            risk_level=risk_level,
            evidence_prerequisite_status=evidence_prerequisite_status,
            decided_at=decided_at,
            hard_stop_status=hard_stop_status or {},
        )
        if diagnostics:
            return {
                "status": "rejected",
                "diagnostics": diagnostics,
                "actor": actor,
                "decision": decision,
                "created_by_trusted_harness_surface": approval_channel in TRUSTED_APPROVAL_CHANNELS,
            }
        return {
            "status": decision,
            "approval_type": approval_type,
            "actor": actor,
            "packet_id": packet_id,
            "packet_hash": packet_hash,
            "risk_level": _normalize_risk(risk_level),
            "evidence_prerequisite_status": dict(evidence_prerequisite_status),
            "decision": decision,
            "decided_at": decided_at,
            "created_by_trusted_harness_surface": True,
        }

    def _diagnostics(
        self,
        *,
        approval_type: str,
        actor_type: str,
        conductor_id: str | None,
        approval_channel: str,
        authority_source: dict[str, Any] | None,
        packet_id: str,
        packet_hash: str,
        risk_level: str,
        evidence_prerequisite_status: dict[str, bool],
        decided_at: str,
        hard_stop_status: dict[str, bool],
    ) -> list[str]:
        diagnostics: list[str] = []
        diagnostics.extend(_hard_stop_diagnostics(hard_stop_status))
        if actor_type == "human":
            if approval_channel not in TRUSTED_APPROVAL_CHANNELS:
                diagnostics.append("untrusted_approval_channel")
            if not (authority_source or {}).get("trusted_human_decision"):
                diagnostics.append("missing_trusted_human_decision")
            return diagnostics
        if actor_type == "planner":
            diagnostics.append("planner_delegated_approval_forbidden")
        if actor_type != "conductor":
            diagnostics.append("unsupported_approval_actor")
        if approval_channel not in TRUSTED_APPROVAL_CHANNELS:
            diagnostics.append("untrusted_approval_channel")
        grant = authority_source or {}
        if not grant:
            diagnostics.append("missing_delegation_grant")
            return diagnostics
        if grant.get("trusted_harness_surface") is not True:
            diagnostics.append("untrusted_delegation_grant")
        if grant.get("status") != "active":
            diagnostics.append("delegation_not_active")
        if grant.get("conductor_id") != conductor_id:
            diagnostics.append("wrong_conductor")
        if grant.get("packet_id") != packet_id:
            diagnostics.append("wrong_packet")
        if grant.get("approval_type") != approval_type:
            diagnostics.append("wrong_approval_type")
        if grant.get("packet_hash") and grant.get("packet_hash") != packet_hash:
            diagnostics.append("packet_hash_changed")
        if _risk_value(risk_level) > _risk_value(str(grant.get("risk_ceiling", ""))):
            diagnostics.append("risk_exceeds_delegation_ceiling")
        if decided_at < str(grant.get("valid_from", "")) or decided_at > str(grant.get("valid_until", "")):
            diagnostics.append("delegation_window_invalid")
        for prerequisite in grant.get("evidence_prerequisites", []):
            if not _prerequisite_verified(evidence_prerequisite_status.get(prerequisite)):
                diagnostics.append("missing_evidence_prerequisite")
                break
        return diagnostics


@dataclass(frozen=True)
class ConductorRoutingPolicy:
    """Deterministic risk/importance routing for Conductor-led work."""

    def route(
        self,
        *,
        packet_id: str,
        risk_level: str,
        importance_level: str,
        task_kind: str = "implementation",
        conductor_id: str = "selected-conductor",
        input_snapshot_hash: str = "unknown",
        permission_roots: list[str] | None = None,
        context_refs: list[str] | None = None,
    ) -> dict[str, Any]:
        risk = _normalize_risk(risk_level)
        importance = _normalize_risk(importance_level)
        if task_kind == "packet_authoring":
            route = "dual_provider_packet_authoring"
            workers = [
                _worker_task_envelope(
                    worker_id="worker-a",
                    assigned_role="Planner",
                    packet_id=packet_id,
                    provider_label="codex",
                    adapter_id="codex-cli-local",
                    input_snapshot_hash=input_snapshot_hash,
                    permission_roots=permission_roots or [],
                    context_refs=context_refs or [],
                    expected_output_kind="packet_draft",
                    conductor_id=conductor_id,
                ),
                _worker_task_envelope(
                    worker_id="worker-b",
                    assigned_role="packet_doc_reviewer",
                    packet_id=packet_id,
                    provider_label="claude_code",
                    adapter_id="claude-code-local",
                    input_snapshot_hash=input_snapshot_hash,
                    permission_roots=permission_roots or [],
                    context_refs=context_refs or [],
                    expected_output_kind="packet_doc_review",
                    conductor_id=conductor_id,
                ),
            ]
        elif _risk_value(risk) >= RISK_ORDER["high"] or _risk_value(importance) >= RISK_ORDER["high"]:
            route = "cross_llm_worker_verifier"
            workers = [
                _worker_task_envelope(
                    worker_id="worker-a",
                    assigned_role="Developer",
                    packet_id=packet_id,
                    provider_label="codex",
                    adapter_id="codex-cli-local",
                    input_snapshot_hash=input_snapshot_hash,
                    permission_roots=permission_roots or [],
                    context_refs=context_refs or [],
                    expected_output_kind="implementation_output",
                    conductor_id=conductor_id,
                ),
                _worker_task_envelope(
                    worker_id="worker-b",
                    assigned_role="Reviewer",
                    packet_id=packet_id,
                    provider_label="claude_code",
                    adapter_id="claude-code-local",
                    input_snapshot_hash=input_snapshot_hash,
                    permission_roots=permission_roots or [],
                    context_refs=context_refs or [],
                    expected_output_kind="verification_output",
                    conductor_id=conductor_id,
                ),
            ]
        elif _risk_value(risk) >= RISK_ORDER["standard"] or _risk_value(importance) >= RISK_ORDER["standard"]:
            route = "single_cli_agent"
            workers = [
                _worker_task_envelope(
                    worker_id="worker-a",
                    assigned_role="Developer",
                    packet_id=packet_id,
                    provider_label="codex",
                    adapter_id="codex-cli-local",
                    input_snapshot_hash=input_snapshot_hash,
                    permission_roots=permission_roots or [],
                    context_refs=context_refs or [],
                    expected_output_kind="implementation_output",
                    conductor_id=conductor_id,
                )
            ]
        else:
            route = "conductor_direct"
            workers = []
        return {
            "routing_decision_id": f"{packet_id}:{task_kind}:{risk}:{importance}",
            "packet_id": packet_id,
            "risk_level": risk,
            "importance_level": importance,
            "selected_route": route,
            "rationale": "deterministic risk/importance policy",
            "human_escalation_required": route in {"cross_llm_worker_verifier", "dual_provider_packet_authoring"},
            "selected_workers": workers,
            "required_review_or_evidence": _required_evidence(route),
        }

    def worker_output_ref(
        self,
        *,
        worker_task: dict[str, Any],
        output_envelope_path: str,
        artifact_manifest_refs: list[str],
        evidence_refs: list[str],
        diagnostics: list[str] | None = None,
        verified_evidence: bool = False,
    ) -> dict[str, Any]:
        return {
            "packet_id": worker_task["packet_id"],
            "worker_task_id": worker_task["worker_task_id"],
            "output_envelope_path": output_envelope_path,
            "artifact_manifest_refs": list(artifact_manifest_refs),
            "evidence_refs": list(evidence_refs),
            "diagnostics": list(diagnostics or []),
            "authority_level": "evidence_read_model_only",
            "status": "verified" if verified_evidence else "pending_evidence_verification",
            "approval_state_mutation_allowed": False,
        }

    def adjudicate(
        self,
        *,
        packet_id: str,
        worker_outputs: list[dict[str, Any]],
        disagreements: list[str],
        resolution: str,
        unresolved_items: list[str],
        next_route: str,
    ) -> dict[str, Any]:
        return {
            "packet_id": packet_id,
            "adjudication_id": f"{packet_id}:adjudication:{len(worker_outputs)}",
            "worker_outputs": list(worker_outputs),
            "disagreements": list(disagreements),
            "resolution": resolution,
            "unresolved_items": list(unresolved_items),
            "next_route": next_route,
            "human_decision_required": bool(unresolved_items),
            "truth_claim": False,
        }


def _required_evidence(route: str) -> list[str]:
    if route == "conductor_direct":
        return ["conductor_log"]
    if route == "single_cli_agent":
        return ["worker_output_envelope"]
    if route == "cross_llm_worker_verifier":
        return ["worker_output_envelope", "verifier_output_envelope", "conductor_adjudication"]
    return ["planner_draft_envelope", "packet_doc_review_envelope", "conductor_adjudication"]


def _worker_task_envelope(
    *,
    worker_id: str,
    assigned_role: str,
    packet_id: str,
    provider_label: str,
    adapter_id: str,
    input_snapshot_hash: str,
    permission_roots: list[str],
    context_refs: list[str],
    expected_output_kind: str,
    conductor_id: str,
) -> dict[str, Any]:
    return {
        "worker_task_id": f"{packet_id}:{worker_id}",
        "packet_id": packet_id,
        "assigned_role": assigned_role,
        "adapter_id": adapter_id,
        "provider_label": provider_label,
        "input_snapshot_hash": input_snapshot_hash,
        "permission_roots": list(permission_roots),
        "context_refs": list(context_refs),
        "expected_output_kind": expected_output_kind,
        "created_by_conductor_id": conductor_id,
        "authority_level": "worker_task_only",
    }


def _hard_stop_diagnostics(status: dict[str, bool]) -> list[str]:
    required = {
        "packet_exists": "missing_packet",
        "packet_hash_current": "packet_hash_changed",
        "transition_valid": "invalid_transition",
        "packet_doc_review_passed": "missing_packet_doc_review",
        "evidence_prerequisites_met": "missing_evidence_prerequisite",
        "no_critical_security_blocker": "critical_security_blocker",
    }
    diagnostics: list[str] = []
    for field, diagnostic in required.items():
        if status and status.get(field) is not True:
            diagnostics.append(diagnostic)
    return diagnostics


def _prerequisite_verified(value: Any) -> bool:
    if isinstance(value, dict):
        return value.get("status") == "verified_by_harness"
    return value == "verified_by_harness"


def _normalize_risk(risk: str) -> str:
    return normalize_risk_level(risk, default="standard", unknown="critical")


def _risk_value(risk: str) -> int:
    return risk_value(risk, unknown="critical")


def _safe_delegation_grant_id(value: str) -> bool:
    grant_id = str(value or "")
    return bool(_SAFE_DELEGATION_GRANT_ID.fullmatch(grant_id)) and ".." not in grant_id


def _validate_delegation_grant_id(value: str) -> None:
    if not _safe_delegation_grant_id(value):
        raise ValueError("unsafe_delegation_grant_id")


def _canonical_grant_json(grant: dict[str, Any]) -> str:
    record = dict(grant)
    record.pop("_service_creation_token", None)
    record.pop("trace_event_id", None)
    record.pop("trace_event_seq", None)
    record.pop("grant_provenance", None)
    return json.dumps(record, sort_keys=True, separators=(",", ":"))
