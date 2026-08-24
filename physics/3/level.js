// ================================================================
// level.js — 演武场闯关逻辑（数据在 level-data.js 中）
// ================================================================

import { G, saveState, showPage, showGameModal, showTitlePopup, showUnlockPopup, playSfx, updateMainUI, getTitleBadge, getStarIcon, getTotalCards, getCollectedCards, isInCooldown, showCooldown, getCooldownRemaining, startCooldown } from './app.js';
import { renderDisplayKatex, shuffleArray } from './utils.js';
import { ICON_CORRECT } from './quiz-utils.js';
import { LEVEL_QUESTIONS } from './level-data.js';

const DISTRACTORS = ['v', 's', 't', 'ρ', 'm', 'V', 'G', 'g', 'p', 'F', 'S', 'W', 'P', 'Q', 'c', 'q', 'I', 'U', 'R', 'h', 'η', 'l'];

let levelQuestions = [];
let levelIndex = 0;
let levelCurrentQ = null;
let levelSlots = [];
let levelPool = [];
let levelAnswered = false;
let levelCorrect = false;
let levelInQuiz = false;   // 是否正在闯关答题（用于返回按钮判断）

// ----- 演武场地图 -----
function showLevelSelect() {
    const totalCards = getTotalCards();
    const collectedCards = getCollectedCards();
    const allCollected = collectedCards === totalCards;

    if (!allCollected) {
        showGameModal({
            icon: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M511.891284 277.124575a49.887412 49.887412 0 0 1 22.299673 5.288066l461.907551 230.978719a49.887412 49.887412 0 0 1 0 89.248581l-461.907551 230.978718a49.887412 49.887412 0 0 1-44.599346 0L27.68406 602.639941a49.887412 49.887412 0 0 1 0-89.248581l461.907551-230.978719a49.887412 49.887412 0 0 1 22.299673-5.288066z m350.359297 280.866132l-350.359297-175.154705-350.359297 175.154705 350.359297 175.154704z" fill="#ffffff"/><path d="M511.891284 69.293616a49.887412 49.887412 0 0 1 22.299673 5.288065l461.907551 230.978719a49.887412 49.887412 0 0 1 0 89.248581l-461.907551 230.978719a49.887412 49.887412 0 0 1-44.599346 0L27.68406 394.808981a49.887412 49.887412 0 0 1 0-89.248581l461.907551-230.978719a49.887412 49.887412 0 0 1 22.299673-5.288065z m350.359297 280.866131l-350.359297-175.204592-350.359297 175.204592 350.359297 175.154704z" fill="#ffffff"/><path d="M49.983734 508.103294a49.887412 49.887412 0 0 1 22.299673 5.288066l439.607877 219.803939 439.607877-219.803939a49.887412 49.887412 0 0 1 72.187086 44.599347v184.583425a49.887412 49.887412 0 0 1-27.587739 44.599347l-461.907551 230.978719a49.887412 49.887412 0 0 1-44.599346 0L27.68406 787.472803a49.887412 49.887412 0 0 1-27.587739-44.898671v-184.583425a49.887412 49.887412 0 0 1 49.887413-49.887413z m461.90755 330.753544a49.887412 49.887412 0 0 1-22.299673-5.288066L99.871146 638.70854v73.234721l412.020138 206.035013 412.020138-206.035013v-73.234721l-389.720465 194.860232a49.887412 49.887412 0 0 1-22.299673 5.288066z" fill="#ffffff"/><path d="M973.798834 607.878119a49.887412 49.887412 0 0 1-49.887412-49.887412V280.866131a49.887412 49.887412 0 0 1 99.774825 0v277.124576a49.887412 49.887412 0 0 1-49.887413 49.887412z" fill="#ffffff"/><path d="M49.983734 607.878119a49.887412 49.887412 0 0 1-49.887413-49.887412V280.866131a49.887412 49.887412 0 0 1 99.774825 0v277.124576a49.887412 49.887412 0 0 1-49.887412 49.887412z" fill="#ffffff"/><path d="M511.891284 838.80695a49.887412 49.887412 0 0 1-49.887412-49.887412v-277.124575a49.887412 49.887412 0 0 1 99.774824 0v277.124575a49.887412 49.887412 0 0 1-49.887412 49.887412z" fill="#ffffff"/><path d="M511.891284 376.8994a49.887412 49.887412 0 0 1-49.887412-49.887412V49.887412a49.887412 49.887412 0 0 1 99.774824 0v277.124576a49.887412 49.887412 0 0 1-49.887412 49.887412z" fill="#ffffff"/></svg>`,
            title: '演武场 · 尚未开启',
            desc: `演武场乃门派高手切磋之地，需先将藏经阁中全部 ${totalCards} 本秘籍尽数修炼，方可踏足！\n\n当前已习得：${collectedCards} / ${totalCards} 本`
        });
        return;
    }
    showPage('pageLevels');
    renderAdventureMap();
}

