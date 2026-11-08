"use strict";

/* =========================================================
   应用已构建的数据集（云端考试）
   ========================================================= */
function applyDataset(dataset, fileName){
  state.students = dataset.students;
  state.subjects = dataset.subjects;
  state.classes = dataset.classes;
  state.fileName = fileName || dataset.fileName || "";
  state.teacherGrade = detectTeacherGrade(state.fileName);
  state.blankRows = dataset.blankRows;
  state.warnings = dataset.warnings || [];
  state.reference = null;
  state.rankSubject = "__total__";
  state.classFilter = "all";
  state.gradeFilter = "all";
  state.search = "";
  state.rankSort = "school";
  state.weakScope = "all";
  state.weakSort = "total";
  state.weakFilter = "all";
  state.weakSearch = "";
  state.weakPage = 1;
  const weakSearchInput = document.getElementById("weakSearch");
  if (weakSearchInput) weakSearchInput.value = "";
  state.segmentSubject = state.subjects.some(sub => sub.name === "语文") ? "语文" : (state.subjects[0] ? state.subjects[0].name : "");
  state.heatMetric = "mean";
  state.basicMode = (typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 1100px)").matches) ? "subject" : "class";
  state.subjectView = state.subjects[0] ? state.subjects[0].name : "__total__";
  state.subjectViewSort = "class";
  state.rosterSubject = "__total__";
  /* 每次载入新考试时，“总分是否包含生物地理”恢复为默认不包含 */
  state.includeBioGeo = false;
  rememberBaseTotals(state.students);
  if (typeof updateBioGeoToggleUi === "function") updateBioGeoToggleUi();
  if (typeof applyBasicUiPreferences === "function") applyBasicUiPreferences();

  prepareFullScores();
  refreshComputed();

  const empty = $("#examEmpty");
  if (empty) empty.classList.add("hidden");
  const dashboard = $("#dashboard");
  if (dashboard) dashboard.classList.remove("hidden");
  if ($("#rankSort")) $("#rankSort").value = state.rankSort;
  if ($("#searchInput")) $("#searchInput").value = "";
  updateReferenceUi();

  renderClassFilter();
  renderRankSubjectFilter();
  renderGradeFilter();
  renderGradeLegend();
  renderWeaknessScopeFilter();
  renderTeacherGradeFilter();
  renderAll();
  if (typeof restoreBasicTab === "function") restoreBasicTab();

  const examNameEl = document.getElementById("cloudExamName");
  if (examNameEl) {
    const parts = String(state.fileName || "").split(" · ");
    const gradePart = parts.length > 1 ? parts[0] : "";
    const hasExam = !!String(state.fileName || "").trim();
    examNameEl.classList.toggle("is-empty", !hasExam);
    examNameEl.title = hasExam ? String(state.fileName || "") : "";
    if (/(20\d{2})\s*届/.test(gradePart)) {
      examNameEl.innerHTML = '<span class="jz-exam-grade">' + escapeHtml(gradePart) + "</span>" +
        '<span class="jz-exam-sep">·</span>' +
        '<span class="jz-exam-text">' + escapeHtml(parts.slice(1).join(" · ")) + "</span>";
    } else {
      examNameEl.textContent = hasExam ? state.fileName : "—";
    }
  }

  const subjectNames = state.subjects.map(s => s.name).join("、");
  const warnHtml = state.warnings.length
    ? " · " + escapeHtml(state.warnings.join("；"))
    : "";
  const seriousWarnings = state.warnings.filter(w => !w.startsWith("已忽略"));
  if (seriousWarnings.length) {
    setBanner(
      "warn",
      "已导入 <strong>" + state.students.length + "</strong> 名学生、<strong>" + state.classes.length + "</strong> 个班级、<strong>" + state.subjects.length + "</strong> 个学科。",
      "学科：" + escapeHtml(subjectNames) + warnHtml,
      true
    );
  } else {
    hideBanner();
  }
}

function renderClassFilter(){
  const sel = $("#classFilter");
  let html = '<option value="all">全级</option>';
  for (const cls of state.classes) html += '<option value="' + escapeHtml(cls) + '">' + escapeHtml(cls) + '</option>';
  sel.innerHTML = html;
  sel.value = state.classFilter;
}

function renderRankSubjectFilter(){
  const sel = $("#rankSubject");
  let html = '<option value="__total__">总分</option>';
  for (const sub of state.subjects) {
    html += '<option value="' + escapeHtml(sub.name) + '">' + escapeHtml(sub.name) + '</option>';
  }
  sel.innerHTML = html;
  if (!state.subjects.some(sub => sub.name === state.rankSubject)) state.rankSubject = "__total__";
  sel.value = state.rankSubject;
}
