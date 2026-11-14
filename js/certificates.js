/**
 * Certificates gallery (certificates.html).
 *
 * - Category filter buttons (aria-pressed) and text search (?q= is read on load and kept in sync).
 * - Cards are <button>s that open the shared lightbox with previous/next navigation
 *   across the currently visible certificates.
 * - Deep links: certificates.html#<certificate id> opens that certificate; the hash follows
 *   the open certificate and is removed when the lightbox closes.
 */
(() => {
  const { html, raw, render, onReady } = window.PageUtils;
  const SEARCH_DELAY = 150;
  const ZOOM_ICON = raw('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5"/></svg>');

  function searchableText(cert) {
    return [cert.title, cert.issuer, cert.description, cert.award, cert.year, (cert.skills || []).join(' ')]
      .join(' ')
      .toLowerCase();
  }

  function domId(prefix, id) {
    return `${prefix}-${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  function cardTemplate(cert) {
    const titleId = domId('cert-title', cert.id);
    const issuerId = domId('cert-issuer', cert.id);
    return html`
      <button type="button" class="certificate-card cert-card-button" data-id="${cert.id}"
        aria-haspopup="dialog" aria-labelledby="${titleId}" aria-describedby="${issuerId}">
        <span class="cert-thumb-wrap">
          <img class="cert-thumb" src="${cert.thumbnail || cert.image}" alt="" width="800" height="600"
            loading="lazy" decoding="async">
          ${cert.year ? html`<span class="cert-year-badge">${cert.year}</span>` : ''}
          <span class="cert-zoom" aria-hidden="true">${ZOOM_ICON}</span>
        </span>
        <span class="cert-body">
          <span class="cert-category-text">${cert.categoryLabel || 'Сертификат'}</span>
          <span class="cert-title" id="${titleId}">${cert.title}</span>
          <span class="cert-issuer" id="${issuerId}">${cert.issuer}</span>
          ${cert.award ? html`<span class="cert-award-pill">${cert.award}</span>` : ''}
          <span class="cert-description-preview">${cert.description}</span>
        </span>
      </button>`;
  }

  class CertificateManager {
    constructor() {
      this.certificates = [];
      this.visible = [];
      this.category = 'all';
      this.query = '';
      this.searchTimer = 0;
      this.currentId = null;
      this.grid = document.getElementById('certificatesGrid');
      this.search = document.getElementById('certSearch');
      this.filters = Array.from(document.querySelectorAll('.cert-filter-btn'));
    }

    async init() {
      if (!this.grid) return;
      const initialQuery = new URLSearchParams(location.search).get('q') || '';
      this.query = initialQuery.toLowerCase().trim();
      if (this.search) this.search.value = initialQuery;
      this.grid.setAttribute('aria-busy', 'true');

      try {
        const data = await window.loadPortfolioData('certificates', 'data/certificates.json');
        this.certificates = Array.isArray(data) ? data.filter(cert => cert && cert.id) : [];
      } catch (error) {
        console.error(error);
        render(this.grid, html`<p class="empty-state">Не удалось загрузить сертификаты.</p>`);
        this.grid.setAttribute('aria-busy', 'false');
        return;
      }

      this.bindControls();
      this.syncFilterButtons();
      this.render();
      this.grid.setAttribute('aria-busy', 'false');
      this.openFromHash();
      window.addEventListener('hashchange', () => this.openFromHash());
    }

    bindControls() {
      this.search?.addEventListener('input', event => {
        window.clearTimeout(this.searchTimer);
        const value = event.target.value;
        this.searchTimer = window.setTimeout(() => {
          this.query = value.toLowerCase().trim();
          this.updateQueryParam(value.trim());
          this.render();
        }, SEARCH_DELAY);
      });

      this.filters.forEach(button => {
        button.setAttribute('type', 'button');
        button.addEventListener('click', () => {
          this.category = button.dataset.category || 'all';
          this.syncFilterButtons();
          this.render();
        });
      });

      this.grid.addEventListener('click', event => {
        const card = event.target instanceof Element ? event.target.closest('.cert-card-button') : null;
        if (card) this.openCertificate(card.dataset.id, card);
      });
    }

    syncFilterButtons() {
      this.filters.forEach(button => {
        const isActive = (button.dataset.category || 'all') === this.category;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
    }

    updateQueryParam(value) {
      const url = new URL(location.href);
      if (value) url.searchParams.set('q', value);
      else url.searchParams.delete('q');
      try {
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      } catch (_) {
        // Some file:// contexts reject history updates; the filter still works.
      }
    }

    matches(cert) {
      const categoryOk = this.category === 'all' || cert.category === this.category;
      return categoryOk && (!this.query || searchableText(cert).includes(this.query));
    }

    render() {
      this.visible = this.certificates.filter(cert => this.matches(cert));
      if (!this.visible.length) {
        render(this.grid, html`<p class="empty-state" role="status">По запросу ничего не найдено.</p>`);
        return;
      }
      render(this.grid, this.visible.map(cardTemplate));
    }

    cardFor(id) {
      return Array.from(this.grid.querySelectorAll('.cert-card-button')).find(card => card.dataset.id === id) || null;
    }

    openCertificate(id, trigger) {
      const cert = this.certificates.find(item => item.id === id);
      if (!cert || !window.lightbox) return;
      // Navigate within the visible cards; a deep-linked hidden certificate navigates within all.
      const items = this.visible.includes(cert) ? this.visible : this.certificates;
      window.lightbox.open(cert, {
        trigger: trigger || this.cardFor(id),
        items,
        index: items.indexOf(cert),
        onChange: item => {
          this.currentId = item.id;
          this.setHash(item.id);
          return this.cardFor(item.id);
        },
        onClose: () => {
          this.currentId = null;
          this.setHash('');
        }
      });
      this.currentId = cert.id;
      this.setHash(cert.id);
    }

    setHash(id) {
      const target = id ? `#${encodeURIComponent(id)}` : '';
      if (location.hash === target || (!id && !location.hash)) return;
      try {
        history.replaceState(history.state, '', location.pathname + location.search + target);
      } catch (_) {
        // Ignore: deep links are a convenience only.
      }
    }

    openFromHash() {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) {
        if (window.lightbox?.isOpen) window.lightbox.close();
        return;
      }
      if (window.lightbox?.isOpen && id === this.currentId) return;
      if (this.certificates.some(cert => cert.id === id)) this.openCertificate(id);
    }
  }

  onReady(() => {
    window.certManager = new CertificateManager();
    window.certManager.init();
  });
})();
