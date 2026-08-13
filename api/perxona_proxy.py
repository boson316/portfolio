"""把瀏覽器對 console.perxona.ai 的請求轉成 x-api-key（apiKey 不進前端）。"""
from __future__ import annotations

import urllib.error
import urllib.request
from typing import Mapping
from urllib.parse import urlparse

ALLOWED_PROXY_HOSTS = frozenset({"console.perxona.ai"})
MAX_TARGET_LEN = 2048
MAX_BODY_BYTES = 1_000_000
PROXY_TIMEOUT_SECONDS = 30.0
_DROP_REQUEST_HEADERS = frozenset({
    "host",
    "connection",
    "content-length",
    "transfer-encoding",
    "accept-encoding",
    "cookie",
    "authorization",
    "x-api-token",
    "x-api-key",
})
_DROP_RESPONSE_HEADERS = frozenset({
    "transfer-encoding",
    "content-encoding",
    "connection",
    "keep-alive",
})


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def resolve_proxy_target(raw: str) -> str | None:
    target = (raw or "").strip()
    if not target or len(target) > MAX_TARGET_LEN:
        return None
    parsed = urlparse(target)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_PROXY_HOSTS:
        return None
    if parsed.username or parsed.password:
        return None
    return target


def client_origin(origin: str, referer: str) -> str:
    origin = (origin or "").strip()
    if origin:
        return origin
    parsed = urlparse((referer or "").strip())
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return ""


def build_upstream_headers(
    incoming: Mapping[str, str],
    api_key: str,
    origin: str,
) -> dict[str, str]:
    headers: dict[str, str] = {}
    for key, value in incoming.items():
        lower = key.lower()
        if lower in _DROP_REQUEST_HEADERS or lower.startswith(":"):
            continue
        headers[key] = value
    headers["x-api-key"] = api_key
    if origin:
        headers["Origin"] = origin
    return headers


def filter_response_headers(headers: Mapping[str, str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in headers.items():
        lower = key.lower()
        if lower in _DROP_RESPONSE_HEADERS or lower.startswith("access-control-"):
            continue
        out[key] = value
    return out


def _urlopen(request: urllib.request.Request, timeout: float):
    opener = urllib.request.build_opener(_NoRedirect)
    return opener.open(request, timeout=timeout)


def forward_perxona(
    method: str,
    target: str,
    headers: Mapping[str, str],
    body: bytes | None,
    timeout: float = PROXY_TIMEOUT_SECONDS,
) -> tuple[int, dict[str, str], bytes]:
    req = urllib.request.Request(target, data=body or None, method=method.upper())
    for key, value in headers.items():
        req.add_header(key, value)
    try:
        with _urlopen(req, timeout) as resp:
            raw_headers = {k: v for k, v in resp.headers.items()}
            return int(resp.getcode() or 502), filter_response_headers(raw_headers), resp.read()
    except urllib.error.HTTPError as err:
        raw_headers = {k: v for k, v in err.headers.items()} if err.headers else {}
        return int(err.code), filter_response_headers(raw_headers), err.read() or b""
    except urllib.error.URLError:
        return 504, {"Content-Type": "application/json"}, b'{"error":"perxona_upstream_timeout"}'
    except OSError:
        return 502, {"Content-Type": "application/json"}, b'{"error":"perxona_upstream_io_error"}'
