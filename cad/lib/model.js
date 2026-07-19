/* model.js — parametric nodes: the drafting operations as live objects
   =========================================================================
   PURE MODULE. Fourth stone of the CAD basis, on rat/plane/geom2. Desktop
   CAD buries its strongest operations — arrays, hatches, blocks — behind
   modal dialogs (menus on menus) and then FORGETS the parameters the moment
   OK is clicked. Here each operation is a NODE: a small parametric object
   that holds its inputs, evaluates to exact geometry on demand, and exposes
   its residual, exactly the way partition.js turns "tile a run" into a
   Layout you can keep interrogating. Re-evaluate with a new parameter and
   the geometry follows; nothing is baked.

   THE NODE SET (first draft)
     line / rect / polygon   primitives (fields may be {param:'name'} refs)
     insert                  the POWERCOPY: a template with DECLARED inputs
                             (params it requires), instantiated with args and
                             a placement — CATIA's powercopy / AutoCAD's
                             block-with-attributes, as one object
     array                   count × child along an exact step, with per-
                             instance parameter TWEENS: any template input
                             can grade from → to across the array, exactly
                             (instance i gets from + (to−from)·i/(n−1))
     fitArray                the tile module's understanding, generalized to
                             rationals: give a RUN instead of a count; the
                             node solves count = floor((run+gap)/(item+gap))
                             and exposes the exact residual — partition.js
                             semantics with the same 'item-exceeds-run' code
     hatch                   a line family clipped to a polygon, computed
                             exactly: every endpoint lies EXACTLY on the
                             boundary (geom2 proves it), so hatches are
                             watertight by construction, and the partial
                             edge bands are reported as residuals

   EVALUATION CONTRACT
     evalNode(node, env?) → { feasible: true, segments: [{a, b, role}],
                              residuals: [{code, value(Rat), note}], … }
                          | { feasible: false, reason, note }   (flagged)
   Fails loud on programmer error (unknown kind, malformed node, an insert
   whose args don't match the template's declared params); flags infeasible
   DOMAIN states with stable reason codes, like partition.js.
   ========================================================================= */

