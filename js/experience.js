/**
 * Work experience list (experience.html), rendered from data/experience.json.
 */
(() => {
  const { html, raw, render, onReady } = window.PageUtils;

  /* Decorative illustration for the empty state: a timeline waiting for its first entries. */
  const EMPTY_ART = raw(`
    <svg class="experience-empty-art" viewBox="0 0 240 150" width="240" height="150" fill="none" aria-hidden="true" focusable="false">
      <circle cx="186" cy="38" r="30" class="art-ring"/>
      <circle cx="186" cy="38" r="46" class="art-ring art-ring-faint"/>
      <path d="M38 22v108" class="art-line" stroke-dasharray="3 7"/>
      <circle cx="38" cy="36" r="7" class="art-dot-accent"/>
      <circle cx="38" cy="76" r="6" class="art-dot"/>
      <circle cx="38" cy="114" r="6" class="art-dot"/>
      <rect x="60" y="24" width="112" height="26" rx="8" class="art-card art-card-accent"/>
      <rect x="70" y="33" width="46" height="8" rx="4" class="art-fill-accent"/>
      <rect x="60" y="64" width="150" height="26" rx="8" class="art-card"/>
      <rect x="70" y="73" width="70" height="8" rx="4" class="art-fill"/>
      <rect x="60" y="102" width="124" height="26" rx="8" class="art-card"/>
      <rect x="70" y="111" width="54" height="8" rx="4" class="art-fill"/>
      <g class="art-case" transform="translate(166 22)">
        <rect x="0" y="8" width="40" height="28" rx="6"/>
        <path d="M13 8V4.5A2.5 2.5 0 0 1 15.5 2h9A2.5 2.5 0 0 1 27 4.5V8M0 19h40"/>
      </g>
    </svg>`);

  function emptyTemplate() {
    return html`
      <div class="detail-panel empty-state experience-empty">
        ${EMPTY_ART}
        <h2>Опыт работы и стажировок пока не добавлен</h2>
        <p>В доступном CV перечислены проектные кейсы, но нет подтверждённых записей о работодателях и датах работы. Проектная деятельность описана отдельно.</p>
      </div>`;
  }

  function entryTemplate(item) {
    const heading = [item.role, item.organization].filter(Boolean);
    const highlights = item.highlights || [];
    return html`
      <article class="experience-entry">
        <span class="experience-marker" aria-hidden="true"></span>
        ${item.period ? html`<div class="detail-kicker">${item.period}</div>` : ''}
        <h2>${heading.map((part, index) => html`${index ? ' · ' : ''}${part}`)}</h2>
        ${item.location ? html`<p class="experience-location">${item.location}</p>` : ''}
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
