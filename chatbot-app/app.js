// =================== BACKGROUND PARTICLE FIELD ===================
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let W, H, particles = [], nodes = [], animFrame;

// Reduced counts: 80→30 particles, 20→8 nodes
const PARTICLE_COUNT = 30;
const NODE_COUNT = 8;

// Throttle canvas to ~20 fps (50 ms between frames)
const FRAME_INTERVAL = 50;
let lastFrameTime = 0;

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.05
    });
  }
  nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    });
  }
}

function drawBG(timestamp) {
  // Throttle: skip frame if not enough time has passed
  if (timestamp - lastFrameTime < FRAME_INTERVAL) {
    animFrame = requestAnimationFrame(drawBG);
    return;
  }
  lastFrameTime = timestamp;

  ctx.clearRect(0, 0, W, H);

  // Grid – single path for all lines (much faster than one stroke per line)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(79,142,247,0.03)';
  ctx.lineWidth = 1;
  const gSize = 60;
  for (let x = 0; x < W; x += gSize) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y < H; y += gSize) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  // Node connections – single style set, batched per segment
  ctx.lineWidth = 0.5;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 250) {
        ctx.strokeStyle = `rgba(34,211,200,${0.06 * (1 - dist / 200)})`;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }

  // Moving nodes
  ctx.fillStyle = 'rgba(34,211,200,0.15)';
  nodes.forEach(n => {
    n.x += n.vx; n.y += n.vy;
    if (n.x < 0 || n.x > W) n.vx *= -1;
    if (n.y < 0 || n.y > H) n.vy *= -1;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Particles – batch same fill style
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(79,142,247,${p.alpha})`;
    ctx.fill();
  });

  animFrame = requestAnimationFrame(drawBG);
}

resize();
initParticles();
requestAnimationFrame(drawBG);
window.addEventListener('resize', () => { resize(); initParticles(); });

// =================== UNIFIED MOUSEMOVE (throttled via rAF) ===================
let _mousePending = false;
document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (_mousePending) return;
  _mousePending = true;
  requestAnimationFrame(() => {
    const x = mouseX / window.innerWidth - 0.5;
    const y = mouseY / window.innerHeight - 0.5;
    const heroEl = document.querySelector('#hero');
    if (heroEl) {
      heroEl.style.transform =
        `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg)`;
    }
    const orbEl = document.querySelector('.ai-orb');
    if (orbEl) {
      orbEl.style.transform =
        `translateX(calc(-50% + ${x * 60}px)) translateY(${y * 60}px)`;
    }
    _mousePending = false;
  });
});

// =================== PAGE NAVIGATION ===================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  document.getElementById(page + '-page').classList.add('active');
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  window.scrollTo(0, 0);
  if (page === 'dashboard') initDashboard();
  if (page === 'vehicle') initVehiclePage();
  if (page === 'home') initHomeCharts();
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// =================== COUNTERS ===================
function animateCounters() {
  document.querySelectorAll('.counter').forEach(el => {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();
    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

// =================== BAR ANIMATIONS ===================
function animateBars() {
  document.querySelectorAll('.bar-fill, .ex-bar-fill').forEach(el => {
    setTimeout(() => {
      el.style.width = el.dataset.width + '%';
    }, 300 + Math.random() * 400);
  });
}

// =================== CHART DEFAULTS ===================
const chartDefaults = {
  color: 'rgba(200,215,255,0.65)',
  font: { family: "'DM Sans', sans-serif", size: 11 },
  borderColor: 'rgba(255,255,255,0.05)',
  backgroundColor: 'rgba(255,255,255,0.03)',
};

function makeGradient(ctx, color, opacity1 = 0.4, opacity2 = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `,${opacity1})`));
  g.addColorStop(1, color.replace('rgb', 'rgba').replace(')', `,${opacity2})`));
  return g;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];

// Guard: track which charts have been initialised to avoid duplicate Chart instances
let chartsInit = {};

// =================== HOME CHARTS ===================
function initHomeCharts() {
  if (chartsInit.home) return;
  chartsInit.home = true;
  setTimeout(() => {
    const el = document.getElementById('homeExceptionChart');
    if (!el) return;
    if (el._chartInstance) el._chartInstance.destroy();
    el._chartInstance = new Chart(el, {
      type: 'line',
      data: {
        labels: WEEKS,
        datasets: [
          { label: 'Overspeed', data: [180, 210, 195, 240, 220, 310, 290, 260, 285, 240, 195, 170], borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2 },
          { label: 'Harsh Braking', data: [90, 110, 105, 130, 120, 160, 148, 135, 142, 118, 95, 85], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.06)', tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2 },
          { label: 'Night Driving', data: [60, 55, 70, 65, 80, 72, 88, 76, 70, 62, 55, 50], borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.05)', tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1500, easing: 'easeInOutQuart' },
        plugins: { legend: { labels: { color: 'rgba(200,215,255,0.6)', font: { size: 11 } } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(200,215,255,0.4)', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(200,215,255,0.4)', font: { size: 10 } } }
        }
      }
    });
  }, 500);
}

// =================== DASHBOARD ===================
function initDashboard() {
  animateCounters();

  fetch("http://127.0.0.1:8000/exceptions")
    .then(res => res.json())
    .then(data => {
      document.getElementById("overspeedCount").innerText = data["Overspeed"] || 0;
      document.getElementById("brakingCount").innerText = data["Harsh Braking"] || 0;
      document.getElementById("nightCount").innerText = data["Night Driving"] || 0;
      document.getElementById("accelCount").innerText = data["Harsh Acceleration"] || 0;
      document.getElementById("totalExceptionCount").innerText =
        Object.values(data).reduce((a, b) => a + b, 0);
    })
    .catch(console.error);

  // Risk Table
  const vehicles = [
    { id: '414', score: 72, exceptions: 3, risk: 'HIGH' },
    { id: '297', score: 82, exceptions: 2, risk: 'MED' },
    { id: '242', score: 90, exceptions: 1, risk: 'LOW' },
    { id: '285', score: 92, exceptions: 1, risk: 'LOW' },
    { id: '5335', score: 100, exceptions: 0, risk: 'LOW' }
  ];
  const tbody = document.getElementById('risk-table-body');
  if (tbody) {
    tbody.innerHTML = vehicles.map(v => `
      <tr style="cursor:pointer" onclick="loadVehicle('${v.id}')">
        <td><strong style="font-family:var(--font-display);font-weight:700">${v.id}</strong></td>
        <td style="color:${v.score < 65 ? 'var(--red)' : 'var(--amber)'}">${v.score}</td>
        <td>${v.exceptions}</td>
        <td><span class="risk-badge risk-${v.risk === 'HIGH' ? 'high' : 'med'}">${v.risk}</span></td>
      </tr>
    `).join('');
  }

  // AI Insights
  const insights = document.getElementById('ai-insights');
  if (insights) {
    const items = [
      { color: 'var(--red)', tag: 'Critical', text: 'Vehicle 414 currently has the highest exception count in the dataset.' },
      { color: 'var(--amber)', tag: 'Warning', text: 'Overspeed remains the most frequently observed safety exception.' },
      { color: 'var(--teal)', tag: 'Recommendation', text: 'Vehicles with lower safety scores should be prioritized for review.' },
      { color: 'var(--purple)', tag: 'AI Insight', text: 'Safety score and exception diversity are used for vehicle recommendations.' }
    ];
    insights.innerHTML = items.map(i => `
      <div class="insight-item">
        <div class="insight-dot" style="background:${i.color}"></div>
        <div>
          <div class="insight-tag" style="color:${i.color}">${i.tag}</div>
          <div class="insight-text">${i.text}</div>
        </div>
      </div>
    `).join('');
  }

  if (chartsInit.dashboard) return;
  chartsInit.dashboard = true;

  setTimeout(() => {
    const trendEl = document.getElementById('trendChart');
    if (trendEl) {
      if (trendEl._chartInstance) trendEl._chartInstance.destroy();
      trendEl._chartInstance = new Chart(trendEl, {
        type: 'bar',
        data: {
          labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
          datasets: [
            { label: 'Overspeed', data: [12, 18, 25, 16], backgroundColor: 'rgba(248,113,113,0.7)', borderRadius: 4, stack: 'a' },
            { label: 'Harsh Braking', data: [8, 12, 10, 6], backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4, stack: 'a' },
            { label: 'Night Driving', data: [4, 6, 5, 3], backgroundColor: 'rgba(167,139,250,0.7)', borderRadius: 4, stack: 'a' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 1200 },
          plugins: { legend: { labels: { color: 'rgba(200,215,255,0.6)', font: { size: 11 } } } },
          scales: {
            x: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(200,215,255,0.4)', font: { size: 10 } } },
            y: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(200,215,255,0.4)', font: { size: 10 } } }
          }
        }
      });
    }

    const riskEl = document.getElementById('riskChart');
    if (riskEl) {
      if (riskEl._chartInstance) riskEl._chartInstance.destroy();
      riskEl._chartInstance = new Chart(riskEl, {
        type: 'doughnut',
        data: {
          labels: ['Low Risk', 'Medium Risk', 'High Risk', 'Critical'],
          datasets: [{
            data: [45, 30, 15, 10],
            backgroundColor: [
              'rgba(52,211,153,0.8)', 'rgba(245,158,11,0.8)',
              'rgba(248,113,113,0.8)', 'rgba(239,68,68,0.9)'
            ],
            borderWidth: 0, hoverOffset: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 1400, animateRotate: true },
          cutout: '65%',
          plugins: { legend: { position: 'bottom', labels: { color: 'rgba(200,215,255,0.6)', font: { size: 11 }, padding: 12 } } }
        }
      });
    }

    const driverEl = document.getElementById('driverChart');
    if (driverEl) {
      if (driverEl._chartInstance) driverEl._chartInstance.destroy();
      driverEl._chartInstance = new Chart(driverEl, {
        type: 'bar',
        data: {
          labels: ['0-20', '21-40', '41-60', '61-80', '81-100'],
          datasets: [{ label: 'Drivers', data: [23, 87, 312, 478, 384], backgroundColor: ['rgba(248,113,113,0.8)', 'rgba(248,113,113,0.7)', 'rgba(245,158,11,0.8)', 'rgba(52,211,153,0.7)', 'rgba(52,211,153,0.9)'], borderRadius: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 1000 },
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(200,215,255,0.4)', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(200,215,255,0.4)', font: { size: 10 } } }
          }
        }
      });
    }
  }, 200);
}

// =================== VEHICLE PAGE ===================
const vehicleData = {
  '414': { score: 72, risk: 'high', exceptions: 3, title: 'Vehicle 414', grade: 'C' },
  '297': { score: 82, risk: 'medium', exceptions: 2, title: 'Vehicle 297', grade: 'B' },
  '242': { score: 90, risk: 'low', exceptions: 1, title: 'Vehicle 242', grade: 'A' },
  '285': { score: 92, risk: 'low', exceptions: 1, title: 'Vehicle 285', grade: 'A' },
  '5335': { score: 100, risk: 'low', exceptions: 0, title: 'Vehicle 5335', grade: 'A+' }
};

let currentVehicle = '414';

function loadVehicle(id) {
  currentVehicle = id;
  showPage('vehicle');
}

function initVehiclePage() {
  const vd = vehicleData[currentVehicle] || vehicleData['414'];
  document.getElementById('vd-title').textContent = `Vehicle ${currentVehicle}`;
  document.getElementById('vd-id').textContent = currentVehicle;
  document.getElementById('vd-score').textContent = vd.score;
  document.getElementById('vd-exceptions').textContent = vd.exceptions;
  const gradeEl = document.getElementById('vd-grade');
  if (gradeEl) gradeEl.textContent = vd.grade || 'N/A';
  const badge = document.getElementById('vd-risk-badge');
  badge.className = 'risk-badge risk-' + vd.risk;
  badge.textContent = vd.risk.toUpperCase() + ' RISK';

  setTimeout(() => {
    const arc = document.getElementById('score-arc');
    const circumference = 263.9;
    const offset = circumference - (vd.score / 100) * circumference;
    arc.style.strokeDashoffset = offset;
    arc.style.stroke = vd.score < 65 ? '#f87171' : vd.score < 80 ? '#f59e0b' : '#34d399';
  }, 300);

  setTimeout(animateBars, 400);

  if (!chartsInit['vehicle_' + currentVehicle]) {
    chartsInit['vehicle_' + currentVehicle] = true;
    setTimeout(() => {
      const el = document.getElementById('vehicleTimelineChart');
      if (!el) return;
      if (el._chartInstance) el._chartInstance.destroy();
      const baseData = [30, 25, 38, 42, 35, 48, 52, 44, 38, 32, 28, 22];
      el._chartInstance = new Chart(el, {
        type: 'line',
        data: {
          labels: WEEKS,
          datasets: [{
            label: 'Total Exceptions',
            data: baseData.map(d => Math.round(d * (vd.exceptions / 35))),
            borderColor: '#f87171',
            backgroundColor: 'rgba(248,113,113,0.08)',
            tension: 0.4, fill: true, pointRadius: 3,
            pointBackgroundColor: '#f87171', borderWidth: 2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 1200 },
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(200,215,255,0.4)', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(200,215,255,0.4)', font: { size: 10 } } }
          }
        }
      });
    }, 200);
  }
}

// =================== SIDEBAR ===================
async function initSidebar() {
  const sb = document.getElementById("sidebar-vehicles");
  if (!sb) return;
  try {
    const response = await fetch("http://127.0.0.1:8000/vehicles");
    const vehicles = await response.json();
    sb.innerHTML = vehicles.map(v => `
      <div class="sidebar-vehicle" onclick="loadVehicle('${v.vehicle_id}')">
        <div>
          <div class="sv-id">${v.vehicle_id}</div>
          <div class="sv-meta">Score: ${v.safety_score}/100</div>
        </div>
        <div class="sv-dot" style="background:${v.risk === 'high' ? '#ef4444' : v.risk === 'medium' ? '#f59e0b' : '#22c55e'}"></div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Sidebar fetch failed:', e);
  }
}
initSidebar();

