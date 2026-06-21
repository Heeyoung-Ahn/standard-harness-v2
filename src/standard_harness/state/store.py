"""Repo-embedded SQLite state store."""

from __future__ import annotations

import json
import os
import sqlite3
from contextlib import closing
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from collections.abc import Iterator

from .events import (
    HASH_ALGORITHM,
    SCHEMA_VERSION,
    canonical_json,
    new_event_id,
    new_transaction_id,
    payload_hash,
    utc_now_iso,
)
from .migrations import apply_migrations


class HarnessStore:
    """Small SQLite-backed append-only event store for the MVP."""

    def __init__(self, harness_root: str | Path | None = None):
        self.harness_root = resolve_harness_root(harness_root)
        self.db_path = self.harness_root / ".harness" / "state" / "harness.sqlite3"

    def initialize(self) -> Path:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self.connect()) as conn:
            apply_migrations(conn)
        return self.db_path

    def connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        self.initialize()
        with closing(self.connect()) as conn:
            yield conn

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        self.initialize()
        with closing(self.connect()) as conn:
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise

    def latest_event_seq(self) -> int:
        if not self.db_path.exists():
            return 0
        with closing(self.connect()) as conn:
            row = conn.execute("select coalesce(max(event_seq), 0) as seq from events").fetchone()
        return int(row["seq"])

    def event_for_idempotency_key(self, idempotency_key: str) -> dict[str, Any] | None:
        if not self.db_path.exists():
            return None
        with closing(self.connect()) as conn:
            row = conn.execute(
                "select * from events where idempotency_key = ?", (idempotency_key,)
            ).fetchone()
        if row is None:
            return None
        return _row_to_event(row)

    def append_event(
        self,
        *,
        event_type: str,
        actor_id: str,
        actor_role: str,
        authority_basis: str,
        idempotency_key: str,
        payload: dict[str, Any],
        packet_id: str | None = None,
        packet_version: int | None = None,
        expected_state_version: int | None = None,
        source_snapshot: str | None = None,
        causal_event_id: str | None = None,
        causal_order: int | None = None,
        conn: sqlite3.Connection | None = None,
    ) -> dict[str, Any]:
        payload_json = canonical_json(payload)
        digest = payload_hash(payload)
        if conn is not None:
            row = _append_event_row(
                conn=conn,
                event_type=event_type,
                actor_id=actor_id,
                actor_role=actor_role,
                authority_basis=authority_basis,
                idempotency_key=idempotency_key,
                payload_json=payload_json,
                digest=digest,
                packet_id=packet_id,
                packet_version=packet_version,
                expected_state_version=expected_state_version,
                source_snapshot=source_snapshot,
                causal_event_id=causal_event_id,
                causal_order=causal_order,
            )
            return _row_to_event(row)
        self.initialize()
        with closing(self.connect()) as local_conn:
            row = _append_event_row(
                conn=local_conn,
                event_type=event_type,
                actor_id=actor_id,
                actor_role=actor_role,
                authority_basis=authority_basis,
                idempotency_key=idempotency_key,
                payload_json=payload_json,
                digest=digest,
                packet_id=packet_id,
                packet_version=packet_version,
                expected_state_version=expected_state_version,
                source_snapshot=source_snapshot,
                causal_event_id=causal_event_id,
                causal_order=causal_order,
            )
            local_conn.commit()
        return _row_to_event(row)


def resolve_harness_root(harness_root: str | Path | None = None) -> Path:
    if harness_root is not None:
        return Path(harness_root).resolve()
    env_root = os.environ.get("HARNESS_ROOT")
    if env_root:
        return Path(env_root).resolve()
    return Path.cwd().resolve()


def _row_to_event(row: sqlite3.Row) -> dict[str, Any]:
    result = dict(row)
    result["payload"] = json.loads(result.pop("payload_json"))
    return result


def _append_event_row(
    *,
    conn: sqlite3.Connection,
    event_type: str,
    actor_id: str,
    actor_role: str,
    authority_basis: str,
    idempotency_key: str,
    payload_json: str,
    digest: str,
    packet_id: str | None,
    packet_version: int | None,
    expected_state_version: int | None,
    source_snapshot: str | None,
    causal_event_id: str | None,
    causal_order: int | None,
) -> sqlite3.Row:
    existing = conn.execute(
        "select * from events where idempotency_key = ?", (idempotency_key,)
    ).fetchone()
    if existing is not None:
        return existing

    if expected_state_version is not None:
        current_version = conn.execute(
            "select coalesce(max(event_seq), 0) as seq from events"
        ).fetchone()["seq"]
        if int(current_version) != expected_state_version:
            raise ValueError(
                f"expected_state_version mismatch: expected {expected_state_version}, current {current_version}"
            )

    event_id = new_event_id()
    transaction_id = new_transaction_id()
    occurred_at = utc_now_iso()
    cursor = conn.execute(
        """
        insert into events (
          event_id, event_type, schema_version, occurred_at, actor_id, actor_role,
          authority_basis, transaction_id, causal_event_id, causal_order, packet_id,
          packet_version, expected_state_version, state_version_after, idempotency_key,
          source_snapshot, payload_json, payload_hash, payload_hash_algorithm
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event_id,
            event_type,
            SCHEMA_VERSION,
            occurred_at,
            actor_id,
            actor_role,
            authority_basis,
            transaction_id,
            causal_event_id,
            causal_order,
            packet_id,
            packet_version,
            expected_state_version,
            None,
            idempotency_key,
            source_snapshot,
            payload_json,
            digest,
            HASH_ALGORITHM,
        ),
    )
    event_seq = int(cursor.lastrowid)
    conn.execute(
        "update events set state_version_after = ? where event_seq = ?",
        (event_seq, event_seq),
    )
    return conn.execute("select * from events where event_seq = ?", (event_seq,)).fetchone()
