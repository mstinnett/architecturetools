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
     taperHighs(L, W, s, drains) → { h, runs, points }
                           Four-way taper over an L × W plan with drains
                           [{ x, y }] on it. h: the high, float units of
                           height. runs: [{ x1, y1, x2, y2 }], every stretch
                           of plan at h (a high edge, or a ridge between
                           drains). points: [{ x, y }], places at h on no run.
                           Exact, not sampled.
     taperHighPoint(L, W, s, drains) → { h, x, y }
                           The high and one place that reaches it.
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

  // The four-way taper is slope × the distance to the nearest drain in the
  // max(|dx|, |dy|) metric. That distance is linear between the lines where
  // its pieces change: each drain's diagonals, the lines midway between two
  // drains, and the lines x − y = dx − dy and x + y = dx + dy where one
  // drain's across-piece meets another's along-piece. So the high is reached
  // at crossings of those lines (and the roof edges), and a high run lies
  // along one of them between two high crossings. Exact: drains sit on
  // lattice units, so every crossing is a half-sum and every distance exact.
  // Ties are the rule, not the exception: a centered drain makes two whole
  // edges high, two drains make a ridge between them.
  var TIE = 1e-6;   // units of plan distance; crossings are exact, this only absorbs float noise
  function taperHighs(L, W, s, drains) {
    okL(L, 'length'); okL(W, 'width'); okS(s);
    if (!drains.length) throw new TypeError('roof: at least one drain is required');
    drains.forEach(function (d) {
      okL(d.x, 'drain x'); okL(d.y, 'drain y');
      if (d.x > L || d.y > W) throw new RangeError('roof: drain outside roof');
    });
    function dist(x, y) {
      var best = Infinity;
      drains.forEach(function (d) { var v = Math.max(Math.abs(x - d.x), Math.abs(y - d.y)); if (v < best) best = v; });
      return best;
    }
    // lines a·x + b·y = c, with a, b in {0, ±1}
    var lines = [], seen = {};
    function add(a, b, c) { var k = a + ' ' + b + ' ' + c; if (!seen[k]) { seen[k] = 1; lines.push({ a: a, b: b, c: c, on: [] }); } }
    add(1, 0, 0); add(1, 0, L); add(0, 1, 0); add(0, 1, W);
    drains.forEach(function (d) {
      drains.forEach(function (e) {
        add(1, 0, (d.x + e.x) / 2); add(0, 1, (d.y + e.y) / 2);
        add(1, -1, d.x - e.y); add(1, 1, d.x + e.y);
      });
    });
    var top = -Infinity;
    for (var i = 0; i < lines.length; i++) {
      for (var j = i + 1; j < lines.length; j++) {
        var p = lines[i], q = lines[j], det = p.a * q.b - q.a * p.b;
        if (!det) continue;
        var x = (p.c * q.b - q.c * p.b) / det, y = (p.a * q.c - q.a * p.c) / det;
        if (x < 0 || x > L || y < 0 || y > W) continue;
        var v = { x: x, y: y, d: dist(x, y) };
        p.on.push(v); q.on.push(v);
        if (v.d > top) top = v.d;
      }
    }
    function high(d) { return d >= top - TIE; }
    // runs: consecutive high crossings along a line, merged end to end
    var runs = [];
    lines.forEach(function (ln) {
      var t = ln.b === 0 ? function (v) { return v.y; } : function (v) { return v.x; };
      var on = ln.on.slice().sort(function (u, v) { return t(u) - t(v); }), run = null;
      for (var k = 1; k < on.length; k++) {
        var u = on[k - 1], v = on[k];
        if (t(v) - t(u) <= TIE) continue;
        if (high(u.d) && high(v.d) && high(dist((u.x + v.x) / 2, (u.y + v.y) / 2))) {
          if (run && run.x2 === u.x && run.y2 === u.y) { run.x2 = v.x; run.y2 = v.y; }
          else { run = { x1: u.x, y1: u.y, x2: v.x, y2: v.y, line: ln }; runs.push(run); }
        } else run = null;
      }
    });
    function onRun(v) {
      return runs.some(function (r) {
        var ln = r.line;
        if (Math.abs(ln.a * v.x + ln.b * v.y - ln.c) > TIE) return false;
        return v.x >= Math.min(r.x1, r.x2) - TIE && v.x <= Math.max(r.x1, r.x2) + TIE
            && v.y >= Math.min(r.y1, r.y2) - TIE && v.y <= Math.max(r.y1, r.y2) + TIE;
      });
    }
    var points = [], at = {};
    lines.forEach(function (ln) {
      ln.on.forEach(function (v) {
        var k = v.x + ' ' + v.y;
        if (at[k] || !high(v.d) || onRun(v)) return;
        at[k] = 1; points.push({ x: v.x, y: v.y });
      });
    });
    return {
      h: top * s,
      runs: runs.map(function (r) { return { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 }; }),
      points: points
    };
  }

  // one witness of the high: the first high point, else the middle of the first high run
  function taperHighPoint(L, W, s, drains) {
    var r = taperHighs(L, W, s, drains), w = r.points[0]
      || { x: (r.runs[0].x1 + r.runs[0].x2) / 2, y: (r.runs[0].y1 + r.runs[0].y2) / 2 };
    return { h: r.h, x: w.x, y: w.y };
  }

  return { heightAt: heightAt, planAt: planAt, ridge: ridge, areaFactor: areaFactor, hip: hip, build: build, taperHighs: taperHighs, taperHighPoint: taperHighPoint };
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
  // every equally high place
  function shape(r) {
    return r.runs.map(function (u) { return u.x1 + ',' + u.y1 + '-' + u.x2 + ',' + u.y2; }).sort().join(' ')
      + ' | ' + r.points.map(function (p) { return p.x + ',' + p.y; }).sort().join(' ');
  }
  function same(label, got, want) {
    if (got === want) pass++; else { fail++; console.log('FAIL ' + label + ': got ' + got + ', want ' + want); }
  }
  same('center drain, long roof: both short edges', shape(R.taperHighs(60, 40, 1, [{x:30,y:20}])), '0,0-0,40 60,0-60,40 | ');
  same('center drain, square roof: all four edges', shape(R.taperHighs(40, 40, 1, [{x:20,y:20}])), '0,0-0,40 0,0-40,0 0,40-40,40 40,0-40,40 | ');
  same('two drains: ridge between them', shape(R.taperHighs(100, 20, 1, [{x:10,y:10},{x:90,y:10}])), '50,0-50,20 | ');
  same('two drains on a band: ridge and all edges', shape(R.taperHighs(60, 30, 1, [{x:15,y:15},{x:45,y:15}])),
    '0,0-0,30 0,0-60,0 0,30-60,30 30,0-30,30 60,0-60,30 | ');
  same('opposite corner drains: two points', shape(R.taperHighs(40, 40, 1, [{x:0,y:0},{x:40,y:40}])), ' | 0,40 40,0');
  same('off-center drain: one edge', shape(R.taperHighs(60, 40, 1, [{x:20,y:20}])), '60,0-60,40 | ');
  same('corner drain: the far short edge', shape(R.taperHighs(60, 40, 1, [{x:0,y:0}])), '60,0-60,40 | ');
  near('taperHighs height scales by slope', R.taperHighs(60, 40, 0.25, [{x:30,y:20}]).h, 7.5);
  // against a dense sample: never under it, never far over it, and every
  // reported place reaches the high
  (function () {
    var seed = 7;
    function rnd(n) { seed = (seed * 16807) % 2147483647; return seed % (n + 1); }
    function dist(ds, x, y) { return Math.min.apply(null, ds.map(function (d) { return Math.max(Math.abs(x - d.x), Math.abs(y - d.y)); })); }
    var bad = 0;
    for (var t = 0; t < 200; t++) {
      var L = 20 + rnd(80), W = 10 + rnd(60), ds = [];
      for (var k = 0, n = 1 + rnd(5); k < n; k++) ds.push({ x: rnd(L), y: rnd(W) });
      var r = R.taperHighs(L, W, 1, ds), m = 0;
      for (var i = 0; i <= 200; i++) for (var j = 0; j <= 200; j++) m = Math.max(m, dist(ds, L * i / 200, W * j / 200));
      if (m > r.h + 1e-9 || r.h - m > Math.max(L, W) / 100) bad++;
      r.points.forEach(function (p) { if (Math.abs(dist(ds, p.x, p.y) - r.h) > 1e-9) bad++; });
      r.runs.forEach(function (u) {
        for (var f = 0; f <= 10; f++) if (Math.abs(dist(ds, u.x1 + (u.x2 - u.x1) * f / 10, u.y1 + (u.y2 - u.y1) * f / 10) - r.h) > 1e-9) bad++;
      });
      if (!r.points.length && !r.runs.length) bad++;
    }
    same('200 random roofs against a dense sample', bad, 0);
  })();
  threw('zero slope throws', function () { R.heightAt(0, 10); });
  threw('negative plan throws', function () { R.heightAt(0.5, -1); });
  threw('NaN slope throws', function () { R.hip(NaN, 1); });
  threw('bad grid throws', function () { R.build(10, 0, 'nearest'); });
  threw('bad dir throws', function () { R.build(10, 3048, 'up'); });
  console.log('=== roof: ' + pass + ' passed, ' + fail + ' failed ===');
  if (fail) process.exit(1);
}
