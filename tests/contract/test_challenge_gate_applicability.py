import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ChallengeGateApplicabilityTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_policy_declares_v02_challenge_triggers_and_required_artifacts(self):
        from standard_harness.validation.challenge_gate import ChallengeGateValidator

        validator = ChallengeGateValidator.load(ROOT)
        policy = validator.policy

        self.assertEqual(policy["gateId"], "challenge-gate")
        self.assertIn("security", policy["challengeTriggers"])
        self.assertIn("data_integrity", policy["challengeTriggers"])
        self.assertIn("harness_boundary", policy["challengeTriggers"])
        self.assertIn("p0_gate_exception_request", policy["challengeTriggers"])
        self.assertEqual(
            policy["requiredArtifacts"],
            [
                "_ops/evidence/<packet-id>/challenge-review.md",
                "_ops/decisions/records/<decision-id>.md",
            ],
        )

    def test_triggered_request_without_challenge_review_blocks_with_gate_result_metadata(self):
        from standard_harness.validation.challenge_gate import ChallengeGateValidator

        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            validator = ChallengeGateValidator.load(ROOT)
            result = validator.evaluate(
                repo_root=repo,
                packet_id="pkt-001",
                decision_id="DEC-001",
                triggers=["security"],
                reviewed_checks=[],
            )

            self.assertEqual(result["status"], "blocked")
            self.assertEqual(result["gateResult"]["packetId"], "pkt-001")
            self.assertEqual(result["gateResult"]["gate"], "challenge-gate")
            self.assertEqual(result["gateResult"]["status"], "BLOCKED")
            self.assertEqual(result["gateResult"]["policyVersion"], "0.2.0")
            self.assertEqual(result["gateResult"]["validatorVersion"], "challenge-gate-validator@0.2.0")
            self.assertIn("missing_challenge_review", result["diagnostic_ids"])
            self.assertIn("missing_human_decision_record", result["diagnostic_ids"])

    def test_triggered_request_passes_when_required_review_and_decision_record_exist(self):
        from standard_harness.validation.challenge_gate import ChallengeGateValidator

        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            evidence_dir = repo / "_ops" / "evidence" / "pkt-001"
            decisions_dir = repo / "_ops" / "decisions" / "records"
            evidence_dir.mkdir(parents=True)
            decisions_dir.mkdir(parents=True)
            (evidence_dir / "challenge-review.md").write_text("reviewed", encoding="utf-8")
            (decisions_dir / "DEC-001.md").write_text("decision", encoding="utf-8")

            result = ChallengeGateValidator.load(ROOT).evaluate(
                repo_root=repo,
                packet_id="pkt-001",
                decision_id="DEC-001",
                triggers=["security"],
                reviewed_checks=[
                    "requirements_conflict",
                    "security_or_data_risk",
                    "harness_contamination",
                    "long_term_structure_damage",
                    "safer_smaller_alternative",
                    "human_decision_required",
                ],
            )

            self.assertEqual(result["status"], "pass")
            self.assertEqual(result["diagnostic_ids"], [])
            self.assertEqual(result["gateResult"]["status"], "PASS")


if __name__ == "__main__":
    unittest.main()
