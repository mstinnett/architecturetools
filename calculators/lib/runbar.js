/* runbar.js — the layout figure for partition results
   =========================================================================
   PURE MODULE (no DOM dependency: returns an SVG string). Given a run and the
   integer segments that fill it, it draws the layout to scale as a bar — the
   modules, the gaps between them, and the RESIDUAL (the cut, the slack, the
   drift) as a hatched band, exactly the way numberline.js hatches the rounding
   error. The figure is the product: the leftover is drawn at true scale so the
   architect sees what the numbers round away.

   CONTRACT
     runbar({ run, segments, targetSystem, denom, width, height, caption })
       run        — the total span, integer units (1/960 mm)
       segments   — [{ w, kind, label? }] left to right; w integer units ≥ 0,
                    kind 'item' | 'gap' | 'cut'. The w's MUST sum to run
                    exactly — OR sum past it (a round-up layout that OVERRUNS
                    the run); anything else is a programmer error and throws.
                    An overrun draws to the segments' full extent with the
                    overhang past the run hatched and labelled with its signed
                    size, so rounding up is as visible as rounding down. A
                    zero-width 'item' is a point (an on-center line) and draws
                    as a tick, not a cell.
       label      — optional per-segment; the caller decides which segments
                    speak (usually the first of each kind, and every cut)
       targetSystem / denom — readout formatting, as numberline
       caption    — optional one-line caption above the dimension string

   Like numberline, this module delegates ALL value formatting to the shared
   helpers (one display policy for the whole engine) and fails loud on bad
   geometry. It draws any segment list whose integers close on the run; what
   the segments MEAN ("tile", "stud", "baluster") is the tool page's language.

   layoutSegments(layout) converts a partition.js Layout into the segment
   list, preserving the integer identity run = Σw by construction.
   ========================================================================= */

