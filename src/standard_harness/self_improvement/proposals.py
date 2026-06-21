"""Improvement proposal lifecycle."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.self_improvement.friction import FrictionService
from standard_harness.state.store import HarnessStore


class ImprovementProposalService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def promote_friction(
        self,
        *,
        proposal_id: str,
        friction_record_id: str,
        proposal_type: str,
        owner: str,
        rationale: str,
        linked_evidence_ids: list[str],
        disposition: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_proposal(proposal_id)
        FrictionService(self.store).get_friction(friction_record_id)
        proposal = {
            "proposal_id": proposal_id,
            "friction_record_id": friction_record_id,
            "proposal_type": proposal_type,
            "owner": owner,
            "rationale": rationale,
            "linked_evidence_ids": linked_evidence_ids,
            "disposition": disposition,
            "target_packet_required": True,
            "source_watermark": self.store.latest_event_seq(),
        }
        with self.store.transaction() as conn:
            trace = self.store.append_event(
                event_type="improvement_proposal_created",
                actor_id="self-improvement",
                actor_role="System",
                authority_basis="improvement proposal",
                idempotency_key=idempotency_key,
                payload=proposal,
                conn=conn,
            )
            conn.execute(
                """
                insert into improvement_proposals (
                  proposal_id, friction_record_id, proposal_type, owner,
                  rationale, linked_evidence_ids_json, disposition,
                  target_packet_required, source_watermark, trace_event_id,
                  trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    proposal_id,
                    friction_record_id,
                    proposal_type,
                    owner,
                    rationale,
                    json.dumps(linked_evidence_ids, sort_keys=True),
                    disposition,
                    1,
                    proposal["source_watermark"],
                    trace["event_id"],
                    trace["event_seq"],
                ),
            )
        return self.get_proposal(proposal_id)

    def get_proposal(self, proposal_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from improvement_proposals where proposal_id = ?",
                (proposal_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown improvement proposal: {proposal_id}")
        return _proposal_from_row(dict(row))


def _proposal_from_row(row: dict[str, Any]) -> dict[str, Any]:
    row["linked_evidence_ids"] = json.loads(row.pop("linked_evidence_ids_json"))
    row["target_packet_required"] = bool(row["target_packet_required"])
    return row

