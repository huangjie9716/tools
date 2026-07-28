/* ============================================================
   ZONE 01 · 元素的由来（宇宙大爆炸与核聚变）
   交互一：宇宙元素时间轴（6 阶段 canvas 动画 + 滑块）
   交互二：核聚变演示台（H + H → He + 能量，含计数器）
   ============================================================ */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* ---------------- 六个阶段的文案（教材规范表述） ---------------- */
  var STAGES = [
    {
      val: '① 大爆炸',
      title: '宇宙大爆炸 · 约 138 亿年前',
      desc: '宇宙起源于一个温度极高、密度极大的"原始火球"，它在一次大爆炸中开始膨胀，时间、空间、物质和能量就此登场。那时的宇宙还没有任何元素，只有一锅炽热的能量"浓汤"。',
      exam: '宇宙大爆炸是目前被广泛接受的宇宙起源学说，作科普了解即可；化学考试更关心的是：<b>元素是具有相同核电荷数（即质子数）的一类原子的总称</b>。'
    },
    {
      val: '② 原初元素',
      title: '大爆炸后约 3 分钟 · 只有氢、氦和极少量的锂',
      desc: '随着宇宙膨胀降温，质子和中子结合成最早的原子核。这个阶段只诞生了最轻的几种元素：大量的氢、约四分之一的氦，以及痕量的锂。此时宇宙中找不到任何更重的元素——没有碳，没有氧，也没有铁。',
      exam: '地壳中含量最多的元素是<b>氧</b>，含量最多的金属元素是<b>铝</b>；而这些"重"元素此时全都还不存在。'
    },
    {
      val: '③ 恒星点燃',
      title: '第一代恒星点燃 · 宇宙有了"元素熔炉"',
      desc: '在引力作用下，氢、氦气体云不断向中心聚拢，核心被越压越热，当温度高到足以点燃核聚变时，第一代恒星诞生了。从此，宇宙有了锻造元素的熔炉。',
      exam: '太阳主要由氢和氦组成，它发光发热的能量来自其内部发生的<b>核聚变</b>——氢核聚变成氦核，释放出巨大的能量。'
    },
    {
      val: '④ 核聚变',
      title: '恒星核聚变 · 氢 → 氦 → 碳 → 氧 → … → 铁',
      desc: '恒星内部像洋葱一样分层进行聚变：氢聚变成氦，氦再聚变成碳、氧，大质量恒星还能一路锻出硅、硫……直到铁。铁是这条聚变链的终点——铁核聚变不再释放能量，恒星的生命也走到尽头。',
      exam: '元素周期表中的元素不是凭空存在的：<b>碳、氧、硅、铁等常见元素都诞生于恒星内部</b>；化学变化中原子种类不变，元素的"变身"只发生在恒星级别的核反应中。'
    },
    {
      val: '⑤ 超新星',
      title: '超新星爆发 · 比铁更重的元素在此诞生',
      desc: '大质量恒星死亡时发生剧烈的超新星爆发，一瞬间的高温和高压合成了比铁更重的元素（如金、银、碘），并把恒星一生锻造的全部元素猛烈抛洒到宇宙空间，成为下一代恒星和行星的原料。',
      exam: '地壳中元素含量居前四位的依次是<b>氧、硅、铝、铁</b>——它们都是被某次超新星"快递"到太阳系来的。'
    },
    {
      val: '⑥ 地球形成',
      title: '太阳系与地球形成 · 约 46 亿年前',
      desc: '一朵富含几代星尘的气体云坍缩形成了太阳，余下的尘埃聚成行星。地球继承了宇宙 90 多亿年锻造的全部元素：氧构成水和空气，硅构成岩石，铁沉入地核，碳则搭起了生命的骨架。',
      exam: '人体中含量最多的元素是<b>氧</b>（约占 65%），其次是碳、氢、氮；地壳中是氧最多，生物细胞中也是氧最多，别记混了。'
    }
  ];

  /* ================================================================
     交互一 · 宇宙元素时间轴
     ================================================================ */
  function Timeline(stage) {
    this.canvas = App.el('<canvas></canvas>');
    stage.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.mode = 0;
    this.t = 0;
    this.flash = 0;
    this.explTimer = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = 600; this.H = 460;

    this.particles = [];
    for (var i = 0; i < 150; i++) this.particles.push(this.newParticle());

    var self = this;
    if (window.ResizeObserver) {
      new ResizeObserver(function () { self.resize(); }).observe(stage);
    }
    this.resize();
    this.enterStage(0);

    this.raf = function (ts) { self.tick(ts); requestAnimationFrame(self.raf); };
    requestAnimationFrame(this.raf);
  }

  Timeline.prototype.newParticle = function () {
    return { x: Math.random() * this.W, y: Math.random() * this.H, vx: 0, vy: 0,
             size: 1 + Math.random() * 1.8, a: 0.3 + Math.random() * 0.7,
             tw: Math.random() * TAU, white: Math.random() < 0.35 };
  };

  Timeline.prototype.resize = function () {
    var w = this.canvas.parentElement.clientWidth || 600;
    this.W = w; this.H = 460;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  Timeline.prototype.enterStage = function (i) {
    this.mode = i;
    var cx = this.W / 2, cy = this.H / 2, k, p;
    if (i === 0) { /* 大爆炸：粒子从中心迸发 */
      for (k = 0; k < this.particles.length; k++) this.respawnBurst(this.particles[k], cx, cy, 2.5, 7);
    } else if (i === 1) { /* 原初气体云：稀疏缓慢漂浮 */
      for (k = 0; k < this.particles.length; k++) {
        p = this.particles[k];
        p.x = Math.random() * this.W; p.y = Math.random() * this.H;
        var ang = Math.random() * TAU, sp = 0.1 + Math.random() * 0.35;
        p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp;
        p.a = 0.15 + Math.random() * 0.45;
      }
    } else if (i === 2) { /* 引力聚拢成恒星 */
      for (k = 0; k < this.particles.length; k++) {
        p = this.particles[k];
        p.x = Math.random() * this.W; p.y = Math.random() * this.H;
        p.vx = 0; p.vy = 0; p.a = 0.4 + Math.random() * 0.6;
      }
    } else if (i === 3) { /* 洋葱分层：粒子化作环绕的余烬 */
      for (k = 0; k < this.particles.length; k++) this.respawnOrbit(this.particles[k], cx, cy);
    } else if (i === 4) { /* 超新星：先聚拢待爆 */
      this.explTimer = 0; this.flash = 0;
      for (k = 0; k < this.particles.length; k++) this.respawnBurst(this.particles[k], cx, cy, 3, 8);
    } else if (i === 5) { /* 行星：粒子从边缘涌入 */
      for (k = 0; k < this.particles.length; k++) {
        p = this.particles[k];
        var a2 = Math.random() * TAU, r = Math.max(this.W, this.H) * 0.55;
        p.x = cx + Math.cos(a2) * r; p.y = cy + Math.sin(a2) * r;
        p.vx = 0; p.vy = 0; p.a = 0.3 + Math.random() * 0.6;
      }
      this.orbiters = [];
      var els = ['H', 'C', 'O', 'Fe', 'Si', 'N', 'Ca', 'Mg'];
      for (k = 0; k < els.length; k++) {
        this.orbiters.push({
          el: els[k],
          ang: (k / els.length) * TAU,
          r: 0.42 + (k % 3) * 0.13,
          sp: (0.15 + Math.random() * 0.2) * (k % 2 ? 1 : -1),
          metal: ['Fe', 'Ca', 'Mg'].indexOf(els[k]) >= 0
        });
      }
    }
  };

  Timeline.prototype.respawnBurst = function (p, cx, cy, vmin, vmax) {
    var ang = Math.random() * TAU, sp = vmin + Math.random() * (vmax - vmin);
    p.x = cx; p.y = cy;
    p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp;
    p.a = 0.5 + Math.random() * 0.5;
    p.size = 1 + Math.random() * 2;
  };

  Timeline.prototype.respawnOrbit = function (p, cx, cy) {
    var ang = Math.random() * TAU, r = 70 + Math.random() * 130;
    p.x = cx + Math.cos(ang) * r; p.y = cy + Math.sin(ang) * r;
    var sp = 0.006 + Math.random() * 0.01;
    p.vx = -Math.sin(ang) * sp * r; p.vy = Math.cos(ang) * sp * r;
    p.a = 0.12 + Math.random() * 0.3;
  };

  Timeline.prototype.tick = function () {
    var c = this.canvas;
    if (!c.isConnected || c.offsetParent === null) return;
    this.t += 1 / 60;
    var ctx = this.ctx, W = this.W, H = this.H, cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);

    var ps = this.particles, k, p;
    if (this.mode === 0) {
      for (k = 0; k < ps.length; k++) {
        p = ps[k];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.998; p.vy *= 0.998;
        if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) this.respawnBurst(p, cx, cy, 2.5, 7);
      }
      this.drawParticles(ctx, ps);
      this.glow(ctx, cx, cy, 60 + Math.sin(this.t * 3) * 8, 'rgba(255,255,255,0.5)');
      this.centerLabel(ctx, cx, H - 26, '奇点爆发 · 时空与能量诞生');
    } else if (this.mode === 1) {
      for (k = 0; k < ps.length; k++) {
        p = ps[k];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x += W; if (p.x > W) p.x -= W;
        if (p.y < 0) p.y += H; if (p.y > H) p.y -= H;
      }
      this.drawParticles(ctx, ps.slice(0, 80));
      this.centerLabel(ctx, cx, H - 26, '只有氢、氦和极少量锂 · 黑暗而单调的宇宙');
    } else if (this.mode === 2) {
      var pull = 0.012;
      for (k = 0; k < ps.length; k++) {
        p = ps[k];
        var dx = cx - p.x, dy = cy - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx += (dx / d) * pull * Math.min(d / 40, 3);
        p.vy += (dy / d) * pull * Math.min(d / 40, 3);
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy;
        if (d < 26) { /* 被恒星"吸收"，从远处再来 */
          var ang = Math.random() * TAU, r = Math.max(W, H) * 0.6;
          p.x = cx + Math.cos(ang) * r; p.y = cy + Math.sin(ang) * r;
          p.vx = 0; p.vy = 0;
        }
      }
      this.drawParticles(ctx, ps);
      this.glow(ctx, cx, cy, 46 + Math.sin(this.t * 4) * 6, 'rgba(251,191,36,0.55)');
      ctx.fillStyle = '#fff7e0';
      ctx.beginPath(); ctx.arc(cx, cy, 14 + Math.sin(this.t * 4) * 1.5, 0, TAU); ctx.fill();
      this.centerLabel(ctx, cx, H - 26, '引力聚拢 · 第一代恒星点燃');
    } else if (this.mode === 3) {
      for (k = 0; k < ps.length; k++) {
        p = ps[k];
        p.x += p.vx; p.y += p.vy;
        var dd = Math.sqrt((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy));
        if (dd > 240 || dd < 60) this.respawnOrbit(p, cx, cy);
      }
      this.drawParticles(ctx, ps);
      this.drawOnion(ctx, cx, cy);
      this.centerLabel(ctx, cx, H - 26, '洋葱式分层聚变 · 铁是聚变链的终点');
    } else if (this.mode === 4) {
      this.explTimer += 1 / 60;
      if (this.explTimer > 3.6) { /* 重新聚拢再爆发，形成循环 */
        this.explTimer = 0; this.flash = 1;
        for (k = 0; k < ps.length; k++) this.respawnBurst(ps[k], cx, cy, 3.5, 9);
      }
      this.flash *= 0.94;
      for (k = 0; k < ps.length; k++) {
        p = ps[k];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.995; p.vy *= 0.995;
        p.a *= 0.997;
      }
      this.drawParticles(ctx, ps);
      if (this.flash > 0.02) {
        this.glow(ctx, cx, cy, 200 * this.flash + 60, 'rgba(255,255,255,' + (0.7 * this.flash) + ')');
      }
      this.glow(ctx, cx, cy, 30, 'rgba(244,114,182,0.5)');
      this.centerLabel(ctx, cx, H - 26, '超新星爆发 · 重元素诞生并抛洒宇宙');
    } else if (this.mode === 5) {
      for (k = 0; k < ps.length; k++) {
        p = ps[k];
        var dx5 = cx - p.x, dy5 = cy - p.y, d5 = Math.sqrt(dx5 * dx5 + dy5 * dy5) || 1;
        p.vx += (dx5 / d5) * 0.03 - (dy5 / d5) * 0.012; /* 螺旋汇入 */
        p.vy += (dy5 / d5) * 0.03 + (dx5 / d5) * 0.012;
        p.vx *= 0.96; p.vy *= 0.96;
        p.x += p.vx; p.y += p.vy;
        if (d5 < 30) {
          var a5 = Math.random() * TAU, r5 = Math.max(W, H) * 0.55;
          p.x = cx + Math.cos(a5) * r5; p.y = cy + Math.sin(a5) * r5;
          p.vx = 0; p.vy = 0;
        }
      }
      this.drawParticles(ctx, ps);
      this.drawPlanet(ctx, cx, cy);
      this.centerLabel(ctx, cx, H - 26, '星尘汇聚 · 太阳系与地球形成');
    }
  };

  Timeline.prototype.drawParticles = function (ctx, ps) {
    for (var k = 0; k < ps.length; k++) {
      var p = ps[k];
      var tw = 0.7 + 0.3 * Math.sin(this.t * 3 + p.tw);
      ctx.globalAlpha = p.a * tw;
      ctx.fillStyle = p.white ? '#ffffff' : '#22d3ee';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Timeline.prototype.glow = function (ctx, x, y, r, color) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  };

  Timeline.prototype.drawOnion = function (ctx, cx, cy) {
    var R = Math.min(this.W, this.H) * 0.30;
    var layers = [ /* 由外到内绘制（大圆先画，小圆叠在上层）；实际结构由内到外为 Fe/Si/O/C/He/H */
      { el: 'H',  f: 1.00, c: 'rgba(255,255,255,0.80)' },
      { el: 'He', f: 0.84, c: 'rgba(56,240,255,0.70)' },
      { el: 'C',  f: 0.68, c: 'rgba(52,211,153,0.70)' },
      { el: 'O',  f: 0.52, c: 'rgba(244,114,182,0.70)' },
      { el: 'Si', f: 0.36, c: 'rgba(251,191,36,0.78)' },
      { el: 'Fe', f: 0.20, c: 'rgba(148,163,184,0.90)' }
    ];
    var pulse = 1 + Math.sin(this.t * 2.2) * 0.02;
    this.glow(ctx, cx, cy, R * 1.6, 'rgba(251,191,36,' + (0.16 + 0.06 * Math.sin(this.t * 2.2)) + ')');
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i], r = R * L.f * pulse;
      ctx.fillStyle = L.c;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(10,14,20,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      /* 标签画在各层右上斜线上 */
      var lx = cx + r * Math.cos(-Math.PI / 4), ly = cy + r * Math.sin(-Math.PI / 4);
      ctx.fillStyle = '#0a0e14';
      ctx.font = 'bold 12px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(L.el, lx, ly);
    }
  };

  Timeline.prototype.drawPlanet = function (ctx, cx, cy) {
    var R = Math.min(this.W, this.H) * 0.16;
    this.glow(ctx, cx, cy, R * 2.4, 'rgba(34,211,238,0.18)');
    var g = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.2, cx, cy, R);
    g.addColorStop(0, '#7dd3fc');
    g.addColorStop(0.55, '#0ea5e9');
    g.addColorStop(1, '#134e6e');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    /* 大陆色块 */
    ctx.fillStyle = 'rgba(52,211,153,0.55)';
    ctx.beginPath(); ctx.arc(cx - R * 0.3, cy + R * 0.15, R * 0.32, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + R * 0.35, cy - R * 0.3, R * 0.22, 0, TAU); ctx.fill();
    /* 环绕的元素符号 */
    for (var i = 0; i < this.orbiters.length; i++) {
      var o = this.orbiters[i];
      o.ang += o.sp / 60;
      var or_ = R * (2.1 + o.r * 1.6);
      var x = cx + Math.cos(o.ang) * or_, y = cy + Math.sin(o.ang) * or_ * 0.62;
      ctx.strokeStyle = 'rgba(34,211,238,0.10)';
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.ellipse(cx, cy, or_, or_ * 0.62, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = o.metal ? '#fbbf24' : '#22d3ee';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
      ctx.font = 'bold 12px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.shadowColor = o.metal ? 'rgba(251,191,36,0.8)' : 'rgba(34,211,238,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillText(o.el, x, y - 5);
      ctx.shadowBlur = 0;
    }
  };

  Timeline.prototype.centerLabel = function (ctx, cx, y, text) {
    ctx.font = '12px "PingFang SC", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(148,163,184,0.85)';
    ctx.fillText(text, cx, y);
  };

  /* ================================================================
     交互二 · 核聚变演示台
     ================================================================ */
  function Fusion(stage, onFused) {
    this.canvas = App.el('<canvas></canvas>');
    stage.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.onFused = onFused;
    this.state = 'idle';
    this.t = 0;
    this.fuseT = 0;
    this.flash = 0;
    this.heScale = 0;
    this.sparks = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = 600; this.H = 380;
    this.v = 0; this.sep = 0; /* sep: 两球与中心的水平距离 */

    var self = this;
    if (window.ResizeObserver) {
      new ResizeObserver(function () { self.resize(); }).observe(stage);
    }
    this.resize();
    this.reset();

    this.raf = function () { self.tick(); requestAnimationFrame(self.raf); };
    requestAnimationFrame(this.raf);
  }

  Fusion.prototype.resize = function () {
    var w = this.canvas.parentElement.clientWidth || 600;
    this.W = w; this.H = 380;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.restSep = Math.min(this.W * 0.28, 200);
    if (this.state === 'idle') this.sep = this.restSep;
  };

  Fusion.prototype.reset = function () {
    this.state = 'idle';
    this.sep = this.restSep || Math.min(this.W * 0.28, 200);
    this.v = 0;
    this.flash = 0;
    this.heScale = 0;
    this.sparks = [];
  };

  Fusion.prototype.ignite = function () {
    if (this.state !== 'idle') return false;
    this.state = 'approach';
    this.v = 1.2;
    return true;
  };

  Fusion.prototype.tick = function () {
    var c = this.canvas;
    if (!c.isConnected || c.offsetParent === null) return;
    this.t += 1 / 60;
    var ctx = this.ctx, W = this.W, H = this.H, cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);

    if (this.state === 'approach') {
      this.v += 0.22;
      this.sep -= this.v;
      if (this.sep <= 26) {
        this.state = 'fuse';
        this.fuseT = 0;
        this.flash = 1;
        this.heScale = 0;
        this.sparks = [];
        for (var i = 0; i < 46; i++) {
          var ang = Math.random() * TAU, sp = 2 + Math.random() * 6;
          this.sparks.push({
            x: cx, y: cy,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            a: 0.9, size: 1 + Math.random() * 2.2,
            mag: Math.random() < 0.4
          });
        }
        this.onFused();
      }
    } else if (this.state === 'fuse') {
      this.fuseT += 1 / 60;
      this.flash *= 0.93;
      this.heScale = Math.min(1, this.heScale + 0.09);
      if (this.fuseT > 2.4) this.reset();
    }

    /* 背景星光 */
    ctx.fillStyle = 'rgba(148,163,184,0.35)';
    for (var s = 0; s < 24; s++) {
      var sx = ((s * 97.13) % 1) * W || ((s * 97.13 % 100) / 100) * W;
      var sy = ((s * 53.7) % 1) * H || ((s * 53.7 % 100) / 100) * H;
      var twk = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.5 + s));
      ctx.globalAlpha = twk * 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, 1.1, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.state !== 'fuse') {
      /* 两个氢核小球 */
      var bob = Math.sin(this.t * 2.4) * 6;
      var speedGlow = this.state === 'approach' ? Math.min(this.v / 9, 1) : 0;
      this.drawNucleus(ctx, cx - this.sep, cy + bob, 'H', '#22d3ee', 16, speedGlow);
      this.drawNucleus(ctx, cx + this.sep, cy - bob, 'H', '#22d3ee', 16, speedGlow);
      if (this.state === 'idle') {
        ctx.font = '12px "PingFang SC", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(148,163,184,0.8)';
        ctx.fillText('两个氢核等待注入能量……', cx, H - 26);
      }
    } else {
      /* 闪光 */
      if (this.flash > 0.02) {
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 260 * this.flash + 60);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.85 * this.flash) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      /* 氦核 */
      var ease = 1 + 2.7 * Math.pow(this.heScale - 1, 3) + 1.7 * Math.pow(this.heScale - 1, 2); /* easeOutBack */
      var sc = Math.max(ease, 0.01);
      var hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 * sc);
      hg.addColorStop(0, 'rgba(251,191,36,0.5)');
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(cx, cy, 60 * sc, 0, TAU); ctx.fill();
      this.drawNucleus(ctx, cx, cy, 'He', '#f472b6', 26 * sc, 1);
      /* 能量粒子 */
      for (var k = 0; k < this.sparks.length; k++) {
        var p = this.sparks[k];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.985; p.vy *= 0.985;
        p.a *= 0.985;
        ctx.globalAlpha = Math.max(p.a, 0);
        ctx.fillStyle = p.mag ? '#f472b6' : '#fbbf24';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.font = '12px "PingFang SC", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(251,191,36,0.9)';
      ctx.fillText('氢核聚变成氦核 · 释放巨大能量 ✨', cx, H - 26);
    }
  };

  Fusion.prototype.drawNucleus = function (ctx, x, y, label, color, r, glowK) {
    if (glowK > 0) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      g.addColorStop(0, color.replace(')', ',0.45)').replace('rgb', 'rgba').replace('#22d3ee', 'rgba(34,211,238,0.45)').replace('#f472b6', 'rgba(244,114,182,0.45)'));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0e14';
    ctx.font = 'bold ' + Math.round(r * 0.9) + 'px "SF Mono", Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
  };

  /* ================================================================
     板块入口
     ================================================================ */
  window.Zone1 = {
    desc: '宇宙大爆炸之初只有最轻的<b>氢和氦</b>；恒星内部通过<b>核聚变</b>把轻元素一步步锻造成碳、氧、硅、铁；' +
          '大质量恒星死亡时的<b>超新星爆发</b>合成更重的元素并把它们抛洒到宇宙。' +
          '你身体里的每一个碳原子，都曾是一颗恒星的炉火。✨',

    init: function (container) {
      /* ---------- 交互一：宇宙元素时间轴 ---------- */
      var p1 = App.el(
        '<div class="panel z1-panel">' +
          '<div class="panel-title">交互一 · 宇宙元素时间轴</div>' +
          '<div class="layout-2col">' +
            '<div>' +
              '<div class="stage z1-stage"><div class="stage-caption">COSMIC TIMELINE · 138 亿年</div></div>' +
              '<div class="slider-row" style="margin-top:14px">' +
                '<label>时间轴</label>' +
                '<input type="range" class="z1-slider" min="0" max="5" step="1" value="0">' +
                '<span class="slider-val z1-stage-val">① 大爆炸</span>' +
              '</div>' +
            '</div>' +
            '<div class="console">' +
              '<div class="console-card accent">' +
                '<div class="card-label">当前阶段</div>' +
                '<div class="card-value small z1-stage-title"></div>' +
                '<p class="z1-stage-desc"></p>' +
              '</div>' +
              '<div class="console-card accent-a">' +
                '<div class="card-label">🎯 考试相关</div>' +
                '<p class="z1-exam-text"></p>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
      container.appendChild(p1);

      var stage1 = p1.querySelector('.z1-stage');
      var slider = p1.querySelector('.z1-slider');
      var stageVal = p1.querySelector('.z1-stage-val');
      var stageTitle = p1.querySelector('.z1-stage-title');
      var stageDesc = p1.querySelector('.z1-stage-desc');
      var examText = p1.querySelector('.z1-exam-text');

      var timeline = new Timeline(stage1);

      function applyStage(i) {
        var s = STAGES[i];
        stageVal.textContent = s.val;
        stageTitle.textContent = s.title;
        stageDesc.textContent = s.desc;
        examText.innerHTML = s.exam;
        timeline.enterStage(i);
      }
      slider.addEventListener('input', function () { applyStage(Number(slider.value)); });
      applyStage(0);

      /* ---------- 交互二：核聚变演示台 ---------- */
      var p2 = App.el(
        '<div class="panel z1-panel">' +
          '<div class="panel-title">交互二 · 核聚变演示台</div>' +
          '<div class="layout-2col">' +
            '<div class="stage z1-fusion-stage"><div class="stage-caption">NUCLEAR FUSION · 恒星之火</div></div>' +
            '<div class="console">' +
              '<div class="console-card accent">' +
                '<div class="card-label">原理说明</div>' +
                '<p class="z1-stage-desc">' +
                  '核聚变是指<b class="z1-hl">轻的原子核结合成较重的原子核</b>的过程，会释放出巨大的能量。' +
                  '太阳每时每刻都在进行着氢核聚变成氦核的反应，这正是太阳发光发热的能量源泉；' +
                  '人类正在研究的"人造太阳"（可控核聚变），利用的也是同一个原理。' +
                '</p>' +
              '</div>' +
              '<div class="z1-counters">' +
                '<div class="console-card">' +
                  '<div class="card-label">已聚变次数</div>' +
                  '<div class="card-value z1-cnt-fuse">0</div>' +
                '</div>' +
                '<div class="console-card">' +
                  '<div class="card-label">已生成氦核数</div>' +
                  '<div class="card-value z1-cnt-he">0</div>' +
                '</div>' +
                '<div class="console-card">' +
                  '<div class="card-label">释放能量</div>' +
                  '<div class="card-value z1-cnt-energy">0</div>' +
                '</div>' +
              '</div>' +
              '<div class="btn-row">' +
                '<button class="btn btn-primary z1-ignite">⚡ 注入能量，启动聚变</button>' +
                '<button class="btn z1-reset-cnt">计数清零</button>' +
              '</div>' +
              '<p class="z1-note">注：两个氢核聚变成一个氦核只是示意；真实的太阳内部每秒钟约有 6 亿吨氢参与聚变，场面比这里"亿"点点壮观。</p>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
      container.appendChild(p2);

      var cntFuse = p2.querySelector('.z1-cnt-fuse');
      var cntHe = p2.querySelector('.z1-cnt-he');
      var cntEnergy = p2.querySelector('.z1-cnt-energy');
      var btnIgnite = p2.querySelector('.z1-ignite');
      var btnReset = p2.querySelector('.z1-reset-cnt');
      var fuseCount = 0;

      function renderCounters() {
        cntFuse.textContent = fuseCount;
        cntHe.textContent = fuseCount;
        cntEnergy.textContent = fuseCount === 0 ? '0' : App.num(fuseCount * 2.8, 1) + '×10⁻¹² J';
      }

      var fusion = new Fusion(p2.querySelector('.z1-fusion-stage'), function () {
        fuseCount++;
        renderCounters();
      });

      btnIgnite.addEventListener('click', function () {
        if (fusion.ignite()) {
          btnIgnite.disabled = true;
          var wait = setInterval(function () {
            if (fusion.state === 'idle') {
              btnIgnite.disabled = false;
              clearInterval(wait);
            }
          }, 200);
        }
      });
      btnReset.addEventListener('click', function () {
        fuseCount = 0;
        renderCounters();
      });
      renderCounters();

      /* ---------- 结论 ---------- */
      container.appendChild(App.el(
        '<div class="takeaway">' +
          '<b>万物皆星尘</b>——组成你身体的碳、氧、钙、铁，全部来自某颗死去的恒星。' +
          '化学元素不是被"制造"出来的商品，而是宇宙 138 亿年演化的遗产。' +
          '化学变化中原子的种类不会改变，所以请珍惜身边的每一个原子：它们都见过恒星的一生。✨' +
        '</div>'
      ));
    }
  };
})();
