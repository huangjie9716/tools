// ================================================================
//  ★★★ 渲染引擎 — 一般情况下无需修改 ★★★
//  数据在 js/data.js（RAW_DATA），样式在 css/style.css
//  本文件依赖：Chart.js（CDN）+ js/data.js 中的 RAW_DATA
// ================================================================

// ----- 常量：系统共 20 周 -----
const TOTAL_WEEKS = 20;
const WEEK_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'
];

function weekName(i) {
    return '第' + WEEK_CN[i] + '周';
}

// 取某班第 i 周的数据（i 从 0 开始，0 = 第一周）；无数据返回 undefined
function getWeek(classData, i) {
    return classData.weeks.find(w => w.name === weekName(i));
}

// 上传 SVG 图标（「数据待上传」提示，与主页保持一致）
const EMPTY_ICON_SVG = '<svg class="empty-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M819.5 783.7h-51.3c-16.6 0-30 13.4-30 30s13.4 30 30 30h51.3c16.6 0 30-13.4 30-30s-13.5-30-30-30zM665.7 783.7H143.9c-16.6 0-30 13.4-30 30s13.4 30 30 30h521.8c16.6 0 30-13.4 30-30s-13.5-30-30-30z" fill="#33CC99"></path>' +
    '<path d="M834.7 940.7H230.1c-23.9 0-43.5-19.6-43.5-43.5s19.6-43.5 43.5-43.5h604.6c23.9 0 43.5 19.6 43.5 43.5s-19.5 43.5-43.5 43.5z" fill="#FFB89A"></path>' +
    '<path d="M791.8 409.6H665.7c-16.6 0-30 13.4-30 30s13.4 30 30 30h126.2c41 0 74.4 33.4 74.4 74.4v281.3c0 41-33.4 74.4-74.4 74.4H232.4c-41 0-74.4-33.4-74.4-74.4V544c0-41 33.4-74.4 74.4-74.4h139.3c16.6 0 30-13.4 30-30s-13.4-30-30-30H232.4C158.3 409.6 98 469.9 98 544v281.3c0 74.1 60.3 134.4 134.4 134.4h559.4c74.1 0 134.4-60.3 134.4-134.4V544c0-74.1-60.3-134.4-134.4-134.4z" fill="#45484C"></path>' +
    '<path d="M362.3 272.1l118.8-118.8v550.9c0 16.6 13.4 30 30 30s30-13.4 30-30V153.3l118.8 118.8c5.9 5.9 13.5 8.8 21.2 8.8s15.4-2.9 21.2-8.8c11.7-11.7 11.7-30.7 0-42.4L552.6 80c-11.1-11.1-25.9-17.2-41.5-17.2-15.7 0-30.4 6.1-41.5 17.2L319.9 229.7c-11.7 11.7-11.7 30.7 0 42.4s30.7 11.7 42.4 0z" fill="#45484C"></path>' +
    '</svg>';

// ----- 工具 -----
function calcMemberTotal(m, fields) {
    let sum = 0;
    for (const f of fields) sum += (m[f] || 0);
    return sum;
}

function calcGroupTotal(group, fields) {
    let sum = 0;
    for (const m of group.members) sum += calcMemberTotal(m, fields);
    return sum;
}

// 汇总「选中周次」的小组人均积分（总分 ÷ 成员数），保持「一组 ~ 十二组」顺序。
// 按人均分比较可避免小组人数不同（4人/5人）造成的不公平。
function collectGroupTotals(classData) {
    const map = new Map();
    const weekObjs = [];
    selectedSumWeeks.forEach(i => {
        const w = getWeek(classData, i);
        if (w) weekObjs.push(w);
    });
    for (const week of weekObjs) {
        for (const g of week.groups) {
            if (!map.has(g.name)) map.set(g.name, { name: g.name, total: 0, members: 0 });
            const entry = map.get(g.name);
            entry.total += calcGroupTotal(g, week.fields);
            entry.members += g.members.length;
        }
    }
    const result = Array.from(map.values());
    result.forEach(e => { e.avg = e.members ? e.total / e.members : 0; });
    return result;
}

