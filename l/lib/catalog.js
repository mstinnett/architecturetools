/* catalog.js — parametric furniture objects with their clearances built in
   =========================================================================
   PURE MODULE. The furniture library behind the Furniture Fit tool: each
   entry is not a block but a MAKER — parameters in, exact geometry out, on
   the engine lattice (integer units, 1 unit = 1/960 mm, 1 in = 24384).

   THE SHAPE OF AN OBJECT
     make(params, ctx) → {
       w, d            body footprint in the LOCAL frame: x 0..w, y 0..d
                       (+x right, +y down; FRONT is the +y edge, BACK the
                       y=0 edge — a sofa faces front, a bed's head is back)
       label           display name with the resolved size
       parts[]         solids: { x, y, w, d, kind: 'body'|'aux'|'chair',
                       shape?: 'round', label? } — chairs and companions may
                       sit OUTSIDE the body rect
       clears[]        clearance zones: { x, y, w, d, purpose, side } — the
                       included geometry the user asked for; zones are
                       first-class, they snap and they warn
       notes[]         what the object just did to itself ("left walkway
                       dropped — bed against the wall")
       info[]          derived facts for the panel ({ label, value })
       orientBackToWall  true → the tool may suggest rotating the back to
                       the nearest wall on drop (sofas, consoles, gondolas)
       wallThreshold   how close a side must be to a wall (units) before
                       the wall rules fire for this object
     }

   WALL INTELLIGENCE lives HERE, not in the page: ctx.atWall = { back,
   front, left, right } (booleans, in the LOCAL frame) and each maker
   decides what a wall on that side means — a dining table drops the
   chairs and pull-out zone on that side; a bed drops the walkway and the
   nightstand; a gondola collapses to single-sided; a dresser WARNS (its
   drawers now face the wall) because suppressing the clearance would hide
   a mistake instead of surfacing it.

   DIMENSIONS are standard US furniture/planning figures (mattress sizes,
   24"-per-diner seating, 36"/48" circulation bands, 48" gondola sections);
   every value is an exact integer count of the lattice. Comfortable values
   are used for drawn zones; code-flavored minimums appear in notes/info.
   Sources and per-value checks: docs/In Progress/furniture-field-scan.md.

   Same conventions as calculators/lib: UMD, pure, fails loud on programmer
   error (unknown keys, bad params), inline tests (`node catalog.js`).
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.Catalog = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var IN = 24384, FT = 12 * IN;
  function inches(n) { return Math.round(n * IN); }

  /* ---- small helpers ------------------------------------------------------ */

  function part(x, y, w, d, kind, label, shape) {
    return { x: x, y: y, w: w, d: d, kind: kind || 'aux', label: label || '', shape: shape || 'rect' };
  }
  function clear(x, y, w, d, purpose, side) {
    return { x: x, y: y, w: w, d: d, purpose: purpose, side: side };
  }
  function noWall() { return { back: false, front: false, left: false, right: false }; }

  // spread n chairs along a horizontal run [x0, x0+len) at row y
  var CHAIR_W = inches(18), CHAIR_D = inches(20);
  function chairRow(n, x0, len, y, side) {
    var out = [];
    if (n < 1) return out;
    var cell = Math.floor(len / n);
    for (var i = 0; i < n; i++) {
      var cx = x0 + i * cell + Math.floor((cell - CHAIR_W) / 2);
      out.push(part(cx, y, CHAIR_W, CHAIR_D, 'chair', '', 'rect'));
    }
    return out;
  }
  // a chair rotated 90° (for table ends): 20 wide × 18 deep
  function chairAt(x, y, turns) {
    var w = (turns % 2 === 0) ? CHAIR_W : CHAIR_D;
    var d = (turns % 2 === 0) ? CHAIR_D : CHAIR_W;
    return part(x, y, w, d, 'chair');
  }

  /* ======================================================================
     THE MAKERS
     ====================================================================== */

  var DEFS = [];

  /* ---- bedroom ----------------------------------------------------------- */

  var BED_SIZES = [
    { key: 'twin',   label: 'Twin',        w: 38, d: 75 },
    { key: 'twinxl', label: 'Twin XL',     w: 38, d: 80 },
    { key: 'full',   label: 'Full',        w: 54, d: 75 },
    { key: 'queen',  label: 'Queen',       w: 60, d: 80 },
    { key: 'king',   label: 'King',        w: 76, d: 80 },
    { key: 'calking', label: 'Cal King',   w: 72, d: 84 },
    { key: 'custom', label: 'Custom', custom: true }
  ];

  DEFS.push({
    key: 'bed', label: 'Bed set', category: 'bedroom',
    params: [
      { key: 'size', kind: 'variant', label: 'size', options: BED_SIZES, def: 'queen' },
      { key: 'w', kind: 'dim', label: 'width', def: inches(60), min: inches(24), max: inches(120),
        showIf: function (p) { return p.size === 'custom'; } },
      { key: 'd', kind: 'dim', label: 'length', def: inches(80), min: inches(48), max: inches(120),
        showIf: function (p) { return p.size === 'custom'; } },
      { key: 'nightstands', kind: 'count', label: 'nightstands', min: 0, max: 2, def: 2 }
    ],
    make: function (p, ctx) {
      var atWall = (ctx && ctx.atWall) || noWall();
      var size = null;
      for (var i = 0; i < BED_SIZES.length; i++) if (BED_SIZES[i].key === p.size) size = BED_SIZES[i];
      if (!size) throw new TypeError('catalog: bed size "' + p.size + '" unknown');
      var w = size.custom ? p.w : inches(size.w);
      var d = size.custom ? p.d : inches(size.d);
      var walk = inches(30);                         // side walkway (24" tight)
      var foot = inches(36);                         // foot walkway (30" tight)
      var nsW = inches(24), nsD = inches(18);
      var parts = [part(0, 0, w, d, 'body', 'bed')];
      var clears = [], notes = [];

      // head is BACK (y=0). Nightstands flank the head; walkways run beside
      // the rest of the bed and across the foot. A wall on a side removes
      // that side's walkway AND its nightstand; a wall at the foot removes
      // the foot walkway (bed-in-a-corner just works).
      var ns = p.nightstands;
      if (ns >= 1 && !atWall.left) parts.push(part(-nsW, 0, nsW, nsD, 'aux', 'nightstand'));
      if (ns >= 2 && !atWall.right) parts.push(part(w, 0, nsW, nsD, 'aux', 'nightstand'));
      if (!atWall.left) clears.push(clear(-walk, ns >= 1 ? nsD : 0, walk, d - (ns >= 1 ? nsD : 0), 'walkway', 'left'));
      else notes.push('left walkway dropped — bed against the wall' + (ns >= 1 ? '; nightstand removed' : ''));
      if (!atWall.right) clears.push(clear(w, ns >= 2 ? nsD : 0, walk, d - (ns >= 2 ? nsD : 0), 'walkway', 'right'));
      else notes.push('right walkway dropped — bed against the wall' + (ns >= 2 ? '; nightstand removed' : ''));
      if (!atWall.front) clears.push(clear(0, d, w, foot, 'walkway', 'front'));
      else notes.push('foot walkway dropped — bed against the wall');

      return {
        w: w, d: d, label: size.custom ? 'Bed (custom)' : size.label + ' bed',
        parts: parts, clears: clears, notes: notes,
        info: [{ label: 'mattress', value: Math.round(w / IN) + '″ × ' + Math.round(d / IN) + '″ (frame adds 2–5″)' },
               { label: 'walkways drawn', value: 'sides 30″ (24″ tight) · foot 36″ (30″ tight)' }],
        orientBackToWall: true, wallThreshold: inches(6),
        // the market catalog measures FRAMES (what actually stands in the
        // room), keyed by the mattress class; custom sizes have no market
        market: size.custom ? null : { cls: 'bed-frame-' + p.size, rotate: false }
      };
    }
  });

  DEFS.push({
    key: 'dresser', label: 'Dresser', category: 'bedroom',
    params: [
      { key: 'w', kind: 'dim', label: 'width', def: inches(60), min: inches(24), max: inches(96) },
      { key: 'd', kind: 'dim', label: 'depth', def: inches(20), min: inches(14), max: inches(28) }
    ],
    make: function (p, ctx) {
      var atWall = (ctx && ctx.atWall) || noWall();
      var pull = inches(36);                          // stand + open drawer
      var notes = [], clears = [];
      if (atWall.front) notes.push('drawers face the wall — rotate the dresser');
      clears.push(clear(0, p.d, p.w, pull, 'drawer pull-out', 'front'));
      return {
        w: p.w, d: p.d, label: 'Dresser',
        parts: [part(0, 0, p.w, p.d, 'body', 'dresser')],
        clears: clears, notes: notes,
        info: [{ label: 'pull-out', value: '36″ drawn — 30″ squeezes, 42″ facing a bed or door' }],
        orientBackToWall: true, wallThreshold: inches(6)
      };
    }
  });

  /* ---- dining -------------------------------------------------------------- */

  var DINING_SIZES = [
    { key: 'four',  label: 'Seats 4',  w: 48,  d: 36 },
    { key: 'six',   label: 'Seats 6',  w: 72,  d: 36 },
    { key: 'eight', label: 'Seats 8',  w: 92,  d: 40 },
    { key: 'ten',   label: 'Seats 10', w: 120, d: 44 },
    { key: 'custom', label: 'Custom', custom: true }
  ];

  // shared table maker: rectangular table + derived chairs + per-side zones.
  // perSeat: linear allowance per diner; zone: pull-out + circulation depth.
  function rectTable(p, ctx, sizes, perSeat, zone, kindLabel) {
    var atWall = (ctx && ctx.atWall) || noWall();
    var size = null;
    for (var i = 0; i < sizes.length; i++) if (sizes[i].key === p.size) size = sizes[i];
    if (!size) throw new TypeError('catalog: table size "' + p.size + '" unknown');
    var w = size.custom ? p.w : inches(size.w);
    var d = size.custom ? p.d : inches(size.d);
    var perSide = Math.max(0, Math.floor(w / perSeat));
    var parts = [part(0, 0, w, d, 'body', kindLabel)];
    var clears = [], notes = [], seats = 0;

    if (!atWall.back) { parts = parts.concat(chairRow(perSide, 0, w, -CHAIR_D, 'back')); clears.push(clear(0, -zone, w, zone, 'chair pull-out', 'back')); seats += perSide; }
    else notes.push('wall side — chairs and pull-out zone removed');
    if (!atWall.front) { parts = parts.concat(chairRow(perSide, 0, w, d, 'front')); clears.push(clear(0, d, w, zone, 'chair pull-out', 'front')); seats += perSide; }
    else notes.push('wall side — chairs and pull-out zone removed');
    if (p.ends) {
      var endY = Math.floor((d - CHAIR_W) / 2);
      if (!atWall.left) { parts.push(chairAt(-CHAIR_D, endY, 1)); clears.push(clear(-zone, 0, zone, d, 'chair pull-out', 'left')); seats += 1; }
      else notes.push('end at the wall — end seat removed');
      if (!atWall.right) { parts.push(chairAt(w, endY, 1)); clears.push(clear(w, 0, zone, d, 'chair pull-out', 'right')); seats += 1; }
      else notes.push('end at the wall — end seat removed');
    }
    return {
      w: w, d: d, label: (size.custom ? kindLabel + ' (custom)' : size.label),
      parts: parts, clears: clears, notes: notes,
      info: [{ label: 'seats as placed', value: String(seats) },
             { label: 'zone drawn', value: Math.round(zone / IN) + '″ pull-out + walk (36″ is the tight minimum)' }],
      orientBackToWall: false, wallThreshold: inches(30), seats: seats,
      market: kindLabel === 'dining table' ? { cls: 'dining-rect', rotate: true } : null
    };
  }

  DEFS.push({
    key: 'dining', label: 'Dining table', category: 'dining',
    params: [
      { key: 'size', kind: 'variant', label: 'size', options: DINING_SIZES, def: 'six' },
      { key: 'w', kind: 'dim', label: 'length', def: inches(72), min: inches(30), max: inches(168),
        showIf: function (p) { return p.size === 'custom'; } },
      { key: 'd', kind: 'dim', label: 'width', def: inches(36), min: inches(24), max: inches(60),
        showIf: function (p) { return p.size === 'custom'; } },
      { key: 'ends', kind: 'toggle', label: 'end seats', def: true }
    ],
    make: function (p, ctx) { return rectTable(p, ctx, DINING_SIZES, inches(24), inches(42), 'dining table'); }
  });

  var ROUND_SIZES = [
    { key: 'four',  label: 'Seats 4', dia: 42 },
    { key: 'six',   label: 'Seats 6', dia: 54 },
    { key: 'eight', label: 'Seats 8', dia: 72 },
    { key: 'custom', label: 'Custom', custom: true }
  ];

  DEFS.push({
    key: 'dining-round', label: 'Round table', category: 'dining',
    params: [
      { key: 'size', kind: 'variant', label: 'size', options: ROUND_SIZES, def: 'four' },
      { key: 'dia', kind: 'dim', label: 'diameter', def: inches(48), min: inches(24), max: inches(96),
        showIf: function (p) { return p.size === 'custom'; } }
    ],
    make: function (p, ctx) {
      var atWall = (ctx && ctx.atWall) || noWall();
      var size = null;
      for (var i = 0; i < ROUND_SIZES.length; i++) if (ROUND_SIZES[i].key === p.size) size = ROUND_SIZES[i];
      if (!size) throw new TypeError('catalog: round size "' + p.size + '" unknown');
      var dia = size.custom ? p.dia : inches(size.dia);
      // custom: ~circumference / 28" (elbow room on a curve) — chosen so a
      // custom diameter equal to a preset seats the preset's count
      var seats = size.custom ? Math.max(2, Math.floor((dia * 355) / (113 * inches(28)))) :
                  (size.key === 'four' ? 4 : size.key === 'six' ? 6 : 8);
      var zone = inches(42);
      var parts = [part(0, 0, dia, dia, 'body', 'round table', 'round')];
      var clears = [], notes = [];
      // chairs at even angles; each is suppressed if its outward side is a wall
      var placed = 0;
      for (var s = 0; s < seats; s++) {
        var ang = (s * 2 * Math.PI) / seats - Math.PI / 2;      // start at back (top)
        var ux = Math.cos(ang), uy = Math.sin(ang);
        var sideName = Math.abs(ux) > Math.abs(uy) ? (ux > 0 ? 'right' : 'left') : (uy > 0 ? 'front' : 'back');
        if (atWall[sideName]) continue;
        var r = dia / 2 + CHAIR_D / 2;
        var cx = Math.round(dia / 2 + ux * r - CHAIR_W / 2);
        var cy = Math.round(dia / 2 + uy * r - CHAIR_D / 2);
        parts.push(part(cx, cy, CHAIR_W, CHAIR_D, 'chair'));
        placed++;
      }
      if (placed < seats) notes.push((seats - placed) + ' seat' + (seats - placed > 1 ? 's' : '') + ' removed on the wall side');
      ['back', 'front', 'left', 'right'].forEach(function (side) {
        if (atWall[side]) return;
        if (side === 'back') clears.push(clear(0, -zone, dia, zone, 'chair pull-out', side));
        if (side === 'front') clears.push(clear(0, dia, dia, zone, 'chair pull-out', side));
        if (side === 'left') clears.push(clear(-zone, 0, zone, dia, 'chair pull-out', side));
        if (side === 'right') clears.push(clear(dia, 0, zone, dia, 'chair pull-out', side));
      });
      return {
        w: dia, d: dia, label: size.custom ? 'Round table (custom)' : size.label + ' round',
        parts: parts, clears: clears, notes: notes,
        info: [{ label: 'seats as placed', value: String(placed) }],
        orientBackToWall: false, wallThreshold: inches(30)
      };
    }
  });

  /* ---- living -------------------------------------------------------------- */

  var SOFA_SIZES = [
    { key: 'love', label: 'Loveseat', w: 60 },
    { key: 'three', label: '3-seat', w: 84 },
    { key: 'custom', label: 'Custom', custom: true }
  ];

  DEFS.push({
    key: 'sofa', label: 'Sofa', category: 'living',
    params: [
      { key: 'size', kind: 'variant', label: 'size', options: SOFA_SIZES, def: 'three' },
      { key: 'w', kind: 'dim', label: 'width', def: inches(84), min: inches(48), max: inches(144),
        showIf: function (p) { return p.size === 'custom'; } }
    ],
    make: function (p, ctx) {
      var atWall = (ctx && ctx.atWall) || noWall();
      var size = null;
      for (var i = 0; i < SOFA_SIZES.length; i++) if (SOFA_SIZES[i].key === p.size) size = SOFA_SIZES[i];
      if (!size) throw new TypeError('catalog: sofa size "' + p.size + '" unknown');
      var w = size.custom ? p.w : inches(size.w);
      var d = inches(38);
      var clears = [clear(0, d, w, inches(16), 'legroom to table', 'front')];
      var notes = [];
      if (!atWall.back) clears.push(clear(0, -inches(30), w, inches(30), 'walkway', 'back'));
      else notes.push('backed to the wall — rear walkway not needed');
      return {
        w: w, d: d, label: size.custom ? 'Sofa (custom)' : size.label + ' sofa',
        parts: [part(0, 0, w, d, 'body', 'sofa')],
        clears: clears, notes: notes,
        info: [{ label: 'coffee table gap', value: '16″ (14–18″ works)' }],
        orientBackToWall: true, wallThreshold: inches(12),
        // a sofa's orientation is fixed by its back — no rotate in the fit
        market: { cls: (p.size === 'love' || (size.custom && w < inches(72))) ? 'loveseat' : 'sofa-3', rotate: false }
      };
    }
  });

  DEFS.push({
    key: 'armchair', label: 'Armchair', category: 'living',
    params: [],
    make: function (p, ctx) {
      var w = inches(35), d = inches(35);
      return {
        w: w, d: d, label: 'Armchair',
        parts: [part(0, 0, w, d, 'body', 'armchair')],
        clears: [clear(0, d, w, inches(16), 'legroom', 'front')],
        notes: [], info: [],
        orientBackToWall: true, wallThreshold: inches(12)
      };
    }
  });

  DEFS.push({
    key: 'coffee-table', label: 'Coffee table', category: 'living',
    params: [
      { key: 'w', kind: 'dim', label: 'length', def: inches(48), min: inches(18), max: inches(72) },
      { key: 'd', kind: 'dim', label: 'depth', def: inches(24), min: inches(18), max: inches(48) }
    ],
    make: function (p) {
      return {
        w: p.w, d: p.d, label: 'Coffee table',
        parts: [part(0, 0, p.w, p.d, 'body', 'coffee table')],
        clears: [clear(-inches(16), -inches(16), p.w + inches(32), p.d + inches(32), 'reach + pass', 'all')],
        notes: [], info: [{ label: 'to seating', value: 'snap it to the sofa’s legroom zone' }],
        orientBackToWall: false, wallThreshold: inches(6)
      };
    }
  });

  DEFS.push({
    key: 'tv-console', label: 'TV console', category: 'living',
    params: [
      { key: 'w', kind: 'dim', label: 'width', def: inches(60), min: inches(36), max: inches(96) }
    ],
    make: function (p, ctx) {
      var atWall = (ctx && ctx.atWall) || noWall();
      var d = inches(18);
      var notes = atWall.back ? [] : ['floats — a console usually backs a wall'];
      return {
        w: p.w, d: d, label: 'TV console',
        parts: [part(0, 0, p.w, d, 'body', 'console')],
        clears: [clear(0, d, p.w, inches(36), 'walk + viewing setback', 'front')],
        notes: notes,
        info: [{ label: 'viewing', value: '~7′–10′ to a 65″ screen' }],
        orientBackToWall: true, wallThreshold: inches(6)
      };
    }
  });

  /* ---- office ---------------------------------------------------------------- */

  var CONF_SIZES = [
    { key: 'six',    label: 'Seats 6',  w: 72,  d: 36 },
    { key: 'eight',  label: 'Seats 8',  w: 96,  d: 48 },
    { key: 'ten',    label: 'Seats 10', w: 120, d: 48 },
    { key: 'twelve', label: 'Seats 12', w: 168, d: 48 },   // 5 per side + ends at 30″/person
    { key: 'custom', label: 'Custom', custom: true }
  ];

  DEFS.push({
    key: 'conference', label: 'Conference table', category: 'office',
    params: [
      { key: 'size', kind: 'variant', label: 'size', options: CONF_SIZES, def: 'eight' },
      { key: 'w', kind: 'dim', label: 'length', def: inches(96), min: inches(48), max: inches(240),
        showIf: function (p) { return p.size === 'custom'; } },
      { key: 'd', kind: 'dim', label: 'width', def: inches(48), min: inches(30), max: inches(72),
        showIf: function (p) { return p.size === 'custom'; } },
      { key: 'ends', kind: 'toggle', label: 'end seats', def: true }
    ],
    make: function (p, ctx) {
      // 30" per person, 48" zone: pull back a chair AND walk behind it
      var r = rectTable(p, ctx, CONF_SIZES, inches(30), inches(48), 'conference table');
      r.info[1] = { label: 'zone drawn', value: '48″ — sit + pass behind · 42″ sit-only · 36″ floor' };
      return r;
    }
  });

  var CUBE_SIZES = [
    { key: 'sixsix', label: '6′ × 6′', w: 72, d: 72 },
    { key: 'sixeight', label: '6′ × 8′', w: 96, d: 72 },
    { key: 'eighteight', label: '8′ × 8′', w: 96, d: 96 }
  ];

  DEFS.push({
    key: 'cube', label: 'Work cube', category: 'office',
    params: [
      { key: 'size', kind: 'variant', label: 'size', options: CUBE_SIZES, def: 'sixsix' }
    ],
    make: function (p, ctx) {
      var size = null;
      for (var i = 0; i < CUBE_SIZES.length; i++) if (CUBE_SIZES[i].key === p.size) size = CUBE_SIZES[i];
      if (!size) throw new TypeError('catalog: cube size "' + p.size + '" unknown');
      var w = inches(size.w), d = inches(size.d);
      var surf = inches(24);
      return {
        w: w, d: d, label: size.label + ' cube',
        parts: [
          part(0, 0, w, d, 'body', 'cube'),
          part(0, 0, w, surf, 'aux', 'worksurface'),                 // back run
          part(0, surf, surf, d - surf, 'aux', 'return')             // left return
        ],
        clears: [clear(Math.floor(w / 2), d, Math.floor(w / 2), inches(36), 'entry', 'front')],
        notes: [], info: [{ label: 'panels', value: 'typ. 42″–66″ high' }],
        orientBackToWall: true, wallThreshold: inches(6)
      };
    }
  });

  DEFS.push({
    key: 'bench', label: 'Bench desks', category: 'office',
    params: [
      { key: 'persons', kind: 'count', label: 'people', min: 1, max: 12, def: 4 },
      { key: 'b2b', kind: 'toggle', label: 'back-to-back', def: true },
      { key: 'module', kind: 'dim', label: 'seat width', def: inches(60), min: inches(48), max: inches(72) }
    ],
    make: function (p, ctx) {
      var atWall = (ctx && ctx.atWall) || noWall();
      var deskD = inches(30), zone = inches(42);
      var b2b = p.b2b && p.persons > 1;
      var perRow = b2b ? Math.ceil(p.persons / 2) : p.persons;
      var w = perRow * p.module;
      var d = b2b ? deskD * 2 : deskD;
      var parts = [part(0, 0, w, d, 'body', 'bench')];
      var clears = [], notes = [];
      // seat rows: front row always seats; back row seats when back-to-back
      var frontSeats = b2b ? p.persons - perRow : p.persons;
      parts = parts.concat(chairRow(b2b ? perRow : p.persons, 0, w, d, 'front'));
      if (b2b) parts = parts.concat(chairRow(frontSeats, 0, Math.max(1, frontSeats) * p.module, -CHAIR_D, 'back'));
      clears.push(clear(0, d, w, zone, 'chair + pass', 'front'));
      if (b2b) {
        if (!atWall.back) clears.push(clear(0, -zone, w, zone, 'chair + pass', 'back'));
        else notes.push('back row against the wall — flip to single-sided or pull off the wall');
      }
      return {
        w: w, d: d, label: p.persons + '-person bench',
        parts: parts, clears: clears, notes: notes,
        info: [{ label: 'aisle guide', value: '42″ drawn; 36″ min egress between rows' }],
        orientBackToWall: !b2b, wallThreshold: inches(30)
      };
    }
  });

  /* ---- break room --------------------------------------------------------------- */

  DEFS.push({
    key: 'kitchenette', label: 'Kitchenette run', category: 'breakroom',
    params: [
      { key: 'w', kind: 'dim', label: 'run length', def: inches(96), min: inches(48), max: inches(240) },
      { key: 'fridge', kind: 'toggle', label: 'refrigerator', def: true }
    ],
    make: function (p, ctx) {
      var atWall = (ctx && ctx.atWall) || noWall();
      var counterD = inches(25);
      var frW = inches(36), frD = inches(33);       // depth includes doors + handles
      var parts = [part(0, 0, p.w, counterD, 'body', 'counter')];
      var w = p.w;
      if (p.fridge) { parts.push(part(p.w, 0, frW, frD, 'aux', 'refrigerator')); w = p.w + frW; }
      var notes = atWall.back ? [] : ['floats — a counter run expects a wall behind it'];
      return {
        w: w, d: p.fridge ? frD : counterD, label: 'Kitchenette',
        parts: parts,
        clears: [clear(0, p.fridge ? frD : counterD, w, inches(48), 'work aisle', 'front')],
        notes: notes,
        info: [{ label: 'counter', value: (Math.round(p.w / FT * 10) / 10) + '′ run · 25″ deep' },
               { label: 'aisle drawn', value: '48″ two-person (42″ one)' }],
        orientBackToWall: true, wallThreshold: inches(6)
      };
    }
  });

  DEFS.push({
    key: 'cafe-table', label: 'Café table', category: 'breakroom',
    params: [
      { key: 'size', kind: 'variant', label: 'size', options: [
        { key: 'two', label: '2-top', dia: 30, seats: 2 },
        { key: 'four', label: '4-top', dia: 36, seats: 4 }
      ], def: 'two' }
    ],
    make: function (p, ctx) {
      var atWall = (ctx && ctx.atWall) || noWall();
      var size = p.size === 'two' ? { dia: 30, seats: 2 } : p.size === 'four' ? { dia: 36, seats: 4 } : null;
      if (!size) throw new TypeError('catalog: cafe size "' + p.size + '" unknown');
      var dia = inches(size.dia);
      var parts = [part(0, 0, dia, dia, 'body', 'café table', 'round')];
      var notes = [], zone = inches(30);
      var sides = size.seats === 2 ? ['left', 'right'] : ['left', 'right', 'back', 'front'];
      var clears = [];
      var placed = 0;
      sides.forEach(function (side) {
        if (atWall[side]) return;
        placed++;
        var mid = Math.floor((dia - CHAIR_W) / 2);
        if (side === 'left') { parts.push(chairAt(-CHAIR_D, mid, 1)); clears.push(clear(-zone, 0, zone, dia, 'seat', side)); }
        if (side === 'right') { parts.push(chairAt(dia, mid, 1)); clears.push(clear(dia, 0, zone, dia, 'seat', side)); }
        if (side === 'back') { parts.push(part(mid, -CHAIR_D, CHAIR_W, CHAIR_D, 'chair')); clears.push(clear(0, -zone, dia, zone, 'seat', side)); }
        if (side === 'front') { parts.push(part(mid, dia, CHAIR_W, CHAIR_D, 'chair')); clears.push(clear(0, dia, dia, zone, 'seat', side)); }
      });
      if (placed < sides.length) notes.push((sides.length - placed) + ' seat(s) removed on the wall side');
      return {
        w: dia, d: dia, label: (size.seats === 2 ? '2-top' : '4-top') + ' café',
        parts: parts, clears: clears, notes: notes,
        info: [{ label: 'seats as placed', value: String(placed) }],
        orientBackToWall: false, wallThreshold: inches(24)
      };
    }
  });

  /* ---- retail ---------------------------------------------------------------------- */

  var GONDOLA_DEPTHS = [
    { key: 'd13', label: '13″ shelf', depth: 13 },
    { key: 'd16', label: '16″ shelf', depth: 16 },
    { key: 'd19', label: '19″ shelf', depth: 19 },
    { key: 'd22', label: '22″ shelf', depth: 22 }
  ];
  var GONDOLA_HEIGHTS = [
    { key: 'h54', label: '54″', h: 54 }, { key: 'h60', label: '60″', h: 60 },
    { key: 'h66', label: '66″', h: 66 }, { key: 'h72', label: '72″', h: 72 },
    { key: 'h78', label: '78″', h: 78 }
  ];

  DEFS.push({
    key: 'gondola', label: 'Gondola run', category: 'retail',
    params: [
      { key: 'sections', kind: 'count', label: 'sections (4′)', min: 1, max: 12, def: 3 },
      { key: 'depth', kind: 'variant', label: 'shelf depth', options: GONDOLA_DEPTHS, def: 'd19' },
      { key: 'height', kind: 'variant', label: 'height', options: GONDOLA_HEIGHTS, def: 'h66' },
      { key: 'double', kind: 'toggle', label: 'double-sided', def: true },
      { key: 'shelves', kind: 'count', label: 'shelves / side', min: 2, max: 7, def: 4 },
      { key: 'itemW', kind: 'dim', label: 'item width', def: inches(3), min: Math.round(IN / 2), max: inches(24) },
      { key: 'density', kind: 'count', label: 'display density %', min: 40, max: 100, def: 90 }
    ],
    make: function (p, ctx) {
      var atWall = (ctx && ctx.atWall) || noWall();
      var depthDef = null, hDef = null;
      for (var i = 0; i < GONDOLA_DEPTHS.length; i++) if (GONDOLA_DEPTHS[i].key === p.depth) depthDef = GONDOLA_DEPTHS[i];
      for (var j = 0; j < GONDOLA_HEIGHTS.length; j++) if (GONDOLA_HEIGHTS[j].key === p.height) hDef = GONDOLA_HEIGHTS[j];
      if (!depthDef || !hDef) throw new TypeError('catalog: gondola depth/height unknown');
      var section = inches(48);
      var w = p.sections * section;
      var notes = [];
      var double_ = p.double;
      if (double_ && atWall.back) { double_ = false; notes.push('wall run — collapsed to single-sided'); }
      var spine = inches(3);
      var shelfD = inches(depthDef.depth);
      var d = double_ ? shelfD * 2 + spine : shelfD + spine;
      var aisle = inches(48);
      var clears = [clear(0, d, w, aisle, 'aisle', 'front')];
      if (double_) clears.push(clear(0, -aisle, w, aisle, 'aisle', 'back'));

      // display math: the density language of the trade — facings and linear feet
      var sides = double_ ? 2 : 1;
      var linFt = p.sections * 4 * p.shelves * sides;
      var perShelfSection = Math.floor((section / p.itemW) * p.density / 100);
      var facings = perShelfSection * p.sections * p.shelves * sides;
      return {
        w: w, d: d, label: p.sections + '×4′ gondola' + (double_ ? '' : ' (wall)'),
        parts: [part(0, 0, w, d, 'body', 'gondola')],
        clears: clears, notes: notes,
        info: [
          { label: 'display', value: linFt + ' linear ft on ' + p.shelves + ' shelves' + (double_ ? ' × 2 sides' : '') },
          { label: 'facings', value: '≈ ' + facings + ' at ' + (Math.round(p.itemW / IN * 100) / 100) + '″ · ' + p.density + '% packed' },
          { label: 'aisle drawn', value: '48″ · 36″ ADA floor · groceries run 60–84″' },
          { label: 'height', value: hDef.label + ' · sight lines drop past 60″' }
        ],
        orientBackToWall: true, wallThreshold: inches(6)
      };
    }
  });

  DEFS.push({
    key: 'checkout', label: 'Checkout counter', category: 'retail',
    params: [
      { key: 'w', kind: 'dim', label: 'length', def: inches(72), min: inches(36), max: inches(144) }
    ],
    make: function (p) {
      var d = inches(30);
      return {
        w: p.w, d: d, label: 'Checkout',
        parts: [part(0, 0, p.w, d, 'body', 'checkout')],
        clears: [clear(0, d, p.w, inches(48), 'queue', 'front'),
                 clear(0, -inches(42), p.w, inches(42), 'staff', 'back')],
        notes: [], info: [{ label: 'queue side', value: '48″ drawn · 36″ ADA min' },
                          { label: 'staff side', value: '42″ working zone' }],
        orientBackToWall: false, wallThreshold: inches(6)
      };
    }
  });

  DEFS.push({
    key: 'garment-rack', label: 'Garment rack', category: 'retail',
    params: [],
    make: function (p) {
      var dia = inches(37);                          // rail + ~2″ garment overhang per side
      var ring = inches(42);
      return {
        w: dia, d: dia, label: 'Round rack',
        parts: [part(0, 0, dia, dia, 'body', 'rack', 'round')],
        clears: [clear(-ring, -ring, dia + 2 * ring, dia + 2 * ring, 'shopping aisle', 'all')],
        notes: [], info: [{ label: 'aisle', value: '42″ drawn between fixtures · 36″ ADA min' }],
        orientBackToWall: false, wallThreshold: inches(6)
      };
    }
  });

  /* ======================================================================
     PUBLIC API
     ====================================================================== */

  var BY_KEY = {};
  DEFS.forEach(function (def) { BY_KEY[def.key] = def; });

  var CATEGORIES = [
    { key: 'bedroom', label: 'Bedroom' },
    { key: 'dining', label: 'Dining' },
    { key: 'living', label: 'Living' },
    { key: 'office', label: 'Office' },
    { key: 'breakroom', label: 'Break room' },
    { key: 'retail', label: 'Retail' }
  ];

  function get(key) {
    if (!BY_KEY[key]) throw new TypeError('catalog: unknown object "' + key + '"');
    return BY_KEY[key];
  }

  function defaultsFor(key) {
    var def = get(key), out = {};
    def.params.forEach(function (p) { out[p.key] = p.def; });
    return out;
  }

  // the one entry the tool calls: params are validated by kind here, so a
  // page can hand user state straight in.
  function make(key, params, ctx) {
    var def = get(key);
    var p = defaultsFor(key);
    if (params) for (var k in params) {
      if (!(k in p)) throw new TypeError('catalog: "' + key + '" has no parameter "' + k + '"');
      p[k] = params[k];
    }
    def.params.forEach(function (spec) {
      var v = p[spec.key];
      if (spec.kind === 'dim') {
        if (!Number.isSafeInteger(v) || v <= 0) throw new TypeError('catalog: ' + key + '.' + spec.key + ' must be positive integer units');
        if (spec.min && v < spec.min) p[spec.key] = spec.min;
        if (spec.max && v > spec.max) p[spec.key] = spec.max;
      }
      if (spec.kind === 'count') {
        if (!Number.isSafeInteger(v)) throw new TypeError('catalog: ' + key + '.' + spec.key + ' must be an integer');
        if (v < spec.min) p[spec.key] = spec.min;
        if (v > spec.max) p[spec.key] = spec.max;
      }
      if (spec.kind === 'variant') {
        var found = spec.options.some(function (o) { return o.key === v; });
        if (!found) throw new TypeError('catalog: ' + key + '.' + spec.key + ' has no option "' + v + '"');
      }
      if (spec.kind === 'toggle') p[spec.key] = !!v;
    });
    return def.make(p, ctx);
  }

  return { DEFS: DEFS, CATEGORIES: CATEGORIES, get: get, defaultsFor: defaultsFor, make: make, IN: IN, FT: FT, inches: inches };
});

