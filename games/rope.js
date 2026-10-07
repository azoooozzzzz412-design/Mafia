/* «مربوطين» — لعبة جماعية (2–8 لاعبين) مربوطين بحبل. محرك Canvas 2D خفيف:
   فيزياء بخطوة ثابتة (120 بالثانية) + قيود الحبل + رسم مرسوم بألوان (مو واقعي).
   يتحمّل بس لما تفتح اللعبة (عشان الموقع يبقى سريع). */
(function(root){
"use strict";

/* ======================= الفيزياء (نفس الأرقام يستخدمها مولّد المراحل) ======================= */
var PHYS = {
  dt: 1 / 120, g: 60, jumpV: 15, holdMul: 0.55, cutMul: 1.7, maxSpeed: 7, maxFall: 26,
  accG: 80, accA: 46, iceAcc: 9, coyote: 0.12, buffer: 0.16,
  bounceV: 24, bounceMul: 0.8, pw: 0.78, ph: 1.3, climbV: 4.4, carry: 1
};
/* الصندوق (pw×ph) ثابت لكل اللاعبين: السمين/النحيف/الطويل شكل بس، ما يغيّر صعوبة اللعب.
   الرسم أطول من الصندوق بشوي (الراس والشعر) — المولّد يخلي فوق كل منصة 1.6 فاضي على الأقل. */
PHYS.head = 1.6;
PHYS.bounceRise = Math.round(PHYS.bounceV * PHYS.bounceV / (2 * PHYS.g * PHYS.bounceMul) * 10) / 10;

if(typeof module !== "undefined" && module.exports){ module.exports = { PHYS: PHYS }; return; }

var doc = root.document;
var COLORS = ["#f43f5e", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];
var THEMES = {
  night:   { name:"ليل النجوم", sky:["#070514", "#1b1140", "#3b2a7a"], hills:["#150f33", "#1f1748", "#2a1f5e"], plat:"#271d4d", top:"#a78bfa", edge:"#7c5cff", deco:"#c4b5fd", fx:"stars" },
  desert:  { name:"صحراء الليل", sky:["#120a24", "#3a1d4a", "#a8566a"], hills:["#3b2147", "#5a2d4f", "#7a3d4f"], plat:"#7a4a2a", top:"#f2c27d", edge:"#d49a54", deco:"#ffe2b0", fx:"stars" },
  volcano: { name:"البركان", sky:["#0d0303", "#3a0c06", "#8a2a0c"], hills:["#2a0a07", "#3d0f09", "#55160f"], plat:"#2b1d1d", top:"#ff7a3d", edge:"#c2410c", deco:"#fdba74", fx:"embers" },
  ice:     { name:"الجليد", sky:["#02101f", "#0b2f4f", "#1d6a8a"], hills:["#0e3350", "#14486b", "#1c5f86"], plat:"#5fa8cf", top:"#f0fbff", edge:"#b8e6fa", deco:"#e0f7ff", fx:"snow" },
  jungle:  { name:"الغابة", sky:["#03140c", "#0b3320", "#1f6b3f"], hills:["#0a2a1a", "#0f3a24", "#154d30"], plat:"#4a3020", top:"#4ade80", edge:"#16a34a", deco:"#86efac", fx:"flies" },
  city:    { name:"سطوح المدينة", sky:["#05050f", "#151335", "#3b2a7a"], hills:["#141230", "#1c1940", "#24204d"], plat:"#34324a", top:"#f472b6", edge:"#db2777", deco:"#fbcfe8", fx:"city" },
  sky:     { name:"جزر الغيوم", sky:["#1e1450", "#7a3b8f", "#f59e6b"], hills:["#8b4f9a", "#b56a96", "#e08a8a"], plat:"#6b4a3a", top:"#a3e635", edge:"#65a30d", deco:"#fef3c7", fx:"clouds" },
  ocean:   { name:"الأعماق", sky:["#010d18", "#03304a", "#0e6a85"], hills:["#042a40", "#053650", "#06445f"], plat:"#5b3a6b", top:"#fb7185", edge:"#e11d48", deco:"#fecdd3", fx:"bubbles" },
  space:   { name:"الفضاء", sky:["#01010a", "#0b0a2a", "#2a1a5e"], hills:["#14123a", "#1d1a4d", "#2a2563"], plat:"#3a4252", top:"#22d3ee", edge:"#0891b2", deco:"#a5f3fc", fx:"space" },
  candy:   { name:"أرض الحلويات", sky:["#2a0a2e", "#6b1d5e", "#e0559b"], hills:["#7a2a6a", "#9b3a7a", "#c04f8a"], plat:"#c8915a", top:"#f9a8d4", edge:"#ec4899", deco:"#fde68a", fx:"sprinkles" }
};
var LAYOUT_NAMES = { run:"جري", climb:"تسلّق", mix:"جري وتسلّق", wave:"طلوع ونزول", descent:"نزول" };

/* ======================= الشخصيات: ناس كرتون بملامح ولبس مختلف (مرسومة بالكود، بدون صور) =======================
   look = { g:"m"|"f", b:0 نحيف|1 عادي|2 سمين, h:0 قصير|1 عادي|2 طويل, hr:0 كثيف|1 خفيف|2 أصلع, f:الملامح, o:اللبس }
   القدمين عند (0,0) بوحدات العالم، والوجه لليمين (اليسار = انعكاس). الطول بين 1.37 و1.64 تقريبًا. */
var CH = (function(){
  var LOOK = {
    g: [["m", "رجّال"], ["f", "بنت"]],
    b: ["نحيف", "عادي", "سمين"],
    h: ["قصير", "عادي", "طويل"],
    hr: ["كثيف", "خفيف", "أصلع"],
    fm: 6, ff: 4,
    om: ["ثوب وشماغ", "هودي", "قميص وكرفتة", "رياضي", "عامل"],
    of: ["عباية", "كاجوال", "رياضي"]
  };
  var SKIN = ["#f1c6a0", "#d9a375", "#c2875a", "#9d6640", "#764628", "#f6d5b5"];
  var HAIRC = ["#1d1a17", "#2e2018", "#4a3020", "#6b3d20", "#8f8f8f"];
  /* ملامح الرجال: [بشرة, لون الشعر, شنب, لحية (0 بدون، 1 سكسوكة، 2 كاملة), نظارة, حواجب كثيفة] */
  var FACE_M = [[1, 0, 1, 0, 0, 1], [3, 0, 1, 1, 0, 1], [0, 2, 0, 0, 1, 0], [4, 0, 1, 0, 0, 1], [2, 1, 0, 2, 0, 1], [5, 3, 0, 0, 0, 0]];
  var FACE_F = [[0, 0, 0, 0, 0, 0], [2, 1, 0, 0, 1, 0], [4, 0, 0, 0, 0, 0], [5, 2, 0, 0, 0, 0]];
  var BODY = [0.84, 1, 1.3], TALL = [0.92, 1, 1.1];
  var INK = "#1c2033";
  function defaultLook(slot){
    slot = Math.abs(slot | 0) % 8;
    return { g: "m", b: [1, 0, 2, 1, 1, 2, 0, 1][slot], h: [1, 2, 0, 1, 2, 1, 1, 0][slot], hr: [0, 1, 0, 2, 0, 1, 0, 0][slot], f: slot % 6, o: [1, 0, 2, 3, 4, 2, 3, 1][slot] };
  }
  function normLook(l, slot){
    var d = defaultLook(slot); l = l && typeof l === "object" ? l : {};
    var g = l.g === "f" ? "f" : l.g === "m" ? "m" : d.g;
    var n = function(v, max, def){ v = Math.round(+v); return isFinite(v) && v >= 0 && v <= max ? v : def; };
    var nf = g === "f" ? LOOK.ff : LOOK.fm, no = g === "f" ? LOOK.of.length : LOOK.om.length;
    return { g: g, b: n(l.b, 2, d.b), h: n(l.h, 2, d.h), hr: n(l.hr, 2, d.hr), f: n(l.f, nf - 1, d.f % nf), o: n(l.o, no - 1, d.o % no) };
  }
  function randomLook(keep){   // عشوائي (يحافظ على رجّال/بنت)
    var g = keep && keep.g === "f" ? "f" : "m", r = function(n){ return Math.floor(Math.random() * n); };
    return { g: g, b: r(3), h: r(3), hr: r(3), f: r(g === "f" ? LOOK.ff : LOOK.fm), o: r(g === "f" ? LOOK.of.length : LOOK.om.length) };
  }
  function sameLook(a, b){ return !!a && !!b && a.g === b.g && a.b === b.b && a.h === b.h && a.hr === b.hr && a.f === b.f && a.o === b.o; }
  /* مقاسات تفيد اللعبة: الخصر (للحبل) وأعلى الراس (للاسم) */
  function dims(look){
    look = normLook(look, 0);
    var B = BODY[look.b], S = TALL[look.h];
    var hip = 0.5 * S + 0.04, shY = -hip - 0.46 * S - (B - 1) * 0.02, headR = 0.18 + (B - 1) * 0.035, headCY = shY - 0.26;
    var extra = look.g === "f" ? 0.06 : look.o === 0 ? 0.08 : look.o === 4 ? 0.06 : look.hr === 0 ? 0.055 : 0.01;
    return { hip: hip, top: -(headCY - headR * 1.05) + extra, headY: -headCY, headR: headR };
  }
  function shade(hex, k){   // k>0 أفتح، k<0 أغمق
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if(k < 0){ r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
  }
  function limb(c, pts, w, col){
    c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); c.moveTo(pts[0], pts[1]); for(var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.strokeStyle = INK; c.lineWidth = w + 0.05; c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.stroke();
  }
  function seg(x, y, len, a){ return [x + Math.sin(a) * len, y + Math.cos(a) * len]; }
  function ell(c, x, y, rx, ry, fill, stroke, rot){ c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); if(fill){ c.fillStyle = fill; c.fill(); } if(stroke){ c.strokeStyle = INK; c.lineWidth = stroke; c.stroke(); } }
  function stripes(c, x, y, n, x1, x2, dx){   // خطوط الشماغ (مسار واحد = أسرع)
    c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 0.012; c.beginPath();
    for(var k = -n; k <= n; k++){ c.moveTo(x + x1 + k * 0.05, y - 0.4); c.lineTo(x + x1 + dx + k * 0.05, y + 0.4); c.moveTo(x + x2 + k * 0.05, y - 0.4); c.lineTo(x + x2 - dx + k * 0.05, y + 0.4); }
    c.stroke();
  }
  /* pose = { mode: idle|walk|jump|fall|climb|hold|win, ph: مرحلة المشي, t: الوقت, blink, ca: زاوية الحبل وقت التسلّق, belt: حبل على الخصر } */
  function drawHuman(c, look, color, pose){
    look = normLook(look, 0); pose = pose || {};
    var fem = look.g === "f", B = BODY[look.b], S = TALL[look.h];
    var F = (fem ? FACE_F : FACE_M)[look.f] || FACE_M[0];
    var skin = SKIN[F[0]], hairC = HAIRC[F[1]];
    var o = look.o, mode = pose.mode || "idle", t = pose.t || 0, ph = pose.ph || 0;
    var LW = 0.035;
    var thigh = 0.25 * S, shin = 0.25 * S, upA = 0.23 * S, foA = 0.21 * S;
    var hipY = -(thigh + shin + 0.04), shY = hipY - 0.46 * S - (B - 1) * 0.02;
    shY += mode === "idle" ? Math.sin(t * 2.2) * 0.008 : 0;
    var sw = 0.165 * B + 0.035, hw = 0.115 * B + 0.015;
    var armW = 0.092 * Math.pow(B, 0.7), legW = 0.105 * Math.pow(B, 0.7);
    var headR = 0.18 + (B - 1) * 0.035, headCY = shY - 0.06 - 0.2, headCX = 0.02;
    // زوايا الأطراف (0 = لتحت، موجب = لقدّام)
    var lA, lB, kA, kB, aA, aB, eA, eB, hop = 0;
    if(mode === "walk"){
      var s1 = Math.sin(ph), c1 = Math.cos(ph);
      lA = 0.55 * s1; lB = -0.55 * s1; kA = lA - 0.55 * Math.max(0, -c1); kB = lB - 0.55 * Math.max(0, c1);
      aA = -0.5 * s1; aB = 0.5 * s1; eA = aA + 0.35; eB = aB + 0.35;
    } else if(mode === "jump"){ lA = 0.85; kA = -0.15; lB = -0.25; kB = -0.6; aA = 2.6; eA = 2.9; aB = 2.2; eB = 2.6; }
    else if(mode === "fall"){ var w2 = Math.sin(t * 18) * 0.25; lA = 0.35; kA = 0.1; lB = -0.3; kB = -0.5; aA = 1.7 + w2; eA = 2.1 + w2; aB = 1.4 - w2; eB = 1.9 - w2; }
    else if(mode === "climb"){ var ca = pose.ca != null ? pose.ca : 3.0, sw2 = Math.sin(t * 9) * 0.25; lA = 0.25 + sw2; kA = -0.1; lB = -0.15 - sw2; kB = -0.4; aA = ca + 0.15; eA = ca + 0.05; aB = ca - 0.2; eB = ca - 0.1; }
    else if(mode === "hold"){ lA = 0.48; kA = 0.24; lB = -0.42; kB = -0.42; aA = 1.05; eA = 1.35; aB = 0.85; eB = 1.2; }
    else if(mode === "win"){ hop = Math.abs(Math.sin(t * 8)); lA = 0.15 + hop * 0.2; kA = 0; lB = -0.15 - hop * 0.2; kB = -0.1; aA = 2.7 + Math.sin(t * 12) * 0.15; eA = 3.0; aB = -2.7 - Math.sin(t * 12) * 0.15; eB = -3.0; }
    else { lA = 0.07; kA = 0.04; lB = -0.07; kB = -0.07; aA = 0.12; eA = 0.25; aB = -0.1; eB = 0.05; }
    // ألوان اللبس
    var top = color, topD = shade(color, -0.22), pants = "#33415c", shoe = "#151826", sleeve = color, hand = skin;
    var robe = null, robeTrim = null, headwear = null, hijab = null;
    if(!fem){
      if(o === 0){ robe = "#f4f5f8"; sleeve = "#f4f5f8"; headwear = "shemagh"; }
      else if(o === 1){ pants = "#35558a"; shoe = "#eef0f4"; }
      else if(o === 2){ pants = "#4b5260"; shoe = "#16171d"; }
      else if(o === 3){ pants = topD; shoe = "#eef0f4"; }
      else { sleeve = "#f4f5f8"; pants = color; headwear = "cap"; }
    } else {
      hijab = o === 0 ? color : o === 1 ? shade(color, 0.55) : "#2a2f45";
      if(o === 0){ robe = "#22252f"; robeTrim = color; sleeve = "#22252f"; }
      else if(o === 1){ robe = color; sleeve = color; pants = "#2f3342"; }
      else { pants = "#2a2f45"; shoe = "#eef0f4"; }
    }
    var tunic = fem && o === 1;
    c.save();
    if(hop) c.translate(0, -hop * 0.12);
    c.rotate(mode === "hold" ? -0.13 : mode === "walk" ? 0.03 : 0);
    var hipF = [hw * 0.45, hipY], hipB = [-hw * 0.45, hipY];
    var shF = [sw * 0.72, shY + 0.055], shB = [-sw * 0.66, shY + 0.055];
    function leg(hip, a, k, back){
      var kn = seg(hip[0], hip[1], thigh, a), ft = seg(kn[0], kn[1], shin, k);
      if(!robe || tunic) limb(c, [hip[0], hip[1], kn[0], kn[1], ft[0], ft[1]], legW * (back ? 0.96 : 1), back ? shade(pants, -0.15) : pants);
      c.save(); c.translate(ft[0], ft[1]); c.rotate(-k * 0.3);
      c.beginPath(); c.moveTo(-0.05, -0.06); c.quadraticCurveTo(0.17, -0.07, 0.17, 0.0); c.lineTo(-0.06, 0.012); c.closePath();
      c.fillStyle = back ? shade(shoe, -0.12) : shoe; c.fill(); c.strokeStyle = INK; c.lineWidth = LW; c.stroke(); c.restore();
    }
    function arm(sh, a, e, back){
      var el = seg(sh[0], sh[1], upA, a), hd = seg(el[0], el[1], foA, e);
      limb(c, [sh[0], sh[1], el[0], el[1], hd[0], hd[1]], armW * (back ? 0.95 : 1), back ? shade(sleeve, -0.18) : sleeve);
      if(!fem && o === 3){ c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 0.022; c.beginPath(); c.moveTo(sh[0], sh[1]); c.lineTo(el[0], el[1]); c.lineTo(hd[0], hd[1]); c.stroke(); }
      ell(c, hd[0], hd[1], 0.052, 0.05, back ? shade(hand, -0.1) : hand, LW);
    }
    // الخلف: الذراع والرجل البعيدة
    arm(shB, aB, eB, true);
    leg(hipB, lB, kB, true);
    // الثوب / العباية / التونيك
    if(robe){
      var hemY = tunic ? hipY + 0.28 : -0.05, flare = (fem && o === 0) ? 0.07 : 0.035;
      var ftA = seg(hipF[0], hipF[1], thigh + shin, lA * 0.5), ftB = seg(hipB[0], hipB[1], thigh + shin, lB * 0.5);
      var hx1 = Math.min(ftA[0], ftB[0]) - 0.08 - flare, hx2 = Math.max(ftA[0], ftB[0]) + 0.08 + flare;
      c.beginPath(); c.moveTo(-sw * 0.92, shY + 0.04); c.lineTo(sw * 0.92, shY + 0.04);
      c.lineTo(Math.max(hw + 0.05, hx2), hemY); c.quadraticCurveTo((hx1 + hx2) / 2, hemY + 0.035, Math.min(-hw - 0.05, hx1), hemY); c.closePath();
      c.fillStyle = robe; c.fill(); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
      c.strokeStyle = "rgba(0,0,0,.08)"; c.lineWidth = 0.03; c.beginPath(); c.moveTo(0.02, shY + 0.15); c.lineTo(0.03, hemY - 0.02); c.stroke();
      if(robeTrim){ c.strokeStyle = robeTrim; c.lineWidth = 0.035; c.beginPath(); c.moveTo(0.04, shY + 0.08); c.lineTo(0.06, hemY - 0.02); c.stroke(); c.fillStyle = robeTrim; c.fillRect(-hw - 0.02, hipY - 0.03, hw * 2 + 0.06, 0.05); }
    }
    // الجذع (السمين: كرش واضح)
    c.beginPath();
    c.moveTo(-sw, shY + 0.04); c.quadraticCurveTo(-sw, shY - 0.02, -sw * 0.6, shY - 0.02); c.lineTo(sw * 0.6, shY - 0.02); c.quadraticCurveTo(sw, shY - 0.02, sw, shY + 0.05);
    if(B > 1.1) c.quadraticCurveTo(sw + 0.2, (shY + hipY) / 2 + 0.07, hw + 0.03, hipY + 0.02);
    else c.quadraticCurveTo(sw * 0.92, (shY + hipY) / 2, hw, hipY + 0.02);
    c.lineTo(-hw, hipY + 0.02); c.quadraticCurveTo(-sw * 0.95, (shY + hipY) / 2, -sw, shY + 0.04); c.closePath();
    var bodyCol = robe && !tunic ? (fem ? robe : top) : top;
    if(!fem && o === 4) bodyCol = "#f4f5f8";
    c.fillStyle = bodyCol; c.fill(); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
    c.save(); c.clip(); c.fillStyle = "rgba(0,0,0,.12)"; c.fillRect(-sw - 0.1, shY - 0.05, sw * 0.55, hipY - shY + 0.1); c.restore();
    // تفاصيل اللبس
    if(!fem && o === 0){ // سديري فوق الثوب
      c.beginPath(); c.moveTo(-sw * 0.85, shY + 0.03); c.lineTo(-0.02, shY + 0.03); c.lineTo(-0.0, hipY + 0.06); c.lineTo(-hw - 0.01, hipY + 0.06); c.closePath();
      c.fillStyle = color; c.fill(); c.strokeStyle = INK; c.lineWidth = LW * 0.8; c.stroke();
      c.beginPath(); c.moveTo(sw * 0.85, shY + 0.03); c.lineTo(0.06, shY + 0.03); c.lineTo(0.07, hipY + 0.06); c.lineTo(hw + 0.01, hipY + 0.06); c.closePath();
      c.fillStyle = shade(color, -0.1); c.fill(); c.stroke();
      c.fillStyle = "#c9a227"; c.beginPath(); for(var bi = 0; bi < 3; bi++){ c.moveTo(0.097, shY + 0.1 + bi * 0.09); c.arc(0.085, shY + 0.1 + bi * 0.09, 0.012, 0, 6.29); } c.fill();
    } else if(!fem && o === 1){ // هودي: جيب + حبال
      c.fillStyle = topD; c.beginPath(); c.moveTo(-0.08, hipY - 0.12); c.lineTo(0.12, hipY - 0.12); c.lineTo(0.15, hipY - 0.02); c.lineTo(-0.1, hipY - 0.02); c.closePath(); c.fill();
      c.strokeStyle = "#f4f5f8"; c.lineWidth = 0.014; c.beginPath(); c.moveTo(0.03, shY + 0.02); c.lineTo(0.025, shY + 0.13); c.moveTo(0.08, shY + 0.02); c.lineTo(0.085, shY + 0.12); c.stroke();
    } else if(!fem && o === 2){ // ياقة + كرفتة + حزام
      c.fillStyle = "#f4f5f8"; c.beginPath(); c.moveTo(-0.05, shY - 0.02); c.lineTo(0.06, shY + 0.07); c.lineTo(0.12, shY - 0.02); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = LW * 0.7; c.stroke();
      c.fillStyle = "#1f2a44"; c.beginPath(); c.moveTo(0.045, shY + 0.03); c.lineTo(0.075, shY + 0.03); c.lineTo(0.09, hipY - 0.1); c.lineTo(0.06, hipY - 0.06); c.lineTo(0.03, hipY - 0.1); c.closePath(); c.fill();
      c.fillStyle = "#2a2118"; c.fillRect(-hw - 0.005, hipY - 0.025, hw * 2 + 0.01, 0.045); c.fillStyle = "#c9a227"; c.fillRect(0.03, hipY - 0.025, 0.04, 0.045);
    } else if(!fem && o === 3){ // رياضي: سحاب + خط
      c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 0.02; c.beginPath(); c.moveTo(0.05, shY); c.lineTo(0.05, hipY); c.moveTo(-sw + 0.02, shY + 0.12); c.lineTo(sw - 0.02, shY + 0.12); c.stroke();
    } else if(!fem && o === 4){ // عامل: مريول بحمّالات
      c.beginPath(); c.moveTo(-hw * 0.85, hipY + 0.02); c.lineTo(-hw * 0.75, shY + 0.16); c.lineTo(hw * 0.85, shY + 0.16); c.lineTo(hw * 0.95, hipY + 0.02); c.closePath();
      c.fillStyle = color; c.fill(); c.strokeStyle = INK; c.lineWidth = LW * 0.8; c.stroke();
      c.strokeStyle = color; c.lineWidth = 0.035; c.beginPath(); c.moveTo(-hw * 0.6, shY + 0.18); c.lineTo(-sw * 0.5, shY); c.moveTo(hw * 0.7, shY + 0.18); c.lineTo(sw * 0.55, shY); c.stroke();
      c.fillStyle = "#e5e7eb"; c.beginPath(); c.arc(-hw * 0.6, shY + 0.19, 0.016, 0, 6.29); c.moveTo(hw * 0.7 + 0.016, shY + 0.19); c.arc(hw * 0.7, shY + 0.19, 0.016, 0, 6.29); c.fill();
      c.fillStyle = shade(color, -0.15); c.fillRect(-0.04, shY + 0.22, 0.1, 0.07);
    } else if(fem && o === 2){
      c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 0.02; c.beginPath(); c.moveTo(-sw + 0.02, shY + 0.14); c.lineTo(sw - 0.02, shY + 0.14); c.stroke();
    }
    if(B > 1.1){ c.save(); c.globalAlpha = 0.2; ell(c, sw * 0.75, (shY + hipY) / 2 + 0.02, 0.06, 0.1, "#fff"); c.restore(); }
    // الرجل القريبة
    leg(hipF, lA, kA, false);
    // حبل على الخصر (مربوطين!)
    if(pose.belt){
      var by = hipY - 0.005, bx1 = -(B > 1.1 ? hw + 0.05 : hw + 0.02), bx2 = B > 1.1 ? hw + 0.06 : hw + 0.03;
      c.lineCap = "round"; c.beginPath(); c.moveTo(bx1, by + 0.01); c.quadraticCurveTo(0, by + 0.04, bx2, by);
      c.strokeStyle = "rgba(40,24,10,.85)"; c.lineWidth = 0.07; c.stroke(); c.strokeStyle = "#d6a96a"; c.lineWidth = 0.042; c.stroke();
      ell(c, bx2 - 0.05, by + 0.02, 0.042, 0.036, "#e3b77c", LW * 0.6);
    }
    // الرقبة + الراس + الذراع القريبة
    limb(c, [0.01, shY + 0.02, 0.02, shY - 0.07], 0.08 + (B - 1) * 0.03, hijab ? hijab : skin);
    drawHead(c, look, F, headCX, headCY, headR, skin, hairC, color, headwear, hijab, pose, LW);
    arm(shF, aA, eA, false);
    c.restore();
  }
  function drawHead(c, look, F, x, y, r, skin, hairC, color, headwear, hijab, pose, LW){
    var mode = pose.mode || "idle", fem = look.g === "f";
    var rx = r * 0.86, ry = r * 1.05;
    if(hijab){   // الحجاب يغطي الراس والرقبة
      c.beginPath(); c.ellipse(x - 0.015, y + 0.01, rx + 0.055, ry + 0.06, 0, 0, 6.2832);
      c.moveTo(x - rx - 0.04, y + 0.08); c.quadraticCurveTo(x - rx - 0.02, y + ry + 0.16, x + 0.02, y + ry + 0.15); c.quadraticCurveTo(x + rx, y + ry + 0.12, x + rx + 0.02, y + 0.1);
      c.fillStyle = hijab; c.fill(); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
    }
    if(headwear === "shemagh"){   // الشماغ من ورا (يطيح على الكتف)
      c.beginPath(); c.moveTo(x - rx - 0.04, y - 0.05); c.quadraticCurveTo(x - rx - 0.12, y + 0.18, x - rx - 0.02, y + ry + 0.16); c.lineTo(x - 0.02, y + ry + 0.05); c.lineTo(x - 0.03, y - 0.05); c.closePath();
      c.fillStyle = "#d63a3a"; c.fill(); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
      c.save(); c.clip(); stripes(c, x, y, 6, -0.4, 0.2, 0.4); c.restore();
    }
    if(!hijab) ell(c, x - rx * 0.78, y + 0.02, 0.045, 0.06, skin, LW);   // الأذن
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.2832);
    if(hijab){ c.save(); c.beginPath(); c.ellipse(x + 0.025, y + 0.015, rx * 0.86, ry * 0.88, 0, 0, 6.2832); }
    c.fillStyle = skin; c.fill(); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
    if(hijab) c.restore();
    c.save(); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.2832); c.clip(); c.fillStyle = "rgba(0,0,0,.07)"; c.fillRect(x - rx, y - ry, rx * 0.55, ry * 2); c.restore();
    if(!hijab && headwear !== "shemagh") drawHair(c, look, x, y, rx, ry, hairC, LW);
    // العيون
    var blink = pose.blink, eyY = y - 0.02, e1 = x + 0.01, e2 = x + 0.1, ery = blink ? 0.008 : 0.055;
    var lk = mode === "fall" ? -0.004 : 0.014, ly = mode === "fall" ? -0.014 : 0.006;
    ell(c, e1, eyY, 0.04, ery, "#fff", LW * 0.8);
    ell(c, e2, eyY, 0.036, ery * 0.95, "#fff", LW * 0.8);
    if(!blink){
      c.fillStyle = "#151826"; c.beginPath(); c.arc(e1 + lk, eyY + ly, 0.02, 0, 6.29); c.moveTo(e2 + lk + 0.019, eyY + ly); c.arc(e2 + lk, eyY + ly, 0.019, 0, 6.29); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(e1 + lk + 0.007, eyY - 0.004, 0.006, 0, 6.29); c.moveTo(e2 + lk + 0.013, eyY - 0.004); c.arc(e2 + lk + 0.007, eyY - 0.004, 0.006, 0, 6.29); c.fill();
    }
    if(fem){ c.strokeStyle = INK; c.lineWidth = 0.012; c.beginPath(); c.moveTo(e1 - 0.03, eyY - 0.035); c.lineTo(e1 - 0.045, eyY - 0.05); c.moveTo(e2 + 0.028, eyY - 0.035); c.lineTo(e2 + 0.042, eyY - 0.05); c.stroke(); }
    // الحواجب (تتغيّر مع الحالة)
    var thick = F[5] ? 0.03 : 0.019, bY = eyY - 0.078, ang = mode === "hold" ? 0.35 : mode === "fall" || mode === "climb" ? -0.35 : mode === "win" ? -0.15 : 0.12;
    c.strokeStyle = F[1] === 4 ? "#6b6b6b" : HAIRC[F[1]] || "#1d1a17"; c.lineCap = "round"; c.lineWidth = thick;
    c.beginPath(); c.moveTo(e1 - 0.035, bY - ang * 0.02); c.lineTo(e1 + 0.03, bY + ang * 0.03); c.moveTo(e2 - 0.025, bY + ang * 0.03); c.lineTo(e2 + 0.035, bY - ang * 0.02); c.stroke();
    if(F[4]){ c.strokeStyle = "#2b2b2b"; c.lineWidth = 0.014; c.beginPath(); c.arc(e1, eyY, 0.045, 0, 6.29); c.moveTo(e2 + 0.042, eyY); c.arc(e2, eyY, 0.042, 0, 6.29); c.moveTo(e1 + 0.045, eyY); c.lineTo(e2 - 0.042, eyY); c.moveTo(e1 - 0.045, eyY); c.lineTo(x - rx * 0.7, eyY - 0.01); c.stroke(); }
    // الخشم
    c.beginPath(); c.moveTo(x + 0.11, y + 0.0); c.quadraticCurveTo(x + rx + 0.06, y + 0.045, x + rx + 0.02, y + 0.075); c.quadraticCurveTo(x + rx - 0.04, y + 0.09, x + 0.1, y + 0.07);
    c.fillStyle = shade(skin, -0.06); c.fill(); c.strokeStyle = INK; c.lineWidth = LW * 0.85; c.stroke();
    if(F[3]){   // اللحية
      c.beginPath();
      if(F[3] === 2){ c.moveTo(x - rx * 0.75, y + 0.02); c.quadraticCurveTo(x - rx * 0.5, y + ry + 0.06, x + 0.06, y + ry + 0.05); c.quadraticCurveTo(x + rx * 0.9, y + ry - 0.02, x + rx * 0.85, y + 0.08); c.quadraticCurveTo(x + 0.06, y + 0.16, x - rx * 0.75, y + 0.02); }
      else { c.moveTo(x + 0.0, y + 0.13); c.quadraticCurveTo(x + 0.05, y + ry + 0.05, x + 0.12, y + ry - 0.0); c.quadraticCurveTo(x + 0.15, y + 0.15, x + 0.0, y + 0.13); }
      c.fillStyle = HAIRC[F[1]]; c.fill(); c.strokeStyle = INK; c.lineWidth = LW * 0.7; c.stroke();
    }
    // الفم
    c.strokeStyle = INK; c.lineWidth = 0.016; c.beginPath();
    if(mode === "win"){ c.arc(x + 0.09, y + 0.115, 0.035, 0.15, Math.PI - 0.15); c.fillStyle = "#7a2230"; c.fill(); }
    else if(mode === "fall" || mode === "climb"){ c.ellipse(x + 0.1, y + 0.125, 0.018, 0.024, 0, 0, 6.29); c.fillStyle = "#7a2230"; c.fill(); }
    else if(mode === "hold"){ c.moveTo(x + 0.06, y + 0.125); c.lineTo(x + 0.13, y + 0.12); }
    else { c.moveTo(x + 0.06, y + 0.118); c.quadraticCurveTo(x + 0.1, y + 0.135, x + 0.135, y + 0.112); }
    c.stroke();
    if(F[2]){   // الشنب
      c.beginPath(); c.moveTo(x + 0.035, y + 0.105); c.quadraticCurveTo(x + 0.09, y + 0.065, x + 0.145, y + 0.085); c.quadraticCurveTo(x + 0.17, y + 0.105, x + 0.15, y + 0.112); c.quadraticCurveTo(x + 0.1, y + 0.095, x + 0.035, y + 0.118); c.closePath();
      c.fillStyle = HAIRC[F[1]]; c.fill(); c.strokeStyle = INK; c.lineWidth = LW * 0.6; c.stroke();
    }
    if(headwear === "shemagh"){   // الشماغ والعقال فوق
      c.beginPath(); c.moveTo(x - rx - 0.05, y + 0.02); c.quadraticCurveTo(x - rx - 0.04, y - ry - 0.08, x + 0.02, y - ry - 0.07); c.quadraticCurveTo(x + rx + 0.07, y - ry - 0.05, x + rx + 0.04, y - 0.06);
      c.quadraticCurveTo(x + 0.02, y - ry + 0.05, x - rx * 0.55, y - 0.02); c.closePath();
      c.fillStyle = "#d63a3a"; c.fill(); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
      c.save(); c.clip(); stripes(c, x, y, 8, -0.3, 0.3, 0.4); c.restore();
      c.strokeStyle = "#111"; c.lineWidth = 0.035; c.beginPath(); c.ellipse(x - 0.01, y - ry + 0.01, rx * 0.9, 0.045, -0.08, 0, 6.29); c.stroke();
      c.strokeStyle = "#333"; c.lineWidth = 0.02; c.beginPath(); c.ellipse(x - 0.01, y - ry + 0.04, rx * 0.88, 0.04, -0.08, 0.2, 3.0); c.stroke();
    } else if(headwear === "cap"){
      c.beginPath(); c.moveTo(x - rx - 0.01, y - 0.07); c.quadraticCurveTo(x - rx, y - ry - 0.06, x + 0.02, y - ry - 0.05); c.quadraticCurveTo(x + rx + 0.02, y - ry - 0.03, x + rx + 0.02, y - 0.07); c.closePath();
      c.fillStyle = color; c.fill(); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
      c.beginPath(); c.moveTo(x + rx * 0.4, y - 0.08); c.quadraticCurveTo(x + rx + 0.14, y - 0.09, x + rx + 0.17, y - 0.055); c.lineTo(x + rx - 0.02, y - 0.05); c.closePath();
      c.fillStyle = shade(color, -0.2); c.fill(); c.stroke();
    }
  }
  function drawHair(c, look, x, y, rx, ry, col, LW){
    var hr = look.hr;
    if(hr === 2){ // أصلع: شوي جنب + لمعة
      c.fillStyle = col; c.beginPath(); c.ellipse(x - rx * 0.62, y - 0.02, 0.05, 0.075, 0.2, 0, 6.29); c.fill();
      c.save(); c.globalAlpha = 0.45; ell(c, x - 0.02, y - ry * 0.72, 0.05, 0.022, "#fff", 0, -0.2); c.restore();
      return;
    }
    if(hr === 1){ // خفيف: جوانب + خصلات قليلة
      c.fillStyle = col; c.beginPath(); c.ellipse(x - rx * 0.6, y - 0.03, 0.065, 0.09, 0.25, 0, 6.29); c.fill();
      c.strokeStyle = col; c.lineWidth = 0.014; c.lineCap = "round"; c.beginPath();
      for(var i = 0; i < 4; i++){ var px = x - 0.07 + i * 0.045; c.moveTo(px, y - ry + 0.02); c.quadraticCurveTo(px + 0.02, y - ry - 0.035, px + 0.05, y - ry - 0.01); }
      c.stroke();
      c.save(); c.globalAlpha = 0.35; ell(c, x - 0.0, y - ry * 0.7, 0.05, 0.02, "#fff", 0, -0.2); c.restore();
      return;
    }
    // كثيف: غطاء شعر + خصلة قدّام
    c.beginPath();
    c.moveTo(x - rx - 0.015, y + 0.04);
    c.quadraticCurveTo(x - rx - 0.04, y - ry - 0.02, x - 0.02, y - ry - 0.055);
    c.quadraticCurveTo(x + rx + 0.06, y - ry - 0.04, x + rx + 0.03, y - ry * 0.35);
    c.quadraticCurveTo(x + rx * 0.4, y - ry * 0.62, x + 0.03, y - ry * 0.55);
    c.quadraticCurveTo(x - rx * 0.4, y - ry * 0.5, x - rx * 0.55, y - 0.0);
    c.quadraticCurveTo(x - rx * 0.75, y + 0.05, x - rx - 0.015, y + 0.04);
    c.closePath();
    c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = LW; c.stroke();
    c.save(); c.globalAlpha = 0.18; c.strokeStyle = "#fff"; c.lineWidth = 0.014; c.beginPath(); c.moveTo(x - 0.06, y - ry - 0.02); c.quadraticCurveTo(x + 0.04, y - ry - 0.03, x + 0.1, y - ry * 0.7); c.stroke(); c.restore();
  }
  /* رسم الشخصية داخل كانفس (للّوبي والمحرّر): كامل الجسم أو الراس والأكتاف */
  function fit(cv, look, color, opts){
    opts = opts || {};
    var c = cv.getContext("2d"), dpr = Math.min(2, root.devicePixelRatio || 1);
    var w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
    var W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
    if(cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; }
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    var D = dims(look), s, ox, oy;
    if(opts.bust){ s = H / 0.78; ox = W / 2 - 0.03 * s; oy = H * 0.5 + D.headY * s + 0.06 * s; }
    else { var tall = (opts.room || 1.78); s = Math.min(H / tall, W / 1.05); ox = W / 2; oy = H - (opts.floor != null ? opts.floor : 0.06) * s; }
    c.setTransform(s, 0, 0, s, ox, oy);
    if(!opts.bust && opts.shadow !== false){ c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.ellipse(0, 0.015, 0.36, 0.06, 0, 0, 6.29); c.fill(); }
    if(opts.flip) c.scale(-1, 1);
    drawHuman(c, look, color, opts.pose || { mode: "idle" });
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
  return { LOOK: LOOK, normLook: normLook, defaultLook: defaultLook, randomLook: randomLook, sameLook: sameLook, dims: dims, draw: drawHuman, fit: fit };
})();


function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
function hash(n){ n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
function rng(seed){ var a = seed >>> 0; return function(){ a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]; }); }
function fmtTime(t){ t = Math.max(0, t); var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ":" + (s < 10 ? "0" : "") + s; }

