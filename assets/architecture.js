/* Interactive reference architecture: click a component to see when I use it,
   what I watch out for, and (where I've written about it) the article. */
(function () {
  'use strict';
  var host = document.getElementById('ra');
  if (!host) return;
  var ARTICLES = window.ARTICLES || [];
  function find(phrase) {
    var p = phrase.toLowerCase();
    for (var i = 0; i < ARTICLES.length; i++) if (ARTICLES[i].t.toLowerCase().indexOf(p) > -1) return ARTICLES[i];
    return null;
  }

  var LAYERS = [
    { name: 'Experience', note: 'Where people and agents meet the solution', items: [
      ['Canvas apps', 'Task-focused and mobile apps with a precise layout, over almost any data source.', 'Delegation. Design queries the data source can run, or users silently get partial results.', 'Delegation Warnings'],
      ['Model-driven apps', 'Process-heavy back-office work on Dataverse: forms, views, business process flows and security out of the box.', 'Over-customised forms hurt performance and upgrades. Keep them lean.', 'Model-Driven Apps'],
      ['Code apps', 'Bespoke React and TypeScript experiences that still run on Power Platform, with connectors, sign-in and governance.', 'They are pro-code: they need source control, CI and a team that owns them.', null],
      ['Power Pages', 'External sites for customers and partners over the same Dataverse data.', 'Table permissions and anonymous access need a regular review.', 'Anonymous Access Risks'],
      ['Copilot Studio agents', 'Conversational access to knowledge and actions in Teams and Microsoft 365 Copilot.', 'Ground agents on approved sources and keep a human in the loop for anything that changes data.', 'Human in the Loop']
    ] },
    { name: 'Process & logic', note: 'Orchestration and business rules', items: [
      ['Power Automate', 'Business process orchestration, approvals and notifications.', 'Use Scope and run-after for error handling, and avoid chatty loops that burn through API limits.', 'Scope Action & Configure Run After'],
      ['Azure Functions', 'Compute-heavy, reusable or latency-sensitive logic, versioned and tested like any other service.', 'Keep them stateless and idempotent, and secure them with managed identity.', null],
      ['Dataverse plug-ins', 'Rules that must run inside the database transaction.', 'Keep them fast and never call slow external services synchronously.', null],
      ['Azure Logic Apps', 'System-to-system integration owned by IT, with enterprise connectors and monitoring.', 'Decide early which team owns which workflows, so flows and Logic Apps don\'t overlap.', null]
    ] },
    { name: 'Integration', note: 'Contracts between systems', items: [
      ['Custom connectors', 'One governed, reusable contract for an API that makers can share.', 'Version them and classify them in DLP policies like any other connector.', null],
      ['Azure API Management', 'The front door for line-of-business APIs: authentication, throttling, versioning and analytics.', 'Don\'t let it become a pass-through. Apply policies and products deliberately.', null],
      ['Service Bus & events', 'Decoupled, near real-time integration between systems.', 'Use the outbox pattern and idempotent consumers so events are never lost or double-processed.', 'Transactional Outbox'],
      ['Microsoft Graph', 'Users, groups, mail, Teams and SharePoint through one API.', 'Least privilege: prefer Sites.Selected to tenant-wide permissions.', null],
      ['ERP & ITSM APIs', 'Business Central, ServiceNow and Fresh Service for finance, procurement and service processes.', 'Let the ERP run its own business logic through bound actions rather than rebuilding it in flows.', 'List records from Business Central']
    ] },
    { name: 'Data', note: 'Systems of record and analytics', items: [
      ['Dataverse', 'The default for relational business data: security roles, auditing, relationships and a governed API.', 'Model for the process, not the screen, and plan capacity early.', 'Deep Dive into Dataverse SQL'],
      ['SharePoint', 'Documents and simple lists for Microsoft 365-native solutions.', 'The list view threshold and delegation limits arrive sooner than teams expect.', 'Configuration List Instead of Environment Variables'],
      ['Azure SQL', 'High-volume transactional data with set-based logic in stored procedures.', 'Push paging and aggregation to the server instead of the app.', 'Pagination with SQL Stored Procedures'],
      ['Fabric & Power BI', 'Analytics and reporting without loading the operational store.', 'Agree one semantic model so every report tells the same story.', null]
    ] },
    { name: 'Security & identity', note: 'Who can do what, and where data lives', items: [
      ['Microsoft Entra ID', 'Identity for people and apps; groups drive access everywhere.', 'Avoid per-user grants. Joiners and leavers should be one change in one place.', null],
      ['Security roles & teams', 'Row and column-level access in Dataverse, mapped from Entra ID groups.', 'Design roles around jobs, not individuals, and test with real personas.', null],
      ['DLP policies', 'Control which connectors may share data, keeping business and non-business data apart.', 'Set the default environment strategy before makers arrive, not after.', null],
      ['Managed environments', 'Environment-level governance: sharing limits, solution checker enforcement and IP firewall.', 'Pair it with an environment request process so makers aren\'t blocked.', null],
      ['Data residency', 'Pick the environment region deliberately for regulated data.', 'Region choices are hard to undo. Decide them on day one.', 'Macro Regions']
    ] },
    { name: 'ALM & operations', note: 'How changes reach production and stay healthy', items: [
      ['Solutions & source control', 'Everything ships in solutions, unpacked into Git for review and history.', 'Use connection references and environment variables, never hard-coded connections.', null],
      ['Release pipelines', 'Azure DevOps, GitHub Actions or Power Platform Pipelines promote Dev → Test → Prod.', 'Deploy managed solutions downstream and keep production free of unmanaged changes.', null],
      ['Solution checker', 'A quality gate that blocks high and critical issues before they ship.', 'Fail the build on issues, don\'t just report them.', null],
      ['CoE & monitoring', 'Inventory, adoption and telemetry through the CoE toolkit and Application Insights.', 'Measure adoption as well as uptime, because unused apps are a cost too.', 'Building Your Own Analytics']
    ] }
  ];

  var detail = document.createElement('aside');
  detail.className = 'ra-detail';
  detail.setAttribute('aria-live', 'polite');
  var grid = document.createElement('div');
  grid.className = 'ra-grid';
  var buttons = [];

  LAYERS.forEach(function (layer, li) {
    var row = document.createElement('div');
    row.className = 'ra-row';
    row.style.setProperty('--i', li);
    var head = document.createElement('div');
    head.className = 'ra-head';
    head.innerHTML = '<b></b><small></small>';
    head.querySelector('b').textContent = layer.name;
    head.querySelector('small').textContent = layer.note;
    var items = document.createElement('div');
    items.className = 'ra-items';
    layer.items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ra-item';
      b.textContent = it[0];
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { select(b, layer, it); });
      items.appendChild(b);
      buttons.push(b);
    });
    row.appendChild(head); row.appendChild(items);
    grid.appendChild(row);
  });
  host.appendChild(grid);
  host.appendChild(detail);

  function select(btn, layer, it) {
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
    detail.textContent = '';
    var k = document.createElement('span'); k.className = 'ra-k'; k.textContent = layer.name;
    var h = document.createElement('h4'); h.textContent = it[0];
    var use = document.createElement('p'); use.innerHTML = '<b>When I use it</b>'; use.appendChild(document.createTextNode(it[1]));
    var watch = document.createElement('p'); watch.innerHTML = '<b>What I watch out for</b>'; watch.appendChild(document.createTextNode(it[2]));
    detail.appendChild(k); detail.appendChild(h); detail.appendChild(use); detail.appendChild(watch);
    var a = it[3] && find(it[3]);
    if (a) {
      var link = document.createElement('a');
      link.className = 'arrow'; link.href = a.u; link.target = '_blank'; link.rel = 'noopener';
      link.textContent = 'Read: ' + a.t;
      detail.appendChild(link);
    }
  }
  select(buttons.filter(function (b) { return b.textContent === 'Dataverse'; })[0], LAYERS[3], LAYERS[3].items[0]);
})();
