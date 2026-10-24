/**
 * download.js —— 数据导出（Excel）
 * 下载预测明细与班级汇总
 */
(function (App) {
    const S = App.state;

    // 下载当前达标线明细（跟随当前选中的达标线与班级筛选）
    function downloadDetailExcel() {
        if (!S.processedResults.length || S.activeLineIndex >= S.processedResults.length) {
            App.util.showToast('请先分析并选择达标线', 'warning');
            return;
        }
        const data = S.processedResults[S.activeLineIndex];
        const isPred = S.currentMode === 'prediction';
        const headers = isPred ? ['学号', '姓名', '班级', '成绩', '原始分名次', '预测上线概率'] : ['学号', '姓名', '班级', '本次成绩', '本次名次', '参考成绩', '参考名次', '预测上线概率'];
        let rows = data.rows;
        if (S.selectedClass !== 'all') rows = rows.filter(r => r.班级 === S.selectedClass);
        const wsData = [headers];
        rows.forEach(r => wsData.push(headers.map(h => h === '预测上线概率' ? r['预测上线概率'] : r[h])));
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '明细');
        const suffix = S.selectedClass === 'all' ? '全校' : S.selectedClass;
        XLSX.writeFile(wb, `${data.lineName}_${suffix}_明细.xlsx`);
        App.util.showToast('明细下载成功', 'success');
    }

    // 下载班级汇总
    function downloadClassSummaryExcel() {
        if (!S.processedResults.length || S.activeLineIndex >= S.processedResults.length) {
            App.util.showToast('暂无数据', 'warning');
            return;
        }
        const data = S.processedResults[S.activeLineIndex];
        const isPred = S.currentMode === 'prediction';
        const headers = isPred ? ['班级', '人数', '预测上线达标人数'] : ['班级', '人数', '预测上线达标人数', '上线人数', '增量'];
        const wsData = [headers];
        for (const [cls, info] of data.classSummary) {
            const row = [cls, info.count, Number(info.totalProb.toFixed(2))];
            if (!isPred) row.push(info.qualified, Number((info.qualified - info.totalProb).toFixed(2)));
            wsData.push(row);
        }
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '班级汇总');
        XLSX.writeFile(wb, `${data.lineName}_班级汇总.xlsx`);
        App.util.showToast('班级汇总下载成功', 'success');
    }

    App.download = { downloadDetailExcel, downloadClassSummaryExcel };
})(window.App = window.App || {});
