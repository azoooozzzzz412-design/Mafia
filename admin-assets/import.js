/* لوحة الأدمن — استيراد المحتوى من ملف (M3a): CSV / JSON / لصق، قوالب، معاينة بفحص السيرفر، دفعات، تقرير أخطاء، سجل دفعات + تراجع.
   بدون مكتبات. التحليل كله بالمتصفح، والتحقق والتكرار والإدخال بالسيرفر (admin_import_batch). */
(function(root){
  "use strict";
  var MAX_BYTES = 5 * 1024 * 1024, MAX_ROWS = 20000, SEND = 500, C = null, S = null;
  var NUM = /^-?\d+(\.\d+)?$/;

  /* ---------- تعريف الألعاب (القوالب تتولّد منه) ---------- */
  var GAMES = {
    trivia:{ ar:"🎯 سين جيم", cols:[["category", ["الفئة", "category", "cat"]], ["tier", ["النقاط", "points", "tier", "الصعوبة", "level"]], ["question", ["السؤال", "question", "q"]], ["answer", ["الإجابة", "الاجابة", "الجواب", "answer", "a"]]],
      head:["الفئة", "النقاط", "السؤال", "الإجابة"], ex:[["رياضة", "1", "كم لاعب بفريق كرة القدم؟", "11"], ["جغرافيا", "3", "وش عاصمة أستراليا؟", "كانبرا"]], note:"النقاط من 1 (سهل) إلى 4 (صعب جدًا)." },
    letters:{ ar:"🔤 الحروف", cols:[["letter", ["الحرف", "letter"]], ["question", ["السؤال", "question", "q"]], ["answer", ["الإجابة", "الاجابة", "الجواب", "answer", "a"]], ["level", ["الصعوبة", "level"]]],
      head:["الحرف", "السؤال", "الإجابة", "الصعوبة"], ex:[["ج", "حيوان يعيش بالصحراء", "جمل", "1"], ["م", "فاكهة صفراء طويلة", "موز", "1"]], note:"الحرف حرف واحد. الصعوبة من 1 إلى 5 (اختياري، الافتراضي 1)." },
    million:{ ar:"💰 طريق المليون", cols:[["question", ["السؤال", "question", "q"]], ["answer", ["الجواب الصح", "الجواب", "الإجابة", "الاجابة", "answer", "correct"]], ["w1", ["غلط 1", "غلط1", "wrong1", "wrong 1", "wrong_1", "خطأ 1"]], ["w2", ["غلط 2", "غلط2", "wrong2", "wrong 2", "wrong_2", "خطأ 2"]], ["w3", ["غلط 3", "غلط3", "wrong3", "wrong 3", "wrong_3", "خطأ 3"]], ["level", ["الصعوبة", "level"]], ["category", ["الفئة", "category", "cat"]]],
      head:["السؤال", "الجواب الصح", "غلط 1", "غلط 2", "غلط 3", "الصعوبة", "الفئة"], ex:[["ما أكبر كوكب بالمجموعة الشمسية؟", "المشتري", "زحل", "المريخ", "الأرض", "1", "علوم"]], note:"3 إجابات غلط مختلفة عن الصح. الصعوبة 1 أو 2 أو 3." },
    heads:{ ar:"🤳 على راسك", cols:[["deck", ["الفئة", "deck", "category", "cat"]], ["word", ["الكلمة", "word"]]],
      head:["الفئة", "الكلمة"], ex:[["animals", "أسد"], ["animals", "فيل"]], note:"«الفئة» لازم تكون موجودة (اكتب رمزها زي ما يظهر في اللوحة)." },
    charades:{ ar:"🎬 التمثيل", cols:[["title", ["العنوان", "title", "الاسم"]]],
      head:["العنوان"], ex:[["الأسد الملك"], ["تيتانيك"]], note:"عنوان واحد بكل صف." }
  };
  var ORDER = ["trivia", "letters", "million", "heads", "charades"];

  /* ---------- أدوات ---------- */
  function hdrKey(s){ return String(s == null ? "" : s).replace(/^﻿/, "").replace(/[ً-ٰٟ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase(); }
  /* خلية تصدير آمنة: أي نص يبدأ بـ = + - @ أو Tab/CR يُسبق بـ ' (حماية حقن الصيغ بإكسل). الأرقام الصافية ما تتغير. */
  function safeCell(v){
    v = String(v == null ? "" : v);
    if(NUM.test(v)) return v;
    return /^[\s]*[=+\-@\t\r]/.test(v) || /^[\t\r]/.test(v) ? "'" + v : v;
  }
  /* عند الاستيراد: نرجّع الـ ' اللي أضافها التصدير الآمن */
  function unsafeCell(v){ v = String(v == null ? "" : v); return /^'[=+\-@]/.test(v) ? v.slice(1) : v; }
  /* مطابقة تقريبية لتطبيع السيرفر (للتكرار داخل الملف فقط؛ السيرفر هو المرجع) */
  function normKey(s){
    return String(s == null ? "" : s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u00AD\u061C\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, "").toLowerCase()
      .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[٠-٩]/g, function(d){ return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); }).replace(/[۰-۹]/g, function(d){ return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)); })
      .replace(/[ً-ٰٟـ]/g, "").replace(/[\s.,،؛؟?!:;"'()\[\]{}«»_\-]+/g, " ").trim().slice(0, 500);
  }
  function keyOf(game, o){
    if(game === "letters") return normKey((o.letter || "") + "|" + (o.question || ""));
    if(game === "heads") return normKey((o.deck || "") + "|" + (o.word || ""));
    if(game === "charades") return normKey(o.title || "");
    return normKey(o.question || "");
  }

  /* ---------- محلل CSV: علامات اقتباس، أسطر داخل الخلية، BOM، فاصل تلقائي (, ; Tab |) ---------- */
  function splitCount(line, d){ var n = 0, q = false; for(var i = 0; i < line.length; i++){ var ch = line[i]; if(ch === '"') q = !q; else if(ch === d && !q) n++; } return n; }
  function detectDelim(text){
    var lines = []; var q = false, cur = "";
    for(var i = 0; i < text.length && lines.length < 6; i++){ var ch = text[i]; if(ch === '"') q = !q; if((ch === "\n" || ch === "\r") && !q){ if(cur.trim()) lines.push(cur); cur = ""; } else cur += ch; }
    if(cur.trim() && lines.length < 6) lines.push(cur);
    var best = ",", bestScore = -1;
    ["\t", "|", ";", ","].forEach(function(d){
      var cs = lines.map(function(l){ return splitCount(l, d); }), min = Math.min.apply(null, cs.concat([1e9])), sum = cs.reduce(function(a, b){ return a + b; }, 0);
      var score = (min > 0 ? 1000 : 0) + (cs.every(function(c){ return c === cs[0]; }) && cs[0] > 0 ? 500 : 0) + sum;
      if(score > bestScore){ bestScore = score; best = d; }
    });
    return best;
  }
  function parseDelimited(text){
    if(text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var d = detectDelim(text), rows = [], row = [], cur = "", q = false, i = 0, n = text.length, started = false;
    function endCell(){ row.push(cur); cur = ""; }
    function endRow(){ endCell(); if(row.some(function(c){ return String(c).trim() !== ""; })) rows.push(row); row = []; if(rows.length > MAX_ROWS + 1) throw new Error("الملف فيه أكثر من " + MAX_ROWS + " صف"); }
    for(; i < n; i++){
      var ch = text[i];
      if(q){
        if(ch === '"'){ if(text[i + 1] === '"'){ cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if(ch === '"' && cur === ""){ q = true; started = true; }
      else if(ch === d) endCell();
      else if(ch === "\r"){ if(text[i + 1] === "\n") i++; endRow(); }
      else if(ch === "\n") endRow();
      else cur += ch;
    }
    if(q) throw new Error("علامة اقتباس « \" » غير مغلقة — الملف ناقص أو تالف");
    if(cur !== "" || row.length) endRow();
    return { rows:rows, delim:d };
  }

  /* ---------- من ملف/نص إلى صفوف حقول موحّدة ---------- */
  function aliasMap(game){ var m = {}; GAMES[game].cols.forEach(function(c){ c[1].forEach(function(a){ m[hdrKey(a)] = c[0]; }); }); return m; }
  function fromObjects(game, arr){
    var am = aliasMap(game), out = [];
    arr.forEach(function(o){
      var r = {};
      if(o && typeof o === "object" && !Array.isArray(o)){
        Object.keys(o).forEach(function(k){
          var f = am[hdrKey(k)]; var v = o[k];
          if(!f){ if(game === "million" && hdrKey(k) === "wrong" && Array.isArray(v)){ r.w1 = v[0]; r.w2 = v[1]; r.w3 = v[2]; } return; }
          r[f] = ((v !== null && typeof v === "object") || String(v).indexOf("\u0000") !== -1) ? "\u0000bad" : (v == null ? "" : unsafeCell(String(v)));
        });
      } else r = { "\u0000raw":1 };
      out.push(r);
    });
    return out;
  }
  function fromTable(game, table){
    var am = aliasMap(game), cols = GAMES[game].cols, first = table[0] || [], hit = first.filter(function(c){ return am[hdrKey(c)]; }).length;
    var isHeader = cols.length === 1 ? hit === 1 : hit >= 2;
    var idx = {}, start = 0;
    if(isHeader){ first.forEach(function(c, i){ var f = am[hdrKey(c)]; if(f && !(f in idx)) idx[f] = i; }); start = 1;
      var OPT = { letters:{ level:1 }, million:{ category:1 } }[game] || {};
      var missing = cols.filter(function(c){ return !(c[0] in idx) && !OPT[c[0]]; }).map(function(c){ return GAMES[game].head[cols.indexOf(c)]; });
      if(missing.length) throw new Error("ناقص عمود: " + missing.join("، "));
    } else cols.forEach(function(c, i){ idx[c[0]] = i; });
    var out = [];
    for(var r = start; r < table.length; r++){ var o = {}; Object.keys(idx).forEach(function(f){ o[f] = unsafeCell(table[r][idx[f]] == null ? "" : String(table[r][idx[f]]).trim()); }); out.push(o); }
    return { rows:out, header:isHeader };
  }
  function parseText(game, text, fileName){
    text = String(text == null ? "" : text);
    if(text.length > MAX_BYTES) throw new Error("النص أكبر من 5MB");
    if(text.indexOf("\u0000") !== -1) throw new Error("الملف مو نصي (فيه بيانات ثنائية)");
    var t = text.replace(/^﻿/, "").trim();
    if(!t) throw new Error("الملف فاضي");
    var isJson = /\.json$/i.test(fileName || "") || /^[\[{]/.test(t);
    if(isJson){
      var j; try{ j = JSON.parse(t); }catch(e){ throw new Error("ملف JSON غير صالح: " + e.message); }
      if(j && !Array.isArray(j) && Array.isArray(j.rows)) j = j.rows;
      if(!Array.isArray(j)) throw new Error("JSON لازم يكون قائمة صفوف [ {…}, {…} ]");
      if(j.length > MAX_ROWS) throw new Error("الملف فيه أكثر من " + MAX_ROWS + " صف");
      return { rows:fromObjects(game, j), header:true, format:"JSON" };
    }
    var p = parseDelimited(t), res = fromTable(game, p.rows);
    return { rows:res.rows, header:res.header, format:"CSV", delim:p.delim };
  }
  /* صف موحّد → صف يرسله السيرفر */
  function toServer(game, o){
    if(Object.keys(o).some(function(k){ return o[k] === "\u0000bad" || k === "\u0000raw"; })) return null;
    if(game === "million") return { level:o.level, category:o.category || "", question:o.question, answer:o.answer, wrong:[o.w1 || "", o.w2 || "", o.w3 || ""] };
    return o;
  }

  /* UTF-8 أول؛ لو الملف مو UTF-8 (إكسل العربي يحفظ CSV بـ Windows-1256) نفكّه بـ Windows-1256. ولو ظهرت رموز تالفة نرفضه بدل ما تدخل نصوص خربانة. */
  function decodeBytes(buf){
    var out = { text:"", note:"", err:"" };
    try{ out.text = new TextDecoder("utf-8", { fatal:true }).decode(buf); }
    catch(e){
      try{ out.text = new TextDecoder("windows-1256").decode(buf); out.note = "ترميز Windows-1256 (إكسل)"; }
      catch(e2){ out.err = "ترميز الملف غير مدعوم — احفظه كـ CSV UTF-8"; return out; }
    }
    if(out.text.indexOf("\uFFFD") !== -1) out.err = "الملف فيه رموز تالفة — احفظه من إكسل كـ «CSV UTF-8» وجرّب من جديد";
    return out;
  }

  /* ---------- واجهة المعالج ---------- */
  function esc(s){ return C.esc(String(s == null ? "" : s)); }
  function uuid(){ if(root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID(); var h = "0123456789abcdef", u = ""; for(var i = 0; i < 36; i++){ u += (i === 8 || i === 13 || i === 18 || i === 23) ? "-" : i === 14 ? "4" : h[Math.floor(Math.random() * 16)]; } return u; }
  function fmt(n){ return (+n || 0).toLocaleString("ar-EG-u-nu-latn"); }
  var ov = null;
  function close(){ if(ov){ ov.remove(); ov = null; } S = null; }
  function shell(title, body){
    if(!ov){ ov = document.createElement("div"); ov.className = "ov"; ov.id = "impOv"; ov.innerHTML = '<div class="modal wide" role="dialog" aria-modal="true"><h3 id="impTitle"></h3><div id="impBody"></div></div>'; document.body.appendChild(ov);
      ov.addEventListener("click", function(e){ if(e.target === ov && !(S && S.busy)) close(); });
      document.addEventListener("keydown", function(e){ if(e.key === "Escape" && ov && !(S && S.busy)) close(); }); }
    document.getElementById("impTitle").textContent = title; document.getElementById("impBody").innerHTML = body;
  }
  function tplCsv(game){ var g = GAMES[game]; C.downloadCsv("قالب-" + game + ".csv", [g.head].concat(g.ex)); }
  function tplJson(game){
    var g = GAMES[game], arr = g.ex.map(function(row){ var o = {}; g.cols.forEach(function(c, i){ o[g.head[i]] = row[i]; }); return o; });
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(arr, null, 2)], { type:"application/json;charset=utf-8" })); a.download = "قالب-" + game + ".json"; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function mainView(game){
    S = S || {}; S.game = game; S.rows = null; S.report = null; S.busy = false;
    var g = GAMES[game];
    shell("📦 استيراد المحتوى", '<div class="imp-row"><label class="field"><span>اللعبة</span><select class="input" id="impGame">' + ORDER.map(function(k){ return '<option value="' + k + '"' + (k === game ? " selected" : "") + '>' + esc(GAMES[k].ar) + '</option>'; }).join("") + '</select></label>'
      + '<label class="field"><span>لو فيه مكرر أو خطأ</span><select class="input" id="impMode"><option value="skip">أدخل الصالح وتجاهل المكرر والأخطاء</option><option value="stop">لا تدخل شي إلا لو الملف كله سليم</option></select></label></div>'
      + '<p class="hint">الأعمدة: <b>' + g.head.map(esc).join(" · ") + '</b>. ' + esc(g.note) + ' الملف CSV أو JSON (حتى 5MB و20,000 صف). <b>عندك ملف إكسل؟</b> احفظه من إكسل كـ «CSV UTF-8»، أو حدّد الخلايا وانسخها والصقها بالخانة تحت.</p>'
      + '<div class="imp-tpl"><button type="button" class="btn-ghost sm" id="impTplCsv">⬇️ قالب CSV</button><button type="button" class="btn-ghost sm" id="impTplJson">⬇️ قالب JSON</button><button type="button" class="btn-ghost sm" id="impHist">🧾 سجل الدفعات والتراجع</button></div>'
      + '<label class="imp-drop" id="impDrop"><input type="file" id="impFile" hidden><b>اسحب الملف هنا أو اضغط للاختيار</b><small id="impFileName">ما انختار ملف</small></label>'
      + '<label class="field"><span>أو الصق النص هنا</span><textarea class="input" id="impPaste" rows="4" placeholder="' + esc(g.head.join(" | ")) + '"></textarea></label>'
      + '<div class="imp-prev" id="impPrev"></div><div class="err" id="impErr" hidden></div>'
      + '<div class="m-btns"><button class="btn-primary" id="impGo" type="button" disabled>تحليل</button><button class="btn-ghost" id="impClose" type="button">إغلاق</button></div>');
    var $ = function(i){ return document.getElementById(i); }, text = null, fname = "";
    var setErr = function(m){ $("impErr").hidden = !m; $("impErr").textContent = m ? "⚠️ " + m : ""; };
    $("impGame").addEventListener("change", function(){ mainView(this.value); });
    $("impMode").addEventListener("change", function(){ if(text){ ready(); $("impPrev").innerHTML = ""; } });
    $("impTplCsv").addEventListener("click", function(){ tplCsv(S.game); }); $("impTplJson").addEventListener("click", function(){ tplJson(S.game); });
    $("impHist").addEventListener("click", historyView); $("impClose").addEventListener("click", close);
    function ready(){ $("impGo").disabled = !(text && text.trim()); $("impGo").textContent = "تحليل"; $("impGo").onclick = analyze; S.rows = null; }
    function load(f){
      setErr("");
      if(!f) return;
      if(/\.(xlsx|xlsm|xlsb|xls|ods|numbers)$/i.test(f.name)) return setErr("هذا ملف إكسل. افتحه بإكسل ← ملف ← حفظ باسم ← «CSV UTF-8 (محدد بفواصل)» وارفع الملف الجديد، أو حدّد الخلايا وانسخها والصقها بخانة النص تحت.");
      if(/\.(zip|rar|7z|gz|pdf|docx?|exe|png|jpe?g|gif|webp)$/i.test(f.name)) return setErr("نوع الملف غير مدعوم — استخدم CSV أو JSON (أو الصق النص).");
      if(f.size > MAX_BYTES) return setErr("الملف أكبر من 5MB");
      if(f.type && !/^(text\/|application\/(json|vnd\.ms-excel|csv))/.test(f.type) && !/\.(csv|json|txt)$/i.test(f.name)) return setErr("نوع الملف غير مدعوم — استخدم CSV أو JSON");
      var rd = new FileReader(); rd.onerror = function(){ setErr("ما قدرت أقرا الملف"); };
      rd.onload = function(){
        var dec = decodeBytes(rd.result);
        if(dec.err) return setErr(dec.err);
        text = dec.text; fname = f.name; $("impFileName").textContent = f.name + " (" + Math.round(f.size / 1024) + " KB)" + (dec.note ? " — " + dec.note : ""); $("impPaste").value = ""; ready(); $("impPrev").innerHTML = "";
      };
      rd.readAsArrayBuffer(f);
    }
    $("impFile").addEventListener("change", function(){ load(this.files && this.files[0]); });
    ["dragover", "dragenter"].forEach(function(ev){ $("impDrop").addEventListener(ev, function(e){ e.preventDefault(); this.classList.add("on"); }); });
    ["dragleave", "drop"].forEach(function(ev){ $("impDrop").addEventListener(ev, function(e){ e.preventDefault(); this.classList.remove("on"); if(ev === "drop") load(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); }); });
    $("impPaste").addEventListener("input", function(){ text = this.value; fname = "paste.txt"; $("impFileName").textContent = "ما انختار ملف"; ready(); $("impPrev").innerHTML = ""; });

    function analyze(){
      setErr(""); S.mode = $("impMode").value; S.busy = true; $("impGo").disabled = true; $("impPrev").innerHTML = '<div class="hint">جاري التحليل…</div>';
      var parsed; try{ parsed = parseText(S.game, text, fname); }catch(e){ S.busy = false; $("impGo").disabled = false; $("impPrev").innerHTML = ""; return setErr(e.message); }
      if(!parsed.rows.length){ S.busy = false; $("impGo").disabled = false; $("impPrev").innerHTML = ""; return setErr("ما لقيت صفوف"); }
      var off = parsed.header ? 2 : 1, good = [], bad = [], seen = {};
      parsed.rows.forEach(function(o, i){
        var srv = toServer(S.game, o);
        if(!srv){ bad.push({ n:i + off, why:"قيمة غير صالحة" }); return; }
        var k = keyOf(S.game, o);
        if(k && seen[k]){ bad.push({ n:i + off, why:"مكرر داخل الملف (نفس الصف " + seen[k] + ")", dup:true }); return; }
        if(k) seen[k] = i + off;
        good.push({ n:i + off, row:srv });
      });
      S.parsed = parsed; S.local = bad.slice(); S.good = good; S.fname = fname;
      /* فحص السيرفر (check) على دفعات 1000 — ما يكتب شي */
      var ok = 0, dup = 0, bd = 0, rep = [], pos = 0;
      function step(){
        if(pos >= good.length) return Promise.resolve();
        var part = good.slice(pos, pos + 1000); pos += 1000;
        return C.SB.rpc("admin_import_batch", { p_game:S.game, p_mode:"check", p_rows:part.map(function(x){ return x.row; }), p_batch:null, p_file:null, p_final:false }).then(function(r){
          if(r.error) throw r.error; var d = C.rpcData(r) || {};
          ok += d.ok | 0; dup += d.dup | 0; bd += d.bad | 0;
          (d.report || []).forEach(function(x){ rep.push({ n:part[x.i - 1].n, why:x.why, dup:!!x.dup, row:part[x.i - 1].row }); });
          $("impPrev").innerHTML = '<div class="hint">جاري الفحص… ' + fmt(Math.min(pos, good.length)) + ' / ' + fmt(good.length) + '</div>';
          return step();
        });
      }
      step().then(function(){
        S.busy = false; S.report = bad.concat(rep).sort(function(a, b){ return a.n - b.n; });
        S.sum = { total:parsed.rows.length, ok:ok, dup:dup + bad.filter(function(b){ return b.dup; }).length, bad:bd + bad.filter(function(b){ return !b.dup; }).length };
        showSummary();
      }).catch(function(e){
        S.busy = false; $("impGo").disabled = false; $("impPrev").innerHTML = "";
        var m = String((e && e.message) || e);
        setErr(/Could not find the function|schema cache|does not exist/i.test(m) ? "الاستيراد من السيرفر غير مفعّل — شغّل ملف SQL رقم 16 أول." : C.errText(e));
      });
    }
    function showSummary(){
      var s = S.sum, g = GAMES[S.game];
      var blocked = S.mode === "stop" && (s.dup || s.bad);
      $("impPrev").innerHTML = '<div class="imp-sum"><div><b>' + fmt(s.total) + '</b><small>صف بالملف (' + esc(S.parsed.format) + (S.parsed.delim ? "، الفاصل " + (S.parsed.delim === "\t" ? "Tab" : S.parsed.delim) : "") + ')</small></div><div class="ok"><b>' + fmt(s.ok) + '</b><small>جاهز للإضافة</small></div><div class="dup"><b>' + fmt(s.dup) + '</b><small>مكرر</small></div><div class="bad"><b>' + fmt(s.bad) + '</b><small>فيه خطأ</small></div></div>'
        + (S.report.length ? '<div class="imp-errs">' + S.report.slice(0, 15).map(function(x){ return '<div class="' + (x.dup ? "dupl" : "bad") + '">صف ' + x.n + ': ' + esc(x.why) + '</div>'; }).join("") + (S.report.length > 15 ? '<div class="bad">… و' + fmt(S.report.length - 15) + ' ثانية</div>' : "") + '<button type="button" class="btn-ghost sm" id="impRep">⬇️ تقرير الأخطاء والمكرر (CSV)</button></div>' : "")
        + (blocked ? '<div class="err">وضع «كل الملف أو لا شي»: صحّح الأخطاء والمكرر أول، أو غيّر الوضع.</div>' : "");
      if($("impRep")) $("impRep").addEventListener("click", function(){ C.downloadCsv("تقرير-استيراد-" + S.game + ".csv", [["الصف", "النوع", "السبب"]].concat(S.report.map(function(x){ return [x.n, x.dup ? "مكرر" : "خطأ", x.why]; }))); });
      $("impGo").disabled = !s.ok || blocked; $("impGo").textContent = s.ok ? "استيراد " + fmt(s.ok) + " صف" : "ما فيه شي يتضاف"; $("impGo").onclick = doImport;
    }
    function doImport(){
      var batch = uuid(), good = S.good, pos = 0, ins = 0, dup = 0, bad = 0; S.busy = true; $("impGo").disabled = true; $("impClose").disabled = true; setErr("");
      function prog(){ $("impPrev").innerHTML = '<div class="imp-bar"><i style="width:' + Math.round(100 * Math.min(pos, good.length) / Math.max(1, good.length)) + '%"></i></div><div class="hint">جاري الاستيراد… ' + fmt(Math.min(pos, good.length)) + ' / ' + fmt(good.length) + ' — لا تغلق الصفحة</div>'; }
      function step(){
        if(pos >= good.length) return Promise.resolve();
        var part = good.slice(pos, pos + SEND); pos += SEND; prog();
        return C.SB.rpc("admin_import_batch", { p_game:S.game, p_mode:S.mode, p_rows:part.map(function(x){ return x.row; }), p_batch:batch, p_file:S.fname || null, p_final:pos >= good.length }).then(function(r){
          if(r.error) throw r.error; var d = C.rpcData(r) || {}; ins += d.inserted | 0; dup += d.dup | 0; bad += d.bad | 0;
          if(S.mode === "stop" && !d.wrote) throw new Error("توقّف الاستيراد: فيه خطأ أو مكرر بالدفعة — ما انضاف منها شي");
          return step();
        });
      }
      prog();
      step().then(function(){
        S.busy = false; $("impClose").disabled = false;
        $("impPrev").innerHTML = '<div class="imp-sum"><div class="ok"><b>' + fmt(ins) + '</b><small>انضافت</small></div><div class="dup"><b>' + fmt(dup) + '</b><small>مكرر (تجاهلناها)</small></div><div class="bad"><b>' + fmt(bad) + '</b><small>خطأ (تجاهلناها)</small></div></div><div class="hint">تقدر تتراجع عن هالدفعة من «سجل الدفعات». رقم الدفعة: ' + esc(batch.slice(0, 8)) + '</div>';
        $("impGo").textContent = "تم ✅"; $("impGo").onclick = close; $("impGo").disabled = false; C.toast("📥 انضافت " + fmt(ins) + " صف");
        if(C.reload) C.reload(S.game);
      }).catch(function(e){
        var fin = function(extra){
          S.busy = false; $("impClose").disabled = false; $("impGo").disabled = false; $("impGo").textContent = "إعادة التحليل"; $("impGo").onclick = analyze;
          setErr(C.errText(e) + extra); if(ins && C.reload) C.reload(S.game);
        };
        if(S.mode === "stop" && ins){
          /* «كل الملف أو لا شي»: نلغي اللي انضاف تلقائيًا */
          C.SB.rpc("admin_import_rollback", { p_batch:batch, p_reason:"إلغاء تلقائي: فشل الاستيراد بنص الطريق" }).then(function(r){ if(r.error) throw r.error; ins = 0; fin(" — وتراجعنا تلقائيًا عن اللي انضاف (ما انضاف شي)"); })
            .catch(function(){ fin(" — انضاف قبلها " + fmt(ins) + " صف: تراجع عنها من «سجل الدفعات»"); });
        } else fin(ins ? " — انضاف قبلها " + fmt(ins) + " صف (تقدر تتراجع من سجل الدفعات)" : "");
      });
    }
    ready();
  }

  /* ---------- سجل الدفعات + التراجع ---------- */
  var ST = { running:"ناقصة", done:"مكتملة", rolled_back:"متراجع عنها" };
  function historyView(){
    shell("🧾 سجل دفعات الاستيراد", '<div class="hint">جاري التحميل…</div><div class="m-btns"><button class="btn-ghost" id="impBack" type="button">رجوع</button></div>');
    document.getElementById("impBack").addEventListener("click", function(){ mainView((S && S.game) || "trivia"); });
    C.SB.from("import_batches").select("id,game,file_name,rows_total,rows_ok,rows_dup,rows_bad,status,rows_removed,created_at").order("created_at", { ascending:false }).limit(30).then(function(r){
      if(r.error) throw r.error; var rows = r.data || [];
      shell("🧾 سجل دفعات الاستيراد", (rows.length ? '<div class="imp-hist">' + rows.map(function(b){
        return '<div class="imp-h" data-id="' + esc(b.id) + '"><div class="t"><b>' + esc((GAMES[b.game] || {}).ar || b.game) + '</b> <span class="st st-' + esc(b.status) + '">' + esc(ST[b.status] || b.status) + '</span><small>' + esc(new Date(b.created_at).toLocaleString("ar-EG-u-nu-latn", { timeZone:"Asia/Riyadh", dateStyle:"medium", timeStyle:"short" })) + (b.file_name ? " · " + esc(b.file_name) : "") + '</small></div>'
          + '<div class="n">' + fmt(b.rows_ok) + ' انضافت · ' + fmt(b.rows_dup) + ' مكرر · ' + fmt(b.rows_bad) + ' خطأ' + (b.status === "rolled_back" ? ' · انحذف ' + fmt(b.rows_removed) : "") + '</div>'
          + (b.status !== "rolled_back" ? '<button type="button" class="btn-ghost sm" data-rb="' + esc(b.id) + '">↩️ تراجع</button>' : "") + '</div>';
      }).join("") + '</div>' : '<div class="empty">ما فيه دفعات بعد</div>') + '<div class="err" id="impErr" hidden></div><div class="m-btns"><button class="btn-ghost" id="impBack" type="button">رجوع</button></div>');
      document.getElementById("impBack").addEventListener("click", function(){ mainView((S && S.game) || "trivia"); });
      document.getElementById("impBody").addEventListener("click", function(e){
        var b = e.target.closest("[data-rb]"); if(!b) return; var id = b.getAttribute("data-rb"), row = b.closest(".imp-h");
        if(row.querySelector(".imp-why")) return;
        var f = document.createElement("div"); f.className = "imp-why"; f.innerHTML = '<input class="input" maxlength="200" placeholder="سبب التراجع (إلزامي)"><button class="btn-primary sm" type="button">تأكيد التراجع</button><small>يحذف فقط الصفوف اللي ما أحد عدّلها بعد الاستيراد.</small>'; row.appendChild(f);
        var inp = f.querySelector("input"); inp.focus();
        f.querySelector("button").addEventListener("click", function(){
          var why = inp.value.trim(); if(why.length < 3){ inp.focus(); return; } this.disabled = true;
          C.SB.rpc("admin_import_rollback", { p_batch:id, p_reason:why }).then(function(r){ if(r.error) throw r.error; var d = C.rpcData(r) || {}; C.toast("↩️ انحذف " + fmt(d.removed) + " صف" + (d.kept ? " (وبقى " + fmt(d.kept) + " لأنها اتعدّلت)" : "")); if(C.reload) C.reload(); historyView(); })
            .catch(function(er){ var e2 = document.getElementById("impErr"); e2.hidden = false; e2.textContent = "⚠️ " + C.errText(er); f.querySelector("button").disabled = false; });
        });
      });
    }).catch(function(e){ shell("🧾 سجل دفعات الاستيراد", '<div class="err">⚠️ ' + esc(/does not exist|schema cache/i.test(String(e && e.message)) ? "ملف SQL رقم 16 ما اتشغّل بعد." : C.errText(e)) + '</div><div class="m-btns"><button class="btn-ghost" id="impBack" type="button">رجوع</button></div>'); document.getElementById("impBack").addEventListener("click", function(){ mainView("trivia"); }); });
  }

  root.AdmImport = {
    open:function(ctx, game){ C = ctx || C; mainView(GAMES[game] ? game : "trivia"); },
    safeCell:safeCell,
    _t:{ decodeBytes:decodeBytes, parseDelimited:parseDelimited, parseText:parseText, safeCell:safeCell, unsafeCell:unsafeCell, normKey:normKey, hdrKey:hdrKey, GAMES:GAMES, toServer:toServer }
  };
})(typeof window !== "undefined" ? window : globalThis);
