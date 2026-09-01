/* ============================================================
   Work surface renderers, one per task kind.
   ============================================================ */
(function(){
"use strict";
var B = window.BC, C = window.BCC, R = window.BCR,
    T1 = window.BCT1, T2 = window.BCT2, T3 = window.BCT3;
var e = B.esc;

var UIS = { id:null, findings:{}, disposition:null, cls:null, pri:null, route:null,
  pick:null, rows:[], answers:[], dispositions:[], action:null };
function resetForm(item){
  UIS = { id:item.id, findings:{}, disposition:null, cls:null, pri:null, route:null,
    pick:null, rows:[], answers:[], dispositions:[], action:null };
  if (item.kind === "audit") UIS.rows = new Array(item.data.rows.length).fill(null);
  if (item.kind === "minutes") UIS.rows = new Array(item.data.rows.length).fill(null);
  if (item.kind === "gate") UIS.answers = new Array(item.data.qs.length).fill(null);
  if (item.kind === "ccb") UIS.dispositions = new Array(item.data.items.length).fill(null);
}
function form(){ return UIS; }
/* Restore a form that was saved mid item. Lengths are normalised against the
   item so a stale save can never make an incomplete answer look complete. */
function setForm(item, f){
  resetForm(item);
  if (!f || typeof f !== "object") return;
  if (f.findings && typeof f.findings === "object") UIS.findings = f.findings;
  ["disposition","cls","pri","route","action"].forEach(function(k){ if (f[k] != null) UIS[k] = f[k]; });
  if (f.pick !== undefined && f.pick !== null) UIS.pick = f.pick;
  ["rows","answers","dispositions"].forEach(function(k){
    if (!Array.isArray(f[k]) || !Array.isArray(UIS[k])) return;
    if (f[k].length !== UIS[k].length) return;
    UIS[k] = f[k].slice();
  });
}

/* ---------- small builders ---------- */
function fields(rows){
  var h = '<div class="fields">';
  for (var i=0;i<rows.length;i++){
    if (!rows[i]) continue;
    var v = rows[i][1];
    var cls = rows[i][2] ? ' style="color:var(--' + rows[i][2] + ')"' : "";
    h += '<div class="fld"><span class="k">' + e(rows[i][0]) + '</span><span class="v"' + cls + '>' + (v === "" || v == null ? '<span style="color:var(--crit)">blank</span>' : e(v)) + '</span></div>';
  }
  return h + '</div>';
}
function optRow(o, i, sel, dis, mark){
  var st = mark ? ' data-state="' + mark.state + '"' : "";
  var vd = mark ? '<span class="verd ' + mark.k + '">' + mark.t + '</span>' : "";
  return '<label class="opt' + (dis ? " dis" : "") + '"' + st + '>' +
    '<input type="radio" name="' + e(o.name) + '" value="' + i + '"' + (sel ? " checked" : "") + (dis ? " disabled" : "") +
    ' data-act="pick" data-group="' + e(o.group) + '" data-idx="' + i + '">' +
    '<span style="flex:1;min-width:0"><span class="ot">' + e(o.t) + '</span>' + (o.d ? '<span class="od">' + e(o.d) + '</span>' : "") + '</span>' + vd + '</label>';
}
function checkRow(id, label, checked, dis, mark){
  var st = mark ? ' data-state="' + mark.state + '"' : "";
  var vd = mark ? '<span class="verd ' + mark.k + '">' + mark.t + '</span>' : "";
  return '<label class="opt' + (dis ? " dis" : "") + '"' + st + '>' +
    '<input type="checkbox"' + (checked ? " checked" : "") + (dis ? " disabled" : "") +
    ' data-act="find" data-id="' + e(id) + '"><span style="flex:1;min-width:0"><span class="ot">' + e(label) + '</span></span>' + vd + '</label>';
}
function narr(who, role, text){
  return '<div class="narr"><div class="who">' + e(who) + (role ? ' &middot; ' + e(role) : "") + '</div><div class="quote">' + e(text) + '</div></div>';
}
function sect(t){ return '<h3>' + e(t) + '</h3>'; }
function submitBar(ok, label){
  return '<div class="row end" style="margin-top:16px"><button class="btn pri" data-act="submit"' + (ok ? "" : " disabled") + '>' + e(label || "Submit") + '</button></div>';
}

/* ---------- impact worksheet ---------- */
function impactSheet(ch){
  var keys = ["fff","iface","safety","weight","perf","cost","sched","gfe","techman","testreq","interch","source","retrofit"];
  var h = '<div class="scrollx"><table class="grid"><thead><tr><th>Impact assessed</th><th style="width:70px">Result</th></tr></thead><tbody>';
  for (var i=0;i<keys.length;i++){
    var on = ch.flags.indexOf(keys[i]) >= 0;
    h += '<tr><td>' + e(C.FLAG_TEXT[keys[i]]) + '</td><td class="m" style="color:var(--' + (on?"crit":"ink-3") + ')">' + (on ? "YES" : "no") + '</td></tr>';
  }
  h += '</tbody></table></div>';
  h += fields([
    ["Cost impact", ch.costDelta ? "$" + ch.costDelta.toLocaleString() : "None"],
    ["Schedule impact", ch.schedDays ? ch.schedDays + " days" : "None"],
    ["Mass delta", ch.massG ? (ch.massG + " g") : "None"],
    ["Mass margin remaining", ch.marginG + " g" + (ch.massG > ch.marginG ? "  (exceeded)" : "")]
  ]);
  return h;
}

/* ---------- release ---------- */
function renderRelease(item, done){
  var d = item.data, p = d.pkg, ch = p.change, h = "";
  h += sect("Title block");
  h += fields([
    ["Document", p.docNo], ["CAGE", p.cage], ["Sheets in title block", String(p.sheetsShown)],
    ["Sheets in package", String(p.sheets)],
    ["Current revision", p.curRev], ["Proposed revision", p.propRev],
    ["Part number, title block", p.titleBlockPN], ["Part number, parts list", p.partsListPN],
    ["Title", p.title]
  ]);
  h += sect("Change control data");
  h += fields([
    ["Change request", p.crNo + " dated " + B.dateOf(p.crDay)],
    ["Change notice", p.ecn],
    ["Classification", "Class " + (p.cls === 1 ? "I" : "II")],
    ["Reason code", p.reason + " - " + (B.REASON_CODES.filter(function(r){return r.code===p.reason;})[0]||{name:"unknown"}).name],
    ["ECP number", p.cls === 1 ? (p.ecp || "") : "n/a, Class II"],
    ["Government approval", p.cls === 1 ? ((p.pcoDate != null) ? "PCO approved " + B.dateOf(p.pcoDate) : "") : "n/a, Class II"],
    ["Baseline affected", p.baseline],
    ["Effectivity", p.effText],
    ["Contract deliverable", p.deliverable ? "Yes" : "No"],
    ["CDRL sequence", p.deliverable ? (p.cdrl || "") : "n/a"],
    p.change.isSw ? ["Software build label", p.swBuild || ""] : null
  ]);
  h += sect("Description of change");
  h += '<p>' + e(ch.text) + '</p>' + (ch.ctxText ? '<p class="mut">' + e(ch.ctxText) + '</p>' : "");
  h += sect("Impact worksheet as submitted");
  h += impactSheet(ch);
  h += sect("Approvals");
  h += '<div class="sigs">';
  for (var i=0;i<p.sigs.length;i++){
    var s = p.sigs[i];
    h += '<div class="sig' + (s.signed ? "" : " blank") + '"><div class="r">' + e(s.role) + '</div>' +
         '<div class="n">' + e(s.name) + '</div><div class="d">' + (s.day != null ? e(B.dateOf(s.day)) : "&nbsp;") + '</div></div>';
  }
  h += '</div>';
  h += sect("Related documents");
  h += '<div class="scrollx"><table class="grid"><thead><tr><th>Type</th><th>Identifier</th><th>Revision</th></tr></thead><tbody>';
  for (var j=0;j<p.related.length;j++){
    var r = p.related[j];
    h += '<tr><td>' + e(r.type) + '</td><td class="m">' + e(r.id) + '</td><td class="m">' + e(r.rev) + '</td></tr>';
  }
  if (!p.related.length) h += '<tr><td colspan="3" class="mut">No related documents listed.</td></tr>';
  h += '</tbody></table></div>';

  h += sect("Findings");
  h += '<p class="mut" style="font-size:13.5px">Select every discrepancy present in this package. If the package is clean, select nothing.</p>';
  h += '<div class="opts">';
  for (var k=0;k<d.shown.length;k++){
    var id = d.shown[k], def = R.DEFECTS[id];
    var mark = null;
    if (done){
      var real = d.defects.indexOf(id) >= 0, chosen = (item.resp.findings||[]).indexOf(id) >= 0;
      mark = real && chosen ? { state:"right", k:"r", t:"caught" }
           : real && !chosen ? { state:"miss", k:"m", t:"missed" }
           : !real && chosen ? { state:"wrong", k:"w", t:"not present" } : null;
    }
    h += checkRow(id, def.label, done ? ((item.resp.findings||[]).indexOf(id)>=0) : !!UIS.findings[id], done, mark);
  }
  h += '</div>';

  h += sect("Disposition");
  var dopts = [
    { id:"release", t:"Release to the vault", d:"Nothing in the package blocks release." },
    { id:"comments", t:"Release with comments", d:"Administrative issues only. Do not hold the floor for a formatting comment." },
    { id:"return", t:"Return to originator", d:"At least one discrepancy is a hard stop." }
  ];
  h += '<div class="opts">';
  for (var m=0;m<dopts.length;m++){
    var o = dopts[m], sel = done ? item.resp.disposition === o.id : UIS.disposition === o.id;
    var mk = null;
    if (done) mk = o.id === d.disposition ? { state:"right", k:"r", t:"correct" }
                 : (sel ? { state:"wrong", k:"w", t:"your call" } : null);
    h += optRow({ t:o.t, d:o.d, name:"disp"+item.id, group:"disposition" }, o.id, sel, done, mk);
  }
  h += '</div>';
  if (!done) h += submitBar(!!UIS.disposition, "Submit audit");
  return h;
}

/* ---------- ecp ---------- */
function renderECP(item, done){
  var d = item.data, ch = d.ch, h = "";
  h += narr(d.originator, "originator", "Submitted " + B.dateOf(d.submitted) + " as " + d.ecpNo + ".");
  h += sect("Proposed change");
  h += fields([["ECP number", d.ecpNo], ["Configuration item", ch.ci.name],
    ["Drawing", ch.ci.doc], ["Current revision", ch.ci.rev], ["Baseline", ch.ci.baseline]]);
  h += '<p>' + e(ch.text) + '</p>' + (ch.ctxText ? '<p class="mut">' + e(ch.ctxText) + '</p>' : "");
  h += sect("Impact worksheet");
  h += impactSheet(ch);

  h += sect("Classification");
  h += '<div class="opts">';
  [["1","Class I","Affects an approved baseline in a way the government controls. Requires contracting officer approval before implementation."],
   ["2","Class II","Does not touch an approved baseline in a controlled way. Contractor board approves, government concurs in the classification."]]
   .forEach(function(o){
    var sel = done ? String(item.resp.cls) === o[0] : UIS.cls === o[0];
    var mk = done ? (String(d.key.cls) === o[0] ? { state:"right", k:"r", t:"correct" } : (sel ? { state:"wrong", k:"w", t:"your call" } : null)) : null;
    h += optRow({ t:o[1], d:o[2], name:"cls"+item.id, group:"cls" }, o[0], sel, done, mk);
  });
  h += '</div>';

  h += sect("Priority");
  h += '<div class="opts">';
  [["Emergency","Safety condition likely to cause serious injury or major damage, or production is stopped."],
   ["Urgent","Potentially hazardous, or must move now to hold a milestone or capture a benefit that expires."],
   ["Routine","Normal board cycle."]].forEach(function(o){
    var sel = done ? item.resp.pri === o[0] : UIS.pri === o[0];
    var mk = done ? (d.key.pri === o[0] ? { state:"right", k:"r", t:"correct" } : (sel ? { state:"wrong", k:"w", t:"your call" } : null)) : null;
    h += optRow({ t:o[0], d:o[1], name:"pri"+item.id, group:"pri" }, o[0], sel, done, mk);
  });
  h += '</div>';

  if (d.askRoute){
    h += sect("Routing");
    h += '<div class="opts">';
    T1.ROUTE_OPTS.forEach(function(o){
      var sel = done ? item.resp.route === o.id : UIS.route === o.id;
      var mk = done ? (d.key.route === o.id ? { state:"right", k:"r", t:"correct" } : (sel ? { state:"wrong", k:"w", t:"your call" } : null)) : null;
      h += optRow({ t:o.t, d:o.d, name:"rt"+item.id, group:"route" }, o.id, sel, done, mk);
    });
    h += '</div>';
  }
  if (!done) h += submitBar(!!(UIS.cls && UIS.pri && (!d.askRoute || UIS.route)), "Submit classification");
  return h;
}

/* ---------- single choice kinds ---------- */
function renderChoice(item, done, opts, keyId, header, body, byIndex){
  var h = "";
  if (body) h += body;
  h += sect(header || "Your call");
  h += '<div class="opts">';
  for (var i=0;i<opts.length;i++){
    var o = opts[i];
    var val = byIndex ? i : o.id;
    var sel = done ? (byIndex ? item.resp.pick === i : item.resp.pick === o.id) : (byIndex ? UIS.pick === i : UIS.pick === o.id);
    var isKey = byIndex ? !!o.k : (o.id === keyId);
    var mk = done ? (isKey ? { state:"right", k:"r", t:"correct" } : (sel ? { state:"wrong", k:"w", t:"your call" } : null)) : null;
    h += optRow({ t:o.t, d:o.d, name:"c"+item.id, group:"pick" }, val, sel, done, mk);
  }
  h += '</div>';
  if (!done) h += submitBar(UIS.pick !== null && UIS.pick !== undefined, "Submit");
  return h;
}

function renderIPN(item, done){
  var d = item.data;
  var body = sect("Proposed change") + fields([["Configuration item", d.ci.name], ["Drawing", d.ci.doc],
    ["Current part number", d.ci.pn], ["Current revision", d.ci.rev]]) + '<p>' + e(d.text) + '</p>';
  return renderChoice(item, done, T1.IPN_OPTS, d.key, "Part number determination", body, false);
}
function renderVariance(item, done){
  var d = item.data;
  var body = narr(B.castBy("raghu").name, B.castBy("raghu").role, "Needs a call today.") +
    sect("Situation") + '<p>' + e(d.text) + '</p>';
  return renderChoice(item, done, T1.VAR_OPTS, d.key, "What is the right instrument", body, false);
}
function renderEvent(item, done){
  var d = item.data;
  var body = narr(d.who.name, d.who.role, d.who.tic) + '<p>' + e(d.text) + '</p>';
  return renderChoice(item, done, d.opts, null, "What do you do", body, true);
}
function renderSenior(item, done){
  var d = item.data;
  var body = narr(d.who.name, d.who.role, "Wants your recommendation.") + '<p>' + e(d.text) + '</p>';
  return renderChoice(item, done, d.opts, null, "Your recommendation", body, true);
}
function renderEscape(item, done){
  var d = item.data;
  var body = '<div class="critbox" style="margin-bottom:12px"><strong>' + e(d.label) + '</strong>' +
    (d.doc ? '<div class="mono" style="font-size:12px;margin-top:4px">' + e(d.doc) + (d.rev ? " revision " + e(d.rev) : "") + '</div>' : "") +
    '</div>' +
    narr(B.castBy("achebe").name, B.castBy("achebe").role, "This came back. It was released on your watch and it has now been found downstream. What is the first move?");
  return renderChoice(item, done, d.opts, null, "Containment", body, true);
}

/* ---------- csa ---------- */
function renderCSA(item, done){
  var d = item.data, h = "";
  h += narr(d.asker.name, d.asker.role, d.q.text);
  h += sect("Change notice history, drawing " + d.ci.doc);
  h += '<div class="scrollx"><table class="grid"><thead><tr><th>Notice</th><th>Released</th><th>To revision</th><th>Effectivity</th><th>Retrofit</th><th>Title</th></tr></thead><tbody>';
  for (var i=0;i<d.ecns.length;i++){
    var x = d.ecns[i];
    h += '<tr><td class="m">' + e(x.no) + '</td><td class="m">' + e(B.dateOf(x.day)) + '</td><td class="m">' + e(x.revTo) + '</td>' +
      '<td class="m">' + e(B.serial(x.effFrom) + " and up") + '</td>' +
      '<td class="m">' + (x.retrofit ? e("yes, worked " + B.dateOf(x.retrofitDay)) : "no") + '</td><td>' + e(x.title) + '</td></tr>';
  }
  h += '</tbody></table></div>';
  h += sect("Unit register");
  h += '<div class="scrollx"><table class="grid"><thead><tr><th>Unit</th><th>State</th></tr></thead><tbody>';
  for (var j=0;j<d.units.length;j++) h += '<tr><td class="m">' + e(d.units[j].label) + '</td><td>' + e(d.units[j].state) + '</td></tr>';
  h += '</tbody></table></div>';
  h += '<div class="infobox" style="margin-top:12px">' + e(d.q.text) + '</div>';
  h += '<div class="opts" style="margin-top:10px">';
  for (var k=0;k<d.opts.length;k++){
    var o = d.opts[k];
    var sel = done ? String(item.resp.pick) === String(o.id) : UIS.pick === o.id;
    var mk = done ? (String(o.id) === String(d.key) ? { state:"right", k:"r", t:"correct" } : (sel ? { state:"wrong", k:"w", t:"your call" } : null)) : null;
    h += optRow({ t:o.t, d:"", name:"csa"+item.id, group:"pick" }, o.id, sel, done, mk);
  }
  h += '</div>';
  if (!done) h += submitBar(UIS.pick !== null && UIS.pick !== undefined, "Answer");
  return h;
}

/* ---------- multi row kinds ---------- */
function renderRows(item, done, rows, opts, header, intro, respRows){
  var h = intro || "";
  h += sect(header);
  for (var i=0;i<rows.length;i++){
    h += '<div style="border:1px solid var(--rule);background:var(--panel);padding:10px 12px;margin-bottom:9px">';
    h += '<div style="font-size:14px;margin-bottom:8px">' + e(rows[i].text) + '</div>';
    h += '<div class="row">';
    for (var j=0;j<opts.length;j++){
      var o = opts[j];
      var chosen = done ? (respRows[i] === o.id) : (UIS.rows[i] === o.id);
      var right = done && o.id === rows[i].key;
      var cls = "btn sm";
      var style = "";
      if (done){
        if (right) style = 'style="border-color:var(--ok);color:var(--ok);background:var(--ok-bg)"';
        else if (chosen) style = 'style="border-color:var(--crit);color:var(--crit);background:var(--crit-bg)"';
      } else if (chosen) style = 'style="background:var(--ink);color:var(--btn-ink);border-color:var(--ink)"';
      h += '<button class="' + cls + '" ' + style + ' data-act="row" data-row="' + i + '" data-val="' + e(o.id) + '"' + (done ? " disabled" : "") + '>' + e(o.t) + '</button>';
    }
    h += '</div></div>';
  }
  if (!done){
    var all = UIS.rows.every(function(x){ return x !== null && x !== undefined; });
    h += submitBar(all, "Submit");
  }
  return h;
}
function renderAudit(item, done){
  var d = item.data;
  var intro = narr(d.lead.name, d.lead.role, "We are running the " + d.type + " on " + d.ci.name + " today. Call each line.") +
    '<div class="infobox" style="margin-bottom:12px"><strong>' + e(d.type === "FCA" ? "Functional configuration audit" : "Physical configuration audit") + '</strong><br>' +
    e(d.type === "FCA" ? "Scope: does the item meet the requirements in its specification, on the evidence of test, analysis, demonstration and inspection."
                       : "Scope: does the item as built match the released technical data, on the evidence of the as built configuration list, drawings and parts lists.") + '</div>' +
    fields([["Audit", d.type], ["Item", d.ci.name], ["Drawing", d.ci.doc], ["Unit", d.sn], ["Released revision", d.ci.rev]]);
  return renderRows(item, done, d.rows, T2.AUD_OPTS, "Audit lines", intro, done ? item.resp.rows : []);
}
function renderMinutes(item, done){
  var d = item.data;
  var intro = narr(d.chair.name, d.chair.role, "You have the minutes. Tag each line so the action log and the decision record come out clean.") +
    fields([["Board", "Program change control board"], ["Date", B.dateOf(d.when)], ["Chair", d.chair.name]]);
  return renderRows(item, done, d.rows, T2.MIN_OPTS, "Transcript", intro, done ? item.resp.rows : []);
}

/* ---------- gate ---------- */
function renderGate(item, done){
  var d = item.data, h = "";
  h += narr(d.reviewer.name, d.reviewer.role, "Three questions before the review. If we cannot answer these in the room we should not be in the room.");
  for (var i=0;i<d.qs.length;i++){
    var q = d.qs[i];
    h += '<div style="border:1px solid var(--rule);background:var(--panel);padding:11px 12px;margin-bottom:10px">';
    h += '<div style="font-weight:500;margin-bottom:8px">' + e(q.q) + '</div><div class="opts">';
    for (var j=0;j<q.opts.length;j++){
      var sel = done ? item.resp.answers[i] === j : UIS.answers[i] === j;
      var mk = done ? (j === q.a ? { state:"right", k:"r", t:"correct" } : (sel ? { state:"wrong", k:"w", t:"your call" } : null)) : null;
      h += '<label class="opt' + (done?" dis":"") + '"' + (mk ? ' data-state="' + mk.state + '"' : "") + '>' +
        '<input type="radio" name="g' + item.id + '_' + i + '"' + (sel?" checked":"") + (done?" disabled":"") +
        ' data-act="ans" data-q="' + i + '" data-idx="' + j + '">' +
        '<span style="flex:1;min-width:0"><span class="ot">' + e(q.opts[j]) + '</span></span>' +
        (mk ? '<span class="verd ' + mk.k + '">' + mk.t + '</span>' : "") + '</label>';
    }
    h += '</div></div>';
  }
  if (!done) h += submitBar(UIS.answers.every(function(x){ return x !== null && x !== undefined; }), "Submit answers");
  return h;
}

/* ---------- ccb ---------- */
function renderCCB(item, done){
  var d = item.data, h = "";
  h += narr(d.youChair ? "You" : d.chair.name, d.youChair ? "chairing" : d.chair.role,
    d.youChair ? "Your board. Four items on the agenda and a room full of people who each want a different answer."
               : "Let us move. Four items, and I would like to be out of here in an hour.");
  for (var i=0;i<d.items.length;i++){
    var it = d.items[i], ch = it.ch;
    h += '<div class="sheet" style="margin-bottom:14px"><div class="tb"><h3>' + e(it.ecpNo) + '</h3>' +
      '<span class="chip ' + (ch.cls===1?"crit":"info") + '">Class ' + (ch.cls===1?"I":"II") + '</span>' +
      '<span class="chip ' + (ch.pri==="Emergency"?"crit":(ch.pri==="Urgent"?"warn":"")) + '">' + e(ch.pri) + '</span>' +
      (ch.cls===1 ? '<span class="chip ' + (it.govApproved?"ok":"warn") + '">' + (it.govApproved ? "PCO approved" : "no PCO approval") + '</span>' : "") +
      '</div><div class="pad">';
    h += '<p style="font-size:14px">' + e(ch.text) + '</p>';
    if (ch.ctxText) h += '<p class="mut" style="font-size:13.5px">' + e(ch.ctxText) + '</p>';
    h += fields([["Item", ch.ci.name], ["Cost", ch.costDelta ? "$" + ch.costDelta.toLocaleString() : "None"],
      ["Schedule", ch.schedDays ? ch.schedDays + " days" : "None"],
      ["Mass", ch.massG ? ch.massG + " g against " + ch.marginG + " g margin" : "None"]]);
    h += '<h3 style="margin-top:13px">Around the table</h3>';
    for (var j=0;j<it.positions.length;j++){
      var p = it.positions[j];
      var tag = p.stance === "nonconcur" ? '<span class="chip crit">nonconcur</span>' :
                p.stance === "comment" ? '<span class="chip warn">comment</span>' : '<span class="chip ok">concur</span>';
      h += '<div class="narr" style="margin-bottom:9px"><div class="who">' + e(p.who.name) + ' &middot; ' + e(p.who.role) + ' ' + tag + '</div><div class="quote">' + e(p.text) + '</div></div>';
    }
    h += '<h3>Disposition</h3><div class="opts">';
    for (var k=0;k<T3.DISP.length;k++){
      var o = T3.DISP[k];
      var sel = done ? item.resp.dispositions[i] === o.id : UIS.dispositions[i] === o.id;
      var mk = done ? (o.id === it.key ? { state:"right", k:"r", t:"correct" } : (sel ? { state:"wrong", k:"w", t:"your call" } : null)) : null;
      h += '<label class="opt' + (done?" dis":"") + '"' + (mk ? ' data-state="' + mk.state + '"' : "") + '>' +
        '<input type="radio" name="b' + item.id + '_' + i + '"' + (sel?" checked":"") + (done?" disabled":"") +
        ' data-act="disp" data-idx="' + i + '" data-val="' + e(o.id) + '">' +
        '<span style="flex:1;min-width:0"><span class="ot">' + e(o.t) + '</span><span class="od">' + e(o.d) + '</span></span>' +
        (mk ? '<span class="verd ' + mk.k + '">' + mk.t + '</span>' : "") + '</label>';
    }
    h += '</div></div></div>';
  }
  if (!done) h += submitBar(UIS.dispositions.every(function(x){ return !!x; }), "Close the board");
  return h;
}

/* ---------- cdrl ---------- */
function renderCDRL(item, done){
  var d = item.data, h = "";
  var who = d.sub ? d.supplier.name : B.castBy("salk").name;
  h += narr(who, d.sub ? "subcontractor data manager" : B.castBy("salk").role,
    d.sub ? "Submitted for your review before it goes into the prime deliverable."
          : "The line item is due. Review before it goes out the door.");
  h += sect(d.sub ? "SDRL line item" : "CDRL line item");
  h += fields([
    ["Sequence", d.seq], ["Title", d.title],
    ["Required DID", d.did.did], ["DID cited in document", d.citedDid.did],
    ["Contract", d.contract],
    ["Government action", d.approval ? "Approval required" : "Information only"],
    ["Contract due date", B.dateOf(d.due)],
    ["Planned submittal", B.dateOf(d.plannedSubmit)],
    d.approval ? ["Milestone supported", B.dateOf(d.milestone)] : null,
    d.approval ? ["Required review period", d.reviewDays + " days"] : null,
    ["Submittal medium", d.medium],
    ["Addressees", String(d.addressees) + (d.addrOk ? " (matches the CDRL)" : " (does not match the CDRL)")],
    ["Pages", String(d.pages)],
    ["Classification", d.classified ? "Classified. Overall marking applied" : "Unclassified"],
    d.classified ? ["Portion markings", d.hasPortion ? "Present" : ""] : null,
    ["Distribution statement", d.hasDist ? "Present on cover and header" : ""],
    ["Signature", d.signed ? "Signed by authorized representative" : ""],
    ["Cites CDRL and contract number", d.citesCdrl ? "Yes" : ""],
    d.resubmittal ? ["Resubmittal", "Yes. " + d.priorComments + " government comments on the prior submittal"] : null,
    d.resubmittal ? ["Comments dispositioned", d.commentsDispositioned ? "All dispositioned in the comment matrix" : ""] : null
  ]);
  h += sect("Findings");
  h += '<p class="mut" style="font-size:13.5px">Select every compliance problem with this submittal. If it is compliant, select nothing.</p>';
  h += '<div class="opts">';
  for (var k=0;k<d.shown.length;k++){
    var id = d.shown[k], def = T1.CDRL_DEF[id], mark = null;
    if (done){
      var real = d.defects.indexOf(id) >= 0, chosen = (item.resp.findings||[]).indexOf(id) >= 0;
      mark = real && chosen ? { state:"right", k:"r", t:"caught" }
           : real && !chosen ? { state:"miss", k:"m", t:"missed" }
           : !real && chosen ? { state:"wrong", k:"w", t:"not present" } : null;
    }
    h += checkRow(id, def.label, done ? ((item.resp.findings||[]).indexOf(id)>=0) : !!UIS.findings[id], done, mark);
  }
  h += '</div>';
  h += sect("Action");
  h += '<div class="opts">';
  for (var m=0;m<T1.CDRL_ACT.length;m++){
    var o = T1.CDRL_ACT[m], sel = done ? item.resp.action === o.id : UIS.action === o.id;
    var mk = done ? (o.id === d.action ? { state:"right", k:"r", t:"correct" } : (sel ? { state:"wrong", k:"w", t:"your call" } : null)) : null;
    h += '<label class="opt' + (done?" dis":"") + '"' + (mk ? ' data-state="' + mk.state + '"' : "") + '>' +
      '<input type="radio" name="a' + item.id + '"' + (sel?" checked":"") + (done?" disabled":"") +
      ' data-act="pick" data-group="action" data-idx="' + e(o.id) + '">' +
      '<span style="flex:1;min-width:0"><span class="ot">' + e(o.t) + '</span><span class="od">' + e(o.d) + '</span></span>' +
      (mk ? '<span class="verd ' + mk.k + '">' + mk.t + '</span>' : "") + '</label>';
  }
  h += '</div>';
  if (!done) h += submitBar(!!UIS.action, "Submit review");
  return h;
}

function render(item, done){
  // the form state must always belong to the item on screen, even after a reload
  if (!done && UIS.id !== item.id) resetForm(item);
  switch(item.kind){
    case "release": return renderRelease(item, done);
    case "ecp": return renderECP(item, done);
    case "ipn": return renderIPN(item, done);
    case "variance": return renderVariance(item, done);
    case "cdrl": case "sdrl": return renderCDRL(item, done);
    case "csa": return renderCSA(item, done);
    case "audit": return renderAudit(item, done);
    case "gate": return renderGate(item, done);
    case "minutes": return renderMinutes(item, done);
    case "ccb": return renderCCB(item, done);
    case "event": return renderEvent(item, done);
    case "escape": return renderEscape(item, done);
    case "senior": return renderSenior(item, done);
  }
  return "<p>Nothing to do here.</p>";
}

function collect(item){
  var f = [];
  for (var k in UIS.findings) if (UIS.findings[k]) f.push(k);
  switch(item.kind){
    case "release": return { findings:f, disposition:UIS.disposition };
    case "cdrl": case "sdrl": return { findings:f, action:UIS.action };
    case "ecp": return { cls:UIS.cls, pri:UIS.pri, route:UIS.route };
    case "audit": case "minutes": return { rows:UIS.rows.slice() };
    case "gate": return { answers:UIS.answers.slice() };
    case "ccb": return { dispositions:UIS.dispositions.slice() };
    default: return { pick:UIS.pick };
  }
}

window.BCUII = { render:render, resetForm:resetForm, setForm:setForm, form:form, collect:collect, fields:fields, narr:narr };
})();
