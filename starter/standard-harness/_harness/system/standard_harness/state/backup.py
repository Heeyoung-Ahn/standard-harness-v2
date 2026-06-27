"""Local JSON backup and restore for canonical state events."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any
from uuid import uuid4

from standard_harness.state import migrations
from standard_harness.state.compatibility import CompatibilityPolicy
from standard_harness.state.events import canonical_json, sha256_text, utc_now_iso
from standard_harness.state.replay import StateReplayService
from standard_harness.state.store import HarnessStore


class StateBackupService:
    """Create and restore deterministic local backups of the event log."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def create_backup(self, backup_path: str | Path) -> dict[str, Any]:
        self.store.initialize()
        path = Path(backup_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        backup_id = f"bak_{uuid4().hex}"
        with self.store.connection() as conn:
            event_rows = [
                dict(row)
                for row in conn.execute("select * from events order by event_seq").fetchall()
            ]
            projection_checksum = _projection_checksum(conn)
        event_seq_order = [int(row["event_seq"]) for row in event_rows]
        data = {
            "backup_id": backup_id,
            "schema_version": migrations.schema_version(),
            "created_at": utc_now_iso(),
            "event_seq_order": event_seq_order,
            "projection_checksum": projection_checksum,
            "events": event_rows,
        }
        backup_checksum = sha256_text(canonical_json(data))
        data["backup_checksum"] = backup_checksum
        path.write_text(json.dumps(data, sort_keys=True, indent=2), encoding="utf-8")
        source_event_range = _source_event_range(event_seq_order[-1] if event_seq_order else 0)
        payload = {
            "backup_id": backup_id,
            "backup_path": str(path),
            "schema_version": data["schema_version"],
            "event_seq_range": source_event_range,
            "event_count": len(event_rows),
            "projection_checksum": projection_checksum,
            "backup_checksum": backup_checksum,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="backup_created",
                actor_id="backup",
                actor_role="System",
                authority_basis="state backup",
                idempotency_key=f"backup-created-{backup_id}",
                payload=payload,
                conn=conn,
            )
            conn.execute(
                """
                insert or replace into state_backups (
                  backup_id, backup_path, schema_version, event_seq_range,
                  event_count, projection_checksum, backup_checksum,
                  created_event_id, created_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    backup_id,
                    str(path),
                    payload["schema_version"],
                    payload["event_seq_range"],
                    payload["event_count"],
                    payload["projection_checksum"],
                    payload["backup_checksum"],
                    event["event_id"],
                    data["created_at"],
                ),
            )
        return {
            **payload,
            "event_seq_order": event_seq_order,
            "backup_checksum": backup_checksum,
        }

    def restore_backup(self, backup_path: str | Path) -> dict[str, Any]:
        self.store.initialize()
        path = Path(backup_path)
        data = json.loads(path.read_text(encoding="utf-8"))
        _validate_backup_payload(data)
        compatibility = CompatibilityPolicy(migrations.schema_version()).check_schema(
            str(data["schema_version"])
        )
        if compatibility["status"] != "compatible":
            raise ValueError(f"incompatible backup schema: {data['schema_version']}")
        events = data["events"]
        restored_event_seq_order = [int(row["event_seq"]) for row in events]
        with self.store.connection() as conn:
            existing = conn.execute("select count(*) as count from events").fetchone()["count"]
        if int(existing) != 0:
            raise ValueError("restore requires an empty event log")
        with tempfile.TemporaryDirectory() as validation_tmp:
            validation_store = HarnessStore(Path(validation_tmp))
            validation_store.initialize()
            with validation_store.transaction() as conn:
                _insert_event_rows(conn, events)
            replay = StateReplayService(validation_store).rebuild_materialized_state(
                through_event_seq=restored_event_seq_order[-1] if restored_event_seq_order else 0
            )
            if replay["status"] != "rebuilt":
                raise ValueError("restore replay failed")
        with self.store.transaction() as conn:
            _insert_event_rows(conn, events)
            StateReplayService(self.store).rebuild_materialized_state(
                through_event_seq=restored_event_seq_order[-1] if restored_event_seq_order else 0,
                conn=conn,
            )
        restore_id = f"rst_{uuid4().hex}"
        restore_checksum = sha256_text(
            canonical_json(
                {
                    "backup_checksum": data["backup_checksum"],
                    "event_seq_order": restored_event_seq_order,
                    "projection_checksum": data["projection_checksum"],
                    "schema_version": data["schema_version"],
                }
            )
        )
        payload = {
            "restore_id": restore_id,
            "backup_id": data["backup_id"],
            "schema_version": data["schema_version"],
            "restored_event_seq_order": restored_event_seq_order,
            "projection_checksum": data["projection_checksum"],
            "restore_checksum": restore_checksum,
            "restore_status": "verified",
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="restore_verified",
                actor_id="restore",
                actor_role="System",
                authority_basis="state restore",
                idempotency_key=f"restore-verified-{restore_id}",
                payload=payload,
                conn=conn,
            )
            conn.execute(
                """
                insert or replace into restore_verifications (
                  restore_id, backup_id, schema_version,
                  restored_event_seq_order_json, projection_checksum,
                  restore_checksum, restore_status, verified_event_id,
                  verified_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    restore_id,
                    data["backup_id"],
                    data["schema_version"],
                    json.dumps(restored_event_seq_order, sort_keys=True),
                    data["projection_checksum"],
                    restore_checksum,
                    "verified",
                    event["event_id"],
                    utc_now_iso(),
                ),
            )
        return payload


def _projection_checksum(conn) -> str:
    rows = conn.execute(
        "select dependency_digest from projections order by trace_event_seq"
    ).fetchall()
    digests = [row["dependency_digest"] for row in rows]
    if len(digests) == 1:
        return digests[0]
    return sha256_text(canonical_json(digests))


def _source_event_range(source_watermark: int) -> str:
    if source_watermark <= 0:
        return "0-0"
    return f"1-{source_watermark}"


def _validate_backup_payload(data: dict[str, Any]) -> None:
    expected_checksum = data.get("backup_checksum")
    actual_checksum = sha256_text(
        canonical_json({key: value for key, value in data.items() if key != "backup_checksum"})
    )
    if expected_checksum != actual_checksum:
        raise ValueError("backup checksum mismatch")
    events = data.get("events", [])
    order = [int(row["event_seq"]) for row in events]
    if order != sorted(order):
        raise ValueError("backup event order is not monotonic")
    if order != list(range(1, len(order) + 1)):
        raise ValueError("backup event sequence is not contiguous")
    if order != [int(seq) for seq in data.get("event_seq_order", [])]:
        raise ValueError("backup event order metadata mismatch")
    for row in events:
        if sha256_text(row["payload_json"]) != row["payload_hash"]:
            raise ValueError(f"event payload hash mismatch: {row['event_id']}")


def _insert_event_rows(conn, events: list[dict[str, Any]]) -> None:
    existing = conn.execute("select count(*) as count from events").fetchone()["count"]
    if int(existing) != 0:
        raise ValueError("restore requires an empty event log")
    for row in events:
        conn.execute(
            """
            insert into events (
              event_seq, event_id, event_type, schema_version, occurred_at,
              actor_id, actor_role, authority_basis, transaction_id,
              causal_event_id, causal_order, packet_id, packet_version,
              expected_state_version, state_version_after, idempotency_key,
              source_snapshot, payload_json, payload_hash,
              payload_hash_algorithm
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["event_seq"],
                row["event_id"],
                row["event_type"],
                row["schema_version"],
                row["occurred_at"],
                row["actor_id"],
                row["actor_role"],
                row["authority_basis"],
                row["transaction_id"],
                row["causal_event_id"],
                row["causal_order"],
                row["packet_id"],
                row["packet_version"],
                row["expected_state_version"],
                row["state_version_after"],
                row["idempotency_key"],
                row["source_snapshot"],
                row["payload_json"],
                row["payload_hash"],
                row["payload_hash_algorithm"],
            ),
        )
