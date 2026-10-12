/*
  光的反射游戏实验室 · 困难模式逻辑（注册为 hard）
  入口：index.html
*/

/* ==================== 困难模式逻辑 ==================== */
(function () {
'use strict';

/* ==================== 基础 ==================== */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreEl');
const timeEl = document.getElementById('timeEl');
const startScreen = document.getElementById('startScreen');
const endScreen = document.getElementById('endScreen');
const starsEl = document.getElementById('starsEl');
const finalScoreEl = document.getElementById('finalScore');
const finalHitsEl = document.getElementById('finalHits');
const bestLineEl = document.getElementById('bestLine');
const encourageEl = document.getElementById('encourageEl');
const btnAngles = document.getElementById('btnAngles');
const tipBanner = document.getElementById('tipBanner');

const DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0;
let sceneScale = 1;   // 世界坐标 → CSS 像素的缩放（教室大屏自动放大）

const laser = { x: 74, y: 300 };
const MAX_BOUNCES = 16;
const MIRROR_MAX_LEN = 320;

let mirrors = [];
let monster = null;
let drag = null;
let particles = [];
let floaters = [];
let stars = [];
let score = 0, hits = 0;
let timeLeft = 60;
let running = false;
let showAngles = false;
let respawnTimer = 0;
let shakeT = 0;
let trace = { pts: [], hit: null, reflections: [] };
let lastT = performance.now();

/* ==================== 工具 ==================== */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function makeStars() {
  stars = [];
  const n = Math.round((W * H) / 11000);
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.45 + 0.12,
      p: Math.random() * Math.PI * 2
    });
  }
}

function resize() {
  const cw = canvas.clientWidth || window.innerWidth;
  const ch = canvas.clientHeight || window.innerHeight;

  const prevW = W, prevH = H;
  sceneScale = clamp(Math.min(cw, ch) / 760, 1, 2);   // 大屏放大场景，方便投屏观看
  W = cw / sceneScale;
  H = ch / sceneScale;

  canvas.width = Math.round(cw * DPR);
  canvas.height = Math.round(ch * DPR);
  ctx.setTransform(DPR * sceneScale, 0, 0, DPR * sceneScale, 0, 0);

  // 缩放变化时按比例保留已画的镜子
  if (prevW > 0 && prevH > 0 && mirrors.length) {
    const kx = W / prevW, ky = H / prevH;
    for (const m of mirrors) {
      m.a.x *= kx; m.a.y *= ky;
      m.b.x *= kx; m.b.y *= ky;
    }
  }

  laser.x = 74;
  laser.y = Math.round(H / 2);
  makeStars();
}