/* ======================= تجهيز المرحلة ======================= */
function prepLevel(raw){
  var L = typeof raw === "string" ? JSON.parse(raw) : raw;
  var lv = { id: L.id, name: L.n || "", th: THEMES[L.th] ? L.th : "night", lay: L.lay || "run", d: L.d || 1,
             w: +L.w || 60, h: +L.h || 30, rope: clamp(+L.L || 3.6, 2.5, 6), gr: clamp(+L.gr || 1, 0.5, 1.5),
             spawn: L.s || [4, 10], cps: (L.cp || []).slice(), goal: L.goal || [L.w - 6, 4, 4, 3],
             solids: [], ones: [], crumbles: [], movers: [], pads: [], hz: [], saws: [], winds: [], rise: L.R || null, seed: L.seed || 1 };
  (L.P || []).forEach(function(p, i){
    var r = { x: +p[0], y: +p[1], w: +p[2], h: +p[3], k: p[4] | 0, a: +p[5] || 0, i: i, seed: hash(i * 977 + (lv.seed | 0)) };
    if(r.k === 1) lv.ones.push(r);
    else if(r.k === 3){ r.st = 0; r.t = 0; lv.crumbles.push(r); lv.solids.push(r); }
    else lv.solids.push(r);
  });
  (L.M || []).forEach(function(m, i){ lv.movers.push({ bx: +m[0], by: +m[1], w: +m[2], h: +m[3], dx: +m[4], dy: +m[5], T: Math.max(1, +m[6]), ph: +m[7] || 0, x: +m[0], y: +m[1], px: +m[0], py: +m[1], mover: true, i: i }); });
  (L.B || []).forEach(function(b){ lv.pads.push({ x: +b[0], y: +b[1], w: +b[2] }); });
  (L.H || []).forEach(function(h){ lv.hz.push({ x: +h[0], y: +h[1], w: +h[2], h: +h[3], t: h[4] | 0 }); });
  (L.S || []).forEach(function(s){ lv.saws.push({ x1: +s[0], y1: +s[1], x2: +s[2], y2: +s[3], r: +s[4], T: Math.max(1, +s[5]), ph: +s[6] || 0, x: +s[0], y: +s[1] }); });
  (L.W || []).forEach(function(w){ lv.winds.push({ x: +w[0], y: +w[1], w: +w[2], h: +w[3], fx: +w[4] || 0, fy: +w[5] || 0 }); });
  // شبكة سريعة للأجسام الثابتة
  var CS = 4, cols = Math.ceil(lv.w / CS) + 1, rows = Math.ceil(lv.h / CS) + 1, grid = new Array(cols * rows);
  function addTo(r, list){
    var x0 = clamp(Math.floor(r.x / CS), 0, cols - 1), x1 = clamp(Math.floor((r.x + r.w) / CS), 0, cols - 1);
    var y0 = clamp(Math.floor(r.y / CS), 0, rows - 1), y1 = clamp(Math.floor((r.y + r.h) / CS), 0, rows - 1);
    for(var gy = y0; gy <= y1; gy++) for(var gx = x0; gx <= x1; gx++){ var k = gy * cols + gx; (grid[k] || (grid[k] = [])).push(r); }
  }
  lv.solids.forEach(function(r){ addTo(r); });
  lv.ones.forEach(function(r){ addTo(r); });
  lv.grid = { CS: CS, cols: cols, rows: rows, cells: grid };
  return lv;
}
var _q = [], _qid = 0;
function query(lv, x1, y1, x2, y2){
  var G = lv.grid, out = _q; out.length = 0; _qid++;
  var gx0 = clamp(Math.floor(x1 / G.CS), 0, G.cols - 1), gx1 = clamp(Math.floor(x2 / G.CS), 0, G.cols - 1);
  var gy0 = clamp(Math.floor(y1 / G.CS), 0, G.rows - 1), gy1 = clamp(Math.floor(y2 / G.CS), 0, G.rows - 1);
  for(var gy = gy0; gy <= gy1; gy++) for(var gx = gx0; gx <= gx1; gx++){
    var c = G.cells[gy * G.cols + gx]; if(!c) continue;
    for(var i = 0; i < c.length; i++){ var r = c[i]; if(r._q !== _qid){ r._q = _qid; out.push(r); } }
  }
  return out;
}

