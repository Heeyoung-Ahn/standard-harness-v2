from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.policy.gate_profiles import GateProfilePolicy  # noqa: E402
from standard_harness.policy.permissions import AgentPermissionPolicy  # noqa: E402
from standard_harness.policy.zones import LogicalZonePolicy  # noqa: E402
from standard_harness.starter.contamination import StarterContaminationChecker  # noqa: E402
from standard_harness.domain.packets import PacketService  # noqa: E402
from standard_harness.state.store import HarnessStore  # noqa: E402


class Pkt12SchemaPermissionBoundaryTests(unittest.TestCase):
    def test_packet_schema_uses_canonical_standard_risk_level(self) -> None:
        schema = _load_json(STARTER_ROOT / "_harness" / "schemas" / "packet.schema.json")
        risk_enum = schema["properties"]["riskLevel"]["enum"]

        self.assertEqual(risk_enum, ["low", "standard", "high", "critical"])
        self.assertNotIn("medium", risk_enum, "risk_taxonomy_medium_canonical_leak")
        self.assertEqual(GateProfilePolicy.load(STARTER_ROOT).normalize_risk_level("medium"), "standard")
        self.assertEqual(GateProfilePolicy.load(STARTER_ROOT).normalize_risk_level("normal"), "standard")
        self.assertEqual(GateProfilePolicy.load(STARTER_ROOT).normalize_risk_level("unclear"), "critical")

    def test_packet_creation_does_not_store_unknown_risk_as_standard(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = HarnessStore(temp_dir)
            store.initialize()
            packet = PacketService(store).create_packet(
                packet_id="PKT-12-RISK",
                title="Risk normalization",
                objective="Prove unknown risk fails closed.",
                risk_class="unclear",
                scope_summary="scope",
                out_of_scope_summary="out",
                change_zones=["_harness/**"],
                acceptance_criteria_ids=["AC-1"],
                evidence_requirements=["EV-1"],
                closeout_criteria=["CO-1"],
                owner="tester",
                idempotency_key="pkt-12-risk-create",
            )

        self.assertEqual(packet["risk_class"], "critical")
        self.assertEqual(packet["risk_level"], "critical")

    def test_public_schema_identity_does_not_expose_v21_product_labels(self) -> None:
        schema_names = sorted(path.name for path in (STARTER_ROOT / "_harness" / "schemas").glob("*.schema.json"))
        for name in schema_names:
            with self.subTest(schema=name):
                schema = _load_json(STARTER_ROOT / "_harness" / "schemas" / name)
                identity = "\n".join(str(schema.get(field, "")) for field in ("$id", "title"))

                self.assertNotIn("v2.1", identity.lower(), "schema_identity_v21_product_label")

    def test_copied_starter_policy_has_no_root_starter_zone_or_role_leak(self) -> None:
        permissions = AgentPermissionPolicy.from_repo(STARTER_ROOT)
        zones = LogicalZonePolicy.from_repo(STARTER_ROOT)

        self.assertNotIn("harness-developer", permissions.roles, "copied_starter_root_role_leak")
        self.assertNotIn("starter", zones.zones, "copied_starter_root_path_leak")

        all_permission_text = json.dumps(permissions.data, sort_keys=True)
        all_zone_text = json.dumps(zones.data, sort_keys=True)
        self.assertNotIn("starter/standard-harness", all_permission_text, "copied_starter_root_path_leak")
        self.assertNotIn("starter/standard-harness", all_zone_text, "copied_starter_root_path_leak")

        self.assertTrue(permissions.can_write_path("harness-maintainer", "_harness/policies/zones.yaml", zones))
        self.assertFalse(
            permissions.can_write_path(
                "harness-maintainer",
                "starter/standard-harness/_harness/policies/zones.yaml",
                zones,
            )
        )

    def test_contamination_checker_rejects_nested_root_starter_payload_leak(self) -> None:
        diagnostics = StarterContaminationChecker().check_paths(
            [
                "starter/standard-harness/AGENTS.md",
                "starter/standard-harness/_harness/policies/agent-permissions.yaml",
            ]
        )

        self.assertEqual(
            {diagnostic["error_code"] for diagnostic in diagnostics},
            {"copied_starter_root_path_leak"},
        )


def _load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
