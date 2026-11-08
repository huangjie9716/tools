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
  renderTop100();
}

/* =========================================================
   前 100 名分段极差
   ========================================================= */
function top100CompetitionRanks(students){
  const valid = students.filter(s => isValidScore(s.total)).sort((a, b) =>
    Number(b.total) - Number(a.total) ||
    String(a.id).localeCompare(String(b.id), "zh-CN", { numeric: true }) ||
    String(a.name).localeCompare(String(b.name), "zh-CN")
  );
  const rankMap = new Map();
  let lastScore = null;
  let lastRank = 0;
  valid.forEach((s, i) => {
    const score = Number(s.total);
    if (lastScore === null || score !== lastScore) {
      lastRank = i + 1;
      lastScore = score;
    }
    rankMap.set(s, lastRank);
  });
  return { valid: valid, rankMap: rankMap };
}

function top100RangeOf(values){
  const arr = [];
  for (const v of values) {
    if (isValidScore(v)) arr.push(Number(v));
  }
  if (!arr.length) return null;
  let max = arr[0];
  let min = arr[0];
  for (const v of arr) {
    if (v > max) max = v;
    if (v < min) min = v;
  }
  return { max: max, min: min, range: round2(max - min) };
}

function renderTop100(){
  const head = $("#top100Head");
  const body = $("#top100Body");
  const rangeHead = $("#top100RangeHead");
  const rangeBody = $("#top100RangeBody");
  if (!head || !body || !rangeHead || !rangeBody) return;

  const subjects = state.subjects.map(sub => sub.name);
  const ranked = top100CompetitionRanks(state.students);
  const valid = ranked.valid;
  const rankMap = ranked.rankMap;

  /* 取前 100 名，第 100 名同分的一并纳入（所以实际可能是 99、100、101 …） */
  let selected = [];
  if (valid.length) {
    const k = Math.min(100, valid.length);
    const cutoff = Number(valid[k - 1].total);
    selected = valid.filter(s => Number(s.total) >= cutoff);
  }

  const note = $("#top100Note");
  if (note) {
    if (!valid.length) {
      note.textContent = "暂无有效成绩。";
    } else if (valid.length > 100) {
      note.textContent = "按总分降序取全级前 100 名，第 100 名同分一并纳入，本次实际纳入 " + selected.length +
        " 人；列出总分与各科成绩，并按每 10 人一段统计极差（同分同名次，同一分段内人数可能多于 10 人）。";
    } else {
      note.textContent = "全级有效成绩共 " + valid.length + " 人，未满 100 人，按实际人数列出；并按每 10 人一段统计极差。";
    }
  }

  head.innerHTML = '<tr><th>排名</th><th>学号</th><th>姓名</th><th>班级</th><th>总分</th>' +
    subjects.map(name => '<th>' + escapeHtml(name) + '</th>').join('') + '</tr>';

  body.innerHTML = selected.map(s => {
    const rank = rankMap.get(s);
    let html = '<tr>' +
      '<td class="top100-rank">' + rank + '</td>' +
      '<td>' + escapeHtml(s.id) + '</td>' +
      '<td>' + escapeHtml(s.name) + '</td>' +
      '<td>' + escapeHtml(s.className || '') + '</td>' +
      '<td class="top100-total">' + fmtScore(s.total) + '</td>';
    for (const name of subjects) {
      html += '<td>' + fmtScore(s.scores ? s.scores[name] : null) + '</td>';
    }
    return html + '</tr>';
  }).join('');

  rangeHead.innerHTML = '<tr><th>分段</th><th>人数</th><th>总分最高</th><th>总分最低</th><th>总分极差</th>' +
    subjects.map(name => '<th>' + escapeHtml(name) + '极差</th>').join('') + '</tr>';

  const rows = [];
  for (let start = 1; start <= 100; start += 10) {
    const end = start + 9;
    const members = selected.filter(s => {
      const rank = rankMap.get(s);
      return rank >= start && rank <= end;
    });
    const totalRange = top100RangeOf(members.map(s => s.total));
    let html = '<tr><td class="subject-cell">' + start + '–' + end + '</td><td>' + members.length + '</td>' +
      '<td>' + (totalRange ? fmtScore(totalRange.max) : '—') + '</td>' +
      '<td>' + (totalRange ? fmtScore(totalRange.min) : '—') + '</td>' +
      '<td class="top100-range">' + (totalRange ? fmtScore(totalRange.range) : '—') + '</td>';
    for (const name of subjects) {
      const subRange = top100RangeOf(members.map(s => s.scores ? s.scores[name] : null));
      html += '<td>' + (subRange ? fmtScore(subRange.range) : '—') + '</td>';
    }
    rows.push(html + '</tr>');
  }
  rangeBody.innerHTML = rows.join('');
}
