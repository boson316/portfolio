# 小boson · Perxona 3D 助手整合指南

作品集 [https://boson316.github.io/portfolio/](https://boson316.github.io/portfolio/) 的 3D 導覽助手「小boson」，使用 [Perxona Presentation SDK](https://docs.perxona.ai/docs/widget.html) 嵌入。  
**apiKey 只放後端**；前端僅保留公開的 `agentProfileId`，執行時向 `portfolio-api` 取 JWT `session_token`。

---

## 架構

```
訪客瀏覽器（GitHub Pages）
  ├─ perxona-config.js     → agentProfileId（可 commit）
  ├─ perxona-embed.js      → 載入 SDK、開 panel
  └─ GET /api/perxona-token → portfolio-api 簽 JWT
                                    ↑
                              PERXONA_API_KEY（.env，勿 commit）
```

| 元件 | 路徑 |
|------|------|
| 前端 embed | `cursor/3_Web與API/portfolio/` |
| 後端 API | `cursor/3_Web與API/portfolio-api/` |

---

## 一、Perxona Dashboard

### 分享網址 slug

- 顯示名稱可為「小boson」
- **URL slug 只能用** `a-z` `A-Z` `0-9` `_` `-`（≥3 字元）
- 建議：`xiaoboson`
- Live link：`https://live.perxona.ai/asia/boson316/xiaoboson`

### 部署存取控制（嵌入程式碼）

| 欄位 | 填什麼 |
|------|--------|
| 網域 | `boson316.github.io` |
| 不要填 | `https://github.com/boson316`（那是 profile，不是網站） |

本機 dev 與線上通常只能填一個網域；優先填 `boson316.github.io`，本機用 Render API + localhost Origin 白名單測試。

### 嵌入程式碼（參考）

Dashboard 會提供類似：

```html
<script type="module" src="https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js"></script>
<sv-agent
  agentProfileId="01KZTWWPD7VZY0R9G2JYF0C7X9"
  presentationMode="embedded"
  apiKey="（僅後端 .env，勿寫進前端 repo）"
></sv-agent>
```

---

## 二、後端 `.env`（portfolio-api）

### 建立

```powershell
cd c:\Users\User\Documents\code\cursor\3_Web與API\portfolio-api
Copy-Item .env.example .env
```

### 必填（Perxona）

```env
PERXONA_API_KEY=你的_Dashboard_apiKey
PERXONA_TOKEN_TTL_SECONDS=10800
PERXONA_ALLOWED_ORIGINS=https://boson316.github.io,http://localhost,http://127.0.0.1
```

### 選填（Groq 文字聊天 fallback）

```env
GROQ_API_KEY=gsk_xxxx
GROQ_MODEL=llama-3.1-8b-instant
PORT=5000
FLASK_DEBUG=0
```

### 啟動

```powershell
pip install -r requirements.txt
python app.py
```

預設：`http://127.0.0.1:5000`

### 驗證

> **PowerShell 注意：** `curl` 是 `Invoke-WebRequest` 別名，不支援 `-H`。請用 `curl.exe` 或下方 `Invoke-RestMethod`。

```powershell
# 方式 A（推薦）：Windows 內建 curl.exe
curl.exe -H "Origin: http://localhost:3000" http://127.0.0.1:5000/api/perxona-token

# 方式 B：PowerShell 原生
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/perxona-token" -Headers @{ Origin = "http://localhost:3000" }
```

成功回傳：

```json
{
  "sessionToken": "eyJ...",
  "expiresAt": 1234567890,
  "ttlSeconds": 10800
}
```

---

## 三、前端設定（portfolio）

### `perxona-config.js`（可 commit）

```javascript
window.PERXONA_CONFIG = {
  sdkUrl: 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js',
  agentProfileId: '01KZTWWPD7VZY0R9G2JYF0C7X9',
  presentationMode: 'embedded',
  liveUrl: 'https://live.perxona.ai/asia/boson316/xiaoboson'
};

// 本機 dev
window.PORTFOLIO_API_URL = 'http://127.0.0.1:5000';

// GitHub Pages 上線後改為 Render / Railway URL
// window.PORTFOLIO_API_URL = 'https://your-portfolio-api.onrender.com';
```

**不要**在前端寫 `apiKey` 或 `sessionToken`。

### 本機預覽

```powershell
cd c:\Users\User\Documents\code\cursor\3_Web與API\portfolio
npx serve .
```

1. 先起 `portfolio-api`（port 5000）
2. 再起前端（例如 port 3000）
3. 點右下角 💬 或「和 AI 聊聊」→ 右側 Perxona embedded panel

---

## 四、GitHub Pages 上線

1. **部署 `portfolio-api`** 到 Render / Railway
2. 平台 Environment Variables 填入與 `.env` 相同的 `PERXONA_*`、`GROQ_*`
3. **`perxona-config.js`** 設 `PORTFOLIO_API_URL` 為 API 根網址
4. **push portfolio** 到 GitHub Pages repo
5. Perxona Dashboard 網域白名單維持 `boson316.github.io`

---

## 五、API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/health` | `{ ok, groq, perxona }` |
| GET | `/api/perxona-token` | 簽發 JWT；需白名單 Origin |
| POST | `/api/chat` | Groq 文字回覆（小boson system prompt） |

### `/api/perxona-token` 安全

- JWT 演算法：HS256
- Payload：`iat`、`exp`（預設 TTL 3 小時）
- 簽名 secret：`PERXONA_API_KEY`
- 檢查 `Origin` / `Referer` 是否在 `PERXONA_ALLOWED_ORIGINS`
- 前端在 token 到期前 60 秒會重新 fetch

---

## 六、Perxona 知識庫 Prompt（貼 Dashboard）

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

## 七、相關檔案

| 檔案 | 用途 |
|------|------|
| `portfolio/perxona-config.js` | 公開 agentProfileId + API URL |
| `portfolio/perxona-config.example.js` | 範本 |
| `portfolio/perxona-embed.js` | SDK 載入、token fetch、panel |
| `portfolio/index.html` | `#perxonaPanel` 容器 |
| `portfolio-api/app.py` | `/api/perxona-token` 路由 |
| `portfolio-api/perxona_token.py` | JWT 簽發、Origin 檢查 |
| `portfolio-api/.env.example` | 環境變數範本 |
| `portfolio-api/.env` | 本機 secret（**勿 commit**） |

---

## 八、故障排除

| 現象 | 可能原因 |
|------|----------|
| 仍顯示舊文字聊天框 | `PORTFOLIO_API_URL` 未設或 token 請求失敗 |
| `/api/perxona-token` 403 | Origin 不在白名單；本機需 `http://localhost:xxxx` |
| `/api/perxona-token` 503 | 後端未設 `PERXONA_API_KEY` |
| Perxona widget 空白 | Dashboard 網域未加 `boson316.github.io` |
| 分享 slug 紅框 | slug 含中文；改用 `xiaoboson` |

---

## 九、安全提醒

- **apiKey 曾出現在聊天紀錄時**，建議至 Perxona Dashboard **rotate key**，並更新 `.env`
- 公開 repo 絕不 commit `.env` 或含 apiKey 的 config
- GitHub Pages 上 apiKey 可被任何人從 Network 看到；務必走 `/api/perxona-token` 路徑
