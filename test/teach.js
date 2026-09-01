/* Teach mode. Every lesson has to be reachable, every check passable, and the
   worked examples have to actually show what the lesson claims they show. */
const { load, suite } = require("./harness.js");

function correctQuizIndex(T) { return T.phase.quiz[T.phase.idx].a; }

/* drive one lesson to completion, answering correctly */
function completeLesson(W, opts) {
  opts = opts || {};
  const TE = W.BCTEACH, II = W.BCUII;
  const T = TE.progress();
  let guard = 0;
  while (guard++ < 200) {
    const steps = TE.stepsFor(TE.currentLesson());
    const step = steps[T.step];
    if (step === "done") return true;

    if (T.phase && T.phase.name === "retry") {
      if (opts.stopOnRetry) return "retry";
      TE.act("tretry", null);
      continue;
    }
    if (step === "card") { TE.act("tnext", null); continue; }
    if (step === "example") { TE.act("tnext", null); continue; }

    if (!T.phase) { TE.beginPhase(step); continue; }

    if (T.phase.kind === "quiz") {
      if (!T.phase.revealed) {
        T.phase.answer = opts.wrong ? (correctQuizIndex(T) + 1) % T.phase.quiz[T.phase.idx].opts.length : correctQuizIndex(T);
        TE.act("tquizsub", null);
      } else TE.act("tnextitem", null);
      continue;
    }

    const item = T.phase.item;
    if (!item.done) {
      if (opts.wrong && T.phase.name === "check") {
        II.resetForm(item);
        const f = II.form();
        const d = item.data, k = item.kind;
        if (k === "release") f.disposition = "release";
        else if (k === "cdrl" || k === "sdrl") f.action = "submit";
        else if (k === "ecp") { f.cls = String(d.key.cls === 1 ? 2 : 1); f.pri = "Routine"; f.route = "none"; }
        else if (k === "ipn" || k === "variance") f.pick = "___wrong___";
        else if (k === "csa") f.pick = "___wrong___";
        else if (k === "audit" || k === "minutes") f.rows = d.rows.map(() => "___wrong___");
        else if (k === "gate") f.answers = d.qs.map((q) => (q.a + 1) % 4);
        else if (k === "ccb") f.dispositions = d.items.map((x) => (x.key === "approve" ? "defer" : "approve"));
        else f.pick = d.opts.findIndex((o) => !o.k);
      } else {
        TE.correctResponse(item);
      }
      TE.act("tsubmit", null);
    } else TE.act("tnextitem", null);
  }
  return false;
}

