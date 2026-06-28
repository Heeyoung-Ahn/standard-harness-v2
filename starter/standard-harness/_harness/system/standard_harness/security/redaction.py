"""Evidence redaction helpers."""

from __future__ import annotations

import re


SECRET_PATTERNS = [
    re.compile(r"sk-(?:proj-)?[A-Za-z0-9_-]{16,}"),
    re.compile(r"ghp_[A-Za-z0-9_]{12,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"(?i)-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"(?i)(api[_-]?key|token|secret)=([A-Za-z0-9_./+=-]{8,})"),
    re.compile(r"(?i)(password|passwd|credential|private[_ -]?key)=([^\s]+)"),
]


class EvidenceRedactor:
    def redact(self, text: str) -> dict[str, object]:
        redacted = text
        count = 0
        for pattern in SECRET_PATTERNS:
            redacted, replacements = pattern.subn(_replacement, redacted)
            count += replacements
        return {"text": redacted, "redaction_count": count}


def _replacement(match: re.Match[str]) -> str:
    if match.lastindex and match.lastindex >= 2:
        return f"{match.group(1)}=[REDACTED]"
    return "[REDACTED]"

