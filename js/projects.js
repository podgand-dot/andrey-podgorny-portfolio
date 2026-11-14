/**
 * Project catalogue (index.html): renders cards from data, category filters and
 * the "show all" toggle. Without JS nothing is collapsed (the toggle stays hidden).
 */
const categoryNames={fintech:'FinTech',consulting:'Стратегия и финансы',edtech:'EdTech',education:'Образование',business:'Бизнес-кейс',marketing:'Маркетинг',product:'Продукт',service:'Сервис',leadership:'Лидерство'};
const coverCategoryNames={fintech:'FINTECH',consulting:'STRATEGY',edtech:'EDTECH',education:'EDUCATION',business:'BUSINESS',marketing:'MARKETING',product:'PRODUCT',service:'SERVICE',leadership:'LEADERSHIP'};
const filterCategories={education:['education','edtech']};
const PROJECTS_VISIBLE=6;
// Some statuses already start with their own pictogram: no second icon then.
const leadsWithEmoji=/^\p{Extended_Pictographic}/u;
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-'+name+'"/></svg>';

function projectCard(p, index){
 const category=coverCategoryNames[p.category]||String(p.category||'PROJECT').toUpperCase();
 const coverTitle=String(p.title||'').split(/\s+[—–]\s+/)[0].trim();
 const titleId='project-title-'+esc(p.slug);
 const art='<div class="project-card-art art-category-'+esc(p.category)+' art-variant-'+(index%3)+'" aria-hidden="true">'
  +'<div class="project-art-meta"><span class="project-art-index">'+String(index+1).padStart(2,'0')+'</span><span class="project-art-label">'+esc(category)+'</span></div>'
  +'<span class="project-art-title">'+esc(coverTitle)+'</span></div>';
 return '<article class="project-card" data-category="'+esc(p.category)+'">'+art
  +'<div class="project-card-content"><div class="project-card-header"><span class="badge badge-emerald">'+esc(categoryNames[p.category]||p.category)+'</span><span class="project-year">'+esc(p.year)+'</span></div>'
  +'<h3 class="project-title" id="'+titleId+'">'+esc(p.title)+'</h3>'
  +(p.status?'<div class="project-award">'+(leadsWithEmoji.test(p.status)?'':icon('star'))+'<span>'+esc(p.status)+'</span></div>':'')
  +'<p class="project-description">'+esc(p.summary)+'</p>'
  +'<div class="project-skills">'+(p.skills||[]).slice(0,3).map(s=>'<span class="project-skill-tag">'+esc(s)+'</span>').join('')+'</div>'
  +'<div class="project-card-footer"><a class="project-link" href="project.html?slug='+encodeURIComponent(p.slug)+'" aria-describedby="'+titleId+'">Открыть кейс <span aria-hidden="true">↗</span></a></div></div></article>';
}

async function initProjects(){
 const grid=document.getElementById('projectsGrid'); if(!grid)return;
 const filters=document.querySelectorAll('[data-project-filter]');
 const more=document.getElementById('projectsMore');
 const toggle=document.getElementById('projectsToggle');
 const labels={collapsed:'Показать все проекты',expanded:'Свернуть'};
 let expanded=false;

 const setExpanded=(value,count)=>{
  expanded=value;
  const collapsible=count>PROJECTS_VISIBLE;
  grid.classList.toggle('is-collapsed',collapsible&&!expanded);
  if(!more||!toggle)return;
  more.hidden=!collapsible;
  toggle.setAttribute('aria-expanded',String(expanded));
  toggle.textContent=expanded?labels.expanded:labels.collapsed;
 };

 grid.setAttribute('aria-busy','true');
 try{
  const projects=await window.loadPortfolioData('projects','data/projects.json');
  let count=0;
  const render=filter=>{
   const subset=projects.filter(p=>filter==='all'||(filterCategories[filter]||[filter]).includes(p.category));
   count=subset.length;
   grid.innerHTML=subset.map(p=>projectCard(p, projects.findIndex(item=>item.slug===p.slug))).join('')||'<p class="empty-state">По выбранной категории проектов нет.</p>';
   setExpanded(false,count);
  };
  filters.forEach(b=>{
   b.setAttribute('aria-pressed', String(b.classList.contains('active')));
   b.addEventListener('click',()=>{
    filters.forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});
    b.classList.add('active');b.setAttribute('aria-pressed','true');
    render(b.dataset.projectFilter);
   });
  });
  if(toggle){
   toggle.addEventListener('click',()=>{
    const next=!expanded;
    setExpanded(next,count);
    if(next){
     // Keyboard users continue from the first newly shown case.
     const first=grid.children[PROJECTS_VISIBLE];
     first?.querySelector('.project-link')?.focus({preventScroll:true});
    }else{
     const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
     const anchor=document.querySelector('.projects-filter-bar')||grid;
     anchor.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
     toggle.focus({preventScroll:true});
    }
   });
  }
  render('all');
 }catch(e){grid.innerHTML='<p class="empty-state">Не удалось загрузить проекты.</p>';if(more)more.hidden=true;console.error(e)}
 finally{grid.removeAttribute('aria-busy')}
}
document.addEventListener('DOMContentLoaded',initProjects);
