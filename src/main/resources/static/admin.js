const $=(s,r=document)=>r.querySelector(s);
const L=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const S=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{toast('შენახვა ვერ მოხერხდა (მეხსიერება გადაივსო)');return false}};
(()=>{const us=L('users',[]);let ch=false;us.forEach(u=>{if(u&&Object.prototype.hasOwnProperty.call(u,'pass')){delete u.pass;ch=true}});if(ch)S('users',us);try{localStorage.removeItem('adminAuth')}catch{}})();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fdt=t=>t?new Date(t).toLocaleString('ka-GE'):'—';
const fd=t=>t?new Date(t).toLocaleDateString('ka-GE'):'—';
const DAY=864e5,MONTH=30*DAY,same=(a,b)=>String(a).toLowerCase()==String(b).toLowerCase();
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ---------- icons ---------- */
const ic=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={
 dash:'<rect x="3" y="3" width="7.5" height="9" rx="2"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="2"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2"/><rect x="3" y="15" width="7.5" height="6" rx="2"/>',
 items:'<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l-1 6 4 12M15 3l1 6-4 12"/>',
 pay:'<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.1-5.5 6.5-5.5s5.900 1.900 6.500 5.500M16 4.500a3.500 3.500 0 010 7M18 14.800c2 .6 3.200 2.300 3.500 5.200"/>',
 blog:'<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8.500 12h7M8.500 16h5"/>',
 notes:'<path d="M4 4h16v12l-5 5H4z"/><path d="M15 21v-5h5M8 9h8M8 13h4"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 ban:'<circle cx="12" cy="12" r="9"/><path d="M5.600 5.600l12.800 12.800"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.500-3.500"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 check:'<path d="M5 12.500l4.500 4.500L19 7.500"/>',
 ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.500 6.500l4 4"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
 dl:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
 back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
 img:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.800"/><path d="M21 16l-5-5-9 9"/>',
 bold:'<path d="M7 5h6a3.500 3.500 0 010 7H7zM7 12h7a3.500 3.500 0 010 7H7z"/>',
 head:'<path d="M5 5v14M19 5v14M5 12h14"/>',
 list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.500" cy="6" r=".8"/><circle cx="4.500" cy="12" r=".8"/><circle cx="4.500" cy="18" r=".8"/>',
 alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
 receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
 logout:'<path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9"/>',
 up:'<path d="M12 20V9M7 13l5-5 5 5M5 4h14"/>',
 eye:'<path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
const TABS=[['dash','მთავარი','მიმოხილვა','ყველაფერი ერთ გვერდზე'],['items','განცხადებები','მონაცემები','განცხადებების მართვა და მოდერაცია'],['pay','გადახდები','','გადახდების შემოწმება და დადასტურება'],['users','მომხმარებლები','','რეგისტრირებული მომხმარებლები'],['blog','ბლოგი','შიგთავსი','სტატიების დამატება და რედაქტირება'],['notes','ჩანაწერები','ხელსაწყოები','პირადი ჩანაწერები ადმინისთვის'],['trash','ურნა','','წაშლილი განცხადებების აღდგენა']];

/* ---------- toast / modal ---------- */
const toast=t=>{const d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.innerHTML=ic(IC.check)+'<span></span>';d.lastChild.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),3000)};
const modal=(h,drawer)=>{const m=$('#modal');m.className='modal show'+(drawer?' drawer':'');$('#mbox').innerHTML=h;$('#mbox').scrollTop=0};
const closeM=()=>$('#modal').classList.remove('show');
$('#modal').onclick=e=>{if(e.target.id=='modal'||e.target.closest('[data-close]'))closeM()};
const ask=(title,txt,okLabel,fn)=>{modal(`<h2 style="margin-bottom:8px">${esc(title)}</h2><p class="hint" style="margin-bottom:18px;font-size:14px">${esc(txt)}</p><div class="row-a"><button class="btn red" id="mok">${esc(okLabel)}</button><button class="btn alt" data-close>გაუქმება</button></div>`);$('#mok').onclick=()=>{closeM();fn()}};

/* ---------- config ---------- */
const cfg=()=>L('adminCfg',{});
const adminList=()=>{const c=cfg().ADMIN_EMAILS;return[...new Set(['mygemge@gmail.com',...(Array.isArray(c)?c:String(c||'').split(',')).map(s=>s.trim()).filter(Boolean)])]};

/* ---------- site links ----------
   The public site is served at /. */
const siteRoot=()=>{let u=String(cfg().SITE_URL||'').trim();if(!u)u=location.protocol=='file:'?'https://mygem.ge/':location.origin+'/';return u.replace(/\/*$/,'/')};
const siteBase=()=>siteRoot();
const link=h=>siteBase()+'#'+h;

/* ---------- IndexedDB ---------- */
const DBS={};
const idb=(n,s)=>DBS[n]||(DBS[n]=new Promise(r=>{try{const q=indexedDB.open(n,1);q.onupgradeneeded=()=>q.result.createObjectStore(s);q.onsuccess=()=>r(q.result);q.onerror=q.onblocked=()=>r(null)}catch{r(null)}}));
const idbDo=async(n,s,mode,fn)=>{const db=await idb(n,s);if(!db)return{ok:false};return new Promise(r=>{try{const t=db.transaction(s,mode),q=fn(t.objectStore(s));t.oncomplete=()=>r({ok:true,v:q?q.result:undefined});t.onerror=t.onabort=()=>r({ok:false})}catch{r({ok:false})}})};

/* ---------- listing state (same rules as the site's edit.js) ---------- */
const stateOf=p=>p.state=='blocked'?'blocked':p.state=='off'?'off':(p.owner!='demo'&&(p.renewedAt||p.created)&&(p.renewedAt||p.created)+MONTH<=Date.now())?'expired':(p.pay&&p.pay.status=='pending'&&p.hold)?'hold':'active';
const ST={active:'აქტიური',expired:'ვადაგასული',off:'გამორთული',blocked:'დაბლოკილი',hold:'გადახდა მოწმდება'};
function applyVis(p){const hide=['blocked','off','expired'].includes(stateOf(p));if(hide&&!p.hold){p.hold=true;p.hvis=true}else if(!hide&&p.hvis){delete p.hold;delete p.hvis}}
const notify=(email,t)=>{if(!email||email=='demo')return;const n=L('notes',{});(n[email]=n[email]||[]).unshift({t,d:Date.now(),r:0});S('notes',n)};
const items=()=>L('items',[]);
function admSend(url,opt){return fetch(url,Object.assign({credentials:'include',headers:{'Content-Type':'application/json','X-MyGem':'1'}},opt||{}))}
function saveItems(v){S('items',v);if(!ADMIN)return;for(const p of v){if(!p||!p.id||p.owner==='demo')continue;const body={...p};if(body._hp||!Array.isArray(body.photos)||!body.photos.length)delete body.photos;delete body._hp;admSend('/api/listings',{method:'PUT',body:JSON.stringify(body)}).catch(()=>{})}}
const tagS=p=>`<span class="tag t-${stateOf(p)}">${ST[stateOf(p)]}</span>`;
const empty=(ico,t,s)=>`<div class="empty">${ic(IC[ico])}<b>${t}</b>${s||''}</div>`;
/* ---------- ურნა ---------- */
const TRASH_DAYS=30;
let SERVER_TRASH = [];

const trash = () => SERVER_TRASH;

async function loadServerTrash() {
  const response = await admSend('/api/listings/trash');
  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'ურნა ვერ ჩაიტვირთა');
  }

  SERVER_TRASH = data.listings.map(item => ({
    id: String(item.id),
    item,
    d: item.deletedAt,
    by: item.deletedBy
  }));

  rerender();
}
async function toTrash(p){
 const id=String(p.id);
 const r=await idbDo('mygem','blobs','readonly',s=>s.get('i'+id));
 const h=Object.assign({},r.ok&&r.v?r.v:{});
 if(!(h.photos&&h.photos.length)&&p.photos&&p.photos.length)h.photos=p.photos;
 if(!h.video&&p.video)h.video=p.video;
 if(!h.audio&&p.audio)h.audio=p.audio;
 if(!h.receipt&&p.pay&&p.pay.receipt)h.receipt=p.pay.receipt;
 const item=JSON.parse(JSON.stringify(p));
 delete item.photos;delete item.video;delete item.audio;if(item.pay)delete item.pay.receipt;
 const has=!!((h.photos&&h.photos.length)||h.video||h.audio||h.receipt);
 if(has){item._hp=true;const w=await idbDo('mygem','blobs','readwrite',s=>s.put(h,'t'+id));if(!w.ok)return false}
 const t=trash().filter(x=>String(x.id)!=id);t.unshift({id,item,d:Date.now(),by:(ME()||{}).email||''});
 if(!S('trash',t))return false;
 await idbDo('mygem','blobs','readwrite',s=>s.delete('i'+id));
 return true}
