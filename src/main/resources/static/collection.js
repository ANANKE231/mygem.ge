/* mygem.ge — collection page: toolbar (count · view toggle · period · sort) + list-view cards.
   Load AFTER script.js. Overrides views.search; no edits in script.js needed. */
(()=>{
 const CS={s:'dd',p:'0',v:'grid',pg:1,sig:''};
 const PER=15;
 const SORTS=[['dd','თარიღი კლებადი'],['da','თარიღი ზრდადი'],['pd','ფასი კლებადი'],['pa','ფასი ზრდადი'],['sd','სინჯი კლებადი'],['sa','სინჯი ზრდადი']];
 const PERS=[['0','ყველა დრო'],['1','დღეს'],['7','ბოლო 7 დღე'],['30','ბოლო 30 დღე']];
 const VL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
 const VG='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="5" width="16" height="3.5" rx="1"/><rect x="4" y="10.3" width="16" height="3.5" rx="1"/><rect x="4" y="15.6" width="16" height="3.5" rx="1"/></svg>';

 /* ---------- sorting ---------- */
 const sinji=p=>{const v=parseInt(p.attrs&&p.attrs.pur,10);return isNaN(v)?null:v};
 const sn=(x,y,dir)=>{const a=sinji(x),b=sinji(y);if(a===null&&b===null)return 0;if(a===null)return 1;if(b===null)return -1;return dir*(a-b)};
 const sortList=l=>{
  const c=p=>p.created||0,
        days=+CS.p||0,
        a=days?l.filter(p=>c(p)>=Date.now()-days*864e5):[...l],
        pr=(x,y,dir)=>{if(x.nego&&y.nego)return 0;if(x.nego)return 1;if(y.nego)return -1;return dir*(x.price-y.price)},
        f={dd:(x,y)=>c(y)-c(x),da:(x,y)=>c(x)-c(y),pd:(x,y)=>pr(x,y,-1),pa:(x,y)=>pr(x,y,1),sd:(x,y)=>sn(x,y,-1),sa:(x,y)=>sn(x,y,1)}[CS.s]||((x,y)=>c(y)-c(x));
<<<<<<< HEAD
  return a.sort(f)};
=======
    const rank=p=>p.vip=='SUPER VIP'?2:p.vip?1:0;
  return a.sort((x,y)=>rank(y)-rank(x)||f(x,y))};
>>>>>>> 28ae1ab (a)

 /* ---------- list-view card ---------- */
 const si=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
 const I={
  metal:ICONS.coin,
  pur:UI.tag,
  weight:'<path d="M12 4v16M6 20h12M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/>',
  gen:UI.user,
  stone:UI.gem,
  cond:SI.new
 };
 const ago=ts=>{const m=Math.max(0,Math.floor((Date.now()-ts)/6e4));
  if(m<1)return 'ახლახან';if(m<60)return m+' წუთის წინ';
  const h=Math.floor(m/60);if(h<24)return h+' საათის წინ';
  const d=Math.floor(h/24);if(d<30)return d+' დღის წინ';
  const mo=Math.floor(d/30);if(mo<12)return mo+' თვის წინ';return Math.floor(mo/12)+' წლის წინ'};
 const specsOf=p=>{const a=p.attrs||{},tn=typeName(p);
  return [
   [I.metal,a.metal||p.cat],
   [I.pur,a.pur?a.pur+' სინჯი':''],
   [I.weight,p.weight?p.weight+' გრ':''],
   [ICONS[p.type]||ICONS.other,tn],
   [I.gen,p.gender],
   [I.stone,a.stone],
   [I.cond,a.cond]
  ].filter(x=>x[1]).slice(0,4)};
 const listCard=p=>{
  const c=pc[p.id]||'GEL',f=favs.includes(p.id),hex=cardHex(p),cond=(p.attrs&&p.attrs.cond)||'',
   sp=specsOf(p).map(([ic,t])=>`<div class="lsp">${si(ic)}<span>${esc(t)}</span></div>`).join(''),
   price=p.nego?'<span class="price nego">ფასი შეთანხმებით</span>':`<span class="price" data-g="${p.price}" data-id="${p.id}">${fmt(p.price,c)}</span>${curSw(p.id,c)}`,
   badge=p.vip?`<span class="lvip ${p.vip=='VIP'?'v':'s'}">${esc(p.vip)}</span>`:'';
  return `<div class="lcard" data-id="${p.id}" tabindex="0" role="link" aria-label="${esc(p.title)}"${hex?` style="background:${hex}"`:''}>
  <div class="limg"><div class="limgi" style="${bgi(p.photos[0])}">${p.photos[0]?'':ill(p)}</div></div>
  <div class="lbody">
   <div class="lmain"><h4 class="ltitle">${esc(p.title)}</h4>${ownChip(p)}<div class="lspecs">${sp}</div></div>
   <div class="lside">
    <div class="ltop">${p.loc?`<span class="lloc">${esc(p.loc)}</span>`:''}${cond?`<span class="lcond">${esc(cond)}</span>`:''}<button type="button" class="cact fav ${f?'on':''}" data-fav="${p.id}" aria-pressed="${f}" aria-label="${f?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება'}" title="ფავორიტები">${ui('heart')}</button></div>
    <div class="lprice">${price}</div>
    ${stkHTML(p)}
   </div>
   <div class="lfoot">${badge}<span class="lago">${ago(p.created||Date.now())}</span><span class="ldot">·</span>${vwHTML(p.id)}</div>
  </div>
 </div>`};

 /* grid card = the site's card(), with the same svg icons as the list card instead of emoji tags */
 const tagsOf=p=>specsOf(p).slice(0,3).map(([ic,t])=>`<span class="tg">${si(ic)}${esc(t)}</span>`).join('');
 const gridCard=p=>card(p).replace(/<div class="tags">[\s\S]*?<\/div>/,`<div class="tags">${tagsOf(p)}</div>`);

 /* pagination */
 const pager=(cur,tot)=>{if(tot<2)return '';
  const set=new Set([1,tot,cur-1,cur,cur+1]);if(cur<=3){set.add(2);set.add(3)}if(cur>=tot-2){set.add(tot-1);set.add(tot-2)}
  const nums=[...set].filter(n=>n>=1&&n<=tot).sort((a,b)=>a-b);let h='',prev=0;
  nums.forEach(n=>{if(n-prev>1)h+='<span class="pgd">…</span>';h+=`<button type="button" class="pgb${n==cur?' on':''}" data-page="${n}"${n==cur?' aria-current="page"':''}>${n}</button>`;prev=n});
  return `<nav class="pager" aria-label="გვერდები"><button type="button" class="pgb nx" data-page="${cur-1}" aria-label="წინა"${cur<=1?' disabled':''}>${ui('prev')}</button>${h}<button type="button" class="pgb nx" data-page="${cur+1}" aria-label="შემდეგი"${cur>=tot?' disabled':''}>${ui('next')}</button></nav>`};

 views.search=function(){
  const r=sortList(pub().filter(match)),sig=JSON.stringify([F,CS.s,CS.p]);
  if(sig!==CS.sig){CS.sig=sig;CS.pg=1}
  const tot=Math.max(1,Math.ceil(r.length/PER));if(CS.pg>tot)CS.pg=tot;if(CS.pg<1)CS.pg=1;
  const pageItems=r.slice((CS.pg-1)*PER,CS.pg*PER);
  return `<div class="layout"><aside><div class="sbox">${filters()}</div></aside><div class="results">
  <div class="sbar">
   <h2><b>${r.length}</b> განცხადება</h2>
   <div class="sctl">
    <div class="vtog">
     <button type="button" data-view="list" class="${CS.v=='list'?'on':''}" aria-label="სია" title="სია" aria-pressed="${CS.v=='list'}">${VL}</button>
     <button type="button" data-view="grid" class="${CS.v=='grid'?'on':''}" aria-label="ბადე" title="ბადე" aria-pressed="${CS.v=='grid'}">${VG}</button>
    </div>
    ${dd('sortP',{list:PERS,val:CS.p})}
    ${dd('sortS',{list:SORTS,val:CS.s})}
   </div>
  </div>
  ${r.length?(CS.v=='list'?`<div class="lgrid">${pageItems.map(listCard).join('')}</div>`:`<div class="grid">${pageItems.map(gridCard).join('')}</div>`)+pager(CS.pg,tot):'<div class="empty">ვერაფერი მოიძებნა 😔</div>'}
  </div></div>`};

 /* ---------- events ---------- */
 document.addEventListener('change',e=>{   /* dropdown "change" does not bubble: capture phase */
  const t=e.target;if(!t||!t.id)return;
  if(t.id=='sortS'){CS.s=t.dataset.val||'dd';CS.pg=1;rerender()}
  else if(t.id=='sortP'){CS.p=t.dataset.val||'0';CS.pg=1;rerender()}
 },true);
 document.addEventListener('click',e=>{
  const pgb=e.target.closest&&e.target.closest('[data-page]');
  if(pgb&&!pgb.disabled){CS.pg=+pgb.dataset.page||1;rerender();const t=document.querySelector('.sbar');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});return}
  const b=e.target.closest&&e.target.closest('[data-view]');
  if(b){CS.v=b.dataset.view=='list'?'list':'grid';rerender();return}
  const c=e.target.closest&&e.target.closest('.lcard[data-id]');
  if(c&&!e.target.closest('[data-fav],[data-cs]'))window.open(location.href.split('#')[0]+'#product:'+c.dataset.id,'_blank','noopener');
 });
 document.addEventListener('keydown',e=>{
  if(e.key=='Enter'&&e.target.matches&&e.target.matches('.lcard[data-id]')&&!e.target.closest('[data-fav],[data-cs]'))
   window.open(location.href.split('#')[0]+'#product:'+e.target.dataset.id,'_blank','noopener');
 });
})();
