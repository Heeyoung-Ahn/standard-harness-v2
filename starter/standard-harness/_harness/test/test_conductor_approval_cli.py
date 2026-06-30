from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.cli.main import main as harness_main
from standard_harness.domain.packets import PacketService
from standard_harness.state.store import HarnessStore


def _create_packet(temp_dir: str, packet_id: str = "PKT-A3") -> None:
    store = HarnessStore(temp_dir)
    store.initialize()
    PacketService(store).create_packet(
        packet_id=packet_id,
        title="Survey review packet",
        objective="Verify conductor approval CLI behavior.",
        risk_class="standard",
        change_zones=["starter/standard-harness"],
        acceptance_criteria_ids=["AC-1"],
        evidence_requirements=["EV-1"],
        closeout_criteria=["CO-1"],
        owner="planner",
        idempotency_key=f"{packet_id}:create",
    )


class ConductorApprovalCliTests(unittest.TestCase):
    def test_grant_create_command_writes_trusted_record(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = io.StringIO()
            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        temp_dir,
                        "conductor-grant-create",
                        "--delegation-grant-id",
                        "grant-a3-rfc",
                        "--delegating-human-owner",
                        "human-owner",
                        "--conductor-id",
                        "codex-conductor",
                        "--packet-id",
                        "PKT-A3",
                        "--approval-type",
                        "ready_for_code",
                        "--risk-ceiling",
                        "standard",
                        "--evidence-prerequisites",
                        "packet_doc_review_passed,evidence_prerequisites_met",
                        "--valid-from",
                        "2026-07-01T00:00:00Z",
                        "--valid-until",
                        "2026-07-02T00:00:00Z",
                        "--packet-hash",
                        "pkt-a3-hash",
                    ]
                )

            payload = json.loads(output.getvalue())
            self.assertEqual(exit_code, 0)
            grant = payload["conductorGrant"]
            self.assertEqual(grant["status"], "active")
            self.assertEqual(grant["approval_type"], "ready_for_code")
            self.assertTrue(grant["trusted_harness_surface"])
            self.assertTrue(grant["record_path"].endswith("grant-a3-rfc.json"))

    def test_conductor_approve_command_rejects_planner_actor(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = io.StringIO()
            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        temp_dir,
                        "conductor-approve",
                        "--packet-id",
                        "PKT-A3",
                        "--approval-type",
                        "ready_for_code",
                        "--actor-type",
                        "planner",
                        "--approval-channel",
                        "trusted_harness_command",
                        "--packet-hash",
                        "pkt-a3-hash",
                        "--risk-level",
                        "standard",
                        "--approved-scope",
                        "PKT-A3 starter review",
                        "--rationale",
                        "planner should be rejected",
                        "--hard-stop-json",
                        "{\"packet_exists\":true,\"packet_hash_current\":true,\"transition_valid\":true,"
                        "\"packet_doc_review_passed\":true,\"evidence_prerequisites_met\":true,"
                        "\"no_critical_security_blocker\":true}",
                    ]
                )

            payload = json.loads(output.getvalue())
            self.assertEqual(exit_code, 1)
            self.assertIn("planner_delegated_approval_forbidden", payload["diagnostics"])

    def test_conductor_approve_respects_decided_at_and_persists_human_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            _create_packet(temp_dir)

            grant_output = io.StringIO()
            with redirect_stdout(grant_output):
                grant_exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        temp_dir,
                        "conductor-grant-create",
                        "--delegation-grant-id",
                        "grant-a3-future",
                        "--delegating-human-owner",
                        "human-owner",
                        "--conductor-id",
                        "codex-conductor",
                        "--packet-id",
                        "PKT-A3",
                        "--approval-type",
                        "ready_for_code",
                        "--risk-ceiling",
                        "standard",
                        "--evidence-prerequisites",
                        "packet_doc_review_passed,evidence_prerequisites_met",
                        "--valid-from",
                        "2030-01-01T00:00:00Z",
                        "--valid-until",
                        "2030-01-02T00:00:00Z",
                        "--packet-hash",
                        "pkt-a3-hash",
                    ]
                )

            grant_payload = json.loads(grant_output.getvalue())
            self.assertEqual(grant_exit_code, 0)

            conductor_output = io.StringIO()
            with redirect_stdout(conductor_output):
                conductor_exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        temp_dir,
                        "conductor-approve",
                        "--packet-id",
                        "PKT-A3",
                        "--approval-type",
                        "ready_for_code",
                        "--actor-type",
                        "conductor",
                        "--conductor-id",
                        "codex-conductor",
                        "--approval-channel",
                        "trusted_harness_command",
                        "--grant-file",
                        grant_payload["conductorGrant"]["record_path"],
                        "--packet-hash",
                        "pkt-a3-hash",
                        "--risk-level",
                        "standard",
                        "--approved-scope",
                        "PKT-A3 starter review",
                        "--rationale",
                        "delegated conductor approval",
                        "--decided-at",
                        "2030-01-01T12:00:00Z",
                        "--hard-stop-json",
                        "{\"packet_exists\":true,\"packet_hash_current\":true,\"transition_valid\":true,"
                        "\"packet_doc_review_passed\":true,\"evidence_prerequisites_met\":true,"
                        "\"no_critical_security_blocker\":true}",
                    ]
                )

            conductor_payload = json.loads(conductor_output.getvalue())
            self.assertEqual(conductor_exit_code, 0)
            self.assertEqual(
                conductor_payload["conductorApproval"]["decision"]["decided_at"],
                "2030-01-01T12:00:00Z",
            )

            human_output = io.StringIO()
            with redirect_stdout(human_output):
                human_exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        temp_dir,
                        "conductor-approve",
                        "--packet-id",
                        "PKT-A3",
                        "--approval-type",
                        "ready_for_code",
                        "--actor-type",
                        "human",
                        "--approval-channel",
                        "trusted_harness_command",
                        "--packet-hash",
                        "pkt-a3-human-hash",
                        "--risk-level",
                        "standard",
                        "--approved-scope",
                        "PKT-A3 human approval",
                        "--rationale",
                        "trusted human approval",
                        "--hard-stop-json",
                        "{\"packet_exists\":true,\"packet_hash_current\":true,\"transition_valid\":true,"
                        "\"packet_doc_review_passed\":true,\"evidence_prerequisites_met\":true,"
                        "\"no_critical_security_blocker\":true}",
                    ]
                )

            human_payload = json.loads(human_output.getvalue())
            self.assertEqual(human_exit_code, 0)
            persisted = human_payload["conductorApproval"]["persisted"]["record"]
            self.assertEqual(persisted["approver_role"], "Human")
            self.assertEqual(persisted["authority_basis"], "trusted human direct approval")


if __name__ == "__main__":
    unittest.main()
