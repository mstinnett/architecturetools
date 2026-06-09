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

  window.UI = { esc: esc, press: press };
})();
