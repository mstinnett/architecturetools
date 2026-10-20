/* roof.js — roof geometry on the slope substrate
   =========================================================================
   PURE MODULE (no DOM). Used by roof.html. Lengths are counts on the
   engine's lattice (1 unit = 1/960 mm, see snap.js); a slope is a RATIO,
   rise ÷ run (see slope.js). Geometric results are floats in units — the
   page rounds them to a build grid with build(), which delegates to snap.js
   so the rounding kernel has one source of truth.

   CONTRACT
     heightAt(s, plan)   → float units. Height of the roof plane above the
                           plate line at a plan distance from the eave line.
     planAt(s, height)   → float units. Plan distance from the eave line where
                           the plane reaches a height above the plate.
     ridge(s, span)      → float units. Ridge height above the plate for a
                           symmetric roof: half the eave-to-eave span × s.
     areaFactor(s)       → √(1 + s²). Plan area × factor = area on the slope.
                           The same for every plane at one pitch.
     hip(s1, s2)         → { slope, planDeg, runPer12, lengthFactor }
                           Two planes meeting over a square corner. slope is
                           the hip (or valley) line's own rise ÷ plan run.
                           planDeg is the hip's angle in plan, measured from
                           plane 1's eave line (45° when s1 = s2; under 45°
                           when plane 1 is steeper, which is narrower in plan).
                           runPer12 is the hip's plan run for 12 of plane 1's
                           common run (16.97 for equal pitches).
                           lengthFactor: hip length ÷ hip plan run.
     build(exact, grid, dir) → { built, resid }
                           exact: float units; grid: positive safe integer
                           units (snap.js grid counts); dir: 'floor' |
                           'nearest' | 'ceil'. built is on the grid; resid =
                           built − exact (a float, the cost of rounding).
   Fails loud on a non-positive slope or bad lengths.
   ========================================================================= */

(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.Roof = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // the rounding kernel lives only in snap.js; resolved lazily (partition.js)
  var _snap = null;
  function snapLib() {
    if (_snap) return _snap;
    if (typeof require === 'function' && typeof module !== 'undefined') {
      try { _snap = require('./snap.js'); } catch (e) { /* browser */ }
    }
    if (!_snap) _snap = root && root.Snap;
    if (!_snap) throw new Error('roof: snap.js must be loaded before roof.js');
    return _snap;
  }

  var DEG = Math.PI / 180;

  function okS(s, name) {
    if (!(typeof s === 'number' && isFinite(s) && s > 0)) throw new TypeError('roof: ' + (name || 'slope') + ' must be a positive finite ratio, got ' + s);
  }
  function okL(u, name) {
    if (!(typeof u === 'number' && isFinite(u) && u >= 0)) throw new TypeError('roof: ' + name + ' must be a finite length ≥ 0, got ' + u);
  }

  function heightAt(s, plan) { okS(s); okL(plan, 'plan distance'); return plan * s; }
  function planAt(s, height) { okS(s); okL(height, 'height'); return height / s; }
  function ridge(s, span) { okS(s); okL(span, 'span'); return span / 2 * s; }
  function areaFactor(s) { okS(s); return Math.sqrt(1 + s * s); }

  // Along the hip the two planes are at the same height: s1·d1 = s2·d2,
  // where d1, d2 are plan distances from each eave. So d1 : d2 = s2 : s1.
  function hip(s1, s2) {
    okS(s1, 'slope 1'); okS(s2, 'slope 2');
    var d1 = 12, d2 = 12 * s1 / s2;            // 12 of plane 1's common run
    var planRun = Math.sqrt(d1 * d1 + d2 * d2);
    var hs = s1 * d1 / planRun;
    return {
      slope: hs,
      planDeg: Math.atan2(d1, d2) / DEG,         // from plane 1's eave line
      runPer12: planRun,
      lengthFactor: Math.sqrt(1 + hs * hs)
    };
  }

  function build(exact, grid, dir) {
    if (!(typeof exact === 'number' && isFinite(exact))) throw new TypeError('roof: exact must be a finite number, got ' + exact);
    // Preserve directed rounding even within one lattice unit of a grid line.
    var u = dir === 'ceil' ? Math.ceil(exact) : dir === 'floor' ? Math.floor(exact) : Math.round(exact);
    var built = snapLib().snap(u, grid, dir);
    return { built: built, resid: built - exact };
  }

  // The four-way taper is slope * distance to the nearest drain in the
  // max(|dx|, |dy|) metric. At radius r, each drain covers an axis-aligned
  // square. Sweep every square boundary to detect any uncovered roof area.
  // Bisect the covering radius, retaining an upper bound (never a sampled
  // underestimate). This also finds narrow maxima between clustered drains.
  function taperHighPoint(L, W, s, drains) {
    okL(L, 'length'); okL(W, 'width'); okS(s);
    if (!drains.length) throw new TypeError('roof: at least one drain is required');
    drains.forEach(function (d) {
      okL(d.x, 'drain x'); okL(d.y, 'drain y');
      if (d.x > L || d.y > W) throw new RangeError('roof: drain outside roof');
    });
    function gap(r) {
      var xs = [0, L];
      drains.forEach(function (d) { xs.push(Math.max(0, d.x - r), Math.min(L, d.x + r)); });
      xs.sort(function (a, b) { return a - b; });
      var probes = xs.slice();
      for (var i = 1; i < xs.length; i++) probes.push((xs[i - 1] + xs[i]) / 2);
      for (var x of probes) {
        var intervals = drains.filter(function (d) { return Math.abs(x - d.x) <= r; })
          .map(function (d) { return [Math.max(0, d.y - r), Math.min(W, d.y + r)]; })
          .sort(function (a, b) { return a[0] - b[0]; });
        var end = 0;
        for (var interval of intervals) {
          if (interval[0] > end) return { x: x, y: (end + interval[0]) / 2 };
          end = Math.max(end, interval[1]);
        }
        if (!intervals.length || end < W) return { x: x, y: (end + W) / 2 };
      }
      return null;
    }
    var lo = 0, hi = Math.max(L, W), witness = gap(0) || { x: 0, y: 0 };
    for (var n = 0; n < 54; n++) {
      var mid = (lo + hi) / 2;
      if (mid === lo || mid === hi) break;
      var uncovered = gap(mid);
      if (uncovered) { lo = mid; witness = uncovered; } else hi = mid;
    }
    return { h: hi * s, x: witness.x, y: witness.y, error: (hi - lo) * s };
  }

  return { heightAt: heightAt, planAt: planAt, ridge: ridge, areaFactor: areaFactor, hip: hip, build: build, taperHighPoint: taperHighPoint };
});

