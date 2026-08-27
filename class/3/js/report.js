/* ============================================================
 * 班主任通用成绩分析系统 - 报告模块 (report.js)
 * 班级整体概况、本地分析报告、DeepSeek AI 智能报告（结构化提示词）、
 * Word 报告下载，以及 DeepSeek API Key 的本地存储管理。
 * 导出为全局函数供内联 onclick 调用。
 * ============================================================ */
(function (App) {
    'use strict';

    const S = App.state;
    const { escapeHtml, calcProgress, calcGapWithTotalRank, showToast, CHECK_SVG } = App.utils;
    const { getSubjectIndex, getSubjectData, getLatestIndex, getAllStudents, getFullScore } = App.stateApi;

    // ---- DeepSeek API Key ----
    const STORAGE_KEY = 'deepseek_api_key';
    let savedApiKey = localStorage.getItem(STORAGE_KEY) || '';
    const apiKeyInput = document.getElementById('apiKeyInput'),
        apiStatus = document.getElementById('apiStatus');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        apiStatus.innerHTML = CHECK_SVG + ' 已配置';
        apiStatus.style.color = 'var(--success)';
    }
    function saveApiKey() {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem(STORAGE_KEY, key);
            savedApiKey = key;
            apiStatus.innerHTML = CHECK_SVG + ' 已配置';
            apiStatus.style.color = 'var(--success)';
            showToast('🔑 API Key 已保存');
        } else {
            localStorage.removeItem(STORAGE_KEY);
            savedApiKey = '';
            apiStatus.textContent = '未配置';
            apiStatus.style.color = 'var(--text-secondary)';
            showToast('已清除');
        }
    }

    /* ---------------- 报告数据构建 ---------------- */

    function buildReportData() {
        const students = getAllStudents();
        const latest = getLatestIndex();
        const totalIdx = getSubjectIndex('总分');
        const allSubjects = ['总分', ...S.subjects];

        const subjectStats = {};
        for (const subj of allSubjects) {
            const idx = getSubjectIndex(subj);
            const progressList = [];
            let adv = 0,
                dis = 0;
            const latestScores = [];
            for (const name of students) {
                const d1 = getSubjectData(S.exams[0], name, subj);
                const d2 = getSubjectData(S.exams[latest], name, subj);
                const p = calcProgress(d1.rank, d2.rank);
                if (p != null) progressList.push(p);
                if (d2.score != null) latestScores.push(d2.score);
                if (subj !== '总分') {
                    const stu2 = S.exams[latest] && S.exams[latest].get(name);
                    const totalRank2 = stu2 ? stu2.ranks[totalIdx] ?? null : null;
                    const g = calcGapWithTotalRank(d2.rank, totalRank2, subj);
                    if (g != null) { if (g > 0) adv++; else if (g < 0) dis++; }
                }
            }
            const full = getFullScore(subj) || 0;
            subjectStats[subj] = {
                avgProgress: progressList.length ? Math.round(progressList.reduce((a, b) => a + b, 0) / progressList.length) : null,
                avgLatest: latestScores.length ? Math.round(latestScores.reduce((a, b) => a + b, 0) / latestScores.length * 100) / 100 : null,
                passRate: full ? latestScores.filter(s => s >= full * 0.6).length / latestScores.length : null,
                excellentRate: full ? latestScores.filter(s => s >= full * 0.85).length / latestScores.length : null,
                advCount: adv,
                disCount: dis
            };
        }

        const totalProgressList = [];
        const alerts = [];
        for (const name of students) {
            const d1 = getSubjectData(S.exams[0], name, '总分');
            const d2 = getSubjectData(S.exams[latest], name, '总分');
            const p = calcProgress(d1.rank, d2.rank);
            if (p != null) totalProgressList.push({ name, progress: p, rankFirst: d1.rank, rankLast: d2.rank, scoreFirst: d1.score, scoreLast: d2.score });
            // 趋势预警
            const ranks = [];
            for (let i = 0; i < S.nExams; i++) {
                const stu = S.exams[i] && S.exams[i].get(name);
                ranks.push(stu ? stu.ranks[totalIdx] : null);
            }
            if (ranks.every(r => r != null)) {
                const diffs = [];
                for (let i = 1; i < ranks.length; i++) diffs.push(ranks[i - 1] - ranks[i]);
                const strictlyDown = diffs.every(d => d < 0);
                const maxChange = Math.max(...diffs.map(d => Math.abs(d)));
                if (strictlyDown || maxChange > 20) {
                    alerts.push({ name, ranks, trend: strictlyDown ? '持续退步' : '波动', maxChange });
                }
            }
        }
        totalProgressList.sort((a, b) => b.progress - a.progress);
        alerts.sort((a, b) => b.maxChange - a.maxChange);

        return { totalStudents: students.length, nExams: S.nExams, subjects: S.subjects, subjectStats, totalProgressList, alerts };
    }

    /* ---------------- 本地报告 ---------------- */

    function generateLocalReport() {
        if (!S.analysisStarted) { showToast('请先开始分析'); return; }
        const rd = buildReportData();
        const totalStats = rd.subjectStats['总分'];
        const html = [];
        html.push('<h3>' + rd.nExams + ' 次考试对比报告</h3>');
        html.push(`<p>班级人数：${rd.totalStudents} 人 ｜ 共 ${rd.nExams} 次考试</p><hr>`);
        html.push('<h3>一、班级整体概况（最新一次）</h3>');
        html.push(`<p>总分均分：${totalStats.avgLatest != null ? totalStats.avgLatest : '--'} ｜ 及格率：${totalStats.passRate != null ? Math.round(totalStats.passRate * 100) + '%' : '--'} ｜ 优秀率：${totalStats.excellentRate != null ? Math.round(totalStats.excellentRate * 100) + '%' : '--'} ｜ 平均进退步：${totalStats.avgProgress != null ? totalStats.avgProgress + ' 名' : '--'}</p>`);
        html.push('<h3>二、总分进步最大前5名</h3><table><tr><th>姓名</th><th>进步名次</th></tr>');
        rd.totalProgressList.slice(0, 5).forEach(s => html.push(`<tr><td>${escapeHtml(s.name)}</td><td style="color:var(--success)">+${s.progress}</td></tr>`));
        html.push('</table><h3>三、总分退步最大后5名</h3><table><tr><th>姓名</th><th>退步名次</th></tr>');
        rd.totalProgressList.slice(-5).reverse().forEach(s => html.push(`<tr><td>${escapeHtml(s.name)}</td><td style="color:var(--danger)">${s.progress}</td></tr>`));
        html.push('</table><h3>四、学科进退步</h3><table><tr><th>学科</th><th>最新均分</th><th>平均进退步</th></tr>');
        rd.subjects.forEach(subj => html.push(`<tr><td>${escapeHtml(subj)}</td><td>${rd.subjectStats[subj].avgLatest != null ? rd.subjectStats[subj].avgLatest : '--'}</td><td>${rd.subjectStats[subj].avgProgress != null ? rd.subjectStats[subj].avgProgress + ' 名' : '--'}</td></tr>`));
        html.push('</table><h3>五、优弱势学科（最新一次）</h3><table><tr><th>学科</th><th>优势人数</th><th>弱势人数</th></tr>');
        rd.subjects.forEach(subj => html.push(`<tr><td>${escapeHtml(subj)}</td><td>${rd.subjectStats[subj].advCount}</td><td>${rd.subjectStats[subj].disCount}</td></tr>`));
        html.push('</table>');
        html.push('<h3>六、趋势预警</h3>');
        if (rd.alerts.length) {
            html.push('<table><tr><th>姓名</th><th>趋势</th><th>最大变化</th></tr>');
            rd.alerts.slice(0, 20).forEach(s => html.push(`<tr><td><strong>${escapeHtml(s.name)}</strong></td><td style="color:${s.trend === '持续退步' ? 'var(--danger)' : 'var(--warning)'}">${s.trend}</td><td>${s.maxChange}</td></tr>`));
            html.push('</table><p>💡 建议：重点关注持续退步及波动较大的学生，及时沟通了解原因，调整学习策略。</p>');
        } else {
            html.push('<p>' + CHECK_SVG + ' 未发现明显异常波动学生。</p>');
        }

        const htmlStr = html.join('');
        S.currentReportHTML = htmlStr;
        document.getElementById('reportContent').innerHTML = htmlStr;
        document.getElementById('btnDownloadReport').style.display = 'inline-block';
        showToast('📋 本地分析报告已生成');
    }

    /* ---------------- AI 报告 ---------------- */

    async function generateAIReport() {
        if (!S.analysisStarted) return;
        const apiKey = savedApiKey || apiKeyInput.value.trim();
        if (!apiKey) { showToast('⚠️ 请先配置 API Key'); return; }
        const contentDiv = document.getElementById('reportContent');
        contentDiv.innerHTML = '<div class="report-loading"><span class="spinner"></span>AI 分析中...</div>';
        const btnAI = document.getElementById('btnAIReport');
        const aiLabel = btnAI.querySelector('.ai-label');
        btnAI.disabled = true;
        if (aiLabel) aiLabel.textContent = '分析中...';
        try {
            const prompt = buildAIPrompt();
            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: 2500 })
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error.message);
            S.currentReportHTML = '<h3>🤖 AI 分析报告</h3>' + result.choices[0].message.content.replace(/\n/g, '<br>');
            contentDiv.innerHTML = S.currentReportHTML;
            document.getElementById('btnDownloadReport').style.display = 'inline-block';
            showToast('✅ AI报告生成成功');
        } catch (e) {
            contentDiv.innerHTML = `<div style="color:var(--danger)">AI分析失败：${escapeHtml(e.message)}</div>`;
            showToast('❌ AI分析失败');
        } finally {
            btnAI.disabled = false;
            if (aiLabel) aiLabel.textContent = 'AI智能分析报告 (DeepSeek)';
        }
    }

    /** 构建结构化 AI 提示词 */
    function buildAIPrompt() {
        const rd = buildReportData();
        const summary = {
            班级人数: rd.totalStudents,
            考试次数: rd.nExams,
            总分概况: {
                最新均分: rd.subjectStats['总分'].avgLatest,
                及格率: rd.subjectStats['总分'].passRate,
                优秀率: rd.subjectStats['总分'].excellentRate,
                平均进退步: rd.subjectStats['总分'].avgProgress
            },
            学科概况: rd.subjects.map(subj => ({
                学科: subj,
                最新均分: rd.subjectStats[subj].avgLatest,
                平均进退步: rd.subjectStats[subj].avgProgress,
                优势人数: rd.subjectStats[subj].advCount,
                弱势人数: rd.subjectStats[subj].disCount
            })),
            总分进步前10: rd.totalProgressList.slice(0, 10).map(s => ({ 姓名: s.name, 进步名次: s.progress })),
            总分退步前10: rd.totalProgressList.slice(-10).reverse().map(s => ({ 姓名: s.name, 退步名次: s.progress })),
            趋势预警: rd.alerts.slice(0, 15).map(a => ({ 姓名: a.name, 趋势: a.trend, 最大变化: a.maxChange, 各次排名: a.ranks }))
        };
        return `你是一位经验丰富的初中班主任助理，请根据以下结构化成绩分析数据，生成一份班级成绩分析报告。
要求：
1. 先总结全班整体情况（均分、及格率、优秀率、进退步）。
2. 分学科点评班级强弱（结合各科均分与平均进退步、优弱势人数）。
3. 列出需要重点关注的学生（退步明显、波动大的），并针对每位给出班主任沟通与帮扶建议。
4. 最后给出 3~5 条面向班主任的工作建议。
语言：中文，条理清晰，语气专业而温和，适合直接用于工作总结。

数据（JSON）：${JSON.stringify(summary)}`;
    }

    /** 下载报告为 Word 文档（.doc，保留表格与排版） */
    function downloadReport() {
        if (!S.currentReportHTML) return;
        const bodyHtml = S.currentReportHTML
            .replace(/var\(--success\)/g, '#10b981')
            .replace(/var\(--danger\)/g, '#ef4444')
            .replace(/var\(--warning\)/g, '#f59e0b');
        let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>成绩分析报告</title><style>';
        html += 'table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #cbd5e1;padding:6px 10px;text-align:center;font-size:13px}th{background:#f1f5f9;font-weight:600}';
        html += 'h3{font-size:15px;margin:14px 0 6px;color:#1e293b}p{font-size:13px;line-height:1.8;margin:4px 0}hr{border:none;border-top:1px solid #e2e8f0;margin:8px 0}';
        html += '</style></head><body style="font-family:&quot;Microsoft YaHei&quot;,sans-serif;color:#1e293b">';
        html += '<h1 style="text-align:center;font-size:20px;margin-bottom:4px">成绩分析报告</h1>';
        html += '<p style="text-align:center;color:#888;font-size:12px">生成时间：' + new Date().toLocaleString() + '</p>';
        html += bodyHtml + '</body></html>';
        const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '成绩分析报告.doc';
        a.click();
        showToast('📥 下载成功');
    }

    // 导出到全局（供内联 onclick 调用）
    window.saveApiKey = saveApiKey;
    window.generateLocalReport = generateLocalReport;
    window.generateAIReport = generateAIReport;
    window.downloadReport = downloadReport;

    App.report = {
        buildReportData,
        generateLocalReport,
        generateAIReport,
        downloadReport,
        saveApiKey
    };
})(window.App = window.App || {});
