/**
 * window.loadPortfolioData(key, url) -> Promise<Array>
 *
 * Loads a JSON array from `url`. When that fails (for example when a page is opened
 * from disk via file://, where fetch is blocked), it falls back to
 * window.PORTFOLIO_DATA[key] from data/portfolio-data.js. Pages may include that file
 * themselves; if they do not, it is loaded on demand only when the fallback is needed.
 */
(() => {
  const thisScript = document.currentScript;
  const fallbackUrl = thisScript && thisScript.src
    ? new URL('../data/portfolio-data.js', thisScript.src).href
    : 'data/portfolio-data.js';
  let fallbackPromise = null;

  function loadFallbackScript() {
    if (window.PORTFOLIO_DATA) return Promise.resolve(window.PORTFOLIO_DATA);
    if (!fallbackPromise) {
      fallbackPromise = new Promise(resolve => {
        const script = document.createElement('script');
        script.src = fallbackUrl;
        script.async = true;
        script.onload = () => resolve(window.PORTFOLIO_DATA || null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      });
    }
    return fallbackPromise;
  }

  window.loadPortfolioData = async function loadPortfolioData(key, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Не удалось загрузить ${url}: ${response.status}`);
      return await response.json();
    } catch (error) {
      const data = await loadFallbackScript();
      const fallback = data && data[key];
      if (Array.isArray(fallback)) return fallback;
      throw error;
    }
  };
})();
