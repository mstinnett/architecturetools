/* ramp.js — a rise broken into ramp runs and landings, laid out in plan
   =========================================================================
   PURE MODULE (no DOM). Lengths are integer counts on the engine's lattice
   (1 unit = 1/960 mm, see snap.js); a slope is a RATIO, rise ÷ run. The
   reference figures are passed in by the page (it cites them); the defaults
   here are the ADA 2010 / ICC A117.1 §405 values.

   CONTRACT
     runs({ rise, ratio, grid, maxSegRise, walkLimit }) → null | {
         isRamp,     ratio steeper than walkLimit (1:20). At or below it the
                     surface is a walking surface: one run, no landings.
         k,          number of runs: ceil(rise / maxSegRise), equal rises
         segRise,    float units, rise / k
         runExact,   float units, segRise / ratio, per run
         built: { longer, nearest } per-run length built to `grid` (integer
                     units); longer = ceil, nearest = nearest
         slope: { longer, nearest } the built slope each gives (segRise / run).
                     A shorter run is steeper than the slope asked for.
       }
       rise, grid, maxSegRise: positive safe integers. ratio: positive float.

     plan({ k, run, width, landing, turn, ends }) → {
         rects: [{ x, y, w, h, kind: 'run'|'landing'|'end', dir, i }],
         bbox: { w, h },  area,  path,  profile
       }
       Plan rectangles in units, origin at the lower left, y up. turn is
       'straight' (landings in line), 'l' (90° at each landing, alternating
       left and right so the plan steps and never overlaps itself) or 'u'
       (180°, runs side by side, each turn landing spans two runs). ends: add
       the top and bottom landings. A 90° landing is a square of side
       max(width, landing); a 180° landing is `landing` deep across both runs.
       area = sum of the rectangles (none overlap). path = length walked along
       the centerline of runs and landings. profile = [[distance, height]] for
       an unfolded section, heights in rises (0..k), page scales them.
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.Ramp = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var IN = 24384;
  var DEFAULTS = { maxSegRise: 30 * IN, walkLimit: 1 / 20 };

  function snapUp(u, g) { var r = u % g; return r === 0 ? u : u - r + g; }
  function snapNear(u, g) { var r = u % g; return r * 2 >= g ? u - r + g : u - r; }

  function runs(o) {
    var rise = o.rise, ratio = o.ratio, grid = o.grid;
    var maxSeg = o.maxSegRise || DEFAULTS.maxSegRise;
    var walk = o.walkLimit || DEFAULTS.walkLimit;
    if (!(Number.isSafeInteger(rise) && rise > 0 && ratio > 0 && Number.isSafeInteger(grid) && grid > 0)) return null;
    var isRamp = ratio > walk * (1 + 1e-9);
    var k = isRamp ? Math.max(1, Math.ceil(rise / maxSeg)) : 1;
    var segRise = rise / k;
    var runExact = segRise / ratio;
    if (!isFinite(runExact) || runExact > 9e13) return null;
    // the exact run is a float; build to the grid from its lattice floor so a
    // run already on the grid stays put (no float nudging it up a step)
    var base = Math.round(runExact);
    if (Math.abs(base - runExact) > 1e-6 * Math.max(1, runExact)) base = Math.ceil(runExact);
    var longer = snapUp(base, grid);
    var nearest = snapNear(Math.round(runExact), grid);
    if (nearest <= 0) nearest = grid;
    return {
      isRamp: isRamp, k: k, segRise: segRise, runExact: runExact,
      built: { longer: longer, nearest: nearest },
      slope: { longer: segRise / longer, nearest: segRise / nearest }
    };
  }

  function plan(o) {
    var k = o.k, run = o.run, W = o.width, L = o.landing, turn = o.turn || 'straight';
    var ends = o.ends !== false;
    var rects = [], profile = [], dist = 0, h = 0;
    function add(x, y, w, hh, kind, dir, i) { rects.push({ x: x, y: y, w: w, h: hh, kind: kind, dir: dir, i: i }); }
    function walkFlat(len) { profile.push([dist, h]); dist += len; profile.push([dist, h]); }
    function walkRun(len) { profile.push([dist, h]); dist += len; h += 1; profile.push([dist, h]); }

    if (k === 1 || turn === 'straight') {
      var x = 0;
      if (ends) { add(x, 0, L, W, 'end', 'x', 0); x += L; walkFlat(L); }
      for (var i = 0; i < k; i++) {
        add(x, 0, run, W, 'run', 'x', i); x += run; walkRun(run);
        if (i < k - 1) { add(x, 0, L, W, 'landing', 'x', i); x += L; walkFlat(L); }
      }
      if (ends) { add(x, 0, L, W, 'end', 'x', 1); x += L; walkFlat(L); }
    } else if (turn === 'l') {
      // staircase: runs alternate +x and +y; each landing a square at the turn
      var S = Math.max(W, L), cx = 0, cy = 0;     // cx, cy: lower-left of the next run strip
      if (ends) { add(0, 0, L, W, 'end', 'x', 0); cx = L; walkFlat(L); }
      for (var j = 0; j < k; j++) {
        var alongX = j % 2 === 0;
        if (alongX) { add(cx, cy, run, W, 'run', 'x', j); cx += run; }
        else { add(cx, cy, W, run, 'run', 'y', j); cy += run; }
        walkRun(run);
        if (j < k - 1) {
          add(cx, cy, S, S, 'landing', alongX ? 'x' : 'y', j);
          // centerline through a corner: half a side in, half a side out
          walkFlat(S);
          if (alongX) { cy += S; } else { cx += S; }
        } else if (ends) {
          if (alongX) add(cx, cy, L, W, 'end', 'x', 1); else add(cx, cy, W, L, 'end', 'y', 1);
          walkFlat(L);
        }
      }
    } else {
      // switchback: run j in the band y ∈ [jW, (j+1)W], alternating direction;
      // a turn landing L deep spans two bands at the far end of each run
      var x0 = ends || k > 2 ? L : 0;            // room on the left for the bottom end / left turns
      if (ends) { add(x0 - L, 0, L, W, 'end', '-x', 0); walkFlat(L); }
      for (var m = 0; m < k; m++) {
        var east = m % 2 === 0;
        add(x0, m * W, run, W, 'run', east ? 'x' : '-x', m); walkRun(run);
        if (m < k - 1) {
          add(east ? x0 + run : x0 - L, m * W, L, 2 * W, 'landing', east ? 'x' : '-x', m);
          walkFlat(L + W);                          // across the landing and over one band
        }
      }
      if (ends) {
        var lastEast = (k - 1) % 2 === 0;
        add(lastEast ? x0 + run : x0 - L, (k - 1) * W, L, W, 'end', lastEast ? 'x' : '-x', 1);
        walkFlat(L);
      }
    }

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, area = 0;
    rects.forEach(function (r) {
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
      area += r.w * r.h;
    });
    rects.forEach(function (r) { r.x -= minX; r.y -= minY; });
    return { rects: rects, bbox: { w: maxX - minX, h: maxY - minY }, area: area, path: dist, profile: profile };
  }

  return { runs: runs, plan: plan, DEFAULTS: DEFAULTS };
});

/* ---- inline tests: node calculators/lib/ramp.js ------------------------- */
if (typeof module !== 'undefined' && require.main === module) {
  var R = module.exports, IN = 24384, pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  var g8 = IN / 8;

  var a = R.runs({ rise: 30 * IN, ratio: 1 / 12, grid: g8 });
  ok('30" at 1:12 is one run', a.k === 1);
  ok('30" at 1:12 runs 30\'', a.built.longer === 360 * IN && a.built.nearest === 360 * IN);
  ok('on-grid run keeps the slope', Math.abs(a.slope.longer - 1 / 12) < 1e-12);
  var b = R.runs({ rise: 31 * IN, ratio: 1 / 12, grid: g8 });
  ok('31" at 1:12 is two runs', b.k === 2);
  ok('31" splits to 15.5" each', b.segRise === 15.5 * IN);
  ok('two runs of 186"', b.built.longer === 186 * IN);
  ok('60" is two runs', R.runs({ rise: 60 * IN, ratio: 1 / 12, grid: g8 }).k === 2);
  ok('61" is three runs', R.runs({ rise: 61 * IN, ratio: 1 / 12, grid: g8 }).k === 3);
  ok('1:20 is a walk, one run', R.runs({ rise: 60 * IN, ratio: 1 / 20, grid: g8 }).isRamp === false);
  ok('1:20 walk, k=1', R.runs({ rise: 60 * IN, ratio: 1 / 20, grid: g8 }).k === 1);
  ok('1:16 is a ramp', R.runs({ rise: 10 * IN, ratio: 1 / 16, grid: g8 }).isRamp === true);
  // 7" at 1:12 = 84" exact; 7.01" → 84.12" → longer 84.125, nearest 84.125
  var c = R.runs({ rise: 7 * IN + 244, ratio: 1 / 12, grid: g8 });
  ok('longer never steeper', c.slope.longer <= 1 / 12 + 1e-12);
  var d = R.runs({ rise: 7 * IN + 100, ratio: 1 / 12, grid: g8 });
  ok('nearest can round shorter → steeper', d.built.nearest < d.runExact && d.slope.nearest > 1 / 12);
  ok('longer ≥ exact', d.built.longer >= d.runExact);
  ok('bad input → null', R.runs({ rise: 0, ratio: 1 / 12, grid: g8 }) === null);

  var W = 36 * IN, L = 60 * IN, run = 186 * IN;
  var s = R.plan({ k: 2, run: run, width: W, landing: L, turn: 'straight', ends: true });
  ok('straight: 2 runs + 1 landing + 2 ends', s.rects.length === 5);
  ok('straight length', s.bbox.w === 2 * run + 3 * L && s.bbox.h === W);
  ok('straight area = bbox', s.area === s.bbox.w * s.bbox.h);
  ok('straight path = length', s.path === s.bbox.w);
  ok('straight profile ends at k', s.profile[s.profile.length - 1][1] === 2);
  var s2 = R.plan({ k: 2, run: run, width: W, landing: L, turn: 'straight', ends: false });
  ok('no ends', s2.bbox.w === 2 * run + L);

  var l = R.plan({ k: 2, run: run, width: W, landing: L, turn: 'l', ends: true });
  ok('l: 90° landing is 60 square', l.rects.filter(function (r) { return r.kind === 'landing'; })[0].w === L);
  ok('l: bbox', l.bbox.w === L + run + L && l.bbox.h === L + run + L);
  ok('l: area = sum', l.area === 2 * L * W + 2 * run * W + L * L);
  var l3 = R.plan({ k: 3, run: run, width: W, landing: L, turn: 'l', ends: true });
  ok('l3: no overlap (area < bbox)', l3.area < l3.bbox.w * l3.bbox.h);

  function overlaps(p) {
    for (var i = 0; i < p.rects.length; i++) for (var j = i + 1; j < p.rects.length; j++) {
      var A = p.rects[i], B = p.rects[j];
      if (A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.h && B.y < A.y + A.h) return true;
    }
    return false;
  }
  [1, 2, 3, 4, 5].forEach(function (k) {
    ['straight', 'l', 'u'].forEach(function (t) {
      [true, false].forEach(function (e) {
        var p = R.plan({ k: k, run: run, width: W, landing: L, turn: t, ends: e });
        ok('no overlap ' + t + ' k=' + k + ' ends=' + e, !overlaps(p));
        ok('profile climbs to k ' + t + ' k=' + k, p.profile[p.profile.length - 1][1] === k);
        ok('rects inside bbox ' + t + k, p.rects.every(function (r) { return r.x >= 0 && r.y >= 0 && r.x + r.w <= p.bbox.w && r.y + r.h <= p.bbox.h; }));
      });
    });
  });
  var u = R.plan({ k: 2, run: run, width: W, landing: L, turn: 'u', ends: true });
  ok('u: two runs side by side', u.bbox.h === 2 * W);
  ok('u: depth = run + 2 landings', u.bbox.w === run + 2 * L);
  ok('u: turn landing spans both runs', u.rects.filter(function (r) { return r.kind === 'landing'; })[0].h === 2 * W);
  ok('u: area', u.area === 2 * run * W + L * 2 * W + 2 * L * W);
  var u4 = R.plan({ k: 4, run: run, width: W, landing: L, turn: 'u', ends: true });
  ok('u4: four bands', u4.bbox.h === 4 * W);

  console.log('=== ramp: ' + pass + ' passed, ' + fail + ' failed ===');
  if (fail) process.exitCode = 1;
}
