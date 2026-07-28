/* ============================================================
   ZONE 06 · 质量守恒定律
   Panel A 微观放大镜：2H₂ + O₂ ═点燃═ 2H₂O / 2H₂O ═通电═ 2H₂↑ + O₂↑
   Panel B 天平实验室：白磷（密闭）/ 铁钉+硫酸铜 / 镁条（敞口）
   ============================================================ */
(function () {
  'use strict';

  const A = window.App;
  const CYAN = '#22d3ee', MAGENTA = '#f472b6', AMBER = '#fbbf24',
    GREEN = '#34d399', RED = '#f87171', TEXT = '#e2e8f0', DIM = '#94a3b8', FAINT = '#64748b';

  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
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

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ============================================================
     Panel A · 微观放大镜
     原子编号：0-3 = H（青色小球），4-5 = O（品红大球）
     ============================================================ */
  function initMicro(panel, container) {
    const REACTIONS = {
      burn: {
        tab: '氢气燃烧', fire: '🔥 点 燃',
        eq: A.eq('2H₂ + O₂', '2H₂O', '点燃'),
        pre: '反应前：2 个氢分子 + 1 个氧分子',
        mid: '反应中：分子拆成原子，原子重新组合…',
        post: '反应后：2 个水分子',
        rMol: 3, pMol: 2,
        note: '每 2 个氢分子和 1 个氧分子反应，生成 2 个水分子——<b>3 个分子变成 2 个分子</b>，分子数目变了，但原子一个不少。'
      },
      elec: {
        tab: '电解水', fire: '⚡ 通 电',
        eq: A.eq('2H₂O', '2H₂↑ + O₂↑', '通电'),
        pre: '反应前：2 个水分子',
        mid: '反应中：分子拆成原子，原子重新组合…',
        post: '反应后：2 个氢分子 + 1 个氧分子',
        rMol: 2, pMol: 3,
        note: '每 2 个水分子分解，生成 2 个氢分子和 1 个氧分子——<b>2 个分子变成 3 个分子</b>，分子数目变了，原子依然一个不少。'
      }
    };

    /* 两组分子布局：mix = 2H₂ + O₂，water = 2H₂O，围绕 (cx, ry) */
    function moleculeSet(cx, ry) {
      const mix = new Array(6), water = new Array(6), d = 30;
      mix[0] = { x: cx - 42, y: ry - 56 }; mix[1] = { x: cx - 18, y: ry - 56 };
      mix[2] = { x: cx - 98, y: ry + 30 }; mix[3] = { x: cx - 74, y: ry + 30 };
      mix[4] = { x: cx + 26, y: ry + 6 }; mix[5] = { x: cx + 58, y: ry + 6 };
      const w1x = cx - 56, w1y = ry - 8, w2x = cx + 56, w2y = ry + 14;
      water[4] = { x: w1x, y: w1y - d * 0.38 };
      water[0] = { x: w1x - d * 0.8, y: w1y + d * 0.58 };
      water[1] = { x: w1x + d * 0.8, y: w1y + d * 0.58 };
      water[5] = { x: w2x, y: w2y - d * 0.38 };
      water[2] = { x: w2x - d * 0.8, y: w2y + d * 0.58 };
      water[3] = { x: w2x + d * 0.8, y: w2y + d * 0.58 };
      return { mix, water };
    }

    function keyframes(type, W, H) {
      const ry = H * 0.56;
      const left = moleculeSet(W * 0.24, ry), right = moleculeSet(W * 0.76, ry);
      const start = type === 'burn' ? left.mix : left.water;
      const end = type === 'burn' ? right.water : right.mix;
      const mid = [], mcx = W * 0.5, mcy = H * 0.55, mr = Math.min(W, H) * 0.15;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 3;
        mid.push({ x: mcx + Math.cos(a) * mr, y: mcy + Math.sin(a) * mr });
      }
      return { start, mid, end };
    }

    /* 成键分组：mixGroups = [H₂][H₂][O₂]，waterGroups = [H₂O][H₂O]（首元素为 O） */
    const MIX_GROUPS = [[0, 1], [2, 3], [4, 5]];
    const WATER_GROUPS = [[4, 0, 1], [5, 2, 3]];
    const LABELS = { mix: ['H₂', 'H₂', 'O₂'], water: ['H₂O', 'H₂O'] };

    /* ---------- DOM ---------- */
    panel.appendChild(A.el('<div class="panel-title">微观放大镜 · 原子只是重新组合</div>'));
    const tabRow = A.el('<div class="btn-row" style="margin-bottom:12px"></div>');
    const tabs = Object.keys(REACTIONS).map(k => {
      const b = A.el('<button class="btn z5-tab" data-r="' + k + '">' + REACTIONS[k].tab + '</button>');
      tabRow.appendChild(b);
      return b;
    });
    panel.appendChild(tabRow);

    const stage = A.el('<div class="stage"></div>');
    const { ctx, size } = makeCanvas(stage, 420);
    panel.appendChild(stage);

    const ctrl = A.el('<div class="btn-row" style="margin-top:12px; align-items:center"></div>');
    const fireBtn = A.el('<button class="btn btn-primary"></button>');
    const phaseEl = A.el('<span class="z5-phase"></span>');
    ctrl.appendChild(fireBtn);
    ctrl.appendChild(phaseEl);
    panel.appendChild(ctrl);

    const eqWrap = A.el('<div class="z5-eq-wrap"></div>');
    panel.appendChild(eqWrap);
    const noteEl = A.el('<div class="z5-note"></div>');
    panel.appendChild(noteEl);

    /* ---------- 状态 ---------- */
    let type = 'burn', p = 0, playing = false, flash = 0, lastPhase = '';
    let last = performance.now();

    function R() { return REACTIONS[type]; }

    function refreshChrome() {
      tabs.forEach(b => b.classList.toggle('on', b.dataset.r === type));
      fireBtn.textContent = p >= 1 ? '↺ 复位重来' : (playing ? '反应进行中…' : R().fire);
      fireBtn.disabled = playing;
      eqWrap.innerHTML = R().eq + '<span class="z5-phase" style="margin-left:auto">' +
        (type === 'burn' ? '化合反应' : '分解反应') + '</span>';
      noteEl.innerHTML = R().note +
        ' <b>原子既不会凭空消失，也不会凭空产生</b>——这就是质量守恒的微观解释。😉';
    }

    tabs.forEach(b => b.addEventListener('click', () => {
      if (playing) return;
      type = b.dataset.r; p = 0; flash = 0;
      refreshChrome();
    }));

    fireBtn.addEventListener('click', () => {
      if (playing) return;
      if (p >= 1) { p = 0; flash = 0; refreshChrome(); return; }
      playing = true; flash = 1;
      refreshChrome();
    });

    /* ---------- 绘制 ---------- */
    function atomPos(i, kf, time) {
      const s = kf.start[i], m = kf.mid[i], e = kf.end[i];
      let x, y;
      if (p < 0.45) { const u = ease(p / 0.45); x = lerp(s.x, m.x, u); y = lerp(s.y, m.y, u); }
      else if (p < 0.55) { x = m.x; y = m.y; }
      else { const u = ease((p - 0.55) / 0.45); x = lerp(m.x, e.x, u); y = lerp(m.y, e.y, u); }
      x += Math.sin(time * 2.4 + i * 1.7) * 1.5;
      y += Math.cos(time * 2.1 + i * 2.3) * 1.5;
      return { x, y };
    }

    function drawBond(ctx2, a, b, alpha, doubleBond) {
      if (alpha <= 0.01) return;
      ctx2.save();
      ctx2.globalAlpha = alpha;
      ctx2.strokeStyle = 'rgba(226,232,240,0.85)';
      ctx2.lineWidth = 3;
      ctx2.lineCap = 'round';
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const off = doubleBond ? 2.6 : 0;
      ctx2.beginPath();
      ctx2.moveTo(a.x + nx * off, a.y + ny * off);
      ctx2.lineTo(b.x + nx * off, b.y + ny * off);
      if (doubleBond) {
        ctx2.moveTo(a.x - nx * off, a.y - ny * off);
        ctx2.lineTo(b.x - nx * off, b.y - ny * off);
      }
      ctx2.stroke();
      ctx2.restore();
    }

    function drawAtom(ctx2, x, y, isO) {
      const r = isO ? 14 : 9.5, c = isO ? MAGENTA : CYAN;
      ctx2.save();
      ctx2.shadowColor = c;
      ctx2.shadowBlur = 14;
      const g = ctx2.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.15, x, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, c);
      g.addColorStop(1, isO ? '#9d2d6e' : '#0e6d84');
      ctx2.fillStyle = g;
      ctx2.beginPath();
      ctx2.arc(x, y, r, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
      ctx2.fillStyle = 'rgba(6,20,26,0.85)';
      ctx2.font = '700 10px "SF Mono", Consolas, monospace';
      ctx2.textAlign = 'center';
      ctx2.textBaseline = 'middle';
      ctx2.fillText(isO ? 'O' : 'H', x, y + 0.5);
    }

    function drawGroupLabels(ctx2, pts, groups, labels, alpha) {
      if (alpha < 0.6) return;
      ctx2.save();
      ctx2.globalAlpha = (alpha - 0.6) / 0.4;
      ctx2.font = '12px "SF Mono", Consolas, monospace';
      ctx2.textAlign = 'center';
      ctx2.fillStyle = DIM;
      groups.forEach((g, gi) => {
        let cx = 0, cy = 0;
        g.forEach(i => { cx += pts[i].x; cy += pts[i].y; });
        cx /= g.length; cy /= g.length;
        ctx2.fillText(labels[gi], cx, cy - 26);
      });
      ctx2.restore();
    }

    function hudBox(ctx2, x, title, rows, alignRight) {
      ctx2.save();
      ctx2.font = '12px "SF Mono", Consolas, monospace';
      const w = 168, h = 24 + rows.length * 20;
      const bx = alignRight ? x - w : x;
      rr(ctx2, bx, 12, w, h, 10);
      ctx2.fillStyle = 'rgba(255,255,255,0.04)';
      ctx2.fill();
      ctx2.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx2.stroke();
      ctx2.textAlign = 'left';
      ctx2.textBaseline = 'alphabetic';
      ctx2.fillStyle = FAINT;
      ctx2.fillText(title, bx + 12, 32);
      rows.forEach((row, i) => {
        ctx2.fillStyle = row.c || TEXT;
        ctx2.fillText(row.t, bx + 12, 52 + i * 20);
      });
      ctx2.restore();
    }

    function draw(time) {
      const W = size.W, H = size.H;
      ctx.clearRect(0, 0, W, H);
      const kf = keyframes(type, W, H);
      const pts = [];
      for (let i = 0; i < 6; i++) pts.push(atomPos(i, kf, time));

      const startGroups = type === 'burn' ? MIX_GROUPS : WATER_GROUPS;
      const endGroups = type === 'burn' ? WATER_GROUPS : MIX_GROUPS;
      const aStart = 1 - clamp01(p / 0.35);
      const aEnd = clamp01((p - 0.65) / 0.35);

      /* 键 */
      startGroups.forEach(g => {
        if (g.length === 2) drawBond(ctx, pts[g[0]], pts[g[1]], aStart, g[0] === 4);
        else { drawBond(ctx, pts[g[0]], pts[g[1]], aStart, false); drawBond(ctx, pts[g[0]], pts[g[2]], aStart, false); }
      });
      endGroups.forEach(g => {
        if (g.length === 2) drawBond(ctx, pts[g[0]], pts[g[1]], aEnd, g[0] === 4);
        else { drawBond(ctx, pts[g[0]], pts[g[1]], aEnd, false); drawBond(ctx, pts[g[0]], pts[g[2]], aEnd, false); }
      });

      /* 原子 */
      for (let i = 0; i < 6; i++) drawAtom(ctx, pts[i].x, pts[i].y, i >= 4);

      /* 分子标签 */
      const startKind = type === 'burn' ? 'mix' : 'water';
      const endKind = type === 'burn' ? 'water' : 'mix';
      drawGroupLabels(ctx, pts, startGroups, LABELS[startKind], aStart);
      drawGroupLabels(ctx, pts, endGroups, LABELS[endKind], aEnd);

      /* 点燃/通电闪光 */
      if (flash > 0.01) {
        ctx.save();
        ctx.globalAlpha = flash * 0.55;
        const g = ctx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, W * 0.5);
        g.addColorStop(0, type === 'burn' ? 'rgba(251,191,36,0.9)' : 'rgba(56,240,255,0.9)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      /* HUD 计数器：数字全程不变 */
      const before = p < 0.5;
      hudBox(ctx, 12, '反应物一侧', [
        { t: 'H 原子  ' + (before ? 4 : 0), c: CYAN },
        { t: 'O 原子  ' + (before ? 2 : 0), c: MAGENTA },
        { t: '分  子  ' + (before ? R().rMol : 0) + ' 个', c: DIM }
      ], false);
      hudBox(ctx, W - 12, '生成物一侧', [
        { t: 'H 原子  ' + (before ? 0 : 4), c: CYAN },
        { t: 'O 原子  ' + (before ? 0 : 2), c: MAGENTA },
        { t: '分  子  ' + (before ? 0 : R().pMol) + ' 个', c: DIM }
      ], true);

      ctx.save();
      ctx.textAlign = 'center';
      if (p > 0.03 && p < 0.97) {
        ctx.font = '13px "SF Mono", Consolas, monospace';
        ctx.fillStyle = AMBER;
        ctx.fillText('分子拆散 → 6 个原子重新组合中…', W / 2, 34);
      }
      /* 底部总数条 + 图例 */
      ctx.font = '700 13px "SF Mono", Consolas, monospace';
      ctx.fillStyle = GREEN;
      ctx.fillText('原子总数：H 4 · O 2 —— 全程不变 ✓', W / 2, H - 34);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = DIM;
      ctx.fillText('● 氢原子（青）    ● 氧原子（品红）', W / 2, H - 14);
      ctx.restore();

      /* 阶段文字 */
      const ph = p === 0 ? R().pre : (p >= 1 ? R().post : R().mid);
      if (ph !== lastPhase) { lastPhase = ph; phaseEl.textContent = ph; }
    }

    function loop(now) {
      const dt = Math.min(50, now - last); last = now;
      if (container.isConnected && container.offsetParent !== null) {
        if (playing) {
          p += dt / 3400;
          if (p >= 1) { p = 1; playing = false; refreshChrome(); }
        }
        flash = Math.max(0, flash - dt / 700);
        draw(now / 1000);
      }
      requestAnimationFrame(loop);
    }

    refreshChrome();
    requestAnimationFrame(loop);
  }

  /* ============================================================
     Panel B · 天平实验室
     ============================================================ */
  function initBalance(panel, container) {
    const EXPS = {
      p: {
        btn: '白磷 · 密闭锥形瓶', tag: '密闭', tagCls: 'green',
        eq: A.eq('4P + 5O₂', '2P₂O₅', '点燃'),
        pre: '锥形瓶底部放有少量白磷，瓶口塞紧带小气球的橡胶塞，整套装置放在左盘称量。点击「开始实验」引燃白磷。',
        mid: '白磷燃烧，<b>产生大量白烟</b>；气球先膨胀、后又缩小。看指针——<b>始终居中，天平保持平衡</b>。',
        done: '反应结束，冷却后天平仍然<b>平衡</b> ✓',
        concl: '<b>规范结论：</b>参加反应的白磷和氧气的质量总和，等于反应后生成的五氧化二磷的质量。装置<b>密闭</b>（气球起缓冲作用，防止瓶内气体受热膨胀冲开瓶塞），没有物质逸出、也没有外界物质进入，所以天平保持平衡。'
      },
      fe: {
        btn: '铁钉 + 硫酸铜溶液', tag: '敞口也平衡', tagCls: 'cyan',
        eq: A.eq('Fe + CuSO₄', 'FeSO₄ + Cu'),
        pre: '烧杯中盛有蓝色的硫酸铜溶液，放入一枚洁净的铁钉，直接放在左盘（敞口）称量。点击「开始实验」。',
        mid: '铁钉表面逐渐<b>覆盖一层红色物质</b>（铜），溶液由<b>蓝色逐渐变成浅绿色</b>（硫酸亚铁溶液）。指针<b>始终居中</b>。',
        done: '反应结束，天平仍然<b>平衡</b> ✓',
        concl: '<b>规范结论：</b>参加反应的铁和硫酸铜的质量总和，等于生成的铜和硫酸亚铁的质量总和。这个反应<b>既没有气体参加，也没有气体生成</b>，所以在敞口容器中进行，天平依然保持平衡。'
      },
      mg: {
        btn: '镁条 · 空气中燃烧', tag: '敞口', tagCls: 'amber',
        eq: A.eq('2Mg + O₂', '2MgO', '点燃'),
        pre: '左盘放一只敞口的坩埚，内有打磨光亮的镁条。点击「开始实验」引燃镁条——想想：这次还会平衡吗？',
        mid: '镁条燃烧，<b>发出耀眼的白光</b>，生成白色固体，并有<b>白烟逸散到空气中</b>…',
        done: '反应结束再称量——指针<b>偏转了</b>！称量结果与预期不符。难道质量守恒定律失效了？🤔',
        concl: '<b>并不是定律失效！</b>镁条燃烧时有<b>氧气参加反应</b>，而生成的氧化镁又有一部分<b>以白烟形式逸散</b>到空气中，敞口称量根本无法把"各物质"都称进去。所以：<b>有气体参加或有气体生成的反应，必须在密闭容器中进行实验</b>，才能验证质量守恒定律。'
      }
    };

    /* ---------- DOM ---------- */
    panel.appendChild(A.el('<div class="panel-title">天平实验室 · 称一称反应前后的总质量</div>'));
    const tabRow = A.el('<div class="btn-row" style="margin-bottom:12px"></div>');
    const tabs = Object.keys(EXPS).map(k => {
      const b = A.el('<button class="btn z5-exp" data-e="' + k + '">' + EXPS[k].btn + '</button>');
      tabRow.appendChild(b);
      return b;
    });
    panel.appendChild(tabRow);

    const stage = A.el('<div class="stage"></div>');
    const { ctx, size } = makeCanvas(stage, 440);
    panel.appendChild(stage);

    const ctrl = A.el('<div class="btn-row" style="margin-top:12px; align-items:center"></div>');
    const startBtn = A.el('<button class="btn btn-primary">▶ 开始实验</button>');
    const resetBtn = A.el('<button class="btn">↺ 复位</button>');
    ctrl.appendChild(startBtn);
    ctrl.appendChild(resetBtn);
    panel.appendChild(ctrl);

    const eqWrap = A.el('<div class="z5-eq-wrap"></div>');
    panel.appendChild(eqWrap);
    const statusEl = A.el('<div class="z5-status"></div>');
    panel.appendChild(statusEl);

    /* ---------- 状态 ---------- */
    let exp = 'p', t = 0, animating = false, tilt = 0;
    const particles = [];
    let lastPhase = '', last = performance.now();

    function E() { return EXPS[exp]; }

    function refreshChrome() {
      tabs.forEach(b => b.classList.toggle('on', b.dataset.e === exp));
      startBtn.disabled = animating || t >= 1;
      startBtn.textContent = animating ? '实验进行中…' : (t >= 1 ? '已完成 ✓' : '▶ 开始实验');
      eqWrap.innerHTML = E().eq +
        '<span class="tag ' + E().tagCls + '" style="margin-left:auto">' + E().tag + '</span>';
    }

    function setStatus() {
      const ph = t === 0 ? 'pre' : (t >= 1 ? 'done' : 'mid');
      const key = exp + '|' + ph;
      if (key === lastPhase) return;
      lastPhase = key;
      statusEl.innerHTML = E()[ph];
      const concl = document.getElementById('z5-concl');
      if (concl) concl.innerHTML = ph === 'done' ? E().concl :
        '<span style="color:var(--text-faint)">▶ 点击「开始实验」，观察现象后这里会给出规范结论。</span>';
    }

    tabs.forEach(b => b.addEventListener('click', () => {
      if (animating) return;
      exp = b.dataset.e; t = 0; tilt = 0; particles.length = 0;
      refreshChrome();
    }));
    startBtn.addEventListener('click', () => {
      if (animating || t >= 1) return;
      animating = true; refreshChrome();
    });
    resetBtn.addEventListener('click', () => {
      if (animating) return;
      t = 0; tilt = 0; particles.length = 0;
      refreshChrome();
    });

    /* ---------- 粒子（白烟） ---------- */
    function spawnSmoke(x, y, confined) {
      particles.push({
        x: x + (Math.random() - 0.5) * 22,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 0.25,
        vy: confined ? -(0.25 + Math.random() * 0.45) : -(0.9 + Math.random() * 1.4),
        r: 3 + Math.random() * 5,
        life: 0,
        max: confined ? 130 + Math.random() * 80 : 110 + Math.random() * 90,
        confined
      });
    }

    function stepParticles(flask) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life++;
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vx += (Math.random() - 0.5) * 0.04;
        if (pt.confined && flask) {
          /* 白烟被关在密闭锥形瓶里 */
          if (pt.y < flask.top) { pt.y = flask.top; pt.vy = Math.abs(pt.vy) * 0.4; }
          if (pt.x < flask.left) { pt.x = flask.left; pt.vx *= -0.6; }
          if (pt.x > flask.right) { pt.x = flask.right; pt.vx *= -0.6; }
        }
        if (pt.life > pt.max || pt.y < -30) particles.splice(i, 1);
      }
    }

    function drawParticles() {
      particles.forEach(pt => {
        const a = 0.5 * (1 - pt.life / pt.max);
        ctx.save();
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * (0.7 + pt.life / pt.max), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    /* ---------- 天平绘制 ---------- */
    function drawPan(x, y) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148,163,184,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 34, y);
      ctx.quadraticCurveTo(x, y + 22, x + 34, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 34, y);
      ctx.lineTo(x + 34, y);
      ctx.strokeStyle = 'rgba(148,163,184,0.5)';
      ctx.stroke();
      ctx.restore();
    }

    function drawFlask(x, panY, tt) {
      /* 锥形瓶：瓶颈 + 梯形瓶身，瓶底在 panY-4 */
      const by = panY - 4;
      const top = by - 62, neckW = 9, botW = 30;
      ctx.save();
      ctx.strokeStyle = 'rgba(226,232,240,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - neckW, by - 84);
      ctx.lineTo(x - neckW, top);
      ctx.lineTo(x - botW, by);
      ctx.lineTo(x + botW, by);
      ctx.lineTo(x + neckW, top);
      ctx.lineTo(x + neckW, by - 84);
      ctx.stroke();
      /* 瓶底白磷 / 生成的五氧化二磷 */
      ctx.fillStyle = tt === 0 ? '#fef3c7' : '#f8fafc';
      for (let i = 0; i < 7; i++) {
        const px = x - 16 + (i % 4) * 10, py = by - 4 - Math.floor(i / 4) * 5;
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      /* 燃烧光晕 */
      if (tt > 0 && tt < 0.75) {
        const g = ctx.createRadialGradient(x, by - 10, 2, x, by - 10, 46);
        g.addColorStop(0, 'rgba(251,191,36,' + 0.7 * (1 - tt / 0.75) + ')');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(x - 50, by - 60, 100, 60);
      }
      /* 橡胶塞 + 气球 */
      ctx.fillStyle = '#a16207';
      ctx.fillRect(x - neckW - 1, by - 90, neckW * 2 + 2, 8);
      const inflate = Math.sin(Math.min(tt, 1) * Math.PI);
      const br = 9 + inflate * 12;
      ctx.strokeStyle = MAGENTA;
      ctx.fillStyle = 'rgba(244,114,182,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, by - 90 - br, br, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      return { top: top + 6, left: x - botW + 8, right: x + botW - 8 };
    }

    function drawBeaker(x, panY, tt) {
      const by = panY - 4, h = 56, w = 30;
      const top = by - h;
      ctx.save();
      /* 溶液：蓝色 → 浅绿色 */
      const u = ease(tt);
      const cr = Math.round(lerp(59, 134, u)), cg = Math.round(lerp(130, 239, u)), cb = Math.round(lerp(246, 172, u));
      ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',0.55)';
      ctx.fillRect(x - w + 3, top + 12, w * 2 - 6, h - 15);
      /* 烧杯壁 */
      ctx.strokeStyle = 'rgba(226,232,240,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - w, top - 4);
      ctx.lineTo(x - w, by);
      ctx.lineTo(x + w, by);
      ctx.lineTo(x + w, top - 4);
      ctx.stroke();
      /* 铁钉：斜放，浸入部分逐渐覆盖红色铜层 */
      const x1 = x - 18, y1 = top - 26, x2 = x + 12, y2 = by - 8;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#9ca3af';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (tt > 0) {
        ctx.strokeStyle = 'rgba(248,113,113,' + (0.25 + 0.75 * tt) + ')';
        ctx.lineWidth = 6;
        /* 只涂液面以下部分（从液面交点到钉尖） */
        const f = (top + 12 - y1) / (y2 - y1);
        ctx.beginPath();
        ctx.moveTo(lerp(x1, x2, Math.max(0, f)), lerp(y1, y2, Math.max(0, f)));
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCrucible(x, panY, tt, time) {
      const by = panY - 4;
      ctx.save();
      /* 坩埚：浅碗 */
      ctx.strokeStyle = 'rgba(226,232,240,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 24, by - 20);
      ctx.quadraticCurveTo(x, by + 4, x + 24, by - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 24, by - 20);
      ctx.lineTo(x + 24, by - 20);
      ctx.strokeStyle = 'rgba(226,232,240,0.4)';
      ctx.stroke();
      if (tt < 1) {
        /* 镁条 */
        ctx.strokeStyle = tt > 0 ? '#f8fafc' : '#cbd5e1';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 14, by - 12);
        ctx.lineTo(x + 14, by - 16);
        ctx.stroke();
      }
      if (tt >= 1) {
        /* 生成的白色氧化镁粉末 */
        ctx.fillStyle = '#f8fafc';
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(x - 12 + (i % 3) * 12, by - 12 - Math.floor(i / 3) * 5, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      /* 耀眼白光 */
      if (tt > 0 && tt < 0.3) {
        const a = 1 - tt / 0.3;
        const g = ctx.createRadialGradient(x, by - 16, 4, x, by - 16, 120);
        g.addColorStop(0, 'rgba(255,255,255,' + 0.95 * a + ')');
        g.addColorStop(0.4, 'rgba(251,191,36,' + 0.5 * a + ')');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(x - 130, by - 140, 260, 160);
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.font = '700 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✦ 耀眼的白光 ✦', x, by - 66 + Math.sin(time * 6) * 2);
      }
      ctx.restore();
    }

    function drawWeights(x, panY) {
      ctx.save();
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      const ws = [[26, 14], [20, 11], [15, 9]];
      let y = panY - 2;
      ws.forEach(w => {
        y -= w[1];
        rr(ctx, x - w[0] / 2, y, w[0], w[1], 2);
        ctx.fill(); ctx.stroke();
      });
      ctx.restore();
    }

    function draw(time) {
      const W = size.W, H = size.H;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, baseY = H - 34, beamY = H * 0.36;
      const L = Math.min(W * 0.62, 560);
      const ang = tilt * 0.085;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const lx = cx - (L / 2) * cos, ly = beamY - (L / 2) * sin;
      const rx = cx + (L / 2) * cos, ry = beamY + (L / 2) * sin;
      const strLen = 64;

      /* 台面与底座 */
      ctx.strokeStyle = 'rgba(148,163,184,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(20, baseY); ctx.lineTo(W - 20, baseY); ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.16)';
      ctx.beginPath();
      ctx.moveTo(cx - 72, baseY); ctx.lineTo(cx + 72, baseY);
      ctx.lineTo(cx + 26, baseY - 18); ctx.lineTo(cx - 26, baseY - 18);
      ctx.closePath(); ctx.fill();
      /* 立柱 */
      ctx.fillStyle = 'rgba(148,163,184,0.3)';
      ctx.fillRect(cx - 6, beamY, 12, baseY - 18 - beamY);

      /* 刻度（固定不动） */
      ctx.save();
      ctx.strokeStyle = 'rgba(148,163,184,0.6)';
      ctx.fillStyle = FAINT;
      ctx.lineWidth = 1.5;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      for (let i = -1; i <= 1; i++) {
        const a = i * 0.09;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(a) * 34, beamY + Math.cos(a) * 34);
        ctx.lineTo(cx + Math.sin(a) * 44, beamY + Math.cos(a) * 44);
        ctx.stroke();
      }
      ctx.fillText('0', cx, beamY + 58);
      ctx.restore();

      /* 横梁 */
      ctx.save();
      ctx.strokeStyle = CYAN;
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
      ctx.restore();

      /* 指针（随横梁偏转） */
      ctx.save();
      ctx.strokeStyle = tilt > 0.5 ? RED : AMBER;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, beamY);
      ctx.lineTo(cx + Math.sin(ang) * 40, beamY + Math.cos(ang) * 40);
      ctx.stroke();
      ctx.restore();

      /* 吊绳 + 托盘 */
      [[lx, ly], [rx, ry]].forEach(pt => {
        ctx.strokeStyle = 'rgba(148,163,184,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pt[0], pt[1]);
        ctx.lineTo(pt[0] - 30, pt[1] + strLen);
        ctx.moveTo(pt[0], pt[1]);
        ctx.lineTo(pt[0] + 30, pt[1] + strLen);
        ctx.stroke();
        drawPan(pt[0], pt[1] + strLen);
      });

      /* 左盘装置 */
      let flask = null;
      const apx = lx, apy = ly + strLen;
      if (exp === 'p') flask = drawFlask(apx, apy, t);
      else if (exp === 'fe') drawBeaker(apx, apy, t);
      else drawCrucible(apx, apy, t, time);
      drawWeights(rx, ry + strLen);

      /* 盘标签 */
      ctx.save();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = DIM;
      ctx.fillText('左盘 · 反应装置', lx, ly + strLen + 40);
      ctx.fillText('右盘 · 砝码', rx, ry + strLen + 40);
      ctx.restore();

      /* 粒子 */
      if (animating && t > 0.02 && t < 0.9) {
        if (exp === 'p' && Math.random() < 0.5) spawnSmoke(apx, apy - 30, true);
        if (exp === 'mg' && Math.random() < 0.7) spawnSmoke(apx, apy - 26, false);
      }
      stepParticles(flask);
      drawParticles();

      /* 顶部状态横幅 */
      ctx.save();
      ctx.font = '700 14px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      if (tilt > 0.5) {
        ctx.fillStyle = RED;
        ctx.fillText('⚠ 指针偏转——称量结果与预期不符！', cx, 30);
      } else {
        ctx.fillStyle = t >= 1 ? GREEN : DIM;
        ctx.fillText(t >= 1 ? '指针居中 · 天平保持平衡 ✓' : E().btn, cx, 30);
      }
      ctx.restore();

      setStatus();
    }

    function loop(now) {
      const dt = Math.min(50, now - last); last = now;
      if (container.isConnected && container.offsetParent !== null) {
        if (animating) {
          t += dt / 4200;
          if (t >= 1) { t = 1; animating = false; refreshChrome(); }
        }
        /* 镁条实验结束后天平慢慢偏转 */
        const targetTilt = (exp === 'mg' && t >= 1) ? 1 : 0;
        tilt += (targetTilt - tilt) * 0.04;
        draw(now / 1000);
      }
      requestAnimationFrame(loop);
    }

    refreshChrome();
    requestAnimationFrame(loop);
  }

  /* ============================================================
     模块导出
     ============================================================ */
  window.Zone6 = {
    desc: '<b>参加化学反应的各物质的质量总和，等于反应后生成的各物质的质量总和。</b>' +
      '微观本质：化学反应前后，原子的<b>种类不变、数目不变、质量不变</b>——原子只是重新组合。',

    init(container) {
      /* ---------- Panel A ---------- */
      const rowA = A.el('<div class="layout-2col"></div>');
      const panelA = A.el('<div class="panel"></div>');
      const sideA = A.el('<div class="console"></div>');
      sideA.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">微观「三不变」——守恒的根源</div>' +
        '<ul class="z5-list">' +
        '<li>原子的<b>种类</b>不变</li>' +
        '<li>原子的<b>数目</b>不变</li>' +
        '<li>原子的<b>质量</b>不变</li>' +
        '</ul></div>'));
      sideA.appendChild(A.el(
        '<div class="console-card accent-m">' +
        '<div class="card-label">「两个一定变」——否则就不叫化学变化</div>' +
        '<ul class="z5-list">' +
        '<li><b>分子的种类</b>一定变</li>' +
        '<li><b>物质的种类</b>一定变（生成新物质）</li>' +
        '</ul></div>'));
      sideA.appendChild(A.el(
        '<div class="console-card accent-a">' +
        '<div class="card-label">「一个可能变」</div>' +
        '<ul class="z5-list">' +
        '<li><b>分子的数目</b>可能变：如 2H₂ + O₂ → 2H₂O，3 个分子变 2 个；电解水则 2 个变 3 个</li>' +
        '</ul></div>'));
      sideA.appendChild(A.el(
        '<div class="console-card">' +
        '<div class="card-label">一句话总结</div>' +
        '<div class="z5-concl">原子只是<b>重新排队</b>，没有增减、没有换种——所以反应前后总质量必然相等。这就是<b>质量守恒</b>的微观解释。😉</div>' +
        '</div>'));
      rowA.appendChild(panelA);
      rowA.appendChild(sideA);
      container.appendChild(rowA);

      /* ---------- Panel B ---------- */
      const rowB = A.el('<div class="layout-2col" style="margin-top:22px"></div>');
      const panelB = A.el('<div class="panel"></div>');
      const sideB = A.el('<div class="console"></div>');
      sideB.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">定律原文（背熟，一个字都不能改味）</div>' +
        '<div class="z5-law"><span class="kw">参加</span>化学反应的<span class="kw">各物质</span>的<span class="kw">质量总和</span>，等于反应后生成的<span class="kw">各物质</span>的<span class="kw">质量总和</span>。</div>' +
        '</div>'));
      sideB.appendChild(A.el(
        '<div class="console-card accent-m">' +
        '<div class="card-label">易错点 ⚠</div>' +
        '<ul class="z5-list">' +
        '<li>是<b>「参加」</b>反应的反应物——没反应完的（过量的、剩余的）<b>不算</b>；</li>' +
        '<li><b>「各物质」</b>一个都不能漏：气体、沉淀都要计入；</li>' +
        '<li>质量守恒定律只适用于<b>化学变化</b>，物理变化不谈它。</li>' +
        '</ul></div>'));
      sideB.appendChild(A.el(
        '<div class="console-card accent-a">' +
        '<div class="card-label">现象与结论</div>' +
        '<div class="z5-concl" id="z5-concl"><span style="color:var(--text-faint)">▶ 点击「开始实验」，观察现象后这里会给出规范结论。</span></div>' +
        '</div>'));
      rowB.appendChild(panelB);
      rowB.appendChild(sideB);
      container.appendChild(rowB);

      /* ---------- takeaway ---------- */
      container.appendChild(A.el(
        '<div class="takeaway">质量守恒定律是书写化学方程式的<b>理论依据</b>——方程式两边<b>每一种原子的个数必须相等</b>，这就是「配平」存在的理由。👉 下一站 <b>ZONE 07</b>「化学方程式的配平」，亲手把原子数配平！</div>'));

      initMicro(panelA, container);
      initBalance(panelB, container);
    }
  };
})();
