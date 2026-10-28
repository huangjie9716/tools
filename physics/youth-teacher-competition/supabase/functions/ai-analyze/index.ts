// Supabase Edge Function：DeepSeek AI 分析代理
// 部署方式：Supabase 控制台 → Edge Functions → Deploy a new function → Via Editor
//          函数名填 ai-analyze，把本文件内容整个粘贴进去，点 Deploy。
// 必填 Secrets（Project Settings → Edge Functions → Secrets）：
//   DEEPSEEK_API_KEY   你的 DeepSeek 密钥
//   AI_ACCESS_TOKEN    老师在前端输入的访问口令（16 位以上随机串）
// 可选 Secrets：
//   ALLOWED_ORIGINS    只允许这些来源调用，逗号分隔，例如 https://xxx.github.io
//   DEEPSEEK_BASE_URL / DEEPSEEK_MODEL / AI_MAX_TOKENS / RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MIN

const SYSTEM_PROMPT = "你是一位经验丰富的初中物理教师和教研员，擅长根据课堂答题数据做精准、可操作的学情分析。";

const MAX_PROMPT_CHARS = 20000;
const hits = new Map<string, { count: number; resetAt: number }>();

function corsHeaders(origin: string, allowed: string[]): Record<string, string> {
    if (!origin) return {};
    if (allowed.length > 0 && !allowed.includes(origin)) return {};
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type, X-AI-Token, apikey, authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
    };
}

function reply(body: unknown, status: number, cors: Record<string, string>): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...cors,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}

function hitRateLimit(ip: string): string {
    const max = Number(Deno.env.get("RATE_LIMIT_MAX") ?? 20) || 20;
    const windowMs = (Number(Deno.env.get("RATE_LIMIT_WINDOW_MIN") ?? 10) || 10) * 60_000;
    const now = Date.now();
    if (hits.size > 2000) {
        for (const [key, value] of hits) {
            if (value.resetAt <= now) hits.delete(key);
        }
    }
    let record = hits.get(ip);
    if (!record || record.resetAt <= now) {
        record = { count: 0, resetAt: now + windowMs };
        hits.set(ip, record);
    }
    if (record.count >= max) {
        const minutes = Math.max(1, Math.ceil((record.resetAt - now) / 60000));
        return `请求过于频繁，请 ${minutes} 分钟后再试`;
    }
    record.count += 1;
    return "";
}

function safeEqual(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const left = encoder.encode(a);
    const right = encoder.encode(b);
    if (left.length !== right.length) return false;
    let diff = 0;
    for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
    return diff === 0;
}

function upstreamMessage(data: any, status: number): string {
    const error = data?.error;
    if (typeof error === "string") return error;
    if (error && typeof error.message === "string") return error.message;
    return `HTTP ${status}`;
}

Deno.serve(async (req: Request) => {
    const origin = req.headers.get("origin") ?? "";
    const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const cors = corsHeaders(origin, allowed);

    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
    }
    if (origin && allowed.length > 0 && !cors["Access-Control-Allow-Origin"]) {
        return reply({ error: "来源不允许" }, 403, cors);
    }
    if (req.method !== "POST") {
        return reply({ error: "只支持 POST" }, 405, cors);
    }

    const apiKey = (Deno.env.get("DEEPSEEK_API_KEY") ?? "").trim();
    const accessToken = (Deno.env.get("AI_ACCESS_TOKEN") ?? "").trim();
    if (!apiKey) return reply({ error: "函数未配置 DEEPSEEK_API_KEY" }, 500, cors);
    if (accessToken.length < 16) {
        return reply({ error: "函数未配置 AI_ACCESS_TOKEN，或长度不足 16 位" }, 500, cors);
    }

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const limited = hitRateLimit(ip);
    if (limited) return reply({ error: limited }, 429, cors);

    const token = (req.headers.get("x-ai-token") ?? "").trim();
    if (!safeEqual(token, accessToken)) {
        return reply({ error: "AI 访问口令不正确" }, 401, cors);
    }

    let payload: { prompt?: string };
    try {
        payload = await req.json();
    } catch {
        return reply({ error: "请求内容无法解析" }, 400, cors);
    }

    const prompt = String(payload?.prompt ?? "").trim();
    if (!prompt) return reply({ error: "缺少 prompt" }, 400, cors);
    if (prompt.length > MAX_PROMPT_CHARS) {
        return reply({ error: `prompt 过长（上限 ${MAX_PROMPT_CHARS} 字符）` }, 400, cors);
    }

    const base = (Deno.env.get("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com").replace(/\/+$/, "");
    const maxTokens = Math.min(Number(Deno.env.get("AI_MAX_TOKENS") ?? 2400) || 2400, 8000);

    let upstream: Response;
    try {
        upstream = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: Deno.env.get("DEEPSEEK_MODEL") ?? "deepseek-chat",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: prompt },
                ],
                temperature: 0.3,
                max_tokens: maxTokens,
                stream: false,
            }),
        });
    } catch (error) {
        return reply({ error: `无法连接 DeepSeek：${error instanceof Error ? error.message : error}` }, 502, cors);
    }

    const text = await upstream.text();
    let data: any = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!upstream.ok) {
        return reply({ error: `上游接口错误：${upstreamMessage(data, upstream.status)}` }, 502, cors);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) return reply({ error: "上游没有返回分析内容" }, 502, cors);

    return reply({ content, model: data?.model ?? "", usage: data?.usage ?? null }, 200, cors);
});
