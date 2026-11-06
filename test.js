// Run: node test.js — extracts the engine <script> from index.html and checks the math.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const m = { exports: {} }; new Function('module', src)(m);
const { CATALOG, compute, tiered } = m.exports;

const I = { tbDay: 1, retention: 90, compression: 3, copies: 1.5, rowBytes: 500, complexity: 'medium', streamPct: 0,
  runsDay: 24, steps: 10, inv: 10000, sec: 5, mem: 0.5, curatedPct: 30, queryTb: 1, whHours: 8,
  egressGb: 50, xregionGb: 0, logsGb: 5, sameCloud: false };
const choice = { ingest: 'custom', stream: 'kinesis', storage: 's3std', compute: 'glue', scripts: 'lambda', orch: 'mwaas', wh: 'none', net: 'aws', mon: 'cw' };
const R = compute(I, choice);
const line = id => R.lines.find(l => l.cat.id === id);
const near = (a, b) => assert(Math.abs(a - b) < 0.01, `${a} != ${b}`);

near(tiered(100, [[51200, 0.023]]), 2.3);
near(tiered(60000, [[51200, 0.023], [Infinity, 0.022]]), 51200 * 0.023 + 8800 * 0.022);
// storage: 1024 GB/3*1.5*90 = 46080 GB × $0.023 / 30.4
near(line('storage').sel.day, 46080 * 0.023 / 30.4);
// glue: 1024/15 vCPU-h /4 DPU × 0.44
near(line('compute').sel.day, 1024 / 15 / 4 * 0.44);
near(line('orch').sel.day, 0.49 * 24);
near(line('stream').sel.day, 0);                        // no streaming → zero, incl. fixed stream-hour
near(line('net').sel.day, 50 * 0.09);
near(R.month, R.day * 30.4);
// suggestions are strictly cheaper and sorted
for (const l of R.lines) { l.cheaper.forEach(c => assert(c.day < l.sel.day)); if (l.cheaper[1]) assert(l.cheaper[0].day <= l.cheaper[1].day); }
assert(line('compute').cheaper.length > 0, 'Glue 5 should have cheaper alternatives');
// same-cloud filter keeps only aws/any
compute({ ...I, sameCloud: true }, choice).lines.forEach(l => l.cheaper.forEach(c => assert(['aws', 'any'].includes(c.o.cloud))));
// every option returns finite numbers with 10% streaming
const R2 = compute({ ...I, streamPct: 10 }, choice);
for (const c of CATALOG) for (const o of c.options) { const r = o.cost({ ...I, streamPct: 10 }, R2.X); assert(Number.isFinite(r.day) && r.day >= 0, o.id); }
console.log('ok — 1 TB/day sample:', '$' + R.day.toFixed(2) + '/day', '$' + R.month.toFixed(0) + '/mo');
