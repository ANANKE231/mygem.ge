const $=s=>document.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{toast('მეხსიერება გადაივსო (ფოტოები დიდია)')}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let users=load('users',[]),me=load('me',null),favs=load('favs',[]),notes=load('notes',{}),F={},pc={};
if(me&&!me.created){me.created=Date.now();users=users.map(u=>u.email==me.email?me:u);save('users',users);save('me',me)}

/* ---------- validation helpers ---------- */
const same=(a,b)=>String(a).toLowerCase()==String(b).toLowerCase();
const isEmail=e=>e.length<=254&&!e.includes('..')&&/^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(e);
const isPhone=p=>{const d=p.replace(/\D/g,'');return /^\+?[0-9\s-]+$/.test(p)&&d.length>=9&&d.length<=15};
const pwMsg=p=>!p?'შეიყვანეთ პაროლი':p.length<8?'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს':!/[A-Za-zႠ-ჿ]/.test(p)||!/\d/.test(p)?'პაროლი უნდა შეიცავდეს ასოსაც და ციფრსაც':'';
const nameMsg=(n,w='სახელი')=>!n?`შეიყვანეთ ${w}`:n.length<2?'მინიმუმ 2 სიმბოლო':'';
const emailMsg=e=>!e?'შეიყვანეთ ელ-ფოსტა':!isEmail(e)?'არასწორი ელ-ფოსტა (მაგ: name@mail.com)':'';
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
const ico=k=>`<svg class="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;
const typeName=p=>p.type?(p.type=='other'?(p.typeOther||TL.other):TL[p.type]||''):'';
const mk=a=>a.map(x=>[String(x),String(x)]);
const REG=[['individual','ფიზიკური პირი'],['store','მაღაზია'],['brand','ბრენდი'],['other','სხვა']];
const DD={cat:mk(CATS),gen:mk(GEN),type:TYPES.map(([k,l])=>[k,l,k]),reg:REG};
/* ---------- category-specific fields ---------- */
const METALS=['თეთრი ოქრო','ვარდისფერი ოქრო','ოქრო','ყვითელი ოქრო','ვერცხლი','პლატინა'],GOLDM=['თეთრი ოქრო','ვარდისფერი ოქრო','ოქრო','ყვითელი ოქრო'];
const PUR_G=['375','583','584','585','750','875','916','958','999'],PUR_S=['800','830','875','925','960','999'],PUR_P=['850','900','950','999'];
const purFor=m=>GOLDM.includes(m)?PUR_G:m=='ვერცხლი'?PUR_S:m=='პლატინა'?PUR_P:[...new Set([...PUR_G,...PUR_S,...PUR_P])].sort((a,b)=>a-b);
const STONES=['აკვამარინი','ალმასი','ამეთვისტო','ბრილიანტი','გრანატი','ზურმუხტი','თვლები','კორალი','კუბური ცირკონია','ლალი','მარგალიტი','საფირონი','სერდოლიკი','ტოპაზი','ქვის გარეშე'];
const LOC=['თბილისი','ბათუმი','ქუთაისი','რუსთავი','გორი','ზუგდიდი','ფოთი','ხაშური','თელავი','სხვა'];
const FD={metal:{l:'ლითონის ტიპი',o:METALS},pur:{l:'სინჯი'},gen:{l:'სქესი',o:GEN},stone:{l:'ქვის ტიპი',o:STONES},
 rsize:{l:'ბეჭდის ზომა',o:Array.from({length:15},(_,i)=>String(15+i*.5))},clen:{l:'ჯაჭვის სიგრძე (სმ)',o:['35','40','45','50','55','60','70','80']},
 clasp:{l:'საკეტის ტიპი',o:['ბოქლი','კარაბინი']},etype:{l:'საყურის ტიპი',o:['სტუდები','ჩამოკიდებული','ჯაჭვიანი','ჰუფები']},
 bsize:{l:'სამაჯურის ზომა (სმ)',o:['15','16','17','18','19','20','21','22']},cond:{l:'მდგომარეობა',o:['ახალი','ახალივით','ვინტაჟი','ანტიკური','მეორადი']},
 style:{l:'სტილი',o:['თანამედროვე','კლასიკური','მინიმალისტური','საქორწილო','ვინტაჟი']},year:{l:'გამოშვების წელი',o:['1800-1850','1850-1900','1900-1950','1950-2000','2000-2005']},brand:{l:'ბრენდი',t:'text'}};
/* price and weight are always present in the form/filters; the lists below hold the extra fields */
const FS={ring:['metal','pur','gen','stone','rsize','cond','style'],necklace:['metal','pur','gen','stone','clen','clasp','cond','style'],
 earring:['metal','pur','gen','stone','etype','cond','style'],cross:['metal','pur','gen'],other:['metal','pur','gen','stone','cond','style'],
 bracelet:['metal','pur','gen','bsize','cond'],brooch:['metal','pur','gen','cond'],coin:['metal','pur','cond','year'],
 watch:['metal','pur','cond','gen','brand'],chain:['metal','pur','cond','gen']};
const fkeys=t=>FS[t]||['metal','pur','gen'];
const av=(p,k)=>k=='gen'?p.gender:(p.attrs||{})[k];
/* filter option lists per item type (exactly the options requested); a type missing here (ring, or no type chosen) uses the full lists above */
const GF=[['ქალის','ქალი'],['კაცის','მამაკაცი']],GF1=[['ქალის','ქალი']],GF2=[['კაცის','მამაკაცი'],['ქალის','ქალი']];
const FF={
 necklace:{metal:['ვარდისფერი ოქრო','ოქრო','ყვითელი ოქრო'],pur:['585','750'],gen:GF,stone:['ამეთვისტო','ბრილიანტი','კორალი'],clen:[['45','45 სმ'],['60','60 სმ']],clasp:['ბოქლი','კარაბინი'],cond:['ახალი','ახალივით'],style:['თანამედროვე','კლასიკური','მინიმალისტური','საქორწილო']},
 earring:{metal:['ვარდისფერი ოქრო','ვერცხლი','ოქრო','ყვითელი ოქრო'],pur:['583','585','750'],gen:GF1,stone:['აკვამარინი','ბრილიანტი','გრანატი','კორალი','კუბური ცირკონია','მარგალიტი'],etype:['სტუდები','ჩამოკიდებული','ჯაჭვიანი','ჰუფები'],cond:['ანტიკური','ახალივით','ვინტაჟი'],style:['კლასიკური','მინიმალისტური']},
 cross:{metal:['ოქრო'],pur:['585'],gen:GF2},
 bracelet:{metal:['ოქრო'],pur:['585'],gen:GF2,bsize:[['22','22 სმ']],cond:['ახალი']},
 brooch:{metal:['ვერცხლი','ოქრო'],pur:['583'],stone:['სერდოლიკი'],cond:['ანტიკური','ახალივით','ვინტაჟი'],style:['ვინტაჟი','კლასიკური']},
 coin:{metal:['ოქრო'],pur:['916'],cond:['ახალივით','ვინტაჟი']},
 watch:{},chain:{},
 other:{metal:['ვერცხლი','ოქრო'],pur:['585'],gen:GF1,stone:['ბრილიანტი','თვლები'],cond:['ახალი','ახალივით','ვინტაჟი'],style:['საქორწილო']}};
const toPairs=l=>l.map(x=>Array.isArray(x)?x:[String(x),String(x)]);
const priceSym=()=>'₾';
const priceFld=()=>`<div class="fld prng"><span>ფასი (<b data-pcur>${priceSym()}</b>)</span><div class="prow"><input id="fp1" type="number" min="0" step="any" placeholder="დან" aria-label="ფასი დან"><i aria-hidden="true">–</i><input id="fp2" type="number" min="0" step="any" placeholder="მდე" aria-label="ფასი მდე"></div></div>`;
const wFld=()=>`<div class="fld prng"><span>წონა (გრ)</span><div class="prow"><input id="fw1" type="number" min="0" step="any" placeholder="დან" aria-label="წონა დან"><i aria-hidden="true">–</i><input id="fw2" type="number" min="0" step="any" placeholder="მდე" aria-label="წონა მდე"></div></div>`;
const fRender=(pre,t)=>{
 if(pre=='f'){const sp=FF[t],keys=sp?Object.keys(sp):fkeys(t);
  return `<div class="pwrow${sp?' one':''}">${priceFld()}${sp?'':wFld()}</div>`+keys.map(k=>{const d=FD[k],id='f_'+k;if(d.t=='text')return `<label>${d.l}<input id="${id}" maxlength="40"></label>`;
   const list=sp?toPairs(sp[k]):mk(k=='pur'?purFor(''):d.o);return fld(d.l,dd(id,{list,all:'ყველა'}))}).join('')}
 return fkeys(t).map(k=>{const d=FD[k],id=pre+'_'+k;return d.t=='text'?`<label>${d.l}<input id="${id}" maxlength="40"></label>`:fld(d.l,dd(id,{list:mk(k=='pur'?purFor(''):d.o),ph:'აირჩიეთ...'}))}).join('')};
function readDyn(pre){const o={};for(const k in FD){const el=$('#'+pre+'_'+k);if(!el)continue;const v=FD[k].t=='text'?el.value.trim():el.dataset.val;if(v)o[k]=v}return o}
const readNum=()=>{const o={};['fp1','fp2','fw1','fw2'].forEach(i=>{const e=$('#'+i);if(e)o[i]=e.value});return o};
function syncPur(pre){const m=$('#'+pre+'_metal'),p=$('#'+pre+'_pur');if(!p)return;const dc=$('#'+pre+'Dyn');if(pre=='f'&&dc&&FF[dc.dataset.t])return;const l=purFor(m?m.dataset.val:''),cur=p.dataset.val;setOpts(p,(pre=='f'?[['','ყველა']]:[]).concat(mk(l)),l.includes(cur)?cur:'')}
function setDyn(pre,t,v={},pr={}){const c=$('#'+pre+'Dyn');if(!c)return;c.dataset.t=t;c.innerHTML=fRender(pre,t);initDD(c);
 $$('input',c).forEach(i=>{if(pr[i.id]!=null&&pr[i.id]!=='')i.value=pr[i.id]});
 const keys=pre=='f'&&FF[t]?Object.keys(FF[t]):fkeys(t);
 keys.forEach(k=>{const el=$('#'+pre+'_'+k);if(!el||!v[k])return;if(FD[k].t=='text')el.value=v[k];else{if(k=='pur')syncPur(pre);if($$('.dd-opt',el).some(o=>o.dataset.k===v[k]))setDD(el,v[k])}})}
document.addEventListener('change',e=>{const id=e.target.id||'';if(/^[fa]_metal$/.test(id))syncPur(id[0])},true);
const attrRows=p=>Object.entries(p.attrs||{}).filter(([k,v])=>k!='gen'&&v).map(([k,v])=>[FD[k]?FD[k].l:k,v]);
const regOf=u=>u.regType||(u.shop?'store':'individual');
const regLabel=u=>regOf(u)=='other'?(u.regOther||'სხვა'):Object.fromEntries(REG)[regOf(u)];

/* demo listings: photos are looked up in img/ (see DEMO_IMG); missing files fall back to an illustration */
const DEMO_IMG={1:'img/gold-ring.jpg',2:'img/diamond-necklace.jpg',3:'img/silver-bracelet.jpg',4:'img/platinum-ring.jpg',5:'img/gold-earrings.jpg',6:'img/gold-chain.jpg',7:'img/diamond-earrings.jpg',8:'img/silver-pendant.jpg',9:'img/gold-watch.jpg',10:'img/gold-bracelet.jpg'};
const DEMO=[
 ['ოქროს ბეჭედი 585','ოქრო',4.2,780,'ქალის','💍','ring'],['ბრილიანტის ყელსაბამი','ბრილიანტი',6,4200,'ქალის','📿','necklace'],['ვერცხლის სამაჯური','ვერცხლი',18,190,'უნისექსი','⛓️','bracelet'],
 ['პლატინის საქორწინო ბეჭედი','პლატინა',5.5,2100,'კაცის','💍','ring'],['ოქროს საყურე 750','ოქრო',3.1,690,'ქალის','✨','earring'],['ოქროს ჯაჭვი 585','ოქრო',12,2300,'კაცის','⛓️','chain'],
 ['ბრილიანტის საყურე','ბრილიანტი',2.4,3100,'ქალის','💎','earring'],['ვერცხლის გულსაკიდი','ვერცხლი',6,85,'ქალის','🔮','other'],
 ['ოქროს მაჯის საათი','ოქრო',48,5600,'კაცის','⌚','watch'],['ოქროს სამაჯური 585','ოქრო',9.5,1850,'ქალის','⛓️','bracelet']
].map((a,i)=>({id:i+1,title:a[0],cat:a[1],weight:a[2],price:a[3],gender:a[4],emoji:a[5],type:a[6],typeOther:a[6]=='other'?'გულსაკიდი':'',vip:i<2?'SUPER VIP':i<5?'VIP':'',owner:'demo',desc:'მაღალი ხარისხის სამკაული',photos:[]}));
let items=load('items',null)||[];
DEMO.forEach(d=>{if(!items.some(x=>x.id===d.id))items.push(d)});
items.forEach(p=>{if(p.attrs){if(p.attrs.style=='ვინტაჟური')p.attrs.style='ვინტაჟი';if(p.attrs.etype=='ჰეფები')p.attrs.etype='ჰუფები'}});
items.forEach(p=>{if(p.owner=='demo'){p.photos=[];if(!p.attrs){p.attrs={metal:METALS.includes(p.cat)?p.cat:p.cat=='ბრილიანტი'?'თეთრი ოქრო':'',pur:(p.title.match(/\d{3}/)||[''])[0]};p.loc='თბილისი'}}});
/* resolve demo photos that really exist, so the page never shows a broken image */
const probeImg=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(src);i.onerror=()=>r(null);i.src=src});
async function loadDemoPhotos(){const done=Promise.all(items.filter(p=>p.owner=='demo'&&DEMO_IMG[p.id]).map(async p=>{const ok=await probeImg(DEMO_IMG[p.id]);if(ok)p.photos=[ok]}));
 await Promise.race([done,new Promise(r=>setTimeout(r,1500))])}

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
const gelTxt=g=>(+g).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2})+' ₾';
const fmt=(g,c='GEL')=>c=='GEL'?gelTxt(g):'$'+usdOf(g);
function rateText(){const d=new Date(RATE_DATE+'T12:00:00'),ds=isNaN(d)?RATE_DATE:d.toLocaleDateString('ka-GE',{day:'numeric',month:'long',year:'numeric'});return `საქართველოს ეროვნული ბანკის ოფიციალური კურსი: 1 $ = ${RATE.toFixed(4)} ₾ (${ds})`}
const curSw=(id,c)=>`<button type="button" class="cur sm${c=='USD'?' on':''}" data-cs="${id}" role="switch" aria-checked="${c=='USD'}" aria-label="ფასი დოლარში" title="${c=='USD'?'ფასი დოლარში (გამორთვა: ლარი)':'ფასი ლარში (ჩართვა: დოლარი)'}"><span class="cl">₾</span><span class="trk"><i></i></span><span class="cl">$</span></button>`;
function toggleCur(id){const c=(pc[id]||'GEL')=='GEL'?'USD':'GEL';pc[id]=c;
 $$(`[data-cs="${id}"]`).forEach(b=>{b.classList.toggle('on',c=='USD');b.setAttribute('aria-checked',c=='USD');b.title=c=='USD'?'ფასი დოლარში (გამორთვა: ლარი)':'ფასი ლარში (ჩართვა: დოლარი)'});
 $$(`.price[data-id="${id}"]`).forEach(p=>{p.classList.remove('flip');void p.offsetWidth;p.classList.add('flip');setTimeout(()=>p.textContent=fmt(+p.dataset.g,c),250)})}
function applyRate(){const n=$('#rateNote');if(n)n.textContent=rateText();$$('.price[data-g]').forEach(p=>{p.textContent=fmt(+p.dataset.g,p.dataset.id?pc[+p.dataset.id]||'GEL':'GEL')});if(window.calcRefresh&&$('#cMetal'))window.calcRefresh()}
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
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'};
const ui=(k,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI[k]}</svg>`;

