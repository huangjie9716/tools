/* ============================================================
   ZONE 12 · 盐和化肥（第十一单元 盐 化肥）
   四个二级 Tab：常见的盐 / 复分解反应判定器 / 粗盐提纯 / 化学肥料
   ============================================================ */
(function () {
  'use strict';

  const CYAN = '#22d3ee', MAGENTA = '#f472b6', AMBER = '#fbbf24',
        GREEN = '#34d399', RED = '#f87171', FAINT = '#64748b';

  /* ---------------- 画布舞台辅助（与 zone7 同款约定） ---------------- */
  function makeStage(parent, height, draw, caption) {
    const stage = App.el('<div class="stage z11-stage"></div>');
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
      if (!stage.isConnected) return;
      if (stage.offsetParent !== null && stage.clientWidth > 0) {
        draw(ctx, stage.clientWidth, height, ((now == null ? t0 : now) - t0) / 1000);
      }
      requestAnimationFrame(frame);
    });
    return stage;
  }

  /* ============================================================
     Tab 1 · 常见的盐
     ============================================================ */
  function buildSalts(pane) {
    const grid = App.el('<div class="z11-saltgrid"></div>');
    pane.appendChild(grid);

    const salts = [
      { name: '氯化钠', f: 'NaCl', tag: 'cyan', aka: '食盐的主要成分',
        use: '① 生活中作<b>调味品</b>，腌渍食品（防腐）；<br>② 医疗上配制 <b>0.9% 的生理盐水</b>；<br>③ 农业上用 <b>10%~20% 的食盐溶液选种</b>；<br>④ 工业上作化工原料；冬天还可用作融雪剂。' },
      { name: '碳酸钠', f: 'Na₂CO₃', tag: 'magenta', aka: '俗名：纯碱、苏打',
        use: '<b>水溶液显碱性，但分类上属于盐</b>——"纯碱不是碱"！<br>广泛用于<b>玻璃、造纸、纺织</b>和洗涤剂的生产等。' },
      { name: '碳酸氢钠', f: 'NaHCO₃', tag: 'amber', aka: '俗名：小苏打',
        use: '① 焙制糕点所用的<b>发酵粉</b>的主要成分之一；<br>② 医疗上可<b>治疗胃酸过多</b>；<br>③ 干粉灭火器的重要成分。' },
      { name: '碳酸钙', f: 'CaCO₃', tag: 'green', aka: '大理石、石灰石的主要成分',
        use: '① 重要的<b>建筑材料</b>；<br>② 医疗上用作<b>补钙剂</b>；<br>③ 实验室常用它与稀盐酸反应<b>制取 CO₂</b>。' }
    ];
    salts.forEach(s => {
      grid.appendChild(App.el(
        '<div class="panel z11-salt"><div class="z11-salt-head">' +
        '<span class="z11-salt-name">' + s.name + '</span>' +
        '<span class="z11-salt-f">' + s.f + '</span></div>' +
        '<div style="margin:8px 0 10px"><span class="tag ' + s.tag + '">' + s.aka + '</span></div>' +
        '<p class="z11-salt-use">' + s.use + '</p></div>'));
    });

    /* ---- 碳酸盐/碳酸氢盐与酸反应 ---- */
    const row = App.el('<div class="layout-2col" style="margin-top:22px"></div>');
    pane.appendChild(row);
    const left = App.el('<div class="panel"><div class="panel-title">与酸反应 · 都放出二氧化碳</div></div>');
    left.appendChild(App.el(
      '<div class="z11-eqstack">' +
      '<div>' + App.eq('Na₂CO₃ + 2HCl', '2NaCl + H₂O + CO₂↑') + '</div>' +
      '<div>' + App.eq('NaHCO₃ + HCl', 'NaCl + H₂O + CO₂↑') + '</div>' +
      '<div>' + App.eq('CaCO₃ + 2HCl', 'CaCl₂ + H₂O + CO₂↑') + '</div>' +
      '</div>' +
      '<p style="margin-top:12px;line-height:1.9;font-size:14px;color:var(--text-dim)">规律：<b style="color:var(--cyan)">碳酸根（CO₃²⁻）或碳酸氢根（HCO₃⁻）</b>遇到酸，都会反应放出 CO₂ 气体。</p>'));
    row.appendChild(left);
    row.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">CO₃²⁻ / HCO₃⁻ 的检验方法</div>' +
      '<p style="line-height:2;font-size:14px;color:var(--text-dim)">取少量样品于试管中，滴加<b style="color:var(--cyan)">稀盐酸</b>，若有气泡产生，把生成的气体<b style="color:var(--cyan)">通入澄清石灰水</b>，石灰水<b style="color:var(--cyan)">变浑浊</b>，证明样品中含 CO₃²⁻（或 HCO₃⁻）。</p>' +
      '<div style="margin-top:8px">' + App.eq('CO₂ + Ca(OH)₂', 'CaCO₃↓ + H₂O') + '</div></div>'));

    pane.appendChild(App.el(
      '<div class="console-card accent-m" style="margin-top:20px"><div class="card-label">概念辨析 · 什么是"盐"？</div>' +
      '<p style="line-height:2;font-size:14.5px;color:var(--text-dim)">盐是组成里含有<b style="color:var(--magenta)">金属离子（或铵根离子 NH₄⁺）和酸根离子</b>的化合物。' +
      '生活中的"盐"专指食盐（NaCl），化学中的"盐"却是一<b>大类</b>物质。' +
      '特别记住：<b style="color:var(--amber)">纯碱（Na₂CO₃）不是碱，是盐</b>；水溶液显碱性≠分类上属于碱。</p></div>'));
  }

  /* ============================================================
     Tab 2 · 复分解反应判定器（核心交互）
     ============================================================ */
  const COL_A = [
    { k: 'A1', label: 'Na₂CO₃ 溶液' },
    { k: 'A2', label: 'CuSO₄ 溶液' },
    { k: 'A3', label: 'NaCl 溶液' },
    { k: 'A4', label: '稀盐酸（HCl）' },
    { k: 'A5', label: '稀硫酸（H₂SO₄）' },
    { k: 'A6', label: 'NaOH 溶液' },
    { k: 'A7', label: 'FeCl₃ 溶液' },
    { k: 'A8', label: 'NH₄Cl 溶液' }
  ];
  const COL_B = [
    { k: 'B1', label: 'CaCl₂ 溶液' },
    { k: 'B2', label: 'BaCl₂ 溶液' },
    { k: 'B3', label: 'AgNO₃ 溶液' },
    { k: 'B4', label: 'NaOH 溶液' },
    { k: 'B5', label: 'Na₂CO₃ 溶液' },
    { k: 'B6', label: 'KNO₃ 溶液' },
    { k: 'B7', label: 'K₂SO₄ 溶液' },
    { k: 'B8', label: 'BaCO₃（难溶固体）' }
  ];
  /* type: pptWhite / pptBlue / pptRed / gas / heat / none */
  const REACT = {
    'A1+B1': { ok: true, type: 'pptWhite', eq: ['Na₂CO₃ + CaCl₂', 'CaCO₃↓ + 2NaCl'],
      ph: '产生<b>白色沉淀</b>（CaCO₃）。', why: '交换成分后生成了难溶于水的碳酸钙沉淀。' },
    'A2+B2': { ok: true, type: 'pptWhite', eq: ['CuSO₄ + BaCl₂', 'BaSO₄↓ + CuCl₂'],
      ph: '产生<b>白色沉淀</b>（BaSO₄，它不溶于稀硝酸）。', why: '交换成分后生成了难溶于水的硫酸钡沉淀。' },
    'A3+B3': { ok: true, type: 'pptWhite', eq: ['NaCl + AgNO₃', 'AgCl↓ + NaNO₃'],
      ph: '产生<b>白色沉淀</b>（AgCl，它不溶于稀硝酸）——这也是检验 Cl⁻ 的方法。', why: '交换成分后生成了难溶于水的氯化银沉淀。' },
    'A4+B4': { ok: true, type: 'heat', eq: ['HCl + NaOH', 'NaCl + H₂O'],
      ph: '<b>无明显现象，但放出热量</b>（中和反应）。可借助酚酞试液或温度计证明反应发生了。', why: '交换成分后生成了水。' },
    'A5+B5': { ok: true, type: 'gas', eq: ['H₂SO₄ + Na₂CO₃', 'Na₂SO₄ + H₂O + CO₂↑'],
      ph: '<b>有气泡产生</b>（CO₂）。', why: '交换成分后生成碳酸，碳酸分解出二氧化碳气体和水。' },
    'A2+B4': { ok: true, type: 'pptBlue', eq: ['CuSO₄ + 2NaOH', 'Cu(OH)₂↓ + Na₂SO₄'],
      ph: '产生<b>蓝色絮状沉淀</b>（Cu(OH)₂）。', why: '交换成分后生成了难溶于水的氢氧化铜。' },
    'A7+B4': { ok: true, type: 'pptRed', eq: ['FeCl₃ + 3NaOH', 'Fe(OH)₃↓ + 3NaCl'],
      ph: '产生<b>红褐色沉淀</b>（Fe(OH)₃）。', why: '交换成分后生成了难溶于水的氢氧化铁。' },
    'A8+B4': { ok: true, type: 'gas', eq: ['NH₄Cl + NaOH', 'NaCl + NH₃↑ + H₂O'], cond: '△',
      ph: '放出<b>有刺激性气味的气体</b>（NH₃，氨气）——这是检验铵根离子（NH₄⁺）的方法。', why: '交换成分后生成了氨气和水。' },
    'A4+B8': { ok: true, type: 'gas', eq: ['BaCO₃ + 2HCl', 'BaCl₂ + H₂O + CO₂↑'],
      ph: '白色固体逐渐溶解，<b>有气泡产生</b>（CO₂）——碳酸盐沉淀能溶于酸。', why: '生成了二氧化碳气体和水。' },
    /* ---- 不能反应 ---- */
    'A3+B6': { ok: false, pair: 'NaCl 与 KNO₃',
      ex: 'KCl、NaNO₃', note: '<b>硝酸盐、钾盐、钠盐全部可溶</b>，所以含 Na⁺ / K⁺ / NO₃⁻ 的组合常常不反应。' },
    'A3+B7': { ok: false, pair: 'NaCl 与 K₂SO₄', ex: 'KCl、Na₂SO₄' },
    'A6+B6': { ok: false, pair: 'NaOH 与 KNO₃', ex: 'KOH、NaNO₃',
      note: 'KOH 易溶于水，NaNO₃ 也可溶——钾盐、钠盐、硝酸盐全都溶于水。' },
    'A7+B6': { ok: false, pair: 'FeCl₃ 与 KNO₃', ex: 'Fe(NO₃)₃、KCl' },
    'A8+B7': { ok: false, pair: 'NH₄Cl 与 K₂SO₄', ex: '(NH₄)₂SO₄、KCl' },
    'A6+B7': { ok: false, pair: 'NaOH 与 K₂SO₄', ex: 'KOH、Na₂SO₄' },
    'A4+B2': { ok: false, pair: 'HCl 与 BaCl₂', ex: '还是 HCl 和 BaCl₂',
      note: '两种物质都含 Cl⁻，交换成分等于没交换，当然不反应。' }
  };

  function buildJudge(pane) {
    /* ---- 定义 + 发生条件 ---- */
    const top = App.el('<div class="layout-2col"></div>');
    pane.appendChild(top);
    top.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">定义 · 什么是复分解反应？</div>' +
      '<p style="line-height:2;font-size:14.5px;color:var(--text-dim)">由<b style="color:var(--cyan)">两种化合物互相交换成分，生成另外两种化合物</b>的反应，叫做复分解反应。通式：AB + CD → AD + CB。特点：<b style="color:var(--cyan)">"双交换、价不变"</b>——反应前后各元素的化合价都不变。</p></div>'));
    top.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">发生条件（三者居其一即可）</div>' +
      '<p style="line-height:2;font-size:14.5px;color:var(--text-dim)">只有当生成物中有<b style="color:var(--amber)">沉淀</b>、<b style="color:var(--amber)">气体</b>或<b style="color:var(--amber)">水</b>生成时，复分解反应才能发生。换成离子视角：两种离子若能结合成沉淀、气体或水，就会"牵手离场"，反应得以进行。</p></div>'));

    /* ---- 判定器 ---- */
    const panel = App.el('<div class="panel" style="margin-top:20px">' +
      '<div class="panel-title">混合判定台 · 左右各选一种，点击"混合"判定（共 16 组）</div></div>');
    pane.appendChild(panel);

    const bench = App.el('<div class="z11-bench"></div>');
    panel.appendChild(bench);
    const colA = App.el('<div class="z11-selcol"><div class="z11-selhead">试剂甲</div></div>');
    const colB = App.el('<div class="z11-selcol"><div class="z11-selhead">试剂乙</div></div>');
    const mid = App.el('<div class="z11-mid"></div>');
    bench.appendChild(colA); bench.appendChild(mid); bench.appendChild(colB);

    const state = { a: null, b: null };
    COL_A.forEach(item => {
      const b = App.el('<button class="z11-sel" data-k="' + item.k + '">' + item.label + '</button>');
      b.addEventListener('click', () => {
        colA.querySelectorAll('.z11-sel').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        state.a = item;
        update();
      });
      colA.appendChild(b);
    });
    COL_B.forEach(item => {
      const b = App.el('<button class="z11-sel" data-k="' + item.k + '">' + item.label + '</button>');
      b.addEventListener('click', () => {
        colB.querySelectorAll('.z11-sel').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        state.b = item;
        update();
      });
      colB.appendChild(b);
    });

    const mixBtn = App.el('<button class="btn btn-primary z11-mixbtn" disabled>混 合</button>');
    const counter = App.el('<div class="z11-counter">已判定 0 / 16 组</div>');
    mid.appendChild(mixBtn); mid.appendChild(counter);

    /* ---- 结果区：试管动画 + 判定结论 ---- */
    const result = App.el('<div class="z11-result z11-hidden"></div>');
    panel.appendChild(result);
    const animBox = App.el('<div class="z11-anim"></div>');
    const verdict = App.el('<div class="z11-verdict"></div>');
    result.appendChild(animBox); result.appendChild(verdict);

    /* 试管动画状态：type = pptWhite / pptBlue / pptRed / gas / heat / clear */
    const anim = { type: 'clear', prog: 0 };
    const PPT_COLOR = { pptWhite: '226,232,240', pptBlue: '59,130,246', pptRed: '180,83,9' };
    makeStage(animBox, 260, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      if (anim.type !== 'clear') anim.prog = Math.min(anim.prog + 0.005, 1);
      const k = anim.prog;
      const tx = w / 2, ty = h * 0.92, tw = 92, th = h * 0.74;
      /* 试管 */
      ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2, ty - th);
      ctx.lineTo(tx - tw / 2, ty - 16);
      ctx.arc(tx, ty - 16, tw / 2, Math.PI, 0, true);
      ctx.lineTo(tx + tw / 2, ty - th);
      ctx.stroke();
      /* 液体 */
      const lh = th * 0.66;
      function liquidPath() {
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2 + 3, ty - lh);
        ctx.lineTo(tx - tw / 2 + 3, ty - 16);
        ctx.arc(tx, ty - 16, tw / 2 - 3, Math.PI, 0, true);
        ctx.lineTo(tx + tw / 2 - 3, ty - lh);
        ctx.closePath();
      }
      const isPpt = anim.type.indexOf('ppt') === 0;
      ctx.fillStyle = isPpt
        ? 'rgba(' + PPT_COLOR[anim.type] + ',' + (0.10 + k * 0.28) + ')'
        : 'rgba(34,211,238,0.14)';
      liquidPath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(tx - tw / 2 + 3, ty - lh, tw - 6, 2);
      /* 沉淀颗粒：先飘落，再沉积 */
      if (isPpt && k > 0.05) {
        const col = PPT_COLOR[anim.type];
        for (let i = 0; i < 46; i++) {
          const seed = i * 53.3;
          const fall = Math.min(k * 1.6 - (i % 7) * 0.06, 1);
          if (fall <= 0) continue;
          const px = tx - tw / 2 + 12 + (seed % (tw - 24));
          const py0 = ty - lh + 6 + (seed * 7 % (lh * 0.4));
          const py = py0 + fall * (ty - 20 - py0 - (i % 5) * 3);
          ctx.fillStyle = 'rgba(' + col + ',' + (0.5 + 0.4 * fall) + ')';
          ctx.beginPath(); ctx.arc(px + Math.sin(t * 2 + i) * (1 - fall) * 3, py, 1.6 + (i % 3) * 0.5, 0, 7); ctx.fill();
        }
        /* 底部沉积层 */
        if (k > 0.5) {
          const dh = (k - 0.5) * 2 * 14;
          ctx.fillStyle = 'rgba(' + PPT_COLOR[anim.type] + ',0.75)';
          ctx.beginPath();
          ctx.moveTo(tx - tw / 2 + 4, ty - 16 - dh);
          ctx.lineTo(tx - tw / 2 + 4, ty - 16);
          ctx.arc(tx, ty - 16, tw / 2 - 4, Math.PI, 0, true);
          ctx.lineTo(tx + tw / 2 - 4, ty - 16 - dh);
          ctx.closePath(); ctx.fill();
        }
      }
      /* 气泡 */
      if (anim.type === 'gas' && k > 0.05) {
        ctx.fillStyle = 'rgba(224,247,255,0.85)';
        for (let i = 0; i < 18; i++) {
          const bt = (t * 0.75 + i * 0.11) % 1;
          const bx = tx - 30 + (i * 37 % 60) + Math.sin(t * 3 + i) * 2.5;
          const by = ty - 22 - bt * (lh - 14);
          ctx.beginPath(); ctx.arc(bx, by, 1.4 + bt * 2.2, 0, 7); ctx.fill();
        }
      }
      /* 放热：温度微光 + 上升热气 */
      if (anim.type === 'heat' && k > 0.05) {
        ctx.save();
        ctx.strokeStyle = 'rgba(251,191,36,' + (0.25 + 0.2 * Math.sin(t * 4)) + ')';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const hx = tx - 20 + i * 20;
          ctx.beginPath();
          ctx.moveTo(hx, ty - lh - 8);
          ctx.quadraticCurveTo(hx + 6 * Math.sin(t * 3 + i), ty - lh - 22, hx - 3, ty - lh - 36);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = AMBER; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('触摸试管外壁：发热', tx, ty - th - 14);
      }
      /* 无现象 */
      if (anim.type === 'clear' || (anim.type === 'none')) {
        ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('液体依然澄清，无明显现象', tx, ty - th - 14);
      }
    }, '混合后试管内的现象（动画模拟）');

    const seen = {};
    function update() {
      mixBtn.disabled = !(state.a && state.b);
    }
    mixBtn.addEventListener('click', () => {
      if (!state.a || !state.b) return;
      const key = state.a.k + '+' + state.b.k;
      const r = REACT[key];
      result.classList.remove('z11-hidden');
      if (!r) {
        anim.type = 'none'; anim.prog = 1;
        verdict.className = 'z11-verdict z11-v-none';
        verdict.innerHTML = '<div class="z11-v-title">🤔 这一组不在本题库内</div>' +
          '<p>题库共收录 16 组（能反应与不能反应各半左右）。换一组试试——提示：含 <b>Na⁺ / K⁺ / NO₃⁻</b> 的组合多半不反应；含 <b>Ag⁺ 与 Cl⁻</b>、<b>Ba²⁺ 与 SO₄²⁻</b>、<b>CO₃²⁻ 与 Ca²⁺</b>、<b>H⁺ 与 OH⁻</b>、<b>H⁺ 与 CO₃²⁻</b> 的组合多半能反应。</p>';
        return;
      }
      if (!seen[key]) { seen[key] = true; counter.textContent = '已判定 ' + Object.keys(seen).length + ' / 16 组'; }
      if (r.ok) {
        anim.type = r.type; anim.prog = 0;
        verdict.className = 'z11-verdict z11-v-ok';
        verdict.innerHTML = '<div class="z11-v-title">✅ 能反应</div>' +
          '<div style="margin:8px 0">' + App.eq(r.eq[0], r.eq[1], r.cond) + '</div>' +
          '<p><span class="tag cyan">现象</span> ' + r.ph + '</p>' +
          '<p style="margin-top:6px"><span class="tag amber">判定依据</span> ' + r.why + '</p>';
      } else {
        anim.type = 'none'; anim.prog = 1;
        verdict.className = 'z11-verdict z11-v-no';
        verdict.innerHTML = '<div class="z11-v-title">❌ 不能反应</div>' +
          '<p>' + r.pair + '互相交换成分后得到 <b>' + r.ex + '</b>，<b>没有沉淀、气体或水生成</b>，所以复分解反应不能发生。</p>' +
          (r.note ? '<p style="margin-top:6px">💡 ' + r.note + '</p>' : '');
      }
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    /* ---- 沉淀速查 + 盐的化学性质 ---- */
    const pptList = [
      ['BaSO₄↓', '白色，不溶于稀硝酸'], ['AgCl↓', '白色，不溶于稀硝酸'],
      ['CaCO₃↓', '白色，溶于酸并放出 CO₂'], ['BaCO₃↓', '白色，溶于酸并放出 CO₂'],
      ['Mg(OH)₂↓', '白色，溶于酸'], ['Cu(OH)₂↓', '蓝色絮状'],
      ['Fe(OH)₃↓', '红褐色']
    ];
    let pptHtml = '<div class="z11-pptgrid">';
    pptList.forEach(p => {
      pptHtml += '<div class="z11-ppt"><span class="z11-ppt-f">' + p[0] + '</span><span class="z11-ppt-d">' + p[1] + '</span></div>';
    });
    pptHtml += '</div>';
    pane.appendChild(App.el(
      '<div class="console-card accent-m" style="margin-top:20px"><div class="card-label">常见沉淀速查（中考必背）</div>' +
      pptHtml +
      '<p style="margin-top:12px;line-height:1.9;font-size:13.5px;color:var(--text-dim)">溶解性口诀（节选）：<b style="color:var(--magenta)">"钾钠铵盐硝酸盐，都能溶于水中间"</b>——所以含 K⁺、Na⁺、NH₄⁺、NO₃⁻ 的物质都可溶，判定反应时先看它们。</p></div>'));

    pane.appendChild(App.el(
      '<div class="console-card accent" style="margin-top:20px"><div class="card-label">盐的化学性质（四条通性）</div>' +
      '<div class="z11-props">' +
      '<div><span class="tag cyan">① 金属 + 盐</span>金属活动性顺序里，<b>前换后</b>（K、Ca、Na 除外）：' + App.eq('Fe + CuSO₄', 'FeSO₄ + Cu') + '（置换反应）</div>' +
      '<div><span class="tag cyan">② 酸 + 盐</span>' + App.eq('CaCO₃ + 2HCl', 'CaCl₂ + H₂O + CO₂↑') + '</div>' +
      '<div><span class="tag cyan">③ 碱 + 盐</span>（反应物都要可溶）' + App.eq('2NaOH + CuSO₄', 'Cu(OH)₂↓ + Na₂SO₄') + '</div>' +
      '<div><span class="tag cyan">④ 盐 + 盐</span>（反应物都要可溶）' + App.eq('NaCl + AgNO₃', 'AgCl↓ + NaNO₃') + '</div>' +
      '</div>' +
      '<p style="margin-top:10px;font-size:13.5px;color:var(--text-dim);line-height:1.8">②③④ 都属于<b style="color:var(--cyan)">复分解反应</b>，能不能发生，统统用"沉淀、气体或水"来判定。</p></div>'));
  }

  /* ============================================================
     Tab 3 · 粗盐提纯
     ============================================================ */
  function buildPurify(pane) {
    const steps = [
      { n: '① 溶解', glass: '搅拌，加速溶解',
        body: '用托盘天平称取一定量粗盐，用药匙把粗盐逐渐加入盛有水的烧杯中，边加边用玻璃棒搅拌，直到粗盐不再溶解为止。<br><span class="tag cyan">玻璃棒</span> <b>搅拌，加速溶解</b>。' },
      { n: '② 过滤', glass: '引流',
        body: '把滤纸折叠放入漏斗，组装好过滤装置，将粗盐水沿玻璃棒慢慢倒入漏斗中过滤。<br><span class="tag cyan">玻璃棒</span> <b>引流</b>，防止液体溅出。<br>⚠ 操作要领"一贴、二低、三靠"，见下方规范卡。' },
      { n: '③ 蒸发', glass: '搅拌，防止液滴飞溅',
        body: '把滤液倒入蒸发皿，用酒精灯加热，并用玻璃棒不断搅拌。当蒸发皿中<b>出现较多固体时停止加热</b>，利用余热把水分蒸干。<br><span class="tag cyan">玻璃棒</span> <b>搅拌，防止局部温度过高，造成液滴飞溅</b>。' },
      { n: '④ 计算产率', glass: '转移固体',
        body: '用玻璃棒把蒸发皿中的精盐转移到纸上，称量后计算产率。<br><span class="tag cyan">玻璃棒</span> <b>转移固体</b>。<br><span class="tag amber">产率</span> <b>精盐质量 ÷ 粗盐质量 × 100%</b>。' }
    ];
    const wrap = App.el('<div class="z11-steps"></div>');
    pane.appendChild(wrap);
    steps.forEach((s, i) => {
      const card = App.el(
        '<div class="z11-step' + (i === 0 ? ' open' : '') + '">' +
        '<button class="z11-step-head"><span class="z11-step-n">' + s.n + '</span>' +
        '<span class="z11-step-g">玻璃棒：' + s.glass + '</span></button>' +
        '<div class="z11-step-body"><p>' + s.body + '</p></div></div>');
      card.querySelector('.z11-step-head').addEventListener('click', () => {
        card.classList.toggle('open');
      });
      wrap.appendChild(card);
    });

    const row = App.el('<div class="layout-2col" style="margin-top:20px"></div>');
    pane.appendChild(row);
    row.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">过滤操作规范 · 一贴、二低、三靠</div>' +
      '<div class="z11-filter">' +
      '<div><b>一贴</b>滤纸紧贴漏斗内壁</div>' +
      '<div><b>二低</b>① 滤纸边缘低于漏斗边缘；② 漏斗内液面低于滤纸边缘</div>' +
      '<div><b>三靠</b>① 倾倒液体的烧杯口紧靠玻璃棒；② 玻璃棒下端轻靠三层滤纸一边；③ 漏斗下端管口紧靠烧杯内壁</div>' +
      '</div></div>'));
    row.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">产率偏低的常见原因（误差分析）</div>' +
      '<p style="line-height:2.1;font-size:14px;color:var(--text-dim)">' +
      '① 粗盐<b style="color:var(--amber)">溶解不充分</b>就过滤；<br>' +
      '② 过滤时液体<b style="color:var(--amber)">溅出</b>（或滤纸破损后又损失了滤液）；<br>' +
      '③ 蒸发时没有用玻璃棒搅拌，<b style="color:var(--amber)">液滴飞溅</b>；<br>' +
      '④ 转移精盐时有<b style="color:var(--amber)">撒落、残留</b>。<br>' +
      '<span style="color:var(--text-faint);font-size:13px">反之，若产率偏高，可能是蒸发不充分、精盐中还含有水分。</span></p></div>'));
  }

  /* ============================================================
     Tab 4 · 化学肥料
     ============================================================ */
  function buildFert(pane) {
    const grid = App.el('<div class="z11-fertgrid"></div>');
    pane.appendChild(grid);
    const ferts = [
      { cls: 'accent', name: '氮肥', motto: '氮长叶', tag: 'cyan',
        body: '作用：促进植物茎、叶生长茂盛，叶色浓绿。<br><b>缺氮症状</b>：植株矮小瘦弱，<b style="color:var(--amber)">叶片发黄</b>。<br><span style="color:var(--text-faint)">常见：尿素 CO(NH₂)₂（含氮量高）、碳酸氢铵 NH₄HCO₃、氯化铵 NH₄Cl、硫酸铵 (NH₄)₂SO₄、硝酸铵 NH₄NO₃。</span>' },
      { cls: 'accent-m', name: '磷肥', motto: '磷长根和果', tag: 'magenta',
        body: '作用：促进作物根系发达，增强<b>抗寒、抗旱</b>能力，促进作物提早成熟、穗粒增多、籽粒饱满。<br><b>缺磷症状</b>：生长迟缓，产量降低。<br><span style="color:var(--text-faint)">常见：磷矿粉、过磷酸钙。</span>' },
      { cls: 'accent-a', name: '钾肥', motto: '钾长茎', tag: 'amber',
        body: '作用：使茎秆健壮，增强<b>抗病虫害和抗倒伏</b>能力。<br><b>缺钾症状</b>：茎秆软弱，容易倒伏，叶片边缘发黄。<br><span style="color:var(--text-faint)">常见：KCl、K₂SO₄、草木灰（主要成分 K₂CO₃，水溶液显碱性）。</span>' }
    ];
    ferts.forEach(f => {
      grid.appendChild(App.el(
        '<div class="console-card ' + f.cls + ' z11-fert">' +
        '<div class="z11-fert-head"><span class="z11-fert-name">' + f.name + '</span>' +
        '<span class="tag ' + f.tag + '">' + f.motto + '</span></div>' +
        '<p style="line-height:2;font-size:14px;color:var(--text-dim)">' + f.body + '</p></div>'));
    });

    pane.appendChild(App.el(
      '<div class="console-card accent" style="margin-top:18px"><div class="card-label">复合肥料</div>' +
      '<p style="line-height:2;font-size:14.5px;color:var(--text-dim)">同时含有氮、磷、钾中<b style="color:var(--cyan)">两种或三种</b>营养元素的化肥，叫做复合肥料。如 <b style="color:var(--cyan)">KNO₃（硝酸钾，含 K 和 N）</b>、NH₄H₂PO₄（磷酸二氢铵，含 N 和 P）等。注意：尿素 CO(NH₂)₂ 只含氮一种营养元素，<b>不是</b>复合肥。</p></div>'));

    /* ---- 铵态氮肥检验互动 ---- */
    const p = App.el('<div class="panel" style="margin-top:20px"><div class="panel-title">铵态氮肥的检验 · 铵根离子（NH₄⁺）的鉴别</div>' +
      '<p class="z11-hint">取少量化肥样品，与<b>熟石灰 Ca(OH)₂</b> 混合研磨，闻一闻——如果有刺激性气味，就是铵态氮肥。动手试试：</p></div>');
    pane.appendChild(p);
    const btnRow = App.el('<div class="btn-row"></div>');
    const bGo = App.el('<button class="btn btn-primary">与熟石灰混合研磨</button>');
    const bRe = App.el('<button class="btn btn-ghost">重置</button>');
    btnRow.appendChild(bGo); btnRow.appendChild(bRe);
    p.appendChild(btnRow);
    const out = App.el('<div class="z11-nh4 z11-hidden"></div>');
    p.appendChild(out);
    bGo.addEventListener('click', () => {
      out.classList.remove('z11-hidden');
      out.innerHTML =
        '<div style="margin:12px 0">' + App.eq('2NH₄Cl + Ca(OH)₂', 'CaCl₂ + 2NH₃↑ + 2H₂O', '△') + '</div>' +
        '<p style="line-height:1.9;font-size:14px;color:var(--text-dim)"><span class="tag cyan">现象</span> 放出<b>有刺激性气味的氨气（NH₃）</b>——湿润的红色石蕊试纸放在上方会变蓝。</p>' +
        '<p style="margin-top:8px;line-height:1.9;font-size:14px;color:var(--text-dim)"><span class="tag amber">使用铁律</span> <b>铵态氮肥不能与碱性物质（如熟石灰、草木灰）混合施用</b>，否则会放出氨气、降低肥效。</p>';
    });
    bRe.addEventListener('click', () => { out.classList.add('z11-hidden'); out.innerHTML = ''; });

    pane.appendChild(App.el(
      '<div class="console-card accent-m" style="margin-top:20px"><div class="card-label">化肥与环境</div>' +
      '<p style="line-height:2;font-size:14px;color:var(--text-dim)">化肥对提高农作物产量有重要作用，但要<b style="color:var(--magenta)">合理施用</b>：过量施用会造成土壤污染、土壤酸化板结，还会随雨水流入江河湖泊，使水中氮、磷含量过高，引起<b style="color:var(--magenta)">水体富营养化</b>（初步了解），导致藻类等水生植物疯长、水质恶化。</p></div>'));
  }

  /* ============================================================
     模块导出
     ============================================================ */
  window.Zone12 = {
    desc: '盐是组成里含有<b>金属离子（或铵根离子）和酸根离子</b>的化合物。<b>纯碱不是碱，是盐</b>！复分解反应能不能发生，就看生成物里有没有<b>沉淀、气体或水</b>。',

    init(container) {
      const tabs = ['常见的盐', '复分解判定器', '粗盐提纯', '化学肥料'];
      const builders = [buildSalts, buildJudge, buildPurify, buildFert];

      const bar = App.el('<div class="z11-tabs"></div>');
      container.appendChild(bar);
      const panes = [];
      tabs.forEach((name, i) => {
        const b = App.el('<button class="z11-tab' + (i === 0 ? ' active' : '') + '">' + name + '</button>');
        b.addEventListener('click', () => {
          bar.querySelectorAll('.z11-tab').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          panes.forEach((pg, j) => pg.classList.toggle('z11-hidden', j !== i));
        });
        bar.appendChild(b);
        const pg = App.el('<div class="z11-pane' + (i === 0 ? '' : ' z11-hidden') + '"></div>');
        container.appendChild(pg);
        panes.push(pg);
      });
      builders.forEach((fn, i) => fn(panes[i]));

      /* ---- 学霸加餐 ---- */
      container.appendChild(App.el(
        '<details class="pro-box"><summary>学霸加餐 · 鉴别、共存与除杂</summary><div class="pro-body">' +

        '<div class="pro-item"><span class="pro-tag">压轴题型</span><b>只用一种试剂鉴别</b>：鉴别 Na₂CO₃、NaCl、BaCl₂ 三种无色溶液——选<span class="hl">稀硫酸</span>。分别取样滴加：<b>产生气泡</b>的是 Na₂CO₃（Na₂CO₃ + H₂SO₄ ═ Na₂SO₄ + H₂O + CO₂↑）；<b>产生白色沉淀</b>的是 BaCl₂（BaCl₂ + H₂SO₄ ═ BaSO₄↓ + 2HCl）；<b>无现象</b>的是 NaCl。解题套路：选的试剂要和三种物质分别产生"气泡 / 沉淀 / 无现象"三种不同结果。</div>' +

        '<div class="pro-item"><span class="pro-tag">易错辨析</span><b>离子共存入门</b>：能互相结合生成<b>沉淀、气体或水</b>的离子，不能在溶液中大量共存。高频"死对头"：<span class="hl">H⁺ 与 CO₃²⁻</span>（→ CO₂↑ + H₂O）、<span class="hl">H⁺ 与 OH⁻</span>（→ H₂O）、<span class="hl">OH⁻ 与 Cu²⁺</span>（→ 蓝色沉淀）、<span class="hl">Ba²⁺ 与 SO₄²⁻</span>（→ 白色沉淀）、<span class="hl">Ag⁺ 与 Cl⁻</span>（→ 白色沉淀）。隐含条件解读："<b>pH = 1 的溶液</b>"＝溶液中含大量 H⁺，凡能与 H⁺ 反应的离子（CO₃²⁻、OH⁻ 等）一律出局；"<b>无色溶液</b>"＝Cu²⁺（蓝）、Fe³⁺（黄）、Fe²⁺（浅绿）直接排除。</div>' +

        '<div class="pro-item"><span class="pro-tag">解题套路</span><b>除杂三原则</b>：<b>不增</b>（不引入新杂质）、<b>不减</b>（不损耗主要物质）、<b>易分</b>（生成物容易分离）。经典例题：① NaCl 中混有少量 Na₂CO₃ → 加适量<span class="hl">稀盐酸</span>（Na₂CO₃ + 2HCl ═ 2NaCl + H₂O + CO₂↑），杂质转化为主要物质，一箭双雕；② NaOH 中混有少量 Na₂CO₃ → 加适量<span class="hl">石灰水</span>后过滤（Na₂CO₃ + Ca(OH)₂ ═ CaCO₃↓ + 2NaOH）。⚠ ①中若加 CaCl₂ 溶液，虽能沉淀 CO₃²⁻，却引入了新杂质 Ca²⁺ / 过量 Cl⁻，违反"不增"，是常见失分点。</div>' +

        '</div></details>'));

      container.appendChild(App.el(
        '<div class="takeaway">🧂 <b>复分解反应三兄弟</b>——<b>沉淀、气体、水</b>，来一个就反应，一个不来就散伙。判定套路：先交换成分，再查溶解性表（"钾钠铵盐硝酸盐，都能溶于水中间"），最后确认有没有三兄弟之一。</div>'));
    }
  };
})();
