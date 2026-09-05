
        // ============================================================
        //  完全保留原始逻辑 + 新增功能
        // ============================================================

        (function() {
            'use strict';

            // ---------- 默认名单 ----------
            const DEFAULT_STUDENTS = [
                "陈宇哲", "颜张晨", "陆 瑶", "刘静潼", "苏 琴", "陆之月", "王彩兰",
                "吴胜申", "梁明轩", "邓桂娴", "黄慧琳", "苏子愉", "杨忠磊",
                "赵铭精", "李秋智", "许黄凯", "李国浩", "黄昌昊", "李鸿运", "叶雄韬",
                "黄东胜", "张朝杰", "匡经轩", "王中毅", "凌连惠", "凌珂", "马艺姗",
                "张宏琳", "岑佳音", "潘俞伯", "韦世军", "冯世铭", "许元凯",
                "何家乐", "丁泓涵", "农荣幸", "黄紫钰", "陆凌妃", "周媛媛",
                "黄爱真", "梁苏源", "何梓茉", "梁桂彤", "林钰涵", "赵燕婷",
                "杨思语", "黄媛菲", "黄滢香", "李梓萱", "黄喆", "黄吉吉", "苗舒苒"
            ];

            // ---------- 音效地址 ----------
            const SOUND_BACK_URL = 'https://pub-3827e3697a0b44428ab555d41c8d38f3.r2.dev/rollback/back.mp3';
            const SOUND_SELECT_URL = 'https://pub-3827e3697a0b44428ab555d41c8d38f3.r2.dev/rollback/select.mp3';

            // ---------- DOM 引用 ----------
            const circleWrapper = document.getElementById('circleWrapper');
            const drum = document.getElementById('drumElement');
            const statusText = document.getElementById('statusText');
            const cardContainer = document.getElementById('cardContainer');
            const canvas = document.getElementById('fireworksCanvas');
            const ctx = canvas.getContext('2d');
            const stickLeft = document.getElementById('stickLeft');
            const stickRight = document.getElementById('stickRight');
            const nailsContainer = document.getElementById('nailsContainer');
            const container = document.getElementById('container');

            const btnFullscreen = document.getElementById('btnFullscreen');
            const btnManageList = document.getElementById('btnManageList');
            const modalOverlay = document.getElementById('modalOverlay');
            const modalClose = document.getElementById('modalClose');
            const uploadZone = document.getElementById('uploadZone');
            const fileInput = document.getElementById('fileInput');
            const nameGrid = document.getElementById('nameGrid');
            const listCount = document.getElementById('listCount');
            const btnClearList = document.getElementById('btnClearList');
            const btnLoadDefault = document.getElementById('btnLoadDefault');

            // ---------- 状态 ----------
            let students = [];
            let nameElements = [];
            let rotationAngle = 0;
            let isSpinning = false;
            let animationFrameId = null;
            let spinSpeed = 0;
            const FAST_SPEED = 7.5;
            const SLOW_DECAY = 0.98;
            const STOP_THRESHOLD = 0.15;
            // 待选中的高亮位置（从正上方顺时针的角度）：90 = 右侧（3 点钟方向）
            const SELECT_ANGLE = 90;
            let fireworksParticles = [];
            let fireworksAnimationId = null;
            let canvasWidth, canvasHeight;
            let hitAnimationTimer = null;
            let beatInterval = null;
            let currentHighlightIndex = -1;

            // ---------- localStorage 操作 ----------
            function loadStudentsFromStorage() {
                try {
                    const stored = localStorage.getItem('drum_students');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            return parsed;
                        }
                    }
                } catch (_) { /* ignore */ }
                return null;
            }

            function saveStudentsToStorage(list) {
                try {
                    localStorage.setItem('drum_students', JSON.stringify(list));
                } catch (_) { /* ignore */ }
            }

            // ---------- 初始化名单 ----------
            function initStudents() {
                const stored = loadStudentsFromStorage();
                if (stored) {
                    students = stored;
                } else {
                    students = [...DEFAULT_STUDENTS];
                    saveStudentsToStorage(students);
                }
            }

            // ---------- 创建名字元素 ----------
            function createNameItems() {
                circleWrapper.innerHTML = '';
                nameElements = [];
                const total = students.length;
                if (total === 0) {
                    // 没有名单时显示提示
                    const placeholder = document.createElement('div');
                    placeholder.className = 'name-item';
                    placeholder.textContent = '📤 请上传名单';
                    placeholder.style.left = '50%';
                    placeholder.style.top = '50%';
                    placeholder.style.transform = 'translate(-50%,-50%)';
                    placeholder.style.fontSize = 'clamp(20px, 4vw, 36px)';
                    placeholder.style.background = 'rgba(138,43,43,0.5)';
                    placeholder.style.border = '2px dashed #cf9f2e';
                    placeholder.style.pointerEvents = 'none';
                    circleWrapper.appendChild(placeholder);
                    nameElements.push(placeholder);
                    return;
                }

                for (let i = 0; i < total; i++) {
                    const d = document.createElement('div');
                    d.className = 'name-item';
                    d.textContent = students[i];
                    d.setAttribute('data-index', i);
                    const ang = (i / total) * 360;
                    const rad = (ang * Math.PI) / 180;
                    // 轨道半径 44%（比原始略大，让名字更舒展）
                    const radius = 44;
                    const x = 50 + radius * Math.sin(rad);
                    const y = 50 - radius * Math.cos(rad);
                    d.style.left = x + '%';
                    d.style.top = y + '%';
                    d.style.transform = 'translate(-50%,-50%)';
                    circleWrapper.appendChild(d);
                    nameElements.push(d);
                }
            }

            // ---------- 更新旋转（名字始终正立） ----------
            function updateRotation() {
                circleWrapper.style.transform = 'translate(-50%,-50%) rotate(' + rotationAngle + 'deg)';
                // 每个名字反向旋转，抵消轨道整体旋转，保证文字始终正立不倒
                const counter = 'rotate(' + (-rotationAngle) + 'deg)';
                for (let i = 0; i < nameElements.length; i++) {
                    const el = nameElements[i];
                    el.style.transform = 'translate(-50%,-50%) ' + counter;
                }
            }

            // ---------- 高亮 ----------
            function clearHighlights() {
                nameElements.forEach(e => e.classList.remove('highlight'));
                currentHighlightIndex = -1;
            }

            // 当前位于“待选中高亮处”（右侧 3 点钟方向）的那个名字
            function getSelectionIndex() {
                const total = students.length;
                if (total === 0) return -1;
                let a = rotationAngle % 360;
                if (a < 0) a += 360;
                let t = (SELECT_ANGLE - a + 360) % 360;
                return Math.round((t / 360) * total) % total;
            }

            function highlightSelection() {
                clearHighlights();
                const idx = getSelectionIndex();
                if (idx >= 0 && idx < nameElements.length) {
                    nameElements[idx].classList.add('highlight');
                    currentHighlightIndex = idx;
                }
                updateRotation();
            }

            // ---------- 鼓槌动画 ----------
            function triggerHitAnimation() {
                if (hitAnimationTimer) clearTimeout(hitAnimationTimer);
                stickLeft.classList.add('hit-left');
                stickRight.classList.add('hit-right');
                hitAnimationTimer = setTimeout(() => {
                    stickLeft.classList.remove('hit-left');
                    stickRight.classList.remove('hit-right');
                }, 80);
            }

            function startBeatAnimation() {
                if (beatInterval) clearInterval(beatInterval);
                triggerHitAnimation();
                beatInterval = setInterval(triggerHitAnimation, 150);
            }

            function stopBeatAnimation() {
                if (beatInterval) {
                    clearInterval(beatInterval);
                    beatInterval = null;
                }
            }

            // ---------- 钉子装饰 ----------
            function createNails() {
                nailsContainer.innerHTML = '';
                for (let i = 0; i < 24; i++) {
                    const angle = (i / 24) * 360 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const radius = 48.5;
                    const x = 50 + radius * Math.cos(rad);
                    const y = 50 + radius * Math.sin(rad);
                    const nail = document.createElement('div');
                    nail.className = 'nail';
                    nail.style.left = 'calc(' + x + '% - 5px)';
                    nail.style.top = 'calc(' + y + '% - 5px)';
                    nailsContainer.appendChild(nail);
                }
            }
            createNails();

            // ---------- 烟花系统 ----------
            function resizeCanvas() {
                canvasWidth = window.innerWidth;
                canvasHeight = window.innerHeight;
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
            }
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();

            class Particle {
                constructor(x, y, color, speed, angle, life, size) {
                    this.x = x;
                    this.y = y;
                    this.color = color;
                    this.speed = speed;
                    this.angle = angle;
                    this.life = life;
                    this.maxLife = life;
                    this.size = size;
                    this.vx = Math.cos(angle) * speed;
                    this.vy = Math.sin(angle) * speed;
                    this.trail = [];
                }
                update() {
                    this.trail.push({ x: this.x, y: this.y, life: 0.15 });
                    if (this.trail.length > 8) this.trail.shift();
                    this.x += this.vx;
                    this.y += this.vy;
                    this.vy += 0.06;
                    this.life -= 0.015;
                    for (let t of this.trail) t.life -= 0.02;
                    this.trail = this.trail.filter(t => t.life > 0);
                }
                draw(ctx) {
                    for (let t of this.trail) {
                        const a = (t.life / 0.15) * 0.6;
                        ctx.beginPath();
                        ctx.arc(t.x, t.y, this.size * 0.7, 0, Math.PI * 2);
                        ctx.fillStyle = this.color.replace('1)', a + ')').replace('rgb', 'rgba');
                        ctx.fill();
                    }
                    const a = this.life / this.maxLife;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fillStyle = this.color.replace('1)', a + ')').replace('rgb', 'rgba');
                    ctx.fill();
                }
            }

            function burst(x, y, colors) {
                const palette = colors || ['rgb(255,80,60)', 'rgb(255,180,40)', 'rgb(220,50,50)', 'rgb(255,215,0)'];
                for (let i = 0; i < 40; i++) {
                    const ang = Math.PI * 2 * i / 40 + Math.random() * 0.3;
                    fireworksParticles.push(new Particle(x, y, palette[Math.floor(Math.random() * palette.length)],
                        4 + Math.random() * 7, ang, 0.8 + Math.random() * 0.7, 2 + Math.random() * 4));
                }
                setTimeout(() => {
                    for (let i = 0; i < 18; i++) {
                        fireworksParticles.push(new Particle(x + Math.random() * 40 - 20, y + Math.random() * 40 - 20,
                            palette[Math.floor(Math.random() * palette.length)],
                            1.5 + Math.random() * 4, Math.random() * Math.PI * 2,
                            0.5 + Math.random() * 0.6, 1.5 + Math.random() * 2.5));
                    }
                }, 120);
            }

            function launchFireworks() {
                const pos = [
                    { x: canvasWidth * 0.3, y: canvasHeight * 0.25 },
                    { x: canvasWidth * 0.7, y: canvasHeight * 0.3 },
                    { x: canvasWidth * 0.5, y: canvasHeight * 0.2 },
                    { x: canvasWidth * 0.25, y: canvasHeight * 0.4 },
                    { x: canvasWidth * 0.75, y: canvasHeight * 0.45 }
                ];
                pos.forEach((p, i) => setTimeout(() => burst(p.x, p.y), i * 180));
                setTimeout(() => {
                    burst(canvasWidth * 0.5, canvasHeight * 0.35);
                    burst(canvasWidth * 0.65, canvasHeight * 0.5);
                }, 900);
            }

            function animateFireworks() {
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                fireworksParticles = fireworksParticles.filter(p => p.life > 0);
                for (let p of fireworksParticles) { p.update();
                    p.draw(ctx); }
                if (fireworksParticles.length > 0) {
                    fireworksAnimationId = requestAnimationFrame(animateFireworks);
                } else {
                    fireworksAnimationId = null;
                }
            }

            function startFireworks() {
                if (fireworksAnimationId) cancelAnimationFrame(fireworksAnimationId);
                fireworksParticles = [];
                launchFireworks();
                animateFireworks();
            }

            // ---------- 卡片 ----------
            function resetStatusIdle() {
                if (students.length > 0) {
                    statusText.textContent = '🥁 点击鼓面开始 · ' + students.length + ' 位同学';
                } else {
                    statusText.textContent = '📭 请上传名单';
                }
            }

            // 选中后的大卡片：不自动关闭，需点击右上角 ✕ 或空白处退出
            function showNameCard(name) {
                cardContainer.innerHTML = '';
                const overlay = document.createElement('div');
                overlay.className = 'name-card-overlay';
                overlay.innerHTML =
                    '<div class="name-card">' +
                        '<button class="card-close" title="关闭" aria-label="关闭">✕</button>' +
                        '<div class="card-title">🏆 击鼓传花 🏆</div>' +
                        '<div class="card-name">' + name + '</div>' +
                        '<div class="card-hint">点击空白处或右上角 ✕ 关闭</div>' +
                    '</div>';
                overlay.addEventListener('click', function(e) {
                    if (e.target === overlay || e.target.classList.contains('card-close')) {
                        closeNameCard();
                    }
                });
                cardContainer.appendChild(overlay);
            }

            // 关闭卡片后，状态栏不再显示“选中：xxx”
            function closeNameCard() {
                cardContainer.innerHTML = '';
                resetStatusIdle();
            }

            // ---------- 音频音效 ----------
            let drumAudio = null;
            let selectAudio = null;

            function getDrumAudio() {
                if (!drumAudio) {
                    drumAudio = new Audio(SOUND_BACK_URL);
                    drumAudio.loop = true;
                    drumAudio.preload = 'auto';
                }
                return drumAudio;
            }

            function getSelectAudio() {
                if (!selectAudio) {
                    selectAudio = new Audio(SOUND_SELECT_URL);
                    selectAudio.preload = 'auto';
                }
                return selectAudio;
            }

            // 趁用户点击时解锁“选中音效”，避免减速结束后被浏览器自动播放策略拦截
            function unlockSelectAudio() {
                const s = getSelectAudio();
                if (s && !s._unlocked) {
                    const p = s.play();
                    if (p && p.then) {
                        p.then(function() { s.pause(); s.currentTime = 0; s._unlocked = true; }).catch(function() {});
                    }
                }
            }

            // 开始旋转：循环播放击鼓背景音
            function startDrumSound() {
                const d = getDrumAudio();
                d.currentTime = 0;
                const p = d.play();
                if (p && p.catch) p.catch(function() {});
                unlockSelectAudio();
            }

            // 停止循环的击鼓背景音
            function stopDrumSound() {
                if (drumAudio) {
                    drumAudio.pause();
                    drumAudio.currentTime = 0;
                }
            }

            // 被选中者出现：播放一次选中音效
            function playSelectSound() {
                const s = getSelectAudio();
                s.currentTime = 0;
                const p = s.play();
                if (p && p.catch) p.catch(function() {});
            }

            // ---------- 核心旋转逻辑 ----------
            function spinAnimation() {
                if (!isSpinning) {
                    if (spinSpeed > STOP_THRESHOLD) {
                        rotationAngle = (rotationAngle + spinSpeed) % 360;
                        spinSpeed *= SLOW_DECAY;
                        highlightSelection();
                        if (spinSpeed < STOP_THRESHOLD) { stopSpinning(); return; }
                        animationFrameId = requestAnimationFrame(spinAnimation);
                    } else {
                        stopSpinning();
                    }
                } else {
                    rotationAngle = (rotationAngle + spinSpeed) % 360;
                    highlightSelection();
                    animationFrameId = requestAnimationFrame(spinAnimation);
                }
            }

            function startSpinning() {
                if (students.length === 0) {
                    statusText.textContent = '⚠️ 请先上传名单';
                    return;
                }
                if (isSpinning) return;
                if (animationFrameId) { cancelAnimationFrame(animationFrameId);
                    animationFrameId = null; }
                closeNameCard();
                isSpinning = true;
                spinSpeed = FAST_SPEED;
                statusText.textContent = '🥁 传花中 ... 点击鼓面停止';
                startDrumSound();
                startBeatAnimation();
                animationFrameId = requestAnimationFrame(spinAnimation);
            }

            function initiateStop() {
                if (!isSpinning) {
                    if (spinSpeed > STOP_THRESHOLD) startSpinning();
                    return;
                }
                isSpinning = false;
                statusText.textContent = '🎵 减速中 ... 即将揭晓';
            }

            function stopSpinning() {
                if (animationFrameId) { cancelAnimationFrame(animationFrameId);
                    animationFrameId = null; }
                isSpinning = false;
                spinSpeed = 0;
                stopBeatAnimation();
                highlightSelection();
                const idx = getSelectionIndex();
                if (idx >= 0 && idx < students.length) {
                    const name = students[idx];
                    stopDrumSound();
                    statusText.textContent = '🎉 选中：' + name + ' 🎉';
                    startFireworks();
                    playSelectSound();
                    showNameCard(name);
                } else {
                    stopDrumSound();
                    resetStatusIdle();
                }
            }

            function onDrumClick() {
                if (students.length === 0) {
                    statusText.textContent = '⚠️ 请先上传名单';
                    return;
                }
                if (isSpinning) initiateStop();
                else startSpinning();
            }

            drum.addEventListener('click', onDrumClick);
            drum.addEventListener('touchstart', function(e) {
                e.preventDefault();
                onDrumClick();
            });

            // ---------- 名单管理 ----------
            function setStudents(newList) {
                const clean = newList.map(s => s.trim()).filter(s => s.length > 0);
                if (clean.length === 0) {
                    alert('名单不能为空，请上传有效名单。');
                    return false;
                }
                // 去重
                const unique = [];
                const seen = new Set();
                for (const n of clean) {
                    if (!seen.has(n)) { seen.add(n);
                        unique.push(n); }
                }
                students = unique;
                saveStudentsToStorage(students);
                // 重置旋转状态
                if (isSpinning) { stopSpinning(); }
                rotationAngle = Math.floor(Math.random() * 360);
                createNameItems();
                highlightSelection();
                statusText.textContent = '📋 已加载 ' + students.length + ' 位同学，点击鼓面开始';
                if (modalOverlay.classList.contains('open')) renderNameList();
                return true;
            }

            function loadDefaultStudents() {
                setStudents(DEFAULT_STUDENTS);
            }

            function clearAllStudents() {
                if (students.length === 0) return;
                if (!confirm('确定要清空所有名单吗？')) return;
                students = [];
                saveStudentsToStorage(students);
                if (isSpinning) stopSpinning();
                createNameItems();
                updateRotation();
                statusText.textContent = '📭 名单已清空，请上传';
                if (modalOverlay.classList.contains('open')) renderNameList();
            }

            function removeStudent(nameToRemove) {
                if (isSpinning) stopSpinning();
                students = students.filter(n => n !== nameToRemove);
                saveStudentsToStorage(students);
                createNameItems();
                highlightSelection();
                statusText.textContent = '已移除 "' + nameToRemove + '"';
                if (modalOverlay.classList.contains('open')) renderNameList();
                if (students.length === 0) {
                    statusText.textContent = '📭 名单为空，请上传';
                }
            }

            // ---------- 渲染名单列表 ----------
            function renderNameList() {
                if (students.length === 0) {
                    nameGrid.innerHTML = '<div class="empty-list">还没有名单，请上传 📤</div>';
                    listCount.textContent = '共 0 人';
                    return;
                }
                let html = '';
                for (const n of students) {
                    html += '<span class="name-tag">' + n +
                        '<button class="remove" data-name="' + n + '" title="移除">✕</button></span>';
                }
                nameGrid.innerHTML = html;
                listCount.textContent = '共 ' + students.length + ' 人';
                nameGrid.querySelectorAll('.remove').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        removeStudent(this.dataset.name);
                    });
                });
            }

            // ---------- 文件上传 ----------
            function isExcelFile(file) {
                return /\.(xlsx|xls)$/i.test(file.name || '');
            }

            // 解析 Excel：第一行第一列为表头，从第二行第一列起均为姓名
            function parseExcelNames(data) {
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames && workbook.SheetNames[0];
                const sheet = sheetName ? workbook.Sheets[sheetName] : null;
                if (!sheet) return null;
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                const namesList = [];
                for (let i = 1; i < rows.length; i++) {
                    const cell = rows[i] ? rows[i][0] : '';
                    const v = (cell === null || cell === undefined) ? '' : String(cell).trim();
                    if (v.length > 0) namesList.push(v);
                }
                return namesList;
            }

            function handleFile(file) {
                if (isExcelFile(file)) {
                    if (typeof XLSX === 'undefined') {
                        alert('需要联网加载 Excel 解析库才能读取 .xlsx/.xls 文件，请联网后重试，或改用 .txt/.csv 格式。');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            const namesList = parseExcelNames(new Uint8Array(e.target.result));
                            if (!namesList || namesList.length === 0) {
                                alert('未识别到有效姓名：请确认第一行第一列为表头（如“姓名”），从第二行第一列开始放姓名。');
                                return;
                            }
                            if (setStudents(namesList)) {
                                closeModal();
                            }
                        } catch (err) {
                            alert('Excel 解析失败，请确认文件格式正确（.xlsx/.xls）。');
                        }
                    };
                    reader.onerror = function() { alert('文件读取失败，请重试。'); };
                    reader.readAsArrayBuffer(file);
                    return;
                }

                // .txt / .csv：每行一个姓名
                const reader = new FileReader();
                reader.onload = function(e) {
                    const text = e.target.result;
                    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
                    const namesList = lines.map(line => {
                        const parts = line.split(',').map(s => s.trim());
                        return parts[0] || parts.join(' ');
                    }).filter(s => s.length > 0);
                    if (namesList.length === 0) {
                        alert('未识别到有效姓名，请确保每行一个姓名。');
                        return;
                    }
                    if (setStudents(namesList)) {
                        closeModal();
                    }
                };
                reader.onerror = function() { alert('文件读取失败，请重试。'); };
                reader.readAsText(file, 'UTF-8');
            }

            // ---------- 模态框 ----------
            function openModal() {
                modalOverlay.classList.add('open');
                renderNameList();
                document.body.style.overflow = 'hidden';
            }

            function closeModal() {
                modalOverlay.classList.remove('open');
                document.body.style.overflow = '';
            }

            // ---------- 全屏 ----------
            function toggleFullscreen() {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen?.().catch(() => {});
                } else {
                    document.exitFullscreen?.().catch(() => {});
                }
            }

            document.addEventListener('fullscreenchange', () => {
                if (document.fullscreenElement) {
                    container.classList.add('fullscreen');
                    document.body.classList.add('is-fullscreen');
                } else {
                    container.classList.remove('fullscreen');
                    document.body.classList.remove('is-fullscreen');
                }
            });

            // ---------- 键盘快捷键 ----------
            document.addEventListener('keydown', function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                if (e.key === ' ' || e.key === 'Space') {
                    e.preventDefault();
                    onDrumClick();
                }
                if (e.key === 'Escape') {
                    if (modalOverlay.classList.contains('open')) closeModal();
                }
                if (e.key === 'f' || e.key === 'F') {
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        toggleFullscreen();
                    }
                }
            });

            // ---------- 事件绑定 ----------
            btnFullscreen.addEventListener('click', toggleFullscreen);
            btnManageList.addEventListener('click', openModal);
            modalClose.addEventListener('click', closeModal);
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === this) closeModal();
            });

            uploadZone.addEventListener('click', function() { fileInput.click(); });
            fileInput.addEventListener('change', function(e) {
                if (this.files && this.files.length > 0) {
                    handleFile(this.files[0]);
                }
                this.value = '';
            });

            uploadZone.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('dragover');
            });
            uploadZone.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
            });
            uploadZone.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFile(e.dataTransfer.files[0]);
                }
            });

            btnClearList.addEventListener('click', clearAllStudents);
            btnLoadDefault.addEventListener('click', function() {
                if (students.length > 0 && !confirm('将覆盖当前名单，确定吗？')) return;
                loadDefaultStudents();
            });

            // ---------- 窗口关闭前清理 ----------
            window.addEventListener('beforeunload', function() {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                if (fireworksAnimationId) cancelAnimationFrame(fireworksAnimationId);
                stopBeatAnimation();
            });

            // ---------- 启动 ----------
            function init() {
                initStudents();
                rotationAngle = Math.floor(Math.random() * 360);
                createNameItems();
                highlightSelection();
                if (students.length > 0) {
                    statusText.textContent = '🥁 点击鼓面开始 · ' + students.length + ' 位同学';
                } else {
                    statusText.textContent = '📭 请上传名单';
                }
                console.log('🥁 击鼓传花 · 课堂随机点名 已启动！');
            }

            init();

            // 暴露 setStudents 以便调试
            window.__setStudents = setStudents;

        })();
    