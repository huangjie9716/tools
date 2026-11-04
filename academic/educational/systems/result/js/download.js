/**
 * download.js —— 下载功能（数据表格 / 图表图片）
 *
 * 说明：下载内容完全复用当前视图对应的计算结果，不改变任何数据。
 * 对外暴露：window.Download = { table, chart }
 * 依赖：XLSX、window.AppState、window.Data
 */
(function () {
    'use strict';

    const S = AppState;

    /* ---------- 导出命名辅助：让文件名/表内首行自带信息 ---------- */
    function fileNameSafe(s) {
        return String(s === null || s === undefined ? '' : s)
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/[\s·]+/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_+|_+$/g, '');
    }
    function examTag() {
        const el = document.getElementById('cloudExamName');
        const text = el && el.textContent ? el.textContent.trim() : '';
        return fileNameSafe(text) || '本次考试';
    }
    function dateStamp() {
        const d = new Date();
        const p = n => String(n).padStart(2, '0');
        return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
    }
    function infoLine(parts) {
        const d = new Date();
        const p = n => String(n).padStart(2, '0');
        const t = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
            ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
        return '珠海市九洲中学 · ' + parts.filter(Boolean).join(' · ') + ' · 导出时间：' + t;
    }

    /** 下载当前表格为 xlsx */
    function table() {
        if (!S.currentEntity || !S.currentSubject) {
            alert('请先选择学科和班级/全级');
            return;
        }
        let wbData = [];
        if (S.currentEntity === '全级') {
            wbData.push(['分数', '全级人数', '全级累计人数', '全级累计比率(%)']);
            for (const seg of S.globalSegments) {
                wbData.push([seg.score, seg.count, seg.cum, (seg.ratio * 100).toFixed(2)]);
            }
        } else {
            const clsData = S.classData[S.currentEntity];
            if (!clsData) { alert('当前班级无数据'); return; }
            const globalSegs = S.globalSegments;
            const classRows = clsData.rows;
            const classTotalN = clsData.totalN;
            const tValues = Data.computeTValues(globalSegs, classRows, classTotalN);
            wbData.push(['分数', '全级人数', '全级累计', '全级比率(%)', '班级人数', '班级累计', '班级比率(%)', '差值(%)', '累计方差', 'T值']);
            for (let i = 0; i < globalSegs.length; i++) {
                const seg = globalSegs[i];
                const row = classRows[i];
                const diff = row.ratio - seg.ratio;
                const variance = Math.sqrt(classTotalN * seg.ratio * (1 - seg.ratio));
                const t = tValues[i];
                wbData.push([
                    seg.score,
                    seg.count,
                    seg.cum,
                    (seg.ratio * 100).toFixed(2),
                    row.count,
                    row.cum,
                    (row.ratio * 100).toFixed(2),
                    (diff * 100).toFixed(2),
                    variance.toFixed(3),
                    t.toFixed(3)
                ]);
            }
        }
        const suffix = S.currentEntity === '全级' ? '全级' : S.currentEntity;
        wbData.unshift([infoLine([examTag(), '一分一段表', '学科：' + S.currentSubject, '范围：' + suffix])]);
        wbData.splice(1, 0, []);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wbData);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `一分一段表_${examTag()}_${S.currentSubject}_${suffix}_${dateStamp()}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    /** 下载当前图表为 png 图片 */
    function chart() {
        if (!S.chartInstance) {
            alert('当前没有可下载的图表，请选择一个班级或全级对比');
            return;
        }
        const suffix = S.currentEntity === '全级' ? '全级对比' : S.currentEntity;
        /* 在图表上方补一行文字信息（学校 / 考试 / 学科 / 范围），避免图片脱离文件名后看不出内容 */
        const src = S.dom.tChartCanvas;
        const out = document.createElement('canvas');
        const headH = 62;
        out.width = src.width;
        out.height = src.height + headH;
        const ctx = out.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.fillStyle = '#1b2454';
        ctx.font = '700 20px "Microsoft YaHei","PingFang SC",Arial,sans-serif';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('累计比显著性曲线 · ' + S.currentSubject + ' · ' + suffix, 24, 30);
        ctx.fillStyle = '#64748b';
        ctx.font = '400 14px "Microsoft YaHei","PingFang SC",Arial,sans-serif';
        ctx.fillText(infoLine([examTag(), '累计比率与 T 值显著性检验']), 24, 52);
        ctx.drawImage(src, 0, headH);
        const link = document.createElement('a');
        link.href = out.toDataURL('image/png');
        link.download = `累计比显著性曲线_${examTag()}_${S.currentSubject}_${suffix}_${dateStamp()}.png`;
        link.click();
    }

    window.Download = { table, chart };
})();
