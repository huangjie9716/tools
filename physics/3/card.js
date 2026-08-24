// ================================================================
// card.js — 藏经阁秘籍收集逻辑（适配古风样式 + KaTeX 渲染变量符号）
// ================================================================

// 工具函数：获取卡片类别
function getCardCategory(cardId) {
    const mechanics = ['speed','density','gravity','pressure','liquid_pressure','work','power_mech','lever','efficiency_mech'];
    const thermal = ['specific_heat'];
    const electric = ['ohm','elec_work','elec_heat'];
    if (mechanics.includes(cardId)) return 'mechanics';
    if (thermal.includes(cardId)) return 'thermal';
    if (electric.includes(cardId)) return 'electric';
    const groupMap = {
        'buoyancy': 'buoyancy',
        'heatval': 'thermal',
        'thermaleff': 'thermal',
        'elecpower': 'electric'
    };
    if (groupMap[cardId]) return groupMap[cardId];
    if (cardId.startsWith('buoyancy')) return 'buoyancy';
    if (cardId.startsWith('heatval') || cardId.startsWith('thermaleff')) return 'thermal';
    if (cardId.startsWith('elecpower')) return 'electric';
    return 'mechanics';
}

// 渲染卡片网格
function renderCardGrid() {
    const grid = document.getElementById('cardGrid');
    let html = '';
    CARD_DATA.forEach(item => {
        let owned = false;
        let statusText = '';
        let fragmentCount = 0;
        let isFragmentGroup = item.type === 'group';
        let category = item.category || getCardCategory(item.id);
        let cls = 'card-item ' + category;

        if (isFragmentGroup) {
            const allCollected = item.fragments.every(f => G.collected.includes(f.id));
            owned = allCollected;
            const collectedCount = item.fragments.filter(f => G.collected.includes(f.id)).length;
            fragmentCount = item.fragments.length;
            statusText = owned ? '✅ 已习得' : `残卷 ${collectedCount}/${fragmentCount}`;
            cls += ' fragment';
            if (owned) cls += ' owned';
        } else {
            owned = G.collected.includes(item.id);
            statusText = owned ? '✅ 已习得' : '🔒 封印中';
            if (owned) cls += ' owned';
        }

        let sealHtml = owned
            ? `<div class="seal"><svg class="seal-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M799.573 773.12l-46.08-13.653c-5.973-3.414-5.12-10.24-5.12-17.067l27.307 1.707 8.533-133.12c1.707-26.454-17.066-48.64-40.96-50.347l-85.333-5.973h-179.2L354.987 604.16c-18.774 8.533-34.134 23.04-44.374 41.813L243.2 765.44l-8.533 10.24c-1.707 2.56-5.12 4.267-7.68 5.973l-56.32 25.6c-2.56 1.707-5.12 4.267-5.12 7.68 0 5.12 4.266 9.387 9.386 8.534l80.214-13.654c7.68-0.853 14.506-5.973 18.773-13.653l10.24-22.187 17.067 4.267 107.52-85.333c10.24-6.827 21.333-12.8 33.28-16.214l119.466-34.986 108.374 5.12c12.8 1.706 23.04 11.946 24.746 24.746l12.8 66.56-8.533 29.014c-0.853 9.386 4.267 17.92 12.8 19.626l81.067 5.974c5.973 0.853 11.093-3.414 11.946-9.387 0.854-4.267-1.706-8.533-5.12-10.24z m41.814-407.893c0.853-3.414 0.853-7.68 0-11.947-4.267-12.8-5.12-26.453-2.56-40.107v-1.706c0.853-5.974-0.854-11.947-5.12-15.36-5.12-4.267-12.8 0-12.8 7.68v55.466l17.92 15.36 2.56-9.386z"></path><path d="M238.08 394.24c2.56 2.56 6.827 3.413 9.387 0.853 2.56-2.56 3.413-5.973 2.56-10.24l-2.56-7.68c-1.707-4.266 0-9.386 4.266-11.946l2.56-1.707c0.854-0.853 2.56-1.707 5.12-0.853l7.68 2.56 4.267 36.693 116.907 38.4c1.706 0.853 3.413 0.853 5.12 0.853l78.506 5.974c4.267 0 7.68 5.12 7.68 10.24l-2.56 71.68H624.64l32.427-48.64c2.56-3.414 5.973-5.974 9.386-5.974l95.574-5.12c5.12 0 9.386-2.56 13.653-5.973l82.773-71.68-37.546-33.28-54.614 37.547c-5.12 3.413-11.946 4.266-17.92 1.706L701.44 376.32c-17.92-11.947-36.693-21.333-57.173-26.453l-75.094-18.774c-21.333-5.12-43.52-5.12-64.853 0.854l-17.92 5.12-90.453 23.04c-5.974 1.706-12.8 1.706-18.774 0l-115.2-34.134c-3.413-0.853-5.973-0.853-9.386 0.854l-7.68 5.12c-3.414 1.706-6.827 4.266-8.534 7.68l-11.946 20.48c-4.267 5.973-3.414 14.506 0.853 19.626l12.8 14.507zM540.16 252.587a52.907 52.907 0 1 0 105.813 0 52.907 52.907 0 1 0-105.813 0z"></path></svg><span class="seal-text">已参悟</span></div>`
            : `<div class="seal"><svg class="seal-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M507.489 381.1c0.197 0.049 0.42 0.148 0.667 0.172-0.247-0.024-0.482-0.123-0.667-0.173m23.236 2.472c-2.46 0-4.858-0.198-7.23-0.37 2.372 0.172 4.77 0.37 7.205 0.37h0.025z m-16.933-1.421c1.842 0.284 3.622 0.63 5.488 0.828-1.866-0.21-3.646-0.544-5.488-0.828M266.167 541.095c-0.828 0.543-1.446 1.285-2.225 1.866l-0.024 0.05c0.778-0.619 1.421-1.373 2.25-1.916m98.654 155.867c1.99-0.865 3.93-1.792 5.883-2.707-1.953 0.915-3.893 1.842-5.883 2.707m-17.6 6.39c1.965-0.507 3.93-1.162 5.945-1.83a85.516 85.516 0 0 1-5.945 1.83m-18.416 3.015a53.764 53.764 0 0 1-6.835-0.333 45.82 45.82 0 0 0 5.883 0.383c0.284-0.013 0.606-0.05 0.952-0.05m79.398-34.545c0.568-0.395 1.038-0.778 1.409-1.026-0.37 0.235-0.865 0.618-1.41 1.026m1.978-1.458l0.359-0.272-0.359 0.272m-5.129 3.67l2.077-1.47-2.077 1.47m-4.536 3.053c1.063-0.741 2.126-1.384 3.053-2.051-0.927 0.63-1.99 1.372-3.053 2.051m-12.953 8.145c1.743-1.025 3.362-2.027 4.969-2.978-1.607 0.951-3.238 1.977-4.969 2.978m-6.797 3.844c1.545-0.877 3.077-1.705 4.523-2.546a238.046 238.046 0 0 1-4.523 2.546m12.866-7.527a375.865 375.865 0 0 0 5.352-3.423c-1.657 1.063-3.436 2.224-5.352 3.423m264.088-6.538c0.952 0.692 2.04 1.409 3.176 2.188a76.864 76.864 0 0 1-3.176-2.188m18.218 11.47c1.496 0.84 3.016 1.718 4.598 2.595a442.301 442.301 0 0 1-4.598-2.595m-24.744-16.043a42.542 42.542 0 0 1-0.692-0.556l-101.2-56.286 101.2 56.286 0.692 0.556m2.88 2.064c0.717 0.482 1.421 1.014 2.299 1.594-0.828-0.58-1.607-1.137-2.3-1.594m-2.582-1.866c0.408 0.296 0.976 0.741 1.668 1.236l-1.668-1.236m87.864 35.385a46.311 46.311 0 0 1-6.872 0.334l0.964 0.025a40.663 40.663 0 0 0 5.908-0.359m-22.519-1.928c1.718 0.42 3.436 0.791 5.166 1.174-1.718-0.383-3.448-0.754-5.166-1.174m-26.24-9.838c1.966 0.915 3.93 1.854 5.945 2.731-2.002-0.877-3.98-1.816-5.945-2.731" fill="#4C545E"></path><path d="M513.372 392.112c61.7 0 111.793-50.687 111.756-113.153 0-62.428-50.106-113.09-111.78-113.09-61.799 0.05-111.917 50.687-111.892 113.14 0.012 62.465 50.118 113.103 111.916 113.103M776.36 700.57a64.22 64.22 0 0 1-24.2 31.752c-10.11 7.131-22.272 10.703-36.053 10.703-40.391 0-87.568-33.074-98.247-40.997l-84.107-46.769a42.183 42.183 0 0 0-40.886 0l-84.12 46.77c-10.678 7.934-57.842 40.996-98.246 40.996-13.78 0-25.943-3.572-36.078-10.703a64.505 64.505 0 0 1-24.175-31.752c-30.911 15.214-44.989 42.715-44.544 67.162 0.568 30.701 23.557 65.605 73.614 74.38l183.108 32.246a51.861 51.861 0 0 0 33.989-5.611c-2.485-34.755-41.974-62.503-90.325-62.503-7.761 0-14.04-6.303-14.04-14.065 0-7.675 6.279-14.003 14.04-14.003 62.342 0 113.437 38.302 118.158 86.764a52.182 52.182 0 0 0 39.971 9.406l183.034-32.246c50.069-8.776 73.045-43.667 73.639-74.38 0.47-24.435-13.596-51.936-44.532-67.15" fill="#4C545E"></path><path d="M744.237 631.27s-40.688-139.849-82.945-198.384c-12.211-16.908-38.612-28.921-70.907-36.065a137.6 137.6 0 0 1-77.025 23.36c-28.428 0-54.84-8.677-76.94-23.385-32.394 7.131-58.856 19.157-71.104 36.09-42.282 58.523-82.92 198.384-82.92 198.384s-24.386 55.322 8.12 78.051c32.518 22.742 102.955-30.899 102.955-30.899l99.396-55.297a41.998 41.998 0 0 1 40.886 0l99.408 55.297s70.388 53.641 102.931 30.9c32.506-22.73 8.145-78.052 8.145-78.052z m-103.4-37.425a12.792 12.792 0 0 1-17.65 4.042c-0.531-0.309-53.01-33.16-65.728-40.638-10.827-6.34-18.354-21.074-27.81-41.22-2.706-5.796-6.426-13.731-8.046-15.647-2.039-1.298-10.332-1.014-12.693 0.853-2.015 2.274-8.07 13.979-12.088 21.703-7.836 15.091-13.31 25.436-18.267 31.11-9.035 10.357-55.964 36.707-75.765 47.56a12.78 12.78 0 0 1-17.39-5.068 12.792 12.792 0 0 1 5.093-17.378c29.205-16.055 63.812-36.67 68.756-41.985 3.275-3.758 9.95-16.612 14.82-26.005 7.872-15.215 12.557-24.052 17.105-28.44 6.155-5.97 16.389-9.22 27.389-8.627 9.702 0.507 17.773 3.98 22.667 9.814 3.77 4.486 7.219 11.878 11.619 21.234 4.128 8.812 12.742 27.179 17.55 29.997 13.064 7.663 64.196 39.686 66.371 41.034 6.007 3.757 7.812 11.655 4.067 17.661z" fill="#4C545E"></path></svg><span class="seal-text">待参悟</span></div>`;
        let cornerHtml = `
            <span class="corner corner-tl"></span>
            <span class="corner corner-tr"></span>
            <span class="corner corner-bl"></span>
            <span class="corner corner-br"></span>
        `;
        let fragmentBadge = '';  // 残卷卡片不再显示“碎片”字样

        html += `<div class="${cls}" onclick="openCardModal('${item.id}')">
                    ${cornerHtml}
                    <div class="cname">${item.name}</div>
                    ${sealHtml}
                    <div class="category-bar"></div>
                </div>`;
    });
    grid.innerHTML = html;
    updateCardStatus();
}

