/* Play the whole loop twice, once perfectly and once badly, and check the
   consequences actually land: promotions, escapes, meters, and the day roll. */
const { load, answerFromKey, answerBadly, suite } = require("./harness.js");

function play(W, perfect, days) {
  const E = W.BCE;
  E.start({ mode: "career", progKey: "AUR", slot: 1 });
  const S = E.state();
  let promos = 0, boardFails = 0, dayRolls = 0;
  for (let d = 0; d < days; d++) {
    let guard = 0;
    while (guard++ < 40) {
      const open = S.queue.filter((x) => !x.done);
      if (!open.length) break;
      const it = open.sort((a, b) => a.due - b.due)[0];
      E.submit(it.id, perfect ? answerFromKey(W, it) : answerBadly(W, it));
    }
    const before = S.day;
    E.endDay();
    if (S.day === before + 1) dayRolls++;
    if (S.pendingBoard) {
      const prep = E.prepBoard();
      const r = E.takeBoard(prep.qs.map((q) => (perfect ? q.__a : (q.__a + 1) % 4)));
      if (r.pass) promos++; else boardFails++;
    }
  }
  return { S, promos, boardFails, dayRolls };
}

function run() {
  const t = suite("career");
  const W = load();
  const good = play(W, true, 60);
  t.eq("the day advances every time the day is ended", good.dayRolls, 60);
  t.ok("a careful analyst is promoted through the ladder", good.S.level >= 4, `reached E${good.S.level}`);
  t.eq("a careful analyst produces no escapes", good.S.stats.escapes, 0);
  t.ok("meters climb when the work is right", good.S.meters.integrity >= 90, `integrity ${good.S.meters.integrity}`);
  t.ok("history is trimmed so the save stays small", good.S.history.length <= 180, `${good.S.history.length} rows`);
  t.ok("every history row is a slim record", good.S.history.every((h) => !h.data), "a full item leaked into history");
  t.ok("no promotion board is failed on correct answers", good.boardFails === 0, `${good.boardFails} failures`);

  const W2 = load();
  const bad = play(W2, false, 40);
  t.ok("a careless analyst produces escapes", bad.S.stats.escapes > 0, "no escape ever surfaced");
  t.ok("a careless analyst is not promoted", bad.S.level === 1, `reached E${bad.S.level}`);
  t.ok("meters fall when the work is wrong", bad.S.meters.integrity < 40, `integrity ${bad.S.meters.integrity}`);
  t.ok("meters never leave the zero to one hundred range",
    Object.keys(bad.S.meters).every((k) => bad.S.meters[k] >= 0 && bad.S.meters[k] <= 100), "a meter went out of range");

  /* drill mode keeps its queue and its accuracy honest */
  const W3 = load();
  const E3 = W3.BCE;
  E3.start({ mode: "drill", progKey: "VRD", level: 3, slot: 2, drillKinds: ["ipn", "variance"] });
  const S3 = E3.state();
  for (let i = 0; i < 40; i++) {
    const open = S3.queue.filter((x) => !x.done);
    E3.submit(open[0].id, answerFromKey(W3, open[0]));
  }
  t.eq("drill counts every answer", S3.stats.drillN, 40);
  t.eq("drill counts correct answers", S3.stats.drillHit, 40);
  t.ok("drill only serves the chosen kinds",
    S3.queue.every((x) => ["ipn", "variance"].indexOf(x.kind) >= 0), "an unrequested kind appeared");
  t.ok("drill refills its queue", S3.queue.filter((x) => !x.done).length >= 3, "queue ran dry");
  t.ok("drill does not grow without bound", S3.queue.length <= 60, `${S3.queue.length} items retained`);
  return t.done();
}
module.exports = { run };
