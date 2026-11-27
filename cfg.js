/* (C1) نصوص الموقع من لوحة الأدمن: الإعدادات المنشورة تُطبَّق فوق نص الصفحة الثابت.
   - لو ما فيه إعدادات (catalog بدون cfg_v) أو صار أي خطأ: الصفحة تبقى كما هي بالضبط.
   - النصوص بـtextContent فقط (لا HTML)، ومفاتيح data-cms الموجودة بالصفحة فقط، والقائمة (الأسئلة الشائعة) من قالب العنصر الأول.
   - آخر إصدار يُحفظ بـlocalStorage؛ نفس الإصدار = بدون أي طلب، إصدار مختلف = طلب واحد فقط (site_config).
   - (C4) فوقها: شريط الإعلان (الرئيسية فقط)، أقسام الشروط/الخصوصية من القائمة، روابط الفوتر والتواصل. كلها textContent/setAttribute فقط،
     وما ينرسم شي لو ما فيه نشر. صفحة الخصوصية (بدون مكتبة Supabase) تسأل catalog عبر REST مرة كل 10 دقايق بالكثير لو ما فيه نشر. */
(function(){
  "use strict";
  var KEY = "sahra-cfg-v1", MAX = 400, MAXQ = 200, MAXA = 800, MAXN = 20;
  var has = Object.prototype.hasOwnProperty;
  var applied = 0, tried = {}, busy = null;

  function isObj(x){ return !!x && typeof x === "object" && !Array.isArray(x); }
  function lang(){ return window.SAHRA_LANG === "en" ? "en" : "ar"; }
  function str(x){ return typeof x === "string" && /\S/.test(x); }
  /* نص لغة الصفحة: الإنجليزي لو موجود وإلا العربي */
  function pick(o, max){
    if(!isObj(o)) return null;
    var v = lang() === "en" && str(o.en) ? o.en : (str(o.ar) ? o.ar : null);
    return v == null ? null : v.slice(0, max || MAX);
  }
  function valid(c){ return isObj(c) && isObj(c.data) && typeof c.v === "number" && c.v > 0; }
  function read(){ try{ var c = JSON.parse(localStorage.getItem(KEY) || "null"); return valid(c) ? c : null; }catch(e){ return null; } }
  function write(c){ try{ localStorage.setItem(KEY, JSON.stringify({ v: c.v, data: c.data, at: Date.now() })); }catch(e){} }
  function drop(){ try{ localStorage.removeItem(KEY); }catch(e){} }

  function revert(){
    var els = document.querySelectorAll("[data-cms]");
    for(var i = 0; i < els.length; i++){
      var e = els[i];
      if(has.call(e, "_cms0")){ e.textContent = e._cms0; delete e._cms0; }
    }
    try{ revertC4(); }catch(x){}
    var list = document.querySelector("[data-cms-list=faq]");
    if(!list) return;
    var gen = list.querySelectorAll("details[data-cms-gen]"), hid = list.querySelectorAll("details[data-cms-hid]");
    for(i = 0; i < gen.length; i++) gen[i].parentNode.removeChild(gen[i]);
    for(i = 0; i < hid.length; i++){ hid[i].hidden = false; hid[i].removeAttribute("data-cms-hid"); }
  }

  function applyList(data){
    var list = document.querySelector("[data-cms-list=faq]"), src = isObj(data.list) && Array.isArray(data.list.faq) ? data.list.faq : null;
    if(!list || !src) return;
    var orig = [], i, k, kids = list.children;
    for(i = 0; i < kids.length; i++) if(kids[i].tagName === "DETAILS") orig.push(kids[i]);
    if(!orig.length) return;
    var items = [];
    for(i = 0; i < src.length && items.length < MAXN; i++){
      var it = src[i];
      if(!isObj(it) || it.on === false) continue;
      var q = pick(it.q, MAXQ), a = pick(it.a, MAXA);
      if(q && a) items.push([q, a]);
    }
    if(!items.length) return;
    var tpl = orig[0], first = orig[0];
    for(i = 0; i < items.length; i++){
      var d = tpl.cloneNode(true), ids = d.querySelectorAll("[id]"), s = d.querySelector("summary"), p = d.querySelector("p");
      if(!s || !p) return;
      d.removeAttribute("id"); d.removeAttribute("open"); d.removeAttribute("data-cms-hid"); d.hidden = false;
      for(k = 0; k < ids.length; k++) ids[k].removeAttribute("id");
      s.textContent = items[i][0]; p.textContent = items[i][1];
      d.setAttribute("data-cms-gen", "1");
      list.insertBefore(d, first);
    }
    /* الأصلية تبقى مخفية (فيها عناصر ديناميكية يكتب فيها index.js مثل ldPayFaq) */
    for(i = 0; i < orig.length; i++){ orig[i].hidden = true; orig[i].setAttribute("data-cms-hid", "1"); }
  }

  function apply(c){
    try{
      var data = c && (valid(c) ? c.data : (isObj(c) ? c : null));
      if(!data) return;
      revert();
      var text = isObj(data.text) ? data.text : {}, els = document.querySelectorAll("[data-cms]");
      for(var i = 0; i < els.length; i++){
        var e = els[i], k = e.getAttribute("data-cms");
        if(!has.call(text, k)) continue;
        var v = pick(text[k], MAX);
        if(v == null) continue;
        if(!has.call(e, "_cms0")) e._cms0 = e.textContent;
        e.textContent = v;
      }
      applyList(data);
      LAST = data;
      try{ applyC4(data); }catch(x){ try{ revertC4(); }catch(y){} }
      applied = c && c.v ? c.v : 1;
    }catch(e){ try{ revert(); }catch(x){} applied = 0; }
  }

  /* cat: الكتالوج، rpc: دالة ترجع وعد بنتيجة site_config() من نفس عميل Supabase اللي بـindex.js */
  function onCatalog(cat, rpc){
    try{
      if(PV) return;   /* المعاينة: الصفحة تعرض المسودة فقط */
      var v = cat && +cat.cfg_v;
      if(!v || v < 1 || v !== Math.floor(v)){
        if(applied){ revert(); applied = 0; drop(); }   /* انلغى النشر: نرجع للنص الثابت */
        markNone();
        return;
      }
      if(applied === v && applied) return;
      var c = read();
      if(c && c.v === v){ apply(c); return; }
      if(tried[v] || busy || typeof rpc !== "function") return;   /* طلب واحد لكل إصدار */
      tried[v] = 1;
      busy = Promise.resolve().then(rpc).then(function(r){
        busy = null;
        var d = r && !r.error ? r.data : null;
        if(typeof d === "string") d = JSON.parse(d);
        if(!valid(d)) return;
        write(d); apply(d);
      }, function(){ busy = null; }).then(null, function(){ busy = null; });
    }catch(e){ busy = null; }
  }

  /* معاينة الأدمن: فعّالة فقط داخل iframe من نفس النطاق مع cfg-preview=1؛ تطبّق المسودة بنفس التنظيف بدون أي كتابة للكاش */
  var PV = location.search.indexOf("cfg-preview=1") !== -1 && window.parent !== window;
  if(PV) window.addEventListener("message", function(ev){
    try{
      if(ev.origin !== location.origin || ev.source !== window.parent) return;
      var m = ev.data;
      if(!isObj(m) || m.type !== "sahra-cfg-preview" || !isObj(m.data)) return;
      PVNOW = typeof m.now === "string" ? tsMs(m.now) : null; PVFOCUS = typeof m.focus === "string" ? m.focus : null;
      apply(m.data);
    }catch(e){}
  });

  /* ================= (C4) الإعلان + الأقسام القانونية + روابط الفوتر والتواصل ================= */
  var LAST = null, PVNOW = null, PVFOCUS = null, NOTE = null, OFF, offBusy = false, ntTimer = 0, ntWatch = false, ORDER = null;
  var NKEY = "sahra-notice-v1", ZKEY = "sahra-cfg-none", SRK = "sahra-srv-off";
  var NSTYLE = { info: 1, warn: 1, promo: 1 }, NICON = { banner: "📢", maintenance: "🛠️", welcome: "👋", new_game: "🎮", offer: "🏷️", season: "🌙" };
  var SOC = { x: "X", instagram: "Instagram", tiktok: "TikTok", snapchat: "Snapchat", youtube: "YouTube" };

  function lst(data, key){ return isObj(data) && isObj(data.list) && Array.isArray(data.list[key]) ? data.list[key] : null; }
  function tsMs(s){
    if(typeof s !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?(Z|[+-]\d\d:\d\d)$/.test(s)) return null;
    var t = Date.parse(s); return isNaN(t) ? null : t;
  }
  function hash(s){ var h = 5381; s = String(s); for(var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); }
  /* روابط: https أو مسار داخلي أو #مرساة فقط (السيرفر يتحقق من النطاق؛ هنا نتأكد من الشكل) */
  /* قائمة النطاقات المسموحة (نسخة من جدول cfg_allowed_hosts بالسيرفر؛ السيرفر هو المرجع، وهنا فحص ثاني لو انكسر الكاش) */
  var HOSTS = ["x.com", "twitter.com", "instagram.com", "tiktok.com", "snapchat.com", "wa.me", "api.whatsapp.com", "youtube.com", "t.me", "sahratable.com"];
  function hostOk(h){ for(var i = 0; i < HOSTS.length; i++){ var x = HOSTS[i]; if(h === x || (h.length > x.length && h.slice(-(x.length + 1)) === "." + x)) return true; } return false; }
  /* https: بدون userinfo (@) ومن النطاقات المسموحة بس */
  function httpsOk(u){
    if(typeof u !== "string" || u.length > 500 || /[\s<>"'\\\u0000-\u001f\u007f]/.test(u)) return false;
    var m = /^https:\/\/([^\/?#]+)/i.exec(u); if(!m || m[1].indexOf("@") !== -1) return false;
    var h = m[1].replace(/:\d{1,5}$/, "").toLowerCase();
    try{ var p = new URL(u); if(p.protocol !== "https:" || p.username || p.password || p.hostname !== h) return false; }catch(e){ return false; }
    return /^[a-z0-9.-]+$/.test(h) && hostOk(h);
  }
  /* مسار داخلي: بدون // ولا نقاط مسار ولا شرطة مائلة/خلفية مشفّرة؛ ويتأكد بتحليل URL إنه نفس الأصل */
  function pathOk(u){
    if(typeof u !== "string" || u.length > 500 || /[\s<>"'\\\u0000-\u001f\u007f]/.test(u) || u.charAt(0) !== "/" || u.charAt(1) === "/") return false;
    var p = u.split(/[?#]/)[0];
    if(p.indexOf("//") !== -1 || /(^|\/)\.\.?(\/|$)/.test(p) || /%(2f|5c|09|0a|0d|00|2e)/i.test(p)) return false;
    try{ var b = location.origin && location.origin !== "null" ? location.origin : "https://sahratable.com", r = new URL(u, b); if(r.origin !== b || r.pathname.indexOf("//") === 0) return false; }catch(e){ return false; }
    return true;
  }
  function safeHref(u){
    if(typeof u !== "string") return null;
    if(/^https:/i.test(u)) return httpsOk(u) ? u : null;
    if(u.charAt(0) === "/") return pathOk(u) ? u : null;
    if(/^#[\w\-]{1,60}$/.test(u)) return u;
    return null;
  }
  function mkA(href, text, ext){
    var a = document.createElement("a"); a.href = href; a.textContent = text;
    if(ext){ a.target = "_blank"; a.rel = "noopener nofollow"; }
    return a;
  }
  function isExt(h){ return /^https:/i.test(h); }

  /* ---------- شريط الإعلان ---------- */
  function dismissedMap(){ try{ var o = JSON.parse(localStorage.getItem(NKEY) || "{}"); return isObj(o) ? o : {}; }catch(e){ return {}; } }
  function rememberDismiss(id, h){
    if(PV) return;
    try{ var o = dismissedMap(), ks = Object.keys(o); if(ks.length > 40) delete o[ks[0]]; o[id] = h; localStorage.setItem(NKEY, JSON.stringify(o)); }catch(e){}
  }
  function nowMs(){ return PVNOW != null ? PVNOW : Date.now() + (typeof OFF === "number" ? OFF : 0); }
  /* ساعة السيرفر: ترويسة Date لطلب HEAD لنفس الموقع، وبس لو فيه إعلان له جدولة. فرق أقل من 90 ثانية = نتجاهله (ساعة الجهاز) */
  function ensureOff(){
    if(PV || OFF !== undefined || offBusy) return;
    try{
      var s = JSON.parse(sessionStorage.getItem(SRK) || "null");
      if(s && typeof s.o === "number" && Date.now() - s.t < 1800000){ OFF = s.o; return; }
    }catch(e){}
    if(typeof fetch !== "function"){ OFF = 0; return; }
    offBusy = true; var t0 = Date.now();
    fetch(location.pathname, { method: "HEAD", cache: "no-store", credentials: "omit" }).then(function(r){
      var d = r.headers.get("date"), t1 = Date.now(), ms = d ? Date.parse(d) : NaN, o = 0;
      if(!isNaN(ms)){ o = ms - Math.round((t0 + t1) / 2); if(Math.abs(o) < 90000 || Math.abs(o) > 31622400000) o = 0; }
      OFF = o; try{ sessionStorage.setItem(SRK, JSON.stringify({ o: o, t: Date.now() })); }catch(e){}
    }, function(){ OFF = 0; }).then(function(){ offBusy = false; renderNotice(); }, function(){ offBusy = false; OFF = 0; });
  }
  function pickNotice(items){
    var now = nowMs(), dm = dismissedMap(), wait = false, next = Infinity;
    for(var i = 0; i < items.length && i < 10; i++){
      var it = items[i];
      if(!isObj(it) || it.on === false || typeof it.id !== "string" || !/^[a-z0-9-]{2,30}$/.test(it.id)) continue;
      var text = pick(it.text, 160); if(!text) continue;
      var from = tsMs(it.from), to = tsMs(it.to), focus = PV && PVFOCUS === it.id;
      if(!focus){
        /* وقت موجود وما ينقرا = ما نعرض الإعلان (ما نفترض إنه بلا جدولة) */
        if((it.from != null && from == null) || (it.to != null && to == null)) continue;
        /* ننتظر ساعة السيرفر: ما نعرض شي (ولا إعلان لاحق بالقائمة) لين تجي */
        if((it.from || it.to) && !PV && OFF === undefined) return { it: null, next: next, wait: true };
        if(from != null && now < from){ if(from < next) next = from; continue; }
        if(to != null){ if(now >= to) continue; if(to < next) next = to; }
        if(has.call(dm, it.id) && dm[it.id] === hash(text)) continue;
      }
      return { it: it, text: text, next: next, wait: wait };
    }
    return { it: null, next: next, wait: wait };
  }
  function onHomeNow(){
    var l = document.getElementById("landing");
    if(l && !l.hidden) return true;
    var h = document.getElementById("view-home");
    return !!(h && !h.hidden && !document.body.classList.contains("on-landing") && !document.body.classList.contains("in-game"));
  }
  function removeNotice(){ if(NOTE && NOTE.parentNode) NOTE.parentNode.removeChild(NOTE); NOTE = null; }
  function renderNotice(){
    clearTimeout(ntTimer);
    var items = lst(LAST, "notice.items");
    if(!items || !document.getElementById("landing")){ removeNotice(); return; }   /* الرئيسية فقط (صفحة اللعب) */
    var anyT = false; for(var q = 0; q < items.length; q++) if(isObj(items[q]) && items[q].on !== false && (items[q].from || items[q].to)) anyT = true;
    if(anyT) ensureOff();
    var r = pickNotice(items);
    if(!r.it){ removeNotice(); scheduleNotice(r.next); return; }
    var it = r.it, st = has.call(NSTYLE, it.style) ? it.style : "info", link = safeHref(it.link), lab = link ? pick(it.link_label, 40) : null;
    if(!NOTE){
      NOTE = document.createElement("div"); NOTE.setAttribute("role", "status");
      var anchor = document.getElementById("landing"); anchor.parentNode.insertBefore(NOTE, anchor);
    }
    var sig = [it.id, st, r.text, link, lab, it.dismissible !== false, has.call(NICON, it.kind) ? it.kind : "", lang()].join("\u0001");
    if(NOTE._sig !== sig){
      NOTE._sig = sig; NOTE.textContent = ""; NOTE.className = "cfg-notice is-" + st; NOTE.setAttribute("data-notice-id", it.id);
      var ic = document.createElement("span"); ic.className = "nt-ic"; ic.setAttribute("aria-hidden", "true"); ic.textContent = has.call(NICON, it.kind) ? NICON[it.kind] : NICON.banner;
      var tx = document.createElement("span"); tx.className = "nt-tx"; tx.textContent = r.text;
      var bd = document.createElement("span"); bd.className = "nt-body"; bd.appendChild(tx);
      if(link){ var a = mkA(link, lab || (lang() === "en" ? "Details" : "التفاصيل"), isExt(link)); a.className = "nt-a"; bd.appendChild(a); }
      NOTE.appendChild(ic); NOTE.appendChild(bd);
      if(it.dismissible !== false){
        var x = document.createElement("button"); x.type = "button"; x.className = "nt-x"; x.textContent = "×";
        x.setAttribute("aria-label", lang() === "en" ? "Dismiss" : "إغلاق");
        var id = it.id, h = hash(r.text);
        x.addEventListener("click", function(){ rememberDismiss(id, h); NOTE._sig = ""; renderNotice(); });
        NOTE.appendChild(x);
      }
    }
    NOTE.hidden = !(PV || onHomeNow());
    scheduleNotice(r.next);
    if(!ntWatch){
      ntWatch = true;
      try{
        var mo = new MutationObserver(function(){ if(NOTE) NOTE.hidden = !(PV || onHomeNow()); });
        ["landing", "view-home"].forEach(function(id){ var e = document.getElementById(id); if(e) mo.observe(e, { attributes: true, attributeFilter: ["hidden"] }); });
        mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      }catch(e){}
      document.addEventListener("visibilitychange", function(){ if(!document.hidden && LAST) renderNotice(); });
    }
  }
  function scheduleNotice(next){
    if(PV || !isFinite(next)) return;
    var d = Math.max(1000, Math.min(next - nowMs() + 500, 6 * 3600000));
    ntTimer = setTimeout(renderNotice, d);
  }

  /* ---------- نص منسّق آمن: **عريض** و[نص](https://…) وسطر «- » نقطة ---------- */
  function inlineTo(parent, s){
    var re = /\*\*([^*\n]+)\*\*|(!?)\[([^\[\]*\n]+)\]\((https:\/\/[^\s()<>"'\\]+)\)/g, last = 0, m;
    while((m = re.exec(s))){
      if(m.index > last) parent.appendChild(document.createTextNode(s.slice(last, m.index)));
      if(m[1] != null){ var b = document.createElement("b"); b.textContent = m[1]; parent.appendChild(b); }
      else if(m[2] === "!") parent.appendChild(document.createTextNode(m[0]));   /* ![x](url) يبقى نص */
      else if(httpsOk(m[4])) parent.appendChild(mkA(m[4], m[3], true));
      else parent.appendChild(document.createTextNode(m[3]));   /* رابط خارج القائمة المسموحة: نص عادي */
      last = m.index + m[0].length;
    }
    if(last < s.length) parent.appendChild(document.createTextNode(s.slice(last)));
  }
  function richTo(box, text){
    var lines = String(text).replace(/\r/g, "").split("\n"), ul = null, p = null, n = 0;
    for(var i = 0; i < lines.length; i++){
      var ln = lines[i];
      if(/^- \S/.test(ln)){
        p = null; if(!ul){ ul = document.createElement("ul"); box.appendChild(ul); }
        var li = document.createElement("li"); inlineTo(li, ln.slice(2)); ul.appendChild(li); n++;
      } else if(!/\S/.test(ln)){ ul = null; p = null; }
      else {
        ul = null;
        if(!p){ p = document.createElement("p"); box.appendChild(p); } else p.appendChild(document.createElement("br"));
        inlineTo(p, ln); n++;
      }
    }
    return n;
  }

  /* ---------- الأقسام القانونية (terms / privacy) ---------- */
  function legalHost(){ var m = document.querySelector("main[data-cms-list]"); var k = m && m.getAttribute("data-cms-list"); return m && /^legal\./.test(k || "") ? { main: m, key: k } : null; }
  function cardsOf(main){ var o = []; for(var i = 0; i < main.children.length; i++){ var e = main.children[i]; if(e.tagName === "SECTION" && e.classList.contains("card") && !e.hasAttribute("data-cms-gen")) o.push(e); } return o; }
  function applyLegal(data){
    var h = legalHost(); if(!h) return;
    var src = lst(data, h.key); if(!src) return;
    if(!ORDER){ ORDER = cardsOf(h.main); ORDER.anchor = ORDER.length ? ORDER[ORDER.length - 1].nextSibling : null; }
    var keeps = Object.create(null), managed = [], i, seq = [], made = 0, byH = Object.create(null);
    for(i = 0; i < ORDER.length; i++){
      var k = ORDER[i].getAttribute("data-cms-keep");
      if(k) keeps[k] = ORDER[i]; else if(!ORDER[i].hasAttribute("data-cms-fixed")){
        managed.push(ORDER[i]);
        var oh = ORDER[i].querySelector("h2"), ot = oh ? oh.textContent.replace(/\s+/g, " ").trim() : "";
        if(ot && !(ot in byH) && (ORDER[i].id || ORDER[i].className !== "card")) byH[ot] = ORDER[i];   /* بطاقة أصلية لها id أو تمييز (مثل سياسة الاسترجاع) */
      }
    }
    if(!managed.length) return;
    var used = Object.create(null), prevBase = null, prevSec = null;
    for(i = 0; i < src.length && i < 14; i++){
      var it = src[i]; if(!isObj(it) || it.on === false) continue;
      if(typeof it.keep === "string"){ if(it.keep in keeps && !used[it.keep]){ used[it.keep] = 1; seq.push(keeps[it.keep]); } prevBase = prevSec = null; continue; }
      var hh = pick(it.h, 120), bb = pick(it.body, 2500); if(!hh || !bb) continue;
      /* «العنوان (تابع)» (ناتج الاستيراد للأقسام الطويلة) يرجع يندمج بالقسم السابق بدل بطاقة بعنوان مكرر */
      if(prevSec && prevBase && hh === prevBase + " (تابع)"){ if(richTo(prevSec, bb)) made++; continue; }
      var sec = document.createElement("section"); sec.className = "card"; sec.setAttribute("data-cms-gen", "1");
      var h2 = document.createElement("h2"); h2.textContent = hh; sec.appendChild(h2);
      if(!richTo(sec, bb)) continue;
      var og = byH[hh.replace(/\s+/g, " ").trim()];   /* نفس عنوان بطاقة أصلية مميّزة: نرجّع الـid والتمييز (#refund) من الصفحة نفسها، مو من النص المنشور */
      if(og && !og._cmsId0){ sec.className = og.className; if(og.id){ og._cmsId0 = og.id; sec.id = og.id; og.removeAttribute("id"); } }
      prevBase = hh.slice(0, 106); prevSec = sec; seq.push(sec); made++;
    }
    if(!made) return;   /* ما نمسح صفحة قانونية بقائمة فاضية/تالفة */
    for(i = 0; i < managed.length; i++){ managed[i].hidden = true; managed[i].setAttribute("data-cms-hid", "1"); }
    /* بطاقة التواصل (#contact) تبقى دايمًا: رابط «الدعم الفني» وطريقة حذف الحساب يوصلون لها حتى لو انحذفت من القائمة */
    if(!used.contact && keeps.contact){ used.contact = 1; seq.push(keeps.contact); }
    for(var key in keeps) if(!used[key]){ keeps[key].hidden = true; keeps[key].setAttribute("data-cms-hid", "1"); }
    for(i = 0; i < seq.length; i++){ seq[i].hidden = false; h.main.insertBefore(seq[i], managed[0]); }
    var meta = document.querySelector(".head .meta");   /* «آخر تحديث» الثابت صار قديم: نشيل التاريخ لين نربطه بتاريخ النشر */
    if(meta && !has.call(meta, "_cms0")){ meta._cms0 = meta.textContent; meta.textContent = "طاولة السهرة"; }
  }
  function revertLegal(){
    var gen = document.querySelectorAll("section[data-cms-gen]"), i;
    if(ORDER) for(i = 0; i < ORDER.length; i++) if(ORDER[i]._cmsId0){ ORDER[i].id = ORDER[i]._cmsId0; delete ORDER[i]._cmsId0; }
    for(i = 0; i < gen.length; i++) if(gen[i].parentNode && gen[i].parentNode.hasAttribute && gen[i].parentNode.hasAttribute("data-cms-list")) gen[i].parentNode.removeChild(gen[i]);
    if(ORDER && ORDER.length){
      var p = ORDER[0].parentNode;
      for(i = 0; i < ORDER.length; i++){ ORDER[i].hidden = false; ORDER[i].removeAttribute("data-cms-hid"); p.insertBefore(ORDER[i], ORDER.anchor); }
    }
  }

  /* ---------- روابط الفوتر والتواصل ---------- */
  function footBox(){ return document.querySelector(".ld-foot nav") || document.querySelector("footer .links") || document.querySelector("main > footer > div"); }
  function applyFoot(data){
    var box = footBox(); if(!box) return;
    var rows = [], f = lst(data, "links.footer"), s = lst(data, "contact.social"), i;
    for(i = 0; f && i < f.length && rows.length < 8; i++){
      var it = f[i]; if(!isObj(it) || it.on === false) continue;
      var lb = pick(it.label, 40), hr = safeHref(it.href); if(lb && hr) rows.push([hr, lb]);
    }
    var seen = {};
    for(i = 0; s && i < s.length && i < 5; i++){
      var so = s[i]; if(!isObj(so) || so.on === false || !has.call(SOC, so.kind) || seen[so.kind]) continue;
      var u = safeHref(so.url); if(u && isExt(u)){ seen[so.kind] = 1; rows.push([u, SOC[so.kind]]); }
    }
    if(!rows.length) return;
    var isNav = box.tagName === "NAV", ref = isNav ? document.getElementById("ldContact") : null;
    for(i = 0; i < rows.length; i++){
      var a = mkA(rows[i][0], rows[i][1], isExt(rows[i][0])); a.setAttribute("data-cms-genf", "1");
      if(!isNav){ var sp = document.createTextNode(" · "); box.appendChild(sp); a._sp = sp; }
      if(ref && ref.parentNode === box) box.insertBefore(a, ref); else box.appendChild(a);
    }
  }
  function waDigits(v){ return typeof v === "string" && /^[1-9][0-9]{7,14}$/.test(v) ? v : null; }
  function emailOk(v){ return typeof v === "string" && v.length <= 120 && /^[A-Za-z0-9._+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+$/.test(v) ? v : null; }
  function urlVal(data, k){ return isObj(data) && isObj(data.url) && has.call(data.url, k) ? data.url[k] : null; }
  function applyContact(data){
    var box = document.getElementById("contactBox"); if(!box) return;   /* صفحة الشروط */
    var wa = waDigits(urlVal(data, "contact.whatsapp")), em = emailOk(urlVal(data, "contact.email")), a = box.querySelector("a.wa");
    if(wa && !a){   /* ما فيه رقم بالكتالوج (فاضي): نبني زر الواتساب من الرقم المنشور */
      if(!has.call(box, "_cms0h")) box._cms0h = box.innerHTML;
      box.textContent = ""; a = mkA("https://wa.me/" + wa, "💬 تواصل معنا بالواتساب", true); a.className = "wa"; a.setAttribute("data-cms-genw", "1"); box.appendChild(a);
    } else if(wa && a && !a.hasAttribute("data-cms-genw")){ if(!has.call(a, "_cms0")) a._cms0 = a.getAttribute("href"); a.setAttribute("href", "https://wa.me/" + wa); }
    else if(a && a.hasAttribute("data-cms-genw") && wa) a.setAttribute("href", "https://wa.me/" + wa);
    var old = document.querySelector("[data-cms-genc]"); if(old && old.parentNode) old.parentNode.removeChild(old);
    var s = lst(data, "contact.social"), parts = [], i, seen = {};
    if(em) parts.push([("mailto:" + em), "✉️ " + em, false]);
    for(i = 0; s && i < s.length && i < 5; i++){
      var so = s[i]; if(!isObj(so) || so.on === false || !has.call(SOC, so.kind) || seen[so.kind]) continue;
      var u = safeHref(so.url); if(u && isExt(u)){ seen[so.kind] = 1; parts.push([u, SOC[so.kind], true]); }
    }
    if(!parts.length) return;
    var ex = document.createElement("div"); ex.className = "contact"; ex.setAttribute("data-cms-genc", "1");
    for(i = 0; i < parts.length; i++){ var l = mkA(parts[i][0], parts[i][1], parts[i][2]); l.className = "back"; ex.appendChild(l); }
    box.parentNode.insertBefore(ex, box.nextSibling);
  }
  function revertC4(){
    var n, i;
    LAST = null; removeNotice(); clearTimeout(ntTimer);
    revertLegal();
    n = document.querySelectorAll("[data-cms-genf]"); for(i = 0; i < n.length; i++){ var a = n[i]; if(a._sp && a._sp.parentNode) a._sp.parentNode.removeChild(a._sp); if(a.parentNode) a.parentNode.removeChild(a); }
    n = document.querySelectorAll("[data-cms-genc]"); for(i = 0; i < n.length; i++) if(n[i].parentNode) n[i].parentNode.removeChild(n[i]);
    var cb = document.getElementById("contactBox");
    if(cb && has.call(cb, "_cms0h")){ if(cb.querySelector("a[data-cms-genw]")) cb.innerHTML = cb._cms0h; delete cb._cms0h; }
    var w = document.querySelectorAll("a.wa"); for(i = 0; i < w.length; i++) if(has.call(w[i], "_cms0")){ w[i].setAttribute("href", w[i]._cms0); delete w[i]._cms0; }
    var meta = document.querySelector(".head .meta"); if(meta && has.call(meta, "_cms0")){ meta.textContent = meta._cms0; delete meta._cms0; }
  }
  function applyC4(data){ applyLegal(data); applyFoot(data); applyContact(data); renderNotice(); }

  /* ---------- علامة «ما فيه نشر» (تخلي صفحة الخصوصية ما تسأل كل مرة) + بدء الصفحات ---------- */
  function markNone(){ if(!PV) try{ localStorage.setItem(ZKEY, String(Date.now())); }catch(e){} }
  function noneFresh(){ try{ var t = +localStorage.getItem(ZKEY); return t > 0 && Date.now() - t < 600000 && Date.now() >= t; }catch(e){ return false; } }
  /* صفحات الشروط/الخصوصية: نطبّق النسخة المحفوظة فورًا (لو فيه) عشان ما يلمع النص القديم */
  function early(){
    if(PV || !legalHost()) return;
    var c = read(); if(c) apply(c);
  }
  /* صفحة بدون مكتبة Supabase (الخصوصية): catalog و site_config عبر REST بمفتاح anon العام، وبس لو مو معروف إنه ما فيه نشر */
  function standalone(){
    if(PV) return;
    var url = window.SAHRA_SUPABASE_URL, key = window.SAHRA_SUPABASE_ANON_KEY;
    if(typeof fetch !== "function" || !url || !key || String(url).indexOf("xxxx") !== -1) return;
    if(!read() && noneFresh()) return;
    function call(fn){
      return fetch(String(url).replace(/\/+$/, "") + "/rest/v1/rpc/" + fn, { method: "POST", credentials: "omit",
        headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: "{}" })
        .then(function(r){ return r.ok ? r.json() : { __err: 1 }; });
    }
    call("catalog").then(function(d){
      if(typeof d === "string") d = JSON.parse(d);
      if(!isObj(d) || d.__err) return;
      onCatalog(d, function(){ return call("site_config").then(function(x){ return x && x.__err ? { error: 1 } : { data: x }; }); });
    }).then(null, function(){});
  }
  (function(){
    var sa = document.currentScript && document.currentScript.hasAttribute("data-standalone");
    function go(){ early(); if(sa) standalone(); }
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  })();

  window.SahraCfg = { onCatalog: onCatalog, apply: apply };
  /* (C4) مخفية عن الإحصاء (Object.keys) عشان واجهة C1 تبقى نفسها: صفحة الشروط تناديها بعد ما تبني صندوق التواصل */
  /* (M1) علم المعاينة: index.js يسأله ليعرض الصفحة الرئيسية (landing) داخل إطار لوحة الأدمن بس */
  try{ Object.defineProperty(window.SahraCfg, "pv", { get: function(){ return !!PV; }, enumerable: false }); }catch(e){}
  try{ Object.defineProperty(window.SahraCfg, "again", { value: function(){ try{ if(LAST) applyContact(LAST); }catch(e){} }, enumerable: false }); }catch(e){}
})();
