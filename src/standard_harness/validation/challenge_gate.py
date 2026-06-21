"""Challenge gate applicability and artifact validation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.state.store import HarnessStore


class ChallengeGateValidator:
    def __init__(self, policy: dict[str, Any]):
        self.policy = policy

    @classmethod
    def load(cls, repo_root: Path | str | None = None) -> "ChallengeGateValidator":
        root = Path(repo_root) if repo_root is not None else Path.cwd()
        path = root / "_harness" / "policies" / "challenge-gate.yaml"
        if not path.exists() and root != Path.cwd():
            path = Path.cwd() / "_harness" / "policies" / "challenge-gate.yaml"
        with path.open(encoding="utf-8") as handle:
            return cls(json.load(handle))

    def evaluate(
        self,
        *,
        repo_root: Path | str,
        packet_id: str,
        decision_id: str,
        triggers: list[str],
        reviewed_checks: list[str],
    ) -> dict[str, Any]:
        root = Path(repo_root)
        diagnostics: list[str] = []
        known_triggers = set(self.policy["challengeTriggers"])
        if not set(triggers).issubset(known_triggers):
            _add(diagnostics, "invalid_challenge_trigger")
        if triggers:
            review_path = root / "_ops" / "evidence" / packet_id / "challenge-review.md"
            decision_path = root / "_ops" / "decisions" / "records" / f"{decision_id}.md"
            if not review_path.exists():
                _add(diagnostics, "missing_challenge_review")
            if not decision_path.exists():
                _add(diagnostics, "missing_human_decision_record")
            for check in self.policy["reviewChecks"]:
                if check not in reviewed_checks:
                    _add(diagnostics, "missing_challenge_review_check")
                    break
        status = "blocked" if diagnostics else "pass"
        return {
            "status": status,
            "diagnostic_ids": diagnostics,
            "gateResult": {
                "packetId": packet_id,
                "gate": self.policy["gateId"],
                "status": "BLOCKED" if diagnostics else "PASS",
                "policyVersion": self.policy["policyVersion"],
                "gateProfileVersion": "challenge-gate@1",
                "validatorVersion": "challenge-gate-validator@0.2.0",
                "evaluatedAtCommit": "unknown",
                "evidence": [
                    f"_ops/evidence/{packet_id}/challenge-review.md",
                    f"_ops/decisions/records/{decision_id}.md",
                ],
                "risks": triggers,
                "unknowns": [],
                "requiredActions": diagnostics,
            },
            "frictionSignalBehavior": "emit unsafe_user_instruction_conflict or missed_review when blocked",
            "metricSignalBehavior": "emit challenge_gate_evaluated count",
        }

    def diagnostics_for_store(
        self, *, store: HarnessStore, repo_root: Path | str, packet_id: str
    ) -> list[str]:
        diagnostics: list[str] = []
        with store.connection() as conn:
            rows = conn.execute(
                """
                select payload_json from challenges
                order by trace_event_seq
                """
            ).fetchall()
        for row in rows:
            challenge = json.loads(row["payload_json"])
            if challenge.get("packet_id") != packet_id:
                continue
            triggers = list(challenge.get("triggers", []))
            if not triggers:
                continue
            result = self.evaluate(
                repo_root=repo_root,
                packet_id=packet_id,
                decision_id=str(challenge.get("decision_id", "")),
                triggers=triggers,
                reviewed_checks=list(challenge.get("reviewed_checks", [])),
            )
            for diagnostic_id in result["diagnostic_ids"]:
                _add(diagnostics, diagnostic_id)
        return diagnostics


def _add(diagnostic_ids: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostic_ids:
        diagnostic_ids.append(diagnostic_id)