// 更新统计
function updateCardStatus() {
    const total = getTotalCards();
    const collected = getCollectedCards();
    document.getElementById('cardCollectStatus').textContent = `已参悟秘籍：${collected} / ${total} 本`;
    const cc = document.getElementById('cardCount');
    if (cc) cc.textContent = collected;
    const ct = document.getElementById('cardTotal');
    if (ct) ct.textContent = total;
    const fragmentGroups = CARD_DATA.filter(item => item.type === 'group');
    const totalGroups = fragmentGroups.length;
    const collectedGroups = fragmentGroups.filter(g => g.fragments.every(f => G.collected.includes(f.id))).length;
    const fragmentGroupTotal = document.getElementById('fragmentGroupTotal');
    const fragmentGroupCount = document.getElementById('fragmentGroupCount');
    if (fragmentGroupTotal) fragmentGroupTotal.textContent = totalGroups;
    if (fragmentGroupCount) fragmentGroupCount.textContent = collectedGroups;
    updateMainUI();
}

// 打开模态框
function openCardModal(cardId) {
    if (isInCooldown()) {
        showCooldown(getCooldownRemaining());
        return;
    }
    const item = CARD_DATA.find(c => c.id === cardId);
    if (!item) return;

    const modal = document.getElementById('cardModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('cardModalBody');
    // 恢复 × 关闭按钮（修炼完成提示时会隐藏它）
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) closeBtn.style.display = '';

    title.textContent = item.name;
    modal.classList.add('show');

    const content = modal.querySelector('.modal-content');
    content.style.animation = 'none';
    void content.offsetHeight;
    content.style.animation = 'openBook 0.5s ease';

    if (item.type === 'group') {
        let fragmentsHtml = '';
        item.fragments.forEach((frag, index) => {
            const collected = G.collected.includes(frag.id);
            const btnText = collected ? '已习得' : '修炼残页';
            const disabled = collected ? 'disabled' : '';

            // 变量列表（渲染符号用 KaTeX）
            let varsHtml = '<div class="var-list">';
            frag.variables.forEach(v => {
                // 将 symbol 放入 data-latex 属性，渲染时使用
                varsHtml += `<div class="var-item">
                                <span class="var-symbol" data-latex="${v.symbol}"></span>：
                                <span>${v.meaning}（单位：${v.units}）</span>
                            </div>`;
            });
            varsHtml += '</div>';

            let variantsHtml = '';
            if (frag.variants && frag.variants.length) {
                variantsHtml = '<div style="margin-top:8px;"><strong>变形：</strong>';
                frag.variants.forEach(v => {
                    variantsHtml += `<div class="variant-item">
                                        <span class="var-label">${v.label}：</span>
                                        <span id="frag-var-${frag.id}-${v.label}"></span>
                                    </div>`;
                });
                variantsHtml += '</div>';
            }

            fragmentsHtml += `
                        <div class="fragment-item">
                            <div class="frag-info">
                                <div class="frag-name">${frag.name}</div>
                                <div class="formula-display" id="frag-formula-${frag.id}"></div>
                                ${varsHtml}
                                ${variantsHtml}
                            </div>
                            <div class="frag-btn">
                                <button class="btn-primary btn-sm" ${disabled} onclick="startFragmentQuiz('${item.id}', ${index})">${btnText}</button>
                            </div>
                        </div>
                    `;
        });

        body.innerHTML = `
                    <div class="study-box">
                        <p style="margin-bottom:8px;"><strong>本秘籍包含 ${item.fragments.length} 块残页，全部收集即可修复完整心法。</strong></p>
                    </div>
                    <div class="fragment-list">${fragmentsHtml}</div>
                `;

        // 渲染 KaTeX
        setTimeout(() => {
            // 渲染碎片公式和变形
            item.fragments.forEach(frag => {
                const formulaEl = document.getElementById(`frag-formula-${frag.id}`);
                if (formulaEl) renderDisplayKatex(formulaEl, frag.formula);
                if (frag.variants) {
                    frag.variants.forEach(v => {
                        const el = document.getElementById(`frag-var-${frag.id}-${v.label}`);
                        if (el) renderDisplayKatex(el, v.latex);
                    });
                }
            });
            // 渲染变量符号（所有 .var-symbol）
            document.querySelectorAll('.var-symbol').forEach(el => {
                const latex = el.dataset.latex;
                if (latex) renderKatex(el, latex);
            });
        }, 50);

    } else {
        // 完整卡片
        let varsHtml = '<div class="var-list">';
        item.variables.forEach(v => {
            varsHtml += `<div class="var-item">
                            <span class="var-symbol" data-latex="${v.symbol}"></span>：
                            <span>${v.meaning}（单位：${v.units}）</span>
                        </div>`;
        });
        varsHtml += '</div>';

        let variantsHtml = '';
        if (item.variants && item.variants.length) {
            variantsHtml = '<div style="margin-top:12px;"><strong>变形：</strong>';
            item.variants.forEach(v => {
                variantsHtml += `<div class="variant-item">
                                    <span class="var-label">${v.label}：</span>
                                    <span id="var-${v.label}"></span>
                                </div>`;
            });
            variantsHtml += '</div>';
        }

        const collected = G.collected.includes(item.id);
        const btnText = collected ? '已习得' : '开始修炼秘籍';
        const disabled = collected ? 'disabled' : '';

        body.innerHTML = `
                    <div class="study-box">
                        <div class="formula-display" id="modalFormula"></div>
                        ${varsHtml}
                        ${variantsHtml}
                        <div style="margin-top:16px;">
                            <button class="btn-primary" ${disabled} onclick="startFullCardQuiz('${item.id}')">${btnText}</button>
                        </div>
                    </div>
                `;

        setTimeout(() => {
            // 渲染主公式和变形公式
            const formulaEl = document.getElementById('modalFormula');
            if (formulaEl) renderDisplayKatex(formulaEl, item.formula);
            if (item.variants) {
                item.variants.forEach(v => {
                    const el = document.getElementById(`var-${v.label}`);
                    if (el) renderDisplayKatex(el, v.latex);
                });
            }
            // 渲染变量符号
            document.querySelectorAll('.var-symbol').forEach(el => {
                const latex = el.dataset.latex;
                if (latex) renderKatex(el, latex);
            });
        }, 50);
    }
}

