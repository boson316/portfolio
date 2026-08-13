# 小boson · Perxona 3D + Groq 文字聊天 — 整合總結

**Live 作品集：** https://boson316.github.io/portfolio/  
**Repo：** https://github.com/boson316/portfolio  
**後端 API：** https://perxona.onrender.com（Render · Root Directory: `api`）  
**Perxona Live（備援）：** https://live.perxona.ai/asia/boson316/littleboson

### 現況總結（2026-08-13 下午 · 整合版）

| 項目 | 狀態 | 值 |
|------|------|-----|
| Dashboard **部署存取控制 → 網域** | ✅ | `boson316.github.io` |
| Render `PERXONA_ALLOWED_ORIGINS` | ✅ | 含 `https://boson316.github.io` |
| Render **Repository / Root** | ✅ | `boson316/portfolio` · **`api`** |
| Render health / proxy 預檢 | ✅ | `perxonaProxy: true` · OPTIONS **204** |
| Perxona Live Agent | ✅ | https://live.perxona.ai/asia/boson316/littleboson |
| JWT `initialize` code **1002** | ❌ | Perxona 雲端 session key 未 provision → **proxy 繞過** |
| 線上繞過 A′ | ✅ | `/api/perxona-proxy` + `x-api-key` + CORS |
| **3D 嵌入策略（v13）** | ✅ | **預設 Live iframe + 背景預載**；略過 SDK 空等 |
| `native.zip` CDN | ❌ **403** | S3 AccessDenied；同 rev **`import.zip` 200** |
| SDK motion 改寫（v12+） | ✅ | fetch 層 `native.zip` → `import.zip`（SDK 路徑用） |
| **3D 知識庫** | 📋 待上傳 | `perxona-knowledge-base.txt` → Dashboard 知識庫 |
| **💬 文字聊天知識** | ✅ | `api/app.py` `SYSTEM_PROMPT`（Groq） |
| embed 版本 | ✅ | `perxona-embed.js?v=13` · `perxona-config.js?v=5` |

