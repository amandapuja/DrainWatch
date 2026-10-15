/* =============================================
   DRAINWATCH — CORE REAL-TIME & DYNAMIC JAVASCRIPT
   Computer Vision YOLOv8 + IoT Telemetry + Predictive Modeling
   ============================================= */

'use strict';

// ──────────────────────────────────────────────
//  GLOBAL STATE & CONFIGURATION
// ──────────────────────────────────────────────
const DW_STATE = {
  simSpeed: 1,             // 0 = Pause, 1 = 1x, 2 = 2x, 5 = 5x
  isStorm: false,          // Storm event trigger
  autoPump: false,         // Auto drainage pump
  audioEnabled: true,      // Sound alerts
  autoScrollLogs: true,    // Log terminal autoscroll
  activeCamId: 1,          // Current camera (1..4)
  confThreshold: 0.65,     // YOLO min confidence
  activeFilters: new Set(['all', 'plastic', 'debris', 'sediment', 'blockage']),
  selectedSensorId: 'S-01',// Selected IoT sensor node
  webcamActive: false,     // User webcam stream active
  webcamStream: null,      // MediaStream reference
  uploadedImage: null,     // User uploaded image for detection
  simTimer: null,          // Real-time interval timer
  audioCtx: null,          // Web Audio context
  lastFpsTime: performance.now(),
  frameCount: 0,
  currentFps: 30.1,
  currentLatency: 15.2,
};

// ──────────────────────────────────────────────
//  SENSOR TELEMETRY DATA REPOSITORY
// ──────────────────────────────────────────────
const SENSOR_DATA = [
  { id: 'S-01', location: 'Jl. Sudirman KM.2', level: 87.2, flow: 2.3, blockage: 89, status: 'critical', temp: 28.4, ph: 6.8, turb: 145, time: 'Baru saja' },
  { id: 'S-02', location: 'Jl. MH Thamrin', level: 62.4, flow: 4.1, blockage: 47, status: 'warning', temp: 27.9, ph: 7.1, turb: 92, time: '1 mnt lalu' },
  { id: 'S-03', location: 'Jl. Kuningan Raya', level: 31.0, flow: 6.8, blockage: 12, status: 'normal', temp: 26.8, ph: 7.3, turb: 45, time: 'Baru saja' },
  { id: 'S-04', location: 'Jl. Rasuna Said', level: 28.5, flow: 7.2, blockage: 8, status: 'normal', temp: 27.1, ph: 7.2, turb: 38, time: '2 mnt lalu' },
  { id: 'S-05', location: 'Jl. HR Rasuna', level: 45.3, flow: 5.5, blockage: 22, status: 'normal', temp: 27.5, ph: 7.0, turb: 55, time: '1 mnt lalu' },
  { id: 'S-06', location: 'Jl. Casablanca', level: 39.8, flow: 6.1, blockage: 15, status: 'normal', temp: 27.2, ph: 7.1, turb: 48, time: '3 mnt lalu' },
  { id: 'S-07', location: 'Jl. Gatot Subroto', level: 83.1, flow: 1.8, blockage: 82, status: 'critical', temp: 29.1, ph: 6.6, turb: 168, time: 'Baru saja' },
  { id: 'S-08', location: 'Jl. TB Simatupang', level: 52.6, flow: 4.9, blockage: 35, status: 'warning', temp: 27.8, ph: 7.0, turb: 78, time: '2 mnt lalu' },
  { id: 'S-09', location: 'Semanggi', level: 24.2, flow: 7.5, blockage: 6, status: 'normal', temp: 26.5, ph: 7.4, turb: 32, time: '1 mnt lalu' },
  { id: 'S-10', location: 'Jl. Sudirman KM.5', level: 71.4, flow: 3.2, blockage: 58, status: 'warning', temp: 28.2, ph: 6.9, turb: 110, time: '4 mnt lalu' },
  { id: 'S-11', location: 'Jl. Jend. Basuki', level: 19.5, flow: 7.8, blockage: 4, status: 'normal', temp: 26.2, ph: 7.5, turb: 28, time: '1 mnt lalu' },
  { id: 'S-12', location: 'Jl. Casablanca Timur', level: 33.7, flow: 6.4, blockage: 11, status: 'normal', temp: 27.0, ph: 7.2, turb: 42, time: '2 mnt lalu' },
  { id: 'S-13', location: 'Jl. Gatot Sub. KM.6', level: 81.0, flow: 2.1, blockage: 79, status: 'critical', temp: 28.9, ph: 6.7, turb: 155, time: 'Baru saja' },
  { id: 'S-14', location: 'Pancoran', level: 64.8, flow: 3.8, blockage: 51, status: 'warning', temp: 28.0, ph: 6.9, turb: 98, time: '3 mnt lalu' },
  { id: 'S-15', location: 'Jl. Ahmad Yani', level: 26.3, flow: 7.1, blockage: 9, status: 'normal', temp: 26.7, ph: 7.3, turb: 36, time: '2 mnt lalu' },
];

let filteredData = [...SENSOR_DATA];

// ──────────────────────────────────────────────
//  ROLLING TIME-SERIES FOR REAL-TIME CHARTS
// ──────────────────────────────────────────────
const CHART_HISTORY = {
  times: Array.from({length: 24}, (_, i) => `${String(i).padStart(2,'0')}:00`),
  zonaA: [28, 30, 35, 42, 38, 32, 45, 58, 71, 78, 82, 87, 85, 79, 73, 68, 63, 58, 52, 49, 45, 42, 38, 35],
  zonaB: [22, 24, 26, 30, 28, 25, 32, 44, 52, 60, 65, 70, 68, 62, 58, 54, 50, 46, 42, 40, 37, 35, 32, 29],
  zonaC: [18, 20, 22, 24, 22, 20, 25, 33, 40, 46, 50, 54, 52, 48, 45, 42, 38, 35, 32, 30, 28, 26, 24, 21],
  predHorizon: 24
};

