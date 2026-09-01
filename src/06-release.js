/* ============================================================
   Change package release audit.
   A clean, internally consistent package is built first, then
   zero to four discrepancies are injected. Anything not injected
   is provably absent, which is what makes the distractors fair.
   ============================================================ */
(function(){
"use strict";
var B = window.BC, C = window.BCC;

var DEFECTS = {
  "rev-skip": { area:"title", where:"Title block: current revision against proposed revision", sev:"stop",
    label:"Proposed revision letter is out of sequence",
    why:"Revisions advance one letter at a time. A jump means either a revision was released and never recorded, or the drafter guessed." },
  "rev-forbidden": { area:"title", where:"Title block: proposed revision", sev:"stop",
    label:"Proposed revision letter uses a character not permitted for revisions",
    why:"I, O, Q, S, X and Z are not used as revision letters because they read as numerals or as each other on a print." },
  "sig-missing": { area:"approvals", where:"Approvals: a block with no name in it", sev:"stop",
    label:"A required approval block is unsigned",
    why:"A package is not releasable until every discipline the change touches has signed. The vault will take it anyway, which is exactly why you check." },
  "sig-date": { area:"approvals", where:"Approvals: each signature date against the change request date in change control data", sev:"stop",
    label:"An approval is dated before the change request itself",
    why:"Someone signed a change that did not exist yet. Either the date is wrong or the signature was carried over from an earlier package." },
  "sig-indep": { area:"approvals", where:"Approvals: the design engineering name against the checker name", sev:"stop",
    label:"The same person signed as both preparer and checker",
    why:"The check is an independent review. One person cannot be their own independent reviewer." },
  "eff-inverted": { area:"effectivity", where:"Change control data: effectivity", sev:"stop",
    label:"Effectivity range is inverted or impossible",
    why:"An effectivity that starts after it ends cannot be worked on the floor and will not load into status accounting." },
  "eff-delivered": { area:"effectivity", where:"Change control data: effectivity, against the delivered units in program context", sev:"stop",
    label:"Effectivity reaches units already delivered and accepted, with no retrofit direction",
    why:"You cannot quietly change the configuration of hardware the customer already owns. Either the effectivity starts later or the package carries retrofit instructions." },
  "class-under": { area:"classification", where:"Change control data: classification, against the impact worksheet", sev:"stop",
    label:"Classified Class II although the impact worksheet shows a Class I trigger",
    why:"Under classifying is the most expensive mistake in this job. It puts an unapproved change into the product baseline." },
  "class-over": { area:"classification", where:"Change control data: classification, against the impact worksheet", sev:"comment",
    label:"Classified Class I although no Class I trigger is present",
    why:"Over classifying is not dangerous, it is just slow and costly. It sends the government a proposal they did not need to see." },
  "class-nogov": { area:"classification", where:"Change control data: classification, ECP number and government approval", sev:"stop",
    label:"Class I package with no government approval reference",
    why:"A Class I change is not authorized until the contracting officer approves it. No approval reference, no release." },
  "reason-mismatch": { area:"change", where:"Change control data: reason code, against the description of change", sev:"comment",
    label:"Reason code does not match the description of the change",
    why:"Reason codes drive metrics, cost recovery and trend analysis. A wrong code quietly poisons the data." },
  "pl-mismatch": { area:"title", where:"Title block: the two part number fields", sev:"stop",
    label:"Part number in the title block does not match the parts list callout",
    why:"Two different numbers for the same item means the floor will build one and the vault will record the other." },
  "cage-wrong": { area:"title", where:"Title block: CAGE, against the design activity in program context", sev:"comment",
    label:"CAGE code shown is not the design activity for this drawing",
    why:"The CAGE identifies who owns the design. A supplier CAGE on a contractor drawing misroutes every future revision." },
  "icd-missing": { area:"related", where:"Related documents, against the interface row of the impact worksheet", sev:"stop",
    label:"Change affects an interface but no interface control document is listed",
    why:"If the interface moves and the ICD does not, the other side of the interface is building to a document that is now wrong." },
  "sheet-count": { area:"title", where:"Title block: sheets in title block against sheets in package", sev:"comment",
    label:"Sheet count in the title block does not match the sheets in the package",
    why:"A missing sheet is a missing requirement. This is the single easiest discrepancy to find and the one most often waved through." },
  "superseded-ref": { area:"related", where:"Related documents: the cited revision against the released revision", sev:"comment",
    label:"Package references a superseded revision of a specification",
    why:"Citing a dead revision means the item is being built to requirements that were changed for a reason." },
  "cdrl-missing": { area:"change", where:"Change control data: contract deliverable and CDRL sequence", sev:"comment",
    label:"Document is a contract deliverable but no CDRL sequence number is cited",
    why:"If it is not tied to a CDRL line item it will not be scheduled, will not be submitted, and will show up on the customer delinquency report." },
  "baseline-missing": { area:"change", where:"Change control data: baseline affected", sev:"comment",
    label:"No baseline is identified for the affected item",
    why:"Change control only means something relative to a baseline. Without one you are editing a document, not controlling a configuration." },
  "pn-interch": { area:"title", where:"Title block: part number, against the part number of record in program context and the interchangeability row of the impact worksheet", sev:"stop",
    label:"Item is no longer interchangeable but the part number is unchanged",
    why:"A part that will not swap with its predecessor must get a new number. Keeping the old one guarantees the wrong part gets installed later." },
  "sw-nolabel": { area:"change", where:"Change control data: software build label, and related documents", sev:"stop",
    label:"Software change with no build label or version description reference",
    why:"A software configuration item is identified by its build. Without a label there is nothing to audit and nothing to reproduce." },
  "no-effectivity": { area:"effectivity", where:"Change control data: effectivity", sev:"stop",
    label:"Effectivity field is blank on a hardware change",
    why:"Effectivity is the answer to which units get this. Blank means manufacturing decides, and manufacturing should never be the one deciding." }
};

var GROUPS = { "rev-skip":"rev","rev-forbidden":"rev",
  "class-under":"class","class-over":"class","class-nogov":"class",
  "eff-inverted":"eff","eff-delivered":"eff","no-effectivity":"eff" };

var ROLE_ORDER = ["Design Engineering","Checker","Stress Analysis","Materials and Processes",
  "Thermal Engineering","Electrical Engineering","Software Engineering","Systems Engineering",
  "Manufacturing Engineering","Quality Assurance","System Safety","Configuration Management",
  "Program Management","Contracts"];

function requiredRoles(ch){
  var r = ["Design Engineering","Checker","Manufacturing Engineering","Quality Assurance","Configuration Management"];
  var f = ch.flags, tags = C.TEMPLATES.filter(function(t){return t.id===ch.tid;})[0].tags;
  if (ch.isSw) r.push("Software Engineering");
  if (tags.indexOf("structure") >= 0) r.push("Stress Analysis");
  if (tags.indexOf("structure") >= 0 || tags.indexOf("parts") >= 0 || tags.indexOf("mfg") >= 0) r.push("Materials and Processes");
  if (tags.indexOf("thermal") >= 0) r.push("Thermal Engineering");
  if (tags.indexOf("harness") >= 0 || tags.indexOf("electronics") >= 0 || tags.indexOf("comms") >= 0) r.push("Electrical Engineering");
  if (f.indexOf("iface") >= 0 || f.indexOf("perf") >= 0 || f.indexOf("testreq") >= 0) r.push("Systems Engineering");
  if (ch.affectsSafety) r.push("System Safety");
  if (ch.cls === 1) { r.push("Program Management"); r.push("Contracts"); }
  r = B.uniq(r);
  r.sort(function(a,b){ return ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b); });
  return r;
}

function genRelease(rng, world, day, level){
  var ch = C.genChange(rng, world, {});
  var ci = ch.ci;

  var curRev = ci.rev;
  var pkg = {
    docNo: ci.doc, dash: ci.pn.slice(ci.doc.length),
    title: ci.name.toUpperCase() + (ci.type === "sw" ? ", VERSION DESCRIPTION" : ", ASSEMBLY"),
    cage: "8L4C7",
    curRev: curRev,
    propRev: B.nextRev(curRev),
    sheets: rng.int(2, 14),
    sheetsShown: 0,
    cls: ch.cls,
    ecp: ch.cls === 1 ? B.ecpNo(rng, world.prog.key) : null,
    pcoDate: null,
    ecn: B.ecnNo(rng),
    crNo: B.crNo(rng),
    crDay: day - rng.int(6, 22),
    reason: ch.reason,
    baseline: ci.baseline,
    deliverable: rng.chance(0.45),
    cdrl: null,
    effType: ci.type === "sw" ? "build" : rng.pick(["sn","sn","nextassy"]),
    effStart: 0, effEnd: 0, effText: "",
    retrofit: ch.affectsRetrofit,
    swBuild: ci.type === "sw" ? (world.prog.key + "-" + ci.abbr + "-" + rng.int(3,9) + "." + rng.int(0,9) + "." + rng.int(0,40)) : null,
    titleBlockPN: ci.pn,
    partsListPN: ci.pn,
    related: [],
    change: ch,
    sigs: []
  };
  pkg.sheetsShown = pkg.sheets;
  if (pkg.deliverable) pkg.cdrl = "A" + B.pad(rng.int(1, 42), 3);
  if (ch.cls === 1) pkg.pcoDate = day - rng.int(1, 4);

  // effectivity, clean by construction
  var firstOpen = 3;
  for (var u=0; u<world.units.length; u++){ if (!world.units[u].accepted){ firstOpen = world.units[u].sn; break; } }
  if (pkg.effType === "sn"){
    pkg.effStart = rng.int(firstOpen, Math.max(firstOpen, world.units.length - 1));
    pkg.effEnd = world.units.length;
    pkg.effText = "S/N " + B.pad(pkg.effStart,4) + " through S/N " + B.pad(pkg.effEnd,4);
  } else if (pkg.effType === "nextassy"){
    pkg.effText = "Next assembly, effective on release";
  } else {
    pkg.effText = "Build " + pkg.swBuild + " and subsequent";
  }
  if (ch.affectsRetrofit) pkg.effText += ". Retrofit required per NOR " + B.ecnNo(rng) + " for units already accepted.";

  // interchangeability handling, clean by construction
  pkg.newPN = false;
  if (ch.affectsInterch){
    pkg.newPN = true;
    var newPn = ci.pn, guard0 = 0;
    while (newPn === ci.pn && guard0++ < 20) newPn = ci.doc + B.dashNo(rng);
    if (newPn === ci.pn) newPn = ci.doc + "-601";
    pkg.titleBlockPN = newPn;
    pkg.partsListPN = newPn;
  }

  // related documents. Every row carries the revision the vault currently holds,
  // because that is the comparison the analyst actually makes.
  pkg.specRevReleased = B.revAt(rng.int(1,5));
  function rel(type, id, rev){ pkg.related.push({ type:type, id:id, rev:rev, current:rev }); }
  rel("Item specification", ci.spec, pkg.specRevReleased);
  rel("Parts list", "PL" + ci.doc, pkg.propRev);
  if (ch.affectsIface) rel("Interface control document", "ICD-" + world.prog.key + "-" + rng.int(100,899), B.revAt(rng.int(1,4)));
  if (ch.isSw) rel("Software version description", "VDD-" + ci.abbr + "-" + rng.int(20,99), B.revAt(rng.int(0,3)));
  if (ch.affectsSafety) rel("Hazard report", "HR-" + world.prog.key + "-" + rng.int(10,99), "closed");

  // program context: what the analyst has open in the other window
  var accepted = 0, inWork = 0;
  for (var uu=0; uu<world.units.length; uu++){ if (world.units[uu].accepted) accepted = world.units[uu].sn; }
  inWork = world.units.length;
  pkg.ctx = {
    activity: "Meridian Aerospace Systems",
    activityCage: "8L4C7",
    pnOfRecord: ci.pn,
    revOfRecord: ci.rev,
    acceptedThrough: accepted,
    lastUnit: inWork,
    baselineOfRecord: ci.baseline,
    specReleased: pkg.specRevReleased
  };

  // signatures, clean by construction
  var roles = requiredRoles(ch);
  var preparer = B.personName(rng);
  var sigSpan = Math.max(1, Math.min(10, day - pkg.crDay));
  var usedNames = { };
  usedNames[preparer] = 1;
  for (var i=0;i<roles.length;i++){
    var nm = preparer;
    if (roles[i] !== "Design Engineering"){
      var guardN = 0;
      do { nm = B.personName(rng); } while (usedNames[nm] && guardN++ < 30);
      if (usedNames[nm]) nm = nm + " II";
      usedNames[nm] = 1;
    }
    pkg.sigs.push({ role: roles[i], name: nm, day: pkg.crDay + rng.int(1, sigSpan), signed: true });
  }

  /* ---- inject discrepancies ---- */
  var cands = [];
  function ok(id){ return cands.push(id); }
  ok("rev-skip"); ok("rev-forbidden"); ok("sig-missing"); ok("sig-date"); ok("sig-indep");
  ok("reason-mismatch"); ok("pl-mismatch"); ok("cage-wrong"); ok("sheet-count");
  ok("superseded-ref"); ok("baseline-missing");
  if (pkg.effType === "sn"){ ok("eff-inverted"); ok("eff-delivered"); }
  if (ci.type !== "sw") ok("no-effectivity");
  if (ch.cls === 1) { ok("class-under"); ok("class-nogov"); } else ok("class-over");
  if (ch.affectsIface) ok("icd-missing");
  if (pkg.deliverable) ok("cdrl-missing");
  if (ch.affectsInterch) ok("pn-interch");
  if (ch.isSw) ok("sw-nolabel");

  var nDef = rng.weighted([[0,12],[1,26],[2,30],[3,22],[4,10]]);
  if (level >= 3) nDef = Math.min(5, nDef + (rng.chance(0.35) ? 1 : 0));
  var chosen = [], usedGroups = {}, sigHits = 0;
  var order = rng.shuffle(cands);
  for (var k=0;k<order.length && chosen.length < nDef;k++){
    var id = order[k], g = GROUPS[id];
    if (g && usedGroups[g]) continue;
    if (id.indexOf("sig-") === 0){ if (sigHits >= 1) continue; sigHits++; }
    if (g) usedGroups[g] = 1;
    chosen.push(id);
  }

  var applied = {};
  for (var d=0;d<chosen.length;d++){ apply(chosen[d], pkg, rng, world); applied[chosen[d]] = true; }

  // candidate findings shown to the player: all real ones plus plausible false ones.
  // Anything sharing a conflict group with an injected discrepancy is withheld,
  // so a distractor is never arguably true.
  var blockedGroups = {};
  for (var g0=0; g0<chosen.length; g0++){ var gg = GROUPS[chosen[g0]]; if (gg) blockedGroups[gg] = 1; }
  var falseOnes = cands.filter(function(x){
    if (applied[x]) return false;
    var g2 = GROUPS[x];
    return !(g2 && blockedGroups[g2]);
  });
  var nShow = B.clamp(chosen.length + rng.int(4, 6), 6, 10);
  var shown = chosen.concat(rng.sample(falseOnes, Math.max(0, nShow - chosen.length)));
  shown = rng.shuffle(B.uniq(shown));

  var stop = chosen.some(function(x){ return DEFECTS[x].sev === "stop"; });
  var disp = chosen.length === 0 ? "release" : (stop ? "return" : "comments");

  return {
    pkg: pkg,
    defects: chosen,
    shown: shown,
    disposition: disp,
    hours: 1 + Math.round(rng.int(5,16)/10),
    DEF: DEFECTS
  };
}

function apply(id, p, rng, world){
  var ch = p.change;
  switch(id){
    case "rev-skip": p.propRev = B.revAt(B.revIndex(p.curRev) + rng.int(2,3)); break;
    case "rev-forbidden": p.propRev = rng.pick(B.FORBIDDEN_REV); break;
    case "sig-missing": {
      var pool = p.sigs.filter(function(s){ return s.role !== "Design Engineering"; });
      var s = rng.pick(pool); s.signed = false; s.name = "__________"; s.day = null; break;
    }
    case "sig-date": { var s2 = rng.pick(p.sigs); s2.day = p.crDay - rng.int(2, 12); break; }
    case "sig-indep": {
      var prep = p.sigs[0], chk = null;
      for (var i=0;i<p.sigs.length;i++) if (p.sigs[i].role === "Checker") chk = p.sigs[i];
      if (chk) chk.name = prep.name; break;
    }
    case "eff-inverted": { var t = p.effStart; p.effStart = p.effEnd; p.effEnd = Math.max(1, t - 1);
      p.effText = "S/N " + B.pad(p.effStart,4) + " through S/N " + B.pad(p.effEnd,4); break; }
    case "eff-delivered": { p.effStart = 1; p.effText = "S/N 0001 through S/N " + B.pad(p.effEnd || world.units.length,4);
      p.retrofit = false; break; }
    case "no-effectivity": p.effText = ""; break;
    case "class-under": p.cls = 2; p.ecp = null; p.pcoDate = null; break;
    case "class-over": p.cls = 1; p.ecp = B.ecpNo(rng, world.prog.key); p.pcoDate = null; break;
    case "class-nogov": p.ecp = null; p.pcoDate = null; break;
    case "reason-mismatch": {
      var bad = B.REASON_CODES.filter(function(r){ return r.code !== ch.reason && r.code !== "A"; });
      p.reason = rng.pick(bad).code; break;
    }
    case "pl-mismatch": {
      var alt = p.titleBlockPN, guard = 0;
      while (alt === p.titleBlockPN && guard++ < 20) alt = p.change.ci.doc + B.dashNo(rng);
      if (alt === p.titleBlockPN) alt = p.change.ci.doc + "-999";
      p.partsListPN = alt; break;
    }
    case "cage-wrong": p.cage = rng.pick(world.suppliers).cage; break;
    case "icd-missing": p.related = p.related.filter(function(r){ return r.type !== "Interface control document"; }); break;
    case "sheet-count": p.sheetsShown = p.sheets + rng.pick([-2,-1,1,2]); if (p.sheetsShown < 1) p.sheetsShown = p.sheets + 2; break;
    case "superseded-ref": {
      for (var j=0;j<p.related.length;j++) if (p.related[j].type === "Item specification"){
        p.related[j].rev = B.revAt(Math.max(0, B.revIndex(p.specRevReleased) - rng.int(1,2)));
        p.related[j].current = p.specRevReleased;
      } break;
    }
    case "cdrl-missing": p.cdrl = null; break;
    case "baseline-missing": p.baseline = ""; break;
    case "pn-interch": {
      var wasSame = (p.partsListPN === p.titleBlockPN);
      p.titleBlockPN = p.change.ci.pn;
      if (wasSame) p.partsListPN = p.change.ci.pn;
      else if (p.partsListPN === p.titleBlockPN) p.partsListPN = p.change.ci.doc + "-999";
      p.newPN = false; break;
    }
    case "sw-nolabel": p.swBuild = null; if (p.effType === "build") p.effText = "All builds"; 
      p.related = p.related.filter(function(r){ return r.type !== "Software version description"; }); break;
  }
}

function gradeRelease(task, resp){
  var t = task.data, checked = resp.findings || [], disp = resp.disposition;
  var real = t.defects, lines = [], i;
  var tp = real.filter(function(x){ return checked.indexOf(x) >= 0; });
  var fp = checked.filter(function(x){ return real.indexOf(x) < 0; });
  var fn = real.filter(function(x){ return checked.indexOf(x) < 0; });

  var base;
  if (real.length === 0) base = fp.length === 0 ? 1 : Math.max(0, 1 - fp.length * 0.34);
  else base = B.clamp((tp.length - fp.length * 0.6) / real.length, 0, 1);

  var dispRight = disp === t.disposition;
  var score = B.clamp(base * 0.78 + (dispRight ? 0.22 : 0), 0, 1);

  for (i=0;i<tp.length;i++) lines.push({ t:"ok", tag:"caught", text: DEFECTS[tp[i]].label + ". " + DEFECTS[tp[i]].why });
  for (i=0;i<fn.length;i++) lines.push({ t:"bad", tag:"missed", text: DEFECTS[fn[i]].label + ". " + DEFECTS[fn[i]].why });
  for (i=0;i<fp.length;i++) lines.push({ t:"warn", tag:"called wrong", text: DEFECTS[fp[i]].label + ". This one is not present in the package. Calling a clean package dirty costs the originator a cycle." });
  if (real.length === 0 && fp.length === 0) lines.push({ t:"ok", tag:"clean", text:"Package is clean and you said so. That is the right answer about one time in eight." });

  var dispName = { release:"Release to the vault", comments:"Release with comments", return:"Return to originator" };
  if (dispRight) lines.push({ t:"ok", tag:"disposition", text:"Correct disposition: " + dispName[t.disposition] + "." });
  else lines.push({ t:"bad", tag:"disposition", text:"Disposition should have been " + dispName[t.disposition] + ". " +
    (t.disposition === "return" ? "At least one discrepancy in this package is a hard stop, so it goes back."
     : t.disposition === "comments" ? "The discrepancies here are administrative. Release it and write the comments up rather than blocking the floor."
     : "Nothing in this package blocks release.") });

  var escapes = fn.filter(function(x){ return DEFECTS[x].sev === "stop"; });
  return {
    score: score,
    lines: lines,
    escape: (disp !== "return" && escapes.length > 0) ? { defect: escapes[0], label: DEFECTS[escapes[0]].label, doc: t.pkg.docNo, rev: t.pkg.propRev } : null,
    summary: real.length === 0 ? "No discrepancies in the package" : (tp.length + " of " + real.length + " discrepancies found")
  };
}

window.BCR = { genRelease:genRelease, gradeRelease:gradeRelease, DEFECTS:DEFECTS, requiredRoles:requiredRoles };
})();
