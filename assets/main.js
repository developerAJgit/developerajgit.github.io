(function () {
  'use strict';
  var root = document.documentElement;

  // Theme toggle
  document.getElementById('theme').addEventListener('click', function () {
    var current = root.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // Mobile menu
  var menu = document.getElementById('menu');
  var links = document.getElementById('links');
  menu.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
  });

  // Nav border + active section
  var nav = document.querySelector('.nav');
  var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navLinks = Array.prototype.slice.call(links.querySelectorAll('a'));
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });

    // Reveal on scroll
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); reveal.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.section-head, .card, .timeline > li, .cred-summary > div, .contact-card, .principles > li, .impact > div').forEach(function (el) {
      el.classList.add('reveal'); reveal.observe(el);
    });
  }

  document.getElementById('year').textContent = new Date().getFullYear();

  // Hide the floating "Ask my agent" button while the playground is on screen.
  var fab = document.querySelector('.fab'), pg = document.getElementById('playground');
  if (fab && pg && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { fab.classList.toggle('hide', entries[0].isIntersecting); }, { threshold: 0.15 }).observe(pg);
  }

  // MVP figures live in one data file (assets/data/mvp.json), fetched fresh on every visit,
  // so updating that file updates every place the number appears.
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function applyMvp(d) {
    var count = d.powerAppsMvpsInIndia, p = String(d.asOf || '').split('-');
    var asOfLabel = p.length > 1 ? MONTHS[+p[1] - 1] + ' ' + p[0] : 'December 2025';
    window.MVP_DATA = { count: count, asOfLabel: asOfLabel };
    document.querySelectorAll('[data-mvp-count]').forEach(function (el) { el.textContent = count; });
    document.querySelectorAll('[data-mvp-asof]').forEach(function (el) { el.textContent = asOfLabel; });
  }
  window.MVP_DATA = { count: 11, asOfLabel: 'December 2025' };
  if (window.fetch && location.protocol !== 'file:') {
    fetch('assets/data/mvp.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.powerAppsMvpsInIndia) applyMvp(d); })
      .catch(function () { /* keep the built-in figures */ });
  }

  // Articles
  var data = window.ARTICLES || [];
  var list = document.getElementById('articles');
  var q = document.getElementById('q');
  var topicsEl = document.getElementById('topics');
  var moreBtn = document.getElementById('more');
  var countEl = document.getElementById('count');
  var PAGE = 12, shown = PAGE, topic = 'All';

  var counts = {};
  data.forEach(function (a) { a.g.forEach(function (g) { counts[g] = (counts[g] || 0) + 1; }); });
  var topics = ['All'].concat(Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }));
  topics.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'topic';
    b.setAttribute('aria-pressed', String(t === topic));
    b.innerHTML = '';
    b.appendChild(document.createTextNode(t));
    var s = document.createElement('small'); s.textContent = t === 'All' ? data.length : counts[t];
    b.appendChild(s);
    b.addEventListener('click', function () {
      topic = t; shown = PAGE;
      Array.prototype.forEach.call(topicsEl.children, function (c) { c.setAttribute('aria-pressed', String(c === b)); });
      render();
    });
    topicsEl.appendChild(b);
  });

  var fmt = function (iso) {
    var p = iso.split('-');
    var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1] - 1];
    return m + ' ' + (+p[2]) + ', ' + p[0];
  };

  function render() {
    var term = q.value.trim().toLowerCase();
    var filtered = data.filter(function (a) {
      return (topic === 'All' || a.g.indexOf(topic) > -1) && (!term || a.t.toLowerCase().indexOf(term) > -1);
    });
    list.textContent = '';
    if (!filtered.length) {
      var e = document.createElement('li'); e.className = 'empty'; e.textContent = 'No articles match that search.';
      list.appendChild(e);
    }
    filtered.slice(0, shown).forEach(function (a) {
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.href = a.u; link.target = '_blank'; link.rel = 'noopener';
      var time = document.createElement('time'); time.dateTime = a.d; time.textContent = fmt(a.d);
      var t = document.createElement('span'); t.className = 't'; t.textContent = a.t;
      var g = document.createElement('span'); g.className = 'g'; g.textContent = a.g[0];
      link.appendChild(time); link.appendChild(t); link.appendChild(g);
      li.appendChild(link); list.appendChild(li);
    });
    var visible = Math.min(shown, filtered.length);
    countEl.textContent = 'Showing ' + visible + ' of ' + filtered.length;
    moreBtn.hidden = visible >= filtered.length;
  }

  q.addEventListener('input', function () { shown = PAGE; render(); });
  moreBtn.addEventListener('click', function () { shown += PAGE; render(); });
  render();
})();
