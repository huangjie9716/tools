/* ============================================================
   Zone 04 · 空气与氧气
   Panel A 空气的成分（canvas 气泡图 + 拉瓦锡/红磷实验卡）
   Panel B 燃烧剧场（5 种物质 × 空气/氧气 两种环境对比）
   ============================================================ */
window.Zone4 = (function () {
  'use strict';

  const desc = '空气的成分按<b>体积分数</b>计算：氮气约 <b>78%</b>、氧气约 <b>21%</b>、稀有气体约 0.94%、二氧化碳约 0.03%、其他气体和杂质约 0.03%。氧气能<b>支持燃烧</b>（助燃性）和供给呼吸——许多物质在氧气中燃烧比在空气中<b>更剧烈</b>。';

  /* ---------------- Panel A 数据：空气成分 ---------------- */
  const COMPS = {
    n2: {
      name: '氮气 N₂', short: '氮气', pct: '约 78%', color: '#8fa8b3',
      text: '化学性质不活泼，常用作保护气（食品防腐、焊接金属时的保护气）；可制氮肥；液氮可用作冷冻剂。'
    },
    o2: {
      name: '氧气 O₂', short: '氧气', pct: '约 21%', color: '#22d3ee',
      text: '供给呼吸（医疗急救、潜水、登山）；支持燃烧（炼钢、气焊、航天）。呼吸和燃烧都要靠它。'
    },
    rare: {
      name: '稀有气体', short: '稀有气体', pct: '约 0.94%', color: '#f472b6',
      text: '氦、氖、氩等的总称。化学性质很不活泼，可用作保护气；通电时会发出不同颜色的光，可制成霓虹灯、航标灯等电光源。'
    },
    co2: {
      name: '二氧化碳 CO₂', short: '二氧化碳', pct: '约 0.03%', color: '#fbbf24',
      text: '植物光合作用的原料；固态二氧化碳（干冰）可作制冷剂、用于人工降雨；还可用于灭火。体积分数太小，图中不足 1 个气泡。'
    },
    other: {
      name: '其他气体和杂质', short: '其他杂质', pct: '约 0.03%', color: '#94a3b8',
      text: '如水蒸气、尘埃等，含量会随地点和天气略有变化。体积分数太小，图中不足 1 个气泡。'
    }
  };
  const HAS_BUBBLE = { n2: true, o2: true, rare: true };

  /* ---------------- Panel B 数据：五种物质燃烧 ---------------- */
  const SUBS = {
    charcoal: {
      name: '木炭',
      phenAir: '红热，<b>无烟、无焰</b>，放出热量，生成的气体能使澄清石灰水变浑浊。',
      phenO2: '<b>剧烈燃烧，发出白光</b>，放出热量，生成的气体能使澄清石灰水变浑浊。',
      eq: ['C + O₂', 'CO₂', '点燃'],
      note: '红热的木炭应由瓶口向下<b>缓慢伸入</b>集气瓶，使木炭与氧气充分接触、反应完全。'
    },
    sulfur: {
      name: '硫',
      phenAir: '发出<b>微弱的淡蓝色火焰</b>，放出热量，生成一种<b>有刺激性气味</b>的气体。',
      phenO2: '发出<b>明亮的蓝紫色火焰</b>，放出热量，生成一种<b>有刺激性气味</b>的气体。',
      eq: ['S + O₂', 'SO₂', '点燃'],
      note: '集气瓶底部预先放<b>少量水</b>，用来吸收生成的二氧化硫，防止污染空气（二氧化硫是空气污染物）。'
    },
    redp: {
      name: '红磷',
      phenAir: '发出<b>黄白色火焰</b>，放出热量，<b>产生大量白烟</b>。',
      phenO2: '<b>剧烈燃烧</b>，发出黄白色火焰，放出热量，<b>产生大量白烟</b>。',
      eq: ['4P + 5O₂', '2P₂O₅', '点燃'],
      note: '白烟是生成的<b>五氧化二磷固体小颗粒</b>——“烟”指固体小颗粒，“雾”指小液滴，描述现象时别混淆。'
    },
    iron: {
      name: '铁丝',
      phenAir: '铁丝在空气中<b>只能红热，不能燃烧</b>。',
      phenO2: '<b>剧烈燃烧，火星四射</b>，放出大量的热，生成一种<b>黑色固体</b>。',
      eq: ['3Fe + 2O₂', 'Fe₃O₄', '点燃'],
      note: '集气瓶底预先放<b>少量水或铺一层细沙</b>，防止生成的高温熔融物溅落下来炸裂瓶底；铁丝要绕成螺旋状，末端系一根火柴来引燃。'
    },
    mg: {
      name: '镁带',
      phenAir: '<b>剧烈燃烧，发出耀眼的白光</b>，放出热量，生成一种<b>白色固体</b>。',
      phenO2: '燃烧<b>更加剧烈</b>，发出<b>更加耀眼的白光</b>，放出热量，生成一种白色固体。',
      eq: ['2Mg + O₂', '2MgO', '点燃'],
      note: '用坩埚钳夹持镁带；耀眼的白光会伤害眼睛，观察时<b>不要直视</b>。'
    }
  };

  /* ================= Panel A 空气的成分 ================= */
  function buildA(root) {
    const wrap = App.el(
      '<div class="layout-2col">' +
        '<div class="panel">' +
          '<div class="panel-title">空气的成分 · 按体积分数（100 个气泡 = 100 份空气）</div>' +
          '<div class="stage z4-stage-a">' +
            '<canvas id="z4-air-cv"></canvas>' +
            '<div class="stage-caption">AIR COMPOSITION · 100 BUBBLES</div>' +
            '<div class="z4-info" id="z4-air-info"></div>' +
          '</div>' +
          '<div class="z4-legend" id="z4-legend"></div>' +
        '</div>' +
        '<div class="console">' +
          '<div class="console-card accent">' +
            '<div class="card-label">化学史 · 拉瓦锡（法国）</div>' +
            '<div class="z4-story">二百多年前，法国化学家<b>拉瓦锡</b>用<b>定量</b>的方法研究空气的成分：他把少量汞放在密闭容器里连续加热 12 天，部分液态汞变成红色粉末（氧化汞），同时容器里空气的体积减少了约 <b>1/5</b>。他由此得出结论：空气由氧气和氮气组成，其中<b>氧气约占空气总体积的 1/5</b>。</div>' +
          '</div>' +
          '<div class="console-card accent-m">' +
            '<div class="card-label">实验 · 测定空气中氧气的含量</div>' +
            '<div class="z4-story">红磷在集气瓶内燃烧，消耗氧气，生成的五氧化二磷是固体；冷却后打开弹簧夹，烧杯中的水倒吸入集气瓶，<b>进入集气瓶的水约占瓶内空气体积的 1/5</b>。实验要点：装置气密性良好、红磷足量、冷却至室温后再打开弹簧夹。</div>' +
            '<div class="z4-eq-wrap" id="z4-redp-eq"></div>' +
          '</div>' +
        '</div>' +
      '</div>');
    root.appendChild(wrap);

    wrap.querySelector('#z4-redp-eq').innerHTML = App.eq('4P + 5O₂', '2P₂O₅', '点燃');

    const cv = wrap.querySelector('#z4-air-cv');
    const infoBox = wrap.querySelector('#z4-air-info');
    const legend = wrap.querySelector('#z4-legend');
    const ctx = cv.getContext('2d');
    let W = 0, H = 380, bubbles = [];
    let hoverComp = null;

    function setInfo(key) {
      const c = COMPS[key];
      infoBox.innerHTML = '<b style="color:' + c.color + '">' + c.name + '</b>' +
        '<span class="tag">' + c.pct + '</span>' +
        '<div style="margin-top:4px">' + c.text + '</div>';
    }
    setInfo('n2');

    Object.keys(COMPS).forEach(function (k) {
      const c = COMPS[k];
      const it = App.el('<span class="z4-legend-item"><span class="z4-dot" style="background:' + c.color + ';color:' + c.color + '"></span>' + c.short + ' ' + c.pct + '</span>');
      it.addEventListener('mouseenter', function () { hoverComp = k; setInfo(k); });
      it.addEventListener('mouseleave', function () { hoverComp = null; });
      legend.appendChild(it);
    });

    function layout() {
      bubbles = [];
      const cols = 10, rows = 10;
      const mx = 26, top = 40, bottom = 118;
      const gw = (W - mx * 2) / cols, gh = (H - top - bottom) / rows;
      const r0 = Math.min(gw, gh) * 0.34;
      let i = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const comp = i < 78 ? 'n2' : (i < 99 ? 'o2' : 'rare');
          bubbles.push({
            x: mx + gw * (x + 0.5) + (Math.random() - 0.5) * gw * 0.4,
            y: top + gh * (y + 0.5) + (Math.random() - 0.5) * gh * 0.4,
            r: r0 * (0.85 + Math.random() * 0.3),
            comp: comp, ph: Math.random() * Math.PI * 2
          });
          i++;
        }
      }
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      W = Math.max(220, cv.parentElement.getBoundingClientRect().width);
      H = 380;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    }
    new ResizeObserver(resize).observe(cv.parentElement);
    resize();

    cv.addEventListener('mousemove', function (e) {
      const rect = cv.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let best = null, bd = Infinity;
      bubbles.forEach(function (b) {
        const d = (b.x - mx) * (b.x - mx) + (b.y - my) * (b.y - my);
        if (d < bd) { bd = d; best = b; }
      });
      if (best && bd < best.r * best.r * 4.8) {
        if (hoverComp !== best.comp) { hoverComp = best.comp; setInfo(best.comp); }
      } else {
        hoverComp = null;
      }
    });
    cv.addEventListener('mouseleave', function () { hoverComp = null; });

    function frame(t) {
      requestAnimationFrame(frame);
      if (!cv.isConnected || cv.offsetParent === null) return;
      ctx.clearRect(0, 0, W, H);
      const time = t / 1000;
      const dimAll = hoverComp && !HAS_BUBBLE[hoverComp];
      bubbles.forEach(function (b) {
        const c = COMPS[b.comp];
        const off = Math.sin(time * 0.9 + b.ph) * 3;
        const dim = dimAll || (hoverComp && hoverComp !== b.comp);
        const hot = hoverComp === b.comp;
        ctx.globalAlpha = dim ? 0.15 :
          (b.comp === 'rare' ? 0.95 : 0.55 + 0.28 * Math.sin(time * 1.4 + b.ph));
        ctx.beginPath();
        ctx.arc(b.x, b.y + off, b.r, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.shadowBlur = hot ? 14 : 0;
        if (hot) ctx.shadowColor = c.color;
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }

  /* ================= Panel B 燃烧剧场 ================= */
  function buildB(root) {
    const wrap = App.el(
      '<div class="panel" style="margin-top:22px">' +
        '<div class="panel-title">燃烧剧场 · 氧气支持燃烧</div>' +
        '<div class="layout-2col">' +
          '<div>' +
            '<div class="z4-ctrl">' +
              '<div class="z4-ctrl-row"><span class="z4-ctrl-label">反应物</span><div class="btn-row" id="z4-sub-btns"></div></div>' +
              '<div class="z4-ctrl-row"><span class="z4-ctrl-label">环境</span><div class="btn-row" id="z4-env-btns"></div>' +
                '<button class="btn btn-primary" id="z4-ignite" style="margin-left:auto">🔥 点燃</button></div>' +
            '</div>' +
            '<div class="stage z4-stage-b">' +
              '<canvas id="z4-fire-cv"></canvas>' +
              '<div class="stage-caption" id="z4-fire-cap"></div>' +
            '</div>' +
            '<div class="z4-hint">💡 同一种物质，先点一次「在空气中」，再点一次「在氧气中」，对比剧烈程度。现象、方程式与注意事项会在右侧同步浮现。</div>' +
          '</div>' +
          '<div class="console" id="z4-console">' +
            '<div class="console-card"><div class="card-label">实验记录</div>' +
            '<div class="z4-story">选择反应物与环境，点击「点燃」开始实验。👈</div></div>' +
          '</div>' +
        '</div>' +
      '</div>');
    root.appendChild(wrap);

    const st = { sub: 'charcoal', env: 'air' };
    const cv = wrap.querySelector('#z4-fire-cv');
    const cap = wrap.querySelector('#z4-fire-cap');
    const ctx = cv.getContext('2d');
    const consoleBox = wrap.querySelector('#z4-console');
    const igniteBtn = wrap.querySelector('#z4-ignite');
    const P = [];
    const DUR = 5200;
    let W = 0, H = 480;
    let burning = false, t0 = 0, curI = 0.42, recToken = 0, lastT = 0;

    /* ----- 按钮组 ----- */
    function syncBtns() {
      wrap.querySelectorAll('#z4-sub-btns .btn').forEach(function (b) {
        b.classList.toggle('on', b.dataset.k === st.sub);
      });
      wrap.querySelectorAll('#z4-env-btns .btn').forEach(function (b) {
        b.classList.toggle('on', b.dataset.k === st.env);
      });
      cap.textContent = SUBS[st.sub].name + ' · ' + (st.env === 'o2' ? '在氧气中' : '在空气中');
    }
    function resetBurn() {
      burning = false;
      P.length = 0;
      recToken++;
      igniteBtn.textContent = '🔥 点燃';
      syncBtns();
    }
    Object.keys(SUBS).forEach(function (k) {
      const b = App.el('<button class="btn" data-k="' + k + '">' + SUBS[k].name + '</button>');
      b.addEventListener('click', function () { st.sub = k; resetBurn(); });
      wrap.querySelector('#z4-sub-btns').appendChild(b);
    });
    [['air', '在空气中'], ['o2', '在氧气中']].forEach(function (pair) {
      const b = App.el('<button class="btn" data-k="' + pair[0] + '">' + pair[1] + '</button>');
      b.addEventListener('click', function () { st.env = pair[0]; resetBurn(); });
      wrap.querySelector('#z4-env-btns').appendChild(b);
    });
    syncBtns();

    /* ----- 右侧实验记录逐条浮现 ----- */
    function showRecords() {
      const tk = ++recToken;
      const s = SUBS[st.sub], isO2 = st.env === 'o2';
      consoleBox.innerHTML = '';
      const envTag = isO2 ? '<span class="tag cyan">在氧气中</span>' : '<span class="tag">在空气中</span>';
      const c1 = App.el('<div class="console-card accent z4-reveal"><div class="card-label">① 现象 · ' + s.name + '</div>' +
        '<div class="z4-phen">' + envTag + (isO2 ? s.phenO2 : s.phenAir) + '</div></div>');
      consoleBox.appendChild(c1);
      setTimeout(function () {
        if (tk !== recToken) return;
        consoleBox.appendChild(App.el('<div class="console-card accent-m z4-reveal"><div class="card-label">② 化学方程式</div>' +
          '<div class="z4-eq-wrap">' + App.eq(s.eq[0], s.eq[1], s.eq[2]) + '</div></div>'));
      }, 900);
      setTimeout(function () {
        if (tk !== recToken) return;
        consoleBox.appendChild(App.el('<div class="console-card accent-a z4-reveal"><div class="card-label">③ 注意事项</div>' +
          '<div class="z4-story">' + s.note + '</div></div>'));
      }, 1800);
    }

    igniteBtn.addEventListener('click', function () {
      burning = true;
      t0 = performance.now();
      curI = st.env === 'o2' ? 1 : 0.42;
      P.length = 0;
      igniteBtn.textContent = '🔥 再次点燃';
      showRecords();
    });

    /* ----- 画布 ----- */
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      W = Math.max(220, cv.parentElement.getBoundingClientRect().width);
      H = 480;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    new ResizeObserver(resize).observe(cv.parentElement);
    resize();

    function geo() {
      const jarW = Math.min(240, W * 0.42);
      const cx = W / 2, top = 56, bot = H - 44;
      const cy = top + (bot - top) * 0.45;
      return { jarW: jarW, cx: cx, top: top, bot: bot, cy: cy };
    }

    function envelope(now) {
      if (!burning) return 0;
      const p = (now - t0) / DUR;
      if (p >= 1) { burning = false; return 0; }
      const a = Math.min(1, p / 0.1);
      const b = p > 0.82 ? (1 - p) / 0.18 : 1;
      return a * b;
    }

    function spawn(e, g) {
      if (e <= 0) return;
      const o2 = curI > 0.8;
      function n(base) {
        const c = base * e * (0.5 + curI);
        let k = Math.floor(c);
        if (Math.random() < c - k) k++;
        return k;
      }
      let i, a, sp;
      switch (st.sub) {
        case 'charcoal':
          for (i = 0; i < n(o2 ? 4 : 2); i++) P.push({
            type: 'ember', x: g.cx + (Math.random() - 0.5) * 26, y: g.cy - 6 + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 22,
            r: 1.5 + Math.random() * 2, life: 0.6 + Math.random() * 0.5, age: 0,
            col: o2 ? '255,240,200' : '255,120,40'
          });
          break;
        case 'sulfur':
          for (i = 0; i < n(o2 ? 7 : 3); i++) P.push({
            type: 'flame', x: g.cx + (Math.random() - 0.5) * 18, y: g.cy - 8,
            vx: (Math.random() - 0.5) * 14, vy: -(30 + Math.random() * 55) * (0.6 + curI * 0.9),
            r: 3 + Math.random() * 5, life: 0.5 + Math.random() * 0.45, age: 0,
            col: o2 ? '167,139,250' : '125,211,252'
          });
          break;
        case 'redp':
          for (i = 0; i < n(2); i++) P.push({
            type: 'flame', x: g.cx + (Math.random() - 0.5) * 16, y: g.cy - 8,
            vx: (Math.random() - 0.5) * 12, vy: -(26 + Math.random() * 40),
            r: 2.5 + Math.random() * 4, life: 0.4 + Math.random() * 0.35, age: 0, col: '254,240,180'
          });
          for (i = 0; i < n(o2 ? 9 : 4); i++) P.push({
            type: 'smoke', x: g.cx + (Math.random() - 0.5) * 20, y: g.cy - 10,
            vx: (Math.random() - 0.5) * 20, vy: -(18 + Math.random() * 26),
            r: 4 + Math.random() * 4, grow: 7 + Math.random() * 8,
            life: 2.2 + Math.random() * 1.4, age: 0, col: '226,232,240'
          });
          break;
        case 'iron':
          if (o2) {
            for (i = 0; i < n(9); i++) {
              a = Math.random() * Math.PI * 2;
              sp = 90 + Math.random() * 190;
              P.push({
                type: 'spark', x: g.cx, y: g.cy - 6,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70,
                r: 1.2 + Math.random() * 1.4, life: 0.6 + Math.random() * 0.8, age: 0, col: '255,209,102'
              });
            }
            for (i = 0; i < n(0.6); i++) P.push({
              type: 'drop', x: g.cx + (Math.random() - 0.5) * 10, y: g.cy,
              vx: (Math.random() - 0.5) * 20, vy: 20,
              r: 2.5 + Math.random() * 2, life: 2, age: 0, col: '255,140,50'
            });
          } else {
            for (i = 0; i < n(1.2); i++) P.push({
              type: 'ember', x: g.cx + (Math.random() - 0.5) * 22, y: g.cy - 5,
              vx: 0, vy: -8, r: 1.5 + Math.random() * 1.5,
              life: 0.7, age: 0, col: '255,80,50'
            });
          }
          break;
        case 'mg':
          for (i = 0; i < n(o2 ? 6 : 3); i++) P.push({
            type: 'ember', x: g.cx + (Math.random() - 0.5) * 24, y: g.cy - 8,
            vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 44,
            r: 1.6 + Math.random() * 2, life: 0.5 + Math.random() * 0.4, age: 0, col: '255,255,255'
          });
          for (i = 0; i < n(o2 ? 5 : 3); i++) P.push({
            type: 'powder', x: g.cx + (Math.random() - 0.5) * 30, y: g.cy - 10 + Math.random() * 20,
            vx: (Math.random() - 0.5) * 24, vy: 14 + Math.random() * 30,
            r: 1.4 + Math.random() * 1.6, life: 1.6 + Math.random(), age: 0, col: '248,250,252'
          });
          break;
      }
    }

    function step(dt) {
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.age += dt;
        if (p.age >= p.life) { P.splice(i, 1); continue; }
        if (p.type === 'spark') p.vy += 420 * dt;
        if (p.type === 'drop') p.vy += 600 * dt;
        if (p.type === 'flame') { p.vx *= 0.98; p.x += Math.sin(p.age * 14) * 0.4; }
        if (p.type === 'smoke') { p.r += p.grow * dt; p.vx *= 0.995; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    const LUMP = { charcoal: '#1f2937', sulfur: '#facc15', redp: '#b91c1c', iron: '#9ca3af', mg: '#e5e7eb' };
    const GLOW = { charcoal: '255,150,60', sulfur: '125,211,252', redp: '254,240,180', iron: '255,180,80', mg: '255,255,255' };

    function drawJar(g) {
      const x = g.cx - g.jarW / 2, y = g.top, w = g.jarW, h = g.bot - g.top;
      ctx.fillStyle = 'rgba(34,211,238,' + (st.env === 'o2' ? 0.05 : 0.02) + ')';
      ctx.fillRect(x + 2, y + 12, w - 4, h - 14);
      ctx.strokeStyle = 'rgba(148,163,184,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 10);
      ctx.lineTo(x, y + h - 16);
      ctx.quadraticCurveTo(x, y + h, x + 16, y + h);
      ctx.lineTo(x + w - 16, y + h);
      ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - 16);
      ctx.lineTo(x + w, y + 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 10); ctx.lineTo(x, y + 10);
      ctx.moveTo(x + w, y + 10); ctx.lineTo(x + w + 8, y + 10);
      ctx.stroke();
      ctx.fillStyle = st.env === 'o2' ? 'rgba(34,211,238,.85)' : 'rgba(148,163,184,.8)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.env === 'o2' ? '氧气 O₂' : '空气', g.cx, y + 32);
      /* 瓶底的水 / 细沙 */
      if (st.sub === 'sulfur' || st.sub === 'iron') {
        ctx.fillStyle = 'rgba(56,189,248,.14)';
        ctx.fillRect(x + 2, g.bot - 26, w - 4, 24);
        ctx.fillStyle = 'rgba(125,211,252,.75)';
        ctx.font = '11px sans-serif';
        ctx.fillText(st.sub === 'iron' ? '少量水或细沙' : '少量水（吸收 SO₂）', g.cx, g.bot - 9);
      }
      /* 燃烧匙 */
      ctx.strokeStyle = 'rgba(148,163,184,.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.cx, y + 6);
      ctx.lineTo(g.cx, g.cy);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,.5)';
      ctx.beginPath();
      ctx.ellipse(g.cx, g.cy, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      /* 反应物 */
      ctx.fillStyle = LUMP[st.sub];
      ctx.beginPath();
      ctx.ellipse(g.cx, g.cy - 5, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawParticles() {
      ctx.save();
      P.forEach(function (p) {
        const k = 1 - p.age / p.life;
        if (p.type === 'smoke') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.22 * k;
          ctx.shadowBlur = 0;
        } else {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, k * 1.4);
          ctx.shadowColor = 'rgb(' + p.col + ')';
          ctx.shadowBlur = p.type === 'spark' ? 8 : 10;
        }
        ctx.fillStyle = 'rgb(' + p.col + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.4, p.r * (p.type === 'flame' ? k : 1)), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    function drawGlow(e, g, now) {
      if (e <= 0) return;
      const c = st.sub === 'sulfur' && curI > 0.8 ? '167,139,250' : GLOW[st.sub];
      const strength = st.sub === 'mg' ? 0.5 + 0.5 * curI : 0.3 + 0.4 * curI;
      const grad = ctx.createRadialGradient(g.cx, g.cy - 8, 4, g.cx, g.cy - 8, 90 + 70 * curI);
      grad.addColorStop(0, 'rgba(' + c + ',' + (strength * e) + ')');
      grad.addColorStop(1, 'rgba(' + c + ',0)');
      ctx.fillStyle = grad;
      ctx.fillRect(g.cx - 220, g.cy - 220, 440, 440);
      if (st.sub === 'mg') {
        ctx.save();
        ctx.globalAlpha = 0.45 * e;
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = 2;
        const rot = now / 300;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + rot;
          const len = (46 + 40 * curI) * (0.75 + 0.25 * Math.sin(now / 90 + i));
          ctx.beginPath();
          ctx.moveTo(g.cx + Math.cos(a) * 10, g.cy - 8 + Math.sin(a) * 10);
          ctx.lineTo(g.cx + Math.cos(a) * len, g.cy - 8 + Math.sin(a) * len);
          ctx.stroke();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (!cv.isConnected || cv.offsetParent === null) { lastT = now; return; }
      const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
      lastT = now;
      const g = geo();
      const e = envelope(now);
      spawn(e, g);
      step(dt);
      ctx.clearRect(0, 0, W, H);
      drawJar(g);
      drawGlow(e, g, now);
      drawParticles();
      /* 铁丝在空气中：只红热，不燃烧 */
      if (st.sub === 'iron' && curI < 0.8 && e > 0.3) {
        ctx.globalAlpha = Math.min(1, e - 0.2);
        ctx.fillStyle = 'rgba(248,113,113,.9)';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('红热……不能燃烧', g.cx, g.top + 58);
        ctx.globalAlpha = 1;
      }
    }
    requestAnimationFrame(frame);
  }

  /* ================= init ================= */
  function init(container) {
    buildA(container);
    buildB(container);
    container.appendChild(App.el(
      '<div class="takeaway">物质燃烧的剧烈程度与<b>氧气的浓度</b>有关——氧气越纯，燃烧越剧烈。描述现象时要说“看到什么”（发光、火焰颜色、烟），<b>不要说出生成物的名称</b>——那是结论，不是现象。🔍</div>'));
  }

  return { desc: desc, init: init };
})();
