"""Bounded local worker CLI execution for Conductor-owned delivery loops."""

from __future__ import annotations

import hashlib
import json
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence


UNSAFE_ARG_TOKENS = ("$(", "`", "&&", "||", "|", ";", ">", "<", "\n", "\r")
SECRET_VALUE_TOKENS = (
    "sk-",
    "authorization:",
    "bearer ",
    "api_key=",
    "begin private key",
    ".codex",
    ".claude",
    "cookie:",
    "session_token",
)


@dataclass(frozen=True)
class WorkerExecutionRequest:
    packet_id: str
    run_id: str
    role: str
    provider: str
    adapter_id: str
    argv: Sequence[str]
    approved_executables: Sequence[str]
    permission_roots: Sequence[str | Path]
    artifact_root: str | Path
    evidence_root: str | Path
    input_snapshot_hash: str
    timeout_seconds: int | None
    shell: bool = False
    cancel_supported: bool = True
    declared_artifacts: Sequence[str | Path] | None = None
    allowed_change_roots: Sequence[str | Path] | None = None


class WorkerExecutor:
    """Execute approved local worker commands without shell interpolation."""

    def __init__(self, harness_root: str | Path):
        self.harness_root = Path(harness_root).resolve()

    def execute(self, request: WorkerExecutionRequest) -> dict[str, Any]:
        diagnostics = self._descriptor_diagnostics(request)
        if diagnostics:
            return self._blocked_result(request, diagnostics)

        evidence_root = Path(request.evidence_root).resolve()
        artifact_root = Path(request.artifact_root).resolve()
        evidence_root.mkdir(parents=True, exist_ok=True)
        artifact_root.mkdir(parents=True, exist_ok=True)
        permission_roots = [Path(root).resolve() for root in request.permission_roots]
        allowed_change_roots = [
            Path(root).resolve() for root in request.allowed_change_roots or []
        ]
        allowed_change_snapshot = _file_snapshot(
            allowed_change_roots,
            allowed_roots=[artifact_root, evidence_root],
        )
        side_effect_snapshot = _file_snapshot(
            permission_roots,
            allowed_roots=[artifact_root, evidence_root, *allowed_change_roots],
        )
        started = time.monotonic()
        stdout = ""
        stderr = ""
        exit_code: int | None = None
        timed_out = False
        try:
            completed = subprocess.run(
                list(request.argv),
                cwd=str(self.harness_root),
                shell=False,
                text=True,
                capture_output=True,
                timeout=request.timeout_seconds,
                check=False,
            )
            stdout = completed.stdout or ""
            stderr = completed.stderr or ""
            exit_code = completed.returncode
        except subprocess.TimeoutExpired as exc:
            timed_out = True
            stdout = _decode_timeout_output(exc.stdout)
            stderr = _decode_timeout_output(exc.stderr)
            exit_code = None

        duration_ms = int((time.monotonic() - started) * 1000)
        stdout_path = evidence_root / f"{_safe_name(request.run_id)}-stdout.txt"
        stderr_path = evidence_root / f"{_safe_name(request.run_id)}-stderr.txt"
        sensitive = _sensitive_output_diagnostics(
            stdout,
            stderr,
            artifact_root,
            sensitive_roots=[self.harness_root, *permission_roots],
        )
        side_effects = _side_effect_diagnostics(
            before=side_effect_snapshot,
            roots=permission_roots,
            allowed_roots=[artifact_root, evidence_root, *allowed_change_roots],
        )
        worktree_changes = _file_changes(
            before=allowed_change_snapshot,
            after=_file_snapshot(
                allowed_change_roots,
                allowed_roots=[artifact_root, evidence_root],
            ),
            harness_root=self.harness_root,
        )

        if timed_out:
            if sensitive:
                _write_redacted_output(stdout_path, stderr_path)
                _redact_artifact_root(artifact_root)
                return {
                    **self._base_result(request),
                    "status": "automatic_execution_blocked",
                    "exitCode": None,
                    "timeout": True,
                    "cancelStatus": "timeout",
                    "durationMs": duration_ms,
                    "stdoutPath": str(stdout_path),
                    "stderrPath": str(stderr_path),
                    "diagnostic_ids": list(dict.fromkeys([*sensitive, *side_effects])),
                }
            if side_effects:
                stdout_path.write_text(stdout, encoding="utf-8")
                stderr_path.write_text(stderr, encoding="utf-8")
                return {
                    **self._base_result(request),
                    "status": "automatic_execution_blocked",
                    "exitCode": None,
                    "timeout": True,
                    "cancelStatus": "timeout",
                    "durationMs": duration_ms,
                    "stdoutPath": str(stdout_path),
                    "stderrPath": str(stderr_path),
                    "diagnostic_ids": list(dict.fromkeys(["worker_timeout_not_pass", *side_effects])),
                }
            stdout_path.write_text(stdout, encoding="utf-8")
            stderr_path.write_text(stderr, encoding="utf-8")
            return {
                **self._base_result(request),
                "status": "automatic_execution_timeout",
                "exitCode": None,
                "timeout": True,
                "cancelStatus": "timeout",
                "durationMs": duration_ms,
                "stdoutPath": str(stdout_path),
                "stderrPath": str(stderr_path),
                "diagnostic_ids": ["worker_timeout_not_pass"],
            }

        if sensitive:
            _write_redacted_output(stdout_path, stderr_path)
            _redact_artifact_root(artifact_root)
            return {
                **self._base_result(request),
                "status": "automatic_execution_blocked",
                "exitCode": exit_code,
                "timeout": False,
                "cancelStatus": "not_requested",
                "durationMs": duration_ms,
                "stdoutPath": str(stdout_path),
                "stderrPath": str(stderr_path),
                "diagnostic_ids": list(dict.fromkeys([*sensitive, *side_effects])),
            }

        if side_effects:
            stdout_path.write_text(stdout, encoding="utf-8")
            stderr_path.write_text(stderr, encoding="utf-8")
            return {
                **self._base_result(request),
                "status": "automatic_execution_blocked",
                "exitCode": exit_code,
                "timeout": False,
                "cancelStatus": "not_requested",
                "durationMs": duration_ms,
                "stdoutPath": str(stdout_path),
                "stderrPath": str(stderr_path),
                "diagnostic_ids": side_effects,
            }

        stdout_path.write_text(stdout, encoding="utf-8")
        stderr_path.write_text(stderr, encoding="utf-8")

        if exit_code != 0:
            adapter_diagnostics = _adapter_failure_diagnostics(stdout)
            diagnostics = adapter_diagnostics or ["worker_exit_nonzero_not_pass"]
            status = (
                "tool_unavailable"
                if any(item.endswith("_cli_unavailable") or item == "tool_unavailable" for item in diagnostics)
                else "automatic_execution_failed"
            )
            return {
                **self._base_result(request),
                "status": status,
                "exitCode": exit_code,
                "timeout": False,
                "cancelStatus": "not_requested",
                "durationMs": duration_ms,
                "stdoutPath": str(stdout_path),
                "stderrPath": str(stderr_path),
                "diagnostic_ids": diagnostics,
            }

        artifact_manifest = _artifact_manifest(artifact_root, self.harness_root)
        evidence_id = f"{request.packet_id}:{request.role.lower()}:{request.provider}:automatic-cli-evidence"
        envelope = {
            "adapter_run_id": request.run_id,
            "input_snapshot_hash": request.input_snapshot_hash,
            "permission_roots": [
                _display_path(self.harness_root, Path(root).resolve())
                for root in request.permission_roots
            ],
            "artifact_manifest": artifact_manifest,
            "event_request": {
                "event_type": "adapter.output_submitted",
                "packet_id": request.packet_id,
                "worker_run_id": request.run_id,
            },
            "failure_classification": None,
            "evidence_provenance": {
                "execution_mode": "local_subscription_cli",
                "worker_execution": "automatic_subprocess",
                "result_status": "passed",
                "evidence_id": evidence_id,
                "provider": request.provider,
                "role": request.role,
                "timeout_seconds": request.timeout_seconds,
                "cancel_status": "not_requested",
                "captured_exit_code": exit_code,
                "captured_argv": _display_argv(self.harness_root, request.argv),
                "stdout_sha256": _sha256_text(stdout),
                "stderr_sha256": _sha256_text(stderr),
                "duration_ms": duration_ms,
                "worktree_changes": worktree_changes,
            },
        }
        envelope_path = evidence_root / f"{_safe_name(request.run_id)}-envelope.json"
        envelope_path.write_text(json.dumps(envelope, indent=2, sort_keys=True), encoding="utf-8")
        return {
            **self._base_result(request),
            "status": "automatic_execution_pass",
            "exitCode": exit_code,
            "timeout": False,
            "cancelStatus": "not_requested",
            "durationMs": duration_ms,
            "stdoutPath": _display_path(self.harness_root, stdout_path),
            "stderrPath": _display_path(self.harness_root, stderr_path),
            "envelopePath": _display_path(self.harness_root, envelope_path),
            "outputEnvelope": envelope,
            "evidenceRefs": [evidence_id, _display_path(self.harness_root, envelope_path)],
            "diagnostic_ids": [],
        }

    def provider_descriptor(
        self,
        *,
        provider: str,
        role: str,
        executable: str,
        approved_executables: Sequence[str],
        timeout_seconds: int,
    ) -> dict[str, Any]:
        provider_id = provider.strip().lower().replace("-", "_")
        if provider_id not in {"codex", "claude_code"}:
            return {
                "status": "unsupported_provider",
                "provider": provider_id,
                "role": role,
                "product_identity": False,
            }
        executable_path = Path(executable)
        if not executable_path.exists() or not _executable_approved(executable, approved_executables):
            return {
                "status": "tool_unavailable",
                "provider": provider_id,
                "role": role,
                "diagnostic_id": "tool_unavailable",
                "product_identity": False,
            }
        return {
            "status": "descriptor_ready",
            "provider": provider_id,
            "role": role,
            "argv": [str(executable_path)],
            "shell": False,
            "timeout_seconds": timeout_seconds,
            "product_identity": False,
        }

    def _descriptor_diagnostics(self, request: WorkerExecutionRequest) -> list[str]:
        diagnostics: list[str] = []
        if request.shell:
            diagnostics.append("unsafe_command_descriptor")
        if not isinstance(request.timeout_seconds, int) or request.timeout_seconds <= 0:
            diagnostics.append("worker_timeout_required")
        if not request.argv or not all(isinstance(arg, str) and arg for arg in request.argv):
            diagnostics.append("unsafe_command_descriptor")
        if any(any(token in arg for token in UNSAFE_ARG_TOKENS) for arg in request.argv):
            diagnostics.append("unsafe_command_descriptor")
        if request.argv and not _executable_approved(request.argv[0], request.approved_executables):
            diagnostics.append("worker_executable_not_approved")
        artifact_root = Path(request.artifact_root).resolve()
        if not _inside_any_root(artifact_root, [Path(root).resolve() for root in request.permission_roots]):
            diagnostics.append("worker_artifact_outside_root")
        for artifact in request.declared_artifacts or []:
            if not _inside_any_root(Path(artifact).resolve(), [artifact_root]):
                diagnostics.append("worker_artifact_outside_root")
        for change_root in request.allowed_change_roots or []:
            if not _inside_any_root(Path(change_root).resolve(), [Path(root).resolve() for root in request.permission_roots]):
                diagnostics.append("worker_change_root_outside_permission_root")
        return sorted(set(diagnostics))

    def _blocked_result(
        self,
        request: WorkerExecutionRequest,
        diagnostics: list[str],
    ) -> dict[str, Any]:
        return {
            **self._base_result(request),
            "status": "automatic_execution_blocked",
            "exitCode": None,
            "timeout": False,
            "cancelStatus": "not_requested",
            "diagnostic_ids": sorted(set(diagnostics)),
        }

    def _base_result(self, request: WorkerExecutionRequest) -> dict[str, Any]:
        return {
            "schemaVersion": "standard-harness-worker-execution/v1",
            "packetId": request.packet_id,
            "runId": request.run_id,
            "role": request.role,
            "provider": request.provider,
            "adapterId": request.adapter_id,
            "productIdentity": False,
            "approvalStateMutationAllowed": False,
        }


