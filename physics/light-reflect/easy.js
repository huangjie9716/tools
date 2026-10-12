/*
  光的反射游戏实验室 · 简单模式逻辑（注册为 easy）
  入口：index.html
*/

/* ==================== 简单模式逻辑 ==================== */
(() => {
"use strict";

/* =========================================================
   基础设置
   ========================================================= */
const H = 620;                 // 世界高度固定，纵向布局保持不变
let W = 1200;                  // 世界宽度随窗口比例变化，画面铺满整个窗口
let viewCW = 1200, viewCH = 620;   // 画布 CSS 尺寸，用来把 HUD 占位换算成世界坐标
let sceneReady = false;
const cv  = document.getElementById('cv');
const ctx = cv.getContext('2d');

function fitCanvas(){
  const cw = cv.clientWidth || window.innerWidth || 1200;
  const ch = cv.clientHeight || window.innerHeight || H;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const s = ch / H;
  viewCW = cw; viewCH = ch;
  W = Math.max(700, Math.round(H * cw / ch));
  cv.width  = Math.round(cw * dpr);
  cv.height = Math.round(ch * dpr);
  ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
  if (sceneReady) layoutScene();
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

/* =========================================================
   场景几何（可自行调整位置）
   ========================================================= */
const D2R = Math.PI / 180;

// 平面镜：位于底部中央，可绕中心旋转 ±25°
const MIRROR = {
  x: 600, y: 545,
  half: 170,
  angle: 0,
  min: -25 * D2R,
  max:  25 * D2R
};

// 两支激光笔，固定在左右两侧
// sx = 1 表示朝右下射，sx = -1 表示朝左下射
const PENS = [
  { id:'L', x:120, y:235, sx: 1, angle:45*D2R, min:27*D2R, max:58*D2R, on:false },
  { id:'R', x:1080, y:235, sx:-1, angle:45*D2R, min:27*D2R, max:58*D2R, on:false }
];

// 按窗口比例摆放镜子与激光笔（世界高度固定，宽度随窗口变化）
function layoutScene(){
  MIRROR.x = Math.round(W / 2);
  MIRROR.half = Math.max(100, Math.min(190, W * 0.14));
  const margin = Math.min(120, W * 0.11);
  PENS[0].x = Math.round(margin);
  PENS[1].x = Math.round(W - margin);
  computeReachable();
}

// 世界单位 <-> CSS 像素换算：画布里的文字与线宽按固定 CSS 尺寸渲染，
// 这样手机等小屏上被整体缩小后依然看得清。
function cssPerWorld(){ return Math.max(viewCH / H, 0.05); }
function cssSize(cssPx){ return cssPx / cssPerWorld(); }
function cssFont(cssPx, weight){
  return (weight || 600) + ' ' + cssSize(cssPx) + 'px system-ui,sans-serif';
}

/* =========================================================
   数学工具
   ========================================================= */
const rayToEdge = (p, d) => {
  let t = Infinity;
  if (d.x >  1e-9) t = Math.min(t, (W - p.x) / d.x);
  if (d.x < -1e-9) t = Math.min(t, (0 - p.x) / d.x);
  if (d.y >  1e-9) t = Math.min(t, (H - p.y) / d.y);
  if (d.y < -1e-9) t = Math.min(t, (0 - p.y) / d.y);
  return Math.max(t, 0);
};

// 射线与镜面线段求交 → 返回交点 Q、反射方向 d2
function intersectMirror(origin, dir, mAngle){
  const u = { x: Math.cos(mAngle), y: Math.sin(mAngle) };   // 镜面方向
  const w = { x: MIRROR.x - origin.x, y: MIRROR.y - origin.y };
  const D = u.x * dir.y - dir.x * u.y;
  if (Math.abs(D) < 1e-9) return null;                       // 平行
  const t = (u.x * w.y - w.x * u.y) / D;
  const s = (dir.x * w.y - w.x * dir.y) / D;
  if (t <= 0 || Math.abs(s) > MIRROR.half) return null;      // 未命中镜面

  const Q = { x: origin.x + dir.x * t, y: origin.y + dir.y * t };
  const n = { x: Math.sin(mAngle), y: -Math.cos(mAngle) };   // 镜面朝上的法线
  const dn = dir.x * n.x + dir.y * n.y;
  const d2 = { x: dir.x - 2 * dn * n.x, y: dir.y - 2 * dn * n.y }; // 反射定律
  return { Q, d2 };
}

const penDir = pen => ({ x: pen.sx * Math.cos(pen.angle), y: Math.sin(pen.angle) });

function segDist(p, a, b){
  const abx = b.x - a.x, aby = b.y - a.y;
  const apx = p.x - a.x, apy = p.y - a.y;
  const l2 = abx*abx + aby*aby;
  let t = l2 > 0 ? (apx*abx + apy*aby) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + abx*t), p.y - (a.y + aby*t));
}

function segHitsCircle(a, b, c, r){
  return segDist(c, a, b) <= r;
}

/* =========================================================
   预计算：所有"能够被激光打到"的位置
   ========================================================= */
let reachable = [];

function computeReachable(){
  const pts = new Map();
  const STEP = 12;

  // 边界留白随 HUD 的 CSS 占位换算成世界坐标，保证怪物不会藏在得分/时间/按钮下面
  const yTop = Math.round(Math.max(70, 100 * H / viewCH));
  const yBot = Math.round(Math.max(yTop + 60, 345 * H / viewCH));
  const xPad = Math.round(Math.max(150, 180 * W / viewCW));
  const xMin = xPad, xMax = Math.max(xPad + 60, W - xPad);

  const mirrorAngles = [];
  for (let i = 0; i <= 20; i++) mirrorAngles.push(MIRROR.min + (MIRROR.max - MIRROR.min) * i / 20);

  const penAngles = [];
  for (let i = 0; i <= 26; i++) penAngles.push(27*D2R + (31*D2R) * i / 26);

  for (const pen of PENS){
    for (const ma of mirrorAngles){
      for (const pa of penAngles){
        const dir = { x: pen.sx * Math.cos(pa), y: Math.sin(pa) };
        const hit = intersectMirror({ x: pen.x, y: pen.y }, dir, ma);
        if (!hit) continue;

        let p = { x: hit.Q.x, y: hit.Q.y };
        const d2 = hit.d2;
        for (let k = 0; k < 260; k++){
          p = { x: p.x + d2.x * STEP, y: p.y + d2.y * STEP };
          if (p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80) break;

          if (p.y < yTop || p.y > yBot) continue;
          if (p.x < xMin || p.x > xMax) continue;
          if (Math.hypot(p.x - pen.x, p.y - pen.y) < 115) continue;

          const gx = Math.round(p.x / STEP) * STEP;
          const gy = Math.round(p.y / STEP) * STEP;
          if (gy < yTop || gy > yBot || gx < xMin || gx > xMax) continue;

          const key = gx + ',' + gy;
          if (!pts.has(key)) pts.set(key, { x: gx, y: gy });
        }
      }
    }
  }
  reachable = [...pts.values()];
}
layoutScene();          // 首次布局：按窗口比例摆好镜子与激光笔，并算出可达点
sceneReady = true;

/* =========================================================
   游戏状态
   ========================================================= */
const state = {
  running: false,
  over:    false,
  score:   0,
  timeLeft: 60,
  monster: null,
  particles: [],
  respawn: 0,
  shake: 0
};

const scoreEl  = document.getElementById('score');
const timeEl   = document.getElementById('time');
const timePill = document.getElementById('timePill');
const overlay  = document.getElementById('overlay');
const ovBtn    = document.getElementById('ovBtn');
const hintEl   = document.getElementById('hint');
const tipEl    = document.getElementById('tip');
const panelEl  = overlay.querySelector('.panel');
const INTRO_HTML = panelEl.innerHTML;   // 记住开始面板，返回选择后要还原
const btnEasyAngles = document.getElementById('btnEasyAngles');
let showAngles = false;                 // 是否显示 入射角 / 反射角

let tipTimer = 0, tipText = '';
function showTip(text, dur){ tipText = text; tipTimer = dur; }

/* =========================================================
   怪物
   ========================================================= */
function spawnMonster(){
  if (!reachable.length) return;
  let best = null, bestD = -1;
  for (let i = 0; i < 12; i++){
    const p = reachable[(Math.random() * reachable.length) | 0];
    const d = state.monster
      ? Math.hypot(p.x - state.monster.x, p.y - state.monster.y)
      : 9999;
    if (d > bestD){ bestD = d; best = p; }
    if (d > 340) break;
  }
  state.monster = {
    x: best.x, y: best.y,
    r: Math.max(34, cssSize(26)),   // 小屏上保证怪物直径不小于约 52 CSS px
    alive: true,
    spawn: 0,
    seed: Math.random() * 10
  };
}

function hitMonster(){
  const m = state.monster;
  if (!m || !m.alive) return;

  m.alive = false;
  state.score += 10;
  state.shake = 0.28;

  for (let i = 0; i < 30; i++){
    const a = Math.random() * Math.PI * 2;
    const sp = 70 + Math.random() * 300;
    state.particles.push({
      x: m.x, y: m.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60,
      life: 0.6 + Math.random() * 0.6,
      maxLife: 1.1,
      size: 2 + Math.random() * 4,
      color: Math.random() < 0.45 ? '#ffd166'
           : Math.random() < 0.6  ? '#ff5d8f' : '#9b6bff'
    });
  }

  beep(620, 0.11, 'triangle', 0.13);
  setTimeout(() => beep(880, 0.16, 'sine', 0.09), 35);
  setTimeout(() => beep(1240, 0.18, 'sine', 0.055), 75);

  state.respawn = 0.30;
}

/* =========================================================
   音效
   ========================================================= */
let actx = null;
function beep(freq, dur, type = 'sine', vol = 0.12){
  try{
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();   // iOS 从后台回来时可能被挂起
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur + 0.02);
  }catch(e){}
}

