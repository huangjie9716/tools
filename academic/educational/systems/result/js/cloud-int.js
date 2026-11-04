/* =========================================================
   结果评价分析系统 · 云端数据接入
   选择「年级 → 考试」后，用与本地文件完全相同的解析逻辑（Data.parseRows）处理成绩
   ========================================================= */
(function () {
  "use strict";

  var STORE = window.JZStore;
  var UI = window.JZUI;

  function label(grade, exam) {
    return (grade && grade.name ? grade.name + " · " : "") + (exam && exam.name ? exam.name : "");
  }

  async function loadPicked(picked) {
    if (!picked || !picked.exam) return;
    if (picked.grade && picked.grade.id) UI.rememberGrade(picked.grade.id);
    UI.busy(true, "正在读取「" + picked.exam.name + "」的成绩…");
    try {
      var data = await STORE.getExamRows(picked.exam.id);
      var rows = STORE.toAoA(data.header, data.rows);
      if (window.JZResult && window.JZResult.reset) window.JZResult.reset();
      var parsed = window.Data.parseRows(rows);
      var name = label(picked.grade, picked.exam);
      window.JZResult.applyParsedData(parsed, name);
      UI.rememberExam("result", picked.exam, picked.grade);
      UI.toast("已载入：" + name, "success");
    } catch (err) {
      alert("读取云端考试失败：" + (err && err.message ? err.message : err));
    } finally {
      UI.busy(false);
    }
  }

  async function pickExamAndLoad() {
    if (!UI || !STORE) return;
    var picked = await UI.pickExam({ title: "选择考试成绩" });
    if (!picked) return;
    await loadPicked(picked);
  }

  async function restoreRemembered() {
    if (!UI || !STORE) return;
    try { if (window.JZCloud && window.JZCloud.ready) await window.JZCloud.ready(); } catch (e) { /* ignore */ }
    if (!STORE.isReady || !STORE.isReady()) return;
    var mem = UI.getRememberedExam("result");
    if (!mem || !mem.examId) return;
    try {
      var exam = await STORE.getExam(mem.examId);
      if (!exam) return;
      var grades = await STORE.listGrades();
      var grade = (grades || []).filter(function (g) { return g.id === exam.grade_id; })[0] || null;
      await loadPicked({ exam: exam, grade: grade });
    } catch (e) { /* ignore */ }
  }

  function init() {
    try { UI.mountNav({ base: "../../", page: "result" }); } catch (e) { /* ignore */ }
    var btn = document.getElementById("pickResultExam");
    if (btn) btn.addEventListener("click", pickExamAndLoad);
    restoreRemembered();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
