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

    /** 下载当前表格为 xlsx */
    function table() {
        if (!S.currentEntity || !S.currentSubject) {
            alert('请先选择学科和班级/全校');
            return;
        }
        let wbData = [];
        if (S.currentEntity === '全校') {
            wbData.push(['分数', '全校人数', '全校累计人数', '全校累计比率(%)']);
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
            wbData.push(['分数', '全校人数', '全校累计', '全校比率(%)', '班级人数', '班级累计', '班级比率(%)', '差值(%)', '累计方差', 'T值']);
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
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wbData);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const suffix = S.currentEntity === '全校' ? '全校' : S.currentEntity;
        link.download = `一分一段_${S.currentSubject}_${suffix}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    /** 下载当前图表为 png 图片 */
    function chart() {
        if (!S.chartInstance) {
            alert('当前没有可下载的图表，请选择一个班级或全校对比');
            return;
        }
        const link = document.createElement('a');
        link.href = S.dom.tChartCanvas.toDataURL('image/png');
        const suffix = S.currentEntity === '全校' ? '全校对比' : S.currentEntity;
        link.download = `累计比显著性曲线_${S.currentSubject}_${suffix}.png`;
        link.click();
    }

    window.Download = { table, chart };
})();
