"""Perxona session_token（JWT HS256）簽發 helpers。"""
from __future__ import annotations

import time
from typing import Iterable

import jwt


def parse_allowed_origins(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


def origin_allowed(origin: str, referer: str, allowed: Iterable[str]) -> bool:
    for base in allowed:
        if origin.startswith(base) or referer.startswith(base):
            return True
    return False


def perxona_key_hint(api_key: str) -> dict[str, int | str] | None:
    """回傳 key 指紋供比對 Dashboard apiKey，不洩漏完整 secret。"""
    key = (api_key or "").strip()
    if len(key) < 8:
        return None
    return {
        "hint": f"{key[:4]}…{key[-4:]}",
        "len": len(key),
    }


def create_session_token(api_key: str, ttl_seconds: int, now: int | None = None) -> tuple[str, int]:
    issued_at = int(now if now is not None else time.time())
    expires_at = issued_at + ttl_seconds
    token = jwt.encode({"iat": issued_at, "exp": expires_at}, api_key, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token, expires_at
