/**
 * render.js —— 结果渲染
 * 标签切换、达标线选择、班级筛选、明细表、班级汇总表
 */
(function (App) {
    const E = App.elements;
    const S = App.state;

    // 全校图标（学校建筑）
    const ALL_ICON = `<svg viewBox="0 0 1027 1024" xmlns="http://www.w3.org/2000/svg" style="width:1em;height:1em;vertical-align:-0.15em;flex-shrink:0;">` +
        `<path d="M949.5194 349.777355l-64.954013-106.091553a33.884343 33.884343 0 0 0-26.198118-14.72291H151.559361a29.662332 29.662332 0 0 0-24.574267 15.588963l-49.256793 105.2255" fill="#B9E3ED"/>` +
        `<path d="M77.620044 376.625013a24.790781 24.790781 0 0 1-10.825668-2.489904A25.873348 25.873348 0 0 1 54.128343 339.709483l49.256793-105.225499a61.706311 61.706311 0 0 1 51.854953-30.528386h699.338196a68.201713 68.201713 0 0 1 52.504493 27.172428l64.954012 106.091553a25.873348 25.873348 0 1 1-44.168728 26.955915l-64.954012-106.091553a12.882546 12.882546 0 0 0-4.546781-2.381647H151.559361s-1.082567 0.866053-1.515593 1.407337l-48.932023 104.575959a25.873348 25.873348 0 0 1-23.491701 14.939423z" fill="#324654"/>` +
        `<path d="M500.687176 289.370124V87.90443" fill="#B9E3ED"/>` +
        `<path d="M500.687176 315.243472a25.873348 25.873348 0 0 1-25.873348-25.873348V87.90443a25.873348 25.873348 0 1 1 51.746696 0v201.465694a25.873348 25.873348 0 0 1-25.873348 25.873348z" fill="#324654"/>` +
        `<path d="M500.687176 25.873348h44.060472c21.651337 0 51.530183 32.477006 95.590654 32.477006s58.891638-11.799979 58.891638-11.799979v109.014484s-14.722909 13.856856-58.891638 13.856856-88.2292-41.570568-102.952109-41.570568h-36.699017z" fill="#B9E3ED"/>` +
        `<path d="M640.338302 194.862036c-35.075167 0-66.686119-18.836663-89.636536-32.477006-5.412834-3.139444-12.449519-7.361455-15.913733-8.985305h-34.100857a25.873348 25.873348 0 0 1-25.873348-25.873348V25.873348A25.873348 25.873348 0 0 1 500.687176 0h44.060472a94.075061 94.075061 0 0 1 44.060471 15.264193A109.880537 109.880537 0 0 0 640.338302 32.477006a101.869542 101.869542 0 0 0 43.302675-6.711915A23.599958 23.599958 0 0 1 710.163865 21.651337 26.414632 26.414632 0 0 1 725.319801 46.658632v108.906227a25.765091 25.765091 0 0 1-8.119251 18.836663c-5.412834 4.871551-26.306375 20.460514-76.862248 20.460514zM526.560524 101.977799h10.825669c12.557776 0 24.032984 6.820171 39.838461 16.238503 17.862353 10.825669 42.328365 25.332065 63.113648 25.332065a114.102548 114.102548 0 0 0 33.01829-4.005498V82.058569a219.219791 219.219791 0 0 1-33.01829 2.27339 156.539169 156.539169 0 0 1-75.779681-23.491701 95.915424 95.915424 0 0 0-19.59446-9.093562h-18.403637z" fill="#324654"/>` +
        `<path d="M77.728301 901.236917V349.777355h871.791099v551.459562M949.5194 349.777355v551.459562" fill="#B9E3ED"/>` +
        `<path d="M949.5194 927.110265a25.873348 25.873348 0 0 1-25.873349-25.873348V349.777355a25.873348 25.873348 0 0 1 51.746697 0v551.459562a25.873348 25.873348 0 0 1-25.873348 25.873348z" fill="#324654"/>` +
        `<path d="M77.728301 901.236917V349.777355" fill="#B9E3ED"/>` +
        `<path d="M77.728301 927.110265a25.981605 25.981605 0 0 1-25.981605-25.873348V349.777355a25.981605 25.981605 0 0 1 51.854953 0v551.459562a25.873348 25.873348 0 0 1-25.873348 25.873348z" fill="#324654"/>` +
        `<path d="M949.5194 894.525003h51.854952v103.601649H25.873348v-103.601649h51.854953" fill="#FFFFFF"/>` +
        `<path d="M1001.374352 1024H25.873348A25.873348 25.873348 0 0 1 0 998.126652v-103.601649a25.873348 25.873348 0 0 1 25.873348-25.873348h51.854953a25.873348 25.873348 0 1 1 0 51.746696h-25.981605v51.854953H975.392748V920.181837h-25.873348a25.873348 25.873348 0 1 1 0-51.746696h51.854952a25.873348 25.873348 0 0 1 25.873349 25.873348v103.818163a25.873348 25.873348 0 0 1-25.873349 25.873348z" fill="#324654"/>` +
        `<path d="M958.179934 920.181837H77.728301a17.32107 17.32107 0 1 1 0-34.533883h880.451633a17.32107 17.32107 0 0 1 0 34.533883z" fill="#324654"/>` +
        `<path d="M612.841104 903.185538V726.185855a99.271382 99.271382 0 0 0-99.271382-99.271382 99.379638 99.379638 0 0 0-99.271382 99.271382v176.999683z" fill="#FFFFFF"/>` +
        `<path d="M612.841104 920.181837H414.29834a17.212813 17.212813 0 0 1-17.212813-17.212813V726.185855a116.592452 116.592452 0 0 1 233.076647 0v176.999683a17.32107 17.32107 0 0 1-17.32107 16.996299z m-181.221694-34.317369H595.411777V726.185855a82.058569 82.058569 0 0 0-164.00888 0z" fill="#324654"/>` +
        `<path d="M181.221694 445.692779H319.357226v138.135533H181.221694z" fill="#FFFFFF"/>` +
        `<path d="M319.357226 601.041125H181.221694a17.212813 17.212813 0 0 1-17.212814-17.212813V445.692779a17.32107 17.32107 0 0 1 17.212814-17.32107H319.357226a17.32107 17.32107 0 0 1 17.32107 17.32107v138.135533a17.32107 17.32107 0 0 1-17.32107 17.212813z m-120.814462-34.533883h103.601649v-103.601649h-103.601649z" fill="#324654"/>` +
        `<path d="M181.221694 670.108891H319.357226v138.135532H181.221694z" fill="#FFFFFF"/>` +
        `<path d="M319.357226 825.457236H181.221694a17.212813 17.212813 0 0 1-17.212814-17.212813V670.108891a17.212813 17.212813 0 0 1 17.212814-17.212813H319.357226a17.32107 17.32107 0 0 1 17.32107 17.212813v138.135532a17.32107 17.32107 0 0 1-17.32107 17.212813z m-120.814462-34.533883h103.601649V687.429961h-103.601649z" fill="#324654"/>` +
        `<path d="M707.782218 445.692779h138.135532v138.135533H707.782218z" fill="#FFFFFF"/>` +
        `<path d="M845.91775 601.041125H707.782218a17.212813 17.212813 0 0 1-17.212813-17.212813V445.692779a17.32107 17.32107 0 0 1 17.212813-17.32107h138.135532a17.32107 17.32107 0 0 1 17.32107 17.32107v138.135533a17.32107 17.32107 0 0 1-17.32107 17.212813zM725.319801 566.507242h103.601649v-103.601649H725.319801z" fill="#324654"/>` +
        `<path d="M707.782218 670.108891h138.135532v138.135532H707.782218z" fill="#FFFFFF"/>` +
        `<path d="M845.91775 825.457236H707.782218a17.212813 17.212813 0 0 1-17.212813-17.212813V670.108891a17.212813 17.212813 0 0 1 17.212813-17.212813h138.135532a17.32107 17.32107 0 0 1 17.32107 17.212813v138.135532a17.32107 17.32107 0 0 1-17.32107 17.212813zM725.319801 790.923353h103.601649V687.429961H725.319801z" fill="#324654"/>` +
        `<path d="M513.569722 493.109208m-82.058569 0a82.058569 82.058569 0 1 0 164.117138 0 82.058569 82.058569 0 1 0-164.117138 0Z" fill="#FFFFFF"/>` +
        `<path d="M513.569722 592.38059a99.271382 99.271382 0 1 1 99.271382-99.271382 99.379638 99.379638 0 0 1-99.271382 99.271382z m0-164.008881a64.954012 64.954012 0 1 0 64.954012 64.954013 64.954012 64.954012 0 0 0-64.954012-64.954013z" fill="#324654"/>` +
        `<path d="M509.347711 462.905593v34.533883h34.425627" fill="#FFFFFF"/>` +
        `<path d="M543.773338 506.100011h-34.425627a8.660535 8.660535 0 0 1-8.660535-8.660535v-34.533883a8.660535 8.660535 0 0 1 17.212813 0v25.981604h25.873349a8.552278 8.552278 0 0 1 8.119252 8.660535 8.660535 8.660535 0 0 1-8.335764 8.119252z" fill="#324654"/>` +
        `<path d="M932.306586 375.650703H77.728301a17.32107 17.32107 0 1 1 0-34.533883h854.578285a17.32107 17.32107 0 0 1 0 34.533883z" fill="#324654"/>` +
        `</svg>`;

    // 切换明细/汇总标签
    function switchTab(tab) {
        S.activeTab = tab;
        E.tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        E.detailPanel.style.display = tab === 'detail' ? 'flex' : 'none';
        E.summaryPanel.style.display = tab === 'summary' ? 'flex' : 'none';
        if (tab === 'summary') {
            const hasData = S.processedResults.length > 0 && S.activeLineIndex < S.processedResults.length;
            E.summaryDownloadArea.style.display = hasData ? 'block' : 'none';
            E.emptyStateSummary.style.display = hasData ? 'none' : 'flex';
            E.summaryTable.style.display = hasData ? 'table' : 'none';
            renderSummaryTable();
        } else {
            E.summaryDownloadArea.style.display = 'none';
        }
    }

    // 渲染达标线切换按钮
    function renderLineSelector() {
        E.lineSelectorBar.innerHTML = '';
        S.processedResults.forEach((res, idx) => {
            const btn = document.createElement('button');
            btn.className = 'line-select-btn';
            btn.textContent = res.lineName;
            btn.addEventListener('click', () => selectLine(idx));
            E.lineSelectorBar.appendChild(btn);
        });
        E.lineSelectorBar.style.display = 'flex';
    }

    // 选中某条达标线
    function selectLine(idx) {
        S.activeLineIndex = idx;
        E.lineSelectorBar.querySelectorAll('.line-select-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
        S.selectedClass = 'all';
        renderClassFilter();
        if (S.activeTab === 'detail') renderDetailTable();
        else renderSummaryTable();
    }

    // 渲染班级筛选按钮
    function renderClassFilter() {
        if (!S.processedResults.length || S.activeLineIndex >= S.processedResults.length) return;
        const data = S.processedResults[S.activeLineIndex];
        const classes = [...data.classSummary.keys()];
        E.classFilterBar.innerHTML = `<button class="class-filter-btn active" data-cls="all">${ALL_ICON} 全校</button>`;
        classes.forEach(cls => {
            const btn = document.createElement('button');
            btn.className = 'class-filter-btn';
            btn.dataset.cls = cls;
            btn.textContent = cls;
            E.classFilterBar.appendChild(btn);
        });
        E.classFilterBar.style.display = 'flex';
        E.classFilterBar.querySelectorAll('.class-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                E.classFilterBar.querySelectorAll('.class-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                S.selectedClass = btn.dataset.cls;
                renderDetailTable();
            });
        });
    }

    // 渲染预测明细表
    function renderDetailTable() {
        if (!S.processedResults.length || S.activeLineIndex >= S.processedResults.length) return;
        E.emptyStateDetail.style.display = 'none';
        E.resultTable.style.display = 'table';
        const data = S.processedResults[S.activeLineIndex];
        const isPred = S.currentMode === 'prediction';
        const headers = isPred ? ['学号', '姓名', '班级', '成绩', '原始分名次', '预测上线概率'] : ['学号', '姓名', '班级', '本次成绩', '本次名次', '参考成绩', '参考名次', '预测上线概率'];
        let rows = data.rows;
        if (S.selectedClass !== 'all') rows = rows.filter(r => r.班级 === S.selectedClass);
        rows = [...rows].sort((a, b) => b.预测上线概率 - a.预测上线概率);
        // 全校：仅显示概率前 100 名学生
        if (S.selectedClass === 'all') rows = rows.slice(0, 100);
        E.resultTableHead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
        E.resultTableBody.innerHTML = '';
        rows.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(h => {
                const td = document.createElement('td');
                if (h === '预测上线概率') {
                    td.textContent = (row['预测上线概率'] * 100).toFixed(2) + '%';
                    const p = row['预测上线概率'];
                    if (p >= 0.6) td.classList.add('prob-high');
                    else if (p >= 0.25) td.classList.add('prob-mid');
                    else if (p > 0) td.classList.add('prob-low');
                } else if (h.includes('名次')) {
                    td.textContent = row[h].toFixed(1);
                } else if (h.includes('成绩')) {
                    td.textContent = row[h].toFixed(2);
                } else {
                    td.textContent = row[h] !== undefined ? row[h] : '';
                }
                tr.appendChild(td);
            });
            E.resultTableBody.appendChild(tr);
        });
        E.resultMeta.textContent = `${data.lineName} | 上线${data.target}人 | 范围${data.params.range} | A:${data.params.A} B:${data.params.B}`;
    }

    // 渲染班级汇总表
    function renderSummaryTable() {
        if (!S.processedResults.length || S.activeLineIndex >= S.processedResults.length) {
            E.summaryDownloadArea.style.display = 'none';
            E.summaryTable.style.display = 'none';
            E.emptyStateSummary.style.display = 'flex';
            return;
        }
        const data = S.processedResults[S.activeLineIndex];
        const isPred = S.currentMode === 'prediction';
        E.emptyStateSummary.style.display = 'none';
        E.summaryTable.style.display = 'table';

        let headerHTML = '<tr><th>班级</th><th>人数</th><th>预测上线达标人数</th>';
        if (!isPred) {
            headerHTML += '<th>上线人数</th>';
            headerHTML += `<th><button class="sort-btn${S.sortByIncrement ? ' sort-active' : ''}" id="sortIncrementBtn">增量 ↑</button></th>`;
        }
        headerHTML += '</tr>';
        E.summaryTableHead.innerHTML = headerHTML;

        const entries = [...data.classSummary.entries()];
        // 默认按班级自然排序，增量排序时按增量降序
        if (isPred) {
            App.util.sortClassEntries(entries);
        } else {
            if (S.sortByIncrement) {
                entries.sort((a, b) => (b[1].qualified - b[1].totalProb) - (a[1].qualified - a[1].totalProb));
            } else {
                App.util.sortClassEntries(entries);
            }
        }

        E.summaryTableBody.innerHTML = '';
        let totalPred = 0, totalQual = 0;
        entries.forEach(([cls, info]) => {
            totalPred += info.totalProb;
            const tr = document.createElement('tr');
            if (isPred) {
                tr.innerHTML = `<td>${cls}</td><td>${info.count}</td><td>${info.totalProb.toFixed(2)}</td>`;
            } else {
                totalQual += info.qualified;
                const inc = info.qualified - info.totalProb;
                const clsName = inc > 0 ? 'increment-positive' : inc < 0 ? 'increment-negative' : '';
                tr.innerHTML = `<td>${cls}</td><td>${info.count}</td><td>${info.totalProb.toFixed(2)}</td><td>${info.qualified}</td><td class="${clsName}">${inc > 0 ? '+' : ''}${inc.toFixed(2)}</td>`;
            }
            E.summaryTableBody.appendChild(tr);
        });
        const totalRow = document.createElement('tr');
        totalRow.classList.add('total-row');
        if (isPred) {
            totalRow.innerHTML = `<td>合计</td><td>${data.rows.length}</td><td>${totalPred.toFixed(2)}</td>`;
        } else {
            const totalInc = totalQual - totalPred;
            const clsName = totalInc > 0 ? 'increment-positive' : totalInc < 0 ? 'increment-negative' : '';
            totalRow.innerHTML = `<td>合计</td><td>${data.rows.length}</td><td>${totalPred.toFixed(2)}</td><td>${totalQual}</td><td class="${clsName}">${totalInc > 0 ? '+' : ''}${totalInc.toFixed(2)}</td>`;
        }
        E.summaryTableBody.appendChild(totalRow);
        E.summaryMeta.textContent = `${data.lineName} | 全校预测上线总人数：${totalPred.toFixed(2)}`;

        if (!isPred) {
            const sortBtn = document.getElementById('sortIncrementBtn');
            if (sortBtn) {
                sortBtn.onclick = (e) => {
                    e.stopPropagation();
                    S.sortByIncrement = !S.sortByIncrement;
                    renderSummaryTable();
                };
            }
        }
    }

    App.render = { switchTab, renderLineSelector, selectLine, renderClassFilter, renderDetailTable, renderSummaryTable };
})(window.App = window.App || {});
