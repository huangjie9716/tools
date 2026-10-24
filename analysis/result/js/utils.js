/**
 * utils.js —— 通用工具函数
 *
 * 对外暴露：window.Utils = { sortClasses, fmtRatio, fmtNum }
 */
(function () {
    'use strict';

    /** 班级排序：纯数字在前（按数值），其余按字典序 */
    function sortClasses(classes) {
        return classes.slice().sort((a, b) => {
            const na = parseFloat(a), nb = parseFloat(b);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return a.localeCompare(b);
        });
    }

    /** 比率转百分比字符串（如 0.5234 -> "52.34%"） */
    function fmtRatio(v) { return (v * 100).toFixed(2) + '%'; }

    /** 数字格式化到指定小数位 */
    function fmtNum(v, d) { return v.toFixed(d); }

    window.Utils = { sortClasses, fmtRatio, fmtNum };
})();
