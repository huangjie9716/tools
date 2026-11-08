/* =========================================================
   成绩数据仓库（业务层）
   ---------------------------------------------------------
   统一的数据结构（存储与传输都使用这一种）：
     header: ["学号","姓名","班级","总分","语文","数学", ...]
     rows:   [["27004140101","张三","1班",413.82,93.5,45, ...], ...]
   各子系统再按自己的需要转换成：
     · 数组套数组（基础分析、结果评价、试题分析）
     · 对象数组（增值评价）
   对外暴露：window.JZStore
   ========================================================= */
(function () {
  "use strict";

  var API = window.JZCloud;

  var ID_ALIASES = ["学号", "学生学号", "考号", "考试号", "考生号", "准考证号", "学籍号", "学生编号", "编号", "id", "ID"];
  var NAME_ALIASES = ["姓名", "学生姓名", "名字", "学生", "name", "Name"];
  var CLASS_ALIASES = ["班级", "班级名称", "班别", "行政班", "教学班", "所在班级", "班号", "班", "class", "Class"];
  var TOTAL_ALIASES = ["总分", "总成绩", "总分成绩", "合计", "总计", "total", "Total"];
  var FALLBACK_ID_ALIASES = ["序号"];
  var SKIP_HEADER = /^(序号|排名|名次|校排名|班级排名|年级排名|总分排名|等级|等第|考场号?|考室号?|座位号?|性别|备注|学校|年级|准考证号|考试号|考生号|总分等级|总分名次)$/;

  /* ---------------- 基础工具 ---------------- */
  function text(v) {
    return v === null || v === undefined ? "" : String(v).trim();
  }

  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "boolean") return v ? 1 : 0;
    var s = String(v).replace(/,/g, "").replace(/％/g, "%").trim();
    if (!s) return null;
    var n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function normalizeClassName(v) {
    var s = text(v);
    if (!s) return "未分班";
    // 全角数字转半角、去掉多余空格，便于识别「1」「1班」「第1班」「０１班」等写法
    s = s.replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    }).replace(/\s+/g, "");
    var m = s.match(/^第?(\d+)(?:\.0+)?班?$/);
    return m ? String(parseInt(m[1], 10)) + "班" : s;
  }

  function normHeader(v) {
    return text(v).replace(/\s+/g, "");
  }

  /* 前端统一学科显示口径：政治/思想品德/道德与法治… → 道法 */
  function normSubject(v) {
    var s = normHeader(v);
    if (!s) return "";
    return window.JZSubjects && window.JZSubjects.normalize ? window.JZSubjects.normalize(s) : s;
  }

  function findCol(headers, aliases) {
    for (var i = 0; i < headers.length; i++) {
      if (!headers[i]) continue;
      for (var j = 0; j < aliases.length; j++) {
        if (headers[i] === aliases[j]) return i;
      }
    }
    for (var k = 0; k < headers.length; k++) {
      if (!headers[k]) continue;
      for (var m = 0; m < aliases.length; m++) {
        if (headers[k].toLowerCase() === aliases[m].toLowerCase()) return k;
      }
    }
    return -1;
  }

  function looksLikeHeader(row) {
    if (!row || !row.length) return false;
    var vals = row.map(normHeader);
    var hasName = vals.some(function (v) { return NAME_ALIASES.indexOf(v) >= 0; });
    var hasId = vals.some(function (v) { return ID_ALIASES.indexOf(v) >= 0; });
    var hasClass = vals.some(function (v) { return CLASS_ALIASES.indexOf(v) >= 0; });
    return hasName || (hasId && hasClass);
  }

  function findHeaderIndex(rows) {
    var limit = Math.min(rows.length, 20);
    for (var i = 0; i < limit; i++) {
      if (looksLikeHeader(rows[i])) return i;
    }
    return -1;
  }

  /* =========================================================
     把上传的原始表格（二维数组）规范化为统一结构
     ========================================================= */
  function normalizeExamRows(aoa, options) {
    var opts = options || {};
    var input = Array.isArray(aoa) ? aoa : [];
    var rows = input.filter(function (r) { return Array.isArray(r); });
    if (!rows.length) throw new Error("表格内容为空");

    var headerIndex = findHeaderIndex(rows);
    if (headerIndex < 0) {
      throw new Error("没有识别到表头：第一行应为“学号、姓名、班级、总分、学科…”这样的列名");
    }
    var rawHeader = rows[headerIndex].map(normHeader);
    var dataRows = rows.slice(headerIndex + 1);

    var idCol = findCol(rawHeader, ID_ALIASES);
    var nameCol = findCol(rawHeader, NAME_ALIASES);
    var classCol = findCol(rawHeader, CLASS_ALIASES);
    var totalCol = findCol(rawHeader, TOTAL_ALIASES);
    var idFallback = false;
    if (idCol < 0) {
      idCol = findCol(rawHeader, FALLBACK_ID_ALIASES);
      idFallback = idCol >= 0;
    }
    if (nameCol < 0 && idCol < 0) {
      throw new Error("表头里找不到“学号”或“姓名”列，无法导入");
    }

    var fixed = [idCol, nameCol, classCol, totalCol];
    var numericCount = {};
    var c, r;
    for (c = 0; c < rawHeader.length; c++) {
      if (fixed.indexOf(c) >= 0) continue;
      var n = 0;
      for (r = 0; r < dataRows.length; r++) {
        if (num(dataRows[r] && dataRows[r][c]) !== null) n++;
      }
      numericCount[c] = n;
    }

    var subjects = [];
    var used = {};
    for (c = 0; c < rawHeader.length; c++) {
      if (fixed.indexOf(c) >= 0) continue;
      var name = normSubject(rawHeader[c]);
      if (!name || SKIP_HEADER.test(name)) continue;
      if (!numericCount[c]) continue;
      var unique = name;
      var suffix = 2;
      while (used[unique]) { unique = name + "(" + suffix + ")"; suffix++; }
      used[unique] = true;
      subjects.push({ name: unique, col: c });
    }
    if (!subjects.length) {
      throw new Error("没有识别到学科列：总分列之后应当依次是各学科成绩");
    }

    var outRows = [];
    var seen = {};
    var blankRows = 0;
    var duplicateIds = 0;
    var noName = 0;
    var invalidId = 0;

    for (r = 0; r < dataRows.length; r++) {
      var row = dataRows[r];
      if (!row) continue;
      var id = text(idCol >= 0 ? row[idCol] : "");
      var personName = text(nameCol >= 0 ? row[nameCol] : "");
      var className = normalizeClassName(classCol >= 0 ? row[classCol] : "");

      var scores = [];
      var hasScore = false;
      var sum = 0;
      for (var s = 0; s < subjects.length; s++) {
        var v = num(row[subjects[s].col]);
        scores.push(v);
        if (v !== null) { hasScore = true; sum += v; }
      }

      var providedTotal = totalCol >= 0 ? num(row[totalCol]) : null;
      var rowHasOther = row.some(function (cell) { return text(cell) !== ""; });
      if (!id && !personName && !hasScore && providedTotal === null) {
        if (rowHasOther) blankRows++;
        continue;
      }
      if (!id && !personName) { blankRows++; continue; }

      var total = providedTotal;
      if (total === null && hasScore) total = round2(sum);

      if (!id) {
        invalidId++;
        id = "行" + (r + 2);
      }
      if (seen[id]) duplicateIds++;
      seen[id] = true;
      if (!personName) noName++;

      outRows.push([id, personName, className, total === null ? null : round2(total)].concat(scores));
    }

    if (!outRows.length) throw new Error("没有读取到学生成绩，请检查表格内容");

    var header = ["学号", "姓名", "班级", "总分"].concat(subjects.map(function (x) { return x.name; }));

    var warnings = [];
    if (blankRows) warnings.push("已忽略 " + blankRows + " 行空行");
    if (duplicateIds) warnings.push("有 " + duplicateIds + " 个重复学号");
    if (noName) warnings.push(noName + " 行缺少姓名");
    if (invalidId) warnings.push(invalidId + " 行缺少学号，已临时编号");
    if (idFallback) warnings.push("未找到“学号”列，暂用“序号”列作为学号，建议补上学号列");

    var classSet = {};
    outRows.forEach(function (row) { classSet[row[2]] = true; });

    return {
      header: header,
      rows: outRows,
      meta: {
        studentCount: outRows.length,
        subjectCount: subjects.length,
        subjects: subjects.map(function (x) { return x.name; }),
        classCount: Object.keys(classSet).length,
        warnings: warnings,
        fileName: opts.fileName || ""
      }
    };
  }

  /* =========================================================
     格式转换
     ========================================================= */
  function toAoA(header, rows) {
    var out = [ (header || []).map(normSubject) ];
    (rows || []).forEach(function (row) { out.push(row.slice()); });
    return out;
  }

  function toObjects(header, rows) {
    var h = header || [];
    return (rows || []).map(function (row) {
      var obj = {};
      for (var i = 0; i < h.length; i++) {
        if (!h[i]) continue;
        obj[normSubject(h[i])] = row[i] === undefined ? "" : row[i];
      }
      return obj;
    });
  }

  function subjectNames(header) {
    return (header || []).slice(4).map(normSubject);
  }

  /* =========================================================
     年级
     ========================================================= */
  var DEFAULT_GRADES = ["2027届", "2028届", "2029届"];

  /* 默认年级始终可选；管理员在后台新建的年级会追加在默认年级之后 */
  function mergeDefaultGrades(list) {
    var rows = Array.isArray(list) ? list : [];
    var out = [];
    var seen = {};
    DEFAULT_GRADES.forEach(function (name, index) {
      var existed = rows.filter(function (g) { return text(g.name) === name; })[0];
      var grade = existed || { id: "default-grade-" + (index + 1), name: name, is_default: true, sort_order: index + 1 };
      out.push(grade);
      seen[name] = true;
    });
    rows.forEach(function (g) {
      var name = text(g.name);
      if (!name || seen[name]) return;
      out.push(g);
      seen[name] = true;
    });
    return out;
  }

  async function listGrades() {
    var rows = await API.select("grades", "select=*&order=sort_order.asc,name.asc");
    return mergeDefaultGrades(rows);
  }

  async function ensureGrade(name) {
    var clean = text(name);
    if (!clean) throw new Error("年级名称不能为空");
    var existed = await API.select("grades", "select=*&name=eq." + encodeURIComponent(clean) + "&limit=1");
    if (existed && existed.length) return existed[0];
    var maxRows = await API.select("grades", "select=sort_order&order=sort_order.desc.nullslast&limit=1");
    var next = maxRows && maxRows.length && Number.isFinite(Number(maxRows[0].sort_order))
      ? Number(maxRows[0].sort_order) + 1 : 1;
    var created = await API.insert("grades", { name: clean, sort_order: next });
    return created && created[0] ? created[0] : { id: null, name: clean };
  }

  async function deleteGrade(gradeId) {
    return API.remove("grades", "id=eq." + encodeURIComponent(gradeId));
  }

  /* =========================================================
     考试
     ========================================================= */
  function isDefaultGradeId(gradeId) {
    return String(gradeId || "").indexOf("default-grade-") === 0;
  }

  function timeValue(v) {
    var s = text(v);
    if (!s) return NaN;
    var t = Date.parse(s.replace(" ", "T"));
    return isNaN(t) ? NaN : t;
  }

  /** 按「考试日期」倒序：最新的在最前面；没填考试日期的排在后面，再按上传时间倒序 */
  function sortExamsByDateDesc(list) {
    return (list || []).slice().sort(function (a, b) {
      var da = timeValue(a && a.exam_date), db = timeValue(b && b.exam_date);
      var hasA = !isNaN(da), hasB = !isNaN(db);
      if (hasA !== hasB) return hasA ? -1 : 1;
      if (hasA && da !== db) return db - da;
      var ca = timeValue(a && a.created_at), cb = timeValue(b && b.created_at);
      if (!isNaN(ca) && !isNaN(cb) && ca !== cb) return cb - ca;
      return 0;
    });
  }

  async function listExams(gradeId) {
    if (isDefaultGradeId(gradeId)) return [];
    var q = "select=*&order=exam_date.desc.nullslast,created_at.desc";
    if (gradeId) q = "grade_id=eq." + encodeURIComponent(gradeId) + "&" + q;
    return sortExamsByDateDesc(await API.select("exams", q));
  }

  /** 全部考试：按考试日期倒序（最新的在前），没填日期的按上传时间排在后面 */
  async function listAllExams(limit) {
    var rows = await API.select("exams", "select=*&order=exam_date.desc.nullslast,created_at.desc");
    var sorted = sortExamsByDateDesc(rows);
    return (limit && limit > 0) ? sorted.slice(0, limit) : sorted;
  }

  async function getExam(examId) {
    var rows = await API.select("exams", "select=*&id=eq." + encodeURIComponent(examId) + "&limit=1");
    return rows && rows[0] ? rows[0] : null;
  }

  /** 读取某场考试的成绩（统一结构） */
  async function getExamRows(examId) {
    var rows = await API.select(
      "scores",
      "select=header,rows&exam_id=eq." + encodeURIComponent(examId) + "&limit=1"
    );
    if (!rows || !rows.length) throw new Error("这场考试还没有成绩数据，请先在管理员入口上传");
    var rec = rows[0];
    return { header: rec.header || [], rows: rec.rows || [] };
  }

  /** 保存一场考试：自动创建年级/考试，并写入成绩（同名考试会被覆盖） */
  async function saveExam(input) {
    var grade = await ensureGrade(input.gradeName);
    var examName = text(input.examName);
    if (!examName) throw new Error("考试名称不能为空");
    var payload = {
      grade_id: grade.id,
      name: examName,
      scope: text(input.scope) || "校级",
      exam_date: input.examDate || null,
      note: text(input.note) || null,
      subjects: input.subjects || [],
      student_count: input.studentCount || 0,
      source_file: text(input.sourceFile) || null,
      updated_at: new Date().toISOString()
    };
    var saved = await API.upsert("exams", payload, "grade_id,name");
    var exam = saved && saved[0] ? saved[0] : null;
    if (!exam || !exam.id) throw new Error("考试信息保存失败，请检查数据表与权限");
    await API.upsert("scores", {
      exam_id: exam.id,
      header: input.header || [],
      rows: input.rows || [],
      updated_at: new Date().toISOString()
    }, "exam_id");
    return exam;
  }

  /** 只创建/获取考试（不上传成绩），用于试题分析先建考试 */
  async function ensureExam(gradeName, examName, extra) {
    var e = extra || {};
    var grade = await ensureGrade(gradeName);
    var name = text(examName);
    if (!name) throw new Error("考试名称不能为空");
    var existed = await API.select(
      "exams",
      "select=*&grade_id=eq." + encodeURIComponent(grade.id) + "&name=eq." + encodeURIComponent(name) + "&limit=1"
    );
    if (existed && existed.length) return { grade: grade, exam: existed[0] };
    var payload = {
      grade_id: grade.id,
      name: name,
      scope: text(e.scope) || "校级",
      exam_date: e.examDate || null,
      note: text(e.note) || null,
      subjects: e.subjects || [],
      student_count: e.studentCount || 0,
      updated_at: new Date().toISOString()
    };
    var saved = await API.upsert("exams", payload, "grade_id,name");
    return { grade: grade, exam: saved && saved[0] ? saved[0] : null };
  }

  async function deleteExam(examId) {
    return API.remove("exams", "id=eq." + encodeURIComponent(examId));
  }

  /* =========================================================
     试题分析卷（年级 → 考试 → 科目）
     ========================================================= */
  async function listPapers(query) {
    var q = query || "";
    return API.select("papers", "select=*" + (q ? "&" + q : "") + "&order=updated_at.desc");
  }

  async function getPaper(paperId) {
    var rows = await API.select("papers", "select=*&id=eq." + encodeURIComponent(paperId) + "&limit=1");
    return rows && rows[0] ? rows[0] : null;
  }

  async function savePaper(input) {
    var ensured = await ensureExam(input.gradeName, input.examName, {
      scope: input.scope,
      examDate: input.examDate
    });
    if (!ensured.exam || !ensured.exam.id) throw new Error("考试创建失败，请检查数据表与权限");
    var subject = text(input.subject);
    if (!subject) throw new Error("请选择科目");
    var payload = {
      grade_id: ensured.grade.id,
      exam_id: ensured.exam.id,
      subject: subject,
      rows: input.rows || [],
      question_count: input.questionCount || 0,
      class_count: input.classCount || 0,
      source_file: text(input.sourceFile) || null,
      updated_at: new Date().toISOString()
    };
    var saved = await API.upsert("papers", payload, "exam_id,subject");
    return { paper: saved && saved[0] ? saved[0] : null, exam: ensured.exam, grade: ensured.grade };
  }

  async function deletePaper(paperId) {
    return API.remove("papers", "id=eq." + encodeURIComponent(paperId));
  }

  /* =========================================================
     统计（门户首页用）
     ========================================================= */
  async function stats() {
    var out = { grades: 0, exams: 0, papers: 0, students: 0 };
    try { out.grades = await API.count("grades"); } catch (e) { /* ignore */ }
    try { out.exams = await API.count("exams"); } catch (e) { /* ignore */ }
    try { out.papers = await API.count("papers"); } catch (e) { /* ignore */ }
    try {
      // 所有已上传考试的去重学生人数（按学号去重，同一学生多场考试只算一次）
      var scores = await API.select("scores", "select=header,rows");
      var ids = {};
      (scores || []).forEach(function (rec) {
        var header = rec.header || [];
        var idIdx = header.indexOf("学号");
        if (idIdx < 0) idIdx = 0;
        (rec.rows || []).forEach(function (row) {
          var id = row && row[idIdx] != null ? text(row[idIdx]) : "";
          if (id && !/^行\d+$/.test(id)) ids[id] = true;
        });
      });
      out.students = Object.keys(ids).length;
    } catch (e) { /* ignore */ }
    return out;
  }

  /* =========================================================
     系统通知（首页「系统通知与提醒」，单行存储 markdown 全文）
     ========================================================= */
  var NOTICE_ID = "default";

  async function getNotice() {
    var row = await API.selectOne("notices",
      "select=id,body,updated_at,updated_by&id=eq." + NOTICE_ID + "&limit=1");
    return row || null;
  }

  async function saveNotice(body, by) {
    var payload = {
      id: NOTICE_ID,
      body: String(body == null ? "" : body),
      updated_by: text(by) || null,
      updated_at: new Date().toISOString()
    };
    var saved = await API.upsert("notices", payload, "id");
    return saved && saved[0] ? saved[0] : payload;
  }

  /* =========================================================
     教师任课名单（按 年级 + 班级 + 科目 一行一条）
     科目为「班主任」时表示班主任
     ========================================================= */
  var ROSTER_HEAD_SUBJECT = "班主任";
  /* 前端统一显示“道法”，名单数据里可能仍沿用“政治”等旧写法，这里保留映射用于查找 */
  var ROSTER_SUBJECT_ALIASES = {
    "道法": "政治",
    "道德与法治": "政治",
    "思想品德": "政治",
    "思想政治": "政治",
    "体育与健康": "体育"
  };

  function normalizeRosterRow(row) {
    return {
      grade: text(row.grade),
      className: text(row.className || row.class_name),
      subject: text(row.subject),
      teacher: text(row.teacher)
    };
  }

  async function listTeacherAssignments(grade) {
    var q = "select=grade,class_name,subject,teacher&order=grade.asc,class_name.asc,subject.asc";
    if (grade) q += "&grade=eq." + encodeURIComponent(grade);
    return API.select("roster", q);
  }

  async function saveTeacherAssignments(rows) {
    var list = (rows || []).map(normalizeRosterRow).filter(function (r) {
      return r.grade && r.className && r.subject;
    });
    if (!list.length) return [];
    var now = new Date().toISOString();
    var payload = list.map(function (r) {
      return {
        grade: r.grade,
        class_name: r.className,
        subject: r.subject,
        teacher: r.teacher,
        updated_at: now
      };
    });
    var out = [];
    for (var i = 0; i < payload.length; i += 300) {
      var saved = await API.upsert("roster", payload.slice(i, i + 300), "grade,class_name,subject");
      out = out.concat(saved || []);
    }
    return out;
  }

  async function removeTeacherAssignment(grade, className, subject) {
    var q = "grade=eq." + encodeURIComponent(grade) +
      "&class_name=eq." + encodeURIComponent(className) +
      "&subject=eq." + encodeURIComponent(subject);
    return API.remove("roster", q);
  }

  async function removeTeacherClass(grade, className) {
    var q = "grade=eq." + encodeURIComponent(grade) +
      "&class_name=eq." + encodeURIComponent(className);
    return API.remove("roster", q);
  }

  /* 云端行 → 与 data/teacher-roster.json 同结构的对象 */
  async function getRoster() {
    var rows = await listTeacherAssignments();
    if (!rows || !rows.length) return null;
    var grades = {};
    rows.forEach(function (raw) {
      var r = normalizeRosterRow(raw);
      if (!r.grade || !r.className || !r.subject) return;
      if (!grades[r.grade]) {
        grades[r.grade] = { label: /年级$/.test(r.grade) ? r.grade : r.grade + "年级", classes: {} };
      }
      var cls = grades[r.grade].classes[r.className];
      if (!cls) cls = grades[r.grade].classes[r.className] = { headTeacher: "", subjectTeachers: {} };
      if (r.subject === ROSTER_HEAD_SUBJECT) cls.headTeacher = r.teacher;
      else if (r.teacher) cls.subjectTeachers[r.subject] = r.teacher;
    });
    return {
      schemaVersion: 1,
      source: "supabase",
      updatedAt: new Date().toISOString(),
      subjectAliases: ROSTER_SUBJECT_ALIASES,
      grades: grades
    };
  }

  /* 把整份名单对象（同 JSON 结构）批量写入云端，用于首次迁移 */
  async function importRoster(roster) {
    var rows = [];
    var grades = (roster && roster.grades) || {};
    Object.keys(grades).forEach(function (g) {
      var classes = (grades[g] && grades[g].classes) || {};
      Object.keys(classes).forEach(function (c) {
        var info = classes[c] || {};
        if (info.headTeacher) rows.push({ grade: g, className: c, subject: ROSTER_HEAD_SUBJECT, teacher: info.headTeacher });
        var st = info.subjectTeachers || {};
        Object.keys(st).forEach(function (s) {
          if (st[s]) rows.push({ grade: g, className: c, subject: s, teacher: st[s] });
        });
      });
    });
    var saved = await saveTeacherAssignments(rows);
    return { rows: rows.length, saved: saved.length };
  }

  /* =========================================================
     教师账号（姓名 + 加盐密码哈希 + 角色）
     ========================================================= */
  async function listTeacherAccounts() {
    return API.select("accounts", "select=id,name,salt,pwd_hash,role,active,updated_at&order=name.asc");
  }

  async function saveTeacherAccounts(list) {
    var rows = (list || []).filter(function (r) { return r && r.name && r.pwdHash; }).map(function (r) {
      return {
        name: text(r.name),
        salt: text(r.salt),
        pwd_hash: text(r.pwdHash),
        role: r.role === "admin" ? "admin" : "user",
        active: r.active === false ? false : true,
        updated_at: new Date().toISOString()
      };
    });
    if (!rows.length) return [];
    var out = [];
    for (var i = 0; i < rows.length; i += 200) {
      var saved = await API.upsert("accounts", rows.slice(i, i + 200), "name");
      out = out.concat(saved || []);
    }
    return out;
  }

  async function deleteTeacherAccount(name) {
    return API.remove("accounts", "name=eq." + encodeURIComponent(text(name)));
  }

  window.JZStore = {
    isReady: function () { return API && API.isReady(); },
    normalizeExamRows: normalizeExamRows,
    toAoA: toAoA,
    toObjects: toObjects,
    subjectNames: subjectNames,
    normalizeClassName: normalizeClassName,
    listGrades: listGrades,
    ensureGrade: ensureGrade,
    deleteGrade: deleteGrade,
    listExams: listExams,
    listAllExams: listAllExams,
    getExam: getExam,
    getExamRows: getExamRows,
    saveExam: saveExam,
    ensureExam: ensureExam,
    deleteExam: deleteExam,
    listPapers: listPapers,
    getPaper: getPaper,
    savePaper: savePaper,
    deletePaper: deletePaper,
    getNotice: getNotice,
    saveNotice: saveNotice,
    ROSTER_HEAD_SUBJECT: ROSTER_HEAD_SUBJECT,
    ROSTER_SUBJECT_ALIASES: ROSTER_SUBJECT_ALIASES,
    listTeacherAssignments: listTeacherAssignments,
    saveTeacherAssignments: saveTeacherAssignments,
    removeTeacherAssignment: removeTeacherAssignment,
    removeTeacherClass: removeTeacherClass,
    getRoster: getRoster,
    importRoster: importRoster,
    listTeacherAccounts: listTeacherAccounts,
    saveTeacherAccounts: saveTeacherAccounts,
    deleteTeacherAccount: deleteTeacherAccount,
    stats: stats
  };
})();
