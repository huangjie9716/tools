"use strict";

/* =========================================================
   渲染：基础分析
   ========================================================= */
/* 优弱势：只有选了具体班级才允许导出图片 */
function updateWeakExportButton(){
  const btn = $("#exportWeakImage");
  if (!btn) return;
  btn.hidden = !state.weakScope || state.weakScope === "all";
}

function selectedMetric(){
  return METRICS.find(m => m.key === state.metric) || METRICS[0];
}

function datasetForCurrent(){
  return { students: state.students, subjects: state.subjects, classes: state.classes, fileName: state.fileName };
}

function datasetTotalFull(dataset){
  return dataset.subjects.reduce((sum, sub) => sum + getFull(sub.name), 0);
}

function metricValue(stat, metric){
  if (!stat || !stat.n) return null;
  switch (metric.key) {
    case "mean": return stat.mean;
    case "excellentRate": return stat.excellentRate;
    case "passRate": return stat.passRate;
    case "lowRate": return stat.lowRate;
    case "lowCount": return stat.lowCount;
    case "top27Rate": return stat.top27Rate;
    case "top27Count": return stat.top27Count;
    case "bottom27Rate": return stat.bottom27Rate;
    case "bottom27Count": return stat.bottom27Count;
    default: return null;
  }
}

function metricCell(st, metric){
  if (!st || !st.n) return '<span class="muted">—</span>';
  if (metric.key === "mean") {
    return st.mean === null ? '<span class="muted">—</span>' : '<span class="num-strong">' + st.mean.toFixed(2) + '</span>';
  }
  if (metric.key === "excellentRate") return rateCell(st.excellentRate, "excellent");
  if (metric.key === "passRate") return rateCell(st.passRate, "pass");
  if (metric.key === "lowRate") return rateCell(st.lowRate, "low");
  if (metric.key === "top27Rate") return rateCell(st.top27Rate, "pass");
  if (metric.key === "bottom27Rate") return rateCell(st.bottom27Rate, "low");
  if (metric.key === "lowCount") return String(st.lowCount);
  if (metric.key === "top27Count") return String(st.top27Count);
  if (metric.key === "bottom27Count") return String(st.bottom27Count);
  return "—";
}

function metricExportValue(st, metric){
  if (!st || !st.n) return "";
  if (metric.key === "mean") return st.mean === null ? "" : st.mean.toFixed(2);
  if (metric.key === "excellentRate") return st.excellentRate === null ? "" : pctText(st.excellentRate);
  if (metric.key === "passRate") return st.passRate === null ? "" : pctText(st.passRate);
  if (metric.key === "lowRate") return st.lowRate === null ? "" : pctText(st.lowRate);
  if (metric.key === "top27Rate") return st.top27Rate === null ? "" : pctText(st.top27Rate);
  if (metric.key === "bottom27Rate") return st.bottom27Rate === null ? "" : pctText(st.bottom27Rate);
  if (metric.key === "lowCount") return String(st.lowCount);
  if (metric.key === "top27Count") return String(st.top27Count);
  if (metric.key === "bottom27Count") return String(st.bottom27Count);
  return "";
}

function gradeThresholds(values){
  const valid = [];
  for (const v of values) if (isValidScore(v)) valid.push(Number(v));
  const n = valid.length;
  if (!n) return { top:null, bottom:null };
  const desc = valid.slice().sort((a,b) => b - a);
  const k = Math.max(1, Math.ceil(n * 0.27));
  const asc = desc.slice().reverse();
  return { top: desc[k - 1], bottom: asc[k - 1] };
}

function subjectValues(group, sub){
  return sub.key === "__total__"
    ? group.students.map(s => s.total)
    : group.students.map(s => s.scores[sub.name]);
}

