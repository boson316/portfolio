(function () {
  'use strict';
  if (typeof Chart === 'undefined') return;
  var canvas = document.getElementById('pytorchChart');
  if (!canvas) return;

  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  var gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  var textColor = isDark ? '#9a9a9a' : '#5c5c5c';

  var epochs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  var loss = [2.1, 1.4, 0.95, 0.62, 0.48, 0.38, 0.32, 0.28, 0.25, 0.22];

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: epochs.map(function (e) { return 'Epoch ' + e; }),
      datasets: [{
        label: 'Training Loss',
        data: loss,
        borderColor: '#ee4c2c',
        backgroundColor: 'rgba(238, 76, 44, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor }
        }
      }
    }
  });
})();
