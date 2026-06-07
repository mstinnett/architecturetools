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
    var H = opts.height || 230;

    var denom = target === 'imperial' ? Math.round(IN / g) : null;
    var t = snapTriple(units, g);

    // window: active cell ± one cell of margin
    var lo = Math.min(t.maxU, units) - g;
    var hi = Math.max(t.minU, units) + g;
    if (hi === lo) { lo -= g; hi += g; }

    var padL = 24, padR = 24;
    var x0 = padL, x1 = W - padR, axisW = x1 - x0;
    var ySrc = 64, yTgt = 150;                 // the two scale lines
    function X(u) { return x0 + (u - lo) / (hi - lo) * axisW; }

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" class="nl">';

    // hatch pattern — a line pattern, not a fill tint
    svg += '<defs><pattern id="nlhatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
         + '<line x1="0" y1="0" x2="0" y2="6" stroke="#0a0a0a" stroke-width="0.6"/></pattern></defs>';

    // ---- target grid minor ticks on the bottom scale ----
    var gStart = Math.ceil(lo / g) * g;
    for (var gu = gStart; gu <= hi; gu += g) {
      var gx = X(gu);
      svg += '<line x1="' + gx + '" y1="' + yTgt + '" x2="' + gx + '" y2="' + (yTgt + 6) + '" stroke="#bbb" stroke-width="1"/>';
    }

    // ---- the two scale lines ----
    svg += '<line x1="' + x0 + '" y1="' + ySrc + '" x2="' + x1 + '" y2="' + ySrc + '" stroke="#999" stroke-width="1"/>';
    svg += '<line x1="' + x0 + '" y1="' + yTgt + '" x2="' + x1 + '" y2="' + yTgt + '" stroke="#0a0a0a" stroke-width="1"/>';
    svg += '<text x="' + x0 + '" y="' + (ySrc - 28) + '" class="nl-axis-label" text-anchor="start">' + esc(source) + ' (source)</text>';
    svg += '<text x="' + x0 + '" y="' + (yTgt + 40) + '" class="nl-axis-label" text-anchor="start">' + esc(target) + ' (target)</text>';

    // ---- hatched residual bands (true → each snap) ----
    // Full height between the two scale lines; residual labels flank the bands
    // to the left/right (below), so nothing sits on the cross-hatching.
    function band(snapU) {
      if (snapU === units) return '';
      var a = X(units), b = X(snapU);
      var bx = Math.min(a, b), bw = Math.abs(b - a);
      return '<rect x="' + bx + '" y="' + ySrc + '" width="' + bw + '" height="' + (yTgt - ySrc) + '" fill="url(#nlhatch)" stroke="none"/>';
    }
    // draw Max & Min bands; Nearest band only if it is distinct from both
    svg += band(t.maxU);
    svg += band(t.minU);
    if (!t.nearIsMax && !t.nearIsMin) svg += band(t.nearU);

    // ---- snap ticks + dual labels ----
    // group snaps by exact units to merge coincident labels
    var snaps = [
      { u: t.maxU, role: 'round down' },     // floor — never exceeds true (for a maximum)
      { u: t.nearU, role: 'nearest' },
      { u: t.minU, role: 'round up' }        // ceil — never falls short of true (for a minimum)
    ];
    var groups = {};
    snaps.forEach(function (s) {
      var key = String(s.u);
      (groups[key] = groups[key] || { u: s.u, roles: [] }).roles.push(s.role);
    });

    Object.keys(groups).forEach(function (key, gi) {
      var grp = groups[key];
      var sx = X(grp.u);
      // 1px connector across both scales
      svg += '<line x1="' + sx + '" y1="' + ySrc + '" x2="' + sx + '" y2="' + yTgt + '" stroke="#0a0a0a" stroke-width="1"/>';
      // bottom (target) value + role tag; stagger to reduce collisions
      var stagger = (gi % 2) * 14;
      svg += '<text x="' + sx + '" y="' + (yTgt + 18 + stagger) + '" class="nl-snap-val" text-anchor="middle">' + esc(formatSnapped(grp.u, target, denom)) + '</text>';
      svg += '<text x="' + sx + '" y="' + (ySrc - 14 - stagger) + '" class="nl-snap-role" text-anchor="middle">' + esc(grp.roles.join(' · ')) + '</text>';
      // top (source) equivalent of this physical point
      svg += '<text x="' + sx + '" y="' + (ySrc - 2 - stagger) + '" class="nl-src-val" text-anchor="middle">' + esc(formatTrue(grp.u, source)) + '</text>';
      // residual label — flanking the band on its OUTER side (Max to the left,
      // Min to the right), at the hatch mid-height, so it never sits on the
      // hatch or the true tick. White halo for safety.
      var res = grp.u - units;
      if (res !== 0) {
        var onLeft = grp.u < units;                 // floor/Max → left, ceil/Min → right
        var rx = onLeft ? (sx - 6) : (sx + 6);
        var anchor = onLeft ? 'end' : 'start';
        var ry = (ySrc + yTgt) / 2 + 4;
        svg += '<text x="' + rx + '" y="' + ry + '" class="nl-residual" text-anchor="' + anchor + '" stroke="#fff" stroke-width="3" style="paint-order:stroke">' + esc(formatResidual(res, target)) + '</text>';
      }
    });

    // ---- true tick (2px, full height, drawn last so it sits on top) ----
    var tx = X(units);
    svg += '<line x1="' + tx + '" y1="' + (ySrc - 12) + '" x2="' + tx + '" y2="' + (yTgt + 12) + '" stroke="#0a0a0a" stroke-width="2"/>';
    svg += '<text x="' + tx + '" y="' + (ySrc - 40) + '" class="nl-true-role" text-anchor="middle">true</text>';
    svg += '<text x="' + tx + '" y="' + (yTgt + 56) + '" class="nl-true-val" text-anchor="middle">' + esc(formatTrue(units, target)) + '</text>';

    if (t.onGrid) {
      svg += '<text x="' + (W / 2) + '" y="' + (H - 6) + '" class="nl-note" text-anchor="middle">exactly on grid — every residual is 0</text>';
    }

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