/* ---------- product page helpers ---------- */
let pv=load('pv',{});
const dateStr=ts=>new Date(ts).toLocaleDateString('ka-GE',{day:'numeric',month:'long',year:'numeric'});
function countView(p){if(me&&same(me.email,p.owner))return;let s={};try{s=JSON.parse(sessionStorage.getItem('seenv')||'{}')}catch{}
 if(s[p.id])return;s[p.id]=1;try{sessionStorage.setItem('seenv',JSON.stringify(s))}catch{}
 pv[p.id]=(pv[p.id]||0)+1;save('pv',pv)}
function sellerOf(p){const u=users.find(u=>same(u.email,p.owner));
 return u?{u,name:(regOf(u)=='individual'?u.name+' '+(u.last||''):u.name).trim(),phone:u.phone,avatar:u.avatar,type:regLabel(u)}:{u:null,name:'mygem.ge',phone:'574173203',avatar:'',type:'მარკეტფლეისი'}}
function similar(p){const sc=x=>(x.cat==p.cat?2:0)+(x.type&&x.type==p.type?2:0)+(x.gender==p.gender?1:0);
 return items.filter(x=>x.id!=p.id).sort((a,b)=>sc(b)-sc(a)||vr(b)-vr(a)).slice(0,4)}
function pushNote(email,t){(notes[email]=notes[email]||[]).unshift({t,d:Date.now(),r:0});save('notes',notes);setBadge()}
/* ---------- listing packages: Regular / VIP / Super VIP (+ optional color) ---------- */
const PLANS={REG:{key:'REG',name:'Regular',price:0,days:0},VIP:{key:'VIP',name:'VIP',price:3,days:3},SVIP:{key:'SVIP',name:'SUPER VIP',price:6,days:2}};
const COLOR={price:1,days:1},DAY=864e5;
const PAY_HOLDER='გ.მ.',BANKS=[{id:'bog',name:'საქართველოს ბანკი',iban:'GE74BG0000000549883748'},{id:'tbc',name:'თიბისი ბანკი',iban:'GE56TB7046245064300117'}];
const planName=k=>k=='SVIP'?'Super VIP':PLANS[k].name;
const planLabel=k=>k=='REG'?'Regular — უფასო':`${planName(k)} — ${PLANS[k].price} ₾ · ${PLANS[k].days} დღე`;
const planOf=n=>Object.values(PLANS).find(x=>x.name==n);
const isAdmin=()=>!!me&&(window.ADMIN_EMAILS||[]).some(e=>same(e,me.email));
const pendingPay=()=>items.filter(p=>p.pay&&p.pay.status=='pending');
const notifyOwner=(p,t)=>{if(p.owner&&p.owner!='demo')pushNote(p.owner,t)};
const fdt=ts=>new Date(ts).toLocaleString('ka-GE');
/* automatic expiry: VIP / Super VIP / color switch off by themselves when their time is up */
function sweep(){const now=Date.now();let ch=false;
 items.forEach(p=>{
  if(p.vip&&p.vipUntil&&p.vipUntil<=now){notifyOwner(p,`«${p.title}» – ${p.vip} სტატუსის ვადა ამოიწურა`);p.vip='';delete p.vipUntil;if(p.pay&&p.pay.status=='active')p.pay.status='expired';ch=true}
  if(p.color&&p.colorUntil&&p.colorUntil<=now){p.color=false;delete p.colorUntil;delete p.colorHex;ch=true}});
 if(ch)save('items',items);return ch}
const ownChip=p=>{if(!me||!p.pay||!same(me.email,p.owner))return '';const s=p.pay.status;
 return s=='pending'?'<span class="pstat">გადახდა მოწმდება</span>':s=='rejected'?'<span class="pstat rejected">გადახდა არ დადასტურდა</span>':''};
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch{}
 try{const x=document.createElement('textarea');x.value=t;x.setAttribute('readonly','');x.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.append(x);x.select();x.setSelectionRange(0,t.length);const ok=document.execCommand('copy');x.remove();return ok}catch{return false}}
/* payment section of the add-listing form (hidden until VIP / Super VIP is chosen) */
/* colored listing: owner-chosen border color (valid #rrggbb only) */
const BC_DEF='#C9A227',BC_SW=['#C9A227','#D64545','#E07B39','#2E9E6B','#2F80ED','#7B5CD6','#D6458F','#1F2933'];
const okHex=h=>/^#[0-9a-f]{6}$/i.test(h||'');
const colorActive=p=>!!p.color&&(!p.colorUntil||p.colorUntil>Date.now());
const colorPending=p=>!!(p.pay&&p.pay.status=='pending'&&p.pay.color);
const cardHex=p=>colorActive(p)?(okHex(p.colorHex)?p.colorHex:BC_DEF):(colorPending(p)&&me&&same(me.email,p.owner)?(okHex(p.pay.colorHex)?p.pay.colorHex:BC_DEF):'');
const pickHTML=(id,val,item)=>`<div class="cpick" id="${id}"${item!=null?` data-item="${item}"`:''}>${BC_SW.map(c=>`<button type="button" class="csq${c.toLowerCase()==val.toLowerCase()?' on':''}" data-cpc="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<label class="cany" title="სხვა ფერი"><input type="color" value="${val}" data-cpi aria-label="ფერის არჩევა"></label><input type="hidden" class="cval" value="${val}"></div>`;
function setPick(box,hex,toastIt){if(!okHex(hex))return;hex=hex.toLowerCase();
 $$('.csq',box).forEach(b=>b.classList.toggle('on',b.dataset.cpc.toLowerCase()==hex));box.querySelector('.cval').value=hex;const ci=box.querySelector('[data-cpi]');if(ci)ci.value=hex;
 if(box.dataset.item!=null){const p=items.find(x=>String(x.id)===box.dataset.item);
  if(!p||!me||!same(me.email,p.owner)||!(colorActive(p)||colorPending(p)))return toast('ფერის შეცვლა ამჟამად შეუძლებელია');
  if(colorActive(p))p.colorHex=hex;else p.pay.colorHex=hex;save('items',items);$$(`.card[data-id="${p.id}"]`).forEach(c=>c.style.setProperty('--bc',hex));if(toastIt)toast('ჩარჩოს ფერი შეინახა ✓')}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cpc]');if(b){const box=b.closest('.cpick');if(box)setPick(box,b.dataset.cpc,true)}});
