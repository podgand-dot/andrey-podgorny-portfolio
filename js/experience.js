/**
 * Work experience list (experience.html), rendered from data/experience.json.
 */
(() => {
  const { html, render, onReady } = window.PageUtils;

  function emptyTemplate() {
    return html`
      <div class="detail-panel empty-state experience-empty">
        <h2>Опыт работы и стажировок пока не добавлен</h2>
        <p>В доступном CV перечислены проектные кейсы, но нет подтверждённых записей о работодателях и датах работы. Проектная деятельность описана отдельно.</p>
      </div>`;
  }

  function entryTemplate(item) {
    const heading = [item.role, item.organization].filter(Boolean);
    const highlights = item.highlights || [];
    return html`
      <article class="experience-entry">
        ${item.period ? html`<div class="detail-kicker">${item.period}</div>` : ''}
        <h2>${heading.map((part, index) => html`${index ? ' · ' : ''}${part}`)}</h2>
        ${item.location ? html`<p>${item.location}</p>` : ''}
        ${item.summary ? html`<p>${item.summary}</p>` : ''}
        ${highlights.length ? html`<ul class="detail-list">${highlights.map(point => html`<li>${point}</li>`)}</ul>` : ''}
      </article>`;
  }

  async function initExperience() {
    const root = document.getElementById('experienceList');
    if (!root) return;
    root.setAttribute('aria-busy', 'true');
    try {
      const items = await window.loadPortfolioData('experience', 'data/experience.json');
      const list = Array.isArray(items) ? items.filter(Boolean) : [];
      render(root, list.length ? list.map(entryTemplate) : emptyTemplate());
    } catch (error) {
      console.error(error);
      render(root, html`<p class="empty-state" role="alert">Не удалось загрузить опыт работы.</p>`);
    } finally {
      root.setAttribute('aria-busy', 'false');
    }
  }

  onReady(initExperience);
})();
