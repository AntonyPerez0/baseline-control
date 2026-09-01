/* ============================================================
   The change catalog.
   Every entry carries the impact flags that decide its class,
   so classification is graded against a rule, never a coin flip.

   Class I triggers used here follow the long standing defense
   practice codified in EIA-649-1: a change is Class I when it
   affects an approved baseline in any of these ways.
   ============================================================ */
(function(){
"use strict";
var B = window.BC;

var FLAG_TEXT = {
  fff:      "Form, fit or function of a configuration item under government configuration control",
  iface:    "An interface defined in a released interface control document",
  safety:   "Safety",
  weight:   "Weight, balance or moment of inertia beyond the specified limit",
  perf:     "Specified performance, reliability or maintainability",
  cost:     "Contract cost, price or fee",
  sched:    "Contract delivery schedule or a contract milestone",
  gfe:      "Government furnished equipment or property",
  techman:  "Delivered operation, maintenance or training manuals",
  testreq:  "Approved qualification or acceptance test requirements",
  interch:  "Interchangeability, substitutability or replaceability",
  source:   "Sources on a source control drawing",
  retrofit: "Retrofit of delivered or accepted units"
};
var FLAG_KEYS = Object.keys(FLAG_TEXT);

/* ctx values a template may be dressed with:
   stopwork   production has stopped
   hazard     an open hazard likely to cause serious injury or major damage
   hazpot     a potentially hazardous condition, not immediate
   milestone  an approved contract milestone slips without this change
   savings    a significant cost saving that expires if not acted on now
   none                                                                     */

var T = [];
function tpl(o){ T.push(o); }

/* ---------- unmistakably Class I ---------- */
tpl({ id:"mat-sub", cls:1, txt:"Substitute the {ci} machined fitting material from 7075-T73 aluminum to 15-5PH stainless to recover a negative stress margin found in the updated coupled loads analysis.",
  flags:["fff","weight","perf"], ctx:["milestone","none","hazpot"], reason:"A", tags:["structure"] });
tpl({ id:"fpa-temp", cls:1, txt:"Raise the {ci} focal plane operating setpoint from 62 K to 68 K to recover cryocooler lift margin. Sensitivity requirement in the item spec is unchanged but the acceptance test thermal profile must be rewritten.",
  flags:["perf","testreq"], ctx:["none","milestone"], reason:"A", tags:["payload"] });
tpl({ id:"redundant-htr", cls:1, txt:"Add a redundant survival heater circuit to the {ci} propellant line, including a new harness branch and two additional thermistors.",
  flags:["fff","weight","iface","cost","sched"], ctx:["none","hazpot"], reason:"A", tags:["thermal"] });
tpl({ id:"connector", cls:1, txt:"Change the {ci} payload data connector from a 37 pin to a 55 pin arrangement to carry four added telemetry channels.",
  flags:["fff","iface","interch","retrofit","cost"], ctx:["none","milestone"], reason:"C", tags:["harness"] });
tpl({ id:"qual-relax", cls:1, txt:"Reduce the {ci} random vibration qualification level from 14.1 Grms to 11.8 Grms based on a revised launch environment from the launch service provider.",
  flags:["testreq","perf"], ctx:["none","savings"], reason:"K", tags:["test"] });
tpl({ id:"heater-short", cls:1, txt:"Correct a harness wiring error on {ci} that shorted a survival heater return to chassis during thermal vacuum. Two units are already wired to the erroneous configuration and the line is holding.",
  flags:["safety","retrofit","perf"], ctx:["stopwork"], reason:"J", tags:["harness","safety"] });
tpl({ id:"dmsms", cls:1, txt:"Replace the discontinued radiation hardened FPGA in the {ci} with a device from a second source. The replacement is dimensionally identical but requires requalification and a new source on the source control drawing.",
  flags:["source","testreq","cost"], ctx:["milestone","none"], reason:"E", tags:["electronics"] });
tpl({ id:"ballast", cls:1, txt:"Add 1.24 kg of ballast to the {ci} to bring the observatory center of gravity inside the launch vehicle envelope. Mass allocation is exceeded by 0.31 kg after the addition.",
  flags:["weight","fff","perf"], ctx:["milestone","none"], reason:"A", tags:["structure"] });
tpl({ id:"safemode", cls:1, txt:"Modify the {ci} safe mode entry threshold from three consecutive missed heartbeats to five, to stop spurious safings seen in the flatsat.",
  flags:["perf","testreq"], ctx:["none","hazpot","milestone"], reason:"A", tags:["software"] });
tpl({ id:"deltest", cls:1, txt:"Delete the low level continuity test point from the {ci} acceptance test procedure. The step was found redundant with the automated harness check.",
  flags:["testreq","perf"], ctx:["savings","none"], reason:"F", tags:["test"] });
tpl({ id:"gse-qty", cls:1, txt:"Increase the delivered quantity of {ci} from two units to four so the second integration cell can run in parallel.",
  flags:["cost","sched"], ctx:["milestone","none"], reason:"H", tags:["gse"] });
tpl({ id:"bolt-pattern", cls:1, txt:"Change the {ci} interface bolt pattern from a 24 point 1194 mm circle to a 30 point 1215 mm circle to match the reassigned launch vehicle.",
  flags:["fff","iface","interch","retrofit","cost","sched"], ctx:["milestone"], reason:"K", tags:["structure"] });
tpl({ id:"manual", cls:1, txt:"Revise the delivered operator manual procedure for {ci} safing to add a two person verification step before propellant valve actuation.",
  flags:["techman","safety"], ctx:["hazpot","none"], reason:"G", tags:["ops"] });
tpl({ id:"gfe-swap", cls:1, txt:"Substitute contractor owned test equipment for the government furnished spectrum analyzer used in {ci} acceptance test, since the government asset is committed elsewhere.",
  flags:["gfe","cost"], ctx:["milestone","none"], reason:"H", tags:["gse"] });
tpl({ id:"preload", cls:1, txt:"Tighten the {ci} bearing preload band from 44 to 62 N down to 50 to 56 N following a life test anomaly at the supplier.",
  flags:["perf","retrofit","testreq"], ctx:["hazpot","stopwork","none"], reason:"J", tags:["mechanism"] });
tpl({ id:"crypto-iface", cls:1, txt:"Change the {ci} key fill port protocol to the updated government cryptographic standard, which alters the ground interface message format.",
  flags:["iface","perf","testreq","techman"], ctx:["milestone","none"], reason:"K", tags:["comms"] });

/* ---------- traps that look minor but are Class I ---------- */
tpl({ id:"surface-finish", cls:1, trap:"looks-minor",
  txt:"Change the {ci} bearing journal surface finish callout from 63 to 32 microinch to improve wear life. No dimension changes.",
  flags:["perf","interch"], ctx:["none"], reason:"A", tags:["mechanism"],
  why:"A finish change on a wear surface changes the performance and life of the item. The part is no longer the same item it was qualified as, so this is not a drafting correction." });
tpl({ id:"fastener-alloy", cls:1, trap:"looks-minor",
  txt:"Substitute an alternate fastener on {ci} with identical thread, head and grip dimensions but A286 alloy in place of the currently specified titanium.",
  flags:["fff","interch","perf"], ctx:["savings","none"], reason:"F", tags:["structure"],
  why:"Same envelope does not mean interchangeable. Different alloy means different strength and different galvanic behavior, so form fit and function are affected." });
tpl({ id:"tol-open", cls:1, trap:"looks-minor",
  txt:"Open the {ci} bore tolerance from plus or minus 0.005 to plus or minus 0.010 inch to improve first pass yield at the machine shop.",
  flags:["fff","interch","perf"], ctx:["savings","stopwork","none"], reason:"F", tags:["structure"],
  why:"Loosening a tolerance changes the fit envelope. Parts built to the new limits may not be interchangeable with parts already built and accepted." });
tpl({ id:"conn-move", cls:1, trap:"looks-minor",
  txt:"Move the {ci} test connector 0.40 inch outboard to improve technician access during integration. The mating harness bracket is unchanged.",
  flags:["fff","iface","interch"], ctx:["none"], reason:"H", tags:["harness"],
  why:"Moving a connector changes the physical interface, which is fit. The harness may reach today and not reach on the next build." });
tpl({ id:"sw-const", cls:1, trap:"looks-minor",
  txt:"Change a hard coded gain constant in the {ci} attitude loop from 0.84 to 0.79 to damp a residual oscillation seen in simulation.",
  flags:["perf","testreq"], ctx:["milestone","none"], reason:"A", tags:["software"],
  why:"Software is a configuration item. A change to a control constant changes specified performance and invalidates the regression evidence behind the current build." });

/* ---------- unmistakably Class II ---------- */
tpl({ id:"typo", cls:2, txt:"Correct a misspelling in the {ci} drawing title block and add the missing revision block entry for the previous revision.",
  flags:[], ctx:["none"], reason:"L", tags:["drafting"] });
tpl({ id:"clarify-note", cls:2, txt:"Add a clarifying note to the {ci} drawing stating that the existing thread callout is per ASME B1.1. No requirement is added or removed.",
  flags:[], ctx:["none"], reason:"L", tags:["drafting"] });
tpl({ id:"supplier-renum", cls:2, txt:"Update the supplier part number on the {ci} parts list. The supplier renumbered an identical item with no design, material or process change, and the qualification remains valid.",
  flags:[], ctx:["none"], reason:"M", tags:["parts"] });
tpl({ id:"traveler-seq", cls:2, txt:"Swap the order of two non critical steps in the {ci} shop traveler so the harness dress happens before the blanket install. No released design data changes.",
  flags:[], ctx:["none"], reason:"H", tags:["mfg"] });
tpl({ id:"redraw", cls:2, txt:"Redraw section B-B of the {ci} drawing at a larger scale for legibility. No dimensions, tolerances or notes change.",
  flags:[], ctx:["none"], reason:"L", tags:["drafting"] });
tpl({ id:"flag-note", cls:2, txt:"Correct a drafting error on {ci} where flag note 3 pointed at the wrong balloon. The note itself and the item it applies to are unchanged.",
  flags:[], ctx:["none"], reason:"L", tags:["drafting"] });
tpl({ id:"ref-rev", cls:2, txt:"Update the reference document revision letter cited on the {ci} drawing to the revision currently released. The referenced content is unchanged for this application.",
  flags:[], ctx:["none"], reason:"L", tags:["drafting"] });
tpl({ id:"alt-lube", cls:2, txt:"Add an alternate lubricant to the {ci} drawing from the approved materials list. The alternate is already qualified for this application and the item remains fully interchangeable.",
  flags:[], ctx:["none"], reason:"M", tags:["parts"] });

/* ---------- traps that look major but are Class II ---------- */
tpl({ id:"mass-in-margin", cls:2, trap:"looks-major",
  txt:"Add a 40 gram bonded doubler to the {ci} panel to cure a local buckling margin. Item mass allocation is 18.6 kg with 3.6 kg of margin remaining and the specified limit is not exceeded.",
  flags:[], ctx:["none"], reason:"A", tags:["structure"],
  why:"Weight only drives Class I when it pushes past the specified limit. Inside the allocation with margin intact and no other baseline impact, this stays inside the house." });
tpl({ id:"process-internal", cls:2, trap:"looks-major",
  txt:"Change the {ci} internal cleaning process from vapor degrease to aqueous ultrasonic. The released design data, the material callouts and the acceptance criteria are unchanged and the item remains fully interchangeable.",
  flags:[], ctx:["savings","none"], reason:"F", tags:["mfg"],
  why:"A manufacturing process change that leaves the released design and the item itself unchanged is a contractor internal matter." });
tpl({ id:"vendor-plant", cls:2, trap:"looks-major",
  txt:"The supplier is moving {ci} production from their Tucson plant to their Chandler plant. Same drawings, same tooling, same qualified processes, same personnel certifications, and the source control drawing lists the company, not the plant.",
  flags:[], ctx:["none"], reason:"M", tags:["parts"],
  why:"The source on the source control drawing has not changed. A plant move inside the same qualified supplier with the same processes does not touch the baseline." });

var CTX_TEXT = {
  stopwork:  "The production line for this item is stopped and stays stopped until this is dispositioned.",
  hazard:    "The condition is assessed as likely to cause serious injury or major damage to the flight article if it is not corrected before the next operation.",
  hazpot:    "System Safety assesses the condition as potentially hazardous but not immediate.",
  milestone: "Without this change the program misses the contract milestone at the end of the quarter.",
  savings:   "The cost benefit is real but it evaporates if the change is not on the floor before the next lot release.",
  none:      ""
};

function classifyFlags(flags){ return flags && flags.length ? 1 : 2; }

function priorityOf(ctx){
  if (ctx === "stopwork" || ctx === "hazard") return "Emergency";
  if (ctx === "hazpot" || ctx === "milestone" || ctx === "savings") return "Urgent";
  return "Routine";
}
var PRIORITY_WHY = {
  Emergency: "Emergency covers a safety condition likely to cause serious injury or major damage, or a condition that has stopped production. Both get moved to the front of the line.",
  Urgent:    "Urgent covers a potentially hazardous condition, or a change that must go now to hold a milestone or to capture a benefit that expires.",
  Routine:   "Routine is everything that can move through the normal board cycle without special handling."
};

/* Build a concrete change from a template. */
function genChange(rng, world, opts){
  opts = opts || {};
  var pool = T;
  if (opts.classOnly === 1) pool = T.filter(function(x){ return x.cls === 1; });
  if (opts.classOnly === 2) pool = T.filter(function(x){ return x.cls === 2; });
  if (opts.trapsOnly) pool = T.filter(function(x){ return !!x.trap; });
  var t = rng.pick(pool);

  var wantSw = t.tags.indexOf("software") >= 0;
  var wantGse = t.tags.indexOf("gse") >= 0;
  var ci;
  if (wantSw) ci = rng.pick(world.sw);
  else if (wantGse) ci = rng.pick(world.gse.length ? world.gse : world.hw);
  else ci = rng.pick(world.hw);

  var ctx = rng.pick(t.ctx);
  var cls = t.cls;
  var pri = priorityOf(ctx);

  var costDelta = cls === 1
    ? rng.weighted([[0,1],[rng.int(8,90)*1000,4],[rng.int(120,900)*1000,2],[rng.int(1,4)*1000000,1]])
    : 0;
  if (t.flags.indexOf("cost") < 0 && cls === 1) costDelta = rng.chance(0.4) ? rng.int(5,40)*1000 : 0;
  var schedDays = t.flags.indexOf("sched") >= 0 ? rng.int(5, 45) : (rng.chance(0.25) ? rng.int(1,4) : 0);
  var massG = t.flags.indexOf("weight") >= 0 ? rng.int(310, 2400) : (rng.chance(0.4) ? rng.int(5, 90) : 0);
  var marginG = t.flags.indexOf("weight") >= 0 ? rng.int(0, massG - 60) : rng.int(900, 4200);

  var text = t.txt.replace(/\{ci\}/g, ci.name);
  var triggers = t.flags.map(function(f){ return FLAG_TEXT[f]; });

  return {
    tid: t.id, ci: ci, text: text, ctxKey: ctx, ctxText: CTX_TEXT[ctx],
    flags: t.flags.slice(), triggers: triggers,
    cls: cls, pri: pri, trap: t.trap || null, why: t.why || null,
    reason: t.reason,
    costDelta: costDelta, schedDays: schedDays, massG: massG, marginG: marginG,
    affectsIface: t.flags.indexOf("iface") >= 0,
    affectsSafety: t.flags.indexOf("safety") >= 0 || ctx === "hazard" || ctx === "hazpot",
    affectsInterch: t.flags.indexOf("interch") >= 0,
    affectsRetrofit: t.flags.indexOf("retrofit") >= 0,
    isSw: ci.type === "sw"
  };
}

window.BCC = {
  TEMPLATES:T, FLAG_TEXT:FLAG_TEXT, FLAG_KEYS:FLAG_KEYS, CTX_TEXT:CTX_TEXT,
  genChange:genChange, priorityOf:priorityOf, PRIORITY_WHY:PRIORITY_WHY, classifyFlags:classifyFlags
};
})();
