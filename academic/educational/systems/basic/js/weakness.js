"use strict";

/* =========================================================
   渲染：学生优弱势科目分析
   ========================================================= */
function compareStudentOrder(a, b){
  return String(a.id || "").localeCompare(String(b.id || ""), "zh-CN", { numeric:true }) ||
    String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
}

function assignAverageRanksToMap(sorted, scoreFn, map){
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && sameScore(scoreFn(sorted[j]), scoreFn(sorted[i]))) j++;
    const avg = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) map.set(sorted[k], avg);
    i = j;
  }
}

function computeWeaknessData(){
  const totalRankMap = new Map();
  const totalList = state.students.filter(s => isValidScore(s.total));
  totalList.sort((a, b) => Number(b.total) - Number(a.total) || compareStudentOrder(a, b));
  assignAverageRanksToMap(totalList, s => s.total, totalRankMap);

  const subjectRanks = {};
  for (const sub of state.subjects) {
    const map = new Map();
    const list = state.students.filter(s => isValidScore(s.scores[sub.name]));
    list.sort((a, b) => Number(b.scores[sub.name]) - Number(a.scores[sub.name]) || compareStudentOrder(a, b));
    assignAverageRanksToMap(list, s => s.scores[sub.name], map);
    subjectRanks[sub.name] = map;
  }
  return { totalRankMap, subjectRanks };
}

function formatDiffValue(v){
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  const num = Number(v);
  const text = formatRank(num);
  return num > 0 ? "+" + text : text;
}

function weaknessType(diff){
  if (diff === null || diff === undefined || !Number.isFinite(Number(diff))) {
    return { label:"—", cls:"neutral" };
  }
  const d = Number(diff);
  if (d >= 50) return { label:"强优势", cls:"strong-adv" };
  if (d > 0) return { label:"正贡献", cls:"adv" };
  if (d === 0) return { label:"持平", cls:"neutral" };
  if (d <= -50) return { label:"强弱势", cls:"strong-weak" };
  return { label:"负贡献", cls:"weak" };
}

function weaknessMatchesFilter(student, totalRankMap, subjectRanks){
  if (state.weakFilter === "all") return true;
  const tr = totalRankMap.get(student);
  if (tr === undefined) return false;
  return state.subjects.some(sub => {
    const sr = subjectRanks[sub.name] ? subjectRanks[sub.name].get(student) : undefined;
    if (sr === undefined) return false;
    const diff = Number(tr) - Number(sr);
    return state.weakFilter === "strongAdv" ? diff >= 50 : diff <= -50;
  });
}

function weaknessMatchesSearch(student){
  const q = String(state.weakSearch || "").trim().toLowerCase();
  if (!q) return true;
  return String(student.name || "").toLowerCase().includes(q) ||
    String(student.id || "").toLowerCase().includes(q);
}

function weaknessSortedStudents(totalRankMap, subjectRanks){
  const list = state.students.filter(s =>
    (state.weakScope === "all" || s.className === state.weakScope) &&
    weaknessMatchesSearch(s) &&
    weaknessMatchesFilter(s, totalRankMap, subjectRanks)
  );
  if (state.weakSort === "id") {
    list.sort(compareStudentOrder);
  } else {
    list.sort((a, b) => {
      const ra = totalRankMap.get(a);
      const rb = totalRankMap.get(b);
      const va = ra === undefined ? Infinity : ra;
      const vb = rb === undefined ? Infinity : rb;
      if (va !== vb) return va - vb;
      return compareStudentOrder(a, b);
    });
  }
  return list;
}

/* 各快速筛选档位的学生人数（受当前查看范围影响） */
function weaknessFilterCounts(totalRankMap, subjectRanks){
  const result = { all: 0, strongAdv: 0, strongWeak: 0 };
  for (const s of state.students) {
    if (state.weakScope !== "all" && s.className !== state.weakScope) continue;
    result.all++;
    const tr = totalRankMap.get(s);
    if (tr === undefined) continue;
    let adv = false, weak = false;
    for (const sub of state.subjects) {
      const sr = subjectRanks[sub.name] ? subjectRanks[sub.name].get(s) : undefined;
      if (sr === undefined) continue;
      const diff = Number(tr) - Number(sr);
      if (diff >= 50) adv = true;
      else if (diff <= -50) weak = true;
    }
    if (adv) result.strongAdv++;
    if (weak) result.strongWeak++;
  }
  return result;
}

function updateWeakSwitchThumb(){
  updateSegmentedThumb("#weakTypeChips");
}

