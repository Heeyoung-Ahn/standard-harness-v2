from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.self_improvement.friction import (  # noqa: E402
    MINIMUM_CAPTURE_SURFACES,
    SEED_FRICTION_TYPES,
    FrictionCapturePolicy,
    FrictionSignalRegistry,
    RuntimeFrictionCapture,
    StoredFrictionSignalRegistry,
)
from standard_harness.self_improvement.proposals import (  # noqa: E402
    ImprovementProposalLifecycle,
)
from standard_harness.self_improvement.recurring import RecurringFrictionDetector  # noqa: E402
from standard_harness.self_improvement.starter_promotion import (  # noqa: E402
    CompoundFeedbackMetrics,
    StarterPromotionCandidateRegistry,
)
from standard_harness.cli.main import _handle_compound_feedback  # noqa: E402
from standard_harness.state.store import HarnessStore  # noqa: E402


class CompoundFeedbackPromotionTests(unittest.TestCase):
    def test_seed_types_and_minimum_runtime_capture_surfaces_are_enforced(self) -> None:
        self.assertTrue(
            {
                "pycache_residue",
                "npm_node_path_failure",
                "validation_pass_with_warnings",
                "dirty_generated_state",
                "packet_prose_without_durable_evidence",
                "stale_active_context",
                "missing_required_evidence",
                "manual_rework_repeated",
                "validator_failure",
                "closeout_state_mismatch",
                "token_overuse",
                "boundary_violation",
            }.issubset(SEED_FRICTION_TYPES)
        )

        policy = FrictionCapturePolicy()
        missing = policy.validate_capture_surfaces(
            sorted(MINIMUM_CAPTURE_SURFACES - {"context_token_budget_overrun"})
        )
        docs_only = policy.validate_capture_surfaces(["manual_documented_entrypoint"])

        self.assertEqual(missing["status"], "blocked")
        self.assertIn("missing_capture_surface:context_token_budget_overrun", missing["diagnostic_ids"])
        self.assertEqual(docs_only["status"], "blocked")
        self.assertIn("docs_only_capture_entrypoint", docs_only["diagnostic_ids"])

    def test_friction_signal_registry_requires_evidence_and_blocks_unknown_types(self) -> None:
        registry = FrictionSignalRegistry()
        signal = registry.record_signal(
            {
                "type": "token_overuse",
                "severity": "medium",
                "source_surface": "context_token_budget_overrun",
                "source_ref": "ACTIVE_CONTEXT:token-budget",
                "recurrence_key": "token-budget:context-overrun",
                "evidence_ref": "_ops/evidence/PKT-10/token-budget.json",
                "suggested_route": "Planner",
                "authority_boundary": "evidence-only",
                "sensitive_evidence": False,
                "redaction_status": "clean",
            }
        )
        blocked = registry.record_signal(
            {
                "type": "unknown_friction",
                "severity": "medium",
                "source_surface": "validation_failure",
                "source_ref": "validator",
                "recurrence_key": "unknown",
                "evidence_ref": "",
                "suggested_route": "Developer",
                "authority_boundary": "evidence-only",
                "sensitive_evidence": False,
                "redaction_status": "clean",
            }
        )

        self.assertEqual(signal["status"], "recorded")
        self.assertEqual(signal["signal"]["signalType"], "token_overuse")
        self.assertEqual(signal["signal"]["eventType"], "friction.signal")
        self.assertIn("token-budget.json", signal["signal"]["evidenceIds"][0])
        self.assertEqual(blocked["status"], "blocked")
        self.assertIn("unknown_friction_type", blocked["diagnostic_ids"])
        self.assertIn("missing_evidence_ref", blocked["diagnostic_ids"])

    def test_friction_signal_output_matches_public_schema_required_shape(self) -> None:
        registry = FrictionSignalRegistry()
        signal = registry.capture_from_surface(
            surface="validation_failure",
            friction_type="validator_failure",
            source_ref="validate --starter",
            recurrence_key="starter-validation:failure",
            evidence_ref="_ops/evidence/PKT-10/validation-failure.json",
            severity="high",
        )["signal"]
        schema_path = STARTER_ROOT / "_harness" / "schemas" / "friction-signal.schema.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))

        for field in schema["required"]:
            self.assertIn(field, signal)
            self.assertNotIn(signal[field], ("", [], None))

    def test_runtime_capture_service_records_all_required_surfaces(self) -> None:
        registry = FrictionSignalRegistry()
        capture = RuntimeFrictionCapture(registry)
        calls = [
            capture.validation_failure,
            capture.validation_pass_with_warnings,
            capture.review_finding_or_evidence_gap,
            capture.pm_report_status_friction,
            capture.closeout_state_mismatch,
            capture.context_token_budget_overrun,
            capture.authority_boundary_violation,
        ]

        results = [
            call(source_ref=f"surface-{index}", evidence_ref=f"_ops/evidence/PKT-10/surface-{index}.json")
            for index, call in enumerate(calls, start=1)
        ]

        self.assertTrue(all(result["status"] == "recorded" for result in results))
        self.assertEqual(
            {signal["sourceSurface"] for signal in registry.signals},
            MINIMUM_CAPTURE_SURFACES,
        )
        self.assertEqual(
            {signal["signalType"] for signal in registry.signals},
            {
                "validator_failure",
                "validation_pass_with_warnings",
                "missing_required_evidence",
                "manual_rework_repeated",
                "closeout_state_mismatch",
                "token_overuse",
                "boundary_violation",
            },
        )

    def test_stored_registry_persists_and_replays_signals_for_recurring_detection(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            registry = StoredFrictionSignalRegistry(store)
            base = {
                "signalType": "boundary_violation",
                "severity": "high",
                "sourceSurface": "authority_boundary_violation",
                "sourceRef": "approval-boundary",
                "recurrenceKey": "approval-boundary:worker",
                "suggestedRoute": "Reviewer",
                "authorityBoundary": "evidence-only",
                "sensitiveEvidence": False,
                "redactionStatus": "clean",
            }
            first = registry.record_signal(base | {"evidenceRef": "_ops/evidence/PKT-10/boundary-1.json"})
            second = registry.record_signal(base | {"evidenceRef": "_ops/evidence/PKT-10/boundary-2.json"})
            replayed = StoredFrictionSignalRegistry(HarnessStore(temp_dir)).list_signals()

        recurring = RecurringFrictionDetector().detect(replayed)

        self.assertEqual(first["status"], "recorded")
        self.assertEqual(second["status"], "recorded")
        self.assertEqual(len(replayed), 2)
        self.assertEqual(recurring["status"], "recurring")

    def test_recurring_detector_groups_by_type_surface_key_and_evidence_pattern(self) -> None:
        registry = FrictionSignalRegistry()
        base = {
            "type": "validation_pass_with_warnings",
            "severity": "medium",
            "source_surface": "validation_pass_with_warnings",
            "source_ref": "validate --starter",
            "recurrence_key": "starter-validation:warnings",
            "suggested_route": "Developer",
            "authority_boundary": "evidence-only",
            "sensitive_evidence": False,
            "redaction_status": "clean",
        }
        first = registry.record_signal(base | {"evidence_ref": "_ops/evidence/PKT-10/warn-1.json"})["signal"]
        second = registry.record_signal(base | {"evidence_ref": "_ops/evidence/PKT-10/warn-2.json"})["signal"]

        result = RecurringFrictionDetector().detect([first, second])

        self.assertEqual(result["status"], "recurring")
        self.assertEqual(len(result["groups"]), 1)
        self.assertEqual(result["groups"][0]["recurrence_count"], 2)
        self.assertTrue(result["groups"][0]["proposal_eligible"])

    def test_proposal_lifecycle_and_wiki_candidate_preserve_boundaries(self) -> None:
        lifecycle = ImprovementProposalLifecycle()
        proposal = lifecycle.create_proposal(
            proposal_id="proposal-1",
            source_friction_ids=["friction-1", "friction-2"],
            source_group_ids=["group-1"],
            problem_statement="Validation warnings repeat without durable remediation.",
            affected_surface="validation",
            expected_improvement="Capture and group warning-only validation friction.",
            risk_level="high",
            verification_method="unit-test",
            evidence_refs=["_ops/evidence/PKT-10/warn-1.json"],
        )
        accepted = lifecycle.review_proposal(proposal, disposition="accepted", rationale="Evidence complete.")
        deferred = lifecycle.review_proposal(proposal, disposition="deferred", rationale="Not now.")
        wiki_candidate = lifecycle.create_wiki_memory_candidate(accepted)
        direct_apply = lifecycle.apply_wiki_memory(wiki_candidate)

        self.assertEqual(proposal["status"], "proposed")
        self.assertEqual(accepted["status"], "accepted")
        self.assertFalse(deferred["starter_promotion_eligible"])
        self.assertEqual(wiki_candidate["status"], "candidate")
        self.assertEqual(direct_apply["status"], "blocked")
        self.assertIn("direct_wiki_apply_blocked", direct_apply["diagnostic_ids"])

    def test_starter_promotion_candidate_requires_accepted_proposal_manifest_and_safety_gates(self) -> None:
        lifecycle = ImprovementProposalLifecycle()
        registry = StarterPromotionCandidateRegistry()
        proposal = lifecycle.review_proposal(
            lifecycle.create_proposal(
                proposal_id="proposal-accepted",
                source_friction_ids=["friction-1", "friction-2"],
                source_group_ids=["group-1"],
                problem_statement="Repeated closeout evidence gaps.",
                affected_surface="closeout",
                expected_improvement="Add validation for missing behavior evidence.",
                risk_level="high",
                verification_method="unit-test",
                evidence_refs=["_ops/evidence/PKT-10/evidence-gap.json"],
            ),
            disposition="accepted",
            rationale="Recurring evidence complete.",
        )
        rejected = lifecycle.review_proposal(proposal, disposition="rejected", rationale="Rejected fixture.")

        blocked = registry.create_candidate(
            proposal=rejected,
            evidence_manifest={},
            changed_surface_plan={"paths": ["_harness/system/standard_harness/self_improvement/friction.py"]},
            rollback_note="revert packet files",
        )
        candidate = registry.create_candidate(
            proposal=proposal,
            evidence_manifest={"evidence_refs": ["_ops/evidence/PKT-10/evidence-gap.json"]},
            changed_surface_plan={"paths": ["_harness/system/standard_harness/self_improvement/friction.py"]},
            rollback_note="revert packet files",
        )
        no_dry_run = registry.validate_candidate(candidate, {})
        dry_run = registry.dry_run(
            candidate,
            {
                "status": "pass",
                "mutates_starter": False,
                "evidence_ref": "_ops/evidence/PKT-10/dry-run.json",
            },
        )
        validation = registry.validate_candidate(
            dry_run,
            {
                "contamination_check": {
                    "status": "pass",
                    "evidence_ref": "_ops/evidence/PKT-10/contamination.json",
                    "provenance": "contamination-checker",
                },
                "clean_export_validation": {
                    "status": "pass",
                    "evidence_ref": "_ops/evidence/PKT-10/clean-export.json",
                    "provenance": "trusted-harness",
                },
                "copied_starter_smoke_validation": {
                    "status": "pass",
                    "evidence_ref": "_ops/evidence/PKT-10/copied-smoke.json",
                    "provenance": "starter-smoke",
                },
                "sensitive_evidence_no_leak": {
                    "status": "pass",
                    "evidence_ref": "_ops/evidence/PKT-10/sensitive-no-leak.json",
                    "provenance": "security-review",
                },
                "root_history_no_leak": {
                    "status": "pass",
                    "evidence_ref": "_ops/evidence/PKT-10/root-history-no-leak.json",
                    "provenance": "security-review",
                },
                "generated_residue_no_leak": {
                    "status": "pass",
                    "evidence_ref": "_ops/evidence/PKT-10/generated-residue.json",
                    "provenance": "trusted-harness",
                },
                "human_approval_boundary": {
                    "status": "present",
                    "evidence_ref": "_ops/decisions/PKT-10/human-approval-boundary.json",
                    "provenance": "trusted-harness",
                },
            },
        )
        direct_mutation = registry.dry_run(
            candidate,
            {
                "status": "pass",
                "mutates_starter": True,
                "evidence_ref": "_ops/evidence/PKT-10/dry-run.json",
            },
        )

        self.assertEqual(blocked["status"], "blocked")
        self.assertIn("proposal_not_accepted", blocked["diagnostic_ids"])
        self.assertEqual(candidate["status"], "candidate")
        self.assertEqual(no_dry_run["status"], "blocked")
        self.assertIn("missing_dry_run_report", no_dry_run["diagnostic_ids"])
        self.assertEqual(dry_run["status"], "dry-run")
        self.assertEqual(validation["status"], "approval-needed")
        self.assertEqual(direct_mutation["status"], "blocked")
        self.assertIn("candidate_direct_starter_mutation_blocked", direct_mutation["diagnostic_ids"])

    def test_starter_promotion_blocks_raw_evidence_root_paths_and_forged_gate_assertions(self) -> None:
        registry = StarterPromotionCandidateRegistry()
        proposal = {
            "proposal_id": "proposal-secure",
            "status": "accepted",
        }
        raw_manifest = registry.create_candidate(
            proposal=proposal,
            evidence_manifest={
                "evidence_refs": ["_ops/evidence/PKT-10/safe.json"],
                "raw_secret": "sk-test-secret",
            },
            changed_surface_plan={"paths": ["_harness/system/standard_harness/self_improvement/friction.py"]},
            rollback_note="revert packet files",
        )
        root_plan = registry.create_candidate(
            proposal=proposal,
            evidence_manifest={"evidence_refs": ["_ops/evidence/PKT-10/safe.json"]},
            changed_surface_plan={"paths": [".agents/artifacts/REQUIREMENTS.md"]},
            rollback_note="revert packet files",
        )
        candidate = registry.create_candidate(
            proposal=proposal,
            evidence_manifest={"evidence_refs": ["_ops/evidence/PKT-10/safe.json"]},
            changed_surface_plan={"paths": ["_harness/system/standard_harness/self_improvement/friction.py"]},
            rollback_note="revert packet files",
        )
        dry_run = registry.dry_run(
            candidate,
            {
                "status": "pass",
                "mutates_starter": False,
                "evidence_ref": "_ops/evidence/PKT-10/dry-run.json",
            },
        )
        forged_validation = registry.validate_candidate(
            dry_run,
            {
                "contamination_check": "pass",
                "clean_export_validation": "pass",
                "copied_starter_smoke_validation": "pass",
                "sensitive_evidence_no_leak": "pass",
                "root_history_no_leak": "pass",
                "generated_residue_no_leak": "pass",
                "human_approval_boundary": "present",
            },
        )
        promoted = registry.register(
            {
                "candidateId": "starter-candidate-forged",
                "sourceXp": "XP-09",
                "source": {"type": "friction", "id": "friction-1"},
                "proposedChange": "Promote unsafe state",
                "expectedBenefit": "none",
                "risk": "high",
                "requiresHarnessPacket": True,
                "promotionStatus": "promoted",
                "evidenceIds": ["evidence-1"],
            }
        )

        self.assertEqual(raw_manifest["status"], "blocked")
        self.assertIn("forbidden_raw_or_sensitive_evidence", raw_manifest["diagnostic_ids"])
        self.assertEqual(root_plan["status"], "blocked")
        self.assertIn("unsafe_path_path", root_plan["diagnostic_ids"])
        self.assertEqual(forged_validation["status"], "blocked")
        self.assertIn("untrusted_safety_gate_assertion:clean_export_validation", forged_validation["diagnostic_ids"])
        self.assertEqual(promoted["status"], "blocked")
        self.assertIn("promotion_execution_out_of_scope", promoted["diagnostic_ids"])

    def test_metrics_are_operational_and_cannot_approve(self) -> None:
        metrics = CompoundFeedbackMetrics().summarize(
            signals=[{"signalType": "boundary_violation", "severity": "high", "sourceSurface": "authority_boundary_violation"}],
            groups=[{"status": "recurring", "proposal_eligible": True}],
            proposals=[{"status": "accepted"}, {"status": "deferred"}],
            candidates=[{"status": "approval-needed"}, {"status": "blocked", "blocked_reasons": ["missing_dry_run_report"]}],
        )

        self.assertEqual(metrics["authority"], "operational-evidence-only")
        self.assertFalse(metrics["canApprovePromotion"])
        self.assertEqual(metrics["candidateStatusCounts"]["approval-needed"], 1)
        self.assertEqual(metrics["blockedPromotionReasons"]["missing_dry_run_report"], 1)

    def test_cli_compound_feedback_entrypoint_records_signals_groups_and_metrics(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            surfaces = ",".join(sorted(MINIMUM_CAPTURE_SURFACES))
            signals_json = (
                '[{"signalType":"boundary_violation","severity":"high",'
                '"sourceSurface":"authority_boundary_violation",'
                '"sourceRef":"approval-boundary",'
                '"recurrenceKey":"approval-boundary:worker",'
                '"evidenceRef":"_ops/evidence/PKT-10/boundary-1.json",'
                '"suggestedRoute":"Reviewer",'
                '"authorityBoundary":"evidence-only",'
                '"sensitiveEvidence":false,'
                '"redactionStatus":"clean"}]'
            )

            result = _handle_compound_feedback(
                store,
                [
                    "--configured-surfaces",
                    surfaces,
                    "--signals-json",
                    signals_json,
                ],
            )["compound_feedback"]

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["capturePolicy"]["status"], "pass")
        self.assertEqual(result["signals"][0]["status"], "recorded")
        self.assertEqual(result["recurring"]["status"], "clear")
        self.assertEqual(result["metrics"]["authority"], "operational-evidence-only")


if __name__ == "__main__":
    unittest.main()
