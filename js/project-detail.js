/**
 * Project case study page (project.html?slug=<slug>), rendered from data/projects.json.
 */
(() => {
  const { html, render, setMeta, onReady } = window.PageUtils;

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
  // Files a browser cannot display are downloaded instead of opening an empty tab.
  const DOWNLOAD_EXTENSIONS = /\.(pptx?|docx?|xlsx?|zip|key)$/i;

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

  function sourceLink(source) {
    const { label, url } = source;
    const path = String(url).split(/[?#]/)[0];
    if (!isExternal(url) && DOWNLOAD_EXTENSIONS.test(path)) {
      return html`<a class="btn btn-secondary source-link" href="${url}" download="${fileName(url)}">${label} ↗</a>`;
    }
    return html`<a class="btn btn-secondary source-link" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  }

  function panel(title, body) {
    return html`<section class="detail-panel"><h2>${title}</h2>${body}</section>`;
  }

  function projectHref(project) {
    return `project.html?slug=${encodeURIComponent(project.slug)}`;
  }

  function pager(projects, index) {
    if (projects.length < 2) return '';
    const prev = projects[(index - 1 + projects.length) % projects.length];
    const next = projects[(index + 1) % projects.length];
    return html`
      <nav class="project-pager" aria-label="Соседние проекты">
        <a class="project-pager-link project-pager-prev" href="${projectHref(prev)}" rel="prev">
          <span class="project-pager-arrow" aria-hidden="true">←</span>
          <span class="project-pager-title">${prev.title}</span>
        </a>
        <a class="project-pager-link project-pager-next" href="${projectHref(next)}" rel="next">
          <span class="project-pager-title">${next.title}</span>
          <span class="project-pager-arrow" aria-hidden="true">→</span>
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
      <article class="project-article">
        <a class="back-link" href="index.html#projects">← Все проекты</a>
        <div class="detail-kicker">${category} · ${project.year}</div>
        <h1>${project.title}</h1>
        <p class="detail-lead">${project.summary}</p>
        ${project.status ? html`<span class="badge badge-emerald project-status">${project.status}</span>` : ''}
        <div class="detail-grid">
          ${panel('Задача', narrative(project.problem))}
          ${panel('Решение', narrative(project.solution))}
          ${panel('Моя роль', html`<p>${project.role}</p>`)}
          ${panel('Результат и статус', narrative(project.outcome))}
        </div>
        ${skills.length ? panel('Навыки', html`
          <ul class="project-skills" role="list">
            ${skills.map(skill => html`<li class="project-skill-tag">${skill}</li>`)}
          </ul>`) : ''}
        ${sources.length ? panel('Материалы', html`
          <div class="detail-actions">${sources.map(sourceLink)}</div>`) : ''}
        <p class="detail-note">Плановые показатели и гипотезы описаны отдельно от подтверждённых результатов.</p>
      </article>
      ${pager(projects, index)}`;
  }

  function notFoundTemplate() {
    return html`
      <h1 class="empty-state state-title">Проект не найден.</h1>
      <div class="detail-actions">
        <a class="btn btn-secondary" href="index.html#projects">Ко всем проектам</a>
      </div>`;
  }

  function errorTemplate() {
    return html`
      <h1 class="empty-state state-title" role="alert">Не удалось загрузить описание проекта.</h1>
      <div class="detail-actions">
        <a class="btn btn-secondary" href="index.html#projects">Ко всем проектам</a>
      </div>`;
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
