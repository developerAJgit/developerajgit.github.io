/* Canvas Apps: a studio backed by the Power Fx interpreter in powerfx.js. */
(function (PG) {
  'use strict';
  var h = PG.h, icon = PG.icon, panelHead = PG.panelHead, wait = PG.wait, rand = PG.rand, iso = PG.iso,
    guid = PG.guid, esc = PG.esc, fmtMs = PG.fmtMs, ARTICLES = PG.ARTICLES,
    pageCerts = PG.pageCerts, pageRoles = PG.pageRoles, pageProjects = PG.pageProjects;

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

  PG.register({ id: 'canvas', order: 30, group: 'Build', short: 'Canvas', name: 'Canvas Apps', color: '#a03c9c', icon: 'M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM10.5 18.5h3', init: initCanvas });
})(window.PG);
