/* ============================================================
   js/state.js —— 全局命名空间 + 共享状态
   说明：定义全局命名空间 window.ST，集中管理应用共享状态与 DOM 引用。
   - ST.CHECK_ICON：统一对勾图标（替换 ✅ 的 SVG 图片）
   - ST.state：应用运行状态
   - ST.el    ：DOM 元素引用（由 app.js 填充）
   其他模块通过 ST 读写共享数据。
   ============================================================ */
(function (global) {
    'use strict';

    const ST = global.ST = global.ST || {};

    // ---- 统一对勾图标（SVG 替换 ✅） ----
    ST.CHECK_ICON = '<img src="img/check-icon.svg" class="check-icon" alt="">';

    // ---- 应用状态 ----
    ST.state = {
        file1Data: null,        // 第一次成绩原始数据
        file2Data: null,        // 第二次成绩原始数据
        file1Name: '',          // 第一次文件名
        file2Name: '',          // 第二次文件名
        resultData: [],         // 当前科目分析结果
        currentSortField: 'id', // 当前排序字段
        plotData: null,         // 当前散点图数据
        currentClass: '',       // 当前班级
        subjectName: '',        // 当前科目名称
        currentView: 'result'   // 当前视图（result / regression）
    };

    // ---- DOM 元素引用（由 app.js 在页面加载后填充） ----
    ST.el = {};

})(window);
