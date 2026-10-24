/* ============================================================
 * 背多分 · 消消乐系统 —— 配置 / 常量
 * 作用：集中管理 localStorage 存储键名、默认文案等常量。
 * 依赖：无（最先加载）
 * ============================================================ */
(function () {
    'use strict';

    window.ReciteGame = window.ReciteGame || {};

    // ---------- localStorage 存储键名 ----------
    window.ReciteGame.STORAGE_KEYS = {
        TITLE: 'xiaoxiaole_title',
        EXAM_DATE: 'xiaoxiaole_examDate',
        BG_IMAGE: 'xiaoxiaole_bgImage',
        CLICK_SOUND: 'xiaoxiaole_clickSound',
        MUSIC: 'xiaoxiaole_music',
        STUDENTS: 'xiaoxiaole_students',
        LEFT_MOTTO: 'xiaoxiaole_leftMotto',
        RIGHT_MOTTO: 'xiaoxiaole_rightMotto',
    };

    // ---------- 默认文案 ----------
    window.ReciteGame.DEFAULTS = {
        TITLE: '「背多分」消消乐系统',
        EXAM_DATE: '2027-06-30',
        LEFT_MOTTO: '每一次背诵',
        RIGHT_MOTTO: '都在为未来铺路！',
    };
})();
