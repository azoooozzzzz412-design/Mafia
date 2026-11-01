/* طاولة السهرة — كود صفحة اللعب (index.html).
   ينحمّل آخر الصفحة (مو defer) عشان يشتغل قبل مكتبة Supabase، مثل ما كان داخل الصفحة.
   لو عدّلته: غيّر رقم النسخة بـ index.html (index.js?v=…) عشان الأجهزة تاخذ الجديد.

   الأقسام بالترتيب (ابحث عن العنوان):
     shared utils · قراءة الأسئلة بصوت · الجولات وحجمها وإعدادات اللعب · state (الحفظ) · view router (التنقل)
     الرصيد وشاشة «ابدأ جولة» · teams module (الفرق والنقاط) · نقاط الفوز
     TRIVIA (سين جيم) + وسائل سين جيم · EMOJI (تحدي الصور) · CHARADES (التمثيل) · المؤقتات · MAFIA (المافيا)
     أسرع إصبع (أزرار الجوالات) · الإجابات بجوال المقدّم · الحروف · حزر العلم · الإجابة من الجوال (الأعلام والصور)
     حطها على راسك · سهرة جديدة · طريق المليون · مربوطين · مخطط السهرة · ملخص السهرة
     التشغيل · الصفحة العامة (قبل الدخول) · الشراء · الدخول بحساب Google · التشغيل السريع
*/
(function(){
  "use strict";
  document.documentElement.setAttribute("lang","ar");
  document.documentElement.setAttribute("dir","rtl");

  var STORE_KEY = "sahra-table-v1";

  /* ============ shared utils ============ */
  function shuffle(arr){
    var a = arr.slice();
    for(var i=a.length-1;i>0;i--){
      var j = Math.floor(Math.random()*(i+1));
      var t=a[i]; a[i]=a[j]; a[j]=t;
    }
    return a;
  }
  function uid(){ return "id"+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  /* باركود SVG لنص أو رابط (يرمي خطأ لو ما قدر — كل مكان يعرض رسالته) */
  function qrSvg(text, cell, margin){ var qr = qrcode(0, "M"); qr.addData(text); qr.make(); return qr.createSvgTag({ cellSize:cell, margin:margin }); }
  /* نسخ رابط — ولو المتصفح ما سمح، نعرضه عشان ينسخه بيده */
  function copyLink(url, okMsg){
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function(){ toast(okMsg); }, function(){ prompt("انسخ الرابط:", url); });
    else prompt("انسخ الرابط:", url);
  }
  /* الفريق برقمه (null لو ما لقيناه) */
  function teamOf(id){ return store.teams.find(function(t){ return t.id === id; }) || null; }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
    });
  }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  var toastTimer = null;
  function toast(msg){
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.classList.remove("show"); }, 2200);
  }

  /* ============ قراءة الأسئلة بصوت واضح وعالي (من المتصفح نفسه — بدون أي خدمة خارجية) ============
     - تلقائي: أول ما يطلع السؤال (سين جيم، الحروف، المليون). الكلمات السرية (على راسك، التمثيل) ما تنقرى أبدًا.
     - أفضل صوت عربي بالجهاز (السعودي أول)، الصوت بأعلى مستوى (1)، وسرعة أهدى شوي عشان يكون واضح. */
  var TTS = (function(){
    var KEY = "sahra-tts-v1", synth = window.speechSynthesis || null, OK = !!(synth && window.SpeechSynthesisUtterance);
    var RATES = [0.75, 0.9, 1.1], cfg = { auto: true, rate: 0.9, voice: "" };
    try{
      var sv = JSON.parse(localStorage.getItem(KEY) || "null");
      if(sv && typeof sv === "object"){
        if(typeof sv.auto === "boolean") cfg.auto = sv.auto;
        if(RATES.indexOf(+sv.rate) !== -1) cfg.rate = +sv.rate;
        if(typeof sv.voice === "string") cfg.voice = sv.voice.slice(0, 300);
      }
    }catch(e){}
    var voices = [], lastKey = "", busy = false, gen = 0;
    var el = { btn: document.getElementById("ttsBtn"), pop: document.getElementById("ttsPop"), auto: document.getElementById("ttsAuto"), rate: document.getElementById("ttsRate"),
               voice: document.getElementById("ttsVoice"), vrow: document.getElementById("ttsVoiceRow"), test: document.getElementById("ttsTest"), note: document.getElementById("ttsNote") };
    function save(){ try{ localStorage.setItem(KEY, JSON.stringify(cfg)); }catch(e){} }
    function rank(v){
      var n = ((v.name || "") + " " + (v.lang || "")).toLowerCase(), s = 0;
      if(/[-_]sa\b|saudi/.test(n)) s += 30; else if(/[-_](ae|kw|qa|bh|om)\b|emirat|kuwait|qatar|bahrain|oman/.test(n)) s += 22; else if(/[-_](eg|jo|lb|sy)\b|egypt|jordan/.test(n)) s += 10;
      if(/natural|neural|online|enhanced|premium|siri/.test(n)) s += 25;
      if(/google/.test(n)) s += 6;
      if(/compact|eloquence/.test(n)) s -= 12;
      return s;
    }
    function loadVoices(){
      if(!OK) return;
      var all = []; try{ all = synth.getVoices() || []; }catch(e){}
      voices = all.filter(function(v){ return /^ar(\b|[-_])/i.test(v.lang || ""); }).sort(function(a, b){ return rank(b) - rank(a); });
      paint();
    }
    function curVoice(){
      for(var i = 0; i < voices.length; i++) if(voices[i].voiceURI === cfg.voice) return voices[i];
      return voices[0] || null;
    }
    function clean(t){
      return String(t == null ? "" : t)
        .replace(/[\u2600-\u27BF\uFE0F\u200D\u20E3]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, " ")   // إيموجي
        .replace(/[«»"“”_*#<>|]/g, " ").replace(/\s+/g, " ").trim();
    }
    function setBusy(b){
      busy = b;
      if(el.btn) el.btn.classList.toggle("speaking", b);
      Array.prototype.forEach.call(document.querySelectorAll("[data-tts]"), function(x){ x.classList.toggle("speaking", b); });
    }
    function speak(parts){
      if(!OK) return false;
      parts = (Array.isArray(parts) ? parts : [parts]).map(clean).filter(Boolean);
      if(!parts.length) return false;
      var my = ++gen, v = curVoice();
      try{ synth.cancel(); if(synth.paused) synth.resume(); }catch(e){}
      parts.forEach(function(t, i){
        var u = new SpeechSynthesisUtterance(t);
        u.lang = v ? v.lang : "ar-SA"; if(v) u.voice = v;
        u.rate = cfg.rate; u.pitch = 1; u.volume = 1;   // أعلى صوت يسمح فيه المتصفح
        if(i === 0) u.onstart = function(){ if(my === gen) setBusy(true); };
        if(i === parts.length - 1) u.onend = u.onerror = function(){ if(my === gen) setBusy(false); };
        try{ synth.speak(u); }catch(e){}
      });
      setBusy(true);
      return true;
    }
    function stop(reset){
      gen++;
      if(OK){ try{ synth.cancel(); }catch(e){} }
      setBusy(false);
      if(reset) lastKey = "";
    }
    function auto(key, parts){   // تلقائي: مرة وحدة لكل سؤال
      if(!cfg.auto || !key || key === lastKey) return false;
      lastKey = key; return speak(parts);
    }
    function read(parts){   // زر 🔊: يقرأ، ولو يقرأ الحين يوقف
      if(!OK){ toast("🔇 المتصفح هذا ما يدعم القراءة بالصوت"); return; }
      if(busy){ stop(); return; }
      speak(parts);
    }
    function stopIf(prefix){ if(lastKey.indexOf(prefix) === 0 && busy) stop(); }
    function paint(){
      if(!el.btn) return;
      el.btn.classList.toggle("on", OK && cfg.auto);
      el.btn.title = !OK ? "المتصفح ما يدعم القراءة بالصوت" : cfg.auto ? "قراءة الأسئلة: شغّالة" : "قراءة الأسئلة: متوقفة";
      el.auto.checked = cfg.auto;
      Array.prototype.forEach.call(el.rate.querySelectorAll("[data-r]"), function(b){ var on = +b.getAttribute("data-r") === cfg.rate; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
      var v = curVoice();
      el.vrow.hidden = voices.length < 2;
      el.voice.innerHTML = voices.map(function(x){
        var nm = String(x.name || "").replace(/^(Microsoft|Google)\s+/i, "").replace(/\s*[-–]\s*Arabic.*$/i, "").replace(/\s*\(.*\)\s*$/, "");
        return '<option value="' + escapeHtml(x.voiceURI) + '"' + (v && x.voiceURI === v.voiceURI ? " selected" : "") + '>' + escapeHtml(nm || x.name) + ' · ' + escapeHtml(x.lang) + '</option>';
      }).join("");
      el.test.disabled = !OK;
      el.note.textContent = !OK ? "المتصفح هذا ما يدعم القراءة بالصوت — جرّبوا Chrome أو Edge أو Safari."
        : !voices.length ? "ما لقينا صوت عربي بهالجهاز، فبنقرأ بالصوت الافتراضي. أوضح صوت: متصفح Edge بالكمبيوتر، أو Safari بالآيفون والماك — أو نزّلوا الصوت العربي من إعدادات الجهاز (اللغة والكلام)."
        : "الصوت يطلع بأعلى مستوى يسمح فيه المتصفح — ارفعوا صوت التلفزيون أو السماعة عشان يكون عالي 🔊";
    }
    function closePop(){ if(el.pop && !el.pop.hidden){ el.pop.hidden = true; el.btn.setAttribute("aria-expanded", "false"); } }
    if(el.btn){
      el.btn.addEventListener("click", function(e){
        e.stopPropagation();
        var open = el.pop.hidden;
        el.pop.hidden = !open; el.btn.setAttribute("aria-expanded", open ? "true" : "false");
        if(open){ loadVoices(); try{ el.auto.focus({ preventScroll: true }); }catch(err){} }
      });
      document.addEventListener("click", function(e){ if(!el.pop.hidden && !el.pop.contains(e.target)) closePop(); });
      document.addEventListener("keydown", function(e){ if(e.key === "Escape" && !el.pop.hidden){ closePop(); try{ el.btn.focus(); }catch(err){} } });
      el.auto.addEventListener("change", function(){ cfg.auto = el.auto.checked; save(); paint(); if(!cfg.auto) stop(); else speak("تمام، بقرأ لكم كل سؤال أول ما يطلع."); });
      el.rate.addEventListener("click", function(e){ var b = e.target.closest("[data-r]"); if(!b) return; cfg.rate = +b.getAttribute("data-r"); save(); paint(); speak("هذي سرعة القراءة."); });
      el.voice.addEventListener("change", function(){ cfg.voice = el.voice.value; save(); paint(); speak("هلا والله! هذا الصوت اللي بيقرأ لكم الأسئلة."); });
      el.test.addEventListener("click", function(){ speak(["هلا والله!", "أنا اللي بقرأ لكم الأسئلة في طاولة السهرة.", "ارفعوا الصوت لين تسمعوني زين."]); });
    }
    if(OK){
      loadVoices();
      try{ if(synth.addEventListener) synth.addEventListener("voiceschanged", loadVoices); else synth.onvoiceschanged = loadVoices; }catch(e){}
    } else paint();
    return { ok: OK, auto: auto, read: read, speak: speak, stop: stop, stopIf: stopIf, cfg: cfg, voices: function(){ return voices.slice(); } };
  })();
  /* أزرار 🔊 «اقرأ السؤال» */
  document.addEventListener("click", function(e){
    var b = e.target && e.target.closest ? e.target.closest("[data-tts]") : null; if(!b) return;
    var k = b.getAttribute("data-tts");
    TTS.read(k === "triv" ? trivSpeech() : k === "lt" ? ltSpeech() : k === "ml" ? mlSpeech() : []);
  });
  /* أسماء الحروف (للعبة الحروف) وحروف خيارات المليون */
  var TTS_LETTERS = { "ا":"ألف", "أ":"ألف", "إ":"ألف", "آ":"ألف", "ب":"باء", "ت":"تاء", "ث":"ثاء", "ج":"جيم", "ح":"حاء", "خ":"خاء", "د":"دال", "ذ":"ذال", "ر":"راء", "ز":"زاي",
                      "س":"سين", "ش":"شين", "ص":"صاد", "ض":"ضاد", "ط":"طاء", "ظ":"ظاء", "ع":"عين", "غ":"غين", "ف":"فاء", "ق":"قاف", "ك":"كاف", "ل":"لام", "م":"ميم", "ن":"نون",
                      "ه":"هاء", "ة":"تاء مربوطة", "و":"واو", "ي":"ياء", "ى":"ألف مقصورة" };

  /* مكتبة الباركود: ما نحمّلها إلا أول ما نحتاج باركود (عشان الصفحة تفتح أسرع) */
  var QR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
  var qrState = 0, qrWaiters = [];   /* 0 ما انطلبت، 1 تتحمّل، 2 جاهزة، 3 فشلت */
  function needQR(cb){
    if(typeof window.qrcode === "function") return true;
    if(qrState === 3) return false;
    if(cb && qrWaiters.indexOf(cb) === -1) qrWaiters.push(cb);
    if(qrState === 0){
      qrState = 1;
      var sc = document.createElement("script");
      sc.src = QR_SRC; sc.async = true;
      var done = function(){
        qrState = typeof window.qrcode === "function" ? 2 : 3;
        var w = qrWaiters; qrWaiters = [];
        w.forEach(function(f){ try{ f(); }catch(e){} });
      };
      sc.onload = done; sc.onerror = done;
      document.head.appendChild(sc);
    }
    return false;
  }
  function qrWaitHtml(cls){ return '<p class="' + (cls || "bz-intro") + '">' + (qrState === 3 ? "تعذّر تحميل الباركود — تأكد من الإنترنت" : "جاري تجهيز الباركود…") + '</p>'; }

  /* ============ الجولات: كل جولة تجي من السيرفر (start_round) وتنحفظ على الجهاز ============ */
  var sharedSb = null;   /* عميل Supabase واحد للصفحة كلها (الدخول + الجولات + أزرار أسرع إصبع) */
  var sbReadyResolve = null;
  var sbReady = new Promise(function(res){ sbReadyResolve = res; });   /* يتحقق أول ما تجهز مكتبة Supabase */
  var HIDDEN_GAMES = [];  /* الألعاب اللي خبّاها الأدمن */
  var TEAM_PALETTE = ["#3987e5","#d95926","#199e70","#c98500","#d55181","#008300"];
  var OLD_PALETTE = ["#63a897","#e07a9b","#e8a35f","#8d7ae0","#6fb0e0","#d9b23c"];   /* ألوان v4 — تتحوّل للجديدة */
  var CATALOG = null;     /* أعداد المحتوى + الباقات + فئات على راسك (من catalog) */
  var ACCT = { credits:0, admin:false, trials:[] };
  var GAME_INFO = {
    trivia:   { name:"سين جيم", ic:"i-trivia", accent:"trivia", desc:"لوحة فئات ونقاط — اختاروا خانة وجاوبوا صح تكسبوا نقاطها." },
    emoji:    { name:"تحدي الصور", ic:"i-emoji", accent:"emoji", desc:"كل صورة تمثّل كلمة — ركّبوا الصور وحزروا المدينة أو الشخصية أو المثل." },
    letters:  { name:"الحروف", ic:"i-letters", accent:"letters", desc:"لوحة خلايا فيها حروف — جاوب سؤال الحرف وخذ الخلية، وأول فريق يوصّل بين ضفتيه يفوز." },
    flags:    { name:"حزر العلم", ic:"i-flags", accent:"flags", desc:"يطلع علم وأول فريق يعرف الدولة ياخذ النقطة — فيه سهل ومتوسط وصعب." },
    heads:    { name:"حطها على راسك", ic:"i-heads", accent:"heads", desc:"الجوال على الجبهة وفريقك يعطيك تلميحات — اقلبه لتحت إذا عرفتها ولفوق إذا بتعدّيها." },
    charades: { name:"التمثيل الصامت", ic:"i-charades", accent:"char", desc:"مثّل الفيلم أو المسلسل بدون كلام، وفريقك يحاول يخمّن قبل الوقت." },
    million:  { name:"طريق المليون", ic:"i-million", accent:"million", desc:"سؤال وأربع خيارات تصعب درجة درجة — على الكرسي الحار بالمساعدات، أو الكل يجاوب من جواله." },
    mafia:    { name:"المافيا", ic:"i-mafia", accent:"mafia", desc:"وزّع أدوار المافيا والمحقق والطبيب سرًا، وابعث لكل لاعب دوره بالواتساب." },
    rope:     { name:"مربوطين", ic:"i-rope", accent:"rope", desc:"من 2 لين 8 لاعبين مربوطين بحبل — امشوا مع بعض، اقفزوا، وامسكوا اللي يطيح لين توصلون. جوالاتكم أيادي تحكم." }
  };
  var GAME_ORDER = ["trivia","emoji","letters","flags","heads","charades","million","rope","mafia"];
  var HEADS_DURS = [30, 45, 60, 90, 120];
  function icon(id, cls){ return '<svg class="ic' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function accentStyle(g){ var a = GAME_INFO[g].accent; return "--accent:var(--" + a + ");--accent-bright:var(--" + a + "-bright)"; }
  function gTile(g, cls){ return '<span class="g-tile' + (cls ? " " + cls : "") + '" style="' + accentStyle(g) + '">' + icon(GAME_INFO[g].ic) + '</span>'; }

  /* ===== حجم الجولة + إعدادات اللعب (يتحكم فيها الأدمن، توصل مع catalog) ===== */
  var SIZE_DEFAULTS = { trivia:{def:6,min:4,max:8,trial:6}, emoji:{def:10,min:5,max:20,trial:10}, letters:{def:5,min:4,max:6,trial:10},
                        flags:{def:10,min:5,max:25,trial:5}, heads:{def:10,min:5,max:15,trial:5}, charades:{def:10,min:5,max:20,trial:5},
                        million:{def:10,min:5,max:15,trial:5} };
  var PLAY_DEFAULTS = { trivia_pts:[1,2,3,4], pts:{ emoji:1, flags:1, charades:1, heads:1, letters:1 }, win_target:0, emoji_secs:20, char_secs:60, heads_dur:60,
                        buzz_pen_timeout:1, buzz_pen_wrong:1, buzz_steal_secs:10,
                        million:{ step_pts:1, lv_pts:[1,2,3], speed_bonus:1, all_secs:20, vote_secs:15, friend_secs:30, life:{ fifty:true, aud:true, friend:true, swap:true } },
                        helps:{ x2:true, steal:true, swap:true }, mc:{ secs:20, bonus:1 } };   /* «أسرع إصبع»: buzz_pen_timeout = الخصم المقترح لما يخلص الوقت (المقدّم يختار على مين) + زر «غلط وخصم» (0 = بدون) */
  function clampInt(v, lo, hi, def){ v = Math.round(+v); if(!isFinite(v)) v = def; return Math.max(lo, Math.min(hi, v)); }
  function cfgSize(g){
    var d = SIZE_DEFAULTS[g]; if(!d) return null;
    var s = CATALOG && isObj(CATALOG.sizes) && isObj(CATALOG.sizes[g]) ? CATALOG.sizes[g] : {};
    var mn = clampInt(s.min, 1, 99, d.min), mx = clampInt(s.max, mn, 99, Math.max(mn, d.max));
    return { min:mn, max:mx, def:clampInt(s.def, mn, mx, d.def), trial:clampInt(s.trial, 1, 99, d.trial) };
  }
  function cfgPlay(){
    var p = CATALOG && isObj(CATALOG.play) ? CATALOG.play : {}, out = {};
    var tp = Array.isArray(p.trivia_pts) && p.trivia_pts.length === 4 ? p.trivia_pts : PLAY_DEFAULTS.trivia_pts;
    out.trivia_pts = tp.map(function(v, i){ return clampInt(v, 0, 999, PLAY_DEFAULTS.trivia_pts[i]); });
    var pts = isObj(p.pts) ? p.pts : {};
    out.pts = {};
    Object.keys(PLAY_DEFAULTS.pts).forEach(function(k){ out.pts[k] = clampInt(pts[k], 0, 999, PLAY_DEFAULTS.pts[k]); });
    out.win_target = clampInt(p.win_target, 0, 99999, 0);
    out.emoji_secs = clampInt(p.emoji_secs, 5, 600, PLAY_DEFAULTS.emoji_secs);
    out.char_secs = clampInt(p.char_secs, 5, 600, PLAY_DEFAULTS.char_secs);
    out.heads_dur = clampInt(p.heads_dur, 15, 300, PLAY_DEFAULTS.heads_dur);
    if(HEADS_DURS.indexOf(out.heads_dur) === -1) out.heads_dur = HEADS_DURS.reduce(function(b, x){ return Math.abs(x - out.heads_dur) < Math.abs(b - out.heads_dur) ? x : b; }, 60);
    out.buzz_pen_timeout = clampInt(p.buzz_pen_timeout, 0, 999, PLAY_DEFAULTS.buzz_pen_timeout);
    out.buzz_pen_wrong = clampInt(p.buzz_pen_wrong, 0, 999, PLAY_DEFAULTS.buzz_pen_wrong);
    out.buzz_steal_secs = clampInt(p.buzz_steal_secs, 0, 60, PLAY_DEFAULTS.buzz_steal_secs);   /* فرصة الفريق الخصم بعد ما يخلص الوقت (0 = للكل على طول) */
    /* طريق المليون */
    var m = isObj(p.million) ? p.million : {}, md = PLAY_DEFAULTS.million, lf = isObj(m.life) ? m.life : {};
    var lp = Array.isArray(m.lv_pts) && m.lv_pts.length === 3 ? m.lv_pts : md.lv_pts;
    out.million = {
      step_pts: clampInt(m.step_pts, 0, 999, md.step_pts),
      lv_pts: lp.map(function(v, i){ return clampInt(v, 0, 999, md.lv_pts[i]); }),
      speed_bonus: clampInt(m.speed_bonus, 0, 999, md.speed_bonus),
      all_secs: clampInt(m.all_secs, 5, 300, md.all_secs),
      vote_secs: clampInt(m.vote_secs, 5, 120, md.vote_secs),
      friend_secs: clampInt(m.friend_secs, 10, 180, md.friend_secs),
      life: { fifty: lf.fifty !== false, aud: lf.aud !== false, friend: lf.friend !== false, swap: lf.swap !== false }
    };
    /* (v11) 🃏 وسائل سين جيم — المطفية ما تطلع */
    var hp = isObj(p.helps) ? p.helps : {};
    out.helps = { x2: hp.x2 !== false, steal: hp.steal !== false, swap: hp.swap !== false };
    /* (v11) 📱 الإجابة من الجوال بالأعلام والصور: وقت السؤال + بونص الأسرع */
    var mc = isObj(p.mc) ? p.mc : {}, mcd = PLAY_DEFAULTS.mc;
    out.mc = { secs: clampInt(mc.secs, 5, 120, mcd.secs), bonus: clampInt(mc.bonus, 0, 999, mcd.bonus) };
    return out;
  }
  /* الحجم اللي اختاره المقدّم (لو طلع برا حدود الأدمن يرجع للافتراضي) */
  function chosenSize(g){
    var c = cfgSize(g); if(!c) return null;
    var v = store.sizes && store.sizes[g];
    return (typeof v === "number" && v >= c.min && v <= c.max) ? v : c.def;
  }
  function sizeOptions(g){
    var c = cfgSize(g); if(!c) return [];
    var span = c.max - c.min, step = span <= 4 ? 1 : span <= 8 ? 2 : span <= 20 ? 5 : 10, out = [c.min, c.def, c.max];
    for(var v = Math.ceil(c.min / step) * step; v < c.max; v += step){ if(v > c.min && out.indexOf(v) === -1) out.push(v); }
    return out.filter(function(v, i){ return out.indexOf(v) === i; }).sort(function(a, b){ return a - b; });
  }
  function nTeams(){ return Math.max(1, store.teams.length || 2); }
  /* وقت تقريبي للجولة بالدقايق (لمخطط السهرة) */
  function estMinutes(g, n, teams){
    teams = teams || nTeams();
    switch(g){
      case "trivia": return Math.max(3, Math.round(n * 4 * 0.75));
      case "emoji": return Math.max(3, Math.round(n));
      case "letters": return ({ 4:10, 5:15, 6:22 })[n] || 15;
      case "flags": return Math.max(2, Math.round(n * 0.6));
      case "heads": return Math.max(3, Math.round(teams * ((store.heads.dur || 60) / 60 + 1.2) * Math.max(1, n / 10)));
      case "charades": return Math.max(3, Math.round(n * 1.4));
      case "million": return (store.million && store.million.pref === "all") ? Math.max(3, Math.round(n * 0.7)) : Math.max(4, Math.round(teams * (n * 0.55 + 1)));
      case "mafia": return 20;
      case "rope": return 10;
    }
    return 10;
  }
  function sizeLabel(g, n){
    switch(g){
      case "trivia": return arN(n, "فئة وحدة", "فئتين", "فئات", "فئة");
      case "emoji": return arN(n, "لغز واحد", "لغزين", "ألغاز", "لغز");
      case "letters": return n + "×" + n;
      case "flags": return arN(n, "علم واحد", "علمين", "أعلام", "علم");
      case "heads": return arN(n, "كلمة وحدة", "كلمتين", "كلمات", "كلمة");
      case "charades": return arN(n, "عنوان واحد", "عنوانين", "عناوين", "عنوان");
      case "million": return arN(n, "سؤال واحد", "سؤالين", "أسئلة", "سؤال");
    }
    return "";
  }
  function sizeSub(g, n){
    if(g === "trivia") return arN(n * 4, "سؤال واحد", "سؤالين", "أسئلة", "سؤال");
    if(g === "letters") return arN(n * n, "خلية وحدة", "خليتين", "خلايا", "خلية");
    if(g === "heads") return "لكل فريق";
    if(g === "million" && !(store.million && store.million.pref === "all")) return "لكل فريق";
    return "≈ " + estMinutes(g, n) + " د";
  }
  function roundDesc(g, n){
    if(n == null) n = chosenSize(g);
    switch(g){
      case "trivia": return "لوحة " + arN(n, "فئة وحدة", "فئتين", "فئات", "فئة") + " × 4 أسئلة";
      case "emoji": return arN(n, "لغز واحد", "لغزين", "ألغاز", "لغز") + " صور";
      case "letters": return "لوحة حروف " + n + "×" + n + " (" + arN(n * n, "خلية وحدة", "خليتين", "خلايا", "خلية") + ")";
      case "flags": return arN(n, "علم واحد", "علمين", "أعلام", "علم") + " مخلوطة (سهل ومتوسط وصعب)";
      case "heads": return arN(n, "كلمة وحدة", "كلمتين", "كلمات", "كلمة") + " لكل فريق";
      case "charades": return arN(n, "عنوان واحد", "عنوانين", "عناوين", "عنوان");
      case "million": return (store.million && store.million.pref === "all") ? arN(n, "سؤال واحد", "سؤالين", "أسئلة", "سؤال") + " للكل" : "سلّم " + arN(n, "سؤال واحد", "سؤالين", "أسئلة", "سؤال") + " لكل فريق";
      case "mafia": return "توزيع أدوار لجولة وحدة";
      case "rope": return "مرحلة وحدة (الجاية بالترتيب من 200) — من 2 لين 8 لاعبين";
    }
    return "";
  }
  function trialDesc(g, short){
    var c = cfgSize(g), n = c ? c.trial : 1;
    switch(g){
      case "trivia": return short ? "لوحة " + arN(n, "فئة وحدة", "فئتين", "فئات", "فئة") : "لوحة ثابتة: " + arN(n, "فئة وحدة", "فئتين", "فئات", "فئة") + " × 4 أسئلة";
      case "emoji": return arN(n, "لغز واحد", "لغزين", "ألغاز", "لغز") + (short ? "" : " كلمة بكلمة");
      case "letters": return arN(n, "حرف واحد", "حرفين", "حروف", "حرف") + (short ? "" : "، سؤال لكل حرف");
      case "flags": return arN(n, "علم واحد", "علمين", "أعلام", "علم");
      case "heads": return arN(n, "كلمة وحدة", "كلمتين", "كلمات", "كلمة") + (short ? "" : " لفريق واحد");
      case "charades": return arN(n, "عنوان واحد", "عنوانين", "عناوين", "عنوان");
      case "million": return arN(n, "سؤال واحد", "سؤالين", "أسئلة", "سؤال") + (short ? "" : ((store.million || {}).pref === "all" ? " للكل" : " لكل فريق"));
      case "mafia": return "جولة وحدة";
      case "rope": return short ? "المرحلة الأولى" : "المرحلة الأولى (سهلة) — جرّبوا الحبل";
    }
    return "";
  }

  /* ============ state ============ */
  var store = {
    teams: [],
    trivia: { round:null, cells: [], helps: {} },   /* (v11) helps = { فريق: { x2, steal, swap } } = الوسائل اللي استخدمها باللوحة */
    emoji: { round:null, items: [], idx: 0, mode: "v2" },
    charades: { round:null, items: [], idx: 0, turn: 0 },
    mafia: { caseId:null, round:0, players:[], counts:{mafia:0,detective:0,doctor:0} },
    letters: { round:null, board: [], qmap: {}, qpos: {}, owners: {}, history: [], wins: {}, lastWin: null },
    flags: { round:null, items: [], idx: 0 },
    million: { pref:"seat", round:null, items:[] },   /* طريق المليون */
    rope: { round:null },                               /* مربوطين: round = { id, kind, level, best, done } */
    buzz: { room: "", enabled: false, auto: true, rec: false },   /* rec (v12) = 🔁 إعادة آخر ثواني (المايك) */
    ans: { auto: true },  /* (v10) 📱 الإجابات بجوال المقدّم: { auto, trivia/emoji/letters/million: { round, key, chan } } */
    heads: { round:null, deck:"all", dur:60, turns:{}, done: [], last: {} },
    win: { target: 0, shown: "" },
    sizes: {},          /* حجم الجولة اللي اختاره المقدّم لكل لعبة */
    plan: null,         /* مخطط السهرة */
    planDraft: null,    /* إعدادات المخطط قبل ما تنبني الخطة */
    mcOn: { flags: false, emoji: false },   /* (v11) 📱 الإجابة من الجوال بالأعلام والصور */
    night: null         /* (v11) إحصائيات السهرة للملخص: { at, rounds:[{g, at, before}], fast:{} } */
  };
  var hadSaved = false;

  function persist(){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(store)); }catch(e){}
  }
  function isObj(x){ return !!x && typeof x === "object" && !Array.isArray(x); }
  function validRound(r){ return isObj(r) && typeof r.id !== "undefined" && typeof r.kind === "string"; }
  /* نتحقق من كل شي راجع من localStorage — لو شكله قديم أو خربان نبدأ نظيف بدل ما تطلع لوحة فاضية */
  function isTriviaCellsValid(cells){
    if(!Array.isArray(cells) || cells.length === 0) return false;
    if(typeof TIERS === "undefined") return true;
    var CATS = [];
    for(var i=0;i<cells.length;i++){
      var c = cells[i];
      if(!c || typeof c.id !== "string" || typeof c.q !== "string" || typeof c.a !== "string" || typeof c.cat !== "string") return false;
      if(TIERS.indexOf(c.points) === -1) return false;
      if(CATS.indexOf(c.cat) === -1) CATS.push(c.cat);
    }
    if(CATS.length > 10 || cells.length !== CATS.length * TIERS.length) return false;
    return CATS.every(function(cat){
      return TIERS.every(function(tier){
        return cells.some(function(c){ return c.cat === cat && c.points === tier; });
      });
    });
  }
  function validItems(list, check){ return Array.isArray(list) && list.length > 0 && list.every(function(x){ return isObj(x) && check(x); }); }
  function restore(){
    try{
      var raw = localStorage.getItem(STORE_KEY);
      if(!raw) return;
      var saved = JSON.parse(raw);
      if(!isObj(saved)) return;
      hadSaved = true;
      if(Array.isArray(saved.teams) && saved.teams.length) store.teams = saved.teams;
      store.teams.forEach(function(t){ var k = OLD_PALETTE.indexOf(String(t.color || "").toLowerCase()); if(k !== -1) t.color = TEAM_PALETTE[k]; });
      if(isObj(saved.mafia) && Array.isArray(saved.mafia.players)) store.mafia = saved.mafia;
      var T = saved.trivia;
      if(isObj(T) && validRound(T.round) && isTriviaCellsValid(T.cells)) store.trivia = { round:T.round, cells:T.cells, helps: isObj(T.helps) ? T.helps : {} };
      var E = saved.emoji;
      if(isObj(E)){
        if(E.mode === "v1" || E.mode === "v2") store.emoji.mode = E.mode;
        if(validRound(E.round) && validItems(E.items, function(x){ return Array.isArray(x.parts) && typeof x.a === "string"; })){
          store.emoji.round = E.round; store.emoji.items = E.items;
          store.emoji.idx = Math.max(0, Math.min(E.items.length, E.idx | 0));
          if(isObj(E.ch)) store.emoji.ch = E.ch;
          if(isObj(E.mq)) store.emoji.mq = E.mq;
        }
      }
      var C = saved.charades;
      if(isObj(C) && validRound(C.round) && validItems(C.items, function(x){ return typeof x.t === "string"; })){
        store.charades = { round:C.round, items:C.items, idx:Math.max(0, Math.min(C.items.length, C.idx | 0)), turn:C.turn | 0 };
      } else if(isObj(C)) store.charades.turn = C.turn | 0;
      var L = saved.letters;
      if(isObj(L)){
        store.letters.wins = isObj(L.wins) ? L.wins : {};
        if(validRound(L.round) && Array.isArray(L.board) && [16, 25, 36].indexOf(L.board.length) !== -1 && isObj(L.qmap)
           && L.board.every(function(l){ return l === "" || (typeof l === "string" && Array.isArray(L.qmap[l]) && L.qmap[l].length); })){
          store.letters.round = L.round; store.letters.board = L.board; store.letters.qmap = L.qmap;
          store.letters.qpos = isObj(L.qpos) ? L.qpos : {};
          store.letters.owners = isObj(L.owners) ? L.owners : {};
          store.letters.history = Array.isArray(L.history) ? L.history : [];
          store.letters.lastWin = isObj(L.lastWin) ? L.lastWin : null;
        }
      }
      var F = saved.flags;
      if(isObj(F) && validRound(F.round) && validItems(F.items, function(x){ return typeof x.n === "string" && typeof x.sp === "string"; })){
        store.flags = { round:F.round, items:F.items, idx:Math.max(0, Math.min(F.items.length, F.idx | 0)) };
        if(isObj(F.ch)) store.flags.ch = F.ch;
        if(isObj(F.mq)) store.flags.mq = F.mq;
      }
      if(isObj(saved.mcOn)) store.mcOn = { flags: saved.mcOn.flags === true, emoji: saved.mcOn.emoji === true };
      if(isObj(saved.night) && Array.isArray(saved.night.rounds) && isObj(saved.night.fast)) store.night = saved.night;
      var ML0 = saved.million;
      if(isObj(ML0)){
        store.million.pref = ML0.pref === "all" ? "all" : "seat";
        var mlOk = validRound(ML0.round) && validItems(ML0.items, function(x){ return typeof x.q === "string" && typeof x.a === "string" && Array.isArray(x.w) && x.w.length >= 3; })
          && (ML0.mode === "seat" ? (Array.isArray(ML0.order) && isObj(ML0.ladders) && typeof ML0.n === "number") : ML0.mode === "all");
        if(mlOk) store.million = ML0;
        store.million.pref = ML0.pref === "all" ? "all" : "seat";
      }
      var H = saved.heads;
      if(isObj(H)){
        store.heads.done = Array.isArray(H.done) ? H.done.filter(function(x){ return typeof x === "string"; }).slice(-60) : [];
        store.heads.last = isObj(H.last) ? H.last : {};
        if(typeof H.deck === "string") store.heads.deck = H.deck;
        if(HEADS_DURS.indexOf(H.dur) !== -1) store.heads.dur = H.dur;
        if(validRound(H.round) && isObj(H.turns)) { store.heads.round = H.round; store.heads.turns = H.turns; }
      }
      if(isObj(saved.win)){
        var wt = parseInt(saved.win.target, 10);
        store.win = { target: wt > 0 && wt < 100000 ? wt : 0, shown: typeof saved.win.shown === "string" ? saved.win.shown : "" };
      }
      if(isObj(saved.buzz)){
        store.buzz = {
          room: typeof saved.buzz.room === "string" ? saved.buzz.room : "",
          enabled: !!saved.buzz.enabled,
          auto: saved.buzz.auto !== false,
          rec: saved.buzz.rec === true
        };
      }
      if(isObj(saved.ans)){
        store.ans = { auto: saved.ans.auto !== false };
        ["trivia", "emoji", "letters", "million"].forEach(function(g){
          var a = saved.ans[g];
          if(isObj(a) && (typeof a.round === "number" || typeof a.round === "string") && String(a.round).length < 24)
            store.ans[g] = { round: a.round, key: /^[0-9a-f]{40,128}$/.test(a.key || "") ? a.key : "", chan: /^[0-9a-f]{32}$/.test(a.chan || "") ? a.chan : "" };
        });
      }
      if(isObj(saved.sizes)) Object.keys(saved.sizes).forEach(function(g){
        var v = saved.sizes[g];
        if(SIZE_DEFAULTS[g] && typeof v === "number" && v > 0 && v < 100) store.sizes[g] = Math.round(v);
      });
      if(validPlan(saved.plan)) store.plan = saved.plan;
      if(isObj(saved.rope) && isObj(saved.rope.round) && isObj(saved.rope.round.level) && Array.isArray(saved.rope.round.level.P)) store.rope.round = saved.rope.round;
      if(isObj(saved.planDraft)) store.planDraft = saved.planDraft;
    }catch(e){}
  }

  /* ============ view router ============ */
  var views = ["home","plan","trivia","emoji","letters","flags","heads","charades","million","rope","mafia"];
  var curView = "home";
  function showView(name){
    if(GAME_ORDER.indexOf(name) !== -1 && HIDDEN_GAMES.indexOf(name) !== -1 && !ACCT.admin){ toast("هذي اللعبة مقفلة حاليًا 🔒"); name = "home"; }
    if(views.indexOf(name) === -1) name = "home";
    if(curView !== name) TTS.stop(true);
    curView = name;
    if(GAME_ORDER.indexOf(name) !== -1) logPlay(name);
    /* أي انتقال بين الألعاب يقفل أزرار «أسرع إصبع» — اللعبة الجديدة تفتحها مع سؤالها */
    if(typeof buzzIdle === "function") buzzIdle();
    views.forEach(function(v){
      document.getElementById("view-"+v).hidden = (v !== name);
    });
    document.querySelectorAll(".nav-pills button").forEach(function(btn){
      btn.classList.toggle("active", btn.getAttribute("data-view") === name);
    });
    /* مهم: نستدعي دالة العرض دايمًا — تقرر هي: لوحة شغالة ولا شاشة «ابدأ جولة» */
    if(name === "home"){ renderHomeCredits(); renderPlannerCard(); }
    if(name === "plan") renderPlan();
    if(name === "trivia") trivOpen();
    if(name === "emoji") emojiOpen();
    if(name === "charades") charOpen();
    if(name === "letters") lettersOpen();
    if(name === "flags") flagsOpen();
    if(name === "heads") headsOpen();
    if(name === "million") mlOpen();
    if(name === "rope") ropeOpen(); else ropeLeave();
    if(name === "mafia") mRender();
    renderPlanBar();
    window.scrollTo({top:0, behavior:"instant" in window ? "instant" : "auto"});
  }
  document.querySelectorAll("[data-view]").forEach(function(el){
    el.addEventListener("click", function(){ showView(el.getAttribute("data-view")); });
  });
  document.getElementById("brandBtn").addEventListener("click", function(){ showView("home"); });

  /* ============ الجولات: الرصيد، شاشة «ابدأ جولة»، والتأكيد ============ */
  function roundsWord(n){
    n = n | 0;
    if(n === 1) return "جولة وحدة";
    if(n === 2) return "جولتين";
    var m = n % 100;
    return n + (m >= 3 && m <= 10 ? " جولات" : " جولة");
  }
  function trialUsed(g){ return ACCT.trials.indexOf(g) !== -1; }
  function hasCredit(){ return ACCT.admin || ACCT.credits > 0; }
  function roundTagText(r){
    if(!r) return "";
    return r.kind === "trial" ? "🎁 تجربة مجانية" : r.kind === "admin" ? "👑 أدمن" : "🎟️ جولة";
  }
  function renderRoundTag(g, r){
    var el = document.querySelector('[data-rtag="' + g + '"]');
    if(!el) return;
    el.textContent = roundTagText(r);
    el.classList.toggle("trial", !!r && r.kind === "trial");
  }
  function updateBalanceUI(){
    var chip = document.getElementById("balChip");
    if(chip && ME){
      chip.hidden = false;
      document.getElementById("balN").textContent = ACCT.admin ? "أدمن" : ACCT.credits > 0 ? roundsWord(ACCT.credits) : "اشترِ جولات";
      document.getElementById("balWord").textContent = "";
      chip.setAttribute("aria-label", ACCT.admin ? "أدمن — بدون خصم" : ACCT.credits > 0 ? "رصيدك: " + roundsWord(ACCT.credits) + " — اشترِ جولات" : "ما عندك جولات — اشترِ جولات");
    }
    document.querySelectorAll("[data-badge]").forEach(function(b){
      var g = b.getAttribute("data-badge");
      b.classList.remove("lock");
      if(ACCT.admin || !ME){ b.textContent = ""; return; }
      if(!trialUsed(g)) b.textContent = "🎁 تجربة مجانية";
      else if(ACCT.credits > 0) b.textContent = "";
      else { b.textContent = "🔒"; b.classList.add("lock"); }
    });
    renderHomeCredits();
    if(typeof fitTopbar === "function") fitTopbar();
  }
  function renderHomeCredits(){
    var el = document.getElementById("homeCredits");
    if(!el) return;
    if(!ME){ el.hidden = true; return; }
    var txt;
    if(ACCT.admin) txt = '👑 أنت الأدمن — كل الألعاب تنلعب بدون خصم';
    else if(ACCT.credits > 0) txt = '🎟️ رصيدك: <b>' + roundsWord(ACCT.credits) + '</b> — كل جولة لأي لعبة';
    else if(GAME_ORDER.some(function(g){ return !trialUsed(g) && HIDDEN_GAMES.indexOf(g) === -1; })) txt = '🎁 عندك تجربة مجانية لكل لعبة مرة وحدة — اختر لعبة وجرّبها';
    else txt = '🔒 خلصت تجاربك المجانية — اشترِ جولات وكمّل السهرة';
    el.innerHTML = '<span class="hc-txt">' + txt + '</span>' + (ACCT.admin ? '' : '<button class="btn-ghost" type="button" data-shop>🛒 اشترِ جولات</button>');
    el.hidden = false;
  }
  function setAccount(d){
    if(!d) return;
    ACCT.credits = d.credits | 0; ACCT.admin = !!d.admin;
    ACCT.trials = Array.isArray(d.trials) ? d.trials : [];
  }
  function loadAccount(){
    return sbReady.then(function(sb){ return sb.rpc("account_state"); }).then(function(r){
      if(r.error) throw r.error;
      var d = parseJ(r.data);
      setAccount(d);
      updateBalanceUI();
      saveBootSnap();
      return ACCT;
    });
  }
  var ROUND_ERRORS = {
    no_credits: "خلص رصيدك من الجولات — اشترِ جولات وكمّل 🎟️",
    trial_used: "استخدمت تجربتك المجانية لهاللعبة من قبل",
    game_hidden: "هذي اللعبة مقفلة حاليًا 🔒",
    blocked: "حسابك موقوف — تواصل مع صاحب الطاولة",
    no_content: "ما فيه محتوى كافي لجولة — خبّر صاحب الطاولة",
    login_required: "سجّل دخولك أول"
  };
  function roundErrCode(e){
    var m = String((e && (e.message || e.details)) || e || "");
    for(var k in ROUND_ERRORS){ if(m.indexOf(k) !== -1) return k; }
    return "";
  }
  function startRound(game, trial, opts){
    opts = Object.assign({}, opts || {});
    if(!trial && cfgSize(game)) opts.size = chosenSize(game);
    return sbReady.then(function(sb){ return sb.rpc("start_round", { p_game: game, p_trial: !!trial, p_opts: opts }); }).then(function(r){
      if(r.error) throw r.error;
      var d = parseJ(r.data);
      if(!d || !Array.isArray(d.items)) throw new Error("bad_round");
      if(typeof d.credits === "number") ACCT.credits = d.credits;
      if(d.kind === "trial" && !trialUsed(game)) ACCT.trials.push(game);
      updateBalanceUI();
      saveBootSnap();
      toast(d.kind === "trial" ? "🎁 بدأت التجربة المجانية" : d.kind === "admin" ? "👑 جولة أدمن (بدون خصم)" : "🎟️ انخصمت جولة — باقي لك " + roundsWord(ACCT.credits));
      planOnStart(game, d);
      nightRound(game);
      return d;
    });
  }
  function roundError(e){
    var code = roundErrCode(e);
    if(code === "no_credits"){ ACCT.credits = 0; updateBalanceUI(); openShop(); }
    if(code === "trial_used" && !ACCT.trials.length) loadAccount().catch(function(){});
    toast(ROUND_ERRORS[code] || ("ما قدرنا نبدأ الجولة — " + ((e && e.message) || "تأكد من الإنترنت")));
  }
  /* تأكيد بنافذة (بدل confirm) */
  var askCb = null;
  function ask(title, text, yesLabel){
    return new Promise(function(resolve){
      document.getElementById("askTitle").textContent = title;
      document.getElementById("askText").textContent = text || "";
      document.getElementById("askYes").textContent = yesLabel || "إيه";
      document.getElementById("askModal").hidden = false;
      askCb = resolve;
    });
  }
  function askDone(v){ document.getElementById("askModal").hidden = true; var cb = askCb; askCb = null; if(cb) cb(v); }
  document.getElementById("askYes").addEventListener("click", function(){ askDone(true); });
  document.getElementById("askNo").addEventListener("click", function(){ askDone(false); });
  document.getElementById("askModal").addEventListener("click", function(e){ if(e.target.id === "askModal") askDone(false); });

  /* شاشة «ابدأ جولة» لكل لعبة. opt: { done, extra (html), bind (fn), begin(trial) → Promise } */
  function setGated(g, gated){
    var sec = document.getElementById("view-" + g), gate = document.querySelector('[data-gate="' + g + '"]');
    if(sec) sec.classList.toggle("gated", !!gated);
    if(gate) gate.hidden = !gated;
  }
  var roundStarting = false;   /* فيه جولة تتجهز الحين (ننتظر رد السيرفر) */
  function renderGate(g, opt){
    var info = GAME_INFO[g], gate = document.querySelector('[data-gate="' + g + '"]');
    if(!gate) return;
    gate.removeAttribute("aria-busy");
    setGated(g, true);
    renderRoundTag(g, null);
    if(opt.done) planOnDone(g);          /* لو الجولة من مخطط السهرة: تنحسب وتطلع النتائج */
    var trialOk = !ACCT.admin && !trialUsed(g);
    var canPay = ACCT.admin || ACCT.credits > 0;
    var c = cfgSize(g), size = chosenSize(g);
    var btns = [];
    if(ACCT.admin) btns.push('<button class="btn-primary" type="button" data-rg="paid">' + icon("i-play") + ' ابدأ الجولة <small>(أدمن — بدون خصم)</small></button>');
    else if(ACCT.credits > 0) btns.push('<button class="btn-primary" type="button" data-rg="paid">' + icon("i-play") + ' ابدأ الجولة <small>(رصيدك: ' + roundsWord(ACCT.credits) + ')</small></button>');
    if(trialOk) btns.push('<button class="' + (ACCT.credits > 0 ? "btn-ghost" : "btn-primary") + '" type="button" data-rg="trial">' + icon("i-gift") + ' جرّب مجانًا — ' + trialDesc(g, true) + '</button>');
    if(!ACCT.admin && ACCT.credits <= 0) btns.push('<button class="' + (trialOk ? "btn-ghost" : "btn-primary") + '" type="button" data-shop>' + icon("i-cart") + ' اشترِ جولات</button>');
    var note = ACCT.admin ? "" : ACCT.credits > 0 ? "تنخصم جولة وحدة من رصيدك لما تبدأ." : trialOk ? "التجربة المجانية مرة وحدة لكل لعبة." : "استخدمت تجربتك المجانية لهاللعبة — اشترِ جولات وكمّل.";
    /* المقدّم يختار حجم الجولة (بين الأقل والأكثر من لوحة الأدمن) */
    var sizes = (c && c.max > c.min && canPay) ? sizeOptions(g) : [];
    var sizeHtml = sizes.length ? '<div class="lbl">حجم الجولة</div><div class="rg-chips" data-sizes>' + sizes.map(function(n){
        return '<button type="button" data-size="' + n + '"' + (n === size ? ' class="on"' : '') + '>' + sizeLabel(g, n) + '<small>' + sizeSub(g, n) + '</small></button>';
      }).join("") + '</div>' : "";
    var ps = planStepFor(g);
    var planHtml = ps ? '<div class="rg-plan">' + icon("i-plan") + ' مخطط السهرة: الجولة ' + (store.plan.cur + 1) + ' من ' + store.plan.steps.length + '</div>' : "";
    gate.innerHTML = '<div class="rg-card" style="' + accentStyle(g) + '">'
      + (opt.done ? '<div class="rg-done">' + icon("i-check") + ' انتهت الجولة</div>' + (opt.summary || "") : '')
      + '<div class="rg-icon">' + gTile(g) + '</div>'
      + planHtml
      + '<div class="rg-title">' + (opt.done ? "جولة ثانية؟" : info.name) + '</div>'
      + '<p class="rg-what">الجولة: <b data-rgwhat>' + roundDesc(g, size) + '</b>' + (trialOk ? '<br>التجربة المجانية: <b>' + trialDesc(g) + '</b>' : '') + '</p>'
      + ((sizeHtml || opt.extra) ? '<div class="rg-opts">' + sizeHtml + (opt.extra || "") + '</div>' : '')
      + '<div class="rg-btns">' + btns.join("") + '</div>'
      + (note ? '<p class="rg-note">' + note + '</p>' : '')
      + '</div>';
    gate.querySelectorAll("[data-size]").forEach(function(b){
      b.addEventListener("click", function(){
        var n = +b.getAttribute("data-size");
        store.sizes[g] = n;
        var st = planStepFor(g); if(st){ st.size = n; st.est = estMinutes(g, n); }
        persist();
        gate.querySelectorAll("[data-size]").forEach(function(x){ x.classList.toggle("on", x === b); });
        var w = gate.querySelector("[data-rgwhat]"); if(w) w.textContent = roundDesc(g, n);
      });
    });
    if(opt.bind) opt.bind(gate);
    gate.querySelectorAll("[data-rg]").forEach(function(b){
      b.addEventListener("click", function(){
        var trial = b.getAttribute("data-rg") === "trial";
        gate.querySelectorAll("button").forEach(function(x){ x.disabled = true; });
        b.classList.add("is-loading");
        b.innerHTML = '<span class="spin" aria-hidden="true"></span>جاري تجهيز الجولة…';
        gate.setAttribute("aria-busy", "true");
        roundStarting = true;
        Promise.resolve().then(function(){ return opt.begin(trial); }).then(function(){ roundStarting = false; }, function(e){
          roundStarting = false;
          roundError(e);
          if(gate.querySelector('[data-rg]')) renderGate(g, opt);
        });
      });
    });
  }
  function endRoundAsk(what){
    return ask("تنهي " + what + "؟", "اللي باقي منها بيروح، والجولة ما ترجع.", "🏁 إيه، أنهها");
  }

  /* ============ teams module ============ */
  var els = {
    teamsBtn: document.getElementById("teamsBtn"),
    teamsPanel: document.getElementById("teamsPanel"),
    teamsOverlay: document.getElementById("teamsOverlay"),
    teamsClose: document.getElementById("teamsClose"),
    teamsList: document.getElementById("teamsList"),
    addTeamBtn: document.getElementById("addTeamBtn"),
    resetScoresBtn: document.getElementById("resetScoresBtn")
  };

  function ensureDefaultTeams(){
    if(store.teams.length === 0){
      store.teams = [
        {id:uid(), name:"فريق 1", color:TEAM_PALETTE[0], score:0},
        {id:uid(), name:"فريق 2", color:TEAM_PALETTE[1], score:0}
      ];
    }
  }

  function renderTeams(){
    els.teamsList.innerHTML = store.teams.map(function(t){
      return '<div class="team-row">'
        + '<span class="team-dot" style="background:'+t.color+'"></span>'
        + '<input type="text" value="'+escapeHtml(t.name)+'" data-id="'+t.id+'" class="team-name-input" maxlength="16">'
        + '<span class="team-score-btns">'
        + '<button type="button" data-id="'+t.id+'" data-d="-1">−</button>'
        + '<button type="button" data-id="'+t.id+'" data-d="1">+</button>'
        + '</span>'
        + '<input class="team-score-in" type="number" inputmode="numeric" step="1" data-score="'+t.id+'" value="'+t.score+'" aria-label="نقاط '+escapeHtml(t.name)+'">'
        + '<button class="team-remove" type="button" data-remove="'+t.id+'" aria-label="حذف">✕</button>'
        + '</div>';
    }).join("");

    els.teamsList.querySelectorAll(".team-name-input").forEach(function(inp){
      inp.addEventListener("input", function(){
        var t = teamOf(inp.getAttribute("data-id"));
        if(t){ t.name = inp.value.trim() || t.name; persist(); renderTriviaAwardButtons(); renderEmojiAward(); renderCharTurnBanner(); teamsChanged(); }
      });
    });
    els.teamsList.querySelectorAll("[data-score]").forEach(function(inp){
      var t = teamOf(inp.getAttribute("data-score"));
      inp.addEventListener("input", function(){
        var v = String(inp.value).trim();
        if(!t || !/^-?\d{1,5}$/.test(v)) return;
        t.score = parseInt(v, 10); persist(); checkWinner();
      });
      inp.addEventListener("change", function(){ if(t) inp.value = t.score; });   /* بدون إعادة رسم — عشان ضغطة +/− بعدها ما تضيع */
      inp.addEventListener("focus", function(){ try{ inp.select(); }catch(e){} });
    });
    els.teamsList.querySelectorAll("[data-d]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var t = teamOf(btn.getAttribute("data-id"));
        if(t){ t.score += parseInt(btn.getAttribute("data-d"),10); persist(); renderTeams(); }
      });
    });
    els.teamsList.querySelectorAll("[data-remove]").forEach(function(btn){
      btn.addEventListener("click", function(){
        store.teams = store.teams.filter(function(x){ return x.id !== btn.getAttribute("data-remove"); });
        persist(); renderTeams(); renderTriviaAwardButtons(); renderEmojiAward(); renderCharTurnBanner(); teamsChanged();
      });
    });
    if(typeof checkWinner === "function") checkWinner();
  }

  function openTeams(){ els.teamsPanel.hidden = false; els.teamsOverlay.hidden = false; renderTeams(); renderWinTarget(); }
  function closeTeams(){ els.teamsPanel.hidden = true; els.teamsOverlay.hidden = true; }
  els.teamsBtn.addEventListener("click", openTeams);
  els.teamsClose.addEventListener("click", closeTeams);
  els.teamsOverlay.addEventListener("click", closeTeams);

  els.addTeamBtn.addEventListener("click", function(){
    if(store.teams.length >= 6){ toast("أقصى عدد فرق هو 6"); return; }
    store.teams.push({ id:uid(), name:"فريق "+(store.teams.length+1), color: TEAM_PALETTE[store.teams.length % TEAM_PALETTE.length], score:0 });
    persist(); renderTeams(); renderTriviaAwardButtons(); renderEmojiAward(); renderCharTurnBanner(); teamsChanged();
  });
  els.resetScoresBtn.addEventListener("click", function(){
    store.teams.forEach(function(t){ t.score = 0; });
    store.win.shown = "";
    persist(); renderTeams();
  });

  /* ===== نقاط الفوز: أول فريق يوصلها يفوز بالسهرة ===== */
  var winEls = { input: document.getElementById("winTarget"), modal: document.getElementById("winModal"), title: document.getElementById("winTitle"),
                 sub: document.getElementById("winSub"), list: document.getElementById("winList"), newBtn: document.getElementById("winNewBtn"), keep: document.getElementById("winKeepBtn") };
  function renderWinTarget(){ winEls.input.value = store.win.target > 0 ? store.win.target : ""; }
  winEls.input.addEventListener("input", function(){
    var v = String(winEls.input.value).trim(), n = /^\d{1,5}$/.test(v) ? parseInt(v, 10) : 0;
    if(n !== store.win.target){ store.win.target = n; store.win.shown = ""; persist(); }
  });
  winEls.input.addEventListener("change", function(){ renderWinTarget(); checkWinner(); });
  function checkWinner(){
    var tg = store.win.target | 0;
    if(tg <= 0) return;
    var best = null;
    store.teams.forEach(function(t){ if(t.score >= tg && (!best || t.score > best.score)) best = t; });
    if(!best) return;
    var key = best.id + ":" + tg;
    if(store.win.shown === key) return;
    store.win.shown = key; persist();
    showWinner(best, tg);
  }
  function showWinner(team, tg){
    winEls.title.textContent = "فاز " + team.name + " بالسهرة!";
    winEls.sub.textContent = "وصلوا " + team.score + " من " + tg + " نقطة 🎉";
    winEls.list.innerHTML = store.teams.slice().sort(function(a, b){ return b.score - a.score; }).map(function(t, i){
      return '<li style="--c:' + t.color + '"><span>' + (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1) + ".") + ' ' + escapeHtml(t.name) + '</span><b class="ltr">' + t.score + '</b></li>';
    }).join("");
    winEls.modal.style.setProperty("--c", team.color);
    winEls.modal.hidden = false;
    try{ buzzUnlockAudio(); if(buzz.audio){ var a = buzz.audio, t0 = a.currentTime; [523, 659, 784, 1047].forEach(function(f, i){ var o = a.createOscillator(), g = a.createGain(); o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + i * 0.14); g.gain.exponentialRampToValueAtTime(0.2, t0 + i * 0.14 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.14 + 0.5); o.connect(g); g.connect(a.destination); o.start(t0 + i * 0.14); o.stop(t0 + i * 0.14 + 0.55); }); } }catch(e){}
  }
  winEls.keep.addEventListener("click", function(){ winEls.modal.hidden = true; });
  winEls.newBtn.addEventListener("click", function(){ winEls.modal.hidden = true; closeTeams(); openResetModal(); });
  winEls.modal.addEventListener("click", function(e){ if(e.target === winEls.modal) winEls.modal.hidden = true; });

  function teamAwardButtonsHtml(onClickAttr, pts){
    return store.teams.map(function(t){
      return '<button type="button" style="background-color:'+t.color+'" data-'+onClickAttr+'="'+t.id+'">+'+(pts == null ? 1 : pts)+' '+escapeHtml(t.name)+'</button>';
    }).join("");
  }

  /* ============ TRIVIA ============ */
  var trivEls = {
    board: document.getElementById("triviaBoard"),
    newBoardBtn: document.getElementById("trivNewBoardBtn"),
    modal: document.getElementById("trivModal"),
    cat: document.getElementById("tmCat"),
    points: document.getElementById("tmPoints"),
    question: document.getElementById("tmQuestion"),
    hint: document.getElementById("tmHint"),
    hintBtn: document.getElementById("tmHintBtn"),
    answer: document.getElementById("tmAnswer"),
    revealBtn: document.getElementById("tmRevealBtn"),
    award: document.getElementById("tmAward"),
    teamBtns: document.getElementById("tmTeamBtns"),
    skipBtn: document.getElementById("tmSkipBtn"),
    helps: document.getElementById("tmHelps"),
    helpsBar: document.getElementById("trivHelpsBar")
  };
  var TIERS = [100,200,300,400];
  /* النقاط تنعرض وتنحسب 1-4 (بقاعدة البيانات المستوى 100-400) */
  function tpts(p){
    p = +p || 0;
    var i = TIERS.indexOf(p);
    if(i !== -1) return cfgPlay().trivia_pts[i];
    return p >= 100 ? Math.round(p / 100) : p;
  }
  function ptsWord(n){ return n === 1 ? "نقطة" : n === 2 ? "نقطتين" : (n >= 3 && n <= 10) ? "نقاط" : "نقطة"; }
  function boardCats(){
    var out = [];
    (store.trivia.cells || []).forEach(function(c){ if(out.indexOf(c.cat) === -1) out.push(c.cat); });
    return out;
  }
  var activeCell = null;
  function trivActive(){ return !!store.trivia.round && !store.trivia.round.done && isTriviaCellsValid(store.trivia.cells); }
  function trivOpen(){
    if(trivActive()){ setGated("trivia", false); renderRoundTag("trivia", store.trivia.round); renderTriviaBoard(); }
    else trivGate(!!store.trivia.round && store.trivia.round.done);
  }
  function trivGate(done){
    renderGate("trivia", { done: done, begin: function(trial){
      return startRound("trivia", trial).then(function(d){
        store.trivia.round = { id: d.round, kind: d.kind };
        store.trivia.cells = d.items.map(function(i){ return { id: String(i.id), cat: i.cat, points: i.points, q: i.q, a: i.a, used: false }; });
        store.trivia.helps = {};   /* لوحة جديدة = كل الوسائل ترجع */
        persist();
        trivOpen();
        ansStart("trivia", d.round);
      });
    } });
  }
  function renderTriviaBoard(){
    if(!isTriviaCellsValid(store.trivia.cells)){ trivGate(false); return; }
    var CATS = boardCats();
    trivEls.board.style.setProperty("--cols", CATS.length);
    /* كل فئة عمود لحالها (اسمها فوق وأسئلتها تحتها) — يترتب صح بالتلفزيون والجوال */
    trivEls.board.innerHTML = CATS.map(function(cat){
      return '<div class="tb-col"><div class="tb-cat">' + escapeHtml(cat) + '</div>' + TIERS.map(function(tier){
        var cell = store.trivia.cells.find(function(c){ return c.cat === cat && c.points === tier; });
        var p = tpts(cell.points), team = cell.by ? teamOf(cell.by) : null;
        return '<button class="tb-cell' + (cell.used && team ? ' won' : '') + '" data-id="' + escapeHtml(cell.id) + '" type="button"' + (cell.used ? ' disabled' : '') + (cell.used && team ? ' style="--c:' + team.color + '"' : '') + '>'
          + (cell.used ? (team ? '<span class="by" style="--c:' + team.color + '"></span>' : '') + '✓' : p + '<small>' + ptsWord(p) + '</small>') + '</button>';
      }).join("") + '</div>';
    }).join("");
    trivEls.board.querySelectorAll(".tb-cell").forEach(function(btn){
      btn.addEventListener("click", function(){ openTrivia(btn.getAttribute("data-id")); });
    });
    renderTrivHelpsBar();
  }

  function firstLetterHint(text){
    var t = (text || "").trim();
    if(t.charAt(0) === "ا" && t.charAt(1) === "ل" && t.length > 2){
      t = t.slice(2);
    }
    var ch = t.charAt(0) || "؟";
    return "🔤 يبدأ الجواب بحرف: \"" + ch + "\"";
  }
  function openTrivia(id){
    var cell = store.trivia.cells.find(function(c){ return c.id === id; });
    if(!cell || cell.used) return;
    activeCell = cell;
    TH.open = false; TH.steal = null;
    trivShowCell(cell);
    trivEls.modal.hidden = false;
    trivArm(cell);
  }
  function trivShowCell(cell){
    trivEls.cat.textContent = cell.cat;
    trivEls.points.innerHTML = '<b>' + tpts(cell.points) + '</b><small>' + ptsWord(tpts(cell.points)) + '</small>';
    trivEls.question.textContent = cell.q;
    trivEls.hint.hidden = true;
    trivEls.hint.textContent = firstLetterHint(cell.a);
    trivEls.hintBtn.hidden = false;
    trivEls.answer.hidden = true;
    trivEls.answer.textContent = "الإجابة: " + cell.a;
    trivEls.award.hidden = true;
    trivEls.revealBtn.hidden = false;
    renderTriviaAwardButtons();
    renderTrivHelps();
  }
  function trivArm(cell){
    buzzArm("triv:" + cell.id, false, { k:"trivia", cat: cell.cat, pts: tpts(cell.points), text: cell.q });
    TTS.auto("triv:" + cell.id, trivSpeech());
  }
  function trivSpeech(){ return activeCell ? [activeCell.q] : []; }
  trivEls.hintBtn.addEventListener("click", function(){
    trivEls.hint.hidden = false;
    trivEls.hintBtn.hidden = true;
  });
  function closeTrivia(){ trivEls.modal.hidden = true; activeCell = null; buzzIdle(); TTS.stop(true); }
  trivEls.modal.addEventListener("click", function(e){ if(e.target === trivEls.modal) closeTrivia(); });
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape"){
      if(!document.getElementById("sumModal").hidden){ closeSummary(); return; }
      if(!document.getElementById("bdModal").hidden){ bdHide(); renderBuzzUI(); return; }
      if(!document.getElementById("ansModal").hidden){ ansHide(); return; }
      if(!document.getElementById("scoreModal").hidden) document.getElementById("scoreModal").hidden = true;
      if(!document.getElementById("tuModal").hidden){ tuClose(); return; }
      if(!document.getElementById("planModal").hidden) closePlanModal();
      if(!trivEls.modal.hidden) closeTrivia();
      if(store.million && store.million.q && store.million.q.friend && curView === "million") mlEndFriend();
      if(!emojiState.awarding && !els.teamsPanel.hidden) closeTeams();
    }
  });

  trivEls.revealBtn.addEventListener("click", function(){
    trivEls.answer.hidden = false;
    trivEls.revealBtn.hidden = true;
    trivEls.award.hidden = false;
    TH.open = false; TH.steal = null;
    renderTriviaAwardButtons();
    renderTrivHelps();
  });

  /* أزرار «مين جاوب صح؟» — اللي معه ×2 ياخذ الضعف */
  function renderTriviaAwardButtons(){
    var cell = activeCell, p = cell ? tpts(cell.points) : 1;
    trivEls.teamBtns.innerHTML = store.teams.map(function(t){
      var h = cellHelp(cell, t.id), g = h && h.k === "x2" ? p * 2 : p;
      var tag = h && HELPS[h.k] ? ' <small class="th-tag">' + HELPS[h.k].ic + '</small>' : '';
      return '<button type="button" style="background-color:' + t.color + '" data-award="' + t.id + '">+' + g + ' ' + escapeHtml(t.name) + tag + '</button>';
    }).join("");
    markBuzzButtons();
    trivEls.teamBtns.querySelectorAll("[data-award]").forEach(function(btn){
      btn.addEventListener("click", function(){ trivAward(btn.getAttribute("data-award")); });
    });
  }
  function trivAward(tid){
    var t = teamOf(tid), cell = activeCell;
    if(t && cell){
      var p = tpts(cell.points), h = cellHelp(cell, tid);
      t.score += h && h.k === "x2" ? p * 2 : p;
      cell.by = t.id;
      if(h && h.k === "steal"){
        var v = teamOf(h.v);
        if(v && v.id !== t.id){ v.score -= p; setTimeout(function(){ toast("🦹 " + t.name + " سرقوا " + penWord(p) + " من " + v.name); }, 0); }
      }
    }
    finishTriviaCell();
  }

  /* ===== (v11) 🃏 وسائل سين جيم: كل فريق يستخدم كل وسيلة مرة وحدة باللوحة (قبل ما ينكشف الجواب) ===== */
  var HELPS = {
    x2:    { ic:"×2", name:"دبل", tip:"لو جاوبوا صح ياخذون ضعف النقاط، ولو غلطوا تنخصم نقاط السؤال" },
    steal: { ic:"🦹", name:"سرقة", tip:"لو جاوبوا صح ياخذون النقاط وتنخصم من فريق يختارونه" },
    swap:  { ic:"🔄", name:"تبديل", tip:"سؤال ثاني من نفس الفئة ونفس النقاط" }
  };
  var HELP_KEYS = ["x2", "steal", "swap"];
  var TH = { open:false, steal:null, busy:false };   /* لوحة اختيار الوسيلة بالنافذة (ما تنحفظ) */
  function helpsOn(){ var h = cfgPlay().helps; return HELP_KEYS.filter(function(k){ return h[k]; }); }
  function helpUsed(tid, k){ var u = isObj(store.trivia.helps) ? store.trivia.helps[tid] : null; return !!(u && u[k]); }
  function helpMark(tid, k, on){
    if(!isObj(store.trivia.helps)) store.trivia.helps = {};
    var u = store.trivia.helps[tid] || (store.trivia.helps[tid] = {});
    if(on) u[k] = 1; else delete u[k];
  }
  function cellHelp(cell, tid){ return cell && isObj(cell.h) && isObj(cell.h[tid]) ? cell.h[tid] : null; }
  function trivRevealed(){ return !trivEls.answer.hidden; }
  /* نقاط الفريق لو جاوب صح هالسؤال (×2 = ضعف) */
  function trivGainFor(tid){
    if(!activeCell) return 0;
    var p = tpts(activeCell.points), h = cellHelp(activeCell, tid);
    return h && h.k === "x2" ? p * 2 : p;
  }
  function renderTrivHelps(){
    var box = trivEls.helps, keys = helpsOn(), cell = activeCell;
    if(!cell || !keys.length || store.teams.length < 2){ box.innerHTML = ""; box.hidden = true; return; }
    var rev = trivRevealed(), p = tpts(cell.points), act = isObj(cell.h) ? cell.h : {};
    var chips = Object.keys(act).map(function(tid){
      var t = teamOf(tid), h = act[tid]; if(!t || !isObj(h)) return "";
      var wrong = h.k === "x2" && isObj(cell.x) && cell.x[tid];
      var sg = function(s, n){ return '<span dir="ltr">' + s + n + '</span>'; };
      var txt = h.k === "x2" ? "<b>×2</b> " + escapeHtml(t.name) + (wrong ? " — غلطوا (" + sg("−", p) + ")" : " — صح: " + sg("+", p * 2) + " · غلط: " + sg("−", p))
              : "<b>🦹</b> " + escapeHtml(t.name) + " يسرقون من " + escapeHtml((teamOf(h.v) || { name:"—" }).name);
      return '<span class="th-chip' + (wrong ? " off" : "") + '" style="--c:' + t.color + '"><i></i><span>' + txt + '</span>'
        + (h.k === "x2" && !wrong && !cell.by ? '<button type="button" class="th-no" data-x2wrong="' + tid + '">❌ غلطوا</button>' : '')
        + (!rev && !wrong ? '<button type="button" class="th-cancel" data-thcancel="' + tid + '" aria-label="إلغاء وسيلة ' + escapeHtml(t.name) + '">✕</button>' : '') + '</span>';
    }).join("");
    var html = chips ? '<div class="th-active">' + chips + '</div>' : '';
    if(!rev) html += TH.open ? trivHelpsPicker(cell, keys) : '<button type="button" class="th-open" data-thopen="1">🃏 وسيلة</button>';
    box.innerHTML = html; box.hidden = !html;
  }
  function trivHelpsPicker(cell, keys){
    if(TH.steal){
      var st = teamOf(TH.steal);
      return '<div class="th-pick"><p>🦹 ' + escapeHtml(st ? st.name : "") + ' يسرقون من مين؟</p><div class="th-victims">'
        + store.teams.filter(function(t){ return t.id !== TH.steal; }).map(function(t){
          return '<button type="button" class="th-team" style="--c:' + t.color + '" data-thvictim="' + t.id + '"><i></i>' + escapeHtml(t.name) + '</button>';
        }).join("") + '</div><button type="button" class="th-x" data-thclose="1">رجوع</button></div>';
    }
    var rows = store.teams.map(function(t){
      var mine = cellHelp(cell, t.id);
      return '<div class="th-trow" style="--c:' + t.color + '"><span class="nm"><i></i>' + escapeHtml(t.name) + '</span><span class="hs">' + keys.map(function(k){
        var used = helpUsed(t.id, k);
        return '<button type="button" class="th-h' + (used ? " used" : "") + '" data-thuse="' + k + '" data-tid="' + t.id + '"' + (used || mine || TH.busy ? " disabled" : "")
          + ' title="' + HELPS[k].tip + (used ? " (استخدموها)" : "") + '"><b>' + HELPS[k].ic + '</b>' + HELPS[k].name + '</button>';
      }).join("") + '</span></div>';
    }).join("");
    return '<div class="th-pick"><p>مين بيستخدم وسيلة؟ <small>كل فريق كل وسيلة مرة باللوحة</small></p>' + rows
      + '<button type="button" class="th-x" data-thclose="1">إغلاق</button></div>';
  }
  trivEls.helps.addEventListener("click", function(e){
    var b = e.target.closest("button"); if(!b || b.disabled || !activeCell) return;
    if(b.hasAttribute("data-thopen")){ TH.open = true; TH.steal = null; renderTrivHelps(); return; }
    if(b.hasAttribute("data-thclose")){ if(TH.steal) TH.steal = null; else TH.open = false; renderTrivHelps(); return; }
    var w = b.getAttribute("data-x2wrong");
    if(w){ var wt = teamOf(w), n = trivX2Wrong(w); if(n && wt) toast("❌ " + wt.name + " غلطوا بالدبل — انخصمت " + penWord(n)); return; }
    var c = b.getAttribute("data-thcancel");
    if(c){ trivHelpCancel(c); return; }
    var v = b.getAttribute("data-thvictim");
    if(v){ trivHelpSet(TH.steal, "steal", v); return; }
    var k = b.getAttribute("data-thuse"), tid = b.getAttribute("data-tid");
    if(!k || !tid) return;
    if(k === "swap"){ trivSwap(tid); return; }
    if(k === "steal"){
      var others = store.teams.filter(function(t){ return t.id !== tid; });
      if(others.length === 1){ trivHelpSet(tid, "steal", others[0].id); return; }
      TH.steal = tid; renderTrivHelps(); return;
    }
    trivHelpSet(tid, k);
  });
  function trivHelpSet(tid, k, victim){
    var cell = activeCell, t = teamOf(tid);
    if(!cell || !t || trivRevealed() || helpUsed(tid, k) || cellHelp(cell, tid)) return;
    if(k === "steal" && !teamOf(victim)) return;
    if(!isObj(cell.h)) cell.h = {};
    cell.h[tid] = k === "steal" ? { k:"steal", v:victim } : { k:k };
    helpMark(tid, k, true);
    TH.open = false; TH.steal = null;
    persist(); renderTrivHelps(); renderTriviaAwardButtons(); renderTrivHelpsBar(); renderBuzzUI();
    var p = tpts(cell.points);
    toast(k === "x2" ? "×2 " + t.name + " — صح: +" + (p * 2) + " · غلط: −" + p : "🦹 " + t.name + " يسرقون من " + teamOf(victim).name + " لو جاوبوا صح");
  }
  function trivHelpCancel(tid){
    var cell = activeCell, h = cellHelp(cell, tid);
    if(!h || trivRevealed() || (isObj(cell.x) && cell.x[tid])) return;
    delete cell.h[tid]; helpMark(tid, h.k, false);
    persist(); renderTrivHelps(); renderTriviaAwardButtons(); renderTrivHelpsBar(); renderBuzzUI();
    toast("↩️ رجعت الوسيلة لـ " + (teamOf(tid) || { name:"" }).name);
  }
  /* ×2 وغلطوا: تنخصم نقاط السؤال (مرة وحدة) — والفرصة تبقى للباقين */
  function trivX2Wrong(tid){
    var cell = activeCell, h = cellHelp(cell, tid), t = teamOf(tid);
    if(!h || h.k !== "x2" || !t || (isObj(cell.x) && cell.x[tid])) return 0;
    var p = tpts(cell.points);
    t.score -= p;
    if(!isObj(cell.x)) cell.x = {};
    cell.x[tid] = 1;
    persist(); renderTeams(); renderTrivHelps(); renderBuzzUI();
    return p;
  }
  /* 🔄 تبديل: سؤال ثاني من نفس الفئة والنقاط (من السيرفر) */
  var SWAP_ERR = { no_spare:"ما فيه سؤال ثاني بهالفئة وهالنقاط", swap_limit:"خلص حد التبديل بهاللوحة", expired:"اللوحة قديمة — ابدأوا لوحة جديدة عشان تبدّلون",
                   bad_round:"ما قدرنا نبدّل السؤال بهاللوحة", bad_item:"ما قدرنا نبدّل هالسؤال" };
  function trivSwap(tid){
    var cell = activeCell, t = teamOf(tid), R = store.trivia.round;
    if(!cell || !t || !R || TH.busy || trivRevealed() || helpUsed(tid, "swap") || cellHelp(cell, tid)) return;
    var oldId = cell.id;
    TH.busy = true; renderTrivHelps();
    sbReady.then(function(sb){ return sb.rpc("trivia_swap", { p_round: R.id, p_item: oldId }); }).then(function(r){
      if(r.error) throw r.error;
      var d = parseJ(r.data);
      if(!d || typeof d.q !== "string" || typeof d.a !== "string" || !d.id) throw new Error("bad_item");
      if(store.trivia.round !== R || cell.id !== oldId) return;   /* اللوحة تغيّرت وقت الانتظار */
      cell.prev = (Array.isArray(cell.prev) ? cell.prev : []).concat([oldId]).slice(-6);
      cell.id = String(d.id); cell.q = d.q; cell.a = d.a;
      helpMark(tid, "swap", true);
      TH.open = false; TH.steal = null;
      persist(); renderTriviaBoard();
      if(activeCell === cell){ trivShowCell(cell); trivArm(cell); }
      toast("🔄 " + t.name + " بدّلوا السؤال");
    }).catch(function(e){
      var m = String((e && (e.message || e.code)) || e || "");
      var code = Object.keys(SWAP_ERR).filter(function(k){ return m.indexOf(k) !== -1; })[0];
      toast(code ? SWAP_ERR[code] : isMissingFn(e) ? "تبديل السؤال يحتاج تحديث قاعدة البيانات (ملف SQL)" : "ما قدرنا نبدّل السؤال — تأكد من النت");
    }).then(function(){ TH.busy = false; if(activeCell === cell) renderTrivHelps(); });
  }
  /* شريط الوسائل تحت اللوحة: وش باقي لكل فريق */
  function renderTrivHelpsBar(){
    var bar = trivEls.helpsBar, keys = helpsOn();
    if(!bar) return;
    if(!keys.length || store.teams.length < 2 || !trivActive()){ bar.hidden = true; bar.innerHTML = ""; return; }
    bar.innerHTML = '<span class="th-lbl">🃏 الوسائل</span>' + store.teams.map(function(t){
      return '<span class="th-tm" style="--c:' + t.color + '"><i></i>' + escapeHtml(t.name) + keys.map(function(k){
        var u = helpUsed(t.id, k);
        return '<span class="th-ic' + (u ? " used" : "") + '" title="' + HELPS[k].name + (u ? " — استخدموها" : " — باقية") + '">' + HELPS[k].ic + '</span>';
      }).join("") + '</span>';
    }).join("") + '<button type="button" class="th-info" data-thinfo="1" aria-label="وش الوسائل؟">؟</button>';
    bar.hidden = false;
  }
  trivEls.helpsBar.addEventListener("click", function(e){
    if(!e.target.closest("[data-thinfo]")) return;
    var on = helpsOn();
    notice("🃏 وسائل سين جيم", "كل فريق يستخدم كل وسيلة مرة وحدة باللوحة. افتحوا السؤال واضغطوا «🃏 وسيلة» قبل ما ينكشف الجواب."
      + (on.indexOf("x2") !== -1 ? "\n\n×2 دبل: لو جاوبتوا صح تاخذون ضعف النقاط، ولو غلطتوا تنخصم نقاط السؤال." : "")
      + (on.indexOf("steal") !== -1 ? "\n\n🦹 سرقة: لو جاوبتوا صح تاخذون النقاط، وتنخصم نفسها من فريق تختارونه." : "")
      + (on.indexOf("swap") !== -1 ? "\n\n🔄 تبديل: يتبدّل السؤال بسؤال ثاني من نفس الفئة ونفس النقاط." : ""));
  });
  trivEls.skipBtn.addEventListener("click", finishTriviaCell);
  function finishTriviaCell(){
    if(activeCell) activeCell.used = true;
    persist(); renderTriviaBoard(); renderTeams(); closeTrivia();
    if(store.trivia.round && store.trivia.cells.length && store.trivia.cells.every(function(c){ return c.used; })){
      store.trivia.round.done = true; persist();
      trivGate(true);
    }
  }
  trivEls.newBoardBtn.addEventListener("click", function(){
    var left = store.trivia.cells.some(function(c){ return !c.used; });
    (left ? endRoundAsk("اللوحة") : Promise.resolve(true)).then(function(ok){
      if(!ok) return;
      if(store.trivia.round) store.trivia.round.done = true;
      persist(); trivGate(true);
    });
  });

  /* ============ EMOJI CHALLENGE (تحدي الصور) — الجولة 10 ألغاز ============ */
  var emojiEls = {
    cat: document.getElementById("emojiCat"),
    display: document.getElementById("emojiDisplay"),
    count: document.getElementById("emojiCount"),
    hint: document.getElementById("emojiHint"),
    hintBtn: document.getElementById("emojiHintBtn"),
    hintChoice: document.getElementById("emojiHintChoice"),
    hintSimpleBtn: document.getElementById("emojiHintSimpleBtn"),
    hintStrongBtn: document.getElementById("emojiHintStrongBtn"),
    answer: document.getElementById("emojiAnswer"),
    revealBtn: document.getElementById("emojiRevealBtn"),
    award: document.getElementById("emojiAward"),
    nextBtn: document.getElementById("emojiNextBtn")
  };
  var emojiState = { current:null, awarding:false };

  /* ---- نوعين من الألغاز: v2 = كلمة بكلمة (صور + حروف)، v1 = الأمثال بصورتين ---- */
  var MODE_DESC = {
    v2: "كل صورة تمثّل كلمة (بمعناها أو بلفظها) — ركّب الصور مع الحروف واقرأها من اليمين تطلع لك مدينة أو دولة أو شخصية أو مثل — أول فريق يخمّن ياخذ النقطة.",
    v1: "كل لغز فيه صورتين حقيقية وبينهم علامة + — تكوّن مثل شعبي مشهور أو اسم دولة/مدينة — أول فريق يخمّن ياخذ النقطة."
  };
  function partSrc(p){
    if(typeof p === "string") return p;
    if(!p) return null;
    return p.sp || p.i || null;   /* sp = لوحة صور مجمّعة (sprite) */
  }
  function spriteStyle(p){
    var cols = Math.max(1, p.cols|0), rows = Math.max(1, p.rows|0);
    var px = cols > 1 ? (p.x / (cols - 1)) * 100 : 0;
    var py = rows > 1 ? (p.y / (rows - 1)) * 100 : 0;
    return "background-image:url('" + escapeHtml(p.sp) + "');background-size:" + (cols*100) + "% " + (rows*100) + "%;" +
      "background-position:" + px + "% " + py + "%";
  }
  function rebusRowHtml(parts){
    var imgCount = parts.filter(function(p){ return partSrc(p); }).length;
    var mixed = parts.some(function(p){ return p && typeof p === "object" && p.t; });
    var cls = "rebus-row" + (mixed || parts.length > 2 ? " v2" : "") + (parts.length > 4 || imgCount > 3 ? " many" : "");
    var html = "";
    parts.forEach(function(p, i){
      var src = partSrc(p);
      var prev = i > 0 ? parts[i-1] : null;
      if(src && prev && partSrc(prev)) html += '<span class="rebus-plus">+</span>';
      if(src && p && p.sp){
        html += '<span class="rebus-img rebus-sprite" role="img" aria-label="صورة لغز" style="' + spriteStyle(p) + '"></span>';
      } else if(src){
        html += '<img class="rebus-img" src="' + escapeHtml(src) + '" alt="صورة لغز" loading="eager" decoding="async" ' +
          'onload="this.classList.add(\'loaded\')" onerror="this.classList.add(\'loaded\')">';
      } else if(p && p.t){
        html += '<span class="rebus-txt">' + escapeHtml(p.t) + '</span>';
      }
    });
    return '<div class="' + cls + '">' + html + '</div>';
  }

  /* ---- تحميل مسبق لصور الجولة كلها بالخلفية ---- */
  var _preloaded = {};
  function preloadImage(url){
    if(!url || _preloaded[url]) return;
    _preloaded[url] = true;
    var img = new Image();
    img.src = url;
  }
  function preloadRoundImages(items){
    (items || []).forEach(function(it){ (it.parts || []).forEach(function(p){ preloadImage(partSrc(p)); }); });
  }

  function emojiActive(){ return !!store.emoji.round && !store.emoji.round.done && store.emoji.idx < store.emoji.items.length; }
  function emojiOpen(){
    if(emojiActive()){ setGated("emoji", false); renderRoundTag("emoji", store.emoji.round); preloadRoundImages(store.emoji.items); renderEmojiCurrent(); }
    else emojiGate(!!store.emoji.round);
  }
  function emojiGate(done){
    document.getElementById("emojiModeDesc").textContent = "ركّبوا الصور وحزروا الكلمة أو المثل — أول فريق يخمّن ياخذ النقطة.";
    renderGate("emoji", {
      done: done,
      begin: function(trial){
        /* v7: كل ألغاز تحدي الصور «كلمة بكلمة» */
        store.emoji.mode = "v2";
        return startRound("emoji", trial, { mode: "v2" }).then(function(d){
          store.emoji.round = { id: d.round, kind: d.kind };
          store.emoji.items = d.items; store.emoji.idx = 0;
          store.emoji.mq = null; store.emoji.ch = null;
          persist(); emojiOpen();
          ansStart("emoji", d.round);
        });
      }
    });
  }
  function renderEmojiCurrent(){
    if(!emojiActive()){ if(store.emoji.round) store.emoji.round.done = true; persist(); buzzIdle(); emojiGate(true); return; }
    var item = store.emoji.items[store.emoji.idx];
    emojiState.current = item;
    emojiState.awarding = false;
    document.getElementById("emojiModeDesc").textContent = MODE_DESC[item.mode === "v1" ? "v1" : "v2"];
    emojiEls.count.textContent = "لغز " + (store.emoji.idx + 1) + " من " + store.emoji.items.length;
    emojiEls.cat.textContent = item.cat || "";
    emojiEls.cat.hidden = true;
    emojiEls.display.innerHTML = rebusRowHtml(item.parts || []);
    emojiEls.hint.hidden = true;
    emojiEls.hint.textContent = "";
    emojiEls.hintChoice.hidden = true;
    emojiEls.hintSimpleBtn.hidden = !item.cat;
    emojiEls.hintStrongBtn.hidden = !item.h;
    emojiEls.hintBtn.hidden = !item.cat && !item.h;
    emojiEls.answer.hidden = true;
    emojiEls.answer.textContent = "الإجابة: " + item.a;
    emojiEls.award.hidden = true;
    emojiEls.revealBtn.hidden = false;
    emojiEls.nextBtn.textContent = store.emoji.idx + 1 >= store.emoji.items.length ? "إنهاء 🏁" : "التالي ⏭️";
    persist();
    if(!document.getElementById("view-emoji").hidden){
      if(store.mcOn.emoji) mcShow("emoji");
      else buzzArm("emoji:" + item.id, false, { k:"emoji", parts: item.parts || [] });
    }
    mcRender("emoji");
  }
  emojiEls.hintBtn.addEventListener("click", function(){
    emojiEls.hintBtn.hidden = true;
    emojiEls.hintChoice.hidden = false;
  });
  emojiEls.hintSimpleBtn.addEventListener("click", function(){
    emojiEls.cat.textContent = emojiState.current.cat;
    emojiEls.cat.hidden = false;
    emojiEls.hintSimpleBtn.hidden = true;
    if(emojiEls.hintStrongBtn.hidden) emojiEls.hintChoice.hidden = true;
  });
  emojiEls.hintStrongBtn.addEventListener("click", function(){
    emojiEls.hint.textContent = emojiState.current.h || "";
    emojiEls.hint.hidden = false;
    emojiEls.hintStrongBtn.hidden = true;
    if(emojiEls.hintSimpleBtn.hidden) emojiEls.hintChoice.hidden = true;
  });
  emojiEls.revealBtn.addEventListener("click", function(){
    emojiEls.answer.hidden = false;
    emojiEls.revealBtn.hidden = true;
    emojiEls.award.hidden = false;
    emojiState.awarding = true;
    renderEmojiAward();
  });
  function renderEmojiAward(){
    if(!emojiState.awarding) return;
    emojiEls.award.innerHTML = teamAwardButtonsHtml("emojiaward", cfgPlay().pts.emoji)
      + '<button class="btn-ghost" type="button" id="emojiSkipBtn" style="margin-top:8px;width:100%">محد خمّن</button>';
    markBuzzButtons();
    emojiEls.award.querySelectorAll("[data-emojiaward]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var t = teamOf(btn.getAttribute("data-emojiaward"));
        if(t){ t.score += cfgPlay().pts.emoji; persist(); renderTeams(); }
        nextEmoji();
      });
    });
    var skip = document.getElementById("emojiSkipBtn");
    if(skip) skip.addEventListener("click", nextEmoji);
  }
  function nextEmoji(){ if(!emojiActive()) return; store.emoji.idx += 1; renderEmojiCurrent(); }
  emojiEls.nextBtn.addEventListener("click", nextEmoji);

  /* ============ CHARADES (التمثيل الصامت) — الجولة 10 عناوين ============ */
  var charEls = {
    banner: document.getElementById("charTurnBanner"),
    count: document.getElementById("charCount"),
    title: document.getElementById("charTitle"),
    toggle: document.getElementById("charRevealToggle"),
    award: document.getElementById("charAward"),
    nextBtn: document.getElementById("charNextBtn")
  };
  var charState = { current:null, revealed:false };

  function charActive(){ return !!store.charades.round && !store.charades.round.done && store.charades.idx < store.charades.items.length; }
  function charOpen(){
    if(charActive()){ setGated("charades", false); renderRoundTag("charades", store.charades.round); renderCharCurrent(); }
    else charGate(!!store.charades.round);
  }
  function charGate(done){
    renderGate("charades", { done: done, begin: function(trial){
      return startRound("charades", trial).then(function(d){
        store.charades.round = { id: d.round, kind: d.kind };
        store.charades.items = d.items; store.charades.idx = 0;
        persist(); charOpen();
      });
    } });
  }
  function currentTurnTeam(){
    if(store.teams.length === 0) return null;
    return store.teams[store.charades.turn % store.teams.length];
  }
  function renderCharTurnBanner(){
    var t = currentTurnTeam();
    charEls.banner.textContent = t ? ("🎭 دور فريق: " + t.name) : "أضف فريقين على الأقل من «الفرق والنقاط»";
    charEls.banner.style.setProperty("--accent-bright", t ? t.color : "var(--char-bright)");
  }
  function renderCharCurrent(){
    if(!charActive()){ if(store.charades.round) store.charades.round.done = true; persist(); charGate(true); return; }
    var title = store.charades.items[store.charades.idx].t;
    charState.current = title;
    charState.revealed = false;
    charEls.count.textContent = "عنوان " + (store.charades.idx + 1) + " من " + store.charades.items.length;
    charEls.title.textContent = title;
    charEls.title.hidden = true;
    charEls.toggle.textContent = "👁️ اعرض";
    charEls.nextBtn.textContent = store.charades.idx + 1 >= store.charades.items.length ? "إنهاء 🏁" : "التالي ⏭️";
    renderCharTurnBanner();
    renderCharAward();
    renderCharQr();
    resetTimer("char", cfgPlay().char_secs);
    persist();
  }
  var charQrEls = {
    toggleBtn: document.getElementById("charQrToggle"),
    box: document.getElementById("charQrBox"),
    canvas: document.getElementById("charQrCanvas")
  };
  function renderCharQr(){
    if(!charQrEls.canvas || !charState.current) return;
    if(!needQR(renderCharQr)){ charQrEls.canvas.innerHTML = qrWaitHtml("qr-hint"); return; }
    try{
      charQrEls.canvas.innerHTML = qrSvg(unescape(encodeURIComponent(charState.current)), 5, 3);
    }catch(e){
      charQrEls.canvas.innerHTML = '<p class="qr-hint">تعذّر إنشاء الباركود</p>';
    }
  }
  if(charQrEls.toggleBtn){
    charQrEls.toggleBtn.addEventListener("click", function(){
      var show = charQrEls.box.hidden;
      charQrEls.box.hidden = !show;
      charQrEls.toggleBtn.textContent = show ? "📱 إخفاء الباركود" : "📱 أو امسح بجوالك بدل ما تعرض الشاشة";
      if(show) renderCharQr();
    });
  }
  function renderCharAward(){
    var t = currentTurnTeam();
    charEls.award.innerHTML = t
      ? '<button class="btn-primary" type="button" id="charCorrectBtn">✅ خمّن صح +' + cfgPlay().pts.charades + ' لفريق ' + escapeHtml(t.name) + '</button>'
        + '<button class="btn-ghost" type="button" id="charFailBtn">✕ ما خمّن — التالي</button>'
      : '';
    var c = document.getElementById("charCorrectBtn");
    var f = document.getElementById("charFailBtn");
    if(c) c.addEventListener("click", function(){
      var team = currentTurnTeam();
      if(team){ team.score += cfgPlay().pts.charades; persist(); renderTeams(); }
      nextCharTurn();
    });
    if(f) f.addEventListener("click", nextCharTurn);
  }
  function nextCharTurn(){
    if(!charActive()) return;
    store.charades.idx += 1;
    store.charades.turn += 1;
    renderCharCurrent();
  }
  charEls.toggle.addEventListener("click", function(){
    charState.revealed = !charState.revealed;
    charEls.title.hidden = !charState.revealed;
    charEls.toggle.textContent = charState.revealed ? "🙈 إخفاء" : "👁️ اعرض";
  });
  charEls.nextBtn.addEventListener("click", nextCharTurn);

  /* ============ shared countdown timers (emoji + charades) ============ */
  var timers = {};
  function buildTimerWidget(containerId, key, defaultSeconds){
    var el = document.getElementById(containerId);
    el.innerHTML = ''
      + '<div class="timer-btns"><button type="button" data-t="'+key+'" data-a="-10">−10</button></div>'
      + '<div class="timer-display" id="'+key+'TimerDisplay">'+fmtTime(defaultSeconds)+'</div>'
      + '<div class="timer-btns">'
      + '<button type="button" data-t="'+key+'" data-a="+10">+10</button>'
      + '<button type="button" data-t="'+key+'" data-a="startpause" id="'+key+'StartBtn">▶️ ابدأ</button>'
      + '<button type="button" data-t="'+key+'" data-a="reset">↺</button>'
      + '</div>';
    timers[key] = { seconds: defaultSeconds, running:false, handle:null };
    el.querySelectorAll("[data-t]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var action = btn.getAttribute("data-a");
        if(action === "+10") adjustTimer(key, 10);
        else if(action === "-10") adjustTimer(key, -10);
        else if(action === "reset") resetTimer(key, defaultSeconds);
        else toggleTimer(key);
      });
    });
  }
  function fmtTime(s){
    s = Math.max(0,s);
    var m = Math.floor(s/60), r = s%60;
    return (m<10?"0":"")+m+":"+(r<10?"0":"")+r;
  }
  function updateTimerDisplay(key){
    var d = document.getElementById(key+"TimerDisplay");
    if(!d) return;
    d.textContent = fmtTime(timers[key].seconds);
    d.classList.toggle("warn", timers[key].seconds <= 10 && timers[key].seconds > 0);
  }
  function toggleTimer(key){
    var t = timers[key];
    var btn = document.getElementById(key+"StartBtn");
    if(t.running){
      clearInterval(t.handle); t.running = false;
      if(btn) btn.textContent = "▶️ ابدأ";
    } else {
      if(t.seconds <= 0) t.seconds = 60;
      t.running = true;
      if(btn) btn.textContent = "⏸️ إيقاف";
      t.handle = setInterval(function(){
        t.seconds -= 1;
        updateTimerDisplay(key);
        if(t.seconds <= 0){
          clearInterval(t.handle); t.running = false;
          if(btn) btn.textContent = "▶️ ابدأ";
          toast("⏰ خلص الوقت!");
        }
      }, 1000);
    }
  }
  function adjustTimer(key, delta){
    timers[key].seconds = Math.max(0, timers[key].seconds + delta);
    updateTimerDisplay(key);
  }
  function resetTimer(key, seconds){
    if(!timers[key]) return;
    clearInterval(timers[key].handle);
    timers[key].running = false;
    timers[key].seconds = seconds;
    var btn = document.getElementById(key+"StartBtn");
    if(btn) btn.textContent = "▶️ ابدأ";
    updateTimerDisplay(key);
  }

  /* ============ MAFIA (ported) ============ */
  var ROLE_META = {
    mafia:     { label:"المافيا",  icon:"🔪", color:"var(--mafia)",
      body:"دورك الليلة: 🔪 من عصابة الظل (مافيا)\n\nأنت تعمل في الخفاء مع بقية العصابة. مهمتكم التخلص من اللاعبين الأبرياء ليلة بعد أخرى، والبقاء بلا أثر حتى الصباح.\nلا تكشف دورك مهما حدث — النقاش سلاحك، والصمت درعك." },
    detective: { label:"المحقق",  icon:"🔍", color:"var(--trivia-bright)",
      body:"دورك الليلة: 🔍 المحقق\n\nعيناك على القرية كلها. كل ليلة يمكنك التحقيق مع شخص واحد لمعرفة إن كان بريئًا أم من عصابة الظل.\nثق بأدلتك، وناقش بحذر — كشف نفسك مبكرًا قد يكلفك القضية." },
    doctor:    { label:"الطبيب",  icon:"💉", color:"var(--gold)",
      body:"دورك الليلة: 💉 الطبيب\n\nبين يديك حياة اللاعبين. كل ليلة تختار شخصًا واحدًا لحمايته من أي محاولة اغتيال.\nقرارك الصامت قد يقلب مجرى القضية بالكامل." },
    citizen:   { label:"مواطن",   icon:"👤", color:"var(--text-dim)",
      body:"دورك الليلة: 👤 مواطن من القرية\n\nلا تملك قدرات خاصة، لكن ملاحظتك وحدسك أقوى سلاح لديك.\nراقب التصرفات، اطرح الأسئلة، وساعد في كشف عصابة الظل قبل فوات الأوان." }
  };
  var ROLE_ORDER = ["mafia","detective","doctor"];

  var mEls = {};
  ["mNameInput","mPhoneInput","mAddPlayerBtn","mPlayerList","mEmptyHint","mClearAllBtn","mRoleConfig",
   "mStartBtn","mFormWarn","mafiaIntake","mafiaActive","mPlayerGrid","mafiaCaseStamp",
   "mNewRoundBtn","mNewCaseBtn","mTicketOverlay","mTicketClose","mTicketRoleBadge","mTicketText",
   "mTicketWaLink","mTicketCopyBtn","mTicketHint"
  ].forEach(function(id){ mEls[id] = document.getElementById(id); });

  function mSanitizePhone(raw){ return raw.replace(/[^\d]/g,"").replace(/^0+/,""); }
  function mDefaultCounts(n){
    var mafia = Math.max(1, Math.round(n/4));
    var detective = n>=4 ? 1 : 0;
    var doctor = n>=5 ? 1 : 0;
    while(mafia+detective+doctor > n && mafia>1) mafia--;
    return { mafia:mafia, detective:detective, doctor:doctor };
  }
  function mCitizenCount(){
    var used = store.mafia.counts.mafia + store.mafia.counts.detective + store.mafia.counts.doctor;
    return Math.max(0, store.mafia.players.length - used);
  }
  function mGenCaseId(){
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    function chunk(n){ var s=""; for(var i=0;i<n;i++) s += chars[Math.floor(Math.random()*chars.length)]; return s; }
    return chunk(3)+"-"+chunk(3);
  }

  function mRenderRoleConfig(){
    var n = store.mafia.players.length;
    var html = "";
    ROLE_ORDER.forEach(function(key){
      var meta = ROLE_META[key];
      var val = store.mafia.counts[key] || 0;
      html += '<div class="role-row">'
        + '<span class="rname"><span class="rdot" style="background:'+meta.color+'"></span>'+meta.icon+' '+meta.label+'</span>'
        + '<span class="stepper">'
        + '<button type="button" data-role="'+key+'" data-dir="-1" '+(val<=0?'disabled':'')+'>−</button>'
        + '<span class="n">'+val+'</span>'
        + '<button type="button" data-role="'+key+'" data-dir="1" '+((store.mafia.counts.mafia+store.mafia.counts.detective+store.mafia.counts.doctor)>=n?'disabled':'')+'>+</button>'
        + '</span></div>';
    });
    html += '<div class="role-row"><span class="rname"><span class="rdot" style="background:var(--text-dim)"></span>👤 مواطن (تلقائي)</span><span class="n">'+mCitizenCount()+'</span></div>';
    mEls.mRoleConfig.innerHTML = html;
    mEls.mRoleConfig.querySelectorAll("button[data-role]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var role = btn.getAttribute("data-role");
        var dir = parseInt(btn.getAttribute("data-dir"),10);
        var next = (store.mafia.counts[role]||0) + dir;
        var used = store.mafia.counts.mafia+store.mafia.counts.detective+store.mafia.counts.doctor - (store.mafia.counts[role]||0) + next;
        if(next < 0 || used > store.mafia.players.length) return;
        store.mafia.counts[role] = next;
        mRenderRoleConfig(); mUpdateStartState();
      });
    });
  }

  function mRenderPlayerList(){
    mEls.mClearAllBtn.hidden = store.mafia.players.length === 0;
    if(store.mafia.players.length === 0){
      mEls.mPlayerList.innerHTML = "";
      mEls.mEmptyHint.style.display = "block";
    } else {
      mEls.mEmptyHint.style.display = "none";
      mEls.mPlayerList.innerHTML = store.mafia.players.map(function(p, i){
        return '<li><span><span class="p-num ltr">'+(i+1)+'.</span> '
          + '<span class="p-name">'+escapeHtml(p.name)+'</span>'
          + '<span class="p-phone ltr">'+escapeHtml(p.phone)+'</span></span>'
          + '<button class="p-remove" type="button" data-id="'+p.id+'" aria-label="إزالة">✕</button></li>';
      }).join("");
      mEls.mPlayerList.querySelectorAll(".p-remove").forEach(function(btn){
        btn.addEventListener("click", function(){
          store.mafia.players = store.mafia.players.filter(function(p){ return p.id !== btn.getAttribute("data-id"); });
          store.mafia.counts = mDefaultCounts(store.mafia.players.length);
          mRenderPlayerList(); mRenderRoleConfig(); mUpdateStartState(); persist();
        });
      });
    }
  }

  var mClearArmed = false;
  mEls.mClearAllBtn.addEventListener("click", function(){
    if(!mClearArmed){
      mClearArmed = true;
      mEls.mClearAllBtn.textContent = "تأكيد مسح الكل؟ اضغط مرة أخرى";
      mEls.mClearAllBtn.classList.add("armed");
      setTimeout(function(){
        mClearArmed = false;
        mEls.mClearAllBtn.textContent = "مسح كل اللاعبين ✕";
        mEls.mClearAllBtn.classList.remove("armed");
      }, 3000);
      return;
    }
    store.mafia.players = [];
    store.mafia.counts = { mafia:0, detective:0, doctor:0 };
    mClearArmed = false;
    mEls.mClearAllBtn.textContent = "مسح كل اللاعبين ✕";
    mEls.mClearAllBtn.classList.remove("armed");
    mRenderPlayerList(); mRenderRoleConfig(); mUpdateStartState(); persist();
  });

  function mUpdateStartState(){
    mEls.mStartBtn.disabled = store.mafia.players.length < 4;
    mEls.mFormWarn.textContent = "";
  }

  mEls.mAddPlayerBtn.addEventListener("click", mAddPlayer);
  [mEls.mNameInput, mEls.mPhoneInput].forEach(function(inp){
    inp.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); mAddPlayer(); } });
  });
  function mAddPlayer(){
    var name = mEls.mNameInput.value.trim();
    var phone = mSanitizePhone(mEls.mPhoneInput.value.trim());
    if(!name){ mEls.mFormWarn.textContent = "اكتب اسم اللاعب أولاً."; return; }
    if(phone.length < 8){ mEls.mFormWarn.textContent = "رقم واتساب غير صالح (أدخله برمز الدولة، بدون + أو صفر)."; return; }
    store.mafia.players.push({ id:uid(), name:name, phone:phone, role:null, sent:false, specialTurns:0 });
    store.mafia.counts = mDefaultCounts(store.mafia.players.length);
    mEls.mNameInput.value = ""; mEls.mPhoneInput.value = "";
    mEls.mFormWarn.textContent = "";
    mEls.mNameInput.focus();
    mRenderPlayerList(); mRenderRoleConfig(); mUpdateStartState(); persist();
  }

  function mAssignRoles(){
    var specialList = [];
    ROLE_ORDER.forEach(function(key){ for(var i=0;i<store.mafia.counts[key];i++) specialList.push(key); });
    specialList = shuffle(specialList);
    var remaining = shuffle(store.mafia.players.slice()).sort(function(a,b){ return (a.specialTurns||0)-(b.specialTurns||0); });
    var assigned = {};
    specialList.forEach(function(role){
      var idx = remaining.findIndex(function(p){ return p.role !== role; });
      if(idx === -1) idx = 0;
      var p = remaining.splice(idx,1)[0];
      assigned[p.id] = role;
      p.specialTurns = (p.specialTurns||0) + 1;
    });
    remaining.forEach(function(p){ assigned[p.id] = "citizen"; });
    store.mafia.players.forEach(function(p){ p.role = assigned[p.id]; p.sent = false; });
  }

  /* كل توزيع أدوار = جولة (أو التجربة المجانية أول مرة) */
  function mPayRound(){
    if(hasCredit()) return startRound("mafia", false);
    if(!trialUsed("mafia")) return startRound("mafia", true);
    openShop();
    return Promise.reject({ message: "quiet" });
  }
  function mRoundText(){
    if(!ME) return "";
    if(ACCT.admin) return "👑 أدمن — توزيع الأدوار بدون خصم";
    if(ACCT.credits > 0) return "🎟️ كل توزيع أدوار = جولة وحدة من رصيدك (" + roundsWord(ACCT.credits) + ")";
    if(!trialUsed("mafia")) return "🎁 أول توزيع أدوار مجاني (تجربة)";
    return '🔒 خلصت تجربتك المجانية للمافيا — <button type="button" data-shop>اشترِ جولات</button>';
  }
  mEls.mStartBtn.addEventListener("click", function(){
    if(store.mafia.players.length < 4) return;
    mEls.mStartBtn.disabled = true;
    mPayRound().then(function(d){
      if(!store.mafia.caseId) store.mafia.caseId = mGenCaseId();
      store.mafia.round = 1; store.mafia.kind = d.kind;
      mAssignRoles(); persist(); mRender();
    }).catch(function(e){ if(!(e && e.message === "quiet")) roundError(e); mUpdateStartState(); });
  });
  mEls.mNewRoundBtn.addEventListener("click", function(){
    function go(){
      mEls.mNewRoundBtn.disabled = true;
      mPayRound().then(function(d){
        store.mafia.round += 1; store.mafia.kind = d.kind; mAssignRoles(); persist(); mRender();
      }).catch(function(e){ if(!(e && e.message === "quiet")) roundError(e); })
        .then(function(){ mEls.mNewRoundBtn.disabled = false; });
    }
    if(ACCT.admin){ go(); return; }
    if(!hasCredit() && trialUsed("mafia")){ openShop(); return; }
    ask("جولة مافيا جديدة؟",
      hasCredit() ? "توزيع أدوار جديد = جولة وحدة من رصيدك (" + roundsWord(ACCT.credits) + ")." : "بتستخدم تجربتك المجانية للمافيا.",
      "🔄 وزّع الأدوار").then(function(ok){ if(ok) go(); });
  });
  mEls.mNewCaseBtn.addEventListener("click", function(){
    store.mafia.caseId = null; store.mafia.round = 0;
    store.mafia.players.forEach(function(p){ p.role=null; p.sent=false; });
    persist(); mRender();
  });

  function mRenderPlayerGrid(){
    mEls.mPlayerGrid.innerHTML = store.mafia.players.map(function(p){
      return '<button class="p-card'+(p.sent?' sent':'')+'" type="button" data-id="'+p.id+'">'
        + '<span class="pc-top"><span class="pc-name">'+escapeHtml(p.name)+'</span><span class="pc-icon">💬</span></span>'
        + '<span class="pc-status">'+(p.sent?'تم فتحها للإرسال':'رسالة واتساب جاهزة')+'<span class="dot"></span></span></button>';
    }).join("");
    mEls.mPlayerGrid.querySelectorAll(".p-card").forEach(function(card){
      card.addEventListener("click", function(){ mOpenTicket(card.getAttribute("data-id")); });
    });
  }

  function mRosterList(p){
    return store.mafia.players.map(function(x,i){ return (i+1)+". "+x.name+(x.id===p.id?" (أنت)":""); }).join("\n");
  }
  function mMafiaTeamLine(p){
    var teammates = store.mafia.players.filter(function(x){ return x.role==="mafia" && x.id!==p.id; });
    if(teammates.length === 0) return "أنت العضو الوحيد من عصابة الظل هذه الجولة — سرّك معك وحدك.";
    var names = teammates.map(function(x){ return x.name; }).join("، ");
    var word = teammates.length===1 ? "شريكك في عصابة الظل هذه الجولة" : "زملاؤك في عصابة الظل هذه الجولة";
    return word+": "+names+".\nنسّقوا بصمت — بقية اللاعبين ما يعرفون من فيها معكم.";
  }
  var CHOICE_PROMPT = {
    mafia:"🎯 اختاروا ضحيتكم الليلة — رُدّ على هذه المحادثة برقم واحد من القائمة:",
    detective:"🔎 اختر من تُحقق معه الليلة — رُدّ على هذه المحادثة برقم واحد من القائمة:",
    doctor:"💉 اختر من تحميه الليلة (تقدر تختار نفسك) — رُدّ على هذه المحادثة برقم واحد من القائمة:"
  };
  function mBuildMessage(p){
    var meta = ROLE_META[p.role];
    var header = "🕯️ ملف سرّي — طاولة السهرة\nالقضية رقم "+store.mafia.caseId+" • الجولة "+store.mafia.round+"\n\nيا "+p.name+"، افتح هذه الرسالة وحدك.";
    var footer = "\n🤫 هذه الرسالة بينك وبين طاولة السهرة فقط. لا تُظهرها لأي لاعب آخر.";
    var extra = "";
    if(p.role === "mafia"){
      extra = "\n\n"+mMafiaTeamLine(p)+"\n\n"+CHOICE_PROMPT.mafia+"\n"+mRosterList(p);
    } else if(p.role === "detective" || p.role === "doctor"){
      extra = "\n\n"+CHOICE_PROMPT[p.role]+"\n"+mRosterList(p);
    }
    return header+"\n\n"+meta.body+extra+"\n"+footer;
  }
  function mWaLink(phone, message){ return "https://wa.me/"+phone+"?text="+encodeURIComponent(message); }

  /* إرسال الأدوار تلقائيًا عبر بوت واتساب يشتغل على جهاز صاحب الطاولة (للأدمن فقط).
     السر ينطلب مرة وحدة ويتحفظ بمتصفحه، وما ينحط بالملف. الإرسال اليدوي لكل لاعب يبقى متاح. */
  var BOT_URL = "http://127.0.0.1:3000";
  function mBotSecret(){
    var ok = /^[A-Za-z0-9]{16,}$/;
    var s = "";
    try{ s = localStorage.getItem("wa_bot_secret") || ""; }catch(e){}
    if(s && !ok.test(s)){ s = ""; try{ localStorage.removeItem("wa_bot_secret"); }catch(e){} }
    if(!s){
      s = (prompt("أدخل سر البوت (القيمة بعد API_SECRET= فقط، حروف وأرقام بدون مسافات)") || "").trim();
      if(s && !ok.test(s)){ alert("السر غير صالح. انسخ القيمة الطويلة بعد API_SECRET= فقط (حروف إنجليزية وأرقام)."); return ""; }
      if(s){ try{ localStorage.setItem("wa_bot_secret", s); }catch(e){} }
    }
    return s;
  }
  function mAutoSend(){
    var btn = document.getElementById("mAutoSendBtn"), msg = document.getElementById("mAutoSendMsg");
    var list = store.mafia.players.filter(function(p){ return p.role && !p.sent; });
    if(!list.length){ msg.textContent = "كل الرسائل انرسلت."; return; }
    var secret = mBotSecret();
    if(!secret){ msg.textContent = "ما انكتب السر."; return; }
    btn.disabled = true; msg.textContent = "جاري الإرسال...";
    fetch(BOT_URL + "/send", {
      method:"POST",
      headers:{ "content-type":"application/json", "x-api-secret":secret },
      body: JSON.stringify({ messages: list.map(function(p){ return { phone:p.phone, text:mBuildMessage(p) }; }) })
    }).then(function(r){
      if(r.status === 401){ try{ localStorage.removeItem("wa_bot_secret"); }catch(e){} throw new Error("السر غير صحيح، جرّب مرة ثانية."); }
      if(r.status === 503) throw new Error("واتساب غير متصل بالبوت.");
      if(!r.ok) throw new Error("البوت رفض الطلب (" + r.status + ").");
      return r.json();
    }).then(function(){
      list.forEach(function(p){ p.sent = true; });
      persist(); mRenderPlayerGrid();
      msg.textContent = "✅ انحطت " + list.length + " رسالة بالدور، وتوصل خلال ثواني (فاصل بين كل رسالة).";
    }).catch(function(e){
      msg.textContent = "⚠️ " + (e && e.message === "Failed to fetch" ? "ما قدرت أوصل للبوت. تأكد أنه شغّال على هذا الجهاز." : (e && e.message) || "فشل الإرسال.") + " تقدر ترسل لكل لاعب يدويًا بالضغط على بطاقته.";
    }).then(function(){ btn.disabled = false; });
  }
  document.getElementById("mAutoSendBtn").addEventListener("click", mAutoSend);

  var mCurrentTicketId = null;
  function mOpenTicket(id){
    var p = store.mafia.players.find(function(x){ return x.id===id; });
    if(!p) return;
    mCurrentTicketId = id;
    var meta = ROLE_META[p.role];
    mEls.mTicketRoleBadge.textContent = meta.icon+" "+meta.label;
    mEls.mTicketRoleBadge.style.background = "color-mix(in srgb, "+meta.color+" 22%, transparent)";
    mEls.mTicketRoleBadge.style.color = meta.color;
    var msg = mBuildMessage(p);
    mEls.mTicketText.textContent = msg;
    mEls.mTicketWaLink.href = mWaLink(p.phone, msg);
    mEls.mTicketHint.textContent = "";
    mEls.mTicketOverlay.hidden = false;
  }
  function mCloseTicket(){ mEls.mTicketOverlay.hidden = true; mCurrentTicketId = null; }
  mEls.mTicketClose.addEventListener("click", mCloseTicket);
  mEls.mTicketOverlay.addEventListener("click", function(e){ if(e.target === mEls.mTicketOverlay) mCloseTicket(); });
  mEls.mTicketWaLink.addEventListener("click", function(){
    if(mCurrentTicketId){
      var p = store.mafia.players.find(function(x){ return x.id===mCurrentTicketId; });
      if(p){ p.sent = true; persist(); mRenderPlayerGrid(); }
    }
  });
  mEls.mTicketCopyBtn.addEventListener("click", function(){
    var text = mEls.mTicketText.textContent;
    function fallback(){
      try{
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        mEls.mTicketHint.textContent = "تم نسخ النص ✓";
      }catch(e){ mEls.mTicketHint.textContent = "تعذّر النسخ — انسخ النص يدويًا."; }
    }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ mEls.mTicketHint.textContent = "تم نسخ النص ✓"; }).catch(fallback);
    } else { fallback(); }
  });

  function mOnlineRender(){
    var a = document.getElementById("mafiaRejoin"), last = null;
    try{ last = JSON.parse(localStorage.getItem("sahra-mafia-last") || "null"); }catch(e){}
    var ok = !!(last && /^[A-Z2-9]{6}$/.test(last.code || "") && Date.now() - (+last.at || 0) < 12 * 3600 * 1000);
    if(!a) return;
    a.hidden = !ok;
    if(ok){ a.href = "mafia.html?r=" + last.code; document.getElementById("mafiaRejoinCode").textContent = last.code; }
  }
  function mRender(){
    mOnlineRender();
    var active = !!store.mafia.caseId;
    mEls.mafiaIntake.hidden = active;
    mEls.mafiaActive.hidden = !active;
    document.getElementById("mRoundLine").innerHTML = mRoundText();
    document.getElementById("mRoundLine2").innerHTML = mRoundText();
    mEls.mafiaCaseStamp.innerHTML = active ? 'LIVE CASE <b>'+store.mafia.caseId+'</b> · ج'+store.mafia.round : '';
    document.getElementById("mAutoSendBtn").hidden = !(ACCT && ACCT.admin);
    if(active){ mRenderPlayerGrid(); } else { mRenderPlayerList(); mRenderRoleConfig(); mUpdateStartState(); }
  }

  /* ======================================================================
     أسرع إصبع — كل فريق يمسح باركود ويصير جواله زر ضغط (Supabase Realtime)
     الشاشة هي الحَكَم: أول ضغطة توصلها تقفل الباقين. الجوالات تسمع حالة
     الشاشة (مقفل/مفتوح/فلان سبق) وترسل ضغطتها بس.
     ====================================================================== */
  var buzz = { client:null, channel:null, status:"off", state:"idle", qid:null, winner:null, winnerName:"", winnerPid:null, q:null, endAt:0, tick:null, tout:null,
               excluded:[], pens:{}, adds:{}, timeUp:false, presence:{}, hb:null, audio:null, flashT:null, sendT:null,
               log:[], logPts:[], turn:0, qStart:0, logHidden:false,      /* خانة «مين ضغط»: كل الضغطات بالسؤال بالترتيب */
               only:null, onlyEnd:0, onlyT:null,                           /* فرصة الفريق الخصم بعد ما يخلص الوقت */
               decide:false, twhy:null, ok:null,
               span:0, lastTick:-1, pmic:{}, micPids:{} };                                      /* (v12) مدة العدّاد كاملة · آخر تيك بآخر 3 ثواني */                         /* (v10) خلص الوقت والمقدّم يقرر صح/غلط · ليش رجع الزر للخصم · آخر «✅ صح» */
  var buzzEls = {
    openBtn: document.getElementById("buzzOpenBtn"),
    homeBtn: document.getElementById("buzzHomeBtn"),
    panel: document.getElementById("buzzPanel"),
    close: document.getElementById("buzzPanelClose"),
    grid: document.getElementById("bzGrid"),
    err: document.getElementById("bzErr"),
    auto: document.getElementById("bzAuto"),
    test: document.getElementById("bzTestBtn"),
    newRoom: document.getElementById("bzNewRoomBtn"),
    off: document.getElementById("bzOffBtn"),
    room: document.getElementById("bzRoom"),
    bar: document.getElementById("buzzBar"),
    flash: document.getElementById("buzzFlash")
  };
  function buzzRoomGen(){
    var c = "abcdefghjkmnpqrstuvwxyz23456789", r = "";
    for(var i=0;i<6;i++) r += c.charAt(Math.floor(Math.random()*c.length));
    return r;
  }
  function buzzTeamUrl(t){
    var base = location.origin + location.pathname.replace(/[^\/]*$/, "");
    return base + "buzz.html?r=" + encodeURIComponent(store.buzz.room) + "&t=" + encodeURIComponent(t.id);
  }
  function buzzActive(){ return buzz.status === "on" || buzz.status === "connecting"; }
  function buzzCleanName(n){ return String(n || "").replace(/\s+/g, " ").trim().slice(0, 20); }
  function buzzSend(){
    if(!buzz.channel || buzz.status !== "on") return;
    try{
      buzz.channel.send({ type:"broadcast", event:"state", payload:{
        v:1, state:buzz.state, qid:buzz.qid, winner:buzz.winner, winnerName:buzz.winnerName, winnerPid:buzz.winnerPid, excluded:buzz.excluded,
        teams: store.teams.map(function(t){ return { id:t.id, name:t.name, color:t.color }; }),
        q: buzz.q,                                                        /* السؤال (بدون الإجابة) يطلع بالجوالات */
        left: buzz.state === "locked" && buzz.endAt ? Math.max(0, (buzz.endAt - Date.now()) / 1000) : 0,   /* الوقت الباقي للجواب */
        tmax: buzzTimerSecs(), tout: buzz.tout, ts: Date.now(),             /* (v12) ts: الجوال يحسب نهاية العدّاد من وقت الإرسال */
        rec: store.buzz.rec ? 1 : 0, turn: buzz.turn,                     /* (v12) 🎙️ «الإعادة» شغّالة؟ · رقم الدور (مقطع الجوال لازم يكون لنفس الدور) */
        tup: buzz.state === "locked" && buzz.decide ? 1 : 0,              /* (v10) خلص الوقت — المقدّم يقرر صح ولا غلط */
        twhy: buzz.state === "armed" && buzz.tout ? (buzz.twhy === "wrong" ? "wrong" : "timeout") : null,   /* ليش رجع الزر للخصم */
        ok: buzz.ok && Date.now() - buzz.ok.at < 8000 ? { t:buzz.ok.t, n:buzz.ok.n, cell:buzz.ok.cell ? 1 : 0, id:buzz.ok.at, ago:Math.max(0, Math.round((Date.now() - buzz.ok.at) / 1000)) } : null,   /* آخر «✅ صح» */
        only: buzz.state === "armed" && buzz.only ? buzz.only : null,      /* فرصة الخصم: بس هالفرق تقدر تضغط الحين */
        wleft: buzz.state === "armed" && buzz.only && buzz.onlyEnd ? Math.max(0, (buzz.onlyEnd - Date.now()) / 1000) : 0,
        steal: cfgPlay().buzz_steal_secs,                                  /* كم ثانية فرصة الخصم (للنص بالجوال) */
        pens: buzzPensOut(),                                              /* الخصم بهالسؤال: {فريق: {n, kind, ago}} */
        adds: buzzAddsOut(),                                              /* الزيادة اللي عطاها المقدّم بعد ما خلص الوقت */
        mq: mlPhone() || mcPhone()                                        /* «طريق المليون» + (v11) الأعلام والصور: السؤال والخيارات للجوالات */
      }});
    }catch(e){}
  }
  function buzzUnlockAudio(){
    try{
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return;
      if(!buzz.audio) buzz.audio = new Ctx();
      if(buzz.audio.state === "suspended") buzz.audio.resume();
    }catch(e){}
  }
  function buzzBeep(){
    try{
      if(!buzz.audio) return;
      var a = buzz.audio, o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime;
      o.type = "square"; o.frequency.setValueAtTime(880, t0); o.frequency.setValueAtTime(1175, t0 + 0.12);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + 0.45);
    }catch(e){}
  }
  function buzzConnect(){               /* تشغيل «أسرع إصبع» (يطلع شريط الأزرار) */
    store.buzz.enabled = true; persist();
    rtConnect(); renderBuzzUI();
  }
  /* الاتصال المباشر نفسه — يستخدمه «أسرع إصبع» و«حطها على راسك» (اللي ما يشغّل شريط الأزرار) */
  var rtWaiting = false;
  function rtConnect(){
    if(buzz.channel) return;
    if(!sharedSb && !sbFailed){
      buzz.status = "connecting"; renderBuzzUI();
      if(!rtWaiting){ rtWaiting = true; sbReady.then(function(){ rtWaiting = false; rtConnect(); }); }
      return;
    }
    if(typeof window.supabase === "undefined" || !window.supabase.createClient || !window.SAHRA_SUPABASE_URL){
      buzz.status = "error"; renderBuzzUI(); return;
    }
    if(!store.buzz.room){ store.buzz.room = buzzRoomGen(); persist(); }
    if(!buzz.client){
      buzz.client = sharedSb || window.supabase.createClient(window.SAHRA_SUPABASE_URL, window.SAHRA_SUPABASE_ANON_KEY, {
        auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }
      });
    }
    buzz.status = "connecting"; renderBuzzUI();
    var ch = buzz.client.channel("sahra-buzz-" + store.buzz.room, {
      config: { broadcast: { self:false }, presence: { key:"host" } }
    });
    ch.on("broadcast", { event:"buzz" }, function(m){ onBuzz((m && m.payload) || {}); });
    ch.on("broadcast", { event:"hello" }, function(m){
      buzzSend();
      var p = (m && m.payload) || {};
      if(p.role === "heads" && typeof p.team === "string") headsSendTurn(p.team);
    });
    ch.on("broadcast", { event:"heads" }, function(m){ onHeads((m && m.payload) || {}); });
    ch.on("broadcast", { event:"mpick" }, function(m){ onMillionPick((m && m.payload) || {}); });
    ch.on("broadcast", { event:"mvote" }, function(m){ onMillionVote((m && m.payload) || {}); });
    ch.on("broadcast", { event:"rp" }, function(m){ recPhoneChunk((m && m.payload) || {}); });   /* (v12) 🔁 مقطع الإعادة من جوال اللي ضغط */
    ch.on("broadcast", { event:"rope" }, function(m){ if(RP.host) RP.host.netMsg((m && m.payload) || {}); });
    ch.on("presence", { event:"sync" }, function(){
      var st = ch.presenceState(), per = {}, mic = {}, micP = {};
      Object.keys(st).forEach(function(k){
        (st[k] || []).forEach(function(meta){
          if(!meta || !meta.team) return;
          (per[meta.team] || (per[meta.team] = [])).push(buzzCleanName(meta.name) || "لاعب");
          (mic[meta.team] || (mic[meta.team] = [])).push(!!meta.mic);           /* (v12) 🎙️ مايك الجوال جاهز للإعادة */
          if(meta.mic && typeof meta.pid === "string") micP[meta.pid] = true;
        });
      });
      buzz.presence = per; buzz.pmic = mic; buzz.micPids = micP; renderBuzzUI();
    });
    ch.subscribe(function(status){
      if(buzz.channel !== ch) return;
      if(status === "SUBSCRIBED"){ buzz.status = "on"; buzzSend(); }
      else if(status === "CHANNEL_ERROR" || status === "TIMED_OUT"){ buzz.status = "error"; }
      renderBuzzUI();
    });
    buzz.channel = ch;
    clearInterval(buzz.hb);
    buzz.hb = setInterval(buzzSend, 6000);   /* نبضة: الجوالات تعرف إن الشاشة شغالة، واللي دخل متأخر يتزامن */
  }
  function buzzDisconnect(keepEnabled){
    clearInterval(buzz.hb); buzz.hb = null; buzzStopTimer(); buzzStopWindow(); buzz.q = null; buzz.tout = null; buzz.pens = {}; buzz.adds = {}; buzz.timeUp = false; tuHide();
    buzz.decide = false; buzz.twhy = null; buzz.ok = null; bdHide();
    recDiscard(); if(!keepEnabled) recRelease();
    buzz.only = null; buzz.onlyEnd = 0; buzzClearLog();
    var ch = buzz.channel; buzz.channel = null;
    if(ch && buzz.client){ try{ buzz.client.removeChannel(ch); }catch(e){} }
    buzz.status = "off"; buzz.state = "idle"; buzz.winner = null; buzz.winnerName = ""; buzz.winnerPid = null; buzz.excluded = []; buzz.presence = {}; buzz.pmic = {}; buzz.micPids = {};
    if(!keepEnabled){ store.buzz.enabled = false; persist(); }
    renderBuzzUI();
  }
  function buzzArm(qid, force, q){
    if(!buzzActive()) return;
    buzzStopTimer(); buzzStopWindow();
    var nq = qid || ("q" + Date.now());
    if(nq !== buzz.qid) buzzClearLog();            /* سؤال جديد = خانة «مين ضغط» تبدأ من جديد */
    buzz.qid = nq;
    buzz.q = q || null; buzz.tout = null; buzz.pens = {}; buzz.adds = {}; buzz.timeUp = false; tuHide();
    buzz.decide = false; buzz.twhy = null; bdHide(); recDiscard();
    buzz.winner = null; buzz.winnerName = ""; buzz.winnerPid = null; buzz.excluded = []; buzz.only = null; buzz.onlyEnd = 0;
    buzz.state = (force || store.buzz.auto) ? "armed" : "idle";
    if(buzz.state === "armed" && !buzz.qStart) buzz.qStart = Date.now();
    buzzSend(); renderBuzzUI();
  }
  /* «غلط»: الفريق ينقفل عليه بهالسؤال، والزر ينفتح للباقين على طول */
  function buzzReopen(){
    if(!buzzActive()) return;
    buzzStopTimer(); buzzStopWindow(); buzz.timeUp = false; tuHide();
    buzz.decide = false; buzz.twhy = null; bdHide(); recDiscard();
    buzz.tout = null; buzz.only = null; buzz.onlyEnd = 0;
    if(buzz.winner && buzz.excluded.indexOf(buzz.winner) === -1) buzz.excluded.push(buzz.winner);
    buzz.winner = null; buzz.winnerName = ""; buzz.winnerPid = null; buzz.state = "armed";
    if(!buzz.qid) buzz.qid = "q" + Date.now();
    if(!buzz.qStart) buzz.qStart = Date.now();
    buzzSend(); renderBuzzUI();
  }
  /* ===== فرصة الفريق الخصم: بعد ما يخلص وقت اللي ضغط، الزر يرجع للخصم بس N ثانية — وبعدها ينفتح للكل ===== */
  function buzzStealSecs(){ return cfgPlay().buzz_steal_secs; }
  function buzzStartWindow(){ clearInterval(buzz.onlyT); buzz.onlyT = setInterval(buzzWindowTick, 200); }
  function buzzStopWindow(){ clearInterval(buzz.onlyT); buzz.onlyT = null; }
  function buzzWindowLeft(){ return buzz.onlyEnd ? Math.max(0, Math.ceil((buzz.onlyEnd - Date.now()) / 1000)) : 0; }
  function buzzWindowTick(){
    if(buzz.state !== "armed" || !buzz.only || !buzz.onlyEnd){ buzzStopWindow(); return; }
    var left = buzzWindowLeft(), el = document.getElementById("bbWin"), lw = document.getElementById("blWin");
    if(el){ el.textContent = "⏳ " + left; el.classList.toggle("warn", left <= 3); }
    if(lw) lw.textContent = left;
    if(Date.now() >= buzz.onlyEnd) buzzOpenAll();
  }
  function buzzOpenAll(){
    buzzStopWindow();
    var was = !!buzz.only;
    buzz.only = null; buzz.onlyEnd = 0; buzz.tout = null; buzz.twhy = null;
    if(buzz.state === "armed" && was){ buzzSend(); renderBuzzUI(); buzzBlip(); }
  }
  /* ===== الخصم: خلص وقت الجواب (تلقائي) أو «غلط وخصم» (يختاره المقدّم) — الكمية من لوحة الأدمن ===== */
  function penWord(n){ return arN(n, "نقطة", "نقطتين", "نقاط", "نقطة"); }
  /* قوانين الأزرار (تطلع بنافذة «أسرع إصبع» عشان المقدّم يشرحها للفرق) */
  function buzzRulesHtml(){
    var s = buzzTimerSecs(), p = cfgPlay(), out = [];
    var st = buzzStealSecs();
    out.push("👆 أول ما أحد يضغط يختفي الزر من كل الجوالات ويطلع اسمه");
    out.push(s ? "⏱️ اللي يضغط أول عنده " + arN(s, "ثانية وحدة", "ثانيتين", "ثواني", "ثانية") + " يجاوب" : "⏱️ بدون مؤقت للجواب");
    if(s) out.push("🔊 العدّاد كبير فوق الشاشة، وتيك تيك بآخر 3 ثواني، وصفارة لما يخلص — العبرة إنه يبدأ يجاوب قبل الصفارة");
    if(s) out.push("⏰ إذا خلص وقته تطلع للمقدّم نافذة: ✅ صح ولا ❌ غلط");
    if(s && store.buzz.rec) out.push("🔁 لو اختلفتوا على الوقت: «إعادة» تسمّعكم آخر ثواني الجواب من جوال الفريق اللي ضغط");
    out.push("✅ صح: الفريق ياخذ نقاط السؤال ويتسكّر");
    out.push(st ? "❌ غلط أو ⏰ ما جاوب: يرجع الزر للفريق الخصم " + arN(st, "ثانية وحدة", "ثانيتين", "ثواني", "ثانية") + "، وبعدها ينفتح للكل" : "❌ غلط أو ⏰ ما جاوب: ينفتح الزر للكل");
    if(p.buzz_pen_wrong) out.push("➖ الغلط يخصم " + penWord(p.buzz_pen_wrong));
    out.push("⚖️ وتقدر تخصم وتزيد بنفسك من زر ⚖️");
    out.push("🔔 خانة «مين ضغط» تبيّن كل اللي ضغطوا بالترتيب لين يخلص السؤال");
    return out.map(function(x){ return "<span>" + x + "</span>"; }).join("");
  }
  function buzzPensOut(){
    var out = {}, now = Date.now();
    Object.keys(buzz.pens || {}).forEach(function(id){
      var p = buzz.pens[id];
      out[id] = { n:p.n, kind:p.kind, id:p.at, ago:Math.max(0, Math.round((now - p.at) / 1000)) };
    });
    return out;
  }
  function buzzAddsOut(){
    var out = {}, now = Date.now();
    Object.keys(buzz.adds || {}).forEach(function(id){
      var p = buzz.adds[id];
      out[id] = { n:p.n, id:p.at, ago:Math.max(0, Math.round((now - p.at) / 1000)) };
    });
    return out;
  }
  function buzzPenalize(teamId, kind){
    var p = cfgPlay(), n = kind === "timeout" ? p.buzz_pen_timeout : p.buzz_pen_wrong;
    var t = teamOf(teamId);
    if(!n || !t) return 0;
    t.score -= n;
    buzz.pens[t.id] = { n:n, kind:kind, at:Date.now() };
    persist(); renderTeams();
    return n;
  }
  /* «غلط»: الفريق ينقفل عليه بهالسؤال (ومع الخصم لو اختاره المقدّم) — وإذا ما بقى أحد تتقفل الأزرار */
  function buzzWrong(withPen){
    if(!buzzActive() || buzz.state !== "locked") return;
    var team = teamOf(buzz.winner);
    var x2 = team ? buzzX2Wrong(team.id) : 0;
    var pen = x2 || (withPen && team ? buzzPenalize(team.id, "wrong") : 0);
    var penTxt = pen ? "انخصمت " + penWord(pen) + " على " + team.name + (x2 ? " (×2)" : "") : "";
    buzzLogMark("wrong", pen);
    var others = store.teams.filter(function(t){ return t.id !== buzz.winner && buzz.excluded.indexOf(t.id) === -1; });
    if(!others.length){
      buzzIdle(true);
      toast("❌ جواب غلط" + (penTxt ? " — " + penTxt : "") + " — وما بقى فريق يجاوب");
      return;
    }
    buzzReopen();
    if(penTxt) toast("➖ " + penTxt + " — انفتحت الأزرار " + (others.length === 1 ? "لـ " + others[0].name : "للباقين"));
  }
  /* قفل الأزرار. keepLog = «🔒 قفل» من الشريط: خانة «مين ضغط» تبقى لين ينقفل السؤال نفسه */
  function buzzIdle(keepLog){
    if(!keepLog) buzzClearLog();
    if(!buzzActive()) return;
    buzzStopTimer(); buzzStopWindow(); buzz.timeUp = false; tuHide();
    buzz.decide = false; buzz.twhy = null; bdHide(); recDiscard();
    buzz.only = null; buzz.onlyEnd = 0;
    if(buzz.state === "idle" && !buzz.winner && !buzz.q){ renderBuzzLog(); return; }
    buzz.state = "idle"; buzz.winner = null; buzz.winnerName = ""; buzz.winnerPid = null; buzz.excluded = []; buzz.q = null; buzz.tout = null;
    buzzSend(); renderBuzzUI();
  }
  function onBuzz(p){
    if(!p || typeof p !== "object") return;
    if(p.qid && buzz.qid && p.qid !== buzz.qid) return;          /* ضغطة متأخرة من سؤال قبل */
    var team = teamOf(p.team);
    if(!team || buzz.excluded.indexOf(team.id) !== -1) return;
    var name = buzzCleanName(p.name), pid = typeof p.pid === "string" ? p.pid.slice(0, 40) : null;
    if(buzz.state === "locked"){
      /* أحد ضغط بعد الأول بنفس السؤال (تقريبًا بنفس اللحظة) — ينضاف لخانة «مين ضغط» بس، والدور يبقى للأول */
      if(pid && pid === buzz.winnerPid) return;
      buzzLogAdd(team, name, pid, "late");
      return;
    }
    if(buzz.state !== "armed") return;
    if(buzz.only && buzz.only.indexOf(team.id) === -1) return;   /* فرصة الخصم: الفريق اللي خلص وقته ينتظر */
    buzzStopWindow(); buzz.only = null; buzz.onlyEnd = 0;
    buzz.state = "locked"; buzz.winner = team.id; buzz.tout = null; buzz.timeUp = false;
    TTS.stop();
    buzz.winnerName = name; buzz.winnerPid = pid;
    buzz.turn += 1;
    buzzLogAdd(team, name, pid, "ans");
    buzzStartTimer();
    if(buzz.endAt) recStart();   /* (v12) 🔁 يسجّل وقت الجواب بس (لو المقدّم شغّل الإعادة) */
    buzzSend(); renderBuzzUI(); buzzFlash(team, buzz.winnerName); buzzBeep();
  }
  /* ===== خانة «مين ضغط»: كل ضغطة بالسؤال تنضاف بالترتيب، وتبقى لين ينحل السؤال ===== */
  function buzzClearLog(){ buzz.log = []; buzz.logPts = []; buzz.turn = 0; buzz.qStart = 0; buzz.logHidden = false; renderBuzzLog(); }
  function buzzLogAdd(team, name, pid, st){
    var now = Date.now(), i, r, first = null;
    for(i = buzz.log.length - 1; i >= 0; i--){ r = buzz.log[i]; if(r.turn === buzz.turn && r.st !== "late"){ first = r; break; } }
    if(st === "late"){
      for(i = 0; i < buzz.log.length; i++){ r = buzz.log[i]; if(r.turn === buzz.turn && (pid ? r.pid === pid : (r.team === team.id && r.name === name))) return; }
      if(buzz.log.length >= 40) return;
    }
    buzz.log.push({ team: team.id, name: name, pid: pid, at: now, turn: buzz.turn, st: st, d: st === "late" && first ? now - first.at : 0, pen: 0 });
    buzz.logHidden = false;
    renderBuzzLog();
  }
  function buzzLogMark(st, pen){   /* صاحب الدور الحالي: ⏰ خلص وقته أو ❌ غلط */
    for(var i = buzz.log.length - 1; i >= 0; i--){
      var r = buzz.log[i];
      if(r.turn === buzz.turn && r.st === "ans"){ r.st = st; if(pen) r.pen = pen; break; }
    }
    renderBuzzLog();
  }
  function buzzLastTimeout(){ for(var i = buzz.log.length - 1; i >= 0; i--) if(buzz.log[i].st === "timeout") return buzz.log[i].team; return null; }
  function blSecs(ms){ var v = Math.max(0, ms) / 1000; return (v < 10 ? v.toFixed(1) : String(Math.round(v))) + " ث"; }
  function renderBuzzLog(){
    var el = document.getElementById("buzzLog"); if(!el) return;
    var show = !!store.buzz.enabled && buzzActive() && buzz.log.length > 0 && !buzz.logHidden;
    if(!show){
      if(!el.hidden){ el.hidden = true; el.innerHTML = ""; el._h = ""; }
      document.body.classList.remove("has-buzz-log");
      return;
    }
    var rows = buzz.log.map(function(r, k){
      var t = teamOf(r.team) || { name: "فريق", color: "#8b85a3" }, who = r.name || t.name, st;
      if(r.st === "ans") st = buzz.state === "locked" && buzz.decide ? "⏰ صح ولا غلط؟" : buzz.state === "locked" && buzz.endAt ? 'يجاوب <i id="blT"></i>' : "يجاوب";
      else if(r.st === "timeout") st = "⏰ خلص وقته";
      else if(r.st === "wrong") st = "❌ غلط" + (r.pen ? ' <b dir="ltr">−' + r.pen + '</b>' : "");
      else if(r.st === "ok") st = "✅ صح";
      else st = "بعده بـ " + blSecs(r.d);
      var when = r.st === "late" ? "" : '<span class="bl-t">' + blSecs(r.at - (buzz.qStart || r.at)) + '</span>';
      var small = [r.name ? escapeHtml(t.name) : "", when].filter(Boolean).join(" · ");
      return '<li class="bl-row st-' + r.st + '" style="--c:' + t.color + '"><span class="bl-n">' + (k + 1) + '</span>'
        + '<span class="bl-who"><b>' + escapeHtml(who) + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</span>'
        + '<span class="bl-st">' + st + '</span></li>';
    }).join("");
    var foot = "";
    if(buzz.state === "armed" && buzz.only && buzz.onlyEnd){
      var on = store.teams.filter(function(t){ return buzz.only.indexOf(t.id) !== -1; });
      foot = '⏳ الفرصة لـ ' + escapeHtml(on.length === 1 ? on[0].name : "الفرق الثانية") + ': <b id="blWin" dir="ltr"></b> — بعدها للكل';
    } else if(buzz.state === "armed") foot = "🔴 الزر مفتوح " + (buzz.excluded.length ? "للباقين" : "للكل");
    else if(buzz.state === "idle") foot = "🔒 الأزرار مقفلة";
    var pts = buzz.logPts.length ? '<div class="bl-pts">' + buzz.logPts.map(function(x){ return escapeHtml(x); }).join(" · ") + '</div>' : "";
    var html = '<div class="bl-h"><b>🔔 مين ضغط</b>'
      + '<button type="button" class="bl-btn" data-bl="tu" title="خصم / زيادة" aria-label="خصم أو زيادة نقاط">⚖️</button>'
      + '<button type="button" class="bl-btn" data-bl="hide" title="إخفاء لين الضغطة الجاية" aria-label="إخفاء الخانة">✕</button></div>'
      + '<ol class="bl-list">' + rows + '</ol>' + (foot ? '<p class="bl-foot">' + foot + '</p>' : '') + pts;
    if(el._h !== html){ el._h = html; el.innerHTML = html; var L = el.querySelector(".bl-list"); if(L) L.scrollTop = L.scrollHeight; }
    el.hidden = false;
    document.body.classList.add("has-buzz-log");
    document.body.style.setProperty("--bl-h", (el.offsetHeight + 10) + "px");
    buzzLogTick();
  }
  function buzzLogTick(){
    var a = document.getElementById("blT"); if(a) a.textContent = buzz.endAt ? "⏱️ " + buzzTimeLeft() : "";
    var w = document.getElementById("blWin"); if(w) w.textContent = buzzWindowLeft();
  }
  document.getElementById("buzzLog").addEventListener("click", function(e){
    var b = e.target.closest("[data-bl]"); if(!b) return;
    var a = b.getAttribute("data-bl");
    if(a === "hide"){ buzz.logHidden = true; renderBuzzLog(); }
    else if(a === "tu") tuOpen(true);
  });
  /* ===== مؤقت الإجابة: الوقت من لوحة الأدمن (أسرع إصبع). يخلص → ما فيه خصم تلقائي: نافذة للمقدّم يختار يخصم على مين ويزيد لمين ===== */
  function buzzTimerSecs(){ var n = Math.round(+((CATALOG && CATALOG.buzz_timer) || 0)); return n > 0 ? Math.min(120, n) : 0; }
  function buzzTimeLeft(){ return buzz.endAt ? Math.max(0, Math.ceil((buzz.endAt - Date.now()) / 1000)) : 0; }
  function buzzStopTimer(){ clearInterval(buzz.tick); buzz.tick = null; buzz.endAt = 0; bzClockRender(); }
  function buzzStartTimer(){
    buzzStopTimer();
    var secs = buzzTimerSecs();
    if(!secs) return;
    buzz.span = secs * 1000; buzz.lastTick = -1;
    buzz.endAt = Date.now() + buzz.span;
    buzz.tick = setInterval(buzzTimerTick, 200);
    bzClockRender();
  }
  function buzzTimerTick(){
    if(buzz.state !== "locked" || !buzz.endAt){ buzzStopTimer(); return; }
    var left = buzzTimeLeft(), el = document.getElementById("bbTimer");
    if(el){ el.textContent = "⏱️ " + left; el.classList.toggle("warn", left <= 3); }
    buzzLogTick();
    if(Date.now() >= buzz.endAt){ buzzTimeUp(); return; }
    bzClockRender();
    if(left >= 1 && left <= 3 && buzz.lastTick !== left){ buzz.lastTick = left; buzzTickSound(left); }   /* (v12) تيك تيك بآخر 3 ثواني */
  }
  function buzzTimeUp(){
    buzzStopTimer(); buzzTimeUpSound();
    recMark();   /* (v12) 🔁 نعلّم لحظة الصفارة بالتسجيل ونكمّل ثانية ونص بعدها */
    recExpectPhone();   /* (v12) 🔁 لو مايك جوال اللي ضغط جاهز — ننتظر مقطعه */
    var tw = buzz.state === "locked" && store.teams.find(function(t){ return t.id === buzz.winner; });
    if(tw) buzzTupFlash(tw, buzz.winnerName);
    /* (v10) فيه أحد ضغط وخلص وقته: نافذة للمقدّم — ✅ صح / ❌ غلط / ⏰ ما جاوب. الأزرار تنتظر قراره */
    if(buzz.state === "locked" && buzz.winner && store.teams.some(function(t){ return t.id === buzz.winner; })){
      buzz.decide = true;
      buzzSend(); bdOpen();
      return;
    }
    buzzTimeoutGo();
  }
  /* ⏰ ما جاوب: الزر يرجع للفريق الخصم N ثانية، وبعدها للكل (بدون خصم — زر ⚖️ لو تبي) */
  function buzzTimeoutGo(){ buzzStealGo("timeout", 0); }
  /* ❌ غلط (من النافذة أو الشريط بعد ما خلص الوقت): يخصم لو الأدمن مفعّل الخصم، والفرصة للخصم N ثانية وبعدها للكل */
  function buzzDecideWrong(){
    if(!buzzActive() || buzz.state !== "locked" || !buzz.winner) return;
    var n = cfgPlay().buzz_pen_wrong, x2 = buzzX2Wrong(buzz.winner), pen = x2 || (n > 0 ? buzzPenalize(buzz.winner, "wrong") : 0);
    buzzStealGo("wrong", pen);
  }
  function buzzStealGo(why, pen){
    if(!buzzActive()) return;
    var late = buzz.winner, secs = buzzStealSecs();
    buzzStopTimer(); buzz.decide = false; bdHide(); recDiscard();
    buzzLogMark(why === "wrong" ? "wrong" : "timeout", pen);
    var opp = store.teams.filter(function(t){ return t.id !== late && buzz.excluded.indexOf(t.id) === -1; });
    buzz.state = "armed"; buzz.winner = null; buzz.winnerName = ""; buzz.winnerPid = null; buzz.timeUp = false;
    buzz.tout = late; buzz.twhy = why === "wrong" ? "wrong" : "timeout";
    if(secs > 0 && opp.length){ buzz.only = opp.map(function(t){ return t.id; }); buzz.onlyEnd = Date.now() + secs * 1000; buzzStartWindow(); }
    else { buzz.only = null; buzz.onlyEnd = 0; }
    buzzSend(); renderBuzzUI();
    var lt = teamOf(late), ln = lt ? lt.name : "الفريق";
    var head = why === "wrong" ? "❌ جواب " + ln + " غلط" + (pen ? " — انخصمت " + penWord(pen) : "") : "⏰ خلص وقت " + ln;
    toast(head + " — " + (buzz.only ? "الفرصة لـ " + (opp.length === 1 ? opp[0].name : "الفرق الثانية") + " " + arN(secs, "ثانية", "ثانيتين", "ثواني", "ثانية") : "الزر مفتوح للكل"));
  }
  /* ===== (v10) نافذة «خلص الوقت»: ✅ صح / ❌ غلط / ⏰ ما جاوب ===== */
  function bdHide(){ var m = document.getElementById("bdModal"); if(m && !m.hidden) m.hidden = true; }
  function bdOpen(){
    var t = buzz.decide && teamOf(buzz.winner);
    if(!t){ bdHide(); renderBuzzUI(); return; }
    var m = document.getElementById("bdModal"), k = buzz.q && buzz.q.k, pts = buzzOkPts(), pen = cfgPlay().buzz_pen_wrong, secs = buzzStealSecs();
    var x2h = k === "trivia" && cellHelp(activeCell, t.id);
    if(x2h && x2h.k === "x2" && !(isObj(activeCell.x) && activeCell.x[t.id])) pen = tpts(activeCell.points);   /* (v11) ×2: الغلط = نقاط السؤال */
    var opp = store.teams.filter(function(x){ return x.id !== t.id && buzz.excluded.indexOf(x.id) === -1; });
    var chance = secs > 0 && opp.length ? "الفرصة لـ " + (opp.length === 1 ? opp[0].name : "الفرق الثانية") + " " + arN(secs, "ثانية", "ثانيتين", "ثواني", "ثانية") : "الزر ينفتح للكل";
    tuHide();
    m.style.setProperty("--c", t.color);
    document.getElementById("bdTitle").textContent = "خلص وقت " + t.name + "!";
    document.getElementById("bdWho").innerHTML = (buzz.winnerName ? "<b>" + escapeHtml(buzz.winnerName) + "</b> من " + escapeHtml(t.name) : "<b>" + escapeHtml(t.name) + "</b>") + " — جاوب صح ولا غلط؟";
    document.getElementById("bdOkSub").textContent = k === "letters" ? "الخلية لـ " + t.name : pts ? "+" + pts + " لـ " + t.name : "";
    document.getElementById("bdNoSub").textContent = (pen ? "−" + pen + " · " : "") + chance;
    document.getElementById("bdNone").textContent = "⏰ ما جاوب — " + chance + (pen ? " (بدون خصم)" : "");
    m.hidden = false;
    renderBuzzUI();
    recRenderUI();
    setTimeout(function(){ var b = document.getElementById("bdOk"); if(b && !m.hidden) try{ b.focus({ preventScroll: true }); }catch(e){} }, 30);
  }
  document.getElementById("bdOk").addEventListener("click", function(){ buzzUnlockAudio(); buzzCorrect(); });
  document.getElementById("bdNo").addEventListener("click", function(){ buzzUnlockAudio(); buzzDecideWrong(); });
  document.getElementById("bdNone").addEventListener("click", function(){ buzzUnlockAudio(); if(buzz.decide && buzz.state === "locked") buzzTimeoutGo(); else { bdHide(); renderBuzzUI(); } });
  document.getElementById("bdClose").addEventListener("click", function(){ bdHide(); renderBuzzUI(); });
  document.getElementById("bdModal").addEventListener("click", function(e){ if(e.target === e.currentTarget){ bdHide(); renderBuzzUI(); } });
  /* ✅ صح: الجواب يطلع على الشاشة، والفريق ياخذ نقاط السؤال (نفس زر الفريق باللعبة — والسؤال يتسكّر أو يجي اللي بعده) */
  function buzzOkPts(){
    var k = buzz.q && buzz.q.k;
    if(k === "trivia" && activeCell && buzz.winner) return trivGainFor(buzz.winner);   /* (v11) ×2 = ضعف */
    return (k === "trivia" || k === "emoji" || k === "flags") ? buzzQPts() : 0;
  }
  /* (v11) ×2 بسين جيم: «غلط» = تنخصم نقاط السؤال بدل الخصم العادي */
  function buzzX2Wrong(tid){
    if(!(buzz.q && buzz.q.k === "trivia" && activeCell)) return 0;
    var n = trivX2Wrong(tid);
    if(n) buzz.pens[tid] = { n:n, kind:"wrong", at:Date.now() };
    return n;
  }
  function buzzAnswerNow(k){
    try{
      if(k === "trivia") return activeCell ? activeCell.a : "";
      if(k === "emoji") return emojiState.current ? emojiState.current.a : "";
      if(k === "letters"){ var qs = LT.cur && store.letters.qmap[LT.cur.letter], q = qs && qs[LT.cur.qi]; return q ? q.a : ""; }
      if(k === "flags") return FL.cur ? FL.cur.n : "";
    }catch(e){}
    return "";
  }
  function buzzAwardBtn(k, tid){
    var box = k === "trivia" ? trivEls.teamBtns : k === "emoji" ? emojiEls.award : k === "letters" ? ltEls.mTeams : k === "flags" ? flEls.award : null;
    var attr = k === "trivia" ? "data-award" : k === "emoji" ? "data-emojiaward" : k === "letters" ? "data-ltaward" : "data-flaward";
    if(!box) return null;
    var list = box.querySelectorAll("[" + attr + "]");
    for(var i = 0; i < list.length; i++) if(list[i].getAttribute(attr) === tid) return list[i];
    return null;
  }
  function buzzCorrect(){
    if(!buzzActive() || buzz.state !== "locked" || !buzz.winner) return;
    var t = teamOf(buzz.winner); if(!t) return;
    var k = buzz.q && buzz.q.k, pts = buzzOkPts(), ans = buzzAnswerNow(k);
    buzzStopTimer(); buzz.decide = false; bdHide(); recDiscard();
    buzzLogMark("ok");
    nightFast(t.id, buzz.winnerName);
    /* نكشف الجواب (بسين جيم والصور والأعلام: أزرار الفرق تطلع معه) */
    if(k === "trivia" && !trivEls.revealBtn.hidden) trivEls.revealBtn.click();
    else if(k === "emoji" && !emojiEls.revealBtn.hidden) emojiEls.revealBtn.click();
    else if(k === "letters" && !ltEls.mReveal.hidden) ltEls.mReveal.click();
    else if(k === "flags" && !flEls.reveal.hidden) flEls.reveal.click();
    var btn = k ? buzzAwardBtn(k, t.id) : null, cell = k === "letters" && !!btn;
    buzz.ok = { t: t.id, n: btn ? pts : 0, cell: cell, at: Date.now() };
    buzzOkFlash(t, ans, btn ? pts : 0, cell);
    toast("✅ صح! " + (btn ? (cell ? "الخلية لـ " + t.name : "+" + pts + " لـ " + t.name) : k ? t.name + " — اختاروا من أزرار اللعبة" : t.name));
    if(btn) btn.click();      /* نفس زر الفريق: النقاط + يتسكّر السؤال (أو يجي اللي بعده) */
    else buzzIdle(true);
  }
  function buzzOkFlash(team, ans, pts, cell){
    var el = buzzEls.flash;
    el.style.setProperty("--c", team.color);
    el.innerHTML = '<div><div>✅ صح!</div><div class="bf-name">' + escapeHtml(team.name) + (pts ? ' <span dir="ltr">+' + pts + '</span>' : cell ? ' — الخلية لهم' : '') + '</div>'
      + (ans ? '<div class="bf-ans">الإجابة: ' + escapeHtml(ans) + '</div>' : '') + '</div>';
    el.classList.remove("tup"); el.classList.add("ok");
    el.hidden = true; void el.offsetWidth; el.hidden = false;
    clearTimeout(buzz.flashT);
    buzz.flashT = setTimeout(function(){ el.hidden = true; el.classList.remove("ok"); }, 2550);
  }
  function buzzBlip(){
    try{
      if(!buzz.audio) return;
      var a = buzz.audio, o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime;
      o.type = "triangle"; o.frequency.setValueAtTime(740, t0); o.frequency.setValueAtTime(988, t0 + 0.09);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + 0.32);
    }catch(e){}
  }
  /* ===== نافذة «خلص الوقت»: اخصم من (فريق أو بدون) + زِد لـ (فريق أو بدون) — والكمية تتعدّل ===== */
  var tu = { minus:null, plus:null, nMinus:1, nPlus:1 };
  function tuEl(id){ return document.getElementById(id); }
  function tuHide(){ var m = tuEl("tuModal"); if(m && !m.hidden) m.hidden = true; }
  function buzzQPts(){
    var q = buzz.q || {}, P = cfgPlay().pts || {};
    var n = q.k === "trivia" ? q.pts : q.k === "emoji" ? P.emoji : q.k === "flags" ? P.flags : q.k === "letters" ? P.letters : 1;
    return Math.max(1, Math.min(999, Math.round(+n) || 1));
  }
  /* ⚖️ خصم / زيادة: يفتحها المقدّم وقت ما يبي (من الشريط أو خانة «مين ضغط») — والأزرار تكمل شغلها */
  function tuOpen(reset){
    if(!buzzActive()) return;
    var late = buzzLastTimeout(), team = late && teamOf(late);
    if(reset){ tu.minus = null; tu.plus = null; tu.nMinus = Math.max(1, cfgPlay().buzz_pen_timeout | 0); tu.nPlus = buzzQPts(); }
    var m = tuEl("tuModal");
    m.style.setProperty("--c", team ? team.color : "#7c5cff");
    tuEl("tuTitle").textContent = team ? "خلص وقت " + team.name : "⚖️ خصم / زيادة";
    tuRender();
    m.hidden = false;
    renderBuzzUI();
    setTimeout(function(){ var b = tuEl("tuReopen"); if(b) b.focus(); }, 30);
  }
  function tuRender(){
    function chips(sel){
      return '<button type="button" role="radio" class="tu-chip none" data-tid="" aria-checked="' + (sel == null) + '">بدون</button>'
        + store.teams.map(function(t){
          var late = buzz.log.some(function(r){ return r.team === t.id && r.st === "timeout"; });
          return '<button type="button" role="radio" class="tu-chip" style="--c:' + t.color + '" data-tid="' + t.id + '" aria-checked="' + (sel === t.id) + '">'
            + escapeHtml(t.name) + (late ? ' <span class="tu-late" title="خلص وقتهم">⏰</span>' : '') + '</button>';
        }).join("");
    }
    tuEl("tuMinus").innerHTML = chips(tu.minus);
    tuEl("tuPlus").innerHTML = chips(tu.plus);
    tuEl("tuMinusN").textContent = tu.nMinus;
    tuEl("tuPlusN").textContent = tu.nPlus;
    var sum = [];
    store.teams.forEach(function(t){
      if(t.id !== tu.minus && t.id !== tu.plus) return;
      var d = (t.id === tu.plus ? tu.nPlus : 0) - (t.id === tu.minus ? tu.nMinus : 0);
      sum.push(escapeHtml(t.name) + ' <b><span dir="ltr">' + t.score + '</span> ← <span dir="ltr">' + (t.score + d) + '</span></b>');
    });
    tuEl("tuSum").innerHTML = sum.length ? sum.join(" · ") : "ما فيه تغيير بالنقاط";
    var ro = tuEl("tuReopen"), lk = tuEl("tuLock");
    ro.hidden = false; ro.textContent = "✓ طبّق";
    lk.hidden = buzz.state === "idle"; lk.textContent = "✓ طبّق وقفل الأزرار"; lk.className = "btn-ghost";
  }
  function tuClose(){ tuHide(); renderBuzzUI(); }
  function tuApply(lock){
    var now = Date.now(), msg = [];
    var tm = tu.minus && teamOf(tu.minus);
    var tp = tu.plus && teamOf(tu.plus);
    if(tm){ tm.score -= tu.nMinus; buzz.pens[tm.id] = { n:tu.nMinus, kind:"host", at:now }; msg.push("➖ " + penWord(tu.nMinus) + " على " + tm.name); }
    if(tp){ tp.score += tu.nPlus; buzz.adds[tp.id] = { n:tu.nPlus, at:now }; msg.push("➕ " + penWord(tu.nPlus) + " لـ " + tp.name); }
    if(tm || tp){ persist(); renderTeams(); msg.forEach(function(x){ buzz.logPts.push(x); }); }
    tuHide();
    if(lock) buzzIdle(true);
    else { buzzSend(); renderBuzzUI(); }
    toast(msg.length ? msg.join(" · ") : (lock ? "🔒 انقفلت الأزرار" : "ما تغيّرت النقاط"));
  }
  tuEl("tuModal").addEventListener("click", function(e){
    if(e.target === e.currentTarget){ tuClose(); return; }
    var c = e.target.closest(".tu-chip");
    if(c){
      var tid = c.getAttribute("data-tid") || null;
      if(c.closest("#tuMinus")){ tu.minus = tid; if(tid && tu.plus === tid) tu.plus = null; }
      else { tu.plus = tid; if(tid && tu.minus === tid) tu.minus = null; }
      tuRender(); return;
    }
    var st = e.target.closest("[data-d]");
    if(st){
      var d = +st.getAttribute("data-d"), minus = st.closest("[data-step]").getAttribute("data-step") === "minus";
      if(minus) tu.nMinus = Math.max(1, Math.min(999, tu.nMinus + d)); else tu.nPlus = Math.max(1, Math.min(999, tu.nPlus + d));
      tuRender();
    }
  });
  tuEl("tuClose").addEventListener("click", tuClose);
  tuEl("tuReopen").addEventListener("click", function(){ tuApply(false); });
  tuEl("tuLock").addEventListener("click", function(){ tuApply(true); });
  /* (v12) صفارة «انتهى الوقت»: عالية وواضحة (ثانية)، وتنسمع بتسجيل الإعادة */
  function buzzTimeUpSound(){
    try{
      buzzUnlockAudio(); if(!buzz.audio) return;
      var a = buzz.audio, t0 = a.currentTime, g = a.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.42, t0 + 0.03);
      g.gain.setValueAtTime(0.42, t0 + 0.85);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
      g.connect(a.destination);
      [[196, "sawtooth"], [247, "square"], [294, "sawtooth"]].forEach(function(n){
        var o = a.createOscillator(), og = a.createGain();
        o.type = n[1]; o.frequency.setValueAtTime(n[0], t0); og.gain.value = 0.33;
        o.connect(og); og.connect(g); o.start(t0); o.stop(t0 + 1.12);
      });
    }catch(e){}
  }
  /* (v12) تيك بآخر 3 ثواني (آخر وحدة أحد) */
  function buzzTickSound(n){
    try{
      if(!buzz.audio) return;
      var a = buzz.audio, o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime;
      o.type = "square"; o.frequency.setValueAtTime(n === 1 ? 1320 : 990, t0);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.26, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + 0.15);
    }catch(e){}
  }
  function buzzFlash(team, who){
    var el = buzzEls.flash;
    el.classList.remove("ok", "tup");
    el.style.setProperty("--c", team.color);
    el.innerHTML = '<div><div>⚡ ' + escapeHtml(team.name) + '</div>'
      + (who ? '<div class="bf-name">' + escapeHtml(who) + '</div>' : '') + '</div>';
    el.hidden = true; void el.offsetWidth; el.hidden = false;
    clearTimeout(buzz.flashT);
    buzz.flashT = setTimeout(function(){ el.hidden = true; }, 1550);
  }
  /* ======================================================================
     (v12) ⏱️ عدّاد الجواب الكبير + ⏰ «انتهى الوقت» + 🔁 إعادة آخر ثواني
     - العدّاد فوق الشاشة كلها (فوق نافذة السؤال): يحمر بآخر 3 ثواني مع تيك تيك، وصفارة عالية + وميض «انتهى الوقت».
     - الإعادة (اختيارية من ⚙️ أسرع إصبع): مايك جهاز الشاشة يسجّل وقت الجواب بس، بذاكرة المتصفح —
       ما ينحفظ ولا ينرسل لأحد، ويبقى منه آخر 6 ثواني (4.5 قبل الصفارة + 1.5 بعدها) لين يقرر المقدّم، وبعدها ينمسح.
     ====================================================================== */
  var bzcEls = { box: document.getElementById("bzClock"), who: document.getElementById("bcWho"), num: document.getElementById("bcNum"), fill: document.getElementById("bcFill") };
  function bzClockRender(){
    if(!bzcEls || !bzcEls.box) return;
    var on = buzzActive() && buzz.state === "locked" && !!buzz.endAt && !buzz.decide;
    if(!on){
      if(!bzcEls.box.hidden){ bzcEls.box.hidden = true; document.body.classList.remove("has-bz-clock"); }
      return;
    }
    var t = store.teams.find(function(x){ return x.id === buzz.winner; });
    var ms = Math.max(0, buzz.endAt - Date.now()), left = Math.ceil(ms / 1000), span = buzz.span || (buzzTimerSecs() * 1000) || 1;
    var who = '⚡ ' + (buzz.winnerName ? '<b>' + escapeHtml(buzz.winnerName) + '</b><small>' + escapeHtml(t ? t.name : "") + '</small>' : '<b>' + escapeHtml(t ? t.name : "") + '</b>');
    if(bzcEls.who._h !== who){ bzcEls.who._h = who; bzcEls.who.innerHTML = who; }
    bzcEls.box.style.setProperty("--c", t ? t.color : "#7c5cff");
    if(bzcEls.num.textContent !== String(left)) bzcEls.num.textContent = left;
    bzcEls.box.classList.toggle("warn", left <= 3);
    bzcEls.fill.style.transform = "scaleX(" + Math.max(0, Math.min(1, ms / span)).toFixed(4) + ")";
    if(bzcEls.box.hidden){ bzcEls.box.hidden = false; document.body.classList.add("has-bz-clock"); }
  }
  function buzzTupFlash(team, who){
    var el = buzzEls.flash;
    el.classList.remove("ok"); el.classList.add("tup");
    el.style.setProperty("--c", "#b91c1c");
    el.innerHTML = '<div><div>⏰ انتهى الوقت!</div><div class="bf-name">' + escapeHtml(who ? who + " · " + team.name : team.name) + '</div></div>';
    el.hidden = true; void el.offsetWidth; el.hidden = false;
    clearTimeout(buzz.flashT);
    buzz.flashT = setTimeout(function(){ el.hidden = true; el.classList.remove("tup"); }, 1350);
  }
  /* ---------- 🔁 الإعادة ---------- */
  var REC = { stream:null, src:null, node:null, sink:null, ctx:null, wk:false, sr:0, ring:null, w:0, total:0, lastCb:0,
              active:false, mark:-1, finT:null, seg:null, peaks:null, play:null, raf:0, err:"", busy:false, ok:false,
              pseg:null, pwait:false, pwaitT:null, ph:null, srcSel:"", nomic:false, peaksOf:null };   /* (v12) 📱 مقطع جوال اللي ضغط · ننتظره · تجميع القطع · المصدر المختار · ما فيه مايك بالشاشة */
  var REC_WORKLET = "class SahraRec extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(2048);this.n=0;}"
    + "process(i){var c=i[0]&&i[0][0];if(c){for(var k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===2048){this.port.postMessage(this.b,[this.b.buffer]);this.b=new Float32Array(2048);this.n=0;}}}return true;}}"
    + "registerProcessor('sahra-rec',SahraRec);";
  var recEls = { box: document.getElementById("bdRp"), st: document.getElementById("bdRpSt"), cv: document.getElementById("bdWave"),
                 play: document.getElementById("bdPlay"), slow: document.getElementById("bdSlow"), tog: document.getElementById("bzRec"), pst: document.getElementById("bzRecSt"),
                 src: document.getElementById("bdRpSrc") };
  function recSupported(){ return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext)); }
  /* مايك الشاشة صار احتياط — لو ما اشتغل عادي، جوالات الفرق تكفي */
  function recErrText(e){
    var n = e && e.name;
    if(n === "NotAllowedError" || n === "SecurityError") return "🖥️ مايك هالجهاز مرفوض — عادي، جوالات الفرق تكفي (ولو تبيه احتياط: اسمح له من القفل 🔒 جنب الرابط وشغّلها من جديد)";
    if(n === "NotReadableError" || n === "AbortError") return "🖥️ مايك هالجهاز مشغول ببرنامج ثاني — عادي، جوالات الفرق تكفي";
    return "🖥️ ما اشتغل مايك هالجهاز — عادي، جوالات الفرق تكفي";
  }
  function recEnsure(){
    if(!store.buzz.rec || REC.stream || REC.busy || REC.nomic) return;
    if(!recSupported()){ REC.err = "🖥️ المتصفح هنا ما يدعم التسجيل — عادي، جوالات الفرق تكفي"; recPanelRender(); return; }
    REC.busy = true; REC.err = ""; recPanelRender();
    buzzUnlockAudio();
    var md = navigator.mediaDevices;
    /* (v12) فيه مايك أصلًا؟ (التلفزيون غالبًا لا) — لو ما فيه ما نطلب شي، والجوالات تكفي */
    var has = md.enumerateDevices ? md.enumerateDevices().then(function(l){
      if(!l || !l.length) return true;   /* القائمة فاضية = ما نعرف — نجرّب */
      return l.some(function(d){ return d.kind === "audioinput"; });
    }, function(){ return true; }) : Promise.resolve(true);
    has.then(function(ok){
      if(!ok){ var e = new Error("nomic"); e.name = "NotFoundError"; throw e; }
      return md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    }).then(function(st){
      REC.busy = false;
      if(!store.buzz.rec){ st.getTracks().forEach(function(t){ try{ t.stop(); }catch(x){} }); return; }
      REC.stream = st;
      return recWire();
    }).then(function(){ recPanelRender(); }, function(e){
      REC.busy = false; recRelease(true);
      var n = e && e.name;
      if(n === "NotFoundError" || n === "OverconstrainedError"){ REC.nomic = true; REC.err = ""; }
      else REC.err = recErrText(e);
      recPanelRender();
    });
  }
  function recWire(){
    buzzUnlockAudio();
    var a = buzz.audio;
    if(!a || !REC.stream) return Promise.reject(new Error("no_audio"));
    if(REC.ctx !== a){ REC.ctx = a; REC.wk = false; }
    REC.sr = a.sampleRate; REC.ring = new Float32Array(Math.round(a.sampleRate * 14));
    REC.src = a.createMediaStreamSource(REC.stream);
    REC.sink = a.createGain(); REC.sink.gain.value = 0; REC.sink.connect(a.destination);
    var useSP = function(){
      if(!a.createScriptProcessor) throw new Error("no_capture");
      var sp = a.createScriptProcessor(2048, 1, 1);
      sp.onaudioprocess = function(ev){ recPush(ev.inputBuffer.getChannelData(0)); };
      REC.node = sp; REC.src.connect(sp); sp.connect(REC.sink); REC.ok = true;
    };
    var useWK = function(){
      var n = new AudioWorkletNode(a, "sahra-rec", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit" });
      n.port.onmessage = function(ev){ recPush(ev.data); };
      REC.node = n; REC.src.connect(n); n.connect(REC.sink); REC.ok = true;
    };
    if(a.audioWorklet && window.AudioWorkletNode){
      if(REC.wk){ try{ useWK(); return Promise.resolve(); }catch(x){} }
      var url = URL.createObjectURL(new Blob([REC_WORKLET], { type: "application/javascript" }));
      return a.audioWorklet.addModule(url).then(function(){
        URL.revokeObjectURL(url); REC.wk = true;
        if(REC.stream && !REC.node){ try{ useWK(); }catch(x){ useSP(); } }
      }, function(){
        URL.revokeObjectURL(url);
        if(REC.stream && !REC.node) useSP();
      });
    }
    try{ useSP(); return Promise.resolve(); }catch(x){ return Promise.reject(x); }
  }
  function recPush(ch){
    REC.lastCb = performance.now();
    if(!REC.active || !REC.ring || !ch) return;
    var R = REC.ring, L = R.length, n = ch.length, w = REC.w;
    for(var i = 0; i < n; i++){ R[w] = ch[i]; w = w + 1 === L ? 0 : w + 1; }
    REC.w = w; REC.total += n;
    if(REC.mark >= 0 && REC.total >= REC.mark + Math.round(1.5 * REC.sr)) recFinish();
  }
  function recStart(){
    if(!REC) return;
    recClearPhone();
    if(!store.buzz.rec || !REC.ok || !REC.ring) return;
    recStop(); recClear();
    REC.active = true; REC.lastCb = performance.now();
    buzzUnlockAudio();
  }
  function recMark(){
    if(!REC || !REC.active) return;
    REC.mark = REC.total + Math.round(Math.max(0, performance.now() - REC.lastCb) / 1000 * REC.sr);
    clearTimeout(REC.finT); REC.finT = setTimeout(recFinish, 2300);   /* احتياط لو وقف التسجيل */
  }
  function recFinish(){
    if(!REC.active) return;
    REC.active = false; clearTimeout(REC.finT);
    var sr = REC.sr, R = REC.ring, L = R.length, first = Math.max(0, REC.total - L);
    var start = Math.max(first, REC.mark - Math.round(4.5 * sr)), end = Math.min(REC.total, REC.mark + Math.round(1.5 * sr));
    if(REC.mark < 0 || end - start < sr * 0.6){ recClear(); recRenderUI(); return; }
    var d = new Float32Array(end - start);
    for(var i = start, k = 0; i < end; i++, k++) d[k] = R[i % L];
    R.fill(0); REC.total = 0; REC.w = 0;   /* ما يبقى إلا المقطع لين القرار */
    REC.seg = { data: d, sr: sr, mark: REC.mark - start }; REC.peaks = null;
    recRenderUI(); renderBuzzUI();
  }
  /* ---------- (v12) 📱 مقطع الإعادة من جوال اللي ضغط ----------
     يوصل قطع صغيرة (μ-law 12kHz) عن طريق قناة الغرفة — نجمعها ونتأكد إنها لنفس السؤال ونفس الدور ونفس الجوال اللي ضغط */
  var ULAW_T = (function(){ var t = new Float32Array(256); for(var i = 0; i < 256; i++){ var u = ~i & 255, v = ((u & 15) << 3) + 132; v <<= (u & 112) >> 4; t[i] = ((u & 128) ? 132 - v : v - 132) / 32768; } return t; })();
  function recExpectPhone(){
    if(!REC) return;
    clearTimeout(REC.pwaitT);
    REC.pwait = !!(store.buzz.rec && !REC.pseg && buzz.winnerPid && buzz.micPids && buzz.micPids[buzz.winnerPid]);
    if(REC.pwait) REC.pwaitT = setTimeout(function(){ REC.pwait = false; recRenderUI(); }, 6000);
  }
  function recPhoneChunk(p){
    if(!REC || !store.buzz.rec || !p || typeof p !== "object") return;
    if(buzz.state !== "locked" || !buzz.winner || p.team !== buzz.winner || p.qid !== buzz.qid || +p.turn !== buzz.turn) return;
    if(buzz.winnerPid && p.pid !== buzz.winnerPid) return;
    var k = +p.k, i = +p.i, n = +p.n, sr = +p.sr, mk = +p.mark;
    if(typeof p.id !== "string" || p.id.length > 24 || !(k >= 1 && k <= 12 && (k | 0) === k && i >= 0 && i < k && (i | 0) === i)) return;
    if(!(sr >= 4000 && sr <= 24000) || !(n >= sr * 0.6 && n <= sr * 8) || !(mk >= 0 && mk <= n) || typeof p.d !== "string" || p.d.length > 40000) return;
    var A = REC.ph;
    if(!A || A.id !== p.id) A = REC.ph = { id:p.id, k:k, n:n, sr:sr, mk:mk, parts:new Array(k), got:0 };
    if(A.k !== k || A.n !== n || A.parts[i]) return;
    A.parts[i] = p.d; A.got++;
    if(A.got < k) return;
    REC.ph = null;
    var d = new Float32Array(n), o = 0;
    try{
      for(var c = 0; c < k; c++){
        var raw = atob(A.parts[c]);
        if(o + raw.length > n) return;
        for(var j = 0; j < raw.length; j++) d[o++] = ULAW_T[raw.charCodeAt(j)];
      }
    }catch(x){ return; }
    if(o !== n) return;
    clearTimeout(REC.pwaitT); REC.pwait = false;
    REC.pseg = { data:d, sr:sr | 0, mark:mk | 0 };
    recRenderUI(); renderBuzzUI();
  }
  /* المقطع المعروض: اللي اختاره المقدّم، وإلا الجوال (أوضح)، وإلا الشاشة */
  function recCur(){
    if(!REC) return null;
    if(REC.srcSel === "screen" && REC.seg) return REC.seg;
    if(REC.srcSel === "phone" && REC.pseg) return REC.pseg;
    return REC.pseg || REC.seg;
  }
  function recClearPhone(){ if(!REC) return; clearTimeout(REC.pwaitT); REC.pseg = null; REC.pwait = false; REC.ph = null; REC.srcSel = ""; }
  function recClear(){ REC.active = false; clearTimeout(REC.finT); REC.seg = null; REC.peaks = null; REC.mark = -1; REC.total = 0; REC.w = 0; if(REC.ring) REC.ring.fill(0); }
  function recDiscard(){ if(!REC || (!REC.active && !REC.seg && !REC.play && !REC.pseg && !REC.pwait && !REC.ph)) return; recStop(); recClear(); recClearPhone(); recRenderUI(); }
  function recRelease(keepErr){
    if(!REC) return;
    recStop(); recClear(); REC.ok = false;
    try{ if(REC.node){ if(REC.node.port) REC.node.port.onmessage = null; else REC.node.onaudioprocess = null; REC.node.disconnect(); } }catch(x){}
    try{ if(REC.src) REC.src.disconnect(); }catch(x){}
    try{ if(REC.sink) REC.sink.disconnect(); }catch(x){}
    if(REC.stream) REC.stream.getTracks().forEach(function(t){ try{ t.stop(); }catch(x){} });
    REC.node = REC.src = REC.sink = REC.stream = null; REC.ring = null;
    if(!keepErr) REC.err = "";
  }
  function recEnable(on){
    store.buzz.rec = !!on; persist();
    if(on){ REC.err = ""; REC.nomic = false; recEnsure(); } else { recRelease(); recClearPhone(); }
    buzzSend();   /* (v12) الجوالات تعرف إن «الإعادة» انشغلت أو انطفت */
    recPanelRender();
    var rules = document.getElementById("bzRules"); if(rules && !buzzEls.panel.hidden) rules.innerHTML = buzzRulesHtml();
  }
  function recPanelRender(){
    if(!recEls || !recEls.tog) return;
    recEls.tog.checked = !!store.buzz.rec;
    if(!store.buzz.rec){
      recEls.pst.textContent = "لو شغّلتها: جوال الفريق اللي ضغط يسجّل وقت جوابه بس (بعد ما يسمحون بالمايك)، والمقطع يوصل الشاشة بس — ما ينحفظ، وينمسح أول ما تقرر.";
      recEls.pst.className = "bz-rec-st"; return;
    }
    var ids = store.teams.map(function(t){ return t.id; });
    var ready = ids.filter(function(id){ return ((buzz.pmic || {})[id] || []).some(Boolean); }).length;
    var ph = "📱 جوالات الفرق: 🎙️ جاهز بـ " + ready + " من " + ids.length + (ready < ids.length ? " — كل فريق يضغط «🎙️ اسمحوا بالمايك» تحت بجواله" : " ✅");
    var sc = REC.err ? REC.err
      : REC.nomic ? "🖥️ هالجهاز ما فيه مايك — عادي، جوالات الفرق تكفي"
      : REC.busy ? "🖥️ ⏳ نطلب مايك هالجهاز (احتياط) — اضغط «سماح» لو طلع لك سؤال"
      : REC.ok ? "🖥️ مايك هالجهاز جاهز (احتياط)"
      : "🖥️ مايك هالجهاز (احتياط) يشتغل مع أول ضغطة بالصفحة";
    recEls.pst.innerHTML = escapeHtml(ph) + "<br>" + escapeHtml(sc);
    recEls.pst.className = "bz-rec-st" + (ready || REC.ok ? " ok" : "");
  }
  function recStop(){
    if(!REC) return;
    cancelAnimationFrame(REC.raf);
    var Pl = REC.play; REC.play = null;
    if(Pl){ try{ Pl.src.onended = null; Pl.src.stop(); }catch(x){} }
  }
  /* مقطع الجوال 12kHz — لو المتصفح ما يقبل هالسرعة نحوّله لسرعة الجهاز */
  function recBuf(a, S){
    try{
      var b0 = a.createBuffer(1, S.data.length, S.sr);
      if(b0.copyToChannel) b0.copyToChannel(S.data, 0); else b0.getChannelData(0).set(S.data);
      return b0;
    }catch(x){}
    var r = a.sampleRate / S.sr, n = Math.floor(S.data.length * r), out = new Float32Array(n);
    for(var i = 0; i < n; i++){ var q = i / r, j = Math.floor(q), f = q - j, v0 = S.data[j] || 0, v1 = j + 1 < S.data.length ? S.data[j + 1] : v0; out[i] = v0 + (v1 - v0) * f; }
    var b1 = a.createBuffer(1, n, a.sampleRate); b1.getChannelData(0).set(out); return b1;
  }
  function recPlay(rate){
    var S = recCur(); if(!S) return;
    buzzUnlockAudio(); var a = buzz.audio; if(!a) return;
    recStop();
    var buf = recBuf(a, S);
    var pk = 0; for(var i = 0; i < S.data.length; i += 3){ var v = Math.abs(S.data[i]); if(v > pk) pk = v; }
    var src = a.createBufferSource(), g = a.createGain();
    src.buffer = buf; src.playbackRate.value = rate;
    g.gain.value = pk > 0.001 ? Math.min(6, 0.9 / pk) : 1;   /* نرفع التسجيل لو صوته واطي */
    src.connect(g); g.connect(a.destination);
    var t0 = a.currentTime + 0.05;
    REC.play = { src: src, t0: t0, rate: rate, seg: S }; REC.srcSel = S === REC.pseg ? "phone" : "screen";
    src.onended = function(){ if(REC.play && REC.play.src === src){ REC.play = null; cancelAnimationFrame(REC.raf); recRenderUI(); } };
    src.start(t0);
    (function step(){ if(!REC.play || REC.play.src !== src) return; recDraw(); REC.raf = requestAnimationFrame(step); })();
    recRenderUI();
  }
  function recRenderUI(){
    var box = recEls && recEls.box; if(!box) return;
    var cur = recCur();
    var show = !!store.buzz.rec && buzz.decide && (REC.active || !!REC.seg || !!REC.pseg || REC.pwait);
    if(box.hidden !== !show) box.hidden = !show;
    if(!show) return;
    var Pl = REC.play, ready = !!cur;
    var wt = store.teams.find(function(t){ return t.id === buzz.winner; }), who = escapeHtml(buzz.winnerName || (wt ? wt.name : "الفريق"));
    recEls.st.textContent = ready ? (Pl ? "▶ يشتغل…" : "✅ جاهزة") : "⏺️ نجهّز الإعادة…";
    /* المصدر: 📱 جوال اللي ضغط (صوته أوضح) أو 🖥️ مايك الشاشة — لو الاثنين موجودين المقدّم يختار */
    var src = "", isP = !!cur && cur === REC.pseg;
    if(REC.seg && (REC.pseg || REC.pwait)){
      src = '<button type="button" data-rsrc="phone"' + (REC.pseg ? (isP ? ' class="on"' : '') : ' disabled') + '>📱 جوال ' + who + (REC.pseg ? '' : ' ⏳') + '</button>'
        + '<button type="button" data-rsrc="screen"' + (!isP ? ' class="on"' : '') + '>🖥️ مايك الشاشة</button>';
    } else if(cur) src = '<span>' + (isP ? '📱 من جوال ' + who : '🖥️ من مايك الشاشة') + '</span>';
    else if(REC.pwait) src = '<span>📱 يوصل من جوال ' + who + '…</span>';
    if(recEls.src){ if(recEls.src._h !== src){ recEls.src._h = src; recEls.src.innerHTML = src; } recEls.src.hidden = !src; }
    recEls.play.disabled = !ready; recEls.slow.disabled = !ready;
    var n = ready ? Math.max(1, Math.round(cur.data.length / cur.sr)) : 6;   /* لو وقت الجواب قصير، المقطع أقصر من 6 */
    recEls.play.textContent = Pl && Pl.rate === 1 ? "⏹️ وقّف" : "▶ اسمعوا آخر " + (n === 1 ? "ثانية" : n === 2 ? "ثانيتين" : n + " ثواني");
    recEls.slow.textContent = Pl && Pl.rate !== 1 ? "⏹️ وقّف" : "🐢 أبطأ";
    recDraw();
  }
  /* الموجة من اليمين لليسار (مثل القراءة): يمين الخط الأحمر = قبل الصفارة */
  function recDraw(){
    var cv = recEls.cv, S = (REC.play && REC.play.seg) || recCur(); if(!cv) return;
    var x = cv.getContext("2d"), W = cv.width, H = cv.height, top = 26;
    x.clearRect(0, 0, W, H);
    if(!S){ x.fillStyle = "rgba(255,255,255,.14)"; x.fillRect(0, (H + top) / 2 - 1, W, 2); return; }
    if(!REC.peaks || REC.peaks.length !== W || REC.peaksOf !== S){
      var p = new Float32Array(W), per = S.data.length / W, mx = 0;
      for(var c = 0; c < W; c++){
        var a0 = Math.floor(c * per), a1 = Math.min(S.data.length, Math.floor((c + 1) * per)), m = 0;
        for(var i = a0; i < a1; i++){ var v = Math.abs(S.data[i]); if(v > m) m = v; }
        p[c] = m; if(m > mx) mx = m;
      }
      if(mx > 0) for(var c2 = 0; c2 < W; c2++) p[c2] = p[c2] / mx;
      REC.peaks = p; REC.peaksOf = S;
    }
    var X = function(c){ return W - 1 - c; };
    var mk = Math.round(S.mark / S.data.length * W), ph = -1;
    if(REC.play && buzz.audio){ var el = Math.max(0, buzz.audio.currentTime - REC.play.t0) * REC.play.rate * S.sr; ph = Math.min(W, Math.round(el / S.data.length * W)); }
    var tm = store.teams.find(function(t){ return t.id === buzz.winner; }), col = tm ? tm.color : "#7c5cff";
    for(var c3 = 0; c3 < W; c3 += 4){
      var h = Math.max(3, REC.peaks[c3] * (H - top - 8)), y = top + (H - top - h) / 2;
      x.fillStyle = ph >= 0 && c3 <= ph ? col : c3 < mk ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.3)";
      x.fillRect(X(c3) - 2, y, 3, h);
    }
    x.fillStyle = "#ef4444"; x.fillRect(X(mk) - 2, top - 6, 5, H - top + 6);
    x.font = "700 24px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "top";
    x.fillText("⏰", Math.max(16, Math.min(W - 16, X(mk))), 0);
    if(ph >= 0 && ph < W){ x.fillStyle = "#fff"; x.fillRect(X(ph) - 1, top - 4, 3, H - top + 4); }
  }
  recEls.play.addEventListener("click", function(){ if(REC.play && REC.play.rate === 1){ recStop(); recRenderUI(); } else recPlay(1); });
  recEls.slow.addEventListener("click", function(){ if(REC.play && REC.play.rate !== 1){ recStop(); recRenderUI(); } else recPlay(0.7); });
  recEls.tog.addEventListener("change", function(){ buzzUnlockAudio(); recEnable(recEls.tog.checked); });
  if(recEls.src) recEls.src.addEventListener("click", function(e){
    var b = e.target.closest("[data-rsrc]"); if(!b || b.disabled) return;
    var v = b.getAttribute("data-rsrc"); if(v === REC.srcSel && !REC.play) return;
    recStop(); REC.srcSel = v; recRenderUI();
  });
  /* أي ضغطة بالصفحة: نشغّل الصوت (عشان الصفارة تنسمع) — ولو الإعادة شغّالة والمايك لسا ما اشتغل، نطلبه */
  document.addEventListener("pointerdown", function(){
    if(!store.buzz.enabled) return;
    buzzUnlockAudio();
    if(store.buzz.rec && !REC.stream && !REC.busy && !REC.err && !REC.nomic) recEnsure();
  }, true);
  /* بعد تحديث الصفحة: لو المايك مسموح له من قبل نشغّله على طول، وإلا مع أول ضغطة */
  function recInit(){
    recPanelRender();
    if(!store.buzz.rec || !recSupported()) return;
    try{ navigator.permissions.query({ name: "microphone" }).then(function(p){ if(p && p.state === "granted") recEnsure(); }, function(){}); }catch(x){}
  }

  function markBuzzButtons(){
    var w = buzz.state === "locked" ? buzz.winner : null;
    document.querySelectorAll("[data-award],[data-emojiaward],[data-ltaward],[data-flaward]").forEach(function(b){
      var id = b.getAttribute("data-award") || b.getAttribute("data-emojiaward") || b.getAttribute("data-ltaward") || b.getAttribute("data-flaward");
      b.classList.toggle("buzz-first", !!w && id === w);
    });
  }
  function renderBuzzUI(){
    var on = !!store.buzz.enabled && (buzzActive() || buzz.status === "error");
    buzzEls.openBtn.classList.toggle("on", !!store.buzz.enabled && buzzActive());
    document.getElementById("buzzOpenLbl").textContent = (store.buzz.enabled && buzzActive()) ? "الأزرار شغّالة" : "أسرع إصبع";
    /* الشريط السفلي */
    var bar = buzzEls.bar;
    document.body.classList.toggle("has-buzz-bar", on);
    bar.hidden = !on;
    bar.classList.remove("armed", "locked");
    if(on){
      var conn = '<span class="bb-conn" title="الجوالات المتصلة">' + store.teams.map(function(t){
        return '<i style="--c:' + t.color + '" class="' + (buzz.presence[t.id] ? "on" : "") + '"></i>';
      }).join("") + '</span>';
      var html = "";
      if(buzz.status === "error"){
        html = '<span>⚠️ تعذّر تشغيل الأزرار</span><button type="button" data-bb="retry">إعادة المحاولة</button>';
      } else if(buzz.status === "connecting"){
        html = '<span class="bb-dot"></span><span>جاري تشغيل الأزرار…</span>';
      } else if(buzz.state === "locked"){
        var wt = teamOf(buzz.winner);
        bar.classList.add("locked");
        bar.style.setProperty("--c", wt ? wt.color : "#555");
        var tl = buzzTimeLeft();
        var bbH = buzz.q && buzz.q.k === "trivia" && wt ? cellHelp(activeCell, wt.id) : null;
        var bbX2 = bbH && bbH.k === "x2" && !(isObj(activeCell.x) && activeCell.x[wt.id]) ? tpts(activeCell.points) : 0;
        if(buzz.decide) html = '<span>⏰ خلص وقت ' + escapeHtml(buzz.winnerName || (wt ? wt.name : "")) + ' — صح ولا غلط؟</span>'
          + '<button type="button" class="bb-ok" data-bb="ok">✅ صح</button>'
          + '<button type="button" class="bb-pen" data-bb="no">❌ غلط</button>'
          + '<button type="button" data-bb="none">⏰ ما جاوب</button>'
          + (REC && (REC.seg || REC.pseg) ? '<button type="button" class="bb-rp" data-bb="rp">🔁 إعادة</button>' : '');
        else
        html = (buzz.winnerName
            ? '<span>⚡ أول ضغطة: ' + escapeHtml(buzz.winnerName) + ' (' + escapeHtml(wt ? wt.name : "") + ')</span>'
            : '<span>⚡ ' + escapeHtml(wt ? wt.name : "") + ' ضغط أول!</span>')
          + (buzz.endAt ? '<span class="bb-timer' + (tl <= 3 ? ' warn' : '') + '" id="bbTimer">⏱️ ' + tl + '</span>' : '')
          + '<button type="button" class="bb-ok" data-bb="ok">✅ صح</button>'
          + (bbX2 ? '<button type="button" class="bb-pen" data-bb="reopen">❌ غلط — ×2 تنخصم ' + penWord(bbX2) + '</button>'   /* (v11) ×2: الغلط = نقاط السؤال */
            : '<button type="button" data-bb="reopen">❌ غلط — افتح للباقين</button>'
            + (cfgPlay().buzz_pen_wrong ? '<button type="button" class="bb-pen" data-bb="reopen-pen">➖ غلط وخصم ' + penWord(cfgPlay().buzz_pen_wrong) + '</button>' : ''))
          + '<button type="button" data-bb="idle">🔒 قفل</button>';
      } else if(buzz.state === "armed"){
        bar.classList.add("armed");
        var tuB = buzzLastTimeout() ? '<button type="button" class="bb-tu" data-bb="tu">⚖️ خصم / زيادة</button>' : '';
        if(buzz.only && buzz.onlyEnd){
          var onT = store.teams.filter(function(t){ return buzz.only.indexOf(t.id) !== -1; }), wl = buzzWindowLeft();
          html = '<span class="bb-dot"></span><span>⏳ الفرصة لـ ' + escapeHtml(onT.length === 1 ? onT[0].name : "الفرق الثانية") + ' — بعدها للكل</span>'
            + '<span class="bb-timer' + (wl <= 3 ? ' warn' : '') + '" id="bbWin">⏳ ' + wl + '</span>'
            + '<button type="button" data-bb="all">🔓 افتح للكل الحين</button>' + tuB
            + '<button type="button" data-bb="idle">🔒 قفل</button>';
        } else
        html = '<span class="bb-dot"></span><span>الأزرار مفتوحة' + (buzz.log.length ? (buzz.excluded.length ? " للباقين" : " للكل") : "") + ' — مين أسرع؟</span>' + conn + tuB
          + '<button type="button" data-bb="idle">🔒 قفل</button>';
      } else if(curView === "million" && mlActive()){
        html = '<span class="bb-dot"></span><span>📱 الجوالات تتابع طريق المليون</span>' + conn;
      } else {
        html = '<span class="bb-dot"></span><span>📱 الأزرار جاهزة</span>' + conn
          + '<button type="button" data-bb="arm">🔓 افتح الأزرار</button>';
      }
      bar.innerHTML = html + '<button type="button" data-bb="panel" aria-label="إعدادات الأزرار">⚙️</button>';
      document.body.style.setProperty("--bb-h", (bar.offsetHeight + 16) + "px");
    }
    renderBuzzLog();
    markBuzzButtons();
    if(!buzzEls.panel.hidden) renderBuzzPanel();
    renderHeadsStatus();
    bzClockRender();
  }
  buzzEls.bar.addEventListener("click", function(e){
    var b = e.target.closest("[data-bb]"); if(!b) return;
    var a = b.getAttribute("data-bb");
    buzzUnlockAudio();
    if(a === "rp"){ if(REC.play) { recStop(); recRenderUI(); } else recPlay(1); }
    else if(a === "ok") buzzCorrect();
    else if(a === "no") buzzDecideWrong();
    else if(a === "none"){ if(buzz.decide && buzz.state === "locked") buzzTimeoutGo(); }
    else if(a === "reopen") buzzWrong(false);
    else if(a === "reopen-pen") buzzWrong(true);
    else if(a === "idle") buzzIdle(true);
    else if(a === "tu") tuOpen(true);
    else if(a === "all") buzzOpenAll();
    else if(a === "arm") buzzArm(buzz.qid, true, buzz.q);
    else if(a === "panel") openBuzzPanel();
    else if(a === "retry"){ buzzDisconnect(true); buzzConnect(); }
  });
  function renderBuzzPanel(){
    buzzEls.room.textContent = store.buzz.room || "—";
    document.getElementById("bzRules").innerHTML = buzzRulesHtml();
    buzzEls.auto.checked = store.buzz.auto !== false;
    recPanelRender();
    buzzEls.err.innerHTML = buzz.status === "error"
      ? '<div class="bz-err">⚠️ ما قدرنا نتصل بخدمة الأزرار. تأكد من الإنترنت واضغط «إعادة المحاولة» من الشريط تحت.</div>' : "";
    if(store.teams.length < 2){
      buzzEls.grid.innerHTML = '<p class="bz-intro">أضف فريقين على الأقل من «الفرق والنقاط».</p>';
      return;
    }
    buzzEls.grid.innerHTML = store.teams.map(function(t){
      var names = buzz.presence[t.id] || [], n = names.length, mics = (buzz.pmic || {})[t.id] || [];
      return '<div class="bz-team" style="--c:' + t.color + '">'
        + '<h4>' + escapeHtml(t.name) + '</h4>'
        + '<div class="bz-qr" data-qr="' + t.id + '"></div>'
        + '<div class="bz-status' + (n ? " on" : "") + '">' + (n ? "✅ " + (n > 1 ? n + " متصلين" : "متصل") : "⏳ ما فيه جوال متصل") + '</div>'
        + (n ? '<div class="bz-names">' + names.map(function(x, i){ return '<span>' + escapeHtml(x) + (store.buzz.rec && mics[i] ? ' 🎙️' : '') + '</span>'; }).join("") + '</div>' : '')
        + '<button class="bz-copy" type="button" data-copy="' + t.id + '">نسخ الرابط</button>'
        + '</div>';
    }).join("");
    buzzEls.grid.querySelectorAll("[data-qr]").forEach(function(box){
      var t = teamOf(box.getAttribute("data-qr"));
      if(!t){ box.innerHTML = '<p class="bz-intro">تعذّر إنشاء الباركود</p>'; return; }
      if(!needQR(renderBuzzPanel)){ box.innerHTML = qrWaitHtml(); return; }
      try{
        box.innerHTML = qrSvg(buzzTeamUrl(t), 4, 2);
      }catch(e){ box.innerHTML = '<p class="bz-intro">تعذّر إنشاء الباركود</p>'; }
    });
    buzzEls.grid.querySelectorAll("[data-copy]").forEach(function(b){
      b.addEventListener("click", function(){
        var t = teamOf(b.getAttribute("data-copy"));
        if(!t) return;
        copyLink(buzzTeamUrl(t), "انسخ رابط " + t.name + " ✅");
      });
    });
  }
  function openBuzzPanel(){
    buzzUnlockAudio();
    if(!store.buzz.enabled || !buzzActive()) buzzConnect();
    buzzEls.panel.hidden = false;
    renderBuzzPanel();
  }
  function closeBuzzPanel(){ buzzEls.panel.hidden = true; }
  buzzEls.openBtn.addEventListener("click", openBuzzPanel);
  buzzEls.homeBtn.addEventListener("click", openBuzzPanel);
  buzzEls.close.addEventListener("click", closeBuzzPanel);
  buzzEls.panel.addEventListener("click", function(e){ if(e.target === buzzEls.panel) closeBuzzPanel(); });
  buzzEls.auto.addEventListener("change", function(){ store.buzz.auto = buzzEls.auto.checked; persist(); });
  buzzEls.test.addEventListener("click", function(){ buzzUnlockAudio(); buzzArm("test:" + Date.now(), true); closeBuzzPanel(); toast("الأزرار مفتوحة — جرّبوا تضغطون 📱"); });
  buzzEls.newRoom.addEventListener("click", function(){
    buzzDisconnect(true);
    store.buzz.room = buzzRoomGen(); persist();
    buzzConnect(); renderBuzzPanel();
    toast("باركود جديد — خلّوا الفرق يمسحونه من جديد");
  });
  buzzEls.off.addEventListener("click", function(){ buzzDisconnect(false); closeBuzzPanel(); toast("انطفت الأزرار"); });
  function teamsChanged(){
    clearTimeout(buzz.sendT);
    buzz.sendT = setTimeout(function(){ buzzSend(); renderBuzzUI(); }, 300);
    if(!document.getElementById("view-letters").hidden){ if(lettersActive()) lettersRender(); else lettersOpen(); }
    if(FL.cur && !flEls.award.hidden) renderFlagAward();
    if(headsVisible()){ renderHeadsGrid(); renderHeadsLive(); }
    renderTrivHelpsBar(); if(activeCell && !trivEls.modal.hidden) renderTrivHelps();
    ["flags", "emoji"].forEach(function(g){ if(mcLive(g)) mcRender(g); });
  }

  /* ======================================================================
     📱 الإجابات بجوال المقدّم (v10) — سين جيم، الحروف، تحدي الصور، طريق المليون
     أول ما تبدأ الجولة يطلع باركود: المقدّم يمسحه بجواله وتطلع له إجابات الجولة كلها،
     وجواب السؤال اللي على الشاشة الحين يطلع كبير فوق (الشاشة ترسله على قناة سرية).
     أول جوال يفتح الرابط «يحجز» الإجابات، وأي جوال ثاني يطلع له «مفتوحة بجوال ثاني».
     store.ans[g] = { round, key (سر الباركود), chan (القناة الحية — تجي بعد ما يحجز الجوال) }
     ====================================================================== */
  var ANS_GAMES = ["trivia", "emoji", "letters", "million"];
  var ANS = { g:null, pollT:null, tickT:null, keyAt:{}, polled:{}, busy:{}, kbusy:{}, ch:{}, chOn:{}, last:{}, lastAt:{}, closeT:null, err:{} };
  var ansEls = { modal: document.getElementById("ansModal"), sub: document.getElementById("ansSub"), qr: document.getElementById("ansQr"), st: document.getElementById("ansSt"),
                 go: document.getElementById("ansGo"), nw: document.getElementById("ansNew"), copy: document.getElementById("ansCopy"), auto: document.getElementById("ansAuto"),
                 close: document.getElementById("ansClose") };
  function ansRoundOf(g){
    var r = g === "trivia" ? store.trivia.round : g === "emoji" ? store.emoji.round : g === "letters" ? store.letters.round : g === "million" ? store.million.round : null;
    return r && !r.done && r.id != null ? r.id : null;
  }
  function ansUrl(e){ return location.origin + location.pathname.replace(/[^\/]*$/, "") + "answers.html#r=" + encodeURIComponent(e.round) + "&k=" + e.key; }
  /* بداية جولة: باركود جديد (ويطلع لحاله لو الخيار شغّال) */
  function ansStart(g, rid){
    if(ANS_GAMES.indexOf(g) === -1 || rid == null) return;
    ansLeave(g);
    store.ans[g] = { round: rid, key: "", chan: "" }; persist();
    if(store.ans.auto !== false) ansShow(g);
  }
  function ansLeave(g){
    var ch = ANS.ch[g]; ANS.ch[g] = null; ANS.chOn[g] = false; ANS.last[g] = "";
    if(ch && sharedSb){ try{ sharedSb.removeChannel(ch); }catch(e){} }
  }
  function ansShow(g){
    var rid = ansRoundOf(g);
    if(rid == null){ toast("ابدأ جولة أول — الباركود يطلع مع الجولة"); return; }
    var e = store.ans[g];
    if(!e || String(e.round) !== String(rid)){ ansLeave(g); e = store.ans[g] = { round: rid, key: "", chan: "" }; persist(); }
    ANS.g = g; ANS.err[g] = "";
    clearTimeout(ANS.closeT);
    ansEls.auto.checked = store.ans.auto !== false;
    ansEls.modal.hidden = false;
    ansRender();
    if(!e.key) ansNewKey(g);
    else if(!e.chan){ ANS.keyAt[g] = Date.now(); ansPollStart(); }
    setTimeout(function(){ if(!ansEls.modal.hidden) try{ ansEls.go.focus({ preventScroll: true }); }catch(x){} }, 30);
  }
  function ansHide(){ clearTimeout(ANS.closeT); if(ANS.g) ANS.keyAt[ANS.g] = Date.now(); if(!ansEls.modal.hidden) ansEls.modal.hidden = true; ANS.g = null; }
  function ansRender(){
    var g = ANS.g; if(!g || ansEls.modal.hidden) return;
    var e = store.ans[g], claimed = !!(e && e.chan), err = ANS.err[g];
    ansEls.sub.textContent = "امسح الباركود بكاميرا جوالك — تطلع لك إجابات «" + GAME_INFO[g].name + "» كلها، وجواب السؤال اللي على الشاشة يطلع فوق أول بأول.";
    ansEls.qr.classList.toggle("done", claimed && !err);
    if(err){
      ansEls.qr.innerHTML = '<p class="ans-wait">' + escapeHtml(err) + '</p>'; ansEls.qr._u = "";
      ansEls.st.className = "ans-st"; ansEls.st.textContent = "";
    } else if(!e || !e.key){
      ansEls.qr.innerHTML = '<p class="ans-wait">جاري تجهيز الباركود…</p>'; ansEls.qr._u = "";
      ansEls.st.className = "ans-st"; ansEls.st.textContent = "";
    } else {
      if(!needQR(ansRender)){ ansEls.qr.innerHTML = '<p class="ans-wait">' + (qrState === 3 ? "تعذّر تحميل الباركود — تأكد من الإنترنت" : "جاري تجهيز الباركود…") + '</p>'; ansEls.qr._u = ""; }
      else {
        var url = ansUrl(e);
        if(ansEls.qr._u !== url || !ansEls.qr.querySelector("svg")){
          try{ ansEls.qr.innerHTML = qrSvg(url, 5, 2); ansEls.qr._u = url; }
          catch(x){ ansEls.qr.innerHTML = '<p class="ans-wait">تعذّر إنشاء الباركود</p>'; ansEls.qr._u = ""; }
        }
        var okEl = ansEls.qr.querySelector(".ans-ok"); if(okEl) okEl.parentNode.removeChild(okEl);
        if(claimed) ansEls.qr.insertAdjacentHTML("beforeend", '<div class="ans-ok"><b>✅</b>انفتحت بجوالك</div>');
      }
      ansEls.st.className = "ans-st" + (claimed ? " ok" : "");
      ansEls.st.textContent = claimed ? "✅ الإجابات مفتوحة بجوالك — وتتابع الشاشة لحالها" : "⏳ ننتظر جوالك يمسح الباركود…";
    }
    ansEls.go.textContent = claimed ? "تمام 👍" : "▶ يلا نبدأ";
    ansEls.copy.hidden = !(e && e.key) || claimed || !!err;
  }
  function ansErrText(err){
    var m = String((err && (err.message || err.details || err.code)) || err || "");
    if(/round_answer|PGRST202|schema cache|does not exist|Could not find/i.test(m)) return "🛠️ الميزة تحتاج تحديث قاعدة البيانات — شغّل ملف SQL الجديد (answers_qr.sql) بـ Supabase.";
    if(/bad_round/.test(m)) return "⌛ الجولة هذي قديمة (أكثر من 12 ساعة) — ابدأ جولة جديدة.";
    if(/login_required|JWT|permission denied/i.test(m)) return "سجّل دخولك أول.";
    return "📡 ما قدرنا نجهّز الباركود — تأكد من الإنترنت واضغط «🔄 باركود جديد».";
  }
  function ansNewKey(g){
    var e = store.ans[g]; if(!e || ANS.kbusy[g]) return;
    ANS.kbusy[g] = true; ANS.err[g] = "";
    ansLeave(g);
    e.key = ""; e.chan = ""; persist(); ansRender();
    sbReady.then(function(sb){ return sb.rpc("round_answer_key", { p_round: e.round }); }).then(function(r){
      ANS.kbusy[g] = false;
      if(r.error) throw r.error;
      var d = parseJ(r.data);
      if(!d || !/^[0-9a-f]{40,128}$/.test(d.key || "")) throw new Error("bad_key");
      if(store.ans[g] !== e) return;              /* بدأت جولة ثانية بالوقت هذا */
      e.key = d.key; e.chan = ""; persist();
      ANS.keyAt[g] = Date.now(); ANS.polled[g] = 0;
      ansRender(); ansPollStart();
    }).catch(function(err){
      ANS.kbusy[g] = false;
      if(store.ans[g] !== e) return;
      ANS.err[g] = ansErrText(err);
      ansRender();
    });
  }
  /* ننتظر الجوال يحجز: نسأل كل ثانيتين والنافذة مفتوحة، وكل 6 ثواني وهي مسكّرة (لين 10 دقايق — وترجع لما تفتح الباركود) */
  function ansPollStart(){ if(!ANS.pollT) ANS.pollT = setInterval(ansPollAll, 1000); ansPollAll(); }
  function ansPollAll(){
    var now = Date.now(), any = false;
    ANS_GAMES.forEach(function(g){
      var e = store.ans[g];
      if(!e || !e.key || e.chan || String(ansRoundOf(g)) !== String(e.round)) return;
      if(!ANS.keyAt[g]) ANS.keyAt[g] = now;
      if(!(ANS.g === g && !ansEls.modal.hidden) && now - ANS.keyAt[g] > 10 * 60 * 1000) return;
      any = true;
      var every = (ANS.g === g && !ansEls.modal.hidden) ? 2000 : 6000;
      if(ANS.busy[g] || now - (ANS.polled[g] || 0) < every - 50) return;
      ANS.busy[g] = true; ANS.polled[g] = now;
      sbReady.then(function(sb){ return sb.rpc("round_answer_status", { p_round: e.round }); }).then(function(r){
        ANS.busy[g] = false;
        if(r.error || store.ans[g] !== e || e.chan) return;
        var d = parseJ(r.data);
        if(d && d.claimed && /^[0-9a-f]{32}$/.test(d.chan || "")){ e.chan = d.chan; persist(); ansJoin(g); ansClaimed(g); }
      }, function(){ ANS.busy[g] = false; });
    });
    if(!any){ clearInterval(ANS.pollT); ANS.pollT = null; }
  }
  function ansClaimed(g){
    toast("📱 الإجابات انفتحت بجوالك ✅");
    if(ANS.g === g && !ansEls.modal.hidden){
      ansRender();
      clearTimeout(ANS.closeT); ANS.closeT = setTimeout(function(){ if(ANS.g === g) ansHide(); }, 1400);
    }
  }
  /* القناة السرية مع الجوال: نرسل «السؤال الحين» كل ما تغيّر + نبضة كل 5 ثواني */
  function ansJoin(g){
    var e = store.ans[g]; if(!e || !e.chan) return;
    if(ANS.ch[g] && ANS.ch[g].__ans === e.chan) return;
    ansLeave(g);
    sbReady.then(function(sb){
      if(!sb || store.ans[g] !== e || !e.chan || ANS.ch[g]) return;
      var ch = sb.channel("sahra-ans-" + e.chan, { config: { broadcast: { self:false } } });
      ch.__ans = e.chan;
      ch.on("broadcast", { event:"hi" }, function(){ if(ANS.ch[g] === ch) ansSend(g, true); });
      ch.subscribe(function(st){
        if(ANS.ch[g] !== ch) return;
        ANS.chOn[g] = st === "SUBSCRIBED";
        if(ANS.chOn[g]) ansSend(g, true);
      });
      ANS.ch[g] = ch;
      if(!ANS.tickT) ANS.tickT = setInterval(ansTick, 600);
    });
  }
  function ansTick(){
    var any = false;
    ANS_GAMES.forEach(function(g){ if(ANS.ch[g]){ any = true; ansSend(g, false); } });
    if(!any){ clearInterval(ANS.tickT); ANS.tickT = null; }
  }
  function ansSend(g, force){
    var ch = ANS.ch[g], e = store.ans[g];
    if(!ch || !ANS.chOn[g] || !e) return;
    var live = String(ansRoundOf(g)) === String(e.round);
    var body = { r: e.round, g: g, cur: live ? ansCurOf(g) : null, done: live ? ansDoneOf(g) : [], tp: cfgPlay().trivia_pts };
    if(live && g === "trivia"){   /* (v11) 🔄 الأسئلة اللي تبدّلت: الجوال يحدّث قائمته */
      var sw = (store.trivia.cells || []).filter(function(c){ return Array.isArray(c.prev) && c.prev.length; })
        .map(function(c){ return { o: c.prev, id: c.id, cat: c.cat, points: c.points, q: c.q, a: c.a }; });
      if(sw.length) body.sw = sw;
    }
    var key = JSON.stringify(body), now = Date.now();
    if(!force && key === ANS.last[g] && now - (ANS.lastAt[g] || 0) < 5000) return;
    ANS.last[g] = key; ANS.lastAt[g] = now;
    body.t = now;
    try{ var p = ch.send({ type:"broadcast", event:"cur", payload: body }); if(p && p.catch) p.catch(function(){}); }catch(x){}
  }
  /* السؤال اللي على الشاشة الحين (بجوابه) */
  function ansCurOf(g){
    try{
      if(g === "trivia"){
        if(!activeCell || trivEls.modal.hidden) return null;
        return { id: activeCell.id, q: activeCell.q, a: activeCell.a, m: { cat: activeCell.cat, pts: tpts(activeCell.points) } };
      }
      if(g === "emoji"){
        if(curView !== "emoji" || !emojiActive()) return null;
        var it = store.emoji.items[store.emoji.idx];
        return it ? { id: it.id, q: "", a: it.a, m: { cat: it.cat || "", h: it.h || "", n: store.emoji.idx + 1 } } : null;
      }
      if(g === "letters"){
        if(!LT.cur || ltEls.modal.hidden) return null;
        var qs = store.letters.qmap[LT.cur.letter], q = qs && qs[LT.cur.qi];
        return q ? { id: q.id, q: q.q, a: q.a, m: { letter: LT.cur.letter } } : null;
      }
      if(g === "million"){
        var M = store.million;
        if(curView !== "million" || !mlActive()) return null;
        if(M.mode === "seat"){
          if(!M.q || ["q", "confirm", "lock", "right", "wrong"].indexOf(M.phase) === -1) return null;
          var a = M.items[M.q.i];
          return a ? { id: a.id, q: a.q, a: a.a, m: { lv: a.lv, step: mlQn(), n: M.n } } : null;
        }
        if(!M.aq || ["open", "locked", "reveal"].indexOf(M.phase) === -1) return null;
        var b = M.items[M.qi];
        return b ? { id: b.id, q: b.q, a: b.a, m: { lv: b.lv, step: M.qi + 1, n: M.n } } : null;
      }
    }catch(x){}
    return null;
  }
  /* الأسئلة اللي خلصت (تنعلّم ✓ بالجوال) */
  function ansDoneOf(g){
    try{
      if(g === "trivia") return store.trivia.cells.filter(function(c){ return c.used; }).map(function(c){ return c.id; });
      if(g === "emoji") return store.emoji.items.slice(0, store.emoji.idx).map(function(x){ return x.id; });
      if(g === "letters"){
        var L = store.letters, out = [];
        Object.keys(L.qpos || {}).forEach(function(l){ var qs = L.qmap[l] || [], n = Math.min(qs.length, L.qpos[l] | 0); for(var i = 0; i < n; i++) if(qs[i]) out.push(qs[i].id); });
        return out;
      }
      if(g === "million"){
        var M = store.million, done = [];
        if(M.mode === "all") return M.items.slice(0, M.qi || 0).map(function(x){ return x.id; });
        (M.order || []).forEach(function(tid, k){
          var lad = (M.ladders || {})[tid] || [], r = M.res && M.res[tid];
          var upto = k < M.ti ? (r ? r.reached + (r.out === "wrong" ? 1 : 0) : 0) : k === M.ti ? (M.step | 0) : 0;
          lad.slice(0, Math.min(lad.length, upto)).forEach(function(i){ if(M.items[i]) done.push(M.items[i].id); });
        });
        return done;
      }
    }catch(x){}
    return [];
  }
  /* بعد تحديث الصفحة: نرجع للقناة (أو نكمّل ننتظر الجوال) */
  function ansInit(){
    ANS_GAMES.forEach(function(g){
      var e = store.ans[g];
      if(!e || String(ansRoundOf(g)) !== String(e.round)) return;
      if(e.chan) ansJoin(g);
      else if(e.key){ ANS.keyAt[g] = Date.now(); ansPollStart(); }
    });
  }
  ansEls.go.addEventListener("click", ansHide);
  ansEls.close.addEventListener("click", ansHide);
  ansEls.modal.addEventListener("click", function(ev){ if(ev.target === ansEls.modal) ansHide(); });
  ansEls.auto.addEventListener("change", function(){ store.ans.auto = ansEls.auto.checked; persist(); });
  ansEls.nw.addEventListener("click", function(){
    var g = ANS.g; if(!g) return;
    var e = store.ans[g];
    if(e && e.chan){
      ansEls.modal.hidden = true;
      ask("باركود جديد؟", "الجوال اللي فاتح الإجابات الحين بيوقف، ولازم تمسح الباركود الجديد.", "🔄 إيه، باركود جديد").then(function(ok){
        if(ANS.g !== g) return;
        ansEls.modal.hidden = false;
        if(ok) ansNewKey(g); else ansRender();
      });
    } else ansNewKey(g);
  });
  ansEls.copy.addEventListener("click", function(){
    var e = ANS.g && store.ans[ANS.g]; if(!e || !e.key) return;
    copyLink(ansUrl(e), "انسخ الرابط ✅ — افتحه بجوالك");
  });
  document.addEventListener("click", function(ev){
    var b = ev.target && ev.target.closest ? ev.target.closest("[data-ans]") : null; if(!b) return;
    ansShow(b.getAttribute("data-ans"));
  });

  /* ======================================================================
     لعبة الحروف — لوحة سداسية 5×5 (صفوف متداخلة). الفريق الأول يوصّل
     فوق↔تحت، والثاني يمين↔يسار. الجولة = لوحة كاملة (من السيرفر)
     ====================================================================== */
  var LT = { cur:null };
  var AR_ALPHA = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
  /* التجربة: لوحة 5×5 — أول 10 حروف على شكل صليب (عمود الوسط + صف الوسط) عشان الفوز يكون ممكن، والباقي حوله */
  var LT_TRIAL_ORDER = [2, 7, 8, 10, 11, 12, 13, 14, 17, 22, 6, 16, 18, 1, 3, 9, 15, 19, 21, 23, 5, 0, 4, 20, 24];
  function ltN(){ var n = Math.round(Math.sqrt(store.letters.board.length)); return n >= 3 ? n : 5; }
  var ltEls = {
    legend: document.getElementById("ltLegend"),
    note: document.getElementById("ltNote"),
    frame: document.getElementById("ltFrame"),
    newBtn: document.getElementById("ltNewBtn"),
    undo: document.getElementById("ltUndoBtn"),
    modal: document.getElementById("ltModal"),
    mLetter: document.getElementById("ltmLetter"),
    mQuestion: document.getElementById("ltmQuestion"),
    mHint: document.getElementById("ltmHint"),
    mHintBtn: document.getElementById("ltmHintBtn"),
    mAnswer: document.getElementById("ltmAnswer"),
    mReveal: document.getElementById("ltmRevealBtn"),
    mOther: document.getElementById("ltmOtherBtn"),
    mTeams: document.getElementById("ltmTeamBtns"),
    mNone: document.getElementById("ltmNoneBtn"),
    win: document.getElementById("ltWinModal"),
    winTitle: document.getElementById("ltWinTitle"),
    winSub: document.getElementById("ltWinSub"),
    winNew: document.getElementById("ltWinNewBtn"),
    winClose: document.getElementById("ltWinCloseBtn")
  };
  function ltTeams(){ return [store.teams[0] || null, store.teams[1] || null]; }
  function lettersActive(){ return !!store.letters.round && !store.letters.round.done && [16, 25, 36].indexOf(store.letters.board.length) !== -1; }
  function lettersOpen(){
    if(lettersActive()){ setGated("letters", false); renderRoundTag("letters", store.letters.round); lettersRender(); }
    else lettersGate(!!store.letters.round);
  }
  function lettersGate(done){
    var t = ltTeams();
    renderGate("letters", {
      done: done,
      extra: (!t[0] || !t[1]) ? '<p class="rg-note" style="margin:0">لعبة الحروف تحتاج فريقين — أضفهم من «👥 الفرق والنقاط».</p>' : "",
      begin: function(trial){
        return startRound("letters", trial).then(function(d){
          var L = store.letters, board = [], qmap = {};
          /* الحرف المكرر (باللوحات الكبيرة) أسئلته تنجمع بقائمة وحدة */
          d.items.forEach(function(it){ if(it && it.l && Array.isArray(it.qs) && it.qs.length) qmap[it.l] = (qmap[it.l] || []).concat(it.qs); });
          var letters = d.items.map(function(it){ return it && it.l; }).filter(function(l){ return l && qmap[l]; });
          if(d.kind !== "trial" && [16, 25, 36].indexOf(letters.length) !== -1) board = letters;
          else {
            for(var i=0;i<25;i++) board.push("");
            letters.slice(0, 25).forEach(function(l, k){ board[LT_TRIAL_ORDER[k]] = l; });
          }
          L.round = { id: d.round, kind: d.kind };
          L.board = board; L.qmap = qmap; L.qpos = {};
          L.owners = {}; L.history = []; L.lastWin = null;
          persist(); lettersOpen();
          ansStart("letters", d.round);
        });
      }
    });
  }
  function ltNeighbors(i){
    var N = ltN(), r = Math.floor(i / N), c = i % N, out = [];
    /* الصفوف الفردية مزاحة نص خلية لليمين (بصريًا) */
    var d = (r % 2 === 0) ? [[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]] : [[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]];
    d.forEach(function(v){
      var rr = r + v[0], cc = c + v[1];
      if(rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc);
    });
    return out;
  }
  function ltPath(teamId, vertical){
    var N = ltN(), own = store.letters.owners, prev = {}, q = [];
    for(var k=0;k<N;k++){
      var s0 = vertical ? k : k * N;
      if(own[s0] === teamId){ prev[s0] = -1; q.push(s0); }
    }
    while(q.length){
      var i = q.shift(), r = Math.floor(i / N), c = i % N;
      if((vertical && r === N - 1) || (!vertical && c === N - 1)){
        var path = []; for(var x = i; x !== -1; x = prev[x]) path.push(x); return path;
      }
      ltNeighbors(i).forEach(function(n){
        if(own[n] === teamId && !(n in prev)){ prev[n] = i; q.push(n); }
      });
    }
    return null;
  }
  function lettersWinner(){
    var t = ltTeams(); if(!t[0] || !t[1]) return null;
    var p = ltPath(t[0].id, true); if(p) return { team:t[0], path:p };
    p = ltPath(t[1].id, false); if(p) return { team:t[1], path:p };
    return null;
  }
  function lettersRender(){
    if(!lettersActive()) return;
    var t = ltTeams(), A = t[0], B = t[1];
    if(!A || !B){
      ltEls.legend.innerHTML = "";
      ltEls.note.hidden = true;
      ltEls.frame.innerHTML = '<p class="lt-note">لعبة الحروف تحتاج فريقين — أضفهم من «الفرق والنقاط» 👥</p>';
      ltEls.undo.disabled = true;
      return;
    }
    var wins = store.letters.wins || {};
    ltEls.legend.innerHTML =
        '<span class="lt-chip" style="--c:' + A.color + '"><span class="dot"></span>' + escapeHtml(A.name) + ' <small>↕ من فوق لتحت</small><span class="wins">🏆 ' + (wins[A.id] || 0) + '</span></span>'
      + '<span class="lt-chip" style="--c:' + B.color + '"><span class="dot"></span>' + escapeHtml(B.name) + ' <small>↔ من اليمين لليسار</small><span class="wins">🏆 ' + (wins[B.id] || 0) + '</span></span>';
    var trial = store.letters.board.some(function(l){ return !l; }), N = ltN();
    var openN = store.letters.board.filter(function(l){ return l; }).length;
    ltEls.note.hidden = store.teams.length <= 2 && !trial;
    ltEls.note.textContent = trial ? "🎁 التجربة: " + arN(openN, "حرف واحد", "حرفين", "حروف", "حرف") + " بس — الخلايا المقفلة 🔒 تنفتح بالجولات الكاملة."
      : "لعبة الحروف لفريقين — تلعبها أول فريقين بالقائمة.";
    var frame = ltEls.frame;
    frame.style.setProperty("--ta", A.color);
    frame.style.setProperty("--tb", B.color);
    frame.style.setProperty("--n", N);
    var w = lettersWinner(), html = "";
    for(var r=0;r<N;r++){
      html += '<div class="lt-row' + (r % 2 ? ' odd' : '') + '">';
      for(var c=0;c<N;c++){
        var i = r * N + c, letter = store.letters.board[i], owner = store.letters.owners[i];
        if(!letter){ html += '<button type="button" class="lt-hex locked" data-lt="' + i + '" aria-label="مقفلة">🔒</button>'; continue; }
        var team = owner ? teamOf(owner) : null;
        var cls = "lt-hex" + (team ? " owned" : "") + (w && w.path.indexOf(i) !== -1 ? " win" : "");
        html += '<button type="button" class="' + cls + '" data-lt="' + i + '"'
          + (team ? ' style="--own:' + team.color + '"' : '')
          + ((team || w) ? ' disabled' : '') + '>' + escapeHtml(letter) + '</button>';
      }
      html += '</div>';
    }
    frame.innerHTML = html;
    frame.querySelectorAll("[data-lt]").forEach(function(b){
      b.addEventListener("click", function(){ lettersAsk(parseInt(b.getAttribute("data-lt"), 10)); });
    });
    ltEls.undo.disabled = !store.letters.history.length;
  }
  function ltLettersCount(n){
    if(n === 1) return "حرف واحد";
    if(n === 2) return "حرفين";
    return n + (n <= 10 ? " حروف" : " حرف");
  }
  function ltAnswerShape(a){
    var words = a.replace(/[ً-ٰٟ]/g, "").split(/\s+/).filter(Boolean);
    if(words.length === 1) return "🔤 الإجابة كلمة وحدة من " + ltLettersCount(words[0].length);
    return "🔤 الإجابة " + (words.length === 2 ? "كلمتين" : words.length + " كلمات") + ": "
      + words.map(function(w){ return ltLettersCount(w.length); }).join(" + ");
  }
  function lettersAsk(i){
    var letter = store.letters.board[i];
    if(!letter){ toast("🔒 هذي الخلية تنفتح بالجولات الكاملة"); return; }
    var qs = store.letters.qmap[letter];
    if(!qs || !qs.length){ toast("ما فيه أسئلة لهالحرف"); return; }
    var qi = (store.letters.qpos[letter] | 0) % qs.length;
    LT.cur = { idx:i, letter:letter, qi: qi };
    ltRenderModal();
    ltEls.modal.hidden = false;
  }
  function ltRenderModal(){
    var qs = store.letters.qmap[LT.cur.letter], q = qs[LT.cur.qi];
    ltEls.mLetter.textContent = LT.cur.letter;
    ltEls.mQuestion.textContent = q.q;
    ltEls.mHint.hidden = true; ltEls.mHint.textContent = ltAnswerShape(q.a);
    ltEls.mHintBtn.hidden = false;
    ltEls.mAnswer.hidden = true; ltEls.mAnswer.textContent = "الإجابة: " + q.a;
    ltEls.mReveal.hidden = false;
    ltEls.mOther.hidden = qs.length < 2;
    var t = ltTeams();
    ltEls.mTeams.innerHTML = [t[0], t[1]].filter(Boolean).map(function(team){
      return '<button type="button" style="background:' + team.color + '" data-ltaward="' + team.id + '">✔ ' + escapeHtml(team.name) + '</button>';
    }).join("");
    ltEls.mTeams.querySelectorAll("[data-ltaward]").forEach(function(b){
      b.addEventListener("click", function(){ lettersClaim(b.getAttribute("data-ltaward")); });
    });
    buzzArm("lt:" + LT.cur.idx + ":" + LT.cur.qi, false, { k:"letters", letter: LT.cur.letter, text: q.q });
    markBuzzButtons();
    TTS.auto("lt:" + LT.cur.idx + ":" + LT.cur.qi + ":" + q.q.length, ltSpeech());
  }
  function ltClose(){ ltEls.modal.hidden = true; LT.cur = null; buzzIdle(); TTS.stop(true); }
  function ltSpeech(){
    if(!LT.cur) return [];
    var qs = store.letters.qmap[LT.cur.letter], q = qs && qs[LT.cur.qi];
    return q ? ["حرف " + (TTS_LETTERS[LT.cur.letter] || LT.cur.letter) + ".", q.q] : [];
  }
  function lettersEndRound(){
    if(store.letters.round) store.letters.round.done = true;
    persist(); lettersGate(true);
  }
  function lettersClaim(teamId){
    if(!LT.cur) return;
    store.letters.owners[LT.cur.idx] = teamId;
    store.letters.history.push(LT.cur.idx);
    /* السؤال اللي انجاب ما يرجع لو رجع أحد نفس الحرف */
    store.letters.qpos[LT.cur.letter] = LT.cur.qi + 1;
    persist(); ltClose(); lettersRender();
    var w = lettersWinner();
    if(w){
      if(!store.letters.wins) store.letters.wins = {};
      store.letters.wins[w.team.id] = (store.letters.wins[w.team.id] || 0) + 1;
      var wp = cfgPlay().pts.letters;
      w.team.score += wp;
      store.letters.lastWin = { idx: store.letters.history[store.letters.history.length - 1], team: w.team.id, pts: wp };
      persist(); renderTeams(); lettersRender();
      ltEls.winTitle.textContent = "فاز " + w.team.name + " بالجولة!";
      ltEls.winSub.textContent = "وصّلوا بين الضفتين 🎉" + (wp ? " وانضاف لهم " + hdPoints(wp) + "." : "");
      ltEls.win.hidden = false;
      return;
    }
    var open = store.letters.board.filter(function(l, i){ return l && !store.letters.owners[i]; }).length;
    if(!open){ toast("خلصت الحروف بدون فوز — انتهت الجولة"); lettersEndRound(); }
  }
  ltEls.mReveal.addEventListener("click", function(){ ltEls.mAnswer.hidden = false; ltEls.mReveal.hidden = true; });
  ltEls.mHintBtn.addEventListener("click", function(){ ltEls.mHint.hidden = false; ltEls.mHintBtn.hidden = true; });
  ltEls.mOther.addEventListener("click", function(){
    if(!LT.cur) return;
    var qs = store.letters.qmap[LT.cur.letter];
    if(!qs || qs.length < 2){ toast("ما فيه سؤال ثاني لهالحرف بهالجولة"); return; }
    LT.cur.qi = (LT.cur.qi + 1) % qs.length;
    store.letters.qpos[LT.cur.letter] = LT.cur.qi; persist();
    ltRenderModal();
  });
  ltEls.mNone.addEventListener("click", ltClose);
  ltEls.modal.addEventListener("click", function(e){ if(e.target === ltEls.modal) ltClose(); });
  ltEls.newBtn.addEventListener("click", function(){
    var played = store.letters.history.length > 0 && !lettersWinner();
    (played ? endRoundAsk("اللوحة") : Promise.resolve(true)).then(function(ok){ if(ok) lettersEndRound(); });
  });
  ltEls.undo.addEventListener("click", function(){
    var i = store.letters.history.pop();
    if(i === undefined) return;
    delete store.letters.owners[i];
    var lw = store.letters.lastWin;
    if(lw && lw.idx === i){
      /* الخلية اللي رجّعناها هي اللي فوّزت — نلغي الفوز ونقطته */
      if(store.letters.wins[lw.team] > 0) store.letters.wins[lw.team] -= 1;
      var t = teamOf(lw.team);
      if(t) t.score -= (typeof lw.pts === "number" ? lw.pts : 1);
      renderTeams();
    }
    store.letters.lastWin = null;
    persist(); lettersRender(); toast("رجّعنا آخر خلية ↩️");
  });
  ltEls.winNew.addEventListener("click", function(){ ltEls.win.hidden = true; lettersEndRound(); });
  ltEls.winClose.addEventListener("click", function(){ ltEls.win.hidden = true; });

  /* ======================================================================
     حزر العلم — الجولة 10 أعلام مخلوطة (الصور مجمّعة في لوحات games/flags*.jpg)
     ====================================================================== */
  var FL = { cur:null, hintStep:0 };
  var flEls = {
    count: document.getElementById("flCount"),
    stage: document.getElementById("flStage"),
    hint: document.getElementById("flHint"),
    hintBtn: document.getElementById("flHintBtn"),
    answer: document.getElementById("flAnswer"),
    reveal: document.getElementById("flRevealBtn"),
    award: document.getElementById("flAward"),
    next: document.getElementById("flNextBtn")
  };
  var FL_LEVEL_NAMES = { 1:"سهل", 2:"متوسط", 3:"صعب" };
  function flagsActive(){ return !!store.flags.round && !store.flags.round.done && store.flags.idx < store.flags.items.length; }
  function flagsOpen(){
    if(flagsActive()){
      setGated("flags", false); renderRoundTag("flags", store.flags.round);
      var seen = {};   /* نحمّل لوحات الأعلام بالخلفية */
      store.flags.items.forEach(function(f){ if(!seen[f.sp]){ seen[f.sp] = 1; preloadImage(f.sp); } });
      renderFlag();
    } else flagsGate(!!store.flags.round);
  }
  function flagsGate(done){
    renderGate("flags", { done: done, begin: function(trial){
      return startRound("flags", trial).then(function(d){
        store.flags.round = { id: d.round, kind: d.kind };
        store.flags.items = d.items; store.flags.idx = 0;
        store.flags.mq = null; store.flags.ch = null;
        persist(); flagsOpen();
      });
    } });
  }
  function renderFlag(){
    if(!flagsActive()){ if(store.flags.round) store.flags.round.done = true; persist(); buzzIdle(); flagsGate(true); return; }
    var f = store.flags.items[store.flags.idx];
    FL.cur = f; FL.hintStep = 0;
    /* أقصى مقاس: عرض 520 أو ارتفاع 300 (اللي يوصل أول) — ويصغر مع الجوال */
    var maxW = Math.round(Math.min(520, 300 * f.w / f.h));
    var px = f.sw > f.w ? (f.x / (f.sw - f.w) * 100) : 0, py = f.sh > f.h ? (f.y / (f.sh - f.h) * 100) : 0;
    flEls.stage.innerHTML = '<div class="fl-flag" role="img" aria-label="علم دولة" style="width:min(100%,' + maxW + 'px);aspect-ratio:' + f.w + '/' + f.h + ';'
      + "background-image:url('" + f.sp + "');"
      + 'background-size:' + (f.sw / f.w * 100).toFixed(3) + '% ' + (f.sh / f.h * 100).toFixed(3) + '%;'
      + 'background-position:' + px.toFixed(3) + '% ' + py.toFixed(3) + '%"></div>';
    flEls.count.textContent = "علم " + (store.flags.idx + 1) + " من " + store.flags.items.length + (FL_LEVEL_NAMES[f.l] ? " · " + FL_LEVEL_NAMES[f.l] : "");
    flEls.hint.hidden = true; flEls.hint.textContent = "";
    flEls.hintBtn.hidden = false; flEls.hintBtn.textContent = "تلميح 💡";
    flEls.answer.hidden = true; flEls.answer.textContent = "الإجابة: " + f.n;
    flEls.reveal.hidden = false;
    flEls.award.hidden = true;
    flEls.next.textContent = store.flags.idx + 1 >= store.flags.items.length ? "إنهاء 🏁" : "التالي ⏭️";
    if(!document.getElementById("view-flags").hidden){
      if(store.mcOn.flags) mcShow("flags");
      else buzzArm("fl:" + f.c + ":" + store.flags.idx, false, { k:"flags", flag: { sp:f.sp, x:f.x, y:f.y, w:f.w, h:f.h, sw:f.sw, sh:f.sh } });
    }
    mcRender("flags");
  }
  function renderFlagAward(){
    flEls.award.innerHTML = teamAwardButtonsHtml("flaward", cfgPlay().pts.flags)
      + '<button class="btn-ghost" type="button" data-flskip="1" style="margin-top:8px;width:100%">محد عرف</button>';
    flEls.award.querySelectorAll("[data-flaward]").forEach(function(b){
      b.addEventListener("click", function(){
        var t = teamOf(b.getAttribute("data-flaward"));
        if(t){ t.score += cfgPlay().pts.flags; persist(); renderTeams(); }
        nextFlag();
      });
    });
    flEls.award.querySelector("[data-flskip]").addEventListener("click", nextFlag);
    markBuzzButtons();
  }
  function nextFlag(){ if(!flagsActive()) return; store.flags.idx += 1; persist(); renderFlag(); }

  /* ======================================================================
     (v11) 📱 الإجابة من الجوال — حزر العلم وتحدي الصور
     كل فريق يختار الجواب من جواله (4 خيارات) قبل ما يخلص الوقت، والتصحيح لحاله:
     الصح ياخذ نقاط اللعبة، وأسرع فريق صح ياخذ بونص (لو جاوب فريقين أو أكثر من الجوال).
     الخيارات الغلط من السيرفر (round_choices) — ولو قاعدة البيانات ما تحدّثت، من نفس الجولة.
     ====================================================================== */
  var MC = { tick:null, lastTick:-1, busy:{} };
  function mcActive(g){ return g === "flags" ? flagsActive() : g === "emoji" ? emojiActive() : false; }
  function mcLive(g){ return !!store.mcOn[g] && mcActive(g) && curView === g; }
  function mcItem(g){ var S = store[g]; return S && Array.isArray(S.items) ? S.items[S.idx] || null : null; }
  function mcAnswer(g, it){ return g === "flags" ? it.n : it.a; }
  function mcKey(g, it){ return g === "flags" ? it.c : it.id; }
  function mcQidNow(g){ var S = store[g]; return S.round ? "mc:" + g + ":" + S.round.id + ":" + S.idx : ""; }
  function mcLoadChoices(g){
    var S = store[g], R = S.round;
    if(!R || (isObj(S.ch) && S.ch.r === R.id)) return Promise.resolve();
    if(MC.busy[g]) return MC.busy[g];
    MC.busy[g] = sbReady.then(function(sb){ return sb.rpc("round_choices", { p_round: R.id }); }).then(function(r){
      if(r.error) throw r.error;
      var d = parseJ(r.data);
      if(!isObj(d)) throw new Error("bad_choices");
      if(store[g].round === R){ S.ch = { r: R.id, m: d }; persist(); }
    }).catch(function(){
      if(store[g].round === R){ S.ch = { r: R.id, m: {}, local: 1 }; persist(); }   /* احتياط: من نفس الجولة */
    }).then(function(){ MC.busy[g] = null; });
    return MC.busy[g];
  }
  function mcWrongFor(g, it){
    var S = store[g], ans = mcAnswer(g, it), out = [];
    var m = isObj(S.ch) && isObj(S.ch.m) ? S.ch.m[mcKey(g, it)] : null;
    (Array.isArray(m) ? m : []).forEach(function(x){ if(typeof x === "string" && x && x !== ans && out.indexOf(x) === -1) out.push(x); });
    if(out.length < 3){
      var same = function(x){ return g === "flags" ? x.k === it.k : x.cat === it.cat; };
      var pool = S.items.filter(function(x){ return x !== it; });
      shuffle(pool.filter(same)).concat(shuffle(pool.filter(function(x){ return !same(x); }))).forEach(function(x){
        var n = mcAnswer(g, x); if(out.length < 3 && n && n !== ans && out.indexOf(n) === -1) out.push(n);
      });
    }
    return out.slice(0, 3);
  }
  /* أول ما يطلع العلم أو اللغز: نجهّز الخيارات ونفتح السؤال للجوالات */
  function mcShow(g){
    var R = store[g].round;
    mcRender(g);
    mcLoadChoices(g).then(function(){
      if(!mcLive(g) || store[g].round !== R) return;
      mcOpen(g); mcRender(g);
    });
  }
  function mcOpen(g){
    var S = store[g], it = mcItem(g), qid = mcQidNow(g);
    if(!it || !qid) return;
    if(!(S.mq && S.mq.qid === qid)){
      var ans = mcAnswer(g, it), opts = shuffle([ans].concat(mcWrongFor(g, it))), now = Date.now();
      S.mq = { qid: qid, opts: opts, c: opts.indexOf(ans), picks: {}, openedAt: now, endsAt: now + cfgPlay().mc.secs * 1000,
               phase: "open", gain: null, fast: null, manual: S.mq ? !!S.mq.manual : !mlPhoneTeams().length };
      MC.lastTick = -1;
      persist();
    }
    if(S.mq.phase === "open") mcStartTick();
    buzzIdle(); buzzSend();
  }
  function mcStartTick(){ if(!MC.tick) MC.tick = setInterval(mcTickFn, 250); }
  function mcTickFn(){
    var live = false;
    ["flags", "emoji"].forEach(function(g){
      var q = store[g].mq;
      if(!q || q.phase !== "open" || !store.mcOn[g] || !mcActive(g)) return;
      live = true;
      var l = mlLeft(q.endsAt);
      if(curView === g){
        mlSetTimer("mcTimer-" + g, l, cfgPlay().mc.secs);
        if(l <= 5 && l > 0 && MC.lastTick !== l){ MC.lastTick = l; mlSound("tick"); }
      }
      if(l <= 0) mcLock(g);
    });
    if(!live){ clearInterval(MC.tick); MC.tick = null; }
  }
  function mcSync(g){ persist(); buzzSend(); if(curView === g) mcRender(g); }
  function mcLock(g){
    var q = store[g].mq;
    if(!q || q.phase !== "open") return;
    q.phase = "locked"; q.endsAt = 0;
    mlSound("lock"); mcSync(g);
  }
  function mcPickSet(g, tid, c, src, name){
    var q = store[g].mq;
    if(!q || (q.phase !== "open" && q.phase !== "locked") || !(c >= 0 && c < q.opts.length)) return false;
    if(src === "phone" && (q.phase !== "open" || q.picks[tid])) return false;
    q.picks[tid] = { c: c, ms: src === "phone" ? Date.now() - q.openedAt : null, src: src, by: name || "" };
    if(q.phase === "open" && mlAllTeams().every(function(t){ return !!q.picks[t.id]; })) mcLock(g);
    return true;
  }
  function onMcPick(p){
    var g = p.qid.indexOf("mc:flags:") === 0 ? "flags" : p.qid.indexOf("mc:emoji:") === 0 ? "emoji" : "";
    if(!g || !mcLive(g)) return;
    var q = store[g].mq, t = teamOf(p.team);
    if(!q || q.qid !== p.qid || !t) return;
    if(mcPickSet(g, t.id, +p.c, "phone", buzzCleanName(p.name))){ mlSound("blip"); mcSync(g); }
  }
  function mcReveal(g){
    var q = store[g].mq;
    if(!q || (q.phase !== "open" && q.phase !== "locked")) return;
    var base = cfgPlay().pts[g], bonus = cfgPlay().mc.bonus, gain = {}, fast = null;
    mlAllTeams().forEach(function(t){
      var p = q.picks[t.id];
      if(p && p.c === q.c){
        gain[t.id] = base;
        if(p.src === "phone" && typeof p.ms === "number" && (!fast || p.ms < fast.ms)) fast = { id: t.id, ms: p.ms, by: p.by };
      }
    });
    /* بونص الأسرع: بس لو فيه منافسة بالجوالات (فريقين أو أكثر جاوبوا من الجوال) */
    var phonePicks = Object.keys(q.picks).filter(function(id){ return q.picks[id].src === "phone"; }).length;
    if(!(fast && bonus > 0 && phonePicks >= 2)) fast = null;
    if(fast) gain[fast.id] += bonus;
    q.gain = gain; q.fast = fast ? fast.id : null; q.phase = "reveal"; q.endsAt = 0;
    Object.keys(gain).forEach(function(id){ var t = teamOf(id); if(t && gain[id]) t.score += gain[id]; });
    if(fast) nightFast(fast.id, fast.by);
    renderTeams();
    mlSound(Object.keys(gain).length ? "right" : "wrong");
    mcSync(g);
  }
  function mcToggle(g){
    store.mcOn[g] = !store.mcOn[g];
    if(!store.mcOn[g]) store[g].mq = null;
    persist();
    if(store.mcOn[g] && !mlPhoneTeams().length) toast("📱 خلّوا كل فريق يمسح باركود «أسرع إصبع» — أو أدخل أجوبتهم بنفسك");
    else if(!store.mcOn[g]) toast("رجعنا للطريقة العادية: أنت تختار مين جاوب صح");
    if(mcActive(g) && curView === g){ if(g === "flags") renderFlag(); else renderEmojiCurrent(); }
    else { mcRender(g); buzzSend(); }
  }
  document.querySelectorAll("[data-mc]").forEach(function(b){
    b.addEventListener("click", function(){ buzzUnlockAudio(); mcToggle(b.getAttribute("data-mc")); });
  });
  function mcEls(g){
    return g === "flags" ? { box: document.getElementById("flMc"), reveal: flEls.reveal, award: flEls.award, answer: flEls.answer }
                         : { box: document.getElementById("emojiMc"), reveal: emojiEls.revealBtn, award: emojiEls.award, answer: emojiEls.answer };
  }
  function mcRender(g){
    var E = mcEls(g), S = store[g], on = !!store.mcOn[g];
    document.querySelectorAll('[data-mc="' + g + '"]').forEach(function(b){
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = on ? "📱 الجوالات: شغّالة" : "📱 الإجابة من الجوال";
    });
    if(!on || !mcActive(g)){ if(!E.box.hidden){ E.box.hidden = true; E.box.innerHTML = ""; } return; }
    var q = S.mq, rev = !!q && q.phase === "reveal";
    E.reveal.hidden = true; E.award.hidden = true;
    if(g === "emoji") emojiState.awarding = false;
    E.answer.hidden = !rev;
    E.box.hidden = false;
    if(!q || q.qid !== mcQidNow(g)){ E.box.innerHTML = '<div class="ml-bar"><span class="msg ml-dots">نجهّز الخيارات</span></div>'; return; }
    var opts = allOptsHtml(q, rev), chips = allChipsHtml(q, rev), manual = !rev && q.manual ? allManualHtml(q, "data-mcman") : "";
    var last = S.idx + 1 >= S.items.length, bar;
    if(rev){
      var any = Object.keys(q.gain || {}).length;
      bar = '<div class="ml-bar ' + (any ? "ok" : "no") + '"><span class="msg">' + (any ? "✅ الجواب «" : "❌ محد جاوب صح — الجواب «") + escapeHtml(q.opts[q.c]) + '»</span>'
        + '<button class="btn-primary" type="button" data-mcact="next">' + (last ? "إنهاء 🏁" : "التالي ⏭️") + '</button></div>';
    } else {
      bar = '<div class="ml-bar">' + (q.phase === "open" ? '<span class="ml-timer" id="mcTimer-' + g + '" style="--p:100"><b>' + mlLeft(q.endsAt) + '</b></span>' : '<span class="msg">انقفلت الأجوبة</span>')
        + '<button class="btn-primary" type="button" data-mcact="reveal">' + icon("i-check") + ' اكشف الجواب</button>'
        + '<button class="btn-ghost" type="button" data-mcact="manual">' + (q.manual ? "إخفاء الإدخال اليدوي" : "✍️ أدخل أجوبة الفرق") + '</button></div>';
    }
    E.box.innerHTML = (rev ? "" : mlPhonesNote(true, 'data-mcact="phones"')) + opts + chips + manual + bar;
    if(q.phase === "open") mlSetTimer("mcTimer-" + g, mlLeft(q.endsAt), cfgPlay().mc.secs);
  }
  ["flags", "emoji"].forEach(function(g){
    mcEls(g).box.addEventListener("click", function(e){
      var b = e.target.closest("[data-mcact],[data-mcman]"); if(!b || b.disabled) return;
      buzzUnlockAudio();
      var q = store[g].mq;
      if(b.hasAttribute("data-mcman")){ if(mcPickSet(g, b.getAttribute("data-mcman"), +b.getAttribute("data-k"), "host", "")) mcSync(g); return; }
      var a = b.getAttribute("data-mcact");
      if(a === "reveal") mcReveal(g);
      else if(a === "manual"){ if(q){ q.manual = !q.manual; mcSync(g); } }
      else if(a === "next"){ if(g === "flags") nextFlag(); else nextEmoji(); }
      else if(a === "phones") openBuzzPanel();
    });
  });
  /* الجوالات: نفس شكل «الكل يجاوب» بطريق المليون (+ صورة العلم أو اللغز) */
  function mcPhone(){
    var g = curView;
    if((g !== "flags" && g !== "emoji") || !mcLive(g)) return null;
    var S = store[g], q = S.mq, it = mcItem(g), base = { v: 1, mode: "all", g: g, total: S.items.length };
    if(!q || !it || q.qid !== mcQidNow(g)) return Object.assign(base, { phase: "wait" });
    var picks = {};
    Object.keys(q.picks).forEach(function(id){ picks[id] = q.picks[id].c; });
    return Object.assign(base, {
      qid: q.qid, n: S.idx + 1, text: g === "flags" ? "علم أي دولة؟" : "وش اللغز؟", pts: cfgPlay().pts[g],
      img: g === "flags" ? { flag: { sp:it.sp, x:it.x, y:it.y, w:it.w, h:it.h, sw:it.sw, sh:it.sh } } : { parts: it.parts || [] },
      opts: q.opts, phase: q.phase === "reveal" ? "reveal" : q.phase === "open" ? "pick" : "lock",
      left: q.phase === "open" ? mlLeft(q.endsAt) : 0,
      picked: Object.keys(q.picks),
      reveal: q.phase === "reveal" ? { c: q.c, picks: picks, gain: q.gain || {}, fast: q.fast || null } : null
    });
  }
  flEls.hintBtn.addEventListener("click", function(){
    if(!FL.cur) return;
    FL.hintStep += 1;
    var lines = ["🌍 القارة: " + FL.cur.k];
    if(FL.hintStep >= 2 && FL.cur.cap) lines.push("🏛️ العاصمة: " + FL.cur.cap);
    flEls.hint.textContent = lines.join("  ·  ");
    flEls.hint.hidden = false;
    if(FL.hintStep >= 2 || !FL.cur.cap) flEls.hintBtn.hidden = true;
    else flEls.hintBtn.textContent = "تلميح ثاني 💡";
  });
  flEls.reveal.addEventListener("click", function(){
    flEls.answer.hidden = false; flEls.reveal.hidden = true; flEls.hintBtn.hidden = true;
    flEls.award.hidden = false; renderFlagAward();
  });
  flEls.next.addEventListener("click", nextFlag);

  /* ======================================================================
     حطها على راسك — الجولة = 10 كلمات لكل فريق (من السيرفر). اللاعب يلعب
     من جواله (heads.html بالباركود) أو من هذا الجهاز، والشاشة تعرض الوقت
     والكلمات وتضيف نقاط الكلمات الصح للفريق لحالها (نقطة لكل كلمة).
     ====================================================================== */
  var HD = { live:null, timer:null, gridRoom:null };
  var hdEls = { live: document.getElementById("hdLive"), grid: document.getElementById("hdGrid"), err: document.getElementById("hdErr") };
  function headsVisible(){ return !document.getElementById("view-heads").hidden; }
  function headsUrl(t){
    var base = location.origin + location.pathname.replace(/[^\/]*$/, "");
    return base + "heads.html?r=" + encodeURIComponent(store.buzz.room) + "&t=" + encodeURIComponent(t.id);
  }
  function hdInt(v, lo, hi){ v = Math.round(+v); if(!isFinite(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }
  function hdPoints(n){
    if(n === 1) return "نقطة وحدة";
    if(n === 2) return "نقطتين";
    return n + (n >= 3 && n <= 10 ? " نقاط" : " نقطة");
  }
  function rtSend(event, payload){
    if(!buzz.channel || buzz.status !== "on") return;
    try{ var p = buzz.channel.send({ type:"broadcast", event:event, payload:payload }); if(p && p.catch) p.catch(function(){}); }catch(e){}
  }
  function headsActive(){ var R = store.heads.round; return !!R && !R.done && isObj(store.heads.turns); }
  function headsTurnsLeft(){
    return Object.keys(store.heads.turns || {}).filter(function(id){
      var tu = store.heads.turns[id];
      return tu && Array.isArray(tu.words) && tu.words.length && tu.st !== "done" && store.teams.some(function(t){ return t.id === id; });
    }).length;
  }
  function headsOpen(){
    rtConnect();
    applyHeadsResult();
    if(headsActive()){
      setGated("heads", false); renderRoundTag("heads", store.heads.round);
      renderHeadsGrid(); renderHeadsLive(); renderHeadsStatus();
    } else headsGate(!!store.heads.round);
  }
  function headsSummary(){
    var rows = store.teams.map(function(t){
      var tu = store.heads.turns[t.id];
      if(!tu || !tu.words || !tu.words.length) return "";
      return '<li>' + escapeHtml(t.name) + ': ' + (tu.st === "done" ? "✅ " + (tu.c | 0) + " · ⏭️ " + (tu.p | 0) : "ما لعبوا") + '</li>';
    }).join("");
    return rows ? '<div class="rg-sum"><ul class="rm-list">' + rows + '</ul></div>' : "";
  }
  function headsGate(done){
    var decks = [{ id:"all", name:"كل الفئات", icon:"🎲" }].concat((CATALOG && CATALOG.decks) || []);
    if(!decks.some(function(d){ return d.id === store.heads.deck; })) store.heads.deck = "all";
    var chips = decks.map(function(d){
      return '<button type="button" data-hdeck="' + escapeHtml(d.id) + '"' + (store.heads.deck === d.id ? ' class="on"' : '') + '>' + escapeHtml(d.icon || "") + ' ' + escapeHtml(d.name) + '</button>';
    }).join("");
    var durs = HEADS_DURS.map(function(n){
      return '<button type="button" data-hdur="' + n + '"' + (store.heads.dur === n ? ' class="on"' : '') + '>' + (n === 60 ? "دقيقة" : n === 120 ? "دقيقتين" : n + " ثانية") + '</button>';
    }).join("");
    renderGate("heads", {
      done: done,
      summary: done ? headsSummary() : "",
      extra: '<div class="lbl">الفئة (للجولة الكاملة)</div><div class="rg-chips">' + chips + '</div>'
        + '<div class="lbl">وقت كل فريق</div><div class="rg-chips">' + durs + '</div>'
        + (store.teams.length ? "" : '<p class="rg-note">أضف الفرق من «👥 الفرق والنقاط» أول.</p>'),
      bind: function(gate){
        gate.querySelectorAll("[data-hdeck]").forEach(function(b){
          b.addEventListener("click", function(){
            store.heads.deck = b.getAttribute("data-hdeck"); persist();
            gate.querySelectorAll("[data-hdeck]").forEach(function(x){ x.classList.toggle("on", x === b); });
          });
        });
        gate.querySelectorAll("[data-hdur]").forEach(function(b){
          b.addEventListener("click", function(){
            store.heads.dur = +b.getAttribute("data-hdur"); persist();
            gate.querySelectorAll("[data-hdur]").forEach(function(x){ x.classList.toggle("on", x === b); });
          });
        });
      },
      begin: function(trial){
        var teams = store.teams.slice(0, 6);
        if(!teams.length) return Promise.reject(new Error("أضف الفرق أول"));
        return startRound("heads", trial, { deck: store.heads.deck, teams: teams.length }).then(function(d){
          var words = d.items.map(function(x){ return String(x.w || ""); }).filter(Boolean), turns = {};
          if(d.kind === "trial") turns[teams[0].id] = { rid: "h" + d.round + "t0", words: words, st: "ready" };
          else {
            /* كلمات لكل فريق (حجم الجولة) — ولو الفئة ما كفّت، نقسم الموجود بالتساوي عشان العدل */
            var want = d.size || chosenSize("heads") || 10;
            var per = Math.max(1, Math.min(want, Math.floor(words.length / teams.length)));
            teams.forEach(function(t, i){
              var w = words.slice(i * per, i * per + per);
              if(w.length) turns[t.id] = { rid: "h" + d.round + "t" + i, words: w, st: "ready" };
            });
          }
          store.heads.round = { id: d.round, kind: d.kind, deck: d.deck || "" };
          store.heads.turns = turns;
          HD.live = null;
          persist();
          headsBroadcastTurns();
          headsOpen();
        });
      }
    });
  }
  /* الجوال يطلب كلماته (hello) والشاشة ترد بدوره */
  function headsTurnPayload(teamId){
    var R = store.heads.round, tu = store.heads.turns && store.heads.turns[teamId];
    var team = teamOf(teamId);
    if(!R || R.done || !team) return { team: teamId, none: true, reason: "no_round" };
    if(!tu || !tu.words || !tu.words.length) return { team: teamId, none: true, reason: "no_words", kind: R.kind };
    if(tu.st === "done") return { team: teamId, none: true, reason: "done", c: tu.c | 0 };
    return { team: teamId, rid: tu.rid, words: tu.words, dur: store.heads.dur, deck: R.deck || "", kind: R.kind, teamName: team.name, color: team.color };
  }
  function headsSendTurn(teamId){ rtSend("headsTurn", headsTurnPayload(teamId)); }
  function headsBroadcastTurns(){ store.teams.forEach(function(t){ headsSendTurn(t.id); }); }
  function headsPlayLocal(teamId){
    var p = headsTurnPayload(teamId);
    if(p.none){ toast("ما فيه كلمات جاهزة لهالفريق"); return; }
    try{ localStorage.setItem("sahra-heads-local", JSON.stringify(Object.assign({ at: Date.now() }, p))); }
    catch(e){ toast("ما قدرنا نفتح اللعب على هذا الجهاز"); return; }
    location.href = "heads.html?local=1";
  }
  /* نتيجة اللعب على نفس الجهاز (heads.html?local=1) ترجع عن طريق localStorage */
  function applyHeadsResult(){
    var raw = null;
    try{ raw = localStorage.getItem("sahra-heads-result"); if(raw) localStorage.removeItem("sahra-heads-result"); }catch(e){ return; }
    if(!raw) return;
    var r = null; try{ r = JSON.parse(raw); }catch(e){ return; }
    if(!r || typeof r.rid !== "string" || typeof r.team !== "string") return;
    onHeads({ type:"end", rid:r.rid, team:r.team, correct:r.correct, passed:r.passed, words:r.words });
  }
  function renderHeadsStatus(){
    if(!headsVisible()) return;
    if(buzz.status === "off"){ rtConnect(); return; }      /* انطفت الأزرار وحنا بهالصفحة — نرجع نتصل بهدوء */
    hdEls.err.innerHTML = buzz.status === "error"
      ? '<div class="bz-err">⚠️ ما قدرنا نتصل بالجوالات — تأكد من الإنترنت، أو العبوا من هذا الجهاز. <button type="button" class="bz-copy" data-hdretry>إعادة المحاولة</button></div>' : "";
    if(HD.gridRoom !== store.buzz.room) renderHeadsGrid();
  }
  function renderHeadsGrid(){
    if(!headsVisible() || !headsActive()) return;
    HD.gridRoom = store.buzz.room;
    if(!store.teams.length){ hdEls.grid.innerHTML = '<p class="bz-intro">أضف الفرق من «الفرق والنقاط».</p>'; return; }
    hdEls.grid.innerHTML = store.teams.map(function(t){
      var tu = store.heads.turns[t.id];
      var has = tu && tu.words && tu.words.length, play = has && tu.st !== "done";
      var st = !has ? '<div class="hd-turn none">' + (store.heads.round.kind === "trial" ? "🎁 التجربة المجانية لفريق واحد" : "ما لهم كلمات بهالجولة") + '</div>'
        : tu.st === "done" ? '<div class="hd-turn done">✅ لعبوا: ' + (tu.c | 0) + ' صح · ⏭️ ' + (tu.p | 0) + '</div>'
        : '<div class="hd-turn">🕐 جاهزين — ' + tu.words.length + ' كلمات</div>';
      return '<div class="bz-team" style="--c:' + t.color + '">'
        + '<h4>' + escapeHtml(t.name) + '</h4>'
        + (play ? '<div class="bz-qr" data-hdqr="' + t.id + '"></div>' : '')
        + st
        + (play ? '<button class="hd-play-local" type="button" data-hdlocal="' + t.id + '">▶ العب من هذا الجهاز</button>'
               + '<button class="bz-copy" type="button" data-hdcopy="' + t.id + '">نسخ رابط الجوال</button>' : '')
        + '</div>';
    }).join("");
    hdEls.grid.querySelectorAll("[data-hdqr]").forEach(function(box){
      var t = teamOf(box.getAttribute("data-hdqr"));
      if(!t || !store.buzz.room){
        box.innerHTML = '<p class="bz-intro">' + (store.buzz.room ? "تعذّر إنشاء الباركود" : "جاري التجهيز…") + '</p>'; return;
      }
      if(!needQR(renderHeadsGrid)){ box.innerHTML = qrWaitHtml(); return; }
      try{ box.innerHTML = qrSvg(headsUrl(t), 4, 2); }
      catch(e){ box.innerHTML = '<p class="bz-intro">تعذّر إنشاء الباركود</p>'; }
    });
  }
  hdEls.grid.addEventListener("click", function(e){
    var l = e.target.closest("[data-hdlocal]");
    if(l){ headsPlayLocal(l.getAttribute("data-hdlocal")); return; }
    var b = e.target.closest("[data-hdcopy]"); if(!b) return;
    var t = teamOf(b.getAttribute("data-hdcopy"));
    if(!t) return;
    copyLink(headsUrl(t), "انسخ رابط " + t.name + " ✅");
  });
  hdEls.err.addEventListener("click", function(e){
    if(!e.target.closest("[data-hdretry]")) return;
    buzzDisconnect(true); rtConnect();
  });
  document.getElementById("hdEndBtn").addEventListener("click", function(){
    (headsTurnsLeft() ? endRoundAsk("الجولة") : Promise.resolve(true)).then(function(ok){
      if(!ok) return;
      if(store.heads.round) store.heads.round.done = true;
      persist(); headsBroadcastTurns(); headsGate(true);
    });
  });
  function onHeads(p){
    if(!p || typeof p !== "object") return;
    var team = teamOf(p.team);
    var rid = typeof p.rid === "string" ? p.rid.slice(0, 40) : "";
    var type = p.type;
    if(!team || !rid || ["start","ans","pause","resume","end"].indexOf(type) === -1) return;
    var tu = store.heads.turns && store.heads.turns[team.id];
    if(!HD.live || HD.live.rid !== rid){
      HD.live = { rid:rid, team:team.id, name:"", deck:"", endAt:Date.now(), correct:0, passed:0, log:[], ended:false, paused:false };
    }
    var L = HD.live;
    if(type === "start"){
      L.name = buzzCleanName(p.name); L.deck = String(p.deck || "").slice(0, 30);
      L.endAt = Date.now() + hdInt(p.left, 1, 600) * 1000; L.paused = false;
      if(tu && tu.rid === rid && tu.st !== "done"){ tu.st = "playing"; persist(); }
      if(!headsVisible()) toast("🤳 بدأ دور " + team.name + " في «حطها على راسك»");
    } else if(type === "ans"){
      L.correct = hdInt(p.correct, 0, 999); L.passed = hdInt(p.passed, 0, 999);
      if(p.left != null) L.endAt = Date.now() + hdInt(p.left, 0, 600) * 1000;
      if(L.log.length < 300) L.log.push({ w:String(p.w || "").slice(0, 40), ok:!!p.ok });
    } else if(type === "pause"){
      L.paused = true;
    } else if(type === "resume"){
      L.paused = false; L.endAt = Date.now() + hdInt(p.left, 0, 600) * 1000;
    } else if(type === "end"){
      var correct = hdInt(p.correct, 0, 999), passed = hdInt(p.passed, 0, 999);
      var fresh = store.heads.done.indexOf(rid) === -1;     /* الجوال يعيد الإرسال لين يوصله تأكيد — نضيف النقاط مرة وحدة بس */
      if(fresh){
        store.heads.done.push(rid);
        if(store.heads.done.length > 60) store.heads.done.shift();
        var gained = correct * cfgPlay().pts.heads;
        team.score += gained;
        store.heads.last[team.id] = { c:correct, p:passed, at:Date.now() };
        if(tu && tu.rid === rid){ tu.st = "done"; tu.c = correct; tu.p = passed; }
        persist(); renderTeams();
        toast("🤳 " + team.name + ": " + (correct ? "انضافت " + hdPoints(gained) : "ما جاوبوا ولا كلمة"));
      }
      L.ended = true; L.paused = false; L.correct = correct; L.passed = passed;
      if(Array.isArray(p.words)){
        L.log = p.words.slice(0, 300).map(function(x){ return { w:String((x && x.w) || "").slice(0, 40), ok:!!(x && x.ok) }; });
      }
      rtSend("headsAck", { rid:rid, team:team.id, added:correct * cfgPlay().pts.heads, teamName:team.name });
      if(fresh && store.heads.round && !store.heads.round.done && !headsTurnsLeft()){
        store.heads.round.done = true; persist();
        if(headsVisible()) headsGate(true); else planOnDone("heads");
        return;
      }
      if(fresh) renderHeadsGrid();
    }
    renderHeadsLive();
  }
  function renderHeadsLive(){
    var L = HD.live, el = hdEls.live;
    clearInterval(HD.timer); HD.timer = null;
    if(!L){ el.hidden = true; return; }
    var team = teamOf(L.team);
    var color = team ? team.color : "#5ec4e0", tname = team ? team.name : "";
    var counts = '<div class="hd-count"><span class="ok">✅ ' + L.correct + '</span><span class="pass">⏭️ ' + L.passed + '</span></div>';
    var log = '<div class="hd-log">' + L.log.map(function(x){
      return '<span class="' + (x.ok ? "ok" : "pass") + '">' + (x.ok ? "✅ " : "⏭️ ") + escapeHtml(x.w) + '</span>';
    }).join("") + '</div>';
    if(L.ended){
      el.innerHTML = '<div class="hd-card" style="--c:' + color + '"><div class="hd-done">🏁 خلص دور <b>' + escapeHtml(tname) + '</b> — '
        + (L.correct ? "انضافت " + hdPoints(L.correct) : "ما جاوبوا ولا كلمة 😅") + '</div>' + counts + log + '</div>';
    } else {
      el.innerHTML = '<div class="hd-card" style="--c:' + color + '"><div class="hd-who">🤳 دور <b>' + escapeHtml(tname) + '</b>'
        + (L.name ? ' <small>· ' + escapeHtml(L.name) + '</small>' : '') + (L.deck ? ' <small>· ' + escapeHtml(L.deck) + '</small>' : '') + '</div>'
        + '<div class="hd-timer" id="hdTimer"></div>' + counts + log + '</div>';
      var tick = function(){
        var t = document.getElementById("hdTimer"); if(!t) return;
        if(L.paused){ t.textContent = "⏸"; t.classList.remove("warn"); return; }
        var sec = Math.max(0, Math.ceil((L.endAt - Date.now()) / 1000));
        t.textContent = Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2);
        t.classList.toggle("warn", sec <= 10);
      };
      tick(); HD.timer = setInterval(tick, 250);
    }
    el.hidden = false;
  }

  /* ============ سهرة جديدة: كل شي من الصفر (الفرق وأسماءها ونقاطها وكل الألعاب) ============ */
  var resetEls = { modal: document.getElementById("resetModal"), yes: document.getElementById("resetYesBtn"), no: document.getElementById("resetNoBtn") };
  function openResetModal(){
    var played = store.teams.some(function(t){ return t.score !== 0; }) || (isObj(store.night) && Array.isArray(store.night.rounds) && store.night.rounds.length > 0);
    document.getElementById("resetSumBtn").hidden = !played;
    resetEls.modal.hidden = false;
  }
  function closeResetModal(){ resetEls.modal.hidden = true; }
  document.getElementById("resetAllBtn").addEventListener("click", function(){ closeTeams(); openResetModal(); });
  document.getElementById("homeResetBtn").addEventListener("click", openResetModal);
  resetEls.no.addEventListener("click", closeResetModal);
  resetEls.modal.addEventListener("click", function(e){ if(e.target === resetEls.modal) closeResetModal(); });
  resetEls.yes.addEventListener("click", function(){ closeResetModal(); resetEverything(); });
  function resetEverything(){
    /* نسكّر أي نافذة مفتوحة */
    trivEls.modal.hidden = true; activeCell = null;
    ltEls.modal.hidden = true; ltEls.win.hidden = true; LT.cur = null; TTS.stop(true);
    mCloseTicket(); closeBuzzPanel(); closeTeams();
    /* الفرق: فريقين بالأسماء الافتراضية — ونخلي رقم أول فريقين عشان جوالات «أسرع إصبع» تبقى شغالة */
    var keep = store.teams.slice(0, 2).map(function(t){ return t.id; });
    store.teams = [0, 1].map(function(i){
      return { id: keep[i] || uid(), name: "فريق " + (i + 1), color: TEAM_PALETTE[i], score: 0 };
    });
    /* الألعاب: أي جولة شغالة تنتهي (سجل الأسئلة اللي طلعت محفوظ بالسيرفر، فما تتكرر) */
    store.trivia = { round:null, cells:[] };
    store.emoji.round = null; store.emoji.items = []; store.emoji.idx = 0; store.emoji.mq = null; store.emoji.ch = null;
    store.charades = { round:null, items:[], idx:0, turn:0 };
    store.letters = { round:null, board:[], qmap:{}, qpos:{}, owners:{}, history:[], wins:{}, lastWin:null };
    store.flags = { round:null, items:[], idx:0 };
    store.million = { pref: store.million.pref === "all" ? "all" : "seat", round:null, items:[] }; clearInterval(ML.tick); clearTimeout(ML.revealT);
    store.heads = { round:null, deck: store.heads.deck || "all", dur: store.heads.dur || 60, turns:{}, done:[], last:{} };
    HD.live = null;
    store.rope = { round:null }; if(RP.host){ RP.host.destroy(); RP.host = null; }
    store.mafia = { caseId:null, round:0, players:[], counts:{ mafia:0, detective:0, doctor:0 } };
    store.win.shown = ""; winEls.modal.hidden = true;
    if(cfgPlay().win_target > 0) store.win.target = cfgPlay().win_target;
    store.plan = null; closePlanModal(); document.getElementById("scoreModal").hidden = true;
    store.night = null; closeSummary();
    ANS_GAMES.forEach(ansLeave); store.ans = { auto: store.ans.auto !== false }; ansHide();
    emojiState.awarding = false;
    resetTimer("emoji", cfgPlay().emoji_secs); resetTimer("char", cfgPlay().char_secs);
    persist();
    renderTeams(); renderTriviaAwardButtons(); renderEmojiAward(); renderCharTurnBanner(); mRender(); renderHeadsLive();
    buzzIdle(); teamsChanged(); renderPlanBar();
    showView("home");
    toast("🎉 بدأت سهرة جديدة");
  }

  /* ======================================================================
     طريق المليون — أسئلة بأربع خيارات، وطريقتين للعب:
       🪑 الكرسي الحار: فريق فريق يطلع السلّم (سهل ← متوسط ← صعب)، فيه محطات أمان
          ومساعدات (حذف إجابتين، اسأل الجمهور، اتصل بصديق، تبديل السؤال) وينسحب متى ما بغى
       👥 الكل يجاوب: السؤال يطلع للكل، وكل فريق يختار من جواله (أو المقدّم يدخل جوابه)،
          والصح ياخذ نقاط المستوى + بونص لأسرع فريق صح
     store.million = { pref, round, mode, items, ... } — كل شي ينحفظ عشان التحديث ما يضيّع الجولة
     ====================================================================== */
  var ML_MONEY = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
  var ML_KEYS = ["أ", "ب", "ج", "د"];
  var ML_LV = { 1:"سهل", 2:"متوسط", 3:"صعب" };
  var ML = { tick:null, revealT:null, lastTick:-1 };
  var mlEls = { body: document.getElementById("mlBody"), endBtn: document.getElementById("mlEndBtn") };

  function mlActive(){ var M = store.million; return !!M.round && !M.round.done && Array.isArray(M.items) && M.items.length > 0; }
  function mlCfg(){ return cfgPlay().million; }
  function mlMoney(n){ var out = []; for(var i = 0; i < n; i++) out.push(ML_MONEY[n <= 1 ? 14 : Math.round(i * 14 / (n - 1))]); return out; }
  function mlFmt(v){ return v >= 1000000 ? "المليون" : (Number(v) || 0).toLocaleString("en-US"); }
  function mlAmt(n, k){ return k <= 0 ? "0" : mlFmt(mlMoney(n)[k - 1]); }
  function mlSafe(n){ var a = Math.floor(n / 3), b = Math.floor(2 * n / 3), out = []; [a, b].forEach(function(x){ if(x > 0 && x < n && out.indexOf(x) === -1) out.push(x); }); return out; }
  function mlKept(n, step){ var s = mlSafe(n).filter(function(x){ return x <= step; }); return s.length ? s[s.length - 1] : 0; }
  function mlPtsWord(n){ return arN(n, "نقطة وحدة", "نقطتين", "نقاط", "نقطة"); }
  function mlQn(){ var M = store.million; return M.phase === "right" ? M.step : M.step + 1; }  /* رقم السؤال المعروض (بعد «صح» الدرجة زادت) */
  function mlQWord(n){ return arN(n, "سؤال واحد", "سؤالين", "أسئلة", "سؤال"); }
  function mlShuffleOpts(it){
    var opts = shuffle([it.a].concat(it.w.slice(0, 3)));
    return { opts: opts, c: opts.indexOf(it.a) };
  }

  /* ---------- بدء الجولة ---------- */
  function mlSetup(d, mode){
    var M = store.million, items = d.items.filter(function(x){ return x && typeof x.q === "string" && typeof x.a === "string" && Array.isArray(x.w) && x.w.length >= 3; });
    var teams = store.teams.slice(0, 6);
    M.round = { id: d.round, kind: d.kind };
    M.mode = d.mode === "all" ? "all" : "seat";
    M.items = items;
    M.res = {};
    if(M.mode === "seat"){
      var n = d.size || chosenSize("million") || 10;
      var pools = { 1:[], 2:[], 3:[] };
      items.forEach(function(x, i){ (pools[x.lv] || pools[2]).push(i); });
      var ne = Math.ceil(n / 3), nm = Math.ceil((n - ne) / 2), nh = n - ne - nm;
      var take = function(lv, k){
        var order = lv === 1 ? [1, 2, 3] : lv === 2 ? [2, 1, 3] : [3, 2, 1], got = [];
        while(got.length < k){
          var src = order.filter(function(l){ return pools[l].length; })[0];
          if(!src) break;
          got.push(pools[src].shift());
        }
        return got;
      };
      var ladders = {};
      teams.forEach(function(t){ ladders[t.id] = take(1, ne).concat(take(2, nm), take(3, nh)); });
      /* كل الفرق نفس طول السلّم (عدل) — الزايد يرجع احتياط */
      var len = Math.min.apply(null, teams.map(function(t){ return ladders[t.id].length; }));
      teams.forEach(function(t){ ladders[t.id].splice(len).forEach(function(i){ pools[items[i].lv].push(i); }); });
      M.n = len; M.ladders = ladders; M.spares = pools;
      M.order = teams.map(function(t){ return t.id; }); M.ti = 0;
      M.phase = "intro"; M.q = null; M.step = 0;
      M.used = { fifty:false, aud:false, friend:false, swap:false };
    } else {
      M.n = items.length; M.qi = 0; M.aq = null; M.gain = {};
      teams.forEach(function(t){ M.gain[t.id] = 0; });
      M.phase = "ready";
    }
    persist();
  }

  /* ---------- الكرسي الحار ---------- */
  function mlSeatTeam(){ var M = store.million; return M.order ? teamOf(M.order[M.ti]) : null; }
  function mlNewQ(i){
    var M = store.million, o = mlShuffleOpts(M.items[i]);
    M.q = { i: i, opts: o.opts, c: o.c, rm: [], pick: null, aud: null, friend: null };
  }
  function mlBeginTurn(){
    var M = store.million;
    /* لو انحذف فريق وسط الجولة نتخطاه */
    while(M.ti < M.order.length && !teamOf(M.order[M.ti])) M.ti += 1;
    if(M.ti >= M.order.length){ M.phase = "final"; mlSync(); mlRender(); return; }
    M.step = 0; M.used = { fifty:false, aud:false, friend:false, swap:false };
    mlNewQ(M.ladders[M.order[M.ti]][0]);
    M.phase = "q";
    mlSync(); mlRender();
  }
  function mlPick(k){
    var M = store.million;
    if(!M.q || (M.phase !== "q" && M.phase !== "confirm") || M.q.rm.indexOf(k) !== -1) return;
    if(M.q.aud && M.q.aud.phase === "vote") return;
    M.q.pick = k; M.phase = "confirm";
    mlSound("blip"); mlSync(); mlRender();
  }
  function mlLock(){
    var M = store.million;
    if(M.phase !== "confirm" || M.q.pick == null) return;
    M.phase = "lock";
    mlSound("lock"); mlSync(); mlRender();
    clearTimeout(ML.revealT);
    ML.revealT = setTimeout(mlReveal, Math.min(3200, 1300 + M.step * 220));
  }
  function mlReveal(){
    var M = store.million;
    clearTimeout(ML.revealT);
    if(M.phase !== "lock" || !M.q) return;
    if(M.q.pick === M.q.c){
      M.step += 1; M.phase = "right";
      if(M.step >= M.n){ mlSound("top"); confetti(); } else mlSound("right");
    } else {
      M.phase = "wrong"; mlSound("wrong");
    }
    mlSync(); mlRender();
  }
  function mlNext(){
    var M = store.million;
    if(M.phase !== "right" || M.step >= M.n) return;
    mlNewQ(M.ladders[M.order[M.ti]][M.step]);
    M.phase = "q";
    mlSync(); mlRender();
  }
  function mlEndTurn(out){
    var M = store.million, team = mlSeatTeam();
    if(!team) return;
    clearTimeout(ML.revealT);
    var kept = out === "walk" ? M.step : out === "wrong" ? mlKept(M.n, M.step) : M.n;
    var pts = kept * mlCfg().step_pts;
    M.res[team.id] = { reached: M.step, kept: kept, pts: pts, out: out };
    if(pts){ team.score += pts; renderTeams(); }
    M.q = null; M.phase = "turn";
    mlSync(); mlRender();
  }
  function mlNextTeam(){
    var M = store.million;
    if(M.phase !== "turn") return;
    M.ti += 1;
    while(M.ti < M.order.length && !teamOf(M.order[M.ti])) M.ti += 1;
    M.phase = M.ti >= M.order.length ? "final" : "intro";
    mlSync(); mlRender();
  }
  /* المساعدات */
  function mlFifty(){
    var M = store.million;
    if(!M.q || M.used.fifty || !mlCfg().life.fifty || ["q", "confirm"].indexOf(M.phase) === -1) return;
    var wrong = [0, 1, 2, 3].filter(function(k){ return k !== M.q.c && M.q.rm.indexOf(k) === -1; });
    M.q.rm = M.q.rm.concat(shuffle(wrong).slice(0, Math.max(0, wrong.length - 1)).slice(0, 2));
    if(M.q.pick != null && M.q.rm.indexOf(M.q.pick) !== -1){ M.q.pick = null; M.phase = "q"; }
    M.used.fifty = true;
    mlSound("blip"); mlSync(); mlRender();
  }
  function mlPhonesFor(exceptTeam){
    if(buzz.status !== "on") return 0;
    var n = 0;
    Object.keys(buzz.presence || {}).forEach(function(tid){ if(tid !== exceptTeam && teamOf(tid)) n += (buzz.presence[tid] || []).length; });
    return n;
  }
  function mlAudience(){
    var M = store.million, team = mlSeatTeam();
    if(!M.q || M.used.aud || !mlCfg().life.aud || ["q", "confirm"].indexOf(M.phase) === -1) return;
    M.used.aud = true; M.q.pick = null; M.phase = "q";
    if(mlPhonesFor(team && team.id) > 0){
      M.q.aud = { phase: "vote", votes: {}, endsAt: Date.now() + mlCfg().vote_secs * 1000 };
      mlStartTick();
    } else {
      M.q.aud = { phase: "done", counts: mlSimAudience(M.items[M.q.i].lv, M.q.c, M.q.rm), src: "sim" };
    }
    mlSound("blip"); mlSync(); mlRender();
  }
  function mlSimAudience(lv, c, rm){
    var r = ({ 1:[0.55, 0.8], 2:[0.4, 0.62], 3:[0.27, 0.48] })[lv] || [0.4, 0.6];
    var counts = [0, 0, 0, 0], others = [0, 1, 2, 3].filter(function(k){ return k !== c && rm.indexOf(k) === -1; });
    counts[c] = Math.round((r[0] + Math.random() * (r[1] - r[0])) * 100);
    var rest = 100 - counts[c], w = others.map(function(){ return Math.random() + 0.25; }), ws = w.reduce(function(a, b){ return a + b; }, 0);
    others.forEach(function(k, i){ counts[k] = Math.round(rest * w[i] / ws); });
    counts[c] += 100 - counts.reduce(function(a, b){ return a + b; }, 0);
    return counts;
  }
  function mlEndVote(){
    var M = store.million;
    if(!M.q || !M.q.aud || M.q.aud.phase !== "vote") return;
    var counts = [0, 0, 0, 0], total = 0;
    Object.keys(M.q.aud.votes).forEach(function(pid){ var c = M.q.aud.votes[pid]; if(c >= 0 && c < 4 && M.q.rm.indexOf(c) === -1){ counts[c] += 1; total += 1; } });
    M.q.aud = total
      ? { phase: "done", counts: counts.map(function(n){ return Math.round(n * 100 / total); }), src: "phones", total: total }
      : { phase: "done", counts: mlSimAudience(M.items[M.q.i].lv, M.q.c, M.q.rm), src: "sim", none: true };
    mlSound("blip"); mlSync(); mlRender();
  }
  function mlFriend(){
    var M = store.million;
    if(!M.q || M.used.friend || !mlCfg().life.friend || ["q", "confirm"].indexOf(M.phase) === -1) return;
    M.used.friend = true;
    M.q.friend = { endsAt: Date.now() + mlCfg().friend_secs * 1000, secs: mlCfg().friend_secs }; ML.lastTick = -1;
    mlStartTick(); mlSound("blip"); mlSync(); mlRender();
  }
  function mlEndFriend(){
    var M = store.million;
    if(!M.q || !M.q.friend) return;
    M.q.friend = null;
    mlSync(); mlRender();
  }
  function mlSwap(){
    var M = store.million, team = mlSeatTeam();
    if(!M.q || !team || M.used.swap || !mlCfg().life.swap || ["q", "confirm"].indexOf(M.phase) === -1) return;
    var lv = M.items[M.q.i].lv, order = lv === 1 ? [1, 2, 3] : lv === 2 ? [2, 1, 3] : [3, 2, 1];
    var src = order.filter(function(l){ return M.spares[l] && M.spares[l].length; })[0];
    if(!src){ toast("ما فيه سؤال بديل بهالجولة"); return; }
    var ni = M.spares[src].shift();
    M.ladders[team.id][M.step] = ni;
    M.used.swap = true;
    mlNewQ(ni); M.phase = "q";
    toast("🔄 تبدّل السؤال");
    mlSound("blip"); mlSync(); mlRender();
  }
  function mlWalk(){
    var M = store.million;
    if(["q", "confirm"].indexOf(M.phase) === -1 || M.step < 1) return;
    var pts = M.step * mlCfg().step_pts;
    ask("تنسحبون؟", "تطلعون بـ " + mlAmt(M.n, M.step) + " (" + mlPtsWord(pts) + ") وينتهي دوركم.", "🏳️ إيه، ننسحب").then(function(ok){ if(ok) mlEndTurn("walk"); });
  }

  /* ---------- الكل يجاوب ---------- */
  function mlAllOpen(){
    var M = store.million, it = M.items[M.qi], o = mlShuffleOpts(it), now = Date.now();
    M.aq = { opts: o.opts, c: o.c, picks: {}, openedAt: now, endsAt: now + mlCfg().all_secs * 1000, gain: null, manual: M.aq ? !!M.aq.manual : !mlPhoneTeams().length };
    M.phase = "open"; ML.lastTick = -1;
    mlStartTick(); mlSync(); mlRender();
  }
  function mlAllTeams(){ return store.teams.slice(0, 6); }
  function mlAllPicked(){ var M = store.million; return mlAllTeams().every(function(t){ return !!M.aq.picks[t.id]; }); }
  function mlAllLock(){
    var M = store.million;
    if(M.phase !== "open") return;
    M.phase = "locked"; M.aq.endsAt = 0;
    mlSound("lock"); mlSync(); mlRender();
  }
  function mlAllPickSet(teamId, c, src, name){
    var M = store.million;
    if(!M.aq || (M.phase !== "open" && M.phase !== "locked") || !(c >= 0 && c < 4)) return false;
    if(src === "phone" && (M.phase !== "open" || M.aq.picks[teamId])) return false;
    M.aq.picks[teamId] = { c: c, ms: src === "phone" ? Date.now() - M.aq.openedAt : null, src: src, by: name || "" };
    if(M.phase === "open" && mlAllPicked()) mlAllLock();
    return true;
  }
  function mlAllReveal(){
    var M = store.million;
    if(M.phase !== "open" && M.phase !== "locked") return;
    var it = M.items[M.qi], cfg = mlCfg(), base = cfg.lv_pts[(it.lv || 2) - 1], gain = {};
    var fast = null;
    mlAllTeams().forEach(function(t){
      var p = M.aq.picks[t.id];
      if(p && p.c === M.aq.c){
        gain[t.id] = base;
        if(p.src === "phone" && typeof p.ms === "number" && (!fast || p.ms < fast.ms)) fast = { id: t.id, ms: p.ms };
      }
    });
    /* بونص الأسرع: بس لو فيه منافسة بالجوالات (فريقين أو أكثر جاوبوا من الجوال) */
    var phonePicks = Object.keys(M.aq.picks).filter(function(id){ return M.aq.picks[id].src === "phone"; }).length;
    if(!(fast && cfg.speed_bonus > 0 && phonePicks >= 2)) fast = null;
    if(fast) gain[fast.id] += cfg.speed_bonus;
    M.aq.gain = gain; M.aq.fast = fast ? fast.id : null;
    if(fast) nightFast(fast.id, (M.aq.picks[fast.id] || {}).by);
    Object.keys(gain).forEach(function(id){ var t = teamOf(id); if(t && gain[id]){ t.score += gain[id]; M.gain[id] = (M.gain[id] || 0) + gain[id]; } });
    renderTeams();
    M.phase = "reveal";
    mlSound(Object.keys(gain).length ? "right" : "wrong");
    mlSync(); mlRender();
  }
  function mlAllNext(){
    var M = store.million;
    if(M.phase !== "reveal") return;
    M.qi += 1;
    if(M.qi >= M.items.length){ M.aq = null; M.phase = "final"; mlSync(); mlRender(); }
    else mlAllOpen();
  }

  /* ---------- المؤقت (الكل يجاوب + تصويت الجمهور + اتصل بصديق) ---------- */
  function mlLeft(endsAt){ return endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0; }
  function mlStartTick(){ clearInterval(ML.tick); ML.tick = setInterval(mlTickFn, 250); }
  function mlTickFn(){
    var M = store.million, live = false;
    if(!mlActive()){ clearInterval(ML.tick); ML.tick = null; return; }
    if(M.mode === "all" && M.phase === "open" && M.aq && M.aq.endsAt){
      live = true;
      var l = mlLeft(M.aq.endsAt); mlSetTimer("mlAllTimer", l, mlCfg().all_secs);
      if(l <= 5 && l > 0 && ML.lastTick !== l){ ML.lastTick = l; mlSound("tick"); }
      if(l <= 0) mlAllLock();
    }
    if(M.mode === "seat" && M.q && M.q.aud && M.q.aud.phase === "vote"){
      live = true;
      var lv = mlLeft(M.q.aud.endsAt); mlSetTimer("mlVoteTimer", lv, mlCfg().vote_secs);
      var vc = document.getElementById("mlVoteN"); if(vc) vc.textContent = Object.keys(M.q.aud.votes).length;
      if(lv <= 0) mlEndVote();
    }
    if(M.mode === "seat" && M.q && M.q.friend){
      live = true;
      var lf = mlLeft(M.q.friend.endsAt); mlSetTimer("mlFriendTimer", lf, M.q.friend.secs || 30);
      if(lf <= 5 && lf > 0 && ML.lastTick !== lf){ ML.lastTick = lf; mlSound("tick"); }
      if(lf <= 0){ mlSound("wrong"); mlEndFriend(); }
    }
    if(!live){ clearInterval(ML.tick); ML.tick = null; }
  }
  function mlSetTimer(id, left, total){
    var el = document.getElementById(id); if(!el) return;
    var b = el.querySelector("b"); if(b) b.textContent = left;
    el.style.setProperty("--p", total ? Math.max(0, Math.min(100, left / total * 100)) : 0);
    el.classList.toggle("warn", left <= 5);
  }

  /* ---------- الجوالات ---------- */
  function mlQid(){
    var M = store.million;
    if(!mlActive()) return "";
    if(M.mode === "seat") return M.q ? "s" + M.round.id + ":" + M.order[M.ti] + ":" + M.q.i : "";
    return M.aq ? "a" + M.round.id + ":" + M.qi : "";
  }
  function mlPhone(){
    var M = store.million;
    if(!mlActive() || curView !== "million") return null;
    var base = { v: 1, mode: M.mode, total: M.n };
    if(M.mode === "seat"){
      var team = mlSeatTeam();
      base.seat = team ? team.id : null; base.seatName = team ? team.name : "";
      if(!M.q || ["q", "confirm", "lock", "right", "wrong"].indexOf(M.phase) === -1) return Object.assign(base, { phase: "wait" });
      var it = M.items[M.q.i], rev = M.phase === "right" || M.phase === "wrong", vote = M.q.aud && M.q.aud.phase === "vote";
      return Object.assign(base, {
        qid: mlQid(), n: mlQn(), text: it.q, cat: it.cat, lv: it.lv, amt: mlAmt(M.n, mlQn()),
        opts: M.q.opts.map(function(o, k){ return M.q.rm.indexOf(k) !== -1 ? null : o; }),
        phase: rev ? "reveal" : vote ? "vote" : "show",
        sel: (M.phase === "confirm" || M.phase === "lock" || rev) ? M.q.pick : null,
        left: vote ? mlLeft(M.q.aud.endsAt) : 0,
        reveal: rev ? { c: M.q.c, chosen: M.q.pick } : null,
        aud: M.q.aud && M.q.aud.phase === "done" ? { counts: M.q.aud.counts } : null
      });
    }
    if(!M.aq || ["open", "locked", "reveal"].indexOf(M.phase) === -1) return Object.assign(base, { phase: "wait" });
    var it2 = M.items[M.qi], picks = {};
    Object.keys(M.aq.picks).forEach(function(id){ picks[id] = M.aq.picks[id].c; });
    return Object.assign(base, {
      qid: mlQid(), n: M.qi + 1, text: it2.q, cat: it2.cat, lv: it2.lv, pts: mlCfg().lv_pts[(it2.lv || 2) - 1],
      opts: M.aq.opts, phase: M.phase === "reveal" ? "reveal" : M.phase === "open" ? "pick" : "lock",
      left: M.phase === "open" ? mlLeft(M.aq.endsAt) : 0,
      picked: Object.keys(M.aq.picks),
      reveal: M.phase === "reveal" ? { c: M.aq.c, picks: picks, gain: M.aq.gain || {}, fast: M.aq.fast || null } : null
    });
  }
  function onMillionPick(p){
    if(typeof p.qid === "string" && p.qid.indexOf("mc:") === 0){ onMcPick(p); return; }   /* (v11) الأعلام والصور */
    var M = store.million;
    if(!mlActive() || M.mode !== "all" || typeof p.qid !== "string" || p.qid !== mlQid()) return;
    var t = teamOf(p.team); if(!t) return;
    if(mlAllPickSet(t.id, +p.c, "phone", buzzCleanName(p.name))){ mlSound("blip"); mlSync(); mlRender(); }
  }
  function onMillionVote(p){
    var M = store.million, seat = mlSeatTeam();
    if(!mlActive() || M.mode !== "seat" || !M.q || !M.q.aud || M.q.aud.phase !== "vote") return;
    if(typeof p.qid !== "string" || p.qid !== mlQid() || (seat && p.team === seat.id)) return;
    var c = +p.c, pid = typeof p.pid === "string" ? p.pid.slice(0, 40) : "";
    if(!pid || !(c >= 0 && c < 4) || M.q.rm.indexOf(c) !== -1) return;
    M.q.aud.votes[pid] = c;
    persist(); buzzSend();
    var vc = document.getElementById("mlVoteN"); if(vc) vc.textContent = Object.keys(M.q.aud.votes).length;
  }
  function mlSync(){ persist(); buzzSend(); renderBuzzUI(); }

  /* ---------- الأصوات ---------- */
  function mlTone(notes, type, gain){
    try{
      buzzUnlockAudio(); if(!buzz.audio) return;
      var a = buzz.audio, t0 = a.currentTime;
      notes.forEach(function(n){
        var o = a.createOscillator(), g = a.createGain();
        o.type = type || "triangle"; o.frequency.setValueAtTime(n[0], t0 + n[1]);
        g.gain.setValueAtTime(0.0001, t0 + n[1]);
        g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]);
        o.connect(g); g.connect(a.destination); o.start(t0 + n[1]); o.stop(t0 + n[1] + n[2] + 0.03);
      });
    }catch(e){}
  }
  function mlSound(k){
    if(k === "blip") mlTone([[740, 0, 0.12]], "sine", 0.1);
    else if(k === "lock") mlTone([[196, 0, 0.4], [196, 0.5, 0.4], [247, 1, 0.55]], "sine", 0.16);
    else if(k === "right") mlTone([[523, 0, 0.18], [659, 0.14, 0.18], [784, 0.28, 0.28], [1047, 0.44, 0.45]], "triangle", 0.2);
    else if(k === "wrong") mlTone([[311, 0, 0.32], [233, 0.26, 0.6]], "sawtooth", 0.11);
    else if(k === "top") mlTone([[523, 0, 0.2], [659, 0.18, 0.2], [784, 0.36, 0.2], [1047, 0.54, 0.35], [784, 0.88, 0.18], [1047, 1.04, 0.75]], "triangle", 0.22);
    else if(k === "tick") mlTone([[880, 0, 0.06]], "square", 0.04);
  }

  /* ---------- الشاشة ---------- */
  function mlOpen(){
    var M = store.million;
    if(mlActive()){
      setGated("million", false); renderRoundTag("million", M.round);
      if(M.phase === "lock"){ clearTimeout(ML.revealT); ML.revealT = setTimeout(mlReveal, 700); }
      if((M.mode === "all" && M.phase === "open") || (M.q && ((M.q.aud && M.q.aud.phase === "vote") || M.q.friend))) mlStartTick();
      mlRender();
      buzzSend();
    } else mlGate(!!M.round);
  }
  function mlSummaryHtml(){
    var M = store.million, rows;
    if(M.mode === "seat"){
      rows = (M.order || []).map(function(id){
        var t = teamOf(id), r = M.res && M.res[id]; if(!t) return "";
        return '<li>' + escapeHtml(t.name) + ': ' + (r ? (r.out === "top" ? "🏆 المليون" : mlAmt(M.n, r.kept)) + " (" + mlPtsWord(r.pts) + ")" : "ما لعبوا") + '</li>';
      }).join("");
    } else {
      rows = store.teams.map(function(t){ var g = (M.gain || {})[t.id]; return g == null ? "" : '<li>' + escapeHtml(t.name) + ': +' + mlPtsWord(g) + '</li>'; }).join("");
    }
    return rows ? '<div class="rg-sum"><ul class="rm-list">' + rows + '</ul></div>' : "";
  }
  function mlGate(done){
    var pref = store.million.pref === "all" ? "all" : "seat";
    var modes = [["seat", "🪑 الكرسي الحار", "فريق فريق على السلّم"], ["all", "👥 الكل يجاوب", "كل فريق من جواله"]];
    renderGate("million", {
      done: done,
      summary: done ? mlSummaryHtml() : "",
      extra: '<div class="lbl">طريقة اللعب</div><div class="rg-chips">' + modes.map(function(m){
          return '<button type="button" data-mlmode="' + m[0] + '"' + (pref === m[0] ? ' class="on"' : '') + '>' + m[1] + '<small>' + m[2] + '</small></button>';
        }).join("") + '</div>'
        + (pref === "all" ? '<p class="rg-note">كل فريق يمسح باركوده من «📱 أسرع إصبع» ويجاوب من جواله. والفريق اللي ما عنده جوال، تدخل جوابه أنت.</p>'
                          : '<p class="rg-note">فيه 4 مساعدات لكل فريق، ومحطتين أمان. والفرق الثانية يصيرون الجمهور ويصوّتون من جوالاتهم.</p>')
        + (store.teams.length < 2 ? '<p class="rg-note">أضف فريقين على الأقل من «👥 الفرق والنقاط».</p>' : ''),
      bind: function(gate){
        gate.querySelectorAll("[data-mlmode]").forEach(function(b){
          b.addEventListener("click", function(){ store.million.pref = b.getAttribute("data-mlmode"); persist(); mlGate(done); });
        });
      },
      begin: function(trial){
        var teams = store.teams.slice(0, 6);
        if(!teams.length) return Promise.reject(new Error("أضف الفرق أول"));
        return startRound("million", trial, { mode: pref, teams: teams.length }).then(function(d){ mlSetup(d, pref); mlOpen(); ansStart("million", d.round); });
      }
    });
  }
  function mlRender(){
    var M = store.million;
    if(!mlActive()){ mlGate(!!M.round); return; }
    mlEls.body.innerHTML = M.mode === "seat" ? mlSeatHtml() : mlAllHtml();
    mlAutoRead();
    var bars = mlEls.body.querySelectorAll(".ml-bars .b i");
    if(bars.length) requestAnimationFrame(function(){ bars.forEach(function(i){ i.style.height = i.getAttribute("data-h") + "%"; }); });
  }
  /* القراءة بالصوت: السؤال ثم الخيارات (ألف، باء، جيم، دال) — مرة وحدة أول ما يطلع السؤال */
  function mlSpeechItem(){
    var M = store.million;
    if(!M || !Array.isArray(M.items)) return null;
    if(M.mode === "seat"){ if(!M.q || ["q", "confirm", "lock", "right", "wrong"].indexOf(M.phase) === -1) return null; return { it: M.items[M.q.i], opts: M.q.opts, rm: M.q.rm || [], live: M.phase === "q" }; }
    if(!M.aq || ["open", "locked", "reveal"].indexOf(M.phase) === -1) return null;
    return { it: M.items[M.qi], opts: M.aq.opts, rm: [], live: M.phase === "open" };
  }
  function mlSayBtn(){ return '<button class="tts-say" type="button" data-tts="ml" aria-label="اقرأ السؤال والخيارات بصوت">' + icon("i-volume") + '<span>اقرأ</span></button>'; }
  function mlSpeech(){
    var S = mlSpeechItem(); if(!S || !S.it) return [];
    var names = ["ألف", "باء", "جيم", "دال"];
    return [S.it.q].concat((S.opts || []).map(function(o, k){ return S.rm.indexOf(k) !== -1 ? "" : names[k] + "، " + o + "."; }));
  }
  function mlAutoRead(){
    var S = mlSpeechItem(), M = store.million;
    if(!S || !S.it){ TTS.stopIf("ml"); return; }
    if(S.live && curView === "million") TTS.auto("ml" + M.mode + ":" + (M.mode === "seat" ? M.ti + ":" + M.q.i : M.qi) + ":" + S.it.q, mlSpeech());
    else if(!S.live) TTS.stopIf("ml");
  }
  function mlLadderHtml(cur){
    var M = store.million, money = mlMoney(M.n), safe = mlSafe(M.n), rows = [];
    for(var k = M.n; k >= 1; k--){
      var cls = "ml-step" + (safe.indexOf(k) !== -1 ? " safe" : "") + (k <= M.step ? " done" : "") + (k === cur ? " cur" : "") + (k === M.n ? " top" : "");
      rows.push('<div class="' + cls + '"><span class="no">' + k + '</span><span class="amt">' + (k === M.n ? "🏆 " + mlFmt(money[k - 1]) : mlFmt(money[k - 1])) + '</span>' + (safe.indexOf(k) !== -1 ? '<span class="sf" title="محطة أمان">🛡️</span>' : '<span class="sf"></span>') + '</div>');
    }
    return '<aside class="ml-ladder" aria-label="السلّم">' + rows.join("") + '</aside>';
  }
  function mlMiniHtml(cur){
    var M = store.million;
    return '<div class="ml-mini"><div class="bar"><i style="width:' + Math.round(M.step / M.n * 100) + '%"></i></div>'
      + '<span>سؤال ' + Math.min(cur, M.n) + ' من ' + M.n + ' · على <b>' + mlAmt(M.n, Math.min(cur, M.n)) + '</b> · 🛡️ ' + mlSafe(M.n).join(" و") + '</span></div>';
  }
  function mlLifesHtml(){
    var M = store.million, L = mlCfg().life, can = ["q", "confirm"].indexOf(M.phase) !== -1 && !(M.q && M.q.aud && M.q.aud.phase === "vote");
    var defs = [["fifty", "50:50", "حذف إجابتين", ""], ["aud", icon("i-users"), "اسأل الجمهور", ""], ["friend", icon("i-phone"), "اتصل بصديق", ""], ["swap", icon("i-refresh"), "تبديل السؤال", ""]];
    return '<div class="ml-lifes">' + defs.filter(function(d){ return L[d[0]]; }).map(function(d){
      var used = M.used[d[0]];
      return '<button type="button" class="ml-life' + (used ? " used" : "") + '" data-ml="life-' + d[0] + '"' + (used || !can ? " disabled" : "") + ' aria-label="' + d[2] + '">'
        + '<span class="ic-w">' + d[1] + '</span>' + d[2] + '</button>';
    }).join("") + '</div>';
  }
  function mlOptsHtml(opts, state){
    /* state(k) → { cls, dis, extra } */
    return '<div class="ml-opts">' + opts.map(function(o, k){
      var s = state(k);
      return '<button type="button" class="ml-opt' + (s.cls ? " " + s.cls : "") + '" data-mlopt="' + k + '"' + (s.dis ? " disabled" : "") + '>'
        + '<span class="k">' + ML_KEYS[k] + '</span><span class="t">' + escapeHtml(o) + '</span>' + (s.extra || "") + '</button>';
    }).join("") + '</div>';
  }
  /* «الكل يجاوب» — مشتركة بين طريق المليون والإجابة من الجوال (الأعلام والصور).
     q = { opts, c, picks:{ فريق: { c, src } }, gain, fast }  */
  function allOptsHtml(q, rev){
    var byOpt = q.opts.map(function(){ return []; });
    if(rev) mlAllTeams().forEach(function(t){ var p = q.picks[t.id]; if(p && byOpt[p.c]) byOpt[p.c].push(t); });
    return mlOptsHtml(q.opts, function(k){
      if(!rev) return { cls: "", dis: true };
      return { cls: k === q.c ? "ok" : (byOpt[k].length ? "no" : "dim"), dis: true,
               extra: byOpt[k].length ? '<span class="who">' + byOpt[k].map(function(t){ return '<i style="--c:' + t.color + '" title="' + escapeHtml(t.name) + '"></i>'; }).join("") + '</span>' : '' };
    });
  }
  function allChipsHtml(q, rev){
    return '<div class="ml-teams">' + mlAllTeams().map(function(t){
      var p = q.picks[t.id], g = rev && q.gain ? q.gain[t.id] : null;
      var st = rev ? (p ? (p.c === q.c ? '<span class="ck">✅ +' + (g || 0) + (q.fast === t.id ? " ⚡" : "") + '</span>' : '<span class="x">❌ ' + ML_KEYS[p.c] + '</span>') : '<span class="x">ما جاوبوا</span>')
                   : (p ? '<span class="ck">✅ جاوبوا</span>' : '<span class="w">⏳</span>');
      return '<span class="ml-tchip' + (p ? " done" : "") + '" style="--c:' + t.color + '"><i></i>' + escapeHtml(t.name) + st + '</span>';
    }).join("") + '</div>';
  }
  /* الإدخال اليدوي للفرق اللي ما عندها جوال: الأجوبة ما تنعرض (الشاشة قدام الكل) — بس «تسجّل». attr = زر الحرف */
  function allManualHtml(q, attr){
    return '<div class="ml-manual"><p class="mm-hint">اضغط حرف جواب الفريق اللي يقوله لك. الأجوبة ما تنعرض على الشاشة عشان ما تنكشف.</p>' + mlAllTeams().map(function(t){
      var p = q.picks[t.id], st = p ? (p.src === "phone" ? "📱 جاوبوا من الجوال" : "✅ تسجّل جوابهم") : "⏳ ما جاوبوا";
      return '<div class="mm-row' + (p ? " done" : "") + '" style="--c:' + t.color + '"><b><i></i>' + escapeHtml(t.name) + '<em>' + st + '</em></b><span>' + q.opts.map(function(o, k){
        return '<button type="button" ' + attr + '="' + t.id + '" data-k="' + k + '" aria-label="' + escapeHtml(t.name) + ': ' + ML_KEYS[k] + '">' + ML_KEYS[k] + '</button>';
      }).join("") + '</span></div>';
    }).join("") + '</div>';
  }
  function mlAudHtml(){
    var M = store.million, A = M.q && M.q.aud;
    if(!A) return "";
    if(A.phase === "vote") return "";  /* العدّاد وزر «خلّص التصويت» بالشريط تحت الخيارات */
    var max = Math.max.apply(null, A.counts.concat([1]));
    return '<div class="ml-aud"><h4><span>📊 رأي الجمهور</span><small>' + (A.src === "phones" ? "من " + arN(A.total, "صوت واحد", "صوتين", "أصوات", "صوت") : A.none ? "ما وصل تصويت — نسب افتراضية" : "جمهور افتراضي") + '</small></h4>'
      + '<div class="ml-bars">' + A.counts.map(function(n, k){
        var off = M.q.rm.indexOf(k) !== -1;
        return '<div class="b' + (off ? " off" : "") + '"><span>' + (off ? "—" : n + "%") + '</span><i data-h="' + (off ? 0 : Math.round(n / max * 100)) + '" style="height:0"></i><b>' + ML_KEYS[k] + '</b></div>';
      }).join("") + '</div></div>';
  }
  function mlFriendHtml(){
    var M = store.million, F = M.q && M.q.friend;
    if(!F) return "";
    return '<div class="ml-friend" role="dialog" aria-modal="true"><div class="box">' + icon("i-phone", "big") + '<h3>اتصل بصديق</h3>'
      + '<p>عندكم ' + F.secs + ' ثانية تسألون أي أحد — بالمجلس أو بالجوال.</p>'
      + '<div class="ml-timer xl" id="mlFriendTimer" style="--p:100"><b>' + mlLeft(F.endsAt) + '</b></div>'
      + '<button class="btn-primary" type="button" data-ml="end-friend">خلّصنا</button></div></div>';
  }
  function mlSeatHtml(){
    var M = store.million, team = mlSeatTeam(), cfg = mlCfg();
    if(M.phase === "final" || !team) return mlFinalHtml();
    var tstyle = "--c:" + team.color, nTeams = M.order.length;
    if(M.phase === "intro"){
      var L = cfg.life, lifes = [L.fifty ? "حذف إجابتين" : "", L.aud ? "اسأل الجمهور" : "", L.friend ? "اتصل بصديق" : "", L.swap ? "تبديل السؤال" : ""].filter(Boolean);
      return '<div class="ml-card ml-intro" style="' + tstyle + '"><span class="ml-kicker">الدور ' + (M.ti + 1) + ' من ' + nTeams + '</span>'
        + '<h3>دور <b>' + escapeHtml(team.name) + '</b> على الكرسي الحار</h3>'
        + '<div class="ml-chair">🪑</div>'
        + '<p>' + mlQWord(M.n) + ' تصعب درجة درجة، والأخير على <b>المليون</b>. محطات الأمان عند السؤال ' + mlSafe(M.n).join(" و") + ': إذا غلطتوا ترجعون لآخر محطة وصلتوها.</p>'
        + (lifes.length ? '<p class="ml-sub">المساعدات (كل وحدة مرة): ' + lifes.join("، ") + '. وتقدرون تنسحبون قبل أي سؤال بنقاطكم.</p>' : '')
        + '<p class="ml-sub">كل درجة = ' + mlPtsWord(cfg.step_pts) + ' للفريق.</p>'
        + '<button class="btn-primary btn-lg" type="button" data-ml="go">' + icon("i-play") + ' يلا نبدأ</button></div>';
    }
    if(M.phase === "turn") return mlTurnHtml(team);
    var it = M.items[M.q.i], cur = mlQn(), rev = M.phase === "right" || M.phase === "wrong";
    var A = M.q.aud, voting = !!(A && A.phase === "vote"), audDone = !!(A && A.phase === "done");
    var top = '<div class="ml-top"><span class="ml-team" style="' + tstyle + '"><i></i>' + escapeHtml(team.name) + ' · على الكرسي</span>'
      + '<span class="ml-now">معكم: <b>' + mlAmt(M.n, M.step) + '</b>' + (M.step ? ' · ' + mlPtsWord(M.step * cfg.step_pts) : '') + '</span></div>';
    var qcard = '<div class="ml-qcard"><div class="ml-meta"><span>سؤال ' + cur + ' من ' + M.n + '</span><span class="lv' + it.lv + '">' + (ML_LV[it.lv] || "") + '</span>'
      + (it.cat ? '<span>' + escapeHtml(it.cat) + '</span>' : '') + '<span class="for">على ' + mlAmt(M.n, cur) + '</span>' + mlSayBtn() + '</div>'
      + '<p class="ml-q">' + escapeHtml(it.q) + '</p></div>';
    var opts = mlOptsHtml(M.q.opts, function(k){
      var rm = M.q.rm.indexOf(k) !== -1;
      var pct = audDone && !rm ? '<span class="pct" title="رأي الجمهور">' + (A.counts[k] | 0) + '%</span><i class="af" style="width:' + (A.counts[k] | 0) + '%"></i>' : '';
      if(rev){
        return { cls: k === M.q.c ? "ok" : (k === M.q.pick ? "no" : (rm ? "rm" : "dim")), dis: true, extra: pct };
      }
      return { cls: rm ? "rm" : (k === M.q.pick ? ("sel" + (M.phase === "lock" ? " lock" : "")) : ""), dis: rm || M.phase === "lock" || voting, extra: pct };
    });
    var bar = "";
    if(M.phase === "q" && voting){
      bar = '<div class="ml-bar sel ml-voting"><span class="ml-timer" id="mlVoteTimer" style="--p:100"><b>' + mlLeft(A.endsAt) + '</b></span>'
        + '<span class="msg">🗳️ الجمهور يصوّت من جوالاته… الأصوات: <b id="mlVoteN">' + Object.keys(A.votes).length + '</b></span>'
        + '<button class="btn-ghost" type="button" data-ml="end-vote">خلّص التصويت</button></div>';
    } else if(M.phase === "q"){
      bar = '<div class="ml-bar"><span class="msg">اختاروا جوابكم — والمقدّم يضغطه</span>'
        + (M.step >= 1 ? '<button class="btn-ghost" type="button" data-ml="walk">🏳️ انسحبوا بـ ' + mlAmt(M.n, M.step) + '</button>' : '') + '</div>';
    } else if(M.phase === "confirm"){
      bar = '<div class="ml-bar sel"><span class="msg">إجابتكم النهائية: «' + ML_KEYS[M.q.pick] + '»؟</span>'
        + '<button class="btn-primary" type="button" data-ml="lock">' + icon("i-check") + ' إيه، نهائية</button>'
        + '<button class="btn-ghost" type="button" data-ml="unpick">↩️ غيّروا</button></div>';
    } else if(M.phase === "lock"){
      bar = '<div class="ml-bar sel"><span class="msg ml-dots">ننتظر الإجابة الصحيحة</span></div>';
    } else if(M.phase === "right"){
      bar = M.step >= M.n
        ? '<div class="ml-bar ok"><span class="msg">🏆 صح! وصلتوا المليون!</span><button class="btn-primary" type="button" data-ml="end-top">' + icon("i-trophy") + ' النتيجة</button></div>'
        : '<div class="ml-bar ok"><span class="msg">✅ صح! طلعتوا لـ ' + mlAmt(M.n, M.step) + '</span>'
          + '<button class="btn-primary" type="button" data-ml="next">السؤال الجاي على ' + mlAmt(M.n, M.step + 1) + ' ' + icon("i-arrow") + '</button></div>';
    } else if(M.phase === "wrong"){
      var kept = mlKept(M.n, M.step);
      bar = '<div class="ml-bar no"><span class="msg">❌ غلط! الصح «' + ML_KEYS[M.q.c] + '» — ' + (kept ? "ترجعون لـ " + mlAmt(M.n, kept) : "ترجعون للصفر") + '</span>'
        + '<button class="btn-primary" type="button" data-ml="end-wrong">خلّصوا الدور</button></div>';
    }
    return '<div class="ml-stage"><div class="ml-main">' + top + mlMiniHtml(cur) + (rev ? "" : mlLifesHtml()) + qcard + opts + bar + mlAudHtml() + '</div>'
      + mlLadderHtml(cur) + '</div>' + mlFriendHtml();
  }
  function mlTurnHtml(team){
    var M = store.million, r = M.res[team.id] || { kept: 0, pts: 0, out: "walk", reached: 0 };
    var head = r.out === "top" ? "🏆 " + escapeHtml(team.name) + " وصلوا المليون!" : r.out === "walk" ? "🏳️ " + escapeHtml(team.name) + " انسحبوا" : "❌ " + escapeHtml(team.name) + " غلطوا بالسؤال " + (r.reached + 1);
    var last = M.ti >= M.order.length - 1 || !M.order.slice(M.ti + 1).some(function(id){ return teamOf(id); });
    var nextTeam = last ? null : teamOf(M.order.slice(M.ti + 1).filter(function(id){ return teamOf(id); })[0]);
    return '<div class="ml-card ml-turn" style="--c:' + team.color + '"><span class="ml-kicker">خلص الدور</span><h3>' + head + '</h3>'
      + '<div class="ml-big">' + (r.kept ? mlAmt(M.n, r.kept) : "0") + '</div>'
      + '<p class="ml-gain">' + (r.pts ? "+" + mlPtsWord(r.pts) + " لـ " + escapeHtml(team.name) : "ما أخذوا نقاط هالمرة") + '</p>'
      + mlBoardHtml()
      + (nextTeam ? '<button class="btn-primary btn-lg" type="button" data-ml="next-team">دور ' + escapeHtml(nextTeam.name) + ' ' + icon("i-arrow") + '</button>'
                  : '<button class="btn-primary btn-lg" type="button" data-ml="next-team">' + icon("i-trophy") + ' النتيجة النهائية</button>') + '</div>';
  }
  function mlBoardHtml(){
    var M = store.million;
    if(M.mode === "seat"){
      var rows = (M.order || []).map(function(id){ return teamOf(id); }).filter(Boolean).map(function(t){
        var r = M.res[t.id];
        return '<div class="ml-row' + (r ? "" : " wait") + '" style="--c:' + t.color + '"><i></i><b>' + escapeHtml(t.name) + '</b><span>' + (r ? (r.out === "top" ? "🏆 المليون" : mlAmt(M.n, r.kept)) : "ما لعبوا للحين") + '</span><em>' + (r ? (r.pts ? "+" + r.pts : "0") : "") + '</em></div>';
      });
      return '<div class="ml-board">' + rows.join("") + '</div>';
    }
    var ranked = store.teams.slice(0, 6).slice().sort(function(a, b){ return (M.gain[b.id] || 0) - (M.gain[a.id] || 0); });
    return '<div class="ml-board">' + ranked.map(function(t){
      return '<div class="ml-row" style="--c:' + t.color + '"><i></i><b>' + escapeHtml(t.name) + '</b><span>' + mlPtsWord(M.gain[t.id] || 0) + '</span><em>' + t.score + '</em></div>';
    }).join("") + '</div>';
  }
  function mlFinalHtml(){
    var M = store.million, best = null;
    if(M.mode === "seat"){
      (M.order || []).forEach(function(id){ var r = M.res[id], t = teamOf(id); if(t && r && (!best || r.kept > best.kept)) best = { t: t, kept: r.kept }; });
    } else {
      store.teams.slice(0, 6).forEach(function(t){ var g = M.gain[t.id] || 0; if(!best || g > best.kept) best = { t: t, kept: g }; });
    }
    var title = best && best.kept > 0 ? (M.mode === "seat" ? "أبعد واحد بالطريق: " : "الأكثر نقاط: ") + escapeHtml(best.t.name) : "خلصت الجولة";
    return '<div class="ml-card ml-final"><span class="ml-kicker">🏁 خلصت جولة طريق المليون</span><h3>' + title + '</h3>' + mlBoardHtml()
      + '<button class="btn-primary btn-lg" type="button" data-ml="finish">' + icon("i-check") + ' إنهاء الجولة</button></div>';
  }
  function mlAllHtml(){
    var M = store.million, cfg = mlCfg();
    if(M.phase === "final") return mlFinalHtml();
    if(M.phase === "ready" || !M.aq){
      return '<div class="ml-card ml-intro"><span class="ml-kicker">👥 الكل يجاوب</span><h3>' + mlQWord(M.items.length) + ' للكل</h3><div class="ml-chair">📱</div>'
        + '<p>السؤال يطلع على الشاشة والجوالات، وكل فريق يختار جوابه من جواله قبل ما يخلص الوقت (' + cfg.all_secs + ' ثانية).</p>'
        + '<p class="ml-sub">الصح ياخذ: سهل ' + mlPtsWord(cfg.lv_pts[0]) + '، متوسط ' + mlPtsWord(cfg.lv_pts[1]) + '، صعب ' + mlPtsWord(cfg.lv_pts[2])
        + (cfg.speed_bonus ? '، وأسرع فريق جاوب صح ياخذ ' + mlPtsWord(cfg.speed_bonus) + ' زيادة' : '') + '.</p>'
        + mlPhonesNote()
        + '<button class="btn-primary btn-lg" type="button" data-ml="all-go">' + icon("i-play") + ' أول سؤال</button></div>';
    }
    var it = M.items[M.qi], rev = M.phase === "reveal", pts = cfg.lv_pts[(it.lv || 2) - 1];
    var qcard = '<div class="ml-qcard"><div class="ml-meta"><span>سؤال ' + (M.qi + 1) + ' من ' + M.items.length + '</span><span class="lv' + it.lv + '">' + (ML_LV[it.lv] || "") + '</span>'
      + (it.cat ? '<span>' + escapeHtml(it.cat) + '</span>' : '') + '<span class="for">الصح بـ ' + mlPtsWord(pts) + '</span>' + mlSayBtn() + '</div><p class="ml-q">' + escapeHtml(it.q) + '</p></div>';
    var opts = allOptsHtml(M.aq, rev), chips = allChipsHtml(M.aq, rev), manual = !rev && M.aq.manual ? allManualHtml(M.aq, "data-mlman") : "";
    var bar;
    if(rev){
      var any = Object.keys(M.aq.gain || {}).length;
      bar = '<div class="ml-bar ' + (any ? "ok" : "no") + '"><span class="msg">' + (any ? "✅ الجواب الصح «" + ML_KEYS[M.aq.c] + "»" : "❌ محد جاوب صح — الجواب «" + ML_KEYS[M.aq.c] + "»") + '</span>'
        + '<button class="btn-primary" type="button" data-ml="all-next">' + (M.qi + 1 >= M.items.length ? icon("i-trophy") + " النتيجة" : "السؤال الجاي " + icon("i-arrow")) + '</button></div>';
    } else {
      bar = '<div class="ml-bar">' + (M.phase === "open" ? '<span class="ml-timer" id="mlAllTimer" style="--p:100"><b>' + mlLeft(M.aq.endsAt) + '</b></span>' : '<span class="msg">انقفلت الأجوبة</span>')
        + '<button class="btn-primary" type="button" data-ml="all-reveal">' + icon("i-check") + ' اكشف الجواب</button>'
        + '<button class="btn-ghost" type="button" data-ml="all-manual">' + (M.aq.manual ? "إخفاء الإدخال اليدوي" : "✍️ أدخل أجوبة الفرق") + '</button></div>';
    }
    return '<div class="ml-stage one"><div class="ml-main">' + (rev ? "" : mlPhonesNote(true)) + qcard + opts + chips + manual + bar + (rev ? mlBoardHtml() : "") + '</div></div>';
  }
  function mlPhoneTeams(){
    var on = buzz.status === "on";
    return mlAllTeams().filter(function(t){ return on && ((buzz.presence || {})[t.id] || []).length > 0; });
  }
  function mlNames(list){
    var a = list.map(function(t){ return escapeHtml(t.name); });
    return a.length <= 1 ? (a[0] || "") : a.slice(0, -1).join("، ") + " و" + a[a.length - 1];
  }
  /* compact = بس لو ولا فريق متصل. act = زر الباركود (المليون: data-ml، الأعلام والصور: data-mcact) */
  function mlPhonesNote(compact, act){
    var teams = mlAllTeams(), have = mlPhoneTeams();
    if(have.length === teams.length) return compact ? "" : '<p class="ml-sub">📱 كل الفرق متصلة بجوالاتها.</p>';
    if(compact && have.length) return "";
    var miss = teams.filter(function(t){ return have.indexOf(t) === -1; });
    var txt = have.length
      ? "📱 " + mlNames(miss) + " ما عندهم جوال متصل: يمسحون الباركود، أو تدخل جوابهم أنت من «✍️ أدخل أجوبة الفرق»."
      : (buzz.status === "on" ? "ولا فريق وصّل جواله." : "الجوالات مو متصلة.") + " امسحوا الباركود من «📱 أسرع إصبع»، أو أدخل أجوبة الفرق بنفسك.";
    return '<div class="ml-note">' + icon("i-buzz") + '<span>' + txt + '</span>'
      + '<button class="btn-soft btn-sm" type="button" ' + (act || 'data-ml="phones"') + '>📱 الباركود</button></div>';
  }
  mlEls.body.addEventListener("click", function(e){
    var b = e.target.closest("[data-ml],[data-mlopt],[data-mlman]"); if(!b || b.disabled) return;
    buzzUnlockAudio();
    var M = store.million;
    if(b.hasAttribute("data-mlopt")){ if(M.mode === "seat") mlPick(+b.getAttribute("data-mlopt")); return; }
    if(b.hasAttribute("data-mlman")){
      if(mlAllPickSet(b.getAttribute("data-mlman"), +b.getAttribute("data-k"), "host")){ mlSound("blip"); mlSync(); mlRender(); }
      return;
    }
    var a = b.getAttribute("data-ml");
    if(a === "go") mlBeginTurn();
    else if(a === "lock") mlLock();
    else if(a === "unpick"){ M.q.pick = null; M.phase = "q"; mlSync(); mlRender(); }
    else if(a === "next") mlNext();
    else if(a === "walk") mlWalk();
    else if(a === "end-wrong") mlEndTurn("wrong");
    else if(a === "end-top") mlEndTurn("top");
    else if(a === "next-team") mlNextTeam();
    else if(a === "life-fifty") mlFifty();
    else if(a === "life-aud") mlAudience();
    else if(a === "life-friend") mlFriend();
    else if(a === "life-swap") mlSwap();
    else if(a === "end-vote") mlEndVote();
    else if(a === "end-friend") mlEndFriend();
    else if(a === "all-go") mlAllOpen();
    else if(a === "all-reveal") mlAllReveal();
    else if(a === "all-next") mlAllNext();
    else if(a === "all-manual"){ M.aq.manual = !M.aq.manual; persist(); mlRender(); }
    else if(a === "phones") openBuzzPanel();
    else if(a === "finish"){ M.round.done = true; clearInterval(ML.tick); persist(); buzzSend(); mlGate(true); }
  });
  mlEls.endBtn.addEventListener("click", function(){
    endRoundAsk("جولة طريق المليون").then(function(ok){
      if(!ok) return;
      var M = store.million;
      if(M.round){ M.round.done = true; clearTimeout(ML.revealT); clearInterval(ML.tick); persist(); buzzSend(); mlGate(true); }
    });
  });

  /* ======================================================================
     مربوطين — من 2 لين 8 لاعبين مربوطين بحبل. كل جولة = مرحلة وحدة من 200
     (من القاعدة عن طريق start_round). المحرّك (games/rope.js) يتحمّل بس لما
     تفتح اللعبة، والجوالات تصير أيادي تحكم (rope.html) بنفس غرفة «أسرع إصبع».
     ====================================================================== */
  var RP = { host:null, loading:null };
  window.__sahraRope = RP;   /* للفحص من المتصفح (ما فيه شي سري) */
  function ropeActive(){ var R = store.rope.round; return !!R && !R.done && isObj(R.level) && Array.isArray(R.level.P); }
  function ropeLoad(){
    if(window.SahraRope) return Promise.resolve(window.SahraRope);
    if(RP.loading) return RP.loading;
    RP.loading = new Promise(function(res, rej){
      var sc = document.createElement("script"); sc.src = "games/rope.js?v=73"; sc.async = true;
      sc.onload = function(){ if(window.SahraRope) res(window.SahraRope); else { RP.loading = null; rej(new Error("rope")); } };
      sc.onerror = function(){ RP.loading = null; rej(new Error("rope")); };
      document.head.appendChild(sc);
    });
    return RP.loading;
  }
  function ropePhoneUrl(){
    var base = location.origin + location.pathname.replace(/[^\/]*$/, "");
    return base + "rope.html?r=" + encodeURIComponent(store.buzz.room || "");
  }
  function ropeQr(el, url){
    if(!el) return;
    if(!url || !store.buzz.room){ el.innerHTML = '<p class="bz-intro">جاري التجهيز…</p>'; return; }
    if(!needQR(function(){ ropeQr(el, url); })){ el.innerHTML = qrWaitHtml(); return; }
    try{ el.innerHTML = qrSvg(url, 4, 2); }
    catch(e){ el.innerHTML = '<p class="bz-intro">تعذّر إنشاء الباركود</p>'; }
  }
  var ropeAudio = null;
  function ropeSfx(kind){
    try{
      var Ctx = window.AudioContext || window.webkitAudioContext; if(!Ctx) return;
      if(!ropeAudio) ropeAudio = buzz.audio || new Ctx();
      if(ropeAudio.state === "suspended") ropeAudio.resume();
      var a = ropeAudio, o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime;
      var f = { jump:[520, 760, 0.12, 0.05], fall:[300, 120, 0.35, 0.12], cp:[660, 990, 0.3, 0.1], win:[523, 1046, 0.6, 0.14] }[kind] || [440, 440, 0.1, 0.05];
      o.type = kind === "fall" ? "sawtooth" : "triangle";
      o.frequency.setValueAtTime(f[0], t0); o.frequency.exponentialRampToValueAtTime(f[1], t0 + f[2]);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(f[3], t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + f[2] + 0.05);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + f[2] + 0.08);
    }catch(e){}
  }
  function ropeOpen(){
    if(!store.buzz.room){ store.buzz.room = buzzRoomGen(); persist(); }
    rtConnect();
    if(!ropeActive()){
      if(RP.host){ RP.host.destroy(); RP.host = null; }
      ropeGate(!!store.rope.round);
      return;
    }
    setGated("rope", false); renderRoundTag("rope", store.rope.round);
    var box = document.getElementById("ropeHost"), lvl = store.rope.round.level;
    if(RP.host && RP.host.level && RP.host.level.id === lvl.id && RP.host.box === box){ if(RP.host.game) RP.host.game.resize(); RP.host.send(); return; }
    box.innerHTML = '<div class="rp-loading"><span class="spin" aria-hidden="true"></span>جاري تجهيز اللعبة…</div>';
    ropeLoad().then(function(S){
      if(!ropeActive()) return;
      if(RP.host) RP.host.destroy();
      RP.host = S.mount(box, {
        send: function(ev, payload){ rtSend(ev, payload); },
        phoneUrl: ropePhoneUrl,
        qr: ropeQr,
        sfx: ropeSfx,
        onWin: function(r){
          var R = store.rope.round; if(!R) return;
          if(!R.best || r.stars > R.best.stars || (r.stars === R.best.stars && r.time < R.best.time)) R.best = r;
          persist();
        },
        onNext: function(){ ropeEnd(); }
      });
      RP.host.setLevel(store.rope.round.level, store.rope.round);
    }, function(){
      box.innerHTML = '<div class="bz-err">⚠️ ما قدرنا نحمّل اللعبة — تأكد من الإنترنت وحدّث الصفحة.</div>';
    });
  }
  function ropeLeave(){
    if(typeof RP === "undefined" || !RP) return;
    if(RP.host && RP.host.game && RP.host.phase === "play" && RP.host.game.state === "play"){ RP.host.game.pause(); RP.host.renderHud(); }
  }
  function fmtClock(t){ t = Math.max(0, t | 0); return Math.floor(t / 60) + ":" + ("0" + (t % 60)).slice(-2); }
  function ropeSummary(){
    var R = store.rope.round, b = R && R.best;
    if(!R) return "";
    var line = b ? '<b>' + escapeHtml(b.name) + '</b>: ' + "★★★".slice(0, b.stars) + "☆☆☆".slice(0, 3 - b.stars) + ' — ⏱️ ' + fmtClock(b.time) + ' · 💥 ' + b.falls
                 : '<b>' + escapeHtml((R.level && R.level.n) || "") + '</b>: ما وصلتوا للنجمة هالمرة';
    return '<div class="rg-sum"><ul class="rm-list"><li>' + line + '</li></ul></div>';
  }
  function ropeGate(done){
    renderGate("rope", {
      done: done,
      summary: done ? ropeSummary() : "",
      extra: '<p class="rg-note">🪢 تحتاجون لاعبين على الأقل (لين 8): بالجوالات (باركود) أو من كيبورد هذا الجهاز أو أيادي تحكم.</p>',
      begin: function(trial){
        return startRound("rope", trial, {}).then(function(d){
          var lv = d.items[0];
          if(!isObj(lv) || !Array.isArray(lv.P)) throw new Error("bad_round");
          store.rope.round = { id: d.round, kind: d.kind, level: lv, best: null };
          persist();
          ropeOpen();
        });
      }
    });
  }
  function ropeEnd(){
    if(store.rope.round) store.rope.round.done = true;
    persist();
    if(RP.host){ RP.host.destroy(); RP.host = null; }
    ropeGate(true);
  }
  document.getElementById("rpEndBtn").addEventListener("click", function(){
    var R = store.rope.round;
    (R && !R.best ? endRoundAsk("المرحلة") : Promise.resolve(true)).then(function(ok){ if(ok) ropeEnd(); });
  });

  /* ======================================================================
     مخطط السهرة — المقدّم يختار الفرق والوقت والألعاب، والطاولة ترتّب
     الجولات وتمشي معه جولة جولة (النتائج بين كل جولة) لين تعلن الفائز.
     store.plan = { steps:[{g,size,est,status:todo|live|done|skip,round,before,delta}], cur, started, finished }
     ====================================================================== */
  var PLAN_ORDER = ["flags", "trivia", "charades", "million", "emoji", "heads", "letters"];   /* تسخين → تفكير → حركة → … → الختام */
  var PLAN_MINUTES = [30, 45, 60, 90, 120, 180];
  function minutesLabel(m){ return m === 60 ? "ساعة" : m === 90 ? "ساعة ونص" : m === 120 ? "ساعتين" : m === 180 ? "3 ساعات" : m + " دقيقة"; }
  function validPlan(p){
    return isObj(p) && Array.isArray(p.steps) && p.steps.length > 0 && p.steps.length <= 30 && typeof p.cur === "number"
      && p.steps.every(function(s){ return isObj(s) && !!GAME_INFO[s.g] && ["todo", "live", "done", "skip"].indexOf(s.status) !== -1; });
  }
  function planActive(){ var P = store.plan; return !!P && !!P.started && !P.finished && P.cur < P.steps.length; }
  function planStep(){ return planActive() ? store.plan.steps[store.plan.cur] : null; }
  function planStepFor(g){ var s = planStep(); return s && s.g === g && s.status === "todo" ? s : null; }
  function planGames(){ return GAME_ORDER.filter(function(g){ return g !== "rope" && (ACCT.admin || HIDDEN_GAMES.indexOf(g) === -1); }); }
  function planTotal(P){ return (P.steps || []).reduce(function(a, s){ return a + (s.status === "skip" ? 0 : (s.est | 0)); }, 0); }
  function scoresNow(){ var o = {}; store.teams.forEach(function(t){ o[t.id] = t.score; }); return o; }
  function stepDesc(s){ return s.g === "mafia" ? roundDesc("mafia") : roundDesc(s.g, s.size); }
  function planDraft(){
    var D = store.planDraft;
    if(!isObj(D)) D = store.planDraft = { minutes:60, games:null };
    if(PLAN_MINUTES.indexOf(D.minutes) === -1) D.minutes = 60;
    if(!Array.isArray(D.games)) D.games = planGames().filter(function(g){ return g !== "mafia"; });
    D.games = D.games.filter(function(g){ return planGames().indexOf(g) !== -1; });
    return D;
  }
  function suggestPlan(minutes, games){
    var steps = [], total = 0, teams = nTeams();
    var wantMafia = games.indexOf("mafia") !== -1;
    var withMafia = wantMafia && (minutes >= 40 || games.length === 1);
    var budget = minutes - (withMafia ? estMinutes("mafia") : 0);
    var order = PLAN_ORDER.filter(function(g){ return games.indexOf(g) !== -1; });
    for(var i = 0, guard = 0; order.length && guard < 80; guard++){
      var g = order[i % order.length], c = cfgSize(g), size = c ? c.def : null, est = estMinutes(g, size, teams);
      if(total + est > budget + 3){
        if(c && c.min < size){
          var e2 = estMinutes(g, c.min, teams);
          if(total + e2 <= budget + 3 && budget - total >= e2 * 0.6){ steps.push({ g:g, size:c.min, est:e2, status:"todo" }); total += e2; }
        }
        break;
      }
      steps.push({ g:g, size:size, est:est, status:"todo" }); total += est; i++;
      if(total >= budget - 2 || steps.length >= 20) break;
    }
    if(withMafia) steps.push({ g:"mafia", size:null, est:estMinutes("mafia"), status:"todo" });
    return steps;
  }
  function teamsUpdated(){ persist(); renderTeams(); renderTriviaAwardButtons(); renderEmojiAward(); renderCharTurnBanner(); teamsChanged(); }

  /* ---------- شاشة المخطط ---------- */
  var planEls = { body: document.getElementById("planBody") };
  function renderPlan(){
    var P = store.plan;
    if(P && P.finished){ planEls.body.innerHTML = planFinalHtml(); growBars(planEls.body); }
    else if(P && P.started) planEls.body.innerHTML = planRunHtml();
    else if(P && P.steps && P.steps.length && !P.editing) planEls.body.innerHTML = planEditHtml();
    else planEls.body.innerHTML = planSetupHtml();
  }
  function planSetupHtml(){
    var D = planDraft(), games = planGames();
    var teams = store.teams.map(function(t){
      return '<div class="pl-team" style="--c:' + t.color + '"><i></i><input type="text" maxlength="16" value="' + escapeHtml(t.name) + '" data-pl-team="' + t.id + '" aria-label="اسم الفريق">'
        + (store.teams.length > 2 ? '<button type="button" data-pl="team-del" data-t="' + t.id + '" aria-label="حذف الفريق">' + icon("i-x") + '</button>' : '') + '</div>';
    }).join("");
    var mins = PLAN_MINUTES.map(function(m){ return '<button type="button" data-pl="min" data-v="' + m + '"' + (D.minutes === m ? ' class="on"' : '') + '>' + minutesLabel(m) + '</button>'; }).join("");
    var gl = games.map(function(g){
      var on = D.games.indexOf(g) !== -1, z = cfgSize(g);
      var sub = g === "mafia" ? "تحتاج 4 لاعبين وأرقام واتساب · ≈ 20 د" : g === "heads" ? "جوال لكل فريق (أو من هالجهاز)" : "الجولة ≈ " + estMinutes(g, z ? z.def : null) + " د";
      return '<button type="button" class="pl-game' + (on ? " on" : "") + '" data-pl="game" data-g="' + g + '" style="' + accentStyle(g) + '" aria-pressed="' + on + '">'
        + gTile(g) + '<span><b>' + GAME_INFO[g].name + '</b><small>' + sub + '</small></span><span class="ck">' + icon("i-check") + '</span></button>';
    }).join("");
    return '<div class="pl-steps"><span class="on"><b>1</b>الإعدادات</span><span><b>2</b>الخطة</span><span><b>3</b>السهرة</span></div>'
      + '<div class="pl-card"><h3><span class="n">1</span>الفرق</h3><p class="sub">سمّوا الفرق (من 2 إلى 6). النقاط تنحسب لهم بكل الألعاب.</p>'
      + '<div class="pl-teams">' + teams + '</div>'
      + (store.teams.length < 6 ? '<button type="button" class="add-team-btn" data-pl="team-add" style="margin:0">إضافة فريق +</button>' : '') + '</div>'
      + '<div class="pl-card"><h3><span class="n">2</span>كم وقت سهرتكم؟</h3><p class="sub">نرتّب عدد الجولات وحجمها على قد وقتكم.</p><div class="rg-chips" style="justify-content:flex-start">' + mins + '</div></div>'
      + '<div class="pl-card"><h3><span class="n">3</span>وش تحبون تلعبون؟</h3><p class="sub">اختاروا لعبتين أو أكثر عشان تتنوع السهرة.</p>'
      + '<div class="pl-games">' + gl + '</div></div>'
      + '<div class="pl-actions"><button class="btn-primary btn-lg" type="button" data-pl="suggest"' + (D.games.length ? '' : ' disabled') + '>' + icon("i-wand") + ' رتّبوا لنا السهرة</button>'
      + (store.plan && store.plan.steps && store.plan.steps.length ? '<button class="btn-ghost" type="button" data-pl="back-edit">رجوع للخطة</button>' : '') + '</div>';
  }
  function creditAlert(n){
    if(ACCT.admin) return '<div class="pl-alert ok">' + icon("i-check") + '<span>👑 أنت الأدمن — كل الجولات بدون خصم.</span></div>';
    var need = n, have = ACCT.credits | 0;
    if(have >= need) return '<div class="pl-alert ok">' + icon("i-check") + '<span>رصيدك يكفي: تحتاج ' + roundsWord(need) + ' وعندك ' + roundsWord(have) + '.</span></div>';
    var P = store.plan, trials = [];
    (P ? P.steps : []).forEach(function(s){ if(!trialUsed(s.g) && trials.indexOf(s.g) === -1) trials.push(s.g); });
    return '<div class="pl-alert warn">' + icon("i-ticket") + '<span>تحتاج ' + roundsWord(need) + ' وعندك ' + (have ? roundsWord(have) : "ولا جولة") + '.'
      + (trials.length ? ' وتقدر تستخدم التجربة المجانية (نسخة مختصرة) لـ: ' + trials.map(function(g){ return GAME_INFO[g].name; }).join("، ") + '.' : '')
      + ' <button class="btn-soft btn-sm" type="button" data-shop>' + icon("i-cart") + ' اشترِ جولات</button></span></div>';
  }
  function planRoundsHtml(P, editable){
    return '<div class="pl-rounds">' + P.steps.map(function(s, i){
      var z = cfgSize(s.g), sz = "";
      if(editable && z && z.max > z.min){
        sz = '<div class="sz">' + sizeOptions(s.g).map(function(n){ return '<button type="button" data-pl="size" data-i="' + i + '" data-v="' + n + '"' + (n === s.size ? ' class="on"' : '') + '>' + sizeLabel(s.g, n) + '</button>'; }).join("") + '</div>';
      }
      var st = s.status === "done" ? '<span class="st done">خلصت</span>' : s.status === "skip" ? '<span class="st">تخطّيناها</span>' : s.status === "live" ? '<span class="st live">شغّالة</span>' : (P.started && i === P.cur ? '<span class="st live">الحين</span>' : '');
      var acts = editable ? '<div class="acts"><button type="button" data-pl="up" data-i="' + i + '" aria-label="فوق"' + (i === 0 ? ' disabled' : '') + '>' + icon("i-up") + '</button>'
        + '<button type="button" data-pl="down" data-i="' + i + '" aria-label="تحت"' + (i === P.steps.length - 1 ? ' disabled' : '') + '>' + icon("i-down") + '</button>'
        + '<button type="button" data-pl="del" data-i="' + i + '" aria-label="حذف"' + (P.steps.length < 2 ? ' disabled' : '') + '>' + icon("i-x") + '</button></div>' : '<span></span>';
      return '<div class="pl-round' + (s.status === "done" || s.status === "skip" ? " done" : "") + (P.started && i === P.cur && !P.finished ? " live" : "") + '" style="' + accentStyle(s.g) + '">'
        + '<span class="no">' + (i + 1) + '</span>' + gTile(s.g)
        + '<div class="info"><b>' + GAME_INFO[s.g].name + st + '</b><small>' + stepDesc(s) + ' · ≈ ' + s.est + ' د</small>' + sz + '</div>' + acts + '</div>';
    }).join("") + '</div>';
  }
  function planEditHtml(){
    var P = store.plan, total = planTotal(P), over = total > P.minutes + 10;
    var adds = planGames().map(function(g){ return '<button type="button" data-pl="add" data-g="' + g + '">' + icon("i-plus") + ' ' + GAME_INFO[g].name + '</button>'; }).join("");
    return '<div class="pl-steps"><span><b>1</b>الإعدادات</span><span class="on"><b>2</b>الخطة</span><span><b>3</b>السهرة</span></div>'
      + '<div class="pl-card"><h3>' + icon("i-plan") + 'خطة سهرتكم · ' + minutesLabel(P.minutes) + '</h3><p class="sub">رتّبوا الجولات وغيّروا حجمها مثل ما تبون — الوقت تقريبي.</p>'
      + '<div class="pl-sum"><div><b>' + P.steps.length + '</b><small>' + (P.steps.length >= 3 && P.steps.length <= 10 ? "جولات" : "جولة") + '</small></div>'
      + '<div' + (over ? ' class="warn"' : '') + '><b>≈ ' + total + '</b><small>دقيقة' + (over ? " (أطول من وقتكم)" : "") + '</small></div>'
      + '<div><b>' + store.teams.length + '</b><small>' + (store.teams.length <= 10 ? "فرق" : "فريق") + '</small></div></div>'
      + planRoundsHtml(P, true)
      + '<div class="lbl" style="font-size:.8rem;font-weight:700;color:var(--tx-3);margin:16px 0 8px">أضف جولة</div><div class="rg-chips" style="justify-content:flex-start">' + adds + '</div></div>'
      + '<div class="pl-card"><h3>' + icon("i-check") + 'قبل ما تبدأون</h3>'
      + creditAlert(P.steps.length)
      + '<div class="pl-check">'
      + '<button type="button" data-pl="ck-teams">' + icon("i-users") + 'الفرق: ' + store.teams.map(function(t){ return escapeHtml(t.name); }).join("، ") + '<small>تعديل</small></button>'
      + '<button type="button" data-pl="ck-buzz">' + icon("i-buzz") + 'وصّلوا جوالات «أسرع إصبع» (اختياري)<small>' + (store.buzz.enabled ? "شغّالة" : "افتح") + '</small></button>'
      + '<button type="button" data-pl="ck-fs">' + icon("i-expand") + 'ملء الشاشة للتلفزيون<small>شغّل</small></button>'
      + '<button type="button" data-pl="ck-sound">' + icon("i-volume") + 'جرّبوا الصوت<small>تشغيل</small></button>'
      + '</div>'
      + '<div class="pl-actions"><button class="btn-primary btn-lg" type="button" data-pl="start">' + icon("i-play") + ' ابدأ السهرة</button>'
      + '<span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-ghost" type="button" data-pl="setup">' + icon("i-wand") + ' رتّبها من جديد</button><button class="btn-ghost" type="button" data-pl="discard">احذف الخطة</button></span></div></div>';
  }
  function planRunHtml(){
    var P = store.plan, s = P.steps[P.cur];
    return '<div class="pl-steps"><span><b>1</b>الإعدادات</span><span><b>2</b>الخطة</span><span class="on"><b>3</b>السهرة</span></div>'
      + '<div class="pl-card"><h3>' + icon("i-play") + 'الجولة ' + (P.cur + 1) + ' من ' + P.steps.length + ': ' + GAME_INFO[s.g].name + '</h3>'
      + '<p class="sub">' + (s.status === "live" ? "الجولة شغّالة — كمّلوها وبعدها تطلع النتائج." : stepDesc(s) + " · ≈ " + s.est + " د") + '</p>'
      + '<div class="pl-actions" style="margin-bottom:16px"><button class="btn-primary" type="button" data-pl="go">' + icon("i-play") + (s.status === "live" ? " ارجع للجولة" : " ابدأ الجولة") + '</button>'
      + '<span style="display:flex;gap:8px;flex-wrap:wrap">' + (s.g === "mafia" && s.status === "live" ? '<button class="btn-soft" type="button" data-pl="done-mafia">' + icon("i-check") + ' خلصت المافيا</button>' : '')
      + '<button class="btn-ghost" type="button" data-pl="score">' + icon("i-trophy") + ' النتائج</button><button class="btn-ghost" type="button" data-pl="skip">تخطّي الجولة</button><button class="btn-ghost" type="button" data-pl="end">🏁 أنهِ السهرة</button></span></div>'
      + planRoundsHtml(P, false) + '</div>';
  }
  function rankedTeams(){ return store.teams.slice().sort(function(a, b){ return b.score - a.score; }); }
  function winnerTitle(){
    var r = rankedTeams();
    if(!r.length) return "خلصت السهرة";
    var top = r.filter(function(t){ return t.score === r[0].score; });
    if(top.length > 1) return "تعادل بين " + top.map(function(t){ return t.name; }).join(" و") + "!";
    return "فاز " + r[0].name + " بالسهرة!";
  }
  function podiumHtml(){
    var r = rankedTeams().slice(0, 3); if(!r.length) return "";
    var order = r.length === 1 ? [0] : r.length === 2 ? [1, 0] : [1, 0, 2], md = ["🥇", "🥈", "🥉"];
    return '<div class="podium">' + order.map(function(i){
      var t = r[i];
      return '<div class="pd p' + (i + 1) + '" style="--c:' + t.color + '"><span class="md">' + md[i] + '</span><span class="nm">' + escapeHtml(t.name) + '</span><span class="blk">' + t.score + '</span></div>';
    }).join("") + '</div>';
  }
  function breakdownHtml(P){
    var done = P.steps.filter(function(s){ return s.status === "done" && isObj(s.delta); });
    if(!done.length) return "";
    return '<details class="tbl" style="text-align:right;margin:4px 0 16px"><summary style="cursor:pointer;color:var(--tx-2);font-weight:600;font-size:.88rem">نقاط كل جولة</summary>'
      + '<div style="overflow-x:auto;margin-top:10px"><table style="width:100%;border-collapse:collapse;font-size:.86rem"><tr><th style="text-align:right;padding:6px 8px;color:var(--tx-3)">الجولة</th>'
      + store.teams.map(function(t){ return '<th style="padding:6px 8px;color:var(--tx-2)">' + escapeHtml(t.name) + '</th>'; }).join("") + '</tr>'
      + done.map(function(s){ return '<tr style="border-top:1px solid var(--line)"><td style="padding:6px 8px">' + GAME_INFO[s.g].name + '</td>'
        + store.teams.map(function(t){ var d = s.delta[t.id] | 0; return '<td style="padding:6px 8px;text-align:center;font-variant-numeric:tabular-nums;color:' + (d > 0 ? "var(--ok)" : "var(--tx-3)") + '">' + (d > 0 ? "+" + d : d) + '</td>'; }).join("") + '</tr>'; }).join("")
      + '</table></div></details>';
  }
  function planFinalHtml(){
    var P = store.plan;
    return '<div class="pl-card" style="text-align:center"><span class="pm-kicker">🏁 خلصت السهرة</span><h3 style="justify-content:center;font-size:1.6rem;margin:6px 0 4px">' + escapeHtml(winnerTitle()) + '</h3>'
      + podiumHtml() + scoreListHtml(null) + breakdownHtml(P)
      + '<div class="pl-actions" style="justify-content:center"><button class="btn-primary" type="button" data-pl="summary">🏆 ملخص السهرة</button><button class="btn-soft" type="button" data-pl="new-night">🎉 سهرة جديدة</button><button class="btn-ghost" type="button" data-pl="new-plan">' + icon("i-wand") + ' خطة جديدة بنفس الفرق</button></div></div>';
  }
  function planBuild(){
    var D = planDraft();
    var steps = suggestPlan(D.minutes, D.games);
    if(!steps.length){ toast("اختاروا لعبة وحدة على الأقل"); return; }
    store.plan = { minutes:D.minutes, steps:steps, cur:0, started:false, finished:false, editing:false };
    persist(); renderPlan(); renderPlannerCard(); window.scrollTo({ top:0 });
    if(D.games.indexOf("mafia") !== -1 && !steps.some(function(s){ return s.g === "mafia"; })) toast("المافيا تحتاج 40 دقيقة أو أكثر — ما حطيناها بالخطة");
  }
  function planStart(){
    var P = store.plan; if(!P || !P.steps.length) return;
    if(store.teams.length < 2){ toast("أضيفوا فريقين على الأقل"); return; }
    var hasScores = store.teams.some(function(t){ return t.score !== 0; });
    (hasScores ? ask("نبدأ السهرة؟", "بنصفّر نقاط الفرق عشان السهرة تبدأ من الصفر.", "▶ صفّر وابدأ") : Promise.resolve(true)).then(function(ok){
      if(!ok) return;
      store.teams.forEach(function(t){ t.score = 0; });
      store.win.shown = "";
      store.night = null;   /* (v11) إحصائيات الملخص تبدأ مع السهرة */
      P.started = true; P.finished = false; P.cur = 0; P.startedAt = Date.now(); P.editing = false;
      P.steps.forEach(function(s){ s.status = "todo"; delete s.round; delete s.before; delete s.delta; });
      persist(); renderTeams();
      toast("🎉 بدأت السهرة — بالتوفيق للكل!");
      planGo();
    });
  }
  /* لو اللعبة فيها جولة شغالة من قبل، نحسبها هي جولة الخطة */
  function gameRoundActive(g){
    var fns = { trivia:trivActive, emoji:emojiActive, letters:lettersActive, flags:flagsActive, heads:headsActive, charades:charActive, million:mlActive };
    return fns[g] ? fns[g]() : false;
  }
  function planGo(){
    var s = planStep(); if(!s){ renderPlan(); return; }
    if(s.size != null) store.sizes[s.g] = s.size;
    if(s.status === "todo" && s.g !== "mafia" && gameRoundActive(s.g)){
      s.status = "live"; s.round = store[s.g].round.id; s.kind = store[s.g].round.kind; s.before = scoresNow();
    }
    persist(); closePlanModal();
    showView(s.g);
  }
  function planOnStart(game, d){
    var s = planStep();
    if(!s || s.g !== game || s.status !== "todo") return;
    s.status = "live"; s.round = d.round; s.kind = d.kind; s.before = scoresNow();
    if(typeof d.size === "number") s.size = d.size;
    persist(); renderPlanBar();
  }
  function planOnDone(game){
    var s = planStep();
    if(!s || s.g !== game || s.status !== "live") return;
    if(game !== "mafia"){
      var R = store[game] && store[game].round;
      if(!R || String(R.id) !== String(s.round)) return;
    }
    planFinishStep("done");
  }
  function planFinishStep(status){
    var P = store.plan, s = P.steps[P.cur], idx = P.cur;
    s.status = status;
    if(s.before){ s.delta = {}; store.teams.forEach(function(t){ s.delta[t.id] = t.score - (s.before[t.id] || 0); }); }
    P.cur += 1;
    if(P.cur >= P.steps.length){ P.finished = true; P.endedAt = Date.now(); }
    persist(); renderPlanBar(); renderPlannerCard();
    if(curView === "plan") renderPlan();
    if(P.finished) openPlanModal(-1);
    else if(status === "done") openPlanModal(idx);
  }
  function planSkip(){
    var s = planStep(); if(!s) return;
    ask("نتخطّى هالجولة؟", "«" + GAME_INFO[s.g].name + "» " + (s.status === "live" ? "شغّالة الحين — بنحسب نقاطها لين هنا ونروح للي بعدها." : "بتنشال من السهرة ونروح للي بعدها."), "⏭️ إيه، تخطّاها").then(function(ok){
      if(!ok) return;
      planFinishStep(s.status === "live" ? "done" : "skip");
      if(!store.plan.finished && s.status === "skip") toast("تخطّينا «" + GAME_INFO[s.g].name + "»");
    });
  }
  function planEnd(){
    ask("ننهي السهرة الحين؟", "الجولات الباقية بتنشال، ونعلن الفائز على النقاط الحالية.", "🏁 إيه، أعلن الفائز").then(function(ok){
      if(!ok || !store.plan) return;
      var P = store.plan, s = P.steps[P.cur];
      if(s && s.status === "live" && s.before){ s.status = "done"; s.delta = {}; store.teams.forEach(function(t){ s.delta[t.id] = t.score - (s.before[t.id] || 0); }); }
      P.steps.forEach(function(x){ if(x.status === "todo" || x.status === "live") x.status = "skip"; });
      P.cur = P.steps.length; P.finished = true; P.endedAt = Date.now();
      persist(); renderPlanBar(); renderPlannerCard(); if(curView === "plan") renderPlan();
      openPlanModal(-1);
    });
  }
  planEls.body.addEventListener("click", function(e){
    var b = e.target.closest("[data-pl]"); if(!b || b.disabled) return;
    var a = b.getAttribute("data-pl"), D = planDraft(), P = store.plan, i = +b.getAttribute("data-i");
    if(a === "min"){ D.minutes = +b.getAttribute("data-v"); persist(); renderPlan(); }
    else if(a === "game"){
      var g = b.getAttribute("data-g"), k = D.games.indexOf(g);
      if(k === -1) D.games.push(g); else D.games.splice(k, 1);
      persist(); renderPlan();
    }
    else if(a === "team-add"){
      if(store.teams.length >= 6){ toast("أقصى عدد فرق هو 6"); return; }
      store.teams.push({ id:uid(), name:"فريق " + (store.teams.length + 1), color:TEAM_PALETTE[store.teams.length % TEAM_PALETTE.length], score:0 });
      teamsUpdated(); renderPlan();
    }
    else if(a === "team-del"){
      if(store.teams.length <= 2) return;
      store.teams = store.teams.filter(function(t){ return t.id !== b.getAttribute("data-t"); });
      teamsUpdated(); renderPlan();
    }
    else if(a === "suggest") planBuild();
    else if(a === "back-edit"){ if(P){ P.editing = false; persist(); renderPlan(); } }
    else if(a === "setup"){ if(P){ P.editing = true; persist(); } renderPlan(); }
    else if(a === "discard"){
      ask("نحذف الخطة؟", "ترجعون لإعدادات المخطط.", "إيه، احذفها").then(function(ok){ if(ok){ store.plan = null; persist(); renderPlan(); renderPlannerCard(); } });
    }
    else if(a === "size" && P && P.steps[i]){
      var s = P.steps[i]; s.size = +b.getAttribute("data-v"); s.est = estMinutes(s.g, s.size); persist(); renderPlan();
    }
    else if((a === "up" || a === "down") && P){
      var j = a === "up" ? i - 1 : i + 1;
      if(j < 0 || j >= P.steps.length) return;
      var t = P.steps[i]; P.steps[i] = P.steps[j]; P.steps[j] = t; persist(); renderPlan();
    }
    else if(a === "del" && P && P.steps.length > 1){ P.steps.splice(i, 1); persist(); renderPlan(); renderPlannerCard(); }
    else if(a === "add" && P){
      var g2 = b.getAttribute("data-g"), z = cfgSize(g2), n = z ? z.def : null;
      if(P.steps.length >= 30){ toast("أقصى شي 30 جولة"); return; }
      P.steps.push({ g:g2, size:n, est:estMinutes(g2, n), status:"todo" }); persist(); renderPlan(); renderPlannerCard();
    }
    else if(a === "start") planStart();
    else if(a === "go") planGo();
    else if(a === "skip") planSkip();
    else if(a === "end") planEnd();
    else if(a === "score") openScoreboard();
    else if(a === "done-mafia") planOnDone("mafia");
    else if(a === "new-night") openResetModal();
    else if(a === "summary") openSummary();
    else if(a === "new-plan"){ store.plan = null; store.teams.forEach(function(t){ t.score = 0; }); store.win.shown = ""; persist(); renderTeams(); renderPlan(); renderPlannerCard(); renderPlanBar(); }
    else if(a === "ck-teams") openTeams();
    else if(a === "ck-buzz") openBuzzPanel();
    else if(a === "ck-fs") toggleFullscreen();
    else if(a === "ck-sound"){ buzzUnlockAudio(); buzzBeep(); toast("🔊 سمعتوا الصوت؟ ارفعوا الصوت إذا لا"); }
  });
  planEls.body.addEventListener("input", function(e){
    var inp = e.target.closest("[data-pl-team]"); if(!inp) return;
    var t = teamOf(inp.getAttribute("data-pl-team"));
    if(t){ t.name = inp.value.trim() || t.name; persist(); renderTriviaAwardButtons(); renderEmojiAward(); renderCharTurnBanner(); teamsChanged(); if(!els.teamsPanel.hidden) renderTeams(); }
  });

  /* ---------- شريط السهرة (أعلى صفحات الألعاب) + زر بالشريط العلوي ---------- */
  var planBarEl = document.getElementById("planBar");
  function renderPlanBar(){
    var on = planActive(), chip = document.getElementById("planChip");
    if(chip){ chip.hidden = !on; if(on) document.getElementById("planChipN").textContent = (store.plan.cur + 1) + "/" + store.plan.steps.length; }
    var show = on && GAME_ORDER.indexOf(curView) !== -1;
    planBarEl.hidden = !show;
    if(!show){ planBarEl.innerHTML = ""; if(typeof fitTopbar === "function") fitTopbar(); return; }
    var P = store.plan, s = P.steps[P.cur], here = curView === s.g;
    var track = P.steps.map(function(x, i){ return '<i class="' + (i < P.cur ? "done" : i === P.cur ? "live" : "") + '"></i>'; }).join("");
    var btns = "";
    if(!here) btns += '<button class="btn-primary btn-sm" type="button" data-pb="go">' + icon("i-play") + ' روح للجولة</button>';
    else if(s.g === "mafia" && s.status === "live") btns += '<button class="btn-primary btn-sm" type="button" data-pb="done">' + icon("i-check") + ' خلصت الجولة</button>';
    btns += '<button class="btn-ghost btn-sm" type="button" data-pb="skip">تخطّي</button><button class="btn-ghost btn-sm" type="button" data-pb="plan">الخطة</button>';
    planBarEl.innerHTML = '<span class="pb-step">الجولة ' + (P.cur + 1) + ' <small>من ' + P.steps.length + '</small></span>'
      + '<div class="pb-track" aria-hidden="true">' + track + '</div>'
      + '<span class="pb-now">' + icon(GAME_INFO[s.g].ic) + GAME_INFO[s.g].name + (s.size != null ? ' · ' + sizeLabel(s.g, s.size) : '') + (s.status === "live" ? ' · <span style="color:var(--ok)">شغّالة</span>' : '') + '</span>'
      + '<div class="pb-btns">' + btns + '</div>';
    if(typeof fitTopbar === "function") fitTopbar();
  }
  planBarEl.addEventListener("click", function(e){
    var b = e.target.closest("[data-pb]"); if(!b) return;
    var a = b.getAttribute("data-pb");
    if(a === "go") planGo();
    else if(a === "done") planOnDone("mafia");
    else if(a === "skip") planSkip();
    else if(a === "plan") showView("plan");
  });
  document.getElementById("planChip").addEventListener("click", function(){ showView("plan"); });

  /* ---------- بطاقة المخطط بالرئيسية ---------- */
  var plannerCardEl = document.getElementById("plannerCard");
  function planMiniSteps(P){
    var from = P.started && !P.finished ? Math.max(0, Math.min(P.cur, P.steps.length - 4)) : 0;
    return P.steps.slice(from, from + 4).map(function(s, k){
      var i = from + k, cls = s.status === "done" || s.status === "skip" ? " done" : (P.started && !P.finished && i === P.cur ? " live" : "");
      var a = GAME_INFO[s.g].accent;
      return '<div class="pc-step' + cls + '" style="--a:var(--' + a + ');--ab:var(--' + a + '-bright)"><span class="gi">' + icon(GAME_INFO[s.g].ic) + '</span>'
        + GAME_INFO[s.g].name + (s.size != null ? ' · ' + sizeLabel(s.g, s.size) : '') + '<span class="t">' + (s.status === "done" ? "✓" : "≈ " + s.est + " د") + '</span></div>';
    }).join("");
  }
  function renderPlannerCard(){
    if(!plannerCardEl) return;
    var P = store.plan, html;
    if(P && P.started && !P.finished){
      var s = P.steps[P.cur], done = P.steps.filter(function(x){ return x.status === "done" || x.status === "skip"; }).length;
      html = '<div><span class="eyebrow"><span class="dot"></span>السهرة شغّالة</span><h3>الجولة ' + (P.cur + 1) + ' من ' + P.steps.length + ': ' + GAME_INFO[s.g].name + '</h3>'
        + '<div class="pc-progress"><i style="width:' + Math.round(done / P.steps.length * 100) + '%"></i></div>'
        + '<p>' + (s.status === "live" ? "الجولة شغّالة — كمّلوها وبعدها تطلع النتائج." : "الجولة الجاية: " + stepDesc(s) + " (≈ " + s.est + " د).") + '</p>'
        + '<div class="pc-btns"><button class="btn-primary" type="button" data-pc="go">' + icon("i-play") + ' كمّل السهرة</button><button class="btn-ghost" type="button" data-pc="score">' + icon("i-trophy") + ' النتائج</button><button class="btn-ghost" type="button" data-pc="plan">الخطة</button></div></div>'
        + '<div class="pc-visual">' + planMiniSteps(P) + '</div>';
    } else if(P && P.finished){
      html = '<div><span class="eyebrow"><span class="dot"></span>خلصت السهرة</span><h3>' + escapeHtml(winnerTitle()) + ' 🏆</h3><p>شوفوا الترتيب النهائي ونقاط كل جولة، أو ابدأوا سهرة جديدة.</p>'
        + '<div class="pc-btns"><button class="btn-primary" type="button" data-pc="final">' + icon("i-trophy") + ' النتائج النهائية</button><button class="btn-ghost" type="button" data-pc="plan">' + icon("i-wand") + ' خطة جديدة</button></div></div>'
        + '<div class="pc-visual">' + planMiniSteps(P) + '</div>';
    } else if(P && P.steps && P.steps.length){
      html = '<div><span class="eyebrow"><span class="dot"></span>خطتكم جاهزة</span><h3>' + arN(P.steps.length, "جولة وحدة", "جولتين", "جولات", "جولة") + ' · ≈ ' + planTotal(P) + ' دقيقة</h3><p>راجعوا الترتيب وحجم كل جولة، وابدأوا السهرة.</p>'
        + '<div class="pc-btns"><button class="btn-primary" type="button" data-pc="plan">' + icon("i-play") + ' راجع وابدأ</button></div></div>'
        + '<div class="pc-visual">' + planMiniSteps(P) + '</div>';
    } else {
      var sample = { steps:[{ g:"trivia", size:null, est:18, status:"todo" }, { g:"emoji", size:null, est:10, status:"todo" }, { g:"letters", size:null, est:15, status:"todo" }, { g:"charades", size:null, est:14, status:"todo" }].filter(function(x){ return planGames().indexOf(x.g) !== -1; }) };
      html = '<div><span class="eyebrow"><span class="dot"></span>جديد</span><h3>مخطط السهرة</h3><p>قولوا لنا كم فريق، وكم وقتكم، ووش تحبون — ونرتّب لكم الجولات بالترتيب، ونمشي معكم جولة جولة لين نعلن الفائز.</p>'
        + '<div class="pc-btns"><button class="btn-primary" type="button" data-pc="plan">' + icon("i-wand") + ' خطّطوا سهرتكم</button></div></div>'
        + '<div class="pc-visual" aria-hidden="true">' + planMiniSteps(sample) + '</div>';
    }
    plannerCardEl.innerHTML = html;
  }
  plannerCardEl.addEventListener("click", function(e){
    var b = e.target.closest("[data-pc]"); if(!b) return;
    var a = b.getAttribute("data-pc");
    if(a === "go") planGo();
    else if(a === "plan"){ if(store.plan && store.plan.finished){ store.plan = null; persist(); } showView("plan"); }
    else if(a === "score") openScoreboard();
    else if(a === "final") openPlanModal(-1);
  });

  /* ---------- النتائج: بين الجولات + النهائية + لوحة النتائج ---------- */
  function scoreListHtml(delta){
    var list = rankedTeams(), max = Math.max.apply(null, list.map(function(t){ return Math.max(0, t.score); }).concat([1]));
    return '<div class="sb-list">' + list.map(function(t, i){
      var d = delta && typeof delta[t.id] === "number" ? delta[t.id] : null;
      return '<div class="sb-row' + (i === 0 && t.score > 0 ? " lead" : "") + '" style="--c:' + t.color + ';--w:0%" data-w="' + Math.round(Math.max(0, t.score) / max * 100) + '%"><span class="bar"></span>'
        + '<span class="rk">' + (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1)) + '</span>'
        + '<span class="nm"><i></i>' + escapeHtml(t.name) + '</span>'
        + '<span class="sc">' + t.score + (d ? '<small>' + (d > 0 ? "+" : "") + d + '</small>' : '') + '</span></div>';
    }).join("") + '</div>';
  }
  function growBars(root){
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      root.querySelectorAll(".sb-row[data-w]").forEach(function(r){ r.style.setProperty("--w", r.getAttribute("data-w")); });
    }); });
  }
  var planModalEl = document.getElementById("planModal"), planModalBox = document.getElementById("planModalBox");
  function closePlanModal(){ planModalEl.hidden = true; }
  function openPlanModal(idx){
    var P = store.plan; if(!P) return;
    var html;
    if(idx < 0 || P.finished){
      html = '<button class="teams-close" type="button" data-pm="close" aria-label="إغلاق">✕</button>'
        + '<span class="pm-kicker">🏁 خلصت السهرة</span>'
        + '<h3 style="font-size:1.6rem;margin:4px 0 2px">' + escapeHtml(winnerTitle()) + '</h3>'
        + podiumHtml() + scoreListHtml(null) + breakdownHtml(P)
        + '<div class="pm-btns"><button class="btn-primary btn-lg" type="button" data-pm="summary">🏆 ملخص السهرة</button><button class="btn-soft" type="button" data-pm="new">🎉 سهرة جديدة</button><button class="btn-ghost" type="button" data-pm="close">إغلاق</button></div>';
      confetti();
      try{ buzzUnlockAudio(); if(buzz.audio){ var au = buzz.audio, t0 = au.currentTime; [523, 659, 784, 1047, 1319].forEach(function(f, i){ var o = au.createOscillator(), g = au.createGain(); o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + i * 0.13); g.gain.exponentialRampToValueAtTime(0.18, t0 + i * 0.13 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.13 + 0.5); o.connect(g); g.connect(au.destination); o.start(t0 + i * 0.13); o.stop(t0 + i * 0.13 + 0.55); }); } }catch(e){}
    } else {
      var s = P.steps[idx], next = P.steps[P.cur];
      html = '<button class="teams-close" type="button" data-pm="close" aria-label="إغلاق">✕</button>'
        + '<span class="pm-kicker">' + icon("i-check") + ' خلصت الجولة ' + (idx + 1) + ' من ' + P.steps.length + '</span>'
        + '<h3 style="font-size:1.45rem;margin:4px 0 16px">النتائج بعد «' + GAME_INFO[s.g].name + '»</h3>'
        + scoreListHtml(s.delta)
        + (next ? '<div class="pm-next" style="' + accentStyle(next.g) + '">' + gTile(next.g) + '<div><small>الجولة الجاية</small><b>' + GAME_INFO[next.g].name + '</b><small>' + stepDesc(next) + ' · ≈ ' + next.est + ' د</small></div></div>' : '')
        + '<div class="pm-btns">' + (next ? '<button class="btn-primary btn-lg" type="button" data-pm="go">' + icon("i-play") + ' يلا: ' + GAME_INFO[next.g].name + '</button>' : '')
        + '<button class="btn-ghost" type="button" data-pm="close">نرتاح شوي</button></div>';
    }
    planModalBox.innerHTML = html;
    planModalEl.hidden = false;
    growBars(planModalBox);
  }
  planModalEl.addEventListener("click", function(e){
    if(e.target === planModalEl){ closePlanModal(); return; }
    var b = e.target.closest("[data-pm]"); if(!b) return;
    var a = b.getAttribute("data-pm");
    if(a === "close") closePlanModal();
    else if(a === "go") planGo();
    else if(a === "new"){ closePlanModal(); openResetModal(); }
    else if(a === "summary") openSummary();
  });
  /* ======================================================================
     (v11) 🏆 ملخص السهرة — صورة فيها الفائز والترتيب وأرقام السهرة، تنشارك بالواتساب
     store.night: { at, rounds:[{ g, at, before:{فريق: نقاط} }], fast:{ "فريق|اسم": { t, n, c } } }
     ====================================================================== */
  function nightGet(){
    if(!isObj(store.night) || !Array.isArray(store.night.rounds) || !isObj(store.night.fast)) store.night = { at: Date.now(), rounds: [], fast: {} };
    return store.night;
  }
  function nightRound(g){
    var N = nightGet();
    N.rounds.push({ g: g, at: Date.now(), before: scoresNow() });
    if(N.rounds.length > 80) N.rounds = N.rounds.slice(-80);
    persist();
  }
  /* «أسرع إصبع»: ضغط أول وجاوب صح، أو أسرع فريق صح من الجوال */
  function nightFast(tid, name){
    if(!tid) return;
    var N = nightGet(), nm = String(name || "").replace(/\s+/g, " ").trim().slice(0, 20), key = tid + "|" + nm;
    var f = N.fast[key] || (N.fast[key] = { t: tid, n: nm, c: 0 });
    f.c += 1;
    persist();
  }
  function arDur(ms){
    var m = Math.max(1, Math.round(ms / 60000)), h = Math.floor(m / 60), r = m % 60;
    var hs = h ? arN(h, "ساعة", "ساعتين", "ساعات", "ساعة") : "", ms2 = r ? arN(r, "دقيقة", "دقيقتين", "دقايق", "دقيقة") : "";
    return hs && ms2 ? hs + " و" + ms2 : hs || ms2;
  }
  function nightSummary(){
    var N = nightGet(), now = scoresNow(), ranked = rankedTeams(), best = null, games = [], fast = null;
    N.rounds.forEach(function(r, i){
      if(games.indexOf(r.g) === -1 && GAME_INFO[r.g]) games.push(r.g);
      var after = i + 1 < N.rounds.length ? N.rounds[i + 1].before : now;
      store.teams.forEach(function(t){
        if(!isObj(r.before) || !(t.id in r.before) || !isObj(after) || !(t.id in after)) return;
        var d = after[t.id] - r.before[t.id];
        if(d > 0 && (!best || d > best.d)) best = { t: t, d: d, g: r.g };
      });
    });
    Object.keys(N.fast).forEach(function(k){
      var f = N.fast[k], t = teamOf(f.t);
      if(t && (!fast || f.c > fast.c)) fast = { t: t, n: f.n, c: f.c };
    });
    var P = store.plan, start = P && P.started && P.startedAt ? Math.min(P.startedAt, N.at || P.startedAt) : N.at;
    var end = P && P.finished && P.endedAt ? P.endedAt : Date.now();
    var date = "";
    try{ date = new Date().toLocaleDateString("ar-SA-u-nu-latn-ca-gregory", { weekday: "long", day: "numeric", month: "long" }); }catch(e){}
    return { ranked: ranked, title: winnerTitle(), rounds: N.rounds.length, games: games, best: best, fast: fast,
             dur: N.rounds.length && start ? arDur(end - start) : "", date: date };
  }
  function sumStats(D){
    var out = [];
    if(D.rounds) out.push({ ic: "🎮", k: "الجولات", v: arN(D.rounds, "جولة وحدة", "جولتين", "جولات", "جولة"), s: D.games.map(function(g){ return GAME_INFO[g].name; }).join("، ") });
    if(D.dur) out.push({ ic: "⏱️", k: "مدة السهرة", v: D.dur, s: "" });
    if(D.fast) out.push({ ic: "⚡", k: "أسرع إصبع", v: D.fast.n || D.fast.t.name, s: (D.fast.n ? D.fast.t.name + " · " : "") + arN(D.fast.c, "مرة وحدة", "مرتين", "مرات", "مرة") });
    if(D.best) out.push({ ic: "🔥", k: "أقوى جولة", v: D.best.t.name + " +" + D.best.d, s: "بـ«" + GAME_INFO[D.best.g].name + "»" });
    return out;
  }
  function sumText(){
    var D = nightSummary(), md = ["🥇", "🥈", "🥉"];
    var lines = ["🏆 ملخص سهرتنا — طاولة السهرة", D.title, ""];
    D.ranked.forEach(function(t, i){ lines.push((md[i] || (i + 1) + ".") + " " + t.name + ": ‎" + t.score); });
    var st = sumStats(D);
    if(st.length) lines.push("");
    st.forEach(function(s){ lines.push(s.ic + " " + s.k + ": " + s.v + (s.s ? " (" + s.s + ")" : "")); });
    lines.push("", "العبوا معنا: " + location.origin + "/");
    return lines.join("\n");
  }
  function hexA(c, a){
    var m = /^#?([0-9a-f]{6})$/i.exec(String(c || "").trim());
    if(!m) return "rgba(124,92,255," + a + ")";
    var n = parseInt(m[1], 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }
  function sumDraw(){
    var D = nightSummary(), st = sumStats(D), teams = D.ranked.slice(0, 6);
    var W = 1080, rowH = 86, tileH = 132, gap = 18, tileRows = Math.ceil(st.length / 2);
    var top = 500, rankH = teams.length * rowH, statsY = top + rankH + 34, H = statsY + tileRows * (tileH + gap) + 120;
    var cv = document.createElement("canvas"), x = cv.getContext("2d");
    cv.width = W; cv.height = H;
    var FD = "Alexandria, 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif", FB = "'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif";
    var bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#17113a"); bg.addColorStop(1, "#06050d");
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    var gl = x.createRadialGradient(W / 2, 330, 30, W / 2, 330, 620); gl.addColorStop(0, "rgba(250,204,21,.22)"); gl.addColorStop(1, "rgba(250,204,21,0)");
    x.fillStyle = gl; x.fillRect(0, 0, W, H);
    x.direction = "rtl"; x.textBaseline = "alphabetic";
    function fit(s, maxW){ s = String(s); if(x.measureText(s).width <= maxW) return s; while(s.length > 1 && x.measureText(s + "…").width > maxW) s = s.slice(0, -1); return s + "…"; }
    function txt(s, px, py, font, color, align, maxW){
      var num = /^[-+−]?\d+$/.test(String(s));   /* الأرقام السالبة: الإشارة قبل الرقم */
      x.font = font; x.fillStyle = color; x.textAlign = align || "center"; x.direction = num ? "ltr" : "rtl";
      x.fillText(fit(s, maxW || W - 140), px, py);
      x.direction = "rtl";
    }
    function box(bx, by, bw, bh, r){
      x.beginPath();
      if(x.roundRect) x.roundRect(bx, by, bw, bh, r);
      else { x.moveTo(bx + r, by); x.arcTo(bx + bw, by, bx + bw, by + bh, r); x.arcTo(bx + bw, by + bh, bx, by + bh, r); x.arcTo(bx, by + bh, bx, by, r); x.arcTo(bx, by, bx + bw, by, r); x.closePath(); }
    }
    txt("🌙 طاولة السهرة", W / 2, 96, "600 34px " + FB, "rgba(255,255,255,.62)");
    txt("ملخص السهرة", W / 2, 172, "800 66px " + FD, "#ffffff");
    if(D.date) txt(D.date, W / 2, 226, "500 30px " + FB, "rgba(255,255,255,.5)");
    txt("🏆", W / 2, 362, "116px " + FB, "#ffffff");
    txt(D.title, W / 2, 452, "800 56px " + FD, "#facc15");
    var L = 80, R = W - 80, max = Math.max(1, teams.length ? teams[0].score : 1), md = ["🥇", "🥈", "🥉"];
    teams.forEach(function(t, i){
      var y = top + i * rowH, h = rowH - 16;
      box(L, y, R - L, h, 24); x.fillStyle = "rgba(255,255,255,.06)"; x.fill();
      var frac = Math.max(0, Math.min(1, t.score / max)), bw = Math.max(48, (R - L) * frac);
      box(R - bw, y, bw, h, 24); x.fillStyle = hexA(t.color, i === 0 ? .55 : .35); x.fill();
      txt(md[i] || String(i + 1), R - 46, y + 50, (md[i] ? "40px " : "700 34px ") + FB, "#ffffff");
      txt(t.name, R - 92, y + 48, "700 36px " + FD, "#ffffff", "right", R - L - 260);
      txt(String(t.score), L + 34, y + 50, "800 42px " + FD, "#ffffff", "left");
    });
    var tw = (R - L - gap) / 2;
    st.forEach(function(s, i){
      var col = i % 2, row = Math.floor(i / 2), one = st.length % 2 === 1 && i === st.length - 1;
      var bx = one ? L : (col === 0 ? R - tw : L), bwid = one ? R - L : tw, by = statsY + row * (tileH + gap), cx = bx + bwid - 30;
      box(bx, by, bwid, tileH, 24); x.fillStyle = "rgba(255,255,255,.07)"; x.fill();
      x.strokeStyle = "rgba(255,255,255,.1)"; x.lineWidth = 2; x.stroke();
      txt(s.ic + " " + s.k, cx, by + 42, "600 26px " + FB, "rgba(255,255,255,.6)", "right", bwid - 60);
      txt(s.v, cx, by + 88, "800 36px " + FD, "#ffffff", "right", bwid - 60);
      if(s.s) txt(s.s, cx, by + 120, "500 22px " + FB, "rgba(255,255,255,.5)", "right", bwid - 60);
    });
    txt(location.host || "sahratable.com", W / 2, H - 48, "700 30px " + FB, "rgba(255,255,255,.55)");
    return cv;
  }
  var SUM = { blob: null, url: "" };
  var sumEls = { modal: document.getElementById("sumModal"), img: document.getElementById("sumImg"), share: document.getElementById("sumShare") };
  function openSummary(){
    if(!store.teams.length){ toast("أضيفوا الفرق أول"); return; }
    var fonts = [];
    try{ fonts = ["800 66px Alexandria", "700 36px Alexandria", "600 30px 'IBM Plex Sans Arabic'"].map(function(f){ return document.fonts.load(f); }); }catch(e){}
    var wait = new Promise(function(res){ setTimeout(res, 1500); });
    sumEls.img.removeAttribute("src");
    sumEls.modal.hidden = false;
    Promise.race([Promise.all(fonts).catch(function(){}), wait]).then(function(){
      var cv = sumDraw();
      sumEls.img.src = cv.toDataURL("image/png");
      SUM.blob = null;
      if(cv.toBlob) cv.toBlob(function(b){
        SUM.blob = b;
        var f = b && typeof File === "function" ? new File([b], "sahra-night.png", { type: "image/png" }) : null;
        try{ sumEls.share.hidden = !(f && navigator.canShare && navigator.canShare({ files: [f] })); }catch(e){ sumEls.share.hidden = true; }
      }, "image/png");
    });
  }
  function closeSummary(){ sumEls.modal.hidden = true; }
  document.getElementById("sumClose").addEventListener("click", closeSummary);
  sumEls.modal.addEventListener("click", function(e){ if(e.target === sumEls.modal) closeSummary(); });
  sumEls.share.addEventListener("click", function(){
    if(!SUM.blob) return;
    var f = new File([SUM.blob], "sahra-night.png", { type: "image/png" });
    navigator.share({ files: [f], text: sumText() }).catch(function(e){
      if(e && e.name === "AbortError") return;
      window.open("https://wa.me/?text=" + encodeURIComponent(sumText()), "_blank", "noopener");
    });
  });
  document.getElementById("sumWa").addEventListener("click", function(){
    window.open("https://wa.me/?text=" + encodeURIComponent(sumText()), "_blank", "noopener");
  });
  document.getElementById("sumSave").addEventListener("click", function(){
    if(!sumEls.img.src) return;
    var a = document.createElement("a");
    a.href = sumEls.img.src; a.download = "sahra-night.png";
    document.body.appendChild(a); a.click(); a.remove();
  });
  document.getElementById("winSumBtn").addEventListener("click", openSummary);
  document.getElementById("scoreSumBtn").addEventListener("click", openSummary);
  document.getElementById("resetSumBtn").addEventListener("click", openSummary);

  var scoreEls = { modal: document.getElementById("scoreModal"), list: document.getElementById("scoreList") };
  function openScoreboard(){
    var P = store.plan, last = null;
    if(P && P.started){ for(var i = Math.min(P.cur, P.steps.length) - 1; i >= 0; i--){ if(P.steps[i].status === "done" && isObj(P.steps[i].delta)){ last = P.steps[i].delta; break; } } }
    scoreEls.list.innerHTML = scoreListHtml(last).replace(/^<div class="sb-list">|<\/div>$/g, "");
    scoreEls.modal.hidden = false;
    growBars(scoreEls.modal);
  }
  document.getElementById("scoreClose").addEventListener("click", function(){ scoreEls.modal.hidden = true; });
  scoreEls.modal.addEventListener("click", function(e){ if(e.target === scoreEls.modal) scoreEls.modal.hidden = true; });
  document.getElementById("scoreTeamsBtn").addEventListener("click", function(){ scoreEls.modal.hidden = true; openTeams(); });
  document.getElementById("scoreHomeBtn").addEventListener("click", openScoreboard);
  document.getElementById("teamsScoreBtn").addEventListener("click", function(){ closeTeams(); openScoreboard(); });
  function confetti(){
    var box = document.getElementById("confetti"); if(!box) return;
    if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var colors = ["#7c5cff", "#a28dff", "#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#ffffff"], html = "";
    for(var i = 0; i < 90; i++){
      html += '<i style="left:' + (Math.random() * 100).toFixed(2) + '%;background:' + colors[i % colors.length] + ';animation-duration:' + (2.4 + Math.random() * 2.2).toFixed(2) + 's;animation-delay:' + (Math.random() * 0.8).toFixed(2) + 's;transform:rotate(' + Math.round(Math.random() * 360) + 'deg)"></i>';
    }
    box.innerHTML = html; box.hidden = false;
    clearTimeout(confetti.t); confetti.t = setTimeout(function(){ box.hidden = true; box.innerHTML = ""; }, 5600);
  }

  /* ---------- ملء الشاشة (للتلفزيون) ---------- */
  var fsBtn = document.getElementById("fsBtn");
  function fsOn(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function fsSync(){ fsBtn.innerHTML = icon(fsOn() ? "i-shrink" : "i-expand"); fsBtn.setAttribute("aria-label", fsOn() ? "خروج من ملء الشاشة" : "ملء الشاشة"); }
  function toggleFullscreen(){
    try{
      var p;
      if(fsOn()) p = (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else { var el = document.documentElement; p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); }
      if(p && p.catch) p.catch(function(){ toast("ملء الشاشة ما اشتغل بهالمتصفح"); });
    }catch(e){ toast("ملء الشاشة ما اشتغل بهالمتصفح"); }
  }
  if(!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) fsBtn.hidden = true;
  fsBtn.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", fsSync);
  document.addEventListener("webkitfullscreenchange", fsSync);

  /* ============ التشغيل ============ */
  var bootEls = {
    overlay: document.getElementById("bootOverlay"),
    msg: document.getElementById("bootMsg"),
    spinner: document.getElementById("bootSpinner")
  };
  function bootShowError(text){
    bootEls.overlay.hidden = false;
    bootEls.spinner.hidden = true;
    bootEls.msg.innerHTML = '<span class="boot-error">' + escapeHtml(text) + '</span>' +
      '<br><button class="boot-retry" type="button" onclick="location.reload()">إعادة المحاولة 🔄</button>';
  }
  function runInit(){
    restore();
    ensureDefaultTeams();
    if(!hadSaved){ store.win.target = cfgPlay().win_target; store.heads.dur = cfgPlay().heads_dur; }
    if(HEADS_DURS.indexOf(store.heads.dur) === -1) store.heads.dur = 60;
    if(store.mafia.players.length === 0) store.mafia.counts = {mafia:0,detective:0,doctor:0};
    renderTeams();
    mRender();
    buildTimerWidget("emojiTimerWidget", "emoji", cfgPlay().emoji_secs);
    buildTimerWidget("charTimerWidget", "char", cfgPlay().char_secs);
    renderPlanBar(); renderPlannerCard();
    persist();
    bootEls.overlay.hidden = true;
    renderBuzzUI();
    if(store.buzz.enabled) buzzConnect();   /* ترجع الأزرار تشتغل لحالها بعد تحديث الصفحة، بنفس الباركود */
    ansInit();                               /* (v10) جوال الإجابات يرجع يتابع الشاشة بعد التحديث */
    recInit();                               /* (v12) 🔁 الإعادة: المايك يرجع لو كان شغّال */
    applyHeadsResult();                      /* لو راجعين من «حطها على راسك» على نفس الجهاز */
  }
  function setCatalog(c){
    CATALOG = c || {};
    HIDDEN_GAMES = Array.isArray(CATALOG.hidden) ? CATALOG.hidden.filter(function(x){ return typeof x === "string" && x !== "home"; }) : [];
  }
  function loadCatalog(){
    return sbReady.then(function(sb){ return sb.rpc("catalog"); }).then(function(r){
      if(r.error) throw r.error;
      setCatalog(typeof r.data === "string" ? JSON.parse(r.data) : (r.data || {}));
      writeJSON(CAT_KEY, CATALOG);
      return CATALOG;
    });
  }
  function arN(n, one, two, few, many){
    n = n | 0;
    if(n === 1) return one;
    if(n === 2) return two;
    var m = n % 100;
    return n + " " + (m >= 3 && m <= 10 ? few : many);
  }
  function fmtPrice(v){ var n = Number(v) || 0; return (Math.round(n) === n ? String(n) : n.toFixed(2)) + " ر.س"; }

  /* ============ الصفحة الرئيسية العامة (قبل الدخول) ============ */
  function emojiTotal(c){ return (c.emoji_v2 | 0) || (c.emoji_v1 | 0); }   /* v7: الجولات كلها «كلمة بكلمة» */
  function gameCountLine(g){
    var c = CATALOG && CATALOG.counts; if(!c) return "";
    var decks = (CATALOG.decks || []).length;
    switch(g){
      case "trivia": return c.trivia ? arN(c.trivia, "سؤال واحد", "سؤالين", "أسئلة", "سؤال") + (c.trivia_cats ? " في " + arN(c.trivia_cats, "فئة", "فئتين", "فئات", "فئة") : "") : "";
      case "emoji": var n = emojiTotal(c); return n ? arN(n, "لغز واحد", "لغزين", "ألغاز", "لغز") + " كلمة بكلمة" : "";
      case "letters": return c.letters ? arN(c.letters, "سؤال واحد", "سؤالين", "أسئلة", "سؤال") + " على " + arN(c.letters_n, "حرف", "حرفين", "حروف", "حرف") : "";
      case "flags": return c.flags ? arN(c.flags, "علم واحد", "علمين", "أعلام", "علم") : "";
      case "heads": return c.heads ? arN(c.heads, "كلمة وحدة", "كلمتين", "كلمات", "كلمة") + (decks ? " في " + arN(decks, "فئة", "فئتين", "فئات", "فئة") : "") : "";
      case "charades": return c.charades ? arN(c.charades, "عنوان واحد", "عنوانين", "عناوين", "عنوان") : "";
      case "million": return c.million ? arN(c.million, "سؤال واحد", "سؤالين", "أسئلة", "سؤال") + " بثلاث صعوبات" : "";
      case "mafia": return "من 4 لاعبين وفوق";
      case "rope": return c.rope ? arN(c.rope, "مرحلة وحدة", "مرحلتين", "مراحل", "مرحلة") + " — كل وحدة مختلفة" : "";
    }
    return "";
  }
  function gameRoundsLine(g){
    var c = CATALOG && CATALOG.counts; if(!c) return "";
    var z = cfgSize(g), n = z ? z.def : 10;
    var per = { trivia:[c.trivia, n * 4], emoji:[emojiTotal(c), n], letters:[c.letters, n * n], flags:[c.flags, n], heads:[c.heads, n * 2], charades:[c.charades, n], million:[c.million, (n + 3) * 3], rope:[c.rope, 1] }[g];
    if(!per || !per[0]) return "";
    var n = Math.floor(per[0] / per[1]);
    return n >= 2 ? "تكفي حوالي " + roundsWord(n) + " بدون تكرار" : "";
  }
  function fmtNum(n){ return (Number(n) || 0).toLocaleString("en-US"); }
  function packsHtml(buyLabel){
    var packs = (CATALOG && CATALOG.packages) || [];
    if(!packs.length) return '<p class="ld-lead">الباقات تنضاف قريب.</p>';
    var best = null;
    packs.forEach(function(pk){ var per = pk.price / pk.rounds; if(packs.length > 1 && (!best || per < best.per - 1e-9)) best = { id: pk.id, per: per }; });
    return packs.map(function(pk){
      var per = pk.price / pk.rounds, isBest = !!best && best.id === pk.id, n = pk.rounds | 0;
      return '<div class="pack' + (isBest ? " best" : "") + '">'
        + (isBest ? '<span class="tag">الأوفر</span>' : '')
        + '<div class="n">' + n + '</div><div class="nl">' + (n === 1 ? "جولة" : n === 2 ? "جولتين" : (n % 100 >= 3 && n % 100 <= 10 ? "جولات" : "جولة")) + '</div>'
        + '<div class="price">' + fmtPrice(pk.price) + '</div>'
        + '<div class="per">' + (n > 1 ? fmtPrice(Math.round(per * 100) / 100) + " للجولة" : "&nbsp;") + '</div>'
        + '<ul class="feats"><li>' + icon("i-check") + 'كل جولة لأي لعبة تختارها</li><li>' + icon("i-check") + 'مخطط السهرة والنتائج</li><li>' + icon("i-check") + 'أسرع إصبع بالجوالات</li></ul>'
        + '<button class="btn-primary" type="button" data-buy="' + escapeHtml(pk.id) + '">' + buyLabel + '</button>'
        + '</div>';
    }).join("");
  }
  function contentTotal(){
    var c = CATALOG && CATALOG.counts; if(!c) return 0;
    return (c.trivia | 0) + emojiTotal(c) + (c.letters | 0) + (c.flags | 0) + (c.heads | 0) + (c.charades | 0) + (c.million | 0);
  }
  function renderLanding(){
    var hidden = HIDDEN_GAMES, games = GAME_ORDER.filter(function(g){ return hidden.indexOf(g) === -1; });
    document.getElementById("ldGames").innerHTML = games.map(function(g){
      var info = GAME_INFO[g], cl = gameCountLine(g), rl = gameRoundsLine(g), z = cfgSize(g);
      return '<article class="ld-game reveal" style="' + accentStyle(g) + '">' + gTile(g)
        + '<h3>' + info.name + '</h3><p>' + info.desc + '</p><ul>'
        + '<li><b>الجولة:</b><span>' + roundDesc(g, z ? z.def : null) + '</span></li>'
        + '<li><b>مجانًا:</b><span>' + trialDesc(g) + '</span></li>'
        + (cl ? '<li><b>المحتوى:</b><span>' + cl + (rl ? " — " + rl : "") + '</span></li>' : '')
        + '</ul></article>';
    }).join("");
    var one = games.map(function(g){ return '<span>' + icon(GAME_INFO[g].ic) + GAME_INFO[g].name + '</span>'; }).join("");
    document.getElementById("ldMarquee").innerHTML = one + one + one + one;
    var total = contentTotal();
    if(total > 0){
      var shown = total >= 1000 ? "+" + fmtNum(Math.floor(total / 100) * 100) : fmtNum(total);
      var st = document.querySelector("#ldStats .ld-stat:nth-child(2) b"); if(st) st.textContent = shown;
      var big = document.getElementById("ldBigCount"); if(big) big.innerHTML = escapeHtml(shown) + '<small>سؤال ولغز وعلم وكلمة</small>';
    }
    var gn = document.querySelector("#ldStats .ld-stat:nth-child(1) b"); if(gn) gn.textContent = games.length;
    document.getElementById("ldPacks").innerHTML = packsHtml("اختار الباقة");
    if(CATALOG && CATALOG.pay !== true) document.getElementById("ldPayFaq").textContent = "الشراء أونلاين قريب — وتقدر الحين تطلب الجولات من صاحب الطاولة مباشرة.";
    var cl = contactLink("السلام عليكم، عندي سؤال عن طاولة السهرة"), lc = document.getElementById("ldContact");
    lc.innerHTML = cl ? '<a href="' + escapeHtml(cl) + '" target="_blank" rel="noopener">الدعم الفني</a>' : "";
    observeReveal();
  }
  /* ظهور ناعم للأقسام وقت التمرير + شريط التنقل يغمق بعد أول تمرير */
  var revealIO = null;
  function observeReveal(){
    var els = document.querySelectorAll(".landing .reveal:not(.in)");
    if(!("IntersectionObserver" in window)){ els.forEach(function(el){ el.classList.add("in"); }); return; }
    if(!revealIO) revealIO = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add("in"); revealIO.unobserve(en.target); } });
    }, { rootMargin:"0px 0px -8% 0px", threshold:0.08 });
    els.forEach(function(el){ revealIO.observe(el); });
  }
  if("IntersectionObserver" in window){
    var offIO = new IntersectionObserver(function(es){ es.forEach(function(en){ en.target.classList.toggle("off", !en.isIntersecting); }); });
    [".ld-stage", ".ld-marquee"].forEach(function(sel){ var el = document.querySelector(sel); if(el) offIO.observe(el); });
  }
  (function(){
    var nav = document.getElementById("ldNav");
    if(!nav) return;
    var on = false;
    window.addEventListener("scroll", function(){
      var s = window.scrollY > 8;
      if(s !== on){ on = s; nav.classList.toggle("scrolled", s); }
    }, { passive:true });
  })();
  var landingCatReq = null;
  function showLanding(msg){
    bootEls.overlay.hidden = true;
    authEls.gate.hidden = true;
    document.body.classList.add("on-landing");
    document.getElementById("landing").hidden = false;
    var err = document.getElementById("ldErr");
    err.hidden = !msg; err.textContent = msg || "";
    renderLanding();
    if(!landingCatReq) landingCatReq = loadCatalog().then(renderLanding, function(){ landingCatReq = null; });
  }
  ["ldTrialBtn", "ldLoginBtn", "ldNavTrial", "ldFinalBtn"].forEach(function(id){ var b = document.getElementById(id); if(b) b.addEventListener("click", signInWithGoogle); });
  document.getElementById("ldPacks").addEventListener("click", function(e){
    var b = e.target.closest("[data-buy]"); if(!b) return;
    try{ sessionStorage.setItem("sahra-intent", "shop"); }catch(x){}
    signInWithGoogle();
  });

  /* ============ الشراء (ميسّر عن طريق دالة sahra-pay) ============ */
  var shopEls = { modal: document.getElementById("shopModal"), packs: document.getElementById("shopPacks"), note: document.getElementById("shopNote"), sub: document.getElementById("shopSub") };
  function contactLink(text){
    var c = String((CATALOG && CATALOG.contact) || "").trim();
    if(!c) return "";
    if(/^https?:\/\//.test(c)) return c;
    var digits = c.replace(/[^\d]/g, "").replace(/^00/, "");
    if(digits.length < 8) return "";
    if(digits.charAt(0) === "0") digits = "966" + digits.slice(1);
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
  }
  function openShop(){
    if(!ME){ showLanding(); return; }
    var payOn = !!(CATALOG && CATALOG.pay === true);
    shopEls.sub.textContent = "كل جولة تختار لها أي لعبة" + (ACCT.credits > 0 ? " — رصيدك الحين: " + roundsWord(ACCT.credits) : "") + ".";
    shopEls.packs.innerHTML = packsHtml(payOn ? "💳 ادفع" : "📩 اطلب");
    shopEls.note.innerHTML = payOn
      ? "الدفع آمن عن طريق بوابة ميسّر: مدى، فيزا، ماستركارد وApple Pay. الجولات تنضاف لرصيدك أول ما يتم الدفع."
        + '<br><small>بالدفع توافق على <a href="terms.html" target="_blank" rel="noopener">الشروط وسياسة الاسترجاع</a>.</small>'
      : "الدفع أونلاين قريب — الحين اطلب الباقة من صاحب الطاولة" + (contactLink("") ? " بالواتساب" : "") + "، ويضيفها لحسابك (" + escapeHtml((ME && ME.email) || "") + ").";
    shopEls.modal.hidden = false;
  }
  function closeShop(){ shopEls.modal.hidden = true; }
  document.getElementById("shopClose").addEventListener("click", closeShop);
  shopEls.modal.addEventListener("click", function(e){ if(e.target === shopEls.modal) closeShop(); });
  document.getElementById("balChip").addEventListener("click", function(){ if(!ACCT.admin) openShop(); else toast("👑 أنت الأدمن — تلعب بدون خصم"); });
  document.addEventListener("click", function(e){ if(e.target.closest("[data-shop]")) openShop(); });
  function fnError(r){
    /* نطلع رسالة الخطأ من رد الدالة (لو رجعت كود غير 2xx) */
    var ctx = r && r.error && r.error.context;
    if(ctx && typeof ctx.json === "function") return ctx.json().then(function(j){ return (j && (j.error || j.message)) || "server_error"; }, function(){ return "server_error"; });
    return Promise.resolve((r && r.error && r.error.message) || "server_error");
  }
  var PAY_ERRORS = {
    payments_not_configured: "الدفع أونلاين مو مفعّل للحين — تواصل مع صاحب الطاولة",
    bad_package: "هذي الباقة ما عادت متوفرة — حدّث الصفحة",
    login_required: "سجّل دخولك من جديد",
    bad_return_url: "رابط الموقع غير مدعوم للدفع"
  };
  shopEls.packs.addEventListener("click", function(e){
    var b = e.target.closest("[data-buy]"); if(!b) return;
    var pk = ((CATALOG && CATALOG.packages) || []).find(function(x){ return x.id === b.getAttribute("data-buy"); });
    if(!pk) return;
    if(!(CATALOG && CATALOG.pay === true)){
      var link = contactLink("السلام عليكم، أبي باقة " + roundsWord(pk.rounds) + " (" + fmtPrice(pk.price) + ") في طاولة السهرة — حسابي: " + ((ME && ME.email) || ""));
      if(link) window.open(link, "_blank", "noopener");
      else toast("تواصل مع صاحب الطاولة وعطه إيميلك: " + ((ME && ME.email) || ""));
      return;
    }
    var label = b.textContent;
    shopEls.packs.querySelectorAll("[data-buy]").forEach(function(x){ x.disabled = true; });
    b.textContent = "جاري التحويل للدفع…";
    sharedSb.functions.invoke("sahra-pay", { body: { action: "create", package: pk.id, return_url: location.origin + location.pathname } }).then(function(r){
      if(r.error) return fnError(r).then(function(code){ throw new Error(code); });
      var d = parseJ(r.data);
      if(!d || !d.url) throw new Error((d && d.error) || "server_error");
      location.href = d.url;
    }).catch(function(err){
      var code = (err && err.message) || "";
      toast(PAY_ERRORS[code] || "ما قدرنا نفتح صفحة الدفع — جرّب مرة ثانية");
      shopEls.packs.querySelectorAll("[data-buy]").forEach(function(x){ x.disabled = false; });
      b.textContent = label;
    });
  });
  function notice(title, text){
    clearTimeout(toastTimer); document.getElementById("toast").classList.remove("show");
    ask(title, text, "تمام 👍");
    document.getElementById("askNo").hidden = true;
    var restore = function(){ document.getElementById("askNo").hidden = false; };
    document.getElementById("askYes").addEventListener("click", restore, { once:true });
  }
  /* الرجوع من صفحة الدفع: ?paid=رقم_الطلب أو ?pay=back */
  function handlePaymentReturn(){
    var u; try{ u = new URL(location.href); }catch(e){ return; }
    var paid = u.searchParams.get("paid"), back = u.searchParams.get("pay");
    if(!paid && !back) return;
    ["paid", "pay", "id", "status", "message", "invoice_id"].forEach(function(k){ u.searchParams.delete(k); });
    history.replaceState(null, "", u.pathname + u.search + u.hash);
    if(back){ toast("ما كمّلت الدفع — تقدر تشتري أي وقت 🛒"); return; }
    toast("⏳ نتأكد من الدفع…");
    var tries = 0;
    (function check(){
      sharedSb.functions.invoke("sahra-pay", { body: { action: "verify", order: paid } }).then(function(r){
        if(r.error) return fnError(r).then(function(code){ throw new Error(code); });
        var d = parseJ(r.data);
        if(d && d.status === "paid"){
          loadAccount().catch(function(){});
          /* نفس الطلب انفتح رابطه مرة ثانية → بدون رسالة «تم الدفع» من جديد (الجولات تنضاف مرة وحدة أصلًا) */
          var shown = [];
          try{ shown = JSON.parse(localStorage.getItem("sahra-paid-shown") || "[]"); if(!Array.isArray(shown)) shown = []; }catch(e){ shown = []; }
          if(shown.indexOf(paid) !== -1){ toast("✅ هذا الطلب مدفوع ومضاف لرصيدك من قبل"); return; }
          shown.push(paid);
          try{ localStorage.setItem("sahra-paid-shown", JSON.stringify(shown.slice(-20))); }catch(e){}
          notice("✅ تم الدفع", "انضافت " + roundsWord(d.rounds | 0) + " لرصيدك. استمتعوا بالسهرة 🎲");
          return;
        }
        if(d && (d.status === "initiated" || d.status === "on_hold" || d.status === "authorized") && ++tries < 6){ setTimeout(check, 2500); return; }
        if(d && d.status === "mismatch") notice("⚠️ صار شي غلط", "المبلغ ما طابق الباقة — تواصل مع صاحب الطاولة.");
        else if(d && (d.status === "failed" || d.status === "expired" || d.status === "canceled")) toast("ما تم الدفع — ما انخصم شي");
        else toast("ما تأكد الدفع للحين — لو انخصم المبلغ، الجولات تنضاف لحالها خلال دقايق");
      }).catch(function(){ toast("ما قدرنا نتأكد من الدفع الحين — حدّث الصفحة بعد شوي"); });
    })();
  }

  /* ============ الدخول بحساب Google ============ */
  var ME = null;
  var authEls = {
    gate: document.getElementById("authGate"), body: document.getElementById("agBody"),
    chip: document.getElementById("userChip"), chipBtn: document.getElementById("ucBtn"), avatar: document.getElementById("ucAvatar"),
    name: document.getElementById("ucName"), initial: document.getElementById("ucInitial"), menu: document.getElementById("ucMenu"), email: document.getElementById("ucEmail"),
    admin: document.getElementById("ucAdmin"), logout: document.getElementById("ucLogout")
  };
  var authWatchT = null;
  function cleanAuthUrl(){
    try{
      var u = new URL(location.href), had = false;
      ["code", "error", "error_code", "error_description", "state"].forEach(function(k){ if(u.searchParams.has(k)){ u.searchParams.delete(k); had = true; } });
      if(had || /access_token|error_description/.test(location.hash)){ history.replaceState(null, "", u.pathname + u.search); }
    }catch(e){}
  }
  function authError(){
    try{
      var u = new URL(location.href);
      var d = u.searchParams.get("error_description") || new URLSearchParams(location.hash.slice(1)).get("error_description");
      return d ? decodeURIComponent(String(d).replace(/\+/g, " ")) : "";
    }catch(e){ return ""; }
  }
  function signInWithGoogle(){
    ["ldTrialBtn", "ldLoginBtn", "ldNavTrial", "ldFinalBtn"].forEach(function(id){ var b = document.getElementById(id); if(b) b.disabled = true; });
    var t = document.getElementById("ldTrialBtn"); if(t) t.textContent = "جاري التحويل لـ Google…";
    sbReady.then(function(sb){ return sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: "select_account" } }
    }); }).then(function(r){
      if(r && r.error) showLanding("ما قدرنا نفتح تسجيل الدخول: " + r.error.message);
    }, function(e){ showLanding("ما قدرنا نفتح تسجيل الدخول: " + ((e && e.message) || e)); });
  }
  function signOut(){
    clearInterval(authWatchT);
    clearBootCache();
    var done = function(){ location.replace(location.pathname); };
    try{ sharedSb.auth.signOut().then(done, done); }catch(e){ done(); }
  }
  function userBox(){
    if(!ME) return "";
    return '<div class="ag-user">' + (ME.avatar_url ? '<img src="' + escapeHtml(ME.avatar_url) + '" alt="" referrerpolicy="no-referrer">' : '')
      + '<div style="text-align:right"><b>' + escapeHtml(ME.full_name || "") + '</b><small>' + escapeHtml(ME.email || "") + '</small></div></div>';
  }
  function showGate(state, msg){
    bootEls.overlay.hidden = true;
    var html = "";
    if(state === "blocked"){
      html = userBox() + '<p class="ag-state">⛔ حسابك موقوف</p>'
        + '<p class="ag-sub">تواصل مع صاحب الطاولة إذا تشوف إن هذا غلط.</p>'
        + '<div class="ag-btns"><button class="btn-ghost" id="agLogoutBtn" type="button">تسجيل خروج</button></div>';
    } else {
      html = '<div class="ag-err">' + escapeHtml(msg || "صار خطأ") + '</div>'
        + '<div class="ag-btns"><button class="btn-primary" type="button" onclick="location.reload()">إعادة المحاولة 🔄</button>'
        + '<button class="btn-ghost" id="agLogoutBtn" type="button">تسجيل خروج</button></div>';
    }
    authEls.body.innerHTML = html;
    authEls.gate.hidden = false;
    var o = document.getElementById("agLogoutBtn"); if(o) o.addEventListener("click", signOut);
    /* زر الدعم الفني (واتساب صاحب الطاولة) لو الرقم محطوط */
    if(sharedSb) loadCatalog().then(function(){
      var l = supportLink(), btns = authEls.body.querySelector(".ag-btns");
      if(!l || !btns || btns.querySelector(".ag-support")) return;
      var a = document.createElement("a");
      a.className = "btn-primary ag-support"; a.href = l; a.target = "_blank"; a.rel = "noopener"; a.textContent = "💬 تواصل مع الدعم الفني";
      btns.insertBefore(a, btns.firstChild);
    }, function(){});
  }
  /* رابط الدعم الفني: واتساب صاحب الطاولة (من لوحة الأدمن) مع إيميل الحساب */
  function supportLink(){
    return contactLink("السلام عليكم، أحتاج مساعدة في طاولة السهرة" + (ME && ME.email ? " — حسابي: " + ME.email : ""));
  }
  /* ===== التشغيل السريع =====
     1) نرسم الصفحة فورًا من آخر نسخة محفوظة على الجهاز (بدون ما ننتظر الإنترنت)
     2) بعدها نجيب الحساب والرصيد والأعداد بطلب واحد (boot) ونحدّث اللي تغيّر
     (لو قاعدة البيانات قديمة وما فيها boot، نرجع للطريقة القديمة بطلبين بدل أربعة) */
  var BOOT_KEY = "sahra-boot-v1", CAT_KEY = "sahra-catalog-v1";
  var inited = false, bootRpcOk = true, sbFailed = false;
  function readJSON(k){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }catch(e){ return null; } }
  function writeJSON(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function clearBootCache(){ try{ localStorage.removeItem(BOOT_KEY); }catch(e){} }
  function saveBootSnap(){
    if(!ME || !ME.id) return;
    writeJSON(BOOT_KEY, { uid: ME.id, profile: ME, account: { credits: ACCT.credits, admin: ACCT.admin, trials: ACCT.trials }, catalog: CATALOG, at: Date.now() });
  }
  /* جلسة الدخول المحفوظة على الجهاز — نقراها بدون مكتبة Supabase عشان نعرف بسرعة: داخل ولا لا */
  function storedSession(){
    try{
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(!/^sb-[a-z0-9]+-auth-token$/i.test(k || "")) continue;
        var v = JSON.parse(localStorage.getItem(k) || "null");
        var ss = v && (v.currentSession || v);
        if(ss && ss.user && ss.user.id && (ss.refresh_token || ss.access_token)) return { uid: ss.user.id };
      }
    }catch(e){}
    return null;
  }
  function parseJ(x){ return typeof x === "string" ? JSON.parse(x) : x; }
  function isMissingFn(e){
    var m = String((e && ((e.code || "") + " " + (e.message || "") + " " + (e.details || ""))) || "");
    return /PGRST202|Could not find the function|function public\.boot|does not exist/i.test(m);
  }
  function legacyBoot(){
    return sharedSb.auth.getSession().then(function(r){
      var ss = r && r.data && r.data.session, uid = ss && ss.user && ss.user.id;
      if(!uid) return { profile: null };
      return sharedSb.rpc("touch_me").then(function(t){
        if(t && t.error) throw new Error(/touch_me|function/i.test(t.error.message)
          ? "قاعدة البيانات ما تجهّزت — شغّل سكربت sahra_setup.sql في Supabase"
          : t.error.message);
        return Promise.all([
          sharedSb.from("profiles").select("id,email,full_name,avatar_url,role,status,credits").eq("id", uid).maybeSingle(),
          sharedSb.rpc("account_state"),
          sharedSb.rpc("catalog")
        ]);
      }).then(function(rs){
        if(rs[0] && rs[0].error) throw new Error(rs[0].error.message);
        if(rs[1] && rs[1].error) throw rs[1].error;
        if(rs[2] && rs[2].error) throw rs[2].error;
        return { profile: (rs[0] && rs[0].data) || null, account: parseJ(rs[1].data), catalog: parseJ(rs[2].data) };
      });
    });
  }
  function fetchBoot(){
    if(!bootRpcOk) return legacyBoot();
    return sharedSb.rpc("boot").then(function(r){
      if(r.error){
        if(isMissingFn(r.error)){ bootRpcOk = false; return legacyBoot(); }
        throw r.error;
      }
      return parseJ(r.data) || { profile: null };
    });
  }
  /* نفتح الطاولة (مرة وحدة)، وبعدها أي تحديث يحدّث الأجزاء اللي تغيّرت بس */
  function enterApp(){
    document.body.classList.remove("on-landing");
    document.getElementById("landing").hidden = true;
    authEls.gate.hidden = true;
    renderUserChip();
    if(!inited){
      inited = true;
      runInit();
      applyHiddenGames();
      updateBalanceUI();
      var hv = (location.hash || "").replace("#", "");
      if(views.indexOf(hv) !== -1 && hv !== "home") showView(hv);
    } else {
      applyHiddenGames();
      updateBalanceUI();
      refreshOpenGate();
    }
  }
  /* لو شاشة «ابدأ جولة» مفتوحة وتغيّر الرصيد، نعيد رسمها (إلا لو فيه جولة تتجهز أو الجولة خلصت للتو) */
  function refreshOpenGate(){
    if(roundStarting || GAME_ORDER.indexOf(curView) === -1) return;
    var sec = document.getElementById("view-" + curView), gate = document.querySelector('[data-gate="' + curView + '"]');
    if(!sec || !gate || !sec.classList.contains("gated") || gate.hidden || gate.querySelector(".rg-done")) return;
    var open = { trivia:trivOpen, emoji:emojiOpen, letters:lettersOpen, flags:flagsOpen, heads:headsOpen, charades:charOpen, million:mlOpen, rope:ropeOpen }[curView];
    if(open) open();
  }
  function applyBoot(d, first){
    var p = d && d.profile;
    if(!p){ clearBootCache(); ME = null; showGate("error", "ما لقينا حسابك — جرّب تسجل خروج وتدخل من جديد"); return; }
    ME = p;
    if(p.status === "blocked"){ clearBootCache(); showGate("blocked"); return; }
    if(d.account) setAccount(d.account);
    else { ACCT.credits = p.credits | 0; ACCT.admin = p.role === "admin" && p.status === "approved"; }
    if(d.catalog){ setCatalog(d.catalog); writeJSON(CAT_KEY, CATALOG); }
    saveBootSnap();
    enterApp();
    if(!first) return;
    handlePaymentReturn();
    var intent = null; try{ intent = sessionStorage.getItem("sahra-intent"); sessionStorage.removeItem("sahra-intent"); }catch(e){}
    if(intent === "mafia-host"){ location.href = "mafia.html?host=1"; return; }
    if(intent === "shop") openShop(); else maybeWelcome();
    /* لو الأدمن أوقف الحساب أو أضاف جولات وهو شغّال */
    clearInterval(authWatchT);
    authWatchT = setInterval(function(){
      fetchBoot().then(function(q){ if(q && q.profile) applyBoot(q, false); }, function(){});
    }, 240000);
  }
  /* يشتغل فورًا (قبل ما تتحمّل مكتبة Supabase): يرسم الصفحة العامة أو الطاولة من آخر نسخة محفوظة */
  function earlyBoot(){
    if(/[?&](code|error|error_description)=/.test(location.search) || /access_token|error_description/.test(location.hash)) return;   /* راجعين من Google: ننتظر المكتبة */
    var cat = readJSON(CAT_KEY);
    if(cat) setCatalog(cat);
    var ss = storedSession();
    if(!ss){ clearBootCache(); showLanding(); return; }
    var snap = readJSON(BOOT_KEY);
    if(!snap || snap.uid !== ss.uid || !snap.profile || snap.profile.status === "blocked") return;
    ME = snap.profile;
    setAccount(snap.account);
    if(snap.catalog) setCatalog(snap.catalog);
    enterApp();
  }
  var bootTries = 0;
  function bootFetchLoop(first){
    fetchBoot().then(function(d){ applyBoot(d, first); }, function(err){
      if(!inited){ bootShowError(err && err.message ? err.message : String(err)); return; }
      /* الطاولة مفتوحة من النسخة المحفوظة — نحاول مرة ثانية بهدوء */
      if(++bootTries <= 4){ if(bootTries === 1) toast("الاتصال بطيء — نكمّل من آخر نسخة محفوظة ونحاول نحدّث"); setTimeout(function(){ bootFetchLoop(first); }, 2500 * bootTries); }
    });
  }
  /* الشريط العلوي: سطر واحد إذا يكفي، وإلا الألعاب تنزل سطر لحالها */
  var topbarEl = document.querySelector(".topbar"), fitRaf = 0;
  function fitTopbar(){
    topbarEl.classList.remove("stacked");
    var b = document.getElementById("brandBtn").getBoundingClientRect(),
        n = document.getElementById("navPills").getBoundingClientRect(),
        a = document.getElementById("topActions").getBoundingClientRect();
    var oneRow = n.height < 48 && Math.abs(n.top - b.top) < 24 && Math.abs(a.top - b.top) < 24;
    topbarEl.classList.toggle("stacked", !oneRow);
  }
  window.addEventListener("resize", function(){ cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitTopbar); });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(fitTopbar);
  if(document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function(){ cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitTopbar); });
  fitTopbar();
  function renderUserChip(){
    if(!ME) return;
    var full = (ME.full_name || "").trim() || (ME.email || "").split("@")[0];
    var hello = document.getElementById("homeHello"); if(hello) hello.textContent = "هلا " + (full.split(" ")[0] || "فيك");
    authEls.chip.hidden = false;
    authEls.name.textContent = full;
    authEls.email.textContent = ME.email || "";
    authEls.initial.textContent = Array.from(full)[0] || "؟";
    authEls.chipBtn.title = full;
    authEls.chipBtn.setAttribute("aria-label", "حسابي: " + full);
    authEls.admin.hidden = ME.role !== "admin";
    var sup = document.getElementById("ucSupport"), sl = supportLink();
    sup.hidden = !sl; if(sl) sup.href = sl;
    authEls.avatar.hidden = true; authEls.initial.hidden = false;
    if(ME.avatar_url){
      authEls.avatar.onload = function(){ authEls.avatar.hidden = false; authEls.initial.hidden = true; };
      authEls.avatar.onerror = function(){ authEls.avatar.hidden = true; authEls.initial.hidden = false; };
      authEls.avatar.src = ME.avatar_url;
    }
    fitTopbar();
  }
  function toggleUserMenu(open){
    var m = authEls.menu;
    if(open === undefined) open = m.hidden;
    m.hidden = !open;
    authEls.chipBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if(open){
      /* القائمة تفتح لجهة الشاشة اللي فيها مكان */
      var r = authEls.chip.getBoundingClientRect();
      m.classList.toggle("to-right", r.left + r.width / 2 > window.innerWidth / 2);
    }
  }
  authEls.chipBtn.addEventListener("click", function(e){ e.stopPropagation(); toggleUserMenu(); });
  document.addEventListener("click", function(e){ if(!authEls.menu.hidden && !authEls.chip.contains(e.target)) toggleUserMenu(false); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape" && !authEls.menu.hidden){ toggleUserMenu(false); authEls.chipBtn.focus(); } });
  authEls.logout.addEventListener("click", signOut);
  /* نسجّل فتح اللعبة للإحصائيات (مرة كل 10 دقايق لكل لعبة) */
  var playLogged = {};
  function logPlay(game){
    if(!ME || !sharedSb) return;
    var now = Date.now();
    if(playLogged[game] && now - playLogged[game] < 600000) return;
    playLogged[game] = now;
    try{ sharedSb.from("play_events").insert({ game: game }).then(function(){}, function(){}); }catch(e){}
  }
  function applyHiddenGames(){
    document.querySelectorAll(".nav-pills [data-view], .mode-card[data-view]").forEach(function(el){
      el.classList.toggle("gh-hidden", !ACCT.admin && HIDDEN_GAMES.indexOf(el.getAttribute("data-view")) !== -1);
    });
    fitTopbar();
  }
  function maybeWelcome(){
    if(!ME || ACCT.admin || ACCT.credits > 0 || ACCT.trials.length) return;
    var key = "sahra-welcome-" + ME.id;
    try{ if(localStorage.getItem(key)) return; localStorage.setItem(key, "1"); }catch(e){ return; }
    document.getElementById("welcomeTitle").textContent = "هلا " + ((ME.full_name || "").split(" ")[0] || "فيك") + "! 👋";
    document.getElementById("welcomeList").innerHTML = GAME_ORDER.filter(function(g){ return HIDDEN_GAMES.indexOf(g) === -1; }).map(function(g){
      return '<li><b>' + GAME_INFO[g].name + ':</b> ' + trialDesc(g) + '</li>';
    }).join("");
    document.getElementById("welcomeModal").hidden = false;
  }
  document.getElementById("welcomeGo").addEventListener("click", function(){ document.getElementById("welcomeModal").hidden = true; });
  var acctFocusAt = 0;
  window.addEventListener("focus", function(){
    if(!ME || Date.now() - acctFocusAt < 30000) return;
    acctFocusAt = Date.now();
    loadAccount().catch(function(){});
  });
  function authBoot(){
    if(!window.SAHRA_SUPABASE_URL || !window.SAHRA_SUPABASE_ANON_KEY || window.SAHRA_SUPABASE_URL.indexOf("xxxx") !== -1){
      sbFailed = true; bootShowError("لازم تعبّي بيانات Supabase في ملف config.js أول (الرابط والمفتاح العام)"); return;
    }
    if(typeof window.supabase === "undefined" || !window.supabase.createClient){
      sbFailed = true; bootShowError("مكتبة Supabase ما تحمّلت — تأكد من اتصال الإنترنت وحدّث الصفحة"); return;
    }
    sharedSb = window.supabase.createClient(window.SAHRA_SUPABASE_URL, window.SAHRA_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
    });
    sbReadyResolve(sharedSb);
    var urlErr = authError();
    if(!inited) bootEls.msg.textContent = "جاري التحقق من الدخول…";
    sharedSb.auth.getSession().then(function(r){
      cleanAuthUrl();
      var session = r && r.data && r.data.session;
      if(!session){
        clearBootCache();
        if(inited && ME){ location.replace(location.pathname); return; }   /* الجلسة انتهت: نرجع للصفحة العامة */
        showLanding(urlErr ? "ما تم تسجيل الدخول: " + urlErr : ""); return;
      }
      if(!inited) bootEls.msg.textContent = "جاري تجهيز الطاولة…";
      bootFetchLoop(true);
    }).catch(function(err){
      bootShowError(err && err.message ? err.message : String(err));
    });
    sharedSb.auth.onAuthStateChange(function(event){ if(event === "SIGNED_OUT" && ME){ clearBootCache(); location.replace(location.pathname); } });
  }
  try{
    var bootQs = new URLSearchParams(location.search);
    if(bootQs.get("buy") === "1"){ sessionStorage.setItem("sahra-intent", "shop"); bootQs.delete("buy"); history.replaceState(null, "", location.pathname + (bootQs.toString() ? "?" + bootQs.toString() : "") + location.hash); }
  }catch(e){}
  earlyBoot();
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", authBoot);
  else authBoot();
})();
