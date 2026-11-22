/* Visual effects: theme switcher, sky particles, cursor spotlight, MVP card tilt,
   scroll progress, number counters, hero title entrance, featured article covers.
   Everything degrades gracefully and respects prefers-reduced-motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Themes ---------- */
  var THEMES = [
    { id: 'midnight', name: 'Midnight Chakra', jp: '夜', dots: ['#4cc9ff', '#8b5cf6', '#f5b544'] },
    { id: 'ember', name: 'Ember Scroll', jp: '炎', dots: ['#ffd166', '#ff8a3d', '#ff3d6e'] },
    { id: 'jade', name: 'Jade Spirit', jp: '翠', dots: ['#9ff7f5', '#00e6c3', '#38bdf8'] },
    { id: 'sakura', name: 'Sakura Dawn', jp: '桜', dots: ['#d6336c', '#7c3aed', '#d97706'] }
  ];
  var current = function () { return root.getAttribute('data-theme') || 'midnight'; };
  var meta = document.querySelector('meta[name="theme-color"]');
  var opts = [];
  function setTheme(id, save) {
    root.setAttribute('data-theme', id);
    if (save) { try { localStorage.setItem('theme', id); } catch (e) { /* storage unavailable */ } }
    opts.forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-t') === id)); });
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#060a1c');
    if (sky) sky.reset();
    document.dispatchEvent(new CustomEvent('themechange', { detail: id }));
  }
  window.setSiteTheme = setTheme;

  var btn = document.getElementById('theme');
  if (btn) {
    var menu = document.createElement('div');
    menu.className = 'theme-menu'; menu.id = 'theme-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Theme');
    var label = document.createElement('p'); label.textContent = 'Theme'; menu.appendChild(label);
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'theme-opt'; b.setAttribute('role', 'menuitemradio'); b.setAttribute('data-t', t.id);
      var sw = document.createElement('span'); sw.className = 'sw';
      t.dots.forEach(function (c) { var i = document.createElement('i'); i.style.background = c; sw.appendChild(i); });
      var nm = document.createElement('span'); nm.textContent = t.name;
      var jp = document.createElement('small'); jp.setAttribute('lang', 'ja'); jp.textContent = t.jp;
      b.appendChild(sw); b.appendChild(nm); b.appendChild(jp);
      b.addEventListener('click', function () { setTheme(t.id, true); close(); btn.focus(); });
      menu.appendChild(b); opts.push(b);
    });
    btn.parentNode.insertBefore(menu, btn.nextSibling);
    btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'theme-menu');
    var open = function () { menu.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); var on = menu.querySelector('[aria-checked="true"]') || opts[0]; on.focus(); };
    var close = function () { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.contains('open') ? close() : open(); });
    document.addEventListener('click', function (e) { if (!menu.contains(e.target)) close(); });
    menu.addEventListener('keydown', function (e) {
      var i = opts.indexOf(document.activeElement);
      if (e.key === 'Escape') { close(); btn.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
    });
  }

  /* ---------- Sky particles: sparks, embers, fireflies or sakura petals ---------- */
  var sky = null;
  var canvas = document.getElementById('fx');
  if (canvas && canvas.getContext && !RM) {
    var ctx = canvas.getContext('2d'), W = 0, H = 0, parts = [], rgb = '120,210,255', kind = 'spark', raf = 0;
    var resize = function () {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    var spawn = function (anywhere) {
      if (kind === 'petal') return { x: Math.random() * W, y: anywhere ? Math.random() * H : -20, vx: .25 + Math.random() * .6, vy: .45 + Math.random() * .7, r: 5 + Math.random() * 5, a: Math.random() * 6.28, va: (Math.random() - .5) * .03, sw: Math.random() * 6.28, o: .45 + Math.random() * .4 };
      return { x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10, vx: (Math.random() - .5) * .25, vy: -(.15 + Math.random() * .55), r: .7 + Math.random() * 1.7, tw: Math.random() * 6.28, o: .25 + Math.random() * .65 };
    };
    var reset = function () {
      rgb = getComputedStyle(root).getPropertyValue('--particle').trim() || rgb;
      kind = current() === 'sakura' ? 'petal' : 'spark';
      var n = W < 700 ? 14 : 36;
      parts = []; for (var i = 0; i < n; i++) parts.push(spawn(true));
    };
    var petal = function (p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = 'rgba(' + rgb + ',' + p.o + ')';
      ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.quadraticCurveTo(p.r * .9, -p.r * .2, 0, p.r); ctx.quadraticCurveTo(-p.r * .9, -p.r * .2, 0, -p.r); ctx.fill();
      ctx.restore();
    };
    var frame = function () {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = kind === 'petal' ? 'source-over' : 'lighter';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (kind === 'petal') {
          p.sw += .02; p.x += p.vx + Math.sin(p.sw) * .4; p.y += p.vy; p.a += p.va;
          if (p.y > H + 20 || p.x > W + 20) parts[i] = spawn(false);
          petal(p);
        } else {
          p.tw += .05; p.x += p.vx; p.y += p.vy;
          if (p.y < -10) parts[i] = spawn(false);
          var o = p.o * (.6 + .4 * Math.sin(p.tw));
          ctx.fillStyle = 'rgba(' + rgb + ',' + (o * .18) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
          ctx.fillStyle = 'rgba(' + rgb + ',' + o + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    resize(); reset(); raf = requestAnimationFrame(frame);
    window.addEventListener('resize', function () { resize(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(frame); });
    sky = { reset: reset };
  }

  /* ---------- Glow on hover + cursor spotlight on glass cards ---------- */
  document.querySelectorAll('.card, .contact-card, .principles li, .scroll-card, .impact > div, .cred-summary > div').forEach(function (el) { el.classList.add('glow-hover'); });
  var SPOT = '.card, .principles li, .contact-card, .impact > div, .cred-summary > div, .scroll-card, .stats > div, .ra-row, .mvp-card';
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest(SPOT);
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---------- MVP card tilt ---------- */
  var wrap = document.querySelector('.mvp-wrap'), card = wrap && wrap.querySelector('.mvp-card');
  if (wrap && card && !RM && window.matchMedia('(hover: hover)').matches) {
    wrap.addEventListener('pointermove', function (e) {
      var r = wrap.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = 'rotateY(' + (x * 12).toFixed(2) + 'deg) rotateX(' + (-y * 10).toFixed(2) + 'deg)';
    });
    wrap.addEventListener('pointerleave', function () { card.style.transform = ''; });
  }

  /* ---------- Scroll progress ---------- */
  var bar = document.querySelector('.progress i');
  if (bar) {
    var tick = function () { var max = document.documentElement.scrollHeight - window.innerHeight; bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')'; };
    window.addEventListener('scroll', tick, { passive: true }); tick();
  }

  /* ---------- Count-up numbers ---------- */
  var nums = document.querySelectorAll('.stats dd, .cred-summary strong, .impact strong');
  if ('IntersectionObserver' in window && !RM) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, m = /^(\D*)(\d+)(.*)$/.exec(el.textContent.trim());
        if (!m) return;
        var target = +m[2], t0 = performance.now(), dur = 1100, final = el.textContent;
        setTimeout(function () { el.textContent = final; }, dur + 300);
        (function step(now) {
          var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          el.textContent = m[1] + Math.round(target * e) + m[3];
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: .6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Hero title: word-by-word entrance ---------- */
  var h1 = document.querySelector('.hero h1');
  if (h1 && !RM) {
    var i = 0;
    var wrapWords = function (text, cls) {
      var frag = document.createDocumentFragment();
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var s = document.createElement('span'); s.className = 'w' + (cls ? ' ' + cls : ''); s.style.setProperty('--i', i++); s.textContent = part;
        frag.appendChild(s);
      });
      return frag;
    };
    Array.prototype.slice.call(h1.childNodes).forEach(function (n) {
      if (n.nodeType === 3) h1.replaceChild(wrapWords(n.textContent), n);
      else if (n.classList && n.classList.contains('grad')) {
        var g = document.createElement('span'); g.className = 'gw';
        g.appendChild(wrapWords(n.textContent, 'grad'));
        h1.replaceChild(g, n);
      }
    });
  }

  /* ---------- Featured articles with cover art ---------- */
  var host = document.getElementById('scrolls');
  var ARTS = window.ARTICLES || [];
  var FEATURED = [
    ['copilot-canvas', 'Copilot in Canvas Apps'],
    ['outbox-pattern', 'Transactional Outbox'],
    ['human-in-the-loop', 'Human in the Loop'],
    ['copilot-fusion', 'Copilot Fusion'],
    ['agent-mailbox', 'its own mailbox'],
    ['copilot-harness', 'Copilot Harness'],
    ['summoning-portal', 'Summoning Portal'],
    ['bc-run-action', 'Run action (V3)']
  ];
  if (host) {
    FEATURED.forEach(function (f) {
      var a = null, p = f[1].toLowerCase();
      for (var k = 0; k < ARTS.length; k++) if (ARTS[k].t.toLowerCase().indexOf(p) > -1) { a = ARTS[k]; break; }
      if (!a) return;
      var link = document.createElement('a');
      link.className = 'scroll-card glow-hover'; link.href = a.u; link.target = '_blank'; link.rel = 'noopener';
      var box = document.createElement('div'); box.className = 'img';
      var img = document.createElement('img'); img.src = 'assets/img/covers/' + f[0] + '.jpg'; img.alt = ''; img.loading = 'lazy'; img.width = 560; img.height = 560;
      box.appendChild(img);
      var meta = document.createElement('div'); meta.className = 'meta';
      var sm = document.createElement('small'); sm.textContent = a.g[0] + ' · ' + new Date(a.d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      var b = document.createElement('b'); b.textContent = a.t;
      meta.appendChild(sm); meta.appendChild(b);
      link.appendChild(box); link.appendChild(meta);
      host.appendChild(link);
    });
  }

  setTheme(current(), false);
})();