function buildBasicAnalysis(dataset, metric){
  const totalFull = datasetTotalFull(dataset);
  const allSubjects = [
    { name:"总分", full:totalFull, key:"__total__" },
    ...dataset.subjects.map(sub => ({ name:sub.name, full:getFull(sub.name), key:sub.name }))
  ];
  const groups = [{ name:"全级", students:dataset.students, isAll:true }].concat(
    dataset.classes.map(cls => ({
      name: cls,
      students: dataset.students.filter(s => s.className === cls),
      isAll: false
    }))
  );

  const stats = new Map();
  for (const group of groups) {
    const groupStats = {};
    for (const sub of allSubjects) {
      groupStats[sub.key] = computeStat(subjectValues(group, sub), sub.full);
    }
    stats.set(group.name, groupStats);
  }

  const thresholds = new Map();
  const schoolGroup = groups[0];
  for (const sub of allSubjects) {
    thresholds.set(sub.key, gradeThresholds(subjectValues(schoolGroup, sub)));
  }

  for (const group of groups) {
    const groupStats = stats.get(group.name);
    const denom = group.students.length;
    for (const sub of allSubjects) {
      const st = groupStats[sub.key];
      const valid = [];
      for (const v of subjectValues(group, sub)) if (isValidScore(v)) valid.push(Number(v));
      const threshold = thresholds.get(sub.key);
      st.top27Count = (valid.length && threshold.top !== null)
        ? valid.filter(v => v >= threshold.top).length
        : 0;
      st.bottom27Count = (valid.length && threshold.bottom !== null)
        ? valid.filter(v => v <= threshold.bottom).length
        : 0;
      st.top27Rate = (valid.length && threshold.top !== null && denom > 0)
        ? st.top27Count / denom
        : null;
      st.bottom27Rate = (valid.length && threshold.bottom !== null && denom > 0)
        ? st.bottom27Count / denom
        : null;
    }
  }

  const ranks = new Map();
  if (!metric.noRank) {
    for (const sub of allSubjects) {
      const entries = [];
      for (const group of groups) {
        if (group.isAll) continue;
        const value = metricValue(stats.get(group.name)[sub.key], metric);
        if (value !== null && Number.isFinite(value)) entries.push({ group, value });
      }
      entries.sort((a,b) => metric.higherIsBetter ? b.value - a.value : a.value - b.value);
      let rank = 0;
      let prev = null;
      const map = new Map();
      entries.forEach((entry, index) => {
        if (prev === null || Math.abs(entry.value - prev) > 1e-9) rank = index + 1;
        map.set(entry.group.name, rank);
        prev = entry.value;
      });
      ranks.set(sub.key, map);
    }
  }

  return { metric, allSubjects, groups, stats, ranks };
}

function formatChangeValue(v){
  return String(Math.round(Number(v)));
}

function rankChangeHtml(curRank, refRank){
  if (curRank === null || curRank === undefined || refRank === null || refRank === undefined) {
    return '<span class="muted">—</span>';
  }
  const diff = refRank - curRank;
  if (Math.abs(diff) < 1e-9) return '<span class="change flat">持平</span>';
  return diff > 0
    ? '<span class="change up">↑' + formatChangeValue(Math.abs(diff)) + '</span>'
    : '<span class="change down">↓' + formatChangeValue(Math.abs(diff)) + '</span>';
}

function countChangeHtml(curValue, refValue, metric){
  if (curValue === null || curValue === undefined || refValue === null || refValue === undefined) {
    return '<span class="muted">—</span>';
  }
  const diff = curValue - refValue;
  if (Math.abs(diff) < 1e-9) return '<span class="change flat">0</span>';
  const positiveGood = metric.key === "top27Count";
  const cls = diff > 0 ? (positiveGood ? "up" : "down") : (positiveGood ? "down" : "up");
  return '<span class="change ' + cls + '">' + (diff > 0 ? "+" : "") + diff + '</span>';
}

function updateReferenceUi(){
  const globalChip = $("#globalRefChip");
  const globalLabel = $("#globalRefLabel");
  const globalName = $("#globalRefName");
  const globalPick = $("#globalRefPickBtn");
  const globalClear = $("#globalRefClearBtn");
  if (globalChip) {
    globalChip.classList.toggle("has-ref", !!state.reference);
    if (globalLabel) globalLabel.textContent = "比对考试";
    if (globalName) {
      globalName.hidden = false;
      const label = state.reference ? (state.reference.fileName || "参考成绩") : "未选择";
      const parts = String(label).split(" · ");
      if (state.reference && parts.length > 1 && /(20\d{2})\s*届/.test(parts[0])) {
        globalName.innerHTML = '<span class="jz-ref-grade">' + escapeHtml(parts[0]) + '</span>' +
          '<span class="jz-ref-sep">·</span>' +
          '<span class="jz-ref-text">' + escapeHtml(parts.slice(1).join(" · ")) + '</span>';
      } else {
        globalName.textContent = label;
      }
      globalName.title = state.reference
        ? (state.reference.fileName || "")
        : "选择一场考试作为比对，基础分析、班级画像、前 N 名分析共用";
    }
    if (globalPick) globalPick.textContent = state.reference ? "选择其他考试" : "＋ 选择比对考试";
    if (globalClear) globalClear.hidden = !state.reference;
  }
  const noteLine = $("#refNoteLine");
  if (noteLine) {
    if (state.reference) {
      noteLine.hidden = false;
      const text = $("#refNoteText");
      if (text) text.textContent = state.reference.fileName + "（" + state.reference.students.length + " 人）";
    } else {
      noteLine.hidden = true;
    }
  }
  const profileRefLine = $("#profileRefLine");
  if (profileRefLine) {
    if (state.reference) {
      profileRefLine.hidden = false;
      const text = $("#profileRefText");
      if (text) text.textContent = state.reference.fileName + "（" + state.reference.students.length + " 人）";
    } else {
      profileRefLine.hidden = true;
    }
  }
}

