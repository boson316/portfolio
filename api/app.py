# Portfolio 聊天後端：Groq API + Perxona session token
import logging
import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.middleware.proxy_fix import ProxyFix

from perxona_proxy import (
    MAX_BODY_BYTES,
    build_upstream_headers,
    client_origin,
    forward_perxona,
    resolve_proxy_target,
)
from perxona_token import cors_origin_patterns, create_session_token, origin_allowed, parse_allowed_origins
from rate_limit import RateLimiter

load_dotenv()

app = Flask(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# Groq 會不定期下架模型（例如 llama-3.1-8b-instant 已無法使用）。
# 先用環境變數 GROQ_MODEL，再依序嘗試下列候選；全都不存在時，向 Groq 查詢目前可用的模型。
MODEL = (os.getenv("GROQ_MODEL") or "").strip()
MODEL_CANDIDATES = [
    m for m in dict.fromkeys([
        MODEL,
        "llama-3.3-70b-versatile",
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        "meta-llama/llama-4-scout-17b-16e-instruct",
    ]) if m
]
# 單次 Groq 請求的逾時秒數（前端 15 秒就會改用本地回覆）。
GROQ_TIMEOUT_SECONDS = float(os.getenv("GROQ_TIMEOUT_SECONDS", "12"))
NON_CHAT_MODEL_HINTS = ("whisper", "tts", "guard", "playai", "orpheus", "distil", "compound")
_active_model = None
PERXONA_API_KEY = (os.getenv("PERXONA_API_KEY") or "").strip().strip('"').strip("'")
PERXONA_TOKEN_TTL_SECONDS = int(os.getenv("PERXONA_TOKEN_TTL_SECONDS", "10800"))
PERXONA_ALLOWED_ORIGINS = parse_allowed_origins(
    os.getenv(
        "PERXONA_ALLOWED_ORIGINS",
        "https://boson316.github.io,http://localhost,http://127.0.0.1",
    )
)
# 只對白名單來源回 CORS 標頭（規則與 origin_allowed 相同）。
CORS(app, origins=cors_origin_patterns(PERXONA_ALLOWED_ORIGINS))

# 請求大小與聊天長度上限：避免被拿來耗盡 Groq 額度。
app.config["MAX_CONTENT_LENGTH"] = MAX_BODY_BYTES + 100_000
MAX_MESSAGE_CHARS = 1000
MAX_HISTORY_ITEM_CHARS = 1000

# Render 的 X-Forwarded-For 是「（訪客自帶，可偽造）…, 訪客 IP, Render 代理 IP」：
# 最右邊是 Render 自己附加的代理位址（每次不同），訪客 IP 在右邊數來第 2 個。
# /api/health 的 forwarding 欄位可用來核對這個假設。
_TRUSTED_PROXY_HOPS = int(os.getenv("TRUSTED_PROXY_HOPS", "2"))
if _TRUSTED_PROXY_HOPS > 0:
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=_TRUSTED_PROXY_HOPS)

# 每個 IP 每分鐘的請求上限（設 0 停用）。Origin 標頭在瀏覽器以外可偽造，所以另外靠這層擋濫用。
CHAT_LIMITER = RateLimiter(int(os.getenv("CHAT_RATE_LIMIT_PER_MINUTE", "15")))
TOKEN_LIMITER = RateLimiter(int(os.getenv("TOKEN_RATE_LIMIT_PER_MINUTE", "10")))
PROXY_LIMITER = RateLimiter(int(os.getenv("PROXY_RATE_LIMIT_PER_MINUTE", "120")))


def rate_limited(limiter: RateLimiter):
    """超過上限回 429；否則回 None。"""
    if limiter.allow(request.remote_addr or "unknown"):
        return None
    response = jsonify({"error": "請求過於頻繁，請稍後再試"})
    response.status_code = 429
    response.headers["Retry-After"] = "60"
    return response

