/* ui.js — tiny shared helpers for page glue (no framework, no build).
   Loaded by every page after global.css; pure functions on window.UI. */
(function () {
  'use strict';

  // Escape a data-supplied string before it goes into innerHTML, so a stray
  // <, >, &, or quote renders as literal text instead of breaking the page
  // or injecting markup. Use at every innerHTML site; values placed via
  // textContent/setAttribute already escape themselves.
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Set a toggle button's selected state — the visual class and the
  // accessible state together, so they can never disagree.
  function press(el, on) {
    el.classList.toggle('active', !!on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  // ---- color scheme ------------------------------------------------------
  // Each page resolves the scheme before its first paint with a tiny inline
  // head script (it has to run before paint, so it can't live out here). This
  // is the part that can wait: the sun/moon key in the title block. It flips
  // html[data-scheme], persists the choice so it follows the reader across
  // pages, and fires `schemechange` on document for anything a page drew in
  // JS and must redraw (the picker's desk art). With no stored choice the
  // page keeps following the OS live.
  var KEY = 'scheme';

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function toggles() { return document.querySelectorAll('.scheme-toggle'); }
  function labelToggles() {
    var dark = document.documentElement.dataset.scheme === 'dark';
    Array.prototype.forEach.call(toggles(), function (btn) {
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
  function applyScheme(scheme, persist) {
    document.documentElement.dataset.scheme = scheme;
    if (persist) { try { localStorage.setItem(KEY, scheme); } catch (e) {} }
    labelToggles();
    document.dispatchEvent(new Event('schemechange'));
  }
  function wireScheme() {
    labelToggles();
    Array.prototype.forEach.call(toggles(), function (btn) {
      btn.addEventListener('click', function () {
        applyScheme(document.documentElement.dataset.scheme === 'dark' ? 'light' : 'dark', true);
      });
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!stored()) applyScheme(e.matches ? 'dark' : 'light', false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireScheme);
  else wireScheme();

  window.UI = { esc: esc, press: press, applyScheme: applyScheme };
})();
