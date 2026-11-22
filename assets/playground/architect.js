/* Architect: answer seven questions, get a layered solution architecture,
   the risks that come with it, indicative licensing and an exportable ADR. */
(function (PG) {
  'use strict';
  var h = PG.h, panelHead = PG.panelHead, articleLink = PG.articleLink, copyText = PG.copyText;

  var Q = [
    { id: 'audience', label: 'Who uses it?', opts: [['internal', 'Employees'], ['external', 'Customers & partners'], ['both', 'Both']] },
    { id: 'scale', label: 'How many users?', opts: [['s', 'Under 50'], ['m', '50–500'], ['l', '500–5,000'], ['xl', '5,000+']] },
    { id: 'data', label: 'What kind of data?', opts: [['lists', 'Lists & documents'], ['relational', 'Relational business data'], ['volume', 'High-volume transactions'], ['sor', 'Lives in an ERP or CRM']] },
    { id: 'ux', label: 'How do people work?', opts: [['desk', 'Forms & processes'], ['field', 'Mobile, often offline'], ['custom', 'Highly custom UX'], ['chat', 'Conversational']] },
    { id: 'integ', label: 'Integration needs', opts: [['m365', 'Microsoft 365 only'], ['apis', 'Line-of-business APIs'], ['events', 'Event-driven, near real-time']] },
    { id: 'team', label: 'Who builds and runs it?', opts: [['makers', 'Citizen makers'], ['fusion', 'Fusion team'], ['pro', 'Pro developers']] },
    { id: 'compliance', label: 'Compliance', opts: [['standard', 'Standard'], ['regulated', 'Regulated: audit & residency']] }
  ];
  var PRESETS = [
    { name: 'Field inspections app', a: { audience: 'internal', scale: 'm', data: 'relational', ux: 'field', integ: 'm365', team: 'fusion', compliance: 'standard' } },
    { name: 'Vendor onboarding portal', a: { audience: 'both', scale: 'l', data: 'sor', ux: 'desk', integ: 'apis', team: 'fusion', compliance: 'regulated' } },
    { name: 'Employee help agent', a: { audience: 'internal', scale: 'xl', data: 'lists', ux: 'chat', integ: 'm365', team: 'makers', compliance: 'standard' } },
    { name: 'Commodity trading platform', a: { audience: 'internal', scale: 'm', data: 'volume', ux: 'custom', integ: 'events', team: 'pro', compliance: 'regulated' } }
  ];
  var LAYERS = [
    ['exp', 'Experience', 'M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z'],
    ['logic', 'Process & logic', 'M4 4h6v6H4zM14 14h6v6h-6zM7 10v3a3 3 0 0 0 3 3h4'],
    ['integ', 'Integration', 'M8 7l-5 5 5 5M16 7l5 5-5 5'],
    ['data', 'Data', 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6'],
    ['sec', 'Security & identity', 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z'],
    ['alm', 'ALM & governance', 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4']
  ];

  function recommend(a) {
    var R = { exp: [], logic: [], integ: [], data: [], sec: [], alm: [], why: {}, risks: [], lic: [], plus: [] };
    var big = a.scale === 'l' || a.scale === 'xl';
    var internal = a.audience !== 'external', external = a.audience !== 'internal';

    /* Data */
    var spOk = a.data === 'lists' && !big && a.compliance === 'standard' && a.audience === 'internal' && a.ux !== 'field';
    if (spOk) {
      R.data = ['SharePoint lists & libraries'];
      R.why.data = 'Simple lists and documents for a modest internal audience sit well in SharePoint, which Microsoft 365 already licenses.';
      R.risks.push(['Delegation and list thresholds', 'Index columns and keep queries delegable. Plan the move to Dataverse before lists reach tens of thousands of items.', 'Delegation Warnings']);
    } else if (a.data === 'lists') {
      R.data = ['Dataverse', 'SharePoint (documents)'];
      R.why.data = 'At this scale or compliance level, records need security roles, auditing and referential integrity, so they go into Dataverse while documents stay in SharePoint.';
    } else if (a.data === 'relational') {
      R.data = ['Dataverse'];
      R.why.data = 'Relational data with business rules belongs in Dataverse: relationships, security roles, auditing and a governed Web API come built in.';
    } else if (a.data === 'volume') {
      R.data = ['Azure SQL Database', 'Dataverse (app configuration)', 'Microsoft Fabric (analytics)'];
      R.why.data = 'Millions of transactional rows need set-based SQL. Stored procedures and views keep heavy work on the server, Dataverse holds app configuration, and Fabric serves analytics.';
      R.risks.push(['Delegation and payload size', 'Push filtering, paging and aggregation into stored procedures instead of the app.', 'Pagination with SQL Stored Procedures']);
    } else {
      R.data = ['ERP / CRM stays the system of record', 'Dataverse virtual tables', 'Dataverse (process data)'];
      R.why.data = 'The ERP remains the source of truth. Virtual tables or connectors read it in place, and only the process data the ERP doesn\'t own lives in Dataverse.';
    }
    var usesDataverse = R.data.some(function (d) { return d.indexOf('Dataverse') === 0; });

    /* Experience */
    if (internal) {
      if (a.ux === 'chat') R.exp.push('Copilot Studio agent in Teams & Microsoft 365 Copilot');
      else if (a.ux === 'field') R.exp.push('Canvas app with an offline profile');
      else if (a.ux === 'custom') R.exp.push(a.team === 'makers' ? 'Canvas app + PCF components' : 'Code app (React + TypeScript)');
      else R.exp.push(usesDataverse ? 'Model-driven app' : 'Canvas app');
    }
    if (external) R.exp.push(a.ux === 'custom' && a.team === 'pro' ? 'Power Pages + custom JavaScript on the Web API' : 'Power Pages site');
    if (external && a.ux === 'chat') R.exp.push('Copilot Studio agent on the site');
    if (a.ux === 'chat' && internal && usesDataverse) R.exp.push('Model-driven app for admins');
    R.why.exp = {
      chat: 'People ask rather than navigate, so an agent meets them where they already work. Actions run through flows with a human in the loop.',
      field: 'Field work needs a phone-first UI that keeps working without signal, so a canvas app with an offline profile on Dataverse fits.',
      custom: a.team === 'makers' ? 'Makers keep ownership in canvas while PCF components cover the few interactions low-code can\'t express.' : 'A bespoke UX is easier to build and test in React and TypeScript. Code apps keep Power Platform connectors, sign-in and governance.',
      desk: usesDataverse ? 'Process-heavy, form-driven work gets views, business process flows and security for free in a model-driven app.' : 'A focused canvas app over SharePoint is quick to deliver and easy for the team to own.'
    }[a.ux] + (external ? ' External users get a Power Pages site over the same data, secured with table permissions.' : '');

    /* Process & logic */
    R.logic.push(a.ux === 'chat' ? 'Agent flows & topics' : 'Power Automate cloud flows');
    if (a.team !== 'makers' || a.data === 'volume' || a.integ === 'events') R.logic.push('Azure Functions');
    if (a.team === 'pro' && usesDataverse) R.logic.push('Dataverse plug-ins');
    if (a.integ !== 'm365' && a.team !== 'makers') R.logic.push('Azure Logic Apps (system-to-system)');
    R.why.logic = a.team === 'makers'
      ? 'Makers own the logic in flows; anything heavy or reusable is a candidate to move into Azure later.'
      : 'Flows orchestrate the business process. Compute-heavy, reusable or latency-sensitive logic moves into Azure Functions where it can be versioned and tested.';

    /* Integration */
    if (a.integ === 'm365') {
      R.integ = ['Standard connectors (Outlook, Teams, SharePoint)', 'Microsoft Graph'];
      R.why.integ = 'Staying on standard Microsoft 365 connectors keeps integration simple and inside existing licensing.';
    } else if (a.integ === 'apis') {
      R.integ = ['Custom connector', 'Azure API Management', 'Entra ID app registration (least privilege)'];
      R.why.integ = 'Line-of-business APIs sit behind API Management. One custom connector gives makers a governed, reusable contract instead of raw HTTP calls.';
    } else {
      R.integ = ['Azure Service Bus', 'Dataverse webhooks + transactional outbox', 'Idempotent Azure Functions consumers'];
      R.why.integ = 'Near real-time sync needs events, not polling. An outbox makes sure no event is lost when a transaction commits, and idempotent consumers make retries safe.';
      R.risks.push(['Lost or duplicated events', 'Write events through an outbox and make every consumer idempotent.', 'Transactional Outbox']);
    }
    if (a.data === 'sor') R.integ.push('ERP APIs (e.g. Business Central API v2.0)');

    /* Security */
    R.sec.push(usesDataverse ? 'Entra ID security groups → Dataverse teams & security roles' : 'Entra ID groups → SharePoint permissions');
    if (external) R.sec.push('Power Pages web roles & table permissions', 'Microsoft Entra External ID sign-in');
    if (a.ux === 'chat') R.sec.push('Agent authentication with Entra ID');
    if (a.compliance === 'regulated') R.sec.push('Auditing & retention policies', 'Data residency via environment region', 'Customer-managed keys');
    R.why.sec = 'Access follows identity: groups in Entra ID map to roles, so joiners and leavers are handled in one place.' + (a.compliance === 'regulated' ? ' Regulated data adds auditing, a deliberate environment region and customer-managed keys.' : '');
    if (a.compliance === 'regulated') R.risks.push(['Audit and residency gaps', 'Choose environment regions deliberately and switch on auditing and retention from day one.', 'Macro Regions']);
    if (external) R.risks.push(['Anonymous exposure', 'Review table permissions and anonymous access on a regular schedule.', 'Anonymous Access Risks']);

    /* ALM */
    if (a.team === 'makers') {
      R.alm = ['Managed environments', 'Dev / Test / Prod', 'Power Platform Pipelines', 'DLP policies'];
      R.why.alm = 'In-product pipelines and managed environments give makers safe promotion without running a DevOps toolchain.';
    } else {
      R.alm = ['Dev / Test / Prod + developer environments', 'Azure DevOps or GitHub Actions', 'Solution checker quality gate', 'Environment variables & connection references', 'DLP policies'];
      R.why.alm = 'Source-controlled solutions, an automated quality gate and deployment settings per stage make releases repeatable and auditable.';
    }
    if (big) R.alm.push('CoE monitoring & Application Insights');

    /* Cross-cutting risks */
    if (big) R.risks.push(['Service protection and API limits', 'Batch writes, avoid chatty loops, and watch request consumption per user and flow.', 'Changeset Request']);
    if (a.ux === 'chat') R.risks.push(['Ungrounded or unsafe answers', 'Ground the agent on approved knowledge, cite sources, and keep a human in the loop for actions.', 'Human in the Loop']);
    if (a.ux === 'field') R.risks.push(['Offline conflicts', 'Keep offline tables small and filtered, and define conflict resolution up front.', null]);
    if (a.team === 'makers' && big) R.risks.push(['Maker sprawl', 'Managed environments, DLP and a CoE review cadence keep growth governed.', null]);
    if (a.ux === 'custom' && a.team !== 'makers') R.risks.push(['Pro-code ownership', 'Assign a fusion team to own the code, with CI and typed generated services.', null]);

    /* Licensing (indicative) */
    var premium = usesDataverse || a.integ !== 'm365' || a.data === 'volume' || R.exp.some(function (x) { return x.indexOf('Code app') === 0; });
    if (!premium && internal) R.lic.push('Microsoft 365 licences cover SharePoint, canvas apps and standard connectors.');
    if (premium && internal) R.lic.push('Power Apps Premium (per user) or pay-as-you-go for Dataverse, premium and custom connectors, and code apps.');
    if (external) R.lic.push('Power Pages capacity for authenticated and anonymous users.');
    if (a.ux === 'chat') R.lic.push('Copilot Studio capacity (Copilot Credits).');
    if (a.data === 'volume' || a.integ !== 'm365' || a.team !== 'makers') R.lic.push('Azure consumption for SQL, Functions, API Management or Service Bus.');

    /* What this buys you */
    R.plus.push('Governed by default: environments, DLP and identity-based access from the first release.');
    if (usesDataverse) R.plus.push('One secure data platform shared by apps, flows, agents and Power BI.');
    if (a.team !== 'makers') R.plus.push('Repeatable, auditable releases through source control and automated gates.');
    if (a.integ === 'events') R.plus.push('Loose coupling: systems can change independently behind events.');
    if (a.ux === 'chat') R.plus.push('Users get answers in Teams without learning a new app.');
    return R;
  }

  function label(qid, val) { var q = Q.filter(function (x) { return x.id === qid; })[0]; return q.opts.filter(function (o) { return o[0] === val; })[0][1]; }

  function adr(a, R, title) {
    var d = new Date().toISOString().slice(0, 10);
    var L = ['# ADR-001: ' + title, '', 'Status: Proposed · Date: ' + d, '', '## Context'];
    Q.forEach(function (q) { L.push('- ' + q.label.replace('?', '') + ': ' + label(q.id, a[q.id])); });
    L.push('', '## Decision');
    LAYERS.forEach(function (l) { L.push('- ' + l[1] + ': ' + R[l[0]].join('; ')); });
    L.push('', '## Rationale');
    LAYERS.forEach(function (l) { if (R.why[l[0]]) L.push('- ' + l[1] + ': ' + R.why[l[0]]); });
    L.push('', '## Consequences');
    R.plus.forEach(function (p) { L.push('+ ' + p); });
    R.risks.forEach(function (r) { L.push('- Risk: ' + r[0] + '. Mitigation: ' + r[1]); });
    L.push('', '## Licensing (indicative)');
    R.lic.forEach(function (x) { L.push('- ' + x); });
    return L.join('\n');
  }

  function initArchitect(panel) {
    var a = {}; Object.keys(PRESETS[0].a).forEach(function (k) { a[k] = PRESETS[0].a[k]; });
    var title = PRESETS[0].name, prev = {};

    var presetRow = h('div', { class: 'ar-presets' }, h('span', { class: 'ar-presets-l', text: 'Start from a scenario' }),
      PRESETS.map(function (p) {
        return h('button', { type: 'button', class: 'pg-chip', 'data-preset': p.name, onclick: function () {
          Object.keys(p.a).forEach(function (k) { a[k] = p.a[k]; }); title = p.name; syncInputs(); render();
        } }, p.name);
      }));
    var groups = Q.map(function (q) {
      var btns = q.opts.map(function (o) {
        return h('button', { type: 'button', role: 'radio', class: 'ar-opt', 'data-q': q.id, 'data-v': o[0], onclick: function () { a[q.id] = o[0]; title = 'Custom solution'; syncInputs(); render(); } }, o[1]);
      });
      return h('div', { class: 'ar-q' }, h('span', { class: 'ar-q-l', id: 'arq-' + q.id, text: q.label }), h('div', { class: 'ar-seg', role: 'radiogroup', 'aria-labelledby': 'arq-' + q.id }, btns));
    });
    var form = h('div', { class: 'ar-form' }, groups);
    var bp = h('div', { class: 'ar-bp' });
    var summary = h('p', { class: 'ar-sum' });
    var risks = h('ul', { class: 'ar-risks' });
    var lic = h('ul', { class: 'ar-lic' });
    var plus = h('ul', { class: 'ar-plus' });
    var adrPre = h('pre', { class: 'ca-code ar-adr', tabindex: '0' });
    var copyBtn = h('button', { type: 'button', class: 'pg-btn small', onclick: function () { copyText(adrPre.textContent, copyBtn); } }, 'Copy ADR');

    panel.appendChild(panelHead('Design a solution', 'This is how I start every engagement: understand who it is for, what the data looks like, and who will run it. Answer seven questions and get a layered architecture, the risks that come with it, indicative licensing and an architecture decision record you can copy.'));
    panel.appendChild(presetRow);
    panel.appendChild(h('div', { class: 'ar' },
      form,
      h('div', { class: 'ar-out' },
        h('div', { class: 'ar-out-h' }, h('div', null, h('span', { class: 'ar-kicker', text: 'Recommended architecture' }), summary)),
        bp,
        h('div', { class: 'ar-cols' },
          h('div', { class: 'ar-box' }, h('h4', { text: 'Risks & mitigations' }), risks),
          h('div', { class: 'ar-box' }, h('h4', { text: 'What this buys you' }), plus, h('h4', { class: 'ar-lic-h', text: 'Licensing (indicative)' }), lic,
            h('p', { class: 'ar-note', text: 'Confirm against the current Microsoft licensing guide before committing.' }))),
        h('details', { class: 'ar-adr-d' }, h('summary', null, h('span', { text: 'Architecture decision record' }), copyBtn), adrPre))));

    function syncInputs() {
      form.querySelectorAll('.ar-opt').forEach(function (b) { b.setAttribute('aria-checked', String(a[b.getAttribute('data-q')] === b.getAttribute('data-v'))); b.tabIndex = a[b.getAttribute('data-q')] === b.getAttribute('data-v') ? 0 : -1; });
      presetRow.querySelectorAll('[data-preset]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-preset') === title)); });
    }
    form.addEventListener('keydown', function (e) {
      if (!e.target.classList.contains('ar-opt')) return;
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var sibs = Array.prototype.slice.call(e.target.parentElement.children), i = sibs.indexOf(e.target);
      var n = sibs[(i + d + sibs.length) % sibs.length]; n.click(); n.focus();
    });

    function render() {
      var R = recommend(a);
      var hub = R.data[0].indexOf('Dataverse') === 0 || R.data.some(function (x) { return x.indexOf('Dataverse') === 0; }) ? 'Dataverse-centred' : R.data[0].indexOf('SharePoint') === 0 ? 'Microsoft 365-native' : 'SQL-centred';
      summary.textContent = title + ' · ' + { makers: 'Maker-led', fusion: 'Fusion team', pro: 'Pro-code' }[a.team] + ' · ' + hub + (a.compliance === 'regulated' ? ' · Regulated' : '');
      bp.textContent = '';
      LAYERS.forEach(function (l) {
        var key = l[0], items = R[key], before = prev[key] || [];
        bp.appendChild(h('div', { class: 'ar-layer', 'data-layer': key },
          h('div', { class: 'ar-ll' }, PG.icon(l[2], 16), h('span', { text: l[1] })),
          h('div', { class: 'ar-lr' },
            h('div', { class: 'ar-chips' }, items.map(function (t, i) { return h('span', { class: 'ar-chip' + (i === 0 ? ' main' : '') + (before.indexOf(t) < 0 && prev.exp ? ' new' : ''), text: t }); })),
            R.why[key] ? h('p', { class: 'ar-why', text: R.why[key] }) : null)));
      });
      prev = { exp: R.exp, logic: R.logic, integ: R.integ, data: R.data, sec: R.sec, alm: R.alm };
      risks.textContent = '';
      if (!R.risks.length) risks.appendChild(h('li', { class: 'muted', text: 'No major risks for this shape. Keep the governance basics in place.' }));
      R.risks.forEach(function (r) {
        risks.appendChild(h('li', null, h('b', { text: r[0] }), h('span', { text: r[1] }), r[2] ? articleLink(r[2], 'My article on this ↗') : null));
      });
      plus.textContent = ''; R.plus.forEach(function (p) { plus.appendChild(h('li', { text: p })); });
      lic.textContent = ''; R.lic.forEach(function (p) { lic.appendChild(h('li', { text: p })); });
      adrPre.textContent = adr(a, R, title);
    }
    syncInputs(); render();
  }

  PG.register({ id: 'architect', order: 10, group: 'Design', short: 'Architect', name: 'Solution Architect', color: '#c2410c', icon: 'M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6', init: initArchitect });
})(window.PG);