def _artifact_manifest(root: Path, harness_root: Path) -> list[dict[str, Any]]:
    if not root.exists():
        return []
    manifest: list[dict[str, Any]] = []
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        manifest.append(
            {
                "path": _display_path(harness_root, path),
                "kind": "worker_artifact",
                "sha256": _sha256_bytes(path.read_bytes()),
            }
        )
    return manifest


def _sensitive_output_diagnostics(
    stdout: str,
    stderr: str,
    artifact_root: Path,
    *,
    sensitive_roots: Sequence[Path],
) -> list[str]:
    values = [stdout, stderr]
    if artifact_root.exists():
        for path in artifact_root.rglob("*"):
            if path.is_file():
                try:
                    values.append(path.read_text(encoding="utf-8"))
                except UnicodeDecodeError:
                    continue
    lowered = "\n".join(values).lower()
    if any(token in lowered for token in SECRET_VALUE_TOKENS):
        return ["worker_output_secret_rejected"]
    if any(_path_token(root) in lowered or root.as_posix().casefold() in lowered for root in sensitive_roots):
        return ["worker_output_secret_rejected"]
    return []


def _executable_approved(executable: str, approved_executables: Sequence[str]) -> bool:
    candidate = _normalized_path(executable)
    return any(candidate == _normalized_path(item) for item in approved_executables)


