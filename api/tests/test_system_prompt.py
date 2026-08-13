"""意圖：聊天後端必須以「小boson」導覽作品集，且含可核對的專案事實。"""
from pathlib import Path

PROMPT = Path(__file__).resolve().parents[1].joinpath("app.py").read_text(encoding="utf-8")


def test_identity_is_xiaoboson():
    assert "小boson" in PROMPT
    assert "poboson316@gmail.com" in PROMPT
    assert "boson316" in PROMPT


def test_prompt_includes_verifiable_project_facts():
    assert "521×" in PROMPT
    assert "RTX3050-GPU-Mastery" in PROMPT
    assert "annual_return_calculator_v5.html" in PROMPT
    assert "food-map-niu-v2.streamlit.app" in PROMPT
    assert "news-8zud.onrender.com" in PROMPT
    assert "94.7%" in PROMPT
    assert "開發中" in PROMPT


def test_prompt_forbids_invention():
    assert "禁止編造" in PROMPT
    assert "#gpu-showcase" in PROMPT
    assert 'SYSTEM_PROMPT = """' in PROMPT