/* 把已经构建好的比对数据集应用到界面 */
function applyReferenceDataset(dataset, label){
  dataset.fileName = label || dataset.fileName || "";
  state.reference = dataset;
  updateReferenceUi();
  if (state.students && state.students.length) {
    renderBasic();
    renderTopN();
    renderProfile();
  }
  return dataset;
}

function rankBadgeClass(rank){
  if (rank === null || rank === undefined) return "";
  const slot = Math.floor(Number(rank));
  if (slot === 1) return "gold";
  if (slot === 2) return "silver";
  if (slot === 3) return "bronze";
  if (slot === 4) return "top4";
  if (slot === 5) return "top5";
  return "";
}

function rankBadgeHtml(rank, title){
  if (rank === null || rank === undefined) {
    return '<span class="muted" title="' + escapeHtml(title || "暂无有效成绩") + '">—</span>';
  }
  return '<span class="rank-badge ' + rankBadgeClass(rank) + '">' + escapeHtml(formatRank(rank)) + '</span>';
}

function renderBasicClassMode(data, refData, metric, showRank, showChange){
  const head = $("#basicHead");
  const body = $("#basicBody");
  const columnsPerSubject = (showRank ? 2 : 1) + (showChange ? 1 : 0);
  let h1 = '<tr>' +
    '<th rowspan="2" class="sticky-col col-name">班级</th>' +
    '<th rowspan="2" class="sticky-col col-head">班主任</th>' +
    '<th rowspan="2" class="sticky-col col-count">参考人数</th>';
  for (const sub of data.allSubjects) {
    h1 += '<th colspan="' + columnsPerSubject + '" class="group-start ' + (sub.key === "__total__" ? "total-group" : "") + '">' +
      escapeHtml(sub.name) + '<small>满分 ' + escapeHtml(fmtScore(sub.full)) + '</small></th>';
  }
  h1 += '</tr><tr>';
  for (let i = 0; i < data.allSubjects.length; i++) {
    h1 += '<th class="group-start">' + escapeHtml(metric.label) + '</th>';
    if (showRank) h1 += '<th>排名</th>';
    if (showChange) h1 += '<th>变化</th>';
  }
  h1 += '</tr>';
  head.innerHTML = h1;

  body.innerHTML = data.groups.map(group => {
    const groupStats = data.stats.get(group.name);
    const totalStat = groupStats.__total__;
    let html = '<tr class="' + (group.isAll ? "all-row" : "") + '">' +
      '<td class="sticky-col col-name">' + escapeHtml(group.name) + '</td>' +
      '<td class="sticky-col col-head">' + escapeHtml(headTeacherFor(group.name)) + '</td>' +
      '<td class="sticky-col col-count" title="实际参与统分人数">' + totalStat.n + '</td>';

    for (const sub of data.allSubjects) {
      const st = groupStats[sub.key];
      const curRank = group.isAll || !showRank ? null : (data.ranks.get(sub.key) && data.ranks.get(sub.key).get(group.name)) || null;

      html += '<td class="group-start">' + metricCell(st, metric) + '</td>';
      if (showRank) {
        html += '<td>' + rankBadgeHtml(curRank, group.isAll ? "全级为基准，不参与班级排名" : "暂无有效成绩") + '</td>';
      }
      if (showChange) {
        if (showRank) {
          const refRank = (!group.isAll && refData.ranks.get(sub.key)) ? refData.ranks.get(sub.key).get(group.name) : null;
          html += '<td>' + rankChangeHtml(curRank, refRank) + '</td>';
        } else {
          const refStat = refData.stats.get(group.name) ? refData.stats.get(group.name)[sub.key] : null;
          const refValue = refStat ? metricValue(refStat, metric) : null;
          html += '<td>' + countChangeHtml(metricValue(st, metric), refValue, metric) + '</td>';
        }
      }
    }
    return html + '</tr>';
  }).join("");
}

/* 排序第三个选项：
   · 没选比对考试 → 「按与年级{指标}差值」，只对平均分/优秀率/合格率/低分率开放
   · 选了比对考试 → 「按排名进步名次」，只对参与排名的指标开放（人数类指标不排名） */
