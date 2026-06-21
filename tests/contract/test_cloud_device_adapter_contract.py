import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class CloudDeviceAdapterContractTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_cloud_evidence_contract_requires_identity_and_failure_class(self):
        from standard_harness.runtime.cloud_contract import CloudEvidenceContract

        record = CloudEvidenceContract.validate(
            {
                "project": "standard-harness",
                "account": "acct-001",
                "region": "us-east-1",
                "identity": "ci-role",
                "command": "deploy --dry-run",
                "artifact_manifest": [{"path": "C:/tmp/harness/cloud/log.txt"}],
                "failure_class": "none",
            }
        )

        self.assertEqual(record["status"], "valid")
        self.assertEqual(record["profile_id"], "cloud_execution")

    def test_device_evidence_contract_requires_target_and_runtime_fingerprint(self):
        from standard_harness.runtime.device_contract import DeviceEvidenceContract

        record = DeviceEvidenceContract.validate(
            {
                "target_identity": "emulator-5554",
                "os_or_runtime_fingerprint": "android-35",
                "command": "adb shell am start",
                "artifact_manifest": [{"path": "C:/tmp/harness/device/log.txt"}],
                "failure_class": "none",
            }
        )

        self.assertEqual(record["status"], "valid")
        self.assertEqual(record["profile_id"], "device_execution")

    def test_cloud_and_device_contracts_reject_missing_required_fields(self):
        from standard_harness.runtime.cloud_contract import CloudEvidenceContract
        from standard_harness.runtime.device_contract import DeviceEvidenceContract

        cloud = CloudEvidenceContract.validate(
            {
                "project": "standard-harness",
                "account": "",
                "region": "us-east-1",
                "identity": "",
                "command": "deploy --dry-run",
                "artifact_manifest": [],
                "failure_class": "",
            }
        )
        device = DeviceEvidenceContract.validate(
            {
                "target_identity": "",
                "os_or_runtime_fingerprint": "",
                "command": "adb shell am start",
                "artifact_manifest": [],
                "failure_class": "",
            }
        )

        self.assertEqual(cloud["status"], "blocked")
        self.assertIn("missing_account", cloud["diagnostic_codes"])
        self.assertIn("missing_identity", cloud["diagnostic_codes"])
        self.assertEqual(device["status"], "blocked")
        self.assertIn("missing_target_identity", device["diagnostic_codes"])
        self.assertIn("missing_os_or_runtime_fingerprint", device["diagnostic_codes"])


if __name__ == "__main__":
    unittest.main()
