// ================================================================
// compete.js — 天机阁核心逻辑（题库数据在 compete-data.json 中，异步加载）
// ================================================================

import { G, saveState, showPage, showGameModal, updateMainUI, playSfx, getStarIcon } from './app.js';
import { shuffleArray, ensureKatex } from './utils.js';

let competeQuestions = [];
let competeIndex = 0;
let competePartAnswers = [];
let competePartSelected = [];
let competeComplete = false;
let competeSessionStars = 0;   // 本次进入问道崖累计获得的内力值
let competeAwarded = false;    // 当前大题是否已发放星星（防止重复）
let competePartResults = [];   // 记录每道大题的作答结果（整道全对=true）

// ----- 题库异步加载（首次进入时 fetch，结果缓存复用）-----
let competeDataPromise = null;
function loadCompeteData() {
    if (!competeDataPromise) {
        competeDataPromise = fetch(new URL('./compete-data.json', import.meta.url))
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .catch(err => {
                competeDataPromise = null;   // 失败后允许下次重试
                console.error('compete-data.json 加载失败：', err);
                return [];
            });
    }
    return competeDataPromise;
}

// ----- 初始化天机阁 -----
async function initCompete() {
    const data = await loadCompeteData();
    if (!data || data.length === 0) {
        showGameModal({ icon: '⚠️', title: '数据未加载', desc: '天机阁数据未加载，请刷新页面。' });
        return;
    }
    const shuffled = shuffleArray([...data]);
    competeQuestions = shuffled.slice(0, 5);
    competeIndex = 0;
    competeSessionStars = 0;
    competePartResults = [];
    resetCompeteState();
    showPage('pageCompete');
    renderCompeteQuestion();
}

// ----- 重置当前题目的答题状态（进入新题时调用）-----
function resetCompeteState() {
    const q = competeQuestions[competeIndex];
    const totalParts = q ? q.parts.length : 0;
    competePartAnswers = new Array(totalParts).fill(false);
    competePartSelected = new Array(totalParts).fill(false);
    competeComplete = false;
    competeAwarded = false;
}

// ----- 将文本中的上标/下标标记转换为 HTML 上下标 -----
// 例如：10^3 -> 10<sup>3</sup>，10^-4 -> 10<sup>-4</sup>，kg/m^3 -> kg/m<sup>3</sup>，S1/R1 -> S<sub>1</sub>/R<sub>1</sub>
function formatCompeteText(text) {
    if (!text) return '';
    return text
        // 上标：^3、^-4、^{10}、^2
        .replace(/\^\{?(-?\d+(?:\.\d+)?|[A-Za-z]+)\}?/g, '<sup>$1</sup>')
        // 下标：_液、_{液}
        .replace(/_(?:\{)?([^_\s，。；：、（）()]+?)(?:\})?/g, '<sub>$1</sub>')
        // 元器件下标：字母后紧跟 1~2 位数字（S1、R1、A1 等），排除 C919 这类多位型号
        .replace(/([A-Za-z])(\d{1,2})(?!\d)/g, '$1<sub>$2</sub>');
}

// ----- 渲染当前题目 -----
function renderCompeteQuestion() {
    const container = document.getElementById('competeContent');
    if (competeIndex >= competeQuestions.length) {
        // 统计答对的大题数（每个小问都答对才算对 1 道大题）
        const solvedCount = competePartResults.filter(Boolean).length;
        const totalQ = competeQuestions.length;
        // 按答对题数 0~5 设计对应的标题与文案
        const endMsgMap = [
            { title: '问道无果', desc: '五道天机皆未参透，道心尚需磨砺。回藏经阁精进心法、积蓄功力，再来问道崖叩问天道！' },
            { title: '道心初启', desc: '五道天机仅悟其一，道途初启。内力渐聚，继续问道，必能拨云见日！' },
            { title: '道缘渐深', desc: '五道天机已悟其二，道行渐长。功力精进，再接再厉，更近天道一步！' },
            { title: '悟道有成', desc: '五道天机已悟其三，道心通明。内力流转自如，再问道几题，可窥天道玄机！' },
            { title: '洞彻大道', desc: '五道天机已悟其四，距大道只差一问。道行深厚、内力充盈，临门一脚，莫要错过！' },
            { title: '问道天成', desc: '五道天机尽数参透，道法自然、功力通神！盟主之名名副其实，天道大道，尽在掌中！' }
        ];
        const endMsg = endMsgMap[solvedCount] || endMsgMap[0];
        container.innerHTML = `
            <div class="text-center" style="padding:40px 0;">
                <h2>${endMsg.title}</h2>
                <p style="color:var(--text-light);">${endMsg.desc}</p>
                <div style="margin:14px 0;font-size:1.1rem;color:var(--gold);">${getStarIcon(20)} 答对 ${solvedCount} / ${totalQ} 道 · 本轮获得 ${competeSessionStars} 星 · 当前内力值${G.totalStars}</div>
                <button class="btn-primary" onclick="enterMain()">返回江湖</button>
            </div>
        `;
        return;
    }

    const q = competeQuestions[competeIndex];

    let html = `
        <div style="margin-bottom:16px;">
            <span class="tag">天机谜题 ${competeIndex+1}/${competeQuestions.length}</span>
        </div>
        <div class="compete-question">
            <div class="compete-title">${formatCompeteText(q.title)}</div>
    `;
    if (q.hasImage) {
        const imgUrl = `https://pub-3827e3697a0b44428ab555d41c8d38f3.r2.dev/formula/${q.id}.webp`;
        html += `<div class="compete-image"><img src="${imgUrl}" alt="题目图片" onerror="this.style.display='none'" /></div>`;
    }
    html += `<div class="compete-parts">`;
    q.parts.forEach((part, idx) => {
        const answered = competePartSelected[idx];
        const correct = competePartAnswers[idx];
        html += `
            <div class="compete-part" data-partindex="${idx}">
                <div class="part-question">${formatCompeteText(part.question)}</div>
                <div class="part-options">
                    ${part.options.map((opt, optIdx) => {
                        let cls = 'compete-opt';
                        if (answered) {
                            if (optIdx === part.answer) cls += ' correct';
                            else if (optIdx === competePartSelected[idx] - 1) cls += ' wrong';
                            else cls += ' disabled';
                        }
                        return `<div class="${cls}" onclick="selectCompeteOption(${idx}, ${optIdx})">${formatCompeteText(opt)}</div>`;
                    }).join('')}
                </div>
            </div>
        `;
    });
    html += `</div>`;
    // 答对整道大题的星星增益动画（放大 + 上浮）
    html += `<div id="competeStarGain" class="star-gain"><span class="sg-num">+5</span><span class="sg-star">★</span></div>`;
    html += `</div>`;
    // competePartSelected 存的是用户选择的选项序号(1~4)，答完的小题值为数字>0，未答为 false
    const allAnswered = competePartSelected.length > 0 && competePartSelected.every(v => v > 0);
    if (allAnswered) {
        html += `
            <div style="text-align:center;margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                <button class="btn-primary" onclick="showCompeteSolution()">查看天机详解</button>
                <button class="btn-success" onclick="nextCompeteQuestion()">下一道</button>
            </div>
            <div id="solutionArea" style="display:none;"></div>
        `;
    }
    html += `</div>`;
    container.innerHTML = html;
    if (allAnswered) competeComplete = true;
}