function renderAdventureMap() {
    levelInQuiz = false;   // 回到关卡地图，不再处于闯关答题
    const container = document.getElementById('levelContent');

    if (G.levelProgress >= 3) {
        container.innerHTML = `
            <div class="text-center" style="padding:40px 0;">
                <div class="title-badge-svg">${getTitleBadge('武林盟主')}</div>
                <h2 style="color:#FCD34D;">武林盟主</h2>
                <p style="color:var(--text-light);font-size:1.1rem;margin:12px 0;">
                    华山之巅，群雄俯首！你以无双武艺统御武林，<br>
                    号令天下，莫敢不从。物理江湖，唯你独尊！
                </p>
                <div style="margin:12px 0;color:var(--gold);font-size:1.05rem;">${getStarIcon(20)} 累计内力值${G.totalStars}</div>
                <button class="btn-primary" onclick="enterMain()">🗺️ 返回江湖地图</button>
            </div>
        `;
        return;
    }

    const levelConfigs = [
        { icon: '🎋', title: '竹林试炼', desc: '第1关 · 3道招式题 · 通关得 9 星', color: '#22C55E', count: 3 },
        { icon: '🏯', title: '武林擂台', desc: '第2关 · 4道招式题 · 通关得 12 星', color: '#F59E0B', count: 4 },
        { icon: '⛰️', title: '华山之巅', desc: '第3关 · 5道招式题 · 通关得 15 星', color: '#EF4444', count: 5 }
    ];
    const levelTitles = ['一代宗师', '江湖神话', '武林盟主'];

    let html = `<div class="adventure-map">`;
    for (let i = 0; i < 3; i++) {
        const done = G.levelProgress > i;
        const active = G.levelProgress === i;
        const locked = G.levelProgress < i;

        const cls = `map-node ${done ? 'done' : (active ? 'active' : 'locked')}`;
        const badgeIcon = done
            ? '<svg class="node-check" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M392.533333 806.4L85.333333 503.466667l59.733334-59.733334 247.466666 247.466667L866.133333 213.333333l59.733334 59.733334L392.533333 806.4z" fill="var(--node-color)"/></svg>'
            : (active ? '🔥' : '🔒');
        // 已通关（done）不再提供“再战一次”，仅当前关卡显示“开始挑战”
        const btnHtml = active ? `<button class="btn-primary btn-sm node-btn" onclick="startLevel(${i+1})">开始挑战</button>` : '';
        const rewardText = done ? `🏅 已获得：${levelTitles[i]}` : '';

        html += `
            <div class="${cls}" style="--node-color: ${levelConfigs[i].color}">
                <div class="node-badge">${badgeIcon}</div>
                <div class="node-icon">${levelConfigs[i].icon}</div>
                <div class="node-title">${levelConfigs[i].title}</div>
                <div class="node-desc">${levelConfigs[i].desc}</div>
                ${rewardText ? `<div class="node-reward">${rewardText}</div>` : ''}
                ${btnHtml}
            </div>
        `;

        if (i < 2) {
            const pathCls = locked ? 'locked' : 'unlocked';
            html += `<div class="map-path ${pathCls}"></div>`;
        }
    }
    html += `</div>`;
    container.innerHTML = html;
}

