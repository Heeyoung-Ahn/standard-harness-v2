import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class AdapterSkeletonTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_adapter_manifest_requires_mvp_fields(self):
        from standard_harness.adapters.manifest import AdapterManifest

        manifest = AdapterManifest.from_dict(
            {
                "adapter_id": "local-shell",
                "adapter_version": "0.1",
                "supported_roles": ["Tester"],
                "execution_modes": ["local"],
                "evidence_modes": ["command-output"],
                "read_write_capability": "read-only",
                "artifact_export_capability": "manifest",
                "permission_roots": ["."],
                "known_limitations": ["no network"],
                "failure_modes": ["timeout"],
            }
        )

        self.assertEqual(manifest.adapter_id, "local-shell")
        self.assertEqual(manifest.read_write_capability, "read-only")

        with self.assertRaises(ValueError):
            AdapterManifest.from_dict({"adapter_id": "missing-fields"})

    def test_output_envelope_rejects_direct_state_mutation(self):
        from standard_harness.adapters.envelope import AdapterOutputEnvelope

        with self.assertRaises(ValueError):
            AdapterOutputEnvelope.from_dict(
                {
                    "adapter_run_id": "run-001",
                    "input_snapshot_hash": "abc",
                    "permission_roots": ["."],
                    "artifact_manifest": [],
                    "event_request": {"event_type": "evidence.registered"},
                    "failure_classification": None,
                    "evidence_provenance": {"execution_mode": "local"},
                    "state_mutation": {"sqlite_path": ".harness/state/harness.sqlite3"},
                }
            )

    def test_mock_adapter_success_is_not_production_evidence(self):
        from standard_harness.adapters.envelope import AdapterOutputEnvelope

        envelope = AdapterOutputEnvelope.from_dict(
            {
                "adapter_run_id": "run-001",
                "input_snapshot_hash": "abc",
                "permission_roots": ["."],
                "artifact_manifest": [{"path": "tmp/output.txt"}],
                "event_request": {"event_type": "evidence.registered"},
                "failure_classification": None,
                "evidence_provenance": {"execution_mode": "mock", "result_status": "passed"},
            }
        )

        self.assertFalse(envelope.is_production_execution_evidence())


if __name__ == "__main__":
    unittest.main()
