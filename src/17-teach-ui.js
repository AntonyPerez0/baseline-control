/* ============================================================
   Teach mode: the lesson runner and its screens.
   ============================================================ */
(function(){
"use strict";
var B = window.BC, E = window.BCE, ST = window.BCS, II = window.BCUII,
    C = window.BCTEACHC, R = window.BCR, T1 = window.BCT1, T3 = window.BCT3;
var e = B.esc;

var T = null;              // teach progress and current lesson state

/* ---------------- progress ---------------- */
function fresh(){
  return { v:1, seed:String(Math.floor(Math.random()*1e9)), lesson:C.LESSONS[0].id,
    step:0, phase:null, done:{}, updated:Date.now() };
}
function save(){ if (T) ST.teachWrite(T); }
function load(){ return ST.teachRead(); }

function unlockedThrough(){
  // the furthest lesson you may open: everything done, plus the next one
  var last = -1;
  for (var i=0;i<C.LESSONS.length;i++) if (T.done[C.LESSONS[i].id]) last = i;
  return Math.min(C.LESSONS.length - 1, last + 1);
}
function isUnlocked(id){ return C.lessonIndex(id) <= unlockedThrough(); }
function completion(){
  var n = 0;
  for (var k in T.done) n++;
  return { done:n, total:C.LESSONS.length, pct: Math.round(n / C.LESSONS.length * 100) };
}

/* ---------------- steps in a lesson ---------------- */
function stepsFor(l){
  var st = ["card"];
  if (l.example) st.push("example");
  if (l.practice) st.push("practice");
  if (l.quiz && !(l.check && l.check.kind === "quiz")) st.push("quiz");
  st.push("check");
  st.push("done");
  return st;
}
function currentLesson(){ return C.lessonById(T.lesson) || C.LESSONS[0]; }
function currentStep(){ var s = stepsFor(currentLesson()); return s[Math.min(T.step, s.length-1)]; }

/* ---------------- scenario generation with rejection sampling ----------------
   No generator was changed to support teaching. A lesson asks for a scenario
   with a property and we generate until one turns up, which keeps the teaching
   content and the game content identical by construction.                    */
function want(kind, spec, item){
  if (!spec) return true;
  var d = item.data;
  switch(kind){
    case "release":
      if (spec.clean) return d.defects.length === 0;
      if (spec.defect) return d.defects.indexOf(spec.defect) >= 0;
      if (spec.area) return d.defects.some(function(x){ return R.DEFECTS[x].area === spec.area; });
      if (spec.minDefects) return d.defects.length >= spec.minDefects;
      return d.defects.length > 0;
    case "ecp":
      if (spec.trap) return !!d.ch.trap;
      if (spec.cls) return d.key.cls === spec.cls;
      return true;
    case "ipn": case "variance":
      return spec.key ? d.key === spec.key : true;
    case "audit":
      return spec.type ? d.type === spec.type : true;
    case "csa":
      if (spec.retro) return d.ecns.some(function(x){ return x.retrofit; });
      return true;
    case "ccb":
      return spec.blocker ? d.items.some(function(x){ return x.blocker === spec.blocker; }) : true;
    case "senior":
      return spec.title ? (d.title || "").toLowerCase().indexOf(spec.title) >= 0 : true;
    default: return true;
  }
}
function makeFor(kind, level, spec){
  var S = E.state();
  var prevLevel = S.level;
  S.level = level || 1;
  var item = null;
  for (var i=0;i<80;i++){
    var cand = E.makeItem(kind);
    if (want(kind, spec, cand)){ item = cand; break; }
    if (i === 79) item = cand;
  }
  S.level = prevLevel;
  S.queue.push(item);
  return item;
}

/* the right answer, built from the scenario's own key */
function correctResponse(item){
  var d = item.data, k = item.kind;
  II.resetForm(item);
  var f = II.form();
  if (k === "release"){ f.disposition = d.disposition; d.defects.forEach(function(x){ f.findings[x] = true; }); }
  else if (k === "cdrl" || k === "sdrl"){ f.action = d.action; d.defects.forEach(function(x){ f.findings[x] = true; }); }
  else if (k === "ecp"){ f.cls = String(d.key.cls); f.pri = d.key.pri; f.route = d.key.route; }
  else if (k === "ipn" || k === "variance" || k === "csa") f.pick = d.key;
  else if (k === "audit" || k === "minutes") f.rows = d.rows.map(function(r){ return r.key; });
  else if (k === "gate") f.answers = d.qs.map(function(q){ return q.a; });
  else if (k === "ccb") f.dispositions = d.items.map(function(x){ return x.key; });
  else f.pick = d.opts.findIndex(function(o){ return o.k; });
  return II.collect(item);
}

/* ---------------- hints ---------------- */
var AREA_NAME = { title:"the title block", change:"change control data", approvals:"the approvals",
  related:"the related documents", effectivity:"the effectivity", classification:"the classification",
  did:"the data item description", markings:"the markings", schedule:"the dates", form:"the submittal form",
  resubmittal:"the resubmittal history" };
function hintFor(item, level){
  var d = item.data, k = item.kind;
  if (k === "release" || k === "cdrl" || k === "sdrl"){
    var DEF = (k === "release") ? R.DEFECTS : T1.CDRL_DEF;
    var n = d.defects.length;
    if (level === 1) return n === 0
      ? "Nothing in this one is wrong. The hard part of a clean package is trusting yourself and saying so."
      : "There " + (n === 1 ? "is one discrepancy" : "are " + n + " discrepancies") + " in this one.";
    if (!n) return k === "release"
      ? "Still nothing. Walk the approvals and the effectivity once more, then release it and move on."
      : "Still nothing. Check the markings and the dates once more, then submit it as it stands.";
    var areas = B.uniq(d.defects.map(function(x){ return AREA_NAME[DEF[x].area] || "the package"; }));
    var list = areas.length === 1 ? areas[0] : areas.slice(0,-1).join(", ") + " and " + areas[areas.length-1];
    return "Look in " + list + ". Everything outside " + (areas.length === 1 ? "that" : "those") + " agrees with itself.";
  }
  if (k === "ecp"){
    var yes = d.ch.flags.length;
    if (level === 1) return "Read the impact worksheet before you read the description. The description is the argument, the worksheet is the evidence.";
    return yes === 0
      ? "No trigger in the worksheet is set. So the only question left is whether the description implies one that the originator did not write down."
      : "The worksheet sets " + yes + " trigger" + (yes === 1 ? "" : "s") + " to yes. One is enough.";
  }
  if (k === "ipn") return level === 1
    ? "Ask the question in both directions: can the new item go everywhere the old one went, and can the old one go everywhere the new one goes."
    : "Then ask whether anything still needs the old item. That decides whether the old number survives.";
  if (k === "variance") return level === 1
    ? "Has the article been made yet? That single fact separates a deviation from a waiver."
    : "And if the requirement itself has to change for everything, it is not a variance at all.";
  if (k === "csa") return level === 1
    ? "Take the notices released on or before the date asked. Keep the ones whose effectivity covers the unit. Add retrofit actually worked by then."
    : "Then read off the highest revision among the ones you kept. Do not answer with the current revision.";
  if (k === "audit") return level === 1
    ? "Ask of each line: is this about meeting the requirement, or about matching the drawing?"
    : "A line where nothing departs from the baseline is not a finding, however interesting it is.";
  if (k === "minutes") return level === 1
    ? "An action has a named owner and a time. A decision is the board disposing of something."
    : "Everything else is discussion, and nothing tracks against it.";
  if (k === "ccb") return level === 1
    ? "Look for a nonconcur first. If there is one, it usually decides the disposition on its own."
    : "If nothing is outstanding, the last question is whether the government still has to approve it.";
  if (k === "gate" || k === "quiz") return "No hint on a check question. Work it from the rule.";
  return "Read it twice. The answer is in what is written, not in what you expect.";
}

/* ---------------- phase control ---------------- */
function beginPhase(name){
  var l = currentLesson();
  var spec = name === "example" ? l.example : (name === "practice" ? l.practice : l.check);
  if (name === "quiz" || (name === "check" && l.check.kind === "quiz")){
    var qn = (name === "quiz") ? l.quiz.length : Math.min(l.check.n || l.quiz.length, l.quiz.length);
    T.phase = { name:name, kind:"quiz", n:qn, idx:0, results:[],
      quiz: shuffleQuiz(l.quiz), answer:null, revealed:false };
    save(); return;
  }
  if (!spec){ T.phase = null; save(); return; }
  var item = makeFor(spec.kind, spec.level, spec.want);
  if (name === "example"){
    var resp = correctResponse(item);
    E.gradeOnly(item, resp);
  } else {
    II.resetForm(item);
  }
  T.phase = { name:name, kind:spec.kind, n: spec.n || 1, idx:0, results:[], item:item, hints:0 };
  save();
}
function shuffleQuiz(qs){
  var r = new B.RNG(T.seed + "|" + T.lesson + "|" + Date.now());
  return r.shuffle(qs).map(function(q){
    var order = r.shuffle([0,1,2,3]).filter(function(i){ return i < q.o.length; });
    return { q:q.q, w:q.w, opts: order.map(function(i){ return q.o[i]; }), a: order.indexOf(q.a) };
  });
}
function nextInPhase(){
  var p = T.phase, l = currentLesson();
  p.idx += 1;
  if (p.idx >= p.n){ advanceStep(); return; }
  if (p.kind === "quiz"){ p.answer = null; p.revealed = false; save(); return; }
  var spec = (p.name === "practice") ? l.practice : l.check;
  p.item = makeFor(spec.kind, spec.level, spec.want);
  II.resetForm(p.item);
  p.hints = 0;
  save();
}
function advanceStep(){
  var l = currentLesson(), steps = stepsFor(l);
  var name = steps[T.step];
  if (name === "check"){
    var score = T.phase.results.length ? B.sum(T.phase.results) / T.phase.results.length : 0;
    var need = l.check.pass || 0.7;
    if (score + 0.0001 < need){
      T.phase = { name:"retry", score:score, need:need };
      save(); return;
    }
    var prev = T.done[l.id];
    T.done[l.id] = { score: Math.max(score, prev ? prev.score : 0), at: Date.now() };
    T.step = steps.indexOf("done");
    T.phase = null;
    save(); return;
  }
  T.step = Math.min(T.step + 1, steps.length - 1);
  T.phase = null;
  var nx = steps[T.step];
  if (nx === "example" || nx === "practice" || nx === "quiz" || nx === "check") beginPhase(nx);
  save();
}
function retryCheck(){ T.phase = null; beginPhase("check"); save(); }
function extraPractice(){ T.step = stepsFor(currentLesson()).indexOf("practice"); beginPhase("practice"); save(); }

function openLesson(id){
  if (!isUnlocked(id)) return false;
  T.lesson = id; T.step = 0; T.phase = null;
  save();
  return true;
}
function nextLesson(){
  var i = C.lessonIndex(T.lesson);
  if (i + 1 < C.LESSONS.length){ T.lesson = C.LESSONS[i+1].id; T.step = 0; T.phase = null; save(); return true; }
  return false;
}

/* ---------------- rendering ---------------- */
function stepDots(){
  var l = currentLesson(), steps = stepsFor(l), h = '<div class="dots">';
  var names = { card:"Read", example:"Worked example", practice:"Practice", quiz:"Questions", check:"Check", done:"Done" };
  for (var i=0;i<steps.length;i++){
    var st = i < T.step ? "past" : (i === T.step ? "now" : "next");
    h += '<span class="dot ' + st + '">' + e(names[steps[i]]) + '</span>';
  }
  return h + '</div>';
}
function lessonHeader(){
  var l = currentLesson();
  return '<div class="tb"><h2>' + e(l.title) + '</h2>' +
    '<span class="chip">' + e(l.module.title) + '</span>' +
    '<span class="chip info">' + e(l.module.tier) + '</span>' +
    '<button class="btn sm" data-act="tsyllabus" style="margin-left:auto">Syllabus</button></div>';
}

function renderCard(){
  var l = currentLesson(), h = lessonHeader() + '<div class="pad doc">';
  for (var i=0;i<l.card.length;i++) h += '<p>' + e(l.card[i]) + '</p>';
  h += '<div class="row end" style="margin-top:16px"><button class="btn pri" data-act="tnext">' +
    (l.example ? "Show me one" : (l.practice || l.quiz ? "Let me try" : "Check")) + '</button></div>';
  return h + '</div>';
}

function annotations(item){
  var d = item.data, k = item.kind, DEF = null;
  if (k === "release") DEF = R.DEFECTS;
  if (k === "cdrl" || k === "sdrl") DEF = T1.CDRL_DEF;
  if (!DEF) return "";
  var h = '<div class="annot"><div class="lbl">Where each one lives</div>';
  if (!d.defects.length){
    h += '<p style="margin:6px 0 0;font-size:13.5px">Nothing is wrong with this package. Every field agrees with the program context, the approvals are complete and the classification matches the worksheet. Clean packages are about one in eight, and calling one dirty costs the originator a cycle.</p>';
  } else {
    h += '<ol style="margin:8px 0 0;padding-left:20px">';
    for (var i=0;i<d.defects.length;i++){
      var def = DEF[d.defects[i]];
      h += '<li style="margin-bottom:9px;font-size:13.5px"><strong>' + e(def.label) + '</strong>' +
        '<div class="mut" style="font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;margin:2px 0">' + e(def.where || "") + '</div>' +
        e(def.why) + '</li>';
    }
    h += '</ol>';
  }
  return h + '</div>';
}

function renderExample(){
  var p = T.phase, l = currentLesson();
  var h = lessonHeader() + '<div class="pad doc">';
  h += '<div class="infobox" style="margin-bottom:14px"><strong>Worked example.</strong> This one is already answered. Read the scenario first, then the annotations, then the result at the bottom. Nothing here is graded.</div>';
  h += annotations(p.item);
  h += '<div style="margin-top:14px">' + II.render(p.item, true) + '</div>';
  h += resultOf(p.item);
  h += '<div class="row end" style="margin-top:16px"><button class="btn pri" data-act="tnext">' +
    (l.practice || l.quiz ? "Now let me try" : "Go to the check") + '</button></div>';
  return h + '</div>';
}

function resultOf(item){
  var r = item.result;
  if (!r) return "";
  var h = '<div class="res"><div class="rh"><div><div class="lbl">Why that is the answer</div></div></div><ul>';
  for (var i=0;i<r.lines.length;i++){
    var line = r.lines[i];
    var cls = line.t === "ok" ? "li-ok" : line.t === "bad" ? "li-bad" : line.t === "warn" ? "li-warn" : "li-n";
    h += '<li class="' + cls + '"><span class="tag">' + e(line.tag || line.t) + '</span><span style="color:var(--ink)">' + e(line.text) + '</span></li>';
  }
  return h + '</ul></div>';
}

function renderQuizPhase(){
  var p = T.phase, q = p.quiz[p.idx];
  var h = lessonHeader() + '<div class="pad doc">';
  h += '<div class="spread" style="margin-bottom:12px"><div class="lbl">' +
    (p.name === "check" ? "Check" : "Practice") + ' ' + (p.idx + 1) + ' of ' + p.n + '</div></div>';
  h += '<div style="border:1px solid var(--rule);background:var(--panel);padding:12px">';
  h += '<div style="font-weight:500;margin-bottom:9px">' + e(q.q) + '</div><div class="opts">';
  for (var j=0;j<q.opts.length;j++){
    var sel = p.answer === j;
    var mk = p.revealed ? (j === q.a ? { s:"right", k:"r", t:"correct" } : (sel ? { s:"wrong", k:"w", t:"your answer" } : null)) : null;
    h += '<label class="opt' + (p.revealed ? " dis" : "") + '"' + (mk ? ' data-state="' + mk.s + '"' : "") + '>' +
      '<input type="radio" name="tq" ' + (sel ? "checked" : "") + (p.revealed ? " disabled" : "") +
      ' data-act="tquiz" data-idx="' + j + '">' +
      '<span style="flex:1;min-width:0"><span class="ot">' + e(q.opts[j]) + '</span></span>' +
      (mk ? '<span class="verd ' + mk.k + '">' + mk.t + '</span>' : "") + '</label>';
  }
  h += '</div>';
  if (p.revealed) h += '<div class="' + (p.results[p.idx] ? "okbox" : "warnbox") + '" style="margin-top:10px">' + e(q.w) + '</div>';
  h += '</div>';
  h += '<div class="row end" style="margin-top:14px">';
  if (!p.revealed) h += '<button class="btn pri" data-act="tquizsub"' + (p.answer === null ? " disabled" : "") + '>Answer</button>';
  else h += '<button class="btn pri" data-act="tnextitem">' + (p.idx + 1 >= p.n ? "Finish" : "Next question") + '</button>';
  h += '</div>';
  return h + '</div>';
}

function renderItemPhase(){
  var p = T.phase, l = currentLesson();
  if (p.kind === "quiz") return renderQuizPhase();
  var item = p.item, done = item.done;
  var h = lessonHeader() + '<div class="pad doc">';
  h += '<div class="spread" style="margin-bottom:12px">' +
    '<div class="lbl">' + (p.name === "check" ? "Check" : "Practice") + ' ' + (p.idx + 1) + ' of ' + p.n + '</div>';
  if (p.name === "practice" && !done) h += '<button class="btn sm" data-act="thint">Hint</button>';
  h += '</div>';
  if (p.name === "check") h += '<p class="mut" style="font-size:13px;margin-top:0">No hints on the check. You need ' +
    Math.round((l.check.pass || 0.7) * 100) + '% across ' + p.n + ' to finish the lesson.</p>';
  for (var i=0;i<(p.hints||0);i++)
    h += '<div class="infobox" style="margin-bottom:9px">' + e(hintFor(item, i + 1)) + '</div>';
  h += II.render(item, done);
  if (done){
    h += resultOf(item);
    h += '<div class="row end" style="margin-top:14px"><button class="btn pri" data-act="tnextitem">' +
      (p.idx + 1 >= p.n ? "Finish" : "Next one") + '</button></div>';
  }
  return h + '</div>';
}

function renderRetry(){
  var p = T.phase, l = currentLesson();
  var h = lessonHeader() + '<div class="pad doc">';
  h += '<div class="warnbox" style="margin-bottom:12px"><strong>Not through yet.</strong> ' +
    Math.round(p.score * 100) + '% against ' + Math.round(p.need * 100) + '% needed. Nothing is lost, and the scenarios are generated fresh each time.</div>';
  h += '<p>Two ways forward. Take more practice with hints, which is what most people need, or go straight back to the check.</p>';
  h += '<div class="row" style="margin-top:14px"><button class="btn pri" data-act="tpractice">More practice</button>' +
    '<button class="btn" data-act="tretry">Retake the check</button>' +
    '<button class="btn" data-act="treread">Read the card again</button></div>';
  return h + '</div>';
}

function renderDone(){
  var l = currentLesson(), d = T.done[l.id], i = C.lessonIndex(l.id);
  var nxt = i + 1 < C.LESSONS.length ? C.LESSONS[i+1] : null;
  var c = completion();
  var h = lessonHeader() + '<div class="pad doc">';
  h += '<div class="row" style="margin-bottom:14px"><span class="stamp ok stamp-in">Complete</span>' +
    '<div><div class="lbl">Score</div><div class="disp" style="font-size:26px;font-weight:700">' + Math.round((d ? d.score : 1) * 100) + '%</div></div></div>';
  h += '<h3>Walk away with</h3><ul style="padding-left:20px;margin:0 0 14px">';
  for (var k=0;k<l.keys.length;k++) h += '<li style="margin-bottom:6px">' + e(l.keys[k]) + '</li>';
  h += '</ul>';
  h += '<div class="infobox">' + c.done + ' of ' + c.total + ' lessons complete.</div>';
  h += '<div class="row end" style="margin-top:16px"><button class="btn" data-act="tsyllabus">Syllabus</button>';
  if (nxt) h += '<button class="btn pri" data-act="tnextlesson">Next: ' + e(nxt.title) + '</button>';
  else h += '<button class="btn pri" data-act="tsyllabus">You have finished the course</button>';
  h += '</div>';
  return h + '</div>';
}

function renderLesson(){
  var st = currentStep();
  var body;
  if (T.phase && T.phase.name === "retry") body = renderRetry();
  else if (st === "card") body = renderCard();
  else if (st === "example") body = T.phase && T.phase.item ? renderExample() : (beginPhase("example"), renderExample());
  else if (st === "practice" || st === "quiz" || st === "check") body = (T.phase && (T.phase.item || T.phase.quiz)) ? renderItemPhase() : (beginPhase(st), renderItemPhase());
  else body = renderDone();
  return '<div class="teachwrap">' + stepDots() + '<div class="sheet">' + body + '</div></div>';
}

function renderSyllabus(){
  var c = completion();
  var h = '<div class="teachwrap"><div class="sheet"><div class="tb"><h2>Syllabus</h2>' +
    '<span class="chip">' + c.done + ' of ' + c.total + ' complete</span>' +
    '<div class="bar ' + (c.pct >= 66 ? "ok" : c.pct >= 33 ? "warn" : "") + '" style="flex:1 1 120px;max-width:220px;margin-left:auto"><i style="width:' + c.pct + '%"></i></div>' +
    '</div><div class="pad">';
  h += '<p class="mut" style="font-size:13.5px;margin-top:0">Thirty five lessons. Each one is a short card, a worked example with the answer already on it, practice with hints, then a check that unlocks the next. Progress is saved separately from your careers.</p>';
  var upto = unlockedThrough();
  for (var m=0;m<C.MODULES.length;m++){
    var mod = C.MODULES[m];
    h += '<div class="modblock"><div class="modhead"><span class="modn">' + (m+1) + '</span>' +
      '<span class="modt">' + e(mod.title) + '</span><span class="chip">' + e(mod.tier) + '</span></div>';
    for (var i=0;i<mod.lessons.length;i++){
      var l = mod.lessons[i], idx = C.lessonIndex(l.id);
      var done = T.done[l.id], locked = idx > upto, cur = (l.id === T.lesson);
      h += '<button class="lrow' + (locked ? " locked" : "") + '" ' + (locked ? "disabled" : "") +
        ' data-act="topen" data-id="' + e(l.id) + '" aria-current="' + (cur ? "true" : "false") + '">' +
        '<span class="lnum">' + e(l.id) + '</span>' +
        '<span class="lt">' + e(l.title) + '</span>' +
        '<span class="lstate">' + (done ? '<span style="color:var(--ok)">' + Math.round(done.score*100) + '%</span>'
          : locked ? '<span class="mut">locked</span>' : '<span style="color:var(--stamp)">start</span>') + '</span></button>';
    }
    h += '</div>';
  }
  h += '<div class="row end" style="margin-top:16px"><button class="btn dngr" data-act="treset">Reset all progress</button></div>';
  return h + '</div></div></div>';
}

function render(){
  if (!T) return '<div class="empty">Teach mode is not running.</div>';
  return window.BCUI.U.screen === "syllabus" ? renderSyllabus() : renderLesson();
}

/* ---------------- top bar for teach mode ---------------- */
function topStats(){
  var c = completion(), l = currentLesson();
  return { pct:c.pct, done:c.done, total:c.total, lesson:l.id, title:l.title, module:l.module.title };
}

/* ---------------- lifecycle ---------------- */
function start(reset){
  var loaded = reset ? null : load();
  T = loaded || fresh();
  ST.setLastMode("teach");
  E.start({ mode:"teach", progKey: "AUR", level:1, name:"Teach", slot: ST.activeSlot() });
  var S = E.state();
  S.seed = T.seed;
  save();
  return T;
}
function resumeIfAny(){
  var loaded = load();
  if (!loaded) return false;
  T = loaded;
  E.start({ mode:"teach", progKey:"AUR", level:1, name:"Teach", slot: ST.activeSlot() });
  E.state().seed = T.seed;
  // a phase holding a generated item cannot survive, so rebuild it
  if (T.phase && ["example","practice","quiz","check"].indexOf(T.phase.name) >= 0){
    var keepIdx = T.phase.idx, keepResults = T.phase.results || [];
    beginPhase(T.phase.name);
    if (T.phase){ T.phase.idx = Math.min(keepIdx, T.phase.n - 1); T.phase.results = keepResults; }
  }
  return true;
}
function progress(){ return T; }

/* ---------------- actions ---------------- */
function act(name, el){
  var UI = window.BCUI;
  switch(name){
    case "tnext": advanceStep(); UI.render(); return true;
    case "tsyllabus": UI.U.screen = "syllabus"; UI.render(); return true;
    case "tlesson": UI.U.screen = "desk"; UI.render(); return true;
    case "topen": {
      var id = el.getAttribute("data-id");
      if (openLesson(id)){ UI.U.screen = "desk"; UI.render(); }
      return true;
    }
    case "thint": T.phase.hints = Math.min(2, (T.phase.hints || 0) + 1); save(); UI.render(); return true;
    case "tquiz": T.phase.answer = parseInt(el.getAttribute("data-idx"), 10); save(); UI.render(); return true;
    case "tquizsub": {
      var p = T.phase, q = p.quiz[p.idx];
      p.results[p.idx] = (p.answer === q.a) ? 1 : 0;
      p.revealed = true; save(); UI.render(); return true;
    }
    case "tsubmit": {
      var p2 = T.phase, item = p2.item;
      if (!item || item.done) return true;
      var resp = II.collect(item);
      var res = E.gradeOnly(item, resp);
      p2.results[p2.idx] = res.score;
      save(); UI.render(); return true;
    }
    case "tnextitem": nextInPhase(); UI.render(); return true;
    case "tretry": retryCheck(); UI.render(); return true;
    case "tpractice": extraPractice(); UI.render(); return true;
    case "treread": T.step = 0; T.phase = null; save(); UI.render(); return true;
    case "tnextlesson": nextLesson(); UI.U.screen = "desk"; UI.render(); return true;
    case "treset": {
      if (!confirm("Reset every lesson and start the course from the beginning?")) return true;
      ST.teachClear(); T = fresh(); save(); UI.U.screen = "desk"; UI.render(); return true;
    }
  }
  return false;
}

window.BCTEACH = { start:start, resumeIfAny:resumeIfAny, render:render, act:act,
  progress:progress, topStats:topStats, completion:completion, currentLesson:currentLesson,
  hintFor:hintFor, correctResponse:correctResponse, makeFor:makeFor, stepsFor:stepsFor,
  advanceStep:advanceStep, beginPhase:beginPhase, openLesson:openLesson, isUnlocked:isUnlocked };
})();
