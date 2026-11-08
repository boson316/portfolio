# Boson 作品集

**Languages:** [English](README.md) · [中文](README.zh-TW.md)

**線上：** <https://boson316.github.io/portfolio/>  
**English：** <https://boson316.github.io/portfolio/en/>  
**數位名片：** <https://boson316.github.io/portfolio/card/> · QR：[`card/qr.png`](card/qr.png)

---

資工系大三作品集 — 前端、AI 應用、RTX 3050 GPU/CUDA 優化實驗室。

[![AWS AIWave Hackathon](https://img.shields.io/badge/AWS%20Hackathon-AIWave%202026-orange?style=for-the-badge&logo=amazon-aws)](assets/AIWave_Hackathon_Certificate.png)
[![AI Workshop](https://img.shields.io/badge/AWS-AI%20Workshop%20May%202026-232F3E?style=for-the-badge&logo=amazon-aws)](assets/AI_Workshop_Certificate.png)

## 網站功能

單頁作品集（GitHub Pages），中英雙語介面與互動區塊：

| 區塊 | 錨點 | 重點 |
|------|------|------|
| 首頁 | `#hero` | 自我介紹 · **和 AI 聊聊** 按鈕 |
| 旗艦研究 | `#research` | 首頁介紹後第一個內容區塊：多模態 AI 研究、概念架構與展開資訊 |
| 技能 | `#skills` | 六類技能 · Canvas 視覺化（技能 × 專案關係圖、CUDA 網格、標籤球、神經網路），可篩選專案卡片 |
| 專案精選 | `#projects` | 七張既有工程專案卡片，GPU Optimization Lab 排第一 |
| ML 專區 | `#ml-showcase` | 威斯康辛乳腺癌 · KNN ~**94.7%** · 五張 Chart.js 圖表 |
| GPU 專區 | `#gpu-showcase` | RTX 3050 benchmark — WMMA GEMM 達 cuBLAS **79–87%**、MNIST **98.6%** |
| 認證 | `#credentials` | AWS AIWave + AI Workshop（lightbox 放大） |
| 聯絡 | `#contact` | 信箱 · AI 助手 |

另有：**暗黑模式**（導覽列切換）、Chart.js 延遲載入、RWD 排版。

## 目前的專題

首頁介紹後的第一個內容區塊，只介紹五人團隊的 Multimodal AI for Elderly Care 專題、Boson 的分工與「開發中」狀態。保留擁有者提供的兩組語音結果：10 月 26 日，5 秒錄音的辨識處理時間從 **1.24 秒降到 0.35 秒**，162 句中有 157 句辨識文字相同；11 月 8 日在 Orin 用錄音測試 16 輪，正式回覆中位數 **2.43 秒**，以正式回覆開口為準，不是墊檔首聲。尚未做長者實測。

因尚待老師與學長確認公開範圍，目前只放簡介。不要公布模型設定、架構、臉部辨識數據、詳細實驗或展開式專題細節。先給擁有者確認預覽，再直接更新 main。沒有新增執行期套件或建置步驟。

## AI 助手（雙 FAB）

右下角兩顆浮動按鈕 — 同一個 **小boson** 人設，後端不同：

| FAB | 面板 | 後端 |
|-----|------|------|
| **3D**（紫色） | `#perxonaPanel` · Perxona 虛擬人 | [Perxona Live](https://live.perxona.ai/asia/boson316/littleboson) iframe（預設）· SDK + Render proxy 備援 |
| **💬**（橘色） | `#chatPanel` · 文字 + 快捷 chips | Groq · `POST /api/chat`（[Render API](https://perxona.onrender.com)） |

- **apiKey 永不進前端** — 機密只在 Render（`api/`）。
- 3D 知識：Perxona Dashboard Storyboard + 上傳 `perxona-knowledge-base.txt`。
- 文字聊天知識：`api/app.py` 的 `SYSTEM_PROMPT`（Groq）。

完整整合說明：[`PERXONA.md`](PERXONA.md) · 後端：[`api/README.md`](api/README.md)

## 認證與戰果

| 證書 | 頒發單位 | 日期 |
|------|----------|------|
| **AIWave: Taiwan Generative AI Applications Hackathon** | AWS Taiwan × DIGITIMES | 2026 年 8 月 |
| **AI Workshop Completion** | AWS Professional Services × 資策會（宜大） | 2026 年 5 月 |

<p align="center">
  <a href="assets/AIWave_Hackathon_Certificate.png">
    <img src="assets/AIWave_Hackathon_Certificate.png" alt="AIWave 黑客松證書" width="560"/>
  </a>
</p>

> 兩日生成式 AI 黑客松完賽；Agentic AI、FastAPI 整合、模型部署實戰。  
> 線上展示：[作品集認證專區](https://boson316.github.io/portfolio/#credentials)

<details>
<summary><b>檢視 AI Workshop 證書</b></summary>
<br>

![AI Workshop 證書](assets/AI_Workshop_Certificate.png)

</details>

## 數位名片

一個短網址／QR，方便分享；頁面含 **FB、IG、LinkedIn、YouTube（生活／財金）、方格子** 社群 icon 列：

| 入口 | 連結 |
|------|------|
| 名片頁 | <https://boson316.github.io/portfolio/card/> |
| 作品集 | <https://boson316.github.io/portfolio/> |
| GitHub Profile | <https://github.com/boson316> |
| FinTools（年化／退休計算機） | <https://boson316.github.io/niu/annual_return_calculator_v6.html#calc> |
| Facebook | <https://www.facebook.com/boson.huang.960102> |
| Instagram | <https://www.instagram.com/bosonhuang07/> |
| LinkedIn | <https://www.linkedin.com/in/boson-huang-334b03303/> |
| YouTube · 生活 | <https://www.youtube.com/@boson0777> |
| YouTube · 財金 | <https://www.youtube.com/@Boson0727> |
| 方格子部落格 | <https://vocus.cc/user/@Boson> |
| Email | poboson316@gmail.com |

掃碼或開啟：<https://boson316.github.io/portfolio/card/> · QR：[`card/qr.png`](card/qr.png)

## 專案

| 專案 | 連結 |
|------|------|
| Multimodal AI for Elderly Care | 研究開發中 · `#multimodal-research`（合併後生效） |
| GPU Optimization Lab | [GitHub](https://github.com/boson316/RTX3050-GPU-Mastery) · [GPU 專區](https://boson316.github.io/portfolio/#gpu-showcase) |
| 年化報酬率／退休規劃計算機 | [計算機 v6](https://boson316.github.io/niu/annual_return_calculator_v6.html#calc) · [退休規劃](https://boson316.github.io/niu/annual_return_calculator_v6.html#retire) · [GitHub](https://github.com/boson316/niu) |
| 大師 13F 持股追蹤 | [Live](https://us-stock-tracker.boson316.workers.dev/) · [查個股](https://us-stock-tracker.boson316.workers.dev/#stock)（原始碼不公開） |
| 新聞蒐集系統 | [Live](https://boson316.github.io/news/) · [GitHub](https://github.com/boson316/news) |
| 校園美食地圖（4 校） | [宜大](https://boson316.github.io/food_map_niu_v2/) · [台大](https://boson316.github.io/food_map_ntu_v1/) · [中央](https://boson316.github.io/food_map_ncu_v1/) · [中正](https://boson316.github.io/food_map_ccu_v1/) · [GitHub](https://github.com/boson316/food_map_niu_v2) |
| 人工智慧 × 資料科學互動圖表 | [ML 專區](https://boson316.github.io/portfolio/#ml-showcase) |
| RAG 知識庫聊天 | 開發中 |

**聯絡：** poboson316@gmail.com

## Repo 結構

```
portfolio/
├── index.html, en/          # GitHub Pages（靜態前端）
├── card/                    # 數位名片（社群 icon + 連結）
├── script.js                # 💬 Groq 文字聊天
├── perxona-config.js        # Agent ID、API URL（無 secret）
├── perxona-embed.js         # 3D Perxona 嵌入 + Live iframe
├── perxona-knowledge-base.* # 3D avatar 知識庫（Dashboard 上傳 .txt）
├── PERXONA.md               # Perxona + Groq 整合說明
└── api/                     # Render 後端（Root Directory: api）
    ├── app.py               # health、chat、perxona-token、perxona-proxy
    └── README.md
```

## 本機預覽

**前端（靜態）：**

```bash
cd c:\Users\User\Documents\code\cursor\3_Web與API\portfolio
npx serve .
# 名片：http://localhost:3000/card/
# 英文：http://localhost:3000/en/
```

**後端（選用 — 本機跑 💬 聊天與 3D token）：**

```powershell
cd api
Copy-Item .env.example .env   # 填入 GROQ_API_KEY、PERXONA_API_KEY
pip install -r requirements.txt
python app.py                 # http://127.0.0.1:5000
```

瀏覽器 console 設 `window.PORTFOLIO_API_URL = 'http://127.0.0.1:5000'`，或改 `perxona-config.js` 指向本機 API。

## 授權

網站程式碼以 [MIT License](LICENSE) 授權。個人內容（履歷文字、照片、`assets/` 內的證書，以及小boson 知識庫）不在授權範圍內，未經同意請勿轉用。
