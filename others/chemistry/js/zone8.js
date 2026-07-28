/* ============================================================
   ZONE 08 · 碳和碳的氧化物（第六单元）
   五个二级 Tab：碳的单质 / CO₂ 的制取 / CO₂ 的性质 / 一氧化碳 / 转化关系图
   ============================================================ */
(function () {
  'use strict';

  const CYAN = '#22d3ee', MAGENTA = '#f472b6', AMBER = '#fbbf24',
        GREEN = '#34d399', RED = '#f87171', DIM = '#94a3b8', FAINT = '#64748b';

  /* ---------------- 画布舞台辅助 ----------------
     draw(ctx, w, h, t) 每帧调用；元素不可见时跳过重绘 */
  function makeStage(parent, height, draw, caption) {
    const stage = App.el('<div class="stage z7-stage"></div>');
    if (caption) stage.appendChild(App.el('<span class="stage-caption">' + caption + '</span>'));
    const cv = document.createElement('canvas');
    cv.style.height = height + 'px';
    stage.appendChild(cv);
    parent.appendChild(stage);
    const ctx = cv.getContext('2d');

    function resize() {
      const w = stage.clientWidth;
      if (w <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    new ResizeObserver(resize).observe(stage);
    resize();

    const t0 = performance.now();
    requestAnimationFrame(function frame(now) {
      if (!stage.isConnected) return;               // 元素被移除则终止循环
      if (stage.offsetParent !== null && stage.clientWidth > 0) {
        draw(ctx, stage.clientWidth, height, ((now == null ? t0 : now) - t0) / 1000);
      }
      requestAnimationFrame(frame);
    });
    return stage;
  }

  /* 简单三维旋转投影 */
  function rotY(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  }
  function rotX(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  }
  function proj(p, cx, cy, scale) {
    const persp = 4.2;
    const k = persp / (persp + p[2]);
    return [cx + p[0] * scale * k, cy + p[1] * scale * k, k];
  }

  function flameShape(ctx, x, y, s, t, color) {
    const f = 1 + 0.12 * Math.sin(t * 13 + x);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * f, s * (2 - f));
    const g = ctx.createRadialGradient(0, -6, 1, 0, -6, 14);
    g.addColorStop(0, '#fff7d6');
    g.addColorStop(0.45, color);
    g.addColorStop(1, 'rgba(244,114,182,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-7, -8, 0, -20);
    ctx.quadraticCurveTo(7, -8, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  /* ============================================================
     Tab 1 · 碳的单质
     ============================================================ */
  function buildTab1(pane) {
    const grid = App.el('<div class="z7-card3"></div>');
    pane.appendChild(grid);

    /* --- 金刚石：正四面体网状骨架 --- */
    const cardD = App.el(
      '<div class="panel z7-mineral"><div class="panel-title">金刚石 · 正四面体空间网状结构</div></div>');
    // 真实金刚石立方晶胞：8 顶点 + 6 面心 + 内部 4 原子（体对角线 1/4 与 3/4 处）
    const cornersD = [];
    for (let i = 0; i < 8; i++) cornersD.push([i & 1, (i >> 1) & 1, (i >> 2) & 1]);
    const facesD = [[0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5],
                    [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5]];
    const innerD = [[0.25, 0.25, 0.25], [0.25, 0.75, 0.75],
                    [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];
    const shellD = cornersD.concat(facesD);          // 顶点 + 面心（14 个）
    const nodesD = shellD.concat(innerD).map(p => [p[0] - 0.5, p[1] - 0.5, p[2] - 0.5]);
    // 键：每个内部原子与最近的 4 个顶点/面心原子相连（正四面体配位）
    const edgesD = [];
    innerD.forEach((iv, k) => {
      const near = shellD
        .map((sv, i) => [Math.hypot(iv[0] - sv[0], iv[1] - sv[1], iv[2] - sv[2]), i])
        .sort((a, b) => a[0] - b[0]).slice(0, 4);
      near.forEach(n => edgesD.push([14 + k, n[1]]));
    });
    // 晶胞线框 12 条棱
    const cubeEdges = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      let diff = 0;
      for (let a = 0; a < 3; a++) if (((i >> a) & 1) !== ((j >> a) & 1)) diff++;
      if (diff === 1) cubeEdges.push([cornersD[i], cornersD[j]]);
    }
    makeStage(cardD, 210, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2 + 4, sc = h / 2.2;
      const rot = p => rotX(rotY(p, t * 0.4), 0.42);
      const pts = nodesD.map(p => proj(rot(p), cx, cy, sc));
      // 晶胞线框（淡色虚线）
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(148,163,184,0.38)';
      ctx.lineWidth = 1;
      cubeEdges.forEach(e => {
        const a = proj(rot([e[0][0] - 0.5, e[0][1] - 0.5, e[0][2] - 0.5]), cx, cy, sc);
        const b = proj(rot([e[1][0] - 0.5, e[1][1] - 0.5, e[1][2] - 0.5]), cx, cy, sc);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      });
      ctx.restore();
      // 共价键（青色辉光）
      ctx.lineWidth = 1.5;
      ctx.shadowColor = CYAN; ctx.shadowBlur = 6;
      edgesD.forEach(e => {
        const a = pts[e[0]], b = pts[e[1]];
        ctx.strokeStyle = 'rgba(34,211,238,' + (0.25 + 0.35 * Math.min(a[2], b[2])) + ')';
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      });
      ctx.shadowBlur = 0;
      // 原子：顶点/面心青色，内部原子浅色区分
      pts.forEach((p, i) => {
        const inner = i >= 14;
        ctx.fillStyle = inner ? '#e0f7ff' : CYAN;
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p[0], p[1], Math.max((inner ? 4.6 : 3.4) * p[2], 1.3), 0, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }, '金刚石晶胞 · 每个碳原子与相邻 4 个碳原子相连');
    cardD.appendChild(App.el(
      '<div class="z7-mbody"><p><span class="tag cyan">物理性质</span> 无色透明、正八面体形状的固体，<b>是天然存在的最硬的物质</b>。</p>' +
      '<p><span class="tag amber">用途</span> 钻探机的钻头、玻璃刀、裁玻璃，以及璀璨夺目的装饰品——钻石。</p></div>'));
    grid.appendChild(cardD);

    /* --- 石墨：层状结构 --- */
    const cardG = App.el(
      '<div class="panel z7-mineral"><div class="panel-title">石墨 · 层状结构</div></div>');
    // 真实二维六方（蜂窝）晶格：基矢 a1、a2，每个原胞含 A、B 两个原子，键长 d
    const gD = 15;
    const gA1 = [gD * 1.5, gD * Math.sqrt(3) / 2];
    const gA2 = [gD * 1.5, -gD * Math.sqrt(3) / 2];
    const gAtoms = [];
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const ax = i * gA1[0] + j * gA2[0], ay = i * gA1[1] + j * gA2[1];
      gAtoms.push([ax, ay]);            // A 子格
      gAtoms.push([ax + gD, ay]);       // B 子格
    }
    // 键：距离恰为键长 d 的原子对相连（每个碳原子连 3 个相邻原子，键角 120°）
    const gBonds = [];
    for (let i = 0; i < gAtoms.length; i++) for (let j = i + 1; j < gAtoms.length; j++) {
      if (Math.abs(Math.hypot(gAtoms[i][0] - gAtoms[j][0], gAtoms[i][1] - gAtoms[j][1]) - gD) < 0.5) {
        gBonds.push([i, j]);
      }
    }
    // AB 堆垛：第 2 层相对第 1、3 层平移半个周期
    const gAB = [(gA1[0] + gA2[0]) / 2, 0];
    makeStage(cardG, 210, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, squash = 0.34;   // y 压扁模拟俯视透视
      for (let layer = 0; layer < 3; layer++) {
        const cy = h / 2 - 54 + layer * 54;
        const slide = Math.sin(t * 0.7 + layer * 2.1) * 7;   // 层间易滑动
        const off = layer === 1 ? gAB : [0, 0];
        const pt = gAtoms.map(p => [
          cx + (p[0] + off[0]) + slide,
          cy + (p[1] + off[1]) * squash
        ]);
        // 层间淡虚线：暗示层间作用力弱
        if (layer > 0) {
          ctx.save();
          ctx.setLineDash([3, 5]);
          ctx.strokeStyle = 'rgba(148,163,184,0.22)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(34, cy - 27); ctx.lineTo(w - 10, cy - 27); ctx.stroke();
          ctx.restore();
        }
        ctx.strokeStyle = 'rgba(148,163,184,0.6)';
        ctx.lineWidth = 1;
        gBonds.forEach(e => {
          const a = pt[e[0]], b = pt[e[1]];
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        });
        pt.forEach(p => {
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, 7); ctx.fill();
        });
        ctx.fillStyle = FAINT; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('第 ' + (layer + 1) + ' 层', 10, cy + 4);
      }
    }, '蜂窝状平面层 · 层与层之间作用力很小，容易滑动');
    cardG.appendChild(App.el(
      '<div class="z7-mbody"><p><span class="tag cyan">物理性质</span> 深灰色、有金属光泽而不透明的细鳞片状固体；<b>质软、有滑腻感，具有优良的导电性</b>。</p>' +
      '<p><span class="tag amber">用途</span> 制铅笔芯、干电池的电极、电车的电刷，还可作润滑剂。</p></div>'));
    grid.appendChild(cardG);

    /* --- C60：足球状笼形分子 --- */
    const cardC = App.el(
      '<div class="panel z7-mineral"><div class="panel-title">C₆₀ · 足球状分子</div></div>');
    // 真实截角二十面体：正二十面体 12 顶点（黄金比例）→ 30 棱各截 1/3、2/3 → 60 顶点
    const PHI = (1 + Math.sqrt(5)) / 2;
    const icoV = [
      [0, 1, PHI], [0, 1, -PHI], [0, -1, PHI], [0, -1, -PHI],
      [1, PHI, 0], [1, -PHI, 0], [-1, PHI, 0], [-1, -PHI, 0],
      [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1]
    ];
    const icoE = [];   // 正二十面体 30 条棱（棱长 = 2）
    for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
      const dd = Math.hypot(icoV[i][0] - icoV[j][0], icoV[i][1] - icoV[j][1], icoV[i][2] - icoV[j][2]);
      if (Math.abs(dd - 2) < 1e-6) icoE.push([i, j]);
    }
    const c60V = [];   // 60 个截断点，投影到单位球面
    icoE.forEach(e => {
      [1 / 3, 2 / 3].forEach(f => {
        const a = icoV[e[0]], b = icoV[e[1]];
        const p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
        const l = Math.hypot(p[0], p[1], p[2]);
        c60V.push([p[0] / l, p[1] / l, p[2] / l]);
      });
    });
    // 棱①（六边形-六边形，青色）：同一原棱上的两个截断点相连，共 30 条
    const edgesHex = icoE.map((e, k) => [2 * k, 2 * k + 1]);
    // 棱②（五边形的棱，品红）：围绕同一原顶点的 5 个截断点连成五边形，12×5 = 60 条
    const edgesPen = [];
    for (let v = 0; v < 12; v++) {
      const around = [];
      icoE.forEach((e, k) => {
        if (e[0] === v) around.push(2 * k);        // 1/3 端靠近 e[0]
        else if (e[1] === v) around.push(2 * k + 1); // 2/3 端靠近 e[1]
      });
      const pairs = [];
      for (let i = 0; i < around.length; i++) for (let j = i + 1; j < around.length; j++) {
        const a = c60V[around[i]], b = c60V[around[j]];
        pairs.push([Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), around[i], around[j]]);
      }
      pairs.sort((x, y) => x[0] - y[0]);
      pairs.slice(0, 5).forEach(pr => edgesPen.push([pr[1], pr[2]]));   // 最短的 5 对即五边形棱
    }
    makeStage(cardC, 210, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2 + 4, sc = h / 2.9;
      const pts = c60V.map(p => proj(rotX(rotY(p, t * 0.35), 0.35), cx, cy, sc));
      ctx.lineWidth = 1;
      // 六边形的棱：青色
      edgesHex.forEach(e => {
        const a = pts[e[0]], b = pts[e[1]];
        ctx.strokeStyle = 'rgba(34,211,238,' + (0.14 + 0.4 * Math.min(a[2], b[2])) + ')';
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      });
      // 五边形的棱：品红
      ctx.shadowColor = MAGENTA; ctx.shadowBlur = 4;
      edgesPen.forEach(e => {
        const a = pts[e[0]], b = pts[e[1]];
        ctx.strokeStyle = 'rgba(244,114,182,' + (0.18 + 0.45 * Math.min(a[2], b[2])) + ')';
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      });
      ctx.shadowBlur = 0;
      pts.forEach(p => {
        ctx.fillStyle = MAGENTA;
        ctx.shadowColor = MAGENTA; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(2.2 * p[2], 1), 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
      });
    }, '由 60 个碳原子构成的分子，形似足球');
    cardC.appendChild(App.el(
      '<div class="z7-mbody"><p><span class="tag magenta">构成</span> 每个 C₆₀ 分子由 <b>60 个碳原子</b> 构成，结构形似足球，性质稳定。</p>' +
      '<p><span class="tag amber">用途</span> 在超导、催化、材料科学等领域有广阔的应用前景（初步了解）。</p></div>'));
    grid.appendChild(cardC);

    /* --- 木炭 / 活性炭 小卡 + 要点卡 --- */
    const row = App.el(
      '<div class="layout-2col" style="margin-top:22px">' +
      '<div class="console-card accent"><div class="card-label">木炭与活性炭 · 吸附性</div>' +
      '<p style="line-height:1.9;font-size:14.5px;color:var(--text-dim)">木炭和活性炭具有<b style="color:var(--cyan)">疏松多孔的结构</b>，因此具有<b style="color:var(--cyan)">吸附性</b>：活性炭的吸附作用比木炭更强。可用于冰箱除味剂、防毒面具的滤毒罐、净水器中吸附色素和异味。<br><span class="tag green" style="margin-top:6px">吸附过程没有生成新物质，属于物理变化</span></p></div>' +
      '<div class="console-card accent-m"><div class="card-label">要点 · 同种元素组成的单质为何性质迥异？</div>' +
      '<p style="line-height:1.9;font-size:14.5px;color:var(--text-dim)">金刚石和石墨物理性质差异巨大的原因：<b style="color:var(--magenta)">碳原子的排列方式不同</b>。但二者都是由碳元素组成的单质，化学性质相似——完全燃烧都生成二氧化碳：</p>' +
      '<div style="margin-top:8px">' + App.eq('C + O₂', 'CO₂', '点燃') + '</div></div>' +
      '</div>');
    pane.appendChild(row);
  }

  /* ============================================================
     Tab 2 · CO₂ 的制取
     ============================================================ */
  function buildTab2(pane) {
    const layout = App.el('<div class="layout-2col"></div>');
    pane.appendChild(layout);
    const left = App.el('<div></div>');
    const right = App.el('<div class="console"></div>');
    layout.appendChild(left); layout.appendChild(right);

    const state = { step1: null, step2: null };

    /* ---- 第一步：发生装置 ---- */
    const p1 = App.el('<div class="panel"><div class="panel-title">第 1 步 · 选择气体发生装置</div>' +
      '<p class="z7-hint">药品是<b>大理石（或石灰石）</b>与<b>稀盐酸</b>——想一想反应物的状态和反应条件，该选哪套发生装置？</p></div>');
    const optRow1 = App.el('<div class="z7-optrow"></div>');
    const fb1 = App.el('<div class="z7-feedback"></div>');
    p1.appendChild(optRow1); p1.appendChild(fb1);

    const genOpts = [
      { key: 'A', name: '固固加热型', desc: '大试管 + 酒精灯，试管口略向下倾斜（适合加热高锰酸钾制氧气）', ok: false,
        why: '不对哦。本反应是固体与液体在常温下反应，不需要加热，用不到酒精灯。' },
      { key: 'B', name: '固液不加热型', desc: '锥形瓶 + 长颈漏斗 + 导管（适合大理石与稀盐酸）', ok: true,
        why: '正确！大理石（固体）与稀盐酸（液体）在常温下就能反应，不需要加热，所以选固液不加热型。' },
      { key: 'C', name: '固液加热型', desc: '锥形瓶 + 长颈漏斗 + 酒精灯（画蛇添足的错配）', ok: false,
        why: '反应物确实是固体+液体，但该反应常温即可发生，加热属于多余操作，还浪费能源。' }
    ];
    genOpts.forEach(o => {
      const b = App.el('<button class="z7-opt"><span class="z7-optkey">' + o.key + '</span>' +
        '<span class="z7-optname">' + o.name + '</span><span class="z7-optdesc">' + o.desc + '</span></button>');
      b.addEventListener('click', () => {
        optRow1.querySelectorAll('.z7-opt').forEach(x => x.classList.remove('ok', 'bad'));
        b.classList.add(o.ok ? 'ok' : 'bad');
        fb1.className = 'z7-feedback ' + (o.ok ? 'good' : 'oops');
        fb1.innerHTML = o.why;
        state.step1 = o.ok;
        checkDone();
      });
      optRow1.appendChild(b);
    });
    left.appendChild(p1);

    /* ---- 第二步：收集装置 ---- */
    const p2 = App.el('<div class="panel" style="margin-top:18px"><div class="panel-title">第 2 步 · 选择气体收集装置</div>' +
      '<p class="z7-hint">CO₂ <b>能溶于水且与水反应</b>，密度与空气相比如何？该用哪种收集方法？</p></div>');
    const optRow2 = App.el('<div class="z7-optrow"></div>');
    const fb2 = App.el('<div class="z7-feedback"></div>');
    p2.appendChild(optRow2); p2.appendChild(fb2);

    const colOpts = [
      { key: 'A', name: '向上排空气法', desc: '集气瓶正放，导管伸到集气瓶底部', ok: true,
        why: '正确！CO₂ 密度比空气大，沉在下方，把空气从瓶口向上排出，所以用向上排空气法收集。' },
      { key: 'B', name: '向下排空气法', desc: '集气瓶倒放（适合密度比空气小的气体）', ok: false,
        why: '不对。向下排空气法用于收集密度比空气小的气体（如氢气）；CO₂ 密度比空气大，会沉在瓶底跑掉，收集不到。' },
      { key: 'C', name: '排水法', desc: '集气瓶装满水倒置在水槽中', ok: false,
        why: '不对。CO₂ 能溶于水，且能与水反应生成碳酸，所以一般不用排水法收集。' }
    ];
    colOpts.forEach(o => {
      const b = App.el('<button class="z7-opt"><span class="z7-optkey">' + o.key + '</span>' +
        '<span class="z7-optname">' + o.name + '</span><span class="z7-optdesc">' + o.desc + '</span></button>');
      b.addEventListener('click', () => {
        optRow2.querySelectorAll('.z7-opt').forEach(x => x.classList.remove('ok', 'bad'));
        b.classList.add(o.ok ? 'ok' : 'bad');
        fb2.className = 'z7-feedback ' + (o.ok ? 'good' : 'oops');
        fb2.innerHTML = o.why;
        state.step2 = o.ok;
        checkDone();
      });
      optRow2.appendChild(b);
    });
    left.appendChild(p2);

    /* ---- 制取动画（两步全对后出现） ---- */
    const animPanel = App.el('<div class="panel z7-hidden" style="margin-top:18px">' +
      '<div class="panel-title">实验室制取二氧化碳 · 固液不加热 + 向上排空气法</div></div>');
    left.appendChild(animPanel);
    let animOn = false;

    function checkDone() {
      if (state.step1 && state.step2 && !animOn) {
        animOn = true;
        animPanel.classList.remove('z7-hidden');
        animPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    makeStage(animPanel, 400, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cycle = (t % 9) / 9;                 // 9 秒一轮
      const fill = Math.min(cycle * 1.35, 1);    // 集气瓶内气体液位 0→1
      const fx = w * 0.30, fy = h * 0.78;        // 锥形瓶中心
      // 锥形瓶
      ctx.strokeStyle = 'rgba(226,232,240,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx - 22, fy - 130); ctx.lineTo(fx - 22, fy - 95);
      ctx.lineTo(fx - 85, fy); ctx.lineTo(fx + 85, fy);
      ctx.lineTo(fx + 22, fy - 95); ctx.lineTo(fx + 22, fy - 130);
      ctx.stroke();
      // 瓶内液体
      ctx.fillStyle = 'rgba(34,211,238,0.22)';
      ctx.beginPath();
      ctx.moveTo(fx - 62, fy - 34); ctx.lineTo(fx + 62, fy - 34);
      ctx.lineTo(fx + 83, fy - 2); ctx.lineTo(fx - 83, fy - 2);
      ctx.closePath(); ctx.fill();
      // 石灰石碎块
      ctx.fillStyle = '#94a3b8';
      [[-40, -12], [-10, -8], [22, -13], [45, -9], [5, -18]].forEach((p, i) => {
        ctx.beginPath(); ctx.arc(fx + p[0], fy + p[1], 7 + (i % 3), 0, 7); ctx.fill();
      });
      // 气泡
      ctx.fillStyle = 'rgba(224,247,255,0.85)';
      for (let i = 0; i < 16; i++) {
        const seed = i * 37.7;
        const bt = (t * 0.7 + i * 0.13) % 1;
        const bx = fx - 50 + ((seed * 7) % 100) + Math.sin(t * 3 + i) * 3;
        const by = fy - 10 - bt * 26;
        ctx.beginPath(); ctx.arc(bx, by, 1.6 + bt * 2.2, 0, 7); ctx.fill();
      }
      // 长颈漏斗
      ctx.strokeStyle = 'rgba(226,232,240,0.8)';
      ctx.beginPath();
      ctx.moveTo(fx - 10, fy - 168); ctx.lineTo(fx + 12, fy - 168);
      ctx.lineTo(fx + 4, fy - 132); ctx.lineTo(fx + 4, fy - 55);
      ctx.moveTo(fx + 4, fy - 132); ctx.lineTo(fx - 2, fy - 132); ctx.lineTo(fx - 2, fy - 55);
      ctx.stroke();
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('稀盐酸', fx + 34, fy - 155);
      ctx.fillText('大理石', fx - 66, fy + 26);
      // 导管：锥形瓶 → 集气瓶
      const jx = w * 0.72, jy = h * 0.74;        // 集气瓶中心
      ctx.strokeStyle = 'rgba(34,211,238,0.75)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fx + 14, fy - 118); ctx.lineTo(fx + 14, fy - 150);
      ctx.lineTo(jx + 40, fy - 150); ctx.lineTo(jx + 40, jy - 40);
      ctx.lineTo(jx + 8, jy - 40); ctx.lineTo(jx + 8, jy + 66);
      ctx.stroke();
      // 导管内气流箭头
      const flow = (t * 90) % 300;
      ctx.fillStyle = CYAN;
      const ax = fx + 14 + Math.min(flow, (jx + 40) - (fx + 14));
      ctx.beginPath(); ctx.arc(ax, fy - 150, 3, 0, 7); ctx.fill();
      // 集气瓶（正放）
      ctx.strokeStyle = 'rgba(226,232,240,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(jx - 46, jy - 96); ctx.lineTo(jx - 46, jy + 66);
      ctx.lineTo(jx + 46, jy + 66); ctx.lineTo(jx + 46, jy - 96);
      ctx.stroke();
      // 瓶内 CO₂ 自下而上聚集
      if (fill > 0) {
        const gh = 150 * fill;
        const g = ctx.createLinearGradient(0, jy + 66 - gh, 0, jy + 66);
        g.addColorStop(0, 'rgba(34,211,238,0.05)');
        g.addColorStop(1, 'rgba(34,211,238,0.4)');
        ctx.fillStyle = g;
        ctx.fillRect(jx - 44, jy + 66 - gh, 92, gh);
        ctx.fillStyle = 'rgba(224,247,255,0.6)';
        ctx.fillRect(jx - 44, jy + 66 - gh, 92, 1.5);
      }
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif';
      ctx.fillText('集气瓶（向上排空气法）', jx, jy + 88);
      ctx.fillText('锥形瓶', fx, fy + 26 + 22);
      if (fill >= 1) {
        ctx.fillStyle = GREEN; ctx.font = 'bold 14px sans-serif';
        ctx.fillText('✔ 已集满——用燃着的木条放瓶口检验', jx, jy - 110);
      }
    }, '气泡汩汩冒出，CO₂ 沿导管自瓶底向上充满集气瓶');

    /* ---- 右侧 console ---- */
    right.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">药品</div>' +
      '<div class="card-value small" style="color:var(--text)">大理石（或石灰石） + 稀盐酸</div>' +
      '<p style="margin-top:8px;line-height:1.8;font-size:13.5px;color:var(--text-dim)">⚠ 不能用稀硫酸：反应生成的<b style="color:var(--amber)">硫酸钙微溶于水</b>，会覆盖在大理石表面，阻止反应继续进行。</p></div>'));
    right.appendChild(App.el(
      '<div class="console-card"><div class="card-label">反应原理</div>' +
      '<div style="margin-top:4px">' + App.eq('CaCO₃ + 2HCl', 'CaCl₂ + H₂O + CO₂↑') + '</div></div>'));
    right.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">验满方法</div>' +
      '<p style="line-height:1.8;font-size:14px;color:var(--text-dim)">将<b style="color:var(--amber)">燃着的木条</b>放在<b style="color:var(--amber)">集气瓶口</b>，若木条熄灭，证明二氧化碳已经集满。</p></div>'));
    right.appendChild(App.el(
      '<div class="console-card accent-m"><div class="card-label">检验方法</div>' +
      '<p style="line-height:1.8;font-size:14px;color:var(--text-dim)">把气体通入<b style="color:var(--magenta)">澄清石灰水</b>中，若石灰水变浑浊，证明该气体是二氧化碳。</p>' +
      '<div style="margin-top:6px">' + App.eq('CO₂ + Ca(OH)₂', 'CaCO₃↓ + H₂O') + '</div></div>'));
  }

  /* ============================================================
     Tab 3 · CO₂ 的性质（三个实验小剧场）
     ============================================================ */
  function buildTab3(pane) {

    /* ---- 实验① 倾倒二氧化碳灭火 ---- */
    const p1 = App.el('<div class="panel"><div class="panel-title">实验① · 倾倒二氧化碳（阶梯蜡烛）</div></div>');
    pane.appendChild(p1);
    makeStage(p1, 360, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cyc = (t % 10) / 10;                     // 10 秒一轮
      const level = Math.min(cyc * 1.5, 1);          // 烧杯内 CO₂ 液位
      const bx = w * 0.52, by = h * 0.86, bw = Math.min(w * 0.42, 420), bh = h * 0.66;
      // 大烧杯
      ctx.strokeStyle = 'rgba(226,232,240,0.8)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx - bw / 2, by - bh); ctx.lineTo(bx - bw / 2, by);
      ctx.lineTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2, by - bh);
      ctx.stroke();
      // 台阶（高低两支蜡烛）
      const stepW = bw * 0.26;
      ctx.fillStyle = 'rgba(148,163,184,0.25)';
      ctx.fillRect(bx + bw / 2 - stepW, by - bh * 0.28, stepW, bh * 0.28);
      // 蜡烛：左低右高
      const c1 = { x: bx - bw * 0.22, base: by, top: by - bh * 0.34 };
      const c2 = { x: bx + bw / 2 - stepW / 2, base: by - bh * 0.28, top: by - bh * 0.28 - bh * 0.30 };
      [c1, c2].forEach(c => {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(c.x - 7, c.top, 14, c.base - c.top);
        ctx.fillStyle = FAINT;
        ctx.fillRect(c.x - 7, c.top, 14, 4);
      });
      // CO₂ 液位
      if (level > 0) {
        const gh = bh * 0.92 * level;
        const g = ctx.createLinearGradient(0, by - gh, 0, by);
        g.addColorStop(0, 'rgba(34,211,238,0.03)');
        g.addColorStop(1, 'rgba(34,211,238,0.33)');
        ctx.fillStyle = g;
        ctx.fillRect(bx - bw / 2 + 2, by - gh, bw - 4, gh);
      }
      const surfaceY = by - bh * 0.92 * level;
      // 火焰：液位没过烛芯即熄灭
      const f1y = c1.top, f2y = c2.top;
      if (level < 0.99 && surfaceY > f1y - 4) flameShape(ctx, c1.x, f1y - 2, 1, t, AMBER);
      else if (surfaceY <= f1y - 4 && level < 0.99) { /* 已灭 */ }
      if (surfaceY > f2y - 4 && level < 0.99) flameShape(ctx, c2.x, f2y - 2, 1, t, AMBER);
      // 熄灭提示
      ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      if (surfaceY <= f1y - 4 && surfaceY > f2y - 4) {
        ctx.fillStyle = RED;
        ctx.fillText('下层蜡烛先熄灭', c1.x, f1y - 34);
        // 轻烟
        ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c1.x, f1y - 4);
        ctx.quadraticCurveTo(c1.x + 6 * Math.sin(t * 2), f1y - 16, c1.x - 3, f1y - 28);
        ctx.stroke();
      }
      if (surfaceY <= f2y - 4 && level >= 0.99) {
        ctx.fillStyle = RED;
        ctx.fillText('上层蜡烛后熄灭', c2.x, f2y - 34);
      }
      // 倾倒动作：左上小烧杯倒 CO₂
      const px = bx - bw / 2 - 70, py = by - bh - 30;
      ctx.save();
      ctx.translate(px, py); ctx.rotate(-0.7);
      ctx.strokeStyle = 'rgba(226,232,240,0.8)'; ctx.lineWidth = 2;
      ctx.strokeRect(-26, -34, 52, 60);
      ctx.fillStyle = 'rgba(34,211,238,0.35)';
      ctx.fillRect(-24, -6, 48, 30);
      ctx.restore();
      // CO₂ 流
      ctx.strokeStyle = 'rgba(34,211,238,0.55)'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px + 34, py + 20);
      ctx.quadraticCurveTo(px + 70, py + 60, bx - bw / 2 + 16, by - bh + 26);
      ctx.stroke();
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('沿烧杯壁慢慢倾倒 CO₂', px + 20, py - 48);
    }, '下层的蜡烛先熄灭，上层的蜡烛后熄灭');
    p1.appendChild(App.el(
      '<div class="z7-exp"><p><span class="tag cyan">现象</span> 下层的蜡烛先熄灭，上层的蜡烛后熄灭。</p>' +
      '<p><span class="tag amber">结论</span> 二氧化碳<b>密度比空气大</b>（物理性质），<b>不能燃烧，也不支持燃烧</b>（化学性质）→ 可用于<b>灭火</b>。</p></div>'));

    /* ---- 实验② 与水的反应（石蕊试液） ---- */
    const p2 = App.el('<div class="panel" style="margin-top:20px"><div class="panel-title">实验② · 二氧化碳与水的反应（紫色石蕊试液）</div></div>');
    pane.appendChild(p2);
    const st2 = { phase: 0, prog: 0 };   // 0 紫(初始) 1 变红中/红 2 加热变紫中
    makeStage(p2, 320, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      if (st2.phase === 1) st2.prog = Math.min(st2.prog + 0.006, 1);
      if (st2.phase === 3) st2.prog = Math.max(st2.prog - 0.008, 0);
      const k = st2.prog;
      // 颜色：紫 #a855f7 → 红 #ef4444
      const rC = Math.round(168 + (239 - 168) * k);
      const gC = Math.round(85 + (68 - 85) * k);
      const bC = Math.round(247 + (68 - 247) * k);
      const liq = 'rgba(' + rC + ',' + gC + ',' + bC + ',0.75)';
      const tx = w / 2, ty = h * 0.88, tw = 74, th = h * 0.62;
      // 试管
      ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2, ty - th);
      ctx.lineTo(tx - tw / 2, ty - 14);
      ctx.arc(tx, ty - 14, tw / 2, Math.PI, 0, true);
      ctx.lineTo(tx + tw / 2, ty - th);
      ctx.stroke();
      // 液体
      ctx.fillStyle = liq;
      ctx.beginPath();
      const lh = th * 0.62;
      ctx.moveTo(tx - tw / 2 + 3, ty - lh);
      ctx.lineTo(tx - tw / 2 + 3, ty - 14);
      ctx.arc(tx, ty - 14, tw / 2 - 3, Math.PI, 0, true);
      ctx.lineTo(tx + tw / 2 - 3, ty - lh);
      ctx.closePath(); ctx.fill();
      // 液面
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(tx - tw / 2 + 3, ty - lh, tw - 6, 2);
      // 气泡（通 CO₂ 或加热时）
      if (st2.phase === 1 || st2.phase === 3) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 12; i++) {
          const bt = (t * 0.9 + i * 0.19) % 1;
          const bx2 = tx - 24 + (i * 41) % 48 + Math.sin(t * 4 + i) * 2;
          const by2 = ty - 20 - bt * (lh - 24);
          ctx.beginPath(); ctx.arc(bx2, by2, 1.4 + bt * 2, 0, 7); ctx.fill();
        }
      }
      // 加热时的酒精灯
      if (st2.phase === 3) {
        const lx = tx, ly = ty + 52;
        ctx.fillStyle = 'rgba(148,163,184,0.4)';
        ctx.beginPath(); ctx.ellipse(lx, ly, 26, 16, 0, 0, 7); ctx.fill();
        flameShape(ctx, lx, ly - 12, 0.9, t, AMBER);
      }
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(st2.prog < 0.05 ? '紫色石蕊试液' : (st2.prog > 0.95 ? '溶液变成了红色' : '颜色变化中…'), tx, ty - th - 12);
    }, '紫色 → 红色 →（加热）→ 紫色');
    const btnRow2 = App.el('<div class="btn-row" style="margin-top:12px"></div>');
    const bIn = App.el('<button class="btn btn-primary">① 通入 CO₂</button>');
    const bHeat = App.el('<button class="btn" disabled>② 加热变红的溶液</button>');
    const msg2 = App.el('<div class="z7-eqline"></div>');
    bIn.addEventListener('click', () => {
      if (st2.phase !== 0) return;
      st2.phase = 1;
      bIn.disabled = true; bHeat.disabled = false;
      msg2.innerHTML = '<span class="tag cyan">方程式</span> ' + App.eq('CO₂ + H₂O', 'H₂CO₃') +
        ' <span class="z7-note">生成的碳酸使紫色石蕊试液变红</span>';
    });
    bHeat.addEventListener('click', () => {
      if (st2.phase !== 1 || st2.prog < 0.95) return;
      st2.phase = 3;
      bHeat.disabled = true;
      msg2.innerHTML = '<span class="tag amber">方程式</span> ' + App.eq('H₂CO₃', 'H₂O + CO₂↑') +
        ' <span class="z7-note">碳酸不稳定，受热分解，溶液又变回紫色</span>';
      const timer = setInterval(() => {
        if (st2.prog <= 0) { st2.phase = 0; bIn.disabled = false; clearInterval(timer); }
      }, 120);
    });
    btnRow2.appendChild(bIn); btnRow2.appendChild(bHeat);
    p2.appendChild(btnRow2); p2.appendChild(msg2);
    p2.appendChild(App.el(
      '<div class="z7-exp"><p><span class="tag cyan">现象</span> 紫色石蕊试液变成红色；加热后，红色溶液又变回紫色。</p>' +
      '<p><span class="tag amber">结论</span> 二氧化碳与水反应生成<b>碳酸</b>，碳酸能使紫色石蕊试液变红；碳酸很不稳定，容易分解成二氧化碳和水。</p></div>'));

    /* ---- 实验③ 与石灰水反应 ---- */
    const p3 = App.el('<div class="panel" style="margin-top:20px"><div class="panel-title">实验③ · 二氧化碳与澄清石灰水的反应</div></div>');
    pane.appendChild(p3);
    const st3 = { on: false, prog: 0 };
    makeStage(p3, 320, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      if (st3.on) st3.prog = Math.min(st3.prog + 0.004, 1);
      const tx = w / 2, ty = h * 0.88, tw = 74, th = h * 0.62;
      const k = st3.prog;
      // 试管
      ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2, ty - th);
      ctx.lineTo(tx - tw / 2, ty - 14);
      ctx.arc(tx, ty - 14, tw / 2, Math.PI, 0, true);
      ctx.lineTo(tx + tw / 2, ty - th);
      ctx.stroke();
      // 石灰水：澄清 → 浑浊
      const lh = th * 0.62;
      const alpha = 0.18 + k * 0.55;
      ctx.fillStyle = 'rgba(226,232,240,' + alpha + ')';
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2 + 3, ty - lh);
      ctx.lineTo(tx - tw / 2 + 3, ty - 14);
      ctx.arc(tx, ty - 14, tw / 2 - 3, Math.PI, 0, true);
      ctx.lineTo(tx + tw / 2 - 3, ty - lh);
      ctx.closePath(); ctx.fill();
      // 白色沉淀颗粒
      if (k > 0.15) {
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(k, 0.9) + ')';
        for (let i = 0; i < 40 * k; i++) {
          const px2 = tx - 26 + (i * 53 % 52);
          const py2 = ty - 16 - ((i * 97) % Math.max(lh * 0.8, 10)) * (1 - k * 0.35) - k * 4;
          ctx.beginPath(); ctx.arc(px2, py2, 1.6, 0, 7); ctx.fill();
        }
      }
      // 导管 + 气泡
      if (st3.on) {
        ctx.strokeStyle = 'rgba(34,211,238,0.8)'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2 - 70, ty - th - 20);
        ctx.lineTo(tx - 8, ty - th - 20); ctx.lineTo(tx - 8, ty - 30);
        ctx.stroke();
        ctx.fillStyle = 'rgba(224,247,255,0.8)';
        for (let i = 0; i < 10; i++) {
          const bt = (t * 0.8 + i * 0.21) % 1;
          ctx.beginPath();
          ctx.arc(tx - 8 + Math.sin(t * 3 + i) * 3, ty - 32 - bt * (lh - 20), 1.5 + bt * 2, 0, 7);
          ctx.fill();
        }
      }
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(k < 0.05 ? '澄清石灰水' : (k > 0.9 ? '石灰水变浑浊（生成白色沉淀）' : '逐渐变浑浊…'), tx, ty - th - 12);
    }, '澄清石灰水变浑浊');
    const btnRow3 = App.el('<div class="btn-row" style="margin-top:12px"></div>');
    const bGas = App.el('<button class="btn btn-primary">通入 CO₂</button>');
    const bReset3 = App.el('<button class="btn btn-ghost">重置</button>');
    bGas.addEventListener('click', () => { st3.on = true; });
    bReset3.addEventListener('click', () => { st3.on = false; st3.prog = 0; });
    btnRow3.appendChild(bGas); btnRow3.appendChild(bReset3);
    p3.appendChild(btnRow3);
    p3.appendChild(App.el(
      '<div class="z7-eqline"><span class="tag magenta">方程式</span> ' + App.eq('CO₂ + Ca(OH)₂', 'CaCO₃↓ + H₂O') +
      ' <span class="z7-note">这是检验二氧化碳的方法</span></div>' +
      '<div class="z7-exp"><p><span class="tag cyan">现象</span> 澄清石灰水变浑浊（生成白色沉淀）。</p></div>'));

    /* ---- 底部要点卡 ---- */
    pane.appendChild(App.el(
      '<div class="console-card accent" style="margin-top:20px"><div class="card-label">要点 · CO₂ 的功与过</div>' +
      '<p style="line-height:2;font-size:14.5px;color:var(--text-dim)">' +
      '① CO₂ 本身<b style="color:var(--cyan)">无毒</b>，但<b style="color:var(--cyan)">不能供给呼吸</b>——进入久未开启的菜窖、干涸的深井前，要先做<b style="color:var(--amber)">灯火试验</b>。<br>' +
      '② 固态二氧化碳叫<b style="color:var(--cyan)">干冰</b>，升华时吸收大量的热 → 可用作制冷剂、用于人工降雨。<br>' +
      '③ CO₂ 是主要的<b style="color:var(--amber)">温室气体</b>：人和动植物的呼吸、燃料的燃烧都产生 CO₂，而绿色植物的光合作用消耗 CO₂。' +
      '</p></div>'));
  }

  /* ============================================================
     Tab 4 · 一氧化碳
     ============================================================ */
  function buildTab4(pane) {
    const grid = App.el('<div class="z7-card3"></div>');
    pane.appendChild(grid);

    grid.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">可燃性</div>' +
      '<p style="line-height:1.9;font-size:14px;color:var(--text-dim)">CO 燃烧时产生<b style="color:var(--cyan)">蓝色火焰</b>，放出大量的热，可作气体燃料。</p>' +
      '<div style="margin:8px 0">' + App.eq('2CO + O₂', '2CO₂', '点燃') + '</div>' +
      '<p style="line-height:1.9;font-size:13.5px;color:var(--text-dim)">⚠ CO 是可燃性气体，与空气混合点燃可能发生爆炸，<b style="color:var(--amber)">点燃前必须验纯</b>。</p></div>'));

    grid.appendChild(App.el(
      '<div class="console-card accent-m"><div class="card-label">还原性</div>' +
      '<p style="line-height:1.9;font-size:14px;color:var(--text-dim)">CO 能夺取氧化铜中的氧，具有<b style="color:var(--magenta)">还原性</b>：</p>' +
      '<div style="margin:8px 0">' + App.eq('CO + CuO', 'Cu + CO₂', '△') + '</div>' +
      '<p style="line-height:1.9;font-size:13.5px;color:var(--text-dim)">现象：黑色粉末逐渐变成红色，生成的气体使澄清石灰水变浑浊。冶金工业上利用 CO 的还原性炼铁（还原剂）。</p></div>'));

    grid.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">毒性 ☠</div>' +
      '<p style="line-height:1.9;font-size:14px;color:var(--text-dim)">CO <b style="color:var(--red)">极易与血液中的血红蛋白结合</b>，使血红蛋白不能再与氧气结合，造成生物体内缺氧，严重时会危及生命——这就是"煤气中毒"。</p>' +
      '<p style="line-height:1.9;font-size:13.5px;color:var(--text-dim)">CO <b style="color:var(--amber)">无色无味</b>，中毒不易察觉。冬天用煤炉取暖时一定要装烟囱，并注意室内通风。</p></div>'));

    /* ---- CO 还原 CuO 实验动画 ---- */
    const p = App.el('<div class="panel" style="margin-top:20px"><div class="panel-title">实验 · 一氧化碳还原氧化铜</div></div>');
    pane.appendChild(p);
    const st = { on: false, prog: 0 };
    makeStage(p, 380, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      if (st.on) st.prog = Math.min(st.prog + 0.0035, 1);
      const k = st.prog;
      const y0 = h * 0.5;                          // 玻璃管水平线
      const x0 = w * 0.10, x1 = w * 0.62;          // 玻璃管范围
      // 硬质玻璃管
      ctx.strokeStyle = 'rgba(226,232,240,0.8)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0 - 22); ctx.lineTo(x1, y0 - 22);
      ctx.moveTo(x0, y0 + 22); ctx.lineTo(x1, y0 + 22);
      ctx.stroke();
      // CuO 粉末床（左黑 → 右红渐变推进）
      const bedX0 = w * 0.20, bedX1 = w * 0.52;
      const front = bedX0 + (bedX1 - bedX0) * k;
      for (let x = bedX0; x < bedX1; x += 5) {
        const turned = x < front - 14;
        const edge = Math.abs(x - front) < 14 && st.on;
        ctx.fillStyle = turned ? 'rgba(239,68,68,0.85)'
          : edge ? 'rgba(244,114,182,' + (0.5 + 0.3 * Math.sin(t * 6)) + ')'
          : 'rgba(30,32,38,0.95)';
        ctx.fillRect(x, y0 + 2, 5, 16);
      }
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(k < 0.05 ? 'CuO（黑色粉末）' : k > 0.95 ? 'Cu（红色）' : '黑色粉末逐渐变红',
        (bedX0 + bedX1) / 2, y0 + 40);
      // 加热火焰（酒精灯在粉末下方）
      if (st.on) {
        const lx = w * 0.30, ly = y0 + 78;
        ctx.fillStyle = 'rgba(148,163,184,0.4)';
        ctx.beginPath(); ctx.ellipse(lx, ly, 24, 15, 0, 0, 7); ctx.fill();
        flameShape(ctx, lx, y0 + 24, 1.1, t, AMBER);
        ctx.fillStyle = FAINT; ctx.font = '12px sans-serif';
        ctx.fillText('△', lx, ly + 26);
      }
      // CO 进气箭头（左）
      if (st.on) {
        ctx.strokeStyle = CYAN; ctx.lineWidth = 2;
        const ax0 = x0 - 40 + (t * 40) % 26;
        ctx.beginPath(); ctx.moveTo(ax0, y0); ctx.lineTo(ax0 + 14, y0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax0 + 14, y0); ctx.lineTo(ax0 + 8, y0 - 4);
        ctx.moveTo(ax0 + 14, y0); ctx.lineTo(ax0 + 8, y0 + 4); ctx.stroke();
        ctx.fillStyle = CYAN; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('CO', x0 - 44, y0 - 12);
      }
      // 导管 → 澄清石灰水（右侧试管）
      const tx = w * 0.78, ty = h * 0.78, tw = 60, th = h * 0.42;
      ctx.strokeStyle = 'rgba(226,232,240,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y0); ctx.lineTo(x1 + 30, y0); ctx.lineTo(x1 + 30, y0 - 60);
      ctx.lineTo(tx, y0 - 60); ctx.lineTo(tx, ty - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2, ty - th);
      ctx.lineTo(tx - tw / 2, ty - 12);
      ctx.arc(tx, ty - 12, tw / 2, Math.PI, 0, true);
      ctx.lineTo(tx + tw / 2, ty - th);
      ctx.stroke();
      // 石灰水浑浊程度
      const lh2 = th * 0.55;
      ctx.fillStyle = 'rgba(226,232,240,' + (0.15 + k * 0.5) + ')';
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2 + 3, ty - lh2);
      ctx.lineTo(tx - tw / 2 + 3, ty - 12);
      ctx.arc(tx, ty - 12, tw / 2 - 3, Math.PI, 0, true);
      ctx.lineTo(tx + tw / 2 - 3, ty - lh2);
      ctx.closePath(); ctx.fill();
      if (st.on) {
        ctx.fillStyle = 'rgba(224,247,255,0.8)';
        for (let i = 0; i < 8; i++) {
          const bt = (t * 0.8 + i * 0.23) % 1;
          ctx.beginPath();
          ctx.arc(tx + Math.sin(t * 3 + i) * 3, ty - 24 - bt * (lh2 - 14), 1.4 + bt * 1.8, 0, 7);
          ctx.fill();
        }
      }
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(k > 0.3 ? '石灰水变浑浊' : '澄清石灰水', tx, ty + 18);
      // 尾气处理：管口点燃的蓝色火焰
      if (st.on) {
        flameShape(ctx, tx + tw / 2 + 16, ty - th - 2, 0.8, t, '#60a5fa');
        ctx.strokeStyle = 'rgba(96,165,250,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tx + tw / 2, ty - th + 6); ctx.lineTo(tx + tw / 2 + 16, ty - th + 2); ctx.stroke();
        ctx.fillStyle = '#60a5fa'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('尾气点燃处理', tx + tw / 2 + 26, ty - th - 8);
      }
    }, '黑色粉末变红 · 石灰水变浑浊 · 尾气要点燃');
    const btnRow = App.el('<div class="btn-row" style="margin-top:12px"></div>');
    const bGo = App.el('<button class="btn btn-primary">通入 CO 并加热</button>');
    const bRe = App.el('<button class="btn btn-ghost">重置</button>');
    bGo.addEventListener('click', () => { st.on = true; });
    bRe.addEventListener('click', () => { st.on = false; st.prog = 0; });
    btnRow.appendChild(bGo); btnRow.appendChild(bRe);
    p.appendChild(btnRow);
    p.appendChild(App.el(
      '<div class="z7-exp" style="margin-top:12px"><p><span class="tag cyan">操作顺序</span> 先通入 CO 排尽玻璃管内的空气，再加热（防止 CO 与空气混合受热爆炸）；实验结束先撤酒精灯，继续通 CO 至玻璃管冷却。</p>' +
      '<p><span class="tag amber">尾气处理</span> 尾气中含有未反应的 CO，<b>必须点燃或收集</b>，防止污染空气。</p></div>'));
  }

  /* ============================================================
     Tab 5 · 碳家族转化关系图
     ============================================================ */
  function buildTab5(pane) {
    const p = App.el('<div class="panel"><div class="panel-title">碳家族转化关系图 · 点击有向边查看对应方程式</div></div>');
    pane.appendChild(p);

    const NODES = {
      C:    { x: 120, y: 250, label: 'C' },
      CO:   { x: 320, y: 400, label: 'CO' },
      CO2:  { x: 460, y: 170, label: 'CO₂' },
      H2CO3:{ x: 720, y: 90,  label: 'H₂CO₃' },
      CaCO3:{ x: 730, y: 310, label: 'CaCO₃' },
      CaO:  { x: 700, y: 440, label: 'CaO' }
    };
    const R = 36;

    function edgeD(a, b, bend) {
      const A = NODES[a], B = NODES[b];
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
      const sx = A.x + ux * (R + 3), sy = A.y + uy * (R + 3);
      const ex = B.x - ux * (R + 8), ey = B.y - uy * (R + 8);
      const mx = (sx + ex) / 2 + nx * bend, my = (sy + ey) / 2 + ny * bend;
      return { d: 'M' + sx + ',' + sy + ' Q' + mx + ',' + my + ' ' + ex + ',' + ey,
               lx: mx + nx * 6, ly: my + ny * 6 };
    }

    const EDGES = [
      { a: 'C', b: 'CO2', bend: -50, label: '充分燃烧',
        eqs: [['C + O₂', 'CO₂', '点燃']], note: '氧气充足时，碳完全燃烧生成 CO₂' },
      { a: 'C', b: 'CO', bend: -35, label: '不充分燃烧',
        eqs: [['2C + O₂', '2CO', '点燃']], note: '氧气不充足时，碳不完全燃烧生成 CO' },
      { a: 'CO', b: 'CO2', bend: -40, label: '燃烧',
        eqs: [['2CO + O₂', '2CO₂', '点燃']], note: 'CO 燃烧（或还原金属氧化物）转化为 CO₂' },
      { a: 'CO2', b: 'CO', bend: -40, label: '与碳高温反应',
        eqs: [['CO₂ + C', '2CO', '高温']], note: 'CO₂ 通过炽热的碳层被还原为 CO（吸热反应）' },
      { a: 'CO2', b: 'C', bend: -70, label: '光合作用 · 初步了解', dash: true,
        eqs: [['2Mg + CO₂', '2MgO + C', '点燃']],
        note: '绿色植物的光合作用把 CO₂ 转化为有机物和 O₂；镁条能在 CO₂ 中燃烧置换出碳（初步了解）' },
      { a: 'CO2', b: 'H2CO3', bend: -28, label: '与水反应',
        eqs: [['CO₂ + H₂O', 'H₂CO₃']], note: 'CO₂ 溶于水生成碳酸' },
      { a: 'H2CO3', b: 'CO2', bend: -28, label: '分解',
        eqs: [['H₂CO₃', 'H₂O + CO₂↑']], note: '碳酸不稳定，容易分解' },
      { a: 'CO2', b: 'CaCO3', bend: -24, label: '与石灰水反应',
        eqs: [['CO₂ + Ca(OH)₂', 'CaCO₃↓ + H₂O']], note: '检验 CO₂ 的方法' },
      { a: 'CaCO3', b: 'CO2', bend: -30, label: '高温煅烧',
        eqs: [['CaCO₃', 'CaO + CO₂↑', '高温']], note: '工业上煅烧石灰石制取生石灰和 CO₂' },
      { a: 'CaCO3', b: 'CO2', bend: -85, label: '与稀盐酸反应',
        eqs: [['CaCO₃ + 2HCl', 'CaCl₂ + H₂O + CO₂↑']], note: '实验室制取 CO₂ 的原理' },
      { a: 'CaCO3', b: 'CaO', bend: -20, label: '高温煅烧',
        eqs: [['CaCO₃', 'CaO + CO₂↑', '高温']], note: '石灰石高温分解得生石灰（CaO）' }
    ];

    let svg = '<svg class="z7-svg" viewBox="0 0 900 500" preserveAspectRatio="xMidYMid meet">';
    svg += '<defs><marker id="z7-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
           '<path d="M0,0 L10,5 L0,10 z" fill="#22d3ee"></path></marker></defs>';
    EDGES.forEach((e, i) => {
      const g = edgeD(e.a, e.b, e.bend);
      svg += '<g class="z7-edge' + (e.dash ? ' dash' : '') + '" data-i="' + i + '">' +
        '<path class="z7-hit" d="' + g.d + '"></path>' +
        '<path class="z7-line" d="' + g.d + '" marker-end="url(#z7-arr)"></path>' +
        '<text class="z7-elabel" x="' + g.lx + '" y="' + g.ly + '">' + e.label + '</text></g>';
    });
    Object.keys(NODES).forEach(k => {
      const n = NODES[k];
      svg += '<g class="z7-node" data-k="' + k + '">' +
        '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + R + '"></circle>' +
        '<text x="' + n.x + '" y="' + (n.y + 6) + '">' + n.label + '</text></g>';
    });
    svg += '</svg>';
    p.appendChild(App.el(svg));

    const eqCard = App.el('<div class="z7-eqcard"><span style="color:var(--text-faint);font-size:13px">👆 点击图中任意一条有向边，查看转化条件与化学方程式</span></div>');
    p.appendChild(eqCard);
    const svgEl = p.querySelector('svg');
    svgEl.addEventListener('click', ev => {
      const g = ev.target.closest('.z7-edge');
      if (!g) return;
      const e = EDGES[+g.dataset.i];
      svgEl.querySelectorAll('.z7-edge').forEach(x => x.classList.remove('sel'));
      g.classList.add('sel');
      eqCard.innerHTML = '<div class="card-label">' + NODES[e.a].label + ' → ' + NODES[e.b].label +
        ' · ' + e.label + '</div>' +
        e.eqs.map(q => '<div style="margin:6px 0">' + App.eq(q[0], q[1], q[2]) + '</div>').join('') +
        '<p style="margin-top:6px;font-size:13.5px;color:var(--text-dim);line-height:1.8">' + e.note + '</p>';
    });

    /* ---- 碳的化学性质卡 ---- */
    pane.appendChild(App.el(
      '<div class="console-card accent" style="margin-top:20px"><div class="card-label">碳单质的化学性质</div>' +
      '<p style="line-height:2.1;font-size:14.5px;color:var(--text-dim)">' +
      '① <b style="color:var(--cyan)">常温下，碳的化学性质不活泼</b>——用墨（炭黑制成）书写或绘制的字画，年深日久也不褪色。<br>' +
      '② <b style="color:var(--cyan)">可燃性</b>（点燃）：氧气充足 → ' + App.eq('C + O₂', 'CO₂', '点燃') +
      ' ；氧气不充足 → ' + App.eq('2C + O₂', '2CO', '点燃') + '<br>' +
      '③ <b style="color:var(--cyan)">高温下有还原性</b>：' + App.eq('C + 2CuO', '2Cu + CO₂↑', '高温') +
      ' ——现象：黑色粉末逐渐变成红色，生成的气体使澄清石灰水变浑浊；可用于冶金工业。' +
      '</p></div>'));
  }

  /* ============================================================
     模块导出
     ============================================================ */
  window.Zone8 = {
    desc: '碳元素能组成<b>金刚石、石墨、C₆₀</b> 等不同单质——它们由同种元素组成，物理性质却差异很大，原因就在于<b>碳原子的排列方式不同</b>。碳的氧化物 CO 和 CO₂ 也只差一个氧原子，性质却天差地别。',

    init(container) {
      const tabs = ['碳的单质', 'CO₂ 的制取', 'CO₂ 的性质', '一氧化碳', '转化关系图'];
      const builders = [buildTab1, buildTab2, buildTab3, buildTab4, buildTab5];

      const bar = App.el('<div class="z7-tabs"></div>');
      container.appendChild(bar);
      const panes = [];
      tabs.forEach((name, i) => {
        const b = App.el('<button class="z7-tab' + (i === 0 ? ' active' : '') + '">' + name + '</button>');
        b.addEventListener('click', () => {
          bar.querySelectorAll('.z7-tab').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          panes.forEach((pg, j) => pg.classList.toggle('z7-hidden', j !== i));
        });
        bar.appendChild(b);
        const pg = App.el('<div class="z7-pane' + (i === 0 ? '' : ' z7-hidden') + '"></div>');
        container.appendChild(pg);
        panes.push(pg);
      });
      builders.forEach((fn, i) => fn(panes[i]));

      container.appendChild(App.el(
        '<div class="takeaway">🕸️ <b>一张网记住碳家族</b>：C、CO、CO₂、H₂CO₃、CaCO₃ 之间的相互转化，是中考化学<b>推断题</b>的常客——尤其 CO 和 CO₂ 的相互转化。把每条边的"条件 + 方程式"记牢，推断题就是送分题。</div>'));
    }
  };
})();
