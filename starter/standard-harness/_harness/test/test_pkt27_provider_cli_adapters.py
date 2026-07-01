from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.workflow import claude_code_cli_adapter
from standard_harness.workflow import codex_cli_adapter


class ProviderCliAdapterScenarioTests(unittest.TestCase):
    def test_codex_adapter_routes_and_recovers_results_for_product_scenarios(self) -> None:
        scenarios = [
            {
                "name": "codex_plan_read_only_final_message",
                "role": "Planner",
                "options": {"sandbox": "read-only", "askForApproval": "never"},
                "expects": ["exec", "--ephemeral", "--sandbox", "read-only", "--ask-for-approval", "never"],
            },
            {
                "name": "codex_implementation_workspace_write",
                "role": "Developer",
                "options": {"sandbox": "workspace-write", "askForApproval": "never"},
                "expects": ["--sandbox", "workspace-write"],
            },
            {
                "name": "codex_review_model_override",
                "role": "Reviewer",
                "options": {"model": "gpt-5-codex", "sandbox": "read-only"},
                "expects": ["--model", "gpt-5-codex"],
            },
            {
                "name": "codex_testing_profile_override",
                "role": "Tester",
                "options": {"profile": "pkt27-test", "sandbox": "read-only"},
                "expects": ["--profile", "pkt27-test"],
            },
            {
                "name": "codex_json_contract_schema",
                "role": "Developer",
                "options": {"outputSchema": "schema.json", "requireJson": True},
                "artifact_text": '{"status":"passed"}',
                "expects": ["--output-schema", "schema.json"],
            },
            {
                "name": "codex_jsonl_event_capture",
                "role": "Reviewer",
                "options": {"jsonEvents": True},
                "expects": ["--json"],
            },
            {
                "name": "codex_ignore_local_user_config",
                "role": "Tester",
                "options": {"ignoreUserConfig": True, "ignoreRules": True},
                "expects": ["--ignore-user-config", "--ignore-rules"],
            },
            {
                "name": "codex_on_request_approval_boundary",
                "role": "Developer",
                "options": {"sandbox": "workspace-write", "askForApproval": "on-request"},
                "expects": ["--ask-for-approval", "on-request"],
            },
            {
                "name": "codex_provider_argv_override",
                "role": "Developer",
                "provider_argv": [sys.executable, "fake-codex.py"],
                "options": {"sandbox": "read-only"},
                "expects": [sys.executable, "fake-codex.py", "exec"],
            },
            {
                "name": "codex_metadata_sidecar",
                "role": "Reviewer",
                "options": {"sandbox": "read-only"},
                "expects_metadata": True,
            },
        ]

        for scenario in scenarios:
            with self.subTest(scenario=scenario["name"]), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                artifact = root / "artifact.txt"
                captured: dict[str, list[str]] = {}

                def fake_run(command: list[str], **_: object) -> SimpleNamespace:
                    captured["command"] = command
                    output = Path(command[command.index("-o") + 1])
                    output.write_text(str(scenario.get("artifact_text", "PKT27_CODEX_OK")), encoding="utf-8")
                    return SimpleNamespace(returncode=0, stdout="raw provider stdout", stderr="raw provider stderr")

                with patch.object(codex_cli_adapter.subprocess, "run", side_effect=fake_run):
                    exit_code = codex_cli_adapter.main(
                        [
                            "--role",
                            str(scenario["role"]),
                            "--artifact",
                            str(artifact),
                            "--prompt",
                            "Perform bounded work.",
                            "--workdir",
                            str(root),
                            "--provider-argv-json",
                            json.dumps(scenario.get("provider_argv", ["codex"])),
                            "--provider-options-json",
                            json.dumps(scenario["options"]),
                        ]
                    )

                self.assertEqual(exit_code, 0)
                command = captured["command"]
                for expected in scenario.get("expects", []):
                    self.assertIn(expected, command)
                self.assertTrue(artifact.is_file())
                if scenario.get("expects_metadata"):
                    metadata = json.loads(artifact.with_suffix(".metadata.json").read_text(encoding="utf-8"))
                    self.assertEqual(metadata["provider"], "codex")
                    self.assertEqual(metadata["status"], "passed")
                    self.assertNotIn("raw provider stderr", json.dumps(metadata))

    def test_codex_adapter_classifies_failure_scenarios(self) -> None:
        failure_scenarios = [
            {
                "name": "codex_invalid_sandbox",
                "options": {"sandbox": "write-everywhere"},
                "expected_exit": 2,
                "patch_run": False,
            },
            {
                "name": "codex_danger_full_access_rejected",
                "options": {"sandbox": "danger-full-access"},
                "expected_exit": 2,
                "patch_run": False,
            },
            {
                "name": "codex_invalid_approval",
                "options": {"askForApproval": "always"},
                "expected_exit": 2,
                "patch_run": False,
            },
            {
                "name": "codex_nonzero",
                "options": {},
                "expected_exit": 7,
                "returncode": 7,
            },
            {
                "name": "codex_unavailable",
                "options": {},
                "expected_exit": 127,
                "raises": OSError("missing"),
            },
            {
                "name": "codex_json_required_but_invalid",
                "options": {"requireJson": True},
                "expected_exit": 1,
                "artifact_text": "not json",
            },
        ]

        for scenario in failure_scenarios:
            with self.subTest(scenario=scenario["name"]), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                artifact = root / "artifact.txt"

                def fake_run(command: list[str], **_: object) -> SimpleNamespace:
                    if scenario.get("raises"):
                        raise scenario["raises"]
                    Path(command[command.index("-o") + 1]).write_text(
                        str(scenario.get("artifact_text", "PKT27_CODEX_OK")),
                        encoding="utf-8",
                    )
                    return SimpleNamespace(returncode=scenario.get("returncode", 0), stdout="", stderr="")

                patch_run = scenario.get("patch_run", True)
                context = patch.object(codex_cli_adapter.subprocess, "run", side_effect=fake_run)
                with (context if patch_run else _null_context()):
                    exit_code = codex_cli_adapter.main(
                        [
                            "--role",
                            "Developer",
                            "--artifact",
                            str(artifact),
                            "--prompt",
                            "Perform bounded work.",
                            "--workdir",
                            str(root),
                            "--provider-options-json",
                            json.dumps(scenario["options"]),
                        ]
                    )

                self.assertEqual(exit_code, scenario["expected_exit"])

    def test_claude_adapter_routes_and_recovers_results_for_product_scenarios(self) -> None:
        scenarios = [
            {
                "name": "claude_plan_bare_json",
                "role": "Planner",
                "options": {"bare": True, "maxTurns": 3, "maxBudgetUsd": 0.1},
                "expects": ["-p", "--output-format", "json", "--bare"],
            },
            {
                "name": "claude_review_read_only_tools",
                "role": "Reviewer",
                "options": {"allowedTools": "Read", "permissionMode": "dontAsk"},
                "expects": ["--allowedTools", "Read", "--permission-mode", "dontAsk"],
            },
            {
                "name": "claude_implementation_edit_tools",
                "role": "Developer",
                "options": {"allowedTools": "Read,Edit,Bash(git *)", "permissionMode": "acceptEdits"},
                "expects": ["--allowedTools", "Read,Edit,Bash(git *)", "--permission-mode", "acceptEdits"],
            },
            {
                "name": "claude_testing_budget_turn_limit",
                "role": "Tester",
                "options": {"maxTurns": 12, "maxBudgetUsd": 0.25},
                "expects": ["--max-turns", "12", "--max-budget-usd", "0.25"],
            },
            {
                "name": "claude_resume_session",
                "role": "Developer",
                "options": {"resumeSessionId": "session-123"},
                "expects": ["--resume", "session-123"],
            },
            {
                "name": "claude_continue_session",
                "role": "Reviewer",
                "options": {"continueSession": True},
                "expects": ["--continue"],
            },
            {
                "name": "claude_non_bare_project_context",
                "role": "Planner",
                "options": {"bare": False},
                "absent": ["--bare"],
            },
            {
                "name": "claude_provider_argv_override",
                "role": "Tester",
                "provider_argv": [sys.executable, "fake-claude.py"],
                "options": {"bare": True},
                "expects": [sys.executable, "fake-claude.py", "-p"],
            },
            {
                "name": "claude_json_sidecar_cost_session",
                "role": "Reviewer",
                "options": {"bare": True},
                "expects_sidecar": True,
            },
            {
                "name": "claude_default_limits",
                "role": "Developer",
                "options": {},
                "expects": ["--max-turns", "10", "--max-budget-usd", "0.5"],
            },
        ]

        for scenario in scenarios:
            with self.subTest(scenario=scenario["name"]), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                artifact = root / "artifact.txt"
                captured: dict[str, list[str]] = {}

                def fake_run(command: list[str], **_: object) -> SimpleNamespace:
                    captured["command"] = command
                    return SimpleNamespace(
                        returncode=0,
                        stdout=json.dumps(
                            {
                                "result": "PKT27_CLAUDE_OK",
                                "cost_usd": 0.01,
                                "duration_ms": 2,
                                "num_turns": 1,
                                "session_id": "session-abc",
                            }
                        ),
                        stderr="raw provider stderr",
                    )

                with patch.object(claude_code_cli_adapter.subprocess, "run", side_effect=fake_run):
                    exit_code = claude_code_cli_adapter.main(
                        [
                            "--role",
                            str(scenario["role"]),
                            "--artifact",
                            str(artifact),
                            "--prompt",
                            "Perform bounded work.",
                            "--workdir",
                            str(root),
                            "--provider-argv-json",
                            json.dumps(scenario.get("provider_argv", ["claude"])),
                            "--provider-options-json",
                            json.dumps(scenario["options"]),
                        ]
                    )

                self.assertEqual(exit_code, 0)
                command = captured["command"]
                for expected in scenario.get("expects", []):
                    self.assertIn(expected, command)
                for absent in scenario.get("absent", []):
                    self.assertNotIn(absent, command)
                self.assertEqual(artifact.read_text(encoding="utf-8"), "PKT27_CLAUDE_OK")
                if scenario.get("expects_sidecar"):
                    sidecar = json.loads(artifact.with_suffix(".json").read_text(encoding="utf-8"))
                    self.assertEqual(sidecar["session_id"], "session-abc")

    def test_claude_adapter_classifies_failure_scenarios(self) -> None:
        failure_scenarios = [
            {
                "name": "claude_invalid_permission_mode",
                "options": {"permissionMode": "root"},
                "expected_exit": 2,
                "patch_run": False,
            },
            {
                "name": "claude_bypass_permissions_rejected",
                "options": {"permissionMode": "bypassPermissions"},
                "expected_exit": 2,
                "patch_run": False,
            },
            {
                "name": "claude_nonzero",
                "options": {},
                "expected_exit": 9,
                "returncode": 9,
            },
            {
                "name": "claude_unavailable",
                "options": {},
                "expected_exit": 127,
                "raises": OSError("missing"),
            },
            {
                "name": "claude_json_parse_failed",
                "options": {},
                "expected_exit": 1,
                "stdout": "not json",
            },
            {
                "name": "claude_empty_result",
                "options": {},
                "expected_exit": 1,
                "stdout": '{"result":""}',
            },
        ]

        for scenario in failure_scenarios:
            with self.subTest(scenario=scenario["name"]), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                artifact = root / "artifact.txt"

                def fake_run(command: list[str], **_: object) -> SimpleNamespace:
                    if scenario.get("raises"):
                        raise scenario["raises"]
                    return SimpleNamespace(
                        returncode=scenario.get("returncode", 0),
                        stdout=scenario.get("stdout", '{"result":"OK"}'),
                        stderr="",
                    )

                patch_run = scenario.get("patch_run", True)
                context = patch.object(claude_code_cli_adapter.subprocess, "run", side_effect=fake_run)
                with (context if patch_run else _null_context()):
                    exit_code = claude_code_cli_adapter.main(
                        [
                            "--role",
                            "Reviewer",
                            "--artifact",
                            str(artifact),
                            "--prompt",
                            "Perform bounded review.",
                            "--workdir",
                            str(root),
                            "--provider-options-json",
                            json.dumps(scenario["options"]),
                        ]
                    )

                self.assertEqual(exit_code, scenario["expected_exit"])


class _null_context:
    def __enter__(self) -> None:
        return None

    def __exit__(self, *_: object) -> bool:
        return False


if __name__ == "__main__":
    unittest.main()
