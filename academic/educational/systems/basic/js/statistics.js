"use strict";

/* =========================================================
   统计计算
   ========================================================= */
function computeStat(values, fullScore){
  const arr = [];
  for (const v of values) if (isValidScore(v)) arr.push(Number(v));
  const n = arr.length;
  if (!n) {
    return { n:0, mean:null, stdDev:null, cv:null, excellentRate:null, passRate:null, lowRate:null, lowCount:0, top27Count:0, bottom27Count:0 };
  }
  let sum = 0;
  for (const v of arr) sum += v;
  const mean = sum / n;
  let variance = 0;
  for (const v of arr) variance += Math.pow(v - mean, 2);
  const stdDev = Math.sqrt(variance / n);
  const cv = mean === 0 ? null : stdDev / mean;

  const full = Number(fullScore) > 0 ? Number(fullScore) : 0;
  let excellentCount = 0, passCount = 0, lowCount = 0;
  if (full > 0) {
    for (const v of arr) {
      if (v >= full * 0.85) excellentCount++;
      if (v >= full * 0.60) passCount++;
      if (v <= full * 0.30) lowCount++;
    }
  }

  const sorted = arr.slice().sort((a,b) => b - a);
  const k = Math.max(1, Math.ceil(n * 0.27));
  const topThreshold = sorted[k - 1];
  let top27Count = 0;
  for (const v of sorted) if (v >= topThreshold) top27Count++;

  const sortedAsc = sorted.slice().reverse();
  const bottomThreshold = sortedAsc[k - 1];
  let bottom27Count = 0;
  for (const v of sortedAsc) if (v <= bottomThreshold) bottom27Count++;

  return {
    n,
    mean,
    stdDev,
    cv,
    excellentRate: full > 0 ? excellentCount / n : null,
    passRate: full > 0 ? passCount / n : null,
    lowRate: full > 0 ? lowCount / n : null,
    lowCount,
    top27Count,
    bottom27Count
  };
}

function scoreOf(student, subjectKey){
  if (subjectKey === "__total__") return student.total;
  return student.scores ? student.scores[subjectKey] : null;
}

function assignAverageRanks(sorted, key, subjectKey){
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && sameScore(scoreOf(sorted[j], subjectKey), scoreOf(sorted[i], subjectKey))) j++;
    const avg = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) sorted[k][key] = avg;
    i = j;
  }
}

function assignGrades(sorted){
  const n = sorted.length;
  if (!n) return;
  const ends = GRADE_BANDS.map(b => Math.max(0, Math.min(n, Math.round(n * b.max / 100))));
  ends[ends.length - 1] = n;
  let idx = 0;
  for (let bi = 0; bi < GRADE_BANDS.length; bi++) {
    const end = ends[bi];
    for (let k = idx; k < end; k++) sorted[k].grade = GRADE_BANDS[bi].name;
    if (end > idx) idx = end;
  }
  for (; idx < n; idx++) sorted[idx].grade = GRADE_BANDS[GRADE_BANDS.length - 1].name;
}

function computeRankings(){
  state.totalValidCount = state.students.filter(s => isValidScore(s.total)).length;
  const subjectKey = state.rankSubject;
  const valid = state.students.filter(s => isValidScore(scoreOf(s, subjectKey)));
  const validSet = new Set(valid);

  valid.sort((a,b) =>
    Number(scoreOf(b, subjectKey)) - Number(scoreOf(a, subjectKey)) ||
    String(a.id).localeCompare(String(b.id), "zh-CN", { numeric:true }) ||
    String(a.name).localeCompare(String(b.name), "zh-CN")
  );
  assignAverageRanks(valid, "schoolRank", subjectKey);

  const byClass = new Map();
  for (const s of valid) {
    if (!byClass.has(s.className)) byClass.set(s.className, []);
    byClass.get(s.className).push(s);
  }
  for (const arr of byClass.values()) {
    arr.sort((a,b) =>
      Number(scoreOf(b, subjectKey)) - Number(scoreOf(a, subjectKey)) ||
      String(a.id).localeCompare(String(b.id), "zh-CN", { numeric:true }) ||
      String(a.name).localeCompare(String(b.name), "zh-CN")
    );
    assignAverageRanks(arr, "classRank", subjectKey);
  }

  assignGrades(valid);

  for (const s of state.students) {
    if (!validSet.has(s)) {
      s.schoolRank = null;
      s.classRank = null;
      s.grade = "—";
    }
  }

  state.rankData = { valid, subject: subjectKey };
}

function prepareFullScores(){
  for (const sub of state.subjects) {
    const stored = Number(state.fullScores[sub.name]);
    if (!Number.isFinite(stored) || stored <= 0) {
      state.fullScores[sub.name] = getDefaultFull(sub.name);
    }
  }
  state.totalFull = state.subjects.reduce((sum, sub) => {
    if (!state.includeBioGeo && isBioGeoSubject(sub.name)) return sum;
    return sum + getFull(sub.name);
  }, 0);
}

/* ---------------------------------------------------------
   总分是否包含生物 / 地理（初一阶段这两科是否计入总分可配置）
   --------------------------------------------------------- */
const BIO_GEO_SUBJECT_NAMES = ["生物", "地理"];

function isBioGeoSubject(name){
  const key = cleanText(name).replace(/\(\d+\)$/, "");
  return BIO_GEO_SUBJECT_NAMES.indexOf(key) >= 0;
}

/* 记录学生原始总分，切换“是否包含生物地理”时都以它为基准重新计算 */
function rememberBaseTotals(students){
  (students || []).forEach(s => {
    if (!s) return;
    if (!Object.prototype.hasOwnProperty.call(s, "baseTotal")) s.baseTotal = s.total;
  });
}

function applyTotalInclusionTo(students, subjects){
  rememberBaseTotals(students);
  (students || []).forEach(s => {
    if (!s) return;
    const base = s.baseTotal;
    if (!state.includeBioGeo) {
      s.total = base;
      return;
    }
    let total = isValidScore(base) ? Number(base) : null;
    if (total === null) return;
    let added = false;
    for (const sub of (subjects || [])) {
      if (!isBioGeoSubject(sub.name)) continue;
      const v = s.scores ? s.scores[sub.name] : null;
      if (isValidScore(v)) {
        total += Number(v);
        added = true;
      }
    }
    s.total = added ? round2(total) : base;
  });
}

function refreshComputed(){
  applyTotalInclusionTo(state.students, state.subjects);
  if (state.reference) applyTotalInclusionTo(state.reference.students, state.reference.subjects);
  prepareFullScores();
  computeRankings();
}
