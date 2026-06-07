/* numberline.js — the SVG figure that is the product
   =========================================================================
   PURE MODULE (no DOM dependency: returns an SVG string). Given a true value
   and a grid, it draws the whole decision space in one figure so the architect
   picks with their eyes: a single physical axis zoomed to the active grid cell
   plus one cell of margin each side, with

     · true value    — one tick at 2px  (the structural edge: the real dimension)
     · three snaps    — 1px ticks (interior detail): Max ≤ (floor), Nearest ≈,
                        Min ≥ (ceil); each on the target grid
     · hatched bands  — from the true tick to each snap, the residual made
                        visible, labelled with its SIGNED residual
     · dual scale     — top edge in the SOURCE system, bottom in the TARGET
                        system; both true and snapped ticks sit at their real
                        physical positions on the one axis

   Coincidence is EXACT integer equality of snapped units (a lattice payoff):
   two snaps coincide iff their unit counts are equal. On-grid → all three
   coincide, every residual 0, no hatch.

   Also exports the display-precision helpers (Phase 4 reuses them so all
   rounding is consistent): metric as whole mm, imperial as a clean fraction
   when on grid else ≤4 decimal inches; residuals carry more precision.
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.NumberLine = mod; root.numberline = mod.numberline; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MM = 960, IN = 24384, FT = 12 * 24384;

  /* ---- display precision (shared) ---------------------------------------- */

  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

  function trim(s) {
    if (s.indexOf('.') === -1) return s;
    return s.replace(/0+$/, '').replace(/\.$/, '');
  }

  // clean common fraction when units lands exactly on the denom grid, else null
  function imperialFraction(units, denom) {
    var sign = units < 0 ? '-' : '';
    var abs = Math.abs(units);
    var k = abs * denom / IN;                 // sixteenths/etc; integer when on grid
    if (Math.abs(k - Math.round(k)) > 1e-9) return null;
    k = Math.round(k);
    var whole = Math.floor(k / denom);
    var rem = k % denom;
    if (rem === 0) return sign + whole + '"';
    var g = gcd(rem, denom), n = rem / g, d = denom / g;
    if (whole === 0) return sign + n + '/' + d + '"';
    return sign + whole + ' ' + n + '/' + d + '"';
  }

  function imperialDecimal(units, dp) {
    if (dp == null) dp = 4;
    return trim((units / IN).toFixed(dp)) + '"';
  }

  function metricWhole(units) { return String(Math.round(units / MM)) + ' mm'; }
  function metricDecimal(units, dp) {
    if (dp == null) dp = 2;
    return trim((units / MM).toFixed(dp)) + ' mm';
  }

  // imperial readouts group into feet-inches at >= 1 ft, so a same-system
  // conversion reformats decimal inches as ft-in (12" -> 1'). Below a foot it
  // stays plain inches.
  function imperialFeetInch(units, denom) {        // on-grid value -> ft-in fraction
    var sign = units < 0 ? '-' : '', abs = Math.abs(units);
    if (abs < FT) { var f = imperialFraction(abs, denom); return sign + (f != null ? f : imperialDecimal(abs, 4)); }
    var feet = Math.floor(abs / FT), rem = abs - feet * FT;
    var inchStr = imperialFraction(rem, denom);
    if (inchStr == null) inchStr = imperialDecimal(rem, 4);
    return inchStr === '0"' ? sign + feet + "'" : sign + feet + "'-" + inchStr;
  }
  function imperialFeetInchDecimal(units) {         // off-grid value -> ft-in decimal
    var sign = units < 0 ? '-' : '', abs = Math.abs(units);
    if (abs < FT) return sign + imperialDecimal(abs, 4);
    var feet = Math.floor(abs / FT), remIn = (abs - feet * FT) / IN;
    return remIn === 0 ? sign + feet + "'" : sign + feet + "'-" + trim(remIn.toFixed(4)) + '"';
  }

  // the main snapped readout for a value known to be on the target grid
  function formatSnapped(units, system, denom) {
    if (system === 'metric') return metricWhole(units);
    return imperialFeetInch(units, denom || 64);
  }

  // a true (off-grid) value, in either system, full but legible precision
  function formatTrue(units, system) {
    return system === 'metric' ? metricDecimal(units, 2) : imperialFeetInchDecimal(units);
  }

  // residual: needs MORE precision than the readout or small costs vanish
  function formatResidual(units, system) {
    var sign = units > 0 ? '+' : (units < 0 ? '−' : '');
    if (units === 0) return '0';
    if (system === 'metric') {
      var mm = Math.abs(units) / MM;
      if (mm >= 1) return sign + trim(mm.toFixed(1)) + ' mm';
      if (mm >= 0.001) return sign + trim(mm.toFixed(3)) + ' mm';
      return sign + Math.round(mm * 1000) + ' µm';
    }
    var inch = Math.abs(units) / IN;
    return sign + trim(inch.toFixed(5)) + '"';
  }

  /* ---- snap geometry (shared by the figure and headless tests) ----------- */

  function snapTriple(units, gridCount) {
    var abs = Math.abs(units);
    var div = Math.floor(abs / gridCount);
    var rem = abs % gridCount;
    var floorAbs = div * gridCount;
    var ceilAbs = rem === 0 ? floorAbs : floorAbs + gridCount;
    var nearAbs = (rem * 2 >= gridCount) ? ceilAbs : floorAbs;
    var sgn = units < 0 ? -1 : 1;
    // floor ≤ units ≤ ceil on the signed axis
    var floorU = units >= 0 ? floorAbs : -ceilAbs;
    var ceilU = units >= 0 ? ceilAbs : -floorAbs;
    var nearU = sgn * nearAbs;
    return {
      maxU: floorU,             // Max ≤  = floor
      minU: ceilU,              // Min ≥  = ceil
      nearU: nearU,
      onGrid: rem === 0,
      nearIsMax: nearU === floorU,
      nearIsMin: nearU === ceilU
    };
  }

  /* ---- SVG figure -------------------------------------------------------- */

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // opts: { units, gridCount, targetSystem, sourceSystem, width, height }
  function numberline(opts) {
    var units = opts.units;
    var g = opts.gridCount;
    var target = opts.targetSystem || 'imperial';
    var source = opts.sourceSystem || target;
    var W = opts.width || 680;
    var H = opts.height || 150;

    var denom = target === 'imperial' ? Math.round(IN / g) : null;
    var t = snapTriple(units, g);
    var floorU = t.maxU, ceilU = t.minU;        // round down (left), round up (right)

    var x0 = 24, x1 = W - 24, axisW = x1 - x0;
    var ySrc = 50, yTgt = 108, bandMid = (ySrc + yTgt) / 2;   // the band's two scale lines

    // ONE fixed-scale ruler: a nice reference interval (independent of grid) drawn
    // with every grid line, so tick DENSITY carries the absolute scale (1/8" = 8
    // ticks, 1/64" = 64 dense ticks) while the hatched active cell carries the
    // rounding error. Refining the grid shrinks the cell honestly. Reference: the
    // containing inch (imperial) or a fixed metric span; endpoints are round
    // "best values". Precise per-bound numbers live in the rows below.
    // Focus+context (fisheye) mapping: the active cell is magnified to the
    // middle third (the hatch stays a large, centred, legible size). The window
    // extends a fixed context span each side, ROUNDED OUT to the next grid line,
    // so the ends are clean "selected unit" values (the next 1/2" on a 1/2"
    // grid). That rounding is symmetric — equal whole grid-units each side — and
    // the margin ticks pack denser as the grid refines, carrying the scale.
    var ctxSpan = target === 'imperial' ? IN : (g <= 10 * MM ? 50 * MM : 3000 * MM);
    var ctx = ctxSpan / 2;
    var winLo = Math.floor((floorU - ctx) / g) * g;
    var winHi = Math.ceil((ceilU + ctx) / g) * g;
    var xA = x0 + axisW / 3, xB = x0 + 2 * axisW / 3;
    function X(u) {
      if (t.onGrid) return x0 + (u - winLo) / (winHi - winLo) * axisW;     // no cell to magnify
      if (u <= floorU) return x0 + (u - winLo) / (floorU - winLo) * (xA - x0);
      if (u <= ceilU) return xA + (u - floorU) / (ceilU - floorU) * (xB - xA);
      return xB + (u - ceilU) / (winHi - ceilU) * (x1 - xB);
    }
    var tx = X(units), xL = X(floorU), xR = X(ceilU);

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" class="nl">';
    svg += '<defs><pattern id="nlhatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
         + '<line x1="0" y1="0" x2="0" y2="6" stroke="#0a0a0a" stroke-width="0.6"/></pattern></defs>';

    function txt(x, y, cls, anchor, s) {
      return '<text x="' + x + '" y="' + y + '" class="' + cls + '" text-anchor="' + anchor + '" stroke="#fff" stroke-width="3" style="paint-order:stroke">' + esc(s) + '</text>';
    }

    // band: source line on top, target line on bottom
    svg += '<line x1="' + x0 + '" y1="' + ySrc + '" x2="' + x1 + '" y2="' + ySrc + '" stroke="#999" stroke-width="1"/>';
    svg += '<line x1="' + x0 + '" y1="' + yTgt + '" x2="' + x1 + '" y2="' + yTgt + '" stroke="#0a0a0a" stroke-width="1"/>';
    // every grid line — density in the compressed margins = fineness = scale
    // (skip the cell's own edges; they're drawn heavier below)
    for (var gu = Math.ceil(winLo / g) * g; gu <= winHi + 0.5; gu += g) {
      if (!t.onGrid && (gu === floorU || gu === ceilU)) continue;
      svg += '<line x1="' + X(gu) + '" y1="' + yTgt + '" x2="' + X(gu) + '" y2="' + (yTgt + 4) + '" stroke="#ccc" stroke-width="1"/>';
    }
    // window endpoints — clean grid-aligned "selected unit" values
    svg += txt(x0, yTgt + 16, 'nl-axis-label', 'start', formatSnapped(winLo, target, denom));
    svg += txt(x1, yTgt + 16, 'nl-axis-label', 'end', formatSnapped(winHi, target, denom));

    if (!t.onGrid) {
      // active cell: hatched, framed by its two grid edges (nearer one heavier)
      svg += '<rect x="' + xL + '" y="' + ySrc + '" width="' + (xR - xL) + '" height="' + (yTgt - ySrc) + '" fill="url(#nlhatch)" stroke="none"/>';
      svg += '<line x1="' + xL + '" y1="' + ySrc + '" x2="' + xL + '" y2="' + yTgt + '" stroke="#0a0a0a" stroke-width="' + (t.nearIsMax ? 2 : 1) + '"/>';
      svg += '<line x1="' + xR + '" y1="' + ySrc + '" x2="' + xR + '" y2="' + yTgt + '" stroke="#0a0a0a" stroke-width="' + (t.nearIsMin ? 2 : 1) + '"/>';

      // bound values hug the hatch edges, mirrored: round down right-aligned at
      // the left edge, round up left-aligned at the right; decimal under each
      function boundBlock(snapU, atLeft, isNearest) {
        var x = atLeft ? (xL - 8) : (xR + 8);
        var anchor = atLeft ? 'end' : 'start';
        var role = (atLeft ? 'round down' : 'round up') + (isNearest ? ' · nearest' : '');
        var valCls = 'nl-snap-val' + (isNearest ? ' nl-nearest' : '');
        var s = txt(x, bandMid - 15, 'nl-snap-role', anchor, role);
        s += txt(x, bandMid + 1, valCls, anchor, formatSnapped(snapU, target, denom));
        if (target === 'imperial') s += txt(x, bandMid + 15, 'nl-src-val', anchor, formatTrue(snapU, target));
        s += txt(x, bandMid + (target === 'imperial' ? 28 : 15), 'nl-residual', anchor, formatResidual(snapU - units, target));
        return s;
      }
      svg += boundBlock(floorU, true, t.nearIsMax);
      svg += boundBlock(ceilU, false, t.nearIsMin);
    }

    // true tick (2px) + exact value above it (target prominent, source small)
    svg += '<line x1="' + tx + '" y1="' + (ySrc - 7) + '" x2="' + tx + '" y2="' + (yTgt + 7) + '" stroke="#0a0a0a" stroke-width="2"/>';
    svg += txt(tx, ySrc - 8, 'nl-true-val', 'middle', formatTrue(units, target) + (t.onGrid ? ' · on grid' : ''));
    if (source !== target) svg += txt(tx, ySrc - 20, 'nl-src-val', 'middle', formatTrue(units, source));

    svg += '</svg>';
    return svg;
  }

  return {
    numberline: numberline,
    snapTriple: snapTriple,
    // display helpers, exported for Phase 4 consistency
    imperialFraction: imperialFraction,
    imperialDecimal: imperialDecimal,
    metricWhole: metricWhole,
    metricDecimal: metricDecimal,
    formatSnapped: formatSnapped,
    formatTrue: formatTrue,
    formatResidual: formatResidual
  };
});

