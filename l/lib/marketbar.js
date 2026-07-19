/* marketbar.js — the market's widths as a figure, in the engine's language
   =========================================================================
   PURE MODULE. An SVG-string figure (no DOM), sibling to numberline.js and
   runbar.js: one horizontal axis in integer engine units carrying the
   DISTRIBUTION of a furniture class's constraining dimension, with the
   measured slot as the true-value tick. The convention is the converter's,
   lifted to a population: solid = the part of the market that fits the
   slot, hatch = the part you give up. A quartile slab (P5–P95 whisker,
   P25–P75 body, median tick) stands in for the cloud — honest at the small
   n a hand-checked seed has, since every quantile is a real SKU's number,
   never an interpolation.

   CONTRACT
     marketbar(spec) → svg string
       spec.widths   [int units, …]  the class's constraining-axis values
                     (pre-filtered by the caller: tier, size, state)
       spec.slot     int units       the measured slot on the same axis
       spec.width    px              figure width  (default 320)
       spec.compact  bool            canvas variant: slab + slot only
       spec.fmt      fn(units)→str   label formatter (default: inches)
       spec.id       string          pattern-id suffix (unique per page use)

   Fails loud on programmer error (no data, bad units) — the page decides
   when a class has no catalog and simply doesn't draw a figure for it.
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.MarketBar = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var IN = 24384;

  function reqInt(name, v) {
    if (!Number.isSafeInteger(v)) throw new TypeError('marketbar: ' + name + ' must be a safe integer, got ' + v);
    return v;
  }

  // nearest-rank quantile on a SORTED integer array — always a real value
  function quantile(sorted, q) {
    var i = Math.round(q * (sorted.length - 1));
    return sorted[Math.max(0, Math.min(sorted.length - 1, i))];
  }

  function defaultFmt(u) {
    var v = u / IN;
    return (Math.round(v * 10) / 10) + '″';
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function marketbar(spec) {
    if (!spec || !Array.isArray(spec.widths) || spec.widths.length === 0) {
      throw new TypeError('marketbar: widths must be a non-empty array');
    }
    var widths = spec.widths.slice();
    widths.forEach(function (w, i) { reqInt('widths[' + i + ']', w); });
    widths.sort(function (a, b) { return a - b; });
    reqInt('slot', spec.slot);

    var W = spec.width || 320;
    var compact = !!spec.compact;
    var fmt = spec.fmt || defaultFmt;
    var id = 'mkb-' + (spec.id || 'x');
    var H = compact ? 26 : 64;
    var axisY = compact ? 14 : 34;
    var padL = 6, padR = 6;

    var n = widths.length;
    var p5 = quantile(widths, 0.05), p25 = quantile(widths, 0.25);
    var p50 = quantile(widths, 0.50), p75 = quantile(widths, 0.75), p95 = quantile(widths, 0.95);
    var lo = widths[0], hi = widths[n - 1];

    // the axis window is the DATA's own range (small pad) — never stretched
    // by the slot. A slot beyond the market pins to the edge with an arrow;
    // stretching would squash the whole distribution into a corner to make
    // room for empty axis.
    var pad = Math.max(Math.round((hi - lo) * 0.04), IN / 2);
    var winLo = lo - pad, winHi = hi + pad;
    if (winHi === winLo) { winLo -= IN; winHi += IN; }   // degenerate: one value
    var span = winHi - winLo;
    function X(u) { return padL + (u - winLo) * (W - padL - padR) / span; }
    var slotOff = spec.slot > winHi ? 1 : spec.slot < winLo ? -1 : 0;
    var slotDraw = Math.max(winLo, Math.min(winHi, spec.slot));

    var fits = 0;
    for (var i = 0; i < n; i++) if (widths[i] <= spec.slot) fits++;
    var pct = Math.round(fits * 100 / n);

    var out = '<svg class="nl mkt" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' +
      esc('slot ' + fmt(spec.slot) + ' fits ' + fits + ' of ' + n) + '">';
    out += '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">'
         + '<line class="mkt-hatchline" x1="0" y1="0" x2="0" y2="5"/></pattern></defs>';

    // whisker P5–P95, then the quartile body split at the slot: solid where
    // the market fits, hatched where it doesn't — the residual convention
    var bodyY = axisY - (compact ? 5 : 7), bodyH = compact ? 10 : 14;
    out += '<line class="mkt-whisker" x1="' + X(p5).toFixed(1) + '" y1="' + axisY + '" x2="' + X(p95).toFixed(1) + '" y2="' + axisY + '"/>';
    var cut = Math.max(p25, Math.min(p75, spec.slot));
    if (cut > p25) out += '<rect class="mkt-body" x="' + X(p25).toFixed(1) + '" y="' + bodyY + '" width="' + (X(cut) - X(p25)).toFixed(1) + '" height="' + bodyH + '"/>';
    if (p75 > cut) out += '<rect class="mkt-body is-lost" fill="url(#' + id + ')" x="' + X(cut).toFixed(1) + '" y="' + bodyY + '" width="' + (X(p75) - X(cut)).toFixed(1) + '" height="' + bodyH + '"/>';
    out += '<rect class="mkt-body-frame" x="' + X(p25).toFixed(1) + '" y="' + bodyY + '" width="' + (X(p75) - X(p25)).toFixed(1) + '" height="' + bodyH + '"/>';
    out += '<line class="mkt-median" x1="' + X(p50).toFixed(1) + '" y1="' + bodyY + '" x2="' + X(p50).toFixed(1) + '" y2="' + (bodyY + bodyH) + '"/>';

    // the slot: the strong true-value tick — pinned with an arrow when the
    // slot lies beyond the market either way
    var sx = X(slotDraw);
    out += '<line class="mkt-slot' + (slotOff ? ' is-off' : '') + '" x1="' + sx.toFixed(1) + '" y1="' + (bodyY - (compact ? 3 : 6)) + '" x2="' + sx.toFixed(1) + '" y2="' + (bodyY + bodyH + (compact ? 3 : 6)) + '"/>';

    if (!compact) {
      var labelY = bodyY + bodyH + 14;
      // slot label hugs its tick, clamped into the frame
      var anchor = sx < 40 ? 'start' : sx > W - 40 ? 'end' : 'middle';
      var slotTxt = slotOff > 0 ? fmt(spec.slot) + ' →' : slotOff < 0 ? '← ' + fmt(spec.slot) : fmt(spec.slot);
      out += '<text class="mkt-slot-val" text-anchor="' + anchor + '" x="' + sx.toFixed(1) + '" y="' + (bodyY - 9) + '">' + esc(slotTxt) + '</text>';
      // quantile labels yield to each other when the scale packs them close
      out += '<text class="mkt-quant" text-anchor="middle" x="' + X(p50).toFixed(1) + '" y="' + labelY + '">median ' + esc(fmt(p50)) + '</text>';
      if (X(p50) - X(p5) >= 64) out += '<text class="mkt-quant" text-anchor="start" x="' + X(p5).toFixed(1) + '" y="' + labelY + '">' + esc(fmt(p5)) + '</text>';
      if (X(p95) - X(p50) >= 64) out += '<text class="mkt-quant" text-anchor="end" x="' + X(p95).toFixed(1) + '" y="' + labelY + '">' + esc(fmt(p95)) + '</text>';
    }
    out += '</svg>';
    return out;
  }

  return { marketbar: marketbar, quantile: quantile };
});

/* headless entry: `node marketbar.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var M = module.exports;
  var IN = 24384;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }
  var widths = [72, 76, 80, 82, 84, 84, 86, 88, 90, 96].map(function (w) { return w * IN; });

  // quantiles are real members, nearest-rank
  var sorted = widths.slice().sort(function (a, b) { return a - b; });
  ok('median is a real SKU value', M.quantile(sorted, 0.5) === 84 * IN);
  ok('P5 clamps to the first value', M.quantile(sorted, 0.05) === 72 * IN);
  ok('P95 near the top', M.quantile(sorted, 0.95) === 96 * IN);

  var svg = M.marketbar({ widths: widths, slot: 85 * IN, id: 't' });
  ok('returns an svg string', /^<svg class="nl mkt"/.test(svg));
  ok('aria carries the counts', /fits 6 of 10/.test(svg));
  ok('hatch pattern present when part of the market is lost', /url\(#mkb-t\)/.test(svg));
  ok('median label present', /median 84/.test(svg));
  ok('slot tick drawn', /mkt-slot"/.test(svg));

  // slot beyond every SKU: nothing hatched, tick pinned at the edge with an
  // arrow, and the axis window NOT stretched (the data keeps the full width)
  var all = M.marketbar({ widths: widths, slot: 200 * IN, id: 'u' });
  ok('slot past the market: no lost band', !/is-lost/.test(all));
  ok('aria says all fit', /fits 10 of 10/.test(all));
  ok('off-scale slot is pinned + arrowed', /is-off/.test(all) && /→/.test(all));
  var tickX = parseFloat(/mkt-slot is-off" x1="([\d.]+)/.exec(all)[1]);
  ok('pinned tick sits at the right edge', tickX > 300);
  var p5x = parseFloat(/mkt-quant" text-anchor="start" x="([\d.]+)/.exec(all)[1]);
  ok('distribution still spans the axis (window not stretched)', p5x < 40);

  // slot below every SKU: the whole body is lost, pinned left
  var none = M.marketbar({ widths: widths, slot: 60 * IN, id: 'v' });
  ok('slot under the market: lost band drawn', /is-lost/.test(none));
  ok('aria says none fit', /fits 0 of 10/.test(none));
  ok('pinned left with arrow', /← /.test(none));

  // compact variant: no text labels
  var mini = M.marketbar({ widths: widths, slot: 85 * IN, compact: true, id: 'w' });
  ok('compact drops the labels', !/mkt-quant/.test(mini) && /mkt-slot/.test(mini));

  // degenerate single-value catalog still draws
  var one = M.marketbar({ widths: [84 * IN], slot: 84 * IN, id: 'z' });
  ok('single point draws without dividing by zero', /^<svg/.test(one) && /fits 1 of 1/.test(one));

  threw('empty widths throws', function () { M.marketbar({ widths: [], slot: IN }); });
  threw('non-integer width throws', function () { M.marketbar({ widths: [1.5], slot: IN }); });
  threw('non-integer slot throws', function () { M.marketbar({ widths: [IN], slot: 1.5 }); });

  console.log('=== marketbar: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
