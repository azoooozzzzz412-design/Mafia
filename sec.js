/* (v26) «أسرع إصبع» المحمي: أدوات التوقيع والتحقق (WebCrypto بالمتصفح نفسه، بدون مكتبات)
   - الشاشة توقّع رسائلها بمفتاحها (ECDSA P-256)، والجوالات تتحقق بالمفتاح العام اللي أعطتهم إياه قاعدة البيانات.
   - كل جوال يوقّع رسائله بمفتاحه، ومعها «شهادة» من قاعدة البيانات (HMAC بسر الغرفة) تربط الجهاز بفريقه.
   - تذكرة جولة الضغط وإيصال الفوز: HMAC بسر الغرفة (تعرفه الشاشة وقاعدة البيانات بس). */
(function(){
  "use strict";
  var C = window.crypto && window.crypto.subtle, enc = new TextEncoder();
  var S = window.SahraSec = { ok: !!(C && window.TextEncoder) };
  function hex(buf){ var b = new Uint8Array(buf), s = ""; for(var i = 0; i < b.length; i++) s += (b[i] < 16 ? "0" : "") + b[i].toString(16); return s; }
  function b64u(buf){ var b = new Uint8Array(buf), s = ""; for(var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64u(s){ s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while(s.length % 4) s += "="; var bin = atob(s), b = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
  var ALG = { name: "ECDSA", namedCurve: "P-256" }, SIG = { name: "ECDSA", hash: "SHA-256" };

  S.randHex = function(n){ var a = new Uint8Array(n); window.crypto.getRandomValues(a); return hex(a); };
  S.sha256Hex = function(str){ return C.digest("SHA-256", enc.encode(String(str))).then(hex); };

  var hk = {};
  function hmacKey(secret){ return hk[secret] || (hk[secret] = C.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])); }
  S.hmacHex = function(secret, msg){ return hmacKey(secret).then(function(k){ return C.sign("HMAC", k, enc.encode(String(msg))); }).then(hex); };
  /* HMAC صحيح؟ (المقارنة على كامل الطول) */
  S.hmacOk = function(secret, msg, mac){
    if(typeof mac !== "string" || !/^[0-9a-f]{64}$/.test(mac)) return Promise.resolve(false);
    return S.hmacHex(secret, msg).then(function(h){ var d = 0; for(var i = 0; i < 64; i++) d |= h.charCodeAt(i) ^ mac.charCodeAt(i); return d === 0; }, function(){ return false; });
  };

  S.genKeys = function(){ return C.generateKey(ALG, true, ["sign", "verify"]); };
  S.exportPub = function(pub){ return C.exportKey("raw", pub).then(b64u); };
  S.exportPriv = function(priv){ return C.exportKey("jwk", priv); };
  S.importPriv = function(jwk){ return C.importKey("jwk", jwk, ALG, false, ["sign"]); };
  var pk = {};
  S.importPub = function(s){ return pk[s] || (pk[s] = C.importKey("raw", unb64u(s), ALG, false, ["verify"])); };
  S.sign = function(priv, str){ return C.sign(SIG, priv, enc.encode(String(str))).then(b64u); };
  S.verify = function(pubStr, str, sig){
    if(typeof pubStr !== "string" || typeof sig !== "string" || typeof str !== "string") return Promise.resolve(false);
    return S.importPub(pubStr).then(function(k){ return C.verify(SIG, k, unb64u(sig), enc.encode(str)); }).catch(function(){ return false; });
  };

  /* النصوص اللي تنوقّع — لازم تطابق قاعدة البيانات حرف بحرف (sql/08_v26_buzz_secure.sql) */
  S.certStr = function(room, c){ return room + "|" + c.dev + "|" + c.team + "|" + c.role + "|" + c.pk; };
  S.tokStr = function(room, t){ return room + "|" + t.slot + "|" + t.st + "|" + (t.ex || []).join(",") + "|" + (t.on ? t.on.join(",") : "-"); };
  S.winStr = function(room, w){ return room + "|" + w.slot + "|" + w.team + "|" + w.dev + "|" + w.at; };
})();
