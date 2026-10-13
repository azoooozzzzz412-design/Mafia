/* =====================================================================
   /api/turn — خادم صوت احتياطي (TURN) للمافيا أونلاين (Cloudflare Pages Function)
   لما شبكة لاعب تمنع الاتصال المباشر (بعض شبكات الجوال والشركات)، الصوت يمر عن طريق TURN حق Cloudflare.
   - نعطي البيانات المؤقتة (4 ساعات) بس للاعب حقيقي بالغرفة (نتأكد من القاعدة بعملية mafia('check')).
   - الأسرار تنحط بإعدادات Cloudflare Pages ← Settings ← Variables and Secrets (ما تنحط بالكود أبدًا):
       TURN_KEY_ID          رقم مفتاح TURN (Turn Token ID)
       TURN_KEY_API_TOKEN   التوكن السرّي (API Token) — نوعه Secret
   - اختياري: SAHRA_SUPABASE_URL و SAHRA_SUPABASE_ANON_KEY. لو ما انحطت نقراها من config.js بنفس الموقع.
   - لو TURN مو مجهّز: نرجّع STUN بس، والصوت يشتغل مباشر لأغلب الناس.
   ===================================================================== */
const STUN = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];

function json(obj, status){
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

async function supabaseOf(env, request){
  if(env.SAHRA_SUPABASE_URL && env.SAHRA_SUPABASE_ANON_KEY) return { url: env.SAHRA_SUPABASE_URL, key: env.SAHRA_SUPABASE_ANON_KEY };
  try{
    const r = await fetch(new URL('/config.js', request.url).toString());
    if(!r.ok) return null;
    const t = await r.text();
    const u = /SAHRA_SUPABASE_URL\s*=\s*["']([^"']+)["']/.exec(t), k = /SAHRA_SUPABASE_ANON_KEY\s*=\s*["']([^"']+)["']/.exec(t);
    return u && k ? { url: u[1], key: k[1] } : null;
  }catch(e){ return null; }
}

/* المتصفحات تمنع منفذ 53، وبدون «trickle ICE» ننتظره لين ينتهي وقته — فنشيله */
function cleanServers(list){
  return (Array.isArray(list) ? list : [list]).filter(Boolean).map(function(s){
    const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(function(u){ return typeof u === 'string' && !/:53(\?|$)/.test(u); });
    return Object.assign({}, s, { urls: urls });
  }).filter(function(s){ return s.urls.length > 0; });
}

export async function onRequestPost(context){
  const request = context.request, env = context.env || {};
  let body = null;
  try{ body = await request.json(); }catch(e){ return json({ error: 'bad_request' }, 400); }
  const code = String((body && body.code) || '').toUpperCase(), seat = String((body && body.seat) || ''), token = String((body && body.token) || '');
  if(!/^[A-Z2-9]{6}$/.test(code) || !/^[0-9a-f-]{36}$/i.test(seat) || token.length < 16 || token.length > 128) return json({ error: 'bad_request' }, 400);
  if(!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return json({ iceServers: STUN, turn: false });

  const sb = await supabaseOf(env, request);
  if(!sb) return json({ iceServers: STUN, turn: false });
  const chk = await fetch(sb.url.replace(/\/+$/, '') + '/rest/v1/rpc/mafia', {
    method: 'POST',
    headers: { apikey: sb.key, 'content-type': 'application/json' },
    body: JSON.stringify({ p_op: 'check', p: { code: code, seat: seat, token: token } })
  }).catch(function(){ return null; });
  if(!chk || !chk.ok) return json({ error: 'not_player' }, 403);

  const r = await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/' + encodeURIComponent(env.TURN_KEY_ID) + '/credentials/generate-ice-servers', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.TURN_KEY_API_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ ttl: 14400 })
  }).catch(function(){ return null; });
  if(!r || !r.ok) return json({ iceServers: STUN, turn: false });
  const j = await r.json().catch(function(){ return null; });
  const list = cleanServers(j && j.iceServers);
  return json({ iceServers: list.length ? list : STUN, turn: list.some(function(s){ return s.urls.some(function(u){ return /^turns?:/.test(u); }); }) });
}

export function onRequestGet(){ return json({ error: 'use_post' }, 405); }
