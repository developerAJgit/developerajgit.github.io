/* Builds the playground tabs from the registered modules. */
(function (PG) {
  'use strict';
  var host = document.getElementById('pg');
  if (!host || !PG) return;
  var h = PG.h;
  var APPS = PG.apps.slice().sort(function (a, b) { return a.order - b.order; });
  var tablist = host.querySelector('.pg-tabs');
  var body = host.querySelector('.pg-body');
  var tabs = [], panels = [], started = {}, lastGroup = null;

  APPS.forEach(function (a, i) {
    if (a.group !== lastGroup) {
      tablist.appendChild(h('span', { class: 'pg-group', 'aria-hidden': 'true', text: a.group }));
      lastGroup = a.group;
    }
    var tab = h('button', { type: 'button', role: 'tab', class: 'pg-tab', id: 'pg-tab-' + a.id, 'aria-controls': 'pg-panel-' + a.id, 'aria-selected': 'false', tabindex: '-1', title: a.name, style: { '--app': a.color } },
      PG.icon(a.icon), h('span', { text: a.short || a.name }));
    var panel = h('div', { role: 'tabpanel', class: 'pg-panel', id: 'pg-panel-' + a.id, 'aria-labelledby': 'pg-tab-' + a.id, hidden: true, style: { '--app': a.color } });
    tab.addEventListener('click', function () { show(i, true); });
    tab.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') d = -i; else if (e.key === 'End') d = APPS.length - 1 - i;
      if (d) { e.preventDefault(); var n = (i + d + APPS.length) % APPS.length; show(n, true); tabs[n].focus(); }
    });
    tabs.push(tab); panels.push(panel);
    tablist.appendChild(tab); body.appendChild(panel);
  });

  function show(i, remember) {
    tabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(i === j)); t.tabIndex = i === j ? 0 : -1; });
    panels.forEach(function (p, j) { p.hidden = i !== j; });
    if (tabs[i].scrollIntoView && remember) {
      var r = tabs[i].getBoundingClientRect(), pr = tablist.getBoundingClientRect();
      if (r.left < pr.left || r.right > pr.right) tablist.scrollLeft += r.left - pr.left - 24;
    }
    if (!started[i]) {
      started[i] = true;
      try { APPS[i].init(panels[i]); }
      catch (e) { panels[i].appendChild(h('p', { class: 'muted', text: 'This demo could not start in your browser.' })); if (window.console) console.error(e); }
    }
    if (remember) { try { localStorage.setItem('pg-tab', APPS[i].id); } catch (e) { /* storage unavailable */ } }
  }
  function indexOf(id) { for (var i = 0; i < APPS.length; i++) if (APPS[i].id === id) return i; return -1; }

  /* Public: open a tab by id and bring the playground into view (used by the "Ask my agent" button). */
  PG.open = function (id) {
    var i = indexOf(id);
    if (i < 0) return;
    show(i, true);
    document.getElementById('playground').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { tabs[i].focus({ preventScroll: true }); }, 400);
  };

  var first = 0;
  try { var saved = localStorage.getItem('pg-tab'); if (indexOf(saved) > -1) first = indexOf(saved); } catch (e) { /* storage unavailable */ }
  var hashTab = (location.hash.match(/^#play-([\w-]+)/) || [])[1];
  if (hashTab && indexOf(hashTab) > -1) first = indexOf(hashTab);
  show(first, false);
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-open-tab]');
    if (t) { e.preventDefault(); PG.open(t.getAttribute('data-open-tab')); }
  });
})(window.PG);
