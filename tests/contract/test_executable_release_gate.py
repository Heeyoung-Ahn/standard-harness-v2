import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ExecutableReleaseGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_catalog_release_blocking_validator_without_probe_blocks_release(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            _write_probe_policy(
                root,
                probes=[
                    _probe("requirements-metadata-validator", "requirements"),
                ],
            )

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("missing_release_behavior_probe", result["diagnostic_ids"])

    def test_probe_that_passes_invalid_fixture_blocks_release(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            _write_probe_policy(
                root,
                probes=[
                    _probe(
                        "wiki-knowledge-validator",
                        "wiki",
                        invalidFixture={"expectedDiagnostic": "missing_wiki_provenance"},
                        observedResult=_gate_result(
                            "wiki-governance-gate",
                            "wiki-knowledge-validator",
                            "PASS",
                            [],
                        ),
                    )
                ],
            )

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("release_probe_did_not_block_invalid_fixture", result["diagnostic_ids"])

    def test_probe_with_malformed_result_blocks_release(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            _write_probe_policy(
                root,
                probes=[
                    _probe(
                        "review-governance-validator",
                        "review",
                        observedResult={"status": "BLOCKED"},
                    )
                ],
            )

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("invalid_release_gate_result_shape", result["diagnostic_ids"])

    def test_metadata_reachable_but_unexecuted_validator_blocks_release(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            catalog_path = root / "_harness/policies/validator-catalog.yaml"
            catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
            catalog["validators"].append(
                {
                    "validatorId": "metadata-only-validator",
                    "hrIds": ["HR-190R", "HR-191"],
                    "gateId": "metadata-only-gate",
                    "implementation": "standard_harness.validation.catalog:ValidatorCatalog",
                    "cliEntrypoint": "validate --release",
                    "negativeTests": ["tests.contract.test_validator_catalog_entries_have_negative_tests"],
                    "reachableFrom": ["validate --release", "validate --v21-conformance"],
                    "releaseBlocking": True,
                    "gateResultMetadata": {
                        "gateId": "metadata-only-gate",
                        "validatorId": "metadata-only-validator",
                        "policyVersion": "0.2.0",
                        "sourceWatermarkRequired": True,
                        "diagnosticIdsRequired": True,
                        "evidenceIdsRequired": True,
                    },
                }
            )
            catalog_path.write_text(json.dumps(catalog, indent=2), encoding="utf-8")
            _refresh_review_governance_hashes(root)

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("unexercised_release_blocking_validator", result["diagnostic_ids"])

    def test_required_release_validator_families_must_be_probed(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            _write_probe_policy(
                root,
                requiredFamilies=["security-boundary", "review", "wiki", "metrics", "release-evidence"],
                probes=[
                    _probe("boundary-validator", "security-boundary"),
                    _probe("review-governance-validator", "review"),
                    _probe("wiki-knowledge-validator", "wiki"),
                ],
            )

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("missing_required_release_validator_family", result["diagnostic_ids"])

    def test_validate_release_surfaces_executable_release_gate_diagnostics(self):
        from standard_harness.state.store import HarnessStore
        from standard_harness.validation.aggregator import ValidationService

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            _write_probe_policy(root, probes=[])
            service = ValidationService(HarnessStore(root / ".harness/state"), repo_root=root)

            diagnostics = service.validate_release()

        self.assertIn(
            "missing_release_behavior_probe",
            {diagnostic["error_code"] for diagnostic in diagnostics},
        )

    def test_missing_release_probe_evidence_artifact_blocks_release(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            _copy_release_repo_subset(root)
            evidence_path = root / "_ops/evidence/release/v21-executable-release-gate.json"
            if evidence_path.exists():
                evidence_path.unlink()
            _write_probe_policy(
                root,
                probes=[
                    _probe("requirements-metadata-validator", "requirements"),
                ],
            )

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("missing_release_probe_evidence", result["diagnostic_ids"])


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


def _write_probe_policy(
    root: Path,
    *,
    probes: list[dict],
    requiredFamilies: list[str] | None = None,
) -> None:
    policy = {
        "schemaVersion": "0.2.0",
        "policyId": "release-behavior-probes",
        "requiredFamilies": requiredFamilies
        or ["security-boundary", "review", "wiki", "metrics", "release-evidence"],
        "probes": probes,
    }
    path = root / "_harness/policies/release-behavior-probes.yaml"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(policy, indent=2), encoding="utf-8")


def _probe(
    validatorId: str,
    family: str,
    *,
    invalidFixture: dict | None = None,
    observedResult: dict | None = None,
) -> dict:
    return {
        "validatorId": validatorId,
        "family": family,
        "invalidFixture": invalidFixture or {"expectedDiagnostic": "fixture_blocks_release"},
        "observedResult": observedResult
        or _gate_result(f"{validatorId}-gate", validatorId, "BLOCKED", ["fixture_blocks_release"]),
    }


def _gate_result(gateId: str, validatorId: str, status: str, diagnostics: list[str]) -> dict:
    return {
        "gateId": gateId,
        "validatorId": validatorId,
        "status": status,
        "diagnostic_ids": diagnostics,
        "releaseBlocking": True,
    }


def _refresh_review_governance_hashes(root: Path) -> None:
    path = root / "_ops/evidence/release/v21-review-governance.json"
    evidence = json.loads(path.read_text(encoding="utf-8"))
    for review in evidence.get("reviews", []):
        for item in review.get("reviewedFiles", []):
            item["sha256"] = _file_hash(root / item["path"])
    path.write_text(json.dumps(evidence, indent=2, sort_keys=True), encoding="utf-8")


def _file_hash(path: Path) -> str:
    import hashlib

    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


if __name__ == "__main__":
    unittest.main()
