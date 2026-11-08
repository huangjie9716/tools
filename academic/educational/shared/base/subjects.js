"use strict";

/* =========================================================
   学科名称统一（前端显示口径）
   ---------------------------------------------------------
   后台/历史成绩表里可能出现“政治”“思想品德”“思想政治”
   “道德与法治”等写法，前端一律统一显示为新的学科名称「道法」。
   只在展示与解析层转换，不改动云端已存储的原始表头/数据。
   ========================================================= */
(function () {
  var ALIASES = {
    "政治": "道法",
    "思想品德": "道法",
    "思想政治": "道法",
    "道德与法治": "道法",
    "道德法治": "道法",
    "道德": "道法",
    "品德": "道法",
    "道法": "道法",
    "体育与健康": "体育",
    "外语": "英语"
  };

  /* 去掉空白后按别名映射；保留上传重名列的“(2)”后缀 */
  function normalize(name) {
    var raw = name === null || name === undefined ? "" : String(name).replace(/\s+/g, "").trim();
    if (!raw) return "";
    var m = raw.match(/^(.*?)([（(]\d+[）)])$/);
    var core = m ? m[1] : raw;
    var suffix = m ? m[2] : "";
    return (ALIASES[core] || core) + suffix;
  }

  function is(name, canonical) {
    return normalize(name) === normalize(canonical);
  }

  window.JZSubjects = { normalize: normalize, is: is, aliases: ALIASES };
  /* 兼容直接调用（各页面脚本可按需使用） */
  window.normalizeSubjectName = normalize;
})();
