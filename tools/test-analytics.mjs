#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { parseLength } = require('../calculators/lib/parse-length.js');
const source = readFileSync(new URL('../assets/js/analytics.js', import.meta.url), 'utf8');
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
function load(hostname = 'architecture.tools', sender) {
  const calls = [];
  const root = { location: { hostname }, plausible: sender || ((...args) => calls.push(args)) };
  vm.runInNewContext(source, { window: root });
  return { root, analytics: root.SiteAnalytics, calls };
}
const { analytics } = load();
const events = (text, target = 'imperial', opts) => Array.from(analytics.conversionEvents(parseLength(text, opts), target));

check('metric conversion', () => assert.deepEqual(events('1m'), ['Conversion Used', 'Conversion: Metric to Imperial']));
check('imperial conversion', () => assert.ok(events('6 ft', 'metric').includes('Conversion: Imperial to Metric')));
check('same-system rounding', () => assert.ok(events('1m', 'metric').includes('Conversion: Metric to Metric')));
check('mixed-unit conversion', () => assert.ok(events('1m + 1ft').includes('Conversion: Mixed to Imperial')));
for (const text of ['1/2 in', "5'-6\"", '-2m', '+2m', '1 1/2 ft']) {
  check('not arithmetic: ' + text, () => assert.equal(events(text).some(e => e.startsWith('Expression')), false));
}
for (const [text, operation] of [['1m + 2m', 'Addition'], ['1m - 2m', 'Subtraction'], ['1m * 2', 'Multiplication'], ['1m / 2', 'Division']]) {
  check('arithmetic: ' + operation, () => assert.ok(events(text).includes('Expression: ' + operation)));
}
check('mixed operations', () => assert.ok(events('1m + 2m * 3').includes('Expression: Combined')));
check('area', () => assert.ok(events('1m * 2m').includes('Conversion: Area')));
check('ratio', () => assert.ok(events('1m / 2mm').includes('Conversion: Ratio')));
for (const text of ['', 'hello', '1m +', '1m junk', '1m / 0', '100001m', '100001m * 100001m', '1m * 1m * 1m']) {
  check('exclude unfinished/invalid/out-of-range: ' + text, () => assert.deepEqual(events(text), []));
}
check('bare units respect selected default', () => assert.ok(events('12', 'imperial', { defaultUnit: 'mm' }).includes('Conversion: Metric to Imperial')));
check('no events on load', () => assert.equal(load().calls.length, 0));
check('categories count once per page load and transmit names only', () => {
  const { analytics: a, calls } = load();
  a.conversion(parseLength('1m + 2m'), 'imperial');
  a.conversion(parseLength('3m + 4m'), 'imperial');
  a.software('revit'); a.software('revit'); a.setup('desktop'); a.platform('win');
  assert.equal(calls.length, 8);
  assert.equal(new Set(calls.map(c => c[0])).size, calls.length);
  assert.ok(calls.every(c => c.length === 1 && a.goals.includes(c[0])));
});
check('unknown software does not become an event', () => {
  const { analytics: a, calls } = load(); a.software('anything'); a.setup('anything'); a.platform('anything');
  assert.equal(calls.length, 0);
});
check('local and unapproved hosts never transmit', () => {
  for (const host of ['localhost', '127.0.0.1', 'preview.example', 'architecture.tools.evil.test']) {
    const { analytics: a, calls } = load(host); a.software('revit'); assert.equal(calls.length, 0);
  }
});
check('www works', () => { const { analytics: a, calls } = load('www.architecture.tools'); a.pickerUsed(); assert.equal(calls.length, 1); });
check('blocked or throwing tracker does not break tools', () => {
  const { root, analytics: a } = load(); delete root.plausible; a.pickerUsed();
  root.plausible = () => { throw Error('blocked'); }; a.pickerUsed();
  let sent = 0; root.plausible = () => { sent++; }; a.pickerUsed(); assert.equal(sent, 1);
});
check('35 unique goal definitions', () => { assert.equal(analytics.goals.length, 35); assert.equal(new Set(analytics.goals).size, 35); });
check('page JavaScript parses', () => {
  for (const file of ['picker.html', 'calculators/convert.html']) {
    const html = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  }
});
console.log('\n' + checks + ' analytics checks passed.');