/* ======================= اللعبة ======================= */
function Game(canvas, opts){
  this.cv = canvas;
  this.ctx = canvas.getContext("2d", { alpha: false });
  this.opts = opts || {};
  this.onEvent = this.opts.onEvent || function(){};
  this.reduced = !!this.opts.reducedMotion;
  this.lv = prepLevel(this.opts.level);
  this.T = THEMES[this.lv.th];
  this.players = [];
  this.parts = [];
  this.time = 0; this.clock = 0; this.falls = 0; this.cp = -1; this.state = "ready"; this.deadT = 0; this.winT = 0;
  this.cam = { x: this.lv.spawn[0], y: this.lv.spawn[1] - 3, vw: 26 };
  this.lava = null;
  this.dpr = 1; this.W = 0; this.H = 0;
  this.acc = 0; this.last = 0; this.raf = 0;
  this.bg = buildBackground(this.lv, this.T);
  this.setPlayers(this.opts.players || []);
  var self = this;
  this._frame = function(ts){ self.frame(ts); };
  this.resize();
}
Game.prototype.setPlayers = function(list){
  var self = this;
  this.players = list.map(function(p, i){
    var slot = p.slot != null ? p.slot : i, look = CH.normLook(p.look, slot), dm = CH.dims(look);
    return { id: p.id, name: p.name || ("لاعب " + (i + 1)), color: p.color || COLORS[i % 8], slot: slot, look: look, hip: dm.hip, top: dm.top,
             x: 0, y: 0, vx: 0, vy: 0, ground: false, gref: null, coy: 0, buf: 0, jPrev: false, anchor: false, breakT: 0,
             face: 1, squash: 0, blinkT: 1 + Math.random() * 3, wph: Math.random() * 6, airT: 0, inp: { l:false, r:false, j:false, h:false }, off: false, dead: false, bounce: false, climbing: false, tw: 0 };
  });
  this.respawn(true);
};
Game.prototype.respawn = function(first){
  var lv = this.lv, at = this.cp >= 0 ? lv.cps[this.cp] : lv.spawn, n = this.players.length;
  var spread = Math.min(0.7, 3.4 / Math.max(1, n));
  this.players.forEach(function(p, i){
    p.x = at[0] + (i - (n - 1) / 2) * spread; p.y = at[1]; p.vx = 0; p.vy = 0; p.ground = true; p.gref = null; p.anchor = false; p.dead = false; p.bounce = false; p.buf = 0; p.coy = 0; p.squash = 0.4;
  });
  lv.crumbles.forEach(function(c){ c.st = 0; c.t = 0; });
  if(this._ropes) this._ropes.forEach(function(r){ if(r) r.reset = true; });
  if(lv.rise){ this.lava = { y: at[1] + 7, wait: +lv.rise[1] || 6 }; }
  if(!first){ this.cam.x = at[0]; this.cam.y = at[1] - 3; }
};
Game.prototype.start = function(){
  if(this.state === "ready" || this.state === "paused"){ this.state = "play"; }
  if(!this.raf){ this.last = 0; this.raf = requestAnimationFrame(this._frame); }
};
Game.prototype.pause = function(){ if(this.state === "play") this.state = "paused"; };
Game.prototype.resume = function(){ if(this.state === "paused") this.state = "play"; this.start(); };
Game.prototype.restart = function(){ this.cp = -1; this.time = 0; this.falls = 0; this.parts.length = 0; this.state = "play"; this.respawn(); this.onEvent("restart", {}); this.start(); };
Game.prototype.destroy = function(){ cancelAnimationFrame(this.raf); this.raf = 0; this.state = "gone"; };
Game.prototype.setInput = function(id, inp){
  for(var i = 0; i < this.players.length; i++){ var p = this.players[i]; if(p.id === id){ p.inp.l = !!inp.l; p.inp.r = !!inp.r; p.inp.j = !!inp.j; p.inp.h = !!inp.h; p.off = !!inp.off; return; } }
};
Game.prototype.stats = function(){ return { time: this.time, falls: this.falls, cp: this.cp + 1, cps: this.lv.cps.length, state: this.state }; };
Game.prototype.resize = function(){
  var r = this.cv.getBoundingClientRect(), dpr = Math.min(2, root.devicePixelRatio || 1);
  if(r.width * r.height > 2400000) dpr = Math.min(dpr, 1.25);
  var W = Math.max(2, Math.round(r.width * dpr)), H = Math.max(2, Math.round(r.height * dpr));
  if(W !== this.cv.width || H !== this.cv.height){ this.cv.width = W; this.cv.height = H; }
  this.dpr = dpr; this.W = W; this.H = H;
  if(this.state !== "play") this.render();
};

/* ---------- الحركة مع التصادم ---------- */
function overlapX(p, r){ var hw = PHYS.pw / 2; return p.x - hw < r.x + r.w - 0.001 && p.x + hw > r.x + 0.001; }
Game.prototype.moveX = function(p, dx){
  if(!dx) return 0;
  var hw = PHYS.pw / 2, top = p.y - PHYS.ph + 0.02, bot = p.y - 0.02, nx = p.x + dx;
  var list = query(this.lv, Math.min(p.x, nx) - hw - 0.1, top, Math.max(p.x, nx) + hw + 0.1, bot);
  for(var i = 0; i < list.length; i++){
    var r = list[i]; if(r.k === 1 || (r.k === 3 && r.st === 2)) continue;
    if(r.y >= bot || r.y + r.h <= top) continue;
    if(dx > 0 && p.x + hw <= r.x + 0.001 && nx + hw > r.x){ nx = r.x - hw; p.hitX = 1; }
    else if(dx < 0 && p.x - hw >= r.x + r.w - 0.001 && nx - hw < r.x + r.w){ nx = r.x + r.w + hw; p.hitX = -1; }
  }
  var moved = nx - p.x; p.x = nx; return moved;
};
Game.prototype.moveY = function(p, dy){
  if(!dy) return 0;
  var hw = PHYS.pw / 2, ny = p.y + dy, lv = this.lv, land = null, i, r;
  if(dy > 0){
    var list = query(lv, p.x - hw, p.y - 0.1, p.x + hw, ny + 0.1);
    for(i = 0; i < list.length; i++){
      r = list[i]; if(r.k === 3 && r.st === 2) continue;
      if(!overlapX(p, r)) continue;
      if(p.y <= r.y + 0.001 && ny >= r.y){ ny = r.y; land = r; }
    }
    for(i = 0; i < lv.movers.length; i++){
      r = lv.movers[i]; if(!overlapX(p, r)) continue;
      var py = r.py != null ? Math.min(r.py, r.y) : r.y;
      if(p.y <= py + 0.06 && ny >= r.y){ ny = r.y; land = r; }
    }
  } else {
    var top = p.y - PHYS.ph, ntop = ny - PHYS.ph;
    var list2 = query(lv, p.x - hw, ntop - 0.1, p.x + hw, top + 0.1);
    for(i = 0; i < list2.length; i++){
      r = list2[i]; if(r.k === 1 || (r.k === 3 && r.st === 2)) continue;
      if(!overlapX(p, r)) continue;
      if(top >= r.y + r.h - 0.001 && ntop < r.y + r.h){ ntop = r.y + r.h; ny = ntop + PHYS.ph; p.vy = Math.max(p.vy, 0); }
    }
  }
  var moved = ny - p.y; p.y = ny;
  if(land){ if(!p.ground && p.vy > 7) p.squash = Math.min(0.5, p.vy / 40); p.ground = true; p.gref = land; if(p.vy > 0) p.vy = 0; }
  return moved;
};

