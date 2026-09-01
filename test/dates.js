/* Nothing a generator produces may be dated in the future, and the 4x10
   calendar has to keep working for days at or before day one. */
const { load, suite } = require("./harness.js");

function run(reps = 60) {
  const W = load();
  const B = W.BC, E = W.BCE;
  const t = suite("dates");
  let csaBad = 0, sigBad = 0, cdrlBad = 0, calBad = 0;

  E.start({ mode: "career", progKey: "AUR", slot: 1 });
  const S = E.state();
  for (let d = 1; d <= 60; d++) {
    S.day = d;
    for (let n = 0; n < reps; n++) {
      const csa = E.makeItem("csa").data;
      for (const e of csa.ecns) {
        if (e.day > d) csaBad++;
        if (e.retrofit && e.retrofitDay > d) csaBad++;
      }
      if (csa.asOf > d || csa.asOf < csa.ecns[0].day) csaBad++;

      const rel = E.makeItem("release").data.pkg;
      for (const s of rel.sigs) if (s.signed && s.day != null && s.day > d) sigBad++;
      if (rel.pcoDate != null && rel.pcoDate > d) sigBad++;
      if (rel.crDay > d) sigBad++;

      const cd = E.makeItem("cdrl").data;
      if (cd.due < d) cdrlBad++;
    }
  }

  /* days before day one still have to name a real weekday and date */
  const seen = new Set();
  for (let i = -40; i <= 40; i++) {
    const name = B.dayName(i), date = B.dateOf(i);
    if (!name || /undefined|NaN/.test(name + date)) calBad++;
    if (["Monday", "Tuesday", "Wednesday", "Thursday"].indexOf(name) < 0) calBad++;
    seen.add(date);
  }
  if (seen.size !== 81) calBad++;

  t.eq("no change notice or retrofit is dated in the future", csaBad, 0);
  t.eq("no approval, change request or PCO date is in the future", sigBad, 0);
  t.eq("no data item arrives already past its contract due date", cdrlBad, 0);
  t.eq("the four by ten calendar holds for negative day numbers", calBad, 0);
  return t.done();
}
module.exports = { run };
