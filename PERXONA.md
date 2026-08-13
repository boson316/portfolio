# 小boson · Perxona 3D 助手 — 整合與上線總結

作品集 [https://boson316.github.io/portfolio/](https://boson316.github.io/portfolio/) 的 3D 導覽助手「小boson」，使用 [Perxona Presentation SDK](https://docs.perxona.ai/docs/widget.html) 嵌入。

**核心原則：** Dashboard 的 `apiKey` **只放後端**；前端只保留公開的 `agentProfileId`，執行時向 API 取 JWT `session_token`。

---

## 架構總覽

```
訪客瀏覽器（GitHub Pages: boson316.github.io/portfolio）
  ├─ perxona-config.js     → agentProfileId + PRODUCTION_API_URL
  ├─ perxona-embed.js      → 載入 SDK、fetch token、掛 <sv-agent>
  └─ GET /api/perxona-token → Render 後端簽 JWT
                                    ↑
                         PERXONA_API_KEY（Render env，勿 commit）
```

| 元件 | Repo / 路徑 |
|------|-------------|
| 前端 embed | [boson316/portfolio](https://github.com/boson316/portfolio) · `cursor/3_Web與API/portfolio/` |
| 後端 API | [boson316/portfolio](https://github.com/boson316/portfolio) · `api/` |
| 線上 API | https://perxona.onrender.com |
| Live 頁（獨立） | https://live.perxona.ai/asia/boson316/xiaoboson |

### 與 Dashboard 嵌入範例的對照

| Dashboard 範例 | 本專案 |
|----------------|--------|
| `<script src="cdn.perxona.ai/asia/prod/latest/...">` | `perxona-embed.js` 動態載入 ✅ |
| `agentProfileId="01KZTWWPD7VZY0R9G2JYF0C7X9"` | `perxona-config.js` ✅ |
| `presentationMode="embedded"` | ✅ |
| `apiKey="..."` 寫在 HTML | **不放前端** → 改 `session_token` ✅ |

---

## 一、Perxona Dashboard

### Agent 設定

- 顯示名稱：小boson
- URL slug：`xiaoboson`（只能用 `a-z` `A-Z` `0-9` `_` `-`，≥3 字）
- Live link：https://live.perxona.ai/asia/boson316/xiaoboson

### 部署存取控制（嵌入網域白名單）

| 欄位 | 線上填 | 本機 dev 填 |
|------|--------|-------------|
| **網域** | `boson316.github.io` | `localhost` |

- 通常**只能填一個**；上線用 `boson316.github.io`，本機測試暫改 `localhost`
- **不要填：** `https://github.com/boson316`、`/portfolio` path、尾端 `/`
- 填完必須 **儲存**，等 1～2 分鐘生效

### 分享連結 vs 嵌入

| 項目 | 用途 |
|------|------|
| Live 連結 `live.perxona.ai/...` | Perxona 託管頁，**不受**你的網域白名單限制 |
| 嵌入 widget | 在作品集內嵌，**必須**通過網域白名單 |

---

## 二、後端 API（perxona repo）

### 本機 `.env`

```powershell
cd c:\Users\User\Documents\code\cursor\3_Web與API\portfolio\api
Copy-Item .env.example .env
```

```env
PERXONA_API_KEY=Dashboard_嵌入_apiKey_完整_UUID
PERXONA_TOKEN_TTL_SECONDS=10800
PERXONA_ALLOWED_ORIGINS=https://boson316.github.io,http://localhost,http://127.0.0.1
GROQ_API_KEY=gsk_xxxx          # 選填，文字聊天 fallback
FLASK_DEBUG=0
PORT=5000
```

```powershell
pip install -r requirements.txt
python app.py
```

根路徑 `/` 回 **404 是正常的**（只有 `/api/*`）。

### 本機驗證（PowerShell）

> `curl` 是 `Invoke-WebRequest` 別名，不支援 `-H` → 用 **`curl.exe`**

```powershell
curl.exe https://127.0.0.1:5000/api/health
curl.exe -H "Origin: http://localhost:3000" http://127.0.0.1:5000/api/perxona-token
```

---

## 三、Render 部署

### 建立 Service

1. [render.com](https://render.com) → **New Web Service** → Connect **`boson316/portfolio`**（Root Directory: **`api`**）
2. 設定：

| 欄位 | 值 |
|------|-----|
| Name | `perxona` |
| Build | `pip install -r requirements.txt` |
| Start | `gunicorn --bind 0.0.0.0:$PORT app:app` |
| Plan | Free |

### Environment Variables

| Key | Value |
|-----|-------|
| `PERXONA_API_KEY` | Dashboard 嵌入 apiKey（**與 Dashboard 逐字一致**） |
| `PERXONA_TOKEN_TTL_SECONDS` | `10800` |
| `PERXONA_ALLOWED_ORIGINS` | `https://boson316.github.io,http://localhost,http://127.0.0.1` |
| `GROQ_API_KEY` | 選填 |
| `FLASK_DEBUG` | `0` |

> ⚠️ `PERXONA_API_KEY` 若與 Dashboard 不一致，widget 會 **401 Unauthorized**（JWT 驗證失敗）。

### 線上驗證

```powershell
curl.exe https://perxona.onrender.com/api/health
curl.exe -H "Origin: https://boson316.github.io" https://perxona.onrender.com/api/perxona-token
```

預期 health：`{"ok":true,"perxona":true,...}`  
預期 token：含 `sessionToken`、`ttlSeconds:10800`

---

## 四、前端（portfolio repo）

### `perxona-config.js`

```javascript
window.PERXONA_CONFIG = {
  sdkUrl: 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js',
  agentProfileId: '01KZTWWPD7VZY0R9G2JYF0C7X9',
  presentationMode: 'embedded',
  liveUrl: 'https://live.perxona.ai/asia/boson316/xiaoboson'
};

var PRODUCTION_API_URL = 'https://perxona.onrender.com';

(function () {
  var host = location.hostname;
  window.PORTFOLIO_API_URL = (host === 'localhost' || host === '127.0.0.1')
    ? 'http://127.0.0.1:5000'
    : PRODUCTION_API_URL;
})();
```

**不要**在前端寫 `apiKey` 或硬編 `sessionToken`。

### 本機預覽

```powershell
# Terminal 1
cd c:\Users\User\Documents\code\cursor\3_Web與API\portfolio\api
python app.py

# Terminal 2
cd c:\Users\User\Documents\code\cursor\3_Web與API\portfolio
npx serve . -l 3000
start http://localhost:3000/
```

本機 Perxona 3D 需 Dashboard 網域白名單含 `localhost`；否則 widget 白屏／disconnected。

### Push GitHub Pages

```powershell
cd c:\Users\User\Documents\code\cursor\3_Web與API\portfolio
git add perxona-config.js perxona-embed.js index.html en/index.html styles.css script.js PERXONA.md
git commit -m "feat: Perxona 3D embed with Render API"
git push origin main
```

等 1～2 分鐘 → https://boson316.github.io/portfolio/ → **Ctrl+Shift+R** → 💬

---

## 五、API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/health` | `{ ok, groq, perxona }` |
| GET | `/api/perxona-token` | 簽 JWT；檢查 Origin 白名單 |
| POST | `/api/chat` | Groq 文字 fallback |

JWT：HS256 · payload `iat`/`exp` · secret = `PERXONA_API_KEY`

---

## 六、故障排除

| 現象 | 原因 | 解法 |
|------|------|------|
| PowerShell `curl -H` 報錯 | `curl` 是別名 | 用 `curl.exe` 或 `Invoke-RestMethod` |
| 開 `http://127.0.0.1:5000/` 404 | 根路徑無 route | 測 `/api/health` |
| 舊文字聊天框（快捷按鈕+送出） | token 失敗或未設 API URL | 設 `PORTFOLIO_API_URL`、確認 API 在跑 |
| Panel 白屏 | 本機未加 `localhost` 白名單 | Dashboard 暫改 `localhost` |
| Network **401**（`01KZTWWP...`、`disclaimer`） | Render `PERXONA_API_KEY` ≠ Dashboard apiKey | 重貼 key → Save → Redeploy |
| `disconnected` + 401 | 同上（JWT 驗證失敗） | 逐字比對 apiKey，rotate 後兩邊同步 |
| `/api/perxona-token` 403 | Render `PERXONA_ALLOWED_ORIGINS` 缺 Origin | 加 `https://boson316.github.io` |
| `/api/perxona-token` 503 | 未設 `PERXONA_API_KEY` | Render env 補上 |
| Live 頁正常、嵌入失敗 | 嵌入網域白名單或 401 | 查 Dashboard 網域 + Render key |
| 第一次很慢 | Render Free 冷啟動 | 等 ~30s 再試 |

### DevTools 快速查

1. **Network** → `perxona.onrender.com/api/perxona-token` → 200
2. **Network** → `cdn.perxona.ai` → 200
3. **Network** → Perxona API 請求 → 非 401
4. **Console** → `life-status: ready` 表示成功

---

## 七、上線 Checklist

- [ ] [boson316/portfolio](https://github.com/boson316/portfolio) `api/` 已 push
- [ ] Render `perxona` service Live
- [ ] Render env：`PERXONA_API_KEY` 與 Dashboard **一致**
- [ ] `curl.exe` health + token 皆 200
- [ ] Dashboard 網域：`boson316.github.io`
- [ ] [boson316/portfolio](https://github.com/boson316/portfolio) push `perxona-*` 檔案
- [ ] https://boson316.github.io/portfolio/ 點 💬 出現 3D widget

---

## 八、Perxona 知識庫 Prompt（貼 Dashboard）

```
你是「小boson」，Boson（GitHub: boson316）作品集網站的 3D 導覽助手。
語言：繁體中文（台灣）。語氣：同屆資工同學，每則 ≤120 字。

作品集：https://boson316.github.io/portfolio/
聯絡：poboson316@gmail.com

專案：
1. GPU Lab — matmul 521×、MNIST 99% — github.com/boson316/RTX3050-GPU-Mastery
2. 退休計算機 v5 — boson316.github.io/niu/annual_return_calculator_v5.html
3. 宜大美食地圖 — food-map-niu-v2.streamlit.app
4. 新聞蒐集 — news-8zud.onrender.com
5. ML 專區 — KNN ~94.7%
6. RAG — 開發中

禁止編造未列出的成就。偏題帶回作品集。
```

---

## 九、相關檔案

| 檔案 | 用途 |
|------|------|
| `portfolio/perxona-config.js` | agentProfileId + 本機/線上 API URL |
| `portfolio/perxona-embed.js` | SDK、token、panel、lifecycle 提示 |
| `portfolio/index.html` | `#perxonaPanel` / `#perxonaMount` |
| `api/app.py` | Flask 路由 |
| `api/perxona_token.py` | JWT 簽發、Origin 檢查 |
| `render.yaml`（rootDir: api） | Render 部署範本 |
| `api/.env.example` | 本機 env 範本 |

---

## 十、安全提醒

- apiKey **絕不** commit 到 GitHub；只放 Render env / 本機 `.env`
- apiKey 曾外洩（聊天、截圖）→ Dashboard **rotate** → 同步更新 Render
- GitHub Pages 若直接寫 `apiKey`，任何人 F12 都看得到 → 必須走 `/api/perxona-token`
