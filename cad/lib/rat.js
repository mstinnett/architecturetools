/* rat.js — exact rational scalars over the engine lattice
   =========================================================================
   PURE MODULE. The first stone of the 2D CAD basis: exact rational numbers
   (BigInt numerator / denominator) whose unit is the calculator engine's
   canonical lattice count — 1 unit = 1/960 mm, so 1 mm = 960, 1 in = 24384,
   1 ft = 292608, exactly as parse-length.js / snap.js define them.

   WHY RATIONALS. The calculator engine stays on integers because its inputs
   and grids are lattice points. A CAD kernel cannot: dividing a run into 7,
   inverting a transform, or intersecting two segments produces exact
   RATIONAL coordinates. This module holds those values exactly and converts
   back to the integer lattice as LATE as possible — and when it does, the
   rounding never destroys information: toLattice() returns the snapped
   integer AND the exact remainder, the same contract as snap.js/partition.js
   (the residual is a fact you can carry, display, or re-add — not an error
   that leaked away).

   RANGE. calculators/lib is JS-Number math, exact within 2^53, capped at the
   UI. Exact transforms and intersections overflow any fixed range in
   intermediate values, so this lineage uses BigInt throughout: unbounded,
   still dependency-free, still vanilla JS. The two lineages meet at
   toLattice(), which reports whether the snapped count fits a safe Number
   (`safe`) so callers can hand results back to the calculator engine.

   ROUNDING POLICY — ONE POLICY, ASSERTED EQUAL. The floor/nearest/ceil
   kernel for Number lattices lives ONLY in calculators/lib/snap.js. This
   module cannot delegate to it (snap's domain is integers; ours is
   rationals), so it extends the SAME policy — floor ≤ x, ceil ≥ x, nearest
   rounds half AWAY FROM ZERO — and the inline test block PROVES parity by
   running both kernels over a shared sample. If the policies ever diverge,
   `node rat.js` fails.

   CONTRACT — every value is frozen {n: BigInt, d: BigInt > 0}, normalized
   (gcd 1, sign on n). Fails loud on programmer error (non-integer input,
   zero denominator); domain limits are FLAGGED, never thrown (toLattice
   reports `safe:false` past 2^53 rather than throwing).
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.Rat = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ZERO = BigInt(0), ONE = BigInt(1), TWO = BigInt(2);

  /* ---- construction ------------------------------------------------------ */

  function toBig(name, v) {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') {
      if (!Number.isSafeInteger(v)) throw new TypeError('rat: ' + name + ' must be a safe integer or BigInt, got ' + v);
      return BigInt(v);
    }
    throw new TypeError('rat: ' + name + ' must be a safe integer or BigInt, got ' + typeof v);
  }

  function bgcd(a, b) {
    a = a < ZERO ? -a : a; b = b < ZERO ? -b : b;
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  // rat(n [, d]) → normalized frozen rational. The only maker.
  function rat(n, d) {
    var N = toBig('numerator', n);
    var D = d === undefined ? ONE : toBig('denominator', d);
    if (D === ZERO) throw new TypeError('rat: denominator must not be zero');
    if (D < ZERO) { N = -N; D = -D; }
    if (N === ZERO) D = ONE;
    else { var g = bgcd(N, D); if (g > ONE) { N = N / g; D = D / g; } }
    return Object.freeze({ n: N, d: D });
  }

  function isRat(x) { return !!x && typeof x.n === 'bigint' && typeof x.d === 'bigint'; }
  function req(name, x) { if (!isRat(x)) throw new TypeError('rat: ' + name + ' must be a rational (use rat())'); return x; }

  // lift: accept a Rat, safe-integer Number, or BigInt wherever a scalar fits
  function lift(x) { return isRat(x) ? x : rat(x); }

  var R0 = rat(0), R1 = rat(1);

  /* ---- arithmetic — closed, exact ---------------------------------------- */

  function add(a, b) { a = lift(a); b = lift(b); return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
  function sub(a, b) { a = lift(a); b = lift(b); return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mul(a, b) { a = lift(a); b = lift(b); return rat(a.n * b.n, a.d * b.d); }
  function div(a, b) {
    a = lift(a); b = lift(b);
    if (b.n === ZERO) throw new TypeError('rat: division by zero');
    return rat(a.n * b.d, a.d * b.n);
  }
  function neg(a) { a = lift(a); return rat(-a.n, a.d); }
  function abs(a) { a = lift(a); return a.n < ZERO ? rat(-a.n, a.d) : a; }

  /* ---- order -------------------------------------------------------------- */

  function cmp(a, b) {
    a = lift(a); b = lift(b);
    var l = a.n * b.d, r = b.n * a.d;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  function eq(a, b) { return cmp(a, b) === 0; }
  function sign(a) { a = lift(a); return a.n < ZERO ? -1 : a.n > ZERO ? 1 : 0; }
  function isZero(a) { return lift(a).n === ZERO; }
  function isInt(a) { return lift(a).d === ONE; }
  function min(a, b) { return cmp(a, b) <= 0 ? lift(a) : lift(b); }
  function max(a, b) { return cmp(a, b) >= 0 ? lift(a) : lift(b); }

  /* ---- late conversion — the whole point ----------------------------------
     toLattice(x, gridCount, dir) rounds an exact rational (engine units) to
     an integer multiple of gridCount and RETURNS THE REMAINDER EXACTLY:
        x = unitsBig + rem   (identity, always, in exact arithmetic)
     unitsBig is a BigInt multiple of gridCount; units is the same value as a
     Number when it fits 2^53 (`safe`), else null. `exact` is rem === 0 — a
     fact, not a tolerance. Policy matches snap.js (parity-tested):
        floor ≤ x · ceil ≥ x · nearest = half away from zero.            */

  function floorDivBig(p, q) {          // q > 0; true floor for BigInt
    var r = p / q;
    return (p % q !== ZERO && p < ZERO) ? r - ONE : r;
  }

  function toLattice(x, gridCount, dir) {
    x = req('value', lift(x));
    var G = toBig('gridCount', gridCount);
    if (G <= ZERO) throw new TypeError('rat: gridCount must be a positive integer, got ' + gridCount);
    if (dir !== 'floor' && dir !== 'nearest' && dir !== 'ceil') {
      throw new TypeError('rat: dir must be "floor" | "nearest" | "ceil", got ' + dir);
    }

    // work on |x| like snap.js, re-apply sign at the end
    var nAbs = x.n < ZERO ? -x.n : x.n;
    var den = x.d * G;
    var k = nAbs / den;                          // floor multiples of G in |x|
    var remN = nAbs - k * den;                   // remainder numerator over x.d, in units: remN / x.d
    var floorAbs = k * G;
    var ceilAbs = remN === ZERO ? floorAbs : floorAbs + G;
    // nearest: rem*2 ≥ G ⇔ 2·remN ≥ G·x.d — integer compare, no float anywhere
    var nearestAbs = (TWO * remN >= G * x.d) ? floorAbs + G : floorAbs;

    var big;
    if (dir === 'floor')   big = x.n >= ZERO ? floorAbs : -ceilAbs;
    else if (dir === 'ceil') big = x.n >= ZERO ? ceilAbs : -floorAbs;
    else big = x.n < ZERO ? -nearestAbs : nearestAbs;

    var rem = sub(x, rat(big));                  // exact: x − snapped
    var safe = big <= BigInt(Number.MAX_SAFE_INTEGER) && big >= -BigInt(Number.MAX_SAFE_INTEGER);
    return {
      unitsBig: big,
      units: safe ? Number(big) : null,
      rem: rem,
      exact: rem.n === ZERO,
      safe: safe
    };
  }

  /* ---- display ------------------------------------------------------------
     toNumber is for RENDERING ONLY (canvas coordinates, SVG attributes); it
     is the one place exactness is allowed to leave, and nothing computed
     from it may flow back into the model. */

  function toNumber(a) { a = lift(a); return Number(a.n) / Number(a.d); }
  function toString(a) { a = lift(a); return a.d === ONE ? a.n.toString() : a.n.toString() + '/' + a.d.toString(); }

  return {
    rat: rat, isRat: isRat, lift: lift, ZERO: R0, ONE: R1,
    add: add, sub: sub, mul: mul, div: div, neg: neg, abs: abs,
    cmp: cmp, eq: eq, sign: sign, isZero: isZero, isInt: isInt, min: min, max: max,
    toLattice: toLattice, toNumber: toNumber, toString: toString
  };
});

/* headless entry: `node rat.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var R = module.exports;
  var rat = R.rat;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function eqr(label, got, want) {
    if (R.eq(got, want)) pass++;
    else { fail++; console.log('FAIL ' + label + ': got ' + R.toString(got) + ' want ' + R.toString(want)); }
  }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }

  /* --- normalization ------------------------------------------------------ */
  ok('normalizes gcd', R.toString(rat(6, 4)) === '3/2');
  ok('sign moves to numerator', R.toString(rat(3, -4)) === '-3/4');
  ok('zero has denominator 1', R.toString(rat(0, 7)) === '0');
  ok('integers stay integers', R.isInt(rat(42)) && !R.isInt(rat(1, 3)));

  /* --- arithmetic identities ---------------------------------------------- */
  eqr('1/3 + 1/6 = 1/2', R.add(rat(1, 3), rat(1, 6)), rat(1, 2));
  eqr('a − a = 0', R.sub(rat(7, 9), rat(7, 9)), rat(0));
  eqr('(2/3)·(9/4) = 3/2', R.mul(rat(2, 3), rat(9, 4)), rat(3, 2));
  eqr('(1/3)/(1/6) = 2', R.div(rat(1, 3), rat(1, 6)), rat(2));
  eqr('lift numbers', R.add(rat(1, 2), 1), rat(3, 2));
  // the classic float lie, exact here: 1/10 + 2/10 = 3/10
  eqr('0.1 + 0.2 = 0.3 (as tenths)', R.add(rat(1, 10), rat(2, 10)), rat(3, 10));

  /* --- order --------------------------------------------------------------- */
  ok('cmp orders across denominators', R.cmp(rat(2, 3), rat(3, 4)) < 0);
  ok('sign', R.sign(rat(-1, 8)) === -1 && R.sign(rat(0)) === 0);
  eqr('min/max', R.min(rat(1, 3), rat(1, 4)), rat(1, 4));

  /* --- toLattice: identity + policy ---------------------------------------- */
  var IN = 24384;
  // 10 inches ÷ 3 → exactly 81280 units: lands on the lattice, rem 0
  var t1 = R.toLattice(R.div(rat(10 * IN), 3), 1, 'nearest');
  ok('10in/3 is a lattice point', t1.exact && t1.units === 81280);
  // 10 inches ÷ 7 = 34834 2/7 → nearest 34834, remainder exactly 2/7
  var x2 = R.div(rat(10 * IN), 7);
  var t2 = R.toLattice(x2, 1, 'nearest');
  ok('10in/7 nearest', t2.units === 34834);
  eqr('10in/7 remainder exact', t2.rem, rat(2, 7));
  eqr('identity x = units + rem', R.add(rat(t2.unitsBig), t2.rem), x2);
  // grid coarser than 1: snap 1/3 in to the 1/8" grid (gridCount 3048)
  var t3 = R.toLattice(R.div(rat(IN), 3), 3048, 'nearest');
  ok('1/3in → 3/8·1in grid multiple', t3.unitsBig % BigInt(3048) === BigInt(0));
  // floor ≤ x ≤ ceil, both sides of zero
  var xneg = rat(-100, 7);
  var fl = R.toLattice(xneg, 5, 'floor'), ce = R.toLattice(xneg, 5, 'ceil');
  ok('floor ≤ x (negative)', R.cmp(rat(fl.unitsBig), xneg) <= 0);
  ok('ceil ≥ x (negative)', R.cmp(rat(ce.unitsBig), xneg) >= 0);
  // nearest: half rounds away from zero, both signs
  ok('half up (+)', R.toLattice(rat(5, 2), 5, 'nearest').units === 5);
  ok('half away (−)', R.toLattice(rat(-5, 2), 5, 'nearest').units === -5);

  /* --- parity with snap.js — same policy, proven not presumed -------------- */
  var snapPath = '../../calculators/lib/snap.js';
  var S = null;
  try { S = require(snapPath); } catch (e) { console.log('SKIP snap parity (' + snapPath + ' not found)'); }
  if (S) {
    var sample = [0, 1, 99, 100, 150, 152, 3048, -3048, 24384, -24385, 12192, 4571, -4571, 7620001, -7620001];
    var grids = [1, 3, 100, 3048, 24384];
    var dirs = ['floor', 'nearest', 'ceil'];
    var mismatches = 0;
    sample.forEach(function (u) {
      grids.forEach(function (g) {
        dirs.forEach(function (d) {
          var mine = R.toLattice(rat(u), g, d).units;
          var theirs = S.snap(u, g, d);
          if (mine !== theirs) { mismatches++; console.log('PARITY FAIL u=' + u + ' g=' + g + ' ' + d + ': rat ' + mine + ' vs snap ' + theirs); }
        });
      });
    });
    ok('snap.js parity over ' + (sample.length * grids.length * dirs.length) + ' cases', mismatches === 0);
  }

  /* --- fail loud on programmer error --------------------------------------- */
  threw('zero denominator throws', function () { rat(1, 0); });
  threw('float input throws', function () { rat(1.5); });
  threw('bad dir throws', function () { R.toLattice(rat(1), 1, 'round'); });
  threw('zero grid throws', function () { R.toLattice(rat(1), 0, 'floor'); });
  threw('divide by zero throws', function () { R.div(rat(1), rat(0)); });

  /* --- domain limits flag, never throw -------------------------------------- */
  var huge = R.mul(rat(BigInt('9007199254740993')), rat(3));
  var th = R.toLattice(huge, 1, 'nearest');
  ok('past 2^53 flags safe:false', th.safe === false && th.units === null && typeof th.unitsBig === 'bigint');

  console.log('=== rat: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
