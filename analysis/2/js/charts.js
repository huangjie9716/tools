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
        drawLine(0, '#2a8a4a', [], 4, null);
        drawLine(2, 'rgba(200,60,60,0.7)', [6,5], 2, '+2');
        drawLine(-2, 'rgba(200,60,60,0.7)', [6,5], 2, '-2');
        drawLine(1, 'rgba(50,120,200,0.5)', [4,4], 1.5, '+1');
        drawLine(-1, 'rgba(50,120,200,0.5)', [4,4], 1.5, '-1');
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

    /** 在零线上下填充半透明色块（绿色为正、红色为负） */
    function fillZeroAreas(chart, metaIndex) {
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;
        if (!yScale || !xScale) return;
        const ctx2 = chart.ctx;
        const meta = chart.getDatasetMeta(metaIndex);
        if (!meta || !meta.data || meta.data.length === 0) return;
        const points = meta.data.map(d => ({ x: d.x, y: d.y }));
        const yZero = yScale.getPixelForValue(0);

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
        ctx2.fillStyle = 'rgba(0, 180, 80, 0.12)';
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
        ctx2.fillStyle = 'rgba(200, 60, 60, 0.12)';
        ctx2.fill();
        ctx2.restore();
    }

    /** 根据 T 值数据计算 Y 轴上下界（含 ±1、±2、±3 参考线留白） */
    function computeYRange(data) {
        let minT = Math.min(...data);
        let maxT = Math.max(...data);
        const range = maxT - minT;
        const padding = Math.max(0.5, range * 0.25);
        let yMin = Math.min(-3, minT - padding);
        let yMax = Math.max(3, maxT + padding);
        yMin = Math.min(yMin, -2.5);
        yMax = Math.max(yMax, 2.5);
        return { yMin, yMax };
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
     * @param {Array} classRows   班级分数段行
     * @param {Array} tValues     T 值序列
     * @param {string} className  班级名
     */
    function renderSingleChart(classRows, tValues, className) {
        if (S.chartInstance) { S.chartInstance.destroy(); S.chartInstance = null; }
        const { yMin, yMax } = computeYRange(tValues);
        const xyData = tValues.map((t, i) => ({ x: classRows[i].ratio, y: t }));
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
                    label: className + ' T值',
                    data: xyData,
                    borderColor: '#1a3a6b',
                    backgroundColor: 'rgba(26,58,107,0.08)',
                    borderWidth: 3,
                    pointBackgroundColor: '#1a3a6b',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 8,
                    tension: 0.4,
                    interpolation: 'monotone',
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'T = ' + context.parsed.y.toFixed(3);
                            }
                        }
                    }
                },
                scales: {
                    x: ratioXScale('班级累计比率'),
                    y: {
                        title: { display: true, text: 'T 值', font: { size: 12, weight: '500' } },
                        min: yMin,
                        max: yMax,
                        ticks: { stepSize: 1 },
                        grid: {
                            color: function(context) {
                                const val = context.tick.value;
                                if (val === 0) return 'rgba(42,138,74,0.8)';
                                if (val === 2 || val === -2) return 'rgba(200,60,60,0.3)';
                                if (val === 1 || val === -1) return 'rgba(50,120,200,0.2)';
                                return 'rgba(0,0,0,0.06)';
                            },
                            lineWidth: function(context) {
                                const val = context.tick.value;
                                if (val === 0) return 3;
                                if (val === 2 || val === -2) return 1.5;
                                return 1;
                            }
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
        classNames.forEach((cls, idx) => {
            const clsData = S.classData[cls];
            if (!clsData) return;
            const tValues = Data.computeTValues(S.globalSegments, clsData.rows, clsData.totalN);
            const color = S.COLORS[idx % S.COLORS.length];
            datasets.push({
                label: cls,
                data: tValues.map((t, i) => ({ x: S.globalSegments[i].ratio, y: t })),
                borderColor: color,
                backgroundColor: color + '22',
                borderWidth: 2.8,
                pointRadius: 2,
                pointHoverRadius: 6,
                tension: 0.4,
                interpolation: 'monotone',
                fill: false,
            });
        });

        if (S.chartInstance) { S.chartInstance.destroy(); S.chartInstance = null; }

        let allT = [];
        datasets.forEach(ds => allT = allT.concat(ds.data.map(p => p.y)));
        if (allT.length === 0) return;
        const { yMin, yMax } = computeYRange(allT);

        const ctx = S.dom.tChartCanvas.getContext('2d');

        const multiBgPlugin = {
            id: 'multiBgFill',
            beforeDraw: function(chart) {
                const dsCount = chart.data.datasets.length;
                for (let idx = 0; idx < dsCount; idx++) {
                    // 保持原始绘制效果：每个数据集独立填充，透明度更低
                    const yScale = chart.scales.y;
                    const xScale = chart.scales.x;
                    if (!yScale || !xScale) return;
                    const ctx2 = chart.ctx;
                    const meta = chart.getDatasetMeta(idx);
                    if (!meta || !meta.data || meta.data.length === 0) continue;
                    const points = meta.data.map(d => ({ x: d.x, y: d.y }));
                    const yZero = yScale.getPixelForValue(0);

                    // 正区域
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
                    ctx2.fillStyle = 'rgba(0, 180, 80, 0.08)';
                    ctx2.fill();
                    ctx2.restore();

                    // 负区域
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
                    ctx2.fillStyle = 'rgba(200, 60, 60, 0.08)';
                    ctx2.fill();
                    ctx2.restore();
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
                            color: function(context) {
                                const val = context.tick.value;
                                if (val === 0) return 'rgba(42,138,74,0.8)';
                                if (val === 2 || val === -2) return 'rgba(200,60,60,0.3)';
                                if (val === 1 || val === -1) return 'rgba(50,120,200,0.2)';
                                return 'rgba(0,0,0,0.06)';
                            },
                            lineWidth: function(context) {
                                const val = context.tick.value;
                                if (val === 0) return 3;
                                if (val === 2 || val === -2) return 1.5;
                                return 1;
                            }
                        }
                    }
                }
            },
            plugins: [multiBgPlugin]
        });
    }

    window.Charts = { renderSingleChart, renderMultiClassChart };
})();
