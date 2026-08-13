(function () {
  'use strict';

  var cfg = window.PERXONA_CONFIG || {};
  var SDK_URL = String(cfg.sdkUrl || 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js').trim();
  var agentProfileId = String(cfg.agentProfileId || '').trim();
  var presentationMode = String(cfg.presentationMode || 'bubble').trim();
  var liveUrl = String(cfg.liveUrl || 'https://live.perxona.ai/asia/boson316/xiaoboson').trim();

  var sessionToken = '';
  var tokenExpiresAt = 0;

  function getApiBase() {
    return String(window.PORTFOLIO_API_URL || cfg.apiUrl || '').replace(/\/$/, '');
  }

  function hasAgent() {
    return Boolean(agentProfileId);
  }

  function getAppearanceMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function markPerxonaReady() {
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

  function getDashboardDomainHint() {
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'localhost';
    return host;
  }

  function bindAgentLifecycle(agent) {
    agent.addEventListener('life-status', function (event) {
      var status = event.detail && event.detail.status;
      if (status === 'ready' || status === 'connection-done') {
        markPerxonaReady();
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

    agent.setAttribute('sessionToken', sessionToken);
    agent.removeAttribute('session_token');
    agent.removeAttribute('apiKey');

    var settings = {
      agentProfileId: agentProfileId,
      presentationMode: presentationMode,
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
    if (document.querySelector('sv-agent') || !sessionToken) return;

    var agent = document.createElement('sv-agent');
    agent.setAttribute('agentProfileId', agentProfileId);
    agent.setAttribute('presentationMode', presentationMode);
    agent.setAttribute('sessionToken', sessionToken);
    agent.setAttribute('appearanceMode', getAppearanceMode());
    agent.setAttribute('enableUserActivationCheck', 'false');

    bindAgentLifecycle(agent);
    document.body.appendChild(agent);
    applyAgentSettings(agent).then(function () {
      window.setTimeout(function () { applyAgentSettings(agent); }, 0);
    });
    markPerxonaReady();

    window.__perxonaEmbed = true;
  }

  function init() {
    var apiBase = getApiBase();
    if (!hasAgent() || !apiBase) return;

    var toggle = document.getElementById('themeToggle');
    if (toggle) toggle.addEventListener('click', function () { setTimeout(syncTheme, 0); });

    ensureSessionToken(apiBase)
      .then(loadSdk)
      .then(mountWidget)
      .catch(function () {
        window.__perxonaEmbed = false;
        console.warn(
          '[Perxona] 3D bubble 未載入。請確認 Render PERXONA_API_KEY 與 Dashboard apiKey 一致，' +
          '且網域白名單含「' + getDashboardDomainHint() + '」。Live: ' + liveUrl
        );
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
