"""Git worktree snapshot capture."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from standard_harness.state.store import HarnessStore


class GitSnapshotService:
    def __init__(self, store: HarnessStore | None = None):
        self.store = store

    def record_snapshot(
        self,
        *,
        git_snapshot_id: str,
        repo_root: str | Path,
        worktree_path: str | Path | None = None,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store is None:
            return capture_git_snapshot(
                git_snapshot_id=git_snapshot_id,
                repo_root=repo_root,
                worktree_path=worktree_path,
                source_watermark=0,
            )
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_snapshot(git_snapshot_id)
        if self._snapshot_exists(git_snapshot_id):
            raise ValueError(f"git_snapshot_id already exists: {git_snapshot_id}")
        source_watermark = self.store.latest_event_seq()
        snapshot = capture_git_snapshot(
            git_snapshot_id=git_snapshot_id,
            repo_root=repo_root,
            worktree_path=worktree_path,
            source_watermark=source_watermark,
        )
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="git.snapshot_recorded",
                actor_id="git",
                actor_role="System",
                authority_basis="git snapshot capture",
                idempotency_key=idempotency_key,
                payload=snapshot,
                conn=conn,
            )
            conn.execute(
                """
                insert into git_snapshots (
                  git_snapshot_id, repo_root, branch_name, commit_id, worktree_path,
                  tracked_changes_json, untracked_files_json, ignored_files_json,
                  source_watermark, trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _snapshot_row_values(snapshot, event),
            )
        return self.get_snapshot(git_snapshot_id)

    def get_snapshot(self, git_snapshot_id: str) -> dict[str, Any]:
        if self.store is None:
            raise ValueError("get_snapshot requires a HarnessStore")
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from git_snapshots where git_snapshot_id = ?",
                (git_snapshot_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown git snapshot: {git_snapshot_id}")
        return _snapshot_from_row(dict(row))

    def _snapshot_exists(self, git_snapshot_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from git_snapshots where git_snapshot_id = ?",
                (git_snapshot_id,),
            ).fetchone()
        return row is not None


def capture_git_snapshot(
    *,
    git_snapshot_id: str,
    repo_root: str | Path,
    source_watermark: int,
    worktree_path: str | Path | None = None,
) -> dict[str, Any]:
    repo = Path(repo_root).resolve()
    worktree = Path(worktree_path).resolve() if worktree_path is not None else repo
    status = collect_git_status(repo, include_ignored=True)
    return {
        "git_snapshot_id": git_snapshot_id,
        "repo_root": str(repo),
        "branch_name": git_branch_name(repo),
        "commit_id": git_commit_id(repo),
        "worktree_path": str(worktree),
        "tracked_changes": status["tracked_changes"],
        "untracked_files": status["untracked_files"],
        "ignored_files": status["ignored_files"],
        "source_watermark": source_watermark,
    }


def collect_git_status(repo_root: str | Path, *, include_ignored: bool) -> dict[str, Any]:
    repo = Path(repo_root).resolve()
    args = ["status", "--porcelain=v1"]
    if include_ignored:
        args.append("--ignored")
    output = _git(repo, *args)
    tracked_changes: list[dict[str, str]] = []
    untracked_files: list[str] = []
    ignored_files: list[str] = []
    for line in output.splitlines():
        if not line:
            continue
        status = line[:2]
        path_text = line[3:]
        old_path = None
        new_path = None
        if " -> " in path_text:
            old_path, new_path = path_text.split(" -> ", 1)
            path = _normalize_git_path(new_path)
        else:
            path = _normalize_git_path(path_text)
        if status == "??":
            untracked_files.append(path)
        elif status == "!!":
            ignored_files.append(path)
        else:
            change = {"status": status, "path": path}
            if old_path is not None and new_path is not None:
                change["old_path"] = _normalize_git_path(old_path)
                change["new_path"] = _normalize_git_path(new_path)
            tracked_changes.append(change)
    return {
        "tracked_changes": tracked_changes,
        "untracked_files": sorted(untracked_files),
        "ignored_files": sorted(ignored_files),
    }


def git_branch_name(repo_root: str | Path) -> str:
    try:
        return _git(Path(repo_root), "rev-parse", "--abbrev-ref", "HEAD")
    except RuntimeError:
        return "UNKNOWN"


def git_commit_id(repo_root: str | Path) -> str:
    try:
        return _git(Path(repo_root), "rev-parse", "HEAD")
    except RuntimeError:
        return "UNBORN"


def _git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.rstrip("\n")


def _normalize_git_path(path: str) -> str:
    return path.strip().replace("\\", "/").lstrip("./")


def _snapshot_row_values(snapshot: dict[str, Any], event: dict[str, Any]) -> tuple[Any, ...]:
    return (
        snapshot["git_snapshot_id"],
        snapshot["repo_root"],
        snapshot["branch_name"],
        snapshot["commit_id"],
        snapshot["worktree_path"],
        json.dumps(snapshot["tracked_changes"], sort_keys=True),
        json.dumps(snapshot["untracked_files"], sort_keys=True),
        json.dumps(snapshot["ignored_files"], sort_keys=True),
        snapshot["source_watermark"],
        event["event_id"],
        event["event_seq"],
    )


def _snapshot_from_row(row: dict[str, Any]) -> dict[str, Any]:
    row["tracked_changes"] = json.loads(row.pop("tracked_changes_json"))
    row["untracked_files"] = json.loads(row.pop("untracked_files_json"))
    row["ignored_files"] = json.loads(row.pop("ignored_files_json"))
    return row
