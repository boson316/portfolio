# Boson 作品集

## Lighthouse 效能

- **Bundle size**：Three.js 與 `skills-3d.js` 改為**延遲載入**，僅在捲動到「技能」區時才載入，降低首次載入體積。
- 建議：Chrome DevTools (F12) > Lighthouse 跑一次，目標各項 90+；若部署環境為 HTTPS 再測一次。

## 暗黑模式

- 使用 **localStorage** 鍵 `portfolio-theme`（`'dark'` | `'light'`）。
- `<head>` 內有 inline script，依 localStorage 與 `prefers-color-scheme` 在首屏前設定 `data-theme` 與 `class="dark"`，避免閃爍。
- 右上角按鈕可切換，偏好會寫回 localStorage。

## Groq AI 聊天

- **不**在前端放 Groq API Key；由後端 **portfolio-api** 呼叫 Groq。
- 設定方式：
  1. 在 `portfolio-api` 的 `.env` 設定 `GROQ_API_KEY`（到 [Groq Console](https://console.groq.com/) 申請）。
  2. 在本機或部署後，於 `index.html` 將 `window.PORTFOLIO_API_URL` 設為後端網址（例：`http://127.0.0.1:5000` 或 `https://your-api.onrender.com`）。
- 訪客問「你的 AI 專案是什麼」「介紹專案」等，後端 system prompt 會依專案細節回覆。
