"use strict";

/* =========================================================
   渲染：排名与等级
   ========================================================= */
function renderGradeLegend(){
  const el = $("#gradeLegend");
  if (!el) return;
  const items = [
    ["A+","前 2.3%"], ["A","2.3%–6.7%"], ["A-","6.7%–15.9%"], ["B+","15.9%–30.9%"],
    ["B","30.9%–50.0%"], ["B-","50.0%–59.9%"], ["C+","59.9%–69.1%"], ["C","69.1%–84.1%"],
    ["C-","84.1%–93.3%"], ["D+","93.3%–97.7%"], ["D","97.7%–99.4%"], ["D-","99.4%–100%"]
  ];
  el.innerHTML = items.map(([g, range]) =>
    '<div class="legend-item"><b class="grade-badge ' + gradeClass(g) + '">' + g + '</b><span>' + range + '</span></div>'
  ).join("");
}

function renderGradeFilter(){
  const sel = $("#gradeFilter");
  const current = state.gradeFilter;
  let html = '<option value="all">全部等级</option>';
  for (const b of GRADE_BANDS) html += '<option value="' + b.name + '">' + b.name + '</option>';
  sel.innerHTML = html;
  sel.value = current;
  if (sel.value !== current) sel.value = "all";
}

function getFilteredRankingForSummary(){
  return state.students.filter(s => {
    if (state.classFilter !== "all" && s.className !== state.classFilter) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const hay = (String(s.name) + " " + String(s.id)).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderGradeSummary(){
  const el = $("#gradeSummary");
  if (!el) return;
  const filtered = getFilteredRankingForSummary();
  const valid = filtered.filter(s => isValidScore(scoreOf(s, state.rankSubject)));
  const counts = {};
  for (const b of GRADE_BANDS) counts[b.name] = 0;
  for (const s of valid) if (counts[s.grade] !== undefined) counts[s.grade]++;
  const total = valid.length || 1;
  el.innerHTML = GRADE_BANDS.map(b => {
    const c = counts[b.name];
    const p = valid.length ? (c / total * 100).toFixed(1) + "%" : "—";
    return '<div class="grade-chip ' + gradeClass(b.name) + '">' +
      '<b>' + b.name + '</b><strong>' + c + '</strong><small>' + p + '</small></div>';
  }).join("");
}

function renderRanking(){
  const subjectKey = state.rankSubject;
  const subjectLabel = subjectKey === "__total__" ? "总分" : subjectKey;
  const head = $("#rankScoreHead");
  if (head) head.textContent = subjectLabel;

  let list = state.students.filter(s => {
    if (state.classFilter !== "all" && s.className !== state.classFilter) return false;
    if (state.gradeFilter !== "all" && s.grade !== state.gradeFilter) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const hay = (String(s.name) + " " + String(s.id)).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sortMode = state.rankSort;
  list.sort((a,b) => {
    if (sortMode === "id") return String(a.id).localeCompare(String(b.id), "zh-CN", { numeric:true });
    if (sortMode === "name") return String(a.name).localeCompare(String(b.name), "zh-CN", { numeric:true });
    const aValid = isValidScore(scoreOf(a, subjectKey)), bValid = isValidScore(scoreOf(b, subjectKey));
    if (aValid !== bValid) return aValid ? -1 : 1;
    if (sortMode === "class") {
      const cls = classCompare(a.className, b.className);
      if (cls !== 0) return cls;
      const ar = a.classRank === null ? Infinity : a.classRank;
      const br = b.classRank === null ? Infinity : b.classRank;
      if (ar !== br) return ar - br;
    } else {
      const ar = a.schoolRank === null ? Infinity : a.schoolRank;
      const br = b.schoolRank === null ? Infinity : b.schoolRank;
      if (ar !== br) return ar - br;
    }
    return String(a.id).localeCompare(String(b.id), "zh-CN", { numeric:true });
  });

  const tbody = $("#rankingBody");
  if (!list.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">没有符合条件的学生</td></tr>';
  } else {
    tbody.innerHTML = list.map(s => {
      const score = scoreOf(s, subjectKey);
      const validStudent = isValidScore(score);
      const detail = state.subjects.map(sub => sub.name + " " + fmtScore(s.scores[sub.name])).join("　");
      const topClass = validStudent && s.schoolRank !== null && s.schoolRank <= 3
        ? "rank-top"
        : (validStudent && s.schoolRank !== null && s.schoolRank <= 5 ? "rank-top5" : "");
      return '<tr class="' + topClass + '">' +
        '<td>' + escapeHtml(s.id || "—") + '</td>' +
        '<td class="num-strong">' + escapeHtml(s.name) + '</td>' +
        '<td>' + escapeHtml(s.className) + '</td>' +
        '<td title="' + escapeHtml(detail) + '" class="num-strong">' + escapeHtml(validStudent ? fmtScore(score) : "—") + '</td>' +
        '<td>' + escapeHtml(validStudent ? formatRank(s.schoolRank) : "—") + '</td>' +
        '<td>' + escapeHtml(validStudent ? formatRank(s.classRank) : "—") + '</td>' +
        '<td>' + (validStudent ? '<span class="grade-badge ' + gradeClass(s.grade) + '">' + escapeHtml(s.grade) + '</span>' : '<span class="muted">未参考</span>') + '</td>' +
      '</tr>';
    }).join("");
  }

  const classStudents = state.students.filter(s => state.classFilter === "all" || s.className === state.classFilter);
  const classInvalidCount = classStudents.filter(s => !isValidScore(scoreOf(s, subjectKey))).length;
  const countText = "显示 " + list.length + " 人" + (classInvalidCount ? " · 未参考 " + classInvalidCount + " 人" : "");
  $("#rankCount").textContent = countText;
  renderGradeSummary();
}

function renderAll(){
  renderSummary();
  renderOverview();
  renderBasic();
  renderSegmentSubjectFilter();
  renderSegment();
  renderTopN();
  renderRanking();
  updateRankingDownloadButtons();
  renderHeatmap();
  renderProfile();
  renderWeakness();
}
