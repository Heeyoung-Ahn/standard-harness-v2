"""Diff-based repository boundary validation."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from standard_harness.policy.permissions import AgentPermissionPolicy
from standard_harness.policy.zones import LogicalZonePolicy
from standard_harness.policy.zones import has_parent_traversal
from standard_harness.policy.zones import normalize_path
from standard_harness.policy.zones import path_matches_any


class BoundaryValidator:
    validator_id = "boundary-validator"
    gate_id = "boundary-gate"

    def __init__(
        self,
        *,
        zone_policy: LogicalZonePolicy,
        permission_policy: AgentPermissionPolicy,
    ):
        self.zone_policy = zone_policy
        self.permission_policy = permission_policy

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "BoundaryValidator":
        return cls(
            zone_policy=LogicalZonePolicy.from_repo(repo_root),
            permission_policy=AgentPermissionPolicy.from_repo(repo_root),
        )

    def validate(self, boundary_input: dict[str, Any]) -> dict[str, Any]:
        packet_type = str(boundary_input.get("packetType") or boundary_input.get("packet_type") or "docs-only")
        role = str(boundary_input.get("role") or "developer")
        changed_files = _changed_files(boundary_input)
        declared_zones = [
            str(zone)
            for zone in (
                boundary_input.get("declaredChangeZones")
                or boundary_input.get("declared_change_zones")
                or []
            )
        ]
        explicit_forbidden = [
            str(zone)
            for zone in (
                boundary_input.get("forbiddenWriteZones")
                or boundary_input.get("forbidden_write_zones")
                or []
            )
        ]
        forbidden_patterns = sorted(
            set(explicit_forbidden + self.zone_policy.forbidden_write_zones_for(packet_type))
        )
        diagnostic_ids: list[str] = []
        diagnostics: list[dict[str, Any]] = []
        hard_fail = False

        for change in changed_files:
            raw_path = str(change["path"])
            path = normalize_path(raw_path)
            if has_parent_traversal(raw_path):
                _add_diagnostic(
                    diagnostic_ids,
                    diagnostics,
                    "path_traversal",
                    path=path,
                    message="Changed file path must not contain parent traversal segments.",
                )
            if declared_zones and not path_matches_any(path, declared_zones):
                _add_diagnostic(
                    diagnostic_ids,
                    diagnostics,
                    "invalid_zone_mapping",
                    path=path,
                    message="Changed file is outside the packet declared change zones.",
                )
            if forbidden_patterns and path_matches_any(path, forbidden_patterns):
                _add_diagnostic(
                    diagnostic_ids,
                    diagnostics,
                    "forbidden_write_zone",
                    path=path,
                    message="Changed file is in a forbidden write zone.",
                )
            if (
                self.zone_policy.is_product_packet(packet_type)
                and self.zone_policy.zone_for_path(path) == "harness"
            ):
                hard_fail = True
                _add_diagnostic(
                    diagnostic_ids,
                    diagnostics,
                    "harness_boundary_violation",
                    path=path,
                    message="Product packet attempted to modify the harness system zone.",
                )
            if not self.permission_policy.can_write_path(role, path, self.zone_policy):
                _add_diagnostic(
                    diagnostic_ids,
                    diagnostics,
                    "forbidden_write_zone",
                    path=path,
                    message="Agent role is not allowed to write this path.",
                )

        if not boundary_input.get("baseCommit") or not boundary_input.get("headCommit"):
            _add_diagnostic(
                diagnostic_ids,
                diagnostics,
                "invalid_zone_mapping",
                path="",
                message="Boundary validation requires baseCommit and headCommit diff anchors.",
            )

        return {
            "status": "blocked" if diagnostic_ids else "pass",
            "hard_fail": hard_fail or "harness_boundary_violation" in diagnostic_ids,
            "diagnostic_ids": diagnostic_ids,
            "diagnostics": diagnostics,
            "frictionSignalBehavior": "emit forbidden_write_zone, harness_boundary_violation, or invalid_zone_mapping when blocked",
            "metricSignalBehavior": "emit boundary_validation_count by packetType, role, zone, and diagnostic",
        }


def boundary_input_from_packet(packet: dict[str, Any]) -> dict[str, Any] | None:
    closeout_plan = packet.get("closeout_plan")
    if not isinstance(closeout_plan, dict):
        return None
    raw_boundary = closeout_plan.get("boundaryValidation") or closeout_plan.get("boundary_validation")
    if not isinstance(raw_boundary, dict):
        return None
    boundary_input = dict(raw_boundary)
    boundary_input.setdefault("packetId", packet.get("packet_id"))
    boundary_input.setdefault("packetType", packet.get("packet_type"))
    boundary_input.setdefault("declaredChangeZones", packet.get("change_zones", []))
    return boundary_input


def _changed_files(boundary_input: dict[str, Any]) -> list[dict[str, Any]]:
    raw_changes = boundary_input.get("changedFiles") or boundary_input.get("changed_files") or []
    changes = []
    for item in raw_changes:
        if isinstance(item, dict) and item.get("path"):
            changes.append({"path": str(item["path"]), "status": str(item.get("status", "M"))})
    return changes


def _add_diagnostic(
    diagnostic_ids: list[str],
    diagnostics: list[dict[str, Any]],
    diagnostic_id: str,
    *,
    path: str,
    message: str,
) -> None:
    if diagnostic_id not in diagnostic_ids:
        diagnostic_ids.append(diagnostic_id)
    diagnostics.append({"diagnostic_id": diagnostic_id, "path": path, "message": message})
