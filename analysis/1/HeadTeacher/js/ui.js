/* ============================================================
   js/ui.js —— 界面渲染模块
   负责所有与 DOM 展示相关的逻辑：表格渲染（重点列着色）、
   散点图绘制、视图切换、学科切换、弹窗渲染、文件状态等。
   通过全局命名空间 HT（state + el）读写共享数据。
   ============================================================ */
(function (global) {
    'use strict';

    const HT = global.HT;

    // ---- 自动填充建议层数 ----
    function autoFillLayerSuggestion() {
        if (HT.state.file1Data && HT.state.file2Data) {
            const n = Math.min(HT.state.file1Data.length, HT.state.file2Data.length);
            if (n > 0) {
                const log2 = (x) => Math.log2(x);
                const val = 2 * log2(n) - log2(100);
                let suggested = Math.round(val);
                if (suggested < 2) suggested = 2;
                HT.el.suggestLayer.textContent = suggested;
                if (!HT.el.layerInput.dataset.userChanged || HT.el.layerInput.dataset.userChanged === 'false') {
                    HT.el.layerInput.value = suggested;
                }
            }
        }
    }

    // ---- 更新文件状态 ----
    function updateFileStatus() {
        if (HT.state.file1Data) {
            HT.el.status1.textContent = HT.state.file1Name + ' (' + HT.state.file1Data.length + ' 行)';
            HT.el.drop1.classList.add('has-file');
        } else {
            HT.el.status1.textContent = '未选择文件';
            HT.el.drop1.classList.remove('has-file');
        }
        if (HT.state.file2Data) {
            HT.el.status2.textContent = HT.state.file2Name + ' (' + HT.state.file2Data.length + ' 行)';
            HT.el.drop2.classList.add('has-file');
        } else {
            HT.el.status2.textContent = '未选择文件';
            HT.el.drop2.classList.remove('has-file');
        }
        HT.el.processBtn.disabled = !(HT.state.file1Data && HT.state.file2Data);
        if (!HT.state.file1Data || !HT.state.file2Data) {
            HT.el.stateLabel.textContent = '数据待分析';
            HT.el.stateLabel.style.color = '#6c757d';
        } else {
            HT.el.stateLabel.innerHTML = HT.CHECK_ICON + ' 已就绪';
            HT.el.stateLabel.style.color = '#28a745';
            autoFillLayerSuggestion();
        }
    }

    // ---- 生成排序按钮并绑定事件 ----
    function initSortButtons() {
        const btns = HT.el.sortButtonsContainer.querySelectorAll('.btn-sm');
        btns.forEach(btn => {
            btn.addEventListener('click', function() {
                const sort = this.dataset.sort;
                if (sort !== HT.state.currentSortField) {
                    btns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    HT.state.currentSortField = sort;
                    if (HT.state.currentSubject) {
                        renderStudentTable(HT.state.currentSubject, HT.state.currentSortField);
                    }
                }
            });
        });
    }

    // ---- 渲染学生表格（重点列着色） ----
    function renderStudentTable(subject, sortField = 'id') {
        const data = HT.state.subjectResults[subject];
        if (!data) return;

        // 排序
        const sorted = global.Utils.sortStudentRows([...data], sortField);

        // 截取前50
        let displayData = sorted;
        let previewMsg = '';
        if (sorted.length > 50) {
            displayData = sorted.slice(0, 50);
            previewMsg = `（仅显示前50名，共${sorted.length}人）`;
        } else {
            previewMsg = `（共${sorted.length}人）`;
        }
        HT.el.previewNote.textContent = previewMsg;

        // 构建表头
        const headers = [
            { key: 'id', label: '学号', cls: 'col-id' },
            { key: 'name', label: '姓名', cls: 'col-name' },
            { key: 'class', label: '班级号', cls: 'col-class' },
            { key: 'raw1', label: '第一次原始分', cls: 'col-raw' },
            { key: 'rank1', label: '第一次名次', cls: 'col-rank' },
            { key: 'percentile1', label: '第一次百分等级', cls: 'col-percentile' },
            { key: 'std1', label: '第一次标准分', cls: 'col-std' },
            { key: 'layer1', label: '第一次分层名次', cls: 'col-layer' },
            { key: 'raw2', label: '第二次原始分', cls: 'col-raw' },
            { key: 'rank2', label: '第二次名次', cls: 'col-rank' },
            { key: 'percentile2', label: '第二次百分等级', cls: 'col-percentile' },
            { key: 'std2', label: '第二次标准分', cls: 'col-std' },
            { key: 'layer2', label: '第二次分层名次', cls: 'col-layer' },
            { key: 'predicted2', label: '预测成绩', cls: 'col-pred' },
            { key: 'residual', label: '进步分(残差)', cls: 'col-residual' },
            { key: 'residualStd', label: '残差标准差', cls: 'col-residstd' },
            { key: 'tValue', label: '个人T值', cls: 'col-tvalue' },
            { key: 'overTwo', label: '超两标', cls: 'col-flag' },
            { key: 'overOne', label: '超一标', cls: 'col-flag' },
            { key: 'belowOne', label: '退一标', cls: 'col-flag' },
            { key: 'belowTwo', label: '退两标', cls: 'col-flag' }
        ];

        let theadHtml = '<tr>';
        headers.forEach(h => {
            theadHtml += `<th class="${h.cls}">${h.label}</th>`;
        });
        theadHtml += '</tr>';
        HT.el.resultHead.innerHTML = theadHtml;

        // 填充数据（重点列着色：T值 >0 绿 / <0 红；超两标、超一标绿；退一标、退两标红）
        const tbody = HT.el.resultBody;
        tbody.innerHTML = '';
        displayData.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(h => {
                const td = document.createElement('td');
                const v = row[h.key];
                td.textContent = global.Utils.formatValue(h.key, v);
                if (h.key === 'tValue') {
                    if (v > 0) td.className = 'cell-green';
                    else if (v < 0) td.className = 'cell-red';
                } else if (h.key === 'overTwo' || h.key === 'overOne') {
                    td.className = v === 1 ? 'cell-green' : 'cell-muted';
                } else if (h.key === 'belowOne' || h.key === 'belowTwo') {
                    td.className = v === 1 ? 'cell-red' : 'cell-muted';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        // 更新排序按钮高亮
        const sortBtns = HT.el.sortButtonsContainer.querySelectorAll('.btn-sm');
        sortBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === sortField);
        });
        HT.state.currentSortField = sortField;
    }

    // ---- 绘制回归散点图（分层点按高低回归线着色，黑色虚线回归线） ----
    function drawRegressionForSubject(subject) {
        const data = HT.state.subjectResults[subject];
        if (!data || data.length === 0) return;
        const layerMap = new Map();
        data.forEach(r => {
            const l = r.layer1;
            if (!layerMap.has(l)) {
                layerMap.set(l, { sum1: 0, sum2: 0, count: 0 });
            }
            const entry = layerMap.get(l);
            entry.sum1 += r.std1;
            entry.sum2 += r.std2;
            entry.count++;
        });
        const layers = Array.from(layerMap.keys()).sort((a, b) => a - b);
        const xMeans = layers.map(l => layerMap.get(l).sum1 / layerMap.get(l).count);
        const yMeans = layers.map(l => layerMap.get(l).sum2 / layerMap.get(l).count);

        const reg = global.Stats.linearRegression(xMeans, yMeans);
        if (!reg) {
            HT.state.plotData = null;
            HT.el.regressionArea.style.display = 'none';
            return;
        }
        const { slope, intercept } = reg;

        // 回归线（黑色虚线）
        const xMin = Math.min(...xMeans);
        const xMax = Math.max(...xMeans);
        const xRange = [xMin - 10, xMax + 10];
        const yRange = xRange.map(x => slope * x + intercept);
        const trace2 = {
            x: xRange,
            y: yRange,
            mode: 'lines',
            type: 'scatter',
            line: { color: '#000000', width: 2.5, dash: 'dash' },
            name: '回归线'
        };

        // 分层点按高于/低于回归线分组着色（高于绿、低于红），附残差线与放大的距离数字
        const aboveX = [], aboveY = [], belowX = [], belowY = [];
        const residualTraces = [];
        const annotations = [];
        xMeans.forEach((x, i) => {
            const y = yMeans[i];
            const yPred = slope * x + intercept;
            const diff = y - yPred;
            const color = diff >= 0 ? '#28a745' : '#e74c3c';
            if (diff >= 0) { aboveX.push(x); aboveY.push(y); }
            else { belowX.push(x); belowY.push(y); }
            residualTraces.push({
                x: [x, x],
                y: [y, yPred],
                mode: 'lines',
                type: 'scatter',
                line: { color: color, width: 2 },
                showlegend: false,
                hoverinfo: 'skip'
            });
            const sign = diff >= 0 ? '+' : '';
            const label = sign + diff.toFixed(2);
            const yOffset = (diff >= 0) ? 8 : -8;
            annotations.push({
                x: x,
                y: y + yOffset,
                text: label,
                showarrow: false,
                font: { color: color, size: 15 },
                xanchor: 'center',
                yanchor: (diff >= 0) ? 'bottom' : 'top'
            });
        });
        const traceAbove = {
            x: aboveX,
            y: aboveY,
            mode: 'markers',
            type: 'scatter',
            marker: { size: 13, color: '#28a745' },
            name: '高于回归线'
        };
        const traceBelow = {
            x: belowX,
            y: belowY,
            mode: 'markers',
            type: 'scatter',
            marker: { size: 13, color: '#e74c3c' },
            name: '低于回归线'
        };

        const allTraces = [traceAbove, traceBelow, trace2, ...residualTraces];
        const layout = {
            title: `【${subject}】第一次标准分均值 vs 第二次标准分均值`,
            xaxis: { title: '第一次标准分均值' },
            yaxis: { title: '第二次标准分均值' },
            hovermode: 'closest',
            margin: { l: 60, r: 40, t: 50, b: 60 },
            annotations: annotations
        };
        const config = { responsive: true, displayModeBar: true };
        Plotly.newPlot(HT.el.scatterPlot, allTraces, layout, config);
        HT.state.plotData = { data: allTraces, layout, config };
        const formulaText = `y = ${intercept.toFixed(4)} + ${slope.toFixed(4)} · x`;
        HT.el.regressionFormula.innerHTML = `<code> 经验回归方程：${formulaText}</code>`;
        HT.el.downloadPlotBtn.onclick = function() {
            if (HT.state.plotData) {
                Plotly.downloadImage(HT.el.scatterPlot, { format: 'png', filename: `回归散点图_${subject}` });
            }
        };
    }

    // ---- 视图切换卡片 ----
    function switchView(view) {
        HT.el.resultArea.style.display = view === 'result' ? 'block' : 'none';
        HT.el.regressionArea.style.display = view === 'regression' ? 'block' : 'none';
        document.querySelectorAll('#viewCards .view-card').forEach(card => {
            card.classList.toggle('active', card.dataset.view === view);
        });
        HT.state.currentView = view;
        // 切到回归视图时在可见容器中重绘，避免隐藏容器导致图表尺寸异常
        if (view === 'regression' && HT.state.currentSubject && HT.state.subjectResults[HT.state.currentSubject]) {
            drawRegressionForSubject(HT.state.currentSubject);
        }
    }

    // ---- 生成学科按钮（按表头顺序） ----
    function buildSubjectButtons() {
        HT.el.subjectButtons.innerHTML = '';
        const validSubjects = HT.state.allSubjects.filter(s => HT.state.subjectResults[s]);
        validSubjects.forEach(sub => {
            const btn = document.createElement('button');
            btn.className = 'subject-btn' + (sub === HT.state.currentSubject ? ' active' : '');
            btn.textContent = sub;
            btn.dataset.subject = sub;
            btn.addEventListener('click', function() {
                const selected = this.dataset.subject;
                if (selected && HT.state.subjectResults[selected]) {
                    switchSubject(selected);
                }
            });
            HT.el.subjectButtons.appendChild(btn);
        });
    }

    // ---- 切换学科 ----
    function switchSubject(subject) {
        if (!subject || !HT.state.subjectResults[subject]) return;
        HT.state.currentSubject = subject;
        document.querySelectorAll('#subjectButtons .subject-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subject === subject);
        });
        renderStudentTable(subject, HT.state.currentSortField);
        drawRegressionForSubject(subject);
    }

    // ---- 缺失数据提醒弹窗（返回 Promise，用户确认后 resolve） ----
    function confirmMissingData(validCount, missingList) {
        return new Promise((resolve) => {
            HT.el.missingValidCount.textContent = validCount;
            HT.el.missingListBody.innerHTML = '';
            missingList.forEach(item => {
                const tr = document.createElement('tr');
                const tdId = document.createElement('td');
                tdId.textContent = item.id;
                const tdName = document.createElement('td');
                tdName.textContent = item.name;
                const tdNote = document.createElement('td');
                tdNote.textContent = item.note;
                tr.appendChild(tdId);
                tr.appendChild(tdName);
                tr.appendChild(tdNote);
                HT.el.missingListBody.appendChild(tr);
            });
            HT.el.missingModal.style.display = 'flex';
            let settled = false;
            const done = (val) => {
                if (settled) return;
                settled = true;
                HT.el.missingModal.style.display = 'none';
                resolve(val);
            };
            HT.el.missingContinueBtn.onclick = () => done(true);
            HT.el.missingCancelBtn.onclick = () => done(false);
        });
    }

    // ---- 下载当前学科数据 ----
    function downloadCurrentSubjectExcel() {
        const sub = HT.state.currentSubject;
        if (!sub || !HT.state.subjectResults[sub]) {
            alert('没有数据可下载，请先处理。');
            return;
        }
        // 跟随当前排序（与页面表格保持一致）
        const data = global.Utils.sortStudentRows(HT.state.subjectResults[sub], HT.state.currentSortField);
        const exportArr = data.map(r => ({
            '学号': r.id,
            '姓名': r.name || '',
            '班级号': r.class || '',
            '第一次原始分': r.raw1,
            '第一次名次': r.rank1,
            '第一次百分等级': r.percentile1,
            '第一次标准分': r.std1,
            '第一次分层名次': r.layer1,
            '第二次原始分': r.raw2,
            '第二次名次': r.rank2,
            '第二次百分等级': r.percentile2,
            '第二次标准分': r.std2,
            '第二次分层名次': r.layer2,
            '预测成绩': r.predicted2,
            '进步分（残差）': r.residual,
            '残差标准差': r.residualStd,
            '个人T值': r.tValue,
            '超两标': r.overTwo,
            '超一标': r.overOne,
            '退一标': r.belowOne,
            '退两标': r.belowTwo
        }));
        const ws = XLSX.utils.json_to_sheet(exportArr);
        const colWidths = [];
        for (let key in exportArr[0]) {
            colWidths.push({ wch: Math.max(key.length * 1.2, 12) });
        }
        ws['!cols'] = colWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sub);
        const sortLabelMap = { id: '按学号', rank2: '按第二次名次', tValue: '按个人T值' };
        const sortLabel = sortLabelMap[HT.state.currentSortField] || '默认排序';
        const fileName = `增值分析_${sub}_${sortLabel}.xlsx`;
        XLSX.writeFile(wb, fileName);
        HT.log(`📥 下载成功：${fileName}`, 'ok');
    }

    // ---- 对外暴露 ----
    global.UI = {
        autoFillLayerSuggestion,
        updateFileStatus,
        initSortButtons,
        renderStudentTable,
        drawRegressionForSubject,
        switchView,
        buildSubjectButtons,
        switchSubject,
        confirmMissingData,
        downloadCurrentSubjectExcel
    };

})(window);
