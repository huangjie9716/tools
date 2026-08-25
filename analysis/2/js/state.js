/**
 * state.js —— 全局共享状态
 *
 * 说明：所有模块通过 window.AppState 访问共享数据与 DOM 引用。
 *       - dom 引用由 app.js 在页面初始化时填充；
 *       - 其余为应用运行期状态。
 */
window.AppState = {
    /** DOM 引用（app.js 初始化时填充） */
    dom: {},

    /* ---------- 数据状态 ---------- */
    /** Excel 解析结果 { students, classes, subjects, totalN } */
    parsedData: null,
    /** 学生记录列表 */
    studentRecords: [],
    /** 全校分数段（含累计人数、累计比率） */
    globalSegments: [],
    /** 各班级分数段数据 { 班级名: { totalN, rows } } */
    classData: {},

    /* ---------- UI 状态 ---------- */
    /** 当前学科 */
    currentSubject: null,
    /** 当前实体（'全校' 或班级名） */
    currentEntity: null,
    /** 全校对比中勾选的班级 */
    checkedClasses: [],
    /** 当前 Chart.js 实例 */
    chartInstance: null,
    /** resize 防抖定时器 */
    resizeTimer: null,

    /** 班级对比色板 */
    COLORS: [
        '#1a3a6b', '#cc4a4a', '#2d8a6b', '#b87a3a', '#5a6a9a',
        '#c06a4a', '#3a8a8a', '#b08a3a', '#7a5a8a', '#3a7a5a',
        '#b05a5a', '#4a7a9a', '#9a7a3a', '#6a4a8a', '#4a9a7a'
    ]
};
