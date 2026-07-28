/* 初中化学实验室 · 主控脚本：导航切换 + 共享组件 */
(function () {
  'use strict';

  const inited = {};

  /* 学期切换：zone 1-8 = 上册，9-13 = 下册 */
  function semOf(n) { return Number(n) >= 9 ? '2' : '1'; }

  function setSem(sem) {
    document.querySelectorAll('.sem-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.sem === sem));
    document.querySelectorAll('.nav-pill').forEach(b => {
      b.hidden = b.dataset.sem !== sem;
    });
  }

  function showZone(n, pushHash) {
    setSem(semOf(n));
    document.querySelectorAll('.zone').forEach(z => z.classList.remove('active'));
    document.querySelectorAll('.nav-pill').forEach(b =>
      b.classList.toggle('active', b.dataset.zone === String(n)));
    const sec = document.getElementById('zone' + n);
    if (!sec) return;
    sec.classList.add('active');
    if (pushHash !== false) history.replaceState(null, '', '#z' + n);
    if (!inited[n]) {
      inited[n] = true;
      const body = sec.querySelector('.zone-body');
      const desc = sec.querySelector('.zone-desc');
      const mod = window['Zone' + n];
      if (mod && typeof mod.init === 'function') {
        if (desc && mod.desc) desc.innerHTML = mod.desc;
        try { mod.init(body); } catch (e) {
          body.innerHTML = '<div class="panel" style="color:var(--red)">本板块加载失败：' + e.message + '</div>';
          console.error(e);
        }
      } else {
        body.innerHTML = '<div class="panel" style="color:var(--text-faint)">本板块建设中…</div>';
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  document.getElementById('topNav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-pill');
    if (btn) showZone(btn.dataset.zone);
  });

  document.getElementById('semTabs').addEventListener('click', e => {
    const btn = e.target.closest('.sem-tab');
    if (!btn) return;
    setSem(btn.dataset.sem);
    /* 当前板块若不在本册，切到本册第一个板块 */
    const current = document.querySelector('.zone.active');
    const curZone = current ? Number(current.id.replace('zone', '')) : 0;
    if (semOf(curZone) !== btn.dataset.sem) {
      showZone(btn.dataset.sem === '1' ? 1 : 9);
    }
  });

  /* ---------------- 共享工具 ---------------- */
  const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };

  window.App = {
    /** 把化学式中的数字转为下标：'H2O' -> 'H₂O'；已含下标字符则原样保留 */
    sub(formula) {
      return String(formula).replace(/(\d+)/g, m => m.split('').map(d => SUB[d] || d).join(''));
    },

    /**
     * 生成规范化学方程式 HTML（等号为双线，反应条件标注在等号上方）
     * App.eq('2H₂ + O₂', '2H₂O', '点燃')
     * 产物中的 ↑/↓ 会自动变色标注
     */
    eq(left, right, cond) {
      const mark = s => String(s)
        .replace(/↑/g, '<span class="gas">↑</span>')
        .replace(/↓/g, '<span class="ppt">↓</span>');
      return '<span class="eq"><span>' + mark(left) + '</span>' +
        '<span class="eq-sign">' + (cond ? '<span class="eq-cond">' + cond + '</span>' : '') +
        '<span class="eq-line">═══</span></span>' +
        '<span>' + mark(right) + '</span></span>';
    },

    /** 从 HTML 字符串创建元素 */
    el(html) {
      const t = document.createElement('template');
      t.innerHTML = html.trim();
      return t.content.firstElementChild;
    },

    /** 数字格式化：去掉浮点尾巴（整数原样保留，防止 100 被剥成 1） */
    num(v, digits) {
      const s = Number(v).toFixed(digits == null ? 2 : digits);
      return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
    }
  };

  /* 初始路由：等板块脚本全部加载完毕后再初始化 */
  window.addEventListener('load', () => {
    const m = location.hash.match(/z(\d+)/);
    showZone(m ? m[1] : 1, false);
  });
})();
