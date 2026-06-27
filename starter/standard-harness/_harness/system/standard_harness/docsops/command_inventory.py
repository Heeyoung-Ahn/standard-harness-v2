"""Command inventory parsing and release-readiness checks."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from standard_harness.docsops.freshness import CommandFreshnessGate


COMMAND_PREFIXES = (
    "& ",
    "python ",
    "git ",
    "gh ",
    "node ",
    "npm ",
    "npm.cmd ",
    "py ",
    "powershell ",
    "pwsh ",
)
COMMAND_FENCE_LANGUAGES = {"powershell", "pwsh", "bash", "shell", "sh", "cmd", "console"}
REQUIRED_COLUMNS = [
    "command_id",
    "command",
    "source_path",
    "classification",
    "manual_only_reason",
    "freshness_status",
    "verified_by",
    "waiver_id",
]
CLASSIFICATIONS = {"executable", "manual"}


class CommandInventoryService:
    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root).resolve()

    def load_inventory(self, path: str | Path) -> list[dict[str, Any]]:
        inventory_path = Path(path)
        if not inventory_path.is_absolute():
            inventory_path = self.repo_root / inventory_path
        rows = []
        header: list[str] | None = None
        for line in inventory_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped.startswith("|"):
                continue
            cells = [cell.strip() for cell in stripped.strip("|").split("|")]
            if cells and all(set(cell) <= {"-", ":"} for cell in cells):
                continue
            if header is None:
                header = cells
                continue
            if len(cells) != len(header):
                continue
            row = dict(zip(header, cells))
            rows.append({column: row.get(column, "") for column in REQUIRED_COLUMNS})
        return rows

    def documented_commands(self, source_paths: list[str | Path]) -> list[str]:
        commands: list[str] = []
        seen = set()
        for source_path in source_paths:
            path = Path(source_path)
            if not path.is_absolute():
                path = self.repo_root / path
            if not path.exists():
                continue
            in_fence = False
            fence_language = ""
            for line in path.read_text(encoding="utf-8").splitlines():
                stripped = line.strip()
                if stripped.startswith("```"):
                    if not in_fence:
                        fence_language = stripped.removeprefix("```").strip().lower()
                        in_fence = True
                    else:
                        fence_language = ""
                        in_fence = False
                    continue
                if (
                    not in_fence
                    or fence_language not in COMMAND_FENCE_LANGUAGES
                    or not _looks_like_command(stripped)
                ):
                    continue
                if stripped not in seen:
                    seen.add(stripped)
                    commands.append(stripped)
        return commands

    def check_inventory(
        self, *, inventory_path: str | Path, source_paths: list[str | Path]
    ) -> dict[str, Any]:
        entries = self.load_inventory(inventory_path)
        documented = self.documented_commands(source_paths)
        inventory_commands = {entry["command"] for entry in entries}
        missing = [command for command in documented if command not in inventory_commands]
        diagnostics = []
        if missing:
            diagnostics.append("missing_command_inventory_entry")
        for entry in entries:
            if entry["classification"] not in CLASSIFICATIONS:
                diagnostics.append("invalid_command_classification")
            if entry["classification"] == "manual" and not entry["manual_only_reason"]:
                diagnostics.append("manual_command_missing_reason")
        freshness = CommandFreshnessGate().evaluate(entries)
        diagnostics.extend(freshness["diagnostic_ids"])
        diagnostics = _dedupe(diagnostics)
        return {
            "status": "blocked" if diagnostics else "ready",
            "diagnostic_ids": diagnostics,
            "missing_commands": missing,
            "documented_commands": documented,
            "entries": entries,
        }


def _looks_like_command(line: str) -> bool:
    if not line or line.startswith("#"):
        return False
    lowered = line.lower()
    return any(lowered.startswith(prefix) for prefix in COMMAND_PREFIXES) or re.match(
        r"^[A-Za-z]+-[A-Za-z]+(\s|$)", line
    )


def _dedupe(values: list[str]) -> list[str]:
    result = []
    for value in values:
        if value not in result:
            result.append(value)
    return result
