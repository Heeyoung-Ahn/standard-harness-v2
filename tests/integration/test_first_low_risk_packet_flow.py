import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CLI = ROOT / "tools" / "harness_cli.py"


class FirstLowRiskPacketFlowTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_first_low_risk_packet_closes_through_cli_flow(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.gates import GateService
        from standard_harness.domain.packets import PacketService
        from standard_harness.projection.current_context import CurrentContextProjection
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            self._run(tmp, "init")
            self._run(
                tmp,
                "packet-create",
                "--packet-id",
                "pkt-001",
                "--title",
                "First low-risk packet",
                "--objective",
                "Exercise MVP flow.",
                "--risk-class",
                "low",
                "--scope-summary",
                "Create and validate one packet.",
                "--out-of-scope-summary",
                "No external adapters.",
                "--change-zones",
                "tests/integration",
                "--acceptance-criteria-ids",
                "ac-001",
                "--evidence-requirements",
                "unittest-output",
                "--closeout-criteria",
                "supported-claim,passing-gate",
                "--owner",
                "human-owner",
                "--idempotency-key",
                "packet-create-pkt-001",
            )
            self._run(
                tmp,
                "packet-approve",
                "--packet-id",
                "pkt-001",
                "--approver-id",
                "owner-1",
                "--approver-role",
                "Human Owner",
                "--authority-basis",
                "explicit approval",
                "--approved-scope",
                "low-risk MVP packet",
                "--rationale",
                "integration test",
                "--idempotency-key",
                "approve-pkt-001",
            )
            self._run(
                tmp,
                "packet-transition",
                "--packet-id",
                "pkt-001",
                "--lifecycle-state",
                "in_progress",
                "--actor-id",
                "dev-1",
                "--actor-role",
                "Developer",
                "--authority-basis",
                "approved packet",
                "--idempotency-key",
                "transition-pkt-001",
            )
            self._run(
                tmp,
                "requirement-register",
                "--requirement-id",
                "REQ-001",
                "--version",
                "1",
                "--source-doc",
                "docs/requirements/example.md",
                "--status",
                "approved",
                "--classification",
                "Core",
                "--risk-classification",
                "low",
                "--acceptance-criteria",
                "ac-001",
                "--completion-classification",
                "evidence-required",
                "--packet-id",
                "pkt-001",
                "--idempotency-key",
                "requirement-REQ-001",
            )
            self._run(
                tmp,
                "acceptance-register",
                "--acceptance-criterion-id",
                "ac-001",
                "--requirement-id",
                "REQ-001",
                "--packet-id",
                "pkt-001",
                "--description",
                "MVP flow has supporting evidence.",
                "--status",
                "approved",
                "--idempotency-key",
                "acceptance-ac-001",
            )
            self._run(
                tmp,
                "artifact-register",
                "--artifact-id",
                "art-001",
                "--artifact-type",
                "test",
                "--path",
                "tests/integration/test_first_low_risk_packet_flow.py",
                "--owner",
                "dev-1",
                "--lifecycle-status",
                "active",
                "--source-reference",
                "integration-test",
                "--packet-id",
                "pkt-001",
                "--idempotency-key",
                "artifact-art-001",
            )
            self._run(
                tmp,
                "evidence-register",
                "--evidence-id",
                "ev-001",
                "--packet-id",
                "pkt-001",
                "--command-or-tool",
                "python -m unittest",
                "--runner",
                "unittest",
                "--cwd-or-execution-context",
                str(ROOT),
                "--environment-fingerprint",
                "python-test",
                "--artifact-path",
                "tests/integration/test_first_low_risk_packet_flow.py",
                "--content",
                "Ran MVP integration flow",
                "--result-status",
                "passed",
                "--rationale",
                "integration evidence",
                "--idempotency-key",
                "evidence-ev-001",
            )
            self._run(
                tmp,
                "claim-record",
                "--claim-id",
                "claim-001",
                "--packet-id",
                "pkt-001",
                "--requirement-id",
                "REQ-001",
                "--acceptance-criterion-id",
                "ac-001",
                "--evidence-ids",
                "ev-001",
                "--support-status",
                "supported",
                "--idempotency-key",
                "claim-001",
            )
            self._run(
                tmp,
                "gate-declare",
                "--gate-id",
                "gate-001",
                "--packet-id",
                "pkt-001",
                "--gate-type",
                "evidence",
                "--requirement-level",
                "hard",
                "--declared-by-source",
                "packet",
                "--idempotency-key",
                "gate-declare-001",
            )
            self._run(
                tmp,
                "gate-activate",
                "--gate-activation-id",
                "gact-001",
                "--gate-id",
                "gate-001",
                "--packet-id",
                "pkt-001",
                "--idempotency-key",
                "gate-activate-001",
            )
            readiness = self._run(tmp, "readiness", "--packet-id", "pkt-001")
            self.assertEqual(readiness["readiness"]["status"], "ready")
            self._run(
                tmp,
                "gate-record",
                "--gate-result-id",
                "gres-001",
                "--gate-id",
                "gate-001",
                "--packet-id",
                "pkt-001",
                "--checked-claim-ids",
                "claim-001",
                "--evidence-ids",
                "ev-001",
                "--status",
                "pass",
                "--requirement-level",
                "hard",
                "--rationale",
                "supported by passed evidence",
                "--idempotency-key",
                "gate-result-001",
            )
            self._run(
                tmp,
                "closeout",
                "--closeout-id",
                "close-001",
                "--packet-id",
                "pkt-001",
                "--authority-basis",
                "integration test",
                "--rationale",
                "close completed MVP flow",
                "--idempotency-key",
                "closeout-001",
            )
            context = self._run(tmp, "context", "--packet-id", "pkt-001")

            store = HarnessStore(Path(tmp))
            self.assertEqual(PacketService(store).get_packet("pkt-001")["lifecycle_state"], "closed")
            self.assertEqual(EvidenceService(store).get_evidence("ev-001")["result_status"], "passed")
            self.assertEqual(EvidenceService(store).get_claim("claim-001")["support_status"], "supported")
            self.assertEqual(GateService(store).get_gate_result("gres-001")["status"], "pass")
            self.assertEqual(CloseoutService(store).get_closeout("close-001")["decision_status"], "closed")
            self.assertEqual(context["projection"]["freshness_status"], "fresh")
            self.assertEqual(
                CurrentContextProjection(store).freshness(context["projection"])["freshness_status"],
                "fresh",
            )

    def _run(self, harness_root: str, command: str, *args: str) -> dict[str, object]:
        result = subprocess.run(
            [
                sys.executable,
                str(CLI),
                "--json",
                "--harness-root",
                harness_root,
                command,
                *args,
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["status"], "ok", payload)
        return payload


if __name__ == "__main__":
    unittest.main()
