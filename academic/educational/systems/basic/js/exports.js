"use strict";

/* =========================================================
   导出
   ========================================================= */
function csvEscape(v){
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function downloadCsv(filename, matrix){
  const csv = matrix.map(row => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast("已导出 " + filename, "success");
}
function dateStamp(){
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
}

/* 文件名安全化：去掉 Windows 非法字符，空白与间隔点统一成下划线 */
function fileSafe(s){
  return String(s === null || s === undefined ? "" : s)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/[\s·]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}
/* 当前考试的标识（届别 · 考试名），用于让导出文件名自带信息 */
function examTag(){
  return fileSafe(typeof state !== "undefined" && state && state.fileName) || "本次考试";
}
/* 导出表格首行说明：学校 + 内容口径 + 导出时间，避免文件被改名后看不出内容 */
function exportInfoLine(parts){
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  const t = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  const body = parts.filter(Boolean).join(" · ") || "成绩分析";
  return "珠海市九洲中学 · " + body + " · 导出时间：" + t;
}

/* ---------- 原生 XLSX 导出（无外部依赖） ---------- */
const XLSX_STYLE = {
  header:1, header2:2, body:3, text:4, total:5, mean:6,
  excellent:7, pass:8, low:9, green:10, orange:11, red:12,
  gray:13, top3:14, headerLeft:15, textWrap:16, totalLeft:17
};

function xcell(v, s){ return { v, s: s || 0 }; }
function xmlEscapeX(s){
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function colLetterX(n){
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(bytes){
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(files){
  const enc = new TextEncoder();
  const chunks = [];
  const cents = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0x21, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, name.length, true);
    dv.setUint16(28, 0, true);
    local.set(name, 30);
    chunks.push(local, data);

    const cen = new Uint8Array(46 + name.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cen.set(name, 46);
    cents.push(cen);
    offset += local.length + data.length;
  }
  const centralSize = cents.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  return new Blob([...chunks, ...cents, end], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
function xlsxCellXml(value, style, ref){
  const s = style || 0;
  if (value === null || value === undefined || value === "") {
    return '<c r="' + ref + '" s="' + s + '"/>';
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return '<c r="' + ref + '" s="' + s + '"><v>' + value + '</v></c>';
  }
  return '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' +
    xmlEscapeX(value) + '</t></is></c>';
}
function xlsxSheetXml(rows, widths, freezeRows){
  const maxCols = Math.max(1, ...rows.map(r => r.length));
  const lastRef = colLetterX(maxCols) + rows.length;
  const freeze = Math.max(0, Number(freezeRows) || 0);
  let cols = "";
  if (widths && widths.length) {
    cols = "<cols>" + widths.map((w, i) =>
      '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'
    ).join("") + "</cols>";
  }
  let data = "";
  rows.forEach((row, r) => {
    const ht = r < freeze ? 28 : 20;
    data += '<row r="' + (r + 1) + '" ht="' + ht + '" customHeight="1">';
    row.forEach((cell, c) => {
      const isObj = cell && typeof cell === "object" && !Array.isArray(cell);
      const val = isObj ? cell.v : cell;
      const style = isObj ? (cell.s || 0) : 0;
      data += xlsxCellXml(val, style, colLetterX(c + 1) + (r + 1));
    });
    data += "</row>";
  });
  const pane = freeze
    ? '<pane ySplit="' + freeze + '" topLeftCell="A' + (freeze + 1) + '" activePane="bottomLeft" state="frozen"/>'
    : "";
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<dimension ref="A1:' + lastRef + '"/>' +
    '<sheetViews><sheetView workbookViewId="0">' + pane + '</sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="20"/>' + cols +
    '<sheetData>' + data + '</sheetData>' +
    '<autoFilter ref="A1:' + lastRef + '"/>' +
    '<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>' +
    '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    '</worksheet>';
}
function xlsxStylesXml(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="12">' +
      '<font><sz val="11"/><name val="Microsoft YaHei"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF1E3A8A"/><name val="Microsoft YaHei"/></font>' +
      '<font><b/><sz val="12"/><color rgb="FF1D4ED8"/><name val="Microsoft YaHei"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFB45309"/><name val="Microsoft YaHei"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF1D4ED8"/><name val="Microsoft YaHei"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Microsoft YaHei"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF047857"/><name val="Microsoft YaHei"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFC2410C"/><name val="Microsoft YaHei"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Microsoft YaHei"/></font>' +
      '<font><sz val="10"/><color rgb="FF64748B"/><name val="Microsoft YaHei"/></font>' +
      '<font><b/><sz val="12"/><color rgb="FFEA580C"/><name val="Microsoft YaHei"/></font>' +
    '</fonts>' +
    '<fills count="12">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFEDD5"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFD1FAE5"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFEDD5"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right>' +
      '<top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="18">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="5" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="6" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="7" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="8" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="9" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="10" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="11" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';
}
function buildXlsxBlob(rows, widths, sheetName, freezeRows){
  const enc = new TextEncoder();
  const safeName = String(sheetName || "数据").replace(/[\\\/\?\*\[\]:]/g, "").slice(0, 31) || "数据";
  const files = [
    { name:"[Content_Types].xml", data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>') },
    { name:"_rels/.rels", data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>') },
    { name:"xl/workbook.xml", data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="' + xmlEscapeX(safeName) + '" sheetId="1" r:id="rId1"/></sheets>' +
      '</workbook>') },
    { name:"xl/_rels/workbook.xml.rels", data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>') },
    { name:"xl/styles.xml", data:enc.encode(xlsxStylesXml()) },
    { name:"xl/worksheets/sheet1.xml", data:enc.encode(xlsxSheetXml(rows, widths, freezeRows)) }
  ];
  return zipStore(files);
}
function downloadBlob(filename, blob){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function downloadXlsx(filename, rows, widths, sheetName, freezeRows){
  downloadBlob(filename, buildXlsxBlob(rows, widths, sheetName, freezeRows));
  toast("已导出 " + filename, "success");
}

/* ---------- 按当前页面表格导出，保留筛选与排序结果 ---------- */
function tableCellText(cell){
  let text = String(cell && (cell.innerText || cell.textContent) || "").replace(/\s+/g, " ").trim();
  const small = cell && cell.querySelector ? cell.querySelector("small") : null;
  if (small) {
    const suffix = String(small.textContent || "").replace(/\s+/g, " ").trim();
    if (suffix && text.endsWith(suffix)) {
      text = text.slice(0, -suffix.length).trim() + " " + suffix;
    }
  }
  return text;
}

function tableToMatrix(table){
  const rows = Array.from(table.rows || []);
  const matrix = [];
  for (let r = 0; r < rows.length; r++) {
    matrix[r] = matrix[r] || [];
    let c = 0;
    for (const cell of Array.from(rows[r].cells || [])) {
      while (matrix[r][c] !== undefined) c++;
      const text = tableCellText(cell);
      const rowSpan = Math.max(1, Number(cell.rowSpan) || 1);
      const colSpan = Math.max(1, Number(cell.colSpan) || 1);
      for (let rr = 0; rr < rowSpan; rr++) {
        matrix[r + rr] = matrix[r + rr] || [];
        for (let cc = 0; cc < colSpan; cc++) {
          matrix[r + rr][c + cc] = rr === 0 && cc === 0 ? text : "";
        }
      }
      c += colSpan;
    }
  }
  const width = Math.max(0, ...matrix.map(row => row.length));
  return matrix.map(row => {
    const out = [];
    for (let i = 0; i < width; i++) out.push(row[i] === undefined ? "" : row[i]);
    return out;
  });
}

function exportTableXlsx(selector, filename, sheetName, options){
  const opts = options || {};
  const table = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (!table || !table.rows || !table.rows.length) {
    toast("当前没有可导出的表格数据", "error");
    return;
  }
  const matrix = tableToMatrix(table);
  if (!matrix.length) {
    toast("当前没有可导出的表格数据", "error");
    return;
  }
  const headerRows = table.tHead ? table.tHead.rows.length : 1;
  const rows = [];
  if (opts.info) rows.push([xcell(opts.info, XLSX_STYLE.headerLeft)]);
  matrix.forEach((row, r) => rows.push(row.map((value, c) => {
    const style = r < headerRows
      ? (c === 0 && !opts.centerFirst ? XLSX_STYLE.headerLeft : XLSX_STYLE.header)
      : XLSX_STYLE.body;
    return xcell(value, style);
  })));
  const widths = matrix[0].map((_, c) => {
    const maxLen = Math.max(...matrix.map(row => String(row[c] || "").length));
    return Math.min(32, Math.max(9, maxLen + 2));
  });
  downloadXlsx(filename, rows, widths, sheetName || "分析数据", headerRows + (opts.info ? 1 : 0));
}

function exportBasicCurrentXlsx(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  if (state.basicMode === "subject") {
    const cards = Array.from(document.querySelectorAll("#basicSubjectGrid .subject-class-card"));
    if (!cards.length) return toast("当前没有可导出的班级数据", "error");
    const metric = selectedMetric();
    const diffMode = state.subjectViewSort === "diff";
    const rankProgressMode = diffMode && !!state.reference;
    const rows = [diffMode
      ? ["班级", "任课教师", rankProgressMode ? "排名进步名次" : "与年级" + metric.label + "差值", "本班" + metric.label, "班级名次", "参考人数", "变化"]
      : ["班级", "任课教师", metric.label, "班级名次", "参考人数", "变化"]];
    for (const card of cards) {
      const base = [
        tableCellText(card.querySelector(".scc-head b")),
        tableCellText(card.querySelector(".scc-head span")),
        tableCellText(card.querySelector(".scc-value"))
      ];
      if (diffMode) {
        base.push(tableCellText(card.querySelector(".scc-own")).replace(/^本班\s*/, ""));
        base.push(tableCellText(card.querySelector(".scc-rank .rank-badge")));
        base.push(tableCellText(card.querySelector(".scc-meta")).replace(/^参考\s*/, "").replace(/\s*人$/, ""));
        base.push(tableCellText(card.querySelector(".scc-change")));
      } else {
        base.push(tableCellText(card.querySelector(".scc-rank .rank-badge")));
        base.push(tableCellText(card.querySelector(".scc-meta")));
        base.push(tableCellText(card.querySelector(".scc-change")));
      }
      rows.push(base);
    }
    const activeSubject = document.querySelector("#subjectViewChips .chip.active");
    const subjectName = activeSubject ? activeSubject.textContent.trim() : "学科";
    downloadXlsx("考试基础分析_" + examTag() + "_学科视角_" + subjectName + "_" + metric.label +
      (rankProgressMode ? "_排名进步名次" : diffMode ? "_与年级差值" : "") + "_" + dateStamp() + ".xlsx",
      [[xcell(exportInfoLine([state.fileName || "本次考试", "学科视角", subjectName, "指标：" + metric.label]), XLSX_STYLE.headerLeft)]]
        .concat(rows.map((row, r) => row.map((value, c) => xcell(value, r === 0
          ? (c === 0 ? XLSX_STYLE.headerLeft : XLSX_STYLE.header)
          : XLSX_STYLE.body)))),
      [12, 12, 16, 14, 12, 14, 12], "考试基础分析", 2);
    return;
  }
  exportTableXlsx("#basicTable", "考试基础分析_" + examTag() + "_班级视角_" + dateStamp() + ".xlsx", "考试基础分析", {
    info: exportInfoLine([state.fileName || "本次考试", "班级视角", "各学科指标总览"])
  });
}

/* 把页面上的表格转成「行内样式」的 HTML，供导出图片（foreignObject）使用 */
function tableInlineHtml(table, options){
  const opts = options || {};
  const headerStyle = "background:#1b2454;color:#fff;font-weight:700;padding:8px 10px;border:1px solid #cbd5e1;text-align:center;font-size:12px;white-space:nowrap";
  const cellStyle = "padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;white-space:nowrap;color:#1f2937";
  const firstStyle = "padding:7px 10px;border:1px solid #e2e8f0;text-align:" + (opts.centerFirst ? "center" : "left") +
    ";font-size:12px;white-space:nowrap;font-weight:700;background:#f8fafc;color:#1b2454";
  const clone = table.cloneNode(true);
  clone.querySelectorAll("thead th").forEach(th => th.setAttribute("style", headerStyle));
  clone.querySelectorAll("tbody tr").forEach(tr => {
    const isAll = tr.classList.contains("all-row");
    Array.from(tr.children).forEach((td, idx) => {
      let style = idx === 0 ? firstStyle : cellStyle;
      if (isAll) style += ";background:#eef1f8";
      td.setAttribute("style", style);
    });
  });
  clone.querySelectorAll("small").forEach(el => el.setAttribute("style", "display:block;font-size:9.5px;font-weight:400;opacity:.85;margin-top:1px"));
  clone.querySelectorAll(".num-strong").forEach(el => el.setAttribute("style", "font-weight:700;color:#1b2454"));
  clone.querySelectorAll(".muted").forEach(el => el.setAttribute("style", "color:#94a3b8"));
  clone.querySelectorAll(".rate,.rate-pass,.rate-low,.rate-excellent,.rate-warn").forEach(el => el.setAttribute("style", "font-weight:700;color:#1f2937"));
  clone.querySelectorAll(".rank-badge,.tag,.change,.chip").forEach(el => el.setAttribute("style", "display:inline-block;padding:0 6px;border-radius:6px;background:#eef1f8;color:#334155;font-size:11px"));
  const segColors = {
    "seg-full": "background:#ecfdf5;color:#047857",
    "seg-excellent": "background:#fffbeb;color:#b45309",
    "seg-pass": "background:#eff6ff;color:#1d4ed8",
    "seg-high": "color:#475569"
  };
  clone.querySelectorAll("td").forEach(td => {
    Object.keys(segColors).forEach(key => {
      if (td.classList.contains(key)) {
        td.setAttribute("style", (td.getAttribute("style") || "") + ";" + segColors[key] + ";font-weight:700");
      }
    });
  });
  clone.setAttribute("style", "width:100%;border-collapse:collapse;font-family:'Microsoft YaHei','PingFang SC',Arial,sans-serif;background:#fff");
  return clone.outerHTML;
}

/* 学科视角：卡片 → 行内样式表格 */
function subjectCardsExportHtml(){
  const metric = selectedMetric();
  const diffMode = state.subjectViewSort === "diff";
  const rankProgressMode = diffMode && !!state.reference;
  const cards = Array.from(document.querySelectorAll("#basicSubjectGrid .subject-class-card"));
  const headerStyle = "background:#1b2454;color:#fff;font-weight:700;padding:8px 10px;border:1px solid #cbd5e1;text-align:center;font-size:12px;white-space:nowrap";
  const cellStyle = "padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;white-space:nowrap;color:#1f2937";
  const firstStyle = cellStyle + ";text-align:left;font-weight:700;background:#f8fafc;color:#1b2454";
  const heads = diffMode
    ? ["班级", "任课教师", rankProgressMode ? "排名进步名次" : "与年级" + metric.label + "差值", "本班" + metric.label, "班级名次", "参考人数"]
    : ["班级", "任课教师", metric.label, "班级名次", "参考人数"];
  let html = '<table style="width:100%;border-collapse:collapse;font-family:Microsoft YaHei,PingFang SC,Arial,sans-serif;background:#fff"><thead><tr>' +
    heads.map(h => '<th style="' + headerStyle + '">' + escapeHtml(h) + '</th>').join("") + "</tr></thead><tbody>";
  for (const card of cards) {
    const cls = tableCellText(card.querySelector(".scc-head b"));
    const teacher = tableCellText(card.querySelector(".scc-head span"));
    const main = tableCellText(card.querySelector(".scc-value"));
    const rank = tableCellText(card.querySelector(".scc-rank .rank-badge")) || "—";
    const meta = tableCellText(card.querySelector(".scc-meta")).replace(/^参考\s*/, "").replace(/\s*人$/, "");
    const own = tableCellText(card.querySelector(".scc-own")).replace(/^本班\s*/, "");
    const cells = diffMode ? [cls, teacher, main, own, rank, meta] : [cls, teacher, main, rank, meta];
    const diffCls = card.querySelector(".scc-value .is-good") ? "#0f7b5f" :
      card.querySelector(".scc-value .is-bad") ? "#c2410c" : "#1b2454";
    html += "<tr>" + cells.map((v, i) => {
      if (i === 0) return '<td style="' + firstStyle + '">' + escapeHtml(v) + "</td>";
      if (diffMode && i === 2) return '<td style="' + cellStyle + ';font-weight:800;color:' + diffCls + '">' + escapeHtml(v) + "</td>";
      return '<td style="' + cellStyle + '">' + escapeHtml(v) + "</td>";
    }).join("") + "</tr>";
  }
  return html + "</tbody></table>";
}

/* 考试基础分析：导出图片（跟随视角与指标） */
function exportBasicImage(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const metric = selectedMetric();
  const subjectMode = state.basicMode === "subject";
  const diffMode = subjectMode && state.subjectViewSort === "diff";
  const activeSubject = document.querySelector("#subjectViewChips .chip.active");
  const subjectName = subjectMode && activeSubject ? activeSubject.textContent.trim() : "";
  const viewLabel = subjectMode ? "学科视角" : "班级视角";
  let innerHtml = "";
  if (subjectMode) {
    if (!document.querySelector("#basicSubjectGrid .subject-class-card")) return toast("当前没有可导出的班级数据", "error");
    innerHtml = subjectCardsExportHtml();
  } else {
    const table = $("#basicTable");
    if (!table || !table.rows.length) return toast("当前没有可导出的表格数据", "error");
    innerHtml = tableInlineHtml(table);
  }
  const parts = [state.fileName || "本次考试", viewLabel];
  if (subjectName) parts.push(subjectName);
  parts.push("指标：" + metric.label);
  if (diffMode && state.reference) {
    parts.push("按排名进步名次排序（进步名次＝比对考试班级名次 − 本次班级名次）");
  } else if (diffMode) {
    parts.push("按与年级差值排序（差值＝本班指标 − 年级指标）");
  }
  if (state.reference) parts.push("对比：" + (state.reference.fileName || "参考成绩"));
  const filename = "考试基础分析_" + examTag() + "_" + viewLabel + (subjectName ? "_" + subjectName : "") +
    "_" + metric.label + (diffMode && state.reference ? "_排名进步名次" : "") + "_" + dateStamp() + ".png";
  const imgWidth = subjectMode ? 1080 : 1520;
  downloadHtmlAsPng(filename, "考试基础分析 · " + viewLabel + (subjectName ? " · " + subjectName : "") + " · " + metric.label,
    parts.join(" · "), innerHtml, imgWidth).catch(err => {
      console.error(err);
      toast("图片导出失败，请重试", "error");
    });
}

function exportRankingCurrentXlsx(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  exportTableXlsx("#rankingTable", "考试排名与等级_" + examTag() + "_" + dateStamp() + ".xlsx", "排名与等级", {
    info: exportInfoLine([state.fileName || "本次考试", "学生排名与等级", "校排名取所选学科平均名次"])
  });
}

function exportWeaknessXlsx(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const scope = state.weakScope === "all" ? "全级" : state.weakScope;
  exportTableXlsx("#weakTable", "学生优弱势科目分析_" + examTag() + "_" + scope + "_" + dateStamp() + ".xlsx", "优弱势分析", {
    info: exportInfoLine([state.fileName || "本次考试", "学生优弱势科目分析", "范围：" + scope, "差值＝总分排名 − 学科排名"])
  });
}

function exportWeaknessImage(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  if (!state.weakScope || state.weakScope === "all") return toast("请先在「查看范围」选择具体班级", "error");
  const prevSize = state.weakPageSize;
  const prevPage = state.weakPage;
  state.weakPageSize = 0;   // 导出整班，不分页
  state.weakPage = 1;
  renderWeakness();
  const table = $("#weakTable");
  const html = (table && !table.querySelector(".empty-row")) ? tableInlineHtml(table, { centerFirst: true }) : "";
  const count = table ? table.querySelectorAll("tbody tr").length : 0;
  state.weakPageSize = prevSize;
  state.weakPage = prevPage;
  renderWeakness();
  if (!html) return toast("该班级暂无可导出的学生数据", "error");
  downloadHtmlAsPng("学生优弱势分析_" + examTag() + "_" + state.weakScope + "_" + dateStamp() + ".png",
    "学生优弱势分析 · " + state.weakScope,
    (state.fileName || "本次考试") + " · 共 " + count + " 名学生 · 差值＝总分排名 − 学科排名",
    html, 1600).catch(err => {
      console.error(err);
      toast("图片导出失败，请重试", "error");
    });
}

function exportSegmentXlsx(){
  const wrap = $("#segmentTableWrap");
  if (!wrap || wrap.hidden) return toast("请先选择分析科目", "error");
  exportTableXlsx("#segmentTable", "各班级各学科分数段人数_" + examTag() + "_" + segmentSubjectLabel() + "_" + dateStamp() + ".xlsx", segmentSubjectLabel() + "分数段人数", {
    centerFirst: true,
    info: exportInfoLine([state.fileName || "本次考试", "各班级分数段人数", "科目：" + segmentSubjectLabel(), "各列可重叠计数"])
  });
}

function segmentSubjectLabel(){
  const sel = $("#segmentSubject");
  if (!sel || sel.selectedIndex < 0) return "科目";
  return String(sel.options[sel.selectedIndex].textContent || "").trim() || "科目";
}

function exportSegmentImage(){
  const wrap = $("#segmentTableWrap");
  if (!wrap || wrap.hidden) return toast("请先选择分析科目", "error");
  const table = $("#segmentTable");
  if (!table || !table.rows.length) return toast("当前没有可导出的分数段数据", "error");
  const subject = segmentSubjectLabel();
  downloadHtmlAsPng("各班级各学科分数段人数_" + examTag() + "_" + subject + "_" + dateStamp() + ".png",
    "各班级各学科分数段人数 · " + subject,
    (state.fileName || "本次考试") + " · 每列为该科有效成绩 ≥ 对应分数线的人数，各列可重叠计数",
    tableInlineHtml(table, { centerFirst: true }), 1180).catch(err => {
      console.error(err);
      toast("图片导出失败，请重试", "error");
    });
}

/* 人数名单命名信息：指标 + 名单学科（都来自当前筛选） */
function rosterExportInfo(){
  const metric = selectedMetric();
  const sel = $("#basicRosterSubject");
  let subject = "";
  if (sel && sel.selectedIndex >= 0) {
    subject = String(sel.options[sel.selectedIndex].textContent || "").trim();
    subject = subject.replace(/（.*?）\s*$/, "").trim();
  }
  return { metric: metric.label, subject: subject || "总分" };
}

function rosterCardRows(card){
  const rows = [];
  for (const tr of Array.from(card.querySelectorAll("tbody tr"))) {
    const cells = Array.from(tr.cells).map(cell => tableCellText(cell));
    if (cells.length < 4 || cells.join("").indexOf("本班无符合条件学生") >= 0) continue;
    rows.push(cells.slice(0, 4));
  }
  return rows;
}

function findRosterCard(className){
  const cards = Array.from(document.querySelectorAll("#basicRosterContent .roster-card"));
  return cards.find(card => tableCellText(card.querySelector(".roster-card-head b")) === className) || null;
}

function exportRosterXlsx(){
  const cards = Array.from(document.querySelectorAll("#basicRosterContent .roster-card"));
  if (!cards.length) return toast("当前没有可导出的人数名单", "error");
  const rows = [["班级", "学号", "姓名", "分数", "校排名"]];
  for (const card of cards) {
    const className = tableCellText(card.querySelector(".roster-card-head b"));
    for (const cells of rosterCardRows(card)) rows.push([className].concat(cells));
  }
  if (rows.length < 2) return toast("当前没有可导出的人数名单", "error");
  const info = rosterExportInfo();
  downloadXlsx("人数名单_" + examTag() + "_" + info.metric + "_" + info.subject + "_" + dateStamp() + ".xlsx",
    [[xcell(exportInfoLine([state.fileName || "本次考试", info.metric + "人数名单", "名单学科：" + info.subject, "全部班级"]), XLSX_STYLE.headerLeft)]]
      .concat(rows.map((row, r) => row.map((value, c) => xcell(value, r === 0
        ? (c === 0 ? XLSX_STYLE.headerLeft : XLSX_STYLE.header)
        : XLSX_STYLE.body)))),
    [12, 16, 10, 10, 10], "人数名单", 2);
}

/* 单个班级名单：导出表格 */
function exportRosterClassXlsx(className){
  const card = findRosterCard(className);
  if (!card) return toast("没有找到该班级名单", "error");
  const rows = [["班级", "学号", "姓名", "分数", "校排名"]];
  for (const cells of rosterCardRows(card)) rows.push([className].concat(cells));
  if (rows.length < 2) return toast(className + " 暂无符合条件的学生", "error");
  const info = rosterExportInfo();
  downloadXlsx("人数名单_" + examTag() + "_" + info.metric + "_" + info.subject + "_" + className + "_" + dateStamp() + ".xlsx",
    [[xcell(exportInfoLine([state.fileName || "本次考试", info.metric + "人数名单", "名单学科：" + info.subject, className]), XLSX_STYLE.headerLeft)]]
      .concat(rows.map((row, r) => row.map((value, c) => xcell(value, r === 0
        ? (c === 0 ? XLSX_STYLE.headerLeft : XLSX_STYLE.header)
        : XLSX_STYLE.body)))),
    [12, 16, 10, 10, 10], className + "名单", 2);
}

/* 单个班级名单：导出图片 */
function exportRosterClassPng(className){
  const card = findRosterCard(className);
  if (!card) return toast("没有找到该班级名单", "error");
  const table = card.querySelector("table");
  if (!table) return toast(className + " 暂无名单表格", "error");
  const info = rosterExportInfo();
  const desc = ($("#basicRosterDesc") && $("#basicRosterDesc").textContent) || "";
  downloadHtmlAsPng("人数名单_" + examTag() + "_" + info.metric + "_" + info.subject + "_" + className + "_" + dateStamp() + ".png",
    "人数名单 · " + info.metric + " · " + info.subject + " · " + className,
    (state.fileName || "本次考试") + (desc ? " · " + desc : ""),
    tableInlineHtml(table, { centerFirst: true }), 900).catch(err => {
      console.error(err);
      toast("图片导出失败，请重试", "error");
    });
}
function exportOverview(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const rows = [["学科名称","满分","参考人数","平均分","优秀率","合格率","低分率","标准差","差异系数"]];
  for (const row of overviewAllRows()) {
    const st = computeStat(row.values, row.full);
    rows.push([
      row.name, fmtScore(row.full), st.n,
      st.mean === null ? "" : st.mean.toFixed(2),
      pctText(st.excellentRate), pctText(st.passRate), pctText(st.lowRate),
      st.stdDev === null ? "" : st.stdDev.toFixed(2),
      st.cv === null ? "" : st.cv.toFixed(4)
    ]);
  }
  downloadCsv("考试概况_" + examTag() + "_" + dateStamp() + ".csv",
    [[exportInfoLine([state.fileName || "本次考试", "考试概况", "各学科满分/平均分/三率/差异系数"])], []].concat(rows));
}

function overviewAllRows(){
  return [
    { name:"总分", full:state.totalFull, values:state.students.map(s => s.total), isTotal:true },
    ...state.subjects.map(sub => ({ name:sub.name, full:getFull(sub.name), values:state.students.map(s => s.scores[sub.name]), isTotal:false }))
  ];
}

function exportOverviewXlsx(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const H = XLSX_STYLE.header;
  const rows = [[xcell(exportInfoLine([state.fileName || "本次考试", "考试概况", "各学科满分/平均分/三率/差异系数"]), XLSX_STYLE.headerLeft)], [
    xcell("学科名称", XLSX_STYLE.headerLeft), xcell("满分", H), xcell("参考人数", H), xcell("平均分", H),
    xcell("优秀率", H), xcell("合格率", H), xcell("低分率", H), xcell("标准差", H), xcell("差异系数", H)
  ]];
  for (const row of overviewAllRows()) {
    const st = computeStat(row.values, row.full);
    const base = row.isTotal ? XLSX_STYLE.total : XLSX_STYLE.body;
    rows.push([
      xcell(row.name, row.isTotal ? XLSX_STYLE.totalLeft : XLSX_STYLE.text),
      xcell(Number(row.full), base),
      xcell(st.n, base),
      xcell(st.mean === null ? "—" : Number(st.mean.toFixed(2)), XLSX_STYLE.mean),
      xcell(pctText(st.excellentRate), XLSX_STYLE.excellent),
      xcell(pctText(st.passRate), XLSX_STYLE.pass),
      xcell(pctText(st.lowRate), XLSX_STYLE.low),
      xcell(st.stdDev === null ? "—" : Number(st.stdDev.toFixed(2)), base),
      xcell(st.cv === null ? "—" : Number(st.cv.toFixed(4)), base)
    ]);
  }
  downloadXlsx("考试概况_" + examTag() + "_" + dateStamp() + ".xlsx", rows, [16, 9, 11, 11, 11, 11, 11, 11, 11], "考试概况", 2);
}

function overviewExportTableHtml(){
  const headerStyle = "background:#1b2454;color:#ffffff;font-weight:700;padding:10px 8px;border:1px solid #cbd5e1;text-align:center;font-size:13px;white-space:nowrap";
  const bodyStyle = "padding:9px 8px;border:1px solid #e2e8f0;text-align:center;font-size:13px;white-space:nowrap";
  const rateHtml = (rate, kind) => {
    if (!Number.isFinite(rate)) return '<span style="color:#94a3b8">—</span>';
    const v = Math.max(0, Math.min(100, rate * 100));
    const color = kind === "excellent" ? "#b45309" : kind === "low" ? "#b91c1c" : "#1d4ed8";
    const fill = kind === "excellent" ? "rgba(217,119,6,.20)" : kind === "low" ? "rgba(220,38,38,.16)" : "rgba(37,99,235,.16)";
    return '<span style="display:inline-block;min-width:64px;padding:2px 6px;border-radius:5px;font-weight:700;color:' + color +
      ';background:linear-gradient(90deg,' + fill + ' ' + v.toFixed(2) + '%,transparent 0)">' + v.toFixed(2) + '%</span>';
  };
  let html = '<table style="width:100%;border-collapse:collapse;font-family:Microsoft YaHei,PingFang SC,Arial,sans-serif;background:#fff">' +
    '<thead><tr>' + ["学科名称","满分","参考人数","平均分","优秀率","合格率","低分率","标准差","差异系数"]
      .map(h => '<th style="' + headerStyle + '">' + h + '</th>').join("") + '</tr></thead><tbody>';
  for (const row of overviewAllRows()) {
    const st = computeStat(row.values, row.full);
    const totalBg = row.isTotal ? "background:#eff6ff;" : "";
    const nameCell = '<td style="' + bodyStyle + ';' + totalBg + 'font-weight:700;color:#1b2454">' + escapeHtml(row.name) +
      (row.isTotal ? '<span style="display:inline-block;margin-left:5px;padding:1px 5px;border-radius:4px;background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:600">' + state.subjects.length + ' 科</span>' : '') + '</td>';
    html += '<tr>' + nameCell +
      '<td style="' + bodyStyle + ';' + totalBg + '">' + escapeHtml(fmtScore(row.full)) + '</td>' +
      '<td style="' + bodyStyle + ';' + totalBg + '">' + st.n + '</td>' +
      '<td style="' + bodyStyle + ';' + totalBg + '"><b style="color:#1d4ed8;font-size:15px">' + escapeHtml(st.mean === null ? "—" : st.mean.toFixed(2)) + '</b></td>' +
      '<td style="' + bodyStyle + ';' + totalBg + '">' + rateHtml(st.excellentRate, "excellent") + '</td>' +
      '<td style="' + bodyStyle + ';' + totalBg + '">' + rateHtml(st.passRate, "pass") + '</td>' +
      '<td style="' + bodyStyle + ';' + totalBg + '">' + rateHtml(st.lowRate, "low") + '</td>' +
      '<td style="' + bodyStyle + ';' + totalBg + '">' + escapeHtml(st.stdDev === null ? "—" : st.stdDev.toFixed(2)) + '</td>' +
      '<td style="' + bodyStyle + ';' + totalBg + '">' + escapeHtml(st.cv === null ? "—" : st.cv.toFixed(4)) + '</td>' +
    '</tr>';
  }
  return html + '</tbody></table>';
}

function exportOverviewImage(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  downloadHtmlAsPng("考试概况_" + examTag() + "_" + dateStamp() + ".png", "考试概况 · " + (state.fileName || "本次考试"),
    "珠海市九洲中学 · " + state.fileName + " · " + state.students.length + " 名学生",
    overviewExportTableHtml(), 1280).catch(err => {
      console.error(err);
      toast("图片导出失败，请重试", "error");
    });
}

function loadImageSource(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片渲染失败"));
    img.src = src;
  });
}
function canvasToBlob(canvas){
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight){
  const chars = Array.from(String(text || ""));
  let line = "";
  let cy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}
async function downloadHtmlAsPng(filename, title, subtitle, innerHtml, width){
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.setAttribute("style", "width:" + width + "px;background:#ffffff;padding:22px 24px;font-family:'Microsoft YaHei','PingFang SC',Arial,sans-serif;color:#0f172a;box-sizing:content-box;");
  wrapper.innerHTML = '<div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.3">' + escapeHtml(title) + '</div>' +
    '<div style="margin-top:5px;font-size:12px;color:#64748b;line-height:1.5">' + escapeHtml(subtitle) + '</div>' +
    '<div style="margin-top:14px">' + innerHtml + '</div>';
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  document.body.appendChild(wrapper);
  const W = width + 48;
  const H = Math.ceil(wrapper.scrollHeight);
  wrapper.style.position = "static";
  wrapper.style.left = "0";
  wrapper.style.top = "0";
  const xhtml = new XMLSerializer().serializeToString(wrapper);
  document.body.removeChild(wrapper);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H +
    '"><foreignObject width="100%" height="100%">' + xhtml + '</foreignObject></svg>';
  const img = await loadImageSource("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  const blob = await canvasToBlob(canvas);
  if (!blob) throw new Error("图片生成失败");
  downloadBlob(filename, blob);
  toast("已导出 " + filename, "success");
}
function exportBasic(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const metric = selectedMetric();
  const data = buildBasicAnalysis(datasetForCurrent(), metric);
  const refData = state.reference ? buildBasicAnalysis(state.reference, metric) : null;
  const showRank = !metric.noRank;
  const showChange = !!refData;

  if (state.basicMode === "subject") {
    const head = ["学科", "参考人数"];
    for (const group of data.groups) {
      head.push(group.name + "-" + metric.label);
      if (showRank) head.push(group.name + "-排名");
      if (showChange) head.push(group.name + "-变化");
    }
    const rows = [head];
    for (const sub of data.allSubjects) {
      const schoolStat = data.stats.get("全级")[sub.key];
      const row = [sub.name, schoolStat.n];
      for (const group of data.groups) {
        const st = data.stats.get(group.name)[sub.key];
        const curRank = group.isAll || !showRank ? null : (data.ranks.get(sub.key) && data.ranks.get(sub.key).get(group.name)) || null;
        row.push(metricExportValue(st, metric));
        if (showRank) row.push(curRank === null ? "" : curRank);
        if (showChange) {
          if (showRank) {
            const refRank = (!group.isAll && refData.ranks.get(sub.key)) ? refData.ranks.get(sub.key).get(group.name) : null;
            if (curRank === null || refRank === null || refRank === undefined) row.push("");
            else {
              const diff = refRank - curRank;
              row.push(Math.abs(diff) < 1e-9 ? "持平" : (diff > 0 ? "↑" : "↓") + formatChangeValue(Math.abs(diff)));
            }
          } else {
            const refStat = refData.stats.get(group.name) ? refData.stats.get(group.name)[sub.key] : null;
            const refValue = refStat ? metricValue(refStat, metric) : null;
            const curValue = metricValue(st, metric);
            if (curValue === null || refValue === null) row.push("");
            else {
              const diff = curValue - refValue;
              row.push(Math.abs(diff) < 1e-9 ? "0" : (diff > 0 ? "+" : "") + diff);
            }
          }
        }
      }
      rows.push(row);
    }
    downloadCsv("考试基础分析_" + examTag() + "_学科视角_" + metric.label + "_" + dateStamp() + ".csv",
      [[exportInfoLine([state.fileName || "本次考试", "考试基础分析", "学科视角", "指标：" + metric.label])], []].concat(rows));
    return;
  }

  const head = ["班级","班主任","参考人数"];
  for (const sub of data.allSubjects) {
    head.push(sub.name + "-" + metric.label);
    if (showRank) head.push(sub.name + "-排名");
    if (showChange) head.push(sub.name + "-变化");
  }
  const rows = [head];
  for (const group of data.groups) {
    const groupStats = data.stats.get(group.name);
    const totalStat = groupStats.__total__;
    const row = [group.name, group.isAll ? "" : headTeacherFor(group.name), totalStat.n];
    for (const sub of data.allSubjects) {
      const st = groupStats[sub.key];
      row.push(metricExportValue(st, metric));
      const curRank = group.isAll || !showRank ? null : (data.ranks.get(sub.key) && data.ranks.get(sub.key).get(group.name)) || null;
      if (showRank) row.push(curRank === null ? "" : curRank);
      if (showChange) {
        if (showRank) {
          const refRank = (!group.isAll && refData.ranks.get(sub.key)) ? refData.ranks.get(sub.key).get(group.name) : null;
          if (curRank === null || refRank === null || refRank === undefined) row.push("");
          else {
            const diff = refRank - curRank;
            row.push(Math.abs(diff) < 1e-9 ? "持平" : (diff > 0 ? "↑" : "↓") + formatChangeValue(Math.abs(diff)));
          }
        } else {
          const refStat = refData.stats.get(group.name) ? refData.stats.get(group.name)[sub.key] : null;
          const refValue = refStat ? metricValue(refStat, metric) : null;
          const curValue = metricValue(st, metric);
          if (curValue === null || refValue === null) row.push("");
          else {
            const diff = curValue - refValue;
            row.push(Math.abs(diff) < 1e-9 ? "0" : (diff > 0 ? "+" : "") + diff);
          }
        }
      }
    }
    rows.push(row);
  }
  downloadCsv("考试基础分析_" + examTag() + "_班级视角_" + metric.label + "_" + dateStamp() + ".csv",
    [[exportInfoLine([state.fileName || "本次考试", "考试基础分析", "班级视角", "指标：" + metric.label])], []].concat(rows));
}

function heatExportData(){
  const metric = heatMetric();
  const data = buildBasicAnalysis(datasetForCurrent(), metric);
  return { metric, data };
}

function exportHeatXlsx(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const { metric, data } = heatExportData();
  const H = XLSX_STYLE.header;
  const header = [xcell("班级", H)];
  for (const sub of data.allSubjects) header.push(xcell(sub.name, H), xcell(sub.name + "排名", H));
  const rows = [[xcell(exportInfoLine([state.fileName || "本次考试", "班级学科质量看板", "指标：" + metric.label]), XLSX_STYLE.headerLeft)], header];
  const classCount = data.groups.length - 1;
  for (const group of data.groups) {
    const row = [xcell(group.name, group.isAll ? XLSX_STYLE.total : XLSX_STYLE.body)];
    for (const sub of data.allSubjects) {
      const st = data.stats.get(group.name)[sub.key];
      const rank = group.isAll ? null : (data.ranks.get(sub.key) && data.ranks.get(sub.key).get(group.name)) || null;
      const band = group.isAll ? XLSX_STYLE.gray : heatBand(rank, classCount) === "heat-green" ? XLSX_STYLE.green :
        heatBand(rank, classCount) === "heat-orange" ? XLSX_STYLE.orange : heatBand(rank, classCount) === "heat-red" ? XLSX_STYLE.red : XLSX_STYLE.gray;
      row.push(xcell(metricExportValue(st, metric), band));
      row.push(xcell(group.isAll ? "基准" : rank === null ? "—" : "第" + formatRank(rank), band));
    }
    rows.push(row);
  }
  const widths = [11].concat(data.allSubjects.flatMap(() => [10, 10]));
  downloadXlsx("班级学科质量看板_" + examTag() + "_" + metric.label + "_" + dateStamp() + ".xlsx", rows, widths, "班级学科看板", 2);
}

function heatExportTableHtml(){
  const { metric, data } = heatExportData();
  const headerStyle = "background:#1b2454;color:#fff;font-weight:700;padding:9px 8px;border:1px solid #cbd5e1;text-align:center;font-size:12px;white-space:nowrap";
  const baseStyle = "padding:7px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;white-space:nowrap";
  const bandStyle = (band) => band === "heat-green" ? "background:#d1fae5;color:#047857" :
    band === "heat-orange" ? "background:#ffedd5;color:#c2410c" :
    band === "heat-red" ? "background:#fee2e2;color:#b91c1c" : "background:#f8fafc;color:#64748b";
  let html = '<table style="width:100%;border-collapse:collapse;font-family:Microsoft YaHei,PingFang SC,Arial,sans-serif;background:#fff">' +
    '<thead><tr><th style="' + headerStyle + '">班级</th>' +
    data.allSubjects.map(sub => '<th style="' + headerStyle + '">' + escapeHtml(sub.name) +
      '<div style="font-size:9px;font-weight:400;opacity:.85">满分 ' + escapeHtml(fmtScore(sub.full)) + '</div></th>').join("") +
    '</tr></thead><tbody>';
  const classCount = data.groups.length - 1;
  for (const group of data.groups) {
    html += '<tr><td style="' + baseStyle + ';font-weight:700;background:#f8fafc;color:#1b2454">' + escapeHtml(group.name) + '</td>';
    for (const sub of data.allSubjects) {
      const st = data.stats.get(group.name)[sub.key];
      const rank = group.isAll ? null : (data.ranks.get(sub.key) && data.ranks.get(sub.key).get(group.name)) || null;
      const band = group.isAll ? "heat-base-cell" : heatBand(rank, classCount);
      const text = metricExportValue(st, metric) || "—";
      const rankText = group.isAll ? "基准" : rank === null ? "—" : "第" + formatRank(rank);
      html += '<td style="' + baseStyle + ';' + (group.isAll ? "background:#f8fafc;color:#64748b" : bandStyle(band)) + '">' +
        '<div style="font-weight:700">' + escapeHtml(text) + '</div>' +
        '<div style="font-size:10px;opacity:.78;margin-top:1px">' + escapeHtml(rankText) + '</div></td>';
    }
    html += '</tr>';
  }
  return html + '</tbody></table>';
}

function exportHeatImage(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const { metric, data } = heatExportData();
  downloadHtmlAsPng("班级学科质量看板_" + examTag() + "_" + metric.label + "_" + dateStamp() + ".png",
    "班级学科质量看板 · " + (state.fileName || "本次考试"),
    "指标：" + metric.label + " · " + (data.groups.length - 1) + " 个班级",
    heatExportTableHtml(), 1500).catch(err => {
      console.error(err);
      toast("图片导出失败，请重试", "error");
    });
}
function exportTopnXlsx(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const thresholds = getTopnThresholds();
  const currentInfo = topNThresholds(state.students, thresholds);
  const currentMap = topNClassCounts(state.students, currentInfo);
  const refInfo = state.reference ? topNThresholds(state.reference.students, thresholds) : null;
  const refMap = state.reference ? topNClassCounts(state.reference.students, refInfo) : null;
  const top3Sets = topnTop3Sets(currentInfo, currentMap);
  const H = XLSX_STYLE.header;
  const header = [xcell("班级", XLSX_STYLE.headerLeft)];
  currentInfo.forEach(t => header.push(xcell("前 " + t.n + " 名", H)));
  if (refInfo) currentInfo.forEach(t => header.push(xcell("前 " + t.n + " 名变化", H)));
  const rows = [[xcell(exportInfoLine([state.fileName || "本次考试", "前N名分析", "按总分降序取线，同分一并计入" + (refInfo ? "，含与参考成绩对比" : "")]), XLSX_STYLE.headerLeft)], header];
  for (const cls of state.classes) {
    const curCounts = currentMap.get(cls) || [];
    const row = [xcell(cls, XLSX_STYLE.text)];
    for (let i = 0; i < currentInfo.length; i++) {
      const cur = curCounts[i];
      row.push(xcell(cur === null || cur === undefined ? "" : cur, top3Sets[i].has(Number(cur)) ? XLSX_STYLE.top3 : XLSX_STYLE.body));
    }
    if (refInfo) {
      for (let i = 0; i < currentInfo.length; i++) {
        const cur = curCounts[i];
        const ref = refMap && refMap.get(cls) ? refMap.get(cls)[i] : null;
        const diff = (cur === null || cur === undefined || ref === null || ref === undefined) ? "" : cur - ref;
        row.push(xcell(diff === "" ? "" : (diff > 0 ? "+" : "") + diff, XLSX_STYLE.gray));
      }
    }
    rows.push(row);
  }
  const totalRow = [xcell("合计", XLSX_STYLE.totalLeft)];
  currentInfo.forEach(t => totalRow.push(xcell(t.total, XLSX_STYLE.total)));
  if (refInfo) currentInfo.forEach((t, i) => {
    const diff = t.total - refInfo[i].total;
    totalRow.push(xcell((diff > 0 ? "+" : "") + diff, XLSX_STYLE.total));
  });
  rows.push(totalRow);
  const widths = [11].concat(currentInfo.map(() => 11));
  if (refInfo) currentInfo.forEach(() => widths.push(11));
  downloadXlsx("前N名分析_" + examTag() + "_" + dateStamp() + ".xlsx", rows, widths, "前N名分析", 2);
}

function exportTopnImage(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const table = $("#topnTable");
  if (!table || !table.rows.length || table.querySelector(".empty-row")) {
    return toast("当前没有可导出的前 N 名数据", "error");
  }
  const modeLabel = ($("#topnModeLabel") && $("#topnModeLabel").textContent.trim()) || "";
  const info = topNThresholds(state.students, getTopnThresholds());
  const layers = info.map(t => "前 " + t.n + " 名").join(" / ");
  const parts = [state.fileName || "本次考试", "按总分降序取线", "同分一并计入"];
  if (state.reference) parts.push("对比：" + (state.reference.fileName || "参考成绩"));
  downloadHtmlAsPng("前N名分析_" + examTag() + "_" + (modeLabel || "模式") + "_" + dateStamp() + ".png",
    "前N名分析" + (modeLabel ? " · " + modeLabel : ""),
    parts.join(" · ") + " · 层次：" + layers,
    tableInlineHtml(table, { centerFirst: true }), 1100).catch(err => {
      console.error(err);
      toast("图片导出失败，请重试", "error");
    });
}

function exportRanking(){
  if (!state.students.length) return toast("请先导入成绩", "error");
  const subjectKey = state.rankSubject;
  const subjectLabel = subjectKey === "__total__" ? "总分" : subjectKey;
  const rows = [["学号","姓名","班级",subjectLabel,"校排名（平均）","班排名（平均）","等级"]];
  let list = state.students.filter(s => {
    if (state.classFilter !== "all" && s.className !== state.classFilter) return false;
    if (state.gradeFilter !== "all" && s.grade !== state.gradeFilter) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const hay = (String(s.name) + " " + String(s.id)).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const sortMode = state.rankSort;
  list.sort((a,b) => {
    if (sortMode === "id") return String(a.id).localeCompare(String(b.id), "zh-CN", { numeric:true });
    if (sortMode === "name") return String(a.name).localeCompare(String(b.name), "zh-CN", { numeric:true });
    const aValid = isValidScore(scoreOf(a, subjectKey)), bValid = isValidScore(scoreOf(b, subjectKey));
    if (aValid !== bValid) return aValid ? -1 : 1;
    if (sortMode === "class") {
      const cls = classCompare(a.className, b.className);
      if (cls !== 0) return cls;
      const ar = a.classRank === null ? Infinity : a.classRank;
      const br = b.classRank === null ? Infinity : b.classRank;
      if (ar !== br) return ar - br;
    } else {
      const ar = a.schoolRank === null ? Infinity : a.schoolRank;
      const br = b.schoolRank === null ? Infinity : b.schoolRank;
      if (ar !== br) return ar - br;
    }
    return String(a.id).localeCompare(String(b.id), "zh-CN", { numeric:true });
  });
  for (const s of list) {
    const score = scoreOf(s, subjectKey);
    const valid = isValidScore(score);
    rows.push([
      s.id, s.name, s.className,
      valid ? fmtScore(score) : "",
      valid ? formatRank(s.schoolRank) : "",
      valid ? formatRank(s.classRank) : "",
      valid ? s.grade : "未参考"
    ]);
  }
  downloadCsv("排名与等级_" + examTag() + "_" + subjectLabel + "_" + dateStamp() + ".csv",
    [[exportInfoLine([state.fileName || "本次考试", "学生排名与等级", "学科：" + subjectLabel])], []].concat(rows));
}

function computeAllRankTables(){
  const totalSchool = new Map();
  const totalClass = new Map();
  const subjectSchool = {};
  const subjectClass = {};
  const rankList = (list, scoreFn, map) => {
    list.sort((a, b) => Number(scoreFn(b)) - Number(scoreFn(a)) || compareStudentOrder(a, b));
    assignAverageRanksToMap(list, scoreFn, map);
  };

  const totalValid = state.students.filter(s => isValidScore(s.total));
  rankList(totalValid, s => s.total, totalSchool);
  for (const cls of state.classes) {
    rankList(totalValid.filter(s => s.className === cls), s => s.total, totalClass);
  }

  for (const sub of state.subjects) {
    const list = state.students.filter(s => isValidScore(s.scores[sub.name]));
    subjectSchool[sub.name] = new Map();
    subjectClass[sub.name] = new Map();
    rankList(list, s => s.scores[sub.name], subjectSchool[sub.name]);
    for (const cls of state.classes) {
      rankList(list.filter(s => s.className === cls), s => s.scores[sub.name], subjectClass[sub.name]);
    }
  }
  return { totalSchool, totalClass, subjectSchool, subjectClass };
}

function updateRankingDownloadButtons(){
  const all = state.classFilter === "all";
  const schoolBtn = $("#rankDownloadSchool");
  const classAllBtn = $("#rankDownloadClassAll");
  const classCurrentBtn = $("#rankDownloadClassCurrent");
  if (schoolBtn) schoolBtn.hidden = !all;
  if (classAllBtn) classAllBtn.hidden = all;
  if (classCurrentBtn) classCurrentBtn.hidden = all;
}

function exportRankingXlsx(kind){
  if (!state.students.length) return toast("请先导入成绩", "error");
  if (kind !== "school" && state.classFilter === "all") return toast("请先选择具体班级", "error");
  const tables = computeAllRankTables();
  const subjectKey = state.rankSubject;
  const subjectLabel = subjectKey === "__total__" ? "总分" : subjectKey;
  const classLabel = state.classFilter === "all" ? "全级" : state.classFilter;
  const students = state.students.filter(s => kind === "school" || s.className === state.classFilter);

  if (kind === "school") {
    students.sort((a, b) => {
      const ar = tables.totalSchool.get(a), br = tables.totalSchool.get(b);
      return (ar === undefined ? Infinity : ar) - (br === undefined ? Infinity : br) || compareStudentOrder(a, b);
    });
  } else if (kind === "classAll") {
    students.sort((a, b) => {
      const ar = tables.totalClass.get(a), br = tables.totalClass.get(b);
      return (ar === undefined ? Infinity : ar) - (br === undefined ? Infinity : br) || compareStudentOrder(a, b);
    });
  } else {
    const map = subjectKey === "__total__" ? tables.totalSchool : tables.subjectSchool[subjectKey];
    students.sort((a, b) => {
      const ar = map.get(a), br = map.get(b);
      return (ar === undefined ? Infinity : ar) - (br === undefined ? Infinity : br) || compareStudentOrder(a, b);
    });
  }

  const H = XLSX_STYLE.header;
  let header;
  let widths;
  if (kind === "school") {
    header = [xcell("学号", XLSX_STYLE.headerLeft), xcell("姓名", H), xcell("班级", H), xcell("总分", H), xcell("总分校排", H)];
    for (const sub of state.subjects) header.push(xcell(sub.name, H), xcell(sub.name + "校排", H));
    widths = [12, 11, 9, 10, 11].concat(state.subjects.flatMap(() => [9, 10]));
  } else if (kind === "classAll") {
    header = [xcell("学号", XLSX_STYLE.headerLeft), xcell("姓名", H), xcell("班级", H), xcell("总分", H), xcell("总分校排", H), xcell("总分班排", H)];
    for (const sub of state.subjects) header.push(xcell(sub.name, H), xcell(sub.name + "校排", H), xcell(sub.name + "班排", H));
    widths = [12, 11, 9, 10, 11, 11].concat(state.subjects.flatMap(() => [9, 10, 10]));
  } else {
    header = [xcell("学号", XLSX_STYLE.headerLeft), xcell("姓名", H), xcell("班级", H), xcell(subjectLabel, H), xcell("校排", H), xcell("班排", H), xcell("等级", H)];
    widths = [12, 11, 9, 11, 10, 10, 9];
  }
  const rows = [header];

  for (const s of students) {
    const totalRank = tables.totalSchool.get(s);
    const totalClassRank = tables.totalClass.get(s);
    if (kind === "school") {
      const row = [
        xcell(s.id || "", XLSX_STYLE.text), xcell(s.name, XLSX_STYLE.text), xcell(s.className, XLSX_STYLE.text),
        xcell(isValidScore(s.total) ? Number(s.total) : "", XLSX_STYLE.body),
        xcell(totalRank === undefined ? "" : formatRank(totalRank), XLSX_STYLE.gray)
      ];
      for (const sub of state.subjects) {
        const v = s.scores[sub.name];
        const r = tables.subjectSchool[sub.name].get(s);
        row.push(xcell(isValidScore(v) ? Number(v) : "", XLSX_STYLE.body));
        row.push(xcell(r === undefined ? "" : formatRank(r), XLSX_STYLE.gray));
      }
      rows.push(row);
    } else if (kind === "classAll") {
      const row = [
        xcell(s.id || "", XLSX_STYLE.text), xcell(s.name, XLSX_STYLE.text), xcell(s.className, XLSX_STYLE.text),
        xcell(isValidScore(s.total) ? Number(s.total) : "", XLSX_STYLE.body),
        xcell(totalRank === undefined ? "" : formatRank(totalRank), XLSX_STYLE.gray),
        xcell(totalClassRank === undefined ? "" : formatRank(totalClassRank), XLSX_STYLE.gray)
      ];
      for (const sub of state.subjects) {
        const v = s.scores[sub.name];
        const sr = tables.subjectSchool[sub.name].get(s);
        const cr = tables.subjectClass[sub.name].get(s);
        row.push(xcell(isValidScore(v) ? Number(v) : "", XLSX_STYLE.body));
        row.push(xcell(sr === undefined ? "" : formatRank(sr), XLSX_STYLE.gray));
        row.push(xcell(cr === undefined ? "" : formatRank(cr), XLSX_STYLE.gray));
      }
      rows.push(row);
    } else {
      const score = scoreOf(s, subjectKey);
      const valid = isValidScore(score);
      const schoolMap = subjectKey === "__total__" ? tables.totalSchool : tables.subjectSchool[subjectKey];
      const classMap = subjectKey === "__total__" ? tables.totalClass : tables.subjectClass[subjectKey];
      const sr = schoolMap.get(s);
      const cr = classMap.get(s);
      rows.push([
        xcell(s.id || "", XLSX_STYLE.text), xcell(s.name, XLSX_STYLE.text), xcell(s.className, XLSX_STYLE.text),
        xcell(valid ? Number(score) : "", XLSX_STYLE.body),
        xcell(sr === undefined ? "" : formatRank(sr), XLSX_STYLE.gray),
        xcell(cr === undefined ? "" : formatRank(cr), XLSX_STYLE.gray),
        xcell(valid ? s.grade : "未参考", XLSX_STYLE.body)
      ]);
    }
  }

  const fileBase = kind === "school"
    ? "全级全科名单"
    : kind === "classAll"
      ? "班级全科名单_" + classLabel
      : "班级当前学科名单_" + classLabel + "_" + subjectLabel;
  const infoParts = [state.fileName || "本次考试",
    kind === "school" ? "全级全科名单" : kind === "classAll" ? "班级全科名单 · " + classLabel : "班级当前学科名单 · " + classLabel + " · " + subjectLabel];
  rows.unshift([xcell(exportInfoLine(infoParts), XLSX_STYLE.headerLeft)]);
  downloadXlsx(fileBase + "_" + examTag() + "_" + dateStamp() + ".xlsx", rows, widths,
    kind === "school" ? "全级全科" : kind === "classAll" ? "班级全科" : "班级当前学科", 2);
}
