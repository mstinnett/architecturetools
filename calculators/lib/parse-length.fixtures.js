/* parse-length.fixtures.js — ground-truth test cases for parse-length.js
   =========================================================================
   The canonical assertion is on `units` by EXACT integer equality. Every
   expected unit count is computed from exact integer constants — never a
   hand-typed `value_mm × 960`, so no decimal ever enters the ground truth.

   Reusable by DocCheck as a regression suite. Runs headless:
       node parse-length.fixtures.js
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else root.ParseLengthFixtures = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MM = 960, CM = 9600, M = 960000, IN = 24384, FT = 12 * IN; // exact unit counts

  // expect shapes:
  //   { units: <int> }                     exact length
  //   { isNull: true }                      parseLength returns null
  //   { units: null }                       object returned, but value unresolved
  //   { dim0: { count, remainder_units } }  length ÷ length ratio
  //   { pending: "<substr>" }               a pending span covering this text
  //   { inferred: [<bool>...] }             interpretation.terms[].inferred flags
  var FIXTURES = [
    // ---- 1a-4  foot-inch compounds ----
    { input: "3'-4 1/2\"",            expect: { units: 3 * FT + 9 * IN / 2 }, gate: '1a-4' },
    { input: "3' 4 1/2\"",            expect: { units: 3 * FT + 9 * IN / 2 }, gate: '1a-4' },
    { input: "3'4 1/2\"",             expect: { units: 3 * FT + 9 * IN / 2 }, gate: '1a-4' },
    { input: "3' 4.5\"",              expect: { units: 3 * FT + 9 * IN / 2 }, gate: '1a-4' },
    { input: "3ft 4.5in",            expect: { units: 3 * FT + 9 * IN / 2 }, gate: '1a-4' },
    { input: "3'-0\"",               expect: { units: 3 * FT },              gate: '1a-4' },
    { input: "7'-1\"",               expect: { units: 7 * FT + 1 * IN },     gate: '1a-4' }, // dash + inch = compound
    { input: "7'-1",                 expect: { units: 7 * FT + 1 * IN },     gate: '1a-4' }, // dash + unitless = inches

    // dash before FEET is subtraction, not a foot-inch separator
    { input: "7'-1'",                expect: { units: 7 * FT - 1 * FT },     gate: '1b' },
    { input: "7' - 1'",             expect: { units: 7 * FT - 1 * FT },     gate: '1b' },
    { input: "10'-6' + 2\"",        expect: { units: 10 * FT - 6 * FT + 2 * IN }, gate: '1b' },

    // ---- 1a-1  glyph normalization ----
    { input: "3′-4½″", expect: { units: 3 * FT + 9 * IN / 2 }, gate: '1a-1' }, // 3′-4½″
    { input: "3′ 4½″", expect: { units: 3 * FT + 9 * IN / 2 }, gate: '1a-1' },

    // ---- 1a-3  imperial inch terms ----
    { input: "40.5\"",               expect: { units: 81 * IN / 2 },         gate: '1a-3' },
    { input: "40 1/2\"",             expect: { units: 81 * IN / 2 },         gate: '1a-3' },
    { input: "1/2\"",                expect: { units: IN / 2 },              gate: '1a-3' },
    { input: "1 1/2\"",              expect: { units: 3 * IN / 2 },          gate: '1a-3' },
    { input: "40.5'",                expect: { units: 81 * FT / 2 },         gate: '1a-3' },
    { input: "3/12\"",               expect: { units: IN / 4 },              gate: '1a-3' }, // fraction literal, not division

    // ---- 1a-2  metric single terms ----
    { input: "1m",                   expect: { units: M },                   gate: '1a-2' },
    { input: "1.5m",                 expect: { units: 3 * M / 2 },           gate: '1a-2' },
    { input: "1500mm",               expect: { units: 1500 * MM },           gate: '1a-2' },
    { input: "1500 mm",              expect: { units: 1500 * MM },           gate: '1a-2' },
    { input: "150cm",                expect: { units: 150 * CM },            gate: '1a-2' },

    // ---- 1a-5  bare-number default-unit terms ----
    { input: "1500", opts: { defaultUnit: 'mm' }, expect: { units: 1500 * MM }, gate: '1a-5' },
    { input: "40.5", opts: { defaultUnit: 'in' }, expect: { units: 81 * IN / 2 }, gate: '1a-5' },

    // ---- 1b  arithmetic ----
    { input: "8' + 3 1/2\"",         expect: { units: 8 * FT + 7 * IN / 2 }, gate: '1b' },
    { input: "1m - 25mm",            expect: { units: M - 25 * MM },         gate: '1b' },
    { input: "12\" * 3",             expect: { units: 12 * IN * 3 },         gate: '1b' },
    { input: "3 * 12\"",             expect: { units: 12 * IN * 3 },         gate: '1b' },
    { input: "40' / 2",              expect: { units: 40 * FT / 2 },         gate: '1b' },
    { input: "(8' + 4\") / 2",       expect: { units: (8 * FT + 4 * IN) / 2 }, gate: '1b' },
    { input: "8\" - 3\"",            expect: { units: 8 * IN - 3 * IN },     gate: '1b' },
    { input: "-3\"",                 expect: { units: -3 * IN },             gate: '1b' },
    { input: "+ 8\"",                expect: { units: 8 * IN },              gate: '1b' },
    { input: "12\" / 4",             expect: { units: 12 * IN / 4 },         gate: '1b' }, // n-section clean
    { input: "12\" / 3",             expect: { units: 12 * IN / 3 },         gate: '1b' }, // length ÷ scalar
    { input: "12\" / 7",             expect: { units: 41801 },               gate: '1b' }, // per-part quantized

    // ---- 1b/1c  inheritance (bare takes the NEAREST stated unit) ----
    { input: "8'4\" + 3",            expect: { units: 8 * FT + 4 * IN + 3 * IN, inferred: [false, true] }, gate: '1b/1c' },
    { input: "8' + 3",              expect: { units: 8 * FT + 3 * FT, inferred: [false, true] },          gate: '1b/1c' },
    // leading bare takes the adjacent inch term (not the finer cm further off)
    { input: "8 - 1/2\" + 11cm",    expect: { units: 8 * IN - IN / 2 + 11 * CM, inferred: [true, false, false] }, gate: '1b/1c' },
    { input: "5\" + 3 + 2cm",       expect: { units: 5 * IN + 3 * IN + 2 * CM, inferred: [false, true, false] }, gate: '1b/1c' },

    // ---- 1b  dimensional outcomes ----
    { input: "12\" * 3\"",           expect: { isNull: true },               gate: '1b' }, // area
    { input: "12\" / 3\"",           expect: { dim0: { count: 4, remainder_units: 0 } },     gate: '1b' },
    { input: "13\" / 3\"",           expect: { dim0: { count: 4, remainder_units: 1 * IN } }, gate: '1b' },

    // ---- 1c  spans / salvage / conflict ----
    { input: "1m approx",            expect: { units: M, pending: 'approx' },   gate: '1c' },
    { input: "3'4\" blah",           expect: { units: 3 * FT + 4 * IN, pending: 'blah' }, gate: '1c' },
    { input: "3' 4' 5\"",            expect: { units: null, pending: "4'" },    gate: '1c' },
    { input: "3' + 4' + 5\"",        expect: { units: 3 * FT + 4 * FT + 5 * IN }, gate: '1c' },
    { input: "8' +",                 expect: { units: 8 * FT, pending: '+' },   gate: '1c' },
    { input: "hello",                expect: { isNull: true },                  gate: '1c' }
  ];

  function check(parseLength, fx) {
    var r = parseLength(fx.input, fx.opts);
    var e = fx.expect;
    var fails = [];

    if (e.isNull) {
      if (r !== null) fails.push('expected null, got ' + JSON.stringify(r && r.units));
      return fails;
    }
    if (r === null) { fails.push('got null, expected object'); return fails; }

    if (e.hasOwnProperty('units')) {
      if (r.units !== e.units) fails.push('units ' + r.units + ' !== ' + e.units);
    }
    if (e.dim0) {
      if (r.dimension !== 0) fails.push('dimension ' + r.dimension + ' !== 0');
      if (r.count !== e.dim0.count) fails.push('count ' + r.count + ' !== ' + e.dim0.count);
      if (r.remainder_units !== e.dim0.remainder_units)
        fails.push('remainder_units ' + r.remainder_units + ' !== ' + e.dim0.remainder_units);
    }
    if (e.pending) {
      var hit = (r.spans || []).some(function (s) {
        if (s.status !== 'pending') return false;
        var txt = String(fx.input).slice(s.start, s.end);
        return txt.indexOf(e.pending) !== -1;
      });
      if (!hit) fails.push('no pending span covering "' + e.pending + '" — spans=' + JSON.stringify(r.spans));
    }
    if (e.inferred) {
      var got = (r.interpretation.terms || []).map(function (t) { return !!t.inferred; });
      if (JSON.stringify(got) !== JSON.stringify(e.inferred))
        fails.push('inferred ' + JSON.stringify(got) + ' !== ' + JSON.stringify(e.inferred));
    }
    return fails;
  }

  function run(parseLength, log) {
    log = log || function (s) { try { console.log(s); } catch (e) {} };
    var pass = 0, fail = 0, byGate = {};
    for (var i = 0; i < FIXTURES.length; i++) {
      var fx = FIXTURES[i];
      var fails = check(parseLength, fx);
      byGate[fx.gate] = byGate[fx.gate] || { pass: 0, fail: 0 };
      if (fails.length === 0) { pass++; byGate[fx.gate].pass++; }
      else {
        fail++; byGate[fx.gate].fail++;
        log('FAIL [' + fx.gate + '] ' + JSON.stringify(fx.input) + '  →  ' + fails.join(' ; '));
      }
    }
    log('---');
    Object.keys(byGate).sort().forEach(function (g) {
      var b = byGate[g];
      log((b.fail === 0 ? 'GREEN' : 'RED  ') + ' ' + g + '  ' + b.pass + '/' + (b.pass + b.fail));
    });
    log('=== ' + pass + ' passed, ' + fail + ' failed, ' + FIXTURES.length + ' total ===');
    return fail === 0;
  }

  return { FIXTURES: FIXTURES, run: run, check: check, K: { MM: MM, CM: CM, M: M, IN: IN, FT: FT } };
});

/* headless entry: `node parse-length.fixtures.js` */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var parse = require('./parse-length.js');
  var fx = module.exports;
  var ok = fx.run(parse.parseLength);
  process.exit(ok ? 0 : 1);
}
