/* ============================================================
 * 班主任通用成绩分析系统 - 表格与班级看板模块 (tables.js)
 * 多次（2~6 次）对比表格渲染、统计、排序搜索、
 * Excel 导出，以及“班级整体分析”看板（均分/及格率/优秀率、
 * 分数段分布图、各科平均分对比图）。
 * ============================================================ */
(function (App) {
    'use strict';

    const S = App.state;
    const { formatNumber, escapeHtml, calcProgress, calcGapWithTotalRank, showToast } = App.utils;
    const { getSubjectIndex, getSubjectData, getLatestIndex, getAllStudents, getFullScore } = App.stateApi;

    // 看板图表实例（重绘前销毁）
    let dashChartDist = null;
    let dashChartSubj = null;
    const COLORS = ['#4f6ef7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#e74c3c'];

    /* ---------------- 数据视图 ---------------- */

    function getViewData() {
        const latest = getLatestIndex();
        const prev = Math.max(0, latest - 1);
        const subjIdx = getSubjectIndex(S.currentSubject);
        const totalIdx = getSubjectIndex('总分');
        return getAllStudents().map(name => {
            const prevStu = S.exams[prev] && S.exams[prev].get(name);
            const latestStu = S.exams[latest] && S.exams[latest].get(name);
            const readScore = (stu) => stu ? (stu.scores[subjIdx] != null ? stu.scores[subjIdx] : null) : null;
            const readRank = (stu) => stu ? (stu.ranks[subjIdx] != null ? stu.ranks[subjIdx] : null) : null;
            const prevScore = readScore(prevStu);
            const prevRank = readRank(prevStu);
            const lastScore = readScore(latestStu);
            const lastRank = readRank(latestStu);
            // 第二列：最新一次考试的总分及总分年级排名（始终取总分索引）
            const totalScoreLatest = latestStu ? latestStu.scores[totalIdx] ?? null : null;
            const totalRankLatest = latestStu ? latestStu.ranks[totalIdx] ?? null : null;
            // 进退步：上一次 → 最新一次
            const progress = calcProgress(prevRank, lastRank);
            const gapWithTotal = calcGapWithTotalRank(lastRank, totalRankLatest, S.currentSubject);
            return { name, prevScore, prevRank, lastScore, lastRank, totalScoreLatest, totalRankLatest, progress, gapWithTotal };
        });
    }

    function sortData(data) {
        if (S.currentSort === 'totalRank') data.sort((a, b) => (a.totalRankLatest ?? 99999) - (b.totalRankLatest ?? 99999));
        else if (S.currentSort === 'progress') data.sort((a, b) => (b.progress ?? -99999) - (a.progress ?? -99999));
        else data.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
        return data;
    }

    /* ---------------- 表格渲染 ---------------- */

    function renderTable() {
        let data = getViewData();
        data = sortData(data);
        const filtered = S.searchQuery.trim() ? data.filter(d => d.name.includes(S.searchQuery.trim())) : data;
        document.getElementById('resultCount').textContent = `共 ${filtered.length} 条`;
        const thead = document.querySelector('#mainTable thead'),
            tbody = document.querySelector('#mainTable tbody');
        const isTotal = S.currentSubject === '总分';
        let h = '<tr><th>姓名</th><th>最新总分<br>(年级排名)</th><th>上一次<br>(分数/排名)</th><th>最新一次<br>(分数/排名)</th><th>进退步<br>(正=进步)</th>';
        if (!isTotal) h += '<th>单科与总分<br>排名差距</th>';
        h += '</tr>';
        thead.innerHTML = h;
        let body = '';
        for (const d of filtered) {
            const totalDisplay = (d.totalScoreLatest != null && d.totalRankLatest != null) ?
                `${formatNumber(d.totalScoreLatest)} (${d.totalRankLatest})` : '--';
            const pc = d.progress == null ? 'progress-zero' : (d.progress > 0 ? 'progress-positive' : 'progress-negative');
            const ps = d.progress == null ? '--' : (d.progress > 0 ? `+${d.progress}` : `${d.progress}`);
            const badge = d.progress == null ? '' : (d.progress > 0 ? '<span class="badge badge-up">↑</span>' :
                d.progress < 0 ? '<span class="badge badge-down">↓</span>' : '<span class="badge badge-neutral">→</span>');
            body +=
                `<tr><td><span class="name-cell" data-name="${escapeHtml(d.name)}">${escapeHtml(d.name)}</span></td><td><strong>${totalDisplay}</strong></td>`;
            body += `<td>${d.prevScore != null ? formatNumber(d.prevScore) : '--'}${d.prevRank != null ? ' (' + d.prevRank + ')' : ''}</td>`;
            body += `<td>${d.lastScore != null ? formatNumber(d.lastScore) : '--'}${d.lastRank != null ? ' (' + d.lastRank + ')' : ''}</td>`;
            body += `<td class="${pc}">${ps} ${badge}</td>`;
            if (!isTotal) {
                const gc = d.gapWithTotal == null ? '' : (d.gapWithTotal > 0 ? 'gap-advantage' : 'gap-disadvantage');
                const gs = d.gapWithTotal == null ? '--' : (d.gapWithTotal > 0 ? `+${d.gapWithTotal}` : `${d.gapWithTotal}`);
                body += `<td class="${gc}">${gs}</td>`;
            }
            body += '</tr>';
        }
        if (!filtered.length) body += '<tr><td colspan="' + (5 + (isTotal ? 0 : 1)) +
            '" style="padding:30px;color:#999;">无匹配学生</td></tr>';
        tbody.innerHTML = body;
        updateStats(filtered);
    }

    /** 更新统计卡片（主统计基于当前筛选，趋势统计基于全班） */
    function updateStats(filtered) {
        const data = filtered || getViewData().filter(d => S.searchQuery.trim() ? d.name.includes(S.searchQuery.trim()) : true);
        const valid = data.filter(d => d.progress != null);
        document.getElementById('statTotal').textContent = data.length;
        if (valid.length) {
            const maxP = Math.max(...valid.map(d => d.progress)),
                minP = Math.min(...valid.map(d => d.progress));
            document.getElementById('statBestProgress').textContent = maxP > 0 ? `+${maxP}` : `${maxP}`;
            document.getElementById('statWorstRegress').textContent = minP < 0 ? `${minP}` : (minP >= 0 ? `+${minP}` : `${minP}`);
            document.getElementById('statAvgProgress').textContent = Math.round(valid.reduce((s, d) => s + d.progress, 0) / valid.length);
        } else {
            document.getElementById('statBestProgress').textContent = '--';
            document.getElementById('statWorstRegress').textContent = '--';
            document.getElementById('statAvgProgress').textContent = '--';
        }
        // 全班趋势统计（随当前学科联动）：持续进步 / 持续退步 / 明显波动
        let improve = 0,
            decline = 0,
            fluctuate = 0;
        const trendIdx = getSubjectIndex(S.currentSubject);
        for (const name of getAllStudents()) {
            const ranks = [];
            for (let i = 0; i < S.nExams; i++) {
                const stu = S.exams[i] && S.exams[i].get(name);
                ranks.push(stu ? stu.ranks[trendIdx] : null);
            }
            if (ranks.every(r => r != null)) {
                const diffs = [];
                for (let i = 1; i < ranks.length; i++) diffs.push(ranks[i - 1] - ranks[i]);
                const strictlyUp = diffs.every(d => d > 0),
                    strictlyDown = diffs.every(d => d < 0);
                if (strictlyUp) improve++;
                else if (strictlyDown) decline++;
                if (Math.max(...diffs.map(d => Math.abs(d))) > 20) fluctuate++;
            }
        }
        document.getElementById('statImproveCount').textContent = improve;
        document.getElementById('statDeclineCount').textContent = decline;
        document.getElementById('statFluctuateCount').textContent = fluctuate;
    }

    /* ---------------- Excel 下载 ---------------- */

    function downloadCurrentData() {
        if (!S.analysisStarted) { showToast('请先完成分析'); return; }
        const data = getViewData();
        const isTotal = S.currentSubject === '总分';
        const exportRows = [];
        const headerRow = ['姓名', '最新总分', '最新总分年级排名', '上一次分数', '上一次排名', '最新一次分数', '最新一次排名', '进退步名次(正=进步)'];
        if (!isTotal) headerRow.push('单科排名与总分排名差距');
        exportRows.push(headerRow);
        for (const d of data) {
            const row = [
                d.name,
                d.totalScoreLatest != null ? d.totalScoreLatest : '',
                d.totalRankLatest != null ? d.totalRankLatest : '',
                d.prevScore != null ? d.prevScore : '',
                d.prevRank != null ? d.prevRank : '',
                d.lastScore != null ? d.lastScore : '',
                d.lastRank != null ? d.lastRank : '',
                d.progress != null ? d.progress : ''
            ];
            if (!isTotal) row.push(d.gapWithTotal != null ? d.gapWithTotal : '');
            exportRows.push(row);
        }
        const ws = XLSX.utils.aoa_to_sheet(exportRows);
        ws['!cols'] = headerRow.map(() => ({ wch: 16 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '成绩分析数据');
        const now = new Date();
        const filename = `成绩分析数据_${S.currentSubject}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`;
        XLSX.writeFile(wb, filename);
        showToast('📥 数据已下载：' + filename);
    }

    /* ---------------- 班级整体看板 ---------------- */

    /** 计算某学科（含总分）最新一次考试的班级统计 */
    function computeClassStats(subject) {
        const latest = getLatestIndex();
        const idx = getSubjectIndex(subject);
        const exam = S.exams[latest];
        const scores = [];
        if (exam) exam.forEach(stu => { if (stu && stu.scores[idx] != null) scores.push(stu.scores[idx]); });
        if (!scores.length) return null;
        const maxScore = Math.max(...scores);
        const full = getFullScore(subject) || maxScore;
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const pass = scores.filter(s => s >= full * 0.6).length / scores.length;
        const excel = scores.filter(s => s >= full * 0.85).length / scores.length;
        // 与上次考试的均分差
        let prevAvg = null;
        if (latest > 0) {
            const prevExam = S.exams[latest - 1];
            const prevScores = [];
            if (prevExam) prevExam.forEach(stu => { if (stu && stu.scores[idx] != null) prevScores.push(stu.scores[idx]); });
            if (prevScores.length) prevAvg = prevScores.reduce((a, b) => a + b, 0) / prevScores.length;
        }
        return {
            count: scores.length,
            maxScore,
            avg,
            passRate: pass,
            excellentRate: excel,
            prevAvg,
            delta: prevAvg != null ? avg - prevAvg : null,
            distribution: (() => {
                const bins = [0, 0, 0, 0, 0]; // 0-60 60-70 70-80 80-90 90-100 (占满分比例)
                for (const s of scores) {
                    const ratio = full > 0 ? s / full : 0;
                    if (ratio < 0.6) bins[0]++;
                    else if (ratio < 0.7) bins[1]++;
                    else if (ratio < 0.8) bins[2]++;
                    else if (ratio < 0.9) bins[3]++;
                    else bins[4]++;
                }
                return bins;
            })()
        };
    }

    /** 各科（含总分）最新一次考试平均分 */
    function computeSubjectAverages() {
        const latest = getLatestIndex();
        const exam = S.exams[latest];
        const result = [];
        for (let i = 0; i <= S.subjects.length; i++) {
            const label = i === S.subjects.length ? '总分' : S.subjects[i];
            const scores = [];
            if (exam) exam.forEach(stu => { if (stu && stu.scores[i] != null) scores.push(stu.scores[i]); });
            result.push({
                label,
                avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : 0
            });
        }
        return result;
    }

    function destroyCharts() {
        if (dashChartDist) { dashChartDist.destroy(); dashChartDist = null; }
        if (dashChartSubj) { dashChartSubj.destroy(); dashChartSubj = null; }
    }

    /** 渲染班级整体看板（随当前学科联动） */
    function renderDashboard() {
        destroyCharts();
        const st = computeClassStats(S.currentSubject);
        if (!st) return;
        document.getElementById('dashAvg').textContent = formatNumber(Math.round(st.avg * 100) / 100);
        document.getElementById('dashPass').textContent = Math.round(st.passRate * 100) + '%';
        document.getElementById('dashExcellent').textContent = Math.round(st.excellentRate * 100) + '%';
        const deltaEl = document.getElementById('dashDelta');
        if (st.delta != null) {
            deltaEl.textContent = (st.delta >= 0 ? '+' : '') + (Math.round(st.delta * 100) / 100);
            deltaEl.className = 'stat-value ' + (st.delta >= 0 ? 'dash-up' : 'dash-down');
        } else {
            deltaEl.textContent = '--';
            deltaEl.className = 'stat-value';
        }
        document.getElementById('dashSubjectName').textContent = S.currentSubject === '总分' ? '总分' : S.currentSubject;

        // 分数段分布图
        const distCtx = document.getElementById('dashDistChart') && document.getElementById('dashDistChart').getContext('2d');
        if (distCtx) {
            dashChartDist = new Chart(distCtx, {
                type: 'bar',
                data: {
                    labels: ['0-60%', '60-70%', '70-80%', '80-90%', '90-100%'],
                    datasets: [{
                        label: '人数',
                        data: st.distribution,
                        backgroundColor: ['#ef4444', '#f59e0b', '#fbbf24', '#34d399', '#10b981'],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 8 } },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: `${S.currentSubject === '总分' ? '总分' : S.currentSubject} 分数段分布（占满分比例）`, color: '#1e293b', font: { size: 15, weight: 'bold' }, padding: { top: 0, bottom: 4 } },
                        datalabels: {
                            display: true, color: '#1e293b', font: { size: 14, weight: 'bold' },
                            anchor: 'end', align: 'end', offset: 2, formatter: (v) => v
                        }
                    },
                    scales: {
                        x: { ticks: { color: '#1e293b', font: { size: 13 } } },
                        y: { beginAtZero: true, grace: '15%', ticks: { precision: 0, color: '#1e293b', font: { size: 13 } } }
                    }
                }
            });
        }

        // 各科平均分对比图
        const subjCtx = document.getElementById('dashSubjChart') && document.getElementById('dashSubjChart').getContext('2d');
        if (subjCtx) {
            const avgs = computeSubjectAverages();
            dashChartSubj = new Chart(subjCtx, {
                type: 'bar',
                data: {
                    labels: avgs.map(a => a.label),
                    datasets: [{
                        label: '班级平均分',
                        data: avgs.map(a => a.avg),
                        backgroundColor: avgs.map((_, i) => COLORS[i % COLORS.length]),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 8 } },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: '最新一次考试各科班级平均分', color: '#1e293b', font: { size: 15, weight: 'bold' }, padding: { top: 0, bottom: 4 } },
                        datalabels: {
                            display: true, color: '#1e293b', font: { size: 14, weight: 'bold' },
                            anchor: 'end', align: 'end', offset: 2, formatter: (v) => v
                        }
                    },
                    scales: {
                        x: { ticks: { color: '#1e293b', font: { size: 13 } } },
                        y: { beginAtZero: true, grace: '15%', ticks: { color: '#1e293b', font: { size: 13 } } }
                    }
                }
            });
        }
    }

    /* ---------------- 事件绑定 ---------------- */

    // 学科 Tab 切换
    document.getElementById('subjectTabs').addEventListener('click', e => {
        if (e.target.classList.contains('subject-tab')) {
            document.querySelectorAll('#subjectTabs .subject-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            S.currentSubject = e.target.dataset.subject;
            if (S.analysisStarted) { renderTable(); renderDashboard(); }
        }
    });

    // 排序
    document.getElementById('sortGroup').addEventListener('click', e => {
        if (e.target.classList.contains('sort-btn')) {
            document.querySelectorAll('#sortGroup .sort-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            S.currentSort = e.target.dataset.sort;
            if (S.analysisStarted) renderTable();
        }
    });

    // 搜索
    const searchInput = document.getElementById('studentSearch'),
        clearBtn = document.getElementById('clearSearch');
    searchInput.addEventListener('input', () => {
        S.searchQuery = searchInput.value;
        clearBtn.classList.toggle('visible', !!S.searchQuery.trim());
        if (S.analysisStarted) renderTable();
    });
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        S.searchQuery = '';
        clearBtn.classList.remove('visible');
        if (S.analysisStarted) renderTable();
    });

    // 点击姓名打开学生详情
    document.getElementById('mainTable').addEventListener('click', e => {
        if (e.target.classList.contains('name-cell')) {
            window._openStudentAnalysis(e.target.dataset.name);
        }
    });

    // 下载当前学科数据
    document.getElementById('btnDownloadData').addEventListener('click', downloadCurrentData);

    App.tables = {
        getViewData,
        sortData,
        renderTable,
        updateStats,
        downloadCurrentData,
        computeClassStats,
        computeSubjectAverages,
        renderDashboard,
        destroyCharts
    };
})(window.App = window.App || {});
