/* bands.js — banded code-table ratios → required count
   =========================================================================
   PURE MODULE. The arithmetic shape of a code fixture/quantity table: a load
   is charged against one or more BANDS, each "1 per N" up to a cutoff, the
   remainder falling to the next band — e.g. IPC business water closets,
   "1 per 25 for the first 50 and 1 per 50 for the remainder exceeding 50".
   The module computes the EXACT fractional requirement and leaves the
   rounding to the caller (codes read fixture fractions UP; the tool page
   surfaces both the exact value and the round-up, as everywhere else in this
   suite).

   CONTRACT
     bandedExact(load, bands) → exact fractional count (Number)
       load  — persons charged to this ratio (may be fractional: a 50/50
               sex split of an odd load is x.5)
       bands — [{ per, upTo? }] in order; `upTo` is the cumulative load this
               band covers through; the LAST band must omit upTo (open).
               [{per: 25, upTo: 50}, {per: 50}] reads: 1 per 25 for the
               first 50, then 1 per 50 for the remainder.
     banded(load, bands) → { exact, count }   count = ceil(exact)

   Fails loud on malformed bands (the table data is code-critical — a typo
   must crash a test, not produce a quiet wrong answer).
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.Bands = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function validate(bands) {
    if (!Array.isArray(bands) || bands.length === 0) throw new TypeError('bands: bands must be a non-empty array');
    var prev = 0;
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      if (!b || !(b.per > 0) || !isFinite(b.per)) throw new TypeError('bands: per must be a positive number, got ' + (b && b.per));
      var last = i === bands.length - 1;
      if (last) {
        if (b.upTo != null) throw new TypeError('bands: the last band must be open (no upTo)');
      } else {
        if (!(b.upTo > prev) || !isFinite(b.upTo)) throw new TypeError('bands: upTo must increase, got ' + b.upTo + ' after ' + prev);
        prev = b.upTo;
      }
    }
  }

  function bandedExact(load, bands) {
    if (!(load >= 0) || !isFinite(load)) throw new TypeError('bands: load must be a number ≥ 0, got ' + load);
    validate(bands);
    var total = 0, prev = 0;
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var hi = b.upTo != null ? b.upTo : Infinity;
      var inBand = Math.max(0, Math.min(load, hi) - prev);
      total += inBand / b.per;
      prev = hi;
      if (load <= hi) break;
    }
    return total;
  }

  function banded(load, bands) {
    var exact = bandedExact(load, bands);
    return { exact: exact, count: Math.ceil(exact) };
  }

  // a human reading of a band spec, for echoes and audits
  function describe(bands) {
    validate(bands);
    if (bands.length === 1) return '1 per ' + bands[0].per;
    var parts = [], prev = 0;
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      if (b.upTo != null) { parts.push('1 per ' + b.per + ' for the first ' + b.upTo); prev = b.upTo; }
      else parts.push('1 per ' + b.per + ' for the remainder exceeding ' + prev);
    }
    return parts.join(' and ');
  }

  return { banded: banded, bandedExact: bandedExact, describe: describe };
});

/* headless entry: `node bands.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var B = module.exports;
  var pass = 0, fail = 0;
  function eq(label, got, want) {
    if (Math.abs(got - want) < 1e-12) pass++; else { fail++; console.log('FAIL ' + label + ': got ' + got + ' want ' + want); }
  }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }
  var BIZ_WC = [{ per: 25, upTo: 50 }, { per: 50 }];     // IPC business water closets (verified)
  var BIZ_LAV = [{ per: 40, upTo: 80 }, { per: 80 }];    // IPC business lavatories (verified)

  /* the ICC worked example shape: per-sex load through the business bands */
  eq('40 in first band: 40/25', B.bandedExact(40, BIZ_WC), 1.6);
  eq('exactly the cutoff: 50/25', B.bandedExact(50, BIZ_WC), 2);
  eq('past the cutoff: 2 + 50/50', B.bandedExact(100, BIZ_WC), 3);
  eq('150 → 2 + 100/50 = 4', B.bandedExact(150, BIZ_WC), 4);
  eq('count rounds up', B.banded(40, BIZ_WC).count, 2);
  eq('count exact stays', B.banded(50, BIZ_WC).count, 2);
  eq('fractional sex split: 62.5 → 2 + 12.5/50', B.bandedExact(62.5, BIZ_WC), 2.25);
  eq('lav bands: 80/40', B.bandedExact(80, BIZ_LAV), 2);
  eq('lav bands: 160 → 2 + 80/80 = 3', B.bandedExact(160, BIZ_LAV), 3);
  eq('single open band: 1 per 500', B.bandedExact(1250, [{ per: 500 }]), 2.5);
  eq('zero load → 0', B.bandedExact(0, BIZ_WC), 0);
  eq('describe single', B.describe([{ per: 100 }]) === '1 per 100' ? 1 : 0, 1);
  eq('describe banded', B.describe(BIZ_WC) === '1 per 25 for the first 50 and 1 per 50 for the remainder exceeding 50' ? 1 : 0, 1);

  threw('empty bands throws', function () { B.bandedExact(10, []); });
  threw('open band not last throws', function () { B.bandedExact(10, [{ per: 25 }, { per: 50 }]); });
  threw('non-increasing upTo throws', function () { B.bandedExact(10, [{ per: 25, upTo: 50 }, { per: 30, upTo: 40 }, { per: 50 }]); });
  threw('zero per throws', function () { B.bandedExact(10, [{ per: 0 }]); });
  threw('negative load throws', function () { B.bandedExact(-5, [{ per: 10 }]); });

  console.log('=== bands: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
