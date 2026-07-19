/* geom2.js — exact predicates and exact constructions
   =========================================================================
   PURE MODULE. Third stone of the CAD basis, on rat.js + plane.js: the
   geometric questions a CAD asks constantly — which side, do they cross,
   where exactly — answered as FACTS, not tolerances. This is the layer
   where float CAD accumulates its classic failures (T-junction gaps,
   hatch leaks, hit-tests that flip near edges); with rational coordinates
   every predicate returns a true sign and every intersection is an exact
   point that really lies on both segments — substitute it back and the
   orientation is 0, not 1e-13.

   WHAT LIVES HERE
     orient(p,q,r)      sign of the turn p→q→r  (−1 cw · 0 collinear · +1 ccw
                        in y-down screen coordinates)
     onSegment(p,a,b)   is p exactly on [a,b]?
     segseg(a,b,c,d)    full classification: point (exact) / none /
                        parallel / collinear (with the exact overlap)
     polyArea2(pts)     signed 2×area, exact rational
     pointInPoly(p,ps)  in / out / edge — edge is exact, not fuzzy
     bboxLattice(pts,…) an exact rational bbox converted LATE to the integer
                        lattice: mins floored, maxs ceiled, remainders kept

   Same lineage conventions as rat.js / plane.js: BigInt-rational exactness,
   fails loud on programmer error, flags domain states (degenerate segments)
   with stable reason codes, UMD wrapper, inline tests.
   ========================================================================= */

