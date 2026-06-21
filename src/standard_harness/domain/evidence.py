"""Evidence manifest and claim ledger service."""

from __future__ import annotations

import json

from standard_harness.domain.packets import PacketService
from standard_harness.domain.requirements import RequirementRegistry
from standard_harness.evidence.trust import EvidenceTrustPolicy
from standard_harness.evidence.trust import TRUST_STATUSES
from standard_harness.evidence.trust import VALIDATION_STATUSES
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
        evidence_type: str = "command-log",
        producer_role: str = "tester",
        producer_provider: str = "local",
        produced_via: str = "manual-handoff",
        exit_code: int | None = None,
        base_commit: str | None = None,
        head_commit: str | None = None,
        workspace_id: str | None = None,
        trust_status: str | None = None,
        validation_status: str | None = None,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_evidence(evidence_id)
        if self._row_exists("evidence", "evidence_id", evidence_id):
            raise ValueError(f"evidence_id already exists: {evidence_id}")
        self._require_packet(packet_id)
        if claim_id is not None:
            claim = self._require_claim(claim_id)
            if claim["packet_id"] != packet_id:
                raise ValueError("evidence claim must belong to the same packet")
        if result_status not in EVIDENCE_STATUSES:
            raise ValueError(f"Invalid evidence status: {result_status}")
        trust_policy = EvidenceTrustPolicy()
        effective_validation_status = validation_status or trust_policy.derive_validation_status(
            result_status
        )
        effective_trust_status = trust_status or trust_policy.derive_trust_status(
            result_status=result_status,
            produced_via=produced_via,
            base_commit=base_commit,
            head_commit=head_commit,
            workspace_id=workspace_id,
        )
        if effective_validation_status not in VALIDATION_STATUSES:
            raise ValueError(f"Invalid evidence validation status: {effective_validation_status}")
        if effective_trust_status not in TRUST_STATUSES:
            raise ValueError(f"Invalid evidence trust status: {effective_trust_status}")
        timestamp = utc_now_iso()
        content_hash = sha256_text(content)
        evidence = {
            "evidence_id": evidence_id,
            "packet_id": packet_id,
            "claim_id": claim_id,
            "evidence_type": evidence_type,
            "producer_role": producer_role,
            "producer_provider": producer_provider,
            "produced_via": produced_via,
            "command_or_tool": command_or_tool,
            "command": command_or_tool,
            "exit_code": exit_code if exit_code is not None else (0 if result_status == "passed" else 1),
            "base_commit": base_commit,
            "head_commit": head_commit,
            "workspace_id": workspace_id or packet_id,
            "runner": runner,
            "timestamp": timestamp,
            "cwd_or_execution_context": cwd_or_execution_context,
            "environment_fingerprint": environment_fingerprint,
            "artifact_path": artifact_path,
            "content_hash": content_hash,
            "content_hash_algorithm": HASH_ALGORITHM,
            "result_status": result_status,
            "validation_status": effective_validation_status,
            "trust_status": effective_trust_status,
            "claims": [claim_id] if claim_id else [],
            "rationale": rationale,
        }
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="evidence.registered",
                actor_id=runner,
                actor_role="Tester",
                authority_basis="evidence registration",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=evidence,
                conn=conn,
            )
            conn.execute(
                """
                insert or ignore into evidence (
                  evidence_id, packet_id, claim_id, evidence_type, producer_role,
                  producer_provider, produced_via, command_or_tool, command,
                  exit_code, base_commit, head_commit, workspace_id, runner,
                  timestamp, cwd_or_execution_context, environment_fingerprint,
                  artifact_path, content_hash, content_hash_algorithm,
                  result_status, validation_status, trust_status, claims_json, rationale
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    evidence_id,
                    packet_id,
                    claim_id,
                    evidence_type,
                    producer_role,
                    producer_provider,
                    produced_via,
                    command_or_tool,
                    command_or_tool,
                    evidence["exit_code"],
                    base_commit,
                    head_commit,
                    evidence["workspace_id"],
                    runner,
                    timestamp,
                    cwd_or_execution_context,
                    environment_fingerprint,
                    artifact_path,
                    content_hash,
                    HASH_ALGORITHM,
                    result_status,
                    effective_validation_status,
                    effective_trust_status,
                    json.dumps(evidence["claims"], sort_keys=True),
                    rationale,
                ),
            )
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
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_claim(claim_id)
        if self._row_exists("claims", "claim_id", claim_id):
            raise ValueError(f"claim_id already exists: {claim_id}")
        self._require_packet(packet_id)
        requirement = self._require_requirement(requirement_id)
        if requirement["packet_id"] != packet_id:
            raise ValueError("claim requirement must belong to the same packet")
        criterion = self._require_acceptance_criterion(acceptance_criterion_id)
        if criterion["packet_id"] != packet_id:
            raise ValueError("claim acceptance criterion must belong to the same packet")
        if criterion["requirement_id"] != requirement_id:
            raise ValueError("claim acceptance criterion must belong to the claim requirement")
        self._validate_evidence_packet(evidence_ids, packet_id)
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
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="claim.recorded",
                actor_id="developer",
                actor_role="Developer",
                authority_basis="claim ledger entry",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=claim,
                conn=conn,
            )
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
        return self.get_claim(claim_id)

    def get_evidence(self, evidence_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute("select * from evidence where evidence_id = ?", (evidence_id,)).fetchone()
        if row is None:
            raise KeyError(f"Unknown evidence: {evidence_id}")
        evidence = dict(row)
        evidence.setdefault("evidence_type", "command-log")
        evidence.setdefault("producer_role", "tester")
        evidence.setdefault("producer_provider", "local")
        evidence.setdefault("produced_via", "manual-handoff")
        evidence.setdefault("command", evidence.get("command_or_tool", ""))
        evidence.setdefault("exit_code", 0 if evidence.get("result_status") == "passed" else 1)
        evidence.setdefault("base_commit", None)
        evidence.setdefault("head_commit", None)
        evidence.setdefault("workspace_id", evidence.get("packet_id"))
        trust_policy = EvidenceTrustPolicy()
        if evidence.get("command") == "":
            evidence["command"] = evidence.get("command_or_tool", "")
        if evidence.get("validation_status") == "RECORDED" and evidence.get("result_status") != "not_applicable":
            evidence["validation_status"] = trust_policy.derive_validation_status(
                str(evidence.get("result_status"))
            )
        if evidence.get("trust_status") == "RECORDED" and evidence.get("result_status") == "passed":
            evidence["trust_status"] = trust_policy.derive_trust_status(
                result_status=str(evidence.get("result_status")),
                produced_via=str(evidence.get("produced_via")),
                base_commit=evidence.get("base_commit"),
                head_commit=evidence.get("head_commit"),
                workspace_id=evidence.get("workspace_id"),
            )
        evidence.setdefault(
            "validation_status",
            trust_policy.derive_validation_status(str(evidence.get("result_status"))),
        )
        evidence.setdefault("trust_status", "MANUAL_ONLY")
        evidence["claims"] = json.loads(str(evidence.pop("claims_json", "[]")))
        return evidence

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

    def _validate_evidence_packet(self, evidence_ids: list[str], packet_id: str) -> None:
        for evidence_id in evidence_ids:
            evidence = self._require_evidence(evidence_id)
            if evidence["packet_id"] != packet_id:
                raise ValueError("claim evidence must belong to the same packet")

    def _require_packet(self, packet_id: str) -> dict[str, object]:
        try:
            return PacketService(self.store).get_packet(packet_id)
        except KeyError as exc:
            raise ValueError(f"Unknown packet: {packet_id}") from exc

    def _require_requirement(self, requirement_id: str) -> dict[str, object]:
        try:
            return RequirementRegistry(self.store).get_requirement(requirement_id)
        except KeyError as exc:
            raise ValueError(f"Unknown requirement: {requirement_id}") from exc

    def _require_acceptance_criterion(self, acceptance_criterion_id: str) -> dict[str, object]:
        try:
            return RequirementRegistry(self.store).get_acceptance_criterion(
                acceptance_criterion_id
            )
        except KeyError as exc:
            raise ValueError(
                f"Unknown acceptance criterion: {acceptance_criterion_id}"
            ) from exc

    def _require_evidence(self, evidence_id: str) -> dict[str, object]:
        try:
            return self.get_evidence(evidence_id)
        except KeyError as exc:
            raise ValueError(f"Unknown evidence: {evidence_id}") from exc

    def _require_claim(self, claim_id: str) -> dict[str, object]:
        try:
            return self.get_claim(claim_id)
        except KeyError as exc:
            raise ValueError(f"Unknown claim: {claim_id}") from exc

    def _row_exists(self, table: str, key_column: str, key_value: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                f"select 1 from {table} where {key_column} = ?", (key_value,)
            ).fetchone()
        return row is not None
