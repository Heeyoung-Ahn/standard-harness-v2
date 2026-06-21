"""Packet-owned filesystem drift detection."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from standard_harness.domain.packets import PacketService
from standard_harness.gitops.snapshots import collect_git_status
from standard_harness.state.store import HarnessStore


OPEN_STATUS = "open"
RESOLVED_STATUS = "resolved"


class FilesystemDriftService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def detect_packet_drift(
        self,
        *,
        drift_id: str,
        packet_id: str,
        repo_root: str | Path,
        idempotency_key: str,
        use_git: bool = True,
    ) -> dict[str, Any]:
        existing = self._records_for_drift(drift_id)
        if existing:
            return self._report(drift_id=drift_id, packet_id=packet_id, source=existing[0]["source"])
        packet = PacketService(self.store).get_packet(packet_id)
        repo = Path(repo_root).resolve()
        artifacts = self._artifacts(packet_id)
        if use_git:
            try:
                items = self._detect_with_git(packet, repo, artifacts)
                source = "git_status"
            except RuntimeError:
                items = self._detect_with_filesystem(packet, repo, artifacts)
                source = "filesystem_scan"
        else:
            items = self._detect_with_filesystem(packet, repo, artifacts)
            source = "filesystem_scan"
        self.record_drift_items(
            drift_id=drift_id,
            packet_id=packet_id,
            items=items,
            idempotency_prefix=idempotency_key,
            source=source,
        )
        return self._report(drift_id=drift_id, packet_id=packet_id, source=source)

    def record_drift_items(
        self,
        *,
        drift_id: str,
        packet_id: str,
        items: list[dict[str, Any]],
        idempotency_prefix: str,
        source: str,
    ) -> list[dict[str, Any]]:
        if self._records_for_drift(drift_id):
            return self._records_for_drift(drift_id)
        records = []
        seen: set[tuple[str, str, str | None]] = set()
        for index, item in enumerate(items, start=1):
            normalized = _drift_record(
                drift_id=drift_id,
                packet_id=packet_id,
                item=item,
                index=index,
                source=source,
            )
            key = (
                str(normalized["path"]),
                str(normalized["drift_type"]),
                normalized.get("artifact_id"),
            )
            if key in seen:
                continue
            seen.add(key)
            with self.store.transaction() as conn:
                event = self.store.append_event(
                    event_type="filesystem_drift_detected",
                    actor_id="filesystem",
                    actor_role="System",
                    authority_basis="filesystem drift detection",
                    idempotency_key=f"{idempotency_prefix}-{normalized['drift_record_id']}",
                    packet_id=packet_id,
                    payload=normalized,
                    conn=conn,
                )
                conn.execute(
                    """
                    insert or ignore into filesystem_drifts (
                      drift_record_id, drift_id, packet_id, artifact_id, path,
                      drift_type, remediation_json, resolution_status, source,
                      source_event_range, source_watermark, trace_event_id, trace_event_seq
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    _drift_row_values(normalized, event),
                )
            records.append(normalized)
        return records

    def resolve_drift(
        self,
        *,
        resolution_id: str,
        packet_id: str,
        drift_record_ids: list[str],
        rationale: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return {"resolution_id": resolution_id, "status": RESOLVED_STATUS}
        payload = {
            "resolution_id": resolution_id,
            "packet_id": packet_id,
            "drift_record_ids": drift_record_ids,
            "resolution_status": RESOLVED_STATUS,
            "rationale": rationale,
        }
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="filesystem_drift_resolved",
                actor_id="reviewer",
                actor_role="Reviewer",
                authority_basis="filesystem drift resolution",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=payload,
                conn=conn,
            )
            for drift_record_id in drift_record_ids:
                conn.execute(
                    """
                    update filesystem_drifts
                    set resolution_status = ?
                    where drift_record_id = ? and packet_id = ?
                    """,
                    (RESOLVED_STATUS, drift_record_id, packet_id),
                )
        return payload

    def unresolved_drift(self, packet_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select * from filesystem_drifts
                where packet_id = ? and resolution_status = ?
                order by trace_event_seq, drift_record_id
                """,
                (packet_id, OPEN_STATUS),
            ).fetchall()
        return [_drift_from_row(dict(row)) for row in rows]

    def _detect_with_git(
        self,
        packet: dict[str, Any],
        repo: Path,
        artifacts: dict[str, dict[str, Any]],
    ) -> list[dict[str, Any]]:
        status = collect_git_status(repo, include_ignored=False)
        items: list[dict[str, Any]] = []
        zones = [str(zone) for zone in packet["change_zones"]]
        for path in status["untracked_files"]:
            if _path_in_zones(path, zones):
                items.append({"path": path, "drift_type": "untracked"})
        for change in status["tracked_changes"]:
            if _is_rename(change):
                old_path = change.get("old_path", change["path"])
                new_path = change.get("new_path", change["path"])
                if _path_in_zones(old_path, zones) or _path_in_zones(new_path, zones):
                    artifact = artifacts.get(old_path)
                    items.append(
                        {
                            "path": new_path,
                            "previous_path": old_path,
                            "drift_type": "moved",
                            "artifact_id": None if artifact is None else artifact["artifact_id"],
                        }
                    )
                continue
            path = change["path"]
            if not _path_in_zones(path, zones):
                continue
            artifact = artifacts.get(path)
            if "D" in change["status"]:
                items.append(
                    {
                        "path": path,
                        "drift_type": "deleted",
                        "artifact_id": None if artifact is None else artifact["artifact_id"],
                    }
                )
            elif "M" in change["status"] or "A" in change["status"]:
                items.append(
                    {
                        "path": path,
                        "drift_type": "modified",
                        "artifact_id": None if artifact is None else artifact["artifact_id"],
                    }
                )
        items.extend(self._missing_artifact_items(packet, repo, artifacts, existing_items=items))
        return items

    def _detect_with_filesystem(
        self,
        packet: dict[str, Any],
        repo: Path,
        artifacts: dict[str, dict[str, Any]],
    ) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        zones = [str(zone) for zone in packet["change_zones"]]
        registered_paths = set(artifacts)
        scanned_paths = _scan_packet_zone_files(repo, zones)
        moved_by_original = self._hash_moved_artifacts(repo, scanned_paths, artifacts)
        moved_targets = set(moved_by_original.values())
        for path, artifact in artifacts.items():
            if path in moved_by_original:
                items.append(
                    {
                        "path": moved_by_original[path],
                        "previous_path": path,
                        "drift_type": "moved",
                        "artifact_id": artifact["artifact_id"],
                    }
                )
                continue
            candidate = repo / path
            if candidate.exists() and artifact.get("content_hash"):
                current_hash = _file_hash(candidate)
                if current_hash and current_hash != artifact["content_hash"]:
                    items.append(
                        {
                            "path": path,
                            "drift_type": "modified",
                            "artifact_id": artifact["artifact_id"],
                        }
                    )
        for path in _scan_packet_zone_files(repo, zones):
            if path not in registered_paths and path not in moved_targets:
                items.append({"path": path, "drift_type": "untracked"})
        items.extend(self._missing_artifact_items(packet, repo, artifacts, existing_items=items))
        return items

    def _hash_moved_artifacts(
        self,
        repo: Path,
        scanned_paths: list[str],
        artifacts: dict[str, dict[str, Any]],
    ) -> dict[str, str]:
        candidates_by_hash: dict[str, list[str]] = {}
        registered_paths = set(artifacts)
        for path in scanned_paths:
            if path in registered_paths:
                continue
            digest = _file_hash(repo / path)
            if digest:
                candidates_by_hash.setdefault(digest, []).append(path)
        moved = {}
        for artifact_path, artifact in artifacts.items():
            baseline_hash = artifact.get("content_hash")
            if not baseline_hash or (repo / artifact_path).exists():
                continue
            candidates = sorted(candidates_by_hash.get(str(baseline_hash), []))
            if candidates:
                moved[artifact_path] = candidates[0]
        return moved

    def _missing_artifact_items(
        self,
        packet: dict[str, Any],
        repo: Path,
        artifacts: dict[str, dict[str, Any]],
        existing_items: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        zones = [str(zone) for zone in packet["change_zones"]]
        existing_deleted = set()
        for item in existing_items:
            if item["drift_type"] == "deleted":
                existing_deleted.add(item["path"])
            elif item["drift_type"] == "moved":
                existing_deleted.add(item.get("previous_path") or item["path"])
        items = []
        for path, artifact in artifacts.items():
            if path in existing_deleted or not _path_in_zones(path, zones):
                continue
            if not artifact.get("content_hash") and artifact.get("lifecycle_status") != "generated":
                continue
            if not (repo / path).exists():
                moved_path = _find_same_basename(repo, zones, path)
                if moved_path:
                    items.append(
                        {
                            "path": moved_path,
                            "previous_path": path,
                            "drift_type": "moved",
                            "artifact_id": artifact["artifact_id"],
                        }
                    )
                else:
                    items.append(
                        {
                            "path": path,
                            "drift_type": "deleted",
                            "artifact_id": artifact["artifact_id"],
                        }
                    )
        return items

    def _artifacts(self, packet_id: str) -> dict[str, dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select * from artifacts where packet_id = ?",
                (packet_id,),
            ).fetchall()
        return {_normalize_path(row["path"]): dict(row) for row in rows}

    def _records_for_drift(self, drift_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select * from filesystem_drifts
                where drift_id = ?
                order by trace_event_seq, drift_record_id
                """,
                (drift_id,),
            ).fetchall()
        return [_drift_from_row(dict(row)) for row in rows]

    def _report(self, *, drift_id: str, packet_id: str, source: str) -> dict[str, Any]:
        return {
            "drift_id": drift_id,
            "packet_id": packet_id,
            "source": source,
            "drifts": self._records_for_drift(drift_id),
        }


