"""Starter payload manifest registry."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


class StarterManifestService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def register_entry(
        self,
        *,
        path: str,
        artifact_type: str,
        owner: str,
        included_in_payload: bool,
        generated: bool,
        managed_template: bool,
        promotion_source: str,
        validation_evidence: list[str],
        idempotency_key: str,
    ) -> dict[str, Any]:
        entry = {
            "path": path,
            "artifact_type": artifact_type,
            "owner": owner,
            "included_in_payload": included_in_payload,
            "generated": generated,
            "managed_template": managed_template,
            "promotion_source": promotion_source,
            "validation_evidence": validation_evidence,
        }
        trace_event = self.store.append_event(
            event_type="starter.entry_registered",
            actor_id=owner,
            actor_role="Maintainer",
            authority_basis="starter manifest registration",
            idempotency_key=idempotency_key,
            payload=entry,
        )
        entry["trace_event_id"] = trace_event["event_id"]
        entry["trace_event_seq"] = trace_event["event_seq"]
        with self.store.connection() as conn:
            conn.execute(
                """
                insert or ignore into starter_manifest_entries (
                  path, artifact_type, owner, included_in_payload, generated,
                  managed_template, promotion_source, validation_evidence_json,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    path,
                    artifact_type,
                    owner,
                    1 if included_in_payload else 0,
                    1 if generated else 0,
                    1 if managed_template else 0,
                    promotion_source,
                    json.dumps(validation_evidence, sort_keys=True),
                    trace_event["event_id"],
                    trace_event["event_seq"],
                ),
            )
            conn.commit()
        return self.get_entry(path)

    def get_entry(self, path: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from starter_manifest_entries where path = ?", (path,)
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown starter manifest entry: {path}")
        result = dict(row)
        result["included_in_payload"] = bool(result["included_in_payload"])
        result["generated"] = bool(result["generated"])
        result["managed_template"] = bool(result["managed_template"])
        result["validation_evidence"] = json.loads(result.pop("validation_evidence_json"))
        return result
