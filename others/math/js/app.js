/* 数学公式可视化互动学习 —— 交互逻辑（由 MathFormula.html 抽离为独立文件，便于浏览器缓存） */
'use strict';
/* ============================================================
 * 通用工具函数
 * ============================================================ */

// —— 根据 id 取元素 ——
const $ = id => document.getElementById(id);

// —— 整数随机数 [a, b] ——
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// —— 数字显示：负号用数学符号 −（U+2212） ——
const fmt = n => (n < 0 ? '−' + Math.abs(n) : String(n));
const fmtS = n => (n < 0 ? '−' + Math.abs(n) : '+' + n);

// —— 线性插值与缓动函数 ——
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// —— 最大公约数（用于约分） ——
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

// —— 画线段 ——
function line(ctx, x1, y1, x2, y2){
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

// —— 通用补间动画：duration 毫秒内反复调用 onFrame(t)，结束后调用 onDone ——
function animate(duration, onFrame, onDone){
  const t0 = performance.now();
  function frame(now){
    const t = Math.min(1, (now - t0) / duration);
    onFrame(t);
    if (t < 1) requestAnimationFrame(frame);
    else if (onDone) onDone();
  }
  requestAnimationFrame(frame);
}

/* ---------- Canvas 高清适配：返回 {ctx, W, H}（W/H 为 CSS 像素） ---------- */
function fitCanvas(canvas){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W: w, H: h };
}

// —— 指针位置（换算为画布 CSS 像素坐标） ——
function pointerPos(canvas, e){
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

/* ---------- 统一指针事件（鼠标 + 触摸）：down/move/up ---------- */
function onPointer(canvas, handlers){
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    if (handlers.down) handlers.down(pointerPos(canvas, e), e);
  });
  canvas.addEventListener('pointermove', e => {
    if (handlers.move) handlers.move(pointerPos(canvas, e), e);
  });
  const up = e => { if (handlers.up) handlers.up(pointerPos(canvas, e), e); };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
}

/* ---------- 音效：WebAudio 程序化生成，无需外部音频文件 ---------- */
let audioCtx = null, muted = false;
function ensureAudio(){
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function beep(freq, dur, type, vol){
  if (muted) return;
  try{
    ensureAudio();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq || 660;
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.08));
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(t + (dur || 0.08) + 0.02);
  }catch(e){ /* 音频不可用时静默失败 */ }
}
const clickSound = () => beep(520, 0.05, 'sine', 0.08);
const success = () => [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => beep(f, 0.13, 'triangle', 0.16), i * 95));

/* ---------- KaTeX 渲染（失败时回退为纯文本公式） ---------- */
function renderTex(el, tex, plain){
  if (!el) return;
  if (window.katex){
    try{ katex.render(tex, el, { throwOnError: false }); return; }catch(e){ /* 落到回退 */ }
  }
  if (plain !== undefined) el.textContent = plain;
  else if (!el.textContent.trim()) el.textContent = tex;
}

/* ---------- 数值变化闪烁动画 ---------- */
function flash(el){
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth; // 强制重排以重启动画
  el.classList.add('flash');
}

/* ---------- 所有模块的重绘函数登记表（窗口尺寸变化时调用） ---------- */
const redrawAll = [];
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => redrawAll.forEach(f => f()), 120);
});

/* ============================================================
 * 顶部：年级切换 / 模块导航
 * hash 路由：#g1-3 表示初一第 3 个模块，#g2-1 表示初二第 1 个模块；
 * 旧版 #module-3 形式的 hash 自动映射到初一（兼容旧链接与截图脚本）。
 * ============================================================ */
const gradeTabs = Array.from(document.querySelectorAll('.grade-tab'));
const gradeNavs = { 1: $('navG1'), 2: $('navG2'), 3: $('navG3') };
const gradeHome = { 1: 'module-1', 2: 'module-g2-1', 3: 'module-g3-1' };
const lastModule = { 1: 'module-1', 2: 'module-g2-1', 3: 'module-g3-1' }; // 每个年级独立记住当前模块
let curGrade = 1;

// —— 由模块 id 生成 hash：module-3 → #g1-3，module-g2-1 → #g2-1 ——
function moduleHash(id){
  const m = id.match(/^module(?:-g(\d+))?-(\d+)$/);
  return '#g' + (m[1] || '1') + '-' + m[2];
}
function activateModule(id){
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.target === id));
  document.querySelectorAll('.module').forEach(m => m.classList.toggle('active', m.id === id));
  lastModule[curGrade] = id;
  // 模块从隐藏变为显示后，画布需要重新适配尺寸
  requestAnimationFrame(() => redrawAll.forEach(f => f()));
}
function switchGrade(g, pushHash){
  curGrade = g;
  gradeTabs.forEach(t => t.classList.toggle('active', +t.dataset.grade === g));
  Object.keys(gradeNavs).forEach(k => { gradeNavs[k].hidden = +k !== g; });
  const id = lastModule[g] || gradeHome[g];
  activateModule(id);
  if (pushHash) history.replaceState(null, '', moduleHash(id));
}
gradeTabs.forEach(t => t.addEventListener('click', () => { clickSound(); switchGrade(+t.dataset.grade, true); }));
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => {
  clickSound();
  history.replaceState(null, '', moduleHash(b.dataset.target));
  activateModule(b.dataset.target);
}));
function activateFromHash(){
  const h = location.hash.slice(1);
  if (!h) return;
  let g = 1, id = null;
  const m = h.match(/^g([123])-(\d+)$/);
  if (m){
    g = +m[1];
    id = g === 1 ? 'module-' + m[2] : 'module-g' + m[1] + '-' + m[2];
  }else if (/^module-\d+$/.test(h)){ // 旧版 hash：映射到初一
    g = 1; id = h;
  }
  if (id && document.getElementById(id)){
    switchGrade(g, false);
    activateModule(id);
  }
}
activateFromHash();
window.addEventListener('hashchange', activateFromHash);

// —— 渲染所有静态公式 ——
document.querySelectorAll('.tex[data-tex]').forEach(el => renderTex(el, el.dataset.tex));

/* ============================================================
 * 模块一：有理数运算 —— 可交互数轴 + 加法动画
 * ============================================================ */