/* ==================== 音效 ==================== */
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
  }
}
function beep(freq, freq2, dur, vol, type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();   // iOS 从后台回来时可能被挂起
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, freq2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

/* ==================== 光线追踪 ==================== */
function segIntersect(p, d, a, b) {
  const rx = d.x, ry = d.y;
  const sx = b.x - a.x, sy = b.y - a.y;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const qx = a.x - p.x, qy = a.y - p.y;
  const t = (qx * sy - qy * sx) / denom;
  const u = (qx * ry - qy * rx) / denom;
  if (t > 0.5 && u >= 0 && u <= 1) {
    return { t, point: { x: p.x + rx * t, y: p.y + ry * t } };
  }
  return null;
}

function rayCircle(p, d, cx, cy, r) {
  const ox = p.x - cx, oy = p.y - cy;
  const b = ox * d.x + oy * d.y;
  const cc = ox * ox + oy * oy - r * r;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  let t = -b - sq;
  if (t < 0.5) t = -b + sq;
  if (t < 0.5) return null;
  return { t, point: { x: p.x + d.x * t, y: p.y + d.y * t } };
}

function tToBoundary(p, d) {
  let t = 6000;
  const M = 80;
  if (d.x > 1e-9) t = Math.min(t, (W + M - p.x) / d.x);
  if (d.x < -1e-9) t = Math.min(t, (-M - p.x) / d.x);
  if (d.y > 1e-9) t = Math.min(t, (H + M - p.y) / d.y);
  if (d.y < -1e-9) t = Math.min(t, (-M - p.y) / d.y);
  return Math.max(t, 1);
}

function traceLaser() {
  const start = { x: laser.x + 14, y: laser.y };
  const pts = [{ x: start.x, y: start.y }];
  let p = { x: start.x, y: start.y };
  let d = { x: 1, y: 0 };
  let hit = null;
  const reflections = [];

  for (let b = 0; b < MAX_BOUNCES; b++) {
    let best = null;

    for (let i = 0; i < mirrors.length; i++) {
      const m = mirrors[i];
      const r = segIntersect(p, d, m.a, m.b);
      if (r && (!best || r.t < best.t)) {
        best = { t: r.t, point: r.point, type: 'mirror', mirror: m };
      }
    }

    if (monster && monster.alive) {
      const r = rayCircle(p, d, monster.x, monster.y, monster.r);
      if (r && (!best || r.t < best.t)) {
        best = { t: r.t, point: r.point, type: 'monster' };
      }
    }

    const tb = tToBoundary(p, d);
    if (!best || tb < best.t) {
      best = { t: tb, point: { x: p.x + d.x * tb, y: p.y + d.y * tb }, type: 'wall' };
    }

    pts.push(best.point);

    if (best.type === 'mirror') {
      const m = best.mirror;
      let nx = -(m.b.y - m.a.y);
      let ny = (m.b.x - m.a.x);
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;

      const dot = d.x * nx + d.y * ny;
      const nd = { x: d.x - 2 * dot * nx, y: d.y - 2 * dot * ny };

      if (reflections.length < 6) {
        reflections.push({
          point: best.point,
          inDir: { x: d.x, y: d.y },
          outDir: { x: nd.x, y: nd.y },
          normal: { x: nx, y: ny }
        });
      }
      d = nd;
      p = best.point;
    } else if (best.type === 'monster') {
      hit = best.point;
      break;
    } else {
      break;
    }
  }
  return { pts, hit, reflections };
}

/* ==================== 怪物 ==================== */
function spawnMonster() {
  const r = 26;
  let x = 0, y = 0;
  // 顶部/底部留出空间，避免怪物被 HUD 按钮挡住
  const topPad = Math.max(120, H * 0.18);
  const botPad = Math.max(70, H * 0.09);
  for (let i = 0; i < 80; i++) {
    x = rand(W * 0.32, Math.max(W * 0.5, W - 80));
    y = rand(topPad, Math.max(topPad + 40, H - botPad));
    if (Math.abs(y - laser.y) < 95) continue;                 // 避开激光初始路径
    if (Math.hypot(x - laser.x, y - laser.y) < 150) continue; // 别贴着激光源
    break;
  }
  monster = {
    x, y, r,
    alive: true,
    seed: Math.random() * 10,
    born: performance.now()
  };
}

function onHit(p) {
  if (!monster || !monster.alive) return;
  monster.alive = false;
  score += 10;
  hits++;
  respawnTimer = 0.35;
  shakeT = 0.32;

  spawnExplosion(p.x, p.y);
  addFloater(p.x, p.y - 34, '+10');
  beep(880, 160, 0.22, 0.10, 'square');
  beep(1600, 500, 0.12, 0.06, 'triangle');
}

/* ==================== 粒子 & 飘字 ==================== */
function spawnExplosion(x, y) {
  const colors = ['#7CFF6B', '#FFD93D', '#FF6B6B', '#4DD0E1', '#ffffff'];
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(70, 420);
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: rand(0.4, 0.95),
      maxLife: 0.95,
      size: rand(2, 5.5),
      color: colors[(Math.random() * colors.length) | 0]
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 380 * dt;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function addFloater(x, y, text) {
  floaters.push({ x, y, text, life: 1.0, maxLife: 1.0 });
}

function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.y -= 55 * dt;
    f.life -= dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }
}

