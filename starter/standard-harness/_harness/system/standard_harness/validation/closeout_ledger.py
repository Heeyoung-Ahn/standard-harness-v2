"""Closeout ledger support-chain governance for copied-starter packets."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.workflow.conductor import ConductorApprovalService


REQUIRED_LENSES = {
    "challenge_review",
    "adversarial_security_review",
    "code_quality_review",
    "evidence_review",
}

AUTHORITY_DIAGNOSTICS = {
    "pm_row": "pm_row_cannot_approve_gate",
    "design_projection": "projection_cannot_close_acceptance",
    "release_bundle": "release_manifest_cannot_approve_gate",
    "clean_export": "clean_export_cannot_approve_closeout",
    "qa_answer": "qa_answer_cannot_approve_gate",
    "generated_state": "generated_state_cannot_approve_gate",
    "inherited_root_memory": "inherited_root_memory_cannot_support_claim",
    "llm_output": "llm_output_cannot_approve_gate",
}

NEXT_ACTIONS = {
    "missing_evidence_record": "missing_evidence_record: register packet-bound evidence before closeout.",
    "missing_supported_claim": "missing_supported_claim: record supported claim coverage linked to evidence.",
    "missing_gate_result": "missing_gate_result: record passing gate results linked to supported claims.",
    "missing_required_packet_doc_review": "missing_required_packet_doc_review: record independent pre-RFC packet_doc_review evidence.",
    "packet_doc_review_not_pre_rfc": "packet_doc_review_not_pre_rfc: retrospective packet-doc review is history only; do not count it as pre-RFC evidence.",
    "missing_independent_closeout_review_lens": "missing_independent_closeout_review_lens: record all required independent closeout lenses.",
    "missing_reviewer_adjudication": "missing_reviewer_adjudication: record Reviewer adjudication over lens evidence.",
    "missing_planner_closeout": "missing_planner_closeout: record Planner closeout after Reviewer pass.",
    "unsupported_claim_evidence_reference": "unsupported_claim_evidence_reference: every supported claim must reference registered evidence.",
    "unsupported_gate_claim_reference": "unsupported_gate_claim_reference: every passing gate must reference supported claims.",
    "untrusted_closeout_ledger_source": "untrusted_closeout_ledger_source: validate closeout through a trusted runtime ledger source.",
    "llm_output_cannot_approve_gate": "llm_output_cannot_approve_gate: LLM output is evidence only and cannot approve gates.",
    "untrusted_authority_source_cannot_approve_gate": "untrusted_authority_source_cannot_approve_gate: unknown authority sources cannot approve gates.",
}

RUNTIME_LEDGER_EVENT_TYPE = "closeout_ledger.entry_recorded"
TRUSTED_DELEGATION_RECORD_TYPE = "conductor_delegation_grants"


class _TrustedRuntimeCloseoutLedger(dict):
    """Runtime-ledger marker object created only by the trusted runtime builder."""

    def __init__(self, *args: Any, packet_id: str, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._trusted_runtime_packet_id = packet_id


class CloseoutLedgerGovernance:
    """Validate the authoritative closeout ledger support chain.

    The input is intentionally a plain dict so CLI, tests, and future store-backed
    services can use the same fail-closed rules without coupling to one persistence
    layout.
    """

    def evaluate(self, ledger: dict[str, Any]) -> dict[str, Any]:
        diagnostics: list[str] = []
        packet_id = str(ledger.get("packetId") or ledger.get("packet_id") or "unknown")

        self._validate_support_chain(ledger, diagnostics)
        self._validate_provenance(ledger, diagnostics, packet_id)
        self._validate_effective_decision(ledger, diagnostics)
        self._validate_provider_readiness(ledger, diagnostics)
        self._validate_authority_inputs(ledger, diagnostics)
        loop_decision = self._validate_delivery_loop(ledger, diagnostics, packet_id)

        return {
            "status": "blocked" if diagnostics else "pass",
            "diagnostic_ids": diagnostics,
            "nextActions": [
                diagnostic_id
                for diagnostic_id in diagnostics
                if diagnostic_id in NEXT_ACTIONS
            ],
            "repairHints": [
                NEXT_ACTIONS[diagnostic_id]
                for diagnostic_id in diagnostics
                if diagnostic_id in NEXT_ACTIONS
            ],
            "effectiveDecision": self._effective_decision(ledger),
            "loopDecision": loop_decision,
            "evidenceIndex": self._build_evidence_index(packet_id, ledger),
            "compactReport": self._build_compact_report(packet_id, diagnostics, ledger),
        }

    def _validate_support_chain(self, ledger: dict[str, Any], diagnostics: list[str]) -> None:
        evidence = _list(ledger.get("evidenceRecords"))
        claims = _list(ledger.get("supportedClaims"))
        gates = _list(ledger.get("gateResults"))
        packet_doc_review = ledger.get("packetDocReview")
        lenses = _list(ledger.get("reviewLenses"))
        reviewer_adjudication = ledger.get("reviewerAdjudication")
        planner_closeout = ledger.get("plannerCloseout")

        if not evidence:
            _add(diagnostics, "missing_evidence_record")
        evidence_ids = {
            _text(item.get("evidenceId") or item.get("evidence_id"))
            for item in evidence
            if isinstance(item, dict) and _text(item.get("evidenceId") or item.get("evidence_id"))
        }
        supported_claims = [
            item
            for item in claims
            if isinstance(item, dict) and item.get("status") == "supported"
        ]
        supported_claim_ids = {
            _text(item.get("claimId") or item.get("claim_id"))
            for item in supported_claims
            if _text(item.get("claimId") or item.get("claim_id"))
        }
        if not claims or not supported_claims:
            _add(diagnostics, "missing_supported_claim")
        for claim in supported_claims:
            claim_evidence_ids = {
                _text(evidence_id)
                for evidence_id in _list(claim.get("evidenceIds") or claim.get("evidence_ids"))
                if _text(evidence_id)
            }
            if not claim_evidence_ids or not claim_evidence_ids.issubset(evidence_ids):
                _add(diagnostics, "unsupported_claim_evidence_reference")
        passing_gates = [
            item
            for item in gates
            if isinstance(item, dict) and item.get("status") == "pass"
        ]
        if not gates or not passing_gates:
            _add(diagnostics, "missing_gate_result")
        for gate in passing_gates:
            gate_claim_ids = {
                _text(claim_id)
                for claim_id in _list(
                    gate.get("claimIds")
                    or gate.get("checkedClaimIds")
                    or gate.get("checked_claim_ids")
                )
                if _text(claim_id)
            }
            if not gate_claim_ids or not gate_claim_ids.issubset(supported_claim_ids):
                _add(diagnostics, "unsupported_gate_claim_reference")
        if not isinstance(packet_doc_review, dict):
            _add(diagnostics, "missing_required_packet_doc_review")
        else:
            if packet_doc_review.get("status") != "pass" or packet_doc_review.get("independent") is not True:
                _add(diagnostics, "missing_required_packet_doc_review")
            if packet_doc_review.get("timing") != "pre_rfc":
                _add(diagnostics, "packet_doc_review_not_pre_rfc")

        passing_lenses: dict[str, str] = {}
        duplicate_agents = False
        missing_lens_evidence = False
        for lens in lenses:
            if not isinstance(lens, dict):
                continue
            lens_id = str(lens.get("lens") or "")
            agent_id = str(lens.get("agentId") or "")
            if lens.get("status") == "pass" and lens_id in REQUIRED_LENSES and agent_id:
                if agent_id in passing_lenses.values():
                    duplicate_agents = True
                lens_evidence_id = _text(lens.get("evidenceId") or lens.get("evidence_id"))
                lens_evidence_path = _text(lens.get("evidencePath") or lens.get("evidence_path"))
                if not lens_evidence_path and not (
                    lens_evidence_id and lens_evidence_id in evidence_ids
                ):
                    missing_lens_evidence = True
                passing_lenses[lens_id] = agent_id
        if REQUIRED_LENSES.difference(passing_lenses) or duplicate_agents or missing_lens_evidence:
            _add(diagnostics, "missing_independent_closeout_review_lens")

        if not isinstance(reviewer_adjudication, dict) or reviewer_adjudication.get("status") != "pass":
            _add(diagnostics, "missing_reviewer_adjudication")
        if not isinstance(planner_closeout, dict) or planner_closeout.get("decision") != "approved":
            _add(diagnostics, "missing_planner_closeout")

    def _validate_provenance(
        self,
        ledger: dict[str, Any],
        diagnostics: list[str],
        packet_id: str,
    ) -> None:
        provenance = ledger.get("ledgerProvenance")
        if not _trusted_runtime_provenance(ledger, packet_id):
            _add(diagnostics, "untrusted_closeout_ledger_source")

    def _validate_effective_decision(self, ledger: dict[str, Any], diagnostics: list[str]) -> None:
        wrapper = ledger.get("wrapperCloseout")
        persisted = ledger.get("persistedCloseout")
        if not isinstance(wrapper, dict) or not isinstance(persisted, dict):
            return
        if wrapper.get("status") == "approved" and persisted.get("decision") == "blocked":
            _add(diagnostics, "effective_decision_persisted_blocked")

    def _validate_provider_readiness(self, ledger: dict[str, Any], diagnostics: list[str]) -> None:
        readiness = ledger.get("providerReadiness")
        if not isinstance(readiness, dict):
            return
        if readiness.get("claimsReadiness") is True and readiness.get("outcome") in {
            "unavailable",
            "blocked",
            "narrowed",
        }:
            _add(diagnostics, "provider_readiness_not_proven")

    def _validate_authority_inputs(self, ledger: dict[str, Any], diagnostics: list[str]) -> None:
        for source in _list(ledger.get("authorityInputs")):
            if not isinstance(source, dict) or not source.get("claimsApproval"):
                continue
            source_type = str(source.get("sourceType") or "")
            diagnostic = AUTHORITY_DIAGNOSTICS.get(source_type)
            if diagnostic:
                _add(diagnostics, diagnostic)
            else:
                _add(diagnostics, "untrusted_authority_source_cannot_approve_gate")

    def _validate_delivery_loop(
        self,
        ledger: dict[str, Any],
        diagnostics: list[str],
        packet_id: str,
    ) -> str | None:
        loop = ledger.get("deliveryLoop")
        if not isinstance(loop, dict):
            return None
        threshold_reached = False
        if int(loop.get("sameFindingDeveloperRemediationCount") or 0) >= 2:
            _add(diagnostics, "same_finding_second_remediation_requires_user_decision")
            threshold_reached = True
        if int(loop.get("fullLoopCount") or 0) >= 3:
            _add(diagnostics, "third_delivery_loop_requires_user_decision")
            threshold_reached = True
        decision = loop.get("conductorDecision")
        if not isinstance(decision, dict):
            return None
        grant = loop.get("scopedHumanDelegation")
        trusted_provenance = _trusted_runtime_provenance(ledger, packet_id)
        decision_conductor = decision.get("conductorId") or decision.get("conductor_id")
        grant_diagnostics = []
        if trusted_provenance and isinstance(grant, dict):
            grant_diagnostics = ConductorApprovalService().validate_delegation_grant(
                grant=grant,
                approval_type="loop-threshold-judgment",
                conductor_id=str(decision_conductor) if decision_conductor else None,
                packet_id=packet_id,
                packet_hash=_text(
                    loop.get("packetHash")
                    or loop.get("packet_hash")
                    or decision.get("packetHash")
                    or decision.get("packet_hash")
                    or grant.get("packet_hash")
                    or ""
                ),
                risk_level=_text(
                    loop.get("riskLevel")
                    or loop.get("risk_level")
                    or decision.get("riskLevel")
                    or decision.get("risk_level")
                    or grant.get("risk_ceiling")
                    or "critical"
                ),
                evidence_prerequisite_status=_dict(
                    loop.get("evidencePrerequisiteStatus")
                    or loop.get("evidence_prerequisite_status")
                    or decision.get("evidencePrerequisiteStatus")
                    or decision.get("evidence_prerequisite_status")
                ),
                decided_at=_text(
                    loop.get("decidedAt")
                    or loop.get("decided_at")
                    or decision.get("decidedAt")
                    or decision.get("decided_at")
                    or grant.get("valid_from")
                    or ""
                ),
                hard_stop_status=_dict(loop.get("hardStopStatus") or loop.get("hard_stop_status")),
            )
        valid_grant = trusted_provenance and isinstance(grant, dict) and not grant_diagnostics
        if threshold_reached and not valid_grant:
            _add(diagnostics, "conductor_loop_judgment_requires_scoped_grant")
            return None
        if valid_grant and decision.get("decision") in {"bounded_remediation", "planner_route", "blocked"}:
            _remove(diagnostics, "same_finding_second_remediation_requires_user_decision")
            _remove(diagnostics, "third_delivery_loop_requires_user_decision")
            return str(decision["decision"])
        return None

    def _effective_decision(self, ledger: dict[str, Any]) -> str:
        persisted = ledger.get("persistedCloseout")
        if isinstance(persisted, dict) and persisted.get("decision") == "blocked":
            return "persisted_blocked"
        if isinstance(persisted, dict) and persisted.get("decision"):
            return str(persisted["decision"])
        wrapper = ledger.get("wrapperCloseout")
        if isinstance(wrapper, dict) and wrapper.get("status"):
            return str(wrapper["status"])
        return "unknown"

    def _build_evidence_index(self, packet_id: str, ledger: dict[str, Any]) -> dict[str, Any]:
        evidence_ids = [
            str(item.get("evidenceId") or item.get("evidence_id"))
            for item in _list(ledger.get("evidenceRecords"))
            if isinstance(item, dict) and (item.get("evidenceId") or item.get("evidence_id"))
        ]
        review_lenses = [item for item in _list(ledger.get("reviewLenses")) if isinstance(item, dict)]
        return {
            "packetId": packet_id,
            "evidenceIds": evidence_ids,
            "claimIds": [
                str(item.get("claimId") or item.get("claim_id"))
                for item in _list(ledger.get("supportedClaims"))
                if isinstance(item, dict) and (item.get("claimId") or item.get("claim_id"))
            ],
            "gateResultIds": [
                str(item.get("gateResultId") or item.get("gate_result_id"))
                for item in _list(ledger.get("gateResults"))
                if isinstance(item, dict) and (item.get("gateResultId") or item.get("gate_result_id"))
            ],
            "reviewLensEvidencePaths": [
                str(item.get("evidencePath"))
                for item in review_lenses
                if item.get("evidencePath")
            ],
            "securityEvidencePaths": [
                str(item.get("evidencePath"))
                for item in review_lenses
                if item.get("lens") == "adversarial_security_review" and item.get("evidencePath")
            ],
            "reviewLensCount": len(review_lenses),
        }

    def _build_compact_report(
        self,
        packet_id: str,
        diagnostics: list[str],
        ledger: dict[str, Any],
    ) -> dict[str, Any]:
        status = "blocked" if diagnostics else "pass"
        planner_closeout = ledger.get("plannerCloseout") if isinstance(ledger, dict) else None
        reviewer_adjudication = ledger.get("reviewerAdjudication") if isinstance(ledger, dict) else None
        packet_exit = ledger.get("packetExit") if isinstance(ledger, dict) else None
        if not isinstance(packet_exit, dict):
            packet_exit = {}
        index = self._build_evidence_index(packet_id, ledger)
        security_evidence_paths = index.get("securityEvidencePaths", [])
        return {
            "packetId": packet_id,
            "status": status,
            "summary": (
                f"{packet_id} closeout ledger {status}: evidence -> claim -> gate -> "
                "independent reviews -> Reviewer adjudication -> Planner closeout."
            ),
            "packetExit": {
                "recommendation": packet_exit.get(
                    "recommendation",
                    "approve-closeout" if status == "pass" else "hold-closeout",
                ),
                "sourceParityStatus": packet_exit.get(
                    "sourceParityStatus",
                    "pass" if status == "pass" else "blocked",
                ),
                "validationEvidenceStatus": packet_exit.get(
                    "validationEvidenceStatus",
                    "pass" if status == "pass" else "blocked",
                ),
                "securityEvidenceStatus": packet_exit.get(
                    "securityEvidenceStatus",
                    "pass" if security_evidence_paths and status == "pass" else "blocked",
                ),
                "cleanupStatus": packet_exit.get(
                    "cleanupStatus",
                    "complete" if status == "pass" else "blocked",
                ),
                "reviewerAdjudicationStatus": reviewer_adjudication.get("status") if isinstance(reviewer_adjudication, dict) else None,
                "plannerCloseoutDecision": planner_closeout.get("decision") if isinstance(planner_closeout, dict) else None,
            },
            "securityEvidencePaths": security_evidence_paths,
            "independentLensEvidencePaths": index.get("reviewLensEvidencePaths", []),
            "behaviorVerificationEvidenceIds": index.get("evidenceIds", []),
        }


def record_runtime_closeout_ledger_entry(
    store: Any,
    *,
    packet_id: str,
    entry_type: str,
    payload: dict[str, Any],
    idempotency_key: str,
) -> dict[str, Any]:
    """Record a packet-bound closeout ledger entry through the runtime event store."""

    if not isinstance(payload, dict):
        raise ValueError("closeout ledger entry payload must be an object")
    entry = {
        "packet_id": packet_id,
        "entry_type": entry_type,
        "record": payload,
    }
    event = store.append_event(
        event_type=RUNTIME_LEDGER_EVENT_TYPE,
        actor_id="harness-runtime",
        actor_role="Harness",
        authority_basis="trusted closeout ledger entry",
        idempotency_key=idempotency_key,
        packet_id=packet_id,
        payload=entry,
    )
    return event["payload"]


def _list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def build_runtime_closeout_ledger(
    store: Any,
    packet_id: str,
    *,
    supplemental: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a closeout ledger from authoritative runtime tables.

    Supplemental input is accepted only for backward-compatible call signatures. It is
    intentionally ignored for closeout-decisive fields so caller-provided data cannot
    masquerade as trusted runtime ledger provenance.
    """

    _ = supplemental
    ledger = _TrustedRuntimeCloseoutLedger(packet_id=packet_id)
    with store.connection() as conn:
        evidence_rows = conn.execute(
            """
            select evidence_id, result_status, trust_status, artifact_path
            from evidence
            where packet_id = ?
            order by evidence_id
            """,
            (packet_id,),
        ).fetchall()
        claim_rows = conn.execute(
            """
            select claim_id, evidence_ids_json, support_status
            from claims
            where packet_id = ?
            order by claim_id
            """,
            (packet_id,),
        ).fetchall()
        gate_rows = conn.execute(
            """
            select gate_result_id, checked_claim_ids_json, evidence_ids_json, status
            from gate_results
            where packet_id = ?
            order by gate_result_id
            """,
            (packet_id,),
        ).fetchall()
        ledger_entry_rows = conn.execute(
            """
            select payload_json
            from events
            where event_type = ? and packet_id = ?
            order by event_seq
            """,
            (RUNTIME_LEDGER_EVENT_TYPE, packet_id),
        ).fetchall()
        delegation_grant_rows = conn.execute(
            """
            select grant_json
            from conductor_delegation_grants
            where packet_id = ?
            order by source_event_seq
            """,
            (packet_id,),
        ).fetchall()

    runtime_entries = [json.loads(row["payload_json"]) for row in ledger_entry_rows]
    trusted_delegation_grants = [
        json.loads(row["grant_json"]) for row in delegation_grant_rows
    ]
    ledger["packetId"] = packet_id
    ledger["evidenceRecords"] = [
        {
            "evidenceId": row["evidence_id"],
            "status": "pass" if row["result_status"] == "passed" else row["result_status"],
            "trustStatus": row["trust_status"],
            "evidencePath": row["artifact_path"],
        }
        for row in evidence_rows
    ]
    ledger["supportedClaims"] = [
        {
            "claimId": row["claim_id"],
            "evidenceIds": json.loads(row["evidence_ids_json"]),
            "status": row["support_status"],
        }
        for row in claim_rows
    ]
    ledger["gateResults"] = [
        {
            "gateResultId": row["gate_result_id"],
            "claimIds": json.loads(row["checked_claim_ids_json"]),
            "evidenceIds": json.loads(row["evidence_ids_json"]),
            "status": row["status"],
        }
        for row in gate_rows
    ]
    _merge_runtime_closeout_entries(ledger, runtime_entries)
    _merge_trusted_delegation_grants(ledger, trusted_delegation_grants, packet_id)
    trusted_record_types = {
        str(entry.get("entry_type"))
        for entry in runtime_entries
        if isinstance(entry, dict) and entry.get("entry_type")
    }
    if trusted_delegation_grants:
        trusted_record_types.add(TRUSTED_DELEGATION_RECORD_TYPE)
    ledger["ledgerProvenance"] = {
        "source": "runtime-ledger",
        "trustedHarnessSurface": True,
        "packetId": packet_id,
        "trustedRecordTypes": sorted(trusted_record_types),
        "sourceWatermark": store.latest_event_seq(),
    }
    return ledger


