"""Project-level requirement completion coverage checks."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore
from standard_harness.validation.diagnostics import DiagnosticRecord


COUNT_KEYS = ("implemented", "deferred", "rejected", "superseded", "unverified")
TERMINAL_DECISION_STATUSES = {"deferred", "rejected", "superseded", "retired"}
BLOCKING_COMPLETION_CLASSES = {"unverified", "partial", "partially_implemented"}
IMPLEMENTED_COMPLETION_CLASSES = {"implemented", "complete", "evidence-required"}


class ProjectCompletionCoverage:
    """Evaluate whether final-product requirements are covered by closed packets."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def evaluate(
        self,
        *,
        all_requirements: bool = False,
        requirement_id: str | None = None,
    ) -> dict[str, Any]:
        if all_requirements == bool(requirement_id):
            raise ValueError("Specify exactly one of all_requirements=True or requirement_id")
        source_watermark = self.store.latest_event_seq()
        requirements = self._load_requirements(
            all_requirements=all_requirements,
            requirement_id=requirement_id,
        )
        counts = {key: 0 for key in COUNT_KEYS}
        diagnostics: list[dict[str, Any]] = []
        if all_requirements and not requirements:
            diagnostics.append(
                DiagnosticRecord(
                    error_code="missing_requirements",
                    severity="high",
                    category="completion",
                    message="Project completion requires at least one registered requirement.",
                    repair_hint="Register approved, deferred, rejected, or superseded requirements before completion.",
                    affected_entity_type="requirements",
                    affected_entity_id="all",
                    freshness_watermark=source_watermark,
                ).to_dict()
            )

        for requirement in requirements:
            outcome = self._evaluate_requirement(requirement, source_watermark)
            counts[outcome["count_key"]] += 1
            diagnostics.extend(outcome["diagnostics"])

        return {
            "status": "complete" if not diagnostics else "blocked",
            "requirement_counts": counts,
            "diagnostics": diagnostics,
            "source_watermark": source_watermark,
        }

    def _load_requirements(
        self, *, all_requirements: bool, requirement_id: str | None
    ) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            if all_requirements:
                rows = conn.execute("select * from requirements order by requirement_id").fetchall()
            else:
                rows = conn.execute(
                    "select * from requirements where requirement_id = ?",
                    (requirement_id,),
                ).fetchall()
        if not rows and requirement_id is not None:
            raise KeyError(f"Unknown requirement: {requirement_id}")
        requirements = []
        for row in rows:
            requirement = dict(row)
            requirement["acceptance_criteria"] = json.loads(
                requirement.pop("acceptance_criteria_json")
            )
            requirements.append(requirement)
        return requirements

    def _evaluate_requirement(
        self, requirement: dict[str, Any], source_watermark: int
    ) -> dict[str, Any]:
        requirement_id = requirement["requirement_id"]
        packet_id = requirement["packet_id"]
        status = requirement["status"]
        if status in TERMINAL_DECISION_STATUSES:
            if not requirement.get("decision_record_id"):
                return _unverified(
                    _diagnostic(
                        error_code="missing_decision_record",
                        category="completion",
                        message="Terminal requirement status requires a decision record.",
                        repair_hint="Record the human decision before project completion.",
                        requirement_id=requirement_id,
                        packet_id=packet_id,
                        affected_entity_type="requirement",
                        affected_entity_id=requirement_id,
                        field="decision_record_id",
                        expected_value="non_empty",
                        actual_value="missing",
                        source_watermark=source_watermark,
                    )
                )
            if status == "deferred":
                return {"count_key": "deferred", "diagnostics": []}
            if status == "rejected":
                return {"count_key": "rejected", "diagnostics": []}
            return {"count_key": "superseded", "diagnostics": []}

        if status != "approved":
            return _unverified(
                _diagnostic(
                    error_code="requirement_not_approved",
                    category="completion",
                    message="Requirement must be approved before project completion.",
                    repair_hint="Approve, defer, reject, or supersede the requirement with trace evidence.",
                    requirement_id=requirement_id,
                    packet_id=packet_id,
                    affected_entity_type="requirement",
                    affected_entity_id=requirement_id,
                    field="status",
                    expected_value="approved",
                    actual_value=str(status),
                    source_watermark=source_watermark,
                )
            )

        completion_classification = str(requirement["completion_classification"]).lower()
        if completion_classification in BLOCKING_COMPLETION_CLASSES:
            error_code = (
                "partial_implementation"
                if "partial" in completion_classification
                else "unverified_completion_classification"
            )
            return _unverified(
                _diagnostic(
                    error_code=error_code,
                    category="completion",
                    message="Requirement completion classification blocks project completion.",
                    repair_hint="Update completion classification only after evidence, gates, and closeout support it.",
                    requirement_id=requirement_id,
                    packet_id=packet_id,
                    affected_entity_type="requirement",
                    affected_entity_id=requirement_id,
                    field="completion_classification",
                    expected_value="implemented",
                    actual_value=str(requirement["completion_classification"]),
                    source_watermark=source_watermark,
                )
            )
        if completion_classification not in IMPLEMENTED_COMPLETION_CLASSES:
            return _unverified(
                _diagnostic(
                    error_code="unknown_completion_classification",
                    category="completion",
                    message="Requirement completion classification is not recognized for project completion.",
                    repair_hint="Use implemented only after evidence, gates, and closeout support it.",
                    requirement_id=requirement_id,
                    packet_id=packet_id,
                    affected_entity_type="requirement",
                    affected_entity_id=requirement_id,
                    field="completion_classification",
                    expected_value="implemented",
                    actual_value=str(requirement["completion_classification"]),
                    source_watermark=source_watermark,
                )
            )

        partial_claims = self._claims(requirement_id, support_status="partial")
        if partial_claims:
            return _unverified(
                _diagnostic(
                    error_code="partial_implementation",
                    category="completion",
                    message="Requirement has a partial claim and is not fully implemented.",
                    repair_hint="Replace partial claims with supported claims backed by passed evidence.",
                    requirement_id=requirement_id,
                    packet_id=packet_id,
                    affected_entity_type="requirement",
                    affected_entity_id=requirement_id,
                    source_watermark=source_watermark,
                )
            )

        acceptance_ids = requirement["acceptance_criteria"]
        diagnostics: list[dict[str, Any]] = []
        if not acceptance_ids:
            diagnostics.append(
                _diagnostic(
                    error_code="missing_acceptance_criteria",
                    category="completion",
                    message="Requirement has no acceptance criteria.",
                    repair_hint="Register acceptance criteria before claiming project completion.",
                    requirement_id=requirement_id,
                    packet_id=packet_id,
                    affected_entity_type="requirement",
                    affected_entity_id=requirement_id,
                    source_watermark=source_watermark,
                )
            )
        supported_claims = []
        for acceptance_id in acceptance_ids:
            claims = self._supported_claims(requirement_id, acceptance_id)
            if not claims:
                diagnostics.append(
                    _diagnostic(
                        error_code="missing_supported_claim",
                        category="completion",
                        message="Approved requirement has an acceptance criterion without a supported claim.",
                        repair_hint="Record a supported claim backed by passed evidence.",
                        requirement_id=requirement_id,
                        packet_id=packet_id,
                        acceptance_criterion_id=acceptance_id,
                        affected_entity_type="acceptance_criterion",
                        affected_entity_id=acceptance_id,
                        source_watermark=source_watermark,
                    )
                )
            supported_claims.extend(claims)
        if diagnostics:
            return {"count_key": "unverified", "diagnostics": diagnostics}

        for claim in supported_claims:
            missing_or_failed = [
                evidence_id
                for evidence_id in claim["evidence_ids"]
                if not self._evidence_passed(packet_id, evidence_id)
            ]
            if not claim["evidence_ids"] or missing_or_failed:
                diagnostics.append(
                    _diagnostic(
                        error_code="missing_evidence",
                        category="completion",
                        message="Supported claim is missing passed evidence.",
                        repair_hint="Register passed evidence for every supported claim.",
                        requirement_id=requirement_id,
                        packet_id=packet_id,
                        affected_entity_type="claim",
                        affected_entity_id=claim["claim_id"],
                        source_watermark=source_watermark,
                    )
                )
        if diagnostics:
            return {"count_key": "unverified", "diagnostics": diagnostics}

        claim_ids = [claim["claim_id"] for claim in supported_claims]
        if not self._passing_gate_covers(packet_id, claim_ids):
            return _unverified(
                _diagnostic(
                    error_code="missing_gate_pass",
                    category="completion",
                    message="Requirement support is not covered by a passing gate.",
                    repair_hint="Record a passing gate result that checks every supported claim.",
                    requirement_id=requirement_id,
                    packet_id=packet_id,
                    affected_entity_type="requirement",
                    affected_entity_id=requirement_id,
                    source_watermark=source_watermark,
                )
            )

        closeout = self._latest_closed_closeout(packet_id)
        if closeout is None:
            return _unverified(
                _diagnostic(
                    error_code="missing_closeout",
                    category="completion",
                    message="Requirement packet is not closed by a successful closeout.",
                    repair_hint="Close the packet after evidence and gate checks pass.",
                    requirement_id=requirement_id,
                    packet_id=packet_id,
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    source_watermark=source_watermark,
                )
            )
        closeout_claim_ids = set(closeout["checked_claim_ids"])
        closeout_gate_result_ids = set(closeout["gate_result_ids"])
        closeout_evidence_ids = set(closeout["evidence_ids"])
        required_evidence_ids = {
            evidence_id for claim in supported_claims for evidence_id in claim["evidence_ids"]
        }
        if (
            not set(claim_ids).issubset(closeout_claim_ids)
            or not required_evidence_ids.issubset(closeout_evidence_ids)
            or not self._passing_gate_ids(packet_id, claim_ids).issubset(closeout_gate_result_ids)
        ):
            return _unverified(
                _diagnostic(
                    error_code="stale_closeout",
                    category="completion",
                    message="Latest closed closeout does not cover current claims, evidence, and gate results.",
                    repair_hint="Run closeout again after recording new completion support.",
                    requirement_id=requirement_id,
                    packet_id=packet_id,
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    source_watermark=source_watermark,
                )
            )

        return {"count_key": "implemented", "diagnostics": []}

    def _claims(self, requirement_id: str, *, support_status: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select * from claims
                where requirement_id = ? and support_status = ?
                order by claim_id
                """,
                (requirement_id, support_status),
            ).fetchall()
        return [_claim_from_row(row) for row in rows]

    def _supported_claims(
        self, requirement_id: str, acceptance_criterion_id: str
    ) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select * from claims
                where requirement_id = ?
                  and acceptance_criterion_id = ?
                  and support_status = 'supported'
                order by claim_id
                """,
                (requirement_id, acceptance_criterion_id),
            ).fetchall()
        return [_claim_from_row(row) for row in rows]

    def _evidence_passed(self, packet_id: str, evidence_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select result_status from evidence
                where packet_id = ? and evidence_id = ?
                """,
                (packet_id, evidence_id),
            ).fetchone()
        return row is not None and row["result_status"] == "passed"

    def _passing_gate_covers(self, packet_id: str, claim_ids: list[str]) -> bool:
        return bool(self._passing_gate_ids(packet_id, claim_ids))

    def _passing_gate_ids(self, packet_id: str, claim_ids: list[str]) -> set[str]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select gate_result_id, checked_claim_ids_json from gate_results
                where packet_id = ? and status = 'pass'
                """,
                (packet_id,),
            ).fetchall()
        if not rows:
            return set()
        required_claim_ids = set(claim_ids)
        covered_gate_ids = set()
        for row in rows:
            checked_claim_ids = set(json.loads(row["checked_claim_ids_json"]))
            if required_claim_ids.issubset(checked_claim_ids):
                covered_gate_ids.add(row["gate_result_id"])
        return covered_gate_ids

    def _latest_closed_closeout(self, packet_id: str) -> dict[str, Any] | None:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select * from closeouts
                where packet_id = ? and decision_status = 'closed'
                order by source_watermark desc limit 1
                """,
                (packet_id,),
            ).fetchone()
        if row is None:
            return None
        closeout = dict(row)
        closeout["checked_claim_ids"] = json.loads(closeout.pop("checked_claim_ids_json"))
        closeout["gate_result_ids"] = json.loads(closeout.pop("gate_result_ids_json"))
        closeout["evidence_ids"] = json.loads(closeout.pop("evidence_ids_json"))
        closeout["diagnostic_ids"] = json.loads(closeout.pop("diagnostic_ids_json"))
        return closeout


def _claim_from_row(row) -> dict[str, Any]:
    claim = dict(row)
    claim["evidence_ids"] = json.loads(claim.pop("evidence_ids_json"))
    claim["gate_result_ids_optional"] = json.loads(claim.pop("gate_result_ids_json"))
    return claim


def _unverified(diagnostic: dict[str, Any]) -> dict[str, Any]:
    return {"count_key": "unverified", "diagnostics": [diagnostic]}


def _diagnostic(
    *,
    error_code: str,
    category: str,
    message: str,
    repair_hint: str,
    requirement_id: str,
    packet_id: str,
    affected_entity_type: str,
    affected_entity_id: str,
    source_watermark: int,
    acceptance_criterion_id: str | None = None,
    field: str | None = None,
    expected_value: str | None = None,
    actual_value: str | None = None,
) -> dict[str, Any]:
    return DiagnosticRecord(
        error_code=error_code,
        severity="high",
        category=category,
        message=message,
        repair_hint=repair_hint,
        affected_entity_type=affected_entity_type,
        affected_entity_id=affected_entity_id,
        packet_id=packet_id,
        requirement_id=requirement_id,
        acceptance_criterion_id=acceptance_criterion_id,
        field=field,
        expected_value=expected_value,
        actual_value=actual_value,
        freshness_watermark=source_watermark,
    ).to_dict()
