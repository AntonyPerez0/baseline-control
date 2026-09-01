/* ============================================================
   Task generators, part three:
   the change control board, the things that go wrong, and the
   decisions that only land on a staff analyst's desk.
   ============================================================ */
(function(){
"use strict";
var B = window.BC, C = window.BCC;

/* ---------------- change control board ---------------- */
var DISP = [
  { id:"approve", t:"Approve for implementation", d:"The change is authorized and goes to the floor." },
  { id:"submit", t:"Approve for submittal to the government", d:"The board agrees with the change, but a Class I change is not authorized until the contracting officer approves it." },
  { id:"cond", t:"Approve with conditions", d:"The change is sound but something in the package has to be fixed first. The condition goes in the minutes with an owner." },
  { id:"defer", t:"Defer pending additional data", d:"The board cannot decide with what is in front of it. Deferring is a real answer, not a failure." },
  { id:"disapprove", t:"Disapprove", d:"The change is not justified. Say so and record why." },
  { id:"return", t:"Return to the originator", d:"The package is not complete enough to act on." }
];
var BLOCKERS = {
  none: null,
  incomplete: { who:"raghu", disp:"return",
    text:"The impact worksheet has no entry for weight and none for test. Half the boxes are blank. This is not a package, it is a request.",
    why:"An incomplete package cannot be evaluated. Returning it costs the originator a cycle, which is cheaper than the board guessing." },
  safety: { who:"bergstrom", disp:"defer",
    text:"Hazard report {hr} is open against this exact failure mode. I will not concur while it is open. Close it or bring me a written residual risk acceptance.",
    why:"An open hazard against the failure mode the change touches means the board does not yet know what it is approving. Defer until safety closes." },
  funding: { who:"salcedo", disp:"defer",
    text:"There is no funding on {clin} for this and no undefinitized action to charge against. If the board authorizes it today, somebody works at risk.",
    why:"Authorizing work with no contract vehicle puts the company at risk and puts you in the middle of it. Defer pending contract action." },
  wip: { who:"iriarte", disp:"cond",
    text:"Effectivity as written catches {n} units already in work. As written I stop the line tomorrow morning.",
    why:"The change is fine. The effectivity is not. Approve it with the condition that effectivity moves, and put the new effectivity in the minutes." },
  benefit: { who:"whitlock", disp:"disapprove",
    text:"I have read this three times and I cannot find the benefit. We are {wk} weeks from the integration gate and this buys us nothing we need.",
    why:"A change with no benefit is churn, and churn near a gate is how programs get hurt. Disapprove and say why in the record." }
};
function genBoardItem(rng, world, day, level){
  var ch = C.genChange(rng, world, {});
  var bk = rng.weighted([["none",26],["incomplete",12],["safety",14],["funding",14],["wip",16],["benefit",10]]);
  if (bk === "safety" && !ch.affectsSafety && rng.chance(0.5)) bk = "none";
  var govApproved = ch.cls === 1 ? rng.chance(0.35) : true;
  var subs = { "{hr}":"HR-" + world.prog.key + "-" + rng.int(10,99), "{clin}":"CLIN 000" + rng.int(2,7),
    "{n}":String(rng.int(4,14)), "{wk}":String(rng.int(2,7)) };
  function fill(s){ var o=s; for (var k in subs) o=o.split(k).join(subs[k]); return o; }

  var pos = [];
  var stock = [
    { who:"fenwick", stance:"comment", text:"For the record I still think this could be handled as a Class II." },
    { who:"okonkwo", stance:"concur", text:"Design concurs. The analysis is in the package." },
    { who:"ferreira", stance:"comment", text:"If any of this touches the flight build I need a version description before it goes out." },
    { who:"achebe", stance:"concur", text:"Mission assurance concurs with the classification as written." },
    { who:"halvorsen", stance:"comment", text:"The supplier can hold the date if we get them direction this week." }
  ];
  pos = rng.sample(stock, 3).map(function(p){ return { who: B.castBy(p.who), stance:p.stance, text:p.text }; });
  var blk = BLOCKERS[bk];
  if (blk) pos.unshift({ who: B.castBy(blk.who), stance:"nonconcur", text: fill(blk.text) });
  else pos.unshift({ who: B.castBy("raghu"), stance:"concur", text:"Quality has no exception. The package is complete and the classification holds." });

  var key;
  if (bk !== "none") key = blk.disp;
  else if (ch.cls === 1 && !govApproved) key = "submit";
  else key = "approve";

  return { ecpNo: B.ecpNo(rng, world.prog.key), ch: ch, blocker: bk, blk: blk,
    govApproved: govApproved, positions: pos, key: key,
    why: blk ? blk.why : (key === "submit"
      ? "Nothing is blocking it, but it is a Class I change and the contracting officer has not approved it. A contractor board can approve a Class I change for submittal, never for implementation."
      : "Nothing outstanding, classification holds, and the approval authority is in the room. Approve it and move on.") };
}
function genCCB(rng, world, day, level){
  var n = level >= 4 ? 4 : 3;
  var items = [];
  for (var i=0;i<n;i++) items.push(genBoardItem(rng, world, day, level));
  return { items: items, chair: level >= 4 ? null : B.castBy("fenwick"),
    youChair: level >= 4, when: day, hours: 3 };
}
function gradeCCB(task, resp){
  var t = task.data, ans = resp.dispositions || [], hits = 0, lines = [], esc = null;
  for (var i=0;i<t.items.length;i++){
    var it = t.items[i], want = DISP.filter(function(d){return d.id===it.key;})[0];
    if (ans[i] === it.key){ hits++; lines.push({t:"ok",tag:it.ecpNo,text:want.t + ". " + it.why}); }
    else {
      lines.push({t:"bad",tag:it.ecpNo,text:"Correct disposition: " + want.t + ". " + it.why});
      if (it.key === "submit" && ans[i] === "approve" && !esc)
        esc = { defect:"ccb-approve", label:"Class I change authorized for implementation without government approval", doc:it.ecpNo, rev:"" };
      if (it.key === "defer" && it.blocker === "safety" && ans[i] === "approve" && !esc)
        esc = { defect:"ccb-safety", label:"Change approved over an open hazard report", doc:it.ecpNo, rev:"" };
    }
  }
  return { score: hits / t.items.length, lines: lines, escape: esc,
    summary: hits + " of " + t.items.length + " dispositions correct" };
}

/* ---------------- events ---------------- */
var EVENTS = [
  { id:"walkup", who:"okonkwo", title:"A package walked to your desk",
    text:"{who} is standing at your desk with a change package for {ci}. The build gate is Thursday. The checker signature block is empty. He says the checker reviewed it on a screen share yesterday and is out sick, and asks you to release it and pick up the signature next week.",
    opts:[
      { t:"Release it and track the signature as an open item", k:false, w:"There is no such thing as a conditional release. The vault does not know the difference between a package you meant to fix and one you forgot." },
      { t:"Hold the release and ask the checker's lead to designate an alternate checker today", k:true, w:"The requirement is an independent check, not a specific person. Getting an alternate designated takes an hour and keeps the release legitimate." },
      { t:"Sign the checker block yourself since you reviewed it", k:false, w:"You are not the checker, and configuration management signing an engineering check is exactly the audit finding that ends careers." },
      { t:"Return it and tell him to come back when the checker is well", k:false, w:"Technically correct and unhelpful. There is a legitimate path that holds both the schedule and the process, and part of the job is finding it." }
    ], meters:{ integrity:5, schedule:0, confidence:2 } },

  { id:"spillage", who:"raghu", title:"A drawing left the building",
    text:"A supplier quality engineer forwarded a controlled drawing for {ci} to a personal email account so he could read it on the train. He tells you himself, an hour later, and asks whether it is a problem.",
    opts:[
      { t:"Report it through the security incident process immediately and preserve the record", k:true, w:"Self reported, promptly reported, and documented is the best version of a bad day. Sitting on it is what turns an incident into a case." },
      { t:"Tell him to delete it and consider the matter closed", k:false, w:"You do not get to decide that. Deleting evidence of an incident makes it worse and puts it on you." },
      { t:"Log it as a CM discrepancy and address it at the next board", k:false, w:"Wrong channel. A control failure on protected data is a security matter, not a configuration matter." },
      { t:"Ask him to write it up himself and send it to you first", k:false, w:"Filtering an incident report through the person who caused it is not a process." }
    ], meters:{ integrity:3, confidence:3 } },

  { id:"stopship", who:"halvorsen", title:"Stop ship from the supplier",
    text:"{sup} has issued a notice that a heat treat oven was out of calibration for six weeks. Parts for {ci} from that window are installed on two units in integration and one already delivered.",
    opts:[
      { t:"Pull the affected lot numbers, map them to serial numbers through the as built records, and quarantine before anyone touches anything else", k:true, w:"Everything else depends on knowing exactly which units are affected. The as built record is the whole reason status accounting exists." },
      { t:"Stop all work on the program until the supplier reports", k:false, w:"Blunt and expensive. Scope the exposure first, then stop only what is exposed." },
      { t:"Wait for the supplier's formal corrective action report before acting", k:false, w:"You do not get to wait when hardware is moving. Their paperwork can catch up to your containment." },
      { t:"Write a waiver to accept the affected parts based on the supplier's assurance", k:false, w:"A waiver before an investigation is not an engineering judgment, it is a wish." }
    ], meters:{ integrity:6, confidence:4, audit:4 } },

  { id:"datacall", who:"salk", title:"Data call from the customer",
    text:"{who} needs a configuration status accounting report showing the as built configuration of every delivered unit, with open changes and retrofit status, by close of business tomorrow. Your standard report runs monthly and the last one is three weeks old.",
    opts:[
      { t:"Run the report fresh from the vault against today's data and mark the extraction date and any known gaps", k:true, w:"The extraction date and the caveats are the report. A number without a date is a rumor." },
      { t:"Send the three week old report, it is the released version", k:false, w:"It answers a question nobody asked. Status accounting that is not current is not status accounting." },
      { t:"Ask for a two week extension so the monthly cycle can catch up", k:false, w:"You can always run it now. Asking for time you do not need spends credibility you do." },
      { t:"Send the raw vault export and let them sort it", k:false, w:"Handing over an unreduced export is not a deliverable and it invites questions you will spend a week answering." }
    ], meters:{ confidence:6, schedule:2 } },

  { id:"latesdrl", who:"halvorsen", title:"Subcontractor data is late again",
    text:"{sup} has missed the SDRL for the {ci} qualification test report for the third consecutive month. Their program manager says it is coming and asks you to stop copying the contracts organization on the reminders.",
    opts:[
      { t:"Keep contracts copied, log the delinquency, and ask contracts to address it in the next supplier review", k:true, w:"Data requirements flow down through the subcontract. Once you take contracts off the thread you have given up the only leverage that exists." },
      { t:"Drop contracts from the thread to preserve the working relationship", k:false, w:"The relationship you preserve is with the person making you late." },
      { t:"Escalate directly to the supplier's vice president", k:false, w:"Skipping contracts on a contractual matter is how you end up with two conversations and no authority in either." },
      { t:"Close the SDRL as satisfied and reopen it when the report arrives", k:false, w:"Falsifying a delivery record. Nothing else needs to be said." }
    ], meters:{ schedule:4, confidence:3 } },

  { id:"vaultdown", who:"ferreira", title:"The vault is down",
    text:"The product data management system is down for an unplanned outage on the day of a build release. Manufacturing is asking whether they can work from a PDF someone saved to a shared drive last week.",
    opts:[
      { t:"No. Hold the work, and if it truly cannot wait, issue a controlled temporary release with a documented recall when the vault returns", k:true, w:"A file on a shared drive is not a released document. If the work genuinely cannot wait there is a controlled way to do it, and it ends with the temporary copies coming back." },
      { t:"Yes, the PDF was correct last week", k:false, w:"Last week is not a revision. That is exactly how a superseded revision gets built." },
      { t:"Yes, if the shop supervisor confirms the revision verbally", k:false, w:"Verbal revision confirmation has caused real hardware to be scrapped." },
      { t:"Tell them to wait and say nothing else", k:false, w:"Half right. Holding the work is correct, but leaving them without a path is how the shared drive copy gets used anyway." }
    ], meters:{ integrity:5, schedule:2 } },

  { id:"classpressure", who:"fenwick", title:"A quiet suggestion",
    text:"{who} catches you after the board. The {ci} change you classified Class I would need a contracting officer approval that will take five weeks the program does not have. He points out that if the weight impact were assessed against the system allocation instead of the item allocation, it would be inside the limit, and asks you to take another look.",
    opts:[
      { t:"Reassess honestly against the correct allocation, document the basis, and hold the classification if it holds", k:true, w:"Taking another look is fine. Taking another look with a predetermined answer is not. Write down the basis so the next person can see how you got there." },
      { t:"Reclassify it Class II, since a defensible argument exists", k:false, w:"A defensible argument you constructed backwards from the answer you wanted is the definition of a finding." },
      { t:"Refuse to discuss it and report the conversation", k:false, w:"He asked you to check something. That is allowed. Escalating a legitimate question burns a working relationship you need." },
      { t:"Ask the government CM lead informally what she would accept", k:false, w:"Shopping a classification to the customer before you have done the analysis tells them you do not have a process." }
    ], meters:{ integrity:7, confidence:3 } },

  { id:"drawback", who:"iriarte", title:"Built to the wrong revision",
    text:"During a routine floor check you find that two {ci} assemblies were built to revision {oldrev}. Revision {rev} was released eleven days ago and is effective on those units.",
    opts:[
      { t:"Write the nonconformance, quarantine the two units, and have engineering disposition them through the material review board", k:true, w:"It is a nonconformance the moment it is found. The disposition may still end up as use as is, but that decision belongs to the board, not to you and not to the floor." },
      { t:"Have the floor rework them to the current revision immediately", k:false, w:"Rework may well be the answer, but the disposition is a board decision and the record has to exist first." },
      { t:"Move the effectivity of the change to start after these two units", k:false, w:"Changing effectivity to make a nonconformance disappear is falsifying the baseline." },
      { t:"Note it in the next status accounting report", k:false, w:"Two units of nonconforming hardware are moving through integration while you wait for a monthly report." }
    ], meters:{ integrity:5, audit:4 } },

  { id:"dcma", who:"salk", title:"A government CM assessment",
    text:"The government team is on site for a configuration management assessment. They have pulled a random sample of twelve released change packages from the last quarter and want a walkthrough of the release process, with evidence.",
    opts:[
      { t:"Walk them through the process as written in the CM plan, then pull the evidence live from the vault in front of them", k:true, w:"Live from the system, against the plan you actually wrote, is the only demonstration that means anything. Prepared exhibits invite the question of what is not in the exhibit." },
      { t:"Present a prepared package of the twelve best examples", k:false, w:"They picked the sample for a reason. Substituting your own is the finding." },
      { t:"Ask to reschedule so you can review the sample first", k:false, w:"Asking for time to review your own released records tells them exactly what they need to know." },
      { t:"Walk the process but keep the vault out of it", k:false, w:"The vault is the process. Everything else is a slide." }
    ], meters:{ audit:8, confidence:5 } },

  { id:"software", who:"ferreira", title:"Which build actually flew",
    text:"An anomaly on {sn} needs a software forensic answer: which build was loaded at the time. The build label in the test log reads 5.2.1. The version description document delivered under the CDRL lists 5.2.0, and the source repository tag for 5.2.1 was moved after the fact.",
    opts:[
      { t:"Treat the configuration as unknown until it can be reproduced from a controlled record, and raise it as a configuration control failure", k:true, w:"A tag that moved is not a record. Saying the configuration is unknown is uncomfortable and it is the truth, and the truth is what the anomaly investigation needs." },
      { t:"Go with 5.2.1, that is what the test log says", k:false, w:"The test log records what someone typed, not what was loaded." },
      { t:"Go with 5.2.0, the delivered version description is the contractual record", k:false, w:"The contractual record is authoritative about what you delivered, not about what was running on the unit." },
      { t:"Rebuild from the current source and compare", k:false, w:"A rebuild of moved source proves nothing about what existed before it moved." }
    ], meters:{ integrity:6, audit:5 } },

  { id:"mergefix", who:"whitlock", title:"Two changes, one drawing",
    text:"Two change notices against the {ci} drawing are in work at the same time by different groups. Both start from revision {oldrev}. The first releases tomorrow. The second is already checked and signed against {oldrev}.",
    opts:[
      { t:"Hold the second, have it re checked against the newly released revision, and release it as the next revision", k:true, w:"A package checked against a revision that no longer exists has not been checked. Re baselining it costs a day. Not re baselining it costs a unit." },
      { t:"Release both, the changes do not overlap", k:false, w:"You know they do not overlap because someone said so. The revision block will show one of them silently reverting the other." },
      { t:"Release the second first, since it is already signed", k:false, w:"Order of release does not fix the problem, it just moves which change gets lost." },
      { t:"Combine them into one change notice and release together", k:false, w:"Tempting, and it destroys the traceability of two separately justified changes. Sometimes right, usually not, and never without both originators agreeing." }
    ], meters:{ integrity:5 } },

  { id:"newanalyst", who:"raghu", title:"Someone is asking you how",
    text:"A new associate analyst asks you why the release audit checks the revision letter sequence at all, since the system assigns it automatically.",
    opts:[
      { t:"Explain that the system assigns it from what is in the vault, and a gap means a revision exists somewhere the vault does not know about", k:true, w:"The check is not about the letter. It is about what the letter reveals: a release that happened outside the system." },
      { t:"Tell her it is a legacy check and mostly ceremonial", k:false, w:"Teaching someone that a control is ceremonial is how the control stops working two people from now." },
      { t:"Tell her to just follow the checklist", k:false, w:"A checklist nobody understands gets executed badly the first time it matters." },
      { t:"Tell her the auditors ask about it", k:false, w:"True, and it teaches her to work for the audit instead of for the baseline." }
    ], meters:{ integrity:2, confidence:2 } }
];
function genEvent(rng, world, day, level, used){
  var pool = EVENTS.filter(function(e){ return used.indexOf(e.id) < 0; });
  if (!pool.length) pool = EVENTS;
  var e = rng.pick(pool);
  var ci = rng.pick(world.cis), sup = rng.pick(world.suppliers);
  var who = B.castBy(e.who);
  var subs = { "{ci}":ci.name, "{sup}":sup.name, "{who}":who.name,
    "{sn}":B.serial(rng.int(1, world.units.length)),
    "{rev}":ci.rev, "{oldrev}":B.revAt(Math.max(0, ci.revI - 1)) };
  function fill(s){ var o=s; for (var k in subs) o=o.split(k).join(subs[k]); return o; }
  var order = rng.shuffle([0,1,2,3]);
  return { eid:e.id, who:who, title:e.title, text: fill(e.text),
    opts: order.map(function(i){ return { t:e.opts[i].t, k:e.opts[i].k, w:e.opts[i].w }; }),
    meters: e.meters, hours: 1 };
}
function gradeEvent(task, resp){
  var t = task.data, o = t.opts[resp.pick];
  var right = !!(o && o.k);
  var lines = [];
  lines.push(right ? {t:"ok",tag:"call",text:o.w} : {t:"bad",tag:"call",text:o.w});
  if (!right) for (var i=0;i<t.opts.length;i++) if (t.opts[i].k)
    lines.push({t:"n",tag:"better",text:t.opts[i].t + ". " + t.opts[i].w});
  return { score: right ? 1 : 0, lines: lines, escape:null, eventMeters: t.meters, eventRight: right,
    summary: right ? "Handled well" : "Handled poorly" };
}

/* ---------------- senior decisions, E4 and E5 ---------------- */
var SENIOR = [
  { lv:4, title:"Two sources of truth", who:"whitlock",
    text:"Structures has been releasing a model based definition with product manufacturing information in the CAD model, while the shop still works from a derived two dimensional drawing that a drafter updates by hand. On {ci} the model and the drawing now disagree about a fillet radius.",
    opts:[
      { t:"Designate one authoritative source in the CM plan, put the other under derived status with an automated regeneration, and reconcile the existing disagreements before the next release", k:true,
        w:"A digital thread is not a tool purchase, it is a decision about which artifact is authoritative and what happens to everything derived from it. Until that is written down you have two baselines." },
      { t:"Keep both and require engineering to update both at each release", k:false, w:"Two manually maintained authoritative artifacts diverge. Always. The only question is when you find out." },
      { t:"Let the shop keep working from the drawing and treat the model as reference", k:false, w:"That is a defensible answer only if you say so in the CM plan and stop calling the model a deliverable. Left undeclared it is the same problem." },
      { t:"Escalate to the customer for direction", k:false, w:"The customer bought a product, not a tooling philosophy. This one is yours." }
    ] },
  { lv:4, title:"The interface nobody owns", who:"salk",
    text:"{ci} sits across a boundary between your segment and a partner contractor. Both sides have released hardware against an interface control document that has been at draft revision for seven months because neither program office will fund the joint review.",
    opts:[
      { t:"Stop releasing against the draft, get the ICD into a joint change board with a named government owner, and put the exposure in the program risk register in writing", k:true,
        w:"An unbaselined interface with hardware being built against it is the highest consequence configuration risk there is. The fix is governance, and the first step is making the risk visible to people who can fund it." },
      { t:"Keep releasing and reconcile at integration", k:false, w:"Reconciling two independently built sides of an interface at integration is a schedule event with your name on it." },
      { t:"Baseline your side unilaterally and notify the partner", k:false, w:"An interface baselined by one side is not an interface agreement." },
      { t:"Have the chief engineers sign an informal agreement", k:false, w:"Better than nothing and still not a baseline. Engineers change jobs, documents do not." }
    ] },
  { lv:4, title:"One board or four", who:"fenwick",
    text:"Four programs at the site each run their own change board with different thresholds, different forms and different classification practice. A common avionics module is used by three of them and has been changed three different ways.",
    opts:[
      { t:"Establish a single board for the shared item with the programs as members, keep the program boards for program unique items, and write the split into each CM plan", k:true,
        w:"Governance follows the item, not the organization chart. The shared item needs one baseline and one board. Everything else can stay local." },
      { t:"Consolidate all four boards into one enterprise board", k:false, w:"You would spend every board hearing items that concern one program and bore the other three. Boards that waste people's time stop being attended." },
      { t:"Leave the boards alone and add a coordination meeting", k:false, w:"A coordination meeting with no authority is a status meeting. The item still has three baselines." },
      { t:"Have each program fork the module into its own part number", k:false, w:"Sometimes correct, usually a surrender. Three sustaining tails instead of one, forever." }
    ] },
  { lv:4, title:"The customer wants your data live", who:"salk",
    text:"The government program office wants read access into the product data environment instead of receiving monthly status accounting reports. Half of the environment holds data from three other programs, some of it compartmented.",
    opts:[
      { t:"Offer a scoped access path that exposes only this program's data, agree in writing what is authoritative and what is work in progress, and keep the contractual report as the deliverable of record", k:true,
        w:"Access is a good thing and it needs a boundary and a definition. Without agreement on what counts as released, a customer looking at in work data will react to something that is not real." },
      { t:"Decline. The reports are the contract deliverable", k:false, w:"Contractually safe and strategically dumb. This is exactly the direction acquisition is moving." },
      { t:"Grant broad access, they are the customer", k:false, w:"Other programs' data is not yours to expose, and neither is unreleased work in progress." },
      { t:"Grant access and stop producing the report", k:false, w:"The report is a CDRL. It goes away when the CDRL goes away, not before." }
    ] },
  { lv:5, title:"Replacing the vault", who:"achebe",
    text:"The business area is considering replacing a twenty year old product data management system used by four sites. Two sites have heavily customized it and one runs a legacy program that will still be in sustainment in fifteen years.",
    opts:[
      { t:"Set an enterprise target, migrate new starts first, keep the legacy program on the old system with a defined data escrow and a retirement date tied to the program, and fund the customization retirement explicitly", k:true,
        w:"Nobody has ever completed a big bang PLM migration on schedule. Sequencing by program lifecycle and paying down customization deliberately is the only version of this that finishes." },
      { t:"Migrate all four sites at once to force convergence", k:false, w:"A simultaneous cutover across four sites with different customizations is how a business area loses a year of release throughput." },
      { t:"Keep the old system and modernize around it", k:false, w:"Defensible for one more cycle and it compounds. Eventually nobody left knows how the customizations work." },
      { t:"Let each site choose", k:false, w:"That is the situation you are trying to fix." }
    ] },
  { lv:5, title:"Tailoring the standard", who:"salk",
    text:"A new contract cites EIA-649 with no tailoring and the statement of work asks for a configuration management plan in thirty days. The program is a two year risk reduction effort with eleven people and one deliverable article.",
    opts:[
      { t:"Tailor hard in the CM plan: identify a small number of configuration items, use a lightweight board, keep full identification and status accounting, and get the tailoring approved with the plan", k:true,
        w:"EIA-649 is principle based precisely so it can scale. The principles do not change on a small program, the ceremony does. Tailoring approved in the plan is what makes it legitimate rather than convenient." },
      { t:"Apply the full enterprise process, it is proven", k:false, w:"Enterprise process on an eleven person program consumes the program. That is not rigor, it is overhead." },
      { t:"Ask the customer to remove the CM requirement given the scale", k:false, w:"Identification and status accounting matter more on a one article program, not less. The article still has to be reproducible." },
      { t:"Write a minimal plan and handle the details as they come up", k:false, w:"A plan written to be vague gets interpreted differently by every person who reads it." }
    ] },
  { lv:5, title:"An escape reaches the field", who:"achebe",
    text:"A fielded unit failed. The investigation traces the cause to a change released four years ago whose effectivity was recorded incorrectly, so eight units were built to a configuration nobody has a record of. The analyst who released it left the company.",
    opts:[
      { t:"Reconstruct the actual as built configuration of all eight units from manufacturing and inspection records, report the reconstruction and its uncertainty to the customer, and fix the process control that let it happen", k:true,
        w:"Three obligations, in order: know what is actually out there, tell the customer honestly including what you cannot establish, and close the hole. Skipping the third guarantees a fourth conversation." },
      { t:"Correct the effectivity record to what it should have been and move on", k:false, w:"Rewriting a record to what it should have said is falsification, and it destroys the only evidence of what actually happened." },
      { t:"Retrofit all eight units to the current configuration without further investigation", k:false, w:"Expensive, and it erases the evidence before you understand the failure." },
      { t:"Report the failure and treat the record gap as a separate internal matter", k:false, w:"The record gap is the finding. Reporting the failure without it gives the customer a false picture of the fleet." }
    ] },
  { lv:5, title:"What the vice president wants to hear", who:"fenwick",
    text:"A program vice president asks you for one number that tells him whether the baseline is under control, so he can put it in a monthly chart.",
    opts:[
      { t:"Give him a small set instead: aging of open changes, release cycle time, escapes found after release, and delinquent data items, and explain that any single number can be gamed", k:true,
        w:"One number invites optimization of that number. Four numbers that pull in different directions are much harder to fake and much more honest." },
      { t:"Give him the count of open changes", k:false, w:"Trivially improved by closing easy changes and deferring hard ones." },
      { t:"Give him the on time release percentage", k:false, w:"Trivially improved by releasing incomplete packages." },
      { t:"Tell him it cannot be reduced to a chart", k:false, w:"True and useless. He is going to put something on that chart. Better it is yours." }
    ] }
];
function genSenior(rng, world, day, level){
  var pool = SENIOR.filter(function(s){ return s.lv <= level; });
  var s = rng.pick(pool.length ? pool : SENIOR);
  var ci = rng.pick(world.cis);
  var order = rng.shuffle([0,1,2,3]);
  return { title:s.title, who:B.castBy(s.who), text:s.text.split("{ci}").join(ci.name),
    opts: order.map(function(i){ return { t:s.opts[i].t, k:s.opts[i].k, w:s.opts[i].w }; }), hours: 2 };
}
function gradeSenior(task, resp){
  var t = task.data, o = t.opts[resp.pick], right = !!(o && o.k), lines = [];
  lines.push(right ? {t:"ok",tag:"call",text:o.w} : {t:"bad",tag:"call",text:o.w});
  if (!right) for (var i=0;i<t.opts.length;i++) if (t.opts[i].k) lines.push({t:"n",tag:"better",text:t.opts[i].t + ". " + t.opts[i].w});
  return { score: right ? 1 : 0, lines: lines, escape:null, summary: right ? "Sound call" : "Not the call" };
}

window.BCT3 = {
  genCCB:genCCB, gradeCCB:gradeCCB, DISP:DISP,
  genEvent:genEvent, gradeEvent:gradeEvent, EVENTS:EVENTS,
  genSenior:genSenior, gradeSenior:gradeSenior
};
})();