(function (root, factory) {
  var mod;
  if (typeof module !== 'undefined' && module.exports) {
    mod = factory(require('./rat.js'), require('./plane.js'));
    module.exports = mod;
  } else {
    if (!root.Rat || !root.Plane) throw new Error('geom2: rat.js and plane.js must be loaded before geom2.js');
    root.Geom2 = factory(root.Rat, root.Plane);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (R, P) {
  'use strict';

  var pt = P.pt;

  function reqPt(name, p) { if (!P.isPt(p)) throw new TypeError('geom2: ' + name + ' must be a point (use pt())'); return p; }

  /* ---- the predicate everything stands on ---------------------------------- */

  // sign of (q−p) × (r−p). In y-down screen coordinates +1 is a clockwise
  // visual turn; what matters is that it is EXACT and consistent.
  function orient(p, q, r) {
    reqPt('p', p); reqPt('q', q); reqPt('r', r);
    var v = R.sub(
      R.mul(R.sub(q.x, p.x), R.sub(r.y, p.y)),
      R.mul(R.sub(q.y, p.y), R.sub(r.x, p.x))
    );
    return R.sign(v);
  }

  function between1(v, a, b) {   // is scalar v within [min(a,b), max(a,b)]?
    return R.cmp(v, R.min(a, b)) >= 0 && R.cmp(v, R.max(a, b)) <= 0;
  }

  function onSegment(p, a, b) {
    reqPt('p', p); reqPt('a', a); reqPt('b', b);
    return orient(a, b, p) === 0 && between1(p.x, a.x, b.x) && between1(p.y, a.y, b.y);
  }

  /* ---- segment × segment ------------------------------------------------------
     Returns { kind, … } with stable kinds:
       'point'     proper or touching intersection — { at, t, u } where at is
                   the EXACT point, t∈[0,1] along ab, u along cd
       'none'      no contact
       'parallel'  parallel, not collinear
       'collinear' same line — { overlap: [p,q] | null } (null = disjoint)
     Degenerate (zero-length) segments are a FLAG, not a throw:
       { kind: 'degenerate', reason: 'zero-length-segment' }                  */

  function segseg(a, b, c, d) {
    reqPt('a', a); reqPt('b', b); reqPt('c', c); reqPt('d', d);
    var abx = R.sub(b.x, a.x), aby = R.sub(b.y, a.y);
    var cdx = R.sub(d.x, c.x), cdy = R.sub(d.y, c.y);
    if (R.isZero(abx) && R.isZero(aby)) return { kind: 'degenerate', reason: 'zero-length-segment' };
    if (R.isZero(cdx) && R.isZero(cdy)) return { kind: 'degenerate', reason: 'zero-length-segment' };

    var den = R.sub(R.mul(abx, cdy), R.mul(aby, cdx));   // cross(ab, cd)
    var acx = R.sub(c.x, a.x), acy = R.sub(c.y, a.y);

    if (R.isZero(den)) {
      // parallel; collinear iff ac is also parallel to ab
      if (!R.isZero(R.sub(R.mul(abx, acy), R.mul(aby, acx)))) return { kind: 'parallel' };
      // collinear: project onto the dominant axis of ab and intersect ranges
      var useX = !R.isZero(abx);
      var pa = useX ? a.x : a.y, pb = useX ? b.x : b.y;
      var pc = useX ? c.x : c.y, pd = useX ? d.x : d.y;
      var lo1 = R.min(pa, pb), hi1 = R.max(pa, pb);
      var lo2 = R.min(pc, pd), hi2 = R.max(pc, pd);
      var lo = R.max(lo1, lo2), hi = R.min(hi1, hi2);
      if (R.cmp(lo, hi) > 0) return { kind: 'collinear', overlap: null };
      // rebuild the overlap endpoints from the scalar range (exact)
      function at(v) {
        var t = R.div(R.sub(v, pa), R.sub(pb, pa));
        return pt(R.add(a.x, R.mul(t, abx)), R.add(a.y, R.mul(t, aby)));
      }
      return { kind: 'collinear', overlap: [at(lo), at(hi)] };
    }

    // t along ab, u along cd — exact rationals
    var t = R.div(R.sub(R.mul(acx, cdy), R.mul(acy, cdx)), den);
    var u = R.div(R.sub(R.mul(acx, aby), R.mul(acy, abx)), den);
    var Z = R.rat(0), O = R.rat(1);
    if (R.cmp(t, Z) < 0 || R.cmp(t, O) > 0 || R.cmp(u, Z) < 0 || R.cmp(u, O) > 0) return { kind: 'none' };
    var at = pt(R.add(a.x, R.mul(t, abx)), R.add(a.y, R.mul(t, aby)));
    return { kind: 'point', at: at, t: t, u: u };
  }

  /* ---- polygons ------------------------------------------------------------- */

  function reqPoly(pts) {
    if (!Array.isArray(pts) || pts.length < 3) throw new TypeError('geom2: polygon needs ≥ 3 points');
    pts.forEach(function (p, i) { reqPt('polygon[' + i + ']', p); });
    return pts;
  }

  // signed 2×area (shoelace), exact. Positive = clockwise on screen (y-down).
  function polyArea2(pts) {
    reqPoly(pts);
    var s = R.rat(0);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      s = R.add(s, R.sub(R.mul(p.x, q.y), R.mul(q.x, p.y)));
    }
    return s;
  }

  // exact even-odd point-in-polygon; 'edge' is exact membership, not a fuzz band
  function pointInPoly(p, pts) {
    reqPt('p', p); reqPoly(pts);
    var n = pts.length, inside = false;
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      if (onSegment(p, a, b)) return 'edge';
      // does the edge straddle the horizontal ray? (half-open to dodge vertices)
      var aAbove = R.cmp(a.y, p.y) > 0, bAbove = R.cmp(b.y, p.y) > 0;
      if (aAbove !== bAbove) {
        // x of the edge at height p.y, exact: a.x + (p.y−a.y)·(b.x−a.x)/(b.y−a.y)
        var xAt = R.add(a.x, R.div(R.mul(R.sub(p.y, a.y), R.sub(b.x, a.x)), R.sub(b.y, a.y)));
        if (R.cmp(xAt, p.x) > 0) inside = !inside;
      }
    }
    return inside ? 'in' : 'out';
  }

  /* ---- late conversion of a region ---------------------------------------------
     The rational bbox is exact; the LATTICE bbox rounds outward (mins floor,
     maxs ceil) so the region is never clipped, and each side reports its
     remainder — the engine's residual contract, applied to geometry. */

  function bboxLattice(pts, gridCount) {
    reqPoly(pts);
    var minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y;
    for (var i = 1; i < pts.length; i++) {
      minX = R.min(minX, pts[i].x); maxX = R.max(maxX, pts[i].x);
      minY = R.min(minY, pts[i].y); maxY = R.max(maxY, pts[i].y);
    }
    var g = gridCount || 1;
    return {
      exact: { minX: minX, maxX: maxX, minY: minY, maxY: maxY },
      minX: R.toLattice(minX, g, 'floor'), maxX: R.toLattice(maxX, g, 'ceil'),
      minY: R.toLattice(minY, g, 'floor'), maxY: R.toLattice(maxY, g, 'ceil')
    };
  }

  return {
    orient: orient, onSegment: onSegment, segseg: segseg,
    polyArea2: polyArea2, pointInPoly: pointInPoly, bboxLattice: bboxLattice
  };
});

