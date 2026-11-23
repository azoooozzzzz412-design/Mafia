/* لوحة الأدمن — المكوّنات المشتركة (M2a): الأيقونات، مستويات الجودة، القائمة الجانبية، البحث السريع، العدّادات، الرسوم الخفيفة.
   بدون مكتبات، وبدون أي طلب لـSupabase (كل شي هنا للمظهر). الأيقونات مأخوذة من Lucide (رخصة ISC) كـSVG مدمج للأيقونات المستخدمة بس. */
(function(){
  "use strict";
  var KEY_FX = "sahra-admin-fx", KEY_SIDE = "sahra-admin-side", FX = ["premium", "balanced", "performance"];
  var root = document.documentElement;
  function ls(k, v){ try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){} return null; }

  /* ---------- الأيقونات (Lucide) ---------- */
  var P = {
    dashboard:'<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    cart:'<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    package:'<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    tag:'<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    calendar:'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    library:'<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    gamepad:'<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
    chart:'<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    history:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    settings:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    menu:'<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    chevrons:'<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>',
    x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    trend:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    userplus:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
    receipt:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
    upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
    check:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    refresh:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    activity:'<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
    sliders:'<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
    card:'<rect x="4" y="3" width="13" height="18" rx="2"/><path d="m10.5 8.5 2.5 3-2.5 3-2.5-3z"/>',
    back:'<path d="m15 18-6-6 6-6"/>',
    home:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    bank:'<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    xcircle:'<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    okcircle:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    circle:'<circle cx="12" cy="12" r="9"/>',
    maximize:'<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    crown:'<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
    folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    image:'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    film:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
    filetext:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    layers:'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    percent:'<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    cloudup:'<path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/>',
    chevdown:'<path d="m6 9 6 6 6-6"/>',
    arrow:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    eyeoff:'<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
    zap:'<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'
  };
  function sprite(){
    var s = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">';
    Object.keys(P).forEach(function(k){ s += '<symbol id="ai-' + k + '" viewBox="0 0 24 24">' + P[k] + '</symbol>'; });
    var d = document.createElement("div"); d.innerHTML = s + '</svg>'; document.body.insertBefore(d.firstChild, document.body.firstChild);
  }
  function icon(n){ return '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ai-' + n + '"/></svg>'; }

  /* ---------- مستوى الجودة (محفوظ محليًا فقط) ---------- */
  function fxGet(){ var v = ls(KEY_FX); return FX.indexOf(v) !== -1 ? v : "premium"; }
  function fxSet(v){ if(FX.indexOf(v) === -1) v = "premium"; ls(KEY_FX, v); root.setAttribute("data-fx", v); fxButtons(); }
  function fxButtons(){ var cur = fxGet(); Array.prototype.forEach.call(document.querySelectorAll("[data-fxset]"), function(b){ b.setAttribute("aria-pressed", b.getAttribute("data-fxset") === cur ? "true" : "false"); }); }
  function reduced(){ try{ return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; } }
  function still(){ return reduced() || fxGet() === "performance"; }
  /* الحركة المستمرة تتوقف لما الصفحة تنخفي */
  document.addEventListener("visibilitychange", function(){ root.classList.toggle("fx-paused", document.hidden); });

  /* ---------- القائمة الجانبية ---------- */
  function moveInd(){
    var nav = document.getElementById("tabs"), ind = document.getElementById("admInd"); if(!nav || !ind) return;
    var on = nav.querySelector("button.on"); if(!on){ ind.style.opacity = 0; return; }
    ind.style.height = on.offsetHeight + "px"; ind.style.transform = "translateY(" + on.offsetTop + "px)"; ind.style.opacity = 1;
  }
  function sideMin(v){ if(v === undefined) return root.classList.contains("side-min"); root.classList.toggle("side-min", !!v); ls(KEY_SIDE, v ? "1" : "0"); setTimeout(moveInd, 320); }
  function navOpen(v){ root.classList.toggle("nav-open", v === undefined ? !root.classList.contains("nav-open") : !!v); }

  /* ---------- عدّاد تصاعدي ---------- */
  function fmt(n, dec){ return (+n).toLocaleString(root.lang === "en" ? "en-US" : "ar-EG-u-nu-latn", { maximumFractionDigits: dec || 0, minimumFractionDigits: dec || 0 }); }
  function count(el, to, dec, ms){
    if(!el) return; to = +to || 0;
    if(still() || to === 0){ el.textContent = fmt(to, dec); return; }
    var t0 = 0, dur = ms || 800;
    function step(t){ if(!t0) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e, dec); if(p < 1) requestAnimationFrame(step); else el.textContent = fmt(to, dec); }
    requestAnimationFrame(step);
  }
  function reveal(box){ if(!box) return; var i = 0; Array.prototype.forEach.call(box.querySelectorAll(".adm-rv"), function(e){ e.style.setProperty("--i", i++); }); }

  /* ---------- رسوم خفيفة (SVG) ---------- */
  var NS = "http://www.w3.org/2000/svg";
  function line(el, pts, labels, opts){
    opts = opts || {}; var W = 640, H = 200, pl = 8, pr = 8, pt = 14, pb = 26;
    var max = Math.max.apply(null, pts.concat([1])), n = pts.length;
    var x = function(i){ return pl + (n < 2 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (n - 1)); }, y = function(v){ return pt + (H - pt - pb) * (1 - v / max); };
    var d = pts.map(function(v, i){ return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
    var a = d + " L" + x(n - 1).toFixed(1) + " " + (H - pb) + " L" + x(0).toFixed(1) + " " + (H - pb) + " Z";
    var s = '<svg class="ov-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + (opts.label || "") + '"><defs><linearGradient id="gLine" x1="0" x2="1"><stop offset="0" stop-color="#b91c1c"/><stop offset="1" stop-color="#ff354d"/></linearGradient><linearGradient id="gArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff354d" stop-opacity=".42"/><stop offset="1" stop-color="#ff354d" stop-opacity="0"/></linearGradient></defs>';
    for(var g = 0; g <= 3; g++){ var gy = pt + (H - pt - pb) * g / 3; s += '<line class="gl" x1="0" x2="' + W + '" y1="' + gy + '" y2="' + gy + '"/>'; }
    s += '<path class="area" d="' + a + '" fill="url(#gArea)"/><path class="ln" d="' + d + '" pathLength="2000" style="--len:2000"/>';
    if(n <= 40) pts.forEach(function(v, i){ if(v > 0 || n < 12) s += '<circle class="dot" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3.4"><title>' + (labels && labels[i] ? labels[i] + ": " : "") + fmt(v, opts.dec) + '</title></circle>'; });
    var step = Math.max(1, Math.ceil(n / 7)); (labels || []).forEach(function(l, i){ if(i % step === 0 || i === n - 1) s += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + l + '</text>'; });
    el.innerHTML = s + '</svg>';
  }
  function spark(pts){
    var W = 120, H = 34, n = pts.length, max = Math.max.apply(null, pts.concat([1]));
    var d = pts.map(function(v, i){ return (i ? "L" : "M") + (n < 2 ? W / 2 : i * W / (n - 1)).toFixed(1) + " " + (H - 3 - (H - 8) * v / max).toFixed(1); }).join(" ");
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + ' L' + W + ' ' + H + ' L0 ' + H + 'Z" fill="url(#gArea)" opacity=".55"/><path d="' + d + '" fill="none" stroke="#ff354d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function bars(el, items, opts){
    opts = opts || {}; var max = Math.max.apply(null, items.map(function(x){ return x.v; }).concat([1]));
    el.innerHTML = '<div class="ov-bars">' + items.map(function(x, i){ return '<div class="ov-bar"><span class="t" title="' + x.t + '">' + x.t + '</span><span class="tr"><span class="fl" style="--w:' + (x.v / max).toFixed(3) + ';--i:' + i + '"></span></span><span class="n">' + fmt(x.v, opts.dec) + '</span></div>'; }).join("") + '</div>';
  }
  function cols(el, items){
    var max = Math.max.apply(null, items.map(function(x){ return x.v; }).concat([1])), step = Math.max(1, Math.ceil(max / 5)), top = step * 5, ticks = [];
    for(var t = top; t >= 0; t -= step) ticks.push(t);
    el.innerHTML = '<div class="ov-cols"><div class="ax">' + ticks.map(function(t){ return '<span>' + fmt(t) + '</span>'; }).join("") + '</div><div class="pl"><div class="gr">' + ticks.map(function(){ return '<i></i>'; }).join("") + '</div>'
      + items.map(function(x, i){ return '<div class="cl" style="--h:' + (x.v / top).toFixed(4) + ';--k:' + i + '"><b>' + fmt(x.v) + '</b><span class="br"></span><small title="' + x.t + '">' + x.t + '</small></div>'; }).join("") + '</div></div>';
  }
  function donut(el, segs, mid){
    var tot = segs.reduce(function(a, s){ return a + s.v; }, 0) || 1, r = 52, C = 2 * Math.PI * r, off = 0;
    var arcs = segs.map(function(s){ var len = C * s.v / tot, o = '<circle class="seg" cx="70" cy="70" r="' + r + '" stroke="' + s.c + '" style="--d:' + Math.max(0, len - 4).toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '"/>'; off += len; return o; }).join("");
    el.innerHTML = '<div class="ov-donut"><div style="position:relative"><svg viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="' + r + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="14"/>' + arcs + '</svg><div class="mid">' + (mid || "") + '</div></div><div class="lg">' + segs.map(function(s){ return '<div><i style="background:' + s.c + '"></i>' + s.t + ' <b>' + fmt(s.v) + '</b></div>'; }).join("") + '</div></div>';
  }

  /* ---------- بحث سريع Ctrl+K ---------- */
  var palItems = [], palSel = 0;
  function palBuild(){
    palItems = [];
    Array.prototype.forEach.call(document.querySelectorAll("#tabs button[data-tab]"), function(b){ palItems.push({ t: b.getAttribute("data-lb") || b.textContent.trim(), ic: b.getAttribute("data-ic") || "dashboard", go: function(){ b.click(); } }); });
    (window.AdmPaletteExtra || []).forEach(function(x){ palItems.push(x); });
  }
  function palRender(q){
    var ul = document.getElementById("admPalList"); if(!ul) return;
    q = (q || "").trim().toLowerCase();
    var hit = palItems.filter(function(x){ return !q || x.t.toLowerCase().indexOf(q) !== -1; });
    if(q && window.AdmSearchHook) hit = hit.concat([{ t: (root.lang === "en" ? "Search accounts: " : "ابحث عن حساب: ") + q, ic: "search", go: function(){ window.AdmSearchHook(q); } }]);
    palSel = Math.min(palSel, Math.max(0, hit.length - 1)); palItems._hit = hit;
    ul.innerHTML = hit.map(function(x, i){ return '<li><button type="button" data-i="' + i + '" class="' + (i === palSel ? "on" : "") + '">' + icon(x.ic) + '<span>' + x.t + '</span></button></li>'; }).join("") || '<li style="padding:16px;color:var(--tx-3)">' + (root.lang === "en" ? "No results" : "ما فيه نتائج") + '</li>';
  }
  function palOpen(){ var p = document.getElementById("admPal"); if(!p) return; palBuild(); p.hidden = false; var i = document.getElementById("admPalIn"); i.value = ""; palSel = 0; palRender(""); setTimeout(function(){ i.focus(); }, 20); }
  function palClose(){ var p = document.getElementById("admPal"); if(p) p.hidden = true; }
  function palGo(i){ var x = (palItems._hit || [])[i]; if(x){ palClose(); x.go(); } }

  /* ---------- اللغة (عربي/إنجليزي): نصوص الهيكل الثابتة بـ data-ar / data-en، والنصوص الديناميكية تقرا Adm.lang() ---------- */
  function lang(){ var v = ls("sahra-lang"); return v === "en" ? "en" : "ar"; }
  function applyLang(){
    var l = lang(); root.setAttribute("lang", l); root.setAttribute("dir", l === "en" ? "ltr" : "rtl");
    Array.prototype.forEach.call(document.querySelectorAll("[data-en]"), function(e){ if(e.getAttribute("data-ar") === null) e.setAttribute("data-ar", e.textContent); e.textContent = l === "en" ? e.getAttribute("data-en") : e.getAttribute("data-ar"); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-en-ph]"), function(e){ if(e.getAttribute("data-ar-ph") === null) e.setAttribute("data-ar-ph", e.getAttribute("placeholder") || ""); e.setAttribute("placeholder", l === "en" ? e.getAttribute("data-en-ph") : e.getAttribute("data-ar-ph")); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-en-title]"), function(e){ e.setAttribute("title", l === "en" ? e.getAttribute("data-en-title") : e.getAttribute("data-ar-title")); });
    var lb = document.getElementById("admLang"); if(lb) lb.textContent = l === "en" ? "ع" : "EN";
    setTimeout(moveInd, 50);
  }
  function setLang(l){ ls("sahra-lang", l === "en" ? "en" : "ar"); applyLang(); document.dispatchEvent(new CustomEvent("admlang", { detail: lang() })); }
  function badgeN(id){ var b = document.getElementById(id); return b && !b.hidden ? (parseInt(b.textContent, 10) || 0) : 0; }
  function bellSync(){
    var n = badgeN("trCount") + badgeN("repCount") + badgeN("pendingCount"), b = document.getElementById("admBellN"); if(!b) return;
    b.textContent = n > 99 ? "99+" : String(n); b.hidden = !n;
  }
  function bellFill(){
    var en = lang() === "en", rows = [["trCount", "cart", "sales", en ? "Transfer orders awaiting review" : "طلبات تحويل تنتظر التحقق"], ["repCount", "flag", "reports", en ? "Open question reports" : "بلاغات أسئلة مفتوحة"], ["pendingCount", "users", "users", en ? "Accounts awaiting approval" : "حسابات تنتظر القبول"]];
    var h = rows.filter(function(r){ return badgeN(r[0]); }).map(function(r){ return '<button type="button" data-bellgo="' + r[2] + '">' + icon(r[1]) + '<span>' + r[3] + '</span><b>' + fmt(badgeN(r[0])) + '</b></button>'; }).join("");
    document.getElementById("admBellPop").innerHTML = h || '<p class="emp">' + (en ? "Nothing needs your attention" : "ما فيه شي يحتاج انتباهك") + '</p>';
  }
  function popToggle(btnId, popId, force){
    var b = document.getElementById(btnId), p = document.getElementById(popId); if(!b || !p) return;
    var open = force === undefined ? p.hidden : force; if(open && popId === "admBellPop") bellFill();
    p.hidden = !open; b.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function popsClose(){ popToggle("admBell", "admBellPop", false); popToggle("admUser", "admUserPop", false); }
  function init(){
    sprite(); applyLang();
    root.setAttribute("data-fx", fxGet()); fxButtons();
    if(ls(KEY_SIDE) === "1") root.classList.add("side-min");
    document.addEventListener("click", function(e){
      var f = e.target.closest("[data-fxset]"); if(f){ fxSet(f.getAttribute("data-fxset")); return; }
      if(e.target.closest("[data-admlang]")){ setLang(lang() === "en" ? "ar" : "en"); return; }
      if(e.target.closest("[data-admmin]")){ sideMin(!sideMin()); return; }
      if(e.target.closest("[data-admmenu]")){ navOpen(); return; }
      if(e.target.closest(".adm-scrim")){ navOpen(false); return; }
      if(e.target.closest("[data-admpal]")){ palOpen(); return; }
      if(e.target.closest("#admBell")){ popToggle("admUser", "admUserPop", false); popToggle("admBell", "admBellPop"); return; }
      if(e.target.closest("#admUser")){ popToggle("admBell", "admBellPop", false); popToggle("admUser", "admUserPop"); return; }
      var bg = e.target.closest("[data-bellgo]"); if(bg){ popsClose(); var tb = document.querySelector('#tabs [data-tab="' + bg.getAttribute("data-bellgo") + '"]'); if(tb) tb.click(); return; }
      if(!e.target.closest(".adm-pop")) popsClose();
      if(e.target.closest("#admFull")){ var d = document; try{ if(d.fullscreenElement) d.exitFullscreen(); else d.documentElement.requestFullscreen(); }catch(x){} return; }
      var pb = e.target.closest("#admPalList button[data-i]"); if(pb){ palGo(+pb.getAttribute("data-i")); return; }
      if(e.target.id === "admPal"){ palClose(); return; }
      if(e.target.closest("#tabs button[data-tab]")) navOpen(false);
    });
    if(window.MutationObserver){ var mo = new MutationObserver(bellSync); ["trCount", "repCount", "pendingCount"].forEach(function(id){ var el = document.getElementById(id); if(el) mo.observe(el, { attributes: true, childList: true, characterData: true, subtree: true }); }); }
    bellSync();
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape") popsClose();
      if((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")){ e.preventDefault(); var p = document.getElementById("admPal"); if(p && !p.hidden) palClose(); else palOpen(); return; }
      var p2 = document.getElementById("admPal"); if(!p2 || p2.hidden) return;
      if(e.key === "Escape"){ palClose(); }
      else if(e.key === "ArrowDown" || e.key === "ArrowUp"){ e.preventDefault(); palSel += e.key === "ArrowDown" ? 1 : -1; var n = (palItems._hit || []).length; palSel = (palSel + n) % Math.max(1, n); palRender(document.getElementById("admPalIn").value); }
      else if(e.key === "Enter"){ e.preventDefault(); palGo(palSel); }
    });
    var pi = document.getElementById("admPalIn"); if(pi) pi.addEventListener("input", function(){ palSel = 0; palRender(pi.value); });
    window.addEventListener("resize", moveInd);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);
  }
  window.Adm = { lang: lang, setLang: setLang, applyLang: applyLang, icon: icon, fx: fxGet, setFx: fxSet, still: still, moveInd: moveInd, sideMin: sideMin, navOpen: navOpen, count: count, reveal: reveal, line: line, spark: spark, bars: bars, cols: cols, donut: donut, fmt: fmt, palOpen: palOpen, init: init };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
