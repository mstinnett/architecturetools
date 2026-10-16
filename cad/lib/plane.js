/* plane.js — exact points and exact affine transforms
   =========================================================================
   PURE MODULE. Second stone of the CAD basis, on rat.js: points with exact
   rational coordinates (engine units, 1/960 mm) and 2×3 affine transforms
   with exact rational entries. Composition, inversion, and application are
   all closed over rationals — a point dragged through a hundred transforms
   and back arrives EXACTLY where it started, which is the property float
   CAD gives up (drift, T-junction gaps, non-closing polylines).

   ROTATION — THE HONEST STORY. Exact rotation cannot use degrees: by
   Niven's theorem the only angles with rational degrees AND rational cosine
   are multiples of 90° (plus the trivial 60/120 cosine halves that don't
   pair with rational sine). So this module represents a rotation by the
   RATIONAL TANGENT OF THE HALF-ANGLE, t:
       cos = (1−t²)/(1+t²)     sin = 2t/(1+t²)
   Every rational t yields an EXACT rational rotation (cos²+sin²=1
   identically), the family is dense in the circle, and it is closed under
   composition and inverse. t = 0 is 0°, t = 1 is exactly 90°, t = 1/3 is
   the 3-4-5 rotation (cos 4/5, sin 3/5). An arbitrary angle is captured
   ONCE at input by halfTanForDegrees() — a float→rational quantization no
   different from parse-length quantizing "3.7 mm" onto the lattice — and
   from then on the rotation is held exactly; the tiny capture error is a
   stated fact, not an accumulating one.

   CONVENTIONS. Same lineage as rat.js: BigInt-rational exactness, fails
   loud on programmer error, UMD wrapper, inline tests. Y grows DOWN
   (screen/SVG convention), so the quarter-turn t=1 sends +x to +y.
   Loads after rat.js in the browser; requires it headless.
   ========================================================================= */

