/**
 * Main page logic: mobile navigation, active-section tracking, lightbox triggers,
 * keyboard access for gallery photos, back-to-top control and toast notifications.
 */

// Toast Notifications Helper (public contract: window.showToast(message, type))
window.showToast = function (message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span aria-hidden="true">${type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️')}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initActiveNav();
  initLightboxTriggers();
  initBackToTop();
});

/* ---------- Mobile menu ---------- */
function initMobileMenu() {
  const toggle = document.getElementById('navMobileToggle');
  const navLinks = document.getElementById('navLinks');
  if (!toggle || !navLinks) return;

  const mobileQuery = window.matchMedia('(max-width: 768px)');
  const isOpen = () => navLinks.classList.contains('mobile-open');

  const setOpen = (open, { returnFocus = false } = {}) => {
    navLinks.classList.toggle('mobile-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('nav-open', open);
    if (open) navLinks.querySelector('.nav-link')?.focus({ preventScroll: true });
    else if (returnFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => { if (isOpen()) setOpen(false); });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) setOpen(false, { returnFocus: true });
  });

  document.addEventListener('click', event => {
    if (!isOpen()) return;
    if (!navLinks.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });

  // Close when focus leaves the open menu (e.g. tabbing past the last link).
  navLinks.addEventListener('focusout', event => {
    if (isOpen() && event.relatedTarget && !navLinks.contains(event.relatedTarget) && !toggle.contains(event.relatedTarget)) {
      setOpen(false);
    }
  });

  const onBreakpoint = () => { if (!mobileQuery.matches && isOpen()) setOpen(false); };
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onBreakpoint);
  else if (mobileQuery.addListener) mobileQuery.addListener(onBreakpoint);
}

/* ---------- Active navigation link ---------- */
function initActiveNav() {
  const navItems = Array.from(document.querySelectorAll('#navLinks .nav-link[href^="#"]'));
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  if (!navItems.length || !sections.length || !('IntersectionObserver' in window)) return;

  const setActive = id => {
    navItems.forEach(link => {
      const match = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', match);
      if (match) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  // A thin detection band just below the fixed header: works for sections of any height.
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-90px 0px -65% 0px', threshold: 0 });

  sections.forEach(section => observer.observe(section));
}

/* ---------- Lightbox triggers (replace inline onclick handlers) ---------- */
// js/lightbox.js owns the dialog itself (focus trap, Escape, inert background, refocusing
// the trigger on close). This only wires declarative triggers and keyboard access.
function initLightboxTriggers() {
  document.addEventListener('click', event => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-lightbox-image]') : null;
    if (!trigger || !window.lightbox || typeof window.lightbox.open !== 'function') return;
    event.preventDefault();
    window.lightbox.open({
      title: trigger.dataset.lightboxTitle || '',
      issuer: trigger.dataset.lightboxIssuer || '',
      image: trigger.dataset.lightboxImage
    }, { trigger });
  });

  // Gallery photos are opened by js/lightbox.js on click; make Enter/Space do the same.
  document.querySelectorAll('.gallery-item[role="button"]').forEach(item => {
    item.addEventListener('keydown', event => {
      if (event.target !== item) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        item.click();
      }
    });
  });
}

/* ---------- Back to top ---------- */
function initBackToTop() {
  const button = document.getElementById('backToTop');
  if (!button) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    button.classList.toggle('is-visible', window.scrollY > window.innerHeight * 1.2);
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });
  update();

  button.addEventListener('click', event => {
    event.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    // Move keyboard focus back to the start of the page without jumping.
    document.getElementById('main')?.focus({ preventScroll: true });
  });
}
