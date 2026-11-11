# Portfolio API（Perxona token + Groq chat）

後端程式碼目錄，與 repo 根目錄前端同屬 [boson316/portfolio](https://github.com/boson316/portfolio)。

簽發 Perxona `session_token`（JWT）與 Groq 文字聊天 fallback。前端整合見 repo 根目錄 `PERXONA.md`。

## 本機

```powershell
cd api
Copy-Item .env.example .env
pip install -r requirements.txt
python app.py
```

預設 http://127.0.0.1:5000

## Render

- Repo：`boson316/portfolio`
- **Root Directory：** `api`
- Start：`gunicorn --bind 0.0.0.0:$PORT app:app`（會自動載入 `api/gunicorn.conf.py`：單一 process、8 個執行緒、逾時 60 秒；可用 `GUNICORN_THREADS`、`GUNICORN_TIMEOUT` 調整）
- Environment：`PERXONA_API_KEY`、`PERXONA_ALLOWED_ORIGINS=https://boson316.github.io,...`
- 選填 `GROQ_MODEL`：指定聊天模型。不設或該模型被 Groq 下架時，會依序改用 `llama-3.3-70b-versatile`、`openai/gpt-oss-20b` 等候選，再不行就向 Groq 查詢可用模型（`GET /api/health` 的 `model` 顯示目前使用的模型）。
- 前端 `perxona-config.js` 的 `PRODUCTION_API_URL` 設為 `https://perxona.onrender.com`

## API

- `GET /api/health` — `{ ok, groq, model, perxona, perxonaProxy, forwarding }`（不回傳任何金鑰片段）
- `GET /api/perxona-token` — 簽 JWT；需白名單 Origin
- `POST /api/chat` — `{ message, history? }` → `{ reply }`（`message` 上限 1000 字；每則 `history` 截斷到 1000 字）

## 防濫用

- CORS 與 Perxona 端點只接受 `PERXONA_ALLOWED_ORIGINS` 內的來源：scheme 與 hostname 須完全相同；白名單沒寫 port 時允許任意 port。
- 每個 IP 每分鐘上限（超過回 `429`；設 `0` 停用）：`CHAT_RATE_LIMIT_PER_MINUTE`（預設 15）、`TOKEN_RATE_LIMIT_PER_MINUTE`（預設 10）、`PROXY_RATE_LIMIT_PER_MINUTE`（預設 120）。計數存在記憶體，多個 gunicorn worker 各自計數。
- `GROQ_TIMEOUT_SECONDS`（預設 12）：單次 Groq 請求逾時，且不重試；逾時就回本地 fallback，避免慢請求佔住 worker。
- `TRUSTED_PROXY_HOPS`（預設 3）：訪客 IP 取 `X-Forwarded-For` 從右邊數來第幾個。Render 上實測為「訪客 IP, Cloudflare 節點, Render 代理」，所以是 3。`GET /api/health` 的 `forwarding` 欄位只回報代理鏈結構（不含 IP），`cfPositionFromRight` 應等於 `trustedHops`。