/* =========================================================
   交互
   ========================================================= */
const drag = { active:false, obj:null, type:null, sx:0, sy:0, moved:false, touch:false };

function getPos(e){
  const r = cv.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top ) * (H / r.height)
  };
}

function togglePen(pen){
  const willOn = !pen.on;
  for (const p of PENS) p.on = false;
  pen.on = willOn;
  beep(willOn ? 620 : 300, 0.07, 'square', 0.07);
}

cv.addEventListener('pointerdown', e => {
  const p = getPos(e);
  drag.sx = p.x; drag.sy = p.y; drag.moved = false;
  drag.active = false; drag.obj = null; drag.type = null;
  drag.touch = e.pointerType === 'touch';   // 手指触摸时放宽抓取范围

  // 先判断激光笔
  const penR = drag.touch ? 100 : 80;
  for (const pen of PENS){
    if (Math.hypot(p.x - pen.x, p.y - pen.y) < penR){
      drag.active = true; drag.obj = pen; drag.type = 'pen';
      break;
    }
  }
  // 再判断平面镜
  if (!drag.active){
    const a = Math.cos(MIRROR.angle), b = Math.sin(MIRROR.angle);
    const p1 = { x: MIRROR.x - a*MIRROR.half, y: MIRROR.y - b*MIRROR.half };
    const p2 = { x: MIRROR.x + a*MIRROR.half, y: MIRROR.y + b*MIRROR.half };
    if (segDist(p, p1, p2) < (drag.touch ? 60 : 42)){
      drag.active = true; drag.obj = MIRROR; drag.type = 'mirror';
    }
  }
  if (drag.active) { try { cv.setPointerCapture(e.pointerId); } catch (err) {} }
});

