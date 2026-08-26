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
        //  重新上传功能
        // ============================================================
        function reuploadFile() {
            showReuploadModal();
        }

        // 确认后执行真正的重新上传（清空数据并打开文件选择器）
        function doReupload() {
            const fileInput = document.getElementById('fileInput');
            fileInput.value = '';
            const fileDisplay = document.getElementById('fileDisplay');
            fileDisplay.className = 'file-display no-file';
            fileDisplay.innerHTML = `
                <span class="file-icon">${uploadIconSvg()}</span>
                <span class="placeholder-text">未选择文件 · 支持 .xlsx / .xls 格式</span>
            `;
            const btnReupload = document.getElementById('btnReupload');
            btnReupload.classList.remove('visible');
            const uploadCard = document.getElementById('uploadCard');
            uploadCard.classList.remove('has-file');
            const statusMsg = document.getElementById('statusMsg');
            statusMsg.className = 'status-msg';
            statusMsg.style.display = 'none';
            statusMsg.textContent = '';
            currentParsedData = null;
            currentResults = null;
            renderResults(null);
            updateAnalyzeButtonState(false, false);
            setTimeout(() => fileInput.click(), 150);
        }

        // 重新上传确认弹窗（内部弹窗，替代浏览器 confirm）
        function showReuploadModal() {
            const overlay = document.getElementById('confirmModal');
            if (overlay) overlay.classList.add('active');
        }

        function closeReuploadModal() {
            const overlay = document.getElementById('confirmModal');
            if (overlay) overlay.classList.remove('active');
        }

        function confirmReupload() {
            closeReuploadModal();
            doReupload();
        }

// ============================================================
//  重新分析（使用用户输入的阈值）
// ============================================================
function recalculateWithThresholds() {
if (!currentParsedData) {
const msgEl = document.getElementById('thresholdMsg');
msgEl.style.display = 'block';
msgEl.textContent = '⚠️ 请先上传数据文件。';
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
statusMsg.className = 'status-msg success';
statusMsg.style.display = 'block';
const classCount = results.classNames.filter(c => c !== '全校').length;
if (isFirstRun) {
statusMsg.innerHTML = `${checkIconSvg()} 分析完成！共 ${classCount} 个班级，${results.numQuestions} 道小题。`;
} else {
statusMsg.innerHTML = `${checkIconSvg()} 已按新阈值重新分析（简单≥${high}，中档${low}~${high}，难题<${low}）。`;
}
document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
//  文件上传与解析
// ============================================================
document.getElementById('fileInput').addEventListener('change', function(e) {
const file = this.files[0];
if (!file) return;

const fileDisplay = document.getElementById('fileDisplay');
fileDisplay.className = 'file-display has-file';
fileDisplay.innerHTML = `
<span class="file-icon">${checkIconSvg()}</span>
<div class="file-details">
    <span class="file-name">${escapeHtml(file.name)}</span>
    <span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>
</div>
`;

const btnReupload = document.getElementById('btnReupload');
btnReupload.classList.add('visible');
const uploadCard = document.getElementById('uploadCard');
uploadCard.classList.add('has-file');

const statusMsg = document.getElementById('statusMsg');
statusMsg.className = 'status-msg info';
statusMsg.textContent = '⏳ 正在读取文件...';
statusMsg.style.display = 'block';

const reader = new FileReader();
reader.onload = function(loadEvent) {
try {
const data = new Uint8Array(loadEvent.target.result);
const workbook = XLSX.read(data, { type: 'array' });
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
const parsed = parseExcelData(json);
if (!parsed) {
statusMsg.className = 'status-msg error';
statusMsg.textContent = '❌ 数据格式解析失败，请检查是否符合要求。';
currentParsedData = null;
currentResults = null;
updateAnalyzeButtonState(false, false);
return;
}
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

const classCount = Object.keys(parsed.classData).filter(c => c !== '全校').length;
statusMsg.className = 'status-msg success';
statusMsg.innerHTML = `${checkIconSvg()} 数据读取成功！共 ${classCount} 个班级，${parsed.headers.length} 道小题，请点击「开始分析」。`;
document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
} catch (err) {
console.error(err);
statusMsg.className = 'status-msg error';
statusMsg.textContent = '❌ 文件解析出错：' + err.message;
currentParsedData = null;
currentResults = null;
updateAnalyzeButtonState(false, false);
}
};
reader.onerror = function() {
statusMsg.className = 'status-msg error';
statusMsg.textContent = '❌ 读取文件失败，请重试。';
currentParsedData = null;
currentResults = null;
updateAnalyzeButtonState(false, false);
};
reader.readAsArrayBuffer(file);
});

// ============================================================
//  初始化
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
renderResults(null);
updateAnalyzeButtonState(false, false);
});

// 拖拽上传
const uploadCardEl = document.getElementById('uploadCard');
uploadCardEl.addEventListener('dragover', function(e) {
e.preventDefault();
this.style.borderColor = '#2a5f7a';
this.style.background = '#f8faff';
});
uploadCardEl.addEventListener('dragleave', function(e) {
e.preventDefault();
this.style.borderColor = this.classList.contains('has-file') ? '#b8dfc6' : '#dce3ed';
this.style.background = this.classList.contains('has-file') ? '#fdfeff' : '#fff';
});
uploadCardEl.addEventListener('drop', function(e) {
e.preventDefault();
this.style.borderColor = this.classList.contains('has-file') ? '#b8dfc6' : '#dce3ed';
this.style.background = this.classList.contains('has-file') ? '#fdfeff' : '#fff';
const files = e.dataTransfer.files;
if (files.length > 0) {
const fileInput = document.getElementById('fileInput');
fileInput.files = files;
fileInput.dispatchEvent(new Event('change'));
}
});