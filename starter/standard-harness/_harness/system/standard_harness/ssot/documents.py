"""SSOT document value objects."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SsotDocument:
    source_doc: str
    content: str
    source_snapshot: str
