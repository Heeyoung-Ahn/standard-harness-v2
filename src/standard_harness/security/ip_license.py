"""IP and license provenance governance."""

from __future__ import annotations

from typing import Any

from standard_harness.state.store import HarnessStore


class IPLicenseService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def record_source(
        self,
        *,
        ip_record_id: str,
        source: str,
        license_or_usage_basis: str,
        generated_vs_copied: str,
        attribution_need: str,
        uncertainty: str,
        release_blocking_status: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_source(ip_record_id)
        record = {
            "ip_record_id": ip_record_id,
            "source": source,
            "license_or_usage_basis": license_or_usage_basis,
            "generated_vs_copied": generated_vs_copied,
            "attribution_need": attribution_need,
            "uncertainty": uncertainty,
            "release_blocking_status": release_blocking_status,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="ip_license.recorded",
                actor_id="security",
                actor_role="System",
                authority_basis="ip license governance",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into ip_license_records (
                  ip_record_id, source, license_or_usage_basis, generated_vs_copied,
                  attribution_need, uncertainty, release_blocking_status,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ip_record_id,
                    source,
                    license_or_usage_basis,
                    generated_vs_copied,
                    attribution_need,
                    uncertainty,
                    release_blocking_status,
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return self.get_source(ip_record_id)

    def get_source(self, ip_record_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from ip_license_records where ip_record_id = ?",
                (ip_record_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown IP/license record: {ip_record_id}")
        return dict(row)

    def evaluate_release(self) -> dict[str, Any]:
        diagnostics = []
        with self.store.connection() as conn:
            rows = conn.execute("select * from ip_license_records").fetchall()
        for row in rows:
            basis = str(row["license_or_usage_basis"]).lower()
            if (
                row["release_blocking_status"] == "blocked"
                or row["uncertainty"] == "high"
                or basis in {"", "unclear", "unknown"}
            ):
                diagnostics.append("unclear_license_provenance")
                break
        return {"status": "blocked" if diagnostics else "accepted", "diagnostic_ids": diagnostics}

