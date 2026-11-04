/* =========================================================
   试题分析系统 · 云端数据接入
   选择「年级 → 考试 → 科目」后读取云端试题卷，解析逻辑与本地模板完全一致
   ========================================================= */
(function () {
  "use strict";

  var STORE = window.JZStore;
  var UI = window.JZUI;

  async function loadPaper(paper, grade, exam) {
    if (!paper) return;
    if (grade && grade.id) UI.rememberGrade(grade.id);
    var name = (grade && grade.name ? grade.name + " · " : "") +
      (exam && exam.name ? exam.name + " · " : "") + paper.subject;
    UI.busy(true, "正在读取「" + paper.subject + "」试题卷…");
    try {
      var rows = paper.rows || [];
      var parsed = parseExcelData(rows);
      if (!parsed) throw new Error("试题卷数据不完整（缺少表头、满分值或“全校/全级”行），请重新上传该科目");
      loadParsedData(parsed, name, "云端试题卷 · " + (paper.question_count || parsed.headers.length) + " 题");
      var nameEl = document.getElementById("cloudExamName");
      if (nameEl) {
        nameEl.textContent = name;
        nameEl.classList.remove("is-empty");
      }
      var pickBtn = document.getElementById("pickPaperBtn");
      if (pickBtn) pickBtn.textContent = "选择其他试题";
      UI.rememberExam("question", exam, grade, { paperId: paper.id, subject: paper.subject, name: name });
      UI.toast("已载入：" + name, "success");
    } catch (err) {
      var msg = document.getElementById("statusMsg");
      if (msg) {
        msg.className = "status-msg error";
        msg.textContent = "❌ " + (err && err.message ? err.message : err);
        msg.style.display = "block";
      }
      UI.toast("读取失败：" + (err && err.message ? err.message : err), "error");
    } finally {
      UI.busy(false);
    }
  }

  async function pickPaperAndLoad() {
    if (!UI || !STORE) return;
    var picked = await UI.pickPaper({ title: "选择试题分析数据" });
    if (!picked || !picked.paper) return;
    await loadPaper(picked.paper, picked.grade, picked.exam);
  }

  async function restoreRemembered() {
    if (!UI || !STORE) return;
    try { if (window.JZCloud && window.JZCloud.ready) await window.JZCloud.ready(); } catch (e) { /* ignore */ }
    if (!STORE.isReady || !STORE.isReady()) return;
    var mem = UI.getRememberedExam("question");
    if (!mem || !mem.examId || !mem.extra || !mem.extra.paperId) return;
    try {
      var paper = await STORE.getPaper(mem.extra.paperId);
      if (!paper) return;
      var exam = await STORE.getExam(mem.examId);
      var grades = await STORE.listGrades();
      var grade = (grades || []).filter(function (g) { return g.id === (exam && exam.grade_id); })[0] || null;
      await loadPaper(paper, grade, exam);
    } catch (e) { /* ignore */ }
  }

  function init() {
    try { UI.mountNav({ base: "../../", page: "question" }); } catch (e) { /* ignore */ }
    var btn = document.getElementById("pickPaperBtn");
    if (btn) btn.addEventListener("click", pickPaperAndLoad);
    restoreRemembered();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