(function (root, factory) {
  var mod = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.RunBar = mod; root.runbar = mod.runbar; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // Formatting delegates to numberline.js — one display policy engine-wide.
  // Resolved lazily so page <script> order doesn't matter; require() headless.
  var _nl = null;
  function nl() {
    if (_nl) return _nl;
    if (typeof require === 'function' && typeof module !== 'undefined') {
      try { _nl = require('./numberline.js'); } catch (e) { /* browser */ }
    }
    if (!_nl) _nl = root && root.NumberLine;
    if (!_nl) throw new Error('runbar: numberline.js must be loaded before runbar.js');
    return _nl;
  }

  var KINDS = { item: true, gap: true, cut: true };

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // conservative glyph-width estimate (same rationale as numberline.estLabelW:
  // a pure module can't measure; err on the visible side)
  function estW(s, fs) { return String(s).length * fs * 0.62; }

  /* ---- partition Layout → segment list -----------------------------------
     Rebuilds the physical order from the layout's own integers, per the gap
     topology, and pins the residual as a trailing 'cut' band. The sum closes
     on the run BY CONSTRUCTION; runbar() re-checks it anyway (fail loud). */
  function layoutSegments(layout) {
    if (!layout || layout.feasible === false) throw new TypeError('runbar: layoutSegments needs a feasible partition layout');
    var segs = [], i;
    var ends = layout.ends || (layout.mode === 'balusters' ? 'around' : 'between');
    if (layout.mode === 'onCenter') {
      // points along the run: k equal intervals between k+1 zero-width items
      for (i = 0; i < layout.intervals; i++) {
        segs.push({ w: 0, kind: 'item' });
        segs.push({ w: layout.gap, kind: 'gap' });
      }
      segs.push({ w: 0, kind: 'item' });
    } else {
      if (ends === 'around') segs.push({ w: layout.gap, kind: 'gap' });
      for (i = 0; i < layout.count; i++) {
        segs.push({ w: layout.item, kind: 'item' });
        var interior = i < layout.count - 1;
        if (interior || ends === 'each' || ends === 'around') segs.push({ w: layout.gap, kind: 'gap' });
      }
    }
    // a positive residual is leftover (drawn as a hatched cut); a NEGATIVE one
    // means the rounded layout overruns the run — leave the segments long and
    // runbar hatches the overhang past the run's end instead
    if (layout.residual > 0) segs.push({ w: layout.residual, kind: 'cut' });
    return segs;
  }

  /* ---- the figure --------------------------------------------------------- */
  function runbar(opts) {
    opts = opts || {};
    var run = opts.run;
    var segs = opts.segments;
    if (!Number.isSafeInteger(run) || run <= 0) throw new TypeError('runbar: run must be a positive safe integer, got ' + run);
    if (!Array.isArray(segs) || segs.length === 0) throw new TypeError('runbar: segments must be a non-empty array');
    var sum = 0, i, s;
    for (i = 0; i < segs.length; i++) {
      s = segs[i];
      if (!s || !KINDS[s.kind]) throw new TypeError('runbar: segment kind must be "item" | "gap" | "cut", got ' + (s && s.kind));
      if (!Number.isSafeInteger(s.w) || s.w < 0) throw new TypeError('runbar: segment w must be a safe integer ≥ 0, got ' + (s && s.w));
      sum += s.w;
    }
    if (sum < run) throw new RangeError('runbar: segments sum to ' + sum + ' but run is ' + run + ' — the layout identity must close exactly (or overrun)');
    var over = sum - run;                           // > 0 when the layout overruns

    var N = nl();
    var target = opts.targetSystem === 'metric' ? 'metric' : 'imperial';
    var denom = opts.denom || null;
    var W = (Number.isFinite(opts.width) && opts.width > 0) ? opts.width : 680;
    var H = (Number.isFinite(opts.height) && opts.height > 0) ? opts.height : 132;

    var x0 = 14, x1 = W - 14, barW = x1 - x0;
    var yTop = 40, yBot = 84;                       // the bar band
    var yDim = 112;                                  // the dimension string below
    var extent = sum;                                // scale to the full drawing, run or overrun
    function X(u) { return x0 + (u / extent) * barW; }

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" class="nl rb">';
    svg += '<defs><pattern id="rbhatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
         + '<line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--nl-hatch,#0a0a0a)" stroke-width="0.6"/></pattern></defs>';

    function txt(x, y, cls, anchor, str, fs) {
      // clamp so the estimated extent stays inside the viewBox (pure module:
      // estimate, then err inward)
      var w = estW(str, fs || 10);
      if (anchor === 'middle') x = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x));
      else if (anchor === 'start') x = Math.min(x, W - w - 2);
      else if (anchor === 'end') x = Math.max(x, w + 2);
      return '<text x="' + x + '" y="' + y + '" class="' + cls + '" text-anchor="' + anchor + '" stroke="#fff" stroke-width="3" style="paint-order:stroke">' + esc(str) + '</text>';
    }

    // segments — items as outlined cells, gaps as filled slots, cuts hatched
    var u = 0;
    for (i = 0; i < segs.length; i++) {
      s = segs[i];
      var xa = X(u), xb = X(u + s.w);
      if (s.kind === 'item' && s.w === 0) {
        // an on-center point: a tick through the band
        svg += '<line x1="' + xa + '" y1="' + (yTop - 5) + '" x2="' + xa + '" y2="' + (yBot + 5) + '" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="1.5"/>';
      } else if (s.kind === 'item') {
        svg += '<rect x="' + xa + '" y="' + yTop + '" width="' + Math.max(0.5, xb - xa) + '" height="' + (yBot - yTop)
             + '" fill="none" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="1"/>';
      } else if (s.kind === 'gap') {
        if (s.w > 0) svg += '<rect x="' + xa + '" y="' + yTop + '" width="' + Math.max(0.5, xb - xa) + '" height="' + (yBot - yTop)
             + '" style="fill:var(--nl-tick,#bbb)" stroke="none"/>';
      } else { // cut — the residual band, hatched like numberline's error band
        svg += '<rect x="' + xa + '" y="' + yTop + '" width="' + Math.max(0.5, xb - xa) + '" height="' + (yBot - yTop)
             + '" fill="url(#rbhatch)" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="1" stroke-dasharray="3 2"/>';
      }
      if (s.label) {
        var lx = s.w === 0 ? xa : (xa + xb) / 2;
        svg += txt(lx, yTop - 14, 'nl-snap-role', 'middle', s.label, 9);
        if (s.w > 0) svg += txt(lx, yTop - 4, 'nl-snap-val', 'middle', N.formatSnapped(s.w, target, denom), 12);
      }
      u += s.w;
    }

    // an overrun: hatch the overhang past the run's end, label it signed —
    // rounding up is drawn as honestly as a leftover cut
    var xRun = X(run);
    if (over > 0) {
      svg += '<rect x="' + xRun + '" y="' + yTop + '" width="' + Math.max(0.5, X(sum) - xRun) + '" height="' + (yBot - yTop)
           + '" fill="url(#rbhatch)" stroke="none"/>';
      svg += '<line x1="' + xRun + '" y1="' + (yTop - 8) + '" x2="' + xRun + '" y2="' + (yBot + 8) + '" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="2"/>';
      svg += txt((xRun + X(sum)) / 2, yTop - 14, 'nl-snap-role', 'middle', 'overrun', 9);
      svg += txt((xRun + X(sum)) / 2, yTop - 4, 'nl-residual', 'middle', N.formatResidual(over, target), 10);
    }

    // the dimension string below — extension lines off the bar at the RUN's
    // extent, architectural tick marks, the total centred above the line
    svg += '<line x1="' + x0 + '" y1="' + (yBot + 4) + '" x2="' + x0 + '" y2="' + (yDim + 4) + '" style="stroke:var(--nl-axis,#999)" stroke-width="1"/>';
    svg += '<line x1="' + xRun + '" y1="' + (yBot + 4) + '" x2="' + xRun + '" y2="' + (yDim + 4) + '" style="stroke:var(--nl-axis,#999)" stroke-width="1"/>';
    svg += '<line x1="' + x0 + '" y1="' + yDim + '" x2="' + xRun + '" y2="' + yDim + '" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="1"/>';
    svg += '<line x1="' + (x0 - 4) + '" y1="' + (yDim + 4) + '" x2="' + (x0 + 4) + '" y2="' + (yDim - 4) + '" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="1.5"/>';
    svg += '<line x1="' + (xRun - 4) + '" y1="' + (yDim + 4) + '" x2="' + (xRun + 4) + '" y2="' + (yDim - 4) + '" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="1.5"/>';
    var total = N.formatTrue(run, target);
    if (opts.caption) svg += txt((x0 + xRun) / 2, yDim - 18, 'nl-note', 'middle', opts.caption, 10);
    svg += txt((x0 + xRun) / 2, yDim - 5, 'nl-true-val', 'middle', total, 13);

    svg += '</svg>';
    return svg;
  }

  return { runbar: runbar, layoutSegments: layoutSegments };
});

