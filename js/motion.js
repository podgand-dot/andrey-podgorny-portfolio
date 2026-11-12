/**
 * Motion layer (shared by every page).
 *
 * Reveal-on-scroll is strictly progressive enhancement:
 * - nothing is hidden unless this script runs and the browser supports IntersectionObserver;
 * - elements already above or inside the viewport are never hidden;
 * - a generous rootMargin, a scroll check and a periodic fail-safe make sure
 *   nothing stays invisible after fast scrolling, anchor jumps or background tabs;
 * - prefers-reduced-motion disables all of it.
 * Only transform/opacity are animated.
 */
(() => {
  const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reducedMotion = !!(motionQuery && motionQuery.matches);
  const root = document.documentElement;

  /* ---------- Scroll progress bar (cheap: one transform per frame) ---------- */
  function initProgress() {
    if (reducedMotion || document.getElementById('scrollProgress')) return;
    const progress = document.createElement('div');
    progress.id = 'scrollProgress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.prepend(progress);

    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const maxScroll = root.scrollHeight - window.innerHeight;
        const amount = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
        progress.style.transform = `scaleX(${amount})`;
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------- Hero orbit radius (only on pages that have a hero) ---------- */
  function initOrbit() {
    const visual = document.querySelector('.hero-visual');
    if (!visual) return;
    let last = 0;
    const update = () => {
      const ringSize = Math.min(visual.getBoundingClientRect().width * 1.16, 470);
      const radius = Math.round(Math.max(70, ringSize / 2 - 5));
      if (radius !== last) {
        last = radius;
        root.style.setProperty('--orbit-radius', `${radius}px`);
      }
    };
    update();
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(visual);
    else window.addEventListener('resize', update, { passive: true });
  }

  /* ---------- Reveal on scroll ---------- */
  const selectors = [
    '.metric-card', '.project-card', '.recommendation-card', '.olympiad-card',
    '.mission-card', '.gallery-item', '.media-card', '.cv-preview-card',
    '.detail-panel', '.experience-entry', '.certificate-card',
    '.section-header > .section-tag', '.section-header > .section-title', '.section-header > .section-subtitle',
    '.projects-filter-bar', '.cert-gallery-tools',
    '.detail-page > .back-link', '.detail-page > .detail-kicker', '.detail-page > h1', '.detail-page > .detail-lead',
    '.detail-actions', '.footer-brand', '.contact-direct'
  ].join(',');

  function initReveal() {
    if (reducedMotion || !('IntersectionObserver' in window)) return;

    const pending = new Set();
    const groupIndexes = new WeakMap();
    const seen = new WeakSet();

    const show = element => {
      if (!pending.delete(element)) return;
      element.classList.add('is-visible');
      revealObserver.unobserve(element);
    };

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) show(entry.target); });
    }, { rootMargin: '0px 0px 12% 0px', threshold: 0 });

    // Reveals everything that is in, near or above the viewport. Used after scrolls,
    // anchor jumps, tab switches and as a periodic fail-safe.
    const sweep = () => {
      if (!pending.size) return;
      const limit = window.innerHeight * 1.15;
      pending.forEach(element => {
        if (!element.isConnected) { pending.delete(element); return; }
        if (element.getBoundingClientRect().top < limit) show(element);
      });
    };

    const register = element => {
      if (seen.has(element)) return;
      seen.add(element);
      // Already visible or above the fold: never hide it.
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 || element.closest('.navbar, .hero-section')) return;

      const group = element.parentElement;
      const index = groupIndexes.get(group) || 0;
      groupIndexes.set(group, index + 1);
      element.style.setProperty('--reveal-delay', `${(index % 4) * 60}ms`);
      element.classList.add('reveal');
      pending.add(element);
      revealObserver.observe(element);
    };

    const scan = node => {
      if (!(node instanceof Element)) return;
      if (node.matches(selectors)) register(node);
      node.querySelectorAll(selectors).forEach(register);
    };

    scan(document.body);
    // Hiding starts only now, after everything in view has been excluded.
    root.classList.add('motion-ready');

    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(scan));
    }).observe(document.body, { childList: true, subtree: true });

    let sweepTimer = 0;
    const scheduleSweep = () => {
      if (sweepTimer) return;
      sweepTimer = window.setTimeout(() => { sweepTimer = 0; sweep(); }, 120);
    };
    window.addEventListener('scroll', scheduleSweep, { passive: true });
    window.addEventListener('hashchange', sweep);
    window.addEventListener('resize', scheduleSweep, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sweep(); });
    // Fail-safe: even if observers are throttled (background tabs, slow devices),
    // anything in or above the viewport becomes visible within a second.
    window.setInterval(() => { if (!document.hidden) sweep(); }, 1000);
    // Printing or saving the page must always include every element.
    window.addEventListener('beforeprint', () => { pending.forEach(show); });
  }

  /* ---------- Pointer effects (fine pointers only) ---------- */
  function initPointerEffects() {
    if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const hero = document.querySelector('.hero-section');
    let spotlight = null;
    if (hero) {
      spotlight = document.createElement('div');
      spotlight.className = 'hero-spotlight';
      spotlight.setAttribute('aria-hidden', 'true');
      hero.prepend(spotlight);
    }

    let pendingPointer = null;
    let frame = 0;
    document.addEventListener('pointermove', event => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pendingPointer = event;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const point = pendingPointer;
        pendingPointer = null;
        if (!point || !(point.target instanceof Element)) return;

        if (spotlight && hero.contains(point.target)) {
          const rect = hero.getBoundingClientRect();
          // The spotlight rests at 76% / 26% of the hero; move it with a compositor-only transform.
          const dx = point.clientX - rect.left - rect.width * 0.76;
          const dy = point.clientY - rect.top - rect.height * 0.26;
          spotlight.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
        }

        const card = point.target.closest('.project-card');
        if (card) {
          const rect = card.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (point.clientX - rect.left) / rect.width));
          const y = Math.max(0, Math.min(1, (point.clientY - rect.top) / rect.height));
          card.style.setProperty('--tilt-x', `${((x - 0.5) * 4).toFixed(2)}deg`);
          card.style.setProperty('--tilt-y', `${((0.5 - y) * 4).toFixed(2)}deg`);
          card.style.setProperty('--shine-x', `${(x * 100).toFixed(1)}%`);
          card.style.setProperty('--shine-y', `${(y * 100).toFixed(1)}%`);
        }
      });
    }, { passive: true });

    document.addEventListener('pointerout', event => {
      const from = event.target instanceof Element ? event.target.closest('.project-card, .hero-section') : null;
      if (!from || (event.relatedTarget && from.contains(event.relatedTarget))) return;
      if (from.matches('.project-card')) {
        from.style.setProperty('--tilt-x', '0deg');
        from.style.setProperty('--tilt-y', '0deg');
        from.style.setProperty('--shine-x', '50%');
        from.style.setProperty('--shine-y', '0%');
      } else if (spotlight) {
        spotlight.style.transform = '';
      }
    }, { passive: true });
  }

  function init() {
    initProgress();
    initOrbit();
    initReveal();
    initPointerEffects();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