const SUBJECT_SORT_DIFF_METRICS = ["mean", "excellentRate", "passRate", "lowRate"];

function syncSubjectSortOptions(metric){
  const sel = $("#subjectViewSort");
  if (!sel) return;
  const opt = sel.querySelector('option[value="diff"]');
  if (!opt) return;
  const hasRef = !!state.reference;
  const ok = hasRef ? !metric.noRank : SUBJECT_SORT_DIFF_METRICS.indexOf(metric.key) >= 0;
  opt.hidden = !ok;
  opt.disabled = !ok;
  opt.textContent = hasRef
    ? "按排名进步名次"
    : (ok ? "按与年级" + metric.label + "差值" : "按与年级差值");
  if (!ok && state.subjectViewSort === "diff") {
    state.subjectViewSort = "class";
    sel.value = "class";
  }
}

/* 差值文本：平均分用分差，比率用百分点 */
function metricDiffText(diff, metric){
  if (diff === null || diff === undefined || !Number.isFinite(Number(diff))) return '<span class="muted">—</span>';
  const isRate = /Rate$/.test(metric.key);
  const v = isRate ? Number(diff) * 100 : Number(diff);
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return sign + Math.abs(v).toFixed(2) + (isRate ? "%" : "");
}

function metricDiffPlain(diff, metric){
  const html = metricDiffText(diff, metric);
  return html.replace(/<[^>]+>/g, "");
}

