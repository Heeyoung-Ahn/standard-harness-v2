"""Local HMAC signing for high-integrity test contracts."""

from __future__ import annotations

import hmac
from typing import Any

from standard_harness.state.events import sha256_text, utc_now_iso
from standard_harness.state.store import HarnessStore


SIGNATURE_ALGORITHM = "hmac-sha256-local"


class SigningService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def sign_event(
        self,
        *,
        signature_id: str,
        event_seq: int,
        key_id: str,
        secret: str,
        signer_id: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_signature(signature_id)
        event = self._event(event_seq)
        payload_hash = _event_payload_hash(event)
        signature = {
            "signature_id": signature_id,
            "signed_entity_type": "event",
            "signed_entity_id": event["event_id"],
            "algorithm": SIGNATURE_ALGORITHM,
            "key_id": key_id,
            "payload_hash": payload_hash,
            "signature_value": _hmac_signature(secret, payload_hash),
            "signed_at": utc_now_iso(),
            "signer_id": signer_id,
            "source_watermark": self.store.latest_event_seq(),
        }
        with self.store.transaction() as conn:
            trace = self.store.append_event(
                event_type="integrity.signature_recorded",
                actor_id=signer_id,
                actor_role="Signer",
                authority_basis="local HMAC integrity signature",
                idempotency_key=idempotency_key,
                payload=signature,
                conn=conn,
            )
            conn.execute(
                """
                insert into integrity_signatures (
                  signature_id, signed_entity_type, signed_entity_id,
                  algorithm, key_id, payload_hash, signature_value,
                  signed_at, signer_id, source_watermark, trace_event_id,
                  trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _signature_values(signature, trace),
            )
        return self.get_signature(signature_id)

    def get_signature(self, signature_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from integrity_signatures where signature_id = ?",
                (signature_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown signature: {signature_id}")
        return dict(row)

    def _event(self, event_seq: int) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from events where event_seq = ?",
                (event_seq,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown event_seq: {event_seq}")
        return dict(row)


def _event_payload_hash(event: dict[str, Any]) -> str:
    return sha256_text(str(event["payload_json"]))


def _hmac_signature(secret: str, payload_hash: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload_hash.encode("utf-8"), "sha256").hexdigest()


def _signature_values(signature: dict[str, Any], trace: dict[str, Any]) -> tuple[Any, ...]:
    return (
        signature["signature_id"],
        signature["signed_entity_type"],
        signature["signed_entity_id"],
        signature["algorithm"],
        signature["key_id"],
        signature["payload_hash"],
        signature["signature_value"],
        signature["signed_at"],
        signature["signer_id"],
        signature["source_watermark"],
        trace["event_id"],
        trace["event_seq"],
    )
