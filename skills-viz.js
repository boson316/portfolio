/*
 * skills-viz.js — 技能區的互動視覺化（純 Canvas，不需要 Three.js）
 *
 * 四種模式：
 *   graph  技能 × 專案關係圖（可拖曳節點、點技能篩選下方專案）
 *   cuda   CUDA 執行網格（不同技能跑不同的 kernel 圖案）
 *   sphere 3D 標籤球（跟著滑鼠轉、點標籤篩選）
 *   nn     神經網路流動（技能 → 隱藏層 → 專案）
 *
 * 與頁面的連動：
 *   - 右側技能清單 hover／focus → 高亮對應技能
 *   - 點技能節點／標籤 → 下方專案卡片篩選（#projectFilter 顯示篩選狀態）
 *   - 點專案節點 → 捲動到該專案卡片
 */
(function () {
  'use strict';

  var canvas = document.getElementById('skillsViz');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var wrap = canvas.parentElement;
  var isEn = (document.documentElement.getAttribute('lang') || '').toLowerCase().indexOf('en') === 0;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Data ---------------- */
  var SKILLS = [
    { id: 'ai', label: isEn ? 'AI / LLM' : 'AI / LLM', color: '#6366f1', kernel: 'attention_softmax' },
    { id: 'gpu', label: 'GPU / CUDA', color: '#76b900', kernel: 'gemm_tiled' },
    { id: 'web', label: isEn ? 'Frontend' : '前端', color: '#0ea5e9', kernel: 'rasterize' },
    { id: 'python', label: 'Python', color: '#10b981', kernel: 'task_parallel' },
    { id: 'data', label: isEn ? 'Data' : '資料處理', color: '#f59e0b', kernel: 'tree_reduce' },
    { id: 'tools', label: isEn ? 'Tools' : '工具', color: '#c45c26', kernel: 'ripple_stencil' }
  ];
  var PROJECTS = [
    { id: 'gpu-lab', label: 'GPU Lab' },
    { id: 'calc', label: isEn ? 'Calculator' : '計算機' },
    { id: 'news', label: isEn ? 'News' : '新聞蒐集' },
    { id: 'food', label: isEn ? 'Food Map' : '美食地圖' },
    { id: 'ml', label: 'ML Demo' },
    { id: 'rag', label: isEn ? 'RAG Chat' : 'RAG 聊天' }
  ];
  // 技能實際用在哪些專案（依各專案卡片的技術堆疊）
  var USES = {
    ai: ['rag', 'ml'],
    gpu: ['gpu-lab', 'ml'],
    web: ['calc', 'news', 'food', 'ml'],
    python: ['gpu-lab', 'news', 'food', 'rag', 'ml'],
    data: ['news', 'food', 'ml'],
    tools: ['calc', 'ml', 'gpu-lab']
  };
  var TAGS = {
    ai: ['Gemini', 'Groq', 'Chroma', 'RAG', 'LLM', 'Perxona'],
    gpu: ['CUDA', 'WMMA', 'Triton', 'FlashAttention', 'Nsight', 'cuBLAS', 'Tensor Core'],
    web: ['HTML', 'CSS', 'JavaScript', 'PWA', 'RWD', 'a11y'],
    python: ['Python', 'Flask', 'Streamlit', 'pytest', 'PyTorch'],
    data: ['RSS', 'Scraping', 'GitHub Actions', 'Places API'],
    tools: ['Chart.js', 'SVG', 'Canvas']
  };
  var skillById = {};
  SKILLS.forEach(function (s) { skillById[s.id] = s; });
  var projectSkills = {};
  PROJECTS.forEach(function (p) { projectSkills[p.id] = []; });
  Object.keys(USES).forEach(function (s) { USES[s].forEach(function (p) { projectSkills[p].push(s); }); });

  var CAPTIONS = isEn ? {
    graph: 'Hover a node to see links · click a skill to filter projects below · drag to rearrange',
    cuda: 'Lit cells = threads doing work · hover a skill on the right, or click to switch kernels',
    sphere: 'Move your pointer to spin · click a tag to filter projects',
    nn: 'Signals flow from skills through a hidden layer into the projects that use them'
  } : {
    graph: '移到節點上看關聯 · 點技能篩選下方專案 · 可以拖曳節點',
    cuda: '亮起的格子＝正在計算的 thread · 移到右邊技能上，或點畫面換一種 kernel',
    sphere: '移動滑鼠轉動球體 · 點標籤篩選下方專案',
    nn: '訊號從技能經過隱藏層，流向用到它的專案'
  };

  /* ---------------- State ---------------- */
  var mode = 'graph';
  try { mode = localStorage.getItem('skills-viz-mode') || 'graph'; } catch (e) { /* ignore */ }
  if (!/^(graph|cuda|sphere|nn)$/.test(mode)) mode = 'graph';
  var W = 0, H = 0, dpr = 1;
  var hoverSkill = null;      // 來自右側清單
  var hoverTarget = null;     // 畫布上滑鼠指到的東西 {kind, id}
  var selected = null;        // 已篩選的技能
  var pointer = { x: -1, y: -1, inside: false, down: false, moved: 0, sx: 0, sy: 0 };
  var dragNode = null;
  var visible = true, running = false, t0 = performance.now(), lastT = t0;
  var cudaSkill = 'gpu';
  var colors = {};
  var fontFamily = '';

  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, d) { return (cs.getPropertyValue(n) || '').trim() || d; }
    colors = {
      text: v('--text', '#1f1b16'), muted: v('--text-muted', '#6a6158'), faint: v('--text-faint', '#978d82'),
      card: v('--bg-card', '#fffdf9'), bg: v('--bg', '#f6f1ea'), border: v('--border-strong', 'rgba(70,45,20,.2)'),
      accent: v('--accent', '#c45c26')
    };
    fontFamily = getComputedStyle(document.body).fontFamily || 'sans-serif';
  }

  function activeSkill() {
    if (hoverTarget && hoverTarget.kind === 'skill') return hoverTarget.id;
    if (hoverTarget && hoverTarget.kind === 'tag') return hoverTarget.skill;
    return hoverSkill || selected;
  }
  function activeProject() { return hoverTarget && hoverTarget.kind === 'project' ? hoverTarget.id : null; }
  function isLinked(skillId, projectId) { return USES[skillId] && USES[skillId].indexOf(projectId) >= 0; }

  function alpha(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function font(size, weight) { return (weight || 500) + ' ' + size + 'px ' + fontFamily; }
  function mono(size) { return '500 ' + size + 'px "JetBrains Mono", ui-monospace, monospace'; }

  /* ---------------- Sizing ---------------- */
  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(260, rect.width); H = Math.max(240, rect.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutGraph(false);
    layoutNN();
    requestFrame();
  }

  /* ================= Mode 1: relationship graph ================= */
  var gNodes = [], gEdges = [];
  function buildGraph() {
    gNodes = []; gEdges = [];
    SKILLS.forEach(function (s, i) { gNodes.push({ kind: 'skill', id: s.id, label: s.label, color: s.color, i: i, x: 0, y: 0, vx: 0, vy: 0, phase: i * 1.7 }); });
    PROJECTS.forEach(function (p, i) { gNodes.push({ kind: 'project', id: p.id, label: p.label, i: i, x: 0, y: 0, vx: 0, vy: 0, phase: i * 2.3 + 1 }); });
    Object.keys(USES).forEach(function (s) {
      USES[s].forEach(function (p) { gEdges.push({ a: nodeOf('skill', s), b: nodeOf('project', p), skill: s, k: gEdges.length }); });
    });
  }
  function nodeOf(kind, id) { for (var i = 0; i < gNodes.length; i++) if (gNodes[i].kind === kind && gNodes[i].id === id) return gNodes[i]; return null; }
  function layoutGraph(force) {
    if (!gNodes.length) buildGraph();
    var cx = W / 2, cy = H / 2 + 8;
    gNodes.forEach(function (n) {
      if (!force && n.placed) { n.x = Math.min(Math.max(n.x, 30), W - 30); n.y = Math.min(Math.max(n.y, 50), H - 24); return; }
      var isS = n.kind === 'skill';
      var count = isS ? SKILLS.length : PROJECTS.length;
      var ang = (n.i / count) * Math.PI * 2 + (isS ? -Math.PI / 2 : -Math.PI / 2 + 0.45);
      var r = isS ? Math.min(W, H) * 0.17 : Math.min(W * 0.4, H * 0.36);
      n.x = cx + Math.cos(ang) * r * (W > H ? 1.15 : 1); n.y = cy + Math.sin(ang) * r; n.vx = n.vy = 0; n.placed = true;
    });
  }
  function nodeSize(n) {
    if (n.kind === 'skill') return { r: W < 420 ? 15 : 18 };
    ctx.font = font(W < 420 ? 11 : 12, 600);
    var w = ctx.measureText(n.label).width + 20;
    return { w: w, h: W < 420 ? 22 : 26 };
  }
  function stepGraph(dt, time) {
    var cx = W / 2, cy = H / 2 + 10;
    var L = Math.min(W, H) * 0.3;
    var i, j, a, b, dx, dy, d2, d, f;
    for (i = 0; i < gNodes.length; i++) {
      a = gNodes[i];
      for (j = i + 1; j < gNodes.length; j++) {
        b = gNodes[j]; dx = b.x - a.x; dy = b.y - a.y; d2 = dx * dx + dy * dy + 0.01; d = Math.sqrt(d2);
        f = 2600 / d2; if (d < 70) f += (70 - d) * 0.6;
        a.vx -= f * dx / d; a.vy -= f * dy / d; b.vx += f * dx / d; b.vy += f * dy / d;
      }
    }
    gEdges.forEach(function (e) {
      dx = e.b.x - e.a.x; dy = e.b.y - e.a.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
      f = (d - L) * 0.012;
      e.a.vx += f * dx / d; e.a.vy += f * dy / d; e.b.vx -= f * dx / d; e.b.vy -= f * dy / d;
    });
    gNodes.forEach(function (n) {
      n.vx += (cx - n.x) * 0.004 + (reduceMotion ? 0 : Math.sin(time * 0.0007 + n.phase) * 0.05);
      n.vy += (cy - n.y) * 0.006 + (reduceMotion ? 0 : Math.cos(time * 0.0009 + n.phase) * 0.05);
      if (n === dragNode) { n.x = pointer.x; n.y = pointer.y; n.vx = n.vy = 0; return; }
      n.vx *= 0.82; n.vy *= 0.82;
      n.x += n.vx * dt; n.y += n.vy * dt;
      var s = nodeSize(n), hw, top, bot;
      if (n.kind === 'skill') {
        ctx.font = font(W < 420 ? 11 : 12, 700);
        hw = Math.max(s.r, ctx.measureText(n.label).width / 2 + 2);
        top = s.r; bot = s.r + 22; // 名稱畫在圓點下方
      } else { hw = s.w / 2; top = bot = s.h / 2; }
      n.x = Math.min(Math.max(n.x, hw + 6), W - hw - 6);
      n.y = Math.min(Math.max(n.y, top + 48), H - bot - 24);
    });
  }
  function drawGraph(time) {
    var act = activeSkill(), actP = activeProject();
    gEdges.forEach(function (e) {
      var on = (act && e.skill === act) || (actP && e.b.id === actP);
      var dim = (act || actP) && !on;
      ctx.strokeStyle = on ? alpha(skillById[e.skill].color, 0.85) : alpha(skillById[e.skill].color, dim ? 0.08 : 0.28);
      ctx.lineWidth = on ? 2.2 : 1.2;
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      if (on && !reduceMotion) {
        var p = ((time * 0.0006) + e.k * 0.17) % 1;
        ctx.fillStyle = skillById[e.skill].color;
        ctx.beginPath(); ctx.arc(e.a.x + (e.b.x - e.a.x) * p, e.a.y + (e.b.y - e.a.y) * p, 3, 0, Math.PI * 2); ctx.fill();
      }
    });
    gNodes.forEach(function (n) {
      var s = nodeSize(n);
      if (n.kind === 'skill') {
        var on = act === n.id || (actP && isLinked(n.id, actP));
        var dim = (act || actP) && !on;
        ctx.save();
        if (on) { ctx.shadowColor = n.color; ctx.shadowBlur = 18; }
        ctx.fillStyle = alpha(n.color, dim ? 0.3 : 1);
        ctx.beginPath(); ctx.arc(n.x, n.y, s.r + (on ? 3 : 0), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (selected === n.id) { ctx.strokeStyle = n.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(n.x, n.y, s.r + 7, 0, Math.PI * 2); ctx.stroke(); }
        ctx.font = font(W < 420 ? 11 : 12, 700);
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = dim ? colors.faint : colors.text;
        ctx.fillText(n.label, n.x, n.y + s.r + 6);
      } else {
        var linked = (act && isLinked(act, n.id)) || actP === n.id;
        var dimP = (act || actP) && !linked;
        var x = n.x - s.w / 2, y = n.y - s.h / 2;
        ctx.globalAlpha = dimP ? 0.35 : 1;
        ctx.fillStyle = colors.card;
        ctx.strokeStyle = linked ? (act ? skillById[act].color : colors.accent) : colors.border;
        ctx.lineWidth = linked ? 2 : 1;
        roundRect(x, y, s.w, s.h, s.h / 2); ctx.fill(); ctx.stroke();
        ctx.font = font(W < 420 ? 11 : 12, 600);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = colors.text;
        ctx.fillText(n.label, n.x, n.y + 0.5);
        ctx.globalAlpha = 1;
      }
    });
  }
  function hitGraph(x, y) {
    for (var i = gNodes.length - 1; i >= 0; i--) {
      var n = gNodes[i], s = nodeSize(n);
      if (n.kind === 'skill') { if (Math.hypot(x - n.x, y - n.y) <= s.r + 6) return n; }
      else if (Math.abs(x - n.x) <= s.w / 2 + 2 && Math.abs(y - n.y) <= s.h / 2 + 2) return n;
    }
    return null;
  }

  /* ================= Mode 2: CUDA grid ================= */
  function drawCuda(time) {
    var sk = activeSkill() || cudaSkill;
    var skill = skillById[sk];
    var bx = W < 420 ? 6 : 8, by = 4, tpb = 4;
    var top = 92, bottom = 30, side = 16;
    var cols = bx * tpb, rows = by * tpb;
    var gap = 6;
    var cell = Math.min((W - side * 2 - gap * (bx - 1)) / cols, (H - top - bottom - gap * (by - 1)) / rows);
    var gridW = cell * cols + gap * (bx - 1), gridH = cell * rows + gap * (by - 1);
    var ox = (W - gridW) / 2, oy = top + (H - top - bottom - gridH) / 2;
    var t = reduceMotion ? 1.2 : time / 1000;

    ctx.font = mono(W < 420 ? 10.5 : 12);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = colors.muted;
    var head = 'kernel<<<dim3(' + bx + ',' + by + '), dim3(' + tpb + ',' + tpb + ')>>>';
    ctx.fillText(head, side, 66);
    ctx.fillStyle = skill.color;
    ctx.fillText(skill.kernel + '()  // ' + skill.label, side, 83);

    for (var gy = 0; gy < rows; gy++) {
      for (var gx = 0; gx < cols; gx++) {
        var b_x = Math.floor(gx / tpb), b_y = Math.floor(gy / tpb);
        var v = cudaIntensity(sk, gx, gy, b_x, b_y, cols, rows, t);
        var x = ox + gx * cell + b_x * gap, y = oy + gy * cell + b_y * gap;
        ctx.fillStyle = alpha(skill.color, 0.08 + v * 0.85);
        roundRect(x + 1, y + 1, cell - 2, cell - 2, Math.min(3, cell / 4)); ctx.fill();
      }
    }
    // block outlines
    ctx.strokeStyle = colors.border; ctx.lineWidth = 1;
    for (var j = 0; j < by; j++) for (var i = 0; i < bx; i++) {
      roundRect(ox + i * (cell * tpb + gap) - 2, oy + j * (cell * tpb + gap) - 2, cell * tpb + 4, cell * tpb + 4, 5); ctx.stroke();
    }
  }
  function pulse(x) { var c = 0.5 + 0.5 * Math.cos(x); return c * c * c * c; }
  function hash(a, b) { var s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }
  function cudaIntensity(sk, gx, gy, bx, by, cols, rows, t) {
    switch (sk) {
      case 'gpu': // 2D tiles marching along the diagonal, like a tiled GEMM
        return pulse((bx + by) * 0.9 - t * 2.4) * (0.75 + 0.25 * pulse((gx + gy) * 0.8 - t * 6));
      case 'ai': { // attention: one query row at a time, softmax-weighted keys
        var row = Math.floor(t * 5) % rows;
        var w = Math.exp(-Math.pow((gx - cols * hash(row, 3)) / (cols * 0.18), 2));
        return gy === row ? 0.35 + 0.65 * w : (gy < row ? 0.12 * w : 0);
      }
      case 'web': { // raster scan
        var idx = gy * cols + gx, headI = (t * 55) % (cols * rows);
        var dist = headI - idx; if (dist < 0) dist += cols * rows;
        return dist < cols * 2 ? 1 - dist / (cols * 2) : 0;
      }
      case 'python': // independent tasks finishing at their own pace
        return Math.max(0, Math.sin(t * (1.5 + hash(gx, gy) * 2.5) + hash(gy, gx) * 6.28));
      case 'data': { // tree reduction: active columns halve each step
        var steps = Math.log(cols) / Math.LN2;
        var step = Math.floor(t * 1.6) % (steps + 1);
        var stride = Math.pow(2, step);
        return gx % stride === 0 ? (step === steps ? 1 : 0.85) : 0.04;
      }
      default: { // ripple stencil from the centre
        var d = Math.hypot(gx - cols / 2 + 0.5, (gy - rows / 2 + 0.5) * 1.2);
        return pulse(d * 0.55 - t * 3.2);
      }
    }
  }

  /* ================= Mode 3: tag sphere ================= */
  var tags = [];
  (function buildTags() {
    var list = [];
    Object.keys(TAGS).forEach(function (s) { TAGS[s].forEach(function (name) { list.push({ name: name, skill: s }); }); });
    var n = list.length, gold = Math.PI * (3 - Math.sqrt(5));
    list.forEach(function (tg, i) {
      var y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = gold * i;
      tg.x = Math.cos(th) * r; tg.y = y; tg.z = Math.sin(th) * r;
    });
    // shuffle positions so colours mix nicely
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(hash(i, 7) * (i + 1)), a = list[i], b = list[j];
      var tx = a.x, ty = a.y, tz = a.z; a.x = b.x; a.y = b.y; a.z = b.z; b.x = tx; b.y = ty; b.z = tz;
    }
    tags = list;
  })();
  var rotX = 0.3, rotY = 0, velX = 0, velY = 0.0035;
  function drawSphere(dt) {
    if (pointer.inside && !reduceMotion) {
      velY += ((pointer.x - W / 2) / W) * 0.0009; velX += ((pointer.y - H / 2) / H) * 0.0009;
    }
    velX *= 0.95; velY = velY * 0.95 + (reduceMotion ? 0 : 0.0035) * 0.05;
    rotX += velX * dt; rotY += velY * dt;
    var R = Math.min(W, H - 40) * 0.4, cx = W / 2, cy = H / 2 + 14;
    var cX = Math.cos(rotX), sX = Math.sin(rotX), cY = Math.cos(rotY), sY = Math.sin(rotY);
    var act = activeSkill();
    var proj = tags.map(function (tg) {
      var x = tg.x * cY - tg.z * sY, z = tg.x * sY + tg.z * cY, y = tg.y * cX - z * sX; z = tg.y * sX + z * cX;
      var scale = 1.6 / (2.4 - z);
      return { tg: tg, sx: cx + x * R * scale, sy: cy + y * R * scale, z: z, scale: scale };
    }).sort(function (a, b) { return a.z - b.z; });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    proj.forEach(function (p) {
      var on = act === p.tg.skill;
      var depth = (p.z + 1) / 2;
      var size = (W < 420 ? 10 : 11.5) + depth * 7;
      ctx.font = font(size, on ? 700 : 600);
      ctx.globalAlpha = act && !on ? 0.12 + depth * 0.2 : 0.25 + depth * 0.75;
      ctx.fillStyle = on || depth > 0.55 ? skillById[p.tg.skill].color : colors.muted;
      if (hoverTarget && hoverTarget.kind === 'tag' && hoverTarget.name === p.tg.name) {
        var w = ctx.measureText(p.tg.name).width + 14;
        ctx.globalAlpha = 1; ctx.fillStyle = alpha(skillById[p.tg.skill].color, 0.15);
        roundRect(p.sx - w / 2, p.sy - size * 0.75, w, size * 1.5, 7); ctx.fill();
        ctx.fillStyle = skillById[p.tg.skill].color;
      }
      ctx.fillText(p.tg.name, p.sx, p.sy);
      p.w = ctx.measureText(p.tg.name).width; p.h = size;
    });
    ctx.globalAlpha = 1;
    lastSphere = proj;
  }
  var lastSphere = [];
  function hitSphere(x, y) {
    for (var i = lastSphere.length - 1; i >= 0; i--) {
      var p = lastSphere[i];
      if (p.z > -0.2 && Math.abs(x - p.sx) <= p.w / 2 + 4 && Math.abs(y - p.sy) <= p.h / 2 + 3) return p.tg;
    }
    return null;
  }

  /* ================= Mode 4: neural network ================= */
  var nn = { skills: [], hidden: [], projects: [] }, particles = [], spawnAcc = 0;
  function layoutNN() {
    var top = 70, bottom = 26;
    var narrow = W < 460;
    var xS = W * (narrow ? 0.27 : 0.24), xH = W * 0.5, xP = W * (narrow ? 0.7 : 0.72);
    function col(n, x, i) { var h = H - top - bottom; return { x: x, y: top + h * (i + 0.5) / n }; }
    nn.skills = SKILLS.map(function (s, i) { var p = col(SKILLS.length, xS, i); p.id = s.id; return p; });
    nn.hidden = [0, 1, 2, 3, 4].map(function (i) { return col(5, xH, i); });
    nn.projects = PROJECTS.map(function (pr, i) { var p = col(PROJECTS.length, xP, i); p.id = pr.id; p.label = pr.label; return p; });
  }
  function drawNN(dt) {
    var act = activeSkill(), actP = activeProject();
    var i, j;
    ctx.lineWidth = 1;
    for (i = 0; i < nn.skills.length; i++) for (j = 0; j < nn.hidden.length; j++) {
      var on = act === nn.skills[i].id || (actP && isLinked(nn.skills[i].id, actP));
      ctx.strokeStyle = on ? alpha(SKILLS[i].color, 0.45) : alpha(colors.faint.charAt(0) === '#' ? colors.faint : '#978d82', (act || actP) ? 0.08 : 0.18);
      line(nn.skills[i], nn.hidden[j]);
    }
    for (i = 0; i < nn.hidden.length; i++) for (j = 0; j < nn.projects.length; j++) {
      var pid = nn.projects[j].id;
      var onP = (act && isLinked(act, pid)) || actP === pid;
      ctx.strokeStyle = onP ? alpha(act ? skillById[act].color : '#c45c26', 0.4) : alpha('#978d82', (act || actP) ? 0.07 : 0.16);
      line(nn.hidden[i], nn.projects[j]);
    }
    // particles
    if (!reduceMotion) {
      spawnAcc += dt;
      while (spawnAcc > 7 && particles.length < 46) {
        spawnAcc -= 7;
        var sId = act || (actP ? projectSkills[actP][Math.floor(Math.random() * projectSkills[actP].length)] : SKILLS[Math.floor(Math.random() * SKILLS.length)].id);
        var targets = actP ? [actP] : USES[sId];
        var si = SKILLS.indexOf(skillById[sId]);
        var target = targets[Math.floor(Math.random() * targets.length)];
        var pj = PROJECTS.findIndex(function (p) { return p.id === target; });
        if (si < 0 || pj < 0) continue;
        particles.push({ s: si, h: Math.floor(Math.random() * 5), p: pj, t: 0, speed: 0.012 + Math.random() * 0.008 });
      }
      particles = particles.filter(function (pt) {
        pt.t += pt.speed * dt;
        if (pt.t >= 2) return false;
        var a = pt.t < 1 ? nn.skills[pt.s] : nn.hidden[pt.h];
        var b = pt.t < 1 ? nn.hidden[pt.h] : nn.projects[pt.p];
        var k = pt.t < 1 ? pt.t : pt.t - 1;
        ctx.fillStyle = SKILLS[pt.s].color;
        ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 2.6, 0, Math.PI * 2); ctx.fill();
        return true;
      });
    }
    // nodes
    var small = W < 460;
    nn.skills.forEach(function (n, k) {
      var s = SKILLS[k], on = act === s.id || (actP && isLinked(s.id, actP)), dim = (act || actP) && !on;
      ctx.save(); if (on) { ctx.shadowColor = s.color; ctx.shadowBlur = 14; }
      ctx.fillStyle = alpha(s.color, dim ? 0.3 : 1); ctx.beginPath(); ctx.arc(n.x, n.y, small ? 7 : 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.font = font(small ? 10.5 : 12, 600); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = dim ? colors.faint : colors.text; ctx.fillText(s.label, n.x - (small ? 12 : 16), n.y);
    });
    nn.hidden.forEach(function (n) {
      ctx.fillStyle = colors.card; ctx.strokeStyle = colors.border; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(n.x, n.y, small ? 6 : 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    nn.projects.forEach(function (n) {
      var on = (act && isLinked(act, n.id)) || actP === n.id, dim = (act || actP) && !on;
      ctx.fillStyle = colors.card; ctx.strokeStyle = on ? (act ? skillById[act].color : colors.accent) : colors.border; ctx.lineWidth = on ? 2.5 : 1.5;
      ctx.beginPath(); ctx.arc(n.x, n.y, small ? 7 : 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = font(small ? 10.5 : 12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = dim ? colors.faint : colors.text; ctx.fillText(n.label, n.x + (small ? 12 : 16), n.y);
    });
    ctx.font = mono(10.5); ctx.fillStyle = colors.faint; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var L = isEn ? ['skills', 'hidden', 'projects'] : ['技能', '隱藏層', '專案'];
    ctx.fillText(L[0], nn.skills[0].x, 60); ctx.fillText(L[1], nn.hidden[0].x, 60); ctx.fillText(L[2], nn.projects[0].x, 60);
  }
  function line(a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  function hitNN(x, y) {
    var i;
    for (i = 0; i < nn.skills.length; i++) if (Math.hypot(x - nn.skills[i].x, y - nn.skills[i].y) < 14 || (x < nn.skills[i].x && x > nn.skills[i].x - 90 && Math.abs(y - nn.skills[i].y) < 10)) return { kind: 'skill', id: nn.skills[i].id };
    for (i = 0; i < nn.projects.length; i++) if (Math.hypot(x - nn.projects[i].x, y - nn.projects[i].y) < 14 || (x > nn.projects[i].x && x < nn.projects[i].x + 100 && Math.abs(y - nn.projects[i].y) < 10)) return { kind: 'project', id: nn.projects[i].id };
    return null;
  }

  /* ---------------- Shared drawing ---------------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function frame(now) {
    running = false;
    if (!visible || document.hidden) return;
    var dt = Math.min(3, (now - lastT) / 16.67); lastT = now;
    var time = now - t0;
    ctx.clearRect(0, 0, W, H);
    if (mode === 'graph') { stepGraph(dt, time); drawGraph(time); }
    else if (mode === 'cuda') drawCuda(time);
    else if (mode === 'sphere') drawSphere(dt);
    else drawNN(dt);
    requestFrame();
  }
  function requestFrame() {
    if (running || !visible) return;
    running = true;
    requestAnimationFrame(frame);
  }

  /* ---------------- Interaction ---------------- */
  function localPoint(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function hitTest(x, y) {
    if (mode === 'graph') { var n = hitGraph(x, y); return n ? { kind: n.kind, id: n.id, node: n } : null; }
    if (mode === 'sphere') { var tg = hitSphere(x, y); return tg ? { kind: 'tag', name: tg.name, skill: tg.skill } : null; }
    if (mode === 'nn') return hitNN(x, y);
    return null;
  }
  canvas.addEventListener('pointermove', function (ev) {
    var p = localPoint(ev);
    if (pointer.down) pointer.moved += Math.abs(p.x - pointer.x) + Math.abs(p.y - pointer.y);
    pointer.x = p.x; pointer.y = p.y; pointer.inside = true;
    if (!dragNode) hoverTarget = hitTest(p.x, p.y);
    canvas.style.cursor = dragNode ? 'grabbing' : (hoverTarget ? 'pointer' : (mode === 'cuda' ? 'pointer' : 'default'));
    syncListHighlight();
  });
  canvas.addEventListener('pointerleave', function () {
    pointer.inside = false; hoverTarget = null; if (!pointer.down) dragNode = null; syncListHighlight();
  });
  canvas.addEventListener('pointerdown', function (ev) {
    var p = localPoint(ev);
    pointer.down = true; pointer.moved = 0; pointer.x = p.x; pointer.y = p.y;
    hoverTarget = hitTest(p.x, p.y);
    if (mode === 'graph' && hoverTarget && hoverTarget.node) { dragNode = hoverTarget.node; canvas.setPointerCapture(ev.pointerId); }
  });
  canvas.addEventListener('pointerup', function (ev) {
    var wasDrag = pointer.moved > 6;
    pointer.down = false;
    if (dragNode) { try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { /* ignore */ } dragNode = null; }
    if (wasDrag) return;
    var hit = hitTest(pointer.x, pointer.y);
    if (mode === 'cuda') {
      var idx = (SKILLS.findIndex(function (s) { return s.id === cudaSkill; }) + 1) % SKILLS.length;
      cudaSkill = SKILLS[idx].id; return;
    }
    if (!hit) return;
    if (hit.kind === 'skill') selectSkill(selected === hit.id ? null : hit.id);
    else if (hit.kind === 'tag') selectSkill(selected === hit.skill ? null : hit.skill);
    else if (hit.kind === 'project') scrollToProject(hit.id);
  });

  // 右側技能清單 → 視覺化
  var list = document.getElementById('skillsList');
  if (list) {
    list.querySelectorAll('[data-skill]').forEach(function (li) {
      var id = li.getAttribute('data-skill');
      li.addEventListener('mouseenter', function () { hoverSkill = id; if (mode === 'cuda') cudaSkill = id; });
      li.addEventListener('mouseleave', function () { if (hoverSkill === id) hoverSkill = null; });
      li.addEventListener('focus', function () { hoverSkill = id; if (mode === 'cuda') cudaSkill = id; });
      li.addEventListener('blur', function () { if (hoverSkill === id) hoverSkill = null; });
    });
  }
  function syncListHighlight() {
    if (!list) return;
    var act = activeSkill();
    var actP = activeProject();
    list.querySelectorAll('[data-skill]').forEach(function (li) {
      var id = li.getAttribute('data-skill');
      li.classList.toggle('is-active', id === act || (actP && isLinked(id, actP)) || id === selected);
    });
  }

  /* ---------------- Project filter ---------------- */
  var filterBar = document.getElementById('projectFilter');
  var filterName = document.getElementById('projectFilterName');
  var filterCount = document.getElementById('projectFilterCount');
  var filterClear = document.getElementById('projectFilterClear');
  var filterHint = document.getElementById('vizHint');
  function selectSkill(id) {
    selected = id;
    if (id && mode === 'cuda') cudaSkill = id;
    var cards = document.querySelectorAll('#projectCards [data-project]');
    var count = 0;
    cards.forEach(function (card) {
      var match = !id || isLinked(id, card.getAttribute('data-project'));
      if (id && match) count++;
      card.classList.toggle('is-dim', !!id && !match);
      card.classList.toggle('is-match', !!id && match);
    });
    var more = document.querySelector('#projectCards .card-more');
    if (more) more.classList.toggle('is-dim', !!id);
    if (filterBar) {
      filterBar.hidden = !id;
      if (id) {
        filterName.textContent = skillById[id].label;
        filterName.style.setProperty('--chip', skillById[id].color);
        filterCount.textContent = isEn ? count + ' project' + (count === 1 ? '' : 's') : count + ' 個專案';
      }
    }
    if (filterHint) {
      filterHint.hidden = !id;
      if (id) filterHint.querySelector('span').textContent = isEn
        ? skillById[id].label + ' is used in ' + count + ' projects'
        : skillById[id].label + ' 用在 ' + count + ' 個專案';
    }
    syncListHighlight();
  }
  if (filterClear) filterClear.addEventListener('click', function () { selectSkill(null); });
  function scrollToProject(id) {
    var card = document.querySelector('#projectCards [data-project="' + id + '"]');
    if (!card) return;
    card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    card.classList.remove('is-flash'); void card.offsetWidth; card.classList.add('is-flash');
  }

  /* ---------------- Mode tabs ---------------- */
  var tabs = document.querySelectorAll('[data-viz]');
  var caption = document.getElementById('vizCaption');
  function setMode(m) {
    mode = m;
    try { localStorage.setItem('skills-viz-mode', m); } catch (e) { /* ignore */ }
    tabs.forEach(function (b) {
      var on = b.getAttribute('data-viz') === m;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (caption) caption.textContent = CAPTIONS[m];
    canvas.setAttribute('aria-label', (isEn ? 'Skills visualization: ' : '技能視覺化：') + CAPTIONS[m]);
    hoverTarget = null; particles = [];
    if (m === 'graph') layoutGraph(false);
    requestFrame();
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-viz')); }); });

  /* ---------------- Lifecycle ---------------- */
  readTheme();
  new MutationObserver(function () { readTheme(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap); else window.addEventListener('resize', resize);
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) { lastT = performance.now(); requestFrame(); }
    }, { rootMargin: '80px' }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { lastT = performance.now(); requestFrame(); } });
  buildGraph();
  resize();
  setMode(mode);
  layoutGraph(true);

  window.__skillsViz = { setMode: setMode, selectSkill: selectSkill, nodes: function () { return gNodes; } };
})();