// ----- 选择选项 -----
function selectCompeteOption(partIdx, optIdx) {
    if (competePartSelected[partIdx]) return;
    const q = competeQuestions[competeIndex];
    const part = q.parts[partIdx];
    const isCorrect = (optIdx === part.answer);
    competePartSelected[partIdx] = optIdx + 1;
    competePartAnswers[partIdx] = isCorrect;
    if (isCorrect) playSfx('correct');
    else playSfx('wrong');
    renderCompeteQuestion();
    // 整道大题全部答对：立即发放 5 星并播放明显放大动画
    const allAnswered = competePartSelected.length > 0 && competePartSelected.every(v => v > 0);
    if (allAnswered) {
        // 记录这道大题的作答结果（每个小问都答对才算对 1 道大题）
        competePartResults[competeIndex] = competePartAnswers.every(v => v === true);
        if (competePartAnswers.every(v => v === true) && !competeAwarded) {
            competeAwarded = true;
            G.totalStars = (G.totalStars || 0) + 5;
            competeSessionStars += 5;
            saveState();
            updateMainUI();
            playSfx('collect');
            const el = document.getElementById('competeStarGain');
            if (el) {
                el.classList.remove('show');
                void el.offsetWidth;
                el.classList.add('show');
            }
        }
    }
}

// ----- 显示答案和详解 -----
function showCompeteSolution() {
    const q = competeQuestions[competeIndex];
    const area = document.getElementById('solutionArea');
    if (!area) return;
    let html = `
        <div class="compete-solution" style="margin-top:16px;">
            <div class="solution-title">📖 答案和解析</div>
            <div class="solution-body" id="solutionBody">${q.solution}</div>
        </div>
    `;
    area.innerHTML = html;
    area.style.display = 'block';
    const body = document.getElementById('solutionBody');
    if (body) {
        let text = body.innerHTML;
        // 换行转 <br>（详解内容为多行文本）
        text = text.replace(/\n/g, '<br>');
        // 先提取 KaTeX 公式块为占位符（占位符为 @@K#序号#@@，不含「字母+数字」邻接，避免被下方上下标正则误伤）
        const katexBlocks = [];
        text = text.replace(/\\\((.+?)\\\)/g, (match, p1) => {
            katexBlocks.push(p1);
            return `@@K#${katexBlocks.length - 1}#@@`;
        });
        // 对 KaTeX 之外的纯文本做上下标处理
        text = text
            .replace(/\^\{?(-?\d+(?:\.\d+)?|[A-Za-z]+)\}?/g, '<sup>$1</sup>')
            .replace(/_(?:\{)?([^_\s，。；：、（）()]+?)(?:\})?/g, '<sub>$1</sub>')
            .replace(/([A-Za-z])(\d{1,2})(?!\d)/g, '$1<sub>$2</sub>');
        // 填回 KaTeX 渲染结果（先确保 katex 已加载）
        const fillBack = () => {
            text = text.replace(/@@K#(\d+)#@@/g, (match, idx) => {
                try { return window.katex.renderToString(katexBlocks[+idx], { throwOnError: false, displayMode: false }); } catch(e) { return match; }
            });
            body.innerHTML = text;
        };
        ensureKatex().then(fillBack).catch(() => { body.innerHTML = text; });
    }
    // 将解析区滚动到视野内（即时定位，不用平滑动画，避免打断用户回看上面内容）
    area.scrollIntoView({ block: 'start' });
}

// ----- 下一题 -----
function nextCompeteQuestion() {
    // 星星已在答对整道大题时发放（含动画）
    competeIndex++;
    resetCompeteState();
    renderCompeteQuestion();
    // 页面滚回顶部，让导航栏回到视野顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================================================================
// 导出（供 app.js 等 import）
// ================================================================
export { initCompete, selectCompeteOption, showCompeteSolution, nextCompeteQuestion };

// ================================================================
// 暴露全局（兼容内联 onclick，保持游戏可用）
// ================================================================
window.initCompete = initCompete;
window.selectCompeteOption = selectCompeteOption;
window.showCompeteSolution = showCompeteSolution;
window.nextCompeteQuestion = nextCompeteQuestion;