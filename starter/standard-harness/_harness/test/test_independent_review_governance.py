from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.validation.review_governance import ReviewGovernanceValidator  # noqa: E402


class IndependentReviewGovernanceTests(unittest.TestCase):
    def test_packet_doc_review_is_required_before_implementation_transition(self) -> None:
        packet = {
            "packet_type": "docs-only",
            "review_plan": {},
            "closeout_plan": {},
        }

        diagnostics = ReviewGovernanceValidator(STARTER_ROOT).implementation_transition_diagnostics(packet)

        self.assertIn("missing_packet_doc_review", diagnostics)

    def test_packet_doc_review_passes_only_with_independent_agent_and_ssot_coverage(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._write(repo_root / "_ops/evidence/PKT-05/packet-doc-review.json", '{"packetId": "PKT-05"}')
            packet = {
                "packet_id": "PKT-05",
                "packet_type": "docs-only",
                "review_plan": {
                    "packetDocReview": {
                        "status": "pass",
                        "agentId": "packet-doc-review-agent",
                        "independence": "independent agent, not packet author, not Developer, not Tester, not Orchestrator",
                        "evidencePath": "_ops/evidence/PKT-05/packet-doc-review.json",
                        "coverage": [
                            "human_planner_intent",
                            "requirements_direction",
                            "implementation_plan",
                            "architecture_source_ssot",
                            "acceptance_strength",
                            "verification_scope",
                            "v1_root_constraints",
                            "v2_product_philosophy",
                        ],
                    }
                },
                "closeout_plan": {},
            }

            diagnostics = ReviewGovernanceValidator(repo_root).implementation_transition_diagnostics(packet)

        self.assertEqual(diagnostics, [])

    def test_packet_doc_review_rejects_na_and_missing_evidence_file(self) -> None:
        packet = {
            "packet_id": "PKT-05",
            "packet_type": "docs-only",
            "review_plan": {
                "packetDocReview": {
                    "status": "not-applicable",
                    "agentId": "packet-doc-review-agent",
                    "evidencePath": "_ops/evidence/PKT-05/missing.json",
                    "coverage": [
                        "human_planner_intent",
                        "requirements_direction",
                        "implementation_plan",
                        "architecture_source_ssot",
                        "acceptance_strength",
                        "verification_scope",
                        "v1_root_constraints",
                        "v2_product_philosophy",
                    ],
                }
            },
        }

        diagnostics = ReviewGovernanceValidator(STARTER_ROOT).implementation_transition_diagnostics(packet)

        self.assertIn("packet_doc_review_not_pass", diagnostics)
        self.assertIn("missing_packet_doc_review_evidence", diagnostics)

    def test_four_independent_closeout_lenses_are_required_for_every_packet(self) -> None:
        packet = {
            "packet_type": "docs-only",
            "closeout_plan": {
                "reviewGates": {
                    "challenge_review": {"status": "pass", "agentId": "challenge-agent", "evidencePath": "_ops/evidence/reviews/challenge.json"},
                    "evidence_review": {"status": "pass", "agentId": "evidence-agent", "evidencePath": "_ops/evidence/reviews/evidence.json"},
                }
            },
        }

        diagnostics = ReviewGovernanceValidator(STARTER_ROOT).closeout_diagnostics(packet)

        self.assertIn("missing_independent_closeout_review_lens", diagnostics)

    def test_four_independent_closeout_lenses_reject_duplicate_agents(self) -> None:
        packet = {
            "packet_type": "docs-only",
            "closeout_plan": {
                "reviewGates": {
                    "challenge_review": {"status": "pass", "agentId": "same-agent", "evidencePath": "_ops/evidence/reviews/challenge.json"},
                    "adversarial_security_review": {"status": "pass", "agentId": "same-agent", "evidencePath": "_ops/evidence/reviews/security.json"},
                    "code_quality_review": {"status": "pass", "agentId": "quality-agent", "evidencePath": "_ops/evidence/reviews/quality.json"},
                    "evidence_review": {"status": "pass", "agentId": "evidence-agent", "evidencePath": "_ops/evidence/reviews/evidence.json"},
                }
            },
        }

        diagnostics = ReviewGovernanceValidator(STARTER_ROOT).closeout_diagnostics(packet)

        self.assertIn("duplicate_independent_review_agent", diagnostics)

    def test_four_independent_closeout_lenses_require_existing_evidence_files(self) -> None:
        packet = {
            "packet_id": "PKT-05",
            "packet_type": "docs-only",
            "closeout_plan": {
                "reviewGates": {
                    "challenge_review": {"status": "pass", "agentId": "challenge-agent", "evidencePath": "_ops/evidence/reviews/missing-challenge.json"},
                    "adversarial_security_review": {"status": "pass", "agentId": "security-agent", "evidencePath": "_ops/evidence/reviews/missing-security.json"},
                    "code_quality_review": {"status": "pass", "agentId": "quality-agent", "evidencePath": "_ops/evidence/reviews/missing-quality.json"},
                    "evidence_review": {"status": "pass", "agentId": "evidence-agent", "evidencePath": "_ops/evidence/reviews/missing-evidence.json"},
                }
            },
        }

        diagnostics = ReviewGovernanceValidator(STARTER_ROOT).closeout_diagnostics(packet)

        self.assertIn("missing_independent_closeout_review_evidence", diagnostics)

    @staticmethod
    def _write(path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content.strip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