document.addEventListener('input',e=>{if(e.target.matches&&e.target.matches('[data-cpi]')){const box=e.target.closest('.cpick');if(box)setPick(box,e.target.value,false)}});
document.addEventListener('change',e=>{if(e.target.matches&&e.target.matches('[data-cpi]')){const box=e.target.closest('.cpick');if(box&&box.dataset.item!=null)toast('ჩარჩოს ფერი შეინახა ✓')}});
const COPY_I='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>';
const payBox=()=>`<div class="paybox full" id="payBox" hidden><h4>გადახდა ბანკის გადარიცხვით</h4>
<div class="payrecv"><span>მიმღები:</span><b>${esc(PAY_HOLDER)}</b></div>
<div class="banks">${BANKS.map(k=>`<div class="bank"><div class="bn">${esc(k.name)}</div><div class="bacc"><span>ანგარიშის ნომერი</span><div class="brow"><b id="iban_${k.id}">${esc(k.iban)}</b><button type="button" class="copybtn" data-copy="${k.id}" aria-label="${esc(k.name)} – ანგარიშის ნომრის კოპირება">${COPY_I}<span>კოპირება</span></button></div></div></div>`).join('')}</div>
<label class="chk addon"><input type="checkbox" id="aColor"> ფერადი გამოყოფა · +${COLOR.price} ₾ · ${COLOR.days} დღე</label>
<div class="cpbox" id="aColorBox" hidden><span>აირჩიეთ ჩარჩოს ფერი</span>${pickHTML("aCP",BC_DEF)}</div>
<div class="fld" id="rcptFld"><span>გადახდის ქვითარი (სავალდებულოა)</span><label class="drop rc" for="aR"><b>ატვირთეთ ქვითარი</b><small>სურათი ან PDF · PDF მაქს. 1.5MB</small></label><input type="file" id="aR" accept="image/*,application/pdf" hidden><div class="rcprev" id="rcPrev"></div></div>
<p class="paynote">ქვითრის ატვირთვა სტატუსს ავტომატურად არ ააქტიურებს — გადახდას ადმინისტრატორი ამოწმებს. დადასტურების შემდეგ სტატუსი ჩაირთვება და ვადა ამ მომენტიდან დაითვლება.</p></div>`;
/* admin: verify or reject payments */
function payPanel(){const pend=pendingPay().sort((a,b)=>a.pay.created-b.pay.created),act=items.filter(p=>p.vip&&p.vipUntil).sort((a,b)=>a.vipUntil-b.vipUntil),
 th=p=>`<div class="pthm" style="${p.photos[0]?`background-image:url('${p.photos[0]}')`:''}">${p.photos[0]?'':ill(p)}</div>`;
 return `<div class="paylist"><h3 class="psub">ელოდება შემოწმებას (${pend.length})</h3>${pend.length?pend.map(p=>{const y=p.pay;return `<div class="payrow">${th(p)}<div class="pinf"><a href="#product:${p.id}"><b>${esc(p.title)}</b></a><small>${esc(p.owner)} · ${fdt(y.created)}</small><small>${esc(y.plan)} · ${y.days} დღე${y.color?` + ფერადი (${COLOR.days} დღე)`:''} · <b>${y.amount} ₾</b></small></div><div class="pacts"><button type="button" class="btn alt sm" data-rcpt="${p.id}">ქვითარი</button><button type="button" class="btn sm" data-payok="${p.id}">დადასტურება</button><button type="button" class="btn alt sm" data-payno="${p.id}">უარყოფა</button></div></div>`}).join(''):'<div class="empty">მოლოდინში მყოფი გადახდები არ არის</div>'}
<h3 class="psub">აქტიური სტატუსები (${act.length})</h3>${act.length?act.map(p=>`<div class="payrow">${th(p)}<div class="pinf"><a href="#product:${p.id}"><b>${esc(p.title)}</b></a><small>${esc(p.owner)}</small><small>${esc(p.vip)} · მოქმედებს ${fdt(p.vipUntil)}-მდე${p.color?' · ფერადი':''}</small></div></div>`).join(''):'<div class="empty">აქტიური სტატუსები არ არის</div>'}</div>`}
function openReceipt(id){if(!isAdmin())return;const p=items.find(x=>String(x.id)===String(id)),y=p&&p.pay;if(!y||!y.receipt)return;
 if(y.receiptType=='pdf'){try{const b=atob(y.receipt.split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);window.open(URL.createObjectURL(new Blob([u],{type:'application/pdf'})),'_blank')}catch{toast('ფაილის გახსნა ვერ მოხერხდა')}return}
 const d=document.createElement('div');d.className='try-lb';d.innerHTML=`<img src="${y.receipt}" alt="">`;d.onclick=()=>d.remove();document.body.append(d)}
function payDecide(id,ok){if(!isAdmin())return;const p=items.find(x=>String(x.id)===String(id));if(!p||!p.pay||p.pay.status!='pending')return;
 if(!ok)return payReject(p);
 const now=Date.now(),y=p.pay;p.vip=y.plan;p.vipUntil=now+y.days*DAY;if(y.color){p.color=true;p.colorUntil=now+COLOR.days*DAY;p.colorHex=okHex(y.colorHex)?y.colorHex:BC_DEF}
 y.status='active';y.verifiedBy=me.email;y.verifiedAt=now;save('items',items);
 notifyOwner(p,`«${p.title}» – ${y.plan} გადახდა დადასტურდა. სტატუსი აქტიურია ${fdt(p.vipUntil)}-მდე`);toast('გადახდა დადასტურდა ✓');showProfile('pay')}
function payReject(p){curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<h3>გადახდის უარყოფა</h3><p>${esc(p.title)}</p><form class="form" id="rjForm" novalidate><label>მიზეზი (არასავალდებულო)<textarea id="rjT" rows="3" maxlength="300"></textarea></label><div class="row2"><button class="btn" type="submit">უარყოფა</button><button type="button" class="btn alt" id="rjNo">გაუქმება</button></div></form>`;
 $('#rjNo').onclick=closeModal;
 $('#rjForm').onsubmit=e=>{e.preventDefault();if(!isAdmin()||!p.pay||p.pay.status!='pending')return closeModal();const r=$('#rjT').value.trim();
  p.pay.status='rejected';p.pay.verifiedBy=me.email;p.pay.verifiedAt=Date.now();p.pay.reason=r;save('items',items);
  notifyOwner(p,`«${p.title}» – ${p.pay.plan} გადახდა ვერ დადასტურდა${r?': '+r:''}. განცხადება გამოქვეყნებულია Regular სტატუსით`);closeModal();toast('გადახდა უარყოფილია');showProfile('pay')}}

function showLink(url){curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<h3>განცხადების ბმული</h3><p>დააკოპირეთ და გაგზავნეთ:</p><form class="form" novalidate><label><input id="lnk" readonly value="${esc(url)}"></label><button type="button" class="btn" id="lnkOk">დახურვა</button></form>`;
 const i=$('#lnk');i.focus();i.select();$('#lnkOk').onclick=closeModal}
async function shareP(id){const p=items.find(x=>String(x.id)===String(id));if(!p)return;
 const base=location.protocol=='file:'?location.href.split('#')[0]:location.origin+location.pathname,url=base+'#product:'+p.id,data={title:p.title,url};
 if(navigator.share&&(!navigator.canShare||navigator.canShare(data))){try{await navigator.share(data);return}catch(e){if(e&&e.name=='AbortError')return}}
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
  if(s.u)pushNote(s.u.email,`ახალი შეტყობინება განცხადებაზე «${p.title}» – ${nm} (${me.phone||'—'}): ${v}`);
  addNote(`შეტყობინება გაიგზავნა განცხადებაზე: ${p.title}`);closeModal();toast('შეტყობინება გაგზავნილია ✓')};
 setTimeout(()=>{const T=$('#mT');if(T){T.focus();T.select()}},60)}
