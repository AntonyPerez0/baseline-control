/* ============================================================
   Task generators, part two:
   status accounting, configuration audits, baseline gates,
   and board minutes.
   ============================================================ */
(function(){
"use strict";
var B = window.BC;

/* ---------------- configuration status accounting ---------------- */
function genCSA(rng, world, day, level){
  var ci = rng.pick(world.hw);
  var n = world.units.length;
  var ecns = [];
  var count = rng.int(4, 6);
  // lay the history out backwards from a point at or before today, so nothing
  // in the register is dated in the future
  var gaps = [], i, span = 0;
  for (i=0;i<count;i++){ var g = rng.int(12, 34); gaps.push(g); span += g; }
  var last = day - rng.int(2, 14);
  var relDay = last - span;
  var effFrom = 1, revI = 0;
  for (i=0;i<count;i++){
    relDay += gaps[i];
    effFrom = Math.min(n, effFrom + rng.int(0, 2));
    revI += 1;
    var retro = rng.chance(0.28) && effFrom > 1;
    var rDay = retro ? Math.min(day, relDay + rng.int(10, 40)) : 0;
    ecns.push({
      no: B.ecnNo(rng), revTo: B.revAt(revI), revI: revI,
      effFrom: effFrom, effTo: n, day: relDay,
      retrofit: retro, retrofitDay: rDay,
      title: rng.pick(["Wall thickness increase","Connector relocation","Fastener material change",
        "Coating addition","Bracket stiffening","Harness routing change","Tolerance revision",
        "Insert length change","Shim addition","Bond line thickness change"])
    });
  }
  var asOf = day - rng.int(0, 20);
  if (asOf < ecns[0].day) asOf = ecns[0].day + 1;

  function incorporated(sn, d){
    var out = [];
    for (var k=0;k<ecns.length;k++){
      var e = ecns[k];
      if (e.day > d) continue;
      if (sn >= e.effFrom && sn <= e.effTo) out.push(e);
      else if (e.retrofit && e.retrofitDay <= d && sn < e.effFrom) out.push(e);
    }
    return out;
  }
  function revOf(sn, d){
    var inc = incorporated(sn, d), r = "A", ri = 0;
    for (var k=0;k<inc.length;k++) if (inc[k].revI > ri){ ri = inc[k].revI; r = inc[k].revTo; }
    return r;
  }

  var qtype = rng.pick(["rev","count-at","which-ecn","retro-units","inc-count"]);
  var q = {}, opts = [], ans;
  var sn = rng.int(1, n);

  if (qtype === "rev"){
    ans = revOf(sn, asOf);
    q.text = "As of " + B.dateOf(asOf) + ", what revision of drawing " + ci.doc + " is " + B.serial(sn) + " built to?";
    var ai = B.revIndex(ans);
    var pool = B.uniq([ans, B.revAt(Math.max(0,ai-1)), B.revAt(ai+1), B.revAt(Math.max(0,ai-2)), B.revAt(ai+2)]);
    opts = rng.shuffle(pool.slice(0,4)).map(function(r){ return { id:r, t:"Revision " + r }; });
  } else if (qtype === "count-at"){
    var tgt = ecns[rng.int(1, ecns.length-1)].revTo, ti = B.revIndex(tgt), c = 0;
    for (var s=1;s<=n;s++) if (B.revIndex(revOf(s, asOf)) >= ti) c++;
    ans = String(c);
    q.text = "As of " + B.dateOf(asOf) + ", how many units are at revision " + tgt + " or later?";
    var cp = B.uniq([String(c), String(Math.max(0,c-1)), String(c+1), String(Math.max(0,c-2)), String(c+2)]);
    opts = rng.shuffle(cp.slice(0,4)).map(function(v){ return { id:v, t: v + " unit" + (v==="1"?"":"s") }; });
  } else if (qtype === "which-ecn"){
    var e = ecns[rng.int(1, ecns.length-1)];
    ans = e.no;
    q.text = "Which change notice introduced revision " + e.revTo + " of drawing " + ci.doc + "?";
    opts = rng.shuffle(ecns.slice(0,4).map(function(x){ return x.no; }).concat([e.no]));
    opts = B.uniq(opts).slice(0,4);
    if (opts.indexOf(e.no) < 0){ opts[3] = e.no; opts = rng.shuffle(opts); }
    opts = opts.map(function(v){ return { id:v, t:v }; });
  } else if (qtype === "retro-units"){
    var re = null;
    for (var z=0;z<ecns.length;z++) if (ecns[z].retrofit) re = ecns[z];
    if (!re){ re = ecns[ecns.length-1]; re.retrofit = true; re.retrofitDay = Math.min(day, re.day + 20); }
    var lo = 1, hi = re.effFrom - 1;
    ans = hi >= lo ? (B.serial(lo) + " through " + B.serial(hi)) : "No units require retrofit";
    q.text = "Change notice " + re.no + " carries retrofit direction. Which units require retrofit action, as opposed to incorporation on the line?";
    var alt = B.uniq([ans,
      B.serial(1) + " through " + B.serial(re.effFrom),
      B.serial(re.effFrom) + " through " + B.serial(n),
      "All units, " + B.serial(1) + " through " + B.serial(n),
      "No units require retrofit"]);
    opts = rng.shuffle(alt.slice(0,4));
    if (opts.indexOf(ans) < 0) opts[0] = ans;
    opts = rng.shuffle(opts).map(function(v){ return { id:v, t:v }; });
  } else {
    var sn2 = rng.int(1, n);
    var inc = incorporated(sn2, asOf);
    ans = String(inc.length);
    q.text = "As of " + B.dateOf(asOf) + ", how many change notices are incorporated in " + B.serial(sn2) + "?";
    var ip = B.uniq([String(inc.length), String(Math.max(0,inc.length-1)), String(inc.length+1), String(Math.max(0,inc.length-2))]);
    opts = rng.shuffle(ip.slice(0,4)).map(function(v){ return { id:v, t: v + " change notice" + (v==="1"?"":"s") }; });
  }

  var asker = rng.pick([B.castBy("salk"), B.castBy("achebe"), B.castBy("whitlock")]);
  return { ci:ci, ecns:ecns, units:world.units, asOf:asOf, q:q, opts:opts, key:ans, asker:asker,
    hours: 1 + (level >= 3 ? 1 : 0) };
}
function gradeCSA(task, resp){
  var t = task.data, right = String(resp.pick) === String(t.key);
  return { score: right ? 1 : 0,
    lines: [ right
      ? { t:"ok", tag:"correct", text:"Correct. Status accounting is only ever arithmetic on effectivity and dates. The trap is answering from the current revision instead of the revision in effect on the date asked." }
      : { t:"bad", tag:"correct answer", text:"The answer is " + t.key + ". Work it the same way every time: take the change notices released on or before the date, keep the ones whose effectivity covers the unit, add any retrofit that had been worked by that date, and take the highest revision among them." } ],
    escape: null, summary: right ? "Correct" : "Incorrect" };
}

/* ---------------- configuration audits ---------------- */
var PCA_FIND = [
  "The as built configuration list for {sn} records drawing {doc} at revision {oldrev}. The released revision is {rev} and {ecn} is effective on this unit.",
  "A bracket installed on {sn} carries dash number -003. The parts list at this effectivity calls out -005.",
  "The unit nameplate on {sn} reads part number {doc}-001. The drawing title block reads {doc}-003.",
  "Traceability records for two of the four serialized reaction wheel assemblies on {sn} could not be produced during the audit.",
  "An approved waiver is in effect for wall thickness on {sn}, but the as built record contains no reference to it.",
  "The drawing package in the vault for {doc} contains eleven sheets. The title block calls out twelve.",
  "Two harness assemblies on {sn} were installed from a lot that predates {ecn}, and the incorporation record shows the change as complete."
];
var PCA_OK = [
  "The as built configuration list matches the released parts list line for line across all {cnt} items.",
  "All installed serialized items on {sn} trace to receiving inspection records and to supplier certificates of conformance.",
  "Nameplate marking on {sn} matches the drawing title block, including dash number and CAGE code.",
  "The software load on {sn} reports build label {bld}, which matches the version description delivered under CDRL {cdrl}.",
  "Every drawing in the {doc} package is at the released revision recorded in the vault release log."
];
var FCA_FIND = [
  "Requirement 3.2.4.1, pointing stability, is verified by analysis. The verification matrix in the item specification requires test.",
  "The thermal balance test was run to procedure {tp} revision B. Revision C was released nine weeks before the test.",
  "Measured settling time on {sn} was 1.34 seconds against a specification limit of 1.30. The test report records the result as passed and no waiver is on file.",
  "Four test discrepancy reports remain open against the acceptance campaign. Two of them are written against requirements inside the audit scope.",
  "Requirement 3.4.7 carries no verification method in the requirements verification matrix.",
  "Two requirements trace to the same test case. That test case exercises only one of them.",
  "The qualification test report cites a random vibration level of 11.8 Grms. The item specification requires 14.1 Grms and no approved change reduces it."
];
var FCA_OK = [
  "All {cnt} requirements in the audit scope carry a verification method, a verification event and a closed verification record.",
  "Test procedures used were at the revision released at the time of test, confirmed against the vault release log.",
  "Every measured result in the acceptance data package for {sn} falls inside its specification limit.",
  "Requirements trace cleanly from the item specification through the verification matrix to test cases, with no orphans in either direction."
];
var AUD_OPTS = [
  { id:"finding", t:"Finding. In scope and nonconforming" },
  { id:"conform", t:"In scope and conforming" },
  { id:"other",   t:"Out of scope for this audit. Write it against the other audit" }
];
function genAudit(rng, world, day, level){
  var type = rng.pick(["FCA","PCA"]);
  var ci = rng.pick(world.hw);
  var sn = B.serial(rng.int(3, world.units.length));
  var subs = {
    "{sn}": sn, "{doc}": ci.doc, "{rev}": ci.rev,
    "{oldrev}": B.revAt(Math.max(0, ci.revI - 1)), "{ecn}": B.ecnNo(rng),
    "{cnt}": String(rng.int(96, 260)), "{bld}": world.prog.key + "-FSW-" + rng.int(3,9) + "." + rng.int(0,9),
    "{cdrl}": "A" + B.pad(rng.int(1,40),3), "{tp}": "TP-" + world.prog.key + "-" + rng.int(100,899)
  };
  function fill(s){ var o = s; for (var k in subs) o = o.split(k).join(subs[k]); return o; }

  var mine  = type === "PCA" ? PCA_FIND : FCA_FIND;
  var mineOk= type === "PCA" ? PCA_OK   : FCA_OK;
  var other = type === "PCA" ? FCA_FIND : PCA_FIND;

  var rows = [];
  var nf = rng.int(2, 4), nc = rng.int(2, 3), no = rng.int(1, 2);
  rng.sample(mine, nf).forEach(function(s){ rows.push({ text: fill(s), key:"finding" }); });
  rng.sample(mineOk, nc).forEach(function(s){ rows.push({ text: fill(s), key:"conform" }); });
  rng.sample(other, no).forEach(function(s){ rows.push({ text: fill(s), key:"other" }); });
  rows = rng.shuffle(rows);

  return { type:type, ci:ci, sn:sn, rows:rows, lead:rng.pick([B.castBy("salk"), B.castBy("raghu"), B.castBy("achebe")]),
    hours: 3, when: day };
}
function gradeAudit(task, resp){
  var t = task.data, ans = resp.rows || [], lines = [], hits = 0;
  for (var i=0;i<t.rows.length;i++){
    var r = t.rows[i], got = ans[i];
    if (got === r.key){ hits++; }
    else {
      var name = AUD_OPTS.filter(function(o){return o.id===r.key;})[0].t;
      lines.push({ t:"bad", tag:"line " + (i+1), text: "Should have been: " + name + ". " +
        (r.key === "other"
          ? "That observation is about " + (t.type === "PCA" ? "whether the item meets its requirements, which is functional" : "whether the built article matches the technical data, which is physical") + ", so it belongs to the " + (t.type === "PCA" ? "FCA" : "PCA") + "."
          : r.key === "finding"
            ? "It contradicts the audit baseline, so it is a finding."
            : "Nothing in that line departs from the baseline.") });
    }
  }
  if (hits === t.rows.length) lines.unshift({ t:"ok", tag:"clean", text:"Every line called correctly. That is what a government audit team notices about a contractor." });
  else lines.unshift({ t:"n", tag:"score", text: hits + " of " + t.rows.length + " lines called correctly." });
  return { score: hits / t.rows.length, lines: lines, escape: null,
    summary: hits + " of " + t.rows.length + " audit lines correct" };
}

/* ---------------- baseline gates ---------------- */
var GATE_Q = [
  { q:"Which baseline is established at the system requirements review and system functional review?",
    o:["The functional baseline","The allocated baseline","The product baseline","The developmental baseline"], a:0,
    w:"The functional baseline is the approved system level performance requirements. It is the first thing the government puts under configuration control." },
  { q:"Which baseline is established at preliminary design review?",
    o:["The allocated baseline","The functional baseline","The product baseline","The as built baseline"], a:0,
    w:"PDR sets the allocated baseline: the item performance specifications derived from the system spec and allocated to each configuration item." },
  { q:"Which baseline is established at critical design review?",
    o:["The product baseline","The allocated baseline","The functional baseline","The verification baseline"], a:0,
    w:"CDR sets the initial product baseline: the build to package, drawings, parts lists, and for software the source and build instructions." },
  { q:"Which document set best describes the product baseline for a hardware item?",
    o:["Released detail and assembly drawings, parts lists, and the item specification at the build to revision",
       "The system specification and the concept of operations",
       "The statement of work and the work breakdown structure",
       "The verification cross reference matrix alone"], a:0,
    w:"The product baseline is what you build to and inspect against." },
  { q:"A program wants to start production of long lead structure before critical design review. What is the correct configuration management position?",
    o:["Production before CDR is a program risk decision, and any parts built are at risk against a baseline that is not yet approved. It needs a documented risk acceptance and a plan for rework if the baseline changes",
       "It is not allowed under any circumstances",
       "It is fine, because the drawings are released internally",
       "It is fine, provided the parts are marked as prototypes"], a:0,
    w:"CM does not get to say no to the program, but it does have to say plainly what the exposure is and make sure the risk is written down." },
  { q:"Who controls the functional baseline on a typical defense development contract?",
    o:["The government","The contractor configuration control board","The chief engineer","The supplier"], a:0,
    w:"Once the government approves a baseline, changes to it are Class I and only the government can approve them." },
  { q:"When does the product baseline become the verified product baseline?",
    o:["After a successful physical configuration audit","At critical design review","At first article inspection","When the first unit ships"], a:0,
    w:"The PCA is what turns the build to package into a verified statement of what was actually built." },
  { q:"A software configuration item is at build 4.2.1 in the developmental baseline. What identifies it in the product baseline?",
    o:["The build label together with the version description document that lists the exact source, tools and settings used to produce it",
       "The name of the release branch",
       "The date the build was produced",
       "The lead developer's sign off"], a:0,
    w:"If it cannot be reproduced from what you recorded, it is not under configuration control." },
  { q:"What distinguishes a configuration item from a part?",
    o:["A configuration item is designated for separate configuration management because of its criticality, interfaces or support needs, and it carries its own specification and baseline",
       "A configuration item is any item with a drawing",
       "A configuration item is anything with a serial number",
       "A configuration item is any purchased assembly"], a:0,
    w:"Designating too many items drowns the program in paperwork. Designating too few means the ones that matter are not controlled." },
  { q:"An item specification is changed after the allocated baseline is approved but before CDR. What is the change?",
    o:["Class I, because the allocated baseline is under government control","Class II, because the product baseline is not set yet",
       "Not a change at all until CDR","A deviation"], a:0,
    w:"Government control attaches when the baseline is approved, not when the program feels ready." },
  { q:"Which of these is not one of the five core functions in EIA-649?",
    o:["Configuration budgeting","Configuration identification","Configuration change management","Configuration verification and audit"], a:0,
    w:"The five are planning and management, identification, change management, status accounting, and verification and audit." },
  { q:"What replaced MIL-STD-973 as the configuration management standard the Department of Defense points to?",
    o:["The national consensus standard ANSI or SAE EIA-649, with EIA-649-1 giving the defense contract implementation",
       "MIL-STD-882","ISO 9001 alone","DFARS 252.227"], a:0,
    w:"EIA-649 is principle based rather than prescriptive, which is why programs have to tailor it in a CM plan rather than just cite it." }
];
function genGate(rng, world, day, level){
  var qs = rng.sample(GATE_Q, 3).map(function(q){
    var idx = q.o.map(function(_,i){ return i; });
    var order = rng.shuffle(idx);
    return { q:q.q, w:q.w, opts: order.map(function(i){ return q.o[i]; }), a: order.indexOf(q.a) };
  });
  return { qs:qs, hours:1, reviewer: B.castBy("whitlock") };
}
function gradeGate(task, resp){
  var t = task.data, ans = resp.answers || [], hits = 0, lines = [];
  for (var i=0;i<t.qs.length;i++){
    if (ans[i] === t.qs[i].a){ hits++; lines.push({t:"ok",tag:"q"+(i+1),text:t.qs[i].w}); }
    else lines.push({t:"bad",tag:"q"+(i+1),text:"Correct answer: " + t.qs[i].opts[t.qs[i].a] + ". " + t.qs[i].w});
  }
  return { score: hits / t.qs.length, lines: lines, escape:null, summary: hits + " of " + t.qs.length + " correct" };
}

/* ---------------- board minutes ---------------- */
var MIN_LINES = [
  { k:"action", t:"{p1}: I will have the stress delta on {ci} to the board by close of business Thursday." },
  { k:"action", t:"{p2}: Quality will pull the receiving inspection records for the affected lot and report back at next week's board." },
  { k:"action", t:"{p3}: I will get the effectivity confirmed with the floor and send the work in process count by Wednesday." },
  { k:"action", t:"{p1}: Configuration management will update the status accounting report to show the retrofit units separately." },
  { k:"action", t:"{p2}: I will ask the contracting officer whether there is funding on the line item before we commit to a date." },
  { k:"action", t:"{p3}: Safety will close hazard report {hr} or tell the board why it cannot close, by the fifteenth." },
  { k:"decision", t:"The board approves {ecp} as a Class I change and directs submittal to the contracting officer." },
  { k:"decision", t:"The board defers {ecp} pending the open hazard analysis." },
  { k:"decision", t:"The board returns {ecp} to the originator for a complete impact worksheet." },
  { k:"decision", t:"The board approves {ecp} with the condition that effectivity moves to {sn} and subsequent." },
  { k:"decision", t:"The board disapproves {ecp}. The benefit does not justify the disruption at this point in the build." },
  { k:"disc", t:"{p1}: My read is that we have seen this failure mode twice on the pathfinder unit, though I would not call it a trend yet." },
  { k:"disc", t:"{p2}: For what it is worth, the supplier told me informally that the alternate material is easier to source." },
  { k:"disc", t:"{p3}: I want to note that we are three weeks from the integration gate and everything we add lands on the same crew." },
  { k:"disc", t:"{p1}: The last time we did this on the polar program it took two boards to get through it." },
  { k:"disc", t:"{p2}: I do not have a position yet. I want to see the numbers first." },
  { k:"disc", t:"{p3}: Just so everyone knows, the vault is down for maintenance Saturday." }
];
var MIN_OPTS = [
  { id:"action", t:"Action item", d:"A named person committed to do something. It gets an owner and a due date in the action log." },
  { id:"decision", t:"Board decision", d:"The board dispositioned something. It goes in the decision record, not the action log." },
  { id:"disc", t:"Discussion", d:"Context and opinion. It gets captured in the narrative, and nothing tracks against it." }
];
function genMinutes(rng, world, day, level){
  var ci = rng.pick(world.cis);
  var cast = rng.sample(B.CAST, 3);
  var subs = { "{p1}":cast[0].name, "{p2}":cast[1].name, "{p3}":cast[2].name,
    "{ci}":ci.name, "{ecp}":B.ecpNo(rng, world.prog.key), "{hr}":"HR-" + world.prog.key + "-" + rng.int(10,99),
    "{sn}":B.serial(rng.int(3, world.units.length)) };
  function fill(s){ var o=s; for (var k in subs) o = o.split(k).join(subs[k]); return o; }
  var rows = rng.shuffle(
    rng.sample(MIN_LINES.filter(function(x){return x.k==="action";}), rng.int(2,3))
    .concat(rng.sample(MIN_LINES.filter(function(x){return x.k==="decision";}), rng.int(2,3)))
    .concat(rng.sample(MIN_LINES.filter(function(x){return x.k==="disc";}), rng.int(2,3)))
  ).map(function(x){ return { text: fill(x.t), key: x.k }; });
  return { rows:rows, chair: B.castBy("fenwick"), when: day, hours: 2, cast: cast };
}
function gradeMinutes(task, resp){
  var t = task.data, ans = resp.rows || [], hits = 0, lines = [];
  for (var i=0;i<t.rows.length;i++){
    if (ans[i] === t.rows[i].key) hits++;
    else {
      var o = MIN_OPTS.filter(function(x){return x.id===t.rows[i].key;})[0];
      lines.push({t:"bad",tag:"line " + (i+1),text:"That one is a " + o.t.toLowerCase() + ". " + o.d});
    }
  }
  if (hits === t.rows.length) lines.unshift({t:"ok",tag:"clean",text:"Every line tagged correctly. Minutes that separate actions from decisions are the difference between a board that closes items and a board that repeats itself."});
  return { score: hits / t.rows.length, lines: lines, escape:null, summary: hits + " of " + t.rows.length + " lines tagged correctly" };
}

window.BCT2 = {
  genCSA:genCSA, gradeCSA:gradeCSA,
  genAudit:genAudit, gradeAudit:gradeAudit, AUD_OPTS:AUD_OPTS,
  genGate:genGate, gradeGate:gradeGate,
  genMinutes:genMinutes, gradeMinutes:gradeMinutes, MIN_OPTS:MIN_OPTS
};
})();
