/* Dataverse: visual query builder that emits Web API, FetchXML and SQL. */
(function (PG) {
  'use strict';
  var h = PG.h, icon = PG.icon, panelHead = PG.panelHead, wait = PG.wait, rand = PG.rand, iso = PG.iso,
    guid = PG.guid, esc = PG.esc, fmtMs = PG.fmtMs, ARTICLES = PG.ARTICLES,
    pageCerts = PG.pageCerts, pageRoles = PG.pageRoles, pageProjects = PG.pageProjects;

  function initDataverse(panel) {
    var TABLES = {
      ag_article: { label: 'Article', set: 'ag_articles', cols: [['ag_title', 'Title', 'text'], ['ag_topic', 'Topic', 'text'], ['ag_published', 'Published', 'date']],
        rows: ARTICLES.map(function (a) { return { ag_title: a.Title, ag_topic: a.Topic, ag_published: a.Date }; }) },
      ag_certification: { label: 'Certification', set: 'ag_certifications', cols: [['ag_name', 'Name', 'text'], ['ag_category', 'Category', 'text'], ['ag_code', 'Code', 'text']],
        rows: pageCerts().map(function (c) { return { ag_name: c.name, ag_category: c.group, ag_code: c.code }; }) },
      ag_project: { label: 'Project', set: 'ag_projects', cols: [['ag_name', 'Name', 'text'], ['ag_industry', 'Industry', 'text'], ['ag_stack', 'Stack', 'text']],
        rows: pageProjects().map(function (p) { return { ag_name: p.name, ag_industry: p.area, ag_stack: p.stack }; }) }
    };
    var OPS = { eq: 'equals', ne: 'does not equal', like: 'contains', begins: 'begins with', ge: 'on or after', le: 'on or before' };
    var s = { table: 'ag_article', cols: { ag_title: true, ag_topic: true, ag_published: true }, fcol: 'ag_title', op: 'like', val: 'sql', ocol: 'ag_published', desc: true, top: 10, lang: 'odata' };

    var tableSel = h('select', { class: 'pg-input', 'aria-label': 'Table' }, Object.keys(TABLES).map(function (k) { return h('option', { value: k, text: TABLES[k].label + ' (' + k + ')' }); }));
    var colsBox = h('div', { class: 'pg-chips' });
    var fcolSel = h('select', { class: 'pg-input', 'aria-label': 'Filter column' });
    var opSel = h('select', { class: 'pg-input', 'aria-label': 'Operator' });
    var valIn = h('input', { class: 'pg-input', 'aria-label': 'Filter value', maxlength: '60' });
    var ocolSel = h('select', { class: 'pg-input', 'aria-label': 'Sort column' });
    var dirSel = h('select', { class: 'pg-input', 'aria-label': 'Sort direction' }, h('option', { value: 'asc', text: 'Ascending' }), h('option', { value: 'desc', text: 'Descending' }));
    var topSel = h('select', { class: 'pg-input', 'aria-label': 'Top' }, [5, 10, 25, 50].map(function (n) { return h('option', { value: n, text: n }); }));
    var langBtns = [['odata', 'Web API'], ['fetch', 'FetchXML'], ['sql', 'SQL (TDS)']].map(function (l) {
      return h('button', { type: 'button', class: 'ca-tab', 'aria-pressed': String(l[0] === s.lang), onclick: function () { s.lang = l[0]; langBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(['odata', 'fetch', 'sql'][i] === s.lang)); }); renderQuery(); } }, l[1]);
    });
    var codeEl = h('pre', { class: 'ca-code dv-code', tabindex: '0', 'aria-label': 'Generated query' });
    var runBtn = h('button', { type: 'button', class: 'pg-btn go', onclick: execute }, '▶ Run query');
    var meta = h('span', { class: 'muted dv-meta' });
    var grid = h('div', { class: 'dv-grid', tabindex: '0', role: 'region', 'aria-label': 'Query results' });

    panel.appendChild(panelHead('Query Dataverse', 'Build a query visually and see the same request as a Web API call, as FetchXML and as SQL over the TDS endpoint. Then run it against tables made from this portfolio\'s own data.'));
    panel.appendChild(h('div', { class: 'dv' },
      h('div', { class: 'dv-build' },
        h('label', { class: 'pg-field' }, h('span', { text: 'Table' }), tableSel),
        h('div', { class: 'pg-field' }, h('span', { text: 'Columns' }), colsBox),
        h('div', { class: 'pg-field' }, h('span', { text: 'Filter' }), h('div', { class: 'dv-row' }, fcolSel, opSel), valIn),
        h('div', { class: 'pg-field' }, h('span', { text: 'Sort' }), h('div', { class: 'dv-row' }, ocolSel, dirSel)),
        h('label', { class: 'pg-field' }, h('span', { text: 'Top rows' }), topSel),
        runBtn),
      h('div', { class: 'dv-out' },
        h('div', { class: 'ca-ide' }, h('div', { class: 'ca-tabs' }, langBtns), codeEl),
        h('div', { class: 'dv-res' }, h('div', { class: 'dv-res-h' }, h('b', { text: 'Results' }), meta), grid))));

    function T() { return TABLES[s.table]; }
    function colType(n) { var c = T().cols.filter(function (x) { return x[0] === n; })[0]; return c ? c[2] : 'text'; }
    function buildControls() {
      colsBox.textContent = ''; fcolSel.textContent = ''; ocolSel.textContent = '';
      fcolSel.appendChild(h('option', { value: '', text: '(no filter)' }));
      T().cols.forEach(function (c) {
        var b = h('button', { type: 'button', class: 'pg-chip', 'aria-pressed': String(!!s.cols[c[0]]), onclick: function () {
          var count = T().cols.filter(function (x) { return s.cols[x[0]]; }).length;
          if (s.cols[c[0]] && count === 1) return;
          s.cols[c[0]] = !s.cols[c[0]]; b.setAttribute('aria-pressed', String(!!s.cols[c[0]])); renderQuery();
        } }, c[1]);
        colsBox.appendChild(b);
        fcolSel.appendChild(h('option', { value: c[0], text: c[1] }));
        ocolSel.appendChild(h('option', { value: c[0], text: c[1] }));
      });
      fcolSel.value = s.fcol; ocolSel.value = s.ocol; dirSel.value = s.desc ? 'desc' : 'asc'; topSel.value = s.top; valIn.value = s.val;
      buildOps();
    }
    function buildOps() {
      opSel.textContent = '';
      var keys = colType(s.fcol) === 'date' ? ['eq', 'ge', 'le'] : ['eq', 'ne', 'like', 'begins'];
      keys.forEach(function (k) { opSel.appendChild(h('option', { value: k, text: OPS[k] })); });
      if (keys.indexOf(s.op) < 0) s.op = keys[0];
      opSel.value = s.op;
      opSel.disabled = valIn.disabled = !s.fcol;
      valIn.type = colType(s.fcol) === 'date' ? 'date' : 'text';
      if (valIn.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(s.val)) { s.val = '2026-01-01'; valIn.value = s.val; }
    }

    tableSel.addEventListener('change', function () {
      s.table = tableSel.value; s.cols = {};
      T().cols.forEach(function (c) { s.cols[c[0]] = true; });
      s.fcol = ''; s.val = ''; s.ocol = T().cols[0][0]; s.desc = false;
      buildControls(); renderQuery(); execute();
    });
    fcolSel.addEventListener('change', function () { s.fcol = fcolSel.value; if (!s.fcol) s.val = ''; else if (colType(s.fcol) !== 'date' && /^\d{4}-/.test(s.val)) s.val = ''; valIn.value = s.val; buildOps(); renderQuery(); });
    opSel.addEventListener('change', function () { s.op = opSel.value; renderQuery(); });
    valIn.addEventListener('input', function () { s.val = valIn.value; renderQuery(); });
    valIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') execute(); });
    ocolSel.addEventListener('change', function () { s.ocol = ocolSel.value; renderQuery(); });
    dirSel.addEventListener('change', function () { s.desc = dirSel.value === 'desc'; renderQuery(); });
    topSel.addEventListener('change', function () { s.top = +topSel.value; renderQuery(); });

    function selCols() { return T().cols.filter(function (c) { return s.cols[c[0]]; }).map(function (c) { return c[0]; }); }
    function hasFilter() { return !!s.fcol && s.val.trim() !== ''; }
    var q1 = function (v) { return v.replace(/'/g, "''"); };
    var xml = function (v) { return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };

    function odata() {
      var parts = ['$select=' + selCols().join(',')];
      if (hasFilter()) {
        var v = s.val.trim(), c = s.fcol, d = colType(c) === 'date';
        var f = { eq: d ? c + ' eq ' + v : c + " eq '" + q1(v) + "'", ne: c + " ne '" + q1(v) + "'", like: 'contains(' + c + ",'" + q1(v) + "')", begins: 'startswith(' + c + ",'" + q1(v) + "')", ge: c + ' ge ' + v, le: c + ' le ' + v }[s.op];
        parts.push('$filter=' + f);
      }
      parts.push('$orderby=' + s.ocol + (s.desc ? ' desc' : ' asc'));
      parts.push('$top=' + s.top);
      return 'GET [Organization URI]/api/data/v9.2/' + T().set + '?\n    ' + parts.join('\n   &') + '\n\nAccept: application/json\nOData-Version: 4.0';
    }
    function fetchXml() {
      var L = ['<fetch top="' + s.top + '">', '  <entity name="' + s.table + '">'];
      selCols().forEach(function (c) { L.push('    <attribute name="' + c + '" />'); });
      if (hasFilter()) {
        var v = xml(s.val.trim());
        var map = { eq: ['eq', v], ne: ['ne', v], like: ['like', '%' + v + '%'], begins: ['like', v + '%'], ge: ['on-or-after', v], le: ['on-or-before', v] }[s.op];
        L.push('    <filter>', '      <condition attribute="' + s.fcol + '" operator="' + map[0] + '" value="' + map[1] + '" />', '    </filter>');
      }
      L.push('    <order attribute="' + s.ocol + '" descending="' + s.desc + '" />', '  </entity>', '</fetch>');
      return L.join('\n');
    }
    function sql() {
      var L = ['SELECT TOP ' + s.top + ' ' + selCols().join(', '), 'FROM ' + s.table];
      if (hasFilter()) {
        var v = q1(s.val.trim());
        L.push('WHERE ' + s.fcol + ' ' + { eq: "= '" + v + "'", ne: "<> '" + v + "'", like: "LIKE '%" + v + "%'", begins: "LIKE '" + v + "%'", ge: ">= '" + v + "'", le: "<= '" + v + "'" }[s.op]);
      }
      L.push('ORDER BY ' + s.ocol + (s.desc ? ' DESC' : ' ASC') + ';');
      return L.join('\n');
    }
    var XTOK = /(<\/?[\w-]+)|([\w-]+)(?==)|("[^"]*")|(\$\w+|\b(?:SELECT|TOP|FROM|WHERE|ORDER BY|LIKE|DESC|ASC|GET|eq|ne|ge|le|contains|startswith)\b)|('[^']*')/g;
    function hl(src) {
      var out = '', last = 0, m;
      XTOK.lastIndex = 0;
      while ((m = XTOK.exec(src))) {
        if (!m[0]) { XTOK.lastIndex++; continue; }
        out += esc(src.slice(last, m.index));
        var cls = m[1] ? 't' : m[2] ? 'n' : m[3] || m[5] ? 's' : 'k';
        out += '<span class="tk-' + cls + '">' + esc(m[0]) + '</span>';
        last = XTOK.lastIndex;
      }
      return out + esc(src.slice(last));
    }
    function renderQuery() { codeEl.innerHTML = hl(s.lang === 'odata' ? odata() : s.lang === 'fetch' ? fetchXml() : sql()); }

    function results() {
      var rows = T().rows.slice();
      if (hasFilter()) {
        var v = s.val.trim().toLowerCase(), c = s.fcol;
        rows = rows.filter(function (r) {
          var x = String(r[c] || '').toLowerCase();
          switch (s.op) {
            case 'eq': return x === v;
            case 'ne': return x !== v;
            case 'like': return x.indexOf(v) > -1;
            case 'begins': return x.indexOf(v) === 0;
            case 'ge': return x >= v;
            case 'le': return x <= v;
          }
          return true;
        });
      }
      var total = rows.length;
      rows.sort(function (a, b) { var x = String(a[s.ocol]), y = String(b[s.ocol]); return (x < y ? -1 : x > y ? 1 : 0) * (s.desc ? -1 : 1); });
      return { rows: rows.slice(0, s.top), total: total };
    }
    async function execute() {
      runBtn.disabled = true;
      grid.classList.add('loading');
      var t0 = performance.now();
      await wait(rand(220, 520));
      var r = results(), cols = selCols();
      grid.textContent = '';
      var labels = {}; T().cols.forEach(function (c) { labels[c[0]] = c[1]; });
      if (!r.rows.length) grid.appendChild(h('p', { class: 'dv-empty', text: 'No rows match this filter.' }));
      else grid.appendChild(h('table', null,
        h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { scope: 'col' }, labels[c], h('small', { text: c })); }))),
        h('tbody', null, r.rows.map(function (row) { return h('tr', null, cols.map(function (c) { return h('td', { text: row[c] }); })); }))));
      meta.textContent = r.rows.length + ' of ' + r.total + ' row(s) · ' + Math.round(performance.now() - t0) + ' ms';
      grid.classList.remove('loading');
      runBtn.disabled = false;
    }

    buildControls(); renderQuery(); execute();
  }

  PG.register({ id: 'dv', order: 70, group: 'Data', short: 'Dataverse', name: 'Dataverse', color: '#3b7d23', icon: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3', init: initDataverse });
})(window.PG);
