/* ============================================================
 * 背多分 · 消消乐系统 —— 核心游戏模块
 * 作用：创建学生泡泡、浮动动画、消除/复习交互、重置、通关检测。
 * 依赖：state.js、audio.js、effects.js
 * 对外暴露：ReciteGame.game
 *   - createStudentBubble(student)  创建单个学生泡泡
 *   - rebuildBubbles()              依据当前学生列表重建全部泡泡
 *   - startFloatingAnimation(bubble) 启动泡泡浮动动画
 *   - checkSuccessMessage()         检查是否全部通关
 * 全局函数：window.resetNames（供 HTML onclick 调用）
 * ============================================================ */
(function () {
    'use strict';

    const G = window.ReciteGame;
    const S = G.state;

    // ============================================================
    //  🫧 浮动动画
    // ============================================================
    function startFloatingAnimation(bubble) {
        // 如果已经 eliminated 或 bursting，不启动浮动
        if (bubble.classList.contains('eliminated') || bubble.classList.contains('bursting')) return;

        let offsetX = 0,
            offsetY = 0;
        let dirX = Math.random() > 0.5 ? 1 : -1;
        let dirY = Math.random() > 0.5 ? 1 : -1;
        const maxOffset = 10;

        function animate() {
            // 检查是否应该停止
            if (bubble.classList.contains('eliminated') || bubble.classList.contains('bursting')) {
                bubble.animationFrameId = null;
                return;
            }
            if (Math.random() < 0.05) dirX *= -1;
            if (Math.random() < 0.05) dirY *= -1;

            offsetX += dirX * 0.35;
            offsetY += dirY * 0.35;

            if (offsetX > maxOffset) { offsetX = maxOffset;
                dirX = -1; } else if (offsetX < -maxOffset) { offsetX = -maxOffset;
                dirX = 1; }
            if (offsetY > maxOffset) { offsetY = maxOffset;
                dirY = -1; } else if (offsetY < -maxOffset) { offsetY = -maxOffset;
                dirY = 1; }

            // 如果处于消除状态，不应用浮动偏移
            if (!bubble.classList.contains('eliminated') && !bubble.classList.contains('bursting')) {
                bubble.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            }
            bubble.animationFrameId = requestAnimationFrame(animate);
        }
        bubble.animationFrameId = requestAnimationFrame(animate);
    }

    // ============================================================
    //  🧑‍🎓 创建学生泡泡
    // ============================================================
    function createStudentBubble(student) {
        const bubble = document.createElement('div');
        bubble.className = 'dragon-bubble';
        if (S.bgImageDataUrl) {
            bubble.style.backgroundImage = `url(${S.bgImageDataUrl})`;
            bubble.classList.remove('default-bg');
        } else {
            bubble.classList.add('default-bg');
            const placeholder = document.createElement('span');
            placeholder.className = 'default-placeholder';
            placeholder.textContent = '🐲';
            bubble.appendChild(placeholder);
        }

        const checkmark = document.createElement('img');
        checkmark.className = 'checkmark';
        checkmark.src =
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMjAuMjg1IDJsLTExLjI4NSAxMS41NjctNS4yODYtNS4wMTEtMy43MTQgMy43MTYgOSA4LjcyOCAxNS0xNS4yODV6IiBmaWxsPSIjMDBjMDAwIi8+PC9zdmc+';
        checkmark.alt = '✓';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'student-info';
        const idSpan = document.createElement('span');
        idSpan.className = 'student-id';
        idSpan.textContent = student.id;
        const nameSpan = document.createElement('span');
        nameSpan.className = 'student-name';
        nameSpan.textContent = student.name;
        infoDiv.appendChild(idSpan);
        infoDiv.appendChild(nameSpan);

        bubble.appendChild(checkmark);
        bubble.appendChild(infoDiv);

        // ---------- 点击事件 ----------
        bubble.onclick = function (e) {
            e.stopPropagation();

            // 正在播放破裂动画，忽略点击
            if (this.classList.contains('bursting')) return;

            if (this.classList.contains('eliminated')) {
                // ----- 已消除 → 取消消除（复习模式） -----
                this.classList.remove('eliminated');
                // 重新启动浮动（但先取消旧动画）
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
                // 重置 transform
                this.style.transform = '';
                startFloatingAnimation(this);
                G.audio.playClickSound();
                // 检查成功消息（可能从全部通关变成未通关）
                checkSuccessMessage();
            } else {
                // ----- 未消除 → 播放破裂 → 变为消除 -----
                G.fx.playBurstEffect(this);
            }
        };

        // 启动浮动
        startFloatingAnimation(bubble);
        return bubble;
    }

    // ============================================================
    //  🏗️ 重建所有泡泡
    // ============================================================
    function rebuildBubbles() {
        const container = document.getElementById('nameContainer');
        const oldBubbles = container.querySelectorAll('.dragon-bubble');
        oldBubbles.forEach(b => {
            if (b.animationFrameId) cancelAnimationFrame(b.animationFrameId);
        });
        container.innerHTML = '';

        if (S.currentStudents.length === 0) {
            container.innerHTML =
                '<div style="grid-column:1/-1; text-align:center; color:#64748b; padding:40px;">👩‍🏫 请先在设置中上传班级名单</div>';
            return;
        }

        S.currentStudents.forEach(student => {
            container.appendChild(createStudentBubble(student));
        });
    }

    // ============================================================
    //  🔄 重置（重新挑战，带确认弹窗防止误触）
    // ============================================================
    window.openResetConfirm = function () {
        document.getElementById('resetConfirmModal').classList.add('show');
    };
    window.closeResetConfirm = function () {
        document.getElementById('resetConfirmModal').classList.remove('show');
    };
    window.confirmReset = function () {
        closeResetConfirm();
        resetNames();
    };
    window.resetNames = function () {
        const successAudio = G.audio.successAudio;
        successAudio.pause();
        successAudio.currentTime = 0;
        if (S.successMessageActive) {
            document.getElementById('successMessage').classList.remove('show');
            S.successMessageActive = false;
        }

        const bubbles = document.querySelectorAll('.dragon-bubble');
        bubbles.forEach(bubble => {
            // 移除消除状态
            bubble.classList.remove('eliminated');
            // 移除破裂状态
            bubble.classList.remove('bursting');
            // 停止旧动画
            if (bubble.animationFrameId) {
                cancelAnimationFrame(bubble.animationFrameId);
                bubble.animationFrameId = null;
            }
            // 重置 transform
            bubble.style.transform = '';
            // 重新启动浮动
            startFloatingAnimation(bubble);
        });
    };

    // ============================================================
    //  🏆 通关检测
    // ============================================================
    function checkSuccessMessage() {
        const allBubbles = document.querySelectorAll('.dragon-bubble');
        if (allBubbles.length === 0) return;
        const allEliminated = Array.from(allBubbles).every(b => b.classList.contains('eliminated'));

        if (allEliminated && !S.successMessageActive) {
            S.successMessageActive = true;
            document.getElementById('successMessage').classList.add('show');

            // 播放通关音乐
            const successAudio = G.audio.successAudio;
            if (successAudio.src && successAudio.src !== window.location.href) {
                successAudio.currentTime = 0;
                successAudio.play().catch(() => {
                    const playOnClick = () => {
                        successAudio.play();
                        document.removeEventListener('click', playOnClick);
                    };
                    document.addEventListener('click', playOnClick, { once: true });
                });
            }
        } else if (!allEliminated && S.successMessageActive) {
            S.successMessageActive = false;
            document.getElementById('successMessage').classList.remove('show');
            const successAudio = G.audio.successAudio;
            successAudio.pause();
            successAudio.currentTime = 0;
        }
    }

    // ---------- 导出 ----------
    G.game = {
        createStudentBubble: createStudentBubble,
        rebuildBubbles: rebuildBubbles,
        startFloatingAnimation: startFloatingAnimation,
        checkSuccessMessage: checkSuccessMessage,
    };
})();
