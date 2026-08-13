(function () {
  'use strict';

  var cfg = window.PERXONA_CONFIG || {};
  var SDK_URL = String(cfg.sdkUrl || 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js').trim();
  var agentProfileId = String(cfg.agentProfileId || '').trim();
  // Dashboard Desktop 範例為 bubble；本站 3D FAB 開 panel 用 embedded
  var presentationMode = String(cfg.presentationMode || 'embedded').trim();
  var liveUrl = String(cfg.liveUrl || 'https://live.perxona.ai/asia/boson316/littleboson').trim();

  var sessionToken = '';
  var tokenExpiresAt = 0;
  var sdkReady = false;
  var panel = null;
  var overlay = null;
  var closeBtn = null;

  function getApiBase() {
    return String(window.PORTFOLIO_API_URL || cfg.apiUrl || '').replace(/\/$/, '');
  }

  function hasAgent() {
    return Boolean(agentProfileId);
  }

  function getAppearanceMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function getDashboardDomainHint() {
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'localhost';
    return host;
  }

  function markPerxonaReady() {
    document.body.classList.add('perxona-active');
    var help = document.getElementById('perxonaHelp');
    if (help) help.hidden = true;
  }

  function removeSdkScript() {
    var stale = document.querySelector('script[data-perxona-sdk="1"]');
    if (stale) stale.remove();
    sdkReady = false;
  }

  function waitForSvAgent(timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (!window.customElements || typeof window.customElements.whenDefined !== 'function') {
        resolve();
        return;
      }
      var timer = window.setTimeout(function () {
        reject(new Error('perxona_sdk_timeout'));
      }, timeoutMs || 20000);
      window.customElements.whenDefined('sv-agent').then(function () {
        window.clearTimeout(timer);
        resolve();
      }).catch(function (err) {
        window.clearTimeout(timer);
        reject(err || new Error('perxona_sdk_define_failed'));
      });
    });
  }

  function loadSdk(forceReload) {
    if (forceReload) removeSdkScript();

    return new Promise(function (resolve, reject) {
      if (sdkReady && !forceReload) {
        resolve();
        return;
      }

      var existing = document.querySelector('script[data-perxona-sdk="1"]');
      if (existing && !forceReload) {
        waitForSvAgent(20000).then(function () {
          sdkReady = true;
          resolve();
        }).catch(function (err) {
          removeSdkScript();
          reject(err);
        });
        return;
      }

      var s = document.createElement('script');
      s.type = 'module';
      s.src = SDK_URL;
      s.dataset.perxonaSdk = '1';
      s.onload = function () {
        waitForSvAgent(20000).then(function () {
          sdkReady = true;
          resolve();
        }).catch(reject);
      };
      s.onerror = function () {
        removeSdkScript();
        reject(new Error('perxona_sdk_load_failed'));
      };
      document.head.appendChild(s);
    });
  }

  function setMountStatus(message, isError) {
    var mount = document.getElementById('perxonaMount');
    if (!mount) return;
    var status = mount.querySelector('.perxona-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'perxona-status';
      mount.insertBefore(status, mount.firstChild);
    }
    status.hidden = !message;
    status.classList.toggle('is-error', Boolean(isError));
    status.textContent = message || '';
  }

  function renderHelpPanel(reason, extraHtml) {
    var help = document.getElementById('perxonaHelp');
    if (!help) return;
    help.hidden = false;
    help.innerHTML =
      '<strong>' + reason + '</strong>' +
      (extraHtml || '') +
      '<ol class="perxona-help-list">' +
      '<li>Dashboard <strong>Desktop 嵌入 apiKey</strong> → Render <code>PERXONA_API_KEY</code> 逐字貼上 → Save → 等 redeploy</li>' +
      '<li>比對指紋：<code>curl.exe https://perxona.onrender.com/api/health</code> 的 <code>perxonaKeyHint</code> 前4後4 是否與 Dashboard 相同</li>' +
      '<li>agentProfileId：<code>' + agentProfileId + '</code></li>' +
      '</ol>' +
      '<a class="perxona-live-link" href="' + liveUrl + '" target="_blank" rel="noopener noreferrer">Live 3D 頁（已確認正常）</a>';
  }

  function appendKeyHintToHelp() {
    var apiBase = getApiBase();
    if (!apiBase) return;
    fetch(apiBase + '/api/health', { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.perxonaKeyHint) return;
        var help = document.getElementById('perxonaHelp');
        if (!help) return;
        var el = document.createElement('p');
        el.className = 'perxona-key-hint';
        el.innerHTML = 'Render key 指紋：<code>' + data.perxonaKeyHint + '</code>（' + data.perxonaKeyLen + ' 字）';
        help.appendChild(el);
      })
      .catch(function () {});
  }

  function applySessionToken(agent) {
    if (!agent || !sessionToken) return;
    agent.setAttribute('session_token', sessionToken);
    agent.setAttribute('sessionToken', sessionToken);
    agent.removeAttribute('apiKey');
  }

  function bindAgentLifecycle(agent) {
    var ready = false;
    var disconnectNotified = false;
    var failTimer = window.setTimeout(function () {
      if (ready) return;
      setMountStatus('3D 載入逾時', true);
      renderHelpPanel('3D 載入逾時 → Console 紅字；Network All 查 cdn.perxona.ai 與 perxona.ai API');
    }, 25000);

    agent.addEventListener('life-status', function (event) {
      var status = event.detail && event.detail.status;
      if (status === 'downloading-assets' || status === 'connection-start' || status === 'agent-preparation') {
        setMountStatus('3D 小boson 載入中…', false);
        return;
      }
      if (status === 'ready' || status === 'connection-done') {
        ready = true;
        disconnectNotified = false;
        window.clearTimeout(failTimer);
        setMountStatus('', false);
        markPerxonaReady();
        return;
      }
      if (status === 'disconnected' && !disconnectNotified) {
        disconnectNotified = true;
        setMountStatus('Perxona 連線失敗', true);
        renderHelpPanel(
          'Perxona API 403（token 200 但 initialize 403）→ JWT 簽章 key 與 Dashboard apiKey 不一致',
          '<p>Network 若見 <code>initialize</code>、agent id 皆 403，幾乎一定是 Render key 錯。</p>'
        );
        appendKeyHintToHelp();
      }
    });
  }

  function fetchSessionToken(apiBase) {
    return fetch(apiBase + '/api/perxona-token', {
      method: 'GET',
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('perxona_token_' + res.status);
      return res.json();
    }).then(function (data) {
      sessionToken = String(data.sessionToken || '').trim();
      tokenExpiresAt = Number(data.expiresAt || 0);
      if (!sessionToken) throw new Error('perxona_token_empty');
    });
  }

  function ensureSessionToken(apiBase) {
    var now = Math.floor(Date.now() / 1000);
    if (sessionToken && tokenExpiresAt - now > 60) {
      return Promise.resolve();
    }
    return fetchSessionToken(apiBase);
  }

  function syncTheme() {
    var agent = document.querySelector('sv-agent');
    if (!agent || typeof agent.updateWidgetSetting !== 'function') return;
    agent.updateWidgetSetting({ appearanceMode: getAppearanceMode() });
  }

  function applyAgentSettings(agent) {
    if (!agent || !sessionToken) return Promise.resolve(false);

    applySessionToken(agent);

    var settings = {
      agentProfileId: agentProfileId,
      presentationMode: presentationMode,
      displayMode: 'fullPresentation',
      conversationMode: 'inputText',
      readyToShowPolicy: 'ShowWhenAssetsLoading',
      session_token: sessionToken,
      appearanceMode: getAppearanceMode(),
      enableUserActivationCheck: false
    };

    // 只用 attribute + updateWidgetSetting；不呼叫 updateSessionToken（同步 throw 會整段 abort）
    try {
      if (typeof agent.updateWidgetSetting === 'function') {
        agent.updateWidgetSetting(settings);
      }
    } catch (err) {
      console.warn('[perxona] updateWidgetSetting failed', err);
    }
    return Promise.resolve(true);
  }

  function mountWidget() {
    var mount = document.getElementById('perxonaMount');
    if (!mount || mount.querySelector('sv-agent') || !sessionToken) {
      return Promise.resolve();
    }

    setMountStatus('3D 小boson 載入中…', false);

    var agent = document.createElement('sv-agent');
    agent.setAttribute('agentProfileId', agentProfileId);
    agent.setAttribute('presentationMode', presentationMode);
    agent.setAttribute('displayMode', 'fullPresentation');
    agent.setAttribute('conversationMode', 'inputText');
    agent.setAttribute('readyToShowPolicy', 'ShowWhenAssetsLoading');
    agent.setAttribute('session_token', sessionToken);
    agent.setAttribute('appearanceMode', getAppearanceMode());
    agent.setAttribute('enableUserActivationCheck', 'false');

    bindAgentLifecycle(agent);
    mount.appendChild(agent);

    return applyAgentSettings(agent).then(function () {
      window.setTimeout(function () { applyAgentSettings(agent); }, 0);
    }).then(function () {
      window.__perxonaEmbed = true;
      window.__perxonaOpen = openPerxonaPanel;
      window.__perxonaClose = closePerxonaPanel;
    });
  }

  function ensureWidgetReady() {
    var apiBase = getApiBase();
    if (!hasAgent() || !apiBase) {
      return Promise.reject(new Error('perxona_config_missing'));
    }

    return ensureSessionToken(apiBase)
      .then(function () { return loadSdk(false); })
      .then(mountWidget);
  }

  function openPerxonaPanel() {
    if (!panel || !overlay) return;

    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');

    if (!sessionToken) {
      setMountStatus('3D token 未取得', true);
      renderHelpPanel('後端 token 失敗');
      return;
    }

    ensureWidgetReady().catch(function (err) {
      console.error('[perxona] ensureWidgetReady failed', err);
      var msg = String(err && err.message || err || '');
      if (msg.indexOf('perxona_sdk_load_failed') !== -1 || msg.indexOf('perxona_sdk_timeout') !== -1) {
        setMountStatus('SDK 載入失敗', true);
        renderHelpPanel('cdn.perxona.ai 載入失敗或逾時（Network 改 All 篩 cdn.perxona.ai；關擋廣告）');
        return;
      }
      if (msg.indexOf('perxona_config_missing') !== -1) {
        setMountStatus('設定缺失', true);
        renderHelpPanel('perxona-config.js 未載入或 PORTFOLIO_API_URL 空白');
        return;
      }
      if (msg.indexOf('perxona_token_') !== -1) {
        setMountStatus('3D token 失敗', true);
        renderHelpPanel('後端 token ' + msg.replace('perxona_token_', ''));
        return;
      }
      setMountStatus('3D 初始化失敗', true);
      renderHelpPanel('Live 正常＝Agent OK。查 Console 紅字；Network All 篩 cdn.perxona.ai / perxona.ai');
    });
  }

  function closePerxonaPanel() {
    if (!panel || !overlay) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    var chatOpen = document.getElementById('chatPanel') && document.getElementById('chatPanel').classList.contains('is-open');
    if (!chatOpen) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function bindPerxonaFab() {
    var fab = document.getElementById('perxonaFab');
    if (!fab || fab.dataset.bound === '1') return;
    fab.dataset.bound = '1';
    fab.addEventListener('click', function () {
      if (typeof window.closeTextChat === 'function') window.closeTextChat();
      openPerxonaPanel();
    });
  }

  function bindUi() {
    panel = document.getElementById('perxonaPanel');
    overlay = document.getElementById('chatOverlay');
    closeBtn = document.getElementById('perxonaClose');

    bindPerxonaFab();

    if (closeBtn) closeBtn.addEventListener('click', closePerxonaPanel);
    if (overlay) {
      overlay.addEventListener('click', function () {
        closePerxonaPanel();
      });
    }

    var toggle = document.getElementById('themeToggle');
    if (toggle) toggle.addEventListener('click', function () { setTimeout(syncTheme, 0); });
  }

  function init() {
    bindUi();
    var apiBase = getApiBase();
    if (!hasAgent() || !apiBase) return;

    // 背景預載 token + SDK；真正 mount 等按 3D 且 panel 已開
    ensureSessionToken(apiBase)
      .then(loadSdk)
      .catch(function () {
        window.__perxonaEmbed = false;
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
