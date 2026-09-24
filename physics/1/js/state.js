// ===================================================================
//  游戏状态（gameState）与洗牌工具
// ===================================================================

// ===================================================================
//  游戏状态
// ===================================================================
let gameState = {
  mode: 'pk',              // 'pk' 双人PK / 'single' 单人刷题
  scoreA: 0,
  scoreB: 0,
  currentIndex: 0,
  questions: [],
  totalQuestions: 0,
  seconds: 0,
  timer: null,
  answerA: null,
  answerB: null,
  recordA: [],
  recordB: [],
  pickA: [],               // 双人：A 每题实际选择的选项（'A'~'F'；未答为 null）
  pickB: [],               // 双人：B 每题实际选择的选项
  chapterKey: '1.1',
  correctA: 0,             // 统计：A 答对题数
  correctB: 0,             // 统计：B 答对题数
  singleScore: 0,          // 单人：得分
  singleCorrect: 0,        // 单人：答对题数
  singleWrong: 0,          // 单人：答错题数
  singleRecord: [],        // 单人：每题作答记录（'correct'/'wrong'）
  singlePick: [],          // 单人：每题实际选择的选项
  singleAnswer: null       // 单人：当前题作答选项
};


function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleGroups(questionList) {
  const groups = {};
  const noGroup = [];
  questionList.forEach(q => {
    if (q.group) {
      if (!groups[q.group]) groups[q.group] = [];
      groups[q.group].push(q);
    } else {
      noGroup.push(q);
    }
  });
  const groupArray = [];
  for (const key in groups) {
    groupArray.push(groups[key]);
  }
  noGroup.forEach(q => groupArray.push([q]));
  const shuffledGroups = shuffle(groupArray);
  return shuffledGroups.flat();
}
