/* Integrations: an API explorer for the systems I integrate most often, with the
   request, a mocked response, how to call it from Power Automate, and the auth,
   least-privilege and throttling notes an architect cares about. */
(function (PG) {
  'use strict';
  var h = PG.h, panelHead = PG.panelHead, wait = PG.wait, rand = PG.rand, guid = PG.guid, highlight = PG.highlight, articleLink = PG.articleLink, copyText = PG.copyText;

  var SYS = {
    graph: { name: 'Microsoft Graph', host: 'https://graph.microsoft.com', c: '#0f6cbd', tag: 'MG' },
    sp: { name: 'SharePoint REST', host: 'https://contoso.sharepoint.com/sites/ops', c: '#03787c', tag: 'SP' },
    dv: { name: 'Dataverse Web API', host: 'https://contoso.crm.dynamics.com', c: '#3b7d23', tag: 'DV' },
    bc: { name: 'Business Central', host: 'https://api.businesscentral.dynamics.com/v2.0/{tenant}/Production', c: '#00838f', tag: 'BC' },
    snow: { name: 'ServiceNow', host: 'https://contoso.service-now.com', c: '#3a6b35', tag: 'SN' }
  };
  var users = [
    { displayName: 'Riya Sharma', mail: 'riya@contoso.com', jobTitle: 'Operations Lead' },
    { displayName: 'Arjun Rao', mail: 'arjun@contoso.com', jobTitle: 'Finance Analyst' },
    { displayName: 'Meera Iyer', mail: 'meera@contoso.com', jobTitle: 'Procurement Manager' },
    { displayName: 'Kabir Shah', mail: 'kabir@contoso.com', jobTitle: 'IT Administrator' },
    { displayName: 'Ananya Das', mail: 'ananya@contoso.com', jobTitle: 'HR Business Partner' }
  ];
  function top(url, fallback) { var m = /[?&](?:\$top|sysparm_limit)=(\d+)/.exec(url); return Math.max(0, Math.min(25, m ? +m[1] : fallback)); }

  var EP = [
    { sys: 'graph', method: 'GET', path: '/v1.0/me?$select=displayName,jobTitle,mail', title: 'Signed-in user profile',
      auth: 'Delegated · User.Read', pa: 'Office 365 Users › Get my profile (V2), or "Send an HTTP request" (Office 365 Groups) for raw Graph calls.',
      notes: ['Use $select so you only move the fields you need.', 'Delegated permission: the call runs as the signed-in user, so it can never see more than they can.'],
      res: function () { return { status: 200, body: { '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(displayName,jobTitle,mail)/$entity', displayName: 'Riya Sharma', jobTitle: 'Operations Lead', mail: 'riya@contoso.com' } }; } },
    { sys: 'graph', method: 'GET', path: '/v1.0/groups/{group-id}/members?$select=displayName,mail&$top=3', title: 'Members of a security group',
      auth: 'Application · GroupMember.Read.All', pa: 'Office 365 Groups › List group members.',
      notes: ['Page through results with @odata.nextLink instead of raising $top.', 'Prefer group membership over per-user permissions so joiners and leavers are handled in Entra ID.'],
      res: function (url) { var n = top(url, 3); return { status: 200, body: { value: users.slice(0, n).map(function (u) { return { displayName: u.displayName, mail: u.mail }; }), '@odata.nextLink': 'https://graph.microsoft.com/v1.0/groups/{group-id}/members?$skiptoken=X%27...%27' } }; } },
    { sys: 'graph', method: 'GET', path: '/v1.0/sites/{site-id}/lists/{list-id}/items?$expand=fields($select=Title,Status)&$top=2', title: 'List items through Graph',
      auth: 'Application · Sites.Selected', pa: 'HTTP with Microsoft Entra ID (preauthorized), or a custom connector.',
      notes: ['Sites.Selected grants an app access to specific sites only. Use it instead of Sites.Read.All.', 'Graph throttles per app and tenant: honour the Retry-After header on 429 responses.'],
      res: function (url) { var n = top(url, 2); return { status: 200, body: { value: [['Vendor onboarding: Litware', 'In progress'], ['Laptop refresh: Finance', 'Blocked'], ['Site access review Q4', 'In review']].slice(0, n).map(function (x, i) { return { id: String(41 + i), fields: { Title: x[0], Status: x[1] } }; }) } }; } },
    { sys: 'graph', method: 'POST', path: '/v1.0/me/sendMail', title: 'Send mail as the user',
      auth: 'Delegated · Mail.Send', body: { message: { subject: 'Your request was approved', body: { contentType: 'HTML', content: '<p>Approved by Riya.</p>' }, toRecipients: [{ emailAddress: { address: 'arjun@contoso.com' } }] }, saveToSentItems: true },
      pa: 'Office 365 Outlook › Send an email (V2).',
      notes: ['Use a shared mailbox for system notifications so they don\'t depend on one person\'s account.', 'A 202 means accepted, not delivered.'],
      res: function () { return { status: 202, body: null }; } },
    { sys: 'sp', method: 'GET', path: "/_api/web/lists/getbytitle('Requests')/items?$select=Title,Status,Owner/Title&$expand=Owner&$top=3", title: 'Read list items with a lookup',
      auth: 'Delegated · SharePoint permissions', headers: { Accept: 'application/json;odata=nometadata' }, pa: 'SharePoint › Send an HTTP request to SharePoint (no request digest needed).',
      notes: ['odata=nometadata keeps payloads small.', 'Filter on indexed columns to stay clear of the 5,000-item list view threshold.'],
      res: function (url) { var n = top(url, 3); return { status: 200, body: { value: [['Vendor onboarding: Litware', 'In progress', 'Riya Sharma'], ['Laptop refresh: Finance', 'Blocked', 'Arjun Rao'], ['Site access review Q4', 'In review', 'Kabir Shah'], ['Contract renewal: Fabrikam', 'Done', 'Meera Iyer']].slice(0, n).map(function (r) { return { Title: r[0], Status: r[1], Owner: { Title: r[2] } }; }) } }; } },
    { sys: 'sp', method: 'POST', path: "/_api/web/lists/getbytitle('Requests')/items", title: 'Create a list item',
      auth: 'Delegated · Contribute on the list', headers: { Accept: 'application/json;odata=nometadata', 'Content-Type': 'application/json;odata=nometadata' }, body: { Title: 'New laptop request', Status: 'Submitted' },
      pa: 'SharePoint › Create item, or Send an HTTP request to SharePoint for fields the action can\'t set.',
      notes: ['Use internal column names in the body, not display names.', 'For bulk writes, use $batch to cut round trips.'],
      res: function () { return { status: 201, body: { Id: 57, Title: 'New laptop request', Status: 'Submitted', Created: new Date().toISOString() } }; } },
    { sys: 'sp', method: 'POST', path: "/_api/web/lists/getbytitle('Requests')/items(42)/breakroleinheritance(copyRoleAssignments=false,clearSubscopes=true)", title: 'Item-level permissions',
      auth: 'Delegated · Manage Permissions', headers: { Accept: 'application/json;odata=nometadata' }, pa: 'SharePoint › Send an HTTP request to SharePoint, then roleassignments/addroleassignment.',
      notes: ['Unique permissions don\'t scale: keep them to the exceptions, and prefer separate libraries or sites for real boundaries.', 'Log every permission change for audit.'],
      res: function () { return { status: 200, body: { 'odata.null': true } }; } },
    { sys: 'dv', method: 'GET', path: '/api/data/v9.2/accounts?$select=name,revenue&$filter=statecode eq 0&$orderby=revenue desc&$top=3', title: 'Query a table',
      auth: 'Delegated or application user · Dataverse security role', headers: { Accept: 'application/json', 'OData-Version': '4.0', Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"' },
      pa: 'Microsoft Dataverse › List rows (select, filter and order use the same OData syntax).',
      notes: ['Security roles decide what comes back. Grant an application user only the roles it needs.', 'Watch the service protection limits: about 6,000 requests per user in a five-minute window.'],
      res: function (url) { var n = top(url, 3); return { status: 200, body: { '@odata.context': 'https://contoso.crm.dynamics.com/api/data/v9.2/$metadata#accounts(name,revenue)', value: [['Contoso Ltd', 4200000], ['Fabrikam Inc', 2900000], ['Northwind Traders', 1600000], ['Adventure Works', 980000]].slice(0, n).map(function (r) { return { accountid: guid(), name: r[0], revenue: r[1], 'revenue@OData.Community.Display.V1.FormattedValue': '$' + r[1].toLocaleString() }; }) } }; } },
    { sys: 'dv', method: 'POST', path: '/api/data/v9.2/$batch', title: 'Atomic changeset (all or nothing)',
      auth: 'Application user · security role', headers: { 'Content-Type': 'multipart/mixed; boundary=batch_AAA123' },
      raw: '--batch_AAA123\nContent-Type: multipart/mixed; boundary=changeset_BBB456\n\n--changeset_BBB456\nContent-Type: application/http\nContent-Transfer-Encoding: binary\nContent-ID: 1\n\nPOST /api/data/v9.2/accounts HTTP/1.1\nContent-Type: application/json\n\n{"name":"Litware Inc"}\n--changeset_BBB456\nContent-Type: application/http\nContent-Transfer-Encoding: binary\nContent-ID: 2\n\nPOST /api/data/v9.2/contacts HTTP/1.1\nContent-Type: application/json\n\n{"lastname":"Kumar","parentcustomerid_account@odata.bind":"$1"}\n--changeset_BBB456--\n--batch_AAA123--',
      pa: 'Microsoft Dataverse › Perform a changeset request: actions inside it commit together or not at all.',
      notes: ['A changeset is a transaction: if one operation fails, none are saved.', '$1 references the record created earlier in the same changeset.'],
      cite: 'Changeset Request',
      res: function () { return { status: 200, body: { changeset: [{ 'Content-ID': 1, status: '204 No Content', 'OData-EntityId': 'accounts(' + guid() + ')' }, { 'Content-ID': 2, status: '204 No Content', 'OData-EntityId': 'contacts(' + guid() + ')' }] } }; } },
    { sys: 'bc', method: 'GET', path: '/api/v2.0/companies({company-id})/vendors?$select=number,displayName,balance&$top=3', title: 'List vendors',
      auth: 'Application · Entra app registered in Business Central (API.ReadWrite.All)', pa: 'Dynamics 365 Business Central › Find records (V3), or List records.',
      notes: ['Register the Entra app in Business Central and give it only the permission sets it needs.', 'Use $filter on lastModifiedDateTime for incremental sync instead of full reads.'],
      cite: 'List records from Business Central',
      res: function (url) { var n = top(url, 3); return { status: 200, body: { value: [['V00010', 'Fabrikam Supplies', 12450.5], ['V00020', 'Litware Components', 0], ['V00030', 'Northwind Logistics', 3810], ['V00040', 'Proseware Office', 920.75]].slice(0, n).map(function (r) { return { id: guid(), number: r[0], displayName: r[1], balance: r[2] }; }) } }; } },
    { sys: 'bc', method: 'POST', path: '/api/v2.0/companies({company-id})/purchaseOrders', title: 'Create a purchase order',
      auth: 'Application · API.ReadWrite.All', body: { vendorNumber: 'V00010', orderDate: new Date().toISOString().slice(0, 10), currencyCode: 'USD' },
      pa: 'Dynamics 365 Business Central › Create record (V3).',
      notes: ['Create the header first, then purchaseOrderLines, so a failed line can be retried on its own.', 'Approvals stay in Business Central; the flow just starts and tracks them.'],
      res: function () { return { status: 201, body: { id: guid(), number: 'PO-10' + rand(4000, 4999), vendorNumber: 'V00010', vendorName: 'Fabrikam Supplies', status: 'Draft', totalAmountIncludingTax: 0 } }; } },
    { sys: 'bc', method: 'POST', path: '/api/v2.0/companies({company-id})/purchaseOrders({id})/Microsoft.NAV.receiveAndInvoice', title: 'Run a bound action',
      auth: 'Application · API.ReadWrite.All', pa: 'Dynamics 365 Business Central › Run action (V3).',
      notes: ['Bound actions run business logic inside Business Central, so you don\'t have to rebuild it in the flow.', 'A 204 response means the action completed.'],
      cite: 'Run action (V3)',
      res: function () { return { status: 204, body: null }; } },
    { sys: 'snow', method: 'GET', path: '/api/now/table/incident?sysparm_query=active=true^priority=1&sysparm_fields=number,short_description,state&sysparm_limit=3', title: 'Open P1 incidents',
      auth: 'OAuth 2.0 client credentials · ServiceNow integration user', headers: { Accept: 'application/json' }, pa: 'ServiceNow › List records, or an HTTP action with OAuth.',
      notes: ['Always set sysparm_fields and sysparm_limit, because the Table API returns every column by default.', 'Use a dedicated integration user with the narrowest roles.'],
      res: function (url) { var n = top(url, 3); return { status: 200, body: { result: [['INC0012031', 'Email delivery delayed for Finance', 'In Progress'], ['INC0012044', 'VPN gateway unreachable in Pune', 'New'], ['INC0012052', 'Payroll export failing', 'On Hold'], ['INC0012060', 'SharePoint site locked', 'New']].slice(0, n).map(function (r) { return { number: r[0], short_description: r[1], state: r[2] }; }) } }; } },
    { sys: 'snow', method: 'GET', path: '/api/now/table/sys_user_has_role?sysparm_query=user.user_name=riya.sharma&sysparm_fields=role.name,inherited&sysparm_limit=5', title: 'Roles for an access review',
      auth: 'OAuth 2.0 · read access to sys_user_has_role', headers: { Accept: 'application/json' }, pa: 'An HTTP action feeding an approval for each reviewer.',
      notes: ['This is the core of an automated user access review: pull roles, route them to owners, and record each decision.', 'Keep the evidence (who approved what, and when) for auditors.'],
      res: function (url) { var n = top(url, 5); return { status: 200, body: { result: [['itil', 'false'], ['approver_user', 'false'], ['report_user', 'true'], ['knowledge', 'true'], ['catalog', 'true']].slice(0, n).map(function (r) { return { 'role.name': r[0], inherited: r[1] }; }) } }; } }
  ];

  function initApis(panel) {
    var s = { i: 0, view: 'http', url: '', last: null, busy: false };
    var list = h('div', { class: 'api-list', role: 'listbox', 'aria-label': 'Endpoints' });
    var method = h('span', { class: 'api-m' });
    var urlIn = h('input', { class: 'api-url', spellcheck: 'false', 'aria-label': 'Request URL' });
    var send = h('button', { type: 'button', class: 'pg-btn go', onclick: run }, 'Send');
    var views = [['http', 'Request'], ['curl', 'cURL'], ['pa', 'Power Automate'], ['arch', 'Architect notes']];
    var viewBtns = views.map(function (v) { return h('button', { type: 'button', class: 'ca-tab', 'aria-pressed': String(v[0] === s.view), onclick: function () { s.view = v[0]; viewBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(views[i][0] === s.view)); }); renderReq(); } }, v[1]); });
    var reqPane = h('div', { class: 'api-req' });
    var resMeta = h('div', { class: 'api-res-h' });
    var resBody = h('pre', { class: 'ca-code api-res-b', tabindex: '0' });
    var copyBtn = h('button', { type: 'button', class: 'pg-btn small', onclick: function () { copyText(currentText(), copyBtn); } }, 'Copy');

    var groups = {};
    EP.forEach(function (e, i) {
      if (!groups[e.sys]) {
        groups[e.sys] = true;
        list.appendChild(h('span', { class: 'api-sys', style: { '--c': SYS[e.sys].c } }, h('i', { text: SYS[e.sys].tag }), SYS[e.sys].name));
      }
      list.appendChild(h('button', { type: 'button', role: 'option', class: 'api-ep', 'data-i': i, onclick: function () { select(i); } },
        h('span', { class: 'api-mm ' + e.method.toLowerCase(), text: e.method }), h('span', { text: e.title })));
    });

    panel.appendChild(panelHead('Explore the APIs', 'Most enterprise solutions succeed or fail at the integration layer. These are the systems I integrate with most often. Pick a call to see the request, a realistic response, how I\'d call it from Power Automate, and the auth and least-privilege decisions behind it. Try changing $top in the URL.'));
    panel.appendChild(h('div', { class: 'api' },
      list,
      h('div', { class: 'api-main' },
        h('div', { class: 'api-bar' }, method, urlIn, send),
        h('div', { class: 'ca-ide api-ide' }, h('div', { class: 'ca-tabs' }, viewBtns, h('span', { class: 'api-sp' }), copyBtn), reqPane),
        h('div', { class: 'api-res' }, resMeta, resBody))));

    urlIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    urlIn.addEventListener('input', function () { s.url = urlIn.value; if (s.view !== 'arch' && s.view !== 'pa') renderReq(); });

    function ep() { return EP[s.i]; }
    function fullUrl() { return s.url; }
    function headers() {
      var e = ep(), H = { Authorization: 'Bearer <access-token>' };
      Object.keys(e.headers || {}).forEach(function (k) { H[k] = e.headers[k]; });
      if ((e.body || e.raw) && !H['Content-Type']) H['Content-Type'] = 'application/json';
      return H;
    }
    function bodyText() { var e = ep(); return e.raw || (e.body ? JSON.stringify(e.body, null, 2) : ''); }
    function httpText() {
      var e = ep(), H = headers(), L = [e.method + ' ' + fullUrl()];
      Object.keys(H).forEach(function (k) { L.push(k + ': ' + H[k]); });
      if (bodyText()) L.push('', bodyText());
      return L.join('\n');
    }
    function curlText() {
      var e = ep(), H = headers(), L = ['curl -X ' + e.method + " '" + fullUrl() + "'"];
      Object.keys(H).forEach(function (k) { L.push("  -H '" + k + ': ' + H[k].replace(/'/g, "'\\''") + "'"); });
      if (bodyText()) L.push("  --data '" + bodyText().replace(/'/g, "'\\''") + "'");
      return L.join(' \\\n');
    }
    function currentText() { return s.view === 'curl' ? curlText() : s.view === 'http' ? httpText() : reqPane.textContent; }
    function renderReq() {
      var e = ep();
      reqPane.textContent = '';
      if (s.view === 'http') reqPane.appendChild(h('pre', { class: 'ca-code', html: highlight(httpText(), 'http') }));
      else if (s.view === 'curl') reqPane.appendChild(h('pre', { class: 'ca-code', html: highlight(curlText(), 'yaml') }));
      else if (s.view === 'pa') reqPane.appendChild(h('div', { class: 'api-notes' }, h('p', null, h('b', { text: 'In a flow: ' }), e.pa), h('p', { class: 'muted', text: 'I wrap calls like this in a Scope with "Configure run after" so failures are caught, logged and retried instead of silently stopping the flow.' }), articleLink('Scope Action & Configure Run After', 'My article on Scope and run-after ↗')));
      else reqPane.appendChild(h('div', { class: 'api-notes' }, h('p', null, h('b', { text: 'Auth: ' }), e.auth), h('ul', null, e.notes.map(function (n) { return h('li', { text: n }); })), e.cite ? articleLink(e.cite, 'My article on this ↗') : null));
    }
    function select(i) {
      s.i = i; var e = ep();
      s.url = SYS[e.sys].host + e.path; urlIn.value = s.url;
      method.textContent = e.method; method.className = 'api-m ' + e.method.toLowerCase();
      list.querySelectorAll('.api-ep').forEach(function (b) { var on = +b.getAttribute('data-i') === i; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      resMeta.textContent = ''; resMeta.appendChild(h('span', { class: 'muted', text: 'Press Send to call the endpoint.' }));
      resBody.textContent = '';
      renderReq();
    }
    async function run() {
      if (s.busy) return;
      s.busy = true; send.disabled = true;
      resMeta.textContent = ''; resMeta.appendChild(h('span', { class: 'muted' }, h('span', { class: 'spin', 'aria-hidden': 'true' }), ' Sending…'));
      var t0 = performance.now();
      await wait(rand(180, 650));
      var r = ep().res(fullUrl());
      var txt = r.body === null ? '' : JSON.stringify(r.body, null, 2);
      var ok = r.status < 300;
      resMeta.textContent = '';
      resMeta.appendChild(h('span', { class: 'api-st ' + (ok ? 'ok' : 'bad'), text: r.status + ' ' + ({ 200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content' }[r.status] || '') }));
      resMeta.appendChild(h('span', { class: 'muted', text: Math.round(performance.now() - t0) + ' ms · ' + (txt.length ? (txt.length / 1024).toFixed(1) + ' KB' : 'no body') }));
      resBody.innerHTML = txt ? highlight(txt, 'ts') : '<span class="tk-c">// No response body</span>';
      s.busy = false; send.disabled = false;
    }
    select(0);
  }

  PG.register({ id: 'apis', order: 80, group: 'Data', short: 'APIs', name: 'Integrations', color: '#4f52b2', icon: 'M4 12h4l3-7 3 14 3-7h3', init: initApis });
})(window.PG);
