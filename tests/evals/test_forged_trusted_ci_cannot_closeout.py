import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ForgedTrustedCiTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_caller_supplied_trusted_ci_without_trusted_producer_cannot_closeout(self):
        from standard_harness.evidence.trust import EvidenceTrustPolicy

        evidence = {
            "validation_status": "STRUCTURALLY_VALID",
            "trust_status": "TRUSTED_CI",
            "produced_via": "manual-handoff",
            "producer_provider": "local",
            "base_commit": "base",
            "head_commit": "head",
            "workspace_id": "pkt-001",
        }

        self.assertFalse(EvidenceTrustPolicy().can_closeout(evidence))


if __name__ == "__main__":
    unittest.main()
