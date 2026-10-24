// ============================================================
//  Excel 数据解析（从上传表格提取表头、满分值与各班数据）
// ============================================================

function parseExcelData(json) {
if (!json || json.length < 3) return null;
const headerRow = json[0] || [];

// 收集原始表头，并定位最后一个有内容的表头列，
// 自动去除尾部空白列，避免把模板之外的多余空白列当作题目（题目数量动态匹配）
const rawHeaders = [];
let lastRealIndex = -1;
for (let i = 1; i < headerRow.length; i++) {
const raw = String(headerRow[i] || '').trim();
if (raw !== '') lastRealIndex = rawHeaders.length;
rawHeaders.push(raw !== '' ? raw : `题${i}`);
}
const headers = lastRealIndex >= 0 ? rawHeaders.slice(0, lastRealIndex + 1) : [];
if (headers.length === 0) return null;
const numQuestions = headers.length;

const scoreRow = json[1] || [];
const fullScores = [];
for (let i = 1; i <= numQuestions; i++) {
const val = parseFloat(scoreRow[i]) || 0;
fullScores.push(val);
}

const classData = {};
for (let r = 2; r < json.length; r++) {
const row = json[r] || [];
const className = String(row[0] || '').trim() || `班级${r-1}`;
const scores = [];
for (let i = 1; i <= numQuestions; i++) {
const val = parseFloat(row[i]);
scores.push(isNaN(val) ? 0 : val);
}
const hasData = scores.some(v => v > 0);
if (hasData || className === '全校') {
classData[className] = scores;
}
}
if (!classData['全校']) return null;
return { headers, fullScores, classData };
}