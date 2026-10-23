/* mygem.ge — რეკლამის ბლოკი მთავარ გვერდზე (1190×324)
   ჩაირთვება script.js-ის შემდეგ. არსებულ კოდს არ ცვლის: მთავარი გვერდის ჩატვირთვისას
   ბლოკი თავისით ჩაჯდება «Super VIP კოლექციის» შემდეგ, კალკულატორამდე.

   პარამეტრები (არასავალდებულო) — index.html-ში, ad.js-მდე:
   <script>window.AD_CONFIG={ banner:'/images/ad.jpg', link:'https://...', instagram:'https://www.instagram.com/თქვენი_გვერდი' };</script>
   banner ცარიელია = ჩანს «თქვენი რეკლამის ადგილი» საკონტაქტო ღილაკებით. */
(() => {
  const C = Object.assign({
    banner: '',            // რეკლამის სურათი (1190×324 ან იმავე პროპორციის)
    link: '',              // სად გადავიდეს რეკლამაზე დაჭერისას
    alt: 'რეკლამა',
    facebook: 'https://www.facebook.com/mygem.ge',
    instagram: 'https://www.instagram.com/mygem.ge',   // შეამოწმეთ: ზუსტი ბმული ჩაწერეთ
    email: 'mygemge@gmail.com',
  }, window.AD_CONFIG || {});

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safe = u => /^(https?:\/\/|\/|\.\/|images\/|img\/|static\/)/i.test(String(u || '')) ? u : '';

  const I = {
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 8l8 6 8-6"/>',
    fb: '<path d="M14 8V6c0-1 .5-1.5 1.5-1.5H17V1h-2.5C11.5 1 10 3 10 5.5V8H7v4h3v11h4V12h2.7l.6-4z" fill="currentColor" stroke="none"/>',
    ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>'
  };
  const ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

  const buttons = () => {
    const b = [];
    if (safe(C.facebook)) b.push(`<a class="adb" href="${esc(C.facebook)}" target="_blank" rel="noopener noreferrer">${ic('fb')}<span>Facebook</span></a>`);
    if (safe(C.instagram)) b.push(`<a class="adb" href="${esc(C.instagram)}" target="_blank" rel="noopener noreferrer">${ic('ig')}<span>Instagram</span></a>`);
    if (C.email) b.push(`<a class="adb" href="mailto:${esc(C.email)}?subject=${encodeURIComponent('რეკლამის განთავსება mygem.ge-ზე')}">${ic('mail')}<span>ელ-ფოსტა</span></a>`);
    return `<div class="adbtns">${b.join('')}</div>`;
  };

  /* დახურვის ღილაკი: ბლოკს მხოლოდ ამ ვიზიტისთვის მალავს (გვერდის გადატვირთვის / ხელახლა შესვლისას ისევ გამოჩნდება) */
  let closed = false;
  const xBtn = '<button type="button" class="adx" aria-label="რეკლამის დახურვა" title="დახურვა"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';

  const html = () => {
    const img = safe(C.banner);
    if (img) {
      const pic = `<img src="${esc(img)}" alt="${esc(C.alt)}" width="1190" height="324" loading="lazy" decoding="async">`;
      const lnk = safe(C.link);
      return `<section class="adsec" id="adSec" aria-label="რეკლამა"><div class="adin"><span class="adtag">რეკლამა</span>${xBtn}
        <div class="adbox has-img">${lnk ? `<a class="adimg" href="${esc(lnk)}" target="_blank" rel="noopener sponsored">${pic}</a>` : `<div class="adimg">${pic}</div>`}</div>
        <div class="adstrip"><span>გსურთ აქ თქვენი რეკლამა? დაგვიკავშირდით:</span>${buttons()}</div></div></section>`;
    }
    return `<section class="adsec" id="adSec" aria-label="რეკლამის ადგილი"><div class="adin"><span class="adtag">რეკლამა</span>${xBtn}
      <div class="adbox adph"><i class="adc c1"></i><i class="adc c2"></i><i class="adc c3"></i><i class="adc c4"></i>
        <div class="adtx"><h3>თქვენი რეკლამის ადგილი</h3><p>1190 × 324 · მიაღწიეთ ათასობით მყიდველს</p>${buttons()}</div></div></div></section>`;
  };

  const mount = () => {
    const app = document.getElementById('app');
    if (!app) return;
    const h = location.hash;
    if (!(h === '' || h === '#' || h === '#home')) return;
    if (closed || document.getElementById('adSec')) return;
    const anchor = document.getElementById('svipSec') || document.getElementById('calcHome');
    if (!anchor) return;
    anchor.insertAdjacentHTML('afterend', html());
  };

  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.adx');
    if (!b) return;
    closed = true;
    const sec = document.getElementById('adSec');
    if (!sec) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return sec.remove();
    sec.classList.add('out');
    setTimeout(() => sec.remove(), 260);
  });

  const app = document.getElementById('app');
  if (app) new MutationObserver(mount).observe(app, { childList: true });
  mount();
})();