cv.addEventListener('pointermove', e => {
  if (!drag.active) return;
  const p = getPos(e);
  if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > (drag.touch ? 14 : 6)) drag.moved = true;
  if (!drag.moved) return;

  if (drag.type === 'pen'){
    const pen = drag.obj;
    const a = Math.atan2(p.y - pen.y, pen.sx * (p.x - pen.x));
    pen.angle = Math.max(pen.min, Math.min(pen.max, a));
  } else {
    let a = Math.atan2(p.y - MIRROR.y, p.x - MIRROR.x);
    if (a >  Math.PI/2) a -= Math.PI;
    if (a < -Math.PI/2) a += Math.PI;
    MIRROR.angle = Math.max(MIRROR.min, Math.min(MIRROR.max, a));
  }
});

function endPointer(){
  if (drag.active && !drag.moved && drag.type === 'pen'){
    togglePen(drag.obj);
  } else if (!drag.active && state.running && !drag.moved){
    showTip('按住并拖动激光笔或平面镜，就能改变角度', 2);
  }
  drag.active = false; drag.obj = null; drag.type = null; drag.moved = false;
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);

/* =========================================================
   游戏流程
   ========================================================= */
function startGame(){
  state.score = 0;
  state.timeLeft = 60;
  state.running = true;
  state.over = false;
  state.particles = [];
  state.respawn = 0;
  state.monster = null;
  state.shake = 0;
  for (const p of PENS) p.on = false;
  overlay.classList.remove('show');
  hintEl.style.opacity = '1';
  tipEl.classList.remove('show');
  spawnMonster();
}

