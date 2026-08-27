/* ============================================================
 * 班主任通用成绩分析系统 - 工具函数模块 (utils.js)
 * 纯函数与通用小工具，不依赖业务状态。
 * ============================================================ */
(function (App) {
    'use strict';

    /** 数字格式化：null/NaN 显示为 '--'，整数原样，小数保留两位 */
    function formatNumber(val) {
        if (val == null) return '--';
        if (typeof val !== 'number') return String(val);
        if (isNaN(val)) return '--';
        if (Number.isInteger(val)) return val.toString();
        return parseFloat(val.toFixed(2)).toString();
    }

    /** HTML 转义，防止注入 */
    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    /** 名次进退步：第一次排名 - 第二次排名（正数 = 进步） */
    function calcProgress(r1, r2) {
        if (r1 == null || r2 == null) return null;
        return r1 - r2;
    }

    /** 单科排名与总分排名的差距（总分排名 - 单科排名；正值 = 单科领先总分，负值 = 单科落后总分） */
    function calcGapWithTotalRank(subjectRank, totalRank, subject) {
        if (subjectRank == null || totalRank == null) return null;
        if (subject === '总分') return null;
        return totalRank - subjectRank;
    }

    /** 绿色对勾图标（SVG，用于替代 ✅ emoji） */
    const CHECK_SVG = '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path d="M710.4 332.8L428.8 608 313.6 492.8c-19.2-12.8-38.4-12.8-57.6 0-12.8 19.2-12.8 44.8 0 57.6l147.2 140.8c12.8 12.8 38.4 12.8 57.6 0L768 384c12.8-12.8 12.8-38.4 0-51.2-12.8-12.8-38.4-12.8-57.6 0z" fill="#68ce06"/><path d="M512 1024c-281.6 0-512-230.4-512-512s230.4-512 512-512c108.8 0 211.2 32 300.8 96 12.8 12.8 19.2 32 6.4 44.8s-32 19.2-44.8 6.4C697.6 89.6 608 64 512 64 262.4 64 64 262.4 64 512s198.4 448 448 448 448-198.4 448-448c0-76.8-19.2-153.6-57.6-224-6.4-12.8-6.4-32 12.8-44.8 12.8-6.4 32-6.4 44.8 12.8 38.4 76.8 64 166.4 64 256 0 281.6-230.4 512-512 512z" fill="#68ce06"/></svg>';

    /** 底部轻提示（自动把开头的 ✅ 替换为 SVG 图标，其余内容转义） */
    function showToast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        let html = escapeHtml(msg);
        html = html.replace(/^✅\s*/, CHECK_SVG + '&nbsp;');
        t.innerHTML = html;
        t.classList.add('show');
        clearTimeout(t._t);
        t._t = setTimeout(() => t.classList.remove('show'), 3500);
    }

    App.utils = {
        formatNumber,
        escapeHtml,
        calcProgress,
        calcGapWithTotalRank,
        showToast,
        CHECK_SVG
    };
})(window.App = window.App || {});
