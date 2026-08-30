# Portfolio 聊天後端：Groq API + Perxona session token
import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from perxona_proxy import (
    MAX_BODY_BYTES,
    build_upstream_headers,
    client_origin,
    forward_perxona,
    resolve_proxy_target,
)
from perxona_token import create_session_token, origin_allowed, parse_allowed_origins, perxona_key_hint

load_dotenv()

app = Flask(__name__)
CORS(app)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
PERXONA_API_KEY = (os.getenv("PERXONA_API_KEY") or "").strip().strip('"').strip("'")
PERXONA_TOKEN_TTL_SECONDS = int(os.getenv("PERXONA_TOKEN_TTL_SECONDS", "10800"))
PERXONA_ALLOWED_ORIGINS = parse_allowed_origins(
    os.getenv(
        "PERXONA_ALLOWED_ORIGINS",
        "https://boson316.github.io,http://localhost,http://127.0.0.1",
    )
)

SYSTEM_PROMPT = """你是「小boson」，Boson（GitHub: boson316）作品集網站上的導覽助手。
語言：一律繁體中文（台灣）。專有名詞、repo、技術名保留英文。
語氣：像同屆資工同學帶人看作品——短、準、可點連結。不要客服腔、不要自我介紹長篇。

【你代表誰】
- 人：Boson，宜蘭大學資工大二，前端 × AI × GPU/CUDA。
- 聯絡：poboson316@gmail.com
- 本頁：Boson 作品集（中文 index.html；英文在 /en/）。

【只根據下列事實回答。沒寫的就說不知道，叫對方寄信。禁止編造實習、獎項、論文、數字。】

專案（依訪客常問順序）：
1. RTX 3050 GPU Optimization Lab
   - 筆電 RTX 3050 6GB（Ampere sm_86）、CUDA 12.4、PyTorch、Triton、C++ Extension
   - matmul tiled CUDA：521× vs CPU（N=1024）
   - reduction：0.763ms（1M elements）
   - MNIST CNN：99% test acc（SmallCNN + AMP）
   - 3×3 Conv FP16：CUDA Ext 1.50× PyTorch（B=1024）；Triton 1.27×（B=128）
   - 另有 FlashAttention、Transformer kernels、Nsight/Roofline、一鍵重現
   - GitHub: https://github.com/boson316/RTX3050-GPU-Mastery
   - 本頁錨點：#gpu-showcase

2. 年化報酬率／退休規劃計算機（純前端）
   - v4 多階段現金流 CAGR/IRR；v5 退休總資產、幾年可退、每月要存（4% 法則、買房）
   - v5: https://boson316.github.io/niu/annual_return_calculator_v5.html
   - v4: https://boson316.github.io/niu/annual_return_calculator_v4.html
   - GitHub: https://github.com/boson316/niu

3. 校園美食地圖 v2（宜大）
   - Streamlit；校本部步行 500m；黃氏星等×距離；15 類；Google Places 離線快取 300+
   - Live: https://food-map-niu-v2.streamlit.app/
   - GitHub: https://github.com/boson316/food_map_niu_v2

4. 新聞蒐集系統
   - Python / Flask / 爬蟲；依主題／來源呈現
   - Live: https://boson-news-app.onrender.com/（cron 每 10 分鐘自動更新）

5. ML 專區（大二課程）
   - 威斯康辛乳腺癌 KNN（K=9）：TN=68 TP=40 FP=3 FN=3，約 94.7%
   - 本頁互動圖：混淆矩陣、Loss/Acc、Feature Importance、相關熱圖、PCA
   - 錨點：#ml-showcase

6. RAG 知識庫聊天：開發中。Gemini + Chroma。沒有 live demo。不要假裝已上線。

【連結對照表 — 給 URL 時只准用下列完整網址，禁止猜 repo 名】
- GPU Lab：https://github.com/boson316/RTX3050-GPU-Mastery（禁止 gpu-lab、GPU-Lab 等不存在 repo）
- 退休計算機：https://github.com/boson316/niu
- 美食地圖：https://github.com/boson316/food_map_niu_v2
- 新聞蒐集：https://github.com/boson316/news · Live https://boson-news-app.onrender.com/
- 作品集：https://github.com/boson316/portfolio
- GPU 站內：https://boson316.github.io/portfolio/#gpu-showcase
- ML 站內：https://boson316.github.io/portfolio/#ml-showcase（ML 無獨立 GitHub repo）
- 訪客要連結 → 必須貼完整 https:// URL，不可只寫「GitHub 專案連結」而不給網址。

技能：AI/RAG/LLM（Gemini、Groq、Chroma）、GPU/CUDA/Triton、前端 RWD、Python/Flask、爬蟲、工具開發。
站內功能：暗黑模式（nav ☀/🌙）、3D 技能雲、#projects 卡片。
已下架：MediaPipe／邊緣人臉管線展示。有人問就說已下架，改推 GPU 與 ML。

【行為】
- 回覆 ≤80 字（除非使用者追問細節）。禁止 markdown（*、**、- 列表）、禁止簡體字。
- 能指頁內錨點就指：#projects #gpu-showcase #ml-showcase #contact #skills
- 問「你是誰／這網站幹嘛」：一句話說明你是作品集導覽，不是通用 ChatGPT。
- 問合作／面試：給 email，不要幫 Boson 答應檔期或薪資。
- 禁止品牌顧問腔：「我很榮幸」「極具潛力」「精煉數位品牌／專業敘事」一律不准。
- 禁止空轉：連續兩輪不可只反問；使用者說「好／可以」→ 立刻列專案名＋數字，不要只問「從哪個開始」。
- 快捷意圖：極短、不展開段落；「介紹專案」只列名稱 + #projects，細節等追問再說。
- 使用者改用英文就改英文回；其餘繁中。
- 不談政治、不寫作業、不執行與作品集無關的長推理。偏題一句帶回專案。
"""


