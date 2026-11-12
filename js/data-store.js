window.loadPortfolioData = async function (key, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Не удалось загрузить ${url}: ${response.status}`);
    return await response.json();
  } catch (error) {
    const fallback = window.PORTFOLIO_DATA && window.PORTFOLIO_DATA[key];
    if (Array.isArray(fallback)) return fallback;
    throw error;
  }
};
