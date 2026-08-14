// 道法研习社 - 主逻辑文件

document.addEventListener("DOMContentLoaded", function () {
  // ========== 导航栏菜单 ==========
  const navbarToggle = document.querySelector(".navbar-toggle");
  const navbarMenu = document.querySelector(".navbar-menu");

  if (navbarToggle) {
    navbarToggle.addEventListener("click", function () {
      navbarMenu.classList.toggle("open");
    });
  }

  // 点击导航链接后关闭移动端菜单
  document.querySelectorAll(".navbar-menu a").forEach((link) => {
    link.addEventListener("click", function () {
      navbarMenu.classList.remove("open");
    });
  });

  // 滚动时高亮当前导航项
  const sections = document.querySelectorAll(".section");
  const navLinks = document.querySelectorAll(".navbar-menu a");

  window.addEventListener("scroll", function () {
    let current = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 100;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === "#" + current) {
        link.classList.add("active");
      }
    });
  });

  // ========== 手风琴（答题技巧） ==========
  const accordionHeaders = document.querySelectorAll(".accordion-header");
  accordionHeaders.forEach((header) => {
    header.addEventListener("click", function () {
      const item = this.parentElement;
      item.classList.toggle("open");
    });
  });

  // ========== 高频考点 Tab 切换 ==========
  const examTabs = document.querySelectorAll(".exam-tab");
  examTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      examTabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      const target = this.getAttribute("data-target");
      document.querySelectorAll(".exam-list").forEach((list) => {
        list.style.display = list.getAttribute("data-category") === target ? "block" : "none";
      });
    });
  });

  // ========== 练习题筛选 ==========
  const exerciseFilters = document.querySelectorAll(".exercise-filter");
  exerciseFilters.forEach((filter) => {
    filter.addEventListener("click", function () {
      exerciseFilters.forEach((f) => f.classList.remove("active"));
      this.classList.add("active");
      const unit = this.getAttribute("data-unit");
      document.querySelectorAll(".exercise-card").forEach((card) => {
        if (unit === "all" || card.getAttribute("data-unit") === unit) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  // ========== 练习题：查看/隐藏答案 ==========
  document.querySelectorAll(".btn-toggle-answer").forEach((btn) => {
    btn.addEventListener("click", function () {
      const answerDiv = this.closest(".exercise-card").querySelector(".exercise-answer");
      answerDiv.classList.toggle("show");
      this.textContent = answerDiv.classList.contains("show") ? "隐藏参考答案" : "查看参考答案";
    });
  });

  // ========== 练习题：清空作答 ==========
  document.querySelectorAll(".btn-clear-input").forEach((btn) => {
    btn.addEventListener("click", function () {
      const textarea = this.closest(".exercise-card").querySelector(".exercise-input");
      if (textarea) {
        textarea.value = "";
        textarea.focus();
      }
    });
  });

  // ========== 万能句积累本 ==========
  const SENTENCE_KEY = "daofa_sentences";

  function loadSentences() {
    const stored = localStorage.getItem(SENTENCE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [...defaultSentences];
      }
    }
    return [...defaultSentences];
  }

  function saveSentences(sentences) {
    localStorage.setItem(SENTENCE_KEY, JSON.stringify(sentences));
  }

  function renderSentences() {
    const sentences = loadSentences();
    const groups = {};
    sentences.forEach((s) => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });

    const container = document.getElementById("sentence-groups");
    if (!container) return;

    container.innerHTML = "";
    Object.keys(groups).forEach((category) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "sentence-group";
      groupDiv.innerHTML = `
        <h4>${category} <span class="count">${groups[category].length}</span></h4>
        <div class="sentence-items">
          ${groups[category]
            .map(
              (s, i) => `
            <div class="sentence-item">
              <span class="sentence-text">${escapeHtml(s.text)}</span>
              <button class="sentence-delete" data-index="${sentences.indexOf(s)}" title="删除">✕</button>
            </div>
          `
            )
            .join("")}
        </div>
      `;
      container.appendChild(groupDiv);
    });

    // 绑定删除事件
    container.querySelectorAll(".sentence-delete").forEach((btn) => {
      btn.addEventListener("click", function () {
        const idx = parseInt(this.getAttribute("data-index"));
        const current = loadSentences();
        current.splice(idx, 1);
        saveSentences(current);
        renderSentences();
      });
    });
  }

  // 添加万能句
  const addSentenceBtn = document.getElementById("btn-add-sentence");
  if (addSentenceBtn) {
    addSentenceBtn.addEventListener("click", function () {
      const categorySelect = document.getElementById("sentence-category");
      const input = document.getElementById("sentence-input");
      const category = categorySelect.value;
      const text = input.value.trim();

      if (!text) {
        showToast("请输入句子内容");
        return;
      }

      const sentences = loadSentences();
      sentences.push({ category, text });
      saveSentences(sentences);
      input.value = "";
      renderSentences();
      showToast("添加成功！");
    });
  }

  // 重置万能句
  const resetBtn = document.getElementById("btn-reset-sentences");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (confirm("确定要重置为默认句子吗？你添加的句子将会丢失。")) {
        localStorage.removeItem(SENTENCE_KEY);
        renderSentences();
        showToast("已重置为默认句子");
      }
    });
  }

  renderSentences();

  // ========== 进度打卡 ==========
  const CHECKIN_KEY = "daofa_checkins";

  function loadCheckins() {
    const stored = localStorage.getItem(CHECKIN_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  function saveCheckins(checkins) {
    localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins));
  }

  function formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  }

  function renderCheckins() {
    const checkins = loadCheckins();
    const listContainer = document.getElementById("checkin-list");
    const statTotal = document.getElementById("checkin-total");
    const statStreak = document.getElementById("checkin-streak");
    const statWeek = document.getElementById("checkin-week");

    if (!listContainer) return;

    // 统计
    if (statTotal) statTotal.textContent = checkins.length;

    // 连续天数
    let streak = 0;
    if (checkins.length > 0) {
      const sorted = [...checkins].sort((a, b) => new Date(b.date) - new Date(a.date));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = formatDate(checkDate);
        if (sorted.some((c) => c.date === dateStr)) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
    }
    if (statStreak) statStreak.textContent = streak;

    // 本周打卡
    const now = new Date();
    const weekStart = new Date(now);
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekCount = checkins.filter((c) => new Date(c.date) >= weekStart).length;
    if (statWeek) statWeek.textContent = weekCount;

    // 列表
    if (checkins.length === 0) {
      listContainer.innerHTML = '<div class="checkin-empty">还没有打卡记录，开始你的第一次打卡吧！💪</div>';
      return;
    }

    const sorted = [...checkins].sort((a, b) => new Date(b.date) - new Date(a.date));
    listContainer.innerHTML = sorted
      .map(
        (c, i) => `
        <div class="checkin-item">
          <span class="checkin-date">${c.date}</span>
          <span class="checkin-content">${escapeHtml(c.content)}</span>
          <button class="checkin-delete" data-idx="${checkins.indexOf(c)}" title="删除">✕</button>
        </div>
      `
      )
      .join("");

    listContainer.querySelectorAll(".checkin-delete").forEach((btn) => {
      btn.addEventListener("click", function () {
        const idx = parseInt(this.getAttribute("data-idx"));
        const current = loadCheckins();
        current.splice(idx, 1);
        saveCheckins(current);
        renderCheckins();
      });
    });
  }

  // 打卡按钮
  const checkinBtn = document.getElementById("btn-checkin");
  if (checkinBtn) {
    checkinBtn.addEventListener("click", function () {
      const input = document.getElementById("checkin-input");
      const content = input.value.trim();
      if (!content) {
        showToast("请输入今天学了什么");
        return;
      }

      const checkins = loadCheckins();
      const today = formatDate(new Date());
      checkins.push({ date: today, content: content });
      saveCheckins(checkins);
      input.value = "";
      renderCheckins();
      showToast("打卡成功！继续加油 💪");
    });
  }

  renderCheckins();

  // ========== 工具函数 ==========
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(26, 83, 92, 0.95);
      color: #fff;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 0.85rem;
      z-index: 9999;
      animation: fadeIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }


  // ========== 暗黑模式 ==========
  var THEME_KEY = "daofa_theme";
  var themeToggle = document.querySelector(".theme-toggle");
  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
      if (themeToggle) themeToggle.textContent = "\u2600\ufe0f";
    } else {
      document.body.classList.remove("dark-theme");
      if (themeToggle) themeToggle.textContent = "\ud83c\udf19";
    }
  }
  var savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = document.body.classList.contains("dark-theme") ? "dark" : "light";
      var next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  // ========== 返回顶部 ==========
  var backToTop = document.querySelector(".back-to-top");
  if (backToTop) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 400) {
        backToTop.classList.add("show");
      } else {
        backToTop.classList.remove("show");
      }
    });
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ========== 作答自动保存 ==========
  var ANSWER_KEY = "daofa_answers";
  function loadAnswers() {
    try { return JSON.parse(localStorage.getItem(ANSWER_KEY) || "{}"); }
    catch(e) { return {}; }
  }
  function saveAnswer(id, text) {
    var answers = loadAnswers();
    if (text.trim()) {
      answers[id] = text;
    } else {
      delete answers[id];
    }
    localStorage.setItem(ANSWER_KEY, JSON.stringify(answers));
  }
  document.querySelectorAll(".exercise-input").forEach(function(textarea) {
    var id = textarea.getAttribute("data-id");
    if (!id) return;
    var answers = loadAnswers();
    if (answers[id]) textarea.value = answers[id];
    textarea.addEventListener("input", function() {
      saveAnswer(id, this.value);
    });
  });

  // ========== 自评打分 ==========
  var SCORE_KEY = "daofa_scores";
  function loadScores() {
    try { return JSON.parse(localStorage.getItem(SCORE_KEY) || "{}"); }
    catch(e) { return {}; }
  }
  function saveScore(id, score) {
    var scores = loadScores();
    scores[id] = score;
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
  }
  function renderScores() {
    var scores = loadScores();
    document.querySelectorAll(".exercise-scoring").forEach(function(scoringDiv) {
      var id = scoringDiv.getAttribute("data-id");
      var currentScore = scores[id] || 0;
      scoringDiv.querySelectorAll(".star").forEach(function(star) {
        var score = parseInt(star.getAttribute("data-score"));
        star.classList.toggle("active", score <= currentScore);
      });
    });
  }
  document.querySelectorAll(".exercise-scoring .star").forEach(function(star) {
    star.addEventListener("click", function() {
      var score = parseInt(this.getAttribute("data-score"));
      var scoringDiv = this.closest(".exercise-scoring");
      var id = scoringDiv.getAttribute("data-id");
      saveScore(id, score);
      renderScores();
      showToast("\u2b50 \u81ea\u8bc4" + score + "\u661f\uff01");
    });
  });
  renderScores();

  // ========== 错题收藏 ==========
  var FAVORITE_KEY = "daofa_favorites";
  function loadFavorites() {
    try { return JSON.parse(localStorage.getItem(FAVORITE_KEY) || "[]"); }
    catch(e) { return []; }
  }
  function saveFavorites(favs) {
    localStorage.setItem(FAVORITE_KEY, JSON.stringify(favs));
  }
  function renderFavorites() {
    var favs = loadFavorites();
    document.querySelectorAll(".btn-favorite").forEach(function(btn) {
      var id = btn.getAttribute("data-id");
      if (favs.includes(id)) {
        btn.classList.add("active");
        btn.textContent = "\u2605";
      } else {
        btn.classList.remove("active");
        btn.textContent = "\u2606";
      }
    });
  }
  document.querySelectorAll(".btn-favorite").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      var id = this.getAttribute("data-id");
      var favs = loadFavorites();
      if (favs.includes(id)) {
        favs = favs.filter(function(f) { return f !== id; });
        showToast("\u5df2\u53d6\u6d88\u6536\u85cf");
      } else {
        favs.push(id);
        showToast("\u2b50 \u5df2\u6536\u85cf\uff01");
      }
      saveFavorites(favs);
      renderFavorites();
    });
  });
  renderFavorites();

  // 收藏筛选
  var favFilter = document.querySelector('.exercise-filter[data-unit="favorites"]');
  if (favFilter) {
    favFilter.addEventListener("click", function() {
      var favs = loadFavorites();
      document.querySelectorAll(".exercise-card").forEach(function(card) {
        var id = card.getAttribute("data-id");
        card.style.display = favs.includes(id) ? "block" : "none";
      });
    });
  }

  // ========== 知识梳理 7A/7B 切换 ==========
  var knowledgeTabs = document.querySelectorAll(".knowledge-tab");
  knowledgeTabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
      knowledgeTabs.forEach(function(t) { t.classList.remove("active"); });
      this.classList.add("active");
      var target = this.getAttribute("data-target");
      document.querySelectorAll(".knowledge-content").forEach(function(content) {
        content.style.display = content.getAttribute("data-content") === target ? "block" : "none";
      });
    });
  });

});