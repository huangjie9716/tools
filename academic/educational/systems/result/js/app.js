/**
 * app.js —— 主入口
 *
 * 职责：填充 DOM 引用、定义文件处理与开始分析流程、绑定事件、初始化。
 * 依赖：window.AppState、window.UI、window.Data、window.Download
 */
(function () {
    'use strict';

    const S = AppState;
    const D = S.dom;

    /* ---------- 填充 DOM 引用 ---------- */
    D.resetBtn = document.getElementById('resetBtn');
    D.totalStudents = document.getElementById('totalStudents');
    D.totalClasses = document.getElementById('totalClasses');
    D.totalSubjects = document.getElementById('totalSubjects');
    D.maxScore = document.getElementById('maxScore');
    D.minScore = document.getElementById('minScore');
    D.segmentCount = document.getElementById('segmentCount');
    D.analysisArea = document.getElementById('analysisArea');
    D.subjectBar = document.getElementById('subjectBar');
    D.classTabs = document.getElementById('classTabs');
    D.comparePanel = document.getElementById('comparePanel');
    D.checkboxGroup = document.getElementById('checkboxGroup');
    D.selectAllBtn = document.getElementById('selectAllBtn');
    D.clearAllBtn = document.getElementById('clearAllBtn');
    D.downloadTableBtn = document.getElementById('downloadTableBtn');
    D.downloadChartBtn = document.getElementById('downloadChartBtn');
    D.yScaleToggle = document.getElementById('yScaleToggle');
    D.viewCardChart = document.getElementById('viewCardChart');
    D.viewCardTable = document.getElementById('viewCardTable');
    D.viewChartPanel = document.getElementById('viewChartPanel');
    D.viewTablePanel = document.getElementById('viewTablePanel');
    D.noDataMsg = document.getElementById('noDataMsg');
    D.resultTable = document.getElementById('resultTable');
    D.tableHead = document.getElementById('tableHead');
    D.tableBody = document.getElementById('tableBody');
    D.noChartMsg = document.getElementById('noChartMsg');
    D.tChartCanvas = document.getElementById('tChart');
    D.chartSubtitle = document.getElementById('chartSubtitle');
    D.dataTitle = document.getElementById('dataTitle');

    /* ---------- 状态图标（绿色对勾 SVG） ---------- */

    /* ---------- 应用解析结果（云端考试） ---------- */
    function applyParsedData(data, displayName) {
        S.parsedData = data;
        S.studentRecords = data.students;
        D.totalStudents.textContent = data.totalN;
        D.totalClasses.textContent = data.classes.length;
        D.totalSubjects.textContent = data.subjects.length;
        S.currentSubject = data.subjects[0];
        S.globalSegments = Data.buildGlobalSegments(data.students, S.currentSubject);
        S.classData = Data.buildClassData(data.students, S.globalSegments, S.currentSubject);
        S.checkedClasses = [];
        UI.updateStatsForEntity('全级');
        if (D.resetBtn) D.resetBtn.disabled = false;
        var nameEl = document.getElementById('cloudExamName');
        if (nameEl) {
            nameEl.textContent = displayName || '';
            nameEl.classList.remove('is-empty');
        }
        var pickBtn = document.getElementById('pickResultExam');
        if (pickBtn) pickBtn.textContent = '选择其他考试';
        startAnalysis();
    }

    /* ---------- 开始分析（选择考试后自动执行） ---------- */
    function startAnalysis() {
        if (!S.parsedData) return;
        D.analysisArea.classList.remove('hidden');
        const subjectKey = S.parsedData.subjects.join('|');
        if (!document.querySelector('.subject-tab') || S.renderedSubjectKey !== subjectKey) {
            S.renderedSubjectKey = subjectKey;
            UI.renderSubjects(S.parsedData.subjects);
        } else if (S.currentEntity && S.currentEntity !== '全级') {
            UI.selectEntity(S.currentEntity);
        } else {
            UI.updateAllView();
        }
    }

    /* ---------- 视图切换（曲线图 / 数据明细） ---------- */
    function switchView(view) {
        const isChart = view === 'chart';
        D.viewCardChart.classList.toggle('active', isChart);
        D.viewCardTable.classList.toggle('active', !isChart);
        D.viewChartPanel.classList.toggle('hidden', !isChart);
        D.viewTablePanel.classList.toggle('hidden', isChart);
    }

    /* ---------- 防抖 Resize ---------- */
    function handleResize() {
        if (S.resizeTimer) { clearTimeout(S.resizeTimer); S.resizeTimer = null; }
        S.resizeTimer = setTimeout(() => {
            if (S.chartInstance) { S.chartInstance.resize(); }
            S.resizeTimer = null;
        }, 100);
    }

    /* ---------- 事件绑定 ---------- */
    if (D.resetBtn) D.resetBtn.addEventListener('click', function() {
        if (S.parsedData && !window.confirm('确定要重新选择吗？当前分析结果将被清空。')) {
            return;
        }
        UI.resetAll();
    });
    D.downloadTableBtn.addEventListener('click', Download.table);
    D.downloadChartBtn.addEventListener('click', Download.chart);
    D.viewCardChart.addEventListener('click', function() { switchView('chart'); });
    D.viewCardTable.addEventListener('click', function() { switchView('table'); });
    // 纵轴量程切换（统一量程 / 自适应量程）
    D.yScaleToggle.addEventListener('click', function(e) {
        const btn = e.target.closest('.axis-toggle-btn');
        if (!btn || btn.classList.contains('active')) return;
        D.yScaleToggle.querySelectorAll('.axis-toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
        S.yAxisMode = btn.dataset.mode === 'auto' ? 'auto' : 'unified';
        UI.refreshChart();
    });
    D.selectAllBtn.addEventListener('click', function() {
        D.checkboxGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        UI.updateCheckedClasses();
        UI.updateAllView();
    });
    D.clearAllBtn.addEventListener('click', function() {
        D.checkboxGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        UI.updateCheckedClasses();
        UI.updateAllView();
    });
    window.addEventListener('resize', handleResize);

    /* ---------- 初始化 ---------- */
    if (D.resetBtn) D.resetBtn.disabled = true;
    D.comparePanel.classList.remove('show');

    /* ---------- 对外暴露（供云端数据接入使用） ---------- */
    window.JZResult = {
        applyParsedData: applyParsedData,
        reset: function () { UI.resetAll(); }
    };
})();
