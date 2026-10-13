// ================================================================
// app.js — 全局状态管理、页面导航、冷却控制、主界面更新、重置功能
// ================================================================

function loadState() {
    const raw = localStorage.getItem('formulaGameState_v4');
    if (raw) {
        try {
            const s = JSON.parse(raw);
            // 兼容旧存档：称号由「emoji + 名称」改为纯名称（新徽章系统），去掉 emoji 前缀
            if (Array.isArray(s.titles)) s.titles = s.titles.map(t => String(t).replace(/^\S+\s+/, ''));
            if (Array.isArray(s.notifiedTitles)) s.notifiedTitles = s.notifiedTitles.map(t => String(t).replace(/^\S+\s+/, ''));
            return s;
        } catch (e) {}
    }
    return {
        collected: [],
        levelProgress: 0,
        currentLevel: 0,
        cooldownUntil: 0,
        titles: [],
        totalStars: 0,
        notifiedTitles: []
    };
}

function saveState() {
    localStorage.setItem('formulaGameState_v4', JSON.stringify(G));
}

let G = loadState();

// ----- 公共工具 -----
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function renderKatex(el, latex) {
    if (!el) return;
    if (window.katex) {
        try {
            window.katex.render(latex, el, { throwOnError: false, displayMode: false });
        } catch (e) {
            el.textContent = latex;
        }
    } else {
        el.textContent = latex;
    }
}

function renderDisplayKatex(el, latex) {
    if (!el) return;
    if (window.katex) {
        try {
            window.katex.render(latex, el, { throwOnError: false, displayMode: true });
        } catch (e) {
            el.textContent = latex;
        }
    } else {
        el.textContent = latex;
    }
}

// ----- 音效 -----
function playSfx(type) {
    const map = {
        correct: 'sfxCorrect',
        wrong: 'sfxWrong',
        collect: 'sfxCollect',
        levelup: 'sfxLevelUp'
    };
    const id = map[type];
    if (id) {
        const el = document.getElementById(id);
        if (el) {
            el.currentTime = 0;
            el.play().catch(() => {});
        }
    }
}

// 点击音效（所有按钮类）
function playClickSfx() {
    const el = document.getElementById('sfxClick');
    if (el) { el.currentTime = 0; el.play().catch(() => {}); }
}
document.addEventListener('click', (e) => {
    // 答题选项自带对/错音效，不叠加 click
    if (e.target.closest('.opt') || e.target.closest('.fight-opt') || e.target.closest('.compete-opt')) return;
    // 其余有效点击（按钮或带 onclick 的交互元素）均播放 click
    if (e.target.closest('button') || e.target.closest('[onclick]')) playClickSfx();
});

// ----- 背景音乐（单曲循环，本地预加载；首次交互后自动播放）-----
let bgmEnabled = true;
let bgmStarted = false;
function initBgm() {
    const el = document.getElementById('bgmAudio');
    if (!el) return;
    el.volume = 0.5;
    el.load();
    const tryStart = () => {
        if (bgmEnabled && !bgmStarted) {
            bgmStarted = true;
            el.play().catch(() => { bgmStarted = false; });
        }
    };
    document.addEventListener('pointerdown', tryStart);
    document.addEventListener('keydown', tryStart);
}
function toggleBgm() {
    const el = document.getElementById('bgmAudio');
    if (!el) return;
    bgmEnabled = !bgmEnabled;
    if (bgmEnabled) {
        el.play().catch(() => {});
        bgmStarted = true;
    } else {
        el.pause();
    }
    const on = document.getElementById('soundOnIcon');
    const off = document.getElementById('soundOffIcon');
    if (on) on.style.display = bgmEnabled ? '' : 'none';
    if (off) off.style.display = bgmEnabled ? 'none' : '';
}
window.toggleBgm = toggleBgm;

// ================================================================
// 冷却控制（真实计时：答错后需自行修炼 1 分钟）
// ================================================================
let cooldownInterval = null;

function isInCooldown() {
    return !!G.cooldownUntil && Date.now() < G.cooldownUntil;
}

function getCooldownRemaining() {
    return G.cooldownUntil ? Math.max(0, Math.ceil((G.cooldownUntil - Date.now()) / 1000)) : 0;
}

function startCooldown(seconds, title, desc) {
    G.cooldownUntil = Date.now() + seconds * 1000;
    saveState();
    showCooldown(seconds, title, desc);
}