/* ---------- خطوة الفيزياء ---------- */
Game.prototype.step = function(dt){
  var lv = this.lv, ps = this.players, i, j, p, r, g = PHYS.g * lv.gr;
  this.time += dt; this.clock += dt;
  // المتحركات
  for(i = 0; i < lv.movers.length; i++){
    var m = lv.movers[i], k = 0.5 - 0.5 * Math.cos((this.clock / m.T) * Math.PI * 2 + m.ph);
    m.px = m.x; m.py = m.y; m.x = m.bx + m.dx * k; m.y = m.by + m.dy * k;
  }
  for(i = 0; i < lv.saws.length; i++){
    var s = lv.saws[i], ks = 0.5 - 0.5 * Math.cos((this.clock / s.T) * Math.PI * 2 + s.ph);
    s.x = s.x1 + (s.x2 - s.x1) * ks; s.y = s.y1 + (s.y2 - s.y1) * ks;
  }
  for(i = 0; i < lv.crumbles.length; i++){
    var c = lv.crumbles[i];
    if(c.st === 1){ c.t += dt; if(c.t > 0.55){ c.st = 2; c.t = 0; } }
    else if(c.st === 2){ c.t += dt; if(c.t > 3.6){ c.st = 0; c.t = 0; } }
  }
  if(this.lava){ if(this.lava.wait > 0) this.lava.wait -= dt; else this.lava.y -= (+lv.rise[0] || 0.25) * dt; this.lava.y = Math.max(this.lava.y, lv.goal[1] + lv.goal[3] + 2); }
  // اللاعبين
  for(i = 0; i < ps.length; i++){
    p = ps[i];
    var inp = p.off ? { l:false, r:false, j:false, h:false } : p.inp;
    var gr = p.ground ? p.gref : null;
    // تحملنا المنصة المتحركة
    if(gr && gr.mover){ this.moveX(p, gr.x - gr.px); var ddy = gr.y - gr.py; if(ddy < 0) this.moveY(p, ddy); else p.y += ddy; }
    var ice = gr && gr.k === 2, conv = gr && gr.k === 4 ? gr.a : 0;
    if(gr && gr.k === 3 && gr.st === 0){ gr.st = 1; gr.t = 0; }
    if(p.breakT > 0) p.breakT -= dt;
    p.anchor = !!(inp.h && p.ground && p.breakT <= 0);
    var dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if(dir) p.face = dir;
    var target = p.anchor ? 0 : dir * PHYS.maxSpeed;
    var acc = p.ground ? (ice ? PHYS.iceAcc : PHYS.accG) : PHYS.accA;
    if(p.vx < target) p.vx = Math.min(target, p.vx + acc * dt); else if(p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
    // القفز (مع سماحية: قبل ما توصل الأرض / بعد ما تطيح منها بشوي)
    if(inp.j && !p.jPrev) p.buf = PHYS.buffer;
    p.jPrev = inp.j;
    if(p.buf > 0) p.buf -= dt;
    p.coy = p.ground ? PHYS.coyote : p.coy - dt;
    if(p.buf > 0 && p.coy > 0 && !p.anchor){
      p.vy = -PHYS.jumpV; p.buf = 0; p.coy = 0; p.ground = false; p.gref = null; p.bounce = false; p.squash = -0.25;
      this.dust(p.x, p.y, 5, 0.6);
      this.onEvent("jump", { id: p.id });
    }
    // تسلّق الحبل: معلّق والحبل مشدود وزميلك فوقك → اضغط قفز (وخلّه مضغوط) تطلع على الحبل
    var wasClimb = p.climbing; p.climbing = false;
    if(!p.ground && inp.j && !p.bounce){
      var best = null;
      for(j = 0; j < 2; j++){
        var q = ps[j === 0 ? i - 1 : i + 1]; if(!q) continue;
        var ddx = q.x - p.x, ddy2 = q.y - p.y, dist = Math.sqrt(ddx * ddx + ddy2 * ddy2);
        var ok = wasClimb && p.climbQ === q ? (ddy2 < -0.05 && dist > 0.35) : (dist > lv.rope - 0.3 && ddy2 < -0.5);
        if(ok && (!best || q.y < best.q.y)) best = { q: q, dx: ddx / Math.max(dist, 0.001), dy: ddy2 / Math.max(dist, 0.001), ddy: ddy2 };
      }
      if(best){
        p.climbing = true; p.climbQ = best.q;
        p.vx = best.dx * PHYS.climbV + dir * 1.5; p.vy = best.dy * PHYS.climbV;
        if(best.ddy > -0.45){ p.vy = -7.5; p.climbing = false; p.climbQ = null; }   // وصل لمستوى زميله: نطّة صغيرة يركب فوق
      } else if(wasClimb){ p.climbQ = null; }
    } else p.climbQ = null;
    // الجاذبية
    if(!p.climbing){
      var gm = p.vy < 0 ? (p.bounce ? PHYS.bounceMul : (inp.j ? PHYS.holdMul : PHYS.cutMul)) : 1;
      p.vy = Math.min(PHYS.maxFall, p.vy + g * gm * dt);
    }
    // الريح
    for(j = 0; j < lv.winds.length; j++){
      var w = lv.winds[j], cy = p.y - PHYS.ph / 2;
      if(p.x > w.x && p.x < w.x + w.w && cy > w.y && cy < w.y + w.h){ p.vx += w.fx * dt; p.vy += w.fy * lv.gr * dt; if(p.vy < -11) p.vy = -11; p.inWind = 1; }
    }
    p.hitX = 0;
    var wasGround = p.ground;
    p.ground = false; p.gref = null;
    this.moveX(p, (p.vx + conv) * dt);
    if(p.hitX) p.vx = 0;
    this.moveY(p, p.vy * dt);
    if(p.ground && p.vy >= 0){ p.bounce = false; }
    if(!wasGround && p.ground) this.dust(p.x, p.y, 4, 0.35);
    // النطّاطة
    if(p.ground){
      for(j = 0; j < lv.pads.length; j++){
        var b = lv.pads[j];
        if(p.x > b.x - 0.2 && p.x < b.x + b.w + 0.2 && Math.abs(p.y - (b.y + 0.35)) < 0.12){
          p.vy = -PHYS.bounceV; p.ground = false; p.gref = null; p.bounce = true; p.squash = -0.4; b.t = 0.25;
          this.dust(p.x, p.y, 8, 0.9); this.onEvent("bounce", { id: p.id }); break;
        }
      }
    }
    if(p.squash > 0) p.squash = Math.max(0, p.squash - dt * 3); else if(p.squash < 0) p.squash = Math.min(0, p.squash + dt * 3);
  }
  // الحبل: نشدّ اللي ابتعدوا أكثر من طول الحبل (4 تكرارات عشان السلسلة تثبت)
  var Lr = lv.rope;
  for(var it = 0; it < 4; it++){
    for(i = 0; i < ps.length - 1; i++){
      var A = ps[i], B = ps[i + 1];
      var dx = B.x - A.x, dy = B.y - A.y, d = Math.sqrt(dx * dx + dy * dy);
      if(d <= Lr || d < 1e-6) continue;
      if(d > Lr + 1.4){ if(A.anchor){ A.anchor = false; A.breakT = 0.4; } if(B.anchor){ B.anchor = false; B.breakT = 0.4; } }
      var nx = dx / d, ny = dy / d, ex = d - Lr;
      var wa = A.anchor ? 0 : (A.ground ? 0.3 : 1), wb = B.anchor ? 0 : (B.ground ? 0.3 : 1);
      if(wa + wb === 0){ wa = wb = 1; }
      var ca = ex * wa / (wa + wb), cb = ex * wb / (wa + wb);
      // A يتحرّك ناحية B، وB ناحية A — ولو انصدم أحدهم بجدار ياخذ الثاني الباقي
      var axm = this.moveX(A, nx * ca), aym = this.moveYc(A, ny * ca);
      var restA = ca - (axm * nx + aym * ny);
      var bxm = this.moveX(B, -nx * (cb + Math.max(0, restA))), bym = this.moveYc(B, -ny * (cb + Math.max(0, restA)));
      // سرعة: نشيل التباعد على اتجاه الحبل
      var rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
      if(rv > 0){ var jj = rv / (wa + wb); A.vx += nx * jj * wa; A.vy += ny * jj * wa; B.vx -= nx * jj * wb; B.vy -= ny * jj * wb; }
      A.tw = B.tw = Math.min(1, ex * 3);
    }
  }
  // الأخطار والنقاط
  if(this.state !== "play") return;
  for(i = 0; i < ps.length; i++){
    p = ps[i];
    if(this.hits(p)){ this.die(p); return; }
  }
  for(i = this.cp + 1; i < lv.cps.length; i++){
    var cpp = lv.cps[i];
    for(j = 0; j < ps.length; j++){ p = ps[j]; if(Math.abs(p.x - cpp[0]) < 1.2 && p.y > cpp[1] - 2.6 && p.y < cpp[1] + 0.3){ this.cp = i; this.sparkle(cpp[0], cpp[1] - 2, this.T.top); this.onEvent("checkpoint", { n: i + 1, of: lv.cps.length }); break; } }
  }
  var G = lv.goal, all = ps.length > 0;
  for(i = 0; i < ps.length; i++){ p = ps[i]; if(!(p.x > G[0] - 0.3 && p.x < G[0] + G[2] + 0.3 && p.y > G[1] - 0.5 && p.y < G[1] + G[3] + 0.3)){ all = false; break; } }
  if(all){ this.state = "win"; this.winT = 0; this.confetti(); this.onEvent("win", this.stats()); }
};
Game.prototype.moveYc = function(p, dy){   // حركة الحبل العمودية (ما تخلي اللاعب "يوقف" على شي غلط)
  var g0 = p.ground, r0 = p.gref, m = this.moveY(p, dy);
  if(dy < 0 && g0){ p.ground = false; p.gref = null; }
  else if(!p.ground){ p.ground = g0; p.gref = r0; }
  return m;
};
Game.prototype.hits = function(p){
  var lv = this.lv, hw = PHYS.pw / 2 - 0.06, x1 = p.x - hw, x2 = p.x + hw, y1 = p.y - PHYS.ph + 0.1, y2 = p.y - 0.04, i;
  if(p.y > lv.h + 1.5) return "fall";
  for(i = 0; i < lv.hz.length; i++){
    var h = lv.hz[i], top = h.t === 0 ? h.y + 0.2 : h.t === 2 ? h.y + 0.25 : h.y, bot = h.t === 1 ? h.y + h.h - 0.2 : h.y + h.h;
    if(x2 > h.x + 0.05 && x1 < h.x + h.w - 0.05 && y2 > top && y1 < bot) return "hz";
  }
  for(i = 0; i < lv.saws.length; i++){
    var s = lv.saws[i], cx = clamp(s.x, x1, x2), cy = clamp(s.y, y1, y2), dx = s.x - cx, dy = s.y - cy;
    if(dx * dx + dy * dy < s.r * s.r * 0.7) return "saw";
  }
  if(this.lava && p.y > this.lava.y + 0.25) return "lava";
  return null;
};
Game.prototype.die = function(p){
  this.state = "dead"; this.deadT = 0; this.falls++;
  p.dead = true;
  this.burst(p.x, p.y - 0.75, p.color);
  this.onEvent("fall", { id: p.id, name: p.name, falls: this.falls });
};

/* ---------- الحلقة ---------- */
Game.prototype.frame = function(ts){
  this.raf = 0;
  if(this.state === "gone") return;
  var dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 1 / 60; this.last = ts;
  if(this.state === "play"){
    this.acc += dt; var n = 0;
    while(this.acc >= PHYS.dt && n < 8){ this.step(PHYS.dt); this.acc -= PHYS.dt; n++; if(this.state !== "play") break; }
    if(n >= 8) this.acc = 0;
  } else if(this.state === "dead"){
    this.deadT += dt; this.clock += dt;
    if(this.deadT > 0.9){ this.respawn(); this.state = "play"; this.acc = 0; this.onEvent("respawn", {}); }
  } else if(this.state === "win"){ this.winT += dt; this.clock += dt; }
  else if(this.state === "paused" || this.state === "ready"){ this.clock += dt * 0.25; }
  this.updParts(dt);
  this._fdt = dt;
  this.render();
  this.raf = requestAnimationFrame(this._frame);
};

/* ---------- جزيئات ---------- */
Game.prototype.addPart = function(x, y, vx, vy, life, color, size, kind){
  if(this.parts.length > 420) this.parts.shift();
  this.parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, color: color, size: size, kind: kind || 0 });
};
Game.prototype.dust = function(x, y, n, sp){ if(this.reduced) n = Math.min(n, 2); for(var i = 0; i < n; i++) this.addPart(x + (Math.random() - 0.5) * 0.5, y - 0.05, (Math.random() - 0.5) * 3 * sp, -Math.random() * 2 * sp, 0.35 + Math.random() * 0.25, "rgba(255,255,255,.55)", 0.12 + Math.random() * 0.1); };
Game.prototype.burst = function(x, y, color){ for(var i = 0; i < (this.reduced ? 8 : 26); i++){ var a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 6; this.addPart(x, y, Math.cos(a) * s, Math.sin(a) * s - 2, 0.6 + Math.random() * 0.4, i % 3 ? color : "#fff", 0.14 + Math.random() * 0.14, 1); } };
Game.prototype.sparkle = function(x, y, color){ for(var i = 0; i < (this.reduced ? 6 : 22); i++){ var a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4; this.addPart(x, y, Math.cos(a) * s, Math.sin(a) * s - 1.5, 0.8 + Math.random() * 0.5, i % 2 ? color : "#fff7c2", 0.1 + Math.random() * 0.1, 2); } };
Game.prototype.confetti = function(){
  var G = this.lv.goal, cols = COLORS;
  for(var i = 0; i < (this.reduced ? 20 : 120); i++) this.addPart(G[0] + Math.random() * G[2], G[1] - 1, (Math.random() - 0.5) * 9, -6 - Math.random() * 9, 1.6 + Math.random() * 1.4, cols[i % cols.length], 0.14 + Math.random() * 0.12, 3);
};
Game.prototype.updParts = function(dt){
  var ps = this.parts, w = 0;
  for(var i = 0; i < ps.length; i++){
    var q = ps[i]; q.life -= dt; if(q.life <= 0) continue;
    q.vy += (q.kind === 3 ? 9 : q.kind === 2 ? 2 : 14) * dt; q.vx *= (q.kind === 3 ? 0.985 : 0.97); q.x += q.vx * dt; q.y += q.vy * dt;
    ps[w++] = q;
  }
  ps.length = w;
};

