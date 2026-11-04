/* =========================================================
   基础分析（systems/basic/basic.html）云端数据桥接
   - 选择「年级 → 考试」后载入成绩
   - 比对（参考）考试只能选择本年级的考试
   ========================================================= */
(function () {
  "use strict";

  var STORE = window.JZStore;
  var UI = window.JZUI;

  function ready() {
    try { return STORE.isReady(); } catch (e) { return false; }
  }

  function examLabel(grade, exam) {
    return (grade && grade.name ? grade.name + " · " : "") + (exam && exam.name ? exam.name : "");
  }

  /* 载入一场考试并渲染全部分析 */
  async function loadExam(exam, grade) {
    UI.busy(true, "正在读取「" + exam.name + "」的成绩…");
    try {
      var data = await STORE.getExamRows(exam.id);
      var dataset = window.buildDataset(STORE.toAoA(data.header, data.rows));
      var label = examLabel(grade, exam);
      if (grade && grade.id) UI.rememberGrade(grade.id);
      window.applyDataset(dataset, label);
      if (typeof state !== "undefined" && state) {
        state.gradeId = grade && grade.id ? grade.id : "";
        state.gradeName = grade && grade.name ? grade.name : "";
      }
      UI.rememberExam("basic", exam, grade);
      UI.toast("已载入：" + label, "success");
      return true;
    } catch (err) {
      window.setBanner("error", "读取云端成绩失败：<strong>" + window.escapeHtml(err.message) + "</strong>",
        "请联系管理员检查该考试数据。", false);
      UI.toast("读取失败：" + err.message, "error");
      var dashboard = document.getElementById("dashboard");
      if (!dashboard || dashboard.classList.contains("hidden")) showExamEmpty();
      return false;
    } finally {
      UI.busy(false);
    }
  }

  function showExamEmpty() {
    var empty = document.getElementById("examEmpty");
    if (empty) empty.classList.remove("hidden");
  }

  function hideExamEmpty() {
    var empty = document.getElementById("examEmpty");
    if (empty) empty.classList.add("hidden");
  }

  async function pickAndLoadExam() {
    var picked = await UI.pickExam({ title: "选择考试成绩" });
    if (!picked) {
      var dashboard = document.getElementById("dashboard");
      if (!dashboard || dashboard.classList.contains("hidden")) showExamEmpty();
      return;
    }
    hideExamEmpty();
    await loadExam(picked.exam, picked.grade);
  }

  function currentDataset() {
    try {
      return (typeof state !== "undefined" && state) ? state : null;
    } catch (e) {
      return null;
    }
  }

  /* 选择比对（参考）考试 */
  async function pickReferenceExam() {
    var st = currentDataset();
    if (!st || !st.students || !st.students.length) {
      UI.toast("请先选择本次考试成绩", "error");
      return;
    }
    var gradeId = st.gradeId || "";
    if (!gradeId) {
      UI.toast("请先选择本次考试，再选择比对考试", "error");
      return;
    }
    var picked = await UI.pickExam({
      title: "选择比对（参考）考试成绩",
      gradeId: gradeId,
      lockGrade: true
    });
    if (!picked) return;
    if (picked.grade && picked.grade.id !== gradeId) {
      UI.toast("对比考试只能选择本年级的考试", "error");
      return;
    }
    UI.busy(true, "正在读取比对考试…");
    try {
      var data = await STORE.getExamRows(picked.exam.id);
      var dataset = window.buildDataset(STORE.toAoA(data.header, data.rows));
      var label = examLabel(picked.grade, picked.exam);
      window.applyReferenceDataset(dataset, label);
      UI.toast("比对考试已加载：" + label, "success");
    } catch (err) {
      window.setBanner("error", "读取比对考试失败：<strong>" + window.escapeHtml(err.message) + "</strong>",
        "请确认该考试已上传成绩。", false);
      UI.toast("读取失败：" + err.message, "error");
    } finally {
      UI.busy(false);
    }
  }

  /* 支持从门户/后台带 ?exam=<id> 直接打开某场考试 */
  async function loadFromQuery() {
    try { if (window.JZCloud && window.JZCloud.ready) await window.JZCloud.ready(); } catch (e) { /* ignore */ }
    if (!ready()) return false;
    var id = "";
    try { id = new URLSearchParams(window.location.search).get("exam") || ""; } catch (e) { id = ""; }
    if (!id) return false;
    UI.busy(true, "正在读取考试信息…");
    try {
      var exam = await STORE.getExam(id);
      if (!exam) throw new Error("找不到该考试，可能已被删除");
      var grades = await STORE.listGrades();
      var grade = (grades || []).filter(function (g) { return g.id === exam.grade_id; })[0] || null;
      UI.busy(false);
      var ok = await loadExam(exam, grade);
      if (ok) hideExamEmpty();
      return ok;
    } catch (err) {
      UI.busy(false);
      UI.toast(err.message, "error");
      return false;
    }
  }

  function bind() {
    var b2 = document.getElementById("pickExamBtn2");
    if (b2) b2.addEventListener("click", pickAndLoadExam);

    var emptyBtn = document.getElementById("emptyPickExamBtn");
    if (emptyBtn) emptyBtn.addEventListener("click", pickAndLoadExam);

    /* 比对考试统一在顶部「当前考试」栏选择，三个子页签共用同一份比对数据 */
    var refBtn = document.getElementById("globalRefPickBtn");
    if (refBtn) refBtn.addEventListener("click", pickReferenceExam);
  }

  async function loadRemembered() {
    var mem = UI.getRememberedExam("basic");
    if (!mem || !mem.examId) return false;
    try {
      var exam = await STORE.getExam(mem.examId);
      if (!exam) return false;
      var grades = await STORE.listGrades();
      var grade = (grades || []).filter(function (g) { return g.id === exam.grade_id; })[0] || null;
      var ok = await loadExam(exam, grade);
      if (ok) hideExamEmpty();
      return ok;
    } catch (e) {
      return false;
    }
  }

  async function start() {
    var loaded = await loadFromQuery();
    if (!loaded) loaded = await loadRemembered();
    if (!loaded) await pickAndLoadExam();
  }

  function init() {
    try { UI.mountNav({ base: "../../", page: "basic" }); } catch (e) { /* 导航失败不影响分析 */ }
    bind();
    start();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
