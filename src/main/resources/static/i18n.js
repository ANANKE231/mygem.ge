/* Public-site language. Georgian stays the source text; English is applied in the page. */
(function () {
  var PAIRS = [
    ["mygem.ge – ძვირფასეულობის მარკეტფლეისი", "mygem.ge – Jewelry marketplace"],
    ["ქართული ძვირფასეულობის მარკეტფლეისი", "Georgian jewelry marketplace"],
    ["ძვირფასი სამკაულების უსაზღვრო არჩევანი ერთ სივრცეში.", "An endless choice of fine jewelry in one place."],
    ["იპოვე შენი სრულყოფილი სამკაული", "Find your perfect piece of jewelry"],
    ["რჩევები, გზამკვლევები და ინსპირაცია სამკაულების სამყაროდან", "Tips, guides and inspiration from the world of jewelry"],
    ["საქართველოს ეროვნული ბანკის ოფიციალური კურსი", "Official rate of the National Bank of Georgia"],
    ["ვიყენებთ აუცილებელ ქუქი ფაილებს საიტის მუშაობისთვის. ანალიტიკურ და მარკეტინგულ ქუქი ფაილებს მხოლოდ თქვენი თანხმობით ჩავრთავთ.", "We use necessary cookies to run the site. Analytics and marketing cookies are used only with your consent."],
    ["აირჩიეთ, რომელი ქუქი ფაილების გამოყენებას ეთანხმებით. არჩევანის შეცვლა ნებისმიერ დროს შეგიძლიათ საიტის ბოლოდან.", "Choose which cookies you allow. You can change this any time from the bottom of the site."],
    ["საჭიროა საიტის მუშაობისთვის: ანგარიშით შესვლა, ფავორიტები, თქვენი განცხადებები, ვალუტის კურსი და თქვენი არჩევანის დამახსოვრება. გამორთვა შეუძლებელია.", "Required for the site: signing in, favorites, your listings, the exchange rate and remembering your choice. These cannot be turned off."],
    ["გვეხმარება გავიგოთ, როგორ იყენებენ ვიზიტორები საიტს, რათა გავაუმჯობესოთ იგი.", "Helps us understand how visitors use the site so we can improve it."],
    ["გამოიყენება შესაბამისი რეკლამის საჩვენებლად და სარეკლამო კამპანიების ეფექტიანობის გასაზომად.", "Used to show relevant ads and measure campaigns."],
    ["ყველა უფლება დაცულია", "All rights reserved"],
    ["ქუქი ფაილების პარამეტრები", "Cookie settings"],
    ["ქუქი პარამეტრები", "Cookie settings"],
    ["ქუქი ფაილები.", "Cookies."],
    ["არჩევითის უარყოფა", "Reject optional"],
    ["არჩევანის შენახვა", "Save choices"],
    ["ყველას მიღება", "Accept all"],
    ["ყოველთვის ჩართულია", "Always on"],
    ["აუცილებელი", "Necessary"],
    ["ანალიტიკა", "Analytics"],
    ["მარკეტინგი", "Marketing"],
    ["პარამეტრები", "Settings"],
    ["დახურვა", "Close"],

    ["როგორ შევარჩიოთ იდეალური სამკაული ნებისმიერი შემთხვევისთვის?", "How do you choose the right jewelry for any occasion?"],
    ["სამკაული მხოლოდ აქსესუარი არ არის — ის ჩვენს სტილს, ხასიათსა და ემოციებს გამოხატავს.", "Jewelry is more than an accessory — it expresses style, character and emotion."],
    ["ოქრო თუ ვერცხლი — რომელი უხდება შენს სტილს?", "Gold or silver — which suits your style?"],
    ["სამკაულის შერჩევისას ხშირად გვიჩნდება კითხვა: ოქრო ჯობია თუ ვერცხლი?", "Choosing jewelry often raises the question: is gold or silver better?"],
    ["ბრილიანტის გზამკვლევი: ყველაფერი, რაც შეძენამდე უნდა იცოდე", "A diamond guide: what to know before you buy"],
    ["ბრილიანტი ელეგანტურობისა და მარადიული სილამაზის სიმბოლოა.", "A diamond is a symbol of elegance and lasting beauty."],
    ["5 რჩევა, როგორ ამოვიცნოთ ხარისხიანი სამკაული", "5 tips for recognizing quality jewelry"],
    ["სამკაულის შეძენისას მხოლოდ მისი გარეგნობა არ არის მნიშვნელოვანი — ხარისხიც არანაკლებ ყურადღებას იმსახურებს.", "Looks are not the only thing that matters when buying jewelry — quality deserves just as much attention."],
    ["რა ვაჩუქოთ საყვარელ ადამიანს? — ძვირფასეულობის საუკეთესო იდეები", "What should you give someone you love? The best jewelry ideas"],
    ["საჩუქრის შერჩევა ყოველთვის მარტივი არ არის, განსაკუთრებით მაშინ, როცა გვინდა, ის განსაკუთრებული და დასამახსოვრებელი იყოს.", "Choosing a gift is not always easy, especially when you want it to be memorable."],
    ["როგორ მოვუაროთ ოქროსა და ვერცხლის სამკაულებს, რომ ბზინვარება შეინარჩუნონ?", "How do you care for gold and silver jewelry so it keeps its shine?"],
    ["სამკაული ხშირად ჩვენი ყოველდღიური სტილის ნაწილია, თუმცა დროთა განმავლობაში მას შეიძლება ბზინვარება შეუმცირდეს ან ზედაპირზე ლაქები გაუჩნდეს.", "Jewelry is often part of everyday style, but over time it can lose its shine or pick up marks."],
    ["2026 წლის სამკაულების ტრენდები — რა არის მოდაში?", "Jewelry trends for 2026 — what is in fashion?"],
    ["სამკაულს შეუძლია უბრალო ჩაცმულობაც კი გამორჩეულ იერად აქციოს.", "Jewelry can turn even a simple outfit into something distinctive."],
    ["სამკაული, როგორც ინვესტიცია — ღირს თუ არა ძვირფასეულობის შეძენა?", "Jewelry as an investment — is it worth buying?"],
    ["სამკაული მხოლოდ სილამაზისა და სტილის ნაწილი არ არის — ზოგიერთ შემთხვევაში ის ღირებულების შენარჩუნების საშუალებაც შეიძლება იყოს.", "Jewelry is not only about beauty and style — sometimes it can also hold value."],
    ["პატარა დეტალი, დიდი შთაბეჭდილება — როგორ გამოხატავს სამკაული შენს პიროვნებას?", "A small detail, a big impression — how jewelry expresses you"],
    ["ზოგჯერ ერთი პატარა დეტალიც საკმარისია იმისთვის, რომ შენი სტილი სხვებისგან გამოირჩეოდეს.", "Sometimes one small detail is enough to set your style apart."],
    ["როგორ შევუხამოთ ერთმანეთს სამკაულები და შევქმნათ დახვეწილი სტილი?", "How do you combine jewelry and build a refined style?"],
    ["სამკაულებს შეუძლია ყველაზე სადა ჩაცმულობაც კი გამორჩეულად აქციოს.", "Jewelry can make even the simplest outfit stand out."],
    ["სტატიის დამატება", "Add article"],
    ["სტატია ვერ მოიძებნა", "Article not found"],
    ["ბლოგზე დაბრუნება", "Back to the blog"],
    ["შემდეგი სტატია", "Next article"],
    ["იხილეთ კოლექცია", "Browse the collection"],
    ["წუთი კითხვა", "min read"],
    ["წთ კითხვა", "min read"],
    ["გაიგეთ მეტი", "Read more"],

    ["ოქროს ბეჭედი 585", "585 gold ring"],
    ["ბრილიანტის ყელსაბამი", "Diamond necklace"],
    ["ვერცხლის სამაჯური", "Silver bracelet"],
    ["პლატინის საქორწინო ბეჭედი", "Platinum wedding ring"],
    ["ოქროს საყურე 750", "750 gold earrings"],
    ["ოქროს ჯაჭვი 585", "585 gold chain"],
    ["ბრილიანტის საყურე", "Diamond earrings"],
    ["ვერცხლის გულსაკიდი", "Silver pendant"],
    ["ოქროს მაჯის საათი", "Gold wristwatch"],
    ["ოქროს სამაჯური 585", "585 gold bracelet"],
    ["მაღალი ხარისხის სამკაული", "High-quality jewelry"],

    ["Super VIP კოლექცია", "Super VIP collection"],
    ["VIP+ კოლექცია", "VIP+ collection"],
    ["ჯერ არ არის Super VIP განცხადებები", "No Super VIP listings yet"],
    ["ჯერ არ არის VIP განცხადებები", "No VIP listings yet"],
    ["ყველა განცხადება", "All listings"],
    ["ლითონების ფასი: მსოფლიო ბაზრის მიმდინარე ფასი", "Metal prices: current world market price"],
    ["ლითონების ფასი: LBMA-ს ოფიციალური ფიქსინგი", "Metal prices: official LBMA fixing"],
    ["ლითონების ფასი მიახლოებითია — საჭიროების შემთხვევაში შეცვალეთ ხელით", "Metal prices are approximate — edit them if you need to"],
    ["ტროას უნცია", "troy ounce"],
    ["სამკაულის ფასის კალკულატორი", "Jewelry price calculator"],
    ["სუფთა ლითონის ფასი 1 გრამზე (₾)", "Pure metal price per gram (₾)"],
    ["გამოთვლილი ფასი", "Calculated price"],
    ["წონა (გრამი)", "Weight (grams)"],
    ["ლითონის ტიპი", "Metal"],
    ["საძიებო სიტყვა", "Item type"],
    ["მოძებნეთ სამკაული...", "Search jewelry..."],
    ["ვერაფერი მოიძებნა", "Nothing found"],
    ["გასუფთავება", "Clear"],
    ["ძებნა", "Search"],

    ["თეთრი ოქრო", "White gold"],
    ["ვარდისფერი ოქრო", "Rose gold"],
    ["ყვითელი ოქრო", "Yellow gold"],
    ["ოქრო", "Gold"],
    ["ვერცხლი", "Silver"],
    ["პლატინა", "Platinum"],
    ["ბრილიანტი", "Diamond"],
    ["საათი", "Watch"],
    ["ბეჭედი", "Ring"],
    ["სამაჯური", "Bracelet"],
    ["საყურე", "Earrings"],
    ["ბროში", "Brooch"],
    ["ყელსაბამი", "Necklace"],
    ["მონეტა", "Coin"],
    ["ჯვარი", "Cross"],
    ["ჯაჭვი", "Chain"],
    ["გულსაკიდი", "Pendant"],
    ["სხვა", "Other"],
    ["ქალის", "Women's"],
    ["კაცის", "Men's"],
    ["ქალი", "Women"],
    ["მამაკაცი", "Men"],
    ["უნისექსი", "Unisex"],
    ["ფიზიკური პირი", "Individual"],
    ["მაღაზია", "Store"],
    ["ბრენდი", "Brand"],
    ["მარკეტფლეისი", "Marketplace"],

    ["თბილისი", "Tbilisi"],
    ["ბათუმი", "Batumi"],
    ["ქუთაისი", "Kutaisi"],
    ["რუსთავი", "Rustavi"],
    ["ზუგდიდი", "Zugdidi"],
    ["ხაშური", "Khashuri"],
    ["თელავი", "Telavi"],
    ["ფოთი", "Poti"],
    ["გორი", "Gori"],

    ["კრემისფერი", "Cream"],
    ["ბეჟი", "Beige"],
    ["ვარდისფერი", "Pink"],
    ["ატამი", "Peach"],
    ["ლიმონისფერი", "Lemon"],
    ["ფისტისფერი", "Pistachio"],
    ["პიტნისფერი", "Mint"],
    ["ცისფერი", "Blue"],
    ["ლავანდა", "Lavender"],
    ["ლილა", "Lilac"],
    ["ვერცხლისფერი", "Silver tone"],
    ["თეთრი", "White"],
    ["აკვა", "Aqua"],

    ["აკვამარინი", "Aquamarine"],
    ["ალმასი", "Diamond"],
    ["ამეთვისტო", "Amethyst"],
    ["გრანატი", "Garnet"],
    ["ზურმუხტი", "Emerald"],
    ["თვლები", "Gemstones"],
    ["კორალი", "Coral"],
    ["კუბური ცირკონია", "Cubic zirconia"],
    ["ლალი", "Ruby"],
    ["მარგალიტი", "Pearl"],
    ["საფირონი", "Sapphire"],
    ["სერდოლიკი", "Carnelian"],
    ["ტოპაზი", "Topaz"],
    ["ქვის გარეშე", "No stone"],

    ["ბოქლი", "Clasp"],
    ["კარაბინი", "Lobster clasp"],
    ["სტუდები", "Studs"],
    ["ჩამოკიდებული", "Drop"],
    ["ჯაჭვიანი", "Chain"],
    ["ჰუფები", "Hoops"],
    ["ჰეფები", "Hoops"],
    ["ახალივით", "Like new"],
    ["კარგი", "Good"],
    ["მცირე გამოყენების კვალი", "Lightly used"],
    ["ანტიკური", "Antique"],
    ["მეორადი", "Pre-owned"],
    ["ახალი", "New"],
    ["თანამედროვე", "Modern"],
    ["კლასიკური", "Classic"],
    ["მინიმალისტური", "Minimal"],
    ["საქორწილო", "Bridal"],
    ["ლუქსი", "Luxury"],

    ["ნივთს ამშვენებს ბრილიანტი ან ძვირფასი თვლები", "Set with a diamond or precious stones"],
    ["ახალი, გამოუყენებელი ნივთი", "New, unused item"],
    ["გამყიდველის რჩეული განცხადება", "Seller's featured listing"],
    ["გამორჩეული ფასი შეზღუდული დროით", "A standout price for a limited time"],
    ["სასწრაფოდ იყიდება", "Selling urgently"],
    ["ფასი შემცირებულია", "Price reduced"],
    ["იდეალური არჩევანი საჩუქრისთვის", "A good choice for a gift"],
    ["შესაფერისია ქორწილისა და საქორწინო სამკაულისთვის", "Suited to weddings and bridal jewelry"],
    ["რომანტიკული, ნაზი დიზაინი", "A romantic, delicate design"],
    ["ექსკლუზიური ნივთი პრემიუმ ხარისხით", "An exclusive piece of premium quality"],
    ["შესაძლებელია მიტანა ან გაგზავნა", "Delivery or shipping available"],
    ["ცხელი ფასი", "Hot price"],
    ["სასწრაფოდ", "Urgent"],
    ["ფასდაკლება", "Sale"],
    ["საჩუქარი", "Gift"],
    ["სიყვარული", "Love"],
    ["პრემიუმ", "Premium"],
    ["რჩეული", "Featured"],
    ["მიტანა", "Delivery"],

    ["კოლექცია", "Collection"],
    ["კალკულატორი", "Calculator"],
    ["ბლოგი", "Blog"],
    ["მთავარი", "Home"],
    ["კონტაქტი", "Contact"],
    ["დამატება", "Add"],
    ["ფავორიტები ცარიელია", "No favorites yet"],
    ["ცარიელია", "Nothing here"],
    ["ფავორიტები", "Favorites"],
    ["ფავორიტებში დამატება", "Add to favorites"],
    ["ფავორიტებიდან ამოღება", "Remove from favorites"],
    ["შეტყობინებები", "Notifications"],
    ["შეტყობინებები არ არის", "No notifications"],
    ["პროფილი", "Profile"],
    ["თემის შეცვლა", "Switch theme"],
    ["ფასი დოლარში", "Price in dollars"],
    ["ფასი დოლარში (გამორთვა: ლარი)", "Price in dollars (switch off for lari)"],
    ["ფასი ლარში (ჩართვა: დოლარი)", "Price in lari (switch on for dollars)"],
    ["ფასი შეთანხმებით", "Price on request"],
    ["ნახვა", "views"],

    ["შესვლა", "Sign in"],
    ["რეგისტრაცია", "Register"],
    ["ელ-ფოსტა ან მომხმარებლის სახელი", "Email or username"],
    ["პაროლი", "Password"],
    ["პაროლის ჩვენება/დამალვა", "Show or hide password"],
    ["დაგავიწყდათ პაროლი?", "Forgot your password?"],
    ["არ გაქვთ ანგარიში? დარეგისტრირდით", "No account? Register"],
    ["უკვე გაქვთ ანგარიში? შესვლა", "Already have an account? Sign in"],
    ["პაროლის აღდგენა", "Reset password"],
    ["შეიყვანეთ რეგისტრაციის ელფოსტა და გამოგიგზავნით პაროლის აღდგენის ბმულს.", "Enter the email you registered with and we will send a reset link."],
    ["აღდგენის ბმულის გაგზავნა", "Send reset link"],
    ["უკან, შესვლაზე", "Back to sign in"],
    ["რეგისტრაციის ტიპი", "Account type"],
    ["სახელი და გვარი", "Full name"],
    ["სახელი", "Name"],
    ["დასახელება", "Name"],
    ["ელ-ფოსტა", "Email"],
    ["მომხმარებლის სახელი", "Username"],
    ["ტელეფონი", "Phone"],
    ["გაიმეორეთ პაროლი", "Repeat password"],
    ["ახალი პაროლი", "New password"],
    ["შეიყვანეთ პაროლი", "Enter a password"],
    ["ელ-ფოსტა/მომხმარებლის სახელი ან პაროლი არასწორია", "The email, username or password is incorrect"],
    ["მოგესალმებით!", "Welcome!"],
    ["Google-ით შესვლა ამჟამად მიუწვდომელია", "Google sign-in is not available right now"],
    ["თქვენი Google ელ-ფოსტა დადასტურებული არ არის", "Your Google email is not verified"],
    ["ეს ელ-ფოსტა სხვა Google ანგარიშთანაა დაკავშირებული", "This email is linked to another Google account"],
    ["Google-ით შესვლა ვერ მოხერხდა. სცადეთ თავიდან.", "Google sign-in failed. Please try again."],
    ["ძალიან ბევრი მცდელობა, სცადეთ მოგვიანებით", "Too many attempts. Please try again later"],
    ["სერვერთან დაკავშირება ვერ მოხერხდა", "Could not reach the server"],
    ["ან", "or"],

    ["გთხოვთ შეხვიდეთ სისტემაში", "Please sign in"],
    ["განცხადების დასამატებლად მიუთითეთ ტელეფონის ნომერი", "Add a phone number before posting a listing"],
    ["მიუთითეთ ტელეფონის ნომერი პროფილში", "Add a phone number in your profile"],
    ["ჩემი პროფილი", "My profile"],
    ["ჩანაწერი არ არის", "Nothing here yet"],
    ["ანგარიში შექმნილია:", "Account created:"],
    ["განცხადებები:", "Listings:"],
    ["ფოტოს შეცვლა", "Change photo"],
    ["ფოტოს წაშლა", "Remove photo"],
    ["გასვლა", "Sign out"],
    ["გადახდები", "Payments"],
    ["შენახვა", "Save"],
    ["მიუთითეთ რეგისტრაციის ტიპი", "Enter the account type"],

    ["ეს განცხადება ვერ მოიძებნა", "This listing could not be found"],
    ["განცხადება ვერ მოიძებნა", "Listing not found"],
    ["მთავარზე დაბრუნება", "Back to home"],
    ["გამყიდველი ვერ მოიძებნა", "Seller not found"],
    ["გამყიდველი", "Seller"],
    ["განცხადებები არ არის", "No listings"],
    ["განცხადება", "listings"],
    ["უკან", "Back"],
    ["წინ", "Next"],
    ["წინა", "Previous"],
    ["შემდეგი", "Next"],
    ["ფოტოს გადიდება", "Enlarge photo"],
    ["გადიდება", "Enlarge"],
    ["გაზიარება", "Share"],
    ["ფოტოების რედაქტირება", "Edit photos"],
    ["ფოტოები", "Photos"],
    ["წაშლა", "Delete"],
    ["აღწერა", "Description"],
    ["ხმოვანი აღწერა", "Voice description"],
    ["კატეგორია", "Category"],
    ["ნივთის ტიპი", "Item type"],
    ["სქესი", "Gender"],
    ["წონა", "Weight"],
    ["მდებარეობა", "Location"],
    ["სინჯი", "Fineness"],
    ["ქვის ტიპი", "Stone"],
    ["ბეჭდის ზომა", "Ring size"],
    ["ჯაჭვის სიგრძე (სმ)", "Chain length (cm)"],
    ["საკეტის ტიპი", "Clasp"],
    ["საყურის ტიპი", "Earring type"],
    ["სამაჯურის ზომა (სმ)", "Bracelet size (cm)"],
    ["მდგომარეობა", "Condition"],
    ["სტილი", "Style"],
    ["გამოშვების წელი", "Year"],
    ["იხილე გამყიდველის ყველა განცხადება", "See all of this seller's listings"],

    ["ძირითადი მახასიათებლები", "Basic details"],
    ["ფოტო / ვიდეო", "Photo / video"],
    ["დამატებითი ბენეფიტები", "Extra options"],
    ["დასრულება", "Finish"],
    ["დაასათაურე შენი სამკაული", "Name your jewelry"],
    ["ნაბიჯი", "Step"],
    ["განცხადების რედაქტირება", "Edit listing"],
    ["ახალი განცხადება", "New listing"],
    ["ნივთის დასახელება", "Item name"],
    ["ხმოვანი აღწერა (სურვილისამებრ)", "Voice description (optional)"],
    ["ატვირთვა (MP3)", "Upload (MP3)"],
    ["ჩაწერა", "Record"],
    ["გახადეთ თქვენი განცხადება უფრო მიმზიდველი — მოყევით ნივთის შესახებ საკუთარი ხმით. ატვირთეთ MP3 ან ჩაწერეთ პირდაპირ აქ (მაქს. 1 წუთი).", "Make your listing more inviting — tell the story in your own voice. Upload an MP3 or record it here (max 1 minute)."],
    ["წონა (გრ)", "Weight (g)"],
    ["ფასი", "Price"],
    ["ფოტოები (მინ. 3, მაქს. 8)", "Photos (min 3, max 8)"],
    ["ატვირთეთ ფოტოები", "Upload photos"],
    ["გადმოათრიეთ აქ ან აირჩიეთ ფაილები", "Drag files here or choose them"],
    ["აირჩიეთ ფაილები", "choose files"],
    ["პირველი ფოტო იქნება მთავარი", "The first photo is the cover"],
    ["ვიდეო (არასავალდებულო · 1 ვიდეო, მაქს.", "Video (optional · 1 video, max"],
    ["ატვირთეთ ვიდეო", "Upload a video"],
    ["არასავალდებულო ფასიანი ფუნქციები: VIP / Super VIP პაკეტები, ბარათის ფერი და სტიკერები. Regular განცხადება უფასოა.", "Optional paid features: VIP / Super VIP, card color and stickers. A Regular listing is free."],
    ["განცხადების ტიპი", "Listing type"],
    ["Regular — უფასო", "Regular — free"],
    ["უფასო", "free"],
    ["დღე", "days"],
    ["გადაამოწმეთ განცხადება და გამოაქვეყნეთ.", "Review the listing and publish it."],
    ["ვეთანხმები", "I agree to the"],
    ["წესებსა და პირობებს", "terms and conditions"],
    ["შემდეგი", "Next"],
    ["გამოქვეყნება", "Publish"],
    ["მინიმუმ", "minimum"],
    ["აირჩიეთ...", "Choose..."],
    ["ყველა", "All"],
    ["დან", "From"],
    ["მდე", "To"],
    ["არჩევა", "Apply"],

    ["გადახდა ბანკის გადარიცხვით", "Pay by bank transfer"],
    ["მიმღები:", "Recipient:"],
    ["საქართველოს ბანკი", "Bank of Georgia"],
    ["თიბისი ბანკი", "TBC Bank"],
    ["ანგარიშის ნომერი", "Account number"],
    ["ანგარიშის ნომრის კოპირება", "Copy account number"],
    ["კოპირება", "Copy"],
    ["ფერადი გამოყოფა", "Color highlight"],
    ["აირჩიეთ ბარათის ფერი", "Choose the card color"],
    ["არჩეული ფერი:", "Selected color:"],
    ["სტიკერები (არასავალდებულო)", "Stickers (optional)"],
    ["თითოეული", "each"],
    ["მაქს.", "max"],
    ["სულ გადასახდელი", "Total to pay"],
    ["გადახდის ქვითარი (სავალდებულოა)", "Payment receipt (required)"],
    ["ატვირთეთ ქვითარი", "Upload the receipt"],
    ["სურათი ან PDF · PDF მაქს. 1.5MB", "Image or PDF · PDF max 1.5MB"],
    ["ქვითრის ატვირთვა სტატუსს ავტომატურად არ ააქტიურებს — გადახდას ადმინისტრატორი ამოწმებს. დადასტურების შემდეგ სტატუსი ჩაირთვება და ვადა ამ მომენტიდან დაითვლება.", "Uploading a receipt does not turn the feature on. An administrator checks the payment. After approval, the feature starts and the time is counted from that moment."],
    ["არჩეულია", "Selected"],
    ["მოწმდება — გამოჩნდება დადასტურების შემდეგ", "Being checked — it will appear after approval"],
    ["გადახდა არ დადასტურდა", "Payment was not confirmed"],
    ["ყველა დრო", "Any time"],
    ["ბოლო 24 საათი", "Last 24 hours"],
    ["ბოლო 7 დღე", "Last 7 days"],
    ["ბოლო 30 დღე", "Last 30 days"],
    ["თარიღი კლებადი", "Newest first"],
    ["თარიღი ზრდადი", "Oldest first"],
    ["ფასი ზრდადი", "Price: low to high"],
    ["ფასი კლებადი", "Price: high to low"],
    ["სინჯი კლებადი", "Fineness: high to low"],
    ["სინჯი ზრდადი", "Fineness: low to high"],
    ["დღეს", "Today"],
    ["ახლახან", "Just now"],
    ["წუთის წინ", "min ago"],
    ["საათის წინ", "hr ago"],
    ["დღის წინ", "days ago"],
    ["თვის წინ", "mo ago"],
    ["წლის წინ", "yr ago"],
    ["სმ", "cm"],
    ["გრ", "g"],

    ["ზარის მოთხოვნა", "Request a call"],
    ["შეფასება / გვირჩიეთ", "Rate / suggest"],
    ["დახმარება", "Help"],
    ["შეფასება", "Feedback"],
    ["დატოვეთ ნომერი და დაგიკავშირდებით.", "Leave your number and we will call you."],
    ["სასურველი დრო (არასავალდებულო)", "Preferred time (optional)"],
    ["შეტყობინება (არასავალდებულო)", "Message (optional)"],
    ["გაგზავნა", "Send"],
    ["გაუქმება", "Cancel"],
    ["იგზავნება…", "Sending…"],
    ["გაგზავნილია, მადლობა!", "Sent, thank you!"],
    ["გაგზავნა ვერ მოხერხდა, სცადეთ თავიდან", "Could not send. Please try again"],
    ["შეიყვანეთ სახელი", "Enter your name"],
    ["არასწორი ტელეფონის ნომერი", "Invalid phone number"],
    ["როგორ გიყვართ mygem.ge? რას შეცვლიდით ჩვენს საიტზე?", "How do you like mygem.ge? What would you change?"],
    ["რას შეცვლიდით / რა გვაკლია?", "What would you change, or what is missing?"],
    ["თქვენი ელ-ფოსტა ან ტელეფონი (არასავალდებულო)", "Your email or phone (optional)"],
    ["აირჩიეთ შეფასება", "Choose a rating"],
    ["ვარსკვლავი", "stars"],

    ["თქვენი რეკლამის ადგილი", "Your ad space"],
    ["მიაღწიეთ ათასობით მყიდველს", "Reach thousands of buyers"],
    ["გსურთ აქ თქვენი რეკლამა? დაგვიკავშირდით:", "Want your ad here? Contact us:"],
    ["რეკლამის დახურვა", "Close ad"],
    ["რეკლამის ადგილი", "Ad space"],
    ["რეკლამა", "Ad"],

    ["AI აირჩიე და მოირგე", "AI try-on"],
    ["ატვირთეთ თქვენი ფოტო და ნახეთ, როგორ მოგიხდებათ ეს სამკაული.", "Upload your photo and see how this piece looks on you."],
    ["სამკაული", "Jewelry"],
    ["თქვენი ფოტო", "Your photo"],
    ["ატვირთვა", "Upload"],
    ["მზადაა", "Ready"],
    ["შეცვლა", "Change"],
    ["ატვირთეთ თქვენი ფოტო", "Upload your photo"],
    ["გადმოათრიეთ აქ ან აირჩიეთ ფაილი", "Drag a file here or choose one"],
    ["აირჩიეთ ფაილი", "choose a file"],
    ["მოზომვა", "Try on"],
    ["მუშავდება…", "Working…"],
    ["შედეგი", "Result"],
    ["ორიგინალი", "Original"],
    ["ფოტოს ანალიზი…", "Analyzing the photo…"],
    ["სამკაულის მორგება…", "Fitting the jewelry…"],
    ["განათებისა და ჩრდილების დახვეწა…", "Adjusting light and shadow…"],
    ["თითქმის მზადაა…", "Almost ready…"],
    ["ჯერ ატვირთეთ თქვენი ფოტო", "Upload your photo first"],
    ["ფოტო მხოლოდ დასამუშავებლად იგზავნება და საიტზე არ ინახება.", "The photo is sent only for processing and is not stored on the site."]
  ];

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  PAIRS.sort(function (a, b) { return b[0].length - a[0].length; });
  var RULES = PAIRS.map(function (p) {
    return [new RegExp("(?<![\\u10A0-\\u10FF])" + esc(p[0]) + "(?![\\u10A0-\\u10FF])", "g"), p[1]];
  });
  var KA = /[\u10A0-\u10FF]/;
  var textSrc = new WeakMap();
  var busy = false;

  try {
    window.MYGEM_LANG = localStorage.getItem("lang") === "en" ? "en" : "ka";
  } catch (e) {
    window.MYGEM_LANG = "ka";
  }
  if (!window.__titleKa) window.__titleKa = document.title;

  function tr(s) {
    if (!s || !KA.test(s)) return s;
    var out = s;
    for (var i = 0; i < RULES.length; i++) {
      if (out.indexOf(PAIRS[i][0]) === -1) continue;
      RULES[i][0].lastIndex = 0;
      out = out.replace(RULES[i][0], RULES[i][1]);
    }
    return out;
  }

  function paintText(node) {
    if (!textSrc.has(node) && KA.test(node.nodeValue || "")) textSrc.set(node, node.nodeValue);
    var src = textSrc.has(node) ? textSrc.get(node) : node.nodeValue;
    var next = window.MYGEM_LANG === "en" ? tr(src) : src;
    if (next != null && node.nodeValue !== next) node.nodeValue = next;
  }

  function applyLang(root) {
    var scope = root && root.querySelectorAll ? root : document.body;
    if (!scope) return;
    busy = true;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p || p.closest("script,style,textarea,.langsw")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(paintText);
    var attrEls = scope.matches && scope.matches("[placeholder],[aria-label],[alt]") ? [scope] : [];
    if (scope.querySelectorAll) scope.querySelectorAll("[placeholder],[aria-label],[alt]").forEach(function (el) { attrEls.push(el); });
    attrEls.forEach(function (el) {
      if (el.closest(".langsw")) return;
      ["placeholder", "aria-label", "alt"].forEach(function (attr) {
        if (!el.hasAttribute(attr)) return;
        if (!el._i18n) el._i18n = {};
        var cur = el.getAttribute(attr);
        if (el._i18n[attr] == null && KA.test(cur)) el._i18n[attr] = cur;
        var src = el._i18n[attr] != null ? el._i18n[attr] : cur;
        var next = window.MYGEM_LANG === "en" ? tr(src) : src;
        if (next !== cur) el.setAttribute(attr, next);
      });
    });
    var titleNext = window.MYGEM_LANG === "en" ? tr(window.__titleKa) : window.__titleKa;
    if (titleNext && document.title !== titleNext) document.title = titleNext;
    document.documentElement.lang = window.MYGEM_LANG === "en" ? "en" : "ka";
    document.querySelectorAll("[data-setlang]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-setlang") === window.MYGEM_LANG);
    });
    busy = false;
  }

  window.applyLang = applyLang;
  window.setSiteLang = function (code) {
    window.MYGEM_LANG = code === "en" ? "en" : "ka";
    try { localStorage.setItem("lang", window.MYGEM_LANG); } catch (e) {}
    applyLang(document.body);
    if (typeof window.rerender === "function") window.rerender();
  };

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-setlang]");
    if (!b) return;
    e.preventDefault();
    window.setSiteLang(b.getAttribute("data-setlang"));
  });

  new MutationObserver(function (list) {
    if (busy || window.MYGEM_LANG !== "en") return;
    list.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType === 3) paintText(node);
        else if (node.nodeType === 1) applyLang(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  if (document.body) applyLang(document.body);
})();
