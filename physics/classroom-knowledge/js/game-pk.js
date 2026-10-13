// ===================================================================
//  双人 PK 模式：出题、双方作答、判定计分、进度点与答题记录
//  依赖：config.js、state.js、question-text.js、sound.js
// ===================================================================

function initGame(questionList) {
  gameState.scoreA = 0;
  gameState.scoreB = 0;
  gameState.currentIndex = 0;
  if (gameState.chapterKey && (gameState.chapterKey.startsWith('17.') || gameState.chapterKey.startsWith('18.'))) {
gameState.questions = questionList;  // 直接使用原顺序
     } else {
gameState.questions = shuffleGroups(questionList);
    } 
  gameState.totalQuestions = gameState.questions.length;
  gameState.seconds = 0;
  gameState.answerA = null;
  gameState.answerB = null;
  gameState.recordA = [];
  gameState.recordB = [];
  gameState.pickA = [];
  gameState.pickB = [];
  gameState.correctA = 0;
  gameState.correctB = 0;

  clearInterval(gameState.timer);
  startTimer();
  updateScores();
  buildDots();
  updateRecords();
  loadQuestion(0);

  document.getElementById('resultScreen').classList.remove('show');
  document.getElementById('confettiContainer').classList.remove('show');
  document.getElementById('confettiContainer').innerHTML = '';
}


function updateScores() {
  document.getElementById('scoreA').textContent = gameState.scoreA;
  document.getElementById('scoreB').textContent = gameState.scoreB;
}


function buildDots() {
  const box = document.getElementById('qDots');
  box.innerHTML = '';
  for (let i = 0; i < gameState.totalQuestions; i++) {
    const dot = document.createElement('div');
    dot.className = 'q-dot' + (i === 0 ? ' current' : '');
    dot.id = 'qdot-' + i;
    box.appendChild(dot);
  }
}


function updateDot(index, result) {
  const dot = document.getElementById('qdot-' + index);
  if (dot) {
    dot.classList.remove('current');
    dot.classList.add(result === 'correct' ? 'done-correct' : 'done-wrong');
  }
  const next = document.getElementById('qdot-' + (index + 1));
  if (next) next.classList.add('current');
}


function updateRecords() {
  ['A', 'B'].forEach(player => {
    const list = player === 'A' ? gameState.recordA : gameState.recordB;
    const el = document.getElementById('record' + player);
    el.innerHTML = '';
    for (let i = 0; i < gameState.totalQuestions; i++) {
      const dot = document.createElement('div');
      dot.className = 'record-dot';
      if (list[i]) dot.classList.add(list[i]);
      el.appendChild(dot);
    }
  });
}


function loadQuestion(index) {
  const q = gameState.questions[index];
  gameState.answerA = null;
  gameState.answerB = null;

  $('questionProgress').textContent = `第 ${index + 1} / ${gameState.totalQuestions} 题`;
  $('topicBadge').textContent = `知识点：${q.topic}`;
  const textEl = $('questionText');
  const mathContent = renderQuestionBody(textEl, q);

  $('resultMsg').innerHTML = '';
  $('nextBtn').classList.remove('show');

  $('statusA').textContent = '请作答';
  $('statusB').textContent = '请作答';

  $('panelA').classList.remove('correct-flash', 'wrong-flash');
  $('panelB').classList.remove('correct-flash', 'wrong-flash');

  const keys = Object.keys(q.options);
  renderAnswerArea('A', q, keys);
  const shuffledKeys = shuffle([...keys]);
  renderAnswerArea('B', q, shuffledKeys);

  // MathJax 按需渲染：仅当题干或选项含数学标记时，只重排本题相关区域
  // （题干 + 左右两个答题区，避免选项中的公式漏渲染）
  if (window.MathJax && MathJax.typesetPromise && /[\$\\]/.test(mathContent)) {
    MathJax.typesetPromise([textEl, $('answerAreaA'), $('answerAreaB')]).catch(err => console.log('MathJax error:', err));
  }
}


function renderAnswerArea(player, question, keyOrder) {
  const area = document.getElementById('answerArea' + player);
  area.innerHTML = '';
  keyOrder.forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    // 用 innerHTML + 规范化，正确显示选项中的上标/下标（如 10<sup>3</sup>、F₁）
    btn.innerHTML = `${key}. ${normalizePhysicsText(question.options[key])}`;
    btn.dataset.key = key;
    btn.onclick = (e) => submitAnswer(player, e.target.dataset.key);
    area.appendChild(btn);
  });
}


function disablePlayerButtons(player) {
  document.querySelectorAll(`#answerArea${player} .answer-btn`).forEach(btn => btn.disabled = true);
}


