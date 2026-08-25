/* ============================================================
   js/utils.js —— 通用工具函数模块
   包含：列名查找、Excel 文件读取、数值格式化、学生表格排序。
   ============================================================ */
(function (global) {
    'use strict';

    // ---- 工具：查找列名 ----
    function findKey(row, patterns) {
        if (!row) return null;
        const keys = Object.keys(row);
        for (let p of patterns) {
            for (let k of keys) {
                if (k.includes(p)) return k;
            }
        }
        return null;
    }

    // ---- 读取文件 ----
    function readFileAsArray(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(sheet);
                    resolve(json);
                } catch (err) {
                    reject('文件解析失败：' + err.message);
                }
            };
            reader.onerror = () => reject('读取文件失败');
            reader.readAsArrayBuffer(file);
        });
    }

    // ---- 格式化数值 ----
    function formatValue(key, val) {
        if (val === undefined || val === null) return '-';
        if (typeof val !== 'number') return val;
        if (key === 'rank1' || key === 'rank2' || key === 'layer1' || key === 'layer2') {
            return val.toFixed(1);
        } else if (key === 'percentile1' || key === 'percentile2') {
            return (val * 100).toFixed(2) + '%';
        } else if (key === 'std1' || key === 'std2' || key === 'raw1' || key === 'raw2' || key === 'predicted2' || key === 'residual' || key === 'residualStd') {
            return val.toFixed(2);
        } else if (key === 'tValue') {
            return val.toFixed(3);
        } else if (key === 'overTwo' || key === 'overOne' || key === 'belowOne' || key === 'belowTwo') {
            return Math.round(val);
        }
        return val;
    }

    // ---- 学生表格排序（与页面展示保持一致） ----
    function sortStudentRows(arr, sortField) {
        const sorted = [...arr];
        if (sortField === 'id') {
            sorted.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
        } else if (sortField === 'rank2') {
            sorted.sort((a, b) => a.rank2 - b.rank2);
        } else if (sortField === 'tValue') {
            sorted.sort((a, b) => b.tValue - a.tValue);
        }
        return sorted;
    }

    // ---- 对外暴露 ----
    global.Utils = {
        findKey,
        readFileAsArray,
        formatValue,
        sortStudentRows
    };

})(window);
