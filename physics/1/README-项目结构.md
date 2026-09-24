# 初中物理课堂知识PK赛 —— 项目结构说明

本文件说明拆分后的目录结构、模块职责与常见维护操作。

## 一、如何运行

直接双击 `PhysicsClassGame.html` 用浏览器打开即可（也支持 Seewo 白板 / 平板 / 手机）。

> 为了让 `file://` 直接打开也能运行，**所有 js 都用传统 `<script src>` 标签加载，没有使用 ES Module（`type="module"`）**。
> 如果以后要改成 `import/export`，就必须用本地服务器打开（例如 VS Code 的 Live Server），否则浏览器会因跨域限制报错。

## 二、目录结构

```
PhysicsClassGame.html     页面结构（HTML）+ 模块引用清单，约 280 行
css/
  base.css                页面骨架、顶部栏、开始界面、结果界面
  game.css                双人面板、题干区、答题按钮、进度点、单人刷题区
  overlays.css            错题回顾面板、彩带庆祝动画
  responsive.css          响应式 + 全屏(fs-mode)适配
  effects.css             拖动滚动、图片放大查看器、左滑下一题提示
data/
  questions.js            ★ 题库（新增题目只改这里）
  chapter-names.js        小节显示名称（下拉框文字）
  grade-structure.js      年级 → 章 → 节 结构
  tag-map.js              章节知识点标签（开始界面的小标签）
js/
  config.js               全局配置 CONFIG + DOM 工具 $()
  question-text.js        物理符号规范化（上标/下标）+ 题干渲染
  sound.js                音效（Web Audio 合成，无音频文件）
  state.js                gameState 状态对象 + 洗牌工具
  start-screen.js         开始界面：下拉框、题量提示、标签、选择记忆
  game-flow.js            流程控制：开始 / 返回主界面 / 重新开始 / 计时 / 下一题
  game-pk.js              双人 PK 模式
  game-single.js          单人刷题模式
  results.js              结果界面 + 错题回顾 + 彩带
  ui-fullscreen.js        全屏切换
  ui-image-viewer.js      题干图片点击放大
  ui-drag-scroll.js       按住拖动滚动页面
  ui-swipe-next.js        左滑进入下一题（手势）
  ui-keyboard.js          键盘快捷键
  ui-zoom.js              字号缩放（右下角带圈 “＋ / －” 按钮）
  main.js                 入口（最后加载）
_backup_original/         拆分前的原始文件备份（确认无误后可删除）
```

## 三、加载顺序（重要）

CSS 顺序固定为：`base → game → overlays → responsive → effects`。
`responsive.css` 里的媒体查询必须位于 `base/game/overlays` 之后，否则会出现“窄屏下面板仍保留 650px 最小高度”等问题。

JS 顺序为：**数据层 → 核心层（config/question-text/sound/state）→ 界面交互层（ui-*）→ 业务层 → main.js**。
目前各模块之间靠全局函数 / 全局常量协作（例如 `gameState`、`CONFIG`、`$`），因此加载顺序不要随意打乱；新增模块请插在合适的层里。

## 四、常见维护操作

### 1. 新增 / 修改题目
编辑 `data/questions.js`，找到对应小节 key（如 `'1.1'`），在数组里追加题目：

```js
{ type: 'choice', topic: '知识点名称',
  text: '题干，可含 HTML 与 $公式$ <br><img src="图片地址">',
  options: { A: '…', B: '…', C: '…', D: '…' },
  answer: 'A' }
```

- 题干里的 `cm³`、`F₁`、`t_AB` 等会自动转成上下标，无需手写 `<sup>`。
- `$...$` 包裹的内容交给 MathJax 渲染公式。
- 新增小节时，记得同时在 `data/chapter-names.js`、`data/grade-structure.js`、`data/tag-map.js` 里补上对应条目。

### 2. 改分数 / 快捷键 / 音效
只改 `js/config.js` 里的 `CONFIG`（答对答错分值、A/B 键盘映射、下一题快捷键、全屏键、音效开关）。

