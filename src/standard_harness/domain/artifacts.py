"""Artifact registry."""

from __future__ import annotations

from standard_harness.domain.packets import PacketService
from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


class ArtifactRegistry:
    def __init__(self, store: HarnessStore):
        self.store = store

    def register_artifact(
        self,
        *,
        artifact_id: str,
        artifact_type: str,
        path: str,
        owner: str,
        lifecycle_status: str,
        source_reference: str,
        packet_id: str,
        idempotency_key: str,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_artifact(artifact_id)
        if self._artifact_exists(artifact_id):
            raise ValueError(f"artifact_id already exists: {artifact_id}")
        try:
            PacketService(self.store).get_packet(packet_id)
        except KeyError as exc:
            raise ValueError(f"Unknown packet: {packet_id}") from exc
        now = utc_now_iso()
        artifact = {
            "artifact_id": artifact_id,
            "artifact_type": artifact_type,
            "path": path,
            "owner": owner,
            "lifecycle_status": lifecycle_status,
            "source_reference": source_reference,
            "packet_id": packet_id,
            "created_at": now,
            "updated_at": now,
        }
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="artifact.registered",
                actor_id=owner,
                actor_role=owner,
                authority_basis="manual artifact registration",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=artifact,
                conn=conn,
            )
            conn.execute(
                """
                insert or ignore into artifacts (
                  artifact_id, artifact_type, path, owner, lifecycle_status,
                  source_reference, packet_id, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    artifact_id,
                    artifact_type,
                    path,
                    owner,
                    lifecycle_status,
                    source_reference,
                    packet_id,
                    now,
                    now,
                ),
            )
        return self.get_artifact(artifact_id)

    def get_artifact(self, artifact_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from artifacts where artifact_id = ?", (artifact_id,)
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown artifact: {artifact_id}")
        return dict(row)

    def _artifact_exists(self, artifact_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from artifacts where artifact_id = ?", (artifact_id,)
            ).fetchone()
        return row is not None
