/* partition.js — run + repeating module → whole-number layout + residual
   =========================================================================
   PURE MODULE. Operates on integer unit counts only (the engine's canonical
   1/960 mm lattice, same as snap.js / parse-length.js). It knows nothing about
   units, glyphs, or the DOM — the architect-facing language ("tiles", "studs",
   "balusters") is a label applied by the tool page; this module only divides a
   run into a whole number of equal parts and exposes what does not divide
   evenly. Sibling to snap.js; it reuses snap's floor/nearest/ceil idea as
   exact integer division, so a snapped layout is exact, never an approximation.

   THE PRIMITIVE
     A run L is filled by `count` items of width `item`, separated/bordered by
     `gap`s. The gap topology fixes how many gaps there are:
       between → count − 1   gaps interior only (n posts, n−1 bays)
       around  → count + 1   gaps interior AND both ends (balusters in a rail)
       each    → count       one gap per item (a trailing joint per tile)
     so the run identity is always   L = count·item + gapCount·gap + residual.
     The RESIDUAL is the part that will not divide evenly — the slack, the end
     cut, or the drift across the run. Making it visible is the whole product,
     exactly as the converter makes the snap error visible.

   FOUR MODES (each fixes a different unknown, then reports the residual)
     sections(run, count, …)        n given      → solve item, snap it
     tiles(run, tile, joint, …)     module given → solve count, residual = cut
     onCenter(run, maxStep, …)      max step     → solve intervals, equalize
     balusters(rail, width, maxGap) max gap      → solve smallest count

   CONTRACT — every mode returns the same Layout shape:
     { mode, run, count, item, gap, gapCount, used, residual, exact,
       positions, … mode-specific extras }
   `exact` is residual === 0 (a FACT, not a tolerance). `positions` are the
   divider coordinates along the run, for the figure the tool page draws.

   Like snap, this is a low-level primitive: it FAILS LOUD on programmer error
   (non-integer units, bad mode) but FLAGS — never throws on — a layout that is
   merely infeasible for the given numbers (`feasible: false`), the way the
   parser never throws on bad user text.
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.Partition = mod; root.partition = mod.partition; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---- validation: programmer errors throw, like snap.js ----------------- */

  function reqInt(name, v, mode) {
    if (!Number.isSafeInteger(v)) throw new TypeError('partition: ' + name + ' must be a safe integer (units), got ' + v);
    if (mode === 'pos' && v <= 0) throw new TypeError('partition: ' + name + ' must be positive, got ' + v);
    if (mode === 'nonneg' && v < 0) throw new TypeError('partition: ' + name + ' must be ≥ 0, got ' + v);
    return v;
  }

  /* ---- the shared integer-division kernel (snap's floor/nearest/ceil) -----
     pick(num, den, dir) chooses how many whole `den`s fit in `num`, exactly,
     no float. equalDivide then lays `total` across `n` cells on a `grid`,
     reusing pick — this is the same operation snap(total, n·grid, dir) performs,
     inlined here (numberline.js inlines snapTriple the same way, to avoid
     browser load-order coupling between the lib files). */

  function pick(num, den, dir) {
    var div = Math.floor(num / den), rem = num % den;
    if (dir === 'floor') return div;
    if (dir === 'ceil') return rem === 0 ? div : div + 1;
    if (dir === 'nearest') return (rem * 2 >= den) ? div + 1 : div;
    throw new TypeError('partition: dir must be "floor" | "nearest" | "ceil", got ' + dir);
  }

  // divide `total` across `n` equal cells, each a whole multiple of `grid`
  function equalDivide(total, n, grid, dir) {
    var each = pick(total, n * grid, dir) * grid;   // snap(total, n·grid, dir) / n
    var used = n * each;
    return { each: each, used: used, residual: total - used };
  }

  function gapCountFor(ends, n) {
    if (ends === 'between') return n - 1;
    if (ends === 'around') return n + 1;
    if (ends === 'each') return n;
    throw new TypeError('partition: ends must be "between" | "around" | "each", got ' + ends);
  }

  // cumulative divider coordinates along the run: gap, item, gap, item, … per
  // the topology, so the figure can draw the layout. Starts at the first edge.
  function layoutPositions(item, gap, count, ends) {
    var pos = [], x = 0, i;
    var leadGap = (ends === 'around');                 // a gap before the first item
    if (leadGap) { x += gap; pos.push(x); }
    for (i = 0; i < count; i++) {
      x += item;
      if (i < count - 1) { pos.push(x); x += gap; pos.push(x); }   // item edge, then gap edge
      else pos.push(x);                                            // last item's far edge
    }
    return pos;
  }

  function infeasible(mode, run, note) {
    return { mode: mode, run: run, count: 0, item: 0, gap: 0, gapCount: 0,
             used: 0, residual: run, exact: false, positions: [], feasible: false, note: note };
  }

  /* ---- mode: sections — n given, solve the item width -------------------- */
  // section = (run − gapCount·gap) / count, snapped to grid; residual = the
  // length that won't divide evenly. (HANDOFF §5: "n sections with gaps".)
  function sections(run, count, opts) {
    opts = opts || {};
    reqInt('run', run, 'pos'); reqInt('count', count, 'pos');
    var ends = opts.ends || 'between';
    var gap = reqInt('gap', opts.gap || 0, 'nonneg');
    var grid = reqInt('grid', opts.grid || 1, 'pos');
    var dir = opts.dir || 'nearest';
    var gc = gapCountFor(ends, count);
    var avail = run - gc * gap;                         // total item length
    if (avail <= 0) return infeasible('sections', run, count + ' sections plus their gaps exceed the run');
    var d = equalDivide(avail, count, grid, dir);
    var used = d.used + gc * gap;
    return {
      mode: 'sections', run: run, count: count, item: d.each, gap: gap,
      gapCount: gc, used: used, residual: run - used, exact: run - used === 0,
      ends: ends, grid: grid, dir: dir, feasible: true,
      positions: layoutPositions(d.each, gap, count, ends)
    };
  }

  /* ---- mode: tiles — module given, solve the count ----------------------- */
  // module m = tile + joint; full count = floor((run + joint) / m) (no trailing
  // joint); residual = the end cut. Also returns the BALANCED layout that splits
  // the cut into two equal end pieces (HANDOFF §5: "tile run + joint"):
  //   2·endTile = run − (count−1)·tile − count·joint  ⇒  endTile = (tile − joint + residual)/2
  function tiles(run, tile, joint, opts) {
    opts = opts || {};
    reqInt('run', run, 'pos'); reqInt('tile', tile, 'pos'); reqInt('joint', joint, 'nonneg');
    var m = tile + joint;
    var count = Math.floor((run + joint) / m);
    if (count <= 0) return infeasible('tiles', run, 'a single tile plus joint exceeds the run');
    var used = count * tile + (count - 1) * joint;
    var residual = run - used;                          // flush end strip (≥ 0)
    // balanced: drop one full tile, share (tile − joint + residual) across two ends
    var endTwice = tile - joint + residual;
    var endTile = pick(endTwice, 2, 'floor');
    var balanced = (count >= 2 && endTile > 0)
      ? { fullTiles: count - 1, endTile: endTile, endTileAlt: endTwice - endTile }
      : null;
    return {
      mode: 'tiles', run: run, count: count, item: tile, gap: joint,
      gapCount: count - 1, used: used, residual: residual, exact: residual === 0,
      endCut: residual, balanced: balanced, feasible: true,
      positions: layoutPositions(tile, joint, count, 'between')
    };
  }

  /* ---- mode: onCenter — max spacing given, equalize across the run ------- */
  // intervals k = ceil(run / maxStep); actual spacing = run / k, snapped;
  // residual = the drift accumulated across the run (HANDOFF §5: "on-center").
  // count is the number of division points (k intervals → k+1 lines incl. ends).
  function onCenter(run, maxStep, opts) {
    opts = opts || {};
    reqInt('run', run, 'pos'); reqInt('maxStep', maxStep, 'pos');
    var grid = reqInt('grid', opts.grid || 1, 'pos');
    var dir = opts.dir || 'nearest';
    var k = Math.ceil(run / maxStep);                  // intervals
    var d = equalDivide(run, k, grid, dir);
    return {
      mode: 'onCenter', run: run, count: k + 1, intervals: k, spacing: d.each,
      item: 0, gap: d.each, gapCount: k, used: d.used, residual: d.residual,
      exact: d.residual === 0, maxStep: maxStep, grid: grid, dir: dir, feasible: true,
      drift: d.residual,                                // total; per-interval = drift / k
      positions: layoutPositions(0, d.each, k + 1, 'between')
    };
  }

  /* ---- mode: balusters — max gap given, solve the smallest count --------- */
  // smallest n with gap = (rail − n·width)/(n+1) ≤ maxGap (HANDOFF §5).
  //   (rail − n·w)/(n+1) ≤ g  ⇔  n ≥ (rail − g)/(w + g)
  // then the actual equal gap is snapped to the grid; residual = rounding slack.
  function balusters(rail, width, maxGap, opts) {
    opts = opts || {};
    reqInt('rail', rail, 'pos'); reqInt('width', width, 'pos'); reqInt('maxGap', maxGap, 'pos');
    var grid = reqInt('grid', opts.grid || 1, 'pos');
    var n = Math.max(0, Math.ceil((rail - maxGap) / (width + maxGap)));
    if (n * width >= rail) return infeasible('balusters', rail, 'balusters at this width overfill the rail before the gap closes');
    // equal gap across n+1 openings, snapped DOWN so it never exceeds maxGap
    var gap = pick(rail - n * width, n + 1, 'floor');
    gap = Math.floor(gap / grid) * grid;
    var used = n * width + (n + 1) * gap;
    return {
      mode: 'balusters', run: rail, count: n, item: width, gap: gap,
      gapCount: n + 1, used: used, residual: rail - used, exact: rail - used === 0,
      maxGap: maxGap, gapOk: gap <= maxGap, grid: grid, feasible: true,
      positions: layoutPositions(width, gap, n, 'around')
    };
  }

  /* ---- unified dispatcher ------------------------------------------------ */
  function partition(spec) {
    if (!spec || typeof spec !== 'object') throw new TypeError('partition: spec must be an object');
    switch (spec.mode) {
      case 'sections':  return sections(spec.run, spec.count, spec);
      case 'tiles':     return tiles(spec.run, spec.item, spec.joint, spec);
      case 'onCenter':  return onCenter(spec.run, spec.maxStep, spec);
      case 'balusters': return balusters(spec.run, spec.item, spec.maxGap, spec);
      default: throw new TypeError('partition: mode must be "sections" | "tiles" | "onCenter" | "balusters", got ' + spec.mode);
    }
  }

  var TOPOLOGY = { between: 'between', around: 'around', each: 'each' };

  return {
    partition: partition,
    sections: sections, tiles: tiles, onCenter: onCenter, balusters: balusters,
    TOPOLOGY: TOPOLOGY,
    // low-level helpers, exported so the figure/tests share the exact math
    pick: pick, equalDivide: equalDivide, gapCountFor: gapCountFor
  };
});

