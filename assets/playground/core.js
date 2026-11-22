/* Playground core: shared helpers, page data and a module registry.
   Each technology lives in its own file and calls PG.register(); boot.js builds the tabs.
   Everything is simulated in the browser; nothing calls a real tenant. */
(function () {
  'use strict';

  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, RM ? Math.min(ms, 80) : ms); }); };
  var rand = function (a, b) { return Math.round(a + Math.random() * (b - a)); };
  var iso = function () { return new Date().toISOString().replace(/\.\d+Z$/, 'Z'); };
  var guid = function () { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmtMs = function (ms) { return ms < 1000 ? ms + ' ms' : (ms / 1000).toFixed(1) + ' s'; };

  function append(n, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(n, x); }); return; }
    n.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  /* Tiny DOM builder: h('div', { class: 'x', onclick: fn }, child, [children]) */
  function h(tag, props) {
    var n = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { n.style.setProperty(s, v[s]); });
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (k === 'value') n.value = v;
      else if (k === 'checked') n.checked = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(n, arguments[i]);
    return n;
  }
  function icon(path, size) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size || 18); s.setAttribute('height', size || 18); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<path d="' + path + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    return s;
  }

  /* Data pulled from the page so the playground always matches the portfolio. */
  var ARTICLES = (window.ARTICLES || []).map(function (a) {
    return { Title: a.t, Topic: a.g[0], Date: a.d, Year: +a.d.slice(0, 4), Url: a.u };
  });
  function pageCerts() {
    return Array.prototype.map.call(document.querySelectorAll('#credentials .cred-list li'), function (li) {
      var head = li.parentElement.previousElementSibling;
      return { name: li.querySelector('b').textContent, code: li.querySelector('span').textContent, group: head ? head.textContent : '' };
    });
  }
  function pageRoles() {
    return Array.prototype.map.call(document.querySelectorAll('#experience .timeline > li'), function (li) {
      var h3 = li.querySelector('h3');
      return { title: h3.firstChild.textContent.trim(), org: h3.querySelector('.at').textContent, when: li.querySelector('.when').textContent };
    });
  }
  function pageProjects() {
    return Array.prototype.map.call(document.querySelectorAll('#work .work'), function (w) {
      return { name: w.querySelector('h3').textContent, area: w.querySelector('.kicker').textContent, stack: Array.prototype.map.call(w.querySelectorAll('.chips li'), function (l) { return l.textContent; }).join(', '), text: w.querySelector('p').textContent };
    });
  }
  /* Find one of Ajay's articles by a phrase in its title. */
  function article(phrase) {
    var p = phrase.toLowerCase();
    for (var i = 0; i < ARTICLES.length; i++) if (ARTICLES[i].Title.toLowerCase().indexOf(p) > -1) return ARTICLES[i];
    return null;
  }
  function articleLink(phrase, label) {
    var a = article(phrase);
    if (!a) return null;
    return h('a', { class: 'pg-cite', href: a.Url, target: '_blank', rel: 'noopener', title: 'Read the article on LinkedIn' }, label || a.Title);
  }
  function panelHead(title, text, cite) {
    return h('div', { class: 'pg-head' },
      h('div', null, h('h3', { text: title }), h('p', null, text, cite ? [' ', cite] : null)),
      h('span', { class: 'pg-badge', text: 'Simulated · runs in your browser' }));
  }
  /* Small tokenizer-based highlighter for the code panes. */
  var LANGS = {
    ts: /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|`[^`]*`|'(?:[^'\\\n]|\\.)*')|\b(import|from|export|default|function|const|let|return|null|true|false|async|await|new)\b|(<\/?[A-Za-z][\w.]*)|\b(\d+)\b/g,
    yaml: /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'[^'\n]*')|^(\s*-?\s*[\w.@/-]+)(?=:)|(\$\([\w.]+\)|\$\{\{[^}]+\}\})|\b(\d[\d.]*)\b/gm,
    http: /(#[^\n]*)|("(?:[^"\\\n]|\\.)*")|^(GET|POST|PATCH|PUT|DELETE)\b|^([\w-]+)(?=:)|\b(\d{3})\b/gm
  };
  function highlight(src, lang) {
    var re = LANGS[lang || 'ts'], out = '', last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(src))) {
      if (!m[0]) { re.lastIndex++; continue; }
      out += esc(src.slice(last, m.index));
      var cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 't' : 'n';
      out += '<span class="tk-' + cls + '">' + esc(m[0]) + '</span>';
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  function copyText(text, btn) {
    var done = function () { if (!btn) return; var t = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = t; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
    else { var ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove(); }
  }

  window.PG = {
    apps: [],
    register: function (app) { this.apps.push(app); },
    h: h, append: append, icon: icon, panelHead: panelHead, wait: wait, rand: rand, iso: iso, guid: guid, esc: esc, fmtMs: fmtMs,
    ARTICLES: ARTICLES, pageCerts: pageCerts, pageRoles: pageRoles, pageProjects: pageProjects,
    article: article, articleLink: articleLink, highlight: highlight, copyText: copyText
  };
})();
