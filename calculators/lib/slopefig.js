/* slopefig.js — the slope triangle figure
   =========================================================================
   PURE MODULE (no DOM dependency: returns an SVG string). Given an exact
   rise and run (integer units, the engine's 1/960 mm lattice), it draws the
   slope triangle TO TRUE ANGLE — ground line, rise, heavy hypotenuse, the
   angle arc — plus, optionally, two reference rays bracketing the true slope
   (the nearest standard pitches), with the WEDGE between the true line and
   the nearer reference hatched: the angular residual made visible, exactly
   as numberline.js hatches the linear one.

   CONTRACT
     slopefig({ rise, run, riseLabel, runLabel, angleLabel,
                refLo, refHi, refLoLabel, refHiLabel, width, height })
       rise, run — positive safe integers (units)
       refLo/refHi — optional reference slopes as RATIOS (rise/run floats or
                {p,q} exact pairs), refLo ≤ true slope ≤ refHi expected; each
                draws as a dashed ray from the origin, labelled
       labels — preformatted strings (the tool page owns all formatting; this
                module never formats values)

   Steep slopes flip the long leg: above 1:1 the triangle is drawn against
   the vertical, so the figure stays legible from 0.1% to 45°+ without
   distorting the angle. Fails loud on bad geometry, escapes all labels.
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.SlopeFig = mod; root.slopefig = mod.slopefig; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function ratioOf(r) {
    if (r == null) return null;
    if (typeof r === 'number') { if (!(isFinite(r) && r > 0)) throw new TypeError('slopefig: ref ratio must be a positive finite number'); return r; }
    if (typeof r === 'object' && Number.isFinite(r.p) && Number.isFinite(r.q) && r.q > 0 && r.p > 0) return r.p / r.q;
    throw new TypeError('slopefig: ref must be a number or {p,q}');
  }

  function slopefig(opts) {
    opts = opts || {};
    var rise = opts.rise, run = opts.run;
    if (!Number.isSafeInteger(rise) || rise <= 0) throw new TypeError('slopefig: rise must be a positive safe integer, got ' + rise);
    if (!Number.isSafeInteger(run) || run <= 0) throw new TypeError('slopefig: run must be a positive safe integer, got ' + run);
    var W = (Number.isFinite(opts.width) && opts.width > 0) ? opts.width : 680;
    var H = (Number.isFinite(opts.height) && opts.height > 0) ? opts.height : 200;
    var refLo = ratioOf(opts.refLo), refHi = ratioOf(opts.refHi);

    var s = rise / run;                       // the true ratio (display only —
                                              // exactness lives in the page's ints)
    // drawing box: origin bottom-left, run along x, rise up y
    var mL = 14, mR = 96, mT = 30, mB = 44;   // right margin holds the rise label
    var boxW = W - mL - mR, boxH = H - mT - mB;
    var x0 = mL, y0 = H - mB;                 // the origin (toe of the slope)

    // scale so the triangle fills the box at TRUE angle: the steeper of the
    // two legs takes the full box dimension
    var k = Math.min(boxW / run, boxH / rise);
    var px = run * k, py = rise * k;          // the true-angle triangle in px
    var xT = x0 + px, yT = y0 - py;           // the top of the slope

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" class="nl sf">';
    svg += '<defs><pattern id="sfhatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
         + '<line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--nl-hatch,#0a0a0a)" stroke-width="0.6"/></pattern></defs>';

    function txt(x, y, cls, anchor, str) {
      return '<text x="' + x + '" y="' + y + '" class="' + cls + '" text-anchor="' + anchor + '" stroke="#fff" stroke-width="3" style="paint-order:stroke">' + esc(str) + '</text>';
    }
    // a reference ray at ratio r from the origin, clipped to the drawing box:
    // at horizontal distance d (px) the drop is d·r, since both axes share k
    function rayEnd(r) {
      var ex = x0 + boxW, ey = y0 - boxW * r;
      if (y0 - ey > boxH) { ey = y0 - boxH; ex = x0 + boxH / r; }
      return { x: ex, y: ey };
    }

    // the hatched wedge between the true hypotenuse and a reference ray — the
    // angular residual. By default the NEARER ref; a caller can pin it to a
    // chosen ref via hatchTo (a ratio), e.g. when a UI selects one bracket.
    // Drawn first so lines sit on top.
    var nearer = null;
    if (refLo != null || refHi != null) {
      if (opts.hatchTo != null) {
        nearer = ratioOf(opts.hatchTo);
      } else {
        var dLo = refLo != null ? Math.abs(s - refLo) : Infinity;
        var dHi = refHi != null ? Math.abs(refHi - s) : Infinity;
        nearer = dLo <= dHi ? refLo : refHi;
      }
      if (nearer != null && nearer !== s) {
        // wedge out to the true triangle's horizontal extent
        var wx = xT, wyTrue = yT, wyRef = y0 - px * nearer;
        if (y0 - wyRef > boxH) { wyRef = y0 - boxH; }   // clip steep refs
        svg += '<path d="M ' + x0 + ' ' + y0 + ' L ' + wx + ' ' + wyTrue + ' L ' + wx + ' ' + wyRef + ' Z" fill="url(#sfhatch)" stroke="none"/>';
      }
    }

    // reference rays — dashed, labelled at their ends
    [{ r: refLo, label: opts.refLoLabel }, { r: refHi, label: opts.refHiLabel }].forEach(function (ref) {
      if (ref.r == null) return;
      var e = rayEnd(ref.r);
      svg += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + e.x + '" y2="' + e.y + '" style="stroke:var(--nl-axis,#999)" stroke-width="1" stroke-dasharray="4 3"/>';
      if (ref.label) svg += txt(Math.min(e.x + 4, W - 4), Math.max(10, e.y + 3), 'nl-src-val', e.x > x0 + boxW - 8 ? 'end' : 'start', ref.label);
    });

    // comparison rays — user-selected reference slopes (e.g. common slopes),
    // drawn in the accent with a dotted line and no hatch, distinct from the
    // rounding brackets above
    (opts.compare || []).forEach(function (c) {
      var r = ratioOf(c.ratio);
      if (r == null || !(r > 0)) return;
      var e = rayEnd(r);
      svg += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + e.x + '" y2="' + e.y + '" style="stroke:var(--accent,#004C80)" stroke-width="1.3" stroke-dasharray="1 3"/>';
      if (c.label) svg += txt(Math.min(e.x + 4, W - 4), Math.max(10, e.y + 3), 'nl-src-val', e.x > x0 + boxW - 8 ? 'end' : 'start', c.label);
    });

    // ground + rise legs (light), the slope itself (heavy)
    svg += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + xT + '" y2="' + y0 + '" style="stroke:var(--nl-axis,#999)" stroke-width="1"/>';
    svg += '<line x1="' + xT + '" y1="' + y0 + '" x2="' + xT + '" y2="' + yT + '" style="stroke:var(--nl-axis,#999)" stroke-width="1"/>';
    svg += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + xT + '" y2="' + yT + '" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="2"/>';

    // the slope length (the projected/true length, e.g. a rafter) — labelled
    // at the hypotenuse midpoint, offset perpendicular to sit above the line
    if (opts.hypoLabel) {
      var angH = Math.atan2(py, px), off = 11;
      var hx = (x0 + xT) / 2 - off * Math.sin(angH);
      var hy = (y0 + yT) / 2 - off * Math.cos(angH);
      svg += txt(hx, hy, 'nl-snap-val', 'middle', opts.hypoLabel);
    }

    // the angle arc + label at the toe
    var ang = Math.atan2(py, px);
    var aR = Math.min(46, px * 0.5, 120);
    if (aR > 12) {
      var ax = x0 + aR * Math.cos(ang), ay = y0 - aR * Math.sin(ang);
      svg += '<path d="M ' + (x0 + aR) + ' ' + y0 + ' A ' + aR + ' ' + aR + ' 0 0 0 ' + ax + ' ' + ay + '" fill="none" style="stroke:var(--nl-ink,#0a0a0a)" stroke-width="1"/>';
    }
    if (opts.angleLabel) svg += txt(x0 + aR + 6, y0 - 6, 'nl-snap-val', 'start', opts.angleLabel);

    // leg labels: run below its midpoint, rise to the right of its midpoint
    if (opts.runLabel) svg += txt(x0 + px / 2, y0 + 16, 'nl-true-val', 'middle', opts.runLabel);
    if (opts.riseLabel) svg += txt(Math.min(xT + 6, W - 4), (y0 + yT) / 2 + 4, 'nl-true-val', 'start', opts.riseLabel);

    svg += '</svg>';
    return svg;
  }

  return { slopefig: slopefig };
});

/* headless entry: `node slopefig.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var SF = module.exports;
  var IN = 24384, FT = 12 * IN;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }

  var svg = SF.slopefig({ rise: 7 * FT, run: 22 * FT, riseLabel: "7'", runLabel: "22'",
    angleLabel: '17.65°', hypoLabel: "23'-1.09\"",
    refLo: 3 / 12, refHi: 4 / 12, refLoLabel: '3:12', refHiLabel: '4:12' });
  ok('returns an <svg>', svg.indexOf('<svg') === 0 && svg.indexOf('</svg>') > 0);
  ok('hatched wedge present', svg.indexOf('url(#sfhatch)') > 0);
  ok('two dashed reference rays', (svg.match(/stroke-dasharray/g) || []).length === 2);
  ok('labels drawn', svg.indexOf('>3:12</text>') > 0 && svg.indexOf('>4:12</text>') > 0 && svg.indexOf('>17.65°</text>') > 0);
  ok('slope-length label drawn', svg.indexOf('23&#39;-1.09&quot;') > 0 || svg.indexOf("23'-1.09") > 0);
  ok('angle arc drawn', svg.indexOf('<path d="M') > 0);

  // exact refs accepted as {p,q}; no wedge when the slope IS the reference
  var on = SF.slopefig({ rise: FT, run: 12 * FT, refLo: { p: 1, q: 12 }, refHi: { p: 1, q: 12 } });
  ok('no wedge on a standard slope', on.indexOf('url(#sfhatch)') === -1);

  // hatchTo pins the wedge to a chosen bracket (not just the nearer one)
  var pinned = SF.slopefig({ rise: 38 * FT, run: 100 * FT, refLo: 3 / 12, refHi: 4 / 12, hatchTo: 3 / 12 });
  ok('hatchTo keeps a wedge', pinned.indexOf('url(#sfhatch)') > 0);

  // compare rays draw an accent line + label, no extra hatch
  var cmp = SF.slopefig({ rise: 7 * FT, run: 22 * FT, compare: [{ ratio: 1 / 12, label: '1:12' }] });
  ok('compare ray labelled', cmp.indexOf('>1:12</text>') > 0);

  // steep slope stays in the box (legs clipped by scale, not distorted)
  var steep = SF.slopefig({ rise: 100 * FT, run: 2 * FT });
  ok('steep slope renders', steep.indexOf('<svg') === 0);

  // labels escaped
  var ev = SF.slopefig({ rise: 10, run: 10, runLabel: '<script>' });
  ok('labels escaped', ev.indexOf('<script>') === -1 && ev.indexOf('&lt;script&gt;') > 0);

  threw('zero rise throws', function () { SF.slopefig({ rise: 0, run: 10 }); });
  threw('non-integer run throws', function () { SF.slopefig({ rise: 10, run: 10.5 }); });
  threw('bad ref throws', function () { SF.slopefig({ rise: 10, run: 10, refLo: -1 }); });

  console.log('=== slopefig: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
