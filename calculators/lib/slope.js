/* slope.js — the slope substrate: parse, solve two of three, whole steps
   =========================================================================
   PURE MODULE (no DOM). Shared by Slope, Roof, Ramp and Drain. Lengths are
   integer counts on the engine's lattice (1 unit = 1/960 mm, see snap.js);
   a slope is a RATIO, rise ÷ run, a positive float. This module never
   formats a length (the page owns that through numberline.js).

   CONTRACT
     parseSlope(text) → null | { ratio, kind, ... } | { error }
       null for blank text. Never throws. kind is one of
         'percent'  "2%"                      { v }
         'deg'      "5°", "5deg"              { v }
         'pitch'    "4:12", "4/12", "4in12"   { p, q:12 }
         'ratio'    "1:20", "3:1"             { p, q }   read as rise:run
         'hv'       "3H:1V" (civil, grading)  { h, v }   horizontal first
         'inft'     '1/4"/ft', "0.25in/ft"    { v }      inches per foot
         'bare'     ".02"                     {}
       A 'ratio' or 'pitch' steeper than 1:1 carries flipRead: the ratio the
       same text gives read as H:V, so a page can say which reading it used
       ("3:1" is 71.6° as rise:run, 18.4° on a grading plan).

     solve({ rise, run, ratio }) → null | { rise, run, leg, quant }
       rise, run: positive safe integers (units) or null; ratio: float or null.
       Uses whichever two are given (rise+run wins if all three are, so pass
       only the two that govern, see governance below). leg names the value
       that was solved: 'rise' | 'run' | 'slope', or 'slopeonly' for a bare
       slope (a nominal 12-inch run, so a figure can show the angle). The
       solved leg is rounded to the lattice; quant is the float residual.

     famSteps(ratio, fam) → { lo:{face,ratio}, hi:{face,ratio}, exact }
       fam: 'percent' | 'ratio' | 'pitch' | 'degree'. The bracketing whole
       steps, shallower (lo) and steeper (hi). A maximum rounds to lo, a
       minimum to hi. exact when the slope lands on a step.

     faceOf(ratio) → string
       The slope in the form its regime is spoken in, always re-parseable:
       a pitch at 2:12 and up, 1:n from 1:20, inches per foot (to the 1/16)
       below that, else percent. Past 45°, degrees.

     TWO OF THREE: field governance (reused by every two-of-three page)
       A page keeps { text: {k: string}, order: [k, ...] } for three keys.
       At most two keys carry the user's own text; order lists them oldest
       first. The third key is the ANSWER: the page draws the solved value
       there, styled as a result.
       edit(gov, key, text) → new gov. Typing into the answer makes it an
         input; the oldest input then gives up its text and becomes the
         answer. Clearing a field drops it from order. Never mutates gov.
       answerOf(keys, gov) → key | null. The key without text when exactly
         two keys have text, else null (nothing to solve yet).
       govFromParams(keys, entries) → gov. Builds governance from URL
         entries in query order; if all three are present the last two win.

     URL CONTRACT (handoff between Slope, Roof, Ramp, Drain)
       ?rise=<text>&run=<text>&slope=<text>  raw field text, as typed.
       At most two are written; the absent one is the answer. A receiving
       page reads the ones it understands and ignores the rest.
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.Slope = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var IN = 24384;            // units per inch (1/960 mm lattice)
  var DEG = Math.PI / 180;

  function num(s) {
    var m = /^(\d+)\/(\d+)$/.exec(s);
    if (m) return +m[2] > 0 ? +m[1] / +m[2] : NaN;
    return +s;
  }

  /* ---- parse ------------------------------------------------------------- */
  function parseSlope(text) {
    if (text == null) return null;
    var t = String(text).trim().toLowerCase().replace(/\s+/g, '');
    if (!t) return null;
    var m;
    if ((m = /^(\d+(?:\.\d+)?)%$/.exec(t))) {
      if (!(+m[1] > 0)) return { error: 'must be more than zero' };
      return { ratio: +m[1] / 100, kind: 'percent', v: +m[1] };
    }
    if ((m = /^(\d+(?:\.\d+)?)(?:°|deg|degrees?)$/.exec(t))) {
      var deg = +m[1];
      if (deg <= 0 || deg >= 90) return { error: 'angle must be between 0° and 90°' };
      return { ratio: Math.tan(deg * DEG), kind: 'deg', v: deg };
    }
    // inches per foot — the inch mark (or "in") is required, so "1/4" alone
    // stays a ratio
    if ((m = /^(\d+\/\d+|\d+(?:\.\d+)?|\.\d+)(?:"|in|inch|inches)(?:\/|per)(?:ft|foot|')$/.exec(t))) {
      var v = num(m[1]);
      if (!(v > 0)) return { error: 'must be more than zero' };
      return { ratio: v / 12, kind: 'inft', v: v };
    }
    if ((m = /^(\d+(?:\.\d+)?)h:(\d+(?:\.\d+)?)v$/.exec(t))) {
      var h = +m[1], vv = +m[2];
      if (!(h > 0 && vv > 0)) return { error: 'both numbers must be positive' };
      return { ratio: vv / h, kind: 'hv', h: h, v: vv };
    }
    if ((m = /^(\d+(?:\.\d+)?)(?::|in|\/)(\d+(?:\.\d+)?)$/.exec(t))) {
      var p = +m[1], q = +m[2];
      if (!(p > 0 && q > 0)) return { error: 'both numbers must be positive' };
      var r = { ratio: p / q, kind: q === 12 ? 'pitch' : 'ratio', p: p, q: q };
      if (p > q) r.flipRead = q / p;
      return r;
    }
    if ((m = /^(0?\.\d+)$/.exec(t))) {
      if (!(+m[1] > 0)) return { error: 'must be more than zero' };
      return { ratio: +m[1], kind: 'bare' };
    }
    return { error: 'use 2%, 4:12, 1:20, 1/4"/ft, 3H:1V or 5°' };
  }

  /* ---- solve two of three ------------------------------------------------- */
  function okLen(u) { return Number.isSafeInteger(u) && u > 0; }
  function solve(g) {
    g = g || {};
    var rise = g.rise != null ? g.rise : null, run = g.run != null ? g.run : null;
    var ratio = g.ratio != null ? g.ratio : null;
    if (rise != null && !okLen(rise)) throw new TypeError('solve: rise must be a positive safe integer, got ' + rise);
    if (run != null && !okLen(run)) throw new TypeError('solve: run must be a positive safe integer, got ' + run);
    if (ratio != null && !(isFinite(ratio) && ratio > 0)) throw new TypeError('solve: ratio must be a positive finite number, got ' + ratio);
    if (rise != null && run != null) return { rise: rise, run: run, leg: 'slope', quant: 0 };
    if (rise != null && ratio != null) {
      var x = rise / ratio, xr = Math.round(x);
      return okLen(xr) ? { rise: rise, run: xr, leg: 'run', quant: x - xr } : null;
    }
    if (run != null && ratio != null) {
      var y = run * ratio, yr = Math.round(y);
      return okLen(yr) ? { rise: yr, run: run, leg: 'rise', quant: y - yr } : null;
    }
    if (ratio != null) {
      var rr = 12 * IN, ry = Math.round(rr * ratio);
      return okLen(ry) ? { rise: ry, run: rr, leg: 'slopeonly', quant: 0 } : null;
    }
    return null;
  }

  /* ---- whole steps -------------------------------------------------------- */
  // near-integer, tolerant of the lattice rounding in a solved leg (which can
  // push a clean 2% or 1:50 a millionth off exact); tolerance scales with v
  // because 1/s amplifies it for shallow ratios
  function whole(v) { return Math.abs(v - Math.round(v)) < Math.max(1e-4, Math.abs(v) * 1e-5); }
  function famSteps(s, fam) {
    if (fam === 'pitch') { var x = 12 * s; return { lo: { face: Math.floor(x) + ':12', ratio: Math.floor(x) / 12 }, hi: { face: Math.ceil(x) + ':12', ratio: Math.ceil(x) / 12 }, exact: whole(x) }; }
    if (fam === 'ratio') { var n = 1 / s; return { lo: { face: '1:' + Math.ceil(n), ratio: 1 / Math.ceil(n) }, hi: { face: '1:' + Math.max(1, Math.floor(n)), ratio: 1 / Math.max(1, Math.floor(n)) }, exact: whole(n) }; }
    if (fam === 'degree') { var a = Math.atan(s) / DEG; return { lo: { face: Math.floor(a) + '°', ratio: Math.tan(Math.floor(a) * DEG) }, hi: { face: Math.ceil(a) + '°', ratio: Math.tan(Math.ceil(a) * DEG) }, exact: whole(a) }; }
    if (fam === 'percent') { var p = 100 * s; return { lo: { face: Math.floor(p) + '%', ratio: Math.floor(p) / 100 }, hi: { face: Math.ceil(p) + '%', ratio: Math.ceil(p) / 100 }, exact: whole(p) }; }
    throw new TypeError('famSteps: unknown family ' + fam);
  }

  /* ---- the slope as its regime speaks it ---------------------------------- */
  function sig(n, d) { return String(parseFloat(n.toFixed(d))); }
  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
  function faceOf(s) {
    if (!(isFinite(s) && s > 0)) throw new TypeError('faceOf: ratio must be a positive finite number, got ' + s);
    if (s > 1) return sig(Math.atan(s) / DEG, 2) + '°';
    if (s >= 2 / 12) return sig(12 * s, 2) + ':12';
    if (s >= 1 / 20) return '1:' + sig(1 / s, 2);
    var sx = 12 * s * 16;                 // sixteenths of an inch per foot
    if (whole(sx) && Math.round(sx) > 0) {
      var a = Math.round(sx), g = gcd(a, 16), w = a / g, d = 16 / g;
      return (d === 1 ? String(w) : w + '/' + d) + '"/ft';
    }
    return sig(100 * s, 100 * s < 1 ? 3 : 2) + '%';
  }

  /* ---- two of three ------------------------------------------------------- */
  function edit(gov, key, text) {
    var t = {}, k;
    for (k in gov.text) t[k] = gov.text[k];
    var order = gov.order.filter(function (o) { return o !== key; });
    var has = String(text == null ? '' : text).trim() !== '';
    t[key] = has ? text : '';
    if (has) order.push(key);
    while (order.length > 2) t[order.shift()] = '';
    return { text: t, order: order };
  }
  function answerOf(keys, gov) {
    if (gov.order.length !== 2) return null;
    for (var i = 0; i < keys.length; i++) if (gov.order.indexOf(keys[i]) < 0) return keys[i];
    return null;
  }
  function govFromParams(keys, entries) {
    var gov = { text: {}, order: [] };
    keys.forEach(function (k) { gov.text[k] = ''; });
    (entries || []).forEach(function (e) {
      if (keys.indexOf(e[0]) >= 0) gov = edit(gov, e[0], e[1]);
    });
    return gov;
  }

  return {
    IN: IN,
    parseSlope: parseSlope, solve: solve, famSteps: famSteps, whole: whole,
    faceOf: faceOf, edit: edit, answerOf: answerOf, govFromParams: govFromParams
  };
});

