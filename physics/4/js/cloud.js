// ================================================================
//  js/cloud.js — Supabase 云端周数据同步
//
//  说明：
//    - 展示页默认先用本地 js/data.js 渲染（离线兜底）
//    - 页面加载后再从云端拉取 physics_weeks，合并进 RAW_DATA（云端覆盖本地同名周）
//    - SUPABASE_ANON_KEY 为公开匿名密钥，仅供配合前端管理员门禁使用
// ================================================================

var SUPABASE_URL = 'https://nmwtgxmqlmezcjtnxgqk.supabase.co';
var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td3RneG1xbG1lemNqdG54Z3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MzI2OTAsImV4cCI6MjEwMTQwODY5MH0.90TChC0s47NOGJlEkRNhD0uePRfcwdndK5SyeRRKgWo';

var sbClient = (typeof window !== 'undefined' && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// 拉取云端所有周数据并合并进 RAW_DATA（云端覆盖本地同名周，并新增云端独有的周）
// 返回合并的周数；失败返回 0（继续使用本地数据）
async function loadRemoteWeeks() {
    if (!sbClient) return 0;
    try {
        var res = await sbClient.from('physics_weeks').select('class_name, week_name, data');
        if (res.error) throw res.error;
        if (!res.data || !res.data.length) return 0;
        var count = 0;
        res.data.forEach(function(row) {
            var cls = RAW_DATA[row.class_name];
            if (!cls || !row.data) return;
            var week = row.data;
            week.name = row.week_name; // 保证 name 与 week_name 一致
            var idx = cls.weeks.findIndex(function(w) { return w.name === row.week_name; });
            if (idx >= 0) {
                cls.weeks[idx] = week; // 覆盖本地同名周
            } else {
                cls.weeks.push(week);  // 新增云端独有的周
            }
            count++;
        });
        return count;
    } catch (e) {
        console.warn('⚠️ 云端数据加载失败，已使用本地数据。', (e && e.message) || e);
        return 0;
    }
}
