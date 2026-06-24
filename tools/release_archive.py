"""Release archive helpers built from tracked source files."""

from __future__ import annotations

import argparse
import subprocess
import zipfile
from pathlib import Path


EXCLUDED_PARTS = {
    ".git",
    ".harness/state",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".venv",
    "venv",
    "__pycache__",
}
EXCLUDED_SUFFIXES = {".pyc", ".pyo"}
REQUIRED_RELEASE_ARTIFACTS = {
    "docs/release/v21-conformance-report.md",
    "docs/release/release-packaging-hygiene-v21.md",
    "docs/release/final-product-docs-command-inventory-v1.md",
}


def list_release_files(root: str | Path) -> list[str]:
    repo_root = Path(root)
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=repo_root,
        check=True,
        capture_output=True,
    )
    files = [
        item.decode("utf-8").replace("\\", "/")
        for item in result.stdout.split(b"\0")
        if item
    ]
    return sorted(path for path in files if _is_release_file(path))


def create_release_archive(root: str | Path, output_path: str | Path) -> Path:
    repo_root = Path(root)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for relative_path in list_release_files(repo_root):
            source = repo_root / relative_path
            validate_release_source(repo_root, source)
            archive.write(source, relative_path)
    return output


def validate_release_source(repo_root: str | Path, source: Path) -> None:
    if not source.is_symlink():
        return
    resolved = source.resolve()
    root_resolved = Path(repo_root).resolve()
    if not resolved.is_relative_to(root_resolved):
        raise ValueError("release_archive_symlink_escape")


def validate_release_files(paths: list[str]) -> list[str]:
    diagnostics: list[str] = []
    missing = sorted(REQUIRED_RELEASE_ARTIFACTS - set(paths))
    if missing:
        diagnostics.append("missing_release_artifact")
    forbidden = [path for path in paths if not _is_release_file(path)]
    if forbidden:
        diagnostics.append("forbidden_release_artifact")
    return diagnostics


def _is_release_file(path: str) -> bool:
    normalized = path.replace("\\", "/")
    parts = normalized.split("/")
    if any(part in EXCLUDED_PARTS for part in parts):
        return False
    if normalized.startswith(".harness/state/"):
        return False
    if normalized.endswith("/harness.sqlite3"):
        return False
    return Path(normalized).suffix not in EXCLUDED_SUFFIXES


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    path = create_release_archive(args.root, args.output)
    print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
