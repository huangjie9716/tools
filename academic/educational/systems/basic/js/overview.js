"use strict";

/* =========================================================
   渲染：概况
   ========================================================= */
function renderSummary(){
  const validTotal = state.totalValidCount || 0;
  const totalStat = computeStat(state.students.map(s => s.total), state.totalFull);
  const cards = [
    { label:"参考学生", value: validTotal, cls:"blue" },
    { label:"班级数", value: state.classes.length, cls:"green" },
    { label:"学科数", value: state.subjects.length, cls:"violet" },
    { label:"总分平均分", value: totalStat.mean === null ? "—" : totalStat.mean.toFixed(2), cls:"amber" }
  ];
  $("#summaryCards").innerHTML = cards.map(c =>
    '<div class="stat-card ' + c.cls + '">' +
      '<div class="label">' + escapeHtml(c.label) + '</div>' +
      '<div class="value">' + escapeHtml(c.value) + '</div>' +
    '</div>'
  ).join("");

  let meta = "";
  if (state.warnings && state.warnings.length) {
    meta = '<span title="' + escapeHtml(state.warnings.join("；")) + '">' + escapeHtml(state.warnings[0]) + '</span>';
  }
  $("#dataMeta").innerHTML = meta;
}

function renderOverview(){
  const allRows = [
    { name:"总分", full:state.totalFull, values:state.students.map(s => s.total), isTotal:true },
    ...state.subjects.map(sub => ({
      name: sub.name,
      full: getFull(sub.name),
      values: state.students.map(s => s.scores[sub.name]),
      isTotal:false
    }))
  ];

  $("#overviewBody").innerHTML = allRows.map(row => {
    const st = computeStat(row.values, row.full);
    const meanText = st.mean === null ? "—" : st.mean.toFixed(2);
    const stdText = st.stdDev === null ? "—" : st.stdDev.toFixed(2);
    const cvText = st.cv === null ? "—" : st.cv.toFixed(4);
    const meanPct = st.mean === null || !row.full ? 0 : Math.max(0, Math.min(100, st.mean / row.full * 100));
    const meanHtml = st.mean === null
      ? '<span class="muted">—</span>'
      : '<span class="mean-meter" style="--v:' + meanPct.toFixed(1) + '">' + escapeHtml(meanText) + '</span>';
    return '<tr class="' + (row.isTotal ? "total-row" : "") + '">' +
      '<td class="subject-cell">' + escapeHtml(row.name) + (row.isTotal ? '<span class="tag">' + state.subjects.length + ' 科</span>' : '') + '</td>' +
      '<td>' + escapeHtml(fmtScore(row.full)) + '</td>' +
      '<td><span class="count-pill">' + st.n + '</span></td>' +
      '<td>' + meanHtml + '</td>' +
      '<td>' + rateCell(st.excellentRate, "excellent") + '</td>' +
      '<td>' + rateCell(st.passRate, "pass") + '</td>' +
      '<td>' + rateCell(st.lowRate, "low") + '</td>' +
      '<td>' + escapeHtml(stdText) + '</td>' +
      '<td>' + escapeHtml(cvText) + '</td>' +
    '</tr>';
  }).join("");
}

function rateCell(rate, kind){
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return '<span class="muted">—</span>';
  const v = Math.max(0, Math.min(100, rate * 100));
  return '<span class="rate ' + kind + '" style="--v:' + v.toFixed(2) + '">' + v.toFixed(2) + '%</span>';
}
