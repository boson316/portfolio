"""意圖：公開 API 不洩漏金鑰資訊、不對非白名單來源開 CORS，並限制聊天長度與頻率。"""
import importlib.util
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from rate_limit import RateLimiter


def load_app(**env):
    os.environ["PERXONA_API_KEY"] = "hardening-test-key-0123456789"
    os.environ["PERXONA_ALLOWED_ORIGINS"] = "https://boson316.github.io"
    for key in ("CHAT_RATE_LIMIT_PER_MINUTE", "TOKEN_RATE_LIMIT_PER_MINUTE", "PROXY_RATE_LIMIT_PER_MINUTE"):
        os.environ.pop(key, None)
    os.environ.update(env)
    spec = importlib.util.spec_from_file_location("portfolio_app_hardening", ROOT / "app.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_rate_limiter_sliding_window():
    limiter = RateLimiter(2, window_seconds=60)
    assert limiter.allow("a", now=0)
    assert limiter.allow("a", now=1)
    assert not limiter.allow("a", now=2)
    assert limiter.allow("b", now=2)
    assert limiter.allow("a", now=61)


def test_rate_limiter_zero_disables():
    limiter = RateLimiter(0)
    assert all(limiter.allow("a") for _ in range(50))


def test_health_does_not_expose_key_material():
    client = load_app().app.test_client()
    body = client.get("/api/health").get_json()
    assert body["ok"] is True
    assert "perxonaKeyHint" not in body
    assert "perxonaKeyLen" not in body
    assert "hard" not in str(body) and "6789" not in str(body)


def test_cors_header_only_for_allowed_origin():
    client = load_app().app.test_client()
    good = client.get("/api/health", headers={"Origin": "https://boson316.github.io"})
    assert good.headers.get("Access-Control-Allow-Origin") == "https://boson316.github.io"
    for origin in ("https://evil.example", "https://boson316.github.io.evil.example"):
        bad = client.get("/api/health", headers={"Origin": origin})
        assert "Access-Control-Allow-Origin" not in bad.headers


def test_chat_rejects_oversized_and_malformed_input():
    module = load_app()
    module.get_groq_client = lambda: None
    client = module.app.test_client()
    too_long = client.post("/api/chat", json={"message": "x" * (module.MAX_MESSAGE_CHARS + 1)})
    assert too_long.status_code == 400
    assert client.post("/api/chat", json={"message": 123}).status_code == 400
    assert client.post("/api/chat", json=["not", "a", "dict"]).status_code == 400
    assert client.post("/api/chat", data="not json", content_type="text/plain").status_code == 400
    weird_history = client.post("/api/chat", json={"message": "hi", "history": ["x", {"content": 5}, None]})
    assert weird_history.status_code == 200


def test_chat_history_is_truncated_before_llm():
    module = load_app()
    captured = {}

    class FakeCompletion:
        choices = [type("C", (), {"message": type("M", (), {"content": "ok"})()})()]

    def fake_create(client, messages, **kwargs):
        captured["messages"] = messages
        return FakeCompletion()

    module.get_groq_client = lambda: object()
    module.create_completion = fake_create
    client = module.app.test_client()
    res = client.post("/api/chat", json={"message": "hi", "history": [{"role": "user", "content": "y" * 5000}]})
    assert res.status_code == 200
    assert len(captured["messages"][1]["content"]) == module.MAX_HISTORY_ITEM_CHARS


def test_chat_rate_limit_returns_429_per_ip():
    module = load_app(CHAT_RATE_LIMIT_PER_MINUTE="2")
    module.get_groq_client = lambda: None
    client = module.app.test_client()
    for _ in range(2):
        assert client.post("/api/chat", json={"message": "hi"}).status_code == 200
    limited = client.post("/api/chat", json={"message": "hi"})
    assert limited.status_code == 429
    assert limited.headers["Retry-After"] == "60"
    # 快捷回覆不走 LLM，不計入限制。
    assert client.post("/api/chat", json={"message": "介紹專案"}).status_code == 200


def test_rate_limit_key_is_third_from_right_in_forwarded_chain():
    """意圖：Cloudflare 與 Render 會在尾端各附加一個代理 IP；訪客自帶的開頭項目不可信。"""
    module = load_app(CHAT_RATE_LIMIT_PER_MINUTE="2")
    module.get_groq_client = lambda: None
    client = module.app.test_client()

    def chat(xff):
        return client.post("/api/chat", json={"message": "hi"}, headers={"X-Forwarded-For": xff}).status_code

    # 同一訪客、每次不同的代理 IP 與不同的偽造開頭 → 仍算同一個 key。
    assert chat("198.51.100.7, 172.70.0.1, 10.0.0.1") == 200
    assert chat("1.1.1.1, 198.51.100.7, 172.70.0.2, 10.0.0.2") == 200
    assert chat("2.2.2.2, 198.51.100.7, 172.70.0.3, 10.0.0.3") == 429
    # 另一位訪客不受影響。
    assert chat("203.0.113.9, 172.70.0.4, 10.0.0.4") == 200


def test_health_forwarding_reports_structure_without_ips():
    client = load_app().app.test_client()
    body = client.get(
        "/api/health",
        headers={"X-Forwarded-For": "198.51.100.7, 172.70.0.1, 10.0.0.1", "CF-Connecting-IP": "198.51.100.7"},
    ).get_json()
    assert body["forwarding"] == {
        "xffEntries": 3,
        "trustedHops": 3,
        "cfConnectingIp": True,
        "cfPositionFromRight": 3,
    }
    assert "198.51.100.7" not in str(body) and "10.0.0.1" not in str(body)


def test_token_rate_limit():
    module = load_app(TOKEN_RATE_LIMIT_PER_MINUTE="1")
    client = module.app.test_client()
    headers = {"Origin": "https://boson316.github.io"}
    assert client.get("/api/perxona-token", headers=headers).status_code == 200
    assert client.get("/api/perxona-token", headers=headers).status_code == 429


def test_groq_client_has_short_timeout_and_no_retries(monkeypatch):
    """意圖：慢的 Groq 請求不可長時間佔住 worker（前端 15 秒就放棄）。"""
    module = load_app()
    module.GROQ_API_KEY = "test-groq-key"
    client = module.get_groq_client()
    assert client is not None
    assert client.max_retries == 0
    assert float(client.timeout) == module.GROQ_TIMEOUT_SECONDS
    assert module.GROQ_TIMEOUT_SECONDS < 15


def test_gunicorn_config_uses_threads_and_outlasts_proxy_timeout():
    """意圖：一個慢請求不會擋住 /api/health；worker 逾時要長於 proxy 上游逾時。"""
    from perxona_proxy import PROXY_TIMEOUT_SECONDS

    for key in ("WEB_CONCURRENCY", "GUNICORN_THREADS", "GUNICORN_TIMEOUT"):
        os.environ.pop(key, None)
    config: dict = {}
    exec((ROOT / "gunicorn.conf.py").read_text(encoding="utf-8"), config)
    assert config["worker_class"] == "gthread"
    assert config["threads"] >= 4
    assert config["workers"] == 1
    assert config["timeout"] > PROXY_TIMEOUT_SECONDS