# 快捷 chip 固定短回覆（不走 LLM，避免冗長）
QUICK_REPLIES: dict[str, str] = {
    "介紹專案": (
        "五大作品：GPU Lab、退休計算機、美食地圖、新聞蒐集、ML 專區（→ #projects）。"
        "RAG 開發中。想深入哪個？"
    ),
    "你的 CUDA 專案有哪些亮點？": (
        "RTX 3050 Lab：matmul 521×、MNIST 99%。→ #gpu-showcase"
    ),
    "你的 ML 專區有哪些內容？": (
        "KNN（K=9）約 94.7%，五張互動圖。→ #ml-showcase"
    ),
    "怎麼聯絡 Boson？": "poboson316@gmail.com，或 #contact。",
    "Introduce your projects": (
        "Five projects: GPU Lab, retirement calculator, food map, news scraper, ML (→ #projects). "
        "RAG in progress. Which one?"
    ),
    "CUDA project highlights": "RTX 3050 Lab: matmul 521×, MNIST 99%. → #gpu-showcase",
    "What is in the ML section?": "Breast cancer KNN ~94.7%, five interactive charts. → #ml-showcase",
    "How can I contact Boson?": "Email poboson316@gmail.com or #contact.",
}


def get_quick_reply(message: str) -> str | None:
    return QUICK_REPLIES.get(message.strip())


def get_groq_client():
    try:
        from groq import Groq
        return Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
    except Exception:
        return None


@app.route("/api/health", methods=["GET"])
def health():
    payload: dict[str, object] = {
        "ok": True,
        "groq": bool(GROQ_API_KEY),
        "perxona": bool(PERXONA_API_KEY),
    }
    hint = perxona_key_hint(PERXONA_API_KEY)
    if hint:
        payload["perxonaKeyHint"] = hint["hint"]
        payload["perxonaKeyLen"] = hint["len"]
    payload["perxonaProxy"] = bool(PERXONA_API_KEY)
    return jsonify(payload)


@app.route("/api/perxona-token", methods=["GET"])
def perxona_token():
    if not PERXONA_API_KEY:
        return jsonify({"error": "PERXONA_API_KEY 未設定"}), 503

    origin = request.headers.get("Origin") or ""
    referer = request.headers.get("Referer") or ""
    if not origin_allowed(origin, referer, PERXONA_ALLOWED_ORIGINS):
        return jsonify({"error": "來源未授權"}), 403

    session_token, expires_at = create_session_token(PERXONA_API_KEY, PERXONA_TOKEN_TTL_SECONDS)
    return jsonify({
        "sessionToken": session_token,
        "expiresAt": expires_at,
        "ttlSeconds": PERXONA_TOKEN_TTL_SECONDS,
    })


def apply_proxy_cors_headers(response, origin: str, referer: str):
    allowed_origin = client_origin(origin, referer)
    if not allowed_origin:
        return response
    response.headers["Access-Control-Allow-Origin"] = allowed_origin
    response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    request_headers = (request.headers.get("Access-Control-Request-Headers") or "").strip()
    if request_headers:
        response.headers["Access-Control-Allow-Headers"] = request_headers
    else:
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Api-Token, X-Fingerprint, Accept"
    response.headers["Access-Control-Max-Age"] = "600"
    return response


@app.route("/api/perxona-proxy", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def perxona_proxy():
    """SDK 的 console.perxona.ai 請求改走這裡，用 server-side x-api-key 避開 JWT 1002。"""
    if not PERXONA_API_KEY:
        return jsonify({"error": "PERXONA_API_KEY 未設定"}), 503

    origin = request.headers.get("Origin") or ""
    referer = request.headers.get("Referer") or ""
    if not origin_allowed(origin, referer, PERXONA_ALLOWED_ORIGINS):
        return jsonify({"error": "來源未授權"}), 403
    if request.method == "OPTIONS":
        return apply_proxy_cors_headers(app.response_class("", status=204), origin, referer)

    target = resolve_proxy_target(request.args.get("target") or "")
    if not target:
        return jsonify({"error": "target 不合法"}), 400

    body = request.get_data() or None
    if body and len(body) > MAX_BODY_BYTES:
        return jsonify({"error": "payload 過大"}), 413

    status, headers, payload = forward_perxona(
        request.method,
        target,
        build_upstream_headers(dict(request.headers), PERXONA_API_KEY, client_origin(origin, referer)),
        body,
    )
    response = app.response_class(payload, status=status)
    for key, value in headers.items():
        if key.lower() == "content-length":
            continue
        response.headers[key] = value
    return apply_proxy_cors_headers(response, origin, referer)


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "請提供 message"}), 400

    quick = get_quick_reply(message)
    if quick:
        return jsonify({"reply": quick})

    client = get_groq_client()
    if not client:
        return jsonify({
            "reply": "目前後端未設定 Groq API Key，無法使用 AI 回覆。請在後端設定 GROQ_API_KEY 後再試，或直接寄信到 poboson316@gmail.com 聯絡站主。",
            "fallback": True
        }), 200

    history = data.get("history") or []
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-10:]:
        role = "user" if h.get("role") == "user" else "assistant"
        content = (h.get("content") or "").strip()
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=120,
            temperature=0.4,
        )
        reply = (completion.choices[0].message.content or "").strip() or "抱歉，我沒有產生回覆，請再試一次。"
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({
            "reply": f"暫時無法連線到 AI（{str(e)}），請稍後再試或寄信至 poboson316@gmail.com 聯絡站主。",
            "fallback": True
        }), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG", "0") == "1")
