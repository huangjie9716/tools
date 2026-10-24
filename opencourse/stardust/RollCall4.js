'use strict';

    // ============================================================
    //  1. DOM 引用
    // ============================================================
    const displayWrapper = document.getElementById('displayWrapper');
    const displayText = document.getElementById('displayText');
    const particleBurst = document.getElementById('particleBurst');
    const statusDot = document.getElementById('statusDot');
    const statusLabel = document.getElementById('statusLabel');
    const btnStart = document.getElementById('btnStart');
    const btnPause = document.getElementById('btnPause');
    const btnReset = document.getElementById('btnReset');
    const btnFullscreen = document.getElementById('btnFullscreen');
    const mainContainer = document.getElementById('mainContainer');
    const floatingPixelsContainer = document.getElementById('floatingPixels');

    const fileInput = document.getElementById('fileInput');
    const uploadFilename = document.getElementById('uploadFilename');
    const uploadCount = document.getElementById('uploadCount');
    const uploadClear = document.getElementById('uploadClear');
    const uploadGroup = document.getElementById('uploadGroup');

    // ============================================================
    //  2. 状态与数据
    // ============================================================
    const STATE = { IDLE: 'idle', ROLLING: 'rolling', DECELERATING: 'decelerating', RESULT: 'result' };

    const DEFAULT_NAMES = ['第一组', '第二组', '第三组', '第四组', '第五组', '第六组', '第七组', '第八组', '第九组', '第十组', '第十一组', '第十二组'];
    const DEFAULT_TITLE = '默认名单';

    let nameList = [...DEFAULT_NAMES];
    let listTitle = DEFAULT_TITLE;
    let isCustomList = false;

    let currentState = STATE.IDLE;
    let currentIndex = 0;
    let rollInterval = null;
    let decelerateTimeout = null;
    let targetIndex = 0;
    let decelerateStep = 0;
    let decelerateTotalSteps = 0;
    let decelerateStartDelay = 60;
    let lastTickTime = 0;
    let tickMinGap = 50;

    // ============================================================
    //  3. 音效
    // ============================================================
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            try { audioCtx = new(window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; }
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function playTick() {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        if (now - lastTickTime < tickMinGap / 1000) return;
        lastTickTime = now;
        const osc = ctx.createOscillator(),
            gain = ctx.createGain();
        osc.type = 'square';
        const freq = 680 + Math.random() * 240;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.06);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
        osc.onended = () => { osc.disconnect();
            gain.disconnect(); };
    }

    function playVictory() {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const notes = [523, 659, 784, 1047];
        const dur = 0.12;
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator(),
                gain = ctx.createGain();
            osc.type = 'square';
            const start = now + i * dur;
            osc.frequency.setValueAtTime(freq, start);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.85, start + dur);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
            gain.gain.setValueAtTime(0.22, start + dur * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + dur + 0.05);
            osc.onended = () => { osc.disconnect();
                gain.disconnect(); };
        });
        const bass = ctx.createOscillator(),
            bgain = ctx.createGain();
        bass.type = 'triangle';
        bass.frequency.setValueAtTime(261, now);
        bass.frequency.exponentialRampToValueAtTime(200, now + notes.length * dur);
        bgain.gain.setValueAtTime(0.1, now);
        bgain.gain.exponentialRampToValueAtTime(0.001, now + notes.length * dur);
        bass.connect(bgain);
        bgain.connect(ctx.destination);
        bass.start(now);
        bass.stop(now + notes.length * dur + 0.05);
        bass.onended = () => { bass.disconnect();
            bgain.disconnect(); };
    }

    // ============================================================
    //  4. 粒子特效
    // ============================================================
    function triggerBurst() {
        const count = 30;
        const colors = ['#ffd740', '#ffab00', '#ff6d00', '#fff176', '#ffcc02', '#ff4081', '#00e5ff', '#b388ff'];
        const frag = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.classList.add('burst-particle');
            const angle = (Math.PI * 2 * i) / count,
                dist = 50 + Math.random() * 100;
            p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            const col = colors[Math.floor(Math.random() * colors.length)];
            p.style.background = col;
            p.style.boxShadow = `0 0 8px ${col}, 0 0 16px ${col}`;
            p.style.width = (5 + Math.random() * 8) + 'px';
            p.style.height = (5 + Math.random() * 8) + 'px';
            p.style.animationDuration = (0.5 + Math.random() * 0.8) + 's';
            p.style.animationDelay = Math.random() * 0.1 + 's';
            frag.appendChild(p);
        }
        particleBurst.innerHTML = '';
        particleBurst.appendChild(frag);
        setTimeout(() => { particleBurst.innerHTML = ''; }, 1200);
    }

    function createFloatingPixels() {
        const count = 35,
            frag = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.classList.add('floating-pixel');
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (4 + Math.random() * 10) + 's';
            p.style.animationDelay = Math.random() * 8 + 's';
            p.style.width = (3 + Math.random() * 5) + 'px';
            p.style.height = (3 + Math.random() * 5) + 'px';
            frag.appendChild(p);
        }
        floatingPixelsContainer.appendChild(frag);
    }
    createFloatingPixels();

    // ============================================================
    //  5. UI 更新
    // ============================================================
    function updateUI(state) {
        displayWrapper.classList.remove('rolling', 'result');
        displayText.classList.remove('rolling-text', 'result-text');
        statusDot.classList.remove('rolling-dot', 'result-dot');
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnReset.disabled = true;

        switch (state) {
            case STATE.IDLE:
                displayText.textContent = '准 备 就 绪';
                statusDot.style.background = '#3a3a5a';
                statusDot.style.boxShadow = '0 0 8px #3a3a5a';
                statusLabel.textContent = '等待开始';
                btnReset.disabled = false;
                break;
            case STATE.ROLLING:
                displayWrapper.classList.add('rolling');
                displayText.classList.add('rolling-text');
                statusDot.classList.add('rolling-dot');
                statusLabel.textContent = '滚 动 中...';
                btnStart.disabled = true;
                btnPause.disabled = false;
                btnReset.disabled = true;
                break;
            case STATE.DECELERATING:
                displayWrapper.classList.add('rolling');
                displayText.classList.add('rolling-text');
                statusDot.classList.add('rolling-dot');
                statusLabel.textContent = '减 速 中...';
                btnStart.disabled = true;
                btnPause.disabled = true;
                btnReset.disabled = true;
                break;
            case STATE.RESULT:
                displayWrapper.classList.add('result');
                displayText.classList.add('result-text');
                statusDot.classList.add('result-dot');
                statusLabel.textContent = '✨ 结 果 揭 晓 ✨';
                btnStart.disabled = false;
                btnPause.disabled = true;
                btnReset.disabled = false;
                break;
        }
        currentState = state;
    }

    function setDisplayName(index) {
        if (!nameList || nameList.length === 0) {
            displayText.textContent = '⚠ 无 名 单';
            return;
        }
        currentIndex = ((index % nameList.length) + nameList.length) % nameList.length;
        displayText.textContent = nameList[currentIndex];
    }

    function updateUploadInfo() {
        uploadFilename.textContent = listTitle || '未命名名单';
        uploadCount.textContent = '(' + nameList.length + '人)';
        if (isCustomList) {
            uploadGroup.classList.add('has-file');
        } else {
            uploadGroup.classList.remove('has-file');
        }
        if (nameList.length === 0) {
            btnStart.disabled = true;
        } else {
            btnStart.disabled = false;
        }
        if (currentState === STATE.IDLE) {
            displayText.textContent = '准 备 就 绪';
        }
    }

    // ============================================================
    //  6. 核心逻辑
    // ============================================================
    function startRolling() {
        if (currentState === STATE.ROLLING || currentState === STATE.DECELERATING) return;
        if (!nameList || nameList.length === 0) {
            return;
        }
        getAudioContext();
        updateUI(STATE.ROLLING);
        currentIndex = Math.floor(Math.random() * nameList.length);
        setDisplayName(currentIndex);
        lastTickTime = 0;
        tickMinGap = 50;
        const speed = 55 + Math.floor(Math.random() * 20);
        rollInterval = setInterval(() => {
            if (nameList.length === 0) {
                clearInterval(rollInterval);
                rollInterval = null;
                resetAll();
                return;
            }
            currentIndex = (currentIndex + 1) % nameList.length;
            setDisplayName(currentIndex);
            playTick();
        }, speed);
    }

    function pauseAndDecelerate() {
        if (currentState !== STATE.ROLLING) return;
        if (rollInterval) { clearInterval(rollInterval);
            rollInterval = null; }
        updateUI(STATE.DECELERATING);
        if (!nameList || nameList.length === 0) {
            resetAll();
            return;
        }
        targetIndex = Math.floor(Math.random() * nameList.length);
        let dist = (targetIndex - currentIndex + nameList.length) % nameList.length;
        if (dist < 6) targetIndex = (currentIndex + 6 + Math.floor(Math.random() * 5)) % nameList.length;
        let steps = (targetIndex - currentIndex + nameList.length) % nameList.length;
        if (steps < 6) steps += nameList.length;
        decelerateTotalSteps = steps;
        decelerateStep = 0;
        decelerateStartDelay = 60;
        lastTickTime = 0;
        tickMinGap = 60;
        decelerateStepOnce();
    }

    function decelerateStepOnce() {
        if (decelerateStep >= decelerateTotalSteps) { finalizeResult(); return; }
        const progress = decelerateStep / decelerateTotalSteps;
        const delay = decelerateStartDelay + (350 - decelerateStartDelay) * Math.pow(progress, 2.5);
        tickMinGap = Math.max(50, delay * 0.85);
        currentIndex = (currentIndex + 1) % nameList.length;
        setDisplayName(currentIndex);
        playTick();
        decelerateStep++;
        decelerateTimeout = setTimeout(() => { decelerateStepOnce(); }, delay);
    }

    function finalizeResult() {
        if (nameList.length === 0) { resetAll(); return; }
        currentIndex = targetIndex % nameList.length;
        setDisplayName(currentIndex);
        if (decelerateTimeout) { clearTimeout(decelerateTimeout);
            decelerateTimeout = null; }
        if (rollInterval) { clearInterval(rollInterval);
            rollInterval = null; }
        updateUI(STATE.RESULT);
        playVictory();
        triggerBurst();
        if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 60]);
    }

    function resetAll() {
        if (rollInterval) { clearInterval(rollInterval);
            rollInterval = null; }
        if (decelerateTimeout) { clearTimeout(decelerateTimeout);
            decelerateTimeout = null; }
        updateUI(STATE.IDLE);
        currentIndex = 0;
        displayText.textContent = '准 备 就 绪';
        statusDot.style.background = '#3a3a5a';
        statusDot.style.boxShadow = '0 0 8px #3a3a5a';
        statusLabel.textContent = '等待开始';
        lastTickTime = 0;
        tickMinGap = 50;
        updateUploadInfo();
    }

    // ============================================================
    //  7. 文件上传（支持 Excel / TXT / CSV）
    //     自动识别表头：若首行（第一格）是“姓名”，就当作表头跳过；
    //     否则把每一行都当作学生姓名，从而动态获取名单。
    // ============================================================
    function baseName(name) {
        return (name || '名单').replace(/\.[^.]+$/, '');
    }

    function isNameHeader(cell) {
        return typeof cell === 'string' && cell.trim() === '姓名';
    }

    function parseTextContent(content, fileName) {
        content = (content || '').replace(/^\uFEFF/, ''); // 去掉 BOM
        const lines = content.split(/\r?\n/).map(s => s.trim()).filter(s => s !== '');
        if (lines.length === 0) {
            throw new Error('文件中没有任何内容');
        }
        // 首行不是“姓名”时，把它也当作学生姓名
        let names = isNameHeader(lines[0]) ? lines.slice(1) : lines;
        if (names.length === 0) {
            throw new Error('没有有效的名字数据（若首行写了“姓名”，请在下方补充名字）');
        }
        return { title: baseName(fileName), names };
    }

    function parseExcelData(workbook, fileName) {
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        // 取第一列并去掉空单元格
        const raw = (data || []).map(row => {
            const val = row && row[0];
            return val !== undefined && val !== null ? val.toString().trim() : '';
        }).filter(s => s !== '');
        if (raw.length === 0) {
            throw new Error('Excel 中没有有效数据');
        }
        // 首格不是“姓名”时，整列都当作学生姓名
        let names = isNameHeader(raw[0]) ? raw.slice(1) : raw;
        if (names.length === 0) {
            throw new Error('没有有效的名字数据（若首行写了“姓名”，请在下方补充名字）');
        }
        return { title: baseName(fileName), names };
    }

    function loadListFromFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const isExcel = ['xlsx', 'xls'].includes(ext);

        if (isExcel) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const { title, names } = parseExcelData(workbook, file.name);
                    applyList(title, names);
                } catch (err) {
                    alert('⚠ 解析 Excel 失败: ' + err.message);
                }
            };
            reader.onerror = function() {
                alert('⚠ 读取文件失败');
            };
            reader.readAsArrayBuffer(file);
        } else {
            // TXT / CSV
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const { title, names } = parseTextContent(content, file.name);
                    applyList(title, names);
                } catch (err) {
                    alert('⚠ 解析文件失败: ' + err.message);
                }
            };
            reader.onerror = function() {
                alert('⚠ 读取文件失败');
            };
            reader.readAsText(file, 'UTF-8');
        }
    }

    function applyList(title, names) {
        listTitle = title;
        nameList = names;
        isCustomList = true;
        uploadFilename.textContent = title;
        uploadCount.textContent = '(' + nameList.length + '人)';
        uploadGroup.classList.add('has-file');
        saveListToStorage(); // 记住本次文件，下次自动沿用
        resetAll();
        btnStart.disabled = false;
    }

    function clearCustomList() {
        if (!isCustomList) return;
        listTitle = DEFAULT_TITLE;
        nameList = [...DEFAULT_NAMES];
        isCustomList = false;
        uploadFilename.textContent = DEFAULT_TITLE;
        uploadCount.textContent = '(' + nameList.length + '人)';
        uploadGroup.classList.remove('has-file');
        fileInput.value = '';
        removeSavedList(); // 清除已记住的文件名单
        resetAll();
        btnStart.disabled = false;
    }

    // ============================================================
    //  7.5 名单持久化（localStorage）
    //     上传过文件后，刷新 / 下次打开页面仍自动沿用该名单，
    //     直到重新上传新文件或点击 ✕ 清除。
    // ============================================================
    const STORAGE_KEY = 'stardustPicker:list:v1';

    function saveListToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: listTitle, names: nameList }));
        } catch (_) { /* 存储不可用时静默忽略 */ }
    }

    function loadSavedList() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || !Array.isArray(data.names)) return null;
            const names = data.names.map(n => String(n).trim()).filter(n => n !== '');
            if (names.length === 0) return null;
            return {
                title: (typeof data.title === 'string' && data.title) ? data.title : DEFAULT_TITLE,
                names
            };
        } catch (_) {
            return null;
        }
    }

    function removeSavedList() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* 忽略 */ }
    }

    // ============================================================
    //  8. 全屏
    // ============================================================
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            mainContainer.requestFullscreen ? mainContainer.requestFullscreen() :
                mainContainer.webkitRequestFullscreen ? mainContainer.webkitRequestFullscreen() :
                mainContainer.msRequestFullscreen ? mainContainer.msRequestFullscreen() : null;
            btnFullscreen.textContent = '⛶ 退出';
            btnFullscreen.classList.add('is-fullscreen');
        } else {
            document.exitFullscreen ? document.exitFullscreen() :
                document.webkitExitFullscreen ? document.webkitExitFullscreen() :
                document.msExitFullscreen ? document.msExitFullscreen() : null;
            btnFullscreen.textContent = '⛶ 全屏';
            btnFullscreen.classList.remove('is-fullscreen');
        }
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            btnFullscreen.textContent = '⛶ 全屏';
            btnFullscreen.classList.remove('is-fullscreen');
        }
    });

    // ============================================================
    //  9. 事件绑定
    // ============================================================
    btnStart.addEventListener('click', () => {
        if (currentState === STATE.RESULT) resetAll();
        startRolling();
    });

    btnPause.addEventListener('click', () => {
        if (currentState === STATE.ROLLING) pauseAndDecelerate();
    });

    btnReset.addEventListener('click', resetAll);

    btnFullscreen.addEventListener('click', toggleFullscreen);

    fileInput.addEventListener('change', function(e) {
        if (this.files && this.files.length > 0) {
            const file = this.files[0];
            const ext = file.name.split('.').pop().toLowerCase();
            const validExts = ['txt', 'csv', 'text', 'xlsx', 'xls'];
            if (!validExts.includes(ext)) {
                alert('⚠ 仅支持 .txt .csv .xlsx .xls 文件');
                this.value = '';
                return;
            }
            loadListFromFile(file);
        }
    });

    uploadClear.addEventListener('click', function(e) {
        e.stopPropagation();
        clearCustomList();
        fileInput.value = '';
    });

    // 拖拽上传支持（拖到整个页面）
    let dragCounter = 0;
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
        const target = e.target.closest('.upload-group') || e.target.closest('.main-container');
        if (target) {
            uploadGroup.style.borderColor = '#00e5ff';
            uploadGroup.style.boxShadow = '0 6px 0 #0a0a18, 0 8px 0 #0a0a18, 0 0 30px rgba(0,229,255,0.2)';
        }
    });
    document.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadGroup.style.borderColor = '';
        uploadGroup.style.boxShadow = '';
    });
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadGroup.style.borderColor = '';
        uploadGroup.style.boxShadow = '';
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            const ext = file.name.split('.').pop().toLowerCase();
            const validExts = ['txt', 'csv', 'text', 'xlsx', 'xls'];
            if (!validExts.includes(ext)) {
                alert('⚠ 仅支持 .txt .csv .xlsx .xls 文件');
                return;
            }
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            loadListFromFile(file);
        }
    });

    // ============================================================
    //  10. 键盘快捷键
    // ============================================================
    document.addEventListener('keydown', function(e) {
        if (e.key === ' ' || e.key === 'Space') {
            e.preventDefault();
            if (currentState === STATE.IDLE || currentState === STATE.RESULT) {
                if (currentState === STATE.RESULT) resetAll();
                startRolling();
            } else if (currentState === STATE.ROLLING) {
                pauseAndDecelerate();
            }
        }
        if (e.key === 'f' || e.key === 'F') {
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                toggleFullscreen();
            }
        }
        if (e.key === 'r' || e.key === 'R') {
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                resetAll();
            }
        }
    });

    // ============================================================
    //  11. 初始化
    // ============================================================
    function init() {
        // 优先恢复上次上传并保存过的文件名单
        const saved = loadSavedList();
        if (saved) {
            listTitle = saved.title;
            nameList = saved.names;
            isCustomList = true;
            uploadFilename.textContent = listTitle;
            uploadCount.textContent = '(' + nameList.length + '人)';
            uploadGroup.classList.add('has-file');
        } else {
            listTitle = DEFAULT_TITLE;
            nameList = [...DEFAULT_NAMES];
            isCustomList = false;
            uploadFilename.textContent = DEFAULT_TITLE;
            uploadCount.textContent = '(' + nameList.length + '人)';
            uploadGroup.classList.remove('has-file');
        }
        updateUI(STATE.IDLE);
        displayText.textContent = '准 备 就 绪';
        btnStart.disabled = false;
    }
    init();

    console.log('✨ 星尘抽选已启动！');
    console.log('📋 快捷键: [Space] 开始/暂停  [F] 全屏  [R] 重置');
    console.log('📁 拖拽或点击上传名单 (.txt .csv .xlsx .xls)');