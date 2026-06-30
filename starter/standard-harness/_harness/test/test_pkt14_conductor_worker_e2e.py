from __future__ import annotations

import hashlib
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
from standard_harness.memory.question_answering import LongMemoryQuestionAnsweringService
from standard_harness.memory.question_answering import LongMemorySourceDiscovery
from standard_harness.memory.question_answering import LongMemorySourceIndexBuilder
from standard_harness.state.replay import StateReplayService
from standard_harness.state.store import HarnessStore
from standard_harness.workflow.conductor_worker_e2e import ConductorWorkerE2ERunner


class ConductorWorkerE2ETests(unittest.TestCase):
    def test_fixture_e2e_records_worker_verifier_adjudication_and_qa_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-14",
                mode="fixture",
            )

            self.assertEqual(result["status"], "pass")
            self.assertEqual(result["mode"], "fixture")
            self.assertEqual(result["selectedRoute"], "cross_llm_worker_verifier")
            self.assertEqual(len(result["workerRuns"]), 1)
            self.assertEqual(len(result["verifierRuns"]), 1)
            self.assertEqual(result["realCliEvidenceStatus"], "not_applicable")
            self.assertFalse(result["authorityBoundary"]["approvalStateMutationAllowed"])
            self.assertFalse(result["adjudication"]["truth_claim"])
            self.assertIn("Tester", result["nextRoute"])
            self.assertTrue((root / "_ops" / "evidence" / "PKT-14" / "conductor-worker-e2e" / "evidence-index.json").is_file())

            replay = StateReplayService(HarnessStore(root)).rebuild_materialized_state()
            self.assertEqual(replay["status"], "rebuilt")
            self.assertEqual(replay["unknown_event_types"], [])

            self._seed_evidence_policy(root)
            sources = LongMemorySourceDiscovery(root).discover()
            index = LongMemorySourceIndexBuilder.from_repo(root).build(sources)
            answer = LongMemoryQuestionAnsweringService().answer(
                index,
                "Did PKT-14 use fixture evidence or real CLI evidence?",
            )
            self.assertEqual(answer["status"], "pass")
            self.assertIn("fixture evidence", answer["answer"])
            self.assertIn("evidence-index.json", json.dumps(answer["sourceRefs"]))
            self.assertFalse((root / "_ops" / "wiki").exists())
            self.assertFalse((root / "_ops" / "friction").exists())
            self.assertFalse((root / "_ops" / "risks").exists())
            self.assertFalse((root / "_ops" / "decisions").exists())

    def test_real_cli_smoke_without_explicit_approval_is_manual_required(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = ConductorWorkerE2ERunner(tmp).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=False,
            )

            self.assertEqual(result["status"], "manual_required")
            self.assertEqual(result["realCliEvidenceStatus"], "manual_required")
            self.assertIn("real_cli_smoke_requires_explicit_approval", result["diagnostic_ids"])
            self.assertEqual(result["workerRuns"], [])
            self.assertEqual(result["verifierRuns"], [])

    def test_unsafe_command_descriptor_blocks_before_provider_execution(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = ConductorWorkerE2ERunner(tmp).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=self._safe_descriptor(["codex", "exec", "$(Get-Content secret.txt)"]),
            )

            self.assertEqual(result["status"], "execution_blocked")
            self.assertEqual(result["realCliEvidenceStatus"], "execution_blocked")
            self.assertIn("unsafe_command_descriptor", result["diagnostic_ids"])
            self.assertIn("untrusted_shell_interpolation", result["diagnostic_ids"])

    def test_real_cli_command_descriptor_negative_matrix_blocks(self) -> None:
        cases = {
            "newline": ["codex", "exec", "review\nnext"],
            "pipe": ["codex", "exec", "review | tee out.txt"],
            "redirect": ["codex", "exec", "review > out.txt"],
            "subshell": ["codex", "exec", "$(Get-Content secret.txt)"],
            "shell_true": ["codex", "exec", "review"],
        }
        with tempfile.TemporaryDirectory() as tmp:
            for name, argv in cases.items():
                with self.subTest(name=name):
                    descriptor = self._safe_descriptor(argv)
                    if name == "shell_true":
                        descriptor["shell"] = True
                    result = ConductorWorkerE2ERunner(tmp).run(
                        packet_id="PKT-14",
                        mode="real-smoke",
                        real_cli_approval=True,
                        command_descriptor=descriptor,
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertEqual(result["realCliEvidenceStatus"], "execution_blocked")
                    self.assertIn("unsafe_command_descriptor", result["diagnostic_ids"])

    def test_real_cli_missing_timeout_or_cancel_precondition_blocks(self) -> None:
        cases = {
            "timeout_seconds": {"timeout_seconds": None},
            "cancel_supported": {"cancel_supported": False},
        }
        with tempfile.TemporaryDirectory() as tmp:
            for expected_missing, overrides in cases.items():
                with self.subTest(expected_missing=expected_missing):
                    descriptor = self._safe_descriptor(["codex", "exec", "--json"])
                    descriptor.update(overrides)
                    result = ConductorWorkerE2ERunner(tmp).run(
                        packet_id="PKT-14",
                        mode="real-smoke",
                        real_cli_approval=True,
                        command_descriptor=descriptor,
                        cli_available=True,
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertEqual(result["realCliEvidenceStatus"], "execution_blocked")
                    self.assertIn("execution_preconditions_missing", result["diagnostic_ids"])
                    self.assertIn(expected_missing, result["diagnostic_ids"])

    def test_real_cli_captured_smoke_records_worker_verifier_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=self._safe_descriptor(["codex", "exec", "--json"], root=root),
                cli_available=True,
            )

            self.assertEqual(result["status"], "pass")
            self.assertEqual(result["mode"], "real-smoke")
            self.assertEqual(result["realCliEvidenceStatus"], "pass")
            self.assertEqual(len(result["workerRuns"]), 1)
            self.assertEqual(len(result["verifierRuns"]), 1)
            self.assertIn("captured-cli-evidence", json.dumps(result["evidenceRefs"]))
            self.assertIn("captured-envelope", json.dumps(result["outputEnvelopeRefs"]))
            evidence_index = root / "_ops" / "evidence" / "PKT-14" / "conductor-worker-e2e" / "evidence-index.json"
            self.assertIn("trusted captured real CLI evidence", evidence_index.read_text(encoding="utf-8"))
            artifacts = list(evidence_index.parent.glob("*-captured-artifact.json"))
            self.assertEqual(len(artifacts), 2)
            self.assertIn("trusted_harness_capture", artifacts[0].read_text(encoding="utf-8"))

    def test_real_cli_capture_records_are_required_per_role_provider(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            descriptor = self._safe_descriptor(
                ["codex", "exec", "--json"],
                root=root,
                records=[self._capture_record("Developer", "codex", "codex-cli-local")],
            )
            result = ConductorWorkerE2ERunner(tmp).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=descriptor,
                cli_available=True,
            )

            self.assertEqual(result["status"], "execution_blocked")
            self.assertIn("captured_output_record_missing:Reviewer:claude_code", result["diagnostic_ids"])

    def test_real_cli_accepts_codex_reviewer_capture_when_explicitly_requested(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            descriptor = self._safe_descriptor(
                ["codex", "exec", "--json"],
                root=root,
                records=[
                    self._capture_record("Developer", "codex", "codex-cli-local"),
                    self._capture_record("Reviewer", "codex", "codex-cli-local"),
                ],
                artifact_name="capture-codex-reviewer.json",
            )
            descriptor["reviewer_provider"] = "codex"

            result = ConductorWorkerE2ERunner(tmp).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=descriptor,
                cli_available=True,
            )

            self.assertEqual(result["status"], "pass")
            self.assertEqual(result["realCliEvidenceStatus"], "pass")
            self.assertEqual(result["verifierRuns"][0]["provider"], "codex")

    def test_real_cli_failed_or_timeout_capture_cannot_pass(self) -> None:
        cases = {
            "captured_output_failed": {"exit_code": 1, "result_status": "failed"},
            "captured_output_timeout": {"timeout": True},
        }
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for expected_diagnostic, overrides in cases.items():
                with self.subTest(expected_diagnostic=expected_diagnostic):
                    records = self._default_capture_records()
                    records[0].update(overrides)
                    descriptor = self._safe_descriptor(
                        ["codex", "exec", "--json"],
                        root=root,
                        records=records,
                    )
                    result = ConductorWorkerE2ERunner(tmp).run(
                        packet_id="PKT-14",
                        mode="real-smoke",
                        real_cli_approval=True,
                        command_descriptor=descriptor,
                        cli_available=True,
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertIn(expected_diagnostic, result["diagnostic_ids"])

    def test_real_cli_rejects_inline_or_sensitive_capture_material(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            inline_descriptor = self._safe_descriptor(["codex", "exec", "--json"])
            inline_result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=inline_descriptor,
                cli_available=True,
            )
            sensitive_records = self._default_capture_records()
            sensitive_records[0]["artifact"]["content"]["api_key"] = "sk-test-secret"
            sensitive_descriptor = self._safe_descriptor(
                ["codex", "exec", "--json"],
                root=root,
                records=sensitive_records,
                artifact_name="sensitive-capture.json",
            )
            sensitive_result = ConductorWorkerE2ERunner(root).run(
                packet_id="PKT-14",
                mode="real-smoke",
                real_cli_approval=True,
                command_descriptor=sensitive_descriptor,
                cli_available=True,
            )

            self.assertEqual(inline_result["status"], "execution_blocked")
            self.assertIn(
                "captured_output_requires_trusted_capture_artifact",
                inline_result["diagnostic_ids"],
            )
            self.assertEqual(sensitive_result["status"], "execution_blocked")
            self.assertTrue(
                any(
                    diagnostic.startswith("sensitive_capture_material")
                    for diagnostic in sensitive_result["diagnostic_ids"]
                )
            )

    def test_packet_id_validation_blocks_path_escape(self) -> None:
        invalid_packet_ids = [
            "../PKT-14",
            "PKT/14",
            "PKT-14\\bad",
            "C:\\tmp\\PKT-14",
            "",
        ]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for packet_id in invalid_packet_ids:
                with self.subTest(packet_id=packet_id):
                    result = ConductorWorkerE2ERunner(root).run(
                        packet_id=packet_id,
                        mode="fixture",
                    )

                    self.assertEqual(result["status"], "execution_blocked")
                    self.assertIn("invalid_packet_id", result["diagnostic_ids"])
            self.assertFalse((root / "_ops" / "evidence").exists())

    def test_cli_exposes_conductor_worker_e2e_json_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = io.StringIO()
            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        tmp,
                        "conductor-worker-e2e",
                        "--packet",
                        "PKT-14",
                        "--mode",
                        "fixture",
                    ]
                )

            payload = json.loads(output.getvalue())
            result = payload["conductorWorkerE2E"]
            self.assertEqual(exit_code, 0)
            self.assertEqual(result["schemaVersion"], "standard-harness-conductor-worker-e2e/v1")
            self.assertEqual(result["packetId"], "PKT-14")
            self.assertIn("selectedConductor", result)
            self.assertIn("outputEnvelopeRefs", result)
            self.assertIn("authorityBoundary", result)

    def _seed_evidence_policy(self, repo_root: Path) -> None:
        self._write(
            repo_root / "_harness/policies/evidence-classification.yaml",
            json.dumps(
                {
                    "classifications": ["PUBLIC", "INTERNAL", "SENSITIVE", "SECRET"],
                    "defaults": {"classification": "INTERNAL"},
                    "promotionRules": {
                        "PUBLIC": {"wikiPromotionAllowed": True, "handoffAllowed": True},
                        "INTERNAL": {"wikiPromotionAllowed": True, "handoffAllowed": True},
                        "SENSITIVE": {"wikiPromotionAllowed": False, "handoffAllowed": False},
                        "SECRET": {"wikiPromotionAllowed": False, "handoffAllowed": False},
                    },
                    "registrationRules": {
                        "SECRET": {"blocked": True, "diagnostic": "secret_evidence_registered"}
                    },
                }
            ),
        )

    @staticmethod
    def _safe_descriptor(
        argv: list[str],
        *,
        root: Path | None = None,
        records: list[dict[str, object]] | None = None,
        artifact_name: str = "capture.json",
    ) -> dict[str, object]:
        capture = {
            "trusted_harness_capture": True,
            "records": records or ConductorWorkerE2ETests._default_capture_records(),
        }
        captured_output: dict[str, object]
        if root is None:
            captured_output = capture
        else:
            capture_path = root / "_ops" / "capture" / "PKT-14" / artifact_name
            capture_path.parent.mkdir(parents=True, exist_ok=True)
            content = json.dumps(capture, indent=2, sort_keys=True)
            capture_path.write_text(content, encoding="utf-8")
            captured_output = {
                "source": "harness_capture_artifact",
                "capture_artifact_ref": "_ops/capture/PKT-14/" + artifact_name,
                "capture_artifact_sha256": "sha256:" + hashlib.sha256(
                    content.encode("utf-8")
                ).hexdigest(),
            }
        return {
            "argv": argv,
            "shell": False,
            "timeout_seconds": 120,
            "cancel_supported": True,
            "non_interactive_capture": True,
            "input_snapshot_current": True,
            "explicit_local_configuration": True,
            "authenticated_outside_repo": True,
            "captured_output": captured_output,
        }

    @staticmethod
    def _default_capture_records() -> list[dict[str, object]]:
        return [
            ConductorWorkerE2ETests._capture_record(
                "Developer", "codex", "codex-cli-local"
            ),
            ConductorWorkerE2ETests._capture_record(
                "Reviewer", "claude_code", "claude-code-local"
            ),
        ]

    @staticmethod
    def _capture_record(role: str, provider: str, adapter_id: str) -> dict[str, object]:
        return {
            "role": role,
            "provider": provider,
            "adapter_id": adapter_id,
            "argv": [provider, "captured", "--json"],
            "shell": False,
            "exit_code": 0,
            "result_status": "passed",
            "timeout": False,
            "cancel_status": "not_requested",
            "stdout_sha256": f"sha256:{provider}-stdout",
            "stderr_sha256": f"sha256:{provider}-stderr",
            "artifact": {
                "kind": "implementation" if role == "Developer" else "review",
                "content": {
                    "source": "trusted_harness_capture",
                    "role": role,
                    "provider": provider,
                },
            },
            "evidence_id": f"PKT-14:{provider}:captured-cli-evidence",
        }

    @staticmethod
    def _write(path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content.strip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
