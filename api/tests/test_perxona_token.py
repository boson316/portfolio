"""意圖：Perxona JWT 須含 iat/exp，且僅允許白名單 Origin 取 token。"""
import importlib.util
import os
import sys
import time
from pathlib import Path

import jwt

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from perxona_token import cors_origin_patterns, create_session_token, origin_allowed, parse_allowed_origins


def test_create_session_token_has_iat_exp():
    secret = "test-perxona-key-with-enough-length"
    now = int(time.time())
    token, expires_at = create_session_token(secret, 3600, now=now)
    payload = jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        options={"verify_exp": False},
    )
    assert payload["iat"] == now
    assert payload["exp"] == now + 3600
    assert expires_at == now + 3600


def test_origin_allowed_exact_host_any_port_when_unspecified():
    allowed = parse_allowed_origins("https://boson316.github.io,http://localhost")
    assert origin_allowed("https://boson316.github.io", "", allowed)
    assert origin_allowed("", "https://boson316.github.io/portfolio/", allowed)
    assert origin_allowed("http://localhost:3000", "", allowed)
    assert not origin_allowed("https://evil.example", "", allowed)


def test_origin_allowed_rejects_lookalike_hosts():
    allowed = parse_allowed_origins("https://boson316.github.io,http://localhost,http://127.0.0.1")
    assert not origin_allowed("https://boson316.github.io.evil.example", "", allowed)
    assert not origin_allowed("http://localhost.evil.example", "", allowed)
    assert not origin_allowed("http://127.0.0.1.evil.example", "", allowed)
    assert not origin_allowed("", "https://boson316.github.io.evil.example/portfolio/", allowed)
    assert not origin_allowed("https://boson316.github.io@evil.example", "", allowed)
    assert not origin_allowed("http://boson316.github.io", "", allowed)
    assert not origin_allowed("", "", allowed)


def test_origin_takes_precedence_over_referer():
    allowed = parse_allowed_origins("https://boson316.github.io")
    assert not origin_allowed("https://evil.example", "https://boson316.github.io/portfolio/", allowed)


def test_cors_patterns_follow_same_rule():
    import re

    patterns = cors_origin_patterns(parse_allowed_origins("https://boson316.github.io,http://localhost"))
    def ok(origin):
        return any(re.match(p, origin) for p in patterns)
    assert ok("https://boson316.github.io")
    assert ok("http://localhost:5500")
    assert not ok("https://boson316.github.io.evil.example")
    assert not ok("http://localhost.evil.example")


def test_perxona_token_route_rejects_bad_origin():
    os.environ["PERXONA_API_KEY"] = "route-test-key"
    os.environ["PERXONA_ALLOWED_ORIGINS"] = "https://boson316.github.io"

    spec = importlib.util.spec_from_file_location("portfolio_app", ROOT / "app.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)

    app = module.app
    client = app.test_client()

    denied = client.get("/api/perxona-token", headers={"Origin": "https://evil.example"})
    assert denied.status_code == 403

    allowed = client.get(
        "/api/perxona-token",
        headers={"Origin": "https://boson316.github.io"},
    )
    assert allowed.status_code == 200
    body = allowed.get_json()
    assert body["sessionToken"]
    assert body["expiresAt"] > int(time.time())
