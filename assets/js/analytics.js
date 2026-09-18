/* Named Plausible events: Starter-compatible, no custom properties.
 * Each category is counted once per page load, after an actual interaction.
 * See docs/ANALYTICS.md for goal definitions and counting semantics. */
(function (root) {
  'use strict';
  var software = {
    revit: 'Revit', archicad: 'ArchiCAD', vectorworks: 'Vectorworks',
    sketchup: 'SketchUp', rhino: 'Rhino', autocad: 'AutoCAD',
    enscape: 'Enscape', lumion: 'Lumion', d5: 'D5 Render',
    twinmotion: 'TwinMotion', unreal: 'Unreal Engine', vray: 'V-Ray', corona: 'Corona'
  };
  var setups = {
    desktop: 'Desktop', laptop: 'Laptop', desktop_travel: 'Desktop + Travel Laptop',
    desktop_workstation: 'Desktop + Powerful Laptop'
  };
  var platforms = { win: 'Windows', mac: 'Mac' };
  var operations = { '+': 'Addition', '-': 'Subtraction', '*': 'Multiplication', '/': 'Division' };
  var systems = { metric: 'Metric', imperial: 'Imperial', mixed: 'Mixed' };
  var seen = Object.create(null);

  function once(name) {
    if (seen[name] || typeof root.plausible !== 'function') return;
    // Local previews and automated checks must never pollute production stats.
    if (!root.location || !/^(www\.)?architecture\.tools$/.test(root.location.hostname)) return;
    try {
      root.plausible(name);
      seen[name] = true;
    } catch (e) { /* Analytics must never interrupt the tools. */ }
  }

  function conversionEvents(result, target) {
    if (!result || !result.interpretation || !result.spans || !result.spans.length ||
        result.spans.some(function (s) { return s.status !== 'parsed'; })) return [];
    var kind;
    if (result.dimension === 1 && Number.isSafeInteger(result.units) && Math.abs(result.units) <= 96000000000) {
      if (!systems[result.unitSystem] || !validTarget(target)) return [];
      kind = systems[result.unitSystem] + ' to ' + systems[target];
    } else if (result.dimension === 2 && Number.isFinite(result.area_mm2) && Math.abs(result.area_mm2) <= 1e16) {
      kind = 'Area';
    } else if (result.dimension === 0 && Number.isFinite(result.ratio)) {
      kind = 'Ratio';
    } else return [];

    var events = ['Conversion Used', 'Conversion: ' + kind];
    // Parser tokens distinguish arithmetic from fractions, foot-inch hyphens,
    // and unary negatives. Never classify expressions by raw-text regexes.
    var ops = [];
    result.interpretation.parts.forEach(function (part) {
      if (part.type === 'op' && !part.unary && operations[part.text] && ops.indexOf(part.text) === -1) ops.push(part.text);
    });
    if (ops.length) {
      events.push('Expression Used');
      ops.forEach(function (op) { events.push('Expression: ' + operations[op]); });
      if (ops.length > 1) events.push('Expression: Combined');
    }
    return events;
  }

  function validTarget(target) { return target === 'metric' || target === 'imperial'; }

  var goals = ['Conversion Used', 'Picker Used', 'Expression Used', 'Expression: Combined'];
  Object.keys(systems).forEach(function (source) {
    ['metric', 'imperial'].forEach(function (target) { goals.push('Conversion: ' + systems[source] + ' to ' + systems[target]); });
  });
  goals.push('Conversion: Area', 'Conversion: Ratio');
  Object.keys(operations).forEach(function (op) { goals.push('Expression: ' + operations[op]); });
  Object.keys(software).forEach(function (id) { goals.push('Software: ' + software[id]); });
  Object.keys(setups).forEach(function (id) { goals.push('Setup: ' + setups[id]); });
  Object.keys(platforms).forEach(function (id) { goals.push('Platform: ' + platforms[id]); });

  root.SiteAnalytics = {
    goals: goals,
    conversionEvents: conversionEvents,
    conversion: function (result, target) { conversionEvents(result, target).forEach(once); },
    pickerUsed: function () { once('Picker Used'); },
    software: function (id) { if (software[id]) { once('Picker Used'); once('Software: ' + software[id]); } },
    setup: function (id) { if (setups[id]) { once('Picker Used'); once('Setup: ' + setups[id]); } },
    platform: function (id) { if (platforms[id]) { once('Picker Used'); once('Platform: ' + platforms[id]); } }
  };
})(typeof window === 'undefined' ? globalThis : window);
