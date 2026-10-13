// ================================================================
//  物理小组积分可视化系统 · 管理员后台
//  默认账号 / 密码：123456 / 123456（可在下方「配置」处修改）
//  说明：本页门禁在前端；数据本身为公开展示内容。
// ================================================================

// ---------- 配置（按需修改） ----------
var ADMIN_USER = '123456';   // 管理员账号
var ADMIN_PASS = '123456';   // 管理员密码
var SUPABASE_URL = 'https://nmwtgxmqlmezcjtnxgqk.supabase.co';
var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td3RneG1xbG1lemNqdG54Z3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MzI2OTAsImV4cCI6MjEwMTQwODY5MH0.90TChC0s47NOGJlEkRNhD0uePRfcwdndK5SyeRRKgWo';

var WEEK_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'
];

function weekName(i) { return '第' + WEEK_CN[i] + '周'; }

var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
var parsedWeek = null; // 当前解析出的周数据对象

// ---------- 小工具 ----------
function $(id) { return document.getElementById(id); }

function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

function setMsg(id, text, cls) {
    var m = $(id);
    m.textContent = text || '';
    m.className = 'admin-msg' + (cls ? ' ' + cls : '');
}

// ---------- 登录 / 退出 ----------
function isLoggedIn() { return sessionStorage.getItem('phys_admin') === '1'; }

function showPanel() {
    $('loginCard').style.display = 'none';
    $('panel').style.display = 'block';
}

function initAdmin() {
    // 周次下拉（20 周）
    var sel = $('upWeek');
    for (var i = 0; i < 20; i++) {
        var o = document.createElement('option');
        o.value = weekName(i);
        o.textContent = weekName(i);
        sel.appendChild(o);
    }
    // 事件绑定
    $('upClass').addEventListener('change', refreshList);
    $('upFile').addEventListener('change', handleFile);
    $('saveBtn').addEventListener('click', saveWeek);
    $('loginBtn').addEventListener('click', doLogin);
    $('logoutBtn').addEventListener('click', function() {
        sessionStorage.removeItem('phys_admin');
        location.reload();
    });
    $('loginPass').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
}

function doLogin() {
    var u = $('loginUser').value.trim();
    var p = $('loginPass').value;
    if (u === ADMIN_USER && p === ADMIN_PASS) {
        sessionStorage.setItem('phys_admin', '1');
        showPanel();
        initPanel();
    } else {
        setMsg('loginMsg', '账号或密码错误', 'error');
    }
}

function initPanel() {
    $('whoText').textContent = ADMIN_USER;
    refreshList();
}

