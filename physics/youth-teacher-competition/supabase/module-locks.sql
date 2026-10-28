-- ============================================================
-- 课堂环节加锁表
--
-- 用途：教师在平台首页锁定「实验数据 / 模拟实验 / 答案提交 / 反射游戏」后，
--       学生端无法进入，已进入的会被退回平台首页。
--
-- 执行方式：Supabase 控制台 → 左侧 SQL Editor → New query → 整段粘贴 → Run
-- 本脚本可重复执行，不会重复插入或报错。
-- ============================================================

create table if not exists public.module_locks (
    module_key text primary key,
    locked     boolean not null default false,
    updated_at timestamptz not null default now()
);

-- 页面用的是公开的 anon key，所以需要允许匿名读写这一张表。
-- 表里只有"哪个环节锁没锁"，不含任何学生信息，公开无风险。
alter table public.module_locks enable row level security;

drop policy if exists "module_locks_select" on public.module_locks;
create policy "module_locks_select" on public.module_locks
    for select using (true);

drop policy if exists "module_locks_insert" on public.module_locks;
create policy "module_locks_insert" on public.module_locks
    for insert with check (true);

drop policy if exists "module_locks_update" on public.module_locks;
create policy "module_locks_update" on public.module_locks
    for update using (true) with check (true);

-- 预置四个环节（全部默认"未锁"，即学生可以自由进入）
insert into public.module_locks (module_key, locked) values
    ('experiment-data', false),
    ('simulation',      false),
    ('answer-submit',   false),
    ('reflect-game',    false)
on conflict (module_key) do nothing;
