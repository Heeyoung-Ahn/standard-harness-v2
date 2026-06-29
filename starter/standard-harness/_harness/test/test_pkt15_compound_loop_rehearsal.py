from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.context.authority import ContextAuthorityPolicy  # noqa: E402
from standard_harness.context.budget import TokenBudgetPolicy  # noqa: E402
from standard_harness.context.packs import ContextPackBuilder  # noqa: E402
from standard_harness.documenter.closeout_report import CloseoutReportDocumenter  # noqa: E402
from standard_harness.pmo.reports import PmoDailyReportService  # noqa: E402
from standard_harness.reviews.adjudication import ChallengeReviewService  # noqa: E402
from standard_harness.self_improvement.friction import (  # noqa: E402
    FrictionSignalRegistry,
    RuntimeFrictionCapture,
    StoredFrictionSignalRegistry,
)
from standard_harness.self_improvement.proposals import RepeatedFrictionPromotionLoop  # noqa: E402
from standard_harness.self_improvement.recurring import RecurringFrictionDetector  # noqa: E402
from standard_harness.state.store import HarnessStore  # noqa: E402
from standard_harness.validation.aggregator import ValidationService  # noqa: E402
from standard_harness.validation.challenge_gate import ChallengeGateValidator  # noqa: E402
from standard_harness.validation.final_closeout import FinalCloseoutValidator  # noqa: E402
from standard_harness.validation.human_decision import HumanDecisionValidator  # noqa: E402
from standard_harness.validation.pmo_reports import validate_pmo_report  # noqa: E402
from standard_harness.validation.review_governance import ReviewGovernanceValidator  # noqa: E402
from standard_harness.workflow.conductor_worker_e2e import ConductorWorkerE2ERunner  # noqa: E402


