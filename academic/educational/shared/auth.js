/* =========================================================
   统一登录与权限
   ---------------------------------------------------------
   账号来源：Supabase teacher_accounts 表（密码存加盐哈希）
     · 账号 = 教师姓名
     · 密码 = 身份证号后 8 位（填完整身份证号时自动截取后 8 位）
     · role = admin 的账号可进入管理员后台
   登录校验在数据库函数 login_teacher 里完成，前端拿不到 salt 与哈希；
   只有云端不可用时，才退回本机离线账号文件（data/teacher-accounts.hash.js）。
   登录态只在本机保存「姓名 + 角色 + 随机标记」，不保存密码或哈希。
   对外暴露：window.JZAuth
   ========================================================= */
(function () {
  "use strict";

  var script = document.currentScript;
  var scriptUrl = new URL(script && script.src ? script.src : "shared/auth.js", window.location.href);
  var ROOT = new URL("../", scriptUrl);
  var ACCOUNTS_URL = new URL("data/teacher-accounts.json", ROOT).href;
  var LOGIN_URL = new URL("login.html", ROOT).href;
  var STORAGE_KEY = "jz_auth_user_v1";
  var PUBLIC_PAGE = !!window.JZ_AUTH_PUBLIC;
  /* 本地兜底账号脚本：先找含明文的本机文件（不入库），再找入库的加盐哈希文件 */
  var FALLBACK_SCRIPTS = ["data/teacher-accounts.js", "data/teacher-accounts.hash.js"];

  function text(v) { return v === null || v === undefined ? "" : String(v).trim(); }

  /* 密码规则：输入完整身份证号（18 位）时自动取后 8 位；
     其它情况按输入原样使用（兼容自设密码与已经只填后 8 位的老师） */
  function canonicalPassword(input) {
    var s = text(input);
    if (/^\d{17}[\dXx]$/.test(s)) return s.slice(-8).toUpperCase();
    return s;
  }

  /* 登录时同时接受「完整身份证号」与「后 8 位」，方便老师过渡期不改习惯 */
  function passwordVariants(input) {
    var s = text(input);
    var out = [s];
    var tail = canonicalPassword(s);
    if (tail && tail !== s) out.push(tail);
    return out;
  }

  /* 登录态只保存「姓名 + 账号指纹」：
     云端账号指纹是数据库里的加盐哈希（不可逆推身份证号），
     本地明文兜底账号才退化为 p:<密码>。旧版本存下的明文记录会自动迁移。 */
  function readStored() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (!raw) {
      try { raw = sessionStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    }
    if (!raw) return null;
    try {
      var obj = JSON.parse(raw);
      if (!obj || !text(obj.name)) return null;
      var key = text(obj.key);
      if (!key && text(obj.password)) key = "p:" + text(obj.password);
      if (!key) return null;
      return {
        name: text(obj.name),
        key: key,
        role: obj.role === "admin" ? "admin" : "user",
        remember: obj.remember === true
      };
    } catch (e) {
      return null;
    }
  }

  function writeStored(user) {
    var payload = JSON.stringify({
      name: user.name,
      key: user.key,
      role: user.role === "admin" ? "admin" : "user",
      remember: user.remember === true
    });
    var remember = user.remember === true;
    try {
      if (remember) {
        localStorage.setItem(STORAGE_KEY, payload);
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, payload);
        localStorage.removeItem(STORAGE_KEY);
      }
      return true;
    } catch (e) {
      /* 一种存储不可用时退回另一种 */
      try {
        (remember ? sessionStorage : localStorage).setItem(STORAGE_KEY, payload);
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  function clearStored() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  /* 本地账号：既支持明文 password，也支持加盐哈希（pwd_hash + salt） */
  function normalizeAccount(item) {
    if (!item) return null;
    var name = text(item.name);
    if (!name) return null;
    var hash = text(item.pwd_hash || item.pwdHash || item.hash).toUpperCase();
    var role = (item.role === "admin" || name === "黄结") ? "admin" : "user";
    if (hash) return { name: name, salt: text(item.salt), hash: hash, role: role };
    var password = text(item.password);
    if (!password) return null;
    return { name: name, password: password, role: role };
  }

  function accountMatches(acc, password) {
    if (!acc) return false;
    var list = passwordVariants(password);
    if (acc.hash) {
      if (typeof window.JZSha256 !== "function") return false;
      for (var i = 0; i < list.length; i++) {
        if (String(window.JZSha256(text(acc.salt) + ":" + list[i])).toUpperCase() === acc.hash) return true;
      }
      return false;
    }
    for (var j = 0; j < list.length; j++) {
      if (String(acc.password || "").toUpperCase() === list[j].toUpperCase()) return true;
    }
    return false;
  }

  function xhrText(url) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onload = function () {
        if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.responseText)) {
          resolve(xhr.responseText);
        } else {
          reject(new Error("HTTP " + xhr.status));
        }
      };
      xhr.onerror = function () { reject(new Error("读取失败")); };
      xhr.send();
    });
  }

  function loadAccountsScript() {
    if (window.JZ_TEACHER_ACCOUNTS) return Promise.resolve(window.JZ_TEACHER_ACCOUNTS);
    return FALLBACK_SCRIPTS.reduce(function (chain, file) {
      return chain.catch(function () {
        return new Promise(function (resolve, reject) {
          var key = file.indexOf("hash") >= 0 ? "JZ_TEACHER_ACCOUNTS_HASH" : "JZ_TEACHER_ACCOUNTS";
          var script = document.createElement("script");
          script.src = new URL(file, ROOT).href;
          script.onload = function () {
            var data = window[key] || window.JZ_TEACHER_ACCOUNTS;
            if (data) resolve(data);
            else reject(new Error("教师账号文件格式不正确：" + file));
          };
          script.onerror = function () { reject(new Error("无法读取 " + file)); };
          document.head.appendChild(script);
        });
      });
    }, Promise.reject(new Error("start"))).catch(function () {
      throw new Error("无法读取教师账号文件");
    });
  }

  async function fetchAccounts() {
    try {
      var res = await fetch(ACCOUNTS_URL, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (e) { /* 继续尝试 XHR */ }
    try {
      var txt = await xhrText(ACCOUNTS_URL);
      return JSON.parse(txt);
    } catch (e) {
      // 直接用 file:// 打开时浏览器会拦截读取本地 JSON，
      // 改用同内容的 JS 版本（data/teacher-accounts.js）。
      return loadAccountsScript();
    }
  }

  /* 只读本机兜底账号（云端登录已改为服务端函数，不再拉取账号表） */
  function loadAccounts() {
    return loadLocalAccounts();
  }

  function current() {
    return readStored();
  }

  function isAdmin(user) {
    var u = user || current();
    return !!u && (u.role === "admin" || u.name === "黄结");
  }

  function safeNext() {
    var next = "";
    try { next = new URLSearchParams(window.location.search).get("next") || ""; } catch (e) { next = ""; }
    if (!next) return new URL("portal.html", ROOT).href;
    try {
      var target = new URL(next, window.location.href);
      var root = new URL(ROOT.href);
      if (target.protocol !== root.protocol) return new URL("portal.html", ROOT).href;
      if (target.protocol === "file:") return target.href;
      if (target.origin === root.origin) return target.href;
    } catch (e) { /* ignore */ }
    return new URL("portal.html", ROOT).href;
  }

  function redirectToLogin() {
    if (PUBLIC_PAGE) return;
    var next = window.location.href;
    window.location.replace(LOGIN_URL + "?next=" + encodeURIComponent(next));
  }

  function login(name, password, options) {
    var remember = !!(options && options.remember);
    var n = text(name);
    var p = text(password);
    if (!n || !p) return Promise.resolve({ ok: false, error: "请输入姓名与密码。" });
    return loginCloud(n, p).then(function (res) {
      if (res.state === "ok") return saveSession(res.user, remember);
      if (res.state === "invalid") return { ok: false, error: "姓名或密码不正确，请核对后重试。" };
      if (res.state === "nofunc") {
        return { ok: false, error: "登录服务尚未初始化（数据库缺少 login_teacher 函数），请联系管理员执行 database/rls-login.sql。" };
      }
      /* 云端不可用：退回本机离线账号文件 */
      return loginLocal(n, p).then(function (found) {
        if (!found) {
          return { ok: false, error: "云端暂时无法连接，本机也没有可用的离线账号数据，请稍后重试。" };
        }
        return saveSession(found, remember);
      });
    }).catch(function (err) {
      return { ok: false, error: err && err.message ? err.message : "登录失败，请稍后重试。" };
    });
  }

  /* 云端登录：调用 Supabase 函数 login_teacher，密码在数据库里比对，
     前端从头到尾拿不到 salt 与 pwd_hash。
     数据库可能是两参数（未启用会话令牌）或三参数（已启用）版本，两种都要能登。 */
  async function loginCloud(name, password) {
    if (!window.JZCloud || typeof window.JZCloud.callRpc !== "function") return { state: "unavailable" };
    try { await window.JZCloud.ready(); } catch (e) { return { state: "unavailable" }; }
    if (!window.JZCloud.isReady || !window.JZCloud.isReady()) return { state: "unavailable" };
    var ua = (window.navigator && navigator.userAgent) ? String(navigator.userAgent).slice(0, 180) : null;
    var rows;
    try {
      rows = await window.JZCloud.callRpc("login_teacher", { p_name: name, p_password: password, p_ua: ua });
    } catch (err) {
      var msg = String((err && err.message) || err || "");
      if (!/Could not find the function|does not exist|schema cache|404/i.test(msg)) return { state: "unavailable" };
      /* 退回两参数版本（数据库还没执行 rls-session.sql） */
      try {
        rows = await window.JZCloud.callRpc("login_teacher", { p_name: name, p_password: password });
      } catch (err2) {
        var msg2 = String((err2 && err2.message) || err2 || "");
        if (/Could not find the function|does not exist|schema cache|404/i.test(msg2)) return { state: "nofunc" };
        return { state: "unavailable" };
      }
    }
    if (Array.isArray(rows) && rows.length) return { state: "ok", user: rows[0] };
    return { state: "invalid" };
  }

  /* 本机离线兜底：只在云端不可用时才会执行 */
  async function loginLocal(name, password) {
    var list = await loadLocalAccounts();
    var n = text(name);
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === n && accountMatches(list[i], password)) return list[i];
    }
    return null;
  }

  /* 登录态里不再保存密码或哈希，只留一个随机标记（仅用于判断"登录过没有"） */
  function newSessionKey() {
    return "s:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function saveSession(user, remember) {
    /* 云端登录会带回会话令牌：后续所有取数请求都靠它，令牌失效就重新登录 */
    if (window.JZCloud && typeof window.JZCloud.setTeacherToken === "function") {
      window.JZCloud.setTeacherToken((user && user.token) || "", remember === true);
    }
    var stored = {
      name: text(user.name),
      role: user.role === "admin" ? "admin" : "user",
      key: newSessionKey(),
      remember: remember === true
    };
    if (!writeStored(stored)) {
      return { ok: false, error: "浏览器禁止保存登录状态，请允许本站使用本地存储后重试。" };
    }
    return { ok: true, user: { name: stored.name, role: stored.role, local: !!user.local } };
  }

  function logout(redirect) {
    if (window.JZCloud && typeof window.JZCloud.logoutTeacher === "function") {
      try { window.JZCloud.logoutTeacher(); } catch (e) { /* ignore */ }
    }
    clearStored();
    if (redirect !== false) window.location.replace(LOGIN_URL);
  }

  function ready() {
    return PUBLIC_PAGE ? Promise.resolve(current()) : require();
  }

  /* 使用本机已保存的登录态；登录校验已在服务端完成，页面加载不再回读账号表 */
  function revalidate() {
    var stored = readStored();
    return Promise.resolve(stored ? sessionUser(stored) : null);
  }

  function sessionUser(stored) {
    return { name: stored.name, role: stored.role, key: stored.key, local: false };
  }

  /* 仅供离线校验用：读本地兜底账号（明文 .js / 入库的哈希 .js） */
  var localAccountsCache = null;
  function loadLocalAccounts() {
    if (localAccountsCache) return Promise.resolve(localAccountsCache);
    return (async function () {
      try {
        var raw = window.JZ_TEACHER_ACCOUNTS || window.JZ_TEACHER_ACCOUNTS_HASH || null;
        if (!raw) raw = await fetchAccounts();
        var list = Array.isArray(raw) ? raw : (raw && raw.accounts) || [];
        localAccountsCache = list.map(normalizeAccount).filter(Boolean);
        localAccountsCache.forEach(function (a) { a.local = true; });
      } catch (e) {
        localAccountsCache = [];
      }
      return localAccountsCache;
    })();
  }

  function require() {
    var stored = readStored();
    if (!stored) {
      redirectToLogin();
      return Promise.reject(new Error("未登录"));
    }
    return Promise.resolve(sessionUser(stored));
  }

  /* =========================================================
     SHA-256（纯 JS，登录密码哈希用；HTTP 局域网与 file:// 都能跑）
     ========================================================= */
  var SHA256_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function sha256Rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  function sha256Utf8(str) {
    if (window.TextEncoder) return new TextEncoder().encode(String(str));
    var s = unescape(encodeURIComponent(String(str)));
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function sha256Hex(input) {
    var bytes = sha256Utf8(input);
    var l = bytes.length;
    var total = ((l + 8) >> 6 << 6) + 64;
    var m = new Uint8Array(total);
    m.set(bytes);
    m[l] = 0x80;
    var bitsHi = Math.floor((l * 8) / 4294967296);
    var bitsLo = (l * 8) >>> 0;
    m[total - 8] = (bitsHi >>> 24) & 255;
    m[total - 7] = (bitsHi >>> 16) & 255;
    m[total - 6] = (bitsHi >>> 8) & 255;
    m[total - 5] = bitsHi & 255;
    m[total - 4] = (bitsLo >>> 24) & 255;
    m[total - 3] = (bitsLo >>> 16) & 255;
    m[total - 2] = (bitsLo >>> 8) & 255;
    m[total - 1] = bitsLo & 255;

    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Uint32Array(64);
    for (var off = 0; off < total; off += 64) {
      for (var i = 0; i < 16; i++) {
        w[i] = (((m[off + i * 4] << 24) | (m[off + i * 4 + 1] << 16) |
          (m[off + i * 4 + 2] << 8) | m[off + i * 4 + 3]) >>> 0);
      }
      for (var j = 16; j < 64; j++) {
        var s0 = (sha256Rotr(w[j - 15], 7) ^ sha256Rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3)) >>> 0;
        var s1 = (sha256Rotr(w[j - 2], 17) ^ sha256Rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10)) >>> 0;
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (var k = 0; k < 64; k++) {
        var S1 = (sha256Rotr(e, 6) ^ sha256Rotr(e, 11) ^ sha256Rotr(e, 25)) >>> 0;
        var ch = ((e & f) ^ (~e & g)) >>> 0;
        var t1 = (h + S1 + ch + SHA256_K[k] + w[k]) >>> 0;
        var S0 = (sha256Rotr(a, 2) ^ sha256Rotr(a, 13) ^ sha256Rotr(a, 22)) >>> 0;
        var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var hex = "";
    for (var n = 0; n < 8; n++) hex += ("00000000" + H[n].toString(16)).slice(-8);
    return hex;
  }

  window.JZSha256 = sha256Hex;

  window.JZAuth = {
    rootUrl: ROOT.href,
    accountsUrl: ACCOUNTS_URL,
    loginUrl: LOGIN_URL,
    current: current,
    isAdmin: isAdmin,
    login: login,
    logout: logout,
    ready: ready,
    require: require,
    revalidate: revalidate,
    loadAccounts: loadAccounts,
    safeNext: safeNext
  };

  if (!PUBLIC_PAGE) {
    /* 等所有脚本加载完再校验：auth.js 常常加载在云端脚本之前，
       延迟校验才能优先使用云端账号（含密码哈希）而不是本地文件 */
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { require().catch(function () { /* 已跳转登录页 */ }); });
    } else {
      require().catch(function () { /* 已跳转登录页 */ });
    }
  }
})();