function endGame(){
  state.running = false;
  state.over = true;
  for (const p of PENS) p.on = false;
  hintEl.style.opacity = '0';

  const killed = state.score / 10;
  const rank = killed >= 12 ? '反射大师 🏆'
             : killed >= 8  ? '光路高手 ⭐'
             : killed >= 4  ? '小有心得 👍'
             : '继续加油 💪';

  // 本机最高分（只存在本地，不上传）
  const prevBest = window.getBestScore ? window.getBestScore('easy') : 0;
  const isRecord = window.setBestScore ? window.setBestScore('easy', state.score) : false;
  let bestText = '';
  if (state.score > 0 || prevBest > 0){
    bestText = isRecord ? '新纪录！本机最高分 ' + state.score + ' 分'
                        : '本机最高分 ' + prevBest + ' 分';
  }

  overlay.querySelector('.panel').innerHTML = `
    <h1>挑战结束</h1>
    <p>消灭怪物 <b style="color:#ffd166;font-size:1.4em">${killed}</b> 只　·　
       总得分 <b style="color:#ffd166;font-size:1.4em">${state.score}</b></p>
    <p style="color:#7fd0ff;font-weight:700;letter-spacing:2px;">${rank}</p>
    ${bestText ? `<p style="color:${isRecord ? '#ffd166' : '#a8bede'};font-size:16px;margin:-12px 0 20px">${bestText}</p>` : ''}
    <div class="tips" style="text-align:center;display:block;">
      反射光线、法线、入射光线在同一平面内<br>
      反射光线和入射光线位于法线两侧<br>
      反射角等于入射角
    </div>
    <button class="btn" id="ovBtn">再来一局</button><button class="ghost-btn" id="ovBack">返回选择</button>
  `;
  overlay.classList.add('show');
  document.getElementById('ovBtn').addEventListener('click', startGame);
  document.getElementById('ovBack').addEventListener('click', function () {
    if (window.reflectBackToSelect) window.reflectBackToSelect();
  });
  beep(520, 0.15, 'sine', 0.09);
  setTimeout(() => beep(392, 0.35, 'sine', 0.09), 160);
}

ovBtn.addEventListener('click', startGame);