function drawFloaters() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of floaters) {
    const a = clamp(f.life / f.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(255,180,60,.9)';
    ctx.shadowBlur = 14;
    ctx.fillText(f.text, f.x, f.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

/* ==================== 绘制 ==================== */
function drawStars() {
  const t = performance.now() / 1000;
  for (const s of stars) {
    const a = s.a * (0.55 + 0.45 * Math.sin(t * 1.6 + s.p));
    ctx.fillStyle = 'rgba(180,215,255,' + a.toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMirror(a, b, preview) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const tx = dx / L, ty = dy / L;                 // 镜面方向
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;

  // 镜背方向：取背离激光源的一侧，使反射面始终朝向入射光
  let bx = -ty, by = tx;
  if (bx * (laser.x - mx) + by * (laser.y - my) > 0) { bx = -bx; by = -by; }

  ctx.save();
  ctx.lineCap = 'round';

  // 外发光
  ctx.shadowColor = preview ? 'rgba(120,225,255,.95)' : 'rgba(80,175,255,.85)';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = preview ? 'rgba(150,230,255,.8)' : 'rgba(150,215,255,.95)';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

  // 镜面本体
  ctx.shadowBlur = 0;
  ctx.strokeStyle = preview ? '#e6f8ff' : '#ffffff';
  ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

  // 镜背斜线：物理课本中表示平面镜背面的画法
  const hx = (bx + tx) * Math.SQRT1_2, hy = (by + ty) * Math.SQRT1_2;  // 与镜面成 45°
  const hlen = 12;
  const count = Math.max(1, Math.floor(L / 15));
  ctx.strokeStyle = preview ? 'rgba(190,235,255,.8)' : 'rgba(160,205,255,.75)';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  for (let i = 0; i <= count; i++) {
    const t = (i + 0.5) / (count + 1);
    const px = a.x + dx * t + bx * 1.5;
    const py = a.y + dy * t + by * 1.5;
    ctx.moveTo(px, py);
    ctx.lineTo(px + hx * hlen, py + hy * hlen);
  }
  ctx.stroke();

  // 两端小圆点
  ctx.fillStyle = preview ? '#bff0ff' : '#ffffff';
  ctx.beginPath(); ctx.arc(a.x, a.y, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function drawBeam(pts) {
  if (pts.length < 2) return;
  const path = new Path2D();
  path.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.shadowColor = 'rgba(255,40,80,.9)';
  ctx.shadowBlur = 28;
  ctx.strokeStyle = 'rgba(255,60,100,.45)';
  ctx.lineWidth = 11;
  ctx.stroke(path);

  ctx.shadowBlur = 18;
  ctx.strokeStyle = 'rgba(255,120,150,.9)';
  ctx.lineWidth = 4.5;
  ctx.stroke(path);

  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.stroke(path);

  ctx.restore();
}

function drawMonster(m) {
  const t = performance.now() / 1000;
  const bob = Math.sin(t * 3.4 + m.seed) * 4;
  const squash = 1 + Math.sin(t * 7 + m.seed) * 0.045;
  const r = m.r;

  ctx.save();
  ctx.translate(m.x, m.y + bob);

  // 光晕
  const g0 = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.3);
  g0.addColorStop(0, 'rgba(110,255,140,.35)');
  g0.addColorStop(1, 'rgba(110,255,140,0)');
  ctx.fillStyle = g0;
  ctx.beginPath(); ctx.arc(0, 0, r * 2.3, 0, Math.PI * 2); ctx.fill();

  // 触角
  ctx.strokeStyle = '#2fae5e';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.45, -r * 0.78);
    ctx.quadraticCurveTo(s * r * 0.75, -r * 1.35, s * r * 1.0, -r * 1.15);
    ctx.stroke();
  }
  ctx.fillStyle = '#8dff9e';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.arc(s * r * 1.0, -r * 1.15, 3.4, 0, Math.PI * 2); ctx.fill();
  }

  // 身体
  ctx.save();
  ctx.scale(squash, 1 / squash);
  const bg = ctx.createRadialGradient(-r * 0.32, -r * 0.4, r * 0.15, 0, 0, r * 1.25);
  bg.addColorStop(0, '#a6ffb4');
  bg.addColorStop(0.55, '#3ddc6b');
  bg.addColorStop(1, '#12904a');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 眼睛（看向激光笔）
  const dx = laser.x - m.x, dy = laser.y - (m.y + bob);
  const dl = Math.hypot(dx, dy) || 1;
  const px = (dx / dl) * r * 0.13;
  const py = (dy / dl) * r * 0.13;
  const ex = r * 0.34, ey = -r * 0.16, er = r * 0.31;

  for (const s of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s * ex, ey, er, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b2b16';
    ctx.beginPath(); ctx.arc(s * ex + px, ey + py, er * 0.52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(s * ex + px - er * 0.22, ey + py - er * 0.24, er * 0.16, 0, Math.PI * 2); ctx.fill();
  }

  // 嘴巴
  ctx.strokeStyle = '#0b2b16';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.22, r * 0.4, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  // 小尖牙
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, r * 0.56);
  ctx.lineTo(-r * 0.1, r * 0.56);
  ctx.lineTo(-r * 0.15, r * 0.74);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.1, r * 0.56);
  ctx.lineTo(r * 0.2, r * 0.56);
  ctx.lineTo(r * 0.15, r * 0.74);
  ctx.closePath(); ctx.fill();

  ctx.restore();
}

function drawLaserSource() {
  ctx.save();
  ctx.translate(laser.x, laser.y);

  // 机身
  ctx.shadowColor = 'rgba(255,50,90,.8)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#232b40';
  roundRect(ctx, -54, -16, 54, 32, 10);
  ctx.fill();

  // 握把
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#181f33';
  roundRect(ctx, -32, 12, 20, 26, 6);
  ctx.fill();

  // 高光条
  ctx.fillStyle = '#3a4a6e';
  roundRect(ctx, -50, -12, 40, 8, 4);
  ctx.fill();

  // 灯头
  ctx.fillStyle = '#101827';
  roundRect(ctx, -9, -11, 17, 22, 5);
  ctx.fill();

  // 发射口辉光
  const g = ctx.createRadialGradient(7, 0, 0, 7, 0, 14);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.32, '#ff5a7a');
  g.addColorStop(1, 'rgba(255,40,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(7, 0, 14, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function drawArc(cx, cy, a1, a2, radius, color, label) {
  let diff = a2 - a1;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, a1, a1 + diff, diff < 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  const mid = a1 + diff / 2;
  ctx.fillStyle = color;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.9)';
  ctx.shadowBlur = 5;
  ctx.fillText(label, cx + Math.cos(mid) * (radius + 18), cy + Math.sin(mid) * (radius + 18));
  ctx.restore();
}

