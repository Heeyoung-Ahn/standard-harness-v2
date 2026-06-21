"""Closeout decision service."""

from __future__ import annotations

import json

from standard_harness.domain.packets import PacketService
from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


class CloseoutService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def close_packet(
        self,
        *,
        closeout_id: str,
        packet_id: str,
        authority_basis: str,
        rationale: str,
        idempotency_key: str,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_closeout(closeout_id)
        if self._closeout_exists(closeout_id):
            raise ValueError(f"closeout_id already exists: {closeout_id}")
        packet = PacketService(self.store).get_packet(packet_id)
        source_watermark = self.store.latest_event_seq()
        claims = self._supported_claims(packet_id)
        gate_results = self._passing_gate_results(packet_id)
        evidence_ids = sorted({evidence_id for claim in claims for evidence_id in claim["evidence_ids"]})
        diagnostics: list[str] = []
        registered_acceptance_ids = self._registered_acceptance_ids(packet_id)
        supported_acceptance_ids = {
            str(claim["acceptance_criterion_id"]) for claim in claims
        }
        for acceptance_id in packet["acceptance_criteria_ids"]:
            if acceptance_id not in registered_acceptance_ids:
                _add_diagnostic(diagnostics, "unregistered_acceptance_criterion")
            if acceptance_id not in supported_acceptance_ids:
                _add_diagnostic(diagnostics, "missing_supported_claim")
        if not claims:
            _add_diagnostic(diagnostics, "missing_evidence")
        for claim in claims:
            if not claim["evidence_ids"] or not all(
                self._evidence_is_passed(packet_id, evidence_id)
                for evidence_id in claim["evidence_ids"]
            ):
                _add_diagnostic(diagnostics, "missing_evidence")
        if not gate_results:
            _add_diagnostic(diagnostics, "missing_gate_pass")
        checked_claim_ids = {claim_id for gate in gate_results for claim_id in gate["checked_claim_ids"]}
        required_claim_ids = {str(claim["claim_id"]) for claim in claims}
        if gate_results and not required_claim_ids.issubset(checked_claim_ids):
            _add_diagnostic(diagnostics, "missing_gate_claim_coverage")
        for diagnostic_id in self._projection_diagnostics(packet_id):
            _add_diagnostic(diagnostics, diagnostic_id)
        for diagnostic_id in self._recovery_diagnostics():
            _add_diagnostic(diagnostics, diagnostic_id)
        decision_status = "closed" if not diagnostics else "blocked"
        closeout = {
            "closeout_id": closeout_id,
            "packet_id": packet_id,
            "packet_version": packet["packet_version"],
            "decision_status": decision_status,
            "checked_claim_ids": [claim["claim_id"] for claim in claims],
            "gate_result_ids": [gate["gate_result_id"] for gate in gate_results],
            "evidence_ids": evidence_ids,
            "diagnostic_ids": diagnostics,
            "source_event_range": f"1-{source_watermark}",
            "source_watermark": source_watermark,
            "authority_basis": authority_basis,
            "decided_at": utc_now_iso(),
            "rationale": rationale,
        }
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="closeout.decided",
                actor_id="reviewer",
                actor_role="Reviewer",
                authority_basis=authority_basis,
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                packet_version=int(packet["packet_version"]),
                payload=closeout,
                conn=conn,
            )
            conn.execute(
                """
                insert or ignore into closeouts (
                  closeout_id, packet_id, packet_version, decision_status,
                  checked_claim_ids_json, gate_result_ids_json, evidence_ids_json,
                  diagnostic_ids_json, source_event_range, source_watermark,
                  authority_basis, decided_at, rationale
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    closeout_id,
                    packet_id,
                    closeout["packet_version"],
                    decision_status,
                    json.dumps(closeout["checked_claim_ids"], sort_keys=True),
                    json.dumps(closeout["gate_result_ids"], sort_keys=True),
                    json.dumps(closeout["evidence_ids"], sort_keys=True),
                    json.dumps(closeout["diagnostic_ids"], sort_keys=True),
                    closeout["source_event_range"],
                    source_watermark,
                    authority_basis,
                    closeout["decided_at"],
                    rationale,
                ),
            )
            conn.execute(
                "update packets set lifecycle_state = ?, updated_at = ? where packet_id = ?",
                (decision_status, closeout["decided_at"], packet_id),
            )
        return self.get_closeout(closeout_id)

    def get_closeout(self, closeout_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute("select * from closeouts where closeout_id = ?", (closeout_id,)).fetchone()
        if row is None:
            raise KeyError(f"Unknown closeout: {closeout_id}")
        result = dict(row)
        result["checked_claim_ids"] = json.loads(result.pop("checked_claim_ids_json"))
        result["gate_result_ids"] = json.loads(result.pop("gate_result_ids_json"))
        result["evidence_ids"] = json.loads(result.pop("evidence_ids_json"))
        result["diagnostic_ids"] = json.loads(result.pop("diagnostic_ids_json"))
        return result

    def _supported_claims(self, packet_id: str) -> list[dict[str, object]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select * from claims where packet_id = ? and support_status = 'supported'",
                (packet_id,),
            ).fetchall()
        claims = []
        for row in rows:
            claim = dict(row)
            claim["evidence_ids"] = json.loads(claim.pop("evidence_ids_json"))
            claim["gate_result_ids_optional"] = json.loads(claim.pop("gate_result_ids_json"))
            claims.append(claim)
        return claims

    def _passing_gate_results(self, packet_id: str) -> list[dict[str, object]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select * from gate_results where packet_id = ? and status = 'pass'",
                (packet_id,),
            ).fetchall()
        results = []
        for row in rows:
            result = dict(row)
            result["checked_claim_ids"] = json.loads(result.pop("checked_claim_ids_json"))
            result["evidence_ids"] = json.loads(result.pop("evidence_ids_json"))
            results.append(result)
        return results

    def _registered_acceptance_ids(self, packet_id: str) -> set[str]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select acceptance_criterion_id from acceptance_criteria where packet_id = ?",
                (packet_id,),
            ).fetchall()
        return {row["acceptance_criterion_id"] for row in rows}

    def _evidence_is_passed(self, packet_id: str, evidence_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select result_status from evidence
                where packet_id = ? and evidence_id = ?
                """,
                (packet_id, evidence_id),
            ).fetchone()
        return row is not None and row["result_status"] == "passed"

    def _closeout_exists(self, closeout_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from closeouts where closeout_id = ?", (closeout_id,)
            ).fetchone()
        return row is not None

    def _projection_diagnostics(self, packet_id: str) -> list[str]:
        with self.store.connection() as conn:
            projection = conn.execute(
                """
                select source_watermark from projections
                where packet_id = ? and projection_type = 'current_context'
                order by trace_event_seq desc limit 1
                """,
                (packet_id,),
            ).fetchone()
            if projection is None:
                return []
            latest_source = conn.execute(
                """
                select coalesce(max(event_seq), 0) as seq
                from events
                where event_type != 'projection.generated'
                  and event_type not in (
                    'recovery_started', 'projection_rebuilt', 'recovery_blocked',
                    'audit_snapshot_created', 'backup_created', 'restore_verified'
                  )
                """
            ).fetchone()["seq"]
        if int(projection["source_watermark"]) < int(latest_source):
            return ["stale_projection"]
        return []

    def _recovery_diagnostics(self) -> list[str]:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select recovery_status from recovery_runs
                order by recorded_at desc limit 1
                """
            ).fetchone()
        if row is not None and row["recovery_status"] != "rebuilt":
            return ["blocked_recovery"]
        return []


def _add_diagnostic(diagnostics: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostics:
        diagnostics.append(diagnostic_id)
