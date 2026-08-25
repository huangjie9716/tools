(function() {
        // ---- DOM 引用 ----
        const file1Input = document.getElementById('file1');
        const file2Input = document.getElementById('file2');
        const status1 = document.getElementById('status1');
        const status2 = document.getElementById('status2');
        const drop1 = document.getElementById('drop1');
        const drop2 = document.getElementById('drop2');
        const processBtn = document.getElementById('processBtn');
        const logBox = document.getElementById('logBox');
        const stateLabel = document.getElementById('stateLabel');
        const matchCount = document.getElementById('matchCount');
        const resultArea = document.getElementById('resultArea');
        const resultBody = document.getElementById('resultBody');
        const resultHead = document.getElementById('resultHead');
        const previewNote = document.getElementById('previewNote');
        const downloadBtn = document.getElementById('downloadBtn');
        const resetBtn = document.getElementById('resetBtn');
        const layerInput = document.getElementById('layerInput');
        const suggestLayer = document.getElementById('suggestLayer');
        const regressionArea = document.getElementById('regressionArea');
        const regressionFormula = document.getElementById('regressionFormula');
        const scatterPlot = document.getElementById('scatterPlot');
        const downloadPlotBtn = document.getElementById('downloadPlotBtn');
        const classStatsArea = document.getElementById('classStatsArea');
        const classStatsBody = document.getElementById('classStatsBody');
        const classStatsTitle = document.getElementById('classStatsTitle');
        const downloadClassStatsBtn = document.getElementById('downloadClassStatsBtn');
        const subjectButtons = document.getElementById('subjectButtons');
        const subjectRow = document.getElementById('subjectRow');
        const classButtons = document.getElementById('classButtons');
        const sortButtonsContainer = document.getElementById('sortButtons');
        const sortClassBtn = document.getElementById('sortClassBtn');
        const sortTValueBtn = document.getElementById('sortTValueBtn');
        const missingModal = document.getElementById('missingModal');
        const confirmModal = document.getElementById('confirmModal');
        const confirmOkBtn = document.getElementById('confirmOkBtn');
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');
        const missingValidCount = document.getElementById('missingValidCount');
        const missingListBody = document.getElementById('missingListBody');
        const missingContinueBtn = document.getElementById('missingContinueBtn');
        const missingCancelBtn = document.getElementById('missingCancelBtn');
        const viewCards = document.getElementById('viewCards');

        // ---- 状态 ----
        let currentView = 'result';
        let file1Data = null, file2Data = null;
        let file1Name = '', file2Name = '';
        let allSubjects = [];
        let subjectResults = {};
        let currentSubject = '';
        let currentSortType = 'class';
        let currentSortField = 'id';
        let currentClass = 'all';
        let classStatsCache = {};
        let plotData = null;

        // ---- 对勾图标（统一用 SVG 替换 ✅） ----
        const CHECK_ICON = '<img src="img/check-icon.svg" class="check-icon" alt="">';

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

        // ---- 自动填充建议层数 ----
        function autoFillLayerSuggestion() {
            if (file1Data && file2Data) {
                const n = Math.min(file1Data.length, file2Data.length);
                if (n > 0) {
                    const log2 = (x) => Math.log2(x);
                    const val = 2 * log2(n) - log2(100);
                    let suggested = Math.round(val);
                    if (suggested < 2) suggested = 2;
                    suggestLayer.textContent = suggested;
                    if (!layerInput.dataset.userChanged || layerInput.dataset.userChanged === 'false') {
                        layerInput.value = suggested;
                    }
                }
            }
        }

        // ---- 更新文件状态 ----
        function updateFileStatus() {
            if (file1Data) {
                status1.textContent = file1Name + ' (' + file1Data.length + ' 行)';
                drop1.classList.add('has-file');
            } else {
                status1.textContent = '未选择文件';
                drop1.classList.remove('has-file');
            }
            if (file2Data) {
                status2.textContent = file2Name + ' (' + file2Data.length + ' 行)';
                drop2.classList.add('has-file');
            } else {
                status2.textContent = '未选择文件';
                drop2.classList.remove('has-file');
            }
            processBtn.disabled = !(file1Data && file2Data);
            if (!file1Data || !file2Data) {
                stateLabel.textContent = '数据待分析';
                stateLabel.style.color = '#6c757d';
            } else {
                stateLabel.innerHTML = CHECK_ICON + ' 已就绪';
                stateLabel.style.color = '#28a745';
                autoFillLayerSuggestion();
            }
        }

        layerInput.addEventListener('input', function() {
            layerInput.dataset.userChanged = 'true';
        });

        // ---- 文件选择事件 ----
        function handleFileSelect(input, side) {
            const file = input.files[0];
            if (!file) return;
            const setData = (data) => {
                if (side === 1) { file1Data = data; file1Name = file.name; }
                else { file2Data = data; file2Name = file.name; }
                updateFileStatus();
                log('📎 已加载：' + file.name + '（' + data.length + ' 行）', 'ok');
            };
            readFileAsArray(file)
                .then(data => {
                    if (!data || data.length === 0) { log('⚠️ 文件为空：' + file.name, 'err'); return; }
                    setData(data);
                })
                .catch(err => { log('❌ ' + err, 'err'); });
        }
        file1Input.addEventListener('change', function() { handleFileSelect(this, 1); });
        file2Input.addEventListener('change', function() { handleFileSelect(this, 2); });

        // ---- 拖拽支持 ----
        function setupDrop(area, input) {
            area.addEventListener('dragover', (e) => { e.preventDefault(); area.style.borderColor = '#4a90d9'; area.style.background = '#edf5ff'; });
            area.addEventListener('dragleave', () => { area.style.borderColor = '#d6e0ea'; area.style.background = '#f9fbfd'; });
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.style.borderColor = '#d6e0ea';
                area.style.background = '#f9fbfd';
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    input.files = files;
                    input.dispatchEvent(new Event('change'));
                }
            });
            area.addEventListener('click', () => input.click());
        }
        setupDrop(drop1, file1Input);
        setupDrop(drop2, file2Input);

        // ---- 日志 ----
        function log(msg, type = '') {
            const time = new Date().toLocaleTimeString();
            const prefix = type === 'ok' ? CHECK_ICON : type === 'err' ? '❌' : '⚡';
            logBox.innerHTML = logBox.innerHTML + '\n' + prefix + ' [' + time + '] ' + msg;
            logBox.scrollTop = logBox.scrollHeight;
            if (logBox.innerHTML.split('\n').length > 80) {
                const lines = logBox.innerHTML.split('\n');
                logBox.innerHTML = lines.slice(-60).join('\n');
            }
        }

        // ---- 核心：计算平均名次、百分等级、标准分 ----
        function computeRanksAndScores(scores) {
            const n = scores.length;
            if (n === 0) return [];
            const indexed = scores.map((s, idx) => ({ score: s, idx }));
            indexed.sort((a, b) => b.score - a.score);
            const ranks = new Array(n);
            let i = 0;
            while (i < n) {
                let j = i;
                while (j < n && indexed[j].score === indexed[i].score) j++;
                const avgRank = (i + 1 + j) / 2;
                for (let k = i; k < j; k++) {
                    ranks[indexed[k].idx] = avgRank;
                }
                i = j;
            }
            return ranks.map(rank => {
                const percentile = 1 - (rank - 0.5) / n;
                const p = Math.min(Math.max(percentile, 1e-12), 1 - 1e-12);
                const std = 500 + 100 * jStat.normal.inv(p, 0, 1);
                const finalStd = isFinite(std) ? std : 500;
                return { rank, percentile, stdScore: finalStd };
            });
        }

        // ---- 线性回归 ----
        function linearRegression(x, y) {
            const n = x.length;
            if (n < 2) return null;
            const sumX = x.reduce((a, b) => a + b, 0);
            const sumY = y.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
            const sumX2 = x.reduce((a, b) => a + b * b, 0);
            const meanX = sumX / n;
            const meanY = sumY / n;
            const slope = (sumXY - n * meanX * meanY) / (sumX2 - n * meanX * meanX);
            const intercept = meanY - slope * meanX;
            return { slope, intercept };
        }

        // ---- 计算样本标准差 ----
        function sampleStd(arr) {
            const n = arr.length;
            if (n < 2) return 0;
            const mean = arr.reduce((a, b) => a + b, 0) / n;
            const squaredDiffs = arr.map(v => (v - mean) ** 2);
            const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);
            return Math.sqrt(variance);
        }

        // ---- 对单个学科执行完整分析 ----
        function analyzeSubject(subjectName, commonData, layer) {
            const N = commonData.length;
            if (N === 0) return null;

            const s1 = commonData.map(r => r.score1);
            const s2 = commonData.map(r => r.score2);

            const res1 = computeRanksAndScores(s1);
            const res2 = computeRanksAndScores(s2);

            const step = N / layer;
            const layerRank1 = res1.map(r => {
                const val = 1 + Math.floor(r.rank / step);
                return Math.min(val, layer);
            });
            const layerRank2 = res2.map(r => {
                const val = 1 + Math.floor(r.rank / step);
                return Math.min(val, layer);
            });

            const baseData = commonData.map((r, idx) => ({
                id: r.id,
                name: r.name,
                class: r.class,
                raw1: r.score1,
                raw2: r.score2,
                rank1: res1[idx].rank,
                percentile1: res1[idx].percentile,
                std1: res1[idx].stdScore,
                layer1: layerRank1[idx],
                rank2: res2[idx].rank,
                percentile2: res2[idx].percentile,
                std2: res2[idx].stdScore,
                layer2: layerRank2[idx]
            }));

            // 分层回归
            const layerMap = new Map();
            baseData.forEach(r => {
                const l = r.layer1;
                if (!layerMap.has(l)) {
                    layerMap.set(l, { sum1: 0, sum2: 0, count: 0 });
                }
                const entry = layerMap.get(l);
                entry.sum1 += r.std1;
                entry.sum2 += r.std2;
                entry.count++;
            });
            const layers = Array.from(layerMap.keys()).sort((a, b) => a - b);
            const xMeans = layers.map(l => layerMap.get(l).sum1 / layerMap.get(l).count);
            const yMeans = layers.map(l => layerMap.get(l).sum2 / layerMap.get(l).count);

            let slope = 0, intercept = 0;
            let regressionOK = false;
            if (layers.length >= 2) {
                const reg = linearRegression(xMeans, yMeans);
                if (reg) {
                    slope = reg.slope;
                    intercept = reg.intercept;
                    regressionOK = true;
                }
            }

            const withPred = baseData.map(r => {
                let pred = 500;
                if (regressionOK) pred = intercept + slope * r.std1;
                return { ...r, predicted2: pred };
            });

            const withResidual = withPred.map(r => {
                const residual = r.std2 - r.predicted2;
                return { ...r, residual: residual };
            });

            const residuals = withResidual.map(r => r.residual);
            const resStd = sampleStd(residuals);

            const result = withResidual.map(r => {
                const tVal = (resStd === 0) ? 0 : r.residual / resStd;
                const overTwo = (tVal > 2) ? 1 : 0;
                const overOne = (tVal > 1) ? 1 : 0;
                const belowOne = (tVal < -1) ? 1 : 0;
                const belowTwo = (tVal < -2) ? 1 : 0;
                return {
                    ...r,
                    tValue: tVal,
                    overTwo, overOne, belowOne, belowTwo,
                    residualStd: resStd
                };
            });

            return {
                data: result,
                regression: { slope, intercept, regressionOK, xMeans, yMeans },
                residualStd: resStd,
                layerCount: layers.length
            };
        }

        // ---- 计算班级统计 ----
        function computeClassStatsForSubject(data) {
            const classMap = new Map();
            data.forEach(row => {
                const cls = row.class || '未知班级';
                if (!classMap.has(cls)) {
                    classMap.set(cls, {
                        students: [],
                        std1Sum: 0, std2Sum: 0, residualSum: 0,
                        overTwoCount: 0, overOneCount: 0, belowOneCount: 0, belowTwoCount: 0,
                        tValues: []
                    });
                }
                const entry = classMap.get(cls);
                entry.students.push(row);
                entry.std1Sum += row.std1;
                entry.std2Sum += row.std2;
                entry.residualSum += row.residual;
                entry.overTwoCount += row.overTwo;
                entry.overOneCount += row.overOne;
                entry.belowOneCount += row.belowOne;
                entry.belowTwoCount += row.belowTwo;
                entry.tValues.push(row.tValue);
            });

            const result = [];
            for (let [cls, entry] of classMap) {
                const n = entry.students.length;
                const meanStd1 = entry.std1Sum / n;
                const meanStd2 = entry.std2Sum / n;
                const meanResidual = entry.residualSum / n;
                const meanT = entry.tValues.reduce((a, b) => a + b, 0) / n;
                const classT = meanT * Math.sqrt(n);
                result.push({
                    class: cls,
                    count: n,
                    meanStd1, meanStd2, meanResidual,
                    overTwo: entry.overTwoCount,
                    overOne: entry.overOneCount,
                    belowOne: entry.belowOneCount,
                    belowTwo: entry.belowTwoCount,
                    classT
                });
            }
            result.sort((a, b) => {
                const aNum = parseFloat(a.class);
                const bNum = parseFloat(b.class);
                if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                return a.class.localeCompare(b.class);
            });
            return result;
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

        // ---- 班级排序函数（数字升序） ----
        function sortClassesNumerically(classes) {
            return classes.sort((a, b) => {
                const aNum = parseFloat(a);
                const bNum = parseFloat(b);
                if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                return a.localeCompare(b);
            });
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

        // ---- 生成班级按钮 ----
        function buildClassButtons(classes, selected) {
            classButtons.innerHTML = '';
            const allBtn = document.createElement('button');
            allBtn.className = 'btn-sm' + (selected === 'all' ? ' active' : '');
            allBtn.textContent = '全部班级';
            allBtn.dataset.class = 'all';
            allBtn.addEventListener('click', function() {
                const cls = this.dataset.class;
                if (cls !== currentClass) {
                    currentClass = cls;
                    updateClassButtons();
                    if (currentSubject) {
                        renderStudentTable(currentSubject, currentClass, currentSortField);
                    }
                }
            });
            classButtons.appendChild(allBtn);

            const sorted = sortClassesNumerically([...classes]);
            sorted.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'btn-sm' + (selected === c ? ' active' : '');
                btn.textContent = c;
                btn.dataset.class = c;
                btn.addEventListener('click', function() {
                    const cls = this.dataset.class;
                    if (cls !== currentClass) {
                        currentClass = cls;
                        updateClassButtons();
                        if (currentSubject) {
                            renderStudentTable(currentSubject, currentClass, currentSortField);
                        }
                    }
                });
                classButtons.appendChild(btn);
            });
        }

        // ---- 更新班级按钮高亮 ----
        function updateClassButtons() {
            const btns = classButtons.querySelectorAll('.btn-sm');
            btns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.class === currentClass);
            });
        }

        // ---- 生成排序按钮并绑定事件 ----
        function initSortButtons() {
            const btns = sortButtonsContainer.querySelectorAll('.btn-sm');
            btns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const sort = this.dataset.sort;
                    if (sort !== currentSortField) {
                        btns.forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        currentSortField = sort;
                        if (currentSubject) {
                            renderStudentTable(currentSubject, currentClass, currentSortField);
                        }
                    }
                });
            });
        }

        // ---- 渲染学生表格 ----
        function renderStudentTable(subject, filterClass = 'all', sortField = 'id') {
            const data = subjectResults[subject];
            if (!data) return;
            let filtered = filterClass === 'all' ? data : data.filter(row => row.class === filterClass);

            // 更新班级按钮
            const classes = [...new Set(data.map(r => r.class).filter(c => c))];
            if (!classButtons._initialized || subject !== currentSubject) {
                buildClassButtons(classes, filterClass);
                classButtons._initialized = true;
            } else {
                updateClassButtons();
            }

            // 排序
            const sorted = sortStudentRows(filtered, sortField);

            // 截取前50
            let displayData = sorted;
            let previewMsg = '';
            if (filterClass === 'all' && sorted.length > 50) {
                displayData = sorted.slice(0, 50);
                previewMsg = `（仅显示前50名，共${sorted.length}人）`;
            } else {
                previewMsg = `（共${sorted.length}人）`;
            }
            previewNote.textContent = previewMsg;

            // 构建表头
            const headers = [
                { key: 'id', label: '学号', cls: 'col-id' },
                { key: 'name', label: '姓名', cls: 'col-name' },
                { key: 'class', label: '班级号', cls: 'col-class' },
                { key: 'raw1', label: '第一次原始分', cls: 'col-raw' },
                { key: 'rank1', label: '第一次名次', cls: 'col-rank' },
                { key: 'percentile1', label: '第一次百分等级', cls: 'col-percentile' },
                { key: 'std1', label: '第一次标准分', cls: 'col-std' },
                { key: 'layer1', label: '第一次分层名次', cls: 'col-layer' },
                { key: 'raw2', label: '第二次原始分', cls: 'col-raw' },
                { key: 'rank2', label: '第二次名次', cls: 'col-rank' },
                { key: 'percentile2', label: '第二次百分等级', cls: 'col-percentile' },
                { key: 'std2', label: '第二次标准分', cls: 'col-std' },
                { key: 'layer2', label: '第二次分层名次', cls: 'col-layer' },
                { key: 'predicted2', label: '预测成绩', cls: 'col-pred' },
                { key: 'residual', label: '进步分(残差)', cls: 'col-residual' },
                { key: 'residualStd', label: '残差标准差', cls: 'col-residstd' },
                { key: 'tValue', label: '个人T值', cls: 'col-tvalue' },
                { key: 'overTwo', label: '超两标', cls: 'col-flag' },
                { key: 'overOne', label: '超一标', cls: 'col-flag' },
                { key: 'belowOne', label: '退一标', cls: 'col-flag' },
                { key: 'belowTwo', label: '退两标', cls: 'col-flag' }
            ];

            let theadHtml = '<tr>';
            headers.forEach(h => {
                theadHtml += `<th class="${h.cls}">${h.label}</th>`;
            });
            theadHtml += '</tr>';
            resultHead.innerHTML = theadHtml;

            // 填充数据（重点列着色：T值 >0 绿 / <0 红；超两标、超一标绿；退一标、退两标红）
            const tbody = resultBody;
            tbody.innerHTML = '';
            displayData.forEach(row => {
                const tr = document.createElement('tr');
                headers.forEach(h => {
                    const td = document.createElement('td');
                    const v = row[h.key];
                    td.textContent = formatValue(h.key, v);
                    if (h.key === 'tValue') {
                        if (v > 0) td.className = 'cell-green';
                        else if (v < 0) td.className = 'cell-red';
                    } else if (h.key === 'overTwo' || h.key === 'overOne') {
                        td.className = v === 1 ? 'cell-green' : 'cell-muted';
                    } else if (h.key === 'belowOne' || h.key === 'belowTwo') {
                        td.className = v === 1 ? 'cell-red' : 'cell-muted';
                    }
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });

            // 更新排序按钮高亮
            const sortBtns = sortButtonsContainer.querySelectorAll('.btn-sm');
            sortBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sort === sortField);
            });
            currentSortField = sortField;
        }

        // ---- 渲染班级统计 ----
        function renderClassStats(subject, sortType = 'class') {
            const stats = classStatsCache[subject];
            if (!stats) return;
            classStatsTitle.textContent = `班级统计汇总（当前学科：${subject}）`;

            let sorted = [...stats];
            if (sortType === 'tvalue') {
                sorted.sort((a, b) => b.classT - a.classT);
            } else {
                sorted.sort((a, b) => {
                    const aNum = parseFloat(a.class);
                    const bNum = parseFloat(b.class);
                    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                    return a.class.localeCompare(b.class);
                });
            }
            const tbody = classStatsBody;
            tbody.innerHTML = '';
            sorted.forEach(row => {
                const tr = document.createElement('tr');
                const cells = [
                    { text: String(row.class), cls: '' },
                    { text: String(row.count), cls: '' },
                    { text: row.meanStd1.toFixed(2), cls: '' },
                    { text: row.meanStd2.toFixed(2), cls: '' },
                    { text: row.meanResidual.toFixed(2), cls: '' },
                    { text: String(row.overTwo), cls: row.overTwo > 0 ? 'cell-green' : 'cell-muted' },
                    { text: String(row.overOne), cls: row.overOne > 0 ? 'cell-green' : 'cell-muted' },
                    { text: String(row.belowOne), cls: row.belowOne > 0 ? 'cell-red' : 'cell-muted' },
                    { text: String(row.belowTwo), cls: row.belowTwo > 0 ? 'cell-red' : 'cell-muted' },
                    { text: row.classT.toFixed(3), cls: row.classT > 0 ? 'cell-green' : (row.classT < 0 ? 'cell-red' : '') }
                ];
                cells.forEach(c => {
                    const td = document.createElement('td');
                    td.textContent = c.text;
                    if (c.cls) td.className = c.cls;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            // 强调当前排序方式
            sortClassBtn.classList.toggle('active', sortType === 'class');
            sortTValueBtn.classList.toggle('active', sortType === 'tvalue');
            currentSortType = sortType;
        }

        // ---- 绘制回归散点图 ----
        function drawRegressionForSubject(subject) {
            const data = subjectResults[subject];
            if (!data || data.length === 0) return;
            const layerMap = new Map();
            data.forEach(r => {
                const l = r.layer1;
                if (!layerMap.has(l)) {
                    layerMap.set(l, { sum1: 0, sum2: 0, count: 0 });
                }
                const entry = layerMap.get(l);
                entry.sum1 += r.std1;
                entry.sum2 += r.std2;
                entry.count++;
            });
            const layers = Array.from(layerMap.keys()).sort((a, b) => a - b);
            const xMeans = layers.map(l => layerMap.get(l).sum1 / layerMap.get(l).count);
            const yMeans = layers.map(l => layerMap.get(l).sum2 / layerMap.get(l).count);

            const reg = linearRegression(xMeans, yMeans);
            if (!reg) {
                plotData = null;
                regressionArea.style.display = 'none';
                return;
            }
            const { slope, intercept } = reg;

            // 回归线（黑色虚线）
            const xMin = Math.min(...xMeans);
            const xMax = Math.max(...xMeans);
            const xRange = [xMin - 10, xMax + 10];
            const yRange = xRange.map(x => slope * x + intercept);
            const trace2 = {
                x: xRange,
                y: yRange,
                mode: 'lines',
                type: 'scatter',
                line: { color: '#000000', width: 2.5, dash: 'dash' },
                name: '回归线'
            };

            // 分层点按高于/低于回归线分组着色（高于绿、低于红），附残差线与放大的距离数字
            const aboveX = [], aboveY = [], belowX = [], belowY = [];
            const residualTraces = [];
            const annotations = [];
            xMeans.forEach((x, i) => {
                const y = yMeans[i];
                const yPred = slope * x + intercept;
                const diff = y - yPred;
                const color = diff >= 0 ? '#28a745' : '#e74c3c';
                if (diff >= 0) { aboveX.push(x); aboveY.push(y); }
                else { belowX.push(x); belowY.push(y); }
                residualTraces.push({
                    x: [x, x],
                    y: [y, yPred],
                    mode: 'lines',
                    type: 'scatter',
                    line: { color: color, width: 2 },
                    showlegend: false,
                    hoverinfo: 'skip'
                });
                const sign = diff >= 0 ? '+' : '';
                const label = sign + diff.toFixed(2);
                const yOffset = (diff >= 0) ? 8 : -8;
                annotations.push({
                    x: x,
                    y: y + yOffset,
                    text: label,
                    showarrow: false,
                    font: { color: color, size: 15 },
                    xanchor: 'center',
                    yanchor: (diff >= 0) ? 'bottom' : 'top'
                });
            });
            const traceAbove = {
                x: aboveX,
                y: aboveY,
                mode: 'markers',
                type: 'scatter',
                marker: { size: 13, color: '#28a745' },
                name: '高于回归线'
            };
            const traceBelow = {
                x: belowX,
                y: belowY,
                mode: 'markers',
                type: 'scatter',
                marker: { size: 13, color: '#e74c3c' },
                name: '低于回归线'
            };

            const allTraces = [traceAbove, traceBelow, trace2, ...residualTraces];
            const layout = {
                title: `【${subject}】第一次标准分均值 vs 第二次标准分均值`,
                xaxis: { title: '第一次标准分均值' },
                yaxis: { title: '第二次标准分均值' },
                hovermode: 'closest',
                margin: { l: 60, r: 40, t: 50, b: 60 },
                annotations: annotations
            };
            const config = { responsive: true, displayModeBar: true };
            Plotly.newPlot(scatterPlot, allTraces, layout, config);
            plotData = { data: allTraces, layout, config };
            const formulaText = `y = ${intercept.toFixed(4)} + ${slope.toFixed(4)} · x`;
            regressionFormula.innerHTML = `<code>经验回归方程：${formulaText}</code>`;
            downloadPlotBtn.onclick = function() {
                if (plotData) {
                    Plotly.downloadImage(scatterPlot, { format: 'png', filename: `回归散点图_${subject}` });
                }
            };
        }

        // ---- 视图切换卡片 ----
        function switchView(view) {
            resultArea.style.display = view === 'result' ? 'block' : 'none';
            regressionArea.style.display = view === 'regression' ? 'block' : 'none';
            classStatsArea.style.display = view === 'classstats' ? 'block' : 'none';
            document.querySelectorAll('#viewCards .view-card').forEach(card => {
                card.classList.toggle('active', card.dataset.view === view);
            });
            currentView = view;
            // 切到回归视图时在可见容器中重绘，避免隐藏容器导致图表尺寸异常
            if (view === 'regression' && currentSubject && subjectResults[currentSubject]) {
                drawRegressionForSubject(currentSubject);
            }
        }

        // ---- 生成学科按钮（按表头顺序） ----
        function buildSubjectButtons() {
            subjectButtons.innerHTML = '';
            const validSubjects = allSubjects.filter(s => subjectResults[s]);
            validSubjects.forEach(sub => {
                const btn = document.createElement('button');
                btn.className = 'subject-btn' + (sub === currentSubject ? ' active' : '');
                btn.textContent = sub;
                btn.dataset.subject = sub;
                btn.addEventListener('click', function() {
                    const selected = this.dataset.subject;
                    if (selected && subjectResults[selected]) {
                        switchSubject(selected);
                    }
                });
                subjectButtons.appendChild(btn);
            });
        }

        // ---- 切换学科 ----
        function switchSubject(subject) {
            if (!subject || !subjectResults[subject]) return;
            currentSubject = subject;
            document.querySelectorAll('#subjectButtons .subject-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.subject === subject);
            });
            currentClass = 'all';
            const classes = [...new Set(subjectResults[subject].map(r => r.class).filter(c => c))];
            buildClassButtons(classes, 'all');
            classButtons._initialized = true;

            renderStudentTable(subject, currentClass, currentSortField);
            renderClassStats(subject, currentSortType);
            drawRegressionForSubject(subject);
        }

        // ---- 主处理 ----
        async function processData() {
            if (!file1Data || !file2Data) {
                alert('请先上传两个成绩表！');
                return;
            }

            let layer = parseInt(layerInput.value);
            if (isNaN(layer) || layer < 2) {
                alert('请输入有效的层数（正整数 ≥ 2）');
                return;
            }

            log('🔍 开始处理，层数 = ' + layer, '');

            const h1 = file1Data[0] || {};
            const h2 = file2Data[0] || {};
            // 识别各列
            const idKey1 = findKey(h1, ['学号', 'ID', 'id', '编号']);
            const nameKey1 = findKey(h1, ['姓名', '名字', 'name', 'Name']);
            const classKey1 = findKey(h1, ['班级', 'class', 'Class', '班级号']);
            const scoreKey1 = findKey(h1, ['总分', '成绩', '分数', 'score', 'Score']);
            const idKey2 = findKey(h2, ['学号', 'ID', 'id', '编号']);
            const nameKey2 = findKey(h2, ['姓名', '名字', 'name', 'Name']);
            const classKey2 = findKey(h2, ['班级', 'class', 'Class', '班级号']);
            const scoreKey2 = findKey(h2, ['总分', '成绩', '分数', 'score', 'Score']);

            if (!idKey1 || !scoreKey1) {
                log('❌ 第一次成绩表缺少"学号"或"总分"列', 'err');
                alert('第一次成绩表缺少"学号"或"总分"列，请检查表头。');
                return;
            }
            if (!idKey2 || !scoreKey2) {
                log('❌ 第二次成绩表缺少"学号"或"总分"列', 'err');
                alert('第二次成绩表缺少"学号"或"总分"列，请检查表头。');
                return;
            }

            // ---- 按表头顺序识别学科（总分固定在最前） ----
            // 排除列：学号、姓名、班级相关列，以及成绩列本身
            const excludePatterns = ['学号', 'ID', 'id', '编号', '姓名', '名字', 'name', 'Name', '班级', 'class', 'Class', '班级号', '总分', '成绩', '分数', 'score', 'Score'];
            const keys1 = Object.keys(h1);
            const subjectKeys = [];
            // 遍历表头，按出现顺序添加非排除列
            for (let k of keys1) {
                if (excludePatterns.some(p => k.includes(p))) continue;
                // 避免重复添加（如果第二次表有不同列名，但这里以第一次表为准）
                if (!subjectKeys.includes(k)) {
                    subjectKeys.push(k);
                }
            }
            // 最终学科列表：'总分' + 按表头顺序出现的其他学科
            const subjectList = ['总分', ...subjectKeys];
            allSubjects = subjectList;

            log('📚 识别到学科（按表头顺序）：' + subjectList.join(', '), '');

            // 提取数据（包含姓名）
            const map1 = new Map();
            const map2 = new Map();

            file1Data.forEach(row => {
                const id = String(row[idKey1]).trim();
                const name = nameKey1 ? String(row[nameKey1]).trim() : '';
                const cls = classKey1 ? String(row[classKey1]).trim() : '';
                const score = parseFloat(row[scoreKey1]);
                if (id && id !== 'undefined' && !isNaN(score)) {
                    const subjects = {};
                    subjectList.forEach(sub => {
                        if (sub === '总分') {
                            subjects[sub] = score;
                        } else {
                            subjects[sub] = parseFloat(row[sub]) || 0;
                        }
                    });
                    map1.set(id, { name: name, class: cls, subjects: subjects });
                }
            });

            file2Data.forEach(row => {
                const id = String(row[idKey2]).trim();
                const name = nameKey2 ? String(row[nameKey2]).trim() : '';
                const cls = classKey2 ? String(row[classKey2]).trim() : '';
                const score = parseFloat(row[scoreKey2]);
                if (id && id !== 'undefined' && !isNaN(score)) {
                    const subjects = {};
                    subjectList.forEach(sub => {
                        if (sub === '总分') {
                            subjects[sub] = score;
                        } else {
                            subjects[sub] = parseFloat(row[sub]) || 0;
                        }
                    });
                    map2.set(id, { name: name, class: cls, subjects: subjects });
                }
            });

            // 对齐（按学号）
            const common = [];
            for (let [id, v1] of map1) {
                if (map2.has(id)) {
                    common.push({
                        id: id,
                        name: v1.name || map2.get(id).name || '',
                        class: v1.class || map2.get(id).class || '',
                        subjects1: v1.subjects,
                        subjects2: map2.get(id).subjects
                    });
                }
            }
            if (common.length === 0) {
                log('❌ 两次成绩无交集学号，请检查数据', 'err');
                alert('两次成绩表没有共同的学号，无法匹配！');
                return;
            }
            log('匹配到 ' + common.length + ' 名共同学生', 'ok');
            matchCount.textContent = common.length;

            // ---- 缺失数据检测与用户确认（不改变匹配逻辑，仅统计未匹配学号）----
            const missingStudents = [];
            for (let [id, v] of map1) {
                if (!map2.has(id)) missingStudents.push({ id: id, name: v.name || '未知', note: '缺少第二次成绩' });
            }
            for (let [id, v] of map2) {
                if (!map1.has(id)) missingStudents.push({ id: id, name: v.name || '未知', note: '缺少第一次成绩' });
            }
            if (missingStudents.length > 0) {
                log(`⚠️ 检测到 ${missingStudents.length} 名学生存在考试数据缺失，有效人数 ${common.length} 人`, '');
                const proceed = await confirmMissingData(common.length, missingStudents);
                if (!proceed) {
                    log('⏹️ 用户取消分析，未生成结果', '');
                    return;
                }
            }

            // ---- 分析每个学科 ----
            subjectResults = {};
            classStatsCache = {};
            allSubjects.forEach(sub => {
                log(`🔍 正在分析学科：${sub}`, '');
                const subjectData = common.map(r => ({
                    id: r.id,
                    name: r.name,
                    class: r.class,
                    score1: r.subjects1[sub] || 0,
                    score2: r.subjects2[sub] || 0
                }));
                const result = analyzeSubject(sub, subjectData, layer);
                if (result) {
                    subjectResults[sub] = result.data;
                    const stats = computeClassStatsForSubject(result.data);
                    classStatsCache[sub] = stats;
                    log(`${sub} 分析完成，有效人数 ${result.data.length}`, 'ok');
                } else {
                    log(`⚠️ ${sub} 分析失败，跳过`, 'err');
                }
            });

            // 初始化排序按钮事件
            initSortButtons();

            // 生成学科按钮
            buildSubjectButtons();
            const firstSub = allSubjects.find(s => subjectResults[s]);
            if (firstSub) {
                subjectRow.style.display = 'flex';
                viewCards.style.display = 'flex';
                switchView('result');
                currentSortType = 'class';
                currentSortField = 'id';
                currentClass = 'all';
                stateLabel.innerHTML = CHECK_ICON + ' 分析完成';
                stateLabel.style.color = '#28a745';
                switchSubject(firstSub);
                // 绑定班级统计排序事件
                sortClassBtn.onclick = function() {
                    if (currentSubject) {
                        renderClassStats(currentSubject, 'class');
                    }
                };
                sortTValueBtn.onclick = function() {
                    if (currentSubject) {
                        renderClassStats(currentSubject, 'tvalue');
                    }
                };
                downloadClassStatsBtn.onclick = function() {
                    downloadClassStatsExcel();
                };
                downloadBtn.onclick = function() {
                    downloadCurrentSubjectExcel();
                };
                log('🎉 所有学科分析完成！', 'ok');
            } else {
                alert('没有成功分析任何学科，请检查数据。');
            }
        }

        // ---- 缺失数据提醒弹窗（返回 Promise，用户确认后 resolve） ----
        function confirmMissingData(validCount, missingList) {
            return new Promise((resolve) => {
                missingValidCount.textContent = validCount;
                missingListBody.innerHTML = '';
                missingList.forEach(item => {
                    const tr = document.createElement('tr');
                    const tdId = document.createElement('td');
                    tdId.textContent = item.id;
                    const tdName = document.createElement('td');
                    tdName.textContent = item.name;
                    const tdNote = document.createElement('td');
                    tdNote.textContent = item.note;
                    tr.appendChild(tdId);
                    tr.appendChild(tdName);
                    tr.appendChild(tdNote);
                    missingListBody.appendChild(tr);
                });
                missingModal.style.display = 'flex';
                let settled = false;
                const done = (val) => {
                    if (settled) return;
                    settled = true;
                    missingModal.style.display = 'none';
                    resolve(val);
                };
                missingContinueBtn.onclick = () => done(true);
                missingCancelBtn.onclick = () => done(false);
            });
        }

        // ---- 下载当前学科数据 ----
        function downloadCurrentSubjectExcel() {
            const sub = currentSubject;
            if (!sub || !subjectResults[sub]) {
                alert('没有数据可下载，请先处理。');
                return;
            }
            // 跟随当前筛选：班级 + 排序（与页面表格保持一致）
            let data = subjectResults[sub];
            if (currentClass !== 'all') {
                data = data.filter(row => row.class === currentClass);
            }
            data = sortStudentRows(data, currentSortField);
            const exportArr = data.map(r => ({
                '学号': r.id,
                '姓名': r.name || '',
                '班级号': r.class || '',
                '第一次原始分': r.raw1,
                '第一次名次': r.rank1,
                '第一次百分等级': r.percentile1,
                '第一次标准分': r.std1,
                '第一次分层名次': r.layer1,
                '第二次原始分': r.raw2,
                '第二次名次': r.rank2,
                '第二次百分等级': r.percentile2,
                '第二次标准分': r.std2,
                '第二次分层名次': r.layer2,
                '预测成绩': r.predicted2,
                '进步分（残差）': r.residual,
                '残差标准差': r.residualStd,
                '个人T值': r.tValue,
                '超两标': r.overTwo,
                '超一标': r.overOne,
                '退一标': r.belowOne,
                '退两标': r.belowTwo
            }));
            const ws = XLSX.utils.json_to_sheet(exportArr);
            const colWidths = [];
            for (let key in exportArr[0]) {
                colWidths.push({ wch: Math.max(key.length * 1.2, 12) });
            }
            ws['!cols'] = colWidths;
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sub);
            const classLabel = currentClass === 'all' ? '全部班级' : currentClass;
            const sortLabelMap = { id: '按学号', rank2: '按第二次名次', tValue: '按个人T值' };
            const sortLabel = sortLabelMap[currentSortField] || '默认排序';
            const fileName = `增值分析_${sub}_${classLabel}_${sortLabel}.xlsx`;
            XLSX.writeFile(wb, fileName);
            log(`📥 下载成功：${fileName}`, 'ok');
        }

        // ---- 下载班级统计 ----
        function downloadClassStatsExcel() {
            const sub = currentSubject;
            if (!sub || !classStatsCache[sub]) {
                alert('没有班级统计数据，请先处理。');
                return;
            }
            const stats = classStatsCache[sub];
            const exportArr = stats.map(r => ({
                '班级': r.class,
                '人数': r.count,
                '第一次标准分均值': r.meanStd1,
                '第二次标准分均值': r.meanStd2,
                '残差均值': r.meanResidual,
                '超两标人数': r.overTwo,
                '超一标人数': r.overOne,
                '退一标人数': r.belowOne,
                '退两标人数': r.belowTwo,
                '班级T值': r.classT
            }));
            const ws = XLSX.utils.json_to_sheet(exportArr);
            ws['!cols'] = [
                { wch: 14 }, { wch: 8 }, { wch: 18 }, { wch: 18 },
                { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
                { wch: 12 }, { wch: 14 }
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '班级统计');
            XLSX.writeFile(wb, `班级统计_${sub}.xlsx`);
            log(`📥 下载成功：班级统计_${sub}.xlsx`, 'ok');
        }

        // ---- 重置（弹出网页内确认框） ----
        function resetAll() {
            confirmModal.style.display = 'flex';
        }

        // ---- 执行重置 ----
        function doReset() {
            file1Data = null; file2Data = null;
            file1Name = ''; file2Name = '';
            subjectResults = {}; allSubjects = [];
            classStatsCache = {};
            file1Input.value = ''; file2Input.value = '';
            layerInput.dataset.userChanged = 'false';
            layerInput.value = 5;
            suggestLayer.textContent = '5';
            updateFileStatus();
            resultArea.style.display = 'none';
            resultBody.innerHTML = ''; resultHead.innerHTML = '';
            classStatsArea.style.display = 'none';
            classStatsBody.innerHTML = '';
            matchCount.textContent = '-';
            stateLabel.innerHTML = '数据待分析';
            stateLabel.style.color = '#6c757d';
            regressionArea.style.display = 'none';
            Plotly.purge(scatterPlot);
            subjectButtons.innerHTML = '';
            classButtons.innerHTML = '';
            previewNote.textContent = '';
            subjectRow.style.display = 'none';
            viewCards.style.display = 'none';
            viewCards.querySelectorAll('.view-card').forEach(c => c.classList.toggle('active', c.dataset.view === 'result'));
            currentView = 'result';
            log('🔄 已重置，可重新上传文件', '');
        }

        // ---- 绑定事件 ----
        processBtn.addEventListener('click', processData);
        resetBtn.addEventListener('click', resetAll);
        confirmOkBtn.addEventListener('click', function() {
            confirmModal.style.display = 'none';
            doReset();
        });
        confirmCancelBtn.addEventListener('click', function() {
            confirmModal.style.display = 'none';
        });
        viewCards.querySelectorAll('.view-card').forEach(card => {
            card.addEventListener('click', function() {
                switchView(this.dataset.view);
            });
        });

        // ---- 初始化 ----
        updateFileStatus();
        log('⚡ 就绪，请上传第一次成绩和第二次成绩表。', '');
    })();
