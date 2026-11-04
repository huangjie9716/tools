"use strict";

function teacherGradeData(){
  return state.teacherGrade && TEACHER_ROSTER.grades ? TEACHER_ROSTER.grades[state.teacherGrade] : null;
}

function teacherInfoForClass(className){
  const grade = teacherGradeData();
  if (!grade || !grade.classes) return null;
  const classes = grade.classes;
  if (classes[className]) return classes[className];
  const num = String(className || "").match(/(\d+)/);
  if (num) {
    const key = Object.keys(classes).find(k => {
      const m = String(k).match(/(\d+)/);
      return m && m[1] === num[1];
    });
    if (key) return classes[key];
  }
  return null;
}

function headTeacherFor(className){
  const info = teacherInfoForClass(className);
  return info && info.headTeacher ? info.headTeacher : "—";
}

function subjectTeacherFor(className, subjectName){
  if (subjectName === "__total__" || subjectName === "总分") return headTeacherFor(className);
  const info = teacherInfoForClass(className);
  if (!info || !info.subjectTeachers) return "—";
  const aliases = TEACHER_ROSTER.subjectAliases || {};
  const key = aliases[subjectName] || subjectName;
  return info.subjectTeachers[key] || info.subjectTeachers[subjectName] || "—";
}

/* =========================================================
   任教名单按「届（毕业年份）」匹配，而不是按名称里的年级：
     2027届 → 初三教师团队
     2028届 → 初二教师团队
     2029届 → 初一教师团队
   每一届都会经历七年级、八年级，因此只根据「XX届」推算当前年级。
   ========================================================= */
const ROSTER_STAGE_SEQUENCE = ["初一", "初二", "初三"]; /* 由低到高 */

/* 当前学年的「初三届」：9 月及以后进入新学年，初三届 = 次年 */
function currentGradeThreeCohortYear(){
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 >= 9 ? year + 1 : year;
}

/* 从文字里取出届（毕业年份）；兼容「2024级」= 入学年份 */
function parseCohortYear(value){
  const s = String(value || "");
  const m = s.match(/(20\d{2})\s*届/);
  if (m) return Number(m[1]);
  const g = s.match(/(20\d{2})\s*级/);
  if (g) return Number(g[1]) + ROSTER_STAGE_SEQUENCE.length;
  return null;
}

/* 由届（毕业年份）推算当前应使用哪个年级的任教团队 */
function stageKeyFromCohortYear(year){
  if (!Number.isFinite(year)) return "";
  let offset = year - currentGradeThreeCohortYear(); /* 0=初三 1=初二 2=初一 */
  if (offset < 0) offset = 0;                                   /* 已毕业的届 → 按初三 */
  if (offset > ROSTER_STAGE_SEQUENCE.length - 1) offset = ROSTER_STAGE_SEQUENCE.length - 1; /* 还未升上来 → 按初一 */
  return ROSTER_STAGE_SEQUENCE[ROSTER_STAGE_SEQUENCE.length - 1 - offset];
}

/* 某个年级团队当前对应的届（用于界面提示） */
function cohortYearOfStage(stageKey){
  const idx = ROSTER_STAGE_SEQUENCE.indexOf(stageKey);
  if (idx < 0) return null;
  return currentGradeThreeCohortYear() + (ROSTER_STAGE_SEQUENCE.length - 1 - idx);
}

function detectTeacherGrade(fileName){
  const grades = TEACHER_ROSTER.grades || {};
  const name = String(fileName || "");
  let key = "";

  /* 1) 优先按「届」（毕业年份）判断：2027届=初三、2028届=初二、2029届=初一 */
  const cohort = parseCohortYear(name);
  if (cohort) key = stageKeyFromCohortYear(cohort);

  /* 2) 没有届时才看名称里直接写出的年级 */
  if (!key && /初三|九年级/.test(name)) key = "初三";
  if (!key && /初二|八年级|八[上下]/.test(name)) key = "初二";
  if (!key && /初一|七年级|七[上下]/.test(name)) key = "初一";

  if (!key) key = Object.keys(grades)[0] || "";
  return grades[key] ? key : "";
}

function renderTeacherGradeFilter(){
  const grades = TEACHER_ROSTER.grades || {};
  let text = "—";
  if (state.teacherGrade && grades[state.teacherGrade]) {
    const label = (grades[state.teacherGrade] && grades[state.teacherGrade].label) || state.teacherGrade;
    const cohort = cohortYearOfStage(state.teacherGrade);
    text = cohort ? label + "（" + cohort + "届）" : label;
  } else if (Object.keys(grades).length) {
    text = "未匹配";
  }
  const el = $("#teacherGradeLabel");
  if (el) el.textContent = text;
}
