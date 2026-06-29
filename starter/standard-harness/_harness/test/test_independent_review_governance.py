from __future__ import annotations

import sys
import subprocess
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

    def test_low_risk_docs_only_closeout_allows_one_independent_lens_with_actual_docs_changed_file(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._write(
                repo_root / "_ops/evidence/reviews/evidence.json",
                '{"verificationType":"command","command":"harness validate","exitCode":0,"result":"pass"}',
            )
            packet = {
                "packet_type": "docs-only",
                "risk_level": "low",
                "route_class": "fast-path",
                "gate_profile": "light",
                "change_zone": "padded",
                "actual_changed_files": ["docs/ops-guide.md"],
                "closeout_plan": {
                    "reviewGates": {
                        "evidence_review": {
                            "status": "pass",
                            "agentId": "evidence-agent",
                            "evidencePath": "_ops/evidence/reviews/evidence.json",
                        },
                        "challenge_review": {
                            "status": "not-applicable",
                            "rationale": "No challenge surface remains for docs-only low-risk closeout.",
                            "evidencePath": "_ops/evidence/reviews/evidence.json",
                        },
                    }
                },
            }

            diagnostics = ReviewGovernanceValidator(repo_root).closeout_diagnostics(packet)

        self.assertEqual(diagnostics, [])

    def test_low_risk_fast_path_requires_actual_changed_file_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._write(
                repo_root / "_ops/evidence/reviews/evidence.json",
                '{"verificationType":"command","command":"harness validate","exitCode":0,"result":"pass"}',
            )
            packet = {
                "packet_type": "docs-only",
                "risk_level": "low",
                "route_class": "fast-path",
                "gate_profile": "light",
                "change_zone": "padded",
                "closeout_plan": {
                    "reviewGates": {
                        "evidence_review": {
                            "status": "pass",
                            "agentId": "evidence-agent",
                            "evidencePath": "_ops/evidence/reviews/evidence.json",
                        }
                    }
                },
            }

            diagnostics = ReviewGovernanceValidator(repo_root).closeout_diagnostics(packet)

        self.assertIn("missing_actual_changed_file_evidence", diagnostics)

    def test_low_risk_fast_path_blocks_actual_runtime_or_approval_changes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._write(
                repo_root / "_ops/evidence/reviews/evidence.json",
                '{"verificationType":"command","command":"harness validate","exitCode":0,"result":"pass"}',
            )
            packet = {
                "packet_type": "docs-only",
                "risk_level": "low",
                "route_class": "fast-path",
                "gate_profile": "light",
                "change_zone": "padded",
                "actual_changed_files": ["_harness/system/standard_harness/validation/review_governance.py"],
                "closeout_plan": {
                    "reviewGates": {
                        "evidence_review": {
                            "status": "pass",
                            "agentId": "evidence-agent",
                            "evidencePath": "_ops/evidence/reviews/evidence.json",
                        }
                    }
                },
            }

            diagnostics = ReviewGovernanceValidator(repo_root).closeout_diagnostics(packet)

        self.assertIn("unsafe_actual_changed_file_for_fast_path", diagnostics)

    def test_low_risk_fast_path_prefers_trusted_git_diff_over_supplied_changed_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._write(
                repo_root / "_ops/evidence/reviews/evidence.json",
                '{"verificationType":"command","command":"harness validate","exitCode":0,"result":"pass"}',
            )
            self._write(repo_root / "_harness/system/standard_harness/validation/review_governance.py", "# baseline\n")
            self._git(repo_root, "init")
            self._git(repo_root, "add", ".")
            self._git(repo_root, "-c", "user.email=test@example.com", "-c", "user.name=Test User", "commit", "-m", "baseline")
            self._write(repo_root / "_harness/system/standard_harness/validation/review_governance.py", "# changed\n")
            packet = {
                "packet_type": "docs-only",
                "risk_level": "low",
                "route_class": "fast-path",
                "gate_profile": "light",
                "change_zone": "padded",
                "actual_changed_files": ["docs/ops-guide.md"],
                "closeout_plan": {
                    "reviewGates": {
                        "evidence_review": {
                            "status": "pass",
                            "agentId": "evidence-agent",
                            "evidencePath": "_ops/evidence/reviews/evidence.json",
                        }
                    }
                },
            }

            diagnostics = ReviewGovernanceValidator(repo_root).closeout_diagnostics(packet)

        self.assertIn("unsafe_actual_changed_file_for_fast_path", diagnostics)

    def test_low_risk_fast_path_fails_closed_when_git_changed_file_source_errors(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            self._write(
                repo_root / "_ops/evidence/reviews/evidence.json",
                '{"verificationType":"command","command":"harness validate","exitCode":0,"result":"pass"}',
            )
            (repo_root / ".git").mkdir()
            packet = {
                "packet_type": "docs-only",
                "risk_level": "low",
                "route_class": "fast-path",
                "gate_profile": "light",
                "change_zone": "padded",
                "actual_changed_files": ["docs/ops-guide.md"],
                "closeout_plan": {
                    "reviewGates": {
                        "evidence_review": {
                            "status": "pass",
                            "agentId": "evidence-agent",
                            "evidencePath": "_ops/evidence/reviews/evidence.json",
                        }
                    }
                },
            }

            diagnostics = ReviewGovernanceValidator(repo_root).closeout_diagnostics(packet)

        self.assertIn("untrusted_actual_changed_file_source", diagnostics)
        self.assertIn("missing_actual_changed_file_evidence", diagnostics)

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

    @staticmethod
    def _git(repo_root: Path, *args: str) -> None:
        subprocess.run(["git", "-C", str(repo_root), *args], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == "__main__":
    unittest.main()
