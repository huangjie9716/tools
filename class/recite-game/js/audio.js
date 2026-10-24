/* ============================================================
 * 背多分 · 消消乐系统 —— 音频模块
 * 作用：管理点击音效、通关音乐以及内置备用「叮咚」音。
 * 依赖：state.js
 * 对外暴露：ReciteGame.audio
 *   - successAudio / clickAudio  音频元素
 *   - playClickSound()           播放点击音效（自定义或内置备用）
 *   - stopSuccessMessageAndMusic() 停止通关音乐并隐藏通关提示
 * ============================================================ */
(function () {
    'use strict';

    const G = window.ReciteGame;
    const S = G.state;

    // ---------- 音频元素 ----------
    const successAudio = new Audio();
    successAudio.loop = false;
    successAudio.volume = 0.8;

    const clickAudio = new Audio();
    clickAudio.loop = false;
    clickAudio.volume = 0.7;

    // ---------- 内置备用点击音 ----------
    function playBuiltInBeep() {
        try {
            if (!G.audio.audioCtx) {
                G.audio.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = G.audio.audioCtx;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.frequency.value = 880;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.15);
        } catch (e) {}
    }

    // ---------- 播放点击音效 ----------
    function playClickSound() {
        if (S.clickSoundDataUrl) {
            clickAudio.pause();
            clickAudio.currentTime = 0;
            clickAudio.play().catch(() => {});
        } else {
            playBuiltInBeep();
        }
    }

    // ---------- 停止通关音乐并隐藏提示 ----------
    function stopSuccessMessageAndMusic() {
        if (S.successMessageActive) {
            document.getElementById('successMessage').classList.remove('show');
            S.successMessageActive = false;
        }
        successAudio.pause();
        successAudio.currentTime = 0;
    }

    // ---------- 导出 ----------
    G.audio = {
        successAudio: successAudio,
        clickAudio: clickAudio,
        audioCtx: null,
        playClickSound: playClickSound,
        stopSuccessMessageAndMusic: stopSuccessMessageAndMusic,
    };
})();
