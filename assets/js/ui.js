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

  // ---- Recents — per-tool history of saved readings ------------------------
  // A recent IS the page URL's query string: every engine tool serializes its
  // whole state there, so restoring one restores the full reading, figure and
  // all. Wiring (per page):
  //   var recents = UI.recents({ key: 'convert', anchor: inputEl,
  //     entry: function () { return { face: '…', result: '…' }; } });
  //   …then call recents.note() inside the page's debounced syncURL.
  // The component settles entries itself (a few seconds of quiet, or blur), so
  // half-typed states never land in history. Pinned entries hold the top;
  // unpinned roll off. Styles live in global.css ("recents").
  function recents(opts) {
    var KEY = 'recents:' + opts.key;
    var MAX = 20, MAX_PIN = 10, SETTLE_MS = 3000;
    var anchor = opts.anchor;
    if (!anchor || !anchor.parentNode) return { note: function () {} };

    function load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
    }
    function save(list) {
      var pins = 0, un = 0;
      list = list.filter(function (x) {
        if (x.pin) { pins++; return pins <= MAX_PIN; }
        un++; return un <= MAX;
      });
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage off */ }
      return list;
    }

    // hang the button + panel on a wrapper around the field
    var wrap = document.createElement('span');
    wrap.className = 'rec-anchor';
    anchor.parentNode.insertBefore(wrap, anchor);
    wrap.appendChild(anchor);
    anchor.style.paddingRight = '2.6rem';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rec-btn';
    btn.setAttribute('aria-label', 'Recent readings');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '&#8634;';
    wrap.appendChild(btn);

    var panel = document.createElement('div');
    panel.className = 'rec-panel';
    panel.style.display = 'none';
    wrap.appendChild(panel);

    function renderPanel() {
      var list = load();
      if (!list.length) {
        panel.innerHTML = '<div class="rec-empty">Readings save here as you work.</div>';
        return;
      }
      var pinned = [], rest = [];
      list.forEach(function (e, i) { (e.pin ? pinned : rest).push(i); });
      panel.innerHTML = pinned.concat(rest).map(function (i) {
        var e = list[i];
        return '<div class="rec-row" data-i="' + i + '">'
          + '<button type="button" class="rec-pin' + (e.pin ? ' on' : '') + '" aria-pressed="' + !!e.pin + '" aria-label="' + (e.pin ? 'Unpin' : 'Pin') + '">&#9733;</button>'
          + '<span class="rec-face">' + esc(e.face) + '</span>'
          + (e.result ? '<span class="rec-result">' + esc(e.result) + '</span>' : '')
          + '</div>';
      }).join('')
      + '<div class="rec-foot"><button type="button" class="rec-clear">clear unpinned</button></div>';
    }

    var open = false;
    function setOpen(on) {
      open = !!on;
      if (open) renderPanel();
      panel.style.display = open ? '' : 'none';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { commit(); setOpen(!open); });
    document.addEventListener('mousedown', function (ev) {
      if (open && !wrap.contains(ev.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (open && ev.key === 'Escape') setOpen(false);
    });
    panel.addEventListener('click', function (ev) {
      var pin = ev.target.closest('.rec-pin');
      var clear = ev.target.closest('.rec-clear');
      var row = ev.target.closest('.rec-row');
      var list = load();
      if (pin && row) {
        var e = list[+row.dataset.i];
        if (e) { e.pin = !e.pin; save(list); renderPanel(); }
        return;
      }
      if (clear) {
        save(list.filter(function (x) { return x.pin; }));
        renderPanel();
        return;
      }
      if (row) {
        var hit = list[+row.dataset.i];
        if (hit) location.href = location.pathname + '?' + hit.q;
      }
    });

    // recording: the page pings note() on every state change; an entry commits
    // only after the state has sat still, so keystroke fragments never land
    var timer = null;
    function commit() {
      clearTimeout(timer); timer = null;
      var q = location.search.replace(/^\?/, '');
      if (!q) return;                                  // the default state isn't history
      var e = opts.entry ? opts.entry() : null;
      if (!e || !e.face) return;
      var list = load(), pin = false;
      list = list.filter(function (x) { if (x.q === q) { pin = !!x.pin; return false; } return true; });
      list.unshift({ q: q, face: String(e.face), result: e.result ? String(e.result) : '', t: Date.now(), pin: pin });
      save(list);
    }
    function note() {
      clearTimeout(timer);
      timer = setTimeout(commit, SETTLE_MS);
    }
    anchor.addEventListener('blur', function () { if (timer) commit(); });

    return { note: note };
  }

  window.UI = { esc: esc, press: press, recents: recents };
})();