def _inside_any_root(path: Path, roots: Sequence[Path]) -> bool:
    normalized = path.resolve()
    for root in roots:
        try:
            normalized.relative_to(root.resolve())
            return True
        except ValueError:
            continue
    return False


def _file_snapshot(roots: Sequence[Path], *, allowed_roots: Sequence[Path]) -> dict[str, tuple[int, int]]:
    snapshot: dict[str, tuple[int, int]] = {}
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or _inside_any_root(path, allowed_roots):
                continue
            stat = path.stat()
            snapshot[str(path.resolve())] = (stat.st_mtime_ns, stat.st_size)
    return snapshot


def _side_effect_diagnostics(
    *,
    before: dict[str, tuple[int, int]],
    roots: Sequence[Path],
    allowed_roots: Sequence[Path],
) -> list[str]:
    after = _file_snapshot(roots, allowed_roots=allowed_roots)
    diagnostics: list[str] = []
    for path, metadata in after.items():
        if path not in before:
            diagnostics.append("worker_side_effect_outside_artifact_root")
            try:
                Path(path).unlink()
                diagnostics.append("worker_side_effect_new_file_removed")
            except OSError:
                diagnostics.append("worker_side_effect_cleanup_failed")
        elif before[path] != metadata:
            diagnostics.append("worker_side_effect_outside_artifact_root")
            diagnostics.append("worker_side_effect_modified_existing_file")
    return list(dict.fromkeys(diagnostics))


