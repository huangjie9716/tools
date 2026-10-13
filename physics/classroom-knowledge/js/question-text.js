// ===================================================================
//  物理文本渲染：上下标规范化 + 题干渲染（含图片懒加载、动态字号）
//  被 game-pk.js / game-single.js / results.js 共用
// ===================================================================

// ===================================================================
//  物理符号规范化（上标/下标 → HTML <sup>/<sub>，统一初中物理书写形式）
//  自动保护 $...$ 数学段；题干请用 applyPhysicsNormalization（TreeWalker）
//  以免误伤 <img> 等标签属性；选项文本可直接调用
// ===================================================================
function normalizePhysicsText(text) {
  if (!text) return text;
  const placeholders = [];
  // 先把 $...$ / $$...$$ 数学段用占位符保护，避免被转换
  const protectedText = text.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g, (m) => {
    placeholders.push(m);
    return '\u0001' + (placeholders.length - 1) + '\u0001';
  });
  let result = protectedText
    // Unicode 上标 → <sup>
    .replace(/²/g, '<sup>2</sup>').replace(/³/g, '<sup>3</sup>')
    .replace(/¹/g, '<sup>1</sup>').replace(/⁰/g, '<sup>0</sup>')
    .replace(/⁴/g, '<sup>4</sup>').replace(/⁵/g, '<sup>5</sup>')
    .replace(/⁶/g, '<sup>6</sup>').replace(/⁷/g, '<sup>7</sup>')
    .replace(/⁸/g, '<sup>8</sup>').replace(/⁹/g, '<sup>9</sup>')
    // Unicode 下标 → <sub>
    .replace(/₁/g, '<sub>1</sub>').replace(/₂/g, '<sub>2</sub>')
    .replace(/₃/g, '<sub>3</sub>').replace(/₄/g, '<sub>4</sub>')
    .replace(/₅/g, '<sub>5</sub>').replace(/₆/g, '<sub>6</sub>')
    .replace(/₇/g, '<sub>7</sub>').replace(/₈/g, '<sub>8</sub>')
    .replace(/₉/g, '<sub>9</sub>').replace(/₀/g, '<sub>0</sub>')
    // 下划线下标：t_AB → t<sub>AB</sub>
    .replace(/([A-Za-z])_([A-Za-z0-9]+)/g, '$1<sub>$2</sub>')
    // 大写物理量字母 + 数字下标：F1 → F<sub>1</sub>、R2 → R<sub>2</sub>
    .replace(/([A-Z])(\d+)(?![\d.])/g, '$1<sub>$2</sub>');
  // 恢复数学段
  return result.replace(/\u0001(\d+)\u0001/g, (m, idx) => placeholders[+idx] || m);
}

// 遍历容器内所有文本节点并规范化（不触碰 HTML 标签属性，安全处理题干 HTML）
function applyPhysicsNormalization(container) {
  if (!container) return;
  // 1) 规范化文本节点（Unicode 上下标、下划线、数字下标）
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const normalized = normalizePhysicsText(node.nodeValue);
    if (normalized === node.nodeValue) return;  // 无变化，保持原文本节点
    // 有变化：解析 <sub>/<sup> 并用 span 包裹整组节点
    // （不能直接赋给 nodeValue——HTML 只显示字面；也不能裸插入多节点——
    //  在 flex 容器中每个节点会被拆成独立行项导致上下标换行）
    const template = document.createElement('template');
    template.innerHTML = normalized;
    const wrapper = document.createElement('span');
    while (template.content.firstChild) wrapper.appendChild(template.content.firstChild);
    node.parentNode.replaceChild(wrapper, node);
  });

  // 2) 把 <sub>/<sup> 与其前面紧邻的单位/数字字符包进 nowrap span，
  //    确保 cm³、g/cm³、kg/m³、10³、F₁ 等作为整体不换行
  container.querySelectorAll('sub, sup').forEach(el => {
    if (el.closest('span.qnowrap')) return;
    let prev = el.previousSibling;
    if (!prev || prev.nodeType !== 3) return;
    const m = prev.nodeValue.match(/([A-Za-z0-9/·°'’x×%]+)$/);
    if (!m) return;
    const tail = m[1];
    prev.nodeValue = prev.nodeValue.slice(0, -tail.length);
    const span = document.createElement('span');
    span.className = 'qnowrap';
    span.style.whiteSpace = 'nowrap';
    span.textContent = tail;
    prev.parentNode.insertBefore(span, el);
    span.appendChild(el);
  });
}


// 公共：渲染题干（物理规范化 + 图片懒加载 + 动态字号），返回用于 MathJax 检测的文本
function renderQuestionBody(textEl, q) {
  textEl.innerHTML = q.text;

  // 物理符号规范化（上标/下标统一，不触碰 <img> 等标签属性）
  applyPhysicsNormalization(textEl);

  // 图片懒加载 + 异步解码（不阻塞主线程）
  textEl.querySelectorAll('img').forEach(img => {
    img.loading = 'lazy';
    img.decoding = 'async';
    img.draggable = false;   // 禁止原生拖拽，避免中断左滑手势
  });

  const plainText = textEl.textContent || '';
  const len = plainText.length;
  // 字号随视口宽度与题目长度动态调整（适配 seewo 白板大屏）
  const fontSizeVw = (len > 200 ? 1.5 : len > 150 ? 1.7 : len > 110 ? 1.9 : len > 70 ? 2.1 : 2.5);
  textEl.dataset.baseVw = fontSizeVw;   // 记录基准字号，供“＋”按钮换算
  applyQuestionZoom(textEl);            // 保留用户手动放大的倍率（见 ui-zoom.js）
  return q.text + Object.values(q.options).join(' ');
}
