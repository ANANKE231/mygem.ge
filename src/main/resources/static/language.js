/* mygem.ge — ქართული / English */
(() => {
  'use strict';

  if (window.mygemLanguage) return;

  const dictionary = {
    'კოლექცია': 'Collection',
    'კალკულატორი': 'Calculator',
    'ბლოგი': 'Blog',
    'მთავარი': 'Home',
    'დამატება': 'Add listing',
    'ძებნა': 'Search',
    'გასუფთავება': 'Clear',
    'ფავორიტები': 'Favourites',
    'შეტყობინებები': 'Notifications',
    'პროფილი': 'Profile',
    'თემის შეცვლა': 'Toggle theme',
    'მოძებნეთ სამკაული...': 'Search jewellery...',

    'იპოვე შენი სრულყოფილი სამკაული':
      'Find your perfect jewellery',
    'ძვირფასი სამკაულების უსაზღვრო არჩევანი ერთ სივრცეში.':
      'Discover a world of fine jewellery in one place.',

    'Super VIP კოლექცია': 'Super VIP Collection',
    'VIP+ კოლექცია': 'VIP+ Collection',
    'ჯერ არ არის Super VIP განცხადებები':
      'No Super VIP listings yet',
    'ჯერ არ არის VIP განცხადებები': 'No VIP listings yet',
    'ყველა განცხადება': 'All listings',
    'გაიგეთ მეტი': 'Learn more',
    'ვერაფერი მოიძებნა': 'No results found',

    'საძიებო სიტყვა': 'Search term',
    'ნივთის დასახელება': 'Item name',
    'მდებარეობა': 'Location',
    'ყველა': 'All',
    'ყველა დრო': 'All time',
    'დღეს': 'Today',
    'ბოლო 7 დღე': 'Last 7 days',
    'ბოლო 30 დღე': 'Last 30 days',
    'თარიღი კლებადი': 'Newest first',
    'თარიღი ზრდადი': 'Oldest first',
    'ფასი კლებადი': 'Price: high to low',
    'ფასი ზრდადი': 'Price: low to high',
    'სინჯი კლებადი': 'Purity: high to low',
    'სინჯი ზრდადი': 'Purity: low to high',

    'ფასი': 'Price',
    'წონა': 'Weight',
    'წონა (გრ)': 'Weight (g)',
    'დან': 'From',
    'მდე': 'To',
    'არჩევა': 'Select',
    'აირჩიეთ...': 'Select...',
    'ნივთის ტიპი': 'Item type',
    'კატეგორია': 'Category',
    'ლითონის ტიპი': 'Metal',
    'სინჯი': 'Purity',
    'სქესი': 'Gender',
    'ქვა': 'Gemstone',
    'მდგომარეობა': 'Condition',
    'ახალი': 'New',
    'მეორადი': 'Pre-owned',
    'ქალის': 'Women',
    'კაცის': 'Men',
    'უნისექსი': 'Unisex',

    'ოქრო': 'Gold',
    'თეთრი ოქრო': 'White gold',
    'ყვითელი ოქრო': 'Yellow gold',
    'ვარდისფერი ოქრო': 'Rose gold',
    'ვერცხლი': 'Silver',
    'პლატინა': 'Platinum',
    'ბეჭედი': 'Ring',
    'საყურე': 'Earrings',
    'საყურეები': 'Earrings',
    'სამაჯური': 'Bracelet',
    'ყელსაბამი': 'Necklace',
    'ჯაჭვი': 'Chain',
    'ჯვარი': 'Cross',
    'ბროში': 'Brooch',
    'საათი': 'Watch',
    'მონეტა': 'Coin',
    'სხვა': 'Other',

    'ქვის გარეშე': 'No gemstone',
    'ბრილიანტი': 'Diamond',
    'ალმასი': 'Diamond',
    'ზურმუხტი': 'Emerald',
    'საფირონი': 'Sapphire',
    'ლალი': 'Ruby',
    'მარგალიტი': 'Pearl',
    'ამეთვისტო': 'Amethyst',
    'ტოპაზი': 'Topaz',
    'აკვამარინი': 'Aquamarine',
    'გრანატი': 'Garnet',
    'კორალი': 'Coral',
    'კუბური ცირკონია': 'Cubic zirconia',

    'ფასი შეთანხმებით': 'Price negotiable',
    'შეთანხმებით': 'Negotiable',
    'ფასი დოლარში': 'Show price in USD',
    'ფასი დოლარში (გამორთვა: ლარი)':
      'Price in USD (switch off for GEL)',
    'ფასი ლარში (ჩართვა: დოლარი)':
      'Price in GEL (switch on for USD)',

    'უკან': 'Back',
    'წინა': 'Previous',
    'შემდეგი': 'Next',
    'გვერდები': 'Pages',

    'შესვლა': 'Sign in',
    'რეგისტრაცია': 'Register',
    'გასვლა': 'Sign out',
    'გამოსვლა': 'Sign out',
    'ელ-ფოსტა ან მომხმარებლის სახელი': 'Email or username',
    'ელ-ფოსტა': 'Email',
    'პაროლი': 'Password',
    'დაგავიწყდათ პაროლი?': 'Forgot password?',
    'ან': 'or',
    'არ გაქვთ ანგარიში? დარეგისტრირდით':
      'No account? Register',
    'უკვე გაქვთ ანგარიში? შესვლა':
      'Already have an account? Sign in',
    'სახელი და გვარი': 'Full name',
    'მომხმარებლის სახელი': 'Username',
    'ტელეფონი': 'Phone',
    'გაიმეორეთ პაროლი': 'Confirm password',
    'რეგისტრაციის ტიპი': 'Account type',
    'ფიზიკური პირი': 'Individual',
    'მაღაზია': 'Store',

    'დახურვა': 'Close',
    'გაუქმება': 'Cancel',
    'შენახვა': 'Save',
    'რედაქტირება': 'Edit',
    'წაშლა': 'Delete',
    'გაზიარება': 'Share',
    'ჩემი განცხადებები': 'My listings',
    'ჩემი პროფილი': 'My profile',
    'ფავორიტები ცარიელია': 'No favourites yet',
    'ფავორიტებში დამატება': 'Add to favourites',
    'ფავორიტებიდან ამოღება': 'Remove from favourites',
    'განცხადების წაშლა': 'Delete listing',
    'ფოტოების რედაქტირება': 'Edit photos',
    'ფოტოს გადიდება': 'Enlarge photo',
    'ვიდეო': 'Video',
    'ფოტოები': 'Photos',
    'აღწერა': 'Description',
    'დასახელება': 'Title',
    'გამოქვეყნება': 'Publish',
    'ცვლილებების შენახვა': 'Save changes',

    'ხმოვანი აღწერა': 'Voice description',
    'ხმოვანი აღწერა (სურვილისამებრ)':
      'Voice description (optional)',
    'ატვირთვა (MP3)': 'Upload (MP3)',
    'ჩაწერა': 'Record',
    'გაჩერება': 'Stop',
    'ფოტოების დამატება': 'Add photos',
    'ბრენდი': 'Brand',
    'ზომა': 'Size',
    'სტილი': 'Style',

    'კონტაქტი': 'Contact',
    'ქართული ძვირფასეულობის მარკეტფლეისი':
      'Georgian jewellery marketplace',
    'ყველა უფლება დაცულია': 'All rights reserved',
    'ქუქი პარამეტრები': 'Cookie settings',
    'ქუქი ფაილები.': 'Cookies.',
    'ყველას მიღება': 'Accept all',
    'არჩევითის უარყოფა': 'Reject optional',
    'პარამეტრები': 'Settings',
    'ქუქი ფაილების პარამეტრები': 'Cookie settings',
    'აუცილებელი': 'Essential',
    'ყოველთვის ჩართულია': 'Always enabled',
    'ანალიტიკა': 'Analytics',
    'მარკეტინგი': 'Marketing',
    'არჩევანის შენახვა': 'Save preferences',

    'ვიყენებთ აუცილებელ ქუქი ფაილებს საიტის მუშაობისთვის. ანალიტიკურ და მარკეტინგულ ქუქი ფაილებს მხოლოდ თქვენი თანხმობით ჩავრთავთ.':
      'We use essential cookies to run this website. Analytics and marketing cookies are enabled only with your consent.',

    'აირჩიეთ, რომელი ქუქი ფაილების გამოყენებას ეთანხმებით. არჩევანის შეცვლა ნებისმიერ დროს შეგიძლიათ საიტის ბოლოდან.':
      'Choose which cookies to allow. You can change your preferences anytime in the footer.',

    'საჭიროა საიტის მუშაობისთვის: ანგარიშით შესვლა, ფავორიტები, თქვენი განცხადებები, ვალუტის კურსი და თქვენი არჩევანის დამახსოვრება. გამორთვა შეუძლებელია.':
      'Required for sign-in, favourites, listings, exchange rates and preferences. These cookies cannot be disabled.',

    'გვეხმარება გავიგოთ, როგორ იყენებენ ვიზიტორები საიტს, რათა გავაუმჯობესოთ იგი.':
      'Help us understand how visitors use the website so we can improve it.',

    'გამოიყენება შესაბამისი რეკლამის საჩვენებლად და სარეკლამო კამპანიების ეფექტიანობის გასაზომად.':
      'Used to show relevant advertisements and measure campaign performance.'
  };

  const textHistory = new WeakMap();
  const attributeHistory = new WeakMap();

  const excluded = [
    'script',
    'style',
    'textarea',
    'iframe',
    '[contenteditable]',
    '[data-no-translate]',
    '.trow h4',
    '.ltitle',
    '.ptitle',
    '.pdesc p',
    '.hbb b',
    '.hbe',
    '.art',
    '.ownchip',
    '.owner-chip',
    '.note'
  ].join(',');

  let language = 'ka';

  try {
    if (localStorage.getItem('mygem.language') === 'en') {
      language = 'en';
    }
  } catch (_) {}

  function translate(source) {
    const key = source.trim();

    if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
      return source.replace(key, dictionary[key]);
    }

    let match = key.match(/^(\d+) განცხადება$/);

    if (match) {
      return source.replace(key, `${match[1]} listings`);
    }

    match = key.match(/^(\d+) ნახვა$/);

    if (match) {
      return source.replace(key, `${match[1]} views`);
    }

    match = key.match(/^(\d+) (წუთის|საათის|დღის|თვის|წლის) წინ$/);

    if (match) {
      const units = {
        'წუთის': 'min',
        'საათის': 'h',
        'დღის': 'days',
        'თვის': 'months',
        'წლის': 'years'
      };

      return source.replace(
        key,
        `${match[1]} ${units[match[2]]} ago`
      );
    }

    return source;
  }

  function isExcluded(element) {
    return !element || Boolean(element.closest(excluded));
  }

  function updatePage() {
    observer.disconnect();

    try {
      document.documentElement.lang = language;

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;

        if (
          isExcluded(parent) ||
          parent.closest('#languageToggle')
        ) {
          continue;
        }

        const previous = textHistory.get(node);

        const source =
          previous && node.nodeValue === previous.shown
            ? previous.source
            : node.nodeValue;

        const shown =
          language === 'en' ? translate(source) : source;

        if (node.nodeValue !== shown) {
          node.nodeValue = shown;
        }

        textHistory.set(node, { source, shown });
      }

      const elements = document.body.querySelectorAll(
        '[placeholder], [title], [aria-label]'
      );

      for (const element of elements) {
        if (
          isExcluded(element) ||
          element.id === 'languageToggle'
        ) {
          continue;
        }

        const saved = attributeHistory.get(element) || {};

        for (const name of ['placeholder', 'title', 'aria-label']) {
          if (!element.hasAttribute(name)) continue;

          const current = element.getAttribute(name);
          const previous = saved[name];

          const source =
            previous && current === previous.shown
              ? previous.source
              : current;

          const shown =
            language === 'en' ? translate(source) : source;

          if (current !== shown) {
            element.setAttribute(name, shown);
          }

          saved[name] = { source, shown };
        }

        attributeHistory.set(element, saved);
      }

      const button = document.getElementById('languageToggle');

      if (button) {
        button.textContent = language === 'ka' ? 'EN' : 'ქარ';

        button.setAttribute(
          'aria-label',
          language === 'ka'
            ? 'Switch to English'
            : 'ქართულზე გადართვა'
        );

        button.title =
          language === 'ka' ? 'English' : 'ქართული';
      }
    } finally {
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
          'placeholder',
          'title',
          'aria-label'
        ]
      });
    }
  }

  const observer = new MutationObserver(updatePage);

  const style = document.createElement('style');

  style.textContent = `
    .top #languageToggle {
      flex: 0 0 auto;
      width: auto;
      min-width: 36px;
      padding: 0 6px;
      font: 600 12px Inter, Arial, sans-serif;
      letter-spacing: .3px;
      color: var(--tx);
      background: transparent;
      border: 1px solid var(--line);
      border-radius: 8px;
    }

    .top #languageToggle:hover {
      background: var(--hov);
    }

    .top #languageToggle:focus-visible {
      outline: 2px solid var(--gold-d);
      outline-offset: 3px;
    }
  `;

  document.head.append(style);

  const actions = document.querySelector('.top .actions');

  if (actions) {
    const button = document.createElement('button');

    button.type = 'button';
    button.id = 'languageToggle';
    button.className = 'ib';

    const themeButton = document.getElementById('themeToggle');

    if (themeButton && themeButton.parentElement === actions) {
      themeButton.after(button);
    } else {
      actions.prepend(button);
    }

    button.addEventListener('click', () => {
      language = language === 'ka' ? 'en' : 'ka';

      try {
        localStorage.setItem('mygem.language', language);
      } catch (_) {}

      updatePage();
    });
  }

  window.mygemLanguage = {
    get: () => language
  };

  updatePage();
})();