class Pkt15CompoundLoopRehearsalTests(unittest.TestCase):
    def test_validation_call_sites_capture_failure_with_duplicate_suppression(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            capture = RuntimeFrictionCapture(StoredFrictionSignalRegistry(store))

            diagnostics = ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
                friction_capture=capture,
            ).validate_packet("PKT-15-MISSING")
            ValidationService(
                store,
                starter_root=STARTER_ROOT,
                repo_root=STARTER_ROOT,
                friction_capture=capture,
            ).validate_packet("PKT-15-MISSING")
            signals = StoredFrictionSignalRegistry(store).list_signals()

        self.assertTrue(diagnostics)
        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0]["sourceSurface"], "validation_failure")
        self.assertIn("ValidationService.validate_packet", signals[0]["sourceRef"])

    def test_review_pm_closeout_context_and_authority_call_sites_capture_friction(self) -> None:
        registry = FrictionSignalRegistry()
        capture = RuntimeFrictionCapture(registry)

        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            ReviewGovernanceValidator(temp_dir, friction_capture=capture).validate_release()
            service = ChallengeReviewService(store, friction_capture=capture)
            service.open_challenge(
                challenge_id="challenge-pkt15",
                challenged_item_id="missing-evidence",
                reviewer_role="Reviewer",
                rationale="Missing evidence.",
                idempotency_key="challenge-pkt15",
                packet_id="PKT-15",
                triggers=["user_requested_challenge"],
                decision_id="DEC-15",
                reviewed_checks=[],
            )
            with self.assertRaises(ValueError):
                service.record_adjudication(
                    adjudication_id="adj-pkt15",
                    challenge_id="challenge-pkt15",
                    outcome="blocked",
                    follow_up_event_ids=[],
                    idempotency_key="adj-pkt15",
                )
            FinalCloseoutValidator(temp_dir, friction_capture=capture).validate_release()

        PmoDailyReportService(friction_capture=capture).build_day_start_report(
            {
                "packet_id": "PKT-15",
                "packet_title": "Compound loop",
                "next_work": "Fix repeated blockers",
                "blockers": ["Repeated validation gap"],
                "evidence_index_path": "_ops/evidence/PKT-15/evidence-index.json",
            },
            report_date="2026-06-30",
        )
        validate_pmo_report(
            {"authority": "approval", "markdown": "PM approves closeout", "packet_id": "PKT-15"},
            friction_capture=capture,
        )
        CloseoutReportDocumenter(friction_capture=capture).validate_report(
            {"report_path": "bad.md", "markdown": "```raw```", "packetId": "PKT-15"}
        )
        ContextPackBuilder(
            ContextAuthorityPolicy({"tiers": [], "defaultTier": "untrusted-content"}),
            TokenBudgetPolicy({"defaultMaxTokens": 1}, friction_capture=capture),
            friction_capture=capture,
        ).build(
            role="developer",
            packet={"packet_id": "PKT-15"},
            items=[{"path": "packet.md", "content": "x" * 100}, {"path": "secret.log", "classification": "SECRET"}],
        )
        HumanDecisionValidator({"missing_packet"}, friction_capture=capture).validate(
            {
                "decisionId": "DEC-15",
                "packetId": "PKT-15",
                "gate": "closeout",
                "decisionType": "override",
                "rationale": "override",
                "acceptedRisk": "none",
                "approver": "human",
                "expiresAt": "2026-07-01",
                "followUpPacketRequired": False,
                "followUpPacketId": "",
                "requestedOverrides": ["missing_packet"],
            }
        )
        ChallengeGateValidator(
            {
                "challengeTriggers": ["user_requested_challenge"],
                "reviewChecks": ["source_parity"],
                "gateId": "challenge-gate",
                "policyVersion": "challenge-gate@1",
            },
            friction_capture=capture,
        ).evaluate(
            repo_root=tempfile.gettempdir(),
            packet_id="PKT-15",
            decision_id="DEC-15",
            triggers=["user_requested_challenge"],
            reviewed_checks=[],
        )
        ConductorWorkerE2ERunner(
            tempfile.gettempdir(),
            friction_capture=capture,
        ).run(packet_id="PKT-15", mode="real-smoke", real_cli_approval=False)

        surfaces = {signal["sourceSurface"] for signal in registry.signals}
        self.assertTrue(
            {
                "review_finding_or_evidence_gap",
                "pm_report_status_friction",
                "closeout_state_mismatch",
                "context_token_budget_overrun",
                "authority_boundary_violation",
            }.issubset(surfaces)
        )

    def test_repeated_friction_promotes_to_approval_needed_candidate_only(self) -> None:
        registry = FrictionSignalRegistry()
        capture = RuntimeFrictionCapture(registry)
        first = capture.validation_failure(
            source_ref="validation/aggregator.py::ValidationService.validate_packet",
            evidence_ref="_ops/evidence/PKT-15/validation-1.json",
            recurrence_key="validation:packet-registration",
        )["signal"]
        second = capture.validation_failure(
            source_ref="validation/aggregator.py::ValidationService.validate_packet",
            evidence_ref="_ops/evidence/PKT-15/validation-2.json",
            recurrence_key="validation:packet-registration",
        )["signal"]
        recurring = RecurringFrictionDetector().detect([first, second])
        group = recurring["groups"][0]

        result = RepeatedFrictionPromotionLoop().promote_group(
            group=group,
            source_signals=[first, second],
            proposal_id="proposal-pkt15",
            problem_statement="Validation packet registration friction repeats.",
            expected_improvement="Add automatic call-site capture and promotion rehearsal.",
            risk_level="high",
            verification_method="unit-test",
            review_disposition="accepted",
            review_rationale="Recurring evidence is complete.",
            evidence_manifest={"evidence_refs": ["_ops/evidence/PKT-15/validation-1.json"]},
            changed_surface_plan={"paths": ["_harness/system/standard_harness/self_improvement/friction.py"]},
            rollback_note="Revert PKT-15 scoped files.",
            dry_run_report={
                "status": "pass",
                "mutates_starter": False,
                "evidence_ref": "_ops/evidence/PKT-15/dry-run.json",
            },
            validation_result=_passing_validation_result(),
        )
        single = dict(group)
        single["status"] = "single"
        single["proposal_eligible"] = False
        blocked = RepeatedFrictionPromotionLoop().promote_group(
            group=single,
            source_signals=[first],
            proposal_id="proposal-single",
            problem_statement="Single friction.",
            expected_improvement="No promotion.",
            risk_level="standard",
            verification_method="unit-test",
            review_disposition="accepted",
            review_rationale="Should not matter.",
            evidence_manifest={"evidence_refs": ["_ops/evidence/PKT-15/validation-1.json"]},
            changed_surface_plan={"paths": ["_harness/system/standard_harness/self_improvement/friction.py"]},
            rollback_note="Revert.",
        )

        self.assertEqual(result["status"], "approval-needed")
        self.assertFalse(result["can_approve_promotion"])
        self.assertEqual(result["candidate"]["approval_boundary"], "human-decision-required-before-promotion")
        self.assertEqual(blocked["status"], "blocked")
        self.assertIn("recurring_friction_not_proposal_eligible", blocked["diagnostic_ids"])

    def test_starter_promotion_rejects_full_forbidden_contamination_set(self) -> None:
        blocked = RepeatedFrictionPromotionLoop().promote_group(
            group={
                "status": "recurring",
                "proposal_eligible": True,
                "group_id": "group-pkt15",
                "source_surface": "validation_failure",
                "evidence_refs": ["_ops/evidence/PKT-15/validation-1.json"],
            },
            source_signals=[{"signalId": "friction-1"}],
            proposal_id="proposal-forbidden",
            problem_statement="Unsafe starter promotion evidence.",
            expected_improvement="Reject unsafe evidence.",
            risk_level="high",
            verification_method="unit-test",
            review_disposition="accepted",
            review_rationale="Fixture.",
            evidence_manifest={
                "evidence_refs": ["_ops/evidence/PKT-15/api-key.json"],
                "auth_token": "sk-test",
            },
            changed_surface_plan={"paths": ["_harness/system/standard_harness/provider-cache/session.cookie"]},
            rollback_note="Revert.",
        )

        self.assertEqual(blocked["status"], "blocked")
        self.assertIn("forbidden_raw_or_sensitive_evidence", blocked["diagnostic_ids"])
        self.assertIn("unsafe_path_path", blocked["diagnostic_ids"])


