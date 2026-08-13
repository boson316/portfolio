"""意圖：health 回傳 key 指紋供比對，不洩漏完整 secret。"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from perxona_token import perxona_key_hint


def test_perxona_key_hint_masks_middle():
    hint = perxona_key_hint("01234567-89ab-cdef-0123-456789abcdef")
    assert hint is not None
    assert hint["hint"] == "0123…cdef"
    assert hint["len"] == 36


def test_perxona_key_hint_none_for_short_key():
    assert perxona_key_hint("abc") is None
