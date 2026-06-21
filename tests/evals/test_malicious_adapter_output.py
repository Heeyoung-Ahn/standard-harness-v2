import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class MaliciousAdapterOutputTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_rejects_direct_state_mutation_request(self):
        from standard_harness.adapters.contract_matrix import AdapterBoundaryValidator

        result = AdapterBoundaryValidator().validate_envelope(
            {
                **_valid_envelope(),
                "direct_state_write": {"table": "events", "sql": "delete from events"},
            }
        )
        nested = _valid_envelope()
        nested["event_request"] = {
            "event_type": "evidence.registered",
            "payload": {"direct_state_write": {"sql": "delete from events"}},
        }
        nested_result = AdapterBoundaryValidator().validate_envelope(nested)

        self.assertEqual(result["status"], "rejected")
        self.assertEqual(result["failure_classification"], "direct_state_mutation")
        self.assertEqual(nested_result["status"], "rejected")
        self.assertEqual(nested_result["failure_classification"], "direct_state_mutation")

    def test_rejects_path_escape_outside_permission_roots(self):
        from standard_harness.adapters.contract_matrix import AdapterBoundaryValidator

        envelope = _valid_envelope()
        envelope["artifact_manifest"] = [
            {"path": "C:/tmp/harness/evidence/out.txt"},
            {"path": "C:/tmp/other/out.txt"},
        ]
        traversal = _valid_envelope()
        traversal["artifact_manifest"] = [
            {"path": "C:/tmp/harness/../other/out.txt"},
        ]
        relative_against_posix_root = _valid_envelope()
        relative_against_posix_root["permission_roots"] = ["/tmp/harness"]
        relative_against_posix_root["artifact_manifest"] = [
            {"path": "tmp/harness/evidence/out.txt"},
        ]
        relative_root = _valid_envelope()
        relative_root["permission_roots"] = ["tmp/harness"]
        relative_root["artifact_manifest"] = [
            {"path": "tmp/harness/evidence/out.txt"},
        ]

        result = AdapterBoundaryValidator().validate_envelope(envelope)
        traversal_result = AdapterBoundaryValidator().validate_envelope(traversal)
        relative_result = AdapterBoundaryValidator().validate_envelope(
            relative_against_posix_root
        )
        relative_root_result = AdapterBoundaryValidator().validate_envelope(relative_root)

        self.assertEqual(result["status"], "rejected")
        self.assertEqual(result["failure_classification"], "path_escape")
        self.assertEqual(traversal_result["status"], "rejected")
        self.assertEqual(traversal_result["failure_classification"], "path_escape")
        self.assertEqual(relative_result["status"], "rejected")
        self.assertEqual(relative_result["failure_classification"], "path_escape")
        self.assertEqual(relative_root_result["status"], "rejected")
        self.assertEqual(relative_root_result["failure_classification"], "path_escape")

    def test_rejects_mock_success_as_production_evidence(self):
        from standard_harness.adapters.contract_matrix import AdapterBoundaryValidator

        envelope = _valid_envelope()
        envelope["evidence_provenance"] = {
            "execution_mode": "mock",
            "result_status": "passed",
            "evidence_id": "ev-001",
        }

        result = AdapterBoundaryValidator().validate_envelope(envelope)

        self.assertEqual(result["status"], "rejected")
        self.assertEqual(result["failure_classification"], "mock_success")

    def test_rejects_missing_evidence_provenance_and_malformed_event_request(self):
        from standard_harness.adapters.contract_matrix import AdapterBoundaryValidator

        missing_provenance = _valid_envelope()
        missing_provenance.pop("evidence_provenance")
        incomplete_provenance = _valid_envelope()
        incomplete_provenance["evidence_provenance"] = {
            "execution_mode": "local",
            "result_status": "passed",
        }
        malformed_event = _valid_envelope()
        malformed_event["event_request"] = {"payload": {}}
        direct_write_event = _valid_envelope()
        direct_write_event["event_request"] = {"event_type": "sqlite.write"}

        first = AdapterBoundaryValidator().validate_envelope(missing_provenance)
        second = AdapterBoundaryValidator().validate_envelope(incomplete_provenance)
        third = AdapterBoundaryValidator().validate_envelope(malformed_event)
        fourth = AdapterBoundaryValidator().validate_envelope(direct_write_event)

        self.assertEqual(first["status"], "rejected")
        self.assertEqual(first["failure_classification"], "malformed_envelope")
        self.assertEqual(second["status"], "rejected")
        self.assertEqual(second["failure_classification"], "malformed_envelope")
        self.assertEqual(third["status"], "rejected")
        self.assertEqual(third["failure_classification"], "malformed_envelope")
        self.assertEqual(fourth["status"], "rejected")
        self.assertEqual(fourth["failure_classification"], "direct_state_mutation")


def _valid_envelope() -> dict[str, object]:
    return {
        "adapter_run_id": "run-001",
        "input_snapshot_hash": "sha256:input",
        "permission_roots": ["C:/tmp/harness"],
        "artifact_manifest": [{"path": "C:/tmp/harness/evidence/out.txt"}],
        "event_request": {"event_type": "evidence.registered"},
        "failure_classification": None,
        "evidence_provenance": {
            "execution_mode": "local",
            "result_status": "passed",
            "evidence_id": "ev-001",
        },
    }


if __name__ == "__main__":
    unittest.main()
