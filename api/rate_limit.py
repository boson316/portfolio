"""簡易記憶體內滑動視窗速率限制（單一 process；多 worker 時各自計數）。"""
from __future__ import annotations

import threading
import time
from collections import deque

MAX_TRACKED_KEYS = 10_000


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float = 60.0):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str, now: float | None = None) -> bool:
        """limit <= 0 代表停用限制。"""
        if self.limit <= 0:
            return True
        now = time.monotonic() if now is None else now
        cutoff = now - self.window
        with self._lock:
            if len(self._hits) > MAX_TRACKED_KEYS:
                self._prune(cutoff)
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            return True

    def _prune(self, cutoff: float) -> None:
        stale = [k for k, hits in self._hits.items() if not hits or hits[-1] <= cutoff]
        for k in stale:
            del self._hits[k]
        if len(self._hits) > MAX_TRACKED_KEYS:
            self._hits.clear()
