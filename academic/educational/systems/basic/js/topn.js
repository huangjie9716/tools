"use strict";

/* =========================================================
   渲染：前 N 名人数（总分）
   ========================================================= */
function getTopnThresholds(){
  return TOPN_MODES[state.topnMode] || TOPN_MODES[1];
}

function topNThresholds(students, thresholds){
  const scores = [];
  for (const s of students) if (isValidScore(s.total)) scores.push(Number(s.total));
  scores.sort((a,b) => b - a);
  const n = scores.length;
  return thresholds.map(N => {
    if (!n) return { n:N, effectiveN:0, threshold:null, total:0 };
    const k = Math.min(N, n);
    const threshold = scores[k - 1];
    let total = 0;
    for (const v of scores) if (v >= threshold) total++;
    return { n:N, effectiveN:k, threshold, total };
  });
}

function topNClassCounts(students, thresholdsInfo){
  const classes = Array.from(new Set(students.map(s => s.className))).sort(classCompare);
  const map = new Map();
  for (const cls of classes) {
    const counts = thresholdsInfo.map(t => {
      if (t.threshold === null) return null;
      let count = 0;
      for (const s of students) {
        if (s.className !== cls) continue;
        if (isValidScore(s.total) && Number(s.total) >= t.threshold) count++;
      }
      return count;
    });
    map.set(cls, counts);
  }
  return map;
}

function topnChangeHtml(cur, ref){
  if (cur === null || cur === undefined || ref === null || ref === undefined) return '<span class="muted">—</span>';
  const diff = cur - ref;
  if (diff === 0) return '<span class="change flat">0</span>';
  return '<span class="change ' + (diff > 0 ? "up" : "down") + '">' + (diff > 0 ? "+" : "") + diff + '</span>';
}

function topnCellHtml(cur, ref, showRef, top3){
  const curText = cur === null || cur === undefined
    ? '<span class="muted">—</span>'
    : '<span class="topn-count' + (top3 ? " topn-top3" : "") + '">' + cur + '</span>';
  return showRef ? curText + ' ' + topnChangeHtml(cur, ref) : curText;
}

function topnTop3Sets(currentInfo, currentMap){
  return currentInfo.map((_, i) => {
    const counts = new Map();
    for (const cls of state.classes) {
      const row = currentMap.get(cls) || [];
      const v = row[i];
      if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
        const n = Number(v);
        counts.set(n, (counts.get(n) || 0) + 1);
      }
    }
    const unique = Array.from(counts.keys()).sort((a, b) => b - a);
    const set = new Set();
    let seen = 0;
    for (const v of unique) {
      const rank = seen + 1;
      if (rank > 3) break;
      set.add(v);
      seen += counts.get(v);
    }
    return set;
  });
}

function renderTopN(){
  const head = $("#topnHead");
  const body = $("#topnBody");
  if (!head || !body) return;
  const thresholds = getTopnThresholds();
  const currentInfo = topNThresholds(state.students, thresholds);
  const currentMap = topNClassCounts(state.students, currentInfo);
  const refInfo = state.reference ? topNThresholds(state.reference.students, thresholds) : null;
  const refMap = state.reference ? topNClassCounts(state.reference.students, refInfo) : null;
  const showRef = !!refInfo;
  const top3Sets = topnTop3Sets(currentInfo, currentMap);

  $$("#topnModeButtons [data-topn-mode]").forEach(item => {
    item.classList.toggle("active", Number(item.getAttribute("data-topn-mode")) === state.topnMode);
  });
  if (typeof updateTopnSwitchThumb === "function") updateTopnSwitchThumb();

  const modeLabel = $("#topnModeLabel");
  if (modeLabel) modeLabel.textContent = state.topnMode === 2 ? "模式二" : "模式一";

  const note = $("#topnNote");
  if (note) {
    note.textContent = state.reference
      ? "比对考试：" + state.reference.fileName + "（" + state.reference.students.length + " 人）· 按总分降序，取第 N 名学生的总分为线；表中为各班进入该线的人数，同分一并计入。"
      : "按总分降序，取第 N 名学生的总分为线；表中为各班进入该线的人数，同分一并计入；选择比对考试后显示人数变化。";
  }

  head.innerHTML = '<tr><th>班级</th>' +
    currentInfo.map(t => '<th>前 ' + t.n + ' 名</th>').join('') + '</tr>';

  const rows = [];
  for (const cls of state.classes) {
    const curCounts = currentMap.get(cls) || [];
    let html = '<tr><td class="subject-cell">' + escapeHtml(cls) + '</td>';
    for (let i = 0; i < currentInfo.length; i++) {
      const t = currentInfo[i];
      const cur = curCounts[i];
      const ref = refMap && refMap.get(cls) ? refMap.get(cls)[i] : null;
      const title = t.threshold === null
        ? "暂无有效成绩"
        : "第 " + t.effectiveN + " 名分数线：" + fmtScore(t.threshold) + "；本班进入该线 " + (cur === null ? "—" : cur) + " 人";
      html += '<td title="' + escapeHtml(title) + '">' + topnCellHtml(cur, ref, showRef, top3Sets[i].has(Number(cur))) + '</td>';
    }
    rows.push(html + '</tr>');
  }

  let totalHtml = '<tr class="total-row"><td class="subject-cell">合计</td>';
  for (let i = 0; i < currentInfo.length; i++) {
    const t = currentInfo[i];
    const refTotal = refInfo ? refInfo[i].total : null;
    const title = t.threshold === null
      ? "暂无有效成绩"
      : "第 " + t.effectiveN + " 名分数线：" + fmtScore(t.threshold) + "；全级进入该线 " + t.total + " 人";
    totalHtml += '<td title="' + escapeHtml(title) + '">' + topnCellHtml(t.total, refTotal, showRef) + '</td>';
  }
  rows.push(totalHtml + '</tr>');
  body.innerHTML = rows.join('');
}
