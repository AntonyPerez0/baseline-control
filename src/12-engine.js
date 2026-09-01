/* ============================================================
   The engine: the working day, the meters, the consequences.
   ============================================================ */
(function(){
"use strict";
var B = window.BC, W = window.BCW, C = window.BCC,
    R = window.BCR, T1 = window.BCT1, T2 = window.BCT2, T3 = window.BCT3, X = window.BCX;
function ST(){ return window.BCS; }

var HOURS_PER_DAY = 10;

var KIND = {
  release:  { name:"Change package release audit", short:"RELEASE", xp:34 },
  ecp:      { name:"Engineering change classification", short:"ECP", xp:30 },
  ipn:      { name:"Interchangeability determination", short:"PART NO", xp:20 },
  variance: { name:"Variance request", short:"VARIANCE", xp:20 },
  cdrl:     { name:"Contract data deliverable", short:"CDRL", xp:26 },
  sdrl:     { name:"Subcontractor data deliverable", short:"SDRL", xp:28 },
  csa:      { name:"Status accounting query", short:"CSA", xp:24 },
  audit:    { name:"Configuration audit", short:"AUDIT", xp:46 },
  gate:     { name:"Baseline review", short:"GATE", xp:22 },
  minutes:  { name:"Change board minutes", short:"MINUTES", xp:26 },
  ccb:      { name:"Change control board", short:"BOARD", xp:52 },
  event:    { name:"Situation", short:"SITUATION", xp:22 },
  escape:   { name:"Escape", short:"ESCAPE", xp:18 },
  senior:   { name:"Staff decision", short:"STAFF", xp:44 }
};

var WEIGHTS = {
  release:  { integrity:9, audit:3 },
  ecp:      { integrity:8, confidence:3 },
  ipn:      { integrity:6 },
  variance: { integrity:5, confidence:2 },
  cdrl:     { schedule:6, confidence:5 },
  sdrl:     { schedule:6, confidence:4 },
  csa:      { confidence:6, audit:4 },
  audit:    { audit:10, confidence:5 },
  gate:     { audit:5, integrity:2 },
  minutes:  { audit:4, schedule:4 },
  ccb:      { integrity:7, confidence:5, schedule:4 },
  senior:   { confidence:7, integrity:5, audit:3 },
  event:    {},
  escape:   {}
};

var MIX = {
  1: [["release",40],["cdrl",24],["csa",14],["minutes",10],["gate",12]],
  2: [["release",30],["ecp",20],["ipn",12],["variance",12],["cdrl",14],["csa",12]],
  3: [["release",20],["ecp",18],["ipn",7],["variance",7],["cdrl",10],["sdrl",8],["csa",10],["audit",14],["gate",6]],
  4: [["release",12],["ecp",15],["audit",15],["csa",10],["cdrl",8],["sdrl",6],["senior",20],["gate",6],["variance",4],["ipn",4]],
  5: [["senior",32],["audit",14],["ecp",12],["csa",10],["cdrl",6],["sdrl",6],["release",8],["gate",8],["ipn",2],["variance",2]]
};

var S = null;
var rng = null;

function newState(opts){
  var seed = opts.seed || String(Math.floor(Math.random()*1e9));
  var world = W.buildWorld(seed, opts.progKey);
  return {
    v:2, app: ST().APP, name: opts.name || (world.prog.name + (opts.mode === "drill" ? " drill" : "")),
    updated: Date.now(),
    seed:seed, mode: opts.mode || "career", level: opts.level || 1, xp: opts.xp || 0,
    day:1, hours:HOURS_PER_DAY, overtime:0,
    meters:{ integrity:78, schedule:80, confidence:76, audit:70 },
    progKey: world.prog.key, world: world,
    queue:[], history:[], escapes:[], usedEvents:[], dayLog:[],
    stats:{ done:0, perfect:0, streak:0, bestStreak:0, found:0, missed:0, escapes:0, boards:0, drillN:0, drillHit:0 },
    badges:{}, pendingBoard:null, boardCooldown:0, activeId:null,
    drillKinds: opts.drillKinds || null,
    started:true, ended:false, seenTutorial: !!opts.seenTutorial
  };
}

function stream(tag){ return new B.RNG(S.seed + "|" + tag + "|" + S.day + "|" + S.stats.done + "|" + S.queue.length + "|" + Math.floor(Math.random()*100000)); }

function makeItem(kind){
  var r = stream(kind), w = S.world, d = S.day, lv = S.level, data, title, from, due, hours;
  switch(kind){
    case "release": data = R.genRelease(r, w, d, lv);
      title = "Release package " + data.pkg.docNo;
      from = data.pkg.sigs[0].name; hours = data.hours; due = d + r.int(0,2); break;
    case "ecp": data = T1.genECP(r, w, d, lv);
      title = "Classify " + data.ecpNo; from = data.originator; hours = data.hours; due = d + r.int(0,3); break;
    case "ipn": data = T1.genIPN(r, w, d, lv);
      title = "Part number determination, " + data.ci.doc; from = B.personName(r); hours = data.hours; due = d + r.int(1,4); break;
    case "variance": data = T1.genVariance(r, w, d, lv);
      title = "Variance request, " + data.ci.name; from = B.castBy("raghu").name; hours = data.hours; due = d + r.int(0,3); break;
    case "cdrl": data = T1.genCDRL(r, w, d, lv, false);
      title = "CDRL " + data.seq + ", " + data.title; from = B.castBy("salk").name; hours = data.hours; due = data.due; break;
    case "sdrl": data = T1.genCDRL(r, w, d, lv, true);
      title = "SDRL " + data.seq + ", " + data.title; from = data.supplier.name; hours = data.hours; due = data.due; break;
    case "csa": data = T2.genCSA(r, w, d, lv);
      title = "Status accounting query, " + data.ci.doc; from = data.asker.name; hours = data.hours; due = d + r.int(0,2); break;
    case "audit": data = T2.genAudit(r, w, d, lv);
      title = data.type + " on " + data.ci.name; from = data.lead.name; hours = data.hours; due = d + r.int(0,3); break;
    case "gate": data = T2.genGate(r, w, d, lv);
      title = "Baseline review prep"; from = data.reviewer.name; hours = data.hours; due = d + r.int(1,4); break;
    case "minutes": data = T2.genMinutes(r, w, d, lv);
      title = "Board minutes, " + B.dateShort(d); from = data.chair.name; hours = data.hours; due = d + 1; break;
    case "ccb": data = T3.genCCB(r, w, d, lv);
      title = "Change control board, " + B.dateShort(d); from = data.youChair ? "You are chairing" : data.chair.name; hours = data.hours; due = d; break;
    case "event": data = T3.genEvent(r, w, d, lv, S.usedEvents); S.usedEvents.push(data.eid);
      title = data.title; from = data.who.name; hours = data.hours; due = d; break;
    case "senior": data = T3.genSenior(r, w, d, lv);
      title = data.title; from = data.who.name; hours = data.hours; due = d + r.int(1,3); break;
    case "escape": data = opts_escape(r, w); title = "Escape: " + data.label; from = B.castBy("achebe").name; hours = 2; due = d; break;
  }
  return { id: B.uid("i"), kind:kind, title:title, from:from, due:due, hours:hours,
    data:data, done:false, result:null, spawned:S.day, resp:null };
}

function opts_escape(r, w){
  var e = S.pendingEscape || { label:"Undetected discrepancy", doc:"", rev:"", defect:"" };
  var base = [
    { t:"Establish which units are affected from the as built records, contain them, and report the escape to the customer with what you can and cannot establish", k:true,
      w:"Containment first, honesty second, process fix third. Every other order costs more." },
    { t:"Correct the record to what it should have said and carry on", k:false,
      w:"That is falsification. It also destroys the only evidence of what actually happened." },
    { t:"Wait for the failure investigation to finish before touching the configuration record", k:false,
      w:"Hardware keeps moving while you wait. Containment does not depend on knowing the root cause." },
    { t:"Retrofit every unit to the current configuration immediately", k:false,
      w:"Expensive, and it erases the evidence before anyone understands the failure." }
  ];
  var order = r.shuffle([0,1,2,3]);
  return { label:e.label, doc:e.doc, rev:e.rev, defect:e.defect, origin:e.originDay || 0,
    opts: order.map(function(i){ return base[i]; }) };
}

/* ---------------- day flow ---------------- */
function spawnDay(){
  var r = stream("day");
  var n = S.day === 1 ? 4 : r.int(3, 5);
  var mix = MIX[S.level];
  var i;
  for (i=0;i<n;i++) S.queue.push(makeItem(r.weighted(mix)));
  if (B.isCCBDay(S.day)) S.queue.push(makeItem(S.level === 1 ? "minutes" : "ccb"));
  if (r.chance(S.day === 1 ? 0.2 : 0.4)) S.queue.push(makeItem("event"));
  // escapes that have come due
  var still = [];
  for (i=0;i<S.escapes.length;i++){
    var e = S.escapes[i];
    if (e.dueDay <= S.day){
      S.pendingEscape = e;
      S.queue.push(makeItem("escape"));
      S.pendingEscape = null;
      S.stats.escapes++;
      S.meters.integrity -= 7; S.meters.confidence -= 5;
      S.dayLog.push({ t:"bad", text:"An escape surfaced: " + e.label + (e.doc ? " on " + e.doc : "") + "." });
    } else still.push(e);
  }
  S.escapes = still;
  clampMeters();
}

function clampMeters(){
  for (var k in S.meters) S.meters[k] = B.clamp(Math.round(S.meters[k]), 0, 100);
}

function grade(item, resp){
  switch(item.kind){
    case "release": return R.gradeRelease(item, resp);
    case "ecp": return T1.gradeECP(item, resp);
    case "ipn": return T1.gradeIPN(item, resp);
    case "variance": return T1.gradeVariance(item, resp);
    case "cdrl": case "sdrl": return T1.gradeCDRL(item, resp);
    case "csa": return T2.gradeCSA(item, resp);
    case "audit": return T2.gradeAudit(item, resp);
    case "gate": return T2.gradeGate(item, resp);
    case "minutes": return T2.gradeMinutes(item, resp);
    case "ccb": return T3.gradeCCB(item, resp);
    case "senior": return T3.gradeSenior(item, resp);
    case "event": return T3.gradeEvent(item, resp);
    case "escape": {
      var o = item.data.opts[resp.pick], right = !!(o && o.k), lines = [];
      lines.push(right ? {t:"ok",tag:"call",text:o.w} : {t:"bad",tag:"call",text:o.w});
      if (!right) for (var i=0;i<item.data.opts.length;i++) if (item.data.opts[i].k) lines.push({t:"n",tag:"better",text:item.data.opts[i].t + ". " + item.data.opts[i].w});
      return { score: right?1:0, lines:lines, escape:null, summary: right ? "Contained" : "Mishandled" };
    }
  }
  return { score:0, lines:[], escape:null, summary:"" };
}

function submit(itemId, resp){
  var item = findItem(itemId);
  if (!item || item.done) return null;
  var res = grade(item, resp);
  item.done = true; item.result = res; item.resp = resp; item.doneDay = S.day;

  var before = { integrity:S.meters.integrity, schedule:S.meters.schedule, confidence:S.meters.confidence, audit:S.meters.audit };

  if (S.mode === "drill"){
    S.stats.drillN++; if (res.score >= 0.999) S.stats.drillHit++;
    S.stats.done++;
    if (S.stats.streak === undefined) S.stats.streak = 0;
    if (res.score >= 0.999){ S.stats.streak++; if (S.stats.streak > S.stats.bestStreak) S.stats.bestStreak = S.stats.streak; }
    else S.stats.streak = 0;
    S.queue.push(makeItem(pickDrillKind()));
    if (S.queue.length > 60) S.queue = S.queue.slice(S.queue.length - 40);
    ST().formClear();
    save();
    return res;
  }

  // meters
  var w = WEIGHTS[item.kind] || {};
  for (var k in w) S.meters[k] += (res.score - 0.62) * w[k] * 1.9;
  if (item.kind === "event" || item.kind === "escape"){
    var m = res.eventMeters || { integrity:4, confidence:3 };
    var sign = res.score >= 0.999 ? 1 : -1;
    for (var mk in m) S.meters[mk] += sign * m[mk] * 0.85;
  }
  if (res.late) S.meters.schedule -= 6;

  // hours
  S.hours -= item.hours;
  if (S.hours < 0){ S.overtime += -S.hours; S.hours = 0; }

  // xp
  var gained = Math.round(KIND[item.kind].xp * (0.35 + res.score * 0.9));
  S.xp += gained; res.xp = gained;

  // streaks and stats
  S.stats.done++;
  if (res.score >= 0.999){ S.stats.perfect++; S.stats.streak++; if (S.stats.streak > S.stats.bestStreak) S.stats.bestStreak = S.stats.streak; }
  else S.stats.streak = 0;
  if (item.kind === "release"){
    var real = item.data.defects.length, found = (resp.findings||[]).filter(function(x){ return item.data.defects.indexOf(x)>=0; }).length;
    S.stats.found += found; S.stats.missed += (real - found);
  }

  // escapes
  if (res.escape){
    var r2 = stream("esc");
    S.escapes.push({ label:res.escape.label, doc:res.escape.doc, rev:res.escape.rev, defect:res.escape.defect,
      originDay:S.day, dueDay: S.day + r2.int(4, 14), surfaced:false });
  }

  clampMeters();
  res.deltas = {
    integrity: S.meters.integrity - before.integrity,
    schedule: S.meters.schedule - before.schedule,
    confidence: S.meters.confidence - before.confidence,
    audit: S.meters.audit - before.audit
  };
  checkBadges(item, res);
  ST().formClear();
  S.dayLog.push({ t: res.score >= 0.85 ? "ok" : (res.score >= 0.5 ? "warn" : "bad"),
    text: KIND[item.kind].short + " " + item.title + ": " + res.summary + "." });
  save();
  return res;
}

/* ---------------- badges ---------------- */
var BADGES = {
  firstclean:  { n:"Clean Release", d:"Audited a package with zero misses and zero false calls" },
  hawk:        { n:"Rev Letter Hawk", d:"Caught a revision sequence discrepancy" },
  streak5:     { n:"Five Straight", d:"Five perfect items in a row" },
  streak10:    { n:"Ten Straight", d:"Ten perfect items in a row" },
  noescape:    { n:"Nothing Got Out", d:"Reached day 12 with no escapes" },
  boardclean:  { n:"Clean Board", d:"Every disposition correct in one change control board" },
  auditclean:  { n:"Audit Ready", d:"Called every line correctly in a configuration audit" },
  classhawk:   { n:"Class Act", d:"Correctly classified a change designed to fool you" },
  promoted2:   { n:"E2", d:"Promoted to Configuration Analyst" },
  promoted3:   { n:"E3", d:"Promoted to Senior Configuration Analyst" },
  promoted4:   { n:"E4", d:"Promoted to Staff Configuration Analyst" },
  promoted5:   { n:"E5", d:"Promoted to Senior Staff Configuration Analyst" }
};
function award(k){ if (!S.badges[k]){ S.badges[k] = S.day; if (window.BCUI) BCUI.toast("Badge earned: " + BADGES[k].n, "good"); } }
function checkBadges(item, res){
  if (item.kind === "release" && res.score >= 0.999) award("firstclean");
  if (item.kind === "release" && (item.resp.findings||[]).indexOf("rev-skip") >= 0 && item.data.defects.indexOf("rev-skip") >= 0) award("hawk");
  if (S.stats.streak >= 5) award("streak5");
  if (S.stats.streak >= 10) award("streak10");
  if (item.kind === "ccb" && res.score >= 0.999) award("boardclean");
  if (item.kind === "audit" && res.score >= 0.999) award("auditclean");
  if (item.kind === "ecp" && res.score >= 0.999 && item.data.ch.trap) award("classhawk");
}

/* ---------------- end of day ---------------- */
function endDay(){
  var i, overdue = [], log = S.dayLog.slice();
  var before = { integrity:S.meters.integrity, schedule:S.meters.schedule, confidence:S.meters.confidence, audit:S.meters.audit };
  for (i=0;i<S.queue.length;i++){
    var it = S.queue[i];
    if (!it.done && it.due <= S.day) overdue.push(it);
  }
  for (i=0;i<overdue.length;i++){
    var o = overdue[i];
    S.meters.schedule -= (o.kind === "cdrl" || o.kind === "sdrl") ? 5 : 2.5;
    if (o.kind === "cdrl" || o.kind === "sdrl") S.meters.confidence -= 3;
    if (o.kind === "ccb" || o.kind === "minutes") S.meters.audit -= 3;
  }
  if (S.overtime > 0){ S.meters.schedule += 1; }
  // carry only what is still open; completed items become slim records
  var done = S.queue.filter(function(x){ return x.done; });
  S.history = S.history.concat(done.map(function(x){
    return { id:x.id, kind:x.kind, title:x.title, doneDay:x.doneDay, done:true,
      result:{ score:x.result.score, summary:x.result.summary } };
  }));
  if (S.history.length > 180) S.history = S.history.slice(S.history.length - 180);
  S.queue = S.queue.filter(function(x){ return !x.done; });
  clampMeters();

  var summary = {
    day:S.day, log:log, overdue:overdue.length, overtime:S.overtime,
    completed: done.length,
    deltas:{ integrity:S.meters.integrity-before.integrity, schedule:S.meters.schedule-before.schedule,
             confidence:S.meters.confidence-before.confidence, audit:S.meters.audit-before.audit },
    carry: S.queue.length
  };

  if (S.day >= 12 && S.stats.escapes === 0) award("noescape");

  S.day += 1;
  S.hours = HOURS_PER_DAY; S.overtime = 0; S.dayLog = []; S.activeId = null;
  if (S.boardCooldown > 0) S.boardCooldown--;
  spawnDay();

  // promotion check
  if (S.level < 5 && S.xp >= B.LEVELS[S.level].xp && !S.pendingBoard && S.boardCooldown === 0){
    S.pendingBoard = { to: S.level + 1 };
  }
  save();
  return summary;
}

function takeBoard(answers){
  var to = S.pendingBoard.to, prep = S.pendingBoard.prepared, hits = 0, i;
  var detail = [];
  for (i=0;i<prep.qs.length;i++){
    var ok = answers[i] === prep.qs[i].__a;
    if (ok) hits++;
    detail.push({ ok:ok, q:prep.qs[i].q, right:prep.qs[i].opts[prep.qs[i].__a], w:prep.qs[i].w });
  }
  var pass = hits >= 3;
  S.stats.boards++;
  var total = prep.qs.length;
  if (pass){
    S.level = to;
    award("promoted" + to);
    S.pendingBoard = null;
  } else {
    S.pendingBoard = null; S.boardCooldown = 2;
  }
  save();
  return { pass:pass, hits:hits, total:total, detail:detail, level:S.level };
}

function prepBoard(){
  if (S.pendingBoard && S.pendingBoard.prepared) return S.pendingBoard.prepared;
  var to = S.pendingBoard.to, bd = X.BOARDS[to], r = stream("board" + to);
  var qs = bd.qs.map(function(q){
    var order = r.shuffle([0,1,2,3]);
    return { q:q.q, w:q.w, opts: order.map(function(i){ return q.o[i]; }), __a: order.indexOf(q.a) };
  });
  var prepared = { title:bd.title, panel:bd.panel.map(function(p){ return B.castBy(p); }), qs:qs, to:to };
  S.pendingBoard.prepared = prepared;
  save();
  return prepared;
}

/* ---------------- drill ---------------- */
function pickDrillKind(){
  var r = stream("drill");
  if (S.drillKinds && S.drillKinds.length) return r.pick(S.drillKinds);
  return r.weighted(MIX[S.level]);
}
function fillDrill(){
  while (S.queue.filter(function(x){return !x.done;}).length < 3) S.queue.push(makeItem(pickDrillKind()));
}

/* ---------------- persistence ---------------- */
function save(){
  if (!S) return false;
  return ST().write(ST().activeSlot(), S);
}
function load(slot){
  return ST().read(slot || ST().activeSlot());
}
function wipe(slot){
  var n = slot || ST().activeSlot();
  ST().clear(n);
  ST().formClear();
}

function findItem(id){
  for (var i=0;i<S.queue.length;i++) if (S.queue[i].id === id) return S.queue[i];
  for (var j=0;j<S.history.length;j++) if (S.history[j].id === id) return S.history[j];
  return null;
}

function start(opts){
  if (opts.slot) ST().setActiveSlot(opts.slot);
  ST().formClear();
  S = newState(opts);
  rng = new B.RNG(S.seed);
  if (S.mode === "drill"){ fillDrill(); }
  else spawnDay();
  save();
  return S;
}
function unload(){ S = null; }
function resume(o, slot){
  if (slot) ST().setActiveSlot(slot);
  S = o;
  return S;
}
function state(){ return S; }

window.BCE = {
  KIND:KIND, BADGES:BADGES, HOURS_PER_DAY:HOURS_PER_DAY,
  start:start, resume:resume, unload:unload, state:state, load:load, save:save, wipe:wipe,
  submit:submit, endDay:endDay, findItem:findItem, makeItem:makeItem,
  prepBoard:prepBoard, takeBoard:takeBoard, fillDrill:fillDrill, spawnDay:spawnDay
};
})();
