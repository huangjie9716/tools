"use strict";

/* =========================================================
   工具函数
   ========================================================= */
function round2(n){ return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
function fmtScore(n){ return (n === null || n === undefined || !Number.isFinite(Number(n))) ? "—" : String(round2(n)); }
function fmtNum(n, digits){ return Number.isFinite(n) ? n.toFixed(digits === undefined ? 2 : digits) : "—"; }
function pctText(rate){ return Number.isFinite(rate) ? (rate * 100).toFixed(2) + "%" : "—"; }
function formatRank(v){ return (v === null || v === undefined || !Number.isFinite(Number(v))) ? "—" : String(Math.round(Number(v))); }
function gradeClass(g){ return "g-" + String(g).replace("+","p").replace("-","m"); }
function sameScore(a,b){ return Math.abs(Number(a) - Number(b)) < 1e-9; }
function cleanText(v){ return v === null || v === undefined ? "" : String(v).trim(); }
function toNumber(v){
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  const s = String(v).replace(/,/g,"").replace(/％/g,"%").trim();
  if (!s) return null;
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}
function isNumericValue(v){ return toNumber(v) !== null; }
function escapeHtml(v){
  return String(v === null || v === undefined ? "" : v)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function normalizeClass(v){
  let s = cleanText(v);
  if (!s) return "未分班";
  // 全角数字转半角、去掉多余空格，便于识别「1」「1班」「第1班」「０１班」等写法
  s = s.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, "");
  const m = s.match(/^第?(\d+)(?:\.0+)?班?$/);
  return m ? String(parseInt(m[1], 10)) + "班" : s;
}
function classCompare(a,b){
  const na = parseInt(a,10), nb = parseInt(b,10);
  const aNum = !Number.isNaN(na) && /^\d+/.test(a);
  const bNum = !Number.isNaN(nb) && /^\d+/.test(b);
  if (aNum && bNum && na !== nb) return na - nb;
  return String(a).localeCompare(String(b), "zh-CN", { numeric:true, sensitivity:"base" });
}
function getDefaultFull(subject){
  const key = cleanText(subject);
  if (Object.prototype.hasOwnProperty.call(SUBJECT_DEFAULT_FULL, key)) return SUBJECT_DEFAULT_FULL[key];
  const normalized = key.replace(/\(\d+\)$/,"").replace(/\s+/g,"");
  if (Object.prototype.hasOwnProperty.call(SUBJECT_DEFAULT_FULL, normalized)) return SUBJECT_DEFAULT_FULL[normalized];
  return 100;
}
function getFull(subject){
  const v = Number(state.fullScores[subject]);
  return Number.isFinite(v) && v > 0 ? v : getDefaultFull(subject);
}
function isValidScore(v){
  return v !== null && v !== undefined && Number.isFinite(Number(v)) && (state.includeZero ? Number(v) >= 0 : Number(v) > 0);
}
function safeLocalGet(key){
  try { return localStorage.getItem(key); } catch(e) { return null; }
}
function safeLocalSet(key, value){
  try { localStorage.setItem(key, value); } catch(e) { /* file:// 或隐私模式下忽略 */ }
}


/* =========================================================
   提示与弹窗
   ========================================================= */
let bannerTimer = null;
const BANNER_SUCCESS_ICON = '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M511.970515 1024a512.560207 512.560207 0 0 1-511.970515-511.970515 512.560207 512.560207 0 0 1 511.970515-512.029485 512.560207 512.560207 0 0 1 511.970516 511.970515 512.560207 512.560207 0 0 1-511.970516 512.029485z m-41.278433-270.491679h1.887014a58.556407 58.556407 0 0 0 41.691218-17.219003l291.897495-291.897495a58.556407 58.556407 0 0 0 17.277973-41.750188 58.497437 58.497437 0 0 0-17.277973-41.632248 58.615376 58.615376 0 0 0-41.691218-17.277973 58.438468 58.438468 0 0 0-41.691218 17.277973l-252.093291 252.034322-127.019637-126.960668a58.615376 58.615376 0 0 0-41.691218-17.277973 58.615376 58.615376 0 0 0-41.750188 17.277973 58.969191 58.969191 0 0 0 0 83.382436l166.823842 166.823841a58.438468 58.438468 0 0 0 41.632248 17.219003z" fill="#94c86c"></path></svg>';
function setBanner(type, text, sub, autoHide){
  const banner = $("#statusBanner");
  const icons = { info:"ℹ️", success:BANNER_SUCCESS_ICON, warn:"⚠️", error:"❌" };
  banner.className = "banner " + type;
  $("#bannerIcon").innerHTML = icons[type] || "ℹ️";
  $("#bannerText").innerHTML = text;
  $("#bannerSub").innerHTML = sub || "";
  banner.hidden = false;
  if (bannerTimer) clearTimeout(bannerTimer);
  if (autoHide) bannerTimer = setTimeout(() => { banner.hidden = true; }, 9000);
}
function hideBanner(){ $("#statusBanner").hidden = true; }

let toastTimer = null;
function toast(message, type){
  const el = $("#toast");
  el.textContent = message;
  el.className = "toast show" + (type ? " " + type : "");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 2600);
}
function openModal(id){
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}
function closeModal(id){
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}
$$("[data-close]").forEach(btn => btn.addEventListener("click", () => closeModal(btn.getAttribute("data-close"))));
$$(".modal-mask").forEach(mask => {
  mask.addEventListener("click", e => { if (e.target === mask) mask.hidden = true; });
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") $$(".modal-mask").forEach(m => { m.hidden = true; });
});
