"use strict";

/* =========================================================
   渲染：班级学科质量看板（会议视图）
   ========================================================= */
const HEAT_METRICS = ["mean", "excellentRate", "passRate", "lowRate"];

function heatMetric(){
  return METRICS.find(m => m.key === state.heatMetric) || METRICS[0];
}

function heatValueText(st, metric){
  const v = metricValue(st, metric);
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  if (metric.key === "mean") return Number(v).toFixed(2);
  return pctText(v);
}

function heatBand(rank, count){
  if (!Number.isFinite(rank) || count <= 0) return "";
  if (rank <= 5) return "heat-green";
  if (rank >= Math.max(6, count - 4)) return "heat-red";
  return "heat-orange";
}

function renderHeatmap(){
  const head = $("#heatHead");
  const body = $("#heatBody");
  if (!head || !body) return;

  const metric = heatMetric();
  $$("#heatMetricChips [data-heat-metric]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-heat-metric") === metric.key);
  });

  if (!state.students.length || !state.subjects.length) {
    head.innerHTML = "";
    body.innerHTML = '<tr class="empty-row"><td colspan="' + (1 + Math.max(1, state.subjects.length)) + '">请先导入成绩文件</td></tr>';
    return;
  }

  const data = buildBasicAnalysis(datasetForCurrent(), metric);
  const allSubjects = data.allSubjects;
  const classGroups = data.groups.filter(g => !g.isAll);
  const classCount = classGroups.length;

  head.innerHTML = '<tr><th class="heat-col-class">班级</th>' +
    allSubjects.map(sub => '<th>' + escapeHtml(sub.name) +
      '<small>' + (sub.key === "__total__" ? "全科" : "满分 " + escapeHtml(fmtScore(sub.full))) + '</small></th>'
    ).join("") + '</tr>';

  body.innerHTML = data.groups.map(group => {
    const cells = allSubjects.map(sub => {
      const st = data.stats.get(group.name)[sub.key];
      const valueText = heatValueText(st, metric);
      if (group.isAll) {
        return '<td class="heat-cell heat-base-cell"><span class="heat-value">' + escapeHtml(valueText) + '</span></td>';
      }
      const rankMap = data.ranks.get(sub.key);
      const rank = rankMap ? rankMap.get(group.name) : null;
      const rankedCount = rankMap ? rankMap.size : classCount;
      const band = heatBand(rank, rankedCount) || "heat-base-cell";
      const rankText = rank ? "第" + formatRank(rank) : "—";
      const title = group.name + " " + sub.name + " " + metric.label + "：" + valueText +
        (rank ? "，班级排名 " + rankText + "/" + rankedCount : "，暂无排名");
      return '<td class="heat-cell ' + band + '" title="' + escapeHtml(title) +
        '"><span class="heat-value">' + escapeHtml(valueText) +
        '</span><span class="heat-rank">' + escapeHtml(rankText) + '</span></td>';
    });
    return '<tr class="' + (group.isAll ? "heat-all-row" : "") + '">' +
      '<td class="heat-col-class">' + escapeHtml(group.name) + '</td>' + cells.join("") + '</tr>';
  }).join("");
}
