/* =========================================================
   Supabase REST 访问层（无第三方 SDK，直接使用 fetch）
   ---------------------------------------------------------
   对外暴露：window.JZCloud
     config()            当前生效的连接配置
     isReady()           是否已配置
     setConfig()/clearConfig()   浏览器本地覆盖配置（管理员“连接设置”使用）
     select/insert/upsert/update/remove/count   数据表操作
     signIn()/signOut()/session()               可选的 Supabase 账号登录
   ========================================================= */
(function () {
  "use strict";

  var TABLES = (window.JZ && window.JZ.TABLES) || {};
  var OVERRIDE_KEY = "jz_supabase_override_v1";
  var TOKEN_KEY = "jz_supabase_session_v1";
  var TEACHER_TOKEN_KEY = "jz_session_token_v1";
  var TIMEOUT_MS = 40000;

  /* 教师会话令牌（登录后由 login_teacher 发放，随请求头发给数据库） */
  function teacherToken() {
    try {
      var t = localStorage.getItem(TEACHER_TOKEN_KEY);
      if (t) return String(t);
    } catch (e) { /* ignore */ }
    try {
      var s = sessionStorage.getItem(TEACHER_TOKEN_KEY);
      if (s) return String(s);
    } catch (e) { /* ignore */ }
    return "";
  }

  function setTeacherToken(token, remember) {
    var value = String(token || "").trim();
    try {
      if (!value) {
        localStorage.removeItem(TEACHER_TOKEN_KEY);
        sessionStorage.removeItem(TEACHER_TOKEN_KEY);
      } else if (remember) {
        localStorage.setItem(TEACHER_TOKEN_KEY, value);
        sessionStorage.removeItem(TEACHER_TOKEN_KEY);
      } else {
        sessionStorage.setItem(TEACHER_TOKEN_KEY, value);
        localStorage.removeItem(TEACHER_TOKEN_KEY);
      }
    } catch (e) { /* ignore */ }
  }

  function trimSlash(u) {
    return String(u || "").trim().replace(/\/+$/, "");
  }

  function fileCfg() {
    var s = (window.JZ && window.JZ.SUPABASE) || {};
    return { url: trimSlash(s.url), anonKey: String(s.anonKey || "").trim() };
  }

  function readOverride() {
    try {
      var raw = localStorage.getItem(OVERRIDE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.url || !obj.anonKey) return null;
      return { url: trimSlash(obj.url), anonKey: String(obj.anonKey).trim() };
    } catch (e) {
      return null;
    }
  }

  function writeOverride(obj) {
    try {
      if (!obj) localStorage.removeItem(OVERRIDE_KEY);
      else localStorage.setItem(OVERRIDE_KEY, JSON.stringify(obj));
    } catch (e) { /* file:// 或隐私模式下忽略 */ }
  }

  function config() {
    var local = readOverride();
    var base = fileCfg();
    var url = trimSlash(local ? local.url : base.url);
    var anonKey = local ? String(local.anonKey).trim() : base.anonKey;
    var ready = !!url && !!anonKey &&
      !/your[-_]?project/i.test(url) &&
      !/^YOUR/i.test(anonKey) &&
      !/替换|填写/.test(url + anonKey);
    var source = local ? "local" : ((window.JZ && window.JZ.CONFIG_SOURCE) || "inline");
    return {
      url: url,
      anonKey: anonKey,
      ready: ready,
      source: source,
      configUrl: (window.JZ && window.JZ.CONFIG_URL) || ""
    };
  }

  function isReady() {
    return config().ready;
  }

  /* 等待 supabase.json 读取完成（页面初始化时用） */
  function ready() {
    var p = window.JZ && window.JZ.configReady;
    if (!p || typeof p.then !== "function") return Promise.resolve(isReady());
    return p.then(function () { return isReady(); }, function () { return isReady(); });
  }

  function session() {
    try {
      var raw = sessionStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.access_token) return null;
      if (s.expires_at && Date.now() > Number(s.expires_at)) return null;
      return s;
    } catch (e) {
      return null;
    }
  }

  function token() {
    var s = session();
    return s ? s.access_token : "";
  }

  function tableName(key) {
    return TABLES[key] || key;
  }

  async function readError(res) {
    var text = "";
    try { text = await res.text(); } catch (e) { /* ignore */ }
    var msg = "HTTP " + res.status;
    if (text) {
      try {
        var j = JSON.parse(text);
        msg = j.message || j.error_description || j.error || msg;
        if (j.hint) msg += "（" + j.hint + "）";
        if (j.details && j.details !== j.message) msg += " " + j.details;
      } catch (e) {
        msg += " " + text.slice(0, 180);
      }
    }
    if (res.status === 404) {
      msg = "数据表不存在，请先在 Supabase SQL Editor 中执行建表脚本 database/schema.sql";
    } else if (res.status === 401 || res.status === 403) {
      msg += "（缺少权限：请检查 anon key 是否正确，以及 schema.sql 里的 RLS 策略是否已执行）";
    }
    return new Error(msg);
  }

  async function request(url, options) {
    var controller = null;
    var timer = null;
    if (typeof AbortController !== "undefined") {
      controller = new AbortController();
      timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    }
    var opts = Object.assign({}, options);
    if (controller) opts.signal = controller.signal;
    try {
      var res = await fetch(url, opts);
      if (!res.ok) throw await readError(res);
      var raw = await res.text();
      var json = null;
      if (raw) {
        try { json = JSON.parse(raw); } catch (e) { json = null; }
      }
      return { json: json, headers: res.headers, status: res.status };
    } catch (err) {
      if (err && err.name === "AbortError") {
        throw new Error("请求超时，请检查网络连接或 Supabase 项目地址");
      }
      if (err && /Failed to fetch|NetworkError|Load failed/i.test(String(err.message || err))) {
        throw new Error("无法连接 Supabase（地址可能有误、项目已暂停或网络被拦截）");
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function apiHeaders(extra) {
    var cfg = config();
    var headers = {
      "apikey": cfg.anonKey,
      "Authorization": "Bearer " + (token() || cfg.anonKey),
      "Content-Type": "application/json"
    };
    var sid = teacherToken();
    if (sid) headers["X-Session-Token"] = sid;
    if (extra) {
      Object.keys(extra).forEach(function (k) { headers[k] = extra[k]; });
    }
    return headers;
  }

  function restUrl(table, query) {
    var cfg = config();
    if (!cfg.ready) throw new Error("尚未配置 Supabase：请先填写项目地址与 anon key");
    var q = query ? (query.charAt(0) === "?" ? query : "?" + query) : "";
    return cfg.url + "/rest/v1/" + table + q;
  }

  async function select(table, query) {
    var r = await request(restUrl(tableName(table), query), { method: "GET", headers: apiHeaders() });
    return r.json || [];
  }

  async function selectOne(table, query) {
    var rows = await select(table, query);
    return rows && rows.length ? rows[0] : null;
  }

  async function count(table, query) {
    var extra = (query ? "&" + query.replace(/^\?/, "") : "");
    var r = await request(restUrl(tableName(table), "select=id" + extra), {
      method: "GET",
      headers: apiHeaders({ "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0" })
    });
    var range = (r.headers && r.headers.get && r.headers.get("content-range")) || "";
    var total = parseInt(String(range).split("/")[1], 10);
    if (Number.isFinite(total)) return total;
    return Array.isArray(r.json) ? r.json.length : 0;
  }

  async function insert(table, rows) {
    var payload = Array.isArray(rows) ? rows : [rows];
    var r = await request(restUrl(tableName(table)), {
      method: "POST",
      headers: apiHeaders({ "Prefer": "return=representation" }),
      body: JSON.stringify(payload)
    });
    return r.json || [];
  }

  async function upsert(table, rows, onConflict) {
    var payload = Array.isArray(rows) ? rows : [rows];
    var query = onConflict
      ? "on_conflict=" + encodeURIComponent(onConflict) + "&select=*"
      : "select=*";
    var r = await request(restUrl(tableName(table), query), {
      method: "POST",
      headers: apiHeaders({ "Prefer": "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(payload)
    });
    return r.json || [];
  }

  async function update(table, query, patch) {
    var q = (query ? query.replace(/^\?/, "") + "&" : "") + "select=*";
    var r = await request(restUrl(tableName(table), q), {
      method: "PATCH",
      headers: apiHeaders({ "Prefer": "return=representation" }),
      body: JSON.stringify(patch)
    });
    return r.json || [];
  }

  async function remove(table, query) {
    await request(restUrl(tableName(table), query), {
      method: "DELETE",
      headers: apiHeaders({ "Prefer": "return=minimal" })
    });
    return true;
  }

  /* ---------- 可选：Supabase 账号登录（写入鉴权） ---------- */
  async function callRpc(fn, args) {
    var cfg = config();
    if (!cfg.ready) throw new Error("尚未配置 Supabase：请先填写项目地址与 anon key");
    var r = await request(cfg.url + "/rest/v1/rpc/" + encodeURIComponent(fn), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(args || {})
    });
    return r.json;
  }

  async function signIn(email, password) {
    var cfg = config();
    if (!cfg.ready) throw new Error("尚未配置 Supabase");
    var res = await fetch(cfg.url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { "apikey": cfg.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    });
    if (!res.ok) throw await readError(res);
    var data = await res.json();
    var sess = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + Math.max(60, Number(data.expires_in || 3600) - 60) * 1000,
      email: email
    };
    try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(sess)); } catch (e) { /* ignore */ }
    return sess;
  }

  function signOut() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  }

  /* 教师会话：登录后写入，退出时服务端删除 + 本地清除 */
  async function logoutTeacher() {
    var sid = teacherToken();
    setTeacherToken("", false);
    if (!sid) return true;
    try {
      await callRpc("logout_teacher", { p_token: sid });
    } catch (e) { /* 网络问题也不影响本地退出 */ }
    return true;
  }

  async function testConnection() {
    var cfg = config();
    if (!cfg.ready) throw new Error("尚未配置 Supabase 地址与 anon key");
    await select("grades", "select=id&limit=1");
    return true;
  }

  window.JZCloud = {
    config: config,
    isReady: isReady,
    ready: ready,
    setConfig: function (url, anonKey) {
      writeOverride({ url: trimSlash(url), anonKey: String(anonKey || "").trim() });
    },
    clearConfig: function () { writeOverride(null); },
    select: select,
    selectOne: selectOne,
    count: count,
    insert: insert,
    upsert: upsert,
    update: update,
    remove: remove,
    callRpc: callRpc,
    signIn: signIn,
    signOut: signOut,
    teacherToken: teacherToken,
    setTeacherToken: setTeacherToken,
    logoutTeacher: logoutTeacher,
    session: session,
    testConnection: testConnection,
    request: request
  };
})();
