(function () {
  'use strict';

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
  var skillData = {
    ai: {
      title: 'AI / RAG / LLM',
      desc: '使用大型語言模型與檢索增強生成（RAG）打造知識庫問答；熟悉 Gemini、Groq 等 API，以及 Chroma 向量庫。',
      image: 'https://placehold.co/320x180/6366f1/fff?text=AI%2FRAG%2FLLM'
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
      skillModalImage.alt = data.title + ' 介紹圖';
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

  function appendMessage(role, text, options) {
    if (!chatMessages) return;
    var wrap = document.createElement('div');
    wrap.className = 'msg msg-' + role + (options && options.typing ? ' msg-typing' : '');
    var avatar = document.createElement('span');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? '你' : 'AI';
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

  function replyToUser(inputText) {
    var text = inputText.trim();
    var lower = text.toLowerCase();

    if (!text) {
      return '可以跟我聊聊年化報酬率計算機、作品集內容或聯絡方式喔。';
    }

    if (lower.includes('你好') || lower.includes('嗨') || lower.includes('hi')) {
      return '你好！我是你的作品集小助手，可以幫你介紹專案、年化報酬率計算機，或提供聯絡方式。';
    }

    if (lower.includes('專案') || lower.includes('作品') || lower.includes('portfolio')) {
      return '目前作品包含：RAG 知識庫聊天、新聞蒐集系統，以及年化報酬率計算機。你可以往上捲到「專案精選」區塊查看細節。';
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
      return '年化報酬率計算機在作品集第三張卡片，你也可以直接開啟：' +
        'https://boson316.github.io/niu/annual_return_calculator_v3.html';
    }

    if (lower.includes('暗黑') || lower.includes('dark') || lower.includes('主題')) {
      return '右上角的 ☀/🌙 按鈕可以切換亮色與暗黑模式，偏好會自動記住。';
    }

    if (lower.includes('cuda') || lower.includes('gpu') || lower.includes('pytorch')) {
      return '有接觸 PyTorch、CUDA 與 GPU 加速的 ML；作品集裡有「PyTorch / ML Demo」訓練曲線與「3D 技能雲」，歡迎捲到專案區看看。';
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

  function getApiUrl() {
    return (typeof window.PORTFOLIO_API_URL !== 'undefined' ? window.PORTFOLIO_API_URL : '') || '';
  }

  function submitChat() {
    if (!chatForm || !chatInput) return;
    var text = chatInput.value.trim();
    if (!text) return;
    appendMessage('user', text);
    chatHistory.push({ role: 'user', content: text });
    chatInput.value = '';

    var apiBase = getApiUrl();
    var typingEl = appendMessage('bot', '思考中…', { typing: true });

    function showReply(reply) {
      removeMessage(typingEl);
      appendMessage('bot', reply);
      chatHistory.push({ role: 'assistant', content: reply });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
    }

    if (!apiBase) {
      setTimeout(function () { showReply(replyToUser(text)); }, 400);
      return;
    }

    fetch(apiBase + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory.slice(0, -1) })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        showReply(data.reply || '沒有收到回覆，請再試一次。');
      })
      .catch(function () {
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
    window.__skills3dLoaded = true;
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      .then(function () { return loadScript('skills-3d.js'); })
      .catch(function () {});
  }

  var skillsSection = document.getElementById('skills');
  if (skillsSection && typeof IntersectionObserver !== 'undefined') {
    var io = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) loadSkills3d();
      },
      { rootMargin: '100px', threshold: 0 }
    );
    io.observe(skillsSection);
  } else if (document.getElementById('skillsCanvas')) {
    loadSkills3d();
  }

  // ========== Chart.js：PyTorch 訓練曲線（延遲載入）==========
  function loadPytorchChart() {
    if (window.__pytorchChartLoaded) return;
    window.__pytorchChartLoaded = true;
    loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js')
      .then(function () { return loadScript('pytorch-chart.js'); })
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
      .then(function () { return loadScript('ml-charts.js'); })
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
