/* =========================================================
   学生学科诊断报告（单次考试）
   ---------------------------------------------------------
   ΔT = 该科标准分 T − 总分标准分 T
   提分空间 = (−ΔT) × 该科标准差 ÷ 100（即拉齐到个人标准分基线所需提升的原始分）
   ========================================================= */
function weakSchoolStats(key){
  const vals = [];
  for (const s of state.students) {
    const v = key === "__total__" ? s.total : s.scores[key];
    if (isValidScore(v)) vals.push(Number(v));
  }
  const n = vals.length;
  if (!n) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
  return { n, mean, sd };
}

function toStandardScore(raw, stats){
  if (!isValidScore(raw) || !stats || !(stats.sd > 0)) return null;
  return 500 + 100 * (Number(raw) - stats.mean) / stats.sd;
}

function studentReportData(index){
  const s = state.students[index];
  if (!s) return null;
  const { totalRankMap, subjectRanks } = computeWeaknessData();
  const totalRank = totalRankMap.get(s);
  const totalStats = weakSchoolStats("__total__");
  const tTotal = toStandardScore(s.total, totalStats);

  const rows = state.subjects.map(sub => {
    const raw = s.scores[sub.name];
    const valid = isValidScore(raw);
    const stats = valid ? weakSchoolStats(sub.name) : null;
    const t = valid ? toStandardScore(raw, stats) : null;
    const rank = subjectRanks[sub.name] ? subjectRanks[sub.name].get(s) : undefined;
    const dT = (t !== null && tTotal !== null) ? t - tTotal : null;
    const full = getFull(sub.name);
    const isFull = valid && Number(raw) >= full - 1e-9;
    /* 提分空间：拉齐到个人基线的原始分，并以该科满分封顶（满分学科无可提升） */
    let gain = null;
    if (dT !== null && dT < 0 && stats && stats.sd > 0) {
      const need = (-dT) * stats.sd / 100;
      const room = Math.max(0, Number(full) - Number(raw));
      gain = Math.min(need, room);
    }
    return {
      name: sub.name,
      raw: valid ? Number(raw) : null,
      t: t,
      rank: rank === undefined ? null : rank,
      dT: dT,
      gain: gain,
      full: full,
      isFull: isFull
    };
  });

  /* 满分学科不参与短板评选（ΔT 仍展示，但已无可提升） */
  const weakest = rows
    .filter(r => r.dT !== null && r.dT < 0 && !r.isFull)
    .sort((a, b) => a.dT - b.dT)[0] || null;

  const fullMarked = rows.filter(r => r.isFull && r.dT !== null && r.dT < 0).map(r => r.name);

  return {
    student: s,
    totalRank: totalRank,
    tTotal: tTotal,
    rows: rows,
    weakest: weakest,
    fullMarked: fullMarked
  };
}

