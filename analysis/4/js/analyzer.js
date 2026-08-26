        // ============================================================
        //  主分析函数 (支持自定义阈值)
        // ============================================================
        function analyzeData(rawData, highThreshold = 0.7, lowThreshold = 0.3) {
            if (highThreshold <= lowThreshold) {
                const temp = highThreshold;
                highThreshold = lowThreshold;
                lowThreshold = temp;
            }
            const headers = rawData.headers;
            const fullScores = rawData.fullScores;
            const classData = rawData.classData;
            const classNames = Object.keys(classData);
            const numQuestions = headers.length;

            const scoreRates = {};
            for (const cls of classNames) {
                const scores = classData[cls];
                scoreRates[cls] = scores.map((avg, idx) => {
                    const full = fullScores[idx] || 1;
                    if (full === 0) return 0;
                    return avg / full;
                });
            }
            const schoolRates = scoreRates['全校'] || [];

            const categories = schoolRates.map(rate => {
                if (rate >= highThreshold) return 'simple';
                if (rate < lowThreshold) return 'hard';
                return 'medium';
            });
            const idxSimple = [],
                idxMedium = [],
                idxHard = [];
            categories.forEach((cat, i) => {
                if (cat === 'simple') idxSimple.push(i);
                else if (cat === 'medium') idxMedium.push(i);
                else idxHard.push(i);
            });

            const classAvgByCat = {};
            for (const cls of classNames) {
                const rates = scoreRates[cls];
                const avgSimple = idxSimple.length ? idxSimple.reduce((s, i) => s + rates[i], 0) / idxSimple.length : 0;
                const avgMedium = idxMedium.length ? idxMedium.reduce((s, i) => s + rates[i], 0) / idxMedium.length : 0;
                const avgHard = idxHard.length ? idxHard.reduce((s, i) => s + rates[i], 0) / idxHard.length : 0;
                classAvgByCat[cls] = { simple: avgSimple, medium: avgMedium, hard: avgHard };
            }
            const schoolAvg = classAvgByCat['全校'] || { simple: 0, medium: 0, hard: 0 };

            const classAdjByCat = {};
            for (const cls of classNames) {
                const avg = classAvgByCat[cls];
                const adj = {};
                for (const cat of ['simple', 'medium', 'hard']) {
                    const pSchool = schoolAvg[cat];
                    const pClass = avg[cat];
                    if (pSchool > 0 && pSchool < 1 && pClass > 0 && pClass < 1) {
                        const exponent = Math.log(0.85) / Math.log(pSchool);
                        adj[cat] = Math.pow(pClass, exponent);
                    } else if (pSchool === pClass && pSchool > 0) {
                        adj[cat] = 0.85;
                    } else {
                        adj[cat] = 0.85;
                    }
                    if (!isFinite(adj[cat]) || adj[cat] < 0) adj[cat] = 0.85;
                    if (adj[cat] > 1) adj[cat] = 1;
                }
                classAdjByCat[cls] = adj;
            }

            const classAdjAvg = {};
            for (const cls of classNames) {
                const adj = classAdjByCat[cls];
                let vals = [];
                if (idxSimple.length) vals.push(adj.simple);
                if (idxMedium.length) vals.push(adj.medium);
                if (vals.length === 0) {
                    classAdjAvg[cls] = 0.85;
                } else {
                    const sum = vals.reduce((s, v) => s + v, 0);
                    classAdjAvg[cls] = sum / vals.length;
                }
                if (classAdjAvg[cls] <= 0 || classAdjAvg[cls] >= 1) classAdjAvg[cls] = 0.85;
            }

            const classDiffIndex = {};
            for (const cls of classNames) {
                const base = classAdjAvg[cls];
                const rates = scoreRates[cls];
                classDiffIndex[cls] = rates.map(rate => {
                    if (rate <= 0) return NaN;
                    if (base <= 0 || base === 1) return NaN;
                    return safeLog(rate, base);
                });
            }

            const schoolBase = classAdjAvg['全校'] || 0.85;
            const schoolDiffIndex = (scoreRates['全校'] || []).map(rate => {
                if (rate <= 0) return NaN;
                if (schoolBase <= 0 || schoolBase === 1) return NaN;
                return safeLog(rate, schoolBase);
            });

            const diffMatrix = {};
            for (const cls of classNames) {
                diffMatrix[cls] = classDiffIndex[cls].map((val, idx) => {
                    const schoolVal = schoolDiffIndex[idx] || 0;
                    if (!isFinite(val) || !isFinite(schoolVal)) return NaN;
                    return schoolVal - val;
                });
            }

            return {
                headers,
                fullScores,
                classNames,
                numQuestions,
                scoreRates,
                schoolRates,
                categories,
                idxSimple,
                idxMedium,
                idxHard,
                classAvgByCat,
                schoolAvg,
                classAdjByCat,
                classAdjAvg,
                schoolBase,
                classDiffIndex,
                schoolDiffIndex,
                diffMatrix,
                classData,
                highThreshold,
                lowThreshold
            };
        }
