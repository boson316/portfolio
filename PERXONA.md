# 小boson · Perxona 3D + Groq 文字聊天 — 整合總結

**Live 作品集：** https://boson316.github.io/portfolio/  
**Repo：** https://github.com/boson316/portfolio  
**後端 API：** https://perxona.onrender.com（Render · Root Directory: `api`）  
**Perxona Live（備援）：** https://live.perxona.ai/asia/boson316/littleboson

### 已確認設定（2026-08-13 · 勿再詢問）

| 項目 | 狀態 | 值 |
|------|------|-----|
| Dashboard **部署存取控制 → 網域** | ✅ 已設定 | `boson316.github.io` |
| Render `PERXONA_ALLOWED_ORIGINS` | ✅ | 含 `https://boson316.github.io` |
| Render health / token | ✅ | `ok/perxona/groq` 全 true；token 200 |
| Perxona Live Agent | ✅ | 正常 |

> **Agent 排查約定：** 白名單與 Live 已確認。**嵌入仍失敗時**改查：GitHub Pages 是否已 push 最新 `perxona-embed.js`（目前 `?v=6`）、Network **All** 篩 `cdn.perxona.ai`、Console 紅字、Render `PERXONA_API_KEY` 與 Dashboard apiKey 是否一致（401）。

### 快速導覽

