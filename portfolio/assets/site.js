/* Portfolio NG TECH — comportements minimaux, sans dépendance. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- barre supérieure : bordure à partir du premier défilement --- */
  var topbar = document.querySelector('.topbar');
  var onScroll = function () {
    if (!topbar) return;
    topbar.classList.toggle('stuck', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- menu mobile --- */
  var burger = document.getElementById('burger');
  var panel = document.getElementById('mobile-nav');
  if (burger && panel) {
    var setOpen = function (open) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      panel.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    panel.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setOpen(false);
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) setOpen(false);
    });
  }

  /* --- apparition au défilement --- */
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var siblings = items.filter(function (s) { return s.parentElement === el.parentElement; });
      var idx = siblings.indexOf(el);
      el.style.transitionDelay = Math.max(0, Math.min(idx, 5)) * 55 + 'ms';
      el.classList.add('in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach(function (el) { io.observe(el); });

  /* --- survol des travaux : léger décalage du titre --- */
  document.querySelectorAll('.work').forEach(function (w) {
    w.addEventListener('mouseenter', function () { w.classList.add('hovered'); });
    w.addEventListener('mouseleave', function () { w.classList.remove('hovered'); });
  });

  /* --- année du pied de page --- */
  var foot = document.querySelector('.foot .shell span');
  if (foot) {
    var y = new Date().getFullYear();
    foot.textContent = foot.textContent.replace(/©\s*\d{4}/, '© ' + y);
  }
})();