def _file_changes(
    *,
    before: dict[str, tuple[int, int]],
    after: dict[str, tuple[int, int]],
    harness_root: Path,
) -> list[dict[str, str]]:
    changes: list[dict[str, str]] = []
    for path in sorted(set(before) | set(after)):
        if path not in before:
            status = "added"
        elif path not in after:
            status = "deleted"
        elif before[path] != after[path]:
            status = "modified"
        else:
            continue
        changes.append({"path": _display_path(harness_root, Path(path)), "status": status})
    return changes


def _adapter_failure_diagnostics(stdout: str) -> list[str]:
    lines = [line.strip() for line in stdout.splitlines() if line.strip()]
    for line in reversed(lines):
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(parsed, dict):
            continue
        diagnostic = parsed.get("diagnostic")
        if isinstance(diagnostic, str) and diagnostic:
            return [diagnostic]
        diagnostics = parsed.get("diagnostic_ids")
        if isinstance(diagnostics, list):
            values = [str(item) for item in diagnostics if isinstance(item, str) and item]
            if values:
                return values
    return []


def _write_redacted_output(stdout_path: Path, stderr_path: Path) -> None:
    stdout_path.write_text("[redacted: worker output rejected]\n", encoding="utf-8")
    stderr_path.write_text("[redacted: worker output rejected]\n", encoding="utf-8")


def _redact_artifact_root(artifact_root: Path) -> None:
    if not artifact_root.exists():
        return
    for path in artifact_root.rglob("*"):
        if path.is_file():
            path.write_text("[redacted: worker artifact rejected]\n", encoding="utf-8")


def _display_path(harness_root: Path, path: Path) -> str:
    normalized = path.resolve()
    try:
        relative = normalized.relative_to(harness_root.resolve())
    except ValueError:
        return str(normalized)
    if str(relative) == ".":
        return "."
    return relative.as_posix()


def _display_argv(harness_root: Path, argv: Sequence[str]) -> list[str]:
    displayed: list[str] = []
    for arg in argv:
        maybe_path = Path(arg)
        if maybe_path.is_absolute():
            display = _display_path(harness_root, maybe_path)
            displayed.append(Path(display).name if Path(display).is_absolute() else display)
        else:
            displayed.append(arg)
    return displayed


def _path_token(root: Path) -> str:
    return str(root.resolve()).casefold()


def _decode_timeout_output(value: bytes | str | None) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value


def _safe_name(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in {"-", "_"} else "-" for ch in value)[:120]


def _normalized_path(value: str) -> str:
    return str(Path(value).resolve()).casefold()


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()