/* headless entry: `node geom2.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var G = module.exports;
  var R = require('./rat.js'), P = require('./plane.js');
  var rat = R.rat, pt = P.pt;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }

  /* --- orientation is a sign, exactly -------------------------------------- */
  ok('ccw/cw signs oppose', G.orient(pt(0, 0), pt(10, 0), pt(5, 5)) === -G.orient(pt(0, 0), pt(10, 0), pt(5, -5)));
  ok('collinear is exactly 0', G.orient(pt(0, 0), pt(7, 3), pt(rat(7, 2), rat(3, 2))) === 0);
  // the float-killer: a point 1/3 of the way along a skew segment IS collinear
  var a = pt(0, 0), b = pt(3, 1);
  var third = pt(rat(1), rat(1, 3));
  ok('exact thirds are collinear (floats would miss)', G.orient(a, b, third) === 0 && G.onSegment(third, a, b));

  /* --- segseg: the T-junction closes --------------------------------------- */
  var X = G.segseg(pt(0, 0), pt(10, 10), pt(0, 10), pt(10, 0));
  ok('proper crossing found', X.kind === 'point');
  ok('crossing at (5,5) exactly', P.ptEq(X.at, pt(5, 5)));
  // an awkward crossing: the intersection is rational, and substituting it
  // back onto BOTH segments gives orientation exactly 0 — watertight
  var Y = G.segseg(pt(0, 0), pt(7, 3), pt(1, 5), pt(4, -2));
  ok('awkward crossing found', Y.kind === 'point');
  ok('lies exactly on ab', G.onSegment(Y.at, pt(0, 0), pt(7, 3)));
  ok('lies exactly on cd', G.onSegment(Y.at, pt(1, 5), pt(4, -2)));

  ok('touch at an endpoint is a point hit', G.segseg(pt(0, 0), pt(4, 0), pt(4, 0), pt(4, 9)).kind === 'point');
  ok('near miss is none (t just past 1)', G.segseg(pt(0, 0), pt(4, 0), pt(rat(9, 2), -1), pt(rat(9, 2), 1)).kind === 'none');
  ok('parallel flagged', G.segseg(pt(0, 0), pt(4, 0), pt(0, 1), pt(4, 1)).kind === 'parallel');
  var C = G.segseg(pt(0, 0), pt(10, 0), pt(4, 0), pt(14, 0));
  ok('collinear overlap [4,10]', C.kind === 'collinear' && P.ptEq(C.overlap[0], pt(4, 0)) && P.ptEq(C.overlap[1], pt(10, 0)));
  ok('collinear disjoint is null overlap', G.segseg(pt(0, 0), pt(2, 0), pt(5, 0), pt(9, 0)).overlap === null);
  ok('vertical collinear works (x-degenerate axis)', G.segseg(pt(3, 0), pt(3, 10), pt(3, 5), pt(3, 20)).kind === 'collinear');
  ok('degenerate flagged, not thrown', G.segseg(pt(1, 1), pt(1, 1), pt(0, 0), pt(2, 2)).kind === 'degenerate');

  /* --- polygon area + membership ------------------------------------------- */
  var sq = [pt(0, 0), pt(10, 0), pt(10, 10), pt(0, 10)];
  ok('square 2A = 200 (cw on screen)', R.eq(G.polyArea2(sq), rat(200)));
  ok('reversed sign flips', R.eq(G.polyArea2(sq.slice().reverse()), rat(-200)));
  ok('centroid in', G.pointInPoly(pt(5, 5), sq) === 'in');
  ok('outside out', G.pointInPoly(pt(15, 5), sq) === 'out');
  ok('edge is edge, exactly', G.pointInPoly(pt(10, rat(7, 3)), sq) === 'edge');
  ok('vertex is edge', G.pointInPoly(pt(0, 0), sq) === 'edge');
  // rotate the square by the exact 3-4-5 rotation: area is EXACTLY preserved
  var rot = P.applyAll(P.rotHalfTan(rat(1, 3)), sq);
  ok('area exact under exact rotation', R.eq(G.polyArea2(rot), rat(200)));

  /* --- late-converted bbox: outward, remainders kept -------------------------- */
  var tri = [pt(rat(1, 3), rat(1, 3)), pt(rat(29, 3), 2), pt(5, rat(26, 3))];
  var bb = G.bboxLattice(tri, 1);
  ok('bbox floors the min', bb.minX.units === 0 && R.eq(bb.minX.rem, rat(1, 3)));
  ok('bbox ceils the max', bb.maxX.units === 10 && R.eq(bb.maxX.rem, rat(29 - 30, 3)));
  ok('lattice bbox contains the exact bbox', bb.minY.units <= 1 && bb.maxY.units >= 9);

  /* --- fail loud --------------------------------------------------------------- */
  threw('two-point polygon throws', function () { G.polyArea2([pt(0, 0), pt(1, 1)]); });
  threw('bad point throws', function () { G.orient({ x: 1, y: 2 }, pt(0, 0), pt(1, 1)); });

  console.log('=== geom2: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
