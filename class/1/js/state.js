/* ============================================================
 * 背多分 · 消消乐系统 —— 全局运行时状态
 * 作用：集中存放各模块共享的运行时状态（学生、图片、音频、文案等）。
 * 依赖：config.js（使用其默认值）
 * ============================================================ */
(function () {
    'use strict';

    window.ReciteGame = window.ReciteGame || {};
    const DEFAULTS = window.ReciteGame.DEFAULTS;

    window.ReciteGame.state = {
        // 当前学生列表
        currentStudents: [],
        // 背景图片 DataURL
        bgImageDataUrl: null,
        // 点击音效 DataURL
        clickSoundDataUrl: null,
        // 通关音乐 DataURL
        successMusicDataUrl: null,
        // 中考日期字符串（默认 2027-06-30）
        examDateStr: DEFAULTS.EXAM_DATE,
        // 左右激励语
        leftMotto: DEFAULTS.LEFT_MOTTO,
        rightMotto: DEFAULTS.RIGHT_MOTTO,
        // 主标题
        mainTitleText: DEFAULTS.TITLE,
        // 通关消息是否正在展示
        successMessageActive: false,
    };
})();