// ----- 开始关卡 -----
function startLevel(levelNum) {
    if (isInCooldown()) {
        showCooldown(getCooldownRemaining(), '自行修炼中', '方才招式有失，正在静坐调息。待内力恢复（1 分钟）后再战！');
        return;
    }
    const count = levelNum === 1 ? 3 : (levelNum === 2 ? 4 : 5);
    const shuffled = shuffleArray([...LEVEL_QUESTIONS]);
    levelQuestions = shuffled.slice(0, count);
    levelIndex = 0;
    G.currentLevel = levelNum;
    saveState();
    levelInQuiz = true;   // 进入闯关答题状态
    renderLevelQuestion();
}

// ----- 渲染闯关题目 -----
function renderLevelQuestion() {
    if (levelIndex >= levelQuestions.length) {
        completeLevel();
        return;
    }
    const q = levelQuestions[levelIndex];
    levelCurrentQ = q;
    levelAnswered = false;
    levelCorrect = false;

    const answerBlocks = q.answer.slice();
    let hasMultiply = answerBlocks.includes('×');
    let hasDivide = answerBlocks.includes('÷');
    const usedSymbols = new Set(answerBlocks.filter(b => !['=', '×', '÷', '－'].includes(b)));
    const availableDistractors = DISTRACTORS.filter(s => !usedSymbols.has(s));
    const shuffledDist = shuffleArray(availableDistractors);
    const distractors = shuffledDist.slice(0, 2);

    let poolBlocks = [...answerBlocks];
    poolBlocks = poolBlocks.concat(distractors);
    if (hasMultiply && !hasDivide) {
        poolBlocks.push('÷');
    } else if (hasDivide && !hasMultiply) {
        poolBlocks.push('×');
    } else if (!hasMultiply && !hasDivide) {
        poolBlocks.push('×');
        poolBlocks.push('÷');
    }
    levelPool = shuffleArray(poolBlocks);
    levelSlots = new Array(answerBlocks.length).fill(null);

    const container = document.getElementById('levelContent');
    const levelNames = ['🎋 竹林试炼', '🏯 武林擂台', '⛰️ 华山之巅'];
    const levelName = levelNames[G.currentLevel - 1] || '演武场';

    let html = `
                <div style="margin-top:8px;">
                    <div style="text-align:center;margin-bottom:14px;">
                        <span class="tag" style="font-size:1.35rem;padding:8px 26px;">${levelName}</span>
                    </div>
                    <div style="font-size:1.6rem;font-weight:600;margin:16px 0;color:var(--text);text-align:center;">${q.text}</div>
                    <div class="formula-builder" id="levelBuilder">
                        ${levelSlots.map((_, i) => `<span class="fb-slot" data-idx="${i}">⬜</span>`).join('')}
                    </div>
                    <div class="builder-pool" id="levelPool">
                        ${levelPool.map((item, idx) => `
                            <span class="bp-item" data-idx="${idx}" onclick="levelSelectItem(${idx})">${item}</span>
                        `).join('')}
                    </div>
                    <div class="flex-center mt-12">
                        <button class="btn-primary" onclick="levelSubmit()"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" style="width:16px;height:16px;vertical-align:-2px;margin-right:4px;"><path d="M383.488 73.142857l325.778286 429.275429 191.488-82.066286a18.285714 18.285714 0 0 1 22.674285 7.094857l46.226286 73.654857a18.285714 18.285714 0 0 1-2.56 22.674286l-144.091428 144.091429 154.404571 154.477714v142.774857a18.285714 18.285714 0 0 1-12.507429 12.434286l-142.628571-0.073143-154.331429-154.404572-144.237714 144.091429a18.285714 18.285714 0 0 1-22.674286 2.56l-73.654857-46.299429a18.285714 18.285714 0 0 1-7.094857-22.674285l82.066286-191.488L73.142857 383.488V91.428571a18.285714 18.285714 0 0 1 14.116572-17.773714L91.428571 73.142857h292.059429z m372.370286 662.016l-20.699429 20.699429 127.268572 127.268571h20.699428v-20.626286l-127.268571-127.268571zM337.115429 168.228571H168.228571v168.96l450.340572 342.308572-43.739429 102.180571 206.774857-206.848-102.180571 43.812572L337.188571 168.228571z" fill="#ffffff"/></svg>出招</button>
                        <!-- 替换重置为删除 -->
                        <button class="btn-secondary" onclick="levelDeleteLast()">⌫ 删除</button>
                    </div>
                    <div id="levelFeedback" class="feedback-msg hidden"></div>
                    <div id="levelResultArea" style="display:none;margin-top:12px;">
                        <div id="levelHint" class="hint-box" style="margin-top:0;margin-bottom:12px;"></div>
                        <div id="levelFormulaDisplay" style="padding:18px;background:rgba(0,0,0,0.2);border-radius:8px;text-align:center;font-size:2.4rem;"></div>
                        <div style="margin-top:14px;text-align:center;">
                            <button class="btn-success" id="levelNextBtn" onclick="levelNextQuestion()">下一式</button>
                        </div>
                    </div>
                </div>
            `;
    container.innerHTML = html;
}

