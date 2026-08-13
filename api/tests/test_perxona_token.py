"""意圖：Perxona JWT 須含 iat/exp，且僅允許白名單 Origin 取 token。"""
import importlib.util
import os
import sys
import time
from pathlib import Path

import jwt

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from perxona_token import create_session_token, origin_allowed, parse_allowed_origins


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


def test_origin_allowed_matches_prefix():
    allowed = parse_allowed_origins("https://boson316.github.io,http://localhost")
    assert origin_allowed("https://boson316.github.io", "", allowed)
    assert origin_allowed("", "https://boson316.github.io/portfolio/", allowed)
    assert origin_allowed("http://localhost:3000", "", allowed)
    assert not origin_allowed("https://evil.example", "", allowed)


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
