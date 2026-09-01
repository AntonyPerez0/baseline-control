#!/usr/bin/env node
/* npm test. Every suite runs, the results print, and a failure exits nonzero
   so a broken build never reaches Pages. */
const suites = [
  require("./grading.js"),
  require("./dates.js"),
  require("./career.js"),
  require("./store.js"),
  require("./teach.js")
];

const quick = process.argv.includes("--quick");
const started = Date.now();
let total = 0, failed = 0;

for (const s of suites) {
  const res = s.run === undefined ? s : s.run(quick ? 40 : undefined);
  console.log("\n  " + res.name);
  console.log("  " + "-".repeat(res.name.length));
  for (const c of res.checks) {
    total++;
    if (!c.ok) failed++;
    const mark = c.ok ? "  ok  " : "  FAIL";
    console.log(mark + "  " + c.label + (c.ok || !c.detail ? "" : "\n           " + c.detail));
  }
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n  ${total - failed} of ${total} checks passed in ${secs}s\n`);
process.exit(failed ? 1 : 0);