function confirmLogout(){curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<div class="confirm"><div class="ci">${ui('logout')}</div><h3>დარწმუნებული ხართ, რომ გსურთ გასვლა?</h3><div class="row2"><button type="button" class="btn" id="lgYes">დიახ</button><button type="button" class="btn alt" id="lgNo">არა</button></div></div>`;
 $('#lgNo').focus();$('#lgNo').onclick=closeModal;
 $('#lgYes').onclick=()=>{closeModal();me=null;save('me',null);setLogin();if(location.hash=='#home'||!location.hash)route();else location.hash='home'}}

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
function card(p){const f=favs.includes(p.id),c=pc[p.id]||'GEL',tn=typeName(p);
 const tags=[p.cat,tn,p.weight?p.weight+' გრ':'',p.attrs&&p.attrs.pur?p.attrs.pur+' სინჯი':'',p.gender].filter(Boolean).slice(0,3).map(t=>`<span class="tg">${esc(t)}</span>`).join('');
 return `<div class="card${p.vip?(p.vip=='VIP'?' is-vip':' is-svip'):''}${cardHex(p)?' is-color':''}"${cardHex(p)?` style="--bc:${cardHex(p)}"`:''} data-id="${p.id}" tabindex="0" role="link" aria-label="${esc(p.title)}">${p.vip?`<span class="badge ${p.vip=='VIP'?'s':''}">${CROWN}${p.vip}</span>`:''}<div class="img"><div class="imgi" style="${p.photos[0]?`background-image:url('${p.photos[0]}')`:''}">${p.photos[0]?'':ill(p)}</div></div><div class="in"><small class="loc">${esc(p.loc||'')}</small><div class="trow"><h4>${esc(p.title)}</h4><button type="button" class="cact fav ${f?'on':''}" data-fav="${p.id}" aria-pressed="${f}" aria-label="${f?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება'}" title="ფავორიტები">${ui('heart')}</button></div>${ownChip(p)}<div class="price" data-g="${p.price}" data-id="${p.id}">${fmt(p.price,c)}</div>${tags?`<div class="tags">${tags}</div>`:''}<div class="cbot">${curSw(p.id,c)}</div></div></div>`}
const grid=l=>`<div class="grid">${l.map(card).join('')}</div>`;

/* ---------- filters ---------- */
const filters=()=>`<div class="fgrid">${fld('საძიებო სიტყვა',dd('fT',{list:DD.type,all:'ყველა',other:1,otherPh:'ნივთის დასახელება'}))}${fld('მდებარეობა',dd('fl',{list:mk(LOC),all:'ყველა'}))}<div class="dyn" id="fDyn" data-t="">${fRender('f','')}</div></div><button class="btn" id="goS">${ui('search')}<span>ძებნა</span></button>`;
const EPS=1e-9;
const priceIn=p=>p.price;
const gmatch=(p,v)=>p.gender==v||p.gender=='უნისექსი';
const match=p=>{const hay=(p.title+' '+(p.typeOther||'')).toLowerCase(),pr=priceIn(p);
 return (!F.t||(F.t=='other'?(F.o?hay.includes(F.o.toLowerCase()):p.type=='other'):p.type==F.t))&&(!F.l||p.loc==F.l)&&Object.entries(F.x||{}).every(([k,v])=>!v||(k=='brand'?String(av(p,k)||'').toLowerCase().includes(v.toLowerCase()):k=='gen'?gmatch(p,v):av(p,k)==v))&&(!F.w1||p.weight>=F.w1)&&(!F.w2||p.weight<=F.w2)&&(!F.p1||pr>=F.p1-EPS)&&(!F.p2||pr<=F.p2+EPS)};

/* ---------- calculator ---------- */
const M={'ოქრო':{p:330,s:[375,585,750,916,999]},'ვერცხლი':{p:3.8,s:[800,925,999]},'პლატინა':{p:87,s:[850,950]}};
let shown=0,raf=0;
/* thin white light that travels along the real border (rounded corners included): stacked dashes of decreasing length share one leading edge, giving a soft comet tail without any blur */
const CALC_TRACE=`<div class="calc-trace" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg">${[[10,.09],[8.5,.1],[7,.12],[5.5,.15],[4,.2],[2.5,.3],[1.2,.6]].map(([L,o])=>`<rect x="0" y="0" width="100%" height="100%" rx="28" ry="28" pathLength="100" style="--L:${L};--E:${L-100};stroke-dasharray:${L} ${100-L};stroke-opacity:${o}"/>`).join('')}</svg></div>`;
const calcBox=()=>`<div class="calc-frame"><div class="calc"><h2><span class="calc-gem">${GEM}</span>სამკაულის ფასის კალკულატორი</h2><div class="calc-grid"><div class="calc-form">${fld('ლითონის ტიპი',dd('cMetal',{list:mk(Object.keys(M)),val:Object.keys(M)[0]}))}${fld('სინჯი',dd('cSample',{list:[]}))}<label>წონა (გრამი)<input id="cWeight" type="number" min="0" step="0.1" value="5"></label><label>სუფთა ლითონის ფასი 1 გრამზე (₾)<input id="cPrice" type="number" min="0" step="0.01"></label></div><div class="calc-out"><small>გამოთვლილი ფასი</small><div class="total" id="totG">0.00 ₾</div><div class="total usd" id="totU">$0.00</div><div class="bar"><i id="bar"></i></div><small id="perG"></small><small id="rateNote">${rateText()}</small></div></div></div>${CALC_TRACE}</div>`;
function counter(tg,gT,uT){cancelAnimationFrame(raf);const a=shown,t0=performance.now();
 raf=requestAnimationFrame(function step(t){const el=$('#totG');if(!el)return;const k=Math.min(1,(t-t0)/500),e=1-Math.pow(1-k,3);shown=a+(tg-a)*e;
  if(k<1){el.textContent=money(rdiv(toS(shown)*100n,SC))+' ₾';$('#totU').textContent='$'+usdOf(shown);raf=requestAnimationFrame(step)}
  else{shown=tg;el.textContent=gT+' ₾';$('#totU').textContent='$'+uT}})}
function initCalc(){const cm=$('#cMetal'),cs=$('#cSample'),cw=$('#cWeight'),cp=$('#cPrice');
 const fillS=()=>{const s=M[cm.dataset.val].s;setOpts(cs,s.map(x=>[String(x),String(x)]),String(s[Math.min(1,s.length-1)]))};
 const calc=()=>{const w=Math.max(0,+cw.value||0),p=Math.max(0,+cp.value||0),s=+cs.dataset.val||0,S=BigInt(s),pS=toS(p),wS=toS(w),rS=toS(RATE),
   perG=money(rdiv(pS*S*100n,1000n*SC)),perU=money(rdiv(pS*S*100n,1000n*rS)),
   totG=money(rdiv(pS*S*wS*100n,1000n*SC*SC)),totU=money(rdiv(pS*S*wS*100n,1000n*SC*rS)),tot=p*s/1000*w;
  $('#perG').textContent=`1 გრ (${s} სინჯი): ${perG} ₾ / $${perU}`;
  $('#bar').style.width=Math.min(100,tot/300)+'%';counter(tot,totG,totU)};
 window.calcRefresh=()=>calc();cm.onchange=()=>{fillS();cp.value=M[cm.dataset.val].p;calc()};cs.onchange=calc;cw.oninput=calc;cp.oninput=calc;
 fillS();cp.value=M[cm.dataset.val].p;shown=0;calc()}

/* ---------- password field ---------- */
const EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g class="see"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></g><g class="off"><path d="M3 3l18 18"/><path d="M10.6 5.1A9.9 9.9 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6A17 17 0 002 12s4 7 10 7c1.7 0 3.200-.4 4.500-1.100"/><path d="M9.900 9.900a3 3 0 004.200 4.200"/></g></svg>';
const pw=(id,l,ac='current-password')=>`<label>${l}<div class="pw"><input id="${id}" type="password" autocomplete="${ac}"><button type="button" class="eye" data-eye aria-label="პაროლის ჩვენება/დამალვა">${EYE}</button></div></label>`;

/* ---------- home sections ---------- */
const homeSec=(id,t,l,em,more)=>`<section class="sec" id="${id}"><h2>${t}</h2>${l.length?grid(l):`<div class="empty">${em}</div>`}${more?'<div class="more"><a class="btn alt" href="#search" data-reset>ყველა განცხადება</a></div>':''}</section>`;
/* blogs: 1st = left half, 2nd + 3rd = stacked on the right half */
const homeBlog=()=>{const b=BLOG.slice(0,3);if(!b.length)return '';
 const c=(x,big)=>`<a class="hbc${big?' big':''}" href="#post:${x.id}"><span class="hbi"><img src="${x.img}" alt="${esc(x.t)}" width="1400" height="934" loading="lazy" decoding="async"></span><span class="hbb"><small>${x.min} წთ კითხვა</small><b>${esc(x.t)}</b>${big?`<span class="hbe">${esc(x.ex)}</span>`:''}</span></a>`;
 return `<section class="sec hblog" id="blogHome"><h2>ბლოგი</h2><div class="hbg">${c(b[0],1)}<div class="hbs">${b.slice(1).map(x=>c(x,0)).join('')}</div></div><div class="more"><a class="btn" href="#blog">გაიგეთ მეტი</a></div></section>`};

/* ---------- views ---------- */
const views={
home(){return `<section class="hero"><h1>იპოვე შენი სრულყოფილი სამკაული</h1><p>ათასობით ოქროს, ვერცხლისა და ბრილიანტის ნივთი ერთ სივრცეში</p><div class="sbox">${filters()}</div></section>
${homeSec('svipSec','Super VIP კოლექცია',items.filter(p=>p.vip=='SUPER VIP').reverse(),'ჯერ არ არის Super VIP განცხადებები')}
<section class="calc-wrap" id="calcHome"><div class="calc-in">${calcBox()}</div></section>
${homeSec('vipSec','VIP+ კოლექცია',items.filter(p=>p.vip=='VIP').reverse(),'ჯერ არ არის VIP განცხადებები',true)}
${homeBlog()}`},
search(){const r=items.filter(match).sort((a,b)=>!!b.vip-!!a.vip);
 return `<div class="layout"><aside><div class="sbox">${filters()}</div></aside><div class="results"><h2 style="margin-bottom:14px">ნაპოვნია: ${r.length}</h2>${r.length?grid(r):'<div class="empty">ვერაფერი მოიძებნა 😔</div>'}</div></div>`},
blog(){return `<div class="page blog"><h2 class="bh">ბლოგი</h2><p class="bsub">რჩევები, გზამკვლევები და ინსპირაცია სამკაულების სამყაროდან</p><div class="bgrid">${BLOG.map((b,i)=>`<a class="bcard" href="#post:${b.id}"><span class="bimg"><img src="${b.img}" alt="${esc(b.t)}" width="1400" height="934" loading="lazy" decoding="async"></span><span class="bbody"><small class="bm">${b.min} წთ კითხვა</small><b>${esc(b.t)}</b><span class="bex">${esc(b.ex)}</span></span></a>`).join('')}</div></div>`},
post(t){const i=BLOG.findIndex(b=>String(b.id)===String(t)),b=BLOG[i];if(!b)return `<div class="page"><div class="panel empty">სტატია ვერ მოიძებნა<div style="margin-top:16px"><a class="btn" href="#blog">ბლოგზე დაბრუნება</a></div></div></div>`;
 const n=BLOG[i+1];return `<article class="page art"><a class="aback" href="#blog">${ui('back')}ბლოგი</a><small class="ameta">${b.min} წუთი კითხვა</small><h1>${esc(b.t)}</h1><img class="ahero" src="${b.img}" alt="${esc(b.t)}" width="1400" height="934" decoding="async"><div class="abody">${(()=>{let h='',l=false;const f=x=>esc(x).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');for(const x of b.body){const li=x.startsWith('- ');if(l&&!li){h+='</ul>';l=false}if(li&&!l){h+='<ul>';l=true}h+=li?`<li>${f(x.slice(2))}</li>`:x[0]=='#'?`<h3>${esc(x.slice(1).trim())}</h3>`:`<p>${f(x)}</p>`}return h+(l?'</ul>':'')})()}</div>${n?`<a class="anext" href="#post:${n.id}"><small>შემდეგი სტატია</small><b>${esc(n.t)}</b></a>`:''}<div class="acta"><a class="btn" href="#search" data-reset>იხილეთ კოლექცია</a></div></article>`},
calculator(){return `<div class="page" style="max-width:960px">${calcBox()}</div>`},
favs(){if(!me){openAuth('login');return '<div class="page"><div class="panel empty">გთხოვთ შეხვიდეთ სისტემაში</div></div>'}
 const l=items.filter(p=>favs.includes(p.id));
 return `<div class="page" style="max-width:1100px"><h1 style="color:var(--pd);margin-bottom:20px">ფავორიტები</h1>${l.length?grid(l):'<div class="empty">ფავორიტები ცარიელია</div>'}</div>`},
add(){if(!me){openAuth('login');return '<div class="page"><div class="panel empty">გთხოვთ შეხვიდეთ სისტემაში</div></div>'}
 if(!me.phone){setTimeout(()=>{toast('განცხადების დასამატებლად მიუთითეთ ტელეფონის ნომერი');location.hash='profile:edit'},0);return '<div class="page"><div class="panel empty">მიუთითეთ ტელეფონის ნომერი პროფილში</div></div>'}
 window.ph=[];window.rc=null;
  const UP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/></svg>';
 return `<div class="page"><div class="panel"><h2 style="margin-bottom:16px;color:var(--pd)">ახალი განცხადება</h2><form class="form" id="addForm" novalidate><div class="fsum full" id="formSum" hidden></div>
 ${fld('კატეგორია',dd('aC',{list:DD.cat}))}${fld('ნივთის ტიპი',dd('aK',{list:DD.type,other:1,otherPh:'ნივთის დასახელება'}))}${fld('მდებარეობა',dd('aL',{list:mk(LOC)}))}<div class="dyn" id="aDyn">${fRender('a','')}</div><label>დასახელება<input id="aT" maxlength="80"></label>
 <label class="full">აღწერა<textarea id="aD" rows="3"></textarea></label><div class="trio full"><label>წონა (გრ)<input id="aW" type="number" step="0.1" min="0"></label><label>ფასი (₾)<input id="aP" type="number" min="0"></label>${fld('განცხადების ტიპი',dd('aPlan',{list:Object.keys(PLANS).map(k=>[k,planLabel(k)]),val:'REG'}))}</div><p class="planinfo full" id="planInfo"></p>${payBox()}
 <div class="fld full" id="photoFld"><span>ფოტოები (მინ. 3, მაქს. 8)</span><label class="drop" id="drop" for="aF"><span class="up">${UP}</span><b>ატვირთეთ ფოტოები</b><small>გადმოათრიეთ აქ ან <u>აირჩიეთ ფაილები</u></small><small>JPG, PNG, WEBP · პირველი ფოტო იქნება მთავარი</small></label><input type="file" id="aF" accept="image/*" multiple hidden><div class="pcount" id="pcount"><div class="pbar"><i id="pbar"></i></div><span id="pcnt">0/3 მინიმუმ</span></div><div class="photos" id="prev"></div></div>
 <label class="chk full"><input type="checkbox" id="aTerms"> ვეთანხმები <span class="tl" data-terms>წესებსა და პირობებს</span></label><button class="btn full" type="submit">გამოქვეყნება</button></form></div></div>`},
product(t){const p=items.find(x=>String(x.id)===String(t));
 if(!p)return `<div class="page"><div class="panel empty">ეს განცხადება ვერ მოიძებნა 😔<div style="margin-top:16px"><a class="btn" href="#home">მთავარზე დაბრუნება</a></div></div></div>`;
 countView(p);
 const c=pc[p.id]||'GEL',f=favs.includes(p.id),s=sellerOf(p),tn=typeName(p),imgs=p.photos||[],sim=similar(p),n=pv[p.id]||0;
 const rows=[['კატეგორია',p.cat],['ნივთის ტიპი',tn,p.type],['სქესი',p.gender],['წონა',p.weight?p.weight+' გრ':''],['მდებარეობა',p.loc],...attrRows(p)].filter(r=>r[1]);
 const tel=String(s.phone||'').replace(/[^\d+]/g,'');
 const main=imgs.length?`<img id="pgImg" src="${imgs[0]}" alt="${esc(p.title)}">`:`<div class="pph">${ill(p)}</div>`;
 return `<div class="page pdp"><button type="button" class="pback" id="pBack">${ui('back')}<span>უკან</span></button>
 <div class="pd-grid">
  <div class="pgal" id="pgal" data-id="${p.id}">
   <div class="pmain">${main}${p.vip?`<span class="badge ${p.vip=='VIP'?'s':''}">${CROWN}${p.vip}</span>`:''}${imgs.length>1?`<button type="button" class="pnav l" data-pg="-1" aria-label="წინა">${ui('prev')}</button><button type="button" class="pnav r" data-pg="1" aria-label="შემდეგი">${ui('next')}</button><span class="pcnt" id="pgCnt">1 / ${imgs.length}</span>`:''}</div>
   ${imgs.length>1?`<div class="pthumbs">${imgs.map((s,i)=>`<button type="button" class="pth ${i?'':'on'}" data-i="${i}" aria-label="ფოტო ${i+1}"><img src="${s}" alt=""></button>`).join('')}</div>`:''}
  </div>
  <div class="pinfo">
   <div class="pmeta"><span>${ui('calendar')}${dateStr(p.created)}</span><span>${ui('eye')}${n} ნახვა</span></div>
   <h1 class="ptitle">${esc(p.title)}</h1>
   <div class="pprice"><span class="price" data-g="${p.price}" data-id="${p.id}">${fmt(p.price,c)}</span>${curSw(p.id,c)}</div>
   ${me&&same(me.email,p.owner)&&(colorActive(p)||colorPending(p))?`<div class="cpbox own"><span>ჩარჩოს ფერი${colorActive(p)?(p.colorUntil?` · მოქმედებს ${fdt(p.colorUntil)}-მდე`:''):' · სხვებისთვის გამოჩნდება გადახდის დადასტურების შემდეგ'}</span>${pickHTML('pCP',cardHex(p),p.id)}</div>`:''}
   <div class="pact"><button type="button" class="pa pic ${f?'on':''}" data-pfav="${p.id}" aria-pressed="${f}" aria-label="${f?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება'}" title="${f?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება'}">${ui('heart')}<span class="lb">ფავორიტები</span></button><button type="button" class="pa pic" data-share="${p.id}" aria-label="გაზიარება" title="გაზიარება">${ui('share')}<span class="lb">გაზიარება</span></button><button type="button" class="pa pic ai" data-try="${p.id}" aria-label="AI აირჩიე და მოირგე" title="AI აირჩიე და მოირგე">${TRY_ICON}<span class="lb">AI აირჩიე და მოირგე</span></button></div>
   <div class="pattrs">${rows.map(r=>`<div class="pr2"><span>${r[0]}</span><b>${r[2]?ico(r[2]):''}${esc(r[1])}</b></div>`).join('')}</div>
   <div class="pdesc"><h3>აღწერა</h3><p>${esc(p.desc||'')}</p></div>
   <div class="pseller">
    <div class="sh"><div class="sav">${s.avatar?`<img src="${s.avatar}" alt="">`:ui('user')}</div><div class="sn"><small>გამყიდველი</small><b>${esc(s.name)}</b><em>${esc(s.type)}</em></div></div>
    <a class="sph" href="tel:${tel}">${esc(s.phone||'')}</a>
    <div class="sbtns"><a class="btn sb call" href="tel:${tel}">${ui('phone')}<span>დარეკვა</span></a><button type="button" class="btn sb" data-msg="${p.id}">${ui('chat')}<span>მიწერა</span></button></div>
   </div>
  </div>
 </div>
 ${sim.length?`<section class="simsec"><h2>მსგავსი განცხადებები</h2>${grid(sim)}</section>`:''}</div>`},
profile(tab='mine'){if(!me){openAuth('login');return ''}
  if(tab=='pay'&&!isAdmin())tab='mine';
 const mine=items.filter(p=>p.owner==me.email).sort((a,b)=>(b.created||0)-(a.created||0)||(+b.id||0)-(+a.id||0)),ind=regOf(me)=='individual',nm=ind?me.name+' '+(me.last||''):me.name;
 const since=me.created?new Date(me.created).toLocaleDateString('ka-GE',{year:'numeric',month:'long',day:'numeric'}):'—';
 return `<div class="page"><div class="panel"><div class="prof-head"><div class="ava">${me.avatar?`<img src="${me.avatar}">`:ui('user')}</div><div><h2>${esc(nm)}</h2><small class="pmail">${ui('mail')}${esc(me.email)}</small><div class="stats"><span class="stat"><i>${ui('tag')}</i><span><b>${esc(regLabel(me))}</b></span></span><span class="stat"><i>${ui('calendar')}</i><span>ანგარიში შექმნილია: <b>${since}</b></span></span><span class="stat"><i>${ui('gem')}</i><span>განცხადებები: <b>${mine.length}</b></span></span></div><label class="btn alt sm">${ui('camera')}ფოტოს შეცვლა<input type="file" id="avIn" accept="image/*" hidden></label></div><a href="#add" class="btn" style="margin-left:auto">${ui('plus')}დამატება</a></div>
 <div class="tabs"><button data-tab="mine" class="${tab=='mine'?'on':''}">${ui('grid')}ჩემი განცხადებები</button><button data-tab="edit" class="${tab=='edit'?'on':''}">${ui('sliders')}პარამეტრები</button>${isAdmin()?`<button data-tab="pay" class="${tab=='pay'?'on':''}">${ui('tag')}გადახდები${pendingPay().length?` (${pendingPay().length})`:''}</button>`:''}<button class="btn alt" id="logout">${ui('logout')}გასვლა</button></div>
 ${tab=='pay'?payPanel():tab=='edit'?`<form class="form" id="eForm" novalidate>${fld('რეგისტრაციის ტიპი',dd('eT',{list:DD.reg,val:regOf(me),other:1,otherPh:'მიუთითეთ რეგისტრაციის ტიპი'}),'full')}<label id="eNL">${ind?'სახელი':'დასახელება'}<input id="eN" value="${esc(me.name)}"></label><label id="eLL" style="${ind?'':'display:none'}">გვარი<input id="eL" value="${esc(me.last||'')}"></label><label>ელ-ფოსტა<input id="eE" type="email" value="${esc(me.email)}" autocomplete="email"></label><label>ტელეფონი<input id="eP" value="${esc(me.phone)}" autocomplete="tel"></label><label class="full">მომხმარებლის სახელი<input id="eU" value="${esc(me.username||'')}" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false"></label>${pw('ePw','ახალი პაროლი','new-password')}${pw('ePw2','გაიმეორეთ პაროლი','new-password')}<button class="btn full" type="submit">შენახვა</button></form>`:mine.length?grid(mine):'<div class="empty">ჩანაწერი არ არის</div>'}</div></div>`}};

const ORDER={home:0,search:1,product:1.5,calculator:2,blog:3,post:3.1,favs:4,add:5,profile:6};
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
let navN=0,lastIdx=0,rTok=0,pendingScroll=null;
/* page transition: same slide + fade language as the Login <-> Registration swap */
function route(){sweep();let[h,t]=location.hash.slice(1).split(':');if(h=='calculator'){pendingScroll='calcHome';h='home';history.replaceState(null,'','#home')}const v=views[h]?h:'home',tok=++rTok,app=$('#app'),idx=ORDER[v]??0,dir=Math.sign(idx-lastIdx)||1;
 const render=()=>{app.innerHTML=views[v](t);window.scrollTo({top:0,behavior:'instant'});bind();if(pendingScroll){const el=document.getElementById(pendingScroll);pendingScroll=null;if(el)requestAnimationFrame(()=>el.scrollIntoView({behavior:REDUCE?'auto':'smooth',block:'start'}))}};
 navN++;lastIdx=idx;
 if(navN==1||REDUCE){render();return}
 app.getAnimations().forEach(a=>a.cancel());
 const out=app.animate([{opacity:1,transform:'none'},{opacity:0,transform:`translateX(${-40*dir}px)`}],{duration:170,easing:'ease',fill:'forwards'});
 out.onfinish=()=>{if(tok!=rTok)return;render();app.animate([{opacity:0,transform:`translateX(${40*dir}px)`},{opacity:1,transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});out.cancel()}}
function showProfile(tab){$('#app').innerHTML=views.profile(tab);bind()}

/* reveal-on-scroll for collection cards (re-triggers each time a card scrolls into view) */
let io=null;
function reveal(){if(REDUCE||!('IntersectionObserver' in window))return;if(io)io.disconnect();
 io=new IntersectionObserver(es=>{
  const vis=es.filter(e=>e.intersectionRatio>=.1).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left);
  vis.forEach((en,i)=>{en.target.style.setProperty('--d',Math.min(i,6)*90+'ms');en.target.classList.remove('rv')});
  es.forEach(en=>{if(en.intersectionRatio===0&&en.boundingClientRect.top>0){en.target.style.setProperty('--d','0ms');en.target.classList.add('rv')}})
 },{threshold:[0,.1],rootMargin:'0px 0px -40px 0px'});
 $$('.card',$('#app')).forEach(el=>{el.classList.add('rv');io.observe(el)})}

/* product page: gallery + back button */
function bindV2(){
 const bk=$('#pBack');if(bk)bk.onclick=()=>{if(navN>1)history.back();else location.hash='home'};
 const pg=$('#pgal');if(!pg)return;
 const p=items.find(x=>String(x.id)===pg.dataset.id),imgs=(p&&p.photos)||[],img=$('#pgImg'),cnt=$('#pgCnt');if(imgs.length<2)return;
 let i=0,x0=null;
 const go=n=>{i=(n+imgs.length)%imgs.length;img.classList.add('sw');setTimeout(()=>{img.src=imgs[i];img.classList.remove('sw')},170);
  $$('.pth',pg).forEach((b,k)=>b.classList.toggle('on',k==i));cnt.textContent=`${i+1} / ${imgs.length}`;
  const on=$('.pth.on',pg);if(on)on.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'})};
 pg.addEventListener('click',e=>{const t=e.target.closest('.pth');if(t)return go(+t.dataset.i);const a=e.target.closest('[data-pg]');if(a)go(i+(+a.dataset.pg))});
 const pm=$('.pmain',pg);pm.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
 pm.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>40)go(i+(dx<0?1:-1))})}
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.matches&&e.target.matches('.card[data-id]')&&!e.target.closest('.cact'))location.hash='product:'+e.target.dataset.id});

