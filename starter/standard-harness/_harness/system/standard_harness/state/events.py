"""Event envelope helpers."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


SCHEMA_VERSION = "1"
HASH_ALGORITHM = "sha256"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def payload_hash(payload: dict[str, Any]) -> str:
    return sha256_text(canonical_json(payload))


def new_event_id() -> str:
    return f"evt_{uuid4().hex}"


def new_transaction_id() -> str:
    return f"txn_{uuid4().hex}"