function closeCardModal() {
    document.getElementById('cardModal').classList.remove('show');
    currentCardId = null;
    currentFragments = null;
    currentFragmentIndex = -1;
    currentQuestions = [];
    currentQuestionIndex = 0;
}

// ================================================================
// 答题状态
// ================================================================
let currentCardId = null;
let currentFragments = null;
let currentFragmentIndex = -1;
let currentQuestions = [];
let currentQuestionIndex = 0;

function startFullCardQuiz(cardId) {
    if (isInCooldown()) {
        showCooldown(getCooldownRemaining());
        return;
    }
    const card = CARD_DATA.find(c => c.id === cardId);
    if (!card || card.type !== 'full') return;
    if (G.collected.includes(cardId)) {
        showGameModal({ icon: '📖', title: '已修炼过', desc: '这本秘籍已经修炼过了！' });
        return;
    }
    currentCardId = cardId;
    currentFragments = null;
    currentFragmentIndex = -1;
    currentQuestions = shuffleArray([...card.questions]);
    currentQuestionIndex = 0;
    renderQuizQuestion(card, null);
}

function startFragmentQuiz(groupId, fragmentIndex) {
    if (isInCooldown()) {
        showCooldown(getCooldownRemaining());
        return;
    }
    const group = CARD_DATA.find(c => c.id === groupId);
    if (!group || group.type !== 'group') return;
    const frag = group.fragments[fragmentIndex];
    if (!frag) return;
    if (G.collected.includes(frag.id)) {
        showGameModal({ icon: '📜', title: '已修炼过', desc: '这块残页已经修炼了！' });
        return;
    }
    currentCardId = frag.id;
    currentFragments = group.fragments;
    currentFragmentIndex = fragmentIndex;
    currentQuestions = shuffleArray([...frag.questions]);
    currentQuestionIndex = 0;
    renderQuizQuestion(frag, group);
}

