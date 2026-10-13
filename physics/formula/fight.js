// ================================================================
// fight.js — 百草园练功房逻辑
// ================================================================

let fightQuestions = [];          // 当前抽取的10题
let fightIndex = 0;              // 当前题目索引
let fightAnswers = [];           // 每道题是否答对 (boolean)
let fightAnswered = false;       // 当前题目是否已答
let fightPracticeCount = {};     // 每道题的练习次数 { id: count }

// ----- 加载练习状态 -----
function loadFightPractice() {
    const raw = localStorage.getItem('fightPractice_v1');
    if (raw) {
        try {
            fightPracticeCount = JSON.parse(raw);
            return;
        } catch (e) {}
    }
    fightPracticeCount = {};
}

function saveFightPractice() {
    localStorage.setItem('fightPractice_v1', JSON.stringify(fightPracticeCount));
}

// ----- 进入百草园 -----
function enterFight() {
    loadFightPractice();
    const allData = window.FIGHT_DATA || [];
    if (allData.length === 0) {
        showGameModal({ icon: '⚠️', title: '数据未加载', desc: '题库数据未加载，请刷新页面。' });
        return;
    }
    // 从题库中随机抽取 10 题（不足 10 题则全取）
    const total = Math.min(10, allData.length);
    fightQuestions = shuffleArray([...allData]).slice(0, total);
    fightIndex = 0;
    fightAnswers = [];
    fightAnswered = false;
    showPage('pageFight');
    renderFightQuestion();
}

// ----- 渲染当前题目 -----
function renderFightQuestion() {
    const container = document.getElementById('fightContent');
    if (fightIndex >= fightQuestions.length) {
        // 所有题目答完，显示结果
        showFightResult();
        return;
    }
    const q = fightQuestions[fightIndex];
    const total = fightQuestions.length;
    const idx = fightIndex + 1;

    let html = `
        <div class="fight-container">
            <div class="fight-progress">
                <span>采药练功 · 单位换算</span>
                <span class="progress-text">${idx} / ${total}</span>
            </div>
            <div class="fight-question">
                <div class="q-text">${q.question}</div>
                <div class="fight-options" id="fightOptions">
                    ${q.options.map((opt, i) => `
                        <div class="fight-opt" data-optindex="${i}" onclick="selectFightOption(${i})">${opt}</div>
                    `).join('')}
                </div>
                <div id="fightFeedback" class="fight-feedback" style="display:none;"></div>
            </div>
        </div>
    `;
    container.innerHTML = html;
    fightAnswered = false;
}

