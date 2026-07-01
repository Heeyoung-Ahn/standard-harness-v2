"""Safe subprocess adapter for Claude Code CLI worker execution."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any


CLAUDE_PERMISSION_MODES = {
    "default",
    "acceptEdits",
    "plan",
    "auto",
    "dontAsk",
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run a bounded Claude Code CLI worker command.")
    parser.add_argument("--role", required=True)
    parser.add_argument("--artifact", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--workdir", required=True)
    parser.add_argument("--timeout-seconds", type=int, default=120)
    parser.add_argument("--provider-argv-json", default='["claude"]')
    parser.add_argument("--provider-options-json", default="{}")
    args = parser.parse_args(argv)

    artifact = Path(args.artifact).resolve()
    artifact.parent.mkdir(parents=True, exist_ok=True)
    workdir = Path(args.workdir).resolve()
    claude_argv = _provider_argv(args.provider_argv_json)
    options = _provider_options(args.provider_options_json)
    if not claude_argv:
        print(json.dumps({"status": "failed", "diagnostic": "claude_code_argv_missing"}))
        return 2

    command = [
        *claude_argv,
        "-p",
        args.prompt,
        "--output-format",
        "json",
    ]
    if options.get("bare", True) is not False:
        command.append("--bare")
    allowed_tools = options.get("allowedTools") or options.get("allowed_tools")
    if isinstance(allowed_tools, str) and allowed_tools.strip():
        command.extend(["--allowedTools", allowed_tools.strip()])
    permission_mode = options.get("permissionMode") or options.get("permission_mode")
    if isinstance(permission_mode, str) and permission_mode.strip():
        permission_mode = permission_mode.strip()
        if permission_mode not in CLAUDE_PERMISSION_MODES:
            print(json.dumps({"status": "failed", "diagnostic": "claude_code_invalid_permission_mode", "role": args.role}))
            return 2
        command.extend(["--permission-mode", permission_mode])
    resume_session = options.get("resumeSessionId") or options.get("resume_session_id")
    if isinstance(resume_session, str) and resume_session.strip():
        command.extend(["--resume", resume_session.strip()])
    elif options.get("continueSession") is True or options.get("continue_session") is True:
        command.append("--continue")
    max_turns = options.get("maxTurns") or options.get("max_turns") or 10
    max_budget_usd = options.get("maxBudgetUsd") or options.get("max_budget_usd") or 0.5
    command.extend(["--max-turns", str(max_turns), "--max-budget-usd", str(max_budget_usd)])
    try:
        completed = subprocess.run(
            command,
            cwd=str(workdir),
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            timeout=args.timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        print(json.dumps({"status": "failed", "diagnostic": "claude_code_cli_timeout", "role": args.role}))
        return 124
    except OSError as exc:
        print(
            json.dumps(
                {
                    "status": "failed",
                    "diagnostic": "claude_code_cli_unavailable",
                    "role": args.role,
                    "error": exc.__class__.__name__,
                }
            )
        )
        return 127

    if completed.returncode != 0:
        print(
            json.dumps(
                {
                    "status": "failed",
                    "diagnostic": "claude_code_cli_nonzero",
                    "role": args.role,
                    "exitCode": completed.returncode,
                }
            )
        )
        return completed.returncode or 1

    response = _json_response(completed.stdout or "")
    if response is None:
        print(json.dumps({"status": "failed", "diagnostic": "claude_code_json_parse_failed", "role": args.role}))
        return 1
    result_text = response.get("result")
    if not isinstance(result_text, str) or not result_text.strip():
        print(json.dumps({"status": "failed", "diagnostic": "claude_code_cli_empty_output", "role": args.role}))
        return 1
    artifact.write_text(result_text, encoding="utf-8")
    json_artifact = artifact.with_suffix(".json")
    json_artifact.write_text(json.dumps(response, indent=2, sort_keys=True), encoding="utf-8")

    print(
        json.dumps(
            {
                "status": "passed",
                "provider": "claude_code",
                "role": args.role,
                "artifact": artifact.name,
                "jsonArtifact": json_artifact.name,
                "sessionId": response.get("session_id"),
                "costUsd": response.get("cost_usd") or response.get("total_cost_usd"),
                "durationMs": response.get("duration_ms"),
                "numTurns": response.get("num_turns"),
            },
            sort_keys=True,
        )
    )
    return 0


def _provider_argv(value: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list) or not parsed:
        return []
    return [str(item) for item in parsed if isinstance(item, str) and item]


def _provider_options(value: str) -> dict[str, Any]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _json_response(value: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


if __name__ == "__main__":
    raise SystemExit(main())
