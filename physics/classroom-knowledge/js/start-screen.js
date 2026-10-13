// ===================================================================
//  开始界面：年级 / 章 / 节 下拉框、题量提示、知识点标签、选择记忆
//  依赖：data/* 数据文件、config.js
// ===================================================================

// ===================================================================
//  整章模式：第21、22章题量较少，去掉"节"选择，选中章后直接合并整章题目
// ===================================================================
const wholeChapterSections = {
  '21': ['21.1', '21.2', '21.3'],
  '22': ['22.1', '22.2', '22.3', '22.4', '22.5']
};
// 按 key 取题：章节级 key 合并该章所有小节题目，其余直接取对应题库
function resolveQuestions(key) {
  if (!key) return [];
  const parts = wholeChapterSections[key];
  if (parts) return parts.flatMap(k => chapterQuestions[k] || []);
  return chapterQuestions[key] || [];
}
// 判断是否为"整章模式"（节选项仅一个且非 x.y 小节格式）
function isWholeChapter(sections) {
  return sections.length === 1 && !/^\d+\.\d+$/.test(sections[0] || '');
}
// 根据当前选中的节/整章刷新"开始 PK"与"单人刷题"按钮可用状态
function updateStartBtn() {
  const key = document.getElementById('sectionSelect').value;
  const hasQ = resolveQuestions(key).length > 0;
  document.getElementById('startBtn').disabled = !hasQ;
  document.getElementById('singleBtn').disabled = !hasQ;
}


// ===================================================================
//  开始界面选择记忆（localStorage）
// ===================================================================
const LAST_SEL_KEY = 'pkLastSelection';
function saveSelection() {
  try {
    localStorage.setItem(LAST_SEL_KEY, JSON.stringify({
      grade: document.getElementById('gradeSelect').value,
      chapter: document.getElementById('chapterSelect').value,
      section: document.getElementById('sectionSelect').value
    }));
  } catch (e) { /* 忽略存储异常 */ }
}
function loadSelection() {
  try {
    const raw = localStorage.getItem(LAST_SEL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}


// ===================================================================
//  初始化下拉菜单
// ===================================================================
function populateSelects() {
  const gradeSelect = document.getElementById('gradeSelect');
  const chapterSelect = document.getElementById('chapterSelect');
  const sectionSelect = document.getElementById('sectionSelect');

  Object.keys(gradeStructure).forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    gradeSelect.appendChild(opt);
  });

  gradeSelect.addEventListener('change', function() {
    const grade = this.value;
    const data = gradeStructure[grade];
    if (!data) return;
    chapterSelect.innerHTML = '<option value="">-- 请选择章 --</option>';
    sectionSelect.innerHTML = '<option value="">-- 请选择节 --</option>';
    data.chapters.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch;
      opt.textContent = ch;
      chapterSelect.appendChild(opt);
    });
    chapterSelect.dispatchEvent(new Event('change'));
    saveSelection();
  });

  chapterSelect.addEventListener('change', function() {
    const grade = gradeSelect.value;
    const chapter = this.value;
    if (!grade || !chapter) {
      sectionSelect.innerHTML = '<option value="">-- 请选择节 --</option>';
      document.getElementById('sectionGroup').classList.remove('hidden');
      updateQuestionCountHint();
      updateStartBtn();
      saveSelection();
      return;
    }
    const sections = gradeStructure[grade].sections[chapter] || [];
    sectionSelect.innerHTML = '<option value="">-- 请选择节 --</option>';
    sections.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = chapterDisplayNames[s] || s;
      sectionSelect.appendChild(opt);
    });
    if (sections.length > 0) {
      sectionSelect.value = sections[0];
    }
    // 整章模式（第21/22章）：隐藏"节"下拉框，直接使用整章题目
    document.getElementById('sectionGroup').classList.toggle('hidden', isWholeChapter(sections));
    updateQuestionCountHint();
    updateTagList(sectionSelect.value);
    updateStartBtn();
    saveSelection();
  });

  sectionSelect.addEventListener('change', function() {
    updateQuestionCountHint();
    updateTagList(this.value);
    updateStartBtn();
    saveSelection();
  });

  // 恢复上次选择（localStorage）；无记录则用默认（八年级上册第一章第一节）
  const saved = loadSelection();
  const defGrade = (saved && gradeStructure[saved.grade]) ? saved.grade : '八年级上册';
  gradeSelect.value = defGrade;
  gradeSelect.dispatchEvent(new Event('change'));
  setTimeout(() => {
    const data = gradeStructure[defGrade];
    const chapters = data ? data.chapters : [];
    const defChapter = (saved && chapters.indexOf(saved.chapter) !== -1) ? saved.chapter : chapters[0];
    if (defChapter) {
      chapterSelect.value = defChapter;
      chapterSelect.dispatchEvent(new Event('change'));
      setTimeout(() => {
        const sections = gradeStructure[defGrade].sections[defChapter] || [];
        const defSection = (saved && sections.indexOf(saved.section) !== -1) ? saved.section : sections[0];
        if (sections.length > 0) {
          sectionSelect.value = defSection;
          sectionSelect.dispatchEvent(new Event('change'));
        }
      }, 50);
    }
  }, 50);
}

function updateQuestionCountHint() {
  const key = document.getElementById('sectionSelect').value;
  const qs = resolveQuestions(key);
  document.getElementById('questionCountHint').textContent = `当前题库共 ${qs.length} 题`;
}

function updateTagList(chapterKey) {

  const tags = tagMap[chapterKey] || ['物理知识', '双人PK'];
  document.getElementById('tagList').innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');
}
