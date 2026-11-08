/* =========================================================
   云端交互 UI：顶部导航 / 选择考试弹窗 / 加载遮罩 / 轻提示
   ---------------------------------------------------------
   对外暴露：window.JZUI
     mountNav({base, page})        注入统一顶部导航
     pickExam(options)             选择“年级 → 考试”，返回 { grade, exam }
     pickPaper(options)            选择“年级 → 考试 → 科目”，返回 { grade, exam, paper }
     busy(on, text)                全屏加载提示
     toast(msg, type)              轻提示
     ensureReady()                 云端未配置时给出引导，返回 false
   ========================================================= */
(function () {
  "use strict";

  var STORE = window.JZStore;
  var API = window.JZCloud;
  var LAST_GRADE_KEY = "jz_last_grade_v1";

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* 学科显示统一口径：政治/思想品德/道德与法治… → 道法 */
  function subjectLabel(v) {
    return (typeof window.normalizeSubjectName === "function") ? window.normalizeSubjectName(v) : v;
  }

  /* ---------------- 届（毕业年份）配色 ----------------
     同一届始终同一个颜色，相邻的届颜色一定不同，方便一眼区分。 */
  var GRADE_PALETTE = [
    { bg: "#e8ecfb", fg: "#2b3a8f" }, /* 蓝紫 */
    { bg: "#fdeeda", fg: "#8a5310" }, /* 橙 */
    { bg: "#e2f4e9", fg: "#1c6b3c" }, /* 绿 */
    { bg: "#fbe3e9", fg: "#9c2740" }, /* 玫红 */
    { bg: "#e0f1f7", fg: "#13647a" }, /* 青 */
    { bg: "#f2e8fb", fg: "#5c2b91" }  /* 紫 */
  ];

  /* 只从文字里取「20XX届」；「20XX级」按入学年份换算成届 */
  function cohortYear(name) {
    var s = String(name === null || name === undefined ? "" : name);
    var m = s.match(/(20\d{2})\s*届/);
    if (m) return Number(m[1]);
    var g = s.match(/(20\d{2})\s*级/);
    if (g) return Number(g[1]) + 3;
    return null;
  }

  function gradeColorIndex(name) {
    var y = cohortYear(name);
    if (y !== null) return ((y % GRADE_PALETTE.length) + GRADE_PALETTE.length) % GRADE_PALETTE.length;
    var s = String(name || "");
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return h % GRADE_PALETTE.length;
  }

  /* 可直接写进 style 的样式串 */
  function gradeChipStyle(name) {
    var c = GRADE_PALETTE[gradeColorIndex(name)];
    return "background:" + c.bg + ";color:" + c.fg + ";border-color:" + c.fg + "33";
  }

  /* 生成带固定颜色的「届」标签 */
  function gradeChip(name, extraClass) {
    if (!name) return "";
    return '<span class="jz-grade-chip' + (extraClass ? " " + extraClass : "") + '" style="' +
      gradeChipStyle(name) + '">' + esc(name) + "</span>";
  }

  /* 由届推算当前年级（2027届 → 初三），仅用于选择时提示 */
  function stageOfGrade(name) {
    var y = cohortYear(name);
    if (y === null) return "";
    var now = new Date();
    var g3 = now.getMonth() + 1 >= 9 ? now.getFullYear() + 1 : now.getFullYear();
    var offset = y - g3;
    if (offset === 0) return "初三";
    if (offset === 1) return "初二";
    if (offset === 2) return "初一";
    if (offset < 0) return "已毕业";
    return "未入学";
  }

  /* 把标签的颜色/文字画到已有节点上 */
  function paintGradeChip(node, name) {
    if (!node) return;
    if (!name) {
      node.textContent = "";
      node.style.display = "none";
      return;
    }
    var stage = stageOfGrade(name);
    node.textContent = name + (stage ? " · " + stage : "");
    node.setAttribute("style", gradeChipStyle(name));
    node.style.display = "inline-flex";
  }

  /* ---------------- 轻提示 ---------------- */
  var toastTimer = null;
  function toast(message, type) {
    var node = document.getElementById("jzToast");
    if (!node) {
      node = document.createElement("div");
      node.id = "jzToast";
      node.className = "jz-toast";
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.className = "jz-toast show" + (type ? " " + type : "");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("show"); }, 5000);
  }

  /* ---------------- 加载遮罩 ---------------- */
  var busyCounter = 0;
  function busy(on, text) {
    busyCounter = Math.max(0, busyCounter + (on ? 1 : -1));
    var node = document.getElementById("jzBusy");
    if (on && !node) {
      node = document.createElement("div");
      node.id = "jzBusy";
      node.className = "jz-busy";
      node.innerHTML = '<div class="jz-busy-card">' +
        '<div class="jz-spinner" aria-hidden="true">' +
          '<svg viewBox="0 0 1024 1024" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M482.4576 72.192v190.7712c0 25.7024 21.3504 46.592 47.7184 46.592a47.104 47.104 0 0 0 47.6672-46.592V72.192A47.104 47.104 0 0 0 530.176 25.6a47.104 47.104 0 0 0-47.7184 46.592z"/>' +
            '<path opacity=".85" d="M125.44 333.3632l165.2224 95.4368a47.104 47.104 0 0 0 64.1536-18.0224 47.104 47.104 0 0 0-16.4352-64.6144L173.056 250.7776a47.104 47.104 0 0 0-64.1536 18.0224 47.104 47.104 0 0 0 16.4352 64.5632z"/>' +
            '<path opacity=".7" d="M173.056 773.2224L338.432 677.888a47.104 47.104 0 0 0 16.4352-64.6144 47.104 47.104 0 0 0-64.1536-18.0224l-165.2736 95.4368a47.104 47.104 0 0 0-16.4352 64.5632 47.104 47.104 0 0 0 64.1536 18.0224z"/>' +
            '<path opacity=".55" d="M577.8432 951.808v-190.7712a47.104 47.104 0 0 0-47.6672-46.592 47.104 47.104 0 0 0-47.7184 46.592v190.8224c0 25.7024 21.3504 46.5408 47.7184 46.5408a47.104 47.104 0 0 0 47.6672-46.592z"/>' +
            '<path opacity=".4" d="M934.912 690.6368l-165.2224-95.4368a47.104 47.104 0 0 0-64.1536 18.0224 47.104 47.104 0 0 0 16.4352 64.6144l165.2736 95.3856a47.104 47.104 0 0 0 64.1536-18.0224 47.104 47.104 0 0 0-16.4352-64.5632z"/>' +
            '<path opacity=".25" d="M887.2448 250.7776L721.9712 346.112a47.104 47.104 0 0 0-16.4352 64.6144 47.104 47.104 0 0 0 64.1536 18.0224l165.2736-95.4368a47.104 47.104 0 0 0 16.4352-64.5632 47.104 47.104 0 0 0-64.1536-18.0224z"/>' +
          "</svg>" +
        "</div>" +
        '<div class="jz-busy-text" id="jzBusyText">正在加载…</div>' +
        "</div>";
      document.body.appendChild(node);
    }
    if (!node) return;
    if (busyCounter > 0) {
      node.classList.add("open");
      var t = document.getElementById("jzBusyText");
      if (t && text) t.textContent = text;
    } else {
      node.classList.remove("open");
    }
  }

  /* ---------------- 顶部导航 ---------------- */
  var NAV_ICONS = {
    portal: '<svg class="jz-nav-icon" viewBox="0 0 1025 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M779 1024H595V827.6c0-14.4-11.6-26-26-26h-93.2c-14.4 0-26 11.8-26 26V1024H251c-54.8 0-99.4-44.6-99.4-99.4V600.2l-112.2-35-9-9c-26.6-26.6-26.6-69.6 0-96.2L470 20.4c12.8-12.8 29.8-20 48-20s35.2 7 48 20l439.6 439.8c12.8 12.8 20 30 19.8 48 0 18.2-7.2 35.2-20 48l-9 9L878 600.4v324.2c0.2 54.8-44.2 99.4-99 99.4z"/></svg>',
    basic: '<svg class="jz-nav-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M128 153.6h288v742.4H128z"/><path d="M488.0128 153.6H896v335.2832H487.9872z"/><path d="M488.0128 560.7168H896V896H487.9872z"/></svg>',
    value: '<svg class="jz-nav-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M512 0a512 512 0 1 0 512 512A512 512 0 0 0 512 0z m285.76 725.968a31.648 31.648 0 0 1-31.648 31.664H257.824a31.664 31.664 0 0 1-31.664-31.664v-3.696a31.664 31.664 0 0 1 31.664-31.648h508.208a31.648 31.648 0 0 1 31.648 31.648z m-8-239.584a31.408 31.408 0 0 1-2.992 0.128 33.6 33.6 0 0 1-33.344-30.528l-6.992-78.688-233.168 248.976-126.208-178.624-125.44 134.592a33.504 33.504 0 0 1-49.024-45.664l181.632-194.864 126.4 178.752 168.16-179.568-65.808 5.84a27.2 27.2 0 0 1-3.008 0.144 33.504 33.504 0 0 1-2.928-66.88l153.232-13.616c0.32 0 0.608 0.128 0.928 0.096a119.904 119.904 0 0 1 13.328 1.792c0.64 0.24 1.168 0.736 1.792 0.992a33.104 33.104 0 0 1 9.312 5.76c0.144 0.128 0.336 0.16 0.48 0.304 0.816 0.768 1.152 1.808 1.888 2.64a33.024 33.024 0 0 1 4.8 6.032c0.224 0.416 0.224 0.928 0.432 1.36a8952 8952 0 0 1 3.344 11.424l13.632 153.248a33.6 33.6 0 0 1-30.4 36.352z"/></svg>',
    result: '<svg class="jz-nav-icon" viewBox="0 0 1141 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0 296.420192v592.357191q0 46.200664 32.671266 78.834762 32.634098 32.708435 78.834762 32.708435h892.048227q46.200664 0 78.834762-32.708435 32.671266-32.634098 32.671266-78.797593V236.206937q0-29.586266-14.681627-55.30699-14.644458-25.646387-40.14217-40.736869L849.006899 15.499338q-28.285363-16.725904-61.105303-15.387832-32.85711 1.300904-59.730063 20.182591L393.244593 255.720492q-15.239157 10.704579-32.968616 4.906265L146.25874 190.452296q-54.080424-17.729458-100.169582 15.648013Q0 239.514949 0 296.420192z m85.227774 618.635445Q74.337352 904.165215 74.337352 888.777383V296.420192q0-18.956025 15.350663-30.106628 15.387832-11.150603 33.41464-5.203614l213.980069 70.17446q53.151207 17.432109 98.868678-14.718796l334.964109-235.463563q19.625061-13.789579 40.290845-1.598253l211.229586 124.738077q18.286989 10.778916 18.286989 31.965062v652.570446q0 15.387832-10.890422 26.278254t-26.278254 10.890422H111.506028q-15.387832 0-26.278254-10.890422z"/><path d="M250.851395 664.873278H160.345669c-17.580784 0-30.180965-12.377169-30.180965-29.697772V541.175924c0-17.320603 12.600181-29.697772 30.180965-29.697772h90.505726c17.580784 0 30.143796 12.377169 30.143796 29.734941v93.962413c0 17.320603-15.053314 29.697772-30.143796 29.697772zM944.641903 664.873278H366.483146c-20.108254 0-37.726206-17.320603-37.726206-37.131507v-81.622413c0-19.773736 17.617952-37.094339 37.726206-37.094339h578.158757c20.145422 0 37.726206 17.320603 37.726206 37.094339v81.622413c-2.52747 22.301206-17.580784 37.131507-37.726206 37.131507z"/></svg>',
    trend: '<svg class="jz-nav-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M201.671111 612.124444l-39.822222-40.391111 230.4-227.555555L540.444444 492.657778l280.462223-283.022222 40.391111 39.822222L540.444444 573.44l-147.626666-148.764444z"/><path d="M1024 853.333333H0V0h1024zM56.888889 796.444444h910.222222V56.888889H56.888889zM199.111111 967.111111h625.777778v56.888889H199.111111z"/></svg>',
    question: '<svg class="jz-nav-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M695.834947 296.421053H943.157895L646.736842 0v246.999579c0 29.911579 25.950316 49.421474 49.098105 49.421474z"/><path d="M638.814316 358.4c-41.849263 0-50.714947-8.973474-50.714948-51.2V0H182.272C117.948632 0 80.842105 55.754105 80.842105 102.4v819.2C80.842105 978.944 130.586947 1024 182.298947 1024h659.402106C897.024 1024 943.157895 976.572632 943.157895 921.6V358.4H638.814316z m25.357473 384H359.828211a25.573053 25.573053 0 0 1-25.357474-25.6c0-14.093474 11.398737-25.6 25.357474-25.6h304.343578c13.958737 0 25.357474 11.506526 25.357474 25.6a25.6 25.6 0 0 1-25.330526 25.6z m0-153.6H359.828211a25.573053 25.573053 0 0 1-25.357474-25.6c0-14.093474 11.398737-25.6 25.357474-25.6h304.343578c13.958737 0 25.357474 11.506526 25.357474 25.6a25.6 25.6 0 0 1-25.330526 25.6z m-177.529263-153.6h-126.814315a25.573053 25.573053 0 0 1-25.357474-25.6c0-14.093474 11.398737-25.6 25.357474-25.6h126.814315c13.931789 0 25.357474 11.506526 25.357474 25.6a25.6 25.6 0 0 1-25.357474 25.6z"/></svg>',
    strip: '<svg class="jz-nav-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="22" y="22" width="980" height="980" rx="70" ry="70" fill="none" stroke="currentColor" stroke-width="44"/><path d="M22.048374 22.048374h979.903252v256.643078H22.048374z"/><path d="M901.190555 546.72619H119.722673a22.048374 22.048374 0 0 1 0-44.096749h781.467882a22.048374 22.048374 0 0 1 0 44.096749zM901.190555 784.334171H119.722673a22.048374 22.048374 0 1 1 0-44.096749h781.467882a22.048374 22.048374 0 0 1 0 44.096749z"/><path d="M673.357353 932.352257a22.048374 22.048374 0 0 1-22.048374-22.048374v-540.185172a22.048374 22.048374 0 0 1 44.096748 0v540.185172a22.048374 22.048374 0 0 1-22.048374 22.048374zM347.555875 932.352257a22.048374 22.048374 0 0 1-22.048375-22.048375v-540.185172a22.048374 22.048374 0 0 1 44.096749 0v540.185172a22.048374 22.048374 0 0 1-22.048374 22.048374z"/></svg>'
  };

  function mountNav(options) {
    var opts = options || {};
    var base = opts.base === undefined ? "" : opts.base;
    var page = opts.page || "";
    window.JZ_NAV_BASE = base;
    var links = [
      { key: "portal", label: "首页", href: base + "portal.html" },
      { key: "basic", label: "基础分析", href: base + "systems/basic/basic.html" },
      { key: "value", label: "增值评价", href: base + "systems/value/add-analysis.html" },
      { key: "result", label: "结果评价", href: base + "systems/result/result-analysis.html" },
      { key: "trend", label: "趋势分析", href: base + "systems/trend/trend-analysis.html" },
      { key: "question", label: "试题分析", href: base + "systems/question/test-analysis.html" },
      { key: "strip", label: "导出成绩条", href: base + "systems/strip/score-strip.html" }
    ];
    var navHtml = links.map(function (l) {
      return '<a href="' + l.href + '" class="' + (l.key === page ? "active" : "") + '">' +
        (NAV_ICONS[l.key] || "") + '<span>' + esc(l.label) + "</span></a>";
    }).join("");

    var ready = false;
    try { ready = API.isReady(); } catch (e) { ready = false; }

    var AUTH = window.JZAuth;
    var user = AUTH ? AUTH.current() : null;
    var admin = AUTH ? AUTH.isAdmin(user) : false;

    var bodyStyle = window.getComputedStyle ? window.getComputedStyle(document.body) : null;
    var bodyIsFlex = !!(bodyStyle && /flex/.test(bodyStyle.display));

    var bar = document.createElement("header");
    bar.className = "jz-topbar" + (bodyIsFlex ? " jz-topbar-fixed" : "");
    bar.innerHTML =
      '<div class="jz-topbar-inner">' +
        '<a class="jz-brand" href="' + base + 'portal.html">' +
          '<span class="jz-brand-logo-wrap"><img class="jz-brand-logo" src="' + base + 'shared/assets/jzzxlogo.webp" alt="珠海市九洲中学校徽"></span>' +
          '<span class="jz-brand-text"><b>珠海市九洲中学</b><small>教育质量管理与分析系统</small></span>' +
        "</a>" +
        '<nav class="jz-nav">' + navHtml + "</nav>" +
        '<div class="jz-nav-right">' +
          '<span class="jz-cloud-state ' + (ready ? "ok" : "off") + '" title="' +
            (ready ? "已连接 Supabase，可直接选择云端考试" : "尚未配置 Supabase：请打开管理员入口 → 连接设置") + '">' +
            (ready ? "云端已连接" : "云端未配置") + "</span>" +
          (user
            ? '<span class="jz-user-chip" title="当前登录账号">' + esc(user.name) + (admin ? " · 管理员" : "老师，您好！") + "</span>" +
              '<button type="button" class="jz-logout" title="退出登录">退出</button>'
            : "") +
        "</div>" +
      "</div>";
    if (bodyIsFlex) document.body.classList.add("jz-has-fixed-nav");
    document.body.insertBefore(bar, document.body.firstChild);

    var logoutBtn = bar.querySelector(".jz-logout");
    if (logoutBtn && AUTH) {
      logoutBtn.addEventListener("click", function () { AUTH.logout(); });
    }

    var stateEl = bar.querySelector(".jz-cloud-state");
    function paintCloudState() {
      if (!stateEl) return;
      var ok = false;
      try { ok = API.isReady(); } catch (e) { ok = false; }
      stateEl.className = "jz-cloud-state " + (ok ? "ok" : "off");
      stateEl.textContent = ok ? "云端已连接" : "云端未配置";
      stateEl.title = ok
        ? "已连接 " + (API.config().url || "Supabase") + "，可直接选择云端考试"
        : "尚未配置 Supabase：请检查 config/supabase.json 或 config/supabase.js，或到管理员入口 → 连接设置";
    }
    paintCloudState();
    try { if (API.ready) API.ready().then(paintCloudState); } catch (e) { /* ignore */ }
  }

  /* ---------------- 未配置提示 ---------------- */
  var helpModal = null;
  function showSetupHelp() {
    if (!helpModal) {
      helpModal = document.createElement("div");
      helpModal.className = "jz-modal";
      var cfgErr = (window.JZ && window.JZ.CONFIG_ERROR) ? String(window.JZ.CONFIG_ERROR) : "";
      var cfgUrl = (window.JZ && window.JZ.CONFIG_URL) ? String(window.JZ.CONFIG_URL) : "config/supabase.json";
      helpModal.innerHTML =
        '<div class="jz-modal-card" style="max-width:560px">' +
          '<div class="jz-modal-head"><h3>还没有连接云端数据</h3>' +
            '<span class="jz-modal-tools"><button class="jz-icon-btn" data-close-help>×</button></span>' +
          "</div>" +
          '<div class="jz-modal-body">' +
            '<div class="jz-alert info">成绩数据保存在 Supabase 云端，系统会读取 <b>config/supabase.json</b>（http 访问）或 <b>config/supabase.js</b>（直接双击打开）获取连接信息。</div>' +
            (cfgErr ? '<div class="jz-alert warn">读取 ' + esc(cfgUrl) + ' 失败：' + esc(cfgErr) + "</div>" : "") +
            '<ol style="font-size:13px;line-height:2;color:#3f4558;padding-left:20px;margin:0 0 14px">' +
              "<li>在 Supabase 新建项目，执行 <b>database/schema.sql</b> 建表；</li>" +
              "<li>把 Project URL 与 anon key 填进 <b>config/supabase.json</b> 和 <b>config/supabase.js</b>（内容一致，全体访问者共用）；</li>" +
              "<li>用教师姓名 + 身份证号登录，管理员账号可在后台「管理员入口」上传成绩。</li>" +
            "</ol>" +
            '<p style="font-size:13px;color:#6e7484;margin:0">也可以用「管理员入口 → 连接设置」临时保存到本机浏览器。详细步骤见 docs 目录下的《Supabase配置与使用说明.md》。</p>' +
          "</div>" +
          '<div class="jz-modal-foot">' +
            '<a class="jz-btn primary" href="' + (window.JZ_NAV_BASE || "") + 'admin/admin.html">前往管理员入口</a>' +
            '<button class="jz-btn ghost" data-close-help>关闭</button>' +
          "</div>" +
        "</div>";
      document.body.appendChild(helpModal);
      helpModal.addEventListener("click", function (e) {
        if (e.target === helpModal || e.target.hasAttribute("data-close-help")) helpModal.classList.remove("open");
      });
    }
    helpModal.classList.add("open");
  }

  function ensureReady() {
    var ready = false;
    try { ready = API.isReady(); } catch (e) { ready = false; }
    if (!ready) showSetupHelp();
    return ready;
  }

  /* ---------------- 选择考试弹窗 ---------------- */
  var P = {
    modal: null,
    mode: "exam",
    opts: {},
    grades: [],
    exams: [],
    papers: [],
    grade: null,
    exam: null,
    paper: null,
    resolve: null
  };

  function rememberGrade(id) {
    if (id) saveLastGrade(id);
  }

  var EXAM_MEMORY_PREFIX = "jz_exam_memory_v1:";
  var EXAM_MEMORY_GLOBAL = "jz_exam_memory_v1:__global__";
  function rememberExam(page, exam, grade, extra) {
    if (!page || !exam) return;
    var value = {
      examId: exam.id,
      examName: exam.name || "",
      gradeId: grade && grade.id ? grade.id : "",
      gradeName: grade && grade.name ? grade.name : "",
      extra: extra || null,
      at: Date.now()
    };
    try { localStorage.setItem(EXAM_MEMORY_PREFIX + page, JSON.stringify(value)); } catch (e) { /* ignore */ }
    /* 同时记一份「全站最近一次选择的考试」，各系统都能接着用 */
    try { localStorage.setItem(EXAM_MEMORY_GLOBAL, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function readMemoryKey(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var value = JSON.parse(raw);
      return value && value.examId ? value : null;
    } catch (e) {
      return null;
    }
  }

  /* 本系统上次选的考试；ownOnly 为假时，没有就用全站最近一次（跨系统续用） */
  function getRememberedExam(page, ownOnly) {
    if (!page) return null;
    var own = readMemoryKey(EXAM_MEMORY_PREFIX + page);
    if (own || ownOnly) return own;
    return readMemoryKey(EXAM_MEMORY_GLOBAL);
  }

  function lastExam() {
    return readMemoryKey(EXAM_MEMORY_GLOBAL);
  }

  function lastGradeId() {
    try { return localStorage.getItem(LAST_GRADE_KEY) || ""; } catch (e) { return ""; }
  }
  function saveLastGrade(id) {
    try { localStorage.setItem(LAST_GRADE_KEY, id); } catch (e) { /* ignore */ }
  }

  function buildPicker() {
    if (P.modal) return;
    var wrap = document.createElement("div");
    wrap.className = "jz-modal";
    wrap.id = "jzPickModal";
    wrap.innerHTML =
      '<div class="jz-modal-card" role="dialog" aria-modal="true" aria-labelledby="jzPickTitle">' +
        '<div class="jz-modal-head">' +
          '<h3 id="jzPickTitle">选择考试成绩</h3>' +
          '<span class="jz-modal-tools">' +
            '<button class="jz-icon-btn" id="jzPickRefresh" title="刷新列表">↻</button>' +
            '<button class="jz-icon-btn" id="jzPickClose" title="关闭">×</button>' +
          "</span>" +
        "</div>" +
        '<div class="jz-modal-body">' +
          '<div class="jz-alert error" id="jzPickError" hidden></div>' +
          '<div class="jz-field">' +
            '<label>毕业年份（年级）<span class="jz-hint" id="jzPickGradeHint">先选年级</span></label>' +
            '<select class="jz-select" id="jzPickGrade"></select>' +
            '<span class="jz-grade-chip" id="jzPickGradeChip" style="display:none"></span>' +
          "</div>" +
          '<div class="jz-field">' +
            '<label>考试列表<span class="jz-hint">再选具体考试</span></label>' +
            '<div class="jz-exam-list" id="jzPickExams"></div>' +
          "</div>" +
          '<div class="jz-field" id="jzPickSubjectField" hidden>' +
            '<label>科目<span class="jz-hint">试题分析按科目保存</span></label>' +
            '<div class="jz-subject-list" id="jzPickSubjects"></div>' +
          "</div>" +
        "</div>" +
        '<div class="jz-modal-foot">' +
          '<span class="jz-pick-status" id="jzPickStatus"></span>' +
          '<button class="jz-btn ghost" id="jzPickCancel">取消</button>' +
          '<button class="jz-btn primary" id="jzPickOk" disabled>确定</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(wrap);
    P.modal = wrap;

    wrap.addEventListener("click", function (e) { if (e.target === wrap) closePicker(null); });
    wrap.querySelector("#jzPickClose").addEventListener("click", function () { closePicker(null); });
    wrap.querySelector("#jzPickCancel").addEventListener("click", function () { closePicker(null); });
    wrap.querySelector("#jzPickRefresh").addEventListener("click", function () { refreshAll(); });
    wrap.querySelector("#jzPickGrade").addEventListener("change", function (e) {
      var g = P.grades.filter(function (x) { return x.id === e.target.value; })[0] || null;
      P.grade = g;
      if (g) saveLastGrade(g.id);
      loadExams();
    });
    wrap.querySelector("#jzPickOk").addEventListener("click", function () {
      if (P.mode === "paper") {
        if (!P.paper) return;
        closePicker({ grade: P.grade, exam: P.exam, paper: P.paper });
      } else {
        if (!P.exam) return;
        closePicker({ grade: P.grade, exam: P.exam });
      }
    });
  }

  function closePicker(result) {
    if (P.modal) P.modal.classList.remove("open");
    var fn = P.resolve;
    P.resolve = null;
    if (fn) fn(result || null);
  }

  function setTitle() {
    var t = document.getElementById("jzPickTitle");
    if (!t) return;
    t.textContent = P.mode === "paper"
      ? (P.opts.title || "选择试题分析数据")
      : (P.opts.title || "选择考试成绩");
  }

  function setStatus(msg) {
    var s = document.getElementById("jzPickStatus");
    if (s) s.textContent = msg || "";
  }

  function showError(msg) {
    var box = document.getElementById("jzPickError");
    if (!box) return;
    if (!msg) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = "⚠️ " + esc(msg);
  }

  function setEmpty(container, text) {
    var raw = String(text === null || text === undefined ? "" : text);
    var loading = /读取|加载/.test(raw);
    container.innerHTML = '<div class="jz-empty">' +
      (loading ? '<span class="jz-loading">' + raw + "</span>" : raw) + "</div>";
  }

  function updateOk() {
    var ok = document.getElementById("jzPickOk");
    if (!ok) return;
    ok.disabled = P.mode === "paper" ? !P.paper : !P.exam;
  }

  function renderGrades() {
    var sel = document.getElementById("jzPickGrade");
    if (!sel) return;
    sel.innerHTML = P.grades.map(function (g) {
      var n = P.examCount && P.examCount[g.id] ? P.examCount[g.id] : 0;
      var stage = stageOfGrade(g.name);
      var tail = (stage ? " · " + stage : "") + (n ? "（" + n + " 场）" : "");
      return '<option value="' + esc(g.id) + '">' + esc(g.name + tail) + "</option>";
    }).join("");
    if (P.grade && P.grade.id) sel.value = P.grade.id;
    paintGradeChip(document.getElementById("jzPickGradeChip"), P.grade ? P.grade.name : "");
    var locked = !!(P.opts.lockGrade && P.opts.gradeId);
    sel.disabled = locked;
    var hint = document.getElementById("jzPickGradeHint");
    if (hint) hint.textContent = locked ? "已锁定为本年级" : "先选年级";
  }

  function renderExams() {
    var box = document.getElementById("jzPickExams");
    if (!box) return;
    if (!P.exams.length) {
      setEmpty(box, "这个年级还没有考试数据。<br>请打开「管理员入口」上传成绩，或换一个年级。");
      return;
    }
    box.innerHTML = P.exams.map(function (ex) {
      var tagClass = ex.scope === "区域" ? "" : (ex.scope === "校级" ? "school" : "muted");
      var meta = [];
      if (ex.student_count) meta.push(ex.student_count + " 人");
      if (ex.subjects && ex.subjects.length) meta.push(ex.subjects.length + " 科");
      if (ex.exam_date) meta.push(String(ex.exam_date).slice(0, 10));
      return '<button type="button" class="jz-exam-item' + (P.exam && P.exam.id === ex.id ? " selected" : "") +
        '" data-exam-id="' + esc(ex.id) + '">' +
        '<span class="jz-radio"></span>' +
        '<span class="jz-tag ' + tagClass + '">' + esc(ex.scope || "考试") + "</span>" +
        '<span class="jz-exam-name">' + esc(ex.name) + "</span>" +
        (meta.length ? '<span class="jz-exam-meta">' + esc(meta.join(" · ")) + "</span>" : "") +
        "</button>";
    }).join("");
  }

  function renderSubjects() {
    var field = document.getElementById("jzPickSubjectField");
    var box = document.getElementById("jzPickSubjects");
    if (!field || !box) return;
    if (P.mode !== "paper") { field.hidden = true; return; }
    field.hidden = false;
    if (!P.exam) {
      setEmpty(box, "请先选择考试");
      return;
    }
    if (!P.papers.length) {
      setEmpty(box, "这场考试还没有上传任何试题分析数据。<br>请先到「管理员入口 → 试题卷上传」按科目上传。");
      return;
    }
    box.innerHTML = P.papers.map(function (p) {
      var meta = p.question_count ? p.question_count + " 题" : "";
      return '<button type="button" class="jz-subject-item' + (P.paper && P.paper.id === p.id ? " selected" : "") +
        '" data-paper-id="' + esc(p.id) + '">' + esc(subjectLabel(p.subject)) +
        (meta ? '<span class="jz-sub-meta">' + esc(meta) + "</span>" : "") + "</button>";
    }).join("");
  }

  async function loadPapers(examId) {
    P.paper = null;
    renderSubjects();
    updateOk();
    try {
      P.papers = await STORE.listPapers("exam_id=eq." + encodeURIComponent(examId));
    } catch (e) {
      P.papers = [];
      showError(e.message);
    }
    renderSubjects();
    updateOk();
  }

  async function loadExams() {
    P.exam = null;
    P.papers = [];
    P.paper = null;
    paintGradeChip(document.getElementById("jzPickGradeChip"), P.grade ? P.grade.name : "");
    renderExams();
    renderSubjects();
    updateOk();
    if (!P.grade) return;
    var box = document.getElementById("jzPickExams");
    setEmpty(box, "正在读取考试列表…");
    setStatus("正在读取考试…");
    try {
      P.exams = await STORE.listExams(P.grade.id);
      showError("");
      renderExams();
      var wantId = P.opts.examId || "";
      if (!wantId) {
        /* 没有指定考试时，默认把上次用过的考试选中，省一次点击 */
        var mem = lastExam();
        if (mem && mem.examId) wantId = mem.examId;
      }
      if (wantId) {
        var target = P.exams.filter(function (x) { return x.id === wantId; })[0];
        if (target) await selectExam(target);
      }
    } catch (e) {
      setEmpty(box, "读取失败：" + esc(e.message));
      showError(e.message);
    } finally {
      setStatus("");
    }
  }

  async function selectExam(exam) {
    P.exam = exam;
    renderExams();
    updateOk();
    if (P.mode === "paper") {
      setStatus("正在读取科目…");
      await loadPapers(exam.id);
      setStatus("");
    }
  }

  async function refreshAll() {
    showError("");
    setStatus("正在读取年级…");
    var sel = document.getElementById("jzPickGrade");
    if (sel) sel.innerHTML = '<option>读取中…</option>';
    try {
      P.grades = await STORE.listGrades();
    } catch (e) {
      P.grades = [];
      showError(e.message);
      setEmpty(document.getElementById("jzPickExams"), "读取年级失败");
      setStatus("");
      return;
    }
    if (!P.grades.length) {
      renderGrades();
      setEmpty(document.getElementById("jzPickExams"),
        "还没有任何年级数据。<br>请打开「管理员入口 → 成绩上传」，选择或新建年级后上传第一份成绩。");
      setStatus("");
      return;
    }

    /* 统计各年级已上传的考试场次，并默认打开“有数据”的年级，
       避免默认停在还没有考试的年级上，让人误以为没有数据 */
    var examCount = {};
    var newestGradeId = "";
    try {
      var allExams = await STORE.listAllExams(500);
      (allExams || []).forEach(function (ex) {
        examCount[ex.grade_id] = (examCount[ex.grade_id] || 0) + 1;
      });
      if (allExams && allExams.length) newestGradeId = allExams[0].grade_id;
    } catch (e) { /* 统计失败不影响选择 */ }
    P.examCount = examCount;

    function hasGrade(id) {
      return P.grades.some(function (g) { return g.id === id; });
    }
    var lockedId = P.opts.lockGrade ? P.opts.gradeId : "";
    var prefer = P.opts.examId ? "" : (P.opts.gradeId || lastGradeId());
    var chosen = "";
    if (lockedId && hasGrade(lockedId)) chosen = lockedId;
    else if (prefer && hasGrade(prefer) && examCount[prefer]) chosen = prefer;
    else if (newestGradeId && hasGrade(newestGradeId)) chosen = newestGradeId;
    else if (prefer && hasGrade(prefer)) chosen = prefer;
    else chosen = P.grades[0].id;

    P.grade = P.grades.filter(function (g) { return g.id === chosen; })[0] || P.grades[0];
    saveLastGrade(P.grade.id);
    renderGrades();
    await loadExams();
  }

  async function openPicker(mode, options) {
    try {
      if (API.ready) await API.ready();
    } catch (e) { /* ignore */ }
    if (!ensureReady()) return null;
    buildPicker();
    P.mode = mode;
    P.opts = options || {};
    P.papers = [];
    P.paper = null;
    P.exam = null;
    setTitle();
    updateOk();
    P.modal.classList.add("open");
    return new Promise(function (resolve) {
      P.resolve = resolve;
      refreshAll();
    });
  }

  // 年级切换 / 考试点击事件（事件委托）
  document.addEventListener("click", function (e) {
    var examBtn = e.target.closest ? e.target.closest(".jz-exam-item") : null;
    if (examBtn && P.modal && P.modal.contains(examBtn)) {
      var id = examBtn.getAttribute("data-exam-id");
      var exam = P.exams.filter(function (x) { return x.id === id; })[0];
      if (exam) selectExam(exam);
      return;
    }
    var subBtn = e.target.closest ? e.target.closest(".jz-subject-item") : null;
    if (subBtn && P.modal && P.modal.contains(subBtn)) {
      var pid = subBtn.getAttribute("data-paper-id");
      var paper = P.papers.filter(function (x) { return x.id === pid; })[0];
      if (paper) {
        P.paper = paper;
        renderSubjects();
        updateOk();
      }
    }
  });

  function pickExam(options) { return openPicker("exam", options); }
  function pickPaper(options) { return openPicker("paper", options); }

  window.JZUI = {
    mountNav: mountNav,
    pickExam: pickExam,
    pickPaper: pickPaper,
    rememberGrade: rememberGrade,
    rememberExam: rememberExam,
    lastExam: lastExam,
    lastGradeId: lastGradeId,
    getRememberedExam: getRememberedExam,
    busy: busy,
    toast: toast,
    ensureReady: ensureReady,
    showSetupHelp: showSetupHelp,
    gradeColorIndex: gradeColorIndex,
    gradeChipStyle: gradeChipStyle,
    gradeChip: gradeChip,
    stageOfGrade: stageOfGrade,
    escapeHtml: esc
  };
})();
