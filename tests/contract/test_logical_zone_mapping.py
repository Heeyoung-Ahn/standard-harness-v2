import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class LogicalZoneMappingTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_default_zones_support_existing_projects_without_product_root(self):
        from standard_harness.policy.zones import LogicalZonePolicy

        policy = LogicalZonePolicy.load(ROOT / "_harness" / "policies" / "zones.yaml")

        self.assertEqual(policy.zone_for_path("_harness/policies/p0-policy.yaml"), "harness")
        self.assertEqual(policy.zone_for_path("_ops/evidence/run.json"), "ops")
        self.assertEqual(policy.zone_for_path("apps/web/login.tsx"), "product")
        self.assertEqual(policy.zone_for_path("src/standard_harness/domain/packets.py"), "product")

    def test_zone_policy_exposes_forbidden_product_write_zones(self):
        from standard_harness.policy.zones import LogicalZonePolicy

        policy = LogicalZonePolicy.load(ROOT / "_harness" / "policies" / "zones.yaml")

        self.assertIn("_harness/**", policy.forbidden_write_zones_for("product-feature"))


if __name__ == "__main__":
    unittest.main()
