import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class DataBiFinanceProfileTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_data_bi_and_finance_profiles_are_stronger_than_base_profile(self):
        from standard_harness.policy.data_profile import DataProfileCatalog

        catalog = DataProfileCatalog()
        base = catalog.get("base")

        for profile_id in ["data", "bi", "finance"]:
            profile = catalog.get(profile_id)
            self.assertGreaterEqual(profile["min_evidence_count"], base["min_evidence_count"])
            self.assertGreaterEqual(profile["retention_days"], base["retention_days"])
            self.assertTrue(set(base["privacy_controls"]).issubset(profile["privacy_controls"]))
            self.assertTrue(profile["human_approval_required"])


if __name__ == "__main__":
    unittest.main()
