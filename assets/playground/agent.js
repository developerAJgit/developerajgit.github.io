/* Copilot Studio: configure knowledge and tools, then test a grounded (scripted) agent. */
(function (PG) {
  'use strict';
  var h = PG.h, icon = PG.icon, panelHead = PG.panelHead, wait = PG.wait, rand = PG.rand, iso = PG.iso,
    guid = PG.guid, esc = PG.esc, fmtMs = PG.fmtMs, ARTICLES = PG.ARTICLES,
    pageCerts = PG.pageCerts, pageRoles = PG.pageRoles, pageProjects = PG.pageProjects;

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
    var SUGG = ['Why hire Ajay as a Solutions Architect?', 'Is he a Microsoft MVP?', 'Which certifications does he hold?', 'What has he written about delegation?', 'Show me a project with Business Central', 'Is he open to new roles?', 'How can I contact him?'];
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
      if (/contact|reach (out|him)|email|in touch|call him|book|connect with/.test(ql)) {
        if (!s.tools.contact) return [h('p', null, 'I can\'t do that yet. Enable the ', h('b', { text: 'Contact Ajay' }), ' tool and I\'ll draft an email for you. Or connect on LinkedIn: ', h('a', { href: 'https://www.linkedin.com/in/developeraj/', target: '_blank', rel: 'noopener', text: 'in/developeraj' }), '.'), 'Tool unavailable'];
        return [h('div', null, h('p', { text: lead() + 'I ran the Contact Ajay flow and drafted a message for you.' }),
          h('a', { class: 'pg-btn go small', href: 'mailto:iconajay9.8@gmail.com?subject=' + encodeURIComponent('Hello from your portfolio') + '&body=' + encodeURIComponent('Hi Ajay,\n\n'), text: 'Open the draft in my email app' })), 'Tool: Contact Ajay (Power Automate) · Succeeded'];
      }
      var mvp = window.MVP_DATA || { count: 11, asOfLabel: 'December 2025' };
      if (/\bmvp\b|most valuable/.test(ql)) {
        if (!s.know.certs) return [off('Certifications'), 'No knowledge source'];
        return [h('div', null, h('p', { text: lead() + 'Yes. Ajay is a Microsoft MVP for Power Apps. He was first awarded in December 2025 and renewed for 2026–2027.' }),
          h('ul', null, h('li', null, 'One of ', h('b', { text: mvp.count + ' Power Apps MVPs in India' }), ' (as of ' + mvp.asOfLabel + ').'),
            h('li', { text: 'Power Platform Community Spotlight honoree, December 2025.' }),
            h('li', { text: 'Recognised for ' + ARTICLES.length + ' technical articles, running the Bangalore Power Platform User Group, talks, forum answers and open-source samples.' })),
          h('a', { href: 'https://mvp.microsoft.com/en-US/MVP/profile/eef3cb38-607a-4bc5-ac4e-5697401e72ff', target: '_blank', rel: 'noopener', text: 'Verify on his MVP profile ↗' })), 'Knowledge: Certifications · MVP award'];
      }
      if (/hire|why .*(ajay|him)|good fit|strength|stand out|architect role|solutions? architect|enterprise architect|senior role/.test(ql)) {
        return [h('div', null, h('p', { text: lead() + 'Here\'s the short version for an architecture role:' }),
          h('ul', null,
            h('li', null, h('b', { text: 'Architecture depth: ' }), 'Power Platform Solution Architect Expert, Agentic AI Business Solutions Architect Expert and DevOps Engineer Expert certifications.'),
            h('li', null, h('b', { text: 'Enterprise delivery: ' }), 'multi-country approval platforms, a trading platform with PCF and Azure Functions, governance tooling, and ERP integration with Business Central.'),
            h('li', null, h('b', { text: 'Breadth: ' }), 'Power Platform, Dataverse, SQL, SharePoint, Azure, Business Central, Fabric, Copilot Studio and agentic AI.'),
            h('li', null, h('b', { text: 'Recognition: ' }), 'Microsoft MVP for Power Apps, one of ' + mvp.count + ' in India.'),
            h('li', null, h('b', { text: 'Leadership: ' }), 'runs a user group, mentors makers and has published ' + ARTICLES.length + ' articles.'))), 'Knowledge: Experience, Projects, Certifications'];
      }
      if (/open to|available|availability|looking for|new role|opportunit|notice period|relocat/.test(ql)) {
        return [h('div', null, h('p', { text: lead() + 'Ajay is open to Solutions Architect, Enterprise Architect and other senior Power Platform roles.' }),
          s.tools.contact ? h('p', null, 'Ask me to contact him and I\'ll draft the email, or connect on ', h('a', { href: 'https://www.linkedin.com/in/developeraj/', target: '_blank', rel: 'noopener', text: 'LinkedIn' }), '.') : null), 'Topic: Availability'];
      }
      if (/cert|exam|credential|qualif|badge|associate|expert|claude/.test(ql)) {
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

  PG.register({ id: 'agent', order: 50, group: 'Build', short: 'Copilot', name: 'Copilot Studio', color: '#0a7d5f', icon: 'M4 5h16v11H10l-5 4v-4H4zM9 10.5h.01M12 10.5h.01M15 10.5h.01', init: initAgent });
})(window.PG);