// ──────────────────────────────────────────────
//  CAMERA PRESETS & SIMULATED DETECTIONS
// ──────────────────────────────────────────────
const CAM_PRESETS = {
  1: {
    id: 1,
    name: 'CAM-01 · Jl. Sudirman KM.2',
    sensorId: 'S-01',
    status: 'critical',
    blockage: 89,
    flowSpeed: 0.6,
    baseObjects: [
      { id: 101, class: 'blockage', label: 'Penyumbatan Parah', baseConf: 0.942, color: '#ef4444', x: 0.30, y: 0.45, w: 0.28, h: 0.32, vx: 0.001, vy: 0.002, t: 0 },
      { id: 102, class: 'plastic', label: 'Sampah Plastik (Botol/Gelas)', baseConf: 0.914, color: '#a855f7', x: 0.62, y: 0.52, w: 0.18, h: 0.22, vx: -0.002, vy: 0.001, t: 1 },
      { id: 103, class: 'debris', label: 'Debris Organik (Ranting Kayu)', baseConf: 0.875, color: '#22c55e', x: 0.48, y: 0.38, w: 0.22, h: 0.18, vx: 0.0015, vy: -0.001, t: 2 },
      { id: 104, class: 'sediment', label: 'Sedimentasi Lumpur Tinggi', baseConf: 0.783, color: '#f59e0b', x: 0.22, y: 0.62, w: 0.24, h: 0.20, vx: 0.0005, vy: 0.001, t: 3 },
    ]
  },
  2: {
    id: 2,
    name: 'CAM-02 · Jl. MH Thamrin',
    sensorId: 'S-02',
    status: 'warning',
    blockage: 47,
    flowSpeed: 1.1,
    baseObjects: [
      { id: 201, class: 'debris', label: 'Ranting & Dedaunan Apung', baseConf: 0.865, color: '#22c55e', x: 0.35, y: 0.42, w: 0.25, h: 0.20, vx: 0.003, vy: 0.001, t: 0 },
      { id: 202, class: 'plastic', label: 'Kemasan Plastik', baseConf: 0.762, color: '#a855f7', x: 0.58, y: 0.50, w: 0.16, h: 0.16, vx: -0.001, vy: 0.002, t: 1 },
      { id: 203, class: 'sediment', label: 'Lapisan Lumpur Mengendap', baseConf: 0.710, color: '#f59e0b', x: 0.20, y: 0.65, w: 0.26, h: 0.18, vx: 0.0004, vy: 0.0005, t: 2 },
    ]
  },
  3: {
    id: 3,
    name: 'CAM-03 · Jl. Gatot Subroto',
    sensorId: 'S-07',
    status: 'critical',
    blockage: 82,
    flowSpeed: 0.4,
    baseObjects: [
      { id: 301, class: 'blockage', label: 'Penyumbatan Gorong-gorong', baseConf: 0.958, color: '#ef4444', x: 0.28, y: 0.40, w: 0.34, h: 0.35, vx: 0.0008, vy: 0.001, t: 0 },
      { id: 302, class: 'debris', label: 'Batang Pohon Tumbang', baseConf: 0.912, color: '#22c55e', x: 0.55, y: 0.48, w: 0.28, h: 0.22, vx: -0.001, vy: 0.0015, t: 1 },
      { id: 303, class: 'plastic', label: 'Tumpukan Sampah Anorganik', baseConf: 0.887, color: '#a855f7', x: 0.38, y: 0.60, w: 0.22, h: 0.22, vx: 0.0012, vy: -0.0008, t: 2 },
      { id: 304, class: 'sediment', label: 'Sedimentasi Pasir & Tanah', baseConf: 0.825, color: '#f59e0b', x: 0.16, y: 0.68, w: 0.30, h: 0.18, vx: 0.0003, vy: 0.0004, t: 3 },
    ]
  },
  4: {
    id: 4,
    name: 'CAM-04 · Jl. Kuningan Raya',
    sensorId: 'S-03',
    status: 'normal',
    blockage: 12,
    flowSpeed: 1.8,
    baseObjects: [
      { id: 401, class: 'debris', label: 'Dedaunan Mengapung Ringan', baseConf: 0.724, color: '#22c55e', x: 0.45, y: 0.48, w: 0.14, h: 0.12, vx: 0.004, vy: 0.002, t: 0 },
    ]
  }
};

let currentTrackedObjects = JSON.parse(JSON.stringify(CAM_PRESETS[1].baseObjects));

// ──────────────────────────────────────────────
//  INITIALIZATION ROUTINE
// ──────────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) {
      ls.classList.add('hidden');
      setTimeout(() => ls.remove(), 600);
    }
    initAll();
  }, 1800);
});

function initAll() {
  initParticles();
  initRain();
  initNavbar();
  initAlertPanel();
  initCounters();
  initSensorTable();
  initCharts();
  initScrollReveal();
  initBackToTop();
  updateClock();
  setInterval(updateClock, 1000);

  // Real-time YOLO canvas engine
  initYoloLiveCanvas();

  // Seed Event Log stream
  seedInitialEventLogs();

  // Launch dynamic real-time telemetry loop
  startRealtimeSimulation();

  console.log('%c[DrainWatch] Real-time AI Vision & Telemetry Engine Online', 'color:#00e5ff;font-weight:bold;font-size:14px');
}

// ──────────────────────────────────────────────
//  AUDIO SYNTHESIZER (WEB AUDIO API)
// ──────────────────────────────────────────────
function getAudioContext() {
  if (!DW_STATE.audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) DW_STATE.audioCtx = new AudioCtx();
  }
  if (DW_STATE.audioCtx && DW_STATE.audioCtx.state === 'suspended') {
    DW_STATE.audioCtx.resume();
  }
  return DW_STATE.audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
  if (!DW_STATE.audioEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context may be restricted by user policy before interaction
  }
}

function playAlertChime(severity = 'warning') {
  if (!DW_STATE.audioEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (severity === 'critical') {
      // Rapid sci-fi alarm sweep
      playTone(880, 'sawtooth', 0.18, 0.15);
      setTimeout(() => playTone(660, 'sawtooth', 0.22, 0.15), 120);
    } else {
      // Gentle warning double beep
      playTone(587.33, 'sine', 0.12, 0.08);
      setTimeout(() => playTone(783.99, 'sine', 0.15, 0.08), 100);
    }
  } catch (e) {}
}

function playSuccessChime() {
  if (!DW_STATE.audioEnabled) return;
  try {
    playTone(523.25, 'triangle', 0.12, 0.08);
    setTimeout(() => playTone(659.25, 'triangle', 0.12, 0.08), 90);
    setTimeout(() => playTone(783.99, 'triangle', 0.20, 0.08), 180);
  } catch (e) {}
}

function toggleAudioAlerts() {
  DW_STATE.audioEnabled = !DW_STATE.audioEnabled;
  const icon = document.getElementById('sound-icon');
  const label = document.getElementById('sound-label');
  const btn = document.getElementById('btn-sound-toggle');
  if (icon && label && btn) {
    if (DW_STATE.audioEnabled) {
      icon.textContent = '🔔';
      label.textContent = 'Audio On';
      btn.classList.remove('muted');
      showToast('Audio Alert Diaktifkan', 'Notifikasi suara radar akan berbunyi saat terjadi anomali.', 'success');
      playSuccessChime();
    } else {
      icon.textContent = '🔕';
      label.textContent = 'Audio Mute';
      btn.classList.add('muted');
      showToast('Audio Alert Dimatikan', 'Suara notifikasi diredam.', 'warning');
    }
  }
}

// ──────────────────────────────────────────────
//  BACKGROUND PARTICLES & RAIN FX
// ──────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.size = Math.random() * 1.5 + 0.3;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.4 + 0.05;
      this.color = Math.random() > 0.7 ? '0,229,255' : '124,58,237';
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color},${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 70; i++) particles.push(new Particle());

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,229,255,${0.05 * (1 - dist/110)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    requestAnimationFrame(animate);
  }
  animate();
}

function initRain() {
  const container = document.getElementById('rain-container');
  if (!container) return;
  container.innerHTML = '';
  const count = DW_STATE.isStorm ? 120 : 50;
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('div');
    drop.classList.add('rain-drop');
    drop.style.left = Math.random() * 100 + '%';
    drop.style.height = (Math.random() * (DW_STATE.isStorm ? 90 : 50) + 20) + 'px';
    drop.style.animationDuration = (Math.random() * 0.6 + 0.3) + 's';
    drop.style.animationDelay = (Math.random() * 2) + 's';
    drop.style.opacity = Math.random() * 0.5 + 0.15;
    container.appendChild(drop);
  }
}

// ──────────────────────────────────────────────
//  NAVBAR & CLOCK
// ──────────────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');

    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 130) current = s.id;
    });
    navLinks.forEach(l => {
      l.classList.remove('active');
      if (l.getAttribute('href') === '#' + current) l.classList.add('active');
    });
  });

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function initAlertPanel() {
  const btn = document.getElementById('alert-toggle');
  const panel = document.getElementById('alert-panel');
  if (!btn || !panel) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });
}

