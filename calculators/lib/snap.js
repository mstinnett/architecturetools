/* snap.js — value + grid + direction → snapped value
   =========================================================================
   PURE MODULE. Operates on numbers only: it knows nothing about units or
   meaning. The architect-facing Min / Max language is a label applied later
   (see "MIN/MAX MAPPING" below); this module only knows floor / nearest / ceil
   against a grid. Reused verbatim by DocCheck (its core verification op).

   CONTRACT
     snap(units, gridCount, dir) → number
       units      integer count of 1/960 mm (the value's canonical count)
       gridCount  grid spacing in the SAME units (Phase 3 supplies it)
       dir        "floor" | "nearest" | "ceil"

   Every grid the converter offers is an exact integer count, so snapping is
   exact integer arithmetic — no float, no epsilon. "On grid" is a FACT
   (units % gridCount === 0), not a tolerance. There is no float at the
   discontinuity because there is no float at the discontinuity.

   GRID COUNTS (Phase 3 builds the control; these are the values it passes):
     Imperial  1/64"=381 · 1/32"=762 · 1/16"=1524 · 1/8"=3048 · 1/4"=6096 · 1/2"=12192
               (each denom → gridCount = 24384 / denom)
     Metric    1mm=960 · 5mm=4800 · 10mm=9600 · 100/300/600mm = 96000/288000/576000
               (each mm → gridCount = mm × 960)

   MIN/MAX MAPPING (lives here as doc, applied in the UI)
     Min ≥  (a minimum dimension, result must not fall below true) → "ceil"
     Max ≤  (a maximum dimension, result must not exceed true)     → "floor"
     Nearest ≈ (not a constraint, just least error)                → "nearest"
   This holds for every input regardless of cell position, which is why the
   number-line geometry never flips sides.
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.Snap = mod; root.snap = mod.snap; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // snap is a low-level math primitive — fail loudly on programmer error,
  // even though the parser itself never throws.
  function snap(units, gridCount, dir) {
    if (!Number.isSafeInteger(units)) throw new TypeError('snap: units must be a safe integer, got ' + units);
    if (!Number.isSafeInteger(gridCount) || gridCount <= 0) throw new TypeError('snap: gridCount must be a positive safe integer, got ' + gridCount);

    var abs = Math.abs(units);
    var div = Math.floor(abs / gridCount);   // safe: integers < 2^53
    var rem = abs % gridCount;
    var floorAbs = div * gridCount;
    var ceilAbs = rem === 0 ? floorAbs : floorAbs + gridCount;
    // nearest uses rem*2 >= gridCount (not a float ratio) so the "no float at
    // the discontinuity" claim is literally true; half rounds away from zero.
    var nearestAbs = (rem * 2 >= gridCount) ? floorAbs + gridCount : floorAbs;

    // re-apply sign; for negatives floor/ceil swap roles, so define by ≤/≥ on
    // the signed value: floor is always ≤ units, ceil is always ≥ units.
    if (dir === 'floor')   return units >= 0 ? floorAbs : -ceilAbs;
    if (dir === 'ceil')    return units >= 0 ? ceilAbs : -floorAbs;
    if (dir === 'nearest') return (units < 0 ? -1 : 1) * nearestAbs;
    throw new TypeError('snap: dir must be "floor" | "nearest" | "ceil", got ' + dir);
  }

  // "On grid" is exact by construction — a fact, not a tolerance.
  function onGrid(units, gridCount) {
    if (!Number.isSafeInteger(units)) throw new TypeError('onGrid: units must be a safe integer');
    if (!Number.isSafeInteger(gridCount) || gridCount <= 0) throw new TypeError('onGrid: gridCount must be a positive safe integer');
    return units % gridCount === 0;
  }

  // The Min/Max label → direction mapping, as data (applied by the UI).
  var CONSTRAINT = {
    min: 'ceil',      // Min ≥  : must not fall below true → round up
    nearest: 'nearest',
    max: 'floor'      // Max ≤  : must not exceed true → round down
  };

  return { snap: snap, onGrid: onGrid, CONSTRAINT: CONSTRAINT };
});

/* headless entry: `node snap.js` runs the Phase 2 acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var S = module.exports;
  var snap = S.snap, onGrid = S.onGrid;
  var pass = 0, fail = 0;
  function eq(label, got, want) {
    if (got === want) { pass++; }
    else { fail++; console.log('FAIL ' + label + ': got ' + got + ' want ' + want); }
  }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }

  var G = 3048; // 1/8" in units

  // value exactly on a grid line → all three equal, residuals zero
  eq('on-grid floor', snap(2 * G, G, 'floor'), 2 * G);
  eq('on-grid nearest', snap(2 * G, G, 'nearest'), 2 * G);
  eq('on-grid ceil', snap(2 * G, G, 'ceil'), 2 * G);
  eq('on-grid fact', onGrid(2 * G, G), true);

  // generic interior cell: floor below, ceil above, exactly one grid apart
  eq('interior floor', snap(2 * G + 100, G, 'floor'), 2 * G);
  eq('interior ceil', snap(2 * G + 100, G, 'ceil'), 3 * G);
  eq('not on grid', onGrid(2 * G + 100, G), false);

  // just below midpoint → nearest = floor; just past midpoint → nearest flips up
  eq('below mid nearest', snap(2 * G + (G / 2 - 1), G, 'nearest'), 2 * G);
  eq('past mid nearest', snap(2 * G + (G / 2 + 1), G, 'nearest'), 3 * G);
  eq('exact mid nearest (half away)', snap(2 * G + G / 2, G, 'nearest'), 3 * G);

  // negative value through nearest: symmetric, no Math.round(-2.5)=-2 asymmetry
  eq('neg nearest symmetric', snap(-(2 * G + G / 2), G, 'nearest'), -(3 * G));
  eq('neg floor ≤ value', snap(-(2 * G + 100), G, 'floor'), -(3 * G)); // floor is most-negative
  eq('neg ceil ≥ value', snap(-(2 * G + 100), G, 'ceil'), -(2 * G));

  // floor ≤ units ≤ ceil invariant, spot-checked
  eq('floor ≤ units', snap(5000, G, 'floor') <= 5000, true);
  eq('ceil ≥ units', snap(5000, G, 'ceil') >= 5000, true);

  // defensive: programmer errors throw loudly
  threw('non-int units throws', function () { snap(1.5, G, 'floor'); });
  threw('zero grid throws', function () { snap(100, 0, 'floor'); });
  threw('neg grid throws', function () { snap(100, -G, 'floor'); });
  threw('bad dir throws', function () { snap(100, G, 'round'); });

  console.log('=== snap: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
