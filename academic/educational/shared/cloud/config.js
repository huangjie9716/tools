/* =========================================================
   珠海市九洲中学教育质量管理与分析系统 · 云端连接配置
   ---------------------------------------------------------
   连接信息统一放在项目根目录的 config/ 下（所有访问者共用）：
     · config/supabase.json —— http 部署（本机服务器 / 学校服务器 /
       静态托管）时读取
     · config/supabase.js   —— 直接双击 html（file://）时读取：浏览器
       禁止网页用 fetch 读取本地 JSON，只能改读同样内容的 JS 文件
   两个文件内容相同，更换 Supabase 项目时请一起修改。
   本文件只负责读取它们，一般不需要修改。
   ========================================================= */
window.JZ = window.JZ || {};

window.JZ.SCHOOL_NAME = "珠海市九洲中学";

/* 兜底配置：正常留空，系统会读取 config/supabase.json / config/supabase.js */
window.JZ.SUPABASE = window.JZ.SUPABASE || { url: "", anonKey: "" };

/* 数据表名称（与 database/schema.sql 保持一致，一般无需修改） */
window.JZ.TABLES = {
  grades: "grades",
  exams: "exams",
  scores: "exam_scores",
  papers: "question_papers",
  notices: "system_notices",
  roster: "teacher_assignments",
  accounts: "teacher_accounts"
};

/* 读取连接配置：以本脚本所在位置推算项目根目录，兼容任意子目录页面 */
(function () {
  "use strict";

  var inlineReady = !!(window.JZ.SUPABASE && window.JZ.SUPABASE.url && window.JZ.SUPABASE.anonKey);
  window.JZ.CONFIG_SOURCE = inlineReady ? "inline" : "";

  var scriptEl = document.currentScript;
  var src = scriptEl && scriptEl.src ? String(scriptEl.src) : "";
  var base = "";
  var matched = src.match(/^(.*?)\/shared\/cloud\/config\.js/);
  if (matched) base = matched[1] + "/";

  var jsonUrl = base + "config/supabase.json";
  var jsUrl = base + "config/supabase.js";
  window.JZ.CONFIG_URL = jsonUrl;
  window.JZ.CONFIG_JS_URL = jsUrl;

  function normalize(data) {
    var url = String((data && (data.url || data.projectUrl || data.SUPABASE_URL)) || "")
      .trim().replace(/\/+$/, "");
    var key = String((data && (data.anonKey || data.anon_key || data.SUPABASE_ANON_KEY || data.key)) || "")
      .trim();
    return url && key ? { url: url, anonKey: key } : null;
  }

  function apply(data, source) {
    var cfg = normalize(data);
    if (!cfg) throw new Error("缺少 url 或 anonKey");
    window.JZ.SUPABASE = cfg;
    window.JZ.CONFIG_SOURCE = source;
    window.JZ.CONFIG_ERROR = "";
    return true;
  }

  /* 用 script 标签加载，file:// 直接打开时也不受 CORS 限制 */
  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement("script");
      el.src = url;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error("无法加载 " + url)); };
      document.head.appendChild(el);
    });
  }

  if (inlineReady) {
    // 已在内联对象里填写，优先使用
    window.JZ.configReady = Promise.resolve(true);
    return;
  }

  window.JZ.configReady = fetch(jsonUrl, { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      return apply(data, "json");
    })
    .catch(function (err) {
      window.JZ.CONFIG_ERROR = (err && err.message) ? err.message : String(err);
      // 读不到 JSON（多半是 file:// 被浏览器拦截），改用同内容的 JS 版本
      return loadScript(jsUrl)
        .then(function () {
          return apply(window.JZ_SUPABASE_FILE, "js");
        })
        .catch(function (err2) {
          var msg = (err2 && err2.message) ? err2.message : String(err2);
          window.JZ.CONFIG_ERROR = window.JZ.CONFIG_ERROR + "；" + msg;
          window.JZ.CONFIG_SOURCE = "missing";
          return false;
        });
    });
})();