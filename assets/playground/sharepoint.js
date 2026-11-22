/* SharePoint: live JSON column formatting. Includes a small interpreter for the
   formatting schema (elmType, txtContent, style, attributes, children) and its
   Excel-style expressions (=if(...), @currentField, [$Field], @now, @me). */
(function (PG) {
  'use strict';
  var h = PG.h, panelHead = PG.panelHead, articleLink = PG.articleLink;

  /* ---------- Expression engine ---------- */
  function SpError(m) { var e = new Error(m); e.sp = true; return e; }
  function tokenize(s) {
    var t = [], i = 0, m;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "'" || c === '"') {
        var j = i + 1, out = '';
        while (j < s.length && s[j] !== c) { if (s[j] === '\\' && j + 1 < s.length) { out += s[j + 1]; j += 2; continue; } out += s[j++]; }
        if (j >= s.length) throw SpError('Missing closing quote.');
        t.push({ k: 'str', v: out }); i = j + 1; continue;
      }
      if (/[0-9.]/.test(c) && (m = /^\d*\.?\d+/.exec(s.slice(i)))) { t.push({ k: 'num', v: +m[0] }); i += m[0].length; continue; }
      if (c === '@' && (m = /^@[A-Za-z]+(\.[A-Za-z]+)*/.exec(s.slice(i)))) { t.push({ k: 'var', v: m[0] }); i += m[0].length; continue; }
      if (c === '[' && (m = /^\[\$[A-Za-z_][\w]*(\.[A-Za-z]+)*\]/.exec(s.slice(i)))) { t.push({ k: 'var', v: m[0] }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_]\w*/.exec(s.slice(i)))) { t.push({ k: 'id', v: m[0] }); i += m[0].length; continue; }
      var two = s.substr(i, 2);
      if (['==', '!=', '<=', '>=', '&&', '||'].indexOf(two) > -1) { t.push({ k: 'op', v: two }); i += 2; continue; }
      if ('+-*/%<>!?:(),'.indexOf(c) > -1) { t.push({ k: 'op', v: c }); i++; continue; }
      throw SpError('Unexpected character "' + c + '".');
    }
    t.push({ k: 'eof', v: 'end of expression' });
    return t;
  }
  function parse(src) {
    var t = tokenize(src), p = 0;
    var is = function (v) { return t[p].k === 'op' && t[p].v === v; };
    var expect = function (v) { if (!is(v)) throw SpError('Expected "' + v + '" but found "' + t[p].v + '".'); p++; };
    function tern() { var c = or(); if (is('?')) { p++; var a = tern(); expect(':'); return { k: '?', c: c, a: a, b: tern() }; } return c; }
    function bin(next, ops) { return function () { var l = next(); while (t[p].k === 'op' && ops.indexOf(t[p].v) > -1) { var op = t[p++].v; l = { k: 'b', op: op, l: l, r: next() }; } return l; }; }
    var un = function () { if (is('-')) { p++; return { k: 'neg', e: un() }; } if (is('!')) { p++; return { k: 'not', e: un() }; } return prim(); };
    var mul = bin(un, ['*', '/', '%']), add = bin(mul, ['+', '-']), rel = bin(add, ['<', '>', '<=', '>=']), eq = bin(rel, ['==', '!=']), and = bin(eq, ['&&']), or = bin(and, ['||']);
    function prim() {
      var k = t[p++];
      if (k.k === 'num' || k.k === 'str') return { k: 'lit', v: k.v };
      if (k.k === 'var') return { k: 'var', v: k.v };
      if (k.k === 'id') {
        if (k.v === 'true' || k.v === 'false') return { k: 'lit', v: k.v === 'true' };
        if (!is('(')) throw SpError('"' + k.v + '" must be called like a function, for example ' + k.v + '(...).');
        p++; var args = [];
        if (!is(')')) { do { args.push(tern()); } while (is(',') && ++p); }
        expect(')');
        return { k: 'call', f: k.v, args: args };
      }
      if (k.k === 'op' && k.v === '(') { var e = tern(); expect(')'); return e; }
      if (k.k === 'eof') throw SpError('The expression is incomplete.');
      throw SpError('Unexpected "' + k.v + '".');
    }
    var ast = tern();
    if (t[p].k !== 'eof') throw SpError('Unexpected "' + t[p].v + '".');
    return ast;
  }
  var num = function (v) { if (v instanceof Date) return v.getTime(); if (v === '' || v === null || v === undefined) return 0; var n = Number(v); return isNaN(n) ? 0 : n; };
  var str = function (v) { if (v === null || v === undefined) return ''; if (v instanceof Date) return v.toISOString(); return String(v); };
  var FN = {
    'if': function (a) { return a[0] ? a[1] : a[2]; },
    toString: function (a) { return str(a[0]); },
    Number: function (a) { return num(a[0]); },
    Date: function (a) { return new Date(a[0]); },
    toLowerCase: function (a) { return str(a[0]).toLowerCase(); },
    toUpperCase: function (a) { return str(a[0]).toUpperCase(); },
    indexOf: function (a) { return str(a[0]).indexOf(str(a[1])); },
    substring: function (a) { return str(a[0]).substring(num(a[1]), a.length > 2 ? num(a[2]) : undefined); },
    length: function (a) { return Array.isArray(a[0]) ? a[0].length : str(a[0]).length; },
    startsWith: function (a) { return str(a[0]).indexOf(str(a[1])) === 0; },
    endsWith: function (a) { var s = str(a[0]), e = str(a[1]); return s.slice(-e.length) === e; },
    replace: function (a) { return str(a[0]).replace(str(a[1]), str(a[2])); },
    padStart: function (a) { return str(a[0]).padStart(num(a[1]), str(a[2] || ' ')); },
    floor: function (a) { return Math.floor(num(a[0])); },
    ceiling: function (a) { return Math.ceil(num(a[0])); },
    abs: function (a) { return Math.abs(num(a[0])); },
    toLocaleString: function (a) { return a[0] instanceof Date ? a[0].toLocaleString() : num(a[0]).toLocaleString(); },
    toLocaleDateString: function (a) { return new Date(a[0]).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); },
    toLocaleTimeString: function (a) { return new Date(a[0]).toLocaleTimeString(); },
    toDateString: function (a) { return new Date(a[0]).toDateString(); },
    getDate: function (a) { return new Date(a[0]).getDate(); },
    getMonth: function (a) { return new Date(a[0]).getMonth(); },
    getYear: function (a) { return new Date(a[0]).getFullYear(); }
  };
  function lookup(path, ctx) {
    var parts, base;
    if (path[0] === '[') { parts = path.slice(2, -1).split('.'); base = ctx.row[parts.shift()]; }
    else {
      parts = path.slice(1).split('.'); var root = parts.shift();
      if (root === 'currentField') base = ctx.value;
      else if (root === 'now') base = new Date();
      else if (root === 'me') base = ctx.me;
      else throw SpError('Unknown variable "@' + root + '".');
    }
    parts.forEach(function (k) { base = base === null || base === undefined ? undefined : base[k]; });
    return base;
  }
  function ev(n, ctx) {
    switch (n.k) {
      case 'lit': return n.v;
      case 'var': return lookup(n.v, ctx);
      case 'neg': return -num(ev(n.e, ctx));
      case 'not': return !ev(n.e, ctx);
      case '?': return ev(n.c, ctx) ? ev(n.a, ctx) : ev(n.b, ctx);
      case 'call': {
        var f = FN[n.f];
        if (!f) throw SpError('Unknown function "' + n.f + '".');
        if (n.f === 'if') { if (n.args.length !== 3) throw SpError('if() needs three arguments.'); return ev(n.args[0], ctx) ? ev(n.args[1], ctx) : ev(n.args[2], ctx); }
        return f(n.args.map(function (x) { return ev(x, ctx); }));
      }
      case 'b': {
        if (n.op === '&&') return ev(n.l, ctx) && ev(n.r, ctx);
        if (n.op === '||') return ev(n.l, ctx) || ev(n.r, ctx);
        var l = ev(n.l, ctx), r = ev(n.r, ctx);
        switch (n.op) {
          case '+':
            if (typeof l === 'string' || typeof r === 'string') return str(l) + str(r);
            if (l instanceof Date && typeof r === 'number') return new Date(l.getTime() + r);
            return num(l) + num(r);
          case '-': return num(l) - num(r);
          case '*': return num(l) * num(r);
          case '/': return num(r) === 0 ? 0 : num(l) / num(r);
          case '%': return num(l) % num(r);
          case '==': return (l instanceof Date || r instanceof Date) ? num(l) === num(r) : str(l) === str(r);
          case '!=': return (l instanceof Date || r instanceof Date) ? num(l) !== num(r) : str(l) !== str(r);
          case '<': return typeof l === 'string' && typeof r === 'string' ? l < r : num(l) < num(r);
          case '>': return typeof l === 'string' && typeof r === 'string' ? l > r : num(l) > num(r);
          case '<=': return num(l) <= num(r);
          case '>=': return num(l) >= num(r);
        }
      }
    }
    throw SpError('Unsupported expression.');
  }
  var AST_OPS = { '+': 1, '-': 1, '*': 1, '/': 1, '==': 1, '!=': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&&': 1, '||': 1 };
  function value(v, ctx) {
    if (v && typeof v === 'object' && v.operator) {
      var op = v.operator, args = (v.operands || []).map(function (x) { return value(x, ctx); });
      if (op === '?') return args[0] ? args[1] : args[2];
      if (AST_OPS[op]) return ev({ k: 'b', op: op, l: { k: 'lit', v: args[0] }, r: { k: 'lit', v: args[1] } }, ctx);
      var fname = op.replace(/\(\)$/, '');
      if (FN[fname]) return FN[fname](args);
      throw SpError('Unknown operator "' + op + '".');
    }
    if (typeof v !== 'string') return v;
    if (v[0] === '=') return ev(parse(v.slice(1)), ctx);
    if (/^@[A-Za-z]+(\.[A-Za-z]+)*$/.test(v) || /^\[\$[\w]+(\.[A-Za-z]+)*\]$/.test(v)) return lookup(v, ctx);
    return v;
  }

  /* ---------- Renderer ---------- */
  var TAGS = { div: 'div', span: 'span', a: 'a', img: 'img', button: 'button', p: 'p' };
  var ICONS = { CheckMark: '✓', Completed: '✓', Error: '✕', ErrorBadge: '✕', Warning: '⚠', Clock: '◷', Calendar: '▦', Blocked: '⊘', Mail: '✉', Contact: '◉', Flag: '⚑', Info: 'ⓘ', Up: '↑', Down: '↓', Forward: '→', Star: '★', FavoriteStar: '★', People: '◉', Money: '$' };
  function renderNode(node, ctx, depth) {
    if (depth > 20) throw SpError('Formatting is nested too deeply.');
    if (!node || typeof node !== 'object') throw SpError('Each element must be an object with an elmType.');
    var tagName = str(value(node.elmType || 'div', ctx));
    var tag = TAGS[tagName];
    if (!tag) throw SpError('elmType "' + tagName + '" isn\'t supported here. Use div, span, a, img, button or p.');
    var el = document.createElement(tag);
    if (tag === 'button') el.type = 'button';
    if (node.txtContent !== undefined) el.textContent = str(value(node.txtContent, ctx));
    if (node.style) Object.keys(node.style).forEach(function (k) { try { el.style.setProperty(k, str(value(node.style[k], ctx))); } catch (e) { if (e.sp) throw e; } });
    if (node.attributes) Object.keys(node.attributes).forEach(function (k) {
      var v = str(value(node.attributes[k], ctx));
      if (k === 'class') el.className = v;
      else if (k === 'iconName') { if (v) { el.classList.add('spx-icon'); el.setAttribute('data-icon', ICONS[v] || '•'); el.setAttribute('aria-hidden', 'true'); } }
      else if (k === 'href') { if (/^(https?:|mailto:)/i.test(v)) { el.setAttribute('href', v); el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); } }
      else if (k === 'src') { if (/^https:/i.test(v)) el.setAttribute('src', v); }
      else if (/^(title|alt|role|aria-[a-z]+)$/.test(k)) el.setAttribute(k, v);
    });
    if (node.children) {
      if (!Array.isArray(node.children)) throw SpError('"children" must be an array.');
      node.children.forEach(function (c) { el.appendChild(renderNode(c, ctx, depth + 1)); });
    }
    return el;
  }

  /* ---------- Sample list ---------- */
  var DAY = 86400000, now = Date.now();
  var ME = 'visitor@contoso.com';
  var ROWS = [
    { Title: 'Vendor onboarding: Litware', Status: 'In progress', Due: new Date(now + 5 * DAY), Progress: 62, Owner: { title: 'Riya Sharma', email: 'riya@contoso.com' }, Budget: 18500 },
    { Title: 'Laptop refresh: Finance', Status: 'Blocked', Due: new Date(now - 3 * DAY), Progress: 35, Owner: { title: 'Portfolio Visitor', email: ME }, Budget: 42800 },
    { Title: 'Site access review Q4', Status: 'In review', Due: new Date(now + 1 * DAY), Progress: 88, Owner: { title: 'Arjun Rao', email: 'arjun@contoso.com' }, Budget: 6200 },
    { Title: 'Contract renewal: Fabrikam', Status: 'Done', Due: new Date(now - 12 * DAY), Progress: 100, Owner: { title: 'Meera Iyer', email: 'meera@contoso.com' }, Budget: 27300 },
    { Title: 'Teams governance rollout', Status: 'Not started', Due: new Date(now + 21 * DAY), Progress: 5, Owner: { title: 'Portfolio Visitor', email: ME }, Budget: 12900 }
  ];
  var COLS = [
    { key: 'Title', label: 'Title' }, { key: 'Status', label: 'Status' }, { key: 'Due', label: 'Due date' },
    { key: 'Progress', label: 'Progress' }, { key: 'Owner', label: 'Owner' }, { key: 'Budget', label: 'Budget' }
  ];
  var SCHEMA = 'https://developer.microsoft.com/json-schemas/sp/v2/column-formatting.schema.json';
  var PRESETS = {
    Status: {
      elmType: 'div',
      attributes: { 'class': "=if(@currentField == 'Done', 'sp-field-severity--good', if(@currentField == 'Blocked', 'sp-field-severity--blocked', if(@currentField == 'In review', 'sp-field-severity--warning', 'sp-field-severity--low')))" },
      children: [
        { elmType: 'span', attributes: { iconName: "=if(@currentField == 'Done', 'CheckMark', if(@currentField == 'Blocked', 'Error', 'Clock'))" }, style: { 'padding-right': '6px' } },
        { elmType: 'span', txtContent: '@currentField' }
      ]
    },
    Due: {
      elmType: 'div',
      style: { color: "=if(Number(@currentField) < Number(@now), '#a4262c', if(Number(@currentField) - Number(@now) < 604800000, '#8a6100', '#107c10'))", 'font-weight': '600' },
      children: [
        { elmType: 'span', attributes: { iconName: "=if(Number(@currentField) < Number(@now), 'Warning', 'Calendar')" }, style: { 'padding-right': '6px' } },
        { elmType: 'span', txtContent: "=toLocaleDateString(@currentField) + if(Number(@currentField) < Number(@now), ' · overdue', '')" }
      ]
    },
    Progress: {
      elmType: 'div',
      style: { display: 'flex', 'align-items': 'center', gap: '8px', width: '100%' },
      children: [
        { elmType: 'div', style: { flex: '1', height: '8px', 'border-radius': '4px', 'background-color': '#edebe9', overflow: 'hidden' },
          children: [{ elmType: 'div', style: { height: '100%', width: "=@currentField + '%'", 'background-color': "=if(@currentField >= 80, '#107c10', if(@currentField >= 40, '#0f6cbd', '#ca5010'))" } }] },
        { elmType: 'span', txtContent: "=@currentField + '%'", style: { 'min-width': '38px', 'text-align': 'right' } }
      ]
    },
    Owner: {
      elmType: 'a',
      attributes: { href: "='mailto:' + @currentField.email", title: '=@currentField.email' },
      style: { display: 'flex', 'align-items': 'center', gap: '8px', 'text-decoration': 'none', color: 'inherit' },
      children: [
        { elmType: 'span', txtContent: '=substring(@currentField.title, 0, 1)', style: { width: '26px', height: '26px', 'border-radius': '50%', display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', color: '#fff', 'font-weight': '600', 'background-color': "=if(@currentField.email == @me, '#742774', '#0f6cbd')" } },
        { elmType: 'span', txtContent: "=@currentField.title + if(@currentField.email == @me, ' (you)', '')" }
      ]
    },
    Budget: {
      elmType: 'div',
      style: { position: 'relative', width: '100%' },
      children: [
        { elmType: 'div', style: { position: 'absolute', top: '0', left: '0', bottom: '0', width: "=(@currentField / 50000 * 100) + '%'", 'background-color': "=if(@currentField > 40000, '#fde7e9', '#dff6dd')", 'border-radius': '3px' } },
        { elmType: 'span', style: { position: 'relative', padding: '2px 6px', 'font-variant-numeric': 'tabular-nums' }, txtContent: "='$' + toLocaleString(@currentField)" }
      ]
    },
    Title: {
      elmType: 'div',
      style: { 'font-weight': '600' },
      children: [
        { elmType: 'span', attributes: { iconName: "=if([$Status] == 'Blocked', 'Flag', '')" }, style: { color: '#a4262c', 'padding-right': "=if([$Status] == 'Blocked', '6px', '0')" } },
        { elmType: 'span', txtContent: '@currentField' }
      ]
    }
  };
  function presetText(key) {
    var o = { $schema: SCHEMA }; Object.keys(PRESETS[key]).forEach(function (k) { o[k] = PRESETS[key][k]; });
    return JSON.stringify(o, null, 2);
  }
  function plain(key, v) {
    if (v instanceof Date) return v.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    if (key === 'Owner') return v.title;
    if (key === 'Progress') return v + '%';
    if (key === 'Budget') return '$' + v.toLocaleString();
    return String(v);
  }

  function initSharePoint(panel) {
    var s = { col: 'Status', json: {}, off: {} };
    COLS.forEach(function (c) { s.json[c.key] = presetText(c.key); });
    var chips = COLS.map(function (c) {
      return h('button', { type: 'button', class: 'pg-chip', 'aria-pressed': String(c.key === s.col), onclick: function () { s.col = c.key; chips.forEach(function (b, i) { b.setAttribute('aria-pressed', String(COLS[i].key === s.col)); }); editor.value = s.json[s.col]; render(); } }, c.label);
    });
    var editor = h('textarea', { class: 'sp-editor', spellcheck: 'false', 'aria-label': 'Column formatting JSON', wrap: 'off' });
    var errLine = h('p', { class: 'cv-err', role: 'status' });
    var toggle = h('input', { type: 'checkbox', checked: true });
    var table = h('table', { class: 'spx-table' });
    var resetBtn = h('button', { type: 'button', class: 'pg-btn small', onclick: function () { s.json[s.col] = presetText(s.col); editor.value = s.json[s.col]; render(); } }, 'Reset this column');
    var timer;
    editor.addEventListener('input', function () { s.json[s.col] = editor.value; clearTimeout(timer); timer = setTimeout(render, 120); });
    editor.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') { e.preventDefault(); var a = editor.selectionStart; editor.setRangeText('  ', a, editor.selectionEnd, 'end'); s.json[s.col] = editor.value; render(); }
    });
    toggle.addEventListener('change', render);

    panel.appendChild(panelHead('Format a SharePoint list', 'Column formatting turns a plain list into something people can scan at a glance, without code or an app. Pick a column, edit its JSON and the list updates live. It uses the real schema and expression syntax: @currentField, [$Field], @now, @me and =if().'));
    panel.appendChild(h('div', { class: 'sp' },
      h('div', { class: 'sp-edit' },
        h('div', { class: 'pg-field' }, h('span', { text: 'Column' }), h('div', { class: 'pg-chips' }, chips)),
        h('div', { class: 'sp-editor-wrap' }, editor),
        errLine,
        h('div', { class: 'sp-actions' }, h('label', { class: 'pg-switch' }, toggle, h('span', { class: 'pg-sw', 'aria-hidden': 'true' }), h('span', null, h('b', { text: 'Apply formatting' }), h('small', { text: 'Compare with the plain list' }))), resetBtn)),
      h('div', { class: 'sp-view' },
        h('div', { class: 'spx' },
          h('div', { class: 'spx-top' }, h('span', { class: 'spx-site', text: 'Operations' }), h('span', { class: 'spx-sep', text: '›' }), h('b', { text: 'Requests' })),
          h('div', { class: 'spx-cmd' }, h('span', { text: '+ New' }), h('span', { text: '✎ Edit in grid view' }), h('span', { text: '⇪ Export' }), h('span', { class: 'spx-view', text: 'All Items ▾' })),
          h('div', { class: 'spx-scroll', tabindex: '0', role: 'region', 'aria-label': 'Formatted list preview' }, table)),
        h('p', { class: 'sp-foot' }, 'Formatting is applied in the browser and never changes the data. For permissions, the other half of SharePoint governance, see ', articleLink('Anonymous Access Risks', 'finding sites with anonymous access risks'), '.'))));

    function render() {
      var fmt = null, err = '';
      if (toggle.checked) {
        try { fmt = JSON.parse(s.json[s.col]); } catch (e) { err = 'JSON error: ' + e.message; }
      }
      table.textContent = '';
      var thead = h('thead', null, h('tr', null, COLS.map(function (c) { return h('th', { scope: 'col', class: c.key === s.col ? 'on' : '' }, c.label); })));
      var tbody = h('tbody');
      ROWS.forEach(function (row) {
        tbody.appendChild(h('tr', null, COLS.map(function (c) {
          var td = h('td', { class: c.key === s.col ? 'on' : '' });
          if (c.key === s.col && fmt && !err) {
            try { td.appendChild(renderNode(fmt, { value: row[c.key], row: row, me: ME }, 0)); }
            catch (e) { err = (e.sp ? '' : 'Error: ') + e.message; td.textContent = plain(c.key, row[c.key]); }
          } else td.textContent = plain(c.key, row[c.key]);
          return td;
        })));
      });
      table.appendChild(thead); table.appendChild(tbody);
      errLine.textContent = err ? '⚠ ' + err : (toggle.checked ? 'Formatting applied to the ' + COLS.filter(function (c) { return c.key === s.col; })[0].label + ' column.' : 'Formatting off: this is the plain list.');
      errLine.classList.toggle('bad', !!err);
    }
    editor.value = s.json[s.col];
    render();
  }

  PG.register({ id: 'sharepoint', order: 60, group: 'Build', short: 'SharePoint', name: 'SharePoint', color: '#03787c', icon: 'M4 5h16v14H4zM4 10h16M10 10v9', init: initSharePoint });
})(window.PG);
