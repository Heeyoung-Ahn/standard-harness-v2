from __future__ import annotations

import json
import sys
import tempfile
import textwrap
import time
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.workflow.worker_executor import WorkerExecutionRequest
from standard_harness.workflow.worker_executor import WorkerExecutor


class WorkerExecutorTests(unittest.TestCase):
    def test_invokes_safe_worker_and_persists_structured_envelope(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worker = self._write_worker(root, "fake_worker.py")
            artifact_path = root / "_ops" / "worker-artifacts" / "developer.json"
            request = WorkerExecutionRequest(
                packet_id="PKT-27",
                run_id="PKT-27:developer:auto",
                role="Developer",
                provider="codex",
                adapter_id="codex-cli-local",
                argv=[
                    sys.executable,
                    str(worker),
                    "--artifact",
                    str(artifact_path),
                    "--role",
                    "Developer",
                ],
                approved_executables=[sys.executable],
                permission_roots=[root],
                artifact_root=root / "_ops" / "worker-artifacts",
                evidence_root=root / "_ops" / "evidence" / "PKT-27" / "worker-executor",
                input_snapshot_hash="sha256:input",
                timeout_seconds=5,
            )

            result = WorkerExecutor(root).execute(request)

            self.assertEqual(result["status"], "automatic_execution_pass")
            self.assertEqual(result["exitCode"], 0)
            self.assertEqual(result["timeout"], False)
            self.assertEqual(result["cancelStatus"], "not_requested")
            self.assertEqual(result["provider"], "codex")
            self.assertEqual(result["role"], "Developer")
            self.assertTrue((root / result["envelopePath"]).is_file())
            self.assertTrue((root / result["stdoutPath"]).is_file())
            self.assertTrue((root / result["stderrPath"]).is_file())
            envelope = result["outputEnvelope"]
            self.assertEqual(envelope["input_snapshot_hash"], "sha256:input")
            self.assertEqual(envelope["permission_roots"], ["."])
            self.assertEqual(envelope["evidence_provenance"]["execution_mode"], "local_subscription_cli")
            self.assertEqual(envelope["evidence_provenance"]["worker_execution"], "automatic_subprocess")
            self.assertEqual(envelope["evidence_provenance"]["result_status"], "passed")
            self.assertEqual(envelope["evidence_provenance"]["captured_exit_code"], 0)
            self.assertEqual(envelope["evidence_provenance"]["provider"], "codex")
            self.assertEqual(envelope["evidence_provenance"]["role"], "Developer")
            self.assertEqual(envelope["artifact_manifest"][0]["path"], "_ops/worker-artifacts/developer.json")
            self.assertRegex(envelope["artifact_manifest"][0]["sha256"], r"^[0-9a-f]{64}$")
            self.assertNotIn(str(root), json.dumps(envelope))
            self.assertEqual(json.loads(artifact_path.read_text(encoding="utf-8"))["role"], "Developer")

    def test_rejects_unsafe_or_unapproved_command_descriptors_before_execution(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worker = self._write_worker(root, "fake_worker.py")
            cases = {
                "shell": {"shell": True, "diagnostic": "unsafe_command_descriptor"},
                "pipe": {"argv": [sys.executable, str(worker), "review | tee out"], "diagnostic": "unsafe_command_descriptor"},
                "missing_timeout": {"timeout_seconds": None, "diagnostic": "worker_timeout_required"},
                "unapproved_executable": {"approved_executables": [], "diagnostic": "worker_executable_not_approved"},
                "artifact_escape": {
                    "artifact_root": root / "_ops" / "worker-artifacts",
                    "declared_artifacts": [root.parent / "outside.json"],
                    "diagnostic": "worker_artifact_outside_root",
                },
            }
            for name, override in cases.items():
                with self.subTest(name=name):
                    request = self._request(root, worker, **override)

                    result = WorkerExecutor(root).execute(request)

                    self.assertEqual(result["status"], "automatic_execution_blocked")
                    self.assertIn(override["diagnostic"], result["diagnostic_ids"])

    def test_timeout_and_secret_output_are_blocked_evidence_not_passes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            timeout_worker = self._write_worker(root, "timeout_worker.py", sleep_seconds=2)
            secret_worker = self._write_worker(root, "secret_worker.py", stdout_text="sk-test-secret")
            timeout_secret_worker = self._write_worker(
                root,
                "timeout_secret_worker.py",
                sleep_seconds=2,
                stdout_text="sk-timeout-secret",
                print_before_sleep=True,
            )

            timeout_result = WorkerExecutor(root).execute(
                self._request(root, timeout_worker, timeout_seconds=1)
            )
            secret_result = WorkerExecutor(root).execute(self._request(root, secret_worker))
            timeout_secret_result = WorkerExecutor(root).execute(
                self._request(root, timeout_secret_worker, timeout_seconds=1)
            )

            self.assertEqual(timeout_result["status"], "automatic_execution_timeout")
            self.assertIn("worker_timeout_not_pass", timeout_result["diagnostic_ids"])
            self.assertEqual(secret_result["status"], "automatic_execution_blocked")
            self.assertIn("worker_output_secret_rejected", secret_result["diagnostic_ids"])
            self.assertNotIn(
                "sk-test-secret",
                (root / secret_result["stdoutPath"]).read_text(encoding="utf-8"),
            )
            self.assertEqual(timeout_secret_result["status"], "automatic_execution_blocked")
            self.assertIn("worker_output_secret_rejected", timeout_secret_result["diagnostic_ids"])
            self.assertNotIn(
                "sk-timeout-secret",
                (root / timeout_secret_result["stdoutPath"]).read_text(encoding="utf-8"),
            )

    def test_root_development_path_output_is_blocked_evidence_not_pass(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            path_leak_worker = self._write_worker(
                root,
                "path_leak_worker.py",
                stdout_text=f"debug harness root: {root}",
            )

            result = WorkerExecutor(root).execute(self._request(root, path_leak_worker))

            self.assertEqual(result["status"], "automatic_execution_blocked")
            self.assertIn("worker_output_secret_rejected", result["diagnostic_ids"])
            self.assertNotIn(str(root), (root / result["stdoutPath"]).read_text(encoding="utf-8"))

    def test_secret_artifact_content_is_redacted_after_rejection(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            artifact_secret_worker = root / "artifact_secret_worker.py"
            artifact_secret_worker.write_text(
                textwrap.dedent(
                    """
                    from __future__ import annotations
                    import argparse
                    from pathlib import Path

                    parser = argparse.ArgumentParser()
                    parser.add_argument("--artifact", required=True)
                    parser.add_argument("--role", default="Developer")
                    args = parser.parse_args()
                    artifact = Path(args.artifact)
                    artifact.parent.mkdir(parents=True, exist_ok=True)
                    artifact.write_text("sk-artifact-secret", encoding="utf-8")
                    print("worker completed")
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )
            artifact_path = root / "_ops" / "worker-artifacts" / "developer.json"

            result = WorkerExecutor(root).execute(self._request(root, artifact_secret_worker))

            self.assertEqual(result["status"], "automatic_execution_blocked")
            self.assertIn("worker_output_secret_rejected", result["diagnostic_ids"])
            self.assertNotIn("sk-artifact-secret", artifact_path.read_text(encoding="utf-8"))
            self.assertIn("redacted", artifact_path.read_text(encoding="utf-8"))

    def test_worker_side_effect_outside_artifact_root_is_blocked(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            outside_path = root / "_ops" / "authority" / "approval-ledger.json"
            side_effect_worker = self._write_worker(
                root,
                "side_effect_worker.py",
                extra_write_path=outside_path,
            )

            result = WorkerExecutor(root).execute(self._request(root, side_effect_worker))

            self.assertEqual(result["status"], "automatic_execution_blocked")
            self.assertIn("worker_side_effect_outside_artifact_root", result["diagnostic_ids"])
            self.assertIn("worker_side_effect_new_file_removed", result["diagnostic_ids"])
            self.assertFalse(outside_path.exists())

    def test_allowed_change_roots_are_recovered_as_worktree_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_root = root / "src"
            source_root.mkdir()
            changed_file = source_root / "feature.py"
            change_worker = self._write_worker(
                root,
                "change_worker.py",
                extra_write_path=changed_file,
            )

            result = WorkerExecutor(root).execute(
                self._request(root, change_worker, allowed_change_roots=[source_root])
            )

            self.assertEqual(result["status"], "automatic_execution_pass")
            changes = result["outputEnvelope"]["evidence_provenance"]["worktree_changes"]
            self.assertIn({"path": "src/feature.py", "status": "added"}, changes)
            self.assertTrue(changed_file.exists())

    def test_adapter_unavailable_diagnostic_is_promoted_to_tool_unavailable(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            unavailable_worker = root / "unavailable_worker.py"
            unavailable_worker.write_text(
                "import json\nprint(json.dumps({'diagnostic':'claude_code_cli_unavailable'}))\nraise SystemExit(127)\n",
                encoding="utf-8",
            )

            result = WorkerExecutor(root).execute(self._request(root, unavailable_worker))

            self.assertEqual(result["status"], "tool_unavailable")
            self.assertIn("claude_code_cli_unavailable", result["diagnostic_ids"])

    def test_provider_examples_build_safe_descriptors_or_tool_unavailable_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            worker = self._write_worker(root, "fake_worker.py")
            executor = WorkerExecutor(root)

            codex = executor.provider_descriptor(
                provider="codex",
                role="Developer",
                executable=str(worker),
                approved_executables=[str(worker)],
                timeout_seconds=5,
            )
            claude_unavailable = executor.provider_descriptor(
                provider="claude_code",
                role="Reviewer",
                executable=str(root / "missing-claude"),
                approved_executables=[],
                timeout_seconds=5,
            )

            self.assertEqual(codex["status"], "descriptor_ready")
            self.assertEqual(codex["provider"], "codex")
            self.assertEqual(codex["product_identity"], False)
            self.assertEqual(claude_unavailable["status"], "tool_unavailable")
            self.assertEqual(claude_unavailable["provider"], "claude_code")
            self.assertEqual(claude_unavailable["product_identity"], False)

    def _request(self, root: Path, worker: Path, **override: object) -> WorkerExecutionRequest:
        artifact_path = root / "_ops" / "worker-artifacts" / "developer.json"
        return WorkerExecutionRequest(
            packet_id="PKT-27",
            run_id=f"PKT-27:developer:{time.time_ns()}",
            role="Developer",
            provider="codex",
            adapter_id="codex-cli-local",
            argv=override.get("argv", [sys.executable, str(worker), "--artifact", str(artifact_path), "--role", "Developer"]),
            approved_executables=override.get("approved_executables", [sys.executable]),
            permission_roots=[root],
            artifact_root=override.get("artifact_root", root / "_ops" / "worker-artifacts"),
            evidence_root=root / "_ops" / "evidence" / "PKT-27" / "worker-executor",
            input_snapshot_hash="sha256:input",
            timeout_seconds=override.get("timeout_seconds", 5),
            shell=bool(override.get("shell", False)),
            declared_artifacts=override.get("declared_artifacts"),
            allowed_change_roots=override.get("allowed_change_roots"),
        )

    def _write_worker(
        self,
        root: Path,
        name: str,
        *,
        sleep_seconds: int = 0,
        stdout_text: str = "worker completed",
        extra_write_path: Path | None = None,
        print_before_sleep: bool = False,
    ) -> Path:
        worker = root / name
        extra_write = ""
        if extra_write_path is not None:
            extra_write = (
                f"\n                extra = Path({str(extra_write_path)!r})"
                "\n                extra.parent.mkdir(parents=True, exist_ok=True)"
                "\n                extra.write_text('{\"approvalStateMutationAllowed\": true}', encoding=\"utf-8\")"
            )
        worker.write_text(
            textwrap.dedent(
                f"""
                from __future__ import annotations
                import argparse
                import json
                import time

                parser = argparse.ArgumentParser()
                parser.add_argument("--artifact", required=True)
                parser.add_argument("--role", default="Developer")
                args = parser.parse_args()
                {"print(" + repr(stdout_text) + ", flush=True)" if print_before_sleep else ""}
                time.sleep({sleep_seconds})
                artifact = {{
                    "role": args.role,
                    "result": "implemented",
                    "truthClaim": False,
                    "approvalStateMutationAllowed": False,
                }}
                from pathlib import Path
                path = Path(args.artifact)
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(artifact, sort_keys=True), encoding="utf-8")
                {extra_write}
                {"pass" if print_before_sleep else "print(" + repr(stdout_text) + ")"}
                """
            ).strip()
            + "\n",
            encoding="utf-8",
        )
        return worker


if __name__ == "__main__":
    unittest.main()
