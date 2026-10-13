/* chooser.js — the filter-and-sort behaviour shared by the software choosers
   (pdf-markup.html, bim-platforms.html, bim-emerging.html).

   Every item is a static <article class="tool"> in the page, so a chooser
   reads in full without JavaScript and is indexable. This script only hides
   and reorders those articles. Nothing here knows any tool by name.

   Controls (inside #controls), each a <button>:
     data-multi="<group>" data-value="<v>"
         a toggle; an item matches when its data-<group> (a space-separated
         list) contains EVERY selected value of that group
     data-single="<group>" data-value="<v>"
         one-of-a-row; "any" means no constraint. Three groups are special:
           price  any | nosub | free, read against data-price
                  (free / freemium / onetime / both / sub)
           sort   rank | price | name
           any other group: the item's data-<group> must contain the value
   Item attributes:
     data-rank          1 = most used (an editorial estimate, stated on the page)
     data-price-order   cheapest first, for the price sort
     data-name          lower-case sort key
     data-paid-needs    values of the "needs" group a freemium item meets only
                        on a subscription tier, so a price filter drops them
   Elements: #toolGrid, #resultCount, #noMatch, #resetFilters. */
(function () {
  'use strict';
  var controls = document.getElementById('controls');
  var grid = document.getElementById('toolGrid');
  if (!controls || !grid) return;
  var tools = Array.prototype.slice.call(grid.querySelectorAll('.tool'));
  var count = document.getElementById('resultCount');
  var noMatch = document.getElementById('noMatch');
  var reset = document.getElementById('resetFilters');
  var buttons = Array.prototype.slice.call(controls.querySelectorAll('button'));
  var multi = {}, single = {}, defaults = {};

  // the starting state is whatever the HTML marks pressed
  buttons.forEach(function (b) {
    if (b.dataset.multi) multi[b.dataset.multi] = multi[b.dataset.multi] || {};
    if (b.dataset.single && b.getAttribute('aria-pressed') === 'true') {
      single[b.dataset.single] = defaults[b.dataset.single] = b.dataset.value;
    }
  });

  function list(el, attr) { return (el.getAttribute(attr) || '').split(' ').filter(Boolean); }
  function selected(group) { return Object.keys(multi[group]).filter(function (k) { return multi[group][k]; }); }

  function priceOk(t) {
    var p = t.getAttribute('data-price'), want = single.price || 'any';
    if (want === 'free') return p === 'free' || p === 'freemium';
    if (want === 'nosub') return p !== 'sub';
    return true;
  }

  function matches(t) {
    var paid = list(t, 'data-paid-needs'), priced = (single.price || 'any') !== 'any';
    var multiOk = Object.keys(multi).every(function (g) {
      var have = list(t, 'data-' + g);
      return selected(g).every(function (v) {
        if (g === 'needs' && priced && paid.indexOf(v) >= 0) return false;
        return have.indexOf(v) >= 0;
      });
    });
    var singleOk = Object.keys(single).every(function (g) {
      if (g === 'sort' || g === 'price' || single[g] === 'any') return true;
      return list(t, 'data-' + g).indexOf(single[g]) >= 0;
    });
    return multiOk && singleOk && priceOk(t);
  }

  function apply() {
    var shown = 0, plats = multi.platforms ? selected('platforms') : [];
    tools.forEach(function (t) {
      var ok = matches(t);
      t.hidden = !ok;
      if (ok) shown++;
      // mark the platform chips that answer what was asked for
      Array.prototype.forEach.call(t.querySelectorAll('.tool-plats li'), function (li) {
        li.classList.toggle('is-match', plats.indexOf(li.getAttribute('data-p')) >= 0);
      });
    });

    var key = single.sort || 'rank';
    tools.slice().sort(function (a, b) {
      if (key === 'name') return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
      var d = key === 'price' ? (+a.getAttribute('data-price-order')) - (+b.getAttribute('data-price-order')) : 0;
      return d || (+a.getAttribute('data-rank')) - (+b.getAttribute('data-rank'));
    }).forEach(function (t) { grid.appendChild(t); });

    count.textContent = shown === tools.length ? tools.length + ' tools'
      : shown + ' of ' + tools.length + ' tools fit';
    noMatch.hidden = shown > 0;
    var filtered = Object.keys(multi).some(function (g) { return selected(g).length; }) ||
      Object.keys(single).some(function (g) { return g !== 'sort' && single[g] !== defaults[g]; });
    reset.hidden = !filtered;
  }

  controls.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.multi) {
      var g = multi[b.dataset.multi];
      g[b.dataset.value] = !g[b.dataset.value];
      UI.press(b, g[b.dataset.value]);
    } else if (b.dataset.single) {
      single[b.dataset.single] = b.dataset.value;
      buttons.forEach(function (x) { if (x.dataset.single === b.dataset.single) UI.press(x, x === b); });
    } else return;
    apply();
  });

  reset.addEventListener('click', function () {
    Object.keys(multi).forEach(function (g) { multi[g] = {}; });
    Object.keys(single).forEach(function (g) { if (g !== 'sort') single[g] = defaults[g]; });
    buttons.forEach(function (x) {
      if (x.dataset.multi) UI.press(x, false);
      else if (x.dataset.single && x.dataset.single !== 'sort') UI.press(x, x.dataset.value === single[x.dataset.single]);
    });
    apply();
  });
})();
