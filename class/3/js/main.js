/* ============================================================
 * 班主任通用成绩分析系统 - 入口模块 (main.js)
 * 应用初始化（含本地数据自动恢复）、考试次数选择、
 * 开始分析、清空数据等顶层交互。
 * 此脚本必须最后加载。
 * ============================================================ */
(function (App) {
    'use strict';

    const S = App.state;
    const { showToast } = App.utils;
    const { getAllStudents } = App.stateApi;
    const { checkStudentMatch, buildSubjectTabsUI, applyUI, updateUploadStatus, resetAnalysis } = App.ui;
    const { renderTable, renderDashboard } = App.tables;

    const analyzeBtn = document.getElementById('analyzeBtn');

    // 考试次数选择（2~6 次）
    document.getElementById('examCountTabs').addEventListener('click', e => {
        if (e.target.classList.contains('mode-tab')) {
            App.stateApi.setExamCount(e.target.dataset.count);
        }
    });

    // 核心分析流程（供按钮与满分设置弹窗共用）
    function runAnalysis() {
        if (S.loaded.length < S.nExams || !S.loaded.slice(0, S.nExams).every(Boolean)) { showToast('请先上传全部考试成绩'); return; }
        if (S.subjects.length === 0) { showToast('未能识别学科结构，请检查上传文件格式'); return; }
        checkStudentMatch();
        S.analysisStarted = true;
        document.getElementById('dataArea').classList.add('visible');
        document.getElementById('emptyHint').style.display = 'none';
        buildSubjectTabsUI();
        applyUI();
        updateUploadStatus();
        renderTable();
        renderDashboard();
        showToast(`分析完成，共 ${getAllStudents().length} 名学生`);
    }

    // 入口：先确保各科满分已设置，再开始分析
    function startAnalysis() {
        if (S.loaded.length < S.nExams || !S.loaded.slice(0, S.nExams).every(Boolean)) { showToast('请先上传全部考试成绩'); return; }
        if (S.subjects.length === 0) { showToast('未能识别学科结构，请检查上传文件格式'); return; }
        const missing = ['总分', ...S.subjects].filter(s => !S.fullScores[s]);
        if (missing.length) {
            App.ui.showFullScoreDialog({ onSave: () => { App.ui.hideDialog(); runAnalysis(); } });
            return;
        }
        runAnalysis();
    }
    analyzeBtn.addEventListener('click', startAnalysis);
    App.startAnalysis = startAnalysis;
    App.runAnalysis = runAnalysis;

    // 清空数据（网页内确认弹窗，同时清除本地存储）
    document.getElementById('clearDataBtn').addEventListener('click', () => {
        App.ui.showDialog({
            title: '确认清空数据',
            html: '<p>确定要清空所有已上传的成绩数据并重新上传吗？</p><div class="dialog-warn">⚠️ 本机保存的数据也会一并清除，此操作不可恢复。</div>',
            buttons: [
                { text: '取消', onClick: App.ui.hideDialog, className: '' },
                { text: '确定清空', onClick: () => { App.ui.hideDialog(); App.parsing.clearStorage(); App.stateApi.clearAllData(); }, className: 'danger' }
            ]
        });
    });

    function init() {
        // 读取各科满分设置
        App.parsing.loadFullScores();
        // 自动恢复上次保存的成绩数据（localStorage）
        const restored = App.parsing.restoreFromStorage();
        App.stateApi.ensureSlots();
        resetAnalysis();
        buildSubjectTabsUI();
        updateUploadStatus();
        applyUI();
        document.getElementById('emptyHint').style.display = 'block';
        document.getElementById('dataArea').classList.remove('visible');
        // 同步次数选择 tab
        document.querySelectorAll('#examCountTabs .mode-tab').forEach(t =>
            t.classList.toggle('active', parseInt(t.dataset.count, 10) === S.nExams));
        if (restored) showToast('✅ 已自动恢复上次上传的成绩数据，可直接开始分析');
    }

    // 启用拖拽上传
    App.parsing.setupDragDrop();

    init();
})(window.App = window.App || {});