function showCooldown(seconds, title = '自行修炼中', desc = '方才修炼有失，正在静坐调息。待内力恢复后再行尝试！') {
    const overlay = document.getElementById('cooldownOverlay');
    if (!overlay) return;
    if (overlay._interval) {
        clearInterval(overlay._interval);
        overlay._interval = null;
    }
    const titleEl = document.getElementById('cdTitle');
    const descEl = document.getElementById('cdDesc');
    if (titleEl && title) titleEl.textContent = title;
    if (descEl && desc) descEl.textContent = desc;
    overlay.classList.add('show');
    let remain = seconds;
    const timerEl = document.getElementById('cdTimer');
    const tick = () => {
        const m = Math.floor(remain / 60).toString().padStart(2, '0');
        const s = (remain % 60).toString().padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
        remain--;
        if (remain < 0) {
            clearInterval(overlay._interval);
            overlay._interval = null;
            overlay.classList.remove('show');
        }
    };
    tick();
    overlay._interval = setInterval(tick, 1000);
}

function closeCooldown() {
    const overlay = document.getElementById('cooldownOverlay');
    overlay.classList.remove('show');
    if (overlay._interval) {
        clearInterval(overlay._interval);
        overlay._interval = null;
    }
}

// ----- 页面导航 -----
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    // 切换页面时隐藏各类弹窗，避免残留
    const up = document.getElementById('unlockPopup');
    if (up) up.classList.remove('show');
    const tp = document.getElementById('titlePopup');
    if (tp) tp.classList.remove('show');
    // 封面页隐藏顶部栏，进入江湖后显示
    const topBar = document.getElementById('topBar');
    if (topBar) topBar.style.display = (id === 'pageWelcome') ? 'none' : 'flex';
    if (id === 'pageWelcome') {
        document.getElementById('btnBack').style.display = 'none';
    } else {
        document.getElementById('btnBack').style.display = 'inline-block';
    }
    closeCooldown();
    // 进入 3D 沙盘主界面时，容器从隐藏变为可见，需重新计算尺寸
    if (id === 'pageMain' && window.SECT3D) {
        window.SECT3D.resize();
        // 返回主界面时恢复 3D 沙盘的自动巡航旋转
        if (window.SECT3D.resumeAutoRotate) window.SECT3D.resumeAutoRotate();
    }
    // 离开 3D 沙盘主界面时清理悬停标签/高亮，避免残留到其他页面（如封面）
    if (id !== 'pageMain' && window.SECT3D && window.SECT3D.clearHover) {
        window.SECT3D.clearHover();
    }
}

// ----- 计算总卡片数（固定17张）-----
function getTotalCards() {
    if (!window.CARD_DATA) return 0;
    let count = 0;
    CARD_DATA.forEach(item => {
        if (item.type === 'group') {
            count += 1;
        } else {
            count += 1;
        }
    });
    return count;
}

// ----- 计算已收集卡片数（完整卡片收集 + 组内全部碎片收集）-----
function getCollectedCards() {
    if (!window.CARD_DATA) return 0;
    let collected = 0;
    CARD_DATA.forEach(item => {
        if (item.type === 'group') {
            const allFragmentsCollected = item.fragments.every(f => G.collected.includes(f.id));
            if (allFragmentsCollected) collected++;
        } else {
            if (G.collected.includes(item.id)) collected++;
        }
    });
    return collected;
}

