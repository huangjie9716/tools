/* ============================================================
   js/stats.js —— 核心数据处理模块
   ⚠️ 重要说明：本文件包含所有底层数据/统计计算逻辑，
      所有实现均与原版 AddSubjectTeacher.html 保持完全一致，
      请勿修改其中任何计算步骤，以免影响分析结果。
   ============================================================ */
(function (global) {
    'use strict';

    // ---- 核心：计算平均名次、百分等级、标准分 ----
    function computeRanksAndScores(scores) {
        const n = scores.length;
        if (n === 0) return [];
        const indexed = scores.map((s, idx) => ({ score: s, idx }));
        indexed.sort((a, b) => b.score - a.score);
        const ranks = new Array(n);
        let i = 0;
        while (i < n) {
            let j = i;
            while (j < n && indexed[j].score === indexed[i].score) j++;
            const avgRank = (i + 1 + j) / 2;
            for (let k = i; k < j; k++) {
                ranks[indexed[k].idx] = avgRank;
            }
            i = j;
        }
        return ranks.map(rank => {
            const percentile = 1 - (rank - 0.5) / n;
            const p = Math.min(Math.max(percentile, 1e-12), 1 - 1e-12);
            const std = 500 + 100 * jStat.normal.inv(p, 0, 1);
            const finalStd = isFinite(std) ? std : 500;
            return { rank, percentile, stdScore: finalStd };
        });
    }

    // ---- 线性回归 ----
    function linearRegression(x, y) {
        const n = x.length;
        if (n < 2) return null;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
        const sumX2 = x.reduce((a, b) => a + b * b, 0);
        const meanX = sumX / n;
        const meanY = sumY / n;
        const slope = (sumXY - n * meanX * meanY) / (sumX2 - n * meanX * meanX);
        const intercept = meanY - slope * meanX;
        return { slope, intercept };
    }

    // ---- 计算样本标准差 ----
    function sampleStd(arr) {
        const n = arr.length;
        if (n < 2) return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / n;
        const squaredDiffs = arr.map(v => (v - mean) ** 2);
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);
        return Math.sqrt(variance);
    }

    // ---- 对单一科目执行完整分析 ----
    function analyzeSubject(commonData, layer) {
        const N = commonData.length;
        if (N === 0) return null;

        const s1 = commonData.map(r => r.score1);
        const s2 = commonData.map(r => r.score2);

        const res1 = computeRanksAndScores(s1);
        const res2 = computeRanksAndScores(s2);

        const step = N / layer;
        const layerRank1 = res1.map(r => {
            const val = 1 + Math.floor(r.rank / step);
            return Math.min(val, layer);
        });
        const layerRank2 = res2.map(r => {
            const val = 1 + Math.floor(r.rank / step);
            return Math.min(val, layer);
        });

        const baseData = commonData.map((r, idx) => ({
            id: r.id,
            name: r.name,
            class: r.class,
            raw1: r.score1,
            raw2: r.score2,
            rank1: res1[idx].rank,
            percentile1: res1[idx].percentile,
            std1: res1[idx].stdScore,
            layer1: layerRank1[idx],
            rank2: res2[idx].rank,
            percentile2: res2[idx].percentile,
            std2: res2[idx].stdScore,
            layer2: layerRank2[idx]
        }));

        // 分层回归
        const layerMap = new Map();
        baseData.forEach(r => {
            const l = r.layer1;
            if (!layerMap.has(l)) {
                layerMap.set(l, { sum1: 0, sum2: 0, count: 0 });
            }
            const entry = layerMap.get(l);
            entry.sum1 += r.std1;
            entry.sum2 += r.std2;
            entry.count++;
        });
        const layers = Array.from(layerMap.keys()).sort((a, b) => a - b);
        const xMeans = layers.map(l => layerMap.get(l).sum1 / layerMap.get(l).count);
        const yMeans = layers.map(l => layerMap.get(l).sum2 / layerMap.get(l).count);

        let slope = 0, intercept = 0;
        let regressionOK = false;
        if (layers.length >= 2) {
            const reg = linearRegression(xMeans, yMeans);
            if (reg) {
                slope = reg.slope;
                intercept = reg.intercept;
                regressionOK = true;
            }
        }

        const withPred = baseData.map(r => {
            let pred = 500;
            if (regressionOK) pred = intercept + slope * r.std1;
            return { ...r, predicted2: pred };
        });

        const withResidual = withPred.map(r => {
            const residual = r.std2 - r.predicted2;
            return { ...r, residual: residual };
        });

        const residuals = withResidual.map(r => r.residual);
        const resStd = sampleStd(residuals);

        const result = withResidual.map(r => {
            const tVal = (resStd === 0) ? 0 : r.residual / resStd;
            const overTwo = (tVal > 2) ? 1 : 0;
            const overOne = (tVal > 1) ? 1 : 0;
            const belowOne = (tVal < -1) ? 1 : 0;
            const belowTwo = (tVal < -2) ? 1 : 0;
            return {
                ...r,
                tValue: tVal,
                overTwo, overOne, belowOne, belowTwo,
                residualStd: resStd
            };
        });

        return {
            data: result,
            regression: { slope, intercept, regressionOK, xMeans, yMeans },
            residualStd: resStd,
            layerCount: layers.length
        };
    }

    // ---- 对外暴露 ----
    global.Stats = {
        computeRanksAndScores,
        linearRegression,
        sampleStd,
        analyzeSubject
    };

})(window);
