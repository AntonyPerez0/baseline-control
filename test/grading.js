/* The grading tests. Every generated scenario is answered from its own key and
   must score 1.0, every injected discrepancy must be visible in the data the
   player is shown, and no distractor may be arguably true. */
const { load, answerFromKey, answerBadly, KINDS, suite } = require("./harness.js");

/* Is this discrepancy actually observable in the package as rendered?
   These predicates are written against the displayed fields, not the generator. */
function predicates(B) {
  return {
    "rev-skip": (p) => B.revIndex(p.propRev) !== B.revIndex(p.curRev) + 1 && B.FORBIDDEN_REV.indexOf(p.propRev) < 0,
    "rev-forbidden": (p) => B.FORBIDDEN_REV.indexOf(p.propRev) >= 0,
    "sig-missing": (p) => p.sigs.some((s) => !s.signed),
    "sig-date": (p) => p.sigs.some((s) => s.signed && s.day < p.crDay),
    "sig-indep": (p) => { const c = p.sigs.find((s) => s.role === "Checker"); return !!c && c.name === p.sigs[0].name; },
    "eff-inverted": (p) => p.effType === "sn" && p.effStart > p.effEnd,
    "eff-delivered": (p) => p.effType === "sn" && p.effStart <= 2 && p.effText.indexOf("Retrofit") < 0,
    "no-effectivity": (p) => p.effText === "",
    "class-under": (p) => p.cls === 2 && p.change.cls === 1,
    "class-over": (p) => p.cls === 1 && p.change.cls === 2,
    "class-nogov": (p) => p.cls === 1 && (!p.ecp || p.pcoDate == null),
    "reason-mismatch": (p) => p.reason !== p.change.reason,
    "pl-mismatch": (p) => p.partsListPN !== p.titleBlockPN,
    "cage-wrong": (p) => p.cage !== "8L4C7",
    "icd-missing": (p) => p.change.affectsIface && !p.related.some((r) => r.type === "Interface control document"),
    "sheet-count": (p) => p.sheetsShown !== p.sheets,
    "superseded-ref": (p) => p.related.some((r) => r.type === "Item specification" && r.rev !== p.specRevReleased),
    "cdrl-missing": (p) => p.deliverable && !p.cdrl,
    "baseline-missing": (p) => !p.baseline,
    "pn-interch": (p) => p.change.affectsInterch && p.titleBlockPN === p.change.ci.pn,
    "sw-nolabel": (p) => p.change.isSw && !p.swBuild
  };
}

function run(reps = 220) {
  const W = load();
  const B = W.BC, E = W.BCE, II = W.BCUII;
  const P = predicates(B);
  const t = suite("grading");

  let oracleMiss = 0, notObservable = 0, notOffered = 0, distractorTrue = 0;
  let renderFail = 0, freshRenderFail = 0, generated = 0, evidenceMissing = 0;
  const wrongScores = [];

  for (let lv = 1; lv <= 5; lv++) {
    E.start({ mode: "drill", progKey: B.PROGRAMS[lv % B.PROGRAMS.length].key, level: lv, slot: 1 });
    const S = E.state();
    for (const k of KINDS) {
      for (let n = 0; n < reps; n++) {
        const it = E.makeItem(k);
        S.queue.push(it);
        generated++;

        if (k === "release") {
          const d = it.data;
          for (const x of d.defects) {
            if (P[x] && !P[x](d.pkg)) notObservable++;
            if (d.shown.indexOf(x) < 0) notOffered++;
          }
          for (const x of d.shown) {
            if (d.defects.indexOf(x) >= 0) continue;
            if (P[x] && P[x](d.pkg)) distractorTrue++;
          }
        }

        try {
          II.resetForm(it);
          const fresh = II.render(it, false);
          if (typeof fresh !== "string" || fresh.length < 40 || fresh.indexOf("undefined") >= 0) freshRenderFail++;
          if (k === "release") {
            /* the evidence a discrepancy is judged against has to be on screen */
            const p = it.data.pkg;
            const needs = [
              p.ctx.activityCage,                                  // cage-wrong
              p.ctx.pnOfRecord,                                    // pn-interch
              String(p.sheets), String(p.sheetsShown),             // sheet-count
              p.curRev, p.propRev,                                 // rev-skip, rev-forbidden
              B.dateOf(p.crDay)                                    // sig-date
            ];
            if (p.ctx.acceptedThrough) needs.push(B.serial(p.ctx.acceptedThrough));   // eff-delivered
            for (const r of p.related) if (r.current != null) needs.push(r.current);  // superseded-ref
            for (const n2 of needs) if (fresh.indexOf(String(n2)) < 0) evidenceMissing++;
          }
        } catch { freshRenderFail++; }

        const res = E.submit(it.id, answerFromKey(W, it));
        if (!res || typeof res.score !== "number" || res.score < 0.9999) oracleMiss++;

        try {
          const graded = II.render(it, true);
          if (typeof graded !== "string" || graded.length < 40) renderFail++;
        } catch { renderFail++; }
      }
    }
  }

  /* a deliberately wrong answer must not score well */
  for (let lv = 1; lv <= 5; lv++) {
    E.start({ mode: "drill", progKey: "AUR", level: lv, slot: 1 });
    const S = E.state();
    for (const k of KINDS) {
      for (let n = 0; n < 30; n++) {
        const it = E.makeItem(k);
        S.queue.push(it);
        const res = E.submit(it.id, answerBadly(W, it));
        wrongScores.push(res.score);
      }
    }
  }
  const meanWrong = wrongScores.reduce((a, b) => a + b, 0) / wrongScores.length;

  const expected = KINDS.length * 5 * reps;
  t.eq(`generated, graded and rendered ${generated} scenarios`, generated, expected);
  t.eq("every scenario answered from its key scores 100%", oracleMiss, 0);
  t.eq("every injected discrepancy is visible in the package", notObservable, 0);
  t.eq("every injected discrepancy is offered as a candidate", notOffered, 0);
  t.eq("no distractor is actually true", distractorTrue, 0);
  t.eq("graded state renders for every kind", renderFail, 0);
  t.eq("fresh form renders for every kind", freshRenderFail, 0);
  t.eq("the evidence behind every discrepancy is on screen", evidenceMissing, 0);
  t.ok(`a wrong answer scores badly (mean ${meanWrong.toFixed(2)})`, meanWrong < 0.3, `mean ${meanWrong.toFixed(2)} is too generous`);
  return t.done();
}

module.exports = { run };