// ----- 十阶段位徽章（SVG 令牌，从江湖菜鸟到武林盟主）-----
const TITLE_BADGES = {
    '江湖菜鸟': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="b1-g1" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff" stop-opacity="0.35"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <circle cx="32" cy="32" r="30" fill="#8B6914"/>
      <circle cx="32" cy="32" r="28" fill="#D2B48C"/>
      <path d="M12 12 Q20 10 28 16" stroke="#5c4033" fill="none" stroke-width="0.6" opacity="0.5"/>
      <path d="M48 48 Q40 50 32 44" stroke="#5c4033" fill="none" stroke-width="0.6" opacity="0.5"/>
      <ellipse cx="32" cy="44" rx="6" ry="3" fill="#8B4513"/>
      <path d="M32 44 Q28 30 22 24 Q28 28 32 38 Q36 28 42 24 Q36 30 32 44Z" fill="#4ade80"/>
      <circle cx="32" cy="32" r="30" fill="url(#b1-g1)" opacity="0.3"/>
    </svg>`,
    '外门弟子': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="b2-g2" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff" stop-opacity="0.3"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <circle cx="32" cy="32" r="30" fill="#4a4a4a"/>
      <circle cx="32" cy="32" r="28" fill="#6b6b6b"/>
      <circle cx="16" cy="16" r="2" fill="#8B4513" opacity="0.6"/>
      <circle cx="48" cy="46" r="1.8" fill="#8B4513" opacity="0.5"/>
      <rect x="28" y="18" width="8" height="24" rx="2" fill="#b08968"/>
      <rect x="22" y="28" width="20" height="4" rx="2" fill="#8d6e63"/>
      <rect x="22" y="38" width="20" height="4" rx="2" fill="#8d6e63"/>
      <circle cx="32" cy="32" r="30" fill="url(#b2-g2)" opacity="0.3"/>
    </svg>`,
    '内门高手': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="b3-g3" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff" stop-opacity="0.3"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <circle cx="32" cy="32" r="30" fill="#b87333"/>
      <circle cx="32" cy="32" r="28" fill="#1e3a5f"/>
      <circle cx="18" cy="18" r="2.5" fill="#5f9ea0" opacity="0.7"/>
      <circle cx="48" cy="44" r="2" fill="#5f9ea0" opacity="0.6"/>
      <g transform="translate(32,32) rotate(-30) translate(-32,-32)">
        <path d="M30 14 L34 14 L36 48 L28 48Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
        <line x1="32" y1="16" x2="32" y2="46" stroke="#f1f5f9" stroke-width="1.5"/>
        <rect x="26" y="48" width="12" height="4" rx="1" fill="#fbbf24"/>
        <rect x="29" y="52" width="6" height="8" rx="1" fill="#78350f"/>
      </g>
      <g transform="translate(32,32) rotate(30) translate(-32,-32)">
        <path d="M30 14 L34 14 L36 48 L28 48Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
        <line x1="32" y1="16" x2="32" y2="46" stroke="#f1f5f9" stroke-width="1.5"/>
        <rect x="26" y="48" width="12" height="4" rx="1" fill="#fbbf24"/>
        <rect x="29" y="52" width="6" height="8" rx="1" fill="#78350f"/>
      </g>
      <circle cx="32" cy="32" r="30" fill="url(#b3-g3)" opacity="0.3"/>
    </svg>`,
    '核心弟子': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="b4-g4" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff" stop-opacity="0.4"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <circle cx="32" cy="32" r="30" fill="#c0c0c0"/>
      <circle cx="32" cy="32" r="28" fill="#1e3a8a"/>
      <path d="M10 10 Q18 6 26 12 Q34 6 42 12 Q50 6 54 14 Q58 22 52 30 Q58 38 54 46 Q58 54 50 56 Q42 62 34 54 Q26 62 18 56 Q10 58 8 50 Q2 42 10 34 Q2 26 8 18 Z" fill="none" stroke="#e2e8f0" stroke-width="0.8" opacity="0.5"/>
      <rect x="30" y="16" width="4" height="28" rx="1" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="28" y="44" width="8" height="3" rx="1" fill="#fbbf24"/>
      <rect x="29" y="47" width="6" height="8" rx="1" fill="#78350f"/>
      <circle cx="32" cy="20" r="4" fill="#3b82f6" stroke="#e2e8f0" stroke-width="1"/>
      <circle cx="32" cy="20" r="1.5" fill="#93c5fd"/>
      <circle cx="32" cy="32" r="30" fill="url(#b4-g4)" opacity="0.3"/>
    </svg>`,
    '门派长老': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="b5-g5" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff" stop-opacity="0.35"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <circle cx="32" cy="32" r="30" fill="#d4af37"/>
      <circle cx="32" cy="32" r="28" fill="#3d2b1f"/>
      <path d="M12 12 Q18 8 24 12 Q30 6 36 12 Q42 8 48 12" fill="none" stroke="#fbbf24" stroke-width="0.8" opacity="0.6"/>
      <rect x="30" y="16" width="4" height="22" rx="2" fill="#d4af37"/>
      <path d="M28 38 Q24 44 20 52" fill="none" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M30 38 Q28 46 26 54" fill="none" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M32 38 Q32 48 32 56" fill="none" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M34 38 Q36 46 38 54" fill="none" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M36 38 Q40 44 44 52" fill="none" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="30" fill="url(#b5-g5)" opacity="0.3"/>
    </svg>`,
    '掌门候选人': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="b6-g6" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff" stop-opacity="0.4"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <radialGradient id="b6-jade" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#fdfbf7"/><stop offset="100%" stop-color="#e2dcc8"/></radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#b6-jade)"/>
      <circle cx="32" cy="32" r="28" fill="#e0f2fe"/>
      <path d="M8 12 L12 8 L16 12 L20 8 L24 12 L28 8 L32 12 L36 8 L40 12 L44 8 L48 12 L52 8 L56 12" fill="none" stroke="#bae6fd" stroke-width="0.8" opacity="0.7"/>
      <path d="M20 38 Q28 20 40 22 Q48 24 46 34 Q44 40 36 42 Q30 42 28 36" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="38" cy="26" r="2" fill="#f59e0b"/>
      <path d="M20 38 L16 44" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="30" fill="url(#b6-g6)" opacity="0.3"/>
    </svg>`,
    '门派掌门': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="b7-g7" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff" stop-opacity="0.4"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <circle cx="32" cy="32" r="30" fill="#ffd700"/>
      <circle cx="32" cy="32" r="28" fill="#450a0a"/>
      <path d="M12 8 Q16 4 20 8 Q24 2 28 8 Q32 4 36 8 Q40 2 44 8 Q48 4 52 8" fill="none" stroke="#fbbf24" stroke-width="1" opacity="0.6"/>
      <rect x="28" y="4" width="8" height="6" rx="2" fill="#ffd700"/>
      <rect x="20" y="22" width="24" height="22" rx="2" fill="#dc2626" stroke="#ffd700" stroke-width="1.5"/>
      <path d="M26 30 L38 30 M32 28 L32 40 M28 34 L36 34" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="30" fill="url(#b7-g7)" opacity="0.3"/>
    </svg>`,
    '一代宗师': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="b8-g8" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff" stop-opacity="0.4"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <linearGradient id="b8-purpleGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#b784a7"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#b8-purpleGold)"/>
      <circle cx="32" cy="32" r="28" fill="#2e1065"/>
      <path d="M8 18 L14 12 L12 18 L18 12" fill="none" stroke="#d8b4fe" stroke-width="0.8" opacity="0.5"/>
      <circle cx="32" cy="32" r="14" fill="#d8b4fe" opacity="0.3"/>
      <path d="M32 18 A14 14 0 0 1 32 46 A7 7 0 0 0 32 18 Z" fill="#fff" opacity="0.9"/>
      <path d="M32 18 A14 14 0 0 0 32 46 A7 7 0 0 1 32 18 Z" fill="#111" opacity="0.9"/>
      <circle cx="32" cy="25" r="2.5" fill="#111"/>
      <circle cx="32" cy="39" r="2.5" fill="#fff"/>
      <rect x="30" y="14" width="4" height="24" rx="1" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
      <rect x="28" y="38" width="8" height="2" rx="1" fill="#fbbf24"/>
      <circle cx="32" cy="32" r="30" fill="url(#b8-g8)" opacity="0.3"/>
    </svg>`,
    '江湖神话': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="b9-g9" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff" stop-opacity="0.4"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <linearGradient id="b9-fire2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#b9-fire2)"/>
      <circle cx="32" cy="32" r="28" fill="#7f1d1d"/>
      <path d="M10 16 Q16 10 22 14 Q28 8 34 12 Q40 8 46 14 Q52 10 58 16" fill="none" stroke="#f97316" stroke-width="0.8" opacity="0.5"/>
      <path d="M32 22 Q38 20 44 26 Q48 32 42 38 Q36 42 32 44 Q28 42 22 38 Q16 32 20 26 Q26 20 32 22 Z" fill="#f97316" opacity="0.4"/>
      <path d="M32 20 L38 28 L44 26 L40 34 L46 38 L38 38 L36 46 L32 40 L28 46 L26 38 L18 38 L24 34 L20 26 L26 28 Z" fill="#fbbf24" stroke="#f97316" stroke-width="1"/>
      <path d="M32 18 L32 12" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="30" fill="url(#b9-g9)" opacity="0.3"/>
    </svg>`,
    '武林盟主': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="b10-g10" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff" stop-opacity="0.5"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <linearGradient id="b10-gold2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffd700"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#b10-gold2)"/>
      <circle cx="32" cy="32" r="28" fill="#0a0a0a"/>
      <path d="M6 18 Q4 12 10 8 Q16 4 22 6 Q28 2 34 4 Q40 2 46 6 Q52 4 58 8 Q62 12 58 18 Q62 24 58 30 Q62 36 58 42 Q62 48 58 52 Q54 58 48 56 Q42 60 36 58 Q30 62 24 58 Q18 60 12 56 Q8 58 6 52 Q2 46 6 42 Q2 36 6 30 Q2 24 6 18 Z" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.8"/>
      <circle cx="32" cy="6" r="3" fill="#ffd700" stroke="#fff" stroke-width="1"/>
      <path d="M18 38 Q24 20 36 18 Q44 16 46 26 Q48 36 40 40 Q34 42 30 36 Q28 30 34 28 Q40 26 42 32" fill="none" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>
      <path d="M18 38 L12 42" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
      <path d="M36 18 L40 12 L38 16 L42 14" fill="none" stroke="#ffd700" stroke-width="2" stroke-linecap="round"/>
      <path d="M40 24 L44 22 M42 28 L46 28" fill="none" stroke="#ffd700" stroke-width="2" stroke-linecap="round"/>
      <circle cx="38" cy="22" r="1.5" fill="#ffd700"/>
      <circle cx="32" cy="32" r="30" fill="url(#b10-g10)" opacity="0.3"/>
    </svg>`
};