### 3. 改外观
- 单个面板、按钮：`css/game.css`
- 开始界面、结果界面：`css/base.css`
- 错题面板、彩带：`css/overlays.css`
- 大屏 / 窄屏 / 全屏适配：`css/responsive.css`
- 左滑提示、图片放大：`css/effects.css`

### 4. 改游戏规则
- 双人逻辑（判定、计分、记录点）：`js/game-pk.js`
- 单人逻辑（统计、重做错题）：`js/game-single.js`
- 结果文案、错题回顾视图：`js/results.js`
- 出题顺序（例如某些章节不打乱）：`js/state.js` 的洗牌函数 + `js/game-pk.js` 的 `initGame`

### 5. 字号放大按钮
右下角共有 4 对带圈按钮（题干区 1 对、左右选项区各 1 对、单人刷题区 1 对），每对都是 `－ ＋`：

- 点一次缩放一级（每级 12%，0 ~ 5 级），题干与选项各自独立计数。
- 选项按钮左右两侧共享同一个倍率，点任意一个两侧同时变化。
- 0 级 = 页面根据题目长度自动算出的默认字号；最大 5 级（约 1.6 倍）。
- 到达上 / 下限后，对应按钮会自动变暗且不可点，便于判断还能不能继续调。
- 梯度和范围在 `js/ui-zoom.js` 顶部：`FONT_ZOOM_STEP`（每级幅度）、`FONT_ZOOM_MAX_STEP`（最大级数）。
- 题干基准字号仍然按题目长度自动计算（`js/question-text.js` 的 `renderQuestionBody`），缩放倍率叠加在基准之上，切换题目时不会丢失。
- ⚠ `css/game.css` 里 `.answer-btn` 的 `transition` **不能写成 `all`**：字号由 CSS 变量驱动，写 `all` 会让 Chromium 把字号永远卡在旧值（按钮看起来失效）。需要过渡的属性请逐个列出。

## 五、两个容易踩坑的逻辑点

### 1. 双人模式“双方都答完才公布答案”（防偷看）
`js/game-pk.js` 里把作答拆成了两步：

- `submitAnswer()`：只记录选择、把选中项标成**浅灰**（`.answer-btn.selected`）、锁定该玩家选项，状态显示“⏳ 已选择，等待对手作答…”；
- `checkBothAnswered()` → `revealAnswers()`：双方都作答后才算分、写答题记录、标绿 / 标红、显示正确答案和“下一题”。

> 计分与答题记录也一并推迟到 `revealAnswers()`，否则先答者的分数变化会被对手看出来。
> 如果要改回“先答先公布”，把 `revealAnswers()` 里的逻辑移回 `submitAnswer()` 即可。

公布时三种结果音效各不相同：**都对** → `sound.win()`、**一对一错** → `sound.correct()`、**都错** → `sound.bothWrong()`（音色定义都在 `js/sound.js`）。

`revealAnswers()` 同时会把双方实际所选的选项写进 `gameState.pickA` / `pickB`（下标与 `recordA` / `recordB` 一一对应），
错题回顾据此显示“❌ 错（选了 B）”；单人模式对应 `gameState.singlePick`。
新增作答入口时记得同步 `push` 这些数组，否则错题回顾里只会显示“— 未答”。

### 2. 字号缩放不能丢
`renderQuestionBody()` 会把基准字号写到 `textEl.dataset.baseVw`，再调 `applyQuestionZoom()` 叠加倍率。
新增题目渲染入口时（例如新的模式）请沿用这两个调用，否则手动缩放过的字号会在换题后失效。

## 六、注意事项

1. 页面里的按钮使用 `onclick="startGame()"` 这类内联写法，所以对应函数必须是**全局函数**（保持在顶层 `function xxx()` 形式，不要包进 IIFE）。
2. `js/ui-image-viewer.js` 里的 `imgViewer` 常量在脚本加载时就会查找 DOM 元素，因此所有 `<script>` 必须放在 `</body>` 之前（当前位置）。
3. 键盘答题监听在 `js/ui-keyboard.js`（`handleKeydown`），由 `js/main.js` 统一注册。
4. 单人模式与双人模式共用 `gameState`，切换模式时会重置相关字段；新增状态字段时请同步在 `goHome()` / `initGame()` / `initSingleGame()` 里初始化。
