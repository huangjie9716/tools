/* ============================================================
 * 背多分 · 消消乐系统 —— 初始化入口
 * 作用：页面加载完成后依次加载设置、展示面板、重建泡泡、启动倒计时。
 * 依赖：config.js、state.js、audio.js、parsers.js、
 *       game.js、effects.js、settings.js、date.js
 * ============================================================ */
(function () {
    'use strict';

    const G = window.ReciteGame;

    // ============================================================
    //  🚀 初始化
    // ============================================================
    function initialize() {
        G.settings.loadSettingsFromStorage();
        G.game.rebuildBubbles();
        G.date.updateDateAndCountdown();
        setInterval(G.date.updateDateAndCountdown, 1000);
        // 进入游戏后，首先展示系统设置界面
        G.settings.showSettingsScreen();
    }

    window.addEventListener('DOMContentLoaded', initialize);
})();