// 单人作答：先只锁定选择并标浅灰，不泄露对错（等双方都答完再公布）
function submitAnswer(player, answerKey) {
  const currentAnswer = player === 'A' ? gameState.answerA : gameState.answerB;
  if (currentAnswer !== null) return;

  if (player === 'A') gameState.answerA = answerKey;
  else gameState.answerB = answerKey;

  // 已选中的选项标为浅灰，其余选项变暗：表示“已选择，等待对手”
  document.querySelectorAll(`#answerArea${player} .answer-btn`).forEach(btn => {
    if (btn.dataset.key === answerKey) btn.classList.add('selected');
  });
  disablePlayerButtons(player);
  $(player === 'A' ? 'statusA' : 'statusB').textContent = '⏳ 已选择，等待对手作答…';

  checkBothAnswered();
}


function markPlayerButtons(player, userKey, correctKey) {
  const buttons = document.querySelectorAll(`#answerArea${player} .answer-btn`);
  buttons.forEach(btn => {
    const key = btn.dataset.key;
    if (key === correctKey) {
      btn.classList.add('correct');
    } else if (key === userKey && key !== correctKey) {
      btn.classList.add('wrong');
    }
  });
}


// 双方都作答后才公布结果：防止先答的人被对手偷看对错
function checkBothAnswered() {
  if (gameState.answerA === null || gameState.answerB === null) return;
  revealAnswers();
}


// 公布本题结果：算分、标对错、写记录、显示正确答案
function revealAnswers() {
  const q = gameState.questions[gameState.currentIndex];
  const isCorrectA = gameState.answerA === q.answer;
  const isCorrectB = gameState.answerB === q.answer;

  // 计分与答题记录也推迟到此刻写入：公布前分数 / 记录点都不会泄露对错
  gameState.scoreA += isCorrectA ? CONFIG.correctScore : CONFIG.wrongScore;
  gameState.scoreB += isCorrectB ? CONFIG.correctScore : CONFIG.wrongScore;
  gameState.recordA.push(isCorrectA ? 'correct' : 'wrong');
  gameState.recordB.push(isCorrectB ? 'correct' : 'wrong');
  gameState.pickA.push(gameState.answerA);   // 记录实际所选选项，供错题回顾展示
  gameState.pickB.push(gameState.answerB);
  if (isCorrectA) gameState.correctA++;
  if (isCorrectB) gameState.correctB++;

  $('statusA').textContent = isCorrectA ? `✅ 正确，+${CONFIG.correctScore}分` : `❌ 错误，${CONFIG.wrongScore}分`;
  $('statusB').textContent = isCorrectB ? `✅ 正确，+${CONFIG.correctScore}分` : `❌ 错误，${CONFIG.wrongScore}分`;
  $('panelA').classList.add(isCorrectA ? 'correct-flash' : 'wrong-flash');
  $('panelB').classList.add(isCorrectB ? 'correct-flash' : 'wrong-flash');

  updateScores();
  updateRecords();

  // 去掉“已选择”的浅灰标记，再按正确答案标绿 / 标红
  ['A', 'B'].forEach(p => {
    const userKey = p === 'A' ? gameState.answerA : gameState.answerB;
    document.querySelectorAll(`#answerArea${p} .answer-btn`).forEach(btn => btn.classList.remove('selected'));
    markPlayerButtons(p, userKey, q.answer);
    disablePlayerButtons(p);
  });

  const anyCorrect = isCorrectA || isCorrectB;
  updateDot(gameState.currentIndex, anyCorrect ? 'correct' : 'wrong');

  // 音效：三种结果各不相同 —— 都对 / 一对一错 / 都错
  if (isCorrectA && isCorrectB) { sound.win(); }
  else if (isCorrectA || isCorrectB) { sound.correct(); }
  else { sound.bothWrong(); }

  setTimeout(() => {
    $('panelA').classList.remove('correct-flash', 'wrong-flash');
    $('panelB').classList.remove('correct-flash', 'wrong-flash');
  }, 500);

  const answerText = `${q.answer}. ${normalizePhysicsText(q.options[q.answer])}`;
  $('resultMsg').innerHTML = `
    <div><b>正确答案：</b>${answerText}</div>
    <div style="margin-top:6px;">
      参赛者A：${isCorrectA ? '✅ 正确' : '❌ 错误'}　｜　参赛者B：${isCorrectB ? '✅ 正确' : '❌ 错误'}
    </div>
  `;

  const btn = $('nextBtn');
  btn.textContent = gameState.currentIndex < gameState.totalQuestions - 1 ? '下一题 ▶' : '查看结果 🏆';
  btn.classList.add('show');
}
