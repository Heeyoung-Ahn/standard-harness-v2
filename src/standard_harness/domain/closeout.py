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
        packet = PacketService(self.store).get_packet(packet_id)
        source_watermark = self.store.latest_event_seq()
        claims = self._supported_claims(packet_id)
        gate_results = self._passing_gate_results(packet_id)
        evidence_ids = sorted({evidence_id for claim in claims for evidence_id in claim["evidence_ids"]})
        diagnostics: list[str] = []
        if not claims:
            diagnostics.append("missing_evidence")
        if not gate_results:
            diagnostics.append("missing_gate_pass")
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
        self.store.append_event(
            event_type="closeout.decided",
            actor_id="reviewer",
            actor_role="Reviewer",
            authority_basis=authority_basis,
            idempotency_key=idempotency_key,
            packet_id=packet_id,
            packet_version=int(packet["packet_version"]),
            payload=closeout,
        )
        with self.store.connection() as conn:
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
            conn.commit()
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
        return [dict(row) for row in rows]
