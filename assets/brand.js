/* Brand kit: live theme palettes, contrast checks and token export. */
(function () {
  'use strict';
  var THEMES = [
    { id: 'midnight', name: 'Midnight Chakra', jp: '夜', text: 'The default. Deep night indigo with electric-blue chakra, spirit violet and scroll gold, taken from the article covers.' },
    { id: 'ember', name: 'Ember Scroll', jp: '炎', text: 'Warm and dramatic: ember orange, crimson and gold on charcoal. Good for launches and celebrations.' },
    { id: 'jade', name: 'Jade Spirit', jp: '翠', text: 'Calm and corporate: turquoise and sky blue on dark azure, in step with the Synapx palette.' },
    { id: 'sakura', name: 'Sakura Dawn', jp: '桜', text: 'The light theme: sakura pink, indigo and amber on blossom white, with falling petals.' }
  ];
  var SW = [['--bg', 'Background'], ['--bg-2', 'Sky'], ['--surface-solid', 'Surface'], ['--ink', 'Ink'], ['--ink-2', 'Ink soft'], ['--muted', 'Muted'], ['--accent', 'Accent'], ['--accent-2', 'Accent 2'], ['--accent-3', 'Accent 3']];
  var TOKENS = ['--bg', '--bg-2', '--surface', '--surface-2', '--surface-solid', '--ink', '--ink-2', '--muted', '--line', '--accent', '--accent-2', '--accent-3', '--accent-ink', '--accent-soft', '--grad', '--aura-1', '--aura-2', '--aura-3', '--particle'];
  var host = document.getElementById('bk-themes'), ctr = document.getElementById('bk-contrast');
  var tokPre = document.getElementById('bk-tok'), tokName = document.getElementById('bk-tok-name'), copy = document.getElementById('bk-copy');
  if (!host) return;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function hex(v) { v = v.trim(); if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]; return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null; }
  function lum(h) {
    var c = [1, 3, 5].map(function (i) { var x = parseInt(h.substr(i, 2), 16) / 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }

  var cards = THEMES.map(function (t) {
    var card = el('article', 'bk-theme'); card.setAttribute('data-theme', t.id);
    var head = el('div', 'bk-theme-h');
    var title = el('div'); title.appendChild(el('h3', null, t.name)); title.appendChild(el('p', 'muted', t.text));
    var jp = el('span', 'bk-theme-jp', t.jp); jp.setAttribute('lang', 'ja');
    head.appendChild(title); head.appendChild(jp);
    var bar = el('div', 'bk-gradbar');
    var grid = el('div', 'bk-swatches');
    var preview = el('div', 'bk-preview');
    var pv = el('div', 'card'); pv.appendChild(el('span', 'kicker', 'Preview'));
    var h = el('b', 'bk-pv-title'); h.appendChild(document.createTextNode('Hold up in ')); h.appendChild(el('span', 'grad', 'production')); pv.appendChild(h);
    var row = el('div', 'bk-row'); var b1 = el('span', 'btn primary', 'Primary'); var b2 = el('span', 'btn', 'Secondary'); row.appendChild(b1); row.appendChild(b2); pv.appendChild(row);
    preview.appendChild(pv);
    var apply = el('button', 'btn bk-apply', 'Apply ' + t.name); apply.type = 'button';
    apply.addEventListener('click', function () { if (window.setSiteTheme) window.setSiteTheme(t.id, true); });
    card.appendChild(head); card.appendChild(bar); card.appendChild(grid); card.appendChild(preview); card.appendChild(apply);
    host.appendChild(card);
    return { t: t, card: card, grid: grid };
  });

  function fill() {
    cards.forEach(function (c) {
      var cs = getComputedStyle(c.card);
      c.grid.textContent = '';
      SW.forEach(function (s) {
        var v = cs.getPropertyValue(s[0]).trim();
        var sw = el('div', 'bk-sw');
        var chip = el('span', 'bk-chip'); chip.style.background = 'var(' + s[0] + ')';
        sw.appendChild(chip); sw.appendChild(el('b', null, s[1])); sw.appendChild(el('code', null, v));
        c.grid.appendChild(sw);
      });
    });
    if (ctr) {
      ctr.textContent = '';
      var table = el('table', 'bk-table');
      var thead = el('thead'), tr = el('tr');
      ['Pair'].concat(THEMES.map(function (t) { return t.name; })).forEach(function (x) { var th = el('th', null, x); th.scope = 'col'; tr.appendChild(th); });
      thead.appendChild(tr); table.appendChild(thead);
      var tbody = el('tbody');
      [['Ink on background', '--ink', '--bg'], ['Soft ink on background', '--ink-2', '--bg'], ['Muted on background', '--muted', '--bg'], ['Accent on background', '--accent', '--bg'], ['Text on accent', '--accent-ink', '--accent']].forEach(function (p) {
        var r = el('tr'); r.appendChild(el('td', null, p[0]));
        cards.forEach(function (c) {
          var cs = getComputedStyle(c.card), a = hex(cs.getPropertyValue(p[1])), b = hex(cs.getPropertyValue(p[2]));
          var td = el('td');
          if (a && b) {
            var v = ratio(a, b), grade = v >= 7 ? 'AAA' : v >= 4.5 ? 'AA' : v >= 3 ? 'AA large' : 'Fail';
            td.appendChild(el('b', null, v.toFixed(1) + ':1')); td.appendChild(el('span', 'bk-grade ' + grade.replace(' ', '-').toLowerCase(), grade));
          } else td.textContent = 'n/a';
          r.appendChild(td);
        });
        tbody.appendChild(r);
      });
      table.appendChild(tbody); ctr.appendChild(table);
    }
    var cur = document.documentElement.getAttribute('data-theme') || 'midnight';
    var tc = cards.filter(function (c) { return c.t.id === cur; })[0] || cards[0];
    var cs2 = getComputedStyle(tc.card);
    var lines = ['[data-theme="' + tc.t.id + '"] {'];
    TOKENS.forEach(function (k) { lines.push('  ' + k + ': ' + cs2.getPropertyValue(k).trim() + ';'); });
    lines.push('}');
    tokPre.textContent = lines.join('\n');
    tokName.textContent = tc.t.name + ' (current theme)';
  }
  copy.addEventListener('click', function () {
    var t = tokPre.textContent, done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy CSS'; }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () {}); else done();
  });
  document.addEventListener('themechange', fill);
  fill();
})();