function purgeTrash() {}
/* ---------- blog helpers (same format as the site) ---------- */
let BP=null,BE=null;
const blogLines=t=>String(t).split('\n').map(x=>x.trim()).filter(Boolean);
const blogTxt=b=>b.reduce((a,x,i)=>a+(i?(x.startsWith('- ')&&b[i-1].startsWith('- ')?'\n':'\n\n'):'')+x,'');
const blogEx=Ls=>{const p=(Ls.find(x=>x[0]!='#'&&!x.startsWith('- '))||Ls[0]||'').replace(/\*\*/g,'');return p.length>170?p.slice(0,167).replace(/\s+\S*$/,'')+'…':p};
const blogMin=Ls=>Math.max(1,Math.round(Ls.join(' ').split(/\s+/).length/170));
const bodyHtml=Ls=>{let h='',l=false;const f=x=>esc(x).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');for(const x of Ls){const li=x.startsWith('- ');if(l&&!li){h+='</ul>';l=false}if(li&&!l){h+='<ul>';l=true}h+=li?`<li>${f(x.slice(2))}</li>`:x[0]=='#'?`<h3>${esc(x.slice(1).trim())}</h3>`:`<p>${f(x)}</p>`}return h+(l?'</ul>':'')};
const prevHtml=()=>{const Ls=blogLines(BE.text||''),mm=Math.max(0,Math.min(99,Math.round(+BE.mm||0)))||(Ls.length?blogMin(Ls):0);
 return (BE.img?`<div class="pcov" style="background-image:url('${BE.img}')"></div>`:`<div class="pcov empty">ქავერ-ფოტო</div>`)+`<h1>${esc(BE.t||'სტატიის სათაური')}</h1><div class="meta">${mm?mm+' წთ კითხვა':'—'}</div>`+(Ls.length?bodyHtml(Ls):'<p style="color:var(--mu)">აქ გამოჩნდება თქვენი ტექსტი…</p>')};
/* cover: centre-cropped to 3:2, max 1400px wide */
const blogImg=f=>new Promise(r=>{const x=new FileReader();x.onerror=x.onabort=()=>r(null);x.onload=()=>{const i=new Image();i.onerror=()=>r(null);i.onload=()=>{try{const w=i.naturalWidth,h=i.naturalHeight;if(!w||!h)return r(null);const W=Math.min(1400,w),H=Math.round(W*2/3),sc=Math.max(W/w,H/h),c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);g.drawImage(i,(W-w*sc)/2,(H-h*sc)/2,w*sc,h*sc);const u=c.toDataURL('image/jpeg',.8);r(u.length>200?u:null)}catch{r(null)}};i.src=x.result};x.readAsDataURL(f)});
let BR=new Map(),BS={ok:false,n:0};
const blogParse=t=>{const m=String(t).match(/BLOG_EXTRA\s*=\s*(\[[\s\S]*\])\s*;?/);if(!m)return null;try{const a=JSON.parse(m[1]);return Array.isArray(a)?a:null}catch{return null}};
const deletedIds=()=>L('blogDeleted',[]);
/* posts: local IndexedDB read and the site's blog-extra.js download run in parallel */
async function loadPosts(){
 BS={ok:false,n:0};
 const rem=(async()=>{try{const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),3000);const t=await(await fetch(siteRoot()+'static/blog-extra.js',{cache:'no-cache',signal:ctl.signal})).text();clearTimeout(tm);const a=blogParse(t);if(a){BS={ok:true,n:a.length};return a}}catch{}return[]})();
 const r=await idbDo('mygem-blog','kv','readonly',s=>s.get('posts')),local=r.ok&&Array.isArray(r.v)?r.v:[],remote=await rem;
 BR=new Map(remote.map(b=>[String(b.id),JSON.stringify(b)]));
 const del=new Set(deletedIds().map(String)),m=new Map();
 remote.forEach(b=>{if(!del.has(String(b.id)))m.set(String(b.id),b)});
 local.forEach(b=>m.set(String(b.id),b));
 BP=[...m.values()].sort((a,b)=>(b.created||0)-(a.created||0));
 if(local.length!=BP.length)savePosts()}