function studentRadarSvg(items, baseT){
  if (!items || items.length < 3) {
    return '<div class="sr-empty">有效学科少于 3 科，无法绘制雷达图。</div>';
  }
  const W = 360, H = 340, cx = 180, cy = 162, R = 110;
  const n = items.length;

  const values = items.map(i => i.t);
  if (baseT !== null && baseT !== undefined) values.push(baseT);
  let lo = Math.min.apply(null, values);
  let hi = Math.max.apply(null, values);
  let span = hi - lo;
  if (span < 20) span = 20;
  lo = lo - span * 0.12;
  hi = hi + span * 0.12;

  const ratio = v => Math.max(0.06, Math.min(1, (v - lo) / (hi - lo)));
  const angle = i => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const pt = (r, i) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });
  const r2 = v => Math.round(v * 100) / 100;

  let svg = '<svg viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="跨学科标准分雷达图">';

  [0.25, 0.5, 0.75, 1].forEach(f => {
    const points = items.map((_, i) => {
      const p = pt(R * f, i);
      return r2(p.x) + "," + r2(p.y);
    }).join(" ");
    svg += '<polygon points="' + points + '" fill="none" stroke="' + (f === 1 ? "#dde5f0" : "#eef2f8") + '" stroke-width="1"/>';
  });

  items.forEach((it, i) => {
    const p = pt(R, i);
    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + r2(p.x) + '" y2="' + r2(p.y) + '" stroke="#eef2f8" stroke-width="1"/>';
    const lp = pt(R + 22, i);
    const anchor = lp.x > cx + 8 ? "start" : lp.x < cx - 8 ? "end" : "middle";
    const baseline = lp.y > cy + 8 ? "hanging" : lp.y < cy - 8 ? "auto" : "middle";
    svg += '<text x="' + r2(lp.x) + '" y="' + r2(lp.y) + '" text-anchor="' + anchor +
      '" dominant-baseline="' + baseline + '" font-size="11.5" font-weight="700" fill="#475569">' +
      escapeHtml(it.name) + "</text>";
  });

  if (baseT !== null && baseT !== undefined) {
    const rr = R * ratio(baseT);
    const points = items.map((_, i) => {
      const p = pt(rr, i);
      return r2(p.x) + "," + r2(p.y);
    }).join(" ");
    svg += '<polygon points="' + points + '" fill="#e11d48" fill-opacity="0.05" stroke="#e11d48" stroke-width="2"' +
      ' stroke-dasharray="6 4" stroke-linejoin="round"><title>总分标准分 ' + r2(baseT) + '</title></polygon>';
  }

  const pts = items.map((it, i) => {
    const p = pt(R * ratio(it.t), i);
    return { x: r2(p.x), y: r2(p.y) };
  });
  svg += '<polygon points="' + pts.map(p => p.x + "," + p.y).join(" ") +
    '" fill="#1b2454" fill-opacity="0.10" stroke="#1b2454" stroke-width="2.2" stroke-linejoin="round"/>';
  pts.forEach((p, i) => {
    svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3.6" fill="#fff" stroke="#1b2454" stroke-width="2"><title>' +
      escapeHtml(items[i].name + "：" + items[i].t.toFixed(1)) + "</title></circle>";
  });

  svg += "</svg>";
  return svg;
}

