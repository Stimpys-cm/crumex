/* INMOBILIARIA CRUMEX · movimiento
   1) Entrada de la portada: va en CSS (site.css, "movimiento"): la retícula aparece, la cota se dibuja y el texto entra escalonado.
   2) Al bajar, los bloques aparecen una sola vez con un desplazamiento corto (clase .rv).
   3) Fotos con fundido corto al cargar.
   Con "reducir movimiento" activado en el sistema, o sin IntersectionObserver, todo se ve quieto desde el principio. */
(function () {
  'use strict';
  const root = document.documentElement;
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const canMove = !reduce && 'IntersectionObserver' in window;

  // ── fotos con fundido ──
  const fade = (img) => {
    if (img.dataset.fd) return; img.dataset.fd = 1;
    const ok = () => img.classList.add('ok');
    if (img.complete && img.naturalWidth) ok(); else { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', ok, { once: true }); }
  };

  // ── revelados al bajar ──
  const TARGETS = '.sec-h, .why-h, .ledger > div, .cards > .card, .rail > .card, .steps > li, .zgrid > *, .faq > details, .ot-wants > *, .card-form, .fc-copy, .about > *, .quotes > *, #articles > *';
  let io = null;
  const watch = () => {
    if (!io) return;
    document.querySelectorAll(TARGETS).forEach((el) => {
      if (el.dataset.rv) return; el.dataset.rv = '1';
      // lo que ya está a la vista al cargar no se esconde
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.92 && r.bottom > 0) return;
      const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(TARGETS)) : [];
      el.style.setProperty('--rd', Math.min(Math.max(sibs.indexOf(el), 0), 4) * 70 + 'ms');
      el.classList.add('rv'); io.observe(el);
    });
  };

  const scan = () => { document.querySelectorAll('img.fade').forEach(fade); watch(); };
  const start = () => {
    if (canMove) {
      io = new IntersectionObserver((list) => list.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rv-on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    }
    scan();
    let t = null;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 60); }).observe(document.body, { childList: true, subtree: true });
  };

  if (canMove) root.classList.add('mv');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.CRX_MOTION = { scan };
})();
