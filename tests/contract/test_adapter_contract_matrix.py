import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class AdapterContractMatrixTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_contract_matrix_classifies_required_outcomes(self):
        from standard_harness.adapters.contract_matrix import AdapterContractMatrix

        matrix = AdapterContractMatrix()

        expected = {
            "success": "accepted",
            "fail": "rejected",
            "blocked": "blocked",
            "stale": "blocked",
            "substitute": "human_review_required",
            "not_applicable": "accepted_with_record",
            "partial_output": "blocked",
            "timeout": "blocked",
            "permission_denied": "blocked",
            "malformed_envelope": "rejected",
            "mock_success": "rejected",
            "direct_state_mutation": "rejected",
            "path_escape": "rejected",
        }

        for outcome, disposition in expected.items():
            with self.subTest(outcome=outcome):
                result = matrix.classify(outcome)
                self.assertEqual(result["outcome"], outcome)
                self.assertEqual(result["disposition"], disposition)
                self.assertTrue(result["diagnostic_code"])

    def test_manifest_declares_supported_failure_modes_in_matrix(self):
        from standard_harness.adapters.contract_matrix import AdapterContractMatrix
        from standard_harness.adapters.manifest import AdapterManifest

        manifest = AdapterManifest.from_dict(
            {
                "adapter_id": "browser",
                "adapter_version": "1",
                "supported_roles": ["Tester"],
                "execution_modes": ["local"],
                "evidence_modes": ["browser_functional"],
                "read_write_capability": "read_artifacts",
                "artifact_export_capability": "write_artifacts",
                "permission_roots": ["C:/tmp/harness"],
                "known_limitations": ["no remote browser"],
                "failure_modes": ["timeout", "permission_denied", "path_escape"],
            }
        )

        report = AdapterContractMatrix().validate_manifest(manifest)

        self.assertEqual(report["status"], "valid")
        self.assertEqual(report["unsupported_failure_modes"], [])

    def test_unknown_failure_mode_is_rejected_by_matrix_validation(self):
        from standard_harness.adapters.contract_matrix import AdapterContractMatrix
        from standard_harness.adapters.manifest import AdapterManifest

        manifest = AdapterManifest.from_dict(
            {
                "adapter_id": "custom",
                "adapter_version": "1",
                "supported_roles": ["Tester"],
                "execution_modes": ["local"],
                "evidence_modes": ["unit_test"],
                "read_write_capability": "read_only",
                "artifact_export_capability": "none",
                "permission_roots": ["C:/tmp/harness"],
                "known_limitations": [],
                "failure_modes": ["unknown_future_mode"],
            }
        )

        report = AdapterContractMatrix().validate_manifest(manifest)

        self.assertEqual(report["status"], "blocked")
        self.assertEqual(report["unsupported_failure_modes"], ["unknown_future_mode"])

    def test_manifest_matrix_rejects_unsupported_modes_and_capabilities(self):
        from standard_harness.adapters.contract_matrix import AdapterContractMatrix
        from standard_harness.adapters.manifest import AdapterManifest

        manifest = AdapterManifest.from_dict(
            {
                "adapter_id": "unsafe",
                "adapter_version": "1",
                "supported_roles": ["Tester"],
                "execution_modes": ["kernel_driver"],
                "evidence_modes": ["dream"],
                "read_write_capability": "direct_state_write",
                "artifact_export_capability": "path_escape",
                "permission_roots": ["relative/root"],
                "known_limitations": [],
                "failure_modes": ["timeout"],
            }
        )

        report = AdapterContractMatrix().validate_manifest(manifest)

        self.assertEqual(report["status"], "blocked")
        self.assertEqual(report["unsupported_execution_modes"], ["kernel_driver"])
        self.assertEqual(report["unsupported_evidence_modes"], ["dream"])
        self.assertEqual(report["unsupported_read_write_capability"], "direct_state_write")
        self.assertEqual(report["unsupported_artifact_export_capability"], "path_escape")
        self.assertEqual(report["invalid_permission_roots"], ["relative/root"])


if __name__ == "__main__":
    unittest.main()
