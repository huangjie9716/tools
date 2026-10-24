/* ============================================================
 * 背多分 · 消消乐系统 —— 日期与倒计时模块
 * 作用：显示当前日期，并根据中考日期计算剩余天数。
 * 依赖：state.js
 * 对外暴露：ReciteGame.date.updateDateAndCountdown()
 * ============================================================ */
(function () {
    'use strict';

    const G = window.ReciteGame;
    const S = G.state;

    // ============================================================
    //  📅 日期与倒计时
    // ============================================================
    function updateDateAndCountdown() {
        const now = new Date();
        const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;
        document.getElementById('dateDisplay').textContent = dateStr;

        const parts = document.getElementById('countdownParts');
        const note = document.getElementById('countdownNote');

        if (S.examDateStr) {
            const examDate = new Date(S.examDateStr + 'T00:00:00');
            const diffTime = examDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
                // 显示“距离中考还剩 X 天”，天数高亮
                parts.style.display = '';
                note.style.display = 'none';
                document.getElementById('countdownDays').textContent = String(diffDays);
            } else if (diffDays === 0) {
                parts.style.display = 'none';
                note.style.display = '';
                note.textContent = '🎯 今天就是中考日！';
            } else {
                parts.style.display = 'none';
                note.style.display = '';
                note.textContent = '中考已结束，勇士们辛苦了！';
            }
        } else {
            parts.style.display = 'none';
            note.style.display = '';
            note.textContent = '📅 请设置中考日期';
        }
    }

    // ---------- 导出 ----------
    G.date = {
        updateDateAndCountdown: updateDateAndCountdown,
    };
})();
