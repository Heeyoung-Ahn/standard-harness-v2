import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class GitDiffBoundaryValidatorTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_product_change_inside_declared_product_zone_passes(self):
        from standard_harness.validation.boundary import BoundaryValidator

        result = BoundaryValidator.from_repo(ROOT).validate(
            {
                "packetId": "pkt-product",
                "packetType": "product-feature",
                "role": "developer",
                "baseCommit": "base",
                "headCommit": "head",
                "changedFiles": [{"path": "apps/web/login.tsx", "status": "M"}],
                "declaredChangeZones": ["apps/web"],
            }
        )

        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["diagnostic_ids"], [])

    def test_product_packet_harness_diff_is_hard_fail(self):
        from standard_harness.validation.boundary import BoundaryValidator

        result = BoundaryValidator.from_repo(ROOT).validate(
            {
                "packetId": "pkt-product",
                "packetType": "product-feature",
                "role": "developer",
                "baseCommit": "base",
                "headCommit": "head",
                "changedFiles": [{"path": "_harness/policies/p0-policy.yaml", "status": "M"}],
                "declaredChangeZones": ["_harness/policies"],
            }
        )

        self.assertEqual(result["status"], "blocked")
        self.assertTrue(result["hard_fail"])
        self.assertIn("harness_boundary_violation", result["diagnostic_ids"])
        self.assertIn("forbidden_write_zone", result["diagnostic_ids"])

    def test_harness_packet_can_modify_harness_policy_zone(self):
        from standard_harness.validation.boundary import BoundaryValidator

        result = BoundaryValidator.from_repo(ROOT).validate(
            {
                "packetId": "pkt-harness",
                "packetType": "harness-policy",
                "role": "harness-developer",
                "baseCommit": "base",
                "headCommit": "head",
                "changedFiles": [{"path": "_harness/policies/zones.yaml", "status": "M"}],
                "declaredChangeZones": ["_harness/policies"],
            }
        )

        self.assertEqual(result["status"], "pass")

    def test_diff_outside_declared_change_zones_reports_invalid_mapping(self):
        from standard_harness.validation.boundary import BoundaryValidator

        result = BoundaryValidator.from_repo(ROOT).validate(
            {
                "packetId": "pkt-product",
                "packetType": "product-feature",
                "role": "developer",
                "baseCommit": "base",
                "headCommit": "head",
                "changedFiles": [{"path": "apps/web/login.tsx", "status": "M"}],
                "declaredChangeZones": ["packages/api"],
            }
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("invalid_zone_mapping", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
