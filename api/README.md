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
- Start：`gunicorn --bind 0.0.0.0:$PORT app:app`
- Environment：`PERXONA_API_KEY`、`PERXONA_ALLOWED_ORIGINS=https://boson316.github.io,...`
- 前端 `perxona-config.js` 的 `PRODUCTION_API_URL` 設為 `https://perxona.onrender.com`

## API

- `GET /api/health` — `{ ok, groq, perxona }`
- `GET /api/perxona-token` — 簽 JWT；需白名單 Origin
- `POST /api/chat` — `{ message, history? }` → `{ reply }`