// ----- 选择选项 -----
function selectFightOption(optIdx) {
    if (fightAnswered) return;
    const q = fightQuestions[fightIndex];
    const isCorrect = (optIdx === q.answer);
    // 记录练习次数
    fightPracticeCount[q.id] = (fightPracticeCount[q.id] || 0) + 1;
    saveFightPractice();

    const options = document.querySelectorAll('.fight-opt');
    options.forEach((el, i) => {
        el.classList.add('disabled');
        if (i === q.answer) el.classList.add('correct');
        if (i === optIdx && !isCorrect) el.classList.add('wrong');
    });

    const feedback = document.getElementById('fightFeedback');
    feedback.style.display = 'block';
    if (isCorrect) {
        feedback.className = 'fight-feedback success';
        feedback.innerHTML = '<span class="fight-fb-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M823.695572 105.813237C770.817591 65.206355 710.245223 35.193354 644.489199 17.574079 371.423662-55.59361 90.746187 106.45561 17.578484 379.521142-55.589201 652.586675 106.460024 933.264157 379.525561 1006.431846 652.59108 1079.599534 933.268573 917.550315 1006.436258 644.484783 1024.055543 578.728753 1028.349689 511.265049 1019.622098 445.167928 1015.229243 411.899353 1007.559025 379.171383 996.757205 347.441803 991.358423 331.583207 985.185064 315.997012 978.262782 300.74125 970.726566 284.132464 951.153176 276.777694 934.544391 284.313912 917.935606 291.850132 910.58083 311.423527 918.117046 328.032314 924.149765 341.327601 929.529269 354.909529 934.233222 368.72706 943.640847 396.361313 950.319032 424.856379 954.142656 453.813967 961.738652 511.341108 958.001273 570.057531 942.638981 627.390354 878.912289 865.221624 634.451256 1006.361267 396.619981 942.634571 158.788706 878.907873 17.649069 634.446841 81.375761 396.615571 145.102471 158.7843 389.563503 17.644657 627.394761 81.371354 684.727584 96.733637 737.446193 122.855181 783.468168 158.197081 795.043417 167.086128 806.167034 176.538199 816.80348 186.51721 830.104625 198.996223 851.003584 198.32975 863.48259 185.028598 875.961614 171.727448 875.295139 150.828495 861.993977 138.349482 849.775699 126.886409 836.995905 116.02704 823.695572 105.813237L823.695572 105.813237ZM395.061454 653.061426C407.224101 669.301138 430.540449 671.970455 446.058634 658.899722L922.681896 257.44719C937.593616 244.887276 939.500122 222.617117 926.940221 207.705398 914.380302 192.793679 892.110134 190.887165 877.198415 203.447079L400.575152 604.899611 451.572332 610.737908 295.762884 402.699264C284.075562 387.094218 261.95073 383.918272 246.345682 395.605589 230.740635 407.292906 227.564683 429.417736 239.252005 445.02278L395.061454 653.061426 395.061454 653.061426Z" fill="#089e12"/></svg></span>正确！内力值 ＋1';
        playSfx('correct');
        fightAnswers.push(true);
        // 答对 1 题得 1 星（内力累计）
        G.totalStars = (G.totalStars || 0) + 1;
        saveState();
        updateMainUI();
    } else {
        feedback.className = 'fight-feedback error';
        feedback.innerHTML = `<span class="fight-fb-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M331.274 684.336c8.978 8.977 23.545 8.977 32.523 0l148.966-148.991 148.992 148.991c8.978 8.977 23.521 8.977 32.5 0 8.978-8.979 9.001-23.522 0-32.501L545.287 502.844l148.969-148.969c8.978-8.976 8.978-23.522 0-32.5-8.979-8.978-23.522-9-32.5 0l-148.992 148.97L363.797 321.354c-8.979-8.957-23.501-8.957-32.479 0-8.978 8.978-8.978 23.545 0 32.521l148.946 148.969L331.274 651.835C322.316 660.813 322.316 675.357 331.274 684.336zM949.233 510.295c0-241.061-195.408-436.468-436.47-436.468-241.061 0-436.468 195.407-436.468 436.468s195.407 436.469 436.468 436.469c98.961 0 189.572-33.667 262.79-89.153 3.006-3.409 4.983-7.766 4.983-12.658 0-10.683-8.666-19.348-19.35-19.348-5.544 0-10.482 2.2-14.006 5.927l-0.246 0c-65.519 48.211-146.164 77.075-233.743 77.075-218.282 0-395.261-177.004-395.261-395.26 0-218.302 176.979-395.258 395.261-395.258 218.3 0 395.258 176.956 395.258 395.258 0 66.664-15.645 129.421-44.821 184.545l0 0.314c-0.54 1.842-1.123 3.636-1.123 5.61 0 10.684 8.664 19.349 19.347 19.349 8.328 0 15.286-5.343 18.001-12.704l0 0.136C930.941 650.533 949.233 582.568 949.233 510.295z" fill="#d4490b"/></svg></span>错误，正确答案是 ${q.options[q.answer]}`;
        playSfx('wrong');
        fightAnswers.push(false);
    }
    fightAnswered = true;

    // 1.2秒后自动进入下一题
    setTimeout(() => {
        fightIndex++;
        renderFightQuestion();
    }, 1200);
}

// ----- 显示结果 -----
function showFightResult() {
    const container = document.getElementById('fightContent');
    const correctCount = fightAnswers.filter(v => v === true).length;
    const total = fightAnswers.length;
    const percentage = Math.round((correctCount / total) * 100);

    // 10 题全部答对，额外奖励 5 星
    let bonus = 0;
    if (total > 0 && correctCount === total) {
        bonus = 5;
        G.totalStars = (G.totalStars || 0) + bonus;
        saveState();
        updateMainUI();
    }

    let title, desc;
    if (percentage === 100) {
        title = '炉火纯青！';
        desc = '采药练功竟无一错漏，换算功夫已入化境！额外奖励 5 星！';
    } else if (percentage >= 80) {
        title = '功力深厚！';
        desc = '这一轮采药练功收获颇丰，换算技巧已掌握大半，继续巩固！';
    } else if (percentage >= 60) {
        title = '初窥门径！';
        desc = '根基渐稳，但换算尚需勤加操练，方能炉火纯青。';
    } else {
        title = '';
        desc = '练功遇阻不必气馁，多来百草园采药锤炼，必能日益精进！';
    }

    let html = `
        <div class="fight-result">
            ${title ? `<div class="result-title">${title}</div>` : ''}
            <div class="result-score">正确 ${correctCount} / ${total}</div>
            <div class="result-desc">${desc}</div>
            <div class="result-score" style="margin-top:8px;">${getStarIcon(20)} 本轮获得 ${correctCount} 星${bonus > 0 ? ` ＋ 全对奖励 ${bonus} 星` : ''} · 当前内力值${G.totalStars}</div>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                <button class="btn-primary" onclick="enterFight()">再来一次</button>
                <button class="btn-secondary" onclick="enterMain()">返回江湖</button>
            </div>
        </div>
    `;
    container.innerHTML = html;
    // 播放通关音效（如果有）
    if (percentage >= 80) playSfx('levelup');
}

// ----- 初始化暴露 -----
window.enterFight = enterFight;
window.selectFightOption = selectFightOption;