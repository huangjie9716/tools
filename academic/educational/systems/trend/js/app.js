/* =========================================================
   趋势分析（systems/trend）
   ---------------------------------------------------------
   数据来源：云端已上传的考试成绩（年级 → 多场考试）
   功能：选择 年级 → 学科（可多选，含总分） → 班级（可多选），
         计算各班级「标准分平均分」随考试时间的变化趋势。
   标准分：T = 500 + 100 × (原始分 − 常模均值) ÷ 常模标准差（默认每场考试各自标准化）
   ========================================================= */
(function () {
  "use strict";

  var STORE = window.JZStore;
  var UI = window.JZUI;

  var GRADE_KEY = "jz_trend_grade";
  var TOTAL_KEY = "__total__";
  var TOTAL_LABEL = "总分";
  var SCHOOL_COLOR = "#1b2454";
  var SERIES_COLORS = ["#1d4ed8", "#b02018", "#0e7490", "#f59e0b", "#15803d", "#dc2626", "#0ea5e9", "#a16207", "#475569", "#be123c"];

  var ID_ALIASES = ["学号", "学生学号", "考号", "考试号", "考生号", "准考证号", "学籍号", "学生编号", "编号", "id", "ID"];
  var NAME_ALIASES = ["姓名", "学生姓名", "名字", "学生", "name", "Name"];
  var CLASS_ALIASES = ["班级", "班级名称", "班别", "行政班", "教学班", "所在班级", "班号", "班", "class", "Class"];
  var TOTAL_ALIASES = ["总分", "总成绩", "总分成绩", "合计", "总计", "total", "Total"];
  var SKIP_HEADER = /^(序号|排名|名次|校排名|班级排名|年级排名|总分排名|等级|等第|考场号?|考室号?|座位号?|性别|备注|学校|年级|准考证号|考试号|考生号|总分等级|总分名次)$/;

  var state = {
    mode: "grade",
    grades: [],
    gradeId: "",
    gradeName: "",
    gradeSubjects: {},
    norm: "exam",
    exams: [],
    subjects: [],
    classNames: [],
    selected: {},
    firstNorms: {},
    loading: false,
    /* 学生趋势 */
    studentIndex: {},
    studentClasses: [],
    studentClassPick: {},
    studentClassInit: false,
    studentQuery: "",
    studentKey: "",
    studentSubjects: {},
    studentAutoPick: true
  };

  /* ---------------- 基础工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function text(v) { return v === null || v === undefined ? "" : String(v).trim(); }
  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    var s = String(v).replace(/,/g, "").replace(/％/g, "%").trim();
    if (!s) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }
  function normHead(v) { return text(v).replace(/\s+/g, ""); }
  function findCol(heads, aliases) {
    for (var i = 0; i < heads.length; i++) {
      if (!heads[i]) continue;
      for (var j = 0; j < aliases.length; j++) if (heads[i] === aliases[j]) return i;
    }
    return -1;
  }
  function classKey(v) {
    var s = text(v);
    if (!s) return "未分班";
    // 全角数字转半角、去掉多余空格，便于识别「1」「1班」「第1班」「０１班」等写法
    s = s.replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    }).replace(/\s+/g, "");
    var m = s.match(/^第?(\d+)(?:\.0+)?班?$/);
    return m ? String(parseInt(m[1], 10)) + "班" : s;
  }
  function timeOf(v) {
    var s = text(v);
    if (!s) return NaN;
    var t = Date.parse(s.replace(" ", "T"));
    return isNaN(t) ? NaN : t;
  }
  function fmt1(v) {
    return v === null || v === undefined || !isFinite(v) ? "—" : Number(v).toFixed(1);
  }
  function naturalCompare(a, b) {
    return String(a).localeCompare(String(b), "zh-CN", { numeric: true });
  }
  function alertBox(html, type) {
    var box = $("trAlert");
    if (!box) return;
    if (!html) { box.hidden = true; box.innerHTML = ""; return; }
    box.className = "jz-alert " + (type || "info");
    box.innerHTML = html;
    box.hidden = false;
  }

  /* ---------------- 解析成绩表 ---------------- */
  function parseRows(header, rows) {
    var heads = (header || []).map(normHead);
    var idIdx = findCol(heads, ID_ALIASES);
    var nameIdx = findCol(heads, NAME_ALIASES);
    var classIdx = findCol(heads, CLASS_ALIASES);
    var totalIdx = findCol(heads, TOTAL_ALIASES);

    var subjectCols = [];
    for (var i = 0; i < heads.length; i++) {
      if (i === idIdx || i === nameIdx || i === classIdx || i === totalIdx) continue;
      if (!heads[i]) continue;
      if (SKIP_HEADER.test(heads[i])) continue;
      subjectCols.push({ name: heads[i], idx: i });
    }

    var students = [];
    (rows || []).forEach(function (r) {
      if (!Array.isArray(r)) return;
      var scores = {};
      var hasScore = false;
      subjectCols.forEach(function (col) {
        var v = num(r[col.idx]);
        scores[col.name] = v;
        if (v !== null) hasScore = true;
      });
      var total = totalIdx >= 0 ? num(r[totalIdx]) : null;
      if (total === null) {
        var sum = 0, any = false;
        subjectCols.forEach(function (col) {
          var v = scores[col.name];
          if (v !== null) { sum += v; any = true; }
        });
        total = any ? sum : null;
      }
      if (total === null && !hasScore) return;
      students.push({
        id: idIdx >= 0 ? text(r[idIdx]) : "",
        name: nameIdx >= 0 ? text(r[nameIdx]) : "",
        cls: classKey(classIdx >= 0 ? r[classIdx] : ""),
        total: total,
        scores: scores
      });
    });

    return { subjects: subjectCols.map(function (c) { return c.name; }), students: students };
  }

  function statsOf(values) {
    var n = values.length;
    if (!n) return { n: 0, mean: null, sd: null };
    var sum = 0;
    for (var i = 0; i < n; i++) sum += values[i];
    var mean = sum / n;
    var variance = 0;
    for (var j = 0; j < n; j++) variance += Math.pow(values[j] - mean, 2);
    return { n: n, mean: mean, sd: Math.sqrt(variance / n) };
  }

  function buildExamStats(students, subjects) {
    var keys = [TOTAL_KEY].concat(subjects);
    var out = {};
    keys.forEach(function (key) {
      var vals = [];
      var classVals = {};
      students.forEach(function (s) {
        var v = key === TOTAL_KEY ? s.total : s.scores[key];
        if (v === null || v === undefined || !isFinite(v)) return;
        vals.push(v);
        var c = s.cls || "未分班";
        (classVals[c] || (classVals[c] = [])).push(v);
      });
      var st = statsOf(vals);
      var classMeans = {};
      Object.keys(classVals).forEach(function (c) {
        classMeans[c] = statsOf(classVals[c]).mean;
      });
      out[key] = { n: st.n, mean: st.mean, sd: st.sd, classMeans: classMeans };
    });
    return out;
  }

  /* ---------------- 排序 / 标签 ---------------- */
  function sortExamsAsc(list) {
    return (list || []).slice().sort(function (a, b) {
      var da = timeOf(a.exam_date), db = timeOf(b.exam_date);
      var hasA = !isNaN(da), hasB = !isNaN(db);
      if (hasA !== hasB) return hasA ? -1 : 1;
      if (hasA && da !== db) return da - db;
      var ca = timeOf(a.created_at), cb = timeOf(b.created_at);
      if (!isNaN(ca) && !isNaN(cb) && ca !== cb) return ca - cb;
      return 0;
    });
  }

  function buildLabels() {
    return state.exams.map(function (ex) {
      var same = state.exams.filter(function (e) { return e.name === ex.name; }).length;
      if (same > 1 && ex.exam_date) return ex.name + "（" + String(ex.exam_date).slice(5, 10) + "）";
      return ex.name || "未命名考试";
    });
  }

  /* ---------------- 标准分 ---------------- */
  function buildFirstNorms() {
    var norms = {};
    state.exams.forEach(function (ex) {
      var keys = [TOTAL_KEY].concat(ex.subjects);
      keys.forEach(function (key) {
        if (norms[key]) return;
        var st = ex.stats[key];
        if (st && st.n > 1 && st.sd > 0) norms[key] = { mean: st.mean, sd: st.sd };
      });
    });
    return norms;
  }

  function normStatsFor(key, exam) {
    if (state.norm === "exam") return exam.stats[key];
    return state.firstNorms[key] || exam.stats[key];
  }

  function toT(value, stats) {
    if (value === null || value === undefined || !isFinite(value)) return null;
    if (!stats || stats.mean === null || !isFinite(stats.mean)) return null;
    if (!(stats.sd > 0)) return 500;
    return 500 + 100 * (Number(value) - Number(stats.mean)) / Number(stats.sd);
  }

  function selectedClasses() {
    return Object.keys(state.selected)
      .filter(function (c) { return state.selected[c]; })
      .sort(naturalCompare);
  }

  function subjectOrder(a, b) {
    if (a === TOTAL_KEY) return -1;
    if (b === TOTAL_KEY) return 1;
    return state.subjects.indexOf(a) - state.subjects.indexOf(b);
  }

  function selectedSubjects() {
    return Object.keys(state.gradeSubjects)
      .filter(function (k) { return state.gradeSubjects[k]; })
      .sort(subjectOrder);
  }

  function buildSeries() {
    var labels = buildLabels();
    var keys = selectedSubjects();
    var classes = selectedClasses();
    var multiSubj = keys.length > 1;
    var series = [];

    keys.forEach(function (key, ki) {
      /* 每场各自标准化时各科全级均分恒为 500，只画一条即可，避免 N 条线重叠 */
      var sameSchoolLine = multiSubj && state.norm === "exam";
      if (!sameSchoolLine) {
        series.push({
          name: multiSubj ? "全级·" + subjectName(key) : "全级平均",
          color: SCHOOL_COLOR,
          isSchool: true,
          key: key,
          values: []
        });
      } else if (ki === 0) {
        series.push({
          name: "全级平均（各科均为 500）",
          color: SCHOOL_COLOR,
          isSchool: true,
          key: key,
          values: []
        });
      }
      classes.forEach(function (c, ci) {
        var colorIdx = multiSubj ? (classes.length === 1 ? ki : ki * classes.length + ci) : ci;
        var name = multiSubj ? (classes.length === 1 ? subjectName(key) : c + "·" + subjectName(key)) : c;
        series.push({
          name: name,
          color: SERIES_COLORS[colorIdx % SERIES_COLORS.length],
          cls: c,
          key: key,
          values: []
        });
      });
    });

    state.exams.forEach(function (ex) {
      series.forEach(function (s) {
        var st = ex.stats[s.key];
        var norm = normStatsFor(s.key, ex);
        if (s.isSchool) {
          s.values.push(st ? toT(st.mean, norm) : null);
          return;
        }
        var m = st && st.classMeans ? st.classMeans[s.cls] : null;
        s.values.push(m === null || m === undefined ? null : toT(m, norm));
      });
    });

    return { labels: labels, series: series };
  }

  /* ---------------- 学生趋势 ---------------- */
  function studentKeyOf(st) {
    return st.id ? ("id:" + st.id) : ("nm:" + (st.name || "") + "@" + (st.cls || ""));
  }

  function refreshStudentIndex() {
    var map = {};
    state.exams.forEach(function (ex) {
      ex.students.forEach(function (st) {
        var key = studentKeyOf(st);
        var rec = map[key];
        if (!rec) {
          rec = map[key] = { key: key, id: st.id || "", name: st.name || "", cls: st.cls || "" };
        }
        if (st.name) rec.name = st.name;
        if (st.cls) rec.cls = st.cls;
        if (st.id) rec.id = st.id;
      });
    });
    state.studentIndex = map;
    var classes = {};
    Object.keys(map).forEach(function (k) {
      if (map[k].cls) classes[map[k].cls] = true;
    });
    state.studentClasses = Object.keys(classes).sort(naturalCompare);
  }

  function pickedStudentClasses() {
    return Object.keys(state.studentClassPick)
      .filter(function (c) { return state.studentClassPick[c]; })
      .sort(naturalCompare);
  }

  function renderStudentClassChips() {
    var box = $("trStudentClassChips");
    if (!box) return;
    var list = state.studentClasses || [];
    /* 保留仍然存在的已选班级；首次进入时默认选中第一个班级 */
    var keep = {};
    var anyKept = false;
    list.forEach(function (c) {
      if (state.studentClassPick[c]) { keep[c] = true; anyKept = true; }
    });
    if (!anyKept && !state.studentClassInit && list.length) keep[list[0]] = true;
    state.studentClassPick = keep;
    if (list.length) state.studentClassInit = true;
    if (!list.length) {
      box.innerHTML = '<span class="tr-class-empty">暂无班级数据</span>';
      updateStudentClassTip();
      return;
    }
    box.innerHTML = list.map(function (c) {
      var on = !!state.studentClassPick[c];
      return '<label class="tr-class-chip' + (on ? " is-on" : "") + '">' +
        '<input type="checkbox" value="' + esc(c) + '"' + (on ? " checked" : "") + ">" +
        "<span>" + esc(c) + "</span></label>";
    }).join("");
    updateStudentClassTip();
  }

  function updateStudentClassTip() {
    var tip = $("trStudentClassTip");
    if (!tip) return;
    var n = pickedStudentClasses().length;
    tip.textContent = n
      ? "已选 " + n + " 个班级（不勾选 = 全部班级）"
      : "未勾选 = 全部班级";
  }

  function initGradeSubjects() {
    var keys = state.subjects.length ? state.subjects : [TOTAL_KEY];
    var keep = {};
    keys.forEach(function (k) {
      if (state.gradeSubjects[k]) keep[k] = true;
    });
    if (!Object.keys(keep).length) keep[TOTAL_KEY] = true;
    state.gradeSubjects = keep;
  }

  function initStudentSubjects() {
    var keys = state.subjects.length ? state.subjects : [TOTAL_KEY];
    var keep = {};
    keys.forEach(function (k) {
      if (state.studentSubjects[k]) keep[k] = true;
    });
    if (!Object.keys(keep).length) {
      keep[TOTAL_KEY] = true;
    }
    state.studentSubjects = keep;
  }

  function filteredStudents() {
    var q = String(state.studentQuery || "").trim().toLowerCase();
    var picked = pickedStudentClasses();
    var pickedSet = {};
    picked.forEach(function (c) { pickedSet[c] = true; });
    return Object.keys(state.studentIndex)
      .map(function (k) { return state.studentIndex[k]; })
      .filter(function (rec) { return !picked.length || pickedSet[rec.cls]; })
      .filter(function (rec) {
        if (!q) return true;
        return String(rec.name || "").toLowerCase().indexOf(q) >= 0 ||
          String(rec.id || "").toLowerCase().indexOf(q) >= 0;
      })
      .sort(function (a, b) {
        return naturalCompare(a.id || a.name || "", b.id || b.name || "");
      });
  }

  function renderStudentList() {
    var box = $("trStudentList");
    if (!box) return;
    var list = filteredStudents();
    var stillThere = list.some(function (r) { return r.key === state.studentKey; });
    if (!stillThere) {
      state.studentKey = (state.studentAutoPick !== false && list.length) ? list[0].key : "";
    }

    if (!list.length) {
      box.innerHTML = '<span class="tr-student-empty">没有匹配的学生</span>';
      return;
    }
    box.innerHTML = list.map(function (rec) {
      var meta = [rec.cls || "", rec.id || ""].filter(Boolean).join(" ");
      return '<button type="button" class="tr-student' + (rec.key === state.studentKey ? " is-on" : "") +
        '" data-student-key="' + esc(rec.key) + '">' +
        "<span>" + esc(rec.name || "—") + "</span>" +
        (meta ? "<small>" + esc(meta) + "</small>" : "") +
      "</button>";
    }).join("");
  }

  function renderGradeSubjectChips() {
    var box = $("trSubjectChipsGrade");
    if (!box) return;
    var keys = state.subjects.length ? state.subjects : [TOTAL_KEY];
    box.innerHTML = keys.map(function (k) {
      var on = !!state.gradeSubjects[k];
      return '<label class="tr-class-chip' + (on ? " is-on" : "") + '">' +
        '<input type="checkbox" value="' + esc(k) + '"' + (on ? " checked" : "") + ">" +
        "<span>" + esc(subjectName(k)) + "</span></label>";
    }).join("");
    updateSubjectTip();
  }

  function updateSubjectTip() {
    var tip = $("trSubjectTip");
    if (!tip) return;
    var n = selectedSubjects().length;
    tip.textContent = n
      ? "已选 " + n + " 个学科" + (n > 1 ? "（同一班级会按学科分多条曲线）" : "")
      : "请至少勾选一个学科";
  }

  function renderStudentSubjectChips() {
    var box = $("trSubjectChips");
    if (!box) return;
    var keys = state.subjects.length ? state.subjects : [TOTAL_KEY];
    box.innerHTML = keys.map(function (k) {
      var on = !!state.studentSubjects[k];
      return '<label class="tr-class-chip' + (on ? " is-on" : "") + '">' +
        '<input type="checkbox" value="' + esc(k) + '"' + (on ? " checked" : "") + ">" +
        "<span>" + esc(subjectName(k)) + "</span></label>";
    }).join("");
  }

  function buildStudentSeries() {
    var rec = state.studentIndex[state.studentKey];
    var labels = buildLabels();
    var series = [];
    if (!rec) return { labels: labels, series: series };

    var keys = Object.keys(state.studentSubjects).filter(function (k) { return state.studentSubjects[k]; });
    keys.sort(function (a, b) {
      if (a === TOTAL_KEY) return -1;
      if (b === TOTAL_KEY) return 1;
      return state.subjects.indexOf(a) - state.subjects.indexOf(b);
    });

    keys.forEach(function (key) {
      var idx = Math.max(0, state.subjects.indexOf(key));
      var s = {
        name: subjectName(key),
        color: key === TOTAL_KEY ? SCHOOL_COLOR : SERIES_COLORS[idx % SERIES_COLORS.length],
        values: []
      };
      state.exams.forEach(function (ex) {
        var st = ex.byKey ? ex.byKey[rec.key] : null;
        var raw = !st ? null : (key === TOTAL_KEY ? st.total : st.scores[key]);
        s.values.push(toT(raw, normStatsFor(key, ex)));
      });
      series.push(s);
    });

    return { labels: labels, series: series };
  }

  /* ---------------- 图表 ---------------- */
  function niceStep(raw) {
    var candidates = [1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 500];
    for (var i = 0; i < candidates.length; i++) if (candidates[i] >= raw) return candidates[i];
    return 1000;
  }

  /* 中文考试名在语义处断行：优先在「学期 / 期中 / 期末 / 月考 …」后断开 */
  var LABEL_BREAK_AFTER = ["下学期", "上学期", "学期", "期中", "期末", "月考", "开学考", "调研考", "统考", "联考", "学考", "模拟考", "考试", "检测", "质量", "监测", "·", "-", "（", "(", "、", " "];
  var LABEL_BREAK_BEFORE = ["期中", "期末", "月考", "统考", "联考", "模拟考", "开学考", "调研考", "学考"];

  function splitPoints(s) {
    var pts = {};
    LABEL_BREAK_AFTER.forEach(function (tok) {
      var i = s.indexOf(tok);
      while (i >= 0) {
        var p = i + tok.length;
        if (p > 0 && p < s.length) pts[p] = true;
        i = s.indexOf(tok, i + 1);
      }
    });
    LABEL_BREAK_BEFORE.forEach(function (tok) {
      var i = s.indexOf(tok);
      while (i >= 0) {
        if (i > 0 && i < s.length) pts[i] = true;
        i = s.indexOf(tok, i + 1);
      }
    });
    return Object.keys(pts).map(Number).sort(function (a, b) { return a - b; });
  }

  function wrapLabel(label, per, maxLines) {
    var s = String(label || "");
    var limit = Math.max(1, maxLines || 4);
    if (s.length <= per) return s ? [s] : [""];
    var pts = splitPoints(s);
    var lines = [];
    var start = 0;
    while (start < s.length) {
      var remain = s.length - start;
      if (remain <= per) { lines.push(s.slice(start)); break; }
      var hard = start + per;
      var best = -1;
      /* 允许略微超出 2 个字，避免把「学期」这类词从中间劈开 */
      var soft = Math.min(s.length, hard + 2);
      for (var i = 0; i < pts.length; i++) {
        if (pts[i] > start && pts[i] <= soft && pts[i] > best) best = pts[i];
      }
      if (best <= start) best = hard;
      lines.push(s.slice(start, best));
      start = best;
    }
    if (!lines.length) lines = [""];
    if (lines.length > limit) {
      var kept = lines.slice(0, limit);
      /* 最后一行把剩余内容合并，超长才截断 */
      var rest = lines.slice(limit - 1).join("");
      kept[limit - 1] = rest.length > per ? rest.slice(0, Math.max(1, per - 1)) + "…" : rest;
      lines = kept;
    }
    return lines;
  }

  function renderChart(labels, series, emptyTip) {
    var box = $("trChart");
    if (!box) return;

    var values = [];
    series.forEach(function (s) {
      s.values.forEach(function (v) { if (v !== null && isFinite(v)) values.push(v); });
    });
    if (!labels.length || !values.length) {
      box.innerHTML = '<div class="tr-empty">' +
        (emptyTip || "没有可绘制的数据：请确认该年级已上传成绩，并选择学科与班级。") + "</div>";
      return;
    }

    var W = 1240;
    var marginTop = 26;
    var plotH = 330;
    var LABEL_FONT = 11;
    var minLeft = 74, minRight = 36;
    var marginLeft = minLeft, marginRight = minRight;
    var per, linesList, maxLines, maxHalf;
    /* 迭代两次：先按可用宽度定每行字数，再把左右留白撑到能放下最宽的那行标签 */
    for (var pass = 0; pass < 2; pass++) {
      var plotW0 = W - marginLeft - marginRight;
      per = Math.max(4, Math.min(14, Math.floor(plotW0 / Math.max(1, labels.length) / LABEL_FONT)));
      linesList = labels.map(function (lb) { return wrapLabel(lb, per, 4); });
      maxLines = 1;
      maxHalf = 0;
      linesList.forEach(function (l) {
        if (l.length > maxLines) maxLines = l.length;
        l.forEach(function (line) {
          var half = String(line).length * LABEL_FONT / 2;
          if (half > maxHalf) maxHalf = half;
        });
      });
      marginLeft = Math.max(minLeft, Math.min(maxHalf + 10, W / 3));
      marginRight = Math.max(minRight, Math.min(maxHalf + 10, W / 3));
    }
    var plotW = W - marginLeft - marginRight;
    var marginBottom = 22 + maxLines * 15;
    var H = marginTop + plotH + marginBottom;
    var M = { l: marginLeft, r: marginRight, t: marginTop, b: marginBottom };

    var vMin = Math.min.apply(null, values.concat([500]));
    var vMax = Math.max.apply(null, values.concat([500]));
    var span = vMax - vMin;
    if (span < 8) {
      var mid = (vMax + vMin) / 2;
      vMin = mid - 4;
      vMax = mid + 4;
      span = 8;
    }
    var pad = Math.max(4, span * 0.18);
    var step = niceStep((span + pad * 2) / 6);
    var lo = Math.floor((vMin - pad) / step) * step;
    var hi = Math.ceil((vMax + pad) / step) * step;

    function X(i) {
      return labels.length === 1 ? M.l + plotW / 2 : M.l + plotW * i / (labels.length - 1);
    }
    function Y(v) {
      return M.t + plotH * (hi - v) / (hi - lo);
    }

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="标准分平均分变化趋势图">';

    /* Y 轴网格与刻度 */
    for (var t = lo; t <= hi + 1e-6; t += step) {
      var gy = Y(t);
      svg += '<line x1="' + M.l + '" y1="' + gy.toFixed(1) + '" x2="' + (W - M.r) + '" y2="' + gy.toFixed(1) + '" stroke="#eef1f5" stroke-width="1"/>';
      svg += '<text x="' + (M.l - 12) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="11.5" fill="#94a3b8">' + Number(t).toFixed(0) + '</text>';
    }

    /* 500 基准线 */
    if (lo < 500 && hi > 500) {
      var y500 = Y(500);
      svg += '<line x1="' + M.l + '" y1="' + y500.toFixed(1) + '" x2="' + (W - M.r) + '" y2="' + y500.toFixed(1) + '" stroke="#c4cee0" stroke-width="1" stroke-dasharray="6 5"/>';
      svg += '<text x="' + (W - M.r - 2) + '" y="' + (y500 - 6).toFixed(1) + '" text-anchor="end" font-size="11" fill="#b0bacb">均值 500</text>';
    }

    /* Y 轴标题 */
    svg += '<text transform="translate(22,' + (M.t + plotH / 2) + ') rotate(-90)" text-anchor="middle" font-size="12" fill="#78859a">标准分平均分</text>';

    /* X 轴考试名称（语义断行，最多 4 行，自适应底部留白） */
    labels.forEach(function (lb, i) {
      var lines = linesList[i];
      var x = X(i);
      lines.forEach(function (line, k) {
        svg += '<text x="' + x.toFixed(1) + '" y="' + (M.t + plotH + 20 + k * 15) + '" text-anchor="middle" font-size="' + LABEL_FONT + '" fill="#64748b">' + esc(line) + '</text>';
      });
    });

    /* 折线 + 数据点 */
    var showLabels = series.length <= 4 && labels.length * series.length <= 60;
    series.forEach(function (s) {
      var segments = [];
      var current = [];
      s.values.forEach(function (v, i) {
        if (v === null || !isFinite(v)) {
          if (current.length) { segments.push(current); current = []; }
          return;
        }
        current.push([X(i), Y(v)]);
      });
      if (current.length) segments.push(current);

      segments.forEach(function (seg) {
        if (seg.length < 2) return;
        var d = seg.map(function (p, k) {
          return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
        }).join(" ");
        svg += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.isSchool ? 2.2 : 1.8) + '" stroke-linejoin="round" stroke-linecap="round" opacity="0.92"/>';
      });

      s.values.forEach(function (v, i) {
        if (v === null || !isFinite(v)) return;
        var cx = X(i), cy = Y(v);
        svg += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (s.isSchool ? 3.6 : 3.2) + '" fill="' + s.color + '">' +
          '<title>' + esc(s.name + " · " + (labels[i] || "") + "：" + fmt1(v)) + '</title></circle>';
        if (showLabels) {
          svg += '<text x="' + cx.toFixed(1) + '" y="' + (cy - 9).toFixed(1) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + s.color + '">' + fmt1(v) + '</text>';
        }
      });
    });

    svg += "</svg>";
    box.innerHTML = svg;
  }

  function renderLegend(series) {
    var box = $("trLegend");
    if (!box) return;
    box.innerHTML = series.map(function (s) {
      return '<span class="tr-legend-item' + (s.isSchool ? " is-school" : "") + '">' +
        '<i class="tr-legend-dot" style="background:' + s.color + '"></i>' + esc(s.name) +
        "</span>";
    }).join("");
  }

  /* ---------------- 渲染 ---------------- */
  function subjectName(key) {
    if (key === TOTAL_KEY) return TOTAL_LABEL;
    return key;
  }

  function render() {
    var built;
    var sub = $("trChartSub");
    var title = $("trChartTitle");
    var normText = state.norm === "exam" ? "每场各自标准化" : "首场考试固定常模";

    if (state.mode === "student") {
      renderStudentList();
      renderStudentSubjectChips();
      built = buildStudentSeries();
      var rec = state.studentIndex[state.studentKey];
      renderLegend(built.series);
      renderChart(built.labels, built.series, rec ? "" : "请先在右侧选择一个学生（再次点击已选学生可取消选择）。");
      if (title) title.textContent = "学生各学科标准分变化趋势";
      if (sub) {
        sub.textContent = rec
          ? (state.gradeName ? state.gradeName + " · " : "") + "学生：" + rec.name + "（" + (rec.cls || "—") + (rec.id ? " · " + rec.id : "") + "） · 共 " +
            built.labels.length + " 场考试 · " + normText
          : "请先勾选班级，再选择一个学生";
      }
    } else {
      renderGradeSubjectChips();
      built = buildSeries();
      renderLegend(built.series);
      renderChart(built.labels, built.series);
      if (title) title.textContent = "标准分平均分变化趋势";
      if (sub) {
        var subjNames = selectedSubjects().map(subjectName);
        var subjText = !subjNames.length ? "未选学科"
          : (subjNames.length > 3
            ? subjNames.slice(0, 3).join("、") + " 等 " + subjNames.length + " 科"
            : subjNames.join("、"));
        sub.textContent = (state.gradeName || "—") + " · " + subjText +
          " · 共 " + built.labels.length + " 场考试 · " + normText;
      }
    }
  }

  /* 分段选择器：滑块跟随当前选项 */
  function updateModeThumb() {
    var wrap = $("trModeSwitch");
    if (!wrap) return;
    var thumb = wrap.querySelector(".tr-mode-thumb");
    var active = wrap.querySelector(".tr-mode-btn.active");
    if (!thumb || !active) return;
    var pad = 4;
    thumb.style.width = active.offsetWidth + "px";
    thumb.style.transform = "translateX(" + Math.max(0, active.offsetLeft - pad) + "px)";
  }

  function setMode(mode) {
    state.mode = mode === "student" ? "student" : "grade";
    var gradeOnly = state.mode === "grade";
    [
      ["trClassGroupGrade", gradeOnly],
      ["trSubjectGroupGrade", gradeOnly],
      ["trClassGroupStudent", !gradeOnly],
      ["trSubjectGroupStudent", !gradeOnly],
      ["trStudentPickCard", !gradeOnly]
    ].forEach(function (pair) {
      var el = $(pair[0]);
      if (el) el.hidden = !pair[1];
    });
    var btns = document.querySelectorAll("#trModeSwitch [data-mode]");
    Array.prototype.forEach.call(btns, function (b) {
      b.classList.toggle("active", b.getAttribute("data-mode") === state.mode);
    });
    updateModeThumb();
    render();
  }

  /* ---------------- 导出图片 ---------------- */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function downloadChartImage() {
    var svg = document.querySelector("#trChart svg");
    if (!svg) { UI.toast("暂无可下载的图表", "error"); return; }

    var vb = svg.viewBox && svg.viewBox.baseVal;
    var width = vb && vb.width ? vb.width : 1240;
    var height = vb && vb.height ? vb.height : 470;
    var titleEl = $("trChartTitle");
    var subEl = $("trChartSub");
    var title = (titleEl && titleEl.textContent) || "趋势分析";
    var subtitle = (subEl && subEl.textContent) || "";

    var clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", width);
    clone.setAttribute("height", height);
    clone.setAttribute("font-family", "'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif");
    var bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", width);
    bg.setAttribute("height", height);
    bg.setAttribute("fill", "#ffffff");
    clone.insertBefore(bg, clone.firstChild);

    var source = new XMLSerializer().serializeToString(clone);
    var url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
    var img = new Image();

    img.onload = function () {
      var scale = 2;
      var headH = 68;
      var canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round((height + headH) * scale);
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);

      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#1b2454";
      ctx.font = "700 17px 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif";
      ctx.fillText(title, 24, 32);
      if (subtitle) {
        ctx.fillStyle = "#78859a";
        ctx.font = "400 12.5px 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif";
        ctx.fillText(subtitle, 24, 54);
      }
      ctx.drawImage(img, 0, headH, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(function (blob) {
        if (!blob) { UI.toast("导出图片失败", "error"); return; }
        var now = new Date();
        var stamp = "" + now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate());
        /* 文件名带上届别 + 分析对象 + 学科，便于导出后仍能看出内容 */
        var subjNames = selectedSubjects().map(subjectName);
        var subjText = !subjNames.length ? "全部学科"
          : (subjNames.length > 2 ? subjNames.slice(0, 2).join("") + "等" + subjNames.length + "科" : subjNames.join(""));
        var rec = state.studentIndex[state.studentKey];
        var who = state.mode === "student"
          ? "学生_" + ((rec && rec.name) || "未选")
          : "年级_" + subjText;
        var nameBase = "趋势分析_" + (state.gradeName || "本次届别") + "_" + who;
        var safeTitle = String(nameBase).replace(/[\\/:*?"<>|\s·]+/g, "_");
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = safeTitle + "_" + stamp + ".png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 1500);
        UI.toast("图片已导出", "success");
      }, "image/png");
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);
      UI.toast("导出图片失败", "error");
    };

    img.src = url;
  }

  /* ---------------- 班级勾选 ---------------- */
  function renderClassList() {
    var box = $("trClassList");
    if (!box) return;
    if (!state.classNames.length) {
      box.innerHTML = '<span class="tr-class-empty">该年级暂无班级数据</span>';
      updateClassTip();
      return;
    }
    box.innerHTML = state.classNames.map(function (c) {
      var on = !!state.selected[c];
      return '<label class="tr-class-chip' + (on ? " is-on" : "") + '">' +
        '<input type="checkbox" value="' + esc(c) + '"' + (on ? " checked" : "") + '>' +
        "<span>" + esc(c) + "</span></label>";
    }).join("");
    updateClassTip();
  }

  function updateClassTip() {
    var tip = $("trClassTip");
    if (!tip) return;
    var n = selectedClasses().length;
    tip.textContent = n ? "已选 " + n + " 个班级（与全级平均对比）" : "默认只显示全级平均，勾选班级后可对比";
  }

  /* ---------------- 下拉框 ---------------- */
  function fillGradeSelect() {
    var sel = $("trGrade");
    if (!sel) return;
    if (!state.grades.length) {
      sel.innerHTML = '<option value="">（云端还没有年级）</option>';
      return;
    }
    sel.innerHTML = state.grades.map(function (g) {
      return '<option value="' + esc(g.id) + '">' + esc(g.name) + "</option>";
    }).join("");
    if (state.gradeId) sel.value = state.gradeId;
  }

  /* ---------------- 数据加载 ---------------- */
  function mergeSubjectList() {
    var list = [TOTAL_KEY];
    state.exams.forEach(function (ex) {
      (ex.subjects || []).forEach(function (s) {
        if (list.indexOf(s) < 0) list.push(s);
      });
    });
    return list;
  }

  function mergeClassNames() {
    var seen = {};
    state.exams.forEach(function (ex) {
      ex.students.forEach(function (s) {
        if (s.cls) seen[s.cls] = true;
      });
    });
    return Object.keys(seen).sort(naturalCompare);
  }

  async function loadExams() {
    if (!state.gradeId || state.loading) return;
    state.loading = true;
    UI.busy(true, "正在读取该年级的考试数据…");
    alertBox("");
    try {
      var list = sortExamsAsc(await STORE.listExams(state.gradeId));
      var exams = [];
      for (var i = 0; i < list.length; i++) {
        var ex = list[i];
        try {
          var data = await STORE.getExamRows(ex.id);
          var parsed = parseRows(data.header, data.rows);
          if (!parsed.students.length) continue;
          var examObj = {
            id: ex.id,
            name: ex.name,
            exam_date: ex.exam_date,
            created_at: ex.created_at,
            subjects: parsed.subjects,
            students: parsed.students,
            stats: buildExamStats(parsed.students, parsed.subjects),
            byKey: {}
          };
          parsed.students.forEach(function (st) {
            examObj.byKey[studentKeyOf(st)] = st;
          });
          exams.push(examObj);
        } catch (e) {
          /* 该场考试没有成绩数据，跳过 */
        }
      }
      state.exams = exams;
      state.subjects = mergeSubjectList();
      state.classNames = mergeClassNames();
      state.firstNorms = buildFirstNorms();

      /* 学生索引（跨考试按学号/姓名匹配） */
      refreshStudentIndex();
      renderStudentClassChips();
      initStudentSubjects();
      renderStudentList();
      renderStudentSubjectChips();

      /* 保留仍然存在的已选班级 */
      var keep = {};
      state.classNames.forEach(function (c) { if (state.selected[c]) keep[c] = true; });
      state.selected = keep;

      initGradeSubjects();
      renderClassList();

      if (!exams.length) {
        alertBox("该年级还没有上传过考试成绩：请先在 <a href='../../admin/admin.html'>管理员入口</a> 上传成绩。", "warn");
      }
      render();
    } catch (err) {
      state.exams = [];
      state.subjects = [TOTAL_KEY];
      state.classNames = [];
      state.selected = {};
      state.studentIndex = {};
      state.studentClasses = [];
      state.studentClassPick = {};
      state.studentClassInit = false;
      state.studentKey = "";
      state.gradeSubjects = {};
      renderStudentClassChips();
      initStudentSubjects();
      renderClassList();
      renderStudentList();
      renderStudentSubjectChips();
      render();
      alertBox("读取考试数据失败：" + esc(err.message) + "。请检查云端连接设置。", "error");
    } finally {
      state.loading = false;
      UI.busy(false);
    }
  }

  async function loadGrades() {
    try {
      if (window.JZCloud && window.JZCloud.ready) { try { await window.JZCloud.ready(); } catch (e) { /* ignore */ } }
      if (!STORE || !STORE.isReady()) {
        alertBox("还没有连接云端数据：请打开 <a href='../../admin/admin.html'>管理员入口 → 连接设置</a> 填写 Supabase 地址与 anon key。", "warn");
        fillGradeSelect();
        renderClassList();
        render();
        return;
      }
      state.grades = await STORE.listGrades();
      var saved = "";
      try { saved = localStorage.getItem(GRADE_KEY) || ""; } catch (e) { saved = ""; }
      if (!saved) {
        /* 本页没选过时，沿用其他系统上次用的年级，减少重复选择 */
        try { saved = (window.JZUI && window.JZUI.lastGradeId && window.JZUI.lastGradeId()) || ""; } catch (e) { saved = ""; }
      }
      var pick = state.grades.filter(function (g) { return g.id === saved; })[0] ||
        state.grades[0] || null;
      state.gradeId = pick ? pick.id : "";
      state.gradeName = pick ? pick.name : "";
      fillGradeSelect();
      await loadExams();
    } catch (err) {
      alertBox("读取年级失败：" + esc(err.message), "error");
    }
  }

  /* ---------------- 事件 ---------------- */
  function bind() {
    var modeSwitch = $("trModeSwitch");
    if (modeSwitch) {
      modeSwitch.addEventListener("click", function (e) {
        var btn = e.target.closest ? e.target.closest("[data-mode]") : null;
        if (!btn) return;
        setMode(btn.getAttribute("data-mode"));
      });
    }

    var gradeSel = $("trGrade");
    if (gradeSel) {
      gradeSel.addEventListener("change", function () {
        var g = state.grades.filter(function (x) { return x.id === gradeSel.value; })[0] || null;
        state.gradeId = g ? g.id : "";
        state.gradeName = g ? g.name : "";
        state.gradeSubjects = {};
        state.selected = {};
        state.studentKey = "";
        state.studentClassPick = {};
        state.studentClassInit = false;
        state.studentQuery = "";
        state.studentSubjects = {};
        state.studentAutoPick = true;
        var sSearch = $("trStudentSearch");
        if (sSearch) sSearch.value = "";
        try { localStorage.setItem(GRADE_KEY, state.gradeId); } catch (e) { /* ignore */ }
        loadExams();
      });
    }

    var subjectChipsGrade = $("trSubjectChipsGrade");
    if (subjectChipsGrade) {
      subjectChipsGrade.addEventListener("change", function (e) {
        var input = e.target.closest ? e.target.closest('input[type="checkbox"]') : null;
        if (!input) return;
        state.gradeSubjects[input.value] = input.checked;
        var chip = input.closest(".tr-class-chip");
        if (chip) chip.classList.toggle("is-on", input.checked);
        updateSubjectTip();
        render();
      });
    }

    var subjectAllBtn = $("trSubjectAll");
    if (subjectAllBtn) {
      subjectAllBtn.addEventListener("click", function () {
        var keys = state.subjects.length ? state.subjects : [TOTAL_KEY];
        state.gradeSubjects = {};
        keys.forEach(function (k) { state.gradeSubjects[k] = true; });
        render();
      });
    }

    var subjectClearBtn = $("trSubjectClear");
    if (subjectClearBtn) {
      subjectClearBtn.addEventListener("click", function () {
        state.gradeSubjects = {};
        render();
      });
    }

    var normSel = $("trNorm");
    if (normSel) {
      normSel.addEventListener("change", function () {
        state.norm = normSel.value === "exam" ? "exam" : "first";
        render();
      });
    }

    var classBox = $("trClassList");
    if (classBox) {
      classBox.addEventListener("change", function (e) {
        var input = e.target.closest ? e.target.closest('input[type="checkbox"]') : null;
        if (!input) return;
        var c = input.value;
        state.selected[c] = input.checked;
        var chip = input.closest(".tr-class-chip");
        if (chip) chip.classList.toggle("is-on", input.checked);
        updateClassTip();
        render();
      });
    }

    var studentClassChips = $("trStudentClassChips");
    if (studentClassChips) {
      studentClassChips.addEventListener("change", function (e) {
        var input = e.target.closest ? e.target.closest('input[type="checkbox"]') : null;
        if (!input) return;
        state.studentClassPick[input.value] = input.checked;
        var chip = input.closest(".tr-class-chip");
        if (chip) chip.classList.toggle("is-on", input.checked);
        updateStudentClassTip();
        state.studentKey = "";
        state.studentAutoPick = true;
        renderStudentList();
        render();
      });
    }

    var studentClassAll = $("trStudentClassAll");
    if (studentClassAll) {
      studentClassAll.addEventListener("click", function () {
        state.studentClassPick = {};
        state.studentClasses.forEach(function (c) { state.studentClassPick[c] = true; });
        state.studentKey = "";
        state.studentAutoPick = true;
        renderStudentClassChips();
        renderStudentList();
        render();
      });
    }

    var studentClassNone = $("trStudentClassNone");
    if (studentClassNone) {
      studentClassNone.addEventListener("click", function () {
        state.studentClassPick = {};
        state.studentKey = "";
        state.studentAutoPick = true;
        renderStudentClassChips();
        renderStudentList();
        render();
      });
    }

    var studentSearch = $("trStudentSearch");
    if (studentSearch) {
      var searchTimer = null;
      studentSearch.addEventListener("input", function () {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          state.studentQuery = studentSearch.value.trim();
          state.studentKey = "";
          state.studentAutoPick = true;
          renderStudentList();
          render();
        }, 160);
      });
    }

    var studentList = $("trStudentList");
    if (studentList) {
      studentList.addEventListener("click", function (e) {
        var btn = e.target.closest ? e.target.closest("[data-student-key]") : null;
        if (!btn) return;
        var key = btn.getAttribute("data-student-key");
        /* 再次点击已选学生 = 取消选择 */
        state.studentKey = state.studentKey === key ? "" : key;
        state.studentAutoPick = false;
        renderStudentList();
        render();
      });
    }

    var subjectChips = $("trSubjectChips");
    if (subjectChips) {
      subjectChips.addEventListener("change", function (e) {
        var input = e.target.closest ? e.target.closest('input[type="checkbox"]') : null;
        if (!input) return;
        state.studentSubjects[input.value] = input.checked;
        var chip = input.closest(".tr-class-chip");
        if (chip) chip.classList.toggle("is-on", input.checked);
        render();
      });
    }

    var allBtn = $("trSelectAll");
    if (allBtn) {
      allBtn.addEventListener("click", function () {
        state.classNames.forEach(function (c) { state.selected[c] = true; });
        renderClassList();
        render();
      });
    }

    var clearBtn = $("trClearClasses");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        state.selected = {};
        renderClassList();
        render();
      });
    }

    var reloadBtn = $("trReload");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", function () { loadExams(); });
    }

    var downloadBtn = $("trDownloadImage");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", downloadChartImage);
    }
  }

  function init() {
    try { UI.mountNav({ base: "../../", page: "trend" }); } catch (e) { /* 导航失败不影响分析 */ }
    bind();
    var normSel = $("trNorm");
    if (normSel) state.norm = normSel.value === "exam" ? "exam" : "first";
    initGradeSubjects();
    renderStudentClassChips();
    renderClassList();
    updateModeThumb();
    window.addEventListener("resize", updateModeThumb);
    loadGrades();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
