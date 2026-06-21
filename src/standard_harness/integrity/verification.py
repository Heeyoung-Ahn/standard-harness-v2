"""High-integrity signature verification."""

from __future__ import annotations

import hmac
from typing import Any

from standard_harness.integrity.signing import _event_payload_hash, _hmac_signature
from standard_harness.state.store import HarnessStore


class SignatureVerificationService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def verify_signature(self, *, signature_id: str, secret: str) -> dict[str, Any]:
        signature = self._signature(signature_id)
        event = self._event(str(signature["signed_entity_id"]))
        actual_payload_hash = _event_payload_hash(event)
        diagnostic_ids = []
        if actual_payload_hash != signature["payload_hash"]:
            diagnostic_ids.append("payload_hash_mismatch")
        expected_signature = _hmac_signature(secret, actual_payload_hash)
        if not hmac.compare_digest(expected_signature, str(signature["signature_value"])):
            diagnostic_ids.append("signature_value_mismatch")
        return {
            "signature_id": signature_id,
            "status": "verified" if not diagnostic_ids else "failed",
            "diagnostic_ids": diagnostic_ids,
        }

    def missing_packet_event_signatures(self, packet_id: str) -> list[str]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select event_id from events
                where packet_id = ?
                order by event_seq
                """,
                (packet_id,),
            ).fetchall()
            signed = {
                row["signed_entity_id"]
                for row in conn.execute(
                    """
                    select signed_entity_id from integrity_signatures
                    where signed_entity_type = 'event'
                    """
                ).fetchall()
            }
        return [row["event_id"] for row in rows if row["event_id"] not in signed]

    def invalid_packet_event_signatures(self, packet_id: str) -> list[str]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select event_id, payload_json from events
                where packet_id = ?
                order by event_seq
                """,
                (packet_id,),
            ).fetchall()
            signature_rows = conn.execute(
                """
                select signed_entity_id, payload_hash from integrity_signatures
                where signed_entity_type = 'event'
                """
            ).fetchall()
        signed_hashes: dict[str, set[str]] = {}
        for row in signature_rows:
            signed_hashes.setdefault(str(row["signed_entity_id"]), set()).add(
                str(row["payload_hash"])
            )
        invalid = []
        for row in rows:
            event_id = str(row["event_id"])
            if event_id not in signed_hashes:
                continue
            if _event_payload_hash(dict(row)) not in signed_hashes[event_id]:
                invalid.append(event_id)
        return invalid

    def _signature(self, signature_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from integrity_signatures where signature_id = ?",
                (signature_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown signature: {signature_id}")
        return dict(row)

    def _event(self, event_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from events where event_id = ?",
                (event_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown signed event: {event_id}")
        return dict(row)
