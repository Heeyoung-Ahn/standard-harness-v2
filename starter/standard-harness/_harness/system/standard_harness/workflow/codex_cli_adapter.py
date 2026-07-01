"""Safe subprocess adapter for Codex CLI worker execution."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any


CODEX_SANDBOX_VALUES = {"read-only", "workspace-write"}
CODEX_APPROVAL_VALUES = {"untrusted", "on-request", "never"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run a bounded Codex CLI worker command.")
    parser.add_argument("--role", required=True)
    parser.add_argument("--artifact", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--workdir", required=True)
    parser.add_argument("--timeout-seconds", type=int, default=120)
    parser.add_argument("--provider-argv-json", default='["codex"]')
    parser.add_argument("--provider-options-json", default="{}")
    args = parser.parse_args(argv)

    artifact = Path(args.artifact).resolve()
    artifact.parent.mkdir(parents=True, exist_ok=True)
    workdir = Path(args.workdir).resolve()
    codex_argv = _provider_argv(args.provider_argv_json)
    options = _provider_options(args.provider_options_json)
    if not codex_argv:
        return _emit_failure("codex_argv_missing", role=args.role, exit_code=2)

    sandbox = _option_choice(
        options,
        "sandbox",
        allowed=CODEX_SANDBOX_VALUES,
        default="read-only",
    )
    approval = _option_choice(
        options,
        "askForApproval",
        "ask_for_approval",
        allowed=CODEX_APPROVAL_VALUES,
        default="never",
    )
    if sandbox is None:
        return _emit_failure("codex_invalid_sandbox_option", role=args.role, exit_code=2)
    if approval is None:
        return _emit_failure("codex_invalid_approval_option", role=args.role, exit_code=2)

    command = [
        *codex_argv,
        "--ask-for-approval",
        approval,
        "exec",
        "--skip-git-repo-check",
        "--ephemeral",
        "--sandbox",
        sandbox,
        "-C",
        str(workdir),
        "-o",
        str(artifact),
    ]
    if options.get("ignoreUserConfig") is True or options.get("ignore_user_config") is True:
        command.append("--ignore-user-config")
    if options.get("ignoreRules") is True or options.get("ignore_rules") is True:
        command.append("--ignore-rules")
    model = options.get("model")
    if isinstance(model, str) and model.strip():
        command.extend(["--model", model.strip()])
    profile = options.get("profile")
    if isinstance(profile, str) and profile.strip():
        command.extend(["--profile", profile.strip()])
    output_schema = options.get("outputSchema") or options.get("output_schema")
    if isinstance(output_schema, str) and output_schema.strip():
        command.extend(["--output-schema", output_schema.strip()])
    if options.get("jsonEvents") is True or options.get("json_events") is True:
        command.append("--json")
    command.append(args.prompt)

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
        return _emit_failure("codex_cli_timeout", role=args.role, exit_code=124)
    except OSError as exc:
        return _emit_failure(
            "codex_cli_unavailable",
            role=args.role,
            exit_code=127,
            extra={"error": exc.__class__.__name__},
        )

    if completed.returncode != 0:
        return _emit_failure(
            "codex_cli_nonzero",
            role=args.role,
            exit_code=completed.returncode or 1,
            extra={"childExitCode": completed.returncode},
        )
    if not artifact.is_file():
        return _emit_failure("codex_cli_output_missing", role=args.role, exit_code=1)

    result_text = artifact.read_text(encoding="utf-8")
    parsed_result = _json_response(result_text) if options.get("requireJson") is True else None
    if options.get("requireJson") is True and parsed_result is None:
        return _emit_failure("codex_cli_json_parse_failed", role=args.role, exit_code=1)

    metadata = {
        "status": "passed",
        "provider": "codex",
        "role": args.role,
        "artifact": artifact.name,
        "metadataArtifact": artifact.with_suffix(".metadata.json").name,
        "sandbox": sandbox,
        "askForApproval": approval,
        "jsonResult": parsed_result is not None,
        "stdoutSha256": _sha256_text(completed.stdout or ""),
        "stderrSha256": _sha256_text(completed.stderr or ""),
    }
    artifact.with_suffix(".metadata.json").write_text(
        json.dumps(metadata, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    print(json.dumps(metadata, sort_keys=True))
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


def _option_choice(
    options: dict[str, Any],
    *names: str,
    allowed: set[str],
    default: str,
) -> str | None:
    value: Any = None
    for name in names:
        if name in options:
            value = options[name]
            break
    if value is None:
        value = default
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized if normalized in allowed else None


def _json_response(value: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _emit_failure(
    diagnostic: str,
    *,
    role: str,
    exit_code: int,
    extra: dict[str, Any] | None = None,
) -> int:
    payload = {
        "status": "failed",
        "diagnostic": diagnostic,
        "role": role,
    }
    if extra:
        payload.update(extra)
    print(json.dumps(payload, sort_keys=True))
    return exit_code


def _sha256_text(value: str) -> str:
    import hashlib

    return hashlib.sha256(value.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    raise SystemExit(main())
