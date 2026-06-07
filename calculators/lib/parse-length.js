/* parse-length.js — text → canonical exact-integer length
   =========================================================================
   PURE MODULE. No DOM, no globals, no UI. Imported verbatim by convert.html
   and (later) DocCheck. The only rounding here is input quantization to the
   nearest unit at parse time; no snap, no conversion-out, no styling.

   CANONICAL UNIT — an exact integer count of 1/960 mm (the `units` field).
     1 mm = 960   ·   1 in = 24384 (2^6·3·127)   ·   1 ft = 292608
     1 cm = 9600  ·   1 m  = 960000
   Every grid the converter can output is an exact lattice point, so a snapped
   result is exact, never an approximation. value_mm = units / 960 is a derived
   display convenience.

   THREE INTERNAL STAGES (folded behind one public parseLength):
     1a  tokenizer + single-term parser + glyph normalization (+ source map)
     1b  recursive-descent evaluator: + - * /, parens, unit-aware dimensions
     1c  interpretation echo (terms/canonical/assumptions) + spans

   PUBLIC CONTRACT
     parseLength(input, { defaultUnit: "in" | "mm" })
       → { units, value_mm, sign, dimension, original, unitSystem,
           interpretation: { terms, canonical, assumptions }, spans }
       | null     (only when no dimensional content exists at all)
   ========================================================================= */

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.ParseLength = mod; root.parseLength = mod.parseLength; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---- unit constants (exact integers, never derived from decimals) ---- */
  var MM = 960, CM = 9600, M = 960000, IN = 24384, FT = 12 * IN; // FT = 292608

  var UNIT_TABLE = {
    "'":  { units: FT, system: 'imperial', name: 'ft', kind: 'ft' },
    'ft': { units: FT, system: 'imperial', name: 'ft', kind: 'ft' },
    '"':  { units: IN, system: 'imperial', name: 'in', kind: 'in' },
    'in': { units: IN, system: 'imperial', name: 'in', kind: 'in' },
    'mm': { units: MM, system: 'metric',   name: 'mm', kind: 'mm' },
    'cm': { units: CM, system: 'metric',   name: 'cm', kind: 'cm' },
    'm':  { units: M,  system: 'metric',   name: 'm',  kind: 'm'  }
  };

  /* round half away from zero, integer division by q>0 */
  function roundDiv(p, q) {
    var a = Math.abs(p);
    var r = Math.floor((2 * a + q) / (2 * q));
    return p < 0 ? -r : r;
  }

  /* ====================================================================
     1a — GLYPH NORMALIZATION + SOURCE MAP
     Emits normalized text plus per-char maps back to ORIGINAL indices, so
     every span (1c) is reported in original-input coordinates even though
     `3′ 4½″` collapses to `3' 4 1/2"`. This is the load-bearing piece.
     ==================================================================== */

  var FRACTION_GLYPHS = {
    '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4',
    '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5',
    '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅐': '1/7',
    '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
    '⅑': '1/9', '⅒': '1/10'
  };
  var CHAR_GLYPHS = {
    '′': "'", '″': '"',            // prime, double-prime
    '‘': "'", '’': "'",            // smart single quotes
    '“': '"', '”': '"',            // smart double quotes
    '−': '-',                            // minus sign
    '×': '*', '∗': '*', 'x': '*', 'X': '*', // multiplication: ×, asterisk, and ascii x
    '÷': '/',                            // division sign
    ' ': ' '                             // non-breaking space
  };

  function isWs(c) { return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v'; }

  // → { text, os, oe } where os[i]/oe[i] are the original [start,end) for
  // normalized char i. A normalized range [a,b) maps to original [os[a], oe[b-1]).
  function normalize(input) {
    var raw = [];
    for (var k = 0; k < input.length; k++) {
      var c = input[k];
      if (FRACTION_GLYPHS.hasOwnProperty(c)) {
        var rep = FRACTION_GLYPHS[c];
        // "4½" must become "4 1/2" (mixed), not "41/2" (=20.5): insert a
        // separating space when a digit immediately precedes the glyph.
        var prev = raw.length ? raw[raw.length - 1].ch : '';
        if (/[0-9]/.test(prev)) raw.push({ ch: ' ', os: k, oe: k + 1, ws: false });
        for (var j = 0; j < rep.length; j++) raw.push({ ch: rep[j], os: k, oe: k + 1, ws: false });
      } else if (CHAR_GLYPHS.hasOwnProperty(c)) {
        var rc = CHAR_GLYPHS[c];
        raw.push({ ch: rc, os: k, oe: k + 1, ws: rc === ' ' });
      } else if (isWs(c)) {
        raw.push({ ch: ' ', os: k, oe: k + 1, ws: true });
      } else {
        raw.push({ ch: c, os: k, oe: k + 1, ws: false });
      }
    }
    // collapse whitespace runs to a single space; trim leading/trailing
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      if (raw[i].ws) {
        var s = raw[i].os, e = raw[i].oe;
        while (i + 1 < raw.length && raw[i + 1].ws) { i++; e = raw[i].oe; }
        if (out.length > 0) out.push({ ch: ' ', os: s, oe: e }); // drop leading
      } else {
        out.push({ ch: raw[i].ch, os: raw[i].os, oe: raw[i].oe });
      }
    }
    while (out.length && out[out.length - 1].ch === ' ') out.pop(); // trailing
    var text = '', os = [], oe = [];
    for (var t = 0; t < out.length; t++) { text += out[t].ch; os.push(out[t].os); oe.push(out[t].oe); }
    return { text: text, os: os, oe: oe };
  }

  /* ====================================================================
     1a — NUMBER + UNIT + TERM readers (operate on normalized text)
     ==================================================================== */

  // → { num, den, end } | null   (exact rational; decimals become n/10^k)
  function readNumber(s, i) {
    var rest = s.slice(i);
    var m;
    // mixed number: whole, then a space OR a dash, then a fraction
    // (e.g. "4 1/2", "40 1/2", "8-1/2"). The dash binds whole+fraction here —
    // people write 8-1/2" for eight-and-a-half. Subtracting a fraction needs a
    // unit on the left (8"-1/2"), which has its own unit so never reaches here.
    m = /^(\d+)(?:\s*-\s*|\s+)(\d+)\/(\d+)/.exec(rest);
    if (m) {
      var w = +m[1], n = +m[2], d = +m[3];
      return { num: w * d + n, den: d, end: i + m[0].length };
    }
    // fraction literal: int/int   (e.g. "1/2", "3/12", "7/16")
    m = /^(\d+)\/(\d+)/.exec(rest);
    if (m) return { num: +m[1], den: +m[2], end: i + m[0].length };
    // decimal or integer
    m = /^(\d+)\.(\d+)/.exec(rest);
    if (m) {
      var den = Math.pow(10, m[2].length);
      return { num: (+m[1]) * den + (+m[2]), den: den, end: i + m[0].length };
    }
    m = /^\.(\d+)/.exec(rest);
    if (m) {
      var den2 = Math.pow(10, m[1].length);
      return { num: +m[1], den: den2, end: i + m[0].length };
    }
    m = /^(\d+)\./.exec(rest);            // trailing dot: "40."
    if (m) return { num: +m[1], den: 1, end: i + m[0].length };
    m = /^(\d+)/.exec(rest);
    if (m) return { num: +m[1], den: 1, end: i + m[0].length };
    return null;
  }

  // unit immediately after a number, with an optional single separating space.
  // → { unit, info, end } | null   (does NOT consume the space if no unit follows)
  function readUnit(s, i) {
    var j = i;
    if (s[j] === ' ') j++;
    var m = /^(mm|cm|ft|in|m|'|")/i.exec(s.slice(j));
    if (!m) return null;
    var key = m[0].toLowerCase();
    return { unit: key, info: UNIT_TABLE[key], end: j + m[0].length };
  }

  // Read one dimensional term starting at a digit/dot. Handles foot-inch
  // compounds (at most one foot + one inch component) and flags conflicts.
  // → { end, value } | null     value = { conflict:true } on contradiction
  function readTerm(s, i) {
    var num1 = readNumber(s, i);
    if (!num1) return null;
    var u1 = readUnit(s, num1.end);
    var p = u1 ? u1.end : num1.end;
    var atoms = [{ num: num1, info: u1 ? u1.info : null, start: i, end: p }];

    // compound continuation only after a feet component
    if (u1 && u1.info.kind === 'ft') {
      while (true) {
        var q = p;
        var sep = /^[ -]+/.exec(s.slice(q)); // foot-inch separator: spaces and/or a dash
        if (sep) q += sep[0].length;
        var num2 = readNumber(s, q);
        if (!num2) break;                    // nothing more → term ends (separator not consumed)
        var u2 = readUnit(s, num2.end);
        var isInch = !u2 || u2.info.kind === 'in';   // unitless after feet → inches
        var hasDash = !!sep && sep[0].indexOf('-') !== -1;
        // a '-' before a NON-inch component is subtraction, not a foot-inch
        // separator: 7'-1' is 7 ft − 1 ft = 6 ft, not a conflicting compound.
        // (Spaces before feet stay a conflict: 3' 4' 5" — see validation below.)
        if (!isInch && hasDash) break;
        var a2end = u2 ? u2.end : num2.end;
        atoms.push({ num: num2, info: u2 ? u2.info : null, start: q, end: a2end });
        p = a2end;
      }
    }

    // ---- validate atom shape ----
    var conflict = false;
    if (atoms.length === 1) {
      // single atom, fine
    } else if (atoms.length === 2) {
      var second = atoms[1].info;
      // second must be inches (explicit) or unitless (assumed inches)
      if (second && second.kind !== 'in') conflict = true;
    } else {
      conflict = true; // 3+ components in one term (e.g. "3' 4' 5\"")
    }
    if (conflict) return { end: p, value: { conflict: true } };

    // ---- compute exact units (single, or feet+inch) ----
    var ft = atoms[0];
    var inch = atoms.length === 2 ? atoms[1] : null;
    var system, finestUnit, unitHint, inferredUnit = false, units, raw, hadUnit;

    if (inch) {
      // feet + inches: combine over common denominator, then quantize once
      var A = ft.num.num * FT * inch.num.den;
      var B = inch.num.num * IN * ft.num.den;
      var D = ft.num.den * inch.num.den;
      units = roundDiv(A + B, D);
      if (!atoms[1].info) inferredUnit = true; // inch unit was assumed
      return { end: p, value: termValue(units, 'imperial', 'in', 'ft+in', false, inferredUnit, true) };
    }

    var info = ft.info;
    if (info) {
      units = roundDiv(ft.num.num * info.units, ft.num.den);
      return { end: p, value: termValue(units, info.system, info.name, info.name, false, false, true) };
    }
    // bare number — unit unknown, resolved later by context/default
    return {
      end: p,
      value: {
        kind: 'bare',
        num: ft.num.num, den: ft.num.den,
        dim: null, units: null,
        finestUnit: null, system: null, unitHint: null,
        hadUnit: false
      }
    };
  }

  function termValue(units, system, finestUnit, unitHint, isBare, inferredUnit, hadUnit) {
    return {
      kind: 'length', units: units, dim: 1,
      system: system, finestUnit: finestUnit, unitHint: unitHint,
      inferredUnit: !!inferredUnit, hadUnit: !!hadUnit
    };
  }

  /* ====================================================================
     1b — TOKENIZER (over normalized text)
     Emits term / op / paren / junk tokens. Fraction bars and foot-inch
     dashes are consumed INSIDE readTerm, so any '/' or '-' seen here at top
     level is an operator, never a literal.
     ==================================================================== */

  function tokenize(s) {
    var toks = [];
    var i = 0, n = s.length;
    while (i < n) {
      var c = s[i];
      if (c === ' ') { i++; continue; }
      if (c === '(') { toks.push({ type: 'lparen', ns: i, ne: i + 1 }); i++; continue; }
      if (c === ')') { toks.push({ type: 'rparen', ns: i, ne: i + 1 }); i++; continue; }
      if (c === '+' || c === '-' || c === '*' || c === '/') {
        toks.push({ type: 'op', op: c, ns: i, ne: i + 1 }); i++; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) {
        var t = readTerm(s, i);
        if (t) { toks.push({ type: 'term', value: t.value || t, ns: i, ne: t.end }); i = t.end; continue; }
      }
      // junk: a run of characters that is not whitespace/operator/paren/number-start
      var start = i;
      while (i < n) {
        var d = s[i];
        if (d === ' ' || d === '(' || d === ')' || d === '+' || d === '-' || d === '*' || d === '/') break;
        if (/[0-9]/.test(d) || (d === '.' && /[0-9]/.test(s[i + 1] || ''))) break;
        i++;
      }
      if (i === start) i++; // safety
      toks.push({ type: 'junk', ns: start, ne: i });
    }
    return toks;
  }

  /* ====================================================================
     1b — VALUE ALGEBRA (unit-aware dimensions)
     ==================================================================== */

  var NULL_AREA = { kind: 'null', dim: 2, note: 'area (dimension 2) — out of scope for the length tool' };
  var NULL_INV  = { kind: 'null', dim: -1, note: 'inverse length (dimension -1) — out of scope' };

  function isNum(v) { return v && (v.kind === 'length' || v.kind === 'bare' || v.kind === 'scalar' || v.kind === 'ratio'); }
  function bareScalarNumDen(v) {
    if (v.kind === 'bare' || v.kind === 'scalar') return { num: v.num, den: v.den };
    if (v.kind === 'ratio') return { num: v.ratioNum, den: v.ratioDen };
    return null;
  }

  function negate(v) {
    if (!v) return v;
    if (v.kind === 'length') return assign({}, v, { units: -v.units });
    if (v.kind === 'bare' || v.kind === 'scalar') return assign({}, v, { num: -v.num });
    if (v.kind === 'ratio') return assign({}, v, { ratio: -v.ratio, ratioNum: -v.ratioNum, count: -v.count });
    return v;
  }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var o = arguments[i]; for (var k in o) if (o.hasOwnProperty(k)) t[k] = o[k]; } return t; }

  // finer = smaller unit count
  function finerUnitName(a, b) {
    if (!a) return b; if (!b) return a;
    return UNIT_TABLE[a].units <= UNIT_TABLE[b].units ? a : b;
  }

  /* ---- multiplicative fold ---- */
  function markScalar(v) { if (v && v.kind === 'bare') v._role = 'scalar'; }

  function applyMul(op, left, right) {
    if (left.kind === 'null') return left;
    if (right.kind === 'null') return right;
    var lLen = left.kind === 'length', rLen = right.kind === 'length';

    if (op === '*') {
      if (lLen && rLen) return NULL_AREA;
      if (lLen || rLen) {
        var len = lLen ? left : right;
        var sc = lLen ? right : left;
        markScalar(sc);
        var s = bareScalarNumDen(sc);
        return assign({}, len, { units: roundDiv(len.units * s.num, s.den) });
      }
      // scalar * scalar
      markScalar(left); markScalar(right);
      var a = bareScalarNumDen(left), b = bareScalarNumDen(right);
      return { kind: 'bare', num: a.num * b.num, den: a.den * b.den, dim: 0, _role: 'scalar' };
    }
    // op === '/'
    if (lLen && rLen) {
      return ratioOf(left.units, right.units);
    }
    if (lLen && !rLen) { // length ÷ scalar → n-section length
      markScalar(right);
      var s2 = bareScalarNumDen(right);
      return assign({}, left, { units: roundDiv(left.units * s2.den, s2.num) });
    }
    if (!lLen && rLen) return NULL_INV; // scalar ÷ length
    // scalar ÷ scalar
    markScalar(left); markScalar(right);
    var la = bareScalarNumDen(left), rb = bareScalarNumDen(right);
    return { kind: 'bare', num: la.num * rb.den, den: la.den * rb.num, dim: 0, _role: 'scalar' };
  }

  // length ÷ length → dimensionless "how many fit" (+ exact ratio)
  function ratioOf(aUnits, bUnits) {
    var sign = (aUnits < 0) !== (bUnits < 0) ? -1 : 1;
    var A = Math.abs(aUnits), B = Math.abs(bUnits);
    var count = B === 0 ? 0 : Math.floor(A / B);
    var rem = B === 0 ? 0 : A % B;
    return {
      kind: 'ratio', dim: 0,
      ratio: bUnits === 0 ? 0 : aUnits / bUnits,
      ratioNum: aUnits, ratioDen: bUnits,
      count: sign * count, remainder_units: rem
    };
  }

  /* ---- additive fold with bare-unit inheritance ----
     operands: array of value objects; ops: array of '+'/'-' (length = operands-1)
     A bare operand inherits the finest STATED unit in the additive run;
     if none is stated, it takes defaultUnit. */
  function applyAdd(operands, ops, defaultUnit) {
    // bubble up null/area
    for (var z = 0; z < operands.length; z++) if (operands[z].kind === 'null') return operands[z];

    // the finest stated unit of each operand (null if it isn't a stated length),
    // plus the run-wide system + overall finest (for the result's own labels)
    var statedAt = operands.map(function (v) { return v.kind === 'length' ? v.finestUnit : null; });
    var anyLength = false, system = null, finestOverall = null;
    operands.forEach(function (v) {
      if (v.kind === 'length') {
        anyLength = true;
        finestOverall = finerUnitName(finestOverall, v.finestUnit);
        system = system === null ? v.system : (system === v.system ? system : 'mixed');
      }
    });

    // a bare inherits the unit of its NEAREST stated term — previous if any,
    // else the next — not the finest in the whole run. So in `8 - 1/2" + 11cm`
    // the leading 8 takes inches (the adjacent inch term), not cm.
    function nearestUnit(i) {
      for (var d = 1; d < operands.length; d++) {
        if (i - d >= 0 && statedAt[i - d]) return statedAt[i - d];   // previous wins ties
        if (i + d < operands.length && statedAt[i + d]) return statedAt[i + d];
      }
      return null;
    }

    // resolve bares → lengths (annotate the ORIGINAL bare so the 1c echo can
    // show its inherited unit, then return the resolved length value)
    var resolved = operands.map(function (v, i) {
      if (v.kind === 'length') return v;
      if (v.kind === 'bare') {
        var name = (anyLength ? nearestUnit(i) : null) || defaultUnit;
        var info = UNIT_TABLE[name];
        var u = roundDiv(v.num * info.units, v.den);
        v._role = 'length'; v._resolvedUnit = name; v._resolvedUnits = u;
        return {
          kind: 'length', dim: 1,
          units: u,
          system: info.system, finestUnit: name, unitHint: name,
          inferredUnit: true, hadUnit: false
        };
      }
      return v; // ratio/scalar left as-is (rare in additive)
    });

    var acc = resolved[0];
    if (acc.kind !== 'length') return acc;
    for (var k = 0; k < ops.length; k++) {
      var rhs = resolved[k + 1];
      if (rhs.kind !== 'length') continue;
      var u = ops[k] === '-' ? acc.units - rhs.units : acc.units + rhs.units;
      acc = assign({}, acc, { units: u });
    }
    var resolveName = finestOverall || defaultUnit;
    if (!anyLength) {
      acc = assign({}, acc, { system: UNIT_TABLE[defaultUnit].system, finestUnit: resolveName });
    } else {
      acc = assign({}, acc, { system: system, finestUnit: resolveName });
    }
    return acc;
  }

  /* ====================================================================
     1b — RECURSIVE-DESCENT PARSER
     Tolerant: a dangling operator or missing operand is marked pending,
     never thrown. Records token status (parsed / pending) as a side effect.
     ==================================================================== */

  function evaluate(toks, defaultUnit) {
    var pos = 0;
    var status = new Array(toks.length); // 'parsed' | 'pending' | undefined
    function peek() { return toks[pos]; }
    function markUsed(idx) { if (status[idx] === undefined) status[idx] = 'parsed'; }

    function parseExpr() { return parseAdd(); }

    // each parse fn returns null, or { value, node } where node is a display
    // AST: { t:'term', value, tok } | { t:'un', op, x } | { t:'bin', op, l, r }
    // an adjacent term (no operator) in a FINER unit of the same system is an
    // implicit sum — the metric analogue of the foot-inch compound, so
    // "24m 105mm" reads 24 m + 105 mm rather than dropping the 105 mm.
    function finerSameSystem(prevVal, tok) {
      if (!tok || tok.type !== 'term') return false;
      var v = tok.value;
      if (!v || v.kind !== 'length' || !v.hadUnit) return false;
      if (!prevVal || prevVal.kind !== 'length' || !prevVal.hadUnit) return false;
      if (prevVal.system !== v.system) return false;
      return UNIT_TABLE[v.finestUnit].units < UNIT_TABLE[prevVal.finestUnit].units;
    }

    function parseAdd() {
      var first = parseMul();
      if (first === null) return null;
      var operands = [first.value], ops = [], node = first.node;
      while (peek()) {
        var nx = peek();
        if (nx.type === 'op' && (nx.op === '+' || nx.op === '-')) {
          var oi = pos; var op = nx.op; pos++;
          var rhs = parseMul();
          if (rhs === null) { status[oi] = 'pending'; pos = oi; break; } // dangling operator
          markUsed(oi);
          operands.push(rhs.value); ops.push(op);
          node = { t: 'bin', op: op, l: node, r: rhs.node };
        } else if (finerSameSystem(operands[operands.length - 1], nx)) {
          var rhs2 = parseMul();
          if (rhs2 === null) break;
          operands.push(rhs2.value); ops.push('+');
          node = { t: 'bin', op: '+', l: node, r: rhs2.node };
        } else break;
      }
      if (operands.length === 1) return first;
      return { value: applyAdd(operands, ops, defaultUnit), node: node };
    }

    function parseMul() {
      var left = parseUnary();
      if (left === null) return null;
      var value = left.value, node = left.node;
      while (peek() && peek().type === 'op' && (peek().op === '*' || peek().op === '/')) {
        var oi = pos; var op = peek().op; pos++;
        var right = parseUnary();
        if (right === null) { status[oi] = 'pending'; pos = oi; break; }
        markUsed(oi);
        value = applyMul(op, value, right.value);
        node = { t: 'bin', op: op, l: node, r: right.node };
      }
      return { value: value, node: node };
    }

    function parseUnary() {
      if (peek() && peek().type === 'op' && (peek().op === '+' || peek().op === '-')) {
        var oi = pos; var op = peek().op; pos++;
        var operand = parseUnary();
        if (operand === null) { status[oi] = 'pending'; pos = oi; return null; }
        markUsed(oi);
        return { value: op === '-' ? negate(operand.value) : operand.value, node: { t: 'un', op: op, x: operand.node } };
      }
      return parsePrimary();
    }

    function parsePrimary() {
      var t = peek();
      if (!t) return null;
      if (t.type === 'lparen') {
        var open = pos; pos++;
        var inner = parseExpr();
        if (peek() && peek().type === 'rparen') { markUsed(open); markUsed(pos); pos++; }
        else if (open < toks.length) { status[open] = 'pending'; }
        return inner;
      }
      if (t.type === 'term') {
        if (t.value && t.value.conflict) { status[pos] = 'pending'; pos++; return null; }
        var ti = pos; markUsed(pos); pos++;
        return { value: t.value, node: { t: 'term', value: t.value, tok: ti } };
      }
      return null; // op/junk/rparen here → caller handles
    }

    var top = parseExpr();
    // any token never visited, or junk, is pending
    for (var i = 0; i < toks.length; i++) {
      if (toks[i].type === 'junk') status[i] = 'pending';
      else if (status[i] === undefined) status[i] = 'pending';
    }
    return { result: top ? top.value : null, node: top ? top.node : null, status: status };
  }

  /* ====================================================================
     1c — INTERPRETATION + SPANS (original-input coordinates)
     ==================================================================== */

  function buildSpans(toks, status, os, oe) {
    var spans = [];
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      var st = status[i] === 'parsed' ? 'parsed' : 'pending';
      spans.push({ start: os[t.ns], end: oe[t.ne - 1], status: st });
    }
    // merge adjacent same-status spans
    var merged = [];
    for (var j = 0; j < spans.length; j++) {
      var last = merged[merged.length - 1];
      if (last && last.status === spans[j].status && spans[j].start <= last.end + 1) {
        last.end = Math.max(last.end, spans[j].end);
      } else merged.push({ start: spans[j].start, end: spans[j].end, status: spans[j].status });
    }
    return merged;
  }

  function unitLabel(name) {
    return name === 'ft+in' ? 'ft + in' : name;
  }

  function termIsInferred(v) {
    if (v.kind === 'length') return !!v.inferredUnit;     // e.g. assumed-inches compound
    if (v.kind === 'bare') return v._role === 'length';   // a bare that became a length
    return false;
  }

  function termEcho(v, original, tk) {
    if (v.kind === 'length') return formatLengthEcho(v);
    if (v.kind === 'bare') {
      if (v._role === 'length' && v._resolvedUnit) return trimNum(v.num / v.den) + ' ' + v._resolvedUnit;
      return trimNum(v.num / v.den); // bare scalar multiplier
    }
    return original.slice(tk._os, tk._oe).trim();
  }

  // node precedence: term/unary bind tightest, then * /, then + -
  function nodePrec(n) {
    if (n.t === 'term') return 4;
    if (n.t === 'un') return 3;
    return (n.op === '*' || n.op === '/') ? 2 : 1;
  }

  // Print the AST to echo parts, adding parentheses around higher-precedence
  // sub-expressions so the reading is unambiguous — `7'-1'/2` echoes as
  // `7 ft − (1 ft ÷ 2)`, not the flat `7 ft − 1 ft ÷ 2` a reader can misgroup.
  function printNode(node, original) {
    if (!node) return [];
    if (node.t === 'term') {
      var v = node.value;
      return [{ type: 'term', text: termEcho(v, original, { _os: 0, _oe: 0 }), inferred: termIsInferred(v) }];
    }
    if (node.t === 'un') {
      var inner = printNode(node.x, original);
      if (nodePrec(node.x) < 3) inner = wrap(inner);
      return [{ type: 'op', text: node.op, unary: true }].concat(inner);
    }
    // binary
    var p = nodePrec(node);
    var lp = printNode(node.l, original);
    var rp = printNode(node.r, original);
    var lprec = nodePrec(node.l), rprec = nodePrec(node.r);
    if (p === 1) {                                  // under + - : parenthesise any * / child for clarity
      if (lprec === 2 || lprec < p) lp = wrap(lp);
      if (rprec === 2 || rprec < p || (rprec === p && node.op === '-')) rp = wrap(rp);
    } else {                                        // under * / : only the minimal necessary parens
      if (lprec < p) lp = wrap(lp);
      if (rprec < p || (rprec === p && node.op === '/')) rp = wrap(rp);
    }
    return lp.concat([{ type: 'op', text: node.op }]).concat(rp);
  }
  function wrap(parts) {
    return [{ type: 'paren', text: '(' }].concat(parts).concat([{ type: 'paren', text: ')' }]);
  }

  function buildInterpretation(toks, status, node, original, defaultUnit) {
    var terms = [], assumptions = [];
    var ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
    var ti = 0;

    // terms[] + assumptions are derived from the leaf term tokens (also the
    // signal convert.html uses to detect a stated system)
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.type !== 'term' || status[i] !== 'parsed') continue;
      var v = t.value;
      if (v && v.conflict) continue;
      var inferred = termIsInferred(v);
      var unit = v.kind === 'length' ? unitLabel(v.finestUnit)
               : (v.kind === 'bare' && v._role === 'length' ? v._resolvedUnit : '');
      var value_mm = v.kind === 'length' ? v.units / 960
                   : (v.kind === 'bare' && v._resolvedUnits != null ? v._resolvedUnits / 960 : null);
      terms.push({
        raw: original.slice(t._os, t._oe).trim(),
        value_mm: value_mm,
        unit: unit,
        role: (v.kind === 'length' || (v.kind === 'bare' && v._role === 'length')) ? 'length' : 'scalar',
        inferred: inferred
      });
      if (inferred) assumptions.push((ord[ti] || (ti + 1) + 'th') + ' term assumed ' + (unit || defaultUnit) + '.');
      ti++;
    }

    // parts (the styled, precedence-grouped echo) come from the AST
    var parts = printNode(node, original);
    var canonical = parts.map(function (p) { return p.text; }).join(' ')
                         .replace(/\(\s/g, '(').replace(/\s\)/g, ')');
    return { terms: terms, canonical: canonical, parts: parts, assumptions: assumptions };
  }

  function trimNum(v) { return String(Math.round(v * 10000) / 10000); }

  function formatLengthEcho(v) {
    if (v.unitHint === 'ft+in') {
      var feet = Math.trunc(v.units / FT);
      var rest = v.units - feet * FT;
      var inches = rest / IN;
      if (inches === 0) return feet + ' ft';
      return feet + ' ft ' + trimNum(inches) + ' in';
    }
    var name = v.finestUnit;
    var info = UNIT_TABLE[name] || UNIT_TABLE[v.system === 'metric' ? 'mm' : 'in'];
    return trimNum(v.units / info.units) + ' ' + name;
  }

  /* ====================================================================
     PUBLIC ENTRY
     ==================================================================== */

  function parseLength(input, opts) {
    if (input == null) return null;
    var defaultUnit = (opts && opts.defaultUnit) || 'in';
    if (defaultUnit !== 'in' && defaultUnit !== 'mm') defaultUnit = 'in';
    var original = String(input);

    var norm = normalize(original);
    var toks = tokenize(norm.text);

    // attach original-coordinate ranges to each token
    for (var i = 0; i < toks.length; i++) {
      toks[i]._os = norm.os[toks[i].ns];
      toks[i]._oe = norm.oe[toks[i].ne - 1];
    }

    // nothing dimensional at all → null
    var hasTerm = toks.some(function (t) { return t.type === 'term'; });
    if (!hasTerm) return null;

    var ev = evaluate(toks, defaultUnit);
    var value = ev.result;

    // a lone bare number (never folded through an additive run) resolves to
    // the default unit — this is the only place defaultUnit applies.
    if (value && value.kind === 'bare') {
      var di = UNIT_TABLE[defaultUnit];
      value._role = 'length'; value._resolvedUnit = defaultUnit;
      value._resolvedUnits = roundDiv(value.num * di.units, value.den);
      value = {
        kind: 'length', dim: 1,
        units: roundDiv(value.num * di.units, value.den),
        system: di.system, finestUnit: defaultUnit, unitHint: defaultUnit,
        inferredUnit: true, hadUnit: false
      };
    }

    var spans = buildSpans(toks, ev.status, norm.os, norm.oe);
    var interpretation = buildInterpretation(toks, ev.status, ev.node, original, defaultUnit);

    // area / inverse-length / other out-of-scope dimensions: resolved, but not a
    // length this tool handles. Return an object (not null) carrying the reading
    // and a note, so the page can SHOW why instead of going blank.
    if (value && value.kind === 'null') {
      return {
        units: null, value_mm: null, sign: 1, dimension: value.dim,
        original: original, unitSystem: 'mixed', note: value.note,
        interpretation: interpretation, spans: spans
      };
    }

    // a term existed but nothing resolved (e.g. conflicting compound) →
    // return an object with null units so the UI can show WHY (spans pending).
    if (!value || (value.kind !== 'length' && value.kind !== 'ratio')) {
      return {
        units: null, value_mm: null, sign: 1, dimension: 1,
        original: original, unitSystem: 'imperial',
        interpretation: interpretation, spans: spans
      };
    }

    if (value.kind === 'ratio') {
      return {
        units: null, value_mm: null,
        sign: value.ratio < 0 ? -1 : 1, dimension: 0,
        original: original, unitSystem: 'imperial',
        ratio: value.ratio, count: value.count, remainder_units: value.remainder_units,
        interpretation: interpretation, spans: spans
      };
    }

    // dim 1 length
    return {
      units: value.units,
      value_mm: value.units / 960,
      sign: value.units < 0 ? -1 : 1,
      dimension: 1,
      original: original,
      unitSystem: value.system || (defaultUnit === 'mm' ? 'metric' : 'imperial'),
      interpretation: interpretation,
      spans: spans
    };
  }

  return {
    parseLength: parseLength,
    normalize: normalize,
    UNITS: { MM: MM, CM: CM, M: M, IN: IN, FT: FT }
  };
});
