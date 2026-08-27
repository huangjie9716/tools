/* ============================================================
 * 班主任通用成绩分析系统 - 文件解析模块 (parsing.js)
 * 负责 2~6 份成绩文件的读取、学科结构识别、数据解析、
 * 拖拽上传，以及数据的本地持久化（localStorage 自动恢复）。
 * ============================================================ */
(function (App) {
    'use strict';

    const S = App.state;
    const { showToast } = App.utils;

    const STORAGE_KEY = 'ga_multi_exam_data_v1';
    const SCORE_KEY = 'ga_full_scores_v1';

    /**
     * 识别学科结构。
     * 格式约定：第一列姓名，中间各科（分数、排名交替），最后两列为总分、总分排名。
     * 列数 = 学科数 * 2 + 3。
     */
    function detectSubjectStructure(headerRow, dataRows) {
        const totalCols = headerRow ? headerRow.length : (dataRows && dataRows.length > 0 ? dataRows[0].length : 0);
        if (totalCols < 5) return [];
        const subjectCount = (totalCols - 3) / 2;
        if (subjectCount < 1 || !Number.isInteger(subjectCount)) return [];
        const detectedSubjects = [];
        if (headerRow && headerRow.length >= totalCols) {
            for (let i = 1; i < totalCols - 2; i += 2) {
                let name = String(headerRow[i] || '').trim();
                name = name.replace(/[\s]*(成绩|分数|得分|科目|学科)$/g, '');
                if (!name || name === '') name = '学科' + (detectedSubjects.length + 1);
                detectedSubjects.push(name);
            }
        } else {
            for (let i = 0; i < subjectCount; i++) {
                detectedSubjects.push('学科' + (i + 1));
            }
        }
        return detectedSubjects;
    }

    /** 将二维数组解析为 Map<姓名, {scores, ranks}> */
    function parseRawDataDynamic(rawArray, expectedSubjects) {
        const map = new Map();
        const totalCols = expectedSubjects.length * 2 + 3;
        for (const row of rawArray) {
            if (!row || row.length < totalCols) continue;
            const name = String(row[0] || '').trim();
            if (!name || name === '姓名' || name === '学生姓名') continue;
            const scores = [];
            const ranks = [];
            for (let j = 0; j < expectedSubjects.length; j++) {
                const scoreIdx = 1 + j * 2;
                const rankIdx = 1 + j * 2 + 1;
                const sv = scoreIdx < row.length ? parseFloat(row[scoreIdx]) : 0;
                const rv = rankIdx < row.length ? parseInt(row[rankIdx]) : 9999;
                scores.push(isNaN(sv) ? 0 : sv);
                ranks.push(isNaN(rv) ? 9999 : rv);
            }
            const totalScoreIdx = totalCols - 2;
            const totalRankIdx = totalCols - 1;
            const ts = totalScoreIdx < row.length ? parseFloat(row[totalScoreIdx]) : 0;
            const tr = totalRankIdx < row.length ? parseInt(row[totalRankIdx]) : 9999;
            scores.push(isNaN(ts) ? 0 : ts);
            ranks.push(isNaN(tr) ? 9999 : tr);
            map.set(name, { scores, ranks });
        }
        return map;
    }

    /** 处理文件上传（index: 0~nExams-1 对应第几次考试） */
    function handleFileUpload(file, index) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                let workbook;
                try {
                    workbook = XLSX.read(data, { type: 'array', cellDates: false, cellText: true });
                } catch (xlsErr) {
                    workbook = XLSX.read(data, { type: 'array', cellDates: false, cellText: true, raw: true });
                }
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, {
                    header: 1,
                    defval: '',
                    raw: true,
                    blankrows: false
                });
                if (json.length < 2) { showToast('⚠️ 文件数据不足'); return; }
                const firstRow = json[0];
                const firstCell = String(firstRow[0] || '').trim();
                let headerRow = null;
                let dataStartIdx = 0;
                if (firstCell === '姓名' || firstCell === '学生姓名' || firstCell.includes('姓名')) {
                    headerRow = firstRow;
                    dataStartIdx = 1;
                }
                const dataRows = json.slice(dataStartIdx).filter(row => {
                    const fc = String(row[0] || '').trim();
                    return fc && fc !== '姓名' && fc !== '学生姓名';
                });
                if (!dataRows.length) { showToast('⚠️ 无有效数据'); return; }
                const detectedSubjects = detectSubjectStructure(headerRow, dataRows);
                if (detectedSubjects.length === 0) {
                    showToast('⚠️ 无法识别学科结构，请检查文件格式（姓名+学科分数/排名交替+总分+总分排名）');
                    return;
                }
                if (S.subjects.length === 0) {
                    S.subjects = [...detectedSubjects];
                } else if (JSON.stringify(S.subjects) !== JSON.stringify(detectedSubjects)) {
                    showToast('⚠️ 学科结构与之前不一致，将以第一个文件结构为准继续解析。');
                }
                const map = parseRawDataDynamic(dataRows, S.subjects);
                S.exams[index] = map;
                S.loaded[index] = true;
                saveToStorage();
                showToast(`✅ 第${index + 1}次考试 ${map.size} 人${index === 0 ? '，识别学科：' + S.subjects.join('、') : ''}`);
                if (S.analysisStarted) App.ui.resetAnalysis();
                App.ui.buildSubjectTabsUI();
                App.ui.updateUploadStatus();
                // 全部上传完成后，弹出网页内数据摘要提示
                if (!S.analysisStarted && S.loaded.slice(0, S.nExams).every(Boolean)) {
                    App.ui.showUploadSummaryDialog();
                }
            } catch (err) {
                console.error(err);
                showToast('❌ 解析失败：' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    /* ---------------- 本地持久化 ---------------- */

    /** 将当前数据保存到 localStorage（仅本机） */
    function saveToStorage() {
        try {
            const exams = S.exams.map(map => {
                const o = {};
                if (map) map.forEach((v, k) => { o[k] = v; });
                return o;
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                nExams: S.nExams,
                subjects: S.subjects,
                loaded: S.loaded,
                exams
            }));
        } catch (e) {
            console.error('保存失败', e);
            showToast('⚠️ 本地保存失败（不影响本次分析）');
        }
    }

    /** 从 localStorage 恢复上次数据，返回是否恢复成功 */
    function restoreFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data || !data.exams || !data.exams.length) return false;
            const n = Math.max(2, Math.min(S.maxExams, parseInt(data.nExams, 10) || data.exams.length));
            S.nExams = n;
            S.subjects = data.subjects || [];
            S.exams = [];
            S.loaded = [];
            for (let i = 0; i < n; i++) {
                const obj = data.exams[i];
                if (obj && typeof obj === 'object' && Object.keys(obj).length) {
                    const map = new Map();
                    for (const [name, rec] of Object.entries(obj)) map.set(name, rec);
                    S.exams.push(map);
                    S.loaded.push(true);
                } else {
                    S.exams.push(null);
                    S.loaded.push(false);
                }
            }
            return true;
        } catch (e) {
            console.error('恢复数据失败', e);
            return false;
        }
    }

    /** 清除本地存储 */
    function clearStorage() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    }

    /** 读取各科满分设置 */
    function loadFullScores() {
        try {
            const raw = localStorage.getItem(SCORE_KEY);
            if (raw) Object.assign(S.fullScores, JSON.parse(raw));
        } catch (e) { console.error('读取满分设置失败', e); }
    }

    /** 保存各科满分设置 */
    function saveFullScores() {
        try { localStorage.setItem(SCORE_KEY, JSON.stringify(S.fullScores)); } catch (e) { /* ignore */ }
    }

    /* ---------------- 拖拽上传 ---------------- */

    function setupDragDrop() {
        const zone = document.querySelector('.upload-section');
        if (!zone) return;
        ['dragover', 'dragenter'].forEach(ev => {
            zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag-over'); });
        });
        zone.addEventListener('dragleave', e => {
            if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files)
                .filter(f => /\.(xlsx|xls|csv)$/i.test(f.name));
            if (!files.length) { showToast('⚠️ 请拖入 .xlsx / .xls / .csv 文件'); return; }
            // 填入第一个空位开始
            const slots = [];
            for (let i = 0; i < S.nExams; i++) if (!S.loaded[i]) slots.push(i);
            if (!slots.length) { showToast('⚠️ 所有考试槽位都已上传，请先清空再拖入'); return; }
            files.slice(0, slots.length).forEach((f, idx) => handleFileUpload(f, slots[idx]));
            if (files.length > slots.length) showToast('⚠️ 文件多于空槽位，仅处理前 ' + slots.length + ' 个');
        });
    }

    // 上传按钮事件绑定
    for (let i = 1; i <= S.maxExams; i++) {
        document.getElementById('fileInput' + i).addEventListener('change', e => {
            if (e.target.files[0]) handleFileUpload(e.target.files[0], i - 1);
        });
    }

    App.parsing = {
        detectSubjectStructure,
        parseRawDataDynamic,
        handleFileUpload,
        saveToStorage,
        restoreFromStorage,
        clearStorage,
        loadFullScores,
        saveFullScores,
        setupDragDrop
    };
})(window.App = window.App || {});