// 当前图表每根柱子对应的名次（仅排序模式下使用）
let chartRanks = null;

// 在柱状图顶部绘制总积分的自定义插件
const topLabelPlugin = {
    id: 'topLabels',
    afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        if (meta.hidden) return;
        meta.data.forEach((bar, i) => {
            const val = chart.data.datasets[0].data[i];
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            if (chartRanks && chartRanks[i]) {
                ctx.font = '600 12px "PingFang SC","Microsoft YaHei",sans-serif';
                ctx.fillStyle = '#fcd34d';
                ctx.fillText(chartRanks[i], bar.x, bar.y - 28);
            }
            ctx.font = '600 14px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.fillStyle = '#9fe3ff';
            ctx.fillText(val.toFixed(2) + ' 分', bar.x, bar.y - 7);
            ctx.restore();
        });
    }
};

// ----- 状态 -----
let currentClass = '1班';
let currentWeek = 0; // 明细当前查看的周（0 = 第一周）
let selectedSumWeeks = new Set(); // 积分汇总选中的周（0-based 索引）
let sortMode = 'order'; // 'order' = 按组序一~十二 | 'score' = 按积分排序
let chartInstance = null;
let detailExpanded = true;

// 该班「有数据」的周索引（如 [0, 1, 2]）
function dataWeekIndices(classData) {
    return classData.weeks
        .map(w => WEEK_CN.indexOf(w.name.replace('第', '').replace('周', '')))
        .filter(i => i >= 0);
}

// ----- 渲染图表 -----
function renderChart(classData) {
    const totals = collectGroupTotals(classData);
    let labels, data;

    chartRanks = null;
    if (sortMode === 'score') {
        const sorted = totals.slice().sort((a, b) => b.avg - a.avg);
        labels = sorted.map(t => t.name);
        data = sorted.map(t => t.avg);
        const medals = ['🥇', '🥈', '🥉'];
        chartRanks = sorted.map((t, i) => medals[i] || ('第' + (i + 1) + '名'));
    } else {
        labels = totals.map(t => t.name);
        data = totals.map(t => t.avg);
    }

    const colors = ['#4dd0ff', '#5ec9ff', '#79c8ff', '#9aa5ff', '#c0a6ff',
        '#4ade80', '#6ee7b7', '#94f0d1', '#a5f3fc', '#67e8f9',
        '#fbbf24', '#fbbf24'
    ];

    const ctx = document.getElementById('scoreChart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '小组人均积分',
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderColor: colors.slice(0, data.length).map(c => c),
                borderWidth: 1,
                borderRadius: 8,
                barPercentage: 0.66,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 28 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 16, 26, 0.95)',
                    borderColor: 'rgba(77, 208, 255, 0.35)',
                    borderWidth: 1,
                    titleColor: '#e6edf7',
                    bodyColor: '#9fe3ff',
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return '人均积分: ' + context.parsed.y.toFixed(2) + ' 分';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '10%',
                    grid: { color: 'rgba(120, 160, 255, 0.10)' },
                    ticks: {
                        font: { size: 12 },
                        color: '#8fa3bd',
                        maxTicksLimit: 12,
                        callback: function(v) { return (v % 1 === 0 ? v : v.toFixed(2)); }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 12, weight: '600' }, color: '#cfe0f2' }
                }
            },
            animation: { duration: 500 }
        },
        plugins: [topLabelPlugin]
    });
}

