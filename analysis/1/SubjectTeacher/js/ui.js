/* ============================================================
   js/ui.js —— 界面渲染模块
   负责所有与 DOM 展示相关的逻辑：表格渲染（重点列着色）、
   散点图绘制、视图切换、弹窗渲染、文件状态等。
   通过全局命名空间 ST（state + el）读写共享数据。
   ============================================================ */
(function (global) {
    'use strict';

    const ST = global.ST;

    // ---- 自动填充建议层数 ----
    function autoFillLayerSuggestion() {
        if (ST.state.file1Data && ST.state.file2Data) {
            const n = Math.min(ST.state.file1Data.length, ST.state.file2Data.length);
            if (n > 0) {
                const log2 = (x) => Math.log2(x);
                const val = 2 * log2(n) - log2(100);
                let suggested = Math.round(val);
                if (suggested < 2) suggested = 2;
                ST.el.suggestLayer.textContent = suggested;
                if (!ST.el.layerInput.dataset.userChanged || ST.el.layerInput.dataset.userChanged === 'false') {
                    ST.el.layerInput.value = suggested;
                }
            }
        }
    }

    // ---- 更新文件状态 ----
    function updateFileStatus() {
        if (ST.state.file1Data) {
            ST.el.status1.textContent = ST.state.file1Name + ' (' + ST.state.file1Data.length + ' 行)';
            ST.el.drop1.classList.add('has-file');
        } else {
            ST.el.status1.textContent = '未选择文件';
            ST.el.drop1.classList.remove('has-file');
        }
        if (ST.state.file2Data) {
            ST.el.status2.textContent = ST.state.file2Name + ' (' + ST.state.file2Data.length + ' 行)';
            ST.el.drop2.classList.add('has-file');
        } else {
            ST.el.status2.textContent = '未选择文件';
            ST.el.drop2.classList.remove('has-file');
        }
        ST.el.processBtn.disabled = !(ST.state.file1Data && ST.state.file2Data);
        if (!ST.state.file1Data || !ST.state.file2Data) {
            ST.el.stateLabel.textContent = '数据待分析';
            ST.el.stateLabel.style.color = '#6c757d';
        } else {
            ST.el.stateLabel.innerHTML = ST.CHECK_ICON + ' 已就绪';
            ST.el.stateLabel.style.color = '#28a745';
            autoFillLayerSuggestion();
        }
    }

    // ---- 生成排序按钮并绑定事件 ----
    function initSortButtons() {
        const btns = ST.el.sortButtonsContainer.querySelectorAll('.btn-sm');
        btns.forEach(btn => {
            btn.addEventListener('click', function() {
                const sort = this.dataset.sort;
                if (sort !== ST.state.currentSortField) {
                    btns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    ST.state.currentSortField = sort;
                    if (ST.state.resultData.length > 0) {
                        renderTable(ST.state.currentSortField);
                    }
                }
            });
        });
    }

    // ---- 渲染学生表格（重点列着色） ----
    function renderTable(sortField = 'id') {
        if (ST.state.resultData.length === 0) return;

        // 排序
        const sorted = global.Utils.sortStudentRows([...ST.state.resultData], sortField);

        // 截取前50
        let displayData = sorted;
        let previewMsg = '';
        if (sorted.length > 50) {
            displayData = sorted.slice(0, 50);
            previewMsg = `（仅显示前50名，共${sorted.length}人）`;
        } else {
            previewMsg = `（共${sorted.length}人）`;
        }
        ST.el.previewNote.textContent = previewMsg;

        // 科目名称用于列头
        const subjectLabel = ST.state.subjectName || '成绩';

        // 构建表头
        const headers = [
            { key: 'id', label: '学号', cls: 'col-id' },
            { key: 'name', label: '姓名', cls: 'col-name' },
            { key: 'class', label: '班级号', cls: 'col-class' },
            { key: 'raw1', label: '第一次' + subjectLabel, cls: 'col-raw' },
            { key: 'rank1', label: '第一次名次', cls: 'col-rank' },
            { key: 'percentile1', label: '第一次百分等级', cls: 'col-percentile' },
            { key: 'std1', label: '第一次标准分', cls: 'col-std' },
            { key: 'layer1', label: '第一次分层名次', cls: 'col-layer' },
            { key: 'raw2', label: '第二次' + subjectLabel, cls: 'col-raw' },
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
        ST.el.resultHead.innerHTML = theadHtml;

        // 填充数据（重点列着色：T值 >0 绿 / <0 红；超两标、超一标绿；退一标、退两标红）
        const tbody = ST.el.resultBody;
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
        const sortBtns = ST.el.sortButtonsContainer.querySelectorAll('.btn-sm');
        sortBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === sortField);
        });
        ST.state.currentSortField = sortField;
    }

    // ---- 绘制回归散点图（分层点按高低回归线着色，黑色虚线回归线） ----
    function drawRegression() {
        const data = ST.state.resultData;
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
            ST.state.plotData = null;
            ST.el.regressionArea.style.display = 'none';
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
            title: `第一次标准分均值 vs 第二次标准分均值（${ST.state.subjectName || '成绩'}）`,
            xaxis: { title: '第一次标准分均值' },
            yaxis: { title: '第二次标准分均值' },
            hovermode: 'closest',
            margin: { l: 60, r: 40, t: 50, b: 60 },
            annotations: annotations
        };
        const config = { responsive: true, displayModeBar: true };
        Plotly.newPlot(ST.el.scatterPlot, allTraces, layout, config);
        ST.state.plotData = { data: allTraces, layout, config };
        const formulaText = `y = ${intercept.toFixed(4)} + ${slope.toFixed(4)} · x`;
        ST.el.regressionFormula.innerHTML = `<code>经验回归方程：${formulaText}</code>`;
        ST.el.downloadPlotBtn.onclick = function() {
            if (ST.state.plotData) {
                Plotly.downloadImage(ST.el.scatterPlot, { format: 'png', filename: `回归散点图_${ST.state.subjectName || '成绩'}` });
            }
        };
    }

    // ---- 视图切换卡片 ----
    function switchView(view) {
        ST.el.resultArea.style.display = view === 'result' ? 'block' : 'none';
        ST.el.regressionArea.style.display = view === 'regression' ? 'block' : 'none';
        document.querySelectorAll('#viewCards .view-card').forEach(card => {
            card.classList.toggle('active', card.dataset.view === view);
        });
        ST.state.currentView = view;
        // 切到回归视图时在可见容器中重绘，避免隐藏容器导致图表尺寸异常
        if (view === 'regression' && ST.state.resultData.length > 0) {
            drawRegression();
        }
    }

    // ---- 缺失数据提醒弹窗（返回 Promise，用户确认后 resolve） ----
    function confirmMissingData(validCount, missingList) {
        return new Promise((resolve) => {
            ST.el.missingValidCount.textContent = validCount;
            ST.el.missingListBody.innerHTML = '';
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
                ST.el.missingListBody.appendChild(tr);
            });
            ST.el.missingModal.style.display = 'flex';
            let settled = false;
            const done = (val) => {
                if (settled) return;
                settled = true;
                ST.el.missingModal.style.display = 'none';
                resolve(val);
            };
            ST.el.missingContinueBtn.onclick = () => done(true);
            ST.el.missingCancelBtn.onclick = () => done(false);
        });
    }

    // ---- 下载当前科目数据 ----
    function downloadData() {
        if (ST.state.resultData.length === 0) {
            alert('没有数据可下载，请先处理。');
            return;
        }
        const exportArr = ST.state.resultData.map(r => ({
            '学号': r.id,
            '姓名': r.name || '',
            '班级号': r.class || '',
            '第一次成绩': r.raw1,
            '第一次名次': r.rank1,
            '第一次百分等级': r.percentile1,
            '第一次标准分': r.std1,
            '第一次分层名次': r.layer1,
            '第二次成绩': r.raw2,
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
        XLSX.utils.book_append_sheet(wb, ws, '增值分析');
        XLSX.writeFile(wb, `增值分析_${ST.state.subjectName}.xlsx`);
        ST.log(`📥 下载成功：增值分析_${ST.state.subjectName}.xlsx`, 'ok');
    }

    // ---- 按四种升降标口径拆分名单（超2标不再计入超1标，退2标不再计入退1标） ----
    function splitFlags(data) {
        const overTwo = [], overOne = [], belowTwo = [], belowOne = [];
        data.forEach(row => {
            if (row.overTwo === 1) overTwo.push(row);
            else if (row.overOne === 1) overOne.push(row);

            if (row.belowTwo === 1) belowTwo.push(row);
            else if (row.belowOne === 1) belowOne.push(row);
        });
        // 表扬类按个人T值由高到低，需分析类按个人T值由低到高
        overTwo.sort((a, b) => b.tValue - a.tValue);
        overOne.sort((a, b) => b.tValue - a.tValue);
        belowTwo.sort((a, b) => a.tValue - b.tValue);
        belowOne.sort((a, b) => a.tValue - b.tValue);
        return { overTwo, overOne, belowTwo, belowOne };
    }

    // ---- 班级显示名 ----
    function toClassLabel(cls) {
        if (!cls || cls === '未填写班级') return cls || '未填写班级';
        return cls.includes('班') ? cls : cls + '班';
    }

    // ---- 生成建议名单表格行（分组名 + 各组学生名单；countOnly 时仅显示人数） ----
    function buildAdviceRow(label, groups, countOnly) {
        const tr = document.createElement('tr');
        if (countOnly) tr.className = 'row-total';

        const tdLabel = document.createElement('td');
        tdLabel.className = 'adv-subject';
        tdLabel.textContent = label;
        tr.appendChild(tdLabel);

        groups.forEach(item => {
            const list = item.list;
            const level = item.level;
            const td = document.createElement('td');
            const wrap = document.createElement('div');
            wrap.className = 'advice-names';
            if (countOnly) {
                const count = document.createElement('span');
                count.className = 'advice-count';
                count.textContent = list.length > 0 ? list.length + ' 人' : '—';
                wrap.appendChild(count);
            } else if (list.length === 0) {
                const none = document.createElement('span');
                none.className = 'none';
                none.textContent = '—';
                wrap.appendChild(none);
            } else {
                list.forEach(row => {
                    const chip = document.createElement('span');
                    chip.className = 'advice-name' + (level ? ' ' + level : '');
                    chip.textContent = row.name || row.id;
                    chip.title = '学号：' + row.id + '　班级：' + (row.class || '—') + '　个人T值：' + row.tValue.toFixed(3);
                    wrap.appendChild(chip);
                });
                const count = document.createElement('span');
                count.className = 'advice-count';
                count.textContent = '共' + list.length + '人';
                wrap.appendChild(count);
            }
            td.appendChild(wrap);
            tr.appendChild(td);
        });
        return tr;
    }

    // ---- 渲染增值评价建议名单（当前科目，按班级汇总） ----
    function renderAdvicePanel() {
        if (!ST.el.advicePanel) return;
        const data = ST.state.resultData || [];
        const praiseBody = ST.el.advicePraiseBody;
        const analyzeBody = ST.el.adviceAnalyzeBody;
        if (data.length === 0) {
            ST.el.advicePanel.style.display = 'none';
            praiseBody.innerHTML = '';
            analyzeBody.innerHTML = '';
            ST.el.adviceScope.textContent = '';
            return;
        }

        // 按班级分组（数字班级优先按大小排序）
        const classMap = new Map();
        data.forEach(row => {
            const key = (row.class === undefined || row.class === null || row.class === '') ? '未填写班级' : String(row.class);
            if (!classMap.has(key)) classMap.set(key, []);
            classMap.get(key).push(row);
        });
        const classes = Array.from(classMap.keys()).sort((a, b) => {
            const na = parseFloat(a), nb = parseFloat(b);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return a.localeCompare(b, undefined, { numeric: true });
        });

        praiseBody.innerHTML = '';
        analyzeBody.innerHTML = '';

        const total = { overTwo: [], overOne: [], belowTwo: [], belowOne: [] };
        classes.forEach(cls => {
            const g = splitFlags(classMap.get(cls));
            total.overTwo.push(...g.overTwo);
            total.overOne.push(...g.overOne);
            total.belowTwo.push(...g.belowTwo);
            total.belowOne.push(...g.belowOne);

            praiseBody.appendChild(buildAdviceRow(toClassLabel(cls), [
                { list: g.overTwo, level: 'lv2' },
                { list: g.overOne, level: '' }
            ]));
            analyzeBody.appendChild(buildAdviceRow(toClassLabel(cls), [
                { list: g.belowTwo, level: 'lv2' },
                { list: g.belowOne, level: '' }
            ]));
        });

        // 多个班级时，追加仅显示人数的合计行
        if (classes.length > 1) {
            praiseBody.appendChild(buildAdviceRow('合计', [
                { list: total.overTwo, level: '' },
                { list: total.overOne, level: '' }
            ], true));
            analyzeBody.appendChild(buildAdviceRow('合计', [
                { list: total.belowTwo, level: '' },
                { list: total.belowOne, level: '' }
            ], true));
        }

        const subject = ST.state.subjectName || '本学科';
        ST.el.adviceScope.textContent = `学科：${subject} ｜ 班级：${classes.length} 个 ｜ 共 ${data.length} 人`;
        ST.el.advicePanel.style.display = 'block';
    }

    // ---- 对外暴露 ----
    global.UI = {
        autoFillLayerSuggestion,
        updateFileStatus,
        initSortButtons,
        renderTable,
        renderAdvicePanel,
        drawRegression,
        switchView,
        confirmMissingData,
        downloadData
    };

})(window);
