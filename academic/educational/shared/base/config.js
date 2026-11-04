"use strict";

/* =========================================================
   常量与状态
   ========================================================= */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const SUBJECT_DEFAULT_FULL = {
  "语文":120, "数学":120, "英语":120,
  "物理":80, "化学":80,
  "道法":60, "道德与法治":60, "政治":60, "历史":60, "体育":60,
  "生物":60, "地理":60,
  "科学":100, "信息技术":100, "音乐":100, "美术":100
};
const FULL_SCORE_STORAGE_KEY = "jz_score_full_scores_v1";

const METRICS = [
  { key:"mean", label:"平均分", kind:"mean", higherIsBetter:true },
  { key:"excellentRate", label:"优秀率", kind:"excellent", higherIsBetter:true },
  { key:"passRate", label:"合格率", kind:"pass", higherIsBetter:true },
  { key:"lowRate", label:"低分率", kind:"low", higherIsBetter:false },
  { key:"lowCount", label:"低分人数", kind:"count", higherIsBetter:false, noRank:true },
  { key:"top27Rate", label:"前 27% 比率", kind:"rate", higherIsBetter:true },
  { key:"top27Count", label:"前 27% 人数", kind:"count", higherIsBetter:true, noRank:true },
  { key:"bottom27Rate", label:"后 27% 比率", kind:"rate", higherIsBetter:false },
  { key:"bottom27Count", label:"后 27% 人数", kind:"count", higherIsBetter:false, noRank:true }
];

const TOPN_MODES = {
  1: [10, 30, 50, 100, 150, 200, 300],
  2: [40, 80, 140, 300, 460, 580]
};

const GRADE_BANDS = [
  { name:"A+", max:2.3 },
  { name:"A",  max:6.7 },
  { name:"A-", max:15.9 },
  { name:"B+", max:30.9 },
  { name:"B",  max:50.0 },
  { name:"B-", max:59.9 },
  { name:"C+", max:69.1 },
  { name:"C",  max:84.1 },
  { name:"C-", max:93.3 },
  { name:"D+", max:97.7 },
  { name:"D",  max:99.4 },
  { name:"D-", max:100.0 }
];



const state = {
  students: [],
  subjects: [],
  classes: [],
  fullScores: {},
  includeZero: true,
  totalFull: 0,
  fileName: "",
  blankRows: 0,
  warnings: [],
  metric: "mean",
  reference: null,
  rankSubject: "__total__",
  totalValidCount: 0,
  topnMode: 1,
  classFilter: "all",
  gradeFilter: "all",
  rankSort: "school",
  search: "",
  rankData: null,
  weakScope: "all",
  weakSort: "total",
  segmentSubject: "",
  heatMetric: "mean",
  basicMode: "class",
  subjectView: "__total__",
  subjectViewSort: "class",
  weakFilter: "all",
  weakSearch: "",
  weakPage: 1,
  weakPageSize: 50,
  rosterSubject: "__total__",
  teacherGrade: ""
};