// 获取称号对应的徽章 SVG
function getTitleBadge(title) {
    return TITLE_BADGES[title] || TITLE_BADGES['江湖菜鸟'] || '';
}

// 星星图标（金色五角星 SVG，用户提供）
const STAR_ICON_PATH = 'M313.991837 914.285714c-20.37551 0-40.228571-6.269388-56.946939-18.808163-30.302041-21.942857-44.930612-58.514286-38.661225-95.085714l24.032654-141.061225c3.134694-18.285714-3.134694-36.571429-16.195919-49.110204L123.297959 509.910204c-26.644898-26.122449-36.04898-64.261224-24.555102-99.787755 11.493878-35.526531 41.795918-61.126531 78.889796-66.35102l141.583674-20.375511c18.285714-2.612245 33.959184-14.106122 41.795918-30.30204l63.216326-128.522449C440.946939 130.612245 474.383673 109.714286 512 109.714286s71.053061 20.897959 87.24898 54.334694L662.987755 292.571429c8.359184 16.195918 24.032653 27.689796 41.795918 30.30204l141.583674 20.375511c37.093878 5.22449 67.395918 30.82449 78.889796 66.35102 11.493878 35.526531 2.089796 73.665306-24.555102 99.787755l-102.4 99.787755c-13.061224 12.538776-19.330612 31.346939-16.195919 49.110204l24.032654 141.061225c6.269388 37.093878-8.359184 73.142857-38.661225 95.085714-30.302041 21.942857-69.485714 24.555102-102.4 7.314286L538.122449 836.440816c-16.195918-8.359184-35.526531-8.359184-51.722449 0l-126.955102 66.87347c-14.628571 7.314286-30.302041 10.971429-45.453061 10.971428z m162.481632-96.653061z';

