/**
 * state.js —— 全局共享状态与 DOM 引用
 * 所有模块通过 window.App 命名空间共享数据与元素
 */
(function (App) {
    // DOM 元素引用
    App.elements = {
        modeSelector: document.getElementById('modeSelector'),
        modeBadge: document.getElementById('modeBadge'),
        uploadBody: document.getElementById('uploadBody'),
        totalStudentsInput: document.getElementById('totalStudents'),
        rangeCoefficientInput: document.getElementById('rangeCoefficient'),
        btnCalculate: document.getElementById('btnCalculate'),
        btnDownload: document.getElementById('btnDownload'),
        btnDownloadClassSummary: document.getElementById('btnDownloadClassSummary'),
        actionCard: document.getElementById('actionCard'),
        linesContainer: document.getElementById('linesContainer'),
        btnAddLine: document.getElementById('btnAddLine'),
        btnReupload: document.getElementById('btnReupload'),
        lineSelectorBar: document.getElementById('lineSelectorBar'),
        resultTable: document.getElementById('resultTable'),
        resultTableHead: document.getElementById('resultTableHead'),
        resultTableBody: document.getElementById('resultTableBody'),
        emptyStateDetail: document.getElementById('emptyStateDetail'),
        emptyStateSummary: document.getElementById('emptyStateSummary'),
        resultMeta: document.getElementById('resultMeta'),
        classFilterBar: document.getElementById('classFilterBar'),
        summaryMeta: document.getElementById('summaryMeta'),
        detailPanel: document.getElementById('detailPanel'),
        summaryPanel: document.getElementById('summaryPanel'),
        summaryTable: document.getElementById('summaryTable'),
        summaryTableHead: document.getElementById('summaryTableHead'),
        summaryTableBody: document.getElementById('summaryTableBody'),
        summaryDownloadArea: document.getElementById('summaryDownloadArea'),
        tabBar: document.getElementById('tabBar'),
        toastContainer: document.getElementById('toastContainer'),
        modalOverlay: document.getElementById('modalOverlay'),
        modalTitle: document.getElementById('modalTitle'),
        modalMessage: document.getElementById('modalMessage'),
        modalOk: document.getElementById('modalOk'),
        modalCancel: document.getElementById('modalCancel')
    };

    // 应用状态
    App.state = {
        currentMode: 'increment',     // 当前模式：'increment' 增量分析 | 'prediction' 预测
        predictionFileData: null,     // 预测模式成绩数据
        predictionFileName: null,     // 预测模式文件名
        currentFileData: null,        // 本次成绩数据
        currentFileName: null,        // 本次成绩文件名
        refFileData: null,            // 参考成绩数据
        refFileName: null,            // 参考成绩文件名
        processedResults: [],         // 分析结果列表
        activeLineIndex: 0,           // 当前选中的达标线下标
        activeTab: 'detail',          // 当前标签：'detail' 明细 | 'summary' 汇总
        selectedClass: 'all',         // 班级筛选：'all' 或班级名
        sortByIncrement: false,       // 班级汇总是否按增量排序
        hasMissing: false,            // 增量模式是否有学生成绩缺失
        missingConfirmed: false,      // 用户是否已确认继续（有缺失时需确认）
        modeData: {                   // 各模式独立保存的数据（切换模式不丢失）
            increment: { currentFileData: null, refFileData: null, currentFileName: null, refFileName: null, processedResults: [], hasMissing: false, missingConfirmed: false },
            prediction: { predictionFileData: null, predictionFileName: null, processedResults: [], hasMissing: false, missingConfirmed: false }
        }
    };
})(window.App = window.App || {});
