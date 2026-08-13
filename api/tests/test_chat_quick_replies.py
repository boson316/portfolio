"""意圖：快捷 chip 應回固定短句，不經 LLM。"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import QUICK_REPLIES, get_quick_reply


def test_intro_projects_is_short():
    reply = get_quick_reply("介紹專案")
    assert reply is not None
    assert len(reply) <= 80
    assert "#projects" in reply
    assert "GPU Lab" in reply


def test_all_chips_have_replies():
    for prompt in QUICK_REPLIES:
        assert get_quick_reply(prompt) == QUICK_REPLIES[prompt]


def test_unknown_message_no_quick_reply():
    assert get_quick_reply("隨便問一句很長的問題") is None
