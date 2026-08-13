(function () {
  'use strict';

  var cfg = window.PERXONA_CONFIG || {};
  var SDK_URL = String(cfg.sdkUrl || 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js').trim();
  var agentProfileId = String(cfg.agentProfileId || '').trim();
  var presentationMode = String(cfg.presentationMode || 'embedded').trim();
  var liveUrl = String(cfg.liveUrl || 'https://live.perxona.ai/asia/boson316/xiaoboson').trim();

  var sessionToken = '';
  var tokenExpiresAt = 0;
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

  function hideLegacyChatUi() {
    // 保留文字聊天；僅標記 Perxona 已就緒（供 3D FAB 顯示）
    document.body.classList.add('perxona-active');
  }

  function loadSdk() {
    return new Promise(function (resolve, reject) {
      function waitForAgent() {
        if (window.customElements && typeof window.customElements.whenDefined === 'function') {
          window.customElements.whenDefined('sv-agent').then(resolve).catch(reject);
          return;
        }
        resolve();
      }

      if (document.querySelector('script[data-perxona-sdk="1"]')) {
        waitForAgent();
        return;
      }
      var s = document.createElement('script');
      s.type = 'module';
      s.src = SDK_URL;
      s.dataset.perxonaSdk = '1';
      s.onload = function () { waitForAgent(); };
      s.onerror = function () { reject(new Error('perxona_sdk_load_failed')); };
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

  function getDashboardDomainHint() {
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'localhost';
    return host;
  }

  function getDisconnectHelpMessage() {
    var domain = getDashboardDomainHint();
    return (
      'Perxona 連線失敗（401）。請依序檢查：' +
      '① Dashboard 嵌入 apiKey 與 Render PERXONA_API_KEY 完全一致並 Redeploy；' +
      '② Dashboard 網域白名單目前必須填「' + domain + '」（本機用 localhost，線上用 boson316.github.io）。' +
      '改完儲存等 1～2 分鐘再 Ctrl+Shift+R。'
    );
  }

  function bindAgentLifecycle(agent) {
    var ready = false;
    var disconnectNotified = false;
    var failTimer = window.setTimeout(function () {
      if (ready) return;
      setMountStatus(
        'Perxona 載入逾時。Dashboard 網域白名單需含「' + getDashboardDomainHint() + '」。',
        true
      );
    }, 20000);

    agent.addEventListener('life-status', function (event) {
      var status = event.detail && event.detail.status;
      if (status === 'downloading-assets' || status === 'connection-start' || status === 'agent-preparation') {
        setMountStatus('小boson 載入中…', false);
        return;
      }
      if (status === 'ready' || status === 'connection-done') {
        ready = true;
        disconnectNotified = false;
        window.clearTimeout(failTimer);
        setMountStatus('', false);
        return;
      }
      if (status === 'disconnected' && !disconnectNotified) {
        disconnectNotified = true;
        setMountStatus(getDisconnectHelpMessage(), true);
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

  function showPerxonaFab() {
    var fab = document.getElementById('perxonaFab');
    if (fab) fab.hidden = false;
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

  function openPerxonaPanel() {
    if (!sessionToken) {
      window.open(liveUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!panel || !overlay) return;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
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

  function applyAgentSettings(agent) {
    if (!agent || !sessionToken) return Promise.resolve(false);

    // SDK observedAttributes 是 sessionToken（camelCase），不是 session_token
    agent.setAttribute('sessionToken', sessionToken);
    agent.removeAttribute('session_token');
    agent.removeAttribute('apiKey');

    var settings = {
      agentProfileId: agentProfileId,
      presentationMode: presentationMode,
      displayMode: 'fullPresentation',
      conversationMode: 'inputText',
      readyToShowPolicy: 'ShowWhenAssetsLoading',
      sessionToken: sessionToken,
      appearanceMode: getAppearanceMode(),
      enableUserActivationCheck: false
    };

    if (typeof agent.updateSessionToken === 'function') {
      return Promise.resolve(agent.updateSessionToken(sessionToken)).then(function (ok) {
        if (typeof agent.updateWidgetSetting === 'function') {
          agent.updateWidgetSetting(settings);
        }
        return ok !== false;
      });
    }

    if (typeof agent.updateWidgetSetting === 'function') {
      agent.updateWidgetSetting(settings);
    }
    return Promise.resolve(true);
  }

  function mountWidget() {
    var mount = document.getElementById('perxonaMount');
    if (!mount || mount.querySelector('sv-agent') || !sessionToken) return;

    setMountStatus('小boson 載入中…', false);

    var agent = document.createElement('sv-agent');
    agent.setAttribute('agentProfileId', agentProfileId);
    agent.setAttribute('presentationMode', presentationMode);
    agent.setAttribute('displayMode', 'fullPresentation');
    agent.setAttribute('conversationMode', 'inputText');
    agent.setAttribute('readyToShowPolicy', 'ShowWhenAssetsLoading');
    agent.setAttribute('sessionToken', sessionToken);
    agent.setAttribute('appearanceMode', getAppearanceMode());
    agent.setAttribute('enableUserActivationCheck', 'false');

    bindAgentLifecycle(agent);
    mount.appendChild(agent);
    applyAgentSettings(agent).then(function () {
      window.setTimeout(function () { applyAgentSettings(agent); }, 0);
    });
    hideLegacyChatUi();
    showPerxonaFab();
    bindPerxonaFab();

    window.__perxonaEmbed = true;
    window.__perxonaOpen = openPerxonaPanel;
    window.__perxonaClose = closePerxonaPanel;
  }

  function bindUi() {
    panel = document.getElementById('perxonaPanel');
    overlay = document.getElementById('chatOverlay');
    closeBtn = document.getElementById('perxonaClose');

    if (closeBtn) closeBtn.addEventListener('click', closePerxonaPanel);
    if (overlay) {
      overlay.addEventListener('click', function () {
        if (window.__perxonaEmbed) closePerxonaPanel();
      });
    }

    var toggle = document.getElementById('themeToggle');
    if (toggle) toggle.addEventListener('click', function () { setTimeout(syncTheme, 0); });
  }

  function init() {
    bindUi();
    var apiBase = getApiBase();
    if (!hasAgent() || !apiBase) return;

    ensureSessionToken(apiBase)
      .then(loadSdk)
      .then(mountWidget)
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
