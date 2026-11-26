/* لوحة الأدمن — نظرة عامة (M2a). بيانات فعلية من دوال موجودة أصلًا: admin_stats · admin_transfer_orders · catalog · transfer_methods · question_reports · app_settings.
   ما فيه طلبات مستمرة (لا Polling ولا Realtime): كل فتح للقسم = 7 طلبات خفيفة، والأرقام اللي ما لها مصدر موثوق ما تنعرض (ما نخترع بيانات). */
(function(){
  "use strict";
  var C = null, RANGE = 7, tok = 0, STATE = null;
  var T = {
    ar:{ rng:function(n){ return "آخر " + n + (n === 7 ? " أيام" : " يوم"); },
      accounts:"إجمالي الحسابات", active:"عملاء نشطون", activeT:"لعبوا خلال الفترة", fresh:"حسابات جديدة", freshT:"سجّلوا خلال الفترة", sales:"إجمالي المبيعات", salesT:function(t, o){ return "اليوم " + t + " · " + o + " طلب مدفوع بالفترة"; },
      status:"الوضع العام", sUp:"المنصة تعمل", sUpT:"الاتصال بقاعدة البيانات", sPay:"الدفع الإلكتروني", sPayOn:"مفعّل (ميسّر)", sPayOff:"غير مفعّل", sTr:"التحويل البنكي", sTrOk:function(n){ return n + " وسيلة مضبوطة"; }, sTrNo:"ما فيه وسيلة مضبوطة", sMaint:"وضع الصيانة", sMaintOff:"مطفي", sMaintOn:"مفعّل — العملاء ما يبدأون جولات",
      aBlock:"حظر", aUnblock:"رفع حظر", aStatus:"حالة", aCredit:"رصيد", aTrial:"تجربة", aOrder:"طلب", aSetting:"إعداد", aMaint:"صيانة",
      tBlock:"حظر حساب", tUnblock:"رفع حظر عن حساب", tStatus:"تغيير حالة حساب", tCredit:function(d){ return (d.delta > 0 ? "إضافة " : "خصم ") + Math.abs(d.delta | 0) + " جولة"; }, tTrial:"إرجاع تجربة مجانية", tConfirm:function(d){ return "تفعيل طلب #" + (d.code || "—"); }, tCancel:function(d){ return "رفض طلب #" + (d.code || "—"); }, tMaint:function(d){ return d.on ? "تفعيل وضع الصيانة" : "إيقاف وضع الصيانة"; }, SN:{ hidden_games:"ظهور الألعاب", buzz_timer:"مؤقت أسرع إصبع", round_sizes:"حجم الجولة", play:"إعدادات اللعب", payments_enabled:"الدفع أونلاين", contact:"رقم الواتساب", seller:"بيانات البائع", transfer:"طرق التحويل" }, tSetting:function(k){ return "تعديل إعداد: " + (this.SN[k] || k); },
      games:"حالة الألعاب", gShown:"ألعاب ظاهرة", gHidden:"ألعاب مخفية", gTotal:"إجمالي الألعاب",
      act:"نشاط الألعاب (عدد الجولات)", details:"عرض التفاصيل",
      quick:"إجراءات سريعة", qGrant:"منح جولات", qAdd:"إضافة سؤال", qImport:"استيراد أسئلة", qPack:"إنشاء باقة", qPromo:"كود خصم جديد", qSoon:"قريبًا", qReports:"البلاغات", qStats:"التقارير", qGames:"إعدادات الألعاب",
      content:"ملخص المحتوى", total:"الإجمالي", rest:"باقي الألعاب",
      orders:"أحدث الطلبات", all:"عرض الكل", ops:"آخر العمليات الإدارية", opsAll:"عرض السجل", opTag:"تفعيل طلب", opTxt:function(c, a){ return "طلب #" + c + " · " + a; }, opsNote:"سجل العمليات غير مفعّل بعد (ملف SQL رقم 14) — نعرض تفعيلات الطلبات فقط.",
      none:"ما فيه بيانات بعد", noOrders:"ما فيه طلبات", noOps:"ما فيه عمليات بعد", cur:"ريال",
      stWait:"بانتظار التحقق", stOpen:"بانتظار الدفع", stPaid:"مدفوع", stCancel:"ملغى", stFail:"مرفوض", err:"تعذّر تحميل بعض البيانات" },
    en:{ rng:function(n){ return "Last " + n + " days"; },
      accounts:"Total accounts", active:"Active customers", activeT:"played in range", fresh:"New accounts", freshT:"signed up in range", sales:"Total sales", salesT:function(t, o){ return "Today " + t + " · " + o + " paid orders in range"; },
      status:"System status", sUp:"Platform is up", sUpT:"Database connection", sPay:"Online payment", sPayOn:"On (Moyasar)", sPayOff:"Off", sTr:"Bank transfer", sTrOk:function(n){ return n + " method(s) set"; }, sTrNo:"No method set", sMaint:"Maintenance mode", sMaintOff:"Off", sMaintOn:"On — customers can't start rounds",
      aBlock:"Block", aUnblock:"Unblock", aStatus:"Status", aCredit:"Credits", aTrial:"Trial", aOrder:"Order", aSetting:"Setting", aMaint:"Maintenance",
      tBlock:"Blocked an account", tUnblock:"Unblocked an account", tStatus:"Changed account status", tCredit:function(d){ return (d.delta > 0 ? "Added " : "Removed ") + Math.abs(d.delta | 0) + " round(s)"; }, tTrial:"Reset a free trial", tConfirm:function(d){ return "Activated order #" + (d.code || "—"); }, tCancel:function(d){ return "Rejected order #" + (d.code || "—"); }, tMaint:function(d){ return d.on ? "Turned maintenance on" : "Turned maintenance off"; }, SN:{ hidden_games:"game visibility", buzz_timer:"buzzer timer", round_sizes:"round size", play:"play settings", payments_enabled:"online payment", contact:"WhatsApp number", seller:"seller details", transfer:"transfer methods" }, tSetting:function(k){ return "Changed setting: " + (this.SN[k] || k); },
      games:"Game status", gShown:"Visible games", gHidden:"Hidden games", gTotal:"Total games",
      act:"Game activity (rounds)", details:"View details",
      quick:"Quick actions", qGrant:"Grant rounds", qAdd:"Add a question", qImport:"Import questions", qPack:"Create a package", qPromo:"New discount code", qSoon:"Soon", qReports:"Reports", qStats:"Analytics", qGames:"Game settings",
      content:"Content summary", total:"Total", rest:"Other games",
      orders:"Latest orders", all:"View all", ops:"Latest admin actions", opsAll:"View log", opTag:"Order activated", opTxt:function(c, a){ return "Order #" + c + " · " + a; }, opsNote:"The audit log isn't enabled yet (SQL file 14) — showing order activations only.",
      none:"No data yet", noOrders:"No orders", noOps:"No actions yet", cur:"SAR",
      stWait:"Awaiting review", stOpen:"Awaiting payment", stPaid:"Paid", stCancel:"Canceled", stFail:"Rejected", err:"Some data could not be loaded" }
  };
  var L = function(){ return T[window.Adm.lang()]; };
  var GN = { ar:{ trivia:"سين جيم", emoji:"تحدي الصور", letters:"الحروف", flags:"حزر العلم", heads:"على راسك", charades:"التمثيل", million:"طريق المليون", rope:"مربوطين", mafia:"المافيا" },
             en:{ trivia:"Trivia", emoji:"Pictures", letters:"Letters", flags:"Flags", heads:"On Your Head", charades:"Charades", million:"Million", rope:"Tied Together", mafia:"Mafia" } };
  var GI = { trivia:"filetext", emoji:"image", letters:"filetext", flags:"image", heads:"layers", charades:"film", million:"trend", rope:"library", mafia:"users" };
  function esc(s){ return C.esc(String(s == null ? "" : s)); }
  function tz(ts, o){ return new Date(ts).toLocaleString("en-GB", Object.assign({ timeZone: "Asia/Riyadh" }, o)); }
  function hm(ts){ return ts ? tz(ts, { hour: "2-digit", minute: "2-digit", hour12: false }) : ""; }
  function dm(ts){ return ts ? tz(ts, { day: "numeric", month: "numeric" }) : ""; }
  function money(n){ return Adm.fmt(n, n % 1 ? 2 : 0) + " " + L().cur; }
  function ok(r){ return r && !r.error; }
  function ic(n){ return Adm.icon(n); }

  function skeleton(){
    var s = '<div class="ov-top">'; for(var i = 0; i < 4; i++) s += '<div class="adm-skel" style="min-height:92px;border-radius:20px"></div>'; s += '<div class="adm-skel" style="min-height:52px;border-radius:16px"></div></div>';
    return s + '<div class="ov-grid"><div class="adm-skel c-3" style="min-height:250px;border-radius:20px"></div><div class="adm-skel c-4" style="min-height:250px;border-radius:20px"></div><div class="adm-skel c-5" style="min-height:250px;border-radius:20px"></div></div>';
  }
  function fetchAll(range){
    return Promise.all([
      C.SB.rpc("admin_stats", { p_days: range }),                                             // 0 الفترة
      C.SB.rpc("admin_stats", { p_days: 1 }),                                                 // 1 اليوم
      C.SB.rpc("admin_transfer_orders", { p_all: true }),                                      // 2 الطلبات
      C.SB.rpc("catalog"),                                                                    // 3 المحتوى + حالة الدفع
      C.SB.rpc("transfer_methods"),                                                           // 4 وسائل التحويل
      C.SB.from("question_reports").select("id", { count:"exact", head:true }).eq("status", "open"),   // 5 البلاغات
      C.SB.from("app_settings").select("value").eq("key", "hidden_games").maybeSingle(),       // 6 الألعاب المخفية
      C.SB.from("admin_audit_log").select("id,at,action,details").order("id", { ascending:false }).limit(4)   // 7 آخر عمليات السجل (ما يكسر لو الجدول ما اتفعّل)
    ]);
  }
  function kpi(i, icn, label, valHtml, title, go){
    return '<button type="button" class="ov-kpi adm-glass adm-lift adm-sheen adm-rv" style="--i:' + i + '" data-go="' + go + '" title="' + esc(title) + '"><span class="ico">' + ic(icn) + '</span><span class="tx"><span class="val">' + valHtml + '</span><span class="lb">' + label + '</span></span></button>';
  }
  function card(i, cls, title, link, body){
    return '<div class="ov-card adm-glass adm-rv ' + cls + '" style="--i:' + i + '"><h3>' + title + (link ? '<button type="button" data-go="' + link[0] + '">' + ic("arrow") + '<span>' + link[1] + '</span></button>' : '') + '</h3>' + body + '</div>';
  }
  function render(R, range){
    var l = L(), lg = Adm.lang();
    var st = ok(R[0]) ? C.rpcData(R[0]) || {} : {}, td = ok(R[1]) ? C.rpcData(R[1]) || {} : {}, orders = ok(R[2]) ? C.rpcData(R[2]) || {} : {}, cat = ok(R[3]) ? C.rpcData(R[3]) || {} : {};
    var tm = ok(R[4]) ? C.rpcData(R[4]) || {} : {}, repN = ok(R[5]) ? R[5].count | 0 : 0;
    var hid = ok(R[6]) && R[6].data && Array.isArray(R[6].data.value) ? R[6].data.value : (Array.isArray(cat.hidden) ? cat.hidden : []);
    var failed = [0, 1, 2, 3, 4, 5, 6].filter(function(i){ return !ok(R[i]); });
    var users = st.users || {}, sales = st.sales || {}, GAMES = C.games();
    var visible = GAMES.filter(function(x){ return hid.indexOf(x.id) === -1; });
    var salesTotal = +sales.revenue || 0, salesOrders = +sales.orders || 0;

    /* الصف 1: المؤشرات + الفترة */
    var h = '<div class="ov-top">'
      + kpi(1, "users", l.accounts, '<span data-n="' + (users.total | 0) + '">0</span>', l.accounts, "users")
      + kpi(2, "activity", l.active, '<span data-n="' + (st.active | 0) + '">0</span>', l.activeT, "stats")
      + kpi(3, "userplus", l.fresh, '<span data-n="' + (users.new | 0) + '">0</span>', l.freshT, "users")
      + kpi(4, "cart", l.sales, '<span data-n="' + salesTotal + '" data-dec="' + (salesTotal % 1 ? 2 : 0) + '">0</span><small>' + l.cur + '</small>', l.salesT(money((td.sales && +td.sales.revenue) || 0), salesOrders), "sales")
      + '<label class="ov-range adm-glass adm-rv" style="--i:5">' + ic("calendar") + '<select id="ovRange" aria-label="' + esc(l.rng(range)) + '">' + [7, 30, 90].map(function(n){ return '<option value="' + n + '"' + (n === range ? " selected" : "") + '>' + l.rng(n) + '</option>'; }).join("") + '</select>' + ic("chevdown") + '</label>'
      + '</div>';

    /* الصف 2: الوضع العام · حالة الألعاب · نشاط الألعاب */
    var nTr = Array.isArray(tm.methods) ? tm.methods.length : 0, up = failed.length < 7, maint = !!(cat.maintenance && cat.maintenance.on);
    var stRow = function(state, name, title){ var icn = state === "ok" ? "okcircle" : state === "bad" ? "xcircle" : "circle"; return '<div class="ov-st ' + state + '" title="' + esc(title) + '"><b>' + name + '</b>' + ic(icn) + '</div>'; };
    var statusBody = '<div class="ov-status">'
      + stRow(up ? "ok" : "bad", l.sUp, l.sUpT)
      + stRow(ok(R[3]) ? (cat.pay === true ? "ok" : "bad") : "off", l.sPay, ok(R[3]) ? (cat.pay === true ? l.sPayOn : l.sPayOff) : "—")
      + stRow(ok(R[4]) ? (nTr ? "ok" : "bad") : "off", l.sTr, ok(R[4]) ? (nTr ? l.sTrOk(nTr) : l.sTrNo) : "—")
      + stRow(maint ? "bad" : "off", l.sMaint, maint ? l.sMaintOn : l.sMaintOff) + '</div>';
    h += '<div class="ov-grid">'
      + card(6, "c-3", l.status, null, statusBody)
      + card(7, "c-4", l.games, null, '<div id="ovVis"></div>')
      + card(8, "c-5", l.act, ["stats", l.details], '<div id="ovAct"></div>')
      + '</div>';

    /* الصف 3: إجراءات سريعة */
    var qa = [["userplus", l.qGrant, "users"], ["plus", l.qAdd, "content"], ["cloudup", l.qImport, "content"], ["layers", l.qPack, "packages"], ["percent", l.qPromo, "promos"], ["flag", l.qReports, "reports", repN], ["chart", l.qStats, "stats"], ["settings", l.qGames, "games"]];
    h += '<div class="ov-card ov-qa-card adm-glass adm-rv" style="--i:9"><h3><span class="tt">' + ic("zap") + l.quick + '</span></h3><div class="ov-qa">'
      + qa.map(function(x){ return x[2] ? '<button type="button" data-go="' + x[2] + '">' + ic(x[0]) + '<span>' + x[1] + '</span>' + (x[3] ? '<i class="bd">' + Adm.fmt(x[3]) + '</i>' : '') + '</button>' : '<button type="button" class="soon" disabled title="' + l.qSoon + '">' + ic(x[0]) + '<span>' + x[1] + '</span><i class="sn">' + l.qSoon + '</i></button>'; }).join("")
      + '</div></div>';

    /* الصف 4: ملخص المحتوى · أحدث الطلبات · آخر العمليات */
    h += '<div class="ov-grid">'
      + card(10, "c-4", l.content, null, '<div class="ov-list" id="ovContent"></div>')
      + card(11, "c-4", l.orders, ["sales", l.all], '<div class="ov-list" id="ovOrders"></div>')
      + card(12, "c-4", l.ops, ["audit", l.opsAll], '<div class="ov-list" id="ovOps"></div><p class="ov-note">' + l.opsNote + '</p>')
      + '</div>' + (failed.length ? '<p class="ov-note">⚠️ ' + l.err + ' (' + failed.length + ')</p>' : "");
    C.box.innerHTML = h;

    Array.prototype.forEach.call(C.box.querySelectorAll("[data-n]"), function(el){ Adm.count(el, +el.getAttribute("data-n"), +el.getAttribute("data-dec") || 0); });
    /* حالة الألعاب */
    var vis = document.getElementById("ovVis");
    Adm.donut(vis, [{ t: l.gShown, v: visible.length, c: "#ff354d" }, { t: l.gHidden, v: GAMES.length - visible.length, c: "#71717a" }], '<div><b>' + Adm.fmt(visible.length) + '</b><small>' + l.gShown + '</small></div>');
    vis.querySelector(".lg").innerHTML = '<div><i style="background:#ff354d"></i><span>' + l.gShown + '</span><b>' + Adm.fmt(visible.length) + '</b></div><div><i style="background:#71717a"></i><span>' + l.gHidden + '</span><b>' + Adm.fmt(GAMES.length - visible.length) + '</b></div><hr><div class="tot"><span>' + l.gTotal + '</span><b>' + Adm.fmt(GAMES.length) + '</b></div>';
    /* نشاط الألعاب */
    var plays = st.plays || {}, top = Object.keys(plays).map(function(k){ return { t: (GN[lg][k] || k), v: +plays[k] || 0 }; }).filter(function(x){ return x.v > 0; }).sort(function(a, b){ return b.v - a.v; }).slice(0, 8);
    if(top.length) Adm.cols(document.getElementById("ovAct"), top); else document.getElementById("ovAct").innerHTML = '<div class="ov-empty">' + l.none + '</div>';
    /* ملخص المحتوى: الإجمالي + أكثر 3 ألعاب + الباقي */
    var counts = cat.counts || {}, cm = [["trivia", counts.trivia], ["emoji", counts.emoji_v1 == null && counts.emoji_v2 == null ? null : (counts.emoji_v1 | 0) + (counts.emoji_v2 | 0)], ["letters", counts.letters], ["flags", counts.flags], ["heads", counts.heads], ["charades", counts.charades], ["million", counts.million], ["rope", counts.rope]];
    var ci = cm.filter(function(x){ return x[1] != null; }).map(function(x){ return { id: x[0], v: x[1] | 0 }; }).sort(function(a, b){ return b.v - a.v; });
    var ctot = ci.reduce(function(a, b){ return a + b.v; }, 0), crest = ci.slice(3).reduce(function(a, b){ return a + b.v; }, 0);
    var li = function(icn, name, v, hot){ return '<div class="ov-li"><span class="i">' + ic(icn) + '</span><span class="t">' + name + '</span><b class="' + (hot ? "hot" : "") + '">' + Adm.fmt(v) + '</b></div>'; };
    document.getElementById("ovContent").innerHTML = ci.length ? li("folder", l.total, ctot, true) + ci.slice(0, 3).map(function(x){ return li(GI[x.id] || "library", GN[lg][x.id], x.v); }).join("") + (ci.length > 3 ? li("layers", l.rest, crest) : "") : '<div class="ov-empty">' + l.none + '</div>';
    /* أحدث الطلبات */
    var rows = (orders.rows || []).slice().sort(function(a, b){ return new Date(b.created_at) - new Date(a.created_at); }).slice(0, 3);
    var pill = function(o){ return o.status === "paid" ? '<span class="ov-pill ok">' + l.stPaid + '</span>' : o.status === "initiated" ? (o.claimed_at ? '<span class="ov-pill wait">' + l.stWait + '</span>' : '<span class="ov-pill off">' + l.stOpen + '</span>') : '<span class="ov-pill bad">' + (o.status === "canceled" ? l.stCancel : l.stFail) + '</span>'; };
    var oic = function(o){ return o.status === "paid" ? "cart" : o.status === "initiated" ? "bank" : "xcircle"; };
    document.getElementById("ovOrders").innerHTML = rows.length ? rows.map(function(o){
      var who = o.name || ("#" + (o.code || "—")), sub = o.email ? C.maskEmail(o.email) : (o.code ? "#" + o.code : "");
      return '<div class="ov-row"><span class="bx">' + ic(oic(o)) + '</span><div class="m"><b>' + esc(who) + '</b><small dir="ltr">' + esc(sub) + '</small><small>' + hm(o.created_at) + ' · ' + dm(o.created_at) + '</small></div>' + pill(o) + '<span class="am">' + money((+o.amount || 0) / 100) + '</span></div>';
    }).join("") : '<div class="ov-empty">' + l.noOrders + '</div>';
    /* آخر العمليات الإدارية: تفعيل طلبات التحويل (المصدر الموثوق الوحيد حاليًا) */
    var aud = ok(R[7]) && Array.isArray(R[7].data) ? R[7].data : null;
    var opOf = function(r){ var d = r.details || {}, a = r.action;
      if(a === "user.status") return d.to === "blocked" ? ["bad", l.aBlock, l.tBlock] : d.to === "approved" ? ["ok", l.aUnblock, l.tUnblock] : ["info", l.aStatus, l.tStatus];
      if(a === "user.credits") return ["ok", l.aCredit, l.tCredit(d)]; if(a === "user.reset_trials") return ["info", l.aTrial, l.tTrial];
      if(a === "order.confirm") return ["ok", l.aOrder, l.tConfirm(d)]; if(a === "order.cancel") return ["bad", l.aOrder, l.tCancel(d)];
      if(a === "site.maintenance") return ["bad", l.aMaint, l.tMaint(d)];
      return ["info", l.aSetting, l.tSetting.call(l, String(a).replace(/^setting\./, ""))]; };
    if(aud){
      document.getElementById("ovOps").innerHTML = aud.length ? aud.map(function(r){ var o = opOf(r); return '<div class="ov-op"><span class="tg ' + o[0] + '">' + o[1] + '</span><span class="t">' + esc(o[2]) + '</span><small>' + hm(r.at) + '</small></div>'; }).join("") : '<div class="ov-empty">' + l.noOps + '</div>';
      var nt = document.querySelector("#ovOps + .ov-note"); if(nt) nt.remove();
      return;
    }
    var ops = (orders.rows || []).filter(function(o){ return o.status === "paid" && o.paid_at; }).sort(function(a, b){ return new Date(b.paid_at) - new Date(a.paid_at); }).slice(0, 4);
    document.getElementById("ovOps").innerHTML = ops.length ? ops.map(function(o){
      return '<div class="ov-op"><span class="tg">' + ic("cart") + l.opTag + '</span><span class="t">' + esc(l.opTxt(o.code || "—", money((+o.amount || 0) / 100))) + '</span><small>' + hm(o.paid_at) + '</small></div>';
    }).join("") : '<div class="ov-empty">' + l.noOps + '</div>';
  }
  function load(ctx, force){
    C = ctx || C; var my = ++tok;
    if(!C.box.firstChild || force) C.box.innerHTML = skeleton();
    return fetchAll(RANGE).then(function(R){ if(my !== tok) return; STATE = R; render(R, RANGE); }, function(e){ if(my === tok) C.box.innerHTML = '<div class="err">⚠️ ' + C.esc(C.errText(e)) + '</div>'; });
  }
  document.addEventListener("change", function(e){ if(C && e.target && e.target.id === "ovRange"){ RANGE = +e.target.value || 7; load(C, false); } });
  document.addEventListener("click", function(e){
    if(!C || !C.box || !C.box.contains(e.target)) return;
    var go = e.target.closest("[data-go]"); if(!go) return; var t = go.getAttribute("data-go");
    if(t === "refresh") load(C, true); else C.go(t);
  });
  document.addEventListener("admlang", function(){ if(C && STATE && C.isOpen()) render(STATE, RANGE); });
  window.AdmOverview = { load: load };
})();
