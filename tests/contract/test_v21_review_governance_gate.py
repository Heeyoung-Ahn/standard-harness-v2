import copy
import hashlib
import json
import subprocess
import shutil
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CURRENT_HEAD = "b05259f0672111c7a3261c8b832ade09e0583971"


class V21ReviewGovernanceGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_release_blocks_when_review_governance_evidence_is_missing(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_review_governance_evidence", result["diagnostic_ids"])

    def test_release_blocks_fake_or_unknown_reviewed_commit(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            evidence = _valid_review_governance(root)
            evidence["reviews"][0]["reviewedCommit"] = "0000000000000000000000000000000000000000"
            _write_governance(root, evidence)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("invalid_review_governance_commit", result["diagnostic_ids"])

    def test_release_blocks_stale_reviewed_file_hash(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            evidence = _valid_review_governance(root)
            evidence["reviews"][0]["reviewedFiles"][0]["sha256"] = "sha256:" + ("0" * 64)
            _write_governance(root, evidence)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("stale_review_governance_evidence", result["diagnostic_ids"])

    def test_reviewed_file_hash_may_match_committed_blob_when_checkout_line_endings_differ(self):
        from standard_harness.validation.review_governance import ReviewGovernanceValidator

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _git(root, "init")
            _git(root, "config", "user.email", "review@example.com")
            _git(root, "config", "user.name", "Review Tester")
            reviewed = root / "reviewed.txt"
            reviewed.write_text("line one\nline two\n", encoding="utf-8", newline="\n")
            _git(root, "add", "reviewed.txt")
            _git(root, "commit", "-m", "add reviewed file")
            commit = _git(root, "rev-parse", "HEAD").strip()
            blob_hash = "sha256:" + hashlib.sha256(
                _git_bytes(root, "show", f"{commit}:reviewed.txt")
            ).hexdigest()
            reviewed.write_text("line one\r\nline two\r\n", encoding="utf-8", newline="")
            evidence = {
                "reviews": [
                    {
                        "reviewId": "rv-line-endings",
                        "packetId": "XP-10C",
                        "reviewType": "implementation",
                        "reviewedCommit": commit,
                        "reviewedFiles": [{"path": "reviewed.txt", "sha256": blob_hash}],
                        "focusedTestEvidence": {"command": "python -m unittest", "result": "passed"},
                        "fullRegressionEvidence": {"evidenceId": "regression", "result": "passed"},
                        "deterministicEvidence": ["focusedTestEvidence"],
                        "findings": [],
                        "finalDecision": "pass",
                    }
                ]
            }
            _write_governance(root, evidence)

            result = ReviewGovernanceValidator(root).validate_release()

        self.assertEqual(result["status"], "pass")

    def test_release_blocks_unresolved_p0_finding(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            evidence = _valid_review_governance(root)
            evidence["reviews"][0]["findings"] = [
                {"id": "rv-p0", "severity": "P0", "status": "open", "summary": "release blocker"}
            ]
            _write_governance(root, evidence)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("unresolved_p0_review_finding", result["diagnostic_ids"])

    def test_release_blocks_p1_without_accepted_risk_and_final_adjudication(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            evidence = _valid_review_governance(root)
            evidence["reviews"][0]["findings"] = [
                {"id": "rv-p1", "severity": "P1", "status": "open", "summary": "important risk"}
            ]
            evidence["reviews"][0].pop("finalAdjudication")
            _write_governance(root, evidence)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("p1_review_requires_risk_acceptance", result["diagnostic_ids"])
        self.assertIn("missing_review_final_adjudication", result["diagnostic_ids"])

    def test_release_blocks_conditional_pass_without_final_adjudication(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            evidence = _valid_review_governance(root)
            evidence["reviews"][0]["finalDecision"] = "conditional-pass"
            evidence["reviews"][0].pop("finalAdjudication")
            _write_governance(root, evidence)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_review_final_adjudication", result["diagnostic_ids"])

    def test_ai_review_alone_cannot_satisfy_release_review(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_subset(root)
            evidence = _valid_review_governance(root)
            evidence["reviews"][0]["reviewType"] = "ai"
            evidence["reviews"][0]["deterministicEvidence"] = []
            _write_governance(root, evidence)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("ai_review_cannot_release_alone", result["diagnostic_ids"])


def _copy_release_subset(target: Path) -> None:
    for relative in [
        "_harness/requirements/hr-coverage-matrix.yaml",
        "_harness/requirements/traceability-matrix.yaml",
        "_harness/policies/validator-catalog.yaml",
        "_ops/metrics/hr200-success-metrics.json",
        "_ops/evidence/release/v21-full-regression.json",
        "docs/release/v21-conformance-report.md",
        "docs/release/release-packaging-hygiene-v21.md",
        "docs/release/final-product-docs-command-inventory-v1.md",
        "docs/manual/standard-harness-v21-development-scenario.md",
    ]:
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / relative, destination)
    shutil.copytree(ROOT / "docs/reviews/v21", target / "docs/reviews/v21")
    shutil.copytree(ROOT / "tests", target / "tests")


def _valid_review_governance(root: Path) -> dict:
    review_file = "docs/release/v21-conformance-report.md"
    return {
        "evidenceId": "release-v21-review-governance",
        "generatedBy": "review-governance-validator@0.2.0",
        "sourceEventRange": "XP-10C",
        "reviews": [
            {
                "reviewId": "rv-xp-10c",
                "packetId": "XP-10C",
                "reviewType": "implementation",
                "reviewedCommit": CURRENT_HEAD,
                "reviewedFiles": [
                    {
                        "path": review_file,
                        "sha256": _file_hash(root / review_file),
                    }
                ],
                "focusedTestEvidence": {
                    "command": "python -m unittest tests.contract.test_v21_review_governance_gate",
                    "result": "passed",
                },
                "fullRegressionEvidence": {
                    "evidenceId": "release-v21-full-regression",
                    "result": "passed",
                },
                "deterministicEvidence": ["focusedTestEvidence", "fullRegressionEvidence"],
                "findings": [],
                "acceptedRisks": [],
                "finalDecision": "pass",
                "finalAdjudication": {
                    "status": "approved",
                    "adjudicator": "human-owner",
                    "rationale": "No unresolved release-blocking review findings.",
                },
            }
        ],
    }


def _write_governance(root: Path, evidence: dict) -> None:
    path = root / "_ops/evidence/release/v21-review-governance.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(copy.deepcopy(evidence), sort_keys=True, indent=2), encoding="utf-8")


def _file_hash(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def _git(root: Path, *args: str) -> str:
    return subprocess.check_output(["git", "-C", str(root), *args], text=True)


def _git_bytes(root: Path, *args: str) -> bytes:
    return subprocess.check_output(["git", "-C", str(root), *args])


if __name__ == "__main__":
    unittest.main()
