/**
 * ui.js —— 视图渲染（学科/班级标签、统计信息、数据表格、视图切换）
 *
 * 说明：本模块仅负责界面渲染与交互反馈，不包含任何数据计算逻辑。
 * 对外暴露：window.UI = { resetAll, updateStatsForEntity, renderSubjects,
 *                         renderClassTabs, selectSubject, selectEntity,
 *                         initCheckboxes, updateCheckedClasses,
 *                         updateAllView, updateSingleView }
 * 依赖：window.AppState、window.Utils、window.Data、window.Charts
 */
(function () {
    'use strict';

    const S = AppState;
    const D = S.dom;

    /** 重置全部界面与状态到初始状态 */
    function resetAll() {
        S.parsedData = null; S.studentRecords = []; S.currentSubject = null; S.currentEntity = null;
        S.globalSegments = []; S.classData = {}; S.checkedClasses = [];
        if (S.chartInstance) { S.chartInstance.destroy(); S.chartInstance = null; }
        D.uploadBox.classList.remove('uploaded'); D.uploadBox.classList.remove('loading');
        if (D.analysisArea) D.analysisArea.classList.add('hidden');
        D.uploadFileName.textContent = ''; D.fileInput.value = '';
        D.analyzeBtn.disabled = true; D.resetBtn.disabled = true; D.statusText.textContent = '请上传数据文件';
        D.statusText.className = 'status';
        D.totalStudents.textContent = '—'; D.totalClasses.textContent = '—'; D.totalSubjects.textContent = '—';
        D.maxScore.textContent = '—'; D.minScore.textContent = '—'; D.segmentCount.textContent = '—';
        D.subjectBar.innerHTML = '<span class="label">📚 学科：</span>';
        D.classTabs.innerHTML = ''; D.comparePanel.classList.remove('show'); D.checkboxGroup.innerHTML = '';
        if (D.viewCardChart) D.viewCardChart.classList.add('active');
        if (D.viewCardTable) D.viewCardTable.classList.remove('active');
        if (D.viewChartPanel) D.viewChartPanel.classList.remove('hidden');
        if (D.viewTablePanel) D.viewTablePanel.classList.add('hidden');
        D.noDataMsg.style.display = 'block'; D.noDataMsg.innerHTML = '<span class="icon">📂</span><p>请上传数据并点击“开始分析”</p>';
        D.resultTable.style.display = 'none'; D.noChartMsg.style.display = 'block';
        D.noChartMsg.innerHTML = '<span class="icon">📈</span><p>选择班级后显示曲线</p>';
        D.tChartCanvas.style.display = 'none'; D.chartSubtitle.textContent = '请选择班级'; D.dataTitle.textContent = '📋 分析数据明细';
        document.querySelectorAll('.subject-tab').forEach(t => t.remove());
    }

    /** 根据当前实体更新统计信息（最高/最低分、分数段数） */
    function updateStatsForEntity(entity) {
        if (entity === '全校') {
            if (S.globalSegments.length > 0) {
                D.maxScore.textContent = S.globalSegments[0].score;
                D.minScore.textContent = S.globalSegments[S.globalSegments.length - 1].score;
                D.segmentCount.textContent = S.globalSegments.length;
            } else {
                D.maxScore.textContent = '—'; D.minScore.textContent = '—'; D.segmentCount.textContent = '—';
            }
        } else {
            const clsData = S.classData[entity];
            if (clsData && clsData.rows.length > 0) {
                const rows = clsData.rows;
                D.maxScore.textContent = rows[0].score;
                D.minScore.textContent = rows[rows.length - 1].score;
                D.segmentCount.textContent = rows.length;
            } else {
                D.maxScore.textContent = '—'; D.minScore.textContent = '—'; D.segmentCount.textContent = '—';
            }
        }
    }

    /** 渲染学科标签栏，并初始化默认学科（默认选中第一个） */
    function renderSubjects(subjects) {
        D.subjectBar.innerHTML = '<span class="label">📚 学科：</span><div class="tabs"></div>';
        const tabsBox = D.subjectBar.querySelector('.tabs');
        subjects.forEach((sub, idx) => {
            const span = document.createElement('span');
            span.className = 'subject-tab';
            if (idx === 0) span.classList.add('active');
            span.dataset.subject = sub;
            span.textContent = sub;
            span.addEventListener('click', function() {
                document.querySelectorAll('.subject-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                selectSubject(this.dataset.subject);
            });
            tabsBox.appendChild(span);
        });
        if (subjects.length > 0) {
            const first = subjects[0];
            S.currentSubject = first;
            S.globalSegments = Data.buildGlobalSegments(S.parsedData.students, first);
            S.classData = Data.buildClassData(S.parsedData.students, S.globalSegments, first);
            S.checkedClasses = [];
            renderClassTabs(Object.keys(S.classData));
            selectEntity('全校');
        }
    }

    /** 渲染班级标签栏（含“全校”入口） */
    function renderClassTabs(classes) {
        const sorted = Utils.sortClasses(classes);
        D.classTabs.innerHTML = '<span class="label"><span class="label-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1016.947421 821.02335c0 108.884932-89.103309 197.988241-197.988241 197.988241h-617.530657C92.543591 1018.839577 3.440282 929.908282 3.440282 821.02335v-617.530657C3.440282 94.607761 92.543591 5.504452 201.428523 5.504452h617.530657c108.884932 0 197.988241 89.103309 197.988241 197.988241v617.530657z m0 0" fill="#40CC93"></path><path d="M628.883588 544.768688h6.880565c44.207626 0.516042 88.415253 11.180917 127.978498 30.790526 10.320847 5.504452 22.877877 4.988409 32.682681-1.376113 9.804804-6.364522 15.48127-17.717453 14.621199-29.414413-0.688056-9.460776-5.332437-17.889467-12.729044-23.393919v-0.688056l-5.676466-2.92424c-12.040988-6.020494-24.598018-11.352931-37.499076-15.997313 46.615824-37.155048 73.794053-93.403662 73.794054-153.780614 0-108.540904-88.415253-196.956157-196.956157-196.956157-39.563245 0-77.40635 11.524945-109.917017 33.542752-79.986561-31.82261-171.842096-3.612296-220.178061 68.289601-24.598018 36.466991-35.262893 80.674618-30.102469 124.366202s25.974131 84.1149 58.312783 113.873342c3.268268 2.92424 6.536536 5.84848 9.976819 8.428691-28.554342 10.836889-55.044515 25.802117-79.126491 44.723669-35.262893 27.866286-64.333277 63.817235-83.942886 104.240551-19.609609 40.423316-29.930455 85.491013-29.930455 130.55871 0 17.889467 14.449185 32.338653 32.338652 32.338653s32.338653-14.449185 32.338653-32.338652c0-72.245926 32.510667-139.33143 89.275323-184.055099 35.778935-28.0383 78.438434-45.067697 123.162104-49.196035-44.551655 31.306568-81.706703 72.417941-108.196876 120.065849-29.758441 53.668402-45.583739 114.389384-45.583739 175.798421 0 17.889467 14.449185 32.338653 32.338653 32.338653s32.338653-14.449185 32.338652-32.338653c0-103.38048 52.464304-197.816227 140.363515-252.3447 45.927768-28.554342 98.908114-44.035612 153.092558-44.551655h0.344028z m0.860071-64.677306c-71.729884-1.204099-129.870653-60.548967-129.870654-132.278851 0-72.933983 59.344868-132.278851 132.278851-132.278851s132.278851 59.344868 132.278851 132.278851c0 71.55787-58.312783 130.902738-129.870653 132.278851h-4.816395zM355.725181 288.811692c22.533848-33.370737 60.032925-52.636318 98.908113-52.636318 4.816395 0 9.804804 0.344028 14.6212 0.86007-22.017806 32.510667-34.058794 71.213842-34.058794 110.777087 0 45.583739 15.48127 89.103309 44.035612 124.194188-37.499076 7.912649-76.546279-2.408198-105.272636-28.726356-43.863598-40.079288-51.432219-105.100622-18.233495-154.468671z" fill="#FFFFFF"></path><path d="M859.038468 744.649084c6.880564-4.816395 11.868974-12.040988 14.105157-20.12565 2.580212-9.288762 1.204099-19.437594-3.78431-27.694272L848.889635 662.254326c-9.804804-16.169326-30.618512-22.18982-47.30388-14.105158-0.688056-8.600706-4.472367-16.685369-10.664875-22.705862-6.70855-6.70855-15.997312-10.492861-25.458088-10.492861h-41.111373c-9.63279 0-18.577524 3.612296-25.630102 10.320847-6.192508 6.020494-10.148833 14.277171-10.836889 22.705862-17.029397-8.256677-37.499076-2.236183-47.475894 14.277172l-20.46968 34.402822c-4.988409 8.256677-6.192508 18.40551-3.612296 27.866286 2.236183 8.084663 7.224593 15.137242 14.105157 19.953636-6.880564 4.816395-11.868974 12.040988-14.105157 20.125651-2.580212 9.288762-1.204099 19.437594 3.78431 27.694272l20.46968 34.402822c9.804804 16.513355 30.274483 22.533848 47.30388 14.277171 0.688056 8.600706 4.472367 16.513355 10.664875 22.533849 6.880564 6.70855 15.825298 10.492861 25.286074 10.492861h41.111373c9.63279 0 18.577524-3.612296 25.458088-10.320847 6.192508-6.020494 10.148833-14.105157 10.836889-22.705863 17.029397 8.084663 37.499076 2.236183 47.475894-14.277171l20.297665-34.402822c4.988409-8.428691 6.364522-18.233496 3.784311-27.694272-2.064169-8.084663-7.052579-15.137242-13.761129-19.953637z m-173.390223 13.245087c4.644381-16.685369 0.172014-34.574836-11.352932-47.131866l4.988409-8.428692c12.213002 2.752226 24.942046 1.032085 36.122964-4.988409 11.352931-6.192508 19.781623-16.513355 23.737947-28.554342h11.352931c3.956325 12.040988 12.213002 22.18982 23.393919 28.554342 11.008903 6.192508 24.081975 8.084663 36.294978 5.160423l4.988409 8.428692c-8.428691 9.116748-13.245087 21.157736-13.245087 33.714765 0 12.55703 4.816395 24.598018 13.073073 33.88678l-4.98841 8.600706c-12.213002-2.752226-24.942046-1.032085-35.950949 4.988409-11.180917 6.192508-19.609609 16.341341-23.565933 28.382328h-11.352931c-2.580212-7.740635-6.880564-14.621199-12.729044-20.297665-12.55703-12.213002-30.274483-17.029397-46.959852-13.245086l-4.98841-8.428692c5.160423-6.020494 9.116748-13.073072 11.180918-20.641693z" fill="#FFFFFF"></path><path d="M746.54124 789.716781c23.909961 0 43.347556-19.437594 43.347556-43.347555 0-23.909961-19.437594-43.347556-43.347556-43.347556-15.48127 0-29.758441 8.256677-37.499076 21.673778s-7.740635 29.930455 0 43.347556c7.740635 13.417101 22.18982 21.673778 37.499076 21.673777z m1.892155-42.315471c-0.344028 0.688056-1.032085 1.032085-1.892155 1.032085-1.204099 0-2.236183-1.032085-2.236184-2.236184s1.032085-2.236183 2.236184-2.236183c0.688056 0 1.548127 0.344028 1.892155 1.032085 0.516042 1.032085 0.516042 1.720141 0 2.408197z" fill="#FFFFFF"></path><path d="M818.95918 4.816395h-617.530657C94.951789 4.816395 7.568621 89.96338 3.612296 195.580044v632.151856c1.892155 51.088191 23.393919 97.359987 57.108685 131.590794L957.774567 62.097094C921.995632 26.662187 872.971611 4.816395 818.95918 4.816395z" opacity=".1" fill="#FFFFFF"></path></svg></span>班级：</span><div class="tabs"></div>';
        const tabsBox = D.classTabs.querySelector('.tabs');
        const allTab = document.createElement('span');
        allTab.className = 'class-tab all-class';
        allTab.dataset.entity = '全校';
        allTab.textContent = '全校';
        allTab.addEventListener('click', function() { selectEntity('全校'); });
        tabsBox.appendChild(allTab);
        sorted.forEach((cls) => {
            const tab = document.createElement('span');
            tab.className = 'class-tab';
            tab.dataset.entity = cls;
            tab.textContent = cls;
            tab.addEventListener('click', function() { selectEntity(cls); });
            tabsBox.appendChild(tab);
        });
        if (S.currentEntity) {
            document.querySelectorAll('.class-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.entity === S.currentEntity);
            });
        } else {
            const firstTab = D.classTabs.querySelector('.class-tab');
            if (firstTab) { firstTab.classList.add('active'); S.currentEntity = '全校'; }
        }
        if (S.currentEntity === '全校') {
            selectEntity('全校');
        } else if (S.currentEntity && sorted.includes(S.currentEntity)) {
            updateSingleView(S.currentEntity);
        } else {
            selectEntity('全校');
        }
    }

    /** 选择学科（保留当前班级选择与勾选状态） */
    function selectSubject(subject) {
        if (!S.parsedData) return;
        const oldChecked = S.checkedClasses.slice();
        const prevEntity = S.currentEntity;
        S.currentSubject = subject;
        S.globalSegments = Data.buildGlobalSegments(S.parsedData.students, subject);
        S.classData = Data.buildClassData(S.parsedData.students, S.globalSegments, subject);

        const validClasses = Object.keys(S.classData);
        const preserved = oldChecked.filter(cls => validClasses.includes(cls));
        S.checkedClasses = preserved;

        // 尽量保留当前选择的班级；若该班级在新学科无有效数据，则回到全校
        const target = (prevEntity !== '全校' && !validClasses.includes(prevEntity)) ? '全校' : prevEntity;
        S.currentEntity = target;

        renderClassTabs(validClasses);
        updateStatsForEntity(target);
    }

    /** 选择实体（全校 或 单个班级） */
    function selectEntity(entity) {
        document.querySelectorAll('.class-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.entity === entity);
        });
        S.currentEntity = entity;
        if (entity === '全校') {
            D.comparePanel.classList.add('show');
            initCheckboxes(S.checkedClasses);
            updateAllView();
        } else {
            D.comparePanel.classList.remove('show');
            if (S.classData[entity]) {
                updateSingleView(entity);
            } else {
                D.noDataMsg.style.display = 'block';
                D.noDataMsg.innerHTML = `<span class="icon">⚠️</span><p>该班级在“${S.currentSubject}”学科无有效数据</p>`;
                D.resultTable.style.display = 'none';
                D.noChartMsg.style.display = 'block';
                D.noChartMsg.innerHTML = `<span class="icon">📈</span><p>无数据可显示</p>`;
                D.tChartCanvas.style.display = 'none';
                if (S.chartInstance) { S.chartInstance.destroy(); S.chartInstance = null; }
            }
        }
    }

    /** 初始化“全校对比”班级复选框 */
    function initCheckboxes(selected) {
        const classNames = Object.keys(S.classData).sort((a, b) => {
            const na = parseFloat(a), nb = parseFloat(b);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return a.localeCompare(b);
        });
        D.checkboxGroup.innerHTML = '';
        classNames.forEach((cls, idx) => {
            const label = document.createElement('label');
            label.className = 'checkbox-item';
            const color = S.COLORS[idx % S.COLORS.length];
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = cls;
            cb.checked = selected ? selected.includes(cls) : false;
            cb.addEventListener('change', function() {
                updateCheckedClasses();
                updateAllView();
            });
            const dot = document.createElement('span');
            dot.className = 'color-dot';
            dot.style.backgroundColor = color;
            label.appendChild(cb);
            label.appendChild(dot);
            label.appendChild(document.createTextNode(cls));
            D.checkboxGroup.appendChild(label);
        });
        updateCheckedClasses();
    }

    /** 从复选框收集勾选的班级 */
    function updateCheckedClasses() {
        const cbs = D.checkboxGroup.querySelectorAll('input[type="checkbox"]');
        S.checkedClasses = [];
        cbs.forEach(cb => { if (cb.checked) S.checkedClasses.push(cb.value); });
    }

    /** 全校视图：渲染全校数据明细表 + 多班级对比曲线 */
    function updateAllView() {
        if (!S.globalSegments || S.globalSegments.length === 0) return;
        updateStatsForEntity('全校');

        D.dataTitle.textContent = '📋 分析数据明细 · ' + S.currentSubject + ' · 全校';
        D.tableHead.innerHTML = `<tr><th>分数</th><th>全校人数</th><th>全校累计人数</th><th>全校累计比率</th></tr>`;
        D.tableBody.innerHTML = '';
        for (const seg of S.globalSegments) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${seg.score}</td><td>${seg.count}</td><td>${seg.cum}</td><td>${Utils.fmtRatio(seg.ratio)}</td>`;
            D.tableBody.appendChild(tr);
        }
        D.noDataMsg.style.display = 'none';
        D.resultTable.style.display = 'table';

        const selected = S.checkedClasses.filter(cls => S.classData[cls]);
        if (selected.length === 0) {
            D.noChartMsg.style.display = 'block';
            D.noChartMsg.innerHTML = '<span class="icon">📈</span><p>请勾选至少一个班级进行对比</p>';
            D.tChartCanvas.style.display = 'none';
            if (S.chartInstance) { S.chartInstance.destroy(); S.chartInstance = null; }
            D.chartSubtitle.textContent = `${S.currentSubject} · 全校班级对比 (请选择班级)`;
            return;
        }
        D.chartSubtitle.textContent = `${S.currentSubject} · 全校班级对比 (${selected.length}个班级) · 横轴: 全校累计比率`;
        D.noChartMsg.style.display = 'none';
        D.tChartCanvas.style.display = 'block';
        Charts.renderMultiClassChart(selected);
    }

    /** 单班级视图：渲染班级数据明细表 + 单班级 T 值曲线 */
    function updateSingleView(className) {
        if (!S.globalSegments || !S.classData[className]) return;
        const clsData = S.classData[className];
        const classRows = clsData.rows;
        const classTotalN = clsData.totalN;
        const tValues = Data.computeTValues(S.globalSegments, classRows, classTotalN);

        updateStatsForEntity(className);

        D.dataTitle.textContent = `📋 分析数据明细 · ${S.currentSubject} · ${className}`;
        D.tableHead.innerHTML = `
            <tr><th>分数</th><th>全校人数</th><th>全校累计人数</th><th>全校累计比率</th>
            <th>班级人数</th><th>班级累计人数</th><th>班级累计比率</th>
            <th>差值</th><th>累计方差</th><th>T值</th></tr>
        `;
        D.tableBody.innerHTML = '';
        for (let i = 0; i < S.globalSegments.length; i++) {
            const seg = S.globalSegments[i];
            const row = classRows[i];
            const diff = row.ratio - seg.ratio;
            const variance = Math.sqrt(classTotalN * seg.ratio * (1 - seg.ratio));
            const t = tValues[i];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${seg.score}</td><td>${seg.count}</td><td>${seg.cum}</td><td>${Utils.fmtRatio(seg.ratio)}</td>
                <td>${row.count}</td><td>${row.cum}</td><td>${Utils.fmtRatio(row.ratio)}</td>
                <td>${Utils.fmtRatio(diff)}</td><td>${Utils.fmtNum(variance, 3)}</td><td>${Utils.fmtNum(t, 3)}</td>
            `;
            D.tableBody.appendChild(tr);
        }
        D.noDataMsg.style.display = 'none';
        D.resultTable.style.display = 'table';

        D.chartSubtitle.textContent = `${S.currentSubject} · ${className} (${classTotalN}人) · 横轴: 班级累计比率`;
        D.noChartMsg.style.display = 'none';
        D.tChartCanvas.style.display = 'block';
        Charts.renderSingleChart(classRows, tValues, className);
    }

    window.UI = {
        resetAll, updateStatsForEntity, renderSubjects, renderClassTabs,
        selectSubject, selectEntity, initCheckboxes, updateCheckedClasses,
        updateAllView, updateSingleView
    };
})();
