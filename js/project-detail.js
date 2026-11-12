const projectCategoryNames={fintech:'FinTech',consulting:'Стратегия и финансы',edtech:'EdTech',education:'Образование',business:'Бизнес-кейс',marketing:'Маркетинг',product:'Продукт',service:'Сервис',leadership:'Лидерство'};
const escapeText = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const narrative = value => { const parts=String(value||'').split(/\s*•\s*/).map(x=>x.trim()).filter(Boolean); return parts.length>1 ? '<ul class="detail-list">'+parts.map(x=>'<li>'+escapeText(x)+'</li>').join('')+'</ul>' : '<p>'+escapeText(value)+'</p>'; };
const normalizeSource = source => Array.isArray(source) ? {label:source[0],url:source[1]} : source;
async function loadProject(){
 const root=document.getElementById('projectDetail'),slug=new URLSearchParams(location.search).get('slug');
 try{
  const projects=await window.loadPortfolioData('projects','data/projects.json');const p=projects.find(x=>x.slug===slug);
  if(!p){root.innerHTML='<p class="empty-state">Проект не найден.</p><a class="btn btn-secondary" href="index.html#projects">Ко всем проектам</a>';return}
  document.title=p.title+' • Андрей Подгорный';
  const sources=(p.sources||[]).map(normalizeSource).filter(x=>x&&x.url&&x.label).map(x=>'<a class="btn btn-secondary" href="'+escapeText(x.url)+'" target="_blank" rel="noopener noreferrer">'+escapeText(x.label)+' ↗</a>').join('');
  root.innerHTML='<a class="back-link" href="index.html#projects">← Все проекты</a><div class="detail-kicker">'+escapeText(projectCategoryNames[p.category]||p.category)+' · '+escapeText(p.year)+'</div><h1>'+escapeText(p.title)+'</h1><p class="detail-lead">'+escapeText(p.summary)+'</p><span class="badge badge-emerald">'+escapeText(p.status)+'</span><div class="detail-grid"><section class="detail-panel"><h2>Задача</h2>'+narrative(p.problem)+'</section><section class="detail-panel"><h2>Решение</h2>'+narrative(p.solution)+'</section><section class="detail-panel"><h2>Моя роль</h2><p>'+escapeText(p.role)+'</p></section><section class="detail-panel"><h2>Результат и статус</h2>'+narrative(p.outcome)+'</section></div><section class="detail-panel"><h2>Навыки</h2><div class="project-skills">'+(p.skills||[]).map(s=>'<span class="project-skill-tag">'+escapeText(s)+'</span>').join('')+'</div></section>'+(sources?'<section class="detail-panel"><h2>Материалы</h2><div class="detail-actions">'+sources+'</div></section>':'')+'<p class="detail-note">Плановые показатели и гипотезы описаны отдельно от подтверждённых результатов.</p>';
 }catch(e){root.innerHTML='<p class="empty-state">Не удалось загрузить описание проекта.</p>';console.error(e)}
}
document.addEventListener('DOMContentLoaded',loadProject);
