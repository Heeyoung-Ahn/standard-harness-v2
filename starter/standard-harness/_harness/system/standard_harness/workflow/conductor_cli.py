"""Trusted CLI helpers for Conductor grant and approval persistence."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.domain.closeout import CloseoutService
from standard_harness.domain.packets import PacketService
from standard_harness.state.store import HarnessStore
from standard_harness.workflow.conductor import ConductorLedger


def write_grant_record(store: HarnessStore, grant: dict[str, Any]) -> dict[str, Any]:
    record_path = (
        Path(store.harness_root)
        / "_ops"
        / "decisions"
        / "records"
        / f"{grant['delegation_grant_id']}.json"
    )
    record_path.parent.mkdir(parents=True, exist_ok=True)
    record_path.write_text(json.dumps(grant, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    ledger_record = ConductorLedger(store).record_delegation_grant(
        grant=grant,
        idempotency_key=f"{grant['delegation_grant_id']}:grant",
    )
    result = dict(ledger_record)
    result["record_path"] = str(record_path)
    return result


def load_grant(grant_path: str) -> dict[str, Any]:
    return json.loads(Path(grant_path).read_text(encoding="utf-8"))


def persist_conductor_approval(
    store: HarnessStore,
    *,
    decision: dict[str, Any],
    approved_scope: str,
    rationale: str,
    idempotency_key: str,
) -> dict[str, Any]:
    ledger = ConductorLedger(store)
    decision_record = ledger.record_approval_decision(
        approval_decision=decision,
        idempotency_key=f"{idempotency_key}:decision",
    )
    actor = decision.get("actor", {})
    approver_id = str(actor.get("conductor_id") or "human-owner")

    if decision["approval_type"] == "ready_for_code":
        approval = PacketService(store).approve_packet(
            packet_id=str(decision["packet_id"]),
            approver_id=approver_id,
            approver_role="Conductor",
            authority_basis="trusted conductor delegated approval",
            approved_scope=approved_scope,
            rationale=rationale,
            idempotency_key=idempotency_key,
        )
        return {
            "kind": "packet_approval",
            "decisionRecord": decision_record,
            "record": approval,
        }

    closeout = CloseoutService(store).close_packet(
        closeout_id=f"closeout-{decision['packet_id']}",
        packet_id=str(decision["packet_id"]),
        authority_basis="trusted conductor delegated closeout",
        rationale=rationale,
        idempotency_key=idempotency_key,
    )
    return {
        "kind": "closeout",
        "decisionRecord": decision_record,
        "record": closeout,
    }
