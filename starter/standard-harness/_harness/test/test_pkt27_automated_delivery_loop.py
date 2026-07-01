from __future__ import annotations

import io
import hashlib
import json
import sys
import tempfile
import textwrap
import unittest
from contextlib import redirect_stdout
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.cli.main import main as harness_main
from standard_harness.state.store import HarnessStore
from standard_harness.workflow.conductor import ConductorLedger
from standard_harness.workflow.conductor_worker_e2e import ConductorWorkerE2ERunner
from standard_harness.workflow.provider_orchestration import ProviderOrchestrationLedger


class PKT27AutomatedDeliveryLoopTests(unittest.TestCase):
    def test_automatic_mode_runs_workers_persists_evidence_and_routes_next_step(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worker = self._write_worker(root)
            descriptor = self._automatic_descriptor(root, worker)

            result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-27",
                mode="automatic",
                real_cli_approval=True,
                cli_available=True,
                command_descriptor=descriptor,
            )

            self.assertEqual(result["status"], "automatic_execution_pass")
            self.assertEqual(result["deliveryLoopReadiness"], "automatic_execution_pass")
            self.assertEqual(result["productizationEvidence"], True)
            self.assertEqual(result["realCliEvidenceStatus"], "automatic_execution_pass")
            self.assertEqual(len(result["workerRuns"]), 1)
            self.assertEqual(len(result["verifierRuns"]), 1)
            self.assertEqual(result["workerRuns"][0]["provider"], "codex")
            self.assertEqual(result["verifierRuns"][0]["provider"], "claude_code")
            self.assertTrue(result["evidenceRefs"])
            self.assertTrue(result["outputEnvelopeRefs"])
            self.assertEqual(result["adjudication"]["truth_claim"], False)
            self.assertEqual(result["authorityBoundary"]["approvalStateMutationAllowed"], False)
            self.assertEqual(result["nextRoute"], "Tester")

            provider_runs = ProviderOrchestrationLedger(HarnessStore(root)).query_runs(packet_id="PKT-27")
            adjudications = ConductorLedger(HarnessStore(root)).query(
                "conductor.adjudication_recorded",
                packet_id="PKT-27",
            )
            self.assertEqual(len(provider_runs), 2)
            self.assertEqual(provider_runs[0]["status"], "evidence_recorded")
            self.assertTrue(adjudications)
            self.assertGreater(
                adjudications[0]["trace_event_seq"],
                max(run["trace_event_seq"] for run in provider_runs),
            )

    def test_captured_output_and_fixture_modes_are_not_normal_delivery_loop_readiness(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            captured = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-27",
                mode="real-smoke",
                real_cli_approval=True,
                cli_available=True,
                command_descriptor=self._captured_descriptor(root),
            )
            fixture = ConductorWorkerE2ERunner(root).run(packet_id="PKT-27", mode="fixture")

            self.assertEqual(captured["status"], "captured_output_recovery_only")
            self.assertEqual(captured["deliveryLoopReadiness"], "captured_output_recovery_only")
            self.assertEqual(captured["productizationEvidence"], False)
            self.assertIn("captured_output_recovery_only", captured["diagnostic_ids"])
            self.assertEqual(fixture["status"], "pass")
            self.assertEqual(fixture["deliveryLoopReadiness"], "fixture_only")
            self.assertEqual(fixture["productizationEvidence"], False)
            self.assertIn("fixture_only_not_delivery_loop_evidence", fixture["diagnostic_ids"])

    def test_cli_exposes_automatic_mode_json_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worker = self._write_worker(root)
            output = io.StringIO()
            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        tmp,
                        "conductor-worker-e2e",
                        "--packet",
                        "PKT-27",
                        "--mode",
                        "automatic",
                        "--real-cli-approval",
                        "--cli-available",
                        "--command-descriptor-json",
                        json.dumps(self._automatic_descriptor(root, worker)),
                    ]
                )

            payload = json.loads(output.getvalue())
            result = payload["conductorWorkerE2E"]
            self.assertEqual(exit_code, 0)
            self.assertEqual(result["status"], "automatic_execution_pass")
            self.assertEqual(result["deliveryLoopReadiness"], "automatic_execution_pass")
            self.assertEqual(result["productizationEvidence"], True)
            self.assertIn("workerRuns", result)
            self.assertIn("verifierRuns", result)
            self.assertIn("authorityBoundary", result)

    def test_automatic_mode_rejects_worker_command_artifact_escape(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worker = self._write_worker(root)
            descriptor = self._automatic_descriptor(root, worker)
            descriptor["workerCommands"]["Developer"]["argv"] = [
                sys.executable,
                str(worker),
                "--artifact",
                str(root / "_ops" / "authority" / "approval-ledger.json"),
                "--role",
                "Developer",
            ]
            descriptor["workerCommands"]["Developer"]["declared_artifacts"] = [
                str(root / "_ops" / "authority" / "approval-ledger.json")
            ]

            result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-27",
                mode="automatic",
                real_cli_approval=True,
                cli_available=True,
                command_descriptor=descriptor,
            )

            self.assertEqual(result["status"], "automatic_execution_blocked")
            self.assertIn("worker_artifact_outside_root", result["diagnostic_ids"])

    def test_automatic_mode_builds_codex_and_claude_commands_from_worker_prompts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fake_provider = self._write_fake_provider_cli(root)
            descriptor = self._automatic_prompt_descriptor(root, fake_provider)

            result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-27",
                mode="automatic",
                real_cli_approval=True,
                cli_available=True,
                command_descriptor=descriptor,
            )

            self.assertEqual(result["status"], "automatic_execution_pass")
            self.assertEqual(result["workerRuns"][0]["provider"], "codex")
            self.assertEqual(result["verifierRuns"][0]["provider"], "claude_code")
            artifacts = {
                artifact["path"]
                for run in [*result["workerRuns"], *result["verifierRuns"]]
                for artifact in run["outputEnvelope"]["artifact_manifest"]
            }
            self.assertIn("_ops/worker-artifacts/developer-codex-output.txt", artifacts)
            self.assertIn("_ops/worker-artifacts/reviewer-claude_code-output.txt", artifacts)

    def test_automatic_mode_rejects_unapproved_provider_cli_override(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fake_provider = self._write_fake_provider_cli(root)
            descriptor = self._automatic_prompt_descriptor(root, fake_provider)
            descriptor.pop("approvedProviderExecutables")

            result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-27",
                mode="automatic",
                real_cli_approval=True,
                cli_available=True,
                command_descriptor=descriptor,
            )

            self.assertEqual(result["status"], "automatic_execution_blocked")
            self.assertIn("provider_cli_executable_not_approved", result["diagnostic_ids"])

    def _automatic_descriptor(self, root: Path, worker: Path) -> dict[str, object]:
        return {
            "approved_packet_boundary": True,
            "explicit_local_configuration": True,
            "authenticated_outside_repo": True,
            "cancel_supported": True,
            "non_interactive_capture": True,
            "input_snapshot_current": True,
            "timeout_seconds": 5,
            "approved_executables": [sys.executable],
            "artifact_root": str(root / "_ops" / "worker-artifacts"),
            "providerTopology": self._provider_topology(),
            "workerCommands": {
                "Developer": {
                    "argv": [
                        sys.executable,
                        str(worker),
                        "--artifact",
                        str(root / "_ops" / "worker-artifacts" / "developer.json"),
                        "--role",
                        "Developer",
                    ],
                },
                "Reviewer:reviewer_a": {
                    "argv": [
                        sys.executable,
                        str(worker),
                        "--artifact",
                        str(root / "_ops" / "worker-artifacts" / "reviewer.json"),
                        "--role",
                        "Reviewer",
                    ],
                },
            },
        }

    def _automatic_prompt_descriptor(self, root: Path, fake_provider: Path) -> dict[str, object]:
        return {
            "approved_packet_boundary": True,
            "explicit_local_configuration": True,
            "authenticated_outside_repo": True,
            "cancel_supported": True,
            "non_interactive_capture": True,
            "input_snapshot_current": True,
            "timeout_seconds": 30,
            "artifact_root": str(root / "_ops" / "worker-artifacts"),
            "approvedProviderExecutables": [sys.executable],
            "providerCli": {
                "codex": [sys.executable, str(fake_provider), "codex"],
                "claude_code": [sys.executable, str(fake_provider), "claude_code"],
            },
            "providerOptions": {
                "claude_code": {
                    "bare": True,
                    "allowedTools": "Read,Edit,Bash(git *)",
                    "permissionMode": "acceptEdits",
                    "maxTurns": 10,
                    "maxBudgetUsd": 0.5,
                }
            },
            "providerTopology": self._provider_topology(),
            "workerPrompts": {
                "Developer": "Return PKT27 fake Codex developer output.",
                "Reviewer:reviewer_a": "Return PKT27 fake Claude reviewer output.",
            },
        }

    def _captured_descriptor(self, root: Path) -> dict[str, object]:
        capture = {
            "trusted_harness_capture": True,
            "records": [
                self._capture_record("Developer", "codex", "codex-cli-local"),
                self._capture_record(
                    "Reviewer",
                    "claude_code",
                    "claude-code-local",
                    reviewer_id="reviewer_a",
                    review_lens="code_quality_review",
                ),
            ],
        }
        capture_path = root / "_ops" / "capture" / "PKT-27" / "capture.json"
        capture_path.parent.mkdir(parents=True, exist_ok=True)
        capture_text = json.dumps(capture, indent=2, sort_keys=True)
        capture_path.write_text(capture_text, encoding="utf-8")
        return {
            "argv": [sys.executable, "-c", "print('captured')"],
            "shell": False,
            "timeout_seconds": 120,
            "cancel_supported": True,
            "non_interactive_capture": True,
            "input_snapshot_current": True,
            "explicit_local_configuration": True,
            "authenticated_outside_repo": True,
            "captured_output": {
                "source": "harness_capture_artifact",
                "capture_artifact_ref": "_ops/capture/PKT-27/capture.json",
                "capture_artifact_sha256": "sha256:" + hashlib.sha256(
                    capture_text.encode("utf-8")
                ).hexdigest(),
            },
            "providerTopology": self._provider_topology(),
        }

    def _provider_topology(self) -> dict[str, object]:
        return {
            "projectTopology": {
                "conductor": {"provider": "codex", "adapterId": "codex-cli-local"}
            },
            "packetTopology": {
                "roles": {
                    "developer": {"provider": "codex", "adapterId": "codex-cli-local"},
                    "reviewer": {
                        "provider": "claude_code",
                        "adapterId": "claude-code-local",
                        "reviewerId": "reviewer_a",
                        "reviewLens": "code_quality_review",
                    },
                },
                "workerAliases": {
                    "worker1": {"role": "developer"},
                    "worker2": {"role": "reviewer", "reviewerId": "reviewer_a"},
                },
            },
        }

    def _capture_record(
        self,
        role: str,
        provider: str,
        adapter_id: str,
        *,
        reviewer_id: str | None = None,
        review_lens: str | None = None,
    ) -> dict[str, object]:
        return {
            "role": role,
            "provider": provider,
            "adapter_id": adapter_id,
            **({"reviewer_id": reviewer_id} if reviewer_id else {}),
            **({"review_lens": review_lens} if review_lens else {}),
            "argv": [provider, "captured", "--json"],
            "shell": False,
            "exit_code": 0,
            "result_status": "passed",
            "timeout": False,
            "cancel_status": "not_requested",
            "stdout_sha256": f"sha256:{provider}-stdout",
            "stderr_sha256": f"sha256:{provider}-stderr",
            "artifact": {"kind": "implementation", "content": {"provider": provider}},
            "evidence_id": f"PKT-27:{provider}:captured-cli-evidence",
        }

    def _write_worker(self, root: Path) -> Path:
        worker = root / "automatic_worker.py"
        worker.write_text(
            textwrap.dedent(
                """
                from __future__ import annotations
                import argparse
                import json
                from pathlib import Path

                parser = argparse.ArgumentParser()
                parser.add_argument("--artifact", required=True)
                parser.add_argument("--role", required=True)
                args = parser.parse_args()
                payload = {
                    "role": args.role,
                    "result": "ok",
                    "truthClaim": False,
                    "approvalStateMutationAllowed": False,
                }
                path = Path(args.artifact)
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(payload, sort_keys=True), encoding="utf-8")
                print(json.dumps({"role": args.role, "status": "passed"}))
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        return worker

    def _write_fake_provider_cli(self, root: Path) -> Path:
        fake = root / "fake_provider_cli.py"
        fake.write_text(
            textwrap.dedent(
                """
                from __future__ import annotations
                import sys
                from pathlib import Path

                provider = sys.argv[1]
                args = sys.argv[2:]
                if provider == "codex":
                    output = Path(args[args.index("-o") + 1])
                    output.parent.mkdir(parents=True, exist_ok=True)
                    output.write_text("PKT27_BUILTIN_CODEX_ADAPTER_OK", encoding="utf-8")
                    print("codex fake ok")
                    raise SystemExit(0)
                if provider == "claude_code":
                    assert "--output-format" in args
                    assert "json" in args
                    assert "--bare" in args
                    assert "--allowedTools" in args
                    assert "--permission-mode" in args
                    assert "--max-turns" in args
                    assert "--max-budget-usd" in args
                    print('{"result":"PKT27_BUILTIN_CLAUDE_CODE_ADAPTER_OK","cost_usd":0.01,"duration_ms":1,"num_turns":1,"session_id":"fake-session"}')
                    raise SystemExit(0)
                raise SystemExit(2)
                """
            ).strip(),
            encoding="utf-8",
        )
        return fake


if __name__ == "__main__":
    unittest.main()
