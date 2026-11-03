# CLAUDE.md — boson316/portfolio

## 工作流程（Claude 請遵守）

這是 repo 擁有者的明確指示，優先於「在指定分支開發、完成後開 PR」的預設流程。

**所有修改都直接推到 `main`**（不開 PR、不另開分支；大改也一樣）
- 包含文字、連結、樣式、版面大改、新增或移除功能、`api/` 後端、小boson 知識與 `SYSTEM_PROMPT`。
- 改 `api/` 時特別小心：Render 會在 `main` 更新後自動部署，改壞會讓 💬 聊天直接失效。推之前一定要跑後端測試，推完確認 Render 有重新部署成功。
- 大改推完後，附上截圖與重點說明給使用者看；使用者要調整就再推一個新 commit 修正（不要改寫歷史）。

**每次都要做的事**
- 推之前先檢查：能跑的測試要跑；有改畫面就用 Playwright 截圖檢查（桌機、手機、深色模式），並把截圖給使用者看。
- 不要 force push、不要改寫 `main` 的歷史。
- commit 訊息用英文、寫清楚改了什麼；回覆使用者一律用**繁體中文**。
- 進 `main` 後 GitHub Pages 約 1–3 分鐘會更新，回報時附上線上網址。

## 專案重點

- 單頁作品集（GitHub Pages）：<https://boson316.github.io/portfolio/>，英文版在 `en/`，數位名片在 `card/`。
- 中文 `index.html` 與英文 `en/index.html` 結構要保持一致；改一邊就要同步另一邊。
- 樣式：`styles.css`（基礎）→ `tailwind.css` → `design.css`（設計層：米色＋赤陶橘配色、工程師風格）。新樣式優先寫在 `design.css`。
- 互動：`script.js`（主題、導覽、技能介紹、聊天）、`ml-showcase.js`／`ml-charts.js`、`skills-viz.js`（技能區四種 Canvas 視覺化：關係圖／CUDA 網格／標籤球／神經網路，與專案卡片篩選連動；技能與專案的對應在檔案開頭的 `USES`）、`pytorch-chart.js`；Chart.js 從 CDN 延遲載入。
- 小boson 知識要同步更新三處：`api/app.py` 的 `SYSTEM_PROMPT`（文字聊天，部署在 Render，`main` 更新後需確認 Render 有重新部署）、`perxona-knowledge-base.txt`／`.md`（3D Perxona）、`script.js` 的快捷回覆。
- 後端測試：在 `api/` 執行 `python -m pytest -q tests`。
- 專案數字必須可驗證（例如 WMMA GEMM 79–87% cuBLAS、MNIST 98.6%），不要編造；GitHub repo 名稱只用知識庫對照表裡的。
- 計算機連結用 `https://boson316.github.io/niu/annual_return_calculator_v6.html#calc`（退休分頁 `#retire`）。
