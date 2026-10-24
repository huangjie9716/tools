/* ============================================================
 * 班主任通用成绩分析系统 - 状态管理模块 (state.js)
 * 支持 2~6 次考试的多次对比：集中管理考试次数、N 份成绩数据、
 * 学科列表、分析状态与通用数据读取函数。
 * 其他模块通过 App.state 读状态，通过 App.stateApi 调方法。
 * ============================================================ */
(function (App) {
    'use strict';

    const MAX_EXAMS = 6;

    // 全局共享状态（所有模块通过 App.state 读写）
    const S = {
        // 本次分析的考试次数（2~6）
        nExams: 3,
        // 全局学科列表（不含总分），由首个上传文件决定
        subjects: [],
        // N 份考试数据，每个元素为 Map<姓名, {scores, ranks}>
        exams: [],
        // N 份考试是否已上传
        loaded: [],
        // 分析状态
        analysisStarted: false,
        currentSubject: '总分',
        currentSort: 'totalRank',
        searchQuery: '',
        currentReportHTML: '',
        mismatchInfo: null,
        // 各科满分（用于及格率/优秀率/分数段），随检测到的学科动态设置
        fullScores: {},
        maxExams: MAX_EXAMS
    };

    /** 确保槽位数组长度与 nExams 一致（保留已上传数据） */
    function ensureSlots() {
        while (S.exams.length < S.nExams) { S.exams.push(null); S.loaded.push(false); }
    }

    /** 设置考试次数（2~6），保留已上传数据 */
    function setExamCount(n) {
        n = Math.max(2, Math.min(MAX_EXAMS, parseInt(n, 10) || 3));
        if (n === S.nExams) return;
        S.nExams = n;
        ensureSlots();
        App.ui.resetAnalysis();
        App.ui.updateUploadStatus();
        App.ui.applyUI();
        // 更新次数选择 tab 样式
        document.querySelectorAll('#examCountTabs .mode-tab').forEach(t =>
            t.classList.toggle('active', parseInt(t.dataset.count, 10) === n));
    }

    /** 清空所有数据（含本地存储） */
    function clearAllData() {
        S.exams = new Array(S.nExams).fill(null);
        S.loaded = new Array(S.nExams).fill(false);
        S.subjects = [];
        App.ui.resetAnalysis();
        App.ui.updateUploadStatus();
        App.utils.showToast('数据已清空，请重新上传文件');
    }

    /** 获取学科在数组中的索引（'总分' 排在最后） */
    function getSubjectIndex(subject) {
        if (subject === '总分') return S.subjects.length;
        return S.subjects.indexOf(subject);
    }

    /** 读取某学生在某学科的成绩与排名 */
    function getSubjectData(examMap, name, subject) {
        const student = examMap && examMap.get(name);
        if (!student) return { score: null, rank: null };
        const idx = getSubjectIndex(subject);
        if (idx === -1) return { score: null, rank: null };
        return { score: student.scores[idx], rank: student.ranks[idx] };
    }

    /** 最后一次考试的索引 */
    function getLatestIndex() {
        return S.nExams - 1;
    }

    /** 获取参与分析的全部学生姓名（有姓名不匹配时取交集，仅统计当前考试次数） */
    function getAllStudents() {
        if (S.mismatchInfo && S.mismatchInfo.matchedStudents) return S.mismatchInfo.matchedStudents;
        const s = new Set();
        for (let i = 0; i < S.nExams; i++) {
            const exam = S.exams[i];
            if (exam) exam.forEach((_, k) => s.add(k));
        }
        return Array.from(s);
    }

    /** 获取某学科满分：优先使用已设置值，否则按观察到的最高分向上取整估算 */
    function getFullScore(subject) {
        if (S.fullScores[subject]) return S.fullScores[subject];
        const idx = getSubjectIndex(subject);
        let max = 0;
        for (let i = 0; i < S.nExams; i++) {
            const exam = S.exams[i];
            if (exam) exam.forEach(stu => {
                if (stu && stu.scores[idx] != null && stu.scores[idx] > max) max = stu.scores[idx];
            });
        }
        if (max <= 0) return 100;
        return Math.ceil(max / 10) * 10;
    }

    App.state = S;
    App.stateApi = {
        setExamCount,
        ensureSlots,
        clearAllData,
        getSubjectIndex,
        getSubjectData,
        getLatestIndex,
        getAllStudents,
        getFullScore
    };
})(window.App = window.App || {});