/* ---------- 分页 ---------- */
function weaknessPageSize(){
  const n = Number(state.weakPageSize);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function weaknessApplyPaging(list){
  const total = list.length;
  const size = weaknessPageSize();
  if (!size) {
    state.weakPage = 1;
    return { rows: list, total, pages: 1, page: 1 };
  }
  const pages = Math.max(1, Math.ceil(total / size));
  let page = Number(state.weakPage) || 1;
  if (page < 1) page = 1;
  if (page > pages) page = pages;
  state.weakPage = page;
  return { rows: list.slice((page - 1) * size, page * size), total, pages, page };
}

function renderWeaknessPager(paged){
  const bar = $("#weakPager");
  if (!bar) return;
  const sizeSel = $("#weakPageSize");
  if (sizeSel) sizeSel.value = String(weaknessPageSize());
  const info = $("#weakPagerInfo");
  const prev = $("#weakPrevPage");
  const next = $("#weakNextPage");
  bar.hidden = !paged || !paged.total;
  if (!paged) return;
  if (info) {
    info.textContent = paged.pages > 1
      ? "第 " + paged.page + " / " + paged.pages + " 页 · 共 " + paged.total + " 人"
      : "共 " + paged.total + " 人";
  }
  if (prev) prev.disabled = paged.page <= 1;
  if (next) next.disabled = paged.page >= paged.pages;
}

function weakChangePage(delta){
  const page = Math.max(1, (Number(state.weakPage) || 1) + delta);
  if (page === state.weakPage) return;
  state.weakPage = page;
  renderWeakness();
  const wrap = $(".weak-table-wrap");
  if (wrap) wrap.scrollTop = 0;
  const table = $("#weakTable");
  if (table && table.getBoundingClientRect().top < 0) table.scrollIntoView({ block: "start" });
}

function renderWeaknessScopeFilter(){
  const sel = $("#weakScope");
  if (!sel) return;
  let html = '<option value="all">全级</option>';
  for (const cls of state.classes) {
    html += '<option value="' + escapeHtml(cls) + '">' + escapeHtml(cls) + '</option>';
  }
  sel.innerHTML = html;
  if (state.weakScope !== "all" && !state.classes.includes(state.weakScope)) state.weakScope = "all";
  sel.value = state.weakScope;
  const sortSel = $("#weakSort");
  if (sortSel) sortSel.value = state.weakSort;
  updateWeakExportButton();
}

function renderWeakness(){
  const head = $("#weakHead");
  const body = $("#weakBody");
  const count = $("#weakCount");
  if (!head || !body) return;

  if (!state.students.length) {
    head.innerHTML = "";
    body.innerHTML = '<tr class="empty-row"><td colspan="5">请先导入成绩文件</td></tr>';
    if (count) count.textContent = "";
    renderWeaknessPager(null);
    return;
  }

  const { totalRankMap, subjectRanks } = computeWeaknessData();
  const list = weaknessSortedStudents(totalRankMap, subjectRanks);
  const paged = weaknessApplyPaging(list);
  const counts = weaknessFilterCounts(totalRankMap, subjectRanks);
  const filterWrap = $("#weakTypeChips");
  if (filterWrap) {
    filterWrap.setAttribute("data-tone",
      state.weakFilter === "strongAdv" ? "adv" : state.weakFilter === "strongWeak" ? "weak" : "all");
  }
  $$("#weakTypeChips [data-weak-filter]").forEach(item => {
    const key = item.getAttribute("data-weak-filter");
    const active = key === state.weakFilter;
    item.classList.toggle("active", active);
    const badge = item.querySelector(".weak-filter-count");
    if (badge) {
      const n = counts[key];
      const show = active && typeof n === "number";
      badge.textContent = show ? n + " 人" : "";
      badge.hidden = !show;
    }
  });
  updateWeakSwitchThumb();

  head.innerHTML =
    '<tr>' +
      '<th rowspan="2" class="sticky-col weak-col-id">学号</th>' +
      '<th rowspan="2" class="sticky-col weak-col-name">姓名</th>' +
      '<th rowspan="2" class="sticky-col weak-col-class">班级</th>' +
      '<th rowspan="2">总分</th>' +
      '<th rowspan="2">总分排名</th>' +
      state.subjects.map(sub => '<th colspan="3" class="weak-group">' + escapeHtml(sub.name) + '</th>').join("") +
    '</tr>' +
    '<tr>' +
      state.subjects.map(() => '<th>分数</th><th>排名</th><th>差值</th>').join("") +
    '</tr>';

  if (!paged.total) {
    body.innerHTML = '<tr class="empty-row"><td colspan="' + (5 + state.subjects.length * 3) + '">没有符合条件的学生</td></tr>';
  } else {
    body.innerHTML = paged.rows.map(s => {
      const tr = totalRankMap.get(s);
      const totalValid = isValidScore(s.total);
      const canDiff = totalValid && tr !== undefined;
      let html = '<tr>' +
        '<td class="sticky-col weak-col-id">' + escapeHtml(s.id || "—") + '</td>' +
        '<td class="sticky-col weak-col-name"><button type="button" class="weak-name-btn" title="点击查看学科诊断报告" data-student-index="' +
          state.students.indexOf(s) + '">' + escapeHtml(s.name) + '</button></td>' +
        '<td class="sticky-col weak-col-class">' + escapeHtml(s.className) + '</td>' +
        '<td class="weak-score">' + (totalValid ? escapeHtml(fmtScore(s.total)) : '<span class="weak-muted">—</span>') + '</td>' +
        '<td class="weak-rank">' + (canDiff ? escapeHtml(formatRank(tr)) : '<span class="weak-muted">—</span>') + '</td>';

      for (const sub of state.subjects) {
        const raw = s.scores[sub.name];
        const sr = subjectRanks[sub.name] ? subjectRanks[sub.name].get(s) : undefined;
        const hasScore = isValidScore(raw);
        const hasRank = sr !== undefined;
        const diff = (canDiff && hasRank) ? Number(tr) - Number(sr) : null;
        const type = weaknessType(diff);
        const isStrong = type.cls === "strong-adv" || type.cls === "strong-weak";
        const diffHtml = diff === null
          ? '<span class="weak-muted">—</span>'
          : (() => {
            const sign = diff > 0 ? "+" : (diff < 0 ? "-" : "");
            const bodyText = formatDiffValue(diff).replace(/^[+-]/, "");
            const label = (sign ? '<span class="diff-sign">' + sign + '</span>' : "") + escapeHtml(bodyText);
            return isStrong
              ? '<span class="diff-badge ' + type.cls + '" title="' + escapeHtml(type.label) + '">' + label + '</span>'
              : '<span class="weak-diff-plain ' + type.cls + '" title="' + escapeHtml(type.label) + '">' + label + '</span>';
          })();
        html += '<td class="weak-score">' + (hasScore ? escapeHtml(fmtScore(raw)) : '<span class="weak-muted">—</span>') + '</td>' +
          '<td class="weak-rank">' + (hasRank ? escapeHtml(formatRank(sr)) : '<span class="weak-muted">—</span>') + '</td>' +
          '<td class="weak-diff-cell">' + diffHtml + '</td>';
      }
      return html + '</tr>';
    }).join("");
  }

  const invalidTotal = list.filter(s => !isValidScore(s.total)).length;
  const filterLabel = state.weakFilter === "strongAdv" ? " · 只看强优势"
    : state.weakFilter === "strongWeak" ? " · 只看强弱势" : "";
  if (count) {
    count.textContent = "共 " + list.length + " 人 · 全级排名" + filterLabel +
      (invalidTotal ? " · 无有效总分 " + invalidTotal + " 人" : "");
  }
  renderWeaknessPager(paged);
}

function exportWeakness(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const { totalRankMap, subjectRanks } = computeWeaknessData();
  const list = weaknessSortedStudents(totalRankMap, subjectRanks);
  const head = ["学号", "姓名", "班级", "总分", "总分排名"];
  for (const sub of state.subjects) {
    head.push(sub.name + "分数", sub.name + "排名", sub.name + "差值", sub.name + "类型");
  }
  const rows = [head];
  for (const s of list) {
    const tr = totalRankMap.get(s);
    const totalValid = isValidScore(s.total);
    const canDiff = totalValid && tr !== undefined;
    const row = [
      s.id || "", s.name, s.className,
      totalValid ? fmtScore(s.total) : "",
      canDiff ? formatRank(tr) : ""
    ];
    for (const sub of state.subjects) {
      const raw = s.scores[sub.name];
      const sr = subjectRanks[sub.name] ? subjectRanks[sub.name].get(s) : undefined;
      const hasScore = isValidScore(raw);
      const hasRank = sr !== undefined;
      const diff = (canDiff && hasRank) ? Number(tr) - Number(sr) : null;
      row.push(
        hasScore ? fmtScore(raw) : "",
        hasRank ? formatRank(sr) : "",
        diff === null ? "" : formatDiffValue(diff),
        diff === null ? "" : weaknessType(diff).label
      );
    }
    rows.push(row);
  }
  const scopeLabel = state.weakScope === "all" ? "全级" : state.weakScope;
  downloadCsv("学生优弱势_" + (typeof examTag === "function" ? examTag() + "_" : "") + scopeLabel + "_" + dateStamp() + ".csv",
    [[typeof exportInfoLine === "function"
      ? exportInfoLine([state.fileName || "本次考试", "学生优弱势科目分析", "范围：" + scopeLabel, "差值＝总分排名 − 学科排名"])
      : "学生优弱势科目分析 · 范围：" + scopeLabel], []].concat(rows));
}