/* headless entry: `node partition.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var P = module.exports;
  var IN = 24384, FT = 12 * IN;        // canonical units (1/960 mm)
  var pass = 0, fail = 0;
  function eq(label, got, want) {
    if (got === want) { pass++; }
    else { fail++; console.log('FAIL ' + label + ': got ' + got + ' want ' + want); }
  }
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }
  var inch = function (n) { return n * IN; };

  /* --- tiles: 120" run, 12" tile, 1/4" joint -----------------------------
     module = 12.25"; (120 + .25)/12.25 = 9.81 → 9 full tiles.
     used = 9·12 + 8·.25 = 110"; end cut = 10". Balanced ends = 10.875" each. */
  var t = P.tiles(inch(120), inch(12), IN / 4);
  eq('tiles count', t.count, 9);
  eq('tiles end cut = 10"', t.residual, inch(10));
  eq('tiles used = 110"', t.used, inch(110));
  ok('tiles not exact', !t.exact);
  eq('tiles balanced drops one tile', t.balanced.fullTiles, 8);
  eq('tiles balanced end = 10 7/8"', t.balanced.endTile, inch(10) + 7 * (IN / 8));
  // balanced layout closes on the run exactly: 2·end + 8·tile + 9·joint = 120"
  eq('tiles balanced closes', 2 * t.balanced.endTile + 8 * inch(12) + 9 * (IN / 4), inch(120));
  // an exact fit leaves no cut and is flagged
  var tx = P.tiles(inch(120), inch(12), 0);
  ok('tiles exact fit flagged', tx.exact && tx.count === 10 && tx.residual === 0);

  /* --- onCenter: studs 16" o.c. over a 12'-1" (145") wall -----------------
     k = ceil(145/16) = 10 intervals; spacing = 14.5" (lands on 1/16); 11 studs. */
  var oc = P.onCenter(inch(145), inch(16), { grid: IN / 16 });
  eq('oc intervals', oc.intervals, 10);
  eq('oc studs (points)', oc.count, 11);
  eq('oc spacing = 14 1/2"', oc.spacing, inch(14) + IN / 2);
  ok('oc on grid → no drift', oc.exact && oc.drift === 0);
  ok('oc spacing ≤ max', oc.spacing <= inch(16));
  // a run that won't divide evenly shows drift, and every spacing stays ≤ max
  var oc2 = P.onCenter(inch(100), inch(16), { grid: IN / 16 });
  eq('oc2 intervals', oc2.intervals, 7);            // ceil(100/16) = 7
  ok('oc2 spacing ≤ max', oc2.spacing <= inch(16));
  ok('oc2 has drift', !oc2.exact);

  /* --- sections: 36" opening, 5 bays, 1/2" dividers between --------------
     gaps between = 4; avail = 36 − 4·.5 = 34"; 34/5 = 6.8" → on a 1/16 grid,
     nearest = 6 13/16" (109/16); floor = 6 3/4". */
  var sN = P.sections(inch(36), 5, { gap: IN / 2, grid: IN / 16, dir: 'nearest' });
  eq('sections gapCount (between)', sN.gapCount, 4);
  eq('sections item = 6 13/16"', sN.item, inch(6) + 13 * (IN / 16));
  ok('sections residual is the misfit', sN.residual !== 0);
  var sF = P.sections(inch(36), 5, { gap: IN / 2, grid: IN / 16, dir: 'floor' });
  eq('sections floor item = 6 3/4"', sF.item, inch(6) + 3 * (IN / 4));
  ok('sections floor leaves slack ≥ 0', sF.residual >= 0);
  // 'around' adds the two end gaps: 5 items need 6 gaps
  eq('sections around gapCount', P.sections(inch(36), 5, { ends: 'around' }).gapCount, 6);
  // too many sections to fit → flagged, not thrown
  ok('sections infeasible flagged', P.sections(inch(10), 30, { gap: IN }).feasible === false);

  /* --- balusters: 36" rail, 1 1/2" balusters, 4" max gap -----------------
     n = ceil((36 − 4)/(1.5 + 4)) = ceil(32/5.5) = 6; gap = (36 − 9)/7 = 27/7
     = 3.857…" → snapped down, ≤ 4". */
  var b = P.balusters(inch(36), inch(1) + IN / 2, inch(4));
  eq('balusters count', b.count, 6);
  eq('balusters openings', b.gapCount, 7);
  ok('balusters gap ≤ max', b.gapOk && b.gap <= inch(4));
  ok('balusters gap > 0', b.gap > 0);
  // residual is the small rounding slack only (gap snapped to whole units)
  ok('balusters residual within one opening', Math.abs(b.residual) < b.gapCount);

  /* --- the dispatcher routes to the same result --------------------------- */
  var d = P.partition({ mode: 'tiles', run: inch(120), item: inch(12), joint: IN / 4 });
  eq('dispatch tiles == tiles()', d.count, t.count);

  /* --- fail loud on programmer error, flag (don't throw) on bad domain ---- */
  threw('non-integer run throws', function () { P.tiles(120.5, inch(12), 0); });
  threw('zero count throws', function () { P.sections(inch(36), 0); });
  threw('bad dir throws', function () { P.onCenter(inch(100), inch(16), { dir: 'round' }); });
  threw('bad mode throws', function () { P.partition({ mode: 'wat', run: inch(10) }); });
  threw('bad ends throws', function () { P.sections(inch(36), 4, { ends: 'sideways' }); });

  console.log('=== partition: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
