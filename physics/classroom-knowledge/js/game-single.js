// ===================================================================
//  单人刷题模式：出题、作答判定、成绩统计（含重做错题）
//  依赖：config.js、state.js、question-text.js、sound.js
// ===================================================================

// ===================================================================
//  单人刷题模式（学生在家自测，逻辑与双人PK类似，含错题回顾）
// ===================================================================
function startSingle() {
  const key = document.getElementById('sectionSelect').value;
  if (!key) {
    alert('请先选择一个章节。');
    return;
  }
  const qs = resolveQuestions(key);
  if (qs.length === 0) {
    alert('该章节暂无题目，请选择其他章节。');
    return;
  }
  gameState.mode = 'single';
  gameState.chapterKey = key;
  document.getElementById('startScreen').style.display = 'none';
  initSingleGame(qs);
}

function initSingleGame(questionList) {
  gameState.singleScore = 0;
  gameState.singleCorrect = 0;
  gameState.singleWrong = 0;
  gameState.singleRecord = [];
  gameState.singlePick = [];
  gameState.singleAnswer = null;
  gameState.currentIndex = 0;
  gameState.questions = shuffle(questionList);
  gameState.totalQuestions = gameState.questions.length;
  gameState.seconds = 0;

  clearInterval(gameState.timer);
  startTimer();

  $('mainArea').style.display = 'none';
  $('singleArea').style.display = 'flex';
  buildSDots();
  updateSingleTrack();
  loadSingleQuestion(0);

  $('resultScreen').classList.remove('show');
  $('confettiContainer').classList.remove('show');
  $('confettiContainer').innerHTML = '';
}

function buildSDots() {
  const box = $('sQdots');
  box.innerHTML = '';
  for (let i = 0; i < gameState.totalQuestions; i++) {
    const dot = document.createElement('div');
    dot.className = 'q-dot' + (i === 0 ? ' current' : '');
    dot.id = 'sqdot-' + i;
    box.appendChild(dot);
  }
}

function updateSDot(index, result) {
  const dot = document.getElementById('sqdot-' + index);
  if (dot) {
    dot.classList.remove('current');
    dot.classList.add(result === 'correct' ? 'done-correct' : 'done-wrong');
  }
  const next = document.getElementById('sqdot-' + (index + 1));
  if (next) next.classList.add('current');
}

function updateSingleTrack() {
  $('sCorrect').textContent = gameState.singleCorrect;
  $('sWrong').textContent = gameState.singleWrong;
  $('sScore').textContent = gameState.singleScore;
}

function loadSingleQuestion(index) {
  const q = gameState.questions[index];
  gameState.singleAnswer = null;

  $('questionProgress').textContent = `第 ${index + 1} / ${gameState.totalQuestions} 题`;
  $('topicBadge').textContent = `知识点：${q.topic}`;
  const textEl = $('sQuestionText');
  const mathContent = renderQuestionBody(textEl, q);

  $('sResultMsg').innerHTML = '';
  $('nextBtn').classList.remove('show');

  renderSingleAnswerArea(q);

  // MathJax 按需渲染：题干 + 单人答题区
  if (window.MathJax && MathJax.typesetPromise && /[\$\\]/.test(mathContent)) {
    MathJax.typesetPromise([textEl, $('sAnswerArea')]).catch(err => console.log('MathJax error:', err));
  }
}

function renderSingleAnswerArea(q) {
  const area = $('sAnswerArea');
  area.innerHTML = '';
  Object.keys(q.options).forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.innerHTML = `${key}. ${normalizePhysicsText(q.options[key])}`;
    btn.dataset.key = key;
    btn.onclick = () => submitSingle(key);
    area.appendChild(btn);
  });
}

function submitSingle(answerKey) {
  if (gameState.singleAnswer !== null) return;
  const q = gameState.questions[gameState.currentIndex];
  const isCorrect = answerKey === q.answer;
  gameState.singleAnswer = answerKey;

  if (isCorrect) {
    gameState.singleCorrect++;
    gameState.singleScore += CONFIG.correctScore;
  } else {
    gameState.singleWrong++;
    gameState.singleScore += CONFIG.wrongScore;
  }
  gameState.singleRecord.push(isCorrect ? 'correct' : 'wrong');
      gameState.singlePick.push(answerKey);   // 记录实际所选选项，供错题回顾展示
  updateSDot(gameState.currentIndex, isCorrect ? 'correct' : 'wrong');
  updateSingleTrack();

  const buttons = document.querySelectorAll('#sAnswerArea .answer-btn');
  buttons.forEach(btn => {
    const key = btn.dataset.key;
    if (key === q.answer) btn.classList.add('correct');
    else if (key === answerKey) btn.classList.add('wrong');
    btn.disabled = true;
  });

  if (isCorrect) { sound.correct(); } else { sound.wrong(); }

  const answerText = `${q.answer}. ${normalizePhysicsText(q.options[q.answer])}`;
  $('sResultMsg').innerHTML = `<b>${isCorrect ? '✅ 回答正确' : '❌ 回答错误'}</b>　正确答案：${answerText}`;

  const btn = $('nextBtn');
  btn.textContent = gameState.currentIndex < gameState.totalQuestions - 1 ? '下一题 ▶' : '查看结果 🏆';
  btn.classList.add('show');
}