def _drift_record(
    *,
    drift_id: str,
    packet_id: str,
    item: dict[str, Any],
    index: int,
    source: str,
) -> dict[str, Any]:
    path = _normalize_path(str(item["path"]))
    drift_type = str(item["drift_type"])
    artifact_id = item.get("artifact_id")
    return {
        "drift_record_id": f"{drift_id}-{index:03d}",
        "drift_id": drift_id,
        "packet_id": packet_id,
        "artifact_id": artifact_id,
        "path": path,
        "previous_path": item.get("previous_path"),
        "drift_type": drift_type,
        "remediation": _remediation(drift_type, path, artifact_id),
        "resolution_status": OPEN_STATUS,
        "source": source,
    }


def _remediation(drift_type: str, path: str, artifact_id: str | None) -> dict[str, Any]:
    actions_by_type = {
        "untracked": ["register_artifact", "remove_file", "move_out_of_packet_zone"],
        "modified": ["record_evidence", "revert_or_register_expected_change"],
        "deleted": ["restore_file", "retire_artifact_registration"],
        "moved": ["update_artifact_path", "restore_original_path"],
        "external_tool_drift": ["record_tool_provenance", "reconcile_or_revert"],
        "merge_conflict": ["resolve_conflict", "record_reconciliation"],
    }
    return {
        "diagnostic_id": "filesystem_drift_unresolved",
        "path": path,
        "artifact_id": artifact_id,
        "drift_type": drift_type,
        "suggested_actions": actions_by_type.get(drift_type, ["review_drift"]),
    }


