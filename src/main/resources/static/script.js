const $=s=>document.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{toast('მეხსიერება გადაივსო — წაშალეთ ძველი განცხადებები ან გამოიყენეთ ნაკლები ფოტო');return false}};
/* Listing photos and payment receipts are heavy (base64) and are kept in IndexedDB; localStorage keeps only the light JSON plus an "_hp" pointer.
   RULE: a photo is stripped from the localStorage copy only AFTER IndexedDB has confirmed that it holds the record (IDB.sig[key] === signature of the data).
   Until then it stays inline, so a failed / slow / interrupted IndexedDB write can never make a photo vanish (this used to happen: the listing was
   "published", the photo was shown until the next refresh and then it was gone).
   save() returns true/false. commitItems() (publish + photo editor) additionally waits for the writes and READS EVERYTHING BACK before it reports success.
   If IndexedDB is unavailable everything falls back to inline localStorage storage. */
const lsTry=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const isData=s=>typeof s=='string'&&s.startsWith('data:');
const heavy=p=>(p.photos||[]).some(isData)||!!(p.pay&&p.pay.receipt)||isData(p.video)||isData(p.audio);
const hsh=x=>{x=String(x||'');let a=0;const st=Math.max(1,x.length>>8);for(let i=0;i<x.length;i+=st)a=(a*31+x.charCodeAt(i))|0;return a};
const _sc=new WeakMap();
const recSig=r=>{let s=_sc.get(r);if(s===undefined){s=recSig0(r);_sc.set(r,s)}return s};
const recSig0=r=>(r.photos||[]).length+'|'+(r.photos||[]).reduce((a,x)=>a+x.length,0)+'|'+(r.photos||[]).reduce((a,x)=>(a*17+hsh(x))|0,0)+'|'+String(r.receipt||'').length+'|'+hsh(r.receipt)+'|'+String(r.video||'').length+'|'+hsh(r.video)+'|'+String(r.audio||'').length+'|'+hsh(r.audio);
const recOf=p=>({photos:p.photos||[],receipt:p.pay?p.pay.receipt||'':'',video:p.video||'',audio:p.audio||''});
const IDB={db:null,ok:false,ready:false,dead:false,dirty:false,sig:{},bad:{},fly:{},jobs:{},
 open(){return new Promise(r=>{let end=false;const fin=v=>{if(!end){end=true;r(v)}},tm=setTimeout(()=>{IDB.dead=true;fin(false)},4000);
  try{const q=indexedDB.open('mygem',1);q.onupgradeneeded=()=>q.result.createObjectStore('blobs');
   q.onsuccess=()=>{clearTimeout(tm);if(IDB.dead){try{q.result.close()}catch{}return fin(false)}IDB.db=q.result;IDB.ok=true;fin(true)};
   q.onerror=q.onblocked=()=>{clearTimeout(tm);fin(false)}}catch{clearTimeout(tm);fin(false)}})},
 /* every call resolves {ok:true,v} or {ok:false}: a missing record is {ok:true,v:undefined}, a failed read is {ok:false} - they must never be confused */
 tx(mode,fn){return new Promise(r=>{let end=false;const fin=v=>{if(!end){end=true;clearTimeout(tm);r(v)}},tm=setTimeout(()=>fin({ok:false}),20000);
  try{const t=IDB.db.transaction('blobs',mode),q=fn(t.objectStore('blobs'));t.oncomplete=()=>fin({ok:true,v:q?q.result:undefined});t.onerror=t.onabort=()=>fin({ok:false})}catch{fin({ok:false})}})},
 get:k=>IDB.tx('readonly',s=>s.get(k)),
 put:(k,v)=>IDB.tx('readwrite',s=>s.put(v,k)),
 del:k=>IDB.tx('readwrite',s=>s.delete(k)),
 keys:()=>IDB.tx('readonly',s=>s.getAllKeys()),
 busy:()=>Object.keys(IDB.jobs).length>0};
let HYD=Promise.resolve();
function saveItems(v,quiet){
 if(!IDB.ok)return lsSet('items',v);
 if(!IDB.ready){IDB.dirty=true;lsTry('items',v);return true}   /* still restoring: write what we have, hydrate() saves again when it is done */
 const live=new Set();let inl=false;
 const out=v.map(p=>{const k='i'+p.id;
  if(p._hp){live.add(k);return p}                              /* not restored (read error): keep the pointer, never touch the stored record */
  if(!heavy(p))return p;
  live.add(k);const sg=recSig(recOf(p));
  if(IDB.sig[k]===sg){const o={...p,photos:[],video:'',audio:'',_hp:1};if(p.pay)o.pay={...p.pay,receipt:''};return o}   /* confirmed in IndexedDB -> light copy */
  if(IDB.bad[k]===sg){inl=true;return p}                       /* IndexedDB refused this record -> keep it inline */
  if(IDB.fly[k]!==sg){IDB.fly[k]=sg;
   IDB.jobs[k]=IDB.put(k,recOf(p)).then(r=>{if(IDB.fly[k]===sg){delete IDB.fly[k];delete IDB.jobs[k]}
    if(r&&r.ok)IDB.sig[k]=sg;else IDB.bad[k]=sg;
    saveItems(items)})}                                        /* once confirmed (or refused) write localStorage again */
  return p});                                                  /* until confirmed: photos stay inline */
 Object.keys(IDB.sig).forEach(k=>{if(!live.has(k)){delete IDB.sig[k];IDB.del(k)}});
 if(lsTry('items',out))return true;
 if(!inl&&IDB.busy())return true;                              /* too big to hold inline, but IndexedDB is still writing: the next save fixes it */
 if(!quiet)toast('მეხსიერება გადაივსო — წაშალეთ ძველი განცხადებები ან გამოიყენეთ ნაკლები ფოტო');return false}
/* does the stored copy really contain this listing and its photos? (reads localStorage and IndexedDB back) */
async function verifyItem(p){const st=load('items',[]).find(x=>String(x.id)===String(p.id));
 if(!st)return false;if(!heavy(p))return true;
 if(st._hp){const r=await IDB.get('i'+p.id);return !!(r.ok&&r.v&&recSig(r.v)===recSig(recOf(p)))}
 const sp=st.photos||[],pp=p.photos||[];
 return sp.length==pp.length&&sp.every((x,i)=>x===pp[i])&&String((st.pay&&st.pay.receipt)||'')==String((p.pay&&p.pay.receipt)||'')&&String(st.video||'')==String(p.video||'')&&String(st.audio||'')==String(p.audio||'')}
/* publish-grade save: resolves true ONLY when the listing and its photos are verified in storage */
async function commitItems(p){
 try{await HYD}catch{}
 const ok=await pushListing(p);
 if(ok)saveItems(items,true);
 return ok}
async function pushListing(p){
 if(!p||p.owner==='demo')return true;
 const res=await apiSend('PUT','/api/listings',p,30000);
 if(!res.ok){toast(res.data.message||'სერვერზე შენახვა ვერ მოხერხდა');return false}
 if(Array.isArray(res.data.photos)&&res.data.photos.length===(p.photos||[]).length&&res.data.photos.some(u=>typeof u==='string'&&(u.startsWith('https://')||u.startsWith('/')||u.startsWith('listings/')))){p.photos=res.data.photos;saveItems(items)}
 return true}
async function restoreSession(){
 try{localStorage.removeItem('mygemTok')}catch{}
 const res=await apiSend('GET','/api/me');
 if(!res.ok){if(res.status===401){me=null;save('me',null)}return}
 adopt({user:res.data.user,admin:!!res.data.admin});
 if(me&&Array.isArray(res.data.notes)){
 const key=n=>(+n.d||0)+'|'+n.t,
  local=notes[me.email]||[],
  lmap=new Map(local.map(n=>[key(n),n])),
  srv=res.data.notes.map(n=>({...n,r:(n.r||(lmap.get(key(n))||{}).r)?1:0})),
  sk=new Set(srv.map(key)),
  extra=local.filter(n=>!sk.has(key(n)));
 notes[me.email]=srv.concat(extra).sort((a,b)=>(+b.d||0)-(+a.d||0)).slice(0,100);
 save('notes',notes);setBadge();
 
}
 if(Array.isArray(res.data.favs)){favs=res.data.favs;save('favs',favs)}}
async function pullListings(){
 const res=await apiSend('GET','/api/listings');
 if(!res.ok||!Array.isArray(res.data.listings))return;
 const remote=res.data.listings.filter(p=>p&&p.id&&p.owner!=='demo');
 const ids=new Set(remote.map(p=>String(p.id)));
 const kept=new Map();
 for(const p of items){if(p&&p.id&&Array.isArray(p.photos)&&p.photos.length)kept.set(String(p.id),p.photos.slice())}
 const mine=me?items.filter(p=>p&&p.owner!=='demo'&&same(p.owner,me.email)&&!ids.has(String(p.id))):[];
 items=remote.concat(mine);
 const heal=[];
 for(const p of remote){if(!me||!same(p.owner,me.email)||(p.photos&&p.photos.length))continue;const ph=kept.get(String(p.id));if(ph){p.photos=ph;heal.push(p)}}
 saveItems(items);
 const pend=[...mine,...heal].filter(p=>!p._synced);
setTimeout(()=>Promise.allSettled(pend.map(p=>pushListing(p).then(ok=>{if(ok)p._synced=1}))),3000)}
const stripPass=v=>{if(Array.isArray(v))v.forEach(u=>{if(u&&typeof u==='object')delete u.pass});else if(v&&typeof v==='object')delete v.pass;return v};
const save=(k,v)=>k=='items'?saveItems(v):lsSet(k,(k=='users'||k=='me')?stripPass(v):v);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PHOTO_BASE = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'https://mygem.ge/uploads/'
  : '/uploads/';

const fixPh = s => {
  if (typeof s !== 'string') return s;
  if (s.startsWith('listings/')) return PHOTO_BASE + s;
  if (s.startsWith('/uploads/')) {
    return PHOTO_BASE + s.slice('/uploads/'.length);
  }
  return s;
};
const safeUrl=s=>{s=fixPh(String(s||''));
 if(s.startsWith('data:image/jpeg;')||s.startsWith('data:image/png;')||s.startsWith('data:image/webp;')||s.startsWith('data:image/gif;')||s.startsWith('data:video/')||s.startsWith('data:audio/')||s.startsWith('data:application/pdf;'))return esc(s);
 if((s.startsWith('/images/')||s.startsWith('/static/')||s.startsWith('/uploads/'))&&!s.includes('..')&&!s.includes('\\')&&!s.includes('//'))return esc(s);
 try{const u=new URL(s,location.origin);if(u.protocol==='https:'||(u.protocol==='http:'&&u.origin===location.origin))return esc(u.href)}catch{}
 return ''};
/* background-image for a photo: quotes / brackets / spaces in a path can no longer break the style attribute (data: URLs are unaffected) */
const _bu=new Map();
const blobUrl=s=>{if(!isData(s)||s.length<2000)return s;let u=_bu.get(s);if(u)return u;
 try{const m=s.match(/^data:([^;]+);base64,([\s\S]*)$/),b=atob(m[2]),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);
  u=URL.createObjectURL(new Blob([a],{type:m[1]}));_bu.set(s,u);return u}catch{return s}};
const bgi = s => {
  s = blobUrl(fixPh(String(s || '')));
  return s
    ? `background-image:url('${esc(s.replace(/[\\'"()\s]/g,
        c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')
      ))}')`
    : '';
};
let users=load('users',[]),me=load('me',null),favs=load('favs',[]),notes=load('notes',{}),F={},pc={};
if(me)delete me.admin;
if(users.some(u=>u&&Object.prototype.hasOwnProperty.call(u,'pass'))||(me&&Object.prototype.hasOwnProperty.call(me,'pass'))){save('users',users);if(me)save('me',me)}
try{localStorage.removeItem('mygemTok')}catch{}
async function apiSend(method,url,body,ms){const headers={'Content-Type':'application/json','X-MyGem':'1'};
 const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),typeof ms=='number'?ms:8000);
 let r;try{r=await fetch(url,{method,headers,credentials:'include',signal:ac.signal,body:body==null?undefined:JSON.stringify(body)})}catch{clearTimeout(tm);return {ok:false,status:0,data:{error:'network',message:'სერვერთან დაკავშირება ვერ მოხერხდა'}}}
 clearTimeout(tm);
 const data=await r.json().catch(()=>({}));return {ok:r.ok&&data.ok!==false,status:r.status,data}}
function adopt(d){if(!d||!d.user)return;try{localStorage.removeItem('mygemTok')}catch{}const u={...d.user};delete u.pass;if(typeof d.admin==='boolean')u.admin=d.admin;
 let idx=users.findIndex(x=>same(x.email,u.email));if(idx<0&&me)idx=users.findIndex(x=>same(x.email,me.email));
 if(idx>=0)users[idx]={...users[idx],...u};else users.push(u);me=users.find(x=>same(x.email,u.email))||u;save('users',users);save('me',me)}
const curOf=id=>pc[id]||((items.find(x=>String(x.id)===String(id))||{}).cur)||'GEL';
if(me&&!me.created){me.created=Date.now();users=users.map(u=>u.email==me.email?me:u);save('users',users);save('me',me)}

/* ---------- validation helpers ---------- */
const same=(a,b)=>String(a).toLowerCase()==String(b).toLowerCase();
const isEmail=e=>e.length<=254&&!e.includes('..')&&/^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(e);
const isPhone=p=>{const d=p.replace(/\D/g,'');return /^\+?[0-9\s-]+$/.test(p)&&d.length>=9&&d.length<=15};
const pwMsg=p=>!p?'შეიყვანეთ პაროლი':p.length<8?'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს':!/[A-Za-zႠ-ჿ]/.test(p)||!/\d/.test(p)?'პაროლი უნდა შეიცავდეს ასოსაც და ციფრსაც':'';
const nameMsg=(n,w='სახელი')=>!n?`შეიყვანეთ ${w}`:n.length<2?'მინიმუმ 2 სიმბოლო':'';
const wc=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const emailMsg=e=>!e?'შეიყვანეთ ელ-ფოსტა':!isEmail(e)?'არასწორი ელ-ფოსტა (მაგ: name@gmail.com)':'';
const unameMsg=(v,self='')=>!v?'შეიყვანეთ მომხმარებლის სახელი':!/^[A-Za-z0-9._-]{3,20}$/.test(v)?'3–20 სიმბოლო: ლათინური ასოები, ციფრები, . _ -':users.some(x=>x.username&&same(x.username,v)&&!same(x.email,self))?'ეს მომხმარებლის სახელი დაკავებულია':'';
const loginMsg=v=>!v?'შეიყვანეთ ელ-ფოსტა ან მომხმარებლის სახელი':v.includes('@')?emailMsg(v):'';
function err(el,msg){const w=el.closest('label,.fld');if(!w)return;w.classList.add('bad');let e=w.querySelector(':scope>.fe');if(!e){e=document.createElement('em');e.className='fe';w.append(e)}e.textContent=msg}
function clearOne(w){w.classList.remove('bad');const e=w.querySelector(':scope>.fe');if(e)e.remove()}
const clr=root=>$$('.bad',root).forEach(clearOne);
function check(root,list){clr(root);let n=0,first=null;list.forEach(([el,m])=>{if(m){err(el,m);n++;first=first||el}});
 if(first){const f=first.matches('.dd')?first.querySelector('button'):first;if(f.focus)f.focus({preventScroll:true});(first.closest('.bad')||first).scrollIntoView({block:'center',behavior:'smooth'})}return n}
['input','change'].forEach(ev=>document.addEventListener(ev,e=>{const w=e.target.closest&&e.target.closest('.bad');if(w)clearOne(w)}));

/* ---------- data ---------- */
const CATS=['ოქრო','ვერცხლი','ბრილიანტი','პლატინა','საათი'],GEN=['ქალის','კაცის','უნისექსი'];
const ICONS={
 ring:'<circle cx="12" cy="15" r="6"/><path d="M9 6l3-3 3 3-3 3z"/>',
 bracelet:'<ellipse cx="12" cy="12" rx="9" ry="6"/><ellipse cx="12" cy="12" rx="5.5" ry="3"/>',
 earring:'<circle cx="12" cy="4.5" r="1.8"/><path d="M12 6.5v4"/><path d="M12 10.5l4 4-4 6-4-6z"/>',
 watch:'<rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6l1-4h4l1 4M9 18l1 4h4l1-4M12 10v3l2 1"/>',
 brooch:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
 necklace:'<path d="M4 4c0 8 3 12 8 12s8-4 8-12"/><path d="M12 16l-2.5 3 2.5 3 2.5-3z"/>',
 coin:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9v6"/>',
 cross:'<path d="M10 3h4v6h6v4h-6v8h-4v-8H4V9h6z"/>',
 chain:'<rect x="3" y="8" width="11" height="8" rx="4"/><rect x="10" y="8" width="11" height="8" rx="4"/>',
 other:'<path d="M12 3l2.5 6 6.5.5-5 4.3 1.6 6.4-5.6-3.5-5.6 3.5L8 13.8 3 9.5 9.5 9z"/>'};
const TYPES=[['ring','ბეჭედი'],['bracelet','სამაჯური'],['earring','საყურე'],['watch','საათი'],['brooch','ბროში'],['necklace','ყელსაბამი'],['coin','მონეტა'],['cross','ჯვარი'],['chain','ჯაჭვი'],['other','სხვა']];
const TL=Object.fromEntries(TYPES);
const GEM='<svg class="pi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l-1 6 4 12M15 3l1 6-4 12"/></svg>';
const CROWN='<svg class="crown" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7l4.500 4L12 4l4.500 7L21 7l-2 11H5z"/><rect x="5" y="19.500" width="14" height="2" rx="1"/></svg>';
const vr=p=>p.vip=='SUPER VIP'?2:p.vip?1:0;
const rk=p=>{const k=pkgOf(p);return k=='SUPER VIP'?2:k?1:0};
const fresh=p=>Math.max(+p.created||0,(p.pay&&+p.pay.verifiedAt)||0);
/* დამატებითი სერვისები (ფერი / სტიკერი): რაც უფრო მეტი აქვს, მით უფრო წინ დგას იმავე პაკეტის შიგნით */
const addon=p=>(cardHex(p)?1:0)+(stkIds(p).length?1:0);
const byPkg=(a,b)=>rk(b)-rk(a)||addon(b)-addon(a)||stkIds(b).length-stkIds(a).length||fresh(b)-fresh(a);
const sortPkg=l=>l.map(p=>({p,a:rk(p),b:addon(p),c:stkIds(p).length,d:fresh(p)}))
 .sort((x,y)=>y.a-x.a||y.b-x.b||y.c-x.c||y.d-x.d).map(x=>x.p);
/* paid packages (VIP / Super VIP) stay hidden from the public until the admin confirms the payment; Regular listings go live at once */
const held=p=>!!p.hold&&!(me&&(same(me.email,p.owner)||isAdmin()));
const pub=()=>items.filter(p=>!held(p));
/* Home section of a listing is decided ONLY by the package: the verified one (p.vip), or - for the owner - the package of their own pending order.
   Colour / sticker add-ons never move a listing into a VIP section. */
const pkgOf=p=>p.vip?p.vip:(p.pay&&p.pay.status=='pending'&&me&&same(me.email,p.owner)?p.pay.plan:'');
const ico=k=>`<svg class="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;
const typeName=p=>p.type?(p.type=='other'?(p.typeOther||TL.other):TL[p.type]||''):'';
const mk=a=>a.map(x=>[String(x),String(x)]);
const REG=[['individual','ფიზიკური პირი'],['store','მაღაზია'],['brand','ბრენდი'],['other','სხვა']];
const DD={cat:mk(CATS),gen:mk(GEN),type:TYPES.map(([k,l])=>[k,l,k]),reg:REG};
/* ---------- category-specific fields ---------- */
const METALS=['თეთრი ოქრო','ვარდისფერი ოქრო','ოქრო','ყვითელი ოქრო','ვერცხლი','პლატინა'],GOLDM=['თეთრი ოქრო','ვარდისფერი ოქრო','ოქრო','ყვითელი ოქრო'];
const PUR_G=['375','500','583','584','585','750','875','916','958','999'],PUR_S=['800','830','875','925','960','999'],PUR_P=['850','900','950','999'];
const purFor=m=>GOLDM.includes(m)?PUR_G:m=='ვერცხლი'?PUR_S:m=='პლატინა'?PUR_P:[...new Set([...PUR_G,...PUR_S,...PUR_P])].sort((a,b)=>a-b);
const STONES=['აკვამარინი','ალმასი','ამეთვისტო','ბრილიანტი','გრანატი','ზურმუხტი','თვლები','კორალი','კუბური ცირკონია','ლალი','მარგალიტი','საფირონი','სერდოლიკი','ტოპაზი','ქვის გარეშე'];
const LOC=['თბილისი','ბათუმი','ქუთაისი','რუსთავი','გორი','ზუგდიდი','ფოთი','ხაშური','თელავი','სხვა'];
const FD={metal:{l:'ლითონის ტიპი',o:METALS},pur:{l:'სინჯი'},gen:{l:'სქესი',o:GEN},stone:{l:'ქვის ტიპი',o:STONES},
 rsize:{l:'ბეჭდის ზომა',o:Array.from({length:15},(_,i)=>String(15+i*.5))},clen:{l:'ჯაჭვის სიგრძე (სმ)',o:['35','40','45','50','55','60','70','80']},
 clasp:{l:'საკეტის ტიპი',o:['ბოქლი','კარაბინი']},etype:{l:'საყურის ტიპი',o:['სტუდები','ჩამოკიდებული','ჯაჭვიანი','ჰუფები']},
 bsize:{l:'სამაჯურის ზომა (სმ)',o:['15','16','17','18','19','20','21','22']},cond:{l:'მდგომარეობა',o:['ახალი','ახალივით','კარგი','მცირე გამოყენების კვალი','ანტიკური','მეორადი']},
 style:{l:'სტილი',o:['თანამედროვე','კლასიკური','მინიმალისტური','საქორწილო','ლუქსი']},year:{l:'გამოშვების წელი',o:['1800-1850','1850-1900','1900-1950','1950-2000','2000-2005']},brand:{l:'ბრენდი',t:'text'}};
/* price and weight are always present in the form/filters; the lists below hold the extra fields */
const FS={ring:['metal','pur','gen','stone','rsize','cond','style'],necklace:['metal','pur','gen','stone','clen','clasp','cond','style'],
 earring:['metal','pur','gen','stone','etype','cond','style'],cross:['metal','pur','gen'],other:['metal','pur','gen','stone','cond','style'],
 bracelet:['metal','pur','gen','bsize','cond'],brooch:['metal','pur','gen','cond'],coin:['metal','pur','cond','year'],
 watch:['metal','pur','cond','gen','brand'],chain:['metal','pur','cond','gen']};
const fkeys=t=>FS[t]||['metal','pur','gen'];
const av=(p,k)=>k=='gen'?p.gender:(p.attrs||{})[k];
/* filter option lists per item type (exactly the options requested); a type missing here (ring, or no type chosen) uses the full lists above */
const GF=[['ქალის','ქალი'],['კაცის','მამაკაცი']],GF1=[['ქალის','ქალი']],GF2=[['კაცის','მამაკაცი'],['ქალის','ქალი']];
const cm=l=>l.map(x=>[x,x+' სმ']);
const FF={
 ring:{metal:METALS,pur:purFor(''),gen:GF2,stone:STONES,rsize:FD.rsize.o,cond:FD.cond.o,style:FD.style.o},
 necklace:{metal:METALS,pur:purFor(''),gen:GF2,stone:STONES,clen:cm(FD.clen.o),clasp:FD.clasp.o,cond:FD.cond.o,style:FD.style.o},
 earring:{metal:METALS,pur:purFor(''),gen:GF2,stone:STONES,etype:FD.etype.o,cond:FD.cond.o,style:FD.style.o},
 cross:{metal:METALS,pur:purFor(''),gen:GF2},
 bracelet:{metal:METALS,pur:purFor(''),gen:GF2,bsize:cm(FD.bsize.o),cond:FD.cond.o},
 brooch:{metal:METALS,pur:purFor(''),gen:GF2,cond:FD.cond.o},
 coin:{metal:METALS,pur:purFor(''),cond:FD.cond.o,year:FD.year.o},
 watch:{metal:METALS,pur:purFor(''),cond:FD.cond.o,gen:GF2,brand:[]},
 chain:{metal:METALS,pur:purFor(''),cond:FD.cond.o,gen:GF2},
 other:{metal:METALS,pur:purFor(''),gen:GF2,stone:STONES,cond:FD.cond.o,style:FD.style.o}};
const toPairs=l=>l.map(x=>Array.isArray(x)?x:[String(x),String(x)]);
let FCUR='GEL';   /* ფილტრის ვალუტა: 'GEL' ან 'USD' */
const priceSym=()=>FCUR=='USD'?'$':'₾';
const RG_P=[[100,300,500,1000,2000,5000],[300,500,1000,2000,5000,10000]];
const RG_W=[[1,3,5,10,20,50],[3,5,10,20,50,100]];
const rgFld=(key,label,a,b,pre,top)=>`<div class="fld prng rg" data-rg="${key}"><span>${label}</span><div class="rg-w"><button type="button" class="rg-btn" aria-haspopup="true" aria-expanded="false"><span class="rg-val ph">ყველა</span><span class="car">▾</span></button><div class="rg-pop">${top}<div class="prow"><input id="${a}" type="number" min="0" step="any" placeholder="დან" aria-label="დან"><i aria-hidden="true">–</i><input id="${b}" type="number" min="0" step="any" placeholder="მდე" aria-label="მდე"></div><div class="rg-cols">${pre.map((l,c)=>`<div>${l.map(v=>`<button type="button" class="rg-p" data-t="${c?b:a}" data-v="${v}">${v}</button>`).join('')}</div>`).join('')}</div><button type="button" class="btn rg-ok">არჩევა</button></div></div></div>`;
const priceFld=()=>rgFld('p','ფასი (<b data-pcur>'+priceSym()+'</b>)','fp1','fp2',RG_P,`<div class="rg-top"><button type="button" class="cur sm${FCUR=='USD'?' on':''}" id="fCur" role="switch" aria-checked="${FCUR=='USD'}" aria-label="ფასი დოლარში"><span class="cl">₾</span><span class="trk"><i></i></span><span class="cl">$</span></button></div>`);
const wFld=()=>rgFld('w','წონა (გრ)','fw1','fw2',RG_W,'');
const fRender=(pre,t)=>{
 if(pre=='f'){const sp=FF[t],keys=sp?Object.keys(sp):fkeys(t);
  return `<div class="pwrow">${priceFld()}${wFld()}</div>`+keys.map(k=>{const d=FD[k],id='f_'+k;if(d.t=='text')return `<label>${d.l}<input id="${id}" maxlength="40"></label>`;
   const list=sp?toPairs(sp[k]):mk(k=='pur'?purFor(''):d.o);return fld(d.l,dd(id,{list,all:'ყველა'}))}).join('')}
 return fkeys(t).map(k=>{const d=FD[k],id=pre+'_'+k;return d.t=='text'?`<label>${d.l}<input id="${id}" maxlength="40"></label>`:fld(d.l,dd(id,{list:mk(k=='pur'?purFor(''):d.o),ph:'აირჩიეთ...'}))}).join('')};
function readDyn(pre){const o={};for(const k in FD){const el=$('#'+pre+'_'+k);if(!el)continue;const v=FD[k].t=='text'?el.value.trim():el.dataset.val;if(v)o[k]=v}return o}
const readNum=()=>{const o={};['fp1','fp2','fw1','fw2'].forEach(i=>{const e=$('#'+i);if(e)o[i]=e.value});return o};
function syncPur(pre){const m=$('#'+pre+'_metal'),p=$('#'+pre+'_pur');if(!p)return;const dc=$('#'+pre+'Dyn');if(pre=='f'&&dc&&FF[dc.dataset.t])return;const l=purFor(m?m.dataset.val:''),cur=p.dataset.val;setOpts(p,(pre=='f'?[['','ყველა']]:[]).concat(mk(l)),l.includes(cur)?cur:'')}
function setDyn(pre,t,v={},pr={}){const c=$('#'+pre+'Dyn');if(!c)return;c.dataset.t=t;c.innerHTML=fRender(pre,t);initDD(c);markReq(c);
 $$('input',c).forEach(i=>{if(pr[i.id]!=null&&pr[i.id]!=='')i.value=pr[i.id]});
 const keys=pre=='f'&&FF[t]?Object.keys(FF[t]):fkeys(t);
 keys.forEach(k=>{const el=$('#'+pre+'_'+k);if(!el||!v[k])return;if(FD[k].t=='text')el.value=v[k];else{if(k=='pur')syncPur(pre);if($$('.dd-opt',el).some(o=>o.dataset.k===v[k]))setDD(el,v[k])}})}
document.addEventListener('change',e=>{const id=e.target.id||'';if(/^[fa]_metal$/.test(id))syncPur(id[0])},true);
const attrRows=p=>Object.entries(p.attrs||{}).filter(([k,v])=>k!='gen'&&v).map(([k,v])=>[FD[k]?FD[k].l:k,v]);
const regOf=u=>u.regType||(u.shop?'store':'individual');
const regLabel=u=>regOf(u)=='other'?(u.regOther||'სხვა'):Object.fromEntries(REG)[regOf(u)];

/* demo listings: photos are looked up in img/ (see DEMO_IMG); missing files fall back to an illustration */

const DEMO_IMG = {
  1: "/images/photo-1.jpg",
  2: "/images/photo-2.jpg",
  3: "/images/photo-3.jpg",
  4: "/images/photo-4.jpg",
  5: "/images/photo-5.jpg",
  6: "/images/photo-6.jpg",
  7: "/images/photo-7.jpg",
  8: "/images/photo-8.jpg",
  9: "/images/photo-9.jpg",
  10: "/images/photo-10.jpg"
};

const DEMO=[
 ['ოქროს ბეჭედი 585','ოქრო',4.2,780,'ქალის','💍','ring'],['ბრილიანტის ყელსაბამი','ბრილიანტი',6,4200,'ქალის','📿','necklace'],['ვერცხლის სამაჯური','ვერცხლი',18,190,'უნისექსი','⛓️','bracelet'],
 ['პლატინის საქორწინო ბეჭედი','პლატინა',5.5,2100,'კაცის','💍','ring'],['ოქროს საყურე 750','ოქრო',3.1,690,'ქალის','✨','earring'],['ოქროს ჯაჭვი 585','ოქრო',12,2300,'კაცის','⛓️','chain'],
 ['ბრილიანტის საყურე','ბრილიანტი',2.4,3100,'ქალის','💎','earring'],['ვერცხლის გულსაკიდი','ვერცხლი',6,85,'ქალის','🔮','other'],
 ['ოქროს მაჯის საათი','ოქრო',48,5600,'კაცის','⌚','watch'],['ოქროს სამაჯური 585','ოქრო',9.5,1850,'ქალის','⛓️','bracelet']
].map((a,i)=>({id:i+1,title:a[0],cat:a[1],weight:a[2],price:a[3],gender:a[4],emoji:a[5],type:a[6],typeOther:a[6]=='other'?'გულსაკიდი':'',vip:i<2?'SUPER VIP':i<5?'VIP':'',owner:'demo',desc:'მაღალი ხარისხის სამკაული',photos:[]}));
let items=load('items',null)||[];
/* put photos / receipts back on the items that were stored in IndexedDB (runs once before the first page render) */
async function hydrate(){if(!(await IDB.open()))return;
 let fail=false;
 try{await Promise.all(items.filter(p=>p._hp).map(async p=>{const r=await IDB.get('i'+p.id);
   if(!r.ok){fail=true;return}
   delete p._hp;const v=r.v;
   if(v){p.photos=v.photos||[];p.video=v.video||'';p.audio=v.audio||'';if(p.pay)p.pay.receipt=v.receipt||'';IDB.sig['i'+p.id]=recSig(v)}else p.photos=[]}))}catch{fail=true}
 IDB.ready=true;
 try{if(!fail){const ks=await IDB.keys();if(ks.ok)(ks.v||[]).forEach(k=>{if(!(k in IDB.sig))IDB.del(k)})}
  if(IDB.dirty||items.some(heavy)){IDB.dirty=false;save('items',items)}}catch{}}
items = items.filter(p => p.owner !== 'demo');
save('items', items);
items.forEach(p=>{if(p.attrs){if(p.attrs.etype=='ჰეფები')p.attrs.etype='ჰუფები';}});
items.forEach(p=>{if(p.owner=='demo'){p.photos=DEMO_IMG[p.id]?[DEMO_IMG[p.id]]:[];if(!p.attrs){p.attrs={metal:METALS.includes(p.cat)?p.cat:p.cat=='ბრილიანტი'?'თეთრი ოქრო':'',pur:(p.title.match(/\d{3}/)||[''])[0]};p.loc='თბილისი'}}});
/* Photos are attached before the first paint. Waiting on a short image probe used to give up
   on a slow connection and leave the cards blank even though the files exist. */
function loadDemoPhotos(){return Promise.resolve()}

function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),2800)}
/* exchange rate: official NBG USD rate, cached; rounding happens only when displaying */
let RATE=2.6229,RATE_DATE='2026-09-24';
{const c=load('nbgRate',null);if(c&&c.rate>0){RATE=c.rate;RATE_DATE=c.date}}
/* exact decimal arithmetic (BigInt, 10 decimal places): no binary floating-point drift; the only rounding is the final half-up rounding to cents when shown */
const SC=10n**10n;
const toS=x=>{x=Math.abs(+x)||0;const [i,f='']=x.toFixed(10).split('.');return BigInt(i)*SC+BigInt(f.padEnd(10,'0'))};
const rdiv=(a,b)=>(2n*a+b)/(2n*b);
const money=c=>{const t=c.toString().padStart(3,'0');return t.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+t.slice(-2)};
const usdOf=g=>money(rdiv(toS(g)*100n,toS(RATE)));
/* GEL prices: Georgian style "379,95 ₾" - comma decimals, space-grouped thousands, non-breaking space before ₾; whole numbers have no decimals, fractions always exactly two */
const gm=s=>String(s).replace(/,/g,'\u00A0').replace('.',',');
const gelTxt=g=>{const [i,f]=(Math.abs(+g)||0).toFixed(2).split('.');return i.replace(/\B(?=(\d{3})+(?!\d))/g,'\u00A0')+(f=='00'?'':','+f)+'\u00A0₾'};
const hasNative = p =>
  p && typeof p.nativePrice === 'number' &&
  Number.isFinite(p.nativePrice) && p.nativePrice >= 0;

const listingAmount = (p, c = 'GEL') => {
  if (!hasNative(p)) {
    return c === 'USD'
      ? Number(usdOf(p.price).replace(/,/g, ''))
      : Number(p.price) || 0;
  }

  const originalCurrency = p.cur === 'USD' ? 'USD' : 'GEL';

  if (c === originalCurrency) return p.nativePrice;

  return c === 'GEL'
    ? p.nativePrice * RATE
    : p.nativePrice / RATE;
};

const fmt = (g, c = 'GEL') => {
  if (g && typeof g === 'object') {
    const value = listingAmount(g, c);

    return c === 'GEL'
      ? gelTxt(value)
      : '$' + money(rdiv(toS(value) * 100n, SC));
  }

  return c === 'GEL' ? gelTxt(g) : '$' + usdOf(g);
};

const priceNodeText = (element, currency) => {
  const listing = items.find(
    p => String(p.id) === String(element.dataset.id)
  );

  return fmt(listing || Number(element.dataset.g), currency);
};
const uiLoc=()=>window.MYGEM_LANG==='en'?'en-GB':'ka-GE';
function rateText(){const d=new Date(RATE_DATE+'T12:00:00'),ds=isNaN(d)?RATE_DATE:d.toLocaleDateString(uiLoc(),{day:'numeric',month:'long',year:'numeric'});return `საქართველოს ეროვნული ბანკის ოფიციალური კურსი: 1 $ = ${RATE.toFixed(4)} ₾ (${ds})`}
const curSw=(id,c)=>`<button type="button" class="cur sm${c=='USD'?' on':''}" data-cs="${id}" role="switch" aria-checked="${c=='USD'}" aria-label="ფასი დოლარში" title="${c=='USD'?'ფასი დოლარში (გამორთვა: ლარი)':'ფასი ლარში (ჩართვა: დოლარი)'}"><span class="cl">₾</span><span class="trk"><i></i></span><span class="cl">$</span></button>`;
function toggleCur(id){const c=curOf(id)=='GEL'?'USD':'GEL';pc[id]=c;
 $$(`[data-cs="${id}"]`).forEach(b=>{b.classList.toggle('on',c=='USD');b.setAttribute('aria-checked',c=='USD');b.title=c=='USD'?'ფასი დოლარში (გამორთვა: ლარი)':'ფასი ლარში (ჩართვა: დოლარი)'});
 $$(`.price[data-id="${id}"]`).forEach(p=>{p.textContent=fmt(+p.dataset.g,c);p.classList.remove('flip');void p.offsetWidth;p.classList.add('flip')})}
function applyRate(){const n=$('#rateNote');if(n)n.textContent=rateText();$$('.price[data-g]').forEach(p=>{p.textContent=priceNodeText(p,p.dataset.id?curOf(p.dataset.id):'GEL')});if(window.calcRefresh&&$('#cMetal'))window.calcRefresh()}
async function loadRate(){const today=new Date().toISOString().slice(0,10),c=load('nbgRate',null);if(c&&c.fetched===today)return;
 try{const r=await fetch('https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/?currencies=USD',{cache:'no-store'});if(!r.ok)throw 0;
  const j=await r.json(),blk=Array.isArray(j)?j[0]:j,u=((blk&&blk.currencies)||[]).find(x=>x.code=='USD');if(!u)throw 0;
  const rate=(+u.rate)/(+u.quantity||1);if(!(rate>0))throw 0;const dt=String(u.validFromDate||blk.date||today).slice(0,10);
  RATE=rate;RATE_DATE=dt;save('nbgRate',{rate,date:dt,fetched:today});applyRate()}catch{}}


/* ---------- v2: shared helpers (branding, icons, product page) ---------- */
const SEED=(()=>{let s=load('seed',null);if(!s){s=Date.now();save('seed',s)}return s})();
items.forEach((p,i)=>{if(!p.created)p.created=SEED-(items.length-i)*2*864e5;if(!p.photos)p.photos=[]});

/* one consistent icon set: 24px grid, 1.8 stroke, rounded */
const UI={
 user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.7-4 3.7-6 7.5-6s6.8 2 7.5 6"/>',
 tag:'<path d="M3 12.6V4.5A1.5 1.5 0 014.5 3h8.1a1.5 1.5 0 011.06.44l7.9 7.9a1.5 1.5 0 010 2.12l-7.2 7.2a1.5 1.5 0 01-2.12 0l-7.9-7.9A1.5 1.5 0 013 12.6z"/><circle cx="8" cy="8" r="1.3"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 gem:'<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l-1 6 4 12M15 3l1 6-4 12"/>',
 camera:'<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/>',
 grid:'<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
 sliders:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
 logout:'<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 8l8 6 8-6"/>',
 phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 heart:'<path d="M12 21s-8-5.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.5-8 11-8 11z"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>',
 chat:'<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>',
 back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
 prev:'<path d="M15 5l-7 7 7 7"/>',
 next:'<path d="M9 5l7 7-7 7"/>',
 chev:'<path d="M6 9l6 6 6-6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/>'};
const ui=(k,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI[k]}</svg>`;

