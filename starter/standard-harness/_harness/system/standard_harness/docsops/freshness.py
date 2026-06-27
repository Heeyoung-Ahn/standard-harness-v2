"""Freshness gate for documented commands."""

from __future__ import annotations

from typing import Any


class CommandFreshnessGate:
    def evaluate(self, entries: list[dict[str, Any]]) -> dict[str, Any]:
        stale_unwaived = [
            entry["command_id"]
            for entry in entries
            if entry.get("freshness_status") == "stale" and not entry.get("waiver_id")
        ]
        diagnostics = ["stale_command_documentation"] if stale_unwaived else []
        return {
            "status": "blocked" if diagnostics else "ready",
            "diagnostic_ids": diagnostics,
            "stale_command_ids": stale_unwaived,
        }