// ---------- Excel 解析（SheetJS） ----------
function handleFile(e) {
    var file = e.target.files && e.target.files[0];
    parsedWeek = null;
    $('saveBtn').disabled = true;
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        try {
            parsedWeek = parseWeek(ev.target.result);
            renderPreview(parsedWeek);
            $('saveBtn').disabled = false;
            setMsg('saveMsg', '', '');
        } catch (err) {
            setMsg('saveMsg', '解析失败：' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// 解析：第1列=组别（合并单元格），第2列=成员/学号，第3列起=加分细则（表头原样保留）
function parseWeek(buf) {
    var wb = XLSX.read(buf, { type: 'array' });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    if (!rows || rows.length < 2) throw new Error('文件内容为空');

    var header = rows[0] || [];
    var labels = [];
    for (var k = 2; k < header.length; k++) {
        var h = header[k];
        if (h !== null && h !== undefined && String(h).trim() !== '') labels.push(String(h).trim());
    }
    if (labels.length === 0) throw new Error('未找到加分细则列（第3列起）');

    var groups = [];
    var cur = null;
    for (var i = 1; i < rows.length; i++) {
        var r = rows[i] || [];
        var gname = (r[0] !== null && r[0] !== undefined) ? String(r[0]).trim() : '';
        if (gname) { cur = { name: gname, members: [] }; groups.push(cur); }
        if (!cur || r[1] === null || r[1] === undefined) continue;
        var m = { id: r[1] };
        for (var j = 0; j < labels.length; j++) {
            var v = r[2 + j];
            m['c' + (j + 1)] = (v === null || v === undefined) ? 0 : (Number(v) || 0);
        }
        cur.members.push(m);
    }
    if (groups.length === 0) throw new Error('未解析到小组数据');

    var fields = [];
    for (var j2 = 0; j2 < labels.length; j2++) fields.push('c' + (j2 + 1));

    return { name: weekName(0), labels: labels, fields: fields, groups: groups };
}

function renderPreview(week) {
    var memberCount = week.groups.reduce(function(s, g) { return s + g.members.length; }, 0);
    var html = '<div class="preview-ok">✅ 解析成功：' + week.labels.length + ' 个加分项，' +
        week.groups.length + ' 个小组，共 ' + memberCount + ' 名学生</div>';
    html += '<table class="preview-table"><tr><th>组别</th><th>人数</th><th>成员示例</th></tr>';
    week.groups.forEach(function(g) {
        var ids = g.members.slice(0, 4).map(function(m) { return m.id; }).join('、');
        html += '<tr><td>' + esc(g.name) + '</td><td>' + g.members.length + '</td><td>' + esc(ids) + '</td></tr>';
    });
    html += '</table>';
    $('uploadPreview').innerHTML = html;
}

// ---------- 保存 / 管理 ----------
async function saveWeek() {
    if (!parsedWeek) return;
    var cls = $('upClass').value;
    var week = $('upWeek').value;
    parsedWeek.name = week;
    var weekIdx = WEEK_CN.indexOf(week.replace('第', '').replace('周', ''));
    var btn = $('saveBtn');
    btn.disabled = true;
    setMsg('saveMsg', '保存中…', '');
    var res = await sb.from('physics_weeks').upsert({
        class_name: cls,
        week_name: week,
        week_index: weekIdx,
        data: parsedWeek,
        updated_at: new Date().toISOString()
    }, { onConflict: 'class_name,week_name' });
    if (res.error) {
        setMsg('saveMsg', '保存失败：' + esc(res.error.message), 'error');
        btn.disabled = false;
        return;
    }
    setMsg('saveMsg', '✅ 已保存：' + cls + ' · ' + week + '，刷新展示页即可看到', 'success');
    btn.disabled = false;
    refreshList();
}

async function refreshList() {
    var cls = $('upClass').value;
    $('listClass').textContent = cls;
    var wrap = $('weekList');
    wrap.innerHTML = '<div class="hint">加载中…</div>';
    var res = await sb.from('physics_weeks').select('week_name, updated_at')
        .eq('class_name', cls).order('week_index');
    if (res.error) {
        wrap.innerHTML = '<div class="hint">加载失败：' + esc(res.error.message) + '</div>';
        return;
    }
    if (!res.data || !res.data.length) {
        wrap.innerHTML = '<div class="hint">该班暂无已上传数据</div>';
        return;
    }
    wrap.innerHTML = '';
    res.data.forEach(function(row) {
        var item = document.createElement('div');
        item.className = 'week-item';
        var time = row.updated_at ? new Date(row.updated_at).toLocaleString('zh-CN') : '';
        item.innerHTML = '<div><span class="wi-week">' + esc(row.week_name) + '</span> ' +
            '<span class="wi-time">更新于 ' + esc(time) + '</span></div>' +
            '<button class="ws-action" type="button">删除</button>';
        item.querySelector('button').addEventListener('click', function() {
            deleteWeek(cls, row.week_name);
        });
        wrap.appendChild(item);
    });
}

async function deleteWeek(cls, week) {
    if (!confirm('确定删除 ' + cls + ' ' + week + ' 的数据吗？删除后展示页将回退到本地数据。')) return;
    var res = await sb.from('physics_weeks').delete().eq('class_name', cls).eq('week_name', week);
    if (res.error) { alert('删除失败：' + res.error.message); return; }
    refreshList();
}

// ---------- 启动 ----------
initAdmin();
if (isLoggedIn()) { showPanel(); initPanel(); }
