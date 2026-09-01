/* ============================================================
   Task generators, part one:
   ECP classification, interchangeability, variance, CDRL.
   ============================================================ */
(function(){
"use strict";
var B = window.BC, C = window.BCC;

/* ---------------- ECP classification ---------------- */
function genECP(rng, world, day, level){
  var wantTrap = rng.chance(level >= 3 ? 0.5 : 0.34);
  var ch = C.genChange(rng, world, wantTrap ? { trapsOnly:true } : {});
  var no = C.priorityOf(ch.ctxKey);
  return {
    ch: ch,
    ecpNo: B.ecpNo(rng, world.prog.key),
    submitted: day - rng.int(1, 5),
    originator: B.personName(rng),
    key: { cls: ch.cls, pri: no, route: ch.cls === 1 ? "formal" : "classii" },
    askRoute: level >= 2,
    hours: 2
  };
}
var ROUTE_OPTS = [
  { id:"formal", t:"Formal ECP to the procuring contracting officer for approval",
    d:"The government approves the change before it is implemented in the product baseline." },
  { id:"classii", t:"Class II change record furnished to the government representative for concurrence in classification",
    d:"You implement it, and the government representative confirms you called the class correctly." },
  { id:"none", t:"No submittal. Internal change record only",
    d:"Nothing goes to the customer at all." },
  { id:"rfd", t:"Request for Deviation to the contracting officer",
    d:"Ask permission to depart from a requirement on a limited number of units." }
];
function gradeECP(task, resp){
  var t = task.data, k = t.key, ch = t.ch, lines = [], hits = 0, tot = t.askRoute ? 3 : 2;
  var clsRight = String(resp.cls) === String(k.cls);
  var priRight = resp.pri === k.pri;
  if (clsRight){ hits++; lines.push({t:"ok",tag:"class",text:"Class " + (k.cls===1?"I":"II") + " is correct."}); }
  else lines.push({t:"bad",tag:"class",text:"This is a Class " + (k.cls===1?"I":"II") + " change. " +
    (k.cls===1 ? "Class I triggers present: " + ch.triggers.join("; ") + "."
               : "No Class I trigger is present. Nothing here touches an approved baseline in a way the government controls.") +
    (ch.why ? " " + ch.why : "")});
  if (priRight){ hits++; lines.push({t:"ok",tag:"priority",text:"Priority " + k.pri + " is correct."}); }
  else lines.push({t:"bad",tag:"priority",text:"Priority should be " + k.pri + ". " + C.PRIORITY_WHY[k.pri]});
  if (t.askRoute){
    var rr = resp.route === k.route;
    if (rr){ hits++; lines.push({t:"ok",tag:"routing",text:"Routing is correct."}); }
    else {
      var want = ROUTE_OPTS.filter(function(o){return o.id===k.route;})[0];
      lines.push({t:"bad",tag:"routing",text:"Correct routing: " + want.t + ". " + want.d});
    }
  }
  if (ch.trap && clsRight) lines.push({t:"n",tag:"note",text:"That one is built to fool people. " + (ch.why || "")});
  return { score: hits / tot, lines: lines,
    escape: (!clsRight && k.cls === 1) ? { defect:"class-under", label:"Class I change classified as Class II", doc: ch.ci.doc, rev: ch.ci.rev } : null,
    summary: hits + " of " + tot + " correct" };
}

/* ---------------- interchangeability and part numbering ---------------- */
var IPN_OPTS = [
  { id:"rev", t:"Revise in place. Part number unchanged",
    d:"The changed item is fully interchangeable with the item it replaces, in every application." },
  { id:"new-super", t:"New part number. Old number superseded and no longer procured",
    d:"The changed item is not interchangeable with the old one, and the old one is no longer needed." },
  { id:"new-oneway", t:"New part number with one way interchangeability",
    d:"The new item can be used in place of the old. The old cannot be used in place of the new." },
  { id:"new-both", t:"New part number. Old number stays active for existing applications",
    d:"The two items are not interchangeable and both are still needed." }
];
var IPN = [
  { a:"rev", t:"A note is added to the {ci} drawing stating that the existing thread callout is per ASME B1.1. No dimension, tolerance, material or process changes.",
    w:"Nothing about the item changed. A part built to the new revision is indistinguishable from one built to the old revision, so the number stays." },
  { a:"rev", t:"A dimension on the {ci} drawing is corrected from 2.505 to 2.500 inch. Every unit ever built was manufactured to 2.500 from the model, and the drawing was simply wrong.",
    w:"The drawing is being made to agree with the item. The item itself never changed, so there is nothing to renumber." },
  { a:"new-oneway", t:"The {ci} bore tolerance is tightened from plus or minus 0.005 to plus or minus 0.002 inch. Parts built to the tighter band satisfy every application the old parts served.",
    w:"Tightening a tolerance produces a part that always works where the old one did, but an old part may fall outside the new band. That is the definition of one way interchangeability." },
  { a:"new-both", t:"The {ci} bore tolerance is opened from plus or minus 0.002 to plus or minus 0.005 inch to improve yield. The tight parts are still required for the two optical bench applications.",
    w:"Loosening the band means a new part may not work where an old one did, and the tight part is still needed. Two different items, two numbers." },
  { a:"new-super", t:"The {ci} data connector changes from a 37 pin arrangement to a 55 pin arrangement. The 37 pin configuration is not used anywhere else on the program.",
    w:"The new item will not mate where the old one did. It is not interchangeable, and since nothing still needs the old one, that number is superseded." },
  { a:"new-super", t:"The {ci} fastener changes from titanium to A286 with identical thread, head and grip. Allowable strength and galvanic behavior differ. Titanium fasteners are being removed from the program.",
    w:"Same envelope, different material properties. Function is affected, so it is a different item and it gets a different number." },
  { a:"new-oneway", t:"The {ci} bracket wall is thickened from 0.080 to 0.100 inch, adding 22 grams. The thicker bracket fits every existing installation and carries more load. The thin bracket is no longer procured.",
    w:"The heavier bracket serves everywhere the old one did and does more. The old one cannot serve where the new load case applies. One way." },
  { a:"rev", t:"A second qualified source is added to the {ci} source control drawing. Both suppliers' items meet every requirement on the drawing and are fully interchangeable.",
    w:"Interchangeability is about the item, not about who makes it. Adding a source is a revision. Note that it is still a Class I change, because sources on a source control drawing are government controlled. Two different questions." },
  { a:"new-super", t:"The {ci} surface finish on the bearing journal changes from 63 to 32 microinch to extend wear life. All fielded units are being retrofitted.",
    w:"The wear performance of the item changed, so the item changed. A part with the old finish will not deliver the qualified life." },
  { a:"new-both", t:"A radiation hardened part in the {ci} is discontinued. The replacement is dimensionally identical, pin compatible, and meets every electrical requirement, but it has not completed radiation qualification for the strategic application. It is approved for the civil application only.",
    w:"Approved for one application and not another means it is not interchangeable in all applications, and the old item is still required where qualification holds." },
  { a:"rev", t:"The {ci} drawing is redrawn in a new CAD system. The geometry, dimensions, tolerances and notes are identical, verified by a model comparison.",
    w:"A change in how the drawing was produced is not a change to the item. Revise and move on." },
  { a:"new-super", t:"The {ci} mounting hole pattern moves 0.25 inch to clear a newly added harness bracket. All units are still in assembly, none delivered.",
    w:"The physical interface moved, so fit is affected. New number, and since nothing needs the old pattern, the old number is superseded." },
  { a:"new-oneway", t:"A conformal coating is added to the {ci} board. The coated board is qualified for every environment the uncoated board was, plus the humidity case that drove the change. Uncoated boards remain in the spares pool for the lab.",
    w:"The coated board covers everything the uncoated board covered. The uncoated board does not cover the humidity case. One way interchangeability, and the old number stays alive as a lab item." },
  { a:"new-both", t:"The {ci} is offered in a shortened version for the polar bus, which has 40 mm less stack height. The full length version is unchanged and still flies on the geosynchronous bus.",
    w:"Two different items serving two different applications. Both live." }
];
function genIPN(rng, world, day, level){
  var s = rng.pick(IPN);
  var ci = rng.pick(world.hw);
  return { s:s, ci:ci, text: s.t.replace(/\{ci\}/g, ci.name), key: s.a, hours: 1 };
}
function gradeIPN(task, resp){
  var t = task.data, right = resp.pick === t.key;
  var want = IPN_OPTS.filter(function(o){ return o.id === t.key; })[0];
  return { score: right ? 1 : 0,
    lines: [ right
      ? { t:"ok", tag:"correct", text: want.t + ". " + t.s.w }
      : { t:"bad", tag:"correct answer", text: want.t + ". " + t.s.w } ],
    escape: null, summary: right ? "Correct" : "Incorrect" };
}

/* ---------------- deviation, waiver, or something else ---------------- */
var VAR_OPTS = [
  { id:"rfd", t:"Request for Deviation",
    d:"Written authorization, granted before manufacture, to depart from a requirement for a specific number of units or a specific period." },
  { id:"rfw", t:"Request for Waiver",
    d:"Written authorization to accept an item that already departs from a requirement, but is still considered suitable for use." },
  { id:"ecp", t:"Engineering Change Proposal",
    d:"A permanent change to the requirement itself, not a one time departure from it." },
  { id:"none", t:"No variance. Rework or scrap to the released design",
    d:"The nonconformance is correctable, so it gets corrected. A variance is not a shortcut around rework." }
];
var VARS = [
  { a:"rfw", t:"{ci} serial number 0007 was machined with a 0.062 inch wall where the drawing calls out 0.070 inch minimum. Stress ran the case and shows positive margin. The material review board wants to accept it as is and fly it.",
    w:"The part is already made and already departs from the drawing. Accepting it as is on an item that already exists is a waiver." },
  { a:"rfd", t:"The supplier for {ci} has asked permission to use an alternate anodize line for the next three units because their primary tank is down for maintenance. Nothing has been processed yet.",
    w:"Nothing has been built yet. Permission to depart from a requirement before the fact, for a limited number of units, is a deviation." },
  { a:"ecp", t:"Thermal analysis shows the {ci} radiator area is 8 percent short for the hot case on every unit, present and future. Engineering wants to increase the area permanently.",
    w:"This is not a one time departure. The requirement or the design has to change for all units, which is an engineering change." },
  { a:"none", t:"{ci} serial number 0011 has two connector backshells installed with the wrong torque stripe color. The stripes can be removed and reapplied per the process specification in under an hour.",
    w:"The condition is correctable and correcting it is cheap. Rework to the drawing. Variances are for departures you cannot or should not correct." },
  { a:"rfw", t:"Acceptance testing of {ci} serial number 0004 recorded a settling time of 1.34 seconds against a specification limit of 1.30 seconds. Systems engineering says mission performance is unaffected and wants to ship.",
    w:"The article exists and it does not meet the requirement. Shipping it anyway takes a waiver, and the customer decides." },
  { a:"rfd", t:"The program wants to ship the first two {ci} units without the flight rated fasteners, using equivalent commercial fasteners for the ground test campaign only, then install flight hardware before delivery. The units are not yet assembled.",
    w:"Planned, limited, and before the fact. That is a deviation." },
  { a:"rfw", t:"During {ci} integration a technician discovered that a lot of installed washers came from an uncertified heat lot. The washers are installed on four units. Materials engineering has tested samples from the lot and shows conformance.",
    w:"The nonconforming condition already exists in built hardware. Even with test evidence supporting use as is, the authorization to accept it is a waiver." },
  { a:"ecp", t:"The customer has directed that the {ci} operating temperature range be extended from minus 30 to minus 40 degrees Celsius on all future units.",
    w:"A customer directed permanent requirement change is an engineering change, and a Class I one at that." },
  { a:"none", t:"{ci} serial number 0009 failed a continuity check. Investigation found a pin backed out of the connector. The pin can be reseated and retested per the assembly procedure.",
    w:"A defect that can be repaired to the released design is repaired. No variance." },
  { a:"rfd", t:"The composite supplier for {ci} wants to cure the next lot at 350 degrees Fahrenheit for 90 minutes instead of the specified 355 for 80, because their new autoclave profile is more uniform. Coupons have not been run yet and the lot is not in the tool.",
    w:"Before manufacture, limited to one lot, departing from a specified process. Deviation, and it should be conditioned on coupon results." },
  { a:"rfw", t:"The {ci} nameplate on serial number 0003 was etched with the previous part number. The unit is fully assembled, closed out, and in the shipping container.",
    w:"It is built and it does not match the drawing. Correcting it now would mean opening a closed unit, so the program will ask to accept it as marked. That is a waiver, and it should carry a note in the as built record." }
];
function genVariance(rng, world, day, level){
  var s = rng.pick(VARS), ci = rng.pick(world.hw);
  return { s:s, ci:ci, text: s.t.replace(/\{ci\}/g, ci.name), key: s.a, hours: 1 };
}
function gradeVariance(task, resp){
  var t = task.data, right = resp.pick === t.key;
  var want = VAR_OPTS.filter(function(o){ return o.id === t.key; })[0];
  return { score: right ? 1 : 0,
    lines: [ right ? { t:"ok", tag:"correct", text: want.t + ". " + t.s.w }
                   : { t:"bad", tag:"correct answer", text: want.t + ". " + want.d + " " + t.s.w } ],
    escape: null, summary: right ? "Correct" : "Incorrect" };
}

/* ---------------- CDRL and SDRL deliverables ---------------- */
var CDRL_DEF = {
  "did-wrong": { sev:"stop", label:"Cited data item description does not match the content of the deliverable",
    w:"The DID is the specification for the document. Cite the wrong one and the customer gets to reject on format alone." },
  "no-dist": { sev:"stop", label:"Distribution statement is missing from the cover and the header",
    w:"Every controlled technical document carries a distribution statement. Without one it cannot be released, and if it leaves the building anyway you have an incident." },
  "no-class": { sev:"stop", label:"Classified deliverable is missing portion markings",
    w:"Overall marking is not enough. Each portion carries its own marking so a reader knows what they can extract." },
  "late": { sev:"stop", label:"Submittal will miss the contract due date",
    w:"A late deliverable shows up on the customer delinquency report, and it is one of the very few CM numbers a program manager watches weekly." },
  "no-review": { sev:"comment", label:"Submittal leaves the government less than the contractually required review period",
    w:"An approval deliverable needs the full review window before the milestone it supports. Submitting on the last legal day is technically on time and practically useless." },
  "unsigned": { sev:"stop", label:"Not signed by an authorized representative",
    w:"An unsigned deliverable is a draft. Drafts do not satisfy a contract line item." },
  "wrong-medium": { sev:"comment", label:"Submitted in a medium or format the CDRL does not allow",
    w:"Block 8 through 12 of the CDRL say what form it takes and where it goes. Contractor format is often allowed. Read it before you convert anything." },
  "wrong-addr": { sev:"comment", label:"Distribution list does not match the CDRL addressees",
    w:"The wrong addressee means the right person never sees it, and the clock keeps running." },
  "no-comments": { sev:"stop", label:"Resubmittal does not disposition the government comments from the prior submittal",
    w:"A resubmittal that ignores comments will be rejected, and the second rejection is the one that ends up in a briefing chart." },
  "no-cdrl-block": { sev:"comment", label:"Document does not cite the CDRL sequence number and contract number",
    w:"Without them the receiving office cannot match your document to the line item it satisfies." }
};
var CDRL_ACT = [
  { id:"submit", t:"Submit as is", d:"The package satisfies the CDRL." },
  { id:"return", t:"Return to the author for correction", d:"Something in it would be rejected, and there is time to fix it." },
  { id:"cover", t:"Submit with a cover letter identifying the departure", d:"Administrative issues only. Do not hold the delivery hostage to a formatting comment." },
  { id:"modreq", t:"Ask contracts to request a CDRL modification", d:"The deliverable as defined cannot be met and the line item itself needs to change." }
];
function genCDRL(rng, world, day, level, sub){
  var did = rng.pick(B.DIDS);
  var seq = (sub ? "B" : "A") + B.pad(rng.int(1, 48), 3);
  var due = day + rng.int(0, 7);
  var supplier = sub ? rng.pick(world.suppliers) : null;
  var pkgTitle = did.title;
  var d = {
    seq: seq, did: did, sub: !!sub, supplier: supplier,
    title: pkgTitle, due: due, reviewDays: did.approval ? 30 : 0,
    approval: did.approval, milestone: did.approval ? due + rng.int(20, 45) : 0,
    classified: world.prog.classified && rng.chance(0.5),
    resubmittal: rng.chance(0.28),
    pages: rng.int(12, 320),
    medium: "Contractor format, PDF, electronic submittal to the program data portal",
    addressees: rng.int(2, 5),
    contract: world.contract,
    hours: 1 + (level >= 3 ? 1 : 0)
  };
  var cands = ["did-wrong","no-dist","late","no-review","unsigned","wrong-medium","wrong-addr","no-cdrl-block"];
  if (d.classified) cands.push("no-class");
  if (d.resubmittal) cands.push("no-comments");
  var n = rng.weighted([[0,16],[1,32],[2,32],[3,20]]);
  var chosen = rng.sample(cands, n);
  if (chosen.indexOf("late") >= 0) d.plannedSubmit = d.due + rng.int(1, 6);
  else d.plannedSubmit = d.due - rng.int(0, 3);
  if (chosen.indexOf("no-review") >= 0 && d.approval) d.milestone = d.plannedSubmit + rng.int(6, 20);
  if (chosen.indexOf("did-wrong") >= 0){
    var others = B.DIDS.filter(function(x){ return x.did !== did.did; });
    d.citedDid = rng.pick(others);
  } else d.citedDid = did;
  d.hasDist = chosen.indexOf("no-dist") < 0;
  d.hasPortion = chosen.indexOf("no-class") < 0;
  d.signed = chosen.indexOf("unsigned") < 0;
  d.mediumOk = chosen.indexOf("wrong-medium") < 0;
  if (!d.mediumOk) d.medium = "Printed and mailed in hard copy, three ring binder";
  d.addrOk = chosen.indexOf("wrong-addr") < 0;
  d.citesCdrl = chosen.indexOf("no-cdrl-block") < 0;
  d.commentsDispositioned = chosen.indexOf("no-comments") < 0;
  d.priorComments = d.resubmittal ? rng.int(9, 68) : 0;

  var falseOnes = cands.filter(function(x){ return chosen.indexOf(x) < 0; });
  var shown = rng.shuffle(chosen.concat(rng.sample(falseOnes, B.clamp(5 - chosen.length + 2, 2, 5))));
  var stop = chosen.some(function(x){ return CDRL_DEF[x].sev === "stop"; });
  var act = chosen.length === 0 ? "submit" : (stop ? "return" : "cover");
  d.defects = chosen; d.shown = B.uniq(shown); d.action = act;
  return d;
}
function gradeCDRL(task, resp){
  var t = task.data, checked = resp.findings || [], real = t.defects, lines = [], i;
  var tp = real.filter(function(x){ return checked.indexOf(x) >= 0; });
  var fp = checked.filter(function(x){ return real.indexOf(x) < 0; });
  var fn = real.filter(function(x){ return checked.indexOf(x) < 0; });
  var base = real.length === 0 ? (fp.length === 0 ? 1 : Math.max(0, 1 - fp.length * 0.34))
                               : B.clamp((tp.length - fp.length * 0.6) / real.length, 0, 1);
  var actRight = resp.action === t.action;
  for (i=0;i<tp.length;i++) lines.push({t:"ok",tag:"caught",text: CDRL_DEF[tp[i]].label + ". " + CDRL_DEF[tp[i]].w});
  for (i=0;i<fn.length;i++) lines.push({t:"bad",tag:"missed",text: CDRL_DEF[fn[i]].label + ". " + CDRL_DEF[fn[i]].w});
  for (i=0;i<fp.length;i++) lines.push({t:"warn",tag:"called wrong",text: CDRL_DEF[fp[i]].label + ". Not present in this submittal."});
  var want = CDRL_ACT.filter(function(a){return a.id===t.action;})[0];
  lines.push(actRight ? {t:"ok",tag:"action",text:"Correct action: " + want.t + "."}
                      : {t:"bad",tag:"action",text:"Correct action was " + want.t + ". " + want.d});
  return { score: B.clamp(base*0.75 + (actRight?0.25:0), 0, 1), lines: lines,
    escape: (resp.action === "submit" && fn.some(function(x){return CDRL_DEF[x].sev==="stop";}))
      ? { defect:"cdrl", label:"Deficient deliverable submitted to the customer", doc:t.seq, rev:"" } : null,
    late: t.action !== "modreq" && t.defects.indexOf("late") >= 0 && resp.action === "submit",
    summary: real.length === 0 ? "Compliant submittal" : (tp.length + " of " + real.length + " issues found") };
}

window.BCT1 = {
  genECP:genECP, gradeECP:gradeECP, ROUTE_OPTS:ROUTE_OPTS,
  genIPN:genIPN, gradeIPN:gradeIPN, IPN_OPTS:IPN_OPTS,
  genVariance:genVariance, gradeVariance:gradeVariance, VAR_OPTS:VAR_OPTS,
  genCDRL:genCDRL, gradeCDRL:gradeCDRL, CDRL_DEF:CDRL_DEF, CDRL_ACT:CDRL_ACT
};
})();
