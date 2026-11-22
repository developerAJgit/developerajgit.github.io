/* Code Apps: React + TypeScript on Power Platform, driven by the pac CLI. */
(function (PG) {
  'use strict';
  var h = PG.h, icon = PG.icon, panelHead = PG.panelHead, wait = PG.wait, rand = PG.rand, iso = PG.iso,
    guid = PG.guid, esc = PG.esc, fmtMs = PG.fmtMs, ARTICLES = PG.ARTICLES,
    pageCerts = PG.pageCerts, pageRoles = PG.pageRoles, pageProjects = PG.pageProjects;

  function initCode(panel) {
    var SOURCES = [
      { id: 'o365', label: 'Office 365 Users', api: 'shared_office365users', svc: 'Office365UsersService', cmd: '-a "shared_office365users" -c "<connectionId>"', file: 'Office365UsersService.ts' },
      { id: 'dv', label: 'Dataverse · accounts', api: 'dataverse', svc: 'AccountsService', cmd: '-a dataverse -t accounts', file: 'AccountsService.ts' },
      { id: 'sql', label: 'SQL Server · Projects', api: 'shared_sql', svc: 'ProjectsService', cmd: '-a "shared_sql" -c "<connectionId>" -t "[dbo].[Projects]" -d "contoso-sql.database.windows.net,portfolio"', file: 'ProjectsService.ts' },
      { id: 'sp', label: 'SharePoint · Requests', api: 'shared_sharepointonline', svc: 'RequestsService', cmd: '-a "shared_sharepointonline" -c "<connectionId>" -t "Requests" -d "https://contoso.sharepoint.com/sites/ops"', file: 'RequestsService.ts' }
    ];
    var s = { name: 'Ops Hub', on: { o365: true, dv: true }, file: 'App.tsx', phase: 'idle', busy: false, appId: null, pushed: false };

    var nameIn = h('input', { class: 'pg-input', value: s.name, maxlength: '30', 'aria-label': 'App display name' });
    var chips = SOURCES.map(function (src) {
      return h('button', { type: 'button', class: 'pg-chip', 'aria-pressed': String(!!s.on[src.id]), onclick: function () {
        if (s.busy) return;
        s.on[src.id] = !s.on[src.id];
        this.setAttribute('aria-pressed', String(!!s.on[src.id]));
        refresh(true, src);
      } }, src.label);
    });
    var runBtn = h('button', { type: 'button', class: 'pg-btn go', onclick: runAll }, '▶ Run the commands');
    var tabBtns = ['App.tsx', 'power.config.json'].map(function (f) {
      return h('button', { type: 'button', class: 'ca-tab', 'aria-pressed': String(f === s.file), onclick: function () { s.file = f; tabBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.textContent === f)); }); renderCode(); } }, f);
    });
    var code = h('pre', { class: 'ca-code', tabindex: '0', 'aria-label': 'Source code' });
    var url = h('span', { class: 'ca-url-t', text: 'localhost:3000' });
    var badge = h('span', { class: 'ca-pill', text: 'Not running' });
    var app = h('div', { class: 'ca-app' });
    var term = h('div', { class: 'ca-term', role: 'log', 'aria-live': 'polite' });
    var STEPS = ['init', 'add data', 'dev server', 'build', 'push'];
    var steps = h('ol', { class: 'ca-steps' }, STEPS.map(function (t) { return h('li', { text: t }); }));

    panel.appendChild(panelHead('Ship a code app', 'Code apps let you build in React and TypeScript and still run on Power Platform, with managed connectors, sign-in and governance included. Pick data sources and watch the code change. Then run the pac CLI commands to start it locally and publish it.'));
    panel.appendChild(h('div', { class: 'ca' },
      h('div', { class: 'ca-top' },
        h('label', { class: 'pg-field' }, h('span', { text: 'App name' }), nameIn),
        h('div', { class: 'pg-field' }, h('span', { text: 'Data sources' }), h('div', { class: 'pg-chips' }, chips)),
        runBtn),
      h('div', { class: 'ca-grid' },
        h('div', { class: 'ca-ide' }, h('div', { class: 'ca-tabs' }, tabBtns), code),
        h('div', { class: 'ca-prev' }, h('div', { class: 'ca-url' }, h('span', { class: 'ca-dots', 'aria-hidden': 'true' }), h('span', { class: 'ca-lock', 'aria-hidden': 'true', text: '⌂' }), url, badge), app)),
      steps, term));

    nameIn.addEventListener('input', function () { s.name = nameIn.value.trim() || 'My code app'; refresh(true); });

    function active() { return SOURCES.filter(function (x) { return s.on[x.id]; }); }

    function appTsx() {
      var on = active(), L = [];
      L.push('import { useEffect, useState } from "react";');
      on.forEach(function (x) { L.push('import { ' + x.svc + ' } from "./generated/services/' + x.svc + '";'); });
      L.push('');
      L.push('export default function App() {');
      if (s.on.o365) L.push('  const [me, setMe] = useState<{ displayName?: string; jobTitle?: string }>();');
      if (s.on.dv) L.push('  const [accounts, setAccounts] = useState<any[]>([]);');
      if (s.on.sql) L.push('  const [projects, setProjects] = useState<any[]>([]);');
      if (s.on.sp) L.push('  const [requests, setRequests] = useState<any[]>([]);');
      if (on.length) {
        L.push('');
        L.push('  useEffect(() => {');
        if (s.on.o365) L.push('    Office365UsersService.MyProfile_V2("displayName,jobTitle")', '      .then((r) => setMe(r.data));');
        if (s.on.dv) L.push('    AccountsService.getAll({ select: ["name", "revenue"], top: 4 })', '      .then((r) => setAccounts(r.data ?? []));');
        if (s.on.sql) L.push('    ProjectsService.getAll({ top: 3 })', '      .then((r) => setProjects(r.data ?? []));');
        if (s.on.sp) L.push('    RequestsService.getAll({ top: 3 })', '      .then((r) => setRequests(r.data ?? []));');
        L.push('  }, []);');
      }
      L.push('');
      L.push('  return (');
      L.push('    <main className="app">');
      L.push('      <h1>' + s.name.replace(/[<>{}]/g, '') + '</h1>');
      if (s.on.o365) L.push('      <ProfileCard user={me} />');
      if (s.on.dv) L.push('      <AccountsTable rows={accounts} />');
      if (s.on.sql) L.push('      <ProjectList items={projects} />');
      if (s.on.sp) L.push('      <RequestList items={requests} />');
      if (!on.length) L.push('      <p>Add a data source to get started.</p>');
      L.push('    </main>');
      L.push('  );');
      L.push('}');
      return L.join('\n');
    }
    function configJson() {
      var refs = {};
      active().filter(function (x) { return x.id !== 'dv'; }).forEach(function (x, i) {
        refs['00000000-0000-4000-8000-00000000000' + (i + 1)] = { id: '/providers/Microsoft.PowerApps/apis/' + x.api, displayName: x.label.split(' · ')[0], dataSources: [x.api.replace('shared_', '')] };
      });
      var cfg = {
        appId: s.appId,
        appDisplayName: s.name,
        environmentId: 'Default-<tenant-id>',
        buildPath: './dist',
        buildEntryPoint: 'index.html',
        localAppUrl: 'http://localhost:3000/',
        connectionReferences: refs
      };
      if (s.on.dv) cfg.databaseReferences = { 'default.cds': { dataSources: { accounts: { entitySetName: 'accounts', logicalName: 'account' } } } };
      return JSON.stringify(cfg, null, 2);
    }

    var TOK = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|`[^`]*`)|\b(import|from|export|default|function|const|return|null|true|false|useEffect|useState)\b|(<\/?[A-Za-z][\w.]*)|\b(\d+)\b/g;
    function highlight(src) {
      var out = '', last = 0, m;
      TOK.lastIndex = 0;
      while ((m = TOK.exec(src))) {
        out += esc(src.slice(last, m.index));
        var cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 't' : 'n';
        out += '<span class="tk-' + cls + '">' + esc(m[0]) + '</span>';
        last = TOK.lastIndex;
      }
      return out + esc(src.slice(last));
    }
    function renderCode() { code.innerHTML = highlight(s.file === 'App.tsx' ? appTsx() : configJson()); }

    function renderApp(loading) {
      app.textContent = '';
      if (s.phase === 'idle') {
        app.appendChild(h('div', { class: 'ca-idle' }, h('b', { text: 'Dev server not started' }), h('span', { text: 'Press "Run the commands" to start the app.' })));
        return;
      }
      app.appendChild(h('h5', { class: 'ca-h', text: s.name }));
      if (!active().length) { app.appendChild(h('p', { class: 'ca-mut', text: 'Add a data source to get started.' })); return; }
      if (loading) { app.appendChild(h('div', { class: 'ca-skel' }, h('i'), h('i'), h('i'))); return; }
      if (s.on.o365) app.appendChild(h('div', { class: 'ca-card ca-me' }, h('span', { class: 'ca-av', text: 'RS' }), h('div', null, h('b', { text: 'Riya Sharma' }), h('small', { text: 'Operations Lead · signed in' }))));
      if (s.on.dv) app.appendChild(h('div', { class: 'ca-card' }, h('span', { class: 'ca-lbl', text: 'Accounts · Dataverse' }),
        h('table', null, h('tbody', null, [['Contoso Ltd', '$4.2M'], ['Fabrikam Inc', '$2.9M'], ['Northwind Traders', '$1.6M'], ['Adventure Works', '$980K']].map(function (r) { return h('tr', null, h('td', { text: r[0] }), h('td', { text: r[1] })); })))));
      if (s.on.sql) app.appendChild(h('div', { class: 'ca-card' }, h('span', { class: 'ca-lbl', text: 'Projects · SQL Server' }),
        [['Vendor onboarding', 82], ['Trade capture', 55], ['Forecast engine', 30]].map(function (p) { return h('div', { class: 'ca-prog' }, h('span', { text: p[0] }), h('i', { style: { '--p': p[1] + '%' } }), h('small', { text: p[1] + '%' })); })));
      if (s.on.sp) app.appendChild(h('div', { class: 'ca-card' }, h('span', { class: 'ca-lbl', text: 'Requests · SharePoint' }),
        [['Laptop refresh', 'Approved', 'ok'], ['Site access: Finance', 'Pending', 'wait'], ['New vendor: Litware', 'In review', 'wait']].map(function (r) { return h('div', { class: 'ca-req' }, h('span', { text: r[0] }), h('em', { class: r[2], text: r[1] })); })));
    }

    function setStep(i) { Array.prototype.forEach.call(steps.children, function (li, j) { li.className = j < i ? 'done' : j === i ? 'on' : ''; }); }
    function line(html, cls) { var l = h('div', { class: cls || '', html: html }); term.appendChild(l); term.scrollTop = term.scrollHeight; return l; }
    async function type(cmd) {
      var l = line('<span class="p">$</span> ', 'cmd'), t = document.createTextNode(''); l.appendChild(t);
      for (var i = 0; i < cmd.length; i += 3) { t.textContent = cmd.slice(0, i + 3); await wait(12); term.scrollTop = term.scrollHeight; }
      await wait(220);
    }

    function refresh(hmr, src) {
      renderCode();
      if (s.phase !== 'idle') {
        renderApp(false);
        if (hmr && !s.busy) {
          if (src && s.on[src.id]) line('<span class="dim">pac code add-data-source ' + esc(src.cmd) + '</span>\n<span class="ok">✓</span> Generated src/generated/services/' + esc(src.file));
          else if (src) line('<span class="dim">pac code delete-data-source -a "' + esc(src.api) + '"</span>');
          line('<span class="dim">' + new Date().toLocaleTimeString() + '</span> <span class="v">[vite]</span> hmr update /src/App.tsx');
          if (s.pushed) { badge.textContent = 'Unpublished changes'; badge.className = 'ca-pill warn'; }
        }
      }
    }

    async function runAll() {
      if (s.busy) return;
      s.busy = true; runBtn.disabled = true; chips.forEach(function (c) { c.disabled = true; }); nameIn.disabled = true;
      term.textContent = ''; s.phase = 'idle'; s.pushed = false; s.appId = null; url.textContent = 'localhost:3000'; badge.textContent = 'Not running'; badge.className = 'ca-pill'; renderApp();
      setStep(0);
      await type('pac code init --displayName "' + s.name + '"');
      line('Initializing code app in the current directory…', 'dim'); await wait(500);
      line('<span class="ok">✓</span> Created power.config.json'); renderCode();
      setStep(1);
      var on = active();
      if (!on.length) line('<span class="warn">!</span> No data sources selected. Skipping.');
      for (var i = 0; i < on.length; i++) {
        await type('pac code add-data-source ' + on[i].cmd);
        await wait(380);
        line('<span class="ok">✓</span> Generated src/generated/models and services/' + esc(on[i].file));
      }
      setStep(2);
      await type('npm run dev');
      line('<span class="v">VITE</span> ready in ' + rand(280, 520) + ' ms');
      line('  ➜  Local: <u>http://localhost:3000/</u>');
      s.phase = 'dev'; badge.textContent = 'Local'; badge.className = 'ca-pill on'; renderApp(true);
      await wait(900); renderApp(false);
      setStep(3);
      await type('npm run build');
      line('vite building for production…', 'dim'); await wait(700);
      line('<span class="ok">✓</span> ' + (rand(38, 61)) + ' modules transformed. dist/ built in ' + (Math.random() * 1.2 + 1.1).toFixed(2) + 's');
      setStep(4);
      await type('pac code push');
      line('Packaging dist/ and uploading to environment…', 'dim'); await wait(1100);
      s.appId = guid(); renderCode();
      line('<span class="ok">✓</span> App published: <u>https://apps.powerapps.com/play/e/default/a/' + s.appId.slice(0, 8) + '…</u>');
      url.textContent = 'apps.powerapps.com/play/e/default/a/' + s.appId.slice(0, 8) + '…';
      badge.textContent = 'Published'; badge.className = 'ca-pill ok';
      s.pushed = true; s.phase = 'live';
      setStep(5);
      line('<span class="dim">Toggle a data source now to see hot reload.</span>');
      s.busy = false; runBtn.disabled = false; chips.forEach(function (c) { c.disabled = false; }); nameIn.disabled = false;
      runBtn.textContent = '↻ Run again';
    }

    renderCode(); renderApp();
    line('<span class="dim"># Terminal. Press "Run the commands" to scaffold, run and publish the app.</span>');
  }

  PG.register({ id: 'code', order: 40, group: 'Build', short: 'Code Apps', name: 'Code Apps', color: '#0e7c86', icon: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16', init: initCode });
})(window.PG);