/* ---- tests: node calculators/lib/roof.js -------------------------------- */
if (typeof module !== 'undefined' && require.main === module) {
  var R = module.exports, pass = 0, fail = 0;
  var IN = 24384, FT = 12 * IN;
  function near(label, got, want, tol) {
    if (Math.abs(got - want) <= (tol == null ? 1e-9 : tol)) pass++;
    else { fail++; console.log('FAIL ' + label + ': got ' + got + ', want ' + want); }
  }
  function threw(label, fn) {
    try { fn(); fail++; console.log('FAIL ' + label + ': no throw'); } catch (e) { pass++; }
  }
  var s8 = 8 / 12;
  near('8:12, 9ft from eave → 6ft', R.heightAt(s8, 9 * FT), 6 * FT, 1e-6);
  near('8:12, 24ft span → 8ft ridge', R.ridge(s8, 24 * FT), 8 * FT, 1e-6);
  near('8:12, reach 2ft above plate → 3ft in', R.planAt(s8, 2 * FT), 3 * FT, 1e-6);
  near('planAt inverts heightAt', R.planAt(0.37, R.heightAt(0.37, 12345)), 12345, 1e-6);
  near('8:12 area factor', R.areaFactor(s8), 1.2018504251546631, 1e-12);
  near('12:12 area factor √2', R.areaFactor(1), Math.SQRT2, 1e-12);
  // 40' × 28' plan at 8:12 → 1346.07 sf
  near('area 40x28 at 8:12', 40 * 28 * R.areaFactor(s8), 1346.0724761732227, 1e-6);
  var h = R.hip(s8, s8);
  near('equal hip run per 12', h.runPer12, 16.97056274847714, 1e-9);
  near('equal hip slope = s/√2', h.slope, s8 / Math.SQRT2, 1e-12);
  near('equal hip at 45° in plan', h.planDeg, 45, 1e-9);
  near('equal hip length factor', h.lengthFactor, Math.sqrt(1 + s8 * s8 / 2), 1e-12);
  var u = R.hip(12 / 12, 6 / 12);               // steeper plane 1 → narrower
  near('unequal hip plan angle', u.planDeg, Math.atan(0.5) / (Math.PI / 180), 1e-9);
  near('unequal hip slope', u.slope, (1 * 0.5) / Math.sqrt(1 + 0.25), 1e-12);
  near('swap planes → complementary angle', R.hip(0.5, 1).planDeg, 90 - u.planDeg, 1e-9);
  var b = R.build(6 * FT + 100, 3048, 'nearest');
  near('build nearest 1/8"', b.built, 6 * FT, 0);
  near('build resid', b.resid, -100, 1e-9);
  near('build ceil', R.build(6 * FT + 100, 3048, 'ceil').built, 6 * FT + 3048, 0);
  near('build floor', R.build(6 * FT + 3000, 3048, 'floor').built, 6 * FT, 0);
  near('build on grid', R.build(5 * 3048, 3048, 'ceil').resid, 0, 0);
  near('ceil just above grid', R.build(3048.1, 3048, 'ceil').built, 6096, 0);
  near('floor just below grid', R.build(3047.9, 3048, 'floor').built, 0, 0);
  near('center drain', R.taperHighPoint(100, 80, 0.25, [{x:50,y:40}]).h, 12.5);
  near('corner drain', R.taperHighPoint(100, 80, 0.25, [{x:0,y:0}]).h, 25);
  near('two drains interior maximum', R.taperHighPoint(100, 20, 1, [{x:10,y:10},{x:90,y:10}]).h, 40);
  near('asymmetric drains', R.taperHighPoint(100, 20, 1, [{x:2,y:10},{x:83,y:10}]).h, 40.5);
  near('coincident drains', R.taperHighPoint(100, 80, 1, [{x:50,y:40},{x:50,y:40}]).h, 50);
  threw('empty drains', function () { R.taperHighPoint(100, 80, 1, []); });
  threw('zero slope throws', function () { R.heightAt(0, 10); });
  threw('negative plan throws', function () { R.heightAt(0.5, -1); });
  threw('NaN slope throws', function () { R.hip(NaN, 1); });
  threw('bad grid throws', function () { R.build(10, 0, 'nearest'); });
  threw('bad dir throws', function () { R.build(10, 3048, 'up'); });
  console.log('=== roof: ' + pass + ' passed, ' + fail + ' failed ===');
  if (fail) process.exit(1);
}