/* headless entry: `node catalog.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var C = module.exports;
  var IN = C.IN;
  var pass = 0, fail = 0;
  function ok(label, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + label); } }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }
  function wall(sides) {
    var w = { back: false, front: false, left: false, right: false };
    (sides || []).forEach(function (s) { w[s] = true; });
    return { atWall: w };
  }

  /* --- every object makes cleanly with defaults, integer geometry ----------- */
  C.DEFS.forEach(function (def) {
    var r = C.make(def.key);
    ok(def.key + ': positive body', r.w > 0 && r.d > 0);
    ok(def.key + ': has a body part', r.parts.some(function (p) { return p.kind === 'body'; }));
    var allInt = r.parts.concat(r.clears).every(function (b) {
      return Number.isSafeInteger(b.x) && Number.isSafeInteger(b.y) && Number.isSafeInteger(b.w) && Number.isSafeInteger(b.d) && b.w > 0 && b.d > 0;
    });
    ok(def.key + ': all boxes are positive integers', allInt);
  });

  /* --- bed: sizes, custom, nightstands, wall behavior ------------------------ */
  var q = C.make('bed');
  ok('queen is 60×80', q.w === 60 * IN && q.d === 80 * IN);
  ok('two nightstands by default', q.parts.filter(function (p) { return p.label === 'nightstand'; }).length === 2);
  ok('three walkways when floating', q.clears.length === 3);
  var qL = C.make('bed', null, wall(['left']));
  ok('left wall: nightstand + walkway removed', qL.parts.filter(function (p) { return p.label === 'nightstand'; }).length === 1
     && !qL.clears.some(function (c) { return c.side === 'left'; }) && qL.notes.length === 1);
  var ck = C.make('bed', { size: 'calking' });
  ok('cal king is 72×84', ck.w === 72 * IN && ck.d === 84 * IN);
  var cust = C.make('bed', { size: 'custom', w: 50 * IN, d: 70 * IN });
  ok('custom size passes through', cust.w === 50 * IN && cust.d === 70 * IN);

  /* --- dining: derived seats + wall suppression -------------------------------- */
  var six = C.make('dining');
  ok('6-seat table seats 8 with ends (72/24=3 per side + 2)', six.seats === 8);
  ok('chairs drawn for every seat', six.parts.filter(function (p) { return p.kind === 'chair'; }).length === 8);
  var sixWall = C.make('dining', null, wall(['back']));
  ok('wall side drops 3 chairs', sixWall.seats === 5);
  ok('wall side drops its zone', !sixWall.clears.some(function (c) { return c.side === 'back'; }));
  ok('a note says why', sixWall.notes.length >= 1);
  var noEnds = C.make('dining', { ends: false });
  ok('ends off: 6 seats', noEnds.seats === 6);

  /* --- round: sector suppression ------------------------------------------------ */
  var rd = C.make('dining-round');
  ok('round 4-top places 4 chairs', rd.parts.filter(function (p) { return p.kind === 'chair'; }).length === 4);
  var rdWall = C.make('dining-round', null, wall(['back']));
  ok('round at wall loses the back seat', rdWall.parts.filter(function (p) { return p.kind === 'chair'; }).length === 3);

  /* --- sofa: wall note --------------------------------------------------------- */
  var so = C.make('sofa', null, wall(['back']));
  ok('sofa at wall keeps only front clearance', so.clears.length === 1 && so.clears[0].side === 'front');
  ok('sofa suggests orientation', C.get('sofa') && C.make('sofa').orientBackToWall === true);

  /* --- dresser warns instead of suppressing -------------------------------------- */
  var dr = C.make('dresser', null, wall(['front']));
  ok('dresser facing wall keeps the zone AND warns', dr.clears.length === 1 && /rotate/.test(dr.notes[0]));

  /* --- bench: rows and back-to-back --------------------------------------------- */
  var be = C.make('bench');
  ok('4-person b2b is 2 modules long', be.w === 2 * 60 * IN);
  ok('bench depth doubles back-to-back', be.d === 60 * IN);
  var beW = C.make('bench', null, wall(['back']));
  ok('bench at wall warns about the back row', beW.notes.length === 1);

  /* --- gondola: density math + wall collapse -------------------------------------- */
  var g = C.make('gondola');
  ok('3 sections = 12′ long', g.w === 144 * IN);
  ok('double-sided depth = 2×19+3', g.d === (19 * 2 + 3) * IN);
  ok('two aisles when double-sided', g.clears.length === 2);
  var linFt = g.info[0].value;
  ok('display linear feet = 3×4×4×2 = 96', /^96 /.test(linFt));
  var gw = C.make('gondola', null, wall(['back']));
  ok('at the wall: single-sided', gw.d === 22 * IN && gw.clears.length === 1 && /single-sided/.test(gw.notes[0]));
  ok('aisle drawn at 48 with the ADA floor noted', /48″ · 36″ ADA/.test(g.info[2].value));
  // facings: floor(48/3 × 0.9)=14 per shelf-section × 3 × 4 × 2 = 336
  ok('facings math', /336/.test(g.info[1].value));

  /* --- review fixes ------------------------------------------------------------------ */
  var c12 = C.make('conference', { size: 'twelve' });
  ok('Seats 12 preset seats 12', c12.seats === 12);
  var rdCustom = C.make('dining-round', { size: 'custom', dia: 54 * IN });
  var rdPreset = C.make('dining-round', { size: 'six' });
  ok('custom 54″ round seats like the 54″ preset',
     rdCustom.parts.filter(function (p) { return p.kind === 'chair'; }).length ===
     rdPreset.parts.filter(function (p) { return p.kind === 'chair'; }).length);

  /* --- market classes route correctly -------------------------------------------- */
  ok('queen bed → bed-frame-queen', C.make('bed').market.cls === 'bed-frame-queen');
  ok('custom bed has no market', C.make('bed', { size: 'custom', w: 50 * IN, d: 70 * IN }).market === null);
  ok('3-seat sofa → sofa-3, no rotate', C.make('sofa').market.cls === 'sofa-3' && C.make('sofa').market.rotate === false);
  ok('loveseat routes', C.make('sofa', { size: 'love' }).market.cls === 'loveseat');
  ok('narrow custom sofa reads as loveseat', C.make('sofa', { size: 'custom', w: 60 * IN }).market.cls === 'loveseat');
  ok('dining rect rotates in the fit', C.make('dining').market.rotate === true);
  ok('conference has no market entry', C.make('conference').market === null);

  /* --- API hygiene ------------------------------------------------------------------ */
  threw('unknown object throws', function () { C.make('hovercraft'); });
  threw('unknown variant throws', function () { C.make('bed', { size: 'emperor' }); });
  threw('non-integer dim throws', function () { C.make('dresser', { w: 60.5 }); });
  threw('junk key on a zero-param object throws', function () { C.make('armchair', { bogus: 1 }); });
  ok('defaultsFor returns the declared defaults', C.defaultsFor('bed').size === 'queen');
  ok('categories cover all defs', C.DEFS.every(function (d) {
    return C.CATEGORIES.some(function (c) { return c.key === d.category; });
  }));

  console.log('=== catalog: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
