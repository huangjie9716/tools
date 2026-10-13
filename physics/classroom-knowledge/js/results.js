// ===================================================================
//  结果界面 + 错题回顾 + 彩带庆祝
//  依赖：state.js、question-text.js、game-flow.js
// ===================================================================

function showResult() {
  clearInterval(gameState.timer);
  gameState.timer = null;

  const a = gameState.scoreA;
  const b = gameState.scoreB;
  let title = '';
  let emoji = '';

  if (a > b) {
    title = '参赛者 A 获胜！';
    emoji = '<div class="winner-emoji">🏆</div>';
    launchConfetti();
  } else if (b > a) {
    title = '参赛者 B 获胜！';
    emoji = '<div class="winner-emoji">🎉</div>';
    launchConfetti();
  } else {
    title = '平局！旗鼓相当！';
    emoji = '<div class="draw-emoji">🤝</div>';
  }

  document.getElementById('resultEmoji').innerHTML = emoji;
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('scoreSummary').innerHTML = `
    <div class="score-item">
      <div class="name">参赛者 A</div>
      <div class="num" style="color:${a >= b ? '#ffd200' : '#4facfe'}">${a}</div>
    </div>
    <div style="font-size:1.8rem;color:#64748b;">VS</div>
    <div class="score-item">
      <div class="name">参赛者 B</div>
      <div class="num" style="color:${b >= a ? '#ffd200' : '#f093fb'}">${b}</div>
    </div>
  `;

  // 详细统计：答对题数、正确率、用时
  const total = gameState.totalQuestions;
  const min = String(Math.floor(gameState.seconds / 60)).padStart(2, '0');
  const sec = String(gameState.seconds % 60).padStart(2, '0');
  const pct = (n) => total ? Math.round(n / total * 100) + '%' : '0%';
  $('resultStats').innerHTML = `
    <div class="stat-row">
      <span class="stat-label">⏱ 用时</span>
      <span class="stat-value">${min}:${sec}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label" style="color:#4facfe">参赛者 A 答对</span>
      <span class="stat-value">${gameState.correctA} / ${total} 题（${pct(gameState.correctA)}）</span>
    </div>
    <div class="stat-row">
      <span class="stat-label" style="color:#f093fb">参赛者 B 答对</span>
      <span class="stat-value">${gameState.correctB} / ${total} 题（${pct(gameState.correctB)}）</span>
    </div>
  `;
  document.getElementById('resultScreen').classList.add('show');
  // 双人模式：错题面板保持"仅错题"视图，隐藏切换与"重做错题"
  mistakesView = 'wrong';
  $('redoBtn').style.display = 'none';
  $('viewBtn').textContent = '查看错题';
  buildMistakes('wrong');
}


// ===================================================================
//  单人刷题结果
// ===================================================================
function showSingleResult() {
  clearInterval(gameState.timer);
  gameState.timer = null;

  const total = gameState.totalQuestions;
  const correct = gameState.singleCorrect;
  const wrong = gameState.singleWrong;
  const pct = total ? Math.round(correct / total * 100) : 0;
  const min = String(Math.floor(gameState.seconds / 60)).padStart(2, '0');
  const sec = String(gameState.seconds % 60).padStart(2, '0');

  let title, emoji;
  if (total === 0) {
    title = '未完成作答';
    emoji = '';
  } else if (pct === 100) {
    title = '全部答对，太棒了！';
    emoji = '<div class="winner-emoji">🏆</div>';
    launchConfetti();
  } else if (pct >= 80) {
    title = '非常优秀！';
    emoji = '<div class="winner-emoji">🌟</div>';
  } else if (pct >= 60) {
    title = '表现不错，继续加油！';
    emoji = '<div class="draw-emoji">👍</div>';
  } else {
    title = '再练练，加油！';
    emoji = '<div class="draw-emoji">💪</div>';
  }

  $('resultEmoji').innerHTML = emoji;
  $('resultTitle').textContent = title;
  $('scoreSummary').innerHTML = `
    <div class="score-item">
      <div class="name">最终得分</div>
      <div class="num" style="color:#ffd200">${gameState.singleScore}</div>
    </div>
  `;
  $('resultStats').innerHTML = `
    <div class="stat-row"><span class="stat-label">⏱ 用时</span><span class="stat-value">${min}:${sec}</span></div>
    <div class="stat-row"><span class="stat-label" style="color:#2ed573">✅ 答对</span><span class="stat-value">${correct} / ${total} 题（${pct}%）</span></div>
    <div class="stat-row"><span class="stat-label" style="color:#e94560">❌ 答错</span><span class="stat-value">${wrong} / ${total} 题</span></div>
  `;
  $('resultScreen').classList.add('show');
  // 单人模式：默认"全部题目"视图，可切"仅错题"；提供"重做错题"
  mistakesView = 'all';
  $('redoBtn').style.display = 'inline-block';
  $('redoBtn').disabled = (wrong === 0);
  $('viewBtn').textContent = '查看作答';
  buildMistakes('all');
}


