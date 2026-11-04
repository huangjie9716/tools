        // ============================================================
        //  全局变量
        // ============================================================
        let currentParsedData = null;
        let currentResults = null;

        // ============================================================
        //  开始分析按钮状态管理
        // ============================================================
        function updateAnalyzeButtonState(hasData, hasAnalyzed) {
            const btn = document.getElementById('btnRecalculate');
            if (!btn) return;
            btn.disabled = !hasData;
            if (hasAnalyzed) {
                btn.innerHTML = analyzeIconSvg() + '重新分析';
                btn.classList.remove('pulse');
            } else {
                btn.innerHTML = analyzeIconSvg() + '开始分析';
                btn.classList.toggle('pulse', !!hasData);
            }
        }

// ============================================================
//  重新分析（使用用户输入的阈值）
// ============================================================
function recalculateWithThresholds() {
if (!currentParsedData) {
const msgEl = document.getElementById('thresholdMsg');
msgEl.style.display = 'block';
msgEl.textContent = '⚠️ 请先选择考试。';
setTimeout(() => { msgEl.style.display = 'none'; }, 2500);
return;
}

const highInput = document.getElementById('highThreshold');
const lowInput = document.getElementById('lowThreshold');
let high = parseFloat(highInput.value);
let low = parseFloat(lowInput.value);

if (isNaN(high) || isNaN(low) || high <= 0 || high > 1 || low < 0 || low >= 1) {
const msgEl = document.getElementById('thresholdMsg');
msgEl.style.display = 'block';
msgEl.textContent = '⚠️ 请输入0到1之间的有效数值。';
setTimeout(() => { msgEl.style.display = 'none'; }, 2500);
return;
}
if (high <= low) {
const msgEl = document.getElementById('thresholdMsg');
msgEl.style.display = 'block';
msgEl.textContent = '⚠️ 简单题阈值必须大于难题阈值。';
setTimeout(() => { msgEl.style.display = 'none'; }, 2500);
return;
}

highInput.value = high.toFixed(2);
lowInput.value = low.toFixed(2);

const results = analyzeData(currentParsedData, high, low);
const isFirstRun = !currentResults;
currentResults = results;
renderResults(results);
updateAnalyzeButtonState(true, true);

const statusMsg = document.getElementById('statusMsg');
if (isFirstRun) {
/* 首次分析：结果区已展示表格，不再弹成功提示条 */
statusMsg.className = 'status-msg';
statusMsg.style.display = 'none';
statusMsg.innerHTML = '';
} else {
statusMsg.className = 'status-msg success';
statusMsg.style.display = 'block';
statusMsg.innerHTML = `${checkIconSvg()} 已按新阈值重新分析（简单≥${high}，中档${low}~${high}，难题<${low}）。`;
}
document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
//  应用云端试题数据
// ============================================================
function loadParsedData(parsed, displayName, subLabel) {
currentParsedData = parsed;
currentResults = null;

const highInput = document.getElementById('highThreshold');
const lowInput = document.getElementById('lowThreshold');
let high = parseFloat(highInput.value) || 0.7;
let low = parseFloat(lowInput.value) || 0.3;
if (high <= low) { high = 0.7; low = 0.3; }
highInput.value = high.toFixed(2);
lowInput.value = low.toFixed(2);

// 进入「待开始分析」状态：不自动出结果，等待用户点击「开始分析」
renderReadyState(parsed);
updateAnalyzeButtonState(true, false);

// 就绪状态已在下方的结果区提示，这里不再重复弹提示条
const statusMsg = document.getElementById('statusMsg');
statusMsg.className = 'status-msg';
statusMsg.style.display = 'none';
statusMsg.innerHTML = '';
const nameEl = document.getElementById('cloudExamName');
if (nameEl) nameEl.textContent = displayName;
document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ============================================================
//  初始化
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
renderResults(null);
updateAnalyzeButtonState(false, false);
});

