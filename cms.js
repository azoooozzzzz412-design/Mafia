/* لوحة الأدمن — المحتوى والموقع (C1 + C4): مسودة، تحقق، معاينة، نشر، إصدارات، تراجع، + الإعلانات والتواصل وروابط الفوتر والنصوص القانونية (C4). بدون مكتبات.
   كل التحقق الحقيقي والقفل التفاؤلي عند السيرفر (sql/20)؛ الواجهة تعرض وتحفظ تلقائيًا وتشرح الأخطاء. كل المخرجات مهرّبة (esc) ولا يظهر JSON خام. */
(function(root){
  "use strict";
  var C = null, TOK = 0, G = null, DEF = null, REG = [], REGK = Object.create(null), ov = null, busy = false, saveT = null, prevT = null;
  var S = null;   /* حالة المحرر */
  var MISS_TXT = "⚠️ شغّل ملف SQL رقم 20 أول (المحتوى والموقع) — وبعدها ترجع تفتح هالقسم.";
  var SEC = { hero:"الواجهة الرئيسية", stats:"الأرقام", features:"المميزات", games:"الألعاب", how:"كيف تشتغل", prices:"الأسعار", faq:"الأسئلة الشائعة", final:"الدعوة الختامية", notice:"الإعلانات", contact:"التواصل", links:"روابط الفوتر", legal:"النصوص القانونية" };
  var KL = { "hero.chip":"الشارة العلوية", "hero.h1":"العنوان الرئيسي", "hero.h1_grad":"تكملة العنوان (ملوّنة)", "hero.cta_primary":"زر البداية", "hero.cta_secondary":"الزر الثاني", "hero.trust1":"ميزة 1", "hero.trust2":"ميزة 2", "hero.trust3":"ميزة 3",
    "stats.1":"رقم 1 (وصفه)", "stats.2":"رقم 2 (وصفه)", "stats.3":"رقم 3 (وصفه)", "stats.4":"رقم 4 (وصفه)", "features.eyebrow":"العنوان الصغير", "features.h2":"العنوان", "features.lead":"الوصف", "games.eyebrow":"العنوان الصغير", "games.lead":"الوصف",
    "how.eyebrow":"العنوان الصغير", "how.h2":"العنوان", "how.step1.t":"الخطوة 1 — العنوان", "how.step1.p":"الخطوة 1 — الوصف", "how.step2.t":"الخطوة 2 — العنوان", "how.step2.p":"الخطوة 2 — الوصف", "how.step3.t":"الخطوة 3 — العنوان", "how.step3.p":"الخطوة 3 — الوصف",
    "prices.eyebrow":"العنوان الصغير", "prices.h2":"العنوان", "prices.lead":"الوصف", "faq.eyebrow":"العنوان الصغير", "faq.h2":"العنوان", "faq":"قائمة الأسئلة", "final.h2":"العنوان", "final.p":"الوصف", "final.cta":"نص الزر",
    "notice.items":"الإعلانات (شريط أعلى الرئيسية)", "contact.whatsapp":"رقم الواتساب", "contact.email":"إيميل التواصل", "contact.social":"حسابات التواصل الاجتماعي", "links.footer":"روابط الفوتر الإضافية", "legal.terms.sections":"أقسام الشروط وسياسة الاسترجاع", "legal.privacy.sections":"أقسام سياسة الخصوصية" };
  var ERR = { unknown_group:"قسم غير معروف", unknown_key:"مفتاح غير معروف", bad_type:"نوع القيمة غير صالح", bad_shape:"شكل القائمة غير صالح", empty:"النص فاضي", too_long:"أطول من الحد", forbidden_char:"فيه رموز ممنوعة أو مخفية", bad_url:"رابط غير صالح", host_not_allowed:"موقع الرابط غير مسموح",
    bad_rich:"تنسيق غير مسموح", too_many_items:"عدد العناصر أكثر من المسموح", required:"حقل مطلوب", too_large:"الحجم أكبر من المسموح", bad_schema:"بنية المستند غير صالحة", stale_value:"قيمة قديمة", base_changed:"المسودة مبنية على إصدار أقدم — حدّثها", bad_registry:"مشكلة بسجل المفاتيح",
    bad_enum:"قيمة غير مسموحة", bad_id:"معرّف غير صالح", duplicate:"مكرر", bad_date:"وقت غير صالح", bad_range:"البداية لازم تكون قبل النهاية", host_mismatch:"الرابط ما يطابق نوع الحساب", bad_email:"إيميل غير صالح", bad_phone:"رقم واتساب غير صالح (أرقام دولية بدون + أو 00، مثل 966500000000)", expired:"وقت النهاية مضى — الإعلان ما بيظهر", rate_limited:"كثرة نشر: الحد 120 إصدار بالساعة", checksum_mismatch:"الإصدار الحالي تغيّر خارج اللوحة (بصمة غير مطابقة): استخدم إيقاف الطوارئ أو تواصل مع المطوّر" };
  var RPCERR = { validation_stale:"تغيّرت المسودة بعد آخر تحقق — اضغط «تحقق» من جديد.", legal_review_required:"لازم تأكد مراجعة النصوص القانونية.", nothing_to_publish:"ما فيه تعديلات للنشر.", reason_required:"اكتب سبب التراجع (3 أحرف على الأقل).",
    no_change:"هذا الإصدار هو نفسه المنشور حاليًا.", no_version:"الإصدار غير موجود.", nothing_published:"ما فيه نشر سابق.", checksum_mismatch:"الإصدار تالف (فشل فحص السلامة) — ما نقدر نرجع له.", bad_value:"قيمة غير صالحة.", too_large:"الحجم أكبر من المسموح (64 كيلوبايت).", "not allowed":"ما عندك صلاحية.", rate_limited:"كثرة نشر: الحد 120 إصدار بالساعة", checksum_mismatch:"الإصدار الحالي تغيّر خارج اللوحة (بصمة غير مطابقة): استخدم إيقاف الطوارئ أو تواصل مع المطوّر" };

  function esc(s){ return C ? C.esc(String(s == null ? "" : s)) : String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]; }); }
  function $(id){ return document.getElementById(id); }
  function ic(n){ return window.Adm && window.Adm.icon ? window.Adm.icon(n) : ""; }
  function isMissing(e){ var m = String(e && (e.message || e.details || e) || ""); return /could not find the function|does not exist|42703|42883|PGRST202|schema cache/i.test(m); }
  function msgOf(e){ return String(e && (e.message || e.details || e) || ""); }
  function err(e){
    if(isMissing(e)) return MISS_TXT;
    var m = msgOf(e); for(var k in RPCERR) if(m.indexOf(k) !== -1) return RPCERR[k];
    return C ? C.errText(e) : m;
  }
  function when(iso){ if(!iso) return "—"; try{ return new Date(iso).toLocaleString("ar-EG-u-nu-latn", { timeZone:"Asia/Riyadh", dateStyle:"medium", timeStyle:"short" }); }catch(e){ return String(iso); } }
  function lbl(k){ return HAS.call(KL, k) ? KL[k] : k; }
  function own(o, k, d){ return HAS.call(o, k) ? o[k] : d; }
  function errTxt(c){ return typeof c === "string" && HAS.call(ERR, c) ? ERR[c] : c; }
  function keepLbl(k){ return typeof k === "string" && HAS.call(KEEPL, k) ? KEEPL[k] : k; }
  function cssq(x){ x = String(x); return window.CSS && CSS.escape ? CSS.escape(x) : x.replace(/[^\w-]/g, "\\$&"); }
  function cut(s, n){ s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n) + "…" : s; }
  function isObj(x){ return !!x && typeof x === "object" && !Array.isArray(x); }
  function rpc(name, args){ return C.SB.rpc(name, args).then(function(r){ if(r.error) throw r.error; return C.rpcData(r); }); }
  function pill(t, k){ return '<span class="ov-pill ' + (k || "") + '">' + esc(t) + '</span>'; }

  /* ---------- النصوص الأصلية من index.html ---------- */
  function loadDefaults(){
    if(DEF) return Promise.resolve(DEF);
    return fetch("index.html", { credentials:"same-origin" }).then(function(r){ if(!r.ok) throw new Error("x"); return r.text(); }).then(function(h){
      var doc = new DOMParser().parseFromString(h, "text/html"), t = {}, faq = [];
      Array.prototype.forEach.call(doc.querySelectorAll("[data-cms]"), function(e){ t[e.getAttribute("data-cms")] = String(e.textContent || "").replace(/\s+/g, " ").trim(); });
      var list = doc.querySelector('[data-cms-list="faq"]');
      if(list) Array.prototype.forEach.call(list.children, function(d){ if(d.tagName !== "DETAILS") return; var s = d.querySelector("summary"), p = d.querySelector("p"); if(s && p) faq.push({ q:String(s.textContent || "").replace(/\s+/g, " ").trim(), a:String(p.textContent || "").replace(/\s+/g, " ").trim() }); });
      DEF = { text:t, faq:faq, ok:true }; return DEF;
    }).catch(function(){ DEF = { text:{}, faq:[], ok:false }; return DEF; });
  }

  /* ---------- حالة المحرر ---------- */
  function pubData(){ return (G && G.published && G.published.data) || { schema:1 }; }
  function tv(o){ return isObj(o) ? { ar:String(o.ar || ""), en:String(o.en || "") } : null; }
  function faqFrom(arr){ return (arr || []).map(function(it){ return { q:tv(it && it.q) || { ar:"", en:"" }, a:tv(it && it.a) || { ar:"", en:"" }, on:!it || it.on !== false }; }); }
  function initState(){
    var pub = pubData(), pt = (G.draft && G.draft.patch && G.draft.patch.text) || {}, pl = (G.draft && G.draft.patch && G.draft.patch.list) || {}, text = {}, k;
    for(k in (pub.text || {})) if(tv(pub.text[k])) text[k] = tv(pub.text[k]);
    for(k in pt){ if(pt[k] === null) delete text[k]; else if(tv(pt[k])) text[k] = tv(pt[k]); }
    var fq = (pub.list && pub.list.faq) || null; if("faq" in pl) fq = pl.faq;
    var old = S;
    S = { rev:G.draft.rev, base:G.version, changes:G.draft.changes | 0, text:text, faq:fq ? faqFrom(fq) : null, dirty:{ text:{}, faq:false, c4:{} }, cerr:{}, serr:[], saving:false, again:false, conflict:false, V:G.draft.validated ? { rev:G.draft.rev, ok:true, res:null } : null, vres:null,
      view:(old && old.view) || "edit", prev:old ? old.prev : false, dev:(old && old.dev) || "desktop", saveFail:"", vers:null, diff:null, sel:{},
      pvPage:(old && old.pvPage) || "index", pvNow:(old && old.pvNow) || "", focus:(old && old.focus) || null, c4:{}, c4err:{} };
    c4Init(pub, pl, (G.draft && G.draft.patch && G.draft.patch.url) || {}, (G.draft && G.draft.patch && G.draft.patch.url) || {});
  }
  function pubTv(k){ return tv(pubData().text && pubData().text[k]); }
  function sameTv(a, b){ if(!a && !b) return true; if(!a || !b) return false; return a.ar === b.ar && a.en === b.en; }
  function textDiff(k){ var c = S.text[k] || null; return !sameTv(c ? { ar:c.ar, en:c.en } : null, pubTv(k)); }
  function faqSame(){
    var pl = pubData().list && pubData().list.faq, a = S.faq && S.faq.length ? S.faq : null, b = pl ? faqFrom(pl) : null;
    return JSON.stringify(a) === JSON.stringify(b);
  }
  function maxOf(k){ return REGK[k] && REGK[k].max_len || 400; }
  function dirtyAny(){ return !!Object.keys(S.dirty.text).length || S.dirty.faq || !!Object.keys(S.dirty.c4).length; }

  /* ---------- أخطاء محلية ---------- */
  function checkText(k){
    var v = S.text[k], m = maxOf(k); delete S.cerr[k];
    if(!v) return;
    if(!v.ar.trim() && v.en.trim()) S.cerr[k] = "اكتب النص العربي أول (الإنجليزي اختياري)";
    else if(v.ar.length > m || v.en.length > m) S.cerr[k] = "أطول من الحد (" + m + " حرف)";
    else if(/[<>]/.test(v.ar + v.en)) S.cerr[k] = "فيه رمز ممنوع (< أو >)";
  }
  function checkFaq(){
    delete S.cerr.faq; if(!S.faq) return;
    for(var i = 0; i < S.faq.length; i++){
      var it = S.faq[i]; if(!it.q.ar.trim() || !it.a.ar.trim()){ S.cerr.faq = "سؤال " + (i + 1) + ": اكتب السؤال والجواب بالعربي أو احذف الصف"; return; }
      if(it.q.ar.length > 200 || it.q.en.length > 200 || it.a.ar.length > 800 || it.a.en.length > 800){ S.cerr.faq = "سؤال " + (i + 1) + ": أطول من الحد (السؤال 200، الجواب 800)"; return; }
      if(/[<>]/.test(it.q.ar + it.q.en + it.a.ar + it.a.en)){ S.cerr.faq = "سؤال " + (i + 1) + ": فيه رمز ممنوع (< أو >)"; return; }
    }
  }
  function outTv(v){ var o = { ar:v.ar }; if(v.en.trim()) o.en = v.en; return o; }
  function buildPatch(){
    var patch = {}, n = 0;
    Object.keys(S.dirty.text).forEach(function(k){
      checkText(k); if(S.cerr[k]) return;
      var v = S.text[k]; (patch.text = patch.text || {})[k] = v && v.ar.trim() ? outTv(v) : null; n++;
    });
    if(S.dirty.faq){
      checkFaq();
      if(!S.cerr.faq){ (patch.list = patch.list || {}).faq = S.faq && S.faq.length ? S.faq.map(function(it){ return { q:outTv(it.q), a:outTv(it.a), on:!!it.on }; }) : null; n++; }
    }
    Object.keys(S.dirty.c4).forEach(function(k){
      checkC4(k); if(S.cerr[k]) return;
      if(HAS.call(C4U, k)){ var v = String(S.c4[k] || "").trim(); (patch.url = patch.url || {})[k] = v || null; }
      else { var out = (S.c4[k] || []).map(function(it){ return oItem(k, it); }); (patch.list = patch.list || {})[k] = out.length ? out : null; }
      n++;
    });
    return n ? patch : null;
  }

  /* ---------- حفظ تلقائي ---------- */
  function sched(){ clearTimeout(saveT); saveT = setTimeout(flush, 800); statusRender(); }
  function flush(){
    clearTimeout(saveT);
    if(!S || S.conflict) return Promise.resolve();
    if(S.saving){ S.again = true; return S.p || Promise.resolve(); }
    var patch = buildPatch(); if(!patch){ statusRender(); return Promise.resolve(); }
    var sent = { text:Object.keys(S.dirty.text).filter(function(k){ return !S.cerr[k]; }), faq:!!(patch.list && HAS.call(patch.list, "faq")), c4:Object.keys(S.dirty.c4).filter(function(k){ return !S.cerr[k]; }) };
    sent.text.forEach(function(k){ delete S.dirty.text[k]; }); if(sent.faq) S.dirty.faq = false; sent.c4.forEach(function(k){ delete S.dirty.c4[k]; });
    S.saving = true; S.saveFail = ""; statusRender(); var my = TOK;
    function undo(){ sent.text.forEach(function(k){ S.dirty.text[k] = 1; }); if(sent.faq) S.dirty.faq = true; sent.c4.forEach(function(k){ S.dirty.c4[k] = 1; }); }
    S.p = C.SB.rpc("admin_cfg_save", { p_patch:patch, p_rev:S.rev, p_base:S.base }).then(function(r){
      if(my !== TOK) return; S.saving = false;
      if(r.error){
        undo(); var m = msgOf(r.error);
        if(/stale_rev|base_changed/.test(m)) S.conflict = true; else S.saveFail = err(r.error);
        statusRender(); renderBanners(); return;
      }
      var d = C.rpcData(r) || {};
      if(d.saved === false){ undo(); S.serr = d.errors || []; S.saveFail = "السيرفر رفض الحفظ — راجع الأخطاء"; renderBanners(); statusRender(); return; }
      S.rev = d.rev; S.base = d.base; S.changes = d.changes | 0; S.V = null; S.vres = null; S.serr = []; S.saveFail = "";
      statusRender(); renderBanners(); prevSched();
      if(S.again){ S.again = false; return flush(); }
    }, function(e){ S.saving = false; undo(); S.saveFail = err(e); statusRender(); });
    return S.p;
  }

  /* ---------- شريط الحالة ---------- */
  function statusRender(){
    var el = $("cmsStatus"); if(!el || !S) return;
    var h = '';
    h += G.version ? pill("منشور رقم " + G.version, "ok") : pill("ما فيه نشر — نصوص الموقع الأصلية", "");
    if(S.conflict) h += pill("تعارض", "sale");
    else if(S.saving) h += pill("جاري الحفظ…", "wait");
    else if(dirtyAny() || Object.keys(S.cerr).length) h += pill("غير محفوظ", "wait");
    else if(S.changes > 0) h += pill("مسودة · " + S.changes + " تعديل", "wait");
    else h += pill("بدون تعديلات", "");
    if(S.V && S.V.rev === S.rev && S.V.ok && !dirtyAny()) h += pill("تم التحقق", "ok");
    if(S.saveFail) h += '<span class="cms-fail">' + esc(S.saveFail) + '</span>';
    el.innerHTML = h;
    var pb = $("cmsPub"); if(pb){ var can = canPublish(); pb.disabled = !can; var ki = keepIssues(); pb.title = can ? "" : ki.length ? keepMsg(ki) : "اضغط «تحقق» أول — النشر يحتاج تحقق ناجح من آخر تعديل"; }
    var db = $("cmsDisc"); if(db) db.disabled = S.conflict || !(S.changes > 0 || dirtyAny());
  }
  function keepIssues(){
    var rows = S && S.c4 && S.c4["legal.terms.sections"];
    if(!rows || !rows.some(function(x){ return !x.keep; })) return [];   /* قائمة فاضية/كلها ثابتة = الصفحة الأصلية */
    return ["pay", "contact"].filter(function(kp){ return !rows.some(function(x){ return x.keep === kp && x.on; }); });
  }
  function keepMsg(iss){ return "ناقص قسم ثابت بقائمة الشروط: " + iss.map(function(x){ return "«" + keepLbl(x) + "»"; }).join("، ") + " — بدونه يختفي من صفحة الشروط (وينكسر رابط #contact «الدعم الفني»). أضفه وفعّله من أزرار «قسم ثابت» قبل النشر."; }
  function canPublish(){ return !!(S && S.V && S.V.ok && S.V.rev === S.rev && !dirtyAny() && !S.saving && !S.conflict && S.changes > 0 && !keepIssues().length); }

  function renderBanners(){
    var el = $("cmsBan"); if(!el) return; var h = "";
    if(G && G.checksum_ok === false) h += '<div class="pk-verr cms-ban cms-catbad" id="cmsSumBad" role="alert"><b>⚠️ تنبيه مهم:</b> الإصدار الحالي تغيّر خارج اللوحة (بصمة غير مطابقة): استخدم إيقاف الطوارئ أو تواصل مع المطوّر</div>';
    if(G && G.catalog_ok === false) h += '<div class="pk-verr cms-ban cms-catbad" id="cmsCatBad" role="alert"><b>⚠️ تنبيه مهم:</b> الكتالوج فقد إصدار الإعدادات (cfg_v): الزوار يشوفون النص الأصلي. شغّل <code dir="ltr">sql\\20c_restore_catalog_cfg_v.sql</code></div>';
    if(S.conflict) h += '<div class="pk-verr cms-ban" id="cmsConf" role="alert"><b>تعارض:</b> مسؤول ثاني غيّر المسودة أو نشر إصدار جديد. تعديلاتك غير المحفوظة ما انحفظت. <button class="btn-primary sm" type="button" data-cms="reload">' + ic("refresh") + 'تحديث</button></div>';
    else if(G.draft && G.draft.stale) h += '<div class="pk-note cms-ban" id="cmsStale">المسودة مبنية على إصدار أقدم من المنشور (بعد تراجع أو نشر). <button class="btn-ghost sm" type="button" data-cms="rebase">تحديث المسودة على الإصدار الحالي</button></div>';
    if(S.serr && S.serr.length) h += '<div class="pk-verr cms-ban" id="cmsSerr"><b>رفض السيرفر:</b><ul>' + S.serr.map(function(e){ return '<li>' + errLine(e) + '</li>'; }).join("") + '</ul></div>';
    if(DEF && !DEF.ok) h += '<div class="pk-note cms-ban">ما قدرنا نقرأ النصوص الأصلية من الموقع — يظهر المحرر بدونها.</div>';
    el.innerHTML = h; paintErrs();
  }
  function errLine(e){
    var m = errTxt(e.code) || "خطأ"; if(e.max) m += " (" + e.max + ")"; if(e.lang) m += " · " + (e.lang === "en" ? "English" : "عربي");
    var k = e.key ? lbl(e.key) + (e.path ? " — " + pathLbl(e.key, e.path) : "") : "";
    var go = e.key ? ' data-cmsgo="' + esc(e.key) + '"' + (e.path ? ' data-cmspath="' + esc(e.path) + '"' : "") : "";
    return e.key ? '<button class="cms-go" type="button"' + go + '><b>' + esc((SECOF(e.key) ? SECOF(e.key) + " · " : "") + k) + '</b> — ' + esc(m) + '</button>' : esc(m);
  }
  function pathLbl(key, path){
    var m = /^(\d+)(?:\.(.+))?$/.exec(path || ""); if(!m) return path;
    var n = parseInt(m[1], 10) + 1; if(key === "faq") return "سؤال " + n;
    if(isC4(key)) return (HAS.call(C4U, key) ? "" : "عنصر " + n) + (m[2] && !HAS.call(C4U, key) ? " · " + own(FL, m[2], m[2]) : "");
    return path;
  }
  function SECOF(k){ var r = REGK[k]; return r ? own(SEC, r.section, r.section) : ""; }

  /* ---------- رسم المحرر ---------- */
  function counter(len, max){ return '<small class="cms-cnt' + (len > max ? " bad" : "") + '">' + len + ' / ' + max + '</small>'; }
  function fieldHtml(id, val, max, lang, area, extra){
    var a = 'class="input" ' + extra + ' dir="' + (lang === "en" ? "ltr" : "rtl") + '" lang="' + lang + '" aria-label="' + (lang === "en" ? "English" : "عربي") + '"';
    return '<div class="cms-f"><span class="cms-fl">' + (lang === "en" ? "English" : "عربي") + '</span>' + (area ? '<textarea ' + a + ' rows="2">' + esc(val) + '</textarea>' : '<input ' + a + ' value="' + esc(val) + '" autocomplete="off">') + counter(val.length, max) + '</div>';
  }
  function keyHtml(r){
    var k = r.key, v = S.text[k] || { ar:"", en:"" }, d = DEF && DEF.text[k], p = pubTv(k), m = r.max_len || 120, area = m > 120 || (d && d.length > 70);
    var diff = textDiff(k), has = !!S.text[k];
    return '<div class="cms-key" data-cmskey="' + esc(k) + '"><div class="cms-kh"><b>' + esc(lbl(k)) + '</b><code>' + esc(k) + '</code>' + (r.legal ? pill("نص قانوني", "sale") : "") + '<span class="cms-badge-slot">' + (diff ? pill("معدّل عن المنشور", "wait") : "") + '</span>'
      + '<button class="btn-ghost sm cms-rv" type="button" data-cmsrev="' + esc(k) + '"' + (has ? "" : " hidden") + '>رجوع للأصل</button></div>'
      + '<div class="cms-def"><span>النص الحالي بالموقع</span><q>' + esc(DEF && DEF.ok ? (d || "—") : "غير متاح") + '</q></div>'
      + (p && p.ar ? '<div class="cms-def cms-pubv"><span>المنشور الآن</span><q>' + esc(p.ar) + (p.en ? ' · ' + esc(p.en) : "") + '</q></div>' : "")
      + '<div class="cms-pair">' + fieldHtml(k, v.ar, m, "ar", area, 'data-cmsf="' + esc(k) + '" data-l="ar"') + fieldHtml(k, v.en, m, "en", area, 'data-cmsf="' + esc(k) + '" data-l="en"') + '</div>'
      + '<div class="cms-kerr" data-cmskerr="' + esc(k) + '">' + (S.cerr[k] ? esc(S.cerr[k]) : "") + '</div></div>';
  }
  function faqRowHtml(it, i, n){
    function f(part, lang, max, area){ return fieldHtml("", it[part][lang], max, lang, area, 'data-faqf="' + i + '.' + part + '.' + lang + '"'); }
    return '<div class="cms-fr' + (it.on ? "" : " off") + '" data-faqrow="' + i + '"><div class="cms-frh"><b>سؤال ' + (i + 1) + '</b>'
      + '<label class="sl-toggle pk-sw" title="إظهار / إخفاء"><span class="switch"><input type="checkbox" data-faqon="' + i + '"' + (it.on ? " checked" : "") + ' aria-label="إظهار السؤال"><span></span></span><span><small>' + (it.on ? "ظاهر" : "مخفي") + '</small></span></label>'
      + '<span class="cms-sp"></span><button class="btn-ghost sm cms-ib" type="button" data-faqup="' + i + '"' + (i === 0 ? " disabled" : "") + ' aria-label="للأعلى" title="للأعلى"><span class="cms-up">' + ic("chevdown") + '</span></button>'
      + '<button class="btn-ghost sm cms-ib" type="button" data-faqdn="' + i + '"' + (i === n - 1 ? " disabled" : "") + ' aria-label="للأسفل" title="للأسفل">' + ic("chevdown") + '</button>'
      + '<button class="btn-ghost sm cms-ib cms-del" type="button" data-faqdel="' + i + '" aria-label="حذف" title="حذف">' + ic("x") + '</button></div>'
      + '<div class="cms-lab">السؤال</div><div class="cms-pair">' + f("q", "ar", 200, true) + f("q", "en", 200, true) + '</div><div class="cms-lab">الجواب</div><div class="cms-pair">' + f("a", "ar", 800, true) + f("a", "en", 800, true) + '</div></div>';
  }
  function faqHtml(){
    var rows = S.faq || [], n = rows.length, diff = !faqSame();
    var h = '<div class="cms-key cms-faqbox" data-cmskey="faq"><div class="cms-kh"><b>قائمة الأسئلة الشائعة</b><code>faq</code><span class="cms-badge-slot">' + (diff ? pill("معدّل عن المنشور", "wait") : "") + '</span></div>'
      + '<div class="pk-note">القائمة المنشورة هي القائمة الكاملة: الأسئلة الستة الأصلية تختفي، وسؤالا «كيف أدفع؟» و«وش هي الجولة؟» نصهما يتولد تلقائيًا من الإعدادات الحالية وما يظهر إلا لو أضفته هنا.</div>'
      + '<div class="cms-faqtools"><button class="btn-ghost sm" type="button" data-faq="defaults">' + ic("refresh") + 'ابدأ من الأسئلة الأصلية</button><button class="btn-primary sm" type="button" data-faq="add"' + (n >= 20 ? " disabled" : "") + '>' + ic("plus") + 'سؤال جديد</button>'
      + (S.faq ? '<button class="btn-ghost sm" type="button" data-faq="clear">رجوع للقائمة الأصلية</button>' : "") + '<small class="cms-cnt">' + n + ' / 20</small></div>'
      + (n ? "" : '<div class="empty">' + (S.faq ? "القائمة فاضية" : "ما غيّرت القائمة — الموقع يعرض الأسئلة الأصلية.") + '</div>')
      + '<div class="cms-faqrows">' + rows.map(function(it, i){ return faqRowHtml(it, i, n); }).join("") + '</div><div class="cms-kerr" data-cmskerr="faq">' + (S.cerr.faq ? esc(S.cerr.faq) : "") + '</div></div>';
    return h;
  }
  function editHtml(){
    var secs = {}, order = [];
    REG.slice().sort(function(a, b){ return (a.sort | 0) - (b.sort | 0); }).forEach(function(r){ if(!secs[r.section]){ secs[r.section] = []; order.push(r.section); } secs[r.section].push(r); });
    return order.map(function(s){
      return '<section class="cms-sec card" data-cmssec="' + esc(s) + '"><h4>' + esc(own(SEC, s, s)) + '</h4>' + secs[s].map(function(r){ return r.kind === "list" ? (r.key === "faq" ? faqHtml() : HAS.call(C4L, r.key) ? c4Html(r) : "") : HAS.call(C4U, r.key) ? c4UrlHtml(r) : keyHtml(r); }).join("") + '</section>';
    }).join("");
  }
  function render(){
    var h = '<div class="cms-top"><div class="cms-status" id="cmsStatus" aria-live="polite"></div>'
      + '<div class="cms-acts"><button class="btn-ghost sm" type="button" id="cmsVal">' + ic("check") + 'تحقق</button><button class="btn-ghost sm' + (S.prev ? " on" : "") + '" type="button" id="cmsPrev" aria-pressed="' + (S.prev ? "true" : "false") + '">' + ic("eye") + 'معاينة</button>'
      + '<button class="btn-primary sm" type="button" id="cmsPub" disabled>' + ic("upload") + 'نشر</button><button class="btn-ghost sm cms-danger" type="button" id="cmsDisc">تجاهل المسودة</button></div></div>'
      + '<div class="cms-tabs"><button class="chip' + (S.view === "edit" ? " on" : "") + '" type="button" data-cmsview="edit">التحرير</button><button class="chip' + (S.view === "vers" ? " on" : "") + '" type="button" data-cmsview="vers">' + ic("history") + 'الإصدارات</button></div>'
      + '<div id="cmsBan"></div><div id="cmsValBox"></div><div id="cmsPrevBox"></div>'
      + '<div id="cmsEdit"' + (S.view === "edit" ? "" : " hidden") + '>' + (DEF ? editHtml() : "") + '</div><div id="cmsVers"' + (S.view === "vers" ? "" : " hidden") + '></div>';
    C.box.innerHTML = '<div class="cms-wrap"><div class="pk-top"><div><h2 class="sec" style="margin:0">المحتوى والموقع</h2><p class="hint" style="margin:2px 0 0">عدّل نصوص الصفحة الرئيسية: تنحفظ مسودة تلقائيًا، وما تظهر للزوار إلا بعد «تحقق» ثم «نشر». أي وقت تقدر ترجع لإصدار سابق.</p></div></div>' + h + '</div>';
    statusRender(); renderBanners(); renderValBox(); renderPrev(); if(S.view === "vers") loadVersions();
    Object.keys(C4L).concat(Object.keys(C4U)).forEach(function(k){ if(S.c4[k] != null && REGK[k]) checkC4(k, !S.dirty.c4[k]); }); paintErrs();
  }

  /* ---------- تحقق ---------- */
  function renderValBox(){
    var el = $("cmsValBox"); if(!el) return; var r = S.vres; if(!r){ el.innerHTML = ""; return; }
    var h;
    if(r.errors && r.errors.length) h = '<div class="pk-verr cms-ban" id="cmsVerr"><b>التحقق فشل (' + r.errors.length + '):</b><ul>' + r.errors.map(function(e){ return '<li>' + errLine(e) + '</li>'; }).join("") + '</ul></div>';
    else h = '<div class="pk-check ok cms-ban" id="cmsVok">' + ic("check") + 'التحقق نجح — ' + (r.changes | 0) + ' تعديل جاهز للنشر.' + (r.legal_review_required ? ' فيه نص قانوني معدّل: بيُطلب تأكيد المراجعة عند النشر.' : '')
      + ((r.warnings || []).length ? '<ul>' + r.warnings.map(function(w){ return '<li>' + esc(lbl(w.key || "")) + (w.path ? " (" + esc(pathLbl(w.key, w.path)) + ")" : "") + ': ' + (w.code === "no_en" ? "بدون نص إنجليزي (يظهر العربي للزوار بالإنجليزي)" : esc(errTxt(w.code))) + '</li>'; }).join("") + '</ul>' : '') + '</div>';
    el.innerHTML = h; paintErrs();
  }
  function validate(){
    var b = $("cmsVal"); if(b) b.disabled = true;
    return flush().then(function(){
      if(S.conflict) return; if(Object.keys(S.cerr).length){ S.vres = { errors:Object.keys(S.cerr).map(function(k){ return { key:k, code:"bad_value" }; }) }; renderValBox(); return; }
      return rpc("admin_cfg_validate", {}).then(function(d){
        d = d || {}; S.vres = d; S.V = { rev:d.rev, ok:!!(d.ok && d.validated), res:d }; renderValBox(); statusRender();
      });
    }).catch(function(e){ C.toast("⚠️ " + err(e)); }).then(function(){ var b2 = $("cmsVal"); if(b2) b2.disabled = false; });
  }
  function goKey(k, path){
    var tgt = null;
    if(k === "faq" && path){ var i = parseInt(path, 10); tgt = document.querySelector('[data-faqrow="' + i + '"]'); }
    else if(isC4(k) && path && /^\d+/.test(path)) tgt = document.querySelector('[data-c4row="' + cssq(k + ":" + parseInt(path, 10)) + '"]');
    tgt = tgt || document.querySelector('[data-cmskey="' + cssq(k) + '"]'); if(!tgt) return;
    if(S.view !== "edit") setView("edit");
    tgt.scrollIntoView({ block:"center", behavior:"smooth" }); tgt.classList.remove("cms-flash"); void tgt.offsetWidth; tgt.classList.add("cms-flash");
    var f = tgt.querySelector("input,textarea"); if(f) try{ f.focus({ preventScroll:true }); }catch(e){}
  }

  /* ---------- معاينة ---------- */
  function previewData(){
    var pub = pubData(), out = { schema:1 }, g;
    for(g in pub) if(g !== "text" && g !== "list" && g !== "schema") out[g] = pub[g];
out.text = {}; Object.keys(S.text).forEach(function(k){ var v = S.text[k]; if(v && v.ar.trim() && !/[<>]/.test(v.ar + v.en)) out.text[k] = outTv(v); });
    if(S.faq && S.faq.length){ var items = S.faq.filter(function(it){ return it.q.ar.trim() && it.a.ar.trim(); }).map(function(it){ return { q:outTv(it.q), a:outTv(it.a), on:!!it.on }; }); if(items.length) out.list = { faq:items }; }
    out.url = {};
    Object.keys(C4U).forEach(function(k){ var v = String(S.c4[k] || "").trim(); if(v && !checkC4(k).length) out.url[k] = v; });
    Object.keys(C4L).forEach(function(k){
      if(!S.c4[k]) return;
      var good = S.c4[k].filter(function(it){ var t = it.keep ? true : k === "notice.items" ? it.text.ar.trim() : k === "links.footer" ? it.label.ar.trim() && it.href.trim() : k === "contact.social" ? it.url.trim() : it.h.ar.trim() && it.body.ar.trim(); return !!t && !/[<>]/.test(JSON.stringify(it)); });
      if(good.length){ out.list = out.list || {}; out.list[k] = good.map(function(it){ return oItem(k, it); }); }
    });
    if(!Object.keys(out.url).length) delete out.url;
    return out;
  }
  function prevPost(){
    var f = $("cmsFrame"); if(!f || !f.contentWindow || !S || location.origin === "null") return;
    try{ var msg = { type:"sahra-cfg-preview", data:previewData() }; if(S.pvNow) msg.now = dtOut(S.pvNow); if(S.focus) msg.focus = S.focus; f.contentWindow.postMessage(msg, location.origin); }catch(e){}
  }
  function prevSched(){ if(!S.prev) return; clearTimeout(prevT); prevT = setTimeout(prevPost, 250); }
  var WID = { desktop:"100%", tablet:"768px", mobile:"390px" };
  function renderPrev(){
    var el = $("cmsPrevBox"); if(!el) return;
    if(!S.prev){ el.innerHTML = ""; return; }
    var PG = { index:"index.html", terms:"terms.html", privacy:"privacy.html" };
    el.innerHTML = '<div class="cms-prev card"><div class="cms-prevh"><b>معاينة المسودة</b><span class="cms-dev c4-pg">' + [["index", "الرئيسية"], ["terms", "الشروط"], ["privacy", "الخصوصية"]].map(function(d){ return '<button class="chip' + (S.pvPage === d[0] ? " on" : "") + '" type="button" data-cmspg="' + d[0] + '">' + d[1] + '</button>'; }).join("") + '</span><span class="cms-dev">' + [["desktop", "كمبيوتر"], ["tablet", "تابلت 768"], ["mobile", "جوال 390"]].map(function(d){ return '<button class="chip' + (S.dev === d[0] ? " on" : "") + '" type="button" data-cmsdev="' + d[0] + '">' + d[1] + '</button>'; }).join("") + '</span></div>'
      + '<div class="c4-pvbar"><label class="c4-pvnow"><span>كأننا بتاريخ (الرياض):</span><input class="input" type="datetime-local" step="60" id="cmsPvNow" value="' + esc(S.pvNow) + '"></label><button class="btn-ghost sm" type="button" data-c4a="pvnow0">الوقت الحقيقي</button>' + (S.focus && S.pvPage === "index" ? '<small class="hint">يعرض الإعلان المحدد حتى لو خارج فترته</small><button class="btn-ghost sm" type="button" data-c4a="pvfocus0">حسب الجدول الفعلي</button>' : '') + '</div>'
      + '<div class="cms-frame-w"><iframe id="cmsFrame" title="معاينة الموقع" src="' + PG[S.pvPage] + '?cfg-preview=1" style="width:' + WID[S.dev] + '"></iframe></div></div>';
    $("cmsFrame").addEventListener("load", function(){ prevPost(); setTimeout(prevPost, 600); });
  }

  /* ---------- نوافذ ---------- */
  function shell(title, body){
    close(); ov = document.createElement("div"); ov.className = "ov"; ov.id = "cmsOv";
    ov.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3><div id="cmsMBody">' + body + '</div></div>'; document.body.appendChild(ov);
    ov.addEventListener("click", function(e){ if(e.target === ov && !busy) close(); });
  }
  function close(){ if(ov){ ov.remove(); ov = null; } busy = false; }
  document.addEventListener("keydown", function(e){ if(e.key === "Escape" && ov && !busy) close(); });

  function pubModal(){
    shell("نشر التعديلات", '<p class="hint">بينشر ' + (S.changes | 0) + ' تعديل للزوار فورًا (إصدار جديد برقم ' + (G.version + 1) + '). تقدر ترجع لأي إصدار سابق من قسم «الإصدارات».</p>'
      + '<label class="field"><span>ملاحظة (اختياري)</span><textarea class="input" id="cmsNote" rows="2" maxlength="300" placeholder="مثلاً: تحديث عروض رمضان"></textarea></label>'
      + '<div id="cmsPubSlot"><div class="empty">… جاري تحميل المقارنة</div></div>'
      + '<div class="pk-verr" id="cmsMErr" hidden></div><div class="m-btns"><button class="btn-primary" type="button" id="cmsDoPub" disabled>نشر الآن</button><button class="btn-ghost" type="button" id="cmsMCancel">إلغاء</button></div>');
    var myT = TOK, ready = false, lg = false, lc = null;
    function gate(){ var b = $("cmsDoPub"); if(b) b.disabled = busy || !ready || (lg && !(lc && lc.checked)); }
    $("cmsMCancel").addEventListener("click", close);
    /* المقارنة دايمًا من السيرفر (حتى بعد تحديث الصفحة)، والمفتاح ما يشتغل إلا بعد ما تنعرض */
    rpc("admin_cfg_get", {}).then(function(d){
      var slot = $("cmsPubSlot"); if(!slot || myT !== TOK) return; d = d || {};
      var dr = d.draft || {}, ks = Array.isArray(d.legal_changed) ? d.legal_changed : [], iss = keepIssues(), h = "";
      if((dr.rev != null && (dr.rev | 0) !== (S.rev | 0)) || (d.version | 0) !== (S.base | 0)){ slot.innerHTML = '<div class="pk-verr">تغيّرت المسودة أو الإصدار المنشور من مكان ثاني بعد ما فتحت النافذة — اقفلها وحدّث الصفحة قبل النشر.</div>'; return; }
      if(iss.length){ slot.innerHTML = '<div class="pk-verr">' + esc(keepMsg(iss)) + '</div>'; return; }
      lg = ks.length > 0;
      if(lg && !(d.changes || []).some(function(c){ return c && c.legal; })){ lg = false; slot.innerHTML = '<div class="pk-verr">ما قدرنا نعرض مقارنة النص القانوني — النشر موقوف. جرّب تحدّث الصفحة.</div>'; return; }
      if(lg) h += '<div class="pk-note">فيه نص قانوني معدّل: ' + ks.map(function(k){ return esc(lbl(k)); }).join("، ") + '. راجع المقارنة تحت، وأكّد أنك راجعت النصوص القانونية المعدّلة قبل النشر.</div><div class="c4-ld" id="cmsLgDiff">' + legalDiffHtml(d.changes) + '</div>';
      h += impHtml();   /* تنبيهات الاستيراد قبل مفتاح «راجعت النص»: تنقرا أول ثم يتأكد */
      if(lg) h += '<label class="sl-toggle pk-sw"><span class="switch"><input type="checkbox" id="cmsLegal"><span></span></span><span><b>راجعت النص</b></span></label>';
      slot.innerHTML = h; lc = $("cmsLegal"); if(lc) lc.addEventListener("change", gate);
      ready = true; gate();
    }, function(e){ var slot = $("cmsPubSlot"); if(slot && myT === TOK) slot.innerHTML = '<div class="pk-verr">' + esc(err(e)) + ' — ما نقدر ننشر قبل ما تظهر المقارنة.</div>'; });
    $("cmsDoPub").addEventListener("click", function(){
      if(busy || !ready || (lg && !(lc && lc.checked))) return; busy = true; $("cmsDoPub").disabled = true; var eb = $("cmsMErr"); eb.hidden = true;
      C.SB.rpc("admin_cfg_publish", { p_base:S.base, p_note:($("cmsNote").value || "").trim() || null, p_legal_reviewed:!!(lg && lc && lc.checked) }).then(function(x){
        busy = false; if(x.error){ var m = msgOf(x.error); if(/base_changed/.test(m)){ close(); S.conflict = true; statusRender(); renderBanners(); return; } eb.textContent = err(x.error); eb.hidden = false; gate(); return; }
        var d = C.rpcData(x) || {}; if(d.published === false){ eb.innerHTML = '<ul>' + (d.errors || []).map(function(e){ return '<li>' + esc(errTxt(e.code)) + (e.key ? ' — ' + esc(lbl(e.key)) : '') + '</li>'; }).join("") + '</ul>'; eb.hidden = false; gate(); return; }
        close(); C.toast("✅ اننشر الإصدار رقم " + d.version); S.view = "edit"; load(C);
      }, function(e){ busy = false; eb.textContent = err(e); eb.hidden = false; gate(); });
    });
  }
  function discModal(){
    shell("تجاهل المسودة", '<p class="hint">بتنحذف كل التعديلات غير المنشورة (' + (S.changes | 0) + ') وترجع النصوص مثل المنشور. ما يتأثر الموقع الحالي.</p><div class="pk-verr" id="cmsMErr" hidden></div><div class="m-btns"><button class="btn-primary cms-dangerb" type="button" id="cmsDoDisc">تجاهل المسودة</button><button class="btn-ghost" type="button" id="cmsMCancel">إلغاء</button></div>');
    $("cmsMCancel").addEventListener("click", close);
    $("cmsDoDisc").addEventListener("click", function(){
      if(busy) return; busy = true; $("cmsDoDisc").disabled = true;
      rpc("admin_cfg_discard", {}).then(function(){ busy = false; close(); C.toast("🗑️ انتجاهلت المسودة"); load(C); }, function(e){ busy = false; $("cmsDoDisc").disabled = false; var eb = $("cmsMErr"); eb.textContent = err(e); eb.hidden = false; });
    });
  }

  /* ---------- الإصدارات ---------- */
  function setView(v){ S.view = v; var a = $("cmsEdit"), b = $("cmsVers"); if(a) a.hidden = v !== "edit"; if(b) b.hidden = v !== "vers"; Array.prototype.forEach.call(C.box.querySelectorAll("[data-cmsview]"), function(x){ x.classList.toggle("on", x.getAttribute("data-cmsview") === v); }); if(v === "vers") loadVersions(); }
  function loadVersions(){
    var el = $("cmsVers"); if(!el) return; el.innerHTML = '<div class="empty">… جاري التحميل</div>'; var my = TOK;
    rpc("admin_cfg_versions", { p_limit:50 }).then(function(d){ if(my !== TOK) return; S.vers = d || { versions:[], current:0, total:0 }; renderVersions(); }, function(e){ if(my === TOK && $("cmsVers")) $("cmsVers").innerHTML = '<div class="pk-verr">' + esc(err(e)) + '</div>'; });
  }
  function renderVersions(){
    var el = $("cmsVers"); if(!el) return; var V = S.vers, vs = V.versions || [];
    var h = '<div class="cms-vh"><p class="hint" style="margin:0">اختر إصدارين للمقارنة، أو ارجع لإصدار سابق (ينتشر كإصدار جديد ولا يُحذف شي من السجل).</p><button class="btn-ghost sm" type="button" id="cmsCmp" disabled>قارن المحدّد</button></div>';
    h += '<div class="cms-vlist">' + vs.map(function(v){
      return '<div class="cms-v card' + (v.current ? " cur" : "") + '" data-cmsv="' + (v.version | 0) + '"><label class="cms-vsel"><input type="checkbox" data-cmsvc="' + (v.version | 0) + '" aria-label="تحديد للمقارنة"></label><div class="cms-vb"><div class="cms-vt"><b>إصدار ' + (v.version | 0) + '</b>' + (v.current ? pill("الحالي", "ok") : "") + pill(v.kind === "rollback" ? "تراجع" : "نشر", v.kind === "rollback" ? "wait" : "") + (v.checksum_ok === false ? pill("⚠️ بصمة غير مطابقة", "sale") : "")
        + '<small>' + esc(when(v.created_at)) + ' · ' + esc(v.by || "—") + ' · ' + (v.keys | 0) + ' مفتاح</small></div>' + (v.note ? '<div class="cms-vn">' + esc(v.note) + '</div>' : '') + '</div>'
        + (v.current ? '' : '<button class="btn-ghost sm" type="button" data-cmsrb="' + (v.version | 0) + '">تراجع لهذا الإصدار</button>') + '</div>';
    }).join("") + '</div>';
    if(!vs.length) h += '<div class="empty">ما فيه إصدارات منشورة بعد — الموقع يعرض نصوصه الأصلية.</div>';
    h += '<div class="cms-v card cms-zero"><label class="cms-vsel"><input type="checkbox" data-cmsvc="0" aria-label="تحديد للمقارنة"></label><div class="cms-vb"><div class="cms-vt"><b>إصدار 0</b>' + pill("نصوص الموقع الأصلية", "") + '</div><div class="cms-vn">الصفحة بدون أي تعديل من اللوحة.</div></div>'
      + '<button class="btn-primary sm cms-dangerb" type="button" id="cmsKill"' + (V.current ? "" : " disabled") + '>إرجاع لنصوص الموقع الأصلية (إصدار 0)</button></div>';
    h += '<div id="cmsDiff"></div>';
    el.innerHTML = h; if(S.diff) renderDiff();
  }
  function valHtml(g, v){
    if(v == null) return '<i class="cms-nov">—</i>';
    if(g === "list") return '<ol class="cms-dl">' + (Array.isArray(v) ? v : []).map(function(it){ var t = it && ((it.q && it.q.ar) || (it.text && it.text.ar) || (it.label && it.label.ar) || (it.h && it.h.ar) || (it.keep && ("قسم ثابت: " + keepLbl(it.keep))) || it.url || it.kind || it.id); return '<li' + (it && it.on === false ? ' class="off"' : '') + '>' + esc(cut(t, 70)) + '</li>'; }).join("") + '</ol>';
    if(g === "url") return '<span class="cms-dv" dir="ltr">' + esc(cut(v, 160)) + '</span>';
    return '<span class="cms-dv">' + esc(cut(v && v.ar, 160)) + '</span>' + (v && v.en ? '<span class="cms-dv en" dir="ltr">' + esc(cut(v.en, 160)) + '</span>' : "");
  }
  function renderDiff(){
    var el = $("cmsDiff"); if(!el || !S.diff) return; var d = S.diff, OP = { add:["إضافة", "ok"], change:["تعديل", "wait"], remove:["حذف", "sale"] };
    var h = '<h4 class="cms-dh">مقارنة إصدار ' + (d.a | 0) + ' ← إصدار ' + (d.b | 0) + '</h4>';
    if(d.same || !(d.changes || []).length) h += '<div class="empty">ما فيه فرق بين الإصدارين.</div>';
    else h += '<div class="cms-drows">' + d.changes.map(function(c){ var o = own(OP, c.op, ["", ""]);
      return '<div class="cms-dr card"><div class="cms-drh"><b>' + esc(lbl(c.key)) + '</b><code>' + esc(c.key) + '</code>' + pill(o[0], o[1]) + (c.legal ? pill("نص قانوني", "sale") : "") + '</div><div class="cms-dc"><div><small>قبل</small>' + valHtml(c.group, c.before) + '</div><div><small>بعد</small>' + valHtml(c.group, c.after) + '</div></div></div>'; }).join("") + '</div>';
    el.innerHTML = h;
  }
  function compare(){
    var ids = Array.prototype.map.call(C.box.querySelectorAll("[data-cmsvc]:checked"), function(x){ return parseInt(x.getAttribute("data-cmsvc"), 10); }).sort(function(a, b){ return a - b; });
    if(ids.length !== 2) return; var b = $("cmsCmp"); b.disabled = true;
    rpc("admin_cfg_diff", { a:ids[0], b:ids[1] }).then(function(d){ S.diff = d; renderDiff(); var e = $("cmsDiff"); if(e) e.scrollIntoView({ block:"nearest", behavior:"smooth" }); }, function(e){ C.toast("⚠️ " + err(e)); }).then(function(){ var b2 = $("cmsCmp"); if(b2) b2.disabled = false; });
  }
  function rbModal(ver){
    var zero = ver === 0;
    shell(zero ? "إرجاع لنصوص الموقع الأصلية" : "التراجع لإصدار " + ver,
      (zero ? '<div class="pk-verr"><b>تنبيه:</b> كل نصوص الموقع المنشورة بترجع لنصوص الصفحة الأصلية (إصدار 0) فورًا. تقدر ترجع تنشر أي إصدار سابق بعدها.</div>' : '<p class="hint" id="cmsRbHint">بيصير إصدار ' + ver + ' هو المنشور للزوار (كإصدار جديد — جاري قراءة الرقم…).</p>')
      + '<label class="field"><span>سبب التراجع (إلزامي)</span><input class="input" id="cmsReason" maxlength="300" autocomplete="off" placeholder="مثلاً: خطأ بالعرض"></label>'
      + (zero ? '<label class="sl-toggle pk-sw"><span class="switch"><input type="checkbox" id="cmsKillOk"><span></span></span><span><b>أفهم أن الموقع بيرجع لنصوصه الأصلية كلها</b></span></label>' : '<div id="cmsRbLg"><div class="empty">… جاري تحميل المقارنة</div></div>')
      + '<div class="pk-verr" id="cmsMErr" hidden></div><div class="m-btns"><button class="btn-primary cms-dangerb" type="button" id="cmsDoRb" disabled>' + (zero ? 'إرجاع للأصل' : 'تراجع') + '</button><button class="btn-ghost" type="button" id="cmsMCancel">إلغاء</button></div>');
    var rs = $("cmsReason"), ok = $("cmsKillOk"), go = $("cmsDoRb"), lgNeed = false, lgReady = zero, lc2 = null, myT2 = TOK, rbCur = null;
    function sync(){ go.disabled = busy || !lgReady || rs.value.trim().length < 3 || (zero && !ok.checked) || (lgNeed && !(lc2 && lc2.checked)); }
    /* نقرأ الإصدار الحالي من السيرفر كل مرة قبل المقارنة (مو من القائمة القديمة) */
    function loadDiff(){
      lgNeed = false; lgReady = false; lc2 = null; sync();
      var bx0 = $("cmsRbLg"); if(bx0) bx0.innerHTML = '<div class="empty">… جاري تحميل المقارنة</div>';
      rpc("admin_cfg_versions", { p_limit:50 }).then(function(V){
        if(myT2 !== TOK || !$("cmsRbLg")) return; V = V || {}; S.vers = V;
        var cur = V.current | 0, vs = V.versions || [], top = vs.length ? (vs[0].version | 0) : cur; rbCur = cur;
        var hint = $("cmsRbHint"); if(hint) hint.textContent = 'بيصير إصدار ' + ver + ' هو المنشور للزوار (كإصدار جديد برقم ' + (Math.max(top, cur) + 1) + ').';
        if(cur === ver){ $("cmsRbLg").innerHTML = '<div class="pk-verr">هذا الإصدار هو المنشور حاليًا — ما فيه شي يتراجع له.</div>'; return; }
        return rpc("admin_cfg_diff", { a:cur, b:ver }).then(function(d){
          if(myT2 !== TOK || !$("cmsRbLg")) return;
          var rows = ((d || {}).changes || []).filter(function(c){ return c.legal; }), bx = $("cmsRbLg"); bx.innerHTML = "";
          if(rows.length){
            lgNeed = true;
            bx.innerHTML = '<div class="pk-note">التراجع يغيّر نصوص قانونية: ' + rows.map(function(c){ return esc(lbl(c.key)); }).join("، ") + '. راجع المقارنة تحت (قبل = المنشور الآن، بعد = بعد التراجع)، وأكّد أنك راجعت النصوص القانونية قبل التراجع.</div><div class="c4-ld">' + legalDiffHtml(rows) + '</div><label class="sl-toggle pk-sw"><span class="switch"><input type="checkbox" id="cmsRbLegal"><span></span></span><span><b>راجعت النص</b></span></label>';
            lc2 = $("cmsRbLegal"); lc2.addEventListener("change", sync);
          }
          lgReady = true; sync();
        });
      }).catch(function(e){ var b = $("cmsRbLg"); if(b && myT2 === TOK) b.innerHTML = '<div class="pk-verr">' + esc(err(e)) + ' — ما نقدر نتراجع قبل ما تظهر المقارنة.</div>'; });
    }
    if(!zero) loadDiff();
    rs.addEventListener("input", sync); if(ok) ok.addEventListener("change", sync); $("cmsMCancel").addEventListener("click", close); sync();
    go.addEventListener("click", function(){
      if(busy) return; busy = true; go.disabled = true; var eb = $("cmsMErr"); eb.hidden = true;
      function send(){
        return C.SB.rpc("admin_cfg_rollback", { p_version:ver, p_reason:rs.value.trim(), p_legal_reviewed:!!(lc2 && lc2.checked) }).then(function(x){
          busy = false; if(x.error){ eb.textContent = err(x.error); eb.hidden = false; sync(); return; }
          var d = C.rpcData(x) || {}; if(d.rolled_back === false){ eb.innerHTML = '<ul>' + (d.errors || []).map(function(e){ return '<li>' + esc(errTxt(e.code)) + (e.key ? ' — ' + esc(lbl(e.key)) : '') + '</li>'; }).join("") + '</ul>'; eb.hidden = false; sync(); return; }
          close(); C.toast("✅ تم التراجع — الإصدار الحالي رقم " + d.version + (d.draft_pending ? " (عندك مسودة بانتظارك صارت قديمة)" : "")); S.diff = null; load(C, "vers");
        }, function(e){ busy = false; eb.textContent = err(e); eb.hidden = false; sync(); });
      }
      if(zero){ send(); return; }
      /* التراجع ما فيه p_base بالسيرفر: نتأكد قبل الإرسال إن الإصدار الحالي نفسه اللي انعرضت مقارنته */
      rpc("admin_cfg_versions", { p_limit:1 }).then(function(V){
        var nc = (V || {}).current | 0;
        if(nc !== rbCur){ busy = false; eb.textContent = "تغيّر الإصدار المنشور (صار رقم " + nc + ") بعد ما انعرضت المقارنة — راجع المقارنة الجديدة قبل ما تتراجع."; eb.hidden = false; loadDiff(); return; }
        return send();
      }, function(e){ busy = false; eb.textContent = err(e); eb.hidden = false; sync(); });
    });
    rs.focus();
  }

  /* ---------- أحداث ---------- */
  function onInput(e){
    var t = e.target; if(!S || !t || !t.getAttribute) return;
    if(t.id === "cmsPvNow"){ S.pvNow = t.value; prevSched(); return; }
    if(t.hasAttribute("data-c4f") && c4Input(t)) return;
    var k = t.getAttribute("data-cmsf"), fq = t.getAttribute("data-faqf");
    if(k){
      var l = t.getAttribute("data-l"), v = S.text[k] || { ar:"", en:"" }; v[l] = t.value; S.text[k] = v;
      if(!v.ar && !v.en) delete S.text[k];
      S.dirty.text[k] = 1; checkText(k);
      var box = t.closest(".cms-key"), cn = t.parentNode.querySelector(".cms-cnt"), m = maxOf(k);
      if(cn){ cn.textContent = t.value.length + " / " + m; cn.classList.toggle("bad", t.value.length > m); }
      var ke = box.querySelector(".cms-kerr"); ke.textContent = S.cerr[k] || "";
      box.querySelector(".cms-badge-slot").innerHTML = textDiff(k) ? pill("معدّل عن المنشور", "wait") : "";
      box.querySelector(".cms-rv").hidden = !S.text[k]; sched(); prevSched();
    } else if(fq){
      var p = fq.split("."), it = S.faq[parseInt(p[0], 10)]; if(!it) return; it[p[1]][p[2]] = t.value; S.dirty.faq = true; checkFaq();
      var mx = p[1] === "q" ? 200 : 800, c2 = t.parentNode.querySelector(".cms-cnt"); if(c2){ c2.textContent = t.value.length + " / " + mx; c2.classList.toggle("bad", t.value.length > mx); }
      var fe = C.box.querySelector('[data-cmskerr="faq"]'); if(fe) fe.textContent = S.cerr.faq || ""; faqBadge(); sched(); prevSched();
    } else if(t.id === "cmsNote") return;
  }
  function faqBadge(){ var s = C.box.querySelector('.cms-faqbox .cms-badge-slot'); if(s) s.innerHTML = faqSame() ? "" : pill("معدّل عن المنشور", "wait"); }
  function faqRedraw(){ var b = C.box.querySelector(".cms-faqbox"); if(!b) return; var tmp = document.createElement("div"); tmp.innerHTML = faqHtml(); b.parentNode.replaceChild(tmp.firstChild, b); }
  function faqEdit(){ S.dirty.faq = true; checkFaq(); faqRedraw(); sched(); prevSched(); }
  function onChange(e){
    var t = e.target; if(!t || !t.getAttribute || !S) return;
    if(t.id === "cmsPvNow"){ S.pvNow = t.value; prevSched(); return; }
    if((t.hasAttribute("data-c4t") || t.hasAttribute("data-c4f")) && c4Change(t)) return;
    var on = t.getAttribute("data-faqon");
    if(on != null){ var it = S.faq[parseInt(on, 10)]; if(!it) return; it.on = t.checked; faqEdit(); }
    else if(t.hasAttribute && t.hasAttribute("data-cmsvc")){ var n = C.box.querySelectorAll("[data-cmsvc]:checked").length; var b = $("cmsCmp"); if(b) b.disabled = n !== 2; }
  }
  function onClick(e){
    var t = e.target.closest ? e.target.closest("button") : null; if(!t || !S) return;
    var a;
    if(t.hasAttribute("data-c4a")){ if(t.getAttribute("data-c4a") === "pvfocus0"){ S.focus = null; renderPrev(); return; }
      if(t.getAttribute("data-c4a") === "pvnow0"){ S.pvNow = ""; var pn = $("cmsPvNow"); if(pn) pn.value = ""; prevSched(); return; } if(c4Click(t)) return; }
    if((a = t.getAttribute("data-cmspg"))){ S.pvPage = a; renderPrev(); return; }
    if((a = t.getAttribute("data-cmsrev"))){ delete S.text[a]; var box = t.closest(".cms-key"); Array.prototype.forEach.call(box.querySelectorAll("[data-cmsf]"), function(f){ f.value = ""; var c = f.parentNode.querySelector(".cms-cnt"); if(c){ c.textContent = "0 / " + maxOf(a); c.classList.remove("bad"); } }); box.querySelector(".cms-kerr").textContent = ""; delete S.cerr[a]; S.dirty.text[a] = 1; box.querySelector(".cms-badge-slot").innerHTML = textDiff(a) ? pill("معدّل عن المنشور", "wait") : ""; t.hidden = true; sched(); prevSched(); return; }
    if((a = t.getAttribute("data-faq"))){
      if(a === "add"){ if(!S.faq) S.faq = []; if(S.faq.length >= 20) return; S.faq.push({ q:{ ar:"", en:"" }, a:{ ar:"", en:"" }, on:true }); faqEdit(); var rows = C.box.querySelectorAll("[data-faqrow]"); if(rows.length) rows[rows.length - 1].scrollIntoView({ block:"nearest" }); }
      else if(a === "defaults"){ if(!DEF || !DEF.faq.length){ C.toast("⚠️ ما قدرنا نقرأ الأسئلة الأصلية"); return; } if(S.faq && S.faq.length && !confirm("القائمة الحالية بتنستبدل بالأسئلة الأصلية. نكمل؟")) return; S.faq = DEF.faq.map(function(d){ return { q:{ ar:d.q, en:"" }, a:{ ar:d.a, en:"" }, on:true }; }); faqEdit(); }
      else if(a === "clear"){ S.faq = null; faqEdit(); }
      return;
    }
    if((a = t.getAttribute("data-faqup")) != null || (a = t.getAttribute("data-faqdn")) != null || (a = t.getAttribute("data-faqdel")) != null){
      var i = parseInt(a, 10); if(t.hasAttribute("data-faqdel")) S.faq.splice(i, 1); else { var j = t.hasAttribute("data-faqup") ? i - 1 : i + 1; if(j < 0 || j >= S.faq.length) return; var x = S.faq[i]; S.faq[i] = S.faq[j]; S.faq[j] = x; }
      faqEdit(); return;
    }
    if((a = t.getAttribute("data-cmsview"))){ setView(a); return; }
    if((a = t.getAttribute("data-cmsdev"))){ S.dev = a; var f = $("cmsFrame"); if(f) f.style.width = WID[a]; Array.prototype.forEach.call(C.box.querySelectorAll("[data-cmsdev]"), function(x){ x.classList.toggle("on", x.getAttribute("data-cmsdev") === a); }); return; }
    if(t.hasAttribute("data-cmsgo")){ goKey(t.getAttribute("data-cmsgo"), t.getAttribute("data-cmspath")); return; }
    if((a = t.getAttribute("data-cmsrb")) != null){ rbModal(parseInt(a, 10)); return; }
    if((a = t.getAttribute("data-cms"))){
      if(a === "reload"){ load(C); return; }
      if(a === "rebase"){ t.disabled = true; rpc("admin_cfg_save", { p_patch:{}, p_rev:S.rev, p_base:G.version }).then(function(){ load(C); }, function(x){ C.toast("⚠️ " + err(x)); load(C); }); return; }
    }
    switch(t.id){
      case "cmsVal": validate(); break;
      case "cmsPrev": S.prev = !S.prev; t.classList.toggle("on", S.prev); t.setAttribute("aria-pressed", S.prev ? "true" : "false"); renderPrev(); break;
      case "cmsPub": if(canPublish()) pubModal(); break;
      case "cmsDisc": discModal(); break;
      case "cmsCmp": compare(); break;
      case "cmsKill": rbModal(0); break;
    }
  }

  /* ================= (C4) الإعلانات + التواصل + روابط الفوتر + النصوص القانونية ================= */
  var HAS = Object.prototype.hasOwnProperty;
  var C4L = { "notice.items":1, "links.footer":1, "contact.social":1, "legal.terms.sections":1, "legal.privacy.sections":1 }, C4U = { "contact.whatsapp":1, "contact.email":1 };
  var NKIND = [["banner", "شريط عام"], ["maintenance", "صيانة"], ["welcome", "ترحيب"], ["new_game", "لعبة جديدة"], ["offer", "عرض"], ["season", "موسم / مناسبة"]];
  var NSTY = [["info", "معلومة — بنفسجي"], ["warn", "تنبيه — كهرماني"], ["promo", "ترويج — بنفسجي وردي"]];
  var SOCK = [["x", "X (تويتر)"], ["instagram", "إنستغرام"], ["tiktok", "تيك توك"], ["snapchat", "سناب شات"], ["youtube", "يوتيوب"]];
  var SOCH = { x:["x.com", "twitter.com"], instagram:["instagram.com"], tiktok:["tiktok.com"], snapchat:["snapchat.com"], youtube:["youtube.com"] };
  var KEEPL = { pay:"الدفع", contact:"التواصل" };
  var FL = { id:"المعرّف", kind:"النوع", style:"النمط", text:"النص", link:"الرابط", link_label:"نص الرابط", from:"من", to:"إلى", dismissible:"قابل للإغلاق", on:"التفعيل", label:"العنوان", href:"الرابط", url:"الرابط", h:"العنوان", body:"النص", keep:"القسم الثابت", v:"القيمة" };
  var LNK = /^(https:\/\/[^\s<>"'\\]{1,490}|\/[^\s<>"'\\\/][^\s<>"'\\]{0,490}|\/|#[A-Za-z0-9_-]{1,60})$/, EML = /^[A-Za-z0-9._+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+$/;
  var HELP = {
    "notice.items":"شريط رفيع أعلى الصفحة الرئيسية فقط (وما يظهر داخل اللعبة). يظهر إعلان واحد بالوقت: أول إعلان مفعّل ضمن فترته. الوقت بتوقيت الرياض. الزائر يقدر يقفله (يرجع لو غيّرت النص).",
    "links.footer":"روابط تنضاف بعد «الشروط والخصوصية وحقوق الصور» (هذي الثلاثة ثابتة وما تتحذف). الرابط https أو مسار داخلي مثل /terms.html.",
    "contact.social":"حساب واحد لكل شبكة، والرابط لازم يكون على نطاق الشبكة نفسها (https فقط).",
    "legal.terms.sections":"تنعرض أقسام الشروط حسب هذا الترتيب بدل النص الثابت. قسما «الدفع» و«التواصل» ديناميكيان (يتبنون من الإعدادات): تقدر تحرّكهم بس ما تحرر نصهم، ولازم يكونون موجودين ومفعّلين (النشر موقوف بدونهم). إذا ما غيّرت شي تبقى الصفحة بنصها الأصلي. عند النشر ينشال تاريخ «آخر تحديث» من أعلى الصفحة، وتتحول الروابط الداخلية وروابط المواقع غير المسموحة لنص عادي.",
    "legal.privacy.sections":"تنعرض أقسام الخصوصية حسب هذا الترتيب بدل النص الثابت. مقدمة الصفحة والملخص الإنجليزي ثابتين. إذا ما غيّرت شي تبقى الصفحة بنصها الأصلي. عند النشر ينشال تاريخ «آخر تحديث» من أعلى الصفحة، وتتحول الروابط الداخلية وروابط المواقع غير المسموحة لنص عادي." };
  var BUL = 'للنقاط: ابدأ السطر بـ <bdi dir="ltr">"- "</bdi> (شرطة ثم مسافة). المسموح بس <bdi dir="ltr">**bold**</bdi> و<bdi dir="ltr">[label](https://…)</bdi> — ما يدخل HTML. سطر فاضي = فقرة جديدة.';   /* ثابت داخلي (HTML آمن)، مو من بيانات */
  function pathBad(u){ if(u.charAt(0) !== "/") return false; var p = u.split(/[?#]/)[0]; return u.charAt(1) === "/" || p.indexOf("//") !== -1 || /(^|\/)\.\.?(\/|$)/.test(p) || /%(2f|5c|09|0a|0d|00|2e)/i.test(p); }
  function linkBad(u){
    if(/^https:/i.test(u)){ var h = hostOf(u); if(!h) return "رابط https غير صالح (ممنوع @ داخل العنوان)"; if(G && Array.isArray(G.hosts) && G.hosts.length && !hostIn(h, G.hosts)) return "موقع الرابط غير مسموح (" + h + ")"; return ""; }
    if(pathBad(u)) return "مسار داخلي غير مسموح (بدون // أو .. أو %2f)"; return "";
  }
  function isC4(k){ return HAS.call(C4L, k) || HAS.call(C4U, k); }
  function blankTv(){ return { ar:"", en:"" }; }
  function genId(k){ var ids = {}; (S.c4[k] || []).forEach(function(x){ ids[x.id] = 1; }); var id; do id = "n" + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6); while(ids[id]); return id; }
  function nItem(k, it){
    it = isObj(it) ? it : {}; var o = { on:it.on !== false };
    if(k === "notice.items"){ o.id = String(it.id || ""); o.kind = it.kind || "banner"; o.style = it.style || "info"; o.text = tv(it.text) || blankTv(); o.link = String(it.link || ""); o.link_label = tv(it.link_label) || blankTv(); o.from = String(it.from || ""); o.to = String(it.to || ""); o.dismissible = it.dismissible !== false; }
    else if(k === "links.footer"){ o.label = tv(it.label) || blankTv(); o.href = String(it.href || ""); }
    else if(k === "contact.social"){ o.kind = it.kind || "x"; o.url = String(it.url || ""); }
    else if(it.keep) o.keep = it.keep;
    else { o.h = tv(it.h) || blankTv(); o.body = tv(it.body) || blankTv(); }
    return o;
  }
  function oItem(k, it){
    var o = {};
    if(k === "notice.items"){ o.id = it.id; o.kind = it.kind; o.style = it.style; o.text = outTv(it.text); var lk = it.link.trim(); if(lk){ o.link = lk; if(it.link_label.ar.trim()) o.link_label = outTv(it.link_label); } if(it.from) o.from = it.from; if(it.to) o.to = it.to; o.dismissible = !!it.dismissible; }
    else if(k === "links.footer"){ o.label = outTv(it.label); o.href = it.href.trim(); }
    else if(k === "contact.social"){ o.kind = it.kind; o.url = it.url.trim(); }
    else if(it.keep) o.keep = it.keep;
    else { o.h = outTv(it.h); o.body = outTv(it.body); }
    o.on = !!it.on; return o;
  }
  function newItem(k){
    var o = { on:true };
    if(k === "notice.items") return { on:true, id:genId(k), kind:"banner", style:"info", text:blankTv(), link:"", link_label:blankTv(), from:"", to:"", dismissible:true };
    if(k === "links.footer"){ o.label = blankTv(); o.href = ""; return o; }
    if(k === "contact.social"){ var used = {}; (S.c4[k] || []).forEach(function(x){ used[x.kind] = 1; }); o.kind = (SOCK.filter(function(s){ return !used[s[0]]; })[0] || SOCK[0])[0]; o.url = ""; return o; }
    o.h = blankTv(); o.body = blankTv(); return o;
  }
  function c4Init(pub, pl, pu, pdu){
    S.c4 = {}; S.c4err = {};
    Object.keys(C4L).forEach(function(k){
      if(!REGK[k]) return;
      var base = pub.list && Array.isArray(pub.list[k]) ? pub.list[k] : null; if(HAS.call(pl, k)) base = Array.isArray(pl[k]) ? pl[k] : null;
      S.c4[k] = base ? base.map(function(it){ return nItem(k, it); }) : [];
    });
    Object.keys(C4U).forEach(function(k){
      if(!REGK[k]) return;
      var v = pub.url && typeof pub.url[k] === "string" ? pub.url[k] : ""; if(HAS.call(pdu, k)) v = typeof pdu[k] === "string" ? pdu[k] : "";
      S.c4[k] = v;
    });
  }
  function c4Same(k){
    if(HAS.call(C4U, k)){ var p = pubData().url && pubData().url[k]; return String(S.c4[k] || "").trim() === String(p || ""); }
    var pl = pubData().list && pubData().list[k];
    return JSON.stringify((S.c4[k] || []).map(function(it){ return oItem(k, it); })) === JSON.stringify((Array.isArray(pl) ? pl : []).map(function(it){ return oItem(k, nItem(k, it)); }));
  }
  /* الوقت: نخزّن بصيغة السيرفر «…+03:00»، ومنتقي الوقت يعرض الرياض */
  function dtVal(s){ if(!s) return ""; var m = /^(\d{4}-\d\d-\d\dT\d\d:\d\d)/.exec(s); if(m && /\+03:00$/.test(s)) return m[1]; var t = Date.parse(s); return isNaN(t) ? "" : new Date(t + 10800000).toISOString().slice(0, 16); }
  function dtOut(v){ return v ? v + ":00+03:00" : ""; }
  function hostOf(u){ var a = /^https:\/\/([^\/?#]+)/i.exec(u); if(!a || a[1].indexOf("@") !== -1) return ""; var m = /^([^:]+)(:\d{1,5})?$/.exec(a[1]); return m ? m[1].toLowerCase() : ""; }
  function hostIn(h, arr){ return !!h && Array.isArray(arr) && arr.some(function(x){ return h === x || h.slice(-(x.length + 1)) === "." + x; }); }

  /* ---------- تحقق محلي (السيرفر هو المرجع؛ هذا بس يمنع الحفظ الغلط ويوضح الحقل) ---------- */
  function checkC4(k, soft){
    var E = []; if(!soft) delete S.cerr[k];
    function tvc(i, f, v, max, req){
      if(req && !v.ar.trim()) E.push({ path:i + "." + f, msg:"اكتب النص العربي (مطلوب)" });
      else if(!v.ar.trim() && v.en.trim()) E.push({ path:i + "." + f, msg:"اكتب النص العربي أول (الإنجليزي اختياري)" });
      if(v.ar.length > max || v.en.length > max) E.push({ path:i + "." + f, msg:"أطول من الحد (" + max + " حرف)" });
      if(/[<>]/.test(v.ar + v.en)) E.push({ path:i + "." + f, msg:"فيه رمز ممنوع (< أو >)" });
    }
    if(HAS.call(C4U, k)){
      var v = String(S.c4[k] || "").trim();
      if(v && k === "contact.whatsapp" && !/^[1-9][0-9]{7,14}$/.test(v)) E.push({ path:"0.v", msg:"رقم دولي بأرقام إنجليزية بدون + أو 00 أو مسافات (مثل 966500000000)" });
      if(v && k === "contact.email" && (v.length > 120 || !EML.test(v))) E.push({ path:"0.v", msg:"إيميل غير صالح" });
    } else (S.c4[k] || []).forEach(function(it, i){
      if(k === "notice.items"){
        tvc(i, "text", it.text, 160, true); var lk = it.link.trim();
        if(lk && !LNK.test(lk)) E.push({ path:i + ".link", msg:"رابط غير صالح (https أو مسار داخلي مثل /terms.html أو #قسم)" }); else if(lk && linkBad(lk)) E.push({ path:i + ".link", msg:linkBad(lk) });
        if(it.link_label.ar.trim() || it.link_label.en.trim()){ if(!lk) E.push({ path:i + ".link", msg:"نص الرابط بدون رابط" }); tvc(i, "link_label", it.link_label, 40, false); }
        if(it.from && it.to && dtVal(it.from) >= dtVal(it.to)) E.push({ path:i + ".from", msg:"البداية لازم تكون قبل النهاية" });
      } else if(k === "links.footer"){
        tvc(i, "label", it.label, 40, true); var h = it.href.trim();
        if(!h) E.push({ path:i + ".href", msg:"اكتب الرابط" }); else if(!LNK.test(h)) E.push({ path:i + ".href", msg:"رابط غير صالح (https أو مسار داخلي)" }); else if(linkBad(h)) E.push({ path:i + ".href", msg:linkBad(h) });
      } else if(k === "contact.social"){
        var u = it.url.trim(), hh = hostOf(u);
        if(!u) E.push({ path:i + ".url", msg:"اكتب رابط الحساب" }); else if(!hh || /[\s<>"']/.test(u) || u.length > 300) E.push({ path:i + ".url", msg:"رابط https غير صالح" });
        else if(!hostIn(hh, own(SOCH, it.kind, []))) E.push({ path:i + ".url", msg:"الرابط لازم يكون على نطاق الشبكة (" + own(SOCH, it.kind, []).join(" أو ") + ")" });
        S.c4[k].forEach(function(o, j){ if(j < i && o.kind === it.kind) E.push({ path:i + ".kind", msg:"الشبكة مكررة (حساب واحد لكل شبكة)" }); });
      } else if(!it.keep){
        tvc(i, "h", it.h, 120, true); tvc(i, "body", it.body, 2500, true);
        [it.body.ar, it.body.en].forEach(function(s){ if(s.split("\n").some(function(ln){ return ln === "-" || /^- -/.test(ln); })) E.push({ path:i + ".body", msg:"نقطة فاضية أو نقطة داخل نقطة" }); });
        if(/[*\[\]]/.test(it.body.ar.replace(/\*\*[^*\n]+\*\*/g, "").replace(/\[[^\[\]*\n]+\]\(https:\/\/[^\s()<>"']+\)/g, "")) || /[*\[\]]/.test(it.body.en.replace(/\*\*[^*\n]+\*\*/g, "").replace(/\[[^\[\]*\n]+\]\(https:\/\/[^\s()<>"']+\)/g, ""))) E.push({ path:i + ".body", msg:"رموز * أو [ ] زيادة — المسموح بس **عريض** و[نص](https://…)" });
      }
    });
    S.c4err[k] = E; if(E.length && !soft) S.cerr[k] = E.length + " خطأ — راجع الحقول"; return E;
  }
  function srvMsg(e){ var m = errTxt(e.code) || "خطأ"; if(e.max) m += " (" + e.max + ")"; if(e.lang) m += " · " + (e.lang === "en" ? "English" : "عربي"); return m; }
  function paintErrs(){
    if(!S || !C || !C.box) return;
    Array.prototype.forEach.call(C.box.querySelectorAll("[data-c4e]"), function(e){ e.textContent = ""; });
    Array.prototype.forEach.call(C.box.querySelectorAll(".c4-bad"), function(e){ e.classList.remove("c4-bad"); e.removeAttribute("aria-invalid"); });
    var list = [], seen = {};
    Object.keys(S.c4err || {}).forEach(function(k){ S.c4err[k].forEach(function(e){ list.push({ key:k, path:e.path, msg:e.msg }); }); });
    (S.serr || []).concat((S.vres && S.vres.errors) || []).forEach(function(e){ if(e && e.key && isC4(e.key)) list.push({ key:e.key, path:e.path || "", msg:srvMsg(e) }); });
    list.forEach(function(e){
      var sg = e.key + "|" + e.path + "|" + e.msg; if(seen[sg]) return; seen[sg] = 1;
      var m = /^(\d+)\.(.+)$/.exec(e.path || ""), f = m ? m[2] : "_", i = m ? m[1] : "_", q = e.key + ":";
      var el = C.box.querySelector('[data-c4e="' + cssq(q + i + ":" + f) + '"]') || C.box.querySelector('[data-c4e="' + cssq(q + i + ":_") + '"]') || C.box.querySelector('[data-c4e="' + cssq(q + "_:_") + '"]');
      if(!el) return;
      el.textContent += (el.textContent ? " · " : "") + e.msg;
      var w = el.closest(".c4-fld"); if(w) Array.prototype.forEach.call(w.querySelectorAll("input,select,textarea"), function(x){ x.classList.add("c4-bad"); x.setAttribute("aria-invalid", "true"); });
    });
  }

  /* ---------- رسم المحررات ---------- */
  function fld(k, i, f, label, inner){ return '<div class="c4-fld" data-c4w="' + k + ':' + i + ':' + f + '"><div class="cms-lab">' + esc(label) + '</div>' + inner + '<div class="cms-kerr" data-c4e="' + k + ':' + i + ':' + f + '"></div></div>'; }
  function pairF(k, i, f, label, v, max, area, rows){
    var a = fieldHtml("", v.ar, max, "ar", area, 'data-c4f="' + k + ':' + i + ':' + f + ':ar" data-mx="' + max + '"'), e = fieldHtml("", v.en, max, "en", area, 'data-c4f="' + k + ':' + i + ':' + f + ':en" data-mx="' + max + '"');
    if(rows){ a = a.replace('rows="2"', 'rows="' + rows + '"'); e = e.replace('rows="2"', 'rows="' + rows + '"'); }
    return fld(k, i, f, label, '<div class="cms-pair">' + a + e + '</div>');
  }
  function oneF(k, i, f, label, val, max, ph, ltr, type){
    return fld(k, i, f, label, '<input class="input" type="' + (type || "text") + '" data-c4f="' + k + ':' + i + ':' + f + '" value="' + esc(val) + '" maxlength="' + max + '" autocomplete="off"' + (ph ? ' placeholder="' + esc(ph) + '"' : "") + (ltr ? ' dir="ltr"' : "") + '>');
  }
  function selF(k, i, f, label, opts, val){
    return fld(k, i, f, label, '<select class="input" data-c4f="' + k + ':' + i + ':' + f + '">' + opts.map(function(o){ return '<option value="' + o[0] + '"' + (o[0] === val ? " selected" : "") + '>' + esc(o[1]) + '</option>'; }).join("") + '</select>');
  }
  function togF(k, i, f, label, on, txtOn, txtOff){
    return '<label class="sl-toggle pk-sw c4-tog" title="' + esc(label) + '"><span class="switch"><input type="checkbox" data-c4t="' + k + ':' + i + ':' + f + '"' + (on ? " checked" : "") + ' aria-label="' + esc(label) + '"><span></span></span><span><small>' + esc(on ? txtOn : txtOff) + '</small></span></label>';
  }
  function rowHead(k, i, n, title, it, extra){
    return '<div class="cms-frh"><b>' + title + '</b>' + togF(k, i, "on", "إظهار / إخفاء", it.on, "ظاهر", "مخفي") + (extra || "") + '<span class="cms-sp"></span>'
      + '<button class="btn-ghost sm cms-ib" type="button" data-c4a="up" data-c4k="' + k + '" data-c4n="' + i + '"' + (i === 0 ? " disabled" : "") + ' aria-label="للأعلى" title="للأعلى"><span class="cms-up">' + ic("chevdown") + '</span></button>'
      + '<button class="btn-ghost sm cms-ib" type="button" data-c4a="dn" data-c4k="' + k + '" data-c4n="' + i + '"' + (i === n - 1 ? " disabled" : "") + ' aria-label="للأسفل" title="للأسفل">' + ic("chevdown") + '</button>'
      + '<button class="btn-ghost sm cms-ib cms-del" type="button" data-c4a="del" data-c4k="' + k + '" data-c4n="' + i + '" aria-label="حذف" title="حذف">' + ic("x") + '</button></div>';
  }
  function rowHtml(k, it, i, n){
    var h = "", cls = 'cms-fr c4row' + (it.on ? "" : " off"), open = '<div class="' + cls + '" data-c4row="' + k + ':' + i + '">';
    if(k === "notice.items"){
      h = open + rowHead(k, i, n, "إعلان " + (i + 1), it, '<button class="btn-ghost sm c4-pv" type="button" data-c4a="prev" data-c4k="' + k + '" data-c4n="' + i + '">' + ic("eye") + 'عاين هذا الإعلان</button>')
        + '<div class="c4-grid">' + selF(k, i, "kind", "النوع (الأيقونة)", NKIND, it.kind) + selF(k, i, "style", "النمط (الألوان)", NSTY, it.style)
        + '<div class="c4-fld"><div class="cms-lab">الإغلاق</div>' + togF(k, i, "dismissible", "الزائر يقدر يقفله", it.dismissible, "الزائر يقدر يقفله", "ما ينقفل") + '</div></div>'
        + pairF(k, i, "text", "نص الإعلان", it.text, 160, true)
        + '<div class="c4-grid">' + oneF(k, i, "link", "الرابط (اختياري): https أو /مسار أو #قسم", it.link, 500, "https://…", true) + '</div>'
        + pairF(k, i, "link_label", "نص الرابط (اختياري، يحتاج رابط)", it.link_label, 40, false)
        + '<div class="c4-grid">' + fld(k, i, "from", "يبدأ (بتوقيت الرياض — اختياري)", '<div class="c4-dt"><input class="input" type="datetime-local" step="60" data-c4f="' + k + ':' + i + ':from" value="' + esc(dtVal(it.from)) + '"><button class="btn-ghost sm" type="button" data-c4a="clrdt" data-c4k="' + k + '" data-c4n="' + i + '" data-c4fl="from">مسح</button></div>')
        + fld(k, i, "to", "ينتهي (بتوقيت الرياض — اختياري)", '<div class="c4-dt"><input class="input" type="datetime-local" step="60" data-c4f="' + k + ':' + i + ':to" value="' + esc(dtVal(it.to)) + '"><button class="btn-ghost sm" type="button" data-c4a="clrdt" data-c4k="' + k + '" data-c4n="' + i + '" data-c4fl="to">مسح</button></div>') + '</div>'
        + '<p class="hint c4-sch-hint">الإعلان المجدول لوقت لاحق يقدر أي أحد يقرأ نصه قبل موعده. لا تكتب نص سري، وخلّه مطفي (غير مفعّل) إلى وقت الإطلاق.</p>'
        + '<div class="cms-kerr" data-c4e="' + k + ':' + i + ':_"></div></div>';
    } else if(k === "links.footer"){
      h = open + rowHead(k, i, n, "رابط " + (i + 1), it) + pairF(k, i, "label", "العنوان", it.label, 40, false) + oneF(k, i, "href", "الرابط: https أو /مسار", it.href, 500, "https://…", true) + '<div class="cms-kerr" data-c4e="' + k + ':' + i + ':_"></div></div>';
    } else if(k === "contact.social"){
      h = open + rowHead(k, i, n, "حساب " + (i + 1), it) + '<div class="c4-grid">' + selF(k, i, "kind", "الشبكة", SOCK, it.kind) + oneF(k, i, "url", "رابط الحساب (https)", it.url, 300, "https://…", true) + '</div><div class="cms-kerr" data-c4e="' + k + ':' + i + ':_"></div></div>';
    } else if(it.keep){
      h = open + rowHead(k, i, n, "قسم ثابت: " + esc(keepLbl(it.keep)), it) + '<div class="pk-note">هذا القسم يتبنى تلقائيًا من إعدادات الموقع (' + esc(it.keep === "pay" ? "طرق الدفع" : "التواصل والبائع") + '). تقدر تحرّكه أو تخفيه، لكن ما تحرر نصه.</div><div class="cms-kerr" data-c4e="' + k + ':' + i + ':_"></div></div>';
    } else {
      h = open + rowHead(k, i, n, "قسم " + (i + 1) + (it.h.ar.trim() ? " — " + esc(cut(it.h.ar, 40)) : ""), it) + pairF(k, i, "h", "عنوان القسم", it.h, 120, false)
        + pairF(k, i, "body", "نص القسم", it.body, 2500, true, 8) + '<div class="cms-kerr" data-c4e="' + k + ':' + i + ':_"></div></div>';
    }
    return h;
  }
  function impList(k){
    var o = S.imp && S.imp[k]; if(!o) return "";
    var li = [];
    (o.links || []).forEach(function(x){ li.push('<li>رابط «' + esc(cut(x.l, 50)) + '» (<bdi dir="ltr">' + esc(cut(x.h, 90)) + '</bdi>) صار نص عادي بدون رابط — القواعد تسمح بروابط https من القائمة المسموحة فقط</li>'); });
    if(o.meta) li.push('<li>سطر «آخر تحديث: …» بأعلى الصفحة ينشال عند النشر (التاريخ ما ينعرض لين نربطه بتاريخ النشر)</li>');
    if(o.cut) li.push('<li>الصفحة فيها أكثر من 14 قسم: الزايد ما انستورد</li>');
    return li.length ? '<ul>' + li.join("") + '</ul>' : "";
  }
  function impHtml(){
    var ks = Object.keys(S.imp || {}).filter(function(k){ return impList(k); });
    return ks.length ? '<div class="pk-note c4-impw"><b>تنبيهات الاستيراد (راجعها قبل النشر):</b>' + ks.map(function(k){ return '<div>' + esc(lbl(k)) + impList(k) + '</div>'; }).join("") + '</div>' : "";
  }
  function c4Html(r){
    var k = r.key, rows = S.c4[k] || [], n = rows.length, max = r.max_items || 10, diff = !c4Same(k), legal = HAS.call(r, "legal") && r.legal, isL = /^legal\./.test(k);
    var tools = '<button class="btn-primary sm" type="button" data-c4a="add" data-c4k="' + k + '"' + (n >= max ? " disabled" : "") + '>' + ic("plus") + (isL ? "قسم جديد" : k === "notice.items" ? "إعلان جديد" : k === "contact.social" ? "حساب جديد" : "رابط جديد") + '</button>';
    if(isL){
      var used = {}; rows.forEach(function(x){ if(x.keep) used[x.keep] = 1; });
      tools += '<button class="btn-ghost sm" type="button" data-c4a="import" data-c4k="' + k + '">' + ic("refresh") + 'استيراد من الصفحة الحالية</button>';
      if(k === "legal.terms.sections") tools += ['pay', 'contact'].map(function(kp){ return '<button class="btn-ghost sm" type="button" data-c4a="addkeep" data-c4k="' + k + '" data-c4v="' + kp + '"' + (used[kp] || n >= max ? " disabled" : "") + '>قسم ثابت: ' + KEEPL[kp] + '</button>'; }).join("");
    }
    if(n) tools += '<button class="btn-ghost sm" type="button" data-c4a="clear" data-c4k="' + k + '">' + (isL ? "رجوع للنص الأصلي" : "حذف الكل") + '</button>';
    tools += '<small class="cms-cnt">' + n + ' / ' + max + '</small>';
    return '<div class="cms-key cms-c4box" data-cmskey="' + esc(k) + '" data-c4box="' + esc(k) + '"><div class="cms-kh"><b>' + esc(lbl(k)) + '</b><code>' + esc(k) + '</code>' + (legal ? pill("نص قانوني", "sale") : "") + '<span class="cms-badge-slot">' + (diff ? pill("معدّل عن المنشور", "wait") : "") + '</span></div>'
      + '<div class="pk-note">' + esc(HELP[k] || "") + (isL ? ' <span class="c4-bul">' + BUL + '</span>' : "") + '</div>'
      + (k === "legal.terms.sections" && keepIssues().length ? '<div class="pk-verr c4-keepwarn" id="c4KeepWarn" role="alert">' + esc(keepMsg(keepIssues())) + '</div>' : "")
      + (isL && impList(k) ? '<div class="pk-note c4-impw" data-c4imp="' + esc(k) + '"><b>تنبيهات الاستيراد (راجعها قبل النشر):</b>' + impList(k) + '</div>' : "")
      + '<div class="cms-faqtools">' + tools + '</div>'
      + (n ? "" : '<div class="empty">' + (isL ? "ما غيّرت القائمة — الصفحة تعرض نصها الأصلي. تقدر تبدأ بـ«استيراد من الصفحة الحالية»." : k === "notice.items" ? "ما فيه إعلانات — ما يظهر أي شريط." : "القائمة فاضية.") + '</div>')
      + '<div class="cms-faqrows c4rows">' + rows.map(function(it, i){ return rowHtml(k, it, i, n); }).join("") + '</div><div class="cms-kerr" data-c4e="' + k + ':_:_"></div></div>';
  }
  function c4UrlHtml(r){
    var k = r.key, v = S.c4[k] || "", diff = !c4Same(k), wa = k === "contact.whatsapp";
    return '<div class="cms-key cms-c4box" data-cmskey="' + esc(k) + '" data-c4box="' + esc(k) + '"><div class="cms-kh"><b>' + esc(lbl(k)) + '</b><code>' + esc(k) + '</code><span class="cms-badge-slot">' + (diff ? pill("معدّل عن المنشور", "wait") : "") + '</span></div>'
      + '<div class="pk-note">' + (wa ? 'رقم دولي بأرقام إنجليزية فقط، بدون + أو 00 أو مسافات (مثل 966500000000). يُستخدم لزر الواتساب بصفحة الشروط. فاضي = يبقى الرقم الحالي من إعدادات الموقع.' : 'يظهر كرابط بريد بصفحة الشروط. فاضي = ما يظهر.') + '</div>'
      + fld(k, 0, "v", wa ? "رقم الواتساب" : "الإيميل", '<input class="input" type="text" inputmode="' + (wa ? "numeric" : "email") + '" dir="ltr" data-c4f="' + k + ':0:v" value="' + esc(v) + '" maxlength="' + (wa ? 15 : 120) + '" autocomplete="off" placeholder="' + (wa ? "966500000000" : "info@example.com") + '">') + '</div>';
  }
  function c4Redraw(k){
    var b = C.box.querySelector('[data-c4box="' + cssq(k) + '"]'); if(!b) return;
    var r = REGK[k], tmp = document.createElement("div"); tmp.innerHTML = HAS.call(C4U, k) ? c4UrlHtml(r) : c4Html(r); b.parentNode.replaceChild(tmp.firstChild, b); paintErrs();
  }
  function c4Badge(k){ var b = C.box.querySelector('[data-c4box="' + cssq(k) + '"] .cms-badge-slot'); if(b) b.innerHTML = c4Same(k) ? "" : pill("معدّل عن المنشور", "wait"); }
  function c4Touch(k, structural){
    S.dirty.c4[k] = 1; checkC4(k);
    if(structural) c4Redraw(k); else { paintErrs(); c4Badge(k); }
    sched(); prevSched();
  }

  /* ---------- استيراد نص صفحة الشروط/الخصوصية الحالية (مرة وحدة، بالمتصفح) ---------- */
  function plain(s){ return String(s).replace(/[<>]/g, "").replace(/\*/g, "").replace(/\[/g, "(").replace(/\]/g, ")"); }
  function inl(n){
    var o = "";
    Array.prototype.forEach.call(n.childNodes, function(c){
      if(c.nodeType === 3) o += plain(c.nodeValue.replace(/\s+/g, " "));
      else if(c.nodeType === 1){
        var t = c.tagName;
        if(t === "BR") o += "\n";
        else if(t === "B" || t === "STRONG"){ var x = plain(c.textContent.replace(/\s+/g, " ")).trim(); if(x) o += "**" + x + "**"; }
        else if(t === "A"){ var lb = plain(c.textContent.replace(/\s+/g, " ")).trim(), hr = c.getAttribute("href") || "", okh = /^https:\/\/[^\s()<>"']+$/.test(hr) && lb && hostIn(hostOf(hr), (G && G.hosts) || []); if(hr && !okh) IMPLOG.push({ l: lb || hr, h: hr }); o += okh ? "[" + lb + "](" + hr + ")" : lb; }
        else o += inl(c);
      }
    });
    return o;
  }
  var IMPLOG = [], IMPMETA = false, IMPCUT = false;
  function importPage(k){
    IMPLOG = []; IMPMETA = false; IMPCUT = false;
    var page = k === "legal.terms.sections" ? "terms.html" : "privacy.html";
    return fetch(page, { credentials:"same-origin" }).then(function(r){ if(!r.ok) throw new Error("x"); return r.text(); }).then(function(h){
      var doc = new DOMParser().parseFromString(h, "text/html"), main = doc.querySelector("main"), out = [];
      if(!main) throw new Error("x");
      var mt = doc.querySelector(".head .meta"); IMPMETA = !!(mt && /آخر تحديث/.test(mt.textContent));
      Array.prototype.forEach.call(main.children, function(s){
        if(s.tagName !== "SECTION" || !s.classList.contains("card")) return;
        var kp = s.getAttribute("data-cms-keep"); if(kp){ out.push({ on:true, keep:kp }); return; }
        if(s.hasAttribute("data-cms-fixed")) return;
        var h2 = s.querySelector("h2"); if(!h2) return;
        var blocks = [];
        Array.prototype.forEach.call(s.children, function(c){
          if(c.tagName === "P"){ var t = inl(c).replace(/[ \t]+\n/g, "\n").trim(); if(t) blocks.push(t); }
          else if(c.tagName === "UL" || c.tagName === "OL"){ var li = Array.prototype.map.call(c.children, function(x){ var t = inl(x).replace(/\s*\n\s*/g, " ").trim(); return t ? "- " + t : ""; }).filter(Boolean); if(li.length) blocks.push(li.join("\n")); }
        });
        var ht = plain(h2.textContent.replace(/\s+/g, " ")).trim(), pieces = [];
        blocks.forEach(function(bk){ if(/^- /.test(bk)) bk.split("\n").forEach(function(l){ pieces.push({ t:l, b:true }); }); else pieces.push({ t:bk, b:false }); });
        /* حد النص 2500 حرف للقسم: نقسّم الأقسام الطويلة عند حدود النقاط/الفقرات (العنوان يتكرر مع «(تابع)») */
        var chunks = [], cur = "", lastB = false;
        pieces.forEach(function(pc){
          var add = (cur ? (pc.b && lastB ? "\n" : "\n\n") : "") + pc.t;
          if(cur && (cur + add).length > 2400){ chunks.push(cur); cur = pc.t; } else cur += add;
          lastB = pc.b;
        });
        if(cur) chunks.push(cur);
        chunks.forEach(function(ch, ci){ out.push({ on:true, h:{ ar:(ci ? ht.slice(0, 106) + " (تابع)" : ht.slice(0, 120)), en:"" }, body:{ ar:ch.slice(0, 2500), en:"" } }); });
      });
      IMPCUT = out.length > 14; return out.slice(0, 14);
    });
  }

  /* ---------- مقارنة النص القانوني (قبل / بعد) ---------- */
  function secText(it){
    if(!isObj(it)) return ""; if(it.keep) return "[قسم ثابت: " + keepLbl(it.keep) + "]" + (it.on === false ? " (مخفي)" : "");
    var t = String(it.h && it.h.ar || "") + "\n" + String(it.body && it.body.ar || "");
    if(it.h && it.h.en || it.body && it.body.en) t += "\n— English —\n" + String(it.h && it.h.en || "") + "\n" + String(it.body && it.body.en || "");
    return t + (it.on === false ? "\n(مخفي)" : "");
  }
  function lcsKeep(a, b){
    var n = a.length, m = b.length, res = [], i, j; for(j = 0; j < m; j++) res.push(false);
    if(n * m > 250000){ var c = new Map(); a.forEach(function(l){ c.set(l, (c.get(l) || 0) + 1); }); b.forEach(function(l, q){ var v = c.get(l) || 0; if(v > 0){ res[q] = true; c.set(l, v - 1); } }); return res; }
    var W = m + 1, t = new Uint16Array((n + 1) * W);
    for(i = n - 1; i >= 0; i--) for(j = m - 1; j >= 0; j--) t[i * W + j] = a[i] === b[j] ? t[(i + 1) * W + j + 1] + 1 : Math.max(t[(i + 1) * W + j], t[i * W + j + 1]);
    i = 0; j = 0; while(i < n && j < m){ if(a[i] === b[j]){ res[j] = true; i++; j++; } else if(t[(i + 1) * W + j] >= t[i * W + j + 1]) i++; else j++; }
    return res;
  }
  function lnHtml(txt, other, cls){
    var tl = String(txt).split("\n"), keep = lcsKeep(String(other).split("\n"), tl);
    return tl.map(function(l, q){ return '<div class="ln' + (keep[q] ? "" : " " + cls) + '">' + (esc(l) || "&nbsp;") + '</div>'; }).join("");
  }
    function secKey(it){ return it && it.keep ? "keep:" + it.keep : "h:" + (it && it.h && it.h.ar || ""); }
  function sectionsDiff(a, b){
    a = Array.isArray(a) ? a : []; b = Array.isArray(b) ? b : []; var used = {}, rows = [], order = [], note = "";
    b.forEach(function(nb){
      var key = secKey(nb), idx = -1; for(var i = 0; i < a.length; i++) if(!used[i] && secKey(a[i]) === key){ idx = i; break; }
      if(idx < 0){ rows.push({ op:"add", after:nb }); return; }
      used[idx] = 1; order.push(idx);
      if(JSON.stringify(a[idx]) === JSON.stringify(nb)) rows.push({ op:"same", after:nb }); else rows.push({ op:"change", before:a[idx], after:nb });
    });
    a.forEach(function(x, i){ if(!used[i]) rows.push({ op:"remove", before:x }); });
    for(var j = 1; j < order.length; j++) if(order[j] < order[j - 1]){ note = '<div class="pk-note">تغيّر ترتيب الأقسام.</div>'; break; }
    var OPL = { add:["إضافة", "ok"], remove:["حذف", "sale"], change:["تعديل", "wait"] };
    return note + rows.map(function(r){
      if(r.op === "same") return '<div class="c4-same">' + esc(cut(secText(r.after).split("\n")[0], 80)) + ' — بدون تغيير</div>';
      var bt = r.before ? secText(r.before) : "", at = r.after ? secText(r.after) : "";
      return '<div class="c4-dr"><div class="cms-drh">' + pill(OPL[r.op][0], OPL[r.op][1]) + '<b>' + esc(cut((r.after ? secText(r.after) : secText(r.before)).split("\n")[0], 80)) + '</b></div><div class="cms-dc"><div><small>قبل</small>' + (r.before ? lnHtml(bt, at, "del") : '<i class="cms-nov">—</i>') + '</div><div><small>بعد</small>' + (r.after ? lnHtml(at, bt, "add") : '<i class="cms-nov">—</i>') + '</div></div></div>';
    }).join("");
  }
  function legalDiffHtml(ch){
    var h = ""; (ch || []).forEach(function(c){
      if(!c.legal) return;
      var OP = { add:"إضافة", change:"تعديل", remove:"حذف" };
      h += '<div class="c4-ldk"><h4>' + esc(lbl(c.key)) + ' ' + pill(own(OP, c.op, ""), "wait") + '</h4>' + (c.group === "list" ? sectionsDiff(c.before, c.after) : '<div class="cms-dc"><div><small>قبل</small>' + valHtml(c.group, c.before) + '</div><div><small>بعد</small>' + valHtml(c.group, c.after) + '</div></div>') + '</div>';
    });
    return h || '<div class="empty">ما فيه تغييرات قانونية.</div>';
  }

  /* ---------- أحداث C4 ---------- */
  function c4Input(t){
    var f = t.getAttribute("data-c4f"); if(!f) return false;
    var p = f.split(":"), k = p[0], i = parseInt(p[1], 10), fl = p[2], lg = p[3];
    if(HAS.call(C4U, k)) S.c4[k] = t.value;
    else {
      var it = (S.c4[k] || [])[i]; if(!it) return true;
      if(lg){
        it[fl][lg] = t.value; var cn = t.parentNode.querySelector(".cms-cnt"), mx = parseInt(t.getAttribute("data-mx"), 10) || 0;
        if(cn){ cn.textContent = t.value.length + " / " + mx; cn.classList.toggle("bad", t.value.length > mx); }
      } else it[fl] = t.type === "datetime-local" ? dtOut(t.value) : t.value;
      if(k === "notice.items" && fl === "text" && lg === "ar") S.focus = it.id;
    }
    c4Touch(k, false); return true;
  }
  function c4Change(t){
    var f = t.getAttribute("data-c4t"), s = t.getAttribute("data-c4f");
    if(f){ var p = f.split(":"), it = (S.c4[p[0]] || [])[parseInt(p[1], 10)]; if(!it) return true; it[p[2]] = t.checked; c4Touch(p[0], true); return true; }
    if(s && t.tagName === "SELECT"){ var q = s.split(":"), it2 = (S.c4[q[0]] || [])[parseInt(q[1], 10)]; if(!it2) return true; it2[q[2]] = t.value; c4Touch(q[0], q[0] === "contact.social"); return true; }
    if(s && t.type === "datetime-local"){ return c4Input(t); }
    return false;
  }
  function c4Click(t){
    var a = t.getAttribute("data-c4a"); if(!a) return false;
    var k = t.getAttribute("data-c4k"), i = parseInt(t.getAttribute("data-c4n"), 10), rows = S.c4[k], max = (REGK[k] && REGK[k].max_items) || 10;
    if(a === "add"){ if(rows.length >= max) return true; rows.push(newItem(k)); c4Touch(k, true); var rr = C.box.querySelectorAll('[data-c4box="' + cssq(k) + '"] .c4row'); if(rr.length) rr[rr.length - 1].scrollIntoView({ block:"nearest" }); }
    else if(a === "addkeep"){ var kp = t.getAttribute("data-c4v"); if(rows.length >= max || rows.some(function(x){ return x.keep === kp; })) return true; rows.push({ on:true, keep:kp }); c4Touch(k, true); }
    else if(a === "up" || a === "dn"){ var j = a === "up" ? i - 1 : i + 1; if(j < 0 || j >= rows.length) return true; var x = rows[i]; rows[i] = rows[j]; rows[j] = x; c4Touch(k, true); }
    else if(a === "del"){ rows.splice(i, 1); c4Touch(k, true); }
    else if(a === "clear"){ if(rows.length && !confirm("بتنحذف كل العناصر من هالقائمة (وترجع الصفحة لنصها الأصلي لو ما فيه غيرها). نكمل؟")) return true; S.c4[k] = []; if(S.imp) delete S.imp[k]; c4Touch(k, true); }
    else if(a === "clrdt"){ var fl = t.getAttribute("data-c4fl"); if(rows[i]){ rows[i][fl] = ""; c4Touch(k, true); } }
    else if(a === "import"){
      if(rows.length && !confirm("القائمة الحالية بتنستبدل بنص الصفحة الحالي. نكمل؟")) return true;
      t.disabled = true; var my = TOK;
      importPage(k).then(function(items){ if(my !== TOK || !S) return; if(!items.length){ C.toast("⚠️ ما لقينا أقسام نستوردها"); t.disabled = false; return; }
          var sn = Object.create(null), lk = IMPLOG.filter(function(x){ var q = x.l + "\u0001" + x.h; if(sn[q]) return false; sn[q] = 1; return true; });
          S.imp = S.imp || {}; if(lk.length || IMPMETA || IMPCUT) S.imp[k] = { links:lk, meta:IMPMETA, cut:IMPCUT }; else delete S.imp[k];
          S.c4[k] = items; c4Touch(k, true);
          C.toast("تم الاستيراد: " + items.length + " عنصر — راجع النص وعدّله قبل النشر" + (lk.length ? " · " + lk.length + " رابط تحوّل لنص عادي (" + lk.slice(0, 3).map(function(x){ return cut(x.l, 24); }).join("، ") + (lk.length > 3 ? "…" : "") + ") — القائمة الكاملة تحت" : "") + (IMPMETA ? " · سطر «آخر تحديث» بينشال" : "")); },
        function(){ t.disabled = false; C.toast("⚠️ ما قدرنا نقرأ الصفحة الحالية"); });
    }
    else if(a === "prev"){ var it = rows[i]; if(!it) return true; S.focus = it.id; S.pvPage = "index"; S.prev = true; var pb = $("cmsPrev"); if(pb){ pb.classList.add("on"); pb.setAttribute("aria-pressed", "true"); } renderPrev(); var bx = $("cmsPrevBox"); if(bx) bx.scrollIntoView({ block:"nearest", behavior:"smooth" }); }
    return true;
  }

  /* ---------- تحميل ---------- */
  function load(ctx, view){
    C = ctx; if(!C.box) return;
    var my = ++TOK; clearTimeout(saveT); clearTimeout(prevT);
    if(!C.box.__cms){ C.box.__cms = 1; C.box.addEventListener("input", onInput); C.box.addEventListener("change", onChange); C.box.addEventListener("click", onClick); }
    C.box.innerHTML = '<div class="empty">… جاري التحميل</div>';
    Promise.all([rpc("admin_cfg_get", {}), loadDefaults()]).then(function(rs){
      if(my !== TOK) return; G = rs[0] || {}; if(!G.draft) throw new Error("bad get");
      REG = G.registry || []; REGK = Object.create(null); REG.forEach(function(r){ REGK[r.key] = r; });
      initState(); if(view) S.view = view; render();
    }).catch(function(e){
      if(my !== TOK) return; C.box.innerHTML = '<div class="pk-miss">' + esc(isMissing(e) ? MISS_TXT : "⚠️ " + C.errText(e)) + '</div>'; S = null;
    });
  }
  window.addEventListener("beforeunload", function(e){ if(S && (dirtyAny() || S.saving)){ e.preventDefault(); e.returnValue = ""; } });
  root.AdmCms = { load: load, flush: function(){ return S ? flush() : Promise.resolve(); }, init: function(ctx){ C = ctx; } };
})(window);
