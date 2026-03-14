/**
 * ML 專區：人工智慧 / 資料科學報告圖表 → Chart.js 互動版
 * 含混淆矩陣、Loss/Acc 曲線、Feature Importance、相關熱圖、PCA 散點
 */
(function () {
  'use strict';
  if (typeof Chart === 'undefined') return;

  var section = document.getElementById('ml-showcase');
  if (!section) return;

  var isDark = function () {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  };
  var gridColor = function () { return isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'; };
  var textColor = function () { return isDark() ? '#9a9a9a' : '#5c5c5c'; };

  var charts = [];

  // ---------- 1. 混淆矩陣（Grouped Bar）----------
  var confusionEl = document.getElementById('mlConfusionChart');
  if (confusionEl) {
    var confusionChart = new Chart(confusionEl, {
      type: 'bar',
      data: {
        labels: ['預測良性', '預測惡性'],
        datasets: [
          {
            label: '實際良性',
            data: [68, 3],
            backgroundColor: [ 'rgba(34, 197, 94, 0.85)', 'rgba(239, 68, 68, 0.85)' ],
            borderColor: [ '#22c55e', '#ef4444' ],
            borderWidth: 1
          },
          {
            label: '實際惡性',
            data: [3, 40],
            backgroundColor: [ 'rgba(239, 68, 68, 0.85)', 'rgba(34, 197, 94, 0.85)' ],
            borderColor: [ '#ef4444', '#22c55e' ],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'top', labels: { color: textColor } },
          tooltip: { callbacks: { afterLabel: function (ctx) { return ctx.raw === 68 || ctx.raw === 40 ? '正確' : '誤判'; } } } }
        },
        scales: {
          x: {
            grid: { color: gridColor() },
            ticks: { color: textColor() }
          },
          y: {
            grid: { color: gridColor() },
            ticks: { color: textColor(), stepSize: 20 }
          }
        }
      }
    });
    charts.push(confusionChart);
  }

  // ---------- 2. Loss & Accuracy 曲線 ----------
  var lossAccEl = document.getElementById('mlLossAccChart');
  if (lossAccEl) {
    var epochs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var lossData = [2.1, 1.4, 0.95, 0.62, 0.48, 0.38, 0.32, 0.28, 0.25, 0.22];
    var accData = [0.72, 0.81, 0.86, 0.89, 0.91, 0.92, 0.93, 0.94, 0.945, 0.947];
    var lossAccChart = new Chart(lossAccEl, {
      type: 'line',
      data: {
        labels: epochs.map(function (e) { return 'Epoch ' + e; }),
        datasets: [
          {
            label: 'Loss',
            data: lossData,
            borderColor: '#ee4c2c',
            backgroundColor: 'rgba(238, 76, 44, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            yAxisID: 'y'
          },
          {
            label: 'Accuracy',
            data: accData,
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { color: textColor } } },
        scales: {
          x: {
            grid: { color: gridColor() },
            ticks: { color: textColor(), maxTicksLimit: 6 }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: gridColor() },
            ticks: { color: textColor() }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            max: 1,
            grid: { drawOnChartArea: false },
            ticks: { color: textColor(), callback: function (v) { return (v * 100).toFixed(0) + '%'; } }
          }
        }
      }
    });
    charts.push(lossAccChart);
  }

  // ---------- 3. Feature Importance（Top 10）----------
  var featureNames = [
    'concave points_worst', 'perimeter_worst', 'radius_worst', 'area_worst',
    'concavity_mean', 'concave points_mean', 'radius_mean', 'perimeter_mean',
    'area_mean', 'compactness_mean'
  ];
  var featureValues = [0.28, 0.26, 0.24, 0.22, 0.18, 0.16, 0.14, 0.12, 0.10, 0.08];
  var featureEl = document.getElementById('mlFeatureChart');
  if (featureEl) {
    var featureChart = new Chart(featureEl, {
      type: 'bar',
      data: {
        labels: featureNames,
        datasets: [{
          label: 'Importance',
          data: featureValues,
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: '#6366f1',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (ctx) { return '重要性: ' + ctx.raw.toFixed(3); } } }
        },
        scales: {
          x: {
            grid: { color: gridColor() },
            ticks: { color: textColor() }
          },
          y: {
            grid: { display: false },
            ticks: { color: textColor(), font: { size: 10 } }
          }
        }
      }
    });
    charts.push(featureChart);
  }

  // ---------- 4. 相關熱圖（Canvas 自繪 5x5）----------
  var heatLabels = [ 'radius_m', 'texture_m', 'perim_m', 'area_m', 'smooth_m' ];
  var heatData = [
    [ 1, 0.32, 0.99, 0.99, 0.17 ],
    [ 0.32, 1, 0.33, 0.32, 0.22 ],
    [ 0.99, 0.33, 1, 0.99, 0.15 ],
    [ 0.99, 0.32, 0.99, 1, 0.18 ],
    [ 0.17, 0.22, 0.15, 0.18, 1 ]
  ];
  var heatmapEl = document.getElementById('mlHeatmapChart');
  if (heatmapEl) drawHeatmap(heatmapEl, heatData, heatLabels);

  function drawHeatmap(canvas, data, labels) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var pad = 28;
    var n = data.length;
    var cellW = (w - pad * 2) / n;
    var cellH = (h - pad * 2) / n;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        var v = data[i][j];
        var t = (v + 1) / 2;
        var r = Math.round(239 * (1 - t) + 59 * t);
        var g = Math.round(68 * (1 - t) + 130 * t);
        var b = Math.round(68 * (1 - t) + 246 * t);
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(pad + j * cellW, pad + i * cellH, cellW - 2, cellH - 2);
        ctx.fillStyle = isDark() ? '#e8e6e3' : '#1a1a1a';
        ctx.font = '10px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(v.toFixed(2), pad + (j + 0.5) * cellW, pad + (i + 0.6) * cellH);
      }
    }
    ctx.fillStyle = textColor();
    ctx.font = '10px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'right';
    for (var k = 0; k < n; k++) {
      ctx.fillText(labels[k], pad - 4, pad + (k + 0.6) * cellH);
    }
  }

  // ---------- 5. PCA 散點（良性 / 惡性）----------
  var pcaEl = document.getElementById('mlPcaChart');
  if (pcaEl) {
    var benign = [
      { x: -2.1, y: 0.8 }, { x: -1.9, y: 0.5 }, { x: -2.3, y: -0.2 }, { x: -1.7, y: 0.9 }, { x: -2.0, y: 0.3 },
      { x: -1.8, y: 0.6 }, { x: -2.2, y: 0.1 }, { x: -1.6, y: 0.4 }, { x: -2.4, y: -0.5 }, { x: -1.5, y: 0.7 },
      { x: -2.1, y: -0.3 }, { x: -1.9, y: 0.2 }, { x: -2.0, y: 0.0 }, { x: -1.8, y: 0.5 }, { x: -2.2, y: 0.4 }
    ];
    var malignant = [
      { x: 2.2, y: -0.5 }, { x: 1.8, y: 0.3 }, { x: 2.5, y: -0.8 }, { x: 1.9, y: 0.1 }, { x: 2.3, y: -0.2 },
      { x: 2.0, y: -0.4 }, { x: 1.7, y: 0.2 }, { x: 2.4, y: -0.6 }, { x: 1.6, y: 0.5 }, { x: 2.1, y: -0.3 },
      { x: 2.2, y: 0.0 }, { x: 1.9, y: -0.2 }, { x: 2.0, y: 0.1 }, { x: 2.3, y: -0.5 }, { x: 1.8, y: -0.1 }
    ];
    var pcaChart = new Chart(pcaEl, {
      type: 'scatter',
      data: {
        datasets: [
          { label: '良性 (B)', data: benign, backgroundColor: 'rgba(34, 197, 94, 0.6)', borderColor: '#22c55e', pointRadius: 5 },
          { label: '惡性 (M)', data: malignant, backgroundColor: 'rgba(239, 68, 68, 0.6)', borderColor: '#ef4444', pointRadius: 5 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'top', labels: { color: textColor } } },
        scales: {
          x: {
            title: { display: true, text: 'PC1', color: textColor() },
            grid: { color: gridColor() },
            ticks: { color: textColor() }
          },
          y: {
            title: { display: true, text: 'PC2', color: textColor() },
            grid: { color: gridColor() },
            ticks: { color: textColor() }
          }
        }
      }
    });
    charts.push(pcaChart);
  }

  // ---------- 主題切換時重繪（熱圖、Chart 用 options 的 color）----------
  function updateTheme() {
    charts.forEach(function (ch) {
      if (ch && ch.options && ch.options.scales) {
        var scales = ch.options.scales;
        Object.keys(scales).forEach(function (axis) {
          if (scales[axis].grid) scales[axis].grid.color = gridColor();
          if (scales[axis].ticks) scales[axis].ticks.color = textColor();
        });
        if (ch.options.plugins && ch.options.plugins.legend && ch.options.plugins.legend.labels) {
          ch.options.plugins.legend.labels.color = textColor();
        }
        ch.update('none');
      }
    });
    if (heatmapEl) drawHeatmap(heatmapEl, heatData, heatLabels);
  }

  var obs = new MutationObserver(function () {
    updateTheme();
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: [ 'data-theme' ] });

  // ---------- 捲動動畫 + 解說 ----------
  var blocks = section.querySelectorAll('.ml-chart-block.ml-animate');
  var narrativeEl = document.getElementById('mlNarrative');
  var narrativeText = document.getElementById('mlNarrativeText');
  var narrativeContent = '滑到下方圖表，我會簡短解說每個結果。';

  if (typeof IntersectionObserver !== 'undefined') {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('ml-visible');
            var msg = entry.target.getAttribute('data-narrative');
            if (narrativeText && msg) {
              narrativeText.textContent = msg;
              if (narrativeEl) narrativeEl.classList.add('ml-narrative-active');
            }
          }
        });
      },
      { rootMargin: '-10% 0px -15% 0px', threshold: 0 }
    );
    blocks.forEach(function (block) { io.observe(block); });
  } else {
    blocks.forEach(function (block) { block.classList.add('ml-visible'); });
  }

  window.__mlShowcaseCharts = charts;
  window.__mlShowcaseUpdateTheme = updateTheme;
})();
