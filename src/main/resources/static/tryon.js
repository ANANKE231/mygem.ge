/* =====================================================================
   mygem.ge — AI try-on (frontend). Opens from a listing's product page
   ("AI აირჩიე და მოირგე") for that one listing. Backend: tryon-worker.js
   (window.TRYON_API in index.html). Loaded BEFORE script.js; uses its globals
   (items, esc, $, $$, toast, GEM) only at call time.
   ===================================================================== */
const TRY_LABEL='AI აირჩიე და მოირგე';
const TRY={item:null,pi:0,photo:null,pname:'',res:null,view:'res',busy:false,err:'',svc:'check',ctrl:null,cancelled:false,timer:0,step:0,dlg:null,esc:null};
const TRY_MSGS=['ფოტოს ანალიზი…','სამკაულის მორგება…','განათებისა და ჩრდილების დახვეწა…','თითქმის მზადაა…'];
const tsvg=p=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const TI={
 spark:tsvg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>'),
 up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/></svg>',
 dl:tsvg('<path d="M12 4v11M7 11l5 5 5-5"/><path d="M4 19h16"/>'),
 full:tsvg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
 redo:tsvg('<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>'),
 warn:tsvg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>')};
const TRY_ICON=TI.spark;

/* ---------- helpers ---------- */
const tryLoad=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('img'));i.src=src});
const tryRead=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(f)});
async function tryShrink(src,max,q){const i=await tryLoad(src),s=Math.min(1,max/Math.max(i.naturalWidth,i.naturalHeight)),c=document.createElement('canvas');
 c.width=Math.max(1,Math.round(i.naturalWidth*s));c.height=Math.max(1,Math.round(i.naturalHeight*s));
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(i,0,0,c.width,c.height);return c.toDataURL('image/jpeg',q)}
const tryHasPhoto=p=>!!(p&&p.photos&&p.photos[0]);
const tryApiUrl=()=>String(window.TRYON_API||'').replace(/\/+$/,'');
function tryJewel(){const p=TRY.item;return tryHasPhoto(p)?{img:p.photos[TRY.pi]||p.photos[0],kind:p.type&&p.type!='other'?p.type:'auto',label:p.title}:null}
function tryMsg(e){return({
 not_configured:'AI სერვისი დაკავშირებული არ არის.',
 network:'სერვერთან კავშირი ვერ მოხერხდა. შეამოწმეთ ინტერნეტი და სცადეთ თავიდან.',
 rate_limited:'ძალიან ბევრი მოთხოვნაა. სცადეთ ერთ წუთში.',
 forbidden:'ამ საიტს AI სერვისთან წვდომა არ აქვს.',
 too_large:'ფოტო ძალიან დიდია.',
 unsupported_image:'ეს ფორმატი არ არის მხარდაჭერილი (გამოიყენეთ JPG, PNG ან WEBP).',
 model_unavailable:'AI მოდელი დროებით მიუწვდომელია. სცადეთ მოგვიანებით.',
 ai_auth:'AI სერვისის გასაღები/ბილინგი არასწორადაა მორგებული (ადმინისტრატორისთვის).',
 no_result:'AI-მ ამ ფოტოზე შედეგი ვერ შექმნა. სცადეთ სხვა ფოტო (სადაც სამკაულის ადგილი ჩანს).'}[e&&e.code])||'დაფიქსირდა შეცდომა. სცადეთ თავიდან.'}
async function tryApi(body,signal){
 const api=tryApiUrl();
 if(!api){const e=new Error('not_configured');e.code='not_configured';throw e}
 let r;try{r=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal})}
 catch(x){if(x.name=='AbortError')throw x;const e=new Error('network');e.code='network';throw e}
 let d=null;try{d=await r.json()}catch{}
 if(!r.ok||!d||d.error){const e=new Error((d&&d.message)||'server');e.code=(d&&d.error)||'server';throw e}
 return d}

