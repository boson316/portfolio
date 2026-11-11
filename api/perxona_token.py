"""Perxona session_token（JWT HS256）簽發 helpers。"""
from __future__ import annotations

import re
import time
from typing import Iterable
from urllib.parse import urlparse

import jwt


def parse_allowed_origins(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


def _origin_parts(url: str) -> tuple[str, str, int | None] | None:
    """拆出 (scheme, hostname, port)；格式不合法回傳 None。"""
    try:
        parsed = urlparse((url or "").strip())
        port = parsed.port
    except ValueError:
        return None
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return None
    if parsed.username or parsed.password:
        return None
    return parsed.scheme, parsed.hostname.lower(), port


def _matches(candidate: str, allowed: Iterable[str]) -> bool:
    parts = _origin_parts(candidate)
    if parts is None:
        return False
    scheme, host, port = parts
    for base in allowed:
        base_parts = _origin_parts(base)
        if base_parts is None:
            continue
        base_scheme, base_host, base_port = base_parts
        # 白名單沒寫 port 時允許任意 port（本機開發 http://localhost:3000）。
        if scheme == base_scheme and host == base_host and base_port in (None, port):
            return True
    return False


def origin_allowed(origin: str, referer: str, allowed: Iterable[str]) -> bool:
    """scheme 與 hostname 須完全相同；不可用字首比對（會放行 github.io.evil.com）。

    有 Origin 就只看 Origin；沒有才退回 Referer。
    """
    allowed = list(allowed)
    if (origin or "").strip():
        return _matches(origin, allowed)
    return _matches(referer, allowed)


def cors_origin_patterns(allowed: Iterable[str]) -> list[str]:
    """把白名單轉成 flask-cors 用的 regex（規則與 origin_allowed 相同）。"""
    patterns: list[str] = []
    for base in allowed:
        parts = _origin_parts(base)
        if parts is None:
            continue
        scheme, host, port = parts
        port_part = rf":{port}" if port is not None else r"(:\d+)?"
        patterns.append(rf"^{re.escape(scheme)}://{re.escape(host)}{port_part}$")
    return patterns


def create_session_token(api_key: str, ttl_seconds: int, now: int | None = None) -> tuple[str, int]:
    issued_at = int(now if now is not None else time.time())
    expires_at = issued_at + ttl_seconds
    token = jwt.encode({"iat": issued_at, "exp": expires_at}, api_key, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token, expires_at
