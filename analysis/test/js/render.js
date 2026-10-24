        // ============================================================
        //  渲染函数
        // ============================================================
        function renderResults(results) {
            const area = document.getElementById('resultArea');
            if (!results) {
                area.innerHTML = `
                    <div class="card">
                        <div class="empty-state">
                            <p style="font-size:18px;font-weight:600;color:#4a5a6a;">请上传数据文件开始分析</p>
                            <p style="color:#8a9aaa;font-size:14px;margin-top:8px;">支持 .xlsx 或 .xls 格式</p>
                        </div>
                    </div>
                `;
                return;
            }

            const panels = [
                { id: 'tab-category', title: '题目分类', badge: `${results.numQuestions} 题`, html: renderCategoryTable(results) },
                { id: 'tab-diff', title: '难度指数对比', badge: `${results.classNames.filter(c => c !== '全校').length} 班`, html: renderDiffComparison(results) },
                { id: 'tab-suggest', title: '各班改进建议', badge: countSuggestionClasses(results), html: renderSuggestions(results) }
            ];
            area.innerHTML = buildTabsHTML(panels);
        }

        // 统计需要改进的班级数（用于标签角标，仅展示用，不改动分析逻辑）
        function countSuggestionClasses(results) {
            const { classNames, diffMatrix } = results;
            let n = 0;
            for (const cls of classNames) {
                if (cls === '全校') continue;
                const diffs = diffMatrix[cls] || [];
                if (diffs.some(v => isFinite(v) && v < 0)) n++;
            }
            return n > 0 ? `${n} 班` : '0 班';
        }

        // 将各结果卡片组装为横排 Tab 卡片切换布局
        function buildTabsHTML(panels) {
            const tabButtons = panels.map((p, i) => `
                <button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="${p.id}" onclick="switchTab('${p.id}')">
                    ${p.title}<span class="tab-badge">${p.badge}</span>
                </button>
            `).join('');
            const tabPanels = panels.map((p, i) => `
                <div class="tab-panel${i === 0 ? ' active' : ''}" id="${p.id}">${p.html}</div>
            `).join('');
            return `
                <div class="tabs-card">
                    <div class="tabs">${tabButtons}</div>
                    ${tabPanels}
                </div>
            `;
        }

        // 切换 Tab 卡片
        function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
            const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
            if (btn) btn.classList.add('active');
            const panel = document.getElementById(tabId);
            if (panel) panel.classList.add('active');
        }

        // 上传数据后、点击「开始分析」前的就绪状态
        function renderReadyState(parsed) {
            const area = document.getElementById('resultArea');
            if (!parsed) {
                renderResults(null);
                return;
            }
            const classCount = Object.keys(parsed.classData || {}).filter(c => c !== '全校').length;
            const qCount = (parsed.headers || []).length;
            area.innerHTML = `
                <div class="card">
                    <div class="ready-state">
                        <div class="icon">${checkIconSvg()}</div>
                        <p style="font-size:18px;font-weight:600;color:#1a6a3a;">数据已就绪，等待开始分析</p>
                        <p style="color:#8a9aaa;font-size:14px;margin-top:8px;">已读取 ${classCount} 个班级、${qCount} 道小题 · 请确认「难度区分设定」后点击「开始分析」</p>
                    </div>
                </div>
            `;
        }

        function renderCategoryTable(results) {
            const { headers, schoolRates, categories, idxSimple, idxMedium, idxHard, highThreshold, lowThreshold } = results;
            let rows = '';
            for (let i = 0; i < headers.length; i++) {
                const cat = categories[i] || 'medium';
                const rate = schoolRates[i] || 0;
                const label = { simple: '简单题', medium: '中档题', hard: '难题' }[cat] || '—';
                const tagClass = { simple: 'tag-simple', medium: 'tag-medium', hard: 'tag-hard' }[cat] || '';
                rows += `<tr><td><strong>${headers[i]}</strong></td><td>${fmtPct(rate)}</td><td><span class="${tagClass}">${label}</span></td></tr>`;
            }
            const stats = `
                <span class="badge-count" style="background:#28a745;color:#fff;">简单 ${idxSimple.length}</span>
                <span class="badge-count" style="background:#ffc107;color:#333;">中档 ${idxMedium.length}</span>
                <span class="badge-count" style="background:#dc3545;color:#fff;">难题 ${idxHard.length}</span>
            `;
            return `
                <div class="card">
                    <div class="card-title">
                        题目分类（基于全校得分率）
                        <span class="sub">— 简单 ≥${highThreshold} &nbsp;|&nbsp; 中档 ${lowThreshold}~${highThreshold} &nbsp;|&nbsp; 难题 <${lowThreshold}</span>
                        ${stats}
                    </div>
                    <div class="table-wrap">
                        <table><thead><tr><th>题号</th><th>全校得分率</th><th>分类</th></tr></thead><tbody>${rows}</tbody></table>
                    </div>
                </div>
            `;
        }

        function renderDiffComparison(results) {
            const { headers, classNames, diffMatrix } = results;
            if (classNames.length <= 1) {
                return `
                    <div class="card">
                        <div class="card-title">难度指数对比 <span class="sub">— 各班级 vs 全校</span></div>
                        <div style="padding:20px;text-align:center;color:#8a9aaa;">⚠️ 只有全校数据，无法进行班级对比</div>
                    </div>
                `;
            }

            let rows = '';
            for (const cls of classNames) {
                if (cls === '全校') continue;
                const diffs = diffMatrix[cls] || [];
                rows += `<tr><td class="row-label">${cls}</td>`;
                for (let i = 0; i < headers.length; i++) {
                    const val = diffs[i];
                    if (val === undefined || !isFinite(val)) {
                        rows += `<td>—</td>`;
                    } else {
                        const clsName = val < 0 ? 'diff-negative' : (val > 0 ? 'diff-positive' : 'diff-zero');
                        const arrow = val < 0 ? '▼' : (val > 0 ? '▲' : '—');
                        rows += `<td class="${clsName}">${fmt(val)} ${arrow}</td>`;
                    }
                }
                rows += `</tr>`;
            }

            return `
                <div class="card">
                    <div class="card-title">
                        难度指数对比（各班级 vs 全校）
                        <span class="sub">— 差值 = 全校难度指数 − 班级难度指数</span>
                        <span style="font-size:13px;font-weight:500;margin-left:8px;">
                            <span class="diff-negative">🔴 ＜0（班级偏弱）</span>
                            <span class="diff-positive" style="margin-left:8px;">🟢 ＞0（班级偏强）</span>
                        </span>
                        <button class="btn-download-table" onclick="downloadDiffTable()" style="margin-left:auto;">
                            ${downloadIconSvg()} 下载对比表格
                        </button>
                    </div>
                    <div class="table-wrap">
                        <table><thead><tr><th style="min-width:70px;">班级</th>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
                    </div>
                    <div style="margin-top:12px;font-size:13px;color:#5a6a7a;background:#f5f8fc;padding:10px 18px;border-radius:10px;line-height:1.7;">
                        💡 差值＜0（红色🔴）表示该班此题难度指数高于全校，即该班在此题上表现<strong>偏弱</strong>，是需要重点关注和改进的题目。<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;差值＞0（绿色🟢）表示该班此题难度指数低于全校，即该班在此题上表现<strong>偏强</strong>。
                    </div>
                </div>
            `;
        }

        function renderSuggestions(results) {
            const { headers, classNames, diffMatrix } = results;

            if (classNames.length <= 1) {
                return `
                    <div class="card">
                        <div class="card-title">各班改进建议</div>
                        <div style="padding:20px;text-align:center;color:#8a9aaa;">只有全校数据，无法生成班级建议</div>
                    </div>
                `;
            }

            let suggestions = {};
            let totalIssues = 0;
            for (const cls of classNames) {
                if (cls === '全校') continue;
                const diffs = diffMatrix[cls] || [];
                const items = [];
                for (let i = 0; i < headers.length; i++) {
                    const val = diffs[i];
                    if (isFinite(val) && val < 0) {
                        items.push({ index: i, diff: val, absDiff: Math.abs(val) });
                    }
                }
                items.sort((a, b) => b.absDiff - a.absDiff);
                suggestions[cls] = items;
                totalIssues += items.length;
            }

            if (totalIssues === 0) {
                return `
                    <div class="card">
                        <div class="card-title">各班改进建议</div>
                        <div style="padding:20px;text-align:center;color:#28a745;">${checkIconSvg()} 所有班级各题难度指数均不高于全校，无需特别改进。</div>
                    </div>
                `;
            }

            let displayHtml = '';
            for (const cls of Object.keys(suggestions)) {
                const items = suggestions[cls];
                if (items.length === 0) continue;
                const topics = items.map(item => `${headers[item.index]} (差值${fmt(item.diff)})`).join('、');
                displayHtml += `
                    <div class="suggestion-box">
                        <div class="class-name">${classTagIconSvg()} ${cls}</div>
                        <div class="topic-list">重点关注题目：${topics}</div>
                    </div>
                `;
            }

            const suggestionId = 'sug_' + Date.now();
            window[suggestionId] = { suggestions, headers };
            const downloadBtn = `
                <button class="btn-download" onclick="downloadSuggestionsFromGlobal('${suggestionId}')">
                    ${downloadIconSvg()} 下载改进建议
                </button>
            `;

            return `
                <div class="card">
                    <div class="card-title">
                        各班需要注意的题目（差值＜0，班级偏弱）
                        <span class="sub">— 按差值绝对值从大到小排列</span>
                        ${downloadBtn}
                    </div>
                    ${displayHtml}
                    <div style="margin-top:14px;font-size:13px;color:#5a6a7a;background:#fef9f0;padding:10px 18px;border-radius:10px;border-left:4px solid #e8a840;line-height:1.7;">
                        ⚠️ 红色标记题目表示该班此题难度显著高于全校（班级偏弱），建议优先进行教学改进。
                    </div>
                </div>
            `;
        }