// 法线：跟随反射点动态显示，只画在入射光一侧
function drawNormals() {
  const list = trace.reflections.slice(0, 4);
  if (!list.length) return;
  const len = showAngles ? 66 : 44;

  ctx.save();
  ctx.setLineDash([5, 6]);
  ctx.strokeStyle = 'rgba(150,210,255,.85)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (const r of list) {
    let nx = r.normal.x, ny = r.normal.y;
    if (nx * -r.inDir.x + ny * -r.inDir.y < 0) { nx = -nx; ny = -ny; }
    ctx.moveTo(r.point.x, r.point.y);
    ctx.lineTo(r.point.x + nx * len, r.point.y + ny * len);
  }
  ctx.stroke();
  ctx.restore();
}

function drawAngles(reflections) {
  const list = reflections.slice(0, 4);
  for (const r of list) {
    const { point, inDir, outDir, normal } = r;

    const vIn = { x: -inDir.x, y: -inDir.y };
    let n2 = { x: normal.x, y: normal.y };
    if (vIn.x * n2.x + vIn.y * n2.y < 0) { n2.x = -n2.x; n2.y = -n2.y; }

    const aN = Math.atan2(n2.y, n2.x);
    const aIn = Math.atan2(vIn.y, vIn.x);
    const aOut = Math.atan2(outDir.y, outDir.x);

    const c = Math.abs(inDir.x * n2.x + inDir.y * n2.y);
    const deg = Math.round(Math.acos(clamp(c, -1, 1)) * 180 / Math.PI);

    drawArc(point.x, point.y, aN, aIn, 54, 'rgba(255,214,80,.95)', 'i=' + deg + '°');
    drawArc(point.x, point.y, aN, aOut, 54, 'rgba(90,230,255,.95)', 'r=' + deg + '°');

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(point.x, point.y, 3.2, 0, Math.PI * 2); ctx.fill();
  }
}

