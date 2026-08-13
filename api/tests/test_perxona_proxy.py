"""意圖：proxy 只轉 console.perxona.ai，且上游改走 x-api-key 而非 JWT。"""
import importlib.util
import os
import sys
from pathlib import Path
from unittest.mock import patch
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from perxona_proxy import (
    build_upstream_headers,
    filter_response_headers,
    forward_perxona,
    resolve_proxy_target,
)


def test_resolve_proxy_target_allows_console_https():
    url = "https://console.perxona.ai/asia/api/v1/services/conversation/initialize"
    assert resolve_proxy_target(url) == url


def test_resolve_proxy_target_rejects_ssrf():
    assert resolve_proxy_target("https://evil.example/steal") is None
    assert resolve_proxy_target("http://console.perxona.ai/x") is None
    assert resolve_proxy_target("https://cdn.perxona.ai/index.js") is None
    assert resolve_proxy_target("https://127.0.0.1/") is None
    assert resolve_proxy_target("https://user:pass@console.perxona.ai/") is None


def test_filter_response_headers_strips_cors():
    filtered = filter_response_headers(
        {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://console.perxona.ai",
            "Access-Control-Allow-Headers": "x-api-key",
            "Connection": "keep-alive",
        }
    )
    lowered = {k.lower(): v for k, v in filtered.items()}
    assert lowered == {"content-type": "application/json"}


def test_forward_perxona_read_io_error_returns_structured_json():
    class BrokenResponse:
        headers = {"Content-Type": "application/json"}

        def getcode(self):
            return 200

        def read(self):
            raise OSError("upstream read failed")

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    with patch("perxona_proxy._urlopen", return_value=BrokenResponse()):
        status, headers, body = forward_perxona("GET", "https://console.perxona.ai/x", {}, None)

    assert status == 502
    assert headers["Content-Type"] == "application/json"
    assert body == b'{"error":"perxona_upstream_io_error"}'


def test_build_upstream_headers_swaps_jwt_for_api_key():
    headers = build_upstream_headers(
        {
            "X-Api-Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.sig",
            "X-Fingerprint": "abc123",
            "Content-Type": "application/json",
            "Host": "perxona.onrender.com",
        },
        api_key="server-side-api-key",
        origin="https://boson316.github.io",
    )
    lowered = {k.lower(): v for k, v in headers.items()}
    assert lowered["x-api-key"] == "server-side-api-key"
    assert "x-api-token" not in lowered
    assert lowered["x-fingerprint"] == "abc123"
    assert lowered["origin"] == "https://boson316.github.io"
    assert "host" not in lowered


def _load_app_module():
    spec = importlib.util.spec_from_file_location("portfolio_app_proxy", ROOT / "app.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_proxy_route_rejects_bad_origin_and_swaps_auth():
    os.environ["PERXONA_API_KEY"] = "route-test-key"
    os.environ["PERXONA_ALLOWED_ORIGINS"] = "https://boson316.github.io"
    loaded = _load_app_module()
    client = loaded.app.test_client()
    target = "https://console.perxona.ai/asia/api/v1/services/conversation/initialize"

    denied = client.post(
        f"/api/perxona-proxy?target={quote(target, safe='')}",
        headers={"Origin": "https://evil.example"},
        data=b'{"agent_profile_id":"x"}',
        content_type="application/json",
    )
    assert denied.status_code == 403

    with patch.object(loaded, "forward_perxona", return_value=(201, {"Content-Type": "application/json"}, b'{"ok":true}')) as mocked:
        allowed = client.post(
            f"/api/perxona-proxy?target={quote(target, safe='')}",
            headers={
                "Origin": "https://boson316.github.io",
                "X-Api-Token": "unused-jwt",
                "X-Fingerprint": "deadbeef",
            },
            data=b'{"agent_profile_id":"01TEST"}',
            content_type="application/json",
        )
    assert allowed.status_code == 201
    assert allowed.get_data() == b'{"ok":true}'
    assert allowed.headers.get("Access-Control-Allow-Origin") == "https://boson316.github.io"
    args = mocked.call_args.args
    assert args[0] == "POST"
    assert args[1] == target
    upstream_headers = args[2]
    lowered = {k.lower(): v for k, v in upstream_headers.items()}
    assert lowered["x-api-key"] == "route-test-key"
    assert "x-api-token" not in lowered
    assert args[3] == b'{"agent_profile_id":"01TEST"}'


def test_proxy_options_preflight_returns_cors_headers():
    os.environ["PERXONA_API_KEY"] = "route-test-key"
    os.environ["PERXONA_ALLOWED_ORIGINS"] = "https://boson316.github.io"
    loaded = _load_app_module()
    client = loaded.app.test_client()
    target = "https://console.perxona.ai/asia/api/v1/services/profiles/widget-profiles/01KZTWWPD7VZY0R9G2JYF0C7X9"

    response = client.open(
        f"/api/perxona-proxy?target={quote(target, safe='')}",
        method="OPTIONS",
        headers={
            "Origin": "https://boson316.github.io",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "x-api-token,x-fingerprint,content-type",
        },
    )
    assert response.status_code == 204
    assert response.headers.get("Access-Control-Allow-Origin") == "https://boson316.github.io"
    assert response.headers.get("Access-Control-Allow-Methods") == "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    assert response.headers.get("Access-Control-Allow-Headers") == "x-api-token,x-fingerprint,content-type"
