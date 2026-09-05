(function () {
    'use strict';

    // ---------- 默认演示名单（可用“上传名单”文件替换） ----------
    const DEFAULT_NAMES = [
        '张伟', '王芳', '李娜', '刘洋', '陈静', '杨帆', '赵磊', '黄海', '周洁',
        '吴桐', '徐明', '孙悦', '赵云', '钱进', '孙策', '李雷', '韩梅', '杨柳', '许仙'
    ];

    // ---------- 音效 ----------
    const SPIN_AUDIO_URL = 'https://pub-3827e3697a0b44428ab555d41c8d38f3.r2.dev/rollback/back3.mp3';
    const SELECT_AUDIO_URL = 'https://pub-3827e3697a0b44428ab555d41c8d38f3.r2.dev/rollback/select3.mp3';
    let spinAudio = null;
    let selectAudio = null;
    let spinLoading = false;
    let selectLoading = false;
    let spinWantPlay = false;
    let selectWantPlay = false;

    // 音效本地缓存：首次获取后存入 localStorage，之后每次打开直接复用，不重复请求
    // 保存为 audio/mpeg 的 base64；若写入失败（超出配额等）自动回退为本次会话内缓存
    function loadAudioCached(url, cacheKey, done) {
        // 1) 命中本地缓存
        let cached = null;
        try { cached = localStorage.getItem(cacheKey); } catch (e) { cached = null; }
        if (cached) {
            try {
                const bin = atob(cached);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                const audio = new Audio(URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })));
                done(audio);
                return;
            } catch (e) {}
        }

        // 2) 联网获取一次
        fetch(url).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.arrayBuffer();
        }).then(function (buf) {
            const bytes = new Uint8Array(buf);
            const audio = new Audio(URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })));
            // 尝试写入本地缓存（分段转换避免栈溢出；超配额则静默跳过）
            try {
                let bin = '';
                const step = 0x8000;
                for (let i = 0; i < bytes.length; i += step) {
                    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
                }
                localStorage.setItem(cacheKey, btoa(bin));
            } catch (e) {}
            done(audio);
        }).catch(function () {
            // 网络/跨域失败：退回直接播放（浏览器自身的 HTTP 缓存仍会尽量复用）
            const audio = new Audio(url);
            audio.preload = 'auto';
            done(audio);
        });
    }

    function ensureAudio(kind) {
        if (kind === 'spin') {
            if (spinAudio || spinLoading) return;
            spinLoading = true;
            loadAudioCached(SPIN_AUDIO_URL, 'slotAudio_back3_v1', function (a) {
                spinLoading = false;
                if (!a) return;
                a.loop = true;
                spinAudio = a;
                if (spinWantPlay) { spinWantPlay = false; doPlaySpin(); }
            });
        } else {
            if (selectAudio || selectLoading) return;
            selectLoading = true;
            loadAudioCached(SELECT_AUDIO_URL, 'slotAudio_select3_v1', function (a) {
                selectLoading = false;
                if (!a) return;
                selectAudio = a;
                if (selectWantPlay) { selectWantPlay = false; doPlaySelect(); }
            });
        }
    }

    function doPlaySpin() {
        if (spinAudio) {
            try { spinAudio.currentTime = 0; } catch (e) {}
            const p = spinAudio.play();
            if (p && p.catch) p.catch(function () {});
        }
    }
    function playSpinSound() {
        if (!spinAudio) { ensureAudio('spin'); spinWantPlay = true; return; }
        doPlaySpin();
    }
    function stopSpinSound() {
        if (spinAudio) { try { spinAudio.pause(); } catch (e) {} }
    }
    function doPlaySelect() {
        if (selectAudio) {
            try { selectAudio.currentTime = 0; } catch (e) {}
            const p = selectAudio.play();
            if (p && p.catch) p.catch(function () {});
        }
    }
    function playSelectSound() {
        if (!selectAudio) { ensureAudio('select'); selectWantPlay = true; return; }
        doPlaySelect();
    }

    // ---------- 状态 ----------
    let names = [...DEFAULT_NAMES];   // 学生名单（默认演示名单，可上传替换）
    let history = [];        // 最近点名记录
    let isSpinning = false;  // 是否旋转中
    let timer = null;        // 高亮跳动定时器
    let currentIndex = -1;   // 当前聚光灯下标
    let winnerIndex = -1;    // 最终中奖者下标

    // ---------- DOM ----------
    const nameGrid = document.getElementById('nameGrid');
    const btnUpload = document.getElementById('btnUpload');
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    const btnFs = document.getElementById('btnFs');
    const fileInput = document.getElementById('fileInput');
    const countText = document.getElementById('countText');
    const historyChips = document.getElementById('historyChips');
    const toast = document.getElementById('toast');

    // ---------- 工具 ----------
    function escapeHTML(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    let toastTimer = null;
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
    }

    // ---------- 渲染 ----------
    function renderGrid() {
        if (names.length === 0) {
            nameGrid.innerHTML =
                '<div class="empty-hint">📂 请先上传学生名单<br>' +
                '<small>点下方「📂 上传名单」选择 Excel / .csv / .txt 文件<br>' +
                '第一行为表头，其后每行（Excel 为 A 列）一名学生</small></div>';
            nameGrid.style.fontSize = '';
        } else {
            let html = '';
            names.forEach(function (n, i) {
                html += '<div class="name-block" data-index="' + i + '">' + escapeHTML(n) + '</div>';
            });
            nameGrid.innerHTML = html;
            scheduleFit();   // 根据屏幕大小自动计算字号
        }
        updateMeta();
    }

    function clearHighlights() {
        const blocks = nameGrid.children;
        for (let i = 0; i < blocks.length; i++) {
            blocks[i].classList.remove('active', 'winner');
        }
    }

    function updateMeta() {
        countText.textContent = names.length + ' 人';
        syncButtons();
    }

    function syncButtons() {
        btnStart.disabled = isSpinning || names.length === 0;
        btnStop.disabled = !isSpinning;
        btnUpload.disabled = isSpinning;
        btnStart.textContent = isSpinning ? '⏳ 点名中…' : '▶ 开始点名';
    }

    function updateHistory() {
        if (history.length === 0) {
            historyChips.innerHTML = '<span class="history-empty">暂无</span>';
            return;
        }
        let html = '';
        history.slice(0, 12).forEach(function (n) {
            html += '<span class="history-item">' + escapeHTML(n) + '</span>';
        });
        historyChips.innerHTML = html;
    }

    // ---------- 上传名单（单列：第一行表头，其后每行/每格一名学生） ----------
    const XLSX_LIB_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    // 本地记忆键：保存最近一次成功导入的名单，下次打开自动恢复
    const STORAGE_KEY = 'slotRoster_v1';

    // 提交名单并复位状态，同时写入本地记忆
    function commitRoster(list, source) {
        if (!list.length) return false;
        if (isSpinning) stopSpin(true);   // 静默停止，不播选中音效
        names = list;
        history = [];
        currentIndex = -1;
        winnerIndex = -1;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                names: names,
                source: source || '',
                savedAt: Date.now()
            }));
        } catch (e) {}
        updateHistory();
        renderGrid();
        return true;
    }

    // 解析 .txt / .csv（按行读取，跳过表头）
    function loadRosterFromText(text, source) {
        text = text.replace(/^\uFEFF/, '');   // 去掉 BOM
        const lines = text.split(/\r\n|\r|\n/);

        const list = [];
        const seen = {};
        for (let i = 1; i < lines.length; i++) {   // 跳过第一行表头
            let n = lines[i].trim();
            if (n.length >= 2 && (n[0] === '"' || n[0] === "'") && n[n.length - 1] === n[0]) {
                n = n.slice(1, -1).trim();   // 去掉可能的引号包裹
            }
            if (!n || seen[n]) continue;
            seen[n] = true;
            list.push(n);
        }

        if (!commitRoster(list, source)) {
            showToast('⚠️ 未读取到学生姓名，请检查文件（第一行为表头）');
        } else {
            showToast('已导入 ' + list.length + ' 名学生');
        }
    }

    // 解析 Excel：取第一个工作表，读 A 列，跳过表头
    function loadRosterFromRows(rows, source) {
        const list = [];
        const seen = {};
        for (let i = 1; i < rows.length; i++) {   // 跳过第一行表头
            const raw = rows[i];
            let cell = Array.isArray(raw) ? raw[0] : raw;
            if (cell === undefined || cell === null) cell = '';
            let n = String(cell).trim();
            if (!n || seen[n]) continue;
            seen[n] = true;
            list.push(n);
        }

        if (!commitRoster(list, source)) {
            showToast('⚠️ 未读取到学生姓名，请检查 Excel（第一行为表头，A 列填写）');
        } else {
            showToast('已从 Excel 导入 ' + list.length + ' 名学生');
        }
    }

    function isExcelFile(file) {
        const name = (file.name || '').toLowerCase();
        if (/\.(txt|csv|tsv)$/.test(name)) return false;
        if (/\.(xlsx|xls|xlsm|xlsb)$/.test(name)) return true;
        const mime = (file.type || '').toLowerCase();
        return [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/vnd.ms-excel.sheet.macroenabled.12',
            'application/vnd.ms-excel.sheet.binary.macroenabled.12'
        ].indexOf(mime) !== -1;
    }

    // 按需加载 SheetJS 解析库（仅上传 Excel 时才联网）
    function ensureXlsxLib(cb) {
        if (typeof XLSX !== 'undefined') { cb(); return; }
        const s = document.createElement('script');
        s.src = XLSX_LIB_URL;
        s.onload = cb;
        s.onerror = function () { showToast('⚠️ Excel 解析库加载失败，请检查网络后重试'); };
        document.head.appendChild(s);
    }

    function handleFile(file) {
        if (!file) return;

        if (isExcelFile(file)) {
            ensureXlsxLib(function () {
                const reader = new FileReader();
                reader.onload = function () {
                    try {
                        const data = new Uint8Array(reader.result);
                        const wb = XLSX.read(data, { type: 'array' });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        if (!ws) { showToast('⚠️ Excel 中没有可用的工作表'); return; }
                        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
                        loadRosterFromRows(rows, file.name);
                    } catch (err) {
                        showToast('⚠️ Excel 解析失败：' + (err && err.message ? err.message : err));
                    }
                };
                reader.onerror = function () { showToast('⚠️ 文件读取失败'); };
                reader.readAsArrayBuffer(file);
            });
            return;
        }

        // 文本类：.txt / .csv
        const reader = new FileReader();
        reader.onload = function () {
            loadRosterFromText(String(reader.result || ''), file.name);
        };
        reader.onerror = function () { showToast('⚠️ 文件读取失败'); };
        reader.readAsText(file, 'utf-8');
    }

    // ---------- 点名核心：聚光灯循环走动 ----------
    function startSpin() {
        if (isSpinning) return;
        if (names.length === 0) { showToast('请先上传学生名单'); return; }

        clearHighlights();
        winnerIndex = -1;
        currentIndex = Math.floor(Math.random() * names.length);
        const first = nameGrid.children[currentIndex];
        if (first) first.classList.add('active');

        isSpinning = true;
        syncButtons();
        playSpinSound();   // 播放旋转背景音效（循环）

        timer = setInterval(function () {
            const blocks = nameGrid.children;
            if (blocks[currentIndex]) blocks[currentIndex].classList.remove('active');
            // 随机跳到下一个聚光灯位置（保证不与当前重复，保持“跳动”效果）
            let next;
            do {
                next = Math.floor(Math.random() * names.length);
            } while (next === currentIndex && names.length > 1);
            currentIndex = next;
            if (blocks[currentIndex]) blocks[currentIndex].classList.add('active');
        }, 60);
    }

    function stopSpin(silent) {
        if (!isSpinning) return;
        clearInterval(timer);
        timer = null;
        isSpinning = false;
        stopSpinSound();

        // 静默停止（如加载新名单打断旋转）：不播选中音效、不产生中奖高亮
        if (silent) { syncButtons(); return; }

        playSelectSound();   // 播放“确定选中”音效
        winnerIndex = currentIndex;
        clearHighlights();
        const blocks = nameGrid.children;
        if (blocks[winnerIndex]) blocks[winnerIndex].classList.add('winner');

        if (names[winnerIndex]) addHistory(names[winnerIndex]);
        syncButtons();
    }

    function addHistory(name) {
        if (!name) return;
        if (history[0] === name) return;
        history.unshift(name);
        if (history.length > 20) history.pop();
        updateHistory();
    }

    // ---------- 字号自动匹配屏幕（保证所有姓名同屏可见） ----------
    function fitFont() {
        if (names.length === 0) return;
        const blocks = nameGrid.children;
        if (!blocks.length) return;

        // 测量期间禁用 CSS 过渡，避免读到字号动画的“中间值”导致判断失真
        const hadTransition = [];
        for (let i = 0; i < blocks.length; i++) {
            hadTransition.push(blocks[i].style.transition);
            blocks[i].style.transition = 'none';
        }

        const min = 6;
        const max = Math.max(min, Math.floor(Math.max(nameGrid.clientWidth, nameGrid.clientHeight) / 1.1));

        // 二分查找“恰好能全部放得下”的最大字号
        function fitsAt(f) {
            nameGrid.style.fontSize = f + 'px';
            const prevAC = nameGrid.style.alignContent;
            nameGrid.style.alignContent = 'flex-start';   // 便于测出真实内容高度
            const ok = nameGrid.scrollWidth <= nameGrid.clientWidth + 1 &&
                       nameGrid.scrollHeight <= nameGrid.clientHeight + 1;
            nameGrid.style.alignContent = prevAC || '';
            return ok;
        }

        let lo = min, hi = max;
        if (fitsAt(hi)) {
            lo = hi;
        } else {
            while (lo + 1 < hi) {
                const mid = (lo + hi) >> 1;
                if (fitsAt(mid)) lo = mid; else hi = mid;
            }
        }
        fitsAt(lo);   // 应用最终字号

        // 恢复各姓名块的过渡
        for (let i = 0; i < blocks.length; i++) {
            blocks[i].style.transition = hadTransition[i] || '';
        }
    }

    let fitRaf = null;
    function scheduleFit() {
        if (fitRaf) return;
        fitRaf = requestAnimationFrame(function () {
            fitRaf = null;
            fitFont();
        });
    }

    // ---------- 全屏显示 ----------
    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }
    function enterFs() {
        const el = document.documentElement;
        const fn = el.requestFullscreen || el.webkitRequestFullscreen;
        if (!fn) { showToast('⚠️ 当前浏览器不支持全屏'); return; }
        const p = fn.call(el);
        if (p && p.catch) p.catch(function () {});
    }
    function exitFs() {
        const fn = document.exitFullscreen || document.webkitExitFullscreen;
        if (fn) fn.call(document);
    }
    function toggleFs() {
        if (isFullscreen()) exitFs(); else enterFs();
    }
    function updateFsBtn() {
        btnFs.textContent = isFullscreen() ? '⤓ 退出全屏' : '⛶ 全屏';
        scheduleFit();
    }

    // ---------- 事件绑定 ----------
    btnUpload.addEventListener('click', function () {
        if (isSpinning) return;
        fileInput.click();
        this.blur();
    });
    fileInput.addEventListener('change', function () {
        handleFile(fileInput.files[0]);
        fileInput.value = '';   // 允许再次选择同一文件
    });
    btnStart.addEventListener('click', function () { startSpin(); this.blur(); });
    btnStop.addEventListener('click', function () { stopSpin(); this.blur(); });
    btnFs.addEventListener('click', function () { toggleFs(); this.blur(); });

    // 键盘：空格 = 开始 / 停止（课堂展示时方便操控）
    window.addEventListener('keydown', function (e) {
        if (e.code !== 'Space' || e.repeat) return;
        const t = document.activeElement;
        if (t && (t.tagName === 'BUTTON' || t.tagName === 'INPUT')) t.blur();
        e.preventDefault();
        if (names.length === 0) return;
        if (isSpinning) stopSpin(); else startSpin();
    });

    // 全屏 / 窗口尺寸变化 → 重新适配字号
    document.addEventListener('fullscreenchange', updateFsBtn);
    document.addEventListener('webkitfullscreenchange', updateFsBtn);
    window.addEventListener('resize', scheduleFit);
    if (window.ResizeObserver) {
        new ResizeObserver(function () { scheduleFit(); }).observe(nameGrid.parentElement);
    }

    // 打开页面时自动恢复上次导入的名单（省去重复上传）
    function restoreSavedRoster() {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { saved = null; }
        if (!saved || !Array.isArray(saved.names)) return;

        const list = [];
        const seen = {};
        saved.names.forEach(function (n) {
            if (typeof n !== 'string') return;
            n = n.trim();
            if (!n || seen[n]) return;
            seen[n] = true;
            list.push(n);
        });
        if (!list.length) return;

        names = list;
        const src = saved.source ? '（' + saved.source + '）' : '';
        showToast('已自动恢复上次名单 ' + names.length + ' 人' + src);
    }

    // ---------- 初始化 ----------
    restoreSavedRoster();   // 有上次导入记录则自动恢复，否则用默认演示名单
    renderGrid();
    updateHistory();
    syncButtons();
    updateFsBtn();
})();
