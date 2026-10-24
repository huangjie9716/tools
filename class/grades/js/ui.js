/* ============================================================
 * 班主任通用成绩分析系统 - 界面模块 (ui.js)
 * 学科 Tab、上传槽位与状态、考试次数 UI、学生匹配检查、
 * 以及分析结果区域的重置。
 * ============================================================ */
(function (App) {
    'use strict';

    const S = App.state;
    const { escapeHtml, CHECK_SVG } = App.utils;

    // 常用 DOM 引用（脚本位于 </body> 前，此时 DOM 已就绪）
    const analyzeBtn = document.getElementById('analyzeBtn');
    const readyIndicator = document.getElementById('readyIndicator');
    const dataArea = document.getElementById('dataArea');
    const emptyHint = document.getElementById('emptyHint');
    const mismatchWarning = document.getElementById('mismatchWarning');
    const mismatchText = document.getElementById('mismatchText');

    // 6 个上传槽位的 DOM 引用
    const uploadBtns = [];
    const statusBadges = [];
    for (let i = 1; i <= S.maxExams; i++) {
        uploadBtns.push(document.getElementById('uploadBtn' + i));
        statusBadges.push(document.getElementById('statusBadge' + i));
    }

    /** 重建学科 Tab（始终以“总分”为第一个） */
    function buildSubjectTabsUI() {
        const container = document.getElementById('subjectTabs');
        let html = '<button class="subject-tab active" data-subject="总分">总分</button>';
        for (const subj of S.subjects) {
            html += `<button class="subject-tab" data-subject="${escapeHtml(subj)}">${escapeHtml(subj)}</button>`;
        }
        container.innerHTML = html;
        S.currentSubject = '总分';
    }

    /** 重置分析结果区域与相关状态 */
    function resetAnalysis() {
        S.analysisStarted = false;
        dataArea.classList.remove('visible');
        emptyHint.style.display = 'block';
        S.searchQuery = '';
        document.getElementById('studentSearch').value = '';
        document.getElementById('clearSearch').classList.remove('visible');
        document.getElementById('reportContent').innerHTML = '点击上方按钮生成分析报告...';
        document.getElementById('btnDownloadReport').style.display = 'none';
        S.currentReportHTML = '';
        S.currentSort = 'totalRank';
        S.mismatchInfo = null;
        mismatchWarning.classList.remove('visible');
        App.tables && App.tables.destroyCharts && App.tables.destroyCharts();
        buildSubjectTabsUI();
        document.querySelectorAll('#sortGroup .sort-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('#sortGroup .sort-btn[data-sort="totalRank"]')?.classList.add('active');
        applyUI();
    }

    /** 根据考试次数切换上传槽位可见性 */
    function applyUI() {
        for (let i = 0; i < S.maxExams; i++) {
            document.getElementById('uploadGroup' + (i + 1)).style.display =
                i < S.nExams ? 'flex' : 'none';
        }
        // 更新槽位标签
        for (let i = 0; i < S.maxExams; i++) {
            const label = document.querySelector('#uploadGroup' + (i + 1) + ' .upload-label');
            if (label) label.textContent = '第' + (i + 1) + '次考试';
        }
        // 更新次数选择 tab 样式
        document.querySelectorAll('#examCountTabs .mode-tab').forEach(t =>
            t.classList.toggle('active', parseInt(t.dataset.count, 10) === S.nExams));
    }

    /** 更新上传状态徽章与分析按钮可用性 */
    function updateUploadStatus() {
        for (let i = 0; i < S.maxExams; i++) {
            const btn = uploadBtns[i],
                badge = statusBadges[i];
            if (btn && badge) {
                const loaded = S.loaded[i] === true;
                if (loaded) {
                    btn.classList.add('loaded');
                    badge.textContent = '已上传';
                    badge.className = 'status-badge success';
                } else {
                    btn.classList.remove('loaded');
                    badge.textContent = '未上传';
                    badge.className = 'status-badge waiting';
                }
            }
        }
        const ready = S.loaded.length >= S.nExams && S.loaded.slice(0, S.nExams).every(Boolean);
        if (ready) {
            analyzeBtn.disabled = false;
            analyzeBtn.classList.add('ready');
            readyIndicator.textContent = '数据就绪，可以开始分析';
            readyIndicator.className = 'ready-indicator ready';
        } else {
            analyzeBtn.disabled = true;
            analyzeBtn.classList.remove('ready');
            readyIndicator.textContent = '请先上传成绩';
            readyIndicator.className = 'ready-indicator';
        }
    }

    /** 检查 N 次考试的学生姓名是否匹配，返回是否完全匹配 */
    function checkStudentMatch() {
        const sets = [];
        for (let i = 0; i < S.nExams; i++) sets.push(new Set(S.exams[i] ? S.exams[i].keys() : []));
        const all = new Set();
        sets.forEach(s => s.forEach(n => all.add(n)));
        const presentAll = [...all].filter(n => sets.every(s => s.has(n)));
        const mismatches = [];
        for (let i = 0; i < S.nExams; i++) {
            const missing = [...all].filter(n => !sets[i].has(n));
            if (missing.length) mismatches.push(`第${i + 1}次考试缺少：${missing.join('、')}`);
        }
        if (mismatches.length > 0) {
            S.mismatchInfo = {
                matchedStudents: presentAll,
                allMismatches: mismatches
            };
            mismatchText.innerHTML = '⚠️ 学生姓名匹配不成功！' + mismatches.join('；') +
                '。建议检查并重新上传成绩文件。已自动排除不匹配学生继续分析。';
            mismatchWarning.classList.add('visible');
            return false;
        } else {
            S.mismatchInfo = null;
            mismatchWarning.classList.remove('visible');
            return true;
        }
    }

    /* ---------------- 网页内对话框 ---------------- */

    /** 显示通用网页内对话框 */
    function showDialog(opts) {
        const overlay = document.getElementById('appDialogOverlay');
        if (!overlay) return;
        document.getElementById('appDialogTitle').textContent = opts.title || '';
        document.getElementById('appDialogBody').innerHTML = opts.html || '';
        const actions = document.getElementById('appDialogActions');
        actions.innerHTML = '';
        (opts.buttons || []).forEach(b => {
            const btn = document.createElement('button');
            btn.className = 'btn-report ' + (b.className || '');
            btn.innerHTML = b.text || '';
            btn.addEventListener('click', () => { if (b.onClick) b.onClick(); });
            actions.appendChild(btn);
        });
        overlay.style.display = 'flex';
    }

    /** 隐藏网页内对话框 */
    function hideDialog() {
        const overlay = document.getElementById('appDialogOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    // 点击遮罩或按 ESC 关闭对话框
    document.getElementById('appDialogOverlay').addEventListener('click', e => {
        if (e.target === document.getElementById('appDialogOverlay')) hideDialog();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideDialog(); });

    /** 上传完成后的数据摘要提示（网页内弹窗） */
    function showUploadSummaryDialog() {
        const totalStudents = new Set();
        for (let i = 0; i < S.nExams; i++) {
            const m = S.exams[i];
            if (m) m.forEach((_, k) => totalStudents.add(k));
        }
        const sets = [];
        for (let i = 0; i < S.nExams; i++) sets.push(new Set(S.exams[i] ? S.exams[i].keys() : []));
        const presentAll = [...totalStudents].filter(n => sets.every(s => s.has(n)));
        const missingParts = [];
        for (let i = 0; i < S.nExams; i++) {
            const missing = [...totalStudents].filter(n => !sets[i].has(n));
            if (missing.length) {
                const names = missing.slice(0, 10).join('、') + (missing.length > 10 ? ' 等' : '');
                missingParts.push(`第${i + 1}次考试缺少：${names}（${missing.length} 人）`);
            }
        }
        let html = `<p>${CHECK_SVG} 已收到 <b>${S.nExams}</b> 次考试成绩，共 <b>${totalStudents.size}</b> 名学生，识别出 <b>${S.subjects.length}</b> 个学科：${escapeHtml(S.subjects.join('、'))}。</p>`;
        if (missingParts.length) {
            html += `<div class="dialog-warn">⚠️ 部分学生成绩有缺失：<br>${missingParts.join('<br>')}<br>系统将只保留 ${S.nExams} 次考试都有的 <b>${presentAll.length}</b> 名学生进行分析。</div>`;
        } else {
            html += `<p style="color:var(--success)">学生名单完全一致，可放心分析。</p>`;
        }
        showDialog({
            title: '成绩数据已就绪',
            html,
            buttons: [
                { text: '稍后再说', onClick: hideDialog, className: '' },
                { text: '设置满分并分析', onClick: () => { hideDialog(); showFullScoreDialog({ onSave: () => { if (App.runAnalysis) App.runAnalysis(); } }); }, className: 'success' }
            ]
        });
    }

    /** 各科满分设置对话框（动态列出检测到的学科与总分） */
    function showFullScoreDialog(opts) {
        const subjects = ['总分', ...S.subjects];
        let rows = '';
        for (const subj of subjects) {
            const val = S.fullScores[subj] || App.stateApi.getFullScore(subj);
            rows += `<div class="full-score-row"><span class="full-score-name">${escapeHtml(subj)}</span><input type="number" min="1" max="2000" step="1" class="full-score-input" data-subj="${escapeHtml(subj)}" value="${val}"></div>`;
        }
        showDialog({
            title: '设置各科满分',
            html: `<p>已自动识别 <b>${S.subjects.length}</b> 个学科。请为每科设置<b>满分值</b>，用于计算<b>及格率（≥60%）</b>与<b>优秀率（≥85%）</b>。数值已按数据自动估算，可直接修改后保存。</p><div class="full-score-grid">${rows}</div>`,
            buttons: [
                { text: '取消', onClick: hideDialog, className: '' },
                {
                    text: '保存并开始分析',
                    onClick: () => {
                        let invalid = false;
                        document.querySelectorAll('.full-score-input').forEach(inp => {
                            const subj = inp.dataset.subj;
                            const v = parseInt(inp.value, 10);
                            if (v >= 1 && v <= 2000) {
                                S.fullScores[subj] = v;
                                inp.classList.remove('invalid');
                            } else {
                                delete S.fullScores[subj];
                                inp.value = App.stateApi.getFullScore(subj);
                                inp.classList.add('invalid');
                                invalid = true;
                            }
                        });
                        if (invalid) {
                            App.utils.showToast('⚠️ 满分需为 1~2000 的整数，已恢复默认值，请重新填写');
                            return;
                        }
                        App.parsing.saveFullScores();
                        hideDialog();
                        if (opts && opts.onSave) opts.onSave();
                    },
                    className: 'success'
                }
            ]
        });
    }

    App.ui = {
        buildSubjectTabsUI,
        resetAnalysis,
        applyUI,
        updateUploadStatus,
        checkStudentMatch,
        showDialog,
        hideDialog,
        showUploadSummaryDialog,
        showFullScoreDialog
    };
})(window.App = window.App || {});
