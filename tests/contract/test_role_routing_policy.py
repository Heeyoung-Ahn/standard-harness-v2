import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class RoleRoutingPolicyTests(unittest.TestCase):
    def test_role_routing_policy_is_provider_neutral_and_has_fallbacks(self):
        policy = json.loads((ROOT / "_harness/policies/role-routing.yaml").read_text(encoding="utf-8"))

        developer = policy["roles"]["developer"]
        self.assertIn("allowedWriteZones", developer)
        self.assertIn("requiredOutputs", developer)
        self.assertIn("fallbackProviders", developer)
        self.assertNotEqual(developer["primaryProvider"], "required-core-provider")


if __name__ == "__main__":
    unittest.main()
