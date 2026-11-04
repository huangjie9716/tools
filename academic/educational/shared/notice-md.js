/* =========================================================
   系统通知的 Markdown 渲染（首页与后台预览共用）
   ---------------------------------------------------------
   只支持后台说明里列出的子集：
     标题、- 列表、1. 编号、**加粗**、`代码`、[文字](链接)、> 引用、--- 分隔线
   对外暴露：window.JZNoticeMarkdown(source)
   ========================================================= */
(function () {
  "use strict";

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderNoticeMarkdown(source) {
    var md = String(source || "").replace(/<!--[\s\S]*?-->/g, "");
    /* 卡片标题已经是「系统通知与提醒」，正文里重复的通知类标题自动去掉 */
    md = md.replace(/^\s*#{1,6}\s*(?:系统通知与提醒|系统通知|通知与提醒)\s*(\n|$)/, "");
    var lines = md.replace(/\r\n?/g, "\n").split("\n");
    var html = [];
    var list = null;

    function closeList() {
      if (list) { html.push("</" + list + ">"); list = null; }
    }
    function inline(text) {
      return String(text).split(/(`[^`]*`)/g).map(function (part) {
        if (/^`[^`]*`$/.test(part)) return "<code>" + esc(part.slice(1, -1)) + "</code>";
        var s = esc(part);
        s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        return s;
      }).join("");
    }

    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, "");
      if (!line.trim()) { closeList(); return; }
      var m;
      if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
        closeList();
        var level = Math.min(6, m[1].length + 1);
        html.push("<h" + level + ">" + inline(m[2]) + "</h" + level + ">");
        return;
      }
      if (/^\s*([-*_]\s*){3,}$/.test(line)) { closeList(); html.push("<hr>"); return; }
      if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
        if (list !== "ul") { closeList(); html.push("<ul>"); list = "ul"; }
        html.push("<li>" + inline(m[1]) + "</li>");
        return;
      }
      if ((m = line.match(/^\s*\d+[.)、]\s+(.*)$/))) {
        if (list !== "ol") { closeList(); html.push("<ol>"); list = "ol"; }
        html.push("<li>" + inline(m[1]) + "</li>");
        return;
      }
      if ((m = line.match(/^>\s?(.*)$/))) {
        closeList();
        html.push("<blockquote>" + inline(m[1]) + "</blockquote>");
        return;
      }
      /* 列表项的续行：接到上一条里，不打断列表 */
      if (list && html.length) {
        html[html.length - 1] = html[html.length - 1].replace(/<\/li>$/, " " + inline(line.trim()) + "</li>");
        return;
      }
      closeList();
      html.push("<p>" + inline(line) + "</p>");
    });
    closeList();
    return html.join("");
  }

  window.JZNoticeMarkdown = renderNoticeMarkdown;
})();
