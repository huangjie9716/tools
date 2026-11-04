"use strict";

/* =========================================================
   渲染：班级画像（学科贡献率雷达图）
   ========================================================= */
function basicStandardStats(values){
  const arr = [];
  for (const v of values) if (isValidScore(v)) arr.push(Number(v));
  const n = arr.length;
  if (!n) return { n:0, mean:null, sd:null };
  let sum = 0;
  for (const v of arr) sum += v;
  const mean = sum / n;
  let variance = 0;
  for (const v of arr) variance += Math.pow(v - mean, 2);
  return { n, mean, sd: Math.sqrt(variance / n) };
}

function computeClassProfiles(dataset, options){
  const opts = options || {};
  const names = opts.subjects && opts.subjects.length
    ? opts.subjects.slice()
    : dataset.subjects.map(s => s.name);
  const useCommonTotal = !!opts.commonTotal;
  const totalValue = s => {
    if (!useCommonTotal) return s.total;
    let sum = 0;
    for (const name of names) {
      const v = s.scores[name];
      if (!isValidScore(v)) return null;
      sum += Number(v);
    }
    return sum;
  };

  const subjectStats = {};
  for (const name of names) {
    subjectStats[name] = basicStandardStats(dataset.students.map(s => s.scores[name]));
  }
  const totalStats = basicStandardStats(dataset.students.map(totalValue));
  const values = new Map();
  for (const cls of dataset.classes) {
    const classStudents = dataset.students.filter(s => s.className === cls);
    const map = {};
    for (const name of names) {
      const ss = subjectStats[name];
      if (ss.n === 0 || ss.sd === null || ss.sd === 0 ||
          totalStats.n === 0 || totalStats.sd === null || totalStats.sd === 0) {
        map[name] = null;
        continue;
      }
      let count = 0;
      let sumSubjectZ = 0;
      let sumTotalZ = 0;
      for (const s of classStudents) {
        const sv = s.scores[name];
        const tv = totalValue(s);
        if (!isValidScore(sv) || !isValidScore(tv)) continue;
        sumSubjectZ += (Number(sv) - ss.mean) / ss.sd;
        sumTotalZ += (Number(tv) - totalStats.mean) / totalStats.sd;
        count++;
      }
      map[name] = count
        ? (sumSubjectZ / count - sumTotalZ / count) * 100
        : null;
    }
    values.set(cls, map);
  }
  return { subjects: names, classes: dataset.classes, values };
}

function niceScale(maxAbs){
  if (!Number.isFinite(maxAbs) || maxAbs <= 0) return 1;
  const steps = [0.5, 1, 2, 3, 5, 8, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200];
  for (const s of steps) if (maxAbs <= s) return s;
  return Math.ceil(maxAbs / 50) * 50;
}

