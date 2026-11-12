/**
 * Theme handling (shared by every page).
 * Loaded render-blocking in <head> so the theme is applied before first paint.
 * Stored choice (localStorage `theme`) wins; otherwise the OS preference is followed.
 */
(() => {
  const storageKey = 'theme';
  const root = document.documentElement;
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const themeColors = { light: '#f7f6f1', dark: '#111b25' };

  // Both icons are rendered; CSS shows the moon in the light theme and the sun in the dark theme.
  const icons = {
    moon: '<svg class="icon-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>',
    sun: '<svg class="icon-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>'
  };

  function readStored() {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (_) {
      // Private browsing and local file previews may disable localStorage.
    }
    return null;
  }

  function systemTheme() {
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }

  function updateControls(value) {
    const icon = document.getElementById('themeIcon');
    const button = document.getElementById('themeToggleBtn');
    if (icon) {
      if (!icon.querySelector('.icon-moon')) icon.innerHTML = icons.moon + icons.sun;
      icon.setAttribute('aria-hidden', 'true');
    }
    if (button) {
      const next = value === 'light' ? 'тёмную' : 'светлую';
      if (!button.hasAttribute('type')) button.setAttribute('type', 'button');
      button.setAttribute('aria-label', `Включить ${next} тему`);
      button.title = `Включить ${next} тему`;
    }
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
      meta.setAttribute('content', themeColors[value]);
    });
  }

  function applyTheme(theme, persist = false) {
    const value = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', value);
    if (persist) {
      try { localStorage.setItem(storageKey, value); } catch (_) {}
    }
    updateControls(value);
  }

  // Apply before the stylesheets render so the selected theme stays consistent between pages.
  applyTheme(readStored() || systemTheme());

  // Follow OS changes only while the visitor has not chosen a theme explicitly.
  if (darkQuery) {
    const onSystemChange = () => { if (!readStored()) applyTheme(systemTheme()); };
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', onSystemChange);
    else if (darkQuery.addListener) darkQuery.addListener(onSystemChange);
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateControls(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark', true);
    });
  });
})();
