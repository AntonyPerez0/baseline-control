/* ============================================================
   Shell, navigation, and everything that is not a work surface.
   ============================================================ */
(function(){
"use strict";
var B = window.BC, E = window.BCE, X = window.BCX, II = window.BCUII, ST = window.BCS;
var e = B.esc;

var U = { screen:"desk", railOpen:true, modal:null, codexQ:"", lastResult:null,
  splash:{ mode:"career", prog:"AUR", level:1, kinds:{}, slot:0 } };

/* ---------------- toasts ---------------- */
function toast(msg, kind){
  var host = B.el("toasts");
  if (!host) return;
  while (host.children && host.children.length >= 3) host.removeChild(host.firstChild);
  var t = document.createElement("div");
  t.className = "toast" + (kind ? " " + kind : "");
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(function(){ t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(function(){ t.remove(); }, 320); }, 2600);
}

/* ---------------- topbar ---------------- */
function meter(k, label, v){
  var cls = v >= 70 ? "ok" : (v >= 45 ? "warn" : "crit");
  return '<div class="meter"><div class="mk">' + e(label) + '</div><div class="mv">' + v + '</div>' +
    '<div class="bar ' + cls + '"><i style="width:' + v + '%"></i></div></div>';
}
function mark(){
  return '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">' +
    '<rect x="2.5" y="2.5" width="27" height="27"/><rect x="6.5" y="6.5" width="19" height="19" stroke-dasharray="2 2.2"/>' +
    '<path d="M11 21 L16 10 L21 21" /><path d="M13 17.5 h6"/></svg>';
}
function renderTop(){
  var S = E.state(), bar = B.el("topbar");
  if (!S || !S.started){ bar.hidden = true; return; }
  bar.hidden = false;
  var L = B.LEVELS[S.level-1];
  var nextXp = S.level < 5 ? B.LEVELS[S.level].xp : null;
  var h = '<div class="wrap"><div class="topgrid">';
  h += '<button class="brandcell" data-act="menu" title="Back to the main menu">' + mark() +
       '<span><span class="nm">Baseline Control</span>' +
       '<span class="sub">' + (S.mode === "teach" ? "Teach mode" : e(S.world.prog.name) + ' &middot; ' + e(L.code) + " " + e(L.title)) + '</span></span></button>';
  if (S.mode === "teach"){
    var ts = window.BCTEACH ? window.BCTEACH.topStats() : { pct:0, done:0, total:0, lesson:"", title:"", module:"" };
    h += '<div class="metercell">' +
      '<div class="meter" style="flex:2 1 200px"><div class="mk">' + e(ts.module) + '</div>' +
      '<div class="mv" style="font-family:\'Saira Condensed\',sans-serif;font-size:15px">' + e(ts.lesson + "  " + ts.title) + '</div></div>' +
      '<div class="meter"><div class="mk">Course</div><div class="mv">' + ts.done + '/' + ts.total + '</div>' +
      '<div class="bar ' + (ts.pct>=66?"ok":ts.pct>=33?"warn":"") + '"><i style="width:' + ts.pct + '%"></i></div></div>' +
      '</div>';
    h += '<div class="clockcell"><div><div class="lbl">Mode</div><div class="big">Teach</div></div></div>';
  } else if (S.mode === "career"){
    h += '<div class="metercell">' +
      meter("integrity","Baseline", S.meters.integrity) +
      meter("schedule","Schedule", S.meters.schedule) +
      meter("confidence","Customer", S.meters.confidence) +
      meter("audit","Audit", S.meters.audit) + '</div>';
    h += '<div class="clockcell"><div><div class="lbl">' + e(B.dayName(S.day)) + ' &middot; week ' + B.weekOf(S.day) + '</div>' +
      '<div class="big">' + e(B.dateOf(S.day)) + '</div></div>' +
      '<div><div class="lbl">Hours left</div><div class="big">' + S.hours + (S.overtime ? '<span style="font-size:12px;color:var(--crit)"> +' + S.overtime + ' OT</span>' : "") + '</div></div>' +
      '<div><div class="lbl">Experience</div><div class="big">' + S.xp + (nextXp ? '<span style="font-size:12px;color:var(--ink-3)"> / ' + nextXp + '</span>' : "") + '</div></div>' +
      '</div>';
  } else {
    var acc = S.stats.drillN ? Math.round(S.stats.drillHit / S.stats.drillN * 100) : 0;
    h += '<div class="metercell"><div class="meter"><div class="mk">Drill accuracy</div><div class="mv">' + acc + '%</div>' +
      '<div class="bar ' + (acc>=80?"ok":acc>=55?"warn":"crit") + '"><i style="width:' + acc + '%"></i></div></div>' +
      '<div class="meter"><div class="mk">Answered</div><div class="mv">' + S.stats.drillN + '</div></div>' +
      '<div class="meter"><div class="mk">Best streak</div><div class="mv">' + S.stats.bestStreak + '</div></div></div>';
    h += '<div class="clockcell"><div><div class="lbl">Mode</div><div class="big">Drill</div></div></div>';
  }
  h += '</div>';
  var open = S.queue.filter(function(x){ return !x.done; }).length;
  h += '<nav class="nav">';
  h += navbtn("desk", S.mode === "career" ? "Desk" : (S.mode === "teach" ? "Lesson" : "Drill"), S.mode === "teach" ? 0 : open);
  if (S.mode === "teach") h += navbtn("syllabus", "Syllabus", 0);
  else h += navbtn("record", "Record", 0);
  h += navbtn("codex", "Codex", 0);
  h += '<button data-act="help">How this works</button>';
  h += '<button data-act="theme" title="Switch between the vellum and blueprint themes">Theme</button>';
  h += '<button data-act="menu" title="Career, drill and teach all live on the main menu">Main menu</button>';
  h += '<span class="savetag" title="Progress is written to this browser after every item">' +
       (ST.available() ? e(ST.sinceText() || "autosave on") : "not saving") + '</span>';
  if (S.mode === "career") h += '<button data-act="endday" style="margin-left:auto;color:var(--stamp)">End the day</button>';
  else h += '<button data-act="menu" style="margin-left:auto">' + (S.mode === "teach" ? "Leave teach mode" : "Leave drill") + '</button>';
  h += '</nav></div>';
  bar.innerHTML = h;
}
function navbtn(id, label, cnt){
  return '<button data-act="nav" data-screen="' + id + '" aria-current="' + (U.screen===id) + '">' + e(label) +
    (cnt ? '<span class="cnt">' + cnt + '</span>' : "") + '</button>';
}

/* ---------------- splash ---------------- */
function renderSplash(){
  B.el("topbar").hidden = true;
  var saved = E.load();
  var h = '<div class="splash" style="padding-top:18px">';
  h += '<div class="sheet hero">';
  h += '<div class="kicker">Configuration and data management &middot; training simulator</div>';
  h += '<h1>Baseline<br>Control</h1>';
  h += '<p class="lede">You are a configuration analyst at Meridian Aerospace Systems, National Security Space, in Sunnyvale. Change packages arrive faster than you can read them, the board meets Wednesday, and the vault will accept whatever you release. Forever.</p>';
  h += '<p class="lede mut" style="font-size:14px">Everything in here is generated, so it does not run out. The standards, the vocabulary and the rules are real: ANSI and SAE EIA-649, Class I and Class II, form fit and function, CDRL and SDRL, FCA and PCA. The company, the programs and the people are invented.</p>';
  h += '</div>';

  if (!ST.available()){
    h += '<div class="sheet" style="margin-top:14px"><div class="pad"><div class="critbox">' +
      e(ST.reason()) + ' You can still play, and you can copy your save out from the Record screen before you close the tab.</div></div></div>';
  }
  var tsum = ST.teachSummary();
  if (tsum){
    h += '<div class="sheet" style="margin-top:14px"><div class="tb"><h2>Course in progress</h2>' +
      '<span class="chip ok">' + tsum.lessons + ' of ' + (window.BCTEACHC ? window.BCTEACHC.LESSONS.length : 35) + ' lessons</span>' +
      '<button class="btn sm pri" data-act="tresume" style="margin-left:auto">Continue learning</button></div></div>';
  }
  var slots = ST.listSlots(), anySaved = slots.some(function(x){ return !x.empty; });
  if (anySaved){
    h += '<div class="sheet" style="margin-top:14px"><div class="tb"><h2>Saved careers</h2>' +
      '<span class="chip">' + slots.filter(function(x){return !x.empty;}).length + ' of ' + ST.SLOTS + ' slots used</span>' +
      '<button class="btn sm" data-act="import" style="margin-left:auto">Import a save</button></div><div class="pad">' +
      slotList(slots, 0) + '</div></div>';
  }

  h += '<div class="sheet" style="margin-top:14px"><div class="tb"><h2>Start</h2></div><div class="pad">';
  h += '<div class="lbl">Mode</div><div class="tiers" style="margin:7px 0 16px">';
  h += tier("teach", "Teach", "Start here", "Thirty five lessons that build the whole job from nothing. A card, a worked example with the answer on it, practice with hints, then a check.", U.splash.mode==="teach");
  h += tier("career", "Career", "E1 to E5", "Ten hour days on a four by ten week. Meters, promotions, and mistakes that come back.", U.splash.mode==="career");
  h += tier("drill", "Drill", "Any tier", "No clock, no consequences. Endless scenarios at the tier you pick, graded instantly.", U.splash.mode==="drill");
  h += '</div>';

  if (U.splash.mode === "teach"){
    h += '<div class="infobox" style="margin:6px 0 14px">Teach mode keeps its own progress, separate from your career slots, so nothing you learn is lost by starting a new career.</div>';
    h += '<div class="row end" style="margin-top:14px"><button class="btn" data-act="help">How this works</button>' +
         '<button class="btn pri" data-act="tbegin">Start the course</button></div></div></div>';
    h += '<p class="mut" style="font-size:12.5px;margin:16px 2px 0;max-width:70ch">Meridian Aerospace Systems and every program, person and supplier in this simulator are fictional. The standards and the vocabulary are real.</p></div>';
    B.el("view").innerHTML = h;
    return;
  }
  h += '<div class="lbl">Program</div><div class="tiers" style="margin:7px 0 16px">';
  for (var i=0;i<B.PROGRAMS.length;i++){
    var p = B.PROGRAMS[i];
    h += '<button class="tier" data-act="prog" data-key="' + e(p.key) + '" aria-pressed="' + (U.splash.prog===p.key) + '">' +
      '<div class="tn">' + e(p.name) + '</div><div class="tl">' + e(p.customer) + '</div>' +
      '<div class="ts">' + e(p.blurb) + '</div></button>';
  }
  h += '</div>';

  if (U.splash.mode === "drill"){
    h += '<div class="lbl">Tier</div><div class="tiers" style="margin:7px 0 16px">';
    for (var j=0;j<B.LEVELS.length;j++){
      var L2 = B.LEVELS[j];
      h += '<button class="tier" data-act="lvl" data-lvl="' + (j+1) + '" aria-pressed="' + (U.splash.level===j+1) + '">' +
        '<div class="tn">' + e(L2.code) + '</div><div class="tl">' + e(L2.title) + '</div>' +
        '<div class="ts">' + e(L2.scope) + '</div></button>';
    }
    h += '</div>';
    h += '<div class="lbl">Narrow the drill (optional)</div><div class="row" style="margin:8px 0 4px">';
    var kinds = [["release","Release audits"],["ecp","Classification"],["ipn","Part numbering"],["variance","Deviation or waiver"],
      ["cdrl","CDRL review"],["csa","Status accounting"],["audit","FCA and PCA"],["gate","Baselines"],["minutes","Minutes"],["ccb","Boards"],["senior","Staff decisions"]];
    for (var k=0;k<kinds.length;k++){
      var on = !!U.splash.kinds[kinds[k][0]];
      h += '<button class="btn sm" data-act="kind" data-kind="' + kinds[k][0] + '"' +
        (on ? ' style="background:var(--ink);color:var(--btn-ink);border-color:var(--ink)"' : "") + '>' + e(kinds[k][1]) + '</button>';
    }
    h += '</div><div class="hint">Leave all off for the full mix at that tier.</div>';
  }

  var target = U.splash.slot || ST.firstFree();
  h += '<div class="lbl">Save slot</div><div class="row" style="margin:8px 0 4px">';
  for (var sn=1; sn<=ST.SLOTS; sn++){
    var sm = slots[sn-1], on2 = (target === sn);
    h += '<button class="btn sm" data-act="pickslot" data-slot="' + sn + '"' +
      (on2 ? ' style="background:var(--ink);color:var(--btn-ink);border-color:var(--ink)"' : "") + '>' +
      sn + (sm.empty ? "" : " &middot; in use") + '</button>';
  }
  h += '</div>';
  if (target && !slots[target-1].empty)
    h += '<div class="warnbox" style="margin-top:8px">Slot ' + target + ' already holds ' + e(slots[target-1].name || "a career") + '. Starting here overwrites it. Export it first if you want to keep it.</div>';
  if (!target)
    h += '<div class="warnbox" style="margin-top:8px">All five slots are in use. Pick one above to overwrite, or delete one from the list.</div>';
  h += '<div class="row end" style="margin-top:18px"><button class="btn" data-act="help">How this works</button>' +
       '<button class="btn pri" data-act="begin"' + (target ? "" : " disabled") + '>' + (U.splash.mode==="career" ? "Report for work" : "Start drilling") + '</button></div>';
  h += '</div></div>';
  h += '<p class="mut" style="font-size:12.5px;margin:16px 2px 0;max-width:70ch">Meridian Aerospace Systems and every program, person and supplier in this simulator are fictional. Salary bands shown on the record screen are the published ranges for the real role tiers this was modeled on. Data item description numbers follow the real format and several are drawn from real DIDs, but treat the specific numbers here as representative rather than authoritative.</p>';
  h += '</div>';
  B.el("view").innerHTML = h;
}
function ago(ms){
  if (!ms) return "never";
  var s = Math.round((Date.now() - ms)/1000);
  if (s < 90) return "just now";
  var m = Math.round(s/60); if (m < 60) return m + " min ago";
  var hr = Math.round(m/60); if (hr < 36) return hr + " hr ago";
  return Math.round(hr/24) + " days ago";
}
function slotList(slots, mode){
  var h = '<div class="slots">';
  for (var i=0;i<slots.length;i++){
    var m = slots[i];
    var cur = mode === 1 && m.n === ST.activeSlot();
    h += '<div class="slot' + (m.empty ? " vacant" : "") + '" aria-current="' + (cur?"true":"false") + '">';
    h += '<div class="sn">slot ' + m.n + '</div><div class="sbody">';
    if (m.empty){
      h += '<div class="stitle">Empty</div><div class="smeta">Nothing saved here</div>';
    } else if (m.tooNew){
      h += '<div class="stitle">Newer save</div><div class="smeta">Written by a newer version. Reload the page to update, then it will open.</div>';
    } else {
      var L = B.LEVELS[(m.level||1)-1];
      h += '<div class="stitle">' + e(m.name) + '</div>';
      h += '<div class="smeta">' + e(L.code) + ' ' + e(m.mode === "drill" ? "drill" : L.title) +
        ' &middot; day ' + m.day + ' &middot; ' + m.xp + ' xp &middot; baseline ' + m.integrity +
        (m.escapes ? ' &middot; ' + m.escapes + ' escapes' : '') + '</div>';
      h += '<div class="smeta">' + e(ago(m.updated)) + ' &middot; ' + Math.max(1, Math.round(m.bytes/1024)) + ' KB</div>';
    }
    h += '</div><div class="sacts">';
    if (m.empty){
      if (mode === 1) h += '<button class="btn sm" data-act="importinto" data-slot="' + m.n + '">Import here</button>';
      else h += '<button class="btn sm" data-act="newhere" data-slot="' + m.n + '">Start here</button>';
    } else if (m.tooNew){
      h += '<button class="btn sm dngr" data-act="delslot" data-slot="' + m.n + '">Delete</button>';
    } else {
      h += '<button class="btn sm pri" data-act="loadslot" data-slot="' + m.n + '">' + (cur ? "Current" : "Open") + '</button>';
      h += '<button class="btn sm" data-act="renameslot" data-slot="' + m.n + '">Rename</button>';
      h += '<button class="btn sm" data-act="export" data-slot="' + m.n + '">Export</button>';
      h += '<button class="btn sm dngr" data-act="delslot" data-slot="' + m.n + '">Delete</button>';
    }
    h += '</div></div>';
  }
  return h + '</div>';
}
function tier(id, name, sub, desc, on){
  return '<button class="tier" data-act="mode" data-mode="' + id + '" aria-pressed="' + on + '">' +
    '<div class="tn">' + e(name) + '</div><div class="tl">' + e(sub) + '</div><div class="ts">' + e(desc) + '</div></button>';
}

/* ---------------- queue rail ---------------- */
function dueChip(it, day){
  if (it.done) return '<span class="due">done</span>';
  var d = it.due - day;
  var cls = d < 0 ? "late" : (d === 0 ? "soon" : "");
  var txt = d < 0 ? (-d) + "d late" : (d === 0 ? "due today" : "due in " + d + "d");
  return '<span class="due ' + cls + '">' + txt + '</span>';
}
function renderRail(){
  var S = E.state();
  var items = S.queue.slice().sort(function(a,b){
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.due - b.due;
  });
  var open = items.filter(function(x){ return !x.done; }).length;
  var h = '<div class="sheet rail"><div class="tb"><h3>' + (S.mode==="career" ? "Inbox" : "Queue") + '</h3>' +
    '<span class="chip">' + open + ' open</span>' +
    '<button class="xbtn" data-act="rail" aria-label="Toggle queue" style="margin-left:auto">' + (U.railOpen ? "&minus;" : "+") + '</button></div>';
  if (U.railOpen){
    h += '<div class="qlist">';
    if (!items.length) h += '<div class="empty">Inbox clear. End the day when you are ready.</div>';
    for (var i=0;i<items.length;i++){
      var it = items[i];
      h += '<button class="qitem' + (it.done ? " done" : "") + '" data-act="open" data-id="' + e(it.id) + '" aria-current="' + (S.activeId===it.id) + '">' +
        '<div class="qt">' + e(it.title) + '</div>' +
        '<div class="qm"><span class="kind">' + e(E.KIND[it.kind].short) + '</span>' +
        (S.mode==="career" ? dueChip(it, S.day) + '<span class="due">' + it.hours + 'h</span>' : "") +
        (it.done && it.result ? '<span class="due" style="color:var(--' + (it.result.score>=0.85?"ok":it.result.score>=0.5?"warn":"crit") + ')">' + Math.round(it.result.score*100) + '%</span>' : "") +
        '</div></button>';
    }
    h += '</div>';
  }
  h += '</div>';
  return h;
}

/* ---------------- work surface ---------------- */
function stampFor(score){
  if (score >= 0.9) return '<span class="stamp ok stamp-in">Accepted</span>';
  if (score >= 0.6) return '<span class="stamp warn stamp-in">Comments</span>';
  return '<span class="stamp stamp-in">Finding</span>';
}
function resultBlock(item){
  var r = item.result, h = '<div class="res">';
  h += '<div class="rh">' + stampFor(r.score) + '<div><div class="lbl">Result</div><div class="sc">' + Math.round(r.score*100) + '%</div></div>';
  h += '<div style="margin-left:auto;text-align:right"><div class="lbl">' + e(r.summary || "") + '</div>';
  if (r.xp) h += '<div class="mono" style="font-size:13px">+' + r.xp + ' experience</div>';
  h += '</div></div>';
  if (r.deltas){
    var names = { integrity:"Baseline", schedule:"Schedule", confidence:"Customer", audit:"Audit" };
    var any = false, dh = '<div class="deltas">';
    for (var k in r.deltas){ var v = r.deltas[k]; if (!v) continue; any = true;
      dh += '<span class="dp ' + (v>0?"up":"dn") + '">' + names[k] + " " + (v>0?"+":"") + v + '</span>'; }
    dh += '</div>';
    if (any) h += dh;
  }
  h += '<ul>';
  for (var i=0;i<r.lines.length;i++){
    var l = r.lines[i];
    var cls = l.t === "ok" ? "li-ok" : l.t === "bad" ? "li-bad" : l.t === "warn" ? "li-warn" : "li-n";
    h += '<li class="' + cls + '"><span class="tag">' + e(l.tag || l.t) + '</span><span style="color:var(--ink)">' + e(l.text) + '</span></li>';
  }
  h += '</ul>';
  h += '<div class="row end" style="margin-top:12px"><button class="btn" data-act="codexjump">Open the codex</button>' +
       '<button class="btn pri" data-act="next">Next item</button></div>';
  h += '</div>';
  return h;
}
function alarmBanner(){
  var S = E.state();
  if (S.mode !== "career") return "";
  var m = S.meters, out = [];
  if (m.integrity <= 12) out.push(["crit", B.castBy("achebe").name + " has put your release authority under review. Every package you touch is being re checked behind you until baseline integrity recovers."]);
  else if (m.integrity < 32) out.push(["warn", "Baseline integrity is low. Things you released are being found wrong downstream."]);
  if (m.confidence < 28) out.push(["warn", "The government program office has started asking who signs your releases. Customer confidence is low."]);
  if (m.schedule < 28) out.push(["warn", "The backlog is winning. Schedule health is low and the delinquency report is getting attention."]);
  if (m.audit < 28) out.push(["warn", "Audit readiness is low. If the government team walked in this week it would not go well."]);
  if (!out.length) return "";
  var h = "";
  for (var i=0;i<out.length;i++) h += '<div class="' + (out[i][0]==="crit"?"critbox":"warnbox") + '" style="margin-bottom:10px">' + e(out[i][1]) + '</div>';
  return h;
}
function renderWork(){
  var S = E.state();
  var it = S.activeId ? E.findItem(S.activeId) : null;
  if (it && !it.data){ it = null; S.activeId = null; }
  if (!it){
    var open = S.queue.filter(function(x){ return !x.done; });
    var h = '<div class="sheet"><div class="tb"><h2>' + (S.mode==="career" ? B.dayName(S.day) + ", " + B.dateOf(S.day) : "Drill") + '</h2>' +
      (S.mode==="career" ? '<span class="chip">' + S.hours + ' hours left</span>' : "") + '</div><div class="pad">';
    if (!open.length && S.mode === "career"){
      h += '<p>Inbox is clear. Nothing else is going to arrive today.</p>' +
        '<div class="row"><button class="btn pri" data-act="endday">End the day</button></div>';
    } else {
      h += '<p>' + (S.mode==="career"
        ? "Pick something out of the inbox. Due dates run out, and anything still open at the end of the day costs you schedule."
        : "Pick an item. There is no clock in drill mode and the queue refills itself.") + '</p>';
      if (open.length) h += '<div class="row"><button class="btn pri" data-act="open" data-id="' + e(open[0].id) + '">Open the next item</button></div>';
    }
    if (S.mode === "career" && S.dayLog.length){
      h += '<h3 style="margin-top:18px">Today so far</h3><ul style="padding-left:18px;margin:0">';
      for (var i=0;i<S.dayLog.length;i++){
        var l = S.dayLog[i];
        h += '<li style="margin-bottom:5px;font-size:13.5px;color:var(--' + (l.t==="ok"?"ok":l.t==="warn"?"warn":"crit") + ')"><span style="color:var(--ink)">' + e(l.text) + '</span></li>';
      }
      h += '</ul>';
    }
    h += '</div></div>';
    return h;
  }
  var K = E.KIND[it.kind];
  var h2 = '<div class="sheet"><div class="tb"><h2>' + e(K.name) + '</h2>' +
    '<span class="chip">' + e(K.short) + '</span>' +
    (S.mode==="career" ? '<span class="chip">' + it.hours + 'h</span>' + '<span class="chip' + (it.due < S.day ? " crit" : (it.due === S.day ? " warn" : "")) + '">' + e(B.dateOf(it.due)) + '</span>' : "") +
    '<span class="chip info" style="max-width:100%;overflow:hidden;text-overflow:ellipsis">from ' + e(it.from) + '</span>' +
    '</div><div class="pad doc">';
  h2 += II.render(it, it.done);
  if (it.done && it.result) h2 += resultBlock(it);
  h2 += '</div></div>';
  return h2;
}

/* ---------------- record ---------------- */
function renderRecord(){
  var S = E.state(), L = B.LEVELS[S.level-1];
  var h = '<div class="stack">';
  h += '<div class="sheet"><div class="tb"><h2>' + e(L.code) + " " + e(L.title) + '</h2>' +
    '<span class="chip">' + e(L.exp) + '</span></div><div class="pad">';
  h += '<p>' + e(L.scope) + '</p>';
  h += II.fields([["Base salary band", L.band], ["Total compensation benchmark", L.tc],
    ["Program", S.world.prog.full], ["Customer", S.world.prog.customer],
    ["Contract", S.world.contract], ["CM plan", S.world.cmp],
    ["Experience", String(S.xp)], ["Next tier at", S.level<5 ? String(B.LEVELS[S.level].xp) : "top of ladder"]]);
  h += '<p class="hint">Bands are the published ranges for the real role tiers this simulator is modeled on. They are wide because they cover the whole country and the whole tier.</p>';
  h += '</div></div>';

  h += '<div class="sheet"><div class="tb"><h2>Numbers</h2></div><div class="pad">';
  var st = S.stats;
  var rows = [["Items completed", st.done], ["Perfect items", st.perfect],
    ["Best streak", st.bestStreak], ["Discrepancies caught", st.found], ["Discrepancies missed", st.missed],
    ["Escapes", st.escapes], ["Promotion boards taken", st.boards], ["Day", S.day], ["Week", B.weekOf(S.day)]];
  h += '<div class="fields">';
  for (var i=0;i<rows.length;i++) h += '<div class="fld"><span class="k">' + e(rows[i][0]) + '</span><span class="v">' + rows[i][1] + '</span></div>';
  h += '</div>';
  if (S.escapes.length){
    h += '<div class="warnbox" style="margin-top:12px"><strong>' + S.escapes.length + ' unresolved release' + (S.escapes.length>1?"s":"") + ' out there.</strong> Something you let through has not been found yet. It will be.</div>';
  }
  h += '</div></div>';

  h += '<div class="sheet"><div class="tb"><h2>Badges</h2></div><div class="pad"><div class="fields">';
  for (var k in E.BADGES){
    var got = !!S.badges[k], b = E.BADGES[k];
    h += '<div class="fld" style="' + (got?"":"opacity:.42") + '"><span class="k">' + e(b.n) + (got ? " &check;" : "") + '</span><span class="v" style="font-family:inherit;font-size:12.5px">' + e(b.d) + '</span></div>';
  }
  h += '</div></div></div>';

  if (S.history.length){
    h += '<div class="sheet"><div class="tb"><h2>Completed</h2></div><div class="scrollx"><table class="grid"><thead><tr><th>Day</th><th>Type</th><th>Item</th><th>Score</th></tr></thead><tbody>';
    var hs = S.history.slice().reverse().slice(0, 60);
    for (var j=0;j<hs.length;j++){
      var it = hs[j];
      h += '<tr><td class="m">' + (it.doneDay||"") + '</td><td class="m">' + e(E.KIND[it.kind].short) + '</td><td>' + e(it.title) + '</td>' +
        '<td class="m" style="color:var(--' + (it.result.score>=0.85?"ok":it.result.score>=0.5?"warn":"crit") + ')">' + Math.round(it.result.score*100) + '%</td></tr>';
    }
    h += '</tbody></table></div></div>';
  }
  h += '<div class="sheet"><div class="tb"><h2>Save</h2>' +
    '<span class="chip' + (ST.available() ? " ok" : " crit") + '">' + (ST.available() ? e(ST.sinceText() || "autosave on") : "not saving") + '</span></div><div class="pad">';
  if (!ST.available()) h += '<div class="critbox" style="margin-bottom:12px">' + e(ST.reason()) + ' Copy the text under Export before you close the tab, or this career is gone.</div>';
  else h += '<p style="font-size:13.5px">Progress is written to this browser after every item, at the end of each day and when you leave the tab. Browser storage belongs to one browser on one device, so use export and import to carry a career between your phone and your laptop.</p>';
  h += '<div class="row"><button class="btn" data-act="renameslot" data-slot="' + ST.activeSlot() + '">Rename this career</button>' +
    '<button class="btn" data-act="export" data-slot="' + ST.activeSlot() + '">Export</button>' +
    '<button class="btn" data-act="import">Import</button>' +
    '<button class="btn" data-act="menu">Main menu</button></div>';
  h += '<h3 style="margin-top:18px">Slots</h3>' + slotList(ST.listSlots(), 1);
  h += '</div></div>';
  h += '<div class="row end"><button class="btn dngr" data-act="wipe2">Delete this career and start over</button></div>';
  h += '</div>';
  return h;
}

/* ---------------- codex ---------------- */
function renderCodex(){
  var q = U.codexQ.toLowerCase().trim();
  var list = X.CODEX.filter(function(c){
    if (!q) return true;
    return (c.t + " " + c.c + " " + c.k + " " + c.b.join(" ")).toLowerCase().indexOf(q) >= 0;
  });
  var h = '<div class="sheet" style="max-width:880px;margin:0 auto"><div class="tb"><h2>Codex</h2><span class="chip">' + list.length + ' entries</span></div>';
  h += '<div class="pad" style="padding-bottom:10px"><input class="srch" id="cxq" type="text" placeholder="Search: class I, waiver, effectivity, PCA, revision letters" value="' + e(U.codexQ) + '" data-act="cxq"></div>';
  h += '<div class="codex-list">';
  if (!list.length) h += '<div class="empty">Nothing matches that.</div>';
  for (var i=0;i<list.length;i++){
    var c = list[i];
    h += '<div class="cx"><div class="cxk">' + e(c.c) + '</div><h4>' + e(c.t) + '</h4>';
    for (var j=0;j<c.b.length;j++) h += '<p>' + e(c.b[j]) + '</p>';
    h += '</div>';
  }
  h += '</div></div>';
  return h;
}

/* ---------------- modals ---------------- */
function modal(title, body, opts){
  opts = opts || {};
  return '<div class="mask" data-act="maskclose"><div class="modal" role="dialog" aria-modal="true">' +
    '<div class="tb"><h2>' + e(title) + '</h2>' + (opts.noclose ? "" : '<button class="xbtn" data-act="closemodal" aria-label="Close">&times;</button>') + '</div>' +
    '<div class="pad">' + body + '</div></div></div>';
}
function exportBody(){
  var n = U.modal.slot, txt = ST.exportText(n), m = ST.meta(n);
  var h = '<div class="doc">';
  if (!txt) return h + '<p>Slot ' + n + ' is empty.</p><div class="row end"><button class="btn pri" data-act="closemodal">Close</button></div></div>';
  h += '<p>' + e(m.name) + ', day ' + m.day + ', ' + Math.max(1, Math.round(txt.length/1024)) + ' KB. This is the whole career, including every completed item and every escape still out there.</p>';
  var dl = ST.canDownload();
  if (!dl) h += '<div class="infobox" style="margin:0 0 10px">This viewer will not hand over a file, so copy the text and paste it into Import on the other device.</div>';
  h += '<div class="row">';
  if (dl) h += '<button class="btn pri" data-act="dlsave" data-slot="' + n + '">Download ' + e(ST.exportName(n)) + '</button>';
  h += '<button class="btn' + (dl ? "" : " pri") + '" data-act="copysave">Copy to clipboard</button></div>';
  if (dl) h += '<p class="hint">Or copy the text below by hand.</p>';
  h += '<textarea class="savebox" id="savetext" readonly spellcheck="false" style="margin-top:10px">' + e(txt) + '</textarea>';
  h += '<div class="row end" style="margin-top:12px"><button class="btn" data-act="closemodal">Done</button></div>';
  return h + '</div>';
}
function importBody(){
  var slots = ST.listSlots(), n = U.modal.slot || 0;
  var h = '<div class="doc">';
  h += '<p>Paste an exported save, or pick the file. It goes into the slot you choose, replacing whatever is there.</p>';
  if (U.modal.err) h += '<div class="critbox" style="margin-bottom:10px">' + e(U.modal.err) + '</div>';
  h += '<div class="lbl">Into slot</div><div class="row" style="margin:8px 0 12px">';
  for (var i=1;i<=ST.SLOTS;i++){
    var sm = slots[i-1], on = (n === i);
    h += '<button class="btn sm" data-act="impslot" data-slot="' + i + '"' +
      (on ? ' style="background:var(--ink);color:var(--btn-ink);border-color:var(--ink)"' : "") + '>' +
      i + (sm.empty ? "" : " &middot; " + e((sm.name||"in use").slice(0,14))) + '</button>';
  }
  h += '</div>';
  if (n && !slots[n-1].empty) h += '<div class="warnbox" style="margin-bottom:10px">Slot ' + n + ' will be overwritten.</div>';
  if (ST.canDownload()) h += '<div class="row" style="margin-bottom:10px"><input type="file" accept="application/json,.json" data-act="impfile"></div>';
  h += '<textarea class="savebox" id="imptext" spellcheck="false" placeholder="Paste the exported JSON here"></textarea>';
  h += '<div class="row end" style="margin-top:12px"><button class="btn" data-act="closemodal">Cancel</button>' +
    '<button class="btn pri" data-act="doimport"' + (n ? "" : " disabled") + '>Import into slot ' + (n || "?") + '</button></div>';
  return h + '</div>';
}
function renderModal(){
  var root = B.el("modal-root");
  if (!U.modal){ root.innerHTML = ""; return; }
  var S = E.state();
  if (U.modal.type === "help"){
    root.innerHTML = modal("How this works", helpBody());
  } else if (U.modal.type === "aar"){
    root.innerHTML = modal("After action, " + B.dayName(U.modal.s.day) + " " + B.dateOf(U.modal.s.day), aarBody(U.modal.s), { noclose:true });
  } else if (U.modal.type === "board"){
    root.innerHTML = modal(U.modal.prep.title, boardBody(), { noclose:true });
  } else if (U.modal.type === "boardres"){
    root.innerHTML = modal(U.modal.res.pass ? "Promoted" : "Not this cycle", boardResBody(U.modal.res), { noclose:true });
  } else if (U.modal.type === "export"){
    root.innerHTML = modal("Export slot " + U.modal.slot, exportBody());
  } else if (U.modal.type === "import"){
    root.innerHTML = modal("Import a save", importBody());
  }
}
function helpBody(){
  return '<div class="doc">' +
    '<h3 style="margin-top:0">Three ways in</h3>' +
    '<p><strong>Teach</strong> is where to start if the vocabulary is new. Thirty five lessons that build the job from nothing: a short card, a worked example with the answer already on it and every discrepancy pointed at, practice with hints, then a check that unlocks the next lesson. It uses the same generators as the game, so what you practice on is what you will be graded on. Course progress is stored separately from your careers.</p>' +
    '<p><strong>Career</strong> is the job with a clock on it. <strong>Drill</strong> is reps with no clock and no consequences.</p>' +
    '<p>Switch between them any time with <strong>Main menu</strong> in the navigation, or by clicking the Baseline Control logo. Everything is saved on the way out, and career and course progress are kept separately, so nothing is lost by moving between them.</p>' +
    '<h3>The job</h3>' +
    '<p>You control what gets into the product baseline. Packages arrive, you audit them, you classify changes, you answer the customer, and once a week you sit at the change control board. The vault accepts whatever you release and keeps it forever, which is the entire reason this role exists.</p>' +
    '<h3>Career mode</h3>' +
    '<p>Four ten hour days a week, Monday through Thursday. Each item costs hours. Run out and you go into overtime, which costs you. Anything still open at the end of the day costs schedule, and a late data deliverable costs customer confidence too.</p>' +
    '<p>Four meters: <strong>Baseline</strong> is integrity of what you have released, <strong>Schedule</strong> is whether you are keeping up, <strong>Customer</strong> is what the government program office thinks of you, <strong>Audit</strong> is how you would do if they walked in tomorrow.</p>' +
    '<h3>Escapes</h3>' +
    '<p>A hard discrepancy you release anyway does not vanish. It sits in the world for a week or two and then comes back as a real problem with your name on it. This is the part of the job the job is actually about.</p>' +
    '<h3>Promotion</h3>' +
    '<p>Experience accumulates. At each threshold a panel convenes and asks four questions. Three right and you move up, and new work opens: classification at E2, audits and plans at E3, architecture at E4, policy at E5.</p>' +
    '<h3>Drill mode</h3>' +
    '<p>No clock, no meters, no consequences. Pick a tier, optionally narrow to one kind of task, and answer until you stop. Everything is generated, so it does not repeat.</p>' +
    '<h3>The codex</h3>' +
    '<p>Open it any time, including in the middle of an item. It is a reference, not a test bank, and using it is not cheating. If you work through teach mode you should not need it, which is the point of teach mode.</p>' +
    '<div class="row end" style="margin-top:14px"><button class="btn pri" data-act="closemodal">Understood</button></div></div>';
}
function aarBody(s){
  var S = E.state();
  var h = '<div class="doc">';
  h += '<div class="fields">' +
    '<div class="fld"><span class="k">Completed</span><span class="v">' + s.completed + '</span></div>' +
    '<div class="fld"><span class="k">Overdue</span><span class="v"' + (s.overdue?' style="color:var(--crit)"':"") + '>' + s.overdue + '</span></div>' +
    '<div class="fld"><span class="k">Overtime</span><span class="v">' + s.overtime + ' h</span></div>' +
    '<div class="fld"><span class="k">Carried forward</span><span class="v">' + s.carry + '</span></div></div>';
  var names = { integrity:"Baseline", schedule:"Schedule", confidence:"Customer", audit:"Audit" };
  var dh = '<div class="deltas" style="margin-top:10px">', any = false;
  for (var k in s.deltas){ var v = s.deltas[k]; if (!v) continue; any = true;
    dh += '<span class="dp ' + (v>0?"up":"dn") + '">' + names[k] + " " + (v>0?"+":"") + v + '</span>'; }
  if (any) h += dh + '</div>';
  if (s.log.length){
    h += '<h3>The day</h3><ul style="padding-left:18px;margin:0">';
    for (var i=0;i<s.log.length;i++){
      var l = s.log[i];
      h += '<li style="margin-bottom:5px;font-size:13.5px"><span style="color:var(--' + (l.t==="ok"?"ok":l.t==="warn"?"warn":"crit") + ')">&#9632;</span> ' + e(l.text) + '</li>';
    }
    h += '</ul>';
  }
  if (S.pendingBoard) h += '<div class="okbox" style="margin-top:12px">A promotion panel has been scheduled. They are waiting.</div>';
  h += '<div class="row end" style="margin-top:14px">' +
    (S.pendingBoard ? '<button class="btn pri" data-act="startboard">Go to the panel</button>'
                    : '<button class="btn pri" data-act="closemodal">Next day</button>') + '</div>';
  return h + '</div>';
}
function boardBody(){
  var p = U.modal.prep, a = U.modal.answers, h = '<div class="doc">';
  h += '<p>' + e(p.panel.map(function(x){ return x.name + " (" + x.role + ")"; }).join(", ")) + '.</p>';
  h += '<p class="mut">Four questions. Three correct moves you up.</p>';
  for (var i=0;i<p.qs.length;i++){
    var q = p.qs[i];
    h += '<div style="border:1px solid var(--rule);background:var(--panel);padding:11px 12px;margin-bottom:10px">';
    h += '<div style="font-weight:500;margin-bottom:8px">' + e(q.q) + '</div><div class="opts">';
    for (var j=0;j<q.opts.length;j++){
      h += '<label class="opt"><input type="radio" name="bq' + i + '"' + (a[i]===j?" checked":"") + ' data-act="bans" data-q="' + i + '" data-idx="' + j + '">' +
        '<span style="flex:1;min-width:0"><span class="ot">' + e(q.opts[j]) + '</span></span></label>';
    }
    h += '</div></div>';
  }
  var ready = a.every(function(x){ return x !== null && x !== undefined; });
  h += '<div class="row end"><button class="btn pri" data-act="bsubmit"' + (ready?"":" disabled") + '>Submit to the panel</button></div>';
  return h + '</div>';
}
function boardResBody(res){
  var S = E.state(), L = B.LEVELS[S.level-1];
  var h = '<div class="doc">';
  h += '<div class="row" style="margin-bottom:12px">' + (res.pass ? '<span class="stamp ok stamp-in">Promoted</span>' : '<span class="stamp stamp-in">Held</span>') +
    '<div><div class="lbl">Score</div><div class="sc" style="font-family:\'Saira Condensed\',sans-serif;font-weight:700;font-size:26px">' + res.hits + ' / ' + res.total + '</div></div></div>';
  if (res.pass){
    h += '<p>You are now <strong>' + e(L.code) + " " + e(L.title) + '</strong>. ' + e(L.scope) + '</p>';
    h += '<p class="mut">Band ' + e(L.band) + '. New work starts arriving tomorrow.</p>';
  } else {
    h += '<p>Not this cycle. The panel meets again in two days and your experience carries over.</p>';
  }
  h += '<h3>The panel\'s notes</h3><ul style="padding-left:18px;margin:0">';
  for (var i=0;i<res.detail.length;i++){
    var d = res.detail[i];
    h += '<li style="margin-bottom:8px;font-size:13.5px"><span style="color:var(--' + (d.ok?"ok":"crit") + ')">&#9632;</span> ' +
      (d.ok ? "" : '<strong>' + e(d.right) + '</strong> ') + e(d.w) + '</li>';
  }
  h += '</ul><div class="row end" style="margin-top:14px"><button class="btn pri" data-act="closemodal">Back to work</button></div>';
  return h + '</div>';
}

/* ---------------- main render ---------------- */
function render(){
  var S = E.state();
  if (!S || !S.started){ renderSplash(); renderModal(); return; }
  renderTop();
  var v = B.el("view"), h = "";
  if (S.mode === "teach" && window.BCTEACH){
    h = window.BCTEACH.render();
  } else if (U.screen === "desk"){
    h = alarmBanner() + '<div class="cols">' + renderRail() + '<div>' + renderWork() + '</div></div>';
  } else if (U.screen === "record"){ h = renderRecord(); }
  else if (U.screen === "codex"){ h = renderCodex(); }
  v.innerHTML = h;
  renderModal();
  if (U.screen === "codex"){ var i = B.el("cxq"); if (i && U.focusCodex){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}

/* ---------------- actions ---------------- */
var _formTimer = null;
function touchForm(){
  var S = E.state();
  if (!S || !S.activeId || S.mode === "teach") return;
  var f = II.form();
  if (_formTimer) clearTimeout(_formTimer);
  _formTimer = setTimeout(function(){ ST.formSave(S.activeId, f); }, 350);
}
function openItem(id){
  var S = E.state(), it = E.findItem(id);
  if (!it || !it.data) return;
  S.activeId = id;
  if (!it.done){
    var saved = ST.formLoad(id);
    if (saved) II.setForm(it, saved); else II.resetForm(it);
  }
  U.screen = "desk";
  if (window.innerWidth < 940) U.railOpen = false;
  render();
  var m = B.el("main"); if (m) window.scrollTo({ top:0, behavior:"instant" in window ? "instant" : "auto" });
}
function nextItem(){
  var S = E.state();
  var open = S.queue.filter(function(x){ return !x.done; });
  if (open.length){
    open.sort(function(a,b){ return a.due - b.due; });
    openItem(open[0].id);
  } else {
    S.activeId = null;
    U.railOpen = true;
    render();
  }
}

document.addEventListener("click", function(ev){
  var t = ev.target.closest("[data-act]");
  if (!t) return;
  var act = t.getAttribute("data-act"), S = E.state();
  if (act === "maskclose" && ev.target !== t) return;

  var slotN = t.getAttribute("data-slot") ? parseInt(t.getAttribute("data-slot"), 10) : 0;

  if (act.charAt(0) === "t" && window.BCTEACH && window.BCTEACH.act(act, t)) return;

  switch(act){
    case "mode": U.splash.mode = t.getAttribute("data-mode"); renderSplash(); break;
    case "tbegin": window.BCTEACH.start(false); U.screen = "desk"; render();
      if (!ST.pref.get("helped")){ U.modal = { type:"help" }; ST.pref.set("helped","1"); renderModal(); } break;
    case "tresume": if (window.BCTEACH.resumeIfAny()){ ST.setLastMode("teach"); U.screen = "desk"; render(); } break;
    case "pickslot": U.splash.slot = slotN; renderSplash(); break;
    case "newhere": U.splash.slot = slotN; renderSplash();
      try { document.querySelector('[data-act="begin"]').scrollIntoView({ block:"center" }); } catch(x){} break;
    case "loadslot": {
      var st = E.load(slotN);
      if (!st){ toast("That slot could not be read", "bad"); break; }
      E.resume(st, slotN);
      U.screen = "desk"; U.railOpen = true; U.modal = null;
      render(); break;
    }
    case "delslot": {
      var dm = ST.meta(slotN);
      if (!confirm("Delete " + (dm.name || "slot " + slotN) + "? Export it first if you want to keep it.")) break;
      var wasActive = (ST.activeSlot() === slotN) && !!E.state();
      E.wipe(slotN);
      if (wasActive){ E.unload(); U.modal = null; renderSplash(); }
      else if (E.state()) render(); else renderSplash();
      toast("Slot " + slotN + " deleted");
      break;
    }
    case "renameslot": {
      var cm = ST.meta(slotN);
      var nn = prompt("Name this career", cm.name || "Career");
      if (nn == null) break;
      ST.rename(slotN, nn.trim() || cm.name || "Career");
      var cur = E.state();
      if (cur && ST.activeSlot() === slotN){ cur.name = nn.trim() || cur.name; E.save(); }
      if (E.state()) render(); else renderSplash();
      break;
    }
    case "export": U.modal = { type:"export", slot: slotN || ST.activeSlot() }; renderModal(); break;
    case "import": U.modal = { type:"import", slot: ST.firstFree() || 1 }; renderModal(); break;
    case "importinto": U.modal = { type:"import", slot: slotN }; renderModal(); break;
    case "impslot": U.modal.slot = slotN; U.modal.err = null; renderModal(); break;
    case "dlsave": {
      var txt = ST.exportText(slotN);
      t.disabled = true;
      ST.saveFile(ST.exportName(slotN), txt, function(ok, msg){
        toast(msg, ok ? "good" : "bad");
        try { t.disabled = false; } catch(x){}
      });
      break;
    }
    case "copysave": {
      var ta = B.el("savetext");
      if (!ta) break;
      var done2 = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(ta.value).then(function(){ toast("Save copied", "good"); },
            function(){ ta.select(); toast("Select all and copy", "bad"); });
          done2 = true;
        }
      } catch(x){}
      if (!done2){ ta.select(); try { document.execCommand("copy"); toast("Save copied", "good"); }
        catch(x2){ toast("Select all and copy", "bad"); } }
      break;
    }
    case "doimport": {
      var box = B.el("imptext"), text = box ? box.value : "";
      if (U.modal.pending) text = U.modal.pending;
      var r3 = ST.importText(text, U.modal.slot);
      if (!r3.ok){ U.modal.err = r3.err; renderModal(); break; }
      var slot3 = U.modal.slot;
      U.modal = null;
      var st3 = E.load(slot3);
      if (st3){ E.resume(st3, slot3); U.screen = "desk"; U.railOpen = true; render(); toast("Imported into slot " + slot3, "good"); }
      else { renderSplash(); toast("Imported, but the slot would not open", "bad"); }
      break;
    }
    case "menu": case "switch": {
      E.save(); E.unload(); U.modal = null; U.screen = "desk";
      ST.setLastMode("menu");
      U.splash.slot = 0;
      renderSplash();
      window.scrollTo(0, 0);
      break;
    }
    case "prog": U.splash.prog = t.getAttribute("data-key"); renderSplash(); break;
    case "lvl": U.splash.level = parseInt(t.getAttribute("data-lvl"),10); renderSplash(); break;
    case "kind": { var k = t.getAttribute("data-kind"); U.splash.kinds[k] = !U.splash.kinds[k]; renderSplash(); break; }
    case "begin": {
      var kinds = Object.keys(U.splash.kinds).filter(function(x){ return U.splash.kinds[x]; });
      var slot = U.splash.slot || ST.firstFree();
      if (!slot){ toast("Pick a slot to use", "bad"); break; }
      var sm2 = ST.meta(slot);
      if (!sm2.empty && !confirm("Slot " + slot + " holds " + (sm2.name || "a career") + ". Overwrite it?")) break;
      var pn = null;
      for (var pi=0; pi<B.PROGRAMS.length; pi++) if (B.PROGRAMS[pi].key === U.splash.prog) pn = B.PROGRAMS[pi].name;
      ST.setLastMode("career");
      E.start({ mode:U.splash.mode, progKey:U.splash.prog, slot:slot,
        name: (pn || "Career") + (U.splash.mode === "drill" ? " drill" : ""),
        level: U.splash.mode === "drill" ? U.splash.level : 1,
        drillKinds: (U.splash.mode === "drill" && kinds.length) ? kinds : null });
      U.splash.slot = 0;
      U.screen = "desk"; U.railOpen = true; render();
      if (!ST.pref.get("helped")){ U.modal = { type:"help" }; ST.pref.set("helped", "1"); renderModal(); }
      break;
    }
    case "wipe2": {
      if (!confirm("Delete this career and start over? Export it first if you want to keep it.")) break;
      E.wipe(); E.unload(); U.modal = null; renderSplash(); break;
    }
    case "nav": U.screen = t.getAttribute("data-screen"); U.focusCodex = false; render(); break;
    case "codexjump": U.screen = "codex"; render(); break;
    case "help": U.modal = { type:"help" }; renderModal(); break;
    case "theme": {
      var cur = document.documentElement.getAttribute("data-theme");
      var next = cur === "dark" ? "light" : (cur === "light" ? "dark" : (matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark"));
      document.documentElement.setAttribute("data-theme", next);
      ST.pref.set("theme", next);
      break;
    }
    case "rail": U.railOpen = !U.railOpen; render(); break;
    case "open": openItem(t.getAttribute("data-id")); break;
    case "next": nextItem(); break;

    case "closemodal": case "maskclose": {
      var was = U.modal; U.modal = null; renderModal();
      if (was && was.type === "aar") render();
      if (was && was.type === "boardres") render();
      break;
    }
    case "endday": {
      var openCount = S.queue.filter(function(x){ return !x.done; }).length;
      if (openCount && !confirm(openCount + " item" + (openCount>1?"s are":" is") + " still open. End the day anyway?")) break;
      var sum = E.endDay();
      S.activeId = null; U.railOpen = true;
      U.modal = { type:"aar", s:sum };
      render();
      break;
    }
    case "startboard": { var prep = E.prepBoard(); U.modal = { type:"board", prep:prep, answers:new Array(prep.qs.length).fill(null) }; renderModal(); break; }
    case "bans": { U.modal.answers[parseInt(t.getAttribute("data-q"),10)] = parseInt(t.getAttribute("data-idx"),10); renderModal(); break; }
    case "bsubmit": { var res = E.takeBoard(U.modal.answers); U.modal = { type:"boardres", res:res }; render(); break; }

    /* item form interactions */
    case "pick": {
      var f = II.form(), g = t.getAttribute("data-group"), idx = t.getAttribute("data-idx");
      if (g === "pick"){ var n = Number(idx); f.pick = (String(n) === idx && !isNaN(n)) ? n : idx; }
      else f[g] = idx;
      // radio inputs update natively; re-render only to refresh the submit button
      touchForm(); render(); break;
    }
    case "find": { var f2 = II.form(), id2 = t.getAttribute("data-id"); f2.findings[id2] = !f2.findings[id2]; touchForm(); render(); break; }
    case "row": { var f3 = II.form(); f3.rows[parseInt(t.getAttribute("data-row"),10)] = t.getAttribute("data-val"); touchForm(); render(); break; }
    case "ans": { var f4 = II.form(); f4.answers[parseInt(t.getAttribute("data-q"),10)] = parseInt(t.getAttribute("data-idx"),10); touchForm(); render(); break; }
    case "disp": { var f5 = II.form(); f5.dispositions[parseInt(t.getAttribute("data-idx"),10)] = t.getAttribute("data-val"); touchForm(); render(); break; }
    case "submit": {
      if (S.mode === "teach"){ window.BCTEACH.act("tsubmit", t); break; }
      var it2 = E.findItem(S.activeId);
      if (!it2 || it2.done) break;
      var resp = II.collect(it2);
      var r2 = E.submit(it2.id, resp);
      if (r2 && S.mode === "drill" && r2.score >= 0.999) toast("Correct", "good");
      render();
      break;
    }
  }
});

document.addEventListener("keydown", function(ev){
  if (ev.key === "Escape" && U.modal && U.modal.type === "help"){ U.modal = null; renderModal(); }
});

document.addEventListener("input", function(ev){
  var t = ev.target.closest("[data-act]");
  if (!t) return;
  if (t.getAttribute("data-act") === "cxq"){ U.codexQ = t.value; U.focusCodex = true; render(); }
});

document.addEventListener("change", function(ev){
  var t = ev.target.closest("[data-act]");
  if (!t || t.getAttribute("data-act") !== "impfile") return;
  var file = t.files && t.files[0];
  if (!file) return;
  var fr = new FileReader();
  fr.onload = function(){
    var box = B.el("imptext");
    if (box) box.value = String(fr.result);
    if (U.modal) U.modal.pending = String(fr.result);
    toast("File loaded. Press import.");
  };
  fr.onerror = function(){ toast("That file could not be read", "bad"); };
  fr.readAsText(file);
});

/* last chance save when the tab goes away */
function flush(){
  var S = E.state();
  if (!S) return;
  if (S.activeId){ try { ST.formSave(S.activeId, II.form()); } catch(x){} }
  E.save();
}
document.addEventListener("visibilitychange", function(){ if (document.visibilityState === "hidden") flush(); });
window.addEventListener("pagehide", flush);
window.addEventListener("beforeunload", flush);

/* ---------------- boot ---------------- */
function boot(){
  ST.adoptLegacy();
  /* the viewer may grant a file save route; it answers later, so re-render the
     export panel if it opens before the answer arrives */
  ST.probeDownloads(function(){ if (U.modal && U.modal.type === "export") renderModal(); });
  var th = ST.pref.get("theme");
  if (th) document.documentElement.setAttribute("data-theme", th);
  if (ST.lastMode() === "menu"){
    U.splash.slot = ST.firstFree();
    renderSplash();
    return;
  }
  if (ST.lastMode() === "teach" && ST.teachSummary() && window.BCTEACH && window.BCTEACH.resumeIfAny()){
    U.screen = "desk";
    render();
    return;
  }
  var slot = ST.activeSlot();
  var saved = E.load(slot);
  if (saved && saved.started){
    E.resume(saved, slot);
    U.screen = "desk";
    render();
  } else {
    U.splash.slot = ST.firstFree();
    renderSplash();
  }
}
window.BCUI = { render:render, toast:toast, boot:boot, U:U };
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
})();
