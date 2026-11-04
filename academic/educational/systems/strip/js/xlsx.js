/* =========================================================
   极简 XLSX 导出（无外部依赖，离线可用）
   ---------------------------------------------------------
   只做成绩条需要的部分：单元格、合并、列宽、边框、
   表头底色与字体，生成标准 .xlsx（Office / WPS 均可打开）
   ========================================================= */
(function () {
  "use strict";

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* 不压缩（store），Excel 完全支持，代码最短 */
  function zipStore(files) {
    var enc = new TextEncoder();
    var chunks = [];
    var cents = [];
    var offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name);
      var data = f.data;
      var crc = crc32(data);

      var local = new Uint8Array(30 + name.length);
      var dv = new DataView(local.buffer);
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

      var cen = new Uint8Array(46 + name.length);
      var cv = new DataView(cen.buffer);
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
    });

    var centralSize = cents.reduce(function (s, c) { return s + c.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    return new Blob(chunks.concat(cents, [end]), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
  }

  function xmlEscape(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  function colLetter(n) {
    var s = "";
    while (n > 0) {
      var m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function cellXml(cell, ref) {
    var style = cell && cell.s ? cell.s : 0;
    var value = cell ? cell.v : null;
    if (value === null || value === undefined || value === "") {
      return '<c r="' + ref + '" s="' + style + '"/>';
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return '<c r="' + ref + '" s="' + style + '"><v>' + value + "</v></c>";
    }
    return '<c r="' + ref + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' +
      xmlEscape(value) + "</t></is></c>";
  }

  var STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="5">' +
        '<font><sz val="11"/><name val="Microsoft YaHei"/></font>' +
        '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/></font>' +
        '<font><b/><sz val="11"/><color rgb="FF1B2454"/><name val="Microsoft YaHei"/></font>' +
        '<font><sz val="11"/><color rgb="FF9AA4B5"/><name val="Microsoft YaHei"/></font>' +
        '<font><sz val="10"/><color rgb="FF64748B"/><name val="Microsoft YaHei"/></font>' +
      "</fonts>" +
      '<fills count="4">' +
        '<fill><patternFill patternType="none"/></fill>' +
        '<fill><patternFill patternType="gray125"/></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FF1B2454"/><bgColor indexed="64"/></patternFill></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF2F8"/><bgColor indexed="64"/></patternFill></fill>' +
      "</fills>" +
      '<borders count="2">' +
        '<border><left/><right/><top/><bottom/><diagonal/></border>' +
        '<border><left style="thin"><color rgb="FFB7C0D1"/></left>' +
          '<right style="thin"><color rgb="FFB7C0D1"/></right>' +
          '<top style="thin"><color rgb="FFB7C0D1"/></top>' +
          '<bottom style="thin"><color rgb="FFB7C0D1"/></bottom><diagonal/></border>' +
      "</borders>" +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="7">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        /* 1 深色表头 */
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
        /* 2 浅色表头 */
        '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
        /* 3 文本靠左 */
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
        /* 4 数字居中 */
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
        /* 5 缺考灰字 */
        '<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
        /* 6 姓名加粗 */
        '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      "</cellXfs>" +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    "</styleSheet>";

  function sheetXml(spec) {
    var rows = spec.rows || [];
    var merges = spec.merges || [];
    var widths = spec.widths || [];
    var freezeRows = Math.max(0, Number(spec.freezeRows) || 0);
    var freezeCols = Math.max(0, Number(spec.freezeCols) || 0);

    var maxCols = 1;
    rows.forEach(function (r) { if (r && r.length > maxCols) maxCols = r.length; });
    var lastRef = colLetter(maxCols) + Math.max(1, rows.length);

    var colsXml = "";
    if (widths.length) {
      colsXml = "<cols>" + widths.map(function (w, i) {
        return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
      }).join("") + "</cols>";
    }

    var data = "";
    rows.forEach(function (row, r) {
      data += '<row r="' + (r + 1) + '" ht="' + (r < freezeRows ? 26 : 20) + '" customHeight="1">';
      (row || []).forEach(function (cell, c) {
        if (!cell) return;
        data += cellXml(cell, colLetter(c + 1) + (r + 1));
      });
      data += "</row>";
    });

    var mergesXml = "";
    if (merges.length) {
      mergesXml = '<mergeCells count="' + merges.length + '">' + merges.map(function (m) {
        return '<mergeCell ref="' + colLetter(m.c1 + 1) + (m.r1 + 1) + ":" +
          colLetter(m.c2 + 1) + (m.r2 + 1) + '"/>';
      }).join("") + "</mergeCells>";
    }

    var pane = "";
    if (freezeRows || freezeCols) {
      pane = '<pane xSplit="' + freezeCols + '" ySplit="' + freezeRows +
        '" topLeftCell="' + colLetter(freezeCols + 1) + (freezeRows + 1) +
        '" activePane="bottomRight" state="frozen"/>';
    }

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<dimension ref="A1:' + lastRef + '"/>' +
        '<sheetViews><sheetView workbookViewId="0">' + pane + "</sheetView></sheetViews>" +
        '<sheetFormatPr defaultRowHeight="20"/>' + colsXml +
        "<sheetData>" + data + "</sheetData>" + mergesXml +
        '<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>' +
        '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
      "</worksheet>";
  }

  function buildBlob(spec) {
    var enc = new TextEncoder();
    var sheetName = String((spec && spec.sheetName) || "数据").replace(/[\\\/\?\*\[\]:]/g, "").slice(0, 31) || "数据";
    var files = [
      { name: "[Content_Types].xml", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        "</Types>") },
      { name: "_rels/.rels", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>") },
      { name: "xl/workbook.xml", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="' + xmlEscape(sheetName) + '" sheetId="1" r:id="rId1"/></sheets>' +
        "</workbook>") },
      { name: "xl/_rels/workbook.xml.rels", data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        "</Relationships>") },
      { name: "xl/styles.xml", data: enc.encode(STYLES_XML) },
      { name: "xl/worksheets/sheet1.xml", data: enc.encode(sheetXml(spec || {})) }
    ];
    return zipStore(files);
  }

  function download(filename, spec) {
    var url = URL.createObjectURL(buildBlob(spec));
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  window.JZXlsx = { download: download, buildBlob: buildBlob };
})();
