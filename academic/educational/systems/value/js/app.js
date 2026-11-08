(function() {
        // ---- DOM 引用 ----
        const status1 = document.getElementById('status1');
        const status2 = document.getElementById('status2');
        const drop1 = document.getElementById('drop1');
        const drop2 = document.getElementById('drop2');
        const processBtn = document.getElementById('processBtn');
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
        const advicePanel = document.getElementById('advicePanel');
        const adviceScope = document.getElementById('adviceScope');
        const adviceOverTwo = document.getElementById('adviceOverTwo');
        const adviceOverOne = document.getElementById('adviceOverOne');
        const adviceBelowTwo = document.getElementById('adviceBelowTwo');
        const adviceBelowOne = document.getElementById('adviceBelowOne');
        const regressionNote = document.getElementById('regressionNote');
        const statDetailModal = document.getElementById('statDetailModal');
        const statDetailTitle = document.getElementById('statDetailTitle');
        const statDetailScope = document.getElementById('statDetailScope');
        const statDetailBody = document.getElementById('statDetailBody');
        const statDetailCloseBtn = document.getElementById('statDetailCloseBtn');

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
        let resultQuery = '';
        let resultCols = 'simple';
        let resultPage = 1;
        let resultPageSize = 50;
        let classStatsCache = {};
        let plotData = null;

        // ---- 对勾图标（统一用 SVG 替换 ✅） ----
        const CHECK_ICON = '<img src="img/check-icon.svg" class="check-icon" alt="">';

        // ---- 工具：查找列名 ----
        // 先精确匹配，再忽略大小写精确匹配，最后才退化为包含匹配；
        // 避免「总分」误命中「总分排名」、「班级」误命中「班级排名」等派生列。
        function findKey(row, patterns) {
            if (!row) return null;
            const keys = Object.keys(row).filter(k => k !== null && k !== undefined);
            const low = s => String(s).replace(/\s+/g, '').toLowerCase();
            for (let p of patterns) {
                const hit = keys.find(k => low(k) === low(p));
                if (hit) return hit;
            }
            for (let p of patterns) {
                const hit = keys.find(k => low(k).includes(low(p)) && !/排名|名次|等级|等第/.test(String(k)));
                if (hit) return hit;
            }
            return null;
        }

        // ---- 学科名称规范化：不同考试/不同表格里的同义写法视为同一学科 ----
        const SUBJECT_ALIASES = {
            '道法': '政治',
            '道德与法治': '政治',
            '思想品德': '政治',
            '思想政治': '政治',
            '体育与健康': '体育',
            '外语': '英语'
        };

        function canonicalSubjectName(name) {
            const raw = String(name === null || name === undefined ? '' : name).replace(/\s+/g, '').trim();
            if (!raw) return '';
            // 上传时重名列会被追加「(2)」后缀，比较学科时要去掉
            const base = raw.replace(/[（(]\d+[）)]$/, '');
            return SUBJECT_ALIASES[base] || base;
        }

        // 非学科列（学号/姓名/班级/总分/排名/等级等）不应被当成学科
        const META_COLUMN_PATTERNS = [
            '学号', '学生学号', '考号', '考试号', '考生号', '准考证号', '学籍号', '学生编号', '编号', '序号',
            '姓名', '学生姓名', '名字', '班级', '班级名称', '班级号', '班别', '行政班', '教学班', '所在班级', '班号',
            '总分', '总成绩', '合计', '总计', '成绩', '分数', '排名', '名次', '等级', '等第',
            '考场', '考室', '座位', '性别', '备注', '学校', '年级'
        ];

        function isMetaColumn(name) {
            const k = String(name === null || name === undefined ? '' : name).replace(/\s+/g, '').trim();
            if (!k) return true;
            if (META_COLUMN_PATTERNS.indexOf(k) >= 0) return true;
            if (/^(id|name|class|score|total)$/i.test(k)) return true;
            return /排名|名次|等级|等第|总分|总成绩|合计|总计|成绩|分数/.test(k);
        }

        function toScore(v) {
            if (v === null || v === undefined) return null;
            if (typeof v === 'number') return isFinite(v) ? v : null;
            const s = String(v).replace(/,/g, '').trim();
            if (!s) return null;
            const n = parseFloat(s);
            return isFinite(n) ? n : null;
        }

        function firstScore(row, keys) {
            for (let i = 0; i < keys.length; i++) {
                const v = toScore(row[keys[i]]);
                if (v !== null) return v;
            }
            return null;
        }

        // 分别识别一张成绩表里的学科列（按表头顺序，保留原始列名与规范化名称）
        function detectSubjectColumns(rows, metaKeys) {
            const first = (rows && rows[0]) || {};
            const metaSet = new Set((metaKeys || []).filter(Boolean));
            const cols = [];
            Object.keys(first).forEach(key => {
                if (metaSet.has(key) || isMetaColumn(key)) return;
                let hasScore = false;
                for (let i = 0; i < rows.length; i++) {
                    if (toScore(rows[i] ? rows[i][key] : null) !== null) { hasScore = true; break; }
                }
                if (!hasScore) return;
                cols.push({
                    key: key,
                    name: String(key).replace(/\s+/g, '').trim(),
                    canonical: canonicalSubjectName(key)
                });
            });
            return cols;
        }

        // 同名/别名列合并为一个学科（逐行取第一个有效分数）
        function groupSubjectColumns(cols) {
            const grouped = new Map();
            (cols || []).forEach(c => {
                if (!grouped.has(c.canonical)) grouped.set(c.canonical, { name: c.name, keys: [] });
                grouped.get(c.canonical).keys.push(c.key);
            });
            return grouped;
        }

        // ---- 学科对齐提示 ----
        function renderValueNotice(info) {
            const el = document.getElementById('valueNotice');
            if (!el) return;
            const commonNames = info.commonSubjects.map(s => s.label);
            const lines = [];
            lines.push('<div><strong>参与分析：</strong>' +
                (info.pairableCount !== undefined
                    ? '两次都参加考试的学生 ' + info.matchedCount + ' 人，其中至少有一门共同学科两次成绩齐全、实际参与分析的 ' + info.pairableCount + ' 人。'
                    : '') +
                '两次考试都有成绩的学科共 ' + (commonNames.length + 1) +
                ' 科（含总分）：' + ['总分'].concat(commonNames).map(valueEscapeHtml).join('、') + '</div>');
            if (info.onlyPre.length || info.onlyPost.length) {
                const parts = [];
                if (info.onlyPre.length) parts.push('仅前测有：' + info.onlyPre.join('、'));
                if (info.onlyPost.length) parts.push('仅后测有：' + info.onlyPost.join('、'));
                lines.push('<div style="margin-top:6px;"><strong>未纳入分析：</strong>' +
                    valueEscapeHtml(parts.join('；')) +
                    '。增值评价要求同一学科在两次考试中都有成绩，以上学科无法计算增值。</div>');
            }
            if (info.partialSubjects.length) {
                const parts = info.partialSubjects.map(p => p.label + ' ' + p.excluded + ' 人');
                lines.push('<div style="margin-top:6px;"><strong>该科缺考已排除：</strong>' +
                    valueEscapeHtml(parts.join('；')) + '（两次该科成绩不齐全的学生不参与该科分析）。</div>');
            }
            if (info.skippedSubjects.length) {
                const parts = info.skippedSubjects.map(p => p.label + '（' + p.reason + '）');
                lines.push('<div style="margin-top:6px;color:#b91c1c;"><strong>未能分析：</strong>' +
                    valueEscapeHtml(parts.join('；')) + '</div>');
            }
            el.innerHTML = lines.join('');
            el.style.display = 'block';
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
                status1.classList.remove('is-empty');
                drop1.classList.add('has-file');
            } else {
                status1.textContent = '请先选择考试';
                status1.classList.add('is-empty');
                drop1.classList.remove('has-file');
            }
            if (file2Data) {
                status2.textContent = file2Name + ' (' + file2Data.length + ' 行)';
                status2.classList.remove('is-empty');
                drop2.classList.add('has-file');
            } else {
                status2.textContent = '请先选择考试';
                status2.classList.add('is-empty');
                drop2.classList.remove('has-file');
            }
            const pick1 = drop1.querySelector('.jz-card-pick');
            const pick2 = drop2.querySelector('.jz-card-pick');
            if (pick1) pick1.textContent = file1Data ? '选择其他考试' : '＋ 选择前测考试';
            if (pick2) pick2.textContent = file2Data ? '选择其他考试' : '＋ 选择后测考试';
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

        // ---- 考试选择结果 ----
        function applySideData(side, data, name) {
            if (side === 1) { file1Data = data; file1Name = name; }
            else { file2Data = data; file2Name = name; }
            updateFileStatus();
        }

        // ---- 日志（界面日志版块已移除，保留空函数以兼容调用） ----
        function log() {}

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
            if (N < 2) return null;

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

        // ---- T值判定结论（统一口径，学生与班级统计共用） ----
        // T > 2：显著进步；1 < T ≤ 2：有进步；-1 ≤ T ≤ 1：正常/平稳；
        // -2 ≤ T < -1：有退步；T < -2：退步明显
        function getTConclusion(t) {
            const val = (typeof t === 'number' && isFinite(t)) ? t : 0;
            if (val > 2) return { text: '显著进步', cls: 'concl-excellent' };
            if (val > 1) return { text: '有进步', cls: 'concl-good' };
            if (val >= -1) return { text: '正常/平稳', cls: 'concl-normal' };
            if (val >= -2) return { text: '有退步', cls: 'concl-warn' };
            return { text: '退步明显', cls: 'concl-bad' };
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
            allBtn.textContent = '全级';
            allBtn.dataset.class = 'all';
            allBtn.addEventListener('click', function() {
                const cls = this.dataset.class;
                if (cls !== currentClass) {
                    currentClass = cls;
                    resultPage = 1;
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
                        resultPage = 1;
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
                        resultPage = 1;
                        if (currentSubject) {
                            renderStudentTable(currentSubject, currentClass, currentSortField);
                        }
                    }
                });
            });

            const searchBox = document.getElementById('resultSearch');
            if (searchBox) {
                searchBox.addEventListener('input', function () {
                    resultQuery = this.value;
                    resultPage = 1;
                    if (currentSubject) renderStudentTable(currentSubject, currentClass, currentSortField);
                });
            }

            const colBtns = document.querySelectorAll('#columnModeButtons .btn-sm');
            colBtns.forEach(btn => {
                btn.addEventListener('click', function () {
                    const mode = this.dataset.cols;
                    if (mode === resultCols) return;
                    resultCols = mode;
                    colBtns.forEach(b => b.classList.toggle('active', b.dataset.cols === mode));
                    if (currentSubject) renderStudentTable(currentSubject, currentClass, currentSortField);
                });
            });

            const sizeSel = document.getElementById('resultPageSize');
            if (sizeSel) {
                sizeSel.addEventListener('change', function () {
                    resultPageSize = Number(this.value) || 0;
                    resultPage = 1;
                    if (currentSubject) renderStudentTable(currentSubject, currentClass, currentSortField);
                });
            }

            const prev = document.getElementById('resultPrev');
            const next = document.getElementById('resultNext');
            if (prev) {
                prev.addEventListener('click', function () {
                    if (resultPage > 1) {
                        resultPage--;
                        if (currentSubject) renderStudentTable(currentSubject, currentClass, currentSortField);
                    }
                });
            }
            if (next) {
                next.addEventListener('click', function () {
                    resultPage++;
                    if (currentSubject) renderStudentTable(currentSubject, currentClass, currentSortField);
                });
            }
        }

        // ---- 查找（姓名 / 学号，支持部分匹配） ----
        function matchQuery(rows) {
            const q = String(resultQuery || "").trim().toLowerCase();
            if (!q) return rows;
            return rows.filter(row => {
                const name = String(row.name || "").toLowerCase();
                const id = String(row.id || "").toLowerCase();
                return name.indexOf(q) >= 0 || id.indexOf(q) >= 0;
            });
        }

        // ---- 分页控件 ----
        function renderPager(totalPages, total) {
            const pager = document.getElementById('resultPager');
            const info = document.getElementById('resultPageInfo');
            const prev = document.getElementById('resultPrev');
            const next = document.getElementById('resultNext');
            if (!pager || !info || !prev || !next) return;
            if (totalPages <= 1 || !total) {
                pager.hidden = true;
                return;
            }
            pager.hidden = false;
            info.textContent = resultPage + " / " + totalPages;
            prev.disabled = resultPage <= 1;
            next.disabled = resultPage >= totalPages;
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
            const sorted = sortStudentRows(matchQuery(filtered), sortField);

            // 分页（简洁列默认 50 条一页，可切换 100 / 200 / 全部）
            const pageSize = resultPageSize > 0 ? resultPageSize : sorted.length || 1;
            const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
            if (resultPage > totalPages) resultPage = totalPages;
            if (resultPage < 1) resultPage = 1;
            const start = (resultPage - 1) * pageSize;
            const displayData = sorted.slice(start, start + pageSize);

            previewNote.textContent = sorted.length
                ? `（共${sorted.length}人${totalPages > 1 ? `，第 ${resultPage}/${totalPages} 页` : ""}）`
                : "（没有符合条件的学生）";
            renderPager(totalPages, sorted.length);

            // 构建表头：简洁列只保留日常关注的字段，详细列给出全部统计量
            const allHeaders = [
                { key: 'id', label: '学号', cls: 'col-id' },
                { key: 'name', label: '姓名', cls: 'col-name' },
                { key: 'class', label: '班级号', cls: 'col-class' },
                { key: 'raw1', label: '前测原始分', cls: 'col-raw' },
                { key: 'rank1', label: '前测名次', cls: 'col-rank' },
                { key: 'percentile1', label: '前测百分等级', cls: 'col-percentile' },
                { key: 'std1', label: '前测标准分', cls: 'col-std' },
                { key: 'layer1', label: '前测分层名次', cls: 'col-layer' },
                { key: 'raw2', label: '后测原始分', cls: 'col-raw' },
                { key: 'rank2', label: '后测名次', cls: 'col-rank' },
                { key: 'percentile2', label: '后测百分等级', cls: 'col-percentile' },
                { key: 'std2', label: '后测标准分', cls: 'col-std' },
                { key: 'layer2', label: '后测分层名次', cls: 'col-layer' },
                { key: 'predicted2', label: '预测成绩', cls: 'col-pred' },
                { key: 'residual', label: '进步分(残差)', cls: 'col-residual' },
                { key: 'residualStd', label: '残差标准差', cls: 'col-residstd' },
                { key: 'tValue', label: '个人T值', cls: 'col-tvalue' },
                { key: 'conclusion', label: '判定结论', cls: 'col-conclusion' }
            ];
            const SIMPLE_KEYS = ['id', 'name', 'class', 'raw1', 'raw2', 'predicted2', 'residual', 'tValue', 'conclusion'];
            const headers = resultCols === 'full' ? allHeaders : allHeaders.filter(h => SIMPLE_KEYS.indexOf(h.key) >= 0);

            let theadHtml = '<tr>';
            headers.forEach(h => {
                theadHtml += `<th class="${h.cls}">${h.label}</th>`;
            });
            theadHtml += '</tr>';
            resultHead.innerHTML = theadHtml;

            // 填充数据（T值按判定结论显示为彩色块，右侧给出结论文字）
            const tbody = resultBody;
            tbody.innerHTML = '';
            displayData.forEach(row => {
                const tr = document.createElement('tr');
                headers.forEach(h => {
                    const td = document.createElement('td');
                    const v = row[h.key];
                    if (h.key === 'tValue') {
                        td.innerHTML = `<span class="t-flag ${getTConclusion(v).cls}">${formatValue('tValue', v)}</span>`;
                    } else if (h.key === 'conclusion') {
                        const concl = getTConclusion(row.tValue);
                        td.innerHTML = `<span class="concl-text ${concl.cls}">${concl.text}</span>`;
                    } else {
                        td.textContent = formatValue(h.key, v);
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

            // 同步刷新建议名单（与当前学科 + 班级筛选保持一致）
            renderAdvicePanel(subject, filterClass);
        }

        // ---- 渲染建议名单（表扬 / 单独分析） ----
        function renderAdvicePanel(subject, filterClass) {
            const data = subjectResults[subject];
            if (!data || data.length === 0) {
                advicePanel.style.display = 'none';
                return;
            }
            const subset = (filterClass === 'all') ? data : data.filter(row => row.class === filterClass);

            // 超2标天然属于超1标；退2标天然属于退1标 —— 名单去重，互不重复
            const overTwo = [], overOne = [], belowTwo = [], belowOne = [];
            subset.forEach(row => {
                if (row.overTwo === 1) overTwo.push(row);
                else if (row.overOne === 1) overOne.push(row);

                if (row.belowTwo === 1) belowTwo.push(row);
                else if (row.belowOne === 1) belowOne.push(row);
            });

            // 表扬名单按个人T值从高到低；需分析名单按个人T值从低到高
            overTwo.sort((a, b) => b.tValue - a.tValue);
            overOne.sort((a, b) => b.tValue - a.tValue);
            belowTwo.sort((a, b) => a.tValue - b.tValue);
            belowOne.sort((a, b) => a.tValue - b.tValue);

            const classLabel = (filterClass === 'all')
                ? '全级'
                : (String(filterClass).includes('班') ? String(filterClass) : filterClass + '班');
            adviceScope.textContent = `学科：${subject} ｜ 范围：${classLabel} ｜ 共 ${subset.length} 人`;

            const fill = (el, arr) => {
                if (arr.length === 0) {
                    el.innerHTML = '<span class="none">暂无</span>';
                    return;
                }
                el.textContent = arr.map(r => r.name || r.id).join('、');
                el.textContent += `（${arr.length}人）`;
            };
            fill(adviceOverTwo, overTwo);
            fill(adviceOverOne, overOne);
            fill(adviceBelowTwo, belowTwo);
            fill(adviceBelowOne, belowOne);

            advicePanel.style.display = 'block';
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
                const classConcl = getTConclusion(row.classT);
                const cells = [
                    { text: String(row.class), cls: '' },
                    { text: String(row.count), cls: '' },
                    { text: row.meanStd1.toFixed(2), cls: '' },
                    { text: row.meanStd2.toFixed(2), cls: '' },
                    { text: row.meanResidual.toFixed(2), cls: '' },
                    { text: String(row.overTwo), cls: row.overTwo > 0 ? 'cell-green' : 'cell-muted', flag: 'overTwo', count: row.overTwo },
                    { text: String(row.overOne), cls: row.overOne > 0 ? 'cell-green' : 'cell-muted', flag: 'overOne', count: row.overOne },
                    { text: String(row.belowOne), cls: row.belowOne > 0 ? 'cell-red' : 'cell-muted', flag: 'belowOne', count: row.belowOne },
                    { text: String(row.belowTwo), cls: row.belowTwo > 0 ? 'cell-red' : 'cell-muted', flag: 'belowTwo', count: row.belowTwo },
                    { text: row.classT.toFixed(3), badge: classConcl.cls },
                    { text: classConcl.text, textCls: classConcl.cls, cls: 'col-conclusion' }
                ];
                cells.forEach(c => {
                    const td = document.createElement('td');
                    if (c.badge) {
                        td.innerHTML = `<span class="t-flag ${c.badge}">${c.text}</span>`;
                    } else if (c.textCls) {
                        td.innerHTML = `<span class="concl-text ${c.textCls}">${c.text}</span>`;
                    } else {
                        td.textContent = c.text;
                    }
                    if (c.cls) td.className = c.cls;
                    if (c.flag && c.count > 0) {
                        td.classList.add('cell-clickable');
                        td.title = '点击查看学生名单';
                        td.addEventListener('click', function() {
                            showStatDetail(subject, row.class, c.flag);
                        });
                    }
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            // 强调当前排序方式
            sortClassBtn.classList.toggle('active', sortType === 'class');
            sortTValueBtn.classList.toggle('active', sortType === 'tvalue');
            currentSortType = sortType;
        }

        // ---- 四种超/退标的定义（与班级统计人数口径一致） ----
        const FLAG_INFO = {
            overTwo:  { label: '超两标', match: r => r.overTwo === 1,  dir: 'desc' },
            overOne:  { label: '超一标', match: r => r.overOne === 1,  dir: 'desc' },
            belowOne: { label: '退一标', match: r => r.belowOne === 1, dir: 'asc' },
            belowTwo: { label: '退两标', match: r => r.belowTwo === 1, dir: 'asc' }
        };

        // ---- 弹出某班某标的学生名单（学科 + 班级匹配） ----
        function showStatDetail(subject, className, flag) {
            const data = subjectResults[subject];
            const info = FLAG_INFO[flag];
            if (!data || !info) return;

            const list = data.filter(r => r.class === className && info.match(r));
            // 表扬类按T值由高到低，需分析类按T值由低到高
            list.sort((a, b) => info.dir === 'desc' ? b.tValue - a.tValue : a.tValue - b.tValue);

            const classLabel = String(className).includes('班') ? String(className) : className + '班';
            statDetailTitle.textContent = `${info.label}学生名单`;
            statDetailScope.textContent = `学科：${subject} ｜ 班级：${classLabel} ｜ 共 ${list.length} 人`;

            statDetailBody.innerHTML = '';
            if (list.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = 3;
                td.textContent = '暂无学生';
                td.style.textAlign = 'center';
                td.style.color = '#8a97a6';
                tr.appendChild(td);
                statDetailBody.appendChild(tr);
            } else {
                list.forEach(r => {
                    const tr = document.createElement('tr');
                    const values = [r.id, r.name || '', r.tValue.toFixed(3)];
                    values.forEach(v => {
                        const td = document.createElement('td');
                        td.textContent = v;
                        tr.appendChild(td);
                    });
                    statDetailBody.appendChild(tr);
                });
            }
            statDetailModal.style.display = 'flex';
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
                title: `【${subject}】前测标准分均值 vs 后测标准分均值`,
                xaxis: { title: '前测标准分均值' },
                yaxis: { title: '后测标准分均值' },
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
                    Plotly.downloadImage(scatterPlot, { format: 'png', filename: `回归散点图_${subject}_${valueExamTag()}` });
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
            if (view === 'regression') {
                // 强调：回归分析针对全级学生，不针对各班
                if (regressionNote) {
                    regressionNote.classList.remove('flash');
                    void regressionNote.offsetWidth;
                    regressionNote.classList.add('flash');
                }
                if (currentSubject && subjectResults[currentSubject]) {
                    drawRegressionForSubject(currentSubject);
                }
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
            /* 保留已选班级：新学科里仍存在该班就继续筛选，否则回到全级 */
            const classes = [...new Set(subjectResults[subject].map(r => r.class).filter(c => c))];
            const keepClass = currentClass !== 'all' && classes.includes(currentClass) ? currentClass : 'all';
            currentClass = keepClass;
            buildClassButtons(classes, keepClass);
            classButtons._initialized = true;

            renderStudentTable(subject, currentClass, currentSortField);
            renderClassStats(subject, currentSortType);
            drawRegressionForSubject(subject);
        }

        // ---- 主处理 ----
        async function processData() {
            if (!file1Data || !file2Data) {
                alert('请先选择前测和后测考试！');
                return;
            }

            let layer = parseInt(layerInput.value);
            if (isNaN(layer) || layer < 2) {
                alert('请输入有效的层数（正整数 ≥ 2）');
                return;
            }

            log('🔍 开始处理，层数 = ' + layer, '');

            const noticeEl = document.getElementById('valueNotice');
            if (noticeEl) {
                noticeEl.style.display = 'none';
                noticeEl.innerHTML = '';
            }

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
                log('❌ 前测成绩表缺少"学号"或"总分"列', 'err');
                alert('前测成绩表缺少"学号"或"总分"列，请检查表头。');
                return;
            }
            if (!idKey2 || !scoreKey2) {
                log('❌ 后测成绩表缺少"学号"或"总分"列', 'err');
                alert('后测成绩表缺少"学号"或"总分"列，请检查表头。');
                return;
            }

            // ---- 分别识别两次考试的学科，再取「两次都有的学科」 ----
            // 两次考试科目不一定一致（如初二上期中新增物理、初一下期末没有物理），
            // 绝不能按列的位置硬对齐，必须按学科名称逐科匹配。
            const cols1 = detectSubjectColumns(file1Data, [idKey1, nameKey1, classKey1, scoreKey1]);
            const cols2 = detectSubjectColumns(file2Data, [idKey2, nameKey2, classKey2, scoreKey2]);

            // canonical -> { name, keys: [] }（同名/别名列合并，逐行取第一个有效分数）
            const grouped1 = groupSubjectColumns(cols1);
            const grouped2 = groupSubjectColumns(cols2);

            const commonSubjects = [];   // 两次考试都有的学科
            const onlyPre = [];          // 仅前测有的学科
            const onlyPost = [];         // 仅后测有的学科
            grouped1.forEach((info, canonical) => {
                if (grouped2.has(canonical)) {
                    commonSubjects.push({
                        canonical: canonical,
                        label: info.name,
                        keys1: info.keys,
                        keys2: grouped2.get(canonical).keys
                    });
                } else {
                    onlyPre.push(info.name);
                }
            });
            grouped2.forEach((info, canonical) => {
                if (!grouped1.has(canonical)) onlyPost.push(info.name);
            });

            // 最终学科列表：'总分' + 两次都有的学科（按前测表头顺序）
            const subjectList = ['总分', ...commonSubjects.map(s => s.label)];
            allSubjects = subjectList;

            // 显示名（学科按钮/表格标题）-> 规范化学科名（取分用）
            const labelToCanonical = new Map();
            commonSubjects.forEach(s => labelToCanonical.set(s.label, s.canonical));

            log('📚 两次都有的学科（参与增值分析）：' + subjectList.join(', '), '');
            if (onlyPre.length || onlyPost.length) {
                log('⚠️ 未纳入分析 —— 仅前测有：' + (onlyPre.join('、') || '无') + '；仅后测有：' + (onlyPost.join('、') || '无'), '');
            }

            // 提取数据（把每一科的分数存成规范化学科名 -> 数值/ null，缺失绝不填 0）
            function buildSideMap(rows, idKey, nameKey, classKey, scoreKey, grouped) {
                const out = new Map();
                (rows || []).forEach(row => {
                    const rawId = row[idKey];
                    const id = rawId === null || rawId === undefined ? '' : String(rawId).trim();
                    if (!id || id === 'undefined' || id === 'null') return;
                    const name = nameKey ? String(row[nameKey] === null || row[nameKey] === undefined ? '' : row[nameKey]).trim() : '';
                    const cls = classKey ? String(row[classKey] === null || row[classKey] === undefined ? '' : row[classKey]).trim() : '';
                    const scores = {};
                    grouped.forEach((info, canonical) => {
                        scores[canonical] = firstScore(row, info.keys);
                    });
                    scores['总分'] = toScore(row[scoreKey]);
                    out.set(id, { name: name, class: cls, scores: scores });
                });
                return out;
            }

            const map1 = buildSideMap(file1Data, idKey1, nameKey1, classKey1, scoreKey1, grouped1);
            const map2 = buildSideMap(file2Data, idKey2, nameKey2, classKey2, scoreKey2, grouped2);

            // 对齐（按学号）：只取两次都参加考试的学生
            const common = [];
            for (let [id, v1] of map1) {
                const v2 = map2.get(id);
                if (!v2) continue;
                common.push({
                    id: id,
                    name: v1.name || v2.name || '',
                    class: v1.class || v2.class || '',
                    scores1: v1.scores,
                    scores2: v2.scores
                });
            }
            if (common.length === 0) {
                log('❌ 两次成绩无交集学号，请检查数据', 'err');
                alert('两次成绩表没有共同的学号，无法匹配！');
                return;
            }

            // 两次都参加考试、且至少有一门共同学科两次成绩齐全的学生，才算真正可做增值分析
            const hasPairScore = (r) => subjectList.some(sub => {
                const canonical = sub === '总分' ? '总分' : labelToCanonical.get(sub);
                return canonical && r.scores1[canonical] !== null && r.scores1[canonical] !== undefined &&
                    r.scores2[canonical] !== null && r.scores2[canonical] !== undefined;
            });
            const pairable = common.filter(hasPairScore);
            if (pairable.length === 0) {
                log('❌ 无学生同时具备两次考试的共同学科成绩', 'err');
                alert('两次考试没有任何一门共同学科的学生成绩可以配对，无法进行增值分析。\n' +
                    '请确认两次考试是否上传正确，或学科名称是否一致。');
                return;
            }

            log('匹配到 ' + common.length + ' 名共同学生，其中 ' + pairable.length + ' 人有可比成绩', 'ok');
            matchCount.textContent = pairable.length;

            // ---- 缺失数据检测与用户确认（不改变匹配逻辑，仅统计未匹配学号）----
            const missingStudents = [];
            for (let [id, v] of map1) {
                if (!map2.has(id)) missingStudents.push({ id: id, name: v.name || '未知', note: '缺少后测成绩' });
            }
            for (let [id, v] of map2) {
                if (!map1.has(id)) missingStudents.push({ id: id, name: v.name || '未知', note: '缺少前测成绩' });
            }
            if (missingStudents.length > 0) {
                log(`⚠️ 检测到 ${missingStudents.length} 名学生存在考试数据缺失，有效人数 ${pairable.length} 人`, '');
                const proceed = await confirmMissingData(pairable.length, missingStudents);
                if (!proceed) {
                    log('⏹️ 用户取消分析，未生成结果', '');
                    return;
                }
            }

            // ---- 分析每个学科（只分析两次都有成绩的学科；学生该科两次成绩齐全才纳入该科）----
            subjectResults = {};
            classStatsCache = {};

            const partialSubjects = [];   // 该科有学生缺考被排除
            const skippedSubjects = [];   // 该科参与人数不足，未能分析

            allSubjects.forEach(sub => {
                const canonical = sub === '总分' ? '总分' : labelToCanonical.get(sub);
                if (!canonical) return;

                let excluded = 0;
                const subjectData = [];
                common.forEach(r => {
                    const s1 = r.scores1[canonical];
                    const s2 = r.scores2[canonical];
                    if (s1 === null || s1 === undefined || s2 === null || s2 === undefined) {
                        excluded++;
                        return;
                    }
                    subjectData.push({
                        id: r.id,
                        name: r.name,
                        class: r.class,
                        score1: s1,
                        score2: s2
                    });
                });

                if (subjectData.length < 2) {
                    skippedSubjects.push({ label: sub, reason: '两次都有该科成绩的学生不足 2 人', count: subjectData.length });
                    log(`⚠️ ${sub}：两次都有该科成绩的学生只有 ${subjectData.length} 人，不足 2 人，跳过`, 'err');
                    return;
                }
                if (excluded > 0) partialSubjects.push({ label: sub, excluded: excluded });

                log(`🔍 正在分析学科：${sub}`, '');
                const result = analyzeSubject(sub, subjectData, layer);
                if (result && result.data.length) {
                    subjectResults[sub] = result.data;
                    const stats = computeClassStatsForSubject(result.data);
                    classStatsCache[sub] = stats;
                    log(`${sub} 分析完成，有效人数 ${result.data.length}` +
                        (excluded > 0 ? `（${excluded} 人该科成绩不全已排除）` : ''), 'ok');
                } else {
                    skippedSubjects.push({ label: sub, reason: '有效数据不足，分析失败', count: 0 });
                    log(`⚠️ ${sub} 分析失败，跳过`, 'err');
                }
            });

            // ---- 学科对齐情况提示（两次考试科目不一致时必须让用户看见）----
            renderValueNotice({
                commonSubjects: commonSubjects,
                onlyPre: onlyPre,
                onlyPost: onlyPost,
                partialSubjects: partialSubjects,
                skippedSubjects: skippedSubjects,
                matchedCount: common.length,
                pairableCount: pairable.length
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
                resultQuery = '';
                resultPage = 1;
                const searchReset = document.getElementById('resultSearch');
                if (searchReset) searchReset.value = '';
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
                const exportResultBtn = document.getElementById('exportResultImage');
                if (exportResultBtn) exportResultBtn.onclick = exportResultImage;
                const exportAdviceBtn = document.getElementById('exportAdviceImage');
                if (exportAdviceBtn) exportAdviceBtn.onclick = exportAdviceImage;
                const exportClassStatsImgBtn = document.getElementById('exportClassStatsImage');
                if (exportClassStatsImgBtn) exportClassStatsImgBtn.onclick = exportClassStatsImage;
                log('🎉 所有学科分析完成！', 'ok');
            } else {
                const reasons = [];
                if (onlyPre.length) reasons.push('仅前测有：' + onlyPre.join('、'));
                if (onlyPost.length) reasons.push('仅后测有：' + onlyPost.join('、'));
                skippedSubjects.forEach(s => reasons.push(s.label + '：' + s.reason));
                alert('没有成功分析任何学科，请检查数据。' +
                    (reasons.length ? '\n\n' + reasons.join('\n') : ''));
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


        /* =========================================================
           导出图片（不使用第三方库：DOM → 行内样式 HTML → SVG foreignObject → Canvas → PNG）
           ========================================================= */
        function valueDateStamp() {
            const d = new Date();
            const p = n => String(n).padStart(2, '0');
            return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
        }

        /* 文件名安全化：去掉扩展名与 Windows 非法字符，过长截断 */
        function valueFileSafe(s) {
            return String(s === null || s === undefined ? '' : s)
                .replace(/\.[A-Za-z0-9]{1,6}$/, '')
                .replace(/[\\/:*?"<>|]/g, '_')
                .replace(/[\s·]+/g, '_')
                .replace(/_{2,}/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 24);
        }
        /* 前后测数据来源标识，让导出文件名看得出是哪两次成绩 */
        function valueExamTag() {
            return (valueFileSafe(file1Name) || '前测') + '-vs-' + (valueFileSafe(file2Name) || '后测');
        }
        /* 导出表格首行说明：学校 + 内容口径 + 导出时间 */
        function valueExportInfoLine(parts) {
            const d = new Date();
            const p = n => String(n).padStart(2, '0');
            const t = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
                ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
            return '珠海市九洲中学 · ' + parts.filter(Boolean).join(' · ') + ' · 导出时间：' + t;
        }

        function valueEscapeHtml(v) {
            return String(v === null || v === undefined ? '' : v)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        /* 页面表格 → 行内样式表格 HTML（导出图片用，避免依赖外部 CSS） */
        function valueTableInlineHtml(table, options) {
            const opts = options || {};
            const headerStyle = 'background:#1b2454;color:#fff;font-weight:700;padding:7px 9px;border:1px solid #cbd5e1;text-align:center;font-size:12px;white-space:nowrap';
            const cellStyle = 'padding:6px 9px;border:1px solid #e2e8f0;text-align:center;font-size:12px;white-space:nowrap;color:#1f2937';
            const firstStyle = 'padding:6px 9px;border:1px solid #e2e8f0;text-align:' + (opts.centerFirst ? 'center' : 'left') +
                ';font-size:12px;white-space:nowrap;font-weight:700;background:#f8fafc;color:#1b2454';
            const clone = table.cloneNode(true);
            clone.querySelectorAll('thead th').forEach(th => th.setAttribute('style', headerStyle));
            clone.querySelectorAll('tbody tr').forEach(tr => {
                Array.from(tr.children).forEach((td, idx) => {
                    td.setAttribute('style', idx === 0 ? firstStyle : cellStyle);
                });
            });
            clone.querySelectorAll('.t-flag').forEach(el => {
                const cls = el.className || '';
                const color = cls.indexOf('good') >= 0 || cls.indexOf('over') >= 0 ? '#0f7b5f'
                    : cls.indexOf('bad') >= 0 || cls.indexOf('below') >= 0 ? '#c2410c' : '#1b2454';
                el.setAttribute('style', 'display:inline-block;padding:1px 8px;border-radius:6px;background:#eef1f8;color:' + color + ';font-weight:800;font-size:11.5px');
            });
            clone.setAttribute('style', "width:100%;border-collapse:collapse;font-family:'Microsoft YaHei','PingFang SC',Arial,sans-serif;background:#fff");
            return clone.outerHTML;
        }

        function valueLoadImage(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('图片渲染失败'));
                img.src = src;
            });
        }

        async function downloadHtmlAsPngValue(filename, title, subtitle, innerHtml, width) {
            const wrapper = document.createElement('div');
            wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
            wrapper.setAttribute('style', 'width:' + width + 'px;background:#ffffff;padding:22px 24px;' +
                "font-family:'Microsoft YaHei','PingFang SC',Arial,sans-serif;color:#0f172a;box-sizing:content-box;");
            wrapper.innerHTML = '<div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.3">' + valueEscapeHtml(title) + '</div>' +
                '<div style="margin-top:5px;font-size:12px;color:#64748b;line-height:1.5">' + valueEscapeHtml(subtitle) + '</div>' +
                '<div style="margin-top:14px">' + innerHtml + '</div>';
            wrapper.style.position = 'fixed';
            wrapper.style.left = '-10000px';
            wrapper.style.top = '0';
            document.body.appendChild(wrapper);
            const W = width + 48;
            const H = Math.ceil(wrapper.scrollHeight);
            wrapper.style.position = 'static';
            wrapper.style.left = '0';
            wrapper.style.top = '0';
            const xhtml = new XMLSerializer().serializeToString(wrapper);
            document.body.removeChild(wrapper);
            const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H +
                '"><foreignObject width="100%" height="100%">' + xhtml + '</foreignObject></svg>';
            const img = await valueLoadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = W * scale;
            canvas.height = H * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, W, H);
            ctx.drawImage(img, 0, 0, W, H);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('图片生成失败');
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 1500);
            log('📥 已导出图片：' + filename, 'ok');
        }

        /* 数据分析结果 → 图片 */
        function exportResultImage() {
            const sub = currentSubject;
            if (!sub || !subjectResults[sub]) {
                alert('没有数据可导出，请先分析。');
                return;
            }
            const table = document.getElementById('resultTable');
            if (!table || !table.rows.length) {
                alert('当前没有可导出的表格数据。');
                return;
            }
            const classLabel = currentClass === 'all' ? '全级' : currentClass;
            const sortLabelMap = { id: '按学号', rank2: '按后测名次', tValue: '按个人T值' };
            const sortLabel = sortLabelMap[currentSortField] || '默认排序';
            const rows = table.querySelectorAll('tbody tr').length;
            downloadHtmlAsPngValue('增值分析_' + sub + '_' + valueExamTag() + '_' + classLabel + '_' + sortLabel + '_' + valueDateStamp() + '.png',
                '增值评价 · 数据分析结果',
                '学科：' + sub + ' · 范围：' + classLabel + ' · 排序：' + sortLabel + ' · 共 ' + rows + ' 人' +
                (file1Name || file2Name ? ' · ' + (file1Name || '前测') + ' → ' + (file2Name || '后测') : ''),
                valueTableInlineHtml(table, { centerFirst: true }), 1500).catch(err => {
                    console.error(err);
                    alert('图片导出失败，请重试。');
                });
        }

        /* 建议名单 → 图片 */
        function exportAdviceImage() {
            if (!advicePanel || advicePanel.style.display === 'none') {
                alert('当前没有建议名单可导出。');
                return;
            }
            const scope = adviceScope.textContent.trim();
            const tagColor = {
                'tag-over2': 'background:#fef3c7;color:#b45309',
                'tag-over1': 'background:#dcfce7;color:#15803d',
                'tag-below2': 'background:#fee2e2;color:#b91c1c',
                'tag-below1': 'background:#ffedd5;color:#c2410c'
            };
            const blockTitleStyle = 'margin:14px 0 8px;font-size:14px;font-weight:800;color:#1b2454';
            let html = '';
            const blocks = advicePanel.querySelectorAll('.advice-block');
            blocks.forEach((block, bi) => {
                const titleEl = block.querySelector('.advice-title');
                const title = titleEl ? titleEl.textContent.trim() : (bi === 0 ? '建议大力表扬的同学名单' : '需要关注的同学名单');
                html += '<div style="' + blockTitleStyle + '">' + valueEscapeHtml(title) + '</div>';
                block.querySelectorAll('.advice-item').forEach(item => {
                    const tag = item.querySelector('.advice-tag');
                    const names = item.querySelector('.advice-names');
                    const tagCls = tag ? Array.from(tag.classList).find(c => tagColor[c]) : '';
                    const tagStyle = 'display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;flex:none;' +
                        (tagColor[tagCls] || 'background:#eef1f8;color:#475569');
                    html += '<div style="display:flex;align-items:flex-start;gap:10px;margin:6px 0;font-size:13px;line-height:1.9;' +
                        'color:#1f2937;background:#fbfdff;border:1px solid #eef2f8;border-radius:10px;padding:8px 12px">' +
                        '<span style="' + tagStyle + '">' + valueEscapeHtml(tag ? tag.textContent.trim() : '') + '</span>' +
                        '<span>' + valueEscapeHtml(names ? names.textContent.trim() : '—') + '</span></div>';
                });
            });
            downloadHtmlAsPngValue('增值评价建议名单_' + (currentSubject || '') + '_' + valueExamTag() + '_' + valueDateStamp() + '.png',
                '增值评价建议名单',
                scope + (file1Name || file2Name ? ' · ' + (file1Name || '前测') + ' → ' + (file2Name || '后测') : ''),
                html, 900).catch(err => {
                    console.error(err);
                    alert('图片导出失败，请重试。');
                });
        }

        /* 班级统计汇总 → 图片 */
        function exportClassStatsImage() {
            const sub = currentSubject;
            const table = document.getElementById('classStatsTable');
            if (!sub || !classStatsCache[sub] || !table || !table.rows.length) {
                alert('没有班级统计数据可导出，请先分析。');
                return;
            }
            const rows = table.querySelectorAll('tbody tr').length;
            downloadHtmlAsPngValue('班级统计_' + sub + '_' + valueExamTag() + '_' + valueDateStamp() + '.png',
                '班级统计汇总',
                '当前学科：' + sub + ' · 共 ' + rows + ' 个班级' +
                (file1Name || file2Name ? ' · ' + (file1Name || '前测') + ' → ' + (file2Name || '后测') : ''),
                valueTableInlineHtml(table, { centerFirst: true }), 1300).catch(err => {
                    console.error(err);
                    alert('图片导出失败，请重试。');
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
            data = matchQuery(data);
            data = sortStudentRows(data, currentSortField);
            const exportArr = data.map(r => ({
                '学号': r.id,
                '姓名': r.name || '',
                '班级号': r.class || '',
                '前测原始分': r.raw1,
                '前测名次': r.rank1,
                '前测百分等级': r.percentile1,
                '前测标准分': r.std1,
                '前测分层名次': r.layer1,
                '后测原始分': r.raw2,
                '后测名次': r.rank2,
                '后测百分等级': r.percentile2,
                '后测标准分': r.std2,
                '后测分层名次': r.layer2,
                '预测成绩': r.predicted2,
                '进步分（残差）': r.residual,
                '残差标准差': r.residualStd,
                '个人T值': r.tValue,
                '判定结论': getTConclusion(r.tValue).text
            }));
            const classLabel = currentClass === 'all' ? '全级' : currentClass;
            const sortLabelMap = { id: '按学号', rank2: '按后测名次', tValue: '按个人T值' };
            const sortLabel = sortLabelMap[currentSortField] || '默认排序';
            const ws = XLSX.utils.aoa_to_sheet([[valueExportInfoLine([
                '增值评价 · 数据分析结果', '学科：' + sub, '范围：' + classLabel, '排序：' + sortLabel,
                '前测：' + (file1Name || '未命名'), '后测：' + (file2Name || '未命名')
            ])]]);
            XLSX.utils.sheet_add_json(ws, exportArr, { origin: 'A3' });
            const colWidths = [];
            for (let key in exportArr[0]) {
                colWidths.push({ wch: Math.max(key.length * 1.2, 12) });
            }
            ws['!cols'] = colWidths;
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sub);
            const fileName = `增值分析_${sub}_${valueExamTag()}_${classLabel}_${sortLabel}_${valueDateStamp()}.xlsx`;
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
                '前测标准分均值': r.meanStd1,
                '后测标准分均值': r.meanStd2,
                '残差均值': r.meanResidual,
                '超两标人数': r.overTwo,
                '超一标人数': r.overOne,
                '退一标人数': r.belowOne,
                '退两标人数': r.belowTwo,
                '班级T值': r.classT,
                '判定结论': getTConclusion(r.classT).text
            }));
            const ws = XLSX.utils.aoa_to_sheet([[valueExportInfoLine([
                '增值评价 · 班级统计汇总', '当前学科：' + sub,
                '前测：' + (file1Name || '未命名'), '后测：' + (file2Name || '未命名')
            ])]]);
            XLSX.utils.sheet_add_json(ws, exportArr, { origin: 'A3' });
            ws['!cols'] = [
                { wch: 14 }, { wch: 8 }, { wch: 18 }, { wch: 18 },
                { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
                { wch: 12 }, { wch: 14 }, { wch: 14 }
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '班级统计');
            const fileName = `班级统计_${sub}_${valueExamTag()}_${valueDateStamp()}.xlsx`;
            XLSX.writeFile(wb, fileName);
            log(`📥 下载成功：${fileName}`, 'ok');
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
            layerInput.dataset.userChanged = 'false';
            layerInput.value = 5;
            suggestLayer.textContent = '5';
            updateFileStatus();
            resultArea.style.display = 'none';
            resultBody.innerHTML = ''; resultHead.innerHTML = '';
            classStatsArea.style.display = 'none';
            classStatsBody.innerHTML = '';
            statDetailModal.style.display = 'none';
            statDetailBody.innerHTML = '';
            matchCount.textContent = '-';
            stateLabel.innerHTML = '数据待分析';
            stateLabel.style.color = '#6c757d';
            regressionArea.style.display = 'none';
            Plotly.purge(scatterPlot);
            advicePanel.style.display = 'none';
            adviceOverTwo.textContent = '';
            adviceOverOne.textContent = '';
            adviceBelowTwo.textContent = '';
            adviceBelowOne.textContent = '';
            adviceScope.textContent = '';
            subjectButtons.innerHTML = '';
            classButtons.innerHTML = '';
            previewNote.textContent = '';
            subjectRow.style.display = 'none';
            const noticeReset = document.getElementById('valueNotice');
            if (noticeReset) {
                noticeReset.style.display = 'none';
                noticeReset.innerHTML = '';
            }
            viewCards.style.display = 'none';
            viewCards.querySelectorAll('.view-card').forEach(c => c.classList.toggle('active', c.dataset.view === 'result'));
            currentView = 'result';
        }

        // ---- 绑定事件 ----
        processBtn.addEventListener('click', processData);
        if (resetBtn) resetBtn.addEventListener('click', resetAll);
        statDetailCloseBtn.addEventListener('click', function() {
            statDetailModal.style.display = 'none';
        });
        statDetailModal.addEventListener('click', function(e) {
            if (e.target === statDetailModal) statDetailModal.style.display = 'none';
        });
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

        // ---- 云端选择考试（年级 → 考试） ----
        async function loadSideFromCloud(side) {
            if (!window.JZUI || !window.JZStore) {
                alert('云端模块未加载，请刷新页面后重试。');
                return;
            }
            try {
                const picked = await window.JZUI.pickExam({
                    title: side === 1 ? '选择前测考试成绩' : '选择后测考试成绩'
                });
                if (!picked) return;
                window.JZUI.rememberGrade(picked.grade.id);
                window.JZUI.busy(true, '正在读取「' + picked.exam.name + '」的成绩…');
                const rows = await window.JZStore.getExamRows(picked.exam.id);
                const objects = window.JZStore.toObjects(rows.header, rows.rows);
                if (!objects.length) throw new Error('该考试没有成绩数据');
                const label = picked.grade.name + ' · ' + picked.exam.name;
                applySideData(side, objects, label);
                window.JZUI.rememberExam(side === 1 ? 'value-pre' : 'value-post', picked.exam, picked.grade);
                log('☁️ 已从云端载入第' + (side === 1 ? '一' : '二') + '次成绩：' + label + '（' + objects.length + ' 行）', 'ok');
            } catch (err) {
                log('❌ ' + (err && err.message ? err.message : err), 'err');
                alert('读取云端考试失败：' + (err && err.message ? err.message : err));
            } finally {
                window.JZUI.busy(false);
            }
        }

        document.querySelectorAll('[data-cloud-side]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                loadSideFromCloud(Number(btn.getAttribute('data-cloud-side')));
            });
        });

        async function restoreSideFromCloud(side) {
            if (!window.JZUI || !window.JZStore) return false;
            try { if (window.JZCloud && window.JZCloud.ready) await window.JZCloud.ready(); } catch (e) { /* ignore */ }
            if (!window.JZStore.isReady || !window.JZStore.isReady()) return false;
            const mem = window.JZUI.getRememberedExam(side === 1 ? 'value-pre' : 'value-post', true);
            if (!mem || !mem.examId) return false;
            try {
                const exam = await window.JZStore.getExam(mem.examId);
                if (!exam) return false;
                const rows = await window.JZStore.getExamRows(exam.id);
                const objects = window.JZStore.toObjects(rows.header, rows.rows);
                if (!objects.length) return false;
                const label = (mem.gradeName ? mem.gradeName + ' · ' : '') + exam.name;
                applySideData(side, objects, label);
                return true;
            } catch (e) {
                return false;
            }
        }

        // ---- 初始化 ----
        updateFileStatus();
        window.addEventListener('load', function () {
            (async function restoreSides() {
                await restoreSideFromCloud(1);
                await restoreSideFromCloud(2);
            })();
        });
    })();
