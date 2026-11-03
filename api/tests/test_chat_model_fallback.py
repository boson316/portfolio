"""意圖：Groq 下架模型時，聊天要自動換到可用模型，且不把原始錯誤丟給訪客。"""
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app as app_module  # noqa: E402

MISSING = "Error code: 404 - {'error': {'message': 'The model `x` does not exist', 'code': 'model_not_found'}}"


class FakeClient:
    def __init__(self, available, listed=None):
        self.available = set(available)
        self.listed = listed or []
        self.calls = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))
        self.models = SimpleNamespace(list=lambda: SimpleNamespace(data=[SimpleNamespace(id=i) for i in self.listed]))

    def _create(self, model, messages, **kwargs):
        self.calls.append(model)
        if model not in self.available:
            raise Exception(MISSING)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="hi from " + model))])


def reset():
    app_module._active_model = None


def test_falls_back_to_next_candidate():
    reset()
    second = app_module.MODEL_CANDIDATES[1]
    client = FakeClient(available=[second])
    out = app_module.create_completion(client, [{"role": "user", "content": "q"}])
    assert out.choices[0].message.content == "hi from " + second
    assert app_module._active_model == second
    # 之後直接用記住的模型，不再重試失敗的
    client.calls.clear()
    app_module.create_completion(client, [])
    assert client.calls == [second]


def test_discovers_models_when_all_candidates_gone():
    reset()
    client = FakeClient(available=["new-model-2027"], listed=["whisper-large-v3", "new-model-2027"])
    out = app_module.create_completion(client, [])
    assert out.choices[0].message.content == "hi from new-model-2027"
    assert "whisper-large-v3" not in client.calls


def test_other_errors_are_not_swallowed():
    reset()
    client = FakeClient(available=[])
    client.chat.completions.create = lambda **kw: (_ for _ in ()).throw(Exception("rate limit 429"))
    try:
        app_module.create_completion(client, [])
    except Exception as e:
        assert "429" in str(e)
    else:
        raise AssertionError("expected exception")


def test_chat_hides_raw_error(monkeypatch):
    reset()
    monkeypatch.setattr(app_module, "get_groq_client", lambda: FakeClient(available=[]))
    res = app_module.app.test_client().post("/api/chat", json={"message": "隨便問一句很長的問題"})
    body = res.get_json()
    assert body["fallback"] is True
    assert "model_not_found" not in body["reply"]
    assert "poboson316@gmail.com" in body["reply"]