(function (root, factory) {
  var mod;
  if (typeof module !== 'undefined' && module.exports) {
    mod = factory(require('./rat.js'), require('./plane.js'), require('./geom2.js'));
    module.exports = mod;
  } else {
    if (!root.Rat || !root.Plane || !root.Geom2) throw new Error('model: rat.js, plane.js, geom2.js must be loaded before model.js');
    root.Model = factory(root.Rat, root.Plane, root.Geom2);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (R, P, G) {
  'use strict';

  var rat = R.rat, pt = P.pt;

  /* ---- parameter references ------------------------------------------------
     Any scalar field of a node inside a template may be {param:'name'}; the
     insert node binds names to values. A dangling reference at evaluation is
     a programmer error (the template DECLARED its inputs) — fail loud. */

  function resolveScalar(v, env) {
    if (v && typeof v === 'object' && typeof v.param === 'string') {
      if (!env || !(v.param in env)) throw new TypeError('model: unbound parameter "' + v.param + '"');
      return R.lift(env[v.param]);
    }
    return R.lift(v);
  }
  function resolvePt(p, env) {
    if (!p || p.x === undefined || p.y === undefined) throw new TypeError('model: point must have x and y');
    return pt(resolveScalar(p.x, env), resolveScalar(p.y, env));
  }

  function seg(a, b, role) { return { a: a, b: b, role: role || 'line' }; }
  function infeasible(reason, note) { return { feasible: false, reason: reason, note: note, segments: [], residuals: [] }; }
  function result(segments, residuals, extra) {
    var out = { feasible: true, segments: segments, residuals: residuals || [] };
    if (extra) for (var k in extra) out[k] = extra[k];
    return out;
  }

  /* ---- placement: at + quarter-turns or a rational rotation ------------------ */

  function placement(node, env) {
    var T = P.IDENTITY;
    if (node.t !== undefined) T = P.rotHalfTan(resolveScalar(node.t, env));
    else if (node.turns) T = P.rotQuarter(node.turns);
    if (node.at) T = P.mul(P.translate(resolveScalar(node.at.x, env), resolveScalar(node.at.y, env)), T);
    return T;
  }
  function mapSegs(T, segs) {
    return segs.map(function (s) { return seg(P.apply(T, s.a), P.apply(T, s.b), s.role); });
  }

  /* ---- primitives -------------------------------------------------------------- */

  function evalLine(node, env) {
    return result([seg(resolvePt(node.a, env), resolvePt(node.b, env), node.role)]);
  }

  function evalRect(node, env) {
    var w = resolveScalar(node.w, env), h = resolveScalar(node.h, env);
    if (R.sign(w) <= 0 || R.sign(h) <= 0) return infeasible('empty-extent', 'a rectangle needs positive width and height');
    var p0 = pt(0, 0), p1 = pt(w, rat(0)), p2 = pt(w, h), p3 = pt(rat(0), h);
    var segs = [seg(p0, p1, node.role), seg(p1, p2, node.role), seg(p2, p3, node.role), seg(p3, p0, node.role)];
    return result(mapSegs(placement(node, env), segs));
  }

  function evalPolygon(node, env) {
    if (!Array.isArray(node.pts) || node.pts.length < 3) throw new TypeError('model: polygon needs ≥ 3 points');
    var ps = node.pts.map(function (p) { return resolvePt(p, env); });
    var segs = [];
    for (var i = 0; i < ps.length; i++) segs.push(seg(ps[i], ps[(i + 1) % ps.length], node.role));
    return result(mapSegs(placement(node, env), segs));
  }

  /* ---- insert — the powercopy ----------------------------------------------------
     template: { params: ['w', …], nodes: [ node specs using {param:…} ] }
     insert:   { kind:'insert', template, args: {w: …}, at?, turns?/t? }
     The contract is CATIA's: the template DECLARES its inputs; instantiation
     must supply exactly those. Wrong args are a programmer error.            */

  function evalInsert(node, env) {
    var tpl = node.template;
    if (!tpl || !Array.isArray(tpl.params) || !Array.isArray(tpl.nodes)) {
      throw new TypeError('model: insert.template needs { params: [...], nodes: [...] }');
    }
    var args = node.args || {};
    var bound = {};
    tpl.params.forEach(function (name) {
      if (!(name in args)) throw new TypeError('model: insert missing declared input "' + name + '"');
      bound[name] = resolveScalar(args[name], env);   // args may themselves be {param} refs (nested templates)
    });
    for (var k in args) if (tpl.params.indexOf(k) < 0) throw new TypeError('model: insert arg "' + k + '" is not a declared input');

    var T = placement(node, env);
    var segs = [], residuals = [];
    for (var i = 0; i < tpl.nodes.length; i++) {
      var r = evalNode(tpl.nodes[i], bound);
      if (!r.feasible) return r;                       // an infeasible child flags the whole insert
      segs = segs.concat(mapSegs(T, r.segments));
      residuals = residuals.concat(r.residuals);
    }
    return result(segs, residuals);
  }

  /* ---- array — count × child, exact step, exact tweens ----------------------------
     { kind:'array', of: <node>, count, step: {x,y}, tween?: { argName: {from,to} } }
     Tweens grade the child's insert-args across the array: instance i gets
     from + (to−from)·i/(count−1), an EXACT rational — a linear powercopy
     tween, the thing dialog-CAD can't express at all.                        */

  function tweenEnv(tween, i, count, env) {
    var e = {};
    if (env) for (var k in env) e[k] = env[k];
    if (tween) {
      for (var name in tween) {
        var t = tween[name];
        var from = resolveScalar(t.from, env), to = resolveScalar(t.to, env);
        e[name] = count === 1 ? from
          : R.add(from, R.div(R.mul(R.sub(to, from), rat(i)), rat(count - 1)));
      }
    }
    return e;
  }

  function evalArray(node, env) {
    if (!node.of) throw new TypeError('model: array needs a child node in .of');
    var count = node.count;
    if (!Number.isSafeInteger(count) || count < 1) return infeasible('empty-array', 'count must be at least 1');
    var sx = resolveScalar(node.step ? node.step.x : 0, env), sy = resolveScalar(node.step ? node.step.y : 0, env);
    var T = placement(node, env);
    var segs = [], residuals = [];
    for (var i = 0; i < count; i++) {
      var e = tweenEnv(node.tween, i, count, env);
      var r = evalNode(node.of, e);
      if (!r.feasible) return r;
      var Ti = P.mul(T, P.translate(R.mul(sx, rat(i)), R.mul(sy, rat(i))));
      segs = segs.concat(mapSegs(Ti, r.segments));
      residuals = residuals.concat(r.residuals);
    }
    return result(segs, residuals, { count: count });
  }

  /* ---- fitArray — a run instead of a count: the tile module as a node --------------
     { kind:'fitArray', of, run, item, gap?, tween?, at?, turns?/t? }
     count = floor((run + gap)/(item + gap)); instances step by item+gap
     along local +x; the residual is the exact end cut. Same identity and
     the same 'item-exceeds-run' reason code as partition.tiles — proven
     equal in the inline tests.                                              */

  function evalFitArray(node, env) {
    if (!node.of) throw new TypeError('model: fitArray needs a child node in .of');
    var run = resolveScalar(node.run, env);
    var item = resolveScalar(node.item, env);
    var gap = resolveScalar(node.gap === undefined ? 0 : node.gap, env);
    if (R.sign(run) <= 0 || R.sign(item) <= 0 || R.sign(gap) < 0) {
      throw new TypeError('model: fitArray needs run > 0, item > 0, gap ≥ 0');
    }
    var module_ = R.add(item, gap);
    var q = R.div(R.add(run, gap), module_);
    var countL = R.toLattice(q, 1, 'floor');
    if (!countL.safe) return infeasible('count-overflow', 'the count exceeds the safe integer range');
    var count = countL.units;
    if (count < 1) return infeasible('item-exceeds-run', 'a single item plus gap exceeds the run');
    var used = R.add(R.mul(rat(count), item), R.mul(rat(count - 1), gap));
    var residual = R.sub(run, used);

    var T = placement(node, env);
    var segs = [];
    for (var i = 0; i < count; i++) {
      var e = tweenEnv(node.tween, i, count, env);
      var r = evalNode(node.of, e);
      if (!r.feasible) return r;
      segs = segs.concat(mapSegs(P.mul(T, P.translate(R.mul(module_, rat(i)), rat(0))), r.segments));
    }
    return result(segs,
      [{ code: 'end-cut', value: residual, note: 'the part of the run the whole items do not fill' }],
      { count: count, item: item, gap: gap, used: used, residual: residual, exact: R.isZero(residual) });
  }

  /* ---- hatch — a line family clipped to a polygon, exactly --------------------------
     { kind:'hatch', poly: [pts], spacing, t?: half-tan of the hatch angle,
       role? }
     Lines run along the rotated x-axis, anchored to the GLOBAL pattern
     origin (y' = k·spacing), so adjacent regions hatch in phase — CAD
     pattern-origin behavior. Crossings pair even-odd; the half-open rule
     makes vertices unambiguous; a line grazing the boundary contributes no
     area band and is skipped. Residuals report the partial band at each
     edge of the region — the hatch's "end cut".                              */

  function evalHatch(node, env) {
    if (!Array.isArray(node.poly) || node.poly.length < 3) throw new TypeError('model: hatch needs a polygon of ≥ 3 points');
    var S = resolveScalar(node.spacing, env);
    if (R.sign(S) <= 0) throw new TypeError('model: hatch spacing must be positive');
    var t = node.t === undefined ? rat(0) : resolveScalar(node.t, env);
    var rot = P.rotHalfTan(t);                       // hatch frame → world
    var unrot = P.invert(rot);                       // world → hatch frame

    var ps = node.poly.map(function (p) { return P.apply(unrot, resolvePt(p, env)); });
    var minY = ps[0].y, maxY = ps[0].y;
    for (var i = 1; i < ps.length; i++) { minY = R.min(minY, ps[i].y); maxY = R.max(maxY, ps[i].y); }
    if (R.eq(minY, maxY)) return infeasible('empty-extent', 'the region has no height across the hatch direction');

    var kLo = R.toLattice(R.div(minY, S), 1, 'ceil');
    var kHi = R.toLattice(R.div(maxY, S), 1, 'floor');
    if (!kLo.safe || !kHi.safe) return infeasible('count-overflow', 'the line count exceeds the safe integer range');

    var segs = [], lines = 0, firstY = null, lastY = null;
    for (var k = kLo.units; k <= kHi.units; k++) {
      var y = R.mul(rat(k), S);
      // crossings of the horizontal line at y with the polygon, half-open
      var xs = [];
      for (var e = 0; e < ps.length; e++) {
        var a = ps[e], b = ps[(e + 1) % ps.length];
        var hit = (R.cmp(a.y, y) <= 0 && R.cmp(b.y, y) > 0) || (R.cmp(b.y, y) <= 0 && R.cmp(a.y, y) > 0);
        if (!hit) continue;
        xs.push(R.add(a.x, R.div(R.mul(R.sub(y, a.y), R.sub(b.x, a.x)), R.sub(b.y, a.y))));
      }
      if (xs.length < 2) continue;                   // grazing line — no band
      xs.sort(R.cmp);
      var drew = false;
      for (var j = 0; j + 1 < xs.length; j += 2) {
        if (R.eq(xs[j], xs[j + 1])) continue;        // pinch point — zero-length
        segs.push(seg(P.apply(rot, pt(xs[j], y)), P.apply(rot, pt(xs[j + 1], y)), node.role || 'hatch'));
        drew = true;
      }
      if (drew) { lines++; if (firstY === null) firstY = y; lastY = y; }
    }

    var residuals = [];
    if (firstY !== null) {
      residuals.push({ code: 'edge-band', value: R.sub(firstY, minY), note: 'partial band before the first line' });
      residuals.push({ code: 'edge-band', value: R.sub(maxY, lastY), note: 'partial band after the last line' });
    }
    return result(segs, residuals, { lines: lines, spacing: S });
  }

  /* ---- dispatcher ---------------------------------------------------------------- */

  function evalNode(node, env) {
    if (!node || typeof node !== 'object') throw new TypeError('model: node must be an object');
    switch (node.kind) {
      case 'line':     return evalLine(node, env);
      case 'rect':     return evalRect(node, env);
      case 'polygon':  return evalPolygon(node, env);
      case 'insert':   return evalInsert(node, env);
      case 'array':    return evalArray(node, env);
      case 'fitArray': return evalFitArray(node, env);
      case 'hatch':    return evalHatch(node, env);
      default: throw new TypeError('model: unknown node kind "' + node.kind + '"');
    }
  }

  function evalNodes(nodes, env) {
    if (!Array.isArray(nodes)) throw new TypeError('model: evalNodes takes an array');
    var segs = [], residuals = [], flags = [];
    nodes.forEach(function (n) {
      var r = evalNode(n, env);
      if (!r.feasible) { flags.push(r); return; }
      segs = segs.concat(r.segments);
      residuals = residuals.concat(r.residuals);
    });
    return { segments: segs, residuals: residuals, flags: flags };
  }

  return { evalNode: evalNode, evalNodes: evalNodes };
});

/* headless entry: `node model.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var M = module.exports;
  var R = require('./rat.js'), P = require('./plane.js'), G = require('./geom2.js');
  var rat = R.rat, pt = P.pt;
  var IN = 24384;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }

  /* --- primitives ------------------------------------------------------------- */
  var rect = M.evalNode({ kind: 'rect', w: rat(10 * IN), h: rat(5 * IN) });
  ok('rect closes: 4 segments', rect.segments.length === 4);
  ok('rect corner exact', P.ptEq(rect.segments[1].a, pt(10 * IN, 0)));

  /* --- insert: the powercopy declares and checks its inputs --------------------- */
  var CHAIR = { params: ['w', 'd'], nodes: [{ kind: 'rect', w: { param: 'w' }, h: { param: 'd' } }] };
  var ins = M.evalNode({ kind: 'insert', template: CHAIR, args: { w: rat(18 * IN), d: rat(20 * IN) }, at: { x: rat(5 * IN), y: rat(0) } });
  ok('insert places the template', P.ptEq(ins.segments[0].a, pt(5 * IN, 0)));
  threw('missing declared input throws', function () { M.evalNode({ kind: 'insert', template: CHAIR, args: { w: rat(18 * IN) } }); });
  threw('undeclared arg throws', function () { M.evalNode({ kind: 'insert', template: CHAIR, args: { w: rat(1), d: rat(1), x: rat(1) } }); });

  /* --- array with an exact tween ------------------------------------------------- */
  var arr = M.evalNode({
    kind: 'array', count: 4, step: { x: rat(4 * IN), y: rat(0) },
    of: { kind: 'insert', template: CHAIR, args: { w: { param: 'w' }, d: rat(IN) } },
    tween: { w: { from: rat(IN), to: rat(3 * IN) } }
  });
  ok('array yields 4×4 segments', arr.segments.length === 16);
  // widths grade exactly 1", 1 2/3", 2 1/3", 3": bottom edge of instance i runs from i·step to i·step + w_i
  function widthOf(i) { var s = arr.segments[i * 4]; return R.sub(s.b.x, s.a.x); }
  ok('tween start exact (1")', R.eq(widthOf(0), rat(IN)));
  ok('tween middle exact (1 2/3")', R.eq(widthOf(1), R.div(rat(5 * IN), 3)));
  ok('tween end exact (3")', R.eq(widthOf(3), rat(3 * IN)));

  /* --- fitArray reproduces the tile module exactly --------------------------------- */
  var TILE = { params: [], nodes: [{ kind: 'rect', w: rat(12 * IN), h: rat(12 * IN) }] };
  var fit = M.evalNode({
    kind: 'fitArray', run: rat(120 * IN), item: rat(12 * IN), gap: rat(IN / 4),
    of: { kind: 'insert', template: TILE, args: {} }
  });
  ok('fitArray count 9 (the partition.js example)', fit.count === 9);
  ok('fitArray residual exactly 10"', R.eq(fit.residual, rat(10 * IN)));
  var Part = null;
  try { Part = require('../../calculators/lib/partition.js'); } catch (e) { console.log('SKIP partition parity (lib not found)'); }
  if (Part) {
    var L = Part.tiles(120 * IN, 12 * IN, IN / 4);
    ok('partition.js parity: count', L.count === fit.count);
    ok('partition.js parity: residual', R.eq(fit.residual, rat(L.residual)));
    ok('partition.js parity: reason code', M.evalNode({
      kind: 'fitArray', run: rat(IN), item: rat(2 * IN),
      of: { kind: 'insert', template: TILE, args: {} }
    }).reason === Part.tiles(IN, 2 * IN, 0).reason);
  }
  // run identity, in exact arithmetic: count·item + (count−1)·gap + residual = run
  var used = R.add(R.mul(rat(fit.count), fit.item), R.mul(rat(fit.count - 1), fit.gap));
  ok('run identity holds exactly', R.eq(R.add(used, fit.residual), rat(120 * IN)));

  /* --- hatch: bands, phase, and watertightness -------------------------------------- */
  // a 10×10 square lifted 1/2" off the pattern origin: 10 lines, two 1/2" bands
  var off = IN / 2;
  var sq = [pt(0, off), pt(10 * IN, off), pt(10 * IN, off + 10 * IN), pt(0, off + 10 * IN)];
  var h1 = M.evalNode({ kind: 'hatch', poly: sq, spacing: rat(IN) });
  ok('hatch line count', h1.lines === 10);
  ok('edge bands are the two half-inches', R.eq(h1.residuals[0].value, rat(off)) && R.eq(h1.residuals[1].value, rat(off)));
  // band identity: first band + (lines−1)·spacing + last band = height
  var span = R.add(R.add(h1.residuals[0].value, h1.residuals[1].value), R.mul(rat(h1.lines - 1), h1.spacing));
  ok('band identity holds exactly', R.eq(span, rat(10 * IN)));

  // watertight under an awkward exact rotation: rotate a triangle by the
  // 3-4-5 rotation, hatch at the same angle — every endpoint lies EXACTLY on
  // a triangle edge (orientation 0, geom2's onSegment, no epsilon anywhere)
  var T345 = P.rotHalfTan(rat(1, 3));
  var tri = P.applyAll(T345, [pt(0, 0), pt(9 * IN, 0), pt(3 * IN, 7 * IN)]);
  var h2 = M.evalNode({ kind: 'hatch', poly: tri, spacing: rat(IN), t: rat(1, 3) });
  ok('rotated hatch produced lines', h2.lines > 0);
  var loose = 0;
  h2.segments.forEach(function (s) {
    [s.a, s.b].forEach(function (p) {
      var onAny = false;
      for (var i = 0; i < 3; i++) if (G.onSegment(p, tri[i], tri[(i + 1) % 3])) { onAny = true; break; }
      if (!onAny) loose++;
    });
  });
  ok('every hatch endpoint exactly on the boundary (' + h2.segments.length * 2 + ' checked)', loose === 0);
  // and every hatch midpoint is inside the region
  var out = 0;
  h2.segments.forEach(function (s) {
    var mid = pt(R.div(R.add(s.a.x, s.b.x), 2), R.div(R.add(s.a.y, s.b.y), 2));
    if (G.pointInPoly(mid, tri) === 'out') out++;
  });
  ok('no hatch line escapes the region', out === 0);

  // a non-convex region: hatch pairs even-odd across the notch
  var notch = [pt(0, 0), pt(10 * IN, 0), pt(10 * IN, 4 * IN), pt(5 * IN, 4 * IN), pt(5 * IN, 2 * IN), pt(0, 2 * IN)];
  // (an L on its side) — the line at y = 3" must produce ONE span (right half only)
  var h3 = M.evalNode({ kind: 'hatch', poly: notch, spacing: rat(3 * IN) });
  var spans3 = h3.segments.filter(function (s) { return R.eq(s.a.y, rat(3 * IN)); });
  ok('non-convex: the notched line has one span', spans3.length === 1);
  ok('…and it starts at the notch wall', R.eq(spans3[0].a.x, rat(5 * IN)) || R.eq(spans3[0].b.x, rat(5 * IN)));

  /* --- flags vs throws ------------------------------------------------------------ */
  ok('fitArray flags item-exceeds-run', M.evalNode({ kind: 'fitArray', run: rat(IN), item: rat(2 * IN), of: { kind: 'rect', w: rat(1), h: rat(1) } }).reason === 'item-exceeds-run');
  ok('hatch flags a flat region', M.evalNode({ kind: 'hatch', poly: [pt(0, 0), pt(IN, 0), pt(2 * IN, 0)], spacing: rat(IN) }).reason === 'empty-extent');
  threw('unknown kind throws', function () { M.evalNode({ kind: 'squiggle' }); });
  threw('unbound param throws', function () { M.evalNode({ kind: 'rect', w: { param: 'ghost' }, h: rat(1) }); });

  console.log('=== model: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
