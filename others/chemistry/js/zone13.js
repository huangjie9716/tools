/* ============================================================
   ZONE 13 · 化学与生活（第十二单元）
   Panel A 有机物初步 / Panel B 三大合成材料 / Panel C 灼烧法鉴别
   Panel D 白色污染 / Panel E 六大营养素与化学元素
   ============================================================ */
(function () {
  'use strict';

  const CYAN = '#22d3ee', MAGENTA = '#f472b6', AMBER = '#fbbf24',
        GREEN = '#34d399', RED = '#f87171';

  /* ---------------- 画布舞台辅助 ----------------
     draw(ctx, w, h, t) 每帧调用；元素不可见时跳过重绘，
     首帧由 rAF 启动，宽度用 ResizeObserver 自适应 */
  function makeStage(parent, height, draw, caption) {
    const stage = App.el('<div class="stage z12-stage"></div>');
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

  /* 小火苗（径向渐变水滴形） */
  function flame(ctx, x, y, s, t, color) {
    const f = 1 + 0.14 * Math.sin(t * 14 + x);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * f, s * (2 - f));
    const g = ctx.createRadialGradient(0, -6, 1, 0, -6, 15);
    g.addColorStop(0, '#fff7d6');
    g.addColorStop(0.45, color);
    g.addColorStop(1, 'rgba(244,114,182,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-7, -8, 0, -21);
    ctx.quadraticCurveTo(7, -8, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  /* ============================================================
     Panel A · 有机物初步
     ============================================================ */
  function buildPanelA(body) {
    const panel = App.el('<div class="panel z12-panel"><div class="panel-title">有机物初步 · 什么是有机物</div></div>');
    const grid = App.el('<div class="z12-grid2"></div>');
    panel.appendChild(grid);

    /* 左：概念卡 */
    const left = App.el('<div class="console"></div>');
    left.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">概念 · 教材规范表述</div>' +
      '<div class="z12-note">化合物可以分为无机化合物和有机化合物。<b>有机物都含有碳元素</b>，如甲烷、乙醇、葡萄糖、蛋白质、淀粉等。<br>' +
      '<span class="hl-m">易错警示</span>：CO、CO₂、H₂CO₃ 以及碳酸盐（如 CaCO₃）<b>虽然含有碳元素，但属于无机物</b>。</div></div>'));
    left.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">最简单的有机物 · 甲烷 CH₄</div>' +
      '<div class="z12-note">甲烷是天然气和沼气的主要成分，是<b>最简单的有机物</b>，具有可燃性：</div>' +
      '<div class="z12-eqbox">' + App.eq('CH₄ + 2O₂', 'CO₂ + 2H₂O', '点燃') + '</div></div>'));
    left.appendChild(App.el(
      '<div class="console-card"><div class="card-label">有机物数目庞大的原因</div>' +
      '<div class="z12-note">有机物的种类多达数千万种，远远超过无机物。原因：在有机物中，<b>碳原子的排列方式多种多样</b>——碳原子之间可以连成链状，也可以连成环状，还可以带有支链。</div></div>'));
    grid.appendChild(left);

    /* 右：有机物判断快筛 */
    const QUIZ = [
      { f: 'CH₄', n: '甲烷', o: true, note: '含碳元素的化合物，是最简单的有机物' },
      { f: 'CO₂', n: '二氧化碳', o: false, note: '虽含碳元素，但属于无机物' },
      { f: 'C₂H₅OH', n: '乙醇（酒精）', o: true, note: '含碳元素的化合物，是有机物' },
      { f: 'CaCO₃', n: '碳酸钙', o: false, note: '碳酸盐虽含碳，属于无机物' },
      { f: 'C₆H₁₂O₆', n: '葡萄糖', o: true, note: '含碳元素的化合物，是有机物' },
      { f: 'CO', n: '一氧化碳', o: false, note: '虽含碳元素，但属于无机物' },
      { f: 'H₂CO₃', n: '碳酸', o: false, note: '虽含碳元素，但属于无机物' },
      { f: 'CH₃COOH', n: '醋酸', o: true, note: '含碳元素的化合物，是有机物' },
      { f: '蛋白质', n: '肉、蛋、奶中的主要营养成分', o: true, note: '含碳元素的化合物，是有机物' }
    ];
    let qi = 0, score = 0, answered = false, ended = false;

    const box = App.el('<div class="console-card accent-m"><div class="card-label">快筛互动 · 它是有机物吗？</div></div>');
    const prog = App.el('<div class="z12-progress"></div>');
    const itemF = App.el('<div class="z12-quiz-item"></div>');
    const itemN = App.el('<div class="z12-quiz-name"></div>');
    const btnRow = App.el('<div class="btn-row" style="justify-content:center"></div>');
    const bYes = App.el('<button class="btn">有机物</button>');
    const bNo = App.el('<button class="btn">无机物</button>');
    btnRow.appendChild(bYes); btnRow.appendChild(bNo);
    const fb = App.el('<div class="z12-feedback"></div>');
    const nextRow = App.el('<div class="btn-row" style="justify-content:center"></div>');
    const bNext = App.el('<button class="btn btn-primary">下一题</button>');
    bNext.hidden = true;
    nextRow.appendChild(bNext);
    box.appendChild(prog); box.appendChild(itemF); box.appendChild(itemN);
    box.appendChild(btnRow); box.appendChild(fb); box.appendChild(nextRow);

    function renderQ() {
      const q = QUIZ[qi];
      answered = false;
      prog.textContent = '第 ' + (qi + 1) + ' / ' + QUIZ.length + ' 题 · 得分 ' + score;
      itemF.textContent = q.f;
      itemN.textContent = q.n;
      fb.innerHTML = '判断：它是有机物，还是无机物？';
      bYes.disabled = bNo.disabled = false;
      bNext.hidden = true;
      bNext.textContent = (qi === QUIZ.length - 1) ? '查看成绩' : '下一题';
    }
    function answer(guess) {
      if (answered || ended) return;
      answered = true;
      const q = QUIZ[qi];
      const ok = guess === q.o;
      if (ok) score++;
      fb.innerHTML = (ok
        ? '<span class="z12-fb-ok">✔ 正确。</span>'
        : '<span class="z12-fb-no">✘ 应为' + (q.o ? '有机物' : '无机物') + '。</span>')
        + ' ' + q.note + '。';
      prog.textContent = '第 ' + (qi + 1) + ' / ' + QUIZ.length + ' 题 · 得分 ' + score;
      bYes.disabled = bNo.disabled = true;
      bNext.hidden = false;
    }
    bYes.addEventListener('click', () => answer(true));
    bNo.addEventListener('click', () => answer(false));
    bNext.addEventListener('click', () => {
      if (ended) {                    // 再来一轮
        ended = false; qi = 0; score = 0;
        bNext.textContent = '下一题';
        renderQ();
        return;
      }
      if (qi < QUIZ.length - 1) { qi++; renderQ(); }
      else {
        ended = true;
        prog.textContent = '快筛完成';
        itemF.textContent = score + ' / ' + QUIZ.length;
        itemN.textContent = score === QUIZ.length ? '满分！含碳≠有机的判断已经拿下。'
          : '记住：CO、CO₂、H₂CO₃、碳酸盐含碳但属于无机物。';
        fb.innerHTML = score === QUIZ.length
          ? '<span class="z12-fb-ok">✔ 全部正确</span>，这类送分题不会再丢。'
          : '错在哪题，回去对照概念卡再看一眼。';
        bNext.hidden = false;
        bNext.textContent = '再来一轮';
        bNext.disabled = false;
      }
    });
    renderQ();
    grid.appendChild(box);

    body.appendChild(panel);
  }

  /* ============================================================
     Panel B · 三大合成材料
     ============================================================ */
  function buildPanelB(body) {
    const panel = App.el('<div class="panel z12-panel"><div class="panel-title">三大合成材料 · 塑料 / 合成纤维 / 合成橡胶</div></div>');
    const grid = App.el('<div class="z12-grid3"></div>');
    panel.appendChild(grid);

    /* ---------- ① 塑料：结构演示 + 热塑/热固 ---------- */
    const cardP = App.el('<div class="console-card accent z12-matcard"><div class="z12-h">① 塑料<small>结构决定性质</small></div></div>');

    let mode = 'chain';            // 'chain' 链状 | 'net' 网状
    let heatTarget = 0, heat = 0;  // 0 冷却 → 1 加热
    const status = App.el('<div class="z12-note z12-status"></div>');

    const row1 = App.el('<div class="btn-row"></div>');
    const bChain = App.el('<button class="btn on">链状 · 热塑性</button>');
    const bNet = App.el('<button class="btn">网状 · 热固性</button>');
    row1.appendChild(bChain); row1.appendChild(bNet);
    const row2 = App.el('<div class="btn-row"></div>');
    const bHeat = App.el('<button class="btn">🔥 加热</button>');
    const bCool = App.el('<button class="btn">❄ 冷却</button>');
    row2.appendChild(bHeat); row2.appendChild(bCool);

    function setStatus() {
      if (mode === 'chain') {
        status.innerHTML = heatTarget
          ? '<b>热塑性</b>：链状结构受热时<b>熔化</b>（可以流动），冷却后固化——<b>可反复加工</b>。'
          : '<b>热塑性</b>：冷却后固化成型；再次受热又会熔化——如聚乙烯、聚丙烯。';
      } else {
        status.innerHTML = heatTarget
          ? '<b>热固性</b>：网状结构一经加工成型，<b>受热也不再熔化</b>。'
          : '<b>热固性</b>：网状结构稳固，不能反复加热加工——如酚醛塑料（电木）。';
      }
    }
    bChain.addEventListener('click', () => {
      mode = 'chain';
      bChain.classList.add('on'); bNet.classList.remove('on');
      setStatus();
    });
    bNet.addEventListener('click', () => {
      mode = 'net';
      bNet.classList.add('on'); bChain.classList.remove('on');
      setStatus();
    });
    bHeat.addEventListener('click', () => { heatTarget = 1; setStatus(); });
    bCool.addEventListener('click', () => { heatTarget = 0; setStatus(); });
    setStatus();

    cardP.appendChild(row1);
    makeStage(cardP, 170, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      heat += (heatTarget - heat) * 0.06;
      if (mode === 'chain') {
        /* 链状：几条高分子长链，受热时摆动加剧、彼此滑动 */
        const rows = 4;
        for (let r = 0; r < rows; r++) {
          const baseY = h * (r + 0.9) / (rows + 0.8);
          const n = 26;
          const pts = [];
          for (let i = 0; i <= n; i++) {
            const x = 14 + (w - 28) * i / n;
            const amp = 2 + heat * 9;
            const y = baseY
              + Math.sin(i * 0.9 + r * 2.1 + t * (0.5 + heat * 4)) * amp
              + Math.sin(t * 2 + r * 1.7) * heat * 5;
            pts.push([x, y]);
          }
          ctx.strokeStyle = 'rgba(34,211,238,0.55)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
          ctx.stroke();
          ctx.fillStyle = CYAN;
          ctx.shadowColor = CYAN; ctx.shadowBlur = 5;
          pts.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 2.3, 0, 7); ctx.fill(); });
          ctx.shadowBlur = 0;
        }
      } else {
        /* 网状：横竖+斜向交联，加热也只是轻微颤动，不会散开 */
        const cols = 13, rows = 4;
        const jig = k => heat * Math.sin(t * 8 + k) * 1.4;
        const pts = [];
        for (let r = 0; r <= rows; r++) {
          pts.push([]);
          for (let c = 0; c <= cols; c++) {
            pts[r].push([16 + (w - 32) * c / cols + jig(r * cols + c),
                         16 + (h - 32) * r / rows + jig(c * rows + r + 5)]);
          }
        }
        const line = (a, b) => {
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        };
        ctx.strokeStyle = 'rgba(244,114,182,0.5)';
        ctx.lineWidth = 1.2;
        for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
          if (c < cols) line(pts[r][c], pts[r][c + 1]);
          if (r < rows) line(pts[r][c], pts[r + 1][c]);
          if (c < cols && r < rows && (r + c) % 2 === 0) line(pts[r][c], pts[r + 1][c + 1]);
        }
        ctx.fillStyle = MAGENTA;
        ctx.shadowColor = MAGENTA; ctx.shadowBlur = 5;
        for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
          ctx.beginPath(); ctx.arc(pts[r][c][0], pts[r][c][1], 2.3, 0, 7); ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
    }, '高分子结构示意 · 切换结构与温度观察变化');
    cardP.appendChild(status);

    cardP.appendChild(App.el(
      '<div class="z12-note"><b>热塑性</b>（链状结构）：受热熔化、冷却固化、可反复加工——' +
      '<span class="tag cyan">聚乙烯 PE</span> 食品袋、保鲜膜；' +
      '<span class="tag cyan">聚丙烯 PP</span> 微波炉餐盒。</div>'));
    cardP.appendChild(App.el(
      '<div class="z12-note"><b>热固性</b>（网状结构）：一经加工成型，受热不再熔化——' +
      '<span class="tag amber">酚醛塑料（电木）</span> 插座、开关。</div>'));
    cardP.appendChild(App.el(
      '<div class="console-card z12-warn"><div class="card-label">警示 · 必考</div>' +
      '<div class="z12-note"><b>聚氯乙烯（PVC）灼烧时有刺激性气味，不能用来盛装食品</b>；聚乙烯才能做食品袋。</div></div>'));
    grid.appendChild(cardP);

    /* ---------- ② 合成纤维 ---------- */
    const cardF = App.el('<div class="console-card accent-m z12-matcard"><div class="z12-h">② 合成纤维<small>六大纶里考三个</small></div></div>');
    cardF.appendChild(App.el(
      '<div class="z12-tags"><span class="tag magenta">涤纶（的确良）</span>' +
      '<span class="tag magenta">锦纶</span><span class="tag magenta">腈纶（人造羊毛）</span></div>'));
    cardF.appendChild(App.el(
      '<div class="z12-note"><b>优点</b>：强度高、弹性好、耐磨、耐化学腐蚀。</div>'));
    cardF.appendChild(App.el(
      '<div class="z12-note"><span class="hl-m">缺点</span>：<b>吸湿性和透气性较差</b>（所以纯涤纶衣服穿着闷）。</div>'));
    cardF.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">混纺 · 取长补短</div>' +
      '<div class="z12-note">合成纤维常常与天然纤维<b>混纺</b>，使衣服穿起来既挺括又舒适——<b>兼备两者的优点</b>。</div></div>'));
    cardF.appendChild(App.el(
      '<div class="z12-note">腈纶被称为“人造羊毛”，常与羊毛混纺；涤纶挺括不皱，就是以前有名的“的确良”。</div>'));
    grid.appendChild(cardF);

    /* ---------- ③ 合成橡胶 ---------- */
    const cardR = App.el('<div class="console-card accent-a z12-matcard"><div class="z12-h">③ 合成橡胶<small>性能全面超越天然橡胶</small></div></div>');
    cardR.appendChild(App.el(
      '<div class="z12-tags"><span class="tag amber">丁苯橡胶</span><span class="tag amber">顺丁橡胶</span></div>'));
    cardR.appendChild(App.el(
      '<div class="z12-note">与天然橡胶相比，合成橡胶具有<b>高弹性、绝缘性、耐油、耐磨</b>和不易老化等性能。</div>'));
    cardR.appendChild(App.el(
      '<div class="z12-note"><b>用途</b>：广泛应用于工农业、国防、交通及日常生活——' +
      '<span class="tag">汽车轮胎</span><span class="tag">胶鞋</span> 都离不开它。</div>'));
    cardR.appendChild(App.el(
      '<div class="console-card"><div class="card-label">记忆钩子</div>' +
      '<div class="z12-note">三大合成材料一家亲：<b>塑料、合成纤维、合成橡胶</b>，都是用化学方法合成的有机高分子材料。</div></div>'));
    grid.appendChild(cardR);

    body.appendChild(panel);
  }

  /* ============================================================
     Panel C · 灼烧法鉴别互动
     ============================================================ */
  function buildPanelC(body) {
    const panel = App.el('<div class="panel z12-panel"><div class="panel-title">灼烧法鉴别 · 棉布 / 羊毛 / 涤纶</div></div>');
    const layout = App.el('<div class="layout-2col"></div>');
    panel.appendChild(layout);

    const FABRICS = [
      { name: '棉布', main: '主要成分：纤维素', color: '#e8e4d8', weave: 'rgba(148,163,184,0.4)',
        flame: AMBER, melt: false, ash: 'gray',
        desc: '有<b>烧纸的气味</b>，灰烬呈<b>灰色、细而软</b>。' },
      { name: '羊毛', main: '主要成分：<b>蛋白质</b>', color: '#d9c9a8', weave: 'rgba(120,100,70,0.5)',
        flame: MAGENTA, melt: false, ash: 'crumb',
        desc: '有<b>烧焦羽毛的气味</b>，灰烬<b>一捻就碎</b>。' },
      { name: '涤纶', main: '合成纤维', color: '#bcd7e8', weave: 'rgba(80,130,160,0.5)',
        flame: CYAN, melt: true, ash: 'hard',
        desc: '有<b>特殊气味</b>，燃烧时<b>先熔化收缩</b>，灰烬呈<b>黑色硬块、不易捻碎</b>。' }
    ];
    let cur = 0;
    let st = { mode: 'idle', p: 0, parts: [], ash: null };
    let lastT = 0;

    /* 左：舞台 + 控制 */
    const leftBox = App.el('<div></div>');
    const ctrl = App.el('<div class="btn-row" style="margin-bottom:12px"></div>');
    const fabBtns = FABRICS.map((f, i) => {
      const b = App.el('<button class="btn' + (i === 0 ? ' on' : '') + '">' + f.name + '</button>');
      b.addEventListener('click', () => {
        if (st.mode === 'burning') return;
        cur = i;
        fabBtns.forEach((x, j) => x.classList.toggle('on', j === i));
        st = { mode: 'idle', p: 0, parts: [], ash: null };
        renderResult();
      });
      ctrl.appendChild(b);
      return b;
    });
    const bBurn = App.el('<button class="btn btn-primary">🔥 用火烧</button>');
    bBurn.addEventListener('click', () => {
      if (st.mode === 'burning') return;
      st = { mode: 'burning', p: 0, parts: [], ash: null };
      bBurn.disabled = true;
      renderResult();
    });
    ctrl.appendChild(bBurn);
    leftBox.appendChild(ctrl);

    const result = App.el('<div class="z12-note z12-burn-result"></div>');
    const fabName = App.el('<div class="card-label">现象 · 教材规范表述 <span class="z12-fabname"></span></div>');

    function renderResult() {
      const f = FABRICS[cur];
      fabName.querySelector('.z12-fabname').textContent = '——' + f.name;
      if (st.mode === 'idle') {
        result.innerHTML = f.main + '。点击「用火烧」，观察燃烧过程、闻一闻气味、捻一捻灰烬。';
      } else if (st.mode === 'burning') {
        result.innerHTML = '燃烧中……' + (f.melt ? '注意：布料先<b>熔化收缩</b>再燃烧。' : '注意火焰和气味。');
      } else {
        result.innerHTML = f.main + '。灼烧时：' + f.desc;
      }
    }

    makeStage(leftBox, 210, (ctx, w, h, t) => {
      const dt = Math.min(Math.max(t - lastT, 0), 0.05);
      lastT = t;
      ctx.clearRect(0, 0, w, h);
      const f = FABRICS[cur];
      const x0 = 46, x1 = w - 46, sy = h * 0.58, sh = 26;
      const front = x0 + (x1 - x0) * st.p;

      if (st.mode === 'burning') {
        st.p += dt / 2.8;
        if (st.p >= 1) {
          st.p = 1; st.mode = 'done';
          st.ash = [];
          for (let i = 0; i < 26; i++) {
            st.ash.push({ dx: Math.random(), dy: (Math.random() - 0.5) * 2,
                          r: 2 + Math.random() * 3.2, s: Math.random() });
          }
          bBurn.disabled = false;
          renderResult();
        }
        /* 烟 */
        for (let i = 0; i < 3; i++) {
          st.parts.push({ x: front + (Math.random() - 0.5) * 8, y: sy - 12,
                          vx: (Math.random() - 0.5) * 12, vy: -28 - Math.random() * 22,
                          life: 1 });
        }
      }
      st.parts = st.parts.filter(p => p.life > 0);
      st.parts.forEach(p => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.55;
      });

      /* 未燃部分（涤纶受热熔化收缩：靠近火头处变薄变短） */
      if (front < x1) {
        const meltK = f.melt ? (st.mode === 'idle' ? 0 : 1) : 0;
        ctx.fillStyle = f.color;
        ctx.strokeStyle = f.weave;
        ctx.lineWidth = 1;
        const segN = 24;
        for (let i = 0; i < segN; i++) {
          const xa = front + (x1 - front) * i / segN;
          const xb = front + (x1 - front) * (i + 1) / segN;
          const prox = meltK * Math.max(0, 1 - (xa - front) / 70);  // 靠近火头收缩
          const hh = sh * (1 - 0.55 * prox * Math.min(st.p * 3, 1));
          const yy = sy + prox * 8 * Math.min(st.p * 3, 1);
          ctx.globalAlpha = 0.92;
          ctx.fillRect(xa, yy - hh / 2, xb - xa + 0.5, hh);
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(xa, yy - hh / 2); ctx.lineTo(xa, yy + hh / 2);
          ctx.stroke();
        }
        /* 织纹 */
        ctx.strokeStyle = f.weave;
        ctx.beginPath();
        ctx.moveTo(front, sy - sh / 2 + 6); ctx.lineTo(x1, sy - sh / 2 + 6);
        ctx.moveTo(front, sy + sh / 2 - 6); ctx.lineTo(x1, sy + sh / 2 - 6);
        ctx.stroke();
      }
      /* 已燃部分：炭化 */
      if (st.p > 0 && st.mode !== 'done') {
        ctx.fillStyle = 'rgba(30,30,34,0.9)';
        ctx.fillRect(x0, sy - sh / 2 + 3, Math.max(front - x0, 0), sh - 6);
      }
      /* 燃烧完成：灰烬 */
      if (st.mode === 'done' && st.ash) {
        st.ash.forEach(a => {
          const ax = x0 + (x1 - x0) * a.dx;
          if (f.ash === 'gray') {
            ctx.fillStyle = 'rgba(160,160,160,' + (0.35 + a.s * 0.3) + ')';
            ctx.beginPath(); ctx.arc(ax, sy + a.dy * 10, a.r, 0, 7); ctx.fill();
          } else if (f.ash === 'crumb') {
            ctx.fillStyle = 'rgba(70,64,58,' + (0.5 + a.s * 0.3) + ')';
            ctx.beginPath(); ctx.arc(ax, sy + a.dy * 8, a.r * 0.8, 0, 7); ctx.fill();
          } else {
            ctx.fillStyle = 'rgba(12,12,14,0.95)';
            ctx.beginPath();
            ctx.ellipse(ax, sy + a.dy * 3, a.r * 1.6, a.r * 0.9, 0, 0, 7);
            ctx.fill();
          }
        });
      }
      /* 火头 */
      if (st.mode === 'burning') {
        flame(ctx, front, sy, 1.1, t, f.flame);
        flame(ctx, front - 4, sy - sh / 2, 0.8, t + 1.3, f.flame);
        flame(ctx, front + 4, sy + sh / 2, 0.8, t + 2.1, f.flame);
      }
      /* 烟 */
      st.parts.forEach(p => {
        ctx.fillStyle = 'rgba(148,163,184,' + (p.life * 0.35) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (1 - p.life) * 9, 0, 7); ctx.fill();
      });
      /* 标注 */
      ctx.fillStyle = 'rgba(148,163,184,0.7)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(st.mode === 'done' ? '灰烬' : (st.mode === 'burning' ? '燃烧中…' : f.name + ' 小样'),
                   x0, sy + sh / 2 + 24);
    }, '灼烧实验 · 点击「用火烧」开始');

    layout.appendChild(leftBox);

    /* 右：现象 + 结论 */
    const rightBox = App.el('<div class="console"></div>');
    const cardR = App.el('<div class="console-card accent"></div>');
    cardR.appendChild(fabName);
    cardR.appendChild(result);
    rightBox.appendChild(cardR);
    rightBox.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">结论</div>' +
      '<div class="z12-note"><b>灼烧闻气味</b>是鉴别天然纤维和合成纤维的简便方法：' +
      '烧纸味 → 棉（纤维素）；烧焦羽毛味 → 羊毛/蚕丝（<b>蛋白质</b>）；' +
      '熔化收缩、灰烬是黑色硬块 → 合成纤维。</div></div>'));
    layout.appendChild(rightBox);

    renderResult();
    body.appendChild(panel);
  }

  /* ============================================================
     Panel D · 白色污染
     ============================================================ */
  function buildPanelD(body) {
    const panel = App.el('<div class="panel z12-panel"><div class="panel-title">白色污染 · 塑料的功与过</div></div>');
    const layout = App.el('<div class="layout-2col-r"></div>');
    panel.appendChild(layout);

    /* 左：回收标志动画 */
    const cardLogo = App.el('<div class="console-card accent"><div class="card-label">塑料回收标志 · 可循环再生</div></div>');
    makeStage(cardLogo, 220, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2 + 8, R = Math.min(w, h) * 0.3;
      for (let k = 0; k < 3; k++) {
        const a0 = t * 0.55 + k * Math.PI * 2 / 3;
        const a1 = a0 + Math.PI * 2 / 3 * 0.74;
        ctx.strokeStyle = 'rgba(52,211,153,0.85)';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.shadowColor = GREEN; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
        ctx.shadowBlur = 0;
        /* 箭头 */
        const ax = cx + Math.cos(a1) * R, ay = cy + Math.sin(a1) * R;
        const ta = a1 + Math.PI / 2;
        ctx.fillStyle = 'rgba(52,211,153,0.95)';
        ctx.beginPath();
        ctx.moveTo(ax + Math.cos(ta) * 15, ay + Math.sin(ta) * 15);
        ctx.lineTo(ax + Math.cos(ta + 2.4) * 10, ay + Math.sin(ta + 2.4) * 10);
        ctx.lineTo(ax + Math.cos(ta - 2.4) * 10, ay + Math.sin(ta - 2.4) * 10);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(226,232,240,0.9)';
      ctx.font = '700 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('回收', cx, cy + 6);
    }, '减少 · 重复使用 · 回收 · 可降解');
    cardLogo.appendChild(App.el(
      '<div class="z12-note" style="margin-top:10px">废弃塑料回收再生，既节约资源，又减少污染。</div>'));
    layout.appendChild(cardLogo);

    /* 右：成因 / 防治 / 可降解 */
    const rightBox = App.el('<div class="console"></div>');
    rightBox.appendChild(App.el(
      '<div class="console-card accent-m"><div class="card-label">成因 · 什么是白色污染</div>' +
      '<div class="z12-note">“白色污染”是指<b>废弃塑料</b>造成的环境污染。大部分塑料在自然环境中<b>很难降解</b>，' +
      '长期堆积会破坏土壤、污染地下水、危害海洋生物的生存。</div></div>'));
    rightBox.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">防治 · 四条措施（教材原文）</div>' +
      '<ul class="z12-list">' +
      '<li>① <b>减少使用</b>不必要的塑料制品；</li>' +
      '<li>② <b>重复使用</b>某些塑料制品（如塑料袋、塑料盒）；</li>' +
      '<li>③ 使用一些新型的、<b>可降解的塑料</b>；</li>' +
      '<li>④ <b>回收</b>各种废弃塑料。</li></ul></div>'));
    rightBox.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">可降解塑料 · 初步了解</div>' +
      '<div class="z12-note">可降解塑料包括<b>微生物降解塑料</b>和<b>光降解塑料</b>等，在自然环境中能逐渐分解，' +
      '是解决“白色污染”的方向之一。</div></div>'));
    layout.appendChild(rightBox);

    body.appendChild(panel);
  }

  /* ============================================================
     Panel E · 六大营养素与化学元素
     ============================================================ */
  function buildPanelE(body) {
    const panel = App.el('<div class="panel z12-panel"><div class="panel-title">六大营养素与化学元素</div></div>');

    /* ---------- 上排：营养素速查 + 元素/缺乏症 ---------- */
    const top = App.el('<div class="z12-grid2"></div>');
    panel.appendChild(top);

    /* 左：六大营养素速查（点击切换） */
    const NUTRI = [
      { k: '蛋白质', d: '<b>构成细胞的基本物质</b>，是机体生长及修补受损组织的主要原料。来源：瘦肉、鱼、蛋、奶、豆类。' },
      { k: '糖类', d: '人体<b>主要的供能物质</b>（如淀粉、葡萄糖 C₆H₁₂O₆）。来源：米饭、面食、薯类。' },
      { k: '油脂', d: '重要的能源物质，是人体的<b>备用能源</b>。来源：花生油、肥肉、奶油。' },
      { k: '维生素', d: '<b>调节新陈代谢、预防疾病</b>、维持身体健康。缺维生素 A → <b>夜盲症</b>；缺维生素 C → <b>坏血病</b>。来源：水果、蔬菜。' },
      { k: '无机盐', d: '维持机体的正常生理功能，钙、铁、锌等元素大多以无机盐的形式存在。来源：奶类、蔬菜、食盐等。' },
      { k: '水', d: '人体内<b>含量最多</b>的物质，是各项生理活动离不开的溶剂。' }
    ];
    const cardN = App.el('<div class="console-card accent z12-matcard"><div class="card-label">六大营养素 · 点击速查</div></div>');
    const nGrid = App.el('<div class="z12-nutri-grid"></div>');
    const nDetail = App.el('<div class="z12-note z12-nutri-detail"></div>');
    const nBtns = NUTRI.map((n, i) => {
      const b = App.el('<button class="btn' + (i === 0 ? ' on' : '') + '">' + n.k + '</button>');
      b.addEventListener('click', () => {
        nBtns.forEach((x, j) => x.classList.toggle('on', j === i));
        nDetail.innerHTML = '<b>' + n.k + '</b>：' + n.d;
      });
      nGrid.appendChild(b);
      return b;
    });
    nDetail.innerHTML = '<b>' + NUTRI[0].k + '</b>：' + NUTRI[0].d;
    cardN.appendChild(nGrid);
    cardN.appendChild(nDetail);
    top.appendChild(cardN);

    /* 右：元素卡 + 缺乏症抢答 */
    const rightCol = App.el('<div class="console"></div>');
    rightCol.appendChild(App.el(
      '<div class="console-card"><div class="card-label">人体中的化学元素</div>' +
      '<div class="z12-note"><b>常量元素</b>（含量超过 0.01%，共 11 种）：O、C、H、N、Ca、P、K、S、Na、Cl、Mg。<br>' +
      '<b>微量元素</b>（含量低于 0.01%）：Fe、Zn、I、F、Se 等。</div></div>'));

    const QUIZ_E = [
      { q: '幼儿患佝偻病、老年人骨质疏松，是缺乏哪种元素？', a: '钙', note: '钙是骨骼和牙齿的主要成分' },
      { q: '患贫血（血红蛋白合成不足），是缺乏哪种元素？', a: '铁', note: '铁是血红蛋白的成分' },
      { q: '食欲不振、生长迟缓、发育不良，是缺乏哪种元素？', a: '锌', note: '缺锌影响生长发育' },
      { q: '甲状腺肿大（大脖子病），是缺乏哪种元素？', a: '碘', note: '食盐加碘可预防' },
      { q: '患龋齿，是缺乏哪种元素？', a: '氟', note: '但氟过量会引起氟斑牙' }
    ];
    const OPTS = ['钙', '铁', '锌', '碘', '氟'];
    let qi = 0, score = 0, answered = false, ended = false;

    const cardQ = App.el('<div class="console-card accent-m"><div class="card-label">抢答 · 缺乏哪种元素？</div></div>');
    const prog = App.el('<div class="z12-progress"></div>');
    const qText = App.el('<div class="z12-quiz-q"></div>');
    const optRow = App.el('<div class="btn-row" style="justify-content:center"></div>');
    const fb = App.el('<div class="z12-feedback"></div>');
    const nextRow = App.el('<div class="btn-row" style="justify-content:center"></div>');
    const bNext = App.el('<button class="btn btn-primary">下一题</button>');
    bNext.hidden = true;
    nextRow.appendChild(bNext);
    const optBtns = OPTS.map(o => {
      const b = App.el('<button class="btn">' + o + '</button>');
      b.addEventListener('click', () => answer(o));
      optRow.appendChild(b);
      return b;
    });
    cardQ.appendChild(prog); cardQ.appendChild(qText); cardQ.appendChild(optRow);
    cardQ.appendChild(fb); cardQ.appendChild(nextRow);
    rightCol.appendChild(cardQ);

    function renderQ() {
      answered = false;
      prog.textContent = '第 ' + (qi + 1) + ' / ' + QUIZ_E.length + ' 题 · 得分 ' + score;
      qText.textContent = QUIZ_E[qi].q;
      fb.innerHTML = '点击元素符号名称作答。';
      optBtns.forEach(b => { b.disabled = false; });
      bNext.hidden = true;
      bNext.textContent = (qi === QUIZ_E.length - 1) ? '查看成绩' : '下一题';
    }
    function answer(o) {
      if (answered || ended) return;
      answered = true;
      const q = QUIZ_E[qi];
      const ok = o === q.a;
      if (ok) score++;
      fb.innerHTML = (ok
        ? '<span class="z12-fb-ok">✔ 正确，缺<b>' + q.a + '</b>。</span>'
        : '<span class="z12-fb-no">✘ 应缺<b>' + q.a + '</b>。</span>')
        + ' ' + q.note + '。';
      prog.textContent = '第 ' + (qi + 1) + ' / ' + QUIZ_E.length + ' 题 · 得分 ' + score;
      optBtns.forEach(b => { b.disabled = true; });
      bNext.hidden = false;
    }
    bNext.addEventListener('click', () => {
      if (ended) { ended = false; qi = 0; score = 0; renderQ(); return; }
      if (qi < QUIZ_E.length - 1) { qi++; renderQ(); }
      else {
        ended = true;
        prog.textContent = '抢答完成';
        qText.textContent = '得分 ' + score + ' / ' + QUIZ_E.length;
        fb.innerHTML = (score === QUIZ_E.length
          ? '<span class="z12-fb-ok">✔ 满分！</span>'
          : '口诀再背一遍：')
          + ' 缺钙佝偻骨质疏松，缺铁贫血，缺锌迟缓，缺碘大脖子，缺氟龋齿。';
        bNext.hidden = false;
        bNext.textContent = '再来一轮';
      }
    });
    renderQ();
    top.appendChild(rightCol);

    /* ---------- 下排：食品安全警示 ---------- */
    const safe = App.el('<div class="z12-grid4" style="margin-top:16px"></div>');
    safe.appendChild(App.el(
      '<div class="console-card z12-warn"><div class="card-label">甲醛</div>' +
      '<div class="z12-note">甲醛<b>有毒</b>，能破坏蛋白质的结构。<b>不能用甲醛溶液浸泡海产品</b>。</div></div>'));
    safe.appendChild(App.el(
      '<div class="console-card z12-warn"><div class="card-label">黄曲霉毒素</div>' +
      '<div class="z12-note">霉变的花生、大米含黄曲霉毒素，<b>致癌</b>，<b>绝对不能食用</b>。</div></div>'));
    safe.appendChild(App.el(
      '<div class="console-card z12-warn"><div class="card-label">亚硝酸钠</div>' +
      '<div class="z12-note">亚硝酸钠（工业盐）<b>有毒</b>，<b>不能当作食盐</b>使用。</div></div>'));
    safe.appendChild(App.el(
      '<div class="console-card z12-warn"><div class="card-label">工业酒精</div>' +
      '<div class="z12-note">工业酒精含<b>甲醇</b>，<b>不能用来勾兑饮用酒</b>（甲醇可致人失明甚至死亡）。</div></div>'));
    panel.appendChild(safe);

    body.appendChild(panel);
  }

  /* ============================================================
     学霸加餐 + takeaway
     ============================================================ */
  function buildPro(body) {
    body.appendChild(App.el(
      '<details class="pro-box"><summary>学霸加餐 · 材料题与鉴别题破题套路</summary>' +
      '<div class="pro-body">' +

      '<div class="pro-item"><span class="pro-tag">压轴题型</span>' +
      '<b>“性质决定用途”信息题答题套路</b>：中考常给出新材料（如可降解塑料、特种纤维）的说明文字，' +
      '要求推断用途或性质。套路是<b>双向推导</b>——由性质推用途：耐磨、耐油、高弹性 → 轮胎；' +
      '由用途反推性质：能做微波炉餐盒 → 耐热（热塑性 PP）；能做插座 → 受热不熔化、绝缘（热固性电木）。' +
      '答题时<b>先圈出题干中的性质关键词</b>，再一一对应到用途，结论必须从题干信息中来，不要凭空写。</div>' +

      '<div class="pro-item"><span class="pro-tag">规范表述</span>' +
      '<b>鉴别类简答题 · 规范表述四步法</b>：<span class="hl">①取样 → ②操作（加试剂/灼烧）→ ③描述现象 → ④得出结论</span>，' +
      '四步缺一不可，漏“取样”是中考最常见的扣分点。示例（鉴别棉、羊毛、涤纶）：' +
      '<b>各取少量样品，分别灼烧，有烧焦羽毛气味的是羊毛，有烧纸气味的是棉，燃烧时熔化收缩且灰烬为黑色硬块的是涤纶。</b></div>' +

      '<div class="pro-item"><span class="pro-tag">易错辨析</span>' +
      '<b>有机物判断</b>：<b>含碳 ≠ 有机</b>——CO₂ 含碳元素，但属于无机物（同理 CO、H₂CO₃、碳酸盐）；' +
      '<b>不含碳一定不是有机物</b>。口诀：“含碳多有机，一氧化碳、二氧化碳、碳酸、碳酸盐除外”。' +
      '同理可推：塑料、纤维、橡胶都是含碳的有机高分子材料，属于有机物。</div>' +

      '</div></details>'));

    body.appendChild(App.el(
      '<div class="takeaway">材料看三性——<b>热塑热固分塑料</b>，<b>灼烧闻味辨纤维</b>，<b>回收降解治白色污染</b>。' +
      '聚氯乙烯有毒不能盛装食品，聚乙烯才能做食品袋；缺钙佝偻缺铁贫血、缺锌迟缓、缺碘大脖子、缺氟龋齿——生活处处是考点。</div>'));
  }

  /* ============================================================
     模块导出
     ============================================================ */
  window.Zone13 = {
    desc: '有机物都含<b>碳元素</b>（但 CO、CO₂、H₂CO₃ 和碳酸盐除外，它们属于无机物）。' +
          '<b>塑料、合成纤维、合成橡胶</b>并称三大合成材料——它们不是天然长出来的，是用化学方法合成的。' +
          '本板块还有<span class="hl">灼烧法鉴别纤维</span>、<span class="hl">白色污染治理</span>与' +
          '<span class="hl">六大营养素、化学元素缺乏症</span>的生活化考点。',
    init(container) {
      container.innerHTML = '';
      buildPanelA(container);
      buildPanelB(container);
      buildPanelC(container);
      buildPanelD(container);
      buildPanelE(container);
      buildPro(container);
    }
  };
})();
