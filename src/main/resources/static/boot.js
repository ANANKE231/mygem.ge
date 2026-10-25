(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t !== 'dark' && t !== 'light') t = 'light';
    document.documentElement.dataset.theme = t;
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = t === 'dark' ? '#121418' : '#ffffff';
  } catch (e) {}
})();
window.ADMIN_EMAILS = window.ADMIN_EMAILS || ["mygemge@gmail.com"];
window.METALS_API = "";
window.TRYON_API = "";
window.AUTH_API = "/api/auth/google";
window.BLOG_API = "";
window.SMS_VERIFY = false;
