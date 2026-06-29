"""Improvement proposal lifecycle."""

from __future__ import annotations

import json
from hashlib import sha256
from typing import Any

from standard_harness.self_improvement.friction import FrictionService
from standard_harness.state.store import HarnessStore


PROPOSAL_STATUSES = {"proposed", "reviewed", "accepted", "deferred", "rejected"}


class ImprovementProposalLifecycle:
    """Provider-neutral improvement proposal lifecycle for PKT-10."""

    def create_proposal(
        self,
        *,
        proposal_id: str,
        source_friction_ids: list[str],
        source_group_ids: list[str],
        problem_statement: str,
        affected_surface: str,
        expected_improvement: str,
        risk_level: str,
        verification_method: str,
        evidence_refs: list[str],
    ) -> dict[str, Any]:
        diagnostics = []
        if not source_friction_ids and not source_group_ids:
            diagnostics.append("missing_source_friction_or_group")
        if not evidence_refs:
            diagnostics.append("missing_proposal_evidence")
        if diagnostics:
            return {
                "status": "blocked",
                "proposal_id": proposal_id,
                "diagnostic_ids": diagnostics,
                "starter_promotion_eligible": False,
            }
        return {
            "event_type": "improvement.proposal",
            "proposal_id": proposal_id,
            "source_friction_ids": list(source_friction_ids),
            "source_group_ids": list(source_group_ids),
            "problem_statement": problem_statement,
            "affected_surface": affected_surface,
            "expected_improvement": expected_improvement,
            "risk_level": risk_level,
            "verification_method": verification_method,
            "review_disposition": "pending",
            "status": "proposed",
            "evidence_refs": list(evidence_refs),
            "starter_promotion_eligible": False,
            "diagnostic_ids": [],
        }

    def review_proposal(
        self, proposal: dict[str, Any], *, disposition: str, rationale: str
    ) -> dict[str, Any]:
        reviewed = dict(proposal)
        if disposition not in {"accepted", "deferred", "rejected"}:
            reviewed["status"] = "blocked"
            reviewed["diagnostic_ids"] = sorted(
                set(reviewed.get("diagnostic_ids", []) + ["invalid_proposal_disposition"])
            )
            reviewed["starter_promotion_eligible"] = False
            return reviewed
        reviewed["status"] = disposition
        reviewed["review_disposition"] = disposition
        reviewed["review_rationale"] = rationale
        reviewed["starter_promotion_eligible"] = disposition == "accepted"
        return reviewed

    def create_wiki_memory_candidate(self, proposal: dict[str, Any]) -> dict[str, Any]:
        diagnostics = []
        if proposal.get("status") != "accepted":
            diagnostics.append("proposal_not_accepted")
        if not proposal.get("evidence_refs"):
            diagnostics.append("missing_evidence_refs")
        candidate_id = "wiki-candidate-" + sha256(
            str(proposal.get("proposal_id", "")).encode("utf-8")
        ).hexdigest()[:12]
        return {
            "candidate_id": candidate_id,
            "status": "blocked" if diagnostics else "candidate",
            "target": "wiki-or-long-memory-proposal",
            "source_proposal_id": proposal.get("proposal_id"),
            "authority_label": "proposal-candidate-not-applied",
            "redaction_status": "references-only",
            "evidence_refs": list(proposal.get("evidence_refs", [])),
            "summary": proposal.get("expected_improvement", ""),
            "diagnostic_ids": diagnostics,
        }

    def apply_wiki_memory(self, candidate: dict[str, Any]) -> dict[str, Any]:
        return {
            "status": "blocked",
            "candidate_id": candidate.get("candidate_id"),
            "diagnostic_ids": ["direct_wiki_apply_blocked"],
            "authority": "wiki-proposal-required",
        }


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
