/* ============================================================
   ZONE 10 · 溶液与溶解度
   Panel A 溶液的形成（NaCl 溶解微观动画）
   Panel B 饱和溶液与不饱和溶液（互动转化实验台）
   Panel C 溶解度曲线（核心读图交互）
   Panel D 结晶（方法选择判定）
   Panel E 溶质的质量分数（计算器 + 稀释 + 误差分析）
   ============================================================ */
(function () {
  'use strict';

  const A = window.App;
  const CYAN = '#22d3ee', MAGENTA = '#f472b6', AMBER = '#fbbf24',
    GREEN = '#34d399', RED = '#f87171', TEXT = '#e2e8f0', DIM = '#94a3b8', FAINT = '#64748b';

  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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

  /* ---------------- 溶解度数据（g / 100 g 水） ---------------- */
  const CURVES = {
    kno3: {
      name: 'KNO₃', color: CYAN, shape: '陡升型',
      pts: [[0, 13.3], [20, 31.6], [40, 63.9], [60, 110], [80, 169], [100, 246]]
    },
    nacl: {
      name: 'NaCl', color: MAGENTA, shape: '缓升型',
      pts: [[0, 35.7], [20, 36.0], [40, 36.6], [60, 37.3], [80, 38.4], [100, 39.8]]
    },
    caoh2: {
      name: 'Ca(OH)₂', color: AMBER, shape: '下降型',
      pts: [[0, 0.185], [20, 0.165], [40, 0.141], [60, 0.121], [80, 0.094], [100, 0.077]]
    }
  };

  /* 相邻数据点间线性插值 */
  function solAt(key, t) {
    const pts = CURVES[key].pts;
    if (t <= pts[0][0]) return pts[0][1];
    if (t >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) {
      if (t >= pts[i][0] && t <= pts[i + 1][0]) {
        const u = (t - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
        return lerp(pts[i][1], pts[i + 1][1], u);
      }
    }
    return pts[0][1];
  }

  function fmtSol(key, v) {
    return key === 'caoh2' ? v.toFixed(3) : A.num(v, 1);
  }

  /* ============================================================
     Panel A · 溶液的形成（NaCl 溶解微观动画）
     ============================================================ */
  function initForm(panel, container) {
    panel.appendChild(A.el('<div class="panel-title">微观放大镜 · NaCl 是怎样"消失"在水里的</div>'));

    const stage = A.el('<div class="stage"><div class="stage-caption">NaCl 投入水中 · 微观示意</div></div>');
    const { ctx, size } = makeCanvas(stage, 380);
    panel.appendChild(stage);

    const ctrl = A.el('<div class="btn-row" style="margin-top:12px; align-items:center"></div>');
    const playBtn = A.el('<button class="btn btn-primary">▶ 把 NaCl 投入水中</button>');
    const phaseEl = A.el('<span class="z9-phase">点击按钮，观察溶解过程</span>');
    ctrl.appendChild(playBtn);
    ctrl.appendChild(phaseEl);
    panel.appendChild(ctrl);

    panel.appendChild(A.el(
      '<div class="z9-note">规范表述：氯化钠溶于水时，在<b>水分子</b>的作用下，Na⁺ 和 Cl⁻ 脱离晶体表面，' +
      '<b>以离子的形式均匀分散到水分子中间</b>。溶质以<b>分子或离子</b>的形式均匀分散到溶剂中，' +
      '形成的<b>均一、稳定的混合物</b>就是溶液。</div>'));

    /* 离子：5 个 Na⁺（青、小）+ 5 个 Cl⁻（绿、大） */
    const IONS = [];
    for (let i = 0; i < 10; i++) {
      const isNa = i % 2 === 0;
      /* 起点：底部晶体栅格；终点：烧杯内均匀散布（确定性伪随机） */
      const gx = (i % 5), gy = Math.floor(i / 5);
      IONS.push({
        isNa,
        sx: gx * 16, sy: gy * 14,
        ex: 0.10 + ((i * 53) % 80) / 100,      /* 0.10~0.90 比例坐标 */
        ey: 0.18 + ((i * 37) % 66) / 100,
        seed: i * 1.618
      });
    }
    /* 水分子（H₂O 偶极）：固定散布 */
    const WATERS = [];
    for (let i = 0; i < 12; i++) {
      WATERS.push({
        x: 0.08 + ((i * 41) % 84) / 100,
        y: 0.12 + ((i * 29) % 72) / 100,
        a: i * 0.9
      });
    }

    let p = 0, playing = false, lastPhase = '', last = performance.now();

    playBtn.addEventListener('click', () => {
      if (playing) return;
      if (p >= 1) { p = 0; phaseEl.textContent = '点击按钮，观察溶解过程'; playBtn.textContent = '▶ 把 NaCl 投入水中'; return; }
      playing = true;
      playBtn.disabled = true;
      playBtn.textContent = '溶解进行中…';
    });

    function drawBeaker(W, H) {
      const bw = Math.min(W * 0.72, 460), bh = H * 0.78;
      const bx = (W - bw) / 2, by = H - 26, top = by - bh;
      ctx.save();
      ctx.strokeStyle = 'rgba(226,232,240,0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, top - 12);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, top - 12);
      ctx.stroke();
      /* 水面 */
      const wy = top + 14;
      ctx.strokeStyle = 'rgba(34,211,238,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = bx + 4; x <= bx + bw - 4; x += 6) {
        const y = wy + Math.sin(x * 0.08 + performance.now() * 0.002) * 1.6;
        if (x === bx + 4) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      return { bx, by, bw, top: wy, bot: by - 6 };
    }

    function drawWater(x, y, ang, scale) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.8;
      /* O */
      ctx.fillStyle = 'rgba(125,211,252,0.85)';
      ctx.beginPath(); ctx.arc(0, 0, 5.5 * scale, 0, Math.PI * 2); ctx.fill();
      /* H × 2（电负性：H 端偏正） */
      ctx.fillStyle = 'rgba(226,232,240,0.9)';
      const ha = 1.05, hd = 9 * scale;
      ctx.beginPath(); ctx.arc(Math.cos(ha) * hd, Math.sin(ha) * hd, 3 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(Math.cos(-ha) * hd, Math.sin(-ha) * hd, 3 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawIon(x, y, isNa, time) {
      const r = isNa ? 8 : 10.5;
      const c = isNa ? CYAN : GREEN;
      ctx.save();
      ctx.shadowColor = c;
      ctx.shadowBlur = 12;
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.15, x, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, c);
      g.addColorStop(1, isNa ? '#0e6d84' : '#14532d');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(6,20,26,0.9)';
      ctx.font = '700 8.5px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isNa ? 'Na⁺' : 'Cl⁻', x, y + 0.5);
    }

    function draw(time) {
      const W = size.W, H = size.H;
      ctx.clearRect(0, 0, W, H);
      const bk = drawBeaker(W, H);
      const e = ease(p);

      /* 水分子 */
      WATERS.forEach((w, i) => {
        const wx = bk.bx + w.x * bk.bw;
        const wy = bk.top + w.y * (bk.bot - bk.top);
        /* 溶解后：水分子朝向附近的离子（H 端朝 Cl⁻，O 端朝 Na⁺） */
        let ang = w.a + Math.sin(time * 0.6 + i) * 0.3;
        if (p > 0.35) {
          let best = null, bd = 1e9;
          IONS.forEach(io => {
            const ix = bk.bx + lerp(0, io.ex, 1) * bk.bw;
            const iy = bk.top + io.ey * (bk.bot - bk.top);
            const d = Math.hypot(ix - wx, iy - wy);
            if (d < bd) { bd = d; best = io; }
          });
          if (best && bd < 70) {
            const ix = bk.bx + best.ex * bk.bw;
            const iy = bk.top + best.ey * (bk.bot - bk.top);
            const toIon = Math.atan2(iy - wy, ix - wx);
            /* Cl⁻ 吸引 H 端（H 在 O 两侧），Na⁺ 吸引 O 端 */
            const target = best.isNa ? toIon + Math.PI : toIon;
            ang = lerp(ang, target, clamp01((p - 0.35) / 0.4) * 0.9);
          }
        }
        drawWater(wx, wy, ang, 1);
      });

      /* 离子 */
      const clusterCX = bk.bx + bk.bw / 2 - 32, clusterY = bk.bot - 26;
      IONS.forEach((io, i) => {
        const sx = clusterCX + io.sx, sy = clusterY + io.sy;
        const ex = bk.bx + io.ex * bk.bw, ey = bk.top + io.ey * (bk.bot - bk.top);
        let x = lerp(sx, ex, e), y = lerp(sy, ey, e);
        if (p >= 1) {
          x += Math.sin(time * 1.1 + io.seed * 3) * 5;
          y += Math.cos(time * 0.9 + io.seed * 2) * 4;
        }
        drawIon(x, y, io.isNa, time);
      });

      /* 晶体残影 */
      if (p < 0.3) {
        ctx.save();
        ctx.globalAlpha = (1 - p / 0.3) * 0.5;
        ctx.strokeStyle = 'rgba(226,232,240,0.7)';
        ctx.lineWidth = 1.5;
        rr(ctx, clusterCX - 10, clusterY - 8, 92, 40, 6);
        ctx.stroke();
        ctx.font = '11px sans-serif';
        ctx.fillStyle = DIM;
        ctx.textAlign = 'center';
        ctx.fillText('NaCl 晶体', clusterCX + 36, clusterY + 56);
        ctx.restore();
      }

      /* 阶段文字 */
      const ph = p === 0 ? '点击按钮，观察溶解过程'
        : p >= 1 ? 'Na⁺ 和 Cl⁻ 均匀分散在水分子中间 → 均一、稳定 ✓'
        : '水分子作用下，Na⁺ 和 Cl⁻ 正脱离晶体表面…';
      if (ph !== lastPhase) { lastPhase = ph; phaseEl.textContent = ph; }
    }

    function loop(now) {
      const dt = Math.min(50, now - last); last = now;
      if (container.isConnected && container.offsetParent !== null) {
        if (playing) {
          p += dt / 4200;
          if (p >= 1) {
            p = 1; playing = false;
            playBtn.disabled = false;
            playBtn.textContent = '↺ 复位重来';
          }
        }
        draw(now / 1000);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ============================================================
     Panel B · 饱和溶液与不饱和溶液（互动转化实验台）
     ============================================================ */
  function initSat(panel, container) {
    panel.appendChild(A.el('<div class="panel-title">转化实验台 · 饱和 ⇌ 不饱和（以 KNO₃ 为例）</div>'));

    /* 转化关系图：箭头即按钮 */
    const diag = A.el(
      '<div class="z9-diag">' +
      '<div class="z9-dnode unsat" data-n="unsat">不饱和溶液</div>' +
      '<div class="z9-dmid">' +
      '<button class="z9-dbtn" data-act="sat">加溶质 / 蒸发溶剂 / 降低温度 ▶</button>' +
      '<button class="z9-dbtn" data-act="unsat">◀ 加溶剂 / 升高温度</button>' +
      '</div>' +
      '<div class="z9-dnode sat" data-n="sat">饱和溶液</div>' +
      '</div>');
    panel.appendChild(diag);

    const stage = A.el('<div class="stage"><div class="stage-caption">烧杯实验台 · KNO₃ + 水</div></div>');
    const { ctx, size } = makeCanvas(stage, 360);
    panel.appendChild(stage);

    const ctrl = A.el('<div class="btn-row" style="margin-top:12px"></div>');
    const ACTIONS = [
      ['+10 g 溶质', 'solute'], ['+20 g 水', 'water'], ['升温 +10°C', 'heat'],
      ['降温 −10°C', 'cool'], ['蒸发 −10 g 水', 'evap'], ['↺ 复位', 'reset']
    ];
    const btns = {};
    ACTIONS.forEach(a => {
      const b = A.el('<button class="btn">' + a[0] + '</button>');
      b.addEventListener('click', () => act(a[1]));
      ctrl.appendChild(b);
      btns[a[1]] = b;
    });
    panel.appendChild(ctrl);

    const verdict = A.el('<div class="z9-verdict">当前为 <b>不饱和溶液</b>：20°C 时 100 g 水中只溶了 20 g KNO₃（此温度下最多能溶 31.6 g），还能继续溶解。</div>');
    panel.appendChild(verdict);

    /* 状态 */
    const INIT = { T: 20, water: 100, added: 20 };
    let T = INIT.T, water = INIT.water, added = INIT.added;
    let dT = T, dWater = water, dAdded = added;  /* 显示值（平滑过渡） */
    let last = performance.now();

    function capacity() { return solAt('kno3', T) * water / 100; }
    function isSat() { return added >= capacity() - 0.001; }

    function act(a) {
      if (a === 'solute') added = clamp(added + 10, 0, 300);
      else if (a === 'water') water = clamp(water + 20, 40, 180);
      else if (a === 'heat') T = clamp(T + 10, 0, 100);
      else if (a === 'cool') T = clamp(T - 10, 0, 100);
      else if (a === 'evap') water = clamp(water - 10, 40, 180);
      else if (a === 'reset') { T = INIT.T; water = INIT.water; added = INIT.added; }
    }

    diag.querySelectorAll('.z9-dbtn').forEach(b => {
      b.addEventListener('click', () => {
        if (b.dataset.act === 'sat') act('solute');
        else { act('water'); act('heat'); }
      });
    });

    function refresh() {
      const cap = capacity();
      const dissolved = Math.min(added, cap);
      const solid = Math.max(0, added - cap);
      const sat = isSat();
      diag.querySelectorAll('.z9-dnode').forEach(n =>
        n.classList.toggle('on', n.dataset.n === (sat ? 'sat' : 'unsat')));
      verdict.classList.toggle('sat', sat);
      /* 注意：App.num 会剥掉末尾的 0（100→"1"），整数克数一律用 Math.round */
      const S = A.num(solAt('kno3', T), 1), wG = Math.round(water), aG = Math.round(added);
      if (sat && solid > 0.05) {
        verdict.innerHTML = '当前为 <b>饱和溶液（有未溶解的固体）</b>：' + T + '°C 时 KNO₃ 的溶解度为 ' + S +
          ' g，' + wG + ' g 水最多能溶 ' + A.num(cap, 1) + ' g；已加入 ' + aG +
          ' g，多出的 <b>' + A.num(solid, 1) + ' g</b> 以固体形式沉在杯底。';
      } else if (sat) {
        verdict.innerHTML = '当前 <b>恰好饱和</b>：' + T + '°C 时 ' + wG + ' g 水恰好溶解 ' +
          A.num(dissolved, 1) + ' g KNO₃（溶解度 ' + S + ' g），溶质全部溶解，但再加一点就溶不下了。';
      } else {
        verdict.innerHTML = '当前为 <b>不饱和溶液</b>：' + T + '°C 时 KNO₃ 的溶解度为 ' + S + ' g，' +
          wG + ' g 水最多能溶 ' + A.num(cap, 1) + ' g，现在只溶了 ' + A.num(dissolved, 1) +
          ' g，还能继续溶解 ' + A.num(cap - dissolved, 1) + ' g。';
      }
    }

    function draw(time) {
      const W = size.W, H = size.H;
      ctx.clearRect(0, 0, W, H);

      const bw = Math.min(W * 0.44, 260), bh = H * 0.72;
      const bx = W * 0.5 - bw / 2 - W * 0.08, by = H - 30, top = by - bh;

      /* 烧杯 */
      ctx.save();
      ctx.strokeStyle = 'rgba(226,232,240,0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, top - 12); ctx.lineTo(bx, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, top - 12);
      ctx.stroke();
      ctx.restore();

      /* 液体：水位随水量变化 */
      const wl = clamp01((dWater - 40) / 140);
      const waterTop = by - 8 - wl * (bh - 30);
      const grad = ctx.createLinearGradient(0, waterTop, 0, by);
      grad.addColorStop(0, 'rgba(34,211,238,0.16)');
      grad.addColorStop(1, 'rgba(34,211,238,0.30)');
      ctx.fillStyle = grad;
      ctx.fillRect(bx + 3, waterTop, bw - 6, by - 6 - waterTop);
      /* 液面 */
      ctx.strokeStyle = 'rgba(34,211,238,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = bx + 4; x <= bx + bw - 4; x += 6) {
        const y = waterTop + Math.sin(x * 0.09 + time * 2) * 1.5;
        if (x === bx + 4) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      /* 已溶解的离子（青色点） */
      const capD = solAt('kno3', dT) * dWater / 100;
      const dissolved = Math.min(dAdded, capD);
      const nIon = clamp(Math.round(dissolved * 0.9), 0, 46);
      ctx.save();
      ctx.fillStyle = 'rgba(34,211,238,0.85)';
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 6;
      for (let i = 0; i < nIon; i++) {
        const px = bx + 12 + ((i * 61) % 88) / 100 * (bw - 24) + Math.sin(time * 1.4 + i * 2.1) * 4;
        const py = waterTop + 10 + ((i * 43) % 82) / 100 * (by - 16 - waterTop - 10) + Math.cos(time * 1.1 + i * 1.7) * 3;
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      /* 未溶固体（琥珀色方块沉底） */
      const solid = Math.max(0, dAdded - capD);
      const nSolid = clamp(Math.round(solid / 2), 0, 34);
      ctx.save();
      ctx.fillStyle = AMBER;
      ctx.shadowColor = AMBER;
      ctx.shadowBlur = 6;
      for (let i = 0; i < nSolid; i++) {
        const row = Math.floor(i / 9);
        const px = bx + bw / 2 - 52 + (i % 9) * 13 + (row % 2) * 6;
        const py = by - 12 - row * 11;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate((i * 0.7) % 1.2);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      }
      ctx.restore();

      /* 温度计 */
      const tx = bx + bw + W * 0.10, th = bh * 0.8, ty = by - th;
      ctx.save();
      ctx.strokeStyle = 'rgba(226,232,240,0.6)';
      ctx.lineWidth = 2;
      rr(ctx, tx - 5, ty, 10, th, 5);
      ctx.stroke();
      const frac = dT / 100;
      const mh = frac * (th - 20);
      ctx.fillStyle = dT > 40 ? MAGENTA : CYAN;
      ctx.beginPath();
      ctx.arc(tx, by - 6, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(tx - 3, by - 6 - mh, 6, mh);
      ctx.font = '700 13px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = TEXT;
      ctx.fillText(dT.toFixed(0) + '°C', tx, ty - 12);
      ctx.restore();

      /* 读数标签 */
      ctx.save();
      ctx.font = '12.5px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = DIM;
      const lx = 16;
      ctx.fillText('水：' + dWater.toFixed(0) + ' g', lx, top + 6);
      ctx.fillText('已加入 KNO₃：' + dAdded.toFixed(0) + ' g', lx, top + 26);
      ctx.fillText('已溶解：' + dissolved.toFixed(1) + ' g', lx, top + 46);
      ctx.fillStyle = solid > 0.05 ? AMBER : FAINT;
      ctx.fillText('未溶固体：' + solid.toFixed(1) + ' g', lx, top + 66);
      ctx.restore();
    }

    function loop(now) {
      const dt = Math.min(50, now - last); last = now;
      if (container.isConnected && container.offsetParent !== null) {
        const k = 1 - Math.pow(0.002, dt / 1000);
        dT += (T - dT) * k;
        dWater += (water - dWater) * k;
        dAdded += (added - dAdded) * k;
        refresh();
        draw(now / 1000);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ============================================================
     Panel C · 溶解度曲线（核心交互读图）
     ============================================================ */
  function initCurve(panel, container) {
    panel.appendChild(A.el('<div class="panel-title">溶解度曲线 · 读图训练场（中考必考图像）</div>'));

    /* 物质切换 */
    const subRow = A.el('<div class="btn-row" style="margin-bottom:12px; align-items:center"></div>');
    subRow.appendChild(A.el('<span style="font-size:13px;color:var(--text-dim)">判定对象：</span>'));
    const subBtns = {};
    Object.keys(CURVES).forEach(k => {
      const b = A.el('<button class="btn z9-sub" data-k="' + k + '">' + CURVES[k].name + '</button>');
      b.addEventListener('click', () => { sel = k; refreshSel(); });
      subRow.appendChild(b);
      subBtns[k] = b;
    });
    panel.appendChild(subRow);

    const stage = A.el('<div class="stage"><div class="stage-caption">溶解度/g 随温度变化 · hover 读数 · 点击判定点位</div></div>');
    const { cv, ctx, size } = makeCanvas(stage, 470);
    panel.appendChild(stage);

    /* 温度滑块 */
    const sldRow = A.el('<div class="slider-row" style="margin-top:14px"><label>温度</label></div>');
    const sld = A.el('<input type="range" min="0" max="100" step="1" value="20">');
    const sldVal = A.el('<span class="slider-val">20°C</span>');
    sldRow.appendChild(sld);
    sldRow.appendChild(sldVal);
    panel.appendChild(sldRow);

    /* 读数面板 */
    const reads = A.el('<div class="z9-readouts"></div>');
    const readEls = {};
    Object.keys(CURVES).forEach(k => {
      const c = CURVES[k];
      const d = A.el(
        '<div class="z9-read" data-k="' + k + '">' +
        '<div class="rn">' + c.name + '（' + c.shape + '）</div>' +
        '<div class="rv" style="color:' + c.color + '">—</div>' +
        '<div class="rt">g / 100 g 水 · 点击设为判定对象</div>' +
        '</div>');
      d.addEventListener('click', () => { sel = k; refreshSel(); });
      reads.appendChild(d);
      readEls[k] = d;
    });
    panel.appendChild(reads);

    const verdict = A.el('<div class="z9-verdict">点击图中任意位置，我来判定该点的溶液状态（相对当前选中的物质）。</div>');
    panel.appendChild(verdict);

    panel.appendChild(A.el(
      '<div class="z9-hint">💡 操作：拖动滑块看三种物质在不同温度下的溶解度读数；鼠标悬停图上任意位置，十字线实时读出温度与溶解度坐标；' +
      '点击图上任意点，按「线上饱和 · 上方有固体 · 下方不饱和」判定。Ca(OH)₂ 数值太小几乎贴着横轴，右上角有局部放大框。</div>'));

    /* 状态 */
    let temp = 20, sel = 'kno3', hover = null, mark = null, last = performance.now();

    /* 交点（KNO₃ 与 NaCl）：数值求解 */
    let cross = null;
    (function () {
      let prevT = 0, prevD = solAt('kno3', 0) - solAt('nacl', 0);
      for (let t = 0.25; t <= 100; t += 0.25) {
        const d = solAt('kno3', t) - solAt('nacl', t);
        if ((d > 0) !== (prevD > 0)) {
          let a = prevT, b = t;
          for (let k = 0; k < 40; k++) {
            const m = (a + b) / 2;
            if ((solAt('kno3', m) - solAt('nacl', m) > 0) === (prevD > 0)) a = m; else b = m;
          }
          cross = (a + b) / 2;
          break;
        }
        prevT = t; prevD = d;
      }
    })();

    function refreshSel() {
      Object.keys(subBtns).forEach(k => {
        subBtns[k].classList.toggle('on', k === sel);
        readEls[k].classList.toggle('sel', k === sel);
      });
    }

    sld.addEventListener('input', () => {
      temp = Number(sld.value);
      sldVal.textContent = temp + '°C';
      updateReads();
    });

    function updateReads() {
      Object.keys(CURVES).forEach(k => {
        readEls[k].querySelector('.rv').textContent = fmtSol(k, solAt(k, temp)) + ' g';
      });
    }

    /* 坐标映射 */
    const YMAX = 250;
    function geo() {
      const W = size.W, H = size.H;
      const ml = 58, mr = 18, mt = 30, mb = 44;
      return {
        ml, mr, mt, mb,
        pw: W - ml - mr, ph: H - mt - mb,
        x: t => ml + t / 100 * (W - ml - mr),
        y: s => mt + (1 - s / YMAX) * (H - mt - mb),
        t: x => (x - ml) / (W - ml - mr) * 100,
        s: y => (1 - (y - mt) / (H - mt - mb)) * YMAX
      };
    }

    function smoothPath(g, key) {
      const pts = CURVES[key].pts.map(p => ({ x: g.x(p[0]), y: g.y(p[1]) }));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    }

    function drawInset(g) {
      /* Ca(OH)₂ 局部放大框：y 轴 0~0.2 g */
      const iw = 200, ih = 122;
      const ix = g.ml + g.pw - iw - 8, iy = g.mt + 6;
      ctx.save();
      rr(ctx, ix, iy, iw, ih, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(251,191,36,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const ixl = ix + 36, ixr = ix + iw - 10, iyt = iy + 22, iyb = iy + ih - 18;
      const mx = t => ixl + t / 100 * (ixr - ixl);
      const my = s => iyb - s / 0.2 * (iyb - iyt);
      /* 网格 */
      ctx.font = '9.5px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'right';
      [0, 0.1, 0.2].forEach(v => {
        ctx.strokeStyle = 'rgba(148,163,184,0.15)';
        ctx.beginPath(); ctx.moveTo(ixl, my(v)); ctx.lineTo(ixr, my(v)); ctx.stroke();
        ctx.fillStyle = FAINT;
        ctx.fillText(String(v), ixl - 4, my(v) + 3);
      });
      ctx.textAlign = 'left';
      ctx.fillStyle = AMBER;
      ctx.fillText('Ca(OH)₂ 局部放大（0~0.2 g）', ix + 8, iy + 14);
      /* 曲线 */
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2;
      ctx.shadowColor = AMBER;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      CURVES.caoh2.pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(mx(p[0]), my(p[1]));
        else ctx.lineTo(mx(p[0]), my(p[1]));
      });
      ctx.stroke();
      ctx.restore();
    }

    function draw() {
      const W = size.W, H = size.H;
      ctx.clearRect(0, 0, W, H);
      const g = geo();

      /* 网格与刻度 */
      ctx.save();
      ctx.font = '10.5px "SF Mono", Consolas, monospace';
      for (let t = 0; t <= 100; t += 20) {
        ctx.strokeStyle = 'rgba(148,163,184,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(g.x(t), g.mt); ctx.lineTo(g.x(t), g.mt + g.ph); ctx.stroke();
        ctx.fillStyle = FAINT;
        ctx.textAlign = 'center';
        ctx.fillText(String(t), g.x(t), g.mt + g.ph + 16);
      }
      for (let s = 0; s <= YMAX; s += 50) {
        ctx.strokeStyle = 'rgba(148,163,184,0.12)';
        ctx.beginPath(); ctx.moveTo(g.ml, g.y(s)); ctx.lineTo(g.ml + g.pw, g.y(s)); ctx.stroke();
        ctx.fillStyle = FAINT;
        ctx.textAlign = 'right';
        ctx.fillText(String(s), g.ml - 8, g.y(s) + 3.5);
      }
      /* 轴标题 */
      ctx.fillStyle = DIM;
      ctx.textAlign = 'center';
      ctx.font = '12px sans-serif';
      ctx.fillText('温度 / °C', g.ml + g.pw / 2, H - 8);
      ctx.save();
      ctx.translate(14, g.mt + g.ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('溶解度 / g', 0, 0);
      ctx.restore();
      ctx.restore();

      /* 三条曲线 */
      Object.keys(CURVES).forEach(k => {
        const c = CURVES[k];
        ctx.save();
        ctx.strokeStyle = c.color;
        ctx.lineWidth = k === sel ? 3 : 2;
        ctx.globalAlpha = k === sel ? 1 : 0.55;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = k === sel ? 10 : 4;
        smoothPath(g, k);
        ctx.stroke();
        ctx.restore();
        /* 末端标签 */
        const lastPt = c.pts[c.pts.length - 1];
        ctx.save();
        ctx.font = '700 12px "SF Mono", Consolas, monospace';
        ctx.fillStyle = c.color;
        ctx.textAlign = 'right';
        ctx.fillText(c.name, g.x(100) - 4, g.y(lastPt[1]) - 8);
        ctx.restore();
      });

      /* 交点标注 */
      if (cross != null) {
        const cs = solAt('kno3', cross);
        const cxp = g.x(cross), cyp = g.y(cs);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(226,232,240,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp, g.mt + g.ph); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(g.ml, cyp); ctx.lineTo(cxp, cyp); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(cxp, cyp, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = '11.5px sans-serif';
        ctx.fillStyle = TEXT;
        ctx.textAlign = 'left';
        const label = '交点 ≈' + cross.toFixed(1) + '°C：该温度下两物质溶解度相等（≈' + cs.toFixed(1) + ' g）';
        const lxx = cxp + 10 > g.ml + g.pw - 250 ? cxp - 258 : cxp + 10;
        ctx.fillText(label, lxx, cyp - 10);
        ctx.restore();
      }

      /* 温度滑块竖线 + 三点 */
      {
        const sx = g.x(temp);
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(226,232,240,0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(sx, g.mt); ctx.lineTo(sx, g.mt + g.ph); ctx.stroke();
        ctx.setLineDash([]);
        Object.keys(CURVES).forEach(k => {
          const c = CURVES[k];
          const sy = g.y(solAt(k, temp));
          ctx.fillStyle = c.color;
          ctx.shadowColor = c.color;
          ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
      }

      /* hover 十字线 */
      if (hover && hover.t >= 0 && hover.t <= 100 && hover.s >= 0 && hover.s <= YMAX) {
        const hx = g.x(hover.t), hy = g.y(hover.s);
        ctx.save();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = 'rgba(34,211,238,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(g.ml, hy); ctx.lineTo(g.ml + g.pw, hy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx, g.mt); ctx.lineTo(hx, g.mt + g.ph); ctx.stroke();
        ctx.setLineDash([]);
        /* 读数框 */
        const txt1 = hover.t.toFixed(1) + ' °C';
        const txt2 = hover.s.toFixed(2) + ' g/100g水';
        const bwid = 118, bx2 = clamp(hx + 12, g.ml, g.ml + g.pw - bwid), by2 = clamp(hy - 52, g.mt, g.mt + g.ph - 46);
        rr(ctx, bx2, by2, bwid, 44, 8);
        ctx.fillStyle = 'rgba(6,20,26,0.92)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(34,211,238,0.5)';
        ctx.stroke();
        ctx.font = '12px "SF Mono", Consolas, monospace';
        ctx.fillStyle = CYAN;
        ctx.textAlign = 'left';
        ctx.fillText(txt1, bx2 + 10, by2 + 18);
        ctx.fillText(txt2, bx2 + 10, by2 + 35);
        ctx.restore();
      }

      /* 点击标记 */
      if (mark) {
        const mxp = g.x(mark.t), myp = g.y(mark.s);
        ctx.save();
        ctx.strokeStyle = mark.kind === 'on' ? GREEN : mark.kind === 'above' ? AMBER : CYAN;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(mxp, myp, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mxp - 11, myp); ctx.lineTo(mxp + 11, myp);
        ctx.moveTo(mxp, myp - 11); ctx.lineTo(mxp, myp + 11);
        ctx.stroke();
        ctx.restore();
      }

      drawInset(g);
    }

    /* 鼠标事件 */
    function evtPos(e) {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    cv.addEventListener('mousemove', e => {
      const p = evtPos(e), g = geo();
      hover = { t: clamp(g.t(p.x), 0, 100), s: g.s(p.y) };
    });
    cv.addEventListener('mouseleave', () => { hover = null; });
    cv.addEventListener('click', e => {
      const p = evtPos(e), g = geo();
      const t = clamp(g.t(p.x), 0, 100), s = g.s(p.y);
      if (p.x < g.ml || p.x > g.ml + g.pw || p.y < g.mt || p.y > g.mt + g.ph) return;
      const c = solAt(sel, t);
      const tol = 8 / g.ph * YMAX;  /* 8 px 容差 */
      const name = CURVES[sel].name;
      let kind, html;
      if (Math.abs(s - c) <= Math.max(tol, c * 0.06)) {
        kind = 'on';
        html = '✓ 点恰好<b>在线上</b>：' + t.toFixed(0) + '°C 时，100 g 水中恰好溶解了 ' + fmtSol(sel, c) +
          ' g ' + name + '，溶液<b>恰好饱和</b>，溶质正好全部溶解。';
        verdict.className = 'z9-verdict ok';
      } else if (s > c) {
        kind = 'above';
        html = '点在曲线<b>上方</b>：' + t.toFixed(0) + '°C 时 100 g 水最多只能溶解 ' + fmtSol(sel, c) + ' g ' + name +
          '，该点对应 ' + s.toFixed(1) + ' g —— 溶液<b>已饱和</b>，且有 <b>' + (s - c).toFixed(1) +
          ' g</b> 溶质无法溶解，以<b>固体</b>形式存在。';
        verdict.className = 'z9-verdict sat';
      } else {
        kind = 'below';
        html = '点在曲线<b>下方</b>：' + t.toFixed(0) + '°C 时 100 g 水中只溶解了 ' + s.toFixed(1) + ' g ' + name +
          '，未达到该温度下的溶解度 ' + fmtSol(sel, c) + ' g —— 溶液为<b>不饱和溶液</b>，还能继续溶解 ' +
          (c - s).toFixed(1) + ' g。';
        verdict.className = 'z9-verdict';
      }
      mark = { t, s, kind };
      verdict.innerHTML = html;
    });

    function loop(now) {
      last = now;
      if (container.isConnected && container.offsetParent !== null) {
        draw();
      }
      requestAnimationFrame(loop);
    }

    refreshSel();
    updateReads();
    requestAnimationFrame(loop);
  }

  /* ============================================================
     通用问答组件
     ============================================================ */
  function makeQuiz(parent, qHtml, choices, explain, hint) {
    const box = A.el('<div class="z9-quiz"><div class="qq">' + qHtml + '</div></div>');
    const row = A.el('<div class="btn-row"></div>');
    const fb = A.el('<div class="z9-fb"></div>');
    choices.forEach(ch => {
      const b = A.el('<button class="btn z9-opt">' + ch.t + '</button>');
      b.addEventListener('click', () => {
        if (ch.ok) {
          row.querySelectorAll('.z9-opt').forEach(o => { o.classList.remove('wrong'); o.disabled = false; });
          b.classList.add('right');
          row.querySelectorAll('.z9-opt').forEach(o => { if (o !== b) o.disabled = true; });
          fb.innerHTML = '<span class="good">✓ 回答正确。</span>' + explain;
        } else {
          b.classList.add('wrong');
          b.disabled = true;
          fb.innerHTML = '<span class="oops">✗ 再想想。</span>' + (hint || '');
        }
      });
      row.appendChild(b);
    });
    box.appendChild(row);
    box.appendChild(fb);
    parent.appendChild(box);
    return box;
  }

  /* ============================================================
     Panel D · 结晶（方法选择）
     ============================================================ */
  function initCrystal(panel) {
    panel.appendChild(A.el('<div class="panel-title">结晶方法选择 · 看溶解度曲线的"坡度"下药</div>'));

    makeQuiz(panel,
      '情景①：<b>KNO₃ 中混有少量 NaCl</b>，要提纯 KNO₃，应选用哪种结晶方法？',
      [
        { t: '降温结晶（冷却热饱和溶液）', ok: true },
        { t: '蒸发结晶', ok: false }
      ],
      'KNO₃ 的溶解度随温度升高<b>显著增大</b>（陡升型曲线），NaCl 的溶解度受温度影响很小。' +
      '把它们制成<b>热的饱和溶液再降温</b>：KNO₃ 的溶解度大幅下降，大量析出晶体；' +
      '而 NaCl 含量少、溶解度变化又小，仍留在溶液中。过滤即得较纯净的 KNO₃。',
      '比较两者曲线的"坡度"：谁的溶解度受温度影响大？'),

    makeQuiz(panel,
      '情景②：<b>NaCl 中混有少量 KNO₃</b>，要提纯 NaCl，应选用哪种结晶方法？',
      [
        { t: '蒸发结晶', ok: true },
        { t: '降温结晶（冷却热饱和溶液）', ok: false }
      ],
      'NaCl 的溶解度受温度影响<b>很小</b>（缓升型曲线），降温几乎析不出多少；' +
      '用<b>蒸发溶剂</b>的办法，水不断减少，NaCl 就会大量结晶析出；' +
      '而 KNO₃ 含量少，仍未达到饱和，留在母液中。这正是<b>海水晒盐</b>的原理。',
      'NaCl 曲线那么平，降温能析出多少？换个思路——减少溶剂试试。');

    panel.appendChild(A.el(
      '<div class="z9-note">规律：<b>坡度大</b>（溶解度随温度变化大，如 KNO₃）→ <b>降温结晶</b>；' +
      '<b>坡度小</b>（溶解度随温度变化小，如 NaCl）→ <b>蒸发结晶</b>。记忆锚点：海水晒盐 = 蒸发结晶。</div>'));
  }

  /* ============================================================
     Panel E · 溶质的质量分数
     ============================================================ */
  function initFrac(panel) {
    panel.appendChild(A.el('<div class="panel-title">溶质的质量分数 · 算一算、配一配</div>'));

    /* ---- 互动计算器 ---- */
    panel.appendChild(A.el('<div class="card-label" style="margin-bottom:8px">互动计算器：输入溶质、溶剂质量，自动计算</div>'));
    const inRow = A.el(
      '<div class="z9-input-row">' +
      '<label>溶质质量</label><input class="z9-input" id="z9-ms" type="number" min="0" step="0.1" value="3">' +
      '<label>g　溶剂质量</label><input class="z9-input" id="z9-mw" type="number" min="0" step="0.1" value="47">' +
      '<label>g</label></div>');
    panel.appendChild(inRow);
    const outGrid = A.el(
      '<div class="z9-calc-out">' +
      '<div class="console-card accent"><div class="card-label">溶液质量 = 溶质 + 溶剂</div><div class="card-value" id="z9-out-m">50 g</div></div>' +
      '<div class="console-card accent-m"><div class="card-label">溶质的质量分数</div><div class="card-value" id="z9-out-w">6%</div></div>' +
      '</div>');
    panel.appendChild(outGrid);

    const inS = inRow.querySelector('#z9-ms'), inW = inRow.querySelector('#z9-mw');
    const outM = outGrid.querySelector('#z9-out-m'), outW = outGrid.querySelector('#z9-out-w');
    function calc() {
      const ms = Math.max(0, Number(inS.value) || 0);
      const mw = Math.max(0, Number(inW.value) || 0);
      const m = ms + mw;
      outM.textContent = A.num(m, 2) + ' g';
      outW.textContent = m > 0 ? A.num(ms / m * 100, 2) + '%' : '—';
    }
    inS.addEventListener('input', calc);
    inW.addEventListener('input', calc);
    calc();

    panel.appendChild(A.el(
      '<div class="z9-note">⚠ 最易错的点：分母是<b>溶液质量</b>（= 溶质质量 + 溶剂质量），不是溶剂质量！' +
      '上面默认数据正是"50 g 6% 的氯化钠溶液"：3 g NaCl + 47 g 水。</div>'));

    /* ---- 稀释计算演示 ---- */
    const dil = A.el(
      '<div class="console-card accent-a" style="margin-top:16px">' +
      '<div class="card-label">稀释计算 · 抓住"溶质质量不变"</div>' +
      '<div class="z9-concl">稀释前后，<span class="hla">溶质的质量不变</span>：' +
      '<span style="font-family:var(--mono)">m(浓) × w(浓) = m(稀) × w(稀)</span><br>' +
      '例题：把 <b>50 g 98%</b> 的浓硫酸稀释成 <b>20%</b> 的稀硫酸，需要加水多少克？</div>' +
      '<div class="btn-row" style="margin-top:10px"><button class="btn" id="z9-dil-btn">显示规范解答</button></div>' +
      '<div class="z9-dil-sol" id="z9-dil-sol" hidden></div>' +
      '</div>');
    panel.appendChild(dil);
    const dilBtn = dil.querySelector('#z9-dil-btn'), dilSol = dil.querySelector('#z9-dil-sol');
    dilBtn.addEventListener('click', () => {
      const show = dilSol.hidden;
      dilSol.hidden = !show;
      dilBtn.textContent = show ? '收起解答' : '显示规范解答';
      if (show) {
        dilSol.innerHTML =
          '<b>解：</b>设需要加水的质量为 x。<br>' +
          '稀释前后溶质（硫酸）质量不变：<br>' +
          '<span style="font-family:var(--mono)">50 g × 98% = (50 g + x) × 20%</span><br>' +
          '<span style="font-family:var(--mono)">49 g = 10 g + 0.2x</span><br>' +
          '<span style="font-family:var(--mono)">x = 195 g</span><br>' +
          '<b>答：</b>需要加水 <b>195 g</b>。' +
          '<br><span style="color:var(--text-faint);font-size:12.5px">提醒：水的体积换算用密度 1 g/mL，195 g 水即 195 mL；且稀释浓硫酸时要把浓硫酸沿器壁慢慢注入水中，并不断搅拌。</span>';
      }
    });

    /* ---- 配制五步流程 ---- */
    const stepsCard = A.el(
      '<div class="console-card accent" style="margin-top:16px">' +
      '<div class="card-label">配制 50 g 溶质质量分数为 6% 的氯化钠溶液 · 五步流程（点步骤看细节）</div>' +
      '</div>');
    const stepRow = A.el('<div class="z9-steps"></div>');
    const stepDetail = A.el('<div class="z9-step-detail"></div>');
    const STEPS = [
      ['① 计算', '需氯化钠 <b>50 g × 6% = 3 g</b>，需水 <b>50 g − 3 g = 47 g</b>（水的密度按 1 g/mL，即量取 <b>47 mL</b> 水）。'],
      ['② 称量', '用<b>托盘天平</b>称取 3 g 氯化钠：<b>左物右码</b>，两盘各垫一张相同的称量纸。'],
      ['③ 量取', '用 <b>50 mL 量筒</b>量取 47 mL 水；读数时视线与量筒内液体<b>凹液面的最低处</b>保持水平。'],
      ['④ 溶解', '把氯化钠倒入<b>烧杯</b>，加入量取的水，用<b>玻璃棒</b>不断搅拌——搅拌的作用是<b>加速溶解</b>。'],
      ['⑤ 装瓶贴标签', '把配好的溶液装入<b>细口试剂瓶</b>，盖好瓶塞，贴上标签：注明<b>溶液名称</b>和<b>溶质质量分数</b>（如"6% 氯化钠溶液"）。']
    ];
    const stepBtns = [];
    STEPS.forEach((s, i) => {
      const b = A.el('<button class="z9-step">' + s[0] + '</button>');
      b.addEventListener('click', () => {
        stepBtns.forEach((o, j) => o.classList.toggle('on', j === i));
        stepDetail.innerHTML = s[1];
      });
      stepRow.appendChild(b);
      stepBtns.push(b);
    });
    stepsCard.appendChild(stepRow);
    stepsCard.appendChild(stepDetail);
    panel.appendChild(stepsCard);
    stepBtns[0].click();
  }

  /* ============================================================
     模块导出
     ============================================================ */
  window.Zone10 = {
    desc: '溶液是<b>均一、稳定的混合物</b>。溶解度曲线是中考必考图像——' +
      '<b>线上饱和、上方有固体、下方不饱和</b>，读图能力直接决定这章的分数。',

    init(container) {
      /* ---------- Panel A ---------- */
      const rowA = A.el('<div class="layout-2col"></div>');
      const panelA = A.el('<div class="panel"></div>');
      const sideA = A.el('<div class="console"></div>');
      sideA.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">溶液的三大特征</div>' +
        '<ul class="z9-list">' +
        '<li><b>均一性</b>：溶液各部分的组成和性质完全相同（浓度相同）</li>' +
        '<li><b>稳定性</b>：外界条件（温度、溶剂的量）不变时，溶质不会从溶液中分离出来</li>' +
        '<li><b>混合物</b>：溶液由溶质和溶剂组成</li>' +
        '</ul></div>'));
      sideA.appendChild(A.el(
        '<div class="console-card accent-m">' +
        '<div class="card-label">溶质、溶剂的判断规则</div>' +
        '<ul class="z9-list">' +
        '<li><b>固体或气体</b>溶于液体 → 液体是溶剂</li>' +
        '<li>两种液体互溶 → <b>量多的</b>是溶剂</li>' +
        '<li><b>只要有水，水就是溶剂</b>——不管水多水少</li>' +
        '</ul></div>'));
      sideA.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">常见溶液举例（说出溶质、溶剂）</div>' +
        '<ul class="z9-list">' +
        '<li>碘酒：溶质是<b>碘</b>，溶剂是<b>酒精</b></li>' +
        '<li>汽水：溶质是 <b>CO₂ 等</b>，溶剂是<b>水</b></li>' +
        '<li>生理盐水：溶质是<b>氯化钠</b>，溶剂是<b>水</b></li>' +
        '</ul></div>'));
      sideA.appendChild(A.el(
        '<div class="console-card accent-a">' +
        '<div class="card-label">对比：乳浊液 + 乳化作用</div>' +
        '<div class="z9-concl">植物油加入水中：<span class="hla">小液滴</span>分散在液体里，<span class="hla">不均一、不稳定</span>，' +
        '静置后会分层——这种混合物叫<span class="hla">乳浊液</span>。<br>' +
        '<b>乳化作用</b>：洗涤剂能把大的油滴分散成无数细小的液滴，使其能随水流走，这种现象叫乳化（初步了解）。' +
        '<br><span style="color:var(--text-faint);font-size:12.5px">注意：用洗涤剂洗油污是乳化，用汽油洗油污才是溶解——中考常考辨析！</span></div>' +
        '</div>'));
      rowA.appendChild(panelA);
      rowA.appendChild(sideA);
      container.appendChild(rowA);

      /* ---------- Panel B ---------- */
      const rowB = A.el('<div class="layout-2col-r" style="margin-top:22px"></div>');
      const sideB = A.el('<div class="console"></div>');
      const panelB = A.el('<div class="panel"></div>');
      sideB.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">饱和溶液 · 概念原文（三个限定词缺一不可）</div>' +
        '<div class="z9-law">在<span class="kw">一定温度下</span>，向<span class="kw">一定量溶剂</span>里加入某种溶质，' +
        '当溶质<span class="kw">不能继续溶解</span>时，所得到的溶液叫做这种溶质的<b style="color:var(--cyan)">饱和溶液</b>；' +
        '还能继续溶解的，叫做<span class="kw2">不饱和溶液</span>。</div>' +
        '<div class="z9-concl" style="margin-top:10px">⚠ 判断饱和与否必须指明「这种溶质」：某溶液对 NaCl 饱和了，' +
        '对 KNO₃ 可能仍不饱和——饱和是有"对象"的。</div>' +
        '</div>'));
      sideB.appendChild(A.el(
        '<div class="console-card accent-a">' +
        '<div class="card-label">特别提醒 ⚠ Ca(OH)₂ 反着来</div>' +
        '<div class="z9-concl">大多数固体物质的溶解度随温度升高而<b>增大</b>，但 <span class="hla">Ca(OH)₂（熟石灰）的溶解度随温度升高而减小</span>！<br>' +
        '所以它的转化方向与一般物质<b>正好相反</b>：升高温度 → 不饱和变饱和（甚至析出固体）；降低温度 → 饱和变不饱和。</div>' +
        '</div>'));
      sideB.appendChild(A.el(
        '<div class="console-card accent-m">' +
        '<div class="card-label">转化关系速记</div>' +
        '<ul class="z9-list">' +
        '<li>不饱和 → 饱和：<b>加溶质、蒸发溶剂、降低温度</b></li>' +
        '<li>饱和 → 不饱和：<b>加溶剂、升高温度</b></li>' +
        '<li>例外：Ca(OH)₂ 的温度方向全部反过来</li>' +
        '</ul></div>'));
      rowB.appendChild(sideB);
      rowB.appendChild(panelB);
      container.appendChild(rowB);

      /* ---------- Panel C ---------- */
      const rowC = A.el('<div class="layout-2col" style="margin-top:22px"></div>');
      const panelC = A.el('<div class="panel"></div>');
      const sideC = A.el('<div class="console"></div>');
      sideC.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">固体溶解度的定义（四要素逐个背）</div>' +
        '<div class="z9-concl">在<b>一定温度</b>下，某固态物质在 <b>100 g 溶剂</b>里达到<b>饱和状态</b>时所溶解的<b>质量（单位：克）</b>，' +
        '叫做这种物质在这种溶剂里的溶解度。</div>' +
        '<ul class="z9-list" style="margin-top:10px">' +
        '<li>① 条件：<b>一定温度</b>（不谈温度，溶解度无意义）</li>' +
        '<li>② 标准：<b>100 g 溶剂</b>（不是 100 g 溶液！）</li>' +
        '<li>③ 状态：<b>饱和状态</b></li>' +
        '<li>④ 单位：<b>克</b></li>' +
        '</ul></div>'));
      sideC.appendChild(A.el(
        '<div class="console-card accent-m">' +
        '<div class="card-label">读图口诀（先背再点图）</div>' +
        '<ul class="z9-list">' +
        '<li>点<b>在线上</b> → 该温度下<b>恰好饱和</b></li>' +
        '<li>点在曲线<b>上方</b> → <b>饱和且有未溶解的固体</b></li>' +
        '<li>点在曲线<b>下方</b> → <b>不饱和</b></li>' +
        '</ul></div>'));
      sideC.appendChild(A.el(
        '<div class="console-card accent-a">' +
        '<div class="card-label">交点的含义</div>' +
        '<div class="z9-concl">两条溶解度曲线的<span class="hla">交点</span>表示：在该温度下，两种物质的溶解度<span class="hla">相等</span>。' +
        '（此时二者的饱和溶液的溶质质量分数也相等。）</div>' +
        '</div>'));
      rowC.appendChild(panelC);
      rowC.appendChild(sideC);
      container.appendChild(rowC);

      /* ---------- Panel D ---------- */
      const rowD = A.el('<div class="layout-2col" style="margin-top:22px"></div>');
      const panelD = A.el('<div class="panel"></div>');
      const sideD = A.el('<div class="console"></div>');
      sideD.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">晶体与结晶 · 知识卡</div>' +
        '<div class="z9-concl">饱和溶液经过<b>降温</b>或<b>蒸发溶剂</b>，溶质会以<b>晶体</b>的形式析出，这一过程叫做<b>结晶</b>。<br>' +
        '析出的晶体具有规则的几何外形。结晶后剩余的溶液（母液）仍是<b>该温度下的饱和溶液</b>。</div>' +
        '</div>'));
      sideD.appendChild(A.el(
        '<div class="console-card accent-m">' +
        '<div class="card-label">两种结晶方法对比</div>' +
        '<ul class="z9-list">' +
        '<li><b>降温结晶</b>（冷却热饱和溶液）：适合溶解度随温度变化<b>大</b>的物质，如 KNO₃</li>' +
        '<li><b>蒸发结晶</b>：适合溶解度随温度变化<b>小</b>的物质，如 NaCl（海水晒盐）</li>' +
        '</ul></div>'));
      rowD.appendChild(panelD);
      rowD.appendChild(sideD);
      container.appendChild(rowD);

      /* ---------- Panel E ---------- */
      const rowE = A.el('<div class="layout-2col" style="margin-top:22px"></div>');
      const panelE = A.el('<div class="panel"></div>');
      const sideE = A.el('<div class="console"></div>');
      sideE.appendChild(A.el(
        '<div class="console-card accent">' +
        '<div class="card-label">核心公式</div>' +
        '<div class="z9-formula">溶质的质量分数 = <span class="frac"><span class="up">溶质质量</span><span>溶液质量</span></span> × 100%</div>' +
        '<div class="z9-concl" style="margin-top:10px">分母是<b>溶液质量 = 溶质质量 + 溶剂质量</b>，不是溶剂质量——' +
        '这是本单元计算题丢分的头号陷阱。</div>' +
        '</div>'));
      /* 误差分析 3 题 */
      const errCard = A.el(
        '<div class="console-card accent-a">' +
        '<div class="card-label">误差分析 · 配出来的溶液浓度到底偏大还是偏小？</div>' +
        '</div>');
      makeQuiz(errCard,
        '① 称量时把<b>药品和砝码的位置放反了</b>（使用了游码），所配溶液的溶质质量分数会？',
        [
          { t: '偏大', ok: false },
          { t: '偏小', ok: true },
          { t: '不变', ok: false }
        ],
        '左码右物时：<b>药品质量 = 砝码质量 − 游码读数</b>，实际称得的溶质<b>偏少</b>，溶剂不变，所以溶质质量分数<b>偏小</b>。',
        '天平平衡式本来是「物 = 码 + 游码」，放反后变成「码 = 物 + 游码」——重新算一算药品真实质量。'),
      makeQuiz(errCard,
        '② 量取水时<b>仰视读数</b>，所配溶液的溶质质量分数会？',
        [
          { t: '偏大', ok: false },
          { t: '偏小', ok: true },
          { t: '不变', ok: false }
        ],
        '仰视时读数<b>比实际体积小</b>：以为量够了 47 mL，实际量取的水<b>偏多</b>，溶剂偏多而溶质不变，溶质质量分数<b>偏小</b>。（口诀：仰小俯大——指的是读数与真实体积的关系。）',
        '画一条视线：仰视时眼睛看到的刻度线，比实际液面低还是高？'),
      makeQuiz(errCard,
        '③ 称量用的<b>砝码生锈</b>了，所配溶液的溶质质量分数会？',
        [
          { t: '偏大', ok: true },
          { t: '偏小', ok: false },
          { t: '不变', ok: false }
        ],
        '砝码生锈后<b>实际质量变大</b>：标着 3 g 的砝码实际上超过 3 g，按它称出的溶质<b>偏多</b>，溶质质量分数<b>偏大</b>。',
        '生锈让砝码变重还是变轻？天平平衡时药品跟着砝码走。');
      sideE.appendChild(errCard);
      rowE.appendChild(panelE);
      rowE.appendChild(sideE);
      container.appendChild(rowE);

      /* ---------- 学霸加餐 ---------- */
      container.appendChild(A.el(
        '<details class="pro-box"><summary>学霸加餐 · 饱和溶液的"变与不变" + 曲线综合题套路</summary><div class="pro-body">' +

        '<div class="pro-item"><span class="pro-tag">压轴题型</span>' +
        '<b>恒温蒸发饱和溶液</b>：对饱和溶液<b>恒温</b>蒸发溶剂，会析出晶体，但剩余溶液仍是该温度下的饱和溶液；' +
        '因为温度不变 → 溶解度不变 → 饱和溶液的溶质质量分数 <span class="hl">S/(100+S)×100%</span> 不变。' +
        '结论一句话：<b>析出晶体，但浓度不变</b>。变的是溶质、溶剂、溶液的质量（都减小），不变的是浓度。</div>' +

        '<div class="pro-item"><span class="pro-tag">易错辨析</span>' +
        '<b>降温结晶之后</b>：饱和溶液降温析出晶体，溶质质量减小、溶液质量减小、溶质质量分数<b>变小</b>——' +
        '但溶液<b>仍然饱和</b>（是更低温度下的饱和溶液）。"析出晶体后溶液变成不饱和"是经典错答，阅卷老师专抓这句。</div>' +

        '<div class="pro-item"><span class="pro-tag">解题套路</span>' +
        '<b>溶解度曲线综合题四步走</b>：<span class="hl">读点</span>（读出某温度下的溶解度，注意单位是 g/100g 水）→ ' +
        '<span class="hl">看升降</span>（判断溶解度随温度的变化趋势，据此选定结晶方法）→ ' +
        '<span class="hl">比大小</span>（同一温度下作竖线，谁的曲线高谁的溶解度大；比饱和溶液浓度同理）→ ' +
        '<span class="hl">判结晶</span>（降温还是蒸发、析出多少晶体，用始末状态溶解度之差 × 溶剂/100 计算）。</div>' +

        '<div class="pro-item"><span class="pro-tag">压轴题型</span>' +
        '<b>交点温度下的等量比较</b>：t°C 时甲、乙溶解度相等（均为 S），则该温度下二者<b>饱和溶液</b>的溶质质量分数相等' +
        '（都等于 S/(100+S)×100%）；配制<b>等质量</b>的甲、乙饱和溶液，所需溶质质量相等、所需溶剂质量也相等。' +
        '但注意两大前提：<b>「饱和」</b>和<b>「等质量」</b>——换成不饱和溶液或溶液质量不等，结论全部失效。' +
        '考题最爱把"等质量的饱和溶液"偷换成"等质量的溶液"，一字之差，整题归零。</div>' +

        '</div></details>'));

      /* ---------- takeaway ---------- */
      container.appendChild(A.el(
        '<div class="takeaway">溶解度曲线三句话——<b>坡度大用降温结晶</b>（如 KNO₃），<b>坡度小用蒸发结晶</b>（如 NaCl），' +
        '<b>Ca(OH)₂ 永远跟别人反着来</b>。读图先看温度、再看点位：<b>线上饱和、上方有固体、下方不饱和</b>。' +
        '👉 下一站 <b>ZONE 11</b>「酸和碱」，溶液的世界里要加入 H⁺ 和 OH⁻ 了！</div>'));

      /* 启动各交互 */
      initForm(panelA, container);
      initSat(panelB, container);
      initCurve(panelC, container);
      initCrystal(panelD);
      initFrac(panelE);
    }
  };
})();
