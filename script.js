(function () {
  'use strict';

  var isEn = (document.documentElement.getAttribute('lang') || '').toLowerCase().indexOf('en') === 0;
  var CALC_URL = isEn
    ? 'https://boson316.github.io/niu/annual_return_calculator_en_v1.html'
    : 'https://boson316.github.io/niu/annual_return_calculator_v5.html';
  var assetBase = (function () {
    if (typeof window.PORTFOLIO_ASSET_BASE === 'string') {
      var b = window.PORTFOLIO_ASSET_BASE;
      return b.endsWith('/') ? b : b + '/';
    }
    var scripts = document.querySelectorAll('script[src]');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].getAttribute('src');
      if (src && /(^|\/)script\.js(\?|$)/.test(src)) {
        try {
          var url = new URL(src, window.location.href);
          return url.href.substring(0, url.href.lastIndexOf('/') + 1);
        } catch (e) { /* ignore */ }
      }
    }
    return /\/en(\/|$)/i.test((window.location.pathname || '').replace(/\\/g, '/')) ? '../' : '';
  })();

  function assetUrl(file) {
    return assetBase.indexOf('://') !== -1 ? assetBase + file : assetBase + file;
  }

  // ========== 暗黑模式 ==========
  const themeKey = 'portfolio-theme';
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  function getStoredTheme() {
    return localStorage.getItem(themeKey) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function setTheme(theme) {
    var isDark = theme === 'dark';
    html.setAttribute('data-theme', isDark ? 'dark' : 'light');
    html.classList.toggle('dark', isDark);
    localStorage.setItem(themeKey, theme);
  }

  setTheme(getStoredTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  // ========== 手機選單 ==========
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('is-open');
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('is-open');
      });
    });
  }

  // ========== 3D 技能雲：點擊顯示介紹（名稱 + 圖片 + 說明）==========
  var skillData = isEn ? {
    ai: {
      title: 'AI / RAG / LLM',
      desc: 'RAG knowledge-base Q&A with Gemini, Groq APIs, and Chroma. Experience with vision pipelines and edge deployment.',
      image: 'https://placehold.co/320x180/6366f1/fff?text=AI%2FRAG%2FLLM'
    },
    gpu: {
      title: 'GPU / CUDA / Triton',
      desc: 'RTX 3050 GPU lab: pure CUDA (521× matmul, reduction), PyTorch Extension, Triton, FlashAttention, Transformer kernels; Nsight/Roofline and one-command reproduction.',
      image: 'https://placehold.co/320x180/76b900/fff?text=GPU%2FCUDA%2FTriton'
    },
    web: {
      title: 'Frontend / RWD',
      desc: 'Responsive UI, utility-first CSS, Lighthouse tuning; interactive UI, dark mode, and accessibility.',
      image: 'https://placehold.co/320x180/0ea5e9/fff?text=Frontend%2FRWD'
    },
    python: {
      title: 'Python / Flask',
      desc: 'Backend APIs, Flask deployment, Groq integration, scraping, .env and CORS setup.',
      image: 'https://placehold.co/320x180/10b981/fff?text=Python%2FFlask'
    },
    data: {
      title: 'Data / Scraping',
      desc: 'RSS and web crawlers, news aggregation and filtering; cleaning and structuring data for APIs.',
      image: 'https://placehold.co/320x180/f59e0b/fff?text=Data%20%2F%20Scraping'
    },
    tools: {
      title: 'Tooling',
      desc: 'Annual return calculator, Chart.js visualizations, Three.js demos, and portfolio tooling.',
      image: 'https://placehold.co/320x180/c45c26/fff?text=Tools'
    }
  } : {
    ai: {
      title: 'AI / RAG / LLM',
      desc: '使用大型語言模型與檢索增強生成（RAG）打造知識庫問答；熟悉 Gemini、Groq 等 API，以及 Chroma 向量庫。另有即時視覺與邊緣管線實作經驗。',
      image: 'https://placehold.co/320x180/6366f1/fff?text=AI%2FRAG%2FLLM'
    },
    gpu: {
      title: 'GPU / CUDA / Triton',
      desc: 'RTX 3050 GPU 優化實驗室：Pure CUDA（521× matmul、reduction）、PyTorch Extension、Triton kernels、FlashAttention、Transformer kernels；含 Nsight 與 Roofline 分析、逐步教學與一鍵重現。',
      image: 'https://placehold.co/320x180/76b900/fff?text=GPU%2FCUDA%2FTriton'
    },
    web: {
      title: '前端 / RWD',
      desc: '響應式網頁設計、Tailwind 風格 utility、Lighthouse 優化；具備互動式 UI、暗黑模式與無障礙實作經驗。',
      image: 'https://placehold.co/320x180/0ea5e9/fff?text=Frontend%2FRWD'
    },
    python: {
      title: 'Python / Flask',
      desc: '後端 API 開發、Flask 專案部署；串接 Groq、爬蟲與資料處理，以及 .env 與 CORS 設定。',
      image: 'https://placehold.co/320x180/10b981/fff?text=Python%2FFlask'
    },
    data: {
      title: '資料處理 / 爬蟲',
      desc: 'RSS 與網頁爬蟲、新聞蒐集與篩選；資料清洗與結構化，供前端或 API 使用。',
      image: 'https://placehold.co/320x180/f59e0b/fff?text=Data%20%2F%20Scraping'
    },
    tools: {
      title: '工具開發',
      desc: '年化報酬率計算機、圖表視覺化（Chart.js）、3D 展示（Three.js）等工具與 demo 開發。',
      image: 'https://placehold.co/320x180/c45c26/fff?text=Tools'
    }
  };

  var skillModal = document.getElementById('skillModal');
  var skillModalBackdrop = document.getElementById('skillModalBackdrop');
  var skillModalClose = document.getElementById('skillModalClose');
  var skillModalTitle = document.getElementById('skillModalTitle');
  var skillModalImage = document.getElementById('skillModalImage');
  var skillModalDesc = document.getElementById('skillModalDesc');
  var skillsList = document.getElementById('skillsList');

  function openSkillModal(key) {
    var data = skillData[key];
    if (!data || !skillModal) return;
    if (skillModalTitle) skillModalTitle.textContent = data.title;
    if (skillModalDesc) skillModalDesc.textContent = data.desc;
    if (skillModalImage) {
      skillModalImage.src = data.image;
      skillModalImage.alt = data.title + (isEn ? ' overview' : ' 介紹圖');
    }
    skillModal.classList.add('is-open');
    skillModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeSkillModal() {
    if (!skillModal) return;
    skillModal.classList.remove('is-open');
    skillModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (skillsList) {
    skillsList.querySelectorAll('[data-skill]').forEach(function (li) {
      li.addEventListener('click', function () {
        openSkillModal(li.getAttribute('data-skill'));
      });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openSkillModal(li.getAttribute('data-skill'));
        }
      });
    });
  }
  if (skillModalClose) skillModalClose.addEventListener('click', closeSkillModal);
  if (skillModalBackdrop) skillModalBackdrop.addEventListener('click', closeSkillModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && skillModal && skillModal.classList.contains('is-open')) closeSkillModal();
  });

  // ========== AI 聊天框 ==========
  const chatFab = document.getElementById('chatFab');
  const chatPanel = document.getElementById('chatPanel');
  const chatClose = document.getElementById('chatClose');
  const chatOverlay = document.getElementById('chatOverlay');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const chatChips = document.querySelectorAll('.chat-chip');

  function openChat() {
    if (!chatPanel || !chatOverlay) return;
    chatPanel.classList.add('is-open');
    chatPanel.setAttribute('aria-hidden', 'false');
    chatOverlay.classList.add('is-open');
    chatOverlay.setAttribute('aria-hidden', 'false');
    if (chatInput) chatInput.focus();
  }
  window.openChat = openChat;

  function closeChat() {
    if (!chatPanel || !chatOverlay) return;
    chatPanel.classList.remove('is-open');
    chatPanel.setAttribute('aria-hidden', 'true');
    chatOverlay.classList.remove('is-open');
    chatOverlay.setAttribute('aria-hidden', 'true');
  }

  if (chatFab) chatFab.addEventListener('click', openChat);
  if (chatClose) chatClose.addEventListener('click', closeChat);
  if (chatOverlay) chatOverlay.addEventListener('click', closeChat);

  // ========== 互動卡片 tilt ==========
  var cards = document.querySelectorAll('.card[data-tilt]');
  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      var tiltX = y * -8;
      var tiltY = x * 8;
      card.style.transform = 'translateY(-4px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  });

  var chatHistory = [];
  var isSending = false;

  function appendMessage(role, text, options) {
    if (!chatMessages) return;
    var wrap = document.createElement('div');
    wrap.className = 'msg msg-' + role + (options && options.typing ? ' msg-typing' : '');
    var avatar = document.createElement('span');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? (isEn ? 'You' : '你') : 'AI';
    var p = document.createElement('p');
    p.textContent = text;
    wrap.appendChild(avatar);
    wrap.appendChild(p);
    chatMessages.appendChild(wrap);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return wrap;
  }

  function removeMessage(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function replyToUserEn(inputText) {
    var text = inputText.trim();
    var lower = text.toLowerCase();
    if (!text) return 'Ask about projects, the return calculator, or contact info.';
    if (lower.includes('hi') || lower.includes('hello')) {
      return 'Hi! I can walk you through GPU projects, ML charts, the calculator, or how to reach Boson.';
    }
    if (lower.includes('project') || lower.includes('portfolio')) {
      return 'Featured: GPU Optimization Lab, annual return calculator, news aggregator, NIU food map, ML charts, and RAG (WIP). Scroll to Selected projects.';
    }
    if (lower.includes('contact') || lower.includes('email')) {
      return 'Email: poboson316@gmail.com';
    }
    if (lower.includes('calculator') || lower.includes('cagr') || lower.includes('irr') || lower.includes('return')) {
      return 'Annual return calculator: ' + CALC_URL;
    }
    if (lower.includes('dark') || lower.includes('theme')) {
      return 'Use the ☀/🌙 button in the nav to toggle light/dark mode.';
    }
    if (lower.includes('cuda') || lower.includes('gpu') || lower.includes('pytorch')) {
      return 'See the GPU Optimization Lab section — CUDA matmul 521× speedup, MNIST 99%, Triton, FlashAttention.';
    }
    if (lower.includes('ml') || lower.includes('knn') || lower.includes('confusion') || lower.includes('pca')) {
      return 'ML section: Wisconsin breast cancer KNN (~94.7% acc), confusion matrix, loss/acc curves, feature importance, PCA.';
    }
    return 'Got it. Try “CUDA project highlights” or “Introduce your projects”. With Groq API configured, AI replies replace this fallback.';
  }

  function replyToUser(inputText) {
    if (isEn) return replyToUserEn(inputText);

    var text = inputText.trim();
    var lower = text.toLowerCase();

    if (!text) {
      return '可以跟我聊聊年化報酬率計算機、作品集內容或聯絡方式喔。';
    }

    if (lower.includes('你好') || lower.includes('嗨') || lower.includes('hi')) {
      return '你好！我是你的作品集小助手，可以幫你介紹專案、年化報酬率計算機，或提供聯絡方式。';
    }

    if (lower.includes('專案') || lower.includes('作品') || lower.includes('portfolio')) {
      return '目前作品包含：GPU Optimization Lab、校園美食地圖 v2（宜大）、新聞蒐集、年化報酬率計算機與 RAG（開發中）。請捲到「專案精選」查看卡片與連結。';
    }

    if (
      lower.includes('聯絡') ||
      lower.includes('email') ||
      lower.includes('聯繫') ||
      lower.includes('信箱')
    ) {
      return '你可以直接寄信到 poboson316@gmail.com，或在這裡留下想說的話。';
    }

    if (
      lower.includes('年化') ||
      lower.includes('報酬') ||
      lower.includes('計算機') ||
      lower.includes('irr') ||
      lower.includes('複利')
    ) {
      return '退休規劃 v5／年化 v4 在作品集第二張卡片，也可直接開啟：' + CALC_URL;
    }

    if (lower.includes('暗黑') || lower.includes('dark') || lower.includes('主題')) {
      return '右上角的 ☀/🌙 按鈕可以切換亮色與暗黑模式，偏好會自動記住。';
    }

    if (
      lower.includes('multimedia') || lower.includes('mediapipe') || lower.includes('邊緣') ||
      lower.includes('edge-cloud') || lower.includes('edge–cloud') || lower.includes('人臉管線')
    ) {
      return '目前已下架該主題展示；可先參考 GPU 與 ML 相關專案內容。';
    }

    if (lower.includes('cuda') || lower.includes('gpu') || lower.includes('pytorch')) {
      return '有接觸 PyTorch、CUDA 與 GPU 加速的 ML；作品集含「GPU Optimization Lab」專區與 PyTorch 訓練曲線卡片。歡迎捲到專案區查看。';
    }

    if (
      lower.includes('ml') || lower.includes('機器學習') || lower.includes('knn') ||
      lower.includes('乳腺癌') || lower.includes('混淆矩陣') || lower.includes('confusion') ||
      lower.includes('feature importance') || lower.includes('特徵重要性') ||
      lower.includes('pca') || lower.includes('資料科學') || lower.includes('人工智慧導論')
    ) {
      return '大二修過人工智慧導論與資料科學，做過威斯康辛乳腺癌 KNN 分類（準確率約 94.7%）。請捲到「ML 專區」看互動圖表：混淆矩陣、Loss/Acc 曲線、Feature Importance、相關熱圖與 PCA 散點，都有 Chart.js 互動版喔！';
    }

    return '收到你的訊息了！若後端已接上 Groq，會由 AI 回覆；也可試問「你的 CUDA 專案？」或「介紹專案」、「ML 專區」。';
  }

  function setChatSendingState(sending) {
    if (!chatInput || !chatForm) return;
    var submitBtn = chatForm.querySelector('button[type="submit"]');
    isSending = sending;
    chatInput.disabled = sending;
    if (submitBtn) {
      submitBtn.disabled = sending;
      submitBtn.textContent = sending ? (isEn ? 'Sending…' : '傳送中…') : (isEn ? 'Send' : '送出');
    }
    if (chatChips && chatChips.length) {
      chatChips.forEach(function (chip) { chip.disabled = sending; });
    }
  }

  function getApiUrl() {
    return (typeof window.PORTFOLIO_API_URL !== 'undefined' ? window.PORTFOLIO_API_URL : '') || '';
  }

  function submitChat() {
    if (!chatForm || !chatInput) return;
    if (isSending) return;
    var text = chatInput.value.trim();
    if (!text) return;
    appendMessage('user', text);
    chatHistory.push({ role: 'user', content: text });
    chatInput.value = '';
    setChatSendingState(true);

    var apiBase = getApiUrl();
    var typingEl = appendMessage('bot', isEn ? 'Thinking…' : '思考中…', { typing: true });

    function showReply(reply) {
      removeMessage(typingEl);
      appendMessage('bot', reply);
      chatHistory.push({ role: 'assistant', content: reply });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
      setChatSendingState(false);
      chatInput.focus();
    }

    if (!apiBase) {
      setTimeout(function () { showReply(replyToUser(text)); }, 400);
      return;
    }

    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 15000);

    fetch(apiBase + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory.slice(0, -1) }),
      signal: controller.signal
    })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('HTTP_' + res.status);
        return res.json();
      })
      .then(function (data) {
        var reply = (data && typeof data.reply === 'string' && data.reply.trim())
          ? data.reply.trim()
          : '';
        showReply(reply || replyToUser(text));
      })
      .catch(function (err) {
        clearTimeout(timeoutId);
        if (err && err.name === 'AbortError') {
          showReply('目前 AI 回覆逾時（15 秒），先用本地助手回覆你：' + replyToUser(text));
          return;
        }
        showReply(replyToUser(text));
      });
  }

  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      submitChat();
    });
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitChat();
      }
    });
  }

  if (chatChips && chatChips.length) {
    chatChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (isSending || !chatInput) return;
        var prompt = chip.getAttribute('data-chat-prompt');
        if (!prompt) return;
        chatInput.value = prompt;
        submitChat();
      });
    });
  }

  // ========== Bundle 優化：延遲載入 Three.js + skills-3d（僅在技能區進入視窗時載入）==========
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  function loadSkills3d() {
    if (window.__skills3dLoaded) return;
    var skillsCanvas = document.getElementById('skillsCanvas');
    if (skillsCanvas && skillsCanvas.dataset.skills3dReady === '1') {
      window.__skills3dLoaded = true;
      return;
    }
    window.__skills3dLoaded = true;
    function runSkills3d() {
      if (typeof THREE === 'undefined') return Promise.reject(new Error('THREE not loaded'));
      return loadScript(assetUrl('skills-3d.js'));
    }
    if (typeof THREE !== 'undefined') {
      runSkills3d().catch(function () {});
      return;
    }
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      .then(runSkills3d)
      .catch(function () {});
  }

  function tryLoadSkills3dIfVisible() {
    var sec = document.getElementById('skills');
    if (!sec || !document.getElementById('skillsCanvas')) return;
    var r = sec.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight + 200) loadSkills3d();
  }

  var skillsSection = document.getElementById('skills');
  if (skillsSection && typeof IntersectionObserver !== 'undefined') {
    var io = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          loadSkills3d();
          io.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0 }
    );
    io.observe(skillsSection);
  } else if (document.getElementById('skillsCanvas')) {
    loadSkills3d();
  }
  document.addEventListener('DOMContentLoaded', tryLoadSkills3dIfVisible);
  window.addEventListener('load', tryLoadSkills3dIfVisible);

  // ========== Chart.js：PyTorch 訓練曲線（延遲載入）==========
  function loadPytorchChart() {
    if (window.__pytorchChartLoaded) return;
    window.__pytorchChartLoaded = true;
    loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js')
      .then(function () { return loadScript(assetUrl('pytorch-chart.js')); })
      .catch(function () {});
  }

  var chartCard = document.getElementById('pytorchChart');
  var chartSection = document.getElementById('projectCards');
  var target = chartSection || chartCard;
  if (target && typeof IntersectionObserver !== 'undefined') {
    var ioChart = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) loadPytorchChart();
      },
      { rootMargin: '120px', threshold: 0 }
    );
    ioChart.observe(target);
  } else if (chartCard) {
    loadPytorchChart();
  }

  // ========== ML 專區：Chart.js + matrix 外掛 + ml-charts，捲動解說、區塊動畫 ==========
  function loadMlCharts() {
    if (window.__mlChartsLoaded) return;
    window.__mlChartsLoaded = true;
    loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js')
      .then(function () { return loadScript('https://cdn.jsdelivr.net/npm/chartjs-chart-matrix@2.0.1/dist/chartjs-chart-matrix.min.js'); })
      .then(function () { return loadScript(assetUrl('ml-charts.js')); })
      .catch(function () {});
  }

  var mlShowcase = document.getElementById('ml-showcase');
  if (mlShowcase && typeof IntersectionObserver !== 'undefined') {
    var ioMl = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) loadMlCharts();
      },
      { rootMargin: '150px', threshold: 0 }
    );
    ioMl.observe(mlShowcase);
  } else if (mlShowcase) {
    loadMlCharts();
  }

  // 解說氣泡：捲動到哪個圖表區塊就更新文字
  var mlNarrativeText = document.getElementById('mlNarrativeText');
  var mlBlocks = document.querySelectorAll('.ml-chart-block[data-narrative]');
  if (mlNarrativeText && mlBlocks.length) {
    var ioNarrative = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var msg = entry.target.getAttribute('data-narrative');
          if (msg) mlNarrativeText.textContent = msg;
        });
      },
      { rootMargin: '-15% 0px -55% 0px', threshold: 0 }
    );
    mlBlocks.forEach(function (block) { ioNarrative.observe(block); });
  }

  // 圖表區塊進入視窗時加上 .is-visible 做淡入動畫
  var mlAnimateBlocks = document.querySelectorAll('.ml-chart-block.ml-animate');
  if (mlAnimateBlocks.length && typeof IntersectionObserver !== 'undefined') {
    var ioVisible = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0 }
    );
    mlAnimateBlocks.forEach(function (block) { ioVisible.observe(block); });
  }
})();