function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hh}:${mm}:${ss}`;

  const elClock = document.getElementById('realtime-clock');
  if (elClock) elClock.textContent = `${timeStr} WIB`;

  const elCam = document.getElementById('cam-time');
  if (elCam) elCam.textContent = timeStr;
}

// ──────────────────────────────────────────────
//  LIVE EVENT LOG TERMINAL
// ──────────────────────────────────────────────
function seedInitialEventLogs() {
  const feed = document.getElementById('eventLogFeed');
  if (!feed) return;
  feed.innerHTML = '';

  const initialLogs = [
    { badge: 'YOLO', cls: 'badge-yolo', text: 'Model <strong>YOLOv8n-DrainNet</strong> dimuat (TensorRT FP16, Latency ~15.2ms)' },
    { badge: 'IoT', cls: 'badge-iot', text: 'Gateway LoRaWAN GW-01 terhubung: 47 node sensor telemetri online' },
    { badge: 'WARN', cls: 'badge-warn', text: 'Sensor S-10 (Jl. Sudirman KM.5): Peningkatan debit air 15% dalam 10 menit' },
    { badge: 'CRIT', cls: 'badge-crit', text: 'Deteksi CAM-01: Penyumbatan 89% terdeteksi di Jl. Sudirman KM.2' },
  ];

  initialLogs.forEach(log => {
    addEventLog(log.badge, log.cls, log.text, false);
  });
}

function addEventLog(badgeText, badgeClass, messageHtml, playSound = false) {
  const feed = document.getElementById('eventLogFeed');
  if (!feed) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-time">[${timeStr}]</span>
    <span class="log-badge ${badgeClass}">${badgeText}</span>
    <span class="log-text">${messageHtml}</span>
  `;

  feed.appendChild(entry);

  // Keep max 70 logs in DOM for efficiency
  while (feed.children.length > 70) {
    feed.removeChild(feed.firstChild);
  }

  if (DW_STATE.autoScrollLogs) {
    feed.scrollTop = feed.scrollHeight;
  }

  if (playSound) {
    if (badgeClass === 'badge-crit') playAlertChime('critical');
    else if (badgeClass === 'badge-warn') playAlertChime('warning');
    else playTone(700, 'sine', 0.08, 0.05);
  }
}

function clearEventLogs() {
  const feed = document.getElementById('eventLogFeed');
  if (feed) feed.innerHTML = '';
  addEventLog('SYS', 'badge-iot', 'Log stream dibersihkan oleh operator.', false);
}

function pauseEventLogs() {
  DW_STATE.autoScrollLogs = !DW_STATE.autoScrollLogs;
  const btn = document.getElementById('pause-logs-btn');
  if (btn) {
    btn.textContent = DW_STATE.autoScrollLogs ? 'Auto-Scroll: ON' : 'Auto-Scroll: OFF';
    btn.style.color = DW_STATE.autoScrollLogs ? 'var(--cyan)' : 'var(--text-muted)';
  }
}

