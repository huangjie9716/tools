/* ============================================================
   js/app.js —— 应用主逻辑模块
   负责：DOM 引用收集、日志、文件选择/拖拽、主分析流程
   （含缺失数据检测与用户确认）、重置（弹窗确认）、事件绑定与初始化。
   ⚠️ 底层数据处理逻辑位于 js/stats.js，本文件仅负责流程编排。
   ============================================================ */
(function (global) {
    'use strict';

    const ST = global.ST;

    // ---- DOM 引用 ----
    ST.el.file1Input = document.getElementById('file1');
    ST.el.file2Input = document.getElementById('file2');
    ST.el.status1 = document.getElementById('status1');
    ST.el.status2 = document.getElementById('status2');
    ST.el.drop1 = document.getElementById('drop1');
    ST.el.drop2 = document.getElementById('drop2');
    ST.el.processBtn = document.getElementById('processBtn');
    ST.el.logBox = document.getElementById('logBox');
    ST.el.stateLabel = document.getElementById('stateLabel');
    ST.el.matchCount = document.getElementById('matchCount');
    ST.el.currentClassDisplay = document.getElementById('currentClassDisplay');
    ST.el.currentSubjectDisplay = document.getElementById('currentSubjectDisplay');
    ST.el.resultArea = document.getElementById('resultArea');
    ST.el.resultBody = document.getElementById('resultBody');
    ST.el.resultHead = document.getElementById('resultHead');
    ST.el.previewNote = document.getElementById('previewNote');
    ST.el.downloadBtn = document.getElementById('downloadBtn');
    ST.el.resetBtn = document.getElementById('resetBtn');
    ST.el.layerInput = document.getElementById('layerInput');
    ST.el.suggestLayer = document.getElementById('suggestLayer');
    ST.el.regressionArea = document.getElementById('regressionArea');
    ST.el.regressionFormula = document.getElementById('regressionFormula');
    ST.el.scatterPlot = document.getElementById('scatterPlot');
    ST.el.downloadPlotBtn = document.getElementById('downloadPlotBtn');
    ST.el.sortButtonsContainer = document.getElementById('sortButtons');
    ST.el.viewCards = document.getElementById('viewCards');
    ST.el.missingModal = document.getElementById('missingModal');
    ST.el.missingValidCount = document.getElementById('missingValidCount');
    ST.el.missingListBody = document.getElementById('missingListBody');
    ST.el.missingContinueBtn = document.getElementById('missingContinueBtn');
    ST.el.missingCancelBtn = document.getElementById('missingCancelBtn');
    ST.el.confirmModal = document.getElementById('confirmModal');
    ST.el.confirmOkBtn = document.getElementById('confirmOkBtn');
    ST.el.confirmCancelBtn = document.getElementById('confirmCancelBtn');

    // ---- 日志 ----
    ST.log = function (msg, type = '') {
        const logBox = ST.el.logBox;
        const time = new Date().toLocaleTimeString();
        const prefix = type === 'ok' ? ST.CHECK_ICON : type === 'err' ? '❌' : '⚡';
        logBox.innerHTML = logBox.innerHTML + '\n' + prefix + ' [' + time + '] ' + msg;
        logBox.scrollTop = logBox.scrollHeight;
        if (logBox.innerHTML.split('\n').length > 80) {
            const lines = logBox.innerHTML.split('\n');
            logBox.innerHTML = lines.slice(-60).join('\n');
        }
    };

    // ---- 文件选择事件 ----
    function handleFileSelect(input, side) {
        const file = input.files[0];
        if (!file) return;
        const setData = (data) => {
            if (side === 1) { ST.state.file1Data = data; ST.state.file1Name = file.name; }
            else { ST.state.file2Data = data; ST.state.file2Name = file.name; }
            global.UI.updateFileStatus();
            ST.log('📎 已加载：' + file.name + '（' + data.length + ' 行）', 'ok');
        };
        global.Utils.readFileAsArray(file)
            .then(data => {
                if (!data || data.length === 0) { ST.log('⚠️ 文件为空：' + file.name, 'err'); return; }
                setData(data);
            })
            .catch(err => { ST.log('❌ ' + err, 'err'); });
    }
    ST.el.file1Input.addEventListener('change', function() { handleFileSelect(this, 1); });
    ST.el.file2Input.addEventListener('change', function() { handleFileSelect(this, 2); });

    // ---- 拖拽支持 ----
    function setupDrop(area, input) {
        area.addEventListener('dragover', (e) => { e.preventDefault(); area.style.borderColor = '#4a90d9'; area.style.background = '#edf5ff'; });
        area.addEventListener('dragleave', () => { area.style.borderColor = '#d6e0ea'; area.style.background = '#f9fbfd'; });
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.style.borderColor = '#d6e0ea';
            area.style.background = '#f9fbfd';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                input.dispatchEvent(new Event('change'));
            }
        });
        area.addEventListener('click', () => input.click());
    }
    setupDrop(ST.el.drop1, ST.el.file1Input);
    setupDrop(ST.el.drop2, ST.el.file2Input);

    // 用户手动修改层数后不再自动覆盖
    ST.el.layerInput.addEventListener('input', function() {
        ST.el.layerInput.dataset.userChanged = 'true';
    });

    // ---- 主处理 ----
    async function processData() {
        if (!ST.state.file1Data || !ST.state.file2Data) {
            alert('请先上传两个成绩表！');
            return;
        }

        let layer = parseInt(ST.el.layerInput.value);
        if (isNaN(layer) || layer < 2) {
            alert('请输入有效的层数（正整数 ≥ 2）');
            return;
        }

        ST.log('🔍 开始处理，层数 = ' + layer, '');

        const h1 = ST.state.file1Data[0] || {};
        const h2 = ST.state.file2Data[0] || {};

        // ---- 智能识别列名 ----
        // 学号：优先匹配，支持多关键词
        const idKey1 = global.Utils.findKey(h1, ['学号', 'ID', 'id', '编号']);
        const nameKey1 = global.Utils.findKey(h1, ['姓名', '名字', 'name']);
        const classKey1 = global.Utils.findKey(h1, ['班级', 'class']);
        const scoreKey1 = global.Utils.findScoreKey(h1);  // 智能识别成绩列

        const idKey2 = global.Utils.findKey(h2, ['学号', 'ID', 'id', '编号']);
        const nameKey2 = global.Utils.findKey(h2, ['姓名', '名字', 'name']);
        const classKey2 = global.Utils.findKey(h2, ['班级', 'class']);
        const scoreKey2 = global.Utils.findScoreKey(h2);

        if (!idKey1 || !scoreKey1) {
            ST.log('❌ 第一次成绩表缺少"学号"或"成绩"列', 'err');
            alert('第一次成绩表缺少"学号"或"成绩"列，请检查表头。\n当前识别的成绩列为：' + (scoreKey1 || '未找到'));
            return;
        }
        if (!idKey2 || !scoreKey2) {
            ST.log('❌ 第二次成绩表缺少"学号"或"成绩"列', 'err');
            alert('第二次成绩表缺少"学号"或"成绩"列，请检查表头。');
            return;
        }

        // 科目名称
        ST.state.subjectName = scoreKey1 || '成绩';
        ST.el.currentSubjectDisplay.textContent = ST.state.subjectName;
        ST.log('📌 识别到成绩列：' + ST.state.subjectName, '');

        // 提取数据
        const map1 = new Map();
        const map2 = new Map();

        ST.state.file1Data.forEach(row => {
            const id = String(row[idKey1]).trim();
            const name = nameKey1 ? String(row[nameKey1]).trim() : '';
            const cls = classKey1 ? String(row[classKey1]).trim() : '';
            const score = parseFloat(row[scoreKey1]);
            if (id && id !== 'undefined' && !isNaN(score)) {
                map1.set(id, { name: name, class: cls, score: score });
            }
        });

        ST.state.file2Data.forEach(row => {
            const id = String(row[idKey2]).trim();
            const name = nameKey2 ? String(row[nameKey2]).trim() : '';
            const cls = classKey2 ? String(row[classKey2]).trim() : '';
            const score = parseFloat(row[scoreKey2]);
            if (id && id !== 'undefined' && !isNaN(score)) {
                map2.set(id, { name: name, class: cls, score: score });
            }
        });

        // 对齐（按学号匹配）
        const common = [];
        for (let [id, v1] of map1) {
            if (map2.has(id)) {
                common.push({
                    id: id,
                    name: v1.name || map2.get(id).name || '',
                    class: v1.class || map2.get(id).class || '',
                    score1: v1.score,
                    score2: map2.get(id).score
                });
            }
        }

        if (common.length === 0) {
            ST.log('❌ 两次成绩无交集学号，请检查数据', 'err');
            alert('两次成绩表没有共同的学号，无法匹配！');
            return;
        }

        if (common.length > 0 && common[0].class) {
            ST.state.currentClass = common[0].class;
            ST.el.currentClassDisplay.textContent = ST.state.currentClass;
        } else {
            ST.state.currentClass = '未知班级';
            ST.el.currentClassDisplay.textContent = '—';
        }
        ST.log('✅ 匹配到 ' + common.length + ' 名学生（班级：' + ST.state.currentClass + '）', 'ok');
        ST.el.matchCount.textContent = common.length;

        // ---- 缺失数据检测与用户确认（不改变匹配逻辑，仅统计未匹配学号） ----
        const missingStudents = [];
        for (let [id, v] of map1) {
            if (!map2.has(id)) missingStudents.push({ id: id, name: v.name || '未知', note: '缺少第二次成绩' });
        }
        for (let [id, v] of map2) {
            if (!map1.has(id)) missingStudents.push({ id: id, name: v.name || '未知', note: '缺少第一次成绩' });
        }
        if (missingStudents.length > 0) {
            ST.log(`⚠️ 检测到 ${missingStudents.length} 名学生存在考试数据缺失，有效人数 ${common.length} 人`, '');
            const proceed = await global.UI.confirmMissingData(common.length, missingStudents);
            if (!proceed) {
                ST.log('⏹️ 用户取消分析，未生成结果', '');
                return;
            }
        }

        // ---- 执行分析 ----
        const result = global.Stats.analyzeSubject(common, layer);
        if (!result) {
            alert('分析失败，请检查数据。');
            return;
        }
        ST.state.resultData = result.data;

        // 初始化排序按钮事件
        global.UI.initSortButtons();

        // 显示视图切换卡片并默认停留在结果视图
        ST.el.viewCards.style.display = 'flex';
        global.UI.switchView('result');
        ST.state.currentSortField = 'id';
        ST.el.stateLabel.innerHTML = ST.CHECK_ICON + ' 分析完成';
        ST.el.stateLabel.style.color = '#28a745';
        global.UI.renderTable(ST.state.currentSortField);
        global.UI.drawRegression();

        ST.el.downloadBtn.onclick = function() {
            global.UI.downloadData();
        };

        ST.log('🎉 分析完成！', 'ok');
    }

    // ---- 重置（弹出网页内确认框） ----
    function resetAll() {
        ST.el.confirmModal.style.display = 'flex';
    }

    // ---- 执行重置 ----
    function doReset() {
        ST.state.file1Data = null; ST.state.file2Data = null;
        ST.state.file1Name = ''; ST.state.file2Name = '';
        ST.state.resultData = [];
        ST.state.subjectName = '';
        ST.el.file1Input.value = ''; ST.el.file2Input.value = '';
        ST.el.layerInput.dataset.userChanged = 'false';
        ST.el.layerInput.value = 5;
        ST.el.suggestLayer.textContent = '5';
        global.UI.updateFileStatus();
        ST.el.resultArea.style.display = 'none';
        ST.el.resultBody.innerHTML = ''; ST.el.resultHead.innerHTML = '';
        ST.el.matchCount.textContent = '-';
        ST.el.currentClassDisplay.textContent = '-';
        ST.el.currentSubjectDisplay.textContent = '-';
        ST.el.stateLabel.innerHTML = '数据待分析';
        ST.el.stateLabel.style.color = '#6c757d';
        ST.el.regressionArea.style.display = 'none';
        Plotly.purge(ST.el.scatterPlot);
        ST.el.previewNote.textContent = '';
        ST.el.viewCards.style.display = 'none';
        ST.el.viewCards.querySelectorAll('.view-card').forEach(c => c.classList.toggle('active', c.dataset.view === 'result'));
        ST.state.currentView = 'result';
        ST.log('🔄 已重置，可重新上传文件', '');
    }

    // ---- 绑定事件 ----
    ST.el.processBtn.addEventListener('click', processData);
    ST.el.resetBtn.addEventListener('click', resetAll);
    ST.el.confirmOkBtn.addEventListener('click', function() {
        ST.el.confirmModal.style.display = 'none';
        doReset();
    });
    ST.el.confirmCancelBtn.addEventListener('click', function() {
        ST.el.confirmModal.style.display = 'none';
    });
    ST.el.viewCards.querySelectorAll('.view-card').forEach(card => {
        card.addEventListener('click', function() {
            global.UI.switchView(this.dataset.view);
        });
    });

    // ---- 初始化 ----
    global.UI.updateFileStatus();
    ST.log('⚡ 就绪，请上传第一次成绩和第二次成绩表。', '');

})(window);
