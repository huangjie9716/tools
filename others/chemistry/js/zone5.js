/* ============================================================
   ZONE 05 · 水（第四单元 自然界的水）
   四个二级 Tab：水的净化 / 自然界的水循环 / 水的电解 / 太空用水
   ============================================================ */
(function () {
  'use strict';

  const CYAN = '#22d3ee', MAGENTA = '#f472b6', AMBER = '#fbbf24',
        GREEN = '#34d399', RED = '#f87171', DIM = '#94a3b8', FAINT = '#64748b';

  /* ---------------- 画布舞台辅助 ----------------
     draw(ctx, w, h, t) 每帧调用；元素不可见时跳过重绘；
     首帧由 requestAnimationFrame 启动，禁止同步自调用 */
  function makeStage(parent, height, draw, caption, onClick) {
    const stage = App.el('<div class="stage z5-stage"></div>');
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

    if (onClick) {
      cv.style.cursor = 'pointer';
      cv.addEventListener('click', e => {
        const r = cv.getBoundingClientRect();
        onClick(e.clientX - r.left, e.clientY - r.top, stage.clientWidth, height);
      });
    }

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

  /* 颜色线性插值（浑浊黄褐 → 清澈青） */
  function lerpColor(c0, c1, k, alpha) {
    const r = Math.round(c0[0] + (c1[0] - c0[0]) * k);
    const g = Math.round(c0[1] + (c1[1] - c0[1]) * k);
    const b = Math.round(c0[2] + (c1[2] - c0[2]) * k);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }
  const MUDDY = [150, 124, 66], CLEAR = [34, 211, 238];

  /* ============================================================
     Tab 1 · 水的净化
     ============================================================ */
  function buildTab1(pane) {
    const layout = App.el('<div class="layout-2col"></div>');
    pane.appendChild(layout);
    const left = App.el('<div></div>');
    const right = App.el('<div class="console"></div>');
    layout.appendChild(left); layout.appendChild(right);

    const STEPS = [
      { name: '取水', tag: 'cyan', tagText: '天然水是混合物',
        desc: '从江河、湖泊等天然水源取水。天然水中含有泥沙等<b>不溶性杂质</b>，还含有许多<b>可溶性杂质</b>，属于混合物。' },
      { name: '加絮凝剂沉淀', tag: 'cyan', tagText: '物理变化',
        desc: '加入絮凝剂<b>明矾</b>，明矾溶于水后生成的<b>胶状物</b>能吸附水中悬浮的杂质，使杂质沉降下来。' },
      { name: '过滤', tag: 'cyan', tagText: '物理变化',
        desc: '使水通过滤层，把水中的<b>不溶性固体杂质</b>分离出去。' },
      { name: '活性炭吸附', tag: 'cyan', tagText: '物理变化',
        desc: '<b>活性炭</b>具有疏松多孔的结构，能吸附水中的<b>色素和异味</b>。吸附过程没有生成新物质，属于物理变化。' },
      { name: '投药消毒', tag: 'magenta', tagText: '化学变化',
        desc: '加入消毒剂（如<b>氯气</b>），杀死水中的<b>细菌和病毒</b>。消毒过程生成了新物质，属于化学变化。' },
      { name: '配水泵', tag: 'amber', tagText: '加压输送',
        desc: '配水泵将净化后的自来水<b>加压</b>，送入纵横交错的城市供水管网。' },
      { name: '千家万户', tag: 'green', tagText: '仍是混合物',
        desc: '自来水流入千家万户。注意：经过净化的自来水<b>仍是混合物</b>（含有可溶性杂质），不是纯净物。' }
    ];

    const p1 = App.el('<div class="panel"><div class="panel-title">自来水厂流水线 · 点击各处理池查看说明（自动轮播中）</div></div>');
    left.appendChild(p1);

    const st = { active: 0, lastT: -10, curT: 0 };
    let hitRects = [];

    const stepCard = App.el('<div class="z5-stepcard"></div>');
    function updateCard() {
      const s = STEPS[st.active];
      stepCard.innerHTML =
        '<div class="z5-stephead"><span class="z5-stepnum">' + (st.active + 1) + ' / ' + STEPS.length + '</span>' +
        '<span class="z5-stepname">' + s.name + '</span>' +
        '<span class="tag ' + s.tag + '">' + s.tagText + '</span></div>' +
        '<p class="z5-stepdesc">' + s.desc + '</p>';
    }
    updateCard();

    makeStage(p1, 330, (ctx, w, h, t) => {
      st.curT = t;
      /* 自动依次高亮 */
      if (t - st.lastT > 3.4) {
        st.active = (st.active + 1) % STEPS.length;
        st.lastT = t;
        updateCard();
      }
      ctx.clearRect(0, 0, w, h);

      const groundY = h * 0.86;
      const xs = [w * 0.07, w * 0.21, w * 0.35, w * 0.49, w * 0.63, w * 0.775, w * 0.925];
      const tankTop = h * 0.32, tankH = h * 0.44, tankW = Math.min(w * 0.105, 92);
      const pipeY = h * 0.60;
      hitRects = [];

      /* 地面 */
      ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();

      /* --- 取水：江河（浑浊波浪） --- */
      const riverX1 = xs[1] - tankW / 2 - 6;
      ctx.save();
      ctx.beginPath(); ctx.rect(2, pipeY - 26, riverX1 - 2, groundY - pipeY + 26); ctx.clip();
      for (let row = 0; row < 4; row++) {
        const wy = pipeY - 18 + row * 12;
        ctx.strokeStyle = lerpColor(MUDDY, CLEAR, 0.05, 0.75 - row * 0.12);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 2; x <= riverX1; x += 4) {
          const y = wy + Math.sin(x * 0.09 + t * 2 + row * 1.7) * 3;
          if (x === 2) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      /* 泥沙颗粒 */
      ctx.fillStyle = 'rgba(150,124,66,0.8)';
      for (let i = 0; i < 14; i++) {
        const px = 8 + (i * 37) % Math.max(riverX1 - 16, 10);
        const py = pipeY - 14 + (i * 23) % 30 + Math.sin(t + i) * 2;
        ctx.beginPath(); ctx.arc(px, py, 1.6, 0, 7); ctx.fill();
      }
      ctx.restore();
      hitRects.push({ x: 2, y: pipeY - 30, w: riverX1, h: groundY - pipeY + 34, i: 0 });

      /* --- 管道：江河 → 4 个处理池 → 泵 → 城市 --- */
      const nodeXs = [riverX1 - 4, xs[1], xs[2], xs[3], xs[4], xs[5], xs[6] - 34];
      ctx.strokeStyle = 'rgba(148,163,184,0.45)'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(nodeXs[0], pipeY);
      for (let i = 1; i < nodeXs.length; i++) ctx.lineTo(nodeXs[i], pipeY);
      ctx.stroke();
      /* 管道内流动的水点（颜色沿途变清） */
      const x0 = nodeXs[0], x1 = nodeXs[nodeXs.length - 1];
      for (let i = 0; i < 26; i++) {
        const k = ((t * 0.06 + i / 26) % 1);
        const px = x0 + (x1 - x0) * k;
        ctx.fillStyle = lerpColor(MUDDY, CLEAR, k, 0.9);
        ctx.beginPath(); ctx.arc(px, pipeY, 2.4, 0, 7); ctx.fill();
      }

      /* --- 4 个处理池 --- */
      for (let i = 1; i <= 4; i++) {
        const cx = xs[i], tx = cx - tankW / 2;
        const clarity = i / 5;
        const isActive = st.active === i;
        /* 池体 */
        ctx.fillStyle = 'rgba(10,14,20,0.5)';
        ctx.strokeStyle = isActive ? CYAN : 'rgba(226,232,240,0.55)';
        ctx.lineWidth = isActive ? 2.5 : 1.6;
        if (isActive) { ctx.shadowColor = CYAN; ctx.shadowBlur = 14; }
        ctx.beginPath();
        ctx.moveTo(tx, tankTop); ctx.lineTo(tx, tankTop + tankH);
        ctx.lineTo(tx + tankW, tankTop + tankH); ctx.lineTo(tx + tankW, tankTop);
        ctx.stroke();
        ctx.shadowBlur = 0;
        /* 池水 */
        const waterTop = tankTop + 8;
        ctx.fillStyle = lerpColor(MUDDY, CLEAR, clarity, 0.30);
        ctx.fillRect(tx + 2, waterTop, tankW - 4, tankTop + tankH - 2 - waterTop);
        /* 液面 */
        ctx.fillStyle = lerpColor(MUDDY, CLEAR, clarity, 0.7);
        ctx.fillRect(tx + 2, waterTop + Math.sin(t * 2 + i) * 1.2, tankW - 4, 2);

        if (i === 1) {          /* 絮凝沉淀：絮状颗粒下沉 */
          ctx.fillStyle = 'rgba(226,232,240,0.55)';
          for (let j = 0; j < 10; j++) {
            const fallK = (t * 0.25 + j * 0.17) % 1;
            const px = tx + 10 + (j * 31) % (tankW - 20);
            const py = waterTop + 6 + fallK * (tankH - 26);
            ctx.beginPath(); ctx.arc(px, py, 1.8 + (j % 3) * 0.6, 0, 7); ctx.fill();
          }
          /* 池底沉积层 */
          ctx.fillStyle = 'rgba(150,124,66,0.55)';
          ctx.fillRect(tx + 2, tankTop + tankH - 8, tankW - 4, 6);
        } else if (i === 2) {   /* 过滤：滤层 */
          ctx.fillStyle = 'rgba(251,191,36,0.5)';
          for (let row = 0; row < 3; row++) {
            ctx.fillRect(tx + 4, tankTop + tankH - 26 + row * 7, tankW - 8, 3);
          }
          /* 被截留的杂质 */
          ctx.fillStyle = 'rgba(150,124,66,0.8)';
          for (let j = 0; j < 8; j++) {
            const px = tx + 8 + (j * 29) % (tankW - 16);
            ctx.beginPath(); ctx.arc(px, tankTop + tankH - 30 - (j % 2) * 3, 1.7, 0, 7); ctx.fill();
          }
        } else if (i === 3) {   /* 活性炭：黑色颗粒 */
          ctx.fillStyle = 'rgba(30,32,38,0.95)';
          ctx.fillRect(tx + 2, tankTop + tankH - 20, tankW - 4, 18);
          ctx.fillStyle = 'rgba(148,163,184,0.7)';
          for (let j = 0; j < 12; j++) {
            const px = tx + 6 + (j * 17) % (tankW - 12);
            const py = tankTop + tankH - 17 + (j * 7) % 14;
            ctx.beginPath(); ctx.arc(px, py, 1.4, 0, 7); ctx.fill();
          }
        } else if (i === 4) {   /* 投药消毒：滴落的消毒剂 */
          ctx.fillStyle = MAGENTA;
          for (let j = 0; j < 5; j++) {
            const fallK = (t * 0.5 + j * 0.23) % 1;
            const px = tx + 14 + (j * 23) % (tankW - 28);
            const py = tankTop + 2 + fallK * 26;
            ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 7); ctx.fill();
          }
          ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('✚', cx, waterTop + 22);
        }
        /* 池名 */
        ctx.fillStyle = isActive ? CYAN : DIM;
        ctx.font = (isActive ? 'bold ' : '') + '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(STEPS[i].name, cx, tankTop + tankH + 18);
        /* 当前高亮箭头 */
        if (isActive) {
          ctx.fillStyle = CYAN;
          ctx.beginPath();
          ctx.moveTo(cx, tankTop - 14);
          ctx.lineTo(cx - 6, tankTop - 24); ctx.lineTo(cx + 6, tankTop - 24);
          ctx.closePath(); ctx.fill();
        }
        hitRects.push({ x: tx - 4, y: tankTop - 28, w: tankW + 8, h: tankH + 50, i: i });
      }

      /* --- 配水泵 --- */
      const pumpX = xs[5], pumpY = pipeY;
      const pumpActive = st.active === 5;
      ctx.strokeStyle = pumpActive ? CYAN : 'rgba(226,232,240,0.6)';
      ctx.lineWidth = pumpActive ? 2.5 : 1.8;
      if (pumpActive) { ctx.shadowColor = CYAN; ctx.shadowBlur = 14; }
      ctx.beginPath(); ctx.arc(pumpX, pumpY, 22, 0, 7); ctx.stroke();
      ctx.shadowBlur = 0;
      /* 叶轮 */
      ctx.save();
      ctx.translate(pumpX, pumpY); ctx.rotate(t * 3);
      ctx.strokeStyle = pumpActive ? CYAN : DIM; ctx.lineWidth = 2.5;
      for (let j = 0; j < 3; j++) {
        ctx.rotate(Math.PI * 2 / 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -14); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = pumpActive ? CYAN : DIM;
      ctx.font = (pumpActive ? 'bold ' : '') + '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('配水泵', pumpX, pumpY + 40);
      if (pumpActive) {
        ctx.fillStyle = CYAN;
        ctx.beginPath();
        ctx.moveTo(pumpX, pumpY - 32);
        ctx.lineTo(pumpX - 6, pumpY - 42); ctx.lineTo(pumpX + 6, pumpY - 42);
        ctx.closePath(); ctx.fill();
      }
      hitRects.push({ x: pumpX - 26, y: pumpY - 46, w: 52, h: 92, i: 5 });

      /* --- 千家万户：城市剪影 + 清水 --- */
      const cityX = xs[6] - 34, cityY = groundY;
      const cityActive = st.active === 6;
      const bw = 16;
      for (let j = 0; j < 4; j++) {
        const bh = 34 + (j * 17) % 26;
        ctx.fillStyle = cityActive ? 'rgba(34,211,238,0.28)' : 'rgba(148,163,184,0.22)';
        ctx.strokeStyle = cityActive ? CYAN : 'rgba(148,163,184,0.5)';
        ctx.lineWidth = 1.4;
        ctx.fillRect(cityX + j * (bw + 4), cityY - bh, bw, bh);
        ctx.strokeRect(cityX + j * (bw + 4), cityY - bh, bw, bh);
        /* 亮灯窗户 */
        ctx.fillStyle = 'rgba(251,191,36,0.8)';
        for (let wy2 = 0; wy2 < 2; wy2++) {
          ctx.fillRect(cityX + j * (bw + 4) + 4, cityY - bh + 6 + wy2 * 10, 3, 4);
        }
      }
      /* 水龙头滴下清水 */
      ctx.strokeStyle = 'rgba(226,232,240,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cityX - 16, cityY - 6); ctx.lineTo(cityX - 16, cityY - 18);
      ctx.lineTo(cityX - 4, cityY - 18);
      ctx.stroke();
      ctx.fillStyle = lerpColor(MUDDY, CLEAR, 1, 0.9);
      const dropK = (t * 0.8) % 1;
      ctx.beginPath(); ctx.arc(cityX - 4, cityY - 14 + dropK * 10, 2, 0, 7); ctx.fill();
      ctx.fillStyle = cityActive ? CYAN : DIM;
      ctx.font = (cityActive ? 'bold ' : '') + '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('千家万户', cityX + 30, cityY + 18);
      if (cityActive) {
        ctx.fillStyle = CYAN;
        ctx.beginPath();
        ctx.moveTo(cityX + 30, cityY - 72);
        ctx.lineTo(cityX + 24, cityY - 82); ctx.lineTo(cityX + 36, cityY - 82);
        ctx.closePath(); ctx.fill();
      }
      hitRects.push({ x: cityX - 20, y: cityY - 86, w: 110, h: 108, i: 6 });

      /* 取水标注 */
      ctx.fillStyle = st.active === 0 ? CYAN : DIM;
      ctx.font = (st.active === 0 ? 'bold ' : '') + '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('江河取水', (riverX1 + 2) / 2, groundY + 18);
    }, '浑浊 → 清澈：水流一路闯关，颜色就是成绩单', (mx, my) => {
      for (let k = hitRects.length - 1; k >= 0; k--) {
        const r = hitRects[k];
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
          st.active = r.i;
          st.lastT = st.curT;      /* 暂停自动轮播一轮 */
          updateCard();
          return;
        }
      }
    });

    /* ---- 右侧 console ---- */
    right.appendChild(stepCard);
    right.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">要点 · 物理变化还是化学变化？</div>' +
      '<p style="line-height:2;font-size:14px;color:var(--text-dim)">' +
      '<span class="tag cyan">物理变化</span> 沉淀、过滤、吸附（没有生成新物质）<br>' +
      '<span class="tag magenta">化学变化</span> 投药消毒（杀死细菌和病毒，生成了新物质）<br>' +
      '<span class="tag amber">易错点</span> 经过净化的自来水<b style="color:var(--amber)">仍是混合物</b>，因为水中还含有可溶性杂质。</p></div>'));
    right.appendChild(App.el(
      '<div class="console-card"><div class="card-label">净水程度排序</div>' +
      '<p style="line-height:2;font-size:14px;color:var(--text-dim)">沉淀 → 过滤 → 吸附 → <b style="color:var(--cyan)">蒸馏（净化程度最高）</b>。蒸馏得到的蒸馏水是纯净物。</p></div>'));

    /* ================= 硬水与软水 ================= */
    const p2 = App.el('<div class="panel" style="margin-top:20px"><div class="panel-title">硬水与软水 · 肥皂水鉴别实验</div>' +
      '<p class="z5-hint">两只烧杯里一只是<b>硬水</b>、一只是<b>软水</b>（身份保密）。选一只取样，加入肥皂水振荡，<b>先观察现象，再猜一猜</b>，最后揭晓答案！</p></div>');
    left.appendChild(p2);

    const hw = { sample: null, map: { A: 'hard', B: 'soft' }, shaking: false, prog: 0, judged: false };
    function resetSamples() {
      const aIsHard = Math.random() < 0.5;
      hw.map.A = aIsHard ? 'hard' : 'soft';
      hw.map.B = aIsHard ? 'soft' : 'hard';
      hw.sample = null; hw.shaking = false; hw.prog = 0; hw.judged = false;
      fb2.className = 'z5-feedback'; fb2.innerHTML = '';
      guessRow.classList.add('z5-hidden');
      btnShake.disabled = true;
      [btnA, btnB].forEach(b => b.classList.remove('on'));
    }

    makeStage(p2, 300, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      if (hw.shaking && hw.prog < 1) hw.prog = Math.min(hw.prog + 0.008, 1);
      const tx = w / 2, ty = h * 0.90, tw = 84, th = h * 0.66;
      /* 振荡阶段试管左右晃 */
      const shakeX = (hw.shaking && hw.prog < 0.45) ? Math.sin(t * 26) * 8 * (1 - hw.prog / 0.45) : 0;
      ctx.save();
      ctx.translate(shakeX, 0);
      /* 试管 */
      ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2, ty - th);
      ctx.lineTo(tx - tw / 2, ty - 16);
      ctx.arc(tx, ty - 16, tw / 2, Math.PI, 0, true);
      ctx.lineTo(tx + tw / 2, ty - th);
      ctx.stroke();
      const kind = hw.sample ? hw.map[hw.sample] : null;
      const lh = th * 0.58;
      /* 水 */
      if (hw.sample) {
        ctx.fillStyle = 'rgba(34,211,238,0.18)';
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2 + 3, ty - lh);
        ctx.lineTo(tx - tw / 2 + 3, ty - 16);
        ctx.arc(tx, ty - 16, tw / 2 - 3, Math.PI, 0, true);
        ctx.lineTo(tx + tw / 2 - 3, ty - lh);
        ctx.closePath(); ctx.fill();
      }
      /* 泡沫层：软水多而厚，硬水少而薄 */
      if (hw.prog > 0.4) {
        const foamTarget = kind === 'soft' ? th * 0.30 : th * 0.07;
        const foamH = foamTarget * Math.min((hw.prog - 0.4) / 0.6, 1);
        const foamTop = ty - lh - foamH;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let x = tx - tw / 2 + 5; x < tx + tw / 2 - 5; x += 6) {
          const r = 3 + Math.sin(x * 1.3 + t * 2) * 1.2;
          ctx.beginPath(); ctx.arc(x, foamTop + 3 + Math.sin(x + t * 3) * 1.5, r, 0, 7); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(tx - tw / 2 + 3, foamTop + 4, tw - 6, foamH - 4);
        /* 硬水：浮渣 */
        if (kind === 'hard' && hw.prog > 0.7) {
          ctx.fillStyle = 'rgba(150,124,66,0.9)';
          for (let j = 0; j < 9; j++) {
            const px = tx - tw / 2 + 8 + (j * 23) % (tw - 16);
            ctx.beginPath(); ctx.arc(px, foamTop - 2 + (j % 3), 2.2, 0, 7); ctx.fill();
          }
        }
      }
      /* 振荡时的气泡 */
      if (hw.shaking && hw.prog < 0.6) {
        ctx.fillStyle = 'rgba(224,247,255,0.7)';
        for (let j = 0; j < 12; j++) {
          const bt = (t * 1.1 + j * 0.17) % 1;
          ctx.beginPath();
          ctx.arc(tx - 28 + (j * 41) % 56, ty - 24 - bt * (lh - 20), 1.5 + bt * 2, 0, 7);
          ctx.fill();
        }
      }
      ctx.restore();
      /* 标注 */
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      if (!hw.sample) ctx.fillText('请先选择一个水样', tx, ty - th - 14);
      else if (hw.prog < 0.05) ctx.fillText('水样 ' + hw.sample + '（身份保密）', tx, ty - th - 14);
      else if (hw.prog < 1) ctx.fillText('加入肥皂水，振荡中…', tx, ty - th - 14);
      else ctx.fillText('观察泡沫和浮渣，猜猜它是硬水还是软水？', tx, ty - th - 14);
    }, '泡沫丰富 = 软水；泡沫少、浮渣多 = 硬水');

    const btnRowW = App.el('<div class="btn-row" style="margin-top:12px"></div>');
    const btnA = App.el('<button class="btn">取水样 A</button>');
    const btnB = App.el('<button class="btn">取水样 B</button>');
    const btnShake = App.el('<button class="btn btn-primary" disabled>加肥皂水振荡</button>');
    const btnReW = App.el('<button class="btn btn-ghost">换两个新水样</button>');
    btnRowW.appendChild(btnA); btnRowW.appendChild(btnB);
    btnRowW.appendChild(btnShake); btnRowW.appendChild(btnReW);
    p2.appendChild(btnRowW);

    const guessRow = App.el('<div class="z5-guessrow z5-hidden">' +
      '<span style="font-size:13px;color:var(--text-faint);align-self:center">你的判断：</span></div>');
    const btnGuessHard = App.el('<button class="btn">我猜是硬水</button>');
    const btnGuessSoft = App.el('<button class="btn">我猜是软水</button>');
    guessRow.appendChild(btnGuessHard); guessRow.appendChild(btnGuessSoft);
    p2.appendChild(guessRow);
    const fb2 = App.el('<div class="z5-feedback"></div>');
    p2.appendChild(fb2);

    function pickSample(s) {
      hw.sample = s; hw.shaking = false; hw.prog = 0; hw.judged = false;
      btnShake.disabled = false;
      btnA.classList.toggle('on', s === 'A');
      btnB.classList.toggle('on', s === 'B');
      guessRow.classList.add('z5-hidden');
      fb2.className = 'z5-feedback'; fb2.innerHTML = '';
    }
    btnA.addEventListener('click', () => pickSample('A'));
    btnB.addEventListener('click', () => pickSample('B'));
    btnShake.addEventListener('click', () => {
      if (!hw.sample) return;
      hw.shaking = true; hw.prog = 0; hw.judged = false;
      guessRow.classList.remove('z5-hidden');
      fb2.className = 'z5-feedback'; fb2.innerHTML = '';
    });
    btnReW.addEventListener('click', resetSamples);

    function judge(guess) {
      if (!hw.sample || hw.prog < 1 || hw.judged) return;
      hw.judged = true;
      const truth = hw.map[hw.sample];
      const ok = guess === truth;
      fb2.className = 'z5-feedback ' + (ok ? 'good' : 'oops');
      fb2.innerHTML = (ok ? '🎉 判断正确！' : '❌ 猜错啦。') +
        '水样 ' + hw.sample + ' 是<b>' + (truth === 'hard' ? '硬水' : '软水') + '</b>：' +
        (truth === 'hard'
          ? '加入肥皂水后<b>泡沫少、浮渣多</b>。'
          : '加入肥皂水后<b>泡沫丰富</b>。') +
        '<br><span style="font-size:13px;color:var(--text-faint)">硬水含有较多可溶性钙、镁化合物；软水不含或含较少的可溶性钙、镁化合物。</span>';
    }
    btnGuessHard.addEventListener('click', () => judge('hard'));
    btnGuessSoft.addEventListener('click', () => judge('soft'));
    resetSamples();

    /* ---- 硬水软化卡 ---- */
    left.appendChild(App.el(
      '<div class="layout-2col" style="margin-top:20px">' +
      '<div class="console-card accent"><div class="card-label">概念 · 硬水与软水</div>' +
      '<p style="line-height:1.95;font-size:14px;color:var(--text-dim)">' +
      '<b style="color:var(--cyan)">硬水</b>：含有<b style="color:var(--cyan)">较多</b>可溶性钙、镁化合物的水；<br>' +
      '<b style="color:var(--cyan)">软水</b>：<b style="color:var(--cyan)">不含或含较少</b>可溶性钙、镁化合物的水。<br>' +
      '硬水洗衣浪费肥皂、锅炉用硬水会结水垢，甚至引起爆炸。</p></div>' +
      '<div class="console-card accent-a"><div class="card-label">软化 · 降低水的硬度</div>' +
      '<p style="line-height:1.95;font-size:14px;color:var(--text-dim)">' +
      '<span class="tag amber">生活中</span> 用<b style="color:var(--amber)">煮沸</b>的方法降低水的硬度；<br>' +
      '<span class="tag cyan">实验室</span> 用<b style="color:var(--cyan)">蒸馏</b>的方法——蒸馏是净化程度最高的净水方法，蒸馏水是纯净物。</p></div>' +
      '</div>'));
  }

  /* ============================================================
     Tab 2 · 自然界的水循环
     ============================================================ */
  function buildTab2(pane) {
    const p = App.el('<div class="panel"><div class="panel-title">自然界的水循环 · 点击"蒸发 / 凝结 / 降水 / 径流"四个环节查看说明</div></div>');
    pane.appendChild(p);

    const INFO = {
      evap: '<b>蒸发</b>：在太阳照射下，海洋、江河、湖泊中的水吸收热量，变成<b>水蒸气</b>升到空中（汽化，物理变化）。',
      cond: '<b>凝结</b>：水蒸气升到高空后遇冷，<b>液化成小水滴</b>或凝华成小冰晶，聚集在一起形成云。',
      rain: '<b>降水</b>：云中的小水滴、小冰晶不断变大，空气托不住时就落回地面，形成<b>雨、雪</b>等降水。',
      flow: '<b>地表径流</b>：落到地面的水一部分渗入地下，一部分沿地表汇成溪流、江河，最终<b>流回海洋</b>，开始新一轮循环。'
    };
    const infoCard = App.el('<div class="z5-cycleinfo"><span style="color:var(--text-faint);font-size:13px">👆 点击循环中的四个环节，看看水在旅途的每一站发生了什么</span></div>');

    let hits = [];
    makeStage(p, 380, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      hits = [];
      const groundY = h * 0.80;

      /* 太阳 */
      const sunX = w * 0.12, sunY = h * 0.16;
      ctx.save();
      ctx.strokeStyle = 'rgba(251,191,36,0.8)'; ctx.lineWidth = 2.5;
      ctx.translate(sunX, sunY); ctx.rotate(t * 0.15);
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, -40); ctx.stroke();
      }
      ctx.restore();
      const sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 26);
      sg.addColorStop(0, '#fff7d6'); sg.addColorStop(0.5, AMBER); sg.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, 7); ctx.fill();

      /* 山（左侧） */
      const mPeakX = w * 0.30, mPeakY = h * 0.34;
      ctx.fillStyle = 'rgba(148,163,184,0.18)';
      ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(w * 0.06, groundY); ctx.lineTo(mPeakX, mPeakY); ctx.lineTo(w * 0.52, groundY);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      /* 雪顶 */
      ctx.fillStyle = 'rgba(226,232,240,0.85)';
      ctx.beginPath();
      ctx.moveTo(mPeakX - 22, mPeakY + 34); ctx.lineTo(mPeakX, mPeakY); ctx.lineTo(mPeakX + 22, mPeakY + 34);
      ctx.lineTo(mPeakX + 10, mPeakY + 28); ctx.lineTo(mPeakX, mPeakY + 36); ctx.lineTo(mPeakX - 10, mPeakY + 28);
      ctx.closePath(); ctx.fill();

      /* 云 */
      const cloudX = w * 0.52 + Math.sin(t * 0.3) * 8, cloudY = h * 0.18;
      ctx.fillStyle = 'rgba(148,163,184,0.55)';
      [[0, 0, 30], [-30, 8, 22], [30, 8, 24], [8, -12, 22], [-14, -10, 18]].forEach(c => {
        ctx.beginPath(); ctx.arc(cloudX + c[0], cloudY + c[1], c[2], 0, 7); ctx.fill();
      });
      ctx.fillStyle = 'rgba(226,232,240,0.25)';
      ctx.beginPath(); ctx.ellipse(cloudX, cloudY + 12, 46, 14, 0, 0, 7); ctx.fill();
      hits.push({ x: cloudX - 58, y: cloudY - 30, w: 116, h: 66, k: 'cond' });

      /* 降水：云 → 山 */
      ctx.fillStyle = 'rgba(34,211,238,0.8)';
      for (let i = 0; i < 16; i++) {
        const fallK = (t * 0.55 + i * 0.11) % 1;
        const rx = cloudX - 44 + (i * 31) % 88;
        const ry = cloudY + 26 + fallK * (mPeakY + 66 - cloudY);
        ctx.beginPath(); ctx.ellipse(rx, ry, 1.6, 4.5, 0, 0, 7); ctx.fill();
      }
      hits.push({ x: cloudX - 52, y: cloudY + 24, w: 104, h: groundY - cloudY - 40, k: 'rain' });

      /* 海洋（右下） */
      ctx.save();
      ctx.beginPath(); ctx.rect(w * 0.56, h * 0.62, w * 0.44, groundY - h * 0.62 + 30); ctx.clip();
      const og = ctx.createLinearGradient(0, h * 0.62, 0, groundY + 30);
      og.addColorStop(0, 'rgba(34,211,238,0.35)'); og.addColorStop(1, 'rgba(34,211,238,0.10)');
      ctx.fillStyle = og;
      ctx.fillRect(w * 0.56, h * 0.62, w * 0.44, groundY - h * 0.62 + 30);
      for (let row = 0; row < 4; row++) {
        const wy = h * 0.62 + 6 + row * 14;
        ctx.strokeStyle = 'rgba(34,211,238,' + (0.8 - row * 0.15) + ')'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = w * 0.56; x <= w; x += 4) {
          const y = wy + Math.sin(x * 0.06 + t * 2 + row * 2.2) * 3;
          if (x === w * 0.56) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('海 洋', w * 0.80, groundY + 22);

      /* 蒸发：海面上升的水汽粒子 */
      for (let i = 0; i < 14; i++) {
        const riseK = (t * 0.28 + i * 0.13) % 1;
        const ex = w * 0.62 + (i * 53) % (w * 0.30);
        const ey = h * 0.62 - riseK * (h * 0.62 - cloudY - 24);
        ctx.fillStyle = 'rgba(224,247,255,' + (0.85 - riseK * 0.5) + ')';
        ctx.beginPath(); ctx.arc(ex + Math.sin(t * 2 + i) * 5, ey, 2.2, 0, 7); ctx.fill();
      }
      /* 蒸发箭头 */
      ctx.strokeStyle = 'rgba(34,211,238,0.7)'; ctx.lineWidth = 2;
      const eaX = w * 0.90;
      ctx.beginPath(); ctx.moveTo(eaX, h * 0.60); ctx.lineTo(eaX, cloudY + 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(eaX, cloudY + 36);
      ctx.lineTo(eaX - 5, cloudY + 48); ctx.lineTo(eaX + 5, cloudY + 48);
      ctx.closePath(); ctx.fillStyle = 'rgba(34,211,238,0.7)'; ctx.fill();
      hits.push({ x: w * 0.60, y: cloudY + 26, w: w * 0.40, h: h * 0.36, k: 'evap' });

      /* 地表径流：山上的溪流入海 */
      ctx.strokeStyle = 'rgba(34,211,238,0.85)'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mPeakX + 6, mPeakY + 40);
      ctx.quadraticCurveTo(w * 0.42, h * 0.62, w * 0.50, groundY - 6);
      ctx.quadraticCurveTo(w * 0.54, groundY, w * 0.58, groundY - 8);
      ctx.stroke();
      /* 流动虚点 */
      for (let i = 0; i < 8; i++) {
        const fk = (t * 0.4 + i / 8) % 1;
        const fx = mPeakX + 6 + (w * 0.58 - mPeakX - 6) * fk;
        const fy = (mPeakY + 40) + (groundY - 8 - mPeakY - 40) * (fk * fk * 0.6 + fk * 0.4);
        ctx.fillStyle = 'rgba(224,247,255,0.9)';
        ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, 7); ctx.fill();
      }
      hits.push({ x: w * 0.30, y: mPeakY + 34, w: w * 0.30, h: groundY - mPeakY - 26, k: 'flow' });

      /* 环节标签 */
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      const labels = [
        ['蒸发', w * 0.90, cloudY + 62, 'rgba(34,211,238,1)'],
        ['凝结', cloudX, cloudY - 40, 'rgba(226,232,240,1)'],
        ['降水', cloudX - 70, (cloudY + groundY) / 2, 'rgba(34,211,238,1)'],
        ['地表径流', w * 0.44, groundY - 26, 'rgba(52,211,153,1)']
      ];
      labels.forEach(L => {
        ctx.fillStyle = L[3];
        ctx.shadowColor = L[3]; ctx.shadowBlur = 8;
        ctx.fillText(L[0], L[1], L[2]);
        ctx.shadowBlur = 0;
      });
      ctx.fillStyle = FAINT; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('水的天然循环：三态变化，都属于物理变化', 12, h - 12);
    }, '蒸发 → 凝结 → 降水 → 径流 → 回到海洋', (mx, my) => {
      for (let k = hits.length - 1; k >= 0; k--) {
        const r = hits[k];
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
          infoCard.innerHTML = INFO[r.k];
          return;
        }
      }
    });
    p.appendChild(infoCard);

    /* ---- 爱护水资源 ---- */
    pane.appendChild(App.el(
      '<div class="layout-2col" style="margin-top:20px">' +
      '<div class="console-card accent"><div class="card-label">水资源现状 · 多还是少？</div>' +
      '<p style="line-height:2;font-size:14px;color:var(--text-dim)">' +
      '地球表面约 <b style="color:var(--cyan)">71%</b> 被水覆盖，看似"取之不尽"，但淡水只占全球水储量的约 <b style="color:var(--amber)">2.53%</b>，' +
      '其中大部分还藏在两极冰川和高山冰雪中，<b style="color:var(--amber)">可利用的淡水资源更少</b>。所以——缺水，离我们并不遥远。</p></div>' +
      '<div class="console-card accent-m"><div class="card-label">节约用水 · 防治水体污染</div>' +
      '<p style="line-height:2.05;font-size:14px;color:var(--text-dim)">' +
      '<span class="tag green">节约用水</span> 农业上改大水漫灌为<b style="color:var(--green)">喷灌、滴灌</b>；工业用水重复利用；生活中<b style="color:var(--green)">一水多用</b>（如淘米水浇花）。<br>' +
      '<span class="tag magenta">防治污染</span> 工业废水处理<b style="color:var(--magenta)">达标后排放</b>；农业上<b style="color:var(--magenta)">合理使用化肥、农药</b>；生活污水<b style="color:var(--magenta)">集中处理</b>后排放。</p></div>' +
      '</div>'));
  }

  /* ============================================================
     Tab 3 · 水的电解
     ============================================================ */
  function buildTab3(pane) {
    const layout = App.el('<div class="layout-2col"></div>');
    pane.appendChild(layout);
    const left = App.el('<div></div>');
    const right = App.el('<div class="console"></div>');
    layout.appendChild(left); layout.appendChild(right);

    const p = App.el('<div class="panel"><div class="panel-title">电解水实验 · 负极产氢、正极产氧，体积比 2 : 1</div></div>');
    left.appendChild(p);

    /* acc = 已收集的负极气体 mL；tResume = 本次通电起始时刻（与 draw 的 t 同源）；
       用时间（而非帧数）累积，保证任何刷新率下速率一致、负正极严格 2 : 1 */
    const st = { on: false, acc: 0, tResume: 0, curT: 0, test: null, testedN: false, testedP: false };
    const MAXV = 24;   /* 负极最多收集 24 mL（正极即 12 mL） */
    const RATE = 1.8;  /* 负极集气速率 mL/s */
    function curVol() {
      return st.on ? Math.min(st.acc + (st.curT - st.tResume) * RATE, MAXV) : st.acc;
    }

    makeStage(p, 410, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      st.curT = t;
      const volN = st.on ? Math.min(st.acc + (t - st.tResume) * RATE, MAXV) : st.acc;
      const volP = volN / 2;   /* 严格 2 : 1 */

      const tubeTop = 70, tubeBot = 330, tubeW = 54;
      const negX = w * 0.30, posX = w * 0.70;             /* 左负极、右正极 */
      const troughY0 = 316, troughY1 = 372;
      const pxPerMl = (tubeBot - 14 - (tubeTop + 12)) / (MAXV + 2);

      /* 直流电源 */
      ctx.fillStyle = 'rgba(148,163,184,0.16)';
      ctx.strokeStyle = 'rgba(226,232,240,0.6)'; ctx.lineWidth = 1.8;
      const bw2 = 96, bx = w / 2 - bw2 / 2;
      ctx.fillRect(bx, 14, bw2, 34); ctx.strokeRect(bx, 14, bw2, 34);
      ctx.fillStyle = DIM; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('直流电源', w / 2, 35);
      ctx.fillStyle = MAGENTA; ctx.font = 'bold 15px sans-serif';
      ctx.fillText('−', bx - 12, 36);
      ctx.fillStyle = RED;
      ctx.fillText('+', bx + bw2 + 12, 36);

      /* 导线：电源 → 两电极 */
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(244,114,182,0.7)';
      ctx.beginPath(); ctx.moveTo(bx - 2, 31); ctx.lineTo(negX, 31); ctx.lineTo(negX, tubeBot - 24); ctx.stroke();
      ctx.strokeStyle = 'rgba(248,113,113,0.7)';
      ctx.beginPath(); ctx.moveTo(bx + bw2 + 2, 31); ctx.lineTo(posX, 31); ctx.lineTo(posX, tubeBot - 24); ctx.stroke();

      /* 水槽 */
      ctx.fillStyle = 'rgba(34,211,238,0.10)';
      ctx.strokeStyle = 'rgba(226,232,240,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.10, troughY0); ctx.lineTo(w * 0.10, troughY1);
      ctx.lineTo(w * 0.90, troughY1); ctx.lineTo(w * 0.90, troughY0);
      ctx.stroke();
      ctx.fillRect(w * 0.10 + 2, troughY0 + 4, w * 0.80 - 4, troughY1 - troughY0 - 6);
      ctx.fillStyle = 'rgba(34,211,238,0.5)';
      ctx.fillRect(w * 0.10 + 2, troughY0 + 4, w * 0.80 - 4, 2);
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('水（加入少量硫酸钠增强导电性）', w / 2, troughY1 + 18);

      /* 两支倒置玻璃管 */
      [[negX, volN, 'neg'], [posX, volP, 'pos']].forEach(cfg => {
        const cx = cfg[0], vol = cfg[1], kind = cfg[2];
        const tx = cx - tubeW / 2;
        const gasPx = vol * pxPerMl;
        const liqY = tubeTop + 12 + gasPx;
        /* 管身（顶部封闭、底部开口） */
        ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(tx, tubeBot);
        ctx.lineTo(tx, tubeTop + 10);
        ctx.arc(cx, tubeTop + 10, tubeW / 2, Math.PI, 0);
        ctx.lineTo(tx + tubeW, tubeBot);
        ctx.stroke();
        /* 管内水 */
        ctx.fillStyle = 'rgba(34,211,238,0.16)';
        ctx.fillRect(tx + 2, liqY, tubeW - 4, tubeBot - liqY);
        ctx.fillStyle = 'rgba(34,211,238,0.55)';
        ctx.fillRect(tx + 2, liqY, tubeW - 4, 1.8);
        /* 管内气体 */
        if (vol > 0.3) {
          const gg = ctx.createLinearGradient(0, tubeTop + 4, 0, liqY);
          const gc = kind === 'neg' ? '34,211,238' : '52,211,153';
          gg.addColorStop(0, 'rgba(' + gc + ',0.35)');
          gg.addColorStop(1, 'rgba(' + gc + ',0.10)');
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.moveTo(tx + 2, liqY);
          ctx.lineTo(tx + 2, tubeTop + 10);
          ctx.arc(cx, tubeTop + 10, tubeW / 2 - 2, Math.PI, 0);
          ctx.lineTo(tx + tubeW - 2, liqY);
          ctx.closePath(); ctx.fill();
        }
        /* 刻度（每 5 mL 一格） */
        ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.lineWidth = 1;
        ctx.fillStyle = FAINT; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
        for (let v = 0; v <= MAXV + 2; v += 5) {
          const yy = tubeTop + 12 + v * pxPerMl;
          ctx.beginPath(); ctx.moveTo(tx - 6, yy); ctx.lineTo(tx - 1, yy); ctx.stroke();
          ctx.fillText(String(v), tx - 8, yy + 3);
        }
        /* 电极 */
        ctx.fillStyle = kind === 'neg' ? 'rgba(244,114,182,0.9)' : 'rgba(248,113,113,0.9)';
        ctx.fillRect(cx - 12, tubeBot - 24, 24, 6);
        ctx.fillStyle = kind === 'neg' ? MAGENTA : RED;
        ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(kind === 'neg' ? '负极' : '正极', cx, tubeBot + 16);
        /* 通电时的气泡（负极约 2 倍密度） */
        if (st.on && volN < MAXV) {
          const nBub = kind === 'neg' ? 14 : 7;
          ctx.fillStyle = 'rgba(224,247,255,0.85)';
          for (let i = 0; i < nBub; i++) {
            const bt = (t * (kind === 'neg' ? 0.9 : 0.75) + i * 0.19) % 1;
            const bxx = cx - 14 + (i * 29) % 28 + Math.sin(t * 4 + i) * 2;
            const byy = tubeBot - 28 - bt * (tubeBot - 28 - liqY - 4);
            if (byy > liqY + 3) {
              ctx.beginPath(); ctx.arc(bxx, byy, 1.4 + bt * 1.8, 0, 7); ctx.fill();
            }
          }
        }
        /* 体积读数 */
        const gasName = kind === 'neg' ? (st.testedN ? ' H₂' : '') : (st.testedP ? ' O₂' : '');
        ctx.fillStyle = kind === 'neg' ? CYAN : GREEN;
        ctx.font = 'bold 13px Consolas, monospace'; ctx.textAlign = 'center';
        ctx.fillText(vol.toFixed(1) + ' mL' + gasName, cx, tubeTop - 14);
        ctx.fillStyle = FAINT; ctx.font = '11px sans-serif';
        ctx.fillText(kind === 'neg' ? '负极气体' : '正极气体', cx, tubeTop - 30);
      });

      /* 体积比提示 */
      if (volN > 1) {
        ctx.fillStyle = AMBER; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('负极 : 正极 = ' + volN.toFixed(1) + ' : ' + volP.toFixed(1) + ' ≈ 2 : 1', w / 2, 62);
      }

      /* ---- 气体检验动画 ---- */
      if (st.test) {
        const el = t - st.test.t0;
        const k = Math.min(el / 1.2, 1);                     /* 木条伸入进度 */
        const targetX = st.test.type === 'pos' ? posX : negX;
        const sx = w / 2 + (targetX - w / 2) * k;
        const sy = h - 40 - (h - 40 - (tubeTop - 24)) * k;
        if (el < 4.2) {
          /* 木条 */
          ctx.save();
          ctx.translate(sx, sy); ctx.rotate(-0.5);
          ctx.fillStyle = '#a87f4f';
          ctx.fillRect(-4, -4, 58, 8);
          ctx.restore();
          const tipX = sx - 6 * Math.cos(-0.5), tipY = sy - 6 * Math.sin(-0.5);
          if (st.test.type === 'pos') {
            /* 带火星的木条 → 复燃 */
            if (k < 1) {
              ctx.fillStyle = RED;
              ctx.shadowColor = RED; ctx.shadowBlur = 10;
              ctx.beginPath(); ctx.arc(tipX, tipY, 3 + Math.sin(t * 10), 0, 7); ctx.fill();
              ctx.shadowBlur = 0;
            } else {
              flameShape(ctx, tipX, tipY + 4, 1.5, t, AMBER);
              ctx.fillStyle = GREEN; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
              ctx.fillText('木条复燃！', targetX, tubeTop - 46);
            }
          } else {
            /* 燃着的木条 → 气体燃烧，淡蓝色火焰 */
            flameShape(ctx, tipX, tipY + 4, 1.1, t, AMBER);
            if (k >= 1) {
              flameShape(ctx, targetX, tubeTop + 2, 1.6, t, '#60a5fa');
              ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
              ctx.fillText('气体燃烧，淡蓝色火焰！', targetX, tubeTop - 46);
            }
          }
        }
      }
    }, '通电后两电极冒气泡，负极气体体积约为正极的 2 倍');

    /* ---- 按钮 ---- */
    const btnRow = App.el('<div class="btn-row" style="margin-top:12px"></div>');
    const btnPower = App.el('<button class="btn btn-primary">通 电</button>');
    const btnTestP = App.el('<button class="btn" disabled>检验正极气体</button>');
    const btnTestN = App.el('<button class="btn" disabled>检验负极气体</button>');
    const btnRe = App.el('<button class="btn btn-ghost">重置</button>');
    btnRow.appendChild(btnPower); btnRow.appendChild(btnTestP);
    btnRow.appendChild(btnTestN); btnRow.appendChild(btnRe);
    p.appendChild(btnRow);
    const fb = App.el('<div class="z5-feedback"></div>');
    p.appendChild(fb);

    function syncBtns() {
      btnPower.textContent = st.on ? '停 止' : '通 电';
      const canTest = !st.on && curVol() > 1 && !st.test;
      btnTestP.disabled = !canTest;
      btnTestN.disabled = !canTest;
    }
    btnPower.addEventListener('click', () => {
      if (st.on) { st.acc = curVol(); st.on = false; }
      else if (st.acc < MAXV) {
        st.tResume = st.curT; st.on = true; st.test = null;
        fb.className = 'z5-feedback'; fb.innerHTML = '';
      }
      syncBtns();
    });
    btnRe.addEventListener('click', () => {
      st.on = false; st.acc = 0; st.test = null; st.testedN = false; st.testedP = false;
      fb.className = 'z5-feedback'; fb.innerHTML = '';
      syncBtns();
    });
    function doTest(type) {
      st.test = { type: type, t0: null };
      /* 用下一帧时间戳启动动画 */
      requestAnimationFrame(() => { st.test.t0 = performance.now() / 1000 - tBase; });
      syncBtns();
      if (type === 'pos') {
        st.testedP = true;
        fb.className = 'z5-feedback good';
        fb.innerHTML = '<span class="tag green">正极气体</span> 把<b>带火星的木条</b>伸入正极气体中，<b>木条复燃</b>——证明正极产生的气体是<b>氧气（O₂）</b>。';
      } else {
        st.testedN = true;
        fb.className = 'z5-feedback good';
        fb.innerHTML = '<span class="tag cyan">负极气体</span> 用<b>燃着的木条</b>点燃负极气体，气体燃烧、产生<b>淡蓝色火焰</b>——证明负极产生的气体是<b>氢气（H₂）</b>。' +
          '<div style="margin-top:6px">' + App.eq('2H₂ + O₂', '2H₂O', '点燃') + '</div>';
      }
      setTimeout(() => { st.test = null; syncBtns(); }, 4300);
    }
    /* test.t0 需要与 draw 的 t 同源：记录画布的 t0 */
    const tBase = performance.now() / 1000;
    btnTestP.addEventListener('click', () => doTest('pos'));
    btnTestN.addEventListener('click', () => doTest('neg'));
    syncBtns();

    p.appendChild(App.el(
      '<div class="z5-eqline"><span class="tag amber">方程式</span> ' + App.eq('2H₂O', '2H₂↑ + O₂↑', '通电') +
      ' <span class="z5-note">口诀：正氧负氢，氢二氧一（体积比）</span></div>'));

    /* ---- 右侧 console ---- */
    right.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">实验结论</div>' +
      '<p style="line-height:1.95;font-size:14px;color:var(--text-dim)">' +
      '电解水生成了<b style="color:var(--cyan)">氢气</b>和<b style="color:var(--green)">氧气</b>。' +
      '化学反应前后<b style="color:var(--cyan)">元素种类不变</b>，所以<b style="color:var(--cyan)">水是由氢元素和氧元素组成的</b>。</p></div>'));
    right.appendChild(App.el(
      '<div class="console-card"><div class="card-label">口诀</div>' +
      '<div class="card-value">正氧负氢 · 氢二氧一</div>' +
      '<p style="margin-top:8px;line-height:1.8;font-size:13.5px;color:var(--text-dim)">与电源<b style="color:var(--text)">正极</b>相连的管内是氧气，与<b style="color:var(--text)">负极</b>相连的管内是氢气；氢气与氧气的<b style="color:var(--cyan)">体积比约为 2 : 1</b>。</p></div>'));
    right.appendChild(App.el(
      '<div class="console-card accent-m"><div class="card-label">微观示意 · 水分子是怎样"拆开"的</div>' +
      '<div class="z5-micro">' +
      '<span class="z5-mol"><i class="z5-atom o"></i><i class="z5-atom h"></i><i class="z5-atom h"></i></span>' +
      '<span class="z5-mol"><i class="z5-atom o"></i><i class="z5-atom h"></i><i class="z5-atom h"></i></span>' +
      '<span class="z5-marrow">→</span>' +
      '<span class="z5-mol"><i class="z5-atom h"></i><i class="z5-atom h"></i></span>' +
      '<span class="z5-mol"><i class="z5-atom h"></i><i class="z5-atom h"></i></span>' +
      '<span style="color:var(--text-faint)">+</span>' +
      '<span class="z5-mol"><i class="z5-atom o"></i><i class="z5-atom o"></i></span>' +
      '</div>' +
      '<p style="line-height:1.9;font-size:13.5px;color:var(--text-dim)">通电时，<b style="color:var(--magenta)">水分子分解成氢原子和氧原子</b>；每 2 个氢原子结合成 1 个氢分子，每 2 个氧原子结合成 1 个氧分子。化学反应前后，原子的种类和数目都不变——可与 <b style="color:var(--magenta)">ZONE 06</b> 质量守恒的微观动画对照着看。</p></div>'));
    right.appendChild(App.el(
      '<div class="console-card accent-a"><div class="card-label">实验注意</div>' +
      '<p style="line-height:1.9;font-size:14px;color:var(--text-dim)">纯水几乎不导电，实验时要在水中加入少量<b style="color:var(--amber)">硫酸钠或氢氧化钠</b>，以增强水的导电性。</p></div>'));
  }

  /* ============================================================
     Tab 4 · 太空用水（科普拓展）
     ============================================================ */
  function buildTab4(pane) {
    const grid = App.el('<div class="z5-card2"></div>');
    pane.appendChild(grid);

    grid.appendChild(App.el(
      '<div class="console-card accent"><div class="card-label">① 空间站的水从哪来</div>' +
      '<div class="z5-mbody"><p>太空中运水贵如黄金，空间站靠的是<b>再生式生命保障系统</b>：宇航员的汗液、呼出的水汽、尿液全部被收集，经过<b>过滤、蒸馏、催化净化</b>后，重新变成可以饮用的水。</p>' +
      '<p><span class="tag cyan">一脉相承</span> 净化思路和地面自来水厂是同一个家族：过滤、吸附、蒸馏、消毒——你在 Tab 1 学到的每一关，太空里都得上。</p></div></div>'));

    grid.appendChild(App.el(
      '<div class="console-card accent-m"><div class="card-label">② 电解水的太空身份</div>' +
      '<div class="z5-mbody"><p>空间站上电解水不是为了"拆开水"，而是为了<b>制取氧气供宇航员呼吸</b>；副产的氢气还能与二氧化碳反应，再次生成水（萨巴蒂尔反应，<b>初步了解</b>）：</p>' +
      '<div style="margin:8px 0">' + App.eq('CO₂ + 4H₂', 'CH₄ + 2H₂O', '催化剂') + '</div>' +
      '<p style="font-size:13px;color:var(--text-faint)">你看，Tab 3 的电解器到了太空就成了"造氧机"，水循环和氧循环在空间站里手拉手。</p></div></div>'));

    /* ③ 漂浮水球 canvas */
    const card3 = App.el(
      '<div class="console-card accent-a"><div class="card-label">③ 太空里的喝水方式</div></div>');
    makeStage(card3, 190, (ctx, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.38 + Math.sin(t * 0.7) * 10;
      const cy = h * 0.5 + Math.sin(t * 1.1) * 8;
      /* 失重水球：表面张力让它保持球形，轻微晃动 */
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.08) {
        const r = 44 + Math.sin(a * 3 + t * 2.2) * 3.5 + Math.sin(a * 5 - t * 3) * 2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const bg = ctx.createRadialGradient(cx - 14, cy - 14, 6, cx, cy, 52);
      bg.addColorStop(0, 'rgba(224,247,255,0.85)');
      bg.addColorStop(0.4, 'rgba(34,211,238,0.45)');
      bg.addColorStop(1, 'rgba(34,211,238,0.15)');
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = 'rgba(34,211,238,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      /* 球内小气泡 */
      ctx.fillStyle = 'rgba(224,247,255,0.6)';
      for (let i = 0; i < 4; i++) {
        const bx = cx + Math.sin(t * 0.9 + i * 1.9) * 22;
        const by = cy + Math.cos(t * 0.8 + i * 2.4) * 16;
        ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, 7); ctx.fill();
      }
      /* 高光 */
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.ellipse(cx - 14, cy - 16, 8, 5, -0.6, 0, 7); ctx.fill();
      /* 饮水袋 + 吸管 */
      const px = w * 0.68, py = h * 0.52;
      ctx.fillStyle = 'rgba(148,163,184,0.25)';
      ctx.strokeStyle = 'rgba(226,232,240,0.7)'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px - 30, py - 44); ctx.lineTo(px + 30, py - 44);
      ctx.lineTo(px + 36, py + 40); ctx.lineTo(px - 36, py + 40);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(34,211,238,0.30)';
      ctx.fillRect(px - 32, py - 12, 64, 50);
      ctx.strokeStyle = 'rgba(251,191,36,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + 8, py - 44); ctx.lineTo(px + 16, py - 66); ctx.lineTo(px + 38, py - 70);
      ctx.stroke();
      ctx.fillStyle = FAINT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('带吸管的饮水袋', px, py + 58);
    }, '失重下水靠表面张力聚成漂浮的水球');
    card3.appendChild(App.el(
      '<div class="z5-mbody"><p>在失重的空间站里，水不会"往下流"，而是靠<b>表面张力</b>聚成一颗颗漂浮的水球——张嘴去追水球可不是好办法，宇航员喝水要用<b>带吸管的饮水袋</b>。</p></div>'));
    grid.appendChild(card3);

    grid.appendChild(App.el(
      '<div class="console-card"><div class="card-label">④ 一个有点好笑的真相</div>' +
      '<div class="z5-mbody"><p>在国际空间站，<b>"你今天喝的咖啡，可能就是上周的咖啡"</b>——每一滴水平均要被循环利用很多次，昨天咖啡里的水，明天可能又变成你杯子里的茶。</p>' +
      '<p><span class="tag amber">想一想</span> 太空用水的每一滴都精打细算，生活在地球上的我们，更该珍惜每一滴水。</p></div></div>'));

    pane.appendChild(App.el(
      '<div class="console-card accent" style="margin-top:18px"><div class="card-label">收尾 · 从空间站回望地球</div>' +
      '<p style="line-height:1.95;font-size:14px;color:var(--text-dim)">本页内容为<b style="color:var(--cyan)">科普拓展</b>，初步了解即可。宇航员在 400 公里高空把每一滴水用到极致；而在蓝色星球上的我们，随手拧紧水龙头，就是最简单的"生命保障系统"。</p></div>'));
  }

  /* ============================================================
     模块导出
     ============================================================ */
  window.Zone5 = {
    desc: '水是生命之源，也是初中化学第一种被"拆开研究"的物质。自来水要闯过<b>沉淀、过滤、吸附、消毒</b>四关才能进家门；电解水实验则第一次告诉人类：<b>水是由氢元素和氧元素组成的</b>。',

    init(container) {
      const tabs = ['水的净化', '自然界的水循环', '水的电解', '太空用水'];
      const builders = [buildTab1, buildTab2, buildTab3, buildTab4];

      const bar = App.el('<div class="z5-tabs"></div>');
      container.appendChild(bar);
      const panes = [];
      tabs.forEach((name, i) => {
        const b = App.el('<button class="z5-tab' + (i === 0 ? ' active' : '') + '">' + name + '</button>');
        b.addEventListener('click', () => {
          bar.querySelectorAll('.z5-tab').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          panes.forEach((pg, j) => pg.classList.toggle('z5-hidden', j !== i));
        });
        bar.appendChild(b);
        const pg = App.el('<div class="z5-pane' + (i === 0 ? '' : ' z5-hidden') + '"></div>');
        container.appendChild(pg);
        panes.push(pg);
      });
      builders.forEach((fn, i) => fn(panes[i]));

      container.appendChild(App.el(
        '<div class="takeaway">💧 <b>一杯自来水</b>，是沉淀、过滤、吸附、消毒四道关卡的接力；<b>一支电解器</b>，第一次拆开了水的组成——<b>氢二氧一，正氧负氢</b>。水最普通，也最值得珍惜。</div>'));
    }
  };
})();
