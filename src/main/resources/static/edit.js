/* =====================================================================
   mygem.ge — განცხადების რედაქტირება (edit.js)
   ჩართვა: index.html-ში script.js-ის შემდეგ დაამატე
       <script src="/static/edit.js"></script>
   script.js-ში არაფრის შეცვლა არ არის საჭირო.
   ===================================================================== */
(()=>{
 /* ხატულა + როუტი */
 UI.edit='<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>';
 ORDER.edit=5;

 /* ახალი ტარიფები: ფერადი გამოყოფა 0.50 ₾ · 2 დღე; სტიკერი 2 ₾ თითო (მაქს. 3) · ვადა — განცხადების ამოწურვამდე (days:0 = ცალკე ვადა არ აქვს) */
 COLOR.price=0.5;COLOR.days=2;
 STICKER.price=2;STICKER.max=3;STICKER.days=0;
 const COLOR_TXT='ფერადი გამოყოფა · +50 თეთრი · 2 დღე',STK_TXT=`სტიკერები (არასავალდებულო) · +${STICKER.price} ₾ თითოეული · მაქს. ${STICKER.max} · ვადა: განცხადების ამოწურვამდე`;
 const money2=n=>String(Math.round(n*100)/100);

 /* ადმინის პანელში „0 დღე“ → ნორმალური ტექსტი */
 const _payPanel=window.payPanel;
 window.payPanel=function(){return _payPanel.apply(this,arguments).replace(/ \(0 დღე\)/g,' (განცხადების ამოწურვამდე)')};

 /* გადახდის დადასტურება: სტიკერებს ცალკე ვადა აღარ აქვს — ისინი მოქმედებს განცხადების (პაკეტის) ამოწურვამდე */
 const _payDecide=window.payDecide;
 window.payDecide=function(id,ok){
  if(!ok||!isAdmin())return _payDecide.apply(this,arguments);
  const p=items.find(x=>String(x.id)===String(id));if(!p||!p.pay||p.pay.status!='pending')return;
  const now=Date.now(),y=p.pay;
  if(y.days>0){p.vip=y.plan;p.vipUntil=now+y.days*DAY}
  if(y.color){p.color=true;p.colorUntil=now+COLOR.days*DAY;p.colorHex=okHex(y.colorHex)?y.colorHex:BC_DEF}
  if(y.sticker){p.sticker=true;p.stickers=cleanStk(y.stickers);if(p.vip&&p.vipUntil)p.stickerUntil=p.vipUntil;else delete p.stickerUntil}
  delete p.hold;y.status='active';y.verifiedBy=me.email;y.verifiedAt=now;save('items',items);
  const parts=[];if(y.days>0)parts.push(`${y.plan} — ${fdt(p.vipUntil)}-მდე`);if(y.color)parts.push(`ფერადი გამოყოფა — ${fdt(p.colorUntil)}-მდე`);if(y.sticker)parts.push('სტიკერები — განცხადების ამოწურვამდე');
  notifyOwner(p,`«${p.title}» – გადახდა დადასტურდა. ${parts.join(' · ')}`);toast('გადახდა დადასტურდა ✓');showProfile('pay')};

 /* ტექსტების გასწორება გადახდის ბლოკში (დამატებისა და რედაქტირების ფორმაში) */
 function fixLabels(){const a=$('#payBox .addon');if(a&&a.lastChild&&a.lastChild.nodeType==3)a.lastChild.textContent=' '+COLOR_TXT;
  const sp=$('#aStkBox>span');if(sp)sp.textContent=STK_TXT}

 /* გადახდის ჯამი: მუშაობს #aPlan-ის გარეშეც (რედაქტირების ფორმაში პაკეტის არჩევა არ არის) */
 window.paySummary=function(){const box=$('#paySum'),PL=$('#aPlan');if(!box)return;
  const pl=PL?PLANS[PL.dataset.val]:PLANS[window.__editPlan||'REG'];if(!pl){box.innerHTML='';return}
  const CK=$('#aColor'),sv=$('#aSP .sval'),n=cleanStk(sv?sv.value.split(','):[]).length,rows=pl.key=='REG'?[]:[[`${planName(pl.key)} · ${pl.days} დღე`,pl.price]];
  const PB=$('#payBox'),need=pl.key!='REG'||(CK&&CK.checked)||n>0;
  if(PB)$$('.pdet',PB).forEach(e=>e.hidden=!need);
  if(!need&&window.rc){window.rc=null;drawRc();clearOne($('#rcptFld'))}
  if(CK&&CK.checked)rows.push([`ფერადი გამოყოფა · ${COLOR.days} დღე`,COLOR.price]);
  if(n)rows.push([`სტიკერები × ${n} (${STICKER.price} ₾ თითოეული) · განცხადების ამოწურვამდე`,n*STICKER.price]);
  if(!rows.length){box.innerHTML='';return}
  box.innerHTML=rows.map(r=>`<div class="psr"><span>${esc(r[0])}</span><b>${money2(r[1])} ₾</b></div>`).join('')+`<div class="psr tot"><span>სულ გადასახდელი</span><b>${money2(rows.reduce((a,r)=>a+r[1],0))} ₾</b></div>`};

 /* ---------- რედაქტირების გვერდი ---------- */
 views.edit=function(t){
  if(!me){openAuth('login');return '<div class="page"><div class="panel empty">გთხოვთ შეხვიდეთ სისტემაში</div></div>'}
  const p=items.find(x=>String(x.id)===String(t));
  if(!p||!ownerOf(p))return `<div class="page"><div class="panel empty">განცხადება ვერ მოიძებნა<div style="margin-top:16px"><a class="btn" href="#profile:mine">უკან</a></div></div></div>`;
  window.ph=[...(p.photos||[])];window.rc=null;
  window.vid=p.video?{data:p.video,name:'ვიდეო',size:Math.round(p.video.length*.75)}:null;
  window.aud=p.audio?{data:p.audio,name:'ხმოვანი აღწერა',size:Math.round(p.audio.length*.75)}:null;
  const UP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/></svg>',
   VUP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
   pend=!!(p.pay&&p.pay.status=='pending'),
   note=pend?'<p class="astep-s full">⏳ გადახდა მოწმდება — არჩევანი წინასწარ მონიშნულია. შეგიძლიათ შეცვალოთ; ახალი ქვითარი საჭიროა მხოლოდ თუ თანხა იზრდება.</p>':'',
   cur=Object.keys(PLANS).find(k=>PLANS[k].name==p.vip),
   plist=[['REG',p.vip?`ცვლილების გარეშე — ${p.vip}`:'Regular — უფასო'],...['VIP','SVIP'].filter(k=>k!=cur).map(k=>[k,planLabel(k)])],
   boost=note+fld('განცხადების ტიპი',dd('aPlan',{list:plist,val:'REG'}),'full')+'<p class="planinfo full" id="planInfo"></p>'+payBox();
   return `<div class="page addpg editpg"><button type="button" class="pback" id="pBack">${ui('back')}<span>უკან</span></button><div class="addwrap"><aside class="lpc" aria-label="Listing Preview Card"><div class="lpv" id="lpv" aria-live="polite"></div></aside><div class="panel"><h2 style="margin-bottom:16px;color:var(--pd)">განცხადების რედაქტირება</h2>
 <form class="form" id="editForm" novalidate><div class="fsum full" id="formSum" hidden></div>
 <section class="astep"><h3 class="astep-h full">ძირითადი ინფორმაცია</h3>
 ${fld('ნივთის ტიპი',dd('aK',{list:DD.type,other:1,otherPh:'ნივთის დასახელება',val:p.type||''}))}${fld('მდებარეობა',dd('aL',{list:mk(LOC),val:p.loc||''}))}<div class="dyn" id="aDyn">${fRender('a',p.type||'')}</div>
 <label>დასახელება<input id="aT" maxlength="80" value="${esc(p.title)}"></label>
 <label class="full">აღწერა<textarea id="aD" rows="3">${esc(p.desc||'')}</textarea></label>
 <div class="trio full"><label>წონა (გრ)<input id="aW" type="number" step="0.1" min="0" value="${p.weight||''}"></label><div class="fld"><span class="plab">ფასი (<b id="aPS">₾</b>)<button type="button" class="cur sm" id="aCur" role="switch" aria-checked="false" aria-label="ფასი დოლარში"><span class="cl">₾</span><span class="trk"><i></i></span><span class="cl">$</span></button></span><div class="prow2"><input id="aP" type="number" min="0" step="any"></div><label class="chk nego"><input type="checkbox" id="aNego"> ფასი შეთანხმებით</label><small class="chint" id="aPH"></small></div></div></section>
 <section class="astep"><h3 class="astep-h full">ფოტო / ვიდეო / ხმა</h3>
 <div class="fld full" id="photoFld"><span>ფოტოები (მინ. 3, მაქს. 8) — წაშალეთ ძველი და ატვირთეთ ახალი; ფოტოზე დაჭერით ის მთავარი გახდება</span><label class="drop" id="drop" for="aF"><span class="up">${UP}</span><b>ატვირთეთ ფოტოები</b><small>გადმოათრიეთ აქ ან <u>აირჩიეთ ფაილები</u></small></label><input type="file" id="aF" accept="image/*" multiple hidden><div class="pcount" id="pcount"><div class="pbar"><i id="pbar"></i></div><span id="pcnt"></span></div><div class="photos" id="prev"></div></div>
 <div class="fld full" id="videoFld"><span>ვიდეო (არასავალდებულო · მაქს. ${VID_MB}MB)</span><label class="drop" for="aV"><span class="up">${VUP}</span><b>ატვირთეთ ვიდეო</b><small>MP4, WEBM, MOV</small></label><input type="file" id="aV" accept="video/mp4,video/webm,video/quicktime" hidden><div class="vprev" id="vPrev"></div></div>
 <div class="fld full" id="audioFld"><span class="aud-h"><i>${AMIC}</i>ხმოვანი აღწერა (სურვილისამებრ)</span><div class="aud-acts"><label class="btn alt sm" for="aA">${AUP}ატვირთვა (MP3)</label><button type="button" class="btn alt sm" id="aRec">${AMIC}<span>ჩაწერა</span></button><span class="aud-tm" id="aTm" hidden>0:00 / 1:00</span></div><div class="aud-bar" aria-hidden="true"><i id="aBar"></i></div><input type="file" id="aA" accept="audio/mpeg,audio/mp3,.mp3,audio/*" hidden><div class="aprev" id="aPrev"></div><small class="bhelp">ახალი ატვირთვა ან ჩაწერა ძველს ჩაანაცვლებს (მაქს. 1 წუთი).</small></div></section>
 <section class="astep"><h3 class="astep-h full">განცხადების დაბუსტვა</h3><p class="astep-s full">VIP / Super VIP პაკეტი, ფერადი გამოყოფა (+50 თეთრი · 2 დღე), სტიკერები (+${STICKER.price} ₾ თითო · მაქს. ${STICKER.max} · განცხადების ამოწურვამდე). გადახდის ქვითარი სავალდებულოა.</p>${boost}</section>
 <div class="anav full"><a class="btn alt" href="#profile:mine">გაუქმება</a><button class="btn" type="submit" style="margin-left:auto">შენახვა</button></div>
  </form></div></div></div>`};

 /* ---------- რედაქტირების ფორმის ლოგიკა ---------- */
 function bindEdit(){const af=$('#editForm');if(!af)return;
  const [, editId] = parseHash();
const p = items.find(x => String(x.id) === String(editId));
if (!p || !ownerOf(p)) return;
  const KO=$('#aKO');if(KO)KO.value=p.typeOther||'';
  setDyn('a',p.type||'',{...(p.attrs||{}),gen:p.gender||''});
  /* ფასი */
  const U=()=>$('#aCur').classList.contains('on'),G=()=>{const v=+$('#aP').value||0;return U()?Math.round(v*RATE*100)/100:v};
  const hint=()=>{const v=+$('#aP').value||0;$('#aPH').textContent=v>0?(U()?`≈ ${gelTxt(G())} · 1 $ = ${RATE.toFixed(4)} ₾ (NBG)`:`≈ $${usdOf(v)}`):''};
  $('#aCur').onclick=()=>{const b=$('#aCur'),on=!b.classList.contains('on');b.classList.toggle('on',on);b.setAttribute('aria-checked',on);$('#aPS').textContent=on?'$':'₾';hint()};
  $('#aNego').onchange=()=>{const n=$('#aNego').checked;$('#aP').disabled=n;$('#aCur').disabled=n;if(n){$('#aP').value='';clearOne($('#aP').closest('.fld'))}hint()};
  $('#aP').addEventListener('input',hint);
  if(p.nego){$('#aNego').checked=true;$('#aP').disabled=true;$('#aCur').disabled=true}else $('#aP').value=p.price||'';
  hint();
  /* ფოტოები */
  const dr=$('#drop'),pf=$('#aF');
  pf.onchange=async()=>{await addFiles(pf.files);pf.value=''};
  ['dragenter','dragover'].forEach(ev=>dr.addEventListener(ev,e=>{e.preventDefault();dr.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>dr.addEventListener(ev,e=>{e.preventDefault();dr.classList.remove('drag')}));
  dr.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
  $('#prev').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){ph.splice(+b.dataset.rm,1);drawPrev();return}
   const im=e.target.closest('.ph img');if(im){const i=[...$$('.ph img',$('#prev'))].indexOf(im);if(i>0){ph.unshift(ph.splice(i,1)[0]);drawPrev();toast('მთავარი ფოტო შეიცვალა')}}};
  drawPrev();
  /* ვიდეო */
  const rdu=f=>new Promise(r=>{const x=new FileReader();x.onerror=x.onabort=()=>r(null);x.onload=()=>r(x.result);x.readAsDataURL(f)});
  const VP=$('#vPrev'),drawVid=()=>{const v=window.vid,src=v&&typeof v.data==='string'&&v.data.startsWith('data:video/')&&!/["'<>]/.test(v.data)?v.data:'';VP.innerHTML=src?`<div class="vp"><video src="${src}" controls preload="metadata" muted playsinline></video><div class="vpi"><b>${esc(v.name)}</b><small>${(v.size/1048576).toFixed(1)} MB</small></div><button type="button" class="rm" data-vrm aria-label="ვიდეოს წაშლა">×</button></div>`:''};
  $('#aV').onchange=async()=>{const inp=$('#aV'),f=inp.files[0];inp.value='';if(!f)return;
   if(modRequired())return toast('ვიდეოს ატვირთვა დროებით გამორთულია უსაფრთხოების მიზნით');
   if(!/^video\/(mp4|webm|quicktime)$/.test(f.type))return toast('დაშვებულია MP4, WEBM ან MOV ვიდეო');
   if(f.size>VID_MB*1048576)return toast(`ვიდეო ძალიან დიდია (მაქს. ${VID_MB}MB)`);
   const d=await rdu(f);if(!d)return toast('ვიდეოს წაკითხვა ვერ მოხერხდა');window.vid={data:d,name:f.name,size:f.size};drawVid()};
  VP.onclick=e=>{if(e.target.closest('[data-vrm]')){window.vid=null;drawVid()}};drawVid();
  /* ხმოვანი აღწერა */
  const AP=$('#aPrev'),drawAud=()=>{const a=window.aud;AP.innerHTML=a?`<div class="vp">${audPlayer(a.data)}<div class="vpi"><b>${esc(a.name)}</b><small>${(a.size/1048576).toFixed(1)} MB</small></div><button type="button" class="rm" data-arm aria-label="აუდიოს წაშლა">×</button></div>`:''};
  $('#aA').onchange=async()=>{const inp=$('#aA'),f=inp.files[0];inp.value='';if(!f)return;
   if(!/^audio\//.test(f.type)&&!/\.mp3$/i.test(f.name))return toast('დაშვებულია მხოლოდ აუდიო ფაილი (MP3)');
   if(f.size>AUD_MB*1048576)return toast(`აუდიო ძალიან დიდია (მაქს. ${AUD_MB}MB)`);
   const d=await rdu(f);if(!d)return toast('ფაილის წაკითხვა ვერ მოხერხდა');
   const len=await new Promise(r=>{const a=new Audio();a.preload='metadata';a.onloadedmetadata=()=>r(a.duration);a.onerror=()=>r(NaN);a.src=d;setTimeout(()=>r(NaN),5000)});
   if(!isFinite(len))return toast('აუდიო ფაილის წაკითხვა ვერ მოხერხდა');
   if(len>AUD_SEC+.5)return toast('ხმოვანი აღწერა უნდა იყოს მაქსიმუმ 1 წუთის');
   window.aud={data:d,name:f.name,size:f.size};drawAud()};
  AP.onclick=e=>{if(e.target.closest('[data-arm]')){window.aud=null;drawAud()}};drawAud();
  let mr=null,ms=null,chunks=[],tmr=0,t0=0;const RB=$('#aRec'),TM=$('#aTm');
  const stopRec=()=>{if(mr&&mr.state!='inactive')mr.stop()};
  const endRec=()=>{clearInterval(tmr);TM.hidden=true;$('#aBar').style.width='0';RB.classList.remove('rec');RB.querySelector('span').textContent='ჩაწერა';if(ms)ms.getTracks().forEach(t=>t.stop());ms=null};
  RB.onclick=async()=>{if(mr&&mr.state=='recording')return stopRec();
   if(!navigator.mediaDevices||!window.MediaRecorder)return toast('თქვენი ბრაუზერი ხმის ჩაწერას არ უჭერს მხარს — ატვირთეთ MP3');
   try{ms=await navigator.mediaDevices.getUserMedia({audio:true})}catch{return toast('მიკროფონზე წვდომა უარყოფილია')}
   chunks=[];mr=new MediaRecorder(ms);
   mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
   mr.onstop=async()=>{const b=new Blob(chunks,{type:mr.mimeType||'audio/webm'});endRec();if(!b.size)return;
    if(b.size>AUD_MB*1048576)return toast(`ჩანაწერი ძალიან დიდია (მაქს. ${AUD_MB}MB)`);
    const d=await rdu(b);if(!d)return toast('ჩანაწერის დამუშავება ვერ მოხერხდა');window.aud={data:d,name:'ხმოვანი ჩანაწერი',size:b.size};drawAud()};
   mr.start();t0=Date.now();TM.hidden=false;TM.textContent='0:00 / 1:00';RB.classList.add('rec');RB.querySelector('span').textContent='გაჩერება';
   tmr=setInterval(()=>{const s=Math.floor((Date.now()-t0)/1000);TM.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+' / 1:00';$('#aBar').style.width=Math.min(100,s/AUD_SEC*100)+'%';if(s>=AUD_SEC)stopRec()},250)};
  /* დაბუსტვა: ფერი + სტიკერები + ქვითარი */
  const CK=$('#aColor'),PLs=$('#aPlan'),old=p.pay&&p.pay.status=='pending'?p.pay:null;
  const showCB=()=>{$('#aColorBox').hidden=!CK.checked;paySummary()};
  const planInfo=()=>{const k=PLs.dataset.val,pl=PLANS[k];$('#planInfo').innerHTML=k!='REG'?`<b>${planName(k)}</b> · ${pl.price} ₾ · ${pl.days} დღე — სტატუსი ჩაირთვება გადახდის დადასტურების შემდეგ.`:''};
  CK.onchange=showCB;PLs.addEventListener('change',()=>{planInfo();paySummary()});
  $('#aR').onchange=async e=>{await readReceipt(e.target.files[0]);e.target.value=''};
  $$('[data-copy]').forEach(b=>b.onclick=async()=>{const k=BANKS.find(x=>x.id==b.dataset.copy),ok=await copyText(k.iban);toast(ok?k.name+': ანგარიშის ნომერი დაკოპირდა ✓':'დააკოპირეთ ხელით');if(ok){const l=b.querySelector('span');l.textContent='დაკოპირდა ✓';b.classList.add('ok');setTimeout(()=>{l.textContent='კოპირება';b.classList.remove('ok')},1800)}});
  if(old&&old.days>0){const key=Object.keys(PLANS).find(k=>PLANS[k].name==old.plan);if(key&&key!=='REG')setDD(PLs,key)}
  planInfo();
  if(old){CK.checked=!!old.color;if(old.color)setPick($('#aCP'),okHex(old.colorHex)?old.colorHex:BC_DEF);stkSync($('#aSP'),cleanStk(old.stickers))}
   showCB();
  /* ---- ცოცხალი პროტოტიპი: იგივე card() ბარათი, რასაც გამოქვეყნებული განცხადება იყენებს ---- */
  {const PV=$('#lpv');let pvT=0,pvOpen=true;
   if(PV)PV.addEventListener('toggle',e=>{if(e.target.matches('details'))pvOpen=e.target.open},true);
   const draw=()=>{clearTimeout(pvT);pvT=setTimeout(()=>{if(!PV)return;
    const k=$('#aK').dataset.val||p.type||'',KOe=$('#aKO'),A=readDyn('a'),pk=PLs.dataset.val,sv=$('#aSP .sval'),sel=cleanStk(sv?sv.value.split(','):[]),nego=$('#aNego').checked,
     d={...p,title:$('#aT').value.trim()||'განცხადების სათაური',type:k,typeOther:k=='other'&&KOe?KOe.value.trim():'',weight:+$('#aW').value||0,
      price:nego?0:G(),nego,cur:U()?'USD':'GEL',gender:A.gen||'',attrs:A,loc:$('#aL').dataset.val||'',photos:ph.length?[ph[0]]:[],video:'',audio:''};
    /* რაც განცხადებას უკვე აქვს (VIP, ფერი, სტიკერები), რჩება; ფორმაში ახლად არჩეული კი ზემოდან ემატება */
    if(pk!='REG')d.vip=PLANS[pk].name;
    if(CK.checked){d.color=true;delete d.colorUntil;d.colorHex=$('#aCP .cval').value}
    if(sel.length){d.sticker=true;delete d.stickerUntil;d.stickers=sel}
    const html=card(d).replace('tabindex="0" role="link"','tabindex="-1" aria-hidden="true"');
    PV.innerHTML=`<details class="lpv-d"${pvOpen?' open':''}>
     <summary class="lpv-h"><b>ასე გამოჩნდება განცხადება</b><small>${ph.length}/${PH_MAX} ფოტო</small></summary>
     <div class="lpv-bar"><i style="width:${Math.min(100,ph.length/PH_MAX*100)}%"></i></div>
     <div class="lpv-card">${html}</div>
     <p class="lpv-n">ფოტო, ფასი, სტატუსი, ფერი და სტიკერები ბარათზე ავტომატურად განახლდება.</p></details>`},60)};
   ['input','change'].forEach(ev=>af.addEventListener(ev,draw));
   af.addEventListener('click',()=>setTimeout(draw,0));
   [$('#prev'),$('#rcPrev')].forEach(el=>{if(el)new MutationObserver(draw).observe(el,{childList:true})});
   draw()}
  /* შენახვა */
  af.onsubmit=async e=>{e.preventDefault();if(af.dataset.busy)return;
   const K=$('#aK'),L=$('#aL'),T=$('#aT'),D=$('#aD'),W=$('#aW'),P=$('#aP'),k=K.dataset.val,t=T.value.trim(),d=D.value.trim(),w=+W.value,pr=G(),nego=$('#aNego').checked,A={},
    col=CK.checked,sv=$('#aSP .sval'),sel=cleanStk(sv?sv.value.split(','):[]),pk=PLs.dataset.val||'REG',pl=PLANS[pk]||PLANS.REG,paid=pk!='REG'&&!!PLANS[pk],
    need=paid||col||sel.length>0,amt=pl.price+(col?COLOR.price:0)+sel.length*STICKER.price,rcOk=!!window.rc||!!(old&&old.receipt&&amt<=old.amount),
    dyn=fkeys(k).map(x=>{
  const el=$('#a_'+x);
  const v=FD[x].t=='text'?el.value.trim():el.dataset.val;
  if(v) A[x]=v;

  return [el,
    x=='metal'&&!v?'აირჩიეთ ლითონის ტიპი':
    x=='pur'&&!v?'აირჩიეთ სინჯი':''
  ];
});
   const KOe=$('#aKO'),n=check(af,[[K,k?'':'აირჩიეთ ნივთის ტიპი'],[KOe,k=='other'&&!KOe.value.trim()?'მიუთითეთ ნივთის დასახელება':''],...dyn,[L,L.dataset.val?'':'აირჩიეთ მდებარეობა'],
    [T,!t?'შეიყვანეთ დასახელება':t.length<3?'მინიმუმ 3 სიმბოლო':''],[D,!d?'შეიყვანეთ აღწერა':d.length<10?'აღწერა ძალიან მოკლეა (მინ. 10 სიმბოლო)':''],
    [W,!(w>0)?'მიუთითეთ წონა (0-ზე მეტი)':w>10000?'წონა ძალიან დიდია':''],[P,nego?'':(!(pr>0)?'მიუთითეთ ფასი (0-ზე მეტი)':pr>100000000?'ფასი ძალიან მაღალია':'')],
    [$('#photoFld'),ph.length>8?'მაქსიმუმ 8 ფოტო':ph.length<Math.min(3,(p.photos||[]).length)?`ატვირთეთ მინიმუმ ${Math.min(3,(p.photos||[]).length)} ფოტო (ახლა: ${ph.length})`:''],[$('#rcptFld'),need&&!rcOk?'ატვირთეთ გადახდის ქვითარი':'']]);
   const S=$('#formSum');if(n){S.hidden=false;S.textContent=`⚠️ შეასწორეთ ან შეავსეთ ${n} ველი`;return toast('შეავსეთ ყველა სავალდებულო ველი')}S.hidden=true;
   const bk={...p},now=Date.now(),sb=af.querySelector('button[type=submit]'),sbt=sb.textContent;af.dataset.busy='1';sb.disabled=true;sb.textContent='ინახება…';
   Object.assign(p,{title:t,type:k,typeOther:k=='other'?KOe.value.trim():'',desc:d,weight:w,gender:A.gen||'',loc:L.dataset.val,attrs:A,price:nego?0:pr,nego,cur:U()?'USD':'GEL',photos:[...ph],video:window.vid?window.vid.data:'',audio:window.aud?window.aud.data:''});
   const rc=window.rc||{data:old&&old.receipt,name:old&&old.receiptName,type:old&&old.receiptType};
   if(need)p.pay={plan:paid?pl.name:'Regular',days:paid?pl.days:0,color:col,sticker:sel.length>0,stickers:sel,stkN:sel.length,amount:amt,receipt:rc.data,receiptName:rc.name,receiptType:rc.type,status:'pending',created:now,colorHex:col?$('#aCP .cval').value:''};
   else if(old)delete p.pay;
   if(!paid){delete p.hold;delete p.hvis}applyVis(p);
   let ok=false;try{ok=await commitItems(p)}catch{ok=false}
   delete af.dataset.busy;sb.disabled=false;sb.textContent=sbt;
   if(!ok){Object.assign(p,bk);if(!('pay' in bk))delete p.pay;saveItems(items);S.hidden=false;S.textContent='⚠️ ცვლილებები ვერ შეინახა — სცადეთ ნაკლები ან უფრო პატარა ფოტო.';return toast('ცვლილებები ვერ შეინახა')}
   if(need){addNote(`«${t}» განახლდა. დამატებითი სერვისების გადახდა მოწმდება — ისინი ჩაირთვება დადასტურების შემდეგ`);(window.ADMIN_EMAILS||[]).forEach(a=>pushNote(a,`ახალი გადახდა შესამოწმებლად: «${t}» – დამატებითი სერვისები, ${amt} ₾`))}
   else addNote('განცხადება განახლდა: '+t);
   window.ph=[];toast('განცხადება განახლდა ✓');location.hash='product:'+p.id}}

 /* ---------- „რედაქტირება“ ღილაკების ჩასმა ბარათებში და პროდუქტის გვერდზე ---------- */
 const idOf=el=>{const c=el.closest('.card[data-id]');return c&&c.dataset.id};
 function inject(){if(!me)return;
  $$('.card[data-id] .cbl').forEach(box=>{const eph=box.querySelector('[data-eph]');
   if(!box.querySelector('[data-edit]')&&eph)eph.insertAdjacentHTML('beforebegin',`<button type="button" class="cdel cedit" data-edit="${idOf(box)}" aria-label="რედაქტირება" title="რედაქტირება">${ui('edit')}</button>`);
   if(eph)eph.remove()});
  const pa=$('.pdp .pact');if(pa){const eph=pa.querySelector('[data-eph]'),id=($('#pgal')||{dataset:{}}).dataset.id;
   if(eph&&id){if(!pa.querySelector('[data-edit]'))eph.insertAdjacentHTML('beforebegin',`<button type="button" class="pa pic" data-edit="${id}" aria-label="რედაქტირება" title="რედაქტირება">${ui('edit')}<span class="lb">რედაქტირება</span></button>`);
    eph.remove();const ai=pa.querySelector('[data-try]');if(ai)ai.remove()}}}
 document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-edit]');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();location.hash='edit:'+b.dataset.edit},true);


 /* =====================================================================
    განცხადების სტატუსები: აქტიური · ვადაგასული · გამორთული · დაბლოკილი
    - ვადაგასული: გამოქვეყნებიდან (ან ბოლო განახლებიდან) 1 თვის შემდეგ
    - გამორთული: მფლობელმა თვითონ გათიშა (შეუძლია ისევ ჩართოს)
    - დაბლოკილი: ადმინისტრატორმა დაბლოკა (მფლობელი ვეღარ ააქტიურებს)
    გამორთული / ვადაგასული / დაბლოკილი განცხადება საჯაროდ არ ჩანს (იგივე მექანიზმი, რაც გადახდის მოლოდინისას).
    ===================================================================== */
 {const st=document.createElement('style');st.textContent=`
   .lpc .lpv-card{pointer-events:none}
  .mchips{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px}
 .mchip{display:inline-flex;align-items:center;gap:9px;height:44px;padding:0 10px 0 14px;border:1.5px solid #E3E4E6;border-radius:14px;background:#fff;color:#5F646B;font:inherit;font-size:var(--fs-md);font-weight:600;cursor:pointer;white-space:nowrap;transition:background .2s,border-color .2s,color .2s,box-shadow .2s,transform .15s}
 .mchip svg{width:20px;height:20px;flex:none;color:#9AA0A6;transition:color .2s}
 .mchip .mcnt{min-width:24px;height:24px;padding:0 7px;border-radius:999px;background:#F1F2F4;color:#5F646B;font-size:13px;font-weight:700;font-style:normal;display:inline-flex;align-items:center;justify-content:center;transition:background .2s,color .2s}
 .mchip:hover{background:#F7F8FA;border-color:#C9CBCF;color:#1A1C1F;transform:translateY(-1px)}
 .mchip:active{transform:translateY(0)}
 .mchip.on{color:#1A1C1F;box-shadow:0 2px 10px rgba(0,0,0,.07)}
 .mchip[data-mf=active].on{background:#EAF8EF;border-color:#1FA855}
 .mchip[data-mf=active].on svg{color:#1FA855}
 .mchip[data-mf=active].on .mcnt{background:#1FA855;color:#fff}
 .mchip[data-mf=expired].on{background:#FFF6DD;border-color:#D49A00}
 .mchip[data-mf=expired].on svg{color:#D49A00}
 .mchip[data-mf=expired].on .mcnt{background:#D49A00;color:#fff}
 .mchip[data-mf=off].on{background:#F1F2F4;border-color:#5F646B}
 .mchip[data-mf=off].on svg{color:#5F646B}
 .mchip[data-mf=off].on .mcnt{background:#5F646B;color:#fff}
 .mchip[data-mf=blocked].on{background:#FDECEA;border-color:#C0453F}
 .mchip[data-mf=blocked].on svg{color:#C0453F}
 .mchip[data-mf=blocked].on .mcnt{background:#C0453F;color:#fff}
 .mchip:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
 .mempty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:44px 20px;margin-top:4px;border:1.5px dashed #E3E4E6;border-radius:16px;background:#FAFBFC;text-align:center;animation:mfade .25s ease}
 .mempty .mei{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#F1F2F4;color:#9AA0A6;margin-bottom:6px}
 .mempty .mei svg{width:28px;height:28px}
 .mempty b{font-size:var(--fs-md);color:#1A1C1F}
 .mempty small{font-size:var(--fs-sm);color:var(--mu);max-width:340px;line-height:1.5}
 .mempty[data-k=active] .mei{background:#EAF8EF;color:#1FA855}
 .mempty[data-k=expired] .mei{background:#FFF6DD;color:#D49A00}
 .mempty[data-k=blocked] .mei{background:#FDECEA;color:#C0453F}
 @keyframes mfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
 .card.is-off{opacity:.62}
  .mstat,.mtype{position:absolute;top:10px;z-index:3;display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 11px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.2px;box-shadow:0 2px 8px rgba(0,0,0,.22);pointer-events:none}
 .mstat{right:10px;color:#fff}
 .mstat::before{content:"";width:7px;height:7px;border-radius:50%;background:#fff;opacity:.9}
 .mstat.s-active{background:#1FA855}
 .mstat.s-expired{background:#D49A00}
 .mstat.s-off{background:#6B7078}
 .mstat.s-blocked{background:#C0453F}
 .mtype{left:10px;background:rgba(255,255,255,.95);color:#5F646B}
 .mtype.mt-vip{background:#FFC93C;color:#5A3E00}
 .mtype.mt-svip{background:linear-gradient(135deg,#8E4FD8,#5B2BA8);color:#fff}
 .pstat.mst{margin-top:6px}
 .mblk{margin:8px 0 0;padding:9px 12px;border-radius:10px;background:#FDECEA;border:1px solid #F1B8B2;color:#A3342E;font-size:var(--fs-sm);line-height:1.45;word-break:break-word}
 .mblk b{font-weight:700}
 @media(max-width:560px){.mchips{flex-wrap:nowrap;overflow-x:auto;margin-right:-4px;padding-bottom:4px;scrollbar-width:none}.mchips::-webkit-scrollbar{display:none}.mchip{height:40px;padding:0 8px 0 11px;font-size:var(--fs-sm)}}`;document.head.append(st)
}
 const MONTH=30*DAY,baseT=p=>p.renewedAt||p.created||0;
 const isExp=p=>p.owner!='demo'&&!!baseT(p)&&baseT(p)+MONTH<=Date.now();
 function stateOf(p){return p.state=='blocked'?'blocked':p.state=='off'?'off':isExp(p)?'expired':'active'}
 /* გამორთული/ვადაგასული/დაბლოკილი = p.hold (საჯაროდ დამალვა); hvis აღნიშნავს, რომ hold ამ მიზეზით დაისვა */
 function applyVis(p){const hide=stateOf(p)!='active';
  if(hide&&!p.hold){p.hold=true;p.hvis=true;return true}
  if(!hide&&p.hvis){delete p.hold;delete p.hvis;return true}
  return false}
 function applyAll(){let ch=false;
  items.forEach(p=>{if(applyVis(p))ch=true;
   if(stateOf(p)=='expired'&&!p.expNote){p.expNote=true;ch=true;notifyOwner(p,`«${p.title}» – განცხადების ვადა ამოიწურა (1 თვე). გაააქტიურეთ „ჩემი განცხადებები → ვადაგასული“ განყოფილებიდან`)}});
  if(ch)save('items',items);return ch}
 const _sweep=window.sweep;
 window.sweep=function(){const a=_sweep.apply(this,arguments),b=applyAll();return a||b};
 const _showProfile=window.showProfile;
 window.showProfile=function(){applyAll();return _showProfile.apply(this,arguments)};

 const MF={
  active:['აქტიური','<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>'],
  expired:['ვადაგასული','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
  off:['გამორთული','<path d="M3 3l18 18"/><path d="M10.6 6.1A9.4 9.4 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.9M6.5 7.5A17 17 0 002 12s4 6 10 6c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>'],
  blocked:['დაბლოკილი','<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>']};
 const svgI=(d,c)=>`<svg${c?` class="${c}"`:''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
 const EYE_ON='<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
 const stLabel=k=>MF[k][0];

 /* ჩემი განცხადებები: ფილტრის ღილაკები + ბარათების სტატუსი/ღილაკები */
 function mineUI(){const tb=$('.panel .tabs'),on=tb&&tb.querySelector('[data-tab="mine"].on');let box=$('.mchips');
  if(!on||!me){if(box)box.remove();return}
  const mine=items.filter(p=>same(p.owner,me.email)),cnt={active:0,expired:0,off:0,blocked:0};mine.forEach(p=>cnt[stateOf(p)]++);
  const f=window.__mineF||'active';
  const html=Object.keys(MF).map(k=>`<button type="button" class="mchip${f==k?' on':''}" data-mf="${k}" aria-pressed="${f==k}">${svgI(MF[k][1])}<span>${MF[k][0]}</span><em class="mcnt">${cnt[k]}</em></button>`).join('');
  if(!box){box=document.createElement('div');box.className='mchips';box.setAttribute('role','group');box.setAttribute('aria-label','განცხადების სტატუსი');tb.after(box)}
  if(box.dataset.sig!==html){box.dataset.sig=html;box.innerHTML=html}
  let vis=0;
  $$('.panel .card[data-id]').forEach(c=>{const p=items.find(x=>String(x.id)===c.dataset.id);if(!p)return;const k=stateOf(p),show=k==f;
   c.hidden=!show;if(show)vis++;c.classList.toggle('is-off',k!='active');
           const pn=p.vip||'Regular',rs=k=='blocked'?(p.blockReason||''):'',sig=k+'|'+pn+'|'+rs;
   if(c.dataset.mst!==sig){c.querySelectorAll('.mst,.mtype,.mstat,.mblk').forEach(o=>o.remove());
    const im=c.querySelector('img'),host=im&&im.parentElement,tr=c.querySelector('.trow');
    if(host){if(getComputedStyle(host).position=='static')host.style.position='relative';
     host.insertAdjacentHTML('beforeend',`<span class="mtype mt-${pn=='Regular'?'reg':/super|svip/i.test(pn)?'svip':'vip'}">${esc(pn)}</span><span class="mstat s-${k}">${stLabel(k)}</span>`)}
    if(tr&&k=='blocked')tr.insertAdjacentHTML('afterend',`<div class="mblk"><b>დაბლოკვის მიზეზი:</b> ${rs?esc(rs):'მიზეზი არ არის მითითებული'}</div>`);
    c.dataset.mst=sig}
   const cbl=c.querySelector('.cbl');
   if(cbl){const key=k=='expired'?'renew':k=='blocked'?'':k=='off'?'on':'off';
    if(cbl.dataset.act!==key){$$('[data-off],[data-renew]',cbl).forEach(x=>x.remove());
     if(key)cbl.insertAdjacentHTML('afterbegin',key=='renew'?`<button type="button" class="cdel" data-renew="${p.id}" title="განცხადების გააქტიურება +1 თვით">განახლება</button>`:`<button type="button" class="cdel" data-off="${p.id}" title="${key=='on'?'განცხადების ჩართვა':'განცხადების გათიშვა'}">${key=='on'?'ჩართვა':'გათიშვა'}</button>`);
     cbl.dataset.act=key}}});
  const EMP={
 active:['აქტიური განცხადება არ გაქვთ','დაამატეთ ახალი განცხადება ან განაახლეთ ვადაგასული.'],
 expired:['ვადაგასული განცხადება არ არის','განცხადება ვადაგასულად ითვლება გამოქვეყნებიდან 1 თვის შემდეგ.'],
 off:['გამორთული განცხადება არ არის','თქვენს მიერ გათიშული განცხადებები აქ გამოჩნდება და შეგიძლიათ ისევ ჩართოთ.'],
 blocked:['დაბლოკილი განცხადება არ არის','ადმინისტრატორის მიერ დაბლოკილი განცხადებები აქ გამოჩნდება.']};
let em=$('.mempty');
if(mine.length&&!vis){
 if(!em){em=document.createElement('div');em.className='mempty';box.after(em)}
 if(em.dataset.k!==f){em.dataset.k=f;em.innerHTML=`<span class="mei">${svgI(MF[f][1])}</span><b>${EMP[f][0]}</b><small>${EMP[f][1]}</small>`}}
else if(em)em.remove()}

 /* პროდუქტის გვერდი: გათიშვა/ჩართვა (მფლობელი), დაბლოკვა/განბლოკვა (ადმინი) */
 function pageUI(){if(!me)return;const pa=$('.pdp .pact'),id=($('#pgal')||{dataset:{}}).dataset.id;if(!pa||!id)return;
  const p=items.find(x=>String(x.id)===String(id));if(!p)return;const k=stateOf(p),anchor=pa.querySelector('[data-del]'),put=h=>anchor?anchor.insertAdjacentHTML('beforebegin',h):pa.insertAdjacentHTML('beforeend',h);
  if(ownerOf(p)&&k!='blocked'&&!pa.querySelector('[data-off],[data-renew]'))
   put(k=='expired'?`<button type="button" class="pa pic" data-renew="${p.id}">${svgI(MF.expired[1],'ic')}<span class="lb">განახლება</span></button>`
    :`<button type="button" class="pa pic" data-off="${p.id}">${svgI(k=='off'?EYE_ON:MF.off[1],'ic')}<span class="lb">${k=='off'?'ჩართვა':'გათიშვა'}</span></button>`);
  if(isAdmin()&&!pa.querySelector('[data-block]'))
   put(`<button type="button" class="pa pic del" data-block="${p.id}">${svgI(MF.blocked[1],'ic')}<span class="lb">${p.state=='blocked'?'განბლოკვა':'დაბლოკვა'}</span></button>`);
  const tt=$('.pdp .ptitle');if(tt&&k!='active'&&(ownerOf(p)||isAdmin())&&!$('.pdp .mst'))tt.insertAdjacentHTML('afterend',`<span class="pstat mst${k=='blocked'?' rejected':''}" style="margin:-8px 0 14px">${stLabel(k)}${k=='blocked'&&p.blockReason?': '+esc(p.blockReason):''}</span>`)}
 function injectAll(){[inject,mineUI,pageUI].forEach(f=>{try{f()}catch(e){console.error('edit.js',f.name,e)}})}
 window.__editJsVersion=5;console.info('edit.js v5 loaded');
 window.addEventListener('hashchange',()=>setTimeout(injectAll,0));

 function blockDlg(p){if(!isAdmin())return;
  if(p.state=='blocked'){p.state='';delete p.blockReason;applyVis(p);save('items',items);notifyOwner(p,`«${p.title}» – განბლოკილია`);toast('განცხადება განბლოკილია ✓');return rerender()}
  curAuth=null;modal.classList.add('show');
  $('#modalBody').innerHTML=`<h3>განცხადების დაბლოკვა</h3><p>${esc(p.title)}</p><form class="form" id="blkForm" novalidate><label>მიზეზი (არასავალდებულო)<textarea id="blkT" rows="3" maxlength="300"></textarea></label><div class="row2"><button class="btn danger" type="submit">დაბლოკვა</button><button type="button" class="btn alt" id="blkNo">გაუქმება</button></div></form>`;
  $('#blkNo').onclick=closeModal;
  $('#blkForm').onsubmit=e=>{e.preventDefault();if(!isAdmin())return closeModal();const r=$('#blkT').value.trim();
   p.state='blocked';p.blockReason=r;applyVis(p);save('items',items);notifyOwner(p,`«${p.title}» დაიბლოკა ადმინისტრატორის მიერ${r?': '+r:''}`);closeModal();toast('განცხადება დაიბლოკა');rerender()}}

 document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-off],[data-renew],[data-block],[data-mf]');if(!t)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(t.dataset.mf){window.__mineF=t.dataset.mf;mineUI();return}
  const id=t.getAttribute('data-off')||t.getAttribute('data-renew')||t.getAttribute('data-block'),p=items.find(x=>String(x.id)===String(id));if(!p)return;
  if(t.hasAttribute('data-block'))return blockDlg(p);
  if(!ownerOf(p))return;
  if(p.state=='blocked')return toast('განცხადება დაბლოკილია ადმინისტრატორის მიერ');
  const persist=(msg)=>{applyVis(p);save('items',items);pushListing(p).then(ok=>{if(!ok)return;toast(msg);rerender()})};
  if(t.hasAttribute('data-renew')){p.renewedAt=Date.now();delete p.expNote;return persist('განცხადება გააქტიურდა ✓ (+1 თვე)')}
else {
  const off = p.state !== 'off';

  if (off) {
  curAuth = null;

  $('#modalBody').innerHTML = `
    <div class="confirm">
      <div class="ci">${ui('edit')}</div>

      <h3>ნამდვილად გსურთ განცხადების გათიშვა?</h3>

      <p>
        «${esc(p.title)}»<br>
        განცხადება საჯაროდ აღარ გამოჩნდება.
        ხელახლა ჩართვას თქვენი პროფილიდან შეძლებთ.
      </p>

      <div class="row2">
        <button type="button" class="btn danger" id="offYes">
          დიახ, გათიშვა
        </button>
        <button type="button" class="btn alt" id="offNo">
          გაუქმება
        </button>
      </div>
    </div>
  `;

  $('#modalBox').classList.remove('wide');
  modal.classList.add('show');

  $('#offNo').onclick = closeModal;

  $('#offYes').onclick = () => {
    if (!ownerOf(p)) return closeModal();

    if (p.state === 'blocked') {
      closeModal();
      return toast('განცხადება დაბლოკილია ადმინისტრატორის მიერ');
    }

    p.state = 'off';
    closeModal();
    persist('განცხადება გაითიშა — საჯაროდ აღარ ჩანს');
  };

  $('#offNo').focus();
  return;
}

  p.state = '';
  return persist('განცხადება ჩაირთო ✓');
}},true);

 /* bind()-ს ბოლოში ემატება bindEdit + ღილაკების ჩასმა */
 const _bind=window.bind;
 window.bind=function(){_bind.apply(this,arguments);bindEdit();injectAll();fixLabels()};
 const app=$('#app');if(app)new MutationObserver(injectAll).observe(app,{childList:true,subtree:true});

 /* წუთობრივი sweep-ის route() არ უნდა გადაწეროს რედაქტირების ფორმა */
 const _route=window.route;
 window.route = function () {
  const [page] = parseHash();
  if (page === 'edit' && $('#editForm')) return;
  return _route.apply(this, arguments);
};
})();
