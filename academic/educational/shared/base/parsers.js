"use strict";

/* =========================================================
   ZIP / XLSX 解析（无外部依赖，离线可用）
   ========================================================= */
function findEndOfCentralDirectory(bytes, dv){
  const min = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= min; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) return i;
  }
  return -1;
}
function findZip64End(dv, eocd){
  const locator = eocd - 20;
  if (locator >= 0 && dv.getUint32(locator, true) === 0x07064b50) {
    const lo = Number(dv.getBigUint64 ? dv.getBigUint64(locator + 8, true) : dv.getUint32(locator + 8, true));
    if (lo >= 0 && lo + 56 <= dv.byteLength && dv.getUint32(lo, true) === 0x06064b50) return lo;
  }
  return -1;
}
function readZipEntries(buffer){
  const bytes = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  const eocd = findEndOfCentralDirectory(bytes, dv);
  if (eocd < 0) throw new Error("文件不是有效的 xlsx（ZIP 结构损坏）");

  let count = dv.getUint16(eocd + 10, true);
  let cdOffset = dv.getUint32(eocd + 16, true);
  if (count === 0xffff || cdOffset === 0xffffffff) {
    const z64 = findZip64End(dv, eocd);
    if (z64 >= 0) {
      count = Number(dv.getBigUint64 ? dv.getBigUint64(z64 + 32, true) : dv.getUint32(z64 + 32, true));
      cdOffset = Number(dv.getBigUint64 ? dv.getBigUint64(z64 + 48, true) : dv.getUint32(z64 + 48, true));
    }
  }

  const entries = {};
  let p = cdOffset;
  const decoder = new TextDecoder("utf-8");
  for (let i = 0; i < count; i++) {
    if (p + 46 > bytes.length || dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    let compSize = dv.getUint32(p + 20, true);
    let uncompSize = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    let localOffset = dv.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const extraStart = p + 46 + nameLen;

    if (compSize === 0xffffffff || uncompSize === 0xffffffff || localOffset === 0xffffffff) {
      let e = extraStart;
      const extraEnd = extraStart + extraLen;
      while (e + 4 <= extraEnd) {
        const id = dv.getUint16(e, true);
        const size = dv.getUint16(e + 2, true);
        if (id === 0x0001) {
          let q = e + 4;
          if (uncompSize === 0xffffffff && q + 8 <= e + 4 + size) {
            uncompSize = Number(dv.getBigUint64 ? dv.getBigUint64(q, true) : dv.getUint32(q, true));
            q += 8;
          }
          if (compSize === 0xffffffff && q + 8 <= e + 4 + size) {
            compSize = Number(dv.getBigUint64 ? dv.getBigUint64(q, true) : dv.getUint32(q, true));
            q += 8;
          }
          if (localOffset === 0xffffffff && q + 8 <= e + 4 + size) {
            localOffset = Number(dv.getBigUint64 ? dv.getBigUint64(q, true) : dv.getUint32(q, true));
            q += 8;
          }
        }
        e += 4 + size;
      }
    }
    entries[name] = { method, compSize, uncompSize, localOffset };
    p += 46 + nameLen + extraLen + commentLen;
  }

  async function get(name){
    const e = entries[name];
    if (!e) return null;
    const lp = e.localOffset;
    if (lp + 30 > bytes.length || dv.getUint32(lp, true) !== 0x04034b50) {
      throw new Error("xlsx 内部结构异常：" + name);
    }
    const nameLen = dv.getUint16(lp + 26, true);
    const extraLen = dv.getUint16(lp + 28, true);
    const start = lp + 30 + nameLen + extraLen;
    const data = bytes.subarray(start, start + e.compSize);
    if (e.method === 0) return data;
    if (e.method === 8) {
      if (typeof DecompressionStream === "undefined") {
        throw new Error("当前浏览器不支持解压 xlsx，请使用较新的 Chrome / Edge 打开");
      }
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    throw new Error("xlsx 使用了不支持的压缩方式");
  }

  return { entries, get };
}

function parseXml(text){
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const errors = doc.getElementsByTagName("parsererror");
  if (errors && errors.length) throw new Error("XML 解析失败");
  return doc;
}
function localElements(root, name){
  try { return Array.from(root.getElementsByTagNameNS("*", name)); }
  catch(e) { return Array.from(root.getElementsByTagName(name)); }
}
function localFirst(root, name){
  const arr = localElements(root, name);
  return arr.length ? arr[0] : null;
}
function colFromRef(ref){
  const m = String(ref || "").match(/^[A-Za-z]+/);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[0].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return Math.max(0, n - 1);
}
function normalizeZipPath(path){
  const parts = String(path).replace(/\\/g,"/").split("/");
  const out = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

async function parseXlsx(buffer){
  const zip = readZipEntries(buffer);
  const decode = bytes => new TextDecoder("utf-8").decode(bytes);

  let shared = [];
  const sharedBytes = await zip.get("xl/sharedStrings.xml");
  if (sharedBytes) {
    const doc = parseXml(decode(sharedBytes));
    shared = localElements(doc, "si").map(si => localElements(si, "t").map(t => t.textContent || "").join(""));
  }

  const sheetPaths = [];
  const wbBytes = await zip.get("xl/workbook.xml");
  const relBytes = await zip.get("xl/_rels/workbook.xml.rels");
  if (wbBytes && relBytes) {
    const wbDoc = parseXml(decode(wbBytes));
    const relDoc = parseXml(decode(relBytes));
    const rels = localElements(relDoc, "Relationship");
    for (const sheet of localElements(wbDoc, "sheet")) {
      const rid = sheet.getAttribute("r:id") ||
        sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ||
        sheet.getAttribute("id");
      if (!rid) continue;
      const rel = rels.find(r => r.getAttribute("Id") === rid);
      const target = rel && rel.getAttribute("Target");
      if (!target) continue;
      const path = target.charAt(0) === "/" ? normalizeZipPath(target.substring(1)) : normalizeZipPath("xl/" + target);
      if (zip.entries[path]) sheetPaths.push(path);
    }
  }
  if (!sheetPaths.length) {
    const found = Object.keys(zip.entries)
      .filter(n => /^xl\/worksheets\/sheet\d+\.xml$/i.test(n))
      .sort((a,b) => a.localeCompare(b, "en", { numeric:true }));
    sheetPaths.push(...found);
  }
  if (!sheetPaths.length) throw new Error("xlsx 中找不到工作表");

  let firstRows = null;
  let fallbackRows = null;
  for (const path of sheetPaths) {
    const sheetBytes = await zip.get(path);
    if (!sheetBytes) continue;
    const rows = parseSheetRows(parseXml(decode(sheetBytes)), shared);
    if (!firstRows) firstRows = rows;
    const hasContent = rows.some(row => row && row.some(v => cleanText(v) !== ""));
    if (!hasContent) continue;
    if (!fallbackRows) fallbackRows = rows;
    const looksLikeScores = rows.slice(0, 30).some(row => {
      const vals = row.map(v => cleanText(v));
      return HEADER_ALIASES.name.some(a => vals.includes(a)) ||
        (HEADER_ALIASES.id.some(a => vals.includes(a)) && HEADER_ALIASES.className.some(a => vals.includes(a)));
    });
    if (looksLikeScores) return rows;
  }
  return fallbackRows || firstRows || [];
}

function parseSheetRows(sheetDoc, shared){
  const rows = [];
  let fallbackRow = 0;
  for (const rowEl of localElements(sheetDoc, "row")) {
    const rAttr = parseInt(rowEl.getAttribute("r") || "", 10);
    const rowIndex = Number.isFinite(rAttr) && rAttr > 0 ? rAttr - 1 : fallbackRow;
    fallbackRow = rowIndex + 1;
    const cells = [];
    let cursor = 0;
    for (const c of localElements(rowEl, "c")) {
      const ref = c.getAttribute("r");
      const col = ref ? colFromRef(ref) : cursor;
      cursor = col + 1;
      const type = c.getAttribute("t");
      const vEl = localFirst(c, "v");
      let value = "";
      if (type === "inlineStr") {
        const is = localFirst(c, "is");
        value = is ? localElements(is, "t").map(t => t.textContent || "").join("") : "";
      } else if (type === "s") {
        const idx = vEl ? parseInt(vEl.textContent || "", 10) : NaN;
        value = Number.isFinite(idx) ? (shared[idx] === undefined ? "" : shared[idx]) : "";
      } else if (type === "b") {
        value = vEl && vEl.textContent === "1" ? 1 : 0;
      } else if (type === "e") {
        value = "";
      } else if (vEl) {
        const raw = vEl.textContent || "";
        const num = Number(raw);
        value = raw !== "" && Number.isFinite(num) ? num : raw;
      }
      cells[col] = value;
    }
    rows[rowIndex] = cells;
  }
  return rows;
}


/* =========================================================
   CSV 解析
   ========================================================= */
function decodeTextBuffer(buffer){
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  try {
    return new TextDecoder("utf-8", { fatal:true }).decode(bytes);
  } catch(e) {
    try { return new TextDecoder("gbk").decode(bytes); }
    catch(e2) { return new TextDecoder("utf-8").decode(bytes); }
  }
}
function parseDelimited(text, delimiter){
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (inQuotes) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delimiter) { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* 忽略，兼容 CRLF */ }
      else field += ch;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function parseCsvText(text){
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  const candidates = [",", "\t", ";"];
  let delimiter = ",";
  let best = -1;
  for (const d of candidates) {
    let n = 0;
    for (const ch of sample) if (ch === d) n++;
    if (n > best) { best = n; delimiter = d; }
  }
  return parseDelimited(text, delimiter);
}


/* =========================================================
   文件读取与数据构建
   ========================================================= */
async function readRowsFromFile(file){
  const lower = String(file.name || "").toLowerCase();
  if (lower.endsWith(".xls")) {
    throw new Error("暂不支持旧版 .xls，请在 Excel/WPS 中另存为 .xlsx 或 .csv 后再上传");
  }
  if (lower.endsWith(".csv")) {
    return parseCsvText(decodeTextBuffer(await file.arrayBuffer()));
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
    return parseXlsx(await file.arrayBuffer());
  }
  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (head[0] === 0x50 && head[1] === 0x4b) return parseXlsx(buffer);
  return parseCsvText(decodeTextBuffer(buffer));
}

const HEADER_ALIASES = {
  id: ["学号","学生学号","考号","考试号","考生号","准考证号","学籍号","学生编号","编号"],
  name: ["姓名","学生姓名","名字","学生"],
  className: ["班级","班级名称","班别","行政班","教学班","所在班级","班号","班"],
  total: ["总分","总成绩","总分成绩","合计","总计"]
};
const NON_SUBJECT_HEADER = /^(序号|排名|名次|校排名|班级排名|年级排名|总分排名|等级|等第|考场号?|考室号?|座位号?|性别|备注|学校|年级|准考证号|考试号|考生号|总分等级|总分名次)$/;

function headerScore(row){
  const vals = row.map(v => cleanText(v));
  let score = 0;
  for (const aliases of Object.values(HEADER_ALIASES)) {
    if (vals.some(v => aliases.includes(v))) score += 5;
  }
  score += vals.filter(v => v && !/^\d+(\.\d+)?$/.test(v)).length * 0.1;
  return score;
}
function findHeaderIndex(rows){
  let best = -1, bestScore = -1;
  const limit = Math.min(rows.length, 30);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!row || !row.length) continue;
    const vals = row.map(v => cleanText(v));
    const hasName = HEADER_ALIASES.name.some(a => vals.includes(a));
    const hasId = HEADER_ALIASES.id.some(a => vals.includes(a));
    const hasClass = HEADER_ALIASES.className.some(a => vals.includes(a));
    if (!hasName && !(hasId && hasClass)) continue;
    const sc = headerScore(row);
    if (sc > bestScore) { bestScore = sc; best = i; }
  }
  if (best >= 0) return best;
  for (let i = 0; i < limit; i++) {
    if (rows[i] && rows[i].some(v => cleanText(v))) return i;
  }
  return 0;
}
function findColumn(headers, aliases){
  for (let i = 0; i < headers.length; i++) {
    if (aliases.includes(headers[i])) return i;
  }
  return -1;
}
function buildDataset(rows){
  const normalizedRows = Array.from(rows || [], r => Array.isArray(r) ? r : []);
  if (!normalizedRows.length) throw new Error("文件内容为空");

  const headerIndex = findHeaderIndex(normalizedRows);
  const headers = (normalizedRows[headerIndex] || []).map(v => cleanText(v));
  const dataRows = normalizedRows.slice(headerIndex + 1);

  const idCol = findColumn(headers, HEADER_ALIASES.id);
  const nameCol = findColumn(headers, HEADER_ALIASES.name);
  const classCol = findColumn(headers, HEADER_ALIASES.className);
  let totalCol = findColumn(headers, HEADER_ALIASES.total);
  if (totalCol < 0) {
    totalCol = headers.findIndex(h => /总分|总成绩|总计/.test(h) && !/排名|名次|等级/.test(h));
  }

  if (nameCol < 0 && idCol < 0) {
    throw new Error("未找到“姓名”或“学号”列，请确认第一行是表头");
  }

  const fixed = new Set([idCol, nameCol, classCol, totalCol].filter(i => i >= 0));
  const numericCounts = {};
  for (let c = 0; c < headers.length; c++) {
    if (fixed.has(c)) continue;
    let n = 0;
    for (const row of dataRows) {
      if (isNumericValue(row && row[c])) n++;
    }
    numericCounts[c] = n;
  }

  const subjects = [];
  const usedNames = new Set();
  for (let c = 0; c < headers.length; c++) {
    if (fixed.has(c)) continue;
    const name = headers[c];
    if (!name || NON_SUBJECT_HEADER.test(name)) continue;
    if (numericCounts[c] < 1) continue;
    let uniqueName = name;
    let suffix = 2;
    while (usedNames.has(uniqueName)) { uniqueName = name + "(" + suffix + ")"; suffix++; }
    usedNames.add(uniqueName);
    subjects.push({ name: uniqueName, col: c });
  }
  if (!subjects.length) throw new Error("未识别到学科列，请检查表头（总分之后应为各学科名称）");

  const students = [];
  const idSet = new Set();
  let blankRows = 0;
  let noName = 0;
  let duplicateIds = 0;
  let mismatchTotal = 0;

  for (const row of dataRows) {
    const id = cleanText(idCol >= 0 ? row[idCol] : "");
    const name = cleanText(nameCol >= 0 ? row[nameCol] : "");
    const className = normalizeClass(classCol >= 0 ? row[classCol] : "");

    const scores = {};
    let hasAnyScore = false;
    let allSubjectsPresent = true;
    for (const sub of subjects) {
      const v = toNumber(row[sub.col]);
      scores[sub.name] = v;
      if (v !== null) hasAnyScore = true;
      else allSubjectsPresent = false;
    }

    const providedTotalNumber = totalCol >= 0 ? toNumber(row[totalCol]) : null;
    let computedTotal = null;
    if (hasAnyScore) {
      let sum = 0;
      for (const sub of subjects) {
        if (scores[sub.name] !== null) sum += scores[sub.name];
      }
      computedTotal = round2(sum);
    }

    if (!id && !name && !hasAnyScore && providedTotalNumber === null) { blankRows++; continue; }
    if (!id && !name) { blankRows++; continue; }
    if (!name) noName++;
    if (id && idSet.has(id)) duplicateIds++;
    if (id) idSet.add(id);

    let total = providedTotalNumber;
    if (total === null) total = computedTotal;
    if (providedTotalNumber !== null && computedTotal !== null && allSubjectsPresent &&
        Math.abs(providedTotalNumber - computedTotal) > 0.05) {
      mismatchTotal++;
    }

    students.push({
      id: id,
      name: name || "（未命名）",
      className: className,
      total: total === null ? null : round2(total),
      scores: scores,
      schoolRank: null,
      classRank: null,
      grade: "—"
    });
  }

  if (!students.length) throw new Error("没有读取到学生数据，请检查文件内容");

  const classes = Array.from(new Set(students.map(s => s.className))).sort(classCompare);
  const warnings = [];
  if (blankRows > 0) warnings.push("已忽略 " + blankRows + " 行空行");
  if (noName > 0) warnings.push(noName + " 行缺少姓名，已用“（未命名）”代替");
  if (duplicateIds > 0) warnings.push("有 " + duplicateIds + " 个重复学号");
  if (mismatchTotal > 0) warnings.push("有 " + mismatchTotal + " 名学生的总分与各科之和不一致，已按总分列计算");

  return { students, subjects, classes, blankRows, warnings, headerIndex, headers };
}
