/* ==========================================================================
   SAM — immersion
   Canvas de fond, séquence d'amorçage, console interactive, révélations.
   Aucune dépendance. Tout est réversible si le JS ne tourne pas.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ======================================================================
     1. Séquence d'amorçage
     ====================================================================== */
  var boot = $('#boot'), bootLines = $('#boot-lines'), bootSkip = $('#boot-skip');

  function closeBoot() {
    if (!boot || boot.classList.contains('done')) return;
    boot.classList.add('done');
    document.body.classList.remove('booting');
    setTimeout(function () { boot.remove(); }, 700);
  }

  var BOOT = [
    ['noyau', 'hermes-agent · démarrage du service'],
    ['contexte', 'profil chargé — Mamadou Saliou'],
    ['mémoire', '5 518 fragments · index HNSW · pgvector'],
    ['outils', 'terminal · fichiers · navigateur · recherche · cron'],
    ['réseau', 'api.deepseek.com · 42 ms'],
    ['état', 'SAM opérationnel']
  ];

  function runBoot() {
    if (!bootLines) return;
    if (REDUCED) { closeBoot(); return; }
    var i = 0;
    var step = function () {
      if (i >= BOOT.length) { setTimeout(closeBoot, 320); return; }
      var pair = BOOT[i];
      var d = document.createElement('div');
      d.innerHTML = '<span class="key">' + pair[0] + '</span> ' +
                    '<span class="dim">' + '·'.repeat(Math.max(2, 12 - pair[0].length)) + '</span> ' +
                    (i === BOOT.length - 1
                      ? '<span class="ok">' + pair[1] + '</span>'
                      : pair[1]);
      bootLines.appendChild(d);
      i++;
      setTimeout(step, 210);
    };
    step();
    if (bootSkip) bootSkip.addEventListener('click', closeBoot);
    window.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeBoot(); window.removeEventListener('keydown', esc); }
    });
    // filet de sécurité : jamais plus de 3,5 s
    setTimeout(closeBoot, 3500);
  }
  document.body.classList.add('booting');
  runBoot();

  /* ======================================================================
     2. Champ de particules
     ====================================================================== */
  (function field() {
    var cv = $('#field');
    if (!cv || REDUCED) return;
    var ctx = cv.getContext('2d', { alpha: true });
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pts = [], mouse = { x: -9999, y: -9999 };
    var raf = null, running = true;

    function size() {
      w = window.innerWidth; h = window.innerHeight;
      cv.width = Math.floor(w * dpr);
      cv.height = Math.floor(h * dpr);
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var density = Math.round((w * h) / 26000);
      var n = Math.max(26, Math.min(96, density));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: Math.random() * 1.5 + 0.5
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var i, j, a, b, dx, dy, d, dist;

      for (i = 0; i < pts.length; i++) {
        a = pts[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < -20) a.x = w + 20; if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20; if (a.y > h + 20) a.y = -20;

        // répulsion douce autour du curseur
        dx = a.x - mouse.x; dy = a.y - mouse.y;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150 && d > 0.01) {
          a.x += (dx / d) * (150 - d) * 0.006;
          a.y += (dy / d) * (150 - d) * 0.006;
        }

        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(70,240,192,0.42)';
        ctx.fill();

        for (j = i + 1; j < pts.length; j++) {
          b = pts[j];
          dx = a.x - b.x; dy = a.y - b.y;
          dist = dx * dx + dy * dy;
          if (dist < 19000) {
            var o = (1 - dist / 19000) * 0.14;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = 'rgba(70,240,192,' + o.toFixed(3) + ')';
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
      if (running) raf = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', size, { passive: true });
    window.addEventListener('pointermove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; draw(); }
    });

    size();
    draw();
  })();

  /* ======================================================================
     3. Halo de souris
     ====================================================================== */
  (function spotlight() {
    var el = $('#spot');
    if (!el || REDUCED || window.matchMedia('(hover: none)').matches) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, started = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!started) { cx = tx; cy = ty; started = true; el.classList.add('on'); }
    }, { passive: true });

    (function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      el.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    })();
  })();

  /* ======================================================================
     4. Barre + menu
     ====================================================================== */
  var bar = $('#bar');
  (function barState() {
    var set = function () {
      if (bar) bar.classList.toggle('stuck', window.scrollY > 10);
    };
    window.addEventListener('scroll', set, { passive: true });
    set();
  })();

  (function menu() {
    var b = $('#burger'), panel = $('#mnav');
    if (!b || !panel) return;
    function open(state) {
      b.setAttribute('aria-expanded', state ? 'true' : 'false');
      b.setAttribute('aria-label', state ? 'Fermer le menu' : 'Ouvrir le menu');
      panel.hidden = !state;
      document.body.style.overflow = state ? 'hidden' : '';
    }
    b.addEventListener('click', function () {
      open(b.getAttribute('aria-expanded') !== 'true');
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) open(false);
    });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) open(false); });
  })();

  /* ======================================================================
     5. Révélation au défilement (+ filet de sécurité)
     ====================================================================== */
  (function reveal() {
    var els = $$('[data-reveal]');
    if (REDUCED || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var sib = els.filter(function (s) { return s.parentElement === el.parentElement; });
        var idx = sib.indexOf(el);
        el.style.transitionDelay = Math.max(0, Math.min(idx, 4)) * 60 + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });

    // ce qui est déjà visible au chargement apparaît tout de suite
    setTimeout(function () {
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.95) el.classList.add('in');
      });
    }, 60);
  })();

  /* ======================================================================
     6. Compteurs
     ====================================================================== */
  (function counters() {
    var nodes = $$('[data-count]');
    if (!nodes.length) return;
    if (REDUCED) {
      nodes.forEach(function (n) {
        n.textContent = (n.dataset.prefix || '') + n.dataset.count + (n.dataset.suffix || '');
      });
      return;
    }
    var done = new WeakSet();
    var run = function (n) {
      if (done.has(n)) return;
      done.add(n);
      var target = parseInt(n.dataset.count, 10);
      var pre = n.dataset.prefix || '', suf = n.dataset.suffix || '';
      var t0 = null, dur = 1400;
      function tick(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);
        n.textContent = pre + Math.round(target * e).toLocaleString('fr-FR').replace(/\u202f|\s/g, ' ') + suf;
        if (p < 1) requestAnimationFrame(tick);
        else n.textContent = pre + target.toLocaleString('fr-FR').replace(/\u202f|\s/g, ' ') + suf;
      }
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    nodes.forEach(function (n) { io.observe(n); });
  })();

  /* ======================================================================
     7. Halo des cartes d'outil
     ====================================================================== */
  $$('.tool').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  });

  /* ======================================================================
     8. Console interactive
     ====================================================================== */
  (function consoleApp() {
    var form = $('#term-form'), input = $('#term-input'), body = $('#term-body');
    if (!form || !input || !body) return;

    var hist = [], hi = -1;

    function scroll() { body.scrollTop = body.scrollHeight; }

    function print(html, cls) {
      var d = document.createElement('div');
      d.className = 'term-line' + (cls ? ' ' + cls : '');
      d.innerHTML = html;
      body.appendChild(d);
      scroll();
      return d;
    }

    function promptLine(cmd) {
      print('<span class="p">sam@contabo:~$</span> ' + escapeHtml(cmd));
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

    function pad(s, n) {
      s = String(s);
      return s + ' '.repeat(Math.max(0, n - s.length));
    }

    var CMDS = {
      help: function () {
        print('<span class="dim">commandes disponibles :</span>');
        var rows = [
          ['whoami', 'ce que je suis'],
          ['uname', 'la machine et le système'],
          ['date', 'l\'heure, dans ton fuseau'],
          ['memoire', 'l\'état de l\'index de mémoire'],
          ['skills', 'quelques procédures apprises'],
          ['ping', 'latence vers le modèle'],
          ['ls', 'les sections de cette page'],
          ['sudo', 'tentative d\'élévation (tu vas rire)'],
          ['clear', 'vider la console']
        ];
        rows.forEach(function (r) {
          print('  <span class="ok">' + pad(r[0], 12) + '</span><span class="dim">' + r[1] + '</span>', 'help-row');
        });
        print('<span class="dim">Astuce : les flèches ↑ ↓ parcourent l\'historique.</span>');
      },

      whoami: function () {
        print('SAM <span class="dim">— agent personnel, pas un chatbot.</span>');
        print('tourne pour <span class="key">Mamadou Saliou</span> · NG TECH · Dakar');
        print('socle <span class="key">hermes-agent</span> · modèle <span class="key">deepseek-flash</span>');
        print('<span class="dim">règle : ne jamais prétendre avoir vérifié sans preuve.</span>');
      },

      uname: function () {
        print('Linux contabo 6.8.0 x86_64 · Ubuntu 24.04.3 LTS');
        print('4 vCPU AMD EPYC · 7,9 Go RAM · 100 Go SSD · <span class="warn">pas de GPU</span>');
        print('PostgreSQL 16 + pgvector · Caddy · systemd');
      },

      date: function () {
        var now = new Date();
        var fmt = new Intl.DateTimeFormat('fr-FR', {
          timeZone: 'Africa/Dakar', dateStyle: 'full', timeStyle: 'medium'
        });
        print(fmt.format(now) + ' <span class="dim">(Africa/Dakar, UTC+0)</span>');
      },

      memoire: function () {
        print('<span class="dim">index HNSW · cosinus · modèle 384d</span>');
        print('fragments   <span class="ok">5 518</span>   <span class="dim">(contexte, doc, dépôts, sessions)</span>');
        print('volume      <span class="ok">472k</span> jetons lisibles · base 31 Mo');
        print('latence     <span class="ok">~90 ms</span> par requête');
        print('réindex     toutes les 2 h, incrémentale');
        print('<span class="warn">un souvenir n\'est pas une preuve : le fichier source se relit.</span>');
      },

      skills: function () {
        print('<span class="dim">quelques procédures que j\'ai écrites ou apprises :</span>');
        ['système — debugger une cause racine, pas un symptôme',
         'publication — mettre une page en ligne et prouver son rendu',
         'dépôts NG TECH — droits, phases, vérification des chiffres',
         'vidéo programmatique — NG Motion, benchmarks de rendu',
         'documents — devis, facture, PDF, tableur',
         'mémoire — indexer et interroger le contexte durable',
         'veille — produire une synthèse sourcée et datée'
        ].forEach(function (s) { print('  <span class="ok">·</span> ' + s); });
        print('<span class="dim">51 procédures au total.</span>');
      },

      ping: function () {
        print('<span class="dim">envoi vers api.deepseek.com…</span>');
        var ms = [38, 41, 39, 43, 40];
        var i = 0;
        var go = function () {
          if (i >= ms.length) {
            print('5 paquets, 5 reçus, <span class="ok">0 % perte</span> · min 38 ms · moy 40 ms');
            return;
          }
          print('64 octets · temps <span class="ok">' + ms[i] + ' ms</span>');
          i++;
          setTimeout(go, 260);
        };
        go();
      },

      ls: function () {
        print('<span class="ok">01-identite</span>    <span class="ok">02-outils</span>      <span class="ok">03-console</span>');
        print('<span class="ok">04-memoire</span>     <span class="ok">05-machine</span>     <span class="ok">06-contact</span>');
        print('<span class="ok">portfolio/</span>     <span class="dim">le site de Mamadou Saliou</span>');
      },

      sudo: function () {
        print('<span class="warn">sam n\'est pas dans le fichier sudoers. Cet incident sera signalé.</span>');
        print('<span class="dim">… et signalé à qui ? Il n\'y a que Saliou.</span>');
      },

      clear: function () {
        body.innerHTML = '';
        print('<span class="dim">console vidée.</span>', 'term-sys');
        return true;
      }
    };
    CMDS.uname = CMDS.uname;
    CMDS['uname -a'] = CMDS.uname;
    CMDS.memory = CMDS.memoire;
    CMDS.wm = CMDS.whoami;

    function run(raw) {
      var cmd = raw.trim();
      if (!cmd) return;
      promptLine(cmd);
      var key = cmd.toLowerCase();
      if (CMDS[key]) { CMDS[key](); }
      else if (key === 'echo' || key.indexOf('echo ') === 0) {
        print(escapeHtml(cmd.slice(5)) || '');
      } else {
        print('<span class="warn">commande inconnue :</span> ' + escapeHtml(cmd));
        print('<span class="dim">tape « help » — je ne suis pas bash, je suis moi.</span>');
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value;
      input.value = '';
      if (v.trim()) { hist.unshift(v); hi = -1; }
      run(v);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!hist.length) return;
        hi = Math.min(hi + 1, hist.length - 1);
        input.value = hist[hi];
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        hi = Math.max(hi - 1, -1);
        input.value = hi === -1 ? '' : hist[hi];
      }
    });

    $$('#term-suggest button').forEach(function (b) {
      b.addEventListener('click', function () {
        run(b.dataset.cmd || 'help');
        input.focus();
      });
    });

    // cliquer dans la console rend le focus au champ
    $('#term-wrap').addEventListener('click', function (e) {
      if (e.target.closest('button, a, input')) return;
      if (!window.getSelection().toString()) input.focus({ preventScroll: true });
    });
  })();

  /* ======================================================================
     9. Visualisation de la mémoire
     ====================================================================== */
  (function memViz() {
    var cv = $('#memcanvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var raf = null, t = 0, running = true;

    function fit() {
      var r = cv.getBoundingClientRect();
      cv.width = Math.floor(r.width * dpr);
      cv.height = Math.floor(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return r;
    }

    // points disposés en spirale : l'index, vu de haut
    var nodes = [];
    var N = 130;
    for (var i = 0; i < N; i++) {
      var a = i * 2.39996;
      var rad = Math.sqrt(i / N);
      nodes.push({ a: a, r: rad, s: 0.6 + Math.random() * 1.1, ph: Math.random() * 6.28 });
    }

    function draw() {
      var r = cv.getBoundingClientRect();
      var W = r.width, H = r.height;
      var cxp = W / 2, cyp = H / 2 - 8;
      var R = Math.min(W, H) * 0.40;
      ctx.clearRect(0, 0, W, H);
      t += 0.008;

      // anneaux
      for (var k = 1; k <= 3; k++) {
        ctx.beginPath();
        ctx.arc(cxp, cyp, R * (k / 3), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(70,240,192,' + (0.07 - k * 0.012).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // positions
      var pos = nodes.map(function (n) {
        var ang = n.a + t * (0.16 + n.r * 0.25);
        var rr = n.r * R * (1 + Math.sin(t * 1.6 + n.ph) * 0.025);
        return { x: cxp + Math.cos(ang) * rr, y: cyp + Math.sin(ang) * rr, s: n.s, r: n.r };
      });

      // liens vers le centre et entre voisins
      for (var i2 = 0; i2 < pos.length; i2++) {
        var p = pos[i2];
        ctx.beginPath();
        ctx.moveTo(cxp, cyp);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = 'rgba(70,240,192,' + (0.05 + (1 - p.r) * 0.06).toFixed(3) + ')';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        var q = pos[(i2 * 7) % pos.length];
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = 'rgba(143,125,255,0.045)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // noyau
      var pulse = 4 + Math.sin(t * 2.2) * 1.4;
      var g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, 46);
      g.addColorStop(0, 'rgba(70,240,192,0.55)');
      g.addColorStop(1, 'rgba(70,240,192,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cxp, cyp, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cxp, cyp, pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#8dffe0';
      ctx.fill();

      // nœuds
      for (var j = 0; j < pos.length; j++) {
        var n2 = pos[j];
        var fade = Math.sin(t * 1.4 + j) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(n2.x, n2.y, n2.s, 0, Math.PI * 2);
        ctx.fillStyle = j % 9 === 0
          ? 'rgba(143,125,255,' + (0.35 + fade * 0.4).toFixed(2) + ')'
          : 'rgba(70,240,192,' + (0.25 + fade * 0.5).toFixed(2) + ')';
        ctx.fill();
      }

      if (running) raf = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', function () { fit(); }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; draw(); }
    });

    fit();
    if (REDUCED) { draw(); running = false; } else { draw(); }
  })();

  /* ======================================================================
     10. Ancrage : décalage sous la barre fixe
     ====================================================================== */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: top, behavior: REDUCED ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

})();
