"use strict";

/* =========================================================
   界面偏好记忆
   ========================================================= */
const BASIC_UI_PREFS_KEY = "jz_basic_ui_prefs_v1";

function readBasicUiPrefs(){
  const raw = safeLocalGet(BASIC_UI_PREFS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveBasicUiPrefs(patch){
  const prefs = Object.assign({}, readBasicUiPrefs(), patch || {});
  safeLocalSet(BASIC_UI_PREFS_KEY, JSON.stringify(prefs));
}

function applyBasicUiPreferences(){
  const prefs = readBasicUiPrefs();
  const narrow = typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 1100px)").matches;
  if (prefs.metric && METRICS.some(m => m.key === prefs.metric)) state.metric = prefs.metric;
  if (!narrow && (prefs.basicMode === "class" || prefs.basicMode === "subject")) {
    state.basicMode = prefs.basicMode;
  }
  if (prefs.subjectView && (prefs.subjectView === "__total__" ||
    state.subjects.some(sub => sub.name === prefs.subjectView))) {
    state.subjectView = prefs.subjectView;
  }
  if (["class", "rank", "diff"].includes(prefs.subjectViewSort)) {
    state.subjectViewSort = prefs.subjectViewSort;
  }
}

function restoreBasicTab(){
  const tab = readBasicUiPrefs().tab;
  if (!tab) return;
  const btn = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
  if (btn) switchTab(tab, btn);
}

/* =========================================================
   事件绑定
   ========================================================= */
function switchTab(tab, btn){
  $$(".tab-panel").forEach(el => el.classList.remove("active"));
  $$(".tab-btn").forEach(el => el.classList.remove("active"));
  const panel = document.getElementById("tab-" + tab);
  if (panel) panel.classList.add("active");
  if (btn) btn.classList.add("active");
  saveBasicUiPrefs({ tab });
  requestAnimationFrame(() => {
    if (typeof updateViewSwitchThumb === "function") updateViewSwitchThumb();
    if (typeof updateTopnSwitchThumb === "function") updateTopnSwitchThumb();
    if (typeof updateWeakSwitchThumb === "function") updateWeakSwitchThumb();
  });
  if (tab === "basic") {
    updateBasicStickyOffsets();
    requestAnimationFrame(updateBasicStickyOffsets);
  }
}
let weakPrintPageSizeBackup = null;

function bindEvents(){
  window.addEventListener("dragover", e => e.preventDefault());
  window.addEventListener("drop", e => e.preventDefault());

  $("#bannerClose").addEventListener("click", hideBanner);

  $$(".tab-btn").forEach(btn => btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab"), btn)));

  $("#fullScoreBtn").addEventListener("click", openFullScoreSettings);
  $("#saveFullScores").addEventListener("click", saveFullScoreSettings);
  $("#resetFullScores").addEventListener("click", resetFullScoreSettings);
  $("#fullScoreList").addEventListener("input", updateTotalFullPreview);

  const includeBioGeoInput = $("#includeBioGeo");
  if (includeBioGeoInput) {
    includeBioGeoInput.addEventListener("change", e => {
      state.includeBioGeo = !!e.target.checked;
      refreshComputed();
      updateTotalFullPreview();
      renderAll();
      toast(state.includeBioGeo ? "总分已包含生物、地理" : "总分未包含生物、地理", "success");
    });
  }

  $("#rankSubject").addEventListener("change", e => {
    state.rankSubject = e.target.value;
    state.gradeFilter = "all";
    $("#gradeFilter").value = "all";
    computeRankings();
    renderRanking();
  });
  $("#classFilter").addEventListener("change", e => {
    state.classFilter = e.target.value;
    state.gradeFilter = "all";
    $("#gradeFilter").value = "all";
    renderRanking();
    updateRankingDownloadButtons();
  });
  $("#gradeFilter").addEventListener("change", e => {
    state.gradeFilter = e.target.value;
    renderRanking();
  });
  $("#rankSort").addEventListener("change", e => {
    state.rankSort = e.target.value;
    renderRanking();
  });
  $("#weakScope").addEventListener("change", e => {
    state.weakScope = e.target.value;
    updateWeakExportButton();
    state.weakPage = 1;
    renderWeakness();
  });
  $("#weakSort").addEventListener("change", e => {
    state.weakSort = e.target.value;
    state.weakPage = 1;
    renderWeakness();
  });
  $("#weakTypeChips").addEventListener("click", e => {
    const btn = e.target.closest("[data-weak-filter]");
    if (!btn) return;
    state.weakFilter = btn.getAttribute("data-weak-filter");
    state.weakPage = 1;
    $$("#weakTypeChips [data-weak-filter]").forEach(item => {
      item.classList.toggle("active", item.getAttribute("data-weak-filter") === state.weakFilter);
    });
    renderWeakness();
  });

  const weakSearch = $("#weakSearch");
  if (weakSearch) {
    let weakSearchTimer = null;
    weakSearch.addEventListener("input", () => {
      if (weakSearchTimer) clearTimeout(weakSearchTimer);
      weakSearchTimer = setTimeout(() => {
        state.weakSearch = weakSearch.value.trim();
        /* 搜索时自动回到「全级」，避免学生被当前班级筛选挡住 */
        if (state.weakSearch && state.weakScope !== "all") {
          state.weakScope = "all";
          const scopeSel = $("#weakScope");
          if (scopeSel) scopeSel.value = "all";
        }
        state.weakPage = 1;
        renderWeakness();
      }, 160);
    });
  }

  const weakBodyEl = $("#weakBody");
  if (weakBodyEl) {
    weakBodyEl.addEventListener("click", e => {
      const btn = e.target.closest("[data-student-index]");
      if (!btn) return;
      openStudentReport(Number(btn.getAttribute("data-student-index")));
    });
  }

  const srMask = $("#studentReportModal");
  if (srMask) {
    srMask.addEventListener("click", e => { if (e.target === srMask) closeStudentReport(); });
    ["srClose", "srCloseBtn"].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener("click", closeStudentReport);
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !srMask.hidden) closeStudentReport();
    });
  }

  const weakPrevPage = $("#weakPrevPage");
  if (weakPrevPage) weakPrevPage.addEventListener("click", () => weakChangePage(-1));
  const weakNextPage = $("#weakNextPage");
  if (weakNextPage) weakNextPage.addEventListener("click", () => weakChangePage(1));
  const weakPageSize = $("#weakPageSize");
  if (weakPageSize) {
    weakPageSize.addEventListener("change", e => {
      state.weakPageSize = Number(e.target.value) || 0;
      state.weakPage = 1;
      renderWeakness();
    });
  }

  let searchTimer = null;
  $("#searchInput").addEventListener("input", e => {
    const val = e.target.value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = val.trim();
      renderRanking();
    }, 160);
  });

  const metricChips = $("#metricChips");
  if (metricChips) {
    metricChips.addEventListener("click", e => {
      const btn = e.target.closest("[data-metric]");
      if (!btn) return;
      const key = btn.getAttribute("data-metric");
      if (!METRICS.some(m => m.key === key)) return;
      if (state.metric === key) return;
      state.metric = key;
      saveBasicUiPrefs({ metric: key });
      renderBasic();
    });
  }

  const subjectViewChips = $("#subjectViewChips");
  if (subjectViewChips) {
    subjectViewChips.addEventListener("click", e => {
      const btn = e.target.closest("[data-subject-view]");
      if (!btn) return;
      const key = btn.getAttribute("data-subject-view");
      if (key !== "__total__" && !state.subjects.some(sub => sub.name === key)) return;
      state.subjectView = key;
      state.rosterSubject = key;   // 人数名单的学科跟随当前分析学科
      saveBasicUiPrefs({ subjectView: key });
      renderBasic();
    });
  }

  const subjectViewSort = $("#subjectViewSort");
  if (subjectViewSort) {
    subjectViewSort.addEventListener("change", e => {
      state.subjectViewSort = e.target.value;
      saveBasicUiPrefs({ subjectViewSort: state.subjectViewSort });
      renderBasic();
    });
  }

  $("#basicModeChips").addEventListener("click", e => {
    const btn = e.target.closest("[data-basic-mode]");
    if (!btn) return;
    const mode = btn.getAttribute("data-basic-mode");
    if (mode !== "class" && mode !== "subject") return;
    state.basicMode = mode;
    if (mode === "subject" && state.subjectView) state.rosterSubject = state.subjectView;
    saveBasicUiPrefs({ basicMode: mode });
    renderBasic();
    const wrap = $(".basic-table-wrap");
    if (wrap) {
      wrap.scrollLeft = 0;
      requestAnimationFrame(() => { wrap.scrollLeft = 0; });
    }
  });

  $("#basicRosterSubject").addEventListener("change", e => {
    state.rosterSubject = e.target.value;
    renderBasic();
  });

  $("#segmentSubject").addEventListener("change", e => {
    state.segmentSubject = e.target.value;
    renderSegment();
  });

  $("#heatMetricChips").addEventListener("click", e => {
    const btn = e.target.closest("[data-heat-metric]");
    if (!btn) return;
    const key = btn.getAttribute("data-heat-metric");
    if (!HEAT_METRICS.includes(key)) return;
    state.heatMetric = key;
    renderHeatmap();
  });

  const globalRefClear = $("#globalRefClearBtn");
  if (globalRefClear) {
    globalRefClear.addEventListener("click", () => {
      state.reference = null;
      updateReferenceUi();
      renderBasic();
      renderTopN();
      renderProfile();
      toast("已清除比对考试", "success");
    });
  }
  $("#topnModeButtons").addEventListener("click", e => {
    const btn = e.target.closest("[data-topn-mode]");
    if (!btn) return;
    const mode = Number(btn.getAttribute("data-topn-mode"));
    if (mode !== 1 && mode !== 2) return;
    state.topnMode = mode;
    $$("#topnModeButtons [data-topn-mode]").forEach(item => {
      item.classList.toggle("active", Number(item.getAttribute("data-topn-mode")) === mode);
    });
    renderTopN();
  });

  const exportOverviewCsv = $("#exportOverview");
  if (exportOverviewCsv) exportOverviewCsv.addEventListener("click", exportOverview);
  $("#exportOverviewXlsx").addEventListener("click", exportOverviewXlsx);
  $("#exportOverviewImage").addEventListener("click", exportOverviewImage);
  $("#exportBasicXlsx").addEventListener("click", exportBasicCurrentXlsx);
  const exportBasicImgBtn = $("#exportBasicImage");
  if (exportBasicImgBtn) exportBasicImgBtn.addEventListener("click", exportBasicImage);
  $("#exportRanking").addEventListener("click", exportRankingCurrentXlsx);
  $("#exportWeaknessXlsx").addEventListener("click", exportWeaknessXlsx);
  $("#exportSegmentXlsx").addEventListener("click", exportSegmentXlsx);
  const exportSegmentImgBtn = $("#exportSegmentImage");
  if (exportSegmentImgBtn) exportSegmentImgBtn.addEventListener("click", exportSegmentImage);
  $("#exportRosterXlsx").addEventListener("click", exportRosterXlsx);
  const rosterContent = $("#basicRosterContent");
  if (rosterContent) {
    rosterContent.addEventListener("click", e => {
      const xlsxBtn = e.target.closest("[data-roster-xlsx]");
      if (xlsxBtn) {
        exportRosterClassXlsx(xlsxBtn.getAttribute("data-roster-xlsx"));
        return;
      }
      const pngBtn = e.target.closest("[data-roster-png]");
      if (pngBtn) exportRosterClassPng(pngBtn.getAttribute("data-roster-png"));
    });
  }
  $("#printBtn").addEventListener("click", () => window.print());
  $$(".print-panel").forEach(btn => btn.addEventListener("click", () => window.print()));
  $("#rankDownloadSchool").addEventListener("click", () => exportRankingXlsx("school"));
  $("#rankDownloadClassAll").addEventListener("click", () => exportRankingXlsx("classAll"));
  $("#rankDownloadClassCurrent").addEventListener("click", () => exportRankingXlsx("classCurrent"));
  $("#heatDownloadXlsx").addEventListener("click", exportHeatXlsx);
  $("#heatDownloadImage").addEventListener("click", exportHeatImage);
  $("#exportTopnXlsx").addEventListener("click", exportTopnXlsx);
  const exportTopnImgBtn = $("#exportTopnImage");
  if (exportTopnImgBtn) exportTopnImgBtn.addEventListener("click", exportTopnImage);
  const exportWeakImgBtn = $("#exportWeakImage");
  if (exportWeakImgBtn) exportWeakImgBtn.addEventListener("click", exportWeaknessImage);
  updateWeakExportButton();
  $("#profileGrid").addEventListener("click", e => {
    const btn = e.target.closest("[data-profile-download]");
    if (!btn) return;
    const card = btn.closest(".profile-card");
    if (card) downloadProfileCardImage(card);
  });

  window.addEventListener("resize", () => {
    if (typeof updateViewSwitchThumb === "function") updateViewSwitchThumb();
    if (typeof updateTopnSwitchThumb === "function") updateTopnSwitchThumb();
    if (typeof updateWeakSwitchThumb === "function") updateWeakSwitchThumb();
    if (state.students.length) requestAnimationFrame(updateBasicStickyOffsets);
  });

  window.addEventListener("beforeprint", () => {
    const active = $(".tab-btn.active");
    if (active) switchTab(active.getAttribute("data-tab"), active);
    /* 打印优弱势表时输出全部学生，不受分页限制 */
    const weakPanel = document.getElementById("tab-weakness");
    if (weakPanel && weakPanel.classList.contains("active")) {
      weakPrintPageSizeBackup = state.weakPageSize;
      state.weakPageSize = 0;
      if (typeof renderWeakness === "function") renderWeakness();
    }
    const meta = $("#printMeta");
    if (meta) {
      const now = new Date();
      meta.textContent = state.fileName + " · " +
        now.toLocaleDateString("zh-CN") + " " + now.toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit" });
    }
  });

  window.addEventListener("afterprint", () => {
    if (weakPrintPageSizeBackup === null) return;
    state.weakPageSize = weakPrintPageSizeBackup;
    weakPrintPageSizeBackup = null;
    if (typeof renderWeakness === "function") renderWeakness();
  });
}

