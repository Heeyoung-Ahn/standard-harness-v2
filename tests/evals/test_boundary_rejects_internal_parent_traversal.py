import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class BoundaryTraversalTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_internal_parent_traversal_cannot_bypass_harness_boundary(self):
        from standard_harness.validation.boundary import BoundaryValidator

        result = BoundaryValidator.from_repo(ROOT).validate(
            {
                "packetId": "pkt-product",
                "packetType": "product-feature",
                "role": "developer",
                "baseCommit": "base",
                "headCommit": "head",
                "changedFiles": [
                    {"path": "src/../_harness/policies/p0-policy.yaml", "status": "M"}
                ],
                "declaredChangeZones": ["src"],
            }
        )

        self.assertEqual(result["status"], "blocked")
        self.assertTrue(result["hard_fail"])
        self.assertIn("path_traversal", result["diagnostic_ids"])
        self.assertIn("harness_boundary_violation", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