SYSTEM_PROMPT = """你是「小boson」，Boson（GitHub: boson316）作品集網站上的導覽助手。
語言：一律繁體中文（台灣）。專有名詞、repo、技術名保留英文。
語氣：像同屆資工同學帶人看作品——短、準、可點連結。不要客服腔、不要自我介紹長篇。

【你代表誰】
- 人：Boson，宜蘭大學資工大三，前端 × AI × GPU/CUDA。
- 聯絡：poboson316@gmail.com
- 本頁：Boson 作品集（中文 index.html；英文在 /en/）。

【只根據下列事實回答。沒寫的就說不知道，叫對方寄信。禁止編造實習、獎項、論文、數字。】

專案（依訪客常問順序）：
1. RTX 3050 GPU Optimization Project
   - 筆電 RTX 3050 6GB（Ampere sm_86）、CUDA 12.4、PyTorch、Triton、C++ Extension
   - WMMA tiled GEMM：2048³ 達 cuBLAS 的 79–87%（6 次）；Triton 14.0 TFLOPS，cuBLAS 14.4 TFLOPS
   - reduction：warp shuffle 比 shared-memory tree 快 1.68×（125 GB/s）
   - MNIST CNN：98.6% test acc（SmallCNN + AMP）
   - 3×3 Conv：Triton FP16（B=128）0.083 ms，cuDNN 0.168 ms；CUDA Extension 是 FP32，B=32 時 0.036 ms
   - FlashAttention S=4096：IEEE FP32 下自寫 CUDA 17.6 ms，比 SDPA（20.4 ms）快 14%；FP16 下 Triton 2.45 ms，比 SDPA（3.30 ms）快 26%，誤差相同；Triton 的 TF32 模式 5.2 ms，比自己的 FP16 慢且誤差較大（5.6e-4），不能和 IEEE FP32 直接比
   - CUDA softmax、LayerNorm 改寫後達 118 GB/s，比 PyTorch 快 1–6%（v2.0 是 57–67 GB/s）；CUDA QKV 仍比 PyTorch 慢 1–10%；所有 kernel 先驗證才計時
   - 另有 FlashAttention、Transformer kernels、Nsight/Roofline、一鍵重現
   - GitHub: https://github.com/boson316/RTX3050-GPU-Mastery
   - 本頁錨點：#gpu-showcase

2. 年化報酬率／退休規劃計算機（純前端）
   - 挑戰→解法：常見做法把年報酬 ÷12 當月報酬，6% 實際約變 6.17%；v6 預設有效年化（月報酬 = (1+r)^(1/12) − 1），可切回名目
   - v6 App 式單頁，中英文介面：反推金額／報酬率／定額／本金／時間；多階段現金流與整體 IRR；退休規劃（4% 法則、買房、通膨、提領模擬，可反推幾歲能退休／每月要存多少／現在要有多少）；可安裝到手機離線使用
   - v6: https://boson316.github.io/niu/annual_return_calculator_v6.html#calc
   - 退休規劃: https://boson316.github.io/niu/annual_return_calculator_v6.html#retire
   - 英文版: https://boson316.github.io/niu/annual_return_calculator_v6.html?lang=en#calc
   - GitHub: https://github.com/boson316/niu

3. 大師 13F 持股追蹤（Live，介面中文）
   - 每天用 GitHub Actions 抓 SEC 13F 申報：20 位投資人（巴菲特、Ackman、Klarman、Burry…，主要 14 位＋備選 6 位）、回溯 20 季
   - 季對季加減碼、跨大師共識、新買進、查個股（某檔股票有哪些大師持有）、持股推估報酬對照 S&P 500；可離線瀏覽
   - 挑戰→解法：外國公司（Chubb、ASML）的 CUSIP 是 CINS 格式，原本 568 檔對不到代號，Dorsey 最新一季約 33% 市值沒代號 → 改用 CINS／ISIN 查 OpenFIGI，加上由測試核對的人工對照表；最新一季沒有代號的市值降到 0.4% 以下（Burry 的特別股除外）
   - Python 標準函式庫、290 個測試；前端純 JavaScript＋SVG，部署在 Cloudflare Workers
   - Live: https://us-stock-tracker.boson316.workers.dev/ （查個股：https://us-stock-tracker.boson316.workers.dev/#stock）
   - 原始碼不公開：沒有 GitHub 連結，禁止編造 repo 網址

4. 校園美食地圖（4 校：宜大、台大、中央、中正）
   - 原本放 Streamlit 免費主機，閒置會休眠要等喚醒 → 改成 GitHub Pages 靜態網站，0 秒冷啟動
   - Python 評分核心（黃氏星等×距離）匯出 JSON；一套 Leaflet 前端 4 校共用，只換學校設定；Google Places 離線快取共 2,200+ 家
   - 15 類篩選、轉盤 Top 40、營業中即時判斷
   - Live: 宜大 https://boson316.github.io/food_map_niu_v2/ · 台大 https://boson316.github.io/food_map_ntu_v1/ · 中央 https://boson316.github.io/food_map_ncu_v1/ · 中正 https://boson316.github.io/food_map_ccu_v1/
   - GitHub（宜大，主版本）: https://github.com/boson316/food_map_niu_v2；其他校：food_map_ntu_v1、food_map_ncu_v1、food_map_ccu_v1

5. 新聞蒐集系統
   - 原本 Render 免費主機每次打開要等 30 秒以上喚醒 → 改成 GitHub Actions 每 15 分鐘抓 26 個 RSS（BBC、Reuters、Bloomberg、中央社…），輸出 GitHub Pages 靜態網站；860+ 篇，0 秒冷啟動
   - 依分類／中英文／來源／關鍵字篩選；預設繁體中文
   - Live: https://boson316.github.io/news/

6. ML 專區（大二課程）
   - 威斯康辛乳腺癌 KNN（K=9）：TN=68 TP=40 FP=3 FN=3，約 94.7%
   - 本頁互動圖：混淆矩陣、Loss/Acc、Feature Importance、相關熱圖、PCA
   - 錨點：#ml-showcase

7. RAG 知識庫聊天：開發中。Gemini + Chroma。沒有 live demo。不要假裝已上線。

【連結對照表 — 給 URL 時只准用下列完整網址，禁止猜 repo 名】
- GPU 實作：https://github.com/boson316/RTX3050-GPU-Mastery（禁止 gpu-lab、GPU-Lab 等不存在 repo）
- 退休計算機：https://github.com/boson316/niu
- 13F 持股追蹤：只有 Live https://us-stock-tracker.boson316.workers.dev/ （原始碼不公開，沒有 GitHub 連結）
- 美食地圖：https://github.com/boson316/food_map_niu_v2（另有 https://github.com/boson316/food_map_ntu_v1 、https://github.com/boson316/food_map_ncu_v1 、https://github.com/boson316/food_map_ccu_v1）· Live 宜大 https://boson316.github.io/food_map_niu_v2/
- 新聞蒐集：https://github.com/boson316/news · Live https://boson316.github.io/news/
- 作品集：https://github.com/boson316/portfolio
- GPU 站內：https://boson316.github.io/portfolio/#gpu-showcase
- ML 站內：https://boson316.github.io/portfolio/#ml-showcase（ML 無獨立 GitHub repo）
- 訪客要連結 → 必須貼完整 https:// URL，不可只寫「GitHub 專案連結」而不給網址。

技能：AI/RAG/LLM（Gemini、Groq、Chroma）、GPU/CUDA/Triton、前端 RWD、Python/Flask、爬蟲、工具開發。
站內功能：暗黑模式（nav ☀/🌙）、#skills 四種 Canvas 技能視覺化（關係圖／CUDA 網格／標籤球／神經網路，點技能會篩選專案卡）、#projects 卡片（每張寫摘要、挑戰、解法、成果）。
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
        "六大作品：GPU 實作、退休計算機、13F 持股追蹤、美食地圖、新聞蒐集、ML 專區（→ #projects）。"
        "RAG 開發中。想深入哪個？"
    ),
    "你的 CUDA 專案有哪些亮點？": (
        "RTX 3050 實作：WMMA 達 cuBLAS 79–87%、MNIST 98.6%。→ #gpu-showcase"
    ),
    "你的 ML 專區有哪些內容？": (
        "KNN（K=9）約 94.7%，五張互動圖。→ #ml-showcase"
    ),
    "怎麼聯絡 Boson？": "poboson316@gmail.com，或 #contact。",
    "Introduce your projects": (
        "Six projects: GPU project, retirement calculator, 13F tracker, food map, news scraper, ML (→ #projects). "
        "RAG in progress. Which one?"
    ),
    "CUDA project highlights": "RTX 3050 project: WMMA 79–87% of cuBLAS, MNIST 98.6%. → #gpu-showcase",
    "What is in the ML section?": "Breast cancer KNN ~94.7%, five interactive charts. → #ml-showcase",
    "How can I contact Boson?": "Email poboson316@gmail.com or #contact.",
}


def get_quick_reply(message: str) -> str | None:
    return QUICK_REPLIES.get(message.strip())


def is_model_missing(err: Exception) -> bool:
    text = str(err).lower()
    return "model_not_found" in text or "decommissioned" in text or "does not exist" in text


def discover_models(client) -> list[str]:
    """向 Groq 查詢可用的聊天模型（排除語音、安全過濾等非聊天模型）。"""
    try:
        ids = [m.id for m in client.models.list().data]
    except Exception:
        return []
    return [i for i in ids if not any(h in i.lower() for h in NON_CHAT_MODEL_HINTS)]


def create_completion(client, messages, **kwargs):
    """依序嘗試模型；模型不存在就換下一個，成功後記住可用的模型。"""
    global _active_model
    tried = []
    queue = list(dict.fromkeys([m for m in [_active_model, *MODEL_CANDIDATES] if m]))
    discovered = False
    while True:
        while queue:
            model = queue.pop(0)
            if model in tried:
                continue
            tried.append(model)
            try:
                completion = client.chat.completions.create(model=model, messages=messages, **kwargs)
            except Exception as e:
                if is_model_missing(e):
                    app.logger.warning("Groq model unavailable: %s", model)
                    if _active_model == model:
                        _active_model = None
                    continue
                raise
            _active_model = model
            return completion
        if discovered:
            raise RuntimeError("No available Groq chat model (tried: %s)" % ", ".join(tried))
        discovered = True
        queue = [m for m in discover_models(client) if m not in tried]


def get_groq_client():
    """逾時要短於前端的 15 秒中止；不重試，避免慢請求長時間佔住 worker。"""
    try:
        from groq import Groq
        if not GROQ_API_KEY:
            return None
        return Groq(api_key=GROQ_API_KEY, timeout=GROQ_TIMEOUT_SECONDS, max_retries=0)
    except Exception:
        return None


@app.route("/api/health", methods=["GET"])
def health():
    payload: dict[str, object] = {
        "ok": True,
        "groq": bool(GROQ_API_KEY),
        "model": _active_model or (MODEL_CANDIDATES[0] if MODEL_CANDIDATES else None),
        "perxona": bool(PERXONA_API_KEY),
    }
    payload["perxonaProxy"] = bool(PERXONA_API_KEY)
    payload["forwarding"] = forwarding_diagnostics()
    return jsonify(payload)


def forwarding_diagnostics() -> dict[str, object]:
    """只回報代理鏈的結構（不含任何 IP），用來核對 TRUSTED_PROXY_HOPS 是否設對。"""
    xff = [part.strip() for part in (request.headers.get("X-Forwarded-For") or "").split(",") if part.strip()]
    cf_ip = (request.headers.get("CF-Connecting-IP") or "").strip()
    cf_position = None
    if cf_ip and cf_ip in xff:
        cf_position = len(xff) - max(i for i, part in enumerate(xff) if part == cf_ip)
    return {
        "xffEntries": len(xff),
        "trustedHops": _TRUSTED_PROXY_HOPS,
        "cfConnectingIp": bool(cf_ip),
        # CF-Connecting-IP 在 X-Forwarded-For 中從右邊數來的位置；應等於 trustedHops。
        "cfPositionFromRight": cf_position,
    }


@app.route("/api/perxona-token", methods=["GET"])
def perxona_token():
    if not PERXONA_API_KEY:
        return jsonify({"error": "PERXONA_API_KEY 未設定"}), 503

    origin = request.headers.get("Origin") or ""
    referer = request.headers.get("Referer") or ""
    if not origin_allowed(origin, referer, PERXONA_ALLOWED_ORIGINS):
        return jsonify({"error": "來源未授權"}), 403
    limited = rate_limited(TOKEN_LIMITER)
    if limited is not None:
        return limited

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
    limited = rate_limited(PROXY_LIMITER)
    if limited is not None:
        return apply_proxy_cors_headers(limited, origin, referer)

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
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}
    message = data.get("message")
    message = message.strip() if isinstance(message, str) else ""
    if not message:
        return jsonify({"error": "請提供 message"}), 400
    if len(message) > MAX_MESSAGE_CHARS:
        return jsonify({"error": f"message 過長（上限 {MAX_MESSAGE_CHARS} 字）"}), 400

    quick = get_quick_reply(message)
    if quick:
        return jsonify({"reply": quick})

    limited = rate_limited(CHAT_LIMITER)
    if limited is not None:
        return limited

    client = get_groq_client()
    if not client:
        return jsonify({
            "reply": "目前後端未設定 Groq API Key，無法使用 AI 回覆。請在後端設定 GROQ_API_KEY 後再試，或直接寄信到 poboson316@gmail.com 聯絡站主。",
            "fallback": True
        }), 200

    history = data.get("history")
    if not isinstance(history, list):
        history = []
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-10:]:
        if not isinstance(h, dict) or not isinstance(h.get("content"), str):
            continue
        role = "user" if h.get("role") == "user" else "assistant"
        content = h["content"].strip()[:MAX_HISTORY_ITEM_CHARS]
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    try:
        completion = create_completion(
            client,
            messages,
            max_tokens=400,
            temperature=0.4,
        )
        reply = (completion.choices[0].message.content or "").strip() or "抱歉，我沒有產生回覆，請再試一次。"
        return jsonify({"reply": reply})
    except Exception:
        app.logger.exception("Groq chat failed")
        return jsonify({
            "reply": "小boson 暫時無法回覆，請稍後再試，或寄信至 poboson316@gmail.com 聯絡站主。",
            "fallback": True
        }), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG", "0") == "1")