/* headless entry: `node runbar.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var RB = module.exports;
  var P = require('./partition.js');
  var NL_FMT = function (u) { return require('./numberline.js').formatResidual(u, 'imperial'); };
  var IN = 24384;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function eq(label, got, want) {
    if (got === want) pass++; else { fail++; console.log('FAIL ' + label + ': got ' + got + ' want ' + want); }
  }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }
  function count(hay, needle) {
    var n = 0, i = -1;
    while ((i = hay.indexOf(needle, i + 1)) !== -1) n++;
    return n;
  }
  var inch = function (n) { return n * IN; };

  /* segments from each partition mode close on the run exactly */
  var t = P.tiles(inch(120), inch(12), IN / 4);            // 9 tiles, 8 joints, 10" cut
  var ts = RB.layoutSegments(t);
  var sum = ts.reduce(function (a, s) { return a + s.w; }, 0);
  eq('tiles segments close on run', sum, inch(120));
  eq('tiles segment count: 9 items + 8 gaps + 1 cut', ts.length, 18);
  ok('tiles last segment is the cut', ts[ts.length - 1].kind === 'cut' && ts[ts.length - 1].w === inch(10));

  var oc = P.onCenter(inch(145), inch(16), { grid: IN / 16 });   // 11 points, no drift
  var os = RB.layoutSegments(oc);
  eq('onCenter segments close on run', os.reduce(function (a, s) { return a + s.w; }, 0), inch(145));
  eq('onCenter draws k+1 point items', os.filter(function (s) { return s.kind === 'item'; }).length, 11);
  ok('onCenter points are zero-width', os.every(function (s) { return s.kind !== 'item' || s.w === 0; }));

  var b = P.balusters(inch(36), inch(1) + IN / 2, inch(4));      // around topology
  var bs = RB.layoutSegments(b);
  eq('balusters segments close on run', bs.reduce(function (a, s) { return a + s.w; }, 0), inch(36));
  ok('balusters lead with a gap (around)', bs[0].kind === 'gap');

  var sN = P.sections(inch(36), 5, { gap: IN / 2, grid: IN / 16, dir: 'floor' });
  var ss = RB.layoutSegments(sN);
  eq('sections segments close on run', ss.reduce(function (a, s) { return a + s.w; }, 0), inch(36));

  /* the figure: a valid svg with the right element counts */
  ts[0].label = 'tile';
  var svg = RB.runbar({ run: inch(120), segments: ts, targetSystem: 'imperial', denom: 16 });
  ok('returns an <svg>', svg.indexOf('<svg') === 0 && svg.indexOf('</svg>') > 0);
  eq('draws 9 item cells + 1 hatched cut', count(svg, '<rect'), 9 + 8 + 1);   // + 8 gap slots
  eq('one hatched band', count(svg, 'url(#rbhatch)'), 1);
  ok('labels the labelled segment', svg.indexOf('>tile</text>') > 0);
  ok('total run on the dimension string', svg.indexOf("10'") > 0);

  /* a round-up layout that overruns the run draws the overhang, hatched + signed */
  var sUp = P.sections(inch(36), 5, { gap: IN / 2, grid: IN / 16, dir: 'ceil' });
  ok('ceil sections overrun (negative residual)', sUp.residual < 0);
  var us = RB.layoutSegments(sUp);
  var usum = us.reduce(function (a, s) { return a + s.w; }, 0);
  ok('overrun segments sum past the run', usum > inch(36));
  var usvg = RB.runbar({ run: inch(36), segments: us, targetSystem: 'imperial', denom: 16 });
  ok('overrun labelled', usvg.indexOf('>overrun</text>') > 0);
  ok('overrun signed size drawn', usvg.indexOf(NL_FMT(usum - inch(36))) > 0);

  /* labels are escaped */
  var ev = RB.runbar({ run: 10, segments: [{ w: 10, kind: 'item', label: '<img onerror=x>' }], targetSystem: 'metric' });
  ok('labels escaped', ev.indexOf('<img') === -1 && ev.indexOf('&lt;img') > 0);

  /* fail loud on programmer error */
  threw('sum mismatch throws', function () { RB.runbar({ run: 100, segments: [{ w: 99, kind: 'item' }] }); });
  threw('bad kind throws', function () { RB.runbar({ run: 10, segments: [{ w: 10, kind: 'slab' }] }); });
  threw('non-integer w throws', function () { RB.runbar({ run: 10, segments: [{ w: 10.5, kind: 'item' }] }); });
  threw('negative run throws', function () { RB.runbar({ run: -5, segments: [{ w: -5, kind: 'item' }] }); });
  threw('empty segments throws', function () { RB.runbar({ run: 5, segments: [] }); });
  threw('infeasible layout throws in layoutSegments', function () {
    RB.layoutSegments(P.sections(inch(10), 30, { gap: IN }));
  });

  console.log('=== runbar: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
