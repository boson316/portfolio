(function () {
  'use strict';
  var container = document.getElementById('heroCanvas');
  if (!container) return;

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var particles = [];
  var mouse = { x: null, y: null };
  var animationId;

  function resize() {
    var parent = container.parentElement;
    var rect = parent ? parent.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    canvas.width = rect.width;
    canvas.height = rect.height;
    if (particles.length === 0) initParticles();
  }

  function initParticles() {
    particles = [];
    var count = Math.min(40, Math.floor((canvas.width * canvas.height) / 18000));
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 1.5 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4
      });
    }
  }

  function draw() {
    if (!ctx || !canvas.width) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var color = isDark ? 'rgba(224, 125, 60, 0.35)' : 'rgba(196, 92, 38, 0.25)';

    particles.forEach(function (p) {
      p.x += p.vx;
      p.y += p.vy;
      if (mouse.x != null && mouse.y != null) {
        var dx = mouse.x - p.x, dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          p.vx += dx * 0.0002;
          p.vy += dy * 0.0002;
        }
      }
      p.vx *= 0.99;
      p.vy *= 0.99;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      p.x = Math.max(0, Math.min(canvas.width, p.x));
      p.y = Math.max(0, Math.min(canvas.height, p.y));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    animationId = requestAnimationFrame(draw);
  }

  container.addEventListener('mouseenter', function (e) {
    mouse.x = e.clientX - container.getBoundingClientRect().left;
    mouse.y = e.clientY - container.getBoundingClientRect().top;
  });
  container.addEventListener('mousemove', function (e) {
    var rect = container.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  container.addEventListener('mouseleave', function () {
    mouse.x = null;
    mouse.y = null;
  });

  window.addEventListener('resize', resize);
  resize();
  draw();

  var heroChatBtn = document.getElementById('heroChatBtn');
  if (heroChatBtn) {
    heroChatBtn.addEventListener('click', function () {
      var openChat = window.openChat;
      if (typeof openChat === 'function') openChat();
    });
  }
})();
