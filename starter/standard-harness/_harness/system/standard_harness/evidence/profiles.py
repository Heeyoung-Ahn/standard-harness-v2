"""Final-product runtime evidence profile catalog."""

from __future__ import annotations

from dataclasses import dataclass


PROFILE_IDS = (
    "cli_command",
    "unit_test",
    "integration_test",
    "api_runtime",
    "browser_render",
    "browser_functional",
    "db_schema",
    "db_runtime_persistence",
    "cloud_execution",
    "device_execution",
    "manual_runtime",
    "substitute_evidence",
)


@dataclass(frozen=True)
class EvidenceProfile:
    profile_id: str
    runtime_class: str
    closes_claim_types: tuple[str, ...]


class EvidenceProfileCatalog:
    """In-memory catalog; no persistent state is required for static profiles."""

    def __init__(self):
        self._profiles = {
            "cli_command": EvidenceProfile("cli_command", "cli", ("cli_behavior",)),
            "unit_test": EvidenceProfile("unit_test", "test", ("unit_behavior",)),
            "integration_test": EvidenceProfile(
                "integration_test", "test", ("integration_behavior",)
            ),
            "api_runtime": EvidenceProfile(
                "api_runtime", "runtime", ("api_behavior", "api_contract")
            ),
            "browser_render": EvidenceProfile("browser_render", "browser", ("ui_render",)),
            "browser_functional": EvidenceProfile(
                "browser_functional",
                "browser",
                ("browser_workflow", "functional_ui"),
            ),
            "db_schema": EvidenceProfile("db_schema", "database", ("db_schema",)),
            "db_runtime_persistence": EvidenceProfile(
                "db_runtime_persistence",
                "database",
                ("runtime_persistence",),
            ),
            "cloud_execution": EvidenceProfile(
                "cloud_execution", "cloud", ("cloud_runtime",)
            ),
            "device_execution": EvidenceProfile(
                "device_execution", "device", ("device_runtime",)
            ),
            "manual_runtime": EvidenceProfile("manual_runtime", "manual", ("manual_runtime",)),
            "substitute_evidence": EvidenceProfile(
                "substitute_evidence", "substitute", ("substitute",)
            ),
        }

    def profile_ids(self) -> list[str]:
        return list(PROFILE_IDS)

    def get(self, profile_id: str) -> EvidenceProfile:
        try:
            return self._profiles[profile_id]
        except KeyError as exc:
            raise ValueError(f"Unknown evidence profile: {profile_id}") from exc