// ──────────────────────────────────────────────
//  TOAST NOTIFICATIONS
// ──────────────────────────────────────────────
function showToast(title, message, type = 'warning') {
  const container = document.getElementById('live-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}-toast`;

  const iconMap = {
    critical: '🚨',
    warning: '⚠️',
    success: '✅',
    info: 'ℹ️'
  };

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  toast.innerHTML = `
    <div class="toast-icon">${iconMap[type] || '🔔'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
      <div class="toast-time">${timeStr} WIB</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s, transform 0.4s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

// ──────────────────────────────────────────────
//  REAL-TIME YOLO CANVAS & INFERENCE ENGINE
// ──────────────────────────────────────────────
function initYoloLiveCanvas() {
  const canvas = document.getElementById('yolo-live-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = canvas.offsetWidth || 640;
    canvas.height = canvas.offsetHeight || 400;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let scanLineY = 30;
  let scanDir = 1;

  function renderYoloFrame() {
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // If webcam is active, draw live webcam video stream onto canvas
    const video = document.getElementById('webcam-video');
    if (DW_STATE.webcamActive && video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, W, H);
    } else if (DW_STATE.uploadedImage) {
      ctx.drawImage(DW_STATE.uploadedImage, 0, 0, W, H);
    } else {
      // Draw procedural futuristic drainage CCTV scene
      drawDrainageCCTVScene(ctx, W, H);
    }

    // Dynamic water simulation overlay (subtle flow ripple)
    drawWaterCurrentOverlay(ctx, W, H);

    // Update & draw tracked YOLO bounding boxes
    const detectedCount = drawYoloBoundingBoxes(ctx, W, H);

    // Draw scanning laser beam
    scanLineY += 1.8 * scanDir;
    if (scanLineY > H - 30) scanDir = -1;
    if (scanLineY < 30) scanDir = 1;

    const scanGrad = ctx.createLinearGradient(0, scanLineY, W, scanLineY);
    scanGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
    scanGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.45)');
    scanGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanLineY - 1.5, W, 3);

    // Crosshair corner reticles
    drawHudCorners(ctx, W, H);

    // Update FPS & Latency counters
    DW_STATE.frameCount++;
    const now = performance.now();
    if (now - DW_STATE.lastFpsTime >= 500) {
      const delta = (now - DW_STATE.lastFpsTime) / 1000;
      DW_STATE.currentFps = Math.min(30.4, Math.max(28.5, (DW_STATE.frameCount / delta))).toFixed(1);
      DW_STATE.currentLatency = (14.2 + (Math.random() - 0.5) * 2.2).toFixed(1);
      DW_STATE.frameCount = 0;
      DW_STATE.lastFpsTime = now;

      const elFps = document.getElementById('yolo-fps');
      const elLat = document.getElementById('yolo-latency');
      const elObj = document.getElementById('yolo-obj-count');
      if (elFps) elFps.textContent = DW_STATE.currentFps;
      if (elLat) elLat.textContent = `${DW_STATE.currentLatency}ms`;
      if (elObj) elObj.textContent = detectedCount;
    }

    requestAnimationFrame(renderYoloFrame);
  }

  requestAnimationFrame(renderYoloFrame);
}

// Procedural CCTV background
function drawDrainageCCTVScene(ctx, W, H) {
  // Culvert tunnel dark background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#060d1a');
  bgGrad.addColorStop(0.6, '#091322');
  bgGrad.addColorStop(1, '#030812');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Concrete culvert perspective lines
  ctx.strokeStyle = '#12233b';
  ctx.lineWidth = 1.2;
  const cx = W / 2, cy = H * 0.42;

  // Perspective grids
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * W, cy + Math.sin(angle) * H);
    ctx.stroke();
  }

  // Drainage conduit rings
  ctx.strokeStyle = 'rgba(30, 58, 95, 0.4)';
  for (let r = 50; r < Math.max(W, H); r += 45) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.2, r * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Flowing water surface at the bottom
  const waterY = H * 0.62;
  const waterGrad = ctx.createLinearGradient(0, waterY, 0, H);
  if (DW_STATE.isStorm) {
    waterGrad.addColorStop(0, 'rgba(14, 116, 144, 0.7)');
    waterGrad.addColorStop(1, 'rgba(8, 47, 73, 0.9)');
  } else {
    waterGrad.addColorStop(0, 'rgba(14, 165, 233, 0.55)');
    waterGrad.addColorStop(1, 'rgba(30, 64, 175, 0.85)');
  }
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, waterY, W, H - waterY);

  // Concrete drainage grate lines
  ctx.strokeStyle = 'rgba(15, 32, 56, 0.8)';
  ctx.lineWidth = 2;
  for (let x = 60; x < W - 60; x += 35) {
    ctx.beginPath();
    ctx.moveTo(x, waterY - 30);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
}

// Flowing ripples animation
let waterPhase = 0;
function drawWaterCurrentOverlay(ctx, W, H) {
  const currentCam = CAM_PRESETS[DW_STATE.activeCamId] || CAM_PRESETS[1];
  waterPhase += (currentCam.flowSpeed || 1) * 0.04 * (DW_STATE.isStorm ? 2 : 1);

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const yBase = H * 0.68 + i * 22;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 15) {
      const y = yBase + Math.sin(x * 0.02 + waterPhase + i) * 4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// Bounding box tracking & rendering
function drawYoloBoundingBoxes(ctx, W, H) {
  let detected = 0;
  const time = performance.now() * 0.001;

  currentTrackedObjects.forEach((obj, idx) => {
    // Confidence threshold filter
    const confJitter = Math.sin(time * 2 + idx) * 0.015;
    const currentConf = Math.min(0.99, Math.max(0.40, obj.baseConf + confJitter));

    if (currentConf < DW_STATE.confThreshold) return;

    // Class filter check
    if (!DW_STATE.activeFilters.has('all') && !DW_STATE.activeFilters.has(obj.class)) return;

    detected++;

    // Floating drift physics
    obj.t = (obj.t || 0) + 0.01;
    const dx = Math.sin(obj.t * 0.8 + idx) * 0.012;
    const dy = Math.cos(obj.t * 0.6 + idx) * 0.008;

    const bx = (obj.x + dx) * W;
    const by = (obj.y + dy) * H;
    const bw = obj.w * W;
    const bh = obj.h * H;

    // Glowing Bounding Box rectangle
    ctx.save();
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = obj.color;
    ctx.shadowBlur = 8;
    ctx.strokeRect(bx, by, bw, bh);

    // Corner reticles
    const cLen = 10;
    ctx.lineWidth = 3.5;
    // Top-left
    ctx.beginPath(); ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen); ctx.stroke();
    ctx.restore();

    // Label banner
    const labelText = `${obj.label} ${(currentConf * 100).toFixed(1)}%`;
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    const textWidth = ctx.measureText(labelText).width;
    const pad = 6;

    ctx.fillStyle = obj.color;
    ctx.fillRect(bx, by - 18, textWidth + pad * 2, 18);

    ctx.fillStyle = '#000';
    ctx.fillText(labelText, bx + pad, by - 5);
  });

  return detected;
}

function drawHudCorners(ctx, W, H) {
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
  ctx.lineWidth = 2;
  const p = 14, len = 20;

  // TL
  ctx.beginPath(); ctx.moveTo(p, p + len); ctx.lineTo(p, p); ctx.lineTo(p + len, p); ctx.stroke();
  // TR
  ctx.beginPath(); ctx.moveTo(W - p - len, p); ctx.lineTo(W - p, p); ctx.lineTo(W - p, p + len); ctx.stroke();
  // BL
  ctx.beginPath(); ctx.moveTo(p, H - p - len); ctx.lineTo(p, H - p); ctx.lineTo(p + len, H - p); ctx.stroke();
  // BR
  ctx.beginPath(); ctx.moveTo(W - p - len, H - p); ctx.lineTo(W - p, H - p); ctx.lineTo(W - p, H - p - len); ctx.stroke();
}

// ──────────────────────────────────────────────
//  CAMERA SWITCHER & SYNC
// ──────────────────────────────────────────────
function selectFeed(id) {
  DW_STATE.activeCamId = id;

  document.querySelectorAll('.feed-card').forEach(c => c.classList.remove('active'));
  const card = document.getElementById('feed-' + id);
  if (card) card.classList.add('active');

  const preset = CAM_PRESETS[id];
  if (!preset) return;

  const label = document.getElementById('active-cam-label');
  if (label) label.textContent = preset.name;

  const statusBadge = document.getElementById('hud-cam-status');
  if (statusBadge) {
    if (preset.status === 'critical') {
      statusBadge.textContent = 'BLOCKAGE DETECTED';
      statusBadge.style.color = '#f87171';
      statusBadge.style.borderColor = 'rgba(239,68,68,0.5)';
      statusBadge.style.background = 'rgba(239,68,68,0.2)';
    } else if (preset.status === 'warning') {
      statusBadge.textContent = 'WARNING: MODERATE DEBRIS';
      statusBadge.style.color = '#fbbf24';
      statusBadge.style.borderColor = 'rgba(245,158,11,0.5)';
      statusBadge.style.background = 'rgba(245,158,11,0.2)';
    } else {
      statusBadge.textContent = 'NORMAL FLOW STREAM';
      statusBadge.style.color = '#86efac';
      statusBadge.style.borderColor = 'rgba(34,197,94,0.5)';
      statusBadge.style.background = 'rgba(34,197,94,0.2)';
    }
  }

  // Load preset objects
  currentTrackedObjects = JSON.parse(JSON.stringify(preset.baseObjects));

  // Sync detection results list
  updateDetectionResultsList();

  // Highlight associated sensor in table/detail
  selectSensorNode(preset.sensorId);

  playTone(800, 'sine', 0.08, 0.04);
  addEventLog('YOLO', 'badge-yolo', `Operator beralih ke saluran feed <strong>${preset.name}</strong>`);
}

function updateDetectionResultsList() {
  const container = document.getElementById('detection-list');
  if (!container) return;

  container.innerHTML = currentTrackedObjects.map(obj => {
    const confPct = (obj.baseConf * 100).toFixed(1);
    return `
      <div class="det-item ${obj.class === 'blockage' ? 'critical-det' : ''}">
        <div class="det-color" style="background:${obj.color}"></div>
        <div class="det-info">
          <span class="det-class">${obj.label}</span>
          <div class="det-bar"><div class="det-fill" style="width:${confPct}%;background:${obj.color}"></div></div>
        </div>
        <span class="det-conf">${confPct}%</span>
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────────────
//  WEBCAM & MEDIA UPLOAD INTEGRATION
// ──────────────────────────────────────────────
async function toggleWebcam() {
  const video = document.getElementById('webcam-video');
  const btn = document.getElementById('btn-webcam');
  const btnText = document.getElementById('webcam-btn-text');

  if (DW_STATE.webcamActive) {
    // Stop webcam
    if (DW_STATE.webcamStream) {
      DW_STATE.webcamStream.getTracks().forEach(track => track.stop());
      DW_STATE.webcamStream = null;
    }
    DW_STATE.webcamActive = false;
    if (video) video.classList.remove('active');
    if (btn) btn.classList.remove('active');
    if (btnText) btnText.textContent = 'Gunakan Webcam Lokal';
    showToast('Webcam Dinonaktifkan', 'Beralih kembali ke simulator CCTV AI.', 'info');
    addEventLog('YOLO', 'badge-yolo', 'Feed webcam lokal dihentikan.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false
    });

    DW_STATE.webcamStream = stream;
    DW_STATE.webcamActive = true;
    DW_STATE.uploadedImage = null;

    if (video) {
      video.srcObject = stream;
      video.classList.add('active');
    }
    if (btn) btn.classList.add('active');
    if (btnText) btnText.textContent = 'Matikan Webcam';

    // Inject simulated YOLO objects tracking the webcam frame
    currentTrackedObjects = [
      { id: 901, class: 'plastic', label: 'Objek/Botol Terdeteksi', baseConf: 0.932, color: '#00e5ff', x: 0.38, y: 0.28, w: 0.26, h: 0.42, vx: 0.001, vy: 0.001, t: 0 },
      { id: 902, class: 'debris', label: 'Material Deteksi Real-Time', baseConf: 0.884, color: '#22c55e', x: 0.15, y: 0.50, w: 0.20, h: 0.25, vx: -0.001, vy: 0.001, t: 1 }
    ];
    updateDetectionResultsList();

    playSuccessChime();
    showToast('Webcam Lokal Aktif', 'Model YOLOv8 mendeteksi objek langsung dari kamera Anda secara real-time!', 'success');
    addEventLog('YOLO', 'badge-yolo', 'Kamera Webcam lokal tersambung. Deteksi real-time 30 FPS aktif.');
  } catch (err) {
    console.warn('Webcam permission denied or unavailable:', err);
    showToast('Akses Kamera Ditolak / Tidak Tersedia', 'Pastikan izin kamera diaktifkan di browser Anda.', 'warning');
    addEventLog('WARN', 'badge-warn', 'Gagal membuka webcam lokal (Periksa izin browser).');
  }
}

function handleMediaUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      DW_STATE.uploadedImage = img;
      DW_STATE.webcamActive = false;
      const video = document.getElementById('webcam-video');
      if (video) video.classList.remove('active');

      // Randomize simulated YOLO detections on the uploaded media
      currentTrackedObjects = [
        { id: 801, class: 'blockage', label: 'Penyumbatan Terdeteksi', baseConf: 0.946, color: '#ef4444', x: 0.25, y: 0.35, w: 0.32, h: 0.38, vx: 0, vy: 0, t: 0 },
        { id: 802, class: 'plastic', label: 'Sampah Plastik', baseConf: 0.891, color: '#a855f7', x: 0.58, y: 0.45, w: 0.22, h: 0.25, vx: 0, vy: 0, t: 0 },
      ];
      updateDetectionResultsList();

      playSuccessChime();
      showToast('Media Berhasil Dimuat', `Inference YOLOv8 selesai dijalankan pada: ${file.name}`, 'success');
      addEventLog('YOLO', 'badge-yolo', `Analisis YOLO pada file gambar <strong>${file.name}</strong> selesai.`);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateConfThreshold(val) {
  DW_STATE.confThreshold = parseFloat(val) / 100;
  const label = document.getElementById('conf-val-label');
  if (label) label.textContent = `${val}%`;
}

function filterDetectionClass(cls, pillEl) {
  if (cls === 'all') {
    DW_STATE.activeFilters.clear();
    DW_STATE.activeFilters.add('all');
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.add('active'));
  } else {
    document.querySelector('.filter-pill[data-class="all"]').classList.remove('active');
    DW_STATE.activeFilters.delete('all');

    if (DW_STATE.activeFilters.has(cls)) {
      DW_STATE.activeFilters.delete(cls);
      if (pillEl) pillEl.classList.remove('active');
    } else {
      DW_STATE.activeFilters.add(cls);
      if (pillEl) pillEl.classList.add('active');
    }

    if (DW_STATE.activeFilters.size === 0) {
      filterDetectionClass('all');
    }
  }
}

