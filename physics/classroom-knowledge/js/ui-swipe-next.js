// ===================================================================
//  左滑进入下一题（手势）
//  触发条件与“下一题”按钮完全一致，不会跳过未作答的题目
// ===================================================================

// ===================================================================
//  左滑进入下一题（触摸屏 / 鼠标拖动均可；点击“下一题”按钮仍然保留）
//  - 生效条件与“下一题”按钮完全一致：本题作答完毕、按钮出现后才可左滑
//    （因此不会误跳过未作答的题目）
//  - 竖向滑动仍交给页面滚动，不抢占滚动操作
// ===================================================================
(function initSwipeNext() {
  if (!window.PointerEvent) return;   // 老旧浏览器不支持指针事件时静默退出

  const MIN_DX = 70;      // 触发所需的水平位移（px）
  const FLICK_DX = 45;    // 快速轻扫只需更短的距离（px）
  const FLICK_MS = 260;   // 快速轻扫的时长上限（ms）
  const MAX_DY = 90;      // 允许的最大垂直偏移（px）
  const MAX_MS = 2500;    // 手势最长时长（ms），避免“按住不动很久再拖”误触发
  const hint = $('swipeHint');
  let track = null;                 // { id, x, y, t, active, progress }
  let swallowClickUntil = 0;        // 需忽略“下一题”补发 click 的时间点

  // 与键盘回车、鼠标点击完全同一条件：按钮已出现且未被其它界面遮挡
  function canSwipe() {
    const btn = $('nextBtn');
    if (!btn || !btn.classList.contains('show')) return false;
    const isVisible = (el) => !!el && getComputedStyle(el).display !== 'none';
    return !isVisible($('startScreen')) && !isVisible($('resultScreen'))
      && !isVisible($('mistakesOverlay')) && !isVisible($('imgViewer'));
  }

  // 提示随滑动进度渐显、右移，达到阈值时高亮
  function updateHint(progress) {
    const p = Math.max(0, Math.min(1, progress));
    hint.style.setProperty('--sx', ((1 - p) * 40) + 'px');
    hint.style.setProperty('--ss', (0.85 + p * 0.15).toFixed(3));
    hint.style.opacity = (p * 0.95).toFixed(3);
    hint.classList.toggle('ready', p >= 1);
  }
  function clearHint() {
    hint.style.opacity = '';
    hint.style.removeProperty('--sx');
    hint.style.removeProperty('--ss');
    hint.classList.remove('ready');
  }

  function onDown(e) {
    if (track) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target;
    if (t && t.closest && t.closest('input, select, textarea, #imgViewer, .mistakes-panel')) return;
    track = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), active: false, progress: 0 };
  }

  function onMove(e) {
    if (!track || e.pointerId !== track.id) return;
    const dx = e.clientX - track.x;
    const dy = e.clientY - track.y;
    // 判定为竖向滚动：放弃本次手势，不与页面滚动抢操作
    if (Math.abs(dy) > MAX_DY || Math.abs(dy) > Math.abs(dx) * 1.2) {
      if (track.active) clearHint();
      track = null;
      return;
    }
    if (dx >= 0) {   // 只响应左滑
      if (track.active) { clearHint(); track.active = false; track.progress = 0; }
      return;
    }
    if (!canSwipe()) return;
    track.active = true;
    track.progress = Math.min(1, -dx / MIN_DX);
    updateHint(track.progress);
  }

  function onUp(e) {
    if (!track || e.pointerId !== track.id) return;
    const dx = e.clientX - track.x;
    const dy = e.clientY - track.y;
    const elapsed = Date.now() - track.t;
    // 快速轻扫：降低触发距离，手感更轻；慢慢拖则需拖更远，避免误触
    const needX = elapsed <= FLICK_MS ? FLICK_DX : MIN_DX;
    const fireIt = track.active && elapsed <= MAX_MS
      && dx <= -needX && Math.abs(dy) <= MAX_DY && canSwipe();
    track = null;
    clearHint();
    if (fireIt) fire();   // 复用既有逻辑：双人 / 单人，最后一题进入结果界面
  }

  function onCancel(e) {
    if (!track || (e && e.pointerId !== track.id)) return;
    track = null;
    clearHint();
  }

  function fire() {
    // 触摸滑动后浏览器可能补发一次 click（若起止点都在“下一题”按钮上），
    // 这里短暂吞掉这次补发的 click，避免一次左滑前进两题
    swallowClickUntil = Date.now() + 600;
    sound.click();
    document.body.classList.add('swipe-firing');
    setTimeout(() => document.body.classList.remove('swipe-firing'), 320);
    $('nextBtn').click();
  }

  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('pointerup', onUp, true);
  document.addEventListener('pointercancel', onCancel, true);
  window.addEventListener('blur', function() { onCancel(null); });

  // 手势进行中禁止浏览器接管原生拖拽（否则会发出 pointercancel 中断左滑）
  document.addEventListener('dragstart', function(e) {
    if (track) e.preventDefault();
  }, true);

  document.addEventListener('click', function(e) {
    if (!e.isTrusted) return;          // 忽略代码自己触发的 click（如 fire() 里的 nextBtn.click()）
    if (Date.now() >= swallowClickUntil) return;
    const t = e.target;
    if (t && t.closest && t.closest('#nextBtn')) {
      swallowClickUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