// =================== CHATBOT ===================

// Colour lookup used by formatAIText – avoids repeated object creation
const _LEVEL_COLORS = {
  Low: '#22c55e',
  Medium: '#f59e0b',
  Moderate: '#f59e0b',
  High: '#ef4444',
};

function formatAIText(text) {
  console.time('formatAIText');

  // Single-pass replacements via a table – no chained .replace() calls
  const replacements = [
    // Risk level (both casings)
    [/(RISK LEVEL|Risk Level): (Low|Moderate|High)/g,
      (_, label, level) => `<span style="color:${_LEVEL_COLORS[level]};font-weight:700"> ${label}: ${level}</span>`],
    // Confidence (both casings)
    [/(CONFIDENCE|Confidence): (Low|Medium|High)/g,
      (_, label, level) => `<span style="color:${_LEVEL_COLORS[level]};font-weight:700"> ${label}: ${level}</span>`],
    // Grades – A+ must come before A to avoid partial match
    [/Grade: A\+/g, '<span class="grade-badge grade-badge-ap">🟢 Grade A+</span>'],
    [/Grade: A(?!\+)/g, '<span class="grade-badge grade-badge-a">🟢 Grade A</span>'],
    [/Grade: B/g, '<span class="grade-badge grade-badge-b">🟡 Grade B</span>'],
    [/Grade: C/g, '<span class="grade-badge grade-badge-c">🟠 Grade C</span>'],
    [/Grade: D/g, '<span class="grade-badge grade-badge-d">🟠 Grade D</span>'],
    [/Grade: F/g, '<span class="grade-badge grade-badge-f">🔴 Grade F</span>'],
    // Markdown bold
    [/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>'],
    // Bullet dots
    [/•\s*/g, ''],
  ];

  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  
  // HTML-safe newline conversion:
  // If the text contains HTML tables, clean up whitespace and newlines between HTML tags first
  if (result.includes('<table')) {
    result = result.replace(/>\s*\n\s*</g, '><');
  }
  
  // Newlines → <br> (faster than split/join)
  result = result.replace(/\n/g, '<br>');
  
  // Remove duplicate/excessive <br> tags
  result = result.replace(/(<br>\s*){3,}/g, '<br><br>');

  console.timeEnd('formatAIText');
  return result;
}

function renderVehicleCard(v) {
  return `
    <div class="vehicle-card">
      <div class="vehicle-header">
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Vehicle ID</div>
          <div class="vehicle-id-badge">${v.id}</div>
        </div>
        <div>
          <div class="risk-badge risk-${v.risk === 'HIGH' || v.risk === 'CRITICAL' ? 'high' : v.risk === 'MED' ? 'med' : 'low'}">${v.risk} RISK</div>
        </div>
      </div>
      <div class="vehicle-stats">
        <div class="v-stat">
          <div class="v-stat-num" style="color:${v.score < 65 ? 'var(--red)' : v.score < 80 ? 'var(--amber)' : 'var(--green)'}">${v.score}</div>
          <div class="v-stat-label">Safety Score</div>
        </div>
        <div class="v-stat">
          <div class="v-stat-num" style="color:var(--red)">${v.exceptions}</div>
          <div class="v-stat-label">Exceptions</div>
        </div>
        <div class="v-stat">
          <div class="v-stat-num" style="color:var(--amber)">${100 - v.score}</div>
          <div class="v-stat-label">Risk Index</div>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;padding:10px" onclick="loadVehicle('${v.id}')">View Full Profile →</button>
    </div>
  `;
}

function renderRecommendations(recs) {
  return `<div class="recommendations" style="margin-top:8px">
    ${recs.map(r => `<div class="rec-item"><div class="rec-icon">💡</div><div style="font-size:13px">${r}</div></div>`).join('')}
  </div>`;
}

function addMessage(role, content, extra = '') {
  const chatWindow = document.getElementById('chat-window');  // fixed: was `window` (shadowed global)
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="msg-avatar ${role === 'user' ? 'user-av' : 'ai'}">${role === 'user' ? 'U' : '⬡'}</div>
    <div class="msg-body">
      <div class="msg-bubble ${role === 'user' ? 'user' : 'ai'}">${content}</div>
      ${extra}
    </div>
  `;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div;
}

function addTyping() {
  const chatWindow = document.getElementById('chat-window');
  const div = document.createElement('div');
  div.className = 'msg';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="msg-avatar ai">⬡</div>
    <div class="msg-body">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTyping() {
  document.getElementById('typing-indicator')?.remove();
}

async function getAIResponse(input) {
  console.time('getAIResponse');
  const vehicleMatch = input.match(/\d+/);
  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        vehicleMatch
          ? { vehicle_id: parseInt(vehicleMatch[0]) }
          : { message: input }
      )
    });

    const data = await response.json();
    console.log("BACKEND RESPONSE:", data);

    if (data.reply) {
      console.timeEnd('getAIResponse');
      return { type: "text", text: data.reply };
    }

    // Clean up analysis to exclude Recommended Vehicle, Recommended Usage, Risk Contribution %
    let cleanedAnalysis = data.ai_analysis || '';
    cleanedAnalysis = cleanedAnalysis
      .split('\n')
      .filter(line => {
        const l = line.toLowerCase();
        return !l.includes('recommended vehicle') && 
               !l.includes('recommended usage') && 
               !l.includes('risk contribution');
      })
      .join('\n')
      .trim();

    // Dynamically build Exception Breakdown rows
    const breakdownRows = data.breakdown && Object.entries(data.breakdown).length > 0
      ? Object.entries(data.breakdown)
          .map(([type, count]) => `<tr><td>${type}</td><td>${count}</td></tr>`)
          .join('')
      : '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No exceptions recorded</td></tr>';

    console.timeEnd('getAIResponse');
    return {
      type: "text",
      text: `<div class="aegis-table-container">
  <div class="table-title">Table 1: Vehicle Summary</div>
  <table class="aegis-table">
    <thead>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Vehicle ID</td><td>TT${data.vehicle_id}</td></tr>
      <tr><td>Driver Name</td><td>${data.driver_name}</td></tr>
      <tr><td>Safety Score</td><td>${data.safety_score}</td></tr>
      <tr><td>Grade</td><td>Grade: ${data.grade}</td></tr>
      <tr><td>Risk Level</td><td>Risk Level: ${data.risk_level}</td></tr>
      <tr><td>Confidence</td><td>Confidence: ${data.confidence}</td></tr>
      <tr><td>Trips Analyzed</td><td>${data.total_trips}</td></tr>
      <tr><td>Past Total Exceptions</td><td>${data.total_exceptions}</td></tr>
      <tr><td>Unique Exception Types</td><td>${data.unique_exception_types}</td></tr>
      <tr><td>Highest Risk Exception</td><td>${data.highest_risk_exception}</td></tr>
    </tbody>
  </table>
</div>

<div class="aegis-table-container">
  <div class="table-title">Table 2: Exception Breakdown</div>
  <table class="aegis-table">
    <thead>
      <tr>
        <th>Exception Type</th>
        <th>Count</th>
      </tr>
    </thead>
    <tbody>
      ${breakdownRows}
    </tbody>
  </table>
</div>

<div class="aegis-table-container">
  <div class="table-title">Table 3: AI Analysis</div>
  <table class="aegis-table">
    <thead>
      <tr>
        <th>Analysis</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="ai-analysis-cell">${cleanedAnalysis}</td>
      </tr>
    </tbody>
  </table>
</div>`
    };
  } catch (err) {
    console.error("FULL ERROR:", err);
    if (err.stack) console.error(err.stack);
    console.timeEnd('getAIResponse');
    return { type: "text", text: "Failed to connect." };
  }
}

let isProcessing = false;

function sendPrompt(text) {
  const input = document.getElementById('chat-input');
  if (input) input.value = text;
  submitChat();
}

async function submitChat() {
  if (isProcessing) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const sp = document.getElementById('suggested-prompts');
  if (sp) sp.style.display = 'none';

  input.value = '';
  input.style.height = '';
  isProcessing = true;

  console.time('addMessage-user');
  addMessage('user', text);
  console.timeEnd('addMessage-user');

  addTyping();

  // Removed artificial 900-1700 ms delay – fetch starts immediately.
  // The typing indicator provides the visual feedback while waiting.
  const response = await getAIResponse(text);
  removeTyping();

  console.time('addMessage-ai');
  if (response.type === 'vehicle') {
    addMessage('ai', formatAIText(response.analysis), renderVehicleCard(response.vehicle) + renderRecommendations(response.recs));
  } else {
    addMessage('ai', formatAIText(response.text));
  }
  console.timeEnd('addMessage-ai');

  isProcessing = false;
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitChat();
  }
}

function autoResize(el) {
  el.style.height = '';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// =================== CHECKBOX ===================
function toggleCheck(el) {
  el.classList.toggle('checked');
  el.textContent = el.classList.contains('checked') ? '✓' : '';
}

// =================== INIT ===================
window.addEventListener('load', () => {
  setTimeout(() => {
    animateCounters();
    animateBars();
    initHomeCharts();
  }, 400);
});
