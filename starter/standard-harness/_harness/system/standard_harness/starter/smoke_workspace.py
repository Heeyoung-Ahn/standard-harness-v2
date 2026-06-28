"""Bounded temporary workspaces for starter smoke validation."""

from __future__ import annotations

import os
import shutil
import tempfile
import time
from pathlib import Path


DEFAULT_SMOKE_ROOT_NAME = "standard-harness-smoke"
DEFAULT_TTL_SECONDS = 24 * 60 * 60


def default_smoke_root() -> Path:
    configured = os.environ.get("STANDARD_HARNESS_SMOKE_ROOT")
    if configured:
        return Path(configured)
    return Path(tempfile.gettempdir()) / DEFAULT_SMOKE_ROOT_NAME


def create_starter_smoke_copy(source_root: str | Path, *, smoke_root: str | Path | None = None) -> Path:
    root = _resolve_smoke_root(smoke_root)
    root.mkdir(parents=True, exist_ok=True)
    workspace = Path(tempfile.mkdtemp(prefix="shv2-starter-", dir=root))
    target = workspace / "standard-harness"
    ignore = shutil.ignore_patterns("__pycache__", ".pytest_cache", ".mypy_cache", ".harness", ".tmp")
    shutil.copytree(Path(source_root), target, ignore=ignore)
    return target


def cleanup_starter_smoke_copy(
    target: str | Path,
    *,
    smoke_root: str | Path | None = None,
    preserve_success: bool = False,
    failed: bool = False,
    max_failed_diagnostics: int = 1,
) -> dict[str, str]:
    root = _resolve_smoke_root(smoke_root)
    workspace = _workspace_for_target(Path(target), root)
    if preserve_success or failed:
        if failed:
            _prune_diagnostics(root, keep=max_failed_diagnostics)
        return {"status": "preserved", "path": str(workspace)}
    if workspace.exists():
        shutil.rmtree(workspace)
    return {"status": "deleted", "path": str(workspace)}


def cleanup_stale_smoke_workspaces(
    *,
    smoke_root: str | Path | None = None,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> list[str]:
    root = _resolve_smoke_root(smoke_root)
    if not root.exists():
        return []
    cutoff = time.time() - ttl_seconds
    deleted: list[str] = []
    for child in root.iterdir():
        if not child.is_dir():
            continue
        _assert_within_smoke_root(child, root)
        if child.stat().st_mtime <= cutoff:
            shutil.rmtree(child)
            deleted.append(str(child))
    return deleted


def _resolve_smoke_root(smoke_root: str | Path | None) -> Path:
    return (Path(smoke_root) if smoke_root is not None else default_smoke_root()).resolve()


def _workspace_for_target(target: Path, root: Path) -> Path:
    resolved = target.resolve()
    _assert_within_smoke_root(resolved, root)
    if resolved.parent == root:
        return resolved
    _assert_within_smoke_root(resolved.parent, root)
    return resolved.parent


def _assert_within_smoke_root(path: Path, root: Path) -> None:
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError as exc:
        raise ValueError(f"Smoke workspace path is outside the configured root: {path}") from exc


def _prune_diagnostics(root: Path, *, keep: int) -> None:
    if not root.exists():
        return
    workspaces = [child for child in root.iterdir() if child.is_dir()]
    workspaces.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    for child in workspaces[max(keep, 0) :]:
        _assert_within_smoke_root(child, root)
        shutil.rmtree(child)
