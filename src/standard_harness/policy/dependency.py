"""Dependency intake governance."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


class DependencyIntakeService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def record_dependency(
        self,
        *,
        dependency_id: str,
        name: str,
        version: str,
        source: str,
        license_basis: str,
        install_scripts: list[str],
        network_behavior: str,
        trust_tier: str,
        waiver_expiry: str | None,
        rollback_path: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_dependency(dependency_id)
        evaluation = self.evaluate_intake(
            source=source,
            license_basis=license_basis,
            install_scripts=install_scripts,
            network_behavior=network_behavior,
            trust_tier=trust_tier,
            rollback_path=rollback_path,
        )
        dependency = {
            "dependency_id": dependency_id,
            "name": name,
            "version": version,
            "source": source,
            "license_basis": license_basis,
            "install_scripts": install_scripts,
            "network_behavior": network_behavior,
            "trust_tier": trust_tier,
            "waiver_expiry": waiver_expiry,
            "rollback_path": rollback_path,
            "intake_status": evaluation["status"],
            "diagnostic_ids": evaluation["diagnostic_ids"],
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="dependency.recorded",
                actor_id="policy",
                actor_role="System",
                authority_basis="dependency intake",
                idempotency_key=idempotency_key,
                payload=dependency,
                conn=conn,
            )
            conn.execute(
                """
                insert into dependencies (
                  dependency_id, name, version, source, license_basis,
                  install_scripts_json, network_behavior, trust_tier, waiver_expiry,
                  rollback_path, intake_status, diagnostic_ids_json,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    dependency_id,
                    name,
                    version,
                    source,
                    license_basis,
                    json.dumps(install_scripts, sort_keys=True),
                    network_behavior,
                    trust_tier,
                    waiver_expiry,
                    rollback_path,
                    evaluation["status"],
                    json.dumps(evaluation["diagnostic_ids"], sort_keys=True),
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return self.get_dependency(dependency_id)

    def evaluate_intake(
        self,
        *,
        source: str,
        license_basis: str,
        install_scripts: list[str],
        network_behavior: str,
        trust_tier: str,
        rollback_path: str,
    ) -> dict[str, Any]:
        diagnostic_ids = []
        if not source:
            diagnostic_ids.append("missing_dependency_source")
        if license_basis.lower() in {"", "unknown", "unclear"}:
            diagnostic_ids.append("unclear_license_basis")
        if not network_behavior:
            diagnostic_ids.append("missing_network_behavior")
        if trust_tier not in {"reviewed", "trusted", "sandboxed"}:
            diagnostic_ids.append("untrusted_dependency")
        if install_scripts and trust_tier != "trusted":
            diagnostic_ids.append("install_script_requires_review")
        if not rollback_path:
            diagnostic_ids.append("missing_rollback_path")
        return {"status": "blocked" if diagnostic_ids else "accepted", "diagnostic_ids": diagnostic_ids}

    def get_dependency(self, dependency_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from dependencies where dependency_id = ?",
                (dependency_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown dependency: {dependency_id}")
        result = dict(row)
        result["install_scripts"] = json.loads(result.pop("install_scripts_json"))
        result["diagnostic_ids"] = json.loads(result.pop("diagnostic_ids_json"))
        return result