def _passing_validation_result() -> dict[str, dict[str, str]]:
    return {
        "contamination_check": {
            "status": "pass",
            "evidence_ref": "_ops/evidence/PKT-15/contamination.json",
            "provenance": "contamination-checker",
        },
        "clean_export_validation": {
            "status": "pass",
            "evidence_ref": "_ops/evidence/PKT-15/clean-export.json",
            "provenance": "trusted-harness",
        },
        "copied_starter_smoke_validation": {
            "status": "pass",
            "evidence_ref": "_ops/evidence/PKT-15/copied-smoke.json",
            "provenance": "starter-smoke",
        },
        "sensitive_evidence_no_leak": {
            "status": "pass",
            "evidence_ref": "_ops/evidence/PKT-15/sensitive-no-leak.json",
            "provenance": "security-review",
        },
        "root_history_no_leak": {
            "status": "pass",
            "evidence_ref": "_ops/evidence/PKT-15/root-boundary-clean.json",
            "provenance": "security-review",
        },
        "generated_residue_no_leak": {
            "status": "pass",
            "evidence_ref": "_ops/evidence/PKT-15/generated-residue.json",
            "provenance": "trusted-harness",
        },
        "human_approval_boundary": {
            "status": "present",
            "evidence_ref": "_ops/decisions/PKT-15/human-approval-boundary.json",
            "provenance": "trusted-harness",
        },
    }


if __name__ == "__main__":
    unittest.main()
