
        (function() {
            const state = {
                teacherName: '',
                className: '',
                students: [],
                groupCount: 4,
                columnsPerGroup: [1, 3, 3, 1],
                totalColumns: 8,
                rowsPerColumn: [],
                totalSeats: 0,
                wingEnabled: false,
                wingLeftStudentId: null,
                wingRightStudentId: null,
                seatingPlan: null,
                originalSeatingPlan: null,
                selectedSeatEl: null,
                currentStep: 1
            };

            const $ = (s) => document.querySelector(s);
            const $$ = (s) => document.querySelectorAll(s);

            const panels = {
                1: $('#panelStep1'),
                2: $('#panelStep2'),
                3: $('#panelStep3'),
                4: $('#panelStep4')
            };
            const welcomeBanner = $('#welcomeBanner');
            const displayTeacherName = $('#displayTeacherName');
            const teacherNameInput = $('#teacherNameInput');
            const classNameInput = $('#classNameInput');
            const uploadZone = $('#uploadZone');
            const fileInput = $('#fileInput');
            const uploadedFileName = $('#uploadedFileName');
            const studentPreview = $('#studentPreview');
            const studentTableBody = $('#studentTableBody');
            const studentCountInfo = $('#studentCountInfo');
            const btnClearStudents = $('#btnClearStudents');
            const groupCountSelect = $('#groupCountSelect');
            const columnsPerGroupInput = $('#columnsPerGroupInput');
            const wingSeatToggle = $('#wingSeatToggle');
            const wingSeatSelectors = $('#wingSeatSelectors');
            const wingLeftSelect = $('#wingLeftSelect');
            const wingRightSelect = $('#wingRightSelect');
            const layoutSummary = $('#layoutSummary');
            const btnGenerate = $('#btnGenerate');
            const classroomInner = $('#classroomInner');
            const seatTableTitle = $('#seatTableTitle');
            const legendArea = $('#legendArea');
            const loadingOverlay = $('#loadingOverlay');
            const toastContainer = $('#toastContainer');
            const modalOverlay = $('#modalOverlay');
            const modalTitle = $('#modalTitle');
            const modalText = $('#modalText');
            const modalOk = $('#modalOk');
            const modalCancel = $('#modalCancel');

            function showToast(msg, type = 'info') {
                const t = document.createElement('div');
                t.className = `toast ${type}`;
                t.textContent = msg;
                toastContainer.appendChild(t);
                setTimeout(() => { t.style.opacity = '0';
                    t.style.transition = '0.3s';
                    setTimeout(() => t.remove(), 300); }, 2500);
            }

            function escapeHtml(str) {
                return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
            }

            // 上传成功对勾图标（绿色）
            const FILE_OK_SVG = '<svg class="file-ok-icon" width="18" height="18" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M12.8 512c0 275.2512 223.9488 499.2 499.2 499.2s499.2-223.9488 499.2-499.2a502.1184 502.1184 0 0 0-282.88-449.9968 38.4 38.4 0 1 0-33.28 69.2224A424.96 424.96 0 0 1 934.4 512c0 232.9088-189.4912 422.4-422.4 422.4S89.6 744.9088 89.6 512 279.0912 89.6 512 89.6a38.4 38.4 0 0 0 0-76.8C236.7488 12.8 12.8 236.7488 12.8 512z" fill="#68ce06"></path><path d="M285.7472 466.7392a38.4 38.4 0 1 0-54.3232 54.3232l180.992 180.992a38.2976 38.2976 0 0 0 54.272 0l325.8368-325.7856a38.4 38.4 0 1 0-54.3232-54.3232l-298.7008 298.6496-153.7536-153.856z" fill="#68ce06"></path></svg>';

            // 内部确认弹窗（替代原生 confirm）
            function showConfirm({ title, text, okText = '确定', cancelText = '取消', danger = false }) {
                return new Promise(resolve => {
                    modalTitle.textContent = title;
                    modalText.textContent = text;
                    modalOk.textContent = okText;
                    modalCancel.textContent = cancelText;
                    modalOk.className = danger ? 'btn btn-danger' : 'btn btn-primary';
                    modalOverlay.classList.add('show');
                    modalOverlay.hidden = false;
                    const done = (val) => {
                        modalOverlay.classList.remove('show');
                        modalOverlay.hidden = true;
                        modalOk.removeEventListener('click', onOk);
                        modalCancel.removeEventListener('click', onCancel);
                        modalOverlay.removeEventListener('click', onOverlay);
                        resolve(val);
                    };
                    const onOk = () => done(true);
                    const onCancel = () => done(false);
                    const onOverlay = (e) => { if (e.target === modalOverlay) onCancel(); };
                    modalOk.addEventListener('click', onOk);
                    modalCancel.addEventListener('click', onCancel);
                    modalOverlay.addEventListener('click', onOverlay);
                });
            }

            function showLoading() { loadingOverlay.classList.add('show'); }

            function hideLoading() { loadingOverlay.classList.remove('show'); }

            function saveLocal(key, val) { try { localStorage.setItem('seat_sys_' + key, JSON.stringify(val)); } catch (e) {} }

            function loadLocal(key) { try { const v = localStorage.getItem('seat_sys_' + key); return v ? JSON.parse(v) :
                    null; } catch (e) { return null; } }

            function clearLocal() { Object.keys(localStorage).filter(k => k.startsWith('seat_sys_')).forEach(k => localStorage
                    .removeItem(k)); }

            function switchStep(step) {
                state.currentStep = step;
                Object.values(panels).forEach(p => p.classList.add('hidden'));
                if (panels[step]) panels[step].classList.remove('hidden');
                $$('.step-dot').forEach(dot => {
                    const s = +dot.dataset.step;
                    dot.classList.remove('active', 'done');
                    if (s === step) dot.classList.add('active');
                    else if (s < step) dot.classList.add('done');
                });
                if (step === 3) { populateWingSelects();
                    updateLayoutSummary(); }
                if (step === 4 && state.seatingPlan) renderSeatingChart();
            }
            document.getElementById('stepsIndicator').addEventListener('click', e => {
                const dot = e.target.closest('.step-dot');
                if (!dot) return;
                const target = +dot.dataset.step;
                if (target === 4 && !state.seatingPlan) return showToast('请先生成座位表', 'error');
                switchStep(target);
            });

            function updateWelcome() {
                if (state.teacherName) {
                    welcomeBanner.style.display = 'block';
                    displayTeacherName.textContent = state.teacherName;
                } else welcomeBanner.style.display = 'none';
            }
            teacherNameInput.addEventListener('input', () => { state.teacherName = teacherNameInput.value.trim();
                updateWelcome(); });
            classNameInput.addEventListener('input', () => { state.className = classNameInput.value.trim(); });

            $('#btnSaveSettings').addEventListener('click', () => {
                state.teacherName = teacherNameInput.value.trim();
                state.className = classNameInput.value.trim();
                saveLocal('settings', { teacherName: state.teacherName, className: state.className });
                updateWelcome();
                showToast('设置已保存', 'success');
                setTimeout(() => switchStep(2), 400);
            });
            $('#btnClearSettings').addEventListener('click', async () => {
                const ok = await showConfirm({ title: '清除本地数据', text: '将清除所有已保存的班级、学生和座位表数据，是否继续？', okText: '清除', danger: true });
                if (!ok) return;
                clearLocal();
                Object.assign(state, { teacherName: '', className: '', students: [], seatingPlan: null,
                    originalSeatingPlan: null });
                teacherNameInput.value = '';
                classNameInput.value = '';
                updateWelcome();
                clearStudentsUI();
                resetSeatingUI();
                showToast('已清除');
            });

            function clearStudentsUI() {
                state.students = [];
                studentPreview.style.display = 'none';
                studentTableBody.innerHTML = '';
                studentCountInfo.textContent = '';
                btnClearStudents.style.display = 'none';
                uploadedFileName.textContent = '';
                fileInput.value = '';
            }

            function renderStudentPreview() {
                if (!state.students.length) { clearStudentsUI(); return; }
                studentPreview.style.display = 'block';
                studentTableBody.innerHTML = state.students.map(s => `
                    <tr>
                        <td>${s.id}</td><td><strong>${s.name}</strong></td>
                        <td><span class="badge ${s.gender==='男'?'badge-male':'badge-female'}">${s.gender}</span></td>
                        <td>${s.rank}</td><td>${s.activity}</td><td>${s.height}</td>
                    </tr>`).join('');
                studentCountInfo.textContent = `共 ${state.students.length} 名学生`;
                btnClearStudents.style.display = 'inline-flex';
            }

            function populateWingSelects() {
                if (!state.students.length) return;
                const opts = state.students.map(s => `<option value="${s.id}">${s.id} ${s.name}</option>`).join('');
                wingLeftSelect.innerHTML = '<option value="">-- 选择 --</option>' + opts;
                wingRightSelect.innerHTML = '<option value="">-- 选择 --</option>' + opts;
                if (state.wingLeftStudentId) wingLeftSelect.value = state.wingLeftStudentId;
                if (state.wingRightStudentId) wingRightSelect.value = state.wingRightStudentId;
            }

            uploadZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', e => { if (e.target.files[0]) processFile(e.target.files[0]); });
            uploadZone.addEventListener('dragover', e => { e.preventDefault();
                uploadZone.classList.add('drag-over'); });
            uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
            uploadZone.addEventListener('drop', e => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
                if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
            });

            function processFile(file) {
                if (!file.name.match(/\.(xls|xlsx)$/i)) return showToast('请上传Excel文件', 'error');
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                        const sheet = wb.Sheets[wb.SheetNames[0]];
                        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                        if (rows.length < 2) return showToast('文件内容为空', 'error');
                        const students = [];
                        for (let i = 1; i < rows.length; i++) {
                            const r = rows[i];
                            if (!r || !r[0]) continue;
                            const s = {
                                id: String(r[0] || '').trim(),
                                name: String(r[1] || '').trim(),
                                gender: String(r[2] || '').trim(),
                                rank: Math.max(1, Math.min(900, parseInt(r[3]) || 500)),
                                activity: Math.max(1, Math.min(5, parseInt(r[4]) || 3)),
                                height: Math.max(1, Math.min(5, parseInt(r[5]) || 3))
                            };
                            if (!s.id || !s.name) continue;
                            if (/^(男|M|m|male)$/i.test(s.gender)) s.gender = '男';
                            else if (/^(女|F|f|female)$/i.test(s.gender)) s.gender = '女';
                            students.push(s);
                        }
                        if (!students.length) return showToast('未找到有效学生', 'error');
                        state.students = students;
                        saveLocal('students', students);
                        renderStudentPreview();
                        uploadedFileName.innerHTML = FILE_OK_SVG + '<span class="file-name">' + escapeHtml(file.name) + '</span>';
                        btnClearStudents.style.display = 'inline-flex';
                        populateWingSelects();
                        showToast(`已加载 ${students.length} 名学生`, 'success');
                        setTimeout(() => switchStep(3), 500);
                    } catch (err) { showToast('解析失败：' + err.message, 'error'); }
                };
                reader.readAsArrayBuffer(file);
            }
            btnClearStudents.addEventListener('click', async () => {
                const ok = await showConfirm({ title: '清除学生数据', text: '确定清除已上传的学生数据吗？', okText: '清除', danger: true });
                if (!ok) return;
                clearStudentsUI();
                state.seatingPlan = null;
                state.originalSeatingPlan = null;
                saveLocal('students', []);
                resetSeatingUI();
                showToast('已清除学生');
            });

            function parseColumns() {
                const raw = columnsPerGroupInput.value.trim();
                return raw.split(/[,，\s]+/).map(p => parseInt(p)).filter(n => !isNaN(n) && n > 0);
            }

            function updateLayoutSummary() {
                const cols = parseColumns();
                const gc = +groupCountSelect.value;
                const wing = wingSeatToggle.value === 'yes';
                state.wingEnabled = wing;
                if (!cols || cols.length !== gc) {
                    layoutSummary.style.display = 'block';
                    layoutSummary.textContent = `大组数${gc}，但列数配置有${cols?cols.length:0}项，请保持一致`;
                    layoutSummary.style.color = '#c47d8b';
                    return;
                }
                const totalCols = cols.reduce((a, b) => a + b, 0);
                let count = state.students.length;
                if (wing) {
                    const left = wingLeftSelect.value,
                        right = wingRightSelect.value;
                    if (left && right && left === right) {
                        layoutSummary.style.display = 'block';
                        layoutSummary.textContent = '飞机位学生不能相同';
                        layoutSummary.style.color = '#c47d8b';
                        return;
                    }
                    if (left) count--;
                    if (right) count--;
                }
                if (count <= 0) {
                    layoutSummary.style.display = 'block';
                    layoutSummary.textContent = '没有可参与排座的学生';
                    layoutSummary.style.color = '#c47d8b';
                    return;
                }
                // 正常情况不显示布局摘要提示行
                const base = Math.floor(count / totalCols);
                const rem = count % totalCols;
                const rowsPerCol = [];
                for (let i = 0; i < totalCols; i++) rowsPerCol.push(i < rem ? base + 1 : base);
                const totalSeats = rowsPerCol.reduce((a, b) => a + b, 0);
                layoutSummary.textContent = '';
                layoutSummary.style.display = 'none';
                state.groupCount = gc;
                state.columnsPerGroup = cols;
                state.totalColumns = totalCols;
                state.rowsPerColumn = rowsPerCol;
                state.totalSeats = totalSeats;
            }
            groupCountSelect.addEventListener('change', () => {
                const gc = +groupCountSelect.value;
                if (parseColumns().length !== gc) {
                    if (gc === 4) columnsPerGroupInput.value = '1,3,3,1';
                    else if (gc === 3) columnsPerGroupInput.value = '2,3,2';
                    else if (gc === 2) columnsPerGroupInput.value = '4,4';
                    else columnsPerGroupInput.value = Array(gc).fill(2).join(',');
                }
                updateLayoutSummary();
            });
            columnsPerGroupInput.addEventListener('input', updateLayoutSummary);
            wingSeatToggle.addEventListener('change', () => {
                wingSeatSelectors.style.display = wingSeatToggle.value === 'yes' ? 'flex' : 'none';
                if (wingSeatToggle.value === 'yes') populateWingSelects();
                updateLayoutSummary();
            });
            wingLeftSelect.addEventListener('change', updateLayoutSummary);
            wingRightSelect.addEventListener('change', updateLayoutSummary);
            $('#btnPreset1').addEventListener('click', () => { groupCountSelect.value = '4';
                columnsPerGroupInput.value = '1,3,3,1';
                updateLayoutSummary(); });
            $('#btnPreset2').addEventListener('click', () => { groupCountSelect.value = '4';
                columnsPerGroupInput.value = '2,2,2,2';
                updateLayoutSummary(); });
            $('#btnPreset3').addEventListener('click', () => { groupCountSelect.value = '3';
                columnsPerGroupInput.value = '2,3,2';
                updateLayoutSummary(); });

            // ============================================================
            // 核心优化算法 —— 兼顾纪律、互助、视力、男女均衡
            // ============================================================

            // 行内优化：对一行的学生进行排列，返回优化后的数组
            // 辅助：Fisher-Yates 洗牌（用于引入随机性）
            function shuffleArr(arr) {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                return arr;
            }

            // 随机分配每列行数（让空位随机分布在后排，而非固定在最右侧列）
            function randomRowsPerCol(studentCount, totalCols) {
                const base = Math.floor(studentCount / totalCols);
                const rem = studentCount % totalCols;
                const shortSet = new Set(shuffleArr([...Array(totalCols).keys()]).slice(0, totalCols - rem));
                const rowsPerCol = [];
                for (let i = 0; i < totalCols; i++) rowsPerCol.push(shortSet.has(i) ? base : base + 1);
                return rowsPerCol;
            }

            // 将学生填入座位：空位优先随机分布在后排（从最后一排往前分配空位）
            function fillPositions(plan, positions, students) {
                const totalSeats = positions.length;
                const emptyCount = Math.max(0, totalSeats - students.length);
                const byRow = {};
                positions.forEach(p => { (byRow[p.rowIndex] = byRow[p.rowIndex] || []).push(p); });
                const emptySet = new Set();
                let remain = emptyCount;
                const rowKeys = Object.keys(byRow).map(Number).sort((a, b) => b - a);
                for (const row of rowKeys) {
                    if (remain <= 0) break;
                    const seats = shuffleArr([...byRow[row]]);
                    const take = Math.min(remain, seats.length);
                    for (let k = 0; k < take; k++) emptySet.add(seats[k]);
                    remain -= take;
                }
                let idx = 0;
                for (const pos of positions) {
                    if (emptySet.has(pos)) continue;
                    if (idx >= students.length) break;
                    const student = students[idx++];
                    const g = plan.groups[pos.groupId];
                    if (g && g.columns[pos.colInGroup] && pos.rowIndex < g.columns[pos.colInGroup].seats.length) {
                        g.columns[pos.colInGroup].seats[pos.rowIndex] = student;
                    }
                }
            }

            // 判断相邻两人是否需要拆开（纪律 / 强弱 / 男女均衡）
            function pairHasIssue(a, b) {
                if (!a || !b) return false;
                if (a.activity >= 4 && b.activity >= 4) return true;   // 两吵相邻
                if (a.rank < 200 && b.rank < 200) return true;          // 两强相邻
                if (a.rank > 700 && b.rank > 700) return true;          // 两弱相邻
                if (a.gender === b.gender) return true;                 // 同性相邻
                return false;
            }

            // 统计一行中的问题对数量（约束质量指标）
            function countIssues(row) {
                let n = 0;
                for (let i = 0; i < row.length - 1; i++) {
                    if (pairHasIssue(row[i], row[i + 1])) n++;
                }
                return n;
            }

            function optimizeRow(students) {
                if (students.length <= 1) return students.slice();

                // 1) 按性别分组
                const males = students.filter(s => s.gender === '男');
                const females = students.filter(s => s.gender === '女');

                // 2) 组内按活跃度排序（低→高）；活跃度相同者随机排序（引入随机性）
                const sortByActivityRandomTie = (group) => {
                    group.sort((a, b) => a.activity - b.activity);
                    let i = 0;
                    while (i < group.length) {
                        let j = i;
                        while (j + 1 < group.length && group[j + 1].activity === group[i].activity) j++;
                        const seg = shuffleArr(group.slice(i, j + 1));
                        for (let k = 0; k < seg.length; k++) group[i + k] = seg[k];
                        i = j + 1;
                    }
                };
                sortByActivityRandomTie(males);
                sortByActivityRandomTie(females);

                // 3) 交替取人：人数多的一方先取，保证性别交替
                const result = [];
                let mi = 0,
                    fi = 0;
                if (males.length >= females.length) {
                    while (mi < males.length || fi < females.length) {
                        if (mi < males.length) result.push(males[mi++]);
                        if (fi < females.length) result.push(females[fi++]);
                    }
                } else {
                    while (fi < females.length || mi < males.length) {
                        if (fi < females.length) result.push(females[fi++]);
                        if (mi < males.length) result.push(males[mi++]);
                    }
                }

                // 4) 多轮局部优化：分散吵闹 + 强弱搭配（候选随机选取，保持结果多样化）
                for (let iter = 0; iter < 12; iter++) {
                    let improved = false;
                    for (let i = 0; i < result.length - 1; i++) {
                        // 4a) 相邻两人活跃度都 >=4（吵闹）：从后方活跃度低的人中随机选一个交换
                        if (result[i].activity >= 4 && result[i + 1].activity >= 4) {
                            const cand = [];
                            for (let j = i + 2; j < result.length; j++) {
                                if (result[j].activity < 4) cand.push(j);
                            }
                            if (cand.length) {
                                const j = cand[Math.floor(Math.random() * cand.length)];
                                [result[i + 1], result[j]] = [result[j], result[i + 1]];
                                improved = true;
                            }
                        }
                        // 4b) 相邻两人学习能力都强（rank<200）：随机交换后方 rank>500 者
                        if (result[i].rank < 200 && result[i + 1].rank < 200) {
                            const cand = [];
                            for (let j = i + 2; j < result.length; j++) {
                                if (result[j].rank > 500) cand.push(j);
                            }
                            if (cand.length) {
                                const j = cand[Math.floor(Math.random() * cand.length)];
                                [result[i + 1], result[j]] = [result[j], result[i + 1]];
                                improved = true;
                            }
                        }
                        // 4c) 相邻两人学习能力都弱（rank>700）：随机交换后方 rank<300 者
                        if (result[i].rank > 700 && result[i + 1].rank > 700) {
                            const cand = [];
                            for (let j = i + 2; j < result.length; j++) {
                                if (result[j].rank < 300) cand.push(j);
                            }
                            if (cand.length) {
                                const j = cand[Math.floor(Math.random() * cand.length)];
                                [result[i + 1], result[j]] = [result[j], result[i + 1]];
                                improved = true;
                            }
                        }
                        // 4d) 相邻两人性别相同：随机交换后方异性（强化男女均衡）
                        if (result[i].gender === result[i + 1].gender) {
                            const cand = [];
                            for (let j = i + 2; j < result.length; j++) {
                                if (result[j].gender !== result[i].gender) cand.push(j);
                            }
                            if (cand.length) {
                                const j = cand[Math.floor(Math.random() * cand.length)];
                                [result[i + 1], result[j]] = [result[j], result[i + 1]];
                                improved = true;
                            }
                        }
                    }
                    if (!improved) break;
                }

                // 5) 随机安全交换：在不劣化约束的前提下打乱，让每次生成结果不同
                const baseIssues = countIssues(result);
                for (let t = 0; t < 24; t++) {
                    const i = Math.floor(Math.random() * (result.length - 1));
                    const j = i + 1 + Math.floor(Math.random() * (result.length - 1 - i));
                    [result[i], result[j]] = [result[j], result[i]];
                    if (countIssues(result) > baseIssues) {
                        [result[i], result[j]] = [result[j], result[i]];
                    }
                }

                return result;
            }

            // 生成座位计划（新算法）
            function generateSeatingPlan() {
                updateLayoutSummary();
                const wing = state.wingEnabled;
                let leftId = null,
                    rightId = null;
                if (wing) {
                    leftId = wingLeftSelect.value || null;
                    rightId = wingRightSelect.value || null;
                    if (leftId && rightId && leftId === rightId) { showToast('飞机位学生重复', 'error'); return null; }
                }
                state.wingLeftStudentId = leftId;
                state.wingRightStudentId = rightId;
                const excludeIds = new Set([leftId, rightId].filter(Boolean));
                const pool = state.students.filter(s => !excludeIds.has(s.id));
                if (!pool.length) { showToast('无可排座学生', 'error'); return null; }

                const cols = parseColumns();
                const gc = +groupCountSelect.value;
                if (!cols || cols.length !== gc) { showToast('列数配置错误', 'error'); return null; }
                state.groupCount = gc;
                state.columnsPerGroup = cols;
                state.totalColumns = cols.reduce((a, b) => a + b, 0);

                const studentCount = pool.length;
                const totalCols = state.totalColumns;
                // 每列行数随机分配，让空位随机分布在后排
                const rowsPerCol = randomRowsPerCol(studentCount, totalCols);
                state.rowsPerColumn = rowsPerCol;
                state.totalSeats = rowsPerCol.reduce((a, b) => a + b, 0);

                // 计算每行的座位数
                const maxRow = Math.max(...rowsPerCol);
                const rowSeatCounts = [];
                for (let row = 0; row < maxRow; row++) {
                    let count = 0;
                    let gIdx = 0;
                    for (let g = 0; g < gc; g++) {
                        for (let c = 0; c < cols[g]; c++) {
                            if (row < rowsPerCol[gIdx]) count++;
                            gIdx++;
                        }
                    }
                    rowSeatCounts.push(count);
                }

                // 按身高排序（矮→高）
                const sortedByHeight = [...pool].sort((a, b) => a.height - b.height);

                // 按行分配学生（矮个子坐前排 row=0）
                const rowStudents = [];
                let startIdx = 0;
                for (let row = 0; row < maxRow; row++) {
                    const count = rowSeatCounts[row];
                    const students = sortedByHeight.slice(startIdx, startIdx + count);
                    // 行内优化
                    const optimized = optimizeRow(students);
                    rowStudents.push(optimized);
                    startIdx += count;
                }

                // 展平为学生列表（按行顺序）
                const finalStudents = [];
                for (let row = 0; row < maxRow; row++) {
                    finalStudents.push(...rowStudents[row]);
                }

                // 生成positions（按行优先）
                const positions = [];
                for (let row = 0; row < maxRow; row++) {
                    let gIdx = 0;
                    for (let g = 0; g < gc; g++) {
                        for (let c = 0; c < cols[g]; c++) {
                            if (row < rowsPerCol[gIdx]) {
                                positions.push({ groupId: g, colInGroup: c, rowIndex: row });
                            }
                            gIdx++;
                        }
                    }
                }

                // 构建plan骨架
                const studentMap = {};
                state.students.forEach(s => studentMap[s.id] = s);
                const plan = { groupCount: gc, columnsPerGroup: [...cols], rowsPerColumn: [...rowsPerCol], groups: [] };
                let globalStart = 0;
                for (let g = 0; g < gc; g++) {
                    const group = { groupId: g, columns: [] };
                    for (let c = 0; c < cols[g]; c++) {
                        const rows = rowsPerCol[globalStart];
                        group.columns.push({ colIndex: c, seats: Array(rows).fill(null) });
                        globalStart++;
                    }
                    plan.groups.push(group);
                }

                // 填入座位（空位优先随机分布在后排）
                fillPositions(plan, positions, finalStudents);

                return plan;
            }

            // ============================================================
            // 重新生成（保留布局，重新分配所有学生，填充空位，空位尽量在最后一排）
            // ============================================================
            function reshuffleSeatingPlan(plan) {
                if (!plan || !plan.groups) return plan;

                // 提取所有非空学生（不包括飞机位，因为飞机位不在plan中）
                const allStudents = [];
                plan.groups.forEach(group => {
                    group.columns.forEach(col => {
                        col.seats.forEach(student => {
                            if (student) allStudents.push(student);
                        });
                    });
                });

                if (allStudents.length === 0) return plan;

                // 获取布局参数（大组与列配置保持，列长重新随机以随机化空位）
                const gc = plan.groupCount;
                const cols = plan.columnsPerGroup;
                const totalCols = cols.reduce((a, b) => a + b, 0);
                const rowsPerCol = randomRowsPerCol(allStudents.length, totalCols);
                const maxRow = Math.max(...rowsPerCol);

                // 计算每行座位数
                const rowSeatCounts = [];
                for (let row = 0; row < maxRow; row++) {
                    let count = 0;
                    let gIdx = 0;
                    for (let g = 0; g < gc; g++) {
                        for (let c = 0; c < cols[g]; c++) {
                            if (row < rowsPerCol[gIdx]) count++;
                            gIdx++;
                        }
                    }
                    rowSeatCounts.push(count);
                }

                // 按身高排序（矮→高）
                const sortedByHeight = [...allStudents].sort((a, b) => a.height - b.height);

                // 按行分配学生（矮个子坐前排）
                const rowStudents = [];
                let startIdx = 0;
                for (let row = 0; row < maxRow; row++) {
                    const count = rowSeatCounts[row];
                    // 如果剩余学生不够，则只取剩余数量，后面空位自动为空
                    const slice = sortedByHeight.slice(startIdx, startIdx + count);
                    const optimized = optimizeRow(slice);
                    rowStudents.push(optimized);
                    startIdx += count;
                }

                // 展平
                const finalStudents = [];
                for (let row = 0; row < maxRow; row++) {
                    finalStudents.push(...rowStudents[row]);
                }

                // 生成positions（与plan中一致）
                const positions = [];
                for (let row = 0; row < maxRow; row++) {
                    let gIdx = 0;
                    for (let g = 0; g < gc; g++) {
                        for (let c = 0; c < cols[g]; c++) {
                            if (row < rowsPerCol[gIdx]) {
                                positions.push({ groupId: g, colInGroup: c, rowIndex: row });
                            }
                            gIdx++;
                        }
                    }
                }

                // 构建新plan（保持结构与原plan一致）
                const newPlan = { groupCount: gc, columnsPerGroup: [...cols], rowsPerColumn: [...rowsPerCol], groups: [] };
                let globalStart = 0;
                for (let g = 0; g < gc; g++) {
                    const group = { groupId: g, columns: [] };
                    for (let c = 0; c < cols[g]; c++) {
                        const rows = rowsPerCol[globalStart];
                        group.columns.push({ colIndex: c, seats: Array(rows).fill(null) });
                        globalStart++;
                    }
                    newPlan.groups.push(group);
                }

                // 填入座位（空位优先随机分布在后排）
                fillPositions(newPlan, positions, finalStudents);

                return newPlan;
            }

            // ============================================================
            // 按钮事件绑定
            // ============================================================

            btnGenerate.addEventListener('click', () => {
                if (!state.students.length) { showToast('请先上传学生信息', 'error');
                    switchStep(2); return; }
                showLoading();
                setTimeout(() => {
                    try {
                        const plan = generateSeatingPlan();
                        hideLoading();
                        if (!plan) return;
                        state.seatingPlan = plan;
                        state.originalSeatingPlan = JSON.parse(JSON.stringify(plan));
                        state.selectedSeatEl = null;
                        saveLocal('seatingPlan', plan);
                        saveLocal('layoutConfig', {
                            groupCount: state.groupCount,
                            columnsPerGroup: state.columnsPerGroup,
                            wingEnabled: state.wingEnabled,
                            wingLeft: state.wingLeftStudentId,
                            wingRight: state.wingRightStudentId
                        });
                        seatTableTitle.textContent = state.className ? `— ${state.className}` : '';
                        switchStep(4);
                        renderSeatingChart();
                        showToast('座位表已生成', 'success');
                    } catch (e) { hideLoading();
                        showToast('生成出错：' + e.message, 'error'); }
                }, 120);
            });

            function resetSeatingUI() {
                classroomInner.innerHTML = '<div class="empty-tip">请先生成座位表</div>';
                legendArea.style.display = 'none';
            }

            function renderSeatingChart() {
                if (!state.seatingPlan) { resetSeatingUI(); return; }
                legendArea.style.display = 'flex';
                const plan = state.seatingPlan;
                const maxRow = Math.max(...plan.rowsPerColumn);
                let html = '<div class="seating-grid">';
                plan.groups.forEach((group, gIdx) => {
                    html += `<div class="group-block" data-group="${gIdx}">`;
                    group.columns.forEach((col, cIdx) => {
                        html += `<div class="column" data-group="${gIdx}" data-col="${cIdx}">`;
                        for (let r = 0; r < maxRow; r++) {
                            const student = r < col.seats.length ? col.seats[r] : null;
                            if (student) {
                                const cls = student.gender === '男' ? 'male' : 'female';
                                const tip = `学号 ${student.id}｜${student.name}｜${student.gender}\n年级排名 ${student.rank}｜活跃 ${student.activity}｜身高 ${student.height}`.replace(/"/g, '&quot;');
                                html += `<div class="seat-cell ${cls}" draggable="true" title="${tip}" data-student-id="${student.id}" data-group="${gIdx}" data-col="${cIdx}" data-row="${r}">
                                    <span class="seat-id">${student.id}</span><span class="seat-name">${student.name}</span></div>`;
                            } else {
                                html +=
                                    `<div class="seat-cell empty-seat" data-group="${gIdx}" data-col="${cIdx}" data-row="${r}">—</div>`;
                            }
                        }
                        html += '</div>';
                    });
                    html += '</div>';
                });
                html += '</div>';

                if (state.wingEnabled && (state.wingLeftStudentId || state.wingRightStudentId)) {
                    const leftStu = state.students.find(s => s.id === state.wingLeftStudentId);
                    const rightStu = state.students.find(s => s.id === state.wingRightStudentId);
                    const wingTip = s => `学号 ${s.id}｜${s.name}｜${s.gender}\n年级排名 ${s.rank}｜活跃 ${s.activity}｜身高 ${s.height}`.replace(/"/g, '&quot;');
                    html += '<div class="podium-row">';
                    html +=
                        `<div class="wing-seat" ${leftStu ? `title="${wingTip(leftStu)}"` : ''}>${leftStu ? `<span class="seat-id">${leftStu.id}</span><span class="seat-name">${leftStu.name}</span>` : '—'}</div>`;
                    html += '<div class="podium">讲 台</div>';
                    html +=
                        `<div class="wing-seat" ${rightStu ? `title="${wingTip(rightStu)}"` : ''}>${rightStu ? `<span class="seat-id">${rightStu.id}</span><span class="seat-name">${rightStu.name}</span>` : '—'}</div>`;
                    html += '</div>';
                } else {
                    html += '<div class="podium">讲 台</div>';
                }
                classroomInner.innerHTML = html;
                attachSeatEvents();
            }

            function attachSeatEvents() {
                $$('.seat-cell:not(.empty-seat)').forEach(c => {
                    c.addEventListener('dragstart', dragStart);
                    c.addEventListener('dragend', dragEnd);
                });
                $$('.seat-cell').forEach(c => {
                    c.addEventListener('dragover', dragOver);
                    c.addEventListener('dragleave', dragLeave);
                    c.addEventListener('drop', drop);
                    c.addEventListener('click', seatClick);
                });
            }
            let draggedCell = null;

            function dragStart(e) {
                if (this.classList.contains('empty-seat')) return;
                draggedCell = this;
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                if (state.selectedSeatEl && state.selectedSeatEl !== this) {
                    state.selectedSeatEl.classList.remove('selected');
                    state.selectedSeatEl = null;
                }
            }

            function dragEnd() { this.classList.remove('dragging');
                draggedCell = null; }

            function dragOver(e) { e.preventDefault(); if (this !== draggedCell) this.classList.add('drag-over'); }

            function dragLeave() { this.classList.remove('drag-over'); }

            function drop(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                if (!draggedCell || draggedCell === this) return;
                swapCells(draggedCell, this);
                draggedCell = null;
            }

            function seatClick(e) {
                const cell = e.currentTarget;
                if (state.selectedSeatEl === cell) {
                    cell.classList.remove('selected');
                    state.selectedSeatEl = null;
                    return;
                }
                if (state.selectedSeatEl) {
                    swapCells(state.selectedSeatEl, cell);
                    state.selectedSeatEl.classList.remove('selected');
                    state.selectedSeatEl = null;
                } else {
                    cell.classList.add('selected');
                    state.selectedSeatEl = cell;
                }
            }

            function swapCells(a, b) {
                a.classList.remove('dragging', 'drag-over', 'selected');
                b.classList.remove('dragging', 'drag-over', 'selected');

                const dataA = {
                    studentId: a.dataset.studentId || null,
                    group: +a.dataset.group,
                    col: +a.dataset.col,
                    row: +a.dataset.row
                };
                const dataB = {
                    studentId: b.dataset.studentId || null,
                    group: +b.dataset.group,
                    col: +b.dataset.col,
                    row: +b.dataset.row
                };

                const htmlA = a.innerHTML,
                    htmlB = b.innerHTML;
                const clsA = [...a.classList],
                    clsB = [...b.classList];
                a.innerHTML = htmlB;
                b.innerHTML = htmlA;
                a.className = '';
                clsB.forEach(c => a.classList.add(c));
                b.className = '';
                clsA.forEach(c => b.classList.add(c));
                a.dataset.studentId = dataB.studentId || '';
                b.dataset.studentId = dataA.studentId || '';
                a.draggable = !a.classList.contains('empty-seat');
                b.draggable = !b.classList.contains('empty-seat');

                if (state.seatingPlan) {
                    const plan = state.seatingPlan;
                    const ga = plan.groups[dataA.group],
                        gb = plan.groups[dataB.group];
                    if (ga && gb) {
                        let colA = ga.columns[dataA.col];
                        let colB = gb.columns[dataB.col];
                        if (dataA.row >= colA.seats.length) colA.seats.length = dataA.row + 1;
                        if (dataB.row >= colB.seats.length) colB.seats.length = dataB.row + 1;
                        const tmp = colA.seats[dataA.row];
                        colA.seats[dataA.row] = colB.seats[dataB.row];
                        colB.seats[dataB.row] = tmp;
                    }
                }

                if (state.selectedSeatEl === a) state.selectedSeatEl = b;
                else if (state.selectedSeatEl === b) state.selectedSeatEl = a;
                if (state.selectedSeatEl) state.selectedSeatEl.classList.add('selected');

                $$('.seat-cell').forEach(c => {
                    c.removeEventListener('dragstart', dragStart);
                    c.removeEventListener('dragend', dragEnd);
                    c.removeEventListener('dragover', dragOver);
                    c.removeEventListener('dragleave', dragLeave);
                    c.removeEventListener('drop', drop);
                    c.removeEventListener('click', seatClick);
                });
                attachSeatEvents();
            }

            $('#btnResetSeating').addEventListener('click', async () => {
                if (!state.originalSeatingPlan) return;
                const ok = await showConfirm({ title: '恢复原始座位表', text: '将恢复为首次生成时的安排，手动调整将丢失。是否继续？', okText: '恢复' });
                if (!ok) return;
                state.seatingPlan = JSON.parse(JSON.stringify(state.originalSeatingPlan));
                state.selectedSeatEl = null;
                renderSeatingChart();
                showToast('已恢复');
            });

            $('#btnRegenerate').addEventListener('click', async () => {
                if (!state.seatingPlan) return showToast('请先生成座位表', 'error');
                const ok = await showConfirm({ title: '重新生成座位表', text: '将在当前布局下重新分配所有学生，空位将随机分布在后排。是否继续？', okText: '重新生成' });
                if (!ok) return;
                showLoading();
                setTimeout(() => {
                    try {
                        const newPlan = reshuffleSeatingPlan(state.seatingPlan);
                        hideLoading();
                        state.seatingPlan = newPlan;
                        state.originalSeatingPlan = JSON.parse(JSON.stringify(newPlan));
                        state.selectedSeatEl = null;
                        saveLocal('seatingPlan', newPlan);
                        renderSeatingChart();
                        showToast('座位表已重新生成，空位已填充或后移', 'success');
                    } catch (e) { hideLoading();
                        showToast('重新生成失败', 'error'); }
                }, 120);
            });

            $('#btnExportImage').addEventListener('click', async () => {
                if (!state.seatingPlan) return;
                showLoading();
                try {
                    const container = document.getElementById('classroomContainer');
                    const canvas = await html2canvas(container, { backgroundColor: '#fdf9f2', scale: 2 });
                    const link = document.createElement('a');
                    link.download =
                        `${state.className||'班级'}_座位表_${new Date().toLocaleDateString('zh-CN').replace(/\//g,'-')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    hideLoading();
                    showToast('图片已下载', 'success');
                } catch (e) { hideLoading();
                    showToast('导出失败', 'error'); }
            });

            // 导出座位表 Excel：按座位布局（讲台 + 大组 + 座位网格）排列，仅保留学号/姓名
            function exportSeatPlanXlsx() {
                if (!state.seatingPlan) return showToast('请先生成座位表', 'error');
                if (typeof XLSX === 'undefined') return showToast('Excel 组件未加载', 'error');
                const plan = state.seatingPlan;
                const gc = plan.groupCount;
                const cols = plan.columnsPerGroup;
                const rowsPerCol = plan.rowsPerColumn;
                const maxRow = Math.max(...rowsPerCol);

                // 每个大组的起始列（0-based），大组之间留一空列作间隔
                const colStarts = [];
                let cursor = 0;
                cols.forEach(n => { colStarts.push(cursor); cursor += n + 1; });
                const totalCols = cursor - 1; // 去掉最后一个间隔列
                const cellText = s => `${s.id} ${s.name}`;

                // 第 1 行：讲台（两侧可选飞机位）
                const podiumRow = new Array(totalCols).fill('');
                const leftStu = state.wingEnabled && state.wingLeftStudentId ? state.students.find(s => String(s.id) === String(state.wingLeftStudentId)) : null;
                const rightStu = state.wingEnabled && state.wingRightStudentId ? state.students.find(s => String(s.id) === String(state.wingRightStudentId)) : null;
                if (leftStu) podiumRow[0] = cellText(leftStu);
                if (rightStu) podiumRow[totalCols - 1] = cellText(rightStu);
                // 讲台合并到中间区域
                const podiumStart = leftStu ? 1 : 0;
                const podiumEnd = rightStu ? totalCols - 2 : totalCols - 1;
                for (let c = podiumStart; c <= podiumEnd; c++) podiumRow[c] = '讲 台';
                const aoa = [podiumRow];

                // 学生排（第 0 排最靠近讲台）
                for (let r = 0; r < maxRow; r++) {
                    const rowArr = new Array(totalCols).fill('');
                    let gIdx = 0;
                    cols.forEach((n, g) => {
                        for (let c = 0; c < n; c++) {
                            const colIdx = colStarts[g] + c;
                            if (r < rowsPerCol[gIdx]) {
                                const student = plan.groups[g].columns[c].seats[r];
                                rowArr[colIdx] = student ? cellText(student) : '—';
                            }
                            gIdx++;
                        }
                    });
                    aoa.push(rowArr);
                }

                const ws = XLSX.utils.aoa_to_sheet(aoa);
                // 列宽：大组间隔列窄一些
                const intervalSet = new Set();
                for (let g = 0; g < gc - 1; g++) intervalSet.add(colStarts[g] + cols[g]);
                ws['!cols'] = Array.from({ length: totalCols }, (_, i) => ({ wch: intervalSet.has(i) ? 4 : 11 }));
                // 行高：讲台行略高，学生行容纳内容
                const rowsInfo = [{ hpt: 30 }];
                for (let i = 1; i < aoa.length; i++) rowsInfo.push({ hpt: 22 });
                ws['!rows'] = rowsInfo;
                // 合并讲台单元格
                if (podiumEnd > podiumStart) {
                    ws['!merges'] = [{ s: { r: 0, c: podiumStart }, e: { r: 0, c: podiumEnd } }];
                }

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, '座位表');
                const fname = `${state.className || '班级'}_座位表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
                XLSX.writeFile(wb, fname);
                showToast('Excel 已导出', 'success');
            }
            $('#btnExportXlsx').addEventListener('click', exportSeatPlanXlsx);

            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && state.selectedSeatEl) {
                    state.selectedSeatEl.classList.remove('selected');
                    state.selectedSeatEl = null;
                }
            });

            function init() {
                const settings = loadLocal('settings');
                if (settings) {
                    state.teacherName = settings.teacherName || '';
                    state.className = settings.className || '';
                    teacherNameInput.value = state.teacherName;
                    classNameInput.value = state.className;
                }
                updateWelcome();
                const savedStudents = loadLocal('students');
                if (savedStudents && savedStudents.length) {
                    state.students = savedStudents;
                    renderStudentPreview();
                    btnClearStudents.style.display = 'inline-flex';
                    uploadedFileName.innerHTML = FILE_OK_SVG + '<span class="file-name">已从本地加载</span>';
                }
                const layoutCfg = loadLocal('layoutConfig');
                if (layoutCfg) {
                    state.groupCount = layoutCfg.groupCount || 4;
                    state.columnsPerGroup = layoutCfg.columnsPerGroup || [1, 3, 3, 1];
                    groupCountSelect.value = state.groupCount;
                    columnsPerGroupInput.value = state.columnsPerGroup.join(',');
                    if (layoutCfg.wingEnabled) {
                        wingSeatToggle.value = 'yes';
                        wingSeatSelectors.style.display = 'flex';
                        state.wingEnabled = true;
                        state.wingLeftStudentId = layoutCfg.wingLeft || null;
                        state.wingRightStudentId = layoutCfg.wingRight || null;
                        populateWingSelects();
                    }
                }
                const savedPlan = loadLocal('seatingPlan');
                if (savedPlan && savedPlan.groups) {
                    state.seatingPlan = savedPlan;
                    state.originalSeatingPlan = JSON.parse(JSON.stringify(savedPlan));
                    seatTableTitle.textContent = state.className ? `— ${state.className}` : '';
                }
                updateLayoutSummary();
                switchStep(1);
                if (state.seatingPlan && state.students.length) {
                    setTimeout(async () => {
                        const ok = await showConfirm({ title: '恢复上次座位表', text: '检测到已保存的座位表，是否直接查看？', okText: '查看' });
                        if (ok) { switchStep(4);
                            renderSeatingChart(); }
                    }, 400);
                }
            }
            init();
        })();
    