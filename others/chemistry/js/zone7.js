/* ZONE 07 · 化学方程式的配平（闯关游戏）
   导出 window.Zone7 = { desc, init(container) } */
window.Zone7 = (function () {
  'use strict';

  const desc = '配平就是在化学式前面配上适当的<b>化学计量数</b>，使等号两边每一种原子的<b>个数相等</b>。注意：只能改化学式<b>前面的系数</b>，绝不能改化学式里的下标——下标一改，物质就变了！';

  /* ---------------- 关卡数据 ----------------
     ans 顺序：左侧化学式系数 → 右侧化学式系数 */
  const LEVELS = [
    {
      title: '氢气在氧气中燃烧', method: '观察法', cond: '点燃',
      left: [{ f: 'H2', atoms: { H: 2 } }, { f: 'O2', atoms: { O: 2 } }],
      right: [{ f: 'H2O', atoms: { H: 2, O: 1 } }],
      ans: [2, 1, 2], gasRight: [false, false],
      hint: '右边 H₂O 中氧原子只有 1 个，左边 O₂ 却是 2 个——先给 H₂O 配上 2 让氧原子相等，再回头数氢原子。'
    },
    {
      title: '红磷在氧气中燃烧', method: '最小公倍数法', cond: '点燃',
      left: [{ f: 'P', atoms: { P: 1 } }, { f: 'O2', atoms: { O: 2 } }],
      right: [{ f: 'P2O5', atoms: { P: 2, O: 5 } }],
      ans: [4, 5, 2], gasRight: [false, false],
      hint: '氧原子：左边每份 2 个，右边每份 5 个，最小公倍数是 10——O₂ 配 5、P₂O₅ 配 2，最后把 P 配成 4。'
    },
    {
      title: '铁丝在氧气中燃烧', method: '观察法', cond: '点燃',
      left: [{ f: 'Fe', atoms: { Fe: 1 } }, { f: 'O2', atoms: { O: 2 } }],
      right: [{ f: 'Fe3O4', atoms: { Fe: 3, O: 4 } }],
      ans: [3, 2, 1], gasRight: [false, false],
      hint: 'Fe₃O₄ 最复杂，先把它的系数定为 1，再数铁原子和氧原子。口诀："先找复杂化学式，系数定一再来凑。"'
    },
    {
      title: '加热氯酸钾制氧气', method: '最小公倍数法', cond: 'MnO₂ 作催化剂、加热',
      left: [{ f: 'KClO3', atoms: { K: 1, Cl: 1, O: 3 } }],
      right: [{ f: 'KCl', atoms: { K: 1, Cl: 1 } }, { f: 'O2', atoms: { O: 2 } }],
      ans: [2, 2, 3], gasRight: [false, true],
      hint: '氧原子：左边每份 3 个，右边每份 2 个，最小公倍数是 6——KClO₃ 配 2、O₂ 配 3，最后 KCl 配 2。'
    },
    {
      title: '加热高锰酸钾制氧气', method: '观察法', cond: '加热',
      left: [{ f: 'KMnO4', atoms: { K: 1, Mn: 1, O: 4 } }],
      right: [
        { f: 'K2MnO4', atoms: { K: 2, Mn: 1, O: 4 } },
        { f: 'MnO2', atoms: { Mn: 1, O: 2 } },
        { f: 'O2', atoms: { O: 2 } }
      ],
      ans: [2, 1, 1, 1], gasRight: [false, false, true],
      hint: '右边 K₂MnO₄ 里有 2 个钾原子，而左边 KMnO₄ 只有 1 个——先给 KMnO₄ 配 2，再依次核对锰、氧。'
    },
    {
      title: '电解水', method: '最小公倍数法', cond: '通电',
      left: [{ f: 'H2O', atoms: { H: 2, O: 1 } }],
      right: [{ f: 'H2', atoms: { H: 2 } }, { f: 'O2', atoms: { O: 2 } }],
      ans: [2, 2, 1], gasRight: [true, true],
      hint: '氧原子：左边每份 1 个，右边每份 2 个，最小公倍数是 2——H₂O 配 2，再把 H₂ 配成 2。'
    },
    {
      title: '甲烷燃烧', method: '观察法', cond: '点燃',
      left: [{ f: 'CH4', atoms: { C: 1, H: 4 } }, { f: 'O2', atoms: { O: 2 } }],
      right: [{ f: 'CO2', atoms: { C: 1, O: 2 } }, { f: 'H2O', atoms: { H: 2, O: 1 } }],
      ans: [1, 2, 1, 2], gasRight: [false, false],
      hint: 'CH₄ 最复杂，系数定为 1，碳、氢原子就都有了着落（CO₂ 配 1、H₂O 配 2），最后数一数氧原子凑 O₂。'
    },
    {
      title: '一氧化碳还原氧化铁', method: '观察法', cond: '高温',
      left: [{ f: 'Fe2O3', atoms: { Fe: 2, O: 3 } }, { f: 'CO', atoms: { C: 1, O: 1 } }],
      right: [{ f: 'Fe', atoms: { Fe: 1 } }, { f: 'CO2', atoms: { C: 1, O: 2 } }],
      ans: [1, 3, 2, 3], gasRight: [false, false],
      hint: '每 1 个 CO 分子夺得 1 个氧原子变成 1 个 CO₂；Fe₂O₃ 中有 3 个氧原子，需要几个 CO 来"搬运"？CO 和 CO₂ 都配 3，Fe 配 2。'
    }
  ];

  const CONFETTI_COLORS = ['#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#38f0ff', '#e2e8f0'];

  function init(container) {
    /* ---------------- 状态 ---------------- */
    const state = {
      level: 0,
      coefs: [],
      done: LEVELS.map(() => false),
      peeked: LEVELS.map(() => false),
      solved: false,      // 当前关是否已通过
      finished: false     // 全部通关
    };

    /* ---------------- 整体骨架 ---------------- */
    const root = App.el(
      '<div class="z6-root">' +
        '<div class="panel z6-progress-panel">' +
          '<div class="z6-progress-top">' +
            '<span class="tag cyan" id="z6-levelTag">第 1 / 8 关</span>' +
            '<span class="z6-dots" id="z6-dots"></span>' +
            '<span class="z6-progress-num" id="z6-progressNum">已通关 0 / 8</span>' +
          '</div>' +
          '<div class="z6-bar"><div class="z6-bar-fill" id="z6-barFill"></div></div>' +
        '</div>' +
        '<div class="layout-2col z6-main" id="z6-main">' +
          '<div class="panel z6-stage-panel" id="z6-stagePanel">' +
            '<div class="panel-title">配平闯关 · <span id="z6-levelTitle"></span></div>' +
            '<div class="z6-method-row">' +
              '<span class="tag amber" id="z6-methodTag"></span>' +
              '<span class="tag" id="z6-condTag"></span>' +
              '<span class="tag magenta z6-peek-tag" id="z6-peekTag" style="display:none">已查看答案</span>' +
            '</div>' +
            '<div class="z6-eq-area" id="z6-eqArea"></div>' +
            '<div class="z6-success" id="z6-success" style="display:none"></div>' +
            '<canvas class="z6-confetti" id="z6-confetti"></canvas>' +
            '<div class="btn-row z6-btn-row">' +
              '<button class="btn" id="z6-resetBtn">重置本关</button>' +
              '<button class="btn btn-primary" id="z6-nextBtn" disabled>下一关 →</button>' +
            '</div>' +
          '</div>' +
          '<div class="console">' +
            '<div class="console-card accent">' +
              '<div class="card-label">原子天平 · 两边每种原子个数相等才算配平</div>' +
              '<div class="z6-atom-head"><span>元素</span><span>左边</span><span>右边</span></div>' +
              '<div id="z6-atomList"></div>' +
            '</div>' +
            '<div class="console-card accent-a">' +
              '<button class="z6-hint-toggle" id="z6-hintToggle">' +
                '<span class="card-label" style="margin:0">💡 方法提示（<span id="z6-hintMethod"></span>）</span>' +
                '<span class="z6-hint-arrow" id="z6-hintArrow">▸</span>' +
              '</button>' +
              '<div class="z6-hint-body" id="z6-hintBody" style="display:none"></div>' +
            '</div>' +
            '<div class="console-card accent-m">' +
              '<div class="card-label">卡住了？</div>' +
              '<div class="btn-row"><button class="btn" id="z6-peekBtn">查看答案</button></div>' +
              '<div class="z6-answer" id="z6-answer" style="display:none"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="panel z6-final" id="z6-final" style="display:none"></div>' +
        '<div class="takeaway">配平时心中默念——<b>动系数，不动下标；数原子，两边相等</b>。配平的本质，就是<b>质量守恒定律</b>：反应前后原子的种类和数目都不变。</div>' +
      '</div>'
    );
    container.appendChild(root);

    const $ = id => root.querySelector('#' + id);
    const levelTag = $('z6-levelTag'), dotsBox = $('z6-dots'), progressNum = $('z6-progressNum'),
      barFill = $('z6-barFill'), levelTitle = $('z6-levelTitle'), methodTag = $('z6-methodTag'),
      condTag = $('z6-condTag'), peekTag = $('z6-peekTag'), eqArea = $('z6-eqArea'),
      successBox = $('z6-success'), atomList = $('z6-atomList'),
      hintToggle = $('z6-hintToggle'), hintBody = $('z6-hintBody'), hintArrow = $('z6-hintArrow'),
      hintMethod = $('z6-hintMethod'), answerBox = $('z6-answer'),
      resetBtn = $('z6-resetBtn'), nextBtn = $('z6-nextBtn'), peekBtn = $('z6-peekBtn'),
      finalPanel = $('z6-final'), canvas = $('z6-confetti'), stagePanel = $('z6-stagePanel');

    /* ---------------- 配平计算 ---------------- */
    function countSide(side, coefs, offset) {
      const tot = {};
      side.forEach((sp, i) => {
        const c = coefs[offset + i];
        for (const k in sp.atoms) tot[k] = (tot[k] || 0) + c * sp.atoms[k];
      });
      return tot;
    }

    function elementsOf(lv) {
      const order = [];
      const push = side => side.forEach(sp => {
        for (const k in sp.atoms) if (order.indexOf(k) < 0) order.push(k);
      });
      push(lv.left); push(lv.right);
      return order;
    }

    function balance() {
      const lv = LEVELS[state.level];
      const L = countSide(lv.left, state.coefs, 0);
      const R = countSide(lv.right, state.coefs, lv.left.length);
      const els = elementsOf(lv);
      let ok = true;
      els.forEach(e => { if ((L[e] || 0) !== (R[e] || 0)) ok = false; });
      return { L, R, els, ok };
    }

    /* ---------------- 方程式字符串 ---------------- */
    function sideStr(side, coefs, offset, gasFlags) {
      return side.map((sp, i) => {
        const c = coefs[offset + i];
        let s = (c === 1 ? '' : c) + App.sub(sp.f);
        if (gasFlags && gasFlags[i]) s += '↑';
        return s;
      }).join(' + ');
    }

    function eqHTML(lv, coefs) {
      return App.eq(
        sideStr(lv.left, coefs, 0, null),
        sideStr(lv.right, coefs, lv.left.length, lv.gasRight),
        lv.cond
      );
    }

    /* ---------------- 渲染：关卡 ---------------- */
    function renderLevel() {
      const lv = LEVELS[state.level];
      const n = state.level + 1;
      levelTag.textContent = '第 ' + n + ' / 8 关';
      levelTitle.textContent = lv.title;
      methodTag.textContent = '推荐方法：' + lv.method;
      condTag.textContent = '反应条件：' + lv.cond;
      hintMethod.textContent = lv.method;
      hintBody.innerHTML = lv.hint;
      hintBody.style.display = 'none';
      hintArrow.textContent = '▸';
      peekTag.style.display = state.peeked[state.level] ? '' : 'none';
      answerBox.style.display = 'none';
      answerBox.innerHTML = '';
      successBox.style.display = 'none';
      successBox.innerHTML = '';
      nextBtn.disabled = true;
      nextBtn.textContent = state.level === LEVELS.length - 1 ? '完成最后一关 →' : '下一关 →';

      // 步进器区域
      let html = '<div class="z6-eq-row">';
      const buildSide = (side, offset) => {
        side.forEach((sp, i) => {
          const idx = offset + i;
          html +=
            '<div class="z6-species">' +
              '<div class="z6-stepper">' +
                '<button class="z6-step-btn" data-idx="' + idx + '" data-d="-1" aria-label="减">−</button>' +
                '<span class="z6-coef" id="z6-coef-' + idx + '">' + state.coefs[idx] + '</span>' +
                '<button class="z6-step-btn" data-idx="' + idx + '" data-d="1" aria-label="加">＋</button>' +
              '</div>' +
              '<span class="z6-formula">' + App.sub(sp.f) + '</span>' +
            '</div>';
          if (i < side.length - 1) html += '<span class="z6-plus">+</span>';
        });
      };
      buildSide(lv.left, 0);
      html +=
        '<span class="z6-arrow"><span class="z6-arrow-cond">' + lv.cond + '</span>' +
        '<span class="z6-arrow-line">═══</span></span>';
      buildSide(lv.right, lv.left.length);
      html += '</div>' +
        '<div class="z6-rule">👆 点 ＋ / − 调整每个化学式<b>前面的系数</b>（1~9），下标可不许动哦</div>';
      eqArea.innerHTML = html;

      renderDots();
      update();
    }

    function renderDots() {
      let h = '';
      LEVELS.forEach((_, i) => {
        let cls = 'z6-dot';
        if (state.done[i]) cls += state.peeked[i] ? ' peek' : ' done';
        if (i === state.level && !state.finished) cls += ' cur';
        h += '<span class="' + cls + '">' + (i + 1) + '</span>';
      });
      dotsBox.innerHTML = h;
    }

    /* ---------------- 渲染：原子天平 + 成功判定 ---------------- */
    function update() {
      const lv = LEVELS[state.level];
      const { L, R, els, ok } = balance();

      let h = '';
      els.forEach(e => {
        const l = L[e] || 0, r = R[e] || 0;
        const eq = l === r;
        h += '<div class="z6-atom-row ' + (eq ? 'ok' : 'bad') + '">' +
          '<span class="z6-atom-el">' + e + '</span>' +
          '<span class="z6-atom-num">' + l + '</span>' +
          '<span class="z6-atom-num">' + r + '</span>' +
          '<span class="z6-atom-mark">' + (eq ? '✓' : '✗') + '</span>' +
        '</div>';
      });
      atomList.innerHTML = h;

      if (ok && !state.solved) {
        state.solved = true;
        state.done[state.level] = true;
        const eq = eqHTML(lv, state.coefs);
        successBox.innerHTML =
          '<div class="z6-success-title">🎉 配平成功！</div>' +
          '<div class="z6-success-eq">' + eq + '</div>';
        successBox.style.display = '';
        nextBtn.disabled = false;
        renderDots();
        updateProgress();
        confettiBurst();
      }
    }

    function updateProgress() {
      const doneCount = state.done.filter(Boolean).length;
      progressNum.textContent = '已通关 ' + doneCount + ' / 8';
      barFill.style.width = (doneCount / LEVELS.length * 100) + '%';
    }

    /* ---------------- 事件：步进器 ---------------- */
    eqArea.addEventListener('click', e => {
      const btn = e.target.closest('.z6-step-btn');
      if (!btn) return;
      const idx = +btn.dataset.idx, d = +btn.dataset.d;
      let v = state.coefs[idx] + d;
      if (v < 1) v = 1;
      if (v > 9) v = 9;
      state.coefs[idx] = v;
      const box = root.querySelector('#z6-coef-' + idx);
      if (box) box.textContent = v;
      update();
    });

    /* ---------------- 事件：提示折叠 ---------------- */
    hintToggle.addEventListener('click', () => {
      const open = hintBody.style.display === 'none';
      hintBody.style.display = open ? '' : 'none';
      hintArrow.textContent = open ? '▾' : '▸';
    });

    /* ---------------- 事件：查看答案 ---------------- */
    peekBtn.addEventListener('click', () => {
      const lv = LEVELS[state.level];
      state.peeked[state.level] = true;
      peekTag.style.display = '';
      answerBox.innerHTML =
        '<div class="card-label" style="margin-top:10px">参考答案</div>' +
        '<div class="z6-answer-eq">' + eqHTML(lv, lv.ans) + '</div>' +
        '<div class="z6-answer-tip">系数依次为：' + lv.ans.join('、') + '（已帮你填入，对照原子天平再想一想为什么）</div>';
      answerBox.style.display = '';
      // 填入答案并刷新步进器
      state.coefs = lv.ans.slice();
      lv.left.concat(lv.right).forEach((_, i) => {
        const box = root.querySelector('#z6-coef-' + i);
        if (box) box.textContent = state.coefs[i];
      });
      renderDots();
      update();
    });

    /* ---------------- 事件：重置 / 下一关 ---------------- */
    resetBtn.addEventListener('click', () => {
      state.coefs = LEVELS[state.level].ans.map(() => 1);
      state.solved = false;
      // 若本关此前已通过，重置后保留通关记录，仅重玩
      renderLevel();
    });

    nextBtn.addEventListener('click', () => {
      if (state.level < LEVELS.length - 1) {
        state.level++;
        state.coefs = LEVELS[state.level].ans.map(() => 1);
        state.solved = false;
        renderLevel();
      } else {
        showFinal();
      }
    });

    /* ---------------- 通关卡 ---------------- */
    function showFinal() {
      state.finished = true;
      renderDots();
      const peekCount = state.peeked.filter(Boolean).length;
      finalPanel.innerHTML =
        '<div class="z6-final-title">🏆 八关全部通过，配平达人就是你！</div>' +
        (peekCount > 0
          ? '<div class="z6-final-sub">本次有 ' + peekCount + ' 关查看过答案，建议回头再独立闯一次，做到不看答案也能秒配。</div>'
          : '<div class="z6-final-sub">全程零提示独立通关，漂亮！👏</div>') +
        '<div class="z6-methods">' +
          '<div class="z6-method-card">' +
            '<div class="z6-method-name">① 观察法</div>' +
            '<div class="z6-method-desc">从较复杂的化学式入手，先把它的系数定为 1，再顺着原子个数推其他化学式的系数。口诀：<b>先找复杂化学式，系数定一再来凑</b>。</div>' +
          '</div>' +
          '<div class="z6-method-card">' +
            '<div class="z6-method-name">② 最小公倍数法</div>' +
            '<div class="z6-method-desc">找出等号两边同种原子个数的最小公倍数，据此定出含该元素化学式的系数，再配平其余原子。适合 P、KClO₃ 燃烧/分解这类"一边单质一边化合物"的反应。</div>' +
          '</div>' +
          '<div class="z6-method-card">' +
            '<div class="z6-method-name">③ 奇数配偶法</div>' +
            '<div class="z6-method-desc">若某元素在一边原子个数是奇数、另一边是偶数，先把奇数一边的化学式系数配成 2（奇数变偶数），再逐步配平。如 2H₂O₂ ══MnO₂══ 2H₂O + O₂↑。</div>' +
          '</div>' +
        '</div>' +
        '<div class="z6-final-echo">🔁 回扣 ZONE 06：<b>配平的本质就是质量守恒</b>——化学反应前后，原子的种类不变、数目不变、质量不变，所以等号两边每种原子的个数必须相等。</div>' +
        '<div class="btn-row" style="margin-top:16px"><button class="btn btn-primary" id="z6-restartBtn">↻ 重新闯关</button></div>';
      finalPanel.style.display = '';
      finalPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      confettiBurst(220);
      root.querySelector('#z6-restartBtn').addEventListener('click', () => {
        state.level = 0;
        state.done = LEVELS.map(() => false);
        state.peeked = LEVELS.map(() => false);
        state.solved = false;
        state.finished = false;
        state.coefs = LEVELS[0].ans.map(() => 1);
        finalPanel.style.display = 'none';
        finalPanel.innerHTML = '';
        updateProgress();
        renderLevel();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* ---------------- 庆祝粒子 ---------------- */
    const ctx = canvas.getContext('2d');
    let particles = [];
    let rafId = 0;
    let cw = 0, ch = 0;

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const w = stagePanel.clientWidth, h = stagePanel.clientHeight;
      if (!w || !h) return;
      cw = w; ch = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    new ResizeObserver(resizeCanvas).observe(stagePanel);
    resizeCanvas();

    function confettiBurst(count) {
      resizeCanvas();
      const n = count || 140;
      for (let i = 0; i < n; i++) {
        particles.push({
          x: cw * (0.2 + Math.random() * 0.6),
          y: ch * 0.25 + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 9,
          vy: -(3 + Math.random() * 6),
          g: 0.16 + Math.random() * 0.08,
          size: 3 + Math.random() * 4,
          color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.25,
          life: 1,
          decay: 0.006 + Math.random() * 0.008
        });
      }
      if (!rafId) rafId = requestAnimationFrame(confettiLoop);
    }

    function confettiLoop() {
      rafId = 0;
      // 容器被移除或所在 section 不可见时：清空粒子并停止，省性能
      if (!container.isConnected || container.offsetParent === null) {
        particles = [];
        ctx.clearRect(0, 0, cw, ch);
        return;
      }
      ctx.clearRect(0, 0, cw, ch);
      particles = particles.filter(p => p.life > 0 && p.y < ch + 20);
      for (const p of particles) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= p.decay;
        ctx.save();
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
        ctx.restore();
      }
      if (particles.length) rafId = requestAnimationFrame(confettiLoop);
      else ctx.clearRect(0, 0, cw, ch);
    }

    /* ---------------- 启动 ---------------- */
    state.coefs = LEVELS[0].ans.map(() => 1);
    updateProgress();
    renderLevel();
  }

  return { desc, init };
})();
