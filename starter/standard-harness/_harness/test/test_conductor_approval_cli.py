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


if __name__ == "__main__":
    unittest.main()
