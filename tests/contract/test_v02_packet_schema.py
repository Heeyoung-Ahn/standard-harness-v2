import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class V02PacketSchemaTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_packet_schema_artifact_declares_v02_required_metadata(self):
        schema_path = ROOT / "_harness" / "schemas" / "packet.schema.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))

        required = set(schema["required"])
        for field in [
            "packetId",
            "type",
            "riskLevel",
            "maturityLevel",
            "scope",
            "outOfScope",
            "dependsOn",
            "changeZones",
            "locks",
            "acceptanceCriteria",
            "testPlan",
            "closeoutPlan",
            "policyVersion",
            "gateProfileVersion",
        ]:
            self.assertIn(field, required)
        self.assertIn("closeout_pending", schema["properties"]["lifecycleState"]["enum"])
        self.assertNotIn("approved", schema["properties"]["lifecycleState"]["enum"])

    def test_create_packet_records_v02_metadata_and_replays_it(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.replay import StateReplayService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = PacketService(store)

            packet = service.create_packet(
                packet_id="pkt-v02",
                title="V2.1 packet",
                objective="Record v0.2 packet metadata.",
                packet_type="product-feature",
                risk_class="medium",
                maturity_level="L1",
                scope=["Implement packet metadata"],
                out_of_scope=["No challenge policy"],
                depends_on=["pkt-prereq"],
                change_zones=["src/standard_harness/domain/"],
                locks=["src/standard_harness/domain/packets.py"],
                acceptance_criteria_ids=["ac-v02"],
                evidence_requirements=["focused-test"],
                test_plan=["python -m unittest tests.contract.test_v02_packet_schema"],
                e2e_test_gate=None,
                review_plan={"requirements": "required"},
                security_review_plan={},
                refactor_review_plan={},
                closeout_plan={"required": ["focused-test", "full-regression"]},
                closeout_criteria=["supported-claim", "passing-gate"],
                owner="human-owner",
                policy_version="0.2.0",
                gate_profile_version="product-feature@1",
                idempotency_key="packet-create-v02",
            )

            self.assertEqual(packet["packet_type"], "product-feature")
            self.assertEqual(packet["risk_level"], "medium")
            self.assertEqual(packet["maturity_level"], "L1")
            self.assertEqual(packet["scope"], ["Implement packet metadata"])
            self.assertEqual(packet["out_of_scope"], ["No challenge policy"])
            self.assertEqual(packet["depends_on"], ["pkt-prereq"])
            self.assertEqual(packet["locks"], ["src/standard_harness/domain/packets.py"])
            self.assertEqual(packet["test_plan"], ["python -m unittest tests.contract.test_v02_packet_schema"])
            self.assertEqual(packet["gate_profile_version"], "product-feature@1")

            with store.connection() as conn:
                conn.execute("delete from packets")
            replay = StateReplayService(store).rebuild_materialized_state()

            self.assertEqual(replay["status"], "rebuilt")
            replayed = service.get_packet("pkt-v02")
            self.assertEqual(replayed["packet_type"], "product-feature")
            self.assertEqual(replayed["gate_profile_version"], "product-feature@1")

    def test_v02_state_machine_rejects_legacy_lifecycle_state(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = PacketService(store)
            service.create_packet(
                packet_id="pkt-state",
                title="State packet",
                objective="Validate v0.2 state machine.",
                risk_class="low",
                scope_summary="State transition.",
                out_of_scope_summary="Closeout.",
                change_zones=["src/"],
                acceptance_criteria_ids=["ac-state"],
                evidence_requirements=["test"],
                closeout_criteria=["passing-gate"],
                owner="human-owner",
                idempotency_key="packet-create-state",
            )

            with self.assertRaises(ValueError):
                service.transition_packet(
                    packet_id="pkt-state",
                    lifecycle_state="approved",
                    actor_id="dev-1",
                    actor_role="Developer",
                    authority_basis="legacy state is not v0.2 lifecycle",
                    idempotency_key="packet-transition-approved",
                )

            packet = service.transition_packet(
                packet_id="pkt-state",
                lifecycle_state="closeout_pending",
                actor_id="dev-1",
                actor_role="Developer",
                authority_basis="ready for closeout",
                idempotency_key="packet-transition-closeout-pending",
            )
            self.assertEqual(packet["lifecycle_state"], "closeout_pending")

    def test_validate_packet_blocks_missing_gate_profile_version(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore
        from standard_harness.validation.aggregator import ValidationService

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-invalid-profile",
                title="Invalid profile packet",
                objective="Validate release-blocking gate profile metadata.",
                risk_class="low",
                scope_summary="Packet metadata.",
                out_of_scope_summary="Closeout.",
                change_zones=["src/"],
                acceptance_criteria_ids=["ac-profile"],
                evidence_requirements=["test"],
                closeout_criteria=["passing-gate"],
                owner="human-owner",
                idempotency_key="packet-create-invalid-profile",
            )
            with store.connection() as conn:
                conn.execute(
                    "update packets set gate_profile_version = '' where packet_id = ?",
                    ("pkt-invalid-profile",),
                )
                conn.commit()

            diagnostics = ValidationService(store, repo_root=ROOT).validate_packet(
                "pkt-invalid-profile"
            )
            error_codes = {diagnostic["error_code"] for diagnostic in diagnostics}

            self.assertIn("missing_gate_profile", error_codes)
            self.assertIn("invalid_packet_schema", error_codes)


if __name__ == "__main__":
    unittest.main()
