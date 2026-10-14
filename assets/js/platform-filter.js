/* platform-filter.js — the one "Runs on" filter on a software sheet
   (pdf-markup.html; the BIM pages next).

   The page reads in full without it: every tool row is
   static HTML, and the filter itself starts hidden. This script shows the
   filter and hides rows. Nothing here knows any tool by name.

   Controls: <button data-platform="win|mac|ipad|linux|web|all"
             data-on="on a Mac"> inside #platformFilter; "all" hides nothing.
   Rows:     any element with data-platforms (a space-separated list) inside
             a [data-platform-rows] container: each tool row lists every
             platform it runs on.
   Labels:   [data-platform-on] gets the chosen button's data-on (" on a
             Mac"), or nothing for "all". #platformCount counts the visible
             rows of the container marked data-platform-count, leaving
             out group headings (.s-group), which list their tools'
             platforms so they hide with them.

   The starting choice is the visitor's own platform when the browser names
   one (an iPad reports itself as a Mac with touch), else "all". A link or a
   page address pointing at a row the filter hides switches it to "all".
   The choice is not stored: privacy.html#storage promises the scheme key is
   the only thing written to the browser. */
(function () {
  'use strict';
  var bar = document.getElementById('platformFilter');
  if (!bar) return;
  var buttons = Array.prototype.slice.call(bar.querySelectorAll('button[data-platform]'));
  var rows = Array.prototype.slice.call(document.querySelectorAll('[data-platform-rows] [data-platforms]'));
  var counted = document.querySelector('[data-platform-count]');
  var tools = counted ? Array.prototype.slice.call(counted.querySelectorAll('[data-platforms]:not(.s-group)')) : [];
  var count = document.getElementById('platformCount');
  var labels = Array.prototype.slice.call(document.querySelectorAll('[data-platform-on]'));

  function guess() {
    var ua = navigator.userAgent || '';
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ipad';
    if (/Macintosh/.test(ua)) return 'mac';
    if (/Windows/.test(ua)) return 'win';
    if (/CrOS/.test(ua)) return 'web';
    if (/Linux/.test(ua) && !/Android/.test(ua)) return 'linux';
    return 'all';
  }

  function apply(p) {
    var on = '';
    buttons.forEach(function (b) {
      var pick = b.getAttribute('data-platform') === p;
      UI.press(b, pick);
      if (pick && p !== 'all') on = ' ' + b.getAttribute('data-on');
    });
    rows.forEach(function (r) {
      r.hidden = p !== 'all' && r.getAttribute('data-platforms').split(' ').indexOf(p) < 0;
    });
    labels.forEach(function (l) { l.textContent = on; });
    if (count) {
      var shown = tools.filter(function (t) { return !t.hidden; }).length;
      count.textContent = p === 'all' ? 'All ' + tools.length + ' tools'
        : shown + ' of ' + tools.length + ' tools run' + on;
    }
  }

  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-platform]');
    if (b) apply(b.getAttribute('data-platform'));
  });
  // A link to a row the filter hides (a shared link to another platform's
  // tool) switches the filter to All, so the link lands on its row.
  function hiddenRow(id) {
    var t = id && document.getElementById(id);
    var r = t && t.closest('[data-platforms]');
    return !!(r && r.hidden);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (a && hiddenRow(a.getAttribute('href').slice(1))) apply('all');
  });

  bar.hidden = false;
  apply(guess());
  var id = location.hash.slice(1);
  if (hiddenRow(id)) { apply('all'); document.getElementById(id).scrollIntoView(); }
})();