// ----- 渲染明细 -----
function renderDetail(classData) {
    const week = getWeek(classData, currentWeek);
    const labels = week ? (week.labels || []) : [];
    const fields = week ? (week.fields || []) : [];
    const head = document.getElementById('detailHead');
    const tbody = document.getElementById('detailBody');
    const table = document.getElementById('detailTable');
    const empty = document.getElementById('detailEmpty');

    // 无数据的周 → 显示「数据待上传」
    if (!week) {
        head.innerHTML = '';
        tbody.innerHTML = '';
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    table.style.display = '';
    empty.style.display = 'none';

    // 表头（严格按该周的 labels 生成，与上传文件保持一致）
    head.innerHTML = '';
    const trHead = document.createElement('tr');
    const thGroup = document.createElement('th');
    thGroup.style.minWidth = '60px';
    thGroup.textContent = '组别';
    const thId = document.createElement('th');
    thId.style.minWidth = '58px';
    thId.textContent = '学号';
    trHead.appendChild(thGroup);
    trHead.appendChild(thId);
    for (const lb of labels) {
        const th = document.createElement('th');
        th.textContent = lb;
        trHead.appendChild(th);
    }
    const thTotal = document.createElement('th');
    thTotal.style.minWidth = '56px';
    thTotal.textContent = '个人总分';
    trHead.appendChild(thTotal);
    head.appendChild(trHead);

    // 表体
    tbody.innerHTML = '';

    for (const g of week.groups) {
        const groupTotal = calcGroupTotal(g, fields);
        const groupAvg = g.members.length ? groupTotal / g.members.length : 0;
        // 组标题行
        const trTitle = document.createElement('tr');
        trTitle.className = 'group-divider';
        const tdName = document.createElement('td');
        tdName.className = 'group-name';
        tdName.textContent = g.name;
        const tdEmpty = document.createElement('td');
        tdEmpty.textContent = '';
        const tdTotal = document.createElement('td');
        tdTotal.setAttribute('colspan', String(labels.length));
        tdTotal.textContent = '小组总分：' + groupTotal + ' 分 · 人均 ' + groupAvg.toFixed(2) + ' 分';
        tdTotal.style.fontWeight = '600';
        tdTotal.style.color = '#9fe3ff';
        const tdBlank = document.createElement('td');
        tdBlank.textContent = '';
        trTitle.appendChild(tdName);
        trTitle.appendChild(tdEmpty);
        trTitle.appendChild(tdTotal);
        trTitle.appendChild(tdBlank);
        tbody.appendChild(trTitle);

        // 成员行
        for (const m of g.members) {
            const total = calcMemberTotal(m, fields);
            const tr = document.createElement('tr');
            const tdGroup = document.createElement('td');
            tdGroup.className = 'group-name';
            tdGroup.textContent = '';
            const tdId = document.createElement('td');
            tdId.className = 'member-id';
            tdId.textContent = m.id;
            tdId.title = '点击查看该学生得分明细';
            tdId.addEventListener('click', function() {
                openStudentModal(currentClass, g.name, m);
            });
            tr.appendChild(tdGroup);
            tr.appendChild(tdId);
            for (const f of fields) {
                const td = document.createElement('td');
                td.className = 'score-cell';
                td.textContent = m[f] || 0;
                tr.appendChild(td);
            }
            const tdTotalCell = document.createElement('td');
            tdTotalCell.className = 'total-cell';
            tdTotalCell.textContent = total;
            tr.appendChild(tdTotalCell);
            tbody.appendChild(tr);
        }
    }
}

// ----- 周切换标签（共 20 周） -----
function renderWeekTabs(classData) {
    const wrap = document.getElementById('weekTabs');
    wrap.innerHTML = '';
    for (let i = 0; i < TOTAL_WEEKS; i++) {
        const btn = document.createElement('button');
        btn.textContent = weekName(i);
        if (i === currentWeek) btn.className = 'active';
        btn.addEventListener('click', function() {
            currentWeek = i;
            renderWeekTabs(classData);
            renderDetail(classData);
        });
        wrap.appendChild(btn);
    }
}

// 同步「全选」复选框状态（选中=全选，半选=部分选中）
function syncMasterBox(selectableCount) {
    const box = document.getElementById('wsAllBox');
    const selected = selectedSumWeeks.size;
    box.checked = selectableCount > 0 && selected === selectableCount;
    box.indeterminate = selected > 0 && selected < selectableCount;
}

// ----- 汇总周次选择（总积分区域，共 20 周，每项带选择框） -----
function renderSumWeekChips(classData) {
    const wrap = document.getElementById('sumWeekChips');
    wrap.innerHTML = '';
    const dataIdx = dataWeekIndices(classData);
    // 清理：无数据的周不应被选中
    selectedSumWeeks = new Set([...selectedSumWeeks].filter(i => dataIdx.includes(i)));

    for (let i = 0; i < TOTAL_WEEKS; i++) {
        const hasData = dataIdx.includes(i);
        const label = document.createElement('label');
        label.className = 'ws-item' + (selectedSumWeeks.has(i) ? ' active' : '') + (hasData ? '' : ' disabled');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selectedSumWeeks.has(i);
        cb.disabled = !hasData;
        if (!hasData) label.dataset.tip = '该周数据待上传，暂不可选';
        cb.addEventListener('change', function() {
            if (cb.checked) selectedSumWeeks.add(i);
            else selectedSumWeeks.delete(i);
            render(currentClass);
        });
        const span = document.createElement('span');
        span.textContent = '第' + (i + 1) + '周';
        label.appendChild(cb);
        label.appendChild(span);
        wrap.appendChild(label);
    }
    syncMasterBox(dataIdx.length);
}

// ----- 学生积分明细弹窗 -----
let modalStudent = null; // { classKey, groupName, id }
let modalWeek = 0;

function openStudentModal(classKey, groupName, member) {
    modalStudent = { classKey: classKey, groupName: groupName, id: member.id };
    modalWeek = currentWeek;
    document.getElementById('studentModal').style.display = 'flex';
    renderStudentModal();
}

function closeStudentModal() {
    document.getElementById('studentModal').style.display = 'none';
    modalStudent = null;
}

function renderStudentModal() {
    if (!modalStudent) return;
    const classData = RAW_DATA[modalStudent.classKey];
    document.getElementById('modalInfo').textContent =
        modalStudent.classKey + ' · ' + modalStudent.groupName + ' · 学号 ' + modalStudent.id;

    // 周次切换
    const weeksWrap = document.getElementById('modalWeeks');
    weeksWrap.innerHTML = '';
    for (let i = 0; i < TOTAL_WEEKS; i++) {
        const btn = document.createElement('button');
        btn.textContent = weekName(i);
        if (i === modalWeek) btn.className = 'active';
        btn.addEventListener('click', function() {
            modalWeek = i;
            renderStudentModal();
        });
        weeksWrap.appendChild(btn);
    }

    // 该学生某周的得分明细 + 周总积分（不显示个人排名）
    const week = getWeek(classData, modalWeek);
    const detail = document.getElementById('modalDetail');
    if (!week) {
        detail.innerHTML = '<div class="empty-state">' + EMPTY_ICON_SVG + '<p>该周数据待上传</p></div>';
        return;
    }
    let member = null;
    for (const g of week.groups) {
        const m = g.members.find(m => m.id === modalStudent.id);
        if (m) { member = m; break; }
    }
    if (!member) {
        detail.innerHTML = '<p class="modal-none">该学生在' + week.name + '暂无记录</p>';
        return;
    }
    let html = '<table class="modal-table">';
    for (let j = 0; j < week.labels.length; j++) {
        html += '<tr><td>' + week.labels[j] + '</td><td>' + (member[week.fields[j]] || 0) + ' 分</td></tr>';
    }
    html += '<tr class="total"><td>本周个人总分</td><td>' + calcMemberTotal(member, week.fields) + ' 分</td></tr>';
    html += '</table>';
    detail.innerHTML = html;
}

// ----- 主渲染 -----
function render(classKey) {
    const classData = RAW_DATA[classKey];
    if (!classData) return;

    if (currentWeek >= TOTAL_WEEKS) currentWeek = 0;

    const totals = collectGroupTotals(classData);
    const top = totals.reduce((a, b) => (b.avg > a.avg ? b : a), totals[0]);
    let avgSum = 0;
    for (const t of totals) avgSum += t.avg;
    const avg = totals.length ? avgSum / totals.length : 0;

    // 统计卡片（小组积分按成员人均分计算，避免人数不同不公平）
    document.getElementById('topGroup').textContent = top ? top.name + '（' + top.avg.toFixed(2) + '分）' : '—';
    document.getElementById('avgScore').textContent = avg.toFixed(2) + ' 分';
    document.getElementById('groupCount').textContent = totals.length + ' 组';

    // 图表标题：x班各小组人均积分对比
    document.getElementById('chartTitle').textContent = classKey + '各小组人均积分对比';

    // 图表
    renderChart(classData);

    // 汇总周次选择
    renderSumWeekChips(classData);

    // 明细
    renderWeekTabs(classData);
    renderDetail(classData);
}

// ----- 班级切换 -----
document.querySelectorAll('.class-tabs button').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.class-tabs button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentClass = this.dataset.class;
        // 若当前选中的周在新班级里都没有数据，则默认全选该班有数据的周
        const dataIdx = dataWeekIndices(RAW_DATA[currentClass]);
        const hasAny = Array.from(selectedSumWeeks).some(i => dataIdx.includes(i));
        if (!hasAny) selectedSumWeeks = new Set(dataIdx);
        render(currentClass);
    });
});

