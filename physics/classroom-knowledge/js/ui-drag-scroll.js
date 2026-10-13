// ===================================================================
//  按住拖动即可上下滚动（鼠标 / 触摸板）
// ===================================================================

// ===================================================================
//  按住拖动即可上下滚动（光标按住界面移动时页面跟随滑动）
//  - 自动判断滚动对象：按住处若在内部可滚动区（如错题列表）则滚动该区，否则滚动整页
//  - 原地轻点不受影响（仍正常触发答题等点击）；仅真正“拖动”时才滚动并拦截误触点击
// ===================================================================
(function initDragScroll() {
  const THRESHOLD = 6;      // 鼠标移动超过该像素数才判定为“拖动”
  let drag = null;          // 当前拖动状态
  let suppressUntil = 0;    // 拖动结束后短暂拦截可能误触发的 click

  // 找到光标下最近的可纵向滚动容器（内容超出可视区的），找不到则回落到整页
  function getScroller(x, y) {
    let el = document.elementFromPoint(x, y);
    let n = (el && el.nodeType === 1) ? el : null;
    while (n) {
      if (n.scrollHeight > n.clientHeight + 4) return n;
      if (n === document.documentElement) break;
      n = n.parentElement;
    }
    const se = document.scrollingElement || document.documentElement;
    return (se && se.scrollHeight > se.clientHeight + 4) ? se : null;
  }
  function isPage(el) {
    return !el || el === document.scrollingElement || el === document.documentElement || el === document.body;
  }
  function getTop(el) {
    return isPage(el) ? (window.pageYOffset || 0) : el.scrollTop;
  }
  function setTop(el, v) {
    if (isPage(el)) window.scrollTo(0, v);
    else el.scrollTop = v;
  }
  function finishDrag() {
    if (!drag) return;
    if (drag.moved) suppressUntil = Date.now() + 400;
    drag = null;
    document.body.classList.remove('dragging');
  }

  document.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    const t = e.target;
    if (t && t.closest && t.closest('input, select, textarea')) return;
    const scroller = getScroller(e.clientX, e.clientY);
    if (!scroller) return;
    drag = { x: e.clientX, y: e.clientY, top: getTop(scroller), el: scroller, moved: false };
  }, true);

  document.addEventListener('mousemove', function(e) {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && dx * dx + dy * dy < THRESHOLD * THRESHOLD) return;
    if (!drag.moved) {
      drag.moved = true;
      document.body.classList.add('dragging');
    }
    setTop(drag.el, drag.top - dy);   // 内容随手指方向移动
    e.preventDefault();
  }, true);

  // 拖动中禁止图片等被浏览器原生拖拽
  document.addEventListener('dragstart', function(e) {
    if (drag && drag.moved) e.preventDefault();
  }, true);

  document.addEventListener('mouseup', finishDrag, true);
  document.addEventListener('mouseleave', finishDrag, true);
  document.addEventListener('mouseout', function(e) {
    if (e.relatedTarget === null) finishDrag(); // 光标移出窗口
  }, true);

  // 拖动结束后浏览器可能在按钮上补发一次 click——短暂拦截，避免误答题
  document.addEventListener('click', function(e) {
    if (Date.now() < suppressUntil) {
      suppressUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