function fmtScale(v){
  if (!Number.isFinite(v)) return "";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function fmtContribution(v){
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  const num = Number(v);
  const abs = Math.abs(num);
  const digits = abs >= 10 ? 1 : abs >= 1 ? 1 : 2;
  let s = num.toFixed(digits);
  if (s.indexOf(".") >= 0) s = s.replace(/0+$/,"").replace(/\.$/,"");
  return (num > 0 ? "+" : "") + s;
}

function radarSvg(subjects, currentMap, refMap, scale, className){
  const size = 340;
  const cx = 170;
  const cy = 170;
  const Rmax = 112;
  const n = subjects.length;
  if (!n) return '<div class="profile-empty">暂无学科数据</div>';

  const angle = i => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const pt = (r, i) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });
  const round = v => Math.round(v * 100) / 100;
  const valueRadius = v => {
    const f = (Number(v) + scale) / (2 * scale);
    return Math.max(0, Math.min(1, f)) * Rmax;
  };
  const polygonPoints = map => subjects.map((sub, i) => {
    const p = pt(valueRadius(Number(map[sub])), i);
    return round(p.x) + "," + round(p.y);
  }).join(" ");
  const isComplete = map => map && subjects.every(sub => {
    const v = map[sub];
    return v !== null && v !== undefined && Number.isFinite(Number(v));
  });

  let svg = "";
  for (const f of [0.25, 0.5, 0.75, 1]) {
    const points = subjects.map((_, i) => {
      const p = pt(Rmax * f, i);
      return round(p.x) + "," + round(p.y);
    }).join(" ");
    const isZero = f === 0.5;
    svg += '<polygon points="' + points + '" fill="none" stroke="' + (isZero ? "#94a3b8" : "#e2e8f0") +
      '" stroke-width="' + (isZero ? "1.2" : "1") + '"' + (isZero ? ' stroke-dasharray="4 4"' : "") + '/>';
  }

  for (let i = 0; i < n; i++) {
    const p = pt(Rmax, i);
    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + round(p.x) + '" y2="' + round(p.y) +
      '" stroke="#e2e8f0" stroke-width="1"/>';
  }

  for (const f of [0.25, 0.5, 0.75, 1]) {
    const value = -scale + 2 * scale * f;
    const y = cy - Rmax * f + 3;
    const isZero = f === 0.5;
    svg += '<text x="' + (cx + 6) + '" y="' + round(y) + '" font-size="9.5" fill="' +
      (isZero ? "#475569" : "#94a3b8") + '" font-weight="' + (isZero ? "700" : "400") + '">' +
      fmtScale(value) + '</text>';
  }
  svg += '<text x="' + (cx + 6) + '" y="' + (cy + 12) + '" font-size="9.5" fill="#94a3b8">' +
    fmtScale(-scale) + '</text>';

  for (let i = 0; i < n; i++) {
    const p = pt(Rmax + 24, i);
    const anchor = p.x > cx + 10 ? "start" : p.x < cx - 10 ? "end" : "middle";
    const baseline = p.y > cy + 10 ? "hanging" : p.y < cy - 10 ? "auto" : "middle";
    svg += '<text x="' + round(p.x) + '" y="' + round(p.y) + '" text-anchor="' + anchor +
      '" dominant-baseline="' + baseline + '" font-size="11.5" font-weight="600" fill="#475569">' +
      escapeHtml(subjects[i]) + '</text>';
  }

  const refComplete = isComplete(refMap);
  if (refComplete) {
    svg += '<polygon points="' + polygonPoints(refMap) +
      '" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>';
  }

  const currentComplete = isComplete(currentMap);
  if (currentComplete) {
    svg += '<polygon points="' + polygonPoints(currentMap) +
      '" fill="#1b2454" fill-opacity="0.10" stroke="#1b2454" stroke-width="2" stroke-linejoin="round"/>';
  }

  const drawDots = (map, color, label, r) => {
    if (!map) return "";
    let out = "";
    for (let i = 0; i < n; i++) {
      const sub = subjects[i];
      const v = map[sub];
      if (v === null || v === undefined || !Number.isFinite(Number(v))) continue;
      const p = pt(valueRadius(Number(v)), i);
      out += '<circle cx="' + round(p.x) + '" cy="' + round(p.y) + '" r="' + r +
        '" fill="' + color + '" stroke="#fff" stroke-width="1.5"><title>' +
        escapeHtml(label + " " + sub + " " + fmtContribution(Number(v))) + '</title></circle>';
    }
    return out;
  };

  if (refComplete) svg += drawDots(refMap, "#f59e0b", "比对", 2.8);
  svg += drawDots(currentMap, "#1b2454", "本次", 3.2);

  if (!currentComplete) {
    svg += '<text x="' + cx + '" y="' + (size - 14) +
      '" text-anchor="middle" font-size="10" fill="#94a3b8">部分学科数据不足</text>';
  }

  return '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' +
    escapeHtml(className) + '学科贡献率雷达图"><title>' +
    escapeHtml(className) + '学科贡献率雷达图</title>' + svg + '</svg>';
}

const BAR_POSITIVE = "#1b2454";
const BAR_NEGATIVE = "#ea580c";

function fmtAxisTick(tick){
  if (Math.abs(tick) < 1e-9) return "0";
  const abs = Math.abs(tick);
  const digits = abs < 1 ? 2 : 1;
  const s = tick.toFixed(digits).replace(/\.?0+$/, "");
  return (tick > 0 ? "+" : "") + s;
}

function shortSubject(name){
  const s = String(name || "");
  if (s.length <= 3) return s;
  if (/道德|道法/.test(s)) return "道法";
  return s.slice(0, 2);
}

