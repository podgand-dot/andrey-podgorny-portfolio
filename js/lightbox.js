/**
 * Document lightbox shared by index.html and certificates.html.
 *
 * Markup contract (ids inside #lightboxModal; everything except the modal is optional):
 *   #lightboxModal, #lightboxImg, #lightboxFrame, #lightboxTitle, #lightboxSub,
 *   #lightboxDescription, #lightboxAward, #lightboxDownloadBtn, #lightboxCloseBtn,
 *   #lightboxPrevBtn, #lightboxNextBtn.
 *
 * Public API (backward compatible):
 *   window.lightbox.open(data[, options])
 *     data:    { title, issuer, year, description, award, image }  (image may be a same-origin PDF)
 *     options: { trigger: Element to refocus on close (defaults to the focused element),
 *                items: Array<data> and index: Number for previous/next navigation,
 *                onChange(item, index): called after navigating; may return a new trigger Element,
 *                onClose(): called after the lightbox has closed }
 *   window.lightbox.close()
 *   window.lightbox.next() / window.lightbox.prev()
 *   window.lightbox.isOpen  (read-only)
 */
(() => {
  const PDF_PATTERN = /\.pdf($|[?#])/i;
  const FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
    'textarea:not([disabled])', 'iframe', '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  const CLEAR_DELAY = 320; // matches the backdrop fade-out in style.css

  function isVisible(element) {
    return !element.hidden && element.getClientRects().length > 0
      && getComputedStyle(element).visibility !== 'hidden';
  }

  function fileExtension(url) {
    const path = String(url).split(/[?#]/)[0];
    return (path.match(/\.[a-z0-9]{2,5}$/i) || [''])[0].toLowerCase();
  }

  function downloadName(title, url) {
    const base = String(title || '')
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/^[\s.-]+|[\s.-]+$/g, '')
      .slice(0, 120)
      .trim();
    return (base || 'certificate') + fileExtension(url);
  }

  class Lightbox {
    constructor() {
      this.modal = document.getElementById('lightboxModal');
      this.active = false;
      this.items = [];
      this.index = -1;
      this.options = {};
      this.trigger = null;
      this.inertElements = [];
      this.clearTimer = 0;
      if (!this.modal) return;

      const byId = id => document.getElementById(id);
      this.img = byId('lightboxImg');
      this.frame = byId('lightboxFrame');
      this.title = byId('lightboxTitle');
      this.sub = byId('lightboxSub');
      this.description = byId('lightboxDescription');
      this.award = byId('lightboxAward');
      this.download = byId('lightboxDownloadBtn');
      this.closeBtn = byId('lightboxCloseBtn');
      this.prevBtn = byId('lightboxPrevBtn');
      this.nextBtn = byId('lightboxNextBtn');
      this.mediaWrap = this.img?.closest('.lightbox-img-wrap') || this.frame?.closest('.lightbox-img-wrap') || null;

      this.prepareMarkup();
      this.bindEvents();
    }

    get isOpen() {
      return this.active;
    }

    prepareMarkup() {
      const modal = this.modal;
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      if (this.title && this.title.id) modal.setAttribute('aria-labelledby', this.title.id);
      if (this.description && this.description.id) modal.setAttribute('aria-describedby', this.description.id);
      if (!modal.hasAttribute('tabindex')) modal.tabIndex = -1;
      if (this.frame) this.frame.hidden = true;
      this.closeBtn?.setAttribute('type', 'button');
      this.prevBtn?.setAttribute('type', 'button');
      this.nextBtn?.setAttribute('type', 'button');
      this.updateNavButtons();
    }

    bindEvents() {
      this.closeBtn?.addEventListener('click', () => this.close());
      this.prevBtn?.addEventListener('click', () => this.prev());
      this.nextBtn?.addEventListener('click', () => this.next());

      // Clicking the dimmed backdrop (not the document or its details) closes the dialog.
      this.modal.addEventListener('click', event => {
        if (event.target === this.modal) this.close();
      });

      document.addEventListener('keydown', event => this.handleKeydown(event));

      this.img?.addEventListener('load', () => this.setLoading(false));
      this.img?.addEventListener('error', () => this.setLoading(false));
      this.frame?.addEventListener('load', () => this.setLoading(false));

      // index.html photo gallery: click (or Enter/Space when focusable) opens the photo.
      document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => this.openGalleryItem(item));
      });
    }

    openGalleryItem(item) {
      const img = item.querySelector('img');
      const caption = item.querySelector('.gallery-caption');
      if (img) this.open({ title: caption?.textContent || 'Фото', image: img.currentSrc || img.src }, { trigger: item });
    }

    handleKeydown(event) {
      if (!this.active) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      } else if (event.key === 'Tab') {
        this.trapFocus(event);
      } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && this.items.length > 1) {
        const target = event.target;
        if (target instanceof Element && target.matches('input, textarea, select')) return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') this.prev();
        else this.next();
      }
    }

    focusableElements() {
      return Array.from(this.modal.querySelectorAll(FOCUSABLE)).filter(isVisible);
    }

    trapFocus(event) {
      const focusable = this.focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        this.modal.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !this.modal.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !this.modal.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    }

    setLoading(isLoading) {
      if (!this.mediaWrap) return;
      this.mediaWrap.classList.toggle('is-loading', isLoading);
      this.mediaWrap.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }

    render(data) {
      const url = data.image || '';
      const isPdf = PDF_PATTERN.test(url);
      window.clearTimeout(this.clearTimer);
      this.setLoading(Boolean(url));

      if (this.frame) {
        this.frame.hidden = !isPdf;
        if (isPdf) {
          if (this.frame.getAttribute('src') !== url) this.frame.src = url;
          else this.setLoading(false);
        } else {
          this.frame.src = 'about:blank';
        }
      }
      if (this.img) {
        this.img.hidden = isPdf;
        this.img.alt = data.title || 'Документ';
        if (isPdf) {
          this.img.removeAttribute('src');
        } else if (this.img.getAttribute('src') !== url) {
          this.img.src = url;
          if (this.img.complete && this.img.naturalWidth) this.setLoading(false);
        } else {
          this.setLoading(false);
        }
      }

      if (this.title) this.title.textContent = data.title || '';
      if (this.sub) this.sub.textContent = [data.issuer, data.year || ''].filter(Boolean).join(' · ');
      if (this.description) {
        this.description.textContent = data.description || '';
        this.description.hidden = !data.description;
      }
      if (this.award) {
        this.award.textContent = data.award || '';
        this.award.style.display = data.award ? 'inline-block' : 'none';
      }
      if (this.download) {
        this.download.hidden = !url;
        this.download.href = url || '#';
        this.download.download = downloadName(data.title, url);
      }
      this.updateNavButtons();
    }

    updateNavButtons() {
      const hasNav = this.items.length > 1;
      [this.prevBtn, this.nextBtn].forEach(button => {
        if (button) button.hidden = !hasNav;
      });
    }

    open(data, options = {}) {
      if (!this.modal || !data) return;
      this.options = options || {};
      this.items = Array.isArray(this.options.items) ? this.options.items : [];
      this.index = this.items.length ? Math.max(0, Number(this.options.index) || 0) : -1;

      const wasOpen = this.active;
      if (!wasOpen) {
        const focused = document.activeElement;
        this.trigger = this.options.trigger || (focused && focused !== document.body ? focused : null);
      }
      this.render(data);
      if (wasOpen) return;

      this.active = true;
      this.lockScroll();
      this.setBackgroundInert(true);
      this.modal.classList.add('active');
      this.focusInside();
    }

    /** Moves focus into the dialog; retries until the backdrop has become visible. */
    focusInside(attempt = 0) {
      if (!this.active || this.modal.contains(document.activeElement)) return;
      const target = this.closeBtn && isVisible(this.closeBtn) ? this.closeBtn : this.modal;
      target.focus({ preventScroll: true });
      if (!this.modal.contains(document.activeElement) && attempt < 10) {
        window.setTimeout(() => this.focusInside(attempt + 1), 40);
      }
    }

    go(step) {
      if (!this.active || this.items.length < 2) return;
      this.index = (this.index + step + this.items.length) % this.items.length;
      const item = this.items[this.index];
      this.render(item);
      const newTrigger = typeof this.options.onChange === 'function' ? this.options.onChange(item, this.index) : null;
      if (newTrigger instanceof Element) this.trigger = newTrigger;
    }

    next() {
      this.go(1);
    }

    prev() {
      this.go(-1);
    }

    close() {
      if (!this.modal || !this.active) return;
      this.active = false;
      this.setBackgroundInert(false);
      this.unlockScroll();
      this.setLoading(false);

      // Stop PDF rendering immediately; clear the image after the fade-out.
      if (this.frame) this.frame.src = 'about:blank';
      window.clearTimeout(this.clearTimer);
      this.clearTimer = window.setTimeout(() => {
        if (this.active) return;
        if (this.img) this.img.removeAttribute('src');
        if (this.frame) this.frame.removeAttribute('src');
      }, CLEAR_DELAY);

      const trigger = this.trigger;
      const onClose = this.options.onClose;
      this.trigger = null;
      this.items = [];
      this.index = -1;
      this.options = {};
      if (trigger && trigger.isConnected && typeof trigger.focus === 'function') {
        trigger.focus({ preventScroll: true });
      } else if (this.modal.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      // Hide only after focus has left the dialog.
      this.modal.classList.remove('active');
      if (typeof onClose === 'function') onClose();
    }

    setBackgroundInert(inert) {
      if (inert) {
        this.inertElements = Array.from(document.body.children).filter(element =>
          element !== this.modal && !element.contains(this.modal) && !element.inert
          && !['SCRIPT', 'STYLE', 'TEMPLATE'].includes(element.tagName));
        this.inertElements.forEach(element => { element.inert = true; });
      } else {
        this.inertElements.forEach(element => { element.inert = false; });
        this.inertElements = [];
      }
    }

    lockScroll() {
      const root = document.documentElement;
      const scrollbar = Math.max(0, window.innerWidth - root.clientWidth);
      const body = document.body;
      this.savedScrollStyles = {
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight
      };
      body.style.overflow = 'hidden';
      if (scrollbar) {
        const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${current + scrollbar}px`;
        // Fixed headers span the viewport; compensate so they do not shift either.
        this.compensated = Array.from(document.querySelectorAll('.navbar')).map(element => {
          const previous = element.style.paddingRight;
          const padding = parseFloat(getComputedStyle(element).paddingRight) || 0;
          element.style.paddingRight = `${padding + scrollbar}px`;
          return { element, previous };
        });
      } else {
        this.compensated = [];
      }
    }

    unlockScroll() {
      const body = document.body;
      if (this.savedScrollStyles) {
        body.style.overflow = this.savedScrollStyles.overflow;
        body.style.paddingRight = this.savedScrollStyles.paddingRight;
      }
      (this.compensated || []).forEach(({ element, previous }) => {
        element.style.paddingRight = previous;
      });
      this.compensated = [];
    }
  }

  function init() {
    if (window.lightbox instanceof Lightbox) return;
    window.lightbox = new Lightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