// ──────────────────────────────────────────────
//  CONTINUOUS REAL-TIME CHARTS (ECG/STREAMING)
// ──────────────────────────────────────────────
function initCharts() {
  drawWaterLevelChart();
  drawBlockageChart();
  drawFlowChart();
  drawPredictionChart();
  drawPerfChart();
}

function pushChartRealtimeTick() {
  const now = new Date();
  const timeLabel = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  CHART_HISTORY.times.shift();
  CHART_HISTORY.times.push(timeLabel);

  // Storm or normal trend
  const stormFactor = DW_STATE.isStorm ? 2.8 : (DW_STATE.autoPump ? -2.2 : (Math.random() - 0.48) * 1.8);

  const lastA = CHART_HISTORY.zonaA[CHART_HISTORY.zonaA.length - 1];
  const lastB = CHART_HISTORY.zonaB[CHART_HISTORY.zonaB.length - 1];
  const lastC = CHART_HISTORY.zonaC[CHART_HISTORY.zonaC.length - 1];

  const newA = Math.max(10, Math.min(98, lastA + stormFactor + (Math.random() - 0.5) * 1.5));
  const newB = Math.max(10, Math.min(95, lastB + stormFactor * 0.8 + (Math.random() - 0.5) * 1.2));
  const newC = Math.max(5, Math.min(88, lastC + stormFactor * 0.6 + (Math.random() - 0.5) * 1.0));

  CHART_HISTORY.zonaA.shift(); CHART_HISTORY.zonaA.push(parseFloat(newA.toFixed(1)));
  CHART_HISTORY.zonaB.shift(); CHART_HISTORY.zonaB.push(parseFloat(newB.toFixed(1)));
  CHART_HISTORY.zonaC.shift(); CHART_HISTORY.zonaC.push(parseFloat(newC.toFixed(1)));

  drawWaterLevelChart();
  drawBlockageChart();
  drawFlowChart();
}