// ----- 拼图交互 -----
function levelSelectItem(idx) {
    if (levelAnswered) return;
    const item = levelPool[idx];
    if (!item) return;
    const emptyIdx = levelSlots.indexOf(null);
    if (emptyIdx === -1) return;
    levelSlots[emptyIdx] = item;
    levelPool[idx] = null;
    renderLevelBuilder();
}

function levelSlotClick(slotIdx) {
    if (levelAnswered) return;
    const val = levelSlots[slotIdx];
    if (val) {
        const poolIdx = levelPool.indexOf(null);
        if (poolIdx !== -1) {
            levelPool[poolIdx] = val;
        } else {
            levelPool.push(val);
        }
        levelSlots[slotIdx] = null;
        renderLevelBuilder();
    }
}

function renderLevelBuilder() {
    const builder = document.getElementById('levelBuilder');
    if (builder) {
        builder.innerHTML = levelSlots.map((val, i) => `
                    <span class="fb-slot ${val ? 'filled' : ''}" data-idx="${i}" onclick="levelSlotClick(${i})">${val || '⬜'}</span>
                `).join('');
    }
    const poolContainer = document.getElementById('levelPool');
    if (poolContainer) {
        poolContainer.innerHTML = levelPool.map((item, idx) => `
                    <span class="bp-item ${item ? '' : 'used'}" data-idx="${idx}" onclick="levelSelectItem(${idx})">${item || '⬜'}</span>
                `).join('');
    }
}

// ----- 删除最后一个输入 -----
function levelDeleteLast() {
    if (levelAnswered) return;
    // 从右向左查找最后一个非空槽
    for (let i = levelSlots.length - 1; i >= 0; i--) {
        if (levelSlots[i] !== null) {
            const val = levelSlots[i];
            levelSlots[i] = null;
            // 将块放回池子
            const emptyIdx = levelPool.indexOf(null);
            if (emptyIdx !== -1) {
                levelPool[emptyIdx] = val;
            } else {
                levelPool.push(val);
            }
            renderLevelBuilder();
            return;
        }
    }
    // 如果没有可删除的，可加提示（静默忽略）
}