// ----- 排序切换 -----
document.querySelectorAll('#sortToggle .opt').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('#sortToggle .opt').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        sortMode = this.dataset.sort;
        renderChart(RAW_DATA[currentClass]);
    });
});

// ----- 汇总周次：全选 / 清除 -----
document.getElementById('wsAllBox').addEventListener('change', function() {
    if (this.checked) {
        // 全选 = 选中所有有数据的周（无数据周不可选）
        selectedSumWeeks = new Set(dataWeekIndices(RAW_DATA[currentClass]));
    } else {
        selectedSumWeeks.clear();
    }
    render(currentClass);
});
document.getElementById('wsClearBtn').addEventListener('click', function() {
    selectedSumWeeks.clear();
    render(currentClass);
});

// ----- 学生积分明细弹窗：关闭 -----
document.getElementById('modalClose').addEventListener('click', closeStudentModal);
document.getElementById('studentModal').addEventListener('click', function(e) {
    if (e.target === this) closeStudentModal();
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeStudentModal();
});

// ----- 明细折叠 -----
document.getElementById('toggleDetailBtn').addEventListener('click', function() {
    const wrap = document.getElementById('tableWrap');
    detailExpanded = !detailExpanded;
    if (detailExpanded) {
        wrap.className = 'table-wrap expanded';
        this.textContent = '收起明细';
    } else {
        wrap.className = 'table-wrap collapsed';
        this.textContent = '展开明细';
    }
});

// ----- 首次加载：默认全选 1 班有数据的周 -----
selectedSumWeeks = new Set(dataWeekIndices(RAW_DATA[currentClass]));

// ----- 默认渲染 1 班 -----
render('1班');

// ----- 云端同步：拉取云端周数据后合并并重新渲染 -----
if (typeof loadRemoteWeeks === 'function') {
    loadRemoteWeeks().then(function(n) {
        if (n > 0) {
            // 云端有数据时，默认全选所有有数据的周
            selectedSumWeeks = new Set(dataWeekIndices(RAW_DATA[currentClass]));
            render(currentClass);
            var st = document.getElementById('cloudStatus');
            if (st) st.style.display = 'inline-flex';
            console.log('🌐 已从云端同步 ' + n + ' 周数据');
        }
    });
}

// 窗口尺寸变化时让图表自适应
let resizeTimer = null;
window.addEventListener('resize', function() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (chartInstance) chartInstance.resize();
    }, 120);
});

console.log('✅ 珠海市九洲中学2025级学生物理小组积分可视化系统已启动！');
console.log('📌 如需修改数据，请编辑 js/data.js 中的 RAW_DATA（每周一组 labels/fields/groups）。');