/* ==================== 主渲染 ==================== */
function render() {
  ctx.save();
  if (shakeT > 0) {
    const m = shakeT * 16;
    ctx.translate(rand(-m, m), rand(-m, m));
  }

  // 背景
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a1020');
  bg.addColorStop(0.5, '#0d1526');
  bg.addColorStop(1, '#131a2e');
  ctx.fillStyle = bg;
  ctx.fillRect(-40, -40, W + 80, H + 80);

  drawStars();

  // 镜子
  for (const m of mirrors) drawMirror(m.a, m.b, false);
  if (drag) drawMirror(drag.a, drag.b, true);

  // 光束
  drawBeam(trace.pts);

  // 法线
  drawNormals();

  // 角度标注
  if (showAngles) drawAngles(trace.reflections);

  // 怪物
  if (monster && monster.alive) drawMonster(monster);

  // 粒子 / 飘字
  drawParticles();
  drawFloaters();

  // 激光笔
  drawLaserSource();

  ctx.restore();
}

/* ==================== 更新 ==================== */
function updateTrace() {
  trace = traceLaser();
  if (trace.hit && monster && monster.alive) {
    onHit(trace.hit);
  }
}

function updateHUD() {
  scoreEl.textContent = score;
  const t = Math.ceil(timeLeft);
  timeEl.textContent = t;
  if (t <= 10) timeEl.classList.add('warn');
  else timeEl.classList.remove('warn');
}

/* ==================== 游戏流程 ==================== */
function startGame() {
  initAudio();
  score = 0;
  hits = 0;
  timeLeft = 60;
  mirrors = [];
  particles = [];
  floaters = [];
  drag = null;
  respawnTimer = 0;
  shakeT = 0;
  monster = null;
  trace = { pts: [], hit: null, reflections: [] };
  running = true;
  tipTimer = 0;

  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden');

  spawnMonster();
  lastT = performance.now();
  updateHUD();
}

function endGame() {
  running = false;
  drag = null;
  monster = null;
  tipTimer = 0;
  trace = { pts: [], hit: null, reflections: [] };

  finalScoreEl.textContent = score;
  finalHitsEl.textContent = hits;

  // 本机最高分（只存在本地，不上传）
  const prevBest = window.getBestScore ? window.getBestScore('hard') : 0;
  const isRecord = window.setBestScore ? window.setBestScore('hard', score) : false;
  if (score <= 0 && prevBest <= 0) {
    bestLineEl.textContent = '';
  } else {
    bestLineEl.textContent = isRecord ? '新纪录！本机最高分 ' + score + ' 分'
                                      : '本机最高分 ' + prevBest + ' 分';
    bestLineEl.style.color = isRecord ? '#ffd166' : '';
  }

  let s = '💪';
  if (hits >= 10) s = '⭐⭐⭐';
  else if (hits >= 6) s = '⭐⭐';
  else if (hits >= 3) s = '⭐';
  starsEl.textContent = s;

  // 按击中数量（答对题数）给出相应的激励语
  let msg;
  if (hits >= 10) msg = '哇！反射定律已经刻进脑子里了，光路大师！';
  else if (hits >= 6) msg = '很厉害！反射定律用得很熟练！';
  else if (hits >= 3) msg = '不错哦！再多练几轮就能拿满星啦！';
  else if (hits >= 1) msg = '已经找到感觉啦，继续加油！';
  else msg = '别灰心，先记住：反射角 = 入射角，再来一局！';
  encourageEl.textContent = msg;
  encourageEl.style.animation = 'none';
  void encourageEl.offsetWidth;   // 重排以重新播放弹入动画
  encourageEl.style.animation = '';

  endScreen.classList.remove('hidden');
  beep(660, 220, 0.5, 0.09, 'sine');
}

/* ==================== 输入 ==================== */
function getPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / sceneScale, y: (e.clientY - r.top) / sceneScale };
}

canvas.addEventListener('pointerdown', function (e) {
  if (!running) return;
  e.preventDefault();
  const p = getPos(e);
  drag = { a: { x: p.x, y: p.y }, b: { x: p.x, y: p.y } };
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});