> **Agent 約定：** apiKey **永不**進前端。3D 與 💬 **知識來源不同**——見 [§13](#13-perxona-知識庫3d-avatar-必設) 與 [§17](#17-本次對話總結2026-08-13-下午)。

**3D 實際路徑（`perxona-embed.js?v=13` · `preferLiveIframe: true`）：**

1. 進站 → **背景預載** `live.perxona.ai` iframe（隱藏）
2. 按 3D FAB → **立刻**把預載 iframe 移入 `#perxonaMount`（不再走 SDK → disconnected → 空等）
3. 若改 `preferLiveIframe: false`：走 SDK；`console.perxona.ai` → proxy；CDN `native.zip` → `import.zip` 改寫
4. SDK fallback grace：**2s**（`disconnectGraceMs` 可調）；全逾時 **120s**
5. `native.zip` 403 根因：CDN **未 publish native.zip**，只有 `import.zip` → 見 [§16](#16-3d-前端載入與-nativezip-4032026-08-13)

**embed 版本史**

| 版本 | 內容 |
|------|------|
| `v=8`～`10` | proxy fallback · Live iframe · grace 15s · timeout 120s |
| `v=11` | grace 15s→5s · `preferLiveIframe` 選項 |
| `v=12` | 同步 hook：`native.zip`→`import.zip` |
| `v=13` | **預設 Live iframe + 背景預載** · grace 2s |

**commit（建議一併 push）**

| 檔案 | 內容 |
|------|------|
| `perxona-embed.js` | v13 Live 預載 · motion 改寫 · grace |
| `perxona-config.js` | `preferLiveIframe: true` |
| `perxona-knowledge-base.txt` / `.md` | 3D avatar 知識庫（上傳 .txt） |
| `PERXONA.md` | 本總結 |

**Render 部署：** [§15](#15-render-部署與-repo-切換2026-08-13) · **native.zip / embed：** [§16](#16-3d-前端載入與-nativezip-4032026-08-13) · **知識庫：** [§13](#13-perxona-知識庫3d-avatar-必設) · **對話總結：** [§17](#17-本次對話總結2026-08-13-下午)

### 快速導覽

| 主題 | 章節 |
|------|------|
| 雙 FAB（3D + 💬 Groq） | [§1](#1-雙-fab3d--groq) |
| `portfolio-api` → `api/` 合併 | [§2](#2-架構與-repo-結構) |
| Dashboard / Render 設定 | [§3](#3-perxona-dashboard-設定) · [§4](#4-render-環境變數) |
| `bubble` vs 本專案 `embedded` | [§3](#本專案與-dashboard-差異) |
| 403 排查 · Checklist · Push | [§9](#9-故障排除) · [§14](#14-排查紀錄2026-08-13--完整對話摘要) · [§15](#15-render-部署與-repo-切換2026-08-13) · [§16](#16-3d-前端載入與-nativezip-4032026-08-13) · [§17](#17-本次對話總結2026-08-13-下午) · [§13](#13-perxona-知識庫3d-avatar-必設) · [§10](#10-上線-checklist) · [§8](#8-push-指令powershell) |
| 安全（apiKey 不放前端） | [§11](#11-安全) |

---

## 1. 雙 FAB（3D + 💬）

| 按鈕 | 功能 | 技術 |
|------|------|------|
| **3D**（紫色 FAB） | 開 3D 小boson 面板 | SDK `embedded` + **proxy `x-api-key`**；失敗 iframe Live |
| **💬**（橘色 FAB） | 文字聊天（快捷 chips + 輸入框） | Groq · `POST /api/chat` |

- 同一個 Agent（`agentProfileId` 不變），兩個入口、兩個 panel。
- **apiKey 永不進前端**；3D：Render 簽 JWT（給 SDK）+ proxy 用 apiKey 打 Perxona；💬 走 Groq。

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
| `#perxonaPanel` | 3D FAB | `perxona-embed.js` | token + `/api/perxona-proxy` → SDK；失敗 iframe Live |

---

## 2. 架構與 Repo 結構

```
GitHub Pages（boson316.github.io/portfolio）
  ├─ perxona-config.js      agentProfileId、API URL、Live URL
  ├─ perxona-embed.js       SDK、token、proxy 改寫、失敗 iframe Live
  ├─ script.js              💬 文字聊天 → /api/chat（另含證書 lightbox，與 3D 無關）
  └─ GET /api/perxona-token  +  console.perxona.ai → /api/perxona-proxy
           ↓
Render（portfolio/api/）
  ├─ PERXONA_API_KEY        簽 JWT + proxy 的 x-api-key
  └─ GROQ_API_KEY           文字聊天
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
    ├── app.py                      # Flask：health、chat、perxona-token、perxona-proxy
    ├── perxona_token.py            # JWT HS256 簽 session_token
    ├── perxona_proxy.py            # 只轉 console.perxona.ai，改掛 x-api-key
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

### 3D 載入流程（`perxona-embed.js?v=8`）

1. 頁面載入 → 安裝 `console.perxona.ai` → `/api/perxona-proxy` 改寫；背景取 token + 載入 SDK  
2. 按 **3D** → 開 `#perxonaPanel` → **此時才** mount `<sv-agent>`  
3. initialize 仍 403／逾時 → iframe Live；連結「Live 3D 頁」

---

## 7. API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/health` | `{ ok, groq, perxona, perxonaProxy }` |
| GET | `/api/perxona-token` | 簽 JWT；檢查 Origin |
| GET/POST… | `/api/perxona-proxy?target=` | 只轉 `https://console.perxona.ai/*`，改掛 `x-api-key` |
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
| **B. Perxona 雲端** | `initialize` → 403 | session JWT 驗簽 | ❌ code **1002**（§14） |

**嵌入仍失敗時（token 200 · 畫面仍掛）：**

```
① Network 應看到 perxona-proxy（不要再直打 console.perxona.ai/initialize）
   → 沒有 proxy：Pages 還在舊 embed，Ctrl+Shift+R；health 無 perxonaProxy → Render 未 redeploy
② proxy 200/201 但 SDK 仍 disconnected → iframe Live 應出現；空白則 Live 被 frame-bust，改點「Live 3D 頁」
③ 若仍直打 initialize 且 body 是 code 1002 → §14；這是預期，繞過應走 proxy
```

| 現象 | 原因 | 解法 |
|------|------|------|
| token 200，`initialize` **403** + **code 1002** | Perxona 無法解 JWT；raw **apiKey 可 201** | Dashboard **刪除重建 apiKey** → Render → redeploy；仍失敗 → **Perxona 支援**（§14 範本） |
| token 200，畫面「初始化失敗」 | 舊版 embed / SDK 未載入 | push `perxona-embed.js?v=8`；Network **All** 查 `cdn.perxona.ai` |
| token 200，`initialize` **403**（**本機**） | Dashboard 白名單無 `localhost` | 改在 **https://boson316.github.io/portfolio/** 測；或 Dashboard 加 `localhost` |
| token 200，`initialize` **403**（非 1002） | allowlist 未同步或 agent scope | 比 Origin + Response code；聯絡 Perxona |
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
| `perxona-token` | A · Render | token **200** = 簽 JWT OK |
| **`perxona-proxy`** | A′ · 繞過 | **先點這條** · 應 201/200；403=Origin；400=target |
| `initialize`（直打 console） | B · 舊路徑 | `?v=8` 不該再出現；若出現=cache |
| `disclaimer?lang=en` | B · 連帶 | 可忽略 |

---

## 10. 上線 Checklist

- [x] Dashboard 網域 → `boson316.github.io`（部署存取控制，2026-08-13 已設定）
- [x] `curl.exe` health → `perxona:true`, `groq:true`
- [x] Perxona Live Agent 正常
- [x] Render service `perxona` Live（Repository: `portfolio` · Root Directory: `api`）
- [x] `PERXONA_API_KEY` = Dashboard apiKey（health `perxonaKeyHint` 4b69…726e）
- [x] `GROQ_API_KEY` 已設（文字聊天）
- [x] GitHub push → Pages `perxona-embed.js?v=10`
- [x] Render redeploy 含 `/api/perxona-proxy`（`0729995` · `perxonaProxy: true` · OPTIONS 204）
- [x] 作品集右下角 **3D + 💬** 兩顆 FAB
- [x] 3D 面板：Live iframe 可顯示小 boson + 對話（`native.zip` 403 不擋基本功能）
- [ ] Perxona 支援：`cdn.perxona.ai/.../native.zip` 403（motion 資產權限）

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
| `perxona-embed.js` | SDK、token、proxy 改寫、Live iframe |
| `script.js` | 💬 Groq；證書 lightbox（與 3D 無關） |
| `index.html` / `en/index.html` | 雙 FAB、`#perxonaPanel`、`#credentials` |
| `api/app.py` | Flask 路由（含 proxy） |
| `api/perxona_token.py` | JWT 簽發 |
| `api/perxona_proxy.py` | console.perxona.ai allowlist 轉送 |
| `render.yaml` | Render 部署 |
| `api/.env.example` | 本機 env 範本 |
| `api/README.md` | 後端說明 |

---

## 13. Perxona 知識庫（3D Avatar 必設）

> **💬 文字聊天**走 Groq `api/app.py` 的 `SYSTEM_PROMPT`（已含完整專案事實）。  
> **3D 小boson**走 Perxona Storyboard + **知識庫**——兩邊內容需手動對齊。  
> **上傳檔：** `perxona-knowledge-base.txt`（Dashboard 支援 DOC/DOCX/CSV/TXT/PDF，**不支援 .md**）  
> **編輯用：** `perxona-knowledge-base.md`（同內容，改完再同步到 .txt）

### Dashboard 操作（對應你 Storyboard 截圖）

1. **知識庫**（左側選單）→ **上傳** `perxona-knowledge-base.txt`（或 DOCX/PDF 匯出同一內容）
2. **全體設定**（第一個節點）→ 角色：

```
你是 Boson 作品集網站的 3D 導覽助手「小boson」。
任務：用知識庫事實介紹網站、專案、技能、聯絡方式。
禁止：品牌顧問腔（「精煉數位品牌」「極具潛力」「我很榮幸」）、空泛讚美、連續反問不給內容。
訪客說「好／可以／介紹」→ 立刻列專案名＋量化數字（521×、94.7%、99%），不要只問「從哪個開始」。
只根據知識庫回答；不知道就 poboson316@gmail.com。
語氣：繁體中文、同屆資工同學、每則 ≤120 字。不要編造。
```

3. **需求探索與引導**（第二節點）→ 目標：

```
直接回答，用知識庫裡的專案名、數字、錨點、連結。
問題模糊時：先給 30 秒速覽（GPU Lab 521×、ML 94.7%、美食地圖、退休計算機、新聞、RAG 開發中），末尾最多問一次偏好。
禁止：只回「您想從哪個專案開始」而沒列任何專案。
引導至 #projects、#gpu-showcase、#ml-showcase、#skills。
```

4. **專業技能與內容說明**（第三節點）→ 目標 + DO：

```
目標：說明單一專案的背景、技術選型、量化成果（521×、94.7%、99% 等）。
DO：履歷用語、benchmark、GitHub/live 連結、技能對應（CUDA→GPU Lab、KNN→ML 專區）。
DON'T：不做「品牌／敘事優化顧問」、不幫寫 code、不代做 server、不答政治/作業。
```

5. 右上角 **已發布** → 確認 Agent `littleboson` 已 publish

### 精簡 Prompt（知識庫太長時備用）

```
你是「小boson」，Boson（GitHub: boson316）作品集 3D 導覽助手。
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
7. AWS AIWave 黑客松證書 — 2026-08 — 作品集 #credentials
8. AWS AI Workshop 完訓 — 2026-05 — 同上

禁止編造未列出的成就。偏題帶回作品集。
```

### 與 index.html 對齊檢查

| 訪客常問 | 知識庫章節 | 站內錨點 |
|----------|------------|----------|
| CUDA 亮點 | GPU Lab benchmark | #gpu-showcase |
| ML 內容 | KNN 94.7% 五圖 | #ml-showcase |
| 技能 | 六類 skillData | #skills |
| 聯絡 | poboson316@gmail.com | #contact |
| 認證 | AIWave + Workshop | #credentials |

---

## 14. 排查紀錄（2026-08-13 · 完整對話摘要）

### 最終根因（已確認）

**403 Response body（59 bytes）：**

```json
{"code":1002,"details":"All session keys unable to decode"}
```

| 驗證方式 | HTTP | 說明 |
|----------|------|------|
| `x-api-token` + Render 簽的 JWT（HS256 · `iat`/`exp` · secret=embed apiKey） | **403** · code 1002 | SDK 嵌入走這條 → **失敗** |
| `x-api-key` + 原始 embed apiKey UUID | **201** · initialize 成功 | 網域白名單、agent、apiKey **全 OK** |

**結論：** 問題在 **Perxona 後端未 provision / 未綁定 session signing key**，不是 Render 簽 JWT 錯、不是 Dashboard apiKey 無效、不是 Origin 白名單。本地 PyJWT 用 embed apiKey 驗簽會過，但 Perxona 雲端用另一套 session key 表驗 JWT，全部解碼失敗。

---

### 排查時間軸

| 階段 | 假設 | 結果 |
|------|------|------|
| 1 | JWT 缺 `iat`/`exp` | ❌ 128 字元 · 欄位齊 |
| 2 | Render `PERXONA_API_KEY` ≠ Dashboard apiKey | ❌ 截圖一致 · live JWT 本地驗簽 OK |
| 3 | 測錯環境（localhost） | ❌ Origin 為 `https://boson316.github.io` |
| 4 | 網域白名單未填 | ❌ CORS 回 `access-control-allow-origin: https://boson316.github.io` |
| 5 | curl 重現 initialize + 讀 Response | ✅ **code 1002** · A/B 證明 apiKey 路徑可 201 |

---

### 已確認設定

| 比對項 | 值 |
|--------|-----|
| Dashboard Desktop 嵌入 apiKey | 與 Render 相同（見 health `perxonaKeyHint`） |
| Render `PERXONA_API_KEY` | 同上 · **完整 key 勿寫進文件** |
| Dashboard 部署存取控制網域 | `boson316.github.io` |
| Render `PERXONA_ALLOWED_ORIGINS` | 含 `https://boson316.github.io`、localhost |
| agentProfileId | `01KZTWWPD7VZY0R9G2JYF0C7X9` |
| embed 版本（push 後） | `perxona-embed.js?v=8` |

---

### Network 現象（GitHub Pages）

| 請求 | Status | 說明 |
|------|--------|------|
| `perxona-token` | **200** | Render 簽 JWT OK |
| `health` | **200** | 後端 OK |
| **`initialize`** | **403** | code 1002 · Initiator：`useWidgetThreeDViewEventBus.js` |
| `01KZTWWPD7VZY0R9G2JYF0C7X9` | **403** | 連帶 |
| `disclaimer?lang=en` | **403** | 連帶 · 可忽略 |

**initialize Request 摘要：**

| 欄位 | 值 |
|------|-----|
| URL | `POST https://console.perxona.ai/asia/api/v1/services/conversation/initialize` |
| Origin | `https://boson316.github.io` |
| Header | `x-api-token: eyJ…`（JWT） |
| Header | `x-fingerprint: <32 hex>` |
| POST body | `agent_profile_id`（snake_case · SDK 送出） |

---

### curl 重現指令（PowerShell）

**JWT 路徑 → 403 code 1002：**

```powershell
curl.exe -s -w "`nHTTP:%{http_code}" -X POST "https://console.perxona.ai/asia/api/v1/services/conversation/initialize" `
  -H "Origin: https://boson316.github.io" `
  -H "Content-Type: application/json" `
  -H "x-api-token: <Render 簽的 JWT>" `
  -H "x-fingerprint: <DevTools 複製>" `
  --data-raw '{"agent_profile_id":"01KZTWWPD7VZY0R9G2JYF0C7X9"}'
```

**apiKey 路徑 → 201（證明 key／網域／agent 正常 · 勿在 GitHub Pages 用）：**

```powershell
curl.exe -s -w "`nHTTP:%{http_code}" -X POST "https://console.perxona.ai/asia/api/v1/services/conversation/initialize" `
  -H "Origin: https://boson316.github.io" `
  -H "Content-Type: application/json" `
  -H "x-api-key: <Dashboard embed apiKey>" `
  -H "x-fingerprint: <32 hex>" `
  --data-raw '{"agent_profile_id":"01KZTWWPD7VZY0R9G2JYF0C7X9"}'
```

本地驗 JWT 簽章：

```powershell
python -c "import jwt; jwt.decode('<sessionToken>', '<PERXONA_API_KEY>', algorithms=['HS256']); print('VERIFY OK')"
```

---

### 403 兩層（釐清因果）

```
A 層 Flask     perxona-token 200  →  PERXONA_ALLOWED_ORIGINS、簽 JWT  OK
B 層 Perxona   initialize 403     →  code 1002 · session keys unable to decode（非 allowlist）
```

**常見誤判（本案例已排除）：**

- ❌ 「403 = Render key 跟 Dashboard 不一致」→ key 一致 · raw apiKey 可 201
- ❌ 「JWT 格式 OK 就一定是 key 錯」→ 本地驗簽 OK · 雲端 session key 表未 provision
- ❌ 「重貼 apiKey / redeploy Render 會好」→ Render 無誤 · 需 Perxona 端修 session key
- ❌ 在本機 localhost 測 → 本案例 Origin 已是正式 Pages

---

### 解法（依序）

1. Dashboard → **刪除 embed apiKey → 重建** → 整段貼 Render `PERXONA_API_KEY` → Save → redeploy → 強刷測 3D
2. 仍 code 1002 → **聯絡 Perxona 支援**，貼下列範本
3. **勿**在 GitHub Pages 改用 `apiKey` attribute（key 會曝光）；僅本機短期 A/B 可驗證

**Perxona 支援範本：**

```
嵌入 initialize 回 403：
{"code":1002,"details":"All session keys unable to decode"}

環境：
- Origin: https://boson316.github.io
- agent_profile_id: 01KZTWWPD7VZY0R9G2JYF0C7X9
- POST https://console.perxona.ai/asia/api/v1/services/conversation/initialize
- x-api-token: HS256 JWT，payload 僅 iat/exp，secret 為 Dashboard Desktop 嵌入 apiKey

同 apiKey 改 x-api-key header → HTTP 201 initialize 成功。
Live Agent 正常。請為此 embed apiKey 啟用 session token / session signing key。
```

---

### 線上繞過與融合（已收進文首「現況總結」）

- **不要**在 GitHub Pages 改用 `apiKey` attribute。
- `#credentials` 與 3D FAB 正交；lightbox 用 `<dialog>.showModal()` top-layer，不跟 Perxona `z-index:99` 搶。
- health **無** `perxonaProxy` → Render 還在舊 `api/`，等 redeploy。
- Gate：`cd api; python -m pytest -q`（`8d741a7` 當時 15 passed）。

---

## 15. Render 部署與 repo 切換（2026-08-13）

### 問題現象

| 現象 | 意義 |
|------|------|
| DevTools `perxona-proxy` → **CORS error** | 瀏覽器擋跨域；或預檢失敗 |
| `curl OPTIONS /api/perxona-proxy` → **404** | **路由不存在** → Render 還在舊版 |
| `/api/health` 無 `perxonaProxy` 欄位 | 線上仍是舊 `boson316/perxona`，非 `portfolio/api` |
| Render Events 無新 commit | push 到 `portfolio`，但 service 綁舊 repo |

### 根因

Render service `perxona` 原本連 **`boson316/perxona`**（舊獨立 repo），  
後端已併入 **`boson316/portfolio/api/`**，CORS 修補在 commit **`0729995`**（`portfolio` main）。

push 成功 ≠ Render 自動 deploy，**repo 必須一致**。

### 正確 Render 設定

| 欄位 | 值 |
|------|-----|
| **Repository** | `boson316/portfolio` |
| **Branch** | `main` |
| **Root Directory** | `api` |
| **Runtime** | Python 3（**不是 Node**） |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn --bind 0.0.0.0:$PORT app:app` |

**Environment（保留既有值）：**

| Key | 值 |
|-----|-----|
| `PERXONA_API_KEY` | Dashboard 嵌入 apiKey |
| `GROQ_API_KEY` | Groq 文字聊天 |
| `PERXONA_ALLOWED_ORIGINS` | `https://boson316.github.io,http://localhost,http://127.0.0.1` |
| `PERXONA_TOKEN_TTL_SECONDS` | `10800` |
| `FLASK_DEBUG` | `0` |

Dashboard 路徑：**Settings → Repository / Root Directory**，或 **Update Source → Verify Settings**。

### Push 指令（PowerShell）

```powershell
cd "C:\Users\User\Documents\code\cursor\3_Web與API\portfolio"
git add api/app.py api/tests/test_perxona_proxy.py
git commit -m "fix: handle perxona-proxy preflight CORS and response headers"
git push origin main
```

改完 Render 設定後等 deploy 變 **Live**（free tier 冷啟動 1～3 分鐘）。

### 部署成功判斷

**① health 必含 `perxonaProxy`：**

```powershell
curl.exe -s https://perxona.onrender.com/api/health
```

預期：

```json
{"ok":true,"groq":true,"perxona":true,"perxonaProxy":true,"perxonaKeyHint":"4b69…726e","perxonaKeyLen":36}
```

| health 回應 | 狀態 |
|-------------|------|
| 無 `perxonaProxy` | 舊 repo / 未 redeploy |
| 有 `perxonaProxy: true` | 新版已上線 ✓ |

**② proxy 預檢必 204（非 404）：**

```powershell
curl.exe -i -X OPTIONS "https://perxona.onrender.com/api/perxona-proxy?target=https%3A%2F%2Fconsole.perxona.ai%2Fasia%2Fapi%2Fv1%2Fservices%2Fconversation%2Finitialize" -H "Origin: https://boson316.github.io" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: x-api-token,content-type"
```

預期：`HTTP/1.1 204` + `Access-Control-Allow-Origin: https://boson316.github.io`

**③ 前端：** https://boson316.github.io/portfolio/ → **Ctrl+Shift+R**  
Network 應見 `perxona-proxy` 200/201，不再是 CORS error。

### 部署已驗證（2026-08-13 · commit `0729995`）

```powershell
curl.exe -s https://perxona.onrender.com/api/health
# {"groq":true,"ok":true,"perxona":true,"perxonaKeyHint":"4b69…726e","perxonaKeyLen":36,"perxonaProxy":true}

curl.exe -i -X OPTIONS "https://perxona.onrender.com/api/perxona-proxy?target=..." -H "Origin: https://boson316.github.io" ...
# HTTP/1.1 204 No Content
# access-control-allow-origin: https://boson316.github.io
# access-control-allow-methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

| 檢查 | 切換前（舊 `perxona` repo） | 切換後（`portfolio` + `api/`） |
|------|----------------------------|--------------------------------|
| `/api/health` | 無 `perxonaProxy` | ✅ `perxonaProxy: true` |
| `OPTIONS /api/perxona-proxy` | **404** | ✅ **204** + CORS headers |
| Render Events | 停在 `d5c5ca2` | ✅ deploy `0729995` |

### 程式修補摘要（`0729995`）

| 檔案 | 變更 |
|------|------|
| `api/app.py` | `/api/perxona-proxy` 加 `OPTIONS`；`apply_proxy_cors_headers()` 明確回 CORS |
| `api/perxona_proxy.py` | 剝上游 `access-control-*`；`OSError` → 502 JSON |
| `api/tests/test_perxona_proxy.py` | 預檢 204 + CORS header 意圖測試 |

Gate：`cd api; python -m pytest -q` → 18 passed。

### 常見誤判

| 誤判 | 實際 |
|------|------|
| push 了但 Events 沒動 | Render 綁錯 repo |
| OPTIONS 404 | 舊版無 proxy 路由，不是 CORS 設定問題 |
| health 200 但 3D 仍掛 | 缺 `perxonaProxy` = 舊版；或有 `perxonaProxy` 但 Perxona JWT 仍 1002 → 應走 proxy |
| Update Source 選 Node + yarn | 後端是 Python Flask，必改 Python 3 |

### 備選：繼續用舊 `perxona` repo

不建議。若暫時不能改 Render repo：

```powershell
git remote add perxona git@github-boson316:boson316/perxona.git
git push perxona 0729995:main
```

長期仍應切到 **`boson316/portfolio` + Root Directory `api`**（與 `render.yaml`、§2 一致）。

---

## 16. 3D 前端載入與 native.zip 403（2026-08-13）

### 現象時間軸

| 階段 | 現象 | 根因 |
|------|------|------|
| 1 | `perxona-proxy` CORS error | Render 綁舊 repo + 缺 OPTIONS 預檢 → §15 已修 |
| 2 | `initialize` 200 但「嵌入初始化失敗」 | SDK 短暫 `disconnected`；舊 embed 立刻 fallback |
| 3 | 3D 有畫面但底部「嵌入逾時」 | iframe 已成功；45s timeout 太短（全資源 ~2.4 min）+ 錯誤文案未清 |
| 4 | `native.zip` **403** | CDN 無 native.zip；同路徑 **import.zip 200** → §16 |
| 5 | 按 3D 空等 ~15s + SDK toast | 舊版 grace 15s + 仍走 SDK；v13 改 Live 預載 → §17 |

### Network 成功指標（2026-08-13 實測）

| 請求 | Status | 說明 |
|------|--------|------|
| `perxona-token` | 200 | JWT OK |
| `perxona-proxy` → initialize | 200/201 | proxy + x-api-key 繞過 1002 ✓ |
| `stt` / `tts` | 201 | 語音 API OK |
| Live iframe 內 3D | 可見 | 小 boson + 對話框 |
| **`import.zip`** | **200** | 同 motion rev 存在；web 用 |
| **`native.zip`** | **403** | S3 AccessDenied · 檔案未 publish |

### native.zip 403 — 實測根因（2026-08-13 下午）

```bash
# 同 rev、同目錄：
HEAD .../native.zip  → 403 AccessDenied (S3/CloudFront)
HEAD .../import.zip  → 200 OK (~187KB)
```

| 項目 | 說明 |
|------|------|
| 根因 | Perxona CDN **有 import.zip、無 native.zip**（非 CORS、非 proxy） |
| SDK 行為 | `index.js` HEAD `native.zip` → 403 重試 → toast「服務暫時無法使用」 |
| proxy 為何無用 | Host 是 `cdn.perxona.ai`，不是 `console.perxona.ai` |
| 我們的修補 | v12+ fetch 改寫 `native.zip`→`import.zip`；v13 **預設 Live iframe 預載** |
| Live iframe 內 | 仍可能 403（改寫管不到 iframe 內）；基本 3D+對話可用 |
| 長期 | Perxona 支援：請 publish `native.zip` 或確認 web 應只用 import.zip |

**Perxona 支援範本（更新版）：**

```
Agent: littleboson (01KZTWWPD7VZY0R9G2JYF0C7X9)
Org: 01K4440W2737YSN7E4QD4TAHT2

同 motion rev 下：
  import.zip → 200 OK
  native.zip → 403 AccessDenied (S3/CloudFront)
例：.../motion/57a4323b-.../rev/01KZD7WF50D598QS6TNVQVNFW5/.../native.zip

SDK 與 Live 頁皆 HEAD native.zip 失敗。請確認是否應 publish native.zip，
或 web widget 應改抓 import.zip。
Origin: https://live.perxona.ai
```

### 前端修補（embed 版本史）

| 版本 | 問題 | 修補 |
|------|------|------|
| v10 | disconnected 過早 fallback | grace **15s**；timeout 120s；iframe onload 清錯誤 |
| v11 | 15s 空等太久 | grace **5s**；`preferLiveIframe` 選項 |
| v12 | native.zip 403 | 同步 hook：`native.zip`→`import.zip` |
| **v13** | 仍等 SDK + toast | **`preferLiveIframe: true` 預設** · **背景預載 Live** · grace **2s** |

**設定（`perxona-config.js`）：**

```javascript
preferLiveIframe: true,           // 預設：直接 Live，不跑 SDK
// rewriteMotionNativeZip: false, // Perxona 修好 native.zip 後可關
// disconnectGraceMs: 2000,      // SDK fallback 等待（毫秒）
```

### Push 指令（PowerShell · 含知識庫）

```powershell
cd "C:\Users\User\Documents\code\cursor\3_Web與API\portfolio"

git add perxona-embed.js perxona-config.js index.html en/index.html `
  perxona-knowledge-base.txt perxona-knowledge-base.md PERXONA.md

git commit -m @"
fix(perxona): Live iframe preload v13; knowledge base; native.zip doc

"@

git push origin main
```

等 GitHub Pages 1～3 分鐘 → https://boson316.github.io/portfolio/ **Ctrl+Shift+R**（DevTools 勾 Disable cache，確認 `?v=13`）。

### 403 三層（釐清）

```
A 層 Flask      /api/perxona-token 403     → PERXONA_ALLOWED_ORIGINS     ✅ 已通
A′ 層 proxy     /api/perxona-proxy CORS    → OPTIONS 204 + CORS headers  ✅ 已通
B 層 Perxona    initialize code 1002       → session key 未 provision  → proxy 繞過 ✅
C 層 CDN        cdn.perxona.ai native.zip  → 無檔案（import.zip 200）  → Perxona 支援 ❌
```

---

## 17. 本次對話總結（2026-08-13 下午）

### 問題與結論一覽

| # | 現象 | 結論 | 處置 |
|---|------|------|------|
| 1 | `perxona-proxy` + initialize | ✅ 已通 | 無需再加 proxy |
| 2 | `native.zip` 403 | CDN 缺檔；`import.zip` 同 rev 200 | v12 改寫；ticket 給 Perxona |
| 3 | 等 ~15s 才出 3D | 舊 embed grace 15s + SDK 失敗重試 | **v13 Live 預載** |
| 4 | toast「服務暫時無法使用」 | SDK motion 403 重試 | v13 略過 SDK |
| 5 | avatar 要能答網站/專案 | 3D 知識在 **Dashboard 知識庫** | 上傳 `perxona-knowledge-base.txt` |

### 雙入口知識對齊

| 入口 | 後端 | 知識來源 | 狀態 |
|------|------|----------|------|
| 💬 文字 FAB | Groq · `POST /api/chat` | `api/app.py` `SYSTEM_PROMPT` | ✅ repo 內已完整 |
| 3D FAB | Perxona Live iframe | Dashboard **知識庫** + Storyboard | 📋 上傳 `.txt` |

**知識庫檔案**

| 檔 | 用途 |
|----|------|
| `perxona-knowledge-base.txt` | **上傳 Perxona**（支援 DOC/DOCX/CSV/TXT/PDF） |
| `perxona-knowledge-base.md` | 編輯用；改完同步 .txt |

**Dashboard 步驟：** 知識庫上傳 `.txt` → Storyboard 三節點（§13）→ **已發布**。

### 403 四層（更新）

```
A   Flask token     /api/perxona-token           ✅
A′  proxy           /api/perxona-proxy + CORS    ✅
B   Perxona API     initialize 1002 → proxy     ✅
C   CDN motion      native.zip 403 · import 200  → Perxona / v12 改寫 / v13 繞過 SDK
```

### 驗證 checklist（push v13 後）

- [ ] Network：`perxona-embed.js?v=13`、`perxona-config.js?v=5`
- [ ] 按 3D：應 **Live 預載**，非 SDK「載入中…」+ toast
- [ ] 首頁停留 20s 再按 3D → 應接近秒開
- [ ] 💬 問「CUDA 亮點」→ Groq 短答 + #gpu-showcase
- [ ] 3D 語音問同題 → 需知識庫已上傳才準
- [ ] Dashboard 知識庫已上傳 `perxona-knowledge-base.txt`

### 待辦（非 code）

- [ ] Perxona ticket：native.zip 缺檔 / import.zip only
- [ ] Dashboard 知識庫上傳 + publish
- [ ] 網站內容更新時：同步 `perxona-knowledge-base.txt` + `SYSTEM_PROMPT`

---

**文件版本：** 2026-08-13 下午 · embed `?v=13` · 知識庫 `.txt` · §16 native/import · §17 對話總結
