/**
 * charts.js —— 图表渲染（Chart.js）
 *
 * 说明：本模块仅负责图表的绘制与展示，不涉及任何数据计算。
 *       T 值等数据由 window.Data 计算后传入。
 * 对外暴露：window.Charts = { renderSingleChart, renderMultiClassChart }
 * 依赖：Chart.js、window.AppState、window.Data、window.Utils
 */
(function () {
    'use strict';

    const S = AppState;

    // roundRect 兼容性补丁（仅旧浏览器需要，仅执行一次）
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (r > w/2) r = w/2; if (r > h/2) r = h/2;
            this.moveTo(x + r, y);
            this.arcTo(x + w, y, x + w, y + h, r);
            this.arcTo(x + w, y + h, x, y + h, r);
            this.arcTo(x, y + h, x, y, r);
            this.arcTo(x, y, x + w, y, r);
            return this;
        };
    }

    /** 在图表上绘制参考线（0、±1、±2）的公共逻辑 */
    function drawReferenceLines(ctx2, yScale, xScale) {
        const drawLine = (value, color, dash, width, label) => {
            const yPos = yScale.getPixelForValue(value);
            if (yPos < yScale.top || yPos > yScale.bottom) return;
            ctx2.save();
            ctx2.setLineDash(dash || []);
            ctx2.lineWidth = width || 1.8;
            ctx2.strokeStyle = color;
            ctx2.beginPath();
            ctx2.moveTo(xScale.left, yPos);
            ctx2.lineTo(xScale.right, yPos);
            ctx2.stroke();
            ctx2.setLineDash([]);
            if (label) {
                ctx2.font = '11px sans-serif';
                ctx2.fillStyle = color;
                ctx2.textAlign = 'right';
                ctx2.textBaseline = 'bottom';
                ctx2.fillText(label, xScale.right - 4, yPos - 4);
            }
            ctx2.restore();
        };
        drawLine(0, 'rgba(42,138,74,0.85)', [], 2.5, null);
        drawLine(2, 'rgba(200,60,60,0.6)', [7,5], 1.6, '+2');
        drawLine(-2, 'rgba(200,60,60,0.6)', [7,5], 1.6, '-2');
        drawLine(1, 'rgba(50,120,200,0.3)', [5,5], 1.2, '+1');
        drawLine(-1, 'rgba(50,120,200,0.3)', [5,5], 1.2, '-1');
    }

    /** 在图表左上角绘制带底色圆角标题 */
    function drawTitleBadge(ctx2, yScale, xScale, labelText) {
        ctx2.save();
        ctx2.font = 'bold 15px "Segoe UI", "PingFang SC", sans-serif';
        ctx2.fillStyle = '#0a1e3c';
        ctx2.textAlign = 'left';
        ctx2.textBaseline = 'top';
        const metrics = ctx2.measureText(labelText);
        const pad = 8;
        const textWidth = metrics.width + pad * 2;
        const textHeight = 28;
        const x = xScale.left + 10;
        const y = yScale.top + 10;
        ctx2.fillStyle = 'rgba(255,255,255,0.82)';
        ctx2.shadowColor = 'rgba(0,0,0,0.06)';
        ctx2.shadowBlur = 8;
        ctx2.beginPath();
        if (ctx2.roundRect) { ctx2.roundRect(x, y, textWidth, textHeight, 8); }
        else { ctx2.rect(x, y, textWidth, textHeight); }
        ctx2.fill();
        ctx2.shadowBlur = 0;
        ctx2.fillStyle = '#0a1e3c';
        ctx2.fillText(labelText, x + pad, y + 6);
        ctx2.restore();
    }

    /**
     * 在零线上下填充半透明色块（绿色为正、红色为负）
     * @param {number} [alpha] 填充透明度，默认 0.08（两种视图共用，保证外观一致）
     */
    function fillZeroAreas(chart, metaIndex, alpha) {
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;
        if (!yScale || !xScale) return;
        const ctx2 = chart.ctx;
        const meta = chart.getDatasetMeta(metaIndex);
        if (!meta || !meta.data || meta.data.length === 0) return;
        const points = meta.data.map(d => ({ x: d.x, y: d.y }));
        const yZero = yScale.getPixelForValue(0);
        const fillAlpha = (typeof alpha === 'number') ? alpha : 0.06;

        // 正区域（曲线在零线上方）
        ctx2.save();
        ctx2.beginPath();
        ctx2.moveTo(points[0].x, yZero);
        let started = false;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.y > yZero) {
                if (started) { ctx2.lineTo(p.x, yZero); started = false; }
                else { ctx2.lineTo(p.x, yZero); }
            } else {
                if (!started) { ctx2.lineTo(p.x, yZero); started = true; }
                ctx2.lineTo(p.x, p.y);
            }
        }
        if (started) { const last = points[points.length-1]; ctx2.lineTo(last.x, yZero); }
        ctx2.closePath();
        ctx2.fillStyle = 'rgba(0, 180, 80, ' + fillAlpha + ')';
        ctx2.fill();
        ctx2.restore();

        // 负区域（曲线在零线下方）
        ctx2.save();
        ctx2.beginPath();
        ctx2.moveTo(points[0].x, yZero);
        started = false;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.y <= yZero) {
                if (started) { ctx2.lineTo(p.x, yZero); started = false; }
                else { ctx2.lineTo(p.x, yZero); }
            } else {
                if (!started) { ctx2.lineTo(p.x, yZero); started = true; }
                ctx2.lineTo(p.x, p.y);
            }
        }
        if (started) { const last = points[points.length-1]; ctx2.lineTo(last.x, yZero); }
        ctx2.closePath();
        ctx2.fillStyle = 'rgba(200, 60, 60, ' + fillAlpha + ')';
        ctx2.fill();
        ctx2.restore();
    }

    /**
     * 根据 T 值数据计算 Y 轴上下界（含 ±1、±2、±3 参考线留白）
     * 说明：无论数据如何，结果始终至少覆盖 ±3，保证参考线位置稳定。
     */
    function computeYRange(data) {
        let minT = 0, maxT = 0, hasValue = false;
        for (let i = 0; i < data.length; i++) {
            const v = data[i];
            if (typeof v !== 'number' || !isFinite(v)) continue;
            if (!hasValue) { minT = maxT = v; hasValue = true; continue; }
            if (v < minT) minT = v;
            if (v > maxT) maxT = v;
        }
        const range = maxT - minT;
        const padding = Math.max(0.5, range * 0.25);
        let yMin = Math.min(-3, minT - padding);
        let yMax = Math.max(3, maxT + padding);
        yMin = Math.min(yMin, -2.5);
        yMax = Math.max(yMax, 2.5);
        return { yMin, yMax };
    }

    /** 收集当前学科下全部班级的 T 值（用于“统一量程”） */
    function collectAllClassTValues() {
        const all = [];
        if (!S.globalSegments || S.globalSegments.length === 0) return all;
        Object.keys(S.classData).forEach(cls => {
            const clsData = S.classData[cls];
            if (!clsData || !clsData.rows || clsData.rows.length === 0) return;
            const tValues = Data.computeTValues(S.globalSegments, clsData.rows, clsData.totalN);
            for (let i = 0; i < tValues.length; i++) all.push(tValues[i]);
        });
        return all;
    }

    /**
     * 解析纵轴量程
     * - unified（默认）：始终按当前学科“全部班级”的 T 值范围取值，
     *   这样同一个班级在“单班级视图”与“全校对比视图”中的纵轴刻度完全一致；
     * - auto：按传入的当前可见曲线的 T 值范围取值。
     * @param {Array<Array<number>>} seriesTValues 当前可见曲线的 T 值序列
     */
    function resolveYRange(seriesTValues) {
        if (S.yAxisMode === 'unified') {
            const all = collectAllClassTValues();
            if (all.length > 0) return computeYRange(all);
        }
        const flat = [];
        (seriesTValues || []).forEach(series => {
            for (let i = 0; i < series.length; i++) flat.push(series[i]);
        });
        return computeYRange(flat);
    }

    /** 累计比率线性横轴：以 0% ~ 100% 等间隔显示刻度 */
    function ratioXScale(titleText) {
        return {
            type: 'linear',
            title: { display: true, text: titleText, font: { size: 12, weight: '500' } },
            min: 0,
            max: 1,
            ticks: {
                stepSize: 0.1,
                autoSkip: false,
                callback: function(value) {
                    const pct = Math.round(value * 100);
                    if (pct < 0 || pct > 100) return null;
                    return pct + '%';
                }
            }
        };
    }

    /**
     * 单班级 T 值曲线图
     * 说明：横轴与多班级对比图保持一致，均为“全校累计比率”，
     *      因此同一班级在两种入口下的曲线完全一致。
     * @param {Array} tValues     T 值序列（与 S.globalSegments 一一对应）
     * @param {string} className  班级名
     */
    function renderSingleChart(tValues, className) {
        if (S.chartInstance) { S.chartInstance.destroy(); S.chartInstance = null; }
        const { yMin, yMax } = resolveYRange([tValues]);
        const xyData = tValues.map((t, i) => ({ x: S.globalSegments[i].ratio, y: t }));
        const ctx = S.dom.tChartCanvas.getContext('2d');

        const bgPlugin = {
            id: 'bgAreaAndLabel',
            beforeDraw: function(chart) {
                fillZeroAreas(chart, 0);
            },
            afterDraw: function(chart) {
                const yScale = chart.scales.y;
                const xScale = chart.scales.x;
                if (!yScale || !xScale) return;
                drawReferenceLines(chart.ctx, yScale, xScale);
                drawTitleBadge(chart.ctx, yScale, xScale, `学科：${S.currentSubject}  |  班级：${className}`);
            }
        };

        S.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    // 点线样式与多班级对比图保持一致，避免同一班级在两个入口下外观不同
                    label: className,
                    data: xyData,
                    borderColor: '#1a3a6b',
                    backgroundColor: '#1a3a6b22',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHitRadius: 12,
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone',
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                // 无数据点圆点后，沿 x 轴就近吸附即可弹出提示
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: { size: 12, weight: '500' }, padding: 12, usePointStyle: true, pointStyle: 'circle' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + '  T = ' + context.parsed.y.toFixed(3);
                            }
                        }
                    }
                },
                scales: {
                    x: ratioXScale('全校累计比率'),
                    y: {
                        title: { display: true, text: 'T 值', font: { size: 12, weight: '500' } },
                        min: yMin,
                        max: yMax,
                        ticks: { stepSize: 1 },
                        grid: {
                            // 网格统一浅色：0 / ±1 / ±2 由参考线单独绘制，避免与网格线重复叠加
                            color: 'rgba(0,0,0,0.05)',
                            lineWidth: 1
                        }
                    }
                }
            },
            plugins: [bgPlugin]
        });
    }

    /**
     * 多班级对比图（全校视图）
     * @param {Array} classNames 勾选对比的班级名列表
     */
    function renderMultiClassChart(classNames) {
        const datasets = [];
        const seriesTValues = [];
        classNames.forEach((cls, idx) => {
            const clsData = S.classData[cls];
            if (!clsData) return;
            const tValues = Data.computeTValues(S.globalSegments, clsData.rows, clsData.totalN);
            const color = S.COLORS[idx % S.COLORS.length];
            seriesTValues.push(tValues);
            datasets.push({
                label: cls,
                data: tValues.map((t, i) => ({ x: S.globalSegments[i].ratio, y: t })),
                borderColor: color,
                backgroundColor: color + '22',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHitRadius: 12,
                tension: 0.4,
                cubicInterpolationMode: 'monotone',
                fill: false,
            });
        });

        if (S.chartInstance) { S.chartInstance.destroy(); S.chartInstance = null; }

        if (datasets.length === 0) return;
        const { yMin, yMax } = resolveYRange(seriesTValues);

        const ctx = S.dom.tChartCanvas.getContext('2d');

        const multiBgPlugin = {
            id: 'multiBgFill',
            beforeDraw: function(chart) {
                // 每个数据集独立填充，与单班级视图共用 fillZeroAreas，保证两图外观一致
                const dsCount = chart.data.datasets.length;
                for (let idx = 0; idx < dsCount; idx++) {
                    fillZeroAreas(chart, idx, 0.06);
                }
            },
            afterDraw: function(chart) {
                const yScale = chart.scales.y;
                const xScale = chart.scales.x;
                if (!yScale || !xScale) return;
                drawReferenceLines(chart.ctx, yScale, xScale);
                drawTitleBadge(chart.ctx, yScale, xScale, `学科：${S.currentSubject}  |  全校班级对比`);
            }
        };

        S.chartInstance = new Chart(ctx, {
            type: 'line',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                // 无数据点圆点后，沿 x 轴就近吸附即可弹出提示
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: { size: 12, weight: '500' }, padding: 12, usePointStyle: true, pointStyle: 'circle' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + '  T = ' + context.parsed.y.toFixed(3);
                            }
                        }
                    }
                },
                scales: {
                    x: ratioXScale('全校累计比率'),
                    y: {
                        title: { display: true, text: 'T 值', font: { size: 12, weight: '500' } },
                        min: yMin,
                        max: yMax,
                        ticks: { stepSize: 1 },
                        grid: {
                            // 网格统一浅色：0 / ±1 / ±2 由参考线单独绘制，避免与网格线重复叠加
                            color: 'rgba(0,0,0,0.05)',
                            lineWidth: 1
                        }
                    }
                }
            },
            plugins: [multiBgPlugin]
        });
    }

    window.Charts = { renderSingleChart, renderMultiClassChart };
})();
