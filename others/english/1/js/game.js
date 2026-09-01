        // ================================================================
        //  3. 游戏主逻辑
        // ================================================================
        // “已加载，点击开始”状态前的绿色对勾图标（SVG）
        const CHECK_SVG = '<svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M512 0C228.430769 0 0 228.430769 0 512s228.430769 512 512 512 512-228.430769 512-512S795.569231 0 512 0z m0 945.230769C271.753846 945.230769 78.769231 752.246154 78.769231 512S271.753846 78.769231 512 78.769231s433.230769 192.984615 433.230769 433.230769-192.984615 433.230769-433.230769 433.230769z" fill="#68ce06"/><path d="M716.8 330.830769l-208.738462 248.123077c-15.753846 15.753846-43.323077 19.692308-59.076923 7.876923L299.323077 472.615385c-15.753846-11.815385-43.323077-7.876923-55.138462 7.876923-11.815385 15.753846-7.876923 43.323077 7.876923 55.138461l149.661539 114.215385c19.692308 15.753846 47.261538 23.630769 74.830769 23.630769 35.446154 0 70.892308-15.753846 94.523077-43.323077l208.738462-248.123077c15.753846-15.753846 11.815385-43.323077-3.938462-55.138461-19.692308-15.753846-43.323077-15.753846-59.076923 3.938461z" fill="#68ce06"/></svg>';
        // “游戏进行中”状态前的图标（SVG，fill=currentColor 使颜色跟随文字）
        const PLAY_SVG = '<svg class="icon" viewBox="0 0 1118 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M821.248 186.368q40.96-34.816 92.672-43.008t96.768 5.632 75.776 48.64 30.72 86.016l0 385.024q0 43.008-12.8 79.36t-36.864 60.416-58.368 32.768-77.312-3.584q-28.672-8.192-52.224-22.016t-45.056-28.16-43.008-26.624-46.08-16.384l-372.736 0q-24.576 0-46.592 11.776t-43.52 27.136-45.056 30.72-51.2 23.552q-43.008 12.288-77.312 3.584t-58.88-33.28-37.376-61.44-12.8-79.872l0-382.976q6.144-50.176 37.888-84.992t73.728-49.152 88.576-6.144 82.432 43.008q15.36 15.36 44.032 38.912t65.024 46.08 79.36 38.4 88.064 15.872q44.032 0 84.48-16.384t74.24-38.912 59.904-46.08 43.52-37.888zM232.448 651.264q19.456 0 36.352-7.168t29.696-19.456 19.968-29.184 7.168-36.352q0-38.912-27.136-66.048t-66.048-27.136q-19.456 0-36.352 7.168t-29.696 19.968-19.968 29.696-7.168 36.352q0 38.912 27.136 65.536t66.048 26.624zM977.92 512l-46.08 0 0-46.08-93.184 0 0 46.08-47.104 0 0 93.184 47.104 0 0 46.08 93.184 0 0-46.08 46.08 0 0-93.184z" fill="currentColor"/></svg>';

        class WordMatchGame {
            constructor() {
                // DOM
                this.grid = document.getElementById('bubbleGrid');
                this.timerDisplay = document.getElementById('timerDisplay');
                this.levelBadge = document.getElementById('levelBadge');
                this.statusBadge = document.getElementById('statusBadge');
                this.btnStart = document.getElementById('btnStart');
                this.btnReset = document.getElementById('btnReset');
                this.btnLoad = document.getElementById('btnLoad');
                this.bookSelect = document.getElementById('bookSelect');
                this.unitSelect = document.getElementById('unitSelect');
                this.unitLabel = document.getElementById('unitLabel');
                this.victoryOverlay = document.getElementById('victoryOverlay');
                this.victoryTime = document.getElementById('victoryTime');
                this.victoryLevel = document.getElementById('victoryLevel');
                this.btnContinueAuto = document.getElementById('btnContinueAuto');

                this.sound = new SoundEngine();

                // 游戏状态
                this.state = 'idle'; // idle | playing | completed
                this.bubbles = [];
                this.selectedIndex = null;
                this.matchedPairs = 0;
                this.totalPairs = 0;
                this.timerInterval = null;
                this.seconds = 0;
                this.isProcessing = false;
                this.currentLevel = 0;

                // 当前加载的单词列表
                this.currentWords = [];
                // 当前关卡的单词对（每对包含英文和中文）
                this.currentPairs = [];
                // 单元全部单词（去重后）及两关分组
                this.unitWords = [];
                this.levelGroups = [[], []];
                this.totalLevels = 2;

                // 初始化选择器
                this._initSelectors();

                // 绑定事件
                this.btnStart.addEventListener('click', () => this.startGame());
                this.btnReset.addEventListener('click', () => this.resetGame());
                this.btnLoad.addEventListener('click', () => this.loadSelectedUnit());
                this.btnContinueAuto.addEventListener('click', () => this.handleNextAction());

                // 初始状态（_initSelectors 中已自动加载默认单元并设置好 UI）
            }

            // ---------- 初始化选择器 ----------
            _initSelectors() {
                const books = Object.keys(WORD_DATA);
                // 按用户要求的顺序排列
                const order = ['七年级上册', '七年级下册', '八年级上册', '八年级下册', '九年级全一册'];
                const sortedBooks = books.sort((a, b) => {
                    const ia = order.indexOf(a);
                    const ib = order.indexOf(b);
                    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                });

                this.bookSelect.innerHTML = '';
                sortedBooks.forEach(book => {
                    const opt = document.createElement('option');
                    opt.value = book;
                    opt.textContent = book;
                    this.bookSelect.appendChild(opt);
                });

                // 默认选中第一个
                if (sortedBooks.length > 0) {
                    this.bookSelect.value = sortedBooks[0];
                    this._updateUnitSelect(sortedBooks[0]);
                }

                this.bookSelect.addEventListener('change', () => {
                    this._updateUnitSelect(this.bookSelect.value);
                    this.loadSelectedUnit();
                });
                this.unitSelect.addEventListener('change', () => {
                    this.loadSelectedUnit();
                });

                // 初始化时自动加载默认单元
                if (this.bookSelect.value) {
                    this.loadSelectedUnit();
                }
            }

            _updateUnitSelect(book) {
                this.unitSelect.innerHTML = '';
                const data = WORD_DATA[book];
                if (!data) return;
                data.units.forEach((unit, idx) => {
                    const opt = document.createElement('option');
                    opt.value = idx;
                    opt.textContent = unit.name;
                    this.unitSelect.appendChild(opt);
                });
                // 默认选中第一个
                if (data.units.length > 0) {
                    this.unitSelect.value = '0';
                }
            }

            // ---------- 加载选中的单元 ----------
            loadSelectedUnit() {
                const book = this.bookSelect.value;
                const unitIdx = parseInt(this.unitSelect.value);
                const data = WORD_DATA[book];
                if (!data || !data.units[unitIdx]) {
                    alert('请选择有效的单元');
                    return;
                }
                const unit = data.units[unitIdx];
                this.unitLabel.textContent = `${book} · ${unit.name}`;

                // 提取单词列表（去重，保留英文-中文配对）
                const wordMap = new Map();
                unit.words.forEach(w => {
                    const key = w.en + '|' + w.zh;
                    if (!wordMap.has(key)) {
                        wordMap.set(key, w);
                    }
                });
                const uniqueWords = Array.from(wordMap.values());

                if (uniqueWords.length < 2) {
                    alert('该单元单词数量不足，请选择其他单元。');
                    return;
                }

                // 洗牌后平均分成 2 关（两关单词不重叠、数量接近）
                const shuffled = this._shuffle([...uniqueWords]);
                const half = Math.ceil(shuffled.length / 2);
                this.unitWords = uniqueWords;
                this.levelGroups = [shuffled.slice(0, half), shuffled.slice(half)];

                // 加载第 1 关
                this._loadLevel(0);

                // 显示分组信息
                this.unitLabel.textContent += `（共 ${this.unitWords.length} 个单词，分 2 关，本关 ${this.levelGroups[0].length} 个）`;
            }

            // ---------- 加载指定关卡（0 / 1） ----------
            _loadLevel(idx) {
                const words = this.levelGroups[idx];
                if (!words || words.length === 0) return false;
                this.currentLevel = idx;
                this.currentWords = words;
                this._resetGameState();
                this._prepareLevel();
                this._updateUI();
                this.btnStart.disabled = false;
                this.statusBadge.innerHTML = `${CHECK_SVG} 已加载，点击开始`;
                this.statusBadge.className = 'status-badge idle';
                this.btnContinueAuto.textContent = idx < this.totalLevels - 1 ? '进入第 2 关' : '重新挑战本单元';
                return true;
            }

            // ---------- 准备关卡 ----------
            _prepareLevel() {
                const words = this.currentWords;
                if (!words || words.length === 0) return;

                // 使用当前关卡的单词（本关内随机排列）
                const shuffled = this._shuffle([...words]);
                this.currentPairs = shuffled.map((w, idx) => ({
                    pairId: idx,
                    en: w.en,
                    zh: w.zh,
                    enWord: w.en,
                }));

                this.totalPairs = this.currentPairs.length;
                this.matchedPairs = 0;
                this.selectedIndex = null;

                // 生成泡泡数据
                const items = [];
                this.currentPairs.forEach(pair => {
                    items.push({
                        pairId: pair.pairId,
                        text: pair.en,
                        type: 'en',
                        matched: false,
                        enWord: pair.enWord,
                    });
                    items.push({
                        pairId: pair.pairId,
                        text: pair.zh,
                        type: 'zh',
                        matched: false,
                        enWord: pair.enWord,
                    });
                });
                this.bubbles = this._shuffle(items);
                this._renderBubbles();
                this._updateBubbleStates();
            }

            // ---------- 重置游戏状态（保留已加载的单词） ----------
            _resetGameState() {
                this._stopTimer();
                this.state = 'idle';
                this.selectedIndex = null;
                this.matchedPairs = 0;
                this.isProcessing = false;
                this.seconds = 0;
                this.timerDisplay.textContent = '⏱️ 00:00';
                this.btnStart.disabled = false;
                this.victoryOverlay.classList.remove('show');
                this.statusBadge.className = 'status-badge idle';
                this.statusBadge.textContent = '⏳ 等待开始';
            }

            // ---------- 渲染 ----------
            _renderBubbles() {
                this.grid.innerHTML = '';
                const colors = this.bubbles.map(() => this._randomColor());
                this.bubbles.forEach((bubble, index) => {
                    const div = document.createElement('div');
                    div.className = 'bubble disabled';
                    div.dataset.index = index;
                    div.style.background = `radial-gradient(circle at 30% 28%, #fff8f0, ${colors[index]})`;
                    const textSpan = document.createElement('span');
                    textSpan.className = 'bubble-text';
                    textSpan.textContent = bubble.text;
                    div.appendChild(textSpan);
                    div.addEventListener('click', () => this._onBubbleClick(index));
                    this.grid.appendChild(div);
                });
                this._updateBubbleStates();
            }

            _renderEmptyGrid() {
                this.grid.innerHTML = '';
                for (let i = 0; i < 18; i++) {
                    const div = document.createElement('div');
                    div.className = 'bubble disabled';
                    div.style.background = 'radial-gradient(circle at 30% 28%, #f0ece6, #e0d8ce)';
                    div.style.opacity = '0.3';
                    div.style.pointerEvents = 'none';
                    const textSpan = document.createElement('span');
                    textSpan.className = 'bubble-text';
                    textSpan.textContent = '?';
                    textSpan.style.opacity = '0.2';
                    div.appendChild(textSpan);
                    this.grid.appendChild(div);
                }
            }

            _updateBubbleStates() {
                const children = this.grid.children;
                for (let i = 0; i < children.length; i++) {
                    const el = children[i];
                    const data = this.bubbles[i];
                    if (!data) {
                        el.classList.add('disabled');
                        el.style.pointerEvents = 'none';
                        continue;
                    }
                    if (data.matched) {
                        el.classList.add('matched');
                        el.classList.remove('highlight', 'disabled');
                        el.style.pointerEvents = 'none';
                        continue;
                    }
                    el.classList.remove('matched');
                    el.style.pointerEvents = '';
                    if (this.state === 'playing') {
                        el.classList.remove('disabled');
                    } else {
                        el.classList.add('disabled');
                    }
                    if (this.selectedIndex === i && this.state === 'playing') {
                        el.classList.add('highlight');
                    } else {
                        el.classList.remove('highlight');
                    }
                }
            }

            _randomColor() {
                const h = Math.floor(Math.random() * 360);
                const s = 50 + Math.floor(Math.random() * 30);
                const l = 60 + Math.floor(Math.random() * 25);
                return `hsl(${h}, ${s}%, ${l}%)`;
            }

            _shuffle(arr) {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                return arr;
            }

            // ---------- 点击处理 ----------
            _onBubbleClick(index) {
                if (this.state !== 'playing') return;
                if (this.isProcessing) return;
                const data = this.bubbles[index];
                if (!data || data.matched) return;

                // 朗读英文
                if (data.enWord) {
                    this.sound.speakEnglish(data.enWord);
                }

                if (this.selectedIndex === index) {
                    this.selectedIndex = null;
                    this._updateBubbleStates();
                    return;
                }

                if (this.selectedIndex === null) {
                    this.selectedIndex = index;
                    this._updateBubbleStates();
                    this.sound.playPop();
                    return;
                }

                const firstIdx = this.selectedIndex;
                const firstData = this.bubbles[firstIdx];
                const secondData = this.bubbles[index];

                if (firstData.matched) {
                    this.selectedIndex = null;
                    this._updateBubbleStates();
                    return;
                }

                const isMatch = (firstData.pairId === secondData.pairId) &&
                    (firstData.type !== secondData.type);

                if (isMatch) {
                    this.isProcessing = true;
                    firstData.matched = true;
                    secondData.matched = true;
                    this.matchedPairs++;
                    this.sound.playMatch();

                    this.selectedIndex = null;
                    this._updateBubbleStates();

                    if (this.matchedPairs === this.totalPairs) {
                        this._handleVictory();
                    }
                    this.isProcessing = false;
                } else {
                    this.selectedIndex = null;
                    this._updateBubbleStates();
                }
            }

            // ---------- 胜利处理 ----------
            _handleVictory() {
                this.state = 'completed';
                this._stopTimer();
                this.sound.playVictory();

                const timeStr = this._formatTime(this.seconds);
                const book = this.bookSelect.value;
                const unitIdx = parseInt(this.unitSelect.value);
                const unitName = WORD_DATA[book]?.units[unitIdx]?.name || '';

                const isLastLevel = this.currentLevel >= this.totalLevels - 1;

                this.victoryTime.textContent = `⏱️ 用时 ${timeStr}`;
                this.victoryLevel.textContent = isLastLevel
                    ? `${book} · ${unitName}  2 关全部完成`
                    : `${book} · ${unitName}  第 ${this.currentLevel + 1} 关完成`;
                this.victoryOverlay.classList.add('show');

                this.statusBadge.textContent = '🎉 通关！';
                this.statusBadge.className = 'status-badge completed';
                this.btnStart.disabled = true;
                this.btnContinueAuto.textContent = isLastLevel ? '重新挑战本单元' : '进入第 2 关';
                this._updateBubbleStates();
            }

            // ---------- 胜利后按钮动作：进入下一关 或 重新挑战本单元 ----------
            handleNextAction() {
                this.victoryOverlay.classList.remove('show');

                if (this.currentLevel < this.totalLevels - 1) {
                    // 还有第 2 关：加载下一关并自动开始
                    this._loadLevel(this.currentLevel + 1);
                    this.startGame();
                    return;
                }

                // 两关都完成：用当前单元全部单词重新洗牌分组，从第 1 关开始
                const book = this.bookSelect.value;
                const unitIdx = parseInt(this.unitSelect.value);
                const data = WORD_DATA[book];
                if (!data || !data.units[unitIdx]) {
                    this.loadSelectedUnit();
                    return;
                }
                const unit = data.units[unitIdx];
                const wordMap = new Map();
                unit.words.forEach(w => {
                    const key = w.en + '|' + w.zh;
                    if (!wordMap.has(key)) {
                        wordMap.set(key, w);
                    }
                });
                const uniqueWords = Array.from(wordMap.values());
                const shuffled = this._shuffle([...uniqueWords]);
                const half = Math.ceil(shuffled.length / 2);
                this.unitWords = uniqueWords;
                this.levelGroups = [shuffled.slice(0, half), shuffled.slice(half)];

                this._loadLevel(0);
                this.startGame();
            }

            // ---------- 计时器 ----------
            _startTimer() {
                this._stopTimer();
                this.seconds = 0;
                this.timerDisplay.textContent = '⏱️ 00:00';
                this.timerInterval = setInterval(() => {
                    this.seconds++;
                    this.timerDisplay.textContent = `⏱️ ${this._formatTime(this.seconds)}`;
                }, 1000);
            }

            _stopTimer() {
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                    this.timerInterval = null;
                }
            }

            _formatTime(sec) {
                const m = String(Math.floor(sec / 60)).padStart(2, '0');
                const s = String(Math.floor(sec % 60)).padStart(2, '0');
                return `${m}:${s}`;
            }

            // ---------- 开始游戏 ----------
            startGame() {
                if (this.state === 'playing') return;
                if (this.state === 'completed') return;
                if (this.bubbles.length === 0) {
                    this.loadSelectedUnit();
                    return;
                }
                this.selectedIndex = null;
                this.state = 'playing';
                this._startTimer();
                this.statusBadge.innerHTML = `${PLAY_SVG} 游戏进行中...`;
                this.statusBadge.className = 'status-badge playing';
                this.btnStart.disabled = true;
                this._updateBubbleStates();
            }

            // ---------- 重置 ----------
            resetGame() {
                this._stopTimer();
                this.victoryOverlay.classList.remove('show');
                this.state = 'idle';
                this.selectedIndex = null;
                this.matchedPairs = 0;
                this.isProcessing = false;
                this.seconds = 0;
                this.timerDisplay.textContent = '⏱️ 00:00';
                this.statusBadge.textContent = '⏳ 已重置';
                this.statusBadge.className = 'status-badge idle';
                this.btnStart.disabled = false;

                // 重新加载当前单元（重新洗牌分组，从第 1 关开始）
                const book = this.bookSelect.value;
                const unitIdx = parseInt(this.unitSelect.value);
                const data = WORD_DATA[book];
                if (data && data.units[unitIdx]) {
                    const unit = data.units[unitIdx];
                    this.unitLabel.textContent = `${book} · ${unit.name}`;
                    const wordMap = new Map();
                    unit.words.forEach(w => {
                        const key = w.en + '|' + w.zh;
                        if (!wordMap.has(key)) {
                            wordMap.set(key, w);
                        }
                    });
                    const uniqueWords = Array.from(wordMap.values());
                    const shuffled = this._shuffle([...uniqueWords]);
                    const half = Math.ceil(shuffled.length / 2);
                    this.unitWords = uniqueWords;
                    this.levelGroups = [shuffled.slice(0, half), shuffled.slice(half)];

                    this._loadLevel(0);
                    this.statusBadge.textContent = '⏳ 等待开始';
                    this.statusBadge.className = 'status-badge idle';
                    this.btnStart.disabled = false;
                    this.unitLabel.textContent += `（共 ${this.unitWords.length} 个单词，分 2 关，本关 ${this.levelGroups[0].length} 个）`;
                    this._updateBubbleStates();
                } else {
                    this._renderEmptyGrid();
                }
                this.btnContinueAuto.textContent = '进入第 2 关';
            }

            _updateUI() {
                // 更新状态显示
                if (this.state === 'idle') {
                    this.statusBadge.textContent = '⏳ 等待开始';
                    this.statusBadge.className = 'status-badge idle';
                } else if (this.state === 'playing') {
                    this.statusBadge.innerHTML = `${PLAY_SVG} 游戏进行中...`;
                    this.statusBadge.className = 'status-badge playing';
                } else if (this.state === 'completed') {
                    this.statusBadge.textContent = '🎉 通关！';
                    this.statusBadge.className = 'status-badge completed';
                }
                this.levelBadge.textContent = `第 ${this.currentLevel+1} 关`;
            }
        }
