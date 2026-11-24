/* لوحة الأدمن — الباقات والأسعار ومخطط السهرة (M4a). بدون مكتبات.
   القراءة مباشرة من جدول packages، والحفظ/الأرشفة/فحص التسعير عبر دوال السيرفر (sql/17). قاعدة التسعير يفرضها السيرفر؛ الواجهة تشرح المخالفة وتقترح سعرًا. */
(function(root){
  "use strict";
  var C = null, KIND = "rounds", ROWS = [], CHECK = null, SQLMISS = false, TOK = 0, ov = null;
  var COLS = "id,rounds,price,active,sort,name,description,kind,minutes,features,sale_price,sale_from,sale_to,visible,recommended,archived,updated_at";
  var NOTE_PLAN = "باقات مخطط السهرة مسودات: ما تظهر للعميل حاليًا. (تفعيل باقة منها يخلّيها قابلة للشراء بالرمز فقط — بدون واجهة للعميل بعد، فلا تفعّلها الحين.)";

  function esc(s){ return C.esc(String(s == null ? "" : s)); }
  function $(id){ return document.getElementById(id); }
  function num(n){ n = +n || 0; return n % 1 ? n.toFixed(2).replace(/0$/, "") : String(n); }
  function unitTxt(p){ return p.kind === "plan" ? (p.minutes | 0) + " دقيقة" : (p.rounds | 0) + " جولة"; }
  function nameOf(p){ return p.name ? p.name : (p.kind === "plan" ? "سهرة " + (p.minutes | 0) + " دقيقة" : "باقة " + (p.rounds | 0) + " جولات"); }
  function saleOn(p){ var n = Date.now(); return p.sale_price != null && (!p.sale_from || new Date(p.sale_from).getTime() <= n) && (!p.sale_to || new Date(p.sale_to).getTime() > n); }
  function when(iso){ if(!iso) return "—"; try{ return new Date(iso).toLocaleString("ar-EG-u-nu-latn", { timeZone:"Asia/Riyadh", dateStyle:"medium", timeStyle:"short" }); }catch(e){ return String(iso); } }
  function isMissing(e){ var m = String(e && (e.message || e.details || e) || ""); return /could not find the function|does not exist|42703|42883|PGRST202|schema cache/i.test(m); }
  var MISS_TXT = "⚠️ شغّل ملف SQL رقم 17 أول (الباقات والأسعار) — وبعدها ترجع تفتح هالقسم.";
  function err(e){ return isMissing(e) ? MISS_TXT : C.errText(e); }

  /* ---------- التحميل ---------- */
  function load(ctx){
    C = ctx; KIND = ctx.kind === "plan" ? "plan" : "rounds"; if(!C.box) return;
    var my = ++TOK; C.box.innerHTML = '<div class="empty">… جاري التحميل</div>'; SQLMISS = false; CHECK = null;
    C.SB.from("packages").select(COLS).order("sort").then(function(r){
      if(my !== TOK) return; if(r.error) throw r.error; ROWS = r.data || [];
      render();
      return check(my);
    }).catch(function(e){
      if(my !== TOK) return; if(isMissing(e)) SQLMISS = true;
      C.box.innerHTML = '<div class="pk-miss">' + esc(isMissing(e) ? MISS_TXT : "⚠️ " + C.errText(e)) + '</div>';
    });
  }
  function reload(){ load({ SB:C.SB, box:C.box, kind:KIND, esc:C.esc, toast:C.toast, errText:C.errText, rpcData:C.rpcData, go:C.go, isOpen:C.isOpen }); }
  function check(my){
    return C.SB.rpc("admin_check_pricing", { p_kind:KIND }).then(function(r){
      if(my && my !== TOK) return; if(r.error) throw r.error; CHECK = C.rpcData(r) || { ok:true, violations:[] }; paintCheck();
    }).catch(function(e){ if(my && my !== TOK) return; CHECK = { err:err(e) }; SQLMISS = SQLMISS || isMissing(e); paintCheck(); });
  }
  function byId(id){ for(var i = 0; i < ROWS.length; i++) if(ROWS[i].id === id) return ROWS[i]; return null; }

  /* ---------- نص المخالفة بالعربي ---------- */
  function violText(v, ctxPk){
    var p = byId(v.id) || ctxPk || { id:v.id, kind:KIND }, nm = (ctxPk && ctxPk.id === v.id) ? nameOf(ctxPk) : nameOf(p);
    var cover = (v.cover || []).map(function(c){ var q = byId(c.id) || (ctxPk && ctxPk.id === c.id ? ctxPk : { id:c.id, kind:KIND }); return (c.n > 1 ? c.n + " × " : "") + "«" + nameOf(q) + "»"; }).join(" + ");
    return '<b>«' + esc(nm) + '»</b> (' + esc(unitTxt(Object.assign({ kind:KIND }, p, KIND === "plan" ? { minutes:v.units } : { rounds:v.units }))) + ') '
      + (v.scenario === "now" ? 'بسعرها ' : 'بسعرها وقت العرض اللي يبدأ ' + esc(String(v.scenario).slice(0, 10)) + ' ') + '<b>' + num(v.price) + '</b> ريال أغلى من شراء ' + esc(cover) + ' بـ <b>' + num(v.cover_price) + '</b> ريال. السعر المقترح: <b>' + num(v.suggested) + '</b> ريال.';
  }
  function paintCheck(){
    var el = $("pkCheck"); if(!el) return;
    if(!CHECK) { el.innerHTML = ""; return; }
    if(CHECK.err){ el.className = "pk-check bad"; el.innerHTML = '<b>تعذّر فحص التسعير</b><div>' + esc(CHECK.err) + '</div>'; return; }
    if(CHECK.ok){ el.className = "pk-check ok"; el.innerHTML = '<b>✅ التسعير سليم</b>'; return; }
    el.className = "pk-check bad";
    el.innerHTML = '<b>⛔ فيه ' + CHECK.violations.length + ' مشكلة بالتسعير</b><ul>' + CHECK.violations.map(function(v){ return '<li>' + violText(v) + '</li>'; }).join("") + '</ul>';
  }

  /* ---------- القائمة ---------- */
  function card(p, i){
    var u = KIND === "plan" ? (p.minutes | 0) : (p.rounds | 0), so = saleOn(p), eff = so ? +p.sale_price : +p.price, per = u ? (eff / u) : 0;
    var pills = [];
    if(p.archived) pills.push('<span class="ov-pill">مؤرشفة</span>');
    else { pills.push(p.active ? '<span class="ov-pill ok">مفعّلة</span>' : '<span class="ov-pill">مطفية</span>'); pills.push(p.visible ? '<span class="ov-pill ok">ظاهرة</span>' : '<span class="ov-pill">مخفية</span>'); }
    if(p.recommended) pills.push('<span class="ov-pill wait">⭐ موصى بها</span>');
    if(so) pills.push('<span class="ov-pill sale">عرض</span>');
    var sale = p.sale_price != null ? '<div class="pk-sale">' + (so ? '🏷️ ' : '🕒 ') + 'سعر العرض <b>' + num(p.sale_price) + '</b> ريال'
      + (p.sale_from || p.sale_to ? ' <small>(' + (p.sale_from ? 'من ' + esc(when(p.sale_from)) : '') + (p.sale_to ? ' إلى ' + esc(when(p.sale_to)) : '') + ')</small>' : '') + '</div>' : '';
    return '<div class="pk-card card adm-rv" style="--i:' + (i % 12) + '" data-pkid="' + esc(p.id) + '">'
      + '<div class="pk-hd"><h4>' + esc(nameOf(p)) + '</h4><div class="pk-pills">' + pills.join("") + '</div></div>'
      + '<div class="pk-meta"><span>الجولات: <b>' + (p.rounds | 0) + '</b></span>' + (KIND === "plan" ? '<span>الدقائق: <b>' + (p.minutes | 0) + '</b></span>' : '')
      + '<span>السعر: <b>' + num(p.price) + '</b> ريال</span><span class="pk-per" data-per>' + per.toFixed(2) + ' ريال/' + (KIND === "plan" ? 'دقيقة' : 'جولة') + '</span></div>'
      + sale + (p.description ? '<p class="pk-desc">' + esc(p.description) + '</p>' : '')
      + '<div class="pk-ft"><small>آخر تحديث: ' + esc(when(p.updated_at)) + '</small><div class="pk-act">'
      + '<button class="btn-ghost sm" type="button" data-pkedit="' + esc(p.id) + '">✏️ تعديل</button>'
      + '<button class="btn-ghost sm" type="button" data-pkarc="' + esc(p.id) + '" data-to="' + (p.archived ? "0" : "1") + '">' + (p.archived ? "↩️ استرجاع" : "🗄️ أرشفة") + '</button></div></div></div>';
  }
  function render(){
    var mine = ROWS.filter(function(p){ return (p.kind || "rounds") === KIND; }), live = mine.filter(function(p){ return !p.archived; }), arc = mine.filter(function(p){ return p.archived; });
    C.box.innerHTML = '<div class="ov-head"><div><h2>' + (KIND === "plan" ? "مخطط السهرة" : "الباقات والأسعار") + '</h2><p>إدارة الباقات وأسعارها وعروضها. السيرفر يمنع أي سعر يخالف قاعدة التسعير.</p></div></div>'
      + '<div class="pk-top"><div class="pk-kinds"><button class="chip' + (KIND === "rounds" ? " on" : "") + '" type="button" data-pkkind="packages">🎟️ جولات</button><button class="chip' + (KIND === "plan" ? " on" : "") + '" type="button" data-pkkind="plans">🌙 مخطط السهرة</button></div>'
      + '<button class="btn-primary sm" type="button" id="pkNew">➕ باقة جديدة</button></div>'
      + '<div class="pk-check" id="pkCheck" role="status"></div>'
      + (KIND === "plan" ? '<div class="pk-note" id="pkPlanNote">ℹ️ ' + esc(NOTE_PLAN) + '</div>' : '')
      + '<div class="pk-list" id="pkList">' + (live.length ? live.map(card).join("") : '<div class="empty">ما فيه باقات هنا بعد — اضغط «➕ باقة جديدة».</div>') + '</div>'
      + '<details class="pk-arc" id="pkArc"' + '><summary>🗄️ المؤرشفة (' + arc.length + ')</summary>' + (arc.length ? '<div class="pk-list">' + arc.map(card).join("") + '</div>' : '<div class="empty">ما فيه باقات مؤرشفة</div>') + '</details>';
    paintCheck();
  }

  /* ---------- نافذة ---------- */
  function shell(title, body){
    close();
    ov = document.createElement("div"); ov.className = "ov"; ov.id = "pkOv";
    ov.innerHTML = '<div class="modal wide" role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3><div id="pkMBody">' + body + '</div></div>'; document.body.appendChild(ov);
    ov.addEventListener("click", function(e){ if(e.target === ov) close(); });
  }
  function close(){ if(ov){ ov.remove(); ov = null; } }
  document.addEventListener("keydown", function(e){ if(e.key === "Escape" && ov) close(); });
  function toLocal(iso){ if(!iso) return ""; var d = new Date(iso); if(isNaN(d)) return ""; var z = function(n){ return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "T" + z(d.getHours()) + ":" + z(d.getMinutes()); }
  function sw(id, label, on, small){ return '<label class="sl-toggle pk-sw"><span class="switch"><input type="checkbox" id="' + id + '"' + (on ? " checked" : "") + '><span></span></span><span><b>' + label + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</span></label>'; }

  function openEdit(p){
    var isNew = !p, plan = KIND === "plan"; p = p || { kind:KIND, rounds:plan ? 6 : 20, minutes:plan ? 60 : null, price:"", active:!plan, visible:true, recommended:false, features:[], sort:"" };
    var body = '<label class="field"><span>الاسم (اختياري — لو تركته فاضي يتولّد من العدد)</span><input class="input" id="pkName" maxlength="60" value="' + esc(p.name || "") + '"></label>'
      + '<label class="field"><span>الوصف (اختياري)</span><textarea class="input" id="pkDesc" rows="2" maxlength="300">' + esc(p.description || "") + '</textarea></label>'
      + '<div class="pk-grid">'
      + '<label class="field"><span>عدد الجولات</span><input class="input" id="pkRounds" inputmode="numeric" value="' + esc(p.rounds) + '"></label>'
      + (plan ? '<label class="field"><span>الدقائق</span><input class="input" id="pkMin" inputmode="numeric" value="' + esc(p.minutes == null ? "" : p.minutes) + '"></label>' : '')
      + '<label class="field"><span>السعر (ريال)</span><input class="input" id="pkPrice" inputmode="decimal" value="' + esc(p.price === "" ? "" : num(p.price)) + '"></label>'
      + '<label class="field"><span>سعر العرض (اختياري)</span><input class="input" id="pkSale" inputmode="decimal" value="' + esc(p.sale_price == null ? "" : num(p.sale_price)) + '"></label>'
      + '<label class="field"><span>بداية العرض</span><input class="input" id="pkFrom" type="datetime-local" value="' + esc(toLocal(p.sale_from)) + '"></label>'
      + '<label class="field"><span>نهاية العرض</span><input class="input" id="pkTo" type="datetime-local" value="' + esc(toLocal(p.sale_to)) + '"></label>'
      + '<label class="field"><span>الترتيب</span><input class="input" id="pkSort" inputmode="numeric" value="' + esc(p.sort == null ? "" : p.sort) + '"></label></div>'
      + '<label class="field"><span>المميزات (كل ميزة بسطر، حد أقصى 8)</span><textarea class="input" id="pkFeat" rows="4">' + esc((p.features || []).join("\n")) + '</textarea></label>'
      + '<div class="pk-sws">' + sw("pkActive", "مفعّلة", p.active, "المطفية ما تنباع") + sw("pkVisible", "ظاهرة", p.visible, "المخفية ما تطلع بالقائمة") + sw("pkRec", "موصى بها", p.recommended) + '</div>'
      + (plan ? '<div class="pk-note">ℹ️ ' + esc(NOTE_PLAN) + '</div>' : '')
      + '<label class="field"><span>السبب (مطلوب، 3 أحرف فأكثر — يظهر بسجل العمليات)</span><input class="input" id="pkWhy" maxlength="200"></label>'
      + '<div class="pk-verr" id="pkVerr" hidden></div><div class="m-btns"><button class="btn-primary" type="button" id="pkSave">حفظ</button><button class="btn-ghost" type="button" id="pkCancel">إلغاء</button></div>';
    shell(isNew ? "➕ باقة جديدة" : "✏️ تعديل: " + nameOf(p), body);
    var id = p.id || ("pk" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
    $("pkCancel").onclick = close;
    function ve(html){ var e = $("pkVerr"); e.innerHTML = html; e.hidden = !html; if(html && e.scrollIntoView) e.scrollIntoView({ block:"nearest" }); }
    function gather(){
      var o = { id:id, kind:KIND }, price = $("pkPrice").value.trim(), sale = $("pkSale").value.trim(), rounds = $("pkRounds").value.trim();
      var d2 = /^[0-9]{1,5}(\.[0-9]{1,2})?$/;
      if(!/^[0-9]{1,4}$/.test(rounds) || +rounds < 1 || +rounds > 1000) return { e:"عدد الجولات لازم من 1 لين 1000" };
      o.rounds = +rounds;
      if(plan){ var mn = $("pkMin").value.trim(); if(!/^[0-9]{1,4}$/.test(mn) || +mn < 5 || +mn > 1440) return { e:"الدقائق لازم من 5 لين 1440" }; o.minutes = +mn; }
      if(!d2.test(price) || +price < 1) return { e:"السعر لازم من 1 ريال وفوق (لين خانتين عشريتين، وأقل من 100000)" };
      o.price = +price;
      if(sale){
        if(!d2.test(sale) || +sale < 1) return { e:"سعر العرض غير صالح (1 ريال وفوق، لين خانتين عشريتين)" };
        if(+sale >= +price) return { e:"سعر العرض لازم يكون أقل من السعر العادي" };
        o.sale_price = +sale;
        var f = $("pkFrom").value, t = $("pkTo").value;
        if(f && t && new Date(t) <= new Date(f)) return { e:"نهاية العرض لازم تكون بعد بدايته" };
        o.sale_from = f ? new Date(f).toISOString() : null; o.sale_to = t ? new Date(t).toISOString() : null;
      }
      var sort = $("pkSort").value.trim(); if(sort){ if(!/^[0-9]{1,4}$/.test(sort)) return { e:"الترتيب رقم من 0 لين 9999" }; o.sort = +sort; }
      var feat = $("pkFeat").value.split(/\r?\n/).map(function(x){ return x.trim(); }).filter(Boolean);
      if(feat.length > 8) return { e:"المميزات حد أقصى 8 (عندك " + feat.length + ")" };
      if(feat.some(function(x){ return x.length > 80; })) return { e:"كل ميزة لين 80 حرف" };
      o.features = feat; o.name = $("pkName").value.trim(); o.description = $("pkDesc").value.trim();
      o.active = $("pkActive").checked; o.visible = $("pkVisible").checked; o.recommended = $("pkRec").checked;
      var why = $("pkWhy").value.trim(); if(why.length < 3) return { e:"اكتب السبب (3 أحرف فأكثر)" };
      return { o:o, why:why };
    }
    $("pkSave").onclick = function(){
      var g = gather(); if(g.e){ ve("⚠️ " + esc(g.e)); return; } ve("");
      var btn = $("pkSave"); btn.disabled = true;
      C.SB.rpc("admin_save_package", { p:g.o, p_reason:g.why }).then(function(r){
        if(r.error) throw r.error; var d = C.rpcData(r) || {};
        if(d.saved){ close(); C.toast("✅ انحفظت الباقة"); reload(); return; }
        var cand = Object.assign({}, g.o, { name:g.o.name || null });
        var items = (d.violations || []).map(function(v, i){
          var mine = v.id === id;
          return '<li>' + violText(v, cand) + (mine ? ' <button class="btn-ghost sm" type="button" data-sug="' + num(v.suggested) + '" data-sc="' + ((cand && cand.sale_price != null && +cand.sale_price === +v.price && +cand.sale_price !== +cand.price) ? "sale" : "list") + '">استخدم السعر المقترح</button>' : ' <small>(عدّل سعر هالباقة الثانية أو غيّر هالباقة)</small>') + '</li>';
        }).join("");
        ve('<b>⛔ ما انحفظت — السعر يخالف قاعدة التسعير</b><ul>' + items + '</ul><small>القاعدة: الباقة ما تكلّف أكثر من أرخص دمج لباقات ثانية فعّالة وظاهرة تغطي نفس العدد أو أكثر.</small>');
        $("pkVerr").querySelectorAll("[data-sug]").forEach(function(b){ b.onclick = function(){ var sc = b.getAttribute("data-sc"); $(sc === "sale" ? "pkSale" : "pkPrice").value = b.getAttribute("data-sug"); ve(""); }; });
        btn.disabled = false;
      }).catch(function(e){ ve("⚠️ " + esc(err(e))); btn.disabled = false; });
    };
    setTimeout(function(){ var f = $("pkName"); if(f) f.focus(); }, 30);
  }

  function openArchive(p, to){
    shell((to ? "🗄️ أرشفة: " : "↩️ استرجاع: ") + nameOf(p),
      '<p class="hint">' + (to ? 'الأرشفة تطفّي الباقة وتخفيها من المبيعات (ما تنحذف أبدًا، وتقدر ترجّعها).' : 'الاسترجاع يرجّعها للقائمة وهي مطفية — فعّلها من «تعديل» لما تبغاها تنباع.') + '</p>'
      + '<label class="field"><span>السبب (مطلوب، 3 أحرف فأكثر)</span><input class="input" id="pkWhy" maxlength="200"></label><div class="pk-verr" id="pkVerr" hidden></div>'
      + '<div class="m-btns"><button class="btn-primary" type="button" id="pkSave">' + (to ? "أرشفة" : "استرجاع") + '</button><button class="btn-ghost" type="button" id="pkCancel">إلغاء</button></div>');
    $("pkCancel").onclick = close;
    $("pkSave").onclick = function(){
      var why = $("pkWhy").value.trim(), ve = $("pkVerr"); if(why.length < 3){ ve.hidden = false; ve.textContent = "⚠️ اكتب السبب (3 أحرف فأكثر)"; return; }
      $("pkSave").disabled = true;
      C.SB.rpc("admin_package_archive", { p_id:p.id, p_archived:!!to, p_reason:why }).then(function(r){
        if(r.error) throw r.error; close(); C.toast(to ? "🗄️ انأرشفت الباقة" : "↩️ انسترجعت الباقة"); reload();
      }).catch(function(e){ ve.hidden = false; ve.textContent = "⚠️ " + err(e); $("pkSave").disabled = false; });
    };
    setTimeout(function(){ $("pkWhy").focus(); }, 30);
  }

  /* ---------- أحداث (تفويض على الصندوق مرة وحدة) ---------- */
  document.addEventListener("click", function(e){
    if(!C || !C.box || !C.box.contains(e.target)) return;
    var t = e.target.closest("button"); if(!t) return;
    if(t.id === "pkNew"){ if(SQLMISS){ C.toast(MISS_TXT); return; } openEdit(null); return; }
    var k = t.getAttribute("data-pkkind"); if(k){ C.go(k); return; }
    var ed = t.getAttribute("data-pkedit"); if(ed){ var p = byId(ed); if(p) openEdit(p); return; }
    var ar = t.getAttribute("data-pkarc"); if(ar){ var q = byId(ar); if(q) openArchive(q, t.getAttribute("data-to") === "1"); }
  });

  root.AdmPackages = { load: load, _pricingText: violText };
})(window);