function getStarIcon(size = 18) {
    return `<svg class="star-ico" viewBox="0 0 1024 1024" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="vertical-align:-2px;display:inline-block;filter:drop-shadow(0 0 3px rgba(242,203,81,0.55));"><path d="${STAR_ICON_PATH}" fill="#F2CB51"/></svg>`;
}

// ----- 获取当前称号（10级递进）-----
function getCurrentTitle() {
    const p = G.levelProgress;
    if (p >= 3) return '武林盟主';
    if (p === 2) return '江湖神话';
    if (p === 1) return '一代宗师';

    const total = getTotalCards();
    const collected = getCollectedCards();

    if (collected === total && total > 0) return '门派掌门';
    if (collected >= 15) return '掌门候选人';
    if (collected >= 12) return '门派长老';
    if (collected >= 9) return '核心弟子';
    if (collected >= 6) return '内门高手';
    if (collected >= 3) return '外门弟子';
    return '江湖菜鸟';
}

function getTitleCongrats(title) {
    const map = {
        '江湖菜鸟': '初入江湖，前路漫漫。愿你在物理的武林中，找到属于自己的道！',
        '外门弟子': '恭喜！你已习得三门基础心法，正式踏入外门。江湖，才刚刚开始！',
        '内门高手': '六式已成，内力渐长！你已跻身内门高手之列，招式愈发纯熟。',
        '核心弟子': '九式贯通，锋芒毕露！你已成为门派核心，众弟子皆以你为榜样。',
        '门派长老': '十二式炉火纯青，德高望重！长老之位，非你莫属。',
        '掌门候选人': '十五式大成，距掌门之位仅一步之遥！全派上下，都在等待你登顶的那一刻。',
        '门派掌门': '十七式尽数掌握，武功盖世！今日起，你便是本派掌门，号令群雄，莫敢不从！试炼之地已为你开启——去征服更高的境界吧！',
        '一代宗师': '竹林试炼，一招一式皆入化境！你已超越掌门之境，开宗立派，自成一家。江湖人称：一代宗师！',
        '江湖神话': '武林擂台上，你以绝世武功连败强敌！你的传说已在江湖流传，成为人人敬仰的神话！',
        '武林盟主': '华山之巅，群雄俯首！你以无双武艺统御武林，号令天下，莫敢不从。今日起，你便是——武林盟主！物理江湖，唯你独尊！'
    };
    return map[title] || '继续修炼，更高的境界在等你！';
}

