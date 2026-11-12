/**
 * Small shared helpers for the secondary pages (classic script, no modules).
 *
 * - PageUtils.escapeHTML(value): escapes text for HTML text and attribute contexts.
 * - PageUtils.html`...`: tagged template; every interpolated value is escaped unless it
 *   was produced by another html`` call (or PageUtils.raw). Arrays are joined.
 * - PageUtils.render(element, markup): replaces an element's content with html`` markup.
 * - PageUtils.setMeta(name, content): updates <meta name|property="..."> in <head>.
 */
(() => {
  const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, char => ENTITIES[char]);
  }

  class SafeHTML {
    constructor(value) {
      this.value = value;
    }

    toString() {
      return this.value;
    }
  }

  function toMarkup(value) {
    if (value instanceof SafeHTML) return value.value;
    if (Array.isArray(value)) return value.map(toMarkup).join('');
    if (value === false || value === null || value === undefined) return '';
    return escapeHTML(value);
  }

  function html(strings, ...values) {
    let out = strings[0];
    values.forEach((value, index) => {
      out += toMarkup(value) + strings[index + 1];
    });
    return new SafeHTML(out);
  }

  /** Marks trusted, already-escaped markup. Never pass data from JSON here. */
  function raw(markup) {
    return new SafeHTML(String(markup));
  }

  function render(element, markup) {
    if (!element) return;
    element.innerHTML = toMarkup(markup);
  }

  function setMeta(name, content) {
    if (content === undefined || content === null) return;
    const isProperty = name.startsWith('og:');
    const attribute = isProperty ? 'property' : 'name';
    let meta = document.head.querySelector(`meta[${attribute}="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', String(content));
  }

  /** Runs a callback once the DOM is parsed, whether or not the script was deferred. */
  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  window.PageUtils = Object.freeze({ escapeHTML, html, raw, render, setMeta, onReady });
})();
