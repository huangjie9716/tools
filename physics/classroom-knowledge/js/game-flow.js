// ===================================================================
//  流程控制：开始 PK、返回主界面、重新开始、计时器、下一题
//  依赖：state.js、game-pk.js、game-single.js、results.js
// ===================================================================

function goHome() {
  clearInterval(gameState.timer);
  gameState.timer = null;
  $('scoreA').textContent = '0';
  $('scoreB').textContent = '0';
  $('startScreen').style.display = 'flex';
  $('resultScreen').classList.remove('show');
  $('confettiContainer').classList.remove('show');
  $('confettiContainer').innerHTML = '';
  $('timerDisplay').textContent = '00:00';
  closeMistakes();
  gameState.questions = [];
  gameState.totalQuestions = 0;
  gameState.currentIndex = 0;
  gameState.recordA = [];
  gameState.recordB = [];
  gameState.pickA = [];
  gameState.pickB = [];
  gameState.correctA = 0;
  gameState.correctB = 0;
  // 单人模式重置
  gameState.mode = 'pk';
  gameState.singleScore = 0;
  gameState.singleCorrect = 0;
  gameState.singleWrong = 0;
  gameState.singleRecord = [];
  gameState.singlePick = [];
  gameState.singleAnswer = null;
  $('mainArea').style.display = 'grid';
  $('singleArea').style.display = 'none';
  $('nextBtn').classList.remove('show');   // 回到主界面时收起“下一题”，避免残留状态
  $('startBtn').disabled = false;
  $('singleBtn').disabled = false;
}


function startGame() {
  const key = document.getElementById('sectionSelect').value;
  if (!key) {
    alert('请先选择一个小节。');
    return;
  }
  const qs = resolveQuestions(key);
  if (qs.length === 0) {
    alert('该章节暂无题目，请选择其他章节。');
    return;
  }
  gameState.mode = 'pk';
  gameState.chapterKey = key;
  document.getElementById('startScreen').style.display = 'none';
  initGame(qs);
}


function restartGame() {
  const key = gameState.chapterKey || '1.1';
  const qs = resolveQuestions(key);
  if (qs.length === 0) {
    alert('该章节无题目，请返回重新选择。');
    document.getElementById('startScreen').style.display = 'flex';
    return;
  }
  if (gameState.mode === 'single') {
    initSingleGame(qs);
  } else {
    initGame(qs);
  }
}


function startTimer() {
  document.getElementById('timerDisplay').textContent = '00:00';
  gameState.timer = setInterval(() => {
    gameState.seconds++;
    const m = String(Math.floor(gameState.seconds / 60)).padStart(2, '0');
    const s = String(gameState.seconds % 60).padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${m}:${s}`;
  }, 1000);
}


function nextQuestion() {
  if (gameState.mode === 'single') {
    if (gameState.currentIndex < gameState.totalQuestions - 1) {
      gameState.currentIndex++;
      loadSingleQuestion(gameState.currentIndex);
    } else {
      showSingleResult();
    }
    return;
  }
  if (gameState.currentIndex < gameState.totalQuestions - 1) {
    gameState.currentIndex++;
    loadQuestion(gameState.currentIndex);
  } else {
    showResult();
  }
}
