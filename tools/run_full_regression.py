"""Run full unittest regression with deterministic diagnostics."""

from __future__ import annotations

import subprocess
import sys
import time
import json
from datetime import datetime, timezone
from pathlib import Path


def regression_command() -> list[str]:
    return [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"]


def last_test_from_output(output: str) -> str | None:
    last: str | None = None
    for line in output.splitlines():
        if " (" not in line:
            continue
        start = line.find("(")
        end = line.find(")", start)
        if start == -1 or end == -1:
            continue
        last = line[start + 1 : end]
    return last


def run(repo_root: str | Path = ".", timeout_seconds: int = 300) -> dict[str, object]:
    started = time.monotonic()
    result = subprocess.run(
        regression_command(),
        cwd=repo_root,
        text=True,
        capture_output=True,
        timeout=timeout_seconds,
        check=False,
    )
    duration = time.monotonic() - started
    combined = result.stdout + result.stderr
    return {
        "status": "passed" if result.returncode == 0 else "failed",
        "returncode": result.returncode,
        "durationSeconds": round(duration, 3),
        "lastTest": last_test_from_output(combined),
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def write_release_evidence(repo_root: str | Path, report: dict[str, object]) -> Path:
    root = Path(repo_root)
    evidence_dir = root / "_ops" / "evidence" / "release"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    log_path = evidence_dir / "v21-full-regression.log"
    log_path.write_text(str(report["stdout"]) + str(report["stderr"]), encoding="utf-8")
    head_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=root,
        text=True,
        capture_output=True,
        check=False,
    ).stdout.strip()
    evidence = {
        "evidenceId": "release-v21-full-regression",
        "command": "python -m unittest discover -s tests",
        "result": report["status"],
        "durationSeconds": report["durationSeconds"],
        "logPath": "_ops/evidence/release/v21-full-regression.log",
        "timeoutStatus": "completed",
        "lastTest": report["lastTest"] or "",
        "headCommit": head_commit,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "generatedBy": "tools/run_full_regression.py",
    }
    evidence_path = evidence_dir / "v21-full-regression.json"
    evidence_path.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return evidence_path


def main() -> int:
    root = Path.cwd()
    report = run(root)
    evidence_path = write_release_evidence(root, report)
    if report["lastTest"]:
        print(f"last_test={report['lastTest']}")
    print(f"release_evidence={evidence_path}")
    print(f"status={report['status']}")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
