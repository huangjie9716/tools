/* ============================================================
 * 班主任通用成绩分析系统 - 学生详情弹窗模块 (modal.js)
 * 多次考试趋势图（排名/分数切换、学科筛选、数值标注、
 * 进退步着色）、趋势摘要、各科排名表、趋势图下载，
 * 以及“个人成绩单”Word 下载。
 * ============================================================ */
(function (App) {
    'use strict';

    const S = App.state;
    const { formatNumber, escapeHtml, calcProgress, showToast } = App.utils;
    const { getSubjectIndex, getSubjectData, getLatestIndex } = App.stateApi;

    const SUBJECT_COLORS = ['#4f6ef7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#e74c3c'];

    // 弹窗内部状态
    let trendChart = null;
    let metric = 'rank';          // 'rank' | 'score'
    let activeSubjects = ['总分']; // 当前显示的学科（默认只显示总分）
    let currentName = '';

    // 注册 Chart.js 数据标签插件
    if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    /** 某学生在某学科的 N 次数据 */
    function getTrendSeries(name, subj) {
        const series = [];
        for (let i = 0; i < S.nExams; i++) {
            const d = getSubjectData(S.exams[i], name, subj);
            series.push({ score: d.score, rank: d.rank });
        }
        return series;
    }

    /** 打开学生详情弹窗 */
    function openStudentAnalysis(name) {
        currentName = name;
        metric = 'rank';
        activeSubjects = ['总分'];
        const modalContent = document.getElementById('modalContent');

        // 控制栏：排名/分数切换 + 学科筛选 chips + 操作按钮
        let chips = '';
        ['总分', ...S.subjects].forEach(subj => {
            const on = subj === '总分' ? ' active' : '';
            chips += `<button class="chip${on}" data-subj="${escapeHtml(subj)}">${escapeHtml(subj)}</button>`;
        });

        modalContent.innerHTML = `
            <div class="modal-controls">
                <div class="metric-toggle">
                    <button class="metric-btn active" data-metric="rank"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#FF8E12" d="M902.0928 212.3776h-94.0544v-59.904c0-22.0672-17.92-39.9872-39.9872-39.9872H262.8096c-22.0672 0-39.9872 17.92-39.9872 39.9872v59.904H125.696c-22.0672 0-39.9872 17.92-39.9872 39.9872v107.9296c0 83.5584 63.9488 152.4224 145.4592 160.256 28.2624 115.6096 125.3888 204.4928 245.3504 220.4672v86.7328H321.8432c-22.0672 0-39.9872 17.92-39.9872 39.9872s17.92 39.9872 39.9872 39.9872h389.3248c22.0672 0 39.9872-17.92 39.9872-39.9872s-17.92-39.9872-39.9872-39.9872h-154.6752v-87.04c119.04-16.7936 215.2448-105.472 243.2-220.5696 80.0256-9.2672 142.336-77.4144 142.336-159.8976V252.3648c0.0512-22.0672-17.8688-39.9872-39.936-39.9872zM222.8224 437.7088c-33.024-10.24-57.088-41.0624-57.088-77.4656V292.352h57.088v145.3568z m375.0912 85.5552l-84.0192-44.1856-84.0192 44.1856 16.0256-93.5424L378.0096 363.52l93.9008-13.6704 41.984-85.0944 41.984 85.0944L649.8304 363.52l-67.9424 66.2528 16.0256 93.4912z m264.192-162.9696c0 35.2256-22.6304 65.1776-54.0672 76.3392V292.352h54.0672v67.9424z"/><path fill="#FCA315" d="M808.0384 152.4736c0-22.0672-17.92-39.9872-39.9872-39.9872H262.8096c-22.0672 0-39.9872 17.92-39.9872 39.9872v59.904H125.696c-22.0672 0-39.9872 17.92-39.9872 39.9872v107.9296c0 83.5584 63.9488 152.4224 145.4592 160.256 15.4624 63.1296 51.456 118.272 100.4544 157.952 8.6528 0.4608 17.3568 0.6656 26.112 0.6656 198.0928 0 369.2544-115.1488 450.2528-282.112V292.352h36.864a495.25248 495.25248 0 0 0 11.8272-79.9744h-48.6912v-59.904zM222.8224 437.7088c-33.024-10.24-57.088-41.0624-57.088-77.4144V292.352h57.088v145.3568z m375.0912 85.5552l-84.0192-44.1856-84.0192 44.1856 16.0256-93.5424L378.0096 363.52l93.9008-13.6704 41.984-85.0944 41.984 85.0944L649.8304 363.52l-67.9424 66.2528 16.0256 93.4912z"/><path fill="#FCB138" d="M445.952 429.7728L378.0096 363.52l93.9008-13.6704 41.984-85.0944 41.984 85.0944 20.7872 3.0208a499.36896 499.36896 0 0 0 131.9424-240.384H262.8096c-22.0672 0-39.9872 17.92-39.9872 39.9872v59.904H125.696c-22.0672 0-39.9872 17.92-39.9872 39.9872v107.9296c0 58.5216 31.4368 109.7216 78.2336 137.8816a498.11456 498.11456 0 0 0 278.5792-48.4352l3.4304-19.968z m-223.1296 7.936c-33.024-10.24-57.088-41.0624-57.088-77.4144V292.352h57.088v145.3568z"/><path fill="#FFC65E" d="M503.808 112.4864H262.8096c-22.0672 0-39.9872 17.92-39.9872 39.9872v59.904H125.696c-22.0672 0-39.9872 17.92-39.9872 39.9872v71.8848c3.1232 0.0512 6.2464 0.256 9.3696 0.256 23.9616 0 47.5136-1.792 70.5536-5.0688V292.352H222.72v15.616c115.3536-30.3104 214.2208-100.7616 281.088-195.4816z"/></svg> 按排名</button>
                    <button class="metric-btn" data-metric="score"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#9DE8F7" d="M512 512m-392 0a392 392 0 1 0 784 0 392 392 0 1 0-784 0Z"/><path fill="currentColor" d="M512 0C228.8 0 0 228.8 0 512s228.8 512 512 512 512-228.8 512-512S795.2 0 512 0z m0 992C248 992 32 776 32 512S248 32 512 32s480 216 480 480-216 480-480 480z"/><path fill="currentColor" d="M632 692.8h-78.4l-30.4-81.6h-142.4L352 692.8h-76.8l139.2-355.2h75.2L632 692.8zM500.8 552l-49.6-132.8-48 132.8h97.6zM675.2 508.8v-67.2h-68.8v-46.4h68.8V328H720v67.2h68.8v46.4H720v67.2h-44.8z"/></svg> 按分数</button>
                </div>
                <div class="chip-group">${chips}</div>
                <div class="chart-download-wrap">
                    <button class="btn-report local" onclick="downloadChart()"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M498.347 824.32l-296.96-296.96c-11.947-11.947-3.414-34.133 13.653-34.133h160.427c11.946 0 20.48-8.534 20.48-20.48V54.613c0-11.946 8.533-20.48 20.48-20.48h189.44c11.946 0 20.48 8.534 20.48 20.48v418.134c0 11.946 8.533 20.48 20.48 20.48h160.426c18.774 0 27.307 22.186 13.654 34.133L525.653 824.32c-6.826 6.827-20.48 6.827-27.306 0zM916.48 989.867H107.52c-18.773 0-35.84-15.36-35.84-35.84 0-18.774 15.36-35.84 35.84-35.84h810.667c18.773 0 35.84 15.36 35.84 35.84-1.707 20.48-17.067 35.84-37.547 35.84z"/></svg> 下载趋势图</button>
                    <button class="btn-report download" onclick="downloadPersonalReport()"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M498.347 824.32l-296.96-296.96c-11.947-11.947-3.414-34.133 13.653-34.133h160.427c11.946 0 20.48-8.534 20.48-20.48V54.613c0-11.946 8.533-20.48 20.48-20.48h189.44c11.946 0 20.48 8.534 20.48 20.48v418.134c0 11.946 8.533 20.48 20.48 20.48h160.426c18.774 0 27.307 22.186 13.654 34.133L525.653 824.32c-6.826 6.827-20.48 6.827-27.306 0zM916.48 989.867H107.52c-18.773 0-35.84-15.36-35.84-35.84 0-18.774 15.36-35.84 35.84-35.84h810.667c18.773 0 35.84 15.36 35.84 35.84-1.707 20.48-17.067 35.84-37.547 35.84z"/></svg> 个人成绩单</button>
                </div>
            </div>
            <div class="chart-container"><canvas id="trendChart"></canvas></div>
            <div class="trend-summary" id="trendSummary"></div>
            <div class="modal-table-wrap" id="trendTableWrap"></div>`;

        document.getElementById('modalName').textContent = name;
        const latest = getLatestIndex();
        const totalStu = S.exams[latest] && S.exams[latest].get(name);
        const totalRank = totalStu ? totalStu.ranks[getSubjectIndex('总分')] ?? null : null;
        document.getElementById('modalSubtitle').textContent = `共 ${S.nExams} 次考试 · 最新总分排名：${totalRank ?? '--'}`;
        document.getElementById('modalOverlay').style.display = 'flex';

        renderTrendChart();
        renderTrendSummary();
        renderTrendTable();
    }

    /** 渲染趋势图（默认只显示总分，可用 chips 增减） */
    function renderTrendChart() {
        if (trendChart) { trendChart.destroy(); trendChart = null; }
        const ctx = document.getElementById('trendChart') && document.getElementById('trendChart').getContext('2d');
        if (!ctx) return;
        const labels = [];
        for (let i = 0; i < S.nExams; i++) labels.push('第' + (i + 1) + '次');

        const datasets = activeSubjects.map((subj, di) => {
            const series = getTrendSeries(currentName, subj);
            const color = SUBJECT_COLORS[di % SUBJECT_COLORS.length];
            const values = series.map(p => metric === 'rank' ? p.rank : p.score);
            // 进退步着色（排名越小越进步；分数越大越进步）
            const pointColors = series.map((p, i) => {
                if (metric === 'rank') {
                    if (i === 0) return color;
                    const prev = series[i - 1].rank;
                    if (p.rank == null || prev == null) return '#94a3b8';
                    if (p.rank < prev) return '#10b981';
                    if (p.rank > prev) return '#ef4444';
                    return '#94a3b8';
                } else {
                    if (i === 0) return color;
                    const prev = series[i - 1].score;
                    if (p.score == null || prev == null) return '#94a3b8';
                    if (p.score > prev) return '#10b981';
                    if (p.score < prev) return '#ef4444';
                    return '#94a3b8';
                }
            });
            return {
                label: subj,
                data: values,
                borderColor: color,
                backgroundColor: color,
                borderWidth: subj === '总分' ? 4 : 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: pointColors,
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                tension: 0.25,
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 6,
                    font: { size: 11, weight: subj === '总分' ? 'bold' : 'normal' },
                    color: color,
                    formatter: (val) => val == null ? '' : (metric === 'rank' ? val : formatNumber(val))
                }
            };
        });

        trendChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (c) => {
                                const series = getTrendSeries(currentName, c.dataset.label);
                                const p = series[c.dataIndex];
                                if (metric === 'rank') {
                                    const chg = c.dataIndex > 0 && series[c.dataIndex - 1].rank != null && p.rank != null ?
                                        series[c.dataIndex - 1].rank - p.rank : null;
                                    return `${c.dataset.label}排名：${p.rank ?? '--'}` + (chg == null ? '' : (chg > 0 ? `（↑${chg}）` : chg < 0 ? `（↓${-chg}）` : '（→）'));
                                }
                                return `${c.dataset.label}分数：${p.score != null ? p.score : '--'}`;
                            }
                        }
                    },
                    title: { display: true, text: (metric === 'rank' ? '年级排名趋势（越小越好）' : '成绩分数趋势') }
                },
                scales: {
                    y: metric === 'rank' ? { reverse: true, title: { display: true, text: '年级排名' } } : { title: { display: true, text: '分数' } }
                }
            }
        });
    }

    /** 渲染趋势文字摘要（针对总分） */
    function renderTrendSummary() {
        const el = document.getElementById('trendSummary');
        if (!el) return;
        const series = getTrendSeries(currentName, '总分');
        const ranks = series.map(p => p.rank);
        if (ranks.every(r => r == null)) { el.textContent = '暂无总分排名数据'; return; }
        const first = ranks[0],
            last = ranks[ranks.length - 1];
        const chg = calcProgress(first, last);
        // 判断趋势
        let trendText = '波动';
        const diffs = [];
        for (let i = 1; i < ranks.length; i++) {
            if (ranks[i] != null && ranks[i - 1] != null) diffs.push(ranks[i - 1] - ranks[i]);
        }
        if (diffs.length && diffs.every(d => d > 0)) trendText = '持续进步';
        else if (diffs.length && diffs.every(d => d < 0)) trendText = '持续退步';
        const parts = [`总分排名：第1次 ${first ?? '--'} → 第${S.nExams}次 ${last ?? '--'}`];
        if (chg != null) parts.push(chg > 0 ? `总体进步 ${chg} 名` : chg < 0 ? `总体退步 ${-chg} 名` : '排名持平');
        parts.push('趋势：' + trendText);
        el.innerHTML = `💡 ${parts.join('　·　')}`;
    }

    /** 渲染各科排名表 */
    function renderTrendTable() {
        const wrap = document.getElementById('trendTableWrap');
        if (!wrap) return;
        const allSubjects = ['总分', ...S.subjects];
        let h = '<table><thead><tr><th>学科</th>';
        for (let i = 0; i < S.nExams; i++) h += `<th>第${i + 1}次排名</th>`;
        h += '</tr></thead><tbody>';
        for (const subj of allSubjects) {
            const ranks = getTrendSeries(currentName, subj).map(p => p.rank);
            h += `<tr><td><strong>${escapeHtml(subj)}</strong></td>`;
            for (const r of ranks) h += `<td>${r != null ? r : '--'}</td>`;
            h += '</tr>';
        }
        h += '</tbody></table>';
        wrap.innerHTML = h;
    }

    /** 切换排名/分数视图 */
    function toggleMetric(m) {
        if (m === metric) return;
        metric = m;
        document.querySelectorAll('.metric-btn').forEach(b => b.classList.toggle('active', b.dataset.metric === m));
        renderTrendChart();
    }

    /** 切换学科显示（至少保留一个） */
    function toggleSubject(subj) {
        if (activeSubjects.includes(subj)) {
            if (activeSubjects.length === 1) { showToast('请至少保留一个学科'); return; }
            activeSubjects = activeSubjects.filter(s => s !== subj);
        } else {
            activeSubjects.push(subj);
        }
        document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', activeSubjects.includes(c.dataset.subj)));
        renderTrendChart();
    }

    /** 下载趋势图为 PNG */
    function downloadChart() {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = '成绩趋势图.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('📥 趋势图已下载');
    }

    /** 下载个人成绩单（Word .doc，含趋势图与各科排名表） */
    function downloadPersonalReport() {
        if (!currentName) { showToast('请先打开学生详情'); return; }
        const canvas = document.getElementById('trendChart');
        const img = canvas ? canvas.toDataURL('image/png') : '';
        const allSubjects = ['总分', ...S.subjects];
        let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>个人成绩单</title></head><body style="font-family:'Microsoft YaHei',sans-serif">`;
        html += `<h2 style="text-align:center">${escapeHtml(currentName)} 个人成绩单（${S.nExams} 次考试）</h2>`;
        html += `<p style="text-align:center;color:#888">生成时间：${new Date().toLocaleString()}</p>`;
        if (img) html += `<div style="text-align:center"><img src="${img}" style="max-width:100%"></div>`;
        html += `<h3>各科年级排名</h3><table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>学科</th>`;
        for (let i = 0; i < S.nExams; i++) html += `<th>第${i + 1}次</th>`;
        html += '</tr>';
        for (const subj of allSubjects) {
            const ranks = getTrendSeries(currentName, subj).map(p => p.rank);
            html += `<tr><td><b>${escapeHtml(subj)}</b></td>`;
            for (const r of ranks) html += `<td>${r != null ? r : '--'}</td>`;
            html += '</tr>';
        }
        html += '</table></body></html>';
        const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = escapeHtml(currentName) + '_个人成绩单.doc';
        a.click();
        showToast('📄 个人成绩单已下载');
    }

    function closeModal() {
        if (trendChart) { trendChart.destroy(); trendChart = null; }
        document.getElementById('modalOverlay').style.display = 'none';
    }

    // 弹窗控制栏事件（委托）
    document.getElementById('modalContent').addEventListener('click', e => {
        if (e.target.classList.contains('metric-btn')) toggleMetric(e.target.dataset.metric);
        else if (e.target.classList.contains('chip')) toggleSubject(e.target.dataset.subj);
    });

    // 弹窗关闭事件
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => {
        if (e.target === document.getElementById('modalOverlay')) closeModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // 导出到全局（供内联 onclick 与表格调用）
    window._openStudentAnalysis = openStudentAnalysis;
    window.downloadChart = downloadChart;
    window.downloadPersonalReport = downloadPersonalReport;

    App.modal = {
        openStudentAnalysis,
        downloadChart,
        downloadPersonalReport,
        closeModal
    };
})(window.App = window.App || {});
