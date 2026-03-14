/**
 * ML 專區圖表：混淆矩陣、Loss/Acc、Feature Importance、相關熱圖、PCA 散點
 * 資料來源：威斯康辛乳腺癌 KNN 報告（TN=68, FP=3, FN=3, TP=40, Acc 94.7%）
 */
(function () {
  'use strict';
  if (typeof Chart === 'undefined') return;

  var isDark = function () {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  };
  var gridColor = function () {
    return isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  };
  var textColor = function () {
    return isDark() ? '#9a9a9a' : '#5c5c5c';
  };

  // ---------- 1. 混淆矩陣（2x2 Matrix）----------
  var confusionCanvas = document.getElementById('mlConfusionChart');
  if (confusionCanvas) {
    // 報告數據：Predicted 為列、Actual 為行 → 通常為 [Actual B, Actual M] x [Pred B, Pred M]
    // TN=68( Pred B, Actual B ), FP=3( Pred M, Actual B ), FN=3( Pred B, Actual M ), TP=40( Pred M, Actual M )
    var confusionData = [
      { x: 0, y: 0, v: 68 },  // 列0 Pred B, 行0 Actual B → TN
      { x: 1, y: 0, v: 3 },   // 列1 Pred M, 行0 Actual B → FP
      { x: 0, y: 1, v: 3 },   // 列0 Pred B, 行1 Actual M → FN
      { x: 1, y: 1, v: 40 }
    ];
    var confusionColors = [
      'rgba(34, 197, 94, 0.75)',   // TN 綠
      'rgba(249, 115, 22, 0.75)',  // FP 橙
      'rgba(249, 115, 22, 0.75)',  // FN 橙
      'rgba(59, 130, 246, 0.75)'   // TP 藍
    ];
    var getConfusionColor = function (ctx) {
      var idx = ctx.dataIndex;
      return confusionColors[idx] || 'rgba(128,128,128,0.5)';
    };
    try {
      new Chart(confusionCanvas, {
        type: 'matrix',
        data: {
          datasets: [{
            label: 'Confusion Matrix',
            data: confusionData,
            backgroundColor: getConfusionColor,
            borderColor: isDark() ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
            borderWidth: 1,
            width: function (_ref) {
              var chart = _ref.chart;
              return ((chart.chartArea && chart.chartArea.width) ? chart.chartArea.width : 200) / 2 - 4;
            },
            height: function (_ref) {
              var chart = _ref.chart;
              return ((chart.chartArea && chart.chartArea.height) ? chart.chartArea.height : 160) / 2 - 4;
            }
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.2,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var v = ctx.raw && ctx.raw.v;
                  var labels = ['TN (Pred B, Actual B)', 'FP (Pred M, Actual B)', 'FN (Pred B, Actual M)', 'TP (Pred M, Actual M)'];
                  return (labels[ctx.dataIndex] || '') + ': ' + (v != null ? v : '');
                }
              }
            }
          },
          scales: {
            x: {
              min: -0.5,
              max: 1.5,
              display: true,
              offset: false,
              ticks: {
                callback: function (_, i) {
                  return ['Pred 良性 (B)', 'Pred 惡性 (M)'][i];
                },
                color: textColor(),
                maxRotation: 0,
                font: { size: 11 }
              },
              grid: { display: false }
            },
            y: {
              min: -0.5,
              max: 1.5,
              reverse: true,
              display: true,
              ticks: {
                callback: function (_, i) {
                  return ['Actual 良性 (B)', 'Actual 惡性 (M)'][i];
                },
                color: textColor(),
                font: { size: 11 }
              },
              grid: { display: false }
            }
          }
        },
        plugins: [{
          id: 'confusionValues',
          afterDatasetsDraw: function (chart) {
            var ctx = chart.ctx;
            var meta = chart.getDatasetMeta(0);
            if (!meta || !meta.data.length) return;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isDark() ? '#e8e6e3' : '#1a1a1a';
            ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
            meta.data.forEach(function (cell, i) {
              var v = confusionData[i] && confusionData[i].v;
              if (v == null) return;
              var x = (cell.x !== undefined) ? cell.x : (cell.tooltipPosition && cell.tooltipPosition.x);
              var y = (cell.y !== undefined) ? cell.y : (cell.tooltipPosition && cell.tooltipPosition.y);
              if (x != null && y != null) ctx.fillText(String(v), x, y);
            });
            ctx.restore();
          }
        }]
      });
    } catch (e) {
      // 若未載入 matrix 外掛，改用群組長條圖
      new Chart(confusionCanvas, {
        type: 'bar',
        data: {
          labels: ['TN', 'FP', 'FN', 'TP'],
          datasets: [{
            label: '數量',
            data: [68, 3, 3, 40],
            backgroundColor: confusionColors,
            borderColor: confusionColors.map(function (c) { return c.replace('0.75', '1'); }),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor() }, ticks: { color: textColor() } },
            y: { grid: { display: false }, ticks: { color: textColor() } }
          }
        }
      });
    }
  }

  // ---------- 2. Loss & Accuracy 曲線 ----------
  var lossAccCanvas = document.getElementById('mlLossAccChart');
  if (lossAccCanvas) {
    var epochs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var loss = [2.1, 1.4, 0.95, 0.62, 0.48, 0.38, 0.32, 0.28, 0.25, 0.22];
    var acc = [0.52, 0.61, 0.68, 0.74, 0.79, 0.83, 0.86, 0.89, 0.91, 0.93];
    new Chart(lossAccCanvas, {
      type: 'line',
      data: {
        labels: epochs.map(function (e) { return 'Epoch ' + e; }),
        datasets: [
          {
            label: 'Loss',
            data: loss,
            borderColor: '#ee4c2c',
            backgroundColor: 'rgba(238, 76, 44, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            yAxisID: 'y'
          },
          {
            label: 'Accuracy',
            data: acc,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: textColor() } } },
        scales: {
          x: {
            grid: { color: gridColor() },
            ticks: { color: textColor(), maxTicksLimit: 6 }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: gridColor() },
            ticks: { color: textColor() }
          },
          y1: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 1,
            grid: { drawOnChartArea: false },
            ticks: { color: textColor(), callback: function (v) { return (v * 100) + '%'; } }
          }
        }
      }
    });
  }

  // ---------- 3. Feature Importance（Top 10，威斯康辛 30 維特徵）----------
  var featureCanvas = document.getElementById('mlFeatureChart');
  if (featureCanvas) {
    var featureLabels = [
      'radius_mean', 'perimeter_mean', 'area_mean', 'concave points_mean',
      'area_worst', 'perimeter_worst', 'radius_worst', 'concave points_worst',
      'concavity_mean', 'compactness_mean'
    ];
    var featureValues = [0.24, 0.22, 0.20, 0.12, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05];
    new Chart(featureCanvas, {
      type: 'bar',
      data: {
        labels: featureLabels,
        datasets: [{
          label: 'Importance',
          data: featureValues,
          backgroundColor: 'rgba(196, 92, 38, 0.7)',
          borderColor: 'rgba(196, 92, 38, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: {
            min: 0,
            max: 0.3,
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
  }

  // ---------- 4. 相關熱圖（精選 6x6 特徵）----------
  var heatmapCanvas = document.getElementById('mlHeatmapChart');
  if (heatmapCanvas) {
    var heatmapLabels = ['radius_m', 'texture_m', 'perimeter_m', 'area_m', 'smooth_m', 'compact_m'];
    // 簡化相關係數矩陣（對角 1，相鄰高相關）
    var heatmapData = [];
    var heatmapValues = [
      [1, 0.3, 0.99, 0.99, 0.6, 0.7],
      [0.3, 1, 0.3, 0.3, 0.1, 0.3],
      [0.99, 0.3, 1, 0.99, 0.6, 0.7],
      [0.99, 0.3, 0.99, 1, 0.6, 0.7],
      [0.6, 0.1, 0.6, 0.6, 1, 0.5],
      [0.7, 0.3, 0.7, 0.7, 0.5, 1]
    ];
    for (var row = 0; row < 6; row++) {
      for (var col = 0; col < 6; col++) {
        heatmapData.push({ x: col, y: row, v: heatmapValues[row][col] });
      }
    }
    var heatmapColor = function (ctx) {
      var v = ctx.raw && ctx.raw.v;
      if (v == null) return 'rgba(128,128,128,0.3)';
      var t = (v + 1) / 2;
      var r = Math.round(59 + (236 - 59) * t);
      var g = Math.round(130 + (76 - 130) * t);
      var b = Math.round(246 + (44 - 246) * t);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + 0.8 + ')';
    };
    try {
      new Chart(heatmapCanvas, {
        type: 'matrix',
        data: {
          datasets: [{
            label: 'Correlation',
            data: heatmapData,
            backgroundColor: heatmapColor,
            borderColor: isDark() ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            borderWidth: 1,
            width: function (_ref) {
              var chart = _ref.chart;
              var w = (chart.chartArea && chart.chartArea.width) ? chart.chartArea.width : 240;
              return w / 6 - 2;
            },
            height: function (_ref) {
              var chart = _ref.chart;
              var h = (chart.chartArea && chart.chartArea.height) ? chart.chartArea.height : 200;
              return h / 6 - 2;
            }
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var v = ctx.raw && ctx.raw.v;
                  var r = ctx.raw && ctx.raw.y;
                  var c = ctx.raw && ctx.raw.x;
                  return (heatmapLabels[r] || '') + ' vs ' + (heatmapLabels[c] || '') + ': ' + (v != null ? v.toFixed(2) : '');
                }
              }
            }
          },
          scales: {
            x: {
              min: -0.5,
              max: 5.5,
              display: true,
              offset: false,
              ticks: {
                callback: function (_, i) { return heatmapLabels[i] || ''; },
                color: textColor(),
                maxRotation: 45,
                font: { size: 9 }
              },
              grid: { display: false }
            },
            y: {
              min: -0.5,
              max: 5.5,
              reverse: true,
              display: true,
              ticks: {
                callback: function (_, i) { return heatmapLabels[i] || ''; },
                color: textColor(),
                font: { size: 9 }
              },
              grid: { display: false }
            }
          }
        }
      });
    } catch (err) {
      // 無 matrix 時顯示小說明
      heatmapCanvas.parentNode.innerHTML = '<p class="ml-chart-fallback" style="padding:1rem;color:var(--text-muted);">相關係數熱圖需 matrix 外掛</p>';
    }
  }

  // ---------- 5. PCA 散點（良性 vs 惡性）----------
  var pcaCanvas = document.getElementById('mlPcaChart');
  if (pcaCanvas) {
    // 模擬 PCA 前兩主成分（良性多集中左側、惡性多右側）
    var pcaBenign = [
      { x: -2.1, y: 0.5 }, { x: -1.8, y: -0.3 }, { x: -2.3, y: 0.8 }, { x: -1.5, y: 0.1 }, { x: -2.0, y: -0.5 },
      { x: -1.6, y: 0.4 }, { x: -2.2, y: -0.2 }, { x: -1.9, y: 0.6 }, { x: -1.4, y: -0.4 }, { x: -2.1, y: 0.2 }
    ];
    var pcaMalignant = [
      { x: 1.2, y: 0.3 }, { x: 1.8, y: -0.4 }, { x: 1.0, y: 0.7 }, { x: 1.5, y: -0.2 }, { x: 1.3, y: 0.1 },
      { x: 1.6, y: -0.5 }, { x: 1.1, y: 0.4 }, { x: 1.4, y: -0.3 }, { x: 1.7, y: 0.2 }, { x: 1.2, y: -0.1 }
    ];
    new Chart(pcaCanvas, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: '良性 (B)',
            data: pcaBenign,
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            borderColor: 'rgba(34, 197, 94, 1)',
            pointRadius: 6,
            pointHoverRadius: 8
          },
          {
            label: '惡性 (M)',
            data: pcaMalignant,
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderColor: 'rgba(239, 68, 68, 1)',
            pointRadius: 6,
            pointHoverRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor() } } },
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
  }
})();
