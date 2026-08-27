/* ============================================================
 * 背多分 · 消消乐系统 —— 设置管理模块
 * 作用：设置面板的显隐、localStorage 读写、图片/音频/名单文件上传、
 *       以及保存设置后重建游戏界面。
 * 依赖：config.js、state.js、audio.js、parsers.js、game.js
 * 全局函数（供 HTML 内联属性调用）：
 *   window.toggleSettings / handleBgImageUpload / handleClickSoundUpload
 *   / handleMusicUpload / handleStudentFileUpload / saveAllSettings
 * ============================================================ */
(function () {
    'use strict';

    const G = window.ReciteGame;
    const S = G.state;
    const KEYS = G.STORAGE_KEYS;

    // 同步设置界面与游戏界面的标题文字
    function applyTitleText() {
        document.getElementById('mainTitleText').textContent = S.mainTitleText;
        document.getElementById('settingsTitleText').textContent = S.mainTitleText;
    }

    // 网页内提示弹窗（替代浏览器原生 alert）
    let toastTimer = null;
    function showToast(message) {
        const el = document.getElementById('toastMessage');
        el.textContent = message;
        el.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
    }

    // 标记设置是否被修改过（用于进入游戏前的未保存提示）
    let settingsDirty = false;
    function bindSettingsDirtyTracking() {
        const dirtyInputs = [
            'titleInput',
            'examDateInput',
            'studentListInput',
            'leftMotivationInput',
            'rightMotivationInput',
        ];
        dirtyInputs.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            ['input', 'change'].forEach(type => {
                el.addEventListener(type, () => { settingsDirty = true; });
            });
        });
    }

    // ============================================================
    //  💾 从 localStorage 加载设置
    // ============================================================
    function loadSettingsFromStorage() {
        const savedTitle = localStorage.getItem(KEYS.TITLE);
        if (savedTitle) S.mainTitleText = savedTitle;
        applyTitleText();
        document.getElementById('titleInput').value = S.mainTitleText;

        const savedDate = localStorage.getItem(KEYS.EXAM_DATE);
        if (savedDate) {
            S.examDateStr = savedDate;
            document.getElementById('examDateInput').value = S.examDateStr;
        } else {
            // 未保存时使用默认中考日期（2027-06-30）
            S.examDateStr = G.DEFAULTS.EXAM_DATE;
            document.getElementById('examDateInput').value = S.examDateStr;
        }

        const savedBg = localStorage.getItem(KEYS.BG_IMAGE);
        if (savedBg) {
            S.bgImageDataUrl = savedBg;
            document.getElementById('bgImageName').textContent = '已加载背景图';
        } else {
            S.bgImageDataUrl = null;
            document.getElementById('bgImageName').textContent = '未上传';
        }

        const savedClickSound = localStorage.getItem(KEYS.CLICK_SOUND);
        if (savedClickSound) {
            S.clickSoundDataUrl = savedClickSound;
            G.audio.clickAudio.src = S.clickSoundDataUrl;
            document.getElementById('clickSoundName').textContent = '已加载点击音效';
        } else {
            S.clickSoundDataUrl = null;
            G.audio.clickAudio.src = '';
            document.getElementById('clickSoundName').textContent = '未上传(默认叮咚)';
        }

        const savedMusic = localStorage.getItem(KEYS.MUSIC);
        if (savedMusic) {
            S.successMusicDataUrl = savedMusic;
            G.audio.successAudio.src = S.successMusicDataUrl;
            document.getElementById('musicFileName').textContent = '已加载音乐';
        } else {
            S.successMusicDataUrl = null;
            G.audio.successAudio.src = '';
            document.getElementById('musicFileName').textContent = '未上传';
        }

        const savedStudents = localStorage.getItem(KEYS.STUDENTS);
        if (savedStudents) {
            try {
                S.currentStudents = JSON.parse(savedStudents);
                const textLines = S.currentStudents.map(s => `${s.id} ${s.name}`).join('\n');
                document.getElementById('studentListInput').value = textLines;
            } catch (e) {
                S.currentStudents = [];
                document.getElementById('studentListInput').value = '';
            }
        } else {
            S.currentStudents = [];
            document.getElementById('studentListInput').value = '';
        }

        const savedLeft = localStorage.getItem(KEYS.LEFT_MOTTO) || S.leftMotto;
        S.leftMotto = savedLeft;
        document.getElementById('leftMotivationInput').value = S.leftMotto;
        const savedRight = localStorage.getItem(KEYS.RIGHT_MOTTO) || S.rightMotto;
        S.rightMotto = savedRight;
        document.getElementById('rightMotivationInput').value = S.rightMotto;

        document.getElementById('leftMotivationText').textContent = S.leftMotto;
        document.getElementById('rightMotivationText').textContent = S.rightMotto;

        // 绑定“未保存”监听并重置脏标记
        settingsDirty = false;
        bindSettingsDirtyTracking();
    }

    // ============================================================
    //  🖥️ 界面切换（设置界面 ⇄ 游戏界面）
    // ============================================================
    function showSettingsScreen() {
        // 返回设置时，隐藏通关提示并停止通关音乐
        G.audio.stopSuccessMessageAndMusic();
        document.body.classList.remove('in-game');
        window.scrollTo(0, 0);
    }

    function showGameScreen() {
        document.body.classList.add('in-game');
        window.scrollTo(0, 0);
    }
    window.showGameScreen = showGameScreen;

    // 进入游戏：若设置有未保存的修改，先弹窗提示
    window.enterGame = function () {
        if (settingsDirty) {
            document.getElementById('unsavedModal').classList.add('show');
        } else {
            showGameScreen();
        }
    };
    window.closeUnsavedModal = function () {
        document.getElementById('unsavedModal').classList.remove('show');
    };
    window.saveAndEnterGame = function () {
        closeUnsavedModal();
        saveAllSettings();
    };
    window.enterGameWithoutSave = function () {
        closeUnsavedModal();
        settingsDirty = false;
        showGameScreen();
    };

    // 点击游戏界面中的「系统设置」→ 切回设置界面
    window.toggleSettings = function () {
        showSettingsScreen();
    };

    // ============================================================
    //  📁 文件上传（仅暂存，保存时才写入 localStorage）
    // ============================================================
    // 上传图片自动适配：图片过大时按比例缩小并压缩，便于保存与显示
    function compressImageIfNeeded(file, originalDataUrl, callback) {
        const img = new Image();
        img.onload = function () {
            const MAX = 512; // 最大边（px），泡泡仅 150px，512 足够清晰
            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            if (scale >= 1) {
                // 图片本身不大，直接使用原图
                callback(originalDataUrl, false);
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // PNG 保留透明背景，其他格式用 JPEG 减小体积
            const isPng = /image\/png/i.test(file.type || img.src);
            const dataUrl = isPng
                ? canvas.toDataURL('image/png')
                : canvas.toDataURL('image/jpeg', 0.85);
            callback(dataUrl, true);
        };
        img.onerror = function () {
            callback(originalDataUrl, false);
        };
        img.src = originalDataUrl;
    }

    window.handleBgImageUpload = function (event) {
        const file = event.target.files[0];
        if (!file) return;
        settingsDirty = true;
        const reader = new FileReader();
        reader.onload = function (e) {
            const originalDataUrl = e.target.result;
            // 自动适配：过大则缩小压缩
            compressImageIfNeeded(file, originalDataUrl, function (adaptedDataUrl, adapted) {
                S.bgImageDataUrl = adaptedDataUrl;
                document.getElementById('bgImageName').textContent =
                    adapted ? file.name + '（已自动适配）' : file.name;
            });
        };
        reader.readAsDataURL(file);
    };

    window.handleClickSoundUpload = function (event) {
        const file = event.target.files[0];
        if (!file) return;
        settingsDirty = true;
        const reader = new FileReader();
        reader.onload = function (e) {
            S.clickSoundDataUrl = e.target.result;
            document.getElementById('clickSoundName').textContent = file.name;
        };
        reader.readAsDataURL(file);
    };

    window.handleMusicUpload = function (event) {
        const file = event.target.files[0];
        if (!file) return;
        settingsDirty = true;
        const reader = new FileReader();
        reader.onload = function (e) {
            S.successMusicDataUrl = e.target.result;
            document.getElementById('musicFileName').textContent = file.name;
        };
        reader.readAsDataURL(file);
    };

    window.handleStudentFileUpload = async function (event) {
        const file = event.target.files[0];
        if (!file) return;
        settingsDirty = true;
        const fileName = file.name;
        document.getElementById('studentFileName').textContent = fileName;

        try {
            let students = [];
            if (/\.(xls|xlsx)$/i.test(fileName)) {
                students = await G.parsers.parseExcelFile(file);
            } else {
                const content = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsText(file, 'UTF-8');
                });
                students = G.parsers.parseTextFile(content);
                if (students.length === 0) {
                    showToast('未能从文件中解析到学生数据，请确保格式为“学号 姓名”每行一个');
                    return;
                }
            }
            S.currentStudents = students;
            document.getElementById('studentListInput').value = students.map(s => `${s.id} ${s.name}`).join('\n');
        } catch (err) {
            showToast('解析文件失败：' + err.message);
            document.getElementById('studentFileName').textContent = '解析失败';
        }
    };

    // ============================================================
    //  💾 保存设置并应用
    // ============================================================
    window.saveAllSettings = function () {
        S.mainTitleText = document.getElementById('titleInput').value.trim() || '「背多分」消消乐系统';
        applyTitleText();
        localStorage.setItem(KEYS.TITLE, S.mainTitleText);

        S.examDateStr = document.getElementById('examDateInput').value;
        if (S.examDateStr) {
            localStorage.setItem(KEYS.EXAM_DATE, S.examDateStr);
        } else {
            localStorage.removeItem(KEYS.EXAM_DATE);
        }

        if (S.bgImageDataUrl) {
            try {
                localStorage.setItem(KEYS.BG_IMAGE, S.bgImageDataUrl);
            } catch (e) {
                showToast('背景图片太大，无法保存到本地存储，请使用较小的图片文件。');
                return;
            }
        } else {
            localStorage.removeItem(KEYS.BG_IMAGE);
        }

        if (S.clickSoundDataUrl) {
            try {
                localStorage.setItem(KEYS.CLICK_SOUND, S.clickSoundDataUrl);
                G.audio.clickAudio.src = S.clickSoundDataUrl;
            } catch (e) {
                showToast('点击音效文件太大，无法保存，请使用较小的音频文件（建议<1MB）。');
                return;
            }
        } else {
            localStorage.removeItem(KEYS.CLICK_SOUND);
            G.audio.clickAudio.src = '';
        }

        if (S.successMusicDataUrl) {
            try {
                localStorage.setItem(KEYS.MUSIC, S.successMusicDataUrl);
                G.audio.successAudio.src = S.successMusicDataUrl;
            } catch (e) {
                showToast('通关音乐文件太大，无法保存，请使用较小的音频文件（建议<4MB）。');
                return;
            }
        } else {
            localStorage.removeItem(KEYS.MUSIC);
            G.audio.successAudio.src = '';
        }

        const studentText = document.getElementById('studentListInput').value;
        const students = G.parsers.parseStudentListFromText(studentText);
        if (students.length === 0 && studentText.trim() !== '') {
            showToast('未能解析到有效学生，请按照“学号 姓名”格式每行一个，或上传Excel文件。');
            return;
        }
        S.currentStudents = students;
        localStorage.setItem(KEYS.STUDENTS, JSON.stringify(S.currentStudents));

        S.leftMotto = document.getElementById('leftMotivationInput').value.trim() || '每一次背诵';
        S.rightMotto = document.getElementById('rightMotivationInput').value.trim() || '都在为未来铺路！';
        localStorage.setItem(KEYS.LEFT_MOTTO, S.leftMotto);
        localStorage.setItem(KEYS.RIGHT_MOTTO, S.rightMotto);
        document.getElementById('leftMotivationText').textContent = S.leftMotto;
        document.getElementById('rightMotivationText').textContent = S.rightMotto;

        G.audio.stopSuccessMessageAndMusic();
        G.game.rebuildBubbles();

        // 保存完成后清除“未保存”标记并进入游戏界面
        settingsDirty = false;
        showGameScreen();
        showToast('设置已保存！');
    };

    // ---------- 导出 ----------
    G.settings = {
        loadSettingsFromStorage: loadSettingsFromStorage,
        showSettingsScreen: showSettingsScreen,
        showGameScreen: showGameScreen,
    };
})();