/* headless entry: `node numberline.js` — asserts the two worked examples */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var NL = module.exports;
  var IN_ = 24384, MM_ = 960;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }

  // Example 1: 1 m → 1/8". Nearest collapses onto Min; two distinct ticks.
  var e1 = NL.snapTriple(1000 * MM_, IN_ / 8);
  ok('ex1 Max = 3\'-3 1/4"', NL.formatSnapped(e1.maxU, 'imperial', 8) === "3'-3 1/4\"");
  ok('ex1 Nearest collapses onto Min', e1.nearIsMin && !e1.nearIsMax);
  ok('ex1 Min = 3\'-3 3/8"', NL.formatSnapped(e1.minU, 'imperial', 8) === "3'-3 3/8\"");
  ok('ex1 two distinct ticks', e1.maxU !== e1.minU && e1.nearU === e1.minU);

  // Example 2: 33.33 mm = 31997 units. Collapse side FLIPS between 1/8 and 1/16.
  var u2 = 31997;
  var a = NL.snapTriple(u2, IN_ / 8);
  var b = NL.snapTriple(u2, IN_ / 16);
  ok('ex2 1/8 Nearest collapses DOWN onto Max', a.nearIsMax && !a.nearIsMin);
  ok('ex2 1/8 Max = 1 1/4"', NL.formatSnapped(a.maxU, 'imperial', 8) === '1 1/4"');
  ok('ex2 1/16 Nearest collapses UP onto Min', b.nearIsMin && !b.nearIsMax);
  ok('ex2 1/16 Nearest = 1 5/16"', NL.formatSnapped(b.nearU, 'imperial', 16) === '1 5/16"');
  ok('ex2 collapse side flips', a.nearIsMax && b.nearIsMin);
  ok('ex2 1/16 residual ≈ +0.0003"', NL.formatResidual(b.nearU - u2, 'imperial') === '+0.00029"');

  // On-grid: all three coincide, residuals zero, flagged.
  var c = NL.snapTriple(2 * (IN_ / 8), IN_ / 8);
  ok('on-grid all coincide', c.maxU === c.minU && c.minU === c.nearU && c.onGrid);

  // Renders without throwing, produces an <svg>.
  var svg = NL.numberline({ units: 1000 * MM_, gridCount: IN_ / 8, targetSystem: 'imperial', sourceSystem: 'metric' });
  ok('renders svg', /^<svg/.test(svg) && /nlhatch/.test(svg));

  console.log('=== numberline: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
