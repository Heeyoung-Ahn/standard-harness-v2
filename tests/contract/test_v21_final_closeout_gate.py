import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class V21FinalCloseoutGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_missing_final_closeout_evidence_blocks_release(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            (root / "_ops/evidence/release/v21-final-closeout.json").unlink(missing_ok=True)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("missing_final_closeout_evidence", result["diagnostic_ids"])

    def test_missing_required_verification_domain_blocks_release(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            _write_final_closeout(root, omit_verification="wikiKnowledge")

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("missing_wiki_knowledge_verification", result["diagnostic_ids"])

    def test_stale_full_regression_evidence_blocks_release(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            regression_path = root / "_ops/evidence/release/v21-full-regression.json"
            regression = json.loads(regression_path.read_text(encoding="utf-8"))
            regression["headCommit"] = "0" * 40
            regression_path.write_text(json.dumps(regression, indent=2), encoding="utf-8")
            _write_final_closeout(root)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("stale_full_regression_evidence", result["diagnostic_ids"])

    def test_repo_local_generated_state_blocks_final_closeout(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            sqlite = root / ".harness/state/harness.sqlite3"
            sqlite.parent.mkdir(parents=True, exist_ok=True)
            sqlite.write_bytes(b"local generated state")
            _write_final_closeout(root)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("missing_clean_hygiene_verification", result["diagnostic_ids"])

    def test_unresolved_final_closeout_blocker_blocks_release(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            _write_final_closeout(root, unresolved_blockers=["review-risk-not-adjudicated"])

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("final_closeout_unresolved_blocker", result["diagnostic_ids"])

    def test_invalid_final_closeout_gate_result_metadata_blocks_release(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            _write_final_closeout(root, gate_result={"status": "PASS"})

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("invalid_final_closeout_gate_result_metadata", result["diagnostic_ids"])

    def test_validate_release_surfaces_final_closeout_diagnostics(self):
        from standard_harness.state.store import HarnessStore
        from standard_harness.validation.aggregator import ValidationService

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            (root / "_ops/evidence/release/v21-final-closeout.json").unlink(missing_ok=True)
            service = ValidationService(HarnessStore(root / ".harness/state"), repo_root=root)

            diagnostics = service.validate_release()

        self.assertIn(
            "missing_final_closeout_evidence",
            {diagnostic["error_code"] for diagnostic in diagnostics},
        )


def _copy_release_repo_subset(target: Path) -> None:
    for relative in [
        "_harness",
        "_ops/evidence/release",
        "_ops/metrics",
        "_ops/wiki",
        "docs/reviews",
        "docs/requirements",
        "docs/release",
        "docs/manual",
        "src",
        "tests",
    ]:
        source = ROOT / relative
        destination = target / relative
        if source.is_dir():
            shutil.copytree(source, destination)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
    _refresh_review_governance_hashes(target)


def _write_final_closeout(
    root: Path,
    *,
    omit_verification: str | None = None,
    unresolved_blockers: list[str] | None = None,
    gate_result: dict | None = None,
) -> None:
    head = _head_commit()
    domains = {
        "releaseGate": {"status": "pass", "evidencePath": "docs/release/v21-conformance-report.md"},
        "reviewGovernance": {"status": "pass", "evidencePath": "_ops/evidence/release/v21-review-governance.json"},
        "wikiKnowledge": {"status": "pass", "evidencePath": "_ops/wiki/index.yaml"},
        "hr200Metrics": {"status": "pass", "evidencePath": "_ops/metrics/hr200-success-metrics.json"},
        "securityBoundary": {"status": "pass", "evidencePath": "_harness/policies/agent-permissions.yaml"},
        "executableReleaseProbes": {
            "status": "pass",
            "evidencePath": "_ops/evidence/release/v21-executable-release-gate.json",
        },
        "fullRegression": {
            "status": "pass",
            "evidencePath": "_ops/evidence/release/v21-full-regression.json",
            "headCommit": json.loads(
                (root / "_ops/evidence/release/v21-full-regression.json").read_text(encoding="utf-8")
            ).get("headCommit"),
        },
        "cleanHygiene": {"status": "pass", "repoLocalGeneratedState": False},
    }
    if omit_verification:
        domains.pop(omit_verification, None)
    evidence = {
        "evidenceId": "release-v21-final-closeout",
        "generatedBy": "final-closeout-validator@0.2.0",
        "generatedAt": "2026-06-26T00:00:00+09:00",
        "release": {
            "headCommit": head,
            "status": "pass",
        },
        "gateResult": gate_result
        if gate_result is not None
        else {
            "gateId": "v21-final-closeout-gate",
            "validatorId": "final-closeout-validator",
            "status": "PASS",
            "diagnostic_ids": [],
            "releaseBlocking": True,
            "policyVersion": "0.2.0",
            "validatorVersion": "final-closeout-validator@0.2.0",
            "evidenceIds": ["release-v21-final-closeout"],
        },
        "verifications": domains,
        "unresolvedBlockers": unresolved_blockers or [],
        "metrics": {
            "finalCloseoutVerificationCoverage": 1.0,
        },
    }
    path = root / "_ops/evidence/release/v21-final-closeout.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(evidence, indent=2), encoding="utf-8")


def _refresh_review_governance_hashes(root: Path) -> None:
    path = root / "_ops/evidence/release/v21-review-governance.json"
    evidence = json.loads(path.read_text(encoding="utf-8"))
    for review in evidence.get("reviews", []):
        for item in review.get("reviewedFiles", []):
            reviewed_file = root / item["path"]
            if reviewed_file.exists():
                item["sha256"] = _file_hash(reviewed_file)
    path.write_text(json.dumps(evidence, indent=2, sort_keys=True), encoding="utf-8")


def _file_hash(path: Path) -> str:
    import hashlib

    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def _head_commit() -> str:
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()


if __name__ == "__main__":
    unittest.main()