/* ---------- photos ---------- */
const rd=f=>new Promise(r=>{const x=new FileReader();x.onload=()=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas'),s=Math.min(1,500/i.width);c.width=i.width*s;c.height=i.height*s;c.getContext('2d').drawImage(i,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',.7))};i.onerror=()=>r(null);i.src=x.result};x.readAsDataURL(f)});
function drawPrev(){const p=$('#prev');if(!p)return;
 p.innerHTML=ph.map((s,i)=>`<div class="ph"><img src="${s}">${i==0?'<span class="cover">მთავარი</span>':''}<button type="button" class="rm" data-rm="${i}" aria-label="წაშლა">×</button></div>`).join('');
 const n=ph.length;$('#pbar').style.width=Math.min(100,n/3*100)+'%';$('#pcnt').textContent=n>=3?`✓ ${n} ფოტო`:`${n}/3 მინიმუმ`;$('#pcount').classList.toggle('ok',n>=3);if(n>=3)clearOne($('#photoFld'))}
async function addFiles(files){files=[...files];const imgs=files.filter(f=>f.type.startsWith('image/')&&f.size<=15*1024*1024);
 if(imgs.length<files.length)toast('დაშვებულია მხოლოდ სურათები (მაქს. 15MB)');
 const room=8-ph.length;if(room<=0)return toast('მაქსიმუმ 8 ფოტო');if(imgs.length>room)toast('მაქსიმუმ 8 ფოტო');
 const got=(await Promise.all(imgs.slice(0,room).map(rd))).filter(Boolean);window.ph=[...ph,...got];drawPrev()}

