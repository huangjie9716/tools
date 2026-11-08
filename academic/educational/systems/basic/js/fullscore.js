"use strict";

/* =========================================================
   满分设置
   ========================================================= */
function openFullScoreSettings(){
  if (!state.subjects.length) {
    toast("请先导入成绩文件", "error");
    return;
  }
  const list = $("#fullScoreList");
  list.innerHTML = state.subjects.map(sub => {
    const def = getDefaultFull(sub.name);
    const value = getFull(sub.name);
    return '<div class="score-row">' +
      '<div><span class="name">' + escapeHtml(sub.name) + '</span>' +
      '<span class="hint">默认 ' + def + ' 分</span></div>' +
      '<input type="number" min="1" step="0.5" data-subject="' + escapeHtml(sub.name) + '" value="' + escapeHtml(value) + '">' +
    '</div>';
  }).join("");
  updateTotalFullPreview();
  openModal("fullScoreModal");
}
function updateTotalFullPreview(){
  let sum = 0;
  $$("#fullScoreList input").forEach(input => {
    const subject = input.getAttribute("data-subject");
    if (!state.includeBioGeo && typeof isBioGeoSubject === "function" && isBioGeoSubject(subject)) return;
    const v = Number(input.value);
    if (Number.isFinite(v) && v > 0) sum += v;
  });
  $("#totalFullPreview").textContent = sum ? String(round2(sum)) : "0";
  const label = $("#totalFullLabel");
  if (label) {
    const extras = (state.subjects || []).filter(sub => isBioGeoSubject(sub.name)).map(sub => sub.name);
    label.textContent = extras.length && !state.includeBioGeo
      ? "总分满分（未含" + extras.join("、") + "）"
      : "总分满分（上传学科满分之和）";
  }
}
function saveFullScoreSettings(){
  const inputs = $$("#fullScoreList input");
  const next = {};
  for (const input of inputs) {
    const subject = input.getAttribute("data-subject");
    const v = Number(input.value);
    if (!Number.isFinite(v) || v <= 0) {
      toast("“" + subject + "”的满分必须是大于 0 的数字", "error");
      input.focus();
      return;
    }
    next[subject] = v;
  }
  Object.assign(state.fullScores, next);
  safeLocalSet(FULL_SCORE_STORAGE_KEY, JSON.stringify(state.fullScores));
  refreshComputed();
  renderAll();
  closeModal("fullScoreModal");
  toast("满分设置已保存，指标已重新计算", "success");
}
function resetFullScoreSettings(){
  $$("#fullScoreList input").forEach(input => {
    input.value = String(getDefaultFull(input.getAttribute("data-subject")));
  });
  updateTotalFullPreview();
}
