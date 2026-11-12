(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) return;

  const selectors = [
    '.metric-card', '.project-card', '.recommendation-card', '.olympiad-card',
    '.mission-card', '.mission-item', '.gallery-item', '.media-card', '.cv-preview-card',
    '.detail-panel', '.experience-entry', '.certificate-card',
    '.section-header > .section-tag', '.section-header > .section-title', '.section-header > .section-subtitle',
    '.projects-filter-bar', '.filter-btn', '.cert-gallery-tools', '.cert-filter-row', '.cert-filter-btn',
    '.detail-page > .back-link', '.detail-page > .detail-kicker', '.detail-page > h1', '.detail-page > .detail-lead',
    '.detail-actions > *', '.cv-info > *', '.footer-brand > *', '.footer-brand .social-link', '.contact-direct > *', '.footer-bottom',
    '.navbar .nav-brand', '.nav-links > li', '.page-nav > a', '.nav-actions > *'
  ].join(',');
  const observed = new WeakSet();
  const groupIndexes = new WeakMap();
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.12 });

  document.documentElement.classList.add('motion-ready');

  const progress = document.createElement('div');
  progress.id = 'scrollProgress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);

  function updateOrbitRadius() {
    const visual = document.querySelector('.hero-visual');
    if (!visual) return;
    const ringSize = Math.min(visual.getBoundingClientRect().width * 1.16, 470);
    document.documentElement.style.setProperty('--orbit-radius', `${Math.max(70, ringSize / 2 - 5)}px`);
  }
  updateOrbitRadius();
  window.addEventListener('resize', updateOrbitRadius, { passive: true });

  let scrollFrame = 0;
  function updateProgress() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      const page = document.documentElement;
      const maxScroll = page.scrollHeight - window.innerHeight;
      const amount = maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0;
      page.style.setProperty('--scroll-progress', amount);
      scrollFrame = 0;
    });
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  function reveal(element) {
    if (!(element instanceof Element) || observed.has(element) || !element.matches(selectors)) return;
    observed.add(element);
    const group = element.parentElement;
    const index = groupIndexes.get(group) || 0;
    groupIndexes.set(group, index + 1);
    element.style.setProperty('--reveal-delay', `${(index % 5) * 65}ms`);
    element.classList.add('reveal');
    revealObserver.observe(element);
  }

  function scan(root) {
    if (root instanceof Element) reveal(root);
    root.querySelectorAll?.(selectors).forEach(reveal);
  }

  scan(document);
  const contentObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => scan(node)));
  });
  contentObserver.observe(document.body, { childList: true, subtree: true });

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let pendingPointer = null;
    let pointerFrame = 0;
    document.addEventListener('pointermove', event => {
      pendingPointer = event;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!pendingPointer) return;
        const point = pendingPointer;
        const hero = point.target instanceof Element ? point.target.closest('.hero-section') : null;
        if (hero) {
          const rect = hero.getBoundingClientRect();
          hero.style.setProperty('--spot-x', `${((point.clientX - rect.left) / rect.width) * 100}%`);
          hero.style.setProperty('--spot-y', `${((point.clientY - rect.top) / rect.height) * 100}%`);
        }

        const card = point.target instanceof Element ? point.target.closest('.project-card') : null;
        if (card) {
          const rect = card.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (point.clientX - rect.left) / rect.width));
          const y = Math.max(0, Math.min(1, (point.clientY - rect.top) / rect.height));
          card.style.setProperty('--tilt-x', `${(x - .5) * 5}deg`);
          card.style.setProperty('--tilt-y', `${(.5 - y) * 5}deg`);
          card.style.setProperty('--shine-x', `${x * 100}%`);
          card.style.setProperty('--shine-y', `${y * 100}%`);
        }
        pendingPointer = null;
      });
    }, { passive: true });

    document.addEventListener('pointerout', event => {
      const from = event.target instanceof Element ? event.target.closest('.project-card, .hero-section') : null;
      if (from && (!event.relatedTarget || !from.contains(event.relatedTarget))) {
        if (from.matches('.project-card')) {
          from.style.setProperty('--tilt-x', '0deg');
          from.style.setProperty('--tilt-y', '0deg');
          from.style.setProperty('--shine-x', '50%');
          from.style.setProperty('--shine-y', '0%');
        } else {
          from.style.setProperty('--spot-x', '76%');
          from.style.setProperty('--spot-y', '26%');
        }
      }
    }, { passive: true });
  }
})();