btnEasyAngles.addEventListener('click', function () {
  showAngles = !showAngles;
  btnEasyAngles.textContent = '显示角度：' + (showAngles ? '开' : '关');
  btnEasyAngles.classList.toggle('active', showAngles);
});

/* =========================================================
   更新
   ========================================================= */
function update(dt){
  if (state.running){
    state.timeLeft -= dt;
    if (state.timeLeft <= 0){
      state.timeLeft = 0;
      endGame();
    }
  }

  // 粒子
  for (let i = state.particles.length - 1; i >= 0; i--){
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0){ state.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 340 * dt;
    p.vx *= 0.985;
    p.vy *= 0.985;
  }

  // 怪物重生
  if (state.respawn > 0){
    state.respawn -= dt;
    if (state.respawn <= 0) spawnMonster();
  }

  if (state.monster) state.monster.spawn = Math.min(1, state.monster.spawn + dt * 5);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

  // 命中判定
  if (state.running && state.monster && state.monster.alive) checkHit();

  // 提示条：临时提示优先，其次是「镜面已到极限」的引导
  if (tipTimer > 0) tipTimer = Math.max(0, tipTimer - dt);
  const mirrorAtLimit = MIRROR.angle <= MIRROR.min + 0.5 * D2R
                     || MIRROR.angle >= MIRROR.max - 0.5 * D2R;
  let tipMsg = '';
  if (tipTimer > 0){
    tipMsg = tipText;
  } else if (state.running && mirrorAtLimit && PENS.some(p => p.on)
             && !beamHitsMonster(state.monster)){
    tipMsg = '镜面已转到极限 · 试试拖动激光笔改变入射角';
  }
  if (tipEl.textContent !== tipMsg) tipEl.textContent = tipMsg;
  tipEl.classList.toggle('show', tipMsg !== '');

  // HUD
  scoreEl.textContent = state.score;
  const t = Math.ceil(state.timeLeft);
  timeEl.textContent = t;
  timePill.classList.toggle('warn', state.running && t <= 10);
}

function beamSegments(pen){
  const o = { x: pen.x, y: pen.y };
  const dir = penDir(pen);
  const hit = intersectMirror(o, dir, MIRROR.angle);

  if (!hit){
    const t = rayToEdge(o, dir);
    return [[o, { x: o.x + dir.x*t, y: o.y + dir.y*t }]];
  }
  const t2 = rayToEdge(hit.Q, hit.d2);
  return [
    [o, hit.Q],
    [hit.Q, { x: hit.Q.x + hit.d2.x*t2, y: hit.Q.y + hit.d2.y*t2 }]
  ];
}

function beamHitsMonster(m){
  if (!m) return false;
  return PENS.some(p => p.on && beamSegments(p).some(([a, b]) => segHitsCircle(a, b, m, m.r + 6)));
}

function checkHit(){
  const m = state.monster;
  for (const pen of PENS){
    if (!pen.on) continue;
    for (const [a, b] of beamSegments(pen)){
      if (segHitsCircle(a, b, m, m.r + 6)){ hitMonster(); return; }
    }
  }
}

/* =========================================================
   绘制
   ========================================================= */
function roundRect(c, x, y, w, h, r){
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y,     x + w, y + h, r);
  c.arcTo(x + w, y + h, x,     y + h, r);
  c.arcTo(x,     y + h, x,     y,     r);
  c.arcTo(x,     y,     x + w, y,     r);
  c.closePath();
}

function drawBackground(){
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0,   '#080d1c');
  g.addColorStop(0.6, '#0d1428');
  g.addColorStop(1,   '#131b33');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 网格
  ctx.strokeStyle = 'rgba(90,150,255,.055)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 40){ ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 40){ ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  // 顶部氛围光
  const rg = ctx.createRadialGradient(W/2, -80, 40, W/2, -80, 620);
  rg.addColorStop(0, 'rgba(90,150,255,.12)');
  rg.addColorStop(1, 'rgba(90,150,255,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
}

