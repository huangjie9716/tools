// ===================================================================
//  全屏 / 退出全屏（快捷键 F，浏览器 Esc / F11 同样有效）
// ===================================================================

// ===================================================================
//  全屏 / 退出全屏（带前缀兼容；Esc / F11 也可由浏览器原生退出）
// ===================================================================
function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function toggleFullscreen() {
  try {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
      return;
    }
    const enter = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    if (enter) {
      const p = enter.call(document.documentElement);
      if (p && p.catch) p.catch(() => {});
    } else {
      alert('当前浏览器不支持全屏，请按 F11 尝试。');
    }
  } catch (e) { /* 忽略异常 */ }
}
// 进入/退出全屏时：同步各界面按钮文案并切换 body.fs-mode（触发屏幕适配）
function updateFullscreenUI() {
  const fs = isFullscreen();
  document.body.classList.toggle('fs-mode', fs);
  document.querySelectorAll('.fs-btn').forEach(btn => {
    btn.textContent = fs ? '⛶ 退出全屏' : '⛶ 全屏';
    btn.classList.toggle('active', fs);
  });
}
['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => {
  document.addEventListener(evt, updateFullscreenUI);
});