// 根据 cardId 查找卡片及其所属碎片组（兼容完整卡片与碎片残页）
function findCardById(cardId) {
    for (let item of CARD_DATA) {
        if (item.type === 'group') {
            const frag = item.fragments.find(f => f.id === cardId);
            if (frag) return { card: frag, group: item };
        } else {
            if (item.id === cardId) return { card: item, group: null };
        }
    }
    return null;
}

function renderQuizQuestion(card, group) {
    if (currentQuestionIndex >= currentQuestions.length) {
        collectSingleCard(card.id);
        return;
    }
    const q = currentQuestions[currentQuestionIndex];
    // 空括号加宽且不换行（（ ） → 用不换行 span 加宽空白）
    const qText = String(q.q).replace(/（\s*）|\(\s*\)/g, '<span class="q-blank">（　　　　）</span>');
    let html = `
                <div class="question-area">
                    <div class="q-text">${qText}</div>
                    <div class="options" id="quizOptions">
                        ${q.opts.map((opt, i) => `
                            <div class="opt" onclick="selectQuizOption(${i})">${opt}</div>
                        `).join('')}
                    </div>
                    <div id="quizFeedback" class="feedback-msg hidden"></div>
                </div>
            `;
    const body = document.getElementById('cardModalBody');
    body.innerHTML = html;
}

