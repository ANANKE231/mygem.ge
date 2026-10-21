/* mygem.ge — floating help widget (bottom-right): call request + feedback.
   Data is emailed via FormSubmit (https://formsubmit.co). FIRST USE: submit one test message,
   then open the activation email FormSubmit sends to MAIL and click "Activate". */
(()=>{
const MAIL=window.CONTACT_EMAIL||'mygem@gmail.com';   // <- change here if needed
const $=(s,r=document)=>r.querySelector(s);
const css=`
.fw{position:fixed;right:18px;bottom:18px;z-index:140;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.fw-items{display:flex;flex-direction:column;align-items:flex-end;gap:10px;pointer-events:none}
.fw.open .fw-items{pointer-events:auto}
.fw-it{display:flex;align-items:center;gap:10px;opacity:0;transform:translateY(10px) scale(.96);transition:opacity .2s,transform .25s cubic-bezier(.2,.8,.2,1)}
.fw.open .fw-it{opacity:1;transform:none}
.fw.open .fw-it:nth-child(1){transition-delay:.06s}.fw.open .fw-it:nth-child(2){transition-delay:.03s}
.fw-lb{background:#fff;color:#1A1C1F;border:1px solid #E3E4E6;border-radius:999px;padding:9px 16px;font-size:14px;font-weight:500;box-shadow:0 4px 14px rgba(17,24,39,.12);cursor:pointer;white-space:nowrap}
.fw-b{width:46px;height:46px;border-radius:50%;border:0;background:#000080;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,128,.35);transition:background .2s,transform .15s}
.fw-b:hover{background:#1A1AA3}.fw-b:active{transform:scale(.94)}
.fw-b svg{width:22px;height:22px}
.fw-main{width:54px;height:54px}
.fw-main .x{display:none}.fw.open .fw-main .o{display:none}.fw.open .fw-main .x{display:block}
.fw-b:focus-visible,.fw-lb:focus-visible{outline:3px solid rgba(0,0,128,.35);outline-offset:2px}
.fw-stars{display:flex;gap:6px;justify-content:center;margin:4px 0 6px}
.fw-stars button{background:none;border:0;cursor:pointer;font-size:34px;line-height:1;color:#D3D5DA;padding:0 2px;transition:color .15s,transform .15s}
.fw-stars button.on{color:#F5B301}.fw-stars button:hover{transform:scale(1.12)}
.fw-ta{width:100%;min-height:96px;padding:12px 14px;border:1px solid #E3E4E6;border-radius:10px;font:inherit;font-size:15px;resize:vertical;outline:0}
.fw-ta:focus{border-color:#000080;box-shadow:0 0 0 3px rgba(0,0,128,.15)}
@media(max-width:560px){.fw{right:12px;bottom:12px}}
@media(prefers-reduced-motion:reduce){.fw-it,.fw-b{transition:none}}`;
const st=document.createElement('style');st.textContent=css;document.head.append(st);

const I={phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
 chat:'<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>'};
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const w=document.createElement('div');w.className='fw';
w.innerHTML=`<div class="fw-items">
<div class="fw-it"><button type="button" class="fw-lb" data-a="call">ზარის მოთხოვნა</button><button type="button" class="fw-b" data-a="call" aria-label="ზარის მოთხოვნა">${svg(I.phone)}</button></div>
<div class="fw-it"><button type="button" class="fw-lb" data-a="fb">შეფასება / გვირჩიეთ</button><button type="button" class="fw-b" data-a="fb" aria-label="შეფასება">${svg(I.chat)}</button></div></div>
<button type="button" class="fw-b fw-main" aria-label="დახმარება" aria-expanded="false"><span class="o">${svg(I.chat)}</span><span class="x">${svg(I.x)}</span></button>`;
document.body.append(w);
const main=$('.fw-main',w);
main.onclick=e=>{e.stopPropagation();const o=w.classList.toggle('open');main.setAttribute('aria-expanded',o)};
document.addEventListener('click',e=>{if(!w.contains(e.target)){w.classList.remove('open');main.setAttribute('aria-expanded',false)}});

const toastF=t=>typeof toast=='function'?toast(t):alert(t);
async function send(subject,data){
 const r=await fetch('https://formsubmit.co/ajax/'+encodeURIComponent(MAIL),{method:'POST',
  headers:{'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({_subject:'mygem.ge — '+subject,_template:'table',_captcha:'false',...data,გვერდი:location.href})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||j.success==='false')throw 0}
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function panel(html,onSubmit){
 const m=$('#modal'),B=$('#modalBody');if(!m||!B)return;
 m.classList.add('show');B.innerHTML=html;
 const f=B.querySelector('form'),close=()=>{if(typeof closeModal=='function')closeModal();else m.classList.remove('show')};
 const no=B.querySelector('[data-no]');if(no)no.onclick=close;
 f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector('button[type=submit]'),t=b.textContent;
  const ok=onSubmit(f);if(!ok)return;
  b.disabled=true;b.textContent='იგზავნება…';
  try{await send(ok.subject,ok.data);close();toastF('გაგზავნილია, მადლობა! ✓')}
  catch{b.disabled=false;b.textContent=t;toastF('გაგზავნა ვერ მოხერხდა, სცადეთ თავიდან')}}}
const fe=(el,msg)=>{let e=el.parentElement.querySelector('.fe');if(!e){e=document.createElement('em');e.className='fe';el.parentElement.append(e)}e.textContent=msg;el.focus()};
const clr=f=>f.querySelectorAll('.fe').forEach(x=>x.remove());

function callForm(){
 const u=(typeof me!='undefined'&&me)||{};
 panel(`<h3>ზარის მოთხოვნა</h3><p>დატოვეთ ნომერი და დაგიკავშირდებით.</p>
 <form class="form" novalidate>
 <label>სახელი<input id="fwN" maxlength="60" value="${E(u.name||'')}" autocomplete="name"></label>
 <label>ტელეფონი<input id="fwP" type="tel" maxlength="20" value="${E(u.phone||'')}" autocomplete="tel" placeholder="5XX XXX XXX"></label>
 <label>სასურველი დრო (არასავალდებულო)<input id="fwT" maxlength="60" placeholder="მაგ: 18:00-ის შემდეგ"></label>
 <label>შეტყობინება (არასავალდებულო)<textarea id="fwM" rows="3" maxlength="500"></textarea></label>
 <button class="btn" type="submit">გაგზავნა</button><button type="button" class="link" data-no>გაუქმება</button></form>`,f=>{
  clr(f);const n=$('#fwN').value.trim(),p=$('#fwP').value.trim(),d=p.replace(/\D/g,'');
  if(n.length<2){fe($('#fwN'),'შეიყვანეთ სახელი');return}
  if(!/^\+?[0-9\s-]+$/.test(p)||d.length<9||d.length>15){fe($('#fwP'),'არასწორი ტელეფონის ნომერი');return}
  return{subject:'ზარის მოთხოვნა',data:{სახელი:n,ტელეფონი:p,დრო:$('#fwT').value.trim()||'—',შეტყობინება:$('#fwM').value.trim()||'—'}}})}

function fbForm(){
 let rate=0;
 panel(`<h3>შეფასება</h3><p>როგორ გიყვართ mygem.ge? რას შეცვლიდით ჩვენს საიტზე?</p>
 <form class="form" novalidate>
 <div class="fw-stars" role="radiogroup" aria-label="შეფასება">${[1,2,3,4,5].map(i=>`<button type="button" data-s="${i}" aria-label="${i} ვარსკვლავი">★</button>`).join('')}</div>
 <label>რას შეცვლიდით / რა გვაკლია?<textarea class="fw-ta" id="fwF" maxlength="1000"></textarea></label>
 <label>თქვენი ელ-ფოსტა ან ტელეფონი (არასავალდებულო)<input id="fwC" maxlength="80"></label>
 <button class="btn" type="submit">გაგზავნა</button><button type="button" class="link" data-no>გაუქმება</button></form>`,f=>{
  clr(f);if(!rate){fe($('.fw-stars'),'აირჩიეთ შეფასება');return}
  return{subject:`შეფასება ${rate}/5`,data:{შეფასება:rate+' / 5',კომენტარი:$('#fwF').value.trim()||'—',კონტაქტი:$('#fwC').value.trim()||'—'}}});
 const S=document.querySelectorAll('.fw-stars button');
 S.forEach(b=>b.onclick=()=>{rate=+b.dataset.s;S.forEach(x=>x.classList.toggle('on',+x.dataset.s<=rate));const e=$('.fw-stars').parentElement.querySelector('.fe');if(e)e.remove()})}

w.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(!a)return;w.classList.remove('open');main.setAttribute('aria-expanded',false);a.dataset.a=='call'?callForm():fbForm()});
})();