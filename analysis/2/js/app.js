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
    D.uploadBox = document.getElementById('uploadBox');
    D.fileInput = document.getElementById('fileInput');
    D.uploadFileName = document.getElementById('uploadFileName');
    D.analyzeBtn = document.getElementById('analyzeBtn');
    D.resetBtn = document.getElementById('resetBtn');
    D.statusText = document.getElementById('statusText');
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

    /* ---------- 上传成功文件名（绿色对勾 SVG 图标） ---------- */
    const UPLOAD_SUCCESS_SVG = '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<path d="M512 85.333333c235.648 0 426.666667 191.018667 426.666667 426.666667s-191.018667 426.666667-426.666667 426.666667S85.333333 747.648 85.333333 512 276.352 85.333333 512 85.333333z m-74.965333 550.4L346.453333 545.152a42.666667 42.666667 0 1 0-60.330666 60.330667l120.704 120.704a42.666667 42.666667 0 0 0 60.330666 0l301.653334-301.696a42.666667 42.666667 0 1 0-60.288-60.330667l-271.530667 271.488z" fill="#52C41A"></path>' +
        '</svg>';
    function setUploadFileName(fileName) {
        D.uploadFileName.innerHTML = '';
        const icon = document.createElement('span');
        icon.className = 'upload-success-icon';
        icon.innerHTML = UPLOAD_SUCCESS_SVG;
        D.uploadFileName.appendChild(icon);
        const name = document.createElement('span');
        name.className = 'upload-file-name';
        name.textContent = fileName;
        D.uploadFileName.appendChild(name);
    }

    /* ---------- 文件处理 ---------- */
    function handleFile(file) {
        if (!file) return;
        UI.resetAll();
        D.uploadBox.classList.add('loading');
        D.uploadBox.classList.remove('uploaded');
        D.uploadFileName.textContent = '⏳ 解析中...';
        D.analyzeBtn.disabled = true;
        D.resetBtn.disabled = true;
        D.statusText.textContent = '正在解析文件...';
        Data.parseExcel(file)
            .then(data => {
                S.parsedData = data;
                S.studentRecords = data.students;
                D.totalStudents.textContent = data.totalN;
                D.totalClasses.textContent = data.classes.length;
                D.totalSubjects.textContent = data.subjects.length;
                // 上传后先展示统计信息（以首个学科“总分”为准），分析界面点击“开始分析”后再渲染
                S.currentSubject = data.subjects[0];
                S.globalSegments = Data.buildGlobalSegments(data.students, S.currentSubject);
                S.classData = Data.buildClassData(data.students, S.globalSegments, S.currentSubject);
                S.checkedClasses = [];
                UI.updateStatsForEntity('全校');
                D.uploadBox.classList.remove('loading');
                D.uploadBox.classList.add('uploaded');
                setUploadFileName(file.name);
                D.analyzeBtn.disabled = false;
                D.resetBtn.disabled = false;
                D.statusText.innerHTML = '<span class="status-icon">' + UPLOAD_SUCCESS_SVG + '</span>数据已就绪，点击“开始分析”查看结果';
                D.statusText.className = 'status ok';
            })
            .catch(err => {
                alert('解析出错：' + err);
                D.uploadBox.classList.remove('loading');
                D.uploadFileName.textContent = '❌ 解析失败';
                D.statusText.textContent = '❌ 解析失败，请检查文件格式';
                D.statusText.className = 'status err';
                D.analyzeBtn.disabled = true;
                D.resetBtn.disabled = false;
            });
    }

    /* ---------- 开始分析 ---------- */
    function startAnalysis() {
        if (!S.parsedData) { alert('请先上传有效数据'); return; }
        // 显示分析区域并渲染学科、班级、图表与表格
        D.analysisArea.classList.remove('hidden');
        if (!document.querySelector('.subject-tab')) {
            UI.renderSubjects(S.parsedData.subjects);
        } else if (S.currentEntity && S.currentEntity !== '全校') {
            UI.selectEntity(S.currentEntity);
        } else {
            UI.updateAllView();
        }
        D.statusText.innerHTML = '<span class="status-icon">' + UPLOAD_SUCCESS_SVG + '</span>分析完成，可切换学科、班级或全校对比';
        D.statusText.className = 'status ok';
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
    D.uploadBox.addEventListener('click', function(e) { if (e.target.tagName !== 'INPUT') D.fileInput.click(); });
    D.fileInput.addEventListener('change', function(e) { if (this.files && this.files.length > 0) handleFile(this.files[0]); this.value = ''; });
    D.analyzeBtn.addEventListener('click', startAnalysis);
    D.resetBtn.addEventListener('click', function() {
        if (S.parsedData && !window.confirm('确定要重新上传吗？当前分析结果将被清空，请重新选择文件。')) {
            return;
        }
        UI.resetAll();
    });
    D.downloadTableBtn.addEventListener('click', Download.table);
    D.downloadChartBtn.addEventListener('click', Download.chart);
    D.viewCardChart.addEventListener('click', function() { switchView('chart'); });
    D.viewCardTable.addEventListener('click', function() { switchView('table'); });
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
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.name.match(/\.(xlsx|xls)$/i)) handleFile(file);
            else alert('请拖拽 .xlsx 或 .xls 文件');
        }
    });

    /* ---------- 初始化 ---------- */
    D.analyzeBtn.disabled = true;
    D.resetBtn.disabled = true;
    D.statusText.textContent = '请上传数据文件';
    D.comparePanel.classList.remove('show');
})();