/* ---------- payment receipt (image or PDF) ---------- */
const rdR=f=>new Promise(r=>{const x=new FileReader();x.onload=()=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas'),k=Math.min(1,1100/i.width);c.width=i.width*k;c.height=i.height*k;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(i,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',.8))};i.onerror=()=>r(null);i.src=x.result};x.onerror=()=>r(null);x.readAsDataURL(f)});
async function readReceipt(f){if(!f)return;const pdf=f.type=='application/pdf';
 if(!pdf&&!f.type.startsWith('image/'))return toast('დაშვებულია მხოლოდ სურათი ან PDF');
 if(f.size>15*1024*1024)return toast('ფაილი ძალიან დიდია (მაქს. 15MB)');
 if(pdf&&f.size>1.5*1024*1024)return toast('PDF ძალიან დიდია (მაქს. 1.5MB)');
 const data=pdf?await new Promise(r=>{const x=new FileReader();x.onload=()=>r(x.result);x.onerror=()=>r(null);x.readAsDataURL(f)}):await rdR(f);
 if(!data)return toast('ფაილის წაკითხვა ვერ მოხერხდა');window.rc={name:f.name,type:pdf?'pdf':'img',data};drawRc()}
function drawRc(){const r=window.rc,P=$('#rcPrev');if(!P)return;
 P.innerHTML=r?`${r.type=='img'?`<img src="${r.data}" alt="">`:'<span class="pdfi">PDF</span>'}<span class="rcn">${esc(r.name)}</span><button type="button" class="rm2" id="rcRm" aria-label="წაშლა">×</button>`:'';
 const b=$('#rcRm');if(b)b.onclick=()=>{window.rc=null;drawRc()};if(r)clearOne($('#rcptFld'))}

/* ---------- bindings ---------- */
function bind(){initDD();bindV2();reveal();
 [['f','#fT'],['a','#aK']].forEach(([pre,sel])=>{const t=$(sel);if(t&&!t.dataset.bd){t.dataset.bd=1;t.addEventListener('change',()=>setDyn(pre,t.dataset.val,readDyn(pre),pre=='f'?readNum():{}))}});
 const g=$('#goS');if(g){g.onclick=()=>{F={t:$('#fT').dataset.val,o:$('#fTO').value.trim(),l:$('#fl').dataset.val,x:readDyn('f'),w1:+(($('#fw1')||{}).value)||0,w2:+(($('#fw2')||{}).value)||0,p1:+$('#fp1').value||0,p2:+$('#fp2').value||0};if(location.hash=='#search')route();else location.hash='search'};
  if(location.hash=='#search'){setDD($('#fT'),F.t||'');$('#fTO').value=F.o||'';setDD($('#fl'),F.l||'');const pn={};if(F.p1)pn.fp1=F.p1;if(F.p2)pn.fp2=F.p2;if(F.w1)pn.fw1=F.w1;if(F.w2)pn.fw2=F.w2;setDyn('f',F.t||'',F.x||{},pn)}}
 if($('#cMetal'))initCalc();
 $$('[data-tab]').forEach(b=>b.onclick=()=>showProfile(b.dataset.tab));
 const lo=$('#logout');if(lo)lo.onclick=confirmLogout;
 const av=$('#avIn');if(av)av.onchange=async()=>{const f=av.files[0];if(!f)return;me.avatar=await rd(f);users=users.map(u=>u.email==me.email?me:u);save('users',users);save('me',me);setLogin();toast('ფოტო განახლდა ✓');showProfile('mine')};

 /* add listing */
 const af=$('#addForm');if(af){const dr=$('#drop'),pf=$('#aF');
  pf.onchange=async()=>{await addFiles(pf.files);pf.value=''};
  ['dragenter','dragover'].forEach(ev=>dr.addEventListener(ev,e=>{e.preventDefault();dr.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>dr.addEventListener(ev,e=>{e.preventDefault();dr.classList.remove('drag')}));
  dr.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
  $('#prev').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){ph.splice(+b.dataset.rm,1);drawPrev()}};
  drawPrev();
  const PL=$('#aPlan'),PB=$('#payBox'),CK=$('#aColor'),RF=$('#aR');
      const syncPlan=()=>{const k=PL.dataset.val,pl=PLANS[k],paid=k!='REG';PB.hidden=!paid;
    $('#planInfo').innerHTML=paid?`<b>${planName(k)}</b> · ${pl.price} ₾ · ${pl.days} დღე — ბეჯი კოლექციაში და „გამორჩეული განცხადებების“ სექციაში. სტატუსი ჩაირთვება გადახდის დადასტურების შემდეგ.`:'<b>Regular</b> · უფასო · სტანდარტული განცხადება';
    if(!paid){CK.checked=false;window.rc=null;drawRc();clearOne($('#rcptFld'))}};
   const CB=$('#aColorBox'),showCB=()=>{CB.hidden=!CK.checked};PL.addEventListener('change',()=>{syncPlan();showCB()});CK.onchange=showCB;RF.onchange=async()=>{await readReceipt(RF.files[0]);RF.value=''};
   $$('[data-copy]').forEach(b=>b.onclick=async()=>{const k=BANKS.find(x=>x.id==b.dataset.copy),ok=await copyText(k.iban);toast(ok?k.name+': ანგარიშის ნომერი დაკოპირდა ✓':'დააკოპირეთ ხელით');if(ok){const l=b.querySelector('span');l.textContent='დაკოპირდა ✓';b.classList.add('ok');setTimeout(()=>{l.textContent='კოპირება';b.classList.remove('ok')},1800)}});
   syncPlan();
   af.onsubmit=e=>{e.preventDefault();const C=$('#aC'),K=$('#aK'),KO=$('#aKO'),T=$('#aT'),D=$('#aD'),W=$('#aW'),P=$('#aP'),TM=$('#aTerms');
   const t=T.value.trim(),d=D.value.trim(),w=+W.value,p=+P.value,k=K.dataset.val,L=$('#aL'),A={},dyn=fkeys(k).map(x=>{const el=$('#a_'+x),v=FD[x].t=='text'?el.value.trim():el.dataset.val;if(v)A[x]=v;return[el,v?'':(FD[x].t=='text'?'შეიყვანეთ ':'აირჩიეთ ')+FD[x].l]});
   const n=check(af,[[C,C.dataset.val?'':'აირჩიეთ კატეგორია'],[K,k?'':'აირჩიეთ ნივთის ტიპი'],[KO,k=='other'&&!KO.value.trim()?'მიუთითეთ ნივთის დასახელება':''],...dyn,[L,L.dataset.val?'':'აირჩიეთ მდებარეობა'],
    [T,!t?'შეიყვანეთ დასახელება':t.length<3?'მინიმუმ 3 სიმბოლო':''],[D,!d?'შეიყვანეთ აღწერა':d.length<10?'აღწერა ძალიან მოკლეა (მინ. 10 სიმბოლო)':''],
    [W,!(w>0)?'მიუთითეთ წონა (0-ზე მეტი)':w>10000?'წონა ძალიან დიდია':''],[P,!(p>0)?'მიუთითეთ ფასი (0-ზე მეტი)':p>100000000?'ფასი ძალიან მაღალია':''],
    [$('#photoFld'),ph.length<3?`ატვირთეთ მინიმუმ 3 ფოტო (ახლა: ${ph.length})`:''],[$('#rcptFld'),PL.dataset.val!='REG'&&!window.rc?'ატვირთეთ გადახდის ქვითარი (სავალდებულოა ფასიანი განცხადებისთვის)':''],[TM,TM.checked?'':'გასაგრძელებლად დაეთანხმეთ წესებსა და პირობებს']]);
   const S=$('#formSum');
   if(n){S.hidden=false;S.textContent=`⚠️ გამოსაქვეყნებლად შეასწორეთ ან შეავსეთ ${n} ველი`;return toast('განცხადება არ გამოქვეყნდა — შეავსეთ ყველა სავალდებულო ველი')}
   S.hidden=true;
   const pk=PL.dataset.val,pl=PLANS[pk],paid=pk!='REG',col=paid&&CK.checked,amt=pl.price+(col?COLOR.price:0),now=Date.now();
    if(paid&&!window.rc)return;
    items.push({id:now,title:t,cat:C.dataset.val,type:k,typeOther:k=='other'?KO.value.trim():'',desc:d,weight:w,gender:A.gen||'',loc:L.dataset.val,attrs:A,price:p,photos:ph,vip:'',color:false,owner:me.email,created:now,pay:paid?{plan:pl.name,days:pl.days,color:col,amount:amt,receipt:window.rc.data,receiptName:window.rc.name,receiptType:window.rc.type,status:'pending',created:now,colorHex:col?$('#aCP .cval').value:''}:null});
   save('items',items);window.ph=[];addNote(paid?`«${t}» გამოქვეყნდა. ${pl.name}-ის გადახდა მოწმდება — სტატუსი ჩაირთვება დადასტურების შემდეგ`:'განცხადება გამოქვეყნდა: '+t);if(paid)(window.ADMIN_EMAILS||[]).forEach(a=>pushNote(a,`ახალი გადახდა შესამოწმებლად: «${t}» – ${pl.name}, ${amt} ₾`));toast('განცხადება დაემატა ✓');showPub();location.hash='profile:mine'}}

 /* profile edit */
 const ef=$('#eForm');if(ef){const T=$('#eT');if(regOf(me)=='other')$('#eTO').value=me.regOther||'';
  const sync=()=>{const ind=T.dataset.val=='individual';$('#eLL').style.display=ind?'':'none';$('#eNL').firstChild.textContent=ind?'სახელი':'დასახელება'};T.onchange=sync;
  ef.onsubmit=e=>{e.preventDefault();const old=me.email,ty=T.dataset.val,ind=ty=='individual',O=$('#eTO'),N=$('#eN'),L=$('#eL'),E=$('#eE'),P=$('#eP'),W=$('#ePw'),W2=$('#ePw2'),U=$('#eU');
   const n=N.value.trim(),l=L.value.trim(),em=E.value.trim(),tel=P.value.trim(),un=U.value.trim();
   if(check(ef,[[O,ty=='other'&&!O.value.trim()?'მიუთითეთ რეგისტრაციის ტიპი':''],[N,nameMsg(n,ind?'სახელი':'დასახელება')],[L,ind?nameMsg(l,'გვარი'):''],
    [E,emailMsg(em)||(!same(em,old)&&users.some(u=>same(u.email,em))?'ეს ელ-ფოსტა დაკავებულია':'')],[P,!tel?'შეიყვანეთ ტელეფონი':!isPhone(tel)?'არასწორი ტელეფონის ნომერი':''],
    [U,!un&&!me.username?'':unameMsg(un,old)],[W,W.value?pwMsg(W.value):''],[W2,W.value&&W2.value!=W.value?'პაროლები არ ემთხვევა':'']]))return;
   (me.pass?askPass:f=>f())(()=>{Object.assign(me,{regType:ty,regOther:ty=='other'?O.value.trim():'',shop:!ind,name:n,last:ind?l:'',email:em,phone:tel,username:un});if(W.value)me.pass=W.value;
   if(em!=old){items.forEach(p=>{if(p.owner==old)p.owner=em});save('items',items);if(notes[old]){notes[em]=notes[old];delete notes[old];save('notes',notes)}}
   users=users.map(u=>u.email==old?me:u);save('users',users);save('me',me);setLogin();if(W.value)addNote('პაროლი შეიცვალა');toast('შენახულია ✓');showProfile('edit')})}}}

