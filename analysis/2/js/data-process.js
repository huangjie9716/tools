/**
 * data-process.js —— 数据解析与计算（核心逻辑）
 *
 * 重要说明：本模块为《一分一段累计比率T值模型》的数据处理核心，
 *          其中的解析与计算算法保持原始实现，不做任何改动。
 * 对外暴露：window.Data = { parseExcel, getSubjectScores,
 *                           buildGlobalSegments, buildClassData, computeTValues }
 * 依赖：XLSX、window.Utils
 */
(function () {
    'use strict';

    /** 解析 Excel 文件，返回 Promise<{ students, classes, subjects, totalN }> */
    function parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    const firstSheet = wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
                    if (!rows || rows.length < 2) { reject('数据行数不足'); return; }
                    const header = rows[0].map(h => String(h).trim());
                    let idxId=-1, idxName=-1, idxClass=-1, idxTotal=-1;
                    const subjectCols = [];
                    header.forEach((h,i) => {
                        const low = h.toLowerCase();
                        if (low.includes('学号') || low==='id' || low==='序号') idxId=i;
                        else if (low.includes('姓名') || low==='name') idxName=i;
                        else if (low.includes('班级') || low==='class') idxClass=i;
                        else if (low.includes('总分') || low==='total') idxTotal=i;
                    });
                    if (idxId===-1 && header.length>0) idxId=0;
                    if (idxName===-1 && header.length>1) idxName=1;
                    if (idxClass===-1 && header.length>2) idxClass=2;
                    if (idxTotal===-1 && header.length>3) idxTotal=3;
                    const startSub = idxTotal + 1;
                    for (let i=startSub; i<header.length; i++) {
                        if (header[i]) subjectCols.push({ idx:i, name:header[i] });
                    }
                    if (subjectCols.length===0) {
                        for (let i=0; i<header.length; i++) {
                            if (i!==idxId && i!==idxName && i!==idxClass && i!==idxTotal && header[i]) {
                                subjectCols.push({ idx:i, name:header[i] });
                            }
                        }
                    }
                    const students = [];
                    const classSet = new Set();
                    for (let r=1; r<rows.length; r++) {
                        const row = rows[r];
                        if (!row || row.length===0) continue;
                        const hasData = row.some(cell => cell!=='' && cell!==undefined && cell!==null);
                        if (!hasData) continue;
                        const id = String(row[idxId]||'').trim() || `S${r}`;
                        const name = String(row[idxName]||'').trim() || `学生${r}`;
                        const cls = String(row[idxClass]||'').trim() || '未知';
                        let total = parseFloat(row[idxTotal]);
                        if (isNaN(total) || total<0) total = -1;
                        const scores = {};
                        if (total>=0) scores['总分'] = total;
                        subjectCols.forEach(sc => {
                            const val = parseFloat(row[sc.idx]);
                            if (!isNaN(val) && val>=0) scores[sc.name] = val;
                            else scores[sc.name] = -1;
                        });
                        const hasValid = Object.values(scores).some(v => v>=0);
                        if (!hasValid) continue;
                        students.push({ id, name, class: cls, scores });
                        classSet.add(cls);
                    }
                    if (students.length===0) { reject('未找到任何有效分数数据'); return; }
                    const subjects = ['总分', ...subjectCols.map(sc => sc.name)];
                    const classes = Utils.sortClasses(Array.from(classSet));
                    resolve({ students, classes, subjects, totalN: students.length });
                } catch(err) { reject(err.message); }
            };
            reader.onerror = () => reject('读取文件失败');
            reader.readAsArrayBuffer(file);
        });
    }

    /** 取某学科有效成绩列表（无效值剔除） */
    function getSubjectScores(students, subject) {
        return students.map(s => { const val = s.scores[subject]; return (val!==undefined && val>=0) ? Math.round(val) : null; }).filter(v => v!==null);
    }

    /** 构建全校分数段：按分数降序，含 count / cum / ratio(全校累计比率) */
    function buildGlobalSegments(students, subject) {
        const scores = getSubjectScores(students, subject);
        if (scores.length===0) return [];
        const freq = new Map();
        scores.forEach(v => freq.set(v, (freq.get(v)||0)+1));
        const sorted = Array.from(freq.keys()).sort((a,b) => b-a);
        let cum=0; const totalN = scores.length;
        return sorted.map(score => { const count=freq.get(score); cum+=count; return { score, count, cum, ratio: cum/totalN }; });
    }

    /** 构建各班级分数段数据：与全校分数段对齐，含 count / cum / ratio(班级累计比率) */
    function buildClassData(students, globalSegments, subject) {
        const classMap = new Map();
        students.forEach(s => {
            const cls = s.class;
            const val = s.scores[subject];
            if (val===undefined || val<0) return;
            const rounded = Math.round(val);
            if (!classMap.has(cls)) classMap.set(cls, []);
            classMap.get(cls).push(rounded);
        });
        const result = {};
        for (const [cls, scores] of classMap) {
            const totalN = scores.length;
            if (totalN===0) continue;
            const freq = new Map();
            scores.forEach(v => freq.set(v, (freq.get(v)||0)+1));
            const rows = [];
            let cum=0;
            for (const seg of globalSegments) {
                const count = freq.get(seg.score)||0;
                cum += count;
                rows.push({ score: seg.score, count, cum, ratio: totalN>0 ? cum/totalN : 0 });
            }
            result[cls] = { totalN, rows };
        }
        return result;
    }

    /** 计算各分数段 T 值：(班级累计人数 - 期望人数) / 标准差 */
    function computeTValues(globalSegments, classRows, classTotalN) {
        return globalSegments.map((seg,i) => {
            const p = seg.ratio;
            const cumGroup = classRows[i].cum;
            const variance = Math.sqrt(classTotalN * p * (1-p));
            return variance>0 ? (cumGroup - classTotalN*p) / variance : 0;
        });
    }

    window.Data = {
        parseExcel, getSubjectScores, buildGlobalSegments, buildClassData, computeTValues
    };
})();