/* ---------- product page helpers ---------- */
let pv=load('pv',{});
const dateStr=ts=>new Date(ts).toLocaleDateString(uiLoc(),{day:'numeric',month:'long',year:'numeric'});
/* view counter shown on every card; kept in sync live and across tabs */
const vwHTML=id=>`<small class="vw" data-vw="${id}">${ui('eye')}<span>${pv[id]||0} ნახვა</span></small>`;
const vwRefresh=()=>$$('[data-vw]').forEach(e=>{const s=e.querySelector('span');if(s)s.textContent=(pv[e.dataset.vw]||0)+' ნახვა'});
window.addEventListener('storage',e=>{if(e.key=='pv'){pv=load('pv',{});vwRefresh()}});
function countView(p){if(me&&same(me.email,p.owner))return;let s={};try{s=JSON.parse(sessionStorage.getItem('seenv')||'{}')}catch{}
 if(s[p.id])return;s[p.id]=1;try{sessionStorage.setItem('seenv',JSON.stringify(s))}catch{}
 pv[p.id]=(pv[p.id]||0)+1;save('pv',pv);vwRefresh()}
function sellerOf(p){const u=users.find(u=>same(u.email,p.owner));
 const avatar=p.ownerAvatar||(u&&u.avatar)||'';
 if(u)return {u,name:(regOf(u)=='individual'?u.name+' '+(u.last||''):u.name).trim(),phone:u.phone||p.ownerPhone||'',avatar,type:regLabel(u)};
 if(p.ownerName)return {u:null,name:p.ownerName,phone:p.ownerPhone||'',avatar,type:''};
 return {u:null,name:'mygem.ge',phone:'574173203',avatar:'',type:'მარკეტფლეისი'}}
/* short public id for a seller (the e-mail itself never appears in the URL) */
const sid=o=>{let h=5381;const t=String(o||'').toLowerCase();for(let i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;return (h>>>0).toString(36)};
function similar(p){const sc=x=>(x.cat==p.cat?2:0)+(x.type&&x.type==p.type?2:0)+(x.gender==p.gender?1:0);
 return pub().filter(x=>x.id!=p.id).sort((a,b)=>sc(b)-sc(a)||vr(b)-vr(a)).slice(0,4)}
function pushNote(email,t){(notes[email]=notes[email]||[]).unshift({t,d:Date.now(),r:0});save('notes',notes);setBadge()}
/* ---------- listing packages: Regular / VIP / Super VIP (+ optional color) ---------- */
const PLANS={REG:{key:'REG',name:'Regular',price:0,days:0},VIP:{key:'VIP',name:'VIP',price:2,days:3},SVIP:{key:'SVIP',name:'SUPER VIP',price:2,days:2}};
const COLOR={price:0.50,days:1},DAY=864e5;
const STICKER={price:2,days:1,max:3};
/* stickers: price is PER STICKER (STICKER.price each, max STICKER.max). Refined line icons on soft pastel tints; t = short label shown on the card, d = longer hint shown in the picker */
const STICKERS=[
 {id:'diamond',e:'💎',t:'ბრილიანტი',d:'ნივთს ამშვენებს ბრილიანტი ან ძვირფასი თვლები',c:'#0EA5C9',b:'#D9F2F9'},
 {id:'new',e:'🆕',t:'ახალი',d:'ახალი, გამოუყენებელი ნივთი',c:'#2FA66A',b:'#DDF3E6'},
 {id:'star',e:'⭐',t:'რჩეული',d:'გამყიდველის რჩეული განცხადება',c:'#E5A100',b:'#FFF1C9'},
 {id:'hot',e:'🔥',t:'ცხელი ფასი',d:'გამორჩეული ფასი შეზღუდული დროით',c:'#EF6A3A',b:'#FFE4D8'},
 {id:'urgent',e:'🚨',t:'სასწრაფოდ',d:'სასწრაფოდ იყიდება',c:'#E5484D',b:'#FFE0E0'},
 {id:'sale',e:'🏷️',t:'ფასდაკლება',d:'ფასი შემცირებულია',c:'#E5484D',b:'#FFE0E0'},
 {id:'gift',e:'🎁',t:'საჩუქარი',d:'იდეალური არჩევანი საჩუქრისთვის',c:'#1DA89A',b:'#D9F3EF'},
 {id:'ring',e:'💍',t:'საქორწილო',d:'შესაფერისია ქორწილისა და საქორწინო სამკაულისთვის',c:'#5B6EE1',b:'#E2E5FC'},
 {id:'love',e:'❤️',t:'სიყვარული',d:'რომანტიკული, ნაზი დიზაინი',c:'#EC6BA6',b:'#FFE0EF'},
 {id:'crown',e:'👑',t:'პრემიუმ',d:'ექსკლუზიური ნივთი პრემიუმ ხარისხით',c:'#7C5CC4',b:'#E7E0F7'},
 {id:'ship',e:'🚚',t:'მიტანა',d:'შესაძლებელია მიტანა ან გაგზავნა',c:'#4B7BA8',b:'#E0EAF3'}];
const SI={
 diamond:'<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l-1 6 4 12M15 3l1 6-4 12"/>',
 new:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16v4M17 18h4"/>',
 star:'<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
 hot:'<path d="M12 3c1 3 4 4.500 4 8.500a4 4 0 11-8 0c0-1.500.6-2.600 1.500-3.500.2 1.200.8 1.800 1.500 2C11 7.500 11 5 12 3z"/>',
 sale:'<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.200"/><circle cx="17" cy="17" r="2.200"/>',
 gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.500-3-5-3.500-5-1.500S10 8 12 8zm0 0c1.500-3 5-3.500 5-1.500S14 8 12 8z"/>',
 ring:'<circle cx="12" cy="15" r="6"/><path d="M9 6l3-3 3 3-3 3z"/>',
 love:'<path d="M12 21s-8-5.500-8-11a4.500 4.500 0 018-2.800A4.500 4.500 0 0120 10c0 5.500-8 11-8 11z"/>',
 crown:'<path d="M4 8l4 4 4-7 4 7 4-4-1.500 10h-13z"/><path d="M6.500 21h11"/>',
 ship:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>'};
const stkIcon=id=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SI[id]||''}</svg>`;
const PAY_HOLDER='გ.მ.',BANKS=[{id:'bog',name:'საქართველოს ბანკი',iban:'GE74BG0000000549883748'},{id:'tbc',name:'თიბისი ბანკი',iban:'GE56TB7046245064300117'}];
let FLITT={ready:false,companyName:'მიკრო მეწარმე გიორგი მინდიაშვლი',companyId:'',companyPhone:'574173203',companyEmail:'mygemge@gmail.com',companyAddress:'თბილისი, საქართველო',companyIban:'GE56TB7046245064300117'};
async function loadFlitt(){const res=await apiSend('GET','/api/payments/config');if(!res.ok||!res.data)return;FLITT={...FLITT,...res.data,ready:!!res.data.ready};try{document.documentElement.classList.toggle('flitt-on',FLITT.ready)}catch{}}
function openFlittDialog() {
  if (document.querySelector('#flittDialog')) return null;

  const opener = document.activeElement;
  const dialog = document.createElement('dialog');

  dialog.id = 'flittDialog';
  dialog.className = 'flitt-dialog';
  dialog.setAttribute('aria-labelledby', 'flittDialogTitle');
  dialog.innerHTML = `
    <div class="flitt-dialog-head">
      <h3 id="flittDialogTitle">გადახდა</h3>
      <button type="button" class="flitt-dialog-close" aria-label="დახურვა">×</button>
    </div>
    <div id="flittLoading" role="status"><i class="flitt-spin"></i><span>გადახდა იტვირთება…</span></div>
    <div id="flittCheckout"></div>
  `;

  dialog.querySelector('.flitt-dialog-close').onclick = () => dialog.close();

  dialog.addEventListener('close', () => {
    dialog.remove();
    document.documentElement.classList.remove('flitt-open');
    if (dialog._onClose) dialog._onClose();
    else if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }, { once: true });

  document.body.appendChild(dialog);
  dialog.showModal();
  document.documentElement.classList.add('flitt-open');
  return dialog;
}

async function runFlittCheckout(dialog, listingId) {
  if (typeof window.checkout !== 'function') {
    toast('გადახდის კომპონენტი ვერ ჩაიტვირთა — განაახლეთ გვერდი');
    if (dialog.open) dialog.close();
    return false;
  }
  try {
    const res = await apiSend('POST', '/api/payments/checkout', { listingId }, 15000);

    if (!dialog.isConnected || !dialog.open) return false;
    if (!res.ok || !res.data.checkoutToken) {
      throw new Error(res.data.message || 'გადახდის დაწყება ვერ მოხერხდა');
    }

    const ld = dialog.querySelector('#flittLoading');
    if (ld) ld.remove();

    window.checkout('#flittCheckout', {
      options: {
        methods: ['card', 'wallets'],
        active_tab: 'card',
        full_screen: false,
        locales: [window.MYGEM_LANG === 'en' ? 'en' : 'ka']
      },
      params: { token: res.data.checkoutToken }
    });
    return true;
  } catch (error) {
    if (dialog.isConnected && dialog.open) dialog.close();
    toast(error.message || 'გადახდის გახსნა ვერ მოხერხდა');
    return false;
  }
}

async function startFlittPay(listingId, paymentTab) {
  const tab = paymentTab || window.open('about:blank', '_blank');

  if (!tab || tab.closed) {
    toast('გადახდის გასახსნელად დაუშვით ახალი ტაბის გახსნა');
    return false;
  }

  tab.opener = null;

  try {
    const res = await apiSend(
      'POST',
      '/api/payments/checkout',
      { listingId },
      35000
    );

    if (!res.ok || !res.data.checkoutUrl) {
      throw new Error(
        res.data.message || 'გადახდის ბმული ვერ მივიღეთ'
      );
    }

    const url = new URL(res.data.checkoutUrl);

    if (url.protocol !== 'https:' || url.hostname !== 'pay.flitt.com') {
      throw new Error('გადახდის ბმული არასწორია');
    }

    if (tab.closed) return false;

    tab.location.replace(url.href);
    return true;
  } catch (error) {
    if (!tab.closed) tab.close();
    toast(error.message || 'გადახდის დაწყება ვერ მოხერხდა');
    return false;
  }
}
const planName=k=>k=='SVIP'?'Super VIP':PLANS[k].name;
const planLabel=k=>k=='REG'?'Regular — უფასო':`${planName(k)} — ${PLANS[k].price} ₾ · ${PLANS[k].days} დღე`;
const planOf=n=>Object.values(PLANS).find(x=>x.name==n);
const isAdmin=()=>!!me&&!!me.admin;
const pendingPay=()=>items.filter(p=>p.pay&&p.pay.status=='pending');
const notifyOwner=(p,t)=>{if(p.owner&&p.owner!='demo')pushNote(p.owner,t)};
const fdt=ts=>new Date(ts).toLocaleString(uiLoc());
/* automatic expiry: VIP / Super VIP / color switch off by themselves when their time is up */
function sweep(){const now=Date.now();let ch=false;
 items.forEach(p=>{
  if(p.vip&&p.vipUntil&&p.vipUntil<=now){notifyOwner(p,`«${p.title}» – ${p.vip} სტატუსის ვადა ამოიწურა`);p.vip='';delete p.vipUntil;if(p.pay&&p.pay.status=='active')p.pay.status='expired';ch=true}
  if(p.color&&p.colorUntil&&p.colorUntil<=now){p.color=false;delete p.colorUntil;delete p.colorHex;ch=true}
  if(p.sticker&&p.stickerUntil&&p.stickerUntil<=now){p.sticker=false;delete p.stickerUntil;p.stickers=[];ch=true}});
 if(ch)save('items',items);return ch}
const ownChip=p=>{if(!me||!p.pay||!same(me.email,p.owner))return '';const s=p.pay.status;
 if(s=='pending'&&FLITT.ready&&(p.pay.provider=='flitt'||!p.pay.receipt))return `<span class="pstat">გადახდა მოლოდინშია</span><button type="button" class="btn sm" data-flitt="${p.id}">გადახდის გაგრძელება</button>`;
 return s=='pending'?'<span class="pstat">მოწმდება — გამოჩნდება დადასტურების შემდეგ</span>':s=='rejected'?'<span class="pstat rejected">გადახდა არ დადასტურდა</span>':''};
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch{}
 try{const x=document.createElement('textarea');x.value=t;x.setAttribute('readonly','');x.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.append(x);x.select();x.setSelectionRange(0,t.length);const ok=document.execCommand('copy');x.remove();return ok}catch{return false}}
/* payment section of the add-listing form (hidden until VIP / Super VIP is chosen) */
/* colored listing: owner-chosen border color (valid #rrggbb only) */
/* LIGHT, SOFT PALETTE ONLY: users can pick nothing outside this list (no free colour picker), so dark shades are impossible. Stored colours that are not in the list fall back to BC_DEF. */
const BC_DEF='#FFF3D6',BC_SW=[['#FFF3D6','კრემისფერი'],['#F3E9DC','ბეჟი'],['#FCE4EC','ვარდისფერი'],['#FFE6DB','ატამი'],['#FAF3C0','ლიმონისფერი'],['#E8EFDF','ფისტისფერი'],['#E2F4EA','პიტნისფერი'],['#DFF3F4','აკვა'],['#E3F0FC','ცისფერი'],['#EDE7F9','ლავანდა'],['#F3E4F2','ლილა'],['#ECEEF1','ვერცხლისფერი'],['#FFFFFF','თეთრი']];
const bcName=h=>{const f=BC_SW.find(x=>x[0].toLowerCase()==String(h).toLowerCase());return f?f[1]:'კრემისფერი'};
const okHex=h=>BC_SW.some(x=>x[0].toLowerCase()==String(h||'').toLowerCase());
const colorActive=p=>!!p.color&&(!p.colorUntil||p.colorUntil>Date.now());
const colorPending=p=>!!(p.pay&&p.pay.status=='pending'&&p.pay.color);
const isWhite=h=>!!h&&h.toLowerCase()=='#ffffff';
const hexLum=h=>{const n=parseInt(h.slice(1),16),f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(n>>16&255)+.7152*f(n>>8&255)+.0722*f(n&255)};
/* card background color: white keeps the standard look; dark colors switch text to light */
const cardCls=h=>!h?'':isWhite(h)?' is-white':' is-color'+(hexLum(h)<.18?' is-dark':'');
function paintCard(el,h){el.classList.remove('is-color','is-white','is-dark');cardCls(h).split(' ').filter(Boolean).forEach(c=>el.classList.add(c));if(h)el.style.setProperty('--bc',h)}
const cardHex=p=>colorActive(p)?(okHex(p.colorHex)?p.colorHex:BC_DEF):(colorPending(p)&&me&&same(me.email,p.owner)?(okHex(p.pay.colorHex)?p.pay.colorHex:BC_DEF):'');
/* stickers: up to STICKER.max chosen from the catalog; shown only while the purchased feature is valid (owner also sees a preview while payment is pending) */
const cleanStk=a=>[...new Set(Array.isArray(a)?a:[])].filter(i=>STICKERS.some(s=>s.id==i)).slice(0,STICKER.max);
const stkActive=p=>!!p.sticker&&(!p.stickerUntil||p.stickerUntil>Date.now());
const stkPending=p=>!!(p.pay&&p.pay.status=='pending'&&p.pay.sticker);
const stkIds=p=>stkActive(p)?cleanStk(p.stickers):(stkPending(p)&&me&&same(me.email,p.owner)?cleanStk(p.pay.stickers):[]);
/* on the card: icon + short label, so every sticker explains itself without opening the listing */
const stkHTML=p=>{const l=stkIds(p);return l.length?`<div class="stks">${l.map(i=>{const s=STICKERS.find(x=>x.id==i);return `<span class="stk" style="--sc:${s.c};--sb:${s.b}" title="${esc(s.t)}"><span class="se" aria-hidden="true">${s.e}</span><b>${esc(s.t)}</b></span>`}).join('')}</div>`:''};
const stkCnt=n=>`არჩეულია <b>${n}</b> / ${STICKER.max}${n?` · <span class="sp">+${n*STICKER.price} ₾</span>`:''}`;
const stkPickHTML=(id,sel,item)=>`<div class="spick" id="${id}"${item!=null?` data-item="${item}"`:''}><div class="slist">${STICKERS.map(s=>`<button type="button" class="sq${sel.includes(s.id)?' on':''}" data-sk="${s.id}" aria-pressed="${sel.includes(s.id)}" title="${esc(s.t)}" style="--sc:${s.c};--sb:${s.b}"><span class="se" aria-hidden="true">${s.e}</span><span class="stx"><b>${esc(s.t)}</b></span><i class="sck" aria-hidden="true"></i></button>`).join('')}</div><small class="scnt">${stkCnt(sel.length)}</small><input type="hidden" class="sval" value="${sel.join(',')}"></div>`;
function stkSync(box,nx){box.querySelector('.sval').value=nx.join(',');$$('.sq',box).forEach(x=>{const on=nx.includes(x.dataset.sk);x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});const c=box.querySelector('.scnt');if(c)c.innerHTML=stkCnt(nx.length);paySummary()}
/* live price breakdown in the add-listing form: package + colour + STICKER.price per selected sticker */
function paySummary(){const box=$('#paySum'),PL=$('#aPlan');if(!box||!PL)return;const pl=PLANS[PL.dataset.val];if(!pl){box.innerHTML='';return}
 const CK=$('#aColor'),sv=$('#aSP .sval'),n=cleanStk(sv?sv.value.split(','):[]).length,rows=pl.key=='REG'?[]:[[`${planName(pl.key)} · ${pl.days} დღე`,pl.price]];
 const PB=$('#payBox'),need=pl.key!='REG'||(CK&&CK.checked)||n>0;if(PB)$$('.pdet',PB).forEach(e=>{if(e.classList.contains('flitt-on')){e.hidden=!need||!FLITT.ready;return}if(e.classList.contains('flitt-off')){e.hidden=!need||FLITT.ready;return}e.hidden=!need});if(!need&&window.rc){window.rc=null;drawRc();clearOne($('#rcptFld'))}
 if(CK&&CK.checked)rows.push([`ფერადი გამოყოფა · ${COLOR.days} დღე`,COLOR.price]);
 if(n)rows.push([`სტიკერები × ${n} (${STICKER.price} ₾ თითოეული) · ${STICKER.days} დღე`,n*STICKER.price]);
 if(!rows.length){box.innerHTML='';return}
 box.innerHTML=rows.map(r=>`<div class="psr"><span>${esc(r[0])}</span><b>${r[1]} ₾</b></div>`).join('')+`<div class="psr tot"><span>სულ გადასახდელი</span><b>${rows.reduce((a,r)=>a+r[1],0)} ₾</b></div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-sk]');if(!b)return;const box=b.closest('.spick');if(!box)return;
 const v=box.querySelector('.sval'),cur=cleanStk(v.value.split(',')),id=b.dataset.sk,has=cur.includes(id);
 if(!has&&cur.length>=STICKER.max)return toast(`მაქსიმუმ ${STICKER.max} სტიკერის არჩევა შეიძლება`);
 const nx=has?cur.filter(x=>x!=id):[...cur,id];
 if(box.dataset.item!=null){const p=items.find(x=>String(x.id)===box.dataset.item);
  if(!p||!me||!same(me.email,p.owner)||!(stkActive(p)||stkPending(p)))return toast('სტიკერების შეცვლა ამჟამად შეუძლებელია');
  /* changing stickers later may swap them, but never exceed the number that was paid for */
  const paidN=(p.pay&&p.pay.stkN)||STICKER.max;if(!has&&cur.length>=paidN)return toast(`გადახდილია ${paidN} სტიკერი — ახალი სტიკერისთვის ჯერ მოხსენით ერთ-ერთი`);
  if(stkActive(p))p.stickers=nx;else p.pay.stickers=nx;save('items',items);
  $$(`.card[data-id="${p.id}"]`).forEach(c=>{const o=c.querySelector('.stks');if(o)o.remove();const h=stkHTML(p);if(!h)return;let ft=c.querySelector('.cfoot');if(!ft){const inn=c.querySelector('.in');if(!inn)return;ft=document.createElement('div');ft.className='cfoot';inn.append(ft)}const tg=ft.querySelector('.tags');if(tg)tg.insertAdjacentHTML('afterend',h);else ft.insertAdjacentHTML('afterbegin',h)});toast('სტიკერები შეინახა ✓')}
 stkSync(box,nx)});
const pickHTML=(id,val,item)=>{
 return `<div class="cpick" id="${id}"${item!=null?` data-item="${item}"`:''}><div class="cgrid">${BC_SW.map(([c,n])=>`<button type="button" class="csq${c.toLowerCase()==val.toLowerCase()?' on':''}" data-cpc="${c}" style="--sw:${c}" title="${esc(n)}" aria-label="${esc(n)}" aria-pressed="${c.toLowerCase()==val.toLowerCase()}"><span class="cdot"></span><span class="cn">${esc(n)}</span></button>`).join('')}</div><small class="cname" style="--sw:${val}"><i></i>არჩეული ფერი: <b>${esc(bcName(val))}</b></small><small class="chint"></small><input type="hidden" class="cval" value="${val}"></div>`};
