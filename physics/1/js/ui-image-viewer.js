// ===================================================================
//  图片放大查看器：点击题干 / 错题中的图片放大，点 × 或背景关闭
// ===================================================================

// ===================================================================
//  图片放大查看器：点击题目/错题中的图片放大，点 × 或背景或 Esc 关闭
// ===================================================================
const imgViewer = $('imgViewer');
const imgViewerImg = $('imgViewerImg');
function openImageViewer(img) {
  const src = img.currentSrc || img.src;
  if (!src) return;
  imgViewerImg.src = src;
  imgViewerImg.alt = img.alt || '';
  imgViewer.classList.add('show');
  document.body.classList.add('lightbox-open');
}
function closeImageViewer() {
  imgViewer.classList.remove('show');
  document.body.classList.remove('lightbox-open');
}
// 点击查看器背景（非图片区域）关闭
function onViewerBackdropClick(e) {
  if (e.target === imgViewer) closeImageViewer();
}
// 委托：点击题目/错题区域内的图片即放大（排除查看器自身的图片）
document.addEventListener('click', function(e) {
  const t = e.target;
  if (!t || !t.closest || t.closest('#imgViewer')) return;
  const img = t.closest('img');
  if (img && img.closest('.question-text, .s-question-text, .mistake-item')) {
    openImageViewer(img);
  }
}, true);