function renderBasicSubjectCards(data, refData, metric, showRank, showChange){
  const grid = $("#basicSubjectGrid");
  if (!grid) return;
  const sub = data.allSubjects.find(item => item.key === state.subjectView) || data.allSubjects[0];
  if (!sub) {
    grid.innerHTML = '<div class="subject-card-empty">暂无可分析学科</div>';
    return;
  }
  const rankMap = data.ranks ? data.ranks.get(sub.key) : null;
  const refRankMap = refData && refData.ranks ? refData.ranks.get(sub.key) : null;
  const schoolValue = metricValue(data.stats.get("全级")[sub.key], metric);
  const classes = data.groups.filter(group => !group.isAll).slice();
  const valueOf = group => metricValue(data.stats.get(group.name)[sub.key], metric);
  const rankOf = group => rankMap ? rankMap.get(group.name) : null;
  const compareNullable = (a, b, higherFirst) => {
    const av = a === null || a === undefined || !Number.isFinite(Number(a));
    const bv = b === null || b === undefined || !Number.isFinite(Number(b));
    if (av && bv) return 0;
    if (av) return 1;
    if (bv) return -1;
    return higherFirst ? Number(b) - Number(a) : Number(a) - Number(b);
  };
  const sortMode = state.subjectViewSort || "class";
  const rankProgressMode = sortMode === "diff" && !!refData;
  /* 排名进步名次：比对考试班级名次 − 本次班级名次，正数表示进步 */
  const progressOf = group => {
    const cur = rankOf(group);
    const ref = refRankMap ? refRankMap.get(group.name) : null;
    if (cur === null || cur === undefined || ref === null || ref === undefined) return null;
    return Number(ref) - Number(cur);
  };
  classes.sort((a, b) => {
    if (sortMode === "class") {
      return String(a.name).localeCompare(String(b.name), "zh-CN", { numeric: true });
    }
    if (sortMode === "rank") return compareNullable(rankOf(a), rankOf(b), false);
    if (rankProgressMode) return compareNullable(progressOf(a), progressOf(b), true);
    const av = valueOf(a);
    const bv = valueOf(b);
    if (sortMode === "diff") {
      const ad = av === null || schoolValue === null ? null : av - schoolValue;
      const bd = bv === null || schoolValue === null ? null : bv - schoolValue;
      return compareNullable(ad, bd, !!metric.higherIsBetter);
    }
    return compareNullable(av, bv, !!metric.higherIsBetter);
  });
  const diffMode = sortMode === "diff";
  const summary = $("#basicSubjectSummary");
  if (summary) {
    summary.hidden = !diffMode;
    if (diffMode) {
      const gradeStat = data.stats.get("全级")[sub.key];
      const refName = state.reference ? (state.reference.fileName || "比对考试") : "";
      const tip = rankProgressMode
        ? "按排名进步名次排序：进步名次＝比对考试班级名次 − 本次班级名次（绿＝进步，橙＝退步）" +
          (refName ? "；比对考试：" + refName : "")
        : "下列为各班该指标与年级指标的差值，按差值排序（绿＝优于年级，橙＝低于年级）";
      summary.innerHTML = '<span class="sds-subject">' + escapeHtml(sub.name) + '</span>' +
        '<span class="sds-metric">年级' + escapeHtml(metric.label) + '</span>' +
        '<b class="sds-value">' + escapeHtml(metricExportValue(gradeStat, metric) || "—") + '</b>' +
        '<span class="sds-tip">' + escapeHtml(tip) + '</span>';
    }
  }
  grid.innerHTML = classes.map(group => {
    const st = data.stats.get(group.name)[sub.key];
    const refSt = refData ? refData.stats.get(group.name)[sub.key] : null;
    const rank = rankMap ? rankMap.get(group.name) : null;
    const refRank = refRankMap ? refRankMap.get(group.name) : null;
    const rawValue = metricValue(st, metric);
    const diff = (rawValue === null || schoolValue === null) ? null : rawValue - schoolValue;
    const good = diff === null ? false : ((diff > 0) === !!metric.higherIsBetter);
    let value;
    if (rankProgressMode) {
      const progress = progressOf(group);
      value = progress === null
        ? '<span class="muted">—</span>'
        : (progress === 0
          ? '<span>持平</span>'
          : '<span class="' + (progress > 0 ? "is-good" : "is-bad") + '">' +
            (progress > 0 ? "+" : "-") + Math.abs(progress) + '</span>');
    } else if (diffMode) {
      value = '<span class="' + (diff === null ? "" : (good ? "is-good" : "is-bad")) + '">' + metricDiffText(diff, metric) + '</span>';
    } else {
      value = metricCell(st, metric);
    }
    let change = "";
    if (rankProgressMode) {
      /* 主数值已经是进步名次，这里只补一行比对考试的名次，避免重复 */
      if (refRank !== null && refRank !== undefined) {
        change = '<span class="muted">比对第' + escapeHtml(formatRank(refRank)) + '名</span>';
      }
    } else if (showChange) {
      change = showRank
        ? rankChangeHtml(rank, refRank)
        : countChangeHtml(metricValue(st, metric), metricValue(refSt, metric), metric);
    }
    const teacher = sub.key === "__total__" || sub.name === "总分"
      ? headTeacherFor(group.name)
      : subjectTeacherFor(group.name, sub.name);
    return '<div class="subject-class-card">' +
      '<div class="scc-head"><b>' + escapeHtml(group.name) + '</b><span title="' + escapeHtml(teacher) + '">' + escapeHtml(teacher) + '</span></div>' +
      '<div class="scc-value' + (diffMode ? " scc-diff" : "") + '">' + value + '</div>' +
      (diffMode ? '<div class="scc-own">本班 ' + escapeHtml(metricExportValue(st, metric) || "—") + '</div>' : '') +
      (showRank ? '<div class="scc-rank"><span class="scc-rank-label">班级名次</span>' + rankBadgeHtml(rank) + '</div>' : '') +
      '<div class="scc-meta">参考 ' + escapeHtml(String(st && st.n ? st.n : 0)) + ' 人</div>' +
      (change ? '<div class="scc-change">' + change + '</div>' : '') +
      '</div>';
  }).join("") || '<div class="subject-card-empty">暂无班级数据</div>';
}