// ----- 重置（保留，用于错误后自动重置）-----
function levelReset() {
    const q = levelCurrentQ;
    if (!q) return;
    const answerBlocks = q.answer.slice();
    let hasMultiply = answerBlocks.includes('×');
    let hasDivide = answerBlocks.includes('÷');
    const usedSymbols = new Set(answerBlocks.filter(b => !['=', '×', '÷', '－'].includes(b)));
    const availableDistractors = DISTRACTORS.filter(s => !usedSymbols.has(s));
    const shuffledDist = shuffleArray(availableDistractors);
    const distractors = shuffledDist.slice(0, 2);
    let poolBlocks = [...answerBlocks];
    poolBlocks = poolBlocks.concat(distractors);
    if (hasMultiply && !hasDivide) {
        poolBlocks.push('÷');
    } else if (hasDivide && !hasMultiply) {
        poolBlocks.push('×');
    } else if (!hasMultiply && !hasDivide) {
        poolBlocks.push('×');
        poolBlocks.push('÷');
    }
    levelPool = shuffleArray(poolBlocks);
    levelSlots = new Array(answerBlocks.length).fill(null);
    renderLevelBuilder();
    document.getElementById('levelFeedback').classList.add('hidden');
    document.getElementById('levelResultArea').style.display = 'none';
    levelAnswered = false;
    levelCorrect = false;
}

function levelSubmit() {
    if (levelAnswered) return;
    if (isInCooldown()) {
        showCooldown(getCooldownRemaining());
        return;
    }
    const q = levelCurrentQ;
    if (!q) return;
    if (levelSlots.some(v => v === null)) {
        const fb = document.getElementById('levelFeedback');
        fb.className = 'feedback-msg info';
        fb.textContent = '⚠️ 请填满所有空位！';
        fb.classList.remove('hidden');
        return;
    }
    const userAns = levelSlots.join('');
    const correctAns = q.answer.join('');
    const isCorrect = userAns === correctAns;

    const fb = document.getElementById('levelFeedback');
    fb.classList.remove('hidden', 'success', 'error');

    if (isCorrect) {
        fb.className = 'feedback-msg success';
        fb.innerHTML = `<span class="fb-correct-icon">${ICON_CORRECT}</span> 招式正确！`;
        playSfx('correct');
        levelCorrect = true;

        const resultArea = document.getElementById('levelResultArea');
        resultArea.style.display = 'block';
        const formulaDisplay = document.getElementById('levelFormulaDisplay');
        renderDisplayKatex(formulaDisplay, q.display);

        const hint = document.getElementById('levelHint');
        hint.classList.remove('hidden');
        hint.textContent = '💡 ' + q.hint;

        levelAnswered = true;
        const slots = document.querySelectorAll('#levelBuilder .fb-slot');
        slots.forEach(el => el.classList.add('correct'));
        document.querySelectorAll('.bp-item').forEach(el => el.style.pointerEvents = 'none');

    } else {
        fb.className = 'feedback-msg error';
        fb.textContent = '❌ 招式有误，此关需重头再来！';
        playSfx('wrong');
        const slots = document.querySelectorAll('#levelBuilder .fb-slot');
        slots.forEach(el => el.classList.add('wrong'));
        // 答错即退回演武场界面，重新挑战本关（此前作答作废）
        setTimeout(() => {
            startCooldown(60, '招式有失', '方才招式有失，正在自行修炼。内力恢复后方可再战！');
            levelIndex = 0;
            renderAdventureMap();
        }, 1100);
    }
}

function levelNextQuestion() {
    if (!levelCorrect) return;
    levelIndex++;
    renderLevelQuestion();
}