// ================================================================
// 通用提示弹窗（替代浏览器原生 alert / confirm）
// ================================================================
function showGameModal({ icon = '⚔️', title = '江湖传讯', desc = '', buttons = [] } = {}) {
    const overlay = document.getElementById('gameModal');
    if (!overlay) return;
    const iconEl = document.getElementById('gmIcon');
    const titleEl = document.getElementById('gmTitle');
    const descEl = document.getElementById('gmDesc');
    const actionsEl = document.getElementById('gmActions');
    if (iconEl) {
        if (typeof icon === 'string' && icon.trim().startsWith('<svg')) {
            iconEl.innerHTML = icon;  // 支持传入 SVG 图标
        } else {
            iconEl.textContent = icon;
        }
    }
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (actionsEl) {
        actionsEl.innerHTML = '';
        const btns = buttons.length === 0 ? [{ text: '知道了', cls: 'btn-primary' }] : buttons;
        btns.forEach(btn => {
            const b = document.createElement('button');
            b.textContent = btn.text || '知道了';
            b.className = btn.cls || 'btn-primary';
            b.onclick = () => {
                if (btn.closeAfterClick !== false) closeGameModal();
                if (typeof btn.onClick === 'function') btn.onClick();
            };
            actionsEl.appendChild(b);
        });
    }
    overlay.classList.add('show');
}

function closeGameModal() {
    const overlay = document.getElementById('gameModal');
    if (overlay) overlay.classList.remove('show');
}

// 异步确认弹窗（替代 confirm）：onConfirm / onCancel 为回调
function confirmGameModal(msg, { icon = '❓', title = '确认操作' } = {}, onConfirm, onCancel) {
    showGameModal({
        icon,
        title,
        desc: msg,
        buttons: [
            { text: '取消', cls: 'btn-secondary', onClick: onCancel },
            { text: '确定', cls: 'btn-primary', onClick: onConfirm }
        ]
    });
}

// ================================================================
// 段位晋升弹窗（带图标，7 秒后自动消失）
// ================================================================
let titlePopupTimer = null;
let unlockPopupTimer = null;
function showTitlePopup(title, congrats) {
    const overlay = document.getElementById('titlePopup');
    if (!overlay) return;
    const iconEl = document.getElementById('tpIcon');
    const titleEl = document.getElementById('tpTitle');
    const congratsEl = document.getElementById('tpCongrats');
    const labelEl = document.querySelector('.tp-label');
    if (iconEl) iconEl.innerHTML = getTitleBadge(title);
    if (titleEl) titleEl.textContent = title;
    if (congratsEl) congratsEl.textContent = congrats || '段位晋升！';
    if (labelEl) labelEl.textContent = '晋升 · 江湖段位';
    overlay.classList.add('show');
    playSfx('levelup');
    if (titlePopupTimer) clearTimeout(titlePopupTimer);
    titlePopupTimer = setTimeout(() => {
        overlay.classList.remove('show');
    }, 7000);
}
window.showTitlePopup = showTitlePopup;

// 玩法/建筑解锁弹窗（独立元素与动画：image 传 3D 图片，icon 传 emoji，如 🏯）
function showUnlockPopup({ image, icon, title, desc } = {}) {
    const overlay = document.getElementById('unlockPopup');
    if (!overlay) return;
    const iconEl = document.getElementById('upIcon');
    const titleEl = document.getElementById('upTitle');
    const descEl = document.getElementById('upDesc');
    if (iconEl) {
        iconEl.innerHTML = image
            ? `<img src="${image}" alt="" />`
            : `<span class="up-emoji">${icon || '🏯'}</span>`;
    }
    if (titleEl) titleEl.textContent = title || '';
    if (descEl) descEl.textContent = desc || '';
    overlay.classList.add('show');
    playSfx('levelup');
    if (unlockPopupTimer) clearTimeout(unlockPopupTimer);
    unlockPopupTimer = setTimeout(() => overlay.classList.remove('show'), 7000);
}
window.showUnlockPopup = showUnlockPopup;

