"""Validation aggregator for MVP state, packet, starter, and projection checks."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.projection.current_context import CurrentContextProjection
from standard_harness.domain.packets import LIFECYCLE_STATES
from standard_harness.domain.packets import PacketService
from standard_harness.completion.v21_conformance import V21ConformanceGate
from standard_harness.evidence.trust import EvidenceTrustPolicy
from standard_harness.policy.gate_profiles import GateProfilePolicy
from standard_harness.starter.contamination import StarterContaminationChecker
from standard_harness.state.store import HarnessStore
from standard_harness.validation.boundary import BoundaryValidator
from standard_harness.validation.boundary import boundary_input_from_packet
from standard_harness.validation.challenge_gate import ChallengeGateValidator
from standard_harness.validation.diagnostics import DiagnosticRecord
from standard_harness.validation.evidence_trust import packet_requires_trusted_evidence
from standard_harness.validation.readiness import ReadinessService
from standard_harness.validation.requirements_metadata import RequirementsMetadataValidator
from standard_harness.validation.test_plan import TestPlanValidator
from standard_harness.validation.test_plan import packet_requires_test_plan
from standard_harness.wiki.validator import WikiProposalValidator


class ValidationService:
    def __init__(
        self,
        store: HarnessStore,
        *,
        starter_root: Path | None = None,
        repo_root: Path | None = None,
    ):
        self.store = store
        self.repo_root = repo_root or Path.cwd()
        self.starter_root = starter_root or Path.cwd() / "starter" / "standard-harness"

    def validate_all(self, *, packet_id: str | None = None) -> list[dict[str, Any]]:
        diagnostics = []
        diagnostics.extend(self.validate_requirements_metadata())
        diagnostics.extend(self.validate_state())
        diagnostics.extend(self.validate_starter())
        if packet_id is not None:
            diagnostics.extend(self.validate_packet(packet_id))
            diagnostics.extend(self.validate_projection(packet_id))
        return diagnostics

    def validate_requirements_metadata(self) -> list[dict[str, Any]]:
        return RequirementsMetadataValidator(self.repo_root).validate()

    def validate_v21_conformance(self) -> list[dict[str, Any]]:
        result = V21ConformanceGate(self.repo_root).evaluate()
        return [
            _diagnostic(
                error_code=diagnostic_id,
                category="conformance",
                message=f"V2.1 conformance gate blocks release: {diagnostic_id}",
                repair_hint="Complete cumulative HR coverage, validator catalog, gate metadata, and Compound Engineering metrics.",
                field="v21-conformance-gate",
            )
            for diagnostic_id in result["diagnostic_ids"]
        ]

    def validate_state(self) -> list[dict[str, Any]]:
        diagnostics = []
        with self.store.connection() as conn:
            migration = conn.execute(
                "select status from schema_migrations where schema_version = '1'"
            ).fetchone()
        if migration is None or migration["status"] != "applied":
            diagnostics.append(
                _diagnostic(
                    error_code="schema_migration_missing",
                    category="state",
                    message="Schema migration metadata is missing or not applied.",
                    repair_hint="Run init against the selected harness root.",
                    field="schema_migrations",
                )
            )
        return diagnostics

    def validate_packet(self, packet_id: str) -> list[dict[str, Any]]:
        diagnostics = self._packet_schema_diagnostics(packet_id)
        diagnostics.extend(self._test_plan_diagnostics(packet_id))
        diagnostics.extend(self._boundary_diagnostics(packet_id))
        diagnostics.extend(self._wiki_proposal_diagnostics(packet_id))
        diagnostics.extend(ReadinessService(self.store).check_packet(packet_id)["diagnostics"])
        diagnostics.extend(self._completion_diagnostics(packet_id))
        diagnostics.extend(self._evidence_trust_diagnostics(packet_id))
        diagnostics.extend(self._gate_activation_diagnostics(packet_id))
        diagnostics.extend(self._approval_diagnostics(packet_id))
        diagnostics.extend(self._challenge_gate_diagnostics(packet_id))
        return diagnostics

    def validate_projection(self, packet_id: str) -> list[dict[str, Any]]:
        try:
            projection = CurrentContextProjection(self.store).latest(packet_id=packet_id)
        except KeyError:
            return [
                _diagnostic(
                    error_code="missing_projection",
                    category="projection",
                    message="No current context projection exists for the packet.",
                    repair_hint="Run context for the packet before relying on generated current context.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                )
            ]
        freshness = CurrentContextProjection(self.store).freshness(projection)
        if freshness["freshness_status"] == "fresh":
            return []
        return [
            _diagnostic(
                error_code="stale_projection",
                category="projection",
                message="Current context projection is stale.",
                repair_hint="Regenerate current context before using it for authority decisions.",
                affected_entity_type="packet",
                affected_entity_id=packet_id,
                packet_id=packet_id,
                field="source_watermark",
                expected_value=str(freshness["latest_event_seq"]),
                actual_value=str(freshness["source_watermark"]),
            )
        ]

    def validate_starter(self) -> list[dict[str, Any]]:
        diagnostics = []
        readme = self.starter_root / "README.md"
        start_here = self.starter_root / "START_HERE.md"
        if not readme.exists():
            diagnostics.append(
                _diagnostic(
                    error_code="missing_starter_readme",
                    category="starter",
                    message="Starter README is missing.",
                    repair_hint="Add starter/standard-harness/README.md to identify the clean starter payload.",
                    affected_entity_type="path",
                    affected_entity_id=str(readme),
                )
            )
        if not start_here.exists():
            diagnostics.append(
                _diagnostic(
                    error_code="missing_starter_start_here",
                    category="starter",
                    message="Starter START_HERE document is missing.",
                    repair_hint="Add starter/standard-harness/START_HERE.md with the first low-risk packet path.",
                    affected_entity_type="path",
                    affected_entity_id=str(start_here),
                )
            )
        if self.starter_root.exists():
            paths = [str(path) for path in self.starter_root.rglob("*") if path.is_file()]
            diagnostics.extend(StarterContaminationChecker().check_paths(paths))
        return diagnostics

    def _test_plan_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        packet = PacketService(self.store).get_packet(packet_id)
        if not packet_requires_test_plan(packet):
            return []
        raw_test_plan = packet.get("test_plan", [])
        if not raw_test_plan:
            return [
                _diagnostic(
                    error_code="missing_test_plan",
                    category="test-plan",
                    message="Code or runtime packet requires a test plan before implementation.",
                    repair_hint="Populate packet.test_plan with commands or structured test-plan fields.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="test_plan",
                    expected_value="non_empty",
                    actual_value="empty",
                ),
                _diagnostic(
                    error_code="test_plan_first_gate",
                    category="test-plan",
                    message="Test-plan-first gate is not satisfied.",
                    repair_hint="Define acceptance criteria, behaviors under test, test types, commands, E2E applicability, N/A conditions, and substitutes.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="test_plan",
                ),
            ]
        if isinstance(raw_test_plan, dict):
            result = TestPlanValidator().validate(raw_test_plan)
            if result["status"] == "blocked":
                return [
                    _diagnostic(
                        error_code="test_plan_first_gate",
                        category="test-plan",
                        message="Structured test plan is missing required v0.2 fields.",
                        repair_hint="Complete every required test-plan field.",
                        affected_entity_type="packet",
                        affected_entity_id=packet_id,
                        packet_id=packet_id,
                        field="test_plan",
                    )
                ]
        return []

    def _evidence_trust_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        packet = PacketService(self.store).get_packet(packet_id)
        if not packet_requires_trusted_evidence(packet):
            return []
        with self.store.connection() as conn:
            evidence_rows = conn.execute(
                """
                select distinct e.*
                from claims c
                join json_each(c.evidence_ids_json) ce
                join evidence e on e.evidence_id = ce.value and e.packet_id = c.packet_id
                where c.packet_id = ? and c.support_status = 'supported'
                """,
                (packet_id,),
            ).fetchall()
        if not evidence_rows:
            return []
        trust = EvidenceTrustPolicy()
        diagnostics = []
        if not any(trust.can_closeout(dict(row)) for row in evidence_rows):
            diagnostics.append(
                _diagnostic(
                    error_code="missing_trusted_evidence",
                    category="evidence",
                    message="Code or runtime packet lacks trusted closeout evidence.",
                    repair_hint="Reproduce test evidence through the harness or trusted CI before closeout.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="trust_status",
                    expected_value="REPRODUCED_BY_HARNESS or TRUSTED_CI",
                    actual_value="not_trusted",
                )
            )
        if any(trust.is_manual_only(dict(row)) for row in evidence_rows):
            diagnostics.append(
                _diagnostic(
                    error_code="manual_only_evidence",
                    category="evidence",
                    message="Manual-only evidence cannot close code or runtime behavior changes.",
                    repair_hint="Replace manual-only evidence with harness-reproduced or trusted CI evidence.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="trust_status",
                    expected_value="trusted",
                    actual_value="MANUAL_ONLY",
                )
            )
        return diagnostics

    def _completion_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            packet = conn.execute(
                "select acceptance_criteria_ids_json from packets where packet_id = ?",
                (packet_id,),
            ).fetchone()
            registered_acceptance = {
                row["acceptance_criterion_id"]
                for row in conn.execute(
                    "select acceptance_criterion_id from acceptance_criteria where packet_id = ?",
                    (packet_id,),
                ).fetchall()
            }
            supported_claims = conn.execute(
                """
                select claim_id, acceptance_criterion_id, evidence_ids_json from claims
                where packet_id = ? and support_status = 'supported'
                """,
                (packet_id,),
            ).fetchall()
            passing_gates = conn.execute(
                """
                select checked_claim_ids_json from gate_results
                where packet_id = ? and status = 'pass'
                """,
                (packet_id,),
            ).fetchall()
        diagnostics = []
        packet_acceptance_ids = json.loads(packet["acceptance_criteria_ids_json"]) if packet else []
        supported_acceptance_ids = {
            claim["acceptance_criterion_id"] for claim in supported_claims
        }
        for acceptance_id in packet_acceptance_ids:
            if acceptance_id not in registered_acceptance:
                diagnostics.append(
                    _diagnostic(
                        error_code="unregistered_acceptance_criterion",
                        category="readiness",
                        message="Packet acceptance criterion is not registered.",
                        repair_hint="Register the acceptance criterion before closeout.",
                        affected_entity_type="acceptance_criterion",
                        affected_entity_id=acceptance_id,
                        packet_id=packet_id,
                        acceptance_criterion_id=acceptance_id,
                        field="acceptance_criteria_ids",
                        expected_value="registered",
                        actual_value="missing",
                    )
                )
            if acceptance_id not in supported_acceptance_ids:
                diagnostics.append(
                    _diagnostic(
                        error_code="missing_supported_claim",
                        category="evidence",
                        message="Acceptance criterion has no supported claim.",
                        repair_hint="Record a supported claim backed by passed evidence for every acceptance criterion.",
                        affected_entity_type="acceptance_criterion",
                        affected_entity_id=acceptance_id,
                        packet_id=packet_id,
                        acceptance_criterion_id=acceptance_id,
                    )
                )
        evidence_ids = []
        for claim in supported_claims:
            evidence_ids.extend(json.loads(claim["evidence_ids_json"]))
        if not evidence_ids:
            diagnostics.append(
                _diagnostic(
                    error_code="missing_evidence",
                    category="evidence",
                    message="Packet has no supported claim backed by evidence.",
                    repair_hint="Register passed evidence and record a supported claim before closeout.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                )
            )
        if not passing_gates:
            diagnostics.append(
                _diagnostic(
                    error_code="missing_gate_pass",
                    category="gate",
                    message="Packet has no passing gate result.",
                    repair_hint="Declare and activate the required gate, then record a pass with checked claims and evidence.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                )
            )
        else:
            gate_claim_ids = {
                claim_id
                for gate in passing_gates
                for claim_id in json.loads(gate["checked_claim_ids_json"])
            }
            required_claim_ids = {claim["claim_id"] for claim in supported_claims}
            if not required_claim_ids.issubset(gate_claim_ids):
                diagnostics.append(
                    _diagnostic(
                        error_code="missing_gate_claim_coverage",
                        category="gate",
                        message="Passing gate results do not cover every supported claim.",
                        repair_hint="Record a passing gate result that checks every claim used for closeout.",
                        affected_entity_type="packet",
                        affected_entity_id=packet_id,
                        packet_id=packet_id,
                    )
                )
        return diagnostics

    def _packet_schema_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        diagnostics = []
        with self.store.connection() as conn:
            packet = conn.execute(
                """
                select packet_id, packet_type, lifecycle_state, gate_profile_version
                from packets
                where packet_id = ?
                """,
                (packet_id,),
            ).fetchone()
        if packet is None:
            return [
                _diagnostic(
                    error_code="invalid_packet_schema",
                    category="packet",
                    message="Packet row is missing.",
                    repair_hint="Create the packet through PacketService before validation.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                )
            ]

        packet_type = str(packet["packet_type"])
        gate_profile_version = str(packet["gate_profile_version"])
        if str(packet["lifecycle_state"]) not in LIFECYCLE_STATES:
            diagnostics.append(
                _diagnostic(
                    error_code="invalid_state_transition",
                    category="packet",
                    message="Packet lifecycle state is not allowed by the v0.2 state machine.",
                    repair_hint="Move the packet through an allowed v0.2 lifecycle state.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="lifecycle_state",
                    expected_value="v0.2 lifecycle state",
                    actual_value=str(packet["lifecycle_state"]),
                )
            )
            diagnostics.append(
                _diagnostic(
                    error_code="invalid_packet_schema",
                    category="packet",
                    message="Packet schema metadata is invalid.",
                    repair_hint="Repair packet lifecycle, type, and gate profile metadata.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                )
            )
        try:
            policy = GateProfilePolicy.load(self.repo_root)
            expected_profile = policy.profile_version(packet_type)
        except (FileNotFoundError, KeyError, ValueError):
            expected_profile = None
        if not gate_profile_version:
            diagnostics.append(
                _diagnostic(
                    error_code="missing_gate_profile",
                    category="gate",
                    message="Packet gate profile version is missing.",
                    repair_hint="Set packet.gate_profile_version from the packet type gate profile.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="gate_profile_version",
                    expected_value=f"{packet_type}@1",
                    actual_value="",
                )
            )
            diagnostics.append(
                _diagnostic(
                    error_code="invalid_packet_schema",
                    category="packet",
                    message="Packet schema metadata is invalid.",
                    repair_hint="Repair packet lifecycle, type, and gate profile metadata.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                )
            )
        elif expected_profile is not None and gate_profile_version != expected_profile:
            diagnostics.append(
                _diagnostic(
                    error_code="missing_gate_profile",
                    category="gate",
                    message="Packet gate profile version does not match packet type policy.",
                    repair_hint="Select the gate profile version defined for the packet type.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="gate_profile_version",
                    expected_value=expected_profile,
                    actual_value=gate_profile_version,
                )
            )
        return diagnostics

    def _gate_activation_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        diagnostics = []
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select gate_id from gate_declarations
                where packet_id = ?
                """,
                (packet_id,),
            ).fetchall()
            for row in rows:
                active = conn.execute(
                    """
                    select 1 from gate_activations
                    where packet_id = ? and gate_id = ? and activation_status = 'active'
                    """,
                    (packet_id, row["gate_id"]),
                ).fetchone()
                if active is None:
                    diagnostics.append(
                        _diagnostic(
                            error_code="inactive_gate",
                            category="gate",
                            message="Declared gate is not active.",
                            repair_hint="Run gate-activate for the declared gate before recording results.",
                            affected_entity_type="gate",
                            affected_entity_id=row["gate_id"],
                            packet_id=packet_id,
                            gate_id=row["gate_id"],
                        )
                    )
        return diagnostics

    def _approval_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            packet = conn.execute(
                "select approval_state, approval_record_id from packets where packet_id = ?",
                (packet_id,),
            ).fetchone()
            if packet is None or packet["approval_state"] != "approved":
                return []
            approval = conn.execute(
                "select 1 from approval_records where approval_record_id = ?",
                (packet["approval_record_id"],),
            ).fetchone()
        if approval is not None:
            return []
        return [
            _diagnostic(
                error_code="missing_approval_record",
                category="approval",
                message="Packet approval state is approved but approval record is missing.",
                repair_hint="Re-run packet-approve to persist approval authority.",
                affected_entity_type="packet",
                affected_entity_id=packet_id,
                packet_id=packet_id,
                field="approval_record_id",
            )
        ]

    def _challenge_gate_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        diagnostics = []
        try:
            diagnostic_ids = ChallengeGateValidator.load(self.repo_root).diagnostics_for_store(
                store=self.store,
                repo_root=self.repo_root,
                packet_id=packet_id,
            )
        except FileNotFoundError:
            diagnostic_ids = ["missing_challenge_gate_policy"]
        for diagnostic_id in diagnostic_ids:
            diagnostics.append(
                _diagnostic(
                    error_code=diagnostic_id,
                    category="challenge",
                    message=f"Challenge gate blocks packet validation: {diagnostic_id}",
                    repair_hint="Provide challenge review evidence and decision record for triggered user-request or P0 exception challenges.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="challenge-gate",
                )
            )
        return diagnostics

    def _boundary_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        packet = PacketService(self.store).get_packet(packet_id)
        boundary_input = boundary_input_from_packet(packet)
        if boundary_input is None:
            return []
        try:
            result = BoundaryValidator.from_repo(self.repo_root).validate(boundary_input)
        except (OSError, ValueError) as exc:
            return [
                _diagnostic(
                    error_code="invalid_zone_mapping",
                    category="boundary",
                    message="Boundary policy could not be loaded.",
                    repair_hint="Keep _harness/policies/zones.yaml and agent-permissions.yaml valid JSON-compatible YAML.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="boundaryValidation",
                    actual_value=str(exc),
                )
            ]
        diagnostics = []
        for diagnostic in result["diagnostics"]:
            diagnostics.append(
                _diagnostic(
                    error_code=diagnostic["diagnostic_id"],
                    category="boundary",
                    message=diagnostic["message"],
                    repair_hint="Move the change to an allowed logical zone or use an authorized harness packet and role.",
                    affected_entity_type="path",
                    affected_entity_id=diagnostic["path"],
                    packet_id=packet_id,
                    field="boundaryValidation.changedFiles",
                )
            )
        return diagnostics

    def _wiki_proposal_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        packet = PacketService(self.store).get_packet(packet_id)
        closeout_plan = packet.get("closeout_plan")
        if not isinstance(closeout_plan, dict):
            return []
        proposal = closeout_plan.get("wikiProposal") or closeout_plan.get("wiki_proposal")
        if not isinstance(proposal, dict):
            return []
        result = WikiProposalValidator().validate(proposal)
        diagnostics = []
        for diagnostic_id in result["diagnostic_ids"]:
            diagnostics.append(
                _diagnostic(
                    error_code=diagnostic_id,
                    category="wiki",
                    message=f"Wiki proposal validation blocks packet validation: {diagnostic_id}",
                    repair_hint="Provide a validated evidence-linked wiki proposal and avoid SECRET/SENSITIVE evidence promotion.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                    field="closeout_plan.wikiProposal",
                )
            )
        return diagnostics


def _diagnostic(
    *,
    error_code: str,
    category: str,
    message: str,
    repair_hint: str,
    affected_entity_type: str | None = None,
    affected_entity_id: str | None = None,
    packet_id: str | None = None,
    acceptance_criterion_id: str | None = None,
    gate_id: str | None = None,
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
        acceptance_criterion_id=acceptance_criterion_id,
        gate_id=gate_id,
        field=field,
        expected_value=expected_value,
        actual_value=actual_value,
    ).to_dict()