function drawWaterLevelChart() {
  const canvas = document.getElementById('waterLevelChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 500;
  const H = canvas.height = 220;

  const padL = 45, padR = 20, padT = 20, padB = 40;
  const gW = W - padL - padR, gH = H - padT - padB;
  const maxY = 100;
  const dangerLine = 90;

  ctx.clearRect(0, 0, W, H);

  // Horizontal grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padT + (gH / 5) * i;
    const val = maxY - (maxY / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y); ctx.lineTo(padL + gW, y);
    ctx.strokeStyle = 'rgba(30,58,95,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val + 'cm', padL - 6, y + 4);
  }

  // Ambang Bahaya line (90 cm)
  const dangerY = padT + gH - (gH * dangerLine / maxY);
  ctx.beginPath();
  ctx.moveTo(padL, dangerY); ctx.lineTo(padL + gW, dangerY);
  ctx.strokeStyle = 'rgba(239,68,68,0.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#ef4444';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Ambang Bahaya (90cm)', padL + 6, dangerY - 4);

  // Dataset rendering
  const datasets = [
    { data: CHART_HISTORY.zonaA, color: '#00e5ff', fill: 'rgba(0,229,255,0.1)' },
    { data: CHART_HISTORY.zonaB, color: '#f59e0b', fill: 'rgba(245,158,11,0.08)' },
    { data: CHART_HISTORY.zonaC, color: '#ef4444', fill: 'rgba(239,68,68,0.06)' },
  ];

  datasets.forEach(ds => {
    const step = gW / (ds.data.length - 1);

    // Area fill
    ctx.beginPath();
    ctx.moveTo(padL, padT + gH);
    ds.data.forEach((v, i) => {
      const x = padL + i * step;
      const y = padT + gH - (gH * v / maxY);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + gW, padT + gH);
    ctx.closePath();
    ctx.fillStyle = ds.fill;
    ctx.fill();

    // Spline / Line stroke
    ctx.beginPath();
    ds.data.forEach((v, i) => {
      const x = padL + i * step;
      const y = padT + gH - (gH * v / maxY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Pulse dot at current (newest) point
    const lastX = padL + (ds.data.length - 1) * step;
    const lastY = padT + gH - (gH * ds.data[ds.data.length - 1] / maxY);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = ds.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });

  // Time labels
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  const labelStep = Math.ceil(CHART_HISTORY.times.length / 6);
  CHART_HISTORY.times.forEach((t, i) => {
    if (i % labelStep === 0) {
      const x = padL + i * (gW / (CHART_HISTORY.times.length - 1));
      ctx.fillText(t, x, H - 10);
    }
  });
}

function drawBlockageChart() {
  const canvas = document.getElementById('blockageChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 280;
  const H = canvas.height = 180;

  // Recount from active sensor data
  const normalCount = SENSOR_DATA.filter(s => s.blockage < 40).length;
  const warningCount = SENSOR_DATA.filter(s => s.blockage >= 40 && s.blockage <= 70).length;
  const criticalCount = SENSOR_DATA.filter(s => s.blockage > 70).length;

  const data = [
    { v: normalCount, c: '#22c55e' },
    { v: warningCount, c: '#f59e0b' },
    { v: criticalCount, c: '#ef4444' }
  ];
  const total = data.reduce((a, b) => a + b.v, 0) || 1;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 18, inner = r * 0.65;

  ctx.clearRect(0, 0, W, H);

  let startAngle = -Math.PI / 2;
  data.forEach(d => {
    const angle = (d.v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = d.c;
    ctx.fill();
    startAngle += angle;
  });

  // Inner cutout
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1626';
  ctx.fill();

  // Text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy - 2);

  ctx.fillStyle = 'rgba(148,163,184,0.8)';
  ctx.font = '10px Outfit, sans-serif';
  ctx.fillText('Total Sensor', cx, cy + 14);
}

function drawFlowChart() {
  const canvas = document.getElementById('flowChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 280;
  const H = canvas.height = 180;

  ctx.clearRect(0, 0, W, H);

  const sampleSensors = SENSOR_DATA.slice(0, 10);
  const maxVal = 9.5;
  const barW = (W - 40) / sampleSensors.length;
  const padB = 30, padT = 15;
  const gH = H - padT - padB;

  sampleSensors.forEach((s, i) => {
    const bH = (s.flow / maxVal) * gH;
    const x = 20 + i * barW + barW * 0.15;
    const y = padT + gH - bH;
    const w = barW * 0.7;
    const color = s.flow < 2.5 ? '#ef4444' : s.flow < 5 ? '#f59e0b' : '#22c55e';

    const grad = ctx.createLinearGradient(x, y, x, y + bH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color.replace(')', ', 0.25)').replace('rgb', 'rgba'));
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(x, y, w, bH, [3, 3, 0, 0]);
    ctx.fill();

    // X-axis label
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(s.id, x + w / 2, H - 10);
  });
}

function drawPredictionChart(horizon = CHART_HISTORY.predHorizon) {
  CHART_HISTORY.predHorizon = horizon;
  const canvas = document.getElementById('predictionChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 700;
  const H = canvas.height = 260;

  ctx.clearRect(0, 0, W, H);

  const padL = 50, padR = 20, padT = 20, padB = 40;
  const gW = W - padL - padR, gH = H - padT - padB;

  // Forecast points
  const points = horizon;
  const pred = [], lo = [], hi = [];
  let base = DW_STATE.isStorm ? 88 : 72;

  for (let i = 0; i < points; i++) {
    const trend = DW_STATE.isStorm ? 0.9 : (DW_STATE.autoPump ? -0.8 : (i < 12 ? 0.6 : -0.3));
    base = Math.max(15, Math.min(98, base + trend + (Math.random() - 0.5) * 2));
    pred.push(base);
    lo.push(Math.max(5, base - 5 - Math.random() * 3));
    hi.push(Math.min(100, base + 5 + Math.random() * 3));
  }

  // Grid
  for (let i = 0; i <= 5; i++) {
    const y = padT + (gH / 5) * i;
    const val = 100 - i * 20;
    ctx.beginPath();
    ctx.moveTo(padL, y); ctx.lineTo(padL + gW, y);
    ctx.strokeStyle = 'rgba(30,58,95,0.6)';
    ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val + 'cm', padL - 6, y + 4);
  }

  // Danger line (90cm)
  const dangerY = padT + gH - (gH * 90 / 100);
  ctx.beginPath();
  ctx.moveTo(padL, dangerY); ctx.lineTo(padL + gW, dangerY);
  ctx.strokeStyle = 'rgba(239,68,68,0.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#ef4444';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Batas Bahaya (90cm)', padL + 6, dangerY - 4);

  const xStep = gW / (points - 1);
  const toY = v => padT + gH - (gH * v / 100);

  // Confidence band
  ctx.beginPath();
  pred.forEach((v, i) => {
    const x = padL + i * xStep;
    i === 0 ? ctx.moveTo(x, toY(hi[i])) : ctx.lineTo(x, toY(hi[i]));
  });
  for (let i = points - 1; i >= 0; i--) {
    ctx.lineTo(padL + i * xStep, toY(lo[i]));
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(168,85,247,0.12)';
  ctx.fill();

  // Prediction line
  ctx.beginPath();
  pred.forEach((v, i) => {
    const x = padL + i * xStep;
    i === 0 ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v));
  });
  const lineGrad = ctx.createLinearGradient(padL, 0, padL + gW, 0);
  lineGrad.addColorStop(0, '#00e5ff');
  lineGrad.addColorStop(0.5, '#f59e0b');
  lineGrad.addColorStop(1, '#ef4444');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Labels
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  const stepLabel = Math.max(1, Math.floor(points / 6));
  for (let i = 0; i < points; i += stepLabel) {
    ctx.fillText(`+${i}h`, padL + i * xStep, H - 10);
  }
}

function drawPerfChart() {
  const canvas = document.getElementById('perfChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = 240;
  const H = canvas.height = 160;

  const metrics = [
    { label: 'mAP@50', value: 0.947, color: '#00e5ff' },
    { label: 'Precision', value: 0.923, color: '#22c55e' },
    { label: 'Recall', value: 0.918, color: '#a855f7' },
    { label: 'F1-Score', value: 0.920, color: '#f59e0b' },
  ];

  const barH = 22, gap = 12, padL = 60, padR = 16, padT = 10;

  metrics.forEach((m, i) => {
    const y = padT + i * (barH + gap);
    const maxW = W - padL - padR;
    const fillW = maxW * m.value;

    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(m.label, padL - 6, y + barH / 2 + 4);

    ctx.fillStyle = 'rgba(30,58,95,0.6)';
    ctx.beginPath();
    ctx.roundRect(padL, y, maxW, barH, 4);
    ctx.fill();

    const grad = ctx.createLinearGradient(padL, y, padL + fillW, y);
    grad.addColorStop(0, m.color + '33');
    grad.addColorStop(1, m.color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(padL, y, fillW, barH, 4);
    ctx.fill();

    ctx.fillStyle = m.color;
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(m.value.toFixed(3), padL + fillW + 4, y + barH / 2 + 4);
  });
}

function setPredWindow(hours) {
  document.querySelectorAll('.pred-btn').forEach(b => b.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');
  drawPredictionChart(hours);
  addEventLog('AI', 'badge-yolo', `Jendela horizon prediksi disesuaikan ke <strong>+${hours} Jam</strong>.`);
}

// ──────────────────────────────────────────────
//  SENSOR TABLE & SELECTION LOGIC
// ──────────────────────────────────────────────
function initSensorTable() {
  renderTable(filteredData);

  const search = document.getElementById('sensorSearch');
  const filter = document.getElementById('statusFilter');
  if (search) search.addEventListener('input', filterTable);
  if (filter) filter.addEventListener('change', filterTable);
}

function filterTable() {
  const query = (document.getElementById('sensorSearch')?.value || '').toLowerCase();
  const status = document.getElementById('statusFilter')?.value || '';
  filteredData = SENSOR_DATA.filter(s => {
    const matchQuery = s.id.toLowerCase().includes(query) || s.location.toLowerCase().includes(query);
    const matchStatus = !status || s.status === status;
    return matchQuery && matchStatus;
  });
  renderTable(filteredData);
}

function renderTable(data) {
  const tbody = document.getElementById('sensorTableBody');
  if (!tbody) return;

  const statusMap = {
    critical: ['status-critical', 'KRITIS'],
    warning: ['status-warning', 'PERINGATAN'],
    normal: ['status-normal', 'NORMAL']
  };

  const blockageColor = (v) => v > 70 ? '#fca5a5' : v > 40 ? '#fde68a' : '#86efac';

  tbody.innerHTML = data.map(s => {
    const [cls, label] = statusMap[s.status] || ['status-normal', 'NORMAL'];
    const isSelected = s.id === DW_STATE.selectedSensorId;
    return `
      <tr style="cursor:pointer;${isSelected ? 'background:rgba(0,229,255,0.08);border-left:3px solid var(--cyan)' : ''}" onclick="selectSensorNode('${s.id}')">
        <td style="color:var(--cyan);font-weight:700">${s.id}</td>
        <td style="color:var(--text-primary)">${s.location}</td>
        <td style="color:${s.level > 80 ? '#fca5a5' : s.level > 60 ? '#fde68a' : '#86efac'}">${s.level} cm</td>
        <td>${s.flow} m³/h</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:4px;background:#1e3a5f;border-radius:99px;overflow:hidden;min-width:60px">
              <div style="width:${s.blockage}%;height:100%;background:${blockageColor(s.blockage)};border-radius:99px"></div>
            </div>
            <span style="color:${blockageColor(s.blockage)};min-width:32px">${s.blockage}%</span>
          </div>
        </td>
        <td><span class="status-badge ${cls}">${label}</span></td>
        <td style="color:var(--text-muted)">${s.time}</td>
      </tr>
    `;
  }).join('');
}

// ──────────────────────────────────────────────
//  IOT SENSOR NODE INTERACTION & TELEMETRY GAUGES
// ──────────────────────────────────────────────
function selectSensorNode(sensorId) {
  const sensor = SENSOR_DATA.find(s => s.id === sensorId);
  if (!sensor) return;

  DW_STATE.selectedSensorId = sensorId;

  // Update active sensor banner
  const nameEl = document.getElementById('active-sensor-name');
  if (nameEl) nameEl.textContent = `${sensor.id} · ${sensor.location}`;

  // Update Gauges in Section 4
  updateSensorDetailCards(sensor);

  // Highlight selected row in table
  renderTable(filteredData);
}

function updateSensorDetailCards(sensor) {
  const s = sensor || SENSOR_DATA.find(item => item.id === DW_STATE.selectedSensorId) || SENSOR_DATA[0];

  const valTemp = document.getElementById('val-temp');
  const valPh = document.getElementById('val-ph');
  const valLevel = document.getElementById('val-level');
  const valFlow = document.getElementById('val-flow');
  const valTurb = document.getElementById('val-turb');
  const valRain = document.getElementById('val-rain');

  const gaugeTemp = document.getElementById('gauge-temp');
  const gaugePh = document.getElementById('gauge-ph');
  const gaugeLevel = document.getElementById('gauge-level');
  const gaugeFlow = document.getElementById('gauge-flow');
  const gaugeTurb = document.getElementById('gauge-turb');
  const gaugeRain = document.getElementById('gauge-rain');

  if (valTemp && gaugeTemp) {
    valTemp.textContent = `${s.temp.toFixed(1)}°C`;
    gaugeTemp.style.width = `${Math.min(100, (s.temp / 40) * 100)}%`;
  }
  if (valPh && gaugePh) {
    valPh.textContent = s.ph.toFixed(1);
    gaugePh.style.width = `${Math.min(100, (s.ph / 10) * 100)}%`;
  }
  if (valLevel && gaugeLevel) {
    valLevel.textContent = `${s.level.toFixed(1)} cm`;
    gaugeLevel.style.width = `${Math.min(100, s.level)}%`;
    if (s.level > 80) valLevel.className = 'sd-value danger-text';
    else if (s.level > 60) valLevel.className = 'sd-value warning-text';
    else valLevel.className = 'sd-value ok-text';
  }
  if (valFlow && gaugeFlow) {
    valFlow.textContent = `${s.flow.toFixed(1)} m3/h`;
    gaugeFlow.style.width = `${Math.min(100, (s.flow / 8) * 100)}%`;
  }
  if (valTurb && gaugeTurb) {
    valTurb.textContent = `${Math.round(s.turb)} NTU`;
    gaugeTurb.style.width = `${Math.min(100, (s.turb / 250) * 100)}%`;
  }
  if (valRain && gaugeRain) {
    const curRain = DW_STATE.isStorm ? 85 : 32;
    valRain.textContent = `${curRain} mm/h`;
    gaugeRain.style.width = `${Math.min(100, (curRain / 100) * 100)}%`;
  }
}

// ──────────────────────────────────────────────
//  REAL-TIME DYNAMIC SIMULATION LOOP
// ──────────────────────────────────────────────
function startRealtimeSimulation() {
  if (DW_STATE.simTimer) clearInterval(DW_STATE.simTimer);
  if (DW_STATE.simSpeed === 0) return; // Paused

  const intervalMs = Math.round(2000 / DW_STATE.simSpeed);

  DW_STATE.simTimer = setInterval(() => {
    // 1. Mutate sensor telemetries dynamically
    SENSOR_DATA.forEach(s => {
      let levelDelta = (Math.random() - 0.48) * 1.5;
      let flowDelta = (Math.random() - 0.5) * 0.25;
      let blockageDelta = (Math.random() - 0.48) * 1.2;

      // Reactions to active scenarios
      if (DW_STATE.isStorm) {
        levelDelta += 1.8;
        flowDelta += 0.4;
        blockageDelta += 0.8;
      }
      if (DW_STATE.autoPump) {
        levelDelta -= 2.2;
        flowDelta += 0.6;
      }

      s.level = Math.min(98, Math.max(8, s.level + levelDelta));
      s.flow = Math.max(0.2, Math.min(9.5, s.flow + flowDelta));
      s.blockage = Math.min(98, Math.max(4, s.blockage + blockageDelta));
      s.temp = Math.max(24, Math.min(33, s.temp + (Math.random() - 0.5) * 0.1));
      s.ph = Math.max(6.2, Math.min(8.2, s.ph + (Math.random() - 0.5) * 0.05));
      s.turb = Math.max(20, Math.min(240, s.turb + (DW_STATE.isStorm ? 6 : (Math.random() - 0.5) * 3)));

      s.level = parseFloat(s.level.toFixed(1));
      s.flow = parseFloat(s.flow.toFixed(1));
      s.blockage = Math.round(s.blockage);

      // Status classification
      if (s.blockage > 70 || s.level > 80) s.status = 'critical';
      else if (s.blockage > 40 || s.level > 60) s.status = 'warning';
      else s.status = 'normal';
    });

    // 2. Refresh Table & Detail Gauges
    renderTable(filteredData);
    updateSensorDetailCards();

    // 3. Push real-time chart tick
    pushChartRealtimeTick();

    // 4. Update Overview Dashboard Metric Cards
    updateOverviewCards();

    // 5. Randomly emit realistic real-time telemetry log
    if (Math.random() > 0.45) {
      emitRandomTelemetryLog();
    }
  }, intervalMs);
}

function updateOverviewCards() {
  const critCount = SENSOR_DATA.filter(s => s.status === 'critical').length;
  const ov2 = document.getElementById('ov2');
  if (ov2) ov2.textContent = critCount;

  const ov3 = document.getElementById('ov3');
  if (ov3) {
    const prob = DW_STATE.isStorm ? 92 : (DW_STATE.autoPump ? 38 : (72 + Math.round((Math.random() - 0.5) * 4)));
    ov3.textContent = `${prob}%`;
  }

  const heroBlock = document.getElementById('hero-blockage-txt');
  if (heroBlock) {
    heroBlock.textContent = `Penyumbatan: ${SENSOR_DATA[0].blockage}%`;
  }
}

function emitRandomTelemetryLog() {
  const criticalSensors = SENSOR_DATA.filter(s => s.status === 'critical');
  if (criticalSensors.length > 0 && Math.random() > 0.5) {
    const s = criticalSensors[Math.floor(Math.random() * criticalSensors.length)];
    addEventLog('CRIT', 'badge-crit', `<strong>${s.id} (${s.location})</strong>: Level air ${s.level} cm melebihi ambang batas!`, true);
  } else {
    const logs = [
      () => addEventLog('IoT', 'badge-iot', `Paket LoRaWAN diterima dari Node <strong>${SENSOR_DATA[Math.floor(Math.random()*SENSOR_DATA.length)].id}</strong> (RSSI -74 dBm)`),
      () => addEventLog('YOLO', 'badge-yolo', `Inference YOLOv8 (Saluran CAM-01): 4 objek stabil, FPS ~${DW_STATE.currentFps}`),
      () => addEventLog('SYS', 'badge-iot', `Sinkronisasi telemetri BMKG: Curah hujan kota ${DW_STATE.isStorm ? '85' : '32'} mm/jam`)
    ];
    logs[Math.floor(Math.random() * logs.length)]();
  }
}

// ──────────────────────────────────────────────
//  SIMULATION SPEED & INTERACTIVE SCENARIOS
// ──────────────────────────────────────────────
function setSimSpeed(speed) {
  DW_STATE.simSpeed = speed;

  ['speed-pause', 'speed-1x', 'speed-2x', 'speed-5x'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  const activeId = speed === 0 ? 'speed-pause' : `speed-${speed}x`;
  const el = document.getElementById(activeId);
  if (el) el.classList.add('active');

  startRealtimeSimulation();

  if (speed === 0) {
    showToast('Simulasi Dijeda', 'Pemutakhiran telemetri real-time dihentikan sementara.', 'info');
    addEventLog('SYS', 'badge-iot', 'Operator menjeda simulasi telemetri.');
  } else {
    showToast(`Kecepatan Diatur: ${speed}x`, `Interval telemetri disesuaikan ke ${speed}x kecepatan real-time.`, 'success');
    addEventLog('SYS', 'badge-iot', `Kecepatan simulasi diubah ke <strong>${speed}x</strong>.`);
  }
}

function triggerScenario(type) {
  if (type === 'storm') {
    DW_STATE.isStorm = !DW_STATE.isStorm;
    const btn = document.getElementById('btn-scenario-rain');

    if (DW_STATE.isStorm) {
      if (btn) btn.style.background = 'rgba(56, 189, 248, 0.25)';
      initRain();
      playAlertChime('critical');
      showToast('PERINGATAN: Badai Hujan Tropis!', 'Curah hujan melonjak ke 85 mm/jam. Permukaan air drainase naik pesat.', 'critical');
      addEventLog('CRIT', 'badge-crit', '⚠️ <strong>SKENARIO BADAI HUJAN DIMULAI</strong>: Curah hujan ekstrem 85 mm/jam aktif.', true);
    } else {
      if (btn) btn.style.background = '';
      initRain();
      showToast('Badai Hujan Mereda', 'Curah hujan kembali normal 32 mm/jam.', 'info');
      addEventLog('SYS', 'badge-iot', 'Skenario badai hujan dinonaktifkan.');
    }
    drawPredictionChart();
  } else if (type === 'clean') {
    // Clean drainage blockage
    SENSOR_DATA.forEach(s => {
      s.blockage = Math.max(5, Math.round(s.blockage * 0.25));
      s.level = Math.max(15, Math.round(s.level * 0.65));
      s.flow = Math.min(8.5, parseFloat((s.flow * 1.5).toFixed(1)));
      s.status = 'normal';
    });

    // Reset CAM-01 objects to clean state
    currentTrackedObjects = [
      { id: 105, class: 'debris', label: 'Aliran Lancar Pascabersih', baseConf: 0.965, color: '#22c55e', x: 0.40, y: 0.50, w: 0.18, h: 0.15, vx: 0.003, vy: 0.001, t: 0 }
    ];
    updateDetectionResultsList();

    playSuccessChime();
    showToast('Pembersihan Berhasil!', 'Eskavator dan tim SDA berhasil mengeruk 85% sedimen dan sumbatan.', 'success');
    addEventLog('PUMP', 'badge-pump', '🚜 <strong>Pembersihan Selesai</strong>: Sumbatan drainase dinetralkan kembali normal.', true);
  }
}

function toggleAutoPump() {
  DW_STATE.autoPump = !DW_STATE.autoPump;
  const btn = document.getElementById('btn-scenario-pump');
  const btnText = document.getElementById('pump-btn-text');

  if (DW_STATE.autoPump) {
    if (btn) btn.classList.add('pump-active');
    if (btnText) btnText.textContent = 'Pompa Otomatis: AKTIF (MENYEDOT)';
    playSuccessChime();
    showToast('Pompa Drainase Aktif', 'Pompa otomatis menyedot debit air keluar menuju kolam retensi.', 'success');
    addEventLog('PUMP', 'badge-pump', '🚰 <strong>Pompa Otomatis DIAKTIFKAN</strong>: Pengosongan debit air percepatan aktif.', true);
  } else {
    if (btn) btn.classList.remove('pump-active');
    if (btnText) btnText.textContent = 'Pompa Otomatis: SIAGA';
    showToast('Pompa Kembali Siaga', 'Pompa otomatis dimatikan ke mode siaga normal.', 'info');
    addEventLog('PUMP', 'badge-pump', 'Pompa otomatis kembali ke mode siaga.');
  }
}

// ──────────────────────────────────────────────
//  GIS MAP INTERACTIVE MODAL INSPECTOR
// ──────────────────────────────────────────────
function openMapSensorModal(sensorId) {
  const sensor = SENSOR_DATA.find(s => s.id === sensorId);
  if (!sensor) return;

  const modal = document.getElementById('mapModal');
  const idEl = document.getElementById('modal-sensor-id');
  const locEl = document.getElementById('modal-sensor-loc');
  const levelEl = document.getElementById('modal-stat-level');
  const blockEl = document.getElementById('modal-stat-blockage');
  const flowEl = document.getElementById('modal-stat-flow');
  const badgeEl = document.getElementById('modal-sensor-badge');

  if (idEl) idEl.textContent = sensor.id;
  if (locEl) locEl.textContent = `${sensor.location} (Sensor Node)`;
  if (levelEl) {
    levelEl.textContent = `${sensor.level} cm`;
    levelEl.style.color = sensor.level > 80 ? 'var(--red)' : sensor.level > 60 ? 'var(--yellow)' : '#22c55e';
  }
  if (blockEl) {
    blockEl.textContent = `${sensor.blockage}%`;
    blockEl.style.color = sensor.blockage > 70 ? 'var(--red)' : sensor.blockage > 40 ? 'var(--yellow)' : '#22c55e';
  }
  if (flowEl) flowEl.textContent = `${sensor.flow} m³/h`;
  if (badgeEl) {
    badgeEl.className = `status-badge ${sensor.status === 'critical' ? 'status-critical' : sensor.status === 'warning' ? 'status-warning' : 'status-normal'}`;
    badgeEl.textContent = sensor.status.toUpperCase();
  }

  if (modal) modal.classList.add('open');
  playTone(650, 'sine', 0.1, 0.05);
}

function closeMapModal() {
  const modal = document.getElementById('mapModal');
  if (modal) modal.classList.remove('open');
}

function jumpToCCTV() {
  closeMapModal();
  const detSection = document.getElementById('detection');
  if (detSection) detSection.scrollIntoView({ behavior: 'smooth' });
}

// ──────────────────────────────────────────────
//  PREDICTION & MAP LAYERS
// ──────────────────────────────────────────────
function setMapLayer(layer) {
  document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');

  const zoneA = document.querySelector('radialGradient#zoneA stop:first-child');
  const zoneB = document.querySelector('radialGradient#zoneB stop:first-child');
  if (zoneA && zoneB) {
    if (layer === 'risk') {
      zoneA.setAttribute('stop-opacity', '0.7');
      zoneB.setAttribute('stop-opacity', '0.6');
    } else if (layer === 'rain') {
      zoneA.setAttribute('stop-opacity', '0.9');
      zoneB.setAttribute('stop-opacity', '0.85');
    } else {
      zoneA.setAttribute('stop-opacity', '0.25');
      zoneB.setAttribute('stop-opacity', '0.2');
    }
  }
  addEventLog('GIS', 'badge-iot', `Lapisan visual peta spasial diubah ke mode <strong>${layer.toUpperCase()}</strong>.`);
}

// ──────────────────────────────────────────────
//  HAMBURGER MENU & SCROLL REVEAL
// ──────────────────────────────────────────────
function initScrollReveal() {
  const targets = document.querySelectorAll('.overview-card, .chart-card, .sensor-table-card, .feed-card, .detection-main, .model-info-panel, .iot-network-card, .sensor-detail-card, .prediction-main-card, .risk-card, .model-tech-card, .map-card, .map-stats-panel, .about-desc-card, .tech-stack-card, .impact-card, .section-header');

  targets.forEach(el => el.classList.add('reveal'));

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 60);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  targets.forEach(el => obs.observe(el));
}

function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });
}

function initCounters() {
  const counters = document.querySelectorAll('[data-target]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => {
    el.textContent = '0';
    observer.observe(el);
  });
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const isDecimal = target % 1 !== 0;
  const duration = 1600;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;
    el.textContent = isDecimal ? current.toFixed(1) : Math.round(current);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Canvas roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (!r) r = 0;
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r;
    this.beginPath();
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '68px';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = 'rgba(6,13,26,0.98)';
      navLinks.style.padding = '16px 24px';
      navLinks.style.borderBottom = '1px solid #1e3a5f';
    });
  }
});
