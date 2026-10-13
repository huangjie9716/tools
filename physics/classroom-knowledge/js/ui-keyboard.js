// ===================================================================
//  键盘快捷键：A 用 1~6、B 用 7~0-=、回车下一题、Esc 返回、F 全屏
//  按键映射见 config.js 里的 CONFIG
// ===================================================================

// ===================================================================
//  键盘快捷键（双人同机：A 用左侧数字，B 用右侧数字）
// ===================================================================
function handleKeydown(e) {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  // 图片放大查看器打开时：仅 Esc 可关闭，其它快捷键暂不生效（避免误返回主界面等）
  if (imgViewer.classList.contains('show')) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeImageViewer();
    }
    return;
  }

  // F 键：全屏 / 退出全屏
  if (e.key === CONFIG.fullscreenKey) { toggleFullscreen(); return; }

  if (e.key === CONFIG.homeKey) { goHome(); return; }

  const nextBtn = $('nextBtn');
  if (nextBtn.classList.contains('show') && CONFIG.nextKeys.indexOf(e.key) !== -1) {
    e.preventDefault();
    nextBtn.click();
    return;
  }

  const q = gameState.questions[gameState.currentIndex];
  if (!q) return;

  // 单人刷题模式：数字键 1-4 对应 A-D 选项
  if (gameState.mode === 'single') {
    if (gameState.singleAnswer !== null) return;
    const idx = CONFIG.playerAKeys.indexOf(e.key);
    if (idx !== -1 && idx < 4) {
      const btn = document.querySelector(`#sAnswerArea .answer-btn:nth-child(${idx + 1})`);
      if (btn && !btn.disabled) { e.preventDefault(); sound.click(); btn.click(); }
    }
    return;
  }

  if (gameState.answerA === null) {
    const ia = CONFIG.playerAKeys.indexOf(e.key);
    if (ia !== -1) {
      const btn = document.querySelector(`#answerAreaA .answer-btn:nth-child(${ia + 1})`);
      if (btn && !btn.disabled) { e.preventDefault(); sound.click(); btn.click(); }
      return;
    }
  }
  if (gameState.answerB === null) {
    const ib = CONFIG.playerBKeys.indexOf(e.key);
    if (ib !== -1) {
      const btn = document.querySelector(`#answerAreaB .answer-btn:nth-child(${ib + 1})`);
      if (btn && !btn.disabled) { e.preventDefault(); sound.click(); btn.click(); }
    }
  }
}
