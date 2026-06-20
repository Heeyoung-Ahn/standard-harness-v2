"""Evidence manifest and claim ledger service."""

from __future__ import annotations

import json

from standard_harness.state.events import HASH_ALGORITHM, sha256_text, utc_now_iso
from standard_harness.state.store import HarnessStore


EVIDENCE_STATUSES = {"passed", "failed", "blocked", "stale", "substitute", "not_applicable"}
SUPPORT_STATUSES = {"supported", "partial", "unverified", "contradicted", "superseded", "rejected"}


class EvidenceService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def register_evidence(
        self,
        *,
        evidence_id: str,
        packet_id: str,
        claim_id: str | None,
        command_or_tool: str,
        runner: str,
        cwd_or_execution_context: str,
        environment_fingerprint: str,
        artifact_path: str,
        content: str,
        result_status: str,
        rationale: str,
        idempotency_key: str,
    ) -> dict[str, object]:
        if result_status not in EVIDENCE_STATUSES:
            raise ValueError(f"Invalid evidence status: {result_status}")
        timestamp = utc_now_iso()
        content_hash = sha256_text(content)
        evidence = {
            "evidence_id": evidence_id,
            "packet_id": packet_id,
            "claim_id": claim_id,
            "command_or_tool": command_or_tool,
            "runner": runner,
            "timestamp": timestamp,
            "cwd_or_execution_context": cwd_or_execution_context,
            "environment_fingerprint": environment_fingerprint,
            "artifact_path": artifact_path,
            "content_hash": content_hash,
            "content_hash_algorithm": HASH_ALGORITHM,
            "result_status": result_status,
            "rationale": rationale,
        }
        self.store.append_event(
            event_type="evidence.registered",
            actor_id=runner,
            actor_role="Tester",
            authority_basis="evidence registration",
            idempotency_key=idempotency_key,
            packet_id=packet_id,
            payload=evidence,
        )
        with self.store.connection() as conn:
            conn.execute(
                """
                insert or ignore into evidence (
                  evidence_id, packet_id, claim_id, command_or_tool, runner,
                  timestamp, cwd_or_execution_context, environment_fingerprint,
                  artifact_path, content_hash, content_hash_algorithm,
                  result_status, rationale
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    evidence_id,
                    packet_id,
                    claim_id,
                    command_or_tool,
                    runner,
                    timestamp,
                    cwd_or_execution_context,
                    environment_fingerprint,
                    artifact_path,
                    content_hash,
                    HASH_ALGORITHM,
                    result_status,
                    rationale,
                ),
            )
            conn.commit()
        return self.get_evidence(evidence_id)

    def record_claim(
        self,
        *,
        claim_id: str,
        packet_id: str,
        requirement_id: str,
        acceptance_criterion_id: str,
        evidence_ids: list[str],
        support_status: str,
        idempotency_key: str,
        gate_result_ids_optional: list[str] | None = None,
    ) -> dict[str, object]:
        if support_status not in SUPPORT_STATUSES:
            raise ValueError(f"Invalid support status: {support_status}")
        if support_status == "supported":
            self._validate_supported_evidence(evidence_ids)
        now = utc_now_iso()
        claim = {
            "claim_id": claim_id,
            "packet_id": packet_id,
            "requirement_id": requirement_id,
            "acceptance_criterion_id": acceptance_criterion_id,
            "evidence_ids": evidence_ids,
            "support_status": support_status,
            "gate_result_ids_optional": gate_result_ids_optional or [],
            "created_at": now,
            "updated_at": now,
        }
        self.store.append_event(
            event_type="claim.recorded",
            actor_id="developer",
            actor_role="Developer",
            authority_basis="claim ledger entry",
            idempotency_key=idempotency_key,
            packet_id=packet_id,
            payload=claim,
        )
        with self.store.connection() as conn:
            conn.execute(
                """
                insert or ignore into claims (
                  claim_id, packet_id, requirement_id, acceptance_criterion_id,
                  evidence_ids_json, support_status, gate_result_ids_json,
                  created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    claim_id,
                    packet_id,
                    requirement_id,
                    acceptance_criterion_id,
                    json.dumps(evidence_ids, sort_keys=True),
                    support_status,
                    json.dumps(gate_result_ids_optional or [], sort_keys=True),
                    now,
                    now,
                ),
            )
            conn.commit()
        return self.get_claim(claim_id)

    def get_evidence(self, evidence_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute("select * from evidence where evidence_id = ?", (evidence_id,)).fetchone()
        if row is None:
            raise KeyError(f"Unknown evidence: {evidence_id}")
        return dict(row)

    def get_claim(self, claim_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute("select * from claims where claim_id = ?", (claim_id,)).fetchone()
        if row is None:
            raise KeyError(f"Unknown claim: {claim_id}")
        result = dict(row)
        result["evidence_ids"] = json.loads(result.pop("evidence_ids_json"))
        result["gate_result_ids_optional"] = json.loads(result.pop("gate_result_ids_json"))
        return result

    def _validate_supported_evidence(self, evidence_ids: list[str]) -> None:
        if not evidence_ids:
            raise ValueError("support_status=supported requires supporting evidence ids")
        for evidence_id in evidence_ids:
            evidence = self.get_evidence(evidence_id)
            if evidence["result_status"] != "passed":
                raise ValueError("support_status=supported requires passed evidence")
