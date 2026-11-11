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
    # 另一個 IP（由受信任代理附加的 X-Forwarded-For）不受影響。
    other = client.post("/api/chat", json={"message": "hi"}, headers={"X-Forwarded-For": "203.0.113.9"})
    assert other.status_code == 200


def test_token_rate_limit():
    module = load_app(TOKEN_RATE_LIMIT_PER_MINUTE="1")
    client = module.app.test_client()
    headers = {"Origin": "https://boson316.github.io"}
    assert client.get("/api/perxona-token", headers=headers).status_code == 200
    assert client.get("/api/perxona-token", headers=headers).status_code == 429
