"""Reconcile Git snapshots against packet-owned harness state."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.domain.packets import PacketService
from standard_harness.gitops.drift import FilesystemDriftService
from standard_harness.state.store import HarnessStore


BLOCKING_CLASSIFICATIONS = {
    "unregistered_change",
    "moved_artifact",
    "deleted_artifact",
    "external_tool_drift",
    "branch_switch",
    "merge_conflict",
}


class GitReconciliationService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def record_reconciliation(
        self,
        *,
        reconciliation_id: str,
        packet_id: str,
        git_snapshot_id: str,
        idempotency_key: str,
        expected_branch_name: str | None = None,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_reconciliation(reconciliation_id)
        if self._reconciliation_exists(reconciliation_id):
            raise ValueError(f"reconciliation_id already exists: {reconciliation_id}")
        packet = PacketService(self.store).get_packet(packet_id)
        snapshot = self._snapshot(git_snapshot_id)
        artifacts = self._artifacts(packet_id)
        evidence_paths = self._passed_evidence_paths(packet_id)
        classifications = self._classify(
            packet=packet,
            snapshot=snapshot,
            artifacts=artifacts,
            evidence_paths=evidence_paths,
            expected_branch_name=expected_branch_name,
        )
        unresolved = sorted(
            {
                item["classification"]
                for item in classifications
                if item["classification"] in BLOCKING_CLASSIFICATIONS
            }
        )
        source_watermark = self.store.latest_event_seq()
        reconciliation = {
            "reconciliation_id": reconciliation_id,
            "packet_id": packet_id,
            "git_snapshot_id": git_snapshot_id,
            "branch_name": snapshot["branch_name"],
            "commit_id": snapshot["commit_id"],
            "classifications": classifications,
            "unresolved_classifications": unresolved,
            "source_event_range": "0-0" if source_watermark <= 0 else f"1-{source_watermark}",
            "source_watermark": source_watermark,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="git.reconciliation_recorded",
                actor_id="git",
                actor_role="System",
                authority_basis="git reconciliation",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=reconciliation,
                conn=conn,
            )
            conn.execute(
                """
                insert into git_reconciliations (
                  reconciliation_id, packet_id, git_snapshot_id, branch_name,
                  commit_id, classifications_json, unresolved_classifications_json,
                  source_event_range, source_watermark, trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _reconciliation_row_values(reconciliation, event),
            )
        drift_items = _drift_items_from_classifications(classifications)
        if drift_items:
            FilesystemDriftService(self.store).record_drift_items(
                drift_id=f"reconciliation-{reconciliation_id}",
                packet_id=packet_id,
                items=drift_items,
                idempotency_prefix=f"filesystem-drift-{reconciliation_id}",
                source="git_reconciliation",
            )
        return self.get_reconciliation(reconciliation_id)

    def get_reconciliation(self, reconciliation_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from git_reconciliations where reconciliation_id = ?",
                (reconciliation_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown git reconciliation: {reconciliation_id}")
        return _reconciliation_from_row(dict(row))

    def propose_repair(
        self,
        *,
        repair_id: str,
        reconciliation_id: str,
        action: str,
        approval_record_id: str | None,
    ) -> dict[str, Any]:
        if approval_record_id is None or not self._approval_authorizes_repair(
            approval_record_id, reconciliation_id
        ):
            return {
                "repair_id": repair_id,
                "reconciliation_id": reconciliation_id,
                "action": action,
                "status": "blocked",
                "classification": "repair_requires_approval",
            }
        return {
            "repair_id": repair_id,
            "reconciliation_id": reconciliation_id,
            "action": action,
            "status": "approved",
            "approval_record_id": approval_record_id,
        }

    def _approval_authorizes_repair(
        self, approval_record_id: str, reconciliation_id: str
    ) -> bool:
        packet_id = None
        with self.store.connection() as conn:
            reconciliation = conn.execute(
                """
                select packet_id from git_reconciliations
                where reconciliation_id = ?
                """,
                (reconciliation_id,),
            ).fetchone()
            if reconciliation is not None:
                packet_id = reconciliation["packet_id"]
            else:
                return False
            approval = conn.execute(
                """
                select packet_id, decision_result from approval_records
                where approval_record_id = ?
                """,
                (approval_record_id,),
            ).fetchone()
        if approval is None or approval["decision_result"] != "approved":
            return False
        return approval["packet_id"] == packet_id

    def _classify(
        self,
        *,
        packet: dict[str, Any],
        snapshot: dict[str, Any],
        artifacts: dict[str, dict[str, Any]],
        evidence_paths: set[str],
        expected_branch_name: str | None,
    ) -> list[dict[str, Any]]:
        zones = [str(zone) for zone in packet["change_zones"]]
        classifications: list[dict[str, Any]] = []
        if expected_branch_name and snapshot["branch_name"] != expected_branch_name:
            classifications.append(
                {
                    "classification": "branch_switch",
                    "path": "",
                    "expected_branch_name": expected_branch_name,
                    "actual_branch_name": snapshot["branch_name"],
                }
            )
        for path in snapshot["ignored_files"]:
            if _path_in_zones(path, zones):
                classifications.append({"classification": "ignored_change", "path": path})
        for path in snapshot["untracked_files"]:
            if _path_in_zones(path, zones):
                classifications.append({"classification": "unregistered_change", "path": path})
        for change in snapshot["tracked_changes"]:
            if "U" in change["status"]:
                classifications.append(
                    {
                        "classification": "merge_conflict",
                        "path": change["path"],
                    }
                )
                continue
            if _is_rename(change):
                old_path = change.get("old_path", change["path"])
                new_path = change.get("new_path", change["path"])
                if _path_in_zones(old_path, zones) or _path_in_zones(new_path, zones):
                    artifact = artifacts.get(old_path)
                    classifications.append(
                        {
                            "classification": "moved_artifact",
                            "path": new_path,
                            "previous_path": old_path,
                            "artifact_id": None if artifact is None else artifact["artifact_id"],
                        }
                    )
                continue
            path = change["path"]
            if not _path_in_zones(path, zones):
                continue
            artifact = artifacts.get(path)
            if "D" in change["status"]:
                classifications.append(
                    {
                        "classification": "deleted_artifact",
                        "path": path,
                        "artifact_id": None if artifact is None else artifact["artifact_id"],
                    }
                )
            elif "M" in change["status"] or "A" in change["status"]:
                classification = (
                    "expected_registered_change"
                    if artifact is not None and path in evidence_paths
                    else "external_tool_drift"
                )
                classifications.append(
                    {
                        "classification": classification,
                        "path": path,
                        "artifact_id": None if artifact is None else artifact["artifact_id"],
                    }
                )
        return classifications

    def _snapshot(self, git_snapshot_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from git_snapshots where git_snapshot_id = ?",
                (git_snapshot_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown git snapshot: {git_snapshot_id}")
        result = dict(row)
        result["tracked_changes"] = json.loads(result.pop("tracked_changes_json"))
        result["untracked_files"] = json.loads(result.pop("untracked_files_json"))
        result["ignored_files"] = json.loads(result.pop("ignored_files_json"))
        return result

    def _artifacts(self, packet_id: str) -> dict[str, dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select * from artifacts where packet_id = ?",
                (packet_id,),
            ).fetchall()
        return {_normalize_path(row["path"]): dict(row) for row in rows}

    def _passed_evidence_paths(self, packet_id: str) -> set[str]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select artifact_path from evidence
                where packet_id = ? and result_status = 'passed'
                """,
                (packet_id,),
            ).fetchall()
        return {_normalize_path(row["artifact_path"]) for row in rows}

    def _reconciliation_exists(self, reconciliation_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from git_reconciliations where reconciliation_id = ?",
                (reconciliation_id,),
            ).fetchone()
        return row is not None


def _drift_items_from_classifications(classifications: list[dict[str, Any]]) -> list[dict[str, Any]]:
    drift_type_by_classification = {
        "unregistered_change": "untracked",
        "moved_artifact": "moved",
        "deleted_artifact": "deleted",
        "external_tool_drift": "external_tool_drift",
        "merge_conflict": "merge_conflict",
    }
    items = []
    for classification in classifications:
        drift_type = drift_type_by_classification.get(classification["classification"])
        if drift_type is None:
            continue
        items.append(
            {
                "path": classification.get("path", ""),
                "previous_path": classification.get("previous_path"),
                "artifact_id": classification.get("artifact_id"),
                "drift_type": drift_type,
            }
        )
    return items


def _reconciliation_row_values(
    reconciliation: dict[str, Any], event: dict[str, Any]
) -> tuple[Any, ...]:
    return (
        reconciliation["reconciliation_id"],
        reconciliation["packet_id"],
        reconciliation["git_snapshot_id"],
        reconciliation["branch_name"],
        reconciliation["commit_id"],
        json.dumps(reconciliation["classifications"], sort_keys=True),
        json.dumps(reconciliation["unresolved_classifications"], sort_keys=True),
        reconciliation["source_event_range"],
        reconciliation["source_watermark"],
        event["event_id"],
        event["event_seq"],
    )


def _reconciliation_from_row(row: dict[str, Any]) -> dict[str, Any]:
    row["classifications"] = json.loads(row.pop("classifications_json"))
    row["unresolved_classifications"] = json.loads(row.pop("unresolved_classifications_json"))
    return row


def _is_rename(change: dict[str, str]) -> bool:
    return "R" in change["status"] or ("old_path" in change and "new_path" in change)


def _normalize_path(path: str) -> str:
    return path.replace("\\", "/").strip().lstrip("./")


def _path_in_zones(path: str, zones: list[str]) -> bool:
    normalized = _normalize_path(path)
    for zone in zones:
        normalized_zone = _normalize_path(zone).rstrip("/")
        if not normalized_zone or normalized_zone == ".":
            return True
        if normalized == normalized_zone or normalized.startswith(f"{normalized_zone}/"):
            return True
    return False
