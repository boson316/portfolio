(function () {
  'use strict';
  var canvas = document.getElementById('skillsCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  var skills = [
    { name: 'AI', color: 0x6366f1 },
    { name: 'Web', color: 0x0ea5e9 },
    { name: 'Python', color: 0x10b981 },
    { name: 'Data', color: 0xf59e0b },
    { name: 'Tools', color: 0xc45c26 }
  ];

  var group = new THREE.Group();
  var radius = 1.8;
  skills.forEach(function (s, i) {
    var geometry = new THREE.SphereGeometry(0.22, 24, 24);
    var material = new THREE.MeshPhongMaterial({ color: s.color, shininess: 60 });
    var mesh = new THREE.Mesh(geometry, material);
    var angle = (i / skills.length) * Math.PI * 2;
    mesh.position.x = Math.cos(angle) * radius;
    mesh.position.z = Math.sin(angle) * radius;
    group.add(mesh);
  });
  scene.add(group);

  var light = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(light);
  var point = new THREE.PointLight(0xffffff, 0.8);
  point.position.set(3, 3, 5);
  scene.add(point);

  camera.position.z = 5;

  function resize() {
    var wrap = canvas.parentElement;
    if (!wrap) return;
    var w = wrap.clientWidth;
    var h = wrap.clientHeight || 280;
    canvas.width = w;
    canvas.height = h;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function animate() {
    requestAnimationFrame(animate);
    group.rotation.y += 0.006;
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', resize);
  animate();
})();