function renderBarSubjectLegend(profiles, hasRef){
  const el = $("#barSubjectLegend");
  if (!el) return;
  if (!profiles || !profiles.subjects.length) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = '<span class="legend-prefix">柱状图：</span>' +
    '<span class="subject-key"><span class="swatch" style="background:' + BAR_POSITIVE + '"></span>正贡献</span>' +
    '<span class="subject-key"><span class="swatch" style="background:' + BAR_NEGATIVE + '"></span>负贡献</span>' +
    (hasRef
      ? '<span class="subject-key"><span class="swatch swatch-dash"></span>虚线柱：比对考试（颜色随正负）</span>'
      : '');
}

function classContributionBarSvg(subjects, map, scale, className, refMap){
  const W = 300;
  const H = 240;
  const left = 40;
  const right = 8;
  const top = 24;
  const bottom = 44;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const n = subjects.length;
  if (!n) return '<div class="profile-empty">暂无学科数据</div>';

  const refUsable = !!refMap && subjects.some(sub => {
    const v = refMap[sub];
    return v !== null && v !== undefined && Number.isFinite(Number(v));
  });

  const yFor = v => top + (scale - v) / (2 * scale) * plotH;
  const zeroY = yFor(0);
  const round = n => Math.round(n * 100) / 100;
  const groupW = plotW / n;
  const pairW = Math.min(30, groupW * 0.64);
  const gap = refUsable ? 2 : 0;
  const barW = refUsable ? Math.max(4, (pairW - gap) / 2) : pairW;
  const labelYFor = (v, yVal) => v >= 0
    ? Math.max(11, yVal - 4)
    : Math.min(H - 34, yVal + 10);
  const barBox = (cx, yVal) => {
    const y = Math.min(zeroY, yVal);
    return {
      x: round(cx - barW / 2),
      y: round(y),
      w: round(barW),
      h: round(Math.max(1, Math.abs(yVal - zeroY)))
    };
  };

  let hasAny = false;
  let bars = "";
  let labels = "";

  for (let i = 0; i < n; i++) {
    const sub = subjects[i];
    const groupCx = left + i * groupW + groupW / 2;
    const curCx = refUsable ? groupCx - gap / 2 - barW / 2 : groupCx;
    const refCx = groupCx + gap / 2 + barW / 2;

    const curRaw = map ? map[sub] : null;
    const curValid = curRaw !== null && curRaw !== undefined && Number.isFinite(Number(curRaw));
    const refRaw = refUsable ? refMap[sub] : null;
    const refValid = refRaw !== null && refRaw !== undefined && Number.isFinite(Number(refRaw));
    if (curValid || refValid) hasAny = true;

    const tip = className + " " + sub +
      (curValid ? " 本次 " + fmtContribution(Number(curRaw)) : "") +
      (refValid ? "；比对 " + fmtContribution(Number(refRaw)) : "");

    const valueLabels = [];

    if (curValid) {
      const v = Number(curRaw);
      const yVal = yFor(v);
      const box = barBox(curCx, yVal);
      bars += '<rect x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h +
        '" rx="2" fill="' + (v >= 0 ? BAR_POSITIVE : BAR_NEGATIVE) + '" fill-opacity="0.92"><title>' +
        escapeHtml(tip) + '</title></rect>';
      valueLabels.push({ cx: curCx, y: labelYFor(v, yVal), v: v, ref: false });
    }
    if (refValid) {
      const v = Number(refRaw);
      const yVal = yFor(v);
      const box = barBox(refCx, yVal);
      bars += '<rect x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h +
        '" rx="2" fill="none" stroke="' + (v >= 0 ? BAR_POSITIVE : BAR_NEGATIVE) +
        '" stroke-width="1.6" stroke-dasharray="4 3"><title>' +
        escapeHtml(tip) + '</title></rect>';
      valueLabels.push({ cx: refCx, y: labelYFor(v, yVal), v: v, ref: true });
    }

    // 本次/比对两个数值标签横向相邻，高度接近时错开一行，避免叠字
    if (valueLabels.length === 2 && Math.abs(valueLabels[0].y - valueLabels[1].y) < 10) {
      const up = valueLabels[0].y - 11;
      valueLabels[1].y = up >= 10 ? up : valueLabels[0].y + 11;
    }
    for (const item of valueLabels) {
      labels += '<text x="' + round(item.cx) + '" y="' + round(item.y) +
        '" text-anchor="middle" font-size="' + (item.ref ? "8.8" : "9.5") + '" font-weight="700" fill="' +
        (item.ref ? (item.v >= 0 ? BAR_POSITIVE : BAR_NEGATIVE) : "#334155") + '">' +
        escapeHtml(fmtContribution(item.v)) + '</text>';
    }

    bars += '<text x="' + round(groupCx) + '" y="' + (H - 20) + '" text-anchor="middle" font-size="10.5" fill="' +
      (curValid || refValid ? "#475569" : "#cbd5e1") + '" font-weight="600">' + escapeHtml(shortSubject(sub)) + '</text>';
  }

  if (!hasAny) return '<div class="profile-empty">数据不足</div>';

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
    escapeHtml(className) + '学科贡献率柱状图"><title>' + escapeHtml(className) + '学科贡献率柱状图</title>';

  const ticks = [scale, scale / 2, 0, -scale / 2, -scale];
  for (const tick of ticks) {
    const y = round(yFor(tick));
    const zero = Math.abs(tick) < 1e-9;
    svg += '<line x1="' + (left - 6) + '" y1="' + y + '" x2="' + (W - right) + '" y2="' + y +
      '" stroke="' + (zero ? "#94a3b8" : "#e2e8f0") + '" stroke-width="' + (zero ? "1.2" : "1") + '"/>';
    svg += '<text x="' + (left - 9) + '" y="' + (y + 3) + '" text-anchor="end" font-size="9.5" fill="' +
      (zero ? "#475569" : "#94a3b8") + '" font-weight="' + (zero ? "700" : "400") + '">' +
      fmtAxisTick(tick) + '</text>';
  }
  svg += '<text x="2" y="12" font-size="9.5" fill="#64748b" font-weight="600">标准分差</text>';
  svg += bars + labels;
  svg += '</svg>';
  return svg;
}