def _drift_row_values(record: dict[str, Any], event: dict[str, Any]) -> tuple[Any, ...]:
    source_watermark = int(event["event_seq"]) - 1
    return (
        record["drift_record_id"],
        record["drift_id"],
        record["packet_id"],
        record.get("artifact_id"),
        record["path"],
        record["drift_type"],
        json.dumps(record["remediation"], sort_keys=True),
        record["resolution_status"],
        record["source"],
        "0-0" if source_watermark <= 0 else f"1-{source_watermark}",
        source_watermark,
        event["event_id"],
        event["event_seq"],
    )


def _drift_from_row(row: dict[str, Any]) -> dict[str, Any]:
    row["remediation"] = json.loads(row.pop("remediation_json"))
    return row


def _scan_packet_zone_files(repo: Path, zones: list[str]) -> list[str]:
    paths = []
    for zone in zones:
        zone_path = repo / _normalize_path(zone)
        if not zone_path.exists():
            continue
        if zone_path.is_file():
            paths.append(_relative_path(repo, zone_path))
            continue
        for path in zone_path.rglob("*"):
            if path.is_file() and ".git" not in path.parts:
                paths.append(_relative_path(repo, path))
    return sorted(set(paths))


def _find_same_basename(repo: Path, zones: list[str], missing_path: str) -> str | None:
    target_name = Path(missing_path).name
    for path in _scan_packet_zone_files(repo, zones):
        if path != missing_path and Path(path).name == target_name:
            return path
    return None


def _is_rename(change: dict[str, str]) -> bool:
    return "R" in change["status"] or ("old_path" in change and "new_path" in change)


def _relative_path(repo: Path, path: Path) -> str:
    return _normalize_path(str(path.resolve().relative_to(repo.resolve())))


def _file_hash(path: Path) -> str | None:
    try:
        if not path.is_file():
            return None
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError:
        return None


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