/* ---------- Google sign-in (ID token is verified on the backend: tryon-worker.js -> google_auth) ---------- */
const GONLY='ეს ანგარიში Google-ით არის შექმნილი — გამოიყენეთ „Continue with Google“.';
const GERR={google_not_configured:'Google-ით შესვლა ამჟამად მიუწვდომელია',email_not_verified:'თქვენი Google ელ-ფოსტა დადასტურებული არ არის',rate_limited:'ძალიან ბევრი მცდელობა, სცადეთ მოგვიანებით',network:'სერვერთან დაკავშირება ვერ მოხერხდა',server:'Google-ით შესვლა ვერ მოხერხდა. სცადეთ თავიდან.'};
const gApi=()=>String(window.AUTH_API||window.TRYON_API||'').trim();
const gPost=async b=>{const r=await fetch(gApi(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw d.error||'server';return d};
let gCfgP=null,gLibP=null,gInit=null,gBusy=false;
const gCfg=()=>gCfgP||(gCfgP=gPost({action:'auth_config'}).catch(e=>{gCfgP=null;throw e}));
const gLib=()=>gLibP||(gLibP=new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=ok;s.onerror=()=>{gLibP=null;s.remove();no('network')};document.head.append(s)}));
function gShow(msg,muted){const n=$('#gNote');if(!n){if(msg)toast(msg);return}n.textContent=msg||'';n.hidden=!msg;n.classList.toggle('mu',!!muted)}
function gMount(B){
 const wrap=document.createElement('div');wrap.className='gblock';
 wrap.innerHTML='<div class="gwrap" id="gBtn"></div><p class="gnote" id="gNote" hidden></p><div class="gsep"><span>ან</span></div>';
 const h=B.querySelector('h3');if(h)h.after(wrap);else B.prepend(wrap);
 const host=wrap.querySelector('#gBtn'),alive=()=>document.body.contains(host);
 if(!gApi()){gShow(GERR.google_not_configured,true);return}
 Promise.all([gCfg(),gLib()]).then(([c])=>{
  if(!alive())return;
  if(!c.ready||!c.clientId){gShow(GERR.google_not_configured,true);return}
  if(gInit!==c.clientId){google.accounts.id.initialize({client_id:c.clientId,callback:gCred,ux_mode:'popup',auto_select:false,itp_support:true});gInit=c.clientId}
  google.accounts.id.renderButton(host,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'rectangular',logo_alignment:'left',locale:'ka',width:Math.max(200,Math.min(400,host.clientWidth||320))})
 }).catch(e=>{if(alive())gShow(GERR[e]||GERR.network,true)})}
async function gCred(r){
 if(gBusy||!r||!r.credential)return;gBusy=true;gShow('');
 try{const d=await gPost({action:'google_auth',credential:r.credential});gSign(d.profile)}
 catch(e){gShow(GERR[e]||GERR.server)}
 finally{gBusy=false}}
/* one Google identity (sub) = one account; an existing account with the same verified email is linked, never duplicated */
function gSign(p){
 let u=users.find(x=>x.google&&x.google.sub===p.sub),how='in';
 if(!u){u=users.find(x=>same(x.email,p.email));
  if(u){if(u.google&&u.google.sub!==p.sub)return gShow('ეს ელ-ფოსტა სხვა Google ანგარიშთანაა დაკავშირებული');u.google={sub:p.sub};how='link'}
  else{u={regType:'individual',regOther:'',shop:false,name:p.given||p.name||p.email.split('@')[0],last:p.family||'',email:p.email,phone:'',username:'',google:{sub:p.sub},created:Date.now()};users.push(u);how='new'}}
 if(p.picture&&!u.avatar)u.avatar=p.picture;
 if(!u.created)u.created=Date.now();
 me=u;save('users',users);save('me',me);
 if(how=='new')addNote('მოგესალმებით mygem.ge-ზე! ანგარიში წარმატებით შეიქმნა. განცხადების დასამატებლად პროფილში მიუთითეთ ტელეფონის ნომერი.');
 toast(how=='new'?'რეგისტრაცია წარმატებულია ✓':how=='link'?'Google დაკავშირებულია თქვენს ანგარიშთან ✓':'მოგესალმებით!');
 afterAuth()}

/* ---------- header search (inline) ---------- */
const hs=$('#hs'),hsIn=$('#hsIn'),sRes=$('#sRes');
function hsRun(){const q=hsIn.value.trim().toLowerCase();if(!q){sRes.classList.remove('show');return}
 const all=items.filter(p=>[p.title,p.cat,typeName(p),p.desc,p.gender].join(' ').toLowerCase().includes(q)),r=all.slice(0,8);
 sRes.innerHTML=r.length?r.map(p=>`<div class="sr" data-id="${p.id}"><div class="st" style="${p.photos[0]?`background-image:url('${p.photos[0]}')`:''}">${p.photos[0]?'':ill(p)}</div><div class="si"><b>${esc(p.title)}</b><small>${[p.cat,typeName(p),p.gender].filter(Boolean).map(esc).join(' · ')}</small></div><span class="price" data-g="${p.price}">${fmt(p.price)}</span></div>`).join('')+(all.length>8?`<div class="empty" style="padding:10px;font-size:13px">და კიდევ ${all.length-8}... დააზუსტეთ ძებნა</div>`:''):'<div class="empty">ვერაფერი მოიძებნა 😔</div>';
 sRes.classList.add('show')}
function hsClose(){hs.classList.remove('open');hsIn.value='';sRes.classList.remove('show')}
$('#hsBtn').onclick=e=>{e.stopPropagation();if(hs.classList.contains('open'))hsClose();else{hs.classList.add('open');hsIn.focus()}};
hsIn.oninput=hsRun;hsIn.onkeydown=e=>{if(e.key=='Escape')hsClose()};

/* ---------- notifications ---------- */
const myNotes=()=>me?(notes[me.email]||[]):[];
function setBadge(){const n=myNotes().filter(x=>!x.r).length,b=$('#noteDot');b.textContent=n;b.style.display=n?'grid':'none'}
function addNote(t){if(!me)return;(notes[me.email]=notes[me.email]||[]).unshift({t,d:Date.now(),r:0});save('notes',notes);setBadge()}
$('#noteBtn').onclick=e=>{e.stopPropagation();if(!me)return openAuth('login');const P=$('#notePanel'),l=myNotes();
 P.innerHTML=`<h4>შეტყობინებები</h4>${l.length?l.slice(0,20).map(n=>`<div class="note ${n.r?'':'new'}">${esc(n.t)}<small>${new Date(n.d).toLocaleString('ka-GE')}</small></div>`).join(''):'<div class="empty">შეტყობინებები არ არის</div>'}`;
 P.classList.toggle('show');l.forEach(n=>n.r=1);save('notes',notes);setBadge()};

