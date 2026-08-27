/* ============================================================
 * 背多分 · 消消乐系统 —— 文件解析模块
 * 作用：解析 Excel(.xls/.xlsx)、文本、CSV 名单文件，
 *       以及将设置面板中的文本解析为学生列表。
 * 依赖：XLSX（SheetJS，在 HTML <head> 中通过 CDN 引入）
 * 对外暴露：ReciteGame.parsers
 *   - parseExcelFile(file)            解析 Excel，返回 Promise<students[]>
 *   - parseTextFile(content)          解析文本/CSV，返回 students[]
 *   - parseStudentListFromText(text)  解析设置面板文本框内容，返回 students[]
 * ============================================================ */
(function () {
    'use strict';

    const G = window.ReciteGame;

    // ---------- 解析 Excel ----------
    function parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheet];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                    if (jsonData.length < 2) {
                        reject(new Error('Excel文件至少需要包含表头行和一行数据'));
                        return;
                    }
                    const students = [];
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0) continue;
                        const id = row[0] ? String(row[0]).trim() : '';
                        const name = row[1] ? String(row[1]).trim() : '';
                        if (id && name) {
                            students.push({ id, name });
                        }
                    }
                    if (students.length === 0) {
                        reject(new Error('未找到有效学号与姓名'));
                        return;
                    }
                    resolve(students);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    // ---------- 解析文本 / CSV ----------
    function parseTextFile(content) {
        const lines = content.split(/\r?\n/);
        const students = [];
        for (let line of lines) {
            line = line.trim();
            if (line === '') continue;
            const parts = line.split(/[,\t\s]+/);
            if (parts.length >= 2) {
                const id = parts[0].trim();
                const name = parts.slice(1).join(' ').trim();
                if (id && name) students.push({ id, name });
            }
        }
        return students;
    }

    // ---------- 解析设置面板文本框内容 ----------
    function parseStudentListFromText(text) {
        const lines = text.split(/\r?\n/);
        const students = [];
        for (let line of lines) {
            line = line.trim();
            if (line === '') continue;
            const parts = line.split(/[,\t\s]+/);
            if (parts.length >= 2) {
                const id = parts[0].trim();
                const name = parts.slice(1).join(' ').trim();
                if (id && name) students.push({ id, name });
            }
        }
        return students;
    }

    // ---------- 导出 ----------
    G.parsers = {
        parseExcelFile: parseExcelFile,
        parseTextFile: parseTextFile,
        parseStudentListFromText: parseStudentListFromText,
    };
})();