// ----- 更新主界面（门派地图状态）-----
function updateMainUI() {
    const total = getTotalCards();
    const collected = getCollectedCards();

    // 藏经阁：进度 + 灯火点亮（8 扇窗按比例点亮）
    const cp = document.getElementById('collectProgress');
    if (cp) cp.textContent = `已参悟 ${collected} / ${total} 本`;
    const cc = document.getElementById('cardCount');
    if (cc) cc.textContent = collected;
    const ct = document.getElementById('cardTotal');
    if (ct) ct.textContent = total;
    const wins = document.querySelectorAll('#libWindows .win');
    const litCount = total > 0 ? Math.round((collected / total) * wins.length) : 0;
    wins.forEach((w, i) => w.classList.toggle('lit', i < litCount));

    const allCollected = (total > 0 && collected === total);

    // 演武场：未集齐秘籍 -> 迷雾封印；集齐 -> 解锁
    const levelCard = document.getElementById('levelCard');
    const levelStatus = document.getElementById('levelStatus');
    if (levelCard) {
        if (allCollected) {
            levelCard.classList.remove('locked');
            if (levelStatus) levelStatus.textContent = '已开启 · 比武闯关';
        } else {
            levelCard.classList.add('locked');
            if (levelStatus) levelStatus.textContent = `需集齐 ${total} 本秘籍`;
        }
    }
    // 未解锁演武场时不显示“重登擂台”
    const arenaAction = document.getElementById('arenaAction');
    if (arenaAction) arenaAction.style.display = allCollected ? '' : 'none';

    // 问道崖：武林盟主方可踏足
    const competeCard = document.getElementById('competeCard');
    const competeStatus = document.getElementById('competeStatus');
    if (competeCard) {
        if (G.levelProgress >= 3) {
            competeCard.classList.remove('locked');
            if (competeStatus) competeStatus.textContent = '已开启 · 破解天道谜题';
        } else {
            competeCard.classList.add('locked');
            if (competeStatus) competeStatus.textContent = '武林盟主方可踏足';
        }
    }

    // 百草园：随时可进
    const fightStatus = document.getElementById('fightStatus');
    if (fightStatus) fightStatus.textContent = '随时可进 · 采药练功';

    const title = getCurrentTitle();
    document.getElementById('titleDisplay').innerHTML = `${getTitleBadge(title)}<span class="title-name">${title}</span>`;
    document.getElementById('starCount').textContent = G.totalStars || 0;

    // 同步 3D 沙盘状态（藏经阁灯火 / 演武场 / 问道崖解锁）
    if (window.SECT3D) {
        window.SECT3D.setProgress(collected, total, G.levelProgress);
    }
}

// ----- 进入主界面 -----
function enterMain() {
    showPage('pageMain');
    updateMainUI();
}

// ----- 进入天机阁 / 问道崖 -----
function enterCompete() {
    if (G.levelProgress < 3) {
        showGameModal({
            icon: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M558.208 913.792l-5.248-21.504s-60.288-197.76-136.32-353.344c53.632-149.888 127.04-349.312 148.8-379.136 35.392-48.576 135.68-127.104 224 139.2 110.464 333.12 169.792 614.784 169.792 614.784H558.208z m162.688-591.68c-36.032-88.32-68.032-113.28-102.4-93.184-34.304 20.224-86.592 225.6-86.592 225.6s31.104-25.92 58.56-28.032c27.456-2.112 65.28 48.896 65.28 48.896s21.632-63.04 47.296-60.672c25.664 2.368 68.608 34.24 68.608 34.24s-14.784-38.528-50.752-126.848zM506.24 913.792l-441.6-1.792s94.464-238.272 123.008-319.104c28.544-80.832 83.52-206.848 158.208-90.304 74.688 116.48 142.848 339.84 142.848 339.84l17.536 71.36z m-178.944-284.16c-19.456-47.104-36.608-60.416-54.976-49.536-18.304 10.88-45.76 120.96-45.76 120.96s16.576-13.952 31.232-15.168c14.72-1.216 35.072 25.984 35.072 25.984s11.392-33.792 25.088-32.576c13.824 1.216 36.864 18.048 36.864 18.048s-8-20.48-27.52-67.648z" fill="#ffffff"/></svg>`,
            title: '问道崖 · 尚未开启',
            desc: '「问道崖」乃武林盟主参悟天道之地。\n唯有闯过演武场全部 3 关、登临盟主之位者，方有资格踏足于此！'
        });
        return;
    }
    if (typeof initCompete === 'function') {
        initCompete();
    } else {
        showGameModal({ icon: '⚠️', title: '数据未加载', desc: '天机阁数据未加载，请刷新页面。' });
    }
}