function setPick(box,hex,toastIt){if(!okHex(hex))return;hex=hex.toLowerCase();
 $$('.csq[data-cpc]',box).forEach(b=>{const on=b.dataset.cpc.toLowerCase()==hex;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
 const nm=box.querySelector('.cname');if(nm){nm.style.setProperty('--sw',hex);nm.querySelector('b').textContent=bcName(hex)}
 box.querySelector('.cval').value=hex;
 if(box.dataset.item!=null){const p=items.find(x=>String(x.id)===box.dataset.item);
  if(!p||!me||!same(me.email,p.owner)||!(colorActive(p)||colorPending(p)))return toast('ფერის შეცვლა ამჟამად შეუძლებელია');
  if(colorActive(p))p.colorHex=hex;else p.pay.colorHex=hex;save('items',items);$$(`.card[data-id="${p.id}"]`).forEach(c=>paintCard(c,hex));if(toastIt)toast('ბარათის ფერი შეინახა ✓')}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cpc]');if(b){const box=b.closest('.cpick');if(box)setPick(box,b.dataset.cpc,true)}});
const COPY_I='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>';
const payBox=()=>`<div class="paybox full" id="payBox"><h4 class="pdet">${FLITT.ready?'გადახდა ბარათით / Apple Pay / Google Pay':'გადახდა ბანკის გადარიცხვით'}</h4>
<div class="payrecv pdet flitt-off"><span>მიმღები:</span><b>${esc(PAY_HOLDER)}</b></div>
<div class="banks pdet flitt-off">${BANKS.map(k=>`<div class="bank"><div class="bn">${esc(k.name)}</div><div class="bacc"><span>ანგარიშის ნომერი</span><div class="brow"><b id="iban_${k.id}">${esc(k.iban)}</b><button type="button" class="copybtn" data-copy="${k.id}" aria-label="${esc(k.name)} – ანგარიშის ნომრის კოპირება">${COPY_I}<span>კოპირება</span></button></div></div></div>`).join('')}</div>
<div class="flittbox pdet flitt-on"${FLITT.ready?'':' hidden'}><p class="flitt-lead">გადახდა ხდება Flitt-ის უსაფრთხო გვერდზე. მხარდაჭერილია ბარათი, Google Pay და Apple Pay. თანხა ₾-ში.</p><div class="paylogos" aria-label="Visa Mastercard">${payLogos()}</div></div>
<label class="chk addon"><input type="checkbox" id="aColor"> ფერადი გამოყოფა · +${COLOR.price} ₾ · ${COLOR.days} დღე</label>
<div class="cpbox" id="aColorBox" hidden><span>აირჩიეთ ბარათის ფერი</span>${pickHTML("aCP",BC_DEF)}</div>
<div class="cpbox" id="aStkBox"><span>სტიკერები (არასავალდებულო) · +${STICKER.price} ₾ თითოეული · მაქს. ${STICKER.max} · ${STICKER.days} დღე</span>${stkPickHTML("aSP",[])}</div>
<div class="paysum" id="paySum" aria-live="polite"></div>
<div class="fld pdet flitt-off" id="rcptFld"><span>გადახდის ქვითარი (სავალდებულოა)</span><label class="drop rc" for="aR"><b>ატვირთეთ ქვითარი</b><small>სურათი ან PDF · PDF მაქს. 1.5MB</small></label><input type="file" id="aR" accept="image/*,application/pdf" hidden><div class="rcprev" id="rcPrev"></div></div>
<p class="paynote pdet flitt-off">ქვითრის ატვირთვა სტატუსს ავტომატურად არ ააქტიურებს — გადახდას ადმინისტრატორი ამოწმებს. დადასტურების შემდეგ სტატუსი ჩაირთვება და ვადა ამ მომენტიდან დაითვლება.</p>
<p class="paynote pdet flitt-on"${FLITT.ready?'':' hidden'}>გამოქვეყნების შემდეგ გადახდის გვერდზე გადახვალთ. წარმატებული გადახდის შემდეგ სტატუსი ავტომატურად ჩაირთვება.</p></div>`;
const payLogos=()=>`<span class="plogo visa" title="Visa" aria-label="Visa"><svg viewBox="0 0 60 20" role="img" aria-hidden="true"><rect width="60" height="20" rx="3" fill="#1A1F71"/><text x="30" y="14" text-anchor="middle" fill="#fff" font-size="10" font-family="Arial,sans-serif" font-weight="700" font-style="italic">VISA</text></svg></span><span class="plogo mc" title="Mastercard" aria-label="Mastercard"><svg viewBox="0 0 60 20" role="img" aria-hidden="true"><rect width="60" height="20" rx="3" fill="#000"/><circle cx="24" cy="10" r="7" fill="#EB001B"/><circle cx="36" cy="10" r="7" fill="#F79E1B"/><path d="M30 4.8a7 7 0 010 10.4 7 7 0 010-10.4z" fill="#FF5F00"/></svg></span>`;
/* admin: verify or reject payments */
function payPanel(){const pend=pendingPay().sort((a,b)=>a.pay.created-b.pay.created),act=items.filter(p=>(p.vip&&p.vipUntil)||(p.color&&p.colorUntil)||(p.sticker&&p.stickerUntil)).sort((a,b)=>(a.vipUntil||a.colorUntil||a.stickerUntil)-(b.vipUntil||b.colorUntil||b.stickerUntil)),
 th=p=>`<div class="pthm" style="${bgi(p.photos[0])}">${p.photos[0]?'':ill(p)}</div>`;
 return `<div class="paylist"><h3 class="psub">ელოდება შემოწმებას (${pend.length})</h3>${pend.length?pend.map(p=>{const y=p.pay;return `<div class="payrow">${th(p)}<div class="pinf"><a href="#product:${p.id}"><b>${esc(p.title)}</b></a><small>${esc(p.owner)} · ${fdt(y.created)}</small><small>${esc(y.plan)}${y.days?` · ${y.days} დღე`:''}${y.color?` + ფერადი (${COLOR.days} დღე)`:''}${y.sticker?` + სტიკერები ×${y.stkN||cleanStk(y.stickers).length} (${STICKER.days} დღე)`:''} · <b>${y.amount} ₾</b></small></div><div class="pacts"><button type="button" class="btn alt sm" data-rcpt="${p.id}">ქვითარი</button><button type="button" class="btn sm" data-payok="${p.id}">დადასტურება</button><button type="button" class="btn alt sm" data-payno="${p.id}">უარყოფა</button></div></div>`}).join(''):'<div class="empty">მოლოდინში მყოფი გადახდები არ არის</div>'}
<h3 class="psub">აქტიური სტატუსები (${act.length})</h3>${act.length?act.map(p=>`<div class="payrow">${th(p)}<div class="pinf"><a href="#product:${p.id}"><b>${esc(p.title)}</b></a><small>${esc(p.owner)}</small><small>${esc(p.vip||'Regular')} · მოქმედებს ${fdt(p.vipUntil||p.colorUntil||p.stickerUntil)}-მდე${p.color?' · ფერადი':''}${p.sticker?' · სტიკერები':''}</small></div></div>`).join(''):'<div class="empty">აქტიური სტატუსები არ არის</div>'}</div>`}
function openReceipt(id){if(!isAdmin())return;const p=items.find(x=>String(x.id)===String(id)),y=p&&p.pay;if(!y||!y.receipt)return;
 if(y.receiptType=='pdf'){try{const b=atob(y.receipt.split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.open(URL.createObjectURL(new Blob([u],{type:'application/pdf'})),'_blank')}catch{toast('ფაილის გახსნა ვერ მოხერხდა')}return}
 const src=safeUrl(y.receipt);if(!src)return;const d=document.createElement('div');d.className='try-lb';const img=document.createElement('img');img.alt='';img.src=y.receipt;d.append(img);d.onclick=()=>d.remove();document.body.append(d)}
function payDecide(id,ok){if(!isAdmin())return;const p=items.find(x=>String(x.id)===String(id));if(!p||!p.pay||p.pay.status!='pending')return;
 if(!ok)return payReject(p);
 const now=Date.now(),y=p.pay;if(y.days>0){p.vip=y.plan;p.vipUntil=now+y.days*DAY}if(y.color){p.color=true;p.colorUntil=now+COLOR.days*DAY;p.colorHex=okHex(y.colorHex)?y.colorHex:BC_DEF}
 if(y.sticker){p.sticker=true;p.stickerUntil=now+STICKER.days*DAY;p.stickers=cleanStk(y.stickers)}
 delete p.hold;y.status='active';y.verifiedBy=me.email;y.verifiedAt=now;save('items',items);
 pushListing(p).then(ok=>{if(!ok)return;notifyOwner(p,y.days>0?`«${p.title}» – ${y.plan} გადახდა დადასტურდა. სტატუსი აქტიურია ${fdt(p.vipUntil)}-მდე`:`«${p.title}» – დამატებითი სერვისების გადახდა დადასტურდა. აქტიურია ${fdt(y.color?p.colorUntil:p.stickerUntil)}-მდე`);toast('გადახდა დადასტურდა ✓');showProfile('pay')})}
function payReject(p){curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<h3>გადახდის უარყოფა</h3><p>${esc(p.title)}</p><form class="form" id="rjForm" novalidate><label>მიზეზი (არასავალდებულო)<textarea id="rjT" rows="3" maxlength="300"></textarea></label><div class="row2"><button class="btn" type="submit">უარყოფა</button><button type="button" class="btn alt" id="rjNo">გაუქმება</button></div></form>`;
 $('#rjNo').onclick=closeModal;
 $('#rjForm').onsubmit=e=>{e.preventDefault();if(!isAdmin()||!p.pay||p.pay.status!='pending')return closeModal();const r=$('#rjT').value.trim();
  delete p.hold;p.pay.status='rejected';p.pay.verifiedBy=me.email;p.pay.verifiedAt=Date.now();p.pay.reason=r;save('items',items);
  pushListing(p).then(ok=>{if(!ok)return;notifyOwner(p,`«${p.title}» – ${p.pay.plan} გადახდა ვერ დადასტურდა${r?': '+r:''}. განცხადება გამოქვეყნებულია Regular სტატუსით`);closeModal();toast('გადახდა უარყოფილია');showProfile('pay')})}}

function showLink(url){curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<h3>განცხადების ბმული</h3><p>დააკოპირეთ და გაგზავნეთ:</p><form class="form" novalidate><label><input id="lnk" readonly value="${esc(url)}"></label><button type="button" class="btn" id="lnkOk">დახურვა</button></form>`;
 const i=$('#lnk');i.focus();i.select();$('#lnkOk').onclick=closeModal}
async function shareP(id){const p=items.find(x=>String(x.id)===String(id));if(!p)return;
 const base=location.protocol=='file:'?location.href.split('#')[0]:location.origin+location.pathname,url=base+'#product:'+p.id,data={title:p.title,url};
 if(navigator.share&&(!navigator.canShare||navigator.canShare(data))){try{await navigator.share(data);return}catch(e){if(e&&e.name=='AbortError')return}}
    /* ფანჯარა მაშინვე იხსნება */
 let ok=false;try{await navigator.clipboard.writeText(url);ok=true}catch{}
 if(!ok){try{const t=document.createElement('textarea');t.value=url;t.setAttribute('readonly','');t.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.append(t);t.select();t.setSelectionRange(0,url.length);ok=document.execCommand('copy');t.remove()}catch{}}
 if(ok)toast('ბმული დაკოპირდა ✓');else showLink(url)}
function openMsg(id){if(!me)return openAuth('login');const p=items.find(x=>String(x.id)===String(id));if(!p)return;
 if(same(me.email,p.owner))return toast('ეს თქვენი განცხადებაა');
 curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<h3>შეტყობინება გამყიდველს</h3><p>${esc(p.title)}</p><form class="form" id="msgForm" novalidate><label>თქვენი შეტყობინება<textarea id="mT" rows="4" maxlength="500">გამარჯობა! მაინტერესებს განცხადება: ${esc(p.title)}. ჯერ კიდევ ხელმისაწვდომია?</textarea></label><button class="btn" type="submit">გაგზავნა</button><button type="button" class="link" id="mNo">გაუქმება</button></form>`;
 $('#mNo').onclick=closeModal;
 $('#msgForm').onsubmit=e=>{e.preventDefault();const T=$('#mT'),v=T.value.trim();if(check(e.target,[[T,!v?'დაწერეთ შეტყობინება':v.length<3?'მინიმუმ 3 სიმბოლო':'']]))return;
  const s=sellerOf(p),nm=(regOf(me)=='individual'?me.name+' '+(me.last||''):me.name).trim();
  if(s.u){pushNote(s.u.email,`ახალი შეტყობინება განცხადებაზე «${p.title}» – ${nm} (${me.phone||'—'}): ${v}`);
   apiSend('PUT','/api/me/notes',{notes:{[s.u.email]:[{t:`ახალი შეტყობინება განცხადებაზე «${p.title}» – ${nm} (${me.phone||'—'}): ${v}`,d:Date.now(),r:0,listingId:p.id}]}})}
  addNote(`შეტყობინება გაიგზავნა განცხადებაზე: ${p.title}`);closeModal();toast('შეტყობინება გაგზავნილია ✓')};
 setTimeout(()=>{const T=$('#mT');if(T){T.focus();T.select()}},60)}
const ownerOf=p=>!!me&&!!p&&same(me.email,p.owner);
const canDel=p=>!!me&&!!p&&(same(me.email,p.owner)||isAdmin());
function confirmDelete(id){const p=items.find(x=>String(x.id)===String(id));if(!canDel(p))return;curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<div class="confirm"><div class="ci">${ui('trash')}</div><h3>დარწმუნებული ხართ, რომ გსურთ განცხადების წაშლა?</h3><p>«${esc(p.title)}»<br>წაშლის შემდეგ განცხადების აღდგენა შეუძლებელია.</p><div class="row2"><button type="button" class="btn danger" id="dlYes">დიახ, წაშლა</button><button type="button" class="btn alt" id="dlNo">გაუქმება</button></div></div>`;
 $('#dlNo').focus();$('#dlNo').onclick=closeModal;
 $('#dlYes').onclick=()=>{if(!canDel(p))return closeModal();
  const snap={items:items.slice(),favs:favs.slice()};
  items=items.filter(x=>x.id!==p.id);favs=favs.filter(x=>x!==p.id);delete pv[p.id];delete pc[p.id];
  closeModal();
  $$(`.card[data-id="${p.id}"]`).forEach(c=>c.remove());
  setFavCnt();toast('განცხადება წაიშალა ✓');
  if(parseHash()[0]!=='profile'){window.__fast=1;location.hash='profile:mine'}
else if(!$('#app .card')){const g=$('#app .grid');if(g)g.outerHTML='<div class="empty">ჩანაწერი არ არის</div>'}
  (window.requestIdleCallback||setTimeout)(()=>{save('items',items);save('favs',favs);save('pv',pv)});
  apiSend('DELETE','/api/listings/'+p.id).then(res=>{
    if(res.ok)return;
    items=snap.items;favs=snap.favs;save('items',items);save('favs',favs);setFavCnt();
    toast(res.data.message||'წაშლა ვერ მოხერხდა');route()})}}
/* ---------- photo editor: the owner can delete (and add) photos of an existing listing ---------- */
const AUD_MB=5,AUD_SEC=60,AUP='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/></svg>',AMIC='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>';
const fmtT=t=>{t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
const audPlayer=src=>`<div class="aplay"><audio src="${safeUrl(src)}" preload="metadata"></audio><button type="button" class="ap-b" aria-label="დაკვრა / პაუზა"><svg class="pl" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z"/></svg><svg class="ps" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg></button><div class="ap-t"><div class="ap-bar" role="slider" aria-label="პოზიცია"><i></i></div><div class="ap-n"><span class="ap-c">0:00</span><span class="ap-d">0:00</span></div></div></div>`;
function apUpd(a){const r=a.closest('.aplay');if(!r)return;const d=isFinite(a.duration)?a.duration:0;r.querySelector('.ap-bar i').style.width=(d?Math.min(100,a.currentTime/d*100):0)+'%';r.querySelector('.ap-c').textContent=fmtT(a.currentTime);r.querySelector('.ap-d').textContent=fmtT(d)}
['loadedmetadata','durationchange','timeupdate','ended'].forEach(ev=>document.addEventListener(ev,e=>{const a=e.target;if(!a||a.tagName!='AUDIO')return;
 if(ev=='loadedmetadata'&&a.duration===Infinity){a.addEventListener('timeupdate',()=>{a.currentTime=0},{once:true});a.currentTime=1e101}
 apUpd(a)},true));
['play','pause','ended'].forEach(ev=>document.addEventListener(ev,e=>{const a=e.target;if(!a||a.tagName!='AUDIO')return;const r=a.closest('.aplay');if(r)r.classList.toggle('on',ev=='play')},true));
document.addEventListener('click',e=>{const b=e.target.closest('.ap-b'),bar=e.target.closest('.ap-bar');
 if(b){const a=b.closest('.aplay').querySelector('audio');if(a.paused){$$('audio').forEach(x=>{if(x!==a)x.pause()});a.play().catch(()=>{})}else a.pause();return}
 if(bar){const a=bar.closest('.aplay').querySelector('audio'),r=bar.getBoundingClientRect();if(isFinite(a.duration)&&a.duration>0){a.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*a.duration;apUpd(a)}}});
const PH_MAX=8,PH_MIN_EDIT=1;
const STEPS=['ძირითადი მახასიათებლები','ფოტო / ვიდეო','დამატებითი ბენეფიტები','დასრულება'],VID_MB=15;   /* a new listing still needs 3 photos; an existing one may be trimmed down to PH_MIN_EDIT */
function rerender(){const[h,t]=parseHash();if(!views[h])return;const y=window.scrollY;$('#app').innerHTML=views[h](t);bind();window.scrollTo({top:y,behavior:'instant'})}
function openPhotos(id){const p=items.find(x=>String(x.id)===String(id));if(!ownerOf(p))return;
 let list=[...(p.photos||[])],msg='';curAuth=null;modal.classList.add('show');$('#modalBox').classList.add('wide');
 const draw=()=>{const B=$('#modalBody');
  const pvHtml=card({...p,photos:list.slice(0,1)}).replace('tabindex="0" role="link"','tabindex="-1" aria-hidden="true"');
  const pvBlock=`<div class="lpv"><details class="lpv-d" open>
   <summary class="lpv-h"><b>ასე გამოჩნდება განცხადება</b><small>${list.length}/${PH_MAX} ფოტო</small></summary>
   <div class="lpv-bar"><i style="width:${list.length/PH_MAX*100}%"></i></div>
   <div class="lpv-card">${pvHtml}</div>
   <p class="lpv-n">${list.length?'':'ფოტოს დამატების შემდეგ აქ გამოჩნდება მთავარი ფოტო. '}ფოტოს წაშლისას ან დამატებისას ბარათი ავტომატურად განახლდება.</p></details></div>`;
  B.innerHTML=`<h3>ფოტოების რედაქტირება</h3><p>«${esc(p.title)}»<br>წაშალეთ არასასურველი ფოტო ან დაამატეთ ახალი. პირველი ფოტო მთავარია.</p>
<div class="pe-wrap"><aside class="pe-side">${pvBlock}</aside><div class="pe-main">
<div class="photos pedit">${list.map((x,i)=>`<div class="ph"><img src="${safeUrl(x)}" alt="">${i==0?'<span class="cover">მთავარი</span>':''}<button type="button" class="rm" data-pe="${i}" aria-label="ფოტოს წაშლა" title="ფოტოს წაშლა">×</button></div>`).join('')}${list.length<PH_MAX?'<label class="ph padd" for="peF">+<small>დამატება</small></label>':''}</div>
<input type="file" id="peF" accept="image/*" multiple hidden>
<div class="pcount${list.length>=PH_MIN_EDIT?' ok':''}"><span>${list.length} / ${PH_MAX} ფოტო</span></div>${msg?`<em class="fe">${esc(msg)}</em>`:''}
<div class="row2"><button type="button" class="btn" id="peSave">შენახვა</button><button type="button" class="btn alt" id="peNo">გაუქმება</button></div>
</div></div>`;
  $('#peNo').onclick=closeModal;
  $$('[data-pe]',B).forEach(b=>b.onclick=()=>{list.splice(+b.dataset.pe,1);msg='';draw()});
  $('#peF').onchange=async e=>{const fs=[...e.target.files].filter(f=>f.type.startsWith('image/')&&f.size<=15*1024*1024);e.target.value='';
   if(!fs.length)return toast('დაშვებულია მხოლოდ სურათები (მაქს. 15MB)');
   const room=PH_MAX-list.length;if(fs.length>room)toast('მაქსიმუმ '+PH_MAX+' ფოტო');
   const take=fs.slice(0,room),rdd=(await Promise.all(take.map(rd))).filter(Boolean);if(rdd.length<take.length)toast(RD_FAIL);const got=await modFilter(rdd);list=[...list,...got].slice(0,PH_MAX);msg='';draw()};
  $('#peSave').onclick=async()=>{if(!ownerOf(p))return closeModal();
   if(list.length<PH_MIN_EDIT){msg='დატოვეთ მინიმუმ '+PH_MIN_EDIT+' ფოტო';return draw()}
   const old=p.photos,sv=$('#peSave');p.photos=[...list];if(sv){sv.disabled=true;sv.textContent='ინახება…'}
   let ok=false;try{ok=await commitItems(p)}catch{ok=false}
   if(!ok){p.photos=old;saveItems(items);msg='შენახვა ვერ მოხერხდა';return draw()}
   closeModal();toast('ფოტოები განახლდა ✓');rerender()}};
 draw()}
function confirmLogout(){curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<div class="confirm"><div class="ci">${ui('logout')}</div><h3>დარწმუნებული ხართ, რომ გსურთ გასვლა?</h3><div class="row2"><button type="button" class="btn danger" id="lgYes">დიახ, გასვლა</button><button type="button" class="btn alt" id="lgNo">არა</button></div></div>`;
 $('#lgNo').focus();$('#lgNo').onclick=closeModal;
 $('#lgYes').onclick=async()=>{closeModal();await apiSend('DELETE','/api/auth/session');me=null;save('me',null);try{localStorage.removeItem('mygemTok');sessionStorage.removeItem('gtok')}catch{}setLogin();if(location.hash=='#home'||!location.hash)route();else location.hash='მთავარი'}}

/* ---------- universal dropdown ---------- */
const fld=(l,h,cls='')=>`<div class="fld ${cls}"><span>${l}</span>${h}</div>`;
const optH=([k,l,ic])=>`<div class="dd-opt" data-k="${esc(k)}">${ic?ico(ic):''}<span>${esc(l)}</span></div>`;
function dd(id,o={}){const list=o.all?[['',o.all],...o.list]:o.list,ph=o.all||o.ph||'აირჩიეთ...';
 return `<div class="ddw"><div class="dd" id="${id}" data-val="${esc(o.val||'')}" data-ph="${esc(ph)}"><button type="button" class="dd-btn"><span class="dd-val">${esc(ph)}</span><span class="car">▾</span></button><div class="dd-list">${list.map(optH).join('')}</div></div>${o.other?`<input class="dd-other" id="${id}O" placeholder="${esc(o.otherPh||'შეიყვანეთ...')}" hidden>`:''}</div>`}
const closeDD=()=>$$('.dd.open').forEach(d=>d.classList.remove('open'));
function setDD(d,k,user){d.dataset.val=k;let h=d.dataset.ph;$$('.dd-opt',d).forEach(o=>{const on=o.dataset.k===k;o.classList.toggle('sel',on);if(on&&k!=='')h=o.innerHTML});
 const v=d.querySelector('.dd-val');v.innerHTML=h;v.classList.toggle('ph',k==='');
 const ot=$('#'+d.id+'O');if(ot){ot.hidden=k!='other';if(k!='other')ot.value='';else if(user)ot.focus()}
 if(user){const w=d.closest('.fld');if(w)clearOne(w);d.dispatchEvent(new Event('change'))}}
function setOpts(d,list,sel){d.querySelector('.dd-list').innerHTML=list.map(optH).join('');setDD(d,sel)}
const initDD=(root=document)=>$$('.dd',root).forEach(d=>setDD(d,d.dataset.val));
document.addEventListener('click',e=>{const op=e.target.closest('.dd-opt');
 if(op){setDD(op.closest('.dd'),op.dataset.k,true);closeDD();return}
 const b=e.target.closest('.dd-btn');
 if(b){const d=b.parentElement,was=d.classList.contains('open');closeDD();if(!was)d.classList.add('open');return}
 closeDD()});

/* ---------- cards ---------- */
const ill=p=>`<svg class="ill" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[p.type]||ICONS.other}</svg>`;
/* tag emoji on the cards: shown in grayscale (see .te in style.css), never colorful */
const CATE={'ოქრო':'🪙','ვერცხლი':'🥈','ბრილიანტი':'💎','პლატინა':'⚪','საათი':'⌚'},TYPEE={ring:'💍',bracelet:'📿',earring:'✨',watch:'⌚',brooch:'🏵',necklace:'📿',coin:'🪙',cross:'✝',chain:'⛓',other:'💎'},GENE={'ქალის':'♀','კაცის':'♂','უნისექსი':'⚥'};
/* ---------- collection: horizontal rows ---------- */
let SORT='new',PER=0;
const PERS=[['0','ყველა დრო'],['1','ბოლო 24 საათი'],['7','ბოლო 7 დღე'],['30','ბოლო 30 დღე']];
const SORTS=[['new','თარიღი კლებადი'],['old','თარიღი ზრდადი'],['pa','ფასი ზრდადი'],['pd','ფასი კლებადი']];
UI.list='<path d="M4 6h16M4 12h16M4 18h16"/>';
const ago=ts=>{const d=Math.floor((Date.now()-(ts||0))/DAY);return d<1?'დღეს':d==1?'გუშინ':d<30?d+' დღის წინ':d<365?Math.floor(d/30)+' თვის წინ':Math.floor(d/365)+' წლის წინ'};
function rowCard(p){
 const f=favs.includes(p.id),hex=cardHex(p),c=pc[p.id]||'GEL',metal=(p.attrs&&p.attrs.metal)||p.cat,tn=typeName(p),
  at=[[CATE[p.cat]||'🪙',metal],['⚖',p.weight?p.weight+' გრ':''],[TYPEE[p.type]||'💎',tn],[GENE[p.gender],p.gender]].filter(x=>x[1]),
  own=canDel(p)&&location.hash.startsWith('#profile');
 /* სტიკერები და ფერი ბარათზე შეგნებულად არ არის — ისინი მხოლოდ განცხადების გვერდზე ჩანს */
 return `<div class="card lrow${cardCls(hex)}"${hex?` style="--bc:${hex}"`:''} data-id="${p.id}" tabindex="0" role="link" aria-label="${esc(p.title)}">
  <div class="limg" style="${bgi(p.photos[0])}">${p.photos[0]?'':ill(p)}</div>
  <div class="lmid"><h4>${esc(p.title)}</h4>
   <div class="lattr">${at.map(([e,t])=>`<span><i class="te" aria-hidden="true">${e}\uFE0E</i>${esc(t)}</span>`).join('')}</div>
   <div class="lfoot">${p.vip?`<span class="lvip ${p.vip=='VIP'?'v':'s'}">${p.vip}</span>`:''}<small>${ago(p.created)}</small><small>·</small>${vwHTML(p.id)}</div></div>
  <div class="lside">
   <div class="ltop"><small class="loc">${esc(p.loc||'')}</small><button type="button" class="cact fav ${f?'on':''}" data-fav="${p.id}" aria-pressed="${f}" aria-label="ფავორიტები">${ui('heart')}</button></div>
   <div class="pline">${p.nego?'<div class="price nego">ფასი შეთანხმებით</div>':`<div class="price" data-g="${p.price}" data-id="${p.id}">${fmt(p.price,c)}</div>${curSw(p.id,c)}`}</div>
   ${own?`<div class="cbl">${ownerOf(p)?`<button type="button" class="cdel cedit" data-eph="${p.id}" aria-label="ფოტოების რედაქტირება">${ui('image')}</button>`:''}<button type="button" class="cdel" data-del="${p.id}" aria-label="წაშლა">${ui('trash')}<span>წაშლა</span></button></div>`:''}
  </div></div>`}
function card(p,plain){const f=favs.includes(p.id),c=p.id==='preview'?(p.cur||'GEL'):(pc[p.id]||p.cur||'GEL'),tn=typeName(p),hex=plain?'':cardHex(p);
 const tags=[[CATE[p.cat],p.cat],[TYPEE[p.type],tn],['⚖',p.weight?p.weight+' გრ':''],['🔖',p.attrs&&p.attrs.pur?p.attrs.pur+' სინჯი':''],[GENE[p.gender],p.gender]].filter(x=>x[1]).slice(0,3).map(([e,t])=>`<span class="tg">${e?`<i class="te" aria-hidden="true">${e}\uFE0E</i>`:''}${esc(t)}</span>`).join('');
 return `<div class="card${p.vip?(p.vip=='VIP'?' is-vip':' is-svip'):''}${cardCls(hex)}"${hex?` style="--bc:${hex}"`:''} data-id="${p.id}" tabindex="0" role="link" aria-label="${esc(p.title)}">${p.vip?`<span class="badge ${p.vip=='VIP'?'s':''}">${CROWN}${p.vip}</span>`:''}<div class="img"><div class="imgi" ${p.photos[0]?`data-bg="${bgi(p.photos[0]).replace(/"/g,'&quot;')}"`:''}>${p.photos[0]?'':ill(p)}</div></div><div class="in"><div class="cmeta"><small class="loc">${esc(p.loc||'')}</small>${vwHTML(p.id)}</div><div class="trow"><h4>${esc(p.title)}</h4><button type="button" class="cact fav ${f?'on':''}" data-fav="${p.id}" aria-pressed="${f}" aria-label="${f?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება'}" title="ფავორიტები">${ui('heart')}</button></div>${ownChip(p)}<div class="pline">${p.nego?'<div class="price nego">ფასი შეთანხმებით</div>':`<div class="price" data-g="${p.price}" data-id="${p.id}">${fmt(p.price,c)}</div>${curSw(p.id,c)}`}</div>${(()=>{const own=canDel(p)&&(parseHash()[0] === 'profile'),sk=plain?'':stkHTML(p);return tags||sk||own?`<div class="cfoot">${tags?`<div class="tags">${tags}</div>`:''}${sk}${own?`<div class="cbot"><span class="cbl">${ownerOf(p)?`<button type="button" class="cdel cedit" data-eph="${p.id}" aria-label="ფოტოების რედაქტირება" title="ფოტოების რედაქტირება">${ui('image')}</button>`:''}<button type="button" class="cdel" data-del="${p.id}" aria-label="განცხადების წაშლა" title="წაშლა">${ui('trash')}<span>წაშლა</span></button></span></div>`:''}</div>`:''})()}</div></div>`}
const grid=l=>`<div class="grid">${l.map(p=>card(p)).join('')}</div>`;
const rowGrid=l=>`<div class="hrow"><div class="grid hscroll">${l.slice(0,12).map(p=>card(p,1)).join('')}</div></div>`;

/* ---------- filters ---------- */
const filters=()=>`<div class="fgrid">${fld('საძიებო სიტყვა',dd('fT',{list:DD.type,all:'ყველა',other:1,otherPh:'ნივთის დასახელება'}))}${fld('მდებარეობა',dd('fl',{list:mk(LOC),all:'ყველა'}))}<div class="dyn" id="fDyn" data-t="">${fRender('f','')}</div></div><div class="frow"><button class="btn" id="goS">${ui('search')}<span>ძებნა</span></button><button type="button" class="btn alt" id="clrF" aria-label="გასუფთავება" title="გასუფთავება">${ui('trash')}</button></div>`;
const EPS=1e-9;
const priceIn = p =>
  listingAmount(p, F.cur === 'USD' ? 'USD' : 'GEL');
const gmatch=(p,v)=>p.gender==v||p.gender=='უნისექსი';
const match=p=>{const hay=(p.title+' '+(p.typeOther||'')).toLowerCase(),pr=priceIn(p);
 const mkMatch=()=>{const hq=F.q?hsPrep(F.q):null,cur=F.cur=='USD'?'USD':'GEL',oq=F.o?F.o.toLowerCase():'',
  xs=Object.entries(F.x||{}).filter(([,v])=>v),needP=!!(F.p1||F.p2);
 return p=>{
  if(hq&&!hq(p))return false;
  if(needP){if(p.nego)return false;const pr=listingAmount(p,cur);if((F.p1&&pr<F.p1-EPS)||(F.p2&&pr>F.p2+EPS))return false}
  if(F.t){if(F.t=='other'){if(oq){if(!(p.title+' '+(p.typeOther||'')).toLowerCase().includes(oq))return false}else if(p.type!='other')return false}else if(p.type!=F.t)return false}
  if(F.l&&p.loc!=F.l)return false;
  for(const[k,v]of xs){if(k=='brand'?!String(av(p,k)||'').toLowerCase().includes(v.toLowerCase()):k=='gen'?!gmatch(p,v):av(p,k)!=v)return false}
  if(F.w1&&p.weight<F.w1)return false;if(F.w2&&p.weight>F.w2)return false;
  return true}};
  return (!F.q||hsMatch(p,F.q))&&(!p.nego||!(F.p1||F.p2))&&(!F.t||(F.t=='other'?(F.o?hay.includes(F.o.toLowerCase()):p.type=='other'):p.type==F.t))&&(!F.l||p.loc==F.l)&&Object.entries(F.x||{}).every(([k,v])=>!v||(k=='brand'?String(av(p,k)||'').toLowerCase().includes(v.toLowerCase()):k=='gen'?gmatch(p,v):av(p,k)==v))&&(!F.w1||p.weight>=F.w1)&&(!F.w2||p.weight<=F.w2)&&(!F.p1||pr>=F.p1-EPS)&&(!F.p2||pr<=F.p2+EPS)};

/* ---------- calculator ---------- */
const M={'ოქრო':{k:'au',s:[375,585,750,916,999]},'ვერცხლი':{k:'ag',s:[800,925,999]},'პლატინა':{k:'pt',s:[850,950]}};
/* Metal prices, USD per troy ounce. Source order: 1) the LBMA benchmark (the same price the National Bank of Georgia uses for its own gold) through the optional
   proxy window.METALS_API = metals-worker.js; 2) a public live spot feed; 3) the last stored values (the numbers below are only the first-ever offline default).
   A failing source never blocks the calculator. The price field stays editable; a price typed by hand is never overwritten. */
const OZ=31.1034768,MX_LIM={au:[500,30000],ag:[5,1500],pt:[300,10000]};
let MX={au:4050,ag:58,pt:1600},MXM={src:'',date:''},mxP=null;
const mxOk=p=>!!p&&Object.keys(MX_LIM).every(k=>p[k]>=MX_LIM[k][0]&&p[k]<=MX_LIM[k][1]);
{const c=load('metalPx',null);if(c&&mxOk(c.px)){MX=c.px;MXM={src:c.src||'',date:c.date||''}}}
const metalGel=k=>MX[k]/OZ*RATE;   /* GEL per gram of pure metal */
const usdN=x=>(+x).toLocaleString('en-US',{maximumFractionDigits:2});
function metalText(){const d=new Date(String(MXM.date||'').slice(0,10)+'T12:00:00'),ds=isNaN(d)?'':' ('+d.toLocaleDateString(uiLoc(),{day:'numeric',month:'long',year:'numeric'})+')',
  pr=`ოქრო $${usdN(MX.au)} · ვერცხლი $${usdN(MX.ag)} · პლატინა $${usdN(MX.pt)} / ტროას უნცია`;
 return MXM.src=='lbma'?`ლითონების ფასი: LBMA-ს ოფიციალური ფიქსინგი${ds} — ${pr}`
  :MXM.src=='spot'?`ლითონების ფასი: მსოფლიო ბაზრის მიმდინარე ფასი${ds} — ${pr}`
  :'ლითონების ფასი მიახლოებითია — საჭიროების შემთხვევაში შეცვალეთ ხელით'}
const mxGet=async(u,ms=8000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(u,{cache:'no-store',signal:ac.signal});if(!r.ok)throw 0;return await r.json()}finally{clearTimeout(t)}};
function applyMetals(){const n=$('#metalNote');if(n)n.textContent=metalText();if(window.calcRefresh&&$('#cMetal'))window.calcRefresh()}
function loadMetals(){if(mxP)return mxP;
 return mxP=(async()=>{const c=load('metalPx',null);if(c&&c.t&&Date.now()-c.t<36e5&&mxOk(c.px))return;   /* fresh enough (1 hour) */
  let px=null,src='',date='';const api=String(window.METALS_API||'').trim();
  if(api){try{const j=await mxGet(api),p={au:+j.au.usd,ag:+j.ag.usd,pt:+j.pt.usd};if(mxOk(p)){px=p;src='lbma';date=String(j.au.date||'').slice(0,10)}}catch{}}
  if(!px){try{const L=async f=>{const j=await mxGet('https://prices.lbma.org.uk/json/'+f+'.json',9000);for(let i=j.length-1;i>=0;i--){const v=j[i]&&j[i].v&&+j[i].v[0];if(v>0)return{v,d:String(j[i].d||'').slice(0,10)}}throw 0},[a,s,t]=await Promise.all([L('gold_pm'),L('silver'),L('platinum_pm')]),p={au:a.v,ag:s.v,pt:t.v};if(mxOk(p)){px=p;src='lbma';date=a.d}}catch{}}
  if(!px){try{const g=async x=>+(await mxGet('https://api.gold-api.com/price/'+x,6000)).price,[au,ag,pt]=await Promise.all([g('XAU'),g('XAG'),g('XPT')]),p={au,ag,pt};if(mxOk(p)){px=p;src='spot';date=new Date().toISOString().slice(0,10)}}catch{}}
  if(!px)return;MX=px;MXM={src,date};save('metalPx',{px,src,date,t:Date.now()});applyMetals()})().finally(()=>{mxP=null})}
let shown=0,raf=0;
/* thin white light that travels along the real border (rounded corners included): stacked dashes of decreasing length share one leading edge, giving a soft comet tail without any blur */
const CALC_TRACE=`<div class="calc-trace" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg">${[[10,.09],[8.5,.1],[7,.12],[5.5,.15],[4,.2],[2.5,.3],[1.2,.6]].map(([L,o])=>`<rect x="0" y="0" width="100%" height="100%" rx="28" ry="28" pathLength="100" style="--L:${L};--E:${L-100};stroke-dasharray:${L} ${100-L};stroke-opacity:${o}"/>`).join('')}</svg></div>`;
const calcBox=()=>`<div class="calc-frame"><div class="calc"><h2><span class="calc-gem">${GEM}</span>სამკაულის ფასის კალკულატორი</h2><div class="calc-grid"><div class="calc-form">${fld('ლითონის ტიპი',dd('cMetal',{list:mk(Object.keys(M)),val:Object.keys(M)[0]}))}${fld('სინჯი',dd('cSample',{list:[]}))}<label>წონა (გრამი)<input id="cWeight" type="number" min="0" step="0.1" value="5"></label><label>სუფთა ლითონის ფასი 1 გრამზე (₾)<input id="cPrice" type="number" min="0" step="0.01"></label></div><div class="calc-out"><small>გამოთვლილი ფასი</small><div class="total" id="totG">0.00 ₾</div><div class="total usd" id="totU">$0.00</div><div class="bar"><i id="bar"></i></div><small id="perG"></small><small id="rateNote">${rateText()}</small><small id="metalNote">${metalText()}</small></div></div></div>${CALC_TRACE}</div>`;
function counter(tg,gT,uT){cancelAnimationFrame(raf);const a=shown,t0=performance.now();
 raf=requestAnimationFrame(function step(t){const el=$('#totG');if(!el)return;const k=Math.min(1,(t-t0)/500),e=1-Math.pow(1-k,3);shown=a+(tg-a)*e;
  if(k<1){el.textContent=gm(money(rdiv(toS(shown)*100n,SC)))+'\u00A0₾';$('#totU').textContent='$'+usdOf(shown);raf=requestAnimationFrame(step)}
  else{shown=tg;el.textContent=gm(gT)+'\u00A0₾';$('#totU').textContent='$'+uT}})}
function initCalc(){const cm=$('#cMetal'),cs=$('#cSample'),cw=$('#cWeight'),cp=$('#cPrice');
 const fillS=()=>{const s=M[cm.dataset.val].s;setOpts(cs,s.map(x=>[String(x),String(x)]),String(s[Math.min(1,s.length-1)]))};
 const calc=()=>{const w=Math.max(0,+cw.value||0),p=Math.max(0,+cp.value||0),s=+cs.dataset.val||0,S=BigInt(s),pS=toS(p),wS=toS(w),rS=toS(RATE),
   perG=money(rdiv(pS*S*100n,1000n*SC)),perU=money(rdiv(pS*S*100n,1000n*rS)),
   totG=money(rdiv(pS*S*wS*100n,1000n*SC*SC)),totU=money(rdiv(pS*S*wS*100n,1000n*SC*rS)),tot=p*s/1000*w;
  $('#perG').textContent=`1 გრ (${s} სინჯი): ${gm(perG)}\u00A0₾ / $${perU}`;
  $('#bar').style.width=Math.min(100,tot/300)+'%';counter(tot,totG,totU)};
 const gp=()=>metalGel(M[cm.dataset.val].k).toFixed(2);
 window.calcRefresh=()=>{if(!cp.dataset.u)cp.value=gp();calc()};cm.onchange=()=>{fillS();cp.dataset.u='';cp.value=gp();calc()};cs.onchange=calc;cw.oninput=calc;cp.oninput=()=>{cp.dataset.u='1';calc()};
 fillS();cp.value=gp();shown=0;calc();loadMetals()}

/* ---------- blog: posts written by the admin ---------- */
/* The admin works on a copy kept in this browser (own IndexedDB "mygem-blog", localStorage as fallback). To publish for every visitor the admin presses
   "Export" (profile -> Blog) and uploads the downloaded blog-extra.js to the site, replacing the old one. Visitors load it through window.BLOG_EXTRA.
   bposts === null means "this browser has no own copy yet": the published BLOG_EXTRA is shown (and copied on the admin's first change). */
const BDB={db:null,open(){return new Promise(r=>{try{const q=indexedDB.open('mygem-blog',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{BDB.db=q.result;r(true)};q.onerror=q.onblocked=()=>r(false);setTimeout(()=>r(false),1500)}catch{r(false)}})},
 req(mode,fn){return new Promise(r=>{if(!BDB.db)return r({ok:false});try{const t=BDB.db.transaction('kv',mode),q=fn(t.objectStore('kv'));t.oncomplete=()=>r({ok:true,v:q?q.result:undefined});t.onerror=t.onabort=()=>r({ok:false})}catch{r({ok:false})}})}};
let bposts=null,bedit=null,bcv='',blogReady=false;
const blogBase=()=>typeof BLOG!='undefined'&&Array.isArray(BLOG)?BLOG:[];
const blogExtra=()=>Array.isArray(window.BLOG_EXTRA)?window.BLOG_EXTRA:[];
const blogApi=()=>String(window.BLOG_API||'').trim().replace(/\/+$/,'');
let bsrv=null;   /* posts published on the server (BLOG_API); null = not loaded yet */
const blogMine=()=>blogApi()?(bsrv||[]):(bposts||blogExtra());
const blogList=()=>{const m=blogMine(),have=new Set(m.map(b=>String(b.id))),ex=blogApi()?blogExtra().filter(b=>!have.has(String(b.id))):[];ex.forEach(b=>have.add(String(b.id)));return[...m,...ex,...blogBase().filter(b=>!have.has(String(b.id)))]};
async function loadBlog(){try{let a=null;if(await BDB.open()){const r=await BDB.req('readonly',s=>s.get('posts'));if(r.ok&&Array.isArray(r.v))a=r.v}
  if(!a)a=load('blogPosts',null);bposts=Array.isArray(a)?a.filter(b=>b&&b.id&&b.t&&Array.isArray(b.body)):null}catch{bposts=null}await blogFetchSrv();blogReady=true}
/* server mode: public list (3 s timeout, last good copy as fallback) */
async function blogFetchSrv(){const u=blogApi();if(!u)return;
 try{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),3000);let r;try{r=await fetch(u+'/posts',{signal:ac.signal})}finally{clearTimeout(t)}
  const d=await r.json();if(!r.ok||!d.ok||!Array.isArray(d.posts))throw 0;bsrv=d.posts;lsTry('blogSrv',bsrv)}
 catch{const c=load('blogSrv',null);bsrv=Array.isArray(c)?c:(bsrv||[])}}
async function saveBlog(){if(BDB.db){const r=await BDB.req('readwrite',s=>s.put(bposts,'posts'));if(r.ok){try{localStorage.removeItem('blogPosts')}catch{}return true}}return lsTry('blogPosts',bposts)}
/* cover photo: centre-cropped to 3:2 (the proportion every blog card and article uses), max 1400 px wide */
const blogImg=f=>new Promise(r=>{const x=new FileReader();x.onerror=x.onabort=()=>r(null);x.onload=()=>{const i=new Image();i.onerror=()=>r(null);
 i.onload=()=>{try{const w=i.naturalWidth||i.width,h=i.naturalHeight||i.height;if(!w||!h)return r(null);const W=Math.min(1400,w),H=Math.round(W*h/w),c=document.createElement('canvas');c.width=W;c.height=H;
const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);g.drawImage(i,0,0,W,H);const u=c.toDataURL('image/jpeg',.78);r(isData(u)&&u.length>200?u:null)}catch{r(null)}};i.src=x.result};x.readAsDataURL(f)});
/* text <-> body lines: one line = one paragraph; "# " heading, "- " list item, **bold** (exactly what the article page already renders) */
const blogLines=t=>String(t).split('\n').map(x=>x.trim()).filter(Boolean);
const blogTxt=b=>b.reduce((a,x,i)=>a+(i?(x.startsWith('- ')&&b[i-1].startsWith('- ')?'\n':'\n\n'):'')+x,'');
const blogEx=L=>{const p=(L.find(x=>x[0]!='#'&&!x.startsWith('- '))||L[0]||'').replace(/\*\*/g,'');return p.length>170?p.slice(0,167).replace(/\s+\S*$/,'')+'…':p};
const blogMin=L=>Math.max(1,Math.round(L.join(' ').split(/\s+/).length/170));
function blogPanel(){if(bedit)return blogForm();const L=blogMine();
 return `<div class="paylist"><div class="pacts bacts"><button type="button" class="btn sm" data-bnew>${ui('plus')}ახალი სტატია</button>${L.length&&!blogApi()?'<button type="button" class="btn alt sm" data-bexp>გამოსაქვეყნებლად: blog-extra.js</button>':''}</div>
 <p class="bnote">${blogApi()?'სტატია ქვეყნდება სერვერზე და ყველა ვიზიტორს მაშინვე გამოუჩნდება. გამოქვეყნებისას Google-ით დაგიდასტურებთ ადმინისტრატორობას.':'სტატიები ინახება ამ ბრაუზერში. რომ ყველა ვიზიტორმა დაინახოს, დააჭირეთ «blog-extra.js» ღილაკს და ჩამოტვირთული ფაილი ატვირთეთ საიტზე არსებული blog-extra.js-ის ნაცვლად. ყოველი ცვლილების შემდეგ გაიმეორეთ.'}</p>
 <h3 class="psub">სტატიები (${L.length})</h3>${L.length?L.map(b=>`<div class="payrow"><div class="pthm" style="${bgi(b.img)}"></div><div class="pinf"><a href="#post:${esc(b.id)}"><b>${esc(b.t)}</b></a><small>${b.created?fdt(b.created)+' · ':''}${b.min} წთ კითხვა</small></div><div class="pacts"><button type="button" class="btn alt sm" data-bedit="${esc(b.id)}">რედაქტირება</button><button type="button" class="btn alt sm" data-bdel="${esc(b.id)}">წაშლა</button></div></div>`).join(''):'<div class="empty">სტატია ჯერ არ დაგიმატებიათ</div>'}</div>`}
function blogForm(){const b=bedit=='new'?null:blogMine().find(x=>String(x.id)===String(bedit));
 return `<form class="form" id="bForm" novalidate><h3 class="psub full">${b?'სტატიის რედაქტირება':'ახალი სტატია'}</h3>
 <label class="full">სათაური<input id="bT" maxlength="120" value="${esc(b?b.t:'')}"></label>
 <div class="fld full" id="bImgFld"><span>ქავერ-ფოტო</span><div class="bcov"><div class="bprev" id="bPrev" style="${bgi(bcv)}"></div><label class="btn alt sm">${ui('camera')}ფოტოს არჩევა<input type="file" id="bImgIn" accept="image/*" hidden></label></div><small class="bhelp">ფოტო ავტომატურად იჭრება 3:2 პროპორციით.</small></div>
 <label class="full">მოკლე აღწერა (ჩანს ბარათზე; ცარიელის შემთხვევაში აიღება ტექსტის დასაწყისი)<textarea id="bE" rows="2" maxlength="220">${esc(b?b.ex||'':'')}</textarea></label>
 <label class="full">ტექსტი<textarea id="bB" rows="14">${esc(b?blogTxt(b.body):'')}</textarea><small class="bhelp">ყოველი ახალი ხაზი — ახალი აბზაცი. <b># სათაური</b> — ქვესათაური · <b>- პუნქტი</b> — სია · <b>**ტექსტი**</b> — მუქი.</small></label>
 <label>კითხვის დრო, წუთი (არასავალდებულო)<input id="bM" type="number" min="1" max="99" value="${b&&b.mm?b.mm:''}"></label>
 <div class="row2 full"><button class="btn" type="submit">${b?'შენახვა':'გამოქვეყნება'}</button><button type="button" class="btn alt" data-bcancel>გაუქმება</button></div></form>`}
async function blogSubmit(){if(!isAdmin())return;if(!blogReady)return toast('მოიცადეთ და სცადეთ თავიდან');
 const T=$('#bT'),B=$('#bB'),E=$('#bE'),Mi=$('#bM'),t=T.value.trim(),L=blogLines(B.value);
 if(check($('#bForm'),[[T,t.length<3?'შეიყვანეთ სათაური (მინ. 3 სიმბოლო)':''],[$('#bImgFld'),bcv?'':'აირჩიეთ ქავერ-ფოტო'],[B,L.length?'':'შეიყვანეთ სტატიის ტექსტი']]))return;
 const cur=blogMine(),old=bedit=='new'?null:cur.find(x=>String(x.id)===String(bedit)),mm=Math.max(0,Math.min(99,Math.round(+Mi.value||0))),
  p={id:old?old.id:'b'+Date.now().toString(36),t,ex:E.value.trim()||blogEx(L),img:bcv,body:L,mm,min:mm||blogMin(L),created:old?old.created||Date.now():Date.now()},
  prev=bposts;
 if(blogApi()){const tok=await blogToken();if(!tok)return;const sb=$('#bForm button[type=submit]'),t0=sb&&sb.textContent;if(sb){sb.disabled=true;sb.textContent='ქვეყნდება…'}
  try{const d=await blogCall({action:'blog_save',post:p},tok);bsrv=d.posts;lsTry('blogSrv',bsrv)}
  catch(e){if(sb){sb.disabled=false;sb.textContent=t0}return toast(BERR[e]||BERR.server)}
  bedit=null;bcv='';toast(old?'სტატია განახლდა ✓':'სტატია გამოქვეყნდა ✓');return showProfile('blog')}
 bposts=old?cur.map(x=>x===old?p:x):[p,...cur];
 if(!(await saveBlog())){bposts=prev;return toast('შენახვა ვერ მოხერხდა — ფოტო ძალიან დიდია ან მეხსიერება გადაივსო')}
 bedit=null;bcv='';toast(old?'სტატია განახლდა ✓':'სტატია დაემატა ✓');showProfile('blog')}
function blogDel(id){const cur=blogMine(),b=cur.find(x=>String(x.id)===String(id));if(!b||!isAdmin())return;curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<div class="confirm"><div class="ci">${ui('trash')}</div><h3>წავშალოთ სტატია?</h3><p>«${esc(b.t)}»<br>წაშლის შემდეგ აღდგენა შეუძლებელია.</p><div class="row2"><button type="button" class="btn danger" id="bdYes">დიახ, წაშლა</button><button type="button" class="btn alt" id="bdNo">გაუქმება</button></div></div>`;
 $('#bdNo').focus();$('#bdNo').onclick=closeModal;
 $('#bdYes').onclick=async()=>{if(!isAdmin()||!blogReady)return closeModal();
  if(blogApi()){closeModal();const tok=await blogToken();if(!tok)return;
   try{const d=await blogCall({action:'blog_delete',id:b.id},tok);bsrv=d.posts;lsTry('blogSrv',bsrv)}catch(e){return toast(BERR[e]||BERR.server)}
   closeModal();toast('სტატია წაიშალა ✓');return showProfile('blog')}
  const prev=bposts;bposts=cur.filter(x=>x!==b);if(!(await saveBlog())){bposts=prev;closeModal();return toast('წაშლა ვერ მოხერხდა')}closeModal();toast('სტატია წაიშალა ✓');showProfile('blog')}}
function blogExport(){if(!isAdmin())return;const js='/* mygem.ge blog posts written in the admin panel - generated '+new Date().toISOString().slice(0,10)+' */\nwindow.BLOG_EXTRA='+JSON.stringify(blogMine())+';\n',
 a=document.createElement('a');a.href=URL.createObjectURL(new Blob([js],{type:'text/javascript'}));a.download='blog-extra.js';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('blog-extra.js ჩამოიტვირთა ✓')}


/* სავალდებულო ველები: წითელი ვარსკვლავი */
const REQ=['lE','lP','fE','fP','fP2','rT','rN','rE','rU','rP','rW','rW2','eN','eE','eP','aK','aL','aT','aD','aW','aP','a_metal','a_pur','photoFld','rcptFld','aTerms'];
function markReq(root=document){
 REQ.forEach(id=>{const el=root.querySelector('#'+id);if(!el)return;
  const w=el.closest('label,.fld');if(!w||w.querySelector('.rq'))return;
  const s=document.createElement('i');s.className='rq';s.textContent='*';s.setAttribute('aria-hidden','true');
  if(w.classList.contains('chk')){w.append(s);return}
  let host=w.matches('.fld')?w.querySelector(':scope>span'):null;
  if(!host){const tn=[...w.childNodes].find(n=>n.nodeType==3&&n.textContent.trim());if(!tn)return;
   host=document.createElement('span');host.className='lt';tn.replaceWith(host);host.append(tn)}
  const cu=host.querySelector('.cur');cu?cu.before(s):host.append(s)})}
/* ---------- password field ---------- */
const EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g class="see"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></g><g class="off"><path d="M3 3l18 18"/><path d="M10.6 5.1A9.9 9.9 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6A17 17 0 002 12s4 7 10 7c1.7 0 3.200-.4 4.500-1.100"/><path d="M9.900 9.900a3 3 0 004.200 4.200"/></g></svg>';
const pw=(id,l,ac='current-password')=>`<label>${l}<div class="pw"><input id="${id}" type="password" autocomplete="${ac}"><button type="button" class="eye" data-eye aria-label="პაროლის ჩვენება/დამალვა">${EYE}</button></div></label>`;

/* ---------- home sections ---------- */
const ARW=d=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

const homeSec=(id,t,l,em,more)=>{const row=id=='svipSec'||id=='vipSec';return `<section class="sec${row?' hsec':''}" id="${id}"><div class="shead"><h2>${t}</h2>${row&&l.length?`<div class="harr"><button type="button" class="ib" data-hs="-1" aria-label="უკან">${ARW('M19 12H5M11 6l-6 6 6 6')}</button><button type="button" class="ib" data-hs="1" aria-label="წინ">${ARW('M5 12h14M13 6l6 6-6 6')}</button></div>`:''}</div>${l.length?(row?rowGrid(l):grid(l)):`<div class="empty">${em}</div>`}${more?'<div class="more"><a class="btn alt" href="#search" data-reset>ყველა განცხადება</a></div>':''}</section>`};
/* blogs: 1st = left half, 2nd + 3rd = stacked on the right half */
const homeBlog=()=>{const b=blogList().slice(0,3);if(!b.length)return '';
 const c=(x,big)=>`<a class="hbc${big?' big':''}" href="#post:${x.id}"><span class="hbi"><img src="${safeUrl(x.img)}" alt="${esc(x.t)}" width="1400" height="934" loading="lazy" decoding="async"></span><span class="hbb"><small>${x.min} წთ კითხვა</small><b>${esc(x.t)}</b>${big?`<span class="hbe">${esc(x.ex)}</span>`:''}</span></a>`;
 return `<section class="sec hblog" id="blogHome"><h2>ბლოგი</h2><div class="hbg">${c(b[0],1)}<div class="hbs">${b.slice(1).map(x=>c(x,0)).join('')}</div></div><div class="more"><a class="btn" href="#blog">გაიგეთ მეტი</a></div></section>`};

 const PAGE=24;let RES=[];
/* ---------- views ---------- */
const views={
home(){return `<section class="hero"><h1>იპოვე შენი სრულყოფილი სამკაული</h1><p>ძვირფასი სამკაულების უსაზღვრო არჩევანი ერთ სივრცეში.</p><div class="sbox">${filters()}</div></section>
${(()=>{const P=pub().sort(byPkg);return homeSec('svipSec','Super VIP კოლექცია',P.filter(p=>pkgOf(p)=='SUPER VIP'),'ჯერ არ არის Super VIP განცხადებები')+homeSec('vipSec','VIP+ კოლექცია',P.filter(p=>pkgOf(p)=='VIP'),'ჯერ არ არის VIP განცხადებები',true)})()}
<section class="calc-wrap" id="calcHome"><div class="calc-in">${calcBox()}</div></section>
${homeBlog()}`},
search(){let r=pub().filter(mkMatch());
 if(PER)r=r.filter(p=>Date.now()-(p.created||0)<=PER*DAY);
   if(SORT=='old')r.sort((a,b)=>(a.created||0)-(b.created||0));
  else if(SORT=='pa')r.sort((a,b)=>a.price-b.price);
  else if(SORT=='pd')r.sort((a,b)=>b.price-a.price);
  else r=sortPkg(r);
  RES=r;
 
const body=!r.length
  ? '<div class="empty">ვერაფერი მოიძებნა</div>'
  : `<div class="rows">${r.slice(0,PAGE).map(rowCard).join('')}</div>${r.length>PAGE?`<div class="more"><button type="button" class="btn alt" id="moreRows">მეტის ჩვენება (${r.length-PAGE})</button></div>`:''}`;
 return `<div class="layout"><aside><div class="sbox">${filters()}</div></aside><div class="results">
 <div class="rbar">
  <div class="catalog-heading">
    <h2>${r.length} განცხადება${F.q?` · «${esc(F.q)}»`:''}</h2>
    <button type="button"
      id="catalogCurrency"
      class="cur sm${catalogCurrency === 'USD' ? ' on' : ''}"
      role="switch"
      aria-checked="${catalogCurrency === 'USD'}"
      aria-label="ყველა ფასის დოლარში ჩვენება">
      <span class="cl">₾</span>
      <span class="trk"><i></i></span>
      <span class="cl">$</span>
    </button>
  </div>
  
<div class="rtools">
  ${dd('sPer',{list:PERS,val:String(PER)})}
  ${dd('sSort',{list:SORTS,val:SORT})}
</div>
</div>${body}</div></div>`},
blog(){return `<div class="page blog"><h2 class="bh">ბლოგი</h2><p class="bsub">რჩევები, გზამკვლევები და ინსპირაცია სამკაულების სამყაროდან</p>${isAdmin()?`<div class="badm"><button type="button" class="btn sm" data-bnew>${ui('plus')}სტატიის დამატება</button></div>`:''}<div class="bgrid">${blogList().map((b,i)=>`<a class="bcard" href="#post:${b.id}"><span class="bimg"><img src="${safeUrl(b.img)}" alt="${esc(b.t)}" width="1400" height="934" loading="lazy" decoding="async"></span><span class="bbody"><small class="bm">${b.min} წთ კითხვა</small><b>${esc(b.t)}</b><span class="bex">${esc(b.ex)}</span></span></a>`).join('')}</div></div>`},
post(t){const L=blogList(),i=L.findIndex(b=>String(b.id)===String(t)),b=L[i];if(!b)return `<div class="page"><div class="panel empty">სტატია ვერ მოიძებნა<div style="margin-top:16px"><a class="btn" href="#blog">ბლოგზე დაბრუნება</a></div></div></div>`;
 const n=L[i+1];return `<article class="page art"><a class="aback" href="#blog">${ui('back')}ბლოგი</a><small class="ameta">${b.min} წუთი კითხვა</small><h1>${esc(b.t)}</h1><img class="ahero" src="${b.img}" alt="${esc(b.t)}" width="1400" height="934" decoding="async"><div class="abody">${(()=>{let h='',l=false;const f=x=>esc(x).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');for(const x of b.body){const li=x.startsWith('- ');if(l&&!li){h+='</ul>';l=false}if(li&&!l){h+='<ul>';l=true}h+=li?`<li>${f(x.slice(2))}</li>`:x[0]=='#'?`<h3>${esc(x.slice(1).trim())}</h3>`:`<p>${f(x)}</p>`}return h+(l?'</ul>':'')})()}</div>${n?`<a class="anext" href="#post:${n.id}"><small>შემდეგი სტატია</small><b>${esc(n.t)}</b></a>`:''}<div class="acta"><a class="btn" href="#search" data-reset>იხილეთ კოლექცია</a></div></article>`},
seller(t){const own=[...new Set(items.map(x=>x.owner))].find(o=>sid(o)==t);
 if(!own)return `<div class="page"><div class="panel empty">გამყიდველი ვერ მოიძებნა 
 <div style="margin-top:16px"><a class="btn" href="#მთავარი">მთავარზე დაბრუნება</a></div></div></div>`;
 const l=pub().filter(p=>same(p.owner,own)).sort(byPkg),s=sellerOf({owner:own}),tel=String(s.phone||'').replace(/[^\d+]/g,'');
 return `<div class="page sellpg" style="max-width:1100px"><button type="button" class="pback" id="pBack">${ui('back')}<span>უკან</span></button>
 <div class="sellhead"><div class="sav">${s.avatar?`<img src="${safeUrl(s.avatar)}" alt="">`:ui('user')}</div><div class="sn"><small>გამყიდველი</small><b>${esc(s.name)}</b><span class="stot" style="display:block;color:#000080;font-weight:600;font-size:13px;margin:2px 0">${l.length} განცხადება</span><em>${esc(s.type)}</em></div>${tel?`<a class="btn sb call" href="tel:${tel}">${ui('phone')}<span>${esc(s.phone)}</span></a>`:''}</div>
 <h2 class="sellh">ყველა განცხადება <span>(${l.length})</span></h2>${l.length?grid(l):'<div class="empty">განცხადებები არ არის</div>'}</div>`},
calculator(){return `<div class="page" style="max-width:960px">${calcBox()}</div>`},
favs(){if(!me){openAuth('login');return '<div class="page"><div class="panel empty">გთხოვთ შეხვიდეთ სისტემაში</div></div>'}
 const l=pub().filter(p=>favs.includes(p.id));
 return `<div class="page" style="max-width:1100px"><h1 style="color:var(--pd);margin-bottom:20px">ფავორიტები</h1>${l.length?grid(l):'<div class="empty">ფავორიტები ცარიელია</div>'}</div>`},
add(){if(!me){openAuth('login');return '<div class="page"><div class="panel empty">გთხოვთ შეხვიდეთ სისტემაში</div></div>' }
 if(!me.phone){setTimeout(()=>{toast('განცხადების დასამატებლად მიუთითეთ ტელეფონის ნომერი');location.hash='profile:edit'},0);return '<div class="page"><div class="panel empty">მიუთითეთ ტელეფონის ნომერი პროფილში</div></div>'}
  window.ph=[];window.rc=null;window.vid=null;window.aud=null;window.EDITP=window.__ed||null;window.__ed=null;
  const UP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/></svg>';
 const VUP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>';
 return `<div class="page addpg"><div class="addwrap">
 <aside class="lpc" aria-label="Listing Preview Card"><h3 class="lpc-t">დაასათაურე შენი სამკაული</h3><ol class="lpc-nav" id="lpcNav">${STEPS.map((t,i)=>`<li><button type="button" class="lpc-i${i?'':' on'}" data-step="${i+1}"${i?'':' aria-current="step"'}><span class="lpc-n">${i+1}</span><span class="lpc-l"><small>ნაბიჯი ${i+1}</small><b>${t}</b></span></button></li>`).join('')}</ol><div class="lpv" id="lpv" aria-live="polite"></div></aside>
 <div class="panel"><h2 style="margin-bottom:16px;color:var(--pd)">${window.EDITP?'განცხადების რედაქტირება':'ახალი განცხადება'}</h2><form class="form" id="addForm" novalidate><div class="fsum full" id="formSum" hidden></div>
 <section class="astep" id="st1" data-pane="1"><h3 class="astep-h full">${STEPS[0]}</h3>
 ${fld('ნივთის ტიპი',dd('aK',{list:DD.type,other:1,otherPh:'ნივთის დასახელება'}))}${fld('მდებარეობა',dd('aL',{list:mk(LOC)}))}<div class="dyn" id="aDyn">${fRender('a','')}</div><label>დასახელება<input id="aT" maxlength="80"></label>
 <label class="full">აღწერა<textarea id="aD" rows="3"></textarea></label>
 <div class="fld full" id="audioFld"><span class="aud-h"><i>${AMIC}</i>ხმოვანი აღწერა (სურვილისამებრ)</span><div class="aud-acts"><label class="btn alt sm" for="aA">${AUP}ატვირთვა (MP3)</label><button type="button" class="btn alt sm" id="aRec">${AMIC}<span>ჩაწერა</span></button><span class="aud-tm" id="aTm" hidden>0:00 / 1:00</span></div><div class="aud-bar" aria-hidden="true"><i id="aBar"></i></div><input type="file" id="aA" accept="audio/mpeg,audio/mp3,.mp3,audio/*" hidden><div class="aprev" id="aPrev"></div><small class="bhelp">გახადეთ თქვენი განცხადება უფრო მიმზიდველი — მოყევით ნივთის შესახებ საკუთარი ხმით. ატვირთეთ MP3 ან ჩაწერეთ პირდაპირ აქ (მაქს. 1 წუთი).</small></div><div class="trio full"><label>წონა (გრ)<input id="aW" type="number" step="0.1" min="0" inputmode="decimal" placeholder="მაგ: 4.5"></label><div class="fld"><span class="plab">ფასი (<b id="aPS">₾</b>)<button type="button" class="cur sm" id="aCur" role="switch" aria-checked="false" aria-label="ფასი დოლარში"><span class="cl">₾</span><span class="trk"><i></i></span><span class="cl">$</span></button></span><div class="prow2"><input id="aP" type="number" min="0" step="any" inputmode="decimal" placeholder="მაგ: 850"></div><label class="chk nego"><input type="checkbox" id="aNego"> ფასი შეთანხმებით</label><small class="chint" id="aPH"></small></div></div></section>
 <section class="astep" id="st2" data-pane="2" hidden><h3 class="astep-h full">${STEPS[1]}</h3>
 <div class="fld full" id="photoFld"><span>ფოტოები (მინ. 3, მაქს. 8)</span><label class="drop" id="drop" for="aF"><span class="up">${UP}</span><b>ატვირთეთ ფოტოები</b><small>გადმოათრიეთ აქ ან <u>აირჩიეთ ფაილები</u></small><small>JPG, PNG, WEBP · პირველი ფოტო იქნება მთავარი</small></label><input type="file" id="aF" accept="image/*" multiple hidden><div class="pcount" id="pcount"><div class="pbar"><i id="pbar"></i></div><span id="pcnt">0/3 მინიმუმ</span></div><div class="photos" id="prev"></div></div>
 <div class="fld full" id="videoFld"><span>ვიდეო (არასავალდებულო · 1 ვიდეო, მაქს. ${VID_MB}MB)</span><label class="drop" for="aV"><span class="up">${VUP}</span><b>ატვირთეთ ვიდეო</b><small>MP4, WEBM, MOV · მაქს. ${VID_MB}MB</small></label><input type="file" id="aV" accept="video/mp4,video/webm,video/quicktime" hidden><div class="vprev" id="vPrev"></div></div></section>
 <section class="astep" id="st3" data-pane="3" hidden><h3 class="astep-h full">${STEPS[2]}</h3><p class="astep-s full">არასავალდებულო ფასიანი ფუნქციები: VIP / Super VIP პაკეტები, ბარათის ფერი და სტიკერები. Regular განცხადება უფასოა.</p>
 ${fld('განცხადების ტიპი',dd('aPlan',{list:Object.keys(PLANS).map(k=>[k,planLabel(k)]),val:'REG'}),'full')}<p class="planinfo full" id="planInfo"></p>${payBox()}</section>
 <section class="astep" id="st4" data-pane="4" hidden><h3 class="astep-h full">${STEPS[3]}</h3><p class="astep-s full">გადაამოწმეთ განცხადება და გამოაქვეყნეთ.</p><div class="areview full" id="aReview" aria-live="polite"></div>
 <label class="chk full"><input type="checkbox" id="aTerms"> ვეთანხმები <span class="tl" data-terms>წესებსა და პირობებს</span></label></section>
 <div class="anav full"><button type="button" class="btn alt" id="aBack" hidden>უკან</button><button type="button" class="btn" id="aNext">შემდეგი</button><button class="btn" type="submit" id="aPub" hidden>გამოქვეყნება</button></div>
 </form></div></div></div>`},
 edit(t){const p=items.find(x=>String(x.id)===String(t));
 if(!me){openAuth('login');return '<div class="page"><div class="panel empty">გთხოვთ შეხვიდეთ სისტემაში</div></div>'}
 if(!p||!ownerOf(p))return '<div class="page"><div class="panel empty">განცხადება ვერ მოიძებნა<div style="margin-top:16px"><a class="btn" href="#profile:mine">უკან</a></div></div></div>';
 window.__ed=p;return views.add()},
product(t){const p=items.find(x=>String(x.id)===String(t)&&!held(x));
 if(!p)return `<div class="page"><div class="panel empty">ეს განცხადება ვერ მოიძებნა <div style="margin-top:16px"><a class="btn" href="#home">მთავარზე დაბრუნება</a></div></div></div>`;
 countView(p);
 const c=pc[p.id]||p.cur||'GEL',f=favs.includes(p.id),s=sellerOf(p),tn=typeName(p),imgs=p.photos||[],sim=similar(p),n=pv[p.id]||0;
 const rows=[['კატეგორია',p.cat],['ნივთის ტიპი',tn,p.type],['სქესი',p.gender],['წონა',p.weight?p.weight+' გრ':''],['მდებარეობა',p.loc],...attrRows(p)].filter(r=>r[1]);
 const tel=String(s.phone||'').replace(/[^\d+]/g,'');
 const hex=cardHex(p);
 const nm=imgs.length+(p.video?1:0),main=(imgs.length?`<img id="pgImg" src="${safeUrl(imgs[0])}" alt="${esc(p.title)}">`:p.video?'':`<div class="pph">${ill(p)}</div>`)+(p.video?`<video id="pgVid" class="pmv" src="${esc(p.video)}" controls playsinline preload="metadata"${imgs.length?' hidden':''}></video>`:'');
 return `<div class="page pdp"><button type="button" class="pback" id="pBack">${ui('back')}<span>უკან</span></button>
 <div class="pd-grid">
  <div class="pgal" id="pgal" data-id="${p.id}">
   <div class="pmain">${main}${imgs.length?`<button type="button" class="pzoom" data-zoom aria-label="ფოტოს გადიდება" title="გადიდება"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M11 8v6M8 11h6"/></svg></button>`:''}${p.vip?`<span class="badge ${p.vip=='VIP'?'s':''}">${CROWN}${p.vip}</span>`:''}${nm>1?`<button type="button" class="pnav l" data-pg="-1" aria-label="წინა">${ui('prev')}</button><button type="button" class="pnav r" data-pg="1" aria-label="შემდეგი">${ui('next')}</button><span class="pcnt" id="pgCnt">1 / ${nm}</span>`:''}</div>
   ${nm>1?`<div class="pthumbs">${imgs.map((s,i)=>`<button type="button" class="pth ${i?'':'on'}" data-i="${i}" aria-label="ფოტო ${i+1}"><img src="${safeUrl(s)}" alt=""></button>`).join('')}${p.video?`<button type="button" class="pth vth ${imgs.length?'':'on'}" data-i="${imgs.length}" aria-label="ვიდეო"><video src="${safeUrl(p.video)}#t=0.1" preload="metadata" muted playsinline></video><span class="vplay"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z"/></svg></span></button>`:''}</div>`:''}
   ${stkHTML(p)}
  </div>
  <div class="pinfo${hex?' tint':''}"${hex?` style="--bc:${hex}"`:''}>
   <div class="pmeta"><span>${ui('calendar')}${dateStr(p.created)}</span><span>${ui('eye')}${n} ნახვა</span></div>
   <h1 class="ptitle">${esc(p.title)}</h1>
   <div class="pprice">${p.nego?'<span class="price nego">ფასი შეთანხმებით</span>':`<span class="price" data-g="${p.price}" data-id="${p.id}">${fmt(p.price,c)}</span>${curSw(p.id,c)}`}</div>
   <div class="pact"><button type="button" class="pa pic ${f?'on':''}" data-pfav="${p.id}" aria-pressed="${f}" aria-label="${f?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება'}" title="${f?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება'}">${ui('heart')}<span class="lb">ფავორიტები</span></button><button type="button" class="pa pic" data-share="${p.id}" aria-label="გაზიარება" title="გაზიარება">${ui('share')}<span class="lb">გაზიარება</span></button>${ownerOf(p)?`<button type="button" class="pa pic" data-eph="${p.id}" aria-label="ფოტოების რედაქტირება" title="ფოტოების რედაქტირება">${ui('image')}<span class="lb">ფოტოები</span></button>`:''}${canDel(p)?`<button type="button" class="pa pic" data-del="${p.id}" aria-label="წაშლა" title="წაშლა">${ui('trash')}<span class="lb">წაშლა</span></button>`:''}</div>
   <div class="pattrs">${rows.map(r=>`<div class="pr2"><span>${r[0]}</span><b>${r[2]?ico(r[2]):''}${esc(r[1])}</b></div>`).join('')}</div>
   <div class="pdesc"><h3>აღწერა</h3><p>${esc(p.desc||'')}</p>${p.audio?`<div class="pvoice"><h3>ხმოვანი აღწერა</h3>${audPlayer(p.audio)}</div>`:''}</div>
   <div class="pseller">
    <a class="sh" href="#seller:${sid(p.owner)}" title="იხილე გამყიდველის ყველა განცხადება"><div class="sav">${s.avatar?`<img src="${safeUrl(s.avatar)}" alt="">`:ui('user')}</div><div class="sn"><small>გამყიდველი</small><b>${esc(s.name)}</b><span class="stot" style="display:block;color:#000080;font-weight:600;font-size:13px;margin:2px 0">${pub().filter(x=>same(x.owner,p.owner)).length} განცხადება</span><em>${esc(s.type)}</em></div></a>
    <a class="sph" href="tel:${tel}">${esc(s.phone||'')}</a>
    <div class="sbtns"><a class="btn sb call" href="tel:${tel}">${ui('phone')}<span>დარეკვა</span></a><button type="button" class="btn sb" data-msg="${p.id}">${ui('chat')}<span>მიწერა</span></button></div>
   </div>
  </div>
 </div>
 ${sim.length?`<section class="simsec"><h2>მსგავსი განცხადებები</h2>${grid(sim)}</section>`:''}</div>`},
profile(tab='mine'){if(!me){openAuth('login');return ''}
  if((tab=='pay'||tab=='blog')&&!isAdmin())tab='mine';
 const mine=items.filter(p=>p.owner==me.email).sort((a,b)=>(b.created||0)-(a.created||0)||(+b.id||0)-(+a.id||0)),ind=regOf(me)=='individual',nm=ind?me.name+' '+(me.last||''):me.name;
 const since=me.created?new Date(me.created).toLocaleDateString(uiLoc(),{year:'numeric',month:'long',day:'numeric'}):'—';
 return `<div class="page"><div class="panel"><div class="prof-head"><div class="ava">${me.avatar?`<img src="${safeUrl(me.avatar)}">`:ui('user')}</div><div class="ph-info"><h2>${esc(nm)}</h2><small class="pmail">${ui('mail')}${esc(me.email)}</small><div class="stats"><span class="stat"><i>${ui('tag')}</i><span><b>${esc(regLabel(me))}</b></span></span><span class="stat"><i>${ui('calendar')}</i><span>ანგარიში შექმნილია: <b>${since}</b></span></span><span class="stat"><i>${ui('gem')}</i><span>განცხადებები: <b>${mine.length}</b></span></span></div><label class="btn alt sm">${ui('camera')}ფოტოს შეცვლა<input type="file" id="avIn" accept="image/*" hidden></label>${me.avatar?`<button type="button" class="btn alt sm" id="avDel" style="margin-left:8px">${ui('trash')}ფოტოს წაშლა</button>`:''}</div><a href="#add" class="btn" style="margin-left:auto">${ui('plus')}დამატება</a></div>
 <div class="tabs"><button data-tab="mine" class="${tab=='mine'?'on':''}">${ui('user')}ჩემი პროფილი</button>${isAdmin()?`<button data-tab="pay" class="${tab=='pay'?'on':''}">${ui('tag')}გადახდები${pendingPay().length?` (${pendingPay().length})`:''}</button>`:''}${isAdmin()?`<button data-tab="blog" class="${tab=='blog'?'on':''}">${ui('image')}ბლოგი</button>`:''}<button class="btn alt" id="logout">${ui('logout')}გასვლა</button></div>
 ${tab=='pay'?payPanel():tab=='blog'?blogPanel():tab=='edit'?`<h3 class="psub" style="margin:0 0 14px">პარამეტრები</h3><form class="form" id="eForm" novalidate>${fld('რეგისტრაციის ტიპი',dd('eT',{list:DD.reg,val:regOf(me),other:1,otherPh:'მიუთითეთ რეგისტრაციის ტიპი'}),'full')}<label id="eNL" class="full">${ind?'სახელი და გვარი':'დასახელება'}<input id="eN" value="${esc(ind?(me.name+' '+(me.last||'')).trim():me.name)}" autocomplete="name"></label><label id="eLL" hidden><input id="eL" type="hidden" value="${esc(me.last||'')}"></label><label class="full">ელ-ფოსტა<input id="eE" type="email" value="${esc(me.email)}" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="name@mail.com"></label><div class="duo full"><label>მომხმარებლის სახელი<input id="eU" value="${esc(me.username||'')}" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false"></label><label>ტელეფონი<input id="eP" value="${esc(me.phone)}" autocomplete="tel" inputmode="tel" maxlength="17" placeholder="5__ ___ ___"></label></div>${pw('ePw','ახალი პაროლი','new-password')}${pw('ePw2','გაიმეორეთ პაროლი','new-password')}<button class="btn full" type="submit">შენახვა</button></form>`:mine.length?grid(mine):'<div class="empty">ჩანაწერი არ არის</div>'}</div></div>`}};

const ORDER={home:0,search:1,product:1.5,seller:1.6,calculator:2,blog:3,post:3.1,favs:4,add:5,edit:5,profile:6};
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
let navN=0,lastIdx=0,rTok=0,pendingScroll=null,lastV='';
/* მისამართები: #catalog, #item/9, #blog/9, #seller/abc, #profile/listings, #edit/9 (ძველი #product:9 ფორმატიც მუშაობს) */
/* მისამართები: #ძებნა, #განცხადება/9, #ბლოგი/9, #გამყიდველი/abc, #პროფილი/განცხადებები ... (ძველი #product:9, #search ფორმატიც მუშაობს) */
const SL={home:'მთავარი',search:'ძებნა',product:'განცხადება',blog:'ბლოგი',seller:'გამყიდველი',calculator:'კალკულატორი',favs:'ფავორიტები',add:'დამატება',edit:'რედაქტირება',profile:'პროფილი'};
const TB={mine:'განცხადებები',edit:'პარამეტრები',pay:'გადახდები',blog:'ბლოგი'};
const rev=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[v,k]));
const VR={...rev(SL),catalog:'search',item:'product'},TR={...rev(TB),listings:'mine'};
function parseHash(){let s=location.href.split('#')[1]||'';try{s=decodeURIComponent(s)}catch{}
 const m=s.match(/^([^:\/]*)[:\/]?(.*)$/);let h=VR[m[1]]||m[1],t=m[2]||undefined;
 if(h=='blog'&&t)h='post';
 if(h=='profile'&&t)t=TR[t]||t;
 return[h,t]}
const hashOf=(v,t)=>'#'+(v=='post'?SL.blog:SL[v]||v)+(t?'/'+(v=='profile'?TB[t]||t:t):'');
/* HI() = მიმდინარე მისამართი კოდის შიგნით გამოსაყენებელი (ძველი) სახით, მაგ. '#search', '#profile:blog' */
const HI=()=>{const[h,t]=parseHash();return h?'#'+h+(t?':'+t:''):''};
/* page transition: same slide + fade language as the Login <-> Registration swap */
function route(){sweep();let[h,t]=parseHash();if(h=='pay'){toast(t=='ok'?'გადახდა მიღებულია ✓ — სტატუსი ავტომატურად ჩაირთვება':'გადახდა მუშავდება… განაახლეთ გვერდი რამდენიმე წამში');history.replaceState(null,'',hashOf('profile','mine'));h='profile';t='mine'}if(views[h]){const c=hashOf(h,t);let raw=location.href.split('#')[1]||'';try{raw=decodeURIComponent(raw)}catch{}if(raw&&raw!==c.slice(1))history.replaceState(null,'',c)}if(h=='calculator'){pendingScroll='calcHome';h='home';history.replaceState(null,'','#მთავარი')}else if(h=='collection'){F={};h='search';history.replaceState(null,'','#search')}const v=views[h]?h:'home',tok=++rTok,app=$('#app'),idx=ORDER[v]??0,dir=Math.sign(idx-lastIdx)||1;
 const render=()=>{app.innerHTML=views[v](t);window.scrollTo({top:0,behavior:'instant'});bind();if(window.applyLang)window.applyLang(document.body);if(pendingScroll){const el=document.getElementById(pendingScroll);pendingScroll=null;if(el)requestAnimationFrame(()=>el.scrollIntoView({behavior:REDUCE?'auto':'smooth',block:'start'}))}};
 const _prev=lastV;lastV=v;navN++;lastIdx=idx;
 if(REDUCE || window.__fast || v === 'product' || v === 'search' || _prev === 'search'){
  window.__fast=0;
  app.getAnimations().forEach(a => a.cancel());
  render();
  return;
}
 if(navN==1){render();app.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});return}
 app.getAnimations().forEach(a=>a.cancel());
 const out=app.animate([{opacity:1,transform:'none'},{opacity:0,transform:`translateX(${-40*dir}px)`}],{duration:170,easing:'ease',fill:'forwards'});
 out.onfinish=()=>{if(tok!=rTok)return;render();app.animate([{opacity:0,transform:`translateX(${40*dir}px)`},{opacity:1,transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});out.cancel()}}
function showProfile(tab){if(tab!='blog'){bedit=null;bcv=''}$('#app').innerHTML=views.profile(tab);bind();if(window.applyLang)window.applyLang(document.body)}

/* reveal-on-scroll for collection cards (re-triggers each time a card scrolls into view) */
let io=null;
function reveal(){if(REDUCE||!('IntersectionObserver' in window))return;if(io)io.disconnect();
 io=new IntersectionObserver(es=>{
  const vis=es.filter(e=>e.intersectionRatio>=.1).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left);
  vis.forEach((en,i)=>{en.target.style.setProperty('--d',Math.min(i,6)*90+'ms');en.target.classList.remove('rv')});
  es.forEach(en=>{if(en.intersectionRatio===0&&en.boundingClientRect.top>0){en.target.style.setProperty('--d','0ms');en.target.classList.add('rv')}})
 },{threshold:[0,.1],rootMargin:'0px 0px -40px 0px'});
 const lz=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const el=e.target;el.style.cssText=el.dataset.bg;lz.unobserve(el)}}),{rootMargin:'300px'});
$$('.imgi[data-bg]',$('#app')).forEach(el=>lz.observe(el));
 $$('.card',$('#app')).forEach(el=>{el.classList.add('rv');io.observe(el)})}

/* product page: gallery + back button */
function bindV2(){
 const bk=$('#pBack');if(bk)bk.onclick=()=>{if(navN>1)history.back();else location.hash='home'};
 const pg=$('#pgal');if(!pg)return;
 const p=items.find(x=>String(x.id)===pg.dataset.id),imgs=(p&&p.photos)||[],vd=p&&p.video?1:0,N=imgs.length+vd,img=$('#pgImg'),vid=$('#pgVid'),cnt=$('#pgCnt');const openLB=k=>{if(!imgs.length)return;let z=false;const d=document.createElement('div');d.className='lbx';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
  d.innerHTML=`<button type="button" class="lbx-x" aria-label="დახურვა">×</button>${imgs.length>1?'<button type="button" class="lbx-n l" data-d="-1" aria-label="წინა">‹</button><button type="button" class="lbx-n r" data-d="1" aria-label="შემდეგი">›</button>':''}<div class="lbx-s"><img alt=""></div><span class="lbx-c"></span><span class="lbx-h">დააჭირეთ ფოტოს გასადიდებლად</span>`;
  const im=d.querySelector('img'),st=d.querySelector('.lbx-s'),ct=d.querySelector('.lbx-c');
  const zoom=on=>{z=on;d.classList.toggle('z',on);if(!on){st.scrollLeft=0;st.scrollTop=0}else{requestAnimationFrame(()=>{st.scrollLeft=(st.scrollWidth-st.clientWidth)/2;st.scrollTop=(st.scrollHeight-st.clientHeight)/2})}};
  const show=n=>{k=(n+imgs.length)%imgs.length;im.src=safeUrl(imgs[k]);ct.textContent=`${k+1} / ${imgs.length}`;zoom(false)};
  const close=()=>{document.removeEventListener('keydown',key);d.remove();document.body.style.overflow=''};
  const key=e=>{if(e.key=='Escape')close();else if(e.key=='ArrowRight')show(k+1);else if(e.key=='ArrowLeft')show(k-1)};
  d.onclick=e=>{if(e.target.closest('.lbx-x')||e.target===d||e.target===st)return close();const n=e.target.closest('[data-d]');if(n)return show(k+(+n.dataset.d));if(e.target===im)zoom(!z)};
  document.body.append(d);document.body.style.overflow='hidden';document.addEventListener('keydown',key);show(k)};
 const curK=()=>Math.max(0,imgs.findIndex(s=>safeUrl(s)===img.getAttribute('src')));
 if(img)img.addEventListener('click',()=>openLB(curK()));
 const zb=$('[data-zoom]',pg);if(zb)zb.addEventListener('click',()=>openLB(curK()));
 if(N<2)return;
 let i=0,x0=null;
 const go=n=>{i=(n+N)%N;const isV=vd&&i==imgs.length;if(vid&&!isV)vid.pause();
  if(isV){if(img)img.hidden=true;vid.hidden=false}else{if(vid)vid.hidden=true;if(img){img.hidden=false;img.classList.add('sw');setTimeout(()=>{img.src=safeUrl(imgs[i]);img.classList.remove('sw')},170)}}
  $$('.pth',pg).forEach((b,k)=>b.classList.toggle('on',k==i));cnt.textContent=`${i+1} / ${N}`;
  const on=$('.pth.on',pg);if(on)on.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'})};
 pg.addEventListener('click',e=>{const t=e.target.closest('.pth');if(t)return go(+t.dataset.i);const a=e.target.closest('[data-pg]');if(a)go(i+(+a.dataset.pg))});
 const pm=$('.pmain',pg);pm.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
 pm.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>40)go(i+(dx<0?1:-1))})}
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.matches&&e.target.matches('.card[data-id]')&&!e.target.closest('.cact'))location.hash = 'product:' + e.target.dataset.id;});

/* ---------- photos ---------- */
const rd=f=>new Promise(r=>{const x=new FileReader();x.onerror=x.onabort=()=>r(null);
 x.onload=()=>{const i=new Image();i.onerror=()=>r(null);
  i.onload=()=>{try{const w=i.naturalWidth||i.width,h=i.naturalHeight||i.height;if(!w||!h)return r(null);
   const s=Math.min(1,1000/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*s));c.height=Math.max(1,Math.round(h*s));
   const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(i,0,0,c.width,c.height);
   const u=c.toDataURL('image/jpeg',.8);r(isData(u)&&u.length>200?u:null)}catch{r(null)}};
  i.src=x.result};
 x.readAsDataURL(f)});
const RD_FAIL='ზოგი ფოტოს წაკითხვა ვერ მოხერხდა — გამოიყენეთ JPG, PNG ან WEBP';
function drawPrev(){const p=$('#prev');if(!p)return;
 p.innerHTML=ph.map((s,i)=>`<div class="ph"><img src="${safeUrl(s)}" alt="">${i==0?'<span class="cover">მთავარი</span>':''}<button type="button" class="rm" data-rm="${i}" aria-label="წაშლა">×</button></div>`).join('');
 const n=ph.length;$('#pbar').style.width=Math.min(100,n/3*100)+'%';$('#pcnt').textContent=n>=3?`✓ ${n} ფოტო`:`${n}/3 მინიმუმ`;$('#pcount').classList.toggle('ok',n>=3);if(n>=3)clearOne($('#photoFld'))}
async function addFiles(files){files=[...files];const imgs=files.filter(f=>f.type.startsWith('image/')&&f.size<=15*1024*1024);
 if(imgs.length<files.length)toast('დაშვებულია მხოლოდ სურათები (მაქს. 15MB)');
 const room=8-ph.length;if(room<=0)return toast('მაქსიმუმ 8 ფოტო');if(imgs.length>room)toast('მაქსიმუმ 8 ფოტო');
 const take=imgs.slice(0,room),rdd=(await Promise.all(take.map(rd))).filter(Boolean);if(rdd.length<take.length)toast(RD_FAIL);const got=await modFilter(rdd);window.ph=[...ph,...got];drawPrev()}

/* ---------- payment receipt (image or PDF) ---------- */
const rdR=f=>new Promise(r=>{const x=new FileReader();x.onload=()=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas'),k=Math.min(1,1100/i.width);c.width=i.width*k;c.height=i.height*k;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(i,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',.8))};i.onerror=()=>r(null);i.src=x.result};x.onerror=()=>r(null);x.readAsDataURL(f)});
async function readReceipt(f){if(!f)return;const pdf=f.type=='application/pdf';
 if(!pdf&&!f.type.startsWith('image/'))return toast('დაშვებულია მხოლოდ სურათი ან PDF');
 if(f.size>15*1024*1024)return toast('ფაილი ძალიან დიდია (მაქს. 15MB)');
 if(pdf&&f.size>1.5*1024*1024)return toast('PDF ძალიან დიდია (მაქს. 1.5MB)');
 const data=pdf?await new Promise(r=>{const x=new FileReader();x.onload=()=>r(x.result);x.onerror=()=>r(null);x.readAsDataURL(f)}):await rdR(f);
 if(!data)return toast('ფაილის წაკითხვა ვერ მოხერხდა');window.rc={name:f.name,type:pdf?'pdf':'img',data};drawRc()}
function drawRc(){const r=window.rc,P=$('#rcPrev');if(!P)return;
 P.innerHTML=r?`${r.type=='img'?`<img src="${safeUrl(r.data)}" alt="">`:'<span class="pdfi">PDF</span>'}<span class="rcn">${esc(r.name)}</span><button type="button" class="rm2" id="rcRm" aria-label="წაშლა">×</button>`:'';
 const b=$('#rcRm');if(b)b.onclick=()=>{window.rc=null;drawRc()};if(r)clearOne($('#rcptFld'))}

/* ---------- bindings ---------- */
function bind(){initDD();if(location.hash=='#search'&&F.q&&hsIn){hs.classList.add('open');hsIn.value=F.q;hsX.hidden=false}markReq();bindV2();reveal();
 [['f','#fT'],['a','#aK']].forEach(([pre,sel])=>{const t=$(sel);if(t&&!t.dataset.bd){t.dataset.bd=1;t.addEventListener('change',()=>setDyn(pre,t.dataset.val,readDyn(pre),pre=='f'?readNum():{}))}});
 const g=$('#goS');if(g){g.onclick=()=>{F={t:$('#fT').dataset.val,o:$('#fTO').value.trim(),l:$('#fl').dataset.val,x:readDyn('f'),w1:+(($('#fw1')||{}).value)||0,w2:+(($('#fw2')||{}).value)||0,p1:+$('#fp1').value||0,p2:+$('#fp2').value||0, cur:FCUR};if(location.hash=='#search')route();else location.hash='search'};
const cf=$('#clrF');if(cf)cf.onclick=e=>{e.preventDefault();F={};FCUR='GEL';
  setDD($('#fT'),'');$('#fTO').value='';setDD($('#fl'),'');setDyn('f','',{},{});
  $$('.rg.open').forEach(x=>x.classList.remove('open'))};
  if(location.hash=='#search'){setDD($('#fT'),F.t||'');$('#fTO').value=F.o||'';setDD($('#fl'),F.l||'');const pn={};if(F.p1)pn.fp1=F.p1;if(F.p2)pn.fp2=F.p2;if(F.w1)pn.fw1=F.w1;if(F.w2)pn.fw2=F.w2;FCUR=F.cur||'GEL';setDyn('f',F.t||'',F.x||{},pn)}}
 if($('#cMetal'))initCalc();
 $$('[data-tab]').forEach(b=>b.onclick=()=>showProfile(b.dataset.tab));
 const lo=$('#logout');if(lo)lo.onclick=confirmLogout;
 const av=$('#avIn');if(av)av.onchange=async()=>{const f=av.files[0];if(!f)return;const a0=await rd(f);av.value='';if(!a0)return toast(RD_FAIL);const ak=await modFilter([a0]);if(!ak.length)return;if(!me){openAuth('login');return}const res=await apiSend('PUT','/api/auth/profile',{avatar:ak[0],avatarOff:false});if(!res.ok){toast(res.data.message||'ფოტო ვერ აიტვირთა');return}adopt(res.data);setLogin();toast('ფოტო განახლდა ✓');showProfile('mine')};
 const ad=$('#avDel');if(ad)ad.onclick=async()=>{if(!me)return;const res=await apiSend('PUT','/api/auth/profile',{avatar:'',avatarOff:true});if(!res.ok){toast(res.data.message||'ფოტო ვერ წაიშალა');return}adopt(res.data);setLogin();toast('პროფილის ფოტო წაიშალა ✓');showProfile('mine')};

 /* add listing */
 const af=$('#addForm');if(af){const dr=$('#drop'),pf=$('#aF');
  pf.onchange=async()=>{await addFiles(pf.files);pf.value=''};
  ['dragenter','dragover'].forEach(ev=>dr.addEventListener(ev,e=>{e.preventDefault();dr.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>dr.addEventListener(ev,e=>{e.preventDefault();dr.classList.remove('drag')}));
  dr.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
  $('#prev').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){ph.splice(+b.dataset.rm,1);drawPrev()}};
  drawPrev();
  const PL=$('#aPlan'),PB=$('#payBox'),CK=$('#aColor'),RF=$('#aR');
      const syncPlan=()=>{const k=PL.dataset.val,pl=PLANS[k],paid=k!='REG';PB.hidden=false;
    $('#planInfo').innerHTML=paid?`<b>${planName(k)}</b> · ${pl.price} ₾ · ${pl.days} დღე — ბეჯი კოლექციაში და „გამორჩეული განცხადებების“ სექციაში. სტატუსი ჩაირთვება გადახდის დადასტურების შემდეგ.`:'<b>Regular</b> · უფასო · სტანდარტული განცხადება';
    paySummary()};
   const CB=$('#aColorBox'),showCB=()=>{CB.hidden=!CK.checked;paySummary()};PL.addEventListener('change',()=>{syncPlan();showCB()});CK.onchange=showCB;RF.onchange=async()=>{await readReceipt(RF.files[0]);RF.value=''};
   $$('[data-copy]').forEach(b=>b.onclick=async()=>{const k=BANKS.find(x=>x.id==b.dataset.copy),ok=await copyText(k.iban);toast(ok?k.name+': ანგარიშის ნომერი დაკოპირდა ✓':'დააკოპირეთ ხელით');if(ok){const l=b.querySelector('span');l.textContent='დაკოპირდა ✓';b.classList.add('ok');setTimeout(()=>{l.textContent='კოპირება';b.classList.remove('ok')},1800)}});
   syncPlan();
   /* ---- step navigation (Listing Preview Card) ---- */
   window.aStep=1;
   const wrap=af.closest('.addwrap'),PN=$$('.astep',af),NV=$$('.lpc-i',wrap),seen=new Set([1]),ddv=el=>{const b=el&&el.querySelector('.dd-val');return el&&el.dataset.val&&b?b.textContent.replace(/\s+/g,' ').trim():''};
   const stk=()=>cleanStk($('#aSP .sval').value.split(','));
   const doneOf=i=>{if(i==1){const K=$('#aK'),L=$('#aL'),k=K.dataset.val,KO=$('#aKO');
     return !!(k&&(k!='other'||(KO&&KO.value.trim()))&&L.dataset.val&&$('#a_metal').dataset.val&&$('#a_pur').dataset.val&&$('#aT').value.trim().length>=3&&wc($('#aT').value)<=3&&$('#aD').value.trim().length>=10&&+$('#aW').value>0&&($('#aNego').checked||+$('#aP').value>0))}
    if(i==2)return ph.length>=3;
    if(i==3)return seen.has(3)&&((PL.dataset.val=='REG'&&!CK.checked&&!stk().length)||!!window.rc);
    return false};
         /* ---- price currency: the seller enters ₾ or $, the listing is always stored in GEL ---- */
   const curUSD=()=>$('#aCur').classList.contains('on');
   const priceGel=()=>{const v=+$('#aP').value||0;return curUSD()?Math.round(v*RATE*100)/100:v};
   const priceHint=()=>{const v=+$('#aP').value||0,h=$('#aPH');if(!h)return;
    h.textContent=v>0?(curUSD()?`≈ ${gelTxt(priceGel())} · 1 $ = ${RATE.toFixed(4)} ₾ (NBG)`:`≈ $${usdOf(v)}`):''};
   $('#aCur').onclick=()=>{const b=$('#aCur'),on=!b.classList.contains('on');b.classList.toggle('on',on);b.setAttribute('aria-checked',on);$('#aPS').textContent=on?'$':'₾';refresh()};
   $('#aNego').onchange=()=>{const n=$('#aNego').checked,P=$('#aP');P.disabled=n;$('#aCur').disabled=n;if(n){P.value='';clearOne(P.closest('.fld'))}refresh()};

   const refresh=()=>{NV.forEach((b,i)=>b.classList.toggle('done',doneOf(i+1)));const pf=$('#photoFld'),rf=$('#rcptFld');if(pf&&ph.length>=3)clearOne(pf);if(rf&&window.rc)clearOne(rf);priceHint();drawPreview()};
   /* ---- live preview: the same card() markup that the published listing uses ---- */
   const PV=$('#lpv');let pvT=0,pvOpen=innerWidth>900;
   if(PV)PV.addEventListener('toggle',e=>{if(e.target.matches('details'))pvOpen=e.target.open},true);
   const drawPreview=()=>{clearTimeout(pvT);pvT=setTimeout(()=>{if(!PV)return;
    const k=$('#aK').dataset.val||'',KO=$('#aKO'),A=readDyn('a'),pk=PL.dataset.val,pl=PLANS[pk],sel=stk(),
          ed=window.EDITP,
     d={...(ed||{}),id:ed?ed.id:'preview',title:$('#aT').value.trim()||'განცხადების სათაური',cat:ed?ed.cat:'',type:k,
      typeOther:k=='other'&&KO?KO.value.trim():'',weight:+$('#aW').value||0,price:$('#aNego').checked?0:priceGel(),
nativePrice:$('#aNego').checked?0:(+$('#aP').value||0),nego:$('#aNego').checked,cur:curUSD()?'USD':'GEL',
      gender:A.gen||'',attrs:A,loc:$('#aL').dataset.val||'',photos:ph.length?[ph[0]]:[],
      owner:ed?ed.owner:me.email,created:ed?ed.created:Date.now()};
    /* ახალ განცხადებაზე სტატუსი/ფერი/სტიკერები ფორმიდან იკითხება; რედაქტირებისას რჩება ის, რაც განცხადებას რეალურად აქვს (vip, color, stickers, pay) */
    if(!ed)Object.assign(d,{vip:pk=='REG'?'':pl.name,color:CK.checked,colorHex:$('#aCP .cval').value,sticker:sel.length>0,stickers:sel});
    const
     html=card(d).replace('tabindex="0" role="link"','tabindex="-1" aria-hidden="true"'),
     done=NV.filter(b=>b.classList.contains('done')&&!b.closest('li').hidden).length,tot=window.EDITP?3:4;
    PV.innerHTML=`<details class="lpv-d"${pvOpen?' open':''}>
          <summary class="lpv-h"><b>ასე გამოჩნდება განცხადება</b><small>${ed?'ახლანდელი განცხადება':done+'/4 შევსებულია'}</small></summary>
     <div class="lpv-bar"><i style="width:${ed?100:done/4*100}%"></i></div>
     <div class="lpv-card">${html}</div>
     <p class="lpv-n">${ph.length?'':'ფოტოს ატვირთვის შემდეგ აქ გამოჩნდება მთავარი ფოტო. '}ფასი, სტატუსი, ფერი და სტიკერები ბარათზე ავტომატურად განახლდება.</p></details>`},60)};
   const drawReview=()=>{const k=$('#aK').dataset.val,KO=$('#aKO'),pk=PL.dataset.val,pl=PLANS[pk],sel=stk(),col=CK.checked,amt=pl.price+(col?COLOR.price:0)+sel.length*STICKER.price;
    const r=(l,v)=>`<div class="rv-r"><span>${l}</span><b>${v?esc(String(v)):'<i class="miss">არ არის მითითებული</i>'}</b></div>`,g=(n,rows)=>`<div class="rv-g"><h4>${STEPS[n-1]}</h4><button type="button" class="rv-e" data-step="${n}">შეცვლა</button></div>${rows}`;
    $('#aReview').innerHTML=g(1,r('ნივთის ტიპი',k=='other'?(KO&&KO.value.trim()):ddv($('#aK')))+r('მდებარეობა',ddv($('#aL')))+r('დასახელება',$('#aT').value.trim())+r('წონა',+$('#aW').value>0?$('#aW').value+' გრ':'')+r('ფასი',$('#aNego').checked?'შეთანხმებით':+$('#aP').value>0?$('#aP').value+(curUSD()?' $ (≈ '+gelTxt(priceGel())+')':' ₾'):''))
     +g(2,r('ფოტოები',ph.length>=3?ph.length+' ფოტო':'')+r('ვიდეო',window.vid?window.vid.name:'არ არის დამატებული')+r('ხმოვანი აღწერა',window.aud?window.aud.name:'არ არის დამატებული'))
         +(window.EDITP?'':g(3,r('განცხადების ტიპი',planLabel(pk))+r('ფერადი ბარათი',col?'დიახ · +'+COLOR.price+' ₾':'არა')+r('სტიკერები',sel.length?sel.length+' · +'+sel.length*STICKER.price+' ₾':'არა')+(amt?`<div class="rv-r tot"><span>სულ გადასახდელი</span><b>${amt} ₾</b></div>`:'')))};
   const goStep=(n,sc)=>{n=Math.max(1,Math.min(4,n));window.aStep=n;seen.add(n);
    PN.forEach((p,i)=>p.hidden=i+1!=n);
    NV.forEach((b,i)=>{b.classList.toggle('on',i+1==n);if(i+1==n)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
    $('#aBack').hidden=n==1;$('#aNext').hidden=n==4;$('#aPub').hidden=n!=4;
    if(n==4)drawReview();refresh();if(sc!==false)wrap.scrollIntoView({block:'start',behavior:'smooth'})};
   /* ---- per-step validation: forward navigation is blocked until the current step is valid; entered data is never cleared ---- */
   const FS=$('#formSum'),stepList=i=>{
    if(i==1){const K=$('#aK'),KO=$('#aKO'),L=$('#aL'),T=$('#aT'),D=$('#aD'),W=$('#aW'),P=$('#aP'),k=K.dataset.val,t=T.value.trim(),d=D.value.trim(),w=+W.value,p=+P.value,
            dyn=[[$('#a_metal'),$('#a_metal').dataset.val?'':'აირჩიეთ ლითონის ტიპი'],[$('#a_pur'),$('#a_pur').dataset.val?'':'აირჩიეთ სინჯი']];
     return [[K,k?'':'აირჩიეთ ნივთის ტიპი'],[KO,k=='other'&&!KO.value.trim()?'მიუთითეთ ნივთის დასახელება':''],...dyn,[L,L.dataset.val?'':'აირჩიეთ მდებარეობა'],
      [T,!t?'შეიყვანეთ დასახელება':t.length<3?'მინიმუმ 3 სიმბოლო':wc(t)>3?'მაქსიმუმ 3 სიტყვა':''],[D,!d?'შეიყვანეთ აღწერა':d.length<10?'აღწერა ძალიან მოკლეა (მინ. 10 სიმბოლო)':''],
      [W,!(w>0)?'მიუთითეთ წონა (0-ზე მეტი)':w>10000?'წონა ძალიან დიდია':''],[P,$('#aNego').checked?'':(!(p>0)?'მიუთითეთ ფასი (0-ზე მეტი)':p>100000000?'ფასი ძალიან მაღალია':'')]]}
    if(i==2)return [[$('#photoFld'),ph.length<3?`ატვირთეთ მინიმუმ 3 ფოტო (ახლა: ${ph.length})`:'']];
    if(i==3)return [[$('#rcptFld'),FLITT.ready?'':(PL.dataset.val!='REG'||CK.checked||stk().length>0)&&!window.rc?'ატვირთეთ გადახდის ქვითარი (სავალდებულოა ფასიანი განცხადებისთვის)':'']];
    return []};
   const tryStep=(n,sc)=>{n=Math.max(1,Math.min(4,n));const cur=window.aStep;if(n<=cur)return goStep(n,sc);
    for(let i=cur;i<n;i++){if(window.aStep!=i)goStep(i,false);const bad=check(af,stepList(i));
     if(bad){FS.hidden=false;FS.textContent=`⚠️ გასაგრძელებლად შეასწორეთ ან შეავსეთ ${bad} ველი`;return toast('შეავსეთ ყველა სავალდებულო ველი, რომ გააგრძელოთ')}}
    FS.hidden=true;goStep(n,sc)};
   wrap.addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b&&wrap.contains(b)){e.preventDefault();tryStep(+b.dataset.step)}});
   const skip3=n=>!!window.EDITP&&n==3;
   $('#aBack').onclick=()=>{let n=window.aStep-1;if(skip3(n))n--;goStep(n)};$('#aNext').onclick=()=>{let n=window.aStep+1;if(skip3(n))n++;tryStep(n)};
   ['input','change'].forEach(ev=>af.addEventListener(ev,refresh));af.addEventListener('click',()=>setTimeout(refresh,0));
   [$('#prev'),$('#rcPrev')].forEach(el=>{if(el)new MutationObserver(refresh).observe(el,{childList:true})});
   /* ---- video (optional, 1 file) ---- */
   const VP=$('#vPrev'),vrd=f=>new Promise(r=>{const x=new FileReader();x.onerror=x.onabort=()=>r(null);x.onload=()=>r(x.result);x.readAsDataURL(f)});
   const drawVid=()=>{const v=window.vid;VP.innerHTML=v?`<div class="vp"><video src="${safeUrl(v.data)}" controls preload="metadata" muted playsinline></video><div class="vpi"><b>${esc(v.name)}</b><small>${(v.size/1048576).toFixed(1)} MB</small></div><button type="button" class="rm" data-vrm aria-label="ვიდეოს წაშლა">×</button></div>`:''};
   $('#aV').onchange=async()=>{const inp=$('#aV'),f=inp.files[0];inp.value='';if(!f)return;
    if(modRequired())return toast('ვიდეოს ატვირთვა დროებით გამორთულია უსაფრთხოების მიზნით');
    if(!/^video\/(mp4|webm|quicktime)$/.test(f.type))return toast('დაშვებულია MP4, WEBM ან MOV ვიდეო');
    if(f.size>VID_MB*1048576)return toast(`ვიდეო ძალიან დიდია (მაქს. ${VID_MB}MB)`);
    const d=await vrd(f);if(!d)return toast('ვიდეოს წაკითხვა ვერ მოხერხდა');window.vid={data:d,name:f.name,size:f.size};drawVid()};
   VP.onclick=e=>{if(e.target.closest('[data-vrm]')){window.vid=null;drawVid()}};
   /* ---- voice description (optional): MP3 upload or microphone recording ---- */
   const AP=$('#aPrev'),ard=f=>new Promise(r=>{const x=new FileReader();x.onerror=x.onabort=()=>r(null);x.onload=()=>r(x.result);x.readAsDataURL(f)});
   const drawAud=()=>{const a=window.aud;AP.innerHTML=a?`<div class="vp">${audPlayer(a.data)}<div class="vpi"><b>${esc(a.name)}</b><small>${(a.size/1048576).toFixed(1)} MB</small></div><button type="button" class="rm" data-arm aria-label="აუდიოს წაშლა">×</button></div>`:'';refresh()};
   $('#aA').onchange=async()=>{const inp=$('#aA'),f=inp.files[0];inp.value='';if(!f)return;
    if(!/^audio\//.test(f.type)&&!/\.mp3$/i.test(f.name))return toast('დაშვებულია მხოლოდ აუდიო ფაილი (MP3)');
    if(f.size>AUD_MB*1048576)return toast(`აუდიო ძალიან დიდია (მაქს. ${AUD_MB}MB)`);
    const d=await ard(f);if(!d)return toast('ფაილის წაკითხვა ვერ მოხერხდა');
    const len=await new Promise(r=>{const a=new Audio();a.preload='metadata';a.onloadedmetadata=()=>r(a.duration);a.onerror=()=>r(NaN);a.src=d;setTimeout(()=>r(NaN),5000)});
    if(!isFinite(len))return toast('აუდიო ფაილის წაკითხვა ვერ მოხერხდა');
    if(len>AUD_SEC+0.5)return toast('ხმოვანი აღწერა უნდა იყოს მაქსიმუმ 1 წუთის ხანგრძლივობის');
    window.aud={data:d,name:f.name,size:f.size};drawAud()};
   AP.onclick=e=>{if(e.target.closest('[data-arm]')){window.aud=null;drawAud()}};
   let mr=null,ms=null,chunks=[],tmr=0,t0=0;const RB=$('#aRec'),TM=$('#aTm');
   const stopRec=()=>{if(mr&&mr.state!='inactive')mr.stop()};
   const endRec=()=>{clearInterval(tmr);TM.hidden=true;$('#aBar').style.width='0';RB.classList.remove('rec');RB.querySelector('span').textContent='ჩაწერა';if(ms)ms.getTracks().forEach(t=>t.stop());ms=null};
   RB.onclick=async()=>{if(mr&&mr.state=='recording')return stopRec();
    if(!window.isSecureContext)return toast('ხმის ჩაწერა მუშაობს მხოლოდ უსაფრთხო (https://) მისამართზე — გახსენით საიტი https-ით ან ატვირთეთ MP3');
if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder)return toast('თქვენი ბრაუზერი ხმის ჩაწერას არ უჭერს მხარს — ატვირთეთ MP3');
    try{ms=await navigator.mediaDevices.getUserMedia({audio:true})}catch{return toast('მიკროფონზე წვდომა უარყოფილია')}
    chunks=[];mr=new MediaRecorder(ms);
    mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    mr.onstop=async()=>{const b=new Blob(chunks,{type:mr.mimeType||'audio/webm'});endRec();
     if(!b.size)return;if(b.size>AUD_MB*1048576)return toast(`ჩანაწერი ძალიან დიდია (მაქს. ${AUD_MB}MB)`);
     const d=await ard(b);if(!d)return toast('ჩანაწერის დამუშავება ვერ მოხერხდა');window.aud={data:d,name:'ხმოვანი ჩანაწერი',size:b.size};drawAud()};
    mr.start();t0=Date.now();TM.hidden=false;TM.textContent='0:00 / 1:00';$('#aBar').style.width='0';RB.classList.add('rec');RB.querySelector('span').textContent='გაჩერება';
    tmr=setInterval(()=>{const s=Math.floor((Date.now()-t0)/1000);TM.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+' / 1:00';$('#aBar').style.width=Math.min(100,s/AUD_SEC*100)+'%';if(s>=AUD_SEC)stopRec()},250)};
      if(window.EDITP){const q=window.EDITP;
    NV[2].closest('li').hidden=true;$('#aTerms').checked=true;$('#aTerms').closest('label').hidden=true;$('#aPub').textContent='შენახვა';
    setDD($('#aK'),q.type);setDyn('a',q.type,{...(q.attrs||{}),gen:q.gender},{});
    if(q.type=='other'&&$('#aKO'))$('#aKO').value=q.typeOther||'';
    setDD($('#aL'),q.loc||'');$('#aT').value=q.title||'';$('#aD').value=q.desc||'';$('#aW').value=q.weight||'';
    const editUSD = hasNative(q) && q.cur === 'USD';
const currencyButton = $('#aCur');

currencyButton.classList.toggle('on', editUSD);
currencyButton.setAttribute('aria-checked', String(editUSD));
$('#aPS').textContent = editUSD ? '$' : '₾';

if (q.nego) {
  $('#aNego').checked = true;
  $('#aNego').onchange();
} else {
  $('#aP').value = hasNative(q) ? q.nativePrice : (q.price || '');
}
    window.ph=[...(q.photos||[])];drawPrev();
    if(q.video){window.vid={data:q.video,name:'ვიდეო',size:q.video.length*.75};drawVid()}
    if(q.audio){window.aud={data:q.audio,name:'ხმოვანი აღწერა',size:q.audio.length*.75};drawAud()}}
    goStep(1,false);
   af.onsubmit=async e=>{e.preventDefault();if(window.aStep!=4)return tryStep(window.aStep+1);const K=$('#aK'),KO=$('#aKO'),T=$('#aT'),D=$('#aD'),W=$('#aW'),P=$('#aP'),TM=$('#aTerms');
   const t=T.value.trim(),d=D.value.trim(),w=+W.value,p=priceGel(),k=K.dataset.val,L=$('#aL'),A={},dyn=fkeys(k).map(x=>{const el=$('#a_'+x),v=FD[x].t=='text'?el.value.trim():el.dataset.val;if(v)A[x]=v;return[el,x=='metal'&&!v?'აირჩიეთ ლითონის ტიპი':x=='pur'&&!v?'აირჩიეთ სინჯი':'']});
   const n=check(af,[[K,k?'':'აირჩიეთ ნივთის ტიპი'],[KO,k=='other'&&!KO.value.trim()?'მიუთითეთ ნივთის დასახელება':''],...dyn,[L,L.dataset.val?'':'აირჩიეთ მდებარეობა'],
[T,!t?'შეიყვანეთ დასახელება':t.length<3?'მინიმუმ 3 სიმბოლო':wc(t)>3?'მაქსიმუმ 3 სიტყვა':''],[D,!d?'შეიყვანეთ აღწერა':d.length<10?'აღწერა ძალიან მოკლეა (მინ. 10 სიმბოლო)':''],
    [W,!(w>0)?'მიუთითეთ წონა (0-ზე მეტი)':w>10000?'წონა ძალიან დიდია':''],[P,$('#aNego').checked?'':(!(p>0)?'მიუთითეთ ფასი (0-ზე მეტი)':p>100000000?'ფასი ძალიან მაღალია':'')],
    [$('#photoFld'),ph.length<3?`ატვირთეთ მინიმუმ 3 ფოტო (ახლა: ${ph.length})`:''],[$('#rcptFld'),FLITT.ready?'':(PL.dataset.val!='REG'||CK.checked||cleanStk($('#aSP .sval').value.split(',')).length>0)&&!window.rc?'ატვირთეთ გადახდის ქვითარი (სავალდებულოა ფასიანი განცხადებისთვის)':''],[TM,TM.checked?'':'გასაგრძელებლად დაეთანხმეთ წესებსა და პირობებს']]);
   const S=$('#formSum');
   if(n){S.hidden=false;S.textContent=`⚠️ გამოსაქვეყნებლად შეასწორეთ ან შეავსეთ ${n} ველი`;{const bd=af.querySelector('.bad'),pn=bd&&bd.closest('.astep');if(pn){goStep(+pn.dataset.pane,false);setTimeout(()=>bd.scrollIntoView({block:'center',behavior:'smooth'}),30)}}return toast('განცხადება არ გამოქვეყნდა — შეავსეთ ყველა სავალდებულო ველი')}
   S.hidden=true;
      if(window.EDITP){const q=window.EDITP,old={...q},sb=af.querySelector('button[type=submit]'),sbt=sb.textContent;
    Object.assign(q,{title:t,type:k,typeOther:k=='other'?KO.value.trim():'',desc:d,weight:w,gender:A.gen||'',loc:L.dataset.val,attrs:A,price:$('#aNego').checked?0:p,
nativePrice:$('#aNego').checked?0:(+$('#aP').value||0),cur:curUSD()?'USD':'GEL',cur:curUSD()?'USD':'GEL',photos:[...ph],video:window.vid?window.vid.data:'',audio:window.aud?window.aud.data:''});
    sb.disabled=true;sb.textContent='ინახება…';let ok=false;try{ok=await commitItems(q)}catch{ok=false}
    if(!ok){Object.assign(q,old);saveItems(items);sb.disabled=false;sb.textContent=sbt;return toast('ცვლილებები ვერ შეინახა')}
    toast('ცვლილებები შენახულია ✓');location.hash='profile:mine';return}
   const pk=PL.dataset.val,pl=PLANS[pk],paid=pk!='REG',col=CK.checked,sel=cleanStk($('#aSP .sval').value.split(',')),stk=sel.length>0,need=paid||col||stk,amt=pl.price+(col?COLOR.price:0)+sel.length*STICKER.price,now=Date.now();
    if(need&&!FLITT.ready&&!window.rc)return;
    if(af.dataset.busy)return;
    const pay=need?{plan:pl.name,days:pl.days,color:col,sticker:stk,stickers:sel,stkN:sel.length,amount:amt,status:'pending',created:now,colorHex:col?$('#aCP .cval').value:'',provider:FLITT.ready?'flitt':'bank'}:null;
    if(need&&!FLITT.ready&&window.rc){pay.receipt=window.rc.data;pay.receiptName=window.rc.name;pay.receiptType=window.rc.type}
    const rec={id:now,title:t,cat:'',type:k,typeOther:k=='other'?KO.value.trim():'',desc:d,weight:w,gender:A.gen||'',loc:L.dataset.val,attrs:A,price:$('#aNego').checked?0:p,nego:$('#aNego').checked,cur:curUSD()?'USD':'GEL',photos:[...ph],video:window.vid?window.vid.data:'',audio:window.aud?window.aud.data:'',vip:'',hold:need,color:false,sticker:false,stickers:[],owner:me.email,created:now,pay};
    items.push(rec);

let paymentTab = null;

if (need && FLITT.ready) {
  paymentTab = window.open('about:blank', '_blank');
  if (paymentTab) paymentTab.opener = null;
}

const sb = af.querySelector('button[type=submit]');
const sbt = sb.textContent;

af.dataset.busy = '1';
sb.disabled = true;
sb.textContent = 'ინახება…';

let saved = false;

try {
  saved = await commitItems(rec);
} catch {
  saved = false;
}

if (!saved) {
  if (paymentTab && !paymentTab.closed) paymentTab.close();

  delete af.dataset.busy;
  sb.disabled = false;
  sb.textContent = sbt;

  const index = items.indexOf(rec);
  if (index !== -1) items.splice(index, 1);
  saveItems(items);

  S.hidden = false;
  S.textContent = 'განცხადება ვერ შეინახა — სცადეთ ხელახლა.';
  return toast('განცხადების შენახვა ვერ მოხერხდა');
}

delete af.dataset.busy;
sb.disabled = false;
sb.textContent = sbt;

if (need && FLITT.ready) {
  location.hash = 'profile:mine';

  if (paymentTab && !paymentTab.closed) {
    const opened = await startFlittPay(rec.id, paymentTab);

    if (!opened) {
      toast('განცხადება შენახულია — გადახდა გააგრძელეთ პროფილიდან');
    }
  } else {
    toast('განცხადება შენახულია — დაუშვით ახალი ტაბის გახსნა და გადახდა პროფილიდან გააგრძელეთ');
  }

  return;
}

window.ph = [];

   delete af.dataset.busy;
sb.disabled = false;
sb.textContent = sbt;
    await addNote(need?`«${t}» გაიგზავნა. გადახდა მოწმდება — განცხადება გამოჩნდება ადმინისტრატორის დადასტურების შემდეგ`:'განცხადება გამოქვეყნდა: '+t);if(need)(window.ADMIN_EMAILS||[]).forEach(a=>pushNote(a,`ახალი გადახდა შესამოწმებლად: «${t}» – ${paid?pl.name:'დამატებითი სერვისები'}, ${amt} ₾`));toast('განცხადება დაემატა ✓');showPub();location.hash='profile:mine'}}

 /* profile edit */
 const ef=$('#eForm');if(ef){const T=$('#eT');if(regOf(me)=='other')$('#eTO').value=me.regOther||'';
  const sync=()=>{const ind=T.dataset.val=='individual';$('#eNL .lt').firstChild.textContent=ind?'სახელი და გვარი':'დასახელება'};T.onchange=sync;
  ef.onsubmit=e=>{e.preventDefault();const old=me.email,ty=T.dataset.val,ind=ty=='individual',O=$('#eTO'),N=$('#eN'),L=$('#eL'),E=$('#eE'),P=$('#eP'),W=$('#ePw'),W2=$('#ePw2'),U=$('#eU');
  const full=N.value.trim().replace(/\s+/g,' '),sp=full.indexOf(' '),n=ind&&sp>0?full.slice(0,sp):full,l=ind&&sp>0?full.slice(sp+1):'',em=E.value.trim(),tel=P.value.trim(),un=U.value.trim();
   if(check(ef,[[O,ty=='other'&&!O.value.trim()?'მიუთითეთ რეგისტრაციის ტიპი':''],[N,ind?(!full?'შეიყვანეთ სახელი და გვარი':!l?'შეიყვანეთ სახელიც და გვარიც':''):nameMsg(n,'დასახელება')], 
    [E,emailMsg(em)||(!same(em,old)&&users.some(u=>same(u.email,em))?'ეს ელ-ფოსტა დაკავებულია':'')],[P,!tel?'შეიყვანეთ ტელეფონი':!isPhone(tel)?'არასწორი ტელეფონის ნომერი':''],
    [U,!un&&!me.username?'':unameMsg(un,old)],[W,W.value?pwMsg(W.value):''],[W2,W.value&&W2.value!=W.value?'პაროლები არ ემთხვევა':'']]))return;
   const send=async current=>{if(!me){openAuth('login');toast('გთხოვთ თავიდან შეხვიდეთ');return}
    const body={regType:ty,regOther:ty=='other'?O.value.trim():'',shop:!ind,name:n,last:ind?l:'',email:em,phone:tel,username:un};
    if(W.value)body.password=W.value;if(current)body.currentPassword=current;
    const res=await apiSend('PUT','/api/auth/profile',body,true);
    if(!res.ok){if(res.data.error=='bad_password'){askPass(send);return}toast(res.data.message||'შენახვა ვერ მოხერხდა');return}
    if(em!=old){items.forEach(p=>{if(p.owner==old)p.owner=em});save('items',items);if(notes[old]){notes[em]=notes[old];delete notes[old];save('notes',notes)}}
    adopt(res.data);setLogin();if(W.value)addNote('პაროლი შეიცვალა');toast('შენახულია ✓');showProfile('edit')};
   if((W.value||!same(em,old))&&me.hasPass)askPass(send);else send('')}}}

/* ---------- Google sign-in (ID token is verified on the backend: tryon-worker.js -> google_auth) ---------- */
const GONLY='ეს ანგარიში Google-ით არის შექმნილი — გამოიყენეთ „Continue with Google“.';
const GERR={google_not_configured:'Google-ით შესვლა ამჟამად მიუწვდომელია',email_not_verified:'თქვენი Google ელ-ფოსტა დადასტურებული არ არის',email_linked:'ეს ელ-ფოსტა სხვა Google ანგარიშთანაა დაკავშირებული',bad_token:'Google-ით შესვლა ვერ მოხერხდა. სცადეთ თავიდან.',rate_limited:'ძალიან ბევრი მცდელობა, სცადეთ მოგვიანებით',network:'სერვერთან დაკავშირება ვერ მოხერხდა',server:'Google-ით შესვლა ვერ მოხერხდა. სცადეთ თავიდან.'};
const gApi=()=>String(window.AUTH_API||window.TRYON_API||'').trim();
const gPost=async b=>{const r=await fetch(gApi(),{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-MyGem':'1'},body:JSON.stringify(b)});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw d.error||'server';return d};
let gCfgP=null,gLibP=null,gInit=null,gBusy=false;
const gCfg=()=>gCfgP||(gCfgP=gPost({action:'auth_config'}).catch(e=>{gCfgP=null;throw e}));
const gLib=()=>gLibP||(gLibP=new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client?hl='+(window.MYGEM_LANG==='en'?'en':'ka');s.async=true;s.onload=ok;s.onerror=()=>{gLibP=null;s.remove();no('network')};document.head.append(s)}));
function gShow(msg,muted){const n=$('#gNote');if(!n){if(msg)toast(msg);return}n.textContent=msg||'';n.hidden=!msg;n.classList.toggle('mu',!!muted)}
function gMount(B){
 const wrap=document.createElement('div');wrap.className='gblock';
 wrap.innerHTML='<div class="gsep"><span>ან</span></div><div class="gwrap" id="gBtn"></div><p class="gnote" id="gNote" hidden></p>';
const form=B.querySelector('#authForm');
if(form) form.after(wrap);
else B.append(wrap);
 const host=wrap.querySelector('#gBtn'),alive=()=>document.body.contains(host);
 if(!gApi()){gShow(GERR.google_not_configured,true);return}
 Promise.all([gCfg(),gLib()]).then(([c])=>{
  if(!alive())return;
  if(!c.ready||!c.clientId){gShow(GERR.google_not_configured,true);return}
  if(gInit!==c.clientId){google.accounts.id.initialize({client_id:c.clientId,callback:gCred,ux_mode:'popup',auto_select:false,itp_support:true});gInit=c.clientId}
  let lastWidth = 0;

const renderGoogleButton = () => {
  if (!alive()) return;

  const width = Math.floor(Math.min(400, host.clientWidth));

  // დაელოდოს, სანამ ფანჯარა რეალურ სიგანეს მიიღებს
  if (width < 200 || width === lastWidth) return;

  lastWidth = width;
  host.replaceChildren();

  google.accounts.id.renderButton(host, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    locale: window.MYGEM_LANG === 'en' ? 'en' : 'ka',
    width
  });
};

const observer = new ResizeObserver(() => {
  if (!alive()) {
    observer.disconnect();
    return;
  }

  renderGoogleButton();
});

observer.observe(host);
requestAnimationFrame(renderGoogleButton);
 }).catch(e=>{if(alive())gShow(GERR[e]||GERR.network,true)})}
const gTokSet=t=>{try{sessionStorage.setItem('gtok',t)}catch{}};
const jwtExp=t=>{try{return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp*1000}catch{return 0}};
const gTokGet=()=>{let t='';try{t=sessionStorage.getItem('gtok')||''}catch{}return t&&jwtExp(t)>Date.now()+60000?t:''};
async function gCred(r){
 if(r&&r.credential)gTokSet(r.credential);
 if(window.__gWait){const w=window.__gWait;window.__gWait=null;w((r&&r.credential)||null);return}   /* admin re-check for blog publishing */
 if(gBusy||!r||!r.credential)return;gBusy=true;gShow('');
 try{const d=await gPost({action:'google_auth',credential:r.credential});gSign(d)}
 catch(e){gShow(GERR[e]||GERR.server)}
 finally{gBusy=false}}
/* ---------- blog server (BLOG_API): the server verifies the Google token and the admin e-mail; this code only fetches / hands over the token ---------- */
const BERR={unauthorized:'ადმინისტრატორის უფლება ვერ დადასტურდა',forbidden:'ეს Google ანგარიში ადმინისტრატორი არ არის',invalid_post:'სტატიის მონაცემები არასწორია',too_large:'ფოტო ძალიან დიდია',network:'სერვერთან დაკავშირება ვერ მოხერხდა',not_configured:'ბლოგის სერვერი ჯერ არ არის გამართული',server:'სერვერზე შენახვა ვერ მოხერხდა. სცადეთ თავიდან.'};
function blogToken(){const c=gTokGet();if(c)return Promise.resolve(c);
 return new Promise(async res=>{curAuth=null;modal.classList.add('show');
  $('#modalBody').innerHTML='<h3>ადმინისტრატორის დადასტურება</h3><p>გამოსაქვეყნებლად დაადასტურეთ ადმინისტრატორობა Google-ით. ეს ამ სესიაში ერთხელ დაგჭირდებათ.</p><div class="gwrap" id="gAdm"></div><p class="gnote" id="gAdmN" hidden></p><button type="button" class="link" id="gAdmNo">გაუქმება</button>';
  const done=v=>{window.__gWait=null;res(v)},note=m=>{const n=$('#gAdmN');if(n){n.textContent=m;n.hidden=!m}};
  $('#gAdmNo').onclick=()=>{closeModal();done(null)};
  try{const[cfg]=await Promise.all([fetch(blogApi()+'/config').then(r=>r.json()),gLib()]);
   if(!cfg.ok||!cfg.clientId)throw 'not_configured';
   if(gInit!==cfg.clientId){google.accounts.id.initialize({client_id:cfg.clientId,callback:gCred,ux_mode:'popup',auto_select:false,itp_support:true});gInit=cfg.clientId}
   window.__gWait=t=>{closeModal();done(t)};
   const h=$('#gAdm');if(!h)return done(null);
   google.accounts.id.renderButton(h,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'rectangular',logo_alignment:'left',locale:window.MYGEM_LANG==='en'?'en':'ka',width:260})
  }catch(e){note(BERR[e]||BERR.network)}})}
async function blogCall(body,tok){let r;
 try{r=await fetch(blogApi(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,token:tok})})}catch{throw 'network'}
 const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.ok){if(r.status==401||r.status==403)try{sessionStorage.removeItem('gtok')}catch{}throw d.error||'server'}
 return d}
/* one Google identity (sub) = one account; an existing account with the same verified email is linked, never duplicated */
function gSign(d){
 if(!d||!d.user){gShow(GERR.server);return}
 const existed=users.some(x=>same(x.email,d.user.email));
 adopt(d);
 if(!existed)addNote('მოგესალმებით mygem.ge-ზე! ანგარიში წარმატებით შეიქმნა. განცხადების დასამატებლად პროფილში მიუთითეთ ტელეფონის ნომერი.');
 toast(existed?'მოგესალმებით!':'რეგისტრაცია წარმატებულია ✓');
 afterAuth()}

/* ---------- phone (SMS) verification at registration ----------
   The code is generated, sent and checked by the backend (sms-worker.js, Twilio Verify) - the browser never sees the code.
   window.SMS_API = URL of the deployed worker; window.SMS_VERIFY = false switches verification off (testing only). */
const smsOn=()=>window.SMS_VERIFY!==false;
const smsApi=()=>String(window.SMS_API||'').trim();
const SERR={sms_not_configured:'SMS დადასტურება ამჟამად მიუწვდომელია',invalid_phone:'არასწორი ტელეფონის ნომერი',rate_limited:'ძალიან ბევრი მცდელობა, სცადეთ მოგვიანებით',network:'სერვერთან დაკავშირება ვერ მოხერხდა',server:'კოდის გაგზავნა ვერ მოხერხდა. სცადეთ თავიდან.',invalid_code:'კოდი არასწორია',expired:'კოდის ვადა ამოიწურა — გამოგზავნეთ ახალი კოდი'};
async function sPost(b){const u=smsApi();if(!u)throw 'sms_not_configured';let r;try{r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})}catch{throw 'network'}
 const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw d.error||'server';return d}
/* E.164: 5XX XXX XXX / 995... -> +995..., anything else must start with + (or 00) */
const normPhone=p=>{const raw=String(p||'').trim(),d=raw.replace(/\D/g,'');if(raw.startsWith('+'))return d.length>=8&&d.length<=15?'+'+d:'';if(d.startsWith('00'))return d.length>=10&&d.length<=17?'+'+d.slice(2):'';if(d.length==9&&d[0]=='5')return '+995'+d;if(d.startsWith('995')&&d.length==12)return '+'+d;return ''};
const phoneTaken=t=>{const d=String(t).replace(/\D/g,'').slice(-9);return users.some(x=>x.phone&&String(x.phone).replace(/\D/g,'').slice(-9)==d)};
async function finishReg(u){const res=await apiSend('POST','/api/auth/register',{regType:u.regType,regOther:u.regOther||'',name:u.name,last:u.last||'',email:u.email,username:u.username,phone:u.phone,pass:u.pass,created:u.created});
 if(!res.ok){toast(res.data.message||'რეგისტრაცია ვერ მოხერხდა');return}
 adopt(res.data);addNote('მოგესალმებით mygem.ge-ზე! ანგარიში წარმატებით შეიქმნა.');toast('რეგისტრაცია წარმატებულია ✓');afterAuth()}
async function smsStart(u,fm){const btn=fm.querySelector('button[type=submit]'),t=btn.textContent;btn.disabled=true;btn.textContent='იგზავნება…';
 try{await sPost({action:'sms_send',phone:normPhone(u.phone)});smsVerify(u)}
 catch(e){btn.disabled=false;btn.textContent=t;err($('#rP'),SERR[e]||SERR.server)}}
function smsBack(u){renderAuth('reg');const set=(i,v)=>{const el=$('#'+i);if(el)el.value=v||''};setDD($('#rT'),u.regType,true);if(u.regType=='other')set('rTO',u.regOther);set('rN',(u.name+' '+(u.last||'')).trim());set('rL',u.last);set('rE',u.email);set('rU',u.username);set('rP',u.phone)}
function smsVerify(u){const B=$('#modalBody'),ph=normPhone(u.phone);curAuth='sms';
 B.innerHTML=`<h3>ტელეფონის დადასტურება</h3><p>კოდი გაიგზავნა ნომერზე <b>${esc(ph)}</b>. შეიყვანეთ მიღებული კოდი.</p><form class="form" id="smsForm" novalidate><label>დადასტურების კოდი<input id="smsC" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="······"></label><button class="btn" type="submit">დადასტურება</button></form><div class="smsrow"><button type="button" class="link" id="smsRe" disabled>თავიდან გაგზავნა</button><button type="button" class="link" id="smsBk">უკან, ნომრის შესაცვლელად</button></div>`;
 const re=$('#smsRe');let n=60;const tick=()=>{if(!document.body.contains(re))return;if(n>0){re.disabled=true;re.textContent=`თავიდან გაგზავნა (${n--})`;setTimeout(tick,1000)}else{re.disabled=false;re.textContent='თავიდან გაგზავნა'}};tick();
 re.onclick=async()=>{re.disabled=true;try{await sPost({action:'sms_send',phone:ph});toast('ახალი კოდი გაიგზავნა ✓');n=60;tick()}catch(e){toast(SERR[e]||SERR.server);re.disabled=false}};
 $('#smsBk').onclick=()=>smsBack(u);
 $('#smsC').focus();
 $('#smsForm').onsubmit=async e=>{e.preventDefault();const C=$('#smsC'),v=C.value.trim();if(check(e.target,[[C,/^\d{4,8}$/.test(v)?'':'შეიყვანეთ კოდი (მხოლოდ ციფრები)']]))return;
  const b=e.target.querySelector('button');b.disabled=true;
  try{await sPost({action:'sms_check',phone:ph,code:v});u.phoneVerified=true;finishReg(u)}
  catch(x){b.disabled=false;err(C,SERR[x]||SERR.server)}}}

/* ---------- photo moderation: every uploaded photo is checked by the backend (mod-worker.js) before it is accepted ----------
   window.MOD_API = URL of the deployed worker. Empty = no check (testing only). If the check itself fails, the photo is NOT accepted. */
const modApi=()=>String(window.MOD_API||'').trim();
/* default = protected: while the moderation service is not set up (MOD_API empty) uploads are refused. window.MOD_REQUIRED=false switches the protection off (testing only). */
const modRequired=()=>window.MOD_REQUIRED===true;   /* off by default: uploads work without a moderation service */
async function modCheck(dataUrl){const u=String(window.MOD_API||'').trim();
 try{const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'photo_check',image:String(dataUrl).split(',')[1]||''})});
  const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)return{ok:false,err:1};return{ok:!!d.allowed}}catch{return{ok:false,err:1}}}
async function modFilter(list){if(!list.length)return list;
 if(!modApi()){if(!modRequired())return list;toast('ფოტოს ატვირთვა დროებით მიუწვდომელია — შემოწმების სერვისი ჯერ არ არის ჩართული');return[]}
 toast('ფოტოები მოწმდება…');
 const res=await Promise.all(list.map(modCheck));let bad=0,fail=0;
 const keep=list.filter((_,i)=>{const r=res[i];if(r.ok)return true;if(r.err)fail++;else bad++;return false});
 if(bad||fail)toast([bad?`${bad} ფოტო არ დაემატა — ატვირთეთ მხოლოდ სამკაულის ან საათის სუფთა ფოტო`:'',fail?`${fail} ფოტოს შემოწმება ვერ მოხერხდა, სცადეთ თავიდან`:''].filter(Boolean).join('. '));
 return keep}

/* ---------- header search (inline) ---------- */
const hs=$('#hs'),hsIn=$('#hsIn'),sRes=$('#sRes');
/* header search: a word that names an item type (ring, bracelet...) shows only that type; every other word must appear in the title / type / metal / gender */
const TSTEM={ring:['ბეჭ','ring'],bracelet:['სამაჯ','bracelet'],earring:['საყურ','earring'],watch:['საათ','watch'],brooch:['ბროშ','brooch'],necklace:['ყელსაბ','necklace'],coin:['მონეტ','coin'],cross:['ჯვარ','cross'],chain:['ჯაჭვ','chain']};
function hsPrep(q){const toks=String(q).toLowerCase().split(/\s+/).filter(Boolean).map(t=>({t,ty:Object.keys(TSTEM).find(k=>TSTEM[k].some(st=>t.length>=3&&(t.startsWith(st)||(t.length>=4&&st.startsWith(t)))))}));
 return p=>{if(!toks.length)return false;const hay=[p.title,typeName(p),p.typeOther,p.desc].join(' ').toLowerCase();
  return toks.every(x=>x.ty?p.type==x.ty:hay.includes(x.t))}}
const hsMatch=(p,q)=>hsPrep(q)(p);
function hsRun(){const q=hsIn.value.trim().toLowerCase();hsX.hidden=!hsIn.value;if(!q){sRes.classList.remove('show');return}
   const all=pub().filter(p=>hsMatch(p,q)),r=all.slice(0,8);
 sRes.innerHTML=r.length?r.map(p=>`<div class="sr" data-id="${p.id}"><div class="st" style="${bgi(p.photos[0])}">${p.photos[0]?'':ill(p)}</div><div class="si"><b>${esc(p.title)}</b><small>${[p.cat,typeName(p),p.gender].filter(Boolean).map(esc).join(' · ')}</small></div>${p.nego?'<span class="price nego">შეთანხმებით</span>':`<span class="price" data-g="${p.price}" data-id="${p.id}">${fmt(p,curOf(p.id))}</span>`}</div>`).join('')+(all.length>8?`<div class="empty" style="padding:10px;font-size:13px">და კიდევ ${all.length-8}... დააზუსტეთ ძებნა</div>`:''):'<div class="empty">ვერაფერი მოიძებნა </div>';
 hsPos();sRes.classList.add('show')}
/* results panel sits directly under the search field */
function hsPos(){if(innerWidth>900){const r=hs.getBoundingClientRect(),w=Math.min(480,innerWidth-16);sRes.style.top=(r.bottom+6)+'px';sRes.style.width=w+'px';sRes.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';sRes.style.right='auto'}else{['top','left','right','width'].forEach(k=>sRes.style[k]='')}}
window.addEventListener('resize',()=>{if(sRes.classList.contains('show'))hsPos()});
function hsClose(){hs.classList.remove('open');hsIn.value='';hsX.hidden=true;sRes.classList.remove('show')}
const hsX=document.createElement('button');hsX.type='button';hsX.className='hsx';hsX.hidden=true;hsX.setAttribute('aria-label','ძებნის გასუფთავება');hsX.title='ძებნის გასუფთავება';hsX.textContent='×';hsIn.after(hsX);
hsX.onclick=e=>{e.stopPropagation();hsY=window.scrollY;hsIn.value='';hsRun();hsIn.focus({preventScroll:true});hsKeep()};
function hsGo(){const q=hsIn.value.trim();if(!q)return;F={q};sRes.classList.remove('show');if(location.hash=='#search')route();else location.hash='search'}
/* ძებნის ველზე ფოკუსი/ჩაწერა გვერდს ზემოთ აღარ ასქროლებს */
let hsY=0,hsLock=0;
const hsHold=()=>{if(Math.abs(window.scrollY-hsY)>1)window.scrollTo({top:hsY,behavior:'instant'})};
const hsKeep=(ms=500)=>{hsLock=Date.now()+ms;hsHold();requestAnimationFrame(hsHold)};
window.addEventListener('scroll',()=>{if(Date.now()<hsLock)hsHold()},{passive:true});
hsIn.addEventListener('focus',()=>{hsY=window.scrollY;hsKeep(900)});
hsIn.addEventListener('beforeinput',()=>{hsY=window.scrollY;hsKeep(400)});
hsIn.addEventListener('input',()=>hsKeep(400));
if(window.visualViewport)visualViewport.addEventListener('resize',()=>{if(document.activeElement===hsIn)hsKeep(600)});
$('#hsBtn').onclick=e=>{e.stopPropagation();
 if(hs.classList.contains('open')){if(hsIn.value.trim())hsGo();else hsClose()}
 else{hsY=window.scrollY;hs.classList.add('open');hsIn.focus({preventScroll:true});hsKeep()}};
let hsT=0;hsIn.oninput=()=>{clearTimeout(hsT);hsT=setTimeout(hsRun,120)};
hsIn.onkeydown=e=>{
 if(e.key=='Enter'){e.preventDefault();hsGo()}
 else if(e.key=='Escape'){if(hsIn.value){hsIn.value='';hsRun()}else hsClose()}};

/* ---------- notifications ---------- */
const myNotes=()=>me?(notes[me.email]||[]):[];
function setBadge(){const n=myNotes().filter(x=>!x.r).length,b=$('#noteDot');b.textContent=n;b.style.display=n?'grid':'none'}
async function addNote(t) {
  if (!me) return false;

  const email = me.email;
  const list = notes[email] = notes[email] || [];

  list.unshift({ t, d: Date.now(), r: 0 });
  save('notes', notes);
  setBadge();

  const res = await apiSend('PUT', '/api/me/notes', {
    notes: { [email]: list }
  });

  if (!res.ok) {
    toast('შეტყობინება სერვერზე ვერ შეინახა');
    return false;
  }

  return true;
}
$('#noteBtn').onclick=e=>{e.stopPropagation();if(!me)return openAuth('login');pmClose();const P=$('#notePanel'),l=myNotes();
 P.innerHTML=`<h4>შეტყობინებები</h4>${l.length?l.slice(0,20).map(n=>`<div class="note ${n.r?'':'new'}">${esc(n.t)}<small>${new Date(n.d).toLocaleString(uiLoc())}</small></div>`).join(''):'<div class="empty">შეტყობინებები არ არის</div>'}`;
 P.classList.toggle('show');const hadNew=l.some(n=>!n.r);l.forEach(n=>n.r=1);save('notes',notes);setBadge();
 if(hadNew)apiSend('PUT','/api/me/notes',{notes:{[me.email]:notes[me.email]},markRead:true})};
document.addEventListener('click',e=>{const b=e.target.closest('#fCur');if(!b)return;
 FCUR=FCUR=='USD'?'GEL':'USD';const on=FCUR=='USD';
 b.classList.toggle('on',on);b.setAttribute('aria-checked',on);
 $$('[data-pcur]').forEach(x=>x.textContent=priceSym())});
/* ---------- global clicks ---------- */
document.addEventListener('click',e=>{
 const cc=e.target.closest('a[href="#collection"]');if(cc){e.preventDefault();F={};if(location.hash=='#search')route();else location.hash='search'}
 const cl=e.target.closest('a[href="#calculator"]'),ch=$('#calcHome');if(cl&&ch&&(!location.hash||location.hash=='#home')){e.preventDefault();ch.scrollIntoView({behavior:REDUCE?'auto':'smooth',block:'start'})}
  const cd=e.target.closest('.card[data-id]');if(cd&&!e.target.closest('[data-fav],[data-cshare],[data-cs],[data-del],[data-eph]')){
 location.hash = 'product:' + cd.dataset.id;}
 const so=e.target.closest('.sr[data-id]');if(so){const id=so.dataset.id;hsClose();location.hash='product:'+id}
 const pf=e.target.closest('[data-pfav]');if(pf){if(!me)openAuth('login');else{const id=+pf.dataset.pfav;favs=favs.includes(id)?favs.filter(x=>x!=id):[...favs,id];save('favs',favs);setFavCnt();const on=favs.includes(id);pf.classList.toggle('on',on);pf.setAttribute('aria-pressed',on);const lb=on?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება';pf.setAttribute('aria-label',lb);pf.title=lb}}
 const rcb=e.target.closest('[data-rcpt]');if(rcb)openReceipt(rcb.dataset.rcpt);
 const pok=e.target.closest('[data-payok]');if(pok)payDecide(pok.dataset.payok,true);
 const pno=e.target.closest('[data-payno]');if(pno)payDecide(pno.dataset.payno,false);
 const fl=e.target.closest('[data-flitt]');if(fl){e.preventDefault();startFlittPay(fl.dataset.flitt)}
 const sh=e.target.closest('[data-share]');if(sh)shareP(sh.dataset.share);
 const mg=e.target.closest('[data-msg]');if(mg)openMsg(mg.dataset.msg);
 if(!e.target.closest('#notePanel,#noteBtn'))$('#notePanel').classList.remove('show');
 if(!e.target.closest('#pMenu,#loginBtn'))pmClose();
 if(!e.target.closest('#hs,#sRes')){sRes.classList.remove('show');if(!hsIn.value)hs.classList.remove('open')}
 if(e.target.closest('[data-reset]'))F={};
 if(e.target.closest('[data-terms]')){e.preventDefault();openTerms()}
 if(e.target.closest('[data-privacy]')){e.preventDefault();openPrivacy()}
 const ey=e.target.closest('[data-eye]');
 if(ey){const i=ey.parentElement.querySelector('input'),show=i.type=='password';i.type=show?'text':'password';ey.classList.toggle('on',show)}
 const f=e.target.closest('[data-fav]');
 if(f){e.stopPropagation();if(!me)return openAuth('login');const id=+f.dataset.fav;favs=favs.includes(id)?favs.filter(x=>x!=id):[...favs,id];save('favs',favs);setFavCnt();const on=favs.includes(id);
  $$(`[data-fav="${id}"]`).forEach(b=>{b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',on?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება')});
  if(!on&&location.hash=='#favs'){const cd2=f.closest('.card');if(cd2){cd2.remove();if(!$('#app .card')){const pg=$('#app .page');if(pg)pg.insertAdjacentHTML('beforeend','<div class="empty">ფავორიტები ცარიელია</div>')}}}}
 const cshr=e.target.closest('[data-cshare]');
 if(cshr){e.stopPropagation();shareP(cshr.dataset.cshare)}
 const dl=e.target.closest('[data-del]');if(dl){e.stopPropagation();confirmDelete(dl.dataset.del)}
  const eph=e.target.closest('[data-eph]');if(eph){e.stopPropagation();location.hash='edit:'+eph.dataset.eph}
 }
);


/* ---------- admin blog editor: clicks, form, cover photo ---------- */
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-bnew],[data-bedit],[data-bdel],[data-bexp],[data-bcancel]');if(!t||!isAdmin())return;
 if(t.matches('[data-bnew]')){bedit='new';bcv='';if(location.hash=='#profile:blog')showProfile('blog');else location.hash='profile:blog';return}
 if(t.matches('[data-bedit]')){const b=blogMine().find(x=>String(x.id)===String(t.dataset.bedit));if(!b)return;bedit=b.id;bcv=b.img||'';showProfile('blog');return}
 if(t.matches('[data-bdel]'))return blogDel(t.dataset.bdel);
 if(t.matches('[data-bexp]'))return blogExport();
 if(t.matches('[data-bcancel]')){bedit=null;bcv='';showProfile('blog')}});
document.addEventListener('submit',e=>{if(e.target&&e.target.id=='bForm'){e.preventDefault();blogSubmit()}});
document.addEventListener('change',async e=>{if(!e.target||e.target.id!='bImgIn')return;const f=e.target.files[0];if(!f||!isAdmin())return;
 if(!f.type.startsWith('image/')||f.size>15*1024*1024)return toast('დაშვებულია მხოლოდ სურათები (მაქს. 15MB)');
 const u=await blogImg(f);if(!u)return toast(RD_FAIL);bcv=u;const p=$('#bPrev');if(p)p.style.cssText=bgi(u);const w=$('#bImgFld');if(w)clearOne(w)});
window.addEventListener('hashchange',()=>{if(!/^#profile:blog/.test(location.hash)){bedit=null;bcv=''}});

/* ---------- auth ---------- */
function setFavCnt(){const n=me?favs.length:0,b=$('#favDot');b.textContent=n>99?'99+':n;b.style.display=n?'grid':'none'}
function setLogin(){setFavCnt();$('#loginBtn').innerHTML=me&&me.avatar?`<img src="${safeUrl(me.avatar)}">`:me?esc((me.name[0]||'U').toUpperCase()):ui('user');setBadge()}
/* profile dropdown: opens under the profile icon (logged out: the login window opens as before) */
const pMenu=document.createElement('div');pMenu.className='pmenu';pMenu.id='pMenu';document.body.append(pMenu);
function pmClose(){pMenu.classList.remove('show')}
function pmOpen(){const b=$('#loginBtn'),r=b.getBoundingClientRect(),nm=(regOf(me)=='individual'?me.name+' '+(me.last||''):me.name).trim(),np=isAdmin()?pendingPay().length:0;
 pMenu.innerHTML=`<div class="pm-head"><div class="pm-ava">${me.avatar?`<img src="${safeUrl(me.avatar)}" alt="">`:esc((me.name[0]||'U').toUpperCase())}</div><div class="pm-id"><b>${esc(nm)}</b><small>${esc(me.email)}</small></div></div><div class="pm-sep"></div><div class="pm-list"><a href="#profile:mine">ჩემი პროფილი</a><a href="#add">დამატება</a><a href="#favs">ფავორიტები</a><a href="#profile:edit">პარამეტრები</a>${isAdmin()?`<a href="#profile:pay">გადახდები${np?`<span class="pm-bdg">${np}</span>`:''}</a>`:''}</div><div class="pm-sep"></div><div class="pm-list"><button type="button" id="pmOut"><span class="pm-ic">${ui('logout')}<span>გასვლა</span></span></button></div>`;
 pMenu.style.top=(r.bottom+8)+'px';pMenu.style.right=Math.max(8,innerWidth-r.right)+'px';pMenu.classList.add('show')}
pMenu.addEventListener('click',e=>{const a=e.target.closest('a');if(a){pmClose();if(location.hash==a.getAttribute('href'))route();return}
 if(e.target.closest('#pmOut')){pmClose();confirmLogout()}});
document.addEventListener('keydown',e=>{if(e.key=='Escape')pmClose()});
window.addEventListener('hashchange',pmClose);window.addEventListener('resize',pmClose);
$('#loginBtn').onclick=()=>{if(!me)return openAuth('login');$('#notePanel').classList.remove('show');if(pMenu.classList.contains('show'))pmClose();else pmOpen()};
const modal=$('#modal'),AO={login:0,forgot:1,reg:2};let curAuth=null,busy=false;
modal.onclick=e=>{if(e.target==modal)closeModal()};
function closeModal(){modal.classList.remove('show');$('#modalBox').classList.remove('wide');curAuth=null;window.__goAdd=false}
function afterAuth(){const g=window.__goAdd;closeModal();setLogin();if(g){location.hash='add';return}if(/^#(add|favs|profile)/.test(location.hash))route()}
function openTerms(){curAuth=null;modal.classList.add('show');$('#modalBox').classList.add('wide');
 const id=FLITT.companyId?`<p><b>საიდენტიფიკაციო კოდი:</b> ${esc(FLITT.companyId)}</p>`:'';
 $('#modalBody').innerHTML=`<h3>წესები და პირობები</h3>
 <p><b>ოპერატორი:</b> ${esc(FLITT.companyName||'mygem.ge')}</p>${id}
 <p><b>მისამართი:</b> ${esc(FLITT.companyAddress||'თბილისი, საქართველო')}</p>
 <p><b>კონტაქტი:</b> <a href="mailto:${esc(FLITT.companyEmail||'mygemge@gmail.com')}">${esc(FLITT.companyEmail||'mygemge@gmail.com')}</a> · <a href="tel:${esc(String(FLITT.companyPhone||'').replace(/\D/g,''))}">${esc(FLITT.companyPhone||'')}</a></p>
 <p><b>ანგარიში:</b> ${esc(FLITT.companyIban||BANKS[1].iban)} (GEL)</p>
 <p>1. განცხადებაში მითითებული ინფორმაცია, აღწერა, ფასი (₾) და ფოტოები უნდა შეესაბამებოდეს რეალობას.</p>
 <p>2. აკრძალულია ყალბი ან უკანონოდ მოპოვებული ნივთების გამოქვეყნება.</p>
 <p>3. mygem.ge არის მარკეტფლეისი და არ არის გარიგების მხარე მყიდველსა და გამყიდველს შორის. ნივთის მიწოდებას / გადაცემას უზრუნველყოფს გამყიდველი, შეთანხმებული პირობებით (პირადად, კურიერით ან ფოსტით).</p>
 <p>4. ფასიანი სერვისები (VIP / Super VIP, ფერადი გამოყოფა, სტიკერები) ჩაირთვება წარმატებული ონლაინ გადახდის შემდეგ. თუ სერვისი ტექნიკური შეცდომის გამო არ ჩაირთო, თანხა დაგიბრუნდებათ იმავე გადახდის მეთოდით 14 სამუშაო დღეში — მოგვწერეთ ${esc(FLITT.companyEmail||'mygemge@gmail.com')}-ზე.</p>
 <p>5. ნივთის დაბრუნება / გაცვლა ხდება გამყიდველის პირობებით; მარკეტფლეისი ამაში მხარე არ არის.</p>
 <p>6. ადმინისტრაციას უფლება აქვს წესების დარღვევისას წაშალოს განცხადება ან შეზღუდოს ანგარიში.</p>
 <div class="paylogos">${payLogos()}</div>
 <button class="btn" id="tmOk" type="button">დახურვა</button>`;$('#tmOk').onclick=closeModal}
function openPrivacy(){curAuth=null;modal.classList.add('show');$('#modalBox').classList.add('wide');
 $('#modalBody').innerHTML=`<h3>კონფიდენციალურობის პოლიტიკა</h3>
 <p>mygem.ge (${esc(FLITT.companyName||'')}) ამუშავებს თქვენს მონაცემებს საიტის მუშაობისთვის.</p>
 <p><b>რას ვაგროვებთ:</b> სახელი, ელ-ფოსტა, ტელეფონი, ანგარიშის მონაცემები, განცხადებების შინაარსი და გადახდის სტატუსი (ბარათის სრული მონაცემები Flitt-ზე რჩება).</p>
 <p><b>რატომ:</b> ანგარიშის შექმნა, განცხადებების გამოქვეყნება, გადახდების დამუშავება, კომუნიკაცია და უსაფრთხოება.</p>
 <p><b>გაზიარება:</b> გადახდისთვის — Flitt; ჰოსტინგი / ელ-ფოსტა — მხოლოდ საჭირო მომსახურებისთვის. მონაცემებს არ ვყიდით.</p>
 <p><b>შენახვა:</b> ანგარიშის არსებობის განმავლობაში და კანონით გათვალისწინებულ ვადაში.</p>
 <p><b>თქვენი უფლებები:</b> მონაცემების ნახვა, შესწორება ან წაშლის მოთხოვნა — ${esc(FLITT.companyEmail||'mygemge@gmail.com')}.</p>
 <p><b>ქუქიები:</b> აუცილებელი ქუქიები საიტისთვის; ანალიტიკა / მარკეტინგი მხოლოდ თქვენი თანხმობით.</p>
 <button class="btn" id="pvOk" type="button">დახურვა</button>`;$('#pvOk').onclick=closeModal}
function askPass(cb){curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<h3>დაადასტურეთ პაროლი</h3><p>ცვლილებების შესანახად შეიყვანეთ თქვენი მიმდინარე პაროლი.</p><form class="form" id="pwForm" novalidate>${pw('cpw','მიმდინარე პაროლი')}<button class="btn" type="submit">დადასტურება</button><button type="button" class="link" id="cpwNo">გაუქმება</button></form>`;
 $('#cpw').focus();$('#cpwNo').onclick=closeModal;
 $('#pwForm').onsubmit=e=>{e.preventDefault();const P=$('#cpw');
  if(check(e.target,[[P,P.value?'':'შეიყვანეთ პაროლი']]))return;
  const v=P.value;closeModal();cb(v)}}
/* success window after a listing is published: jewelry backdrop (images/bg-jewelry.svg) + ring badge */
function showPub(){$$('.pubpop').forEach(x=>x.remove());
 const o=document.createElement('div');o.className='pubpop';
 o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-labelledby','pubT');
 const sp=(x,y,k,d)=>`<g transform="translate(${x} ${y}) scale(${k})"><path class="pubsp" style="--d:${d}s" fill="url(#pgGold)" d="M0-14Q1.6-1.6 14 0Q1.6 1.6 0 14Q-1.6 1.6-14 0Q-1.6-1.6 0-14Z"/></g>`;
 o.innerHTML=`<div class="pubbox" tabindex="-1">
  <svg class="pubmark" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
   <defs>
    <linearGradient id="pgGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E8C3"/><stop offset=".5" stop-color="#DDBE7E"/><stop offset="1" stop-color="#BE9650"/></linearGradient>
    <linearGradient id="pgBand" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF5D8"/><stop offset=".28" stop-color="#EBCF8F"/><stop offset=".52" stop-color="#C79B52"/><stop offset=".74" stop-color="#F0D9A0"/><stop offset="1" stop-color="#A97C38"/></linearGradient>
    <linearGradient id="pgSilver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#CBD3DF"/><stop offset="1" stop-color="#9AA6B6"/></linearGradient>
    <radialGradient id="pgGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F3DCA0" stop-opacity=".5"/><stop offset="1" stop-color="#F3DCA0" stop-opacity="0"/></radialGradient>
    <linearGradient id="pgShine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="pgRingMask" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="140"><circle cx="80" cy="88" r="42" fill="none" stroke="#fff" stroke-width="9"/></mask>
    <clipPath id="pgGemClip"><path d="M64.4 5H95.6L110 19.4L80 46L50 19.4Z"/></clipPath>
   </defs>
   <circle class="pubglow" cx="80" cy="82" r="68" fill="url(#pgGlow)"/>
   <g class="pubbeat">
    <circle cx="80" cy="88" r="46.800" fill="none" stroke="#B8914B" stroke-opacity=".28" stroke-width="1"/>
    <circle class="pubring" cx="80" cy="90.500" r="42" pathLength="1" transform="rotate(-90 80 90.500)" fill="none" stroke="#6B4E1E" stroke-opacity=".13" stroke-width="9" stroke-linecap="round"/>
    <circle class="pubring" cx="80" cy="88" r="42" pathLength="1" transform="rotate(-90 80 88)" fill="none" stroke="url(#pgBand)" stroke-width="9" stroke-linecap="round"/>
    <circle class="pubring" cx="80" cy="88" r="37.600" pathLength="1" transform="rotate(-90 80 88)" fill="none" stroke="#8C6A2E" stroke-opacity=".22" stroke-width="1"/>
    <circle class="pubring" cx="80" cy="88" r="38.600" pathLength="1" transform="rotate(-90 80 88)" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.200"/>
    <g mask="url(#pgRingMask)"><g transform="skewX(-20)"><rect class="pubshine" x="0" y="-10" width="26" height="160" fill="url(#pgShine)"/></g></g>
    <path class="pubtick" pathLength="1" d="M62 90L75 103L100 74" fill="none" stroke="#000080" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="pubgem">
     <path d="M64.400 5H95.600L88 19.400H72Z" fill="#EEF5FF"/>
     <path d="M64.400 5L72 19.400H50Z" fill="#D9E9FD"/>
     <path d="M95.600 5L110 19.400H88Z" fill="#C4DBF7"/>
     <path d="M50 19.400H72L80 46Z" fill="#A9C8F0"/>
     <path d="M72 19.400H88L80 46Z" fill="#DCEBFF"/>
     <path d="M88 19.400H110L80 46Z" fill="#8FB4E6"/>
     <path d="M64.400 5H95.600L110 19.400L80 46L50 19.400Z" fill="none" stroke="url(#pgSilver)" stroke-width="2" stroke-linejoin="round"/>
     <path d="M50 19.400H110M64.400 5L72 19.400L80 46L88 19.400L95.600 5M72 19.400L80 5L88 19.400" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.100" stroke-linejoin="round"/>
     <path d="M55.500 24.500L74 46.500M104.500 24.500L86 46.500" fill="none" stroke="url(#pgBand)" stroke-width="2.600" stroke-linecap="round"/>
     <g clip-path="url(#pgGemClip)"><g transform="skewX(-20)"><rect class="pubshine g" x="0" y="-10" width="22" height="160" fill="url(#pgShine)"/></g></g>
     <g transform="translate(67 12)"><path class="pubtw" fill="#fff" d="M0-7Q.8-.8 7 0Q.8.8 0 7Q-.8.8-7 0Q-.8-.8 0-7Z"/></g>
    </g>
   </g>
   ${sp(22,44,.75,.95)}${sp(142,30,.95,1.05)}${sp(140,112,.6,1.15)}${sp(26,116,.5,1.25)}
  </svg>
  <h3 id="pubT">წარმატებით გამოქვეყნდა!</h3>
  <p>თქვენი განცხადება დაემატა კოლექციას.</p>
  <button type="button" class="btn">OK</button>
  <span class="pubbar" aria-hidden="true"></span>
 </div>`;
 document.body.append(o);
 let t=0;const key=e=>{if(e.key==='Escape')close()};
 const close=()=>{clearTimeout(t);document.removeEventListener('keydown',key);o.remove()};
 o.querySelector('.btn').onclick=close;
 o.addEventListener('click',e=>{if(e.target===o)close()});
 document.addEventListener('keydown',key);
 o.querySelector('.pubbox').focus({preventScroll:true});
 t=setTimeout(close,6000)}
function openAuth(m){if(busy)return;
 if(!modal.classList.contains('show')||curAuth===null){modal.classList.add('show');renderAuth(m);return}
 if(m==curAuth)return;swapAuth(m,Math.sign(AO[m]-AO[curAuth])||1)}
function swapAuth(m,dir){busy=true;const box=$('#modalBox'),body=$('#modalBody'),h0=box.offsetHeight;
 box.style.height=h0+'px';box.style.overflow='hidden';
 body.style.transition='opacity .2s ease,transform .2s ease';body.style.opacity='0';body.style.transform=`translateX(${-40*dir}px)`;
 setTimeout(()=>{renderAuth(m);box.style.height='auto';const h1=box.offsetHeight;box.style.height=h0+'px';
  body.style.transition='none';body.style.transform=`translateX(${40*dir}px)`;void box.offsetHeight;
  body.style.transition='opacity .3s ease,transform .38s cubic-bezier(.2,.8,.2,1)';body.style.opacity='1';body.style.transform='none';box.style.height=h1+'px';
  setTimeout(()=>{box.style.height='';box.style.overflow='';body.style.transition='';busy=false},400)},210)}
function renderAuth(m){const B=$('#modalBody');curAuth=m;
 if(m=='login'){B.innerHTML=`<h3>შესვლა</h3><form class="form" id="authForm" novalidate><label>ელ-ფოსტა ან მომხმარებლის სახელი<input id="lE" type="text" autocomplete="username" autocapitalize="none" spellcheck="false"></label>${pw('lP','პაროლი')}<div class="rowr"><button type="button" class="linkbtn" id="toFg">დაგავიწყდათ პაროლი?</button></div><button class="btn" type="submit">შესვლა</button></form><button type="button" class="link" id="toReg">არ გაქვთ ანგარიში? დარეგისტრირდით</button>`;
  $('#toReg').onclick=()=>openAuth('reg');$('#toFg').onclick=()=>openAuth('forgot');
  $('#authForm').onsubmit=async e=>{e.preventDefault();const fm=e.target,E=$('#lE'),P=$('#lP'),em=E.value.trim();
   if(check(fm,[[E,loginMsg(em)],[P,P.value?'':'შეიყვანეთ პაროლი']]))return;
   const btn=fm.querySelector('button[type=submit]');btn.disabled=true;
   const res=await apiSend('POST','/api/auth/login',{login:em,password:P.value});
   btn.disabled=false;
   if(!res.ok){err(P,res.data.error=='google_only'?GONLY:(res.data.message||'ელ-ფოსტა/მომხმარებლის სახელი ან პაროლი არასწორია'));return}
   adopt(res.data);toast('მოგესალმებით!');afterAuth()}}

else if(m=='forgot'){
  B.innerHTML=`<h3>პაროლის აღდგენა</h3>
    <p>პაროლის აღდგენა ელფოსტით ჯერ არ არის ჩართული. მოგვწერეთ <a href="mailto:mygemge@gmail.com">mygemge@gmail.com</a>-ზე იმ ელფოსტიდან, რომლითაც დარეგისტრირდით.</p>
    <button type="button" class="link" id="toLog">უკან, შესვლაზე</button>`;
  $('#toLog').onclick=()=>openAuth('login');
}

 else{B.innerHTML=`<h3>რეგისტრაცია</h3><form class="form" id="authForm" novalidate>${fld('რეგისტრაციის ტიპი',dd('rT',{list:DD.reg,val:'individual',other:1,otherPh:'მიუთითეთ როგორ გსურთ რეგისტრაცია'}))}<label id="rNL">სახელი და გვარი<input id="rN" autocomplete="name" placeholder="მაგ: გიორგი მაისურაძე"></label><label id="rLL" hidden><input id="rL" type="hidden"></label><label>ელ-ფოსტა<input id="rE" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="name@mail.com"></label><label>მომხმარებლის სახელი<input id="rU" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false"></label><label>ტელეფონი<input id="rP" type="tel" autocomplete="tel" inputmode="tel" maxlength="17" placeholder="5__ ___ ___"></label>${pw('rW','პაროლი','new-password')}${pw('rW2','გაიმეორეთ პაროლი','new-password')}<button class="btn" type="submit">რეგისტრაცია</button></form><button type="button" class="link" id="toLog">უკვე გაქვთ ანგარიში? შესვლა</button>`;
  initDD(B);const rt=$('#rT');
const sync=()=>{const ind=rt.dataset.val=='individual';$('#rNL .lt').firstChild.textContent=ind?'სახელი და გვარი':'დასახელება'};rt.onchange=sync;
  $('#toLog').onclick=()=>openAuth('login');
  $('#authForm').onsubmit=e=>{e.preventDefault();const fm=e.target,ty=rt.dataset.val,ind=ty=='individual',O=$('#rTO'),N=$('#rN'),L=$('#rL'),E=$('#rE'),U=$('#rU'),P=$('#rP'),W=$('#rW'),W2=$('#rW2');
   const full=N.value.trim().replace(/\s+/g,' '),sp=full.indexOf(' '),n=ind&&sp>0?full.slice(0,sp):full,l=ind&&sp>0?full.slice(sp+1):'',em=E.value.trim().toLowerCase(),un=U.value.trim(),tel=P.value.trim();
if(check(fm,[[O,ty=='other'&&!O.value.trim()?'მიუთითეთ რეგისტრაციის ტიპი':''],[N,ind?(!full?'შეიყვანეთ სახელი და გვარი':!l?'შეიყვანეთ სახელიც და გვარიც':''):nameMsg(n,'დასახელება')],
    [E,emailMsg(em)||(users.some(x=>same(x.email,em))?'ეს ელ-ფოსტა დაკავებულია':'')],[U,unameMsg(un)],[P,!tel?'შეიყვანეთ ტელეფონი':!isPhone(tel)?'არასწორი ტელეფონის ნომერი':phoneTaken(tel)?'ეს ნომერი უკვე გამოყენებულია':smsOn()&&!normPhone(tel)?'მიუთითეთ ნომერი ფორმატით 5XX XXX XXX ან +კოდით':''],[W,pwMsg(W.value)],[W2,!W2.value?'გაიმეორეთ პაროლი':W2.value!=W.value?'პაროლები არ ემთხვევა':'']]))return;
   const u={regType:ty,regOther:ty=='other'?O.value.trim():'',shop:!ind,name:n,last:ind?l:'',email:em,phone:tel,username:un,pass:W.value,created:Date.now()};
   if(!smsOn())return finishReg(u);smsStart(u,fm)}}
 initDD(B);markReq(B);if(m=='login'||m=='reg')gMount(B)}

/* ---------- cookies & start ---------- */
(()=>{
 const KEY='cc',VER=1,bar=$('#cookie'),dlg=$('#ckPrefs'),A=$('#ckA'),M=$('#ckM'),subs=[];let opener=null;
 const read=()=>{const c=load(KEY,null);return c&&c.v===VER?c:null};
 const state=()=>{const c=read();return{essential:true,analytics:!!(c&&c.analytics),marketing:!!(c&&c.marketing)}};
 /* non-essential code only ever runs through here, after consent for its category */
 const flush=()=>{const s=state();subs.forEach(x=>{if(!x.done&&s[x.cat]){x.done=true;try{x.fn()}catch(e){console.error(e)}}})};
 const closeP=()=>{dlg.classList.remove('show');if(opener&&opener.focus)opener.focus();opener=null};
 const store=(a,m)=>{save(KEY,{v:VER,analytics:!!a,marketing:!!m,ts:Date.now()});bar.classList.remove('show');dlg.classList.remove('show');
  window.dispatchEvent(new CustomEvent('mygem:consent',{detail:state()}));flush();
  if(subs.some(x=>x.done&&!state()[x.cat]))toast('ცვლილება სრულად ძალაში შევა გვერდის განახლების შემდეგ')};
 const openP=()=>{opener=document.activeElement;const s=state();A.checked=s.analytics;M.checked=s.marketing;dlg.classList.add('show');$('#ckSave').focus()};
 $('#ckAll').onclick=$('#ckAll2').onclick=()=>store(true,true);
 $('#ckRej').onclick=()=>store(false,false);
 $('#ckSave').onclick=()=>store(A.checked,M.checked);
 $('#ckSet').onclick=openP;$('#ckX').onclick=closeP;
 dlg.addEventListener('click',e=>{if(e.target===dlg)closeP()});
 document.addEventListener('keydown',e=>{if(e.key=='Escape'&&dlg.classList.contains('show'))closeP()});
 document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-ckset]')){e.preventDefault();openP()}});
 // Public API. Load analytics/marketing code only via: mygemConsent.run('analytics', () => { /* add script */ });
 window.mygemConsent={get:state,has:c=>c=='essential'||!!state()[c],run:(cat,fn)=>{subs.push({cat,fn,done:false});flush()},open:openP};
 bar.classList.toggle('show',!read());flush();
})();
const quiet=()=>{const[h,t]=parseHash();
 if(!/^(home|search|profile|product|favs|seller)$/.test(h))return;
 if(h=='profile'&&(t=='edit'||t=='blog'))return;   // ფორმა შევსების პროცესში არ გადაიხატოს
 if($('#modal.show'))return;                        // ღია ფანჯარა არ შეწყდეს
 const y=window.scrollY;$('#app').innerHTML=views[h](t);bind();if(window.applyLang)window.applyLang(document.body);window.scrollTo({top:y,behavior:'instant'})};
setLogin();
window.addEventListener('hashchange', route);

HYD = hydrate();

const sigI=()=>items.map(p=>p.id+'|'+(p.photos||[]).length+'|'+p.vip+'|'+p.title+'|'+p.price+'|'+p.nativePrice+'|'+p.cur+'|'+p.hold).join(',');
const sigB=()=>blogList().map(b=>b.id).join(',');
let s0='',b0='';
const net=Promise.all([restoreSession(),loadFlitt()]).then(()=>pullListings());
HYD.then(()=>{setLogin();route();s0=sigI();b0=sigB()});
Promise.all([HYD,net]).then(()=>{setLogin();if(sigI()!==s0){s0=sigI();quiet()}});
loadBlog().then(()=>{if(sigB()!==b0){b0=sigB();const h=location.hash.slice(1).split(':')[0];if(!h||h=='home'||h=='blog'||h=='post')quiet()}});
loadRate();
/* the header height depends on the (large, responsive) logo: publish it as --hh so dropdowns, sticky panels and anchor scrolling always sit just below it */
(()=>{const t=$('.top');if(!t)return;const set=()=>document.documentElement.style.setProperty('--hh',t.offsetHeight+'px');set();
 if(window.ResizeObserver)new ResizeObserver(set).observe(t);window.addEventListener('resize',set);window.addEventListener('load',set)})();
setInterval(()=>{if(sweep()&&!/^#(add|profile:edit)/.test(location.hash))route()},60000);
document.addEventListener('click',e=>{const b=e.target.closest('[data-hs]');if(!b)return;const g=b.closest('.hsec').querySelector('.hscroll');if(g)g.scrollBy({left:(+b.dataset.hs)*g.clientWidth*.85,behavior:'smooth'})});

/* arrows: dim at the ends of a row */
const hsUpd=g=>{const sec=g.closest('.hsec');if(!sec)return;const [p,n]=sec.querySelectorAll('[data-hs]');if(!p||!n)return;const m=g.scrollWidth-g.clientWidth;p.disabled=g.scrollLeft<=2;n.disabled=g.scrollLeft>=m-2;sec.querySelector('.harr').hidden=m<=2};
document.addEventListener('scroll',e=>{if(e.target.classList&&e.target.classList.contains('hscroll'))hsUpd(e.target)},true);
const hsAll=()=>$$('.hscroll').forEach(hsUpd);
window.addEventListener('resize',hsAll);window.addEventListener('load',hsAll);
if($('#app'))new MutationObserver(()=>requestAnimationFrame(hsAll)).observe($('#app'),{childList:true,subtree:true});
/* დამატება გამოსულ მომხმარებელზე: Login ფანჯარა მიმდინარე გვერდზე, გვერდი არ იცვლება */
document.addEventListener('click',e=>{
 const a=e.target.closest&&e.target.closest('a[href="#add"],[data-add]');
 if(!a||me)return;
 e.preventDefault();e.stopPropagation();
 window.__goAdd=true;
 openAuth('login');
},true);


/* ტელეფონის ავტომატური ფორმატი: 5XX XXX XXX  ან  +კოდი ... */
const fmtPhone=v=>{
 let s=String(v||'').replace(/[^\d+]/g,'');
 const plus=s.startsWith('+');s=s.replace(/\+/g,'');
 if(plus||s.startsWith('995')&&s.length>9){
  const d=s.replace(/^995/,'').slice(0,9);
  const g=[d.slice(0,3),d.slice(3,6),d.slice(6,9)].filter(Boolean).join(' ');
  return '+995'+(g?' '+g:'')}
 const d=s.slice(0,9);
 return [d.slice(0,3),d.slice(3,6),d.slice(6,9)].filter(Boolean).join(' ')};
document.addEventListener('input',e=>{
 const t=e.target;if(!t||!/^(rP|eP)$/.test(t.id))return;
 const v=fmtPhone(t.value);if(v!==t.value)t.value=v});
 /* ელ-ფოსტა: ზედმეტი ინტერვალები იშლება, პატარა ასოებად გადადის */
document.addEventListener('input',e=>{const t=e.target;if(!t||!/^(rE|eE|lE|fE)$/.test(t.id)||t.id=='lE')return;
 const v=t.value.replace(/\s+/g,'').toLowerCase();if(v!==t.value)t.value=v});

 /* პროფილის მენიუ და შეტყობინებების პანელი ერთდროულად არასდროს იხსნება */
document.addEventListener('click',e=>{
 if(e.target.closest('#noteBtn'))pmClose();
 else if(e.target.closest('#loginBtn'))$('#notePanel').classList.remove('show');
},true);
/* ბრაუზერის ამომხტარი მინიშნებების (title) მოხსნა ყველგან */
(()=>{
 const strip=r=>{if(r.nodeType!==1)return;if(r.hasAttribute('title'))r.removeAttribute('title');r.querySelectorAll('[title]').forEach(e=>e.removeAttribute('title'))};
 strip(document.body);
 new MutationObserver(ms=>ms.forEach(m=>{
  if(m.type==='attributes')m.target.removeAttribute('title');
  else m.addedNodes.forEach(strip)
 })).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['title']});
})();

/* ფასი / წონა: ჩამოსაშლელი დიაპაზონი */
function rgAll(){$$('.rg').forEach(g=>{const i=$$('input',g),a=i[0].value,b=i[1].value,v=g.querySelector('.rg-val');
 v.textContent=a&&b?`${a} – ${b}`:a?`${a}-დან`:b?`${b}-მდე`:'ყველა';v.classList.toggle('ph',!a&&!b)})}
document.addEventListener('click',e=>{
 const g=e.target.closest('.rg'),btn=e.target.closest('.rg-btn');
 $$('.rg.open').forEach(x=>{if(x!==g)x.classList.remove('open')});
 if(!g)return;
 if(btn){const o=g.classList.toggle('open');btn.setAttribute('aria-expanded',o)}
 const p=e.target.closest('.rg-p');if(p)document.getElementById(p.dataset.t).value=p.dataset.v;
 if(e.target.closest('.rg-ok')){const[a,b]=$$('input',g);if(a.value&&b.value&&+a.value>+b.value){const t=a.value;a.value=b.value;b.value=t}g.classList.remove('open')}
 setTimeout(rgAll,0)});
document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('.rg'))rgAll()});
document.addEventListener('keydown',e=>{if(e.key=='Escape')$$('.rg.open').forEach(x=>x.classList.remove('open'))});
let rgT=0;new MutationObserver(()=>{cancelAnimationFrame(rgT);rgT=requestAnimationFrame(rgAll)}).observe(document.body,{childList:true,subtree:true});
rgAll();
/* დასახელება: მაქსიმუმ 3 სიტყვა — მეოთხე სიტყვა იბლოკება */
document.addEventListener('input',e=>{const t=e.target;if(!t||t.id!='aT')return;
 const v=t.value.replace(/^\s+/,'').replace(/\s+/g,' '),w=v.split(' ');
 const out=w.length>3?w.slice(0,3).join(' '):v;
 if(out!==t.value)t.value=out});

document.addEventListener('click', e => {
  if (!e.target.closest('#themeToggle')) return;
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (err) {}
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = next === 'dark' ? '#121418' : '#ffffff';
});
document.addEventListener('click', e => {
  const button = e.target.closest('[data-cs]');
  if (!button) return;

  e.preventDefault();
  e.stopImmediatePropagation();
  toggleCur(button.dataset.cs);
}, true);
Promise.all([gCfg(), gLib()]).catch(() => {});
/* წაშლის ღილაკმა ჯერ დადასტურების ფანჯარა გახსნას */
document.addEventListener('click', function (e) {
  const button = e.target.closest('[data-del]');
  if (!button) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  confirmDelete(button.dataset.del);
}, true);
window.rerender=()=>{gInit=null;route()};
let catalogCurrency = 'GEL';

document.addEventListener('click', e => {
  const b = e.target.closest('#catalogCurrency');
  if (!b) return;

  catalogCurrency = catalogCurrency === 'GEL' ? 'USD' : 'GEL';
  const usd = catalogCurrency === 'USD';

  items.forEach(p => {
    pc[p.id] = catalogCurrency;
  });

  b.classList.toggle('on', usd);
  b.setAttribute('aria-checked', String(usd));

  document.querySelectorAll('.results .price[data-g]').forEach(el => {
    el.classList.remove('flip');
    el.textContent = fmt(Number(el.dataset.g), catalogCurrency);
  });

  document.querySelectorAll('.results [data-cs]').forEach(el => {
    el.classList.toggle('on', usd);
    el.setAttribute('aria-checked', String(usd));
    el.title = usd ? 'ფასი დოლარში' : 'ფასი ლარში';
  });
});
mygemConsent.run('analytics', function () {
  if (document.querySelector('script[src*="counter.top.ge/counter.js"]')) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://counter.top.ge/counter.js';
  document.body.appendChild(s);
});