function run() {
  const t = suite("teach mode");
  const W = load();
  const C = W.BCTEACHC, TE = W.BCTEACH, ST = W.BCS;

  /* curriculum integrity */
  {
    const ids = C.LESSONS.map((l) => l.id);
    t.eq("every lesson id is unique", new Set(ids).size, ids.length);
    let noCard = 0, noKeys = 0, noCheck = 0, badQuiz = 0, badKind = 0;
    const KINDS = ["release","ecp","ipn","variance","cdrl","sdrl","csa","audit","gate","minutes","ccb","senior","event","quiz"];
    for (const l of C.LESSONS) {
      if (!l.card || !l.card.length) noCard++;
      if (!l.keys || l.keys.length < 2) noKeys++;
      if (!l.check) noCheck++;
      if (l.check && l.check.kind === "quiz" && (!l.quiz || l.quiz.length < (l.check.n || 1))) badQuiz++;
      for (const spec of [l.example, l.practice, l.check]) {
        if (spec && spec.kind && KINDS.indexOf(spec.kind) < 0) badKind++;
      }
      if (l.quiz) for (const q of l.quiz) {
        if (!q.o || q.o.length < 2 || q.a < 0 || q.a >= q.o.length || !q.w) badQuiz++;
      }
    }
    t.ok(`${C.LESSONS.length} lessons across ${C.MODULES.length} modules`, C.LESSONS.length >= 30, `${C.LESSONS.length} is thin`);
    t.eq("every lesson has a card", noCard, 0);
    t.eq("every lesson has takeaways", noKeys, 0);
    t.eq("every lesson has a check", noCheck, 0);
    t.eq("every quiz question is well formed", badQuiz, 0);
    t.eq("every scenario kind is one the game can generate", badKind, 0);
  }

  /* the worked examples really do show what the lesson says they show */
  {
    TE.start(true);
    let missed = 0, examples = 0;
    for (const l of C.LESSONS) {
      if (!l.example || !l.example.want) continue;
      examples++;
      TE.progress().lesson = l.id;
      const item = TE.makeFor(l.example.kind, l.example.level, l.example.want);
      const w = l.example.want, d = item.data;
      let ok = true;
      if (w.defect) ok = d.defects.indexOf(w.defect) >= 0;
      else if (w.area) ok = d.defects.some((x) => W.BCR.DEFECTS[x].area === w.area);
      else if (w.clean) ok = d.defects.length === 0;
      else if (w.minDefects) ok = d.defects.length >= w.minDefects;
      else if (w.cls) ok = d.key.cls === w.cls;
      else if (w.trap) ok = !!d.ch.trap;
      else if (w.key) ok = d.key === w.key;
      else if (w.type) ok = d.type === w.type;
      else if (w.retro) ok = d.ecns.some((x) => x.retrofit);
      if (!ok) missed++;
    }
    t.ok(`${examples} worked examples ask for a specific scenario`, examples >= 10, `${examples}`);
    t.eq("every worked example finds the scenario its lesson describes", missed, 0);
  }

  /* a worked example arrives already solved */
  {
    TE.start(true);
    const T = TE.progress();
    T.lesson = "1.4"; T.step = 0; T.phase = null;
    TE.act("tnext", null);                       // card -> example
    t.ok("the worked example is generated", !!(T.phase && T.phase.item), "no example item");
    t.ok("the worked example is already answered", !!(T.phase && T.phase.item && T.phase.item.done), "not solved");
    t.ok("the worked example scores full marks", T.phase.item.result.score > 0.999, `scored ${T.phase.item.result.score}`);
    const html = TE.render();
    t.ok("the example page names where each discrepancy lives",
      html.indexOf("Where each one lives") >= 0, "no annotation panel");
    for (const d of T.phase.item.data.defects) {
      const where = W.BCR.DEFECTS[d].where;
      if (html.indexOf(where) < 0) { t.ok("annotation points at " + d, false, "missing where text"); break; }
    }
    t.ok("every discrepancy in the example is pointed at",
      T.phase.item.data.defects.every((d) => html.indexOf(W.BCR.DEFECTS[d].where) >= 0), "an annotation was missing");
  }

  /* hints help without answering */
  {
    TE.start(true);
    const T = TE.progress();
    let bad = 0;
    for (const k of ["release", "ecp", "ipn", "variance", "csa", "audit", "minutes", "ccb", "cdrl"]) {
      const item = TE.makeFor(k, 2, null);
      const h1 = TE.hintFor(item, 1), h2 = TE.hintFor(item, 2);
      if (!h1 || h1.length < 20) bad++;
      if (!h2 || h2.length < 20) bad++;
      if (h1 === h2) bad++;
    }
    t.eq("every task type has two distinct, useful hints", bad, 0);
  }

  /* a learner who answers correctly completes the whole course */
  {
    TE.start(true);
    const T = TE.progress();
    let completed = 0, stuck = null;
    for (const l of C.LESSONS) {
      T.lesson = l.id; T.step = 0; T.phase = null;
      const res = completeLesson(W);
      if (res === true && T.done[l.id]) completed++;
      else if (!stuck) stuck = l.id + " (" + l.title + ")";
    }
    t.eq(`all ${C.LESSONS.length} lessons complete for a correct learner`, completed, C.LESSONS.length);
    t.ok("no lesson is unfinishable", !stuck, "stuck on " + stuck);
    t.eq("the course reports one hundred percent", TE.completion().pct, 100);
  }

  /* lessons unlock in order and cannot be skipped */
  {
    TE.start(true);
    const T = TE.progress();
    t.eq("the first lesson is open", TE.isUnlocked(C.LESSONS[0].id), true);
    t.eq("the second lesson is locked", TE.isUnlocked(C.LESSONS[1].id), false);
    t.eq("a later lesson is locked", TE.isUnlocked(C.LESSONS[10].id), false);
    t.eq("opening a locked lesson is refused", TE.openLesson(C.LESSONS[10].id), false);
    completeLesson(W);
    t.eq("finishing one unlocks the next", TE.isUnlocked(C.LESSONS[1].id), true);
    t.eq("it does not unlock two", TE.isUnlocked(C.LESSONS[2].id), false);
  }

  /* a wrong check does not pass, and offers a way back */
  {
    TE.start(true);
    const T = TE.progress();
    T.lesson = "3.1"; T.step = 0; T.phase = null;     // release audit, generated check
    const res = completeLesson(W, { wrong: true, stopOnRetry: true });
    t.eq("a failed check does not complete the lesson", !!T.done["3.1"], false);
    t.eq("a failed check lands on the retry screen", res, "retry");
    t.ok("the retry screen offers more practice", TE.render().indexOf("More practice") >= 0, "no practice offer");
    TE.act("tretry", null);
    const ok = completeLesson(W);
    t.eq("retaking the check with correct answers completes it", ok === true && !!T.done["3.1"], true);
  }

  /* progress survives a reload, and is independent of the career slots */
  {
    const { fakeStorage } = require("./harness.js");
    const store = fakeStorage();
    const W2 = load({ storage: store });
    const TE2 = W2.BCTEACH;
    TE2.start(true);
    for (let i = 0; i < 3; i++) {
      const T2 = TE2.progress();
      T2.lesson = W2.BCTEACHC.LESSONS[i].id; T2.step = 0; T2.phase = null;
      completeLesson(W2);
    }
    const before = Object.keys(TE2.progress().done).length;

    const W3 = load({ storage: store });          // reload
    t.ok("teach progress is found after a reload", !!W3.BCS.teachSummary(), "nothing stored");
    t.eq("the same number of lessons is complete", W3.BCS.teachSummary().lessons, before);
    t.eq("resuming works", W3.BCTEACH.resumeIfAny(), true);
    t.eq("the resumed course keeps its completion", Object.keys(W3.BCTEACH.progress().done).length, before);

    /* starting a career must not touch it */
    W3.BCE.start({ mode: "career", progKey: "AUR", slot: 1 });
    W3.BCE.save();
    t.eq("starting a career leaves the course alone", W3.BCS.teachSummary().lessons, before);
    W3.BCS.clear(1);
    t.eq("deleting a career leaves the course alone", W3.BCS.teachSummary().lessons, before);
  }

  /* teach mode never writes into a career slot */
  {
    const { fakeStorage } = require("./harness.js");
    const store = fakeStorage();
    const W4 = load({ storage: store });
    W4.BCTEACH.start(true);
    completeLesson(W4);
    t.eq("no career slot is created by teaching", W4.BCS.listSlots().every((s) => s.empty), true);
  }

  return t.done();
}
module.exports = { run };
