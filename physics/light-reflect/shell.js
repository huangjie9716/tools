/*
  光的反射游戏实验室 · 外壳逻辑：模式切换 / 全屏 / 暂停 / 玩法 / 最高分
  入口：index.html
*/

/* ==================== 外壳：模式切换 / 全屏 ==================== */
(function () {
  'use strict';

  const selectScreen = document.getElementById('selectScreen');
  const btnFull = document.getElementById('btnFull');
  const btnBack = document.getElementById('btnBack');
  const shellBar = document.getElementById('shellBar');
  const scenes = {
    easy: document.getElementById('easyScene'),
    hard: document.getElementById('hardScene')
  };
  const games = {};
  const rootEl = document.documentElement;
  // 两个模式的规则列表在加载时就缓存起来（简单模式结算后会替换面板内容）
  const helpSource = {
    easy: document.querySelector('#easyScene .panel ul.tips'),
    hard: document.querySelector('#hardScene .rules')
  };
  const pauseModal = document.getElementById('pauseModal');
  const helpModal = document.getElementById('helpModal');
  const helpBody = document.getElementById('helpBody');
  let mode = null;
  let paused = false;       // 暂停按钮状态
  let helpPaused = false;   // 打开玩法弹层时是否顺手暂停了游戏

  // 两个游戏在加载时注册自己的接口
  window.registerReflectGame = function (name, api) { games[name] = api; };

  /* ---------- 最高分：只存在本机，不上传 ---------- */
  function bestKey(name) { return 'reflect.best.' + name; }

  window.getBestScore = function (name) {
    try { return parseInt(localStorage.getItem(bestKey(name)) || '0', 10) || 0; }
    catch (e) { return 0; }
  };

  window.setBestScore = function (name, score) {
    if (score <= window.getBestScore(name)) return false;
    try { localStorage.setItem(bestKey(name), String(score)); } catch (e) {}
    updateCardMeta();
    return true;
  };

  function updateCardMeta() {
    Array.prototype.forEach.call(document.querySelectorAll('.mode-card'), function (card) {
      const meta = card.querySelector('.meta');
      if (!meta) return;
      const best = window.getBestScore(card.getAttribute('data-mode'));
      meta.textContent = meta.getAttribute('data-base') + (best > 0 ? '　·　最高分 ' + best + ' 分' : '');
    });
  }

  /* ---------- 全屏（兼容 Safari 的 webkit 前缀） ---------- */
  const canFullscreen = !!(rootEl.requestFullscreen || rootEl.webkitRequestFullscreen);

  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function updateFullBtn() {
    const fs = !!fsElement();
    btnFull.textContent = fs ? '退出全屏' : '全屏';
    btnFull.setAttribute('aria-label', fs ? '退出全屏' : '进入全屏');
    syncShellInset();
  }

  function toggleFullscreen() {
    try {
      if (fsElement()) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (rootEl.requestFullscreen) {
        const p = rootEl.requestFullscreen();
        if (p && p.catch) p.catch(function (err) { console.error('进入全屏失败：', err); });
      } else if (rootEl.webkitRequestFullscreen) {
        rootEl.webkitRequestFullscreen();
      }
    } catch (err) { console.error('切换全屏失败：', err); }
  }

  // 把右上角按钮栏的实际尺寸写成 CSS 变量：
  // --shell-inset 供 HUD 预留右侧位置，--shell-top 供开始/结算面板预留顶部位置
  function syncShellInset() {
    const rect = shellBar.getBoundingClientRect();
    const inset = Math.max(120, Math.ceil(rect.width) + 20 + 16);  // 右侧留白 20px，再留 16px 间隔
    rootEl.style.setProperty('--shell-inset', inset + 'px');

    // 非全屏时窗口较矮，面板顶端容易被按钮压住，因此按按钮栏底边留出安全区
    const top = Math.ceil(rect.bottom) + 14;
    rootEl.style.setProperty('--shell-top', Math.max(0, top) + 'px');
  }

  /* ---------- 暂停 ---------- */
  function setPaused(on) {
    if (!mode) return;
    paused = on;
    pauseModal.classList.toggle('hidden', !on);
    btnPause.textContent = on ? '继续' : '暂停';
    btnPause.setAttribute('aria-label', on ? '继续游戏' : '暂停游戏');
    if (on) games[mode].pause();
    else if (!helpPaused) games[mode].resume();
    syncShellInset();
  }

  /* ---------- 玩法说明（游戏中随时可看，规则取自当前模式） ---------- */
  function openHelp() {
    if (!mode) return;
    const src = helpSource[mode];
    helpBody.innerHTML = '';
    if (src) helpBody.appendChild(src.cloneNode(true));
    helpModal.classList.remove('hidden');
    helpPaused = !paused;
    if (helpPaused) games[mode].pause();
  }

  function closeHelp() {
    helpModal.classList.add('hidden');
    if (helpPaused && mode && !paused) games[mode].resume();
    helpPaused = false;
  }

  function enterMode(name) {
    if (!scenes[name] || !games[name]) return;
    mode = name;
    paused = false;
    helpPaused = false;
    pauseModal.classList.add('hidden');
    helpModal.classList.add('hidden');
    btnPause.textContent = '暂停';
    selectScreen.classList.add('hidden');
    btnBack.classList.remove('hidden');
    btnPause.classList.remove('hidden');
    btnHelp.classList.remove('hidden');

    for (const key in scenes) scenes[key].classList.toggle('active', key === name);
    for (const key in games) {
      if (key === name) continue;
      games[key].pause();
    }

    const game = games[name];
    if (game.resize) game.resize();   // 场景刚显示，需要重新量取画布尺寸
    if (game.reset) game.reset();
    game.resume();
    syncShellInset();                       // 立即按新的按钮栏宽度预留位置
    requestAnimationFrame(syncShellInset);  // 字体/布局稳定后再校正一次
  }

  function backToSelect() {
    mode = null;
    paused = false;
    helpPaused = false;
    for (const key in games) games[key].pause();
    for (const key in scenes) scenes[key].classList.remove('active');
    pauseModal.classList.add('hidden');
    helpModal.classList.add('hidden');
    selectScreen.classList.remove('hidden');
    btnBack.classList.add('hidden');
    btnPause.classList.add('hidden');
    btnHelp.classList.add('hidden');
    updateCardMeta();
    syncShellInset();
  }
  window.reflectBackToSelect = backToSelect;

  Array.prototype.forEach.call(document.querySelectorAll('.mode-card'), function (card) {
    card.addEventListener('click', function () { enterMode(card.getAttribute('data-mode')); });
  });

  btnBack.addEventListener('click', backToSelect);
  btnFull.addEventListener('click', toggleFullscreen);
  btnPause.addEventListener('click', function () { setPaused(!paused); });
  btnHelp.addEventListener('click', openHelp);
  document.getElementById('btnHelpClose').addEventListener('click', closeHelp);
  document.getElementById('btnResume').addEventListener('click', function () { setPaused(false); });
  pauseModal.addEventListener('click', function () { if (paused) setPaused(false); });

  document.addEventListener('fullscreenchange', function () { updateFullBtn(); syncShellInset(); });
  document.addEventListener('webkitfullscreenchange', function () { updateFullBtn(); syncShellInset(); });
  window.addEventListener('resize', syncShellInset);

  // 按钮栏自身的尺寸变化（文案切换、跨字号断点）也要立刻同步预留宽度
  if (window.ResizeObserver) new ResizeObserver(syncShellInset).observe(shellBar);

  // 不支持全屏的环境（iPhone / iPad Safari）：隐藏按钮并给替代方案
  if (!canFullscreen) {
    btnFull.classList.add('hidden');
    const tip = document.getElementById('iosTip');
    if (tip) tip.classList.add('show');
  }

  // 首次触控 / 回到前台时恢复音频（iOS 来电或锁屏后 AudioContext 会挂起）
  function resumeAudio() {
    for (const key in games) if (games[key].resumeAudio) games[key].resumeAudio();
  }
  document.addEventListener('pointerdown', resumeAudio);
  document.addEventListener('touchstart', resumeAudio, { passive: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) resumeAudio(); });

  updateFullBtn();
  updateCardMeta();
  syncShellInset();
})();