canvas.addEventListener('pointermove', function (e) {
  if (!drag) return;
  e.preventDefault();
  const p = getPos(e);
  let dx = p.x - drag.a.x;
  let dy = p.y - drag.a.y;
  const len = Math.hypot(dx, dy);
  if (len > MIRROR_MAX_LEN) {
    dx = dx / len * MIRROR_MAX_LEN;
    dy = dy / len * MIRROR_MAX_LEN;
  }
  drag.b = { x: drag.a.x + dx, y: drag.a.y + dy };
});

function endDrag(e) {
  if (!drag) return;
  const len = Math.hypot(drag.b.x - drag.a.x, drag.b.y - drag.a.y);
  if (len > 26) {
    mirrors.push({ a: { x: drag.a.x, y: drag.a.y }, b: { x: drag.b.x, y: drag.b.y } });
    beep(320, 520, 0.07, 0.035, 'triangle');
  } else if (running) {
    showTip('按住并拖动手指（或鼠标），就能画出一面平面镜', 2);
  }
  drag = null;
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* ==================== 提示条 ==================== */
let tipTimer = 0, tipText = '';
const MIRROR_HINT_COUNT = 4;    // 镜子多到这个数量还没打中怪物，就提示清空重画

function showTip(text, dur) {
  tipText = text;
  tipTimer = dur;
}

function updateTip(dt) {
  if (tipTimer > 0) tipTimer = Math.max(0, tipTimer - dt);

  let text = '';
  if (tipTimer > 0) {
    text = tipText;
  } else if (running && monster && monster.alive && !trace.hit && mirrors.length >= MIRROR_HINT_COUNT) {
    text = '镜子太多啦 · 点右上角「清空镜子」重新画一面吧';
  }

  if (tipBanner.textContent !== text) tipBanner.textContent = text;
  tipBanner.classList.toggle('show', text !== '');
}

/* ==================== 按钮 ==================== */
/* 全屏按钮由外壳统一提供 */
document.getElementById('btnStart').addEventListener('click', startGame);
document.getElementById('btnAgain').addEventListener('click', startGame);

document.getElementById('btnRestart').addEventListener('click', function () {
  if (running) { endGame(); }
  else { startGame(); }
});

document.getElementById('btnEndBack').addEventListener('click', function () {
  if (window.reflectBackToSelect) window.reflectBackToSelect();
});

document.getElementById('btnClear').addEventListener('click', function () {
  mirrors = [];
  drag = null;
});

btnAngles.addEventListener('click', function () {
  showAngles = !showAngles;
  btnAngles.textContent = '显示角度：' + (showAngles ? '开' : '关');
  btnAngles.classList.toggle('active', showAngles);
});

/* ==================== 主循环（由外壳在进入本模式时启动 / 暂停） ==================== */
let paused = true, scheduled = false;

function loop(now) {
  scheduled = false;
  if (paused) return;
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (running) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHUD();
      endGame();
    }
  }

  updateParticles(dt);
  updateFloaters(dt);
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);

  if (running) {
    if (respawnTimer > 0) {
      respawnTimer -= dt;
      if (respawnTimer <= 0) spawnMonster();
    }
    updateTrace();
  }

  updateTip(dt);
  render();
  updateHUD();

  scheduled = true;
  requestAnimationFrame(loop);
}

function startLoop() {
  if (paused || scheduled) return;
  scheduled = true;
  requestAnimationFrame(loop);
}

/* ==================== 对外接口 ==================== */
function resetToIntro() {
  running = false;
  drag = null;
  monster = null;
  mirrors = [];
  particles = [];
  floaters = [];
  score = 0;
  hits = 0;
  timeLeft = 60;
  respawnTimer = 0;
  shakeT = 0;
  tipTimer = 0;
  showAngles = false;
  btnAngles.textContent = '显示角度：关';
  btnAngles.classList.remove('active');
  trace = { pts: [], hit: null, reflections: [] };
  endScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  updateHUD();
}

window.registerReflectGame('hard', {
  reset: resetToIntro,
  resize: resize,
  pause() { paused = true; },
  resume() {
    if (!paused) return;
    paused = false;
    lastT = performance.now();
    startLoop();
  },
  resumeAudio() { if (audioCtx && audioCtx.state !== 'running') audioCtx.resume(); }
});

/* ==================== 启动 ==================== */
window.addEventListener('resize', resize);
resize();   // 场景隐藏时尺寸为 0，进入本模式时外壳会再次调用

})();
