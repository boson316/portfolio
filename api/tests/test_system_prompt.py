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
    assert "boson-news-app.onrender.com" in PROMPT
    assert "94.7%" in PROMPT
    assert "開發中" in PROMPT


def test_prompt_forbids_invention():
    assert "禁止編造" in PROMPT
    assert "#gpu-showcase" in PROMPT
    assert 'SYSTEM_PROMPT = """' in PROMPT


def test_prompt_forbids_brand_consultant_fluff():
    assert "禁止品牌顧問腔" in PROMPT
    assert "極具潛力" in PROMPT
    assert "不要只問「從哪個開始」" in PROMPT


def test_prompt_link_registry_forbids_hallucinated_gpu_repo():
    assert "https://github.com/boson316/RTX3050-GPU-Mastery" in PROMPT
    assert "gpu-lab" in PROMPT  # 列為禁止編造的 repo 名
    assert "禁止猜 repo" in PROMPT
