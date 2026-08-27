/* ============================================================
 * 背多分 · 消消乐系统 —— 破裂特效模块
 * 作用：泡泡点击破裂时的彩色碎片粒子效果。
 * 依赖：state.js、audio.js、game.js（通关检测）
 * 对外暴露：ReciteGame.fx
 *   - createFragments(centerX, centerY, count)  创建碎片粒子
 *   - playBurstEffect(bubble)                   播放一个泡泡的破裂效果
 * ============================================================ */
(function () {
    'use strict';

    const G = window.ReciteGame;

    // ============================================================
    //  🎆 破裂效果核心
    // ============================================================
    function createFragments(centerX, centerY, count) {
        const colors = [
            '#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB',
            '#0ABDE3', '#10AC84', '#EE5A24', '#5F27CD',
            '#FF9FF3', '#54A0FF', '#5F6DEC', '#FF6348',
            '#7BED9F', '#F368E0', '#00D2D3', '#FFC312'
        ];
        const fragmentCount = count || 16;
        const fragments = [];

        for (let i = 0; i < fragmentCount; i++) {
            const frag = document.createElement('div');
            const size = 6 + Math.random() * 14;
            const isSquare = Math.random() > 0.7;
            const isStar = Math.random() > 0.85;
            const angle = Math.random() * 2 * Math.PI;
            const distance = 70 + Math.random() * 130;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const duration = 0.5 + Math.random() * 0.4;

            frag.className = 'fragment';
            if (isSquare) frag.classList.add('square');
            if (isStar) frag.classList.add('star');

            const sizeFinal = isStar ? size * 1.2 : size;
            frag.style.cssText = `
                        width: ${sizeFinal}px;
                        height: ${sizeFinal}px;
                        background: ${color};
                        left: ${centerX}px;
                        top: ${centerY}px;
                        opacity: 1;
                        transition: all ${duration}s cubic-bezier(0.22, 1, 0.36, 1);
                        transform: translate(0, 0) scale(1) rotate(0deg);
                        box-shadow: 0 2px 12px rgba(0,0,0,0.2);
                    `;
            document.body.appendChild(frag);

            // 随机旋转偏移
            const rot = (Math.random() - 0.5) * 720;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;

            // 下一帧触发飞散
            requestAnimationFrame(() => {
                frag.style.transform = `translate(${dx}px, ${dy}px) scale(0) rotate(${rot}deg)`;
                frag.style.opacity = '0';
            });

            fragments.push({
                el: frag,
                duration: duration * 1000 + 100
            });
        }
        return fragments;
    }

    function playBurstEffect(bubble) {
        // 1. 停止浮动
        if (bubble.animationFrameId) {
            cancelAnimationFrame(bubble.animationFrameId);
            bubble.animationFrameId = null;
        }

        // 2. 获取泡泡中心位置（相对于视口）
        const rect = bubble.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 3. 创建碎片
        const frags = createFragments(centerX, centerY, 14 + Math.floor(Math.random() * 8));

        // 4. 泡泡本身播放破裂动画（通过 class）
        bubble.classList.add('bursting');

        // 5. 音效
        G.audio.playClickSound();

        // 6. 动画结束后，转为 eliminated 状态
        const burstDuration = 650;
        setTimeout(() => {
            // 移除破裂类
            bubble.classList.remove('bursting');
            // 变为消除状态
            bubble.classList.add('eliminated');
            // 清理碎片（额外安全）
            frags.forEach(f => {
                if (f.el.parentNode) f.el.remove();
            });
            // 检查是否全部通关
            G.game.checkSuccessMessage();
        }, burstDuration);

        // 7. 清理碎片（防止内存泄漏）
        setTimeout(() => {
            frags.forEach(f => {
                if (f.el.parentNode) f.el.remove();
            });
        }, burstDuration + 300);
    }

    // ---------- 导出 ----------
    G.fx = {
        createFragments: createFragments,
        playBurstEffect: playBurstEffect,
    };
})();
