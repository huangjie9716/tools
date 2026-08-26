/**
 * main.js —— 初始化与事件绑定
 * 负责模式切换、全局事件绑定与页面初始化
 */
(function (App) {
    const E = App.elements;
    const S = App.state;

    // 切换分析模式：保存当前模式数据、载入目标模式数据（不丢失），并刷新界面
    function setMode(mode) {
        saveCurrentModeData();
        S.currentMode = mode;
        E.modeSelector.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        E.modeBadge.textContent = mode === 'prediction' ? '预测模式' : '增量分析模式';
        loadModeData(mode);
        S.activeLineIndex = 0; S.selectedClass = 'all'; S.sortByIncrement = false;
        App.upload.renderUploadZones();
        refreshModeUI();
    }

    // 保存当前模式的上传数据与分析结果
    function saveCurrentModeData() {
        if (S.currentMode === 'increment') {
            S.modeData.increment = {
                currentFileData: S.currentFileData, refFileData: S.refFileData,
                currentFileName: S.currentFileName, refFileName: S.refFileName,
                processedResults: S.processedResults, hasMissing: S.hasMissing, missingConfirmed: S.missingConfirmed
            };
        } else {
            S.modeData.prediction = {
                predictionFileData: S.predictionFileData, predictionFileName: S.predictionFileName,
                processedResults: S.processedResults, hasMissing: S.hasMissing, missingConfirmed: S.missingConfirmed
            };
        }
    }

    // 载入目标模式的上传数据与分析结果
    function loadModeData(mode) {
        S.predictionFileData = null; S.predictionFileName = null;
        S.currentFileData = null; S.refFileData = null;
        S.currentFileName = null; S.refFileName = null;
        S.processedResults = []; S.hasMissing = false; S.missingConfirmed = false;
        const d = S.modeData[mode];
        if (mode === 'increment') {
            S.currentFileData = d.currentFileData; S.refFileData = d.refFileData;
            S.currentFileName = d.currentFileName; S.refFileName = d.refFileName;
        } else {
            S.predictionFileData = d.predictionFileData; S.predictionFileName = d.predictionFileName;
        }
        S.processedResults = d.processedResults || [];
        S.hasMissing = d.hasMissing || false;
        S.missingConfirmed = d.missingConfirmed || false;
    }

    // 根据当前模式数据刷新界面（总人数、按钮、结果区）
    function refreshModeUI() {
        const hasData = S.processedResults.length > 0;
        if (S.currentMode === 'prediction') {
            E.totalStudentsInput.value = S.predictionFileData ? S.predictionFileData.rows.length : '800';
            E.btnCalculate.disabled = !S.predictionFileData;
        } else {
            if (S.currentFileData && S.refFileData) {
                E.totalStudentsInput.value = App.analysis.getCommonIds(S.currentFileData, S.refFileData).length;
                E.btnCalculate.disabled = false;
            } else {
                E.totalStudentsInput.value = '800';
                E.btnCalculate.disabled = true;
            }
        }
        E.btnCalculate.innerHTML = App.util.ICON_ANALYZE + '<span>开始分析</span>';
        E.actionCard.style.display = hasData ? 'block' : 'none';
        E.summaryDownloadArea.style.display = 'none';
        if (hasData) {
            E.emptyStateDetail.style.display = 'none'; E.emptyStateSummary.style.display = 'none';
            E.lineSelectorBar.style.display = 'flex'; E.classFilterBar.style.display = 'flex';
            App.render.renderLineSelector();
            App.render.selectLine(0);
        } else {
            E.resultTable.style.display = 'none'; E.summaryTable.style.display = 'none';
            E.emptyStateDetail.style.display = 'flex'; E.emptyStateSummary.style.display = 'flex';
            E.lineSelectorBar.style.display = 'none'; E.classFilterBar.style.display = 'none';
            E.resultMeta.textContent = ''; E.summaryMeta.textContent = '';
        }
    }

    // 初始化：绑定事件并渲染初始页面
    function init() {
        // 标签切换
        E.tabBar.addEventListener('click', e => {
            const btn = e.target.closest('.tab-btn');
            if (btn && btn.dataset.tab !== S.activeTab) App.render.switchTab(btn.dataset.tab);
        });

        // 模式切换
        E.modeSelector.addEventListener('click', e => {
            const btn = e.target.closest('.mode-btn');
            if (btn && btn.dataset.mode !== S.currentMode) setMode(btn.dataset.mode);
        });

        // 添加达标线
        E.btnAddLine.addEventListener('click', App.lines.addDefaultLine);

        // 开始分析
        E.btnCalculate.addEventListener('click', () => {
            if ((S.currentMode === 'prediction' && !S.predictionFileData) || (S.currentMode === 'increment' && (!S.currentFileData || !S.refFileData))) {
                App.util.showToast('请上传所需文件', 'warning');
                return;
            }
            // 增量模式：有成绩缺失且未确认时，先弹窗确认再继续
            if (S.currentMode === 'increment' && S.hasMissing && !S.missingConfirmed) {
                const info = App.analysis.getMissingCounts();
                App.util.showModal('成绩缺失提示', App.analysis.buildMissingMessage(info),
                    { showCancel: true, confirmText: '继续分析', cancelText: '取消', iconHtml: App.analysis.WARNING_ICON,
                      onConfirm: () => { S.missingConfirmed = true; startAnalysis(); },
                      onCancel: () => { S.missingConfirmed = false; } });
                return;
            }
            startAnalysis();
        });

        function startAnalysis() {
            E.btnCalculate.disabled = true;
            E.btnCalculate.innerHTML = App.util.ICON_ANALYZE + '<span>分析中...</span>';
            setTimeout(() => App.analysis.performCalculation(), 50);
        }

        // 数据导出
        E.btnDownload.addEventListener('click', App.download.downloadDetailExcel);
        E.btnDownloadClassSummary.addEventListener('click', App.download.downloadClassSummaryExcel);

        // 重新上传成绩文件
        E.btnReupload.addEventListener('click', () => {
            App.util.showModal('重新上传提示',
                '重新上传将<b>清除当前已上传的成绩文件</b>及<b>分析结果</b>，是否继续？',
                { showCancel: true, confirmText: '确认清除', cancelText: '取消',
                  onConfirm: () => resetForReupload() });
        });

        function resetForReupload() {
            S.predictionFileData = null; S.currentFileData = null; S.refFileData = null;
            S.predictionFileName = null; S.currentFileName = null; S.refFileName = null;
            S.processedResults = []; S.activeLineIndex = 0; S.selectedClass = 'all'; S.sortByIncrement = false;
            S.hasMissing = false; S.missingConfirmed = false;
            App.upload.renderUploadZones();
            E.actionCard.style.display = 'none';
            E.summaryDownloadArea.style.display = 'none';
            E.resultTable.style.display = 'none'; E.summaryTable.style.display = 'none';
            E.emptyStateDetail.style.display = 'flex'; E.emptyStateSummary.style.display = 'flex';
            E.lineSelectorBar.style.display = 'none'; E.classFilterBar.style.display = 'none';
            E.resultMeta.textContent = ''; E.summaryMeta.textContent = '';
            E.btnCalculate.disabled = true;
            E.btnCalculate.innerHTML = App.util.ICON_ANALYZE + '<span>开始分析</span>';
            E.totalStudentsInput.value = '800';
            App.util.showToast('已清除，请重新上传', 'info');
        }

        // 弹窗：确定 / 取消 / 遮罩
        E.modalOk.addEventListener('click', () => {
            App.util.hideModal();
            const cb = App.modalCallbacks ? App.modalCallbacks.onConfirm : null;
            App.modalCallbacks = null;
            if (typeof cb === 'function') cb();
        });
        E.modalCancel.addEventListener('click', () => {
            App.util.hideModal();
            const cb = App.modalCallbacks ? App.modalCallbacks.onCancel : null;
            App.modalCallbacks = null;
            if (typeof cb === 'function') cb();
        });
        E.modalOverlay.addEventListener('click', e => {
            if (e.target === E.modalOverlay) {
                App.util.hideModal();
                const cb = App.modalCallbacks ? App.modalCallbacks.onCancel : null;
                App.modalCallbacks = null;
                if (typeof cb === 'function') cb();
            }
        });

        // 初始渲染
        setMode('increment');
        App.lines.renderLines([{ name: '达标线1', target: 80 }]);
    }

    App.main = { init, setMode };
    init();
})(window.App = window.App || {});
