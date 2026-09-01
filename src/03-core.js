/* ============================================================
   BASELINE CONTROL
   A configuration and data management simulator.
   Fictional contractor, real discipline.
   ============================================================ */
(function(){
"use strict";

/* ---------------- deterministic RNG ---------------- */
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s){
  var h = 2166136261 >>> 0;
  for (var i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function RNG(seed){
  this.s = (typeof seed === "string") ? hashStr(seed) : (seed >>> 0);
  this.f = mulberry32(this.s);
}
RNG.prototype.next = function(){ return this.f(); };
RNG.prototype.int = function(lo, hi){ return lo + Math.floor(this.f() * (hi - lo + 1)); };
RNG.prototype.pick = function(arr){ return arr[Math.floor(this.f() * arr.length)]; };
RNG.prototype.chance = function(p){ return this.f() < p; };
RNG.prototype.shuffle = function(arr){
  var a = arr.slice();
  for (var i=a.length-1;i>0;i--){ var j = Math.floor(this.f()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
};
RNG.prototype.sample = function(arr, n){ return this.shuffle(arr).slice(0, Math.min(n, arr.length)); };
RNG.prototype.weighted = function(pairs){ // [[value, weight], ...]
  var tot = 0, i;
  for (i=0;i<pairs.length;i++) tot += pairs[i][1];
  var r = this.f() * tot;
  for (i=0;i<pairs.length;i++){ r -= pairs[i][1]; if (r <= 0) return pairs[i][0]; }
  return pairs[pairs.length-1][0];
};

/* ---------------- tiny helpers ---------------- */
function esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function el(id){ return document.getElementById(id); }
function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }
function pad(n, w){ var s = String(n); while (s.length < w) s = "0" + s; return s; }
function pct(n){ return Math.round(n) + "%"; }
function uid(prefix){ uid._n = (uid._n||0)+1; return prefix + "-" + uid._n + "-" + Math.floor(Math.random()*1e6).toString(36); }
function sum(a){ var t=0; for (var i=0;i<a.length;i++) t += a[i]; return t; }
function uniq(a){ var o = {}, r = []; for (var i=0;i<a.length;i++){ if(!o[a[i]]){ o[a[i]]=1; r.push(a[i]); } } return r; }

/* ---------------- revision letters (ASME Y14.35 style) ----------------
   I, O, Q, S, X and Z are not used as revision letters because they are
   easily confused with numerals or with other letters.                  */
var REV_LETTERS = "ABCDEFGHJKLMNPRTUVWY".split("");
var FORBIDDEN_REV = "IOQSXZ".split("");
function revAt(i){
  if (i < REV_LETTERS.length) return REV_LETTERS[i];
  var a = Math.floor(i / REV_LETTERS.length) - 1;
  var b = i % REV_LETTERS.length;
  return REV_LETTERS[a] + REV_LETTERS[b];
}
function revIndex(r){
  r = String(r).toUpperCase();
  if (r === "-" || r === "") return -1;
  if (r.length === 1) return REV_LETTERS.indexOf(r);
  var a = REV_LETTERS.indexOf(r.charAt(0)), b = REV_LETTERS.indexOf(r.charAt(1));
  if (a < 0 || b < 0) return -2;
  return (a + 1) * REV_LETTERS.length + b;
}
function nextRev(r){ var i = revIndex(r); return revAt(i + 1); }

/* ---------------- calendar ----------------
   The plant runs a 4x10: Monday through Thursday, ten hours a day.
   Friday is off. Day 1 of the sim is a Monday.                        */
var DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday"];
var MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
function dayOfWeek(d){ var m = (d - 1) % 4; return m < 0 ? m + 4 : m; }
function weekOf(d){ return Math.floor((d - 1) / 4) + 1; }
function dayName(d){ return DAY_NAMES[dayOfWeek(d)]; }
function isCCBDay(d){ return dayOfWeek(d) === 2; } // Wednesday board
var EPOCH = Date.UTC(2027, 0, 4); // a Monday
function dateOf(d){
  var wk = Math.floor((d - 1) / 4), dow = dayOfWeek(d);
  var ms = EPOCH + (wk * 7 + dow) * 86400000;
  var dt = new Date(ms);
  return pad(dt.getUTCDate(),2) + " " + MONTHS[dt.getUTCMonth()] + " " + dt.getUTCFullYear();
}
function dateShort(d){
  var wk = Math.floor((d - 1) / 4), dow = dayOfWeek(d);
  var dt = new Date(EPOCH + (wk * 7 + dow) * 86400000);
  return pad(dt.getUTCDate(),2) + MONTHS[dt.getUTCMonth()];
}

/* ---------------- career levels ---------------- */
var LEVELS = [
  { code:"E1", title:"Configuration Analyst Asc", exp:"0 to 2 years",
    band:"$61,900 to $114,900", tc:"about $86K to $109K",
    scope:"Task-level execution. Change packages in the EPDM vault, CCB minutes and action logs, baseline status tracking, CDRL loading.",
    xp:0,
    unlocks:["release","cdrl","minutes","csa"] },
  { code:"E2", title:"Configuration Analyst", exp:"2 to 5 years",
    band:"$59,900 to $125,200", tc:"about $114K to $129K",
    scope:"You own subsystem baselines. Class I and Class II classification, variance calls, board facilitation, discrepancy resolution between design and the floor.",
    xp:600,
    unlocks:["ecp","ipn","variance","ccbvote"] },
  { code:"E3", title:"Configuration Analyst Sr", exp:"5 to 9 years",
    band:"$81,500 to $158,300", tc:"about $139K to $161K",
    scope:"Technical lead on a mission segment. You write the CM Plan, tailor EIA-649, lead FCA and PCA with the government team, and ride the subcontract data.",
    xp:1800,
    unlocks:["audit","sdrl","cmp","gate"] },
  { code:"E4", title:"Configuration Analyst Staff", exp:"8 to 15 years",
    band:"$104,900 to $194,700", tc:"about $187K to $210K",
    scope:"Architect. Baselines across MBSE and PLM, digital thread across sites, chair of the enterprise board, primary CM face to the government program office.",
    xp:4200,
    unlocks:["thread","arch","chair"] },
  { code:"E5", title:"Configuration Analyst Sr Staff", exp:"15+ years",
    band:"$129,000 to $239,600", tc:"about $228K to $267K",
    scope:"Policy. You set CM and DM direction for the business area, pick the toolchain, harmonize four sites, and tell a vice president what the baseline risk actually is.",
    xp:8000,
    unlocks:["policy","plm","harmonize","exec"] }
];
function levelUnlocks(lv){
  var u = [];
  for (var i=0;i<lv;i++) u = u.concat(LEVELS[i].unlocks);
  return u;
}
function has(lv, key){ return levelUnlocks(lv).indexOf(key) >= 0; }

/* ---------------- world catalogs ---------------- */
var PROGRAMS = [
  { key:"AUR", name:"AURORA-GEO", full:"Aurora Geosynchronous Missile Warning",
    customer:"Space Systems Directorate (SSD/PK)", domain:"space",
    blurb:"Six-satellite infrared missile warning constellation in geosynchronous orbit. Two flight units in integration, four on contract.",
    classified:true },
  { key:"LTP", name:"LANTERN-POLAR", full:"Lantern Polar Infrared Sensor Payload",
    customer:"Space Systems Directorate (SSD/PK)", domain:"space",
    blurb:"Highly elliptical orbit sensor payloads hosted on a partner bus. Payload provider only, which means the interface control documents rule your life.",
    classified:true },
  { key:"CSL", name:"CASTELLAN", full:"Castellan Protected Communications",
    customer:"Space Systems Directorate (SSD/SC)", domain:"space",
    blurb:"Protected military satellite communications. Heavy cryptographic subsystem, heavy paperwork.",
    classified:true },
  { key:"HYD", name:"HALYARD D6", full:"Halyard D6 Fleet Ballistic Missile",
    customer:"Strategic Systems Program Office (SP-24)", domain:"strategic",
    blurb:"Submarine launched strategic missile sustainment. Nuclear surety rules. Nothing here is a small change.",
    classified:true },
  { key:"VRD", name:"VERDANT-GX", full:"Verdant Geostationary Environmental Observations",
    customer:"Civil Environmental Programs Office", domain:"civil",
    blurb:"Civil weather and environmental imaging payload. Unclassified, which sounds easier until you meet the public data release process.",
    classified:false },
  { key:"NGL", name:"NIGHTGLASS", full:"Nightglass Space Domain Awareness",
    customer:"National Space Office (Program C)", domain:"space",
    blurb:"Compartmented space domain awareness payload. Half your baseline lives inside the SCIF and cannot come out.",
    classified:true }
];

var CI_HW = [
  ["Primary Structure Assembly","STR"], ["Propulsion Module","PRP"],
  ["Thermal Control Subsystem","THM"], ["Electrical Power Subsystem","EPS"],
  ["Solar Array Wing","SAW"], ["Battery Assembly","BAT"],
  ["Attitude Control Subsystem","ACS"], ["Reaction Wheel Assembly","RWA"],
  ["Star Tracker Assembly","STA"], ["Command and Data Handling Unit","CDH"],
  ["RF Transponder Assembly","RFT"], ["Antenna Deployment Mechanism","ADM"],
  ["Optical Telescope Assembly","OTA"], ["Focal Plane Array Module","FPA"],
  ["Cryocooler Assembly","CRY"], ["Payload Electronics Unit","PEU"],
  ["Spacecraft Harness Assembly","HAR"], ["Launch Vehicle Adapter","LVA"],
  ["Propellant Tank Assembly","PTA"], ["Sun Shade Assembly","SHD"],
  ["Deployable Radiator Panel","RAD"], ["Isolation Strut Set","ISO"]
];
var CI_SW = [
  ["Flight Software CSCI","FSW"], ["Payload Control CSCI","PCS"],
  ["Bus Management CSCI","BMS"], ["Onboard Autonomy CSCI","OBA"],
  ["Ground Command and Telemetry CSCI","GCT"], ["Mission Planning CSCI","MPL"],
  ["Mission Data Processing CSCI","MDP"], ["Cryptographic Loader CSCI","CRL"]
];
var CI_GSE = [
  ["Spacecraft Test Set","STS"], ["Thermal Vacuum Test Fixture","TVF"],
  ["Vibration Test Fixture","VTF"], ["Optical Alignment GSE","OAG"],
  ["Handling and Transport Dolly","HTD"], ["Payload Simulator Rack","PSR"]
];

var FIRST = ["Dale","Priya","Marty","Wren","Hollis","Tomas","Junko","Renata","Dwayne","Adaeze",
  "Nils","Camila","Reuben","Fatima","Gus","Imani","Theo","Solveig","Ivan","Nadine",
  "Bao","Marguerite","Emmett","Zuri","Casper","Leona","Rashid","Beatrix","Owen","Marisol",
  "Yusuf","Delphine","Grant","Anya","Lorenzo","Kiara","Duncan","Sana","Mabel","Oscar"];
var LAST = ["Okonkwo","Raghunathan","Fenwick","Salcedo","Bergstrom","Iriarte","Ferreira","Salk","Pruitt","Achebe",
  "Halvorsen","Duarte","Castellanos","Nasser","Whitlock","Adeyemi","Papadakis","Lindqvist","Petrov","Beaulieu",
  "Nguyen","Thibault","Rowan","Mbeki","Vandenberg","Marchetti","Haddad","Ostrowski","Kealoha","Reyes",
  "Aydin","Moreau","Kirkpatrick","Volkova","Bianchi","Osei","Macleod","Farooqi","Tran","Winslow"];

var DISCIPLINES = ["Design Engineering","Stress Analysis","Materials and Processes","Thermal Engineering",
  "Electrical Engineering","Software Engineering","Systems Engineering","Manufacturing Engineering",
  "Quality Assurance","Reliability Engineering","System Safety","Contracts","Program Management",
  "Configuration Management","Supply Chain","Mission Assurance","Test Engineering"];

/* Recurring cast. These people show up across scenarios and behave consistently. */
var CAST = [
  { id:"okonkwo", name:"Dale Okonkwo", role:"Senior Design Engineer", disc:"Design Engineering",
    tic:"submits packages the hour before a build gate and forgets the checker signature about a third of the time" },
  { id:"raghu", name:"Priya Raghunathan", role:"Quality Assurance Lead", disc:"Quality Assurance",
    tic:"reads every line and writes in fragments" },
  { id:"fenwick", name:"Marty Fenwick", role:"Deputy Program Manager", disc:"Program Management",
    tic:"believes every change is a Class II and will say so out loud in the board" },
  { id:"salcedo", name:"Wren Salcedo", role:"Contracts Administrator", disc:"Contracts",
    tic:"knows exactly which CLIN has money left and enjoys telling you it does not" },
  { id:"bergstrom", name:"Hollis Bergstrom", role:"System Safety Engineer", disc:"System Safety",
    tic:"will not concur while a hazard report is open, regardless of schedule" },
  { id:"iriarte", name:"Tomas Iriarte", role:"Manufacturing Engineering Lead", disc:"Manufacturing Engineering",
    tic:"asks about effectivity and work in process before anything else" },
  { id:"ferreira", name:"Junko Ferreira", role:"Software Configuration Manager", disc:"Software Engineering",
    tic:"wants a version description document and a reproducible build label, every time" },
  { id:"salk", name:"Renata Salk", role:"Government CM Lead, SSD/EN", disc:"Configuration Management",
    tic:"polite, thorough, and remembers every commitment you made in a telecon" },
  { id:"pruitt", name:"Dwayne Pruitt", role:"Procuring Contracting Officer", disc:"Contracts",
    tic:"the only person who can actually authorize a Class I change" },
  { id:"whitlock", name:"Gus Whitlock", role:"Chief Engineer", disc:"Systems Engineering",
    tic:"asks one question that unravels the whole package" },
  { id:"achebe", name:"Adaeze Achebe", role:"Mission Assurance Manager", disc:"Mission Assurance",
    tic:"tracks escapes by name and never forgets one" },
  { id:"halvorsen", name:"Nils Halvorsen", role:"Supplier Quality Engineer", disc:"Supply Chain",
    tic:"spends more time at Cordell Precision than at his own desk" }
];
function castBy(id){ for (var i=0;i<CAST.length;i++) if (CAST[i].id === id) return CAST[i]; return CAST[0]; }

var SUPPLIERS = [
  { name:"Cordell Precision Machining", cage:"4TR21", trait:"late", spec:"machined structure and fittings" },
  { name:"Northfield Optics", cage:"7QB08", trait:"picky", spec:"mirrors and optical benches" },
  { name:"Vantree Microelectronics", cage:"1KD64", trait:"obsolescence", spec:"radiation hardened electronics" },
  { name:"Halcyon Composites", cage:"9WM33", trait:"process", spec:"composite panels and struts" },
  { name:"Stellwyn Cryogenics", cage:"3HF77", trait:"solid", spec:"cryocoolers and cold heads" },
  { name:"Bayard Harness Systems", cage:"6NP19", trait:"volume", spec:"cable harnesses and connectors" },
  { name:"Trellis Actuation", cage:"2XC45", trait:"late", spec:"deployment mechanisms" }
];

/* Reason codes as they appear on a change form. */
var REASON_CODES = [
  { code:"A", name:"Correction of Deficiency" },
  { code:"B", name:"Production Stoppage" },
  { code:"C", name:"Interoperability" },
  { code:"D", name:"Compatibility with Support Equipment" },
  { code:"E", name:"Obsolescence / DMSMS" },
  { code:"F", name:"Cost Reduction (Value Engineering)" },
  { code:"G", name:"Safety" },
  { code:"H", name:"Operational or Logistics Support" },
  { code:"J", name:"Failure Investigation Corrective Action" },
  { code:"K", name:"Requirement Change Directed by Customer" },
  { code:"L", name:"Drafting or Editorial Correction" },
  { code:"M", name:"Supplier Change, Identical Item" }
];

/* Data item descriptions. Format is authentic; specific numbers are
   representative for training and should not be treated as a lookup table. */
var DIDS = [
  { did:"DI-CMAN-80639C", title:"Engineering Change Proposal (ECP)", approval:true },
  { did:"DI-CMAN-80640D", title:"Notice of Revision (NOR)", approval:true },
  { did:"DI-CMAN-80642C", title:"Request for Deviation (RFD)", approval:true },
  { did:"DI-CMAN-81248A", title:"Configuration Management Plan", approval:true },
  { did:"DI-CMAN-81253A", title:"Configuration Status Accounting Report", approval:false },
  { did:"DI-CMAN-81022B", title:"Configuration Audit Plan", approval:true },
  { did:"DI-CMAN-81834A", title:"Configuration Audit Summary Report", approval:true },
  { did:"DI-ADMN-81250A", title:"Conference Agenda and Minutes", approval:false },
  { did:"DI-MGMT-81334D", title:"Contract Work Breakdown Structure", approval:true },
  { did:"DI-MGMT-81861A", title:"Integrated Program Management Report", approval:false },
  { did:"DI-SESS-81000E", title:"Systems Engineering Management Plan", approval:true },
  { did:"DI-SESS-81875", title:"Interface Control Document", approval:true },
  { did:"DI-SESS-81785", title:"Software Version Description", approval:false },
  { did:"DI-QCIC-81110B", title:"Quality Program Plan", approval:true },
  { did:"DI-MISC-80711A", title:"Scientific and Technical Report", approval:false },
  { did:"DI-RELI-80685", title:"Failure Analysis and Corrective Action Report", approval:true },
  { did:"DI-SAFT-81626", title:"System Safety Hazard Analysis Report", approval:true },
  { did:"DI-NDTI-80809B", title:"Test Procedure", approval:true },
  { did:"DI-NDTI-80603A", title:"Test and Evaluation Report", approval:false },
  { did:"DI-DRPR-81000E", title:"Product Drawings and Associated Lists", approval:true }
];

/* ---------------- number generators ---------------- */
function drawingNo(rng){ return String(rng.int(2100000, 8999999)); }
function dashNo(rng){ return "-" + rng.pick(["001","003","005","007","009","011","501","503","505","507","509"]); }
function cageOf(rng){ return rng.pick(["8L4C7","8L4C7","8L4C7","5DQ92","2A4L9"]); } // home design activity
function ecpNo(rng, prog){ return "ECP-" + prog + "-" + rng.int(1000, 9999); }
function ecnNo(rng){ return "ECN-" + rng.int(100000, 199999); }
function crNo(rng){ return "CR-" + rng.int(20000, 89999); }
function serial(n){ return "S/N " + pad(n, 4); }
function personName(rng){ return rng.pick(FIRST) + " " + rng.pick(LAST); }

/* expose */
window.BC = {
  RNG:RNG, hashStr:hashStr, esc:esc, el:el, clamp:clamp, pad:pad, pct:pct, uid:uid, sum:sum, uniq:uniq,
  REV_LETTERS:REV_LETTERS, FORBIDDEN_REV:FORBIDDEN_REV, revAt:revAt, revIndex:revIndex, nextRev:nextRev,
  DAY_NAMES:DAY_NAMES, dayOfWeek:dayOfWeek, weekOf:weekOf, dayName:dayName, isCCBDay:isCCBDay,
  dateOf:dateOf, dateShort:dateShort,
  LEVELS:LEVELS, levelUnlocks:levelUnlocks, has:has,
  PROGRAMS:PROGRAMS, CI_HW:CI_HW, CI_SW:CI_SW, CI_GSE:CI_GSE,
  FIRST:FIRST, LAST:LAST, DISCIPLINES:DISCIPLINES, CAST:CAST, castBy:castBy, SUPPLIERS:SUPPLIERS,
  REASON_CODES:REASON_CODES, DIDS:DIDS,
  drawingNo:drawingNo, dashNo:dashNo, cageOf:cageOf, ecpNo:ecpNo, ecnNo:ecnNo, crNo:crNo,
  serial:serial, personName:personName
};
})();
