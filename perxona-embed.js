(function () {
  'use strict';

  var cfg = window.PERXONA_CONFIG || {};
  var SDK_URL = String(cfg.sdkUrl || 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js').trim();
  var agentProfileId = String(cfg.agentProfileId || '').trim();
  // Dashboard Desktop 範例為 bubble；本站 3D FAB 開 panel 用 embedded
  var presentationMode = String(cfg.presentationMode || 'embedded').trim();
  var liveUrl = String(cfg.liveUrl || 'https://live.perxona.ai/asia/boson316/littleboson').trim();
  var preferLiveIframe = cfg.preferLiveIframe === true;
  var disconnectGraceMs = Number(cfg.disconnectGraceMs);
  if (!Number.isFinite(disconnectGraceMs) || disconnectGraceMs < 0) {
    disconnectGraceMs = 5000;
  }

  var sessionToken = '';
  var tokenExpiresAt = 0;
  var sdkReady = false;
  var liveFallbackMounted = false;
  var initializeSucceeded = false;
  var panel = null;
  var overlay = null;
  var closeBtn = null;

  function getApiBase() {
    return String(window.PORTFOLIO_API_URL || cfg.apiUrl || '').replace(/\/$/, '');
  }

  function installPerxonaApiProxy(apiBase) {
    if (!apiBase || window.__perxonaProxyInstalled) return;
    window.__perxonaProxyInstalled = true;

    var rewriteMotionNativeZip = cfg.rewriteMotionNativeZip !== false;

    function rewriteMotionAssetUrl(url) {
      if (!rewriteMotionNativeZip) return null;
      try {
        var parsed = new URL(String(url), location.href);
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'cdn.perxona.ai') return null;
        if (!/\/native\.zip$/i.test(parsed.pathname)) return null;
        parsed.pathname = parsed.pathname.replace(/\/native\.zip$/i, '/import.zip');
        return parsed.href;
      } catch (err) {}
      return null;
    }

    function proxiedConsoleUrl(url) {
      try {
        var parsed = new URL(String(url), location.href);
        if (parsed.protocol === 'https:' && parsed.hostname === 'console.perxona.ai') {
          return apiBase + '/api/perxona-proxy?target=' + encodeURIComponent(parsed.href);
        }
      } catch (err) {}
      return null;
    }

    function resolveRequestUrl(url) {
      return rewriteMotionAssetUrl(url) || proxiedConsoleUrl(url);
    }

    function markInitializeSuccess(url) {
      if (/conversation\/initialize/i.test(String(url || ''))) {
        initializeSucceeded = true;
      }
    }

    var nativeFetch = window.fetch;
    if (typeof nativeFetch === 'function') {
      window.fetch = function (input, init) {
        var url = (input && typeof input.url === 'string') ? input.url : String(input);
        var rewritten = resolveRequestUrl(url);
        if (!rewritten) return nativeFetch.apply(this, arguments);
        markInitializeSuccess(url);
        var requestPromise;
        if (typeof Request !== 'undefined' && input instanceof Request) {
          requestPromise = nativeFetch.call(this, new Request(rewritten, input));
        } else {
          requestPromise = nativeFetch.call(this, rewritten, init);
        }
        return requestPromise.then(function (res) {
          if (res.ok) markInitializeSuccess(url);
          return res;
        });
      };
    }

    var nativeOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      var rewritten = resolveRequestUrl(url);
      var args = Array.prototype.slice.call(arguments);
      if (rewritten) {
        args[1] = rewritten;
        this.__perxonaInitialize = /conversation\/initialize/i.test(String(url || ''));
      } else {
        this.__perxonaInitialize = false;
      }
      return nativeOpen.apply(this, args);
    };

    var nativeSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      var xhr = this;
      if (xhr.__perxonaInitialize) {
        xhr.addEventListener('load', function () {
          if (xhr.status >= 200 && xhr.status < 300) initializeSucceeded = true;
        });
      }
      return nativeSend.apply(this, arguments);
    };
  }

  function hasAgent() {
    return Boolean(agentProfileId);
  }

  function getAppearanceMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
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

  function hideHelpPanel() {
    var help = document.getElementById('perxonaHelp');
    if (!help) return;
    help.hidden = true;
    help.innerHTML = '';
  }

  function renderHelpPanel(reason, extraHtml) {
    var help = document.getElementById('perxonaHelp');
    if (!help) return;
    help.hidden = false;
    help.innerHTML =
      '<strong>' + reason + '</strong>' +
      (extraHtml || '') +
      '<p>也可改從 Live 頁開啟 3D 小boson。</p>' +
      '<a class="perxona-live-link" href="' + liveUrl + '" target="_blank" rel="noopener noreferrer">Live 3D 頁</a>';
  }

  function mountLiveIframe() {
    var mount = document.getElementById('perxonaMount');
    if (!mount || liveFallbackMounted) return;
    liveFallbackMounted = true;
    var agent = mount.querySelector('sv-agent');
    if (agent) agent.remove();
    setMountStatus('Live 3D 載入中…', false);
    var frame = document.createElement('iframe');
    frame.className = 'perxona-live-frame';
    frame.src = liveUrl;
    frame.title = '3D 小boson';
    frame.allow = 'microphone; camera; autoplay; clipboard-write';
    frame.setAttribute('allowfullscreen', '');
    frame.onload = function () {
      hideHelpPanel();
      setMountStatus('', false);
      markPerxonaReady();
    };
    frame.onerror = function () {
      renderHelpPanel('Live 3D 載入失敗');
    };
    mount.appendChild(frame);
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
    var disconnectTimer = null;
    var loadingStatuses = {
      'downloading-assets': true,
      'connection-start': true,
      'agent-preparation': true
    };
    var LOAD_TIMEOUT_MS = 120000;

    function clearFallbackTimers() {
      window.clearTimeout(failTimer);
      window.clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }

    function scheduleDisconnectFallback(reason) {
      if (ready || disconnectNotified) return;
      window.clearTimeout(disconnectTimer);
      var graceMs = initializeSucceeded ? disconnectGraceMs : Math.min(disconnectGraceMs, 3000);
      disconnectTimer = window.setTimeout(function () {
        if (ready || disconnectNotified) return;
        disconnectNotified = true;
        console.warn('[perxona] ' + reason + '，改開 Live iframe');
        mountLiveIframe();
      }, graceMs);
    }

    var failTimer = window.setTimeout(function () {
      if (ready) return;
      console.warn('[perxona] 3D 載入逾時，改開 Live iframe');
      mountLiveIframe();
    }, LOAD_TIMEOUT_MS);

    agent.addEventListener('life-status', function (event) {
      var status = event.detail && event.detail.status;
      if (loadingStatuses[status]) {
        window.clearTimeout(disconnectTimer);
        disconnectTimer = null;
        setMountStatus('3D 小boson 載入中…', false);
        return;
      }
      if (status === 'ready' || status === 'connection-done') {
        ready = true;
        disconnectNotified = false;
        clearFallbackTimers();
        setMountStatus('', false);
        markPerxonaReady();
        return;
      }
      if (status === 'disconnected') {
        scheduleDisconnectFallback('life-status disconnected');
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

    var liveFrame = mount.querySelector('.perxona-live-frame');
    if (liveFrame) {
      liveFrame.remove();
      liveFallbackMounted = false;
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

    installPerxonaApiProxy(apiBase);
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

    if (preferLiveIframe) {
      mountLiveIframe();
      return;
    }

    ensureWidgetReady().catch(function (err) {
      console.error('[perxona] ensureWidgetReady failed', err);
      mountLiveIframe();
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

    installPerxonaApiProxy(apiBase);
    if (preferLiveIframe) return;
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