def _merge_runtime_closeout_entries(
    ledger: dict[str, Any],
    entries: list[dict[str, Any]],
) -> None:
    entry_fields = {
        "packet_doc_review": "packetDocReview",
        "reviewer_adjudication": "reviewerAdjudication",
        "planner_closeout": "plannerCloseout",
        "persisted_closeout": "persistedCloseout",
        "wrapper_closeout": "wrapperCloseout",
        "provider_readiness": "providerReadiness",
        "delivery_loop": "deliveryLoop",
        "packet_exit": "packetExit",
    }
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        entry_type = str(entry.get("entry_type") or "")
        record = entry.get("record")
        if not isinstance(record, dict):
            continue
        if entry_type == "review_lens":
            ledger.setdefault("reviewLenses", [])
            if isinstance(ledger["reviewLenses"], list):
                ledger["reviewLenses"].append(record)
        elif entry_type == "authority_input":
            ledger.setdefault("authorityInputs", [])
            if isinstance(ledger["authorityInputs"], list):
                ledger["authorityInputs"].append(record)
        elif entry_type == "scoped_delegation":
            loop = ledger.setdefault("deliveryLoop", {})
            if isinstance(loop, dict):
                loop.setdefault("untrustedScopedDelegationInputs", [])
                if isinstance(loop["untrustedScopedDelegationInputs"], list):
                    loop["untrustedScopedDelegationInputs"].append(dict(record))
        elif entry_type in entry_fields:
            ledger[entry_fields[entry_type]] = record


