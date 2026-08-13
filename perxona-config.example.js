/**
 * Perxona 公開設定（可 commit）。apiKey 僅放 api/.env
 */
window.PERXONA_CONFIG = {
  sdkUrl: 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js',
  agentProfileId: 'YOUR_AGENT_PROFILE_ID',
  presentationMode: 'embedded',
  liveUrl: 'https://live.perxona.ai/asia/boson316/littleboson'
};

// Render 部署後填入 service 根網址（不含尾端 /）
var PRODUCTION_API_URL = 'https://perxona.onrender.com';

(function () {
  var host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    window.PORTFOLIO_API_URL = 'http://127.0.0.1:5000';
  } else {
    window.PORTFOLIO_API_URL = PRODUCTION_API_URL;
  }
})();