function svgToDataUrl(svg){
  if (!svg) return null;
  const clone = svg.cloneNode(true);
  const vb = svg.viewBox && svg.viewBox.baseVal;
  const w = vb && vb.width ? vb.width : Number(svg.getAttribute("width")) || 300;
  const h = vb && vb.height ? vb.height : Number(svg.getAttribute("height")) || 240;
  clone.setAttribute("width", w);
  clone.setAttribute("height", h);
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
}

async function downloadProfileCardImage(card){
  const svgs = card.querySelectorAll(".profile-chart-pane svg");
  if (svgs.length < 2) return toast("当前班级图表数据不足", "error");
  const cls = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "班级";
  const foot = card.querySelector(".profile-foot") ? card.querySelector(".profile-foot").textContent.trim() : "";
  const refLegend = document.querySelector("#profileRefLegend");
  const hasRef = !!state.reference && !!refLegend && !refLegend.hidden;
  const subtitle = (state.fileName ? state.fileName + " · " : "") +
    (hasRef
      ? "雷达图：蓝色本次、橙色比对；柱状图：实心本次、虚线比对（颜色随正负）"
      : "雷达图与柱状图：本次考试");
  try {
    const radarImg = await loadImageSource(svgToDataUrl(svgs[0]));
    const barImg = await loadImageSource(svgToDataUrl(svgs[1]));
    const W = 940;
    const H = 560;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0f172a";
    ctx.font = '800 24px "Microsoft YaHei","PingFang SC",Arial,sans-serif';
    ctx.fillText(cls + " 班级画像", 24, 38);
    ctx.fillStyle = "#64748b";
    ctx.font = '400 13px "Microsoft YaHei","PingFang SC",Arial,sans-serif';
    ctx.fillText(subtitle, 24, 60);
    ctx.drawImage(radarImg, 24, 78, 420, 420);
    ctx.drawImage(barImg, 480, 118, 420, 336);
    ctx.fillStyle = "#94a3b8";
    ctx.font = '400 12px "Microsoft YaHei","PingFang SC",Arial,sans-serif';
    wrapCanvasText(ctx, foot, 24, 532, 870, 17);
    const blob = await canvasToBlob(canvas);
    if (!blob) throw new Error("图片生成失败");
    const exam = typeof examTag === "function" ? examTag() : "";
    const stamp = typeof dateStamp === "function" ? dateStamp() : "";
    downloadBlob("班级画像_" + cls + (exam ? "_" + exam : "") + (stamp ? "_" + stamp : "") + ".png", blob);
    toast("已导出 " + cls + " 班级画像", "success");
  } catch (err) {
    console.error(err);
    toast("图片导出失败，请重试", "error");
  }
}

