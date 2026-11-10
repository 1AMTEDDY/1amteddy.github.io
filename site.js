// Small behaviours. Every part is optional: if anything fails, the page still reads fine.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hover = matchMedia('(hover: hover)').matches;

  // Notion-like view switch for the work section (gallery or table).
  try {
    var views = document.getElementById('views');
    var gallery = document.getElementById('gallery');
    var table = document.getElementById('dbtable');
    if (views && gallery && table) {
      views.hidden = false;
      var btns = views.querySelectorAll('.vbtn');
      var set = function (v) {
        gallery.hidden = v !== 'gallery';
        table.hidden = v !== 'table';
        btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === v)); });
      };
      btns.forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.view); }); });
    }
  } catch (_) {}

  // Sliding pill behind the nav link you hover or focus (Framer-like).
  try {
    var nav = document.querySelector('.nav'), pill = document.querySelector('.navpill');
    if (nav && pill && hover && !reduce) {
      var move = function (a) {
        pill.style.setProperty('--nx', a.offsetLeft + 'px');
        pill.style.setProperty('--ns', (a.offsetWidth / 100).toFixed(3));
        pill.style.opacity = 1;
      };
      nav.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('pointerenter', function () { move(a); });
        a.addEventListener('focus', function () { move(a); });
      });
      nav.addEventListener('pointerleave', function () { pill.style.opacity = 0; });
      nav.addEventListener('focusout', function () { pill.style.opacity = 0; });
    }
  } catch (_) {}

  // Soft light that follows the pointer across cards.
  try {
    if (hover && !reduce) {
      document.querySelectorAll('.card').forEach(function (card) {
        var spot = document.createElement('span');
        spot.className = 'spot';
        spot.setAttribute('aria-hidden', 'true');
        card.insertBefore(spot, card.firstChild);
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          spot.style.setProperty('--sx', (e.clientX - r.left) + 'px');
          spot.style.setProperty('--sy', (e.clientY - r.top) + 'px');
        });
      });
    }
  } catch (_) {}

  // Once-only reveals.
  try {
    if (!('IntersectionObserver' in window) || reduce) return;
    var picks = '.sec h2,.card,.shot,.talks li,.stack>div,.about>*,.contact h2,.contact p,.contact .cta';
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        el.classList.add('mo-in');
        setTimeout(function () { el.classList.remove('mo-rv', 'mo-in'); }, 1300);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll(picks).forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.matches(picks); });
      el.style.setProperty('--mo-delay', Math.min(sibs.indexOf(el), 4) * 0.07 + 's');
      el.classList.add('mo-rv');
      io.observe(el);
    });
    document.documentElement.classList.add('mo');
  } catch (_) {}
})();

// Theme: system, light or dark. The saved choice is applied before first paint by a small script in the head.
(function () {
  try {
    var btn = document.getElementById('theme');
    if (!btn) return;
    var root = document.documentElement;
    var order = ['system', 'light', 'dark'];
    var names = { system: 'Auto', light: 'Light', dark: 'Dark' };
    var get = function () { try { return localStorage.getItem('theme') || 'system'; } catch (_) { return 'system'; } };
    var paint = function (v) {
      if (v === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', v);
      btn.setAttribute('aria-label', 'Theme: ' + names[v] + '. Press to change.');
      btn.setAttribute('title', 'Theme: ' + names[v]);
      var l = btn.querySelector('.lbl'); if (l) l.textContent = names[v];
    };
    var lbl = document.createElement('span'); lbl.className = 'lbl'; btn.appendChild(lbl);
    paint(get());
    btn.addEventListener('click', function () {
      var next = order[(order.indexOf(get()) + 1) % 3];
      try { if (next === 'system') localStorage.removeItem('theme'); else localStorage.setItem('theme', next); } catch (_) {}
      paint(next);
    });
  } catch (_) {}
})();

// Contact form: checks the fields, blocks bots, and only sends if a real endpoint is set.
(function () {
  try {
    var f = document.getElementById('cf');
    if (!f) return;
    var status = document.getElementById('cstatus'), send = document.getElementById('csend');
    var endpoint = (f.getAttribute('data-endpoint') || '').trim();
    var opened = Date.now();
    document.querySelectorAll('a[data-topic]').forEach(function (a) {
      a.addEventListener('click', function () { var s = document.getElementById('cc'); if (s) s.value = a.getAttribute('data-topic'); });
    });
    if (!endpoint) {
      send.disabled = true;
      status.textContent = 'The form is not connected yet. For now, please message me on LinkedIn.';
    }
    var fields = [['cn', 'Please enter your name.'], ['ce', 'Please enter a valid email address.'], ['cs', 'Please add a subject.'], ['cm', 'Please write a message of at least 10 characters.']];
    var check = function () {
      var ok = true;
      fields.forEach(function (p) {
        var el = document.getElementById(p[0]); var v = (el.value || '').trim(); var bad = !v;
        if (p[0] === 'ce') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if (p[0] === 'cm') bad = v.length < 10;
        var prev = el.parentNode.querySelector('.err'); if (prev) prev.remove();
        el.removeAttribute('aria-invalid');
        if (bad) {
          ok = false; el.setAttribute('aria-invalid', 'true');
          var m = document.createElement('div'); m.className = 'err'; m.textContent = p[1]; el.parentNode.appendChild(m);
        }
      });
      return ok;
    };
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!endpoint) return;
      if (f.elements.website.value) return;                    // honeypot
      if (Date.now() - opened < 3000) { status.textContent = 'Please take a moment and try again.'; return; }
      if (!check()) { var bad = f.querySelector('[aria-invalid]'); if (bad) bad.focus(); return; }
      send.disabled = true; status.textContent = 'Sending...';
      var data = {}; new FormData(f).forEach(function (v, k) { if (k !== 'website') data[k] = v; });
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error('bad'); f.reset(); status.textContent = 'Thanks. Your message is on its way.'; })
        .catch(function () { status.textContent = 'That did not send. Please try again, or message me on LinkedIn.'; })
        .then(function () { send.disabled = false; });
    });
  } catch (_) {}
})();
