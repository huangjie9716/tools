/**
 * 课堂环节加锁
 *
 * 教师端在平台首页给「实验数据 / 模拟实验 / 答案提交 / 反射游戏」加锁后：
 *   · 学生点卡片进不去，会看到「已被老师锁定」；
 *   · 学生已经进去的，会在几秒内被退回平台首页。
 *
 * 用法（放在 oc-net.js 之后）：
 *   <script src="oc-lock.js?v=1"></script>
 *   <script>if (window.OCLock) OCLock.guard('experiment-data');</script>
 *
 * 教师端：
 *   OCLock.listLocks()          → Promise<行数组>
 *   OCLock.toMap(rows)          → { 'experiment-data': true, ... }
 *   OCLock.setLock(key, true)   → Promise
 *
 * 依赖 Supabase 表 module_locks，建表语句见 supabase/module-locks.sql
 */
window.OCLock = (function () {
    'use strict';

    var SUPABASE_URL = 'https://nmwtgxmqlmezcjtnxgqk.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td3RneG1xbG1lemNqdG54Z3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MzI2OTAsImV4cCI6MjEwMTQwODY5MH0.90TChC0s47NOGJlEkRNhD0uePRfcwdndK5SyeRRKgWo';

    var TABLE_PATH = '/rest/v1/module_locks';
    var HOME = 'open-class-smart-platform.html';
    var POLL_MS = 4000;          // 学生端复查间隔（秒）
    var TIMEOUT_MS = 3000;       // 请求超时后放行，避免服务器慢把学生挡在门外
    var VEIL_DELAY_MS = 350;     // 超过这个时间还没结果才盖遮罩，避免正常情况闪屏

    var LABELS = {
        'experiment-data': '实验数据',
        'simulation': '模拟实验',
        'answer-submit': '答案提交',
        'reflect-game': '反射游戏'
    };

    var veil = null;
    var kicked = false;

    function headers(extra) {
        var base = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };
        if (extra) {
            for (var key in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, key)) base[key] = extra[key];
            }
        }
        return base;
    }

    function readSession() {
        try { return JSON.parse(localStorage.getItem('oc_login_session') || 'null'); }
        catch (err) { return null; }
    }

    function currentRole() {
        var forced = new URLSearchParams(location.search).get('role');
        if (forced === 'teacher' || forced === 'student') return forced;
        var session = readSession();
        if (session && (session.role === 'teacher' || session.role === 'student')) return session.role;
        return 'student';
    }

    function isTeacher() {
        return currentRole() === 'teacher';
    }

    // 超时当作"没读到"（resolve null），调用方按放行处理
    function withTimeout(promise, ms) {
        return new Promise(function (resolve, reject) {
            var settled = false;
            var timer = setTimeout(function () {
                if (settled) return;
                settled = true;
                resolve(null);
            }, ms);
            promise.then(function (value) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(value);
            }, function (error) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    function listLocks(timeoutMs) {
        return withTimeout(fetch(SUPABASE_URL + TABLE_PATH + '?select=module_key,locked', {
            headers: headers(),
            cache: 'no-store'
        }).then(function (res) {
            if (!res.ok) throw new Error('读取锁状态失败（HTTP ' + res.status + '）');
            return res.json();
        }), timeoutMs || TIMEOUT_MS);
    }

    function toMap(rows) {
        var map = {};
        (rows || []).forEach(function (row) {
            if (row && row.module_key) map[row.module_key] = !!row.locked;
        });
        return map;
    }

    function setLock(key, locked) {
        var body = [{
            module_key: key,
            locked: !!locked,
            updated_at: new Date().toISOString()
        }];
        return fetch(SUPABASE_URL + TABLE_PATH + '?on_conflict=module_key', {
            method: 'POST',
            headers: headers({
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates,return=minimal'
            }),
            body: JSON.stringify(body)
        }).then(function (res) {
            if (res.ok) return true;
            return res.text().then(function (text) {
                var message = 'HTTP ' + res.status;
                try {
                    var data = JSON.parse(text);
                    message = data.message || data.hint || data.details || message;
                } catch (err) { /* 保持默认信息 */ }
                throw new Error(message);
            });
        });
    }

    function ensureVeil() {
        if (veil && veil.parentNode) return veil;
        veil = document.createElement('div');
        veil.style.cssText = [
            'position:fixed', 'top:0', 'right:0', 'bottom:0', 'left:0', 'z-index:99998',
            'display:flex', 'align-items:center', 'justify-content:center',
            'padding:28px', 'text-align:center', 'letter-spacing:1px', 'line-height:1.9',
            'background:rgba(7,12,20,.96)', 'color:#e6edf7', 'font-size:15px',
            'font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif'
        ].join(';');
        veil.textContent = '正在验证课堂状态…';
        (document.body || document.documentElement).appendChild(veil);
        return veil;
    }

    function hideVeil() {
        if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
        veil = null;
    }

    function kick(key) {
        if (kicked) return;
        kicked = true;
        var label = LABELS[key] || '该环节';
        if (veil && veil.parentNode) veil.textContent = '「' + label + '」已被老师锁定，正在返回平台首页…';
        else ensureVeil().textContent = '「' + label + '」已被老师锁定，正在返回平台首页…';
        setTimeout(function () { location.replace(HOME); }, 1000);
    }

    /**
     * 学生端进入页面时调用：先校验一次，之后每 4 秒复查，被锁立刻退回首页。
     * 教师端直接放行。
     */
    function guard(key) {
        if (isTeacher()) return;

        var veilTimer = setTimeout(function () {
            if (!kicked) ensureVeil();
        }, VEIL_DELAY_MS);

        function settle() {
            clearTimeout(veilTimer);
            hideVeil();
        }

        function check(first) {
            listLocks().then(function (rows) {
                if (rows === null) {                 // 超时：放行，不耽误上课
                    if (first) settle();
                    return;
                }
                if (toMap(rows)[key]) { kick(key); return; }
                if (first) settle();
            }).catch(function () {                   // 没建表 / 断网：放行
                if (first) settle();
            });
        }

        check(true);
        setInterval(function () {
            if (!document.hidden) check(false);
        }, POLL_MS);
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) check(false);
        });
    }

    return {
        guard: guard,
        listLocks: listLocks,
        setLock: setLock,
        toMap: toMap,
        isTeacher: isTeacher,
        currentRole: currentRole,
        LABELS: LABELS
    };
})();
