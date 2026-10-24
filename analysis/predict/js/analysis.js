/**
 * analysis.js —— 核心分析逻辑
 * 数据准备与预测计算（数据处理算法逻辑，请勿改动）
 */
(function (App) {
    const E = App.elements;
    const S = App.state;

    // 取两次成绩的公共学号
    function getCommonIds(d1, d2) {
        const s1 = new Set(d1.rows.map(r => String(r[d1.indices.idCol] || '').trim()));
        const s2 = new Set(d2.rows.map(r => String(r[d2.indices.idCol] || '').trim()));
        return [...s1].filter(id => s2.has(id));
    }

    // 成绩缺失警告图标（黄色警告三角形，标题左侧小图标）
    const WARNING_ICON = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" style="width:1.5rem;height:1.5rem;flex-shrink:0;display:block;"><path d="M901.589333 752l-318.72-552.064c-38.997333-67.456-102.741333-67.456-141.696 0L122.453333 752c-38.997333 67.541333-7.125333 122.666667 70.784 122.666667H830.72c77.909333 0 109.781333-55.125333 70.826667-122.666667zM468.224 356.608c11.434667-12.373333 26.026667-18.602667 43.776-18.602667 17.792 0 32.341333 6.144 43.776 18.346667 11.392 12.202667 17.066667 27.52 17.066667 45.909333 0 15.786667-23.765333 132.181333-31.658667 216.832H483.84c-6.954667-84.650667-32.768-201.002667-32.768-216.832 0-18.133333 5.717333-33.365333 17.109333-45.653333z m86.784 402.474667a59.477333 59.477333 0 0 1-43.008 17.578666c-16.597333 0-30.933333-5.845333-42.965333-17.578666a57.173333 57.173333 0 0 1-18.005334-42.538667c0-16.554667 5.973333-30.890667 18.005334-42.922667A58.794667 58.794667 0 0 1 512 655.616c16.64 0 30.933333 5.973333 43.008 18.005333 11.946667 12.032 17.962667 26.368 17.962667 42.922667 0 16.64-5.973333 30.848-17.962667 42.538667z" fill="#FDC920"/><path d="M512 338.005333c-17.749333 0-32.341333 6.186667-43.776 18.56-11.392 12.373333-17.066667 27.562667-17.066667 45.653334 0 5.888 3.498667 25.472 8.277334 52.096 8.192 45.44 20.053333 111.36 24.448 164.736h57.301333c4.778667-51.370667 15.445333-114.389333 23.04-159.573334 4.992-29.269333 8.661333-51.029333 8.661333-57.216 0-18.389333-5.717333-33.706667-17.066666-45.952A57.429333 57.429333 0 0 0 512 337.962667zM512 776.661333c16.64 0 30.933333-5.845333 43.008-17.578666a57.173333 57.173333 0 0 0 17.962667-42.538667c0-16.597333-5.973333-30.890667-17.962667-42.922667A58.794667 58.794667 0 0 0 512 655.616c-16.597333 0-30.933333 5.973333-42.965333 18.005333a58.581333 58.581333 0 0 0-18.005334 42.922667c0 16.64 5.973333 30.805333 18.005334 42.538667s26.368 17.578667 42.965333 17.578666z" fill="#333333"/></svg>`;

    // 构建成绩缺失弹窗的 HTML 内容（含警告图标与具体学号/姓名明细）
    function buildMissingMessage(info) {
        const block = (label, list) => {
            if (!list || list.length === 0) return '';
            const MAX = 30;
            const shown = list.slice(0, MAX);
            let html = `<div style="margin-top:8px;font-weight:600;">${label}（${list.length} 人）：</div>`;
            html += `<div style="max-height:150px;overflow:auto;border:1px solid var(--border-light);border-radius:8px;padding:6px 10px;background:#fafcfd;font-size:0.82rem;line-height:1.9;">`;
            html += shown.map(s => `· ${s.学号}　${s.姓名}`).join('<br>');
            if (list.length > MAX) html += `<br>… 共 ${list.length} 人，仅显示前 ${MAX} 人`;
            html += '</div>';
            return html;
        };
        return `<div>检测到部分学生两次成绩不全，系统将仅对<b>两次成绩都有</b>的学生（<b>${info.common}</b> 人）进行分析。</div>` +
            block('本次成绩有、参考成绩无', info.currentOnlyList) +
            block('参考成绩有、本次成绩无', info.refOnlyList) +
            `<div style="margin-top:10px;color:var(--text-secondary);">是否继续？</div>`;
    }

    // 统计两次成绩的匹配情况（以学号为唯一依据，与文件行顺序无关）
    function getMissingCounts() {
        if (!S.currentFileData || !S.refFileData) return null;
        const curIds = new Set(S.currentFileData.rows.map(r => String(r[S.currentFileData.indices.idCol] || '').trim()));
        const refIds = new Set(S.refFileData.rows.map(r => String(r[S.refFileData.indices.idCol] || '').trim()));
        const common = [...curIds].filter(id => refIds.has(id)).length;
        const currentOnlyList = S.currentFileData.rows
            .filter(r => !refIds.has(String(r[S.currentFileData.indices.idCol] || '').trim()))
            .map(r => ({ 学号: String(r[S.currentFileData.indices.idCol] || '').trim(), 姓名: String(r[S.currentFileData.indices.nameCol] || '').trim() }));
        const refOnlyList = S.refFileData.rows
            .filter(r => !curIds.has(String(r[S.refFileData.indices.idCol] || '').trim()))
            .map(r => ({ 学号: String(r[S.refFileData.indices.idCol] || '').trim(), 姓名: String(r[S.refFileData.indices.nameCol] || '').trim() }));
        return { common, currentOnly: currentOnlyList.length, refOnly: refOnlyList.length, currentOnlyList, refOnlyList };
    }

    // 增量模式：更新总人数并启用按钮；有成绩缺失时弹窗提醒，需用户确认后再继续
    function checkIncrementReady() {
        if (S.currentFileData && S.refFileData) {
            const info = getMissingCounts();
            E.totalStudentsInput.value = info.common;
            E.btnCalculate.disabled = false;
            S.hasMissing = info.currentOnly > 0 || info.refOnly > 0;
            if (S.hasMissing) {
                S.missingConfirmed = false;
                App.util.showModal('成绩缺失提示', buildMissingMessage(info),
                    { showCancel: true, confirmText: '继续分析', cancelText: '取消', iconHtml: WARNING_ICON,
                      onConfirm: () => { S.missingConfirmed = true; },
                      onCancel: () => { S.missingConfirmed = false; } });
            } else {
                S.hasMissing = false;
                S.missingConfirmed = true;
            }
        } else E.btnCalculate.disabled = true;
    }

    // 准备分析所需的基础数据
    function getBaseData() {
        if (S.currentMode === 'prediction') {
            if (!S.predictionFileData) { App.util.showToast('请上传成绩文件', 'warning'); return null; }
            const { rows, indices } = S.predictionFileData;
            const scores = rows.map(r => parseFloat(r[indices.scoreCol]) || 0);
            return { scores, originalRows: rows, indices };
        } else {
            if (!S.currentFileData || !S.refFileData) { App.util.showToast('请上传两次成绩', 'warning'); return null; }
            const commonIds = getCommonIds(S.currentFileData, S.refFileData);
            if (commonIds.length === 0) { App.util.showToast('无匹配学号', 'error'); return null; }
            const curMap = new Map();
            S.currentFileData.rows.forEach(r => curMap.set(String(r[S.currentFileData.indices.idCol] || '').trim(), r));
            const refMap = new Map();
            S.refFileData.rows.forEach(r => refMap.set(String(r[S.refFileData.indices.idCol] || '').trim(), r));
            const curScores = [], refScores = [], matched = [];
            commonIds.forEach(id => {
                const curRow = curMap.get(id), refRow = refMap.get(id);
                const cs = parseFloat(curRow[S.currentFileData.indices.scoreCol]) || 0, rs = parseFloat(refRow[S.refFileData.indices.scoreCol]) || 0;
                curScores.push(cs); refScores.push(rs); matched.push({ id, curRow, refRow, curScore: cs, refScore: rs });
            });
            return { curScores, refScores, matchedRows: matched, curIndices: S.currentFileData.indices, refIndices: S.refFileData.indices };
        }
    }

    // 核心计算：对每条达标线计算预测上线概率并汇总班级
    function performCalculation() {
        const lines = App.lines.getLinesData();
        if (lines.length === 0) { App.util.showToast('请设置达标线', 'warning'); return; }
        const total = +E.totalStudentsInput.value || 800;
        const coeff = +E.rangeCoefficientInput.value || 0.2;
        const base = getBaseData();
        if (!base) return;

        S.processedResults = [];
        lines.forEach(line => {
            const target = line.target;
            const range = target + total * coeff;
            if (range <= target) { App.util.showToast(`${line.name}: 范围需大于上线人数`, 'warning'); return; }
            const A = target / (range - target);
            const B = 1 / Math.pow(range, A);
            let rows = [];
            if (S.currentMode === 'prediction') {
                const ranks = App.util.rankAvg(base.scores);
                rows = base.originalRows.map((r, idx) => {
                    const classVal = String(r[base.indices.classCol] || '').trim();
                    const nameVal = String(r[base.indices.nameCol] || '').trim();
                    const id = String(r[base.indices.idCol] || '').trim();
                    let prob = 1 - B * Math.pow(ranks[idx], A);
                    if (prob < 0) prob = 0;
                    return { 学号: id, 姓名: nameVal, 班级: classVal, 成绩: base.scores[idx], 原始分名次: ranks[idx], 预测上线概率: prob };
                });
            } else {
                const curRanks = App.util.rankAvg(base.curScores);
                const refRanks = App.util.rankAvg(base.refScores);
                rows = base.matchedRows.map((item, idx) => {
                    const classVal = String(item.curRow[base.curIndices.classCol] || '').trim();
                    const nameVal = String(item.curRow[base.curIndices.nameCol] || '').trim();
                    let prob = 1 - B * Math.pow(refRanks[idx], A);
                    if (prob < 0) prob = 0;
                    return { 学号: item.id, 姓名: nameVal, 班级: classVal, 本次成绩: item.curScore, 本次名次: curRanks[idx], 参考成绩: item.refScore, 参考名次: refRanks[idx], 预测上线概率: prob };
                });
            }
            const classSum = new Map();
            rows.forEach(r => {
                const cls = r.班级;
                if (!classSum.has(cls)) classSum.set(cls, { count: 0, totalProb: 0, qualified: 0 });
                const c = classSum.get(cls);
                c.count++; c.totalProb += r.预测上线概率;
                if (S.currentMode === 'increment' && r.本次名次 <= target) c.qualified++;
            });
            // 对classSummary进行排序
            const sortedClassSum = new Map([...classSum.entries()].sort((a, b) => App.util.naturalCompare(a[0], b[0])));
            S.processedResults.push({
                lineName: line.name, target,
                rows, classSummary: sortedClassSum,
                params: { total, target, coeff, range: Math.round(range * 100) / 100, A: Math.round(A * 1e4) / 1e4, B: Math.round(B * 1e6) / 1e6 }
            });
        });
        if (S.processedResults.length === 0) return;
        App.render.renderLineSelector();
        S.activeLineIndex = 0;
        App.render.selectLine(0);
        E.actionCard.style.display = 'block';
        E.btnCalculate.disabled = false;
        E.btnCalculate.innerHTML = App.util.ICON_REFRESH + '<span>重新分析</span>';
        App.util.showToast('✅ 分析完成', 'success');
    }

    App.analysis = { getCommonIds, getMissingCounts, buildMissingMessage, checkIncrementReady, getBaseData, performCalculation, WARNING_ICON };
})(window.App = window.App || {});