// ----- 完成关卡 -----
function completeLevel() {
    const levelNum = G.currentLevel;
    G.levelProgress = levelNum;
    levelInQuiz = false;   // 通关，不再处于闯关答题

    // 每关获得星星 = 该关题目数量 × 3（第1关3题=9星、第2关4题=12星、第3关5题=15星）
    const questionCount = levelNum === 1 ? 3 : (levelNum === 2 ? 4 : 5);
    const levelStars = questionCount * 3;
    G.totalStars = (G.totalStars || 0) + levelStars;

    const titleMap = { 1: '一代宗师', 2: '江湖神话', 3: '武林盟主' };
    const congratsMap = {
        1: '竹林试炼，一招一式皆入化境！你已超越掌门之境，开宗立派，自成一家。江湖人称：一代宗师！',
        2: '武林擂台上，你以绝世武功连败强敌！你的传说已在江湖流传，成为人人敬仰的神话！',
        3: '华山之巅，群雄俯首！你以无双武艺统御武林，号令天下，莫敢不从。今日起，你便是——武林盟主！物理江湖，唯你独尊！'
    };

    G.titles.push(titleMap[levelNum]);
    saveState();

    const container = document.getElementById('levelContent');
    let nextBtn = '';
    if (levelNum < 3) {
        nextBtn = `<button class="btn-primary" onclick="renderAdventureMap()">🗺️ 返回演武场</button>`;
    } else {
        nextBtn = `<button class="btn-primary" onclick="enterMain()">🗺️ 威震江湖，返回地图</button>`;
    }

    container.innerHTML = `
                <div class="text-center" style="padding:30px 0;">
                    <div class="title-badge-svg">${getTitleBadge(titleMap[levelNum])}</div>
                    <h2 style="color:#FCD34D;font-size:2rem;">${titleMap[levelNum]}</h2>
                    <p style="color:var(--text-light);font-size:1.05rem;margin:12px 0;line-height:1.8;max-width:480px;margin-left:auto;margin-right:auto;">
                        ${congratsMap[levelNum]}
                    </p>
                    <div class="node-reward" style="font-size:1.05rem;">${getStarIcon(18)} 本关获得 ${levelStars} 星（${questionCount} 题 × 3）· 当前内力值${G.totalStars}</div>
                    ${levelNum === 3 ? `<div class="node-reward" style="font-size:1rem;color:var(--gold);">🏆 演武场全关通关，累计获得 36 星！内力大涨，可前往问道崖参悟天道。</div>` : ''}
                    <div style="margin-top:20px;">${nextBtn}</div>
                </div>
            `;

    updateMainUI();
    // 称号晋升仪式弹窗（演武场通关晋升，7 秒后自动消失）
    showTitlePopup(titleMap[levelNum], congratsMap[levelNum]);
    if (G.levelProgress >= 3) {
        // 第 3 关（华山之巅）通关：称号仪式结束后，再弹出问道崖解锁（独立弹窗与动画）
        setTimeout(() => {
            showUnlockPopup({
                icon: '🏯',
                title: '问道崖 · 已开启',
                desc: '大侠已登临武林盟主之位！问道崖迷雾散开，可前往破解天道谜题。'
            });
        }, 7000);
    } else {
        // 前 2 关通关：稍后返回演武场地图，继续挑战下一关
        setTimeout(() => {
            renderAdventureMap();
        }, 600);
    }
}

// ================================================================
// 导出（供 app.js 等 import）
// ================================================================
function isLevelInQuiz() { return levelInQuiz; }
export {
    showLevelSelect, startLevel, renderLevelQuestion,
    levelSelectItem, levelSlotClick, renderLevelBuilder,
    levelDeleteLast, levelReset, levelSubmit, levelNextQuestion,
    completeLevel, renderAdventureMap, isLevelInQuiz
};

// ================================================================
// 暴露全局（兼容内联 onclick，保持游戏可用）
// ================================================================
window.showLevelSelect = showLevelSelect;
window.startLevel = startLevel;
window.renderLevelQuestion = renderLevelQuestion;
window.levelSelectItem = levelSelectItem;
window.levelSlotClick = levelSlotClick;
window.renderLevelBuilder = renderLevelBuilder;
window.levelDeleteLast = levelDeleteLast;
window.levelReset = levelReset;
window.levelSubmit = levelSubmit;
window.levelNextQuestion = levelNextQuestion;
window.completeLevel = completeLevel;
window.renderAdventureMap = renderAdventureMap;
window.isLevelInQuiz = isLevelInQuiz;