/* ---------- global clicks ---------- */
document.addEventListener('click',e=>{
 const cl=e.target.closest('a[href="#calculator"]'),ch=$('#calcHome');if(cl&&ch&&(!location.hash||location.hash=='#home')){e.preventDefault();ch.scrollIntoView({behavior:REDUCE?'auto':'smooth',block:'start'})}
 const cd=e.target.closest('.card[data-id]');if(cd&&!e.target.closest('[data-fav],[data-cshare],[data-cs]'))location.hash='product:'+cd.dataset.id;
 const so=e.target.closest('.sr[data-id]');if(so){const id=so.dataset.id;hsClose();location.hash='product:'+id}
 const pf=e.target.closest('[data-pfav]');if(pf){if(!me)openAuth('login');else{const id=+pf.dataset.pfav;favs=favs.includes(id)?favs.filter(x=>x!=id):[...favs,id];save('favs',favs);setFavCnt();const on=favs.includes(id);pf.classList.toggle('on',on);pf.setAttribute('aria-pressed',on);const lb=on?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება';pf.setAttribute('aria-label',lb);pf.title=lb}}
 const rcb=e.target.closest('[data-rcpt]');if(rcb)openReceipt(rcb.dataset.rcpt);
 const pok=e.target.closest('[data-payok]');if(pok)payDecide(pok.dataset.payok,true);
 const pno=e.target.closest('[data-payno]');if(pno)payDecide(pno.dataset.payno,false);
 const sh=e.target.closest('[data-share]');if(sh)shareP(sh.dataset.share);
 const mg=e.target.closest('[data-msg]');if(mg)openMsg(mg.dataset.msg);
 if(!e.target.closest('#notePanel,#noteBtn'))$('#notePanel').classList.remove('show');
 if(!e.target.closest('#hs,#sRes')){sRes.classList.remove('show');if(!hsIn.value)hs.classList.remove('open')}
 if(e.target.closest('[data-reset]'))F={};
 if(e.target.closest('[data-terms]')){e.preventDefault();openTerms()}
 const ey=e.target.closest('[data-eye]');
 if(ey){const i=ey.parentElement.querySelector('input'),show=i.type=='password';i.type=show?'text':'password';ey.classList.toggle('on',show)}
 const f=e.target.closest('[data-fav]');
 if(f){e.stopPropagation();if(!me)return openAuth('login');const id=+f.dataset.fav;favs=favs.includes(id)?favs.filter(x=>x!=id):[...favs,id];save('favs',favs);setFavCnt();const on=favs.includes(id);
  $$(`[data-fav="${id}"]`).forEach(b=>{b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',on?'ფავორიტებიდან ამოღება':'ფავორიტებში დამატება')});
  if(!on&&location.hash=='#favs'){const cd2=f.closest('.card');if(cd2){cd2.remove();if(!$('#app .card')){const pg=$('#app .page');if(pg)pg.insertAdjacentHTML('beforeend','<div class="empty">ფავორიტები ცარიელია</div>')}}}}
 const cshr=e.target.closest('[data-cshare]');
 if(cshr){e.stopPropagation();shareP(cshr.dataset.cshare)}
 const cs=e.target.closest('[data-cs]');if(cs){e.stopPropagation();toggleCur(+cs.dataset.cs)}});

/* ---------- auth ---------- */
function setFavCnt(){const n=me?favs.length:0,b=$('#favDot');b.textContent=n>99?'99+':n;b.style.display=n?'grid':'none'}
function setLogin(){setFavCnt();$('#loginBtn').innerHTML=me&&me.avatar?`<img src="${me.avatar}">`:me?esc((me.name[0]||'U').toUpperCase()):ui('user');setBadge()}
$('#loginBtn').onclick=()=>me?location.hash='profile:mine':openAuth('login');
const modal=$('#modal'),AO={login:0,forgot:1,reg:2};let curAuth=null,busy=false;
function closeModal(){modal.classList.remove('show');curAuth=null}
modal.onclick=e=>{if(e.target==modal)closeModal()};
function afterAuth(){closeModal();setLogin();if(/^#(add|favs|profile)/.test(location.hash))route()}
function openTerms(){curAuth=null;modal.classList.add('show');$('#modalBody').innerHTML=`<h3>წესები და პირობები</h3><p>1. განცხადებაში მითითებული ინფორმაცია და ფოტოები უნდა შეესაბამებოდეს რეალობას.</p><p>2. აკრძალულია ყალბი ან უკანონოდ მოპოვებული ნივთების გამოქვეყნება.</p><p>3. mygem.ge არ არის გარიგების მხარე და არ აგებს პასუხს მყიდველსა და გამყიდველს შორის შეთანხმებაზე.</p><p>4. ადმინისტრაციას უფლება აქვს წესების დარღვევისას წაშალოს განცხადება.</p><button class="btn" onclick="closeModal()">დახურვა</button>`}
function askPass(cb){curAuth=null;modal.classList.add('show');
 $('#modalBody').innerHTML=`<h3>დაადასტურეთ პაროლი</h3><p>ცვლილებების შესანახად შეიყვანეთ თქვენი მიმდინარე პაროლი.</p><form class="form" id="pwForm" novalidate>${pw('cpw','მიმდინარე პაროლი')}<button class="btn" type="submit">დადასტურება</button><button type="button" class="link" id="cpwNo">გაუქმება</button></form>`;
 $('#cpw').focus();$('#cpwNo').onclick=closeModal;
 $('#pwForm').onsubmit=e=>{e.preventDefault();const P=$('#cpw');
  if(check(e.target,[[P,!P.value?'შეიყვანეთ პაროლი':P.value!==me.pass?'პაროლი არასწორია':'']]))return;
  closeModal();cb()}}
function showPub(){$$('.pubpop').forEach(x=>x.remove());const o=document.createElement('div');o.className='pubpop';
 o.innerHTML=`<div class="pubbox"><div class="publogo"><img src="mygem.jpg" alt="" width="44" height="44"><b>mygem<i>.ge</i></b></div><h3>წარმატებით გამოქვეყნდა!</h3><button type="button" class="btn">OK</button></div>`;
 document.body.append(o);let t=0;const close=()=>{clearTimeout(t);o.remove()};
 o.querySelector('.btn').onclick=close;t=setTimeout(close,5000)}
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
  $('#authForm').onsubmit=e=>{e.preventDefault();const fm=e.target,E=$('#lE'),P=$('#lP'),em=E.value.trim();
   if(check(fm,[[E,loginMsg(em)],[P,P.value?'':'შეიყვანეთ პაროლი']]))return;
   const u=users.find(u=>(same(u.email,em)||(u.username&&same(u.username,em)))&&u.pass&&u.pass==P.value);if(!u){const g=users.find(x=>(same(x.email,em)||(x.username&&same(x.username,em)))&&x.google&&!x.pass);err(P,g?GONLY:'ელ-ფოსტა/მომხმარებლის სახელი ან პაროლი არასწორია');return}
   me=u;if(!me.created)me.created=Date.now();save('users',users);save('me',me);toast('მოგესალმებით!');afterAuth()}}
 else if(m=='forgot'){B.innerHTML=`<h3>პაროლის აღდგენა</h3><form class="form" id="authForm" novalidate><label>ელ-ფოსტა<input id="fE" type="email" autocomplete="email"></label>${pw('fP','ახალი პაროლი','new-password')}${pw('fP2','გაიმეორეთ პაროლი','new-password')}<button class="btn" type="submit">პაროლის შეცვლა</button></form><button type="button" class="link" id="toLog">უკან, შესვლაზე</button>`;
  $('#toLog').onclick=()=>openAuth('login');
  $('#authForm').onsubmit=e=>{e.preventDefault();const fm=e.target,E=$('#fE'),P=$('#fP'),P2=$('#fP2'),em=E.value.trim(),u=users.find(u=>same(u.email,em));
   if(check(fm,[[E,emailMsg(em)||(u?(u.google&&!u.pass?GONLY:''):'ასეთი ელ-ფოსტა ვერ მოიძებნა')],[P,pwMsg(P.value)],[P2,!P2.value?'გაიმეორეთ პაროლი':P2.value!=P.value?'პაროლები არ ემთხვევა':'']]))return;
   u.pass=P.value;save('users',users);toast('პაროლი შეიცვალა ✓');openAuth('login')}}
 else{B.innerHTML=`<h3>რეგისტრაცია</h3><form class="form" id="authForm" novalidate>${fld('რეგისტრაციის ტიპი',dd('rT',{list:DD.reg,val:'individual',other:1,otherPh:'მიუთითეთ როგორ გსურთ რეგისტრაცია'}))}<label id="rNL">სახელი<input id="rN" autocomplete="given-name"></label><label id="rLL">გვარი<input id="rL" autocomplete="family-name"></label><label>ელ-ფოსტა<input id="rE" type="email" autocomplete="email"></label><label>მომხმარებლის სახელი<input id="rU" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false"></label><label>ტელეფონი<input id="rP" type="tel" autocomplete="tel"></label>${pw('rW','პაროლი','new-password')}${pw('rW2','გაიმეორეთ პაროლი','new-password')}<button class="btn" type="submit">რეგისტრაცია</button></form><button type="button" class="link" id="toLog">უკვე გაქვთ ანგარიში? შესვლა</button>`;
  initDD(B);const rt=$('#rT');
  const sync=()=>{const ind=rt.dataset.val=='individual';$('#rLL').style.display=ind?'':'none';$('#rNL').firstChild.textContent=ind?'სახელი':'დასახელება'};rt.onchange=sync;
  $('#toLog').onclick=()=>openAuth('login');
  $('#authForm').onsubmit=e=>{e.preventDefault();const fm=e.target,ty=rt.dataset.val,ind=ty=='individual',O=$('#rTO'),N=$('#rN'),L=$('#rL'),E=$('#rE'),U=$('#rU'),P=$('#rP'),W=$('#rW'),W2=$('#rW2');
   const n=N.value.trim(),l=L.value.trim(),em=E.value.trim().toLowerCase(),un=U.value.trim(),tel=P.value.trim();
   if(check(fm,[[O,ty=='other'&&!O.value.trim()?'მიუთითეთ რეგისტრაციის ტიპი':''],[N,nameMsg(n,ind?'სახელი':'დასახელება')],[L,ind?nameMsg(l,'გვარი'):''],
    [E,emailMsg(em)||(users.some(x=>same(x.email,em))?'ეს ელ-ფოსტა დაკავებულია':'')],[U,unameMsg(un)],[P,!tel?'შეიყვანეთ ტელეფონი':!isPhone(tel)?'არასწორი ტელეფონის ნომერი':''],[W,pwMsg(W.value)],[W2,!W2.value?'გაიმეორეთ პაროლი':W2.value!=W.value?'პაროლები არ ემთხვევა':'']]))return;
   const u={regType:ty,regOther:ty=='other'?O.value.trim():'',shop:!ind,name:n,last:ind?l:'',email:em,phone:tel,username:un,pass:W.value,created:Date.now()};
   users.push(u);save('users',users);me=u;save('me',me);addNote('მოგესალმებით mygem.ge-ზე! ანგარიში წარმატებით შეიქმნა.');toast('რეგისტრაცია წარმატებულია ✓');afterAuth()}}
 initDD(B);if(m=='login'||m=='reg')gMount(B)}

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
setLogin();window.addEventListener('hashchange',route);loadDemoPhotos().then(route);loadRate();
setInterval(()=>{if(sweep()&&!/^#(add|profile:edit)/.test(location.hash))route()},60000);