// 3D 沙盘建筑点击回调（由 sect3d.js 调用）
window.onSectClick = function(type) {
    if (type === 'library') showCardCollection();
    else if (type === 'garden') enterFight();
    else if (type === 'arena') showLevelSelect();
    else if (type === 'cliff') enterCompete();
};

// ================================================================
// 重置功能
// ================================================================

// 散功重修：封印所有秘籍，段位与闯关战绩一并抹去，内力一并清零，从头再来
function resetCards() {
    confirmGameModal(
        '大侠当真要「散功重修」吗？\n\n所有已参悟的秘籍将被封印，江湖段位与闯关战绩、累积内力值将一并抹去，一切从头再来。',
        { icon: '', title: '散功重修' },
        () => {
            G.collected = [];
            G.levelProgress = 0;
            G.currentLevel = 0;
            G.titles = [];
            G.totalStars = 0;
            G.cooldownUntil = 0;
            G.notifiedTitles = [];
            saveState();
            updateMainUI();
            if (document.getElementById('pageCards').classList.contains('active')) {
                if (window.renderCardGrid) renderCardGrid();
                if (window.updateCardStatus) updateCardStatus();
            }
            showGameModal({ icon: '', title: '散功重修', desc: '大侠已散尽一身修为，从江湖菜鸟重新起步。' });
        }
    );
}

// 重登擂台：仅清空演武场战绩，段位回退至门派掌门境界，秘籍与内力保留
function resetLevels() {
    confirmGameModal(
        '大侠要「重登擂台」再战吗？\n\n演武场战绩将清零，段位回退至门派掌门境界。\n已参悟的秘籍与累积内力值将保留。',
        { icon: '', title: '重登擂台' },
        () => {
            G.levelProgress = 0;
            G.currentLevel = 0;
            G.titles = G.titles.filter(t => !t.includes('一代宗师') && !t.includes('江湖神话') && !t.includes('武林盟主'));
            saveState();
            updateMainUI();
            showGameModal({ icon: '', title: '重登擂台', desc: '演武场战绩已清零，大侠以门派掌门之姿再战群雄！' });
        }
    );
}

// 暴露全局
window.G = G;
window.saveState = saveState;
window.playSfx = playSfx;
window.startCooldown = startCooldown;
window.isInCooldown = isInCooldown;
window.getCooldownRemaining = getCooldownRemaining;
window.showCooldown = showCooldown;
window.closeCooldown = closeCooldown;
window.showGameModal = showGameModal;
window.closeGameModal = closeGameModal;
window.confirmGameModal = confirmGameModal;
window.updateMainUI = updateMainUI;
window.enterMain = enterMain;
window.enterCompete = enterCompete;
window.showPage = showPage;
window.renderKatex = renderKatex;
window.renderDisplayKatex = renderDisplayKatex;
window.shuffleArray = shuffleArray;
window.getCurrentTitle = getCurrentTitle;
window.getTitleCongrats = getTitleCongrats;
window.getTotalCards = getTotalCards;
window.getCollectedCards = getCollectedCards;
window.resetCards = resetCards;
window.resetLevels = resetLevels;

// ----- 页面加载后的初始化 -----
document.addEventListener('DOMContentLoaded', function() {
    // 背景音乐（首次交互后自动播放，全流程循环）
    initBgm();
    // 冷却已禁用，无需检查
    updateMainUI();

    document.getElementById('btnBack').addEventListener('click', () => {
    const active = document.querySelector('.page.active');
    if (active) {
        // 主界面点击返回 → 回到封面
        if (active.id === 'pageMain') {
            showPage('pageWelcome');
            return;
        }
        // 演武场闯关答题中：返回 → 回到演武场关卡地图（而非江湖地图）
        if (active.id === 'pageLevels' && typeof isLevelInQuiz === 'function' && isLevelInQuiz()) {
            if (typeof renderAdventureMap === 'function') renderAdventureMap();
            return;
        }
        if (active.id === 'pageCards' || active.id === 'pageLevels' || active.id === 'pageCompete' || active.id === 'pageFight') {
            showPage('pageMain');
            updateMainUI();
        }
    }
});

    console.log('⚔️ 公式江湖已加载！（冷却功能已临时禁用，仅显示1秒提示）');
    console.log(`📊 总秘籍数: ${getTotalCards()}, 已收集: ${getCollectedCards()}`);
    console.log(`⚔️ 试炼进度: ${G.levelProgress}/3`);
    console.log(`🏆 当前称号: ${getCurrentTitle()}`);
});