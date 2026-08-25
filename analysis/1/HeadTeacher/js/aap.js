/* ============================================================
   js/app.js —— 应用主逻辑模块
   负责：DOM 引用收集、日志、文件选择/拖拽、主分析流程
   （含缺失数据检测与用户确认）、重置（弹窗确认）、事件绑定与初始化。
   ⚠️ 底层数据处理逻辑位于 js/stats.js，本文件仅负责流程编排。
   ============================================================ */
(function (global) {
    'use strict';

    const HT = global.HT;

    // ---- DOM 引用 ----
    HT.el.file1Input = document.getElementById('file1');
    HT.el.file2Input = document.getElementById('file2');
    HT.el.status1 = document.getElementById('status1');
    HT.el.status2 = document.getElementById('status2');
    HT.el.drop1 = document.getElementById('drop1');
    HT.el.drop2 = document.getElementById('drop2');
    HT.el.processBtn = document.getElementById('processBtn');
    HT.el.logBox = document.getElementById('logBox');
    HT.el.stateLabel = document.getElementById('stateLabel');
    HT.el.matchCount = document.getElementById('matchCount');
    HT.el.currentClassDisplay = document.getElementById('currentClassDisplay');
    HT.el.resultArea = document.getElementById('resultArea');
    HT.el.resultBody = document.getElementById('resultBody');
    HT.el.resultHead = document.getElementById('resultHead');
    HT.el.previewNote = document.getElementById('previewNote');
    HT.el.downloadBtn = document.getElementById('downloadBtn');
    HT.el.resetBtn = document.getElementById('resetBtn');
    HT.el.layerInput = document.getElementById('layerInput');
    HT.el.suggestLayer = document.getElementById('suggestLayer');
    HT.el.regressionArea = document.getElementById('regressionArea');
    HT.el.regressionFormula = document.getElementById('regressionFormula');
    HT.el.scatterPlot = document.getElementById('scatterPlot');
    HT.el.downloadPlotBtn = document.getElementById('downloadPlotBtn');
    HT.el.subjectButtons = document.getElementById('subjectButtons');
    HT.el.sortButtonsContainer = document.getElementById('sortButtons');
    HT.el.subjectRow = document.getElementById('subjectRow');
    HT.el.viewCards = document.getElementById('viewCards');
    HT.el.missingModal = document.getElementById('missingModal');
    HT.el.missingValidCount = document.getElementById('missingValidCount');
    HT.el.missingListBody = document.getElementById('missingListBody');
    HT.el.missingContinueBtn = document.getElementById('missingContinueBtn');
    HT.el.missingCancelBtn = document.getElementById('missingCancelBtn');
    HT.el.confirmModal = document.getElementById('confirmModal');
    HT.el.confirmOkBtn = document.getElementById('confirmOkBtn');
    HT.el.confirmCancelBtn = document.getElementById('confirmCancelBtn');

    // ---- 日志 ----
    HT.log = function (msg, type = '') {
        const logBox = HT.el.logBox;
        const time = new Date().toLocaleTimeString();
        const prefix = type === 'ok' ? HT.CHECK_ICON : type === 'err' ? '❌' : '⚡';
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
            if (side === 1) { HT.state.file1Data = data; HT.state.file1Name = file.name; }
            else { HT.state.file2Data = data; HT.state.file2Name = file.name; }
            global.UI.updateFileStatus();
            HT.log('📎 已加载：' + file.name + '（' + data.length + ' 行）', 'ok');
        };
        global.Utils.readFileAsArray(file)
            .then(data => {
                if (!data || data.length === 0) { HT.log('⚠️ 文件为空：' + file.name, 'err'); return; }
                setData(data);
            })
            .catch(err => { HT.log('❌ ' + err, 'err'); });
    }
    HT.el.file1Input.addEventListener('change', function() { handleFileSelect(this, 1); });
    HT.el.file2Input.addEventListener('change', function() { handleFileSelect(this, 2); });

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
    setupDrop(HT.el.drop1, HT.el.file1Input);
    setupDrop(HT.el.drop2, HT.el.file2Input);

    // 用户手动修改层数后不再自动覆盖
    HT.el.layerInput.addEventListener('input', function() {
        HT.el.layerInput.dataset.userChanged = 'true';
    });

    // ---- 主处理 ----
    async function processData() {
        if (!HT.state.file1Data || !HT.state.file2Data) {
            alert('请先上传两个成绩表！');
            return;
        }

        let layer = parseInt(HT.el.layerInput.value);
        if (isNaN(layer) || layer < 2) {
            alert('请输入有效的层数（正整数 ≥ 2）');
            return;
        }

        HT.log('🔍 开始处理，层数 = ' + layer, '');

        const h1 = HT.state.file1Data[0] || {};
        const h2 = HT.state.file2Data[0] || {};
        // 识别列名
        const idKey1 = global.Utils.findKey(h1, ['学号', 'ID', 'id', '编号']);
        const nameKey1 = global.Utils.findKey(h1, ['姓名', '名字', 'name', 'Name']);
        const classKey1 = global.Utils.findKey(h1, ['班级', 'class', 'Class', '班级号']);
        const scoreKey1 = global.Utils.findKey(h1, ['总分', '成绩', '分数', 'score', 'Score']);
        const idKey2 = global.Utils.findKey(h2, ['学号', 'ID', 'id', '编号']);
        const nameKey2 = global.Utils.findKey(h2, ['姓名', '名字', 'name', 'Name']);
        const classKey2 = global.Utils.findKey(h2, ['班级', 'class', 'Class', '班级号']);
        const scoreKey2 = global.Utils.findKey(h2, ['总分', '成绩', '分数', 'score', 'Score']);

        if (!idKey1 || !scoreKey1) {
            HT.log('❌ 第一次成绩表缺少"学号"或"总分"列', 'err');
            alert('第一次成绩表缺少"学号"或"总分"列，请检查表头。');
            return;
        }
        if (!idKey2 || !scoreKey2) {
            HT.log('❌ 第二次成绩表缺少"学号"或"总分"列', 'err');
            alert('第二次成绩表缺少"学号"或"总分"列，请检查表头。');
            return;
        }

        // ---- 按表头顺序识别学科（总分固定在最前） ----
        const excludePatterns = ['学号','ID','id','编号','姓名','名字','name','Name','班级','class','Class','班级号','总分','成绩','分数','score','Score'];
        const keys1 = Object.keys(h1);
        const subjectKeys = [];
        for (let k of keys1) {
            // 跳过排除列
            if (excludePatterns.some(p => k.includes(p))) continue;
            // 避免重复添加
            if (!subjectKeys.includes(k)) {
                subjectKeys.push(k);
            }
        }
        // 最终学科列表：'总分' + 按表头顺序出现的其他学科
        const subjectList = ['总分', ...subjectKeys];
        HT.state.allSubjects = subjectList;

        HT.log('📚 识别到学科（按表头顺序）：' + subjectList.join(', '), '');

        // 提取数据（包含姓名）
        const map1 = new Map();
        const map2 = new Map();

        HT.state.file1Data.forEach(row => {
            const id = String(row[idKey1]).trim();
            const name = nameKey1 ? String(row[nameKey1]).trim() : '';
            const cls = classKey1 ? String(row[classKey1]).trim() : '';
            const score = parseFloat(row[scoreKey1]);
            if (id && id !== 'undefined' && !isNaN(score)) {
                const subjects = {};
                subjectList.forEach(sub => {
                    if (sub === '总分') {
                        subjects[sub] = score;
                    } else {
                        subjects[sub] = parseFloat(row[sub]) || 0;
                    }
                });
                map1.set(id, { name: name, class: cls, subjects: subjects });
            }
        });

        HT.state.file2Data.forEach(row => {
            const id = String(row[idKey2]).trim();
            const name = nameKey2 ? String(row[nameKey2]).trim() : '';
            const cls = classKey2 ? String(row[classKey2]).trim() : '';
            const score = parseFloat(row[scoreKey2]);
            if (id && id !== 'undefined' && !isNaN(score)) {
                const subjects = {};
                subjectList.forEach(sub => {
                    if (sub === '总分') {
                        subjects[sub] = score;
                    } else {
                        subjects[sub] = parseFloat(row[sub]) || 0;
                    }
                });
                map2.set(id, { name: name, class: cls, subjects: subjects });
            }
        });

        // 对齐
        const common = [];
        for (let [id, v1] of map1) {
            if (map2.has(id)) {
                common.push({
                    id: id,
                    name: v1.name || map2.get(id).name || '',
                    class: v1.class || map2.get(id).class || '',
                    subjects1: v1.subjects,
                    subjects2: map2.get(id).subjects
                });
            }
        }
        if (common.length === 0) {
            HT.log('❌ 两次成绩无交集学号，请检查数据', 'err');
            alert('两次成绩表没有共同的学号，无法匹配！');
            return;
        }
        if (common.length > 0 && common[0].class) {
            HT.state.currentClass = common[0].class;
            HT.el.currentClassDisplay.textContent = HT.state.currentClass;
        } else {
            HT.state.currentClass = '未知班级';
            HT.el.currentClassDisplay.textContent = '—';
        }
        HT.log('匹配到 ' + common.length + ' 名学生（班级：' + HT.state.currentClass + '）', 'ok');
        HT.el.matchCount.textContent = common.length;

        // ---- 缺失数据检测与用户确认（不改变匹配逻辑，仅统计未匹配学号） ----
        const missingStudents = [];
        for (let [id, v] of map1) {
            if (!map2.has(id)) missingStudents.push({ id: id, name: v.name || '未知', note: '缺少第二次成绩' });
        }
        for (let [id, v] of map2) {
            if (!map1.has(id)) missingStudents.push({ id: id, name: v.name || '未知', note: '缺少第一次成绩' });
        }
        if (missingStudents.length > 0) {
            HT.log(`⚠️ 检测到 ${missingStudents.length} 名学生存在考试数据缺失，有效人数 ${common.length} 人`, '');
            const proceed = await global.UI.confirmMissingData(common.length, missingStudents);
            if (!proceed) {
                HT.log('⏹️ 用户取消分析，未生成结果', '');
                return;
            }
        }

        // ---- 分析每个学科 ----
        HT.state.subjectResults = {};
        HT.state.allSubjects.forEach(sub => {
            HT.log(`🔍 正在分析学科：${sub}`, '');
            const subjectData = common.map(r => ({
                id: r.id,
                name: r.name,
                class: r.class,
                score1: r.subjects1[sub] || 0,
                score2: r.subjects2[sub] || 0
            }));
            const result = global.Stats.analyzeSubject(sub, subjectData, layer);
            if (result) {
                HT.state.subjectResults[sub] = result.data;
                HT.log(`${sub} 分析完成，有效人数 ${result.data.length}`, 'ok');
            } else {
                HT.log(`⚠️ ${sub} 分析失败，跳过`, 'err');
            }
        });

        // 初始化排序按钮事件
        global.UI.initSortButtons();

        // 生成学科按钮
        global.UI.buildSubjectButtons();
        const firstSub = HT.state.allSubjects.find(s => HT.state.subjectResults[s]);
        if (firstSub) {
            HT.el.subjectRow.style.display = 'flex';
            HT.el.viewCards.style.display = 'flex';
            global.UI.switchView('result');
            HT.state.currentSortField = 'id';
            HT.el.stateLabel.innerHTML = HT.CHECK_ICON + ' 分析完成';
            HT.el.stateLabel.style.color = '#28a745';
            global.UI.switchSubject(firstSub);
            HT.el.downloadBtn.onclick = function() {
                global.UI.downloadCurrentSubjectExcel();
            };
            HT.log('🎉 所有学科分析完成！', 'ok');
        } else {
            alert('没有成功分析任何学科，请检查数据。');
        }
    }

    // ---- 重置（弹出网页内确认框） ----
    function resetAll() {
        HT.el.confirmModal.style.display = 'flex';
    }

    // ---- 执行重置 ----
    function doReset() {
        HT.state.file1Data = null; HT.state.file2Data = null;
        HT.state.file1Name = ''; HT.state.file2Name = '';
        HT.state.subjectResults = {}; HT.state.allSubjects = [];
        HT.el.file1Input.value = ''; HT.el.file2Input.value = '';
        HT.el.layerInput.dataset.userChanged = 'false';
        HT.el.layerInput.value = 5;
        HT.el.suggestLayer.textContent = '5';
        global.UI.updateFileStatus();
        HT.el.resultArea.style.display = 'none';
        HT.el.resultBody.innerHTML = ''; HT.el.resultHead.innerHTML = '';
        HT.el.matchCount.textContent = '-';
        HT.el.currentClassDisplay.textContent = '-';
        HT.el.stateLabel.innerHTML = '数据待分析';
        HT.el.stateLabel.style.color = '#6c757d';
        HT.el.regressionArea.style.display = 'none';
        Plotly.purge(HT.el.scatterPlot);
        HT.el.subjectButtons.innerHTML = '';
        HT.el.previewNote.textContent = '';
        HT.el.subjectRow.style.display = 'none';
        HT.el.viewCards.style.display = 'none';
        HT.el.viewCards.querySelectorAll('.view-card').forEach(c => c.classList.toggle('active', c.dataset.view === 'result'));
        HT.state.currentView = 'result';
        HT.log('🔄 已重置，可重新上传文件', '');
    }

    // ---- 绑定事件 ----
    HT.el.processBtn.addEventListener('click', processData);
    HT.el.resetBtn.addEventListener('click', resetAll);
    HT.el.confirmOkBtn.addEventListener('click', function() {
        HT.el.confirmModal.style.display = 'none';
        doReset();
    });
    HT.el.confirmCancelBtn.addEventListener('click', function() {
        HT.el.confirmModal.style.display = 'none';
    });
    HT.el.viewCards.querySelectorAll('.view-card').forEach(card => {
        card.addEventListener('click', function() {
            global.UI.switchView(this.dataset.view);
        });
    });

    // ---- 初始化 ----
    global.UI.updateFileStatus();
    HT.log('⚡ 就绪，请上传第一次成绩和第二次成绩表。', '');

})(window);
