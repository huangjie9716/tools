/* ============================================================
   ZONE 09 · 金属和合金（第八单元 金属和金属材料）
   Panel A 金属与合金 / B 金属活动性竞技场 / C 金属与氧气
   Panel D 金属与盐溶液 / E 冶炼与防护 / 学霸加餐
   ============================================================ */
(function () {
  'use strict';

  const CYAN = '#22d3ee', MAGENTA = '#f472b6', AMBER = '#fbbf24',
        GREEN = '#34d399', RED = '#f87171', DIM = '#94a3b8', FAINT = '#64748b';

  /* ---------------- 画布舞台辅助（与 zone7 同款约定） ---------------- */
  function makeStage(parent, height, draw, caption) {
    const stage = App.el('<div class="stage z8-stage"></div>');
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

  /* 小火苗 */
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

  function panel(title, style) {
    return App.el('<div class="panel"' + (style ? ' style="' + style + '"' : '') +
      '><div class="panel-title">' + title + '</div></div>');
  }

  /* ============================================================
     Panel A · 金属与合金
     ============================================================ */
  function buildPanelA(container) {
    const p = panel('Panel A · 金属与合金——从"纯"到"混"的智慧');
    container.appendChild(p);

    /* ---- 物理性质通性 + 特性 ---- */
    const row1 = App.el('<div class="z8-grid2"></div>');
    p.appendChild(row1);
    row1.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">金属的物理性质 · 通性</div>' +
      '<div class="z8-cbody"><p>大多数金属都具有<b>金属光泽</b>，能够<b>导电</b>、<b>导热</b>，有<b>延展性</b>（能拉成细丝、压成薄片），常温下都是<b>固体</b>（汞除外）。</p></div></div>'));
    row1.appendChild(App.el(
      '<div class="console-card accent-m"><div class="card-label">金属的物理性质 · 特性（常考）</div>' +
      '<div class="z8-cbody"><p>① 大多数金属呈银白色，但<b>铜呈紫红色</b>，<b>金呈黄色</b>；<br>' +
      '② <b>汞</b>在常温下是<b>液体</b>；<br>' +
      '③ 导电、导热性最好的金属是<b>银</b>，其次是铜、金、铝；<br>' +
      '④ 熔点最高的金属是<b>钨</b>（灯丝），熔点最低的是<b>汞</b>。</p></div></div>'));

    /* ---- 合金 ---- */
    const pAlloy = panel('合金 · 在金属中加热熔合某些金属或非金属，制得具有金属特征的物质', 'margin-top:18px');
    p.appendChild(pAlloy);
    pAlloy.appendChild(App.el(
      '<p class="z8-hint">合金属于<b>混合物</b>（中考高频考点！）。与组成它们的纯金属相比，合金的<b>强度和硬度一般更大</b>、<b>抗腐蚀性能更好</b>，许多合金的<b>熔点更低</b>。</p>'));

    /* 生铁 vs 钢：含碳量标尺 */
    const scaleWrap = App.el('<div class="z8-scalewrap"></div>');
    scaleWrap.appendChild(App.el(
      '<div class="z8-scale">' +
      '<div class="z8-band steel" style="left:0.7%;width:45.9%"></div>' +
      '<div class="z8-band iron" style="left:46.6%;width:53.4%"></div>' +
      '<div class="z8-mark" style="left:0.7%">0.03%</div>' +
      '<div class="z8-mark" style="left:46.6%">2%</div>' +
      '<div class="z8-mark" style="left:100%">4.3%</div>' +
      '</div>' +
      '<div class="z8-scalelegend">' +
      '<span><i class="z8-dot" style="background:var(--cyan)"></i>钢：含碳量 0.03%～2%，坚硬、有韧性</span>' +
      '<span><i class="z8-dot" style="background:var(--magenta)"></i>生铁：含碳量 2%～4.3%，硬而脆、无韧性</span>' +
      '</div>'));
    pAlloy.appendChild(scaleWrap);
    pAlloy.appendChild(App.el(
      '<p class="z8-hint" style="margin-top:10px">生铁和钢都是<b>铁的合金</b>，它们性能不同的根本原因：<b>含碳量不同</b>。</p>'));

    /* 常见合金用途 */
    const g3 = App.el('<div class="z8-grid3" style="margin-top:14px"></div>');
    pAlloy.appendChild(g3);
    g3.appendChild(App.el(
      '<div class="console-card"><div class="card-label">硬铝（铝、铜、镁、硅的合金）</div>' +
      '<div class="z8-cbody"><p>强度和硬度好 → 用于制造<b>飞机</b>等。</p></div></div>'));
    g3.appendChild(App.el(
      '<div class="console-card"><div class="card-label">焊锡（锡铅合金）</div>' +
      '<div class="z8-cbody"><p><b>熔点低</b> → 用于<b>焊接</b>金属。</p></div></div>'));
    g3.appendChild(App.el(
      '<div class="console-card"><div class="card-label">钛合金</div>' +
      '<div class="z8-cbody"><p>熔点高、密度小、可塑性好、机械性能好，且与人体有很好的<b>"相容性"</b> → 可用来制造<b>人造骨</b>。</p></div></div>'));
  }

  /* ============================================================
     Panel B · 金属活动性竞技场（核心交互）
     ============================================================ */
  function buildPanelB(container) {
    const layout = App.el('<div class="layout-2col" style="margin-top:22px"></div>');
    container.appendChild(layout);
    const left = panel('Panel B · 金属活动性竞技场——点击金属片，"投入"试管');
    const right = App.el('<div class="console"></div>');
    layout.appendChild(left); layout.appendChild(right);

    /* ---- 金属活动性顺序芯片 ---- */
    const METALS = [
      { s: 'K',  cn: '钾', type: 'wild' },
      { s: 'Ca', cn: '钙', type: 'wild' },
      { s: 'Na', cn: '钠', type: 'wild' },
      { s: 'Mg', cn: '镁', type: 'gas', level: 3, color: '#d7dde6' },
      { s: 'Al', cn: '铝', type: 'gas', level: 2, color: '#cfd6de' },
      { s: 'Zn', cn: '锌', type: 'gas', level: 2, color: '#aebdcc' },
      { s: 'Fe', cn: '铁', type: 'gas', level: 1, color: '#8d97a3' },
      { s: 'Sn', cn: '锡', type: 'gas', level: 0.5, color: '#c9ccd4' },
      { s: 'Pb', cn: '铅', type: 'gas', level: 0.3, color: '#8a92a0' },
      { s: 'H',  cn: '氢', type: 'mark' },
      { s: 'Cu', cn: '铜', type: 'inert', color: '#b4562f' },
      { s: 'Hg', cn: '汞', type: 'inert', color: '#dfe6ee' },
      { s: 'Ag', cn: '银', type: 'inert', color: '#e8edf2' },
      { s: 'Pt', cn: '铂', type: 'inert', color: '#d4dbe2' },
      { s: 'Au', cn: '金', type: 'inert', color: '#f0c040' }
    ];
    /* 与酸反应的方程式（HCl / H2SO4） */
    const EQ = {
      Mg: { HCl: ['Mg + 2HCl', 'MgCl₂ + H₂↑'], H2SO4: ['Mg + H₂SO₄', 'MgSO₄ + H₂↑'] },
      Al: { HCl: ['2Al + 6HCl', '2AlCl₃ + 3H₂↑'], H2SO4: ['2Al + 3H₂SO₄', 'Al₂(SO₄)₃ + 3H₂↑'] },
      Zn: { HCl: ['Zn + 2HCl', 'ZnCl₂ + H₂↑'], H2SO4: ['Zn + H₂SO₄', 'ZnSO₄ + H₂↑'] },
      Fe: { HCl: ['Fe + 2HCl', 'FeCl₂ + H₂↑'], H2SO4: ['Fe + H₂SO₄', 'FeSO₄ + H₂↑'] },
      Sn: { HCl: ['Sn + 2HCl', 'SnCl₂ + H₂↑'], H2SO4: ['Sn + H₂SO₄', 'SnSO₄ + H₂↑'] },
      Pb: { HCl: ['Pb + 2HCl', 'PbCl₂ + H₂↑'], H2SO4: ['Pb + H₂SO₄', 'PbSO₄ + H₂↑'] }
    };
    const WATER_EQ = {
      K:  ['2K + 2H₂O',  '2KOH + H₂↑'],
      Ca: ['Ca + 2H₂O',  'Ca(OH)₂ + H₂↑'],
      Na: ['2Na + 2H₂O', '2NaOH + H₂↑']
    };
    const GAS_NOTE = {
      Mg: '反应<b>剧烈</b>，迅速产生大量气泡——镁不愧是"急脾气"。',
      Al: '反应较快，产生较多气泡（铝表面致密的氧化膜被酸破坏后，反应顺利进行）。',
      Zn: '反应速率<b>适中</b>，气泡持续平稳——速度不快不慢，刚刚好。',
      Fe: '反应<b>缓慢</b>，有气泡产生；注意看：<b>溶液由无色逐渐变为浅绿色</b>！',
      Sn: '反应很缓慢，有少量气泡——虽然排在氢前，但"懒洋洋"的。',
      Pb: '反应很缓慢，有少量气泡——虽然排在氢前，但实际不用来制取氢气。'
    };
    const INERT_NOTE = {
      Cu: '铜：我的内心毫无波澜，甚至想拉一段小提琴。🎻',
      Hg: '汞：我是常温下唯一的液态金属，躺平看我表演——什么反应都没有。',
      Ag: '银：淡定。氢后面的世界就是这么平静。',
      Pt: '铂（白金）：贵有贵的道理，酸都拿我没办法。',
      Au: '金：真金不怕火炼，也不怕酸泡。✨'
    };

    const chips = App.el('<div class="z8-chips"></div>');
    left.appendChild(chips);
    const arena = { metal: null, acid: 'HCl', t0: 0 };

    /* ---- 酸的切换 ---- */
    const acidRow = App.el('<div class="btn-row" style="margin:2px 0 12px"></div>');
    const bHCl = App.el('<button class="btn on">稀盐酸</button>');
    const bH2SO4 = App.el('<button class="btn">稀硫酸</button>');
    acidRow.appendChild(bHCl); acidRow.appendChild(bH2SO4);
    left.appendChild(acidRow);

    /* ---- 右侧卡片 ---- */
    const eqCard = App.el(
      '<div class="console-card accent"><div class="card-label">化学方程式</div>' +
      '<div class="z8-eqshow"><span style="color:var(--text-faint);font-size:13.5px">👆 点击上方任意金属片开始实验</span></div></div>');
    right.appendChild(eqCard);
    const fbCard = App.el(
      '<div class="console-card accent-a"><div class="card-label">现象记录</div>' +
      '<div class="z8-fbshow z8-cbody"><p style="color:var(--text-faint)">等待金属入场……</p></div></div>');
    right.appendChild(fbCard);
    right.appendChild(App.el(
      '<div class="console-card accent-m"><div class="card-label">判断依据（教材原文逻辑）</div>' +
      '<div class="z8-cbody"><p>在金属活动性顺序里，<b>位于氢前面的金属能置换出盐酸、稀硫酸中的氢</b>；金属的位置越靠前，活动性越强，反应越剧烈。</p>' +
      '<p style="margin-top:6px">⚠ <b>铁与盐酸、稀硫酸反应生成 +2 价的亚铁盐</b>（FeCl₂、FeSO₄），溶液呈<b>浅绿色</b>——千万别写成 FeCl₃！</p></div></div>'));
    right.appendChild(App.el(
      '<details class="pro-box"><summary>记忆口诀 · 一行背下活动性顺序</summary>' +
      '<div class="pro-body"><div class="pro-item"><span class="pro-tag">口诀</span>' +
      '<b>钾钙钠镁铝，锌铁锡铅（氢），铜汞银铂金。</b><br>' +
      'K Ca Na Mg Al，Zn Fe Sn Pb (H)，Cu Hg Ag Pt Au。<br>' +
      '氢是"分界线"：氢前换酸中氢，氢后不与稀酸反应；前面金属还能把后面金属从它化合物的溶液里置换出来（K、Ca、Na 除外）。' +
      '</div></div></details>'));

    function showMetal(m) {
      arena.metal = m;
      arena.t0 = performance.now() / 1000;
      chips.querySelectorAll('.z8-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.s === m.s));
      const eqShow = eqCard.querySelector('.z8-eqshow');
      const fbShow = fbCard.querySelector('.z8-fbshow');
      if (m.type === 'gas') {
        const e = EQ[m.s][arena.acid];
        let html = App.eq(e[0], e[1]);
        if (m.s === 'Zn' && arena.acid === 'H2SO4') {
          html += ' <span class="tag cyan">实验室制取氢气</span>';
        }
        if (m.s === 'Fe') {
          html += '<div class="z8-warn">⚠ 铁与酸反应生成 <b>+2 价亚铁盐</b>，溶液由无色逐渐变为<b>浅绿色</b></div>';
        }
        eqShow.innerHTML = html;
        fbShow.innerHTML = '<p>' + GAS_NOTE[m.s] + '</p>';
      } else if (m.type === 'wild') {
        eqShow.innerHTML = App.eq(WATER_EQ[m.s][0], WATER_EQ[m.s][1]) +
          '<div class="z8-warn">与水就能剧烈反应</div>';
        fbShow.innerHTML = '<p>' + m.cn + '<b>太活泼了</b>！它直接与水就能剧烈反应并放出氢气，与酸反应更是剧烈到危险——' +
          '<b>初中不用它们制取氢气</b>，也不让它们参与"置换"游戏。</p>';
      } else if (m.type === 'inert') {
        eqShow.innerHTML = '<span style="color:var(--text-faint);font-size:14px">✕ 无反应——位于氢之后，不能置换出酸中的氢</span>';
        fbShow.innerHTML = '<p><i>' + INERT_NOTE[m.s] + '</i></p>' +
          '<p style="margin-top:4px">规范表述：<b>' + m.cn + '排在氢之后，不能与稀盐酸（或稀硫酸）反应。</b></p>';
      } else { /* H 参照物 */
        eqShow.innerHTML = '<span style="font-size:14.5px;color:var(--amber)">氢是分界线：排在我前面的能换出酸中的氢，排在我后面的不能。</span>';
        fbShow.innerHTML = '<p>口诀：<b>钾钙钠镁铝，锌铁锡铅（氢），铜汞银铂金。</b></p>';
      }
    }

    METALS.forEach(m => {
      const label = m.type === 'mark' ? '(H)' : m.s;
      const b = App.el('<button class="z8-chip' + (m.type === 'mark' ? ' h' : '') +
        '" data-s="' + m.s + '" title="' + m.cn + '">' + label + '</button>');
      b.addEventListener('click', () => showMetal(m));
      chips.appendChild(b);
    });

    bHCl.addEventListener('click', () => {
      arena.acid = 'HCl';
      bHCl.classList.add('on'); bH2SO4.classList.remove('on');
      if (arena.metal) showMetal(arena.metal);
    });
    bH2SO4.addEventListener('click', () => {
      arena.acid = 'H2SO4';
      bH2SO4.classList.add('on'); bHCl.classList.remove('on');
      if (arena.metal) showMetal(arena.metal);
    });

    /* ---- 试管画布 ---- */
    makeStage(left, 340, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const m = arena.metal;
      const elapsed = arena.t0 ? (performance.now() / 1000 - arena.t0) : 0;
      const tx = w / 2, ty = h * 0.92, tw = 92, th = h * 0.70;
      const lh = th * 0.62;

      /* 试管 */
      ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2, ty - th);
      ctx.lineTo(tx - tw / 2, ty - 16);
      ctx.arc(tx, ty - 16, tw / 2, Math.PI, 0, true);
      ctx.lineTo(tx + tw / 2, ty - th);
      ctx.stroke();

      /* 酸液：默认淡青色；铁反应时渐变浅绿色 */
      let lr = 34, lg = 211, lb = 238, la = 0.14;
      if (m && m.s === 'Fe' && elapsed > 0) {
        const k = Math.min(elapsed / 5, 1);   // 5 秒变绿
        lr = Math.round(34 + (150 - 34) * k);
        lg = Math.round(211 + (196 - 211) * k);
        lb = Math.round(238 + (140 - 238) * k);
        la = 0.14 + 0.22 * k;
      }
      ctx.fillStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',' + la + ')';
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2 + 3, ty - lh);
      ctx.lineTo(tx - tw / 2 + 3, ty - 16);
      ctx.arc(tx, ty - 16, tw / 2 - 3, Math.PI, 0, true);
      ctx.lineTo(tx + tw / 2 - 3, ty - lh);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(tx - tw / 2 + 3, ty - lh, tw - 6, 2);

      /* 金属片：投入动画（0.45s 落下） */
      if (m && m.type !== 'mark') {
        const drop = Math.min(elapsed / 0.45, 1);
        const my = (ty - th - 24) + (ty - 34 - (ty - th - 24)) * drop * drop;
        ctx.fillStyle = m.color || '#c9ccd4';
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
        const mw2 = 56, mh2 = 15;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(tx - mw2 / 2, my, mw2, mh2, 6);
        else ctx.rect(tx - mw2 / 2, my, mw2, mh2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0a0e14'; ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.s, tx, my + 12);

        /* 气泡：等级决定数量与速度 */
        if (drop >= 1 && (m.type === 'gas' || m.type === 'wild')) {
          const conf = m.type === 'wild' ? { n: 46, sp: 2.4 } : {
            3: { n: 36, sp: 1.7 }, 2: { n: 22, sp: 1.05 },
            1: { n: 10, sp: 0.55 }, 0.5: { n: 6, sp: 0.4 }, 0.3: { n: 4, sp: 0.3 }
          }[m.level];
          ctx.fillStyle = 'rgba(224,247,255,0.85)';
          for (let i = 0; i < conf.n; i++) {
            const bt = (t * conf.sp + i * 0.618) % 1;
            const bx = tx - mw2 / 2 + ((i * 37.7) % mw2) + Math.sin(t * 3 + i) * 2.5;
            const by = ty - 34 - bt * (lh - 22);
            ctx.beginPath();
            ctx.arc(bx, by, 1.2 + bt * (m.type === 'wild' ? 3 : 2.2), 0, 7);
            ctx.fill();
          }
          /* K/Ca/Na：剧烈到水面翻腾 */
          if (m.type === 'wild') {
            ctx.strokeStyle = 'rgba(248,113,113,' + (0.4 + 0.3 * Math.sin(t * 9)) + ')';
            ctx.lineWidth = 2;
            ctx.strokeRect(tx - tw / 2 - 8, ty - th - 10, tw + 16, th + 26);
          }
        }
        /* H 后金属：一片寂静 */
        if (drop >= 1 && m.type === 'inert') {
          ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('……（毫无波澜）', tx, ty - th - 16);
        }
      } else if (!m) {
        ctx.fillStyle = FAINT; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(arena.acid === 'HCl' ? '试管中是稀盐酸' : '试管中是稀硫酸', tx, ty - th - 16);
      }

      /* 铁反应颜色提示 */
      if (m && m.s === 'Fe' && elapsed > 0.5) {
        const k = Math.min(elapsed / 5, 1);
        ctx.fillStyle = 'rgba(150,196,140,' + (0.5 + 0.5 * k) + ')';
        ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(k >= 1 ? '溶液已变为浅绿色（Fe²⁺）' : '溶液逐渐变为浅绿色…', tx, ty - th - 16);
      }
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(arena.acid === 'HCl' ? '稀盐酸' : '稀硫酸', tx, ty + 20);
    }, '点击金属片 → 观察气泡剧烈程度与溶液颜色');
  }

  /* ============================================================
     Panel C · 金属与氧气
     ============================================================ */
  function buildPanelC(container) {
    const p = panel('Panel C · 金属与氧气——不同的金属，不同的"脾气"', 'margin-top:22px');
    container.appendChild(p);
    const grid = App.el('<div class="z8-grid3"></div>');
    p.appendChild(grid);

    function oxyCard(title, draw, caption, bodyHTML, eq) {
      const card = panel(title);
      makeStage(card, 168, draw, caption);
      let html = '<div class="z8-cbody" style="margin-top:10px"><p>' + bodyHTML + '</p></div>';
      if (eq) html += '<div style="margin-top:4px">' + App.eq(eq[0], eq[1], eq[2]) + '</div>';
      card.appendChild(App.el(html));
      grid.appendChild(card);
    }

    /* ---- 镁：耀眼的白光 ---- */
    oxyCard('镁 · 常温能反应，点燃发白光', (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.58;
      /* 镁条 */
      ctx.fillStyle = '#d7dde6';
      ctx.fillRect(cx - 58, cy - 5, 116, 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.strokeRect(cx - 58, cy - 5, 116, 10);
      /* 耀眼白光（脉动辉光） */
      const glow = 0.55 + 0.35 * Math.sin(t * 6);
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 74);
      g.addColorStop(0, 'rgba(255,255,255,' + glow + ')');
      g.addColorStop(0.4, 'rgba(224,247,255,' + glow * 0.45 + ')');
      g.addColorStop(1, 'rgba(224,247,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, 74, 0, 7); ctx.fill();
      /* 火花 */
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 10; i++) {
        const fr = (t * 1.4 + i * 0.31) % 1;
        const a = i * 0.63;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * fr * 52, cy + Math.sin(a) * fr * 40 - fr * 8, 1.6 * (1 - fr), 0, 7);
        ctx.fill();
      }
      ctx.fillStyle = FAINT; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('发出耀眼的白光，生成白色固体', cx, h - 12);
    }, '2Mg + O₂ ═点燃═ 2MgO',
      '常温下，打磨过的镁条在空气中表面会逐渐变暗；点燃时<b>发出耀眼的白光</b>，放出大量的热，生成<b>白色固体</b>。',
      ['2Mg + O₂', '2MgO', '点燃']);

    /* ---- 铝：致密氧化膜 ---- */
    oxyCard('铝 · 致密氧化膜护体', (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.62;
      /* 铝块 */
      ctx.fillStyle = '#cfd6de';
      ctx.fillRect(cx - 62, cy - 14, 124, 28);
      /* 氧化铝薄膜：青色亮边 */
      ctx.strokeStyle = 'rgba(34,211,238,' + (0.6 + 0.35 * Math.sin(t * 3)) + ')';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = CYAN; ctx.shadowBlur = 8;
      ctx.strokeRect(cx - 62, cy - 14, 124, 28);
      ctx.shadowBlur = 0;
      /* O₂ 分子落下，被薄膜弹开 */
      for (let i = 0; i < 8; i++) {
        const ox = cx - 66 + ((i * 41) % 132);
        const fr = (t * 0.55 + i * 0.47) % 1;
        /* 下落再弹回 */
        const oy = fr < 0.5
          ? 18 + fr * 2 * (cy - 32)
          : cy - 14 - (fr - 0.5) * 2 * (cy - 46);
        ctx.fillStyle = 'rgba(244,114,182,0.85)';
        ctx.beginPath(); ctx.arc(ox - 3, oy, 2.6, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(ox + 3, oy, 2.6, 0, 7); ctx.fill();
      }
      ctx.fillStyle = FAINT; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('致密薄膜把 O₂ 挡在外面', cx, h - 12);
    }, '4Al + 3O₂ ═ 2Al₂O₃（常温）',
      '常温下铝与空气中的氧气反应，表面生成一层<b>致密的氧化铝薄膜</b>，能阻止铝进一步氧化——这就是铝具有<b>良好抗腐蚀性</b>的原因。',
      ['4Al + 3O₂', '2Al₂O₃']);

    /* ---- 铁：火星四射 ---- */
    oxyCard('铁 · 氧气中火星四射', (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.5;
      /* 铁丝（斜放） */
      ctx.strokeStyle = '#8d97a3'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 66, cy - 30); ctx.lineTo(cx + 40, cy + 26);
      ctx.stroke();
      /* 末端炽热点 */
      const hx = cx + 40, hy = cy + 26;
      ctx.fillStyle = 'rgba(255,240,200,0.95)';
      ctx.shadowColor = AMBER; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(hx, hy, 4 + Math.sin(t * 8), 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      /* 火星四射 */
      for (let i = 0; i < 22; i++) {
        const fr = (t * 1.1 + i * 0.37) % 1;
        const a = i * 2.399;                 // 黄金角散布
        const sx = hx + Math.cos(a) * fr * 58;
        const sy = hy + Math.sin(a) * fr * 44 + fr * fr * 22;
        ctx.strokeStyle = 'rgba(' + (fr < 0.5 ? '251,191,36' : '248,113,113') + ',' + (1 - fr) * 0.9 + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - Math.cos(a) * 7, sy - Math.sin(a) * 6 - 4);
        ctx.stroke();
      }
      ctx.fillStyle = FAINT; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('剧烈燃烧，火星四射，生成黑色固体', cx, h - 12);
    }, '3Fe + 2O₂ ═点燃═ Fe₃O₄',
      '铁丝在空气中<b>不能燃烧</b>，在氧气中<b>剧烈燃烧，火星四射</b>，放出大量的热，生成<b>黑色固体</b>。',
      ['3Fe + 2O₂', 'Fe₃O₄', '点燃']);

    /* ---- 铜：加热变黑 ---- */
    oxyCard('铜 · 加热逐渐变黑', (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.52;
      const k = 0.5 + 0.5 * Math.sin(t * 0.8);   // 红 ↔ 黑 往复
      const rC = Math.round(180 + (26 - 180) * k);
      const gC = Math.round(86 + (28 - 86) * k);
      const bC = Math.round(47 + (31 - 47) * k);
      ctx.fillStyle = 'rgb(' + rC + ',' + gC + ',' + bC + ')';
      ctx.fillRect(cx - 62, cy - 9, 124, 18);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(cx - 62, cy - 9, 124, 18);
      /* 下方加热火焰 */
      flameShape(ctx, cx - 30, cy + 34, 0.9, t, AMBER);
      flameShape(ctx, cx + 30, cy + 34, 0.9, t + 1, AMBER);
      ctx.fillStyle = FAINT; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('△', cx, cy + 52);
      ctx.fillText('红色固体表面逐渐变黑', cx, h - 12);
    }, '2Cu + O₂ ═△═ 2CuO',
      '铜在空气中加热，表面<b>逐渐变黑</b>（生成氧化铜）。',
      ['2Cu + O₂', '2CuO', '△']);

    /* ---- 金：真金不怕火炼 ---- */
    oxyCard('金 · 高温也不反应', (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.55;
      /* 金条（始终金灿灿） */
      const gg = ctx.createLinearGradient(cx - 58, cy - 12, cx + 58, cy + 12);
      gg.addColorStop(0, '#f0c040'); gg.addColorStop(0.5, '#ffe08a'); gg.addColorStop(1, '#e0a92e');
      ctx.fillStyle = gg;
      ctx.fillRect(cx - 58, cy - 12, 116, 24);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.strokeRect(cx - 58, cy - 12, 116, 24);
      /* 大火猛烧 */
      flameShape(ctx, cx - 34, cy + 36, 1.1, t, AMBER);
      flameShape(ctx, cx, cy + 40, 1.25, t + 2, AMBER);
      flameShape(ctx, cx + 34, cy + 36, 1.1, t + 1, AMBER);
      ctx.fillStyle = GREEN; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('✔ 烧再久也毫无变化', cx, cy - 26);
      ctx.fillStyle = FAINT; ctx.font = '11px sans-serif';
      ctx.fillText('高温下也不与氧气反应', cx, h - 12);
    }, '"真金不怕火炼"',
      '金即使在<b>高温下也不与氧气反应</b>——化学性质非常稳定。俗话说：<b>"真金不怕火炼"</b>。');

    /* ---- 结论卡 ---- */
    p.appendChild(App.el(
      '<div class="console-card accent" style="margin-top:18px"><div class="card-label">结论</div>' +
      '<div class="z8-cbody"><p><b>大多数金属都能与氧气反应</b>，但反应的<b>难易和剧烈程度不同</b>：镁、铝比较活泼，铁、铜次之，金最不活泼。这也为"金属活动性顺序"提供了证据。</p></div></div>'));
  }

  /* ============================================================
     Panel D · 金属与盐溶液（前置金属换后置金属）
     ============================================================ */
  function buildPanelD(container) {
    const p = panel('Panel D · 金属与某些化合物溶液的反应——前换后，换不换得动？', 'margin-top:22px');
    container.appendChild(p);

    /* 前置知识卡 */
    p.appendChild(App.el(
      '<div class="console-card accent" style="margin-bottom:16px"><div class="card-label">前置知识 · 裁判规则</div>' +
      '<div class="z8-cbody"><p>在金属活动性顺序里，<b>位于前面的金属（K、Ca、Na 除外）能把位于后面的金属从它们化合物的溶液里置换出来</b>。</p></div></div>'));

    const grid = App.el('<div class="z8-grid3"></div>');
    p.appendChild(grid);

    /**
     * 盐溶液实验卡
     * cfg: { title, metal, metalColor, solFrom:[r,g,b,a], solTo:[r,g,b,a], deposit:bool,
     *        depColor, noReact:bool, eq:[l,r], phenomena, verdict }
     */
    function saltExp(cfg) {
      const card = panel(cfg.title);
      const st = { on: false, prog: 0 };
      makeStage(card, 220, (ctx, w, h, t) => {
        ctx.clearRect(0, 0, w, h);
        if (st.on) st.prog = Math.min(st.prog + 0.0045, 1);
        const k = st.prog;
        const tx = w / 2, ty = h * 0.9, tw = 74, th = h * 0.64;
        const lh = th * 0.66;
        /* 试管 */
        ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2, ty - th);
        ctx.lineTo(tx - tw / 2, ty - 14);
        ctx.arc(tx, ty - 14, tw / 2, Math.PI, 0, true);
        ctx.lineTo(tx + tw / 2, ty - th);
        ctx.stroke();
        /* 溶液颜色渐变 */
        const f = cfg.solFrom, to = cfg.solTo;
        const rC = Math.round(f[0] + (to[0] - f[0]) * k);
        const gC = Math.round(f[1] + (to[1] - f[1]) * k);
        const bC = Math.round(f[2] + (to[2] - f[2]) * k);
        const aC = f[3] + (to[3] - f[3]) * k;
        ctx.fillStyle = 'rgba(' + rC + ',' + gC + ',' + bC + ',' + aC + ')';
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2 + 3, ty - lh);
        ctx.lineTo(tx - tw / 2 + 3, ty - 14);
        ctx.arc(tx, ty - 14, tw / 2 - 3, Math.PI, 0, true);
        ctx.lineTo(tx + tw / 2 - 3, ty - lh);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(tx - tw / 2 + 3, ty - lh, tw - 6, 1.5);
        /* 金属条插入 */
        const drop = st.on ? Math.min((st.prog * 8) + 0.3, 1) : 0.3;
        const my = (ty - th - 26) + (ty - 10 - (ty - th - 26)) * drop;
        ctx.fillStyle = cfg.metalColor;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(tx - 9, my - 40, 18, 46 + (ty - my), 6);
        else ctx.rect(tx - 9, my - 40, 18, 46 + (ty - my));
        ctx.fill(); ctx.stroke();
        /* 置换出的金属覆盖层 */
        if (cfg.deposit && k > 0.05) {
          ctx.fillStyle = cfg.depColor;
          const cover = k * (46 + (ty - my) - 8);
          for (let y = 0; y < cover; y += 6) {
            const yy = ty - 6 - y;
            const bump = 3 + (y % 12 === 0 ? 2.5 : 0);
            ctx.beginPath();
            ctx.arc(tx - 9 + Math.sin(y * 1.7 + t) * 1.5, yy, bump * 0.75, 0, 7); ctx.fill();
            ctx.beginPath();
            ctx.arc(tx + 9 + Math.cos(y * 1.3 + t) * 1.5, yy - 3, bump * 0.75, 0, 7); ctx.fill();
          }
        }
        /* 标签 */
        ctx.fillStyle = '#0a0e14'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(cfg.metal, tx, my - 26);
        ctx.fillStyle = FAINT; ctx.font = '12px sans-serif';
        if (cfg.noReact) {
          if (k > 0.4) {
            ctx.fillStyle = 'rgba(148,163,184,0.95)';
            ctx.fillText('⏱ 静置再久——无现象', tx, ty - th - 10);
          }
        } else if (k > 0.95) {
          ctx.fillStyle = GREEN;
          ctx.fillText('✔ 现象已充分展现', tx, ty - th - 10);
        }
      }, cfg.caption);

      const btnRow = App.el('<div class="btn-row" style="margin-top:12px"></div>');
      const bGo = App.el('<button class="btn btn-primary">开始实验</button>');
      const bRe = App.el('<button class="btn btn-ghost">重置</button>');
      bGo.addEventListener('click', () => { st.on = true; });
      bRe.addEventListener('click', () => { st.on = false; st.prog = 0; });
      btnRow.appendChild(bGo); btnRow.appendChild(bRe);
      card.appendChild(btnRow);

      let foot = '';
      if (cfg.eq) foot += '<div class="z8-eqline">' + App.eq(cfg.eq[0], cfg.eq[1]) + '</div>';
      foot += '<div class="z8-exp"><p><span class="tag cyan">现象</span> ' + cfg.phenomena + '</p>' +
        '<p><span class="tag ' + (cfg.noReact ? 'magenta' : 'amber') + '">结论</span> ' + cfg.verdict + '</p></div>';
      card.appendChild(App.el(foot));
      grid.appendChild(card);
    }

    /* ① 铁钉 + 硫酸铜溶液 */
    saltExp({
      title: '实验① · 铁钉 + 硫酸铜溶液',
      caption: '蓝色 → 浅绿色',
      metal: 'Fe', metalColor: '#8d97a3',
      solFrom: [70, 130, 240, 0.5], solTo: [150, 195, 140, 0.5],
      deposit: true, depColor: 'rgba(205,92,55,0.95)',
      eq: ['Fe + CuSO₄', 'FeSO₄ + Cu'],
      phenomena: '铁钉表面覆盖一层<b>红色物质</b>，溶液由<b>蓝色逐渐变为浅绿色</b>。',
      verdict: '铁能把铜从硫酸铜溶液中置换出来 → 活动性 <b>Fe &gt; Cu</b>。'
    });
    /* ② 铜丝 + 硝酸银溶液 */
    saltExp({
      title: '实验② · 铜丝 + 硝酸银溶液',
      caption: '无色 → 蓝色',
      metal: 'Cu', metalColor: '#b4562f',
      solFrom: [210, 222, 232, 0.14], solTo: [70, 130, 240, 0.45],
      deposit: true, depColor: 'rgba(230,238,245,0.95)',
      eq: ['Cu + 2AgNO₃', 'Cu(NO₃)₂ + 2Ag'],
      phenomena: '铜丝表面覆盖一层<b>银白色物质</b>，溶液由无色逐渐变为<b>蓝色</b>。',
      verdict: '铜能把银从硝酸银溶液中置换出来 → 活动性 <b>Cu &gt; Ag</b>。'
    });
    /* ③ 铜丝 + 硫酸亚铁溶液 */
    saltExp({
      title: '实验③ · 铜丝 + 硫酸亚铁溶液',
      caption: '浅绿色，无变化',
      metal: 'Cu', metalColor: '#b4562f',
      solFrom: [150, 195, 140, 0.42], solTo: [150, 195, 140, 0.42],
      deposit: false, noReact: true,
      eq: null,
      phenomena: '<b>无现象</b>（铜丝表面无变化，溶液颜色也不变）。',
      verdict: '铜不能置换出铁 → 说明 <b>铜不如铁活泼</b>（铜排在铁后面）。'
    });

    /* 结论 + 置换反应定义 */
    const row = App.el('<div class="z8-grid2" style="margin-top:18px"></div>');
    p.appendChild(row);
    row.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">三个实验串起来</div>' +
      '<div class="z8-cbody"><p>活动性：<b>Fe &gt; Cu &gt; Ag</b>——与金属活动性顺序表完全吻合！"前换后"不是嘴上说说，是能做实验验证的。</p></div></div>'));
    row.appendChild(App.el(
      '<div class="console-card accent-m"><div class="card-label">置换反应 · 定义（必背）</div>' +
      '<div class="z8-cbody"><p>由<b>一种单质</b>与<b>一种化合物</b>反应，生成<b>另一种单质</b>和<b>另一种化合物</b>的反应，叫做<b>置换反应</b>。</p>' +
      '<p style="margin-top:6px;font-family:var(--mono);color:var(--cyan)">A + BC → B + AC</p>' +
      '<p style="margin-top:6px">金属与酸、金属与化合物溶液的反应都属于置换反应。</p></div></div>'));
  }

  /* ============================================================
     Panel E · 冶炼与防护
     ============================================================ */
  function buildPanelE(container) {
    /* ---- 工业炼铁：高炉动画 + 右侧资料卡 ---- */
    const layout = App.el('<div class="layout-2col" style="margin-top:22px"></div>');
    container.appendChild(layout);
    const left = panel('Panel E · 工业炼铁——高炉里的"还原大戏"');
    const right = App.el('<div class="console"></div>');
    layout.appendChild(left); layout.appendChild(right);

    makeStage(left, 380, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, top = h * 0.10, bot = h * 0.84;
      const tw1 = w * 0.34, tw2 = w * 0.50;      // 上窄下宽
      /* 炉体 */
      ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - tw1 / 2, top);
      ctx.lineTo(cx - tw2 / 2, bot);
      ctx.lineTo(cx + tw2 / 2, bot);
      ctx.lineTo(cx + tw1 / 2, top);
      ctx.closePath(); ctx.stroke();
      /* 炉内：底部高温红光 */
      const heat = ctx.createLinearGradient(0, top, 0, bot);
      heat.addColorStop(0, 'rgba(34,211,238,0.03)');
      heat.addColorStop(0.55, 'rgba(251,191,36,0.06)');
      heat.addColorStop(1, 'rgba(248,113,113,' + (0.22 + 0.06 * Math.sin(t * 5)) + ')');
      ctx.fillStyle = heat;
      ctx.beginPath();
      ctx.moveTo(cx - tw1 / 2 + 2, top + 2);
      ctx.lineTo(cx - tw2 / 2 + 2, bot - 2);
      ctx.lineTo(cx + tw2 / 2 - 2, bot - 2);
      ctx.lineTo(cx + tw1 / 2 - 2, top + 2);
      ctx.closePath(); ctx.fill();
      /* 进料斗 */
      ctx.strokeStyle = 'rgba(226,232,240,0.7)'; ctx.lineWidth = 2;
      ctx.strokeRect(cx - tw1 / 2 - 16, top - 26, tw1 + 32, 16);
      /* 原料颗粒下落：铁矿石(红褐) 焦炭(深灰) 石灰石(浅灰) */
      const ores = ['rgba(160,82,45,0.9)', 'rgba(60,62,70,0.95)', 'rgba(200,205,215,0.85)'];
      for (let i = 0; i < 24; i++) {
        const fr = (t * 0.16 + i * 0.13) % 1;
        const spread = tw1 / 2 + (tw2 - tw1) / 2 * fr;
        const px = cx - spread * 0.8 + ((i * 53.7) % (spread * 1.6));
        const py = top + fr * (bot - top) * 0.92;
        ctx.fillStyle = ores[i % 3];
        ctx.beginPath(); ctx.arc(px, py, 3.4, 0, 7); ctx.fill();
      }
      /* 热空气入口（两侧） */
      [-1, 1].forEach(s => {
        const ax = cx + s * (tw2 / 2 + 34), ay = top + (bot - top) * 0.68;
        ctx.strokeStyle = CYAN; ctx.lineWidth = 2;
        const slide = (t * 30) % 14;
        ctx.beginPath();
        ctx.moveTo(ax + s * 18 - s * slide, ay); ctx.lineTo(ax - s * 6 - s * slide, ay);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax - s * 6 - s * slide, ay);
        ctx.lineTo(ax - s * 12 - s * slide, ay - 4);
        ctx.moveTo(ax - s * 6 - s * slide, ay);
        ctx.lineTo(ax - s * 12 - s * slide, ay + 4);
        ctx.stroke();
        ctx.fillStyle = CYAN; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('热空气', ax + s * 10, ay - 12);
      });
      /* 出铁口（左，铁水） */
      const iy = bot - 6;
      ctx.strokeStyle = 'rgba(248,113,113,0.95)'; ctx.lineWidth = 5;
      ctx.shadowColor = RED; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cx - tw2 / 2 + 4, iy);
      ctx.lineTo(cx - tw2 / 2 - 46, iy + 14 + Math.sin(t * 4) * 1.5);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = RED; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('出铁口·铁水', cx - tw2 / 2 - 44, iy + 30);
      /* 出渣口（右，炉渣） */
      ctx.strokeStyle = 'rgba(148,163,184,0.9)'; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx + tw2 / 2 - 4, iy - 26);
      ctx.lineTo(cx + tw2 / 2 + 46, iy - 12 + Math.sin(t * 4 + 2) * 1.5);
      ctx.stroke();
      ctx.fillStyle = DIM; ctx.font = '12px sans-serif';
      ctx.fillText('出渣口·炉渣', cx + tw2 / 2 + 44, iy - 24);
      /* 顶部标注 */
      ctx.fillStyle = DIM; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('进料口：铁矿石 + 焦炭 + 石灰石', cx, top - 34);
    }, '铁矿石、焦炭、石灰石从顶部加入，铁水从炉底流出');

    right.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">炼铁原理（核心方程式）</div>' +
      '<div style="margin-top:4px">' + App.eq('3CO + Fe₂O₃', '2Fe + 3CO₂', '高温') + '</div>' +
      '<p style="margin-top:8px;line-height:1.8;font-size:13.5px;color:var(--text-dim)">在高温下，利用<b style="color:var(--cyan)">一氧化碳</b>的<b style="color:var(--cyan)">还原性</b>，把铁从铁矿石（如赤铁矿 Fe₂O₃）里还原出来。</p></div>'));
    right.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">三种原料的分工</div>' +
      '<div class="z8-cbody"><p>① <b>焦炭</b>：燃烧<b>提供热量</b>，并与 CO₂ 反应<b>生成还原剂 CO</b>；<br>' +
      '② <b>石灰石</b>：把矿石中的二氧化硅转变为<b>炉渣</b>（造渣）；<br>' +
      '③ <b>铁矿石</b>：提供铁元素（Fe₂O₃ 等）。</p></div></div>'));
    right.appendChild(App.el(
      '<div class="console-card"><div class="card-label">注意区分</div>' +
      '<div class="z8-cbody"><p>高炉炼出来的不是纯铁，而是<b>生铁</b>（含碳 2%～4.3% 的铁合金）；要得到钢还需进一步降低含碳量。</p></div></div>'));

    /* ---- 铁生锈条件：三支试管对照 ---- */
    const pRust = panel('铁生锈的条件 · 三支试管对照实验（点击逐支揭示结果）', 'margin-top:22px');
    container.appendChild(pRust);

    const RUST_TUBES = [
      {
        name: '① 一半浸在水中', cond: '同时接触<b>水和空气</b>',
        water: 0.55, oil: false, dry: false, rust: true,
        verdict: '生锈了！（水面交界处锈得最厉害）'
      },
      {
        name: '② 全浸在煮沸过的蒸馏水中', cond: '水面封一层植物油，<b>只接触水</b>（几乎无氧气）',
        water: 0.92, oil: true, dry: false, rust: false,
        verdict: '不生锈（缺氧气）'
      },
      {
        name: '③ 放在干燥的空气中', cond: '试管里放干燥剂，<b>只接触空气</b>（无水）',
        water: 0, oil: false, dry: true, rust: false,
        verdict: '不生锈（缺水）'
      }
    ];

    const rustRow = App.el('<div class="z8-rustrow"></div>');
    pRust.appendChild(rustRow);

    RUST_TUBES.forEach(cfg => {
      const card = App.el('<div class="panel z8-tube"><div class="panel-title">' + cfg.name + '</div></div>');
      const st = { revealed: false };
      makeStage(card, 210, (ctx, w, h, t) => {
        ctx.clearRect(0, 0, w, h);
        const tx = w / 2, ty = h * 0.9, tw = 62, th = h * 0.68;
        /* 试管 */
        ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2, ty - th);
        ctx.lineTo(tx - tw / 2, ty - 12);
        ctx.arc(tx, ty - 12, tw / 2, Math.PI, 0, true);
        ctx.lineTo(tx + tw / 2, ty - th);
        ctx.stroke();
        /* 水 */
        if (cfg.water > 0) {
          const lh = th * cfg.water;
          ctx.fillStyle = 'rgba(70,130,240,0.28)';
          ctx.beginPath();
          ctx.moveTo(tx - tw / 2 + 3, ty - lh);
          ctx.lineTo(tx - tw / 2 + 3, ty - 12);
          ctx.arc(tx, ty - 12, tw / 2 - 3, Math.PI, 0, true);
          ctx.lineTo(tx + tw / 2 - 3, ty - lh);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(tx - tw / 2 + 3, ty - lh, tw - 6, 1.5);
          /* 植物油层 */
          if (cfg.oil) {
            ctx.fillStyle = 'rgba(251,191,36,0.5)';
            ctx.fillRect(tx - tw / 2 + 3, ty - lh - 9, tw - 6, 9);
            ctx.fillStyle = AMBER; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
            ctx.fillText('植物油', tx + tw / 2 + 6, ty - lh - 2);
          }
        }
        /* 干燥剂 */
        if (cfg.dry) {
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = 'rgba(148,180,220,0.8)';
            ctx.beginPath();
            ctx.arc(tx - 16 + i * 8, ty - 10 - (i % 2) * 5, 3, 0, 7);
            ctx.fill();
          }
          ctx.fillStyle = FAINT; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
          ctx.fillText('干燥剂', tx + tw / 2 + 6, ty - 12);
        }
        /* 铁钉（斜放） */
        const nx1 = tx - 18, ny1 = ty - th - 2;
        const nx2 = tx + 12, ny2 = ty - (cfg.water > 0 ? 22 : 40);
        ctx.strokeStyle = '#8d97a3'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(nx1, ny1); ctx.lineTo(nx2, ny2); ctx.stroke();
        ctx.fillStyle = '#8d97a3';
        ctx.beginPath(); ctx.arc(nx1, ny1, 5, 0, 7); ctx.fill();
        ctx.lineCap = 'butt';
        /* 揭示后：锈斑（水面交界处最密） */
        if (st.revealed && cfg.rust) {
          const waterY = ty - th * cfg.water;
          for (let i = 0; i < 16; i++) {
            const fr = (i * 0.618) % 1;
            const px = nx1 + (nx2 - nx1) * fr + Math.sin(i * 7) * 3;
            const py = waterY - 6 + ((i * 37) % 18);
            ctx.fillStyle = 'rgba(160,82,45,' + (0.55 + 0.35 * Math.sin(t * 2 + i)) + ')';
            ctx.beginPath();
            ctx.arc(px, py, 2 + (i % 3), 0, 7);
            ctx.fill();
          }
        }
        if (!st.revealed) {
          ctx.fillStyle = 'rgba(148,163,184,' + (0.5 + 0.3 * Math.sin(t * 3)) + ')';
          ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('🔍 点击揭示结果', tx, ty - th - 20);
        }
      });
      card.appendChild(App.el(
        '<div class="z8-cbody" style="margin-top:8px"><p>条件：' + cfg.cond + '</p></div>'));
      const verdict = App.el('<div class="z8-verdict"></div>');
      card.appendChild(verdict);
      card.addEventListener('click', () => {
        st.revealed = !st.revealed;
        verdict.className = 'z8-verdict ' + (st.revealed ? (cfg.rust ? 'rust' : 'safe') : '');
        verdict.textContent = st.revealed ? (cfg.rust ? '✘ ' : '✔ ') + cfg.verdict : '';
        card.classList.toggle('revealed', st.revealed);
      });
      rustRow.appendChild(card);
    });

    /* ---- 结论 / 防锈 / 保护资源 ---- */
    pRust.appendChild(App.el(
      '<div class="console-card accent" style="margin-top:18px"><div class="card-label">结论</div>' +
      '<div class="z8-cbody"><p>对比三支试管：<b>铁生锈是铁与氧气、水共同作用的结果</b>（缺一不可）。铁锈的主要成分是 <b>Fe₂O₃·xH₂O</b>，它很<b>疏松</b>，不能阻碍里层的铁继续锈蚀——铁会"一锈到底"。' +
      '<br>对比：铝表面的氧化铝薄膜<b>致密</b>，能把铝保护起来——同样是"氧化膜"，命运大不同。</p></div></div>'));

    const row2 = App.el('<div class="z8-grid2" style="margin-top:16px"></div>');
    pRust.appendChild(row2);
    row2.appendChild(App.el(
      '<div class="console-card accent-m"><div class="card-label">防止铁制品生锈的措施</div>' +
      '<div class="z8-cbody"><p>① 保持铁制品表面<b>洁净和干燥</b>；<br>' +
      '② 在铁制品表面<b>覆盖保护层</b>：刷漆、涂油、镀其他金属（如镀铬、镀锌）；<br>' +
      '③ <b>制成合金</b>：如不锈钢。<br>' +
      '<span style="color:var(--text-faint);font-size:13px">原理：破坏铁生锈的条件——隔绝氧气或水。</span></p></div></div>'));
    row2.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">保护金属资源 · 四条途径</div>' +
      '<div class="z8-cbody"><p>① 防止金属的<b>腐蚀</b>；<br>' +
      '② <b>回收利用</b>废旧金属（节约资源、减少污染）；<br>' +
      '③ 有计划、合理地<b>开采矿物</b>；<br>' +
      '④ <b>寻找金属的代用品</b>（如用塑料代替金属）。</p></div></div>'));
  }

  /* ============================================================
     学霸加餐
     ============================================================ */
  function buildProBox(container) {
    container.appendChild(App.el(
      '<details class="pro-box" style="margin-top:24px"><summary>学霸加餐 · 金属三大压轴题型</summary>' +
      '<div class="pro-body">' +

      /* ① 滤液滤渣问题 */
      '<div class="pro-item"><span class="pro-tag">压轴题型 ①</span><b>滤液滤渣问题："距离远的先反应"</b><br>' +
      '把一定量的 <b>Zn</b> 放入 <span class="hl">Cu(NO₃)₂ 和 AgNO₃ 的混合溶液</span>中：Zn 与两种盐都能反应，' +
      '但 Zn 与 Ag 在顺序表中"距离更远"，<b>Zn 先把 Ag⁺ 全部置换出来，再置换 Cu²⁺</b>。按 Zn 的加入量分四种情况：' +
      '<table class="z8-table"><tr><th>Zn 的量</th><th>滤渣中一定有</th><th>滤液（溶质）中一定有</th></tr>' +
      '<tr><td>① 很少（Ag⁺ 没换完）</td><td>Ag</td><td>Zn(NO₃)₂、Cu(NO₃)₂、AgNO₃</td></tr>' +
      '<tr><td>② 恰好换完 Ag⁺</td><td>Ag</td><td>Zn(NO₃)₂、Cu(NO₃)₂</td></tr>' +
      '<tr><td>③ 换完 Ag⁺，换了一部分 Cu²⁺</td><td>Ag、Cu</td><td>Zn(NO₃)₂、Cu(NO₃)₂</td></tr>' +
      '<tr><td>④ 足量（Cu²⁺ 也换完且 Zn 有剩）</td><td>Ag、Cu、Zn</td><td>Zn(NO₃)₂</td></tr></table>' +
      '<br>解题套路：<b>第一步</b>确定反应顺序（远距离先反应）；<b>第二步</b>看加入金属的量落在哪一段；' +
      '<b>第三步</b>用"一定有"作答——"可能有"的物质在不确定时坚决不写进答案。' +
      '<br>反向判据也常用：<b>滤渣中若加盐酸有气泡 → 滤渣中必有氢前金属（即 Zn 过量）→ 对应第④种情况</b>。' +
      '</div>' +

      /* ② 金属与酸产氢图像题 */
      '<div class="pro-item"><span class="pro-tag">压轴题型 ②</span><b>金属与酸反应的图像题："倾斜看速率，平台看产量"</b><br>' +
      '<b>等质量</b>的 Mg、Al、Zn、Fe 分别与<b>足量</b>同种酸反应（金属全部反应完）：' +
      '<br>· 产生氢气的质量：<span class="hl">Al &gt; Mg &gt; Fe &gt; Zn</span>' +
      '（等质量金属完全反应时，产氢多少取决于"化合价 ÷ 相对原子质量"：3/27 &gt; 2/24 &gt; 2/56 &gt; 2/65）；' +
      '<br>· 反应速率（图像斜率）：<span class="hl">Mg &gt; Al &gt; Zn &gt; Fe</span>（越活泼越快）；' +
      '<br>· 图像读法：<b>线越陡 → 反应越快；平台越高 → 产氢越多</b>。' +
      '<br>· 特例：若<b>酸等量且金属都足量</b>（酸全部反应完），氢气全部由酸提供 → 各组产生氢气的质量<b>相等</b>，四条线平台一样高！' +
      '</div>' +

      /* ③ 天平平衡问题 */
      '<div class="pro-item"><span class="pro-tag">压轴题型 ③</span><b>天平平衡问题：比的是"净增重"</b><br>' +
      '托盘天平两边烧杯里各放金属与酸，反应后天平是否平衡，只需比较两边的<b>净增重 = 加入物质的质量 − 逸出气体的质量</b>：' +
      '<br>· 净增重相等 → 天平<b>仍平衡</b>；' +
      '<br>· 哪边净增重大，指针就<b>偏向哪边</b>（那边下沉）。' +
      '<br>例：两边放等质量、等浓度的足量稀盐酸，分别投入等质量的 Zn 和 Fe（金属均完全反应）：' +
      'Fe 产氢更多（2/56 &gt; 2/65）→ Fe 侧净增重更小 → <b>指针偏向 Zn 一侧</b>。' +
      '<br>判题三步：① 判断金属是否完全反应（决定产氢量由谁说了算）；② 算两边逸出氢气的质量；③ 比较净增重，定指针方向。' +
      '</div>' +

      '</div></details>'));
  }

  /* ============================================================
     模块导出
     ============================================================ */
  window.Zone9 = {
    desc: '金属材料包括<b>纯金属</b>和<b>合金</b>。合金的硬度一般比组成它的纯金属<b>大</b>、熔点<b>低</b>。不同金属的化学性质差异很大，<b>金属活动性顺序</b>是判断反应能否发生的"裁判"。',

    init(container) {
      buildPanelA(container);
      buildPanelB(container);
      buildPanelC(container);
      buildPanelD(container);
      buildPanelE(container);
      buildProBox(container);

      container.appendChild(App.el(
        '<div class="takeaway">🎚️ <b>金属活动性顺序表是金属化学的"总开关"</b>——左边置换氢、前边换后边（K、Ca、Na 除外），记住它，金属这章就通关了一半。</div>'));
    }
  };
})();