function renderBasicSubjectMode(data, refData, metric, showRank, showChange){
  const head = $("#basicHead");
  const body = $("#basicBody");
  const columnsPerGroup = (showRank ? 2 : 1) + (showChange ? 1 : 0);
  let h1 = '<tr>' +
    '<th rowspan="2" class="sticky-col col-name">学科</th>' +
    '<th rowspan="2" class="sticky-col col-count">参考人数</th>';
  for (const group of data.groups) {
    h1 += '<th colspan="' + columnsPerGroup + '" class="group-start ' + (group.isAll ? "total-group" : "") + '">' +
      escapeHtml(group.name) + '</th>';
  }
  h1 += '</tr><tr>';
  for (let i = 0; i < data.groups.length; i++) {
    h1 += '<th class="group-start">' + escapeHtml(metric.label) + '</th>';
    if (showRank) h1 += '<th>排名</th>';
    if (showChange) h1 += '<th>变化</th>';
  }
  h1 += '</tr>';
  head.innerHTML = h1;

  body.innerHTML = data.allSubjects.map(sub => {
    const schoolStat = data.stats.get("全级")[sub.key];
    let html = '<tr>' +
      '<td class="sticky-col col-name">' + escapeHtml(sub.name) +
        '<span class="tag">满分 ' + escapeHtml(fmtScore(sub.full)) + '</span></td>' +
      '<td class="sticky-col col-count" title="实际参与统分人数">' + schoolStat.n + '</td>';
    for (const group of data.groups) {
      const st = data.stats.get(group.name)[sub.key];
      const curRank = group.isAll || !showRank ? null : (data.ranks.get(sub.key) && data.ranks.get(sub.key).get(group.name)) || null;
      html += '<td class="group-start">' + metricCell(st, metric) + '</td>';
      if (showRank) {
        html += '<td>' + rankBadgeHtml(curRank, group.isAll ? "全级为基准，不参与班级排名" : "暂无有效成绩") + '</td>';
      }
      if (showChange) {
        if (showRank) {
          const refRank = (!group.isAll && refData.ranks.get(sub.key)) ? refData.ranks.get(sub.key).get(group.name) : null;
          html += '<td>' + rankChangeHtml(curRank, refRank) + '</td>';
        } else {
          const refStat = refData.stats.get(group.name) ? refData.stats.get(group.name)[sub.key] : null;
          const refValue = refStat ? metricValue(refStat, metric) : null;
          html += '<td>' + countChangeHtml(metricValue(st, metric), refValue, metric) + '</td>';
        }
      }
    }
    const teacherLabel = sub.key === "__total__" ? "班主任" : "任课教师";
    let teacherRow = '<tr class="teacher-row">' +
      '<td class="sticky-col col-name teacher-label">' + teacherLabel + '</td>' +
      '<td class="sticky-col col-count"></td>';
    for (const group of data.groups) {
      const teacher = group.isAll
        ? "—"
        : (sub.key === "__total__" ? headTeacherFor(group.name) : subjectTeacherFor(group.name, sub.name));
      teacherRow += '<td colspan="' + columnsPerGroup + '" class="group-start teacher-cell">' +
        escapeHtml(teacher) + '</td>';
    }
    teacherRow += '</tr>';
    return html + '</tr>' + teacherRow;
  }).join("");
}

function renderBasicRoster(metric, data){  const roster = $("#basicRoster");
  if (!roster) return;
  const keys = ["lowCount", "top27Count", "bottom27Count"];
  if (!keys.includes(metric.key) || !data.groups.length) {
    roster.hidden = true;
    return;
  }
  roster.hidden = false;

  const sel = $("#basicRosterSubject");
  if (!data.allSubjects.some(s => s.key === state.rosterSubject)) {
    state.rosterSubject = "__total__";
  }
  sel.innerHTML = data.allSubjects.map(sub =>
    '<option value="' + escapeHtml(sub.key) + '">' + escapeHtml(sub.name) +
    '（满分 ' + escapeHtml(fmtScore(sub.full)) + '）</option>'
  ).join("");
  sel.value = state.rosterSubject;

  const sub = data.allSubjects.find(s => s.key === state.rosterSubject) || data.allSubjects[0];
  const schoolGroup = data.groups[0];
  const threshold = gradeThresholds(subjectValues(schoolGroup, sub));
  const full = Number(sub.full);
  const ranks = computeWeaknessData();
  const rankMap = sub.key === "__total__" ? ranks.totalRankMap : ranks.subjectRanks[sub.name];
  const countMode = metric.key;

  let limitText = "";
  if (countMode === "lowCount") limitText = "≤ " + fmtThreshold(full * 0.3);
  else if (countMode === "top27Count") limitText = "≥ " + fmtThreshold(threshold.top);
  else if (countMode === "bottom27Count") limitText = "≤ " + fmtThreshold(threshold.bottom);

  const desc = $("#basicRosterDesc");
  if (desc) {
    desc.textContent = metric.label + " · " + sub.name + " · 分数线 " + (limitText || "—") +
      "；按班级列出符合条件的学生。";
  }

  const cards = [];
  for (const group of data.groups) {
    if (group.isAll) continue;
    const rows = [];
    for (const s of group.students) {
      const value = sub.key === "__total__" ? s.total : s.scores[sub.name];
      if (!isValidScore(value)) continue;
      const v = Number(value);
      let hit = false;
      if (countMode === "lowCount") hit = v <= full * 0.3;
      else if (countMode === "top27Count") hit = threshold.top !== null && v >= threshold.top;
      else if (countMode === "bottom27Count") hit = threshold.bottom !== null && v <= threshold.bottom;
      if (hit) rows.push({ s, v });
    }
    rows.sort((a, b) => {
      if (countMode === "top27Count") {
        return b.v - a.v || compareStudentOrder(a.s, b.s);
      }
      return a.v - b.v || compareStudentOrder(a.s, b.s);
    });
    const bodyHtml = rows.length
      ? rows.map(item => {
          const r = rankMap ? rankMap.get(item.s) : null;
          return '<tr>' +
            '<td>' + escapeHtml(item.s.id || "—") + '</td>' +
            '<td>' + escapeHtml(item.s.name) + '</td>' +
            '<td class="num-strong">' + escapeHtml(fmtScore(item.v)) + '</td>' +
            '<td>' + escapeHtml(r === null || r === undefined ? "—" : formatRank(r)) + '</td>' +
          '</tr>';
        }).join("")
      : '<tr><td colspan="4" class="roster-empty">本班无符合条件学生</td></tr>';
    cards.push('<div class="roster-card" data-roster-class="' + escapeHtml(group.name) + '">' +
      '<div class="roster-card-head">' +
        '<span class="roster-card-title"><b>' + escapeHtml(group.name) + '</b><span>' + rows.length + ' 人</span></span>' +
        '<span class="roster-card-actions no-print">' +
          '<button type="button" class="btn ghost small" data-roster-xlsx="' + escapeHtml(group.name) + '">导出表格</button>' +
          '<button type="button" class="btn ghost small" data-roster-png="' + escapeHtml(group.name) + '">导出图片</button>' +
        '</span>' +
      '</div>' +
      '<table class="roster-table"><thead><tr><th>学号</th><th>姓名</th><th>分数</th><th>校排名</th></tr></thead>' +
      '<tbody>' + bodyHtml + '</tbody></table>' +
    '</div>');
  }
  $("#basicRosterContent").innerHTML = cards.join("");
  $("#basicRosterNote").textContent = (countMode === "top27Count"
    ? "前 27% 按分数从高到低排列"
    : "低分/后 27% 按分数从低到高排列") +
    "；表中排名为全级平均排名，0 分计入统计。";
}