function openStudentReport(index){
  const data = studentReportData(index);
  const mask = document.getElementById("studentReportModal");
  const body = document.getElementById("srBody");
  const sub = document.getElementById("srSub");
  if (!mask || !body || !data) return;

  const s = data.student;
  const totalValid = isValidScore(s.total);
  if (sub) sub.textContent = (state.fileName || "本次考试") + " · 单次考试学科诊断";

  const head = '<div class="sr-head">' +
    '<span class="sr-name">' + escapeHtml(s.name || "—") + "</span>" +
    '<span class="sr-meta">学号：' + escapeHtml(s.id || "—") + " · " + escapeHtml(s.className || "—") + "</span>" +
    '<span class="sr-badge">校排 ' + (data.totalRank === undefined ? "—" : escapeHtml(formatRank(data.totalRank))) + "</span>" +
    '<span class="sr-badge">总分 ' + (totalValid ? escapeHtml(fmtScore(s.total)) : "—") + "</span>" +
    '<span class="sr-badge">总分标准分 ' + (data.tTotal === null ? "—" : data.tTotal.toFixed(1)) + "</span>" +
    "</div>";

  const radarItems = data.rows.filter(r => r.t !== null).map(r => ({ name: r.name, t: r.t }));
  const radar = '<div class="sr-block sr-radar"><h4>跨学科标准分差值</h4>' +
    '<p class="sr-hint">ΔT = T学科 − T总分，红色虚线为个人总分标准分基线</p>' +
    studentRadarSvg(radarItems, data.tTotal) +
    '<div class="sr-legend">' +
      '<span><i style="background:#1b2454"></i>学科标准分 T</span>' +
      '<span><i style="background:#e11d48"></i>总分标准分基准线</span>' +
    "</div></div>";

  const rowsHtml = data.rows.map(r => {
    const dtCls = r.dT === null ? "" : (r.dT > 0 ? "up" : r.dT < 0 ? "down" : "");
    const gainHtml = r.isFull
      ? '<span class="sr-gain-full">已达满分</span>'
      : (r.gain === null ? "—" : "+" + r.gain.toFixed(1) + " 分");
    return "<tr>" +
      "<td>" + escapeHtml(r.name) + "</td>" +
      "<td>" + (r.raw === null ? "—" : escapeHtml(fmtScore(r.raw))) + "</td>" +
      "<td>" + (r.t === null ? "—" : r.t.toFixed(1)) + "</td>" +
      '<td class="sr-dt ' + dtCls + '">' + (r.dT === null ? "—" : (r.dT > 0 ? "+" : "") + r.dT.toFixed(1)) + "</td>" +
      "<td>" + (r.rank === null ? "—" : escapeHtml(formatRank(r.rank))) + "</td>" +
      '<td class="sr-gain">' + gainHtml + "</td>" +
      "</tr>";
  }).join("");

  const table = '<div class="sr-block sr-table"><h4>各学科详细成绩与提分空间</h4>' +
    '<p class="sr-hint">提分空间＝拉齐到个人总分基线所需的原始分，并以该科满分封顶；已达满分的学科无可提升，不计入短板。</p>' +
    "<table><thead><tr>" +
      "<th>学科</th><th>原始分</th><th>标准分</th><th>ΔT</th><th>校排</th><th>提分空间</th>" +
    "</tr></thead><tbody>" + rowsHtml + "</tbody></table></div>";

  const fullMarkedText = (data.fullMarked && data.fullMarked.length)
    ? data.fullMarked.map(function (n) { return "【" + n + "】"; }).join("")
    : "";
  const tip = data.weakest
    ? '<div class="sr-tip">💡 相对薄弱学科为【<b>' + escapeHtml(data.weakest.name) + "</b>】（ΔT：" +
      data.weakest.dT.toFixed(1) + "）。若针对薄弱点重点攻坚，将该科拉齐至个人标准分基线，预计可释放约 <b>+" +
      (data.weakest.gain === null ? "—" : data.weakest.gain.toFixed(1)) + " 分</b>的提分空间！" +
      (fullMarkedText ? "（" + escapeHtml(fullMarkedText) + " 已达满分，无可提升，不计入短板）" : "") + "</div>"
    : (fullMarkedText
      ? '<div class="sr-tip">' + escapeHtml(fullMarkedText) + ' 已达满分（无可提升），不计入短板；其余学科标准分均不低于个人总分标准分基线，暂无明显短板。</div>'
      : '<div class="sr-tip">各学科标准分均不低于个人总分标准分基线，暂无明显短板。</div>');

  body.innerHTML = head + '<div class="sr-grid">' + radar + table + "</div>" + tip;
  mask.hidden = false;

  const exportBtn = document.getElementById("srExportImage");
  if (exportBtn) exportBtn.onclick = exportStudentReportImage;
}

/* 诊断报告表格 → 行内样式 HTML（保留 ΔT 红绿、提分空间配色） */
function srExportTableHtml(table){
  const headerStyle = "background:#f6f8fc;color:#475569;font-weight:800;padding:6px 8px;border-bottom:1px solid #e2e8f1;text-align:center;font-size:12px;white-space:nowrap";
  const headCells = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent.trim());
  let html = '<table style="width:100%;border-collapse:collapse;font-family:Microsoft YaHei,PingFang SC,Arial,sans-serif;background:#fff">' +
    "<thead><tr>" + headCells.map(t => '<th style="' + headerStyle + '">' + escapeHtml(t) + "</th>").join("") +
    "</tr></thead><tbody>";
  for (const tr of Array.from(table.querySelectorAll("tbody tr"))) {
    html += "<tr>";
    Array.from(tr.children).forEach((td, i) => {
      const text = td.textContent.trim() || "—";
      let style = "padding:6px 8px;border-bottom:1px solid #eef2f8;font-size:12px;white-space:nowrap;text-align:center;color:#1f2937";
      if (i === 0) style += ";text-align:left;font-weight:700;color:#1e293b";
      if (td.classList.contains("sr-dt")) {
        if (td.classList.contains("up")) style += ";color:#059669;font-weight:800";
        else if (td.classList.contains("down")) style += ";color:#dc2626;font-weight:800";
      }
      if (td.classList.contains("sr-gain")) {
        if (td.querySelector(".sr-gain-full")) style += ";color:#64748b;font-weight:700";
        else style += ";color:#0f7b5f;font-weight:700";
      }
      html += '<td style="' + style + '">' + escapeHtml(text) + "</td>";
    });
    html += "</tr>";
  }
  return html + "</tbody></table>";
}

