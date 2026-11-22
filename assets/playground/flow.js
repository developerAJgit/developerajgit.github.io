/* Power Automate: build a flow, test it, inspect outputs. */
(function (PG) {
  'use strict';
  var h = PG.h, icon = PG.icon, panelHead = PG.panelHead, wait = PG.wait, rand = PG.rand, iso = PG.iso,
    guid = PG.guid, esc = PG.esc, fmtMs = PG.fmtMs, ARTICLES = PG.ARTICLES,
    pageCerts = PG.pageCerts, pageRoles = PG.pageRoles, pageProjects = PG.pageProjects;

  function initFlow(panel) {
    var subjectOf = function (t) {
      if (!t) return 'Request';
      return t.Title || t.subject || (t.body && t.body.orderId && 'Order ' + t.body.orderId) || 'Scheduled check';
    };
    var TRIGGERS = [
      { id: 'sp', name: 'When an item is created', conn: 'SharePoint', tag: 'SP', c: '#03787c', out: function () { return { ID: 42, Title: 'New laptop request', Requester: 'riya@contoso.com', Amount: 1450, Created: iso() }; } },
      { id: 'http', name: 'When an HTTP request is received', conn: 'Request', tag: 'RQ', c: '#4f52b2', out: function () { return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { orderId: 'SO-1009', customer: 'Fabrikam', total: 320 } }; } },
      { id: 'mail', name: 'When a new email arrives (V3)', conn: 'Office 365 Outlook', tag: 'OL', c: '#0f6cbd', out: function () { return { from: 'invoices@fabrikam.com', subject: 'Invoice INV-2201', hasAttachments: true, receivedDateTime: iso() }; } },
      { id: 'rec', name: 'Recurrence', conn: 'Schedule', tag: 'SC', c: '#5c2e91', out: function () { return { frequency: 'Day', interval: 1, triggerTime: iso() }; } },
      { id: 'btn', name: 'Manually trigger a flow', conn: 'Button', tag: 'BT', c: '#486991', out: function () { return { user: 'Portfolio visitor', timestamp: iso() }; } }
    ];
    var ACTIONS = [
      { id: 'compose', name: 'Compose', conn: 'Data Operation', tag: 'DO', c: '#6b2bd1', ms: [40, 140], out: function (x) { return { outputs: 'Request: ' + subjectOf(x.trigger) }; } },
      { id: 'parse', name: 'Parse JSON', conn: 'Data Operation', tag: 'DO', c: '#6b2bd1', ms: [40, 120], out: function (x) { return { body: x.trigger.body || x.trigger, schemaValid: true }; } },
      { id: 'cond', name: 'Condition', conn: 'Control', tag: 'IF', c: '#4a4a4a', ms: [20, 80], out: function (x) { var amt = x.trigger.Amount || (x.trigger.body && x.trigger.body.total) || 0; return { expression: '@greater(' + amt + ', 1000)', result: amt > 1000 }; } },
      { id: 'approval', name: 'Start and wait for an approval', conn: 'Approvals', tag: 'AP', c: '#0a6f5c', ms: [0, 0], out: function (x) { return { outcome: x.approval, responder: 'Portfolio visitor', comments: x.approval === 'Approve' ? 'Looks good' : 'Needs more detail', completionDate: iso() }; } },
      { id: 'teams', name: 'Post card in a chat or channel', conn: 'Microsoft Teams', tag: 'TM', c: '#4b53bc', ms: [500, 1100], out: function () { return { id: String(Date.now()), channel: 'Operations › General', status: 'Posted' }; } },
      { id: 'dv', name: 'Add a new row', conn: 'Microsoft Dataverse', tag: 'DV', c: '#1f7a3a', ms: [300, 800], out: function (x) { return { statusCode: 201, ag_requestid: guid(), ag_name: subjectOf(x.trigger), statecode: 0 }; } },
      { id: 'email', name: 'Send an email (V2)', conn: 'Office 365 Outlook', tag: 'OL', c: '#0f6cbd', ms: [400, 900], out: function (x) { return { to: x.trigger.Requester || x.trigger.from || 'team@contoso.com', subject: (x.approval ? x.approval + 'd: ' : '') + subjectOf(x.trigger), status: 'Sent' }; } },
      { id: 'bc', name: 'Create record (V3)', conn: 'Business Central', tag: 'BC', c: '#00838f', ms: [600, 1300], out: function () { return { number: 'PO-10' + rand(4000, 4999), vendorName: 'Fabrikam Supplies', status: 'Draft' }; } },
      { id: 'http', name: 'HTTP', conn: 'HTTP', tag: 'HT', c: '#3a5a8c', ms: [250, 700], out: function () { return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } }; } },
      { id: 'prompt', name: 'Run a prompt', conn: 'AI Builder', tag: 'AI', c: '#3d63dd', ms: [900, 1600], out: function (x) { return { text: 'Summary: "' + subjectOf(x.trigger) + '" is a routine request with no policy issues.', finishReason: 'stop' }; } },
      { id: 'loop', name: 'Apply to each', conn: 'Control', tag: 'FE', c: '#4a4a4a', ms: [200, 500], out: function () { return { iterations: 3, succeeded: 3 }; } },
      { id: 'delay', name: 'Delay', conn: 'Schedule', tag: 'SC', c: '#5c2e91', ms: [1000, 1000], out: function () { return { count: 1, unit: 'Second' }; } }
    ];
    var byId = function (list, id) { return list.filter(function (x) { return x.id === id; })[0]; };
    var MAX = 8;
    var s = { trigger: null, tStatus: null, tOut: null, tMs: 0, tOpen: false, steps: [], running: false, runs: [], approve: null, uid: 0, fail: false };
    var TEMPLATES = [
      { name: 'Invoice approval', trigger: 'mail', steps: ['prompt', 'approval', 'bc', 'email'] },
      { name: 'Vendor request', trigger: 'sp', steps: ['cond', 'approval', 'dv', 'teams'] },
      { name: 'Nightly sync', trigger: 'rec', steps: ['http', 'parse', 'loop', 'dv', 'teams'] }
    ];
    var EXTERNAL = { http: 1, bc: 1, teams: 1, email: 1, dv: 1 };
    var failBox = h('input', { type: 'checkbox' });
    failBox.addEventListener('change', function () { s.fail = failBox.checked; });
    var tplBtns = TEMPLATES.map(function (t) {
      return h('button', { type: 'button', class: 'pg-chip', onclick: function () {
        if (s.running) return;
        s.trigger = byId(TRIGGERS, t.trigger);
        s.steps = t.steps.map(function (id) { return { uid: ++s.uid, def: byId(ACTIONS, id), status: null, out: null, ms: 0, open: false }; });
        nameInput.value = t.name; resetRun(); render(); say('Loaded the "' + t.name + '" template. Press Test to run it.');
      } }, t.name);
    });

    var msg = h('p', { class: 'fl-msg', role: 'status' });
    var say = function (t) { msg.textContent = t; };

    // Palette
    var trigBtns = TRIGGERS.map(function (t) {
      return h('button', { type: 'button', class: 'fl-opt', 'aria-pressed': 'false', 'data-id': t.id, onclick: function () { if (s.running) return; s.trigger = t; s.tStatus = null; resetRun(); render(); say('Trigger set. Now add some actions.'); } },
        h('span', { class: 'fl-ico', style: { '--c': t.c }, text: t.tag }), h('span', null, t.name, h('small', { text: t.conn })));
    });
    var actBtns = ACTIONS.map(function (a) {
      return h('button', {
        type: 'button', class: 'fl-opt', draggable: 'true', title: 'Click to add, or drag onto the canvas',
        onclick: function () { addStep(a, s.steps.length); },
        ondragstart: function (e) { e.dataTransfer.setData('text/plain', 'add:' + a.id); e.dataTransfer.effectAllowed = 'copyMove'; }
      }, h('span', { class: 'fl-ico', style: { '--c': a.c }, text: a.tag }), h('span', null, a.name, h('small', { text: a.conn })), h('span', { class: 'fl-plus', 'aria-hidden': 'true', text: '+' }));
    });

    var nameInput = h('input', { class: 'fl-name', value: 'My demo flow', 'aria-label': 'Flow name', maxlength: '60' });
    var runBtn = h('button', { type: 'button', class: 'pg-btn go', onclick: run }, '▶ Test');
    var clearBtn = h('button', { type: 'button', class: 'pg-btn', onclick: function () { if (s.running) return; s.trigger = null; s.steps = []; resetRun(); render(); say('Canvas cleared.'); } }, 'Clear');
    var list = h('ol', { class: 'fl-list', 'aria-label': 'Flow steps' });
    var runsList = h('ul', { class: 'fl-runs' });
    var ph = h('li', { class: 'fl-ph', 'aria-hidden': 'true', text: 'Drop here' });

    panel.appendChild(panelHead('Build a flow', 'Automation is most of what I do, so here is a designer you can try. Start from a template or pick a trigger and add actions by clicking or dragging them. Then press Test and watch each step run. Click a step to see its outputs, or simulate a failure to see why error handling matters.'));
    panel.appendChild(h('div', { class: 'fl' },
      h('div', { class: 'fl-pal' },
        h('div', null, h('h4', { text: 'Quick start' }), h('div', { class: 'pg-chips' }, tplBtns)),
        h('div', null, h('h4', { text: '1 · Pick a trigger' }), trigBtns),
        h('div', null, h('h4', { text: '2 · Add actions' }), h('div', { class: 'fl-acts' }, actBtns))),
      h('div', { class: 'fl-canvas' },
        h('div', { class: 'fl-bar' }, nameInput,
          h('label', { class: 'fl-fail', title: 'Make the first call to an external system fail' }, failBox, h('span', { text: 'Simulate a failure' })),
          runBtn, clearBtn),
        list, msg,
        h('div', { class: 'fl-hist' }, h('h4', { text: 'Run history' }), runsList))));

    function resetRun() { s.tStatus = null; s.tOut = null; s.steps.forEach(function (x) { x.status = null; x.out = null; }); }
    function addStep(def, index) {
      if (s.running) return;
      if (!s.trigger) { say('Pick a trigger first. Every flow starts with one.'); return; }
      if (s.steps.length >= MAX) { say('That is plenty for a demo: up to ' + MAX + ' actions.'); return; }
      resetRun();
      s.steps.splice(index, 0, { uid: ++s.uid, def: def, status: null, out: null, ms: 0, open: false });
      render();
      say('Added "' + def.name + '".');
    }

    function statusEl(st, ms) {
      if (st === 'running') return h('span', { class: 'fl-st run' }, h('span', { class: 'spin', 'aria-hidden': 'true' }), 'Running');
      if (st === 'waiting') return h('span', { class: 'fl-st run' }, h('span', { class: 'spin', 'aria-hidden': 'true' }), 'Waiting');
      if (st === 'ok') return h('span', { class: 'fl-st ok' }, h('span', { class: 'tick', 'aria-hidden': 'true' }), fmtMs(ms));
      if (st === 'skip') return h('span', { class: 'fl-st skip', text: 'Skipped' });
      if (st === 'fail') return h('span', { class: 'fl-st fail' }, h('span', { class: 'cross', 'aria-hidden': 'true' }), 'Failed');
      return null;
    }

    function card(opts) {
      var li = h('li', { class: 'fl-card' + (opts.status ? ' ' + opts.status : '') + (opts.trigger ? ' trig' : ' step'), style: { '--c': opts.def.c } });
      var head = h('div', { class: 'fl-row', role: 'button', tabindex: '0', 'aria-expanded': String(!!opts.open),
        onclick: opts.toggle, onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.toggle(); } } },
        h('span', { class: 'fl-ico', text: opts.def.tag }),
        h('span', { class: 'fl-meta' }, h('b', { text: opts.def.name }), h('small', { text: (opts.trigger ? 'Trigger · ' : '') + opts.def.conn })),
        statusEl(opts.status, opts.ms));
      li.appendChild(head);
      if (!opts.trigger && !s.running) {
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', 'move:' + opts.index); e.dataTransfer.effectAllowed = 'move'; li.classList.add('dragging'); });
        li.addEventListener('dragend', function () { li.classList.remove('dragging'); ph.remove(); });
        head.appendChild(h('span', { class: 'fl-tools' },
          h('button', { type: 'button', class: 'fl-tool', 'aria-label': 'Move up', title: 'Move up', disabled: opts.index === 0, onclick: function (e) { e.stopPropagation(); move(opts.index, opts.index - 1); } }, '↑'),
          h('button', { type: 'button', class: 'fl-tool', 'aria-label': 'Remove ' + opts.def.name, title: 'Remove', onclick: function (e) { e.stopPropagation(); resetRun(); s.steps.splice(opts.index, 1); render(); } }, '×')));
      }
      if (opts.approval) li.appendChild(opts.approval);
      if (opts.open) {
        var body = opts.out
          ? h('div', { class: 'fl-detail' }, h('span', { class: 'fl-dl', text: 'Outputs' }), h('pre', { text: JSON.stringify(opts.out, null, 2) }))
          : h('div', { class: 'fl-detail' }, h('span', { class: 'fl-dl', text: 'Not run yet' }), h('p', { text: 'Press Test to run the flow, then open this step to see its outputs.' }));
        li.appendChild(body);
      }
      return li;
    }

    function move(from, to) {
      if (to < 0 || to >= s.steps.length) return;
      resetRun();
      var x = s.steps.splice(from, 1)[0];
      s.steps.splice(to, 0, x);
      render();
    }

    function render() {
      trigBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(!!s.trigger && b.getAttribute('data-id') === s.trigger.id)); });
      list.textContent = '';
      if (!s.trigger) {
        list.appendChild(h('li', { class: 'fl-empty' }, h('b', { text: 'Start with a trigger' }), h('span', { text: 'Every flow begins with an event: a new item, an email, a schedule or a button press.' })));
      } else {
        list.appendChild(card({ trigger: true, def: s.trigger, status: s.tStatus, ms: s.tMs, out: s.tOut, open: s.tOpen, toggle: function () { s.tOpen = !s.tOpen; render(); } }));
        s.steps.forEach(function (st, i) {
          var appr = null;
          if (st.status === 'waiting' && s.approve) {
            appr = h('div', { class: 'fl-approval' },
              h('p', null, h('b', { text: 'Approval requested: ' }), subjectOf(s.tOut)),
              h('div', { class: 'fl-approval-btns' },
                h('button', { type: 'button', class: 'pg-btn go', onclick: function () { s.approve('Approve'); } }, 'Approve'),
                h('button', { type: 'button', class: 'pg-btn', onclick: function () { s.approve('Reject'); } }, 'Reject')));
          }
          list.appendChild(card({ def: st.def, index: i, status: st.status, ms: st.ms, out: st.out, open: st.open, approval: appr, toggle: function () { st.open = !st.open; render(); } }));
        });
        if (!s.steps.length) list.appendChild(h('li', { class: 'fl-empty small' }, h('span', { text: 'Click or drag an action from the left to add a step.' })));
      }
      runBtn.disabled = s.running;
      clearBtn.disabled = s.running;
      runsList.textContent = '';
      if (!s.runs.length) runsList.appendChild(h('li', { class: 'muted', text: 'No runs yet.' }));
      s.runs.slice(0, 5).forEach(function (r) {
        runsList.appendChild(h('li', null, r.ok ? h('span', { class: 'tick', 'aria-hidden': 'true' }) : h('span', { class: 'cross', 'aria-hidden': 'true' }), h('b', { class: r.ok ? '' : 'bad', text: r.ok ? 'Succeeded' : 'Failed' }), h('span', { text: r.name + ' · ' + r.count + ' steps · ' + fmtMs(r.ms) }), h('time', { text: r.at })));
      });
    }

    // Drag and drop onto the canvas
    function dropIndex(y) {
      var cards = Array.prototype.filter.call(list.querySelectorAll('.fl-card.step'), function (c) { return !c.classList.contains('dragging'); });
      for (var i = 0; i < cards.length; i++) { var r = cards[i].getBoundingClientRect(); if (y < r.top + r.height / 2) return cards[i]; }
      return null;
    }
    var canvas = list.parentElement;
    canvas.addEventListener('dragover', function (e) {
      if (s.running || !s.trigger) return;
      e.preventDefault();
      var before = dropIndex(e.clientY);
      if (before) { if (ph.nextSibling !== before) list.insertBefore(ph, before); }
      else { var empty = list.querySelector('.fl-empty'); if (empty) list.insertBefore(ph, empty); else if (list.lastChild !== ph) list.appendChild(ph); }
    });
    canvas.addEventListener('dragleave', function (e) { if (!canvas.contains(e.relatedTarget)) ph.remove(); });
    canvas.addEventListener('drop', function (e) {
      if (!s.trigger) { say('Pick a trigger first. Every flow starts with one.'); return; }
      e.preventDefault();
      var data = e.dataTransfer.getData('text/plain') || '';
      var idx = Array.prototype.indexOf.call(list.querySelectorAll('.fl-card.step:not(.dragging), .fl-ph'), ph);
      ph.remove();
      if (idx < 0) idx = s.steps.length;
      if (data.indexOf('add:') === 0) addStep(byId(ACTIONS, data.slice(4)), idx);
      else if (data.indexOf('move:') === 0) {
        var from = +data.slice(5);
        resetRun();
        var x = s.steps.splice(from, 1)[0];
        s.steps.splice(idx, 0, x);
        render();
      }
    });

    async function run() {
      if (s.running) return;
      if (!s.trigger) { say('Pick a trigger first. Every flow starts with one.'); return; }
      if (!s.steps.length) { say('Add at least one action, then press Test.'); return; }
      s.running = true; resetRun();
      var started = performance.now();
      var ctx = {};
      say('Running…');
      s.tStatus = 'running'; render();
      var t0 = performance.now();
      await wait(rand(350, 700));
      ctx.trigger = s.tOut = s.trigger.out();
      s.tMs = Math.round(performance.now() - t0); s.tStatus = 'ok'; render();
      var failAt = -1, failed = false;
      if (s.fail) for (var f = 0; f < s.steps.length; f++) if (EXTERNAL[s.steps[f].def.id]) { failAt = f; break; }
      for (var i = 0; i < s.steps.length; i++) {
        var st = s.steps[i], t1 = performance.now();
        if (failed) { st.status = 'skip'; continue; }
        if (i === failAt) {
          st.status = 'running'; render();
          await wait(rand(600, 1100));
          st.out = st.def.id === 'teams' || st.def.id === 'email'
            ? { status: 429, error: { code: 'TooManyRequests', message: 'Rate limit is exceeded. Try again in 30 seconds.' }, retryAfter: 30 }
            : { status: 503, error: { code: 'ServiceUnavailable', message: 'The remote service is temporarily unavailable.' } };
          st.ms = Math.round(performance.now() - t1); st.status = 'fail'; st.open = true; failed = true; render();
          continue;
        }
        if (st.def.id === 'approval') {
          st.status = 'waiting';
          ctx.approval = await new Promise(function (res) { s.approve = res; render(); say('Waiting for you: approve or reject the request.'); });
          s.approve = null;
        } else {
          st.status = 'running'; render();
          await wait(rand(st.def.ms[0], st.def.ms[1]));
        }
        st.out = st.def.out(ctx);
        st.ms = Math.round(performance.now() - t1);
        st.status = 'ok'; render();
      }
      var total = Math.round(performance.now() - started);
      s.runs.unshift({ ok: !failed, name: nameInput.value.trim() || 'Untitled flow', count: s.steps.length + 1, ms: total, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
      s.running = false;
      render();
      if (failed) {
        msg.textContent = '';
        msg.appendChild(document.createTextNode('The run failed and the remaining steps were skipped. In production I wrap calls like this in a Scope with "Configure run after" and a retry policy, so failures are caught, logged and handled. '));
        var link = PG.articleLink('Scope Action & Configure Run After', 'See how ↗');
        if (link) msg.appendChild(link);
      } else say('Your flow ran successfully in ' + fmtMs(total) + '. Click any step to inspect its outputs.');
    }

    render();
  }

  PG.register({ id: 'flow', order: 20, group: 'Build', short: 'Automate', name: 'Power Automate', color: '#2563eb', icon: 'M4 4h6v6H4zM14 14h6v6h-6zM7 10v3a3 3 0 0 0 3 3h4M17 14V9', init: initFlow });
})(window.PG);
