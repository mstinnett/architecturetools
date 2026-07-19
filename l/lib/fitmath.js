/* fitmath.js — placement math for the Furniture Fit tool
   =========================================================================
   PURE MODULE. Integer-exact placement on the engine lattice (1 unit =
   1/960 mm): rotating a catalog object's local boxes into the room, finding
   which of its sides touch walls, snapping a drag candidate to the edges
   that matter, and sweeping the placed set for conflicts. No DOM, no
   catalog knowledge — it moves rectangles; catalog.js decides what the
   rectangles mean.

   FRAMES. An item is { x, y, turns } — the world position of its local
   origin plus 0–3 clockwise quarter turns (screen y grows down, so turns=1
   sends local +x to world +y). Catalog boxes are { x, y, w, d } in the
   local frame; worldBox() maps them to axis-aligned world rectangles —
   quarter turns keep everything axis-aligned, which is why snapping and
   overlap stay pure integer comparisons with no epsilon anywhere.

   SNAPPING is the touch story: a finger's first contact is a point, not a
   decision, so the tool snaps AGGRESSIVELY — faces of placed furniture,
   the boundaries of their clearance zones, and the room's walls all
   attract, abutment and alignment both. snap() returns what it did (axis,
   target, kind) so the page can flash the guide and the panel can say
   "snapped to the sofa's legroom zone" — and the user can always override
   numerically; the snap is a suggestion that happens to be exact.

   Fails loud on programmer error, like snap.js; returns plain data
   otherwise. Inline tests: `node fitmath.js`.
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.FitMath = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function reqInt(name, v) {
    if (!Number.isSafeInteger(v)) throw new TypeError('fitmath: ' + name + ' must be a safe integer, got ' + v);
    return v;
  }
  function reqBox(name, b) {
    if (!b) throw new TypeError('fitmath: ' + name + ' is required');
    reqInt(name + '.x', b.x); reqInt(name + '.y', b.y);
    reqInt(name + '.w', b.w); reqInt(name + '.d', b.d);
    return b;
  }

  /* ---- local box → world rectangle, by quarter turns ----------------------- */

  function reqTurns(item) {
    var t = item.turns === undefined ? 0 : item.turns;
    if (!Number.isSafeInteger(t)) throw new TypeError('fitmath: item.turns must be an integer, got ' + item.turns);
    return ((t % 4) + 4) % 4;
  }

  function worldBox(box, item) {
    reqBox('box', box);
    reqInt('item.x', item.x); reqInt('item.y', item.y);
    var k = reqTurns(item);
    var x = box.x, y = box.y, w = box.w, d = box.d;
    var out;
    if (k === 0)      out = { x: x,          y: y,          w: w, d: d };
    else if (k === 1) out = { x: -y - d,     y: x,          w: d, d: w };
    else if (k === 2) out = { x: -x - w,     y: -y - d,     w: w, d: d };
    else              out = { x: y,          y: -x - w,     w: d, d: w };
    out.x += item.x; out.y += item.y;
    // carry the annotation fields through untouched
    for (var key in box) if (!(key in out)) out[key] = box[key];
    return out;
  }

  /* ---- wall proximity, reported in the LOCAL frame ---------------------------
     Which local sides (back/right/front/left) are within `threshold` of the
     room wall they face? Rotation shifts which world wall each local side
     faces: with k clockwise turns, local side i (back=0, right=1, front=2,
     left=3) faces world wall (i + k) mod 4 (top=0, right=1, bottom=2,
     left=3). A side already past the wall (outside the room) still counts. */

  function wallSides(bodyWorld, item, room, threshold) {
    reqBox('bodyWorld', bodyWorld); reqBox('room', room); reqInt('threshold', threshold);
    var dist = [
      bodyWorld.y - room.y,                                   // top
      (room.x + room.w) - (bodyWorld.x + bodyWorld.w),        // right
      (room.y + room.d) - (bodyWorld.y + bodyWorld.d),        // bottom
      bodyWorld.x - room.x                                    // left
    ];
    var k = reqTurns(item);
    var names = ['back', 'right', 'front', 'left'];
    var out = { back: false, right: false, front: false, left: false };
    for (var i = 0; i < 4; i++) out[names[i]] = dist[(i + k) % 4] <= threshold;
    return out;
  }

  // the world wall (top/right/bottom/left) nearest to a body — for the
  // orient-back-to-wall suggestion. Returns { wall, dist, turnsForBack }.
  function nearestWall(bodyWorld, room) {
    reqBox('bodyWorld', bodyWorld); reqBox('room', room);
    var dist = [
      bodyWorld.y - room.y,
      (room.x + room.w) - (bodyWorld.x + bodyWorld.w),
      (room.y + room.d) - (bodyWorld.y + bodyWorld.d),
      bodyWorld.x - room.x
    ];
    var wall = 0;
    for (var i = 1; i < 4; i++) if (dist[i] < dist[wall]) wall = i;
    // back (local 0) faces world wall (0 + k) mod 4 → k = wall
    return { wall: ['top', 'right', 'bottom', 'left'][wall], dist: dist[wall], turnsForBack: wall };
  }

  /* ---- snapping -----------------------------------------------------------------
     snap(moving, targets, radius) — moving is the world rect at the drag
     candidate; targets are rects tagged { kind: 'body' | 'clear' | 'room' }.
     Both abutment (my left face to your right face) and alignment (my left
     to your left) attract. The room's edges are its wall faces — they
     attract from either side (a piece just outside the room snaps flush to
     the wall line, where the 'outside' conflict then names the problem).
     Nearest wins per axis, independently. Returns { dx, dy, x: guide |
     null, y: guide | null } where a guide is { at, kind } — `at` the world
     coordinate of the line to flash, `kind` what was snapped to.          */

  function axisEdges(rect, axis) {
    return axis === 'x' ? [rect.x, rect.x + rect.w] : [rect.y, rect.y + rect.d];
  }

  function snap(moving, targets, radius) {
    reqBox('moving', moving); reqInt('radius', radius);
    var best = { x: null, y: null };
    ['x', 'y'].forEach(function (axis) {
      var mine = axisEdges(moving, axis);
      targets.forEach(function (t) {
        axisEdges(t, axis).forEach(function (edge) {
          mine.forEach(function (m) {
            var delta = edge - m;
            if (Math.abs(delta) > radius) return;
            if (!best[axis] || Math.abs(delta) < Math.abs(best[axis].delta)) {
              best[axis] = { delta: delta, at: edge, kind: t.kind || 'body', label: t.label || '' };
            }
          });
        });
      });
    });
    return {
      dx: best.x ? best.x.delta : 0,
      dy: best.y ? best.y.delta : 0,
      x: best.x, y: best.y
    };
  }

  /* ---- overlap sweep ---------------------------------------------------------- */

  function overlapArea(a, b) {
    reqBox('a', a); reqBox('b', b);
    var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    var d = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y);
    return (w > 0 && d > 0) ? { w: w, d: d } : null;
  }

  // placed: [{ id, label, solids: [world rects], clears: [world rects with
  // .purpose] }] → conflicts, each with a stable kind:
  //   'collision'  solid on solid — furniture through furniture
  //   'encroach'   a solid stands in someone's clearance zone
  //   'pinch'      a clearance zone runs past the room walls
  //   'outside'    a solid itself runs past the room walls
  function conflicts(placed, room) {
    reqBox('room', room);
    var out = [];
    for (var i = 0; i < placed.length; i++) {
      var A = placed[i];
      // furniture through the wall — one report per object
      for (var so = 0; so < A.solids.length; so++) {
        var s0 = A.solids[so];
        if (s0.x < room.x || s0.y < room.y || s0.x + s0.w > room.x + room.w || s0.y + s0.d > room.y + room.d) {
          out.push({ kind: 'outside', a: A.id, note: A.label + ' runs past the room walls' });
          break;
        }
      }
      // zones clipped by the walls — one report per (object, purpose), even
      // when several zones of the same purpose pinch (a double-sided aisle)
      var pinched = {};
      A.clears.forEach(function (c) {
        if (c.x < room.x || c.y < room.y || c.x + c.w > room.x + room.w || c.y + c.d > room.y + room.d) {
          if (pinched[c.purpose]) return;
          pinched[c.purpose] = true;
          out.push({ kind: 'pinch', a: A.id, purpose: c.purpose,
                     note: A.label + ': the ' + c.purpose + ' zone runs into the wall' });
        }
      });
      for (var j = 0; j < placed.length; j++) {
        if (i === j) continue;
        var B = placed[j];
        for (var s = 0; s < A.solids.length; s++) {
          // solid × solid — report once per unordered pair
          if (j > i) {
            for (var s2 = 0; s2 < B.solids.length; s2++) {
              if (overlapArea(A.solids[s], B.solids[s2])) {
                out.push({ kind: 'collision', a: A.id, b: B.id,
                           note: A.label + ' overlaps ' + B.label });
                s = A.solids.length; break;             // one report per pair
              }
            }
            if (s >= A.solids.length) break;
          }
        }
        // A's solids inside B's zones (directional — both directions emerge
        // naturally as the outer loop swaps roles)
        for (var c2 = 0; c2 < B.clears.length; c2++) {
          for (var s3 = 0; s3 < A.solids.length; s3++) {
            if (overlapArea(A.solids[s3], B.clears[c2])) {
              out.push({ kind: 'encroach', a: A.id, b: B.id, purpose: B.clears[c2].purpose,
                         note: A.label + ' stands in ' + B.label + '’s ' + B.clears[c2].purpose + ' zone' });
              s3 = A.solids.length; c2 = B.clears.length;   // one per pair
            }
          }
        }
      }
    }
    return out;
  }

  return {
    worldBox: worldBox, wallSides: wallSides, nearestWall: nearestWall,
    snap: snap, overlapArea: overlapArea, conflicts: conflicts
  };
});