function renderProfile(){
  const grid = $("#profileGrid");
  if (!grid) return;
  if (!state.students.length) {
    grid.innerHTML = '<div class="profile-empty">请先导入成绩文件</div>';
    renderBarSubjectLegend(null);
    return;
  }

  const allNames = state.subjects.map(sub => sub.name);
  let compareNames = allNames;
  let useCommonTotal = false;
  let refProfiles = null;
  if (state.reference) {
    const common = allNames.filter(name => state.reference.subjects.some(sub => sub.name === name));
    if (common.length >= 3) {
      compareNames = common;
      useCommonTotal = true;
      refProfiles = computeClassProfiles(state.reference, { subjects: common, commonTotal: true });
    }
  }
  const currentProfiles = computeClassProfiles(datasetForCurrent(), {
    subjects: compareNames,
    commonTotal: useCommonTotal
  });
  const subjects = currentProfiles.subjects;

  let maxAbs = 0;
  for (const map of currentProfiles.values.values()) {
    for (const sub of subjects) {
      const v = map[sub];
      if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
        maxAbs = Math.max(maxAbs, Math.abs(Number(v)));
      }
    }
  }
  if (refProfiles) {
    for (const cls of currentProfiles.classes) {
      const map = refProfiles.values.get(cls);
      if (!map) continue;
      for (const sub of subjects) {
        const v = map[sub];
        if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
          maxAbs = Math.max(maxAbs, Math.abs(Number(v)));
        }
      }
    }
  }
  const scale = niceScale(maxAbs);

  const scaleNote = $("#profileScaleNote");
  if (scaleNote) {
    scaleNote.textContent = "统一刻度：" + fmtScale(-scale) + " ~ +" + fmtScale(scale) + " 标准分（T 标准分差）";
  }
  const refLegend = $("#profileRefLegend");
  if (refLegend) refLegend.hidden = !refProfiles;
  renderBarSubjectLegend(currentProfiles, !!refProfiles);

  grid.innerHTML = currentProfiles.classes.map(cls => {
    const currentMap = currentProfiles.values.get(cls) || {};
    const refMap = refProfiles ? (refProfiles.values.get(cls) || null) : null;
    const classSize = state.students.filter(s => s.className === cls).length;
    const hasCurrent = subjects.some(sub => {
      const v = currentMap[sub];
      return v !== null && v !== undefined && Number.isFinite(Number(v));
    });

    let foot = "";
    if (state.reference && !refProfiles) {
      foot = "两卷共同学科不足，未绘制比对；图表为本次全部学科";
    } else if (refProfiles) {
      if (!refMap) {
        foot = "比对考试无该班数据；柱状图为本次考试";
      } else {
        const refComplete = subjects.every(sub => {
          const v = refMap[sub];
          return v !== null && v !== undefined && Number.isFinite(Number(v));
        });
        foot = refComplete
          ? "共同学科 " + subjects.length + " 科；雷达图蓝色本次、橙色比对；柱状图实心本次、虚线比对"
          : "比对考试该班部分学科数据不足；柱状图缺数科目不画虚线";
      }
    } else {
      foot = "仅显示本次考试";
    }

    return '<div class="profile-card">' +
      '<div class="profile-card-head"><h3>' + escapeHtml(cls) + '</h3><div class="profile-card-tools">' +
        '<span class="profile-sub">' + classSize + ' 人</span>' +
        '<button type="button" class="btn ghost small profile-download no-print" data-profile-download="' + escapeHtml(cls) + '">导出图片</button>' +
      '</div></div>' +
      '<div class="profile-chart-pair">' +
        '<div class="profile-chart-pane">' +
          '<div class="profile-chart-label">雷达图</div>' +
          (hasCurrent ? radarSvg(subjects, currentMap, refMap, scale, cls) : '<div class="profile-empty">数据不足</div>') +
        '</div>' +
        '<div class="profile-chart-pane">' +
          '<div class="profile-chart-label">学科贡献率柱状图 <span>' + (refMap ? "实心本次 · 虚线比对" : "本次") + '</span></div>' +
          classContributionBarSvg(subjects, currentMap, scale, cls, refMap) +
        '</div>' +
      '</div>' +
      '<div class="profile-foot">' + escapeHtml(foot) + '</div>' +
    '</div>';
  }).join("");
}
