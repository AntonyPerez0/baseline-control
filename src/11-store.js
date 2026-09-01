/* ============================================================
   Storage.
   Five career slots, a versioned save format with a migration
   path, in progress answers preserved across a reload, and an
   export that works whether or not the host allows downloads.
   ============================================================ */
(function(){
"use strict";
var B = window.BC;

var APP = "1.2.1";
var FORMAT = 2;            // bump only when the shape of a saved state changes
var SLOTS = 5;
var K = {
  slot: function(n){ return "bc.v2.slot" + n; },
  active: "bc.v2.active",
  form: "bc.v2.form",
  teach: "bc.v2.teach",
  last: "bc.v2.last",
  theme: "bc.theme",
  helped: "bc.helped"
};
var LEGACY_SAVE = "baseline-control.save.v1";
var LEGACY_THEME = "baseline-control.theme";
var LEGACY_HELPED = "baseline-control.helped";

/* ---------- is there storage at all ---------- */
var _ok = null, _why = "";
function available(){
  if (_ok !== null) return _ok;
  try {
    var probe = "bc.probe." + Math.random();
    localStorage.setItem(probe, "1");
    if (localStorage.getItem(probe) !== "1") throw new Error("read back failed");
    localStorage.removeItem(probe);
    _ok = true;
  } catch(e){
    _ok = false;
    _why = (e && e.name === "QuotaExceededError")
      ? "Browser storage is full, so progress cannot be saved. Clear some site data and reload."
      : "This browser is not allowing site storage, so progress will not be saved. Private browsing and a blocked cookie setting both do this.";
  }
  return _ok;
}
function reason(){ available(); return _why; }
function get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function set(k, v){ try { localStorage.setItem(k, v); return true; } catch(e){ _ok = false;
  _why = "Browser storage rejected the write, most likely because it is full. Export your save and clear some site data."; return false; } }
function del(k){ try { localStorage.removeItem(k); } catch(e){} }

/* ---------- shape migration ---------- */
function migrate(o){
  if (!o || typeof o !== "object") return null;
  var v = o.v || 1;
  if (v > FORMAT) return { tooNew:true };
  if (v === 1){
    o.v = 2;
    o.name = o.name || (o.world && o.world.prog ? o.world.prog.name : "Career");
    o.drillKinds = o.drillKinds || null;
    o.usedEvents = o.usedEvents || [];
    o.escapes = o.escapes || [];
    o.badges = o.badges || {};
    o.history = o.history || [];
    o.dayLog = o.dayLog || [];
    o.boardCooldown = o.boardCooldown || 0;
    o.stats = o.stats || {};
    v = 2;
  }
  // fields every v2 state carries
  if (!o.stats) o.stats = {};
  var st = o.stats;
  ["done","perfect","streak","bestStreak","found","missed","escapes","boards","drillN","drillHit"]
    .forEach(function(k){ if (typeof st[k] !== "number") st[k] = 0; });
  if (!o.meters) o.meters = { integrity:78, schedule:80, confidence:76, audit:70 };
  if (typeof o.updated !== "number") o.updated = Date.now();
  o.app = o.app || APP;
  return o;
}

/* ---------- slots ---------- */
function read(n){
  var raw = get(K.slot(n));
  if (!raw) return null;
  var o;
  try { o = JSON.parse(raw); } catch(e){ return null; }
  var m = migrate(o);
  if (!m || m.tooNew) return null;
  return m;
}
function write(n, state){
  if (!state) return false;
  state.v = FORMAT; state.app = APP; state.updated = Date.now();
  var okw = set(K.slot(n), JSON.stringify(state));
  if (okw) _lastSaved = state.updated;
  return okw;
}
function clear(n){ del(K.slot(n)); if (activeSlot() === n) del(K.form); }
function rename(n, name){
  var s = read(n); if (!s) return false;
  s.name = String(name).slice(0, 40);
  return write(n, s);
}
function meta(n){
  var raw = get(K.slot(n));
  if (!raw) return { n:n, empty:true };
  var o;
  try { o = JSON.parse(raw); } catch(e){ return { n:n, empty:true, corrupt:true }; }
  if ((o.v || 1) > FORMAT) return { n:n, empty:false, tooNew:true, bytes:raw.length };
  return {
    n:n, empty:false, bytes:raw.length,
    name: o.name || (o.world && o.world.prog ? o.world.prog.name : "Career"),
    prog: o.world && o.world.prog ? o.world.prog.name : "",
    mode: o.mode || "career",
    level: o.level || 1,
    day: o.day || 1,
    xp: o.xp || 0,
    integrity: o.meters ? o.meters.integrity : 0,
    escapes: o.stats ? (o.stats.escapes || 0) : 0,
    updated: o.updated || 0
  };
}
function listSlots(){
  var out = [];
  for (var n=1;n<=SLOTS;n++) out.push(meta(n));
  return out;
}
function firstFree(){
  for (var n=1;n<=SLOTS;n++){ if (meta(n).empty) return n; }
  return 0;
}
function activeSlot(){
  var v = parseInt(get(K.active), 10);
  return (v >= 1 && v <= SLOTS) ? v : 1;
}
function setActiveSlot(n){ set(K.active, String(n)); }

/* ---------- in progress answers ---------- */
function formSave(itemId, form){
  if (!itemId) return;
  set(K.form, JSON.stringify({ slot:activeSlot(), itemId:itemId, form:form, t:Date.now() }));
}
function formLoad(itemId){
  var raw = get(K.form);
  if (!raw) return null;
  try {
    var o = JSON.parse(raw);
    if (o.slot !== activeSlot() || o.itemId !== itemId) return null;
    return o.form;
  } catch(e){ return null; }
}
function formClear(){ del(K.form); }

/* ---------- export and import ---------- */
function exportText(n){
  var s = read(n);
  if (!s) return "";
  return JSON.stringify({ baselineControl:APP, format:FORMAT, exported:new Date().toISOString(), state:s }, null, 1);
}
function exportName(n){
  var m = meta(n);
  var slug = (m.name || "career").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return "baseline-control-" + (slug || "career") + "-day" + (m.day || 1) + ".json";
}
function importText(text, n){
  var o;
  try { o = JSON.parse(String(text).trim()); }
  catch(e){ return { ok:false, err:"That is not valid JSON. Paste the whole file, including the outer braces." }; }
  var state = o && o.state ? o.state : o;
  if (!state || typeof state !== "object" || !state.world || !state.meters)
    return { ok:false, err:"That file does not look like a Baseline Control save." };
  var m = migrate(state);
  if (!m) return { ok:false, err:"That save could not be read." };
  if (m.tooNew) return { ok:false, err:"That save was written by a newer version of Baseline Control than this one. Update the page first." };
  if (!write(n, m)) return { ok:false, err:_why || "The save could not be written to this browser." };
  return { ok:true, meta:meta(n) };
}

/* ---------- handing the viewer a file ----------
   Two hosts, two mechanisms. Served as an ordinary page, a blob link works.
   Inside the claude.ai artifact viewer the frame cannot download at all, and
   the downloads capability is the sanctioned route. Either way the copyable
   text is always there, so export never silently does nothing.              */
var _top = null;
function topLevel(){
  if (_top !== null) return _top;
  try { _top = (window.top === window.self); } catch(e){ _top = false; }
  return _top;
}
var _cap;                       // undefined unknown, null unavailable, object ready
var _capWaiters = [];
function probeDownloads(onReady){
  if (onReady) _capWaiters.push(onReady);
  if (_cap !== undefined) { if (onReady && _cap) onReady(); return; }
  var c = window.claude;
  if (!c || typeof c.use !== "function"){ _cap = null; return; }
  _cap = undefined;
  var settle = function(ns){
    _cap = ns || null;
    if (_cap) _capWaiters.forEach(function(f){ try { f(); } catch(e){} });
    _capWaiters = [];
  };
  try { c.use("downloads").then(settle, function(){ settle(null); }); }
  catch(e){ settle(null); }
}
/* true when a Download button will actually do something */
function canDownload(){ return topLevel() || !!_cap; }

function blobSave(filename, text){
  try {
    var blob = new Blob([text], { type:"application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
    return true;
  } catch(e){ return false; }
}
var CAP_MSG = {
  declined: "Save cancelled.",
  rate_limited: "A save prompt is already open. Try again in a moment.",
  too_large: "That career is too large to hand over as a file. Copy the text instead.",
  rejected_extension: "This viewer will not accept that file type. Copy the text instead.",
  extension_not_enabled: "This viewer will not accept that file type. Copy the text instead."
};
/* done(ok, message) */
function saveFile(filename, text, done){
  done = done || function(){};
  if (_cap){
    _cap.save({ filename: filename, data: text }).then(
      function(){ done(true, "Saved"); },
      function(err){
        var code = err && err.code;
        if (code === "declined" || code === "rate_limited"){ done(false, CAP_MSG[code]); return; }
        if (CAP_MSG[code]){ done(false, CAP_MSG[code]); return; }
        if (topLevel() && blobSave(filename, text)){ done(true, "Saved"); return; }
        done(false, "This viewer will not save files. Copy the text instead.");
      }
    );
    return;
  }
  if (topLevel() && blobSave(filename, text)){ done(true, "Saved"); return; }
  done(false, "This viewer blocks downloads. Copy the text instead.");
}

/* ---------- one time move of the old single save into slot 1 ---------- */
function adoptLegacy(){
  if (!available()) return;
  var oldTheme = get(LEGACY_THEME);
  if (oldTheme && !get(K.theme)){ set(K.theme, oldTheme); del(LEGACY_THEME); }
  if (get(LEGACY_HELPED) && !get(K.helped)){ set(K.helped, "1"); del(LEGACY_HELPED); }
  var raw = get(LEGACY_SAVE);
  if (!raw) return;
  if (get(K.slot(1))) { del(LEGACY_SAVE); return; }
  try {
    var o = JSON.parse(raw);
    var m = migrate(o);
    if (m && !m.tooNew){ write(1, m); setActiveSlot(1); }
  } catch(e){}
  del(LEGACY_SAVE);
}

/* ---------- teach mode progress ----------
   Kept out of the career slots on purpose: what you have learned should not
   disappear because you started a new career.                              */
function teachRead(){
  var raw = get(K.teach);
  if (!raw) return null;
  try {
    var o = JSON.parse(raw);
    if (!o || (o.v || 1) > 1) return null;
    return o;
  } catch(e){ return null; }
}
function teachWrite(t){
  if (!t) return false;
  t.v = 1; t.updated = Date.now();
  var okw = set(K.teach, JSON.stringify(t));
  if (okw) _lastSaved = t.updated;
  return okw;
}
function teachClear(){ del(K.teach); }
function teachSummary(){
  var t = teachRead();
  if (!t) return null;
  var n = 0;
  for (var k in (t.done || {})) n++;
  return { lessons:n, lesson:t.lesson, updated:t.updated || 0 };
}
function lastMode(){ return get(K.last) || "career"; }
function setLastMode(m){ set(K.last, m); }

var _lastSaved = 0;
function lastSaved(){ return _lastSaved; }
function sinceText(){
  if (!_lastSaved) return "";
  var s = Math.round((Date.now() - _lastSaved) / 1000);
  if (s < 5) return "saved just now";
  if (s < 60) return "saved " + s + "s ago";
  var m = Math.round(s/60);
  if (m < 60) return "saved " + m + "m ago";
  return "saved " + Math.round(m/60) + "h ago";
}

window.BCS = {
  APP:APP, FORMAT:FORMAT, SLOTS:SLOTS,
  available:available, reason:reason,
  read:read, write:write, clear:clear, rename:rename, meta:meta, listSlots:listSlots, firstFree:firstFree,
  activeSlot:activeSlot, setActiveSlot:setActiveSlot,
  formSave:formSave, formLoad:formLoad, formClear:formClear,
  exportText:exportText, exportName:exportName, importText:importText,
  canDownload:canDownload, saveFile:saveFile, probeDownloads:probeDownloads, topLevel:topLevel,
  adoptLegacy:adoptLegacy, migrate:migrate,
  teachRead:teachRead, teachWrite:teachWrite, teachClear:teachClear, teachSummary:teachSummary,
  lastMode:lastMode, setLastMode:setLastMode,
  lastSaved:lastSaved, sinceText:sinceText,
  pref: {
    get: function(k){ return get(K[k] || k); },
    set: function(k, v){ return set(K[k] || k, v); }
  }
};
})();
