"""Initialize project operating folders from the harness folder contract."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from pathlib import PurePosixPath
from typing import Any


class OperatingFolderInitializer:
    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)

    def initialize(self) -> dict[str, Any]:
        policy = self._load_policy()
        required_directories = _required_directories(policy)
        initialized: list[str] = []
        for relative in required_directories:
            if not (relative.startswith("_ops/") or relative.startswith("product/")):
                continue
            path = self.repo_root / relative
            path.mkdir(parents=True, exist_ok=True)
            initialized.append(relative)
        return {
            "status": "ok",
            "initialized_folders": sorted(initialized),
            "policy": "_harness/policies/project-operating-folders.yaml",
        }

    def reset_ops(self) -> dict[str, Any]:
        policy = self._load_policy()
        required_directories = _required_directories(policy)
        ops_root = self.repo_root / "_ops"
        removed = False
        if ops_root.exists():
            shutil.rmtree(ops_root)
            removed = True
        reset_folders: list[str] = []
        for relative in required_directories:
            if not (relative.startswith("_ops/") or relative == "_ops" or relative.startswith("product/docs/")):
                continue
            path = self.repo_root / relative
            path.mkdir(parents=True, exist_ok=True)
            reset_folders.append(relative)
        return {
            "status": "ok",
            "removed_ops": removed,
            "reset_folders": sorted(reset_folders),
            "policy": "_harness/policies/project-operating-folders.yaml",
        }

    def _load_policy(self) -> dict[str, Any]:
        policy_path = self.repo_root / "_harness" / "policies" / "project-operating-folders.yaml"
        if not policy_path.exists():
            return {"requiredDirectories": []}
        with policy_path.open(encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, dict):
            raise ValueError("project operating folder policy must be a JSON object")
        return data


def _required_directories(policy: dict[str, Any]) -> list[str]:
    value = policy.get("requiredDirectories", [])
    if not isinstance(value, list):
        raise ValueError("requiredDirectories must be a list")
    result: list[str] = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise ValueError("requiredDirectories entries must be non-empty strings")
        normalized = item.replace("\\", "/")
        path = PurePosixPath(normalized)
        if Path(item).is_absolute() or ".." in path.parts:
            raise ValueError("requiredDirectories entries must be relative safe paths")
        result.append(normalized)
    return result