// ===================================================================
//  错题回顾（结果界面）
// ===================================================================
function buildMistakes(view) {
  const list = $('mistakesList');
  const questions = gameState.questions;
  const isSingle = gameState.mode === 'single';
  const showAll = view === 'all';
  const items = [];
  questions.forEach((q, i) => {
    let resultLine = '';
    if (isSingle) {
      const res = gameState.singleRecord[i];
      // 单人："全部题目"视图列出每题作答情况；"仅错题"只列答错/未答
      if (!showAll && res === 'correct') return;
      resultLine = `<div class="q-result">作答：${describePick(res, gameState.singlePick[i])}</div>`;
    } else {
      const aRes = gameState.recordA[i];
      const bRes = gameState.recordB[i];
      // 双方都答对则不算错题
      if (aRes === 'correct' && bRes === 'correct') return;
      resultLine = `<div class="q-result">参赛者A：${describePick(aRes, gameState.pickA[i])}　|　参赛者B：${describePick(bRes, gameState.pickB[i])}</div>`;
    }
    // 题干字号随长度动态缩小，避免撑高面板需要滚动
    const plainLen = (q.text || '').replace(/<[^>]*>/g, '').length;
    const qFont = plainLen > 160 ? '0.92rem' : plainLen > 100 ? '1.02rem' : plainLen > 60 ? '1.12rem' : '1.22rem';
    // 展示全部选项，正确答案高亮（绿色加粗）
    const optsHtml = Object.keys(q.options).map(k => `
      <div class="q-opt${k === q.answer ? ' correct' : ''}">${k}. ${normalizePhysicsText(q.options[k])}</div>
    `).join('');
    items.push(`
      <div class="mistake-item">
        <div class="q-text" style="font-size:${qFont}"><b>第 ${i + 1} 题</b>（${q.topic}）${q.text}</div>
        <div class="q-options">${optsHtml}</div>
        ${resultLine}
      </div>
    `);
  });
  list.innerHTML = items.length
    ? items.join('')
    : '<div style="text-align:center;color:#2ed573;padding:10px;">🎉 本题库全部答对，没有错题！</div>';
  // 对错题列表中的题干/答案文本做物理符号规范化（文本节点级，安全）
  applyPhysicsNormalization(list);
}

let mistakesView = 'wrong';
function toggleMistakes() {
  $('mistakesOverlay').classList.add('show');
  buildMistakes(mistakesView);
  updateMistakesTabs();
}

function setMistakesView(view) {
  mistakesView = view;
  buildMistakes(view);
  updateMistakesTabs();
}

function updateMistakesTabs() {
  const isSingle = gameState.mode === 'single';
  $('mistakesToggle').style.display = isSingle ? 'flex' : 'none';
  $('tabAll').classList.toggle('active', mistakesView === 'all');
  $('tabWrong').classList.toggle('active', mistakesView !== 'all');
}

// 错题回顾里描述作答情况：答错时必须写出他具体选的是哪个选项
function describePick(result, pick) {
  if (result === 'correct') return '✅ 对';
  if (pick) return `❌ 错（选了 ${pick}）`;
  return '— 未答';
}

// 单人刷题：把答错的题重新刷一遍
function redoMistakes() {
  const wrongQs = [];
  gameState.questions.forEach((q, i) => {
    if (gameState.singleRecord[i] === 'wrong') wrongQs.push(q);
  });
  if (wrongQs.length === 0) {
    alert('太棒了，没有错题需要重做！');
    return;
  }
  $('resultScreen').classList.remove('show');
  initSingleGame(wrongQs);
}

function closeMistakes() {
  $('mistakesOverlay').classList.remove('show');
}

function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  container.innerHTML = '';
  container.classList.add('show');

  const colors = ['#ffd200', '#f7971e', '#4facfe', '#f093fb', '#2ed573', '#e94560', '#48dbfb', '#ff9ff3'];
  for (let i = 0; i < 140; i++) {
    const el = document.createElement('div');
    const size = Math.random() * 10 + 6;
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-20px';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDuration = (Math.random() * 2 + 2.2) + 's';
    el.style.animationDelay = (Math.random() * 1.5) + 's';
    container.appendChild(el);
  }

  setTimeout(() => {
    container.classList.remove('show');
  }, 5000);
}
