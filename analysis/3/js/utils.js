/**
 * utils.js —— 通用工具函数
 * 提示、转义、文件解析、排名计算、自然排序
 */
(function (App) {
    const E = App.elements;

    // 顶部右侧提示条
    function showToast(msg, type = 'info') {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        E.toastContainer.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(120%)';
            setTimeout(() => t.remove(), 400);
        }, 2800);
    }

    // 解析 Excel 文件（读取第一个工作表，返回有效成绩行）
    function parseFile(file, cb) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                if (!json || json.length < 2) { cb({ error: '数据不足' }); return; }
                const headers = json[0].map(h => String(h).trim());
                const rows = json.slice(1).filter(r => r.some(c => c !== '' && c !== null));
                const idx = identifyColumns(headers);
                if (!idx) { cb({ error: '列识别失败' }); return; }
                const valid = rows.filter(r => !isNaN(parseFloat(r[idx.scoreCol])));
                if (valid.length === 0) { cb({ error: '无有效成绩' }); return; }
                cb({ data: { headers, rows: valid, indices: idx } });
            } catch (err) { cb({ error: '解析失败' }); }
        };
        reader.onerror = () => cb({ error: '读取失败' });
        reader.readAsArrayBuffer(file);
    }

    // 根据表头识别列：学号、姓名、班级、成绩
    function identifyColumns(headers) {
        const h = headers.map((s, i) => ({ s, i }));
        const idCol = h.find(x => x.s.includes('学号'))?.i ?? 0;
        const nameCol = h.find(x => x.s.includes('姓名') || x.s.includes('名字'))?.i ?? 1;
        const classCol = h.find(x => x.s.includes('班级'))?.i ?? 2;
        const scoreCol = h.find(x => x.s.includes('成绩') || x.s.includes('总分') || x.s.includes('原始分'))?.i ?? 3;
        if ([idCol, nameCol, classCol, scoreCol].some(v => v === undefined)) return null;
        return { idCol, nameCol, classCol, scoreCol };
    }

    // 名次计算（并列名次取平均）
    function rankAvg(scores) {
        const sorted = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
        const ranks = new Array(scores.length);
        let i = 0;
        while (i < sorted.length) {
            let j = i;
            while (j < sorted.length && sorted[j].s === sorted[i].s) j++;
            const avg = (i + 1 + j) / 2;
            for (let k = i; k < j; k++) ranks[sorted[k].i] = avg;
            i = j;
        }
        return ranks;
    }

    // 自然排序：智能处理班级名称中的数字部分
    function naturalCompare(a, b) {
        const aStr = String(a);
        const bStr = String(b);
        // 提取数字部分进行比较
        const aNum = parseInt(aStr.match(/\d+/)?.[0]);
        const bNum = parseInt(bStr.match(/\d+/)?.[0]);
        if (!isNaN(aNum) && !isNaN(bNum)) {
            if (aNum !== bNum) return aNum - bNum;
        }
        // 数字相同时按字符串排序
        return aStr.localeCompare(bStr, 'zh-CN');
    }

    function sortClassEntries(entries) {
        return entries.sort((a, b) => naturalCompare(a[0], b[0]));
    }

    // HTML 转义
    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    // 弹窗提示（支持确定/取消与回调；opts.iconHtml 显示在标题左侧的图标）
    function showModal(title, message, opts) {
        const overlay = document.getElementById('modalOverlay');
        if (!overlay) return;
        const okBtn = document.getElementById('modalOk');
        const cancelBtn = document.getElementById('modalCancel');
        const o = opts || {};
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').innerHTML = message;
        const iconEl = document.getElementById('modalIcon');
        if (iconEl) {
            if (o.iconHtml) {
                iconEl.innerHTML = o.iconHtml;
                iconEl.style.display = 'inline-flex';
            } else {
                iconEl.innerHTML = '';
                iconEl.style.display = 'none';
            }
        }
        okBtn.textContent = o.confirmText || '知道了';
        if (o.showCancel && cancelBtn) {
            cancelBtn.style.display = 'inline-flex';
            cancelBtn.textContent = o.cancelText || '取消';
        } else if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        App.modalCallbacks = { onConfirm: o.onConfirm || null, onCancel: o.onCancel || null };
        overlay.style.display = 'flex';
    }

    function hideModal() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    // 开始分析按钮图标（白色放大镜）
    const ICON_ANALYZE = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill="#ffffff" style="width:1em;height:1em;flex-shrink:0;"><path d="M936.96 892.928l-166.4-166.4c-12.288-12.288-32.256-12.288-44.032 0-12.288 12.288-12.288 32.256 0 44.032l166.4 166.4c5.632 5.632 13.824 9.216 22.016 9.216 8.192 0 16.384-3.072 22.016-9.216 12.288-12.288 12.288-31.744 0-44.032zM758.784 294.912C683.008 114.176 475.136 29.696 294.912 105.984S29.696 389.632 105.984 569.856c75.776 180.224 283.648 265.216 463.872 188.928 131.584-55.296 216.576-183.808 216.576-326.656 0.512-47.104-9.216-93.696-27.648-137.216zM336.896 706.56c-22.016-7.68-43.008-17.92-62.464-30.72V433.664c0-17.408 13.824-31.232 31.232-31.232s31.232 13.824 31.232 31.232V706.56z m128.512 14.848c-20.992 2.048-41.984 2.56-62.464 0V358.4c0-17.408 13.824-31.232 31.232-31.232 17.408 0 31.232 13.824 31.232 31.232v363.008z m128-46.592c-19.456 12.8-40.448 23.552-62.464 31.232V285.184c0-17.408 13.824-31.232 31.232-31.232 17.408 0 31.232 13.824 31.232 31.232v389.632z"/></svg>`;

    // 重新分析按钮图标（白色刷新）
    const ICON_REFRESH = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill="#ffffff" style="width:1em;height:1em;flex-shrink:0;"><path d="M576.8 824.3c-102 20.7-212-8-290.1-86C170.3 622 162.4 440.4 262.8 316.2v58.9c0 17.5 14.4 31.8 31.9 31.8 17.6 0 31.8-14.3 31.9-31.8V247.7c0-9.6-3.2-17.5-9.6-22.3-6.4-6.4-14.4-9.6-22.3-9.6H167.2c-17.6 0-31.8 14.3-31.9 31.9 0 17.5 14.4 31.9 31.9 31.9h44.6C92.2 427.7 103.4 644.3 240.5 782.9c95.6 95.6 227.9 129 350.7 103.5 4.8-1.6 11.2-4.8 14.4-8 12.7-12.7 12.7-31.9 0-44.6-6.5-9.5-19.2-12.7-28.8-9.5z m280.6-78h-43c116.4-149.7 106.8-366.4-31.9-504.9C693.2 152.2 572 117.1 455.7 133c-8 0-14.4 3.2-20.7 9.6-12.7 12.7-12.7 31.8 0 44.6 8 8 19.1 11.1 30.3 8 95.6-14.3 197.7 15.9 271 89.2 116.4 116.3 124.3 297.9 23.9 422.1v-58.9c0-17.5-14.4-31.9-31.9-31.9-17.6 0-31.8 14.3-31.9 31.9V775c0 9.6 3.2 17.5 9.6 22.3 6.4 6.4 14.4 9.6 22.3 9.6h127.5c17.6 0 31.8-14.3 31.9-31.9 0-17.6-12.8-28.7-30.3-28.7z m0 0"/></svg>`;

    App.util = { showToast, parseFile, identifyColumns, rankAvg, naturalCompare, sortClassEntries, escapeHtml, showModal, hideModal, ICON_ANALYZE, ICON_REFRESH };
})(window.App = window.App || {});