/* headless entry: `node fitmath.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var F = module.exports;
  var IN = 24384;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function eqBox(label, got, want) {
    if (got.x === want.x && got.y === want.y && got.w === want.w && got.d === want.d) pass++;
    else { fail++; console.log('FAIL ' + label + ': got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want)); }
  }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }

  /* --- worldBox under all four turns --------------------------------------- */
  var box = { x: 10, y: 20, w: 100, d: 50 };
  eqBox('turns 0', F.worldBox(box, { x: 1000, y: 2000, turns: 0 }), { x: 1010, y: 2020, w: 100, d: 50 });
  eqBox('turns 1', F.worldBox(box, { x: 1000, y: 2000, turns: 1 }), { x: 1000 - 70, y: 2000 + 10, w: 50, d: 100 });
  eqBox('turns 2', F.worldBox(box, { x: 1000, y: 2000, turns: 2 }), { x: 1000 - 110, y: 2000 - 70, w: 100, d: 50 });
  eqBox('turns 3', F.worldBox(box, { x: 1000, y: 2000, turns: 3 }), { x: 1020, y: 2000 - 110, w: 50, d: 100 });
  ok('turns wrap (5 ≡ 1)', JSON.stringify(F.worldBox(box, { x: 0, y: 0, turns: 5 })) === JSON.stringify(F.worldBox(box, { x: 0, y: 0, turns: 1 })));
  ok('annotations survive', F.worldBox({ x: 0, y: 0, w: 1, d: 1, purpose: 'aisle' }, { x: 0, y: 0, turns: 1 }).purpose === 'aisle');

  /* --- wallSides: rotation remaps which side touches ------------------------- */
  var room = { x: 0, y: 0, w: 200 * IN, d: 150 * IN };
  // an unrotated body parked at the top wall → its BACK is at the wall
  var atTop = { x: 50 * IN, y: 2 * IN, w: 60 * IN, d: 30 * IN };
  var w0 = F.wallSides(atTop, { turns: 0 }, room, 6 * IN);
  ok('turns 0: back at top wall', w0.back && !w0.front && !w0.left && !w0.right);
  // the same world rect but the item is rotated once: the wall is now on its LEFT
  var w1 = F.wallSides(atTop, { turns: 1 }, room, 6 * IN);
  ok('turns 1: the top wall is the local left', w1.left && !w1.back);
  var w2 = F.wallSides(atTop, { turns: 2 }, room, 6 * IN);
  ok('turns 2: the top wall is the local front', w2.front && !w2.back);
  // a corner touches two sides at once
  var corner = F.wallSides({ x: IN, y: IN, w: 10 * IN, d: 10 * IN }, { turns: 0 }, room, 6 * IN);
  ok('corner: back and left', corner.back && corner.left && !corner.front && !corner.right);
  // outside the room still counts as at-wall
  var past = F.wallSides({ x: -5 * IN, y: 50 * IN, w: 10 * IN, d: 10 * IN }, { turns: 0 }, room, 6 * IN);
  ok('past the wall still flags', past.left);

  /* --- nearestWall + the orient suggestion ------------------------------------ */
  var nw = F.nearestWall({ x: 3 * IN, y: 60 * IN, w: 84 * IN, d: 38 * IN }, room);
  ok('nearest is the left wall', nw.wall === 'left' && nw.turnsForBack === 3);
  ok('distance is exact', nw.dist === 3 * IN);

  /* --- snap: abutment, alignment, radius ---------------------------------------- */
  var sofa = { x: 100 * IN, y: 100 * IN, w: 84 * IN, d: 38 * IN, kind: 'body', label: 'sofa' };
  // moving box whose left face is 2" from the sofa's right face → abut
  var mv = { x: 186 * IN, y: 120 * IN, w: 48 * IN, d: 24 * IN };
  var s1 = F.snap(mv, [sofa], 4 * IN);
  ok('abuts the sofa right face', s1.dx === -2 * IN && s1.x.at === 184 * IN && s1.x.kind === 'body');
  // beyond the radius: nothing
  var s2 = F.snap({ x: 200 * IN, y: 300 * IN, w: 10 * IN, d: 10 * IN }, [sofa], 4 * IN);
  ok('no snap past the radius', s2.dx === 0 && s2.dy === 0 && !s2.x && !s2.y);
  // clearance zones attract too — and say so
  var zone = { x: 100 * IN, y: 138 * IN, w: 84 * IN, d: 16 * IN, kind: 'clear', label: 'legroom' };
  var s3 = F.snap({ x: 120 * IN, y: 156 * IN, w: 48 * IN, d: 24 * IN }, [zone], 4 * IN);
  ok('snaps to the zone boundary', s3.dy === -2 * IN && s3.y.kind === 'clear');
  // nearest target wins
  var s4 = F.snap({ x: 105 * IN, y: 0, w: 10 * IN, d: 10 * IN }, [sofa, { x: 116 * IN, y: 0, w: 4 * IN, d: 4 * IN, kind: 'body' }], 6 * IN);
  ok('nearest edge wins', s4.dx === IN);    // 116 − 115 = 1" beats 100 − 105 = −5"

  /* --- conflicts ------------------------------------------------------------------ */
  var placed = [
    { id: 'a', label: 'Sofa', solids: [{ x: 0, y: 0, w: 84 * IN, d: 38 * IN }],
      clears: [{ x: 0, y: 38 * IN, w: 84 * IN, d: 16 * IN, purpose: 'legroom' }] },
    { id: 'b', label: 'Coffee table', solids: [{ x: 10 * IN, y: 40 * IN, w: 48 * IN, d: 24 * IN }], clears: [] },
    { id: 'c', label: 'Armchair', solids: [{ x: 60 * IN, y: 20 * IN, w: 35 * IN, d: 35 * IN }], clears: [] }
  ];
  var conf = F.conflicts(placed, room);
  ok('table encroaches the legroom zone', conf.some(function (c) { return c.kind === 'encroach' && c.a === 'b' && c.purpose === 'legroom'; }));
  ok('armchair collides with the sofa', conf.some(function (c) { return c.kind === 'collision' && c.a === 'a' && c.b === 'c'; }));
  ok('collision reported once per pair', conf.filter(function (c) { return c.kind === 'collision'; }).length === 1);
  var pinched = F.conflicts([{ id: 'd', label: 'Dining', solids: [], clears: [{ x: -10 * IN, y: 10 * IN, w: 40 * IN, d: 40 * IN, purpose: 'chair zone' }] }], room);
  ok('zone through the wall pinches', pinched.length === 1 && pinched[0].kind === 'pinch');
  // two zones of one purpose pinching (a double-sided aisle) report once
  var pinch2 = F.conflicts([{ id: 'g', label: 'Gondola', solids: [], clears: [
    { x: 0, y: -10 * IN, w: 40 * IN, d: 8 * IN, purpose: 'aisle' },
    { x: 0, y: 145 * IN, w: 40 * IN, d: 8 * IN, purpose: 'aisle' }] }], room);
  ok('double pinch of one purpose reports once', pinch2.length === 1);
  // furniture through the wall is flagged, once per object
  var thru = F.conflicts([{ id: 'e', label: 'Sofa', solids: [
    { x: -5 * IN, y: 10 * IN, w: 84 * IN, d: 38 * IN }, { x: -5 * IN, y: 50 * IN, w: 10 * IN, d: 10 * IN }], clears: [] }], room);
  ok('solid past the wall flags outside, once', thru.length === 1 && thru[0].kind === 'outside');
  ok('clean layouts stay quiet', F.conflicts([placed[0]], room).length === 0);

  /* --- fail loud --------------------------------------------------------------------- */
  threw('non-integer box throws', function () { F.worldBox({ x: 0.5, y: 0, w: 1, d: 1 }, { x: 0, y: 0 }); });
  threw('fractional turns throws', function () { F.worldBox(box, { x: 0, y: 0, turns: 1.5 }); });
  threw('missing room throws', function () { F.conflicts([], null); });

  console.log('=== fitmath: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