/* ======================= الرسم ======================= */
function buildBackground(lv, T){
  var rand = rng((lv.seed | 0) ^ 0x51ed27), layers = [], k, i;
  for(k = 0; k < 3; k++){
    var pts = [], x = 0, base = 0.55 + k * 0.12, amp = 0.12 - k * 0.025, kind = T.fx === "city" ? "city" : (lv.th === "desert" ? "dune" : (lv.th === "candy" || lv.th === "sky") ? "round" : "peak");
    while(x <= 1.02){
      if(kind === "city"){ var bw = 0.03 + rand() * 0.05, bh = 0.18 + rand() * 0.3 - k * 0.06; pts.push([x, 1 - bh]); pts.push([x + bw, 1 - bh]); x += bw + rand() * 0.008; }
      else { pts.push([x, base - rand() * amp - (kind === "peak" && rand() < 0.3 ? amp * 0.8 : 0)]); x += kind === "peak" ? 0.04 + rand() * 0.05 : 0.06 + rand() * 0.06; }
    }
    layers.push({ pts: pts, kind: kind, color: T.hills[k], f: 0.08 + k * 0.1, win: kind === "city" ? Array.from({ length: 40 }, function(){ return [rand(), rand(), rand() < 0.6]; }) : null });
  }
  var stars = [];
  for(i = 0; i < 110; i++) stars.push([rand(), rand() * 0.75, 0.4 + rand() * 1.2, rand() * 6.28]);
  var fx = [];
  for(i = 0; i < 46; i++) fx.push([rand(), rand(), 0.4 + rand(), rand() * 6.28]);
  return { layers: layers, stars: stars, fx: fx };
}
function rrect(c, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
Game.prototype.updCam = function(dt){
  var ps = this.players, lv = this.lv; if(!ps.length) return;
  var x1 = 1e9, x2 = -1e9, y1 = 1e9, y2 = -1e9;
  ps.forEach(function(p){ x1 = Math.min(x1, p.x); x2 = Math.max(x2, p.x); y1 = Math.min(y1, p.y - 2.2); y2 = Math.max(y2, p.y); });
  var aspect = this.W / Math.max(1, this.H);
  var need = Math.max(x2 - x1 + 12, (y2 - y1 + 8) * aspect, 24), vw = clamp(need, 24, 46);
  var k = 1 - Math.pow(0.0025, dt);
  this.cam.vw += (vw - this.cam.vw) * k;
  var tx = (x1 + x2) / 2, ty = (y1 + y2) / 2 - 1.2;
  this.cam.x += (tx - this.cam.x) * k * 1.4; this.cam.y += (ty - this.cam.y) * k * 1.4;
  var vh = this.cam.vw / aspect;
  this.cam.x = clamp(this.cam.x, this.cam.vw / 2, Math.max(this.cam.vw / 2, lv.w - this.cam.vw / 2));
  this.cam.y = clamp(this.cam.y, vh / 2 - 6, Math.max(vh / 2 - 6, lv.h - vh / 2 + 1));
};
Game.prototype.render = function(){
  var c = this.ctx, W = this.W, H = this.H, T = this.T, lv = this.lv, t = this.clock;
  if(!W) return;
  this.updCam(this._fdt || 1 / 60);
  var s = W / this.cam.vw, vh = H / s, cx = this.cam.x, cy = this.cam.y;
  var vx1 = cx - this.cam.vw / 2, vy1 = cy - vh / 2, vx2 = vx1 + this.cam.vw, vy2 = vy1 + vh;
  // السماء
  c.setTransform(1, 0, 0, 1, 0, 0);
  var gsky = c.createLinearGradient(0, 0, 0, H); gsky.addColorStop(0, T.sky[0]); gsky.addColorStop(0.55, T.sky[1]); gsky.addColorStop(1, T.sky[2]);
  c.fillStyle = gsky; c.fillRect(0, 0, W, H);
  this.drawBackFx(c, W, H, t);
  // الطبقات البعيدة (بارالاكس)
  var bg = this.bg;
  for(var li = 0; li < bg.layers.length; li++){
    var L = bg.layers[li], off = ((cx * s * L.f) % W + W) % W, yoff = clamp((cy - lv.h / 2) * s * L.f * 0.5, -H * 0.12, H * 0.12);
    c.fillStyle = L.color;
    for(var rep = -1; rep <= 1; rep++){
      var ox = rep * W - off;
      c.beginPath(); c.moveTo(ox, H);
      for(var pi = 0; pi < L.pts.length; pi++){
        var X = ox + L.pts[pi][0] * W, Y = L.pts[pi][1] * H - yoff;
        if(L.kind === "round" && pi > 0){ var pX = ox + L.pts[pi - 1][0] * W, pY = L.pts[pi - 1][1] * H - yoff; c.quadraticCurveTo(pX, pY, (pX + X) / 2, (pY + Y) / 2); }
        else c.lineTo(X, Y);
      }
      c.lineTo(ox + W * 1.03, H); c.closePath(); c.fill();
      if(L.win && li === 1){
        c.fillStyle = "rgba(253,224,71,.55)";
        for(var wi = 0; wi < L.win.length; wi++){ var wn = L.win[wi]; if(!wn[2]) continue; c.fillRect(ox + wn[0] * W, H * (0.55 + wn[1] * 0.4) - yoff, W * 0.006, H * 0.012); }
        c.fillStyle = L.color;
      }
    }
  }
  // العالم
  c.setTransform(s, 0, 0, s, -vx1 * s, -vy1 * s);
  this.drawWinds(c, vx1, vy1, vx2, vy2, t);
  this.drawGoal(c, t);
  this.drawCheckpoints(c, t);
  this.drawPlatforms(c, vx1, vy1, vx2, vy2, t);
  this.drawMovers(c, t);
  this.drawPads(c, t);
  this.drawHazards(c, vx1, vy1, vx2, vy2, t);
  this.drawSaws(c, t);
  this.drawRopes(c);
  this.drawPlayers(c, t);
  this.drawParts(c);
  if(this.lava) this.drawLava(c, vx1, vx2, vy2, t);
  // وميض الموت
  if(this.state === "dead"){
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "rgba(244,63,94," + (0.28 * Math.max(0, 1 - this.deadT / 0.9)) + ")"; c.fillRect(0, 0, W, H);
  }
};
Game.prototype.drawBackFx = function(c, W, H, t){
  var T = this.T, fx = T.fx, i, a;
  if(fx === "stars" || fx === "space" || fx === "city"){
    var st = this.bg.stars;
    for(i = 0; i < st.length; i++){ a = 0.35 + 0.35 * Math.sin(t * 1.3 + st[i][3]); c.fillStyle = "rgba(255,255,255," + a.toFixed(2) + ")"; var sz = st[i][2] * (W / 1200); c.fillRect(st[i][0] * W, st[i][1] * H, sz, sz); }
    if(fx === "space"){
      c.fillStyle = "#7c5cff"; c.globalAlpha = 0.5; c.beginPath(); c.arc(W * 0.78, H * 0.22, H * 0.09, 0, 6.29); c.fill();
      c.globalAlpha = 0.35; c.strokeStyle = "#c4b5fd"; c.lineWidth = H * 0.008; c.beginPath(); c.ellipse(W * 0.78, H * 0.22, H * 0.16, H * 0.035, -0.3, 0, 6.29); c.stroke(); c.globalAlpha = 1;
    } else if(fx === "stars"){
      c.fillStyle = "rgba(255,250,220,.9)"; c.beginPath(); c.arc(W * 0.82, H * 0.18, H * 0.05, 0, 6.29); c.fill();
      c.fillStyle = T.sky[1]; c.beginPath(); c.arc(W * 0.82 + H * 0.022, H * 0.18 - H * 0.012, H * 0.045, 0, 6.29); c.fill();
    }
  } else if(fx === "clouds"){
    c.fillStyle = "rgba(255,240,230,.35)";
    var fl = this.bg.fx;
    for(i = 0; i < 8; i++){ var x = ((fl[i][0] * W + t * 8 * fl[i][2]) % (W + 300)) - 150, y = fl[i][1] * H * 0.5; c.beginPath(); c.ellipse(x, y, 90 * fl[i][2], 26 * fl[i][2], 0, 0, 6.29); c.fill(); }
    c.fillStyle = "rgba(255,214,150,.7)"; c.beginPath(); c.arc(W * 0.25, H * 0.72, H * 0.12, 0, 6.29); c.fill();
  } else if(fx === "snow" || fx === "bubbles" || fx === "embers" || fx === "flies" || fx === "sprinkles"){
    if(fx === "snow"){ // شفق
      c.globalAlpha = 0.18; c.fillStyle = "#5eead4"; c.beginPath(); c.moveTo(0, H * 0.2);
      for(i = 0; i <= 10; i++) c.lineTo(W * i / 10, H * (0.18 + 0.06 * Math.sin(i * 0.9 + t * 0.4)));
      c.lineTo(W, H * 0.34); for(i = 10; i >= 0; i--) c.lineTo(W * i / 10, H * (0.3 + 0.05 * Math.sin(i * 0.7 + t * 0.3))); c.closePath(); c.fill(); c.globalAlpha = 1;
    }
    var f2 = this.bg.fx, n = this.reduced ? 12 : f2.length;
    for(i = 0; i < n; i++){
      var q = f2[i], px, py, col, r;
      if(fx === "snow"){ px = ((q[0] * W + Math.sin(t * 0.6 + q[3]) * 30) % W); py = ((q[1] * H + t * 30 * q[2]) % H); col = "rgba(255,255,255,.7)"; r = 1.6 * q[2]; }
      else if(fx === "bubbles"){ px = q[0] * W + Math.sin(t + q[3]) * 12; py = H - ((q[1] * H + t * 26 * q[2]) % H); col = "rgba(186,230,253,.35)"; r = 3 * q[2]; }
      else if(fx === "embers"){ px = q[0] * W + Math.sin(t * 0.8 + q[3]) * 20; py = H - ((q[1] * H + t * 40 * q[2]) % H); col = "rgba(251,146,60," + (0.4 + 0.4 * Math.sin(t * 3 + q[3])).toFixed(2) + ")"; r = 1.8 * q[2]; }
      else if(fx === "flies"){ px = q[0] * W + Math.sin(t * 0.5 + q[3]) * 40; py = q[1] * H * 0.8 + Math.cos(t * 0.7 + q[3]) * 20; col = "rgba(190,242,100," + (0.3 + 0.5 * Math.max(0, Math.sin(t * 2 + q[3]))).toFixed(2) + ")"; r = 2 * q[2]; }
      else { px = q[0] * W; py = ((q[1] * H + t * 18 * q[2]) % H); col = COLORS[i % 8]; r = 1.7 * q[2]; c.globalAlpha = 0.45; }
      c.fillStyle = col; c.beginPath(); c.arc(px, py, r * (W / 1200), 0, 6.29); c.fill(); c.globalAlpha = 1;
    }
  }
};
Game.prototype.drawPlatforms = function(c, x1, y1, x2, y2, t){
  var T = this.T, lv = this.lv, list = query(lv, x1 - 1, y1 - 1, x2 + 1, y2 + 1), th = lv.th;
  for(var i = 0; i < list.length; i++){
    var r = list[i], x = r.x, y = r.y, w = r.w, h = Math.min(r.h, y2 - y + 1);
    if(r.k === 3){
      if(r.st === 2){ var a = Math.max(0, 1 - r.t * 2.2); if(a <= 0) continue; c.globalAlpha = a; y += r.t * r.t * 14; }
      else if(r.st === 1){ x += Math.sin(t * 70) * 0.05; }
    }
    if(r.k === 1){
      c.fillStyle = T.edge; rrect(c, x, y, w, 0.36, 0.16); c.fill();
      c.fillStyle = T.top; rrect(c, x, y, w, 0.18, 0.09); c.fill();
      c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 0.05; c.setLineDash([0.25, 0.2]); c.beginPath(); c.moveTo(x + 0.15, y + 0.52); c.lineTo(x + w - 0.15, y + 0.52); c.stroke(); c.setLineDash([]);
      continue;
    }
    var body = r.k === 2 ? "#8fd3f4" : r.k === 4 ? "#2f2b3d" : T.plat;
    c.fillStyle = body; rrect(c, x, y, w, h, Math.min(0.3, w / 3)); c.fill();
    c.fillStyle = "rgba(0,0,0,.22)"; if(h > 1.2) c.fillRect(x + 0.08, y + Math.min(h, 1.1), w - 0.16, Math.max(0, h - 1.1));
    // تفاصيل
    var sd = r.seed || 0.5;
    if(h > 1 && w > 1.2 && r.k !== 4){
      c.fillStyle = "rgba(255,255,255,.06)";
      var nd = Math.min(8, Math.floor(w * h / 5));
      for(var dI = 0; dI < nd; dI++){ var u = hash((r.i + 1) * 131 + dI * 7), v = hash((r.i + 1) * 71 + dI * 13); c.beginPath(); c.arc(x + 0.3 + u * (w - 0.6), y + 0.8 + v * Math.min(h - 1, 5), 0.12 + u * 0.12, 0, 6.29); c.fill(); }
    }
    if(r.k === 4){
      c.fillStyle = "#4b4560"; c.fillRect(x, y, w, 0.3);
      c.fillStyle = T.top; var off = ((t * r.a) % 0.8 + 0.8) % 0.8;
      for(var cx2 = x + off - 0.8; cx2 < x + w; cx2 += 0.8){ if(cx2 < x - 0.2) continue; c.beginPath(); var d = r.a > 0 ? 1 : -1; c.moveTo(cx2, y + 0.05); c.lineTo(cx2 + 0.18 * d, y + 0.15); c.lineTo(cx2, y + 0.25); c.lineWidth = 0.06; c.strokeStyle = T.top; c.stroke(); }
    } else {
      var topC = r.k === 2 ? "#f0fbff" : T.top;
      c.fillStyle = topC; rrect(c, x, y, w, 0.26, 0.13); c.fill();
      c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(x + 0.15, y + 0.04, Math.max(0, w - 0.3), 0.05);
      if(r.k === 3){ c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = 0.05; c.beginPath(); c.moveTo(x + w * 0.3, y + 0.3); c.lineTo(x + w * 0.42, y + 0.55); c.lineTo(x + w * 0.36, y + 0.8); c.moveTo(x + w * 0.7, y + 0.3); c.lineTo(x + w * 0.62, y + 0.6); c.stroke(); }
      // زينة حسب الثيم
      if(w >= 1.5 && r.k !== 3){
        var nn = Math.floor(w / 1.6);
        for(var gI = 0; gI < nn; gI++){
          var gu = hash((r.i + 3) * 37 + gI * 11); if(gu < 0.45) continue;
          var gx = x + 0.4 + (gI + gu * 0.6) * (w - 0.8) / Math.max(1, nn);
          if(th === "jungle" || th === "sky"){ c.strokeStyle = T.top; c.lineWidth = 0.06; c.beginPath(); c.moveTo(gx, y); c.lineTo(gx - 0.08, y - 0.22); c.moveTo(gx + 0.08, y); c.lineTo(gx + 0.14, y - 0.18); c.stroke(); }
          else if(th === "candy"){ c.fillStyle = COLORS[(gI + r.i) % 8]; c.fillRect(gx, y + 0.08, 0.16, 0.06); }
          else if(th === "ice"){ c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.moveTo(gx - 0.12, y + 0.26); c.lineTo(gx, y + 0.55); c.lineTo(gx + 0.12, y + 0.26); c.fill(); }
          else if(th === "volcano"){ c.fillStyle = "rgba(255,122,61,.5)"; c.fillRect(gx, y + 0.45, 0.06, 0.35); }
          else if(th === "space" || th === "city"){ c.fillStyle = T.edge; c.beginPath(); c.arc(gx, y + 0.5, 0.06, 0, 6.29); c.fill(); }
          else if(th === "ocean"){ c.fillStyle = T.top; c.beginPath(); c.arc(gx, y - 0.05, 0.12, Math.PI, 0); c.fill(); }
        }
      }
    }
    c.globalAlpha = 1;
  }
};
Game.prototype.drawMovers = function(c, t){
  var T = this.T;
  this.lv.movers.forEach(function(m){
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(m.x + 0.15, m.y + m.h, m.w - 0.3, 0.12);
    c.fillStyle = T.edge; rrect(c, m.x, m.y, m.w, m.h, 0.22); c.fill();
    c.fillStyle = T.top; rrect(c, m.x, m.y, m.w, 0.22, 0.11); c.fill();
    c.fillStyle = "rgba(255,255,255,.5)";
    for(var i = 0; i < 3; i++){ c.beginPath(); c.arc(m.x + m.w * (i + 1) / 4, m.y + m.h * 0.62, 0.07, 0, 6.29); c.fill(); }
    // مسار خفيف
    c.strokeStyle = "rgba(255,255,255,.08)"; c.lineWidth = 0.08; c.setLineDash([0.3, 0.3]);
    c.beginPath(); c.moveTo(m.bx + m.w / 2, m.by + m.h / 2); c.lineTo(m.bx + m.dx + m.w / 2, m.by + m.dy + m.h / 2); c.stroke(); c.setLineDash([]);
  });
};
Game.prototype.drawPads = function(c, t){
  var dt = 1 / 60;
  this.lv.pads.forEach(function(b){
    var sq = b.t > 0 ? b.t : 0; if(b.t > 0) b.t -= dt;
    c.fillStyle = "#3f3f46"; c.fillRect(b.x + 0.1, b.y + 0.18, b.w - 0.2, 0.17);
    c.fillStyle = "#facc15"; rrect(c, b.x, b.y + sq * 0.4, b.w, 0.2, 0.1); c.fill();
    c.fillStyle = "#fef08a"; c.fillRect(b.x + 0.2, b.y + 0.04 + sq * 0.4, b.w - 0.4, 0.05);
    c.strokeStyle = "#a16207"; c.lineWidth = 0.05; c.beginPath();
    for(var i = 0; i < 4; i++){ var x = b.x + 0.25 + i * (b.w - 0.5) / 3; c.moveTo(x, b.y + 0.2); c.lineTo(x + 0.1, b.y + 0.27); c.lineTo(x, b.y + 0.34); }
    c.stroke();
  });
};
Game.prototype.drawHazards = function(c, x1, y1, x2, y2, t){
  var lv = this.lv;
  for(var i = 0; i < lv.hz.length; i++){
    var h = lv.hz[i]; if(h.x > x2 || h.x + h.w < x1 || h.y > y2 || h.y + h.h < y1) continue;
    if(h.t === 2){
      var gl = c.createLinearGradient(0, h.y, 0, h.y + h.h); gl.addColorStop(0, "#fde047"); gl.addColorStop(0.25, "#f97316"); gl.addColorStop(1, "#7c2d12");
      c.fillStyle = gl; c.beginPath(); c.moveTo(h.x, h.y + h.h);
      for(var x = h.x; x <= h.x + h.w + 0.01; x += 0.4) c.lineTo(Math.min(x, h.x + h.w), h.y + 0.12 + Math.sin(x * 2.1 + t * 3) * 0.08);
      c.lineTo(h.x + h.w, h.y + h.h); c.closePath(); c.fill();
      c.fillStyle = "rgba(253,224,71,.6)"; for(var b = 0; b < h.w / 1.5; b++){ var bx = h.x + ((b * 1.5 + t * 0.6) % h.w), by = h.y + 0.35 + 0.15 * Math.sin(t * 4 + b); c.beginPath(); c.arc(bx, by, 0.07, 0, 6.29); c.fill(); }
    } else {
      var up = h.t === 0, n = Math.max(1, Math.round(h.w / 0.5)), sw = h.w / n;
      c.fillStyle = "#cbd5e1"; c.strokeStyle = "#475569"; c.lineWidth = 0.04;
      c.beginPath();
      for(var k = 0; k < n; k++){ var sx = h.x + k * sw; if(up){ c.moveTo(sx, h.y + h.h); c.lineTo(sx + sw / 2, h.y); c.lineTo(sx + sw, h.y + h.h); } else { c.moveTo(sx, h.y); c.lineTo(sx + sw / 2, h.y + h.h); c.lineTo(sx + sw, h.y); } }
      c.fill(); c.stroke();
      c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath();
      for(var k2 = 0; k2 < n; k2++){ var sx2 = h.x + k2 * sw; if(up){ c.moveTo(sx2 + sw * 0.32, h.y + h.h * 0.8); c.lineTo(sx2 + sw / 2, h.y + 0.05); c.lineTo(sx2 + sw * 0.46, h.y + h.h * 0.8); } }
      c.fill();
    }
  }
};
Game.prototype.drawSaws = function(c, t){
  this.lv.saws.forEach(function(s, idx){
    c.strokeStyle = "rgba(255,255,255,.1)"; c.lineWidth = 0.12; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
    c.save(); c.translate(s.x, s.y); c.rotate(t * 9 + idx);
    c.fillStyle = "#e2e8f0"; c.beginPath();
    var n = 10;
    for(var i = 0; i < n * 2; i++){ var a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? s.r * 0.78 : s.r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill();
    c.fillStyle = "#94a3b8"; c.beginPath(); c.arc(0, 0, s.r * 0.55, 0, 6.29); c.fill();
    c.fillStyle = "#ef4444"; c.beginPath(); c.arc(0, 0, s.r * 0.18, 0, 6.29); c.fill();
    c.restore();
  });
};
Game.prototype.drawWinds = function(c, x1, y1, x2, y2, t){
  this.lv.winds.forEach(function(w){
    if(w.x > x2 || w.x + w.w < x1) return;
    c.fillStyle = "rgba(186,230,253,.07)"; c.fillRect(w.x, w.y, w.w, w.h);
    c.strokeStyle = "rgba(224,242,254,.35)"; c.lineWidth = 0.06;
    for(var i = 0; i < Math.ceil(w.w * 1.2); i++){
      var u = hash(i * 17 + (w.x | 0)), x = w.x + u * w.w, y = w.y + w.h - ((t * 6 * (0.6 + u) + u * w.h) % w.h);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(t * 3 + i) * 0.1, y - 0.8); c.stroke();
    }
  });
};
Game.prototype.drawCheckpoints = function(c, t){
  var T = this.T, self = this;
  this.lv.cps.forEach(function(p, i){
    var on = i <= self.cp, x = p[0], y = p[1];
    c.fillStyle = "#e5e7eb"; c.fillRect(x - 0.05, y - 2.4, 0.1, 2.4);
    c.fillStyle = on ? T.top : "rgba(255,255,255,.35)";
    var wv = Math.sin(t * 4 + i) * 0.1;
    c.beginPath(); c.moveTo(x + 0.05, y - 2.4); c.quadraticCurveTo(x + 0.6, y - 2.3 + wv, x + 1.1, y - 2.1); c.lineTo(x + 0.05, y - 1.75); c.closePath(); c.fill();
    if(on){ c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.arc(x, y - 2.4, 0.35 + 0.08 * Math.sin(t * 5), 0, 6.29); c.fill(); }
  });
};
Game.prototype.drawGoal = function(c, t){
  var G = this.lv.goal, T = this.T, cx = G[0] + G[2] / 2, cy = G[1] + G[3] / 2 - 0.2;
  var gr = c.createRadialGradient(cx, cy, 0.2, cx, cy, 2.6); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(0.5, T.top); gr.addColorStop(1, "rgba(0,0,0,0)");
  c.globalAlpha = 0.35 + 0.1 * Math.sin(t * 2.5); c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, 2.6, 0, 6.29); c.fill(); c.globalAlpha = 1;
  c.lineWidth = 0.22; c.strokeStyle = T.top; c.beginPath(); c.ellipse(cx, cy, 1.3, 1.6, 0, 0, 6.29); c.stroke();
  c.lineWidth = 0.08; c.strokeStyle = "#fff"; c.beginPath(); c.ellipse(cx, cy, 1.3, 1.6, 0, t * 2 % 6.29, (t * 2 % 6.29) + 1.6); c.stroke();
  // نجمة
  c.fillStyle = "#fde047"; c.save(); c.translate(cx, G[1] - 1.2 + Math.sin(t * 2) * 0.15); c.rotate(Math.sin(t) * 0.2); c.beginPath();
  for(var i = 0; i < 10; i++){ var a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 0.22 : 0.5; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); c.fill(); c.restore();
};
/* الحبل المرسوم: نقاط تتدلّى بالجاذبية (verlet) وتنسدح على الحواف — شكلها مثل حبل حقيقي */
Game.prototype.ropePts = function(i){
  var A = this.players[i], B = this.players[i + 1], N = 9, Lr = this.lv.rope;
  var R = this._ropes || (this._ropes = []);
  var ax = A.x, ay = A.y - (A.hip || PHYS.ph * 0.45), bx = B.x, by = B.y - (B.hip || PHYS.ph * 0.45);   // الحبل مربوط على الخصر
  var r = R[i];
  if(!r || r.reset){
    r = R[i] = { pts: [] };
    for(var k = 0; k <= N; k++){ var u = k / N; r.pts.push({ x: ax + (bx - ax) * u, y: ay + (by - ay) * u, px: ax + (bx - ax) * u, py: ay + (by - ay) * u }); }
  }
  var pts = r.pts, seg = Lr / N, dt = Math.min(1 / 30, this._fdt || 1 / 60), g = 30 * dt * dt, lv = this.lv;
  for(k = 1; k < N; k++){
    var q = pts[k], vx = (q.x - q.px) * 0.96, vy = (q.y - q.py) * 0.96;
    q.px = q.x; q.py = q.y; q.x += vx; q.y += vy + g;
  }
  for(var it = 0; it < 7; it++){
    pts[0].x = ax; pts[0].y = ay; pts[N].x = bx; pts[N].y = by;
    for(k = 0; k < N; k++){
      var p1 = pts[k], p2 = pts[k + 1], dx = p2.x - p1.x, dy = p2.y - p1.y, d = Math.sqrt(dx * dx + dy * dy);
      if(d <= seg || d < 1e-6) continue;
      var f = (d - seg) / d * 0.5, ox = dx * f, oy = dy * f;
      if(k > 0){ p1.x += ox; p1.y += oy; }
      if(k + 1 < N){ p2.x -= ox; p2.y -= oy; }
    }
  }
  // تنسدح فوق المنصات بدل ما تخترقها
  for(k = 1; k < N; k++){
    q = pts[k];
    var hit = query(lv, q.x - 0.05, q.y - 0.05, q.x + 0.05, q.y + 0.05);
    for(var h = 0; h < hit.length; h++){
      var rr = hit[h]; if(rr.k === 1 || (rr.k === 3 && rr.st === 2)) continue;
      if(q.x > rr.x && q.x < rr.x + rr.w && q.y > rr.y - 0.05 && q.y < rr.y + rr.h){ if(q.y - rr.y < 0.6){ q.y = rr.y - 0.05; q.py = q.y; } }
    }
  }
  return pts;
};
Game.prototype.drawRopes = function(c){
  var ps = this.players, Lr = this.lv.rope;
  c.lineCap = "round"; c.lineJoin = "round";
  for(var i = 0; i < ps.length - 1; i++){
    var A = ps[i], B = ps[i + 1], pts = this.ropePts(i);
    var dx = B.x - A.x, dy = B.y - A.y, taut = Math.sqrt(dx * dx + dy * dy) >= Lr * 0.97;
    var path = function(){ c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for(var k = 1; k < pts.length - 1; k++){ var mx = (pts[k].x + pts[k + 1].x) / 2, my = (pts[k].y + pts[k + 1].y) / 2; c.quadraticCurveTo(pts[k].x, pts[k].y, mx, my); } c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); };
    c.strokeStyle = "rgba(40,24,10,.75)"; c.lineWidth = 0.17; path(); c.stroke();
    c.strokeStyle = taut ? "#f2b48a" : "#d6a96a"; c.lineWidth = 0.1; path(); c.stroke();
    c.strokeStyle = "rgba(255,240,210,.55)"; c.lineWidth = 0.05; c.setLineDash([0.16, 0.16]); path(); c.stroke(); c.setLineDash([]);
  }
};
Game.prototype.pullDir = function(i){   // الحبل يسحب هاللاعب لأي جهة؟ (عشان يميل عكسها وهو ماسك)
  var ps = this.players, p = ps[i], best = 0, dir = 0;
  for(var k = -1; k <= 1; k += 2){
    var q = ps[i + k]; if(!q) continue;
    var d = Math.sqrt((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y));
    if(d > best){ best = d; dir = q.x > p.x ? 1 : -1; }
  }
  return best > this.lv.rope * 0.75 ? dir : 0;
};
Game.prototype.drawPlayers = function(c, t){
  var ps = this.players, dt = Math.min(0.05, this._fdt || 1 / 60), win = this.state === "win", live = this.state === "play";
  for(var i = 0; i < ps.length; i++){
    var p = ps[i]; if(p.dead && this.state === "dead") continue;
    // الوضعية من حالة الفيزياء
    var mode = "idle", face = p.face || 1, ca = null;
    if(win) mode = "win";
    else if(p.climbing && p.climbQ){
      mode = "climb";
      var dx = p.climbQ.x - p.x, dy = (p.climbQ.y - (p.climbQ.hip || 0.55)) - (p.y - (p.hip || 0.55));
      if(Math.abs(dx) > 0.12) face = dx > 0 ? 1 : -1;
      ca = Math.atan2(dx * face, dy);   // الإيدين على الحبل
    }
    else if(p.anchor){ mode = "hold"; var pd = this.pullDir(i); if(pd) face = pd; }
    else if(!p.ground){ if(live) p.airT += dt; mode = p.vy > 9 || (p.airT > 0.75 && p.vy > 3) ? "fall" : "jump"; }
    else if(Math.abs(p.vx) > 0.6) mode = "walk";
    if(p.ground) p.airT = 0;
    if(live) p.wph += Math.abs(p.vx) * dt * 2.3;
    p.blinkT -= dt; var blink = p.blinkT < 0.12; if(p.blinkT < 0) p.blinkT = 2 + Math.random() * 3;
    // ظل (ولو ماسك: دائرة صفرا تحت رجوله)
    c.fillStyle = p.anchor ? "rgba(253,224,71,.5)" : "rgba(0,0,0,.22)";
    c.beginPath(); c.ellipse(p.x, p.y + 0.02, p.anchor ? 0.52 : 0.34, p.anchor ? 0.11 : 0.07, 0, 0, 6.29); c.fill();
    var sq = p.squash, sx = 1 + sq * 0.22, sy = 1 - sq * 0.22;
    c.save(); c.translate(p.x, p.y); c.scale(face * sx, sy);
    CH.draw(c, p.look, p.color, { mode: mode, ph: p.wph, t: t + i * 0.37, blink: blink, ca: ca, belt: true });
    c.restore();
  }
  this.drawNames(c);
};
Game.prototype.drawNames = function(c){
  var ps = this.players, tags = [], fs = 0.38;
  c.font = "700 " + fs + "px 'IBM Plex Sans Arabic', system-ui, sans-serif";
  for(var i = 0; i < ps.length; i++){
    var p = ps[i]; if(p.dead && this.state === "dead") continue;
    var label = p.off ? "📵 " + p.name : p.name;
    if(!p._lw || p._ll !== label){ p._lw = c.measureText(label).width; p._ll = label; }
    var lw = p._lw + 0.36, y = p.y - (p.top || 1.5) * (1 - p.squash * 0.22) - 0.3;
    tags.push({ x: p.x, y: y, w: lw, label: label, color: p.color });
  }
  // نرتّبها ونرفع اللي يتراكب على اللي قبله
  tags.sort(function(a, b){ return b.y - a.y; });
  for(i = 0; i < tags.length; i++){
    for(var j = 0; j < i; j++){
      var a = tags[i], b = tags[j];
      if(Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 0.05 && Math.abs(a.y - b.y) < 0.52){ a.y = b.y - 0.54; j = -1; }
    }
  }
  c.textAlign = "center"; c.textBaseline = "middle";
  for(i = 0; i < tags.length; i++){
    var tg = tags[i];
    c.fillStyle = "rgba(10,8,20,.66)"; rrect(c, tg.x - tg.w / 2, tg.y - 0.36, tg.w, 0.5, 0.22); c.fill();
    c.fillStyle = tg.color; c.fillRect(tg.x - tg.w / 2 + 0.12, tg.y - 0.15, 0.08, 0.08);
    c.fillStyle = "#fff"; c.fillText(tg.label, tg.x + 0.05, tg.y - 0.1);
  }
};
Game.prototype.drawParts = function(c){
  var ps = this.parts;
  for(var i = 0; i < ps.length; i++){
    var q = ps[i], a = q.life / q.max;
    c.globalAlpha = Math.min(1, a * 1.6); c.fillStyle = q.color;
    if(q.kind === 3){ c.save(); c.translate(q.x, q.y); c.rotate(q.life * 6); c.fillRect(-q.size, -q.size * 0.5, q.size * 2, q.size); c.restore(); }
    else { c.beginPath(); c.arc(q.x, q.y, q.size * (q.kind === 0 ? (0.6 + a * 0.6) : 1), 0, 6.29); c.fill(); }
  }
  c.globalAlpha = 1;
};
Game.prototype.drawLava = function(c, x1, x2, y2, t){
  var y = this.lava.y; if(y > y2 + 1) return;
  var gl = c.createLinearGradient(0, y, 0, y + 6); gl.addColorStop(0, "#fde047"); gl.addColorStop(0.2, "#f97316"); gl.addColorStop(1, "#7c2d12");
  c.fillStyle = gl; c.beginPath(); c.moveTo(x1 - 1, y2 + 2);
  for(var x = Math.floor(x1) - 1; x <= x2 + 1; x += 0.5) c.lineTo(x, y + Math.sin(x * 1.7 + t * 3) * 0.12);
  c.lineTo(x2 + 1, y2 + 2); c.closePath(); c.fill();
  c.fillStyle = "rgba(249,115,22,.18)"; c.fillRect(x1 - 1, y - 1.6, x2 - x1 + 2, 1.6);
};

