
# 光的反射 · 公开课智慧课堂平台

## 文件说明

| 文件 / 目录 | 作用 |
| --- | --- |
| `open-class-smart-platform.html` | 平台首页（登录 / 各环节入口） |
| `answer-submit.html` | 答案提交与统计，含教师端「AI 学情分析」 |
| `class-pk.html`、`roll-call.html`、`experiment-data.html`、`group-cooperation.html`、`light-reflect-game.html`、`light-reflection-simulation.html` | 各课堂环节页面 |
| `accounts.json` | 学生 / 教师账号（公开文件，不含任何密钥） |
| `supabase/functions/ai-analyze/index.ts` | AI 代理函数源码（部署到 Supabase 的那份代码的存档） |
| `.gitignore` | 防止密钥类文件被提交 |

> 本项目**没有任何服务端程序需要你自己运行**。网页是纯静态的，放在 GitHub Pages 即可；
> AI 能力由 Supabase 的 Edge Function 提供，密钥存在 Supabase 服务器上。

---

## AI 学情分析：一次性部署（约 10 分钟）

### 第 0 步：先换掉泄露的密钥

1. 登录 <https://platform.deepseek.com> → API keys → 删除旧的那把 → 新建一把，复制新密钥。
2. 顺便看一下「用量」，确认没有继续被盗刷。

### 第 1 步：创建函数

1. 打开 <https://supabase.com/dashboard>，选中你的项目（`nmwtgxmqlmezcjtnxgqk`）。
2. 左侧菜单点 **Edge Functions**。
3. 点 **Deploy a new function**，选择 **Via Editor**（网页里直接写代码，不用命令行）。
4. 函数名填：`rapid-action`（和 `answer-submit.html` 里的 `AI_ENDPOINT` 保持一致即可，叫别的名字也行）
5. 把本仓库 `supabase/functions/ai-analyze/index.ts` 的全部内容复制，粘贴到右侧代码编辑器里，覆盖模板。
6. 点 **Deploy**，等 10~30 秒。

部署成功后函数地址是：

```
https://nmwtgxmqlmezcjtnxgqk.supabase.co/functions/v1/rapid-action
```

> 这个地址已经写在 `answer-submit.html` 的 `AI_ENDPOINT` 变量里，一般不用改。
> 如果你的项目 ID 不一样，或换了函数名，改这一行即可（当前部署名是 `rapid-action`）。

### 第 2 步：添加密钥（关键，密钥只存在这里）

在项目里进入 **Project Settings → Edge Functions → Secrets**（新版界面里也可能叫
**Edge Functions → Secrets**，或 **Project Settings → Functions**），添加：

| Name | Value |
| --- | --- |
| `DEEPSEEK_API_KEY` | 你新申请的 DeepSeek 密钥 |
| `AI_ACCESS_TOKEN` | 自己编的 **16 位以上随机字符串**（大小写字母 + 数字，别用生日、别用这个仓库里出现过的任何示例值） |

可选（建议加，会更安全 / 更省钱）：

| Name | 说明 |
| --- | --- |
| `ALLOWED_ORIGINS` | 只允许这个网站调用，例如 `https://你的用户名.github.io` |
| `AI_MAX_TOKENS` | 单次分析最多输出多少 token，默认 2400 |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MIN` | 同一 IP 在 N 分钟内最多调用 M 次 |

改完 Secrets 会立刻生效，不用重新部署代码。

### 第 3 步：关掉 JWT 校验（如果调用时报 401）

函数详情页 → **Settings**（或右侧面板）→ 找到 **Verify JWT** / **Enforce JWT verification**，**关闭**。

安全由 `AI_ACCESS_TOKEN` 负责，不依赖这个开关。

### 第 4 步：试一下

在函数详情页点 **Test**，HTTP Method 选 `POST`，
Headers 加 `X-AI-Token: <你设置的 AI_ACCESS_TOKEN>`，
Request Body 填 `{"prompt":"请只回复四个字：连接正常。"}`，点 **Send Request**。
看到 `{"content":"连接正常。"}` 就成功了。

---

## 平时怎么用（每次上课）

1. 老师打开网站 → 进入答案提交页 → 点 **AI 分析**
2. 第一次会弹出「AI 访问口令」输入框，填入 `AI_ACCESS_TOKEN`，点 **保存**
3. 点 **重新分析**，等十几秒出报告

口令存在这台电脑的浏览器里，以后不用再输。换电脑或清缓存才需要重输。

学生用手机流量、家里 WiFi 都能正常使用，不再要求同一局域网。

---

## 防盗刷靠什么

| 机制 | 作用 |
| --- | --- |
| `AI_ACCESS_TOKEN` | 核心锁。没这串口令，谁调用函数都会被拒绝 |
| `ALLOWED_ORIGINS` | 别的网站不能借浏览器调你的函数 |
| `RATE_LIMIT_MAX` | 单 IP 频率限制，防暴力猜口令 |
| `AI_MAX_TOKENS=2400` | 单次上限，即使被调用也花不了多少 |
| DeepSeek 余额只充少量 | 最后一道保险，损失有天花板 |

密钥只出现在 Supabase 的 Secrets 里，网页源码、GitHub 仓库、浏览器开发者工具中都看不到。

---

## 关于 `.gitignore`

可以放在本目录，规则对**它所在目录及其所有子目录**生效。

```
.env
.env.*
!.env.example
deepseek-config.json
```

> 注意：`.gitignore` 只对**之后的提交**生效。
> 已经推到 GitHub 上的旧密钥不会因此消失，必须去 DeepSeek 吊销它，
> 并把 GitHub 上那份 `deepseek-config.json` 删掉。

---

## 常见问题

**报 404 没有找到函数**
函数没部署成功，或函数名与 `answer-submit.html` 里的 `AI_ENDPOINT` 不一致（当前是 `rapid-action`）。

**报 401 口令不正确**
`X-AI-Token` 与 Supabase 里的 `AI_ACCESS_TOKEN` 不一致；或 `Verify JWT` 还开着。

**报 500 函数未配置 DEEPSEEK_API_KEY**
Secrets 没加，或者加到了别的项目里。

**报 502 上游接口错误**
DeepSeek 密钥失效、余额不足，或模型名写错。

**一直转圈 / Failed to fetch**
网络到不了 Supabase，或函数还在部署中。
