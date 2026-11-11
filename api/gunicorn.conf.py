"""gunicorn 設定：從 api/ 目錄啟動時會自動載入（Render rootDir 為 api）。

用執行緒 worker，讓一個慢的上游請求（Groq、Perxona proxy）不會擋住其他請求與 /api/health。
維持單一 process：速率限制的計數存在記憶體，多個 process 會各自計數。
"""
import os

worker_class = "gthread"
workers = int(os.getenv("WEB_CONCURRENCY", "1"))
threads = int(os.getenv("GUNICORN_THREADS", "8"))
# 要長於 Perxona proxy 的 30 秒上游逾時，否則 worker 會在轉發途中被重啟。
timeout = int(os.getenv("GUNICORN_TIMEOUT", "60"))
graceful_timeout = 30
keepalive = 5
