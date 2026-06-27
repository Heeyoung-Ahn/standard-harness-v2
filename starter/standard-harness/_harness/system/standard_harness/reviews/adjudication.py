"""Challenge review and adjudication lifecycle."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


class ChallengeReviewService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def open_challenge(
        self,
        *,
        challenge_id: str,
        challenged_item_id: str,
        reviewer_role: str,
        rationale: str,
        idempotency_key: str,
        packet_id: str | None = None,
        triggers: list[str] | None = None,
        decision_id: str | None = None,
        reviewed_checks: list[str] | None = None,
    ) -> dict[str, Any]:
        record = {
            "challenge_id": challenge_id,
            "challenged_item_id": challenged_item_id,
            "packet_id": packet_id,
            "triggers": triggers or [],
            "decision_id": decision_id,
            "reviewed_checks": reviewed_checks or [],
            "reviewer_role": reviewer_role,
            "rationale": rationale,
            "status": "open",
        }
        return self._record(
            table="challenges",
            key_column="challenge_id",
            key_value=challenge_id,
            event_type="challenge_opened",
            idempotency_key=idempotency_key,
            payload=record,
        )

    def record_independent_review(
        self,
        *,
        review_id: str,
        challenge_id: str,
        reviewer_role: str,
        outcome: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        challenge = self._challenge(challenge_id)
        if challenge is None:
            raise ValueError(f"Unknown challenge: {challenge_id}")
        if reviewer_role == challenge.get("challenged_actor_role"):
            raise ValueError("Independent review requires an independent reviewer")
        if reviewer_role != "Independent Reviewer":
            raise ValueError("Independent review requires Independent Reviewer role")
        record = {
            "review_id": review_id,
            "challenge_id": challenge_id,
            "reviewer_role": reviewer_role,
            "outcome": outcome,
        }
        return self._record(
            table="independent_reviews",
            key_column="review_id",
            key_value=review_id,
            event_type="independent_review_recorded",
            idempotency_key=idempotency_key,
            payload=record,
        )

    def record_adjudication(
        self,
        *,
        adjudication_id: str,
        challenge_id: str,
        outcome: str,
        follow_up_event_ids: list[str],
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self._challenge(challenge_id) is None:
            raise ValueError(f"Unknown challenge: {challenge_id}")
        if not self._has_review(challenge_id):
            raise ValueError("Adjudication requires an independent review first")
        for event_id in follow_up_event_ids:
            if not self._event_exists(event_id):
                raise ValueError(f"Unknown follow-up event: {event_id}")
        record = {
            "adjudication_id": adjudication_id,
            "challenge_id": challenge_id,
            "outcome": outcome,
            "follow_up_event_ids": follow_up_event_ids,
        }
        return self._record(
            table="adjudications",
            key_column="adjudication_id",
            key_value=adjudication_id,
            event_type="adjudication_recorded",
            idempotency_key=idempotency_key,
            payload=record,
        )

    def _record(
        self,
        *,
        table: str,
        key_column: str,
        key_value: str,
        event_type: str,
        idempotency_key: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        existing = self.store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            return existing["payload"]
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type=event_type,
                actor_id="review",
                actor_role="Reviewer",
                authority_basis="challenge review lifecycle",
                idempotency_key=idempotency_key,
                payload=payload,
                conn=conn,
            )
            columns = [key_column, "payload_json", "trace_event_id", "trace_event_seq"]
            conn.execute(
                f"""
                insert into {table} ({', '.join(columns)})
                values (?, ?, ?, ?)
                """,
                (key_value, json.dumps(payload, sort_keys=True), event["event_id"], event["event_seq"]),
            )
        return payload

    def _challenge(self, challenge_id: str) -> dict[str, Any] | None:
        with self.store.connection() as conn:
            row = conn.execute(
                "select payload_json from challenges where challenge_id = ?",
                (challenge_id,),
            ).fetchone()
        return None if row is None else json.loads(row["payload_json"])

    def _has_review(self, challenge_id: str) -> bool:
        with self.store.connection() as conn:
            rows = conn.execute("select payload_json from independent_reviews").fetchall()
        return any(json.loads(row["payload_json"]).get("challenge_id") == challenge_id for row in rows)

    def _event_exists(self, event_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from events where event_id = ?",
                (event_id,),
            ).fetchone()
        return row is not None
