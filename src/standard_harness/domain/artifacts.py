"""Artifact registry."""

from __future__ import annotations

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
        self.store.append_event(
            event_type="artifact.registered",
            actor_id=owner,
            actor_role=owner,
            authority_basis="manual artifact registration",
            idempotency_key=idempotency_key,
            packet_id=packet_id,
            payload=artifact,
        )
        with self.store.connection() as conn:
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
            conn.commit()
        return self.get_artifact(artifact_id)

    def get_artifact(self, artifact_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from artifacts where artifact_id = ?", (artifact_id,)
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown artifact: {artifact_id}")
        return dict(row)
