/* =====================================================================
   (v24) لغة الموقع — العربي هو الأصل، والإنجليزي اختياري
   - لو الزائر اختار English: نقلب اتجاه الصفحة لليسار ونحمّل ملف الترجمة (i18n-en.js) ويترجم نصوص الموقع نفسها.
   - الأسئلة والإجابات وكل شي جاي من قاعدة البيانات يبقى بالعربي.
   - الاختيار ينحفظ بالجهاز، والجوالات تاخذه من رابط الباركود (lang=en).
   - بالعربي هالملف ما يغيّر أي شي بالصفحة (بس يكتب «English» على زر اللغة).
   ===================================================================== */
(function(){
  var KEY = "sahra-lang", lang = "ar";
  try{
    var m = /[?&#]lang=(en|ar)(?=[&#]|$)/.exec(location.search + location.hash);
    if(m){ lang = m[1]; localStorage.setItem(KEY, lang); }
    else if(localStorage.getItem(KEY) === "en") lang = "en";
  }catch(e){}
  window.SAHRA_LANG = lang;
  window.sahraSetLang = function(v){
    try{ localStorage.setItem(KEY, v === "en" ? "en" : "ar"); }catch(e){}
    try{
      var u = new URL(location.href);
      u.searchParams.delete("lang");
      if(u.hash){ var h = new URLSearchParams(u.hash.slice(1)); if(h.has("lang")){ h.delete("lang"); u.hash = h.toString(); } }
      location.replace(u.toString());
    }catch(e){ location.reload(); }
  };
  if(lang === "en"){
    document.documentElement.setAttribute("lang", "en");
    document.documentElement.setAttribute("dir", "ltr");
    document.write('<script src="i18n-en.js?v=24"><\/script>');
  }
  /* زر اللغة: أي عنصر فيه data-lang-btn */
  function wire(){
    var bs = document.querySelectorAll("[data-lang-btn]");
    for(var i = 0; i < bs.length; i++){
      var short = bs[i].getAttribute("data-lang-btn") === "short";   /* زر الشريط العلوي: مختصر (EN / ع) */
      bs[i].textContent = short ? (lang === "en" ? "ع" : "EN") : (lang === "en" ? "عربي" : "English");
      bs[i].setAttribute("title", lang === "en" ? "العربية" : "English");
      bs[i].setAttribute("aria-label", lang === "en" ? "العربية" : "English");
      bs[i].setAttribute("translate", "no");
      bs[i].setAttribute("lang", lang === "en" ? "ar" : "en");
      bs[i].onclick = function(){ window.sahraSetLang(lang === "en" ? "ar" : "en"); };
    }
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
