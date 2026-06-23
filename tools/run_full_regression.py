"""Run full unittest regression with deterministic diagnostics."""

from __future__ import annotations

import subprocess
import sys
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
    result = subprocess.run(
        regression_command(),
        cwd=repo_root,
        text=True,
        capture_output=True,
        timeout=timeout_seconds,
        check=False,
    )
    combined = result.stdout + result.stderr
    return {
        "status": "passed" if result.returncode == 0 else "failed",
        "returncode": result.returncode,
        "lastTest": last_test_from_output(combined),
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def main() -> int:
    report = run(Path.cwd())
    if report["lastTest"]:
        print(f"last_test={report['lastTest']}")
    print(f"status={report['status']}")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
