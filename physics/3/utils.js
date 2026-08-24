// ================================================================
// utils.js — 通用工具：洗牌 / localStorage 封装 / KaTeX 按需加载与渲染
// ================================================================

// ----- 洗牌（Fisher–Yates）-----
export function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ----- localStorage 封装（统一读写 JSON）-----
export function loadJSON(key, fallback = null) {
    const raw = localStorage.getItem(key);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }
    return fallback;
}

export function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ----- KaTeX 按需加载（首屏不加载，首次渲染公式时再注入脚本）-----
const KATEX_URL = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
let katexPromise = null;

export function ensureKatex() {
    if (window.katex) return Promise.resolve(window.katex);
    if (!katexPromise) {
        katexPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = KATEX_URL;
            s.async = true;
            s.onload = () => resolve(window.katex);
            s.onerror = () => {
                katexPromise = null;
                reject(new Error('KaTeX 加载失败'));
            };
            document.head.appendChild(s);
        });
    }
    return katexPromise;
}

// ----- KaTeX 渲染（懒加载：未加载时先显示原文，加载完成后自动重渲染）-----
export function renderKatex(el, latex, displayMode = false) {
    if (!el) return;
    if (window.katex) {
        try {
            window.katex.render(latex, el, { throwOnError: false, displayMode });
        } catch (e) {
            el.textContent = latex;
        }
    } else {
        el.textContent = latex;
        ensureKatex().then(() => renderKatex(el, latex, displayMode)).catch(() => {});
    }
}

export function renderDisplayKatex(el, latex) {
    renderKatex(el, latex, true);
}

// ----- 触屏光标剑（平板/手机无鼠标光标：用手指跟随的小剑替代“光标剑”）-----
export function initTouchCursor() {
    if (typeof window.matchMedia !== 'function') return;
    // 仅当设备具备触屏能力（any-pointer: coarse）时启用；鼠标操作仍走 CSS 光标剑
    if (!window.matchMedia('(any-pointer: coarse)').matches) return;
    let el = document.getElementById('touchSword');
    if (!el) {
        el = document.createElement('div');
        el.id = 'touchSword';
        el.className = 'touch-sword';
        el.innerHTML = '<svg viewBox="0 0 1024 1024" aria-hidden="true"><use href="#icon-sword"></use></svg>';
        document.body.appendChild(el);
    }
    const show = () => el.classList.add('show');
    const hide = () => el.classList.remove('show');
    const move = (x, y) => {
        el.style.left = x + 'px';
        el.style.top = y + 'px';
    };
    document.addEventListener('pointerdown', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') { show(); move(e.clientX, e.clientY); }
    }, { passive: true });
    document.addEventListener('pointermove', (e) => {
        if (el.classList.contains('show')) move(e.clientX, e.clientY);
    }, { passive: true });
    document.addEventListener('pointerup', hide, { passive: true });
    document.addEventListener('pointercancel', hide, { passive: true });
}