function drawMirror(){
  const a  = MIRROR.angle;
  const ux = Math.cos(a), uy = Math.sin(a);
  const p1 = { x: MIRROR.x - ux * MIRROR.half, y: MIRROR.y - uy * MIRROR.half };
  const p2 = { x: MIRROR.x + ux * MIRROR.half, y: MIRROR.y + uy * MIRROR.half };

  // 支架
  ctx.strokeStyle = 'rgba(100,140,200,.45)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(MIRROR.x, MIRROR.y);
  ctx.lineTo(MIRROR.x, MIRROR.y + 34);
  ctx.stroke();

  ctx.fillStyle = 'rgba(80,120,190,.30)';
  ctx.beginPath();
  ctx.ellipse(MIRROR.x, MIRROR.y + 40, 78, 13, 0, 0, Math.PI*2);
  ctx.fill();

  // 镜面光晕
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(120,200,255,.95)';
  ctx.shadowBlur = 26;
  ctx.strokeStyle = 'rgba(120,200,255,.9)';
  ctx.lineWidth = Math.max(9, cssSize(7));
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  ctx.restore();

  // 镜面本体
  const mg = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
  mg.addColorStop(0,   '#5f8fc9');
  mg.addColorStop(0.5, '#eaf6ff');
  mg.addColorStop(1,   '#5f8fc9');
  ctx.strokeStyle = mg;
  ctx.lineWidth = Math.max(7, cssSize(4.8));
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = Math.max(2, cssSize(1.8));
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

  // 两端手柄
  for (const p of [p1, p2]){
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(7, cssSize(5)), 0, Math.PI*2);
    ctx.fillStyle = '#0e1a30';
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,210,255,.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // 角度读数
  const deg = (a / D2R).toFixed(0);
  ctx.fillStyle = 'rgba(140,190,255,.6)';
  ctx.font = cssFont(14, 600);
  ctx.textAlign = 'center';
  ctx.fillText(`镜面倾角 ${deg > 0 ? '+' : ''}${deg}°`, MIRROR.x, Math.min(MIRROR.y + 74, H - 10));
  ctx.textAlign = 'left';
}

// 在反射点画出入射角 / 反射角（与困难模式同一套画法）
function drawArc(cx, cy, a1, a2, radius, color, label){
  let diff = a2 - a1;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, a1, a1 + diff, diff < 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2.2, cssSize(1.6));
  ctx.stroke();

  const mid = a1 + diff / 2;
  ctx.fillStyle = color;
  ctx.font = cssFont(13, 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.9)';
  ctx.shadowBlur = 5;
  ctx.fillText(label, cx + Math.cos(mid) * (radius + cssSize(22)), cy + Math.sin(mid) * (radius + cssSize(22)));
  ctx.restore();
}

function drawAnglesAt(Q, inDir, outDir, nx, ny){
  const vIn = { x: -inDir.x, y: -inDir.y };          // 指向光源
  if (vIn.x * nx + vIn.y * ny < 0){ nx = -nx; ny = -ny; }

  const aN   = Math.atan2(ny, nx);
  const aIn  = Math.atan2(vIn.y, vIn.x);
  const aOut = Math.atan2(outDir.y, outDir.x);

  const c = Math.max(-1, Math.min(1, Math.abs(inDir.x * nx + inDir.y * ny)));
  const deg = Math.round(Math.acos(c) * 180 / Math.PI);
  const R = Math.max(54, cssSize(36));

  drawArc(Q.x, Q.y, aN, aIn, R, 'rgba(255,214,80,.95)', 'i=' + deg + '°');
  drawArc(Q.x, Q.y, aN, aOut, R, 'rgba(90,230,255,.95)', 'r=' + deg + '°');

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(Q.x, Q.y, Math.max(3.2, cssSize(2.6)), 0, Math.PI*2);
  ctx.fill();
}

