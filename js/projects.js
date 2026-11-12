const categoryNames={fintech:'FinTech',consulting:'Стратегия и финансы',edtech:'EdTech',education:'Образование',business:'Бизнес-кейс',marketing:'Маркетинг',product:'Продукт',service:'Сервис',leadership:'Лидерство'};
const coverCategoryNames={fintech:'FINTECH',consulting:'STRATEGY',edtech:'EDTECH',education:'EDUCATION',business:'BUSINESS',marketing:'MARKETING',product:'PRODUCT',service:'SERVICE',leadership:'LEADERSHIP'};
const filterCategories={education:['education','edtech']};
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function initProjects(){
 const grid=document.getElementById('projectsGrid'); if(!grid)return;
 try{
  const projects=await window.loadPortfolioData('projects','data/projects.json');
  const filters=document.querySelectorAll('[data-project-filter]');
  const render=filter=>{
   const subset=projects.filter(p=>filter==='all'||(filterCategories[filter]||[filter]).includes(p.category));
   grid.innerHTML=subset.map(p=>{const index=projects.findIndex(item=>item.slug===p.slug);const category=coverCategoryNames[p.category]||String(p.category||'PROJECT').toUpperCase();const coverTitle=String(p.title||'').split(/\s+[—–]\s+/)[0].trim();const art='<div class="project-card-art art-category-'+esc(p.category)+' art-variant-'+(index%3)+'" aria-hidden="true"><div class="project-art-meta"><span class="project-art-index">'+String(index+1).padStart(2,'0')+'</span><span class="project-art-label">'+esc(category)+'</span></div><span class="project-art-title">'+esc(coverTitle)+'</span></div>';return '<article class="project-card">'+art+'<div class="project-card-content"><div class="project-card-header"><span class="badge badge-emerald">'+esc(categoryNames[p.category]||p.category)+'</span><span class="project-year">'+esc(p.year)+'</span></div><h3 class="project-title">'+esc(p.title)+'</h3><div class="project-award">'+esc(p.status)+'</div><p class="project-description">'+esc(p.summary)+'</p><div class="project-skills">'+(p.skills||[]).slice(0,3).map(s=>'<span class="project-skill-tag">'+esc(s)+'</span>').join('')+'</div><div class="project-card-footer"><a class="project-link" href="project.html?slug='+encodeURIComponent(p.slug)+'">Открыть кейс <span aria-hidden="true">↗</span></a></div></div></article>'}).join('')||'<p class="empty-state">По выбранной категории проектов нет.</p>';
  };
  filters.forEach(b=>b.addEventListener('click',()=>{filters.forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.projectFilter)}));
  render('all');
 }catch(e){grid.innerHTML='<p class="empty-state">Не удалось загрузить проекты.</p>';console.error(e)}
}
document.addEventListener('DOMContentLoaded',initProjects);