function loadPreferences(){
  const storedFull = safeLocalGet(FULL_SCORE_STORAGE_KEY);
  if (storedFull) {
    try {
      const parsed = JSON.parse(storedFull);
      if (parsed && typeof parsed === "object") state.fullScores = parsed;
    } catch(e) { /* 忽略损坏的本地配置 */ }
  }
}

function init(){
  bindEvents();
  loadPreferences();
  renderTeacherGradeFilter();
  if (typeof renderMetricChips === "function") renderMetricChips();
  if (typeof updateViewSwitchThumb === "function") updateViewSwitchThumb();
  if (typeof updateTopnSwitchThumb === "function") updateTopnSwitchThumb();
  if (typeof updateWeakSwitchThumb === "function") updateWeakSwitchThumb();
  renderGradeLegend();
  updateReferenceUi();
  hideBanner();
}

init();

/* 调试与自动化测试入口 */
window.__scoreApp = {
  state,
  parseXlsx,
  parseCsvText,
  buildDataset,
  computeStat,
  computeRankings,
  buildBasicAnalysis,
  computeClassProfiles,
  datasetForCurrent,
  updateReferenceUi,
  renderProfile,
  renderBarSubjectLegend,
  classContributionBarSvg,
  computeWeaknessData,
  renderWeakness,
  renderWeaknessScopeFilter,
  weaknessType,
  segmentBands,
  renderSegment,
  renderSegmentSubjectFilter,
  countAtLeast,
  renderHeatmap,
  heatMetric,
  heatBand,
  getFull,
  GRADE_BANDS,
  TEACHER_ROSTER,
  headTeacherFor,
  subjectTeacherFor,
  detectTeacherGrade,
  renderTeacherGradeFilter,
  updateBasicStickyOffsets,
  renderOverview,
  renderBasic,
  renderRanking,
  renderTopN,
  renderAll,
  computeAllRankTables,
  buildXlsxBlob,
  downloadXlsx,
  exportOverviewXlsx,
  exportOverviewImage,
  exportRankingXlsx,
  exportHeatXlsx,
  exportHeatImage,
  exportTopnXlsx
};

/* 云端任教名单异步载入后重绘（名单在页面打开后才到达，需要刷新班主任/任课教师列） */
window.addEventListener("jz:roster-updated", function () {
  if (!state.students || !state.students.length) return;
  try {
    renderTeacherGradeFilter();
    renderAll();
  } catch (e) { /* 某个板块尚未初始化时忽略 */ }
});
