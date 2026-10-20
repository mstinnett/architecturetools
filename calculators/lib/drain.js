/* drain.js — minimum slope for drainage: what drains, and the height it uses
   =========================================================================
   PURE MODULE (no DOM). Sits on slope.js (the page solves two of three with
   Slope.solve); this module holds the drainage data and the height
   arithmetic. Lengths are integer counts on the engine's lattice (1 unit =
   1/960 mm, see snap.js); a slope is a RATIO, drop ÷ run.

   CONTRACT
     ITEMS — [{ id, label, group, min, max?, minFace, maxFace?, cite, note,
                pipes? }]
       What drains. min (and max, where the code sets one) are ratios.
       pipes, on piped items, lists the sizes the item comes in; the item's
       min may then depend on the size (minFor).
     MATERIALS — { id: { label, cite, od: { nominal: outside-diameter-inches } } }
     itemById(id) → item | null
     minFor(item, nominal) → { min, max, minFace, maxFace, cite }
       DWV pipe takes its minimum from the size band (IPC Table 704.1);
       everything else from the item.
     odUnits(material, nominal) → integer units | null
       The barrel's outside diameter on the lattice, or null when the
       material has no such size.
     heightUsed(drop, od, allow) → integer units
       drop + pipe OD + allowance (hangers, insulation, fittings). All three
       integer units, od and allow may be 0.
     dropFrom(height, od, allow) → integer units (may be ≤ 0: nothing fits)
     roundDrop(drop, inc) → { down, near, up }
       The exact drop at the build increment (integer units), floor /
       nearest / ceil. inc must be a positive integer. Fails loud.
     check(ratio, item min/max) → 'under' | 'over' | 'ok'
       Against the minimum (and maximum, if any), with a relative tolerance
       so a drop that lands exactly on the minimum reads as ok.

   Values are located, not ruled: each item cites where its number comes
   from. Codes are adopted with local amendments; the page says so.
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.Drain = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var IN = 24384;            // units per inch (1/960 mm lattice)

  // outside diameters of the pipe barrel, inches. Hubs and no-hub couplings
  // are larger than the barrel; the page says so beside the allowance.
  var MATERIALS = {
    pvc: { label: 'PVC or ABS, Schedule 40', cite: 'ASTM D1785 / D2665 IPS outside diameters',
           od: { '3/4': 1.050, '1': 1.315, '1-1/2': 1.900, '2': 2.375, '3': 3.500, '4': 4.500, '6': 6.625, '8': 8.625 } },
    ci:  { label: 'Cast iron, no-hub', cite: 'CISPI 301 barrel outside diameters',
           od: { '1-1/2': 1.90, '2': 2.35, '3': 3.35, '4': 4.38, '6': 6.30, '8': 8.38 } }
  };

  var Q = 1 / 48, E = 1 / 96, S = 1 / 192;   // 1/4, 1/8, 1/16 inch per foot

  var ITEMS = [
    { id: 'dwv', label: 'Horizontal drainage pipe', group: 'Pipe', min: null, piped: true,
      pipes: ['1-1/2', '2', '3', '4', '6', '8'],
      cite: 'IPC Table 704.1',
      note: 'Pipe upstream of a grease interceptor takes 1/4"/ft at any size (Table 704.1, note a). The UPC (708.1) asks 1/4"/ft for every size, and allows 1/8"/ft for 4" and larger only where 1/4"/ft is impractical and the authority having jurisdiction approves it. The 2024 UPC limits that to the building drain.' },
    { id: 'cond', label: 'Condensate line', group: 'Pipe', min: E, minFace: '1/8"/ft', piped: true,
      pipes: ['3/4', '1'],
      cite: 'IMC 307.2.1, 307.2.2',
      note: 'The IMC sets the line at 3/4" pipe size or larger (3/4" inside diameter in the 2018 edition), with no decrease in size from the drain pan connection.' },
    { id: 'shower', label: 'Shower floor', group: 'Surface', min: Q, max: 1 / 24, minFace: '1/4"/ft', maxFace: '1/2"/ft',
      cite: 'IRC P2709.1',
      note: 'For accessible showers, coordinate drainage with the applicable accessibility requirements. A 1:48 maximum is 1/4"/ft; do not apply the general shower maximum to an accessible shower.' },
    { id: 'roof', label: 'Low-slope roof membrane', group: 'Surface', min: Q, minFace: '1/4"/ft',
      cite: 'IBC 1507.10.1, 1507.11.1, 1507.12.1',
      note: 'Built-up, modified bitumen and single-ply membranes. Coal-tar built-up roofing is allowed at 1/8"/ft. The 2018 IBC lists thermoplastic single-ply separately, at 1507.13.1.' },
    { id: 'gutter', label: 'Gutter', group: 'Surface', min: S, minFace: '1/16"/ft',
      cite: 'Trade practice',
      note: 'The model codes set no gutter slope. 1/16"/ft is a planning reference here. Confirm the gutter manufacturer\'s slope and outlet requirements.' },
    { id: 'grade', label: 'Ground at a foundation', group: 'Site', min: 1 / 20, minFace: '6" in 10\' (5%)',
      cite: 'IRC R401.3',
      note: 'Where lot lines or walls prevent the full fall, the IRC allows drains or swales instead.' },
    { id: 'paveNear', label: 'Paving within 10\' of a foundation', group: 'Site', min: 0.02, minFace: '2%',
      cite: 'IRC R401.3, exception', note: 'Impervious surfaces sloped away from the building.' },
    { id: 'pave', label: 'Paving, elsewhere', group: 'Site', min: 0.01, minFace: '1%',
      cite: 'Trade practice',
      note: 'An accessible route\'s cross slope may not exceed 1:48 (ADA 2010 403.3), The 1% value here is a drainage planning reference, not an ADA minimum.' }
  ];

  // IPC Table 704.1: 2-1/2" and smaller 1/4"/ft, 3"–6" 1/8"/ft, 8" and larger 1/16"/ft
  function dwvMin(nominal) {
    var n = nominalInches(nominal);
    if (n <= 2.5) return { min: Q, minFace: '1/4"/ft' };
    if (n < 8) return { min: E, minFace: '1/8"/ft' };
    return { min: S, minFace: '1/16"/ft' };
  }
  function nominalInches(s) {
    var m = /^(\d+)-(\d+)\/(\d+)$/.exec(s);
    if (m) return +m[1] + (+m[2]) / (+m[3]);
    m = /^(\d+)\/(\d+)$/.exec(s);
    if (m) return +m[1] / +m[2];
    return +s;
  }

  function itemById(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }

  function minFor(item, nominal) {
    if (!item) throw new TypeError('minFor: no item');
    if (item.id === 'dwv') {
      if (item.pipes.indexOf(nominal) < 0) throw new TypeError('minFor: no DWV size ' + nominal);
      var d = dwvMin(nominal);
      return { min: d.min, max: null, minFace: d.minFace, maxFace: null, cite: item.cite };
    }
    return { min: item.min, max: item.max || null, minFace: item.minFace, maxFace: item.maxFace || null, cite: item.cite };
  }

  function odUnits(material, nominal) {
    var m = MATERIALS[material];
    if (!m) throw new TypeError('odUnits: unknown material ' + material);
    var od = m.od[nominal];
    return od == null ? null : Math.round(od * IN);
  }

  function isLen(u) { return Number.isSafeInteger(u) && u >= 0; }
  function heightUsed(drop, od, allow) {
    if (!isLen(drop) || !isLen(od) || !isLen(allow)) throw new TypeError('heightUsed: lengths must be non-negative safe integers');
    return drop + od + allow;
  }
  function dropFrom(height, od, allow) {
    if (!isLen(height) || !isLen(od) || !isLen(allow)) throw new TypeError('dropFrom: lengths must be non-negative safe integers');
    return height - od - allow;
  }

  function roundDrop(drop, inc) {
    if (!Number.isSafeInteger(drop) || drop < 0) throw new TypeError('roundDrop: drop must be a non-negative safe integer, got ' + drop);
    if (!Number.isSafeInteger(inc) || inc <= 0) throw new TypeError('roundDrop: inc must be a positive safe integer, got ' + inc);
    var q = Math.floor(drop / inc), r = drop - q * inc;
    var down = q * inc, up = r === 0 ? down : down + inc;
    return { down: down, near: r * 2 >= inc ? up : down, up: up };
  }

  // a drop that lands on the minimum by construction (lattice rounding) must
  // not read as under it
  function check(ratio, min, max) {
    var tol = 1e-6;
    if (min != null && ratio < min * (1 - tol)) return 'under';
    if (max != null && ratio > max * (1 + tol)) return 'over';
    return 'ok';
  }

  return {
    IN: IN, ITEMS: ITEMS, MATERIALS: MATERIALS,
    itemById: itemById, minFor: minFor, odUnits: odUnits, nominalInches: nominalInches,
    heightUsed: heightUsed, dropFrom: dropFrom, roundDrop: roundDrop, check: check
  };
});

/* headless entry: `node drain.js` runs the acceptance tests */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var D = module.exports;
  var pass = 0, fail = 0;
  function eq(label, got, want) {
    var ok = typeof want === 'number' ? Math.abs(got - want) < 1e-9 : JSON.stringify(got) === JSON.stringify(want);
    if (ok) pass++; else { fail++; console.log('FAIL ' + label + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
  }
  function threw(label, fn) {
    var t = false; try { fn(); } catch (e) { t = true; }
    if (t) pass++; else { fail++; console.log('FAIL ' + label + ': expected throw'); }
  }
  var IN = D.IN, FT = 12 * IN;
  var dwv = D.itemById('dwv');

  // IPC Table 704.1 bands
  eq('2" at 1/4', D.minFor(dwv, '2').min, 1 / 48);
  eq('1-1/2" at 1/4', D.minFor(dwv, '1-1/2').minFace, '1/4"/ft');
  eq('3" at 1/8', D.minFor(dwv, '3').min, 1 / 96);
  eq('6" at 1/8', D.minFor(dwv, '6').min, 1 / 96);
  eq('8" at 1/16', D.minFor(dwv, '8').min, 1 / 192);
  threw('unknown size throws', function () { D.minFor(dwv, '5'); });
  eq('shower max', D.minFor(D.itemById('shower')).max, 1 / 24);
  eq('grade 6 in 10', D.minFor(D.itemById('grade')).min, 0.05);
  eq('every item has a cite', D.ITEMS.every(function (i) { return !!i.cite; }), true);
  eq('every non-DWV item has a min', D.ITEMS.every(function (i) { return i.id === 'dwv' || i.min > 0; }), true);
  eq('nominal 1-1/2', D.nominalInches('1-1/2'), 1.5);
  eq('nominal 3/4', D.nominalInches('3/4'), 0.75);

  // outside diameters
  eq('4" PVC OD', D.odUnits('pvc', '4'), 4.5 * IN);
  eq('4" CI OD', D.odUnits('ci', '4'), Math.round(4.38 * IN));
  eq('3/4 CI none', D.odUnits('ci', '3/4'), null);
  eq('every piped size has a PVC OD', D.ITEMS.filter(function (i) { return i.piped; }).every(function (i) {
    return i.pipes.every(function (p) { return D.odUnits('pvc', p) != null; });
  }), true);
  threw('unknown material throws', function () { D.odUnits('clay', '4'); });

  // height arithmetic — 30' of 4" PVC at 1/8"/ft: 3.75" drop + 4.5" OD
  var drop = 30 * FT / 96;
  eq('drop 30ft at 1/8', drop, 3.75 * IN);
  eq('height used', D.heightUsed(drop, D.odUnits('pvc', '4'), 0), 8.25 * IN);
  eq('with allowance', D.heightUsed(drop, D.odUnits('pvc', '4'), IN), 9.25 * IN);
  eq('drop from height', D.dropFrom(10 * IN, 4.5 * IN, IN), 4.5 * IN);
  eq('nothing fits', D.dropFrom(4 * IN, 4.5 * IN, 0) < 0, true);
  threw('negative throws', function () { D.heightUsed(-1, 0, 0); });

  // rounding at 1/8"
  var e = IN / 8;
  eq('on step', D.roundDrop(3 * e, e), { down: 3 * e, near: 3 * e, up: 3 * e });
  eq('below half', D.roundDrop(3 * e + 1, e), { down: 3 * e, near: 3 * e, up: 4 * e });
  eq('half rounds up', D.roundDrop(3 * e + e / 2, e).near, 4 * e);
  threw('zero inc throws', function () { D.roundDrop(5, 0); });

  // checks
  eq('on min ok', D.check(1 / 96, 1 / 96, null), 'ok');
  eq('a hair under ok', D.check(1 / 96 * (1 - 1e-9), 1 / 96, null), 'ok');
  eq('under', D.check(1 / 100, 1 / 96, null), 'under');
  eq('over max', D.check(1 / 20, 1 / 48, 1 / 24), 'over');
  eq('no limits', D.check(0.5, null, null), 'ok');

  console.log('=== drain: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
}
