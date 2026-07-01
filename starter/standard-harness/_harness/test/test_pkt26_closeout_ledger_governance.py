from __future__ import annotations

import io
import json
import sys
import shutil
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.cli.main import main as harness_main  # noqa: E402
from standard_harness.domain.evidence import EvidenceService  # noqa: E402
from standard_harness.domain.gates import GateService  # noqa: E402
from standard_harness.domain.packets import PacketService  # noqa: E402
from standard_harness.domain.requirements import RequirementRegistry  # noqa: E402
from standard_harness.state.store import HarnessStore  # noqa: E402
from standard_harness.validation.closeout_ledger import CloseoutLedgerGovernance  # noqa: E402
from standard_harness.validation.closeout_ledger import _TrustedRuntimeCloseoutLedger  # noqa: E402
from standard_harness.validation.closeout_ledger import build_runtime_closeout_ledger  # noqa: E402
from standard_harness.validation.closeout_ledger import record_runtime_closeout_ledger_entry  # noqa: E402
from standard_harness.workflow.conductor import ConductorApprovalService  # noqa: E402
from standard_harness.workflow.conductor import ConductorLedger  # noqa: E402
from standard_harness.workflow import conductor as conductor_module  # noqa: E402


def _base_ledger() -> dict:
    return _TrustedRuntimeCloseoutLedger({
        "packetId": "PKT-26",
        "evidenceRecords": [{"evidenceId": "EV-1", "status": "pass", "trustStatus": "trusted"}],
        "supportedClaims": [{"claimId": "CL-1", "evidenceIds": ["EV-1"], "status": "supported"}],
        "gateResults": [{"gateResultId": "GT-1", "claimIds": ["CL-1"], "status": "pass"}],
        "packetDocReview": {
            "reviewId": "PDR-1",
            "status": "pass",
            "timing": "pre_rfc",
            "independent": True,
        },
        "reviewLenses": [
            {"lens": "challenge_review", "agentId": "agent-a", "status": "pass", "evidencePath": "_ops/evidence/review/challenge.json"},
            {"lens": "adversarial_security_review", "agentId": "agent-b", "status": "pass", "evidencePath": "_ops/evidence/review/security.json"},
            {"lens": "code_quality_review", "agentId": "agent-c", "status": "pass", "evidencePath": "_ops/evidence/review/code-quality.json"},
            {"lens": "evidence_review", "agentId": "agent-d", "status": "pass", "evidencePath": "_ops/evidence/review/evidence.json"},
        ],
        "reviewerAdjudication": {"status": "pass", "reviewerId": "reviewer-1"},
        "plannerCloseout": {"decision": "approved", "plannerId": "planner-1"},
        "persistedCloseout": {"decision": "approved"},
        "wrapperCloseout": {"status": "approved"},
        "providerReadiness": {"outcome": "proven", "claimsReadiness": True},
        "authorityInputs": [],
        "deliveryLoop": {"sameFindingDeveloperRemediationCount": 1, "fullLoopCount": 1},
        "ledgerProvenance": {
            "source": "runtime-ledger",
            "trustedHarnessSurface": True,
            "packetId": "PKT-26",
        },
    }, packet_id="PKT-26")


class CloseoutLedgerGovernanceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.validator = CloseoutLedgerGovernance()

    def test_complete_support_chain_passes_and_builds_compact_report_index(self) -> None:
        result = self.validator.evaluate(_base_ledger())

        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["diagnostic_ids"], [])
        self.assertEqual(result["effectiveDecision"], "approved")
        self.assertEqual(result["evidenceIndex"]["packetId"], "PKT-26")
        self.assertEqual(result["evidenceIndex"]["securityEvidencePaths"], ["_ops/evidence/review/security.json"])
        self.assertEqual(result["compactReport"]["packetExit"]["plannerCloseoutDecision"], "approved")
        self.assertEqual(result["compactReport"]["packetExit"]["recommendation"], "approve-closeout")
        self.assertEqual(result["compactReport"]["packetExit"]["sourceParityStatus"], "pass")
        self.assertEqual(result["compactReport"]["packetExit"]["validationEvidenceStatus"], "pass")
        self.assertEqual(result["compactReport"]["packetExit"]["securityEvidenceStatus"], "pass")
        self.assertEqual(result["compactReport"]["packetExit"]["cleanupStatus"], "complete")
        self.assertEqual(result["compactReport"]["securityEvidencePaths"], ["_ops/evidence/review/security.json"])
        self.assertIn("EV-1", result["compactReport"]["behaviorVerificationEvidenceIds"])
        self.assertIn("evidence -> claim -> gate", result["compactReport"]["summary"])

    def test_missing_link_matrix_blocks_with_actionable_diagnostics(self) -> None:
        cases = [
            ("evidenceRecords", "missing_evidence_record"),
            ("supportedClaims", "missing_supported_claim"),
            ("gateResults", "missing_gate_result"),
            ("packetDocReview", "missing_required_packet_doc_review"),
            ("reviewLenses", "missing_independent_closeout_review_lens"),
            ("reviewerAdjudication", "missing_reviewer_adjudication"),
            ("plannerCloseout", "missing_planner_closeout"),
        ]

        for field, expected in cases:
            with self.subTest(field=field):
                ledger = _base_ledger()
                ledger[field] = [] if isinstance(ledger[field], list) else None
                result = self.validator.evaluate(ledger)
                self.assertEqual(result["status"], "blocked")
                self.assertIn(expected, result["diagnostic_ids"])
                self.assertIn(expected, result["nextActions"])

    def test_retrospective_packet_doc_review_cannot_satisfy_pre_rfc_gate(self) -> None:
        ledger = _base_ledger()
        ledger["packetDocReview"]["timing"] = "retrospective"

        result = self.validator.evaluate(ledger)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("packet_doc_review_not_pre_rfc", result["diagnostic_ids"])

    def test_wrapper_approval_cannot_override_persisted_blocked_closeout(self) -> None:
        ledger = _base_ledger()
        ledger["wrapperCloseout"] = {"status": "approved"}
        ledger["persistedCloseout"] = {"decision": "blocked"}

        result = self.validator.evaluate(ledger)

        self.assertEqual(result["effectiveDecision"], "persisted_blocked")
        self.assertIn("effective_decision_persisted_blocked", result["diagnostic_ids"])

    def test_provider_readiness_unavailable_blocked_or_narrowed_is_not_proven(self) -> None:
        for outcome in ("unavailable", "blocked", "narrowed"):
            with self.subTest(outcome=outcome):
                ledger = _base_ledger()
                ledger["providerReadiness"] = {"outcome": outcome, "claimsReadiness": True}
                result = self.validator.evaluate(ledger)
                self.assertIn("provider_readiness_not_proven", result["diagnostic_ids"])

    def test_read_model_and_projection_inputs_cannot_approve_gates(self) -> None:
        source_cases = {
            "pm_row": "pm_row_cannot_approve_gate",
            "design_projection": "projection_cannot_close_acceptance",
            "release_bundle": "release_manifest_cannot_approve_gate",
            "clean_export": "clean_export_cannot_approve_closeout",
            "qa_answer": "qa_answer_cannot_approve_gate",
            "generated_state": "generated_state_cannot_approve_gate",
            "inherited_root_memory": "inherited_root_memory_cannot_support_claim",
        }
        ledger = _base_ledger()
        ledger["authorityInputs"] = [
            {"sourceType": source_type, "claimsApproval": True}
            for source_type in source_cases
        ]

        result = self.validator.evaluate(ledger)

        for expected in source_cases.values():
            self.assertIn(expected, result["diagnostic_ids"])

    def test_llm_and_unknown_authority_inputs_cannot_approve_gates(self) -> None:
        ledger = _base_ledger()
        ledger["authorityInputs"] = [
            {"sourceType": "llm_output", "claimsApproval": True},
            {"sourceType": "custom_untrusted_source", "claimsApproval": True},
        ]

        result = self.validator.evaluate(ledger)

        self.assertIn("llm_output_cannot_approve_gate", result["diagnostic_ids"])
        self.assertIn("untrusted_authority_source_cannot_approve_gate", result["diagnostic_ids"])

    def test_orphaned_claim_and_gate_references_block_closeout(self) -> None:
        claim_orphan = _base_ledger()
        claim_orphan["supportedClaims"][0]["evidenceIds"] = ["EV-MISSING"]
        self.assertIn(
            "unsupported_claim_evidence_reference",
            self.validator.evaluate(claim_orphan)["diagnostic_ids"],
        )

        gate_orphan = _base_ledger()
        gate_orphan["gateResults"][0]["claimIds"] = ["CL-MISSING"]
        self.assertIn(
            "unsupported_gate_claim_reference",
            self.validator.evaluate(gate_orphan)["diagnostic_ids"],
        )

    def test_required_review_lenses_without_evidence_linkage_block_closeout(self) -> None:
        ledger = _base_ledger()
        for lens in ledger["reviewLenses"]:
            lens.pop("evidencePath", None)
            lens.pop("evidenceId", None)

        result = self.validator.evaluate(ledger)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_independent_closeout_review_lens", result["diagnostic_ids"])

    def test_untrusted_ledger_source_and_self_attested_delegation_block(self) -> None:
        ledger = _base_ledger()
        ledger["ledgerProvenance"] = {
            "source": "caller-json",
            "trustedHarnessSurface": False,
            "packetId": "PKT-26",
        }
        result = self.validator.evaluate(ledger)
        self.assertIn("untrusted_closeout_ledger_source", result["diagnostic_ids"])

        self_attested = _base_ledger()
        self_attested["deliveryLoop"] = {
            "sameFindingDeveloperRemediationCount": 2,
            "conductorDecision": {"decision": "bounded_remediation", "conductorId": "conductor-1"},
            "scopedHumanDelegation": {
                "valid": True,
                "packetId": "PKT-26",
                "approvalType": "loop-threshold-judgment",
            },
        }
        self.assertIn(
            "conductor_loop_judgment_requires_scoped_grant",
            self.validator.evaluate(self_attested)["diagnostic_ids"],
        )

    def test_raw_dict_cannot_self_attest_trusted_runtime_provenance_or_delegation(self) -> None:
        ledger = dict(_base_ledger())
        ledger["deliveryLoop"] = {
            "sameFindingDeveloperRemediationCount": 2,
            "conductorDecision": {"decision": "bounded_remediation", "conductorId": "conductor-1"},
            "scopedHumanDelegation": {
                "delegation_grant_id": "DG-SELF-ATTESTED",
                "packet_id": "PKT-26",
                "approval_type": "loop-threshold-judgment",
                "conductor_id": "conductor-1",
                "status": "active",
                "trusted_harness_surface": True,
            },
        }

        result = self.validator.evaluate(ledger)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("untrusted_closeout_ledger_source", result["diagnostic_ids"])
        self.assertIn("conductor_loop_judgment_requires_scoped_grant", result["diagnostic_ids"])

    def test_cli_json_fixture_mode_cannot_self_attest_trusted_runtime_source(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = io.StringIO()
            ledger_json = json.dumps(_base_ledger())

            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        temp_dir,
                        "closeout-ledger-validate",
                        "--ledger-json",
                        ledger_json,
                    ]
                )

            self.assertEqual(exit_code, 0)
            result = json.loads(output.getvalue())
            diagnostics = result["closeoutLedger"]["diagnostic_ids"]
            self.assertIn("untrusted_closeout_ledger_source", diagnostics)

    def test_delivery_loop_guard_requires_user_or_valid_scoped_conductor_grant(self) -> None:
        same_finding = _base_ledger()
        same_finding["deliveryLoop"] = {"sameFindingDeveloperRemediationCount": 2, "fullLoopCount": 1}
        self.assertIn(
            "same_finding_second_remediation_requires_user_decision",
            self.validator.evaluate(same_finding)["diagnostic_ids"],
        )

        third_loop = _base_ledger()
        third_loop["deliveryLoop"] = {"sameFindingDeveloperRemediationCount": 1, "fullLoopCount": 3}
        self.assertIn(
            "third_delivery_loop_requires_user_decision",
            self.validator.evaluate(third_loop)["diagnostic_ids"],
        )

        untrusted = _base_ledger()
        untrusted["deliveryLoop"] = {
            "sameFindingDeveloperRemediationCount": 2,
            "conductorDecision": {"decision": "bounded_remediation"},
        }
        self.assertIn(
            "conductor_loop_judgment_requires_scoped_grant",
            self.validator.evaluate(untrusted)["diagnostic_ids"],
        )

        trusted = _base_ledger()
        trusted["deliveryLoop"] = {
            "sameFindingDeveloperRemediationCount": 2,
            "conductorDecision": {"decision": "bounded_remediation", "conductorId": "conductor-1"},
            "scopedHumanDelegation": {
                "delegation_grant_id": "DG-1",
                "delegating_human_owner": "human-owner",
                "packet_id": "PKT-26",
                "approval_type": "loop-threshold-judgment",
                "conductor_id": "conductor-1",
                "risk_ceiling": "high",
                "evidence_prerequisites": [],
                "valid_from": "2026-07-01T00:00:00Z",
                "valid_until": "2026-07-02T00:00:00Z",
                "packet_hash": None,
                "status": "active",
                "trusted_harness_surface": True,
            },
        }
        result = self.validator.evaluate(trusted)
        self.assertEqual(result["loopDecision"], "bounded_remediation")
        self.assertNotIn("conductor_loop_judgment_requires_scoped_grant", result["diagnostic_ids"])

        json_style = _base_ledger()
        json_style["ledgerProvenance"] = {
            "source": "caller-json",
            "trustedHarnessSurface": False,
            "packetId": "PKT-26",
        }
        json_style["deliveryLoop"] = trusted["deliveryLoop"]
        blocked = self.validator.evaluate(json_style)
        self.assertIn("untrusted_closeout_ledger_source", blocked["diagnostic_ids"])
        self.assertIn("conductor_loop_judgment_requires_scoped_grant", blocked["diagnostic_ids"])

    def test_supplemental_closeout_chain_cannot_satisfy_trusted_runtime_ledger(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = _runtime_store_with_evidence_claim_gate(temp_dir, "PKT-26-SUPPLEMENTAL")
            supplemental = _base_ledger()
            supplemental["packetId"] = "PKT-26-SUPPLEMENTAL"
            supplemental["packetDocReview"]["reviewId"] = "PDR-SUPPLEMENTAL"
            supplemental["reviewerAdjudication"] = {"status": "pass", "reviewerId": "reviewer-supplemental"}
            supplemental["plannerCloseout"] = {"decision": "approved", "plannerId": "planner-supplemental"}
            supplemental["deliveryLoop"] = {
                "sameFindingDeveloperRemediationCount": 2,
                "conductorDecision": {"decision": "bounded_remediation", "conductorId": "conductor-supplemental"},
                "scopedHumanDelegation": {
                    "delegation_grant_id": "DG-SUPPLEMENTAL",
                    "packet_id": "PKT-26-SUPPLEMENTAL",
                    "approval_type": "loop-threshold-judgment",
                    "conductor_id": "conductor-supplemental",
                    "status": "active",
                    "trusted_harness_surface": True,
                },
            }

            runtime_ledger = build_runtime_closeout_ledger(
                store,
                "PKT-26-SUPPLEMENTAL",
                supplemental=supplemental,
            )
            result = self.validator.evaluate(runtime_ledger)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_required_packet_doc_review", result["diagnostic_ids"])
        self.assertIn("missing_independent_closeout_review_lens", result["diagnostic_ids"])
        self.assertIn("missing_reviewer_adjudication", result["diagnostic_ids"])
        self.assertIn("missing_planner_closeout", result["diagnostic_ids"])

    def test_raw_scoped_delegation_runtime_entry_does_not_satisfy_trusted_grant(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = _runtime_store_with_evidence_claim_gate(temp_dir, "PKT-26-RAW-DELEGATION")
            _record_runtime_closeout_support_chain(
                store,
                packet_id="PKT-26-RAW-DELEGATION",
                conductor_id="conductor-raw",
                include_scoped_delegation=False,
            )
            record_runtime_closeout_ledger_entry(
                store,
                packet_id="PKT-26-RAW-DELEGATION",
                entry_type="scoped_delegation",
                payload={
                    "delegation_grant_id": "DG-RAW",
                    "packet_id": "PKT-26-RAW-DELEGATION",
                    "approval_type": "loop-threshold-judgment",
                    "conductor_id": "conductor-raw",
                    "status": "active",
                    "trusted_harness_surface": True,
                },
                idempotency_key="pkt26-ledger-raw-delegation",
            )

            runtime_ledger = build_runtime_closeout_ledger(store, "PKT-26-RAW-DELEGATION")
            result = self.validator.evaluate(runtime_ledger)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("conductor_loop_judgment_requires_scoped_grant", result["diagnostic_ids"])

    def test_fabricated_conductor_grant_event_does_not_satisfy_trusted_grant(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = _runtime_store_with_evidence_claim_gate(temp_dir, "PKT-26-FABRICATED-GRANT")
            _record_runtime_closeout_support_chain(
                store,
                packet_id="PKT-26-FABRICATED-GRANT",
                conductor_id="conductor-fabricated",
                include_scoped_delegation=False,
            )
            ConductorLedger(store).record_delegation_grant(
                grant={
                    "delegation_grant_id": "DG-FABRICATED",
                    "delegating_human_owner": "not-validated",
                    "conductor_id": "conductor-fabricated",
                    "packet_id": "PKT-26-FABRICATED-GRANT",
                    "approval_type": "loop-threshold-judgment",
                    "risk_ceiling": "high",
                    "evidence_prerequisites": [],
                    "valid_from": "2026-07-01T00:00:00Z",
                    "valid_until": "2026-07-02T00:00:00Z",
                    "packet_hash": None,
                    "status": "active",
                    "trusted_harness_surface": True,
                },
                idempotency_key="pkt26-ledger-fabricated-conductor-grant",
            )

            runtime_ledger = build_runtime_closeout_ledger(store, "PKT-26-FABRICATED-GRANT")
            result = self.validator.evaluate(runtime_ledger)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("conductor_loop_judgment_requires_scoped_grant", result["diagnostic_ids"])

    def test_direct_conductor_grant_event_payload_does_not_satisfy_trusted_grant(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = _runtime_store_with_evidence_claim_gate(temp_dir, "PKT-26-DIRECT-GRANT-EVENT")
            _record_runtime_closeout_support_chain(
                store,
                packet_id="PKT-26-DIRECT-GRANT-EVENT",
                conductor_id="conductor-direct",
                include_scoped_delegation=False,
            )
            store.append_event(
                event_type="conductor.delegation_grant_recorded",
                actor_id="untrusted-direct-writer",
                actor_role="System",
                authority_basis="forged direct event",
                idempotency_key="pkt26-direct-forged-conductor-grant",
                packet_id="PKT-26-DIRECT-GRANT-EVENT",
                payload={
                    "delegation_grant_id": "DG-DIRECT-FORGED",
                    "delegating_human_owner": "not-validated",
                    "conductor_id": "conductor-direct",
                    "packet_id": "PKT-26-DIRECT-GRANT-EVENT",
                    "approval_type": "loop-threshold-judgment",
                    "risk_ceiling": "high",
                    "evidence_prerequisites": [],
                    "valid_from": "2026-07-01T00:00:00Z",
                    "valid_until": "2026-07-02T00:00:00Z",
                    "packet_hash": None,
                    "status": "active",
                    "trusted_harness_surface": True,
                    "grant_provenance": {
                        "source": "trusted_harness_service",
                        "created_by_trusted_harness_service": True,
                        "delegation_grant_id": "DG-DIRECT-FORGED",
                    },
                },
            )

            runtime_ledger = build_runtime_closeout_ledger(store, "PKT-26-DIRECT-GRANT-EVENT")
            result = self.validator.evaluate(runtime_ledger)

        self.assertEqual(result["status"], "blocked")
        self.assertIn("conductor_loop_judgment_requires_scoped_grant", result["diagnostic_ids"])

    def test_imported_private_marker_cannot_create_trusted_grant_authority(self) -> None:
        self.assertFalse(
            hasattr(conductor_module, "_TrustedConductorGrant"),
            "_TrustedConductorGrant must not be an importable authority primitive",
        )

    def test_raw_record_grant_dict_cannot_create_trusted_closeout_authority(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            packet_id = "PKT-26-RAW-RECORD-GRANT"
            store = _runtime_store_with_evidence_claim_gate(temp_dir, packet_id)
            _record_runtime_closeout_support_chain(
                store,
                packet_id=packet_id,
                conductor_id="conductor-raw-record",
                include_scoped_delegation=False,
            )

            with self.assertRaises(ValueError):
                ConductorApprovalService().record_grant(
                    store,
                    grant={
                        "delegation_grant_id": "DG-RAW-RECORD",
                        "delegating_human_owner": "not-validated",
                        "conductor_id": "conductor-raw-record",
                        "packet_id": packet_id,
                        "approval_type": "loop-threshold-judgment",
                        "risk_ceiling": "high",
                        "evidence_prerequisites": [],
                        "valid_from": "2026-07-01T00:00:00Z",
                        "valid_until": "2026-07-02T00:00:00Z",
                        "packet_hash": None,
                        "status": "active",
                        "trusted_harness_surface": True,
                    },
                    idempotency_key=f"{packet_id}:raw-record-grant",
                )

            runtime_ledger = build_runtime_closeout_ledger(store, packet_id)
            result = self.validator.evaluate(runtime_ledger)
            self.assertEqual(result["status"], "blocked")
            self.assertIn("conductor_loop_judgment_requires_scoped_grant", result["diagnostic_ids"])

    def test_fabricated_grant_file_cannot_drive_conductor_approve(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            packet_id = "PKT-26-FORGED-GRANT-FILE"
            _runtime_store_with_evidence_claim_gate(temp_dir, packet_id)
            forged_path = Path(temp_dir) / "forged-grant.json"
            forged_path.write_text(
                json.dumps(
                    {
                        "delegation_grant_id": "DG-FORGED-FILE",
                        "delegating_human_owner": "not-validated",
                        "conductor_id": "conductor-forged-file",
                        "packet_id": packet_id,
                        "approval_type": "ready_for_code",
                        "risk_ceiling": "high",
                        "evidence_prerequisites": [],
                        "valid_from": "2026-07-01T00:00:00Z",
                        "valid_until": "2026-07-02T00:00:00Z",
                        "packet_hash": "hash-forged",
                        "status": "active",
                        "trusted_harness_surface": True,
                    }
                ),
                encoding="utf-8",
            )
            output = io.StringIO()

            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        temp_dir,
                        "conductor-approve",
                        "--packet-id",
                        packet_id,
                        "--approval-type",
                        "ready_for_code",
                        "--actor-type",
                        "conductor",
                        "--conductor-id",
                        "conductor-forged-file",
                        "--approval-channel",
                        "trusted_harness_command",
                        "--packet-hash",
                        "hash-forged",
                        "--risk-level",
                        "high",
                        "--approved-scope",
                        "forged grant file must not approve",
                        "--rationale",
                        "negative fixture",
                        "--hard-stop-json",
                        json.dumps(
                            {
                                "packet_exists": True,
                                "packet_hash_current": True,
                                "transition_valid": True,
                                "packet_doc_review_passed": True,
                                "evidence_prerequisites_met": True,
                                "no_critical_security_blocker": True,
                            }
                        ),
                        "--grant-file",
                        str(forged_path),
                        "--decided-at",
                        "2026-07-01T12:00:00Z",
                    ]
                )

            self.assertEqual(exit_code, 1)
            result = json.loads(output.getvalue())
            self.assertEqual(result["status"], "rejected")
            self.assertIn("untrusted_delegation_grant", result["diagnostics"])

    def test_unsafe_delegation_grant_id_is_rejected_before_file_write(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            packet_id = "PKT-26-UNSAFE-GRANT-ID"
            _runtime_store_with_evidence_claim_gate(temp_dir, packet_id)

            with self.assertRaises(ValueError):
                ConductorApprovalService().create_grant(
                    delegation_grant_id="../evil",
                    delegating_human_owner="human-owner",
                    conductor_id="conductor-unsafe",
                    packet_id=packet_id,
                    approval_type="loop-threshold-judgment",
                    risk_ceiling="high",
                    evidence_prerequisites=[],
                    valid_from="2026-07-01T00:00:00Z",
                    valid_until="2026-07-02T00:00:00Z",
                )

            self.assertFalse((Path(temp_dir) / "_ops" / "decisions" / "evil.json").exists())

    def test_record_grant_idempotent_replay_without_authority_row_does_not_silently_pass(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            packet_id = "PKT-26-IDEMPOTENCY-DRIFT"
            store = _runtime_store_with_evidence_claim_gate(temp_dir, packet_id)
            idempotency_key = f"{packet_id}:grant"
            grant = ConductorApprovalService().create_grant(
                delegation_grant_id=f"DG-{packet_id}",
                delegating_human_owner="human-owner",
                conductor_id="conductor-idempotency",
                packet_id=packet_id,
                approval_type="loop-threshold-judgment",
                risk_ceiling="high",
                evidence_prerequisites=[],
                valid_from="2026-07-01T00:00:00Z",
                valid_until="2026-07-02T00:00:00Z",
            )
            store.append_event(
                event_type="conductor.delegation_grant_recorded",
                actor_id="conductor-approval-service",
                actor_role="System",
                authority_basis="trusted conductor delegation grant service",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=dict(grant),
            )

            with self.assertRaises(ValueError):
                ConductorApprovalService().record_grant(
                    store,
                    grant=grant,
                    idempotency_key=idempotency_key,
                )

    def test_record_grant_idempotent_replay_with_different_grant_id_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            packet_id = "PKT-26-IDEMPOTENCY-MISMATCH"
            store = _runtime_store_with_evidence_claim_gate(temp_dir, packet_id)
            service = ConductorApprovalService()
            original = service.create_grant(
                delegation_grant_id=f"DG-{packet_id}",
                delegating_human_owner="human-owner",
                conductor_id="conductor-idempotency",
                packet_id=packet_id,
                approval_type="loop-threshold-judgment",
                risk_ceiling="high",
                evidence_prerequisites=[],
                valid_from="2026-07-01T00:00:00Z",
                valid_until="2026-07-02T00:00:00Z",
            )
            service.record_grant(store, grant=original, idempotency_key=f"{packet_id}:grant")
            different = service.create_grant(
                delegation_grant_id=f"DG-{packet_id}-DIFFERENT",
                delegating_human_owner="human-owner",
                conductor_id="conductor-idempotency",
                packet_id=packet_id,
                approval_type="loop-threshold-judgment",
                risk_ceiling="high",
                evidence_prerequisites=[],
                valid_from="2026-07-01T00:00:00Z",
                valid_until="2026-07-02T00:00:00Z",
            )

            with self.assertRaises(ValueError):
                service.record_grant(store, grant=different, idempotency_key=f"{packet_id}:grant")

    def test_expired_grant_row_cannot_satisfy_closeout_loop_judgment(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            packet_id = "PKT-26-EXPIRED-GRANT"
            store = _runtime_store_with_evidence_claim_gate(temp_dir, packet_id)
            _record_runtime_closeout_support_chain(
                store,
                packet_id=packet_id,
                conductor_id="conductor-expired",
                include_scoped_delegation=False,
                loop_metadata={"decidedAt": "2026-07-03T00:00:00Z", "riskLevel": "high"},
            )
            _record_scoped_grant(
                store,
                packet_id=packet_id,
                conductor_id="conductor-expired",
                valid_until="2026-07-02T00:00:00Z",
            )

            result = self.validator.evaluate(build_runtime_closeout_ledger(store, packet_id))

        self.assertEqual(result["status"], "blocked")
        self.assertIn("conductor_loop_judgment_requires_scoped_grant", result["diagnostic_ids"])

    def test_wrong_risk_or_missing_prerequisite_grant_row_cannot_satisfy_closeout_loop_judgment(self) -> None:
        cases = [
            ("risk", {"risk_ceiling": "standard"}, {"decidedAt": "2026-07-01T12:00:00Z", "riskLevel": "high"}),
            (
                "prerequisite",
                {"evidence_prerequisites": ["security_review_passed"]},
                {
                    "decidedAt": "2026-07-01T12:00:00Z",
                    "riskLevel": "high",
                    "evidencePrerequisiteStatus": {"security_review_passed": False},
                },
            ),
        ]
        for suffix, grant_overrides, loop_metadata in cases:
            with self.subTest(suffix=suffix):
                with tempfile.TemporaryDirectory() as temp_dir:
                    packet_id = f"PKT-26-SCOPED-GRANT-{suffix.upper()}"
                    store = _runtime_store_with_evidence_claim_gate(temp_dir, packet_id)
                    _record_runtime_closeout_support_chain(
                        store,
                        packet_id=packet_id,
                        conductor_id="conductor-scoped",
                        include_scoped_delegation=False,
                        loop_metadata=loop_metadata,
                    )
                    _record_scoped_grant(
                        store,
                        packet_id=packet_id,
                        conductor_id="conductor-scoped",
                        **grant_overrides,
                    )

                    result = self.validator.evaluate(build_runtime_closeout_ledger(store, packet_id))

                self.assertEqual(result["status"], "blocked")
                self.assertIn("conductor_loop_judgment_requires_scoped_grant", result["diagnostic_ids"])

    def test_runtime_ledger_builder_reads_authoritative_store_records(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = _runtime_store_with_evidence_claim_gate(temp_dir, "PKT-26-RUNTIME")
            _record_runtime_closeout_support_chain(
                store,
                packet_id="PKT-26-RUNTIME",
                conductor_id="conductor-runtime",
                include_scoped_delegation=True,
            )
            runtime_ledger = build_runtime_closeout_ledger(
                store,
                "PKT-26-RUNTIME",
            )
            result = self.validator.evaluate(runtime_ledger)

        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["loopDecision"], "bounded_remediation")
        self.assertEqual(result["evidenceIndex"]["evidenceIds"], ["EV-RUNTIME"])
        self.assertEqual(result["evidenceIndex"]["claimIds"], ["CL-RUNTIME"])
        self.assertEqual(result["evidenceIndex"]["gateResultIds"], ["GR-RUNTIME"])
        self.assertEqual(result["compactReport"]["packetExit"]["recommendation"], "approve-closeout")

    def test_valid_scoped_conductor_grant_supports_all_loop_threshold_decisions(self) -> None:
        for decision in ("bounded_remediation", "planner_route", "blocked"):
            with self.subTest(decision=decision):
                packet_id = f"PKT-26-RUNTIME-{decision.upper()}"
                with tempfile.TemporaryDirectory() as temp_dir:
                    store = _runtime_store_with_evidence_claim_gate(temp_dir, packet_id)
                    _record_runtime_closeout_support_chain(
                        store,
                        packet_id=packet_id,
                        conductor_id="conductor-runtime",
                        include_scoped_delegation=True,
                        conductor_decision=decision,
                    )
                    runtime_ledger = build_runtime_closeout_ledger(store, packet_id)
                    result = self.validator.evaluate(runtime_ledger)

                self.assertEqual(result["status"], "pass")
                self.assertEqual(result["loopDecision"], decision)

    def test_cli_packet_id_positive_smoke_passes_with_trusted_runtime_grant(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            packet_id = "PKT-26-CLI-POSITIVE"
            store = _runtime_store_with_evidence_claim_gate(temp_dir, packet_id)
            _record_runtime_closeout_support_chain(
                store,
                packet_id=packet_id,
                conductor_id="conductor-cli",
                include_scoped_delegation=True,
            )
            output = io.StringIO()

            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        temp_dir,
                        "closeout-ledger-validate",
                        "--packet-id",
                        packet_id,
                    ]
                )

            self.assertEqual(exit_code, 0)
            result = json.loads(output.getvalue())
            self.assertEqual(result["closeoutLedger"]["status"], "pass")


def _runtime_store_with_evidence_claim_gate(temp_dir: str, packet_id: str) -> HarnessStore:
    policy_dir = Path(temp_dir) / "_harness" / "policies"
    policy_dir.mkdir(parents=True)
    shutil.copyfile(
        STARTER_ROOT / "_harness" / "policies" / "evidence-classification.yaml",
        policy_dir / "evidence-classification.yaml",
    )
    store = HarnessStore(temp_dir)
    PacketService(store).create_packet(
        packet_id=packet_id,
        title="Runtime ledger fixture",
        objective="Prove runtime ledger builder.",
        packet_type="harness-system",
        risk_class="high",
        change_zones=["_harness/system/standard_harness/validation/closeout_ledger.py"],
        acceptance_criteria_ids=["AC-RUNTIME"],
        evidence_requirements=["trusted-test-evidence"],
        closeout_criteria=["trusted-evidence"],
        owner="planner",
        idempotency_key=f"{packet_id}:packet",
    )
    RequirementRegistry(store).register_requirement(
        requirement_id="REQ-RUNTIME",
        version="1.0",
        source_doc="PKT-26",
        status="approved",
        classification="functional",
        risk_classification="high",
        acceptance_criteria=["AC-RUNTIME"],
        completion_classification="implemented",
        packet_id=packet_id,
        idempotency_key=f"{packet_id}:requirement",
    )
    RequirementRegistry(store).register_acceptance_criterion(
        acceptance_criterion_id="AC-RUNTIME",
        requirement_id="REQ-RUNTIME",
        packet_id=packet_id,
        description="Runtime chain is complete.",
        status="approved",
        idempotency_key=f"{packet_id}:acceptance",
    )
    EvidenceService(store).register_evidence(
        evidence_id="EV-RUNTIME",
        packet_id=packet_id,
        claim_id=None,
        command_or_tool="unit-test",
        runner="tester",
        cwd_or_execution_context="starter",
        environment_fingerprint="test",
        artifact_path="_ops/evidence/EV-RUNTIME.json",
        content="passed",
        result_status="passed",
        produced_via="trusted-ci",
        base_commit="base",
        head_commit="head",
        workspace_id="workspace",
        rationale="runtime fixture",
        idempotency_key=f"{packet_id}:evidence",
    )
    EvidenceService(store).record_claim(
        claim_id="CL-RUNTIME",
        packet_id=packet_id,
        requirement_id="REQ-RUNTIME",
        acceptance_criterion_id="AC-RUNTIME",
        evidence_ids=["EV-RUNTIME"],
        support_status="supported",
        idempotency_key=f"{packet_id}:claim",
    )
    gate_service = GateService(store)
    gate_service.declare_gate(
        gate_id="GT-RUNTIME",
        packet_id=packet_id,
        gate_type="closeout-ledger",
        requirement_level="hard",
        declared_by_source="PKT-26",
        idempotency_key=f"{packet_id}:gate",
    )
    gate_service.activate_gate(
        gate_activation_id="GA-RUNTIME",
        gate_id="GT-RUNTIME",
        packet_id=packet_id,
        idempotency_key=f"{packet_id}:gate-activation",
    )
    gate_service.record_gate_result(
        gate_result_id="GR-RUNTIME",
        gate_id="GT-RUNTIME",
        packet_id=packet_id,
        checked_claim_ids=["CL-RUNTIME"],
        evidence_ids=["EV-RUNTIME"],
        status="pass",
        requirement_level="hard",
        rationale="runtime gate pass",
        idempotency_key=f"{packet_id}:gate-result",
    )
    return store


def _record_runtime_closeout_support_chain(
    store: HarnessStore,
    *,
    packet_id: str,
    conductor_id: str,
    include_scoped_delegation: bool,
    conductor_decision: str = "bounded_remediation",
    loop_metadata: dict | None = None,
) -> None:
    record_runtime_closeout_ledger_entry(
        store,
        packet_id=packet_id,
        entry_type="packet_doc_review",
        payload={
            "reviewId": "PDR-RUNTIME",
            "status": "pass",
            "timing": "pre_rfc",
            "independent": True,
        },
        idempotency_key=f"{packet_id}:ledger-pdr",
    )
    for lens in _base_ledger()["reviewLenses"]:
        runtime_lens = dict(lens)
        runtime_lens["evidenceId"] = "EV-RUNTIME"
        record_runtime_closeout_ledger_entry(
            store,
            packet_id=packet_id,
            entry_type="review_lens",
            payload=runtime_lens,
            idempotency_key=f"{packet_id}:ledger-lens-{runtime_lens['lens']}",
        )
    record_runtime_closeout_ledger_entry(
        store,
        packet_id=packet_id,
        entry_type="reviewer_adjudication",
        payload={"status": "pass", "reviewerId": "reviewer-runtime"},
        idempotency_key=f"{packet_id}:ledger-adjudication",
    )
    record_runtime_closeout_ledger_entry(
        store,
        packet_id=packet_id,
        entry_type="planner_closeout",
        payload={"decision": "approved", "plannerId": "planner-runtime"},
        idempotency_key=f"{packet_id}:ledger-planner",
    )
    record_runtime_closeout_ledger_entry(
        store,
        packet_id=packet_id,
        entry_type="persisted_closeout",
        payload={"decision": "approved"},
        idempotency_key=f"{packet_id}:ledger-persisted",
    )
    record_runtime_closeout_ledger_entry(
        store,
        packet_id=packet_id,
        entry_type="wrapper_closeout",
        payload={"status": "approved"},
        idempotency_key=f"{packet_id}:ledger-wrapper",
    )
    record_runtime_closeout_ledger_entry(
        store,
        packet_id=packet_id,
        entry_type="provider_readiness",
        payload={"outcome": "proven", "claimsReadiness": True},
        idempotency_key=f"{packet_id}:ledger-provider",
    )
    loop_payload = {
        "sameFindingDeveloperRemediationCount": 2,
        "fullLoopCount": 1,
        "conductorDecision": {
            "decision": conductor_decision,
            "conductorId": conductor_id,
        },
    }
    if loop_metadata:
        loop_payload.update(loop_metadata)
    record_runtime_closeout_ledger_entry(
        store,
        packet_id=packet_id,
        entry_type="delivery_loop",
        payload=loop_payload,
        idempotency_key=f"{packet_id}:ledger-loop",
    )
    if include_scoped_delegation:
        _record_scoped_grant(store, packet_id=packet_id, conductor_id=conductor_id)
    record_runtime_closeout_ledger_entry(
        store,
        packet_id=packet_id,
        entry_type="packet_exit",
        payload={
            "recommendation": "approve-closeout",
            "sourceParityStatus": "pass",
            "validationEvidenceStatus": "pass",
            "securityEvidenceStatus": "pass",
            "cleanupStatus": "complete",
        },
        idempotency_key=f"{packet_id}:ledger-packet-exit",
    )


def _record_scoped_grant(
    store: HarnessStore,
    *,
    packet_id: str,
    conductor_id: str,
    risk_ceiling: str = "high",
    evidence_prerequisites: list[str] | None = None,
    valid_from: str = "2026-07-01T00:00:00Z",
    valid_until: str = "2026-07-02T00:00:00Z",
    packet_hash: str | None = None,
) -> dict:
    grant = ConductorApprovalService().create_grant(
        delegation_grant_id=f"DG-{packet_id}",
        delegating_human_owner="human-owner",
        conductor_id=conductor_id,
        packet_id=packet_id,
        approval_type="loop-threshold-judgment",
        risk_ceiling=risk_ceiling,
        evidence_prerequisites=list(evidence_prerequisites or []),
        valid_from=valid_from,
        valid_until=valid_until,
        packet_hash=packet_hash,
    )
    return ConductorApprovalService().record_grant(
        store,
        grant=grant,
        idempotency_key=f"{packet_id}:conductor-grant",
    )


if __name__ == "__main__":
    unittest.main()