/* 导出诊断报告为图片（雷达图 + 成绩表 + 提示） */
function exportStudentReportImage(){
  if (typeof downloadHtmlAsPng !== "function") {
    return toast("导出组件未就绪，请刷新页面后重试", "error");
  }
  const body = document.getElementById("srBody");
  if (!body) return toast("暂无可导出的报告内容", "error");

  const nameEl = body.querySelector(".sr-name");
  const name = nameEl ? nameEl.textContent.trim() : "学生";
  const badges = Array.from(body.querySelectorAll(".sr-head .sr-meta, .sr-head .sr-badge"))
    .map(el => el.textContent.trim()).filter(Boolean);

  const svg = body.querySelector(".sr-radar svg");
  let radarHtml = "";
  if (svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "360");
    clone.setAttribute("height", "340");
    clone.setAttribute("font-family", "'Microsoft YaHei','PingFang SC','Helvetica Neue',Arial,sans-serif");
    radarHtml = clone.outerHTML;
  }

  const table = body.querySelector(".sr-table table");
  if (!table) return toast("暂无可导出的成绩表", "error");

  const tipEl = body.querySelector(".sr-tip");
  const tipText = tipEl ? tipEl.textContent.trim() : "";

  const headHtml = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 14px;' +
    'background:#f6f8fc;border:1px solid #e2e8f1;border-radius:12px;margin-bottom:16px">' +
    '<span style="font-size:17px;font-weight:800;color:#1b2454">' + escapeHtml(name) + "</span>" +
    badges.map(t => '<span style="padding:3px 10px;border-radius:999px;background:#eef1f8;color:#1b2454;' +
      'font-size:12px;font-weight:700">' + escapeHtml(t) + "</span>").join("") +
    "</div>";

  const blockTitle = t => '<div style="font-size:13px;font-weight:800;color:#1b2454;margin-bottom:8px">' + t + "</div>";
  const radarBlock = '<div style="flex:0 0 380px;max-width:380px">' + blockTitle("跨学科标准分差值") + radarHtml +
    '<div style="display:flex;gap:16px;justify-content:center;font-size:11.5px;color:#64748b;margin-top:4px">' +
      '<span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#1b2454;margin-right:5px"></i>学科标准分 T</span>' +
      '<span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#e11d48;margin-right:5px"></i>总分标准分基准线</span>' +
    "</div></div>";
  const tableBlock = '<div style="flex:1 1 auto;min-width:0">' + blockTitle("各学科详细成绩与提分空间") +
    srExportTableHtml(table) + "</div>";

  const inner = headHtml +
    '<div style="display:flex;gap:18px;align-items:flex-start">' + radarBlock + tableBlock + "</div>" +
    (tipText ? '<div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:#eaf6fb;' +
      'border:1px solid #cfe8f3;color:#1f4f63;font-size:12.5px;line-height:1.8">' + escapeHtml(tipText) + "</div>" : "");

  const stamp = typeof dateStamp === "function" ? dateStamp() : "";
  const safeName = String(name).replace(/[\\/:*?"<>|]/g, "_");
  const exam = typeof examTag === "function" ? examTag() : "";
  downloadHtmlAsPng("学生学科诊断报告_" + safeName + (exam ? "_" + exam : "") + (stamp ? "_" + stamp : "") + ".png",
    "学生学科诊断报告 · " + name,
    (state.fileName || "本次考试") + " · 单次考试学科诊断 · " + name + (badges.length ? " · " + badges.join(" · ") : ""),
    inner, 1040).catch(err => {
      console.error(err);
      toast("图片导出失败，请重试", "error");
    });
}

function closeStudentReport(){
  const mask = document.getElementById("studentReportModal");
  if (mask) mask.hidden = true;
}
