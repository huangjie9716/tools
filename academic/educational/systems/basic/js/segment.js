"use strict";

/* =========================================================
   渲染：各班级各学科分数段人数
   ========================================================= */
function segmentBands(subjectName, full){
  const total = Number(full);
  if (!Number.isFinite(total) || total <= 0) return [];
  if (/体育/.test(String(subjectName || ""))) {
    return [{ label:"满分", threshold: total, key:"full" }];
  }

  const bands = [
    { label:"满分", threshold: total, key:"full" },
    { label:"优秀", threshold: round2(total * 0.85), key:"excellent" },
    { label:"合格", threshold: round2(total * 0.60), key:"pass" }
  ];
  let highs;
  if (Math.abs(total - 120) < 1e-9) highs = [115, 110, 105, 100, 95, 90];
  else if (Math.abs(total - 80) < 1e-9) highs = [75, 70, 65, 60, 55, 50];
  else if (Math.abs(total - 60) < 1e-9) highs = [57, 54, 51, 48, 45, 42];
  else highs = [0.95, 0.90, 0.85, 0.80, 0.75, 0.70].map(r => round2(total * r));

  for (const h of highs) bands.push({ label:"高分", threshold:h, key:"high" });
  return bands;
}

function fmtThreshold(v){
  const num = Number(v);
  if (!Number.isFinite(num)) return "—";
  return Number.isInteger(num) ? String(num) : String(round2(num));
}

function countAtLeast(values, threshold){
  let count = 0;
  for (const v of values) {
    if (isValidScore(v) && Number(v) >= threshold) count++;
  }
  return count;
}

function renderSegmentSubjectFilter(){
  const sel = $("#segmentSubject");
  if (!sel) return;
  if (!state.subjects.length) {
    sel.innerHTML = '<option value="">暂无可分析学科</option>';
    sel.disabled = true;
    state.segmentSubject = "";
    return;
  }
  sel.disabled = false;
  let html = '<option value="">请选择科目</option>';
  for (const sub of state.subjects) {
    const full = getFull(sub.name);
    html += '<option value="' + escapeHtml(sub.name) + '">' + escapeHtml(sub.name) +
      '（满分 ' + escapeHtml(fmtScore(full)) + '）</option>';
  }
  sel.innerHTML = html;
  if (state.segmentSubject && !state.subjects.some(sub => sub.name === state.segmentSubject)) {
    state.segmentSubject = "";
  }
  sel.value = state.segmentSubject;
}

function renderSegment(){
  const head = $("#segmentHead");
  const body = $("#segmentBody");
  const wrap = $("#segmentTableWrap");
  const empty = $("#segmentEmpty");
  const notes = $("#segmentNotes");
  const count = $("#segmentCount");
  if (!head || !body || !wrap || !empty || !notes) return;

  if (!state.students.length) {
    head.innerHTML = "";
    body.innerHTML = "";
    wrap.hidden = true;
    notes.hidden = true;
    empty.hidden = false;
    empty.textContent = "请先导入成绩文件。";
    if (count) count.textContent = "";
    return;
  }
  if (!state.subjects.length) {
    head.innerHTML = "";
    body.innerHTML = "";
    wrap.hidden = true;
    notes.hidden = true;
    empty.hidden = false;
    empty.textContent = "暂无可分析学科。";
    if (count) count.textContent = "";
    return;
  }

  const subject = state.subjects.find(sub => sub.name === state.segmentSubject);
  if (!subject) {
    head.innerHTML = "";
    body.innerHTML = "";
    wrap.hidden = true;
    notes.hidden = true;
    empty.hidden = false;
    empty.textContent = "请选择科目查看分数段人数。";
    if (count) count.textContent = "";
    return;
  }

  const full = getFull(subject.name);
  const bands = segmentBands(subject.name, full);
  const allValues = state.students.map(s => s.scores[subject.name]);
  const validAll = allValues.filter(v => isValidScore(v)).length;

  if (count) {
    count.textContent = "已选 " + subject.name + "（满分 " + fmtScore(full) + "）· 全级参考 " + validAll + " 人";
  }

  head.innerHTML = '<tr>' +
    '<th class="seg-col-class">班级</th>' +
    '<th>参考人数<small>有效成绩</small></th>' +
    bands.map(b => '<th class="seg-head seg-head-' + b.key + '">' + escapeHtml(b.label) + '<small>≥ ' + escapeHtml(fmtThreshold(b.threshold)) + '</small></th>').join("") +
  '</tr>';

  const groups = [
    { name:"全级", students: state.students, isAll:true },
    ...state.classes.map(cls => ({ name:cls, students: state.students.filter(s => s.className === cls), isAll:false }))
  ];

  body.innerHTML = groups.map(group => {
    const values = group.students.map(s => s.scores[subject.name]);
    const valid = values.filter(v => isValidScore(v)).length;
    let html = '<tr class="' + (group.isAll ? "all-row" : "") + '">' +
      '<td class="seg-col-class">' + escapeHtml(group.name) + '</td>' +
      '<td>' + valid + '</td>';
    for (const b of bands) {
      const n = countAtLeast(values, b.threshold);
      html += '<td class="seg-' + b.key + '" title="' +
        escapeHtml(group.name + " " + subject.name + " ≥" + fmtThreshold(b.threshold) + "：" + n + " 人") + '">' +
        n + '</td>';
    }
    return html + '</tr>';
  }).join("");

  empty.hidden = true;
  wrap.hidden = false;
  notes.hidden = false;
}