/* ---------- dialog ---------- */
function tryOpen(id){
 const p=items.find(x=>String(x.id)===String(id));if(!p)return;tryClose();
 if(!TRY.item||String(TRY.item.id)!==String(p.id)){TRY.res=null;TRY.err='';TRY.pi=0}
 TRY.item=p;TRY.view='res';
 const d=document.createElement('div');d.className='try-dlg';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label',TRY_LABEL);
 d.innerHTML=`<div class="try-box"><button type="button" class="try-close" data-tclose aria-label="დახურვა">×</button><div class="tryon">
  <div class="try-head"><span class="tico">${TI.spark}</span><div><h2>${TRY_LABEL} <span class="try-badge">BETA</span></h2><p>ატვირთეთ თქვენი ფოტო და ნახეთ, როგორ მოგიხდებათ ეს სამკაული.</p></div></div>
  <div class="try-grid"><div class="try-ctl">
   <div class="try-step"><div class="try-st"><i>1</i>სამკაული</div><div id="tryJewel"></div></div>
   <div class="try-step"><div class="try-st"><i>2</i>თქვენი ფოტო<small>ატვირთვა</small></div><div id="tryPhoto"></div></div>
   <div id="tryGo"></div></div>
  <div class="try-stage" id="tryStage"></div></div>
  <input type="file" id="tryFile" accept="image/*" hidden></div></div>`;
 document.body.append(d);document.body.style.overflow='hidden';TRY.dlg=d;
 const f=$('#tryFile');f.onchange=()=>{if(f.files[0])trySetPhoto(f.files[0]);f.value=''};
 d.addEventListener('click',e=>{const t=s=>e.target.closest(s);let b;
  if(e.target===d||t('[data-tclose]'))tryClose();
  else if(b=t('[data-pi]')){TRY.pi=+b.dataset.pi;TRY.res=null;TRY.err='';tryPaint()}
  else if(t('[data-trm]')){TRY.photo=null;TRY.pname='';TRY.res=null;TRY.err='';tryPaint()}
  else if(t('[data-tgo]')||t('[data-tredo]'))tryRun();
  else if(t('[data-tcancel]')){TRY.cancelled=true;if(TRY.ctrl)TRY.ctrl.abort()}
  else if(b=t('[data-tview]')){TRY.view=b.dataset.tview;$$('.try-tog button',d).forEach(x=>x.classList.toggle('on',x===b));
   const o=$('.try-view .orig',d),r=$('.try-view .out',d);if(o)o.classList.toggle('show',TRY.view=='orig');if(r)r.classList.toggle('show',TRY.view=='res')}
  else if(t('[data-tfull]'))tryFull()});
 d.addEventListener('dragover',e=>{const z=e.target.closest('.try-drop');if(z){e.preventDefault();z.classList.add('drag')}});
 d.addEventListener('dragleave',e=>{const z=e.target.closest('.try-drop');if(z)z.classList.remove('drag')});
 d.addEventListener('drop',e=>{const z=e.target.closest('.try-drop');if(!z)return;e.preventDefault();z.classList.remove('drag');if(e.dataTransfer.files[0])trySetPhoto(e.dataTransfer.files[0])});
 TRY.esc=e=>{if(e.key=='Escape'&&!$('.try-lb'))tryClose()};document.addEventListener('keydown',TRY.esc);
 tryPaint();tryCheck()}
function tryClose(){if(!TRY.dlg)return;if(TRY.busy){TRY.cancelled=true;if(TRY.ctrl)TRY.ctrl.abort()}
 TRY.dlg.remove();TRY.dlg=null;document.body.style.overflow='';document.removeEventListener('keydown',TRY.esc)}
/* honest service check: only "ready" when the backend answers AND has its AI key */
async function tryCheck(){TRY.svc='check';tryPaintGo();
 if(!tryApiUrl()){TRY.svc='down';tryPaintGo();return}
 const dlg=TRY.dlg;
 try{const d=await tryApi({action:'ping'});TRY.svc=d.ready?'ready':'down'}catch{TRY.svc='down'}
 if(TRY.dlg===dlg){tryPaintGo()}}