function drawPens(){
  for (const pen of PENS){
    const dir = penDir(pen);
    const ang = Math.atan2(dir.y, dir.x);

    ctx.save();
    ctx.translate(pen.x, pen.y);
    ctx.rotate(ang);

    // 光晕
    if (pen.on){
      ctx.save();
      ctx.shadowColor = '#ff3b3b';
      ctx.shadowBlur = 22;
      ctx.fillStyle = 'rgba(255,60,60,.85)';
      ctx.beginPath();
      ctx.arc(66, 0, 6, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // 笔身
    const bg = ctx.createLinearGradient(0, -11, 0, 11);
    bg.addColorStop(0,    '#7b87a3');
    bg.addColorStop(0.38, '#e8eeff');
    bg.addColorStop(0.62, '#c3cde4');
    bg.addColorStop(1,    '#5d6880');
    ctx.fillStyle = bg;
    roundRect(ctx, 0, -11, 66, 22, 9);
    ctx.fill();

    ctx.strokeStyle = 'rgba(20,30,50,.55)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 0, -11, 66, 22, 9);
    ctx.stroke();

    // 按钮
    ctx.fillStyle = pen.on ? '#ff4d4d' : '#39415a';
    roundRect(ctx, 18, -7, 20, 14, 5);
    ctx.fill();
    if (pen.on){
      ctx.save();
      ctx.shadowColor = '#ff4d4d';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.restore();
    }

    // 笔头
    ctx.fillStyle = pen.on ? '#ff2b2b' : '#2b3145';
    ctx.beginPath();
    ctx.arc(66, 0, 5.5, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();

    // 底座圆点
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, 4.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(150,200,255,.55)';
    ctx.fill();

    // 文字提示
    ctx.fillStyle = pen.on ? 'rgba(255,140,140,.95)' : 'rgba(140,175,225,.75)';
    ctx.font = cssFont(13, 700);
    ctx.textAlign = 'center';
    ctx.fillText(pen.on ? '● 开启中' : '○ 点击开启', pen.x, pen.y + 42);
    ctx.textAlign = 'left';
  }
}

function drawBeams(){
  for (const pen of PENS){
    if (!pen.on) continue;

    const o = { x: pen.x, y: pen.y };
    const dir = penDir(pen);
    const hit = intersectMirror(o, dir, MIRROR.angle);

    const path = [o];
    if (hit){
      path.push(hit.Q);
      const t2 = rayToEdge(hit.Q, hit.d2);
      path.push({ x: hit.Q.x + hit.d2.x * t2, y: hit.Q.y + hit.d2.y * t2 });
    } else {
      const t = rayToEdge(o, dir);
      path.push({ x: o.x + dir.x * t, y: o.y + dir.y * t });
    }

    // 外发光
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.shadowColor = 'rgba(255,40,40,.95)';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = 'rgba(255,50,50,.55)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();

    // 核心
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ff5a5a';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();

    // 内芯
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,235,235,.95)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();

    // 反射点光斑
    if (hit){
      ctx.beginPath();
      ctx.arc(hit.Q.x, hit.Q.y, 6, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.shadowColor = '#ff6060';
      ctx.shadowBlur = 20;
      ctx.fill();

      const nx = Math.sin(MIRROR.angle), ny = -Math.cos(MIRROR.angle);
      ctx.shadowBlur = 0;
      ctx.setLineDash([5, 6]);
      ctx.strokeStyle = 'rgba(150,210,255,.8)';
      ctx.lineWidth = Math.max(1.8, cssSize(1.6));
      ctx.beginPath();
      ctx.moveTo(hit.Q.x, hit.Q.y);
      ctx.lineTo(hit.Q.x + nx*Math.max(38, cssSize(26)), hit.Q.y + ny*Math.max(38, cssSize(26)));
      ctx.stroke();
      ctx.setLineDash([]);

      if (showAngles) drawAnglesAt(hit.Q, dir, hit.d2, nx, ny);
    }
    ctx.restore();
  }
}

function drawMonster(){
  const m = state.monster;
  if (!m || !m.alive) return;

  const t = performance.now() / 1000;
  const bob = Math.sin(t * 2 + m.seed) * 4;
  const s = m.spawn < 1 ? (1 - Math.pow(1 - m.spawn, 3)) : 1;
  const R = m.r * s;

  ctx.save();
  ctx.translate(m.x, m.y + bob);

  // 光晕
  const glow = ctx.createRadialGradient(0, 0, R*0.3, 0, 0, R*2.3);
  glow.addColorStop(0, 'rgba(170,90,255,.35)');
  glow.addColorStop(1, 'rgba(170,90,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, R*2.3, 0, Math.PI*2); ctx.fill();

  // 触角
  ctx.strokeStyle = '#a56bff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const sgn of [-1, 1]){
    ctx.beginPath();
    ctx.moveTo(sgn * R*0.42, -R*0.82);
    ctx.quadraticCurveTo(sgn * R*0.75, -R*1.35, sgn * R*0.45, -R*1.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sgn * R*0.45, -R*1.58, R*0.14, 0, Math.PI*2);
    ctx.fillStyle = '#ffd166';
    ctx.fill();
  }

  // 身体
  const bg = ctx.createRadialGradient(-R*0.35, -R*0.4, R*0.15, 0, 0, R*1.15);
  bg.addColorStop(0,   '#d9a3ff');
  bg.addColorStop(0.5, '#a35cff');
  bg.addColorStop(1,   '#6a22c4');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 眼睛
  const eyeY = -R * 0.12;
  for (const sgn of [-1, 1]){
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(sgn * R*0.35, eyeY, R*0.25, R*0.30, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#22103a';
    ctx.beginPath();
    ctx.arc(sgn * R*0.35 + Math.sin(t*1.4 + m.seed)*R*0.06,
            eyeY + R*0.05, R*0.13, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.arc(sgn * R*0.35 + R*0.07, eyeY - R*0.08, R*0.05, 0, Math.PI*2);
    ctx.fill();
  }

  // 嘴巴
  ctx.strokeStyle = '#22103a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, R*0.26, R*0.30, 0.12*Math.PI, 0.88*Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawParticles(){
  for (const p of state.particles){
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function render(){
  ctx.save();

  // 命中震屏
  if (state.shake > 0){
    const s = state.shake * 22;
    ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s);
  }

  drawBackground();
  drawMirror();
  drawMonster();
  drawBeams();
  drawPens();
  drawParticles();

  ctx.restore();
}

/* =========================================================
   主循环（由外壳在进入本模式时启动 / 暂停）
   ========================================================= */
let last = performance.now();
let paused = true, scheduled = false;

function loop(now){
  scheduled = false;
  if (paused) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  scheduled = true;
  requestAnimationFrame(loop);
}

function startLoop(){
  if (paused || scheduled) return;
  scheduled = true;
  requestAnimationFrame(loop);
}

/* =========================================================
   对外接口
   ========================================================= */
function resetToIntro(){
  state.running = false;
  state.over = false;
  state.score = 0;
  state.timeLeft = 60;
  state.monster = null;
  state.particles = [];
  state.respawn = 0;
  state.shake = 0;
  for (const p of PENS) p.on = false;
  MIRROR.angle = 0;
  tipTimer = 0;
  panelEl.innerHTML = INTRO_HTML;
  overlay.classList.add('show');
  panelEl.querySelector('#ovBtn').addEventListener('click', startGame);
}

window.registerReflectGame('easy', {
  reset: resetToIntro,
  resize: fitCanvas,
  pause(){ paused = true; },
  resume(){
    if (!paused) return;
    paused = false;
    last = performance.now();
    startLoop();
  },
  resumeAudio(){ if (actx && actx.state !== 'running') actx.resume(); }
});

})();
