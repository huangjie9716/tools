// ===================================================================
//  字号缩放（右下角带圈 “＋ / －” 按钮）
//  —— 题干：题目区右下角一对，＋ 放大、－ 缩小
//  —— 选项：左右两个面板右下角各一对，任一个都能同时缩放左右两侧选项
//          （单人刷题区也补了一对）
//  每按一次 12%，范围 0 ~ 5 级：0 级 = 页面按题目长度自动算的默认字号，
//  最大约 1.6 倍。到边界后按钮会变暗不可点，方便反复微调找到合适字号。
//  被 question-text.js 调用（applyQuestionZoom），依赖 config.js（$）与 sound.js
// ===================================================================

const FONT_ZOOM_STEP = 0.12;    // 每按一次缩放的比例
const FONT_ZOOM_MAX_STEP = 5;   // 上限：最多放大到约 1.6 倍（避免过大影响排版）

const questionZoom = { step: 0 };   // 题干缩放级数
const optionsZoom = { step: 0 };    // 选项缩放级数

function zoomFactor(step) { return 1 + FONT_ZOOM_STEP * step; }

// 题干：按当前级数重新计算字号（基准字号存在 dataset.baseVw 上）
function applyQuestionZoom(textEl) {
  if (!textEl) return;
  const base = parseFloat(textEl.dataset.baseVw) || 2.1;
  const f = zoomFactor(questionZoom.step);
  textEl.style.fontSize =
    `clamp(${(0.95 * f).toFixed(2)}rem, ${(base * f).toFixed(2)}vw, ${(2.8 * f).toFixed(2)}rem)`;
}

// 题干缩放：dir = 1 放大 / -1 缩小（已在边界则不动）
function zoomQuestionText(dir) {
  const next = clampZoomStep(questionZoom.step, dir);
  if (next === questionZoom.step) return;
  questionZoom.step = next;
  document.querySelectorAll('.question-text, .s-question-text').forEach(applyQuestionZoom);
  updateZoomButtons();
  sound.click();
}

// 选项缩放：一次同时作用于左右两侧（通过 --opt-zoom 变量，见 css/game.css）
function zoomOptionsFont(dir) {
  const next = clampZoomStep(optionsZoom.step, dir);
  if (next === optionsZoom.step) return;
  optionsZoom.step = next;
  document.documentElement.style.setProperty('--opt-zoom', zoomFactor(optionsZoom.step).toFixed(3));
  updateZoomButtons();
  sound.click();
}

// 级数限制在 0 ~ FONT_ZOOM_MAX_STEP 之间（dir 传 -1 缩小，其余按放大处理）
function clampZoomStep(step, dir) {
  return Math.max(0, Math.min(FONT_ZOOM_MAX_STEP, step + (dir < 0 ? -1 : 1)));
}

// 同步所有＋/－按钮：到最小 / 最大后变暗不可点
function updateZoomButtons() {
  setZoomBtnState($('zoomQuestionBtn'), questionZoom.step, '题干', 1);
  setZoomBtnState($('zoomQuestionDownBtn'), questionZoom.step, '题干', -1);
  document.querySelectorAll('.zoom-options-btn')
    .forEach(btn => setZoomBtnState(btn, optionsZoom.step, '选项', 1));
  document.querySelectorAll('.zoom-options-down-btn')
    .forEach(btn => setZoomBtnState(btn, optionsZoom.step, '选项', -1));
}

function setZoomBtnState(btn, step, label, dir) {
  if (!btn) return;
  const atEdge = dir > 0 ? step >= FONT_ZOOM_MAX_STEP : step <= 0;
  btn.disabled = atEdge;
  const pct = Math.round((zoomFactor(step) - 1) * 100);
  const now = pct > 0 ? `已放大 ${pct}%` : '默认字号';
  btn.title = atEdge
    ? (dir > 0 ? `${label}字号已达最大（${now}）` : `${label}字号已是默认大小，不能再小`)
    : `${dir > 0 ? '放大' : '缩小'}${label}字号（当前${now}，共 0 ~ ${FONT_ZOOM_MAX_STEP} 级）`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateZoomButtons);
} else {
  updateZoomButtons();
}
