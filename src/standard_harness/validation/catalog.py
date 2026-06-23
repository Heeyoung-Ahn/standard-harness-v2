"""Validator catalog."""

from __future__ import annotations

import json
import importlib
from pathlib import Path
from typing import Any


class ValidatorCatalog:
    def __init__(self, data: dict[str, Any]):
        self.data = data
        self.validators = data.get("validators", [])

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "ValidatorCatalog":
        path = Path(repo_root) / "_harness" / "policies" / "validator-catalog.yaml"
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def validators_for_hr(self, hr_id: str) -> list[dict[str, Any]]:
        return [item for item in self.validators if hr_id in item.get("hrIds", [])]

    def gate_metadata_for_hr(self, hr_id: str) -> list[dict[str, Any]]:
        return [
            item["gateResultMetadata"]
            for item in self.validators_for_hr(hr_id)
            if item.get("gateResultMetadata")
        ]

    def ids(self) -> set[str]:
        return {str(item.get("validatorId")) for item in self.validators if item.get("validatorId")}

    def release_blocking_diagnostics(self, *, repo_root: str | Path | None = None) -> list[str]:
        repo = Path(repo_root) if repo_root is not None else Path.cwd()
        diagnostics: list[str] = []
        for item in self.validators:
            if not item.get("releaseBlocking"):
                continue
            implementation = item.get("implementation")
            if not implementation:
                diagnostics.append("missing_validator_implementation")
            elif not _is_importable(implementation):
                diagnostics.append("unimportable_validator_implementation")
            if not item.get("negativeTests"):
                diagnostics.append("missing_negative_tests")
            else:
                for test_name in item["negativeTests"]:
                    if not _test_module_exists(repo, str(test_name)):
                        diagnostics.append("missing_negative_test_module")
                        break
            reachable = set(item.get("reachableFrom", []))
            if "validate --release" not in reachable:
                diagnostics.append("missing_release_reachability")
            if "validate --v21-conformance" not in reachable:
                diagnostics.append("missing_v21_conformance_reachability")
            metadata = item.get("gateResultMetadata")
            if not metadata or not metadata.get("gateId") or not metadata.get("validatorId"):
                diagnostics.append("missing_gate_result_metadata")
        return sorted(set(diagnostics))


def _is_importable(spec: str) -> bool:
    try:
        module_name, object_name = spec.split(":", 1)
        module = importlib.import_module(module_name)
        getattr(module, object_name)
    except (ImportError, AttributeError, ValueError):
        return False
    return True


def _test_module_exists(repo_root: Path, module_name: str) -> bool:
    if not module_name.startswith("tests."):
        return False
    path = repo_root / (module_name.replace(".", "/") + ".py")
    return path.exists()
