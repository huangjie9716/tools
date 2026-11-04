/* =========================================================
   导出成绩条
   ---------------------------------------------------------
   流程：年级 → 考试场次（可多选）→ 班级 → 学生（可选全班）
   表格：学生信息 + 每场考试「总分 + 各学科」的分数与排名
   ========================================================= */
(function () {
  "use strict";

  var STORE = window.JZStore;
  var UI = window.JZUI;

  function $(sel) { return document.querySelector(sel); }
  function esc(v) {
    return window.escapeHtml ? window.escapeHtml(v) : String(v === null || v === undefined ? "" : v);
  }
  function toNum(v) { return window.toNumber ? window.toNumber(v) : (Number.isFinite(Number(v)) ? Number(v) : null); }
  function normClass(v) { return window.normalizeClass ? window.normalizeClass(v) : String(v || ""); }
  function cmpClass(a, b) {
    return window.classCompare ? window.classCompare(a, b) : String(a).localeCompare(String(b), "zh-CN", { numeric: true });
  }
  function scoreText(v) {
    var n = Number(v);
    if (!Number.isFinite(n)) return "";
    return String(Math.round(n * 100) / 100);
  }
  function keyOf(st) {
    var id = st && st.id ? String(st.id) : "";
    return id ? "id:" + id : "nm:" + (st && st.name ? st.name : "") + "@" + (st && st.className ? st.className : "");
  }
  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function fileStamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }
  function safeName(v) {
    return String(v || "").replace(/[\\/:*?"<>|\s]+/g, "_");
  }

  var S = {
    grades: [],
    gradeId: "",
    exams: [],
    picked: {},
    loaded: {},
    students: [],
    classPicked: {},
    chosen: {},
    built: null
  };

  /* ---------------- 排名 ---------------- */

  /* 并列同名次：同分共用名次，下一档跳号（1,2,2,4） */
  function rankMap(list) {
    var arr = [];
    list.forEach(function (item) {
      var n = toNum(item.v);
      if (n === null) return;
      arr.push({ key: item.key, v: n });
    });
    arr.sort(function (a, b) { return b.v - a.v; });
    var map = {};
    var prevRank = 0;
    var prevValue = null;
    for (var i = 0; i < arr.length; i++) {
      var rank = (prevValue !== null && arr[i].v === prevValue) ? prevRank : i + 1;
      map[arr[i].key] = rank;
      prevRank = rank;
      prevValue = arr[i].v;
    }
    return map;
  }

  function buildExamData(exam, ds) {
    var subjects = ds.subjects.map(function (s) { return s.name; });
    var out = {
      exam: exam,
      subjects: subjects,
      students: ds.students,
      byKey: {},
      ranks: { school: { total: {}, bySubject: {} }, klass: { total: {}, bySubject: {} } }
    };
    ds.students.forEach(function (st) { out.byKey[keyOf(st)] = st; });

    out.ranks.school.total = rankMap(ds.students.map(function (st) {
      return { key: keyOf(st), v: st.total };
    }));
    subjects.forEach(function (name) {
      out.ranks.school.bySubject[name] = rankMap(ds.students.map(function (st) {
        return { key: keyOf(st), v: st.scores[name] };
      }));
    });

    var byClass = {};
    ds.students.forEach(function (st) {
      if (!byClass[st.className]) byClass[st.className] = [];
      byClass[st.className].push(st);
    });
    Object.keys(byClass).forEach(function (cname) {
      var list = byClass[cname];
      out.ranks.klass.total[cname] = rankMap(list.map(function (st) {
        return { key: keyOf(st), v: st.total };
      }));
      subjects.forEach(function (name) {
        if (!out.ranks.klass.bySubject[name]) out.ranks.klass.bySubject[name] = {};
        out.ranks.klass.bySubject[name][cname] = rankMap(list.map(function (st) {
          return { key: keyOf(st), v: st.scores[name] };
        }));
      });
    });
    return out;
  }

  function lookupRank(ds, subject, student, scope) {
    var k = keyOf(student);
    var map;
    if (subject === "__total__") {
      map = scope === "class"
        ? (ds.ranks.klass.total[student.className] || {})
        : ds.ranks.school.total;
    } else if (scope === "class") {
      var perClass = ds.ranks.klass.bySubject[subject] || {};
      map = perClass[student.className] || {};
    } else {
      map = ds.ranks.school.bySubject[subject] || {};
    }
    var r = map[k];
    return r === undefined ? null : r;
  }

  /* ---------------- 考试选择 ---------------- */

  function pickedIds() {
    return Object.keys(S.picked).filter(function (id) { return S.picked[id]; });
  }

  function examTime(ex) {
    var raw = ex && ex.exam_date ? String(ex.exam_date).replace(" ", "T") : "";
    var t = Date.parse(raw);
    if (!isNaN(t)) return t;
    var c = ex && ex.created_at ? Date.parse(String(ex.created_at).replace(" ", "T")) : NaN;
    return isNaN(c) ? 0 : c;
  }

  /* 选中的考试，按考试时间从最早到最新 */
  function pickedDatasets() {
    var list = [];
    pickedIds().forEach(function (id) {
      if (S.loaded[id]) list.push(S.loaded[id]);
    });
    list.sort(function (a, b) {
      return examTime(a.exam) - examTime(b.exam) || String(a.exam.name).localeCompare(String(b.exam.name), "zh-CN");
    });
    return list;
  }

  function renderExams() {
    var box = $("#stripExams");
    if (!S.exams.length) {
      box.innerHTML = '<span class="strip-hint">该年级还没有上传考试</span>';
      $("#examTools").hidden = true;
      return;
    }
    box.innerHTML = S.exams.map(function (ex) {
      var on = !!S.picked[ex.id];
      var date = ex.exam_date ? String(ex.exam_date).slice(0, 10) : "";
      return '<label class="strip-chip' + (on ? " is-on" : "") + '">' +
        '<input type="checkbox" value="' + esc(ex.id) + '"' + (on ? " checked" : "") + ">" +
        "<span><b>" + esc(ex.name) + "</b>" + (date ? "<i>" + esc(date) + "</i>" : "") + "</span>" +
        "</label>";
    }).join("");
    $("#examTools").hidden = false;
    updateExamCount();
  }

  function updateExamCount() {
    var n = pickedIds().length;
    $("#examCount").textContent = n ? "已选 " + n + " 场" : "未选择";
  }

  async function loadPickedExams() {
    var ids = pickedIds();
    if (!ids.length) {
      resetDownstream("请先选择考试");
      return;
    }
    var missing = ids.filter(function (id) { return !S.loaded[id]; });
    if (missing.length) {
      UI.busy(true, "正在读取 " + missing.length + " 场考试的成绩…");
      try {
        for (var i = 0; i < missing.length; i++) {
          var id = missing[i];
          var exam = S.exams.filter(function (x) { return x.id === id; })[0];
          var data = await STORE.getExamRows(id);
          var ds = window.buildDataset(STORE.toAoA(data.header, data.rows));
          S.loaded[id] = buildExamData(exam, ds);
        }
      } catch (err) {
        var msg = err && err.message ? err.message : String(err);
        UI.toast("读取失败：" + msg, "error");
        UI.busy(false);
        return;
      }
      UI.busy(false);
    }
    rebuildUnion();
  }

  function resetDownstream(hint) {
    S.students = [];
    S.chosen = {};
    S.classPicked = {};
    var cls = $("#stripClasses");
    cls.innerHTML = '<span class="strip-hint">' + esc(hint || "请先选择考试") + "</span>";
    $("#classTools").hidden = true;
    $("#classCount").textContent = "全部班级";
    $("#stripStudents").innerHTML = '<span class="strip-hint">请先选择班级</span>';
    $("#studentTools").hidden = true;
    $("#studentCount").textContent = "未选择";
    $("#stripRun").disabled = true;
    clearResult();
  }

  /* ---------------- 班级 / 学生 ---------------- */

  function rebuildUnion() {
    var map = {};
    var list = [];
    pickedDatasets().forEach(function (ds) {
      ds.students.forEach(function (st) {
        var k = keyOf(st);
        if (map[k]) return;
        map[k] = { key: k, id: st.id, name: st.name, className: st.className };
        list.push(map[k]);
      });
    });
    list.sort(function (a, b) {
      return cmpClass(a.className, b.className) ||
        String(a.id || "").localeCompare(String(b.id || ""), "zh-CN", { numeric: true }) ||
        String(a.name).localeCompare(String(b.name), "zh-CN");
    });
    S.students = list;

    var classes = [];
    list.forEach(function (s) { if (classes.indexOf(s.className) < 0) classes.push(s.className); });
    classes.sort(cmpClass);

    var prev = S.classPicked;
    var keep = {};
    Object.keys(prev).forEach(function (c) { if (classes.indexOf(c) >= 0) keep[c] = true; });
    S.classPicked = keep;
    renderClasses(classes);

    S.chosen = {};
    renderStudents();
  }

  /* 班级：平铺勾选（不勾选视为全部班级） */
  function allClasses() {
    var classes = [];
    S.students.forEach(function (s) { if (classes.indexOf(s.className) < 0) classes.push(s.className); });
    return classes.sort(cmpClass);
  }

  function renderClasses(classes) {
    var box = $("#stripClasses");
    var list = classes || allClasses();
    if (!list.length) {
      box.innerHTML = '<span class="strip-hint">没有可显示的班级</span>';
      $("#classTools").hidden = true;
      updateClassCount();
      return;
    }
    box.innerHTML = list.map(function (c) {
      var on = !!S.classPicked[c];
      return '<label class="strip-check' + (on ? " is-on" : "") + '">' +
        '<input type="checkbox" value="' + esc(c) + '"' + (on ? " checked" : "") + ">" +
        "<span><b>" + esc(c) + "</b></span></label>";
    }).join("");
    $("#classTools").hidden = false;
    updateClassCount();
  }

  function updateClassCount() {
    var n = Object.keys(S.classPicked).length;
    var el = $("#classCount");
    if (el) el.textContent = n ? "已选 " + n + " 个班" : "全部班级";
  }

  function classFilterActive() {
    return Object.keys(S.classPicked).length > 0;
  }

  function visibleStudents() {
    return S.students.filter(function (s) {
      return !classFilterActive() || !!S.classPicked[s.className];
    });
  }

  function renderStudents() {
    var box = $("#stripStudents");
    var list = visibleStudents();
    if (!list.length) {
      box.innerHTML = '<span class="strip-hint">没有可显示的学生</span>';
      $("#studentTools").hidden = true;
      $("#studentCount").textContent = "未选择";
      $("#stripRun").disabled = true;
      return;
    }
    box.innerHTML = list.map(function (st) {
      var on = !!S.chosen[st.key];
      return '<label class="strip-check' + (on ? " is-on" : "") + '">' +
        '<input type="checkbox" value="' + esc(st.key) + '"' + (on ? " checked" : "") + ">" +
        "<span><b>" + esc(st.name) + "</b><i>" + esc(st.className) + (st.id ? "　" + esc(st.id) : "") + "</i></span>" +
        "</label>";
    }).join("");
    $("#studentTools").hidden = false;
    syncPickAll();
    updateStudentCount();
  }

  function syncPickAll() {
    var list = visibleStudents();
    var chosenCount = list.filter(function (s) { return S.chosen[s.key]; }).length;
    var btn = $("#pickAll");
    if (!btn) return;
    var all = list.length > 0 && chosenCount === list.length;
    btn.classList.toggle("is-on", all);
    btn.textContent = all ? "取消该班全选" : "选中该班全部";
    var hint = $("#studentHint");
    if (hint) {
      hint.textContent = all
        ? "已选中当前班级筛选下的全部 " + list.length + " 名学生"
        : "选好班级后点「选中该班全部」，可一次选上整班学生";
    }
  }

  function updateStudentCount() {
    var n = Object.keys(S.chosen).length;
    $("#studentCount").textContent = n ? "已选 " + n + " 人" : "未选择";
    $("#stripRun").disabled = n === 0;
  }

  /* ---------------- 生成表格 ---------------- */

  function clearResult() {
    S.built = null;
    $("#stripResult").hidden = true;
    $("#stripTableWrap").innerHTML = "";
    $("#stripExport").disabled = true;
    $("#stripPrint").disabled = true;
  }

  function generate() {
    var exams = pickedDatasets();
    var chosen = S.students.filter(function (s) { return S.chosen[s.key]; });
    if (!exams.length) { UI.toast("请至少选择一场考试", "error"); return; }
    if (!chosen.length) { UI.toast("请至少选择一名学生", "error"); return; }

    var scope = $("#stripRankScope").value === "class" ? "class" : "school";
    /* 学科列取所选考试的并集，顺序以最新一场考试为准 */
    var subjects = [];
    for (var ei = exams.length - 1; ei >= 0; ei--) {
      exams[ei].subjects.forEach(function (name) {
        if (subjects.indexOf(name) < 0) subjects.push(name);
      });
    }
    var metrics = [{ key: "__total__", label: "总分" }].concat(subjects.map(function (name) {
      return { key: name, label: name };
    }));

    var blocks = chosen.map(function (st) {
      var rows = exams.map(function (ds) {
        var found = ds.byKey[st.key] || null;
        var cells = metrics.map(function (m) {
          var hasSubject = m.key === "__total__" || ds.subjects.indexOf(m.key) >= 0;
          if (!found || !hasSubject) return { score: null, rank: null };
          var score = toNum(m.key === "__total__" ? found.total : found.scores[m.key]);
          return {
            score: score,
            rank: score === null ? null : lookupRank(ds, m.key, found, scope)
          };
        });
        return { name: ds.exam.name, cells: cells };
      });
      return { student: st, rows: rows };
    });

    /* ---------- 页面表格：每名学生前重复表头，一场考试一行 ---------- */
    var colCount = 4 + metrics.length * 2;
    function headHtml() {
      return '<tr class="strip-head">' +
          '<th class="col-fixed" rowspan="2">姓名</th>' +
          '<th class="col-fixed" rowspan="2">学号</th>' +
          '<th class="col-fixed" rowspan="2">班级</th>' +
          '<th class="col-fixed" rowspan="2">考试名称</th>' +
          '<th class="col-band" colspan="' + (metrics.length * 2) + '">各科成绩与排名</th>' +
        "</tr>" +
        '<tr class="strip-head">' +
          metrics.map(function (m) {
            return "<th>" + esc(m.label) + '</th><th class="col-rank-head">排名</th>';
          }).join("") +
        "</tr>";
    }

    var body = [];
    blocks.forEach(function (block, bi) {
      if (bi > 0) body.push(headHtml());
      var span = block.rows.length;
      block.rows.forEach(function (row, ri) {
        var cells = [];
        if (ri === 0) {
          cells.push('<td class="col-fixed col-name" rowspan="' + span + '">' + esc(block.student.name) + "</td>");
          cells.push('<td class="col-fixed" rowspan="' + span + '">' + esc(block.student.id || "—") + "</td>");
          cells.push('<td class="col-fixed" rowspan="' + span + '">' + esc(block.student.className) + "</td>");
        }
        cells.push('<td class="col-fixed col-exam">' + esc(row.name) + "</td>");
        row.cells.forEach(function (cell) {
          if (cell.score === null) {
            cells.push('<td class="col-absent">/</td><td class="col-absent">/</td>');
          } else {
            cells.push('<td class="col-score">' + scoreText(cell.score) + "</td>");
            cells.push('<td class="col-rank">' + (cell.rank === null ? "—" : cell.rank) + "</td>");
          }
        });
        body.push('<tr class="strip-item' + (ri > 0 ? " strip-item-more" : "") + '">' + cells.join("") + "</tr>");
      });
      if (bi < blocks.length - 1) {
        body.push('<tr class="strip-gap"><td colspan="' + colCount + '"></td></tr>');
      }
    });

    $("#stripTableWrap").innerHTML = '<table class="strip-table"><thead>' + headHtml() +
      "</thead><tbody>" + body.join("") + "</tbody></table>";

    var gradeName = (S.grades.filter(function (g) { return g.id === S.gradeId; })[0] || {}).name || "";
    var pickedClasses = Object.keys(S.classPicked).sort(cmpClass);
    var classLabel = pickedClasses.length === 0
      ? "全部班级"
      : (pickedClasses.length <= 3 ? pickedClasses.join("、") : pickedClasses.length + " 个班");
    var examNames = exams.map(function (ds) { return ds.exam.name; }).join("、");
    var scopeLabel = scope === "class" ? "本班排名" : "全级排名";
    var baseNote = "学科列取所选考试的并集（顺序以最新考试为准）";

    $("#stripTitle").textContent = (gradeName ? gradeName + " · " : "") + classLabel + " 成绩条";
    $("#stripSubtitle").textContent = exams.length + " 场考试（" + examNames + "）· " +
      chosen.length + " 名学生 · " + scopeLabel + " · " + baseNote + " · 生成于 " + stamp();

    $("#stripPrintHead").innerHTML =
      "<h1>珠海市九洲中学 · " + esc(gradeName) + " 成绩条（" + esc(classLabel) + "）</h1>" +
      "<p>考试场次：" + esc(examNames) + "　|　排名口径：" + scopeLabel + "　|　" + esc(baseNote) +
      "　|　人数：" + chosen.length + "　|　打印时间：" + esc(stamp()) + "</p>";

    $("#stripResult").hidden = false;
    $("#stripExport").disabled = false;
    $("#stripPrint").disabled = false;

    S.built = {
      blocks: blocks,
      metrics: metrics,
      fileName: "成绩条_" + safeName(gradeName) + "_" + safeName(classLabel) + "_" +
        safeName(exams.length > 1 ? exams.length + "场考试" : (exams[0] ? exams[0].exam.name : "本次考试")) +
        "_" + fileStamp() + ".xlsx"
    };

    if ($("#stripResult").scrollIntoView) {
      $("#stripResult").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---------------- 导出（xlsx）/ 打印 ---------------- */

  function buildXlsxSpec() {
    var b = S.built;
    var metrics = b.metrics;
    var rows = [];
    var merges = [];
    var lastCol = 4 + metrics.length * 2 - 1;

    /* 每名学生前都重复一次两行表头 */
    function pushHeader() {
      var r0 = rows.length;
      rows.push([
        { v: "姓名", s: 1 }, { v: "学号", s: 1 }, { v: "班级", s: 1 }, { v: "考试名称", s: 1 },
        { v: "各科成绩与排名", s: 1 }
      ]);
      merges.push({ r1: r0, c1: 0, r2: r0 + 1, c2: 0 });
      merges.push({ r1: r0, c1: 1, r2: r0 + 1, c2: 1 });
      merges.push({ r1: r0, c1: 2, r2: r0 + 1, c2: 2 });
      merges.push({ r1: r0, c1: 3, r2: r0 + 1, c2: 3 });
      merges.push({ r1: r0, c1: 4, r2: r0, c2: lastCol });

      var head2 = [null, null, null, null];
      metrics.forEach(function (m) {
        head2.push({ v: m.label, s: 2 });
        head2.push({ v: "排名", s: 2 });
      });
      rows.push(head2);
    }

    pushHeader();
    b.blocks.forEach(function (block, bi) {
      if (bi > 0) pushHeader();
      var start = rows.length;
      block.rows.forEach(function (row, ri) {
        var cells = ri === 0
          ? [{ v: block.student.name, s: 6 },
             { v: block.student.id || "", s: 3 },
             { v: block.student.className, s: 3 }]
          : [null, null, null];
        cells.push({ v: row.name, s: 3 });
        row.cells.forEach(function (cell) {
          if (cell.score === null) {
            cells.push({ v: "/", s: 5 }, { v: "/", s: 5 });
          } else {
            cells.push({ v: cell.score, s: 4 });
            cells.push({ v: cell.rank === null ? "—" : cell.rank, s: 4 });
          }
        });
        rows.push(cells);
      });
      if (block.rows.length > 1) {
        merges.push({ r1: start, c1: 0, r2: rows.length - 1, c2: 0 });
        merges.push({ r1: start, c1: 1, r2: rows.length - 1, c2: 1 });
        merges.push({ r1: start, c1: 2, r2: rows.length - 1, c2: 2 });
      }
      if (bi < b.blocks.length - 1) rows.push([]);
    });

    var widths = [12, 16, 8, 26];
    metrics.forEach(function () { widths.push(9, 7); });

    return {
      rows: rows,
      merges: merges,
      widths: widths,
      sheetName: "成绩条",
      freezeRows: 2,
      freezeCols: 4
    };
  }

  function exportXlsx() {
    if (!S.built) return;
    if (!window.JZXlsx) { UI.toast("导出组件未加载，请刷新页面", "error"); return; }
    window.JZXlsx.download(S.built.fileName, buildXlsxSpec());
    UI.toast("已导出：" + S.built.fileName, "success");
  }

  /* ---------------- 事件 ---------------- */

  function bind() {
    $("#stripGrade").addEventListener("change", onGradeChange);

    $("#stripExams").addEventListener("change", function (e) {
      var input = e.target;
      if (!input || input.type !== "checkbox") return;
      if (input.checked) S.picked[input.value] = true;
      else delete S.picked[input.value];
      if (input.parentNode) input.parentNode.classList.toggle("is-on", input.checked);
      updateExamCount();
      loadPickedExams();
    });

    $("#examAll").addEventListener("click", function () {
      S.exams.forEach(function (ex) { S.picked[ex.id] = true; });
      renderExams();
      loadPickedExams();
    });

    $("#examNone").addEventListener("click", function () {
      S.picked = {};
      renderExams();
      loadPickedExams();
    });

    $("#stripClasses").addEventListener("change", function (e) {
      var input = e.target;
      if (!input || input.type !== "checkbox") return;
      if (input.checked) S.classPicked[input.value] = true;
      else delete S.classPicked[input.value];
      if (input.parentNode) input.parentNode.classList.toggle("is-on", input.checked);
      updateClassCount();
      renderStudents();
    });

    $("#classAll").addEventListener("click", function () {
      allClasses().forEach(function (c) { S.classPicked[c] = true; });
      renderClasses();
      renderStudents();
    });

    $("#classNone").addEventListener("click", function () {
      S.classPicked = {};
      renderClasses();
      renderStudents();
    });

    $("#stripStudents").addEventListener("change", function (e) {
      var input = e.target;
      if (!input || input.type !== "checkbox") return;
      if (input.checked) S.chosen[input.value] = true;
      else delete S.chosen[input.value];
      if (input.parentNode) input.parentNode.classList.toggle("is-on", input.checked);
      syncPickAll();
      updateStudentCount();
    });

    $("#pickAll").addEventListener("click", function () {
      var list = visibleStudents();
      var all = list.length > 0 && list.every(function (st) { return S.chosen[st.key]; });
      list.forEach(function (st) {
        if (all) delete S.chosen[st.key];
        else S.chosen[st.key] = true;
      });
      renderStudents();
    });

    $("#pickNone").addEventListener("click", function () {
      S.chosen = {};
      renderStudents();
    });

    $("#stripRankScope").addEventListener("change", function () {
      if (S.built) generate();
    });

    $("#stripRun").addEventListener("click", generate);
    $("#stripExport").addEventListener("click", exportXlsx);
    $("#stripPrint").addEventListener("click", function () {
      if (S.built) window.print();
    });
  }

  async function onGradeChange() {
    var id = $("#stripGrade").value;
    S.gradeId = id;
    S.exams = [];
    S.picked = {};
    S.loaded = {};
    clearResult();
    updateExamCount();

    if (!id) {
      $("#stripExams").innerHTML = '<span class="strip-hint">请先选择年级</span>';
      $("#examTools").hidden = true;
      resetDownstream("请先选择考试");
      return;
    }
    UI.rememberGrade(id);
    $("#stripExams").innerHTML = '<span class="strip-hint jz-loading">正在读取考试…</span>';
    try {
      S.exams = (await STORE.listExams(id)) || [];
    } catch (err) {
      $("#stripExams").innerHTML = '<span class="strip-hint">读取考试失败：' + esc(err.message) + "</span>";
      return;
    }
    if (!S.exams.length) {
      renderExams();
      resetDownstream("请先选择考试");
      return;
    }
    S.picked[S.exams[0].id] = true;
    renderExams();
    await loadPickedExams();
  }

  async function init() {
    try { UI.mountNav({ base: "../../", page: "strip" }); } catch (e) { /* ignore */ }
    bind();
    try { if (window.JZCloud && window.JZCloud.ready) await window.JZCloud.ready(); } catch (e) { /* ignore */ }
    if (!STORE.isReady()) {
      $("#stripGrade").innerHTML = '<option value="">云端未连接</option>';
      $("#stripExams").innerHTML = '<span class="strip-hint">请先在管理员入口完成连接设置</span>';
      return;
    }
    try {
      S.grades = (await STORE.listGrades()) || [];
    } catch (err) {
      $("#stripGrade").innerHTML = '<option value="">读取年级失败</option>';
      return;
    }
    var remembered = "";
    try { remembered = localStorage.getItem("jz_last_grade_v1") || ""; } catch (e) { remembered = ""; }
    var opts = ['<option value="">请选择年级</option>'];
    S.grades.forEach(function (g) {
      opts.push('<option value="' + esc(g.id) + '">' + esc(g.name) + "</option>");
    });
    $("#stripGrade").innerHTML = opts.join("");

    var target = S.grades.filter(function (g) { return g.id === remembered; })[0] || S.grades[0];
    if (target) {
      $("#stripGrade").value = target.id;
      onGradeChange();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
