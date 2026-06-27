"""Wiki knowledge index projection."""

from __future__ import annotations

from pathlib import Path
from typing import Any


class WikiIndexBuilder:
    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)

    def build(self) -> dict[str, Any]:
        wiki_root = self.repo_root / "_ops" / "wiki"
        pages = []
        diagnostics = []
        if wiki_root.exists():
            for path in sorted(wiki_root.glob("*.md")):
                metadata = _front_matter(path.read_text(encoding="utf-8"))
                relative = path.relative_to(self.repo_root).as_posix()
                pages.append(
                    {
                        "path": relative,
                        "entryType": metadata.get("entryType"),
                        "sourceTier": metadata.get("sourceTier"),
                        "reviewStatus": metadata.get("reviewStatus"),
                    }
                )
                if metadata.get("sourceTier") in {"generated", "low-authority"}:
                    diagnostics.append("stale_context")
        return {
            "pages": pages,
            "diagnostic_ids": sorted(set(diagnostics)),
            "projectionOnly": True,
            "frictionSignalBehavior": "emit stale_context for low-authority or generated wiki pages",
            "metricSignalBehavior": "emit wiki_index_page_count by source tier",
        }


def _front_matter(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    metadata = {}
    for line in parts[1].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip()
    return metadata
