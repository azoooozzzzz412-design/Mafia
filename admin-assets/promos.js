/* لوحة الأدمن — أكواد الخصم + استرجاع الطلبات (M5). بدون مكتبات.
   كل الحسابات والتحقق الحقيقي عند السيرفر (sql/19)؛ الواجهة تعرض وتشرح وتحوّل (ريال <-> هللات). */
(function(root){
  "use strict";
  var C = null, ROWS = [], CAMPS = [], TOTALS = null, PKS = [], MISSING = false, TOK = 0, ov = null, FILT = { q:"", camp:"", state:"all" }, PAGE = 0, PER = 10, QT = null;
  var MISS_TXT = "⚠️ شغّل ملف SQL رقم 19 أول (أكواد الخصم والاسترجاع) — وبعدها ترجع تفتح هالقسم.";
  var STATE = { live:["شغّال", "ok"], off:["مطفي", ""], scheduled:["مجدول", "wait"], ended:["منتهي", ""], exhausted:["استُنفد", "sale"] };

  function esc(s){ return C ? C.esc(String(s == null ? "" : s)) : String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]; }); }
  function $(id){ return document.getElementById(id); }
  function isMissing(e){ var m = String(e && (e.message || e.details || e) || ""); return /could not find the function|does not exist|42703|42883|PGRST202|schema cache/i.test(m); }
  function sar(h){ var n = (+h || 0) / 100; return (n % 1 ? n.toFixed(2) : String(n)) + " ريال"; }
  function sarIn(h){ return ((+h || 0) / 100).toFixed(2).replace(/\.00$/, ""); }
  function nd(txt){ return String(txt == null ? "" : txt).replace(/[٠-٩]/g, function(c){ return String(c.charCodeAt(0) - 1632); }).replace(/[۰-۹]/g, function(c){ return String(c.charCodeAt(0) - 1776); }).replace(/٫/g, ".").replace(/٬/g, "").trim(); }
  function roundsTxt(n){ n = n | 0; return n === 1 ? "جولة وحدة" : n === 2 ? "جولتين" : n + (n % 100 >= 3 && n % 100 <= 10 ? " جولات" : " جولة"); }
  function ic(n){ return window.Adm && window.Adm.icon ? window.Adm.icon(n) : ""; }
  var busy = false;
  function toHal(txt){ var t = nd(txt); if(!/^[0-9]{1,6}(\.[0-9]{1,2})?$/.test(t)) return null; return Math.round(parseFloat(t) * 100); }
  function when(iso){ if(!iso) return "—"; try{ return new Date(iso).toLocaleString("ar-EG-u-nu-latn", { timeZone:"Asia/Riyadh", dateStyle:"medium", timeStyle:"short" }); }catch(e){ return String(iso); } }
  function toLocal(iso){ if(!iso) return ""; var d = new Date(iso); if(isNaN(d)) return ""; return new Date(d.getTime() + 3 * 36e5).toISOString().slice(0, 16); }   /* بتوقيت الرياض (UTC+3 ثابت) */
  function fromLocal(v){ if(!v) return null; var d = new Date(v + ":00+03:00"); return isNaN(d) ? null : d; }
  function pkLabel(id){ for(var i = 0; i < PKS.length; i++) if(PKS[i].id === id) return pkName(id) + (PKS[i].archived ? " (مؤرشفة)" : ""); return pkName(id); }
  function pkName(id){ for(var i = 0; i < PKS.length; i++) if(PKS[i].id === id){ var p = PKS[i]; return p.name ? p.name : "باقة " + (p.rounds | 0) + " جولات"; } return id; }
  var ERR = { code_taken:"هالكود مستخدم من قبل — جرّب كود ثاني.", code_immutable:"نص الكود ما يتغير بعد إنشائه.", bad_value:"قيمة غير صالحة — راجع الحقول (الكود 4 إلى 20 حرف/رقم إنجليزي، والتواريخ لازم نهايتها بعد بدايتها).", reason_required:"اكتب السبب (3 أحرف فأكثر).", no_promo:"ما لقينا هالكود (يمكن انحذف).", code_gen_failed:"تعذّر توليد كود فريد — جرّب مرة ثانية.", too_many_packages:"باقات كثيرة على فحص التسعير.", too_complex:"فحص التسعير معقّد زيادة — قلّل الباقات.", "not allowed":"ما عندك صلاحية.",
    duplicate_refund:"نفس المبلغ انسجّل لنفس الطلب قبل أقل من دقيقة — ما انكرّر (لو تبغاه فعلًا انتظر دقيقة أو غيّر المبلغ).", over_refund:"المبلغ أكبر من المتبقي القابل للاسترجاع.", already_refunded:"هالطلب مسترجع بالكامل من قبل.", not_paid:"الاسترجاع للطلبات المدفوعة فقط.", no_order:"ما لقينا هالطلب." };
  function err(e){
    if(isMissing(e)) return MISS_TXT;
    var m = String(e && (e.message || e.details || e) || ""); for(var k in ERR) if(m.indexOf(k) !== -1) return ERR[k];
    return C ? C.errText(e) : m;
  }

  /* ---------- التحميل ---------- */
  function init(ctx){ C = ctx; }
  function load(ctx){
    C = ctx; if(!C.box) return;
    var my = ++TOK; MISSING = false; C.box.innerHTML = '<div class="empty">… جاري التحميل</div>';
    Promise.all([
      C.SB.rpc("admin_promo_stats", { p_limit:200, p_offset:0 }),
      C.SB.from("packages").select("id,rounds,name,kind,archived,active,visible,price").order("sort")
    ]).then(function(rs){
      if(my !== TOK) return; if(rs[0].error) throw rs[0].error;
      var st = C.rpcData(rs[0]) || {}; TOTALS = st.totals || null; CAMPS = st.campaigns || [];
      if(rs[1] && rs[1].error) throw rs[1].error;
      PKS = ((rs[1] && rs[1].data) || []).filter(function(p){ return (p.kind || "rounds") === "rounds"; });
      return fetchRows(my).then(function(){ if(my !== TOK) return; PAGE = 0; render(); });
    }).catch(function(e){
      if(my !== TOK) return; if(isMissing(e)) MISSING = true;
      C.box.innerHTML = '<div class="pk-miss">' + esc(isMissing(e) ? MISS_TXT : "⚠️ " + C.errText(e)) + '</div>';
    });
  }
  function reload(){ load(C); }
  function fetchRows(my){
    var all = [];
    function step(off){
      return C.SB.rpc("admin_promo_list", { p_q:FILT.q || null, p_campaign:FILT.camp || null, p_limit:200, p_offset:off }).then(function(r){
        if(r.error) throw r.error; var d = C.rpcData(r) || {}; all = all.concat(d.rows || []);
        if((d.rows || []).length >= 200 && all.length < (d.total | 0) && all.length < 1000) return step(off + 200);
      });
    }
    return step(0).then(function(){ if(my === TOK) ROWS = all; });
  }
  function refilter(){ var my = ++TOK; fetchRows(my).then(function(){ if(my !== TOK) return; PAGE = 0; paintList(); }).catch(function(e){ var l = $("prList"); if(l) l.innerHTML = '<div class="pk-miss">' + esc(err(e)) + '</div>'; }); }

  /* ---------- القائمة ---------- */
  function shown(){ return ROWS.filter(function(r){ return FILT.state === "all" || r.state === FILT.state; }); }
  function kindTxt(r){
    if(r.kind === "percent") return "خصم <b>" + (r.value | 0) + "%</b>" + (r.max_discount_halalas ? " <small>(حتى " + esc(sar(r.max_discount_halalas)) + ")</small>" : "");
    return "خصم <b>" + esc(sar(r.value)) + "</b>";
  }
  function card(r, i){
    var st = STATE[r.state] || [r.state, ""], max = r.max_uses, uses = r.uses | 0, res = r.reserved | 0;
    var pk = r.package_ids && r.package_ids.length ? r.package_ids.map(function(x){ return esc(pkLabel(x)); }).join("، ") : "كل الباقات";
    var pu = r.per_user_uses == null ? "بلا حد" : (r.per_user_uses | 0) + (r.per_user_uses == 1 ? " مرة" : " مرات");
    var pills = (r.first_purchase_only ? '<span class="ov-pill wait">أول شراء فقط</span>' : '') + (r.over_limit > 0 ? '<span class="ov-pill sale" title="استُخدم بعد انتهاء الحجز وتجاوز الحد">فوق الحد: ' + (r.over_limit | 0) + '</span>' : '')
      + (r.rule_ok === false ? '<span class="ov-pill sale pr-blocked" title="الكود شغّال لكن قاعدة التسعير تمنع تطبيقه — خفّف الخصم أو حدّده على باقات معيّنة">' + ic("alert") + 'محجوب بقاعدة التسعير</span>' : '')
      + (r.users_scoped > 0 ? '<span class="ov-pill">محدد بـ ' + (r.users_scoped | 0) + ' حساب</span>' : '') + (r.campaign ? '<span class="ov-pill">' + ic("tag") + esc(r.campaign) + '</span>' : '');
    var none = !uses && !(r.customers | 0) && !(+r.sales) && !(+r.refunded);
    return '<div class="pr-card card adm-rv" style="--i:' + (i % 12) + '" data-prid="' + esc(r.id) + '">'
      + '<div class="pr-hd"><div class="pr-code"><code dir="ltr" class="pr-c">' + esc(r.code) + '</code><button class="mini" type="button" data-prcopy="' + esc(r.code) + '" title="نسخ الكود" aria-label="نسخ الكود">' + ic("layers") + '</button></div>'
      + '<div class="pr-hr"><span class="ov-pill ' + st[1] + '">' + st[0] + '</span><label class="sl-toggle pk-sw pr-sw" title="تفعيل / إطفاء"><span class="switch"><input type="checkbox" data-pract="' + esc(r.id) + '"' + (r.active ? " checked" : "") + ' aria-label="تفعيل الكود"><span></span></span></label></div></div>'
      + '<div class="pr-nm"><b>' + esc(r.name || "بدون اسم") + '</b></div>'
      + (pills ? '<div class="pk-pills">' + pills + '</div>' : '')
      + '<div class="pr-meta"><span>' + kindTxt(r) + '</span><span>الحد الأدنى: <b>' + (r.min_amount_halalas ? esc(sar(r.min_amount_halalas)) : "بدون") + '</b></span>'
      + '<span class="wide">الباقات: <b>' + pk + '</b></span><span>لكل حساب: <b>' + pu + '</b></span>'
      + '<span>الاستخدام: <b>' + uses + '</b> ' + (max ? 'من <b>' + (max | 0) + '</b>' : '(بلا حد)') + (res ? ' <small>+ ' + res + ' محجوز</small>' : '') + '</span>'
      + (r.held_claimed ? '<span class="wide">محجوز بعد حوّلت: <b>' + (r.held_claimed | 0) + '</b> <small>(48 ساعة)</small></span>' : '')
      + '<span class="wide">يبدأ: <b>' + esc(r.starts_at ? when(r.starts_at) : "من الحين") + '</b></span><span class="wide">ينتهي: <b>' + esc(r.ends_at ? when(r.ends_at) : "بلا نهاية") + '</b></span></div>'
      + (none ? '<div class="pr-stats none">ما فيه استخدامات بعد</div>'
        : '<div class="pr-stats"><span><b>' + (r.customers | 0) + '</b> عميل</span><span>مبيعات <b>' + esc(sar(r.sales)) + '</b></span><span>خصومات <b>' + esc(sar(r.discounts)) + '</b></span><span>مسترجع <b>' + esc(sar(r.refunded)) + '</b></span><span>صافي <b>' + esc(sar(r.net)) + '</b></span></div>')
      + '<div class="pk-ft"><small>آخر تحديث: ' + esc(when(r.updated_at)) + '</small><div class="pk-act"><button class="btn-ghost sm" type="button" data-predit="' + esc(r.id) + '">تعديل</button></div></div></div>';
  }
  function tile(l, v){ return '<div class="pr-tile"><small>' + l + '</small><b>' + v + '</b></div>'; }
  function render(){
    var t = TOTALS || {};
    var camps = '<option value="">كل الحملات</option>' + CAMPS.filter(function(c){ return c.campaign; }).map(function(c){ return '<option value="' + esc(c.campaign) + '"' + (FILT.camp === c.campaign ? " selected" : "") + '>' + esc(c.campaign) + '</option>'; }).join("");
    var sts = [["all", "الكل"], ["live", "شغّالة"], ["off", "مطفية"], ["scheduled", "مجدولة"], ["ended", "منتهية"], ["exhausted", "مستنفدة"]];
    C.box.innerHTML = '<div class="ov-head"><div><h2>أكواد الخصم</h2><p>إنشاء الأكواد وتفعيلها ومتابعة استخدامها. الأسعار والحدود يفحصها السيرفر عند كل حفظ وعند كل طلب.</p></div></div>'
      + '<div class="pr-tiles">' + tile("الأكواد", t.codes | 0) + tile("الاستخدامات", t.uses | 0) + tile("العملاء", t.customers | 0) + tile("الخصومات", esc(sar(t.discounts))) + tile("المبيعات", esc(sar(t.sales))) + tile("المسترجع", esc(sar(t.refunded))) + tile("الصافي", esc(sar(t.net))) + '</div>'
      + '<div class="pk-top pr-top"><div class="pr-filters"><input class="input" id="prQ" type="search" placeholder="بحث بالكود أو الاسم أو الحملة" maxlength="40" value="' + esc(FILT.q) + '" aria-label="بحث">'
      + '<select class="input" id="prCamp" aria-label="الحملة">' + camps + '</select>'
      + '<div class="pk-kinds" id="prStates">' + sts.map(function(s){ return '<button class="chip' + (FILT.state === s[0] ? " on" : "") + '" type="button" data-prst="' + s[0] + '">' + s[1] + '</button>'; }).join("") + '</div></div>'
      + '<button class="btn-primary sm" type="button" id="prNew">' + ic("plus") + 'كود جديد</button></div>'
      + '<div id="prList"></div><div class="pr-pager" id="prPager"></div>'
      + (CAMPS.length ? '<details class="pk-arc" id="prCampBox"><summary>إحصائيات الحملات (' + CAMPS.length + ')</summary><div class="ord-wrap"><table class="ord"><tr><th>الحملة</th><th>الأكواد</th><th>الاستخدام</th><th>العملاء</th><th>الخصومات</th><th>المبيعات</th><th>المسترجع</th><th>الصافي</th></tr>'
        + CAMPS.map(function(c){ return '<tr><td>' + esc(c.campaign || "— بدون حملة —") + '</td><td class="n">' + (c.active_codes | 0) + '/' + (c.codes | 0) + '</td><td class="n">' + (c.uses | 0) + '</td><td class="n">' + (c.customers | 0) + '</td><td class="n">' + esc(sar(c.discounts)) + '</td><td class="n">' + esc(sar(c.sales)) + '</td><td class="n">' + esc(sar(c.refunded)) + '</td><td class="n">' + esc(sar(c.net)) + '</td></tr>'; }).join("") + '</table></div></details>' : '');
    paintList();
  }
  function paintList(){
    var l = $("prList"), pg = $("prPager"); if(!l) return;
    var rows = shown(), pages = Math.max(1, Math.ceil(rows.length / PER)); if(PAGE >= pages) PAGE = pages - 1;
    l.innerHTML = rows.length ? '<div class="pk-list pr-list">' + rows.slice(PAGE * PER, PAGE * PER + PER).map(card).join("") + '</div>'
      : '<div class="empty">' + (FILT.q || FILT.camp || FILT.state !== "all" ? "ما فيه أكواد تطابق الفلتر." : "ما فيه أكواد خصم بعد — اضغط «كود جديد».") + '</div>';
    pg.innerHTML = pages > 1 ? '<button class="btn-ghost sm" type="button" data-prpg="-1"' + (PAGE === 0 ? " disabled" : "") + '>السابق</button><span>صفحة ' + (PAGE + 1) + ' من ' + pages + ' · ' + rows.length + ' كود</span><button class="btn-ghost sm" type="button" data-prpg="1"' + (PAGE >= pages - 1 ? " disabled" : "") + '>التالي</button>' : "";
  }
  function byId(id){ for(var i = 0; i < ROWS.length; i++) if(ROWS[i].id === id) return ROWS[i]; return null; }

  /* ---------- نافذة ---------- */
  function shell(title, body, wide){
    close(); ov = document.createElement("div"); ov.className = "ov"; ov.id = "prOv";
    ov.innerHTML = '<div class="modal' + (wide ? " wide" : "") + '" role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3><div id="prMBody">' + body + '</div></div>'; document.body.appendChild(ov);
    ov.addEventListener("click", function(e){ if(e.target === ov && !busy) close(); });
  }
  function close(){ if(ov){ ov.remove(); ov = null; } busy = false; }
  document.addEventListener("keydown", function(e){ if(e.key === "Escape" && ov && !busy) close(); });
  function sw(id, label, on, small){ return '<label class="sl-toggle pk-sw"><span class="switch"><input type="checkbox" id="' + id + '"' + (on ? " checked" : "") + '><span></span></span><span><b>' + label + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</span></label>'; }
  function copy(txt){
    var done = function(){ if(C) C.toast("اننسخ: " + txt); };
    try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done, function(){ fallback(); }); return; } }catch(e){}
    fallback();
    function fallback(){ try{ var t = document.createElement("textarea"); t.value = txt; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }catch(e){} done(); }
  }

  /* ---------- نص المخالفة (قاعدة التسعير مع الكود) ---------- */
  function violText(v){
    var cover = (v.cover || []).map(function(c){ return (c.n > 1 ? c.n + " × " : "") + "«" + esc(pkName(c.id)) + "»"; }).join(" + ");
    return '<b>«' + esc(pkName(v.id)) + '»</b> بعد الخصم تصير <b>' + esc(String(v.price)) + '</b> ريال، وهذا أغلى من شراء ' + cover + ' بـ <b>' + esc(String(v.cover_price)) + '</b> ريال (أرخص تركيبة).';
  }
  function violBox(list){
    return '<b>ما تمّ — الكود يخالف قاعدة التسعير</b><ul>' + (list || []).map(function(v){ return '<li>' + violText(v) + '</li>'; }).join("") + '</ul><small>خفّف الخصم أو حدّد الكود على باقات معيّنة بحيث ما تصير أي باقة أغلى من أرخص تركيبة من الباقات الثانية.</small>';
  }

  /* ---------- إنشاء / تعديل ---------- */
  function openEdit(r){
    if(MISSING){ C.toast(MISS_TXT); return; }
    var isNew = !r; r = r || { kind:"percent", value:10, per_user_uses:1, active:true, package_ids:null };
    var pu = r.per_user_uses == null ? "unl" : (r.per_user_uses == 1 ? "1" : "n");
    var orig = (r.package_ids || []).slice(), list = PKS.slice();
    orig.forEach(function(id){ if(!list.some(function(p){ return p.id === id; })) list.push({ id:id, name:"باقة غير معروفة", price:null, archived:false }); });
    var pks = list.map(function(p){ var on = orig.indexOf(p.id) !== -1; return '<label class="pr-pk' + (on ? " on" : "") + '"><input type="checkbox" data-prpk value="' + esc(p.id) + '"' + (on ? " checked" : "") + '><span>' + esc(pkName(p.id)) + (p.price != null ? ' <small>(' + (+p.price) + ' ريال)</small>' : '') + (p.archived ? ' <em class="pr-arc">مؤرشفة</em>' : '') + '</span></label>'; }).join("");
    var body = '<div class="pk-grid"><label class="field"><span>الاسم (للعرض بالقائمة)</span><input class="input" id="prName" maxlength="60" value="' + esc(r.name || "") + '"></label>'
      + '<label class="field"><span>الحملة (اختياري)</span><input class="input" id="prCampF" maxlength="40" value="' + esc(r.campaign || "") + '"></label></div>'
      + '<label class="field"><span>الكود ' + (isNew ? '(4 إلى 20 حرف/رقم إنجليزي — اتركه فاضي ويتولّد تلقائيًا)' : '(ما يتغير بعد الإنشاء)') + '</span><div class="pr-codeRow"><input class="input" id="prCode" dir="ltr" maxlength="20" autocomplete="off" spellcheck="false" value="' + esc(r.code || "") + '"' + (isNew ? "" : " readonly") + '>' + (isNew ? '<button class="btn-ghost sm" type="button" id="prGen">🎲 توليد</button>' : '') + '</div></label>'
      + '<div class="pk-grid"><label class="field"><span>نوع الخصم</span><select class="input" id="prKind"><option value="percent"' + (r.kind === "percent" ? " selected" : "") + '>نسبة مئوية %</option><option value="fixed"' + (r.kind === "fixed" ? " selected" : "") + '>مبلغ ثابت (ريال)</option></select></label>'
      + '<label class="field"><span id="prValLb">القيمة</span><input class="input" id="prVal" inputmode="decimal" value="' + esc(r.kind === "fixed" ? sarIn(r.value) : (r.value == null ? "" : r.value)) + '"></label>'
      + '<label class="field" id="prMaxW"><span>أقصى خصم (ريال، اختياري)</span><input class="input" id="prMax" inputmode="decimal" value="' + esc(r.max_discount_halalas ? sarIn(r.max_discount_halalas) : "") + '"></label>'
      + '<label class="field"><span>الحد الأدنى للمبلغ (ريال، اختياري)</span><input class="input" id="prMin" inputmode="decimal" value="' + esc(r.min_amount_halalas ? sarIn(r.min_amount_halalas) : "") + '"></label>'
      + '<label class="field"><span>يبدأ (اختياري) <small>بتوقيت الرياض</small></span><input class="input" id="prFrom" type="datetime-local" value="' + esc(toLocal(r.starts_at)) + '"></label>'
      + '<label class="field"><span>ينتهي (اختياري) <small>بتوقيت الرياض</small></span><input class="input" id="prTo" type="datetime-local" value="' + esc(toLocal(r.ends_at)) + '"></label>'
      + '<label class="field"><span>أقصى عدد استخدامات (فاضي = بلا حد)</span><input class="input" id="prMaxUses" inputmode="numeric" value="' + esc(r.max_uses == null ? "" : r.max_uses) + '"></label>'
      + '<label class="field"><span>الاستخدام لكل حساب</span><select class="input" id="prPU"><option value="1"' + (pu === "1" ? " selected" : "") + '>مرة وحدة</option><option value="unl"' + (pu === "unl" ? " selected" : "") + '>بلا حد</option><option value="n"' + (pu === "n" ? " selected" : "") + '>عدد محدد…</option></select><small class="pr-fnote" id="prPUnote">أول شراء فقط = مرة وحدة دائمًا</small></label>'
      + '<label class="field" id="prPUnW"' + (pu === "n" ? "" : " hidden") + '><span>عدد المرات لكل حساب</span><input class="input" id="prPUn" inputmode="numeric" value="' + esc(pu === "n" ? r.per_user_uses : "2") + '"></label></div>'
      + '<fieldset class="pr-pkset"><legend>الباقات المشمولة (بدون اختيار = كل الباقات)</legend><div class="pr-chips">' + (pks || '<small>ما فيه باقات</small>') + '</div>'
      + (orig.length ? '<label class="pr-pk pr-all"><input type="checkbox" id="prAll"><span><b>كل الباقات</b> <small>— أفكّ التحديد عن قصد وأخلي الكود يشمل كل الباقات</small></span></label>' : '') + '</fieldset>'
      + '<div class="pk-sws">' + sw("prFirst", "أول شراء فقط", r.first_purchase_only, "ما يصلح لعميل سبق له شراء مدفوع") + sw("prActive", "مفعّل", r.active, "المطفي ما يقبله النظام") + '</div>'
      + (r.users_scoped > 0 ? '<div class="pk-note">الكود محدد بـ ' + (r.users_scoped | 0) + ' حساب — التحديد يبقى كما هو ولا يتغير من هنا.</div>' : '')
      + '<div class="pr-bar"><label class="field"><span>السبب (مطلوب، 3 أحرف فأكثر — يظهر بسجل العمليات)</span><input class="input" id="prWhy" maxlength="200"></label>'
      + '<div class="pk-verr" id="prVerr" hidden></div><div class="m-btns"><button class="btn-primary" type="button" id="prSave">حفظ</button><button class="btn-ghost" type="button" id="prCancel">إلغاء</button></div></div>';
    shell(isNew ? "كود خصم جديد" : "تعديل: " + r.code, body, true);
    $("prCancel").onclick = close;
    function ve(html){ var e = $("prVerr"); if(!e) return; e.innerHTML = html; e.hidden = !html; if(html && e.scrollIntoView) e.scrollIntoView({ block:"nearest" }); }
    function sync(){ var fp = $("prFirst").checked; if(fp) $("prPU").value = "1"; $("prPU").disabled = fp; var pc = $("prKind").value === "percent"; $("prMaxW").hidden = !pc; $("prValLb").textContent = pc ? "النسبة % (1 إلى 100)" : "قيمة الخصم (ريال)"; $("prPUnW").hidden = $("prPU").value !== "n"; }
    $("prFirst").onchange = sync; $("prKind").onchange = sync; $("prPU").onchange = sync; sync();
    function chipSync(){ var all = $("prAll"), dis = !!(all && all.checked); Array.prototype.forEach.call(document.querySelectorAll("#prOv [data-prpk]"), function(x){ if(dis) x.checked = false; x.disabled = dis; x.parentNode.classList.toggle("on", x.checked); }); }
    Array.prototype.forEach.call(document.querySelectorAll("#prOv [data-prpk], #prAll"), function(x){ x.addEventListener("change", chipSync); });
    if(isNew) $("prGen").onclick = function(){
      var b = $("prGen"); b.disabled = true;
      C.SB.rpc("admin_promo_generate", { p_count:1, p_len:10 }).then(function(x){ if(x.error) throw x.error; var d = C.rpcData(x) || {}; if(d.codes && d.codes[0]) $("prCode").value = d.codes[0]; b.disabled = false; })
        .catch(function(e){ ve(esc(err(e))); b.disabled = false; });
    };
    function gather(){
      var o = {}, kind = $("prKind").value, v = nd($("prVal").value);
      if(isNew){ var code = $("prCode").value.trim().toUpperCase(); if(code){ if(!/^[A-Z0-9]{4,20}$/.test(code)) return { e:"الكود لازم 4 إلى 20 حرف/رقم إنجليزي كبير (بدون مسافات)" }; o.code = code; } }
      else o.id = r.id;
      o.kind = kind;
      if(kind === "percent"){ if(!/^[0-9]{1,3}$/.test(v) || +v < 1 || +v > 100) return { e:"النسبة لازم رقم صحيح من 1 إلى 100" }; o.value = +v;
        var mx = $("prMax").value.trim(); if(mx){ var mh = toHal(mx); if(mh == null || mh < 1 || mh > 100000) return { e:"أقصى خصم من 0.01 إلى 1000 ريال (خانتين عشريتين)" }; o.max_discount_halalas = mh; } }
      else { var h = toHal(v); if(h == null || h < 1 || h > 100000) return { e:"قيمة الخصم من 0.01 إلى 1000 ريال (خانتين عشريتين)" }; o.value = h; }
      var mn = $("prMin").value.trim(); if(mn){ var mnh = toHal(mn); if(mnh == null || mnh > 1000000) return { e:"الحد الأدنى غير صالح (حتى 10000 ريال)" }; o.min_amount_halalas = mnh; }
      var f = fromLocal($("prFrom").value), t = fromLocal($("prTo").value);
      if(f && t && t <= f) return { e:"نهاية الكود لازم تكون بعد بدايته" };
      o.starts_at = f ? f.toISOString() : null; o.ends_at = t ? t.toISOString() : null;
      var mu = nd($("prMaxUses").value); if(mu){ if(!/^[0-9]{1,7}$/.test(mu) || +mu < 1 || +mu > 1000000) return { e:"أقصى الاستخدامات رقم من 1 إلى 1,000,000 (أو اتركه فاضي)" }; o.max_uses = +mu; }
      var pu2 = $("prPU").value; if(pu2 === "1") o.per_user_uses = 1; else if(pu2 === "unl") o.per_user_uses = null; else { var pn = nd($("prPUn").value); if(!/^[0-9]{1,4}$/.test(pn) || +pn < 1 || +pn > 1000) return { e:"عدد المرات لكل حساب من 1 إلى 1000" }; o.per_user_uses = +pn; }
      var ids = Array.prototype.map.call(document.querySelectorAll("#prOv [data-prpk]:checked"), function(x){ return x.value; }), all = $("prAll");
      if(orig.length && !(all && all.checked) && !ids.length) return { e:"الكود محدد على باقات معيّنة — اختر باقة وحدة على الأقل، أو فعّل «كل الباقات» إذا تقصد توسّعه على الكل." };
      o.package_ids = ids.length ? ids : null;
      o.name = $("prName").value.trim() || null; o.campaign = $("prCampF").value.trim() || null;
      o.first_purchase_only = $("prFirst").checked; o.active = $("prActive").checked;
      var why = $("prWhy").value.trim(); if(why.length < 3) return { e:"اكتب السبب (3 أحرف فأكثر)" };
      return { o:o, why:why };
    }
    function send(g){
      var btn = $("prSave"); if(btn) btn.disabled = true; busy = true;
      C.SB.rpc("admin_promo_save", { p:g.o, p_reason:g.why }).then(function(x){
        busy = false; if(x.error) throw x.error; var d = C.rpcData(x) || {};
        if(d.saved){ reload(); if(isNew) shown2(d.code || g.o.code || ""); else { close(); C.toast("انحفظ الكود"); } return; }
        ve(violBox(d.violations)); if($("prSave")) $("prSave").disabled = false;
      }).catch(function(e){ busy = false; ve(esc(err(e))); if($("prSave")) $("prSave").disabled = false; });
    }
    $("prSave").onclick = function(){
      if(busy || $("prSave").disabled) return;
      var g = gather(); if(g.e){ ve(esc(g.e)); return; } ve("");
      $("prSave").disabled = true; busy = true;
      if(!isNew && r.users_scoped > 0){ C.SB.from("promo_codes").select("user_ids").eq("id", r.id).then(function(x){ if(x.error) throw x.error; var u = x.data && x.data[0] && x.data[0].user_ids; if(u && u.length) g.o.user_ids = u; send(g); }).catch(function(e){ busy = false; ve(esc(err(e))); if($("prSave")) $("prSave").disabled = false; }); return; }
      send(g);
    };
    setTimeout(function(){ var f = $("prName"); if(f) f.focus(); }, 30);
  }
  function shown2(code){
    shell("انحفظ الكود", '<p class="hint">انسخ الكود وشاركه — هذا نصه النهائي:</p><div class="pr-big"><code dir="ltr" id="prNewCode">' + esc(code) + '</code><button class="btn-primary sm" type="button" id="prCopyNew">' + ic("layers") + 'نسخ</button></div><div class="m-btns"><button class="btn-ghost" type="button" id="prDone">تمام</button></div>');
    $("prCopyNew").onclick = function(){ copy(code); }; $("prDone").onclick = close;
  }

  /* ---------- تفعيل / إطفاء (سبب إلزامي) ---------- */
  function openToggle(r, to){
    shell((to ? "تفعيل: " : "إطفاء: ") + r.code, '<p class="hint">' + (to ? 'السيرفر يفحص قاعدة التسعير قبل التفعيل.' : 'الكود المطفي ما يقبله النظام، والطلبات المحجوزة تبقى كما هي.') + '</p>'
      + '<label class="field"><span>السبب (مطلوب، 3 أحرف فأكثر)</span><input class="input" id="prWhy" maxlength="200"></label><div class="pk-verr" id="prVerr" hidden></div>'
      + '<div class="m-btns"><button class="btn-primary" type="button" id="prSave">' + (to ? "تفعيل" : "إطفاء") + '</button><button class="btn-ghost" type="button" id="prCancel">إلغاء</button></div>');
    $("prCancel").onclick = close;
    $("prSave").onclick = function(){
      var why = $("prWhy").value.trim(), ve = $("prVerr"); if(busy || $("prSave").disabled) return; if(why.length < 3){ ve.hidden = false; ve.textContent = "اكتب السبب (3 أحرف فأكثر)"; return; }
      $("prSave").disabled = true; busy = true;
      C.SB.rpc("admin_promo_set_active", { p_id:r.id, p_active:!!to, p_reason:why }).then(function(x){
        busy = false; if(x.error) throw x.error; var d = C.rpcData(x) || {};
        if(d.violations && d.violations.length){ var v2 = $("prVerr"); if(v2){ v2.hidden = false; v2.innerHTML = violBox(d.violations); } if($("prSave")) $("prSave").disabled = false; return; }
        close(); C.toast(d.changed ? (to ? "انفعّل الكود" : "انطفى الكود") : "الكود بنفس الحالة"); reload();
      }).catch(function(e){ busy = false; var v2 = $("prVerr"); if(v2){ v2.hidden = false; v2.textContent = err(e); } if($("prSave")) $("prSave").disabled = false; });
    };
    setTimeout(function(){ $("prWhy").focus(); }, 30);
  }

  /* ---------- استرجاع طلب (يُنادى من قسم الطلبات) ---------- */
  function openRefund(o, ctx, done){
    C = C || ctx; var cx = ctx || C; if(!cx) return;
    var paid = o.amount | 0, before = o.refunded | 0, rem = paid - before, who = o.name || o.email || "العميل", bal = o.credits == null ? null : (o.credits | 0);
    if(rem < 1){ cx.toast(ERR.already_refunded); return; }
    shell("استرجاع طلب", '<div class="pk-note pr-warnline">الاسترجاع هنا يسجّل العملية ويخصم الجولات فقط — حوّل المبلغ للعميل بنفسك</div>'
      + '<div class="pr-ord"><div>العميل: <b>' + esc(who) + '</b></div><div>المدفوع: <b>' + esc(sar(paid)) + '</b> · ' + esc(roundsTxt(o.rounds)) + '</div>'
      + (bal != null ? '<div>رصيد العميل الحين: <b>' + esc(roundsTxt(bal)) + '</b></div>' : '')
      + (before ? '<div>مسترجع سابقًا: <b>' + esc(sar(before)) + '</b> · المتبقي القابل للاسترجاع: <b>' + esc(sar(rem)) + '</b></div>' : '') + '</div>'
      + '<label class="field"><span>مبلغ الاسترجاع (ريال) — تقدر تسترجع جزء</span><input class="input" id="rfAmt" inputmode="decimal" value="' + esc(sarIn(rem)) + '"></label>'
      + '<div class="pr-prev" id="rfPrev" role="status"></div>'
      + '<label class="field"><span>السبب (مطلوب، 3 أحرف فأكثر — يظهر بسجل العمليات)</span><input class="input" id="rfWhy" maxlength="200"></label>'
      + '<div class="pk-verr" id="rfErr" hidden></div><div class="m-btns"><button class="btn-primary" type="button" id="rfOk">تأكيد الاسترجاع</button><button class="btn-ghost" type="button" id="rfCancel">إلغاء</button></div>');
    var h3 = ov && ov.querySelector("h3"); if(h3) h3.innerHTML = ic("history") + 'استرجاع طلب <bdi dir="ltr" class="pr-mono">#' + esc(o.code || "") + '</bdi>';
    var amt = $("rfAmt"), prev = $("rfPrev"), ve = $("rfErr");
    function calc(){
      var h = toHal(amt.value); if(h == null || h < 1){ prev.textContent = "اكتب مبلغ صحيح (خانتين عشريتين كحد أقصى)."; return null; }
      if(h > rem){ prev.textContent = "المبلغ أكبر من المتبقي القابل للاسترجاع (" + sar(rem) + ")."; return null; }
      var due = Math.floor(paid ? ((o.rounds | 0) * (before + h)) / paid : 0) - Math.floor(paid ? ((o.rounds | 0) * before) / paid : 0);
      var short = bal == null ? 0 : Math.max(0, due - bal);
      prev.textContent = "ترجّع " + sar(h) + (h === rem ? " (استرجاع كامل للمتبقي)" : " (استرجاع جزئي)") + " — تنخصم " + roundsTxt(due) + " من رصيد العميل (وما ينزل تحت صفر)."
        + (short ? " رصيده الحين " + roundsTxt(bal) + " فقط، فيبقى ناقص " + roundsTxt(short) + " ما ينخصم." : ""); prev.classList.toggle("short", !!short); return h;
    }
    amt.oninput = calc; calc();
    $("rfCancel").onclick = close;
    $("rfOk").onclick = function(){
      if(busy) return; var h = calc(), why = $("rfWhy").value.trim();
      if(h == null){ ve.hidden = false; ve.textContent = prev.textContent; return; }
      if(why.length < 3){ ve.hidden = false; ve.textContent = "اكتب السبب (3 أحرف فأكثر)"; return; }
      ve.hidden = true; $("rfOk").disabled = true; busy = true;
      cx.SB.rpc("admin_refund", { p_order:o.id, p_amount_halalas:h, p_reason:why }).then(function(x){
        busy = false; if(x.error) throw x.error; var d = cx.rpcData(x) || {};
        close(); cx.toast("انسترجع " + sar(h) + " — انخصمت " + roundsTxt(d.rounds_removed | 0) + (d.rounds_shortfall ? " (وناقص " + roundsTxt(d.rounds_shortfall | 0) + " لأن الرصيد ما كفّى)" : "")); if(done) done(d);
      }).catch(function(e){ busy = false; var v2 = $("rfErr"); if(v2){ v2.hidden = false; v2.textContent = err(e); } if($("rfOk")) $("rfOk").disabled = false; });
    };
    setTimeout(function(){ if(amt.isConnected){ amt.focus(); amt.select(); } }, 30);
  }

  /* ---------- أحداث (تفويض مرة وحدة) ---------- */
  document.addEventListener("click", function(e){
    if(!C || !C.box || !C.box.contains(e.target)) return;
    var t = e.target.closest("button"); if(!t) return;
    if(t.id === "prNew"){ openEdit(null); return; }
    var cp = t.getAttribute("data-prcopy"); if(cp){ copy(cp); return; }
    var ed = t.getAttribute("data-predit"); if(ed){ var r = byId(ed); if(r) openEdit(r); return; }
    var st = t.getAttribute("data-prst"); if(st){ FILT.state = st; PAGE = 0; Array.prototype.forEach.call(document.querySelectorAll("[data-prst]"), function(x){ x.classList.toggle("on", x === t); }); paintList(); return; }
    var pg = t.getAttribute("data-prpg"); if(pg){ PAGE = Math.max(0, PAGE + (+pg)); paintList(); }
  });
  document.addEventListener("change", function(e){
    var i = e.target;
    if(i && i.getAttribute && i.getAttribute("data-pract") && C && C.box && C.box.contains(i)){
      var r = byId(i.getAttribute("data-pract")); i.checked = !i.checked;   /* نرجّعه لين ينكتب السبب ويوافق السيرفر */
      if(r) openToggle(r, !r.active); return;
    }
    if(i && i.id === "prCamp" && C && C.box && C.box.contains(i)){ FILT.camp = i.value; refilter(); }
  });
  document.addEventListener("input", function(e){
    if(e.target && e.target.id === "prQ" && C && C.box && C.box.contains(e.target)){ var v = e.target.value; clearTimeout(QT); QT = setTimeout(function(){ FILT.q = v.trim(); refilter(); }, 300); }
  });

  root.AdmPromos = { load: load, init: init, openRefund: openRefund, errText: err, isMissing: isMissing, _violText: violText };
})(window);
