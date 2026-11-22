/* Interactive playground: Power Automate, Canvas Apps, Code Apps, Copilot Studio, Dataverse.
   Everything is simulated in the browser; nothing calls a real tenant. */
(function () {
  'use strict';
  var host = document.getElementById('pg');
  if (!host) return;

  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, RM ? Math.min(ms, 80) : ms); }); };
  var rand = function (a, b) { return Math.round(a + Math.random() * (b - a)); };
  var iso = function () { return new Date().toISOString().replace(/\.\d+Z$/, 'Z'); };
  var guid = function () { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmtMs = function (ms) { return ms < 1000 ? ms + ' ms' : (ms / 1000).toFixed(1) + ' s'; };

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
  function append(n, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(n, x); }); return; }
    n.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  function icon(path, size) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size || 18); s.setAttribute('height', size || 18); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<path d="' + path + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    return s;
  }
  function panelHead(title, text) {
    return h('div', { class: 'pg-head' },
      h('div', null, h('h3', { text: title }), h('p', { text: text })),
      h('span', { class: 'pg-badge', text: 'Simulated · runs in your browser' }));
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

  /* =========================================================
     1. POWER AUTOMATE
     ========================================================= */
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
    var s = { trigger: null, tStatus: null, tOut: null, tMs: 0, tOpen: false, steps: [], running: false, runs: [], approve: null, uid: 0 };

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

    panel.appendChild(panelHead('Build a flow', 'Automation is most of what I do, so here is a designer you can try. Pick a trigger, add actions by clicking or dragging them, then press Test and watch each step run. Click a step to see its outputs.'));
    panel.appendChild(h('div', { class: 'fl' },
      h('div', { class: 'fl-pal' },
        h('div', null, h('h4', { text: '1 · Pick a trigger' }), trigBtns),
        h('div', null, h('h4', { text: '2 · Add actions' }), h('div', { class: 'fl-acts' }, actBtns))),
      h('div', { class: 'fl-canvas' },
        h('div', { class: 'fl-bar' }, nameInput, runBtn, clearBtn),
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
        runsList.appendChild(h('li', null, h('span', { class: 'tick', 'aria-hidden': 'true' }), h('b', { text: 'Succeeded' }), h('span', { text: r.name + ' · ' + r.count + ' steps · ' + fmtMs(r.ms) }), h('time', { text: r.at })));
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
      for (var i = 0; i < s.steps.length; i++) {
        var st = s.steps[i], t1 = performance.now();
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
      s.runs.unshift({ name: nameInput.value.trim() || 'Untitled flow', count: s.steps.length + 1, ms: total, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
      s.running = false;
      render();
      say('Your flow ran successfully in ' + fmtMs(total) + '. Click any step to inspect its outputs.');
    }

    render();
  }

  /* =========================================================
     2. CANVAS APPS (live Power Fx)
     ========================================================= */
  function initCanvas(panel) {
    var Fx = window.PowerFx;
    var TYPES = {
      Label: { props: { Text: '"Text"', Size: '14', Color: 'Color.Black', Visible: 'true' } },
      TextInput: { props: { Default: '""', HintText: '"Type here"', Visible: 'true' } },
      Button: { props: { Text: '"Button"', OnSelect: 'Notify("Hello from Power Fx!", NotificationType.Success)', Fill: 'RGBA(116, 39, 116, 1)', Visible: 'true' } },
      Dropdown: { props: { Items: '["Option 1", "Option 2", "Option 3"]', Visible: 'true' } },
      Toggle: { props: { Default: 'false', Visible: 'true' } },
      Slider: { props: { Min: '0', Max: '100', Default: '50', Visible: 'true' } },
      Gallery: { props: { Items: 'FirstN(Articles, 3)', Title: 'ThisItem.Title', Subtitle: 'ThisItem.Topic & " · " & ThisItem.Date', Visible: 'true' } }
    };
    var BEHAVIOR = { OnSelect: true };
    var controls = [], vars = {}, selected = null, selProp = null;

    function make(type, name, props) {
      var p = {}; Object.keys(TYPES[type].props).forEach(function (k) { p[k] = TYPES[type].props[k]; });
      Object.keys(props || {}).forEach(function (k) { p[k] = props[k]; });
      return { type: type, name: name, props: p, state: {}, el: null, errors: {} };
    }
    function nextName(type) { var n = 1; while (controls.some(function (c) { return c.name === type + n; })) n++; return type + n; }
    function find(name) { for (var i = 0; i < controls.length; i++) if (controls[i].name === name) return controls[i]; return null; }

    function preset() {
      controls = [
        make('Label', 'Label1', { Text: '"Article explorer"', Size: '20' }),
        make('TextInput', 'TextInput1', { HintText: '"Your name"' }),
        make('Label', 'Label2', { Text: 'If(IsBlank(TextInput1.Text), "Type your name above 👆", "Hi " & Proper(TextInput1.Text) & ", pick a topic")', Color: 'Color.Gray' }),
        make('Dropdown', 'Dropdown1', { Items: '["Power Apps", "Power Automate", "Dataverse & SQL", "AI & Copilot"]' }),
        make('Label', 'Label3', { Text: 'CountRows(Filter(Articles, Topic = Dropdown1.Selected.Value)) & " articles on " & Dropdown1.Selected.Value', Size: '12', Color: 'Color.Purple' }),
        make('Gallery', 'Gallery1', { Items: 'FirstN(Sort(Filter(Articles, Topic = Dropdown1.Selected.Value), Date, SortOrder.Descending), 4)' }),
        make('Button', 'Button1', { Text: '"Pick this article"', OnSelect: 'Set(varPicks, varPicks + 1); Notify("You picked: " & Gallery1.Selected.Title, NotificationType.Success)' }),
        make('Label', 'Label4', { Text: 'If(varPicks > 0, "Picked " & varPicks & " time(s)", "")', Size: '12', Color: 'Color.Gray' })
      ];
      vars = {};
      rebuild();
      select(find('Label2'), 'Text');
    }

    function knownVars() {
      var names = {};
      controls.forEach(function (c) { Object.keys(c.props).forEach(function (p) { Fx.varsSetIn(c.props[p]).forEach(function (v) { names[v] = true; }); }); });
      return names;
    }

    // Values exposed to formulas
    var depth = 0;
    function proxy(c) {
      return {
        __fxControl: true,
        get: function (prop) {
          if (depth > 40) throw Object.assign(new Error('Circular reference between controls.'), { fx: true });
          depth++;
          try {
            switch (c.type + '.' + prop) {
              case 'TextInput.Text': return c.state.text !== undefined ? c.state.text : Fx.toStr(evalProp(c, 'Default'));
              case 'Toggle.Value': return c.state.value !== undefined ? c.state.value : Fx.toBool(evalProp(c, 'Default'));
              case 'Slider.Value': return c.state.value !== undefined ? c.state.value : Fx.toNum(evalProp(c, 'Default'));
              case 'Dropdown.Selected': { var items = Fx.toTable(evalProp(c, 'Items')); return items[c.state.index || 0] || items[0] || null; }
              case 'Dropdown.SelectedText': { var it = Fx.toTable(evalProp(c, 'Items')); var r = it[c.state.index || 0]; return r ? display(r) : ''; }
              case 'Gallery.Selected': { var g = Fx.toTable(evalProp(c, 'Items')); return g[Math.min(c.state.index || 0, g.length - 1)] || null; }
              case 'Gallery.AllItems': return Fx.toTable(evalProp(c, 'Items'));
            }
            if (c.props[prop] !== undefined && !BEHAVIOR[prop]) return evalProp(c, prop);
            throw Object.assign(new Error('\'' + prop + '\' isn\'t a property of ' + c.name + '.'), { fx: true });
          } finally { depth--; }
        }
      };
    }
    var known = {};
    function ctx(extra) {
      var base = {
        resolve: function (n) {
          var c = find(n);
          if (c) return proxy(c);
          if (n === 'Articles') return ARTICLES;
          if (Object.prototype.hasOwnProperty.call(vars, n)) return vars[n];
          if (known[n]) return null;
          return undefined;
        }
      };
      Object.keys(extra || {}).forEach(function (k) { base[k] = extra[k]; });
      return base;
    }
    function evalProp(c, prop, scope) { return Fx.evaluate(c.props[prop], ctx(scope ? { scope: scope } : null)); }
    function display(r) {
      if (r === null || typeof r !== 'object') return Fx.toStr(r);
      if ('Value' in r) return Fx.toStr(r.Value);
      if ('Title' in r) return Fx.toStr(r.Title);
      var k = Object.keys(r)[0]; return k ? Fx.toStr(r[k]) : '';
    }
    function safe(c, prop, fn, fallback) {
      try { var v = fn(); delete c.errors[prop]; return v; }
      catch (e) { c.errors[prop] = e.fx ? e.message : 'Formula error: ' + e.message; return fallback; }
    }

    // DOM
    var propSel = h('select', { class: 'cv-prop', 'aria-label': 'Property' });
    var formula = h('input', { class: 'cv-formula', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Formula' });
    var errLine = h('p', { class: 'cv-err', role: 'status' });
    var screen = h('div', { class: 'cv-screen' });
    var toast = h('div', { class: 'cv-toast', role: 'status' });
    var tree = h('ul', { class: 'cv-tree' });
    var insert = h('div', { class: 'cv-insert' }, Object.keys(TYPES).map(function (t) {
      return h('button', { type: 'button', class: 'cv-ins', onclick: function () {
        var name = nextName(t);
        var extra = {};
        if (t === 'Label') extra.Text = '"' + name + '"';
        if (t === 'Button') extra.Text = '"' + name + '"';
        controls.push(make(t, name, extra));
        rebuild(); select(find(name));
        screen.scrollTop = screen.scrollHeight;
      } }, h('span', { 'aria-hidden': 'true', text: '+' }), t === 'TextInput' ? 'Text input' : t);
    }));
    var TRY = [
      ['Label2', 'Text', '"Hello, " & Upper(TextInput1.Text) & "!"'],
      ['Label2', 'Color', 'If(Len(TextInput1.Text) > 8, Color.Red, Color.Green)'],
      ['Label3', 'Text', 'Text(Now(), "dddd, mmmm dd · hh:mm")'],
      ['Gallery1', 'Items', 'Search(Articles, TextInput1.Text, "Title")'],
      ['Label1', 'Text', '"Total articles: " & CountRows(Articles)'],
      ['Button1', 'OnSelect', 'Notify("Articles in 2026: " & CountRows(Filter(Articles, Year = 2026)), NotificationType.Information)']
    ];
    var tries = h('div', { class: 'cv-tries' }, TRY.map(function (t) {
      return h('button', { type: 'button', class: 'cv-try', title: 'Apply to ' + t[0] + '.' + t[1], onclick: function () {
        var c = find(t[0]);
        if (!c) { say(t[0] + ' was deleted. Press Reset to bring it back.'); return; }
        c.props[t[1]] = t[2];
        select(c, t[1]); updateAll();
      } }, h('span', { class: 'cv-try-t', text: t[0] + '.' + t[1] }), h('code', { text: t[2] }));
    }));

    panel.appendChild(panelHead('Build a canvas app', 'This is a working Power Fx engine. Select a control, change its formula in the bar, and the app updates as you type. Insert controls, reference them from other formulas, or press a button to run its OnSelect.'));
    panel.appendChild(h('div', { class: 'cv' },
      h('div', { class: 'cv-bar' }, propSel, h('span', { class: 'cv-fx', 'aria-hidden': 'true', text: 'fx' }), formula),
      errLine,
      h('div', { class: 'cv-main' },
        h('aside', { class: 'cv-side' },
          h('h4', { text: 'Insert' }), insert,
          h('h4', { text: 'Tree view' }), tree,
          h('button', { type: 'button', class: 'pg-btn small', onclick: preset }, 'Reset app')),
        h('div', { class: 'cv-stage' }, h('div', { class: 'cv-phone' }, h('div', { class: 'cv-notch', 'aria-hidden': 'true' }), screen, toast)),
        h('aside', { class: 'cv-side' }, h('h4', { text: 'Try a formula' }), tries,
          h('p', { class: 'cv-note' }, 'Supported: If, Switch, Filter, Sort, Search, LookUp, CountRows, FirstN, Concat, Text, Upper, Proper, Len, Set, Notify, RGBA, Color.*, and more. Data source: ', h('code', { text: 'Articles' }), ' (Title, Topic, Date, Year).')))));

    function say(t) { errLine.textContent = t; errLine.classList.remove('bad'); }

    function rebuild() {
      screen.textContent = ''; tree.textContent = '';
      controls.forEach(function (c) {
        c.el = buildControl(c);
        screen.appendChild(c.el.wrap);
        tree.appendChild(h('li', null,
          h('button', { type: 'button', class: 'cv-node', 'data-name': c.name, onclick: function () { select(c); } }, c.name),
          h('button', { type: 'button', class: 'cv-del', 'aria-label': 'Delete ' + c.name, title: 'Delete', onclick: function () {
            controls.splice(controls.indexOf(c), 1);
            if (selected === c) selected = null;
            rebuild(); if (!selected) select(controls[0] || null);
          } }, '×')));
      });
      if (!controls.length) screen.appendChild(h('p', { class: 'cv-blank', text: 'Empty screen. Insert a control from the left.' }));
      updateAll();
    }

    function buildControl(c) {
      var wrap = h('div', { class: 'cv-ctl', 'data-name': c.name });
      wrap.addEventListener('mousedown', function () { if (selected !== c) select(c); });
      wrap.addEventListener('focusin', function () { if (selected !== c) select(c); });
      wrap.appendChild(h('span', { class: 'cv-tag', text: c.name }));
      var inner;
      switch (c.type) {
        case 'Label': inner = h('div', { class: 'cv-label' }); break;
        case 'TextInput':
          inner = h('input', { class: 'cv-input', type: 'text', 'aria-label': c.name });
          inner.addEventListener('input', function () { c.state.text = inner.value; updateAll(); });
          break;
        case 'Button':
          inner = h('button', { type: 'button', class: 'cv-button' });
          inner.addEventListener('click', function () { runBehavior(c, 'OnSelect'); });
          break;
        case 'Dropdown':
          inner = h('select', { class: 'cv-select', 'aria-label': c.name });
          inner.addEventListener('change', function () { c.state.index = inner.selectedIndex; updateAll(); });
          break;
        case 'Toggle':
          inner = h('label', { class: 'cv-toggle' }, h('input', { type: 'checkbox', 'aria-label': c.name }), h('span', { class: 'cv-knob' }), h('span', { class: 'cv-tt' }));
          inner.querySelector('input').addEventListener('change', function (e) { c.state.value = e.target.checked; updateAll(); });
          break;
        case 'Slider':
          inner = h('div', { class: 'cv-slider' }, h('input', { type: 'range', 'aria-label': c.name }), h('output'));
          inner.querySelector('input').addEventListener('input', function (e) { c.state.value = +e.target.value; updateAll(); });
          break;
        case 'Gallery': inner = h('ul', { class: 'cv-gallery', role: 'listbox', 'aria-label': c.name }); break;
      }
      wrap.appendChild(inner);
      return { wrap: wrap, inner: inner, sig: null };
    }

    function updateAll() {
      known = knownVars();
      depth = 0;
      controls.forEach(update);
      chrome();
    }
    function chrome() {
      tree.querySelectorAll('.cv-node').forEach(function (b) {
        var c = find(b.getAttribute('data-name'));
        b.classList.toggle('on', c === selected);
        b.classList.toggle('bad', !!c && Object.keys(c.errors).length > 0);
      });
      showError();
    }

    function update(c) {
      var e = c.el, w = e.wrap, n = e.inner;
      var vis = safe(c, 'Visible', function () { return Fx.toBool(evalProp(c, 'Visible')); }, true);
      w.classList.toggle('hidden', !vis);
      switch (c.type) {
        case 'Label': {
          n.textContent = safe(c, 'Text', function () { return Fx.toStr(evalProp(c, 'Text')); }, '');
          n.style.fontSize = safe(c, 'Size', function () { return Math.max(8, Math.min(40, Fx.toNum(evalProp(c, 'Size')))); }, 14) + 'px';
          n.style.color = safe(c, 'Color', function () { return Fx.toStr(evalProp(c, 'Color')); }, '');
          break;
        }
        case 'TextInput': {
          n.placeholder = safe(c, 'HintText', function () { return Fx.toStr(evalProp(c, 'HintText')); }, '');
          var def = safe(c, 'Default', function () { return Fx.toStr(evalProp(c, 'Default')); }, '');
          if (c.state.text === undefined && document.activeElement !== n) n.value = def;
          break;
        }
        case 'Button': {
          n.textContent = safe(c, 'Text', function () { return Fx.toStr(evalProp(c, 'Text')); }, '');
          n.style.background = safe(c, 'Fill', function () { return Fx.toStr(evalProp(c, 'Fill')); }, '');
          safe(c, 'OnSelect', function () { Fx.parse(c.props.OnSelect); });
          break;
        }
        case 'Dropdown': {
          var items = safe(c, 'Items', function () { return Fx.toTable(evalProp(c, 'Items')); }, []);
          var labels = items.map(display), sig = JSON.stringify(labels);
          if (sig !== e.sig) {
            e.sig = sig; n.textContent = '';
            labels.forEach(function (l) { n.appendChild(h('option', { text: l })); });
            if ((c.state.index || 0) >= labels.length) c.state.index = 0;
          }
          n.selectedIndex = c.state.index || 0;
          break;
        }
        case 'Toggle': {
          var on = c.state.value !== undefined ? c.state.value : safe(c, 'Default', function () { return Fx.toBool(evalProp(c, 'Default')); }, false);
          n.querySelector('input').checked = on;
          n.querySelector('.cv-tt').textContent = on ? 'On' : 'Off';
          break;
        }
        case 'Slider': {
          var r = n.querySelector('input');
          r.min = safe(c, 'Min', function () { return Fx.toNum(evalProp(c, 'Min')); }, 0);
          r.max = safe(c, 'Max', function () { return Fx.toNum(evalProp(c, 'Max')); }, 100);
          var v = c.state.value !== undefined ? c.state.value : safe(c, 'Default', function () { return Fx.toNum(evalProp(c, 'Default')); }, 50);
          r.value = v; n.querySelector('output').textContent = r.value;
          break;
        }
        case 'Gallery': {
          var rows = safe(c, 'Items', function () { return Fx.toTable(evalProp(c, 'Items')); }, []);
          var idx = Math.min(c.state.index || 0, Math.max(0, rows.length - 1));
          n.textContent = '';
          if (!rows.length) n.appendChild(h('li', { class: 'cv-gempty', text: 'No items' }));
          rows.slice(0, 30).forEach(function (row, i) {
            var t = safe(c, 'Title', function () { return Fx.toStr(evalProp(c, 'Title', row)); }, '');
            var st = safe(c, 'Subtitle', function () { return Fx.toStr(evalProp(c, 'Subtitle', row)); }, '');
            n.appendChild(h('li', { role: 'option', tabindex: '0', 'aria-selected': String(i === idx), class: i === idx ? 'on' : '',
              onclick: function () { c.state.index = i; updateAll(); },
              onkeydown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); c.state.index = i; updateAll(); } } },
              h('b', { text: t }), st ? h('small', { text: st }) : null, h('span', { class: 'cv-chev', 'aria-hidden': 'true', text: '›' })));
          });
          break;
        }
      }
      w.classList.toggle('err', Object.keys(c.errors).length > 0);
      w.title = Object.keys(c.errors).map(function (k) { return k + ': ' + c.errors[k]; }).join('\n');
    }

    function runBehavior(c, prop) {
      known = knownVars();
      try {
        Fx.evaluate(c.props[prop], ctx({
          behavior: true,
          setVar: function (n, v) { vars[n] = v; },
          notify: function (m, type) { showToast(m, type); }
        }));
        delete c.errors[prop];
      } catch (e) { c.errors[prop] = e.message; showToast(e.message, 'error'); }
      updateAll();
    }

    var toastTimer;
    function showToast(m, type) {
      toast.textContent = m;
      toast.className = 'cv-toast show ' + (type || 'information');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
    }

    function select(c, prop) {
      selected = c;
      controls.forEach(function (x) { x.el.wrap.classList.toggle('sel', x === c); });
      propSel.textContent = '';
      if (!c) { formula.value = ''; formula.disabled = true; chrome(); return; }
      formula.disabled = false;
      var props = Object.keys(c.props);
      props.forEach(function (p) { propSel.appendChild(h('option', { value: p, text: p })); });
      selProp = prop && props.indexOf(prop) > -1 ? prop : (props.indexOf(selProp) > -1 ? selProp : props[0]);
      propSel.value = selProp;
      formula.value = c.props[selProp];
      chrome();
    }
    function showError() {
      if (!selected) { errLine.textContent = 'Select a control to edit its formulas.'; errLine.classList.remove('bad'); return; }
      var e = selected.errors[selProp];
      errLine.textContent = e ? '⚠ ' + e : selected.name + '.' + selProp + (BEHAVIOR[selProp] ? ' runs when the control is selected.' : ' updates automatically.');
      errLine.classList.toggle('bad', !!e);
    }
    propSel.addEventListener('change', function () { selProp = propSel.value; formula.value = selected.props[selProp]; showError(); });
    formula.addEventListener('input', function () {
      if (!selected) return;
      selected.props[selProp] = formula.value;
      if (selProp === 'Default') { delete selected.state.text; delete selected.state.value; }
      if (BEHAVIOR[selProp]) { try { Fx.parse(formula.value); delete selected.errors[selProp]; } catch (e) { selected.errors[selProp] = e.message; } }
      updateAll();
    });

    preset();
  }

  /* =========================================================
     3. CODE APPS
     ========================================================= */
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

  /* =========================================================
     4. COPILOT STUDIO
     ========================================================= */
  function initAgent(panel) {
    var certs = pageCerts(), roles = pageRoles(), projects = pageProjects();
    var s = { tone: 'Friendly', know: { articles: true, certs: true, roles: true, projects: true }, tools: { contact: true }, busy: false };
    var STOP = 'a an the and or of to in on for with about is are was were what which who how do does did has have he his ajay ajays kumar any some me my your you can could tell show list give find written write wrote article articles post posts blog i want know on'.split(' ');

    var nameIn = h('input', { class: 'pg-input', value: "Ajay's portfolio agent", maxlength: '40', 'aria-label': 'Agent name' });
    var toneSel = h('select', { class: 'pg-input', 'aria-label': 'Tone' }, ['Friendly', 'Concise', 'Formal'].map(function (t) { return h('option', { text: t }); }));
    toneSel.addEventListener('change', function () { s.tone = toneSel.value; });
    function sw(label, sub, obj, key) {
      var input = h('input', { type: 'checkbox', checked: obj[key] });
      input.addEventListener('change', function () { obj[key] = input.checked; });
      return h('label', { class: 'pg-switch' }, input, h('span', { class: 'pg-sw', 'aria-hidden': 'true' }), h('span', null, h('b', { text: label }), h('small', { text: sub })));
    }
    var log = h('div', { class: 'ag-log', role: 'log', 'aria-live': 'polite' });
    var input = h('input', { class: 'pg-input', placeholder: 'Ask about articles, certifications, projects…', 'aria-label': 'Message', maxlength: '200' });
    var form = h('form', { class: 'ag-form', onsubmit: function (e) { e.preventDefault(); send(input.value); } }, input, h('button', { type: 'submit', class: 'pg-btn go', 'aria-label': 'Send' }, 'Send'));
    var SUGG = ['What has Ajay written about delegation?', 'Which certifications does he hold?', 'Where has he worked?', 'Show me a project with Business Central', 'How can I contact him?'];
    var sugg = h('div', { class: 'ag-sugg' }, SUGG.map(function (q) { return h('button', { type: 'button', class: 'pg-chip', onclick: function () { send(q); } }, q); }));

    panel.appendChild(panelHead('Configure an agent', 'Ground an agent in knowledge, give it a tool, then test it. Turn a knowledge source off and ask again to see how grounding changes the answer. This is a scripted demo, not a real AI: answers come from this page and the article index.'));
    panel.appendChild(h('div', { class: 'ag' },
      h('div', { class: 'ag-cfg' },
        h('label', { class: 'pg-field' }, h('span', { text: 'Name' }), nameIn),
        h('label', { class: 'pg-field' }, h('span', { text: 'Tone' }), toneSel),
        h('div', { class: 'pg-field' }, h('span', { text: 'Knowledge' }),
          sw('Articles', ARTICLES.length + ' LinkedIn articles', s.know, 'articles'),
          sw('Certifications', certs.length + ' credentials', s.know, 'certs'),
          sw('Experience', roles.length + ' roles', s.know, 'roles'),
          sw('Projects', projects.length + ' case studies', s.know, 'projects')),
        h('div', { class: 'pg-field' }, h('span', { text: 'Tools' }),
          sw('Contact Ajay', 'Power Automate flow · drafts an email', s.tools, 'contact'))),
      h('div', { class: 'ag-chat' },
        h('div', { class: 'ag-top' }, h('b', { text: 'Test your agent' }), h('button', { type: 'button', class: 'pg-btn small', onclick: reset }, '↻ Reset')),
        log, sugg, form)));

    function lead() { return { Friendly: 'Happy to help! ', Concise: '', Formal: 'Certainly. ' }[s.tone]; }
    function bubble(who, content, trace) {
      var b = h('div', { class: 'ag-msg ' + who }, content);
      if (trace) b.appendChild(h('div', { class: 'ag-trace', text: trace }));
      log.appendChild(b); log.scrollTop = log.scrollHeight;
      return b;
    }
    function reset() {
      log.textContent = '';
      bubble('bot', h('p', { text: 'Hi, I\'m ' + (nameIn.value.trim() || 'the agent') + '. Ask me about Ajay\'s articles, certifications, experience or projects.' }));
    }
    function words(q) { return q.toLowerCase().replace(/[^a-z0-9& ]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 1 && STOP.indexOf(w) < 0; }); }
    function off(name) { return h('p', null, 'I don\'t have a knowledge source for ' + name + ' yet. Turn on ', h('b', { text: name }), ' under Knowledge and ask again.'); }

    function answer(q) {
      var ql = q.toLowerCase();
      if (/^\s*(hi|hello|hey|yo)\b/.test(ql)) return [h('p', { text: lead() + 'What would you like to know about Ajay?' }), 'Topic: Greeting'];
      if (/contact|reach|email|hire|touch|call|book|connect/.test(ql)) {
        if (!s.tools.contact) return [h('p', null, 'I can\'t do that yet. Enable the ', h('b', { text: 'Contact Ajay' }), ' tool and I\'ll draft an email for you. Or connect on LinkedIn: ', h('a', { href: 'https://www.linkedin.com/in/developeraj/', target: '_blank', rel: 'noopener', text: 'in/developeraj' }), '.'), 'Tool unavailable'];
        return [h('div', null, h('p', { text: lead() + 'I ran the Contact Ajay flow and drafted a message for you.' }),
          h('a', { class: 'pg-btn go small', href: 'mailto:iconajay9.8@gmail.com?subject=' + encodeURIComponent('Hello from your portfolio') + '&body=' + encodeURIComponent('Hi Ajay,\n\n'), text: 'Open the draft in my email app' })), 'Tool: Contact Ajay (Power Automate) · Succeeded'];
      }
      if (/cert|exam|credential|qualif|badge|mvp|associate|expert|claude/.test(ql)) {
        if (!s.know.certs) return [off('Certifications'), 'No knowledge source'];
        var w = words(q).filter(function (x) { return !/cert|exam|credential|qualif|badge|hold|have/.test(x); });
        var hit = certs.filter(function (c) { return w.some(function (x) { return (c.name + ' ' + c.code + ' ' + c.group).toLowerCase().indexOf(x) > -1; }); });
        var show = hit.length ? hit : certs.filter(function (c) { return c.group === 'Expert' || c.group === 'Anthropic'; });
        return [h('div', null, h('p', { text: lead() + (hit.length ? 'Here\'s what matches:' : 'Ajay holds ' + certs.length + ' listed credentials, and he is a Microsoft MVP for Power Apps. Highlights:') }),
          h('ul', null, show.slice(0, 6).map(function (c) { return h('li', null, h('b', { text: c.name }), ' · ' + c.code); }))), 'Knowledge: Certifications · ' + show.length + ' result(s)'];
      }
      if (/\bwork(ed|s|ing)?\b|job|experience|career|company|role|employ|synapx|lti|wonderbotz|years/.test(ql)) {
        if (!s.know.roles) return [off('Experience'), 'No knowledge source'];
        return [h('div', null, h('p', { text: lead() + 'His career so far:' }), h('ul', null, roles.map(function (r) { return h('li', null, h('b', { text: r.title }), ' at ' + r.org + ' (' + r.when.replace(/\s+/g, ' ') + ')'); }))), 'Knowledge: Experience · ' + roles.length + ' results'];
      }
      if (/project|built|case stud|solution|portfolio|delivered|app for/.test(ql)) {
        if (!s.know.projects) return [off('Projects'), 'No knowledge source'];
        var pw = words(q).filter(function (x) { return !/project|built|solution|case|stud/.test(x); });
        var ph = projects.filter(function (p) { return pw.some(function (x) { return (p.name + ' ' + p.area + ' ' + p.stack + ' ' + p.text).toLowerCase().indexOf(x) > -1; }); });
        var list = ph.length ? ph : projects.slice(0, 4);
        return [h('div', null, h('p', { text: lead() + (ph.length ? 'This one fits:' : 'A few highlights:') }), h('ul', null, list.slice(0, 4).map(function (p) { return h('li', null, h('b', { text: p.name }), ': ' + p.text); }))), 'Knowledge: Projects · ' + list.length + ' result(s)'];
      }
      if (!s.know.articles) return [off('Articles'), 'No knowledge source'];
      var qw = words(q);
      var scored = ARTICLES.map(function (a) {
        var t = (a.Title + ' ' + a.Topic).toLowerCase(), sc = 0;
        qw.forEach(function (x) { if (t.indexOf(x) > -1) sc += 2; else if (x.length > 4 && t.indexOf(x.slice(0, -1)) > -1) sc += 1; });
        return { a: a, sc: sc };
      }).filter(function (x) { return x.sc > 0; }).sort(function (x, y) { return y.sc - x.sc || (y.a.Date > x.a.Date ? 1 : -1); });
      if (!scored.length) return [h('p', { text: 'I couldn\'t find anything on that. Try asking about delegation, Dataverse SQL, Copilot Studio, adaptive cards or Business Central.' }), 'Knowledge: Articles · 0 results'];
      return [h('div', null, h('p', { text: lead() + 'Ajay has written about this:' }), h('ul', null, scored.slice(0, 3).map(function (x) {
        return h('li', null, h('a', { href: x.a.Url, target: '_blank', rel: 'noopener', text: x.a.Title }), h('small', { text: ' · ' + x.a.Date }));
      }))), 'Knowledge: Articles · searched ' + ARTICLES.length + ', ' + Math.min(3, scored.length) + ' cited'];
    }

    async function send(q) {
      q = (q || '').trim();
      if (!q || s.busy) return;
      s.busy = true; input.value = '';
      bubble('user', h('p', { text: q }));
      var typing = bubble('bot typing', h('span', { class: 'ag-dots', 'aria-label': 'Agent is typing' }, h('i'), h('i'), h('i')));
      await wait(rand(550, 950));
      typing.remove();
      var r = answer(q);
      bubble('bot', r[0], r[1]);
      s.busy = false;
    }
    reset();
  }

  /* =========================================================
     5. DATAVERSE
     ========================================================= */
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

  /* =========================================================
     Tabs
     ========================================================= */
  var APPS = [
    { id: 'flow', name: 'Power Automate', color: '#2563eb', icon: 'M4 4h6v6H4zM14 14h6v6h-6zM7 10v3a3 3 0 0 0 3 3h4M17 14V9', init: initFlow },
    { id: 'canvas', name: 'Canvas Apps', color: '#a03c9c', icon: 'M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM10.5 18.5h3', init: initCanvas },
    { id: 'code', name: 'Code Apps', color: '#0e7c86', icon: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16', init: initCode },
    { id: 'agent', name: 'Copilot Studio', color: '#0a7d5f', icon: 'M4 5h16v11H10l-5 4v-4H4zM9 10.5h.01M12 10.5h.01M15 10.5h.01', init: initAgent },
    { id: 'dv', name: 'Dataverse', color: '#3b7d23', icon: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3', init: initDataverse }
  ];
  var tablist = host.querySelector('.pg-tabs');
  var body = host.querySelector('.pg-body');
  var tabs = [], panels = [];
  APPS.forEach(function (a, i) {
    var tab = h('button', { type: 'button', role: 'tab', class: 'pg-tab', id: 'pg-tab-' + a.id, 'aria-controls': 'pg-panel-' + a.id, 'aria-selected': 'false', tabindex: '-1', style: { '--app': a.color } }, icon(a.icon), a.name);
    var panel = h('div', { role: 'tabpanel', class: 'pg-panel', id: 'pg-panel-' + a.id, 'aria-labelledby': 'pg-tab-' + a.id, hidden: true, style: { '--app': a.color } });
    tab.addEventListener('click', function () { show(i, true); });
    tab.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') d = -i; else if (e.key === 'End') d = APPS.length - 1 - i;
      if (d) { e.preventDefault(); show((i + d + APPS.length) % APPS.length, true); tabs[(i + d + APPS.length) % APPS.length].focus(); }
    });
    tabs.push(tab); panels.push(panel);
    tablist.appendChild(tab); body.appendChild(panel);
  });
  var started = {};
  function show(i, remember) {
    tabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(i === j)); t.tabIndex = i === j ? 0 : -1; });
    panels.forEach(function (p, j) { p.hidden = i !== j; });
    if (!started[i]) {
      started[i] = true;
      try { APPS[i].init(panels[i]); }
      catch (e) { panels[i].appendChild(h('p', { class: 'muted', text: 'This demo could not start in your browser.' })); if (window.console) console.error(e); }
    }
    if (remember) { try { localStorage.setItem('pg-tab', APPS[i].id); } catch (e) { /* storage unavailable */ } }
  }
  var first = 0;
  try { var saved = localStorage.getItem('pg-tab'); APPS.forEach(function (a, i) { if (a.id === saved) first = i; }); } catch (e) { /* storage unavailable */ }
  var hashTab = (location.hash.match(/^#play-(\w+)/) || [])[1];
  if (hashTab) APPS.forEach(function (a, i) { if (a.id === hashTab) first = i; });
  show(first, false);
})();