function selectQuizOption(idx) {
    if (isInCooldown()) {
        showCooldown(getCooldownRemaining());
        return;
    }
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    const opts = document.querySelectorAll('#quizOptions .opt');
    opts.forEach((el, i) => {
        el.classList.add('disabled');
        if (i === q.ans) el.classList.add('show-correct');
        if (i === idx && idx !== q.ans) el.classList.add('selected-wrong');
        if (i === idx && idx === q.ans) el.classList.add('selected-correct');
    });

    const fb = document.getElementById('quizFeedback');
    fb.classList.remove('hidden', 'success', 'error');

    if (idx === q.ans) {
        fb.className = 'feedback-msg success';
        fb.innerHTML = '<span class="fb-correct-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M823.695572 105.813237C770.817591 65.206355 710.245223 35.193354 644.489199 17.574079 371.423662-55.59361 90.746187 106.45561 17.578484 379.521142-55.589201 652.586675 106.460024 933.264157 379.525561 1006.431846 652.59108 1079.599534 933.268573 917.550315 1006.436258 644.484783 1024.055543 578.728753 1028.349689 511.265049 1019.622098 445.167928 1015.229243 411.899353 1007.559025 379.171383 996.757205 347.441803 991.358423 331.583207 985.185064 315.997012 978.262782 300.74125 970.726566 284.132464 951.153176 276.777694 934.544391 284.313912 917.935606 291.850132 910.58083 311.423527 918.117046 328.032314 924.149765 341.327601 929.529269 354.909529 934.233222 368.72706 943.640847 396.361313 950.319032 424.856379 954.142656 453.813967 961.738652 511.341108 958.001273 570.057531 942.638981 627.390354 878.912289 865.221624 634.451256 1006.361267 396.619981 942.634571 158.788706 878.907873 17.649069 634.446841 81.375761 396.615571 145.102471 158.7843 389.563503 17.644657 627.394761 81.371354 684.727584 96.733637 737.446193 122.855181 783.468168 158.197081 795.043417 167.086128 806.167034 176.538199 816.80348 186.51721 830.104625 198.996223 851.003584 198.32975 863.48259 185.028598 875.961614 171.727448 875.295139 150.828495 861.993977 138.349482 849.775699 126.886409 836.995905 116.02704 823.695572 105.813237L823.695572 105.813237ZM395.061454 653.061426C407.224101 669.301138 430.540449 671.970455 446.058634 658.899722L922.681896 257.44719C937.593616 244.887276 939.500122 222.617117 926.940221 207.705398 914.380302 192.793679 892.110134 190.887165 877.198415 203.447079L400.575152 604.899611 451.572332 610.737908 295.762884 402.699264C284.075562 387.094218 261.95073 383.918272 246.345682 395.605589 230.740635 407.292906 227.564683 429.417736 239.252005 445.02278L395.061454 653.061426 395.061454 653.061426Z" fill="#089e12"/></svg></span> 回答正确！';
        playSfx('correct');
        setTimeout(() => {
            currentQuestionIndex++;
            const found = findCardById(currentCardId);
            if (found) renderQuizQuestion(found.card, found.group);
        }, 800);
    } else {
        fb.className = 'feedback-msg error';
        fb.innerHTML = '<span class="fb-error-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M331.274 684.336c8.978 8.977 23.545 8.977 32.523 0l148.966-148.991 148.992 148.991c8.978 8.977 23.521 8.977 32.5 0 8.978-8.979 9.001-23.522 0-32.501L545.287 502.844l148.969-148.969c8.978-8.976 8.978-23.522 0-32.5-8.979-8.978-23.522-9-32.5 0l-148.992 148.97L363.797 321.354c-8.979-8.957-23.501-8.957-32.479 0-8.978 8.978-8.978 23.545 0 32.521l148.946 148.969L331.274 651.835C322.316 660.813 322.316 675.357 331.274 684.336zM949.233 510.295c0-241.061-195.408-436.468-436.47-436.468-241.061 0-436.468 195.407-436.468 436.468s195.407 436.469 436.468 436.469c98.961 0 189.572-33.667 262.79-89.153 3.006-3.409 4.983-7.766 4.983-12.658 0-10.683-8.666-19.348-19.35-19.348-5.544 0-10.482 2.2-14.006 5.927l-0.246 0c-65.519 48.211-146.164 77.075-233.743 77.075-218.282 0-395.261-177.004-395.261-395.26 0-218.302 176.979-395.258 395.261-395.258 218.3 0 395.258 176.956 395.258 395.258 0 66.664-15.645 129.421-44.821 184.545l0 0.314c-0.54 1.842-1.123 3.636-1.123 5.61 0 10.684 8.664 19.349 19.347 19.349 8.328 0 15.286-5.343 18.001-12.704l0 0.136C930.941 650.533 949.233 582.568 949.233 510.295z" fill="#d4490b"/></svg></span> 心法参悟有误，走火入魔！';
        playSfx('wrong');
        // 答错即关闭修炼界面，回到藏经阁主页面，弹出自习修炼提示（弹窗置于页面之上）
        setTimeout(() => {
            closeCardModal();
            renderCardGrid();
            startCooldown(60, '走火入魔', '心法参悟有误，走火入魔！需静坐调息 1 分钟，方可再行修炼。');
        }, 700);
    }
}