const blogPub=b=>BR.get(String(b.id))===JSON.stringify(b);
const savePosts=async()=>(await idbDo('mygem-blog','kv','readwrite',s=>s.put(BP,'posts'))).ok;
const draftSave=()=>{if(BE&&!BE.id)try{localStorage.setItem('blogDraft',JSON.stringify({t:BE.t,ex:BE.ex,text:BE.text,mm:BE.mm}))}catch{}};
async function setCover(f){if(!BE||!f)return;if(!f.type.startsWith('image/')||f.size>15*1024*1024)return toast('დაშვებულია მხოლოდ სურათი (მაქს. 15MB)');
 const u=await blogImg(f);if(!u)return toast('ფოტოს წაკითხვა ვერ მოხერხდა — გამოიყენეთ JPG, PNG ან WEBP');
 BE.img=u;const cv=$('#cv');if(cv&&/^(data:image\/|https:\/\/|\/images\/)/i.test(u)&&!/["'<>\\\s]/.test(u)){cv.classList.add('has');cv.style.backgroundImage='url("'+u+'")';cv.querySelector('span').innerHTML=ic(IC.img)+'ფოტოს შეცვლა'}const pv=$('#pvb');if(pv)pv.innerHTML=prevHtml()}

let tab=L('adminTab','dash'),q={items:'',itemsF:'',sort:'new',page:1,users:'',notes:'',notesC:''},gsQ='';
if(!TABS.some(t=>t[0]==tab))tab='dash';
const PER=20,NOTE_CATS=['ანგარიში','ბმული','სამუშაო','კონტაქტი','სხვა'];

/* ---------- admin auth ----------
   The password is checked by the server and stored there as a BCrypt hash.
   A browser-only password can no longer open this page.
   adminHint only remembers the e-mail/name so the panel can paint instantly on refresh;
   the server (/api/me) still verifies the session in the background. */
let ADMIN=null,SERVER_USERS=[],AUTH={err:'',email:''},LOGGING=false;
try{sessionStorage.removeItem('adminTok')}catch{}
const sess=()=>ADMIN;
const ME=()=>ADMIN?{email:ADMIN.email,name:ADMIN.name||''}:null;
const userList=()=>{const by=new Map();L('users',[]).forEach(u=>{if(u&&u.email){const c={...u};delete c.pass;by.set(String(u.email).toLowerCase(),c)}});SERVER_USERS.forEach(u=>{if(u&&u.email){const k=String(u.email).toLowerCase();by.set(k,{...(by.get(k)||{}),...u});delete by.get(k).pass}});return [...by.values()]};
function renderLogin(){
 LOGGING=false;
 $('#root').innerHTML=`<div class="login"><div class="lcard"><div class="lg">${ic(IC.items)}</div><h1>mygem.ge</h1><p class="hint" style="font-size:14px;margin-top:4px">ადმინისტრატორის შესვლა</p>
 <p class="hint">შედით იმ ელფოსტით, რომელიც სერვერზე ადმინად არის მითითებული. პაროლი ბრაუზერში არ ინახება. თუ ანგარიში ჯერ არ გაქვთ, ჯერ დარეგისტრირდით საიტზე.</p>
 <form id="lf"><label>ელ-ფოსტა<input id="lem" type="email" name="email" autocomplete="username" required value="${esc(AUTH.email)}" placeholder="admin@example.com"></label>
 <label>პაროლი<div class="pw"><input id="lpw" type="password" autocomplete="current-password" required><button type="button" class="eye" data-a="togglepw" aria-label="პაროლის ჩვენება">${ic(IC.eye)}</button></div></label>
 <div class="lerr" role="alert">${esc(AUTH.err)}</div>
 <button class="btn" type="submit" style="width:100%">შესვლა</button></form>
 <a class="lnk" href="${esc(siteBase())}">← საიტზე დაბრუნება</a></div></div>`;
 const em=$('#lem');if(em&&!em.value)em.focus();else{const pw=$('#lpw');if(pw)pw.focus()}}
/* render at most once per frame; skipped while a modal is open or a field is being typed in */
let _rt;
const rerender=()=>{cancelAnimationFrame(_rt);_rt=requestAnimationFrame(()=>{if(sess()&&!BE&&!$('#modal').classList.contains('show')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))render()})};
async function loadServerUsers(){try{const r=await admSend('/api/users');if(!r.ok)return;const d=await r.json();SERVER_USERS=Array.isArray(d.users)?d.users:[];if(tab=='users'||tab=='dash')rerender()}catch{}}
async function loadServerItems(){try{const r=await admSend('/api/listings');if(!r.ok)return;const d=await r.json();if(Array.isArray(d.listings)){S('items',d.listings);rerender()}}catch{}}
function enterAdmin(user){ADMIN={email:user.email,name:user.name||''};AUTH={err:'',email:''};try{localStorage.setItem('adminHint',JSON.stringify(ADMIN))}catch{}render();loadServerUsers();
loadServerItems();
loadServerTrash().catch(error => toast(error.message));if(BP===null)loadPosts().then(rerender)}
async function doLogin(){
 if(LOGGING)return;
 const em=$('#lem'),pwEl=$('#lpw');if(!em||!pwEl)return;
 const email=em.value.trim(),pw=pwEl.value;
 if(!email||!pw)return;
 AUTH.email=email;
 const btn=$('#lf button[type=submit]');
 const fail=m=>{LOGGING=false;AUTH.err=m;renderLogin()};
 const lk=L('adminLock',{n:0,until:0});if(lk.until>Date.now())return fail('ძალიან ბევრი მცდელობა. სცადეთ '+Math.ceil((lk.until-Date.now())/1000)+' წამში');
 LOGGING=true;if(btn){btn.disabled=true;btn.textContent='შესვლა…'}
 let r,d;try{r=await admSend('/api/auth/login',{method:'POST',body:JSON.stringify({login:email,password:pw})});d=await r.json()}catch{return fail('სერვერთან დაკავშირება ვერ მოხერხდა')}
 if(!r.ok||!d.user){lk.n=(lk.n||0)+1;if(lk.n>=5)lk.until=Date.now()+30000*Math.min(lk.n-4,10);S('adminLock',lk);return fail(d.message||'არასწორი ელ-ფოსტა ან პაროლი')}
 let meR,meD;try{meR=await admSend('/api/me');meD=await meR.json()}catch{return fail('სერვერთან დაკავშირება ვერ მოხერხდა')}
 if(!meR.ok||!meD.admin){await admSend('/api/auth/session',{method:'DELETE'}).catch(()=>{});return fail('ამ ანგარიშს ადმინისტრატორის უფლება არ აქვს')}
 S('adminLock',{n:0,until:0});LOGGING=false;enterAdmin(meD.user||d.user||{email})}
async function restoreAdmin(){
 let r,d;try{r=await admSend('/api/me');d=await r.json()}catch{if(!ADMIN)renderLogin();return}
 if(!r.ok||!d.admin){ADMIN=null;try{localStorage.removeItem('adminHint')}catch{}renderLogin();return}
 enterAdmin(d.user||{email:''})}

/* ---------- automatic expiry control ----------
   განცხადებას ვადა გასდის 1 თვეში (იგივე წესი, რაც საიტზე): ვადაგასულია → იმალება და ავტორს ეგზავნება შეტყობინება.
   განახლებისას (ადმინიდან ან საიტიდან renewedAt-ის განახლებით) ისევ ჩანდება. მოწმდება გახსნისას და ყოველ წუთში. */
function sweepExpired(){const l=items();let ch=0;
 l.forEach(p=>{if(!p||p.owner=='demo')return;const st=stateOf(p);
  if(st=='expired'&&!p.expNote){p.expNote=true;applyVis(p);notify(p.owner,`«${p.title}» – ვადა გაუვიდა (1 თვე) და გამოირთო. განაახლეთ, რომ ისევ გამოჩნდეს`);ch++}
  else if(st!='expired'&&p.expNote){delete p.expNote;applyVis(p);ch++}
  else if(st=='expired'&&!p.hold){applyVis(p);ch++}});
 if(ch)saveItems(l);return ch}
setInterval(()=>{if(sess()&&sweepExpired()&&!BE&&!$('#modal').classList.contains('show')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))render()},60000);

/* ---------- views ---------- */
const V={
dash(){const it=items(),us=userList(),pv=L('pv',{}),now=Date.now(),c={active:0,expired:0,off:0,blocked:0,hold:0};it.forEach(p=>c[stateOf(p)]++);
 const pend=it.filter(p=>p.pay&&p.pay.status=='pending').length,soon=it.filter(p=>p.vip&&p.vipUntil&&p.vipUntil>now&&p.vipUntil<now+3*DAY).length,fresh=it.filter(p=>p.created>now-DAY&&p.owner!='demo').length,views=Object.values(pv).reduce((a,b)=>a+(+b||0),0);
 const kp=(go,ico,col,bg,n,l,f)=>`<button class="kp" data-go="${go}" data-f="${f||''}" style="--c:${col};--bg2:${bg}"><i>${ic(IC[ico])}</i><div><b>${n}</b><small>${l}</small></div></button>`;
 const recent=it.filter(p=>p.owner!='demo').sort((a,b)=>b.created-a.created).slice(0,6),ru=us.slice().sort((a,b)=>(b.created||0)-(a.created||0)).slice(0,6);
 const seg=[['active','აქტიური','#12A150'],['hold','გადახდა მოწმდება','#7C4DDB'],['expired','ვადაგასული','#D49A00'],['off','გამორთული','#8A93A6'],['blocked','დაბლოკილი','#C0453F']];
 const me=ME()||{},hr=new Date().getHours(),gr=hr<5?'ღამე მშვიდობისა':hr<12?'დილა მშვიდობისა':hr<18?'გამარჯობა':'საღამო მშვიდობისა';
 return `<div class="ph"><div><h1>${gr}${me.name?', '+esc(me.name):''} 👋</h1><p>აი რა ხდება mygem.ge-ზე დღეს.</p></div></div>
 ${pend?`<div class="alert">${ic(IC.alert)}<div><b>${pend} გადახდა ელოდება შემოწმებას.</b> განცხადებები დროებით დამალულია, სანამ არ დაადასტურებთ.</div><button class="btn sm" data-go="pay">გადახდებზე გადასვლა</button></div>`:''}
 <div class="cards3">${kp('pay','pay','#C98A00','#FFF4D6',pend,'გადახდა ელოდება შემოწმებას')}${kp('items','clock','#7C4DDB','#EFE9FC',soon,'VIP ვადა ამოიწურება (3 დღე)')}${kp('items','plus','#12A150','#E4F6EB',fresh,'ახალი განცხადება (24 სთ)')}${kp('items','ban','#C0453F','#FDECEA',c.blocked,'დაბლოკილი','blocked')}</div>
 <div class="cards3">${kp('items','items','#000080','#EEF0FF',it.length,'სულ განცხადება')}${kp('users','users','#2563EB','#E3EDFF',us.length,'მომხმარებელი')}${kp('items','eye','#667085','#F2F4F7',views,'სულ ნახვა')}${kp('blog','blog','#B88F3E','#FBF3DE',(BP||[]).length,'ბლოგის სტატია')}</div>
 <div class="card"><h2>განცხადებების სტატუსები</h2><div class="split">${seg.map(([k,,col])=>`<i style="width:${it.length?c[k]/it.length*100:0}%;background:${col}"></i>`).join('')}</div><div class="legend">${seg.map(([k,l,col])=>`<span style="--c:${col}">${l}: <b>${c[k]}</b></span>`).join('')}</div></div>
 <div class="two"><div class="card"><h2 style="margin-bottom:8px">ბოლო განცხადებები</h2>${recent.map(p=>`<div class="li" data-a="view" data-id="${esc(p.id)}"><div class="th" data-th="${esc(p.id)}"></div><b>${esc(p.title)}</b><small>${fd(p.created)}</small></div>`).join('')||empty('items','ცარიელია')}</div>
 <div class="card"><h2 style="margin-bottom:8px">ახალი მომხმარებლები</h2>${ru.map(u=>`<div class="li" data-go="users" data-qs="${esc(u.email)}"><span class="av">${esc((u.name||u.email||'?')[0].toUpperCase())}</span><b>${esc((u.name||'')+' '+(u.last||''))}</b><small>${esc(u.email)}</small></div>`).join('')||empty('users','ცარიელია')}</div></div>
 <div class="card"><h2>ბექაპი</h2><p class="sub">მონაცემები ბრაუზერშია, ამიტომ პერიოდულად გადმოწერეთ ასლი (ფოტოები და ქვითრები არ შედის).</p><div class="row-a"><button class="btn" data-a="backup">${ic(IC.dl)} ბექაპის გადმოწერა</button><label class="btn alt" style="cursor:pointer">აღდგენა (ჩანაწერები)<input type="file" accept=".json" id="restore" hidden></label></div></div>`},

items(){const all=items(),pv=L('pv',{}),cnt={'':all.length};Object.keys(ST).forEach(k=>cnt[k]=0);all.forEach(p=>cnt[stateOf(p)]++);
 let l=all.slice();const f=q.itemsF,s=q.items.toLowerCase();
 if(f)l=l.filter(p=>stateOf(p)==f);
 if(s)l=l.filter(p=>[p.id,p.title,p.owner,p.loc,p.cat,p.vip,p.desc].join(' ').toLowerCase().includes(s));
 const SO={new:(a,b)=>(b.created||0)-(a.created||0),old:(a,b)=>(a.created||0)-(b.created||0),pa:(a,b)=>(a.price||0)-(b.price||0),pd:(a,b)=>(b.price||0)-(a.price||0),vw:(a,b)=>(pv[b.id]||0)-(pv[a.id]||0)};
 l.sort(SO[q.sort]||SO.new);const pages=Math.max(1,Math.ceil(l.length/PER));if(q.page>pages)q.page=pages;
 const pg=l.slice((q.page-1)*PER,q.page*PER);
 return `<div class="ph"><div><h1>განცხადებები</h1><p>${TABS[1][3]}</p></div></div>
 <div class="chips">${[['','ყველა'],...Object.entries(ST)].map(([k,v])=>`<button class="chip${f==k?' on':''}" data-f="${k}">${v}<em>${cnt[k]}</em></button>`).join('')}</div>
 <div class="toolbar"><div class="fld">${ic(IC.search)}<input id="qi" placeholder="ძებნა: დასახელება, ავტორი, ID, ქალაქი..." value="${esc(q.items)}"></div><select id="so" aria-label="დალაგება"><option value="new"${q.sort=='new'?' selected':''}>ჯერ ახალი</option><option value="old"${q.sort=='old'?' selected':''}>ჯერ ძველი</option><option value="pd"${q.sort=='pd'?' selected':''}>ფასი ↓</option><option value="pa"${q.sort=='pa'?' selected':''}>ფასი ↑</option><option value="vw"${q.sort=='vw'?' selected':''}>ყველაზე ნანახი</option></select><span class="count">ნაპოვნია: ${l.length}</span></div>
 <div class="tw"><table><thead><tr><th></th><th>დასახელება</th><th>ავტორი</th><th>ფასი</th><th>პაკეტი</th><th>სტატუსი</th><th>ნახვა</th><th>თარიღი</th><th></th></tr></thead><tbody>
 ${pg.map(p=>`<tr class="clk" data-a="view" data-id="${esc(p.id)}"><td><div class="th" data-th="${esc(p.id)}"></div></td><td><span class="t">${esc(p.title)}</span><br><span class="sub">${esc([p.loc,p.cat].filter(Boolean).join(' · '))}</span></td><td>${esc(p.owner)}</td><td>${p.nego?'შეთანხმებით':esc(p.price)+' ₾'}</td><td>${p.vip?`<span class="tag vip">${esc(p.vip)}</span>`:'<span class="sub">Regular</span>'}</td><td>${tagS(p)}</td><td>${pv[p.id]||0}</td><td>${fd(p.created)}</td><td><button class="btn sm alt" data-a="view" data-id="${esc(p.id)}">ნახვა</button></td></tr>`).join('')||`<tr><td colspan="9">${empty('items','განცხადება არ მოიძებნა','სცადეთ სხვა ფილტრი ან საძიებო სიტყვა')}</td></tr>`}</tbody></table></div>
 ${pages>1?`<div class="pager">${Array.from({length:pages},(_,i)=>`<button data-pg="${i+1}" class="${q.page==i+1?'on':''}">${i+1}</button>`).join('')}</div>`:''}`},

pay(){const it=items().filter(p=>p.pay),pend=it.filter(p=>p.pay.status=='pending').sort((a,b)=>a.pay.created-b.pay.created),done=it.filter(p=>p.pay.status!='pending').sort((a,b)=>(b.pay.verifiedAt||b.pay.created)-(a.pay.verifiedAt||a.pay.created)).slice(0,30);
 const svc=y=>esc(y.plan)+(y.days?` · ${y.days} დღე`:'')+(y.color?' + ფერადი':'')+(y.sticker?` + სტიკერები ×${y.stkN||(y.stickers||[]).length}`:'');
 return `<div class="ph"><div><h1>გადახდები</h1><p>${TABS[2][3]}</p></div></div>
 <h2 class="ch" style="margin-bottom:12px">ელოდება შემოწმებას (${pend.length})</h2>
 ${pend.length?`<div class="pays">${pend.map(p=>`<div class="pay"><span class="am">${esc(p.pay.amount)} ₾</span><a class="pt" href="#" data-a="view" data-id="${esc(p.id)}" style="text-decoration:none;color:var(--tx)">${esc(p.title)}</a><small>${esc(p.owner)}</small><small>${svc(p.pay)}</small><small>${fdt(p.pay.created)}</small><div class="row-a"><button class="btn sm alt" data-a="receipt" data-id="${esc(p.id)}">${ic(IC.receipt)} ქვითარი</button><button class="btn sm ok" data-a="payok" data-id="${esc(p.id)}">${ic(IC.check)} დადასტურება</button><button class="btn sm red" data-a="payno" data-id="${esc(p.id)}">უარყოფა</button></div></div>`).join('')}</div>`:`<div class="card">${empty('check','ყველაფერი შემოწმებულია','მოლოდინში გადახდა არ არის')}</div>`}
 <h2 class="ch" style="margin:8px 0 12px">ბოლო გადაწყვეტილებები</h2>
 <div class="tw"><table><thead><tr><th>განცხადება</th><th>ავტორი</th><th>სერვისი</th><th>თანხა</th><th>თარიღი</th><th>შედეგი</th></tr></thead><tbody>${done.map(p=>{const y=p.pay;return `<tr><td><a class="t" href="#" data-a="view" data-id="${esc(p.id)}">${esc(p.title)}</a></td><td>${esc(p.owner)}</td><td>${svc(y)}</td><td><b>${y.amount} ₾</b></td><td>${fdt(y.verifiedAt||y.created)}</td><td>${y.status=='active'?'<span class="tag t-active">დადასტურდა</span>':y.status=='rejected'?'<span class="tag t-blocked">უარყოფილია</span>'+(y.reason?' <span class="sub">'+esc(y.reason)+'</span>':''):esc(y.status)}</td></tr>`}).join('')||`<tr><td colspan="6">${empty('pay','ცარიელია')}</td></tr>`}</tbody></table></div>`},

users(){const us=userList(),it=items(),s=q.users.toLowerCase(),l=us.filter(u=>!s||[u.name,u.last,u.email,u.phone,u.username].join(' ').toLowerCase().includes(s));
 return `<div class="ph"><div><h1>მომხმარებლები</h1><p>${TABS[3][3]}</p></div></div>
 <div class="toolbar"><div class="fld">${ic(IC.search)}<input id="qu" placeholder="ძებნა: სახელი, ელ-ფოსტა, ტელეფონი..." value="${esc(q.users)}"></div><span class="count">სულ: ${l.length}</span></div>
 <div class="tw"><table><thead><tr><th>სახელი</th><th>ელ-ფოსტა</th><th>ტელეფონი</th><th>ტიპი</th><th>განცხადებები</th><th>შექმნილია</th><th></th></tr></thead><tbody>
 ${l.map(u=>`<tr><td><div class="row-a" style="align-items:center;flex-wrap:nowrap"><span class="av">${esc((u.name||u.email||'?')[0].toUpperCase())}</span><div><b>${esc((u.name||'')+' '+(u.last||''))}</b>${u.google?' <span class="tag vip">Google</span>':''}${adminList().some(a=>same(a,u.email))?' <span class="tag t-active">ადმინი</span>':''}</div></div></td><td>${esc(u.email)}</td><td>${esc(u.phone||'—')}</td><td>${esc(u.regType||'')}</td><td>${it.filter(p=>same(p.owner,u.email)).length}</td><td>${fd(u.created)}</td><td><div class="row-a"><button class="btn sm alt" data-a="userItems" data-id="${esc(u.email)}">განცხადებები</button>${same(u.email,(ME()||{}).email)?'':`<button class="btn sm red" data-a="deluser" data-id="${esc(u.email)}">წაშლა</button>`}</div></td></tr>`).join('')||`<tr><td colspan="7">${empty('users','მომხმარებელი არ მოიძებნა')}</td></tr>`}</tbody></table></div>`},

blog(){if(BP===null)return '<div class="empty">იტვირთება…</div>';
 if(BE)return `<div class="editbar"><button class="btn alt sm" data-a="bcancel">${ic(IC.back)} უკან</button><span class="ttl">${BE.id?'სტატიის რედაქტირება':'ახალი სტატია'}</span><button class="btn alt" data-a="bcancel">გაუქმება</button><button class="btn" data-a="bsave">${ic(IC.check)} ${BE.id?'შენახვა':'გამოქვეყნება'}</button></div>
 <div class="ed"><div class="card">
  <label><span class="lblrow">სათაური <small id="tc">${(BE.t||'').length}/120</small></span><input id="bt" maxlength="120" value="${esc(BE.t)}" placeholder="მაგ: როგორ შევარჩიოთ ოქროს ბეჭედი" autocomplete="off"></label>
  <div style="margin-top:16px"><label>ქავერ-ფოტო <small style="font-weight:400;color:var(--mu)">(იჭრება 3:2 პროპორციით · შეგიძლიათ ფაილი გადმოათრიოთ)</small></label><label class="cover${BE.img?' has':''}" id="cv" for="bcov" style="margin-top:6px;${BE.img?`background-image:url('${BE.img}')`:''}"><span>${ic(IC.img)}${BE.img?'ფოტოს შეცვლა':'ფოტოს ატვირთვა'}</span></label><input type="file" id="bcov" accept="image/*" hidden></div>
  <label style="margin-top:16px">მოკლე აღწერა <small style="font-weight:400;color:var(--mu)">(ბარათზე; ცარიელის შემთხვევაში ავტომატურად)</small><textarea id="be" rows="2" maxlength="220">${esc(BE.ex)}</textarea></label>
  <label style="margin-top:16px">ტექსტი</label><div class="tb"><button type="button" data-a="fmt" data-id="h">${ic(IC.head)} სათაური</button><button type="button" data-a="fmt" data-id="b">${ic(IC.bold)} მუქი</button><button type="button" data-a="fmt" data-id="l">${ic(IC.list)} სია</button></div>
  <textarea id="bb" placeholder="ყოველი ახალი ხაზი — ახალი აბზაცი">${esc(BE.text)}</textarea><p class="hint"><code># სათაური</code> · <code>- პუნქტი</code> · <code>**მუქი ტექსტი**</code></p>
  <label style="margin-top:16px;max-width:260px">კითხვის დრო, წუთი (არასავალდებულო)<input id="bm" type="number" min="1" max="99" value="${esc(BE.mm)}"></label></div>
 <div class="card pv"><div class="ch" style="margin-bottom:12px;color:var(--mu);font-size:12px;text-transform:uppercase;letter-spacing:.8px">გადახედვა</div><div id="pvb">${prevHtml()}</div></div></div>`;
 return `<div class="ph"><div><h1>ბლოგი</h1><p>${TABS[4][3]}</p></div><div class="acts"><label class="btn alt" style="cursor:pointer">${ic(IC.up)} იმპორტი<input type="file" id="impblog" accept=".js,.json,.txt" hidden></label><button class="btn alt${BP.some(b=>!blogPub(b))?' pulse':''}" data-a="expblog">${ic(IC.dl)} blog-extra.js</button><button class="btn" data-a="bnew">${ic(IC.plus)} ახალი სტატია</button></div></div>
 ${(()=>{const np=BP.filter(b=>!blogPub(b)).length;return BS.ok?`<div class="info ${np?'warn':'good'}"><b>${np?`${np} სტატია გამოსაქვეყნებელია.`:'ყველა სტატია გამოქვეყნებულია.'}</b> ${BS.n} სტატია ჩაიტვირთა საიტიდან (<code>static/blog-extra.js</code>), ახალი სტატიები მათ ემატება და არაფერი იკარგება. ${np?'გამოსაქვეყნებლად დააჭირეთ «blog-extra.js», ჩამოტვირთული ფაილი ჩააგდეთ <code>static/</code> საქაღალდეში ძველის ნაცვლად (იგივე ადგილას, სადაც აქამდე ტვირთავდით) და ბრაუზერში განაახლეთ გვერდი.':''}</div>`:`<div class="info warn"><b>საიტიდან არსებული სტატიები ვერ ჩაიტვირთა.</b> გახსენით ადმინი საიტის სერვერიდან (არა file://) ან დააჭირეთ «იმპორტი» და აირჩიეთ თქვენი ამჟამინდელი <code>blog-extra.js</code>. ახალი სტატიების გამოქვეყნებამდე ეს აუცილებელია, თორემ ძველი სტატიები ფაილიდან ამოვარდება.</div>`})()}
 <div class="posts">${BP.map(b=>`<div class="post"><div class="cv" style="background-image:url('${b.img||''}')"><span class="bdg ${blogPub(b)?'ok':'new'}">${blogPub(b)?'გამოქვეყნებულია':'გამოსაქვეყნებელი'}</span></div><div class="pb"><small>${fd(b.created)} · ${b.min||1} წთ კითხვა</small><b>${esc(b.t)}</b><p>${esc(b.ex||'')}</p><div class="row-a"><button class="btn sm" data-a="bedit" data-id="${esc(b.id)}">${ic(IC.edit)} რედაქტირება</button><a class="btn sm alt" href="${esc(link('post:'+b.id))}" target="_blank" rel="noopener">საიტზე ${ic(IC.ext)}</a><button class="btn sm red" data-a="delpost" data-id="${esc(b.id)}" aria-label="წაშლა">${ic(IC.trash)}</button></div></div></div>`).join('')}
 <button class="add-card" data-a="bnew"><div><div class="pl">${ic(IC.plus)}</div><b style="color:var(--tx2)">ახალი სტატია</b><div class="hint">სათაური, ფოტო და ტექსტი</div></div></button></div>
 <button class="fab" data-a="bnew" title="ახალი სტატია" aria-label="ახალი სტატია">${ic(IC.plus)}</button>`},

notes(){const n=L('adminNotes',[]),s=q.notes.toLowerCase(),c=q.notesC;
 const l=n.filter(x=>(!c||x.c==c)&&(!s||(x.t+' '+x.b).toLowerCase().includes(s)));
 return `<div class="ph"><div><h1>ჩანაწერები</h1><p>${TABS[5][3]}</p></div><div class="acts"><button class="btn" data-a="newnote">${ic(IC.plus)} ახალი ჩანაწერი</button></div></div>
 <div class="toolbar"><div class="fld">${ic(IC.search)}<input id="qn" placeholder="ძებნა..." value="${esc(q.notes)}"></div><select id="qc" aria-label="კატეგორია"><option value="">ყველა კატეგორია</option>${NOTE_CATS.map(k=>`<option${c==k?' selected':''}>${k}</option>`).join('')}</select></div>
 <div class="notes">${l.map(x=>`<div class="note"><small>${esc(x.c)} · ${fd(x.d)}</small><h3>${esc(x.t)}</h3><p>${esc(x.b)}</p><div class="row-a"><button class="btn sm alt" data-a="editnote" data-id="${x.id}">${ic(IC.edit)} რედაქტირება</button><button class="btn sm red" data-a="delnote" data-id="${x.id}" aria-label="წაშლა">${ic(IC.trash)}</button></div></div>`).join('')||`<div style="grid-column:1/-1">${empty('notes','ჩანაწერი არ არის','დააჭირეთ «ახალი ჩანაწერი»')}</div>`}</div>`},
 trash() {
  const list = trash().slice().sort((a, b) => b.d - a.d);

  return `
    <div class="ph">
      <div>
        <h1>ურნა</h1>
        <p>წაშლილი განცხადებები ინახება სერვერზე.</p>
      </div>
      <button class="btn alt" data-a="refreshTrash">
        განახლება
      </button>
    </div>

    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>დასახელება</th>
            <th>ავტორი</th>
            <th>წაშალა</th>
            <th>წაშლის დრო</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${list.map(entry => `
            <tr>
              <td>${esc(entry.item.title)}</td>
              <td>${esc(entry.item.owner)}</td>
              <td>${esc(entry.by || '—')}</td>
              <td>${fdt(entry.d)}</td>
              <td>
                <button
                  class="btn sm ok"
                  data-a="restoreItem"
                  data-id="${esc(entry.id)}"
                >
                  აღდგენა
                </button>
              </td>
            </tr>
          `).join('') || `
            <tr><td colspan="5">ურნა ცარიელია</td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}
};
/* ---------- render ---------- */
function render(){
 const me=ME();
 if(!me){renderLogin();return}
 sweepExpired();purgeTrash();
 const pend=items().filter(p=>p.pay&&p.pay.status=='pending').length,cur=TABS.find(t=>t[0]==tab);
 document.title=(cur?cur[1]+' · ':'')+'mygem.ge ადმინი';
 $('#root').innerHTML=`<div class="app"><aside class="side"><div class="brand"><span class="lg">${ic(IC.items)}</span><div><b>mygem.ge</b><small>ადმინ პანელი</small></div></div>${TABS.map(([k,l,g])=>`${g?`<div class="grp">${g}</div>`:''}<button class="nv${tab==k?' on':''}" data-tab="${k}" ${tab==k?'aria-current="page"':''}>${ic(IC[k])}<span>${l}</span>${k=='pay'&&pend?`<span class="bd">${pend}</span>`:''}</button>`).join('')}<div class="me"><span class="av">${esc((me.name||me.email||'A')[0].toUpperCase())}</span><div><b>${esc(me.email)}</b><a href="${esc(siteBase())}" target="_blank" rel="noopener">საიტის გახსნა ↗</a></div></div></aside>
 <section style="min-width:0"><div class="topbar"><div class="gs">${ic(IC.search).replace('<svg','<svg class="si"')}<input id="gs" placeholder="მოძებნე ყველაფერში: განცხადება, მომხმარებელი, სტატია, ჩანაწერი…" value="${esc(gsQ)}" autocomplete="off" aria-label="ძებნა"><kbd>/</kbd><div class="gsr" id="gsr"></div></div><button class="btn alt" data-a="logout" title="გასვლა">${ic(IC.logout)}<span>გასვლა</span></button></div><main>${V[tab]()}</main></section></div>`;
 if($('#gs').value)gSearch();
 thumbs();
}
/* thumbnails load in parallel */
async function thumbs(){const els=[...document.querySelectorAll('[data-th]')];if(!els.length)return;const byId=new Map(items().map(p=>[String(p.id),p]));
 await Promise.all(els.map(async el=>{const id=el.dataset.th,p=byId.get(id);let u=p&&!p._hp&&p.photos&&p.photos[0];
  if(!u&&p){const db=await idb('mygem','blobs');if(db)u=await new Promise(res=>{try{const r=db.transaction('blobs').objectStore('blobs').get('i'+id);r.onsuccess=()=>res(r.result&&r.result.photos&&r.result.photos[0]);r.onerror=()=>res(null)}catch{res(null)}})}
  if(u&&el.isConnected)el.style.backgroundImage=`url("${u}")`}))}

/* ---------- global search ---------- */
function gSearch(){const v=$('#gs').value.trim().toLowerCase(),box=$('#gsr');gsQ=$('#gs').value;if(!v){box.classList.remove('show');return}
 const m=(...a)=>a.join(' ').toLowerCase().includes(v);
 const it=items().filter(p=>m(p.id,p.title,p.owner,p.loc,p.cat)).slice(0,6),us=userList().filter(u=>m(u.name,u.last,u.email,u.phone,u.username)).slice(0,5),nt=L('adminNotes',[]).filter(x=>m(x.t,x.b)).slice(0,4),bp=(BP||[]).filter(b=>m(b.t,b.ex)).slice(0,4);
 const sec=(t,a)=>a.length?`<h4>${t}</h4>${a.join('')}`:'';
 const h=sec('განცხადებები',it.map(p=>`<a data-a="view" data-id="${esc(p.id)}">${esc(p.title)}<small>${esc(p.owner)} · ${ST[stateOf(p)]}</small></a>`))+sec('მომხმარებლები',us.map(u=>`<a data-a="gsuser" data-id="${esc(u.email)}">${esc((u.name||'')+' '+(u.last||''))}<small>${esc(u.email)}</small></a>`))+sec('ბლოგი',bp.map(b=>`<a data-a="gspost" data-id="${esc(b.id)}">${esc(b.t)}<small>სტატია</small></a>`))+sec('ჩანაწერები',nt.map(x=>`<a data-a="gsnote" data-id="${x.id}">${esc(x.t)}<small>${esc(x.c)}</small></a>`));
 box.innerHTML=h||'<div class="empty" style="padding:22px">ვერაფერი მოიძებნა</div>';box.classList.add('show')}
function gsMove(d){const a=[...document.querySelectorAll('#gsr a')];if(!a.length)return;let i=a.findIndex(x=>x.classList.contains('sel'));a.forEach(x=>x.classList.remove('sel'));i=(i+d+a.length)%a.length;a[i].classList.add('sel');a[i].scrollIntoView({block:'nearest'})}

/* ---------- helpers ---------- */
const dl=(name,text,type='text/plain')=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000)};
const go=(t,o={})=>{tab=t;S('adminTab',t);Object.assign(q,o);if(t!='blog')BE=null;closeM();render();scrollTo({top:0})};
function noteForm(id){const n=L('adminNotes',[]),e=id=='new'?{}:n.find(x=>x.id==id)||{};
 modal(`<div class="mh"><h2>${e.id?'ჩანაწერის რედაქტირება':'ახალი ჩანაწერი'}</h2><button class="btn alt sm ic" data-close aria-label="დახურვა">${ic(IC.x)}</button></div><form id="nf" class="grid2" data-id="${esc(id)}"><label>სათაური<input id="nt" value="${esc(e.t||'')}" autocomplete="off"></label><label>კატეგორია<select id="nc">${NOTE_CATS.map(k=>`<option${e.c==k?' selected':''}>${k}</option>`).join('')}</select></label><label class="full">ტექსტი<textarea id="nb" rows="6">${esc(e.b||'')}</textarea></label><p class="hint full" style="margin:0">არ შეინახოთ პაროლები აქ — ჩანაწერები დაუშიფრავად ინახება.</p><div class="full row-a"><button class="btn" type="submit">შენახვა</button><button type="button" class="btn alt" data-close>გაუქმება</button></div></form>`);
 setTimeout(()=>{const t=$('#nt');if(t)t.focus()},50)}

/* ---------- actions ---------- */
const acts={
 backup(){dl('mygem-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({adminCfg:cfg(),adminNotes:L('adminNotes',[]),items:items(),users:userList(),notes:L('notes',{}),pv:L('pv',{})}),'application/json')},
 async view(id){const p=items().find(x=>String(x.id)==id);if(!p)return;$('#gsr').classList.remove('show');
  const TL={ring:'ბეჭედი',bracelet:'სამაჯური',earring:'საყურე',watch:'საათი',brooch:'ბროში',necklace:'ყელსაბამი',coin:'მონეტა',cross:'ჯვარი',chain:'ჯაჭვი',other:'სხვა'};
  const AL={metal:'ლითონის ტიპი',pur:'სინჯი',gen:'სქესი',stone:'ქვის ტიპი',rsize:'ბეჭდის ზომა',clen:'ჯაჭვის სიგრძე (სმ)',clasp:'საკეტის ტიპი',etype:'საყურის ტიპი',bsize:'სამაჯურის ზომა (სმ)',cond:'მდგომარეობა',style:'სტილი',year:'გამოშვების წელი',brand:'ბრენდი'};
  const STK={diamond:'ბრილიანტი',new:'ახალი',star:'რჩეული',hot:'ცხელი ფასი',urgent:'სასწრაფოდ',sale:'ფასდაკლება',gift:'საჩუქარი',ring:'საქორწილო',love:'სიყვარული',crown:'პრემიუმ',ship:'მიტანა'};
  let ph=p.photos||[],video=p.video||'',audio=p.audio||'',rcpt=p.pay&&p.pay.receipt||'';
  if(p._hp||(!ph.length&&!video&&!audio)){const r=await idbDo('mygem','blobs','readonly',s=>s.get('i'+p.id));if(r.ok&&r.v){ph=r.v.photos||ph;video=r.v.video||video;audio=r.v.audio||audio;rcpt=r.v.receipt||rcpt}}
  window.__ph=ph;
  const u=userList().find(x=>same(x.email,p.owner)),pv=L('pv',{})[p.id]||0,s=stateOf(p),y=p.pay,dash='<span style="color:var(--mu)">—</span>';
  const r=(l,v)=>`<div class="dr"><dt>${l}</dt><dd>${v===''||v==null||v===false?dash:v}</dd></div>`;
  const attrs=Object.entries(p.attrs||{}).filter(([,v])=>v).map(([k,v])=>r(AL[k]||k,esc(v))).join('');
  const stks=(p.stickers||[]).map(i=>STK[i]||i),sec=t=>`<div class="sec">${t}</div>`,tbl=h=>`<dl class="dl">${h}</dl>`,demo=p.owner=='demo';
  modal(`<div class="mh"><h2>${esc(p.title)}</h2><button class="btn alt sm ic" data-close aria-label="დახურვა">${ic(IC.x)}</button></div>
  <div class="row-a">${tagS(p)} ${p.vip?`<span class="tag vip">${esc(p.vip)}</span>`:''}</div>
  <div class="mf" style="margin-top:14px;padding-top:14px">${demo?'':(s=='blocked'?`<button class="btn sm alt" data-a="unblock" data-id="${esc(p.id)}">განბლოკვა</button>`:`<button class="btn sm red" data-a="block" data-id="${esc(p.id)}">${ic(IC.ban)} დაბლოკვა</button>`)+(s=='expired'?`<button class="btn sm alt" data-a="renew" data-id="${esc(p.id)}">+1 თვით განახლება</button>`:'')+(s=='active'||s=='hold'?`<button class="btn sm alt" data-a="toggle" data-id="${esc(p.id)}">გამორთვა</button>`:s=='off'?`<button class="btn sm ok" data-a="toggle" data-id="${esc(p.id)}">ჩართვა</button>`:'')+`<button class="btn sm red" data-a="delitem" data-id="${esc(p.id)}">${ic(IC.trash)} წაშლა</button>`}<a class="btn sm" style="margin-left:auto" href="${esc(link('product:'+p.id))}" target="_blank" rel="noopener">საიტზე ნახვა ${ic(IC.ext)}</a></div>
  ${sec(`ფოტოები (${ph.length})`)}${ph.length?`<div class="gal">${ph.map((x,i)=>`<img src="${esc(x)}" data-a="bigimg" data-id="${i}" alt="">`).join('')}</div>`:'<p class="hint">ფოტო ამ ბრაუზერში ვერ მოიძებნა</p>'}
  ${video?sec('ვიდეო')+`<video src="${esc(video)}" controls style="width:100%;max-height:320px;background:#000;border-radius:10px"></video>`:''}
  ${audio?sec('ხმოვანი აღწერა')+`<audio src="${esc(audio)}" controls style="width:100%"></audio>`:''}
  ${sec('ძირითადი ინფორმაცია')}${tbl(r('ID',esc(p.id))+r('ნივთის ტიპი',esc(p.type=='other'?(p.typeOther||TL.other):TL[p.type]||p.type))+r('კატეგორია',esc(p.cat))+r('სქესი',esc(p.gender))+r('წონა',p.weight?esc(p.weight)+' გრ':'')+r('მდებარეობა',esc(p.loc))+r('ფასი',p.nego?'შეთანხმებით':esc(p.price)+' ₾ (შეყვანილია: '+(p.cur=='USD'?'$':'₾')+')')+attrs)}
  ${sec('აღწერა')}<p style="white-space:pre-wrap;word-break:break-word">${esc(p.desc||'—')}</p>
  ${sec('გამყიდველი')}${tbl(r('ელ-ფოსტა',esc(p.owner))+(u?r('სახელი',esc((u.name||'')+' '+(u.last||'')))+r('ტელეფონი',esc(u.phone))+r('მომხმარებლის სახელი',esc(u.username))+r('რეგისტრაციის ტიპი',esc(u.regType=='other'?u.regOther:u.regType))+r('Google ანგარიში',u.google?'დიახ':'არა')+r('რეგისტრირებულია',fdt(u.created)):r('მონაცემები',demo?'დემო განცხადება':'ამ ბრაუზერში ვერ მოიძებნა')))}
  ${sec('სტატუსი და ვადები')}${tbl(r('სტატუსი',ST[s])+(p.blockReason?r('დაბლოკვის მიზეზი',esc(p.blockReason)):'')+r('გამოქვეყნდა',fdt(p.created))+r('ბოლო განახლება',fdt(p.renewedAt))+r('ვადაგასვლა (1 თვე)',demo?'':fdt((p.renewedAt||p.created)+MONTH))+r('ნახვები',pv)+r('VIP ვადა',p.vipUntil?fdt(p.vipUntil):'')+r('ფერადი გამოყოფა',p.color?`<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${esc(p.colorHex||'#FFF3D6')};border:1px solid var(--line);vertical-align:middle"></span> ${esc(p.colorHex||'')} · ${fdt(p.colorUntil)}-მდე`:'არა')+r('სტიკერები',stks.length?esc(stks.join(', '))+(p.stickerUntil?' · '+fdt(p.stickerUntil)+'-მდე':''):'არა')+r('დამალულია (hold)',p.hold?'დიახ':'არა'))}
  ${y?sec('გადახდა')+tbl(r('პაკეტი',esc(y.plan)+(y.days?' · '+y.days+' დღე':''))+r('ფერადი',y.color?'დიახ':'არა')+r('სტიკერები',y.sticker?'დიახ ×'+(y.stkN||(y.stickers||[]).length):'არა')+r('თანხა',`<b>${esc(y.amount)} ₾</b>`)+r('სტატუსი',esc(y.status))+r('გაგზავნილია',fdt(y.created))+r('დაადასტურა',esc(y.verifiedBy))+r('დადასტურების დრო',fdt(y.verifiedAt))+(y.reason?r('უარყოფის მიზეზი',esc(y.reason)):'')+r('ქვითარი',rcpt?`<button class="btn sm alt" data-a="receipt" data-id="${esc(p.id)}">${ic(IC.receipt)} ნახვა</button>`:'')):''}`,true)},
 bigimg(i){const s=(window.__ph||[])[+i];if(!s||!/^(data:image\/(png|jpeg|webp|gif);|https:\/\/|\/images\/)/i.test(s))return;const w=window.open();if(!w)return toast('ბრაუზერმა ახალი ფანჯარა დაბლოკა');const img=w.document.createElement('img');img.src=s;img.style.maxWidth='100%';img.style.maxHeight='100vh';w.document.body.style.margin='0';w.document.body.style.background='#111';w.document.body.append(img)},
 block(id){modal(`<h2 style="margin-bottom:10px">განცხადების დაბლოკვა</h2><label>მიზეზი (არასავალდებულო)<textarea id="br" maxlength="300"></textarea></label><div class="row-a" style="margin-top:14px"><button class="btn red" id="mok">დაბლოკვა</button><button class="btn alt" data-close>გაუქმება</button></div>`);
  $('#mok').onclick=()=>{const l=items(),p=l.find(x=>String(x.id)==id);if(!p)return;p.state='blocked';p.blockReason=$('#br').value.trim();applyVis(p);saveItems(l);notify(p.owner,`«${p.title}» დაიბლოკა ადმინისტრატორის მიერ${p.blockReason?': '+p.blockReason:''}`);closeM();toast('დაიბლოკა');render()}},
 unblock(id){const l=items(),p=l.find(x=>String(x.id)==id);if(!p)return;p.state='';delete p.blockReason;applyVis(p);saveItems(l);notify(p.owner,`«${p.title}» – განბლოკილია`);closeM();toast('განბლოკილია');render()},
 toggle(id){const l=items(),p=l.find(x=>String(x.id)==id);if(!p||p.state=='blocked')return;const on=p.state=='off';p.state=on?'':'off';applyVis(p);saveItems(l);notify(p.owner,`«${p.title}» – ${on?'ჩართულია':'გამორთულია'} ადმინისტრატორის მიერ`);closeM();toast(on?'განცხადება ჩაირთო':'განცხადება გამოირთო');render()},
 renew(id){const l=items(),p=l.find(x=>String(x.id)==id);if(!p)return;p.renewedAt=Date.now();delete p.expNote;applyVis(p);saveItems(l);closeM();toast('+1 თვე');render()},
delitem(id) {
  const listing = items().find(p => String(p.id) === String(id));
  if (!listing) return;

  ask(
    'განცხადების წაშლა',
    `«${listing.title}» გადავა ურნაში. აღდგენა ადმინს შეუძლია.`,
    'წაშლა',
    async () => {
      try {
        const response = await admSend(
          '/api/listings/' + encodeURIComponent(id),
          { method: 'DELETE' }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.message || 'წაშლა ვერ მოხერხდა');
        }

        S('items', items().filter(
          p => String(p.id) !== String(id)
        ));

        await loadServerTrash();

        toast('გადავიდა ურნაში');
        render();
      } catch (error) {
        toast(error.message || 'სერვერთან კავშირი ვერ მოხერხდა');
      }
    }
  );
},
async refreshTrash() {
  try {
    await loadServerTrash();
    render();
  } catch (error) {
    toast(error.message || 'ურნა ვერ ჩაიტვირთა');
  }
},
 async restoreItem(id) {
  try {
    const response = await admSend(
      '/api/listings/' + encodeURIComponent(id) + '/restore',
      { method: 'PUT' }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || 'აღდგენა ვერ მოხერხდა');
    }

    await loadServerTrash();
    await loadServerItems();

    toast('განცხადება აღდგა');
    render();
  } catch (error) {
    toast(error.message || 'აღდგენა ვერ მოხერხდა');
  }
},
 purge(id){const e=trash().find(x=>String(x.id)==id);if(!e)return;ask('სამუდამოდ წაშლა',`«${e.item.title}» ვეღარ აღდგება.`,'წაშლა',async()=>{S('trash',trash().filter(x=>String(x.id)!=id));await idbDo('mygem','blobs','readwrite',s=>s.delete('t'+id));toast('წაიშალა სამუდამოდ');render()})},
 emptytrash(){const n=trash().length;if(!n)return;ask('ურნის გასუფთავება',`${n} განცხადება სამუდამოდ წაიშლება.`,'გასუფთავება',async()=>{const t=trash();S('trash',[]);for(const e of t)await idbDo('mygem','blobs','readwrite',s=>s.delete('t'+e.id));toast('ურნა გასუფთავდა');render()})},
 async receipt(id){const p=items().find(x=>String(x.id)==id);if(!p||!p.pay)return;let rc=p.pay.receipt;
  if(!rc){const r=await idbDo('mygem','blobs','readonly',s=>s.get('i'+id));rc=r.ok&&r.v?r.v.receipt:''}
  if(!rc)return toast('ქვითარი ვერ მოიძებნა (სხვა ბრაუზერში ატვირთული ფაილი ამ ბრაუზერში არ ჩანს)');
  if(p.pay.receiptType=='pdf'){try{const b=atob(rc.split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.open(URL.createObjectURL(new Blob([u],{type:'application/pdf'})))}catch{toast('PDF-ის გახსნა ვერ მოხერხდა')}return}
  modal(`<img src="${esc(rc)}" alt=""><div class="row-a" style="margin-top:14px"><button class="btn alt" data-close>დახურვა</button></div>`)},
 payok(id){const l=items(),p=l.find(x=>String(x.id)==id);if(!p||!p.pay||p.pay.status!='pending')return;const y=p.pay,now=Date.now();
  if(y.days>0){p.vip=y.plan;p.vipUntil=now+y.days*DAY}
  if(y.color){p.color=true;p.colorUntil=now+2*DAY;p.colorHex=y.colorHex||'#FFF3D6'}
  if(y.sticker){p.sticker=true;p.stickers=y.stickers||[];if(p.vip&&p.vipUntil)p.stickerUntil=p.vipUntil;else delete p.stickerUntil}
  delete p.hold;delete p.hvis;y.status='active';y.verifiedBy=(ME()||{}).email;y.verifiedAt=now;saveItems(l);
  notify(p.owner,`«${p.title}» – გადახდა დადასტურდა${y.days>0?'. '+y.plan+' აქტიურია '+fdt(p.vipUntil)+'-მდე':''}`);toast('გადახდა დადასტურდა');render()},
 payno(id){modal(`<h2 style="margin-bottom:10px">გადახდის უარყოფა</h2><label>მიზეზი (არასავალდებულო)<textarea id="br" maxlength="300"></textarea></label><div class="row-a" style="margin-top:14px"><button class="btn red" id="mok">უარყოფა</button><button class="btn alt" data-close>გაუქმება</button></div>`);
  $('#mok').onclick=()=>{const l=items(),p=l.find(x=>String(x.id)==id);if(!p||!p.pay)return;const r=$('#br').value.trim();delete p.hold;delete p.hvis;p.pay.status='rejected';p.pay.reason=r;p.pay.verifiedBy=(ME()||{}).email;p.pay.verifiedAt=Date.now();saveItems(l);notify(p.owner,`«${p.title}» – გადახდა ვერ დადასტურდა${r?': '+r:''}. განცხადება გამოქვეყნებულია Regular სტატუსით`);closeM();toast('უარყოფილია');render()}},
 deluser(email){if(same(email,(ME()||{}).email))return toast('საკუთარი თავის წაშლა შეუძლებელია');ask('მომხმარებლის წაშლა',`${email} წაიშლება (მისი განცხადებები დარჩება).`,'წაშლა',()=>{S('users',L('users',[]).filter(u=>!same(u.email,email)));toast('წაიშალა');render()})},
 userItems(email){go('items',{items:email,itemsF:'',page:1})},
 gsuser(email){go('users',{users:email})},
 gsnote(id){go('notes',{notes:'',notesC:''});noteForm(id)},
 gspost(id){go('blog');acts.bedit(id)},
 /* blog */
 bnew(){if(tab!='blog')go('blog');let d=null;try{d=JSON.parse(localStorage.getItem('blogDraft'))}catch{}
  BE={id:null,t:'',ex:'',img:'',text:'',mm:''};if(d&&(d.t||d.text)){Object.assign(BE,{t:d.t||'',ex:d.ex||'',text:d.text||'',mm:d.mm||''});toast('დრაფტი აღდგენილია')}
  render();setTimeout(()=>{const t=$('#bt');if(t)t.focus()},30);scrollTo({top:0})},
 bedit(id){const b=(BP||[]).find(x=>String(x.id)==id);if(!b)return;BE={id:b.id,t:b.t,ex:b.ex||'',img:b.img||'',text:blogTxt(b.body||[]),mm:b.mm||'',created:b.created};render();scrollTo({top:0})},
 bcancel(){BE=null;render()},
 async bsave(){if(!BE)return;const t=BE.t.trim(),Ls=blogLines(BE.text);
  if(t.length<3){$('#bt').focus();return toast('შეიყვანეთ სათაური (მინ. 3 სიმბოლო)')}if(!BE.img)return toast('აირჩიეთ ქავერ-ფოტო');if(!Ls.length){$('#bb').focus();return toast('შეიყვანეთ სტატიის ტექსტი')}
  const mm=Math.max(0,Math.min(99,Math.round(+BE.mm||0))),p={id:BE.id||'b'+Date.now().toString(36),t,ex:BE.ex.trim()||blogEx(Ls),img:BE.img,body:Ls,mm,min:mm||blogMin(Ls),created:BE.created||Date.now()},prev=BP.slice(),i=BP.findIndex(x=>String(x.id)==String(p.id));
  if(i>-1)BP[i]=p;else BP.unshift(p);
  if(!(await savePosts())){BP=prev;return toast('შენახვა ვერ მოხერხდა — ფოტო ძალიან დიდია ან მეხსიერება გადაივსო')}
  if(!BE.id)try{localStorage.removeItem('blogDraft')}catch{}
  if(deletedIds().length)S('blogDeleted',deletedIds().filter(x=>String(x)!=String(p.id)));
  BE=null;toast('სტატია შენახულია — ყველასთვის გამოსაქვეყნებლად გადმოწერეთ blog-extra.js');render();scrollTo({top:0})},
 delpost(id){const b=BP.find(x=>String(x.id)==id);if(!b)return;ask('სტატიის წაშლა',`«${b.t}» წაიშლება.`,'წაშლა',async()=>{BP=BP.filter(x=>String(x.id)!=id);S('blogDeleted',[...new Set([...deletedIds(),id])]);await savePosts();toast('წაიშალა');render()})},
 expblog(){dl('blog-extra.js','/* mygem.ge blog posts - generated '+new Date().toISOString().slice(0,10)+' */\nwindow.BLOG_EXTRA='+JSON.stringify(BP||[])+';\n','text/javascript')},
 fmt(k){const t=$('#bb');if(!t)return;const a=t.selectionStart,b=t.selectionEnd,v=t.value;
  if(k=='b'){const ins='**'+(v.slice(a,b)||'ტექსტი')+'**';t.value=v.slice(0,a)+ins+v.slice(b);t.focus();t.setSelectionRange(a,a+ins.length)}
  else{const ls=v.lastIndexOf('\n',a-1)+1;t.value=v.slice(0,ls)+(k=='h'?'# ':'- ')+v.slice(ls);t.focus()}
  t.dispatchEvent(new Event('input',{bubbles:true}))},
 logout(){ADMIN=null;try{localStorage.removeItem('adminHint')}catch{}admSend('/api/auth/session',{method:'DELETE'}).catch(()=>{});closeM();BE=null;AUTH={err:'',email:''};render()},
 togglepw(){const i=$('#lpw');if(i)i.type=i.type=='password'?'text':'password'},
 authmode(){renderLogin()},
 newnote(){noteForm('new')},editnote(id){noteForm(id)},
 delnote(id){S('adminNotes',L('adminNotes',[]).filter(x=>x.id!=id));toast('წაიშალა');render()}
};

/* ---------- events ---------- */
document.addEventListener('click',e=>{
 if(!e.target.closest('.gs')){const r=$('#gsr');if(r)r.classList.remove('show')}
 const t=e.target.closest('[data-tab]');if(t){go(t.dataset.tab);return}
 const g=e.target.closest('[data-go]');if(g){const o={};if(g.dataset.go=='items'){o.itemsF=g.dataset.f||'';o.items='';o.page=1}if(g.dataset.qs!=null)o.users=g.dataset.qs;go(g.dataset.go,o);return}
 const f=e.target.closest('.chip[data-f]');if(f){q.itemsF=f.dataset.f;q.page=1;render();return}
 const pg=e.target.closest('[data-pg]');if(pg){q.page=+pg.dataset.pg;render();scrollTo({top:0});return}
 const all=[...e.composedPath().filter(n=>n.dataset&&n.dataset.a&&acts[n.dataset.a])];
 /* the innermost action wins (button inside a clickable row) */
 const a=all[0];if(a){e.preventDefault();acts[a.dataset.a](a.dataset.id)}});
document.addEventListener('input',e=>{const i=e.target.id,map={qi:'items',qu:'users',qn:'notes'};
 if(i=='gs'){gSearch();return}
 if(map[i]){q[map[i]]=e.target.value;if(i=='qi')q.page=1;const p=e.target.selectionStart;clearTimeout(window._qt);window._qt=setTimeout(()=>{render();const n=$('#'+i);if(n){n.focus();n.setSelectionRange(p,p)}},120);return}
 const bk={bt:'t',be:'ex',bb:'text',bm:'mm'}[i];
 if(BE&&bk){BE[bk]=e.target.value;if(i=='bt'){const c=$('#tc');if(c)c.textContent=e.target.value.length+'/120'}const pv=$('#pvb');if(pv)pv.innerHTML=prevHtml();draftSave()}});
document.addEventListener('change',async e=>{const i=e.target.id;
 if(i=='so'){q.sort=e.target.value;render()}
 if(i=='qc'){q.notesC=e.target.value;render()}
 if(i=='restore'){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d.adminNotes)S('adminNotes',d.adminNotes);toast('ჩანაწერები აღდგა');render()}catch{toast('ფაილი არასწორია')}};r.readAsText(f)}
 if(i=='impblog'){const f=e.target.files[0];e.target.value='';if(!f)return;const a=blogParse(await f.text());if(!a)return toast('ფაილი არასწორია — საჭიროა blog-extra.js');
  const m=new Map((BP||[]).map(b=>[String(b.id),b]));a.forEach(b=>{if(b&&b.id)m.set(String(b.id),b)});BP=[...m.values()].sort((x,y)=>(y.created||0)-(x.created||0));
  BR=new Map(a.map(b=>[String(b.id),JSON.stringify(b)]));BS={ok:true,n:a.length};S('blogDeleted',[]);await savePosts();toast(a.length+' სტატია იმპორტირდა');render()}
 if(i=='bcov'&&BE){const f=e.target.files[0];e.target.value='';await setCover(f)}});
/* drag & drop cover */
document.addEventListener('dragover',e=>{const c=e.target.closest&&e.target.closest('#cv');if(c){e.preventDefault();c.classList.add('drag')}});
document.addEventListener('dragleave',e=>{const c=e.target.closest&&e.target.closest('#cv');if(c)c.classList.remove('drag')});
document.addEventListener('drop',async e=>{const c=e.target.closest&&e.target.closest('#cv');if(c){e.preventDefault();c.classList.remove('drag');await setCover(e.dataTransfer.files[0])}});
document.addEventListener('submit',e=>{e.preventDefault();
 if(e.target.id=='lf'){doLogin();return}
 if(e.target.id=='nf'){const t=$('#nt').value.trim();if(!t)return toast('შეიყვანეთ სათაური');const id=e.target.dataset.id,l=L('adminNotes',[]),o={id:id=='new'?uid():id,t,c:$('#nc').value,b:$('#nb').value.trim(),d:Date.now()},i=l.findIndex(x=>x.id==o.id);if(i>-1)l[i]=o;else l.unshift(o);S('adminNotes',l);closeM();toast('შენახულია');render()}});
document.addEventListener('keydown',e=>{
 /* Enter in the login form logs in immediately */
 if(e.key=='Enter'&&e.target.closest&&e.target.closest('#lf')&&e.target.tagName=='INPUT'){e.preventDefault();doLogin();return}
 const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
 if((e.key=='/'&&!typing)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()=='k')){const g=$('#gs');if(g){e.preventDefault();g.focus();g.select()}}
 if(e.key=='Escape'){closeM();const r=$('#gsr');if(r)r.classList.remove('show')}
 if(document.activeElement&&document.activeElement.id=='gs'){
  if(e.key=='ArrowDown'){e.preventDefault();gsMove(1)}
  if(e.key=='ArrowUp'){e.preventDefault();gsMove(-1)}
  if(e.key=='Enter'){const s=$('#gsr a.sel')||$('#gsr a');if(s){e.preventDefault();s.click()}}}
 if(BE&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()=='s'){e.preventDefault();acts.bsave()}});
window.addEventListener('storage',()=>{if(!BE&&!$('#modal').classList.contains('show'))render()});

/* ---------- start ----------
   1) if this browser was signed in before, paint the panel immediately from local data
   2) load blog posts in parallel with the server session check
   3) the server (/api/me) is still the only thing that decides whether the session is valid */
try{const h=JSON.parse(localStorage.getItem('adminHint'));if(h&&h.email){ADMIN={email:h.email,name:h.name||''};render()}}catch{}
loadPosts().then(rerender);
restoreAdmin();