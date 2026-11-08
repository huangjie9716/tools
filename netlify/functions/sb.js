'use strict';

/**
 * Supabase 同域反向代理（Netlify Function）
 * ------------------------------------------------------------
 * 浏览器请求：  https://你的站点/api/sb/rest/v1/messages?select=...
 * 函数转发到：  https://<项目>.supabase.co/rest/v1/messages?select=...
 *
 * 为什么需要它：
 *   supabase.co 在国内移动网络、微信 / QQ 内置浏览器里连不上，
 *   但你自己站点的域名是通的。让请求先到 Netlify，再由 Netlify
 *   从服务器出口去访问 Supabase，浏览器全程只跟同域打交道，
 *   既绕开网络封锁，也顺带没有 CORS 问题。
 *
 * 换 Supabase 项目时：只改下面 SUPABASE_ORIGIN 一行。
 * 前端配套改动见 index.html 里的 SUPABASE_PROXY_BASE。
 */

var SUPABASE_ORIGIN = 'https://nmwtgxmqlmezcjtnxgqk.supabase.co';

// 只放行数据接口，避免这个函数被当成任意网站的公网代理
var ALLOWED_PREFIXES = ['/rest/v1/'];

// 只透传 Supabase 需要的请求头；host / cookie / connection 等一律不带
var FORWARD_HEADERS = [
  'apikey',
  'authorization',
  'content-type',
  'prefer',
  'accept',
  'accept-profile',
  'content-profile',
  'range',
  'x-client-info'
];

// 需要回传给浏览器的响应头（content-range 用于留言分页的总数）
var PASS_BACK_HEADERS = ['content-type', 'content-range', 'content-location', 'prefer-applied'];

function jsonResponse(statusCode, payload) {
  return {
    statusCode: statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

/** 从请求里取出「去掉 /api/sb 前缀」之后的 Supabase 路径 */
function resolveTargetPath(event) {
  var raw = event.rawUrl || ('https://placeholder.local' + (event.path || '/'));
  var url = new URL(raw);
  var path = url.pathname;

  // Netlify 在部分环境下会把重写后的路径交给函数，两种前缀都去掉
  path = path.replace(/^\/\.netlify\/functions\/sb/, '');
  path = path.replace(/^\/api\/sb/, '');
  if (path.charAt(0) !== '/') path = '/' + path;

  return { path: path, search: url.search || '' };
}

exports.handler = async function (event) {
  var method = (event.httpMethod || 'GET').toUpperCase();

  // 预检请求（同域时一般不会出现，留着兜底）
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PATCH,DELETE,HEAD,OPTIONS',
        'access-control-allow-headers': FORWARD_HEADERS.join(', '),
        'access-control-max-age': '86400'
      },
      body: ''
    };
  }

  var target = resolveTargetPath(event);

  var allowed = ALLOWED_PREFIXES.some(function (prefix) {
    return target.path.indexOf(prefix) === 0;
  });
  if (!allowed) {
    return jsonResponse(404, { message: 'Not found' });
  }

  // ---- 组装转发给 Supabase 的请求头 ----
  var incoming = event.headers || {};
  var headers = {};
  Object.keys(incoming).forEach(function (name) {
    var key = String(name).toLowerCase();
    if (FORWARD_HEADERS.indexOf(key) !== -1 && incoming[name] != null) {
      headers[key] = incoming[name];
    }
  });

  // ---- 请求体 ----
  var body;
  if (method !== 'GET' && method !== 'HEAD' && event.body != null) {
    body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
  }

  var targetUrl = SUPABASE_ORIGIN + target.path + target.search;

  // 函数默认 10 秒上限，这里提前一点放弃，好返回一句人能看懂的话
  var signal;
  try {
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      signal = AbortSignal.timeout(9000);
    }
  } catch (e) { /* 老 Node 没有 timeout，忽略 */ }

  var response;
  try {
    response = await fetch(targetUrl, {
      method: method,
      headers: headers,
      body: body,
      signal: signal,
      redirect: 'manual'
    });
  } catch (err) {
    return jsonResponse(502, {
      message: '代理无法连接 Supabase：' + ((err && err.message) || err)
    });
  }

  var text = '';
  try {
    text = await response.text();
  } catch (err) {
    text = '';
  }

  // ---- 回传响应头 ----
  var outHeaders = { 'cache-control': 'no-store' };
  PASS_BACK_HEADERS.forEach(function (name) {
    var value = response.headers.get(name);
    if (value) outHeaders[name] = value;
  });
  if (!outHeaders['content-type']) outHeaders['content-type'] = 'application/json; charset=utf-8';

  return {
    statusCode: response.status,
    headers: outHeaders,
    body: text
  };
};