function collectSingleCard(cardId) {
    if (G.collected.includes(cardId)) {
        closeCardModal();
        return;
    }
    G.collected.push(cardId);

    let cardName = '';
    let isFragment = false;
    let isGroup = false;
    let groupId = '';
    let groupName = '';
    let gainedStars = 0;   // 本次习得获得的星（普通心法 +2，碎片组集齐 +4）
    for (let item of CARD_DATA) {
        if (item.type === 'group') {
            const frag = item.fragments.find(f => f.id === cardId);
            if (frag) {
                cardName = frag.name;
                isFragment = true;
                groupId = item.id;
                groupName = item.name;
                const allCollected = item.fragments.every(f => G.collected.includes(f.id));
                if (allCollected) {
                    isGroup = true;
                    gainedStars = 4;   // 碎片组集齐得 4 星
                }
                break;
            }
        } else {
            if (item.id === cardId) {
                cardName = item.name;
                gainedStars = 2;   // 普通心法得 2 星
                break;
            }
        }
    }

    if (gainedStars > 0) {
        G.totalStars = (G.totalStars || 0) + gainedStars;
        playSfx('collect');
    }
    saveState();
    updateCardStatus();

    const body = document.getElementById('cardModalBody');
    let msg = '';
    let backAction = 'closeCardModal();renderCardGrid();';
    let backText = '返回藏经阁';
    if (isFragment && !isGroup) {
        // 碎片尚未集齐：提示获得碎片，返回该心法继续获取其他碎片
        msg = `<span class="collect-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M888 803.2l68-68c6.4-6.4 6.4-17.6 0-24-3.2-3.2-7.2-4.8-12-4.8h-108.8v-51.2c0-9.6-8-16.8-16.8-16.8h-23.2c-12-38.4-41.6-68.8-79.2-83.2 37.6-35.2 38.4-94.4 3.2-132-24-24.8-60-35.2-93.6-25.6-18.4-63.2-84-99.2-147.2-80.8-38.4 11.2-68.8 41.6-80 80.8-49.6-14.4-101.6 14.4-116 64-2.4 8.8-4 16.8-4 25.6 0 25.6 10.4 49.6 28.8 67.2-38.4 14.4-67.2 44.8-80 84h-24c-9.6 0-16.8 8-16.8 16.8v51.2H79.2c-9.6 0.8-16.8 8-16 17.6 0 4 1.6 8 4.8 11.2l68 68-68.8 68.8c-6.4 6.4-6.4 17.6 0 24 3.2 3.2 8 4.8 12 4.8h239.2c9.6 0 16.8-8 16.8-16.8v-51.2h352v51.2c0 9.6 8 16.8 16.8 16.8h239.2c9.6 0.8 17.6-6.4 18.4-16 0-5.6-2.4-11.2-6.4-14.4l-67.2-67.2zM758.4 638.4h-65.6c-4.8-20.8-14.4-40.8-27.2-57.6h4c38.4 0 72.8 22.4 88.8 57.6zM630.4 432c6.4-2.4 13.6-4 20.8-4 32.8 0.8 58.4 28 57.6 60.8-0.8 32.8-28 58.4-60.8 57.6-22.4-0.8-42.4-13.6-52-34.4 21.6-21.6 33.6-49.6 34.4-80z m-25.6 136.8c25.6 16 44.8 40.8 53.6 69.6H547.2l57.6-69.6z m-93.6 59.2l-61.6-73.6c12-4 24.8-5.6 37.6-5.6H536c12 0 24.8 1.6 36 4.8l-60.8 74.4z m0-281.6c47.2-0.8 85.6 37.6 86.4 84.8 0.8 47.2-37.6 85.6-84.8 86.4S427.2 480 426.4 432.8V432c0-47.2 38.4-85.6 84.8-85.6z m-36.8 292H364.8c8.8-28 27.2-52 52-68l57.6 68zM372 428c7.2 0 14.4 1.6 20.8 4 0.8 29.6 12 58.4 32.8 80-13.6 29.6-48.8 42.4-78.4 28.8-29.6-13.6-42.4-48.8-28.8-78.4 9.6-20.8 30.4-34.4 53.6-34.4z m-19.2 152.8h4c-12.8 16.8-21.6 36.8-27.2 57.6H264c16-35.2 50.4-57.6 88.8-57.6zM120 865.6l51.2-51.2c6.4-6.4 6.4-17.6 0-24L120 739.2h67.2v73.6c0 5.6 3.2 11.2 8 14.4L256 864l-136 1.6z m180.8-12.8l-35.2-20.8h35.2v20.8z m-80-55.2V672h580v124.8H220.8z m500.8 55.2V832h35.2l-35.2 20.8z m44.8 12.8l60.8-36.8c4.8-3.2 8-8.8 8-14.4v-74.4h67.2l-51.2 51.2c-6.4 6.4-6.4 17.6 0 24l51.2 51.2-136-0.8z" fill="#df7a0c"/><path d="M670.4 717.6H352c-9.6 0-16.8 8-16.8 16.8 0 9.6 8 16.8 16.8 16.8h318.4c9.6 0 16.8-8 16.8-16.8s-7.2-16.8-16.8-16.8zM504.8 191.2c9.6 0 16.8-8 16.8-16.8v-34.4c0-9.6-8-16.8-16.8-16.8-9.6 0-16.8 8-16.8 16.8v34.4c0 8.8 8 16.8 16.8 16.8z m-142.4 25.6c4 8 14.4 11.2 23.2 7.2 8-4 11.2-14.4 7.2-23.2 0-0.8-0.8-0.8-0.8-1.6l-16.8-29.6c-4.8-8-16-10.4-23.2-5.6-7.2 4.8-10.4 14.4-5.6 22.4l16 30.4zM244.8 300l29.6 16.8c8 4.8 18.4 2.4 23.2-6.4 4.8-8 1.6-18.4-6.4-23.2l-29.6-16.8c-8-4.8-18.4-1.6-23.2 6.4-4.8 8-1.6 18.4 6.4 23.2z m380-76.8c8 4.8 18.4 1.6 23.2-6.4l16.8-29.6c4-8 0.8-18.4-7.2-23.2-8-4-17.6-1.6-22.4 5.6l-16.8 29.6c-4.8 8.8-2.4 19.2 6.4 24zM736 316.8l29.6-16.8c8-4.8 11.2-15.2 6.4-23.2-4.8-8-15.2-11.2-23.2-6.4l-29.6 16.8c-8 4-11.2 14.4-7.2 23.2 4 8 14.4 11.2 23.2 7.2l0.8-0.8z" fill="#df7a0c"/></svg></span> 恭喜获得「${groupName}」之「${cardName}」碎片！\n（集齐全部残页可习得完整心法，获 4 星）`;
        backAction = `closeCardModal();openCardModal('${groupId}');`;
        backText = `返回${groupName} · 继续获取碎片`;
    } else if (isGroup) {
        msg = `<span class="collect-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M888 803.2l68-68c6.4-6.4 6.4-17.6 0-24-3.2-3.2-7.2-4.8-12-4.8h-108.8v-51.2c0-9.6-8-16.8-16.8-16.8h-23.2c-12-38.4-41.6-68.8-79.2-83.2 37.6-35.2 38.4-94.4 3.2-132-24-24.8-60-35.2-93.6-25.6-18.4-63.2-84-99.2-147.2-80.8-38.4 11.2-68.8 41.6-80 80.8-49.6-14.4-101.6 14.4-116 64-2.4 8.8-4 16.8-4 25.6 0 25.6 10.4 49.6 28.8 67.2-38.4 14.4-67.2 44.8-80 84h-24c-9.6 0-16.8 8-16.8 16.8v51.2H79.2c-9.6 0.8-16.8 8-16 17.6 0 4 1.6 8 4.8 11.2l68 68-68.8 68.8c-6.4 6.4-6.4 17.6 0 24 3.2 3.2 8 4.8 12 4.8h239.2c9.6 0 16.8-8 16.8-16.8v-51.2h352v51.2c0 9.6 8 16.8 16.8 16.8h239.2c9.6 0.8 17.6-6.4 18.4-16 0-5.6-2.4-11.2-6.4-14.4l-67.2-67.2zM758.4 638.4h-65.6c-4.8-20.8-14.4-40.8-27.2-57.6h4c38.4 0 72.8 22.4 88.8 57.6zM630.4 432c6.4-2.4 13.6-4 20.8-4 32.8 0.8 58.4 28 57.6 60.8-0.8 32.8-28 58.4-60.8 57.6-22.4-0.8-42.4-13.6-52-34.4 21.6-21.6 33.6-49.6 34.4-80z m-25.6 136.8c25.6 16 44.8 40.8 53.6 69.6H547.2l57.6-69.6z m-93.6 59.2l-61.6-73.6c12-4 24.8-5.6 37.6-5.6H536c12 0 24.8 1.6 36 4.8l-60.8 74.4z m0-281.6c47.2-0.8 85.6 37.6 86.4 84.8 0.8 47.2-37.6 85.6-84.8 86.4S427.2 480 426.4 432.8V432c0-47.2 38.4-85.6 84.8-85.6z m-36.8 292H364.8c8.8-28 27.2-52 52-68l57.6 68zM372 428c7.2 0 14.4 1.6 20.8 4 0.8 29.6 12 58.4 32.8 80-13.6 29.6-48.8 42.4-78.4 28.8-29.6-13.6-42.4-48.8-28.8-78.4 9.6-20.8 30.4-34.4 53.6-34.4z m-19.2 152.8h4c-12.8 16.8-21.6 36.8-27.2 57.6H264c16-35.2 50.4-57.6 88.8-57.6zM120 865.6l51.2-51.2c6.4-6.4 6.4-17.6 0-24L120 739.2h67.2v73.6c0 5.6 3.2 11.2 8 14.4L256 864l-136 1.6z m180.8-12.8l-35.2-20.8h35.2v20.8z m-80-55.2V672h580v124.8H220.8z m500.8 55.2V832h35.2l-35.2 20.8z m44.8 12.8l60.8-36.8c4.8-3.2 8-8.8 8-14.4v-74.4h67.2l-51.2 51.2c-6.4 6.4-6.4 17.6 0 24l51.2 51.2-136-0.8z" fill="#df7a0c"/><path d="M670.4 717.6H352c-9.6 0-16.8 8-16.8 16.8 0 9.6 8 16.8 16.8 16.8h318.4c9.6 0 16.8-8 16.8-16.8s-7.2-16.8-16.8-16.8zM504.8 191.2c9.6 0 16.8-8 16.8-16.8v-34.4c0-9.6-8-16.8-16.8-16.8-9.6 0-16.8 8-16.8 16.8v34.4c0 8.8 8 16.8 16.8 16.8z m-142.4 25.6c4 8 14.4 11.2 23.2 7.2 8-4 11.2-14.4 7.2-23.2 0-0.8-0.8-0.8-0.8-1.6l-16.8-29.6c-4.8-8-16-10.4-23.2-5.6-7.2 4.8-10.4 14.4-5.6 22.4l16 30.4zM244.8 300l29.6 16.8c8 4.8 18.4 2.4 23.2-6.4 4.8-8 1.6-18.4-6.4-23.2l-29.6-16.8c-8-4.8-18.4-1.6-23.2 6.4-4.8 8-1.6 18.4 6.4 23.2z m380-76.8c8 4.8 18.4 1.6 23.2-6.4l16.8-29.6c4-8 0.8-18.4-7.2-23.2-8-4-17.6-1.6-22.4 5.6l-16.8 29.6c-4.8 8.8-2.4 19.2 6.4 24zM736 316.8l29.6-16.8c8-4.8 11.2-15.2 6.4-23.2-4.8-8-15.2-11.2-23.2-6.4l-29.6 16.8c-8 4-11.2 14.4-7.2 23.2 4 8 14.4 11.2 23.2 7.2l0.8-0.8z" fill="#df7a0c"/></svg></span> 恭喜少侠成功修复「${groupName}」残卷！合成完整心法！\n${getStarIcon(18)} 获得 4 星 · 当前内力值${G.totalStars}`;
    } else {
        msg = `<span class="collect-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M888 803.2l68-68c6.4-6.4 6.4-17.6 0-24-3.2-3.2-7.2-4.8-12-4.8h-108.8v-51.2c0-9.6-8-16.8-16.8-16.8h-23.2c-12-38.4-41.6-68.8-79.2-83.2 37.6-35.2 38.4-94.4 3.2-132-24-24.8-60-35.2-93.6-25.6-18.4-63.2-84-99.2-147.2-80.8-38.4 11.2-68.8 41.6-80 80.8-49.6-14.4-101.6 14.4-116 64-2.4 8.8-4 16.8-4 25.6 0 25.6 10.4 49.6 28.8 67.2-38.4 14.4-67.2 44.8-80 84h-24c-9.6 0-16.8 8-16.8 16.8v51.2H79.2c-9.6 0.8-16.8 8-16 17.6 0 4 1.6 8 4.8 11.2l68 68-68.8 68.8c-6.4 6.4-6.4 17.6 0 24 3.2 3.2 8 4.8 12 4.8h239.2c9.6 0 16.8-8 16.8-16.8v-51.2h352v51.2c0 9.6 8 16.8 16.8 16.8h239.2c9.6 0.8 17.6-6.4 18.4-16 0-5.6-2.4-11.2-6.4-14.4l-67.2-67.2zM758.4 638.4h-65.6c-4.8-20.8-14.4-40.8-27.2-57.6h4c38.4 0 72.8 22.4 88.8 57.6zM630.4 432c6.4-2.4 13.6-4 20.8-4 32.8 0.8 58.4 28 57.6 60.8-0.8 32.8-28 58.4-60.8 57.6-22.4-0.8-42.4-13.6-52-34.4 21.6-21.6 33.6-49.6 34.4-80z m-25.6 136.8c25.6 16 44.8 40.8 53.6 69.6H547.2l57.6-69.6z m-93.6 59.2l-61.6-73.6c12-4 24.8-5.6 37.6-5.6H536c12 0 24.8 1.6 36 4.8l-60.8 74.4z m0-281.6c47.2-0.8 85.6 37.6 86.4 84.8 0.8 47.2-37.6 85.6-84.8 86.4S427.2 480 426.4 432.8V432c0-47.2 38.4-85.6 84.8-85.6z m-36.8 292H364.8c8.8-28 27.2-52 52-68l57.6 68zM372 428c7.2 0 14.4 1.6 20.8 4 0.8 29.6 12 58.4 32.8 80-13.6 29.6-48.8 42.4-78.4 28.8-29.6-13.6-42.4-48.8-28.8-78.4 9.6-20.8 30.4-34.4 53.6-34.4z m-19.2 152.8h4c-12.8 16.8-21.6 36.8-27.2 57.6H264c16-35.2 50.4-57.6 88.8-57.6zM120 865.6l51.2-51.2c6.4-6.4 6.4-17.6 0-24L120 739.2h67.2v73.6c0 5.6 3.2 11.2 8 14.4L256 864l-136 1.6z m180.8-12.8l-35.2-20.8h35.2v20.8z m-80-55.2V672h580v124.8H220.8z m500.8 55.2V832h35.2l-35.2 20.8z m44.8 12.8l60.8-36.8c4.8-3.2 8-8.8 8-14.4v-74.4h67.2l-51.2 51.2c-6.4 6.4-6.4 17.6 0 24l51.2 51.2-136-0.8z" fill="#df7a0c"/><path d="M670.4 717.6H352c-9.6 0-16.8 8-16.8 16.8 0 9.6 8 16.8 16.8 16.8h318.4c9.6 0 16.8-8 16.8-16.8s-7.2-16.8-16.8-16.8zM504.8 191.2c9.6 0 16.8-8 16.8-16.8v-34.4c0-9.6-8-16.8-16.8-16.8-9.6 0-16.8 8-16.8 16.8v34.4c0 8.8 8 16.8 16.8 16.8z m-142.4 25.6c4 8 14.4 11.2 23.2 7.2 8-4 11.2-14.4 7.2-23.2 0-0.8-0.8-0.8-0.8-1.6l-16.8-29.6c-4.8-8-16-10.4-23.2-5.6-7.2 4.8-10.4 14.4-5.6 22.4l16 30.4zM244.8 300l29.6 16.8c8 4.8 18.4 2.4 23.2-6.4 4.8-8 1.6-18.4-6.4-23.2l-29.6-16.8c-8-4.8-18.4-1.6-23.2 6.4-4.8 8-1.6 18.4 6.4 23.2z m380-76.8c8 4.8 18.4 1.6 23.2-6.4l16.8-29.6c4-8 0.8-18.4-7.2-23.2-8-4-17.6-1.6-22.4 5.6l-16.8 29.6c-4.8 8.8-2.4 19.2 6.4 24zM736 316.8l29.6-16.8c8-4.8 11.2-15.2 6.4-23.2-4.8-8-15.2-11.2-23.2-6.4l-29.6 16.8c-8 4-11.2 14.4-7.2 23.2 4 8 14.4 11.2 23.2 7.2l0.8-0.8z" fill="#df7a0c"/></svg></span> 恭喜少侠成功修炼「${cardName}」！\n${getStarIcon(18)} 获得 2 星 · 当前内力值${G.totalStars}`;
    }
    // 称号：仅在首次获得新段位（非初始称号）时提示祝贺并弹出晋升动画
    const newTitle = getCurrentTitle();
    G.notifiedTitles = G.notifiedTitles || [];
    let isNewTitle = false;
    if (newTitle !== '江湖菜鸟' && !G.notifiedTitles.includes(newTitle)) {
        G.notifiedTitles.push(newTitle);
        isNewTitle = true;
        saveState();
    }
    const congrats = isNewTitle ? getTitleCongrats(newTitle) : '';
    // 隐藏 × 关闭按钮（以“返回藏经阁/继续获取碎片”关闭）
    const closeBtnEl = document.querySelector('.modal-close');
    if (closeBtnEl) closeBtnEl.style.display = 'none';
    body.innerHTML = `
                <div class="study-box collect-box" style="border-left-color:var(--gold-glow);text-align:center;">
                    <h3 class="collect-msg">${msg}</h3>
                    ${congrats ? `<p class="collect-congrats">${congrats}</p>` : ''}
                    <button class="collect-btn" onclick="${backAction}">${backText}</button>
                </div>
            `;
    renderCardGrid();
    updateMainUI();
    // 段位晋升弹窗（7 秒后自动消失）
    if (isNewTitle) showTitlePopup(newTitle, congrats);

    if (getCollectedCards() === getTotalCards()) {
        // 等称号晋升仪式结束后再弹出演武场开启（避免互相覆盖），若本段位已看过则稍后即弹
        const unlockDelay = isNewTitle ? 7000 : 800;
        setTimeout(() => {
            updateMainUI();
            showUnlockPopup({
                image: 'arena.png',
                title: '演武场 · 已开启',
                desc: '恭喜集齐全部秘籍！演武场已开放，大侠可前往比武闯关。'
            });
        }, unlockDelay);
    }
}

function showCardCollection() {
    showPage('pageCards');
    renderCardGrid();
}

// 暴露全局
window.CARD_DATA = CARD_DATA;
window.showCardCollection = showCardCollection;
window.renderCardGrid = renderCardGrid;
window.openCardModal = openCardModal;
window.closeCardModal = closeCardModal;
window.startFullCardQuiz = startFullCardQuiz;
window.startFragmentQuiz = startFragmentQuiz;
window.selectQuizOption = selectQuizOption;
window.collectSingleCard = collectSingleCard;
window.updateCardStatus = updateCardStatus;