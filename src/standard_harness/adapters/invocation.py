"""Adapter invocation ledger backed by append-only events."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.adapters.contract_matrix import AdapterBoundaryValidator
from standard_harness.state.store import HarnessStore


class AdapterInvocationLedger:
    """Persist adapter invocation records without allowing direct state mutation."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def record_invocation(
        self,
        *,
        adapter_run_id: str,
        adapter_id: str,
        adapter_version: str,
        input_snapshot_hash: str,
        permission_roots: list[str],
        artifact_manifest: list[dict[str, Any]],
        event_request: dict[str, Any],
        failure_classification: str | None,
        evidence_provenance: dict[str, Any],
        timeout_seconds: int,
        retry_count: int,
        cancel_status: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        existing_event = self.store.event_for_idempotency_key(idempotency_key)
        if existing_event is not None:
            adapter_run_id = existing_event["payload"]["adapter_run_id"]
            try:
                return self.get_invocation(adapter_run_id)
            except KeyError:
                return _record_from_event_payload(existing_event["payload"], existing_event)
        if self._invocation_exists(adapter_run_id) or self._event_identity_exists(adapter_run_id):
            raise ValueError(f"adapter_run_id already exists: {adapter_run_id}")
        envelope = {
            "adapter_run_id": adapter_run_id,
            "input_snapshot_hash": input_snapshot_hash,
            "permission_roots": permission_roots,
            "artifact_manifest": artifact_manifest,
            "event_request": event_request,
            "failure_classification": failure_classification,
            "evidence_provenance": evidence_provenance,
        }
        boundary = AdapterBoundaryValidator().validate_envelope(envelope)
        if boundary["status"] == "rejected":
            raise ValueError(f"Adapter invocation rejected: {boundary['failure_classification']}")

        source_watermark = self.store.latest_event_seq()
        record = {
            "adapter_run_id": adapter_run_id,
            "adapter_id": adapter_id,
            "adapter_version": adapter_version,
            "input_snapshot_hash": input_snapshot_hash,
            "permission_roots": permission_roots,
            "artifact_manifest": artifact_manifest,
            "event_request": event_request,
            "failure_classification": failure_classification,
            "evidence_provenance": evidence_provenance,
            "timeout_seconds": timeout_seconds,
            "retry_count": retry_count,
            "cancel_status": cancel_status,
            "idempotency_key": idempotency_key,
            "source_event_range": _source_event_range(source_watermark),
            "source_watermark": source_watermark,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="adapter.invocation_recorded",
                actor_id="adapter-ledger",
                actor_role="System",
                authority_basis="adapter invocation ledger",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into adapter_invocations (
                  adapter_run_id, adapter_id, adapter_version,
                  input_snapshot_hash, permission_roots_json,
                  artifact_manifest_json, event_request_json,
                  failure_classification, evidence_provenance_json,
                  timeout_seconds, retry_count, cancel_status,
                  idempotency_key,
                  source_event_range, source_watermark,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _invocation_values(record, event["event_id"], event["event_seq"]),
            )
        return self.get_invocation(adapter_run_id)

    def get_invocation(self, adapter_run_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from adapter_invocations where adapter_run_id = ?",
                (adapter_run_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown adapter invocation: {adapter_run_id}")
        result = dict(row)
        result["permission_roots"] = json.loads(result.pop("permission_roots_json"))
        result["artifact_manifest"] = json.loads(result.pop("artifact_manifest_json"))
        result["event_request"] = json.loads(result.pop("event_request_json"))
        result["evidence_provenance"] = json.loads(result.pop("evidence_provenance_json"))
        return result

    def _invocation_exists(self, adapter_run_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from adapter_invocations where adapter_run_id = ?",
                (adapter_run_id,),
            ).fetchone()
        return row is not None

    def _event_identity_exists(self, adapter_run_id: str) -> bool:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select payload_json from events
                where event_type = 'adapter.invocation_recorded'
                """
            ).fetchall()
        for row in rows:
            payload = json.loads(row["payload_json"])
            if payload.get("adapter_run_id") == adapter_run_id:
                return True
        return False


def _source_event_range(source_watermark: int) -> str:
    if source_watermark <= 0:
        return "1-0"
    return f"1-{source_watermark}"


def _record_from_event_payload(
    payload: dict[str, Any], event: dict[str, Any]
) -> dict[str, Any]:
    result = dict(payload)
    result["trace_event_id"] = event["event_id"]
    result["trace_event_seq"] = event["event_seq"]
    return result


def _invocation_values(
    record: dict[str, Any], event_id: str, event_seq: int
) -> tuple[Any, ...]:
    return (
        record["adapter_run_id"],
        record["adapter_id"],
        record["adapter_version"],
        record["input_snapshot_hash"],
        json.dumps(record["permission_roots"], sort_keys=True),
        json.dumps(record["artifact_manifest"], sort_keys=True),
        json.dumps(record["event_request"], sort_keys=True),
        record["failure_classification"],
        json.dumps(record["evidence_provenance"], sort_keys=True),
        record["timeout_seconds"],
        record["retry_count"],
        record["cancel_status"],
        record["idempotency_key"],
        record["source_event_range"],
        record["source_watermark"],
        event_id,
        event_seq,
    )