/* headless entry: `node slope.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var S = module.exports;
  var pass = 0, fail = 0;
  function eq(label, got, want) {
    var ok = typeof want === 'number' ? Math.abs(got - want) < 1e-9 : JSON.stringify(got) === JSON.stringify(want);
    if (ok) pass++; else { fail++; console.log('FAIL ' + label + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
  }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }
  var IN = S.IN, FT = 12 * IN;

  // parse — every form
  eq('blank', S.parseSlope('  '), null);
  eq('percent', S.parseSlope('2%').ratio, 0.02);
  eq('degrees', S.parseSlope('45°').ratio, 1);
  eq('deg word', S.parseSlope('30 deg').kind, 'deg');
  eq('pitch', S.parseSlope('4:12').kind, 'pitch');
  eq('pitch ratio', S.parseSlope('4/12').ratio, 1 / 3);
  eq('ratio', S.parseSlope('1:20').ratio, 0.05);
  eq('in/ft', S.parseSlope('1/4"/ft').ratio, 1 / 48);
  eq('in per foot', S.parseSlope('1/8 in per ft').ratio, 1 / 96);
  eq('decimal in/ft', S.parseSlope('0.25in/ft').ratio, 1 / 48);
  eq('bare 1/4 stays ratio', S.parseSlope('1/4').kind, 'ratio');
  eq('H:V', S.parseSlope('3H:1V').ratio, 1 / 3);
  eq('h:v lower', S.parseSlope('1.5h:1v').kind, 'hv');
  eq('steep a:b flags', S.parseSlope('3:1').flipRead, 1 / 3);
  eq('shallow a:b no flag', S.parseSlope('1:3').flipRead, undefined);
  eq('bare', S.parseSlope('.02').ratio, 0.02);
  eq('bad deg', !!S.parseSlope('90°').error, true);
  eq('zero pct', !!S.parseSlope('0%').error, true);
  eq('junk', !!S.parseSlope('steep').error, true);

  // solve
  eq('rise+run', S.solve({ rise: 6 * FT, run: 9 * FT }).leg, 'slope');
  eq('run+slope → rise', S.solve({ run: 9 * FT, ratio: 8 / 12 }).rise, 6 * FT);
  eq('rise+slope → run', S.solve({ rise: 6 * FT, ratio: 8 / 12 }).run, 9 * FT);
  eq('quant residual', S.solve({ run: 10, ratio: 1 / 3 }).quant, 10 / 3 - 3);
  eq('slope only', S.solve({ ratio: 1 / 12 }).leg, 'slopeonly');
  eq('nothing', S.solve({ rise: 5 }), null);
  threw('bad rise throws', function () { S.solve({ rise: 1.5, run: 3 }); });
  threw('bad ratio throws', function () { S.solve({ run: 3, ratio: -1 }); });

  // steps
  eq('pitch bracket', S.famSteps(7.5 / 12, 'pitch').lo.face, '7:12');
  eq('pitch exact', S.famSteps(8 / 12, 'pitch').exact, true);
  eq('ratio bracket shallower', S.famSteps(1 / 12.5, 'ratio').lo.face, '1:13');
  threw('bad family throws', function () { S.famSteps(0.1, 'nope'); });

  // faces re-parse to the same slope
  ['8:12', '1:12', '1/4"/ft', '1/8"/ft', '60°', '0.7%'].forEach(function (f) {
    var r = S.parseSlope(f).ratio;
    eq('face ' + f, S.faceOf(r), f);
    eq('face reparses ' + f, Math.abs(S.parseSlope(S.faceOf(r)).ratio - r) < 1e-6, true);
  });

  // two of three
  var K = ['rise', 'run', 'slope'];
  var g = S.govFromParams(K, []);
  eq('empty answer', S.answerOf(K, g), null);
  g = S.edit(g, 'run', "9'"); g = S.edit(g, 'slope', '8:12');
  eq('rise is answer', S.answerOf(K, g), 'rise');
  g = S.edit(g, 'rise', "5'");          // typing into the answer
  eq('oldest (run) becomes answer', S.answerOf(K, g), 'run');
  eq('run text dropped', g.text.run, '');
  g = S.edit(g, 'slope', '6:12');       // re-editing an input keeps the answer
  eq('re-edit keeps answer', S.answerOf(K, g), 'run');
  g = S.edit(g, 'run', "12'");          // typing into the answer again
  eq('now rise is answer', S.answerOf(K, g), 'rise');
  g = S.edit(g, 'slope', '');
  eq('clearing leaves no answer', S.answerOf(K, g), null);
  eq('three params → last two', S.answerOf(K, S.govFromParams(K, [['rise', '1'], ['run', '2'], ['slope', '3%']])), 'rise');
  var g0 = S.govFromParams(K, [['run', '1']]); S.edit(g0, 'rise', '2');
  eq('edit does not mutate', g0.order.length, 1);

  console.log('=== slope: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
