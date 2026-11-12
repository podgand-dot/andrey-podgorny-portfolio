(() => {
  const storageKey = 'theme';
  let savedTheme = 'light';

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark') savedTheme = stored;
  } catch (_) {
    // Private browsing and local file previews may disable localStorage.
  }

  function applyTheme(theme, persist = false) {
    const value = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', value);
    savedTheme = value;

    if (persist) {
      try { localStorage.setItem(storageKey, value); } catch (_) {}
    }

    const icon = document.getElementById('themeIcon');
    const button = document.getElementById('themeToggleBtn');
    if (icon) icon.textContent = value === 'light' ? '🌙' : '☀️';
    if (button) {
      const next = value === 'light' ? 'тёмную' : 'светлую';
      button.setAttribute('aria-label', `Включить ${next} тему`);
      button.title = `Включить ${next} тему`;
    }
  }

  // Apply before the stylesheets render so the selected theme stays consistent between pages.
  applyTheme(savedTheme);

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') || savedTheme);
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark', true);
    });
  });
})();
