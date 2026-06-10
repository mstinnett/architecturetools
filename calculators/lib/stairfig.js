/* stairfig.js — the stair section figure
   =========================================================================
   PURE MODULE (no DOM dependency: returns an SVG string). Given a riser
   height, tread depth, and riser count — exact integer units, the engine's
   1/960 mm lattice — it draws the stair section to scale: the stepped
   profile, the two floor lines, dimension labels, and (the point of the
   figure) the RESIDUAL between count·riser and the true total rise, hatched
   at the top floor line. A snapped riser repeated n times rarely lands
   exactly on the floor-to-floor rise; that drift is drawn, not absorbed.

   CONTRACT
     stairfig({ riser, tread, count, rise, riserLabel, treadLabel,
                riseLabel, runLabel, residLabel, width, height })
       riser, tread — one step, positive safe integers (units)
       count        — number of risers (the top riser meets the upper floor,
                      so the section has count−1 treads)
       rise         — the true floor-to-floor rise; residual = rise − count·riser
                      may be positive (steps land short) or negative (overrun);
                      |residual| is expected to be small against a riser
       labels       — preformatted strings (the tool page owns formatting)

   Fails loud on bad geometry, escapes all labels.
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.StairFig = mod; root.stairfig = mod.stairfig; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function stairfig(opts) {
    opts = opts || {};
    var riser = opts.riser, tread = opts.tread, count = opts.count, rise = opts.rise;
    if (!Number.isSafeInteger(riser) || riser <= 0) throw new TypeError('stairfig: riser must be a positive safe integer, got ' + riser);
    if (!Number.isSafeInteger(tread) || tread <= 0) throw new TypeError('stairfig: tread must be a positive safe integer, got ' + tread);
    if (!Number.isSafeInteger(count) || count < 1) throw new TypeError('stairfig: count must be a positive safe integer, got ' + count);
    if (!Number.isSafeInteger(rise) || rise <= 0) throw new TypeError('stairfig: rise must be a positive safe integer, got ' + rise);
    var W = (Number.isFinite(opts.width) && opts.width > 0) ? opts.width : 680;
    var H = (Number.isFinite(opts.height) && opts.height > 0) ? opts.height : 240;

    var residual = rise - count * riser;
    var runTotal = (count - 1) * tread;            // the top riser meets the floor
    var stepsTop = count * riser;                  // where the snapped steps land

    var mL = 16, mR = 104, mT = 26, mB = 40;       // right margin carries labels
    var boxW = W - mL - mR, boxH = H - mT - mB;
    var maxY = Math.max(rise, stepsTop);
    var k = Math.min(boxW / Math.max(runTotal, tread), boxH / maxY);
    var x0 = mL, y0 = H - mB;                      // lower floor at bottom-left
    function X(u) { return x0 + u * k; }
    function Y(u) { return y0 - u * k; }           // u above the lower floor

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" class="nl stf">';
    svg += '<defs><pattern id="stfhatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
         + '<line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--nl-hatch,#0a0a0a)" stroke-width="0.6"/></pattern></defs>';

    function txt(x, y, cls, anchor, str) {
      return '<text x="' + x + '" y="' + y + '" class="' + cls + '" text-anchor="' + anchor + '" stroke="#fff" stroke-width="3" style="paint-order:stroke">' + esc(str) + '</text>';
    }

    // the two floor lines: lower at 0, upper at the TRUE rise (full width)
    svg += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + (W - mR + 40) + '" y2="' + y0 + '" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="2"/>';
    svg += '<line x1="' + x0 + '" y1="' + Y(rise) + '" x2="' + (W - mR + 40) + '" y2="' + Y(rise) + '" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="2"/>';

    // the stepped profile from the snapped riser
    var path = 'M ' + X(0) + ' ' + Y(0), i;
    for (i = 1; i <= count; i++) {
      path += ' L ' + X((i - 1) * tread) + ' ' + Y(i * riser);          // up the riser
      if (i < count) path += ' L ' + X(i * tread) + ' ' + Y(i * riser); // across the tread
    }
    svg += '<path d="' + path + '" fill="none" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="1.5"/>';

    // the residual: where count·riser lands vs the floor — hatched band
    if (residual !== 0) {
      var yA = Y(Math.min(rise, stepsTop)), yB = Y(Math.max(rise, stepsTop));
      var bx = X(runTotal);
      svg += '<rect x="' + (bx - 30) + '" y="' + yB + '" width="60" height="' + Math.max(1.5, yA - yB)
           + '" fill="url(#stfhatch)" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="0.75" stroke-dasharray="3 2"/>';
      if (opts.residLabel) svg += txt(bx + 36, (yA + yB) / 2 + 3, 'nl-residual', 'start', opts.residLabel);
    }

    // dimension labels: riser on the first step, tread on the first tread,
    // total rise at right, total run below
    if (opts.riserLabel) svg += txt(X(0) - 4 < 4 ? X(0) + 4 : X(0) - 4, (Y(0) + Y(riser)) / 2 + 3, 'nl-snap-val', X(0) - 4 < 4 ? 'start' : 'end', opts.riserLabel);
    if (opts.treadLabel && count > 1) svg += txt((X(0) + X(tread)) / 2, Y(riser) - 5, 'nl-snap-val', 'middle', opts.treadLabel);
    if (opts.riseLabel) svg += txt(W - mR + 44, (Y(0) + Y(rise)) / 2 + 3, 'nl-true-val', 'start', opts.riseLabel);
    if (opts.runLabel && count > 1) {
      svg += '<line x1="' + X(0) + '" y1="' + (y0 + 14) + '" x2="' + X(runTotal) + '" y2="' + (y0 + 14) + '" style="stroke:var(--nl-axis,#999)" stroke-width="1"/>';
      svg += '<line x1="' + (X(0) - 4) + '" y1="' + (y0 + 18) + '" x2="' + (X(0) + 4) + '" y2="' + (y0 + 10) + '" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="1.5"/>';
      svg += '<line x1="' + (X(runTotal) - 4) + '" y1="' + (y0 + 18) + '" x2="' + (X(runTotal) + 4) + '" y2="' + (y0 + 10) + '" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="1.5"/>';
      svg += txt((X(0) + X(runTotal)) / 2, y0 + 30, 'nl-true-val', 'middle', opts.runLabel);
    }

    svg += '</svg>';
    return svg;
  }

  return { stairfig: stairfig };
});

/* headless entry: `node stairfig.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var ST = module.exports;
  var IN = 24384;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }
  var inch = function (n) { return Math.round(n * IN); };

  // 9' rise, 15 risers @ 7 3/16" snapped → residual 9/16" ... use exact ints:
  // rise 108" = 2633472; riser 7 3/16 = 175260... compute via lattice
  var rise = inch(108), riser = inch(7) + 3 * (IN / 16), count = 15, tread = inch(10);
  var resid = rise - count * riser;
  var svg = ST.stairfig({ riser: riser, tread: tread, count: count, rise: rise,
    riserLabel: '7 3/16"', treadLabel: '10"', riseLabel: "9'", runLabel: "11'-8\"", residLabel: '+ 3/16" drift' });
  ok('returns an <svg>', svg.indexOf('<svg') === 0 && svg.indexOf('</svg>') > 0);
  ok('profile path drawn', svg.indexOf('<path d="M') > 0);
  ok('residual hatched when off', resid !== 0 ? svg.indexOf('url(#stfhatch)') > 0 : true);
  ok('labels present', svg.indexOf('>9\'</text>') > 0 && svg.indexOf('>10"</text>') > 0);

  // an exact division draws no hatch
  var ex = ST.stairfig({ riser: inch(7.2), tread: tread, count: 15, rise: inch(7.2) * 15 });
  ok('no hatch when exact', ex.indexOf('url(#stfhatch)') === -1);

  // single riser (a curb step) renders without treads
  var one = ST.stairfig({ riser: inch(6), tread: inch(11), count: 1, rise: inch(6) });
  ok('single riser renders', one.indexOf('<svg') === 0);

  // labels escaped
  var ev = ST.stairfig({ riser: 10, tread: 10, count: 2, rise: 20, riseLabel: '<b>' });
  ok('labels escaped', ev.indexOf('<b>') === -1 && ev.indexOf('&lt;b&gt;') > 0);

  threw('zero riser throws', function () { ST.stairfig({ riser: 0, tread: 10, count: 2, rise: 10 }); });
  threw('non-integer tread throws', function () { ST.stairfig({ riser: 10, tread: 1.5, count: 2, rise: 20 }); });
  threw('zero count throws', function () { ST.stairfig({ riser: 10, tread: 10, count: 0, rise: 20 }); });

  console.log('=== stairfig: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