(function initNumberLine(){
  const canvas = $('nlCanvas');
  let view = fitCanvas(canvas);
  const st = { A: -3, B: 5 };   // 两个可拖动的点
  let drag = null;              // 当前拖动的目标 'A' | 'B'
  let anim = null;              // 加法动画状态 {t, f1}
  let resultPulse = null;       // 结果点高亮进度 0~1（1 表示常亮）

  const els = {
    A: $('nlA'), B: $('nlB'), absA: $('nlAbsA'), absB: $('nlAbsB'),
    sum: $('nlSum'), diff: $('nlDiffV'), rule: $('nlRule')
  };

  // —— 布局：范围 R 自适应（保证 A、B、A+B 都在数轴内） ——
  function metrics(){
    const R = Math.max(10, Math.abs(st.A) + 1, Math.abs(st.B) + 1, Math.abs(st.A + st.B) + 2);
    const m = 40;
    return { R, x0: m, x1: view.W - m, axisY: view.H * 0.62, unit: (view.W - 2 * m) / (2 * R) };
  }
  const X = (v, mt) => mt.x0 + (v + mt.R) * mt.unit;

  // —— 画一根加数箭头（从 v1 走到 v2） ——
  function drawArrowLine(mt, v1, v2, color, label){
    const y = mt.axisY - 46;
    const x1 = X(v1, mt), x2 = X(v2, mt);
    if (Math.abs(x2 - x1) > 2){
      ctx_line(x1, y, x2, y, color, 5);
      const dir = x2 >= x1 ? 1 : -1;
      view.ctx.fillStyle = color;
      view.ctx.beginPath();
      view.ctx.moveTo(x2 + dir * 9, y);
      view.ctx.lineTo(x2 - dir * 4, y - 7);
      view.ctx.lineTo(x2 - dir * 4, y + 7);
      view.ctx.closePath(); view.ctx.fill();
    }
    view.ctx.fillStyle = color;
    view.ctx.font = 'bold 13px system-ui';
    view.ctx.textAlign = 'center'; view.ctx.textBaseline = 'bottom';
    view.ctx.fillText(label, (x1 + x2) / 2, y - 9);
  }
  function ctx_line(x1, y1, x2, y2, color, width){
    view.ctx.strokeStyle = color; view.ctx.lineWidth = width; view.ctx.lineCap = 'round';
    line(view.ctx, x1, y1, x2, y2);
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return; // 隐藏时不绘制
    ctx.clearRect(0, 0, W, H);
    const mt = metrics();

    // —— 轴线与右端箭头 ——
    ctx_line(mt.x0, mt.axisY, mt.x1, mt.axisY, '#93A5C9', 2);
    ctx.fillStyle = '#93A5C9';
    ctx.beginPath();
    ctx.moveTo(mt.x1 + 9, mt.axisY);
    ctx.lineTo(mt.x1 - 2, mt.axisY - 5);
    ctx.lineTo(mt.x1 - 2, mt.axisY + 5);
    ctx.closePath(); ctx.fill();

    // —— 刻度（过密时每隔 2 或 5 标一个数字） ——
    const step = mt.unit >= 20 ? 1 : (mt.unit >= 11 ? 2 : 5);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = -mt.R; v <= mt.R; v++){
      const x = X(v, mt);
      ctx_line(x, mt.axisY - 5, x, mt.axisY + 5, '#B9C6E0', 1.5);
      if (v % step === 0){
        ctx.fillStyle = v === 0 ? '#2B3A55' : '#8A98B8';
        ctx.font = (v === 0 ? 'bold ' : '') + '11px system-ui';
        ctx.fillText(String(v), x, mt.axisY + 9);
      }
    }

    // —— 加法动画：先走第一个加数，再接着走第二个加数 ——
    if (anim){
      const total = Math.abs(st.A) + Math.abs(st.B);
      if (total > 0){
        const f1 = Math.abs(st.A) / total; // 第一段动画所占时长比例
        if (anim.t <= f1){
          drawArrowLine(mt, 0, st.A * (anim.t / f1), '#5B8DEF', fmtS(st.A));
        }else{
          drawArrowLine(mt, 0, st.A, '#5B8DEF', fmtS(st.A));
          drawArrowLine(mt, st.A, st.A + st.B * ((anim.t - f1) / (1 - f1)), '#FF9F43', fmtS(st.B));
        }
      }
    }

    // —— 结果点高亮 ——
    if (resultPulse !== null){
      const x = X(st.A + st.B, mt), p = resultPulse;
      ctx.beginPath(); ctx.arc(x, mt.axisY, 14 + (1 - p) * 26, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(46,204,113,' + (0.9 - p * 0.5) + ')'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, mt.axisY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#2ECC71'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#157F44'; ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('A + B = ' + fmt(st.A + st.B), x, mt.axisY - 30);
    }

    // —— 两个可拖动的点 ——
    const drawPoint = (v, color, name) => {
      const x = X(v, mt);
      ctx.beginPath(); ctx.arc(x, mt.axisY, 12, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#2B3A55'; ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(name + ' = ' + fmt(v), x, mt.axisY - 17);
    };
    drawPoint(st.A, '#5B8DEF', 'A');
    drawPoint(st.B, '#FF9F43', 'B');
  }

  // —— 法则提示文字 ——
  function ruleText(){
    const { A, B } = st;
    if (A === 0 || B === 0) return '有一个加数是 0：任何数加 0 仍得这个数。';
    if (A * B > 0) return '同号两数相加：取相同的符号，并把绝对值相加。';
    return '异号两数相加：取绝对值较大的加数的符号，并用较大的绝对值减去较小的绝对值。';
  }

  function setChip(el, txt){ el.textContent = txt; flash(el.closest('.chip') || el); }
  function updateReadouts(){
    setChip(els.A, fmt(st.A)); setChip(els.B, fmt(st.B));
    setChip(els.absA, fmt(Math.abs(st.A))); setChip(els.absB, fmt(Math.abs(st.B)));
    setChip(els.sum, fmt(st.A + st.B)); setChip(els.diff, fmt(st.A - st.B));
    els.rule.textContent = '加法法则：' + ruleText();
  }

  function afterChange(){ anim = null; resultPulse = null; updateReadouts(); draw(); }

  // —— 播放 A+B 的行走动画 ——
  function playAnim(){
    const total = Math.abs(st.A) + Math.abs(st.B);
    resultPulse = null;
    if (total === 0){ finishPulse(); return; } // 0 + 0 直接高亮原点
    const dur = Math.min(3400, Math.max(900, total * 230));
    animate(dur, t => { anim = { t }; draw(); }, () => { anim = null; success(); finishPulse(); });
  }
  function finishPulse(){
    const t0 = performance.now();
    (function pulse(now){
      const p = (now - t0) / 1200;
      resultPulse = Math.min(1, p);
      draw();
      if (p < 1) requestAnimationFrame(pulse);
    })(t0);
  }

  // —— 拖动交互 ——
  onPointer(canvas, {
    down(p){
      const mt = metrics();
      const dA = Math.abs(p.x - X(st.A, mt)), dB = Math.abs(p.x - X(st.B, mt));
      if (Math.min(dA, dB) < 26 && Math.abs(p.y - mt.axisY) < 34) drag = dA <= dB ? 'A' : 'B';
    },
    move(p){
      if (!drag) return;
      const mt = metrics();
      let v = Math.round((p.x - mt.x0) / mt.unit - mt.R);
      v = Math.max(-mt.R, Math.min(mt.R, v));
      if (v !== st[drag]){
        st[drag] = v;
        afterChange();
        beep(480 + (v + mt.R) * 22, 0.03, 'sine', 0.05);
      }
    },
    up(){ drag = null; }
  });

  // —— 按钮 ——
  $('nlPlay').addEventListener('click', playAnim);
  $('nlSame').addEventListener('click', () => { st.A = 4; st.B = 3; afterChange(); playAnim(); });
  $('nlDiffDemo').addEventListener('click', () => { st.A = 6; st.B = -9; afterChange(); playAnim(); });
  $('nlReset').addEventListener('click', () => { st.A = -3; st.B = 5; afterChange(); clickSound(); });
  $('nlRandom').addEventListener('click', () => {
    st.A = randInt(-9, 9); st.B = randInt(-9, 9);
    if (st.A === 0 && st.B === 0) st.B = 4;
    afterChange(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  updateReadouts(); draw();
})();

/* ============================================================
 * 模块二：整式运算（幂的运算）—— 方块堆叠合并
 * ============================================================ */
(function initPower(){
  const st = { m: 3, n: 2, a: 2 };
  let merged = false;
  const g1 = $('powG1'), g2 = $('powG2'), plusEl = $('powPlus'), resultEl = $('powResult');

  // —— 指数转 Unicode 上标（KaTeX 不可用时的回退显示） ——
  const supMap = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','m':'ᵐ','n':'ⁿ' };
  const sup = s => String(s).split('').map(c => supMap[c] || c).join('');

  function makeBlock(orange){
    const d = document.createElement('div');
    d.className = 'block' + (orange ? ' b2' : '');
    d.textContent = 'a';
    return d;
  }

  // —— 重新搭建方块（两组：m 个蓝块 + n 个橙块） ——
  function build(){
    g1.innerHTML = ''; g2.innerHTML = '';
    for (let i = 0; i < st.m; i++) g1.appendChild(makeBlock(false));
    for (let i = 0; i < st.n; i++) g2.appendChild(makeBlock(true));
    $('powCap1').textContent = 'a 的 ' + st.m + ' 次方（' + st.m + ' 个 a 相乘）';
    $('powCap2').textContent = 'a 的 ' + st.n + ' 次方（' + st.n + ' 个 a 相乘）';
    $('powMVal').textContent = st.m; $('powNVal').textContent = st.n; $('powAVal').textContent = st.a;
    plusEl.style.opacity = 1;
    resultEl.classList.remove('show');
    merged = false;
    $('powMerge').disabled = false;
    updateTex();
  }

  // —— 公式与数值验证 ——
  function updateTex(){
    const dots = k => Array(k).fill('a').join(' \\cdot ');
    renderTex($('powExpand'),
      'a^{' + st.m + '} \\times a^{' + st.n + '} = (' + dots(st.m) + ') \\times (' + dots(st.n) + ') = a^{' + (st.m + st.n) + '}',
      'a' + sup(st.m) + ' × a' + sup(st.n) + ' = (' + Array(st.m).fill('a').join('·') + ') × (' + Array(st.n).fill('a').join('·') + ') = a' + sup(st.m + st.n));
    const p1 = Math.pow(st.a, st.m), p2 = Math.pow(st.a, st.n), p3 = Math.pow(st.a, st.m + st.n);
    $('powVerify').innerHTML = '数值验证（a=' + st.a + '）：' + st.a + '<sup>' + st.m + '</sup> × ' + st.a + '<sup>' + st.n + '</sup> = ' + p1 + ' × ' + p2 + ' = ' + (p1 * p2) + '，' + st.a + '<sup>' + (st.m + st.n) + '</sup> = ' + p3 + '　✓ 相等';
  }

  // —— 合并动画：所有方块依次变绿 ——
  $('powMerge').addEventListener('click', () => {
    if (merged) return;
    merged = true;
    $('powMerge').disabled = true;
    const blocks = Array.from(g1.children).concat(Array.from(g2.children));
    plusEl.style.opacity = 0;
    blocks.forEach((b, i) => setTimeout(() => {
      b.classList.add('merged');
      beep(600 + i * 30, 0.05, 'sine', 0.06);
    }, i * 70));
    setTimeout(() => {
      resultEl.textContent = '合并完成：一共 ' + st.m + ' + ' + st.n + ' = ' + (st.m + st.n) + ' 个 a 相乘 → a 的 ' + (st.m + st.n) + ' 次方';
      resultEl.classList.add('show');
      success();
    }, blocks.length * 70 + 350);
  });

  // —— 步进器（m、n 范围 1~8，a 范围 2~5） ——
  function bindStepper(minusId, plusId, key, min, max){
    $(minusId).addEventListener('click', () => { if (st[key] > min){ st[key]--; build(); clickSound(); } });
    $(plusId).addEventListener('click', () => { if (st[key] < max){ st[key]++; build(); clickSound(); } });
  }
  bindStepper('powMMinus', 'powMPlus', 'm', 1, 8);
  bindStepper('powNMinus', 'powNPlus', 'n', 1, 8);
  bindStepper('powAMinus', 'powAPlus', 'a', 2, 5);

  $('powReset').addEventListener('click', () => { st.m = 3; st.n = 2; st.a = 2; build(); clickSound(); });
  $('powRandom').addEventListener('click', () => { st.m = randInt(1, 8); st.n = randInt(1, 8); st.a = randInt(2, 5); build(); clickSound(); });

  build();
})();

/* ============================================================
 * 模块三：乘法公式（几何面积法）
 * ============================================================ */

/* ---------- 3.1 平方差公式：(a+b)(a−b) = a²−b² ---------- */
(function initDiffSquare(){
  const canvas = $('dsqCanvas');
  let view = fitCanvas(canvas);
  const st = { a: 8, b: 3, t: 0 }; // t：剪拼动画进度 0~1
  let animating = false;

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const a = st.a, b = st.b, t = st.t;
    const s = Math.min((W - 100) / (a + b), (H - 120) / a); // 每单位长度像素
    const ox = (W - (a + b) * s) / 2, oy = 46;

    // —— 原来的大正方形 a×a（灰色虚线框） ——
    ctx.setLineDash([6, 5]); ctx.strokeStyle = '#A9B8D8'; ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, a * s, a * s);
    ctx.setLineDash([]);

    // —— 被减去的 b×b 小正方形（右上角，红色示意） ——
    ctx.fillStyle = 'rgba(231,76,60,.15)';
    ctx.fillRect(ox + (a - b) * s, oy, b * s, b * s);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#E74C3C'; ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + (a - b) * s, oy, b * s, b * s);
    ctx.setLineDash([]);
    ctx.fillStyle = '#C0392B'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('−b²', ox + (a - b / 2) * s, oy + b * s / 2);

    // —— 矩形 1：a × (a−b)，固定不动（蓝色） ——
    ctx.fillStyle = 'rgba(91,141,239,.85)';
    ctx.fillRect(ox, oy + b * s, a * s, (a - b) * s);
    ctx.lineWidth = 2; ctx.strokeStyle = '#3F6FD1';
    ctx.strokeRect(ox, oy + b * s, a * s, (a - b) * s);

    // —— 矩形 2：(a−b) × b，随动画旋转 90° 并移到右侧（橙色） ——
    const w = (a - b) * s, h = b * s;
    const c0 = { x: ox + w / 2, y: oy + h / 2 };                          // 起点中心（左上）
    const c1 = { x: ox + a * s + h / 2, y: oy + b * s + w / 2 };          // 终点中心（右侧）
    const cx = lerp(c0.x, c1.x, t), cy = lerp(c0.y, c1.y, t);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * Math.PI / 2);                                          // 0° → 90°
    ctx.fillStyle = 'rgba(255,159,67,.9)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = 2; ctx.strokeStyle = '#E08A2D';
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();

    // —— 面积文字（始终水平绘制，避免随矩形旋转） ——
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (a * s > 60 && (a - b) * s > 26)
      ctx.fillText('a(a−b) = ' + a * (a - b), ox + a * s / 2, oy + b * s + (a - b) * s / 2);
    if (Math.min(w, h) > 22)
      ctx.fillText('b(a−b) = ' + b * (a - b), cx, cy);

    // —— 尺寸标注 ——
    ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('a−b', ox + (a - b) * s / 2, oy - 6);
    ctx.fillText('b', ox + (a - b / 2) * s, oy - 6);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('b', ox - 8, oy + b * s / 2);
    ctx.fillText('a−b', ox - 8, oy + b * s + (a - b) * s / 2);

    // —— 拼好后：整体长宽标注 ——
    if (t > 0.98){
      ctx.fillStyle = '#2B3A55'; ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('长 = a + b = ' + (a + b), ox + (a + b) * s / 2, oy + a * s + 8);
      ctx.save();
      ctx.translate(ox + (a + b) * s + 16, oy + b * s + (a - b) * s / 2);
      ctx.rotate(Math.PI / 2);
      ctx.textBaseline = 'middle';
      ctx.fillText('宽 = a − b = ' + (a - b), 0, 0);
      ctx.restore();
    }
  }

  function updateReadouts(){
    const a = st.a, b = st.b;
    $('dsqR1').textContent = 'a² − b² = ' + (a * a) + ' − ' + (b * b) + ' = ' + (a * a - b * b);
    $('dsqR2').textContent = '(a+b)(a−b) = ' + (a + b) + ' × ' + (a - b) + ' = ' + ((a + b) * (a - b));
    $('dsqOk').textContent = '✓ 两者相等';
    $('dsqAVal').textContent = a; $('dsqBVal').textContent = b;
  }
  function refresh(){ st.t = 0; updateReadouts(); draw(); }

  $('dsqPlay').addEventListener('click', () => {
    if (animating) return;
    animating = true; st.t = 0; draw();
    animate(1500, p => { st.t = easeInOut(p); draw(); }, () => { animating = false; success(); });
  });
  $('dsqA').addEventListener('input', e => {
    st.a = +e.target.value;
    if (st.b > st.a - 1){ st.b = st.a - 1; $('dsqB').value = st.b; } // 保证 a > b
    refresh();
  });
  $('dsqB').addEventListener('input', e => {
    st.b = +e.target.value;
    if (st.b > st.a - 1){ st.b = st.a - 1; e.target.value = st.b; }
    refresh();
  });
  $('dsqReset').addEventListener('click', () => {
    st.a = 8; st.b = 3; $('dsqA').value = 8; $('dsqB').value = 3; refresh(); clickSound();
  });
  $('dsqRandom').addEventListener('click', () => {
    st.a = randInt(5, 10); st.b = randInt(1, st.a - 1);
    $('dsqA').value = st.a; $('dsqB').value = st.b; refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  updateReadouts(); draw();
})();

/* ---------- 3.2 完全平方公式：(a+b)² = a²+2ab+b² ---------- */
(function initPerfectSquare(){
  const canvas = $('psqCanvas');
  let view = fitCanvas(canvas);
  const st = { a: 5, b: 3, active: -1 }; // active：当前高亮的区域 0~3
  const chips = Array.from(document.querySelectorAll('#psqChips .fchip'));
  const chipColors = ['blue', 'orange', 'orange', 'green'];

  function geom(){
    const { W, H } = view;
    const s = Math.min((W - 110) / (st.a + st.b), (H - 110) / (st.a + st.b));
    return { s, ox: (W - (st.a + st.b) * s) / 2, oy: (H - (st.a + st.b) * s) / 2 + 6 };
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const a = st.a, b = st.b, { s, ox, oy } = geom();
    // —— 四个区域：a²、ab、ab、b² ——
    const regs = [
      { x: 0, y: 0, w: a, h: a, fill: 'rgba(91,141,239,.88)', line: '#3F6FD1', txt: 'a² = ' + a * a },
      { x: a, y: 0, w: b, h: a, fill: 'rgba(255,159,67,.92)', line: '#E08A2D', txt: 'ab = ' + a * b },
      { x: 0, y: a, w: a, h: b, fill: 'rgba(255,179,102,.85)', line: '#E08A2D', txt: 'ab = ' + a * b },
      { x: a, y: a, w: b, h: b, fill: 'rgba(46,204,113,.88)', line: '#1E9E54', txt: 'b² = ' + b * b }
    ];
    regs.forEach((r, i) => {
      const X0 = ox + r.x * s, Y0 = oy + r.y * s, W0 = r.w * s, H0 = r.h * s;
      ctx.fillStyle = r.fill;
      ctx.fillRect(X0, Y0, W0, H0);
      if (st.active === i){ // 高亮：白色内边框
        ctx.lineWidth = 4; ctx.strokeStyle = '#fff';
        ctx.strokeRect(X0 + 3, Y0 + 3, W0 - 6, H0 - 6);
      }
      ctx.lineWidth = 2; ctx.strokeStyle = r.line;
      ctx.strokeRect(X0, Y0, W0, H0);
      if (W0 > 46 && H0 > 30){
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(r.txt, X0 + W0 / 2, Y0 + H0 / 2);
      }
    });
    // —— 外边尺寸标注 ——
    ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('a', ox + a * s / 2, oy - 6);
    ctx.fillText('b', ox + a * s + b * s / 2, oy - 6);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('a', ox - 8, oy + a * s / 2);
    ctx.fillText('b', ox - 8, oy + a * s + b * s / 2);
  }

  // —— 指针位置 → 区域编号 ——
  function regionAt(p){
    const a = st.a, b = st.b, { s, ox, oy } = geom();
    const rx = (p.x - ox) / s, ry = (p.y - oy) / s;
    if (rx < 0 || ry < 0 || rx > a + b || ry > a + b) return -1;
    return ry < a ? (rx < a ? 0 : 1) : (rx < a ? 2 : 3);
  }
  function setActive(i){
    if (i === st.active) return;
    st.active = i;
    chips.forEach((c, j) => { c.className = 'fchip' + (j === i ? ' on-' + chipColors[j] : ''); });
    draw();
  }
  canvas.addEventListener('pointermove', e => setActive(regionAt(pointerPos(canvas, e))));
  canvas.addEventListener('pointerdown', e => { setActive(regionAt(pointerPos(canvas, e))); clickSound(); });
  canvas.addEventListener('pointerleave', () => setActive(-1));

  function updateReadouts(){
    const a = st.a, b = st.b;
    $('psqR1').textContent = '(a+b)² = ' + (a + b) + '² = ' + Math.pow(a + b, 2);
    $('psqR2').textContent = 'a² + ab + ab + b² = ' + (a * a) + ' + ' + (a * b) + ' + ' + (a * b) + ' + ' + (b * b) + ' = ' + (a * a + 2 * a * b + b * b);
    $('psqOk').textContent = '✓ 相等';
    $('psqAVal').textContent = a; $('psqBVal').textContent = b;
  }
  function refresh(){ updateReadouts(); draw(); }

  $('psqA').addEventListener('input', e => { st.a = +e.target.value; refresh(); });
  $('psqB').addEventListener('input', e => { st.b = +e.target.value; refresh(); });
  $('psqReset').addEventListener('click', () => {
    st.a = 5; st.b = 3; $('psqA').value = 5; $('psqB').value = 3; refresh(); clickSound();
  });
  $('psqRandom').addEventListener('click', () => {
    st.a = randInt(2, 8); st.b = randInt(1, 6);
    $('psqA').value = st.a; $('psqB').value = st.b; refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  updateReadouts(); draw();
})();

/* ============================================================
 * 模块四：一元一次方程 —— 天平平衡演示
 * ============================================================ */
(function initBalance(){
  const canvas = $('balCanvas');
  let view = fitCanvas(canvas);
  const st = { a: 2, b: 3, c: 9, step: 0 }; // step：0 原方程 / 1 移项后 / 2 化系数为 1 后
  let rock = 1;          // 天平摇摆进度（1 = 静止）
  let itemsAlpha = 1;    // 物品淡入淡出
  let flyList = null;    // 移项时正在飞走的小球
  let flyP = 0;
  let busy = false;      // 动画进行中禁止切换步骤

  // —— 当前方程的解 ——
  const xVal = () => (st.c - st.b) / st.a;
  const trim2 = x => String(Math.round(x * 100) / 100);
  function xStr(){
    const v = st.c - st.b, a = st.a;
    if (v % a === 0) return String(v / a);
    const g = gcd(v, a);
    return (v / g) + '/' + (a / g) + '（≈' + trim2(v / a) + '）';
  }

  // —— 布局参数 ——
  function layout(){
    const W = view.W;
    return { cx: W / 2, beamY: 92, bh: Math.min(W * 0.30, 180), panY: 240 };
  }
  // —— 托盘上物品的摆放位置（每行 4 个，向上堆叠） ——
  function itemPositions(count, panX, panY){
    const per = 4, gap = 30, pos = [];
    for (let i = 0; i < count; i++){
      const row = Math.floor(i / per), col = i % per;
      const rowCount = Math.min(per, count - row * per);
      const rowW = (rowCount - 1) * gap;
      pos.push({ x: panX - rowW / 2 + col * gap, y: panY - 22 - row * gap });
    }
    return pos;
  }
  // —— 各步骤下两个托盘的内容 ——
  function panContents(){
    if (st.step === 0) return { blocks: st.a, ballsL: st.b, ballsR: st.c };
    if (st.step === 1) return { blocks: st.a, ballsL: 0, ballsR: st.c - st.b };
    return { blocks: 1, ballsL: 0, ballsR: (st.c - st.b) / st.a };
  }

  function drawBlock(ctx, x, y){
    ctx.fillStyle = '#5B8DEF';
    ctx.beginPath();
    ctx.roundRect(x - 13, y - 13, 26, 26, 6);
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#3F6FD1'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('x', x, y + 1);
  }
  function drawBall(ctx, x, y){
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#FF9F43'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#E08A2D'; ctx.stroke();
  }
  // —— 分数个小球：按扇形比例填充 ——
  function drawPartialBall(ctx, x, y, frac){
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,159,67,.2)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.closePath(); ctx.fillStyle = 'rgba(255,159,67,.9)'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.lineWidth = 2; ctx.strokeStyle = '#E08A2D'; ctx.stroke();
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const L = layout();

    // —— 支点三角形（固定不动） ——
    ctx.fillStyle = '#8A98B8';
    ctx.beginPath();
    ctx.moveTo(L.cx - 26, L.beamY + 72);
    ctx.lineTo(L.cx + 26, L.beamY + 72);
    ctx.lineTo(L.cx, L.beamY + 4);
    ctx.closePath(); ctx.fill();

    // —— 摇摆的横梁系统（横梁 + 吊绳 + 托盘 + 物品） ——
    const ang = 0.14 * (1 - rock) * Math.sin(rock * Math.PI * 4);
    ctx.save();
    ctx.translate(L.cx, L.beamY);
    ctx.rotate(ang);
    ctx.translate(-L.cx, -L.beamY);

    ctx.strokeStyle = '#5B8DEF'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    line(ctx, L.cx - L.bh, L.beamY, L.cx + L.bh, L.beamY);

    [L.cx - L.bh, L.cx + L.bh].forEach(px => {
      ctx.strokeStyle = '#93A5C9'; ctx.lineWidth = 2;
      line(ctx, px, L.beamY, px, L.panY - 8);
      ctx.beginPath(); ctx.arc(px, L.panY - 8, 56, 0, Math.PI, false); // 半圆托盘
      ctx.fillStyle = '#DEE8FD'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#7A9BE8'; ctx.stroke();
    });

    // —— 托盘上的物品 ——
    const cont = panContents();
    ctx.globalAlpha = itemsAlpha;
    // 左盘：a 个 x 方块 + b 个小球
    const lp = itemPositions(cont.blocks + cont.ballsL, L.cx - L.bh, L.panY);
    let idx = 0;
    for (let i = 0; i < cont.blocks; i++) drawBlock(ctx, lp[idx].x, lp[idx++].y);
    for (let i = 0; i < cont.ballsL; i++){
      const p = lp[idx++];
      if (!flyList) drawBall(ctx, p.x, p.y); // 移项动画中左盘小球全部在飞
    }
    // 右盘：c 个小球（步骤 2 时可能是分数个）
    const total = Math.ceil(cont.ballsR);
    const rp = itemPositions(total, L.cx + L.bh, L.panY);
    for (let i = 0; i < total; i++){
      if (flyList && i < st.b) continue; // 前 b 个正在飞走
      if (i < Math.floor(cont.ballsR)) drawBall(ctx, rp[i].x, rp[i].y);
      else drawPartialBall(ctx, rp[i].x, rp[i].y, cont.ballsR - Math.floor(cont.ballsR));
    }
    ctx.globalAlpha = 1;

    // —— 正在飞走的小球（向上飘出并淡出） ——
    if (flyList){
      ctx.globalAlpha = 1 - flyP;
      flyList.forEach(f => drawBall(ctx, f.x, f.y - 80 * flyP));
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    drawNumberLine(ctx, W);
  }

  // —— 底部：解在数轴上的位置 ——
  function drawNumberLine(ctx, W){
    const y = 404, x0 = 30, x1 = W - 30;
    const xv = xVal();
    const M = Math.max(6, Math.ceil(xv) + 2);
    const u = (x1 - x0) / M;
    ctx.strokeStyle = '#93A5C9'; ctx.lineWidth = 2;
    line(ctx, x0, y, x1 + 10, y);
    ctx.fillStyle = '#93A5C9';
    ctx.beginPath();
    ctx.moveTo(x1 + 16, y); ctx.lineTo(x1 + 6, y - 5); ctx.lineTo(x1 + 6, y + 5);
    ctx.closePath(); ctx.fill();
    const labelStep = u >= 26 ? 1 : (u >= 14 ? 2 : 5);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = 0; v <= M; v++){
      ctx.strokeStyle = '#B9C6E0'; ctx.lineWidth = 1.5;
      line(ctx, x0 + v * u, y - 5, x0 + v * u, y + 5);
      if (v % labelStep === 0){
        ctx.fillStyle = '#8A98B8'; ctx.font = '11px system-ui';
        ctx.fillText(String(v), x0 + v * u, y + 9);
      }
    }
    // x 的位置标记
    const px = x0 + xv * u;
    ctx.beginPath(); ctx.arc(px, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#2ECC71'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#157F44'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('x = ' + xStr().split('（')[0], px, y - 14);
    ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('解 x 在数轴上的位置：', x0, y - 32);
  }

  // —— 各步骤的方程显示（KaTeX + 纯文本回退） ——
  function eqTex(){
    const { a, b, c, step } = st;
    if (step === 0)
      return b === 0
        ? [a + 'x = ' + c, a + 'x = ' + c]
        : [a + 'x + ' + b + ' = ' + c, a + 'x + ' + b + ' = ' + c];
    if (step === 1)
      return b === 0
        ? [a + 'x = ' + c, a + 'x = ' + c]
        : [a + 'x = ' + c + ' - ' + b + ' = ' + (c - b), a + 'x = ' + c + ' − ' + b + ' = ' + (c - b)];
    const v = c - b;
    if (v === 0) return ['x = 0', 'x = 0'];
    if (a === 1 || v % a === 0) return ['x = ' + (v / a), 'x = ' + (v / a)];
    const g = gcd(v, a);
    return [
      'x = \\frac{' + v + '}{' + a + '} = \\frac{' + (v / g) + '}{' + (a / g) + '} \\approx ' + trim2(v / a),
      'x = ' + v + '/' + a + ' = ' + (v / g) + '/' + (a / g) + ' ≈ ' + trim2(v / a)
    ];
  }
  function stepText(){
    const { a, b, c, step } = st;
    if (step === 0) return '原方程：左盘 ' + a + ' 个 x 方块和 ' + b + ' 个小球，右盘 ' + c + ' 个小球，天平平衡。';
    if (step === 1) return '第 1 步 · 移项：两边同时减去 ' + b + '，天平仍然平衡。';
    return '第 2 步 · 化系数为 1：两边同时除以 ' + a + '，求出 x。';
  }

  function refresh(){
    const [tex, plain] = eqTex();
    renderTex($('balEq'), tex, plain);
    $('balStepText').textContent = stepText();
    $('balX').textContent = 'x = ' + xStr();
    $('balAVal').textContent = st.a; $('balBVal').textContent = st.b; $('balCVal').textContent = st.c;
    Array.from($('balDots').children).forEach((d, i) => d.classList.toggle('on', i === st.step));
    $('balPrev').disabled = st.step === 0;
    $('balNext').disabled = st.step === 2;
    draw();
  }

  function rockAnim(){
    rock = 0;
    animate(900, p => { rock = p; draw(); }, () => { rock = 1; draw(); });
  }

  // —— 步骤切换（带物品动画） ——
  function gotoStep(n){
    if (busy || n === st.step || n < 0 || n > 2) return;
    busy = true;
    if (st.step === 0 && n === 1 && st.b > 0){
      // 移项动画：两边各 b 个小球飞走
      const L = layout(), cont = panContents();
      const lp = itemPositions(cont.blocks + cont.ballsL, L.cx - L.bh, L.panY);
      const rp = itemPositions(cont.ballsR, L.cx + L.bh, L.panY);
      flyList = [];
      for (let i = 0; i < st.b; i++){
        flyList.push(lp[cont.blocks + i]);
        flyList.push(rp[i]);
      }
      animate(700, p => { flyP = p; draw(); }, () => {
        flyList = null; st.step = 1; busy = false;
        refresh(); rockAnim(); success();
      });
    }else{
      // 通用淡入淡出过渡
      animate(280, p => { itemsAlpha = 1 - p; draw(); }, () => {
        st.step = n;
        animate(280, p => { itemsAlpha = p; draw(); }, () => {
          itemsAlpha = 1; busy = false;
          refresh(); rockAnim(); success();
        });
      });
    }
  }

  function resetToStep0(){
    st.step = 0; flyList = null; itemsAlpha = 1; rock = 1;
    refresh();
  }

  $('balPrev').addEventListener('click', () => gotoStep(st.step - 1));
  $('balNext').addEventListener('click', () => gotoStep(st.step + 1));
  $('balA').addEventListener('input', e => { st.a = +e.target.value; resetToStep0(); });
  $('balB').addEventListener('input', e => {
    st.b = +e.target.value;
    if (st.c < st.b){ st.c = st.b; $('balC').value = st.c; } // 保证 c ≥ b（解非负）
    resetToStep0();
  });
  $('balC').addEventListener('input', e => {
    st.c = +e.target.value;
    if (st.c < st.b){ st.c = st.b; e.target.value = st.c; }
    resetToStep0();
  });
  $('balReset').addEventListener('click', () => {
    st.a = 2; st.b = 3; st.c = 9;
    $('balA').value = 2; $('balB').value = 3; $('balC').value = 9;
    resetToStep0(); clickSound();
  });
  $('balRandom').addEventListener('click', () => {
    st.a = randInt(1, 5); st.b = randInt(0, 8); st.c = randInt(st.b, 16);
    $('balA').value = st.a; $('balB').value = st.b; $('balC').value = st.c;
    resetToStep0(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ============================================================
 * 模块五：几何图形初步
 * ============================================================ */

/* ---------- 5.1 可拖动的角 ---------- */
(function initAngle(){
  const canvas = $('angCanvas');
  let view = fitCanvas(canvas);
  const st = { deg: 45 };
  let dragging = false;

  const geom = () => ({ Vx: view.W * 0.34, Vy: view.H * 0.70, R: Math.min(view.W * 0.52, view.H * 0.62) });

  function classify(d){
    if (d < 90) return ['锐角（小于 90°）', 'c-green'];
    if (d === 90) return ['直角（等于 90°）', 'c-blue'];
    if (d < 180) return ['钝角（大于 90°，小于 180°）', 'c-orange'];
    return ['平角（等于 180°）', 'c-red'];
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const { Vx, Vy, R } = geom();
    const rad = st.deg * Math.PI / 180;
    const Ex = Vx + R * Math.cos(rad), Ey = Vy - R * Math.sin(rad);

    // —— 角的两条边 ——
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 3;
    line(ctx, Vx, Vy, Vx + R, Vy);              // 固定边
    ctx.strokeStyle = '#5B8DEF';
    line(ctx, Vx, Vy, Ex, Ey);                  // 可动边

    // —— 角度弧线（直角画小方块符号） ——
    if (st.deg === 90){
      ctx.strokeStyle = '#FF9F43'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(Vx + 16, Vy); ctx.lineTo(Vx + 16, Vy - 16); ctx.lineTo(Vx, Vy - 16);
      ctx.stroke();
    }else{
      ctx.strokeStyle = '#FF9F43'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(Vx, Vy, 34, -rad, 0); ctx.stroke();
    }

    // —— 角度数值 ——
    const mid = rad / 2;
    ctx.fillStyle = '#B95F0E'; ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(st.deg + '°', Vx + 58 * Math.cos(mid), Vy - 58 * Math.sin(mid));

    // —— 顶点与控制点 ——
    ctx.beginPath(); ctx.arc(Vx, Vy, 5, 0, Math.PI * 2); ctx.fillStyle = '#2B3A55'; ctx.fill();
    ctx.beginPath(); ctx.arc(Ex, Ey, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#5B8DEF'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
  }

  function updateChip(){
    const [txt, cls] = classify(st.deg);
    const el = $('angClass');
    el.className = 'chip ' + cls;
    el.textContent = st.deg + '° · ' + txt;
    flash(el);
  }

  onPointer(canvas, {
    down(p){
      const { Vx, Vy, R } = geom();
      const rad = st.deg * Math.PI / 180;
      if (Math.hypot(p.x - (Vx + R * Math.cos(rad)), p.y - (Vy - R * Math.sin(rad))) < 30) dragging = true;
    },
    move(p){
      if (!dragging) return;
      const { Vx, Vy } = geom();
      let d = Math.round(Math.atan2(-(p.y - Vy), p.x - Vx) * 180 / Math.PI);
      d = Math.max(1, Math.min(180, d));
      if (d !== st.deg){ st.deg = d; updateChip(); draw(); beep(400 + d * 3, 0.03, 'sine', 0.05); }
    },
    up(){ dragging = false; }
  });

  $('angReset').addEventListener('click', () => { st.deg = 45; updateChip(); draw(); clickSound(); });
  $('angRandom').addEventListener('click', () => { st.deg = randInt(3, 33) * 5; updateChip(); draw(); clickSound(); });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  updateChip(); draw();
})();

/* ---------- 5.2 互余与互补（两个角联动） ---------- */
(function initCompSupp(){
  const canvas = $('csCanvas');
  let view = fitCanvas(canvas);
  const st = { total: 90, deg: 35 }; // total：90 互余 / 180 互补
  let dragging = false;

  const bounds = () => (st.total === 90 ? [5, 85] : [10, 170]);
  const geom = () => ({
    L: { x: view.W * 0.22, y: view.H * 0.74 },
    R: { x: view.W * 0.62, y: view.H * 0.74 },
    r: Math.min(view.W * 0.24, view.H * 0.52)
  });

  // —— 画一个完整的角（顶点 + 两边 + 控制点） ——
  function drawDraggable(ctx, V, r, deg){
    const rad = deg * Math.PI / 180;
    const Ex = V.x + r * Math.cos(rad), Ey = V.y - r * Math.sin(rad);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 3;
    line(ctx, V.x, V.y, V.x + r, V.y);
    ctx.strokeStyle = '#5B8DEF';
    line(ctx, V.x, V.y, Ex, Ey);
    ctx.strokeStyle = '#5B8DEF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(V.x, V.y, 28, -rad, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(V.x, V.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#2B3A55'; ctx.fill();
    ctx.beginPath(); ctx.arc(Ex, Ey, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#5B8DEF'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    const mid = rad / 2;
    ctx.fillStyle = '#2F5BC4'; ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('α = ' + deg + '°', V.x + 50 * Math.cos(mid), V.y - 50 * Math.sin(mid));
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const { L, R, r } = geom();
    const deg = st.deg, total = st.total;
    const radA = deg * Math.PI / 180, radT = total * Math.PI / 180;

    // —— 左边：可拖动的 α ——
    drawDraggable(ctx, L, r, deg);

    // —— 右边：α + β 拼成直角/平角 ——
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 3;
    line(ctx, R.x, R.y, R.x + r, R.y);                                     // 0° 边
    ctx.strokeStyle = '#5B8DEF'; ctx.lineWidth = 2;
    line(ctx, R.x, R.y, R.x + r * Math.cos(radA), R.y - r * Math.sin(radA)); // α 终边
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 3;
    line(ctx, R.x, R.y, R.x + r * Math.cos(radT), R.y - r * Math.sin(radT)); // 总和终边
    // α 弧（蓝）与 β 弧（橙）
    ctx.strokeStyle = '#5B8DEF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(R.x, R.y, 26, -radA, 0); ctx.stroke();
    ctx.strokeStyle = '#FF9F43';
    ctx.beginPath(); ctx.arc(R.x, R.y, 42, -radT, -radA); ctx.stroke();
    if (total === 90){ // 直角符号
      ctx.strokeStyle = '#A9B8D8'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(R.x + 15, R.y); ctx.lineTo(R.x + 15, R.y - 15); ctx.lineTo(R.x, R.y - 15);
      ctx.stroke(); ctx.setLineDash([]);
    }
    const midA = radA / 2, midB = (radA + radT) / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2F5BC4'; ctx.font = 'bold 13px system-ui';
    ctx.fillText('α', R.x + 42 * Math.cos(midA), R.y - 42 * Math.sin(midA));
    ctx.fillStyle = '#B95F0E';
    ctx.fillText('β', R.x + 60 * Math.cos(midB), R.y - 60 * Math.sin(midB));
    ctx.beginPath(); ctx.arc(R.x, R.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#2B3A55'; ctx.fill();

    // —— 图注 ——
    ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('← 拖动 α 的控制点', L.x + r * 0.35, H - 10);
    ctx.fillText('α + β = ' + total + '° →', R.x + r * 0.3, H - 10);
  }

  function refresh(){
    $('csAlpha').textContent = 'α = ' + st.deg + '°';
    $('csBeta').textContent = 'β = ' + st.total + '° − ' + st.deg + '° = ' + (st.total - st.deg) + '°';
    $('csSum').textContent = 'α + β = ' + st.total + '° ✓';
    draw();
  }

  onPointer(canvas, {
    down(p){
      const { L, r } = geom();
      const rad = st.deg * Math.PI / 180;
      if (Math.hypot(p.x - (L.x + r * Math.cos(rad)), p.y - (L.y - r * Math.sin(rad))) < 30) dragging = true;
    },
    move(p){
      if (!dragging) return;
      const { L } = geom();
      let d = Math.round(Math.atan2(-(p.y - L.y), p.x - L.x) * 180 / Math.PI);
      const [lo, hi] = bounds();
      d = Math.max(lo, Math.min(hi, d));
      if (d !== st.deg){ st.deg = d; refresh(); beep(400 + d * 3, 0.03, 'sine', 0.05); }
    },
    up(){ dragging = false; }
  });

  function setMode(total){
    st.total = total;
    $('csMode90').className = total === 90 ? 'btn btn-primary' : 'btn';
    $('csMode180').className = total === 180 ? 'btn btn-primary' : 'btn';
    const [lo, hi] = bounds();
    st.deg = Math.max(lo, Math.min(hi, st.deg));
    refresh(); clickSound();
  }
  $('csMode90').addEventListener('click', () => setMode(90));
  $('csMode180').addEventListener('click', () => setMode(180));
  $('csReset').addEventListener('click', () => { st.deg = st.total === 90 ? 35 : 120; refresh(); clickSound(); });
  $('csRandom').addEventListener('click', () => {
    const [lo, hi] = bounds();
    st.deg = randInt(Math.ceil(lo / 5), Math.floor(hi / 5)) * 5;
    refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ---------- 5.3 线段的中点 ---------- */
(function initMidpoint(){
  const canvas = $('midCanvas');
  let view = fitCanvas(canvas);
  const G = 32; // 网格间距（px）= 1 格
  const st = { A: { fx: 0.24, fy: 0.62 }, B: { fx: 0.78, fy: 0.34 } }; // 相对坐标（随画布缩放）
  let drag = null;

  const pt = f => ({ x: f.fx * view.W, y: f.fy * view.H });
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

  // —— 在线段中点处画“等长刻线” ——
  function tickMark(ctx, P, Q){
    const mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2;
    const dx = Q.x - P.x, dy = Q.y - P.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * 7, ny = dx / len * 7;
    ctx.strokeStyle = '#FF9F43'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    line(ctx, mx - nx, my - ny, mx + nx, my + ny);
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    // —— 网格背景 ——
    ctx.strokeStyle = '#EDF1FA'; ctx.lineWidth = 1;
    for (let x = G; x < W; x += G) line(ctx, x, 0, x, H);
    for (let y = G; y < H; y += G) line(ctx, 0, y, W, y);

    const A = pt(st.A), B = pt(st.B);
    const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };

    // —— 线段与等长标记 ——
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    line(ctx, A.x, A.y, B.x, B.y);
    tickMark(ctx, A, M);
    tickMark(ctx, M, B);

    // —— 端点与中点 ——
    const drawDot = (p, color, r) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    };
    drawDot(A, '#5B8DEF', 11); drawDot(B, '#FF9F43', 11); drawDot(M, '#2ECC71', 9);
    ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = '#2F5BC4'; ctx.textBaseline = 'bottom';
    ctx.fillText('A', A.x, A.y - 15);
    ctx.fillStyle = '#B95F0E';
    ctx.fillText('B', B.x, B.y - 15);
    ctx.fillStyle = '#157F44'; ctx.textBaseline = 'top';
    ctx.fillText('M', M.x, M.y + 13);
  }

  function updateChips(){
    const A = pt(st.A), B = pt(st.B);
    const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    $('midAM').textContent = 'AM = ' + (dist(A, M) / G).toFixed(1) + ' 格';
    $('midMB').textContent = 'MB = ' + (dist(M, B) / G).toFixed(1) + ' 格';
    $('midAB').textContent = 'AB = ' + (dist(A, B) / G).toFixed(1) + ' 格';
    $('midOk').textContent = '✓ AM = MB';
  }
  function refresh(){ updateChips(); draw(); }

  onPointer(canvas, {
    down(p){
      const A = pt(st.A), B = pt(st.B);
      if (dist(p, A) < 24) drag = st.A;
      else if (dist(p, B) < 24) drag = st.B;
    },
    move(p){
      if (!drag) return;
      drag.fx = Math.max(0.05, Math.min(0.95, p.x / view.W));
      drag.fy = Math.max(0.08, Math.min(0.92, p.y / view.H));
      refresh();
    },
    up(){ if (drag) clickSound(); drag = null; }
  });

  $('midReset').addEventListener('click', () => {
    st.A = { fx: 0.24, fy: 0.62 }; st.B = { fx: 0.78, fy: 0.34 };
    refresh(); clickSound();
  });
  $('midRandom').addEventListener('click', () => {
    st.A = { fx: 0.12 + Math.random() * 0.76, fy: 0.15 + Math.random() * 0.7 };
    st.B = { fx: 0.12 + Math.random() * 0.76, fy: 0.15 + Math.random() * 0.7 };
    refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); refresh(); }
  redrawAll.push(refit);
  refresh();
})();

/* ============================================================
 * 模块六：平面直角坐标系 —— 对称点探索
 * ============================================================ */
(function initCoord(){
  const canvas = $('coordCanvas');
  let view = fitCanvas(canvas);
  const N = 6;            // 坐标显示范围 [-6, 6]
  const st = { x: 3, y: 2 };
  let dragging = false;

  function geom(){
    const u = Math.floor(Math.min(view.W - 60, view.H - 60) / (2 * N));
    return { cx: view.W / 2, cy: view.H / 2, u };
  }
  const PX = (g, x) => g.cx + x * g.u;
  const PY = (g, y) => g.cy - y * g.u;

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const g = geom();

    // —— 网格 ——
    ctx.lineWidth = 1;
    for (let i = -N; i <= N; i++){
      ctx.strokeStyle = i === 0 ? '#C7D3EC' : '#E9EFFA';
      line(ctx, PX(g, i), PY(g, -N), PX(g, i), PY(g, N));
      line(ctx, PX(g, -N), PY(g, i), PX(g, N), PY(g, i));
    }

    // —— 坐标轴与箭头 ——
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 2;
    line(ctx, PX(g, -N) - 12, g.cy, PX(g, N) + 18, g.cy);
    line(ctx, g.cx, PY(g, -N) - 12, g.cx, PY(g, N) + 18);
    ctx.fillStyle = '#8494B8';
    ctx.beginPath(); // x 轴箭头
    ctx.moveTo(PX(g, N) + 24, g.cy); ctx.lineTo(PX(g, N) + 12, g.cy - 5); ctx.lineTo(PX(g, N) + 12, g.cy + 5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); // y 轴箭头
    ctx.moveTo(g.cx, PY(g, N) - 18); ctx.lineTo(g.cx - 5, PY(g, N) - 6); ctx.lineTo(g.cx + 5, PY(g, N) - 6);
    ctx.closePath(); ctx.fill();

    // —— 刻度标签 ——
    ctx.font = '10px system-ui'; ctx.fillStyle = '#93A1C0';
    for (let i = -N; i <= N; i++){
      if (i === 0) continue;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(String(i), PX(g, i), g.cy + 5);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i), g.cx - 6, PY(g, i));
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('O', g.cx - 5, g.cy + 5);
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#5B6B8C';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('x', PX(g, N) + 18, g.cy - 8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('y', g.cx + 9, PY(g, N) - 16);

    // —— P 与三个对称点 ——
    const pts = [
      { x: st.x,  y: st.y,  color: '#5B8DEF', name: 'P'  },
      { x: st.x,  y: -st.y, color: '#FF9F43', name: 'P₁' },
      { x: -st.x, y: st.y,  color: '#2ECC71', name: 'P₂' },
      { x: -st.x, y: -st.y, color: '#E74C3C', name: 'P₃' }
    ];
    // 虚线连接（对称关系）
    const dash = (p1, p2, color) => {
      ctx.setLineDash([5, 4]); ctx.strokeStyle = color; ctx.lineWidth = 1.8;
      line(ctx, PX(g, p1.x), PY(g, p1.y), PX(g, p2.x), PY(g, p2.y));
      ctx.setLineDash([]);
    };
    dash(pts[0], pts[1], '#FF9F43'); // 关于 x 轴
    dash(pts[0], pts[2], '#2ECC71'); // 关于 y 轴
    dash(pts[0], pts[3], '#E74C3C'); // 关于原点
    // 点与坐标标签（P 最后画，位于最上层）
    [pts[3], pts[2], pts[1], pts[0]].forEach(p => {
      const px = PX(g, p.x), py = PY(g, p.y);
      ctx.beginPath(); ctx.arc(px, py, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      // 标签沿“远离原点”的方向偏移，减少遮挡
      let dx = px - g.cx, dy = py - g.cy;
      const len = Math.hypot(dx, dy);
      if (len < 0.001){ dx = 0.7; dy = -0.7; } else { dx /= len; dy /= len; }
      ctx.fillStyle = p.color; ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.name + '(' + fmt(p.x) + ',' + fmt(p.y) + ')', px + dx * 36, py + dy * 26);
    });
  }

  function updateLegend(){
    $('coordP').textContent = 'P (' + fmt(st.x) + ', ' + fmt(st.y) + ')';
    $('coordP1').textContent = 'P₁ (' + fmt(st.x) + ', ' + fmt(-st.y) + ') · 关于 x 轴对称';
    $('coordP2').textContent = 'P₂ (' + fmt(-st.x) + ', ' + fmt(st.y) + ') · 关于 y 轴对称';
    $('coordP3').textContent = 'P₃ (' + fmt(-st.x) + ', ' + fmt(-st.y) + ') · 关于原点对称';
  }
  function refresh(){ updateLegend(); draw(); }

  // —— 点击/拖动放置 P（吸附到整数格点） ——
  function place(p){
    const g = geom();
    const nx = Math.max(-(N - 1), Math.min(N - 1, Math.round((p.x - g.cx) / g.u)));
    const ny = Math.max(-(N - 1), Math.min(N - 1, Math.round((g.cy - p.y) / g.u)));
    if (nx !== st.x || ny !== st.y){
      st.x = nx; st.y = ny;
      refresh();
      beep(480 + (nx + N) * 28 + (ny + N) * 8, 0.04, 'sine', 0.06);
    }
  }
  onPointer(canvas, {
    down(p){
      const g = geom();
      dragging = true;
      if (Math.hypot(p.x - PX(g, st.x), p.y - PY(g, st.y)) >= 22) place(p); // 点空白处：P 跳过去
    },
    move(p){ if (dragging) place(p); },
    up(){ dragging = false; }
  });

  $('coordReset').addEventListener('click', () => { st.x = 3; st.y = 2; refresh(); clickSound(); });
  $('coordRandom').addEventListener('click', () => { st.x = randInt(-5, 5); st.y = randInt(-5, 5); refresh(); clickSound(); });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ============================================================
 * 初二模块
 * ============================================================ */

// —— 初二模块共用：更新 chip 文本（内容变化时才播放闪烁动画） ——
function setChip2(el, txt, noFlash){
  if (!el || el.textContent === txt) return;
  el.textContent = txt;
  if (!noFlash) flash(el.closest('.chip') || el);
}
// —— 最多两位小数的简洁数字显示（负号用数学符号 −） ——
const fmt2 = x => {
  const r = Math.round(x * 100) / 100;
  return r < 0 ? '−' + Math.abs(r) : String(r);
};

/* ---------- 初二 1：勾股定理（三边正方形 + 方格验证 + 弦图证明） ---------- */
(function initPythagoras(){
  const canvas = $('pyCanvas');
  let view = fitCanvas(canvas);
  const st = { a: 3, b: 4, grid: true };
  let proof = null;    // 弦图动画进度 {t}，null 表示主视图
  let proving = false;

  // —— 主视图布局：直角顶点 P0，Q 在右（直角边 a），R 在上（直角边 b） ——
  function geom(){
    const { W, H } = view;
    const s = Math.min((W - 56) / (st.a + 2 * st.b), (H - 56) / (2 * st.a + st.b));
    return {
      s,
      ox: (W - (st.a + 2 * st.b) * s) / 2 + st.b * s,
      oy: (H - (2 * st.a + st.b) * s) / 2 + (st.a + st.b) * s
    };
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    if (proof !== null) return drawProof(ctx, W, H);
    const a = st.a, b = st.b, c2 = a * a + b * b, { s, ox, oy } = geom();
    const Q = { x: ox + a * s, y: oy }, R = { x: ox, y: oy - b * s };
    const n = { x: b * s, y: -a * s }; // 斜边正方形的外法向量（长度 = c·s）

    // —— 三个正方形：a² 蓝（下）、b² 橙（左）、c² 绿（斜边上） ——
    ctx.fillStyle = 'rgba(91,141,239,.88)';
    ctx.fillRect(ox, oy, a * s, a * s);
    ctx.lineWidth = 2; ctx.strokeStyle = '#3F6FD1';
    ctx.strokeRect(ox, oy, a * s, a * s);
    ctx.fillStyle = 'rgba(255,159,67,.92)';
    ctx.fillRect(ox - b * s, oy - b * s, b * s, b * s);
    ctx.strokeStyle = '#E08A2D';
    ctx.strokeRect(ox - b * s, oy - b * s, b * s, b * s);
    ctx.beginPath();
    ctx.moveTo(Q.x, Q.y); ctx.lineTo(R.x, R.y);
    ctx.lineTo(R.x + n.x, R.y + n.y); ctx.lineTo(Q.x + n.x, Q.y + n.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(46,204,113,.88)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#1E9E54'; ctx.stroke();

    // —— 方格验证：每个正方形里画单位小方格，可以数格子 ——
    if (st.grid && s >= 8){
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.65)';
      for (let i = 1; i < a; i++){
        line(ctx, ox + i * s, oy, ox + i * s, oy + a * s);
        line(ctx, ox, oy + i * s, ox + a * s, oy + i * s);
      }
      for (let i = 1; i < b; i++){
        line(ctx, ox - b * s + i * s, oy - b * s, ox - b * s + i * s, oy);
        line(ctx, ox - b * s, oy - b * s + i * s, ox, oy - b * s + i * s);
      }
      // 斜边上的正方形：沿斜边方向和法线方向画格线（裁剪在正方形内）
      const c = Math.sqrt(c2);
      const ex = (R.x - Q.x) / (c * s), ey = (R.y - Q.y) / (c * s);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(Q.x, Q.y); ctx.lineTo(R.x, R.y);
      ctx.lineTo(R.x + n.x, R.y + n.y); ctx.lineTo(Q.x + n.x, Q.y + n.y);
      ctx.closePath(); ctx.clip();
      for (let k = 1; k < Math.ceil(c); k++){
        line(ctx, Q.x + ex * k * s, Q.y + ey * k * s, Q.x + ex * k * s + n.x, Q.y + ey * k * s + n.y);
        line(ctx, Q.x + n.x * k / c, Q.y + n.y * k / c, R.x + n.x * k / c, R.y + n.y * k / c);
      }
      ctx.restore();
    }

    // —— 直角三角形本体 + 直角符号 ——
    ctx.beginPath();
    ctx.moveTo(ox, oy); ctx.lineTo(Q.x, Q.y); ctx.lineTo(R.x, R.y);
    ctx.closePath();
    ctx.fillStyle = '#F2F0EA'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#8494B8'; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#A9B8D8';
    ctx.beginPath();
    ctx.moveTo(ox + 11, oy); ctx.lineTo(ox + 11, oy - 11); ctx.lineTo(ox, oy - 11);
    ctx.stroke();

    // —— 面积标签（正方形够大时写在内部） ——
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui';
    if (a * s > 46) ctx.fillText('a² = ' + a * a, ox + a * s / 2, oy + a * s / 2);
    if (b * s > 46) ctx.fillText('b² = ' + b * b, ox - b * s / 2, oy - b * s / 2);
    if (Math.sqrt(c2) * s > 52)
      ctx.fillText('c² = ' + c2, (Q.x + R.x + n.x) / 2, (Q.y + R.y + n.y) / 2);

    // —— 三条边的边长标签 ——
    ctx.fillStyle = '#5B6B8C'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('a = ' + a, ox + a * s / 2, oy + a * s + 8);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('b = ' + b, ox - b * s - 8, oy - b * s / 2);
    ctx.textAlign = 'left';
    ctx.fillText('c', (Q.x + R.x) / 2 + n.x + 8, (Q.y + R.y) / 2 + n.y);
  }

  // —— 弦图证明：大正方形 (a+b)² 里 4 个全等三角形滑一滑，c² 变 a²+b² ——
  function drawProof(ctx, W, H){
    const a = st.a, b = st.b, t = easeInOut(proof.t);
    const s = Math.min((W - 90) / (a + b), (H - 120) / (a + b));
    const ox = (W - (a + b) * s) / 2, oy = (H - (a + b) * s) / 2 + 8;

    ctx.lineWidth = 2.5; ctx.strokeStyle = '#8494B8';
    ctx.strokeRect(ox, oy, (a + b) * s, (a + b) * s);

    // 每个三角形：直角在原点，边 a 沿 +x、边 b 沿 +y，再整体旋转 90° 的倍数
    // from：围出中间倾斜的 c²；to：围出 a² 和 b²（旋转不变，只平移滑动）
    const rots = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2];
    const from = [{x:0,y:0},{x:a+b,y:0},{x:a+b,y:a+b},{x:0,y:a+b}];
    const to   = [{x:0,y:a},{x:a+b,y:0},{x:a,y:a+b},{x:a,y:a}];
    const fills = ['rgba(91,141,239,.55)','rgba(255,159,67,.55)','rgba(91,141,239,.45)','rgba(255,159,67,.45)'];
    const lines = ['#3F6FD1','#E08A2D','#3F6FD1','#E08A2D'];
    for (let i = 0; i < 4; i++){
      ctx.save();
      ctx.translate(ox + lerp(from[i].x, to[i].x, t) * s, oy + lerp(from[i].y, to[i].y, t) * s);
      ctx.rotate(rots[i]);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(a * s, 0); ctx.lineTo(0, b * s);
      ctx.closePath();
      ctx.fillStyle = fills[i]; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = lines[i]; ctx.stroke();
      ctx.restore();
    }

    // 起点高亮倾斜的 c²，终点高亮 a² 与 b²
    if (t < 0.98){
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.beginPath();
      ctx.moveTo(ox + a * s, oy); ctx.lineTo(ox + (a + b) * s, oy + a * s);
      ctx.lineTo(ox + b * s, oy + (a + b) * s); ctx.lineTo(ox, oy + b * s);
      ctx.closePath();
      ctx.fillStyle = 'rgba(46,204,113,.28)'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#1E9E54'; ctx.stroke();
      ctx.fillStyle = '#157F44'; ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('c² = ' + (a * a + b * b), ox + (a + b) * s / 2, oy + (a + b) * s / 2);
      ctx.restore();
    }
    if (t > 0.02){
      ctx.save();
      ctx.globalAlpha = t;
      ctx.fillStyle = 'rgba(46,204,113,.28)';
      ctx.fillRect(ox, oy, a * s, a * s);
      ctx.fillRect(ox + a * s, oy + a * s, b * s, b * s);
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#1E9E54';
      ctx.strokeRect(ox, oy, a * s, a * s);
      ctx.strokeRect(ox + a * s, oy + a * s, b * s, b * s);
      ctx.fillStyle = '#157F44'; ctx.font = 'bold 15px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('a² = ' + a * a, ox + a * s / 2, oy + a * s / 2);
      if (b * s > 30) ctx.fillText('b² = ' + b * b, ox + a * s + b * s / 2, oy + a * s + b * s / 2);
      ctx.restore();
    }

    ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('大正方形边长 = a + b = ' + (a + b), ox + (a + b) * s / 2, oy - 6);
    ctx.textBaseline = 'top';
    ctx.fillText('面积不变：4 个三角形 + c² = 4 个三角形 + a² + b²', ox + (a + b) * s / 2, oy + (a + b) * s + 8);
  }

  function updateReadouts(){
    const a = st.a, b = st.b, c2 = a * a + b * b, c = Math.sqrt(c2);
    const cInt = Number.isInteger(c);
    setChip2($('pyA2'), String(a * a));
    setChip2($('pyB2'), String(b * b));
    setChip2($('pyC2'), String(c2));
    setChip2($('pyC'), cInt ? String(c) : '√' + c2 + ' ≈ ' + c.toFixed(3));
    setChip2($('pyOk'), '✓ ' + a * a + ' + ' + b * b + ' = ' + c2);
    $('pyAVal').textContent = a; $('pyBVal').textContent = b;
    $('pyGrid').textContent = '方格验证：' + (st.grid ? '开' : '关');
    $('pyGrid').className = st.grid ? 'btn btn-primary' : 'btn';
    if (!proving){
      $('pyNote').textContent = cInt
        ? 'a = ' + a + '，b = ' + b + '：' + a * a + ' + ' + b * b + ' = ' + c2 + '，c 正好是整数 ' + c + '，这就是一组勾股数（' + a + '，' + b + '，' + c + '）。打开方格验证数一数，面积真的相等。'
        : 'a = ' + a + '，b = ' + b + '：' + a * a + ' + ' + b * b + ' = ' + c2 + '，c = √' + c2 + ' ≈ ' + c.toFixed(3) + '。想看到整数斜边？试试 a = 3、b = 4。';
    }
  }
  function refresh(){ updateReadouts(); draw(); }

  $('pyA').addEventListener('input', e => { st.a = +e.target.value; refresh(); });
  $('pyB').addEventListener('input', e => { st.b = +e.target.value; refresh(); });
  $('pyGrid').addEventListener('click', () => { st.grid = !st.grid; refresh(); clickSound(); });
  $('pyReset').addEventListener('click', () => {
    st.a = 3; st.b = 4; st.grid = true;
    $('pyA').value = 3; $('pyB').value = 4; refresh(); clickSound();
  });
  $('pyRandom').addEventListener('click', () => {
    st.a = randInt(1, 12); st.b = randInt(1, 12);
    $('pyA').value = st.a; $('pyB').value = st.b; refresh(); clickSound();
  });
  $('pyProof').addEventListener('click', () => {
    if (proving) return;
    proving = true; $('pyProof').disabled = true;
    $('pyNote').textContent = '弦图证明：4 个全等的直角三角形在大正方形里滑一滑，空出来的部分从 c² 变成 a² + b²。总面积没变，所以 c² = a² + b²。';
    animate(1400, p => { proof = { t: p }; draw(); }, () => {
      success();
      setTimeout(() => {
        animate(900, p => { proof = { t: 1 - p }; draw(); }, () => {
          proof = null; proving = false; $('pyProof').disabled = false;
          refresh();
        });
      }, 1700);
    });
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ---------- 初二 2：一次函数 y = kx + b ---------- */
(function initLinearFunc(){
  const canvas = $('lfCanvas');
  let view = fitCanvas(canvas);
  const N = 8; // 坐标范围 [-8, 8]
  const st = { k: 1, b: 2 };

  function geom(){
    const u = Math.floor(Math.min(view.W - 60, view.H - 60) / (2 * N));
    return { cx: view.W / 2, cy: view.H / 2, u };
  }
  const PX = (g, x) => g.cx + x * g.u;
  const PY = (g, y) => g.cy - y * g.u;

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const g = geom();
    const k = st.k, b = st.b;

    // —— 网格 / 坐标轴 / 刻度（与初一坐标系模块同一画风） ——
    ctx.lineWidth = 1;
    for (let i = -N; i <= N; i++){
      ctx.strokeStyle = i === 0 ? '#C7D3EC' : '#E9EFFA';
      line(ctx, PX(g, i), PY(g, -N), PX(g, i), PY(g, N));
      line(ctx, PX(g, -N), PY(g, i), PX(g, N), PY(g, i));
    }
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 2;
    line(ctx, PX(g, -N) - 12, g.cy, PX(g, N) + 18, g.cy);
    line(ctx, g.cx, PY(g, -N) - 12, g.cx, PY(g, N) + 18);
    ctx.fillStyle = '#8494B8';
    ctx.beginPath();
    ctx.moveTo(PX(g, N) + 24, g.cy); ctx.lineTo(PX(g, N) + 12, g.cy - 5); ctx.lineTo(PX(g, N) + 12, g.cy + 5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(g.cx, PY(g, N) - 18); ctx.lineTo(g.cx - 5, PY(g, N) - 6); ctx.lineTo(g.cx + 5, PY(g, N) - 6);
    ctx.closePath(); ctx.fill();
    ctx.font = '10px system-ui'; ctx.fillStyle = '#93A1C0';
    for (let i = -N; i <= N; i++){
      if (i === 0 || i % 2 !== 0) continue; // 只标偶数刻度，避免太密
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(String(i), PX(g, i), g.cy + 5);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i), g.cx - 6, PY(g, i));
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('O', g.cx - 5, g.cy + 5);
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#5B6B8C';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('x', PX(g, N) + 18, g.cy - 8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('y', g.cx + 9, PY(g, N) - 16);

    // —— 直线与网格边界的交点（取两个，画出线段） ——
    const cand = [];
    const addP = (x, y) => {
      if (x < -N - 1e-9 || x > N + 1e-9 || y < -N - 1e-9 || y > N + 1e-9) return;
      if (!cand.some(p => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6)) cand.push({ x, y });
    };
    addP(-N, k * -N + b); addP(N, k * N + b);
    if (k !== 0){ addP((-N - b) / k, -N); addP((N - b) / k, N); }
    if (cand.length >= 2){
      ctx.strokeStyle = '#5B8DEF'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      line(ctx, PX(g, cand[0].x), PY(g, cand[0].y), PX(g, cand[1].x), PY(g, cand[1].y));
    }

    // —— 斜率三角形：从 (0,b) 出发“走 1 升 k” ——
    if (k !== 0 && Math.abs(b) <= N - 1 && Math.abs(b + k) <= N - 1){
      const P0 = { x: PX(g, 0), y: PY(g, b) }, P1 = { x: PX(g, 1), y: PY(g, b) }, P2 = { x: PX(g, 1), y: PY(g, b + k) };
      ctx.setLineDash([5, 4]); ctx.strokeStyle = '#FF9F43'; ctx.lineWidth = 2;
      line(ctx, P0.x, P0.y, P1.x, P1.y);
      line(ctx, P1.x, P1.y, P2.x, P2.y);
      ctx.setLineDash([]);
      const dir = k > 0 ? 1 : -1;
      ctx.strokeStyle = '#E08A2D'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(P1.x - 8, P1.y); ctx.lineTo(P1.x - 8, P1.y - dir * 8); ctx.lineTo(P1.x, P1.y - dir * 8);
      ctx.stroke();
      ctx.fillStyle = '#B95F0E'; ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      // “走 1”放在三角形的异侧，避免和截距点挤在一起
      ctx.fillText('走 1', (P0.x + P1.x) / 2, k > 0 ? P1.y + 6 : P1.y - 20);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText((k > 0 ? '升 ' : '降 ') + Math.abs(k), P1.x + 6, (P1.y + P2.y) / 2);
    }

    // —— y 轴截距点（橙色，标签放 y 轴左侧，避开斜率三角形）与 x 轴交点（灰色） ——
    const iy = PY(g, b);
    ctx.beginPath(); ctx.arc(g.cx, iy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FF9F43'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#B95F0E'; ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('(0, ' + fmt(b) + ')', g.cx - 12, iy);
    if (k !== 0){
      const x0 = -b / k;
      if (Math.abs(x0) <= N){
        ctx.beginPath(); ctx.arc(PX(g, x0), g.cy, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#8A98B8'; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#5F6B85'; ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('(' + fmt2(x0) + ', 0)', PX(g, x0), g.cy + 14);
      }
    }
  }

  function refresh(){
    const k = st.k, b = st.b;
    $('lfKVal').textContent = fmt(k); $('lfBVal').textContent = fmt(b);
    setChip2($('lfKOut'), fmt(k));
    setChip2($('lfBOut'), fmt(b));
    if (k === 0) setChip2($('lfX0'), b === 0 ? '与 x 轴重合' : '不存在（与 x 轴平行）');
    else setChip2($('lfX0'), '(' + fmt2(-b / k) + ', 0)');
    const trend = $('lfTrend');
    if (k > 0){ trend.className = 'chip c-green'; setChip2(trend, 'k > 0，从左往右上升'); }
    else if (k < 0){ trend.className = 'chip c-red'; setChip2(trend, 'k < 0，从左往右下降'); }
    else { trend.className = 'chip c-gray'; setChip2(trend, 'k = 0，一条水平线'); }
    $('lfNote').textContent = b === 0
      ? 'b = 0，直线经过原点——这就是正比例函数 y = kx，y 与 x 的比值永远是 k。'
      : 'b = ' + fmt(b) + ' 是直线与 y 轴交点的高度；k = ' + fmt(k) + ' 表示 x 每走 1 格，y 就' + (k > 0 ? '升 ' : k < 0 ? '降 ' : '不变 ') + Math.abs(k) + ' 格。';
    draw();
  }

  $('lfK').addEventListener('input', e => { st.k = +e.target.value; refresh(); });
  $('lfB').addEventListener('input', e => { st.b = +e.target.value; refresh(); });
  $('lfReset').addEventListener('click', () => {
    st.k = 1; st.b = 2; $('lfK').value = 1; $('lfB').value = 2; refresh(); clickSound();
  });
  $('lfRandom').addEventListener('click', () => {
    st.k = randInt(-8, 8) / 2; st.b = randInt(-6, 6);
    $('lfK').value = st.k; $('lfB').value = st.b; refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ---------- 初二 3：二次根式 ---------- */
(function initSqrt(){
  const canvas = $('srCanvas');
  let view = fitCanvas(canvas);
  const st = { a: 4, b: 3 };

  // —— 3.1 验证器：边长 √a、√b 的正方形 → 面积 √a × √b 的长方形 ——
  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const a = st.a, b = st.b;
    const S = Math.min(50, (W / 3 - 52) / 3.5, (H - 92) / 3.5);
    if (S < 8) return;
    const baseY = H - 46;
    const sa = Math.sqrt(a) * S, sb = Math.sqrt(b) * S;
    // 运算符
    ctx.fillStyle = '#8A98B8'; ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('×', W * 0.285, baseY - 30);
    ctx.fillText('=', W * 0.565, baseY - 30);
    const items = [
      { cx: W * 0.17, w: sa, h: sa, fill: 'rgba(91,141,239,.32)', line: '#3F6FD1', inside: '面积 ' + a, cap: '边长 √' + a + ' ≈ ' + Math.sqrt(a).toFixed(2) },
      { cx: W * 0.40, w: sb, h: sb, fill: 'rgba(255,159,67,.35)', line: '#E08A2D', inside: '面积 ' + b, cap: '边长 √' + b + ' ≈ ' + Math.sqrt(b).toFixed(2) },
      { cx: W * 0.73, w: sa, h: sb, fill: 'rgba(46,204,113,.32)', line: '#1E9E54', inside: '= √' + (a * b), cap: '面积 = √' + a + ' × √' + b }
    ];
    items.forEach(it => {
      const x = it.cx - it.w / 2, y = baseY - it.h;
      ctx.fillStyle = it.fill;
      ctx.fillRect(x, y, it.w, it.h);
      ctx.lineWidth = 2; ctx.strokeStyle = it.line;
      ctx.strokeRect(x, y, it.w, it.h);
      if (it.w > 44 && it.h > 24){
        ctx.fillStyle = '#5B6B8C'; ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.inside, it.cx, y + it.h / 2);
      }
      ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(it.cap, it.cx, baseY + 10);
    });
  }

  function refresh1(){
    const l = Math.sqrt(st.a) * Math.sqrt(st.b), r = Math.sqrt(st.a * st.b);
    setChip2($('srL'), l.toFixed(3));
    setChip2($('srR'), r.toFixed(3));
    setChip2($('srOk'), '✓ 相等');
    $('srAVal').textContent = st.a; $('srBVal').textContent = st.b;
    draw();
  }

  $('srA').addEventListener('input', e => { st.a = +e.target.value; refresh1(); });
  $('srB').addEventListener('input', e => { st.b = +e.target.value; refresh1(); });
  $('srReset1').addEventListener('click', () => {
    st.a = 4; st.b = 3; $('srA').value = 4; $('srB').value = 3; refresh1(); clickSound();
  });
  $('srRandom1').addEventListener('click', () => {
    st.a = randInt(1, 12); st.b = randInt(1, 12);
    $('srA').value = st.a; $('srB').value = st.b; refresh1(); clickSound();
  });

  // —— 3.2 化简小课堂：分步演示 √n 的化简 ——
  const sq = { n: 12, step: 0 };
  // 把 n 拆成 s × m，其中 s 是最大的平方因数
  function squareFactor(n){
    for (let k = Math.floor(Math.sqrt(n)); k >= 2; k--){
      if (n % (k * k) === 0) return { s: k * k, k, m: n / (k * k) };
    }
    return { s: 1, k: 1, m: n };
  }
  const SQ_POOL = [8, 12, 18, 20, 24, 27, 28, 32, 40, 44, 45, 48, 50, 52, 54, 56, 60, 63, 68, 72, 75, 76, 80, 84, 88, 90, 92, 96, 98, 99];

  function refresh2(){
    const f = squareFactor(sq.n);
    const steps = [
      ['\\sqrt{' + sq.n + '}', '√' + sq.n],
      ['\\sqrt{' + sq.n + '}=\\sqrt{' + f.s + ' \\times ' + f.m + '}', '√' + sq.n + ' = √(' + f.s + ' × ' + f.m + ')'],
      ['=\\sqrt{' + f.s + '}\\times\\sqrt{' + f.m + '}', '= √' + f.s + ' × √' + f.m],
      ['=' + f.k + '\\sqrt{' + f.m + '}', '= ' + f.k + '√' + f.m]
    ];
    const [tex, plain] = steps[sq.step];
    renderTex($('srEq'), tex, plain);
    flash($('srEq').closest('.eq-display'));
    const texts = [
      '原式：√' + sq.n + '，里面藏着平方数吗？',
      '第 1 步 · 拆：' + sq.n + ' = ' + f.s + ' × ' + f.m + '，' + f.s + ' 是最大的平方因数。',
      '第 2 步 · 用乘法法则 √(ab) = √a × √b 拆开。',
      '第 3 步 · √' + f.s + ' = ' + f.k + '，化简完成。'
    ];
    $('srStepText').textContent = texts[sq.step];
    setChip2($('srVerify'), sq.step === 3
      ? f.k + '√' + f.m + ' ≈ ' + (f.k * Math.sqrt(f.m)).toFixed(3) + '，√' + sq.n + ' ≈ ' + Math.sqrt(sq.n).toFixed(3) + ' ✓'
      : '目标：把 √' + sq.n + ' 化到最简');
    Array.from($('srDots').children).forEach((d, i) => d.classList.toggle('on', i === sq.step));
    $('srPrev').disabled = sq.step === 0;
    $('srNext').disabled = sq.step === 3;
  }
  function goto2(n){
    if (n < 0 || n > 3 || n === sq.step) return;
    sq.step = n; refresh2();
    if (n === 3) success(); else clickSound();
  }
  $('srPrev').addEventListener('click', () => goto2(sq.step - 1));
  $('srNext').addEventListener('click', () => goto2(sq.step + 1));
  $('srReset').addEventListener('click', () => { sq.n = 12; sq.step = 0; refresh2(); clickSound(); });
  $('srRandom').addEventListener('click', () => {
    let n = sq.n;
    while (n === sq.n) n = SQ_POOL[randInt(0, SQ_POOL.length - 1)];
    sq.n = n; sq.step = 0; refresh2(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh1(); refresh2();
})();

/* ---------- 初二 4：因式分解（代数砖块 / 十字相乘） ---------- */
(function initFactorTiles(){
  const canvas = $('ftCanvas');
  let view = fitCanvas(canvas);
  const st = { p: 2, q: 3 };

  // —— (x + p) 的文本形式 ——
  function fmtBin(v){
    return v === 0 ? 'x' : v > 0 ? '(x + ' + v + ')' : '(x − ' + Math.abs(v) + ')';
  }
  // —— x² + sx + pr 的文本形式（自动省略为 0 的项） ——
  function fmtPoly(s, pr){
    let t = 'x²';
    if (s !== 0) t += (s > 0 ? ' + ' : ' − ') + (Math.abs(s) === 1 ? '' : Math.abs(s)) + 'x';
    if (pr !== 0) t += (pr > 0 ? ' + ' : ' − ') + Math.abs(pr);
    return t;
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const p = st.p, q = st.q;
    const X = Math.min(116, W * 0.30);          // x 的边长（px）
    const u = Math.min(24, (W - X - 150) / 5);  // p/q 每 1 的宽度
    if (u < 8) return;
    const pw = Math.abs(p) * u, qh = Math.abs(q) * u;
    const ox = Math.max(56, (W - X - (p > 0 ? pw : 0)) / 2);
    const oy = 30;

    // —— x² 蓝块 ——
    ctx.fillStyle = 'rgba(91,141,239,.88)';
    ctx.fillRect(ox, oy, X, X);
    ctx.lineWidth = 2; ctx.strokeStyle = '#3F6FD1';
    ctx.strokeRect(ox, oy, X, X);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('x²', ox + X / 2, oy + X / 2);
    // —— px 竖条（p 为负时红色，叠在 x² 上表示减去） ——
    if (p !== 0){
      const px = p > 0 ? ox + X : ox + X - pw;
      ctx.fillStyle = p > 0 ? 'rgba(255,159,67,.92)' : 'rgba(231,76,60,.6)';
      ctx.fillRect(px, oy, pw, X);
      ctx.lineWidth = 2; ctx.strokeStyle = p > 0 ? '#E08A2D' : '#C0392B';
      ctx.strokeRect(px, oy, pw, X);
      if (pw > 26){
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui';
        ctx.fillText(fmt(p) + 'x', px + pw / 2, oy + X / 2);
      }
    }
    // —— qx 横条 ——
    if (q !== 0){
      const qy = q > 0 ? oy + X : oy + X - qh;
      ctx.fillStyle = q > 0 ? 'rgba(255,179,102,.85)' : 'rgba(231,76,60,.6)';
      ctx.fillRect(ox, qy, X, qh);
      ctx.lineWidth = 2; ctx.strokeStyle = q > 0 ? '#E08A2D' : '#C0392B';
      ctx.strokeRect(ox, qy, X, qh);
      if (qh > 22){
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui';
        ctx.fillText(fmt(q) + 'x', ox + X / 2, qy + qh / 2);
      }
    }
    // —— pq 角块（负负得正：p、q 同号为绿，异号为红） ——
    if (p !== 0 && q !== 0){
      const hx = p > 0 ? ox + X : ox + X - pw;
      const hy = q > 0 ? oy + X : oy + X - qh;
      const pos = p * q > 0;
      ctx.fillStyle = pos ? 'rgba(46,204,113,.88)' : 'rgba(231,76,60,.6)';
      ctx.fillRect(hx, hy, pw, qh);
      ctx.lineWidth = 2; ctx.strokeStyle = pos ? '#1E9E54' : '#C0392B';
      ctx.strokeRect(hx, hy, pw, qh);
      if (pw > 24 && qh > 20){
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui';
        ctx.fillText(fmt(p * q), hx + pw / 2, hy + qh / 2);
      }
    }
    // 有负砖时：虚线框出真正剩下的长方形 (x+p) × (x+q)
    const effW = X - (p < 0 ? pw : 0), effH = X - (q < 0 ? qh : 0);
    if (p < 0 || q < 0){
      ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = '#5B6B8C';
      ctx.strokeRect(ox, oy, effW, effH);
      ctx.setLineDash([]);
    }

    // —— 尺寸标注：底边 (x+p)、左边 (x+q) ——
    const totH = X + (q > 0 ? qh : 0); // 视觉总高（负砖叠在内部，不外扩）
    ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('x', ox + X / 2, oy + totH + 8);
    if (p > 0) ctx.fillText(fmt(p), ox + X + pw / 2, oy + totH + 8);
    ctx.fillStyle = '#2B3A55'; ctx.font = 'bold 13px system-ui';
    ctx.fillText(fmtBin(p), ox + effW / 2, oy + totH + 26);
    const left = (cx2, cy2, txt, bold) => {
      ctx.save();
      ctx.translate(cx2, cy2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = bold ? '#2B3A55' : '#7A89A8';
      ctx.font = (bold ? 'bold 13px' : '12px') + ' system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, 0, 0);
      ctx.restore();
    };
    left(ox - 32, oy + X / 2, 'x', false);
    if (q > 0) left(ox - 32, oy + X + qh / 2, fmt(q), false);
    left(ox - 12, oy + effH / 2, fmtBin(q), true);
  }

  function refresh(){
    const p = st.p, q = st.q, s = p + q, pr = p * q;
    const fac = p === 0 && q === 0 ? 'x · x' : fmtBin(p) + fmtBin(q);
    $('ftPVal').textContent = fmt(p); $('ftQVal').textContent = fmt(q);
    setChip2($('ftPoly'), '展开：' + fac + ' = ' + fmtPoly(s, pr));
    setChip2($('ftPQ'), 'p + q = ' + fmt(s) + '，pq = ' + fmt(pr));
    setChip2($('ftFactor'), '分解：' + fmtPoly(s, pr) + ' = ' + fac);
    $('ftNote').textContent =
      '十字相乘：找两个数，相加得 ' + fmt(s) + '、相乘得 ' + fmt(pr) + '，就是 ' + fmt(p) + ' 和 ' + fmt(q) + '。' +
      (p < 0 || q < 0
        ? '红色砖块表示减去：虚线框里剩下的才是真正的大长方形' + (p < 0 && q < 0 ? '，角落两块负数重叠又变回正的。' : '。')
        : '四块面积加起来，正好是展开式的四项。');
    draw();
  }

  $('ftP').addEventListener('input', e => { st.p = +e.target.value; refresh(); });
  $('ftQ').addEventListener('input', e => { st.q = +e.target.value; refresh(); });
  $('ftReset').addEventListener('click', () => {
    st.p = 2; st.q = 3; $('ftP').value = 2; $('ftQ').value = 3; refresh(); clickSound();
  });
  $('ftRandom').addEventListener('click', () => {
    st.p = randInt(-5, 5); st.q = randInt(-5, 5);
    $('ftP').value = st.p; $('ftQ').value = st.q; refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ---------- 初二 5：平行四边形家族 ---------- */
(function initParallelogram(){
  const canvas = $('pgCanvas');
  let view = fitCanvas(canvas);
  const G = 34; // 1 格 = 34px（长度读数单位）
  const st = { D: { fx: 0.34, fy: 0.26 }, mode: 'para' };
  let drag = false, morphing = false;

  // 底边 AB 的宽度受画布高度约束，保证 morph 成正方形时顶点 D 不贴顶边
  const base = () => {
    const w = Math.min(view.W * 0.32, view.H * 0.84 - 34);
    return { A: { x: view.W * 0.14, y: view.H * 0.84 }, B: { x: view.W * 0.14 + w, y: view.H * 0.84 } };
  };
  const dPt = () => ({ x: st.D.fx * view.W, y: st.D.fy * view.H });
  function verts(){
    const { A, B } = base(), D = dPt();
    return { A, B, C: { x: B.x + D.x - A.x, y: B.y + D.y - A.y }, D };
  }
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  function angleA(){
    const { A, D } = verts();
    return Math.atan2(-(D.y - A.y), D.x - A.x) * 180 / Math.PI;
  }
  const dir = (P, Q) => Math.atan2(Q.y - P.y, Q.x - P.x);

  // —— 等长刻线：count 条平行短刻线画在线段中点 ——
  function tickMark(ctx, P, Q, count, color){
    const mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2;
    const dx = Q.x - P.x, dy = Q.y - P.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const ux = dx / len, uy = dy / len;
    ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = 0; i < count; i++){
      const off = (i - (count - 1) / 2) * 6;
      line(ctx, mx + ux * off - nx * 7, my + uy * off - ny * 7, mx + ux * off + nx * 7, my + uy * off + ny * 7);
    }
  }
  // —— 角弧（自动取劣弧，即内角） ——
  function angArc(ctx, P, Q1, Q2, color){
    const a1 = dir(P, Q1), a2 = dir(P, Q2);
    let d = (a2 - a1) % (Math.PI * 2);
    if (d < 0) d += Math.PI * 2;
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(P.x, P.y, 22, a1, a2, d > Math.PI); ctx.stroke();
  }
  // —— 直角符号 ——
  function rightMark(ctx, P, Q1, Q2){
    const a1 = dir(P, Q1), a2 = dir(P, Q2);
    const u1 = { x: Math.cos(a1), y: Math.sin(a1) }, u2 = { x: Math.cos(a2), y: Math.sin(a2) };
    ctx.strokeStyle = '#93A5C9'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(P.x + u1.x * 13, P.y + u1.y * 13);
    ctx.lineTo(P.x + u1.x * 13 + u2.x * 13, P.y + u1.y * 13 + u2.y * 13);
    ctx.lineTo(P.x + u2.x * 13, P.y + u2.y * 13);
    ctx.stroke();
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const { A, B, C, D } = verts();
    const O = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
    const deg = angleA();

    // —— 对角线（虚线） ——
    ctx.setLineDash([6, 5]); ctx.strokeStyle = '#93A5C9'; ctx.lineWidth = 1.8;
    line(ctx, A.x, A.y, C.x, C.y);
    line(ctx, B.x, B.y, D.x, D.y);
    ctx.setLineDash([]);

    // —— 四条边 ——
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    line(ctx, A.x, A.y, B.x, B.y);
    line(ctx, B.x, B.y, C.x, C.y);
    line(ctx, C.x, C.y, D.x, D.y);
    line(ctx, D.x, D.y, A.x, A.y);
    // 对边等长刻线：AB/CD 一条，AD/BC 两条；对角线互相平分刻线（蓝）
    tickMark(ctx, A, B, 1, '#FF9F43'); tickMark(ctx, C, D, 1, '#FF9F43');
    tickMark(ctx, A, D, 2, '#2ECC71'); tickMark(ctx, B, C, 2, '#2ECC71');
    tickMark(ctx, A, O, 1, '#5B8DEF'); tickMark(ctx, O, C, 1, '#5B8DEF');
    tickMark(ctx, B, O, 2, '#5B8DEF'); tickMark(ctx, O, D, 2, '#5B8DEF');

    // —— 对角弧：A、C 橙色；B、D 蓝色 ——
    if (Math.abs(deg - 90) < 1){
      rightMark(ctx, A, B, D); rightMark(ctx, B, A, C);
      rightMark(ctx, C, D, B); rightMark(ctx, D, C, A);
    }else{
      angArc(ctx, A, B, D, '#FF9F43'); angArc(ctx, C, D, B, '#FF9F43');
      angArc(ctx, B, A, C, '#93A5C9'); angArc(ctx, D, C, A, '#93A5C9');
    }
    // ∠A 读数
    const half = -deg / 2 * Math.PI / 180;
    ctx.fillStyle = '#B95F0E'; ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(deg) + '°', A.x + 38 * Math.cos(half), A.y + 38 * Math.sin(half));

    // —— 顶点（D 可拖动）与对角线交点 O ——
    const dot = (p, color, r) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    };
    dot(A, '#2B3A55', 5); dot(B, '#2B3A55', 5); dot(C, '#2B3A55', 5);
    dot(O, '#2ECC71', 8);
    dot(D, '#5B8DEF', 11);
    ctx.font = 'bold 13px system-ui';
    ctx.fillStyle = '#2B3A55'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('A', A.x - 4, A.y + 12);
    ctx.fillText('B', B.x + 4, B.y + 12);
    ctx.textBaseline = 'bottom';
    ctx.fillText('C', C.x + 4, C.y - 12);
    ctx.fillStyle = '#2F5BC4';
    ctx.fillText('D', D.x, D.y - 15);
    ctx.fillStyle = '#157F44';
    ctx.fillText('O', O.x + 13, O.y - 9);

    // —— 边长读数与操作提示 ——
    ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('AB = ' + (dist(A, B) / G).toFixed(1), (A.x + B.x) / 2, A.y + 26);
    const mAD = { x: (A.x + D.x) / 2, y: (A.y + D.y) / 2 };
    const adLen = dist(A, D) || 1;
    const nx = -(D.y - A.y) / adLen, ny = (D.x - A.x) / adLen;
    const sgn = ((B.x - mAD.x) * nx + (B.y - mAD.y) * ny) > 0 ? -1 : 1; // 标注放在远离 B 的一侧
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('AD = ' + (adLen / G).toFixed(1), mAD.x + nx * sgn * 30, mAD.y + ny * sgn * 30);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('← 拖动顶点 D', 14, H - 10);
  }

  function refresh(noFlash){
    const { A, B, C, D } = verts();
    const O = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
    const deg = Math.round(angleA());
    setChip2($('pgSide1'), 'AB = CD = ' + (dist(A, B) / G).toFixed(1) + ' 格', noFlash);
    setChip2($('pgSide2'), 'AD = BC = ' + (dist(A, D) / G).toFixed(1) + ' 格', noFlash);
    setChip2($('pgAng1'), '∠A = ∠C = ' + deg + '°', noFlash);
    setChip2($('pgAng2'), '∠B = ∠D = ' + (180 - deg) + '°', noFlash);
    setChip2($('pgDiag1'), 'AO = OC = ' + (dist(A, O) / G).toFixed(1) + ' 格', noFlash);
    setChip2($('pgDiag2'), 'BO = OD = ' + (dist(B, O) / G).toFixed(1) + ' 格', noFlash);
    draw();
  }

  // —— 家族成员与各自特性 ——
  const SHAPES = {
    para:   { btn: 'pgPara',   name: '平行四边形', props: '对边平行且相等，对角相等，对角线互相平分。拖动顶点 D，这些性质始终不变。' },
    rect:   { btn: 'pgRect',   name: '矩形',       props: '四个角都是 90°；对角线不但互相平分，而且一样长（AC = BD）。' },
    rhomb:  { btn: 'pgRhomb',  name: '菱形',       props: '四条边全都相等；对角线互相垂直平分。' },
    square: { btn: 'pgSquare', name: '正方形',     props: '四边相等、四角都是 90°，对角线相等且垂直平分。它既是矩形，也是菱形。' }
  };
  function setMode(m){
    st.mode = m;
    Object.keys(SHAPES).forEach(k => { $(SHAPES[k].btn).className = k === m ? 'btn btn-primary' : 'btn'; });
    $('pgProps').innerHTML = '<b>' + SHAPES[m].name + '的特性：</b>' + SHAPES[m].props;
  }
  // —— 顶点 D 的 morph 动画目标位置 ——
  function shapeTarget(m){
    const { A, B } = base();
    const w = dist(A, B);
    if (m === 'rect') return { x: A.x, y: A.y - 2.4 * G };
    if (m === 'square') return { x: A.x, y: A.y - w };
    if (m === 'rhomb'){
      // 保持当前倾斜角；若刚从矩形/正方形过来（接近 90°），给一个好看的默认角
      const cur = angleA();
      const deg = Math.abs(cur - 90) < 5 ? 65 : Math.max(45, Math.min(120, cur));
      const rad = deg * Math.PI / 180;
      return { x: A.x + w * Math.cos(rad), y: A.y - w * Math.sin(rad) };
    }
    return { x: view.W * 0.34, y: view.H * 0.26 }; // 普通平行四边形
  }
  function morphTo(target){
    if (morphing) return;
    morphing = true;
    const from = dPt();
    animate(600, p => {
      const t = easeInOut(p);
      st.D.fx = lerp(from.x, target.x, t) / view.W;
      st.D.fy = lerp(from.y, target.y, t) / view.H;
      refresh(true); // 动画过程中不闪 chips
    }, () => { morphing = false; refresh(); success(); });
  }
  Object.keys(SHAPES).forEach(k => {
    $(SHAPES[k].btn).addEventListener('click', () => { setMode(k); morphTo(shapeTarget(k)); clickSound(); });
  });

  // —— 拖动顶点 D（保持平行四边形约束：C = B + D − A 自动跟随） ——
  onPointer(canvas, {
    down(p){
      const D = dPt();
      if (Math.hypot(p.x - D.x, p.y - D.y) < 26) drag = true;
    },
    move(p){
      if (!drag || morphing) return;
      st.D.fx = Math.max(0.06, Math.min(0.62, p.x / view.W));
      st.D.fy = Math.max(0.06, Math.min(0.7, p.y / view.H));
      if (st.mode !== 'para') setMode('para'); // 手动拖动后回到自由状态
      refresh();
    },
    up(){ if (drag) clickSound(); drag = false; }
  });

  $('pgReset').addEventListener('click', () => {
    setMode('para'); morphTo({ x: view.W * 0.34, y: view.H * 0.26 }); clickSound();
  });
  $('pgRandom').addEventListener('click', () => {
    const { A } = base();
    const rad = randInt(40, 120) * Math.PI / 180;
    const len = randInt(2, 4) * G;
    setMode('para');
    morphTo({ x: A.x + len * Math.cos(rad), y: A.y - len * Math.sin(rad) });
    clickSound();
  });

  function refit(){ view = fitCanvas(canvas); refresh(true); }
  redrawAll.push(refit);
  setMode('para'); refresh();
})();

/* ---------- 初二 6：数据的分析 ---------- */
(function initDataAnalysis(){
  const canvas = $('daCanvas');
  let view = fitCanvas(canvas);
  const DEFAULT = [7, 8, 6, 8, 9, 8];
  const st = { data: DEFAULT.slice() };
  const VMAX = 10;
  let dragIdx = -1;

  function stats(){
    const d = st.data, n = d.length;
    const sorted = d.slice().sort((x, y) => x - y);
    const mean = d.reduce((s, v) => s + v, 0) / n;
    const lo = sorted[Math.floor((n - 1) / 2)], hi = sorted[Math.ceil((n - 1) / 2)];
    const cnt = {};
    d.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; });
    const maxCnt = Math.max.apply(null, Object.keys(cnt).map(k => cnt[k]));
    const modes = maxCnt > 1 ? Object.keys(cnt).filter(k => cnt[k] === maxCnt).map(Number) : [];
    const variance = d.reduce((s, v) => s + (v - mean) * (v - mean), 0) / n;
    return { n, sorted, mean, lo, hi, median: (lo + hi) / 2, modes, range: sorted[n - 1] - sorted[0], variance };
  }

  function geom(){
    const { W, H } = view;
    return { x0: 44, x1: W - 18, y0: H - 38, y1: 26 };
  }
  function barRect(g, i){
    const colW = (g.x1 - g.x0) / st.data.length;
    const bw = Math.min(56, colW - 12);
    return { x: g.x0 + colW * i + (colW - bw) / 2, w: bw, uh: (g.y0 - g.y1) / VMAX };
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const g = geom(), s = stats();
    const colW = (g.x1 - g.x0) / s.n;

    // —— 横向网格线与 y 轴刻度 ——
    ctx.font = '11px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = 0; v <= VMAX; v += 2){
      const y = g.y0 - (g.y0 - g.y1) / VMAX * v;
      ctx.strokeStyle = v === 0 ? '#C7D3EC' : '#EDF1FA';
      ctx.lineWidth = 1;
      line(ctx, g.x0, y, g.x1, y);
      ctx.fillStyle = '#93A1C0';
      ctx.fillText(String(v), g.x0 - 8, y);
    }

    // —— 平均数虚线（标签徽章在柱子画完后再画，避免被高柱子挡住） ——
    const my = g.y0 - (g.y0 - g.y1) / VMAX * s.mean;
    ctx.setLineDash([7, 5]); ctx.strokeStyle = '#3E63C8'; ctx.lineWidth = 2;
    line(ctx, g.x0, my, g.x1, my);
    ctx.setLineDash([]);

    // —— 柱子：中位数橙色、众数绿色、其余蓝色 ——
    st.data.forEach((v, i) => {
      const r = barRect(g, i);
      const h = (g.y0 - g.y1) / VMAX * v;
      const isMed = v === s.lo || v === s.hi;
      const isMode = s.modes.indexOf(v) >= 0;
      ctx.fillStyle = isMed ? 'rgba(255,159,67,.92)' : isMode ? 'rgba(46,204,113,.88)' : 'rgba(91,141,239,.88)';
      ctx.fillRect(r.x, g.y0 - h, r.w, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = isMed ? '#E08A2D' : isMode ? '#1E9E54' : '#3F6FD1';
      ctx.strokeRect(r.x, g.y0 - h, r.w, h);
      ctx.fillStyle = '#5B6B8C'; ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(String(v), r.x + r.w / 2, g.y0 - h - 5);
      if (colW > 34){ // 太窄时省略底部编号
        ctx.fillStyle = '#93A1C0'; ctx.font = '11px system-ui';
        ctx.textBaseline = 'top';
        ctx.fillText('第' + (i + 1) + '杯', r.x + r.w / 2, g.y0 + 8);
      }
    });

    // —— 平均数标签：白底徽章，最后画保证不被遮挡；虚线靠顶时改放虚线下方 ——
    const mLabel = '平均数 ≈ ' + fmt2(s.mean);
    ctx.font = 'bold 12px system-ui';
    const mw = ctx.measureText(mLabel).width;
    const mAbove = my - 22 > g.y1;
    const mly = mAbove ? my - 8 : my + 8;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.beginPath();
    ctx.roundRect(g.x0 + 4, mly - 10, mw + 14, 20, 10);
    ctx.fill();
    ctx.fillStyle = '#3E63C8';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(mLabel, g.x0 + 11, mly + 1);
  }

  function refresh(){
    const s = stats();
    setChip2($('daMean'), fmt2(s.mean));
    setChip2($('daMedian'), String(s.median));
    setChip2($('daMode'), s.modes.length ? s.modes.join('、') : '无');
    setChip2($('daRange'), String(s.range));
    setChip2($('daVar'), s.variance.toFixed(2));
    $('daNote').textContent = '最高 ' + s.sorted[s.n - 1] + ' 分，最低 ' + s.sorted[0] + ' 分，相差 ' + s.range + ' 分。' +
      (s.range >= 5 ? '分数这么散，平均数容易被带偏，看中位数更稳。' : '分数比较集中，平均数很有代表性。');
    $('daAdd').disabled = s.n >= 10;
    $('daDel').disabled = s.n <= 3;
    draw();
  }

  // —— 拖动柱子改数值（整数吸附） ——
  function colAt(p){
    const g = geom();
    if (p.x < g.x0 || p.x > g.x1 || p.y > g.y0 + 14) return -1;
    const i = Math.floor((p.x - g.x0) / ((g.x1 - g.x0) / st.data.length));
    return Math.max(0, Math.min(st.data.length - 1, i));
  }
  function setVal(i, p){
    const g = geom();
    const v = Math.max(0, Math.min(VMAX, Math.round((g.y0 - p.y) / (g.y0 - g.y1) * VMAX)));
    if (v !== st.data[i]){
      st.data[i] = v;
      refresh();
      beep(420 + v * 44, 0.03, 'sine', 0.05);
    }
  }
  onPointer(canvas, {
    down(p){ const i = colAt(p); if (i >= 0){ dragIdx = i; setVal(i, p); } },
    move(p){ if (dragIdx >= 0) setVal(dragIdx, p); },
    up(){ dragIdx = -1; }
  });

  $('daAdd').addEventListener('click', () => { if (st.data.length < 10){ st.data.push(randInt(3, 10)); refresh(); clickSound(); } });
  $('daDel').addEventListener('click', () => { if (st.data.length > 3){ st.data.pop(); refresh(); clickSound(); } });
  $('daReset').addEventListener('click', () => { st.data = DEFAULT.slice(); refresh(); clickSound(); });
  $('daRandom').addEventListener('click', () => {
    const n = randInt(5, 8);
    st.data = [];
    for (let i = 0; i < n; i++) st.data.push(randInt(2, 10));
    refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ============================================================
 * 初三模块
 * ============================================================ */

// —— 初三函数图像共用：平面直角坐标系（网格 + 轴 + 刻度），数学范围 [-N, N] ——
function axesGeom(view, N){
  const u = Math.floor(Math.min(view.W - 60, view.H - 60) / (2 * N));
  return { cx: view.W / 2, cy: view.H / 2, u, N };
}
const AX = (g, x) => g.cx + x * g.u;
const AY = (g, y) => g.cy - y * g.u;
function drawAxes3(ctx, g){
  const N = g.N;
  ctx.lineWidth = 1;
  for (let i = -N; i <= N; i++){
    ctx.strokeStyle = i === 0 ? '#C7D3EC' : '#E9EFFA';
    line(ctx, AX(g, i), AY(g, -N), AX(g, i), AY(g, N));
    line(ctx, AX(g, -N), AY(g, i), AX(g, N), AY(g, i));
  }
  ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 2;
  line(ctx, AX(g, -N) - 12, g.cy, AX(g, N) + 18, g.cy);
  line(ctx, g.cx, AY(g, -N) - 12, g.cx, AY(g, N) + 18);
  ctx.fillStyle = '#8494B8';
  ctx.beginPath();
  ctx.moveTo(AX(g, N) + 24, g.cy); ctx.lineTo(AX(g, N) + 12, g.cy - 5); ctx.lineTo(AX(g, N) + 12, g.cy + 5);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(g.cx, AY(g, N) - 18); ctx.lineTo(g.cx - 5, AY(g, N) - 6); ctx.lineTo(g.cx + 5, AY(g, N) - 6);
  ctx.closePath(); ctx.fill();
  ctx.font = '10px system-ui'; ctx.fillStyle = '#93A1C0';
  for (let i = -N; i <= N; i++){
    if (i === 0 || i % 2 !== 0) continue; // 只标偶数刻度，避免太密
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(String(i), AX(g, i), g.cy + 5);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i), g.cx - 6, AY(g, i));
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText('O', g.cx - 5, g.cy + 5);
  ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#5B6B8C';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('x', AX(g, N) + 18, g.cy - 8);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('y', g.cx + 9, AY(g, N) - 16);
}
// —— 按屏幕像素逐点采样画函数曲线；|y| 超出范围时抬笔，天然处理渐近线断点 ——
function plotFn3(ctx, g, W, f, color, width){
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath();
  let pen = false;
  for (let sx = 0; sx <= W; sx += 2){
    const y = f((sx - g.cx) / g.u);
    if (!isFinite(y) || Math.abs(y) > g.N + 2){ pen = false; continue; }
    if (pen) ctx.lineTo(sx, AY(g, y)); else ctx.moveTo(sx, AY(g, y));
    pen = true;
  }
  ctx.stroke();
}
// —— 白底徽章标签（避免压线/压图时看不清） ——
function badge3(ctx, cx, cy, text, color){
  ctx.font = 'bold 12px system-ui';
  const w = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(255,255,255,.94)';
  ctx.beginPath(); ctx.roundRect(cx - w / 2 - 9, cy - 11, w + 18, 22, 11); ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 1);
}

/* ---------- 初三 1：一元二次方程（抛物线与 x 轴交点 = 方程的根） ---------- */
(function initQuadraticEquation(){
  const canvas = $('qeCanvas');
  let view = fitCanvas(canvas);
  const N = 8;
  const st = { a: 1, b: -3, c: 2 };
  const f = x => st.a * x * x + st.b * x + st.c;

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const g = axesGeom(view, N);
    drawAxes3(ctx, g);
    plotFn3(ctx, g, W, f, '#5B8DEF', 3.5);

    const D = st.b * st.b - 4 * st.a * st.c;
    if (D >= 0){
      const sq = Math.sqrt(D);
      const roots = D === 0 ? [-st.b / (2 * st.a)]
        : [(-st.b + sq) / (2 * st.a), (-st.b - sq) / (2 * st.a)];
      roots.forEach((r, i) => {
        if (Math.abs(r) > N) return;
        const px = AX(g, r);
        ctx.beginPath(); ctx.arc(px, g.cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FF9F43'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        // 两个根靠得近时标签左右错开
        const off = roots.length === 2 && Math.abs(roots[0] - roots[1]) < 1.2 ? (i === 0 ? 26 : -26) : 0;
        const name = roots.length === 1 ? 'x₁ = x₂ = ' : (i === 0 ? 'x₁ = ' : 'x₂ = ');
        ctx.fillStyle = '#B95F0E'; ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(name + fmt2(r), px + off, g.cy + 13);
      });
    }else{
      badge3(ctx, W / 2, H - 22, 'Δ < 0：抛物线与 x 轴没有交点', '#C0392B');
    }
  }

  function refresh(){
    const { a, b, c } = st;
    const D = b * b - 4 * a * c;
    $('qeAVal').textContent = fmt(a);
    $('qeBVal').textContent = fmt(b);
    $('qeCVal').textContent = fmt(c);
    setChip2($('qeDelta'), fmt2(D));
    const stEl = $('qeState'), x1 = $('qeX1'), x2 = $('qeX2');
    if (D > 0){
      const sq = Math.sqrt(D);
      const r1 = (-b + sq) / (2 * a), r2 = (-b - sq) / (2 * a);
      stEl.className = 'chip c-green';
      setChip2(stEl, 'Δ > 0：两个不相等的实数根');
      x1.className = 'chip c-orange'; x2.className = 'chip c-orange';
      setChip2(x1, 'x₁ = (−b+√Δ)/2a ≈ ' + fmt2(r1));
      setChip2(x2, 'x₂ = (−b−√Δ)/2a ≈ ' + fmt2(r2));
      $('qeNote').textContent = '代入求根公式：x = (−b ± √Δ) / 2a = (' + fmt(-b) + ' ± √' + fmt2(D) + ') / (2×' + fmt(a) + ') ≈ (' + fmt(-b) + ' ± ' + sq.toFixed(2) + ') / ' + fmt2(2 * a) + '，得 x₁ ≈ ' + fmt2(r1) + '、x₂ ≈ ' + fmt2(r2) + '，正好是图上两个交点的横坐标。';
    }else if (D === 0){
      const r = -b / (2 * a);
      stEl.className = 'chip c-orange';
      setChip2(stEl, 'Δ = 0：两个相等的实数根');
      x1.className = 'chip c-orange'; x2.className = 'chip c-gray';
      setChip2(x1, 'x₁ = x₂ = −b/2a = ' + fmt2(r));
      setChip2(x2, '抛物线刚好贴着 x 轴');
      $('qeNote').textContent = 'Δ = 0 时 √Δ = 0，± 不起作用：x = −b / 2a = ' + fmt(-b) + ' / (2×' + fmt(a) + ') = ' + fmt2(r) + '。抛物线的顶点正好落在 x 轴上，只碰得到一个点。';
    }else{
      stEl.className = 'chip c-red';
      setChip2(stEl, 'Δ < 0：没有实数根');
      x1.className = 'chip c-gray'; x2.className = 'chip c-gray';
      setChip2(x1, 'x₁：无实数根');
      setChip2(x2, 'x₂：无实数根');
      $('qeNote').textContent = 'Δ = ' + fmt2(D) + ' < 0，√Δ 在实数范围内不存在，求根公式“卡壳”了——反映在图上，就是抛物线整个在 x 轴的' +
        (a > 0 ? '上方（开口向上，最低点都高过地面）' : '下方（开口向下，最高点也够不到地面）') + '，一个交点都没有。';
    }
    draw();
  }

  // —— a ≠ 0：拖到 0 时按来向跳到 ±0.5 ——
  $('qeA').addEventListener('input', e => {
    let v = +e.target.value;
    if (v === 0){ v = st.a > 0 ? -0.5 : 0.5; e.target.value = v; }
    st.a = v; refresh();
  });
  $('qeB').addEventListener('input', e => { st.b = +e.target.value; refresh(); });
  $('qeC').addEventListener('input', e => { st.c = +e.target.value; refresh(); });
  $('qeReset').addEventListener('click', () => {
    st.a = 1; st.b = -3; st.c = 2;
    $('qeA').value = 1; $('qeB').value = -3; $('qeC').value = 2;
    refresh(); clickSound();
  });
  $('qeRandom').addEventListener('click', () => {
    let a = randInt(-6, 6); if (a === 0) a = 1;
    st.a = a / 2; st.b = randInt(-6, 6); st.c = randInt(-6, 6);
    $('qeA').value = st.a; $('qeB').value = st.b; $('qeC').value = st.c;
    refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ---------- 初三 2：二次函数 y = a(x−h)² + k ---------- */
(function initQuadraticFunc(){
  const canvas = $('qfCanvas');
  let view = fitCanvas(canvas);
  const N = 8;
  const st = { a: 1, h: 2, k: -3 };
  const f = x => st.a * (x - st.h) * (x - st.h) + st.k;

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const g = axesGeom(view, N);
    drawAxes3(ctx, g);

    // —— 参考抛物线 y = x²（灰色半透明虚线） ——
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([6, 5]);
    plotFn3(ctx, g, W, x => x * x, '#93A5C9', 2);
    ctx.restore();
    ctx.fillStyle = '#93A5C9'; ctx.font = '12px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('参照：y = x²', 14, 10);

    // —— 对称轴 x = h（绿色虚线，标签放底部避免和 y 轴标签挤一起） ——
    if (Math.abs(st.h) <= N){
      const hx = AX(g, st.h);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = '#1E9E54'; ctx.lineWidth = 2;
      line(ctx, hx, 10, hx, H - 10);
      ctx.setLineDash([]);
      ctx.fillStyle = '#157F44'; ctx.font = 'bold 12px system-ui';
      ctx.textBaseline = 'bottom';
      const axisLabel = '对称轴 x = ' + fmt(st.h);
      if (hx < W - 130){ ctx.textAlign = 'left'; ctx.fillText(axisLabel, hx + 7, H - 8); }
      else { ctx.textAlign = 'right'; ctx.fillText(axisLabel, hx - 7, H - 8); }
    }

    // —— 抛物线本体 ——
    plotFn3(ctx, g, W, f, '#5B8DEF', 3.5);

    // —— 顶点（橙色，a>0 标签放顶点下方，a<0 放上方） ——
    if (Math.abs(st.h) <= N && Math.abs(st.k) <= N){
      const vx = AX(g, st.h), vy = AY(g, st.k);
      ctx.beginPath(); ctx.arc(vx, vy, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#FF9F43'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#B95F0E'; ctx.font = 'bold 12px system-ui';
      ctx.textBaseline = 'middle';
      const vLabel = '顶点 (' + fmt(st.h) + ', ' + fmt(st.k) + ')';
      const ty = vy + (st.a > 0 ? 22 : -22);
      if (vx < W - 130){ ctx.textAlign = 'left'; ctx.fillText(vLabel, vx + 13, ty); }
      else { ctx.textAlign = 'right'; ctx.fillText(vLabel, vx - 13, ty); }
    }
  }

  function refresh(){
    const { a, h, k } = st;
    $('qfAVal').textContent = fmt(a);
    $('qfHVal').textContent = fmt(h);
    $('qfKVal').textContent = fmt(k);
    setChip2($('qfVertex'), '(' + fmt(h) + ', ' + fmt(k) + ')');
    const openEl = $('qfOpen');
    openEl.className = a > 0 ? 'chip c-green' : 'chip c-red';
    setChip2(openEl, a > 0 ? '开口向上（a = ' + fmt(a) + ' > 0）' : '开口向下（a = ' + fmt(a) + ' < 0）');
    setChip2($('qfExt'), (a > 0 ? '最小值 = ' : '最大值 = ') + fmt(k) + '（当 x = ' + fmt(h) + '）');
    const cmp = Math.abs(a) > 1 ? '比 y = x² 更窄' : Math.abs(a) < 1 ? '比 y = x² 更宽' : '和 y = x² 一样宽，只是搬了个家';
    $('qfNote').textContent = '顶点式一眼读出：顶点 (h, k) = (' + fmt(h) + ', ' + fmt(k) + ')，对称轴 x = ' + fmt(h) + '。' +
      'h 管左右平移、k 管上下平移；|a| = ' + fmt(Math.abs(a)) + '，开口' + cmp + '。' +
      (a > 0 ? 'a > 0 开口向上，顶点是最低点，函数有最小值 k。' : 'a < 0 开口向下，顶点是最高点，函数有最大值 k。');
    draw();
  }

  // —— a ≠ 0：拖到 0 时按来向跳到 ±0.25 ——
  $('qfA').addEventListener('input', e => {
    let v = +e.target.value;
    if (v === 0){ v = st.a > 0 ? -0.25 : 0.25; e.target.value = v; }
    st.a = v; refresh();
  });
  $('qfH').addEventListener('input', e => { st.h = +e.target.value; refresh(); });
  $('qfK').addEventListener('input', e => { st.k = +e.target.value; refresh(); });
  $('qfReset').addEventListener('click', () => {
    st.a = 1; st.h = 2; st.k = -3;
    $('qfA').value = 1; $('qfH').value = 2; $('qfK').value = -3;
    refresh(); clickSound();
  });
  $('qfRandom').addEventListener('click', () => {
    let a = randInt(-8, 8); if (a === 0) a = 4;
    st.a = a / 4; st.h = randInt(-5, 5); st.k = randInt(-5, 5);
    $('qfA').value = st.a; $('qfH').value = st.h; $('qfK').value = st.k;
    refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ---------- 初三 3：反比例函数 y = k/x ---------- */
(function initInverseFunc(){
  const canvas = $('rfCanvas');
  let view = fitCanvas(canvas);
  const N = 8;
  const st = { k: 4, px: 2 }; // P 在双曲线上，px 为其横坐标（符号决定在哪一支）
  let drag = false;

  const py = () => st.k / st.px;
  // —— 横坐标离 y 轴太近会让 y 爆掉：限制 |px| ≥ |k|/N（且至少 0.5），吸附到 0.5 ——
  function clampPx(){
    const minX = Math.max(0.5, Math.abs(st.k) / N);
    let x = Math.max(-N, Math.min(N, st.px));
    if (Math.abs(x) < minX) x = (x < 0 ? -1 : 1) * minX;
    x = Math.round(x * 2) / 2;
    if (Math.abs(x) < minX) x = (x < 0 ? -1 : 1) * Math.ceil(minX * 2) / 2;
    st.px = x;
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const g = axesGeom(view, N);
    drawAxes3(ctx, g);

    // —— 双曲线两支（plotFn3 在渐近线处自动抬笔） ——
    plotFn3(ctx, g, W, x => st.k / x, '#5B8DEF', 3.5);

    // —— P 向两轴作垂线围成的矩形（面积 = |k|） ——
    const P = { x: AX(g, st.px), y: AY(g, py()) };
    const rx = Math.min(g.cx, P.x), ry = Math.min(g.cy, P.y);
    const rw = Math.abs(P.x - g.cx), rh = Math.abs(P.y - g.cy);
    ctx.fillStyle = 'rgba(255,159,67,.30)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#E08A2D'; ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.setLineDash([]);
    if (rw > 84 && rh > 30){
      ctx.fillStyle = '#B95F0E'; ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('面积 = |k| = ' + Math.abs(st.k), rx + rw / 2, ry + rh / 2);
    }

    // —— 点 P 与坐标标签（沿远离原点方向放） ——
    ctx.beginPath(); ctx.arc(P.x, P.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#FF9F43'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    const dl = Math.hypot(P.x - g.cx, P.y - g.cy) || 1;
    const lx = P.x + (P.x - g.cx) / dl * 26, ly = P.y + (P.y - g.cy) / dl * 26;
    ctx.fillStyle = '#B95F0E'; ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('P(' + fmt2(st.px) + ', ' + fmt2(py()) + ')', lx, ly);
    ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('← 拖动点 P', 14, H - 10);
  }

  function refresh(){
    clampPx();
    const y = py();
    $('rfKVal').textContent = fmt(st.k);
    setChip2($('rfKOut'), fmt(st.k));
    setChip2($('rfP'), 'P(' + fmt2(st.px) + ', ' + fmt2(y) + ')');
    setChip2($('rfXY'), 'x·y = ' + fmt2(st.px) + ' × ' + fmt2(y) + ' = ' + fmt2(st.px * y) + ' = k ✓');
    setChip2($('rfArea'), '矩形面积 = |k| = ' + Math.abs(st.k));
    $('rfNote').textContent = st.k > 0
      ? 'k = ' + st.k + ' > 0：双曲线落在第一、三象限，每一支上 y 都随 x 增大而减小。P 拖到哪儿，x·y 都等于 k，橙色矩形的面积恒为 |k|。'
      : 'k = ' + fmt(st.k) + ' < 0：双曲线落在第二、四象限，每一支上 y 都随 x 增大而增大。x·y 是负数 ' + fmt(st.k) + '，矩形面积恒为 |k| = ' + Math.abs(st.k) + '。';
    draw();
  }

  $('rfK').addEventListener('input', e => {
    let v = +e.target.value;
    if (v === 0){ v = st.k > 0 ? -1 : 1; e.target.value = v; }
    st.k = v; refresh();
  });
  onPointer(canvas, {
    down(p){
      const g = axesGeom(view, N);
      const P = { x: AX(g, st.px), y: AY(g, py()) };
      if (Math.hypot(p.x - P.x, p.y - P.y) < 28) drag = true;
    },
    move(p){
      if (!drag) return;
      const g = axesGeom(view, N);
      st.px = (p.x - g.cx) / g.u;
      clampPx();
      refresh();
    },
    up(){ if (drag) clickSound(); drag = false; }
  });
  $('rfReset').addEventListener('click', () => {
    st.k = 4; st.px = 2; $('rfK').value = 4; refresh(); clickSound();
  });
  $('rfRandom').addEventListener('click', () => {
    let k = randInt(-12, 12); if (k === 0) k = 6;
    st.k = k;
    st.px = (Math.random() < 0.5 ? -1 : 1) * randInt(1, N * 2) / 2;
    $('rfK').value = st.k; refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ---------- 初三 4：锐角三角函数 ---------- */
(function initTrig(){
  const canvas = $('tgCanvas');
  let view = fitCanvas(canvas);
  const HYP = 5; // 斜边固定为 5
  const st = { deg: 30 };
  let drag = false, lastEx = 0;

  // —— 特殊角精确值（KaTeX + 纯文本回退） ——
  const EXACT = {
    30: ['\\sin 30^\\circ=\\dfrac{1}{2}\\qquad \\cos 30^\\circ=\\dfrac{\\sqrt{3}}{2}\\qquad \\tan 30^\\circ=\\dfrac{\\sqrt{3}}{3}',
         'sin 30° = 1/2　　cos 30° = √3/2　　tan 30° = √3/3'],
    45: ['\\sin 45^\\circ=\\dfrac{\\sqrt{2}}{2}\\qquad \\cos 45^\\circ=\\dfrac{\\sqrt{2}}{2}\\qquad \\tan 45^\\circ=1',
         'sin 45° = √2/2　　cos 45° = √2/2　　tan 45° = 1'],
    60: ['\\sin 60^\\circ=\\dfrac{\\sqrt{3}}{2}\\qquad \\cos 60^\\circ=\\dfrac{1}{2}\\qquad \\tan 60^\\circ=\\sqrt{3}',
         'sin 60° = √3/2　　cos 60° = 1/2　　tan 60° = √3']
  };

  // —— 直角顶点 C 在左下，θ 在右下的 A，B 在 C 正上方 ——
  function verts(){
    const rad = st.deg * Math.PI / 180;
    const adj = HYP * Math.cos(rad), opp = HYP * Math.sin(rad);
    const x0 = 116, y0 = view.H - 56; // x0 留出左侧"对边"标签的位置
    const u = Math.min((view.W - x0 - 110) / adj, (y0 - 70) / opp);
    return {
      C: { x: x0, y: y0 }, A: { x: x0 + adj * u, y: y0 }, B: { x: x0, y: y0 - opp * u },
      adj, opp, u
    };
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const { A, B, C, adj, opp } = verts();

    // —— 三角形本体 ——
    ctx.beginPath();
    ctx.moveTo(C.x, C.y); ctx.lineTo(A.x, A.y); ctx.lineTo(B.x, B.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(91,141,239,.10)'; ctx.fill();
    // 对边橙、邻边绿、斜边蓝
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#FF9F43'; ctx.lineWidth = 4; line(ctx, C.x, C.y, B.x, B.y);
    ctx.strokeStyle = '#2ECC71'; line(ctx, C.x, C.y, A.x, A.y);
    ctx.strokeStyle = '#5B8DEF'; line(ctx, A.x, A.y, B.x, B.y);

    // —— C 处直角符号、A 处角弧与 θ 标注 ——
    ctx.strokeStyle = '#93A5C9'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(C.x + 13, C.y); ctx.lineTo(C.x + 13, C.y - 13); ctx.lineTo(C.x, C.y - 13);
    ctx.stroke();
    const rad = st.deg * Math.PI / 180;
    const arcR = Math.min(36, Math.max(18, (A.x - C.x) * 0.45));
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(A.x, A.y, arcR, rad - Math.PI, -Math.PI, true); ctx.stroke();
    ctx.fillStyle = '#5B6B8C'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const bisA = rad / 2 - Math.PI; // 角平分线方向（屏幕坐标）
    ctx.fillText('θ=' + st.deg + '°', A.x + (arcR + 26) * Math.cos(bisA), A.y + (arcR + 26) * Math.sin(bisA));

    // —— 边名与边长标注 ——
    ctx.font = 'bold 13px system-ui';
    ctx.fillStyle = '#B95F0E'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('对边 = ' + opp.toFixed(2), C.x - 10, (C.y + B.y) / 2);
    ctx.fillStyle = '#157F44'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('邻边 = ' + adj.toFixed(2), (C.x + A.x) / 2, C.y + 10);
    ctx.save(); // 斜边标签沿斜边方向旋转，放在外侧（远离 C 的一侧）；角度归一化保证文字不颠倒
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    let ang = Math.atan2(B.y - A.y, B.x - A.x);
    if (ang > Math.PI / 2) ang -= Math.PI;
    if (ang < -Math.PI / 2) ang += Math.PI;
    ctx.translate(mx, my); ctx.rotate(ang);
    ctx.fillStyle = '#2F5BC4'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('斜边 = ' + HYP, 0, -9);
    ctx.restore();

    // —— 顶点：B 可拖动 ——
    const dot = (p, color, r) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    };
    dot(C, '#2B3A55', 5); dot(A, '#2B3A55', 5); dot(B, '#5B8DEF', 11);
    ctx.fillStyle = '#2B3A55'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('A', A.x + 2, A.y + 10);
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('C', C.x - 4, C.y + 10);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('B', B.x, B.y - 15);
    ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('← 拖动顶点 B', 14, H - 10);
  }

  function refresh(){
    const rad = st.deg * Math.PI / 180;
    const s = Math.sin(rad), c = Math.cos(rad), t = s / c;
    $('tgAngVal').textContent = st.deg + '°';
    setChip2($('tgDeg'), st.deg + '°');
    setChip2($('tgSin'), 'sin θ = 对边/斜边 ≈ ' + s.toFixed(3));
    setChip2($('tgCos'), 'cos θ = 邻边/斜边 ≈ ' + c.toFixed(3));
    setChip2($('tgTan'), 'tan θ = 对边/邻边 ≈ ' + t.toFixed(3));
    [30, 45, 60].forEach(d => { $('tgB' + d).className = st.deg === d ? 'btn btn-primary' : 'btn'; });
    const exEl = $('tgExact');
    if (EXACT[st.deg]){
      renderTex(exEl, EXACT[st.deg][0], EXACT[st.deg][1]);
      if (lastEx !== st.deg){ flash(exEl.closest('.eq-display')); lastEx = st.deg; }
    }else{
      exEl.textContent = '当前 θ = ' + st.deg + '°，不是特殊角；点上面的 30° / 45° / 60° 按钮，这里会显示带根号的精确值。';
      lastEx = 0;
    }
    draw();
  }

  function setDeg(d){
    st.deg = Math.max(5, Math.min(85, Math.round(d)));
    $('tgAng').value = st.deg;
    refresh();
  }
  $('tgAng').addEventListener('input', e => { st.deg = +e.target.value; refresh(); });
  [30, 45, 60].forEach(d => $('tgB' + d).addEventListener('click', () => { setDeg(d); clickSound(); }));
  $('tgReset').addEventListener('click', () => { setDeg(30); clickSound(); });
  $('tgRandom').addEventListener('click', () => { setDeg(randInt(5, 85)); clickSound(); });

  // —— 拖动 B：由指针相对 A 的方向直接算出 θ ——
  onPointer(canvas, {
    down(p){
      const { B } = verts();
      if (Math.hypot(p.x - B.x, p.y - B.y) < 30) drag = true;
    },
    move(p){
      if (!drag) return;
      const { A } = verts();
      const d = Math.atan2(A.y - p.y, A.x - p.x) * 180 / Math.PI;
      setDeg(d);
    },
    up(){ if (drag) clickSound(); drag = false; }
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();

/* ---------- 初三 5：圆（圆周角定理 + 弧长与扇形面积） ---------- */
(function initCircle(){
  const canvas = $('ciCanvas');
  let view = fitCanvas(canvas);
  const A_ANG = 150, B_ANG = 30; // 弦端点的屏幕角度（度）：0=右，90=下，劣弧在下方
  const st = { p: 270 };         // P 的屏幕角度，限制在优弧上
  let drag = false, touched = false;

  const canvas2 = $('ciSecCanvas');
  let view2 = fitCanvas(canvas2);
  const st2 = { r: 3, n: 120 };

  function geomC(){
    const R = Math.min(view.W, view.H) / 2 - 46;
    return { cx: view.W / 2, cy: view.H / 2 + 6, R };
  }
  const ptAt = (g, deg) => ({
    x: g.cx + g.R * Math.cos(deg * Math.PI / 180),
    y: g.cy + g.R * Math.sin(deg * Math.PI / 180)
  });
  function angAt(P, Q1, Q2){
    const a1 = Math.atan2(Q1.y - P.y, Q1.x - P.x), a2 = Math.atan2(Q2.y - P.y, Q2.x - P.x);
    let d = Math.abs(a2 - a1) * 180 / Math.PI;
    return d > 180 ? 360 - d : d;
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const g = geomC();
    const O = { x: g.cx, y: g.cy };
    const A = ptAt(g, A_ANG), B = ptAt(g, B_ANG), P = ptAt(g, st.p);

    // —— 圆与同弧 AB（劣弧，加粗蓝） ——
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#3F6FD1'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, B_ANG * Math.PI / 180, A_ANG * Math.PI / 180); ctx.stroke();

    // —— 半径 OA、OB（蓝）与弦 PA、PB（橙） ——
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#5B8DEF';
    line(ctx, O.x, O.y, A.x, A.y); line(ctx, O.x, O.y, B.x, B.y);
    ctx.strokeStyle = '#FF9F43';
    line(ctx, P.x, P.y, A.x, A.y); line(ctx, P.x, P.y, B.x, B.y);

    // —— 圆心角 ∠AOB 的角弧与度数（劣弧一侧） ——
    const central = Math.round(angAt(O, A, B));
    ctx.strokeStyle = '#3F6FD1'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(O.x, O.y, 32, B_ANG * Math.PI / 180, A_ANG * Math.PI / 180); ctx.stroke();
    ctx.fillStyle = '#2F5BC4'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(central + '°', O.x, O.y + 50); // 角平分线朝正下方

    // —— 圆周角 ∠APB 的角弧与度数（拖动时变绿加粗，提示“不变”） ——
    const insc = Math.round(angAt(P, A, B));
    const a1 = Math.atan2(A.y - P.y, A.x - P.x), a2 = Math.atan2(B.y - P.y, B.x - P.x);
    let dd = (a2 - a1) % (Math.PI * 2);
    if (dd < 0) dd += Math.PI * 2;
    ctx.strokeStyle = drag ? '#1E9E54' : '#E08A2D'; ctx.lineWidth = drag ? 4 : 2.5;
    ctx.beginPath(); ctx.arc(P.x, P.y, 24, a1, a2, dd > Math.PI); ctx.stroke();
    const u1 = { x: Math.cos(a1), y: Math.sin(a1) }, u2 = { x: Math.cos(a2), y: Math.sin(a2) };
    let bx = u1.x + u2.x, by = u1.y + u2.y;
    const bl = Math.hypot(bx, by) || 1;
    bx /= bl; by /= bl;
    ctx.fillStyle = drag ? '#157F44' : '#B95F0E'; ctx.font = 'bold 13px system-ui';
    ctx.fillText(insc + '°', P.x + bx * 42, P.y + by * 42);

    // —— 点与标签 ——
    const dot = (p, color, r) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    };
    dot(O, '#2ECC71', 6); dot(A, '#2B3A55', 6); dot(B, '#2B3A55', 6);
    dot(P, '#FF9F43', 11);
    ctx.fillStyle = '#2B3A55'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('O', O.x - 14, O.y + 2);
    ctx.fillText('A', A.x - 16, A.y + 8);
    ctx.fillText('B', B.x + 16, B.y + 8);
    ctx.fillStyle = '#B95F0E';
    ctx.fillText('P', P.x + bx * 66, P.y + by * 66);
    ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('← 拖动点 P 沿优弧滑动', 14, H - 10);
  }

  function refresh(){
    const g = geomC();
    const O = { x: g.cx, y: g.cy };
    const central = Math.round(angAt(O, ptAt(g, A_ANG), ptAt(g, B_ANG)));
    const insc = Math.round(angAt(ptAt(g, st.p), ptAt(g, A_ANG), ptAt(g, B_ANG)));
    setChip2($('ciCentral'), '圆心角 ∠AOB = ' + central + '°');
    setChip2($('ciInsc'), '圆周角 ∠APB = ' + insc + '°');
    setChip2($('ciOk'), '✓ ∠APB = ∠AOB ÷ 2（' + central + '° ÷ 2 = ' + insc + '°）');
    setChip2($('ciFixed'), touched ? 'P 在动，∠APB 还是 ' + insc + '°！' : '同弧 AB 所对的圆周角都相等');
    draw();
  }

  onPointer(canvas, {
    down(p){
      const g = geomC();
      const P = ptAt(g, st.p);
      if (Math.hypot(p.x - P.x, p.y - P.y) < 28){ drag = true; flash($('ciFixed')); }
    },
    move(p){
      if (!drag) return;
      const g = geomC();
      let a = Math.atan2(p.y - g.cy, p.x - g.cx) * 180 / Math.PI;
      if (a < 0) a += 360;         // 归一到 [0, 360)
      if (a <= B_ANG) a += 360;    // 优弧参数区间：(A_ANG, B_ANG + 360)
      st.p = Math.max(A_ANG + 5, Math.min(B_ANG + 360 - 5, a));
      touched = true;
      refresh();
    },
    up(){ if (drag) clickSound(); drag = false; refresh(); } // 松手后重绘，角弧恢复橙色
  });
  $('ciReset').addEventListener('click', () => { st.p = 270; refresh(); clickSound(); });
  $('ciRandom').addEventListener('click', () => { st.p = randInt(A_ANG + 10, B_ANG + 350); refresh(); clickSound(); });

  // —— 5.2 弧长与扇形面积 ——
  function draw2(){
    const { ctx, W, H } = view2;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const R = st2.r / 5 * (Math.min(W, H) / 2 - 42);
    const cx = W / 2, cy = H / 2 + 10;
    const a0 = -Math.PI / 2; // 从正上方起
    const a1 = a0 + st2.n * Math.PI / 180;

    // —— 完整圆（虚线底，衬托“扇形是圆的一部分”） ——
    ctx.setLineDash([5, 5]); ctx.strokeStyle = '#D5DDF0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // —— 扇形 ——
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
    ctx.fillStyle = 'rgba(91,141,239,.26)'; ctx.fill();
    ctx.strokeStyle = '#3F6FD1'; ctx.lineWidth = 2.5; ctx.stroke();
    // 弧（橙色加粗）
    ctx.strokeStyle = '#FF9F43'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();

    // —— 圆心角弧、n° 标注、r 标注、弧 l 标注 ——
    ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 22, a0, a1); ctx.stroke();
    const mid = (a0 + a1) / 2;
    ctx.fillStyle = '#5B6B8C'; ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('n=' + st2.n + '°', cx + 40 * Math.cos(mid), cy + 40 * Math.sin(mid));
    ctx.fillStyle = '#2F5BC4';
    ctx.fillText('r = ' + st2.r, cx + R / 2 * Math.cos(a0) + 20 * Math.cos(a0 + Math.PI / 2), cy + R / 2 * Math.sin(a0) + 20 * Math.sin(a0 + Math.PI / 2));
    ctx.fillStyle = '#B95F0E'; ctx.font = 'bold 13px system-ui';
    ctx.fillText('弧 l', cx + (R + 18) * Math.cos(mid), cy + (R + 18) * Math.sin(mid));
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#2B3A55'; ctx.fill();
  }

  // —— 系数 × π 的简洁写法：num/den · π → '2π'、'5π/4' ——
  function fracPi(num, den){
    const g = gcd(num, den);
    const a = num / g, b = den / g;
    if (b === 1) return a === 1 ? 'π' : a + 'π';
    return (a === 1 ? '' : a) + 'π/' + b;
  }

  function refresh2(){
    const r = st2.r, n = st2.n;
    const l = n * Math.PI * r / 180, S = n * Math.PI * r * r / 360;
    $('ciRVal').textContent = String(r);
    $('ciNVal').textContent = n + '°';
    setChip2($('ciArcL'), '弧长 l = nπr/180 ≈ ' + l.toFixed(2));
    setChip2($('ciArcS'), '面积 S = nπr²/360 ≈ ' + S.toFixed(2));
    const g = gcd(n, 360);
    setChip2($('ciFrac'), '扇形占整圆的 ' + (n / g) + '/' + (360 / g));
    // l = (n·2r)/360 · π；S = (n·(2r)²)/1440 · π（用整数约分，r 可以是 .5）
    const lExact = fracPi(n * 2 * r, 360), sExact = fracPi(n * 4 * r * r, 1440);
    $('ciSecNote').textContent = 'l = nπr/180 = ' + n + '×π×' + r + ' ÷ 180 = ' + lExact + ' ≈ ' + l.toFixed(2) +
      '；S = nπr²/360 = ' + n + '×π×' + fmt2(r * r) + ' ÷ 360 = ' + sExact + ' ≈ ' + S.toFixed(2) + '。';
    draw2();
  }

  $('ciR').addEventListener('input', e => { st2.r = +e.target.value; refresh2(); });
  $('ciN').addEventListener('input', e => { st2.n = +e.target.value; refresh2(); });
  $('ciSecReset').addEventListener('click', () => {
    st2.r = 3; st2.n = 120; $('ciR').value = 3; $('ciN').value = 120; refresh2(); clickSound();
  });
  $('ciSecRandom').addEventListener('click', () => {
    st2.r = randInt(2, 10) / 2; st2.n = randInt(6, 66) * 5;
    $('ciR').value = st2.r; $('ciN').value = st2.n; refresh2(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); view2 = fitCanvas(canvas2); draw(); draw2(); }
  redrawAll.push(refit);
  refresh();
  refresh2();
})();

/* ---------- 初三 6：概率初步（掷骰子模拟器） ---------- */
(function initProbability(){
  const canvas = $('pbCanvas');
  let view = fitCanvas(canvas);
  const st = { counts: [0, 0, 0, 0, 0, 0], total: 0, last: 0 };
  let rolling = false;

  function geom(){ return { x0: 46, x1: view.W - 20, y0: view.H - 40, y1: 50 }; }
  const yMax = () => Math.max(0.4, Math.ceil(Math.max.apply(null, st.counts) / (st.total || 1) * 1.25 * 10) / 10);

  // —— 画一颗骰子（圆角方块 + 点数圆点） ——
  function drawDie(ctx, x, y, s, v){
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#8494B8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, s, s, 9); ctx.fill(); ctx.stroke();
    const PIPS = {
      1: [[.5, .5]],
      2: [[.3, .3], [.7, .7]],
      3: [[.27, .27], [.5, .5], [.73, .73]],
      4: [[.3, .3], [.7, .3], [.3, .7], [.7, .7]],
      5: [[.28, .28], [.72, .28], [.5, .5], [.28, .72], [.72, .72]],
      6: [[.3, .26], [.7, .26], [.3, .5], [.7, .5], [.3, .74], [.7, .74]]
    };
    ctx.fillStyle = '#2B3A55';
    (PIPS[v] || []).forEach(q => {
      ctx.beginPath(); ctx.arc(x + q[0] * s, y + q[1] * s, s * 0.075, 0, Math.PI * 2); ctx.fill();
    });
  }

  function draw(){
    const { ctx, W, H } = view;
    if (W < 40) return;
    ctx.clearRect(0, 0, W, H);
    const g = geom(), ym = yMax();

    // —— 横向网格线与 y 轴刻度（频率百分比） ——
    ctx.font = '11px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = 0; v <= ym + 1e-9; v += 0.1){
      const y = g.y0 - (g.y0 - g.y1) * v / ym;
      ctx.strokeStyle = v === 0 ? '#C7D3EC' : '#EDF1FA'; ctx.lineWidth = 1;
      line(ctx, g.x0, y, g.x1, y);
      ctx.fillStyle = '#93A1C0';
      ctx.fillText(Math.round(v * 100) + '%', g.x0 - 8, y);
    }

    // —— 1/6 参考虚线（绿色） ——
    const refY = g.y0 - (g.y0 - g.y1) * (1 / 6) / ym;
    ctx.setLineDash([7, 5]); ctx.strokeStyle = '#1E9E54'; ctx.lineWidth = 2;
    line(ctx, g.x0, refY, g.x1, refY);
    ctx.setLineDash([]);

    // —— 柱子：各面频率；柱顶标次数 ——
    const colW = (g.x1 - g.x0) / 6;
    for (let i = 0; i < 6; i++){
      const fq = st.total ? st.counts[i] / st.total : 0;
      const h = (g.y0 - g.y1) * fq / ym;
      const bw = Math.min(64, colW - 20);
      const x = g.x0 + colW * i + (colW - bw) / 2;
      if (h > 0){
        ctx.fillStyle = 'rgba(91,141,239,.88)';
        ctx.fillRect(x, g.y0 - h, bw, h);
        ctx.lineWidth = 2; ctx.strokeStyle = '#3F6FD1';
        ctx.strokeRect(x, g.y0 - h, bw, h);
      }
      ctx.fillStyle = '#5B6B8C'; ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(st.counts[i] + ' 次', x + bw / 2, g.y0 - h - 5);
      ctx.fillStyle = '#93A1C0'; ctx.font = '12px system-ui';
      ctx.textBaseline = 'top';
      ctx.fillText((i + 1) + ' 点', x + bw / 2, g.y0 + 8);
    }

    // —— 参考线徽章（最后画，避免被高柱挡住） ——
    ctx.font = 'bold 12px system-ui';
    const refLabel = '1/6 ≈ 16.7%';
    const rw = ctx.measureText(refLabel).width;
    ctx.fillStyle = 'rgba(255,255,255,.94)';
    ctx.beginPath(); ctx.roundRect(g.x1 - rw - 18, refY - 25, rw + 14, 20, 10); ctx.fill();
    ctx.fillStyle = '#157F44'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(refLabel, g.x1 - rw - 11, refY - 14);

    // —— 上一次掷出的骰子 / 初始提示 ——
    if (st.last){
      drawDie(ctx, W - 66, 12, 40, st.last);
      ctx.fillStyle = '#7A89A8'; ctx.font = '12px system-ui';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('上一次', W - 74, 32);
    }
    if (st.total === 0){
      ctx.fillStyle = '#93A1C0'; ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('点上方按钮开始掷骰子', (g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2);
    }
  }

  function refresh(noFlash){
    setChip2($('pbTotal'), String(st.total), noFlash);
    for (let i = 0; i < 6; i++){
      const fq = st.total ? st.counts[i] / st.total * 100 : 0;
      setChip2($('pbF' + (i + 1)), (i + 1) + '点 ' + fq.toFixed(1) + '%', noFlash);
    }
    $('pbNote').textContent = st.total === 0
      ? '点“掷 10 次”或“掷 100 次”开始：看看每个面的频率会不会靠近 1/6 ≈ 16.7%。'
      : '已掷 ' + st.total + ' 次：对照绿色虚线看看——次数越多，各面频率越贴近 1/6，这就是“频率稳定于概率”。';
    draw();
  }

  function setBtns(dis){
    ['pbRoll10', 'pbRoll100', 'pbRoll1000', 'pbReset'].forEach(id => { $(id).disabled = dis; });
  }
  function roll(n){
    if (rolling) return;
    rolling = true; setBtns(true); clickSound();
    const dur = Math.min(2200, 350 + n * 1.6);
    let done = 0;
    animate(dur, t => {
      const target = Math.floor(t * n);
      while (done < target){
        const v = randInt(1, 6);
        st.counts[v - 1]++; st.total++; st.last = v; done++;
        if (done % 25 === 0) beep(480 + v * 40, 0.02, 'sine', 0.03);
      }
      refresh(true); // 动画过程中不闪 chips
    }, () => { rolling = false; setBtns(false); refresh(); success(); });
  }
  $('pbRoll10').addEventListener('click', () => roll(10));
  $('pbRoll100').addEventListener('click', () => roll(100));
  $('pbRoll1000').addEventListener('click', () => roll(1000));
  $('pbReset').addEventListener('click', () => {
    if (rolling) return;
    st.counts = [0, 0, 0, 0, 0, 0]; st.total = 0; st.last = 0;
    refresh(); clickSound();
  });

  function refit(){ view = fitCanvas(canvas); draw(); }
  redrawAll.push(refit);
  refresh();
})();
