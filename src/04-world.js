/* ============================================================
   World construction: a program, its configuration items,
   drawing tree, unit set, and running change history.
   ============================================================ */
(function(){
"use strict";
var B = window.BC;

function buildCI(rng, prog, spec, type){
  var dn = B.drawingNo(rng);
  var revI = rng.int(0, 6);
  return {
    name: spec[0], abbr: spec[1], type: type,
    doc: dn,
    pn: dn + B.dashNo(rng),
    cage: "8L4C7",
    rev: B.revAt(revI),
    revI: revI,
    spec: "MAS-" + prog.key + "-SPEC-" + rng.int(100, 899),
    baseline: rng.weighted([["Product Baseline", 5], ["Allocated Baseline", 3], ["Functional Baseline", 1]]),
    owner: B.personName(rng),
    critical: type === "hw" && rng.chance(0.3)
  };
}

function buildWorld(seedStr, progKey){
  var rng = new B.RNG(seedStr + "|world");
  var prog = null, i;
  for (i=0;i<B.PROGRAMS.length;i++) if (B.PROGRAMS[i].key === progKey) prog = B.PROGRAMS[i];
  if (!prog) prog = rng.pick(B.PROGRAMS);

  var hw = rng.sample(B.CI_HW, 11).map(function(s){ return buildCI(rng, prog, s, "hw"); });
  var sw = rng.sample(B.CI_SW, 4).map(function(s){ return buildCI(rng, prog, s, "sw"); });
  var gse = rng.sample(B.CI_GSE, 2).map(function(s){ return buildCI(rng, prog, s, "gse"); });
  var cis = hw.concat(sw, gse);

  // flight units, each with a build state
  var unitCount = rng.int(6, 10);
  var units = [];
  for (i=1;i<=unitCount;i++){
    var st = i <= 2 ? "Delivered and accepted"
           : i <= 4 ? "In integration and test"
           : i <= 6 ? "In assembly"
           : "Parts on order";
    units.push({ sn: i, label: B.serial(i), state: st, accepted: i <= 2 });
  }

  var suppliers = rng.sample(B.SUPPLIERS, 4);

  return {
    seed: seedStr,
    prog: prog,
    cis: cis, hw: hw, sw: sw, gse: gse,
    units: units,
    suppliers: suppliers,
    cmp: "MAS-" + prog.key + "-CMP-001",
    contract: "FA" + rng.int(1000,9999) + "-27-C-" + B.pad(rng.int(1,9999),4),
    counter: { ecp: rng.int(1200, 4200), ecn: rng.int(110000, 160000), cr: rng.int(24000, 60000), cdrl: 1 }
  };
}

function pickCI(rng, world, opts){
  opts = opts || {};
  var pool = world.cis;
  if (opts.type === "hw") pool = world.hw;
  if (opts.type === "sw") pool = world.sw;
  return rng.pick(pool);
}

/* Bump a CI revision and record it in the world change log. */
function advanceCI(world, ci){
  ci.revI += 1;
  ci.rev = B.revAt(ci.revI);
  return ci.rev;
}

window.BCW = { buildWorld:buildWorld, pickCI:pickCI, advanceCI:advanceCI, buildCI:buildCI };
})();