| 主題 | 章節 |
|------|------|
| 雙 FAB（3D + 💬 Groq） | [§1](#1-雙-fab3d--groq) |
| `portfolio-api` → `api/` 合併 | [§2](#2-架構與-repo-結構) |
| Dashboard / Render 設定 | [§3](#3-perxona-dashboard-設定) · [§4](#4-render-環境變數) |
| `bubble` vs 本專案 `embedded` | [§3](#本專案與-dashboard-差異) |
| 403 排查 · Checklist · Push | [§9](#9-故障排除403-優先) · [§14](#14-排查紀錄2026-08-13--agent-對話摘要) · [§10](#10-上線-checklist) · [§8](#8-push-指令powershell) |
| 安全（apiKey 不放前端） | [§11](#11-安全) |

---

## 1. 雙 FAB（3D + 💬）

| 按鈕 | 功能 | 技術 |
|------|------|------|
| **3D**（紫色 FAB） | 開 3D 小boson 面板 | Perxona SDK · `embedded` · `session_token` |
| **💬**（橘色 FAB） | 文字聊天（快捷 chips + 輸入框） | Groq · `POST /api/chat` |

- 同一個 Agent（`agentProfileId` 不變），兩個入口、兩個 panel。
- **apiKey 永不進前端**；3D 走 Render 簽 JWT；💬 走 Groq（key 也在 Render）。

### HTML 結構（`index.html` / `en/index.html`）

```html
<div class="fab-stack" id="fabStack">
  <button id="perxonaFab" class="chat-fab perxona-fab">3D</button>   <!-- 紫：Perxona -->
  <button id="chatFab" class="chat-fab">💬</button>                  <!-- 橘：Groq 文字 -->
</div>
<aside id="chatPanel">…</aside>       <!-- script.js 控制 -->
<aside id="perxonaPanel">…</aside>    <!-- perxona-embed.js lazy mount -->
```

| 面板 | 觸發 | JS | 後端 |
|------|------|-----|------|
| `#chatPanel` | 💬 FAB | `script.js` | `POST /api/chat` |
| `#perxonaPanel` | 3D FAB | `perxona-embed.js` | `GET /api/perxona-token` → SDK |

---

## 2. 架構與 Repo 結構

```
GitHub Pages（boson316.github.io/portfolio）
  ├─ perxona-config.js      agentProfileId、API URL、Live URL
  ├─ perxona-embed.js       SDK、token、按 3D 才 mount <sv-agent>
  ├─ script.js              💬 文字聊天 → /api/chat
  └─ GET /api/perxona-token
           ↓
Render（portfolio/api/）
  ├─ PERXONA_API_KEY        簽 session_token（JWT HS256）
  └─ GROQ_API_KEY           文字聊天（選填但建議設）
```

### `portfolio-api` → `api/` 合併（單 repo 部署）

原先獨立 repo `portfolio-api` 已併入 `portfolio/api/`，前端 GitHub Pages + 後端 Render 共用同一 repo。

```
portfolio/                          # boson316/portfolio
├── index.html, en/, styles.css     # GitHub Pages 靜態前端
├── perxona-config.js               # 公開設定（無 secret）
├── perxona-embed.js                # 3D SDK + lazy mount
├── script.js                       # 💬 Groq 文字聊天
├── render.yaml                     # Render Blueprint：rootDir: api
└── api/                            # ← 原 portfolio-api 整包移入
    ├── app.py                      # Flask：/api/health, /api/chat, /api/perxona-token
    ├── perxona_token.py            # JWT HS256 簽 session_token
    ├── requirements.txt
    ├── .env.example
    ├── README.md
    └── tests/
```

**Render 設定重點：** Service 的 **Root Directory = `api`**（不是 repo 根）。`render.yaml` 已寫好，手動建 service 時也要填。

---

## 3. Perxona Dashboard 設定

### Agent

| 項目 | 值 |
|------|-----|
| agentProfileId | `01KZTWWPD7VZY0R9G2JYF0C7X9` |
| URL slug | `littleboson` |
| Live | https://live.perxona.ai/asia/boson316/littleboson |

### Desktop 嵌入範例（Dashboard 提供）

```html
<script
  type="module"
  src="https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js"
></script>

<sv-agent
  agentProfileId="01KZTWWPD7VZY0R9G2JYF0C7X9"
  presentationMode="bubble"
  apiKey="YOUR_API_KEY"
></sv-agent>
```

### 本專案與 Dashboard 差異（`bubble` vs `embedded`）

| | Dashboard 範例 | 本專案 | 原因 |
|---|----------------|--------|------|
| 呈現 | `presentationMode="bubble"` | `embedded` | 我們用自訂 `#perxonaPanel`，不要 SDK 右下角浮球 |
| 認證 | `apiKey="YOUR_API_KEY"` 寫死 HTML | `session_token="…"` 動態 | GitHub Pages 公開；key 只放 Render |
| 載入 | 靜態 `<script>` + 立即 `<sv-agent>` | `perxona-embed.js` 動態載入 + **lazy mount** | 按 3D 且 panel 可見才 mount，避免 hidden 逾時 |
| 文字聊天 | Perxona 內建（若有） | 獨立 💬 FAB → Groq `/api/chat` | 文字走 Groq，3D 走 Perxona，同一 Agent |

**Dashboard 範例（勿直接 copy 到 GitHub Pages）：**

```html
<sv-agent agentProfileId="…" presentationMode="bubble" apiKey="SECRET"></sv-agent>
```

**本專案實際（`perxona-embed.js` 動態建立）：**

```html
<sv-agent
  agentProfileId="01KZTWWPD7VZY0R9G2JYF0C7X9"
  presentationMode="embedded"
  session_token="eyJ…"
  appearanceMode="light|dark"
></sv-agent>
```

> `bubble` = SDK 自己管 UI 浮球；`embedded` = 你提供容器（`#perxonaMount`），我們用 FAB 開 panel。

### 部署存取控制

| 環境 | 網域白名單 | 狀態 |
|------|-------------|------|
| 線上（GitHub Pages） | `boson316.github.io` | ✅ **已設定**（2026-08-13） |
| 本機 dev | `localhost` | 本機測試時另填 |

格式規則（建檔用，**上線已 OK**）：

- **只填 host**，不要 `https://`、不要 `/portfolio`、不要尾端 `/`
- Dashboard 通常一次填一個 host；儲存後等 **1～2 分鐘** 生效

---

## 4. Render 環境變數

### Render Dashboard 建 service 步驟

1. [dashboard.render.com](https://dashboard.render.com) → **New → Web Service**
2. Connect `boson316/portfolio` repo
3. **Root Directory：** `api`（⚠️ 必填，否則找不到 `app.py`）
4. **Runtime：** Python 3.11
5. **Build Command：** `pip install -r requirements.txt`
6. **Start Command：** `gunicorn --bind 0.0.0.0:$PORT app:app`
7. **Environment** 表（見下）→ Deploy

或 repo 根目錄 `render.yaml` Blueprint 一鍵建（已含 `rootDir: api`）。

| Key | 說明 |
|-----|------|
| `PERXONA_API_KEY` | Dashboard 嵌入 apiKey，**逐字一致**（簽 JWT secret） |
| `PERXONA_TOKEN_TTL_SECONDS` | `10800`（3 小時） |
| `PERXONA_ALLOWED_ORIGINS` | `https://boson316.github.io,http://localhost,http://127.0.0.1` |
| `GROQ_API_KEY` | Groq 文字聊天（`gsk_...`） |
| `FLASK_DEBUG` | `0` |

> `GET /` 回 **404 正常**；只測 `/api/*`。改 env 後 Render 會自動 redeploy。

### 驗證

```powershell
curl.exe https://perxona.onrender.com/api/health
curl.exe -H "Origin: https://boson316.github.io" https://perxona.onrender.com/api/perxona-token
```

health 含 `perxonaKeyHint`（前4…後4）供與 Dashboard apiKey 比對，不洩漏完整 key。

預期 health：

```json
{"ok": true, "perxona": true, "groq": true, "perxonaKeyHint": "4b69…726e", "perxonaKeyLen": 36}
```

---

## 5. 本機 `.env`（選用）

```powershell
cd c:\Users\User\Documents\code\cursor\3_Web與API\portfolio\api
Copy-Item .env.example .env
notepad .env
```

```env
PERXONA_API_KEY=Dashboard_嵌入_apiKey
PERXONA_TOKEN_TTL_SECONDS=10800
PERXONA_ALLOWED_ORIGINS=https://boson316.github.io,http://localhost,http://127.0.0.1
GROQ_API_KEY=gsk_xxxx
FLASK_DEBUG=0
PORT=5000
```

`.env` 已在 `.gitignore`，**勿 commit**。

---

## 6. 前端設定（`perxona-config.js`）

```javascript
window.PERXONA_CONFIG = {
  sdkUrl: 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js',
  agentProfileId: '01KZTWWPD7VZY0R9G2JYF0C7X9',
  presentationMode: 'embedded',
  liveUrl: 'https://live.perxona.ai/asia/boson316/littleboson'
};

var PRODUCTION_API_URL = 'https://perxona.onrender.com';
```

### 3D 載入流程（`perxona-embed.js`）

1. 頁面載入 → 背景取 `session_token` + 載入 SDK  
2. 使用者按 **3D** → 開 `#perxonaPanel` → **此時才** mount `<sv-agent>`  
3. 避免在 hidden panel 內初始化造成逾時  

HTML 載入加 cache bust：`perxona-config.js?v=4`、`perxona-embed.js?v=6`

---

## 7. API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/health` | `{ ok, groq, perxona }` |
| GET | `/api/perxona-token` | 簽 JWT；檢查 Origin |
| POST | `/api/chat` | Groq 文字聊天 `{ message, history? }` |

JWT：`HS256` · payload `iat` + `exp` · secret = `PERXONA_API_KEY`  
前端屬性：`session_token`（官方 snake_case）

---

## 8. Push 指令（PowerShell）

```powershell
cd c:\Users\User\Documents\code\cursor\3_Web與API\portfolio

git add perxona-config.js perxona-embed.js index.html en/index.html styles.css script.js PERXONA.md api/

git commit -m "feat: 你的 commit 訊息"

git push origin main
```

> PowerShell **不支援** bash `<<'EOF'`；用 `-m "..."` 或雙引號字串。

等 GitHub Pages 1～3 分鐘 → **Ctrl+Shift+R** 強刷。

---

## 9. 故障排除

> **前提：** Dashboard 網域 `boson316.github.io`、Live Agent、Render token **均已確認**（見文首表）。以下不再把「去填白名單」當第一解法。

403 有**兩層**：

| 層 | 端點 | 誰擋 | 本專案狀態 |
|----|------|------|------------|
| **A. Flask** | `GET /api/perxona-token` → 403 | `PERXONA_ALLOWED_ORIGINS` | ✅ 已通（token 200） |
| **B. Perxona 雲端** | `validness` / `initialize` → 403 | Dashboard 網域白名單 | ✅ 已填 `boson316.github.io` |

**嵌入仍失敗時（token 200 但 Perxona 雲端 403）：**

```
token 200 + initialize / agentProfileId / disclaimer 全 403
  ① 先確認測試環境 Origin（本機 localhost → Dashboard 白名單只有 boson316.github.io 會 403）
  ② 點 Network 裡 initialize 那條 → 貼 Request URL、Origin、Response body
  ③ 比對 key：curl /api/health 的 perxonaKeyHint；或用 dashboard key 驗 live JWT（見 §14）
  ④ key 已一致仍 403 → Perxona 支援（allowlist 未同步，少見）

1. GitHub Pages 是否最新？perxona-embed.js?v=7 已 push？Ctrl+Shift+R 強刷
2. Network All → cdn.perxona.ai/index.js 是否 200？
3. Console 紅字
```

| 現象 | 原因 | 解法 |
|------|------|------|
| token 200，畫面「初始化失敗」 | 舊版 embed / SDK 未載入 | push `perxona-embed.js?v=7`；Network **All** 查 `cdn.perxona.ai` |
| token 200，`initialize` / agent id **403**（**本機**） | Dashboard 白名單無 `localhost` | 改在 **https://boson316.github.io/portfolio/** 測；或 Dashboard 加 `localhost` |
| token 200，`initialize` **403**（**Pages Origin 正確**） | key 不一致 **或** Perxona 雲端 allowlist | 先驗 JWT 簽章（§14）；key OK 仍 403 → 聯絡 Perxona |
| token 200，Perxona API **403**（其他） | 同上或 allowlist 延遲 | 先比 key + Origin；仍失敗聯絡 Perxona |
| Perxona API **401** | Render `PERXONA_API_KEY` ≠ Dashboard apiKey | 重貼 → Save → Redeploy |
| `/api/perxona-token` **403** | `PERXONA_ALLOWED_ORIGINS` 缺 Origin（A 層） | 加 `https://boson316.github.io` |
| SDK 載入失敗／逾時 | CDN 被擋、adblock | 關擋廣告；無痕視窗重試 |
| `groq: false` | 未設 `GROQ_API_KEY` | Render 補上 Groq key |
| 3D 載入逾時 | 冷啟動或 SDK 掛住 | Render free tier ~30s；強刷 |
| Live 正常、嵌入失敗 | 前端/SDK/ key 問題 | 依上 five-step；Live 正常代表 Agent 本身 OK |
| 根路徑 404 | 正常 | 只測 `/api/health` |

### DevTools 檢查順序

1. Network → `perxona.onrender.com/api/perxona-token` → **200** + JSON `token`
2. Network → **All** → `cdn.perxona.ai/.../index.js` → **200**
3. Network → Perxona 雲端 **`initialize`**（主兇）→ 403 時點開看 **Origin** + Response
4. 連帶 403 可忽略：`disclaimer?lang=en`、重複的 agent id 請求
5. Console → 紅字 / `life-status: ready`

### Network 403 該看哪一條

| Name（DevTools） | 層 | 優先 |
|------------------|-----|------|
| `perxona-token` | A · Render Flask | token **200** = 後端 OK，不是兇手 |
| **`initialize`** | B · Perxona 雲端 | **先點這條** · Initiator：`useWidgetThreeDViewEventBus.js` |
| `01KZTWWPD7VZY0R9G2JYF0C7X9` | B · agent 資源 | 同 session 失敗的連帶請求 |
| `disclaimer?lang=en` | B · 免責 | 連帶失敗，可忽略 |

---

## 10. 上線 Checklist

- [x] Dashboard 網域 → `boson316.github.io`（部署存取控制，2026-08-13 已設定）
- [x] `curl.exe` health → `perxona:true`, `groq:true`
- [x] Perxona Live Agent 正常
- [ ] Render service `perxona` Live（Root Directory: `api`）
- [ ] `PERXONA_API_KEY` = Dashboard apiKey
- [ ] `GROQ_API_KEY` 已設（文字聊天）
- [ ] GitHub push → Pages 含 `perxona-embed.js?v=7`
- [ ] 作品集右下角 **3D + 💬** 兩顆 FAB
- [ ] 3D 面板載入成功

---

## 11. 安全

**apiKey 永不進前端** — 這是 GitHub Pages 公開 repo 的硬規則。

| Secret | 放哪 | 勿放哪 |
|--------|------|--------|
| `PERXONA_API_KEY` | Render env、本機 `api/.env` | HTML、`perxona-config.js`、commit |
| `GROQ_API_KEY` | 同上 | `script.js`、前端任何檔 |
| `agentProfileId` | 前端 OK（本來就公開） | — |

- 前端只用 `session_token`（短期 JWT，由 Render 簽發）
- `.env` 已在 `.gitignore`；用 `api/.env.example` 當範本
- 曾把 apiKey 貼在聊天／截圖／commit → Dashboard **rotate apiKey** → 同步更新 Render `PERXONA_API_KEY`
- `perxona-config.example.js` 可 commit；真實 key 永遠不進 repo

---

## 12. 相關檔案

| 檔案 | 用途 |
|------|------|
| `perxona-config.js` | Agent ID、API URL、Live URL |
| `perxona-embed.js` | SDK、token、3D panel、lifecycle |
| `script.js` | 💬 Groq 文字聊天 |
| `index.html` / `en/index.html` | 雙 FAB、`#perxonaPanel` |
| `api/app.py` | Flask 路由 |
| `api/perxona_token.py` | JWT 簽發 |
| `render.yaml` | Render 部署 |
| `api/.env.example` | 本機 env 範本 |
| `api/README.md` | 後端說明 |

---

## 13. Perxona 知識庫 Prompt（貼 Dashboard）

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

## 14. 排查紀錄（2026-08-13 · Agent 對話摘要）

### 背景驗證（使用者）

| 項目 | 結果 |
|------|------|
| `GET /api/health` | **200** · `{"ok":true,"perxona":true,"groq":true}` |
| `GET /api/perxona-token`（含 Origin） | **200** · JWT 長度 128 · `iat` / `exp` 齊 |
| 初步假設 | 403 因 JWT 缺欄位 **或** Render `PERXONA_API_KEY` ≠ Dashboard apiKey |

### 實測結論（Agent 覆核 · 同日下午）

**key 一致，JWT 簽章正確 — 初步假設的「key 不一致」不成立。**

| 比對項 | 值 |
|--------|-----|
| Dashboard Desktop 嵌入 apiKey | `4b69da5a-53d0-4da8-82d5-2f55b7a5726e` |
| Render `PERXONA_API_KEY` | 同上（截圖一致） |
| Dashboard 部署存取控制網域 | `boson316.github.io` |
| Render `PERXONA_ALLOWED_ORIGINS` | 含 `https://boson316.github.io`、localhost |

驗簽指令（live token + Dashboard key → OK）：

```powershell
curl.exe -s -H "Origin: https://boson316.github.io" https://perxona.onrender.com/api/perxona-token

python -c "import jwt; jwt.decode('<sessionToken>', '4b69da5a-53d0-4da8-82d5-2f55b7a5726e', algorithms=['HS256']); print('VERIFY OK')"
```

### Network 截圖（GitHub Pages · 嵌入 3D）

| 請求 | Status | 說明 |
|------|--------|------|
| `perxona-token` | **200** | Render 簽 token 正常 |
| **`initialize`** | **403** | Perxona 雲端拒絕 session · **主兇** |
| `01KZTWWPD7VZY0R9G2JYF0C7X9` | **403** | agent 資源 · 連帶 |
| `disclaimer?lang=en` | **403** | 連帶 · 可忽略 |

Initiator 皆為 SDK 內 `useWidgetThreeDViewEventBus.js`。  
截圖當下載入 `perxona-embed.js?v=6`（repo 已 `?v=7`）→ 需強刷或確認 Pages 已 push。

### 403 兩層（釐清因果）

```
A 層 Flask     perxona-token 200  →  PERXONA_ALLOWED_ORIGINS、簽 JWT  OK
B 層 Perxona   initialize 403     →  雲端驗 session + 部署存取控制（網域白名單）
```

**常見誤判：**

- ❌ 「JWT 格式 OK 所以 403 一定是 key 錯」→ key 已驗一致仍可能 403（Origin 不對、allowlist 延遲）
- ❌ 在本機測 3D → token 200（Flask 允 localhost）但 initialize 403（Dashboard 只白名單 `boson316.github.io`）
- ❌ 重貼 apiKey / redeploy Render → **key 已一致時無效**

### 待補證據（解 B 層 403）

在 **https://boson316.github.io/portfolio/** 點 **`initialize` 403** 那條，記錄：

1. **Request URL**（完整含 domain）
2. **Request Headers → Origin**（應為 `https://boson316.github.io`）
3. **Response body**（JSON 若有）

Origin 正確 + key 已驗仍 403 → 聯絡 Perxona 支援。

### initialize 403 實證（2026-08-13 · GitHub Pages 正式站）

**Request**

| 欄位 | 值 |
|------|-----|
| URL | `POST https://console.perxona.ai/asia/api/v1/services/conversation/initialize` |
| Origin | `https://boson316.github.io` ✅ |
| Referer | `https://boson316.github.io/` ✅ |
| Header | `x-api-token: eyJ…`（JWT · HS256） |
| Header | `x-fingerprint: 8c7fcf09…` |

**Response**

| 欄位 | 值 |
|------|-----|
| Status | **403** |
| CORS | `access-control-allow-origin: https://boson316.github.io`（CORS 有過，非瀏覽器擋） |
| Body | **59 bytes JSON** — DevTools → Response 分頁需複製全文（判斷 domain / token / agent 哪個被拒） |

**已排除**

| 假設 | 結果 |
|------|------|
| 測錯環境（localhost） | ❌ Origin 是正式 Pages |
| Render key ≠ Dashboard apiKey | ❌ live JWT 用 `4b69da5a-…5726e` 驗簽 OK |
| JWT 缺 `iat`/`exp` | ❌ payload 齊 · 長度 128 |
| Flask A 層 | ❌ `perxona-token` 200 |

**仍可能（B 層 · 需 Response body 或 Perxona 支援）**

1. Dashboard「部署存取控制」UI 已存，**後端 allowlist 未同步**（CORS 過、initialize 仍 403 的典型）
2. 此 apiKey **未綁定** agent `01KZTWWPD7VZY0R9G2JYF0C7X9`（scope 403）
3. apiKey 曾 rotate／刪除重建，Perxona 後端與 Dashboard 顯示不一致（少見；JWT 本地驗簽仍過）

**下一步（依序）**

1. DevTools → `initialize` → **Response** + **Payload** 分頁全文貼上
2. Dashboard → 部署存取控制 → 確認 `boson316.github.io` → **儲存** → 等 2 分鐘 → 強刷
3. 仍 403 → Dashboard **刪除 apiKey → 重建** → 整段貼 Render `PERXONA_API_KEY` → redeploy
4. 仍 403 → 帶下列資訊聯絡 Perxona 支援：
   - Origin、`agentProfileId`、initialize URL、403 Response JSON
   - 說明 Live Agent 正常、嵌入 initialize 403、JWT HS256 僅 iat/exp

**附：A/B 對照（選用）**

本機開 `test.html`（含 Dashboard 範例 `apiKey` + `bubble`），用 `npx serve` 無法模擬 Pages Origin。  
若需確認 key 本身：Dashboard 預覽或 Live 頁正常即可；嵌入路徑問題集中查 session_token + allowlist。


`curl /api/health` 若**無** `perxonaKeyHint` / `perxonaKeyLen` → Render 跑舊版 `api/`（不影響 key 正確性，但建議 push 最新 `api/app.py` 後 redeploy 以便比對指紋）。

### 附：模型選擇（非 code 問題）

此類 **DevTools + 第三方 SaaS 白名單** 排查：

- **不必**換 Codex（演算法／hot path 用）
- **不必**為 403 升 Opus；缺的是 Network 證據，不是 impl
- 若需換 Agent：Sonnet / Terra 照 §9 checklist 收斂即可

---

**文件版本：** 2026-08-13 · §14 排查紀錄 · embed `?v=7`