/* =========================================================
   筛选栏组件：显示指标下拉 / 视角滑块 / 面包屑
   ========================================================= */
const METRIC_ICONS = {
  mean: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="M7 20v-6"/><path d="M12 20V6"/><path d="M17 20v-9"/></svg>',
  excellentRate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.9z"/></svg>',
  passRate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.4"/><path d="M8.4 12.3l2.5 2.5 4.7-5.2"/></svg>',
  lowRate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6l13 13"/><path d="M18 11v8h-8"/></svg>',
  lowCount: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.4" r="3.2"/><path d="M3.4 19.8c0-3.1 2.5-5.6 5.6-5.6s5.6 2.5 5.6 5.6"/><circle cx="17" cy="9.4" r="2.4"/><path d="M16.2 14.6c2.4.5 4.2 2.5 4.2 5.2"/></svg>',
  top27Rate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.4" cy="7.4" r="2.6"/><circle cx="16.6" cy="16.6" r="2.6"/><path d="M18.6 5.4L5.4 18.6"/></svg>',
  top27Count: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.4" r="3.2"/><path d="M3.4 19.8c0-3.1 2.5-5.6 5.6-5.6s5.6 2.5 5.6 5.6"/><path d="M18 12.4V6.2"/><path d="M15.4 8.8L18 6.2l2.6 2.6"/></svg>',
  bottom27Rate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.4" cy="16.6" r="2.6"/><circle cx="16.6" cy="7.4" r="2.6"/><path d="M5.4 5.4l13.2 13.2"/></svg>',
  bottom27Count: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.4" r="3.2"/><path d="M3.4 19.8c0-3.1 2.5-5.6 5.6-5.6s5.6 2.5 5.6 5.6"/><path d="M18 6.2v6.2"/><path d="M15.4 9.8L18 12.4l2.6-2.6"/></svg>'
};

function metricIconFor(key){
  return METRIC_ICONS[key] || METRIC_ICONS.mean;
}

/* 显示指标：药丸按钮组（选中项主色填充） */
function renderMetricChips(){
  const box = $("#metricChips");
  if (!box) return;
  const current = selectedMetric();
  box.innerHTML = METRICS.map(function(m){
    const active = m.key === current.key;
    return '<button type="button" class="chip' + (active ? ' active' : '') + '"' +
      ' role="radio" aria-checked="' + (active ? "true" : "false") + '"' +
      ' data-metric="' + escapeHtml(m.key) + '">' +
        metricIconFor(m.key) +
        '<span>' + escapeHtml(m.label) + '</span>' +
      '</button>';
  }).join("");
}

