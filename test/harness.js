/* Loads the game's plain scripts into a sandbox with just enough DOM to run
   headless. The scripts are the same files the browser loads, in the same
   order that index.html declares, so the tests cannot drift from the page. */
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.join(__dirname, "..");

function scriptOrder() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  return [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>/g)]
    .map((m) => m[1])
    .filter((p) => !p.includes("boot-sw"));
}

function fakeStorage() {
  const map = new Map();
  return {
    _map: map,
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => map.clear(),
    get length() { return map.size; }
  };
}

function fakeEl() {
  const node = {
    innerHTML: "", hidden: false, value: "", style: {},
    children: [], firstChild: null,
    appendChild(c) { this.children.push(c); this.firstChild = this.children[0]; return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); this.firstChild = this.children[0] || null; },
    focus() {}, setSelectionRange() {}, select() {}, remove() {}, closest: () => null,
    querySelector: () => null, addEventListener() {}, scrollIntoView() {}
  };
  return node;
}

function load(opts = {}) {
  const storage = opts.storage || fakeStorage();
  const doc = {
    readyState: "complete",
    addEventListener() {},
    getElementById: () => fakeEl(),
    createElement: () => fakeEl(),
    querySelector: () => null,
    documentElement: { getAttribute: () => null, setAttribute() {} },
    body: fakeEl(),
    visibilityState: "visible"
  };
  const sandbox = {
    document: doc,
    localStorage: storage,
    navigator: { serviceWorker: undefined, clipboard: undefined },
    matchMedia: () => ({ matches: false }),
    setTimeout, clearTimeout, console,
    Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error,
    isNaN, parseInt, parseFloat,
    confirm: () => true, prompt: () => "x", alert: () => {},
    Blob: function () {}, URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    FileReader: function () {},
    location: { protocol: "file:" },
    addEventListener() {}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const rel of scriptOrder()) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
  }
  sandbox.__storage = storage;
  return sandbox;
}

/* answer any generated item correctly, straight from its own key */
function answerFromKey(W, it) {
  const II = W.BCUII, d = it.data, k = it.kind;
  II.resetForm(it);
  const f = II.form();
  if (k === "release") { f.disposition = d.disposition; d.defects.forEach((x) => { f.findings[x] = true; }); }
  else if (k === "cdrl" || k === "sdrl") { f.action = d.action; d.defects.forEach((x) => { f.findings[x] = true; }); }
  else if (k === "ecp") { f.cls = String(d.key.cls); f.pri = d.key.pri; f.route = d.key.route; }
  else if (k === "ipn" || k === "variance" || k === "csa") f.pick = d.key;
  else if (k === "audit" || k === "minutes") f.rows = d.rows.map((r) => r.key);
  else if (k === "gate") f.answers = d.qs.map((q) => q.a);
  else if (k === "ccb") f.dispositions = d.items.map((i) => i.key);
  else f.pick = d.opts.findIndex((o) => o.k);
  return II.collect(it);
}

/* answer it wrong on purpose */
function answerBadly(W, it) {
  const II = W.BCUII, d = it.data, k = it.kind;
  II.resetForm(it);
  const f = II.form();
  if (k === "release") f.disposition = "release";
  else if (k === "cdrl" || k === "sdrl") f.action = "submit";
  else if (k === "ecp") { f.cls = String(d.key.cls === 1 ? 2 : 1); f.pri = d.key.pri === "Routine" ? "Emergency" : "Routine"; f.route = "none"; }
  else if (k === "ipn") f.pick = W.BCT1.IPN_OPTS.find((o) => o.id !== d.key).id;
  else if (k === "variance") f.pick = W.BCT1.VAR_OPTS.find((o) => o.id !== d.key).id;
  else if (k === "csa") f.pick = (d.opts.find((o) => String(o.id) !== String(d.key)) || d.opts[0]).id;
  else if (k === "audit") f.rows = d.rows.map((r) => (r.key === "finding" ? "conform" : "finding"));
  else if (k === "minutes") f.rows = d.rows.map((r) => (r.key === "action" ? "disc" : "action"));
  else if (k === "gate") f.answers = d.qs.map((q) => (q.a + 1) % 4);
  else if (k === "ccb") f.dispositions = d.items.map((i) => (i.key === "approve" ? "defer" : "approve"));
  else f.pick = d.opts.findIndex((o) => !o.k);
  return II.collect(it);
}

const KINDS = ["release", "ecp", "ipn", "variance", "cdrl", "sdrl", "csa", "audit", "gate", "minutes", "ccb", "event", "senior"];

function suite(name) {
  const checks = [];
  return {
    name,
    checks,
    ok(label, cond, detail) { checks.push({ label, ok: !!cond, detail: cond ? "" : (detail || "") }); },
    eq(label, a, b) { checks.push({ label, ok: a === b, detail: a === b ? "" : `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}` }); },
    done() { return { name, checks }; }
  };
}

module.exports = { load, fakeStorage, answerFromKey, answerBadly, KINDS, suite, scriptOrder };
