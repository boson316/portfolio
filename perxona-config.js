/**
 * Perxona 公開設定（可 commit）。apiKey 僅放 Render PERXONA_API_KEY，勿寫進此檔
 */
window.PERXONA_CONFIG = {
  sdkUrl: 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js',
  agentProfileId: '01KZTWWPD7VZY0R9G2JYF0C7X9',
  presentationMode: 'embedded',
  liveUrl: 'https://live.perxona.ai/asia/boson316/littleboson'
};

var PRODUCTION_API_URL = 'https://perxona.onrender.com';

(function () {
  var host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    window.PORTFOLIO_API_URL = 'http://127.0.0.1:5000';
  } else {
    window.PORTFOLIO_API_URL = PRODUCTION_API_URL;
  }
})();
