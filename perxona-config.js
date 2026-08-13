/**
 * Perxona 公開設定（可 commit）。apiKey 僅放 api/.env / Render env
 */
window.PERXONA_CONFIG = {
  sdkUrl: 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/index.js',
  agentProfileId: '01KZTWWPD7VZY0R9G2JYF0C7X9',
  presentationMode: 'embedded',
  liveUrl: 'https://live.perxona.ai/asia/boson316/littleboson'
};

// Render 部署完成後，把下方網址改成你的 service URL（不含尾端 /）
var PRODUCTION_API_URL = 'https://perxona.onrender.com';

(function () {
  var host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    window.PORTFOLIO_API_URL = 'http://127.0.0.1:5000';
  } else {
    window.PORTFOLIO_API_URL = PRODUCTION_API_URL;
  }
})();