/* ======================= محرّر الشكل (نفس الكود للشاشة والجوال) ======================= */
function lkIdx(arr){ return arr.map(function(n, i){ return [i, n]; }); }
var LK_SWAP = { m2f: [0, 1, 1, 2, 1], f2m: [0, 1, 3] };   // لما يتغيّر رجّال/بنت: أقرب لبس
function LookEditor(el, o){
  var self = this; o = o || {};
  this.el = el; this.o = o; this.slot = o.slot | 0; this.color = o.color || COLORS[this.slot % 8];
  this.look = CH.normLook(o.look, this.slot); this.cheer = 0; this.last = 0; this.t = 0; this.blinkT = 2; this.raf = 0;
  this.reduced = !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  el.classList.add("lk");
  el.innerHTML = '<div class="lk-stage"><canvas class="lk-cv" aria-hidden="true"></canvas>'
    + '<button type="button" class="lk-rand" data-lk="rand">🎲 شكل عشوائي</button></div>'
    + '<div class="lk-rows" data-lkrows></div>';
  this.cv = el.querySelector(".lk-cv"); this.rows = el.querySelector("[data-lkrows]");
  this._click = function(e){ self.onClick(e); };
  el.addEventListener("click", this._click);
  this.renderRows();
  this._loop = function(ts){
    self.raf = 0;
    if(!self.cv.isConnected || !self.cv.offsetParent) return;   // مخفي: يوقف لين wake()
    self.frame(ts); self.raf = requestAnimationFrame(self._loop);
  };
  this.wake();
}
LookEditor.prototype.wake = function(){ if(!this.raf){ this.last = 0; this.raf = requestAnimationFrame(this._loop); } this.paintFaces(); };
LookEditor.prototype.destroy = function(){ cancelAnimationFrame(this.raf); this.raf = 0; this.el.removeEventListener("click", this._click); this.el.innerHTML = ""; this.el.classList.remove("lk"); };
LookEditor.prototype.setColor = function(col){ if(col && col !== this.color){ this.color = col; this.paintFaces(); } };
LookEditor.prototype.setLook = function(L){
  L = CH.normLook(L, this.slot); if(CH.sameLook(L, this.look)) return;
  var g = L.g !== this.look.g; this.look = L; if(g) this.renderRows(); else this.syncRows();
};
LookEditor.prototype.renderRows = function(){
  var L = this.look, fem = L.g === "f";
  var row = function(label, inner, cls){ return '<div class="lk-row' + (cls ? " " + cls : "") + '" role="group" aria-label="' + label + '"><span class="lk-l">' + label + '</span><div class="lk-ch">' + inner + '</div></div>'; };
  var chips = function(k, list){ return list.map(function(it){ return '<button type="button" class="lk-c" data-lk="' + k + '" data-v="' + it[0] + '" aria-pressed="false">' + esc(it[1]) + '</button>'; }).join(""); };
  var faces = "", nf = fem ? CH.LOOK.ff : CH.LOOK.fm;
  for(var i = 0; i < nf; i++) faces += '<button type="button" class="lk-c lk-face" data-lk="f" data-v="' + i + '" aria-pressed="false" aria-label="الملامح ' + (i + 1) + '"><canvas aria-hidden="true"></canvas></button>';
  this.rows.innerHTML = row("أنا", chips("g", CH.LOOK.g))
    + row("الجسم", chips("b", lkIdx(CH.LOOK.b)))
    + row("الطول", chips("h", lkIdx(CH.LOOK.h)))
    + (fem ? "" : row("الشعر", chips("hr", lkIdx(CH.LOOK.hr))))
    + row("الملامح", faces, "lk-faces")
    + row("اللبس", chips("o", lkIdx(fem ? CH.LOOK.of : CH.LOOK.om)));
  this.syncRows();
};
LookEditor.prototype.syncRows = function(){
  var L = this.look;
  Array.prototype.forEach.call(this.rows.querySelectorAll("[data-lk]"), function(b){
    var on = String(L[b.getAttribute("data-lk")]) === b.getAttribute("data-v");
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  this.paintFaces();
};
LookEditor.prototype.paintFaces = function(){
  var L = this.look, col = this.color;
  Array.prototype.forEach.call(this.rows.querySelectorAll(".lk-face canvas"), function(cv, i){
    if(cv.clientWidth) CH.fit(cv, Object.assign({}, L, { f: i }), col, { bust: true, pose: { mode: "idle" } });
  });
};
LookEditor.prototype.onClick = function(e){
  var b = e.target && e.target.closest ? e.target.closest("[data-lk]") : null; if(!b || !this.el.contains(b)) return;
  var k = b.getAttribute("data-lk"), v = b.getAttribute("data-v"), L = Object.assign({}, this.look);
  if(k === "rand") L = CH.randomLook(L);
  else if(k === "g"){ if(v !== L.g){ L.o = (v === "f" ? LK_SWAP.m2f : LK_SWAP.f2m)[L.o] || 0; L.f = v === "f" ? L.f % CH.LOOK.ff : L.f; L.g = v; } }
  else L[k] = +v;
  L = CH.normLook(L, this.slot);
  if(CH.sameLook(L, this.look)) return;
  var gChanged = L.g !== this.look.g;
  this.look = L;
  if(gChanged){ this.renderRows(); var nb = this.rows.querySelector('[data-lk="g"][data-v="' + L.g + '"]'); if(nb) try{ nb.focus({ preventScroll: true }); }catch(err){} }
  else this.syncRows();
  this.cheer = this.reduced ? 0 : 0.8;
  if(this.o.onChange) this.o.onChange(L);
};
LookEditor.prototype.frame = function(ts){
  var dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 1 / 60; this.last = ts; this.t += dt;
  if(this.cheer > 0) this.cheer -= dt;
  this.blinkT -= dt; var blink = this.blinkT < 0.12; if(this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;
  CH.fit(this.cv, this.look, this.color, { pose: { mode: this.cheer > 0 ? "win" : "idle", t: this.t, blink: blink, belt: true }, room: 1.95 });
};

/* ======================= مضيف اللعبة (اللوبي + الإدخال + الواجهة) ======================= */
var KB = [
  { id: "kb0", label: "W A S D", keys: { l: ["KeyA"], r: ["KeyD"], j: ["KeyW"], h: ["KeyS"] }, hint: "W قفز · A/D حركة · S امسك" },
  { id: "kb1", label: "الأسهم", keys: { l: ["ArrowLeft"], r: ["ArrowRight"], j: ["ArrowUp"], h: ["ArrowDown"] }, hint: "↑ قفز · ←/→ حركة · ↓ امسك" },
  { id: "kb2", label: "I J K L", keys: { l: ["KeyJ"], r: ["KeyL"], j: ["KeyI"], h: ["KeyK"] }, hint: "I قفز · J/L حركة · K امسك" },
  { id: "kb3", label: "أرقام 8456", keys: { l: ["Numpad4"], r: ["Numpad6"], j: ["Numpad8"], h: ["Numpad5"] }, hint: "8 قفز · 4/6 حركة · 5 امسك" }
];
var MAXP = 8;
var LOOKS_KEY = "sahra-rope-looks";

function Host(box, hooks){
  this.box = box; this.hooks = hooks || {};
  this.players = [];        // { id, kind:'kb'|'pad'|'phone', name, color, slot, pid?, kbi?, padi?, seen }
  this.phase = "lobby";     // lobby | play | win
  this.level = null; this.game = null; this.round = null;
  this.keys = {}; this.padPrev = {};
  this.net = {};            // pid → { k, s, at }
  this.hbT = 0; this.raf = 0; this.edit = null;
  this.saved = {};          // أشكال لاعبين الكيبورد/اليد (تنحفظ بالجهاز)
  try{ var sv = JSON.parse(root.localStorage.getItem(LOOKS_KEY) || "{}"); if(sv && typeof sv === "object") this.saved = sv; }catch(e){}
  this.reduced = !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var self = this;
  this._kd = function(e){ self.onKey(e, true); };
  this._ku = function(e){ self.onKey(e, false); };
  this._blur = function(){ self.keys = {}; };
  this._vis = function(){ if(doc.hidden && self.game && self.phase === "play"){ self.game.pause(); self.renderHud(); } };
  this._resize = function(){ if(self.game) self.game.resize(); };
  root.addEventListener("keydown", this._kd); root.addEventListener("keyup", this._ku); root.addEventListener("blur", this._blur);
  doc.addEventListener("visibilitychange", this._vis);
  root.addEventListener("resize", this._resize);
  if(root.ResizeObserver){ this._ro = new ResizeObserver(this._resize); }
  this.build();
  this.loop = function(){ self.tick(); self.raf = requestAnimationFrame(self.loop); };
  this.raf = requestAnimationFrame(this.loop);
}
Host.prototype.destroy = function(){
  cancelAnimationFrame(this.raf);
  root.removeEventListener("keydown", this._kd); root.removeEventListener("keyup", this._ku); root.removeEventListener("blur", this._blur);
  doc.removeEventListener("visibilitychange", this._vis); root.removeEventListener("resize", this._resize);
  if(this._ro) this._ro.disconnect();
  this.closeEditor(true);
  if(this.game) this.game.destroy();
  this.box.innerHTML = "";
  this.send("off");
};
Host.prototype.build = function(){
  this.box.innerHTML =
    '<div class="rp-lobby" data-rp="lobby"></div>' +
    '<div class="rp-stage" data-rp="stage" hidden>' +
      '<canvas class="rp-canvas" data-rp="cv" aria-label="ساحة لعبة مربوطين"></canvas>' +
      '<div class="rp-hud" data-rp="hud"></div>' +
      '<div class="rp-toast" data-rp="toast" aria-live="polite"></div>' +
      '<div class="rp-over" data-rp="over" hidden></div>' +
    '</div>';
  var q = this.q = function(n){ return this.box.querySelector('[data-rp="' + n + '"]'); }.bind(this);
  var self = this;
  this.box.addEventListener("click", function(e){ self.onClick(e); });
  if(this._ro) this._ro.observe(q("stage"));
};
Host.prototype.setLevel = function(level, round){
  this.level = level; this.round = round || null;
  if(this.game){ this.game.destroy(); this.game = null; }
  this.phase = "lobby"; this.renderLobby(); this.send();
};
Host.prototype.toast = function(msg, ms){
  var el = this.q("toast"); if(!el) return;
  el.textContent = msg; el.classList.remove("in"); void el.offsetWidth; el.classList.add("in");
  clearTimeout(this._tt); this._tt = setTimeout(function(){ el.classList.remove("in"); }, ms || 1800);
};
Host.prototype.addPlayer = function(o){
  if(this.players.length >= MAXP) return null;
  var used = this.players.map(function(p){ return p.slot; }), slot = 0;
  while(used.indexOf(slot) !== -1) slot++;
  var p = Object.assign({ id: o.kind + ":" + (o.pid || o.kbi != null ? (o.pid || o.kbi) : o.padi) + ":" + Date.now().toString(36), slot: slot, color: COLORS[slot], seen: Date.now() }, o);
  if(o.kind === "pad") p.id = "pad:" + o.padi;
  if(o.kind === "kb") p.id = "kb:" + o.kbi;
  if(o.kind === "phone") p.id = "ph:" + o.pid;
  p.look = CH.normLook(o.look || this.saved[p.id], slot);
  this.players.push(p);
  return p;
};
Host.prototype.removePlayer = function(id){
  if(this.edit && this.edit.id === id) this.closeEditor(true);
  this.players = this.players.filter(function(p){ return p.id !== id; });
};
Host.prototype.saveLook = function(p){
  if(!p || p.kind === "phone") return;
  this.saved[p.id] = p.look;
  try{ root.localStorage.setItem(LOOKS_KEY, JSON.stringify(this.saved)); }catch(e){}
};
Host.prototype.lobbyAllowed = function(){ return this.phase === "lobby"; };
/* ---- الكيبورد ---- */
Host.prototype.onKey = function(e, down){
  var t = e.target; if(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
  if(!this.box.isConnected || this.box.offsetParent === null) return;
  var code = e.code, used = false;
  if(this.edit){ if(code === "Escape" && down){ this.closeEditor(); e.preventDefault(); } return; }   // نافذة الشكل مفتوحة
  for(var i = 0; i < KB.length; i++){
    var K = KB[i].keys;
    for(var a in K){ if(K[a].indexOf(code) !== -1){ used = true; if(down && a === "j" && this.lobbyAllowed() && !this.players.some(function(p){ return p.kind === "kb" && p.kbi === i; })){ var np = this.addPlayer({ kind: "kb", kbi: i, name: "كيبورد " + (i + 1) }); if(np){ this.renderLobby(); this.send(); } } } }
  }
  if(code === "Escape" && this.phase === "play" && this.game){ if(this.game.state === "paused") this.game.resume(); else this.game.pause(); this.renderHud(); used = true; }
  if(code === "KeyP" && down && this.phase === "play" && this.game){ if(this.game.state === "paused") this.game.resume(); else this.game.pause(); this.renderHud(); used = true; }
  if(used){ e.preventDefault(); this.keys[code] = down; }
};
Host.prototype.kbInput = function(i){
  var K = KB[i].keys, k = this.keys, f = function(list){ for(var j = 0; j < list.length; j++) if(k[list[j]]) return true; return false; };
  return { l: f(K.l), r: f(K.r), j: f(K.j), h: f(K.h) };
};
/* ---- يد التحكم ---- */
Host.prototype.pads = function(){
  var out = {}; if(!navigator.getGamepads) return out;
  var gp = navigator.getGamepads() || [];
  for(var i = 0; i < gp.length; i++){
    var g = gp[i]; if(!g || !g.connected) continue;
    var b = function(n){ return !!(g.buttons[n] && g.buttons[n].pressed); }, ax = g.axes[0] || 0;
    out[i] = { l: ax < -0.4 || b(14), r: ax > 0.4 || b(15), j: b(0) || b(12), h: b(1) || b(2) || b(6) || b(7) };
  }
  return out;
};
/* ---- الجوالات (تجي من index.html عن طريق hooks) ---- */
Host.prototype.netMsg = function(m){
  if(!m || typeof m !== "object" || typeof m.pid !== "string") return;
  var pid = m.pid.slice(0, 40), p = this.players.find(function(x){ return x.kind === "phone" && x.pid === pid; });
  var name = String(m.name || "").replace(/\s+/g, " ").trim().slice(0, 14);
  if(m.t === "join" || m.t === "hello"){
    if(!p && m.t === "join"){
      if(this.phase !== "lobby"){ this.send(null, pid, "busy"); return; }
      if(this.players.length >= MAXP){ this.send(null, pid, "full"); return; }
      p = this.addPlayer({ kind: "phone", pid: pid, name: name || "لاعب", look: m.lk && typeof m.lk === "object" ? m.lk : null });
      if(p){ this.toast("📱 انضم " + p.name); this.renderLobby(); }
    } else if(p && this.phase === "lobby"){
      if(name && name !== p.name){ p.name = name; this.renderLobby(); }
      if(m.lk && typeof m.lk === "object") this.setLook(p, m.lk);
    }
    if(p) p.seen = Date.now();
    this.send();
  } else if(m.t === "in" && p){
    var s = +m.s || 0, n = this.net[pid] || (this.net[pid] = { k: 0, s: -1 });
    if(s > n.s || s < n.s - 1000){ n.s = s; n.k = +m.k | 0; }
    p.seen = Date.now();
  } else if(m.t === "bye" && p){
    if(this.phase === "lobby"){ this.removePlayer(p.id); this.renderLobby(); this.send(); }
    else p.seen = 0;
  } else if(m.t === "ping" && p){ p.seen = Date.now(); }
  else if(m.t === "look" && p){   // الجوال غيّر شكله (بس قبل البداية)
    p.seen = Date.now();
    if(this.phase === "lobby" && m.lk && typeof m.lk === "object" && this.setLook(p, m.lk)) this.send();
  }
};
Host.prototype.setLook = function(p, lk){
  var L = CH.normLook(lk, p.slot);
  if(CH.sameLook(L, p.look)) return false;
  p.look = L; this.drawAvatars();
  if(this.edit && this.edit.id === p.id) this.edit.ed.setLook(L);
  return true;
};
Host.prototype.send = function(ph, to, why){
  if(!this.hooks.send) return;
  this.hooks.send("ropeS", {
    ph: ph || this.phase, to: to || null, why: why || null, lv: this.level ? this.level.n : "", d: this.level ? this.level.d : 0,
    pl: this.players.map(function(p){ return { pid: p.kind === "phone" ? p.pid : null, n: p.name, c: p.color, s: p.slot, k: p.kind, lk: p.look }; })
  });
};
/* ---- الحلقة: الإدخال + نبضة للجوالات ---- */
Host.prototype.tick = function(){
  var now = Date.now(), pads = this.pads(), self = this;
  // انضمام يد تحكم من اللوبي
  if(this.phase === "lobby"){
    Object.keys(pads).forEach(function(i){
      var g = pads[i], prev = self.padPrev[i] || {};
      if(g.j && !prev.j && !self.players.some(function(p){ return p.kind === "pad" && p.padi === +i; })){ if(self.addPlayer({ kind: "pad", padi: +i, name: "يد " + (+i + 1) })){ self.renderLobby(); self.send(); } }
    });
  }
  this.padPrev = pads;
  if(this.game && this.phase === "play"){
    this.players.forEach(function(p){
      var inp = { l:false, r:false, j:false, h:false, off:false };
      if(p.kind === "kb") inp = self.kbInput(p.kbi);
      else if(p.kind === "pad") inp = pads[p.padi] || inp;
      else if(p.kind === "phone"){
        var n = self.net[p.pid], k = n ? n.k : 0, live = now - (p.seen || 0) < 7000;
        inp = { l: !!(k & 1), r: !!(k & 2), j: !!(k & 4), h: !!(k & 8), off: !live };
      }
      self.game.setInput(p.id, inp);
    });
    if(now - (this._hudT || 0) > 250){ this._hudT = now; this.renderHud(); }
  }
  if(now - this.hbT > 3000){ this.hbT = now; this.send(); if(this.phase === "lobby") this.renderPresence(); }
};
/* ---- اللوبي ---- */
Host.prototype.renderLobby = function(){
  var lv = this.level, box = this.q("lobby"), st = this.q("stage");
  box.hidden = this.phase !== "lobby"; st.hidden = this.phase === "lobby";
  if(this.phase !== "lobby" || !lv) return;
  var T = THEMES[lv.th] || THEMES.night, self = this;
  var slots = "";
  for(var i = 0; i < MAXP; i++){
    var p = this.players.find(function(x){ return x.slot === i; });
    if(p){
      var ic = p.kind === "phone" ? "📱 من جواله" : p.kind === "pad" ? "🎮 يد تحكم" : "⌨️ " + KB[p.kbi].label, local = p.kind !== "phone";
      slots += '<li class="rp-slot on" style="--c:' + p.color + '"><canvas class="rp-avc" data-avc="' + esc(p.id) + '" aria-hidden="true"></canvas>'
        + '<span class="rp-sl"><b>' + esc(p.name) + '</b><small>' + ic + '</small></span>'
        + (local ? '<button type="button" class="rp-ed" data-rped="' + esc(p.id) + '" title="غيّر الشكل" aria-label="غيّر شكل ' + esc(p.name) + '">🎨</button>' : '')
        + '<button type="button" class="rp-x" data-rpx="' + esc(p.id) + '" aria-label="شيل ' + esc(p.name) + '">✕</button></li>';
    } else slots += '<li class="rp-slot"><span class="rp-av empty"></span><span class="rp-sl"><b>فاضي</b><small>' + (i < 2 ? "لازم لاعب" : "اختياري") + '</small></span></li>';
  }
  var n = this.players.length, can = n >= 2;
  var url = this.hooks.phoneUrl ? this.hooks.phoneUrl() : "";
  box.innerHTML =
    '<div class="rp-lv" style="--th:' + T.top + ';--th2:' + T.edge + '">'
      + '<div class="rp-lv-art" aria-hidden="true"><canvas data-rp="prev" width="560" height="220"></canvas></div>'
      + '<div class="rp-lv-info"><span class="rp-kick">المرحلة ' + lv.id + ' من 200 · ' + esc(T.name) + ' · ' + esc(LAYOUT_NAMES[lv.lay] || "") + '</span>'
      + '<h3>' + esc(lv.n) + '</h3><div class="rp-diff" aria-label="الصعوبة ' + lv.d + ' من 5">' + [1, 2, 3, 4, 5].map(function(k){ return '<i class="' + (k <= lv.d ? "on" : "") + '"></i>'; }).join("") + '<span>' + ["", "سهلة", "متوسطة", "تحتاج تنسيق", "صعبة", "للأبطال"][lv.d] + '</span></div>'
      + '<p>الحبل طوله ' + (Math.round((+lv.L || 3.6) * 10) / 10) + ' خطوات · ' + (lv.cp ? lv.cp.length : 0) + ' أعلام حفظ' + (lv.R ? ' · <b>🔥 الحمم تطلع وراكم!</b>' : '') + '</p></div>'
    + '</div>'
    + '<div class="rp-join">'
      + '<div class="rp-qr-card"><div class="rp-qr" data-rp="qr"></div><p><b>جوالك يصير يد تحكم</b>امسحوا الباركود بكاميرا الجوال (بدون تطبيق) — لين 8 لاعبين.</p>'
      + (url ? '<button type="button" class="rp-copy" data-rpcopy>نسخ الرابط</button>' : '') + '</div>'
      + '<div class="rp-kb"><p><b>أو العبوا من هذا الجهاز</b>كل لاعب يضغط زر القفز حقه عشان يدخل:</p><ul>'
      + KB.map(function(k, i){ var inn = self.players.some(function(p){ return p.kind === "kb" && p.kbi === i; }); return '<li class="' + (inn ? "in" : "") + '"><kbd>' + esc(k.label) + '</kbd><span>' + esc(k.hint) + '</span></li>'; }).join("")
      + '<li><kbd>🎮</kbd><span>يد تحكم: اضغط A</span></li></ul></div>'
    + '</div>'
    + '<p class="rp-look-tip">🎨 <b>غيّروا أشكالكم قبل البداية:</b> سمين أو نحيف، طويل أو قصير، شعر كثيف أو خفيف، والملامح واللبس — اللي بالجوال من جواله، واللي بالكيبورد من زر 🎨 جنب اسمه.</p>'
    + '<ol class="rp-slots" data-rp="slots">' + slots + '</ol>'
    + '<div class="rp-start"><button type="button" class="btn-primary rp-go" data-rpgo' + (can ? "" : " disabled") + '>▶ ابدؤوا المرحلة' + (n ? ' <small>(' + n + ' لاعبين)</small>' : '') + '</button>'
    + '<p class="rp-tip">' + (can ? "🤝 امشوا مع بعض — الحبل يسحب اللي يبتعد. اللي يطيح: زملاؤه يمسكونه (زر «امسك») وهو يتسلّق الحبل (اضغط قفز)." : "تحتاجون لاعبين على الأقل.") + '</p></div>';
  this.drawPreview(box.querySelector('[data-rp="prev"]'));
  this.drawAvatars();
  var qrBox = box.querySelector('[data-rp="qr"]');
  if(qrBox && this.hooks.qr) this.hooks.qr(qrBox, url);
};
Host.prototype.drawAvatars = function(){
  var box = this.q("slots"), self = this; if(!box || this.phase !== "lobby") return;
  Array.prototype.forEach.call(box.querySelectorAll("[data-avc]"), function(cv){
    var id = cv.getAttribute("data-avc"), p = self.players.find(function(x){ return x.id === id; });
    if(p) CH.fit(cv, p.look, p.color, { room: 1.72, floor: 0.04, shadow: false, pose: { mode: "idle" } });
  });
};
Host.prototype.openEditor = function(id){
  var p = this.players.find(function(x){ return x.id === id; }), self = this;
  if(!p || this.phase !== "lobby") return;
  this.closeEditor(true);
  // النافذة تنحط على مستوى الصفحة (عشان ما تتأثر بحاويات اللعبة)
  var m = this.edm;
  if(!m){
    m = this.edm = doc.createElement("div"); m.className = "rp-edm";
    m.addEventListener("click", function(e){ var t = e.target; if(t === m || (t.closest && t.closest("[data-rpedx]"))) self.closeEditor(); });
    m.addEventListener("keydown", function(e){
      if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); self.closeEditor(); return; }
      if(e.key !== "Tab") return;
      var f = m.querySelectorAll("button"), a = f[0], z = f[f.length - 1];
      if(e.shiftKey && doc.activeElement === a){ e.preventDefault(); z.focus(); }
      else if(!e.shiftKey && doc.activeElement === z){ e.preventDefault(); a.focus(); }
    });
  }
  doc.body.appendChild(m);
  m.innerHTML = '<div class="rp-edm-card" role="dialog" aria-modal="true" aria-labelledby="rpEdmT" style="--c:' + p.color + '">'
    + '<div class="rp-edm-h"><h3 id="rpEdmT">🎨 شكل «' + esc(p.name) + '»</h3><button type="button" class="rp-edm-x" data-rpedx aria-label="إغلاق">✕</button></div>'
    + '<div data-rp="lk"></div>'
    + '<div class="rp-edm-f"><button type="button" class="btn-primary" data-rpedx>تم ✓</button></div></div>';
  this.edit = { id: id, ed: new LookEditor(m.querySelector('[data-rp="lk"]'), { look: p.look, slot: p.slot, color: p.color,
    onChange: function(L){ p.look = L; self.saveLook(p); self.drawAvatars(); self.send(); } }) };
  try{ var on = m.querySelector(".lk-c.on"); if(on) on.focus({ preventScroll: true }); }catch(e){}
};
Host.prototype.closeEditor = function(quiet){
  var id = null;
  if(this.edit){ id = this.edit.id; this.edit.ed.destroy(); this.edit = null; }
  var m = this.edm; if(m && m.parentNode){ m.innerHTML = ""; m.parentNode.removeChild(m); }
  if(!quiet && id){ var b = this.box.querySelector('[data-rped="' + id + '"]'); if(b) try{ b.focus({ preventScroll: true }); }catch(e){} }
};
Host.prototype.renderPresence = function(){
  var now = Date.now(), box = this.q("slots"); if(!box) return;
  this.players.forEach(function(p){ if(p.kind !== "phone") return; var li = box.querySelector('[data-rpx="' + p.id + '"]'); if(li) li.parentNode.classList.toggle("away", now - (p.seen || 0) > 8000); });
};
Host.prototype.drawPreview = function(cv){
  if(!cv || !this.level) return;
  var lv = prepLevel(this.level), c = cv.getContext("2d"), T = THEMES[lv.th] || THEMES.night;
  var W = cv.width, H = cv.height, g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, T.sky[0]); g.addColorStop(1, T.sky[2]); c.fillStyle = g; c.fillRect(0, 0, W, H);
  var s = Math.min((W - 20) / lv.w, (H - 20) / lv.h), ox = (W - lv.w * s) / 2, oy = (H - lv.h * s) / 2;
  c.setTransform(s, 0, 0, s, ox, oy);
  c.fillStyle = T.plat; lv.solids.forEach(function(r){ c.fillRect(r.x, r.y, r.w, Math.min(r.h, lv.h - r.y)); });
  c.fillStyle = T.top; lv.solids.forEach(function(r){ c.fillRect(r.x, r.y, r.w, 0.5); }); lv.ones.forEach(function(r){ c.fillRect(r.x, r.y, r.w, 0.4); });
  c.fillStyle = T.edge; lv.movers.forEach(function(m){ c.fillRect(m.bx, m.by, m.w, 0.6); });
  c.fillStyle = "#f97316"; lv.hz.forEach(function(h){ if(h.t === 2) c.fillRect(h.x, h.y, h.w, h.h); });
  c.fillStyle = "#e2e8f0"; lv.hz.forEach(function(h){ if(h.t !== 2) c.fillRect(h.x, h.y, h.w, h.h); });
  c.fillStyle = "#fde047"; c.beginPath(); c.arc(lv.goal[0] + lv.goal[2] / 2, lv.goal[1] + lv.goal[3] / 2, 1.8, 0, 6.29); c.fill();
  c.fillStyle = "#fff"; lv.cps.forEach(function(p){ c.fillRect(p[0] - 0.3, p[1] - 2.5, 0.6, 2.5); });
  c.fillStyle = "#f43f5e"; c.beginPath(); c.arc(lv.spawn[0], lv.spawn[1] - 1, 1.2, 0, 6.29); c.fill();
  c.setTransform(1, 0, 0, 1, 0, 0);
};
/* ---- التشغيل ---- */
Host.prototype.begin = function(){
  if(this.players.length < 2 || !this.level) return;
  var self = this;
  this.closeEditor(true);
  this.phase = "play";
  this.renderLobby();
  var cv = this.q("cv");
  if(this.game) this.game.destroy();
  this.game = new Game(cv, {
    level: this.level, reducedMotion: this.reduced,
    players: this.players.map(function(p){ return { id: p.id, name: p.name, color: p.color, slot: p.slot, look: p.look }; }),
    onEvent: function(type, d){ self.onGame(type, d); }
  });
  this.game.resize(); this.game.start();
  this.q("over").hidden = true;
  this.renderHud(); this.send();
  this.toast("يلا! امشوا مع بعض 🤝", 2200);
  try{ this.q("stage").focus({ preventScroll: true }); }catch(e){}
};
Host.prototype.onGame = function(type, d){
  if(type === "fall"){ this.toast("💥 طاح " + d.name + " — نرجع لآخر علم"); this.renderHud(); if(this.hooks.sfx) this.hooks.sfx("fall"); }
  else if(type === "checkpoint"){ this.toast("🚩 علم حفظ " + d.n + " من " + d.of); this.renderHud(); if(this.hooks.sfx) this.hooks.sfx("cp"); }
  else if(type === "win"){ this.phase = "win"; this.send(); this.renderWin(d); if(this.hooks.sfx) this.hooks.sfx("win"); if(this.hooks.onWin) this.hooks.onWin(this.result(d)); }
  else if(type === "jump" && this.hooks.sfx){ this.hooks.sfx("jump"); }
};
Host.prototype.result = function(d){
  var lv = this.level, par = Math.round((lv.w + (lv.lay === "climb" || lv.lay === "mix" ? lv.h : 0)) / 2.4 + 20 + this.players.length * 4);
  var stars = 1 + (d.falls <= 2 ? 1 : 0) + (d.time <= par ? 1 : 0);
  return { id: lv.id, name: lv.n, time: d.time, falls: d.falls, stars: stars, par: par, players: this.players.length };
};
Host.prototype.renderHud = function(){
  var g = this.game, hud = this.q("hud"); if(!g || !hud) return;
  var st = g.stats(), lv = this.level, paused = g.state === "paused";
  var offline = this.players.filter(function(p){ return p.kind === "phone" && Date.now() - (p.seen || 0) > 7000; });
  var html = '<div class="rp-hl"><b>' + esc(lv.n) + '</b><span>المرحلة ' + lv.id + '</span></div>'
    + '<div class="rp-hs"><span title="الوقت">⏱️ <b>' + fmtTime(st.time) + '</b></span><span title="السقطات">💥 <b>' + st.falls + '</b></span><span title="أعلام الحفظ">🚩 <b>' + st.cp + '/' + st.cps + '</b></span></div>'
    + '<div class="rp-hb">'
    + (offline.length ? '<span class="rp-off">📵 ' + offline.map(function(p){ return esc(p.name); }).join("، ") + '</span>' : '')
    + '<button type="button" data-rpact="pause">' + (paused ? "▶️ كمّل" : "⏸️ إيقاف") + '</button>'
    + '<button type="button" data-rpact="restart">↺ من البداية</button>'
    + '<button type="button" data-rpact="lobby">👥 اللاعبين</button>'
    + '<button type="button" data-rpact="fs" aria-label="ملء الشاشة">⛶</button></div>';
  if(hud._h !== html){ hud._h = html; hud.innerHTML = html; }
  var over = this.q("over");
  if(paused && this.phase === "play"){
    var oh = '<div class="rp-card"><h3>⏸️ موقّفة</h3><p>اضغطوا كمّل لما تجهزون.</p><button type="button" class="btn-primary" data-rpact="pause">▶️ كمّل</button></div>';
    if(over._h !== oh || over.hidden){ over._h = oh; over.innerHTML = oh; over.hidden = false; }
  }
  else if(this.phase === "play" && !over.hidden){ over.hidden = true; over._h = ""; }
};
Host.prototype.renderWin = function(d){
  var r = this.result(d), over = this.q("over");
  over.hidden = false; over._h = "win";
  over.innerHTML = '<div class="rp-card win"><div class="rp-stars">' + [1, 2, 3].map(function(k){ return '<i class="' + (k <= r.stars ? "on" : "") + '">★</i>'; }).join("") + '</div>'
    + '<h3>وصلتوا! 🎉</h3><p>' + esc(r.name) + '</p>'
    + '<div class="rp-res"><span>⏱️<b>' + fmtTime(r.time) + '</b><small>الوقت</small></span><span>💥<b>' + r.falls + '</b><small>سقطات</small></span><span>👥<b>' + r.players + '</b><small>لاعبين</small></span></div>'
    + '<p class="rp-tip">' + (r.stars === 3 ? "مثالية! ولا غلطة تقريبًا 👏" : r.falls > 2 ? "النجمة الجاية: سقطتين أو أقل" : "النجمة الجاية: خلصوها خلال " + fmtTime(r.par)) + '</p>'
    + '<div class="rp-btns"><button type="button" class="btn-primary" data-rpact="next">⏭ مرحلة جديدة</button><button type="button" class="btn-ghost" data-rpact="again">↺ نفس المرحلة مرة ثانية</button></div></div>';
};
Host.prototype.onClick = function(e){
  var t = e.target, self = this;
  var ed = t.closest("[data-rped]"); if(ed){ this.openEditor(ed.getAttribute("data-rped")); return; }
  var x = t.closest("[data-rpx]"); if(x){ this.removePlayer(x.getAttribute("data-rpx")); this.renderLobby(); this.send(); return; }
  if(t.closest("[data-rpgo]")){ this.begin(); return; }
  if(t.closest("[data-rpcopy]")){ var u = this.hooks.phoneUrl ? this.hooks.phoneUrl() : ""; if(u && navigator.clipboard) navigator.clipboard.writeText(u).then(function(){ self.toast("انسخ الرابط ✅"); }, function(){}); return; }
  var a = t.closest("[data-rpact]"); if(!a) return;
  var act = a.getAttribute("data-rpact"), g = this.game;
  if(act === "pause" && g){ if(g.state === "paused") g.resume(); else g.pause(); this.renderHud(); }
  else if(act === "restart" && g){ g.restart(); this.q("over").hidden = true; this.phase = "play"; this.renderHud(); }
  else if(act === "again" && g){ g.restart(); this.q("over").hidden = true; this.phase = "play"; this.send(); this.renderHud(); }
  else if(act === "lobby"){ if(g){ g.destroy(); this.game = null; } this.phase = "lobby"; this.renderLobby(); this.send(); }
  else if(act === "next"){ if(this.hooks.onNext) this.hooks.onNext(); }
  else if(act === "fs"){ var st = this.q("stage"); try{ if(doc.fullscreenElement) doc.exitFullscreen(); else if(st.requestFullscreen) st.requestFullscreen(); }catch(err){} }
};

root.SahraRope = { PHYS: PHYS, THEMES: THEMES, COLORS: COLORS, Game: Game, Host: Host, prepLevel: prepLevel, CH: CH, LookEditor: LookEditor,
  mount: function(box, hooks){ return new Host(box, hooks); } };
})(typeof window !== "undefined" ? window : globalThis);