(function (root, factory) {
  var mod;
  if (typeof module !== 'undefined' && module.exports) {
    mod = factory(require('./rat.js'));
    module.exports = mod;
  } else {
    if (!root.Rat) throw new Error('plane: rat.js must be loaded before plane.js');
    root.Plane = factory(root.Rat);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (R) {
  'use strict';

  var rat = R.rat, lift = R.lift;

  /* ---- points -------------------------------------------------------------- */

  function pt(x, y) { return Object.freeze({ x: lift(x), y: lift(y) }); }
  function isPt(p) { return !!p && R.isRat(p.x) && R.isRat(p.y); }
  function reqPt(name, p) { if (!isPt(p)) throw new TypeError('plane: ' + name + ' must be a point (use pt())'); return p; }
  function ptEq(a, b) { return R.eq(a.x, b.x) && R.eq(a.y, b.y); }

  /* ---- transforms — x' = a·x + b·y + e ; y' = c·x + d·y + f ---------------- */

  function xf(a, b, c, d, e, f) {
    return Object.freeze({ a: lift(a), b: lift(b), c: lift(c), d: lift(d), e: lift(e), f: lift(f) });
  }

  var IDENTITY = xf(1, 0, 0, 1, 0, 0);

  function translate(tx, ty) { return xf(1, 0, 0, 1, tx, ty); }

  function scale(sx, sy) {
    if (sy === undefined) sy = sx;
    return xf(sx, 0, 0, sy, 0, 0);
  }

  // rotation from the rational half-angle tangent t (see header). Exact.
  function rotHalfTan(t) {
    t = lift(t);
    var t2 = R.mul(t, t);
    var den = R.add(1, t2);
    var cos = R.div(R.sub(1, t2), den);
    var sin = R.div(R.mul(2, t), den);
    return xf(cos, R.neg(sin), sin, cos, 0, 0);   // y-down: t>0 turns +x toward +y
  }

  // k quarter-turns (k any integer) — the everyday CAD rotation, exact-exact.
  function rotQuarter(k) {
    if (!Number.isSafeInteger(k)) throw new TypeError('plane: rotQuarter k must be an integer, got ' + k);
    var q = ((k % 4) + 4) % 4;
    if (q === 0) return IDENTITY;
    if (q === 1) return xf(0, -1, 1, 0, 0, 0);
    if (q === 2) return xf(-1, 0, 0, -1, 0, 0);
    return xf(0, 1, -1, 0, 0, 0);
  }

  function mirrorX() { return xf(-1, 0, 0, 1, 0, 0); }   // across the y axis
  function mirrorY() { return xf(1, 0, 0, -1, 0, 0); }   // across the x axis

  // capture an arbitrary angle as a rational t, ONCE, at input. maxDen bounds
  // the denominator (continued-fraction convergents); 1e6 keeps the capture
  // error below ~3e-5 degrees. Float math is allowed HERE ONLY — this is the
  // input-quantization boundary, like parse-length's parse-time rounding.
  function halfTanForDegrees(deg, maxDen) {
    if (typeof deg !== 'number' || !isFinite(deg)) throw new TypeError('plane: degrees must be a finite number');
    if (maxDen === undefined) maxDen = 1000000;
    if (!Number.isSafeInteger(maxDen) || maxDen < 1) throw new TypeError('plane: maxDen must be a positive integer, got ' + maxDen);
    // normalize to (−180, 180] so tan(θ/2) is finite
    var d = deg % 360; if (d > 180) d -= 360; if (d <= -180) d += 360;
    if (d === 180) d = 180 - 1e-9;                 // avoid the pole; 180° = two quarter-turns, prefer rotQuarter(2)
    var x = Math.tan(d * Math.PI / 360);
    // continued-fraction best rational approximation with denominator ≤ maxDen
    var neg = x < 0; x = Math.abs(x);
    var h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = x;
    for (var i = 0; i < 64; i++) {
      var ai = Math.floor(b);
      var h2 = ai * h1 + h0, k2 = ai * k1 + k0;
      if (k2 > maxDen) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      var fracpart = b - ai;
      if (fracpart < 1e-15) break;
      b = 1 / fracpart;
    }
    if (k1 === 0) return rat(0);
    return rat(neg ? -h1 : h1, k1);
  }

  // rotate about an arbitrary point: T(c) · R · T(−c)
  function about(T, c) {
    reqPt('center', c);
    return mul(translate(c.x, c.y), mul(T, translate(R.neg(c.x), R.neg(c.y))));
  }

  /* ---- algebra --------------------------------------------------------------
     mul(A, B) = A ∘ B — apply B first, then A (matrix product A·B). */

  function mul(A, B) {
    return xf(
      R.add(R.mul(A.a, B.a), R.mul(A.b, B.c)),
      R.add(R.mul(A.a, B.b), R.mul(A.b, B.d)),
      R.add(R.mul(A.c, B.a), R.mul(A.d, B.c)),
      R.add(R.mul(A.c, B.b), R.mul(A.d, B.d)),
      R.add(R.add(R.mul(A.a, B.e), R.mul(A.b, B.f)), A.e),
      R.add(R.add(R.mul(A.c, B.e), R.mul(A.d, B.f)), A.f)
    );
  }

  function det(T) { return R.sub(R.mul(T.a, T.d), R.mul(T.b, T.c)); }

  function invert(T) {
    var D = det(T);
    if (R.isZero(D)) throw new TypeError('plane: transform is singular (det 0)');
    var ia = R.div(T.d, D), ib = R.div(R.neg(T.b), D);
    var ic = R.div(R.neg(T.c), D), id = R.div(T.a, D);
    // e' = −(ia·e + ib·f), f' = −(ic·e + id·f)
    return xf(ia, ib, ic, id,
      R.neg(R.add(R.mul(ia, T.e), R.mul(ib, T.f))),
      R.neg(R.add(R.mul(ic, T.e), R.mul(id, T.f))));
  }

  function apply(T, p) {
    reqPt('point', p);
    return pt(
      R.add(R.add(R.mul(T.a, p.x), R.mul(T.b, p.y)), T.e),
      R.add(R.add(R.mul(T.c, p.x), R.mul(T.d, p.y)), T.f)
    );
  }

  function applyAll(T, pts) { return pts.map(function (p) { return apply(T, p); }); }

  // a transform is rigid (rotation + translation, no scale/shear/mirror) iff
  // BOTH columns are unit length and det = 1: for unit columns |det| equals
  // the sine of the angle between them, so det = 1 forces orthonormality.
  // (One unit column alone admits shears — xf(1,1,0,1) has det 1.) Exact FACT.
  function isRigid(T) {
    return R.eq(det(T), 1)
      && R.eq(R.add(R.mul(T.a, T.a), R.mul(T.c, T.c)), 1)
      && R.eq(R.add(R.mul(T.b, T.b), R.mul(T.d, T.d)), 1);
  }

  /* ---- display-only ---------------------------------------------------------- */
  function ptToNumbers(p) { return { x: R.toNumber(p.x), y: R.toNumber(p.y) }; }

  return {
    pt: pt, isPt: isPt, ptEq: ptEq,
    xf: xf, IDENTITY: IDENTITY,
    translate: translate, scale: scale, rotHalfTan: rotHalfTan, rotQuarter: rotQuarter,
    mirrorX: mirrorX, mirrorY: mirrorY, halfTanForDegrees: halfTanForDegrees, about: about,
    mul: mul, det: det, invert: invert, apply: apply, applyAll: applyAll,
    isRigid: isRigid, ptToNumbers: ptToNumbers
  };
});

/* headless entry: `node plane.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var P = module.exports;
  var R = require('./rat.js');
  var rat = R.rat, pt = P.pt;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function eqp(label, got, want) {
    if (P.ptEq(got, want)) pass++;
    else { fail++; console.log('FAIL ' + label + ': got (' + R.toString(got.x) + ', ' + R.toString(got.y) + ') want (' + R.toString(want.x) + ', ' + R.toString(want.y) + ')'); }
  }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }

  /* --- quarter turns are exact-exact --------------------------------------- */
  eqp('t=1 is exactly 90°', P.apply(P.rotHalfTan(1), pt(1, 0)), pt(0, 1));
  eqp('rotQuarter(1) matches', P.apply(P.rotQuarter(1), pt(1, 0)), pt(0, 1));
  eqp('rotQuarter(2) is the half turn', P.apply(P.rotQuarter(2), pt(3, 4)), pt(-3, -4));
  eqp('rotQuarter(-1) = rotQuarter(3)', P.apply(P.rotQuarter(-1), pt(1, 0)), P.apply(P.rotQuarter(3), pt(1, 0)));

  /* --- the 3-4-5 rotation: t = 1/3 → cos 4/5, sin 3/5 ----------------------- */
  var T345 = P.rotHalfTan(rat(1, 3));
  eqp('3-4-5: (5,0) → (4,3) exactly', P.apply(T345, pt(5, 0)), pt(4, 3));
  ok('rotation is rigid (det 1, unit columns) — exact fact', P.isRigid(T345));

  /* --- closure: compose, invert, round-trip exactly -------------------------- */
  var Tmix = P.mul(P.translate(rat(24384), rat(-960)), P.mul(T345, P.scale(rat(3, 2))));
  var p0 = pt(rat(123456789), rat(-987654321, 7));
  var back = P.apply(P.invert(Tmix), P.apply(Tmix, p0));
  eqp('invert ∘ apply is the exact identity', back, p0);
  ok('det(A·B) = det A · det B', R.eq(P.det(Tmix), R.mul(R.mul(P.det(T345), rat(9, 4)), rat(1))));

  // a hundred composed steps forward, one exact inverse back
  var walk = P.IDENTITY;
  for (var i = 0; i < 100; i++) walk = P.mul(P.mul(T345, P.translate(rat(1, 3), rat(5, 7))), walk);
  eqp('100 steps there, exactly back', P.apply(P.invert(walk), P.apply(walk, p0)), p0);

  /* --- mirrors ----------------------------------------------------------------- */
  eqp('mirrorX twice is identity', P.apply(P.mul(P.mirrorX(), P.mirrorX()), p0), p0);
  ok('mirror is not rigid (det −1)', !P.isRigid(P.mirrorX()));

  /* --- rotation about a center ------------------------------------------------- */
  var c = pt(10, 10);
  eqp('quarter about c fixes c', P.apply(P.about(P.rotQuarter(1), c), c), c);
  eqp('quarter about c moves (11,10) → (10,11)', P.apply(P.about(P.rotQuarter(1), c), pt(11, 10)), pt(10, 11));

  /* --- angle capture: quantized once, exact after -------------------------------- */
  var t30 = P.halfTanForDegrees(30);
  var T30 = P.rotHalfTan(t30);
  ok('captured 30° is rigid (exact rotation)', P.isRigid(T30));
  // twelve captured-30° steps compose to an EXACT rotation; its angle is
  // 12× the captured angle — near 360° within capture error, and exact forever
  var T360 = P.IDENTITY;
  for (var j = 0; j < 12; j++) T360 = P.mul(T30, T360);
  ok('12 × 30° stays rigid — no drift, only the one capture error', P.isRigid(T360));
  var moved = P.apply(T360, pt(rat(1000000), rat(0)));
  var errX = Math.abs(R.toNumber(moved.x) - 1000000);
  ok('12 × 30° lands within capture error of start (err ' + errX.toFixed(6) + ' units)', errX < 1);

  /* --- rigidity rejects shear (review fix) ----------------------------------- */
  ok('shear is not rigid despite det 1', !P.isRigid(P.xf(1, 1, 0, 1, 0, 0)));
  ok('anisotropic scale is not rigid', !P.isRigid(P.scale(rat(1), rat(-1))));

  /* --- fail loud ------------------------------------------------------------------ */
  threw('singular invert throws', function () { P.invert(P.scale(0)); });
  threw('bad maxDen throws', function () { P.halfTanForDegrees(45, 0.5); });
  threw('bad point throws', function () { P.apply(P.IDENTITY, { x: 1, y: 2 }); });
  threw('non-integer quarter throws', function () { P.rotQuarter(1.5); });

  console.log('=== plane: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