/* ---------- painting ---------- */
function tryPaint(){tryPaintJewel();tryPaintPhoto();tryPaintGo();tryPaintStage()}
function tryPaintJewel(){const el=$('#tryJewel');if(!el)return;const p=TRY.item,ph=(p.photos||[]);
 const sub=[p.cat,typeName(p),p.weight?p.weight+' გრ':''].filter(Boolean).map(esc).join(' · ');
 const pic=ph[TRY.pi]||ph[0]||'';const picOk=!!pic&&!/["'<>\\\s]/.test(pic)&&(/^(data:image\/(png|jpeg|webp|gif);|\/images\/)/.test(pic)||pic.startsWith('https://'));
 el.innerHTML=`<div class="try-item"><span class="th" style="${picOk?`background-image:url('${pic}')`:''}">${ph[0]?'':esc(p.emoji||'💍')}</span><div><b>${esc(p.title)}</b><small>${sub}</small></div></div>`
  +(ph.length>1?`<div class="try-picks">${ph.map((s,i)=>`<button type="button" class="try-pick${i==TRY.pi?' on':''}" data-pi="${i}" aria-label="ფოტო ${i+1}"><span class="pt" style="background-image:url('${s}')"></span></button>`).join('')}</div>`:'')
  +(ph[0]?'':`<div class="try-lp err">${TI.warn}<span>ამ განცხადებას ფოტო არ აქვს, ამიტომ მოზომვა შეუძლებელია.</span></div>`)}
function tryPaintPhoto(){const el=$('#tryPhoto');if(!el)return;
 el.innerHTML=TRY.photo
  ?`<div class="try-photo"><img src="${TRY.photo}" alt=""><div><b>${esc(TRY.pname||'თქვენი ფოტო')}</b><small>✓ მზადაა</small></div><label class="btn alt sm" for="tryFile">შეცვლა</label><button type="button" class="try-x" data-trm aria-label="წაშლა">×</button></div>`
  :`<label class="drop try-drop" for="tryFile"><span class="up">${TI.up}</span><b>ატვირთეთ თქვენი ფოტო</b><small>გადმოათრიეთ აქ ან <u>აირჩიეთ ფაილი</u></small><small>JPG, PNG, WEBP · კარგად განათებული, სამკაულის ადგილი (ხელი, კისერი, ყური) ჩანდეს</small></label>`}
function tryPaintGo(){const el=$('#tryGo');if(!el)return;const j=tryJewel(),ok=TRY.photo&&j&&!TRY.busy&&TRY.svc=='ready';
 let note;
 if(TRY.svc=='check')note='<div class="try-lp"><span class="try-spin"></span><span>AI სერვისის შემოწმება…</span></div>';
 else if(TRY.svc=='down')note=`<div class="try-lp err">${TI.warn}<span>AI სერვისი ამჟამად დაკავშირებული არ არის, ამიტომ მოზომვა მიუწვდომელია.</span></div>`;
 else note=`<p class="try-hint">${!TRY.photo?'ჯერ ატვირთეთ თქვენი ფოტო':'ფოტო მხოლოდ დასამუშავებლად იგზავნება და საიტზე არ ინახება.'}</p>`;
 el.innerHTML=`<button type="button" class="btn try-go" data-tgo ${ok?'':'disabled'}>${TI.spark}${TRY.busy?'მუშავდება…':'მოზომვა'}</button>${note}`}
function tryPaintStage(){const el=$('#tryStage');if(!el)return;const j=tryJewel();let v,after='';
 if(TRY.res){
  v=`<img class="orig${TRY.view=='orig'?' show':''}" src="${TRY.photo}" alt="ორიგინალი"><img class="out${TRY.view=='res'?' show':''}" src="${TRY.res}" alt="მოზომვის შედეგი"><div class="try-tog"><button type="button" data-tview="res" class="${TRY.view=='res'?'on':''}">შედეგი</button><button type="button" data-tview="orig" class="${TRY.view=='orig'?'on':''}">ორიგინალი</button></div>`;
  const ext=(/^data:image\/(\w+)/.exec(TRY.res)||[])[1]||'png';
  after=`<div class="try-acts"><a class="btn sm" href="${TRY.res}" download="mygem-tryon.${ext=='jpeg'?'jpg':ext}">${TI.dl}ჩამოტვირთვა</a><button type="button" class="btn alt sm" data-tfull>${TI.full}გადიდება</button><button type="button" class="btn alt sm" data-tredo>${TI.redo}თავიდან</button></div><p class="try-note">AI-ით შექმნილი გამოსახულება მიახლოებითია — სამკაულის ზომა და დეტალები შეიძლება რეალობისგან განსხვავდებოდეს.</p>`}
 else if(TRY.photo)v=`<img class="show" src="${TRY.photo}" alt="">${j&&!TRY.busy?`<span class="try-selchip"><i style="background-image:url('${j.img}')"></i>${esc(j.label)}</span>`:''}`;
 else v=`<div class="try-empty"><img src="/images/Mygem%20ge.jpg" alt=""><b>აქ გამოჩნდება შედეგი</b><span>ატვირთეთ თქვენი ფოტო</span></div>`;
 if(TRY.busy)v+=`<div class="try-scan"></div><span class="try-sp s1">✦</span><span class="try-sp s2">✦</span><span class="try-sp s3">✦</span><div class="try-load"><div class="try-lcard"><span class="try-gem">${GEM}</span><div><b id="tryMsg" class="sw">${TRY_MSGS[TRY.step]}</b><small>ჩვეულებრივ 10–30 წამი</small></div><button type="button" class="linkbtn" data-tcancel>გაუქმება</button></div></div>`;
 if(TRY.err&&!TRY.busy)after=`<div class="try-lp err">${TI.warn}<span>${esc(TRY.err)}</span></div>`;
 el.innerHTML=`<div class="try-view${TRY.busy?' busy':''}">${v}</div>${after}`}

/* ---------- actions ---------- */
async function trySetPhoto(f){
 if(!f.type.startsWith('image/')||f.size>15*1024*1024)return toast('დაშვებულია მხოლოდ სურათები (მაქს. 15MB)');
 try{TRY.photo=await tryShrink(await tryRead(f),1280,.9);TRY.pname=f.name;TRY.res=null;TRY.err='';tryPaint()}
 catch{toast('ფოტოს წაკითხვა ვერ მოხერხდა')}}
function tryTicker(on){clearInterval(TRY.timer);TRY.step=0;
 if(on)TRY.timer=setInterval(()=>{TRY.step=(TRY.step+1)%TRY_MSGS.length;const m=$('#tryMsg');if(m){m.classList.remove('sw');void m.offsetWidth;m.textContent=TRY_MSGS[TRY.step];m.classList.add('sw')}},3000)}
async function tryRun(){const j=tryJewel();if(!TRY.photo||!j||TRY.busy||TRY.svc!='ready')return;
 TRY.busy=true;TRY.err='';TRY.res=null;TRY.view='res';TRY.cancelled=false;TRY.ctrl=new AbortController();
 const t=setTimeout(()=>TRY.ctrl.abort(),120000);tryPaintGo();tryPaintStage();tryTicker(true);
 const st=$('#tryStage');if(st&&st.getBoundingClientRect().top>innerHeight*.7)st.scrollIntoView({behavior:'smooth',block:'center'});
 try{const d=await tryApi({action:'tryon',person:TRY.photo,jewelry:j.img,kind:j.kind},TRY.ctrl.signal);TRY.res=d.image}
 catch(e){TRY.err=e.name=='AbortError'?(TRY.cancelled?'':'დრო ამოიწურა. სცადეთ თავიდან.'):tryMsg(e)}
 clearTimeout(t);TRY.busy=false;tryTicker(false);tryPaintGo();tryPaintStage()}
function tryFull(){if(!TRY.res)return;const src=TRY.view=='orig'?TRY.photo:TRY.res;if(!src||!/^(data:image\/|blob:|https:\/\/)/.test(src))return;const d=document.createElement('div');d.className='try-lb';const img=document.createElement('img');img.alt='';img.src=src;d.append(img);
 const close=()=>{d.remove();document.removeEventListener('keydown',k)},k=e=>{if(e.key=='Escape')close()};d.onclick=close;document.addEventListener('keydown',k);document.body.append(d)}

/* product page action button */
document.addEventListener('click',e=>{const b=e.target.closest('[data-try]');if(!b)return;e.preventDefault();e.stopPropagation();tryOpen(b.dataset.try)});
/* leaving the product page (route change) closes the dialog */
window.addEventListener('hashchange',tryClose);