def _merge_trusted_delegation_grants(
    ledger: dict[str, Any],
    grants: list[dict[str, Any]],
    packet_id: str,
) -> None:
    trusted_grants = [
        grant
        for grant in grants
        if isinstance(grant, dict)
        and grant.get("trusted_harness_surface") is True
        and grant.get("status") == "active"
        and grant.get("packet_id") == packet_id
        and grant.get("approval_type") == "loop-threshold-judgment"
    ]
    if not trusted_grants:
        return
    loop = ledger.setdefault("deliveryLoop", {})
    if isinstance(loop, dict):
        loop["scopedHumanDelegation"] = trusted_grants[-1]


def _trusted_runtime_provenance(ledger: dict[str, Any], packet_id: str) -> bool:
    provenance = ledger.get("ledgerProvenance")
    return (
        isinstance(ledger, _TrustedRuntimeCloseoutLedger)
        and getattr(ledger, "_trusted_runtime_packet_id", None) == packet_id
        and isinstance(provenance, dict)
        and provenance.get("source") == "runtime-ledger"
        and provenance.get("trustedHarnessSurface") is True
        and provenance.get("packetId") == packet_id
    )


def _text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _add(diagnostics: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostics:
        diagnostics.append(diagnostic_id)


def _remove(diagnostics: list[str], diagnostic_id: str) -> None:
    while diagnostic_id in diagnostics:
        diagnostics.remove(diagnostic_id)
