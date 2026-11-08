/* =========================================================
   管理员后台逻辑
   - 使用统一登录账号，role = admin 的教师才能进入
   - 数据写入 Supabase（anon key 简易模式，或登录云端账号后使用其身份）
   ========================================================= */
(function () {
  "use strict";

  var STORE = window.JZStore;
  var API = window.JZCloud;
  var UI = window.JZUI;
  var AUTH = window.JZAuth;

  var S = {
    scoreData: null,
    scoreFileName: "",
    paperRows: null,
    paperMeta: null,
    paperFileName: "",
    grades: [],
    exams: [],
    papers: [],
    examIdsWithScores: {},
    saving: false
  };

  function $(id) { return document.getElementById(id); }
  function esc(v) { return UI.escapeHtml(v); }
  function text(v) { return v === null || v === undefined ? "" : String(v); }

  /* =========================================================
     权限 / 面板切换
     ========================================================= */
  function showDenied() {
    $("deniedPanel").hidden = false;
    $("adminPanel").hidden = true;
  }

  function showPanel() {
    $("deniedPanel").hidden = true;
    $("adminPanel").hidden = false;
    var user = AUTH ? AUTH.current() : null;
    $("adminWho").textContent = "当前账号：" + (user ? user.name : "—") + "（管理员）";
    renderSyncState();
    initPanel();
  }

  /* =========================================================
     云端同步时间：让管理员一眼看到数据是不是最近读到的
     ========================================================= */
  var SYNC_KEY = "jz_admin_last_sync_v1";

  function markSynced() {
    try { localStorage.setItem(SYNC_KEY, String(Date.now())); } catch (e) { /* ignore */ }
    renderSyncState();
  }

  function renderSyncState() {
    var el = $("adminSyncState");
    if (!el) return;
    var at = 0;
    try { at = Number(localStorage.getItem(SYNC_KEY)) || 0; } catch (e) { at = 0; }
    if (!at) {
      el.textContent = "尚未同步";
      el.classList.add("is-stale");
      el.title = "还没有成功读取过云端数据";
      return;
    }
    var d = new Date(at);
    var p = function (n) { return String(n).padStart(2, "0"); };
    var stamp = p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
    var stale = Date.now() - at > 24 * 3600 * 1000;
    el.textContent = (stale ? "最近同步 " : "云端已同步 ") + stamp;
    el.title = "最近一次成功读写云端的时间：" + d.toLocaleString("zh-CN");
    el.classList.toggle("is-stale", stale);
  }

  function logout() {
    if (AUTH) AUTH.logout();
  }

  /* =========================================================
     通用提示
     ========================================================= */
  function banner(type, html) {
    var box = $("adminBanner");
    if (!html) { box.hidden = true; box.innerHTML = ""; return; }
    box.className = "jz-alert " + type;
    box.hidden = false;
    box.innerHTML = html;
  }

  function checkCloud() {
    if (!API.isReady()) {
      var hint = (window.JZ && window.JZ.CONFIG_ERROR)
        ? "读取连接配置失败：" + esc(window.JZ.CONFIG_ERROR) + "。"
        : "";
      banner("warn",
        hint + "还没有配置 Supabase 连接：请把 Project URL 与 anon key 填进项目根目录的 " +
        "<code>config/supabase.json</code> 和 <code>config/supabase.js</code>（两个文件内容一致），或在「④ 连接设置」临时保存到本机浏览器。" +
        "详细步骤见《Supabase配置与使用说明.md》。");
      return false;
    }
    var c = API.config();
    banner("info", "已连接云端：" + esc(c.url) + "。上传成功后，各分析系统即可在“选择考试”里看到数据。");
    return true;
  }

  /* =========================================================
     年级 / 考试 下拉
     ========================================================= */
  async function refreshGrades(keepScore, keepPaper) {
    var list = [];
    try {
      list = await STORE.listGrades();
    } catch (e) {
      banner("error", "读取年级失败：" + esc(e.message));
    }
    S.grades = list || [];
    markSynced();
    fillGradeSelect($("scoreGrade"), keepScore || $("scoreGrade").value, "（请新建年级）");
    fillGradeSelect($("paperGrade"), keepPaper || $("paperGrade").value, "（请先新建年级）");
    if ($("paperGrade").value) await refreshPaperExams();
  }

  function fillGradeSelect(select, keepValue, emptyLabel) {
    var html = "";
    if (!S.grades.length) {
      html = '<option value="">' + emptyLabel + "</option>";
    } else {
      html = S.grades.map(function (g) {
        return '<option value="' + esc(g.id) + '">' + esc(g.name) + "</option>";
      }).join("");
    }
    select.innerHTML = html;
    if (keepValue && S.grades.some(function (g) { return g.id === keepValue; })) {
      select.value = keepValue;
    }
  }

  async function refreshPaperExams() {
    var gradeId = $("paperGrade").value;
    var sel = $("paperExam");
    if (!gradeId) { sel.innerHTML = '<option value="">（请先选择年级）</option>'; return; }
    var exams = [];
    try {
      exams = await STORE.listExams(gradeId);
    } catch (e) {
      banner("error", "读取考试列表失败：" + esc(e.message));
    }
    S.exams = exams;
    var keep = sel.value;
    var html = exams.map(function (ex) {
      return '<option value="' + esc(ex.id) + '">' + esc(ex.name) +
        (ex.student_count ? "（" + ex.student_count + "人）" : "") + "</option>";
    }).join("");
    html += '<option value="__new__">＋ 新建考试…</option>';
    sel.innerHTML = html;
    if (keep && exams.some(function (ex) { return ex.id === keep; })) sel.value = keep;
    else if (exams.length) sel.value = exams[0].id;
    else sel.value = "__new__";
    toggleNewExamInput();
    await refreshExistingPapers();
  }

  function toggleNewExamInput() {
    $("paperNewExam").hidden = $("paperExam").value !== "__new__";
  }

  async function refreshExistingPapers() {
    var box = $("paperExisting");
    var examId = $("paperExam").value;
    if (!examId || examId === "__new__") { box.innerHTML = '<span class="jz-exam-info">新建考试后保存第一份试题卷</span>'; return; }
    var papers = [];
    try {
      papers = await STORE.listPapers("exam_id=eq." + encodeURIComponent(examId));
    } catch (e) {
      box.innerHTML = '<span class="jz-exam-info">读取失败：' + esc(e.message) + "</span>";
      return;
    }
    if (!papers.length) { box.innerHTML = '<span class="jz-exam-info">这场考试还没有试题卷</span>'; return; }
    box.innerHTML = papers.map(function (p) {
      return '<span class="jz-chip">' + esc(subjectLabel(p.subject)) + (p.question_count ? " · " + p.question_count + "题" : "") +
        '<button type="button" data-del-paper="' + esc(p.id) + '" title="删除">×</button></span>';
    }).join("");
  }

  /* =========================================================
     成绩上传
     ========================================================= */
  function setSaveMsg(id, msg, isError) {
    var el = $(id);
    el.textContent = msg || "";
    el.className = "jz-save-msg" + (isError ? " err" : "");
  }

  /* 写失败提示：区分「RLS 写入权限」与「表还没建」两种情况 */
  function writeHint(err, sqlFile) {
    var m = String((err && err.message) || "");
    if (/row-level security|permission denied|缺少权限|\b401\b|\b403\b/i.test(m)) {
      return "云端拒绝了写入（RLS 写入权限限制）。任选其一解决：① 在 Supabase SQL Editor 执行 database/rls-anon-write.sql 恢复匿名写入；② 保留收紧策略，先在「④ 连接设置 → 云端写入账号」登录 Supabase 账号（登录只在当前标签页有效）。原始错误：";
    }
    return "可能还没在 Supabase SQL Editor 执行 " + sqlFile + " 建表。";
  }

  async function handleScoreFile(file) {
    if (!file) return;
    setSaveMsg("scoreSaveMsg", "");
    $("scoreFileInfo").textContent = "正在解析：" + file.name;
    try {
      var rows = await readRowsFromFile(file);
      var data = STORE.normalizeExamRows(rows, { fileName: file.name });
      S.scoreData = data;
      S.scoreFileName = file.name;
      $("scoreDrop").classList.add("has-file");
      $("scoreDropTitle").textContent = "已选择成绩文件";
      $("scoreFileInfo").textContent = file.name;
      renderScorePreview(data);
      $("scoreSaveBtn").disabled = false;
      if (!$("scoreExamName").value.trim()) {
        $("scoreExamName").value = file.name.replace(/\.(xlsx|xlsm|xls|csv)$/i, "");
      }
    } catch (err) {
      S.scoreData = null;
      $("scorePreview").hidden = true;
      $("scoreSaveBtn").disabled = true;
      $("scoreDrop").classList.remove("has-file");
      $("scoreDropTitle").textContent = "点击选择，或把成绩文件拖到这里";
      $("scoreFileInfo").textContent = "";
      setSaveMsg("scoreSaveMsg", "解析失败：" + err.message, true);
    }
  }

  function renderScorePreview(data) {
    var wrap = $("scorePreview");
    wrap.hidden = false;
    var head = data.header;
    var rows = data.rows;
    var previewRows = rows.slice(0, 6);
    var html = "<thead><tr>" + head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead>";
    html += "<tbody>" + previewRows.map(function (r) {
      return "<tr>" + r.map(function (c) { return "<td>" + esc(c === null ? "" : c) + "</td>"; }).join("") + "</tr>";
    }).join("") + "</tbody>";
    $("scorePreviewTable").innerHTML = html;
    var meta = data.meta;
    $("scoreSummary").textContent = meta.studentCount + " 名学生 · " + meta.classCount + " 个班级 · " +
      meta.subjectCount + " 个学科（" + (meta.subjects || []).join("、") + "）";
    $("scoreWarnings").textContent = (meta.warnings && meta.warnings.length)
      ? "提示：" + meta.warnings.join("；")
      : "表头识别正常，总分缺失时会自动按各科求和。";
  }

  async function saveScoreExam() {
    if (S.saving) return;
    if (!API.isReady()) { banner("warn", "请先在「④ 连接设置」配置 Supabase 后再上传。"); return; }
    var gradeName = gradeNameOf($("scoreGrade").value);
    if (!gradeName) { setSaveMsg("scoreSaveMsg", "请先选择或新建年级", true); return; }
    var examName = $("scoreExamName").value.trim();
    if (!examName) { setSaveMsg("scoreSaveMsg", "请填写考试名称", true); return; }
    if (!S.scoreData) { setSaveMsg("scoreSaveMsg", "请先选择成绩文件", true); return; }

    /* 同名考试已存在时先讲清楚会覆盖什么，避免手滑把旧数据盖掉 */
    try {
      var gradeId = $("scoreGrade").value;
      if (gradeId) {
        var existed = await STORE.listExams(gradeId);
        var dup = (existed || []).filter(function (x) { return x.name === examName; })[0];
        if (dup) {
          var when = dup.exam_date ? "（考试日期 " + dup.exam_date + "）" : "";
          var people = dup.student_count ? "现有 " + dup.student_count + " 人成绩" : "已有成绩数据";
          var ok = window.confirm(
            "云端已存在同年级同名考试：\n" + gradeName + " · " + examName + when + "\n" + people + "。\n\n" +
            "继续上传会用本次文件覆盖这份考试的成绩（已上传的试题卷保留）。\n确定覆盖吗？"
          );
          if (!ok) {
            setSaveMsg("scoreSaveMsg", "已取消上传，未覆盖任何数据");
            return;
          }
        }
      }
    } catch (e) { /* 查不到旧考试就按新考试处理 */ }

    S.saving = true;
    $("scoreSaveBtn").disabled = true;
    setSaveMsg("scoreSaveMsg", "正在上传，请稍候…");
    UI.busy(true, "正在上传成绩到云端…");
    try {
      var exam = await STORE.saveExam({
        gradeName: gradeName,
        examName: examName,
        scope: $("scoreScope").value,
        examDate: $("scoreDate").value || null,
        header: S.scoreData.header,
        rows: S.scoreData.rows,
        subjects: S.scoreData.meta.subjects,
        studentCount: S.scoreData.meta.studentCount,
        sourceFile: S.scoreFileName
      });
      setSaveMsg("scoreSaveMsg", "✅ 已保存：" + gradeName + " · " + examName + "（" + S.scoreData.meta.studentCount + " 人）");
      UI.toast("成绩上传成功", "success");
      await refreshGrades(gradeName ? exam.grade_id : null, null);
      await refreshPaperExams();
      await renderManage();
    } catch (err) {
      setSaveMsg("scoreSaveMsg", "上传失败：" + writeHint(err, "database/schema.sql") + err.message, true);
    } finally {
      S.saving = false;
      $("scoreSaveBtn").disabled = !S.scoreData;
      UI.busy(false);
    }
  }

  function gradeNameOf(gradeId) {
    var g = S.grades.filter(function (x) { return x.id === gradeId; })[0];
    return g ? g.name : "";
  }

  async function addGrade() {
    var input = $("newGradeInput");
    var name = input.value.trim();
    if (!name) { setSaveMsg("scoreSaveMsg", "请输入年级名称（毕业年份），如 2030届（2030年毕业）", true); return; }
    if (!API.isReady()) { banner("warn", "请先在「④ 连接设置」配置 Supabase。"); return; }
    UI.busy(true, "正在创建年级…");
    try {
      var g = await STORE.ensureGrade(name);
      input.value = "";
      await refreshGrades(g.id, null);
      $("scoreGrade").value = g.id;
      await refreshPaperExams();
      UI.toast("年级已创建：" + name, "success");
    } catch (err) {
      setSaveMsg("scoreSaveMsg", "创建年级失败：" + err.message, true);
    } finally {
      UI.busy(false);
    }
  }

  /* =========================================================
     试题卷上传
     ========================================================= */
  function preparePaperRows(rawRows) {
    var rows = (rawRows || []).filter(function (r) { return Array.isArray(r); });
    var first = -1;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].some(function (c) { return text(c).trim() !== ""; })) { first = i; break; }
    }
    if (first < 0) throw new Error("表格内容为空");
    return rows.slice(first).map(function (r) { return r || []; });
  }

  function inspectPaperRows(rawRows) {
    var rows = preparePaperRows(rawRows);
    if (rows.length < 4) {
      throw new Error("模板行数不足：需要「表头 / 满分值 / 全校（或全级）/ 班级…」至少 4 行");
    }
    var header = rows[0] || [];
    var last = -1;
    for (var i = 1; i < header.length; i++) {
      if (text(header[i]).trim() !== "") last = i;
    }
    if (last < 1) throw new Error("第 1 行没识别到题号：题号应从 B 列开始");
    var q = last;

    var fullRow = rows[1] || [];
    var total = 0;
    for (var c = 1; c <= q; c++) {
      var v = Number(fullRow[c]);
      if (Number.isFinite(v)) total += v;
    }

    var classes = [];
    var hasSchool = false;
    for (var r = 2; r < rows.length; r++) {
      var name = text((rows[r] || [])[0]).trim();
      if (!name) continue;
      if (name === "全校" || name === "全级") hasSchool = true;
      else classes.push(name);
    }
    if (!hasSchool) throw new Error("没找到“全校”行：第 3 行 A 列应为“全校”或“全级”");
    if (!classes.length) throw new Error("没找到班级行：第 4 行起 A 列应为班级名称");

    return {
      rows: rows,
      questionCount: q,
      classCount: classes.length,
      fullTotal: Math.round(total * 100) / 100,
      classes: classes
    };
  }

  async function handlePaperFile(file) {
    if (!file) return;
    setSaveMsg("paperSaveMsg", "");
    $("paperFileInfo").textContent = "正在解析：" + file.name;
    try {
      var rows = await readRowsFromFile(file);
      var meta = inspectPaperRows(rows);
      S.paperRows = meta.rows;
      S.paperMeta = meta;
      S.paperFileName = file.name;
      $("paperDrop").classList.add("has-file");
      $("paperDropTitle").textContent = "已选择试题卷文件";
      $("paperFileInfo").textContent = file.name;
      renderPaperPreview(meta);
      $("paperSaveBtn").disabled = false;
    } catch (err) {
      S.paperRows = null;
      S.paperMeta = null;
      $("paperPreview").hidden = true;
      $("paperSaveBtn").disabled = true;
      $("paperDrop").classList.remove("has-file");
      $("paperDropTitle").textContent = "点击选择，或把试题分析模板拖到这里";
      $("paperFileInfo").textContent = "";
      setSaveMsg("paperSaveMsg", "解析失败：" + err.message, true);
    }
  }

  function renderPaperPreview(meta) {
    $("paperPreview").hidden = false;
    var rows = meta.rows.slice(0, 6);
    var cols = Math.min(9, Math.max.apply(null, rows.map(function (r) { return r.length; })));
    var html = "<thead><tr>" + (rows[0] || []).slice(0, cols).map(function (h) {
      return "<th>" + esc(h) + "</th>";
    }).join("") + "</tr></thead><tbody>";
    html += rows.slice(1).map(function (r) {
      return "<tr>" + r.slice(0, cols).map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>";
    }).join("") + "</tbody>";
    $("paperPreviewTable").innerHTML = html;
    $("paperSummary").textContent = meta.questionCount + " 道小题 · " + meta.classCount + " 个班级 · 满分合计 " + meta.fullTotal;
  }

  async function savePaper() {
    if (S.saving) return;
    if (!API.isReady()) { banner("warn", "请先在「④ 连接设置」配置 Supabase 后再上传。"); return; }
    var gradeName = gradeNameOf($("paperGrade").value);
    if (!gradeName) { setSaveMsg("paperSaveMsg", "请先选择年级", true); return; }
    var examId = $("paperExam").value;
    var examName = "";
    if (examId === "__new__" || !examId) {
      examName = $("paperNewExam").value.trim();
      if (!examName) { setSaveMsg("paperSaveMsg", "请填写新的考试名称", true); return; }
    } else {
      var exam = S.exams.filter(function (x) { return x.id === examId; })[0];
      examName = exam ? exam.name : "";
      if (!examName) { setSaveMsg("paperSaveMsg", "考试信息读取失败，请刷新后重试", true); return; }
    }
    var subject = $("paperSubject").value;
    if (subject === "__custom__") subject = $("paperCustomSubject").value.trim();
    if (!subject) { setSaveMsg("paperSaveMsg", "请选择或填写科目", true); return; }
    if (!S.paperRows) { setSaveMsg("paperSaveMsg", "请先选择试题分析文件", true); return; }

    S.saving = true;
    $("paperSaveBtn").disabled = true;
    setSaveMsg("paperSaveMsg", "正在上传，请稍候…");
    UI.busy(true, "正在保存试题卷…");
    try {
      var saved = await STORE.savePaper({
        gradeName: gradeName,
        examName: examName,
        subject: subject,
        rows: S.paperRows,
        questionCount: S.paperMeta.questionCount,
        classCount: S.paperMeta.classCount,
        sourceFile: S.paperFileName
      });
      setSaveMsg("paperSaveMsg", "✅ 已保存：" + gradeName + " · " + examName + " · " + subject +
        "（" + S.paperMeta.questionCount + " 题 / " + S.paperMeta.classCount + " 班）");
      UI.toast("试题卷保存成功", "success");
      await refreshGrades(null, gradeName ? (saved.grade ? saved.grade.id : null) : null);
      await refreshPaperExams();
      await renderManage();
    } catch (err) {
      setSaveMsg("paperSaveMsg", "保存失败：" + writeHint(err, "database/schema.sql") + err.message, true);
    } finally {
      S.saving = false;
      $("paperSaveBtn").disabled = !S.paperRows;
      UI.busy(false);
    }
  }

  /* =========================================================
     数据管理
     ========================================================= */
  async function loadManageData() {
    var grades = await STORE.listGrades();
    var exams = await STORE.listAllExams(500);
    var papers = await STORE.listPapers();
    var scoreRows = await API.select("scores", "select=exam_id");
    var map = {};
    (scoreRows || []).forEach(function (r) { map[r.exam_id] = true; });
    return { grades: grades, exams: exams, papers: papers, withScores: map };
  }

  async function renderManage() {
    var area = $("manageArea");
    if (!API.isReady()) {
      area.innerHTML = '<div class="jz-empty">还没有配置 Supabase。<br>请到「④ 连接设置」填写连接信息。</div>';
      return;
    }
    area.innerHTML = '<div class="jz-empty"><span class="jz-loading">正在读取云端数据…</span></div>';
    try {
      var data = await loadManageData();
      markSynced();
      S.grades = data.grades;
      S.exams = data.exams;
      S.papers = data.papers;
      S.examIdsWithScores = data.withScores;
      if (!data.grades.length) {
        area.innerHTML = '<div class="jz-empty">云端还没有任何数据。<br>请先在「① 成绩上传」上传第一份成绩。</div>';
        return;
      }
      area.innerHTML = data.grades.map(function (g) {
        var gradeExams = data.exams.filter(function (ex) { return ex.grade_id === g.id; });
        var body = gradeExams.length
          ? gradeExams.map(function (ex) { return examRowHtml(ex, data); }).join("")
          : '<div class="jz-exam-row"><span class="jz-exam-info">这个年级还没有上传考试</span></div>';
        return '<div class="jz-grade-block">' +
          '<div class="jz-grade-title">' + UI.gradeChip(g.name) +
          '<span class="jz-exam-info">' + gradeExams.length + " 场考试</span></div>" + body + "</div>";
      }).join("");
    } catch (err) {
      area.innerHTML = '<div class="jz-alert error">读取失败：' + esc(err.message) +
        "<br>请确认已在 Supabase 执行 database/schema.sql，并检查 anon key 与 RLS 策略。</div>";
    }
  }

  function examRowHtml(ex, data) {
    var papers = data.papers.filter(function (p) { return p.exam_id === ex.id; });
    var hasScores = !!data.withScores[ex.id];
    var info = [];
    if (ex.exam_date) info.push(String(ex.exam_date).slice(0, 10));
    info.push(ex.student_count ? ex.student_count + " 人" : "无成绩");
    if (ex.subjects && ex.subjects.length) info.push(ex.subjects.length + " 科");
    info.push(hasScores ? "成绩已上传" : "未上传成绩");
    var paperChips = papers.length
      ? papers.map(function (p) {
          return '<span class="jz-chip">' + esc(subjectLabel(p.subject)) + (p.question_count ? " · " + p.question_count + "题" : "") +
            '<button type="button" data-del-paper="' + esc(p.id) + '" title="删除该试题卷">×</button></span>';
        }).join("")
      : '<span class="jz-exam-info">试题卷：无</span>';
    return '<div class="jz-exam-row" data-exam-row="' + esc(ex.id) + '">' +
      '<span class="jz-tag ' + (ex.scope === "区域" ? "" : (ex.scope === "校级" ? "school" : "muted")) + '">' +
        esc(ex.scope || "考试") + "</span>" +
      '<span class="jz-exam-title">' + esc(ex.name) + "</span>" +
      '<span class="jz-exam-info">' + esc(info.join(" · ")) + "</span>" +
      '<span class="jz-exam-ops">' +
        '<a class="jz-btn ghost small" href="../systems/basic/basic.html?exam=' + esc(ex.id) + '" target="_blank" rel="noopener">打开分析</a>' +
        '<button type="button" class="jz-btn danger small" data-del-exam="' + esc(ex.id) + '" data-exam-name="' + esc(ex.name) + '">删除考试</button>' +
      "</span>" +
      '<div style="flex:1 1 100%;display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">' + paperChips + "</div>" +
      "</div>";
  }

  async function handleManageClick(e) {
    var delExam = e.target.closest("[data-del-exam]");
    if (delExam) {
      var id = delExam.getAttribute("data-del-exam");
      var name = delExam.getAttribute("data-exam-name") || "";
      if (!window.confirm("确定删除考试《" + name + "》吗？\n该考试的成绩与试题卷会一起删除，且无法恢复。")) return;
      UI.busy(true, "正在删除…");
      try {
        await STORE.deleteExam(id);
        UI.toast("已删除：" + name, "success");
        await renderManage();
        await refreshGrades();
      } catch (err) {
        UI.toast("删除失败：" + err.message, "error");
      } finally {
        UI.busy(false);
      }
      return;
    }
    var delPaper = e.target.closest("[data-del-paper]");
    if (delPaper) {
      var pid = delPaper.getAttribute("data-del-paper");
      if (!window.confirm("确定删除这份试题卷吗？删除后该科目需要重新上传。")) return;
      UI.busy(true, "正在删除…");
      try {
        await STORE.deletePaper(pid);
        UI.toast("试题卷已删除", "success");
        await renderManage();
        await refreshExistingPapers();
      } catch (err) {
        UI.toast("删除失败：" + err.message, "error");
      } finally {
        UI.busy(false);
      }
    }
  }

  /* =========================================================
     连接设置
     ========================================================= */
  function fillConfigForm() {
    var c = API.config();
    $("cfgUrl").value = c.url || "";
    $("cfgKey").value = c.anonKey || "";
    renderConfigState();
    renderAuthState();
    refreshNavState();
  }

  function refreshNavState() {
    var el = document.querySelector(".jz-cloud-state");
    if (!el) return;
    var ready = API.isReady();
    el.className = "jz-cloud-state " + (ready ? "ok" : "off");
    el.textContent = ready ? "云端已连接" : "云端未配置";
    el.title = ready ? "已连接 Supabase" : "尚未配置 Supabase：请在连接设置里填写地址与 anon key";
  }

  function renderConfigState() {
    var c = API.config();
    var sourceText = c.source === "local"
      ? "浏览器本地设置（仅本机生效，优先级最高）"
      : (c.source === "json"
        ? "config/supabase.json（对所有访问者生效）"
        : (c.source === "js"
          ? "config/supabase.js（file:// 直接打开时生效）"
          : (c.source === "inline"
            ? "shared/cloud/config.js 内联兜底配置"
            : "未找到配置文件")));
    $("cfgState").innerHTML =
      "当前状态：" + (c.ready ? '<span class="ok">已配置</span>' : '<span class="bad">未配置</span>') +
      "<br>配置来源：" + sourceText +
      (c.configUrl ? "<br>配置文件：" + esc(c.configUrl) : "") +
      "<br>Project URL：<b>" + esc(c.url || "—") + "</b>" +
      "<br>anon key：" + (c.anonKey ? "<b>" + esc(c.anonKey.slice(0, 14)) + "…" + esc(c.anonKey.slice(-6)) + "</b>" : "—") +
      ((window.JZ && window.JZ.CONFIG_ERROR) ? '<br><span class="bad">读取配置提示：' + esc(window.JZ.CONFIG_ERROR) + "</span>" : "");
  }

  function renderAuthState() {
    var sess = API.session();
    $("authState").innerHTML = sess
      ? '写入身份：<span class="ok">已登录 ' + esc(sess.email || "") + "</span>（上传将使用该账号）"
      : '写入身份：<span class="bad">未登录</span>（使用 anon key 简易模式写入，需要 RLS 允许 anon 写入）';
  }

  async function testConnection() {
    $("cfgMsg").textContent = "正在连接…";
    $("cfgMsg").className = "jz-save-msg";
    try {
      await API.testConnection();
      $("cfgMsg").textContent = "✅ 连接正常，数据表可访问";
      $("cfgMsg").className = "jz-save-msg";
    } catch (err) {
      $("cfgMsg").textContent = "❌ " + err.message;
      $("cfgMsg").className = "jz-save-msg err";
    }
  }

  function saveConfig() {
    var url = $("cfgUrl").value.trim();
    var key = $("cfgKey").value.trim();
    if (!url || !key) { $("cfgMsg").textContent = "请填写 Project URL 与 anon key"; $("cfgMsg").className = "jz-save-msg err"; return; }
    API.setConfig(url, key);
    $("cfgMsg").textContent = "✅ 已保存到本机浏览器";
    $("cfgMsg").className = "jz-save-msg";
    renderConfigState();
    refreshNavState();
    checkCloud();
    refreshGrades();
    renderManage();
  }

  function clearConfig() {
    API.clearConfig();
    $("cfgMsg").textContent = "已清除本机配置（将使用 config/supabase.json 或 config/supabase.js 中的配置）";
    $("cfgMsg").className = "jz-save-msg";
    fillConfigForm();
    checkCloud();
    refreshGrades();
    renderManage();
  }

  async function loginCloud() {
    var email = $("authEmail").value.trim();
    var pass = $("authPass").value;
    if (!email || !pass) { $("authMsg").textContent = "请填写云端账号邮箱与密码"; $("authMsg").className = "jz-save-msg err"; return; }
    $("authMsg").textContent = "正在登录…";
    $("authMsg").className = "jz-save-msg";
    try {
      await API.signIn(email, pass);
      $("authMsg").textContent = "✅ 云端账号登录成功";
      renderAuthState();
    } catch (err) {
      $("authMsg").textContent = "❌ " + err.message;
      $("authMsg").className = "jz-save-msg err";
    }
  }

  function logoutCloud() {
    API.signOut();
    $("authMsg").textContent = "已退出云端账号，恢复 anon 简易模式";
    $("authMsg").className = "jz-save-msg";
    renderAuthState();
  }

  /* =========================================================
     系统通知（首页「系统通知与提醒」）
     ========================================================= */
  function noticeState(rec, fromFile) {
    var el = $("noticeState");
    if (!el) return;
    var rows = [];
    if (fromFile) {
      rows.push(["当前内容来源", "notice.md"]);
    } else if (rec) {
      rows.push(["当前内容来源", "云端 system_notices 表"]);
      if (rec.updated_at) rows.push(["最后保存", new Date(rec.updated_at).toLocaleString("zh-CN")]);
      if (rec.updated_by) rows.push(["最后修改人", rec.updated_by]);
    } else {
      rows.push(["当前内容来源", "根目录 notice.md（云端还没有保存过）"]);
    }
    el.innerHTML = rows.map(function (r) {
      return "<div><span>" + esc(r[0]) + "</span><b>" + esc(String(r[1])) + "</b></div>";
    }).join("");
  }

  async function loadNoticeEditor(keepInput) {
    var box = $("noticeBody");
    if (!box) return;
    setSaveMsg("noticeMsg", "");
    if (!API.isReady()) {
      noticeState(null, true);
      setSaveMsg("noticeMsg", "未配置 Supabase，暂时只能编辑本地文件", true);
      return;
    }
    try {
      var rec = await STORE.getNotice();
      if (!keepInput) box.value = rec && rec.body ? rec.body : "";
      noticeState(rec, false);
    } catch (err) {
      noticeState(null, true);
      setSaveMsg("noticeMsg", "读取云端失败：可能还没在 Supabase SQL Editor 执行 database/system_notices.sql 建表。" + err.message, true);
    }
  }

  async function saveNotice() {
    var box = $("noticeBody");
    if (!box) return;
    if (!API.isReady()) { setSaveMsg("noticeMsg", "未配置 Supabase，无法保存", true); return; }
    var user = AUTH ? AUTH.current() : null;
    setSaveMsg("noticeMsg", "正在保存…");
    try {
      var rec = await STORE.saveNotice(box.value, user ? user.name : "");
      setSaveMsg("noticeMsg", "✅ 已保存，首页刷新即可看到最新通知");
      noticeState(rec, false);
    } catch (err) {
      setSaveMsg("noticeMsg", "保存失败：" + writeHint(err, "database/system_notices.sql") + err.message, true);
    }
  }

  async function loadNoticeFromFile() {
    var box = $("noticeBody");
    if (!box) return;
    var md = "";
    try {
      var res = await fetch("../notice.md", { cache: "no-store" });
      if (res && res.ok) md = await res.text();
    } catch (e) { /* file:// 下读不到本地 md */ }
    if (!md || !md.trim()) {
      setSaveMsg("noticeMsg", "读取 notice.md 失败（双击 html 打开时浏览器禁止读本地文件），请手动粘贴内容", true);
      return;
    }
    box.value = md;
    setSaveMsg("noticeMsg", "已载入 notice.md，记得点「保存到云端」");
  }

  /* =========================================================
     教师任课名单（云端 teacher_assignments 表）
     ========================================================= */
  var ROSTER_HEAD = "班主任";
  var ROSTER_DEFAULT_SUBJECTS = ["语文", "数学", "英语", "物理", "化学", "道法", "历史", "体育", "地理", "生物"];
  var R = { rows: null, grade: "", className: "" };
  var ROSTER_GRADE_ORDER = ["初一", "初二", "初三"];

  function subjectLabel(v) {
    return (typeof window.normalizeSubjectName === "function") ? window.normalizeSubjectName(v) : v;
  }

  function rosterRows() { return R.rows || []; }

  function rosterGrades() {
    var seen = {};
    rosterRows().forEach(function (r) { if (r.grade) seen[r.grade] = true; });
    var list = Object.keys(seen);
    if (!list.length) list = ROSTER_GRADE_ORDER.slice();
    return list.sort(function (a, b) {
      var ia = ROSTER_GRADE_ORDER.indexOf(a);
      var ib = ROSTER_GRADE_ORDER.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return String(a).localeCompare(String(b), "zh-CN");
    });
  }

  function rosterClasses(grade) {
    var seen = {};
    rosterRows().forEach(function (r) { if (r.grade === grade && r.class_name) seen[r.class_name] = true; });
    return Object.keys(seen).sort(function (a, b) {
      var na = parseInt(String(a).replace(/[^\d]/g, ""), 10);
      var nb = parseInt(String(b).replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return String(a).localeCompare(String(b), "zh-CN");
    });
  }

  function rosterClassSubjects(grade, className) {
    var map = {};
    rosterRows().forEach(function (r) {
      if (r.grade !== grade || r.class_name !== className) return;
      map[r.subject] = r.teacher || "";
    });
    return map;
  }

  /* 返回 [{ raw, label }]：label 统一显示为“道法”，raw 保留云端原始写法，便于更新同一条记录 */
  function rosterSubjectList(grade) {
    var raw = [];
    rosterRows().forEach(function (r) {
      if (r.grade === grade && r.subject && r.subject !== ROSTER_HEAD && raw.indexOf(r.subject) < 0) raw.push(r.subject);
    });
    var list = [];
    var seen = {};
    function add(rawKey, displaySource) {
      var label = subjectLabel(displaySource || rawKey);
      if (!label || seen[label]) return;
      seen[label] = true;
      list.push({ raw: rawKey, label: label });
    }
    ROSTER_DEFAULT_SUBJECTS.forEach(function (s) {
      var existing = raw.filter(function (r) { return subjectLabel(r) === subjectLabel(s); })[0];
      add(existing || s, existing || s);
    });
    raw.forEach(function (r) { add(r, r); });
    return list;
  }

  function renderRosterSelectors() {
    var gSel = $("rosterGrade");
    var cSel = $("rosterClass");
    if (!gSel || !cSel) return;
    var grades = rosterGrades();
    if (grades.indexOf(R.grade) < 0) R.grade = grades[0] || "";
    gSel.innerHTML = grades.map(function (g) {
      return '<option value="' + esc(g) + '"' + (g === R.grade ? " selected" : "") + ">" + esc(g) + "</option>";
    }).join("");

    var classes = rosterClasses(R.grade);
    if (classes.indexOf(R.className) < 0) R.className = classes[0] || "";
    cSel.innerHTML = classes.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === R.className ? " selected" : "") + ">" + esc(c) + "</option>";
    }).join("") + '<option value="__new__">＋ 新建班级</option>';
    cSel.value = R.className || "__new__";
    $("rosterNewClass").hidden = cSel.value !== "__new__";
  }

  function renderRosterFields() {
    var box = $("rosterFields");
    if (!box) return;
    var isNew = $("rosterClass").value === "__new__";
    var subjects = rosterSubjectList(R.grade);
    var current = isNew ? {} : rosterClassSubjects(R.grade, R.className);
    var html = '<div class="roster-edit-field head-teacher">' +
      "<label>班主任</label>" +
      '<input class="jz-input" data-roster-subject="' + esc(ROSTER_HEAD) + '" value="' + esc(current[ROSTER_HEAD] || "") + '" placeholder="班主任姓名">' +
      "</div>";
    html += subjects.map(function (s) {
      return '<div class="roster-edit-field">' +
        "<label>" + esc(s.label) + "</label>" +
        '<input class="jz-input" data-roster-subject="' + esc(s.raw) + '" value="' + esc(current[s.raw] || "") + '" placeholder="留空表示暂无">' +
        "</div>";
    }).join("");
    box.innerHTML = html;
  }

  function renderRosterState() {
    var el = $("rosterState");
    if (!el) return;
    var rows = rosterRows();
    var classes = {};
    rows.forEach(function (r) { classes[r.grade + "|" + r.class_name] = true; });
    var subjectCount = rows.filter(function (r) { return r.subject !== ROSTER_HEAD; }).length;
    el.innerHTML =
      "<div><span>当前内容</span><b>" + (rows.length ? "云端 teacher_assignments 表" : "暂无（正在使用本地名单文件）") + "</b></div>" +
      "<div><span>记录数</span><b>" + rows.length + "（班级 " + Object.keys(classes).length + " 个 · 科目 " + subjectCount + " 条）</b></div>";
  }

  /* =========================================================
     整年级表格编辑：一次改完一个年级，再一次保存
     ========================================================= */
  function renderRosterGradeGrid() {
    var table = $("rosterGradeGrid");
    if (!table) return;
    var grade = R.grade;
    var title = $("rosterGridTitle");
    if (title) title.textContent = "整年级表格编辑" + (grade ? "：" + grade : "");
    if (!grade) {
      table.innerHTML = '<tbody><tr><td class="jz-empty">请先在上方选择年级</td></tr></tbody>';
      return;
    }
    var classes = rosterClasses(grade);
    var subjects = rosterSubjectList(grade);
    if (!classes.length) {
      table.innerHTML = '<tbody><tr><td class="jz-empty">这个年级还没有班级记录，请先用上方「保存本班」新建一个班级</td></tr></tbody>';
      return;
    }
    var head = '<thead><tr><th>班级</th><th>' + ROSTER_HEAD + "</th>" +
      subjects.map(function (s) { return "<th>" + esc(s.label) + "</th>"; }).join("") + "</tr></thead>";
    var body = classes.map(function (cls) {
      var map = rosterClassSubjects(grade, cls);
      var cells = subjects.map(function (s) {
        return '<td><input data-grid-class="' + esc(cls) + '" data-grid-subject="' + esc(s.raw) + '" value="' +
          esc(map[s.raw] || "") + '" placeholder="—"></td>';
      }).join("");
      return "<tr><td>" + esc(cls) + "</td>" +
        '<td><input data-grid-class="' + esc(cls) + '" data-grid-subject="' + ROSTER_HEAD + '" value="' +
        esc(map[ROSTER_HEAD] || "") + '" placeholder="—"></td>' + cells + "</tr>";
    }).join("");
    table.innerHTML = head + "<tbody>" + body + "</tbody>";
  }

  async function saveRosterGradeGrid() {
    var msg = $("rosterGridMsg");
    function say(t, isErr) { if (msg) { msg.textContent = t; msg.style.color = isErr ? "#c0392b" : "#1a7a46"; } }
    if (!API.isReady()) { say("未配置 Supabase，无法保存", true); return; }
    if (!R.grade) { say("请先选择年级", true); return; }
    var inputs = Array.prototype.slice.call(document.querySelectorAll("#rosterGradeGrid input[data-grid-class]"));
    if (!inputs.length) { say("表格里还没有可保存的班级", true); return; }
    var grade = R.grade;
    var toSave = [];
    var toClear = [];
    inputs.forEach(function (input) {
      var cls = input.getAttribute("data-grid-class");
      var subject = input.getAttribute("data-grid-subject");
      var value = String(input.value || "").trim();
      var old = rosterClassSubjects(grade, cls)[subject] || "";
      if (value) {
        if (value !== old) toSave.push({ grade: grade, className: cls, subject: subject, teacher: value });
      } else if (old) {
        toClear.push({ grade: grade, className: cls, subject: subject });
      }
    });
    if (!toSave.length && !toClear.length) { say("没有改动，无需保存"); return; }
    var ok = window.confirm("将保存 " + grade + " " + toSave.length + " 条新增/修改" +
      (toClear.length ? "，并清空 " + toClear.length + " 条留空的记录" : "") + "，确定吗？");
    if (!ok) return;
    say("正在保存…");
    try {
      if (toSave.length) await STORE.saveTeacherAssignments(toSave);
      for (var i = 0; i < toClear.length; i++) {
        await STORE.removeTeacherAssignment(toClear[i].grade, toClear[i].className, toClear[i].subject);
      }
      R.rows = await STORE.listTeacherAssignments();
      markSynced();
      renderRosterSelectors();
      renderRosterFields();
      renderRosterState();
      renderRosterGradeGrid();
      say("✅ 已保存：" + toSave.length + " 条修改" + (toClear.length ? "，清空 " + toClear.length + " 条" : ""));
      UI.toast("任教名单已保存", "success");
    } catch (err) {
      say("保存失败：" + writeHint(err, "database/teacher_assignments.sql") + err.message, true);
    }
  }

  async function loadRosterEditor() {
    setSaveMsg("rosterMsg", "");
    if (!API.isReady()) {
      setSaveMsg("rosterMsg", "未配置 Supabase，无法维护云端名单", true);
      return;
    }
    try {
      R.rows = await STORE.listTeacherAssignments();
      markSynced();
      renderRosterSelectors();
      renderRosterFields();
      renderRosterState();
      renderRosterGradeGrid();
    } catch (err) {
      R.rows = [];
      renderRosterSelectors();
      renderRosterFields();
      renderRosterState();
      setSaveMsg("rosterMsg", "读取云端失败：可能还没在 Supabase SQL Editor 执行 database/teacher_assignments.sql 建表。" + err.message, true);
    }
  }

  function currentRosterClass() {
    var sel = $("rosterClass");
    if (!sel) return "";
    if (sel.value === "__new__") return $("rosterNewClass").value.trim();
    return sel.value;
  }

  async function saveRosterClass() {
    if (!API.isReady()) { setSaveMsg("rosterMsg", "未配置 Supabase，无法保存", true); return; }
    if (!R.grade) { setSaveMsg("rosterMsg", "请先选择年级", true); return; }
    var className = currentRosterClass();
    if (!className) { setSaveMsg("rosterMsg", "请填写班级名称", true); return; }
    var existing = rosterClassSubjects(R.grade, className);
    var rows = [];
    var toRemove = [];
    document.querySelectorAll("#rosterFields [data-roster-subject]").forEach(function (inp) {
      var subject = inp.getAttribute("data-roster-subject");
      var value = inp.value.trim();
      if (value) rows.push({ grade: R.grade, className: className, subject: subject, teacher: value });
      else if (Object.prototype.hasOwnProperty.call(existing, subject)) toRemove.push(subject);
    });
    if (!rows.length && !toRemove.length) { setSaveMsg("rosterMsg", "没有任何内容可保存", true); return; }
    setSaveMsg("rosterMsg", "正在保存…");
    try {
      await STORE.saveTeacherAssignments(rows);
      for (var i = 0; i < toRemove.length; i++) {
        await STORE.removeTeacherAssignment(R.grade, className, toRemove[i]);
      }
      R.className = className;
      await loadRosterEditor();
      $("rosterClass").value = className;
      renderRosterFields();
      setSaveMsg("rosterMsg", "✅ 已保存 " + R.grade + " " + className + "（" + rows.length + " 条）");
    } catch (err) {
      setSaveMsg("rosterMsg", "保存失败：" + writeHint(err, "database/teacher_assignments.sql") + err.message, true);
    }
  }

  async function deleteRosterClass() {
    if (!API.isReady()) { setSaveMsg("rosterMsg", "未配置 Supabase，无法删除", true); return; }
    var className = currentRosterClass();
    if (!R.grade || !className) { setSaveMsg("rosterMsg", "请先选择年级和班级", true); return; }
    if (!window.confirm("确定删除 " + R.grade + " " + className + " 的全部任课记录吗？")) return;
    setSaveMsg("rosterMsg", "正在删除…");
    try {
      await STORE.removeTeacherClass(R.grade, className);
      R.className = "";
      await loadRosterEditor();
      setSaveMsg("rosterMsg", "✅ 已删除 " + R.grade + " " + className);
    } catch (err) {
      setSaveMsg("rosterMsg", "删除失败：" + err.message, true);
    }
  }

  async function importRosterFromFile() {
    if (!API.isReady()) { setSaveMsg("rosterMsg", "未配置 Supabase，无法导入", true); return; }
    $("rosterImportFile").click();
  }

  function rosterCountOf(roster) {
    var total = 0;
    var grades = (roster && roster.grades) || {};
    Object.keys(grades).forEach(function (g) {
      var classes = (grades[g] && grades[g].classes) || {};
      Object.keys(classes).forEach(function (c) {
        var info = classes[c] || {};
        if (info.headTeacher) total++;
        total += Object.keys(info.subjectTeachers || {}).length;
      });
    });
    return total;
  }

  function handleRosterFile(file) {
    if (!file) return;
    setSaveMsg("rosterMsg", "正在读取文件：" + file.name);
    var reader = new FileReader();
    reader.onload = async function () {
      var data = null;
      try {
        var raw = String(reader.result || "").replace(/^\uFEFF/, "");
        data = JSON.parse(raw);
      } catch (e) {
        setSaveMsg("rosterMsg", "文件不是有效的 JSON：" + e.message, true);
        return;
      }
      if (!data || typeof data !== "object" || !data.grades || typeof data.grades !== "object") {
        setSaveMsg("rosterMsg", "名单文件缺少 grades 字段，请上传由「教师任课名单」导出的 JSON 文件", true);
        return;
      }
      var total = rosterCountOf(data);
      if (!total) { setSaveMsg("rosterMsg", "名单文件里没有可导入的教师记录", true); return; }
      if (!window.confirm("将从「" + file.name + "」导入约 " + total + " 条记录（同年级/班级/科目会被覆盖），确定继续？")) {
        setSaveMsg("rosterMsg", "");
        return;
      }
      setSaveMsg("rosterMsg", "正在导入…");
      try {
        var res = await STORE.importRoster(data);
        await loadRosterEditor();
        setSaveMsg("rosterMsg", "✅ 已从 " + file.name + " 导入 " + res.rows + " 条记录");
      } catch (err) {
        setSaveMsg("rosterMsg", "导入失败：" + writeHint(err, "database/teacher_assignments.sql") + err.message, true);
      }
    };
    reader.onerror = function () { setSaveMsg("rosterMsg", "读取文件失败", true); };
    reader.readAsText(file, "utf-8");
  }

  /* =========================================================
     教师账号（云端 teacher_accounts 表，密码存加盐哈希）
     密码规则：身份证号后 8 位（管理员填完整身份证号时自动截取）
     ========================================================= */
  var A = { rows: null, keyword: "" };

  /* 完整身份证号（18 位，末位可能是 X）→ 取后 8 位；其它输入原样使用 */
  function effectivePassword(input) {
    var s = text(input);
    return /^\d{17}[\dXx]$/.test(s) ? s.slice(-8).toUpperCase() : s;
  }

  function randomSalt() {
    var bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  function hashPassword(salt, password) {
    if (typeof window.JZSha256 !== "function") return "";
    return String(window.JZSha256(text(salt) + ":" + text(password))).toUpperCase();
  }

  function selectedAccountNames() {
    return Array.prototype.slice
      .call(document.querySelectorAll("#accountTable input[data-account-check]:checked"))
      .map(function (el) { return el.getAttribute("data-account-check"); });
  }

  function renderAccountTable() {
    var table = $("accountTable");
    if (!table) return;
    var rows = A.rows || [];
    var kw = text(A.keyword).trim();
    var list = kw ? rows.filter(function (r) { return text(r.name).indexOf(kw) >= 0; }) : rows;
    var head = '<thead><tr><th style="width:34px"><input type="checkbox" id="accountCheckAll" title="全选当前筛选结果"></th>' +
      "<th>姓名</th><th>角色</th><th>状态</th><th>最后更新</th><th>操作</th></tr></thead>";
    if (!list.length) {
      table.innerHTML = head + '<tbody><tr><td colspan="6" class="jz-empty">' +
        (rows.length ? "没有匹配的姓名" : "云端还没有账号，可用「上传账号文件导入」或上方表单新增") + "</td></tr></tbody>";
      return;
    }
    var body = list.map(function (r) {
      var when = r.updated_at ? new Date(r.updated_at).toLocaleString("zh-CN") : "—";
      var role = r.role === "admin" ? '<b style="color:#1d4ed8">管理员</b>' : "普通教师";
      var state = r.active === false ? '<span style="color:#c0392b">已停用</span>' : '<span style="color:#1a7a46">正常</span>';
      var name = esc(r.name);
      var nextRole = r.role === "admin" ? "user" : "admin";
      var roleLabel = r.role === "admin" ? "设为普通教师" : "设为管理员";
      return '<tr><td><input type="checkbox" data-account-check="' + name + '"></td>' +
        "<td>" + name + "</td><td>" + role + "</td><td>" + state + "</td><td>" + esc(when) + "</td>" +
        '<td class="account-ops">' +
        '<button type="button" class="jz-btn ghost small" data-account-reset="' + name + '">重置密码</button>' +
        '<button type="button" class="jz-btn ghost small" data-account-role="' + name + '" data-role="' + nextRole + '">' + roleLabel + "</button>" +
        '<button type="button" class="jz-btn ghost small" data-account-del="' + name + '">删除</button>' +
        "</td></tr>";
    }).join("");
    table.innerHTML = head + "<tbody>" + body + "</tbody>";
    var all = $("accountCheckAll");
    if (all) {
      all.addEventListener("change", function () {
        var on = this.checked;
        document.querySelectorAll("#accountTable input[data-account-check]").forEach(function (box) { box.checked = on; });
      });
    }
  }

  function renderAccountState() {
    var el = $("accountState");
    if (!el) return;
    var rows = A.rows || [];
    var admins = rows.filter(function (r) { return r.role === "admin"; }).length;
    el.innerHTML =
      "<div><span>账号来源</span><b>" + (rows.length ? "云端 teacher_accounts 表" : "暂无（登录页正在使用本地账号文件）") + "</b></div>" +
      "<div><span>账号总数</span><b>" + rows.length + "（管理员 " + admins + " 个）</b></div>";
  }

  async function loadAccountEditor() {
    setSaveMsg("accountMsg", "");
    if (!API.isReady()) {
      A.rows = [];
      renderAccountTable();
      renderAccountState();
      setSaveMsg("accountMsg", "未配置 Supabase，无法维护云端账号", true);
      return;
    }
    try {
      A.rows = await STORE.listTeacherAccounts();
      markSynced();
      renderAccountTable();
      renderAccountState();
    } catch (err) {
      A.rows = [];
      renderAccountTable();
      renderAccountState();
      setSaveMsg("accountMsg", "读取云端失败：教师账号表只允许已登录的云端账号读取，请先在「④ 连接设置」登录云端账号；若还未建表，先在 Supabase 执行 database/teacher_accounts.sql。" + err.message, true);
    }
  }

  async function saveAccount() {
    if (!API.isReady()) { setSaveMsg("accountMsg", "未配置 Supabase，无法保存", true); return; }
    var name = $("accountName").value.trim();
    var pwd = $("accountPassword").value.trim();
    var role = $("accountRole").value;
    if (!name) { setSaveMsg("accountMsg", "请填写姓名", true); return; }
    if (!pwd) { setSaveMsg("accountMsg", "请填写密码", true); return; }
    if (typeof window.JZSha256 !== "function") { setSaveMsg("accountMsg", "页面缺少哈希函数，请刷新后重试", true); return; }
    var exists = (A.rows || []).some(function (r) { return r.name === name; });
    if (exists && !window.confirm("账号「" + name + "」已存在，将覆盖其密码并设为「" + (role === "admin" ? "管理员" : "普通教师") + "」，继续？")) return;
    var salt = randomSalt();
    setSaveMsg("accountMsg", "正在保存…");
    try {
      await STORE.saveTeacherAccounts([{ name: name, salt: salt, pwdHash: hashPassword(salt, effectivePassword(pwd)), role: role }]);
      await loadAccountEditor();
      $("accountPassword").value = "";
      setSaveMsg("accountMsg", "✅ 已保存账号：" + name);
    } catch (err) {
      setSaveMsg("accountMsg", "保存失败：" + writeHint(err, "database/teacher_accounts.sql") + err.message, true);
    }
  }

  async function deleteAccount(name) {
    if (!API.isReady()) { setSaveMsg("accountMsg", "未配置 Supabase，无法删除", true); return; }
    if (!window.confirm("确定删除账号「" + name + "」吗？删除后该教师将无法登录。")) return;
    setSaveMsg("accountMsg", "正在删除…");
    try {
      await STORE.deleteTeacherAccount(name);
      await loadAccountEditor();
      setSaveMsg("accountMsg", "✅ 已删除：" + name);
    } catch (err) {
      setSaveMsg("accountMsg", "删除失败：" + err.message, true);
    }
  }

  /* 重置密码：只改密码，保留角色 */
  async function resetAccountPassword(name) {
    if (!API.isReady()) { setSaveMsg("accountMsg", "未配置 Supabase，无法修改", true); return; }
    if (typeof window.JZSha256 !== "function") { setSaveMsg("accountMsg", "页面缺少哈希函数，请刷新后重试", true); return; }
    var row = (A.rows || []).filter(function (r) { return r.name === name; })[0];
    if (!row) { setSaveMsg("accountMsg", "找不到账号：" + name, true); return; }
    var pwd = window.prompt("给「" + name + "」设置新密码（身份证号后 8 位；填完整身份证号会自动取后 8 位）：", "");
    if (pwd === null) return;
    pwd = String(pwd).trim();
    if (!pwd) { setSaveMsg("accountMsg", "密码不能为空，已取消", true); return; }
    setSaveMsg("accountMsg", "正在重置「" + name + "」的密码…");
    try {
      var salt = randomSalt();
      await STORE.saveTeacherAccounts([{ name: name, salt: salt, pwdHash: hashPassword(salt, effectivePassword(pwd)), role: row.role }]);
      await loadAccountEditor();
      setSaveMsg("accountMsg", "✅ 已重置密码：" + name + "（请通知本人新密码）");
    } catch (err) {
      setSaveMsg("accountMsg", "重置失败：" + writeHint(err, "database/teacher_accounts.sql") + err.message, true);
    }
  }

  /* 只改角色：沿用原来的盐与哈希，不动密码 */
  async function batchSetRole(names, role) {
    if (!API.isReady()) { setSaveMsg("accountMsg", "未配置 Supabase，无法修改", true); return; }
    var list = (names || []).map(function (n) {
      var row = (A.rows || []).filter(function (r) { return r.name === n; })[0];
      if (!row || !row.pwd_hash) return null;
      return { name: row.name, salt: row.salt, pwdHash: row.pwd_hash, role: role };
    }).filter(Boolean);
    if (!list.length) { setSaveMsg("accountBatchMsg", "没有可修改的账号", true); return; }
    var label = role === "admin" ? "管理员" : "普通教师";
    if (!window.confirm("将把 " + list.length + " 个账号设为「" + label + "」，确定吗？")) return;
    setSaveMsg("accountBatchMsg", "正在保存…");
    try {
      await STORE.saveTeacherAccounts(list);
      await loadAccountEditor();
      setSaveMsg("accountBatchMsg", "✅ 已设为" + label + "：" + list.length + " 个账号");
    } catch (err) {
      setSaveMsg("accountBatchMsg", "保存失败：" + writeHint(err, "database/teacher_accounts.sql") + err.message, true);
    }
  }

  async function batchDeleteAccounts(names) {
    if (!API.isReady()) { setSaveMsg("accountMsg", "未配置 Supabase，无法删除", true); return; }
    var list = (names || []).filter(Boolean);
    if (!list.length) { setSaveMsg("accountBatchMsg", "请先勾选要删除的账号", true); return; }
    if (!window.confirm("将删除 " + list.length + " 个账号（" + list.slice(0, 5).join("、") +
      (list.length > 5 ? " 等" : "") + "），删除后这些教师将无法登录。确定吗？")) return;
    setSaveMsg("accountBatchMsg", "正在删除…");
    try {
      for (var i = 0; i < list.length; i++) await STORE.deleteTeacherAccount(list[i]);
      await loadAccountEditor();
      setSaveMsg("accountBatchMsg", "✅ 已删除：" + list.length + " 个账号");
    } catch (err) {
      setSaveMsg("accountBatchMsg", "删除失败：" + err.message, true);
    }
  }

  function switchAccountRole(name, role) {
    return batchSetRole([name], role);
  }

  /* =========================================================
     系统通知：预览 / 整年级表格开关 / 全局刷新
     ========================================================= */
  function toggleNoticePreview() {
    var box = $("noticePreview");
    var btn = $("noticePreviewBtn");
    if (!box) return;
    if (!box.hidden) {
      box.hidden = true;
      if (btn) btn.textContent = "预览效果";
      return;
    }
    var md = $("noticeBody").value;
    if (!String(md || "").trim()) {
      setSaveMsg("noticeMsg", "内容为空，首页会显示 notice.md 的默认内容", true);
    } else {
      setSaveMsg("noticeMsg", "");
    }
    box.innerHTML = window.JZNoticeMarkdown
      ? window.JZNoticeMarkdown(md)
      : esc(md);
    box.hidden = false;
    if (btn) btn.textContent = "收起预览";
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function toggleRosterGradeGrid() {
    var wrap = $("rosterGradeGridWrap");
    var btn = $("rosterGradeGridBtn");
    if (!wrap) return;
    if (!wrap.hidden) {
      wrap.hidden = true;
      if (btn) btn.textContent = "整年级表格编辑";
      return;
    }
    renderRosterGradeGrid();
    wrap.hidden = false;
    if (btn) btn.textContent = "收起整年级表格";
    wrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function refreshAllPanel() {
    var btn = $("adminRefreshAll");
    if (btn) { btn.disabled = true; btn.textContent = "刷新中…"; }
    try {
      checkCloud();
      if (!API.isReady()) return;
      await refreshGrades($("scoreGrade").value, $("paperGrade") ? $("paperGrade").value : null);
      await refreshPaperExams();
      await renderManage();
      await loadAccountEditor();
      await loadRosterEditor();
      await loadNoticeEditor(true);
      renderConfigState();
      renderAuthState();
      markSynced();
      UI.toast("已刷新云端数据", "success");
    } catch (err) {
      banner("error", "刷新失败：" + esc(err.message));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "↻ 刷新全部"; }
    }
  }

  function importAccountsFile() {    if (!API.isReady()) { setSaveMsg("accountMsg", "未配置 Supabase，无法导入", true); return; }
    if (typeof window.JZSha256 !== "function") { setSaveMsg("accountMsg", "页面缺少哈希函数，请刷新后重试", true); return; }
    $("accountImportFile").click();
  }

  function handleAccountFile(file) {
    if (!file) return;
    setSaveMsg("accountMsg", "正在读取文件：" + file.name);
    var reader = new FileReader();
    reader.onload = async function () {
      var data = null;
      try {
        data = JSON.parse(String(reader.result || "").replace(/^\uFEFF/, ""));
      } catch (e) {
        setSaveMsg("accountMsg", "文件不是有效的 JSON：" + e.message, true);
        return;
      }
      var list = Array.isArray(data) ? data : (data && data.accounts) || [];
      var rows = list.map(function (item) {
        var name = text(item && item.name).trim();
        var pwd = effectivePassword(text(item && item.password).trim());
        if (!name || !pwd) return null;
        var salt = randomSalt();
        return {
          name: name,
          salt: salt,
          pwdHash: hashPassword(salt, pwd),
          role: item.role === "admin" ? "admin" : "user"
        };
      }).filter(Boolean);
      if (!rows.length) { setSaveMsg("accountMsg", "文件里没有可导入的账号（需要 name / password 字段）", true); return; }
      if (!window.confirm("将从「" + file.name + "」导入 " + rows.length + " 个账号（同名会覆盖密码；password 填完整身份证号会自动取后 8 位），确定继续？")) {
        setSaveMsg("accountMsg", "");
        return;
      }
      setSaveMsg("accountMsg", "正在导入…");
      try {
        await STORE.saveTeacherAccounts(rows);
        await loadAccountEditor();
        setSaveMsg("accountMsg", "✅ 已从 " + file.name + " 导入 " + rows.length + " 个账号");
      } catch (err) {
        setSaveMsg("accountMsg", "导入失败：" + writeHint(err, "database/teacher_accounts.sql") + err.message, true);
      }
    };
    reader.onerror = function () { setSaveMsg("accountMsg", "读取文件失败", true); };
    reader.readAsText(file, "utf-8");
  }

  /* =========================================================
     初始化
     ========================================================= */
  async function initPanel() {
    try { if (API.ready) await API.ready(); } catch (e) { /* ignore */ }
    checkCloud();
    fillConfigForm();
    await refreshGrades();
    await refreshPaperExams();
    await renderManage();
  }

  function bindFileDrop(dropId, inputId, handler) {
    var drop = $(dropId);
    var input = $(inputId);
    drop.addEventListener("click", function (e) {
      if (e.target !== input) input.click();
    });
    drop.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
    });
    input.addEventListener("change", function () {
      if (this.files && this.files[0]) handler(this.files[0]);
      this.value = "";
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("dragging"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("dragging"); });
    });
    drop.addEventListener("drop", function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handler(f);
    });
  }

  function switchTab(tab) {
    Array.prototype.forEach.call(document.querySelectorAll("#adminTabs button"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".jz-tab-panel"), function (p) {
      p.classList.toggle("active", p.id === "panel-" + tab);
    });
    if (tab === "manage") renderManage();
    if (tab === "config") { fillConfigForm(); }
    if (tab === "paper") refreshPaperExams();
    if (tab === "notice") loadNoticeEditor();
    if (tab === "roster") loadRosterEditor();
    if (tab === "account") loadAccountEditor();
  }

  function bindEvents() {
    $("logoutBtn").addEventListener("click", logout);
    $("switchAccountBtn").addEventListener("click", logout);

    document.querySelectorAll("#adminTabs button").forEach(function (b) {
      b.addEventListener("click", function () { switchTab(b.getAttribute("data-tab")); });
    });

    bindFileDrop("scoreDrop", "scoreFile", handleScoreFile);
    bindFileDrop("paperDrop", "paperFile", handlePaperFile);

    $("scoreSaveBtn").addEventListener("click", saveScoreExam);
    $("scoreResetBtn").addEventListener("click", function () {
      S.scoreData = null; S.scoreFileName = "";
      $("scorePreview").hidden = true;
      $("scoreFileInfo").textContent = "";
      $("scoreDrop").classList.remove("has-file");
      $("scoreDropTitle").textContent = "点击选择，或把成绩文件拖到这里";
      $("scoreSaveBtn").disabled = true;
      setSaveMsg("scoreSaveMsg", "");
    });
    $("paperSaveBtn").addEventListener("click", savePaper);
    $("paperResetBtn").addEventListener("click", function () {
      S.paperRows = null; S.paperMeta = null; S.paperFileName = "";
      $("paperPreview").hidden = true;
      $("paperFileInfo").textContent = "";
      $("paperDrop").classList.remove("has-file");
      $("paperDropTitle").textContent = "点击选择，或把试题分析模板拖到这里";
      $("paperSaveBtn").disabled = true;
      setSaveMsg("paperSaveMsg", "");
    });

    $("addGradeBtn").addEventListener("click", addGrade);
    $("newGradeInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); addGrade(); }
    });

    $("paperGrade").addEventListener("change", refreshPaperExams);
    $("paperExam").addEventListener("change", function () {
      toggleNewExamInput();
      refreshExistingPapers();
    });
    $("paperSubject").addEventListener("change", function () {
      $("paperCustomSubject").hidden = this.value !== "__custom__";
    });

    $("manageArea").addEventListener("click", handleManageClick);
    $("manageRefresh").addEventListener("click", renderManage);

    $("cfgTest").addEventListener("click", testConnection);
    $("cfgSave").addEventListener("click", saveConfig);
    $("cfgClear").addEventListener("click", clearConfig);
    $("authLogin").addEventListener("click", loginCloud);
    $("authLogout").addEventListener("click", logoutCloud);

    $("noticeSave").addEventListener("click", saveNotice);
    $("noticeReload").addEventListener("click", function () { loadNoticeEditor(); });
    $("noticeLoadFile").addEventListener("click", loadNoticeFromFile);
    $("noticePreviewBtn").addEventListener("click", toggleNoticePreview);
    $("noticeClear").addEventListener("click", function () {
      $("noticeBody").value = "";
      setSaveMsg("noticeMsg", "已清空内容，记得点「保存到云端」");
    });

    $("adminRefreshAll").addEventListener("click", refreshAllPanel);
    $("rosterGradeGridBtn").addEventListener("click", toggleRosterGradeGrid);
    $("rosterGridSave").addEventListener("click", saveRosterGradeGrid);
    $("rosterGridClose").addEventListener("click", toggleRosterGradeGrid);
    $("accountBatchAdmin").addEventListener("click", function () { batchSetRole(selectedAccountNames(), "admin"); });
    $("accountBatchUser").addEventListener("click", function () { batchSetRole(selectedAccountNames(), "user"); });
    $("accountBatchDelete").addEventListener("click", function () { batchDeleteAccounts(selectedAccountNames()); });

    $("rosterGrade").addEventListener("change", function () {
      R.grade = this.value;
      R.className = "";
      renderRosterSelectors();
      renderRosterFields();
      renderRosterGradeGrid();
      setSaveMsg("rosterMsg", "");
    });
    $("rosterClass").addEventListener("change", function () {
      R.className = this.value === "__new__" ? "" : this.value;
      $("rosterNewClass").hidden = this.value !== "__new__";
      if (this.value === "__new__") $("rosterNewClass").focus();
      renderRosterFields();
      setSaveMsg("rosterMsg", "");
    });
    $("rosterSave").addEventListener("click", saveRosterClass);
    $("rosterDelete").addEventListener("click", deleteRosterClass);
    $("rosterReload").addEventListener("click", loadRosterEditor);
    $("rosterImport").addEventListener("click", importRosterFromFile);
    $("rosterImportFile").addEventListener("change", function () {
      if (this.files && this.files[0]) handleRosterFile(this.files[0]);
      this.value = "";
    });

    $("accountSave").addEventListener("click", saveAccount);
    $("accountReload").addEventListener("click", loadAccountEditor);
    $("accountImport").addEventListener("click", importAccountsFile);
    $("accountImportFile").addEventListener("change", function () {
      if (this.files && this.files[0]) handleAccountFile(this.files[0]);
      this.value = "";
    });
    $("accountSearch").addEventListener("input", function () {
      A.keyword = this.value;
      renderAccountTable();
    });
    $("accountTable").addEventListener("click", function (e) {
      var del = e.target.closest ? e.target.closest("[data-account-del]") : null;
      if (del) { deleteAccount(del.getAttribute("data-account-del")); return; }
      var reset = e.target.closest ? e.target.closest("[data-account-reset]") : null;
      if (reset) { resetAccountPassword(reset.getAttribute("data-account-reset")); return; }
      var roleBtn = e.target.closest ? e.target.closest("[data-account-role]") : null;
      if (roleBtn) { switchAccountRole(roleBtn.getAttribute("data-account-role"), roleBtn.getAttribute("data-role")); }
    });
  }

  async function boot() {
    try { UI.mountNav({ base: "../", page: "" }); } catch (e) { /* 导航失败不影响后台 */ }
    bindEvents();
    if (!$("scoreDate").value) {
      var d = new Date();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      $("scoreDate").value = d.getFullYear() + "-" + m + "-" + day;
    }
    if (AUTH && AUTH.ready) {
      try { await AUTH.ready(); } catch (e) { /* 未登录时 auth.js 已跳转 */ }
    }
    if (AUTH && AUTH.isAdmin()) showPanel();
    else showDenied();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