/* 分段选择器：滑块跟随当前选项 */
function updateSegmentedThumb(target){
  const wrap = typeof target === "string" ? $(target) : target;
  if (!wrap) return;
  const thumb = wrap.querySelector(".view-switch-thumb");
  const active = wrap.querySelector(".view-switch-btn.active");
  if (!thumb || !active) return;
  const pad = 3;
  thumb.style.width = active.offsetWidth + "px";
  thumb.style.transform = "translateX(" + Math.max(0, active.offsetLeft - pad) + "px)";
}

function updateViewSwitchThumb(){
  updateSegmentedThumb("#basicModeChips");
}

function updateTopnSwitchThumb(){
  updateSegmentedThumb("#topnModeButtons");
}

/* 右上角面包屑：学科视角 / 总分 / 平均分 */
function renderBasicBreadcrumb(data){
  const el = $("#basicBreadcrumb");
  if (!el) return;
  const parts = [state.basicMode === "subject" ? "学科视角" : "班级视角"];
  if (state.basicMode === "subject" && data && data.allSubjects) {
    const sub = data.allSubjects.find(item => item.key === state.subjectView);
    if (sub) parts.push(sub.name);
  }
  parts.push(selectedMetric().label);
  el.innerHTML = parts.map(p => '<span>' + escapeHtml(p) + '</span>').join('<i>/</i>');
}

function renderBasic(){
  const metric = selectedMetric();
  const data = buildBasicAnalysis(datasetForCurrent(), metric);
  const refData = state.reference ? buildBasicAnalysis(state.reference, metric) : null;
  const showRank = !metric.noRank;
  const showChange = !!refData;
  const table = $("#basicTable");
  const tableWrap = $(".basic-table-wrap");
  const grid = $("#basicSubjectGrid");
  const picker = $("#subjectViewPicker");
  const subjectChips = $("#subjectViewChips");
  const subjectSort = $("#subjectViewSort");
  if (table) table.classList.toggle("subject-mode", state.basicMode === "subject");
  syncSubjectSortOptions(metric);
  $$("#basicModeChips [data-basic-mode]").forEach(item => {
    item.classList.toggle("active", item.getAttribute("data-basic-mode") === state.basicMode);
  });
  updateViewSwitchThumb();

  if (!data.allSubjects.some(item => item.key === state.subjectView)) {
    state.subjectView = data.allSubjects[0] ? data.allSubjects[0].key : "";
  }
  if (subjectChips) {
    subjectChips.innerHTML = data.allSubjects.map(item =>
      '<button type="button" class="chip' + (item.key === state.subjectView ? ' active' : '') +
        '" data-subject-view="' + escapeHtml(item.key) + '">' + escapeHtml(item.name) + '</button>'
    ).join("");
  }
  if (subjectSort) subjectSort.value = state.subjectViewSort;
  if (picker) picker.hidden = state.basicMode !== "subject";
  const sortWrap = $("#subjectSortWrap");
  if (sortWrap) sortWrap.hidden = state.basicMode !== "subject";
  if (state.basicMode !== "subject") {
    const summaryEl = $("#basicSubjectSummary");
    if (summaryEl) summaryEl.hidden = true;
  }
  renderMetricChips();
  renderBasicBreadcrumb(data);

  if (state.basicMode === "subject") {
    if (tableWrap) tableWrap.classList.add("hidden");
    if (grid) grid.hidden = false;
    renderBasicSubjectCards(data, refData, metric, showRank, showChange);
  } else {
    if (tableWrap) tableWrap.classList.remove("hidden");
    if (grid) grid.hidden = true;
    renderBasicClassMode(data, refData, metric, showRank, showChange);
  }
  renderBasicRoster(metric, data);
  updateBasicStickyOffsets();
  requestAnimationFrame(updateBasicStickyOffsets);
}

function updateBasicStickyOffsets(){
  if (state.basicMode === "subject") return;
  const table = $("#basicTable");
  if (!table) return;
  const name = table.querySelector("thead .col-name");
  const head = table.querySelector("thead .col-head");
  const count = table.querySelector("thead .col-count");
  if (!name || !count) return;
  const nameW = name.getBoundingClientRect().width;
  const headW = head ? head.getBoundingClientRect().width : 0;
  if (!nameW) return;
  const countLeft = (state.basicMode === "subject" ? nameW : nameW + headW) + "px";
  table.style.setProperty("--basic-name-w", nameW + "px");
  table.style.setProperty("--basic-head-left", nameW + "px");
  table.style.setProperty("--basic-count-left", countLeft);
  table.querySelectorAll(".col-head").forEach(el => { el.style.left = nameW + "px"; });
  table.querySelectorAll(".col-count").forEach(el => { el.style.left = countLeft; });
}
