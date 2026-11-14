/**
 * Project case study page (project.html?slug=<slug>), rendered from data/projects.json.
 */
(() => {
  const { html, raw, render, setMeta, onReady } = window.PageUtils;

  const projectCategoryNames = {
    fintech: 'FinTech',
    consulting: 'Стратегия и финансы',
    edtech: 'EdTech',
    education: 'Образование',
    business: 'Бизнес-кейс',
    marketing: 'Маркетинг',
    product: 'Продукт',
    service: 'Сервис',
    leadership: 'Лидерство'
  };
  const SITE_SUFFIX = ' • Андрей Подгорный';
  const SKILLS_TITLE = 'Навыки';
  // Files a browser cannot display are downloaded instead of opening an empty tab.
  const DOWNLOAD_EXTENSIONS = /\.(pptx?|docx?|xlsx?|zip|key)$/i;

  /** Text with " • " separators becomes a list; anything else stays a paragraph. */
  const KNOWN_CATEGORIES = new Set(Object.keys(projectCategoryNames));

  /* Inline line icons (decorative, aria-hidden). Trusted static markup only. */
  const svg = body => raw(`<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`);
  const ICONS = {
    problem: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>'),
    solution: svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>'),
    role: svg('<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>'),
    outcome: svg('<path d="M4 20V5"/><path d="M4 5h11l-2 3.5L15 12H4"/>'),
    materials: svg('<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
    award: svg('<circle cx="12" cy="9" r="5.5"/><path d="M8.6 13.4 7.5 21l4.5-2.4 4.5 2.4-1.1-7.6"/>'),
    note: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>'),
    external: svg('<path d="M7 17 17 7M9 7h8v8"/>'),
    download: svg('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>'),
    arrowLeft: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>')
  };
  const FILE_ICONS = {
    pdf: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 13h7M8.5 16.5h5"/>'),
    slides: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/><path d="M7.5 12.5l3-3 2 2 4-4"/>'),
    video: svg('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m10 9.2 5 2.8-5 2.8z"/>'),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="9.5" r="1.8"/><path d="m21 16-5.2-5.2L5 20"/>'),
    doc: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 12.5h7M8.5 15.5h7M8.5 18.5h4"/>'),
    sheet: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>'),
    archive: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v2M12 7v2M12 11v2"/><rect x="10.5" y="13.5" width="3" height="4" rx="1"/>'),
    link: svg('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>')
  };

  /** Text with " • " separators becomes a list; anything else stays a paragraph. */
  function narrative(value) {
    const parts = String(value || '').split(/\s*•\s*/).map(part => part.trim()).filter(Boolean);
    if (parts.length > 1) return html`<ul class="detail-list">${parts.map(part => html`<li>${part}</li>`)}</ul>`;
    return html`<p>${value}</p>`;
  }

  function normalizeSource(source) {
    if (Array.isArray(source)) return { label: source[0], url: source[1] };
    return source && typeof source === 'object' ? source : null;
  }

  function isExternal(url) {
    try {
      return new URL(url, location.href).origin !== location.origin || /^https?:/i.test(url);
    } catch (_) {
      return false;
    }
  }

  function fileName(url) {
    const path = String(url).split(/[?#]/)[0];
    try {
      return decodeURIComponent(path.split('/').pop() || '');
    } catch (_) {
      return path.split('/').pop() || '';
    }
  }

  /** Material type inferred from the URL: drives the icon and its tint only. */
  function sourceType(url) {
    const value = String(url);
    const path = value.split(/[?#]/)[0].toLowerCase();
    if (/\.pdf$/.test(path)) return 'pdf';
    if (/\.(pptx?|key|odp)$/.test(path) || /docs\.google\.com\/presentation/.test(value)) return 'slides';
    if (/\.(mp4|webm|mov|m4v)$/.test(path) || /youtu\.?be|vimeo\.com/.test(value)) return 'video';
    if (/\.(webp|png|jpe?g|gif|avif|svg)$/.test(path)) return 'image';
    if (/\.(docx?|odt|rtf|txt)$/.test(path) || /docs\.google\.com\/document/.test(value)) return 'doc';
    if (/\.(xlsx?|csv|ods)$/.test(path) || /docs\.google\.com\/spreadsheets/.test(value)) return 'sheet';
    if (/\.(zip|rar|7z)$/.test(path)) return 'archive';
    return 'link';
  }

  function sourceLink(source) {
    const { label, url } = source;
    const path = String(url).split(/[?#]/)[0];
    const type = sourceType(url);
    const isDownload = !isExternal(url) && DOWNLOAD_EXTENSIONS.test(path);
    const inner = html`
      <span class="source-icon" data-type="${type}">${FILE_ICONS[type]}</span>
      <span class="source-label">${label}</span>
      <span class="source-action">${isDownload ? ICONS.download : ICONS.external}</span>`;
    if (isDownload) {
      return html`<li><a class="source-link" data-type="${type}" href="${url}" download="${fileName(url)}">${inner}</a></li>`;
    }
    return html`<li><a class="source-link" data-type="${type}" href="${url}" target="_blank" rel="noopener noreferrer">${inner}</a></li>`;
  }

  function panel(title, body, icon, extraClass = '') {
    return html`
      <section class="detail-panel case-panel ${extraClass}">
        <div class="panel-head">
          <span class="panel-icon" aria-hidden="true">${icon}</span>
          <h2>${title}</h2>
        </div>
        ${body}
      </section>`;
  }

  /**
   * Status line, with the first score/place/percentage (if any) set as a large numeral.
   * The text itself is unchanged; a leading decorative emoji is replaced by the card icon.
   */
  function statusCard(status) {
    const text = String(status).replace(/^[\p{Extended_Pictographic}️‍]+\s*/u, '');
    const match = text.match(/\d+(?:[.,]\d+)?\s*\/\s*\d+|\d+(?:[.,]\d+)?\s*%|\d+-е(?=\s+место)/);
    if (!match) {
      return html`
        <div class="project-status-card">
          <span class="status-icon" aria-hidden="true">${ICONS.award}</span>
          <p class="project-status">${text}</p>
        </div>`;
    }
    const before = text.slice(0, match.index).trim();
    const after = text.slice(match.index + match[0].length).trim();
    return html`
      <div class="project-status-card has-figure">
        <span class="status-icon" aria-hidden="true">${ICONS.award}</span>
        <p class="project-status">
          ${before ? html`<span class="stat-label">${before}</span> ` : ''}<span class="stat-figure">${match[0]}</span>${after ? html` <span class="stat-rest">${after}</span>` : ''}
        </p>
      </div>`;
  }

  function projectHref(project) {
    return `project.html?slug=${encodeURIComponent(project.slug)}`;
  }

  function categoryKey(project) {
    return KNOWN_CATEGORIES.has(project.category) ? project.category : 'default';
  }

  function pager(projects, index) {
    if (projects.length < 2) return '';
    const prev = projects[(index - 1 + projects.length) % projects.length];
    const next = projects[(index + 1) % projects.length];
    return html`
      <nav class="project-pager container" aria-label="Соседние проекты">
        <a class="project-pager-link project-pager-prev" data-category="${categoryKey(prev)}" href="${projectHref(prev)}" rel="prev">
          <span class="project-pager-arrow" aria-hidden="true">${ICONS.arrowLeft}</span>
          <span class="project-pager-title">${prev.title}</span>
        </a>
        <a class="project-pager-link project-pager-next" data-category="${categoryKey(next)}" href="${projectHref(next)}" rel="next">
          <span class="project-pager-title">${next.title}</span>
          <span class="project-pager-arrow" aria-hidden="true">${ICONS.arrowRight}</span>
        </a>
      </nav>`;
  }

  function projectTemplate(project, projects, index) {
    const sources = (project.sources || [])
      .map(normalizeSource)
      .filter(source => source && source.url && source.label);
    const category = projectCategoryNames[project.category] || project.category;
    const skills = project.skills || [];

    return html`
      <article class="project-article" data-category="${categoryKey(project)}">
        <header class="project-hero">
          <div class="container project-hero-inner">
            <div class="project-hero-main">
              <a class="back-link" href="index.html#projects">← Все проекты</a>
              <div class="detail-kicker">${category} · ${project.year}</div>
              <h1>${project.title}</h1>
              <p class="detail-lead">${project.summary}</p>
            </div>
            <div class="project-hero-aside">
              ${project.status ? statusCard(project.status) : ''}
              ${skills.length ? html`
                <section class="project-skills-block">
                  <h2>${SKILLS_TITLE}</h2>
                  <ul class="project-skills" role="list">
                    ${skills.map(skill => html`<li class="project-skill-tag">${skill}</li>`)}
                  </ul>
                </section>` : ''}
            </div>
          </div>
        </header>
        <div class="container project-body">
          <div class="detail-grid case-grid">
            ${panel('Задача', narrative(project.problem), ICONS.problem)}
            ${panel('Решение', narrative(project.solution), ICONS.solution)}
            ${panel('Моя роль', html`<p>${project.role}</p>`, ICONS.role)}
            ${panel('Результат и статус', narrative(project.outcome), ICONS.outcome, 'case-panel-outcome')}
          </div>
          ${sources.length ? panel('Материалы', html`
            <ul class="source-list" role="list">${sources.map(sourceLink)}</ul>`, ICONS.materials, 'project-materials') : ''}
          <p class="detail-note"><span class="note-icon" aria-hidden="true">${ICONS.note}</span><span>Плановые показатели и гипотезы описаны отдельно от подтверждённых результатов.</span></p>
        </div>
      </article>
      ${pager(projects, index)}`;
  }

  function stateTemplate(title, role) {
    return html`
      <div class="container project-state">
        <div class="project-state-card">
          <span class="project-state-icon" aria-hidden="true">${FILE_ICONS.doc}</span>
          <h1 class="empty-state state-title"${role ? raw(' role="alert"') : ''}>${title}</h1>
          <div class="detail-actions">
            <a class="btn btn-secondary" href="index.html#projects">Ко всем проектам</a>
          </div>
        </div>
      </div>`;
  }

  function notFoundTemplate() {
    return stateTemplate('Проект не найден.');
  }

  function errorTemplate() {
    return stateTemplate('Не удалось загрузить описание проекта.', true);
  }

  function updateHead(project) {
    const title = project.title + SITE_SUFFIX;
    document.title = title;
    setMeta('og:title', title);
    if (project.summary) {
      setMeta('description', project.summary);
      setMeta('og:description', project.summary);
    }
    setMeta('og:type', 'article');
  }

  async function loadProject() {
    const root = document.getElementById('projectDetail');
    if (!root) return;
    const slug = new URLSearchParams(location.search).get('slug');
    root.setAttribute('aria-busy', 'true');

    try {
      const projects = await window.loadPortfolioData('projects', 'data/projects.json');
      const list = Array.isArray(projects) ? projects.filter(item => item && item.slug) : [];
      const index = slug ? list.findIndex(item => item.slug === slug) : -1;

      if (index < 0) {
        setMeta('robots', 'noindex');
        render(root, notFoundTemplate());
        return;
      }

      const project = list[index];
      updateHead(project);
      render(root, projectTemplate(project, list, index));
    } catch (error) {
      console.error(error);
      render(root, errorTemplate());
    } finally {
      root.setAttribute('aria-busy', 'false');
    }
  }

  onReady(loadProject);
})();
