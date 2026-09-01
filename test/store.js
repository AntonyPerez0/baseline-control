/* Persistence. A career has to survive a reload, five of them have to coexist,
   an old save has to be carried forward rather than dropped, and an export has
   to come back in as the same career. */
const { load, fakeStorage, answerFromKey, suite } = require("./harness.js");

function playSome(W, n, slot, opts) {
  const E = W.BCE;
  E.start(Object.assign({ mode: "career", progKey: "AUR", slot: slot || 1 }, opts || {}));
  const S = E.state();
  for (let i = 0; i < n; i++) {
    const open = S.queue.filter((x) => !x.done);
    if (!open.length) { E.endDay(); continue; }
    E.submit(open[0].id, answerFromKey(W, open[0]));
  }
  return S;
}

function run() {
  const t = suite("persistence");

  /* a career survives a reload */
  {
    const store = fakeStorage();
    const W = load({ storage: store });
    const S = playSome(W, 9, 1);
    const want = { day: S.day, xp: S.xp, done: S.stats.done, level: S.level, seed: S.seed };

    const W2 = load({ storage: store });          // a fresh page load, same browser
    const back = W2.BCE.load(W2.BCS.activeSlot());
    t.ok("a career is still there after a reload", !!back, "nothing was saved");
    if (back) {
      t.eq("the day survives", back.day, want.day);
      t.eq("experience survives", back.xp, want.xp);
      t.eq("completed count survives", back.stats.done, want.done);
      t.eq("the world seed survives, so generated content is stable", back.seed, want.seed);
      t.ok("the queue survives with its data intact",
        back.queue.length === S.queue.length && back.queue.every((x) => !!x.data), "queue items lost their data");
    }
  }

  /* drill mode saves too, which the first version did not do */
  {
    const store = fakeStorage();
    const W = load({ storage: store });
    const E = W.BCE;
    E.start({ mode: "drill", progKey: "CSL", level: 2, slot: 3 });
    const S = E.state();
    for (let i = 0; i < 6; i++) {
      const open = S.queue.filter((x) => !x.done);
      E.submit(open[0].id, answerFromKey(W, open[0]));
    }
    const W2 = load({ storage: store });
    const back = W2.BCE.load(3);
    t.ok("drill progress is saved", !!back && back.stats.drillN === 6, back ? `drillN ${back.stats.drillN}` : "nothing saved");
    t.eq("the active slot is remembered", W2.BCS.activeSlot(), 3);
  }

  /* five careers coexist and stay separate */
  {
    const store = fakeStorage();
    const W = load({ storage: store });
    playSome(W, 4, 1, { progKey: "AUR", name: "Aurora run" });
    playSome(W, 7, 2, { progKey: "HYD", name: "Halyard run" });
    const metas = W.BCS.listSlots();
    t.eq("slot one is occupied", metas[0].empty, false);
    t.eq("slot two is occupied", metas[1].empty, false);
    t.eq("slot three is free", metas[2].empty, true);
    t.eq("slot one keeps its own program", metas[0].prog, "AURORA-GEO");
    t.eq("slot two keeps its own program", metas[1].prog, "HALYARD D6");
    t.ok("the two careers hold different amounts of work", metas[0].xp !== metas[1].xp, "both slots have the same experience");
    W.BCS.clear(2);
    t.eq("deleting a slot leaves the others alone", W.BCS.listSlots()[0].empty, false);
    t.eq("the deleted slot is gone", W.BCS.listSlots()[1].empty, true);
    t.eq("the free slot finder skips occupied slots", W.BCS.firstFree(), 2);
  }

  /* an old single slot save is carried forward, not dropped */
  {
    const store = fakeStorage();
    const W = load({ storage: store });
    const S = playSome(W, 5, 1);
    const legacy = JSON.parse(JSON.stringify(S));
    legacy.v = 1;
    delete legacy.name; delete legacy.updated; delete legacy.app;
    store.clear();
    store.setItem("baseline-control.save.v1", JSON.stringify(legacy));
    store.setItem("baseline-control.theme", "dark");
    store.setItem("baseline-control.helped", "1");

    const W2 = load({ storage: store });
    W2.BCS.adoptLegacy();
    const back = W2.BCS.read(1);
    t.ok("a version one save is migrated into slot one", !!back, "the old save was lost");
    if (back) {
      t.eq("the migrated save reports the current format", back.v, W2.BCS.FORMAT);
      t.eq("the migrated career keeps its day", back.day, legacy.day);
      t.ok("the migrated career gets a name", !!back.name, "no name assigned");
    }
    t.eq("the old key is cleared once adopted", store.getItem("baseline-control.save.v1"), null);
    t.eq("the theme preference is carried over", W2.BCS.pref.get("theme"), "dark");
    t.eq("the help flag is carried over", W2.BCS.pref.get("helped"), "1");
  }

  /* export and import */
  {
    const store = fakeStorage();
    const W = load({ storage: store });
    const S = playSome(W, 8, 1);
    const text = W.BCS.exportText(1);
    t.ok("export produces something", text.length > 500, `${text.length} characters`);
    t.ok("the export file name is sensible", /^baseline-control-.*day\d+\.json$/.test(W.BCS.exportName(1)), W.BCS.exportName(1));

    const store2 = fakeStorage();
    const W2 = load({ storage: store2 });         // a different device
    const r = W2.BCS.importText(text, 4);
    t.ok("an export imports on a clean browser", r.ok, r.err);
    const back = W2.BCS.read(4);
    if (back) {
      t.eq("the imported career keeps its day", back.day, S.day);
      t.eq("the imported career keeps its experience", back.xp, S.xp);
      t.eq("the imported career keeps its seed", back.seed, S.seed);
      t.ok("the imported career can be resumed", !!W2.BCE.resume(back, 4) && W2.BCE.state().day === S.day, "resume failed");
    }

    t.ok("garbage is rejected with a readable message", W2.BCS.importText("not json at all", 5).err.length > 10, "no message");
    t.ok("valid JSON that is not a save is rejected", W2.BCS.importText('{"hello":true}', 5).err.length > 10, "no message");
    const tooNew = JSON.stringify({ state: Object.assign({}, JSON.parse(text).state, { v: 99 }) });
    const rn = W2.BCS.importText(tooNew, 5);
    t.ok("a save from a newer version is refused, not mangled", !rn.ok && /newer/i.test(rn.err), rn.err || "accepted");
    t.eq("a refused import leaves the slot empty", W2.BCS.listSlots()[4].empty, true);
  }

  /* a slot written by a newer build is reported rather than silently wiped */
  {
    const store = fakeStorage();
    const W = load({ storage: store });
    const S = playSome(W, 3, 1);
    const raw = JSON.parse(JSON.stringify(S));
    raw.v = 99;
    store.setItem("bc.v2.slot1", JSON.stringify(raw));
    const W2 = load({ storage: store });
    t.eq("a newer slot is flagged", W2.BCS.meta(1).tooNew, true);
    t.eq("a newer slot will not load", W2.BCS.read(1), null);
  }

  /* answers half filled in on the current item survive a reload */
  {
    const store = fakeStorage();
    const W = load({ storage: store });
    const E = W.BCE, II = W.BCUII;
    E.start({ mode: "career", progKey: "AUR", slot: 1 });
    const S = E.state();
    let item = S.queue.find((x) => x.kind === "release");
    if (!item) { item = E.makeItem("release"); S.queue.push(item); }
    II.resetForm(item);
    const f = II.form();
    f.findings[item.data.shown[0]] = true;
    f.disposition = "return";
    W.BCS.formSave(item.id, f);
    E.save();

    const W2 = load({ storage: store });
    const back = W2.BCE.load(1);
    W2.BCE.resume(back, 1);
    const restoredItem = back.queue.find((x) => x.id === item.id);
    const saved = W2.BCS.formLoad(item.id);
    t.ok("a half finished answer is saved", !!saved, "nothing stored");
    t.ok("the item it belongs to is still in the queue", !!restoredItem, "item vanished");
    if (saved && restoredItem) {
      W2.BCUII.setForm(restoredItem, saved);
      const f2 = W2.BCUII.form();
      t.eq("the ticked finding comes back", f2.findings[restoredItem.data.shown[0]], true);
      t.eq("the chosen disposition comes back", f2.disposition, "return");
    }
    t.eq("a form saved for another item is not applied", W2.BCS.formLoad("some-other-id"), null);
    W2.BCS.setActiveSlot(5);
    t.eq("a form saved in another slot is not applied", W2.BCS.formLoad(item.id), null);
  }

  /* a stale form cannot make an incomplete answer look complete */
  {
    const W = load();
    const E = W.BCE, II = W.BCUII;
    E.start({ mode: "drill", progKey: "AUR", level: 3, slot: 1 });
    const S = E.state();
    const audit = E.makeItem("audit");
    S.queue.push(audit);
    II.setForm(audit, { rows: ["finding"] });     // one row from some other item
    t.eq("a mismatched row list is discarded", II.form().rows.length, audit.data.rows.length);
    t.ok("the discarded list leaves the answer incomplete",
      II.form().rows.every((x) => x === null), "stale answers were kept");
  }

  /* storage that refuses to write is reported, and the game still runs */
  {
    const blocked = {
      getItem() { return null; },
      setItem() { throw new Error("denied"); },
      removeItem() {}
    };
    const W = load({ storage: blocked });
    t.eq("blocked storage is detected", W.BCS.available(), false);
    t.ok("blocked storage explains itself", W.BCS.reason().length > 20, "no explanation");
    let done = -1;
    try { done = playSome(W, 14, 1).stats.done; } catch (e) { done = -1; }
    t.ok("the game still plays with no storage", done >= 8, done < 0 ? "the game threw without storage" : `only ${done} items completed`);
    t.eq("a write that cannot happen is reported, not pretended", W.BCS.write(1, { v: 2 }), false);
  }

  /* a long career stays inside a sane size */
  {
    const store = fakeStorage();
    const W = load({ storage: store });
    const E = W.BCE;
    E.start({ mode: "career", progKey: "NGL", slot: 1 });
    const S = E.state();
    for (let d = 0; d < 60; d++) {
      let g = 0;
      while (g++ < 30) {
        const open = S.queue.filter((x) => !x.done);
        if (!open.length) break;
        E.submit(open[0].id, answerFromKey(W, open[0]));
      }
      E.endDay();
      if (S.pendingBoard) { const p = E.prepBoard(); E.takeBoard(p.qs.map((q) => q.__a)); }
    }
    const bytes = store.getItem("bc.v2.slot1").length;
    t.ok(`a sixty day career saves in ${Math.round(bytes / 1024)} KB`, bytes < 400 * 1024, `${bytes} bytes is too large for browser storage`);
    t.ok("the save stamp moves forward", W.BCS.lastSaved() > 0, "never stamped");
    t.ok("the save stamp reads as text", W.BCS.sinceText().length > 3, "empty");
  }

  /* handing the viewer a file: the route depends on the host, and the copy
     affordance is always there so export never silently does nothing */
  {
    const W = load();
    W.BCS.probeDownloads();
    t.ok("a top level page offers a real download", W.BCS.canDownload(), "no download route on a plain page");
    let answered = null;
    W.BCS.saveFile("x.json", "{}", (ok, msg) => { answered = { ok, msg }; });
    t.ok("saveFile always answers", answered !== null, "no callback");
    t.ok("saveFile explains itself when it cannot save", !answered || answered.ok || answered.msg.length > 10, "silent failure");
  }

  return t.done();
}
module.exports = { run };
