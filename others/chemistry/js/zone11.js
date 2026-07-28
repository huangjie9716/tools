/* ============================================================
   ZONE 11 · 酸和碱（第十单元）
   Panel A 指示剂与 pH：变色互动试管 + pH 彩虹条
   Panel B 常见的酸：浓盐酸/浓硫酸 + 浓硫酸稀释小剧场 + 酸的通性
   Panel C 常见的碱：NaOH / Ca(OH)₂ + 碱的通性
   Panel D 中和滴定：烧杯变色 + pH 曲线 + 微观粒子
   ============================================================ */
(function () {
  'use strict';

  const A = window.App;
  const CYAN = '#22d3ee', MAGENTA = '#f472b6', AMBER = '#fbbf24',
    GREEN = '#34d399', RED = '#f87171', TEXT = '#e2e8f0', DIM = '#94a3b8', FAINT = '#64748b';

  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp01 = v => Math.max(0, Math.min(1, v));

  /* 创建自适应画布（处理 devicePixelRatio + ResizeObserver） */
  function makeCanvas(stage, height) {
    const cv = document.createElement('canvas');
    cv.style.height = height + 'px';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const size = { W: 600, H: height };
    function resize() {
      const w = stage.clientWidth || 600;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size.W = w;
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
    resize();
    return { cv, ctx, size };
  }

  /* ============================================================
     Panel A1 · 指示剂变色互动试管
     ============================================================ */
  function initIndicator(panel) {
    const SOLS = [
      { id: 'hcl', n: '稀盐酸', t: 'acid' },
      { id: 'hac', n: '醋酸', t: 'acid' },
      { id: 'nacl', n: 'NaCl 溶液', t: 'neutral' },
      { id: 'naoh', n: 'NaOH 溶液', t: 'base' },
      { id: 'lime', n: '石灰水', t: 'base' },
      { id: 'soda', n: '汽水', t: 'acid' }
    ];
    const INDS = [
      { id: 'litmus', n: '紫色石蕊溶液' },
      { id: 'phenol', n: '无色酚酞溶液' }
    ];

    let sol = 'hcl', ind = 'litmus';

    panel.appendChild(A.el('<div class="panel-title">指示剂变色互动试管 · 选溶液 × 选指示剂</div>'));
    panel.appendChild(A.el('<div class="z10-group-label">① 选择待测溶液</div>'));
    const solRow = A.el('<div class="btn-row"></div>');
    const solBtns = SOLS.map(s => {
      const b = A.el('<button class="btn" data-id="' + s.id + '">' + s.n + '</button>');
      solRow.appendChild(b);
      return b;
    });
    panel.appendChild(solRow);

    panel.appendChild(A.el('<div class="z10-group-label">② 选择指示剂</div>'));
    const indRow = A.el('<div class="btn-row"></div>');
    const indBtns = INDS.map(s => {
      const b = A.el('<button class="btn" data-id="' + s.id + '">' + s.n + '</button>');
      indRow.appendChild(b);
      return b;
    });
    panel.appendChild(indRow);

    const area = A.el(
      '<div class="z10-tube-area">' +
      '<div class="z10-tube"><div class="z10-liquid"></div></div>' +
      '<div class="z10-tube-info">' +
      '<div class="z10-tube-mix"></div>' +
      '<div class="z10-tube-result"></div>' +
      '</div></div>');
    panel.appendChild(area);
    const liquid = area.querySelector('.z10-liquid');
    const mixEl = area.querySelector('.z10-tube-mix');
    const resEl = area.querySelector('.z10-tube-result');

    function S() { return SOLS.find(s => s.id === sol); }
    function I() { return INDS.find(s => s.id === ind); }

    function refresh() {
      solBtns.forEach(b => b.classList.toggle('on', b.dataset.id === sol));
      indBtns.forEach(b => b.classList.toggle('on', b.dataset.id === ind));
      const t = S().t;
      let color, glow, text;
      if (ind === 'litmus') {
        if (t === 'acid') {
          color = '#dc2626'; glow = 'rgba(220,38,38,0.5)';
          text = '溶液变<b>红</b>——紫色石蕊溶液遇酸变红。';
        } else if (t === 'base') {
          color = '#3b82f6'; glow = 'rgba(59,130,246,0.5)';
          text = '溶液变<b>蓝</b>——紫色石蕊溶液遇碱变蓝。';
        } else {
          color = '#8b5cf6'; glow = 'rgba(139,92,246,0.45)';
          text = '溶液仍为<b>紫色</b>——中性溶液不能使石蕊变色。';
        }
      } else {
        if (t === 'base') {
          color = '#e11d48'; glow = 'rgba(225,29,72,0.5)';
          text = '溶液变<b>红</b>——无色酚酞溶液遇碱变红。';
        } else {
          color = 'rgba(226,232,240,0.10)'; glow = 'none';
          text = t === 'acid'
            ? '溶液仍为<b>无色</b>——无色酚酞溶液遇酸不变色。'
            : '溶液仍为<b>无色</b>——中性溶液也不能使酚酞变色。';
        }
      }
      liquid.style.backgroundColor = color;
      liquid.style.boxShadow = glow === 'none' ? 'none' : '0 0 26px ' + glow + ' inset';
      mixEl.innerHTML = S().n + ' ＋ ' + I().n;
      resEl.innerHTML = text +
        '<br><span style="color:var(--text-faint);font-size:12.5px">' +
        (S().t === 'acid' ? '该溶液呈酸性（含 H⁺）。' : S().t === 'base' ? '该溶液呈碱性（含 OH⁻）。' : '该溶液呈中性。') +
        (sol === 'soda' ? ' 汽水中溶有 CO₂，生成的碳酸使汽水呈酸性。' : '') +
        '</span>';
    }

    solBtns.forEach(b => b.addEventListener('click', () => { sol = b.dataset.id; refresh(); }));
    indBtns.forEach(b => b.addEventListener('click', () => { ind = b.dataset.id; refresh(); }));
    refresh();
  }

  /* ============================================================
     Panel A2 · pH 彩虹条
     ============================================================ */
  function initPH(panel) {
    const REFS = [
      { ph: 1.5, n: '胃酸 ≈1.5' },
      { ph: 2.5, n: '柠檬汁 ≈2.5' },
      { ph: 3, n: '醋 ≈3' },
      { ph: 5.6, n: '正常雨水 ≈5.6' },
      { ph: 7, n: '纯水 =7' },
      { ph: 7.4, n: '血液 7.35~7.45' },
      { ph: 10, n: '肥皂水 ≈10' },
      { ph: 13, n: '炉具清洁剂 ≈13' }
    ];

    panel.appendChild(A.el('<div class="z10-sub">pH 彩虹条 · 溶液的酸碱度</div>'));
    const bar = A.el('<div class="z10-ph-bar"><div class="z10-ph-marker"></div></div>');
    panel.appendChild(bar);
    const marker = bar.querySelector('.z10-ph-marker');
    panel.appendChild(A.el(
      '<div class="z10-ph-ticks"><span>0</span><span>2</span><span>4</span><span>6</span>' +
      '<span style="color:var(--green)">7</span><span>8</span><span>10</span><span>12</span><span>14</span></div>'));

    const row = A.el(
      '<div class="slider-row"><label>拖动测 pH</label>' +
      '<input type="range" min="0" max="14" step="0.5" value="7">' +
      '<span class="slider-val">pH = 7</span></div>');
    panel.appendChild(row);
    const slider = row.querySelector('input');
    const valEl = row.querySelector('.slider-val');

    const verdictEl = A.el('<div class="z10-verdict neutral"></div>');
    panel.appendChild(verdictEl);
    const matchEl = A.el('<div class="z10-ph-match"></div>');
    panel.appendChild(matchEl);

    function refresh() {
      const ph = Number(slider.value);
      valEl.textContent = 'pH = ' + A.num(ph, 1);
      marker.style.left = (ph / 14 * 100) + '%';
      if (ph < 7) {
        verdictEl.className = 'z10-verdict acid';
        verdictEl.textContent = '酸性 · pH 越小，酸性越强';
      } else if (ph > 7) {
        verdictEl.className = 'z10-verdict base';
        verdictEl.textContent = '碱性 · pH 越大，碱性越强';
      } else {
        verdictEl.className = 'z10-verdict neutral';
        verdictEl.textContent = '中性 · pH = 7';
      }
      const hits = REFS.filter(r => Math.abs(r.ph - ph) <= 0.6);
      const show = hits.length ? hits : [REFS.reduce((a, b) => Math.abs(b.ph - ph) < Math.abs(a.ph - ph) ? b : a)];
      let html = '常见对应物：' + show.map(r => '<b>' + r.n + '</b>').join('、');
      if (ph < 5.6) html += '<br><span class="warn">⚠ 正常雨水 pH≈5.6（溶有 CO₂）；酸雨指 pH&lt;5.6 的雨水——这个 pH 已达酸雨标准。</span>';
      else if (ph === 5.6) html += '<br><span style="color:var(--text-faint)">正常雨水因溶有 CO₂ 而略显酸性；酸雨指 pH&lt;5.6 的雨水。</span>';
      matchEl.innerHTML = html;
    }

    slider.addEventListener('input', refresh);
    refresh();
  }

  /* ============================================================
     Panel B · 浓硫酸稀释小剧场（canvas 动画）
     正确：浓硫酸沿器壁慢慢注入水中，玻璃棒不断搅拌（平稳）
     错误：把水倒进浓硫酸 → 水浮在上面、沸腾、酸液飞溅（警示）
     ============================================================ */
  function initDilution(panel, container) {
    panel.appendChild(A.el('<div class="panel-title">浓硫酸的稀释 · 小剧场</div>'));

    const tabRow = A.el('<div class="btn-row" style="margin-bottom:12px"></div>');
    const goodBtn = A.el('<button class="btn on" data-m="good">✔ 正确：酸入水</button>');
    const badBtn = A.el('<button class="btn" data-m="bad">✘ 错误：水入酸</button>');
    tabRow.appendChild(goodBtn);
    tabRow.appendChild(badBtn);
    panel.appendChild(tabRow);

    const stage = A.el('<div class="stage"></div>');
    const { ctx, size } = makeCanvas(stage, 400);
    panel.appendChild(stage);

    const ctrl = A.el('<div class="btn-row" style="margin-top:12px;align-items:center"></div>');
    const startBtn = A.el('<button class="btn btn-primary">▶ 开始演示</button>');
    const resetBtn = A.el('<button class="btn">↺ 复位</button>');
    ctrl.appendChild(startBtn);
    ctrl.appendChild(resetBtn);
    panel.appendChild(ctrl);

    const statusEl = A.el('<div class="z10-status"></div>');
    panel.appendChild(statusEl);

    let mode = 'good', p = 0, playing = false;
    const bubbles = [], splashes = [];
    let lastPhase = '', last = performance.now();

    function setStatus() {
      const ph = p === 0 ? 'pre' : (p >= 1 ? 'done' : 'mid');
      const key = mode + '|' + ph;
      if (key === lastPhase) return;
      lastPhase = key;
      if (mode === 'good') {
        statusEl.innerHTML = ph === 'pre'
          ? '<b>正确操作：</b>把<b>浓硫酸沿器壁慢慢注入水中</b>，并用玻璃棒不断搅拌，使热量及时扩散。点击「开始演示」。'
          : ph === 'mid'
            ? '浓硫酸沿器壁缓缓流入水中，玻璃棒不断搅拌……热量被及时扩散，液面平稳。'
            : '<span class="ok">平稳混合，没有飞溅 ✓</span> 口诀：<b>酸入水，沿器壁，慢慢倒，不断搅</b>。';
      } else {
        statusEl.innerHTML = ph === 'pre'
          ? '<b>错误操作：</b>如果把<b>水倒进浓硫酸</b>里，会发生什么？水的密度小，浮在浓硫酸上面……点击「开始演示」看后果。'
          : ph === 'mid'
            ? '<span class="bad">⚠ 危险！</span>水浮在浓硫酸上面，溶解时<b>放出大量的热</b>，使水立即沸腾——'
            : '<span class="bad">⚠ 酸液向四周飞溅，非常危险！</span>所以稀释浓硫酸时<b>绝对不能把水倒进浓硫酸里</b>。';
      }
    }

    function setMode(m) {
      if (playing) return;
      mode = m; p = 0; bubbles.length = 0; splashes.length = 0;
      goodBtn.classList.toggle('on', m === 'good');
      badBtn.classList.toggle('on', m === 'bad');
      refreshChrome();
    }
    goodBtn.addEventListener('click', () => setMode('good'));
    badBtn.addEventListener('click', () => setMode('bad'));
    startBtn.addEventListener('click', () => {
      if (playing || p >= 1) return;
      playing = true; refreshChrome();
    });
    resetBtn.addEventListener('click', () => {
      if (playing) return;
      p = 0; bubbles.length = 0; splashes.length = 0; refreshChrome();
    });

    function refreshChrome() {
      startBtn.disabled = playing || p >= 1;
      startBtn.textContent = playing ? '演示进行中…' : (p >= 1 ? '已完成 ✓' : '▶ 开始演示');
      setStatus();
    }

    /* ---------- 绘制 ---------- */
    function drawBottle(x, y, ang, label, tint) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      /* 试剂瓶身 */
      ctx.fillStyle = 'rgba(226,232,240,0.12)';
      ctx.strokeStyle = 'rgba(226,232,240,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -46); ctx.lineTo(-16, -18);
      ctx.lineTo(-30, 0); ctx.lineTo(-30, 40);
      ctx.lineTo(30, 40); ctx.lineTo(30, 0);
      ctx.lineTo(16, -18); ctx.lineTo(16, -46);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      /* 瓶内液体 */
      ctx.fillStyle = tint;
      ctx.fillRect(-27, 6, 54, 31);
      /* 瓶口 */
      ctx.strokeStyle = 'rgba(226,232,240,0.8)';
      ctx.strokeRect(-16, -52, 32, 8);
      /* 标签 */
      ctx.rotate(-ang);
      ctx.fillStyle = TEXT;
      ctx.font = '700 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, 26);
      ctx.restore();
      /* 瓶口位置（旋转后的点 (0,-52)） */
      return { x: x + Math.sin(ang) * 52, y: y - Math.cos(ang) * 52 };
    }

    function draw(time) {
      const W = size.W, H = size.H;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2 + 30, bw = 88, bh = 150;
      const bx = cx - bw, btop = H - 60 - bh, bbot = btop + bh;
      const surfY = btop + 44;

      /* 烧杯液体 */
      ctx.save();
      if (mode === 'good') {
        /* 水 + 不断注入的酸，整体均匀 */
        const lvl = surfY + (1 - p) * 10;
        ctx.fillStyle = 'rgba(96,165,250,0.28)';
        ctx.fillRect(bx + 4, lvl, bw * 2 - 8, bbot - 6 - lvl);
        /* 搅拌漩涡：几道旋转弧 */
        if (playing || p >= 1) {
          ctx.strokeStyle = 'rgba(191,219,254,0.55)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            const a0 = time * 4 + i * Math.PI * 2 / 3;
            ctx.beginPath();
            ctx.arc(cx, lvl + (bbot - lvl) * 0.5, 22 + i * 14, a0, a0 + 1.6);
            ctx.stroke();
          }
        }
      } else {
        /* 下层浓硫酸（密度大），上层水（浮着） */
        const acidTop = surfY + 30;
        ctx.fillStyle = 'rgba(226,232,240,0.30)';
        ctx.fillRect(bx + 4, acidTop, bw * 2 - 8, bbot - 6 - acidTop);
        const wLvl = acidTop - 6 - p * 26;
        ctx.fillStyle = 'rgba(96,165,250,0.38)';
        if (p > 0) ctx.fillRect(bx + 4, Math.max(surfY - 6, wLvl), bw * 2 - 8, acidTop - Math.max(surfY - 6, wLvl));
        /* 沸腾：界面处冒泡 */
        if (p > 0.25 && p < 1 && Math.random() < 0.5) {
          bubbles.push({
            x: bx + 14 + Math.random() * (bw * 2 - 28),
            y: acidTop - 2, r: 2 + Math.random() * 3.5,
            vy: 0.8 + Math.random() * 1.4, life: 0, max: 50 + Math.random() * 30
          });
        }
        /* 酸液飞溅 */
        if (p > 0.35 && playing && Math.random() < 0.6) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
          const sp = 2.5 + Math.random() * 3.5;
          splashes.push({
            x: cx + (Math.random() - 0.5) * bw, y: wLvl,
            vx: Math.cos(a) * sp * 1.4, vy: Math.sin(a) * sp,
            r: 1.8 + Math.random() * 2.6, life: 0, max: 90
          });
        }
      }
      ctx.restore();

      /* 烧杯壁 */
      ctx.save();
      ctx.strokeStyle = 'rgba(226,232,240,0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, btop - 6);
      ctx.lineTo(bx, bbot);
      ctx.lineTo(bx + bw * 2, bbot);
      ctx.lineTo(bx + bw * 2, btop - 6);
      ctx.stroke();
      ctx.fillStyle = FAINT;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mode === 'good' ? '烧杯中先装好水' : '烧杯中装的是浓硫酸', cx, bbot + 22);
      ctx.restore();

      /* 玻璃棒搅拌（正确模式） */
      if (mode === 'good') {
        ctx.save();
        const sway = (playing || p >= 1) ? Math.sin(time * 4) * 0.12 : 0;
        ctx.translate(cx + 34, btop - 34);
        ctx.rotate(0.35 + sway);
        ctx.strokeStyle = 'rgba(226,232,240,0.85)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 128); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = FAINT;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('玻璃棒·不断搅拌', cx + 74, btop - 40);
      }

      /* 倾倒的试剂瓶 + 液流 */
      if (playing || (p > 0 && p < 1)) {
        const mouth = drawBottle(bx - 56, btop - 44, 0.9,
          mode === 'good' ? '浓硫酸' : '水',
          mode === 'good' ? 'rgba(226,232,240,0.4)' : 'rgba(96,165,250,0.5)');
        ctx.save();
        ctx.strokeStyle = mode === 'good' ? 'rgba(226,232,240,0.85)' : 'rgba(147,197,253,0.9)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -time * 60;
        ctx.beginPath();
        ctx.moveTo(mouth.x, mouth.y);
        /* 正确模式液流落向器壁 */
        ctx.quadraticCurveTo(mouth.x + 18, mouth.y + 60,
          mode === 'good' ? bx + 10 : cx - 10, mode === 'good' ? btop + 30 : surfY + 26);
        ctx.stroke();
        ctx.restore();
      } else if (p === 0) {
        drawBottle(bx - 56, btop - 44, 0, mode === 'good' ? '浓硫酸' : '水',
          mode === 'good' ? 'rgba(226,232,240,0.4)' : 'rgba(96,165,250,0.5)');
      }

      /* 气泡 */
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.life++; b.y -= b.vy;
        if (b.life > b.max || b.y < surfY - 8) { bubbles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = 0.75 * (1 - b.life / b.max);
        ctx.strokeStyle = '#bfdbfe';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      /* 飞溅液滴 */
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.life++; s.x += s.vx; s.y += s.vy; s.vy += 0.12;
        if (s.life > s.max || s.y > H + 10) { splashes.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = 0.9 * (1 - s.life / s.max);
        ctx.fillStyle = RED;
        ctx.shadowColor = RED;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      /* 警示横幅 */
      if (mode === 'bad' && p > 0.35) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (p - 0.35) / 0.2);
        ctx.fillStyle = 'rgba(248,113,113,0.10)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = RED;
        ctx.font = '700 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ 水浮在浓硫酸上面，溶解放出大量的热使水立即沸腾，酸液向四周飞溅！', W / 2, 28);
        ctx.restore();
      }

      /* 顶部标题 */
      ctx.save();
      ctx.font = '700 13px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = mode === 'good' ? GREEN : (p > 0.35 ? RED : AMBER);
      ctx.fillText(mode === 'good'
        ? '正确操作：浓硫酸 → 沿器壁慢慢注入水中，不断搅拌'
        : '错误操作：把水倒进浓硫酸', W / 2, H - 10);
      ctx.restore();

      setStatus();
    }

    function loop(now) {
      const dt = Math.min(50, now - last); last = now;
      if (container.isConnected && container.offsetParent !== null) {
        if (playing) {
          p += dt / 3600;
          if (p >= 1) { p = 1; playing = false; refreshChrome(); }
        }
        draw(now / 1000);
      }
      requestAnimationFrame(loop);
    }

    refreshChrome();
    requestAnimationFrame(loop);
  }

  /* ============================================================
     Panel D · 中和滴定（核心交互）
     滴有酚酞的 NaOH 溶液（红）中逐滴滴加稀盐酸
     左：烧杯 + 微观粒子；右：pH 曲线 + 状态判定
     ============================================================ */
  const CB = 0.1, CA = 0.1, VB = 20, VMAX = 40;

  function phAt(V) {
    const eps = 1e-9;
    if (V < VB) return 14 + Math.log10(Math.max((CB * VB - CA * V) / (VB + V), eps));
    if (V > VB) return -Math.log10(Math.max((CA * V - CB * VB) / (VB + V), eps));
    return 7;
  }

  function titrationState(V) {
    if (Math.abs(V - VB) <= 0.3) return 'exact';
    return V < VB ? 'base' : 'acid';
  }

  function initTitration(panelL, panelR, container) {
    /* ---------- 左：烧杯 ---------- */
    panelL.appendChild(A.el('<div class="panel-title">中和滴定 · 向滴有酚酞的 NaOH 溶液中滴加稀盐酸</div>'));
    const stageL = A.el('<div class="stage"></div>');
    const beaker = makeCanvas(stageL, 420);
    panelL.appendChild(stageL);

    const sliderRow = A.el(
      '<div class="slider-row" style="margin-top:14px"><label>累计滴加稀盐酸</label>' +
      '<input type="range" min="0" max="' + VMAX + '" step="0.5" value="0">' +
      '<span class="slider-val">0 mL</span></div>');
    panelL.appendChild(sliderRow);
    const slider = sliderRow.querySelector('input');
    const volEl = sliderRow.querySelector('.slider-val');

    const jumpRow = A.el('<div class="btn-row" style="margin-top:10px"></div>');
    [[10, '碱过量 · 10 mL'], [20, '⚖ 恰好完全反应 · 20 mL'], [30, '酸过量 · 30 mL'], [0, '↺ 归零']]
      .forEach(j => {
        const b = A.el('<button class="btn">' + j[1] + '</button>');
        b.addEventListener('click', () => { slider.value = j[0]; refresh(); });
        jumpRow.appendChild(b);
      });
    panelL.appendChild(jumpRow);

    const statusEl = A.el('<div class="z10-status"></div>');
    panelL.appendChild(statusEl);

    panelL.appendChild(A.el(
      '<div class="z10-eq-wrap">' + A.eq('HCl + NaOH', 'NaCl + H₂O') +
      '<span class="z10-phen">微观实质：' + A.eq('H⁺ + OH⁻', 'H₂O') + '</span></div>'));

    /* ---------- 右：pH 曲线 ---------- */
    panelR.appendChild(A.el('<div class="panel-title">pH 曲线 · 越靠近恰好完全反应，变化越陡</div>'));
    const stageR = A.el('<div class="stage"></div>');
    const curve = makeCanvas(stageR, 380);
    panelR.appendChild(stageR);

    const verdictEl = A.el('<div class="console-card accent-a" style="margin-top:14px">' +
      '<div class="card-label">当前状态判定</div><div class="z10-concl"></div></div>');
    panelR.appendChild(verdictEl);
    const verdictBody = verdictEl.querySelector('.z10-concl');

    /* ---------- 微观粒子 ---------- */
    const parts = [];   // {type:'oh'|'h'|'w', x,y,vx,vy}
    const flashes = []; // {x,y,life,max}
    function liquidRect() {
      const W = beaker.size.W, H = beaker.size.H;
      const bw = 95, bbot = H - 52, btop = bbot - 240;
      return { l: W / 2 - bw + 10, r: W / 2 + bw - 10, t: btop + 66, b: bbot - 12 };
    }
    function spawn(type) {
      const R = liquidRect();
      parts.push({
        type,
        x: R.l + Math.random() * (R.r - R.l),
        y: R.t + Math.random() * (R.b - R.t),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
      });
    }
    function reconcile() {
      const V = Number(slider.value);
      const tOH = V < VB ? Math.round(8 * (1 - V / VB)) : 0;
      const tH = V > VB ? Math.min(10, Math.round(10 * (V - VB) / VB)) : 0;
      const tW = 6 + Math.min(8, Math.round(8 * Math.min(V, VB) / VB));
      const count = ty => parts.filter(p2 => p2.type === ty).length;
      const adjust = (ty, target) => {
        let c = count(ty);
        while (c < target) { spawn(ty); c++; }
        while (c > target) {
          const i = parts.findIndex(p2 => p2.type === ty);
          if (i < 0) break;
          if (ty === 'oh') flashes.push({ x: parts[i].x, y: parts[i].y, life: 0, max: 26 });
          parts.splice(i, 1); c--;
        }
      };
      adjust('oh', tOH); adjust('h', tH); adjust('w', tW);
    }

    /* ---------- 状态刷新（DOM 侧） ---------- */
    function refresh() {
      const V = Number(slider.value);
      const ph = phAt(V);
      volEl.textContent = A.num(V, 1) + ' mL';
      const st = titrationState(V);
      if (st === 'base') {
        statusEl.innerHTML = '<b>碱过量：</b>NaOH 有剩余，溶液中的溶质为 <b>NaOH 和 NaCl</b>；' +
          '酚酞呈<b>红色</b>，pH≈' + A.num(ph, 1) + '。继续滴加稀盐酸……';
        verdictBody.innerHTML = '碱过量 · 溶质 <b>NaOH + NaCl</b><br>溶液呈<b style="color:var(--red)">红色</b>，pH≈' + A.num(ph, 1) + '（&gt;7）';
      } else if (st === 'exact') {
        statusEl.innerHTML = '<span class="ok">✓ 恰好完全反应：</span>HCl 与 NaOH 恰好完全反应，' +
          '溶液中的溶质<b>只有 NaCl</b>，溶液恰好由红色变为<b>无色</b>，pH = 7。';
        verdictBody.innerHTML = '<b style="color:var(--green)">恰好完全反应 ✓</b> · 溶质<b>只有 NaCl</b><br>溶液恰好变为无色，pH = 7';
      } else {
        statusEl.innerHTML = '<b>酸过量：</b>HCl 有剩余，溶液中的溶质为 <b>HCl 和 NaCl</b>；' +
          '溶液为<b>无色</b>（酚酞遇酸也不变色！），pH≈' + A.num(ph, 1) + '。';
        verdictBody.innerHTML = '酸过量 · 溶质 <b>HCl + NaCl</b><br>溶液为无色，pH≈' + A.num(ph, 1) + '（&lt;7）——无色 ≠ 恰好中和！';
      }
      reconcile();
    }
    slider.addEventListener('input', refresh);

    /* ---------- 烧杯绘制 ---------- */
    let dropT = 0;
    function drawBeaker(time, dt) {
      const ctx = beaker.ctx, W = beaker.size.W, H = beaker.size.H;
      ctx.clearRect(0, 0, W, H);
      const V = Number(slider.value);
      const ph = phAt(V);
      const st = titrationState(V);
      const cx = W / 2, bw = 95, bbot = H - 52, btop = bbot - 240;
      const R = liquidRect();

      /* 液体：酚酞红色随 pH 渐变（pH<8.2 无色） */
      const k = clamp01((ph - 8.2) / 3.2);
      const cr = Math.round(lerp(226, 244, k)), cg = Math.round(lerp(232, 63, k)), cb = Math.round(lerp(240, 94, k));
      const alpha = lerp(0.10, 0.55, k);
      ctx.save();
      ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + alpha + ')';
      ctx.fillRect(R.l - 6, R.t - 4, R.r - R.l + 12, R.b - R.t + 8);
      if (k > 0.03) {
        ctx.shadowColor = 'rgba(244,63,94,0.8)';
        ctx.shadowBlur = 26 * k;
        ctx.fillRect(R.l - 6, R.t - 4, R.r - R.l + 12, 3);
      }
      /* 液面线 */
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(226,232,240,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(R.l - 6, R.t - 4); ctx.lineTo(R.r + 6, R.t - 4); ctx.stroke();
      ctx.restore();

      /* 微观粒子（在液体中漫游） */
      for (let i = 0; i < parts.length; i++) {
        const pt = parts[i];
        /* 容器尺寸变化（或初始化默认宽度）导致粒子落在液体区外时，直接重新布点 */
        if (pt.x < R.l - 30 || pt.x > R.r + 30 || pt.y < R.t - 30 || pt.y > R.b + 30) {
          pt.x = R.l + Math.random() * (R.r - R.l);
          pt.y = R.t + Math.random() * (R.b - R.t);
        }
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vx += (Math.random() - 0.5) * 0.06;
        pt.vy += (Math.random() - 0.5) * 0.06;
        pt.vx = Math.max(-0.7, Math.min(0.7, pt.vx));
        pt.vy = Math.max(-0.7, Math.min(0.7, pt.vy));
        if (pt.x < R.l) { pt.x = R.l; pt.vx = Math.abs(pt.vx) + 0.1; }
        if (pt.x > R.r) { pt.x = R.r; pt.vx = -Math.abs(pt.vx) - 0.1; }
        if (pt.y < R.t) { pt.y = R.t; pt.vy = Math.abs(pt.vy) + 0.1; }
        if (pt.y > R.b) { pt.y = R.b; pt.vy = -Math.abs(pt.vy) - 0.1; }
        ctx.save();
        if (pt.type === 'oh') {
          ctx.fillStyle = MAGENTA; ctx.shadowColor = MAGENTA; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = '#3b0a22';
          ctx.font = '700 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('OH', pt.x, pt.y);
        } else if (pt.type === 'h') {
          ctx.fillStyle = CYAN; ctx.shadowColor = CYAN; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = '#06202a';
          ctx.font = '700 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('H', pt.x, pt.y);
        } else {
          /* H₂O：一对相连的小球 */
          ctx.strokeStyle = 'rgba(226,232,240,0.7)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(pt.x - 4, pt.y + 3); ctx.lineTo(pt.x + 4, pt.y + 3); ctx.stroke();
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath(); ctx.arc(pt.x - 5, pt.y + 4, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(pt.x + 5, pt.y + 4, 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#93c5fd';
          ctx.beginPath(); ctx.arc(pt.x, pt.y - 3, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      /* 结合闪光：H⁺ + OH⁻ → H₂O */
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.life++;
        if (f.life > f.max) { flashes.splice(i, 1); continue; }
        const u = f.life / f.max;
        ctx.save();
        ctx.globalAlpha = 1 - u;
        ctx.strokeStyle = AMBER;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, 4 + u * 16, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      /* 烧杯壁 */
      ctx.save();
      ctx.strokeStyle = 'rgba(226,232,240,0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - bw, btop); ctx.lineTo(cx - bw, bbot);
      ctx.lineTo(cx + bw, bbot); ctx.lineTo(cx + bw, btop);
      ctx.stroke();
      ctx.fillStyle = FAINT;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('滴有酚酞的 NaOH 溶液', cx, bbot + 20);
      ctx.restore();

      /* 胶头滴管 + 滴落动画 */
      const tipX = cx, tipY = btop + 8;
      ctx.save();
      ctx.fillStyle = 'rgba(244,114,182,0.85)';
      ctx.beginPath(); ctx.arc(tipX, 22, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(226,232,240,0.85)';
      ctx.fillRect(tipX - 4, 30, 8, tipY - 30);
      ctx.fillStyle = 'rgba(191,219,254,0.9)';
      ctx.fillRect(tipX - 2.5, 34, 5, tipY - 36);
      ctx.restore();
      ctx.fillStyle = FAINT;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('胶头滴管·稀盐酸', tipX + 20, 26);

      if (V > 0 && V <= VMAX) {
        dropT += dt / 1100;
        if (dropT >= 1) {
          dropT = 0;
          if (titrationState(V) === 'base') {
            flashes.push({
              x: R.l + 20 + Math.random() * (R.r - R.l - 40),
              y: R.t + 10 + Math.random() * 30, life: 0, max: 26
            });
          }
        }
        const dy = lerp(tipY, R.t - 6, dropT * dropT);
        ctx.save();
        ctx.fillStyle = 'rgba(191,219,254,0.95)';
        ctx.beginPath(); ctx.arc(tipX, dy, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      /* 状态横幅（左对齐，避开居中的滴管） + 图例 */
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = '700 14px sans-serif';
      ctx.fillStyle = st === 'exact' ? GREEN : (st === 'base' ? '#fb7185' : AMBER);
      ctx.fillText(st === 'exact' ? '✓ 恰好完全反应 · pH = 7'
        : st === 'base' ? '碱过量 · 溶液呈红色'
        : '酸过量 · 溶液无色（但已过量！）', 16, 56);
      ctx.textAlign = 'center';
      ctx.font = '12px sans-serif';
      ctx.fillStyle = DIM;
      ctx.fillText('● OH⁻（品红）   ● H⁺（青）   ●—● H₂O（白）', cx, H - 8);
      ctx.restore();
    }

    /* ---------- pH 曲线绘制 ---------- */
    function drawCurve() {
      const ctx = curve.ctx, W = curve.size.W, H = curve.size.H;
      ctx.clearRect(0, 0, W, H);
      const L = 42, Rm = 16, T = 20, B = 36;
      const X = v => L + (W - L - Rm) * v / VMAX;
      const Y = p => T + (H - T - B) * (1 - p / 14);

      /* 网格与刻度 */
      ctx.save();
      ctx.font = '11px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'right';
      for (let p = 0; p <= 14; p += 2) {
        ctx.strokeStyle = 'rgba(148,163,184,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(L, Y(p)); ctx.lineTo(W - Rm, Y(p)); ctx.stroke();
        ctx.fillStyle = FAINT;
        ctx.fillText(String(p), L - 8, Y(p) + 4);
      }
      ctx.textAlign = 'center';
      for (let v = 0; v <= VMAX; v += 10) {
        ctx.strokeStyle = 'rgba(148,163,184,0.12)';
        ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), H - B); ctx.stroke();
        ctx.fillStyle = FAINT;
        ctx.fillText(String(v), X(v), H - B + 16);
      }
      ctx.fillText('V(HCl) / mL', (L + W - Rm) / 2, H - 6);
      ctx.save();
      ctx.translate(12, (T + H - B) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('pH', 0, 0);
      ctx.restore();
      ctx.restore();

      /* pH=7 与恰好完全反应参考线 */
      ctx.save();
      ctx.strokeStyle = 'rgba(52,211,153,0.5)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(L, Y(7)); ctx.lineTo(W - Rm, Y(7)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(VB), T); ctx.lineTo(X(VB), H - B); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GREEN;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('pH = 7', L + 6, Y(7) - 5);
      ctx.textAlign = 'center';
      ctx.fillText('恰好完全反应', X(VB), H - B + 30);
      /* pH 突变区 */
      const bx1 = X(19.4), bx2 = X(20.6);
      ctx.fillStyle = 'rgba(251,191,36,0.10)';
      ctx.fillRect(bx1, T, bx2 - bx1, H - B - T);
      ctx.fillStyle = AMBER;
      ctx.font = '700 12px sans-serif';
      ctx.fillText('pH 突变', X(VB) + 44, Y(11));
      ctx.strokeStyle = 'rgba(251,191,36,0.6)';
      ctx.beginPath(); ctx.moveTo(X(VB) + 38, Y(10.6)); ctx.lineTo(X(VB) + 6, Y(9)); ctx.stroke();
      ctx.restore();

      /* 曲线 */
      ctx.save();
      ctx.strokeStyle = CYAN;
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let v = 0; v <= VMAX + 0.001; v += 0.1) {
        const p = phAt(Math.min(v, VMAX));
        if (v === 0) ctx.moveTo(X(v), Y(p)); else ctx.lineTo(X(v), Y(p));
      }
      ctx.stroke();
      ctx.restore();

      /* 当前光标点 */
      const V = Number(slider.value);
      const ph = phAt(V);
      const st = titrationState(V);
      const dotC = st === 'exact' ? GREEN : (st === 'base' ? '#fb7185' : AMBER);
      ctx.save();
      ctx.fillStyle = dotC;
      ctx.shadowColor = dotC;
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(X(V), Y(ph), 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = '700 13px "SF Mono", Consolas, monospace';
      ctx.textAlign = V > 30 ? 'right' : 'left';
      ctx.fillText('pH ≈ ' + A.num(ph, 1), X(V) + (V > 30 ? -12 : 12), Y(ph) - 10);
      ctx.restore();
    }

    /* ---------- 主循环 ---------- */
    let last = performance.now();
    function loop(now) {
      const dt = Math.min(50, now - last); last = now;
      if (container.isConnected && container.offsetParent !== null) {
        drawBeaker(now / 1000, dt);
        drawCurve();
      }
      requestAnimationFrame(loop);
    }
    refresh();
    requestAnimationFrame(loop);
  }

  /* ============================================================
     模块导出
     ============================================================ */
  window.Zone11 = {
    desc: '酸溶液中都含 <b>H⁺</b>，碱溶液中都含 <b>OH⁻</b>——这就是酸有相似性质、碱有相似性质的原因。' +
      '中和反应的微观实质只有一句话：<b>H⁺ + OH⁻ ═ H₂O</b>。本单元抓住四件事：' +
      '<span class="hl">指示剂与 pH</span>、<span class="hl-m">常见的酸</span>、' +
      '<span class="hl-a">常见的碱</span>、<span class="hl">中和反应</span>。',

    init(container) {
      /* ================= Panel A · 指示剂与 pH ================= */
      const rowA = A.el('<div class="layout-2col"></div>');
      const panelA = A.el('<div class="panel"></div>');
      const sideA = A.el('<div class="console"></div>');
      sideA.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">指示剂变色规律（背熟）</div>' +
        '<ul class="z10-list">' +
        '<li><b>紫色石蕊溶液</b>：遇酸变<b>红</b>，遇碱变<b>蓝</b>，中性仍为紫色；</li>' +
        '<li><b>无色酚酞溶液</b>：遇酸<b>不变色</b>（仍为无色），遇碱变<b>红</b>；</li>' +
        '<li>描述时主语别写反：「盐酸使石蕊变红」✓，「石蕊使盐酸变红」✗。</li>' +
        '</ul></div>'));
      sideA.appendChild(A.el(
        '<div class="console-card accent-a">' +
        '<div class="card-label">pH 的测定 · 规范操作（实验题必考）</div>' +
        '<div class="z10-concl">在白瓷板或玻璃片上放一小片 pH 试纸，用<b>玻璃棒蘸取</b>待测液滴到试纸上，' +
        '把试纸显示的颜色与<b>标准比色卡</b>比较，读出 pH（读数为整数）。<br>' +
        '<b>禁忌</b>：① 不能把试纸直接伸入试剂瓶（会污染试剂）；' +
        '② 不能先用水润湿试纸——相当于把待测液稀释，<b>测酸 pH 偏大、测碱 pH 偏小</b>。</div></div>'));
      sideA.appendChild(A.el(
        '<div class="console-card accent-m">' +
        '<div class="card-label">酸碱性与酸碱度</div>' +
        '<ul class="z10-list">' +
        '<li>酸碱指示剂只能定性判断<b>酸性/碱性/中性</b>；</li>' +
        '<li><b>pH</b> 才能定量表示酸碱度的强弱：&lt;7 酸性，=7 中性，&gt;7 碱性；</li>' +
        '<li>正常雨水 pH≈5.6（溶有 CO₂），<b>酸雨指 pH&lt;5.6 的雨水</b>。</li>' +
        '</ul></div>'));
      rowA.appendChild(panelA);
      rowA.appendChild(sideA);
      container.appendChild(rowA);

      /* ================= Panel B · 常见的酸 ================= */
      const rowB = A.el('<div class="layout-2col" style="margin-top:22px"></div>');
      const panelB = A.el('<div class="panel"></div>');
      const sideB = A.el('<div class="console"></div>');
      sideB.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">浓盐酸（HCl 气体的水溶液）</div>' +
        '<ul class="z10-list">' +
        '<li>无色、有刺激性气味的液体，有<b>挥发性</b>；</li>' +
        '<li>打开瓶盖，瓶口出现<b>白雾</b>——挥发出的 HCl 气体与空气中的水蒸气结合形成的<b>盐酸小液滴</b>；</li>' +
        '<li>⚠ 规范表述：是「<b>白雾</b>」（小液滴），不是「白烟」（固体小颗粒）！</li>' +
        '</ul></div>'));
      sideB.appendChild(A.el(
        '<div class="console-card accent-m">' +
        '<div class="card-label">浓硫酸（H₂SO₄）</div>' +
        '<ul class="z10-list">' +
        '<li><b>吸水性</b> → 可作某些气体的干燥剂（物理性质）；</li>' +
        '<li><b>腐蚀性（脱水性）</b>：能把纸张、木材、皮肤中的氢、氧元素按水的组成比脱去，使其炭化变黑；</li>' +
        '<li>若不慎沾到皮肤上，应立即用<b>大量水冲洗</b>，再涂上 <b>3%~5% 的碳酸氢钠溶液</b>；</li>' +
        '<li>溶于水时<b>放出大量的热</b>——所以稀释操作必须规范（看左边小剧场）。</li>' +
        '</ul></div>'));
      rowB.appendChild(panelB);
      rowB.appendChild(sideB);
      container.appendChild(rowB);

      /* 酸的化学性质通性（全宽） */
      const panelB2 = A.el('<div class="panel" style="margin-top:22px"></div>');
      panelB2.appendChild(A.el('<div class="panel-title">酸的化学性质 · 通性五条（有 H⁺ 就这套脾气）</div>'));
      panelB2.appendChild(A.el(
        '<div class="z10-prop"><div class="z10-prop-head"><span class="tag cyan">通性 ①</span>酸 + 指示剂</div>' +
        '<div class="z10-prop-body">紫色石蕊溶液遇酸变<b>红</b>，无色酚酞溶液遇酸<b>不变色</b>。</div></div>'));
      panelB2.appendChild(A.el(
        '<div class="z10-prop"><div class="z10-prop-head"><span class="tag cyan">通性 ②</span>酸 + 活泼金属 → 盐 + 氢气</div>' +
        '<div class="z10-eq-wrap">' + A.eq('Zn + H₂SO₄', 'ZnSO₄ + H₂↑') +
        '<span class="z10-phen">现象：有气泡产生，金属逐渐溶解（复习 ZONE 09 金属活动性顺序：H 前金属才行）</span></div></div>'));
      panelB2.appendChild(A.el(
        '<div class="z10-prop"><div class="z10-prop-head"><span class="tag cyan">通性 ③</span>酸 + 金属氧化物 → 盐 + 水</div>' +
        '<div class="z10-eq-wrap">' + A.eq('Fe₂O₃ + 6HCl', '2FeCl₃ + 3H₂O') + '</div>' +
        '<div class="z10-eq-wrap">' + A.eq('Fe₂O₃ + 3H₂SO₄', 'Fe₂(SO₄)₃ + 3H₂O') + '</div>' +
        '<div class="z10-prop-body">应用：<b>除铁锈</b>。现象：铁锈逐渐消失，溶液由无色变为<b>黄色</b>（Fe³⁺ 盐溶液的颜色）。' +
        '注意：除锈时酸不能过量太多，否则酸会继续腐蚀里面的铁（Fe + 2HCl ═ FeCl₂ + H₂↑）。</div></div>'));
      panelB2.appendChild(A.el(
        '<div class="z10-prop"><div class="z10-prop-head"><span class="tag cyan">通性 ④</span>酸 + 碱 → 盐 + 水（中和反应）</div>' +
        '<div class="z10-eq-wrap">' + A.eq('HCl + NaOH', 'NaCl + H₂O') +
        '<span class="z10-phen">详见下方 Panel D 中和滴定</span></div></div>'));
      panelB2.appendChild(A.el(
        '<div class="z10-prop"><div class="z10-prop-head"><span class="tag cyan">通性 ⑤</span>酸 + 某些盐 → 新盐 + 新酸</div>' +
        '<div class="z10-eq-wrap">' + A.eq('HCl + AgNO₃', 'AgCl↓ + HNO₃') + '</div>' +
        '<div class="z10-prop-body">现象：产生<b>白色沉淀</b>，且沉淀<b>不溶于稀硝酸</b>——这是 <b>Cl⁻ 的检验</b>方法。</div></div>'));
      container.appendChild(panelB2);

      /* ================= Panel C · 常见的碱 ================= */
      const rowC = A.el('<div class="layout-2col-r" style="margin-top:22px"></div>');
      const sideC = A.el('<div class="console"></div>');
      sideC.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">氢氧化钠 NaOH</div>' +
        '<ul class="z10-list">' +
        '<li>俗名：<b>火碱、烧碱、苛性钠</b>；</li>' +
        '<li>白色固体，<b>易溶于水，溶解时放出大量的热</b>；</li>' +
        '<li>曝露在空气中易吸收水分而<b>潮解</b> → 可作某些气体的干燥剂（物理变化）；</li>' +
        '<li>有<b>强腐蚀性</b>，称量时应放在玻璃器皿（如小烧杯）中；</li>' +
        '<li>必须<b>密封保存</b>：吸收 CO₂ 而变质 👇</li>' +
        '</ul>' +
        '<div class="z10-eq-wrap">' + A.eq('2NaOH + CO₂', 'Na₂CO₃ + H₂O') + '</div></div>'));
      sideC.appendChild(A.el(
        '<div class="console-card accent-m">' +
        '<div class="card-label">氢氧化钙 Ca(OH)₂</div>' +
        '<ul class="z10-list">' +
        '<li>俗名：<b>熟石灰、消石灰</b>；</li>' +
        '<li>白色粉末状固体，<b>微溶</b>于水，其水溶液俗称<b>石灰水</b>；</li>' +
        '<li>制取：生石灰与水反应，<b>放出大量的热</b>（生石灰作食品干燥剂、自热饭盒的发热原理）👇</li>' +
        '</ul>' +
        '<div class="z10-eq-wrap">' + A.eq('CaO + H₂O', 'Ca(OH)₂') + '</div>' +
        '<div class="z10-concl" style="margin-top:10px">用途：<b>改良酸性土壤</b>、与硫酸铜配制农药<b>波尔多液</b>、砌砖抹墙（石灰浆）。</div></div>'));
      const panelC = A.el('<div class="panel"></div>');
      panelC.appendChild(A.el('<div class="panel-title">碱的化学性质 · 通性四条（OH⁻ 的脾气）</div>'));
      panelC.appendChild(A.el(
        '<div class="z10-prop"><div class="z10-prop-head"><span class="tag magenta">通性 ①</span>碱 + 指示剂</div>' +
        '<div class="z10-prop-body">紫色石蕊溶液遇碱变<b>蓝</b>，无色酚酞溶液遇碱变<b>红</b>。' +
        '<b>注意</b>：只有<b>可溶性碱</b>的溶液才能使指示剂变色（Cu(OH)₂ 等难溶碱不行）。</div></div>'));
      panelC.appendChild(A.el(
        '<div class="z10-prop"><div class="z10-prop-head"><span class="tag magenta">通性 ②</span>碱 + 非金属氧化物 → 盐 + 水</div>' +
        '<div class="z10-eq-wrap">' + A.eq('2NaOH + CO₂', 'Na₂CO₃ + H₂O') + '</div>' +
        '<div class="z10-eq-wrap">' + A.eq('Ca(OH)₂ + CO₂', 'CaCO₃↓ + H₂O') + '</div>' +
        '<div class="z10-prop-body">后者现象：<b>澄清石灰水变浑浊</b>——这是<b>检验 CO₂</b> 的方法。' +
        '⚠ 注意：碱 + 非金属氧化物<b>不是</b>复分解反应（成分交换方式不同）。</div></div>'));
      panelC.appendChild(A.el(
        '<div class="z10-prop"><div class="z10-prop-head"><span class="tag magenta">通性 ③</span>碱 + 酸 → 盐 + 水（中和反应）</div>' +
        '<div class="z10-eq-wrap">' + A.eq('2NaOH + H₂SO₄', 'Na₂SO₄ + 2H₂O') + '</div></div>'));
      panelC.appendChild(A.el(
        '<div class="z10-prop"><div class="z10-prop-head"><span class="tag magenta">通性 ④</span>碱 + 某些盐 → 新碱 + 新盐</div>' +
        '<div class="z10-eq-wrap">' + A.eq('2NaOH + CuSO₄', 'Cu(OH)₂↓ + Na₂SO₄') +
        '<span class="z10-phen">现象：产生<b>蓝色絮状沉淀</b></span></div>' +
        '<div class="z10-eq-wrap">' + A.eq('3NaOH + FeCl₃', 'Fe(OH)₃↓ + 3NaCl') +
        '<span class="z10-phen">现象：产生<b>红褐色沉淀</b></span></div>' +
        '<div class="z10-prop-body">这两种沉淀的颜色是中考「物质鉴别/推断题」的高频题眼，看到蓝色絮状沉淀就锁定 Cu(OH)₂！</div></div>'));
      rowC.appendChild(sideC);
      rowC.appendChild(panelC);
      container.appendChild(rowC);

      /* ================= Panel D · 中和滴定 ================= */
      const rowD = A.el('<div class="layout-2col" style="margin-top:22px"></div>');
      const panelDL = A.el('<div class="panel"></div>');
      const panelDR = A.el('<div class="panel"></div>');
      rowD.appendChild(panelDL);
      rowD.appendChild(panelDR);
      container.appendChild(rowD);

      /* 定义卡 + 应用卡（全宽） */
      const panelD2 = A.el('<div class="panel" style="margin-top:22px"></div>');
      panelD2.appendChild(A.el('<div class="panel-title">中和反应 · 定义与应用</div>'));
      panelD2.appendChild(A.el(
        '<div class="z10-concl"><b>定义：酸与碱作用生成盐和水的反应，叫做中和反应</b>（生成物是盐和水，属于<b>复分解反应</b>）。' +
        '⚠ 反向不成立：生成盐和水的反应<b>不一定</b>是中和反应——如金属氧化物 + 酸、非金属氧化物 + 碱也生成盐和水，但它们不是酸与碱的反应。</div>'));
      panelD2.appendChild(A.el(
        '<div class="z10-app-grid">' +
        '<div class="z10-app"><b>① 改良酸性土壤</b><br>向酸性土壤中撒适量<b>熟石灰</b> Ca(OH)₂ 中和。</div>' +
        '<div class="z10-app"><b>② 处理工厂废水</b><br>硫酸厂的废水用熟石灰中和：<br>' + A.eq('H₂SO₄ + Ca(OH)₂', 'CaSO₄ + 2H₂O') + '</div>' +
        '<div class="z10-app"><b>③ 治疗胃酸过多</b><br>服用含 Al(OH)₃（或 Mg(OH)₂）的药物：<br>' + A.eq('3HCl + Al(OH)₃', 'AlCl₃ + 3H₂O') + '</div>' +
        '<div class="z10-app"><b>④ 蚊虫叮咬</b><br>蚊虫分泌<b>蚁酸</b>，可涂<b>肥皂水</b>等碱性物质中和止痒。</div>' +
        '</div>'));
      container.appendChild(panelD2);

      /* ================= 学霸加餐 ================= */
      container.appendChild(A.el(
        '<details class="pro-box"><summary>学霸加餐 · 中考压轴三件套</summary><div class="pro-body">' +

        '<div class="pro-item"><span class="pro-tag">压轴题型</span><b>中和后溶质成分探究</b><br>' +
        '以 HCl + NaOH ═ NaCl + H₂O 为例，反应后溶液中的溶质只有三种可能：' +
        '① 恰好完全反应——只有 <span class="hl">NaCl</span>；② 酸过量——<span class="hl">HCl + NaCl</span>；③ 碱过量——<span class="hl">NaOH + NaCl</span>。' +
        '（生成物 NaCl 一定有，探究的其实是"谁过量"。）<br>' +
        '<b>易错：</b>滴有酚酞时溶液无色<b>不能</b>证明恰好中和——酸过量时酚酞也是无色！' +
        '检验酸是否过量应改用<b>紫色石蕊溶液</b>（变红则有酸），或加<b>活泼金属/碳酸盐</b>（有气泡则有酸）。</div>' +

        '<div class="pro-item"><span class="pro-tag">探究套路</span><b>NaOH 变质程度探究</b><br>' +
        'NaOH 吸收 CO₂ 变质：2NaOH + CO₂ ═ Na₂CO₃ + H₂O。三种可能：' +
        '未变质（只有 NaOH）/ 部分变质（NaOH + Na₂CO₃）/ 完全变质（只有 Na₂CO₃）。<br>' +
        '<b>检验思路（两步走）：</b>先加<b>足量</b> BaCl₂（或 CaCl₂）溶液——产生白色沉淀即证明已变质，同时把 Na₂CO₃ <b>除尽</b>；' +
        '静置后取上层清液滴加<b>酚酞</b>——变红则还有 NaOH（部分变质），不变红则完全变质。<br>' +
        '<b>易错：</b>不能用 Ba(OH)₂ 或 Ca(OH)₂ 代替——会引入 OH⁻，干扰 NaOH 的检验；' +
        'BaCl₂ 必须<b>足量</b>，否则 CO₃²⁻ 除不尽，残留的 Na₂CO₃ 溶液也呈碱性，会让酚酞变红造成误判。</div>' +

        '<div class="pro-item"><span class="pro-tag">证明反应发生</span><b>中和反应放热</b><br>' +
        '中和反应<b>放出热量</b>。对于"没有明显现象"的中和反应（如稀盐酸 + NaOH 溶液），证明反应发生的两条路：' +
        '① 指示剂路线——酚酞由红变无色，说明 NaOH 消失了；' +
        '② 温度路线——用温度传感器测得混合后溶液<b>温度升高</b>，说明发生了放热的中和反应。' +
        '（答题关键词：<span class="hl">温度升高 → 放热 → 发生了化学反应</span>。）</div>' +

        '</div></details>'));

      /* ================= takeaway ================= */
      container.appendChild(A.el(
        '<div class="takeaway">酸的脾气来自 <b>H⁺</b>，碱的脾气来自 <b>OH⁻</b>；' +
        '中和反应看三点——<b>曲线突变、酚酞变色、温度升高</b>。' +
        '下一站 <b>ZONE 12</b>「盐和化肥」：中和反应生成的"盐"，马上要当主角了。👉</div>'));

      /* 启动交互 */
      initIndicator(panelA);
      initPH(panelA);
      initDilution(panelB, container);
      initTitration(panelDL, panelDR, container);
    }
  };
})();
