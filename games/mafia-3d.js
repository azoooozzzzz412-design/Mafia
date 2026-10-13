/* =====================================================================
   Mafia3D — «المافيا أونلاين» بمنظور أول داخل المجلس (WebGL2، بدون مكتبات)
   - أنت جالس على الطاولة (الكاميرا مكان عيونك)، والباقين حولك شخصيات 3D.
     تلف راسك بالسحب (فارة/إصبع)، والكاميرا تلف لحالها للي يتكلم لو تركتها.
   - الغرفة مبنية من رسمة المجلس نفسها: الجدران والأرض تاخذ ألوانها من الرسمة (بعد معايرة كاميرتها)،
     والزولية وسطح الطاولة مفكوكة منها، والدلة والشموع والفانوس مقصوصة منها.
   - الشخصيات: games/chars/NN.c3d + NN.webp (شبكة وعظام للنص الفوقي، والجلسة مطبوخة بالملف).
     هنا نحرّكها: تتنفس، تتمايل، تطالع اللي يتكلم، تومي بيدها وقت الكلام، تنام بالليل، وتصير شبح لو طلعت.
   ===================================================================== */
(function(root){
"use strict";

/* ---------------------------- رياضيات ---------------------------- */
function m4(){ var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
function mul(a, b, o){
  o = o || new Float32Array(16);
  for(var c = 0; c < 4; c++){
    var b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    o[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return o;
}
function persp(fovy, aspect, n, f){
  var t = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
  m[0] = t / aspect; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f);
  return m;
}
function viewFrom(eye, fw){
  var up = [0, 1, 0];
  var r = norm3([fw[1] * up[2] - fw[2] * up[1], fw[2] * up[0] - fw[0] * up[2], fw[0] * up[1] - fw[1] * up[0]]);
  var u = [r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]];
  var m = m4();
  m[0] = r[0]; m[4] = r[1]; m[8] = r[2];
  m[1] = u[0]; m[5] = u[1]; m[9] = u[2];
  m[2] = -fw[0]; m[6] = -fw[1]; m[10] = -fw[2];
  m[12] = -(r[0] * eye[0] + r[1] * eye[1] + r[2] * eye[2]);
  m[13] = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
  m[14] = (fw[0] * eye[0] + fw[1] * eye[1] + fw[2] * eye[2]);
  return { m: m, r: r, u: u };
}
function qmul(a, b){ return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; }
function qaxis(x, y, z, ang){ var s = Math.sin(ang / 2), l = Math.hypot(x, y, z) || 1; return [x / l * s, y / l * s, z / l * s, Math.cos(ang / 2)]; }
function qinv(q){ return [-q[0], -q[1], -q[2], q[3]]; }
function qrot(q, v){
  var x = q[0], y = q[1], z = q[2], w = q[3];
  var ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}
function norm3(v){ var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function qfromto(a, b){
  a = norm3(a); b = norm3(b);
  var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if(d < -0.9999){ var ax = Math.abs(a[0]) < 0.9 ? [0, -a[2], a[1]] : [a[2], 0, -a[0]]; ax = norm3(ax); return [ax[0], ax[1], ax[2], 0]; }
  var c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], s = Math.sqrt((1 + d) * 2);
  return [c[0] / s, c[1] / s, c[2] / s, s / 2];
}
function pivotMat(q, j){
  var x = q[0], y = q[1], z = q[2], w = q[3], m = new Float32Array(16);
  m[0] = 1 - 2 * (y * y + z * z); m[1] = 2 * (x * y + z * w); m[2] = 2 * (x * z - y * w);
  m[4] = 2 * (x * y - z * w); m[5] = 1 - 2 * (x * x + z * z); m[6] = 2 * (y * z + x * w);
  m[8] = 2 * (x * z + y * w); m[9] = 2 * (y * z - x * w); m[10] = 1 - 2 * (x * x + y * y);
  m[12] = j[0] - (m[0] * j[0] + m[4] * j[1] + m[8] * j[2]);
  m[13] = j[1] - (m[1] * j[0] + m[5] * j[1] + m[9] * j[2]);
  m[14] = j[2] - (m[2] * j[0] + m[6] * j[1] + m[10] * j[2]);
  m[15] = 1;
  return m;
}
function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
function damp(cur, to, k, dt){ return cur + (to - cur) * (1 - Math.exp(-k * dt)); }
function smooth(t){ t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function wrapPi(a){ while(a > Math.PI) a -= 2 * Math.PI; while(a < -Math.PI) a += 2 * Math.PI; return a; }

/* ---------------------------- الشيدرات ---------------------------- */
var HDR = "#version 300 es\nprecision highp float;\n";
var VS_CHAR = HDR + [
  "in vec3 aPos; in vec4 aNor; in vec4 aSn; in vec2 aUv; in vec4 aJ; in vec4 aW;",
  "uniform mat4 uProj, uView, uModel; uniform mat4 uB[11];",
  "uniform vec3 uQh, uQc; uniform float uOut, uFocal;",
  "out vec3 vN; out vec3 vW; out vec2 vUv; out float vBl; out float vSd;",
  "void main(){",
  "  vec3 p = aPos * uQh + uQc;",
  "  mat4 sk = uB[int(aJ.x + 0.5)] * aW.x + uB[int(aJ.y + 0.5)] * aW.y + uB[int(aJ.z + 0.5)] * aW.z + uB[int(aJ.w + 0.5)] * aW.w;",
  "  mat4 M = uModel * sk;",
  "  vec4 wp = M * vec4(p, 1.0);",
  "  vN = normalize(mat3(M) * aNor.xyz); vBl = aNor.w; vSd = aSn.w;",
  "  if(uOut > 0.0){ vec3 sn = normalize(mat3(M) * aSn.xyz); vec4 vp = uView * wp; wp.xyz += sn * (uOut * -vp.z / uFocal); }",
  "  vW = wp.xyz; vUv = aUv;",
  "  gl_Position = uProj * uView * wp;",
  "}"].join("\n");
var FS_CHAR = HDR + [
  "in vec3 vN; in vec3 vW; in vec2 vUv; in float vBl; in float vSd;",
  "uniform sampler2D uTex;",
  "uniform vec3 uCam, uLampPos, uLampCol, uCanPos, uCanCol, uMoonDir, uMoonCol, uAmb, uRimCol;",
  "uniform float uRimK, uDim, uGhost, uOutPass, uSat, uAlpha;",
  "uniform vec4 uMouth, uEyeL, uEyeR; uniform float uMouthK, uLid, uBlend, uSideOn; uniform vec3 uSkin, uSide;",
  "out vec4 o;",
  /* الوجه: الفم ينفتح مع الصوت، والجفون ترمش وتتسكّر وقت النوم (مناطق من الرسمة نفسها) */
  "vec3 face(vec3 b){",
  "  if(uMouthK > 0.01 && uMouth.z > uMouth.x){",
  "    vec2 c = 0.5 * (uMouth.xy + uMouth.zw), r = 0.5 * (uMouth.zw - uMouth.xy);",
  "    vec2 d = (vUv - c) / r;",
  "    float k = uMouthK, rx = 0.55 + 0.3 * k, ry = 0.12 + 0.88 * k;",
  "    float e = d.x * d.x / (rx * rx) + d.y * d.y / (ry * ry);",
  "    if(e < 1.3){",
  "      vec3 inner = mix(vec3(0.3, 0.07, 0.06), vec3(0.62, 0.22, 0.2), smoothstep(-0.2, 0.9, d.y / ry));",
  "      inner = mix(inner, vec3(0.95, 0.92, 0.88), (1.0 - smoothstep(-0.66, -0.46, d.y / ry)) * smoothstep(0.3, 0.55, k));",
  "      b = mix(b, inner, 1.0 - smoothstep(0.8, 1.0, e));",
  "      b = mix(b, vec3(0.16, 0.06, 0.05), (smoothstep(0.76, 0.94, e) - smoothstep(1.0, 1.25, e)) * 0.85);",
  "    }",
  "  }",
  "  if(uLid > 0.01){",
  "    for(int i = 0; i < 2; i++){",
  "      vec4 R = i == 0 ? uEyeL : uEyeR;",
  "      if(R.z <= R.x) continue;",
  "      vec2 c = 0.5 * (R.xy + R.zw), r = 0.5 * (R.zw - R.xy);",
  "      vec2 d = (vUv - c) / r;",
  "      float e = dot(d, d);",
  "      if(e < 1.0){",
  "        float yl = mix(-1.05, 0.12, uLid) + 0.22 * uLid * (1.0 - d.x * d.x);",
  "        float cov = max(1.0 - smoothstep(yl - 0.05, yl + 0.05, d.y), smoothstep(0.85, 1.0, uLid));",
  "        cov *= 1.0 - smoothstep(0.82, 1.0, e);",
  "        b = mix(b, uSkin, cov);",
  "        float lash = (1.0 - smoothstep(0.04, 0.13, abs(d.y - yl))) * smoothstep(0.3, 0.6, uLid) * (1.0 - smoothstep(0.7, 1.0, e));",
  "        b = mix(b, vec3(0.13, 0.06, 0.05), lash);",
  "      }",
  "    }",
  "  }",
  "  return b;",
  "}",
  "void main(){",
  /* الرسمة من قدّام (والوجه يتحرك فيها) ممزوجة بنعومة مع اللوحة الخلفية حسب وزن كل رأس */
  "  vec3 base = texture(uTex, vUv).rgb;",
  "  if(uOutPass < 0.5) base = face(base);",
  "  if(uBlend > 0.5){ vec3 bk = texture(uTex, vUv + vec2(0.5, 0.0)).rgb; bk = mix(bk, uSide, clamp(vSd, 0.0, 1.0) * uSideOn); base = mix(bk, base, clamp(vBl, 0.0, 1.0)); }",
  "  if(uOutPass > 0.5){ vec3 oc = base * 0.24 + vec3(0.03, 0.02, 0.016); oc = mix(oc, uRimCol, clamp(uRimK * 0.55, 0.0, 0.8)); o = vec4(oc * uDim * uAlpha, uAlpha); return; }",
  "  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;",
  "  vec3 V = normalize(uCam - vW);",
  "  vec3 L1 = uLampPos - vW; float d1 = length(L1); L1 /= d1;",
  "  float b1 = smoothstep(0.18, 0.86, dot(N, L1) * 0.5 + 0.5);",
  "  vec3 lit = uLampCol * (0.56 + 0.44 * b1) / (1.0 + 0.15 * d1 * d1);",
  "  vec3 L2 = uCanPos - vW; float d2 = length(L2); L2 /= d2;",
  "  float b2 = smoothstep(0.3, 0.9, dot(N, L2) * 0.5 + 0.5);",
  "  lit += uCanCol * (0.3 + 0.7 * b2) / (1.0 + 2.0 * d2 * d2);",
  "  float b3 = smoothstep(0.4, 0.9, dot(N, uMoonDir) * 0.5 + 0.5);",
  "  lit += uMoonCol * b3 * 0.75 + uAmb * 1.3;",
  "  float ll = dot(lit, vec3(0.299, 0.587, 0.114));",
  "  lit = mix(vec3(ll), lit, 0.62);",
  "  vec3 col = base * lit * 1.04;",
  "  col *= mix(vec3(0.9, 0.92, 1.02), vec3(1.0), b1);",
  "  col *= mix(0.8, 1.0, smoothstep(0.12, 0.62, vW.y));",
  "  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.8);",
  "  col += uRimCol * fr * uRimK + uMoonCol * fr * b3 * 0.45;",
  "  col = col / (1.0 + 0.24 * col);",
  "  float g = dot(col, vec3(0.299, 0.587, 0.114));",
  "  col = mix(vec3(g), col, uSat) * uDim;",
  "  if(uGhost > 0.001){",
  "    vec3 gc = vec3(0.6, 0.78, 1.0) * (0.3 + 1.1 * g) + vec3(0.55, 0.75, 1.0) * fr * 0.9;",
  "    col = mix(col, gc, uGhost);",
  "    float a = mix(1.0, 0.3 + 0.55 * fr, uGhost) * uAlpha;",
  "    o = vec4(col * a, a); return;",
  "  }",
  "  o = vec4(col * uAlpha, uAlpha);",
  "}"].join("\n");
/* الجدران والأرض والسقف: لون الرسمة (بإسقاط كاميرتها) أو لون احتياطي مضاء بالفانوس */
var VS_ENV = HDR + "in vec3 aPos; in float aKind; uniform mat4 uProj, uView; out vec3 vW; flat out int vK; void main(){ vW = aPos; vK = int(aKind + 0.5); gl_Position = uProj * uView * vec4(aPos, 1.0); }";
var FS_ENV = HDR + [
  "in vec3 vW; flat in int vK;",
  "uniform mat4 uPaint; uniform sampler2D uDay, uNight; uniform float uNightK, uBright; uniform vec3 uLamp, uTint;",
  "out vec4 o;",
  "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
  "void main(){",
  "  vec4 pc = uPaint * vec4(vW, 1.0);",
  "  vec2 uv = pc.xy / pc.w;",
  "  float ins = (pc.w > 0.0 && uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) ? 1.0 : 0.0;",
  "  vec4 d = texture(uDay, uv); vec3 nn = texture(uNight, uv).rgb;",
  "  float a = ins * d.a;",
  "  vec3 paint = mix(d.rgb, nn, uNightK);",
  "  float dl = length(vW - uLamp);",
  "  float L = 0.18 + 1.05 / (1.0 + 0.22 * dl * dl);",
  "  vec3 fb;",
  "  if(vK == 0){",                                  // جدار: لياسة دافية + شريط خشب تحت
  "    float n = hash(floor(vW.xz * 7.0 + vW.y * 9.0)) * 0.05;",
  "    fb = vW.y < 0.85 ? vec3(0.12, 0.08, 0.055) : vec3(0.15, 0.105, 0.075) + n * 0.6;",
  "    fb *= 1.0 - smoothstep(1.4, 3.3, vW.y) * 0.75;",
  "  } else if(vK == 1){",                           // أرض: بلاط حجر
  "    vec2 g = abs(fract(vW.xz / 0.62) - 0.5);",
  "    float line = smoothstep(0.47, 0.5, max(g.x, g.y));",
  "    fb = vec3(0.24, 0.2, 0.17) * (0.92 + 0.12 * hash(floor(vW.xz / 0.62))) * (1.0 - 0.35 * line);",
  "  } else {",                                      // سقف: خشب غامق بجسور
  "    float beam = smoothstep(0.42, 0.5, abs(fract(vW.x / 0.9) - 0.5));",
  "    fb = mix(vec3(0.035, 0.024, 0.018), vec3(0.018, 0.012, 0.01), beam);",
  "  }",
  "  fb *= L * mix(vec3(1.0), vec3(0.42, 0.48, 0.78), uNightK);",
  "  vec3 col = mix(fb, paint, a) * uBright * uTint;",
  "  o = vec4(col, 1.0);",
  "}"].join("\n");
/* أسطح بخامة (زولية، طاولة، حافتها) */
var VS_TEX = HDR + "in vec3 aPos; in vec2 aUv; uniform mat4 uProj, uView; out vec2 vUv; out vec3 vW; void main(){ vUv = aUv; vW = aPos; gl_Position = uProj * uView * vec4(aPos, 1.0); }";
var FS_TEX = HDR + [
  "in vec2 vUv; in vec3 vW; uniform sampler2D uTex; uniform vec3 uTint; uniform float uNightK, uShade; uniform vec3 uLamp;",
  "out vec4 o;",
  "void main(){",
  "  vec4 c = texture(uTex, vUv); if(c.a < 0.02) discard;",
  "  vec3 col = c.rgb;",
  "  float dl = length(vW - uLamp);",
  "  col *= mix(1.0, 0.5 + 0.9 / (1.0 + 0.3 * dl * dl), uShade);",
  "  vec3 nightC = col * vec3(0.34, 0.4, 0.66) + col * smoothstep(0.42, 0.9, dot(col, vec3(0.3, 0.59, 0.11))) * vec3(0.85, 0.7, 0.45);",
  "  col = mix(col, nightC, uNightK) * uTint;",
  "  o = vec4(col * c.a, c.a);",
  "}"].join("\n");
/* الأشياء المقصوصة (الدلة، الشموع، الفانوس) — تواجه الكاميرا */
var VS_SPR = HDR + "in vec3 aPos; in vec2 aUv; uniform mat4 uProj, uView; out vec2 vUv; void main(){ vUv = aUv; gl_Position = uProj * uView * vec4(aPos, 1.0); }";
var FS_SPR = HDR + [
  "in vec2 vUv; uniform sampler2D uTex; uniform vec3 uTint; uniform float uNightK, uCut;",
  "out vec4 o;",
  "void main(){",
  "  vec4 c = texture(uTex, vUv); if(c.a < uCut) discard;",
  "  vec3 col = c.rgb;",
  "  float lum = dot(col, vec3(0.3, 0.59, 0.11));",
  "  vec3 nightC = col * vec3(0.4, 0.44, 0.66) + col * smoothstep(0.45, 0.85, lum) * vec3(0.8, 0.66, 0.42);",
  "  col = mix(col, nightC, uNightK) * uTint;",
  "  o = vec4(col * c.a, c.a);",
  "}"].join("\n");
/* توهج (يضاف): دواير ناعمة تواجه الكاميرا */
var VS_GLOW = HDR + "in vec2 aQ; uniform mat4 uProj, uView; uniform vec3 uPos, uR, uU; uniform float uSize; out vec2 vQ; void main(){ vQ = aQ; vec3 p = uPos + (uR * aQ.x + uU * aQ.y) * uSize; gl_Position = uProj * uView * vec4(p, 1.0); }";
var FS_GLOW = HDR + "in vec2 vQ; uniform vec3 uCol; uniform float uK; out vec4 o; void main(){ float r = dot(vQ, vQ); if(r > 1.0) discard; float g = (exp(-r * 4.5) * 0.85 + exp(-r * 32.0) * 0.6) * (1.0 - r); o = vec4(uCol * g * uK, 0.0); }";
/* غبار يلمع بالضو */
var VS_DUST = HDR + [
  "in vec4 aSeed; uniform mat4 uProj, uView; uniform float uTime, uPx; out float vA;",
  "void main(){",
  "  float t = uTime * (0.03 + aSeed.w * 0.04) + aSeed.w * 10.0;",
  "  vec3 p = vec3(aSeed.x * 1.6, mod(aSeed.y * 2.2 + t * 0.35, 2.2) + 0.25, aSeed.z * 1.6);",
  "  p.x += sin(t * 1.7 + aSeed.y * 6.0) * 0.12; p.z += cos(t * 1.3 + aSeed.x * 5.0) * 0.12;",
  "  vec4 vp = uView * vec4(p, 1.0);",
  "  vA = smoothstep(0.25, 0.6, p.y) * (1.0 - smoothstep(1.9, 2.4, p.y)) * (0.4 + 0.6 * fract(aSeed.w * 7.3));",
  "  gl_Position = uProj * vp; gl_PointSize = max(1.0, uPx * (0.9 + aSeed.w) / -vp.z);",
  "}"].join("\n");
var FS_DUST = HDR + "in float vA; uniform vec3 uCol; out vec4 o; void main(){ vec2 q = gl_PointCoord - 0.5; float d = 1.0 - smoothstep(0.1, 0.5, length(q)); o = vec4(uCol * d * vA, 0.0); }";
/* الظل والدواير تحت اللاعبين */
var VS_D = HDR + "in vec2 aQ; uniform mat4 uProj, uView; uniform vec4 uC; out vec2 vQ; void main(){ vQ = aQ; gl_Position = uProj * uView * vec4(uC.x + aQ.x * uC.w, uC.y, uC.z + aQ.y * uC.w, 1.0); }";
var FS_D = HDR + [
  "in vec2 vQ; uniform vec4 uRing; uniform float uShadow, uTime, uDash; out vec4 o;",
  "void main(){",
  "  float r = length(vQ); if(r > 1.0) discard;",
  "  float sh = uShadow * (1.0 - smoothstep(0.05, 0.62, r * r * 1.15));",
  "  float ring = exp(-pow((r - 0.8) / 0.045, 2.0)) + exp(-pow((r - 0.8) / 0.17, 2.0)) * 0.45;",
  "  float ang = atan(vQ.y, vQ.x);",
  "  float dash = uDash > 0.5 ? 0.35 + 0.65 * step(0.0, sin(ang * 12.0 + uTime * 1.6)) : 1.0;",
  "  float ra = uRing.a * ring * dash;",
  "  o = vec4(uRing.rgb * ra, sh + ra * 0.25);",
  "}"].join("\n");

/* ---------------------------- أدوات GL ---------------------------- */
function compile(gl, vs, fs){
  function sh(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader"); return s; }
  var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
  var U = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for(var i = 0; i < n; i++){ var a = gl.getActiveUniform(p, i), nm = a.name.replace(/\[0\]$/, ""); U[nm] = gl.getUniformLocation(p, nm); }
  var A = {}, na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
  for(var k = 0; k < na; k++){ var b = gl.getActiveAttrib(p, k); A[b.name] = gl.getAttribLocation(p, b.name); }
  return { p: p, U: U, A: A };
}
function texFrom(gl, img, opt){
  opt = opt || {};
  var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  var wrap = opt.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opt.repeatT ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  var ext = gl.getExtension("EXT_texture_filter_anisotropic"); if(ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  return t;
}
function loadImg(src){ return new Promise(function(res, rej){ var im = new Image(); im.decoding = "async"; im.onload = function(){ res(im); }; im.onerror = function(){ rej(new Error("img " + src)); }; im.src = src; }); }
function vao(gl, prog, arrays, idx){
  var v = gl.createVertexArray(); gl.bindVertexArray(v);
  Object.keys(arrays).forEach(function(name){
    var loc = prog.A[name]; if(loc == null || loc < 0) return;
    var a = arrays[name], b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a.data, a.dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, a.size, gl.FLOAT, false, 0, 0);
    if(a.dyn) a.buf = b;
  });
  if(idx){ var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW); }
  gl.bindVertexArray(null);
  return v;
}

/* ---------------------------- الشخصيات (ملف c3d) ---------------------------- */
function parseC3D(buf){
  var dv = new DataView(buf);
  if(dv.getUint32(0, true) !== 0x31443343) throw new Error("bad c3d");
  var ml = dv.getUint32(4, true), meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, ml)));
  var nv = meta.nv, ni = meta.ni, o = 8 + ml;
  var pos = new Int16Array(buf, o, nv * 3); o += nv * 6;
  var nor = new Int8Array(buf, o, nv * 4); o += nv * 4;
  var sn = new Int8Array(buf, o, nv * 4); o += nv * 4;
  var uv = new Uint16Array(buf, o, nv * 2); o += nv * 4;
  var jn = new Uint8Array(buf, o, nv * 4); o += nv * 4;
  var wt = new Uint8Array(buf, o, nv * 4); o += nv * 4;
  var ix = meta.i32 ? new Uint32Array(buf, o, ni) : new Uint16Array(buf, o, ni);
  return { meta: meta, pos: pos, nor: nor, sn: sn, uv: uv, jn: jn, wt: wt, ix: ix };
}

var MOODS = {
  lobby: { lamp: [0.95, 0.62, 0.37], can: [0.52, 0.33, 0.16], moon: [0.1, 0.13, 0.28], amb: [0.13, 0.1, 0.085], sat: 1.02, dim: 1, night: 0, bright: 1.0 },
  day:   { lamp: [1.02, 0.7, 0.43], can: [0.52, 0.34, 0.17], moon: [0.08, 0.11, 0.22], amb: [0.16, 0.12, 0.1], sat: 1.04, dim: 1, night: 0, bright: 1.06 },
  vote:  { lamp: [0.98, 0.58, 0.36], can: [0.54, 0.31, 0.15], moon: [0.08, 0.1, 0.2], amb: [0.13, 0.09, 0.08], sat: 1.02, dim: 1, night: 0, bright: 0.96 },
  night: { lamp: [0.45, 0.29, 0.18], can: [0.44, 0.27, 0.13], moon: [0.24, 0.34, 0.7], amb: [0.05, 0.06, 0.11], sat: 0.9, dim: 0.96, night: 1, bright: 0.95 },
  end:   { lamp: [1.02, 0.72, 0.45], can: [0.54, 0.35, 0.18], moon: [0.09, 0.12, 0.24], amb: [0.16, 0.12, 0.1], sat: 1.04, dim: 1, night: 0, bright: 1.04 }
};

function Scene(canvas, opts){
  opts = opts || {};
  var gl = canvas.getContext("webgl2", { alpha: false, antialias: true, depth: true, powerPreference: "high-performance" });
  if(!gl) throw new Error("no webgl2");
  this.gl = gl; this.cv = canvas; this.opts = opts;
  this.base = opts.base || "games/chars/";
  this.roomBase = opts.room || "games/room/";
  this.files = opts.files || {};
  this.ver = opts.ver || "";                       // ?v=… عشان المتصفح ما يعلق على نسخة قديمة بعد التحديث
  this.assets = {}; this.chars = {}; this.order = [];
  this.vw = 800; this.vh = 600; this.dpr = 1;
  this.phase = "lobby"; this.t0 = performance.now(); this.last = 0;
  this.cam = { yaw: 0, pitch: -0.2, ty: 0, tp: -0.2, dragAt: -99, focus: null, focusT: 0, bob: 0 };
  this.layoutN = 0; this.Rs = 1.0; this.Rt = 0.72;
  this.pChar = compile(gl, VS_CHAR, FS_CHAR);
  this.pEnv = compile(gl, VS_ENV, FS_ENV);
  this.pTex = compile(gl, VS_TEX, FS_TEX);
  this.pSpr = compile(gl, VS_SPR, FS_SPR);
  this.pGlow = compile(gl, VS_GLOW, FS_GLOW);
  this.pDust = compile(gl, VS_DUST, FS_DUST);
  this.pDec = compile(gl, VS_D, FS_D);
  this.quad = vao(gl, this.pDec, { aQ: { data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), size: 2 } });
  this.gquad = vao(gl, this.pGlow, { aQ: { data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), size: 2 } });
  var seeds = new Float32Array(70 * 4);
  for(var i = 0; i < 70; i++){ seeds[i * 4] = Math.random() * 2 - 1; seeds[i * 4 + 1] = Math.random(); seeds[i * 4 + 2] = Math.random() * 2 - 1; seeds[i * 4 + 3] = Math.random(); }
  this.dust = vao(gl, this.pDust, { aSeed: { data: seeds, size: 4 } }); this.dustN = 70;
  this.lost = false; this.roomReady = false;
  var self = this;
  canvas.addEventListener("webglcontextlost", function(e){ e.preventDefault(); self.lost = true; if(opts.onLost && !self.destroyed) opts.onLost(); });
  this.ready = this.loadRoom();
}

/* ---------------------------- الغرفة ---------------------------- */
Scene.prototype.loadRoom = function(){
  var self = this, B = this.roomBase;
  return fetch(B + "room.json" + self.ver).then(function(r){ if(!r.ok) throw new Error("room " + r.status); return r.json(); }).then(function(R){
    self.R = R;
    return Promise.all(["env-day.webp", "env-night.webp", "carpet.webp", "table.webp", "apron.webp", "sprites.webp"].map(function(f){ return loadImg(B + f + self.ver); }));
  }).then(function(im){
    var gl = self.gl;
    self.tx = { day: texFrom(gl, im[0]), night: texFrom(gl, im[1]), carpet: texFrom(gl, im[2]), table: texFrom(gl, im[3]), apron: texFrom(gl, im[4], { repeat: true }), spr: texFrom(gl, im[5]) };
    self.buildRoom();
    self.roomReady = true;
  });
};
Scene.prototype.buildRoom = function(){
  var gl = this.gl, R = this.R, P = R.paint;
  // مصفوفة كاميرا الرسمة: نقطة العالم → (u, v) بالخامة
  var fw = P.fw, rt = P.rt, up = P.up, c = P.cam, m = new Float32Array(16);
  var V = new Float32Array([rt[0], up[0], -fw[0], 0, rt[1], up[1], -fw[1], 0, rt[2], up[2], -fw[2], 0,
    -(rt[0] * c[0] + rt[1] * c[1] + rt[2] * c[2]), -(up[0] * c[0] + up[1] * c[1] + up[2] * c[2]), (fw[0] * c[0] + fw[1] * c[1] + fw[2] * c[2]), 1]);
  var A = new Float32Array(16);
  A[0] = P.f / P.W; A[8] = -0.5; A[5] = -P.f / P.H; A[9] = -0.5; A[11] = -1;
  this.paintM = mul(A, V, m);
  // الجدران (+ جدار ورا ظهري) والأرض والسقف
  var pos = [], kind = [], idx = [], H = R.wallH;
  function quad(a, b, c2, d, k){ var i0 = pos.length / 3; pos.push.apply(pos, a.concat(b, c2, d)); kind.push(k, k, k, k); idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3); }
  var W = R.walls.slice(); W.push([W[0][0], W[0][1]]);
  var last = W[W.length - 2], first = W[0];
  var loop = R.walls.concat([[last[0], 4.2], [first[0], 4.2], [first[0], first[1]]]);
  for(var i = 0; i < loop.length - 1; i++){
    var p0 = loop[i], p1 = loop[i + 1];
    var segs = Math.max(1, Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 0.5));
    for(var s = 0; s < segs; s++){
      var a0 = s / segs, a1 = (s + 1) / segs;
      var x0 = p0[0] + (p1[0] - p0[0]) * a0, z0 = p0[1] + (p1[1] - p0[1]) * a0, x1 = p0[0] + (p1[0] - p0[0]) * a1, z1 = p0[1] + (p1[1] - p0[1]) * a1;
      for(var hy = 0; hy < 6; hy++){
        var y0 = H * hy / 6, y1 = H * (hy + 1) / 6;
        quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], 0);
      }
    }
  }
  var G = 12;
  for(var gx = 0; gx < G; gx++) for(var gz = 0; gz < G; gz++){
    var xa = -6 + 12 * gx / G, xb = -6 + 12 * (gx + 1) / G, za = -6 + 12 * gz / G, zb = -6 + 12 * (gz + 1) / G;
    quad([xa, 0, za], [xa, 0, zb], [xb, 0, zb], [xb, 0, za], 1);
    quad([xa, H, za], [xb, H, za], [xb, H, zb], [xa, H, zb], 2);
  }
  this.env = { vao: vao(gl, this.pEnv, { aPos: { data: new Float32Array(pos), size: 3 }, aKind: { data: new Float32Array(kind), size: 1 } }, new Uint32Array(idx)), n: idx.length };
  // الزولية
  var cp = [], cu = [], ci = [], C = R.carpet, seg = 96;
  cp.push(C.c[0], 0.004, C.c[1]); cu.push(0.5, 0.5);
  for(var k = 0; k <= seg; k++){ var an = k / seg * Math.PI * 2; cp.push(C.c[0] + Math.cos(an) * C.r, 0.004, C.c[1] + Math.sin(an) * C.r); cu.push(0.5 + Math.cos(an) * 0.5, 0.5 + Math.sin(an) * 0.5); if(k < seg) ci.push(0, k + 1, k + 2); }
  this.carpet = { vao: vao(gl, this.pTex, { aPos: { data: new Float32Array(cp), size: 3 }, aUv: { data: new Float32Array(cu), size: 2 } }, new Uint16Array(ci)), n: ci.length };
  this.buildTable();
};
/* الطاولة تكبر وتصغر حسب عدد اللاعبين */
Scene.prototype.buildTable = function(){
  var gl = this.gl, R = this.R, Rt = this.Rt, Ht = R.table.h, seg = 96;
  var tp = [], tu = [], ti = [];
  tp.push(0, Ht, 0); tu.push(0.5, 0.5);
  for(var k = 0; k <= seg; k++){ var an = k / seg * Math.PI * 2; tp.push(Math.cos(an) * Rt, Ht, Math.sin(an) * Rt); tu.push(0.5 + Math.cos(an) * 0.5, 0.5 + Math.sin(an) * 0.5); if(k < seg) ti.push(0, k + 2, k + 1); }
  // الحافة (الشريط المنقوش) + القاعدة الغامقة
  var b = tp.length / 3, reps = Math.max(2, Math.round(Rt * 2 * Math.PI / 1.4));
  for(var j = 0; j <= seg; j++){
    var a2 = j / seg * Math.PI * 2, x = Math.cos(a2) * (Rt + 0.004), z = Math.sin(a2) * (Rt + 0.004);
    tp.push(x, Ht, z, x, Ht - 0.13, z); tu.push(j / seg * reps, 0, j / seg * reps, 1);
  }
  for(var q = 0; q < seg; q++){ var i0 = b + q * 2; ti.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2); }
  var b2 = tp.length / 3;
  for(var j2 = 0; j2 <= seg; j2++){
    var a3 = j2 / seg * Math.PI * 2, rr = Rt * 0.9, x2 = Math.cos(a3) * rr, z2 = Math.sin(a3) * rr;
    tp.push(x2, Ht - 0.13, z2, x2, 0.0, z2); tu.push(-1, -1, -1, -1);
  }
  for(var q2 = 0; q2 < seg; q2++){ var i1 = b2 + q2 * 2; ti.push(i1, i1 + 1, i1 + 2, i1 + 1, i1 + 3, i1 + 2); }
  this.tableN = { top: seg * 3, apron: seg * 6, base: seg * 6 };
  this.table = { vao: vao(gl, this.pTex, { aPos: { data: new Float32Array(tp), size: 3 }, aUv: { data: new Float32Array(tu), size: 2 } }, new Uint16Array(ti)) };
  // الأشياء على الطاولة (بنفس نسبة كبرها)
  var sc = Rt / R.table.r, pl = R.sprites.place, rects = R.sprites.rects, self = this;
  this.sprites = ["dallah", "sugar", "c1", "c2", "c3", "lantern"].map(function(n){
    var p = pl[n], rc = rects[n], isL = n === "lantern", s2 = isL ? 0.6 : sc * 0.92;
    var pos = isL ? [p.pos[0], 1.5, p.pos[2]] : [p.pos[0] * sc, Ht, p.pos[2] * sc];
    return { n: n, pos: pos, w: p.w * s2, h: p.h * s2, ax: p.ax, ay: p.ay, uv: rc };
  });
  this.flames = this.sprites.filter(function(s){ return s.n[0] === "c"; }).map(function(s){ return [s.pos[0] + (0.5 - s.ax) * s.w * 0.4, s.pos[1] + s.ay * s.h * 0.9, s.pos[2]]; });
  var lan = this.sprites[5];
  this.lampPos = [lan.pos[0], lan.pos[1] + lan.ay * lan.h * 0.45, lan.pos[2]];
  var fl = this.flames, cx = 0, cy = 0, cz = 0; fl.forEach(function(f){ cx += f[0]; cy += f[1]; cz += f[2]; });
  this.canPos = fl.length ? [cx / fl.length, cy / fl.length, cz / fl.length] : [0, 0.55, 0];
  if(!this.sprV){
    this.sprBuf = new Float32Array(6 * 4 * 5 + 4 * 5);
    this.sprV = vao(gl, this.pSpr, { aPos: { data: new Float32Array(6 * 4 * 3 + 12), size: 3, dyn: true }, aUv: { data: new Float32Array(6 * 4 * 2 + 8), size: 2, dyn: true } });
  }
  void self;
};

/* ---------------------------- المقاعد ---------------------------- */
/* list: [{id, av, me}] بترتيب الطاولة (أنا أول واحد) */
Scene.prototype.setSeats = function(list){
  var keep = {}, self = this, others = list.filter(function(s){ return !s.me; }), m = others.length;
  // حجم الطاولة والكراسي حسب العدد: مسافة ~0.52م بين كل اثنين، والكل يطلع قدامك (قوس ~200°)
  var span = Math.min(230, 40 + 23 * (m - 1)) * Math.PI / 180;
  var Rs = clamp(0.5 * Math.max(m - 1, 1) / span, 0.98, 1.4);
  if(m <= 1) span = 0;
  if(Math.abs(Rs - this.Rs) > 0.01 || !this.tableN){ this.Rs = Rs; this.Rt = Rs - 0.31; if(this.roomReady) this.buildTable(); }
  this.eye = [0, 0.86, Rs + 0.16];
  others.forEach(function(s, k){
    keep[s.id] = 1;
    var c = self.chars[s.id];
    if(!c) c = self.chars[s.id] = self.newChar(s.id);
    var t = m === 1 ? 0.5 : k / (m - 1);
    var phi = Math.PI + (t - 0.5) * span;     // 0 = أنا (z+)، π = قدامي
    var x = -Math.sin(phi) * Rs, z = Math.cos(phi) * Rs;
    c.pos = [x, 0, z]; c.face = Math.atan2(-x, -z);
    if(c.av !== s.av){ c.av = s.av; c.asset = null; if(self.has(s.av)) self.load(s.av).then(function(A){ if(c.av === s.av){ c.asset = A; c.born = self.last || performance.now(); } }, function(){}); }
  });
  for(var id in this.chars) if(!keep[id]) delete this.chars[id];
  this.order = others.map(function(s){ return s.id; });
};
Scene.prototype.has = function(av){ return this.files[av] != null; };
Scene.prototype.load = function(av){
  var self = this, key = String(av);
  if(this.assets[key]) return this.assets[key].p;
  var name = this.files[av]; if(name == null) return Promise.reject(new Error("no model"));
  var A = { ready: false };
  A.p = Promise.all([
    fetch(this.base + name + ".c3d" + this.ver).then(function(r){ if(!r.ok) throw new Error("c3d " + r.status); return r.arrayBuffer(); }),
    loadImg(self.base + name + ".webp" + self.ver)
  ]).then(function(r){ self.upload(A, parseC3D(r[0]), r[1]); A.ready = true; return A; });
  this.assets[key] = A;
  return A.p;
};
Scene.prototype.upload = function(A, D, img){
  var gl = this.gl, P = this.pChar.A;
  A.meta = D.meta; A.n = D.ix.length; A.i32 = !!D.meta.i32;
  A.vao = gl.createVertexArray(); gl.bindVertexArray(A.vao);
  function attr(loc, arr, size, type, normd){
    if(loc == null || loc < 0) return;
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, normd, 0, 0);
  }
  attr(P.aPos, D.pos, 3, gl.SHORT, true); attr(P.aNor, D.nor, 4, gl.BYTE, true); attr(P.aSn, D.sn, 4, gl.BYTE, true);
  attr(P.aUv, D.uv, 2, gl.UNSIGNED_SHORT, true); attr(P.aJ, D.jn, 4, gl.UNSIGNED_BYTE, false); attr(P.aW, D.wt, 4, gl.UNSIGNED_BYTE, true);
  var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, D.ix, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  A.tex = texFrom(gl, img);
  var M = A.meta, J = M.joints, E = M.ends;
  A.rest = M.bones.map(function(n, i){ return { j: J[i], d: norm3([E[i][0] - J[i][0], E[i][1] - J[i][1], E[i][2] - J[i][2]]) }; });
  A.bi = {}; M.bones.forEach(function(n, i){ A.bi[n] = i; });
  A.topY = (M.lm && M.lm.seatH) || 0.95;
  A.headY = M.joints[A.bi.head][1] + 0.1;
};
Scene.prototype.newChar = function(id){
  return { id: id, av: null, asset: null, pos: [0, 0, 0], face: 0, st: {}, born: 0,
           k: { sleep: 0, ghost: 0, talk: 0, yaw: 0, pitch: 0, sel: 0, pick: 0, tgt: 0, maf: 0, off: 0, hov: 0, lvl: 0, nod: 0, lean: 0, turn: 0 },
           seed: Math.random() * 100, look: null, lookT: 0, gest: 0, gestT: 0, gestOn: false, gside: 1, fidT: 2 + Math.random() * 4, fid: 0, fidK: 0 };
};
Scene.prototype.setState = function(id, st){ var c = this.chars[id]; if(c) c.st = st || {}; };
Scene.prototype.setPhase = function(ph){ this.phase = ph; };
Scene.prototype.setMeTalk = function(v){ this.meTalk = v; };
Scene.prototype.setHover = function(id){ this.hover = id; };
Scene.prototype.setSpot = function(id){ this.spot = id || null; };   // صاحب الدور (الكاميرا ترتاح عليه)
Scene.prototype.setSize = function(w, h, dpr){ this.vw = w; this.vh = h; if(dpr) this.dpr = dpr; };
Scene.prototype.loaded = function(id){ var c = this.chars[id]; return !!(c && c.asset && c.asset.ready); };

/* ---------------------------- الكاميرا (منظور أول) ---------------------------- */
Scene.prototype.drag = function(dx, dy){
  var c = this.cam, k = 2.6 / Math.max(this.vw, 320);
  c.ty = clamp(c.ty - dx * k, -1.3, 1.3); c.tp = clamp(c.tp + dy * k * 0.8, -0.72, 0.3);
  c.dragAt = this.nowT();                          // الوقت الحقيقي (مو وقت آخر إطار) عشان الجهاز البطيء ما يرجّع الكاميرا على طول
};
Scene.prototype.nowT = function(){ return (performance.now() - this.t0) / 1000; };
Scene.prototype.lookAtSeat = function(id){
  var ch = this.chars[id]; if(!ch) return;
  var a = this.aimAt([ch.pos[0], 0.72, ch.pos[2]]); this.cam.ty = a[0]; this.cam.tp = a[1]; this.cam.dragAt = this.nowT() - 1.5;
};
Scene.prototype.aimAt = function(p){
  var e = this.eye || [0, 0.86, 1.3], dx = p[0] - e[0], dy = p[1] - e[1], dz = p[2] - e[2];
  return [clamp(Math.atan2(dx, -dz), -1.3, 1.3), clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.72, 0.3)];
};
Scene.prototype.fovY = function(){
  var a = this.vw / Math.max(this.vh, 1);
  return (a >= 1.2 ? 58 : a >= 0.9 ? 64 : a >= 0.65 ? 70 : 74) * Math.PI / 180;
};
Scene.prototype.updateCam = function(t, dt){
  var c = this.cam, now = t, self = this;
  var tall = this.vw / Math.max(this.vh, 1) < 0.9;
  var home = this.aimAt([0, tall ? 0.42 : 0.52, -this.Rs * (tall ? 0.2 : 0.42)]);
  // اللي يتكلم الحين (أعلى صوت، ويستمر شوي) — الكاميرا تلف له لو ما لمست الشاشة من 4 ثواني
  var best = null, bl = 0.12;
  this.order.forEach(function(id){ var ch = self.chars[id]; if(!ch) return; var l = ch.st.talk || 0; if(l > bl && ch.st.alive !== false){ bl = l; best = id; } });
  if(best){ if(c.focus !== best){ c.focusC = best; c.focusT = (c.focusT || 0) + dt; if(c.focusT > 0.7){ c.focus = best; c.focusT = 0; c.focusAt = now; } } else c.focusAt = now; }
  else { c.focusT = 0; if(c.focus && now - (c.focusAt || 0) > 3.5) c.focus = null; }
  var idle = now - c.dragAt > 4;
  if(idle){
    var tgt = home;
    var fid = this.autoLook === false ? null : (c.focus && this.chars[c.focus]) ? c.focus : (this.spot && this.chars[this.spot]) ? this.spot : null;
    if(fid){ var fc = this.chars[fid]; tgt = this.aimAt([fc.pos[0] * 0.92, 0.66, fc.pos[2] * 0.92]); tgt[0] = clamp(tgt[0], -1.1, 1.1); }
    c.ty = damp(c.ty, tgt[0], 1.6, dt); c.tp = damp(c.tp, tgt[1], 1.6, dt);
  }
  c.yaw = damp(c.yaw, c.ty, 9, dt); c.pitch = damp(c.pitch, c.tp, 9, dt);
  // تنفّس الراس (حركة خفيفة)
  var bob = this.motion === false ? 0 : 1;
  var e = this.eye || [0, 0.86, 1.3];
  this.eyeNow = [e[0] + Math.sin(t * 0.31) * 0.006 * bob, e[1] + Math.sin(t * 1.1) * 0.004 * bob, e[2]];
  var cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  var fw = [sy * cp, sp, -cy * cp];
  var V = viewFrom(this.eyeNow, fw);
  this.view = V.m; this.camR = V.r; this.camU = V.u;
  this.proj = persp(this.fovY(), this.vw / Math.max(this.vh, 1), 0.04, 30);
  // إزاحة العدسة لتحت شوي (مثل كاميرا shift): الروس تنزل عن شريط المرحلة فوق، والخطوط العمودية تبقى عمودية
  this.proj[9] = this.lensY != null ? this.lensY : (tall ? 0.16 : 0.12);
  this.vp = mul(this.proj, this.view);
};
/* مكان نقطة بالشاشة (CSS px)؛ vis = قدّام الكاميرا */
Scene.prototype.screen = function(p){
  var m = this.vp; if(!m) return { x: -9999, y: -9999, vis: false, w: 1 };
  var x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  if(w <= 0.01) return { x: -9999, y: -9999, vis: false, w: w };
  return { x: (x / w * 0.5 + 0.5) * this.vw, y: (0.5 - y / w * 0.5) * this.vh, vis: true, w: w };
};
Scene.prototype.seatInfo = function(id){
  var c = this.chars[id]; if(!c) return null;
  var A = c.asset && c.asset.ready ? c.asset : null, top = (A ? A.topY : 0.95) + 0.03 + c.k.ghost * 0.12;
  var h = this.screen([c.pos[0], top, c.pos[2]]), f = this.screen([c.pos[0], 0.12, c.pos[2]]);
  var on = h.vis && f.vis && h.x > -60 && h.x < this.vw + 60;
  var wpx = h.vis ? 0.55 / h.w * this.proj[0] * 0.5 * this.vw : 0;
  return { x: h.x, y: h.y, fx: f.x, fy: f.y, w: wpx, h: f.y - h.y, on: on, has3d: !!A, depth: h.w };
};
/* مين تحت الإصبع؟ شعاع من العين عبر النقطة (CSS px) ضد أسطوانة تقريبية لكل شخصية */
Scene.prototype.pick = function(x, y){
  if(!this.view) return null;
  var nx = x / this.vw * 2 - 1, ny = 1 - y / this.vh * 2, P = this.proj, V = this.view;
  var dxv = (nx + P[8]) / P[0], dyv = (ny + P[9]) / P[5];     // اتجاه بإطار الكاميرا (z = -1)، مع إزاحة العدسة
  var r = this.camR, u = this.camU, f = [-V[2], -V[6], -V[10]];
  var d = norm3([r[0] * dxv + u[0] * dyv + f[0], r[1] * dxv + u[1] * dyv + f[1], r[2] * dxv + u[2] * dyv + f[2]]);
  var e = this.eyeNow || this.eye, best = null, bt = 1e9, self = this;
  this.order.forEach(function(id){
    var c = self.chars[id]; if(!c) return;
    var top = (c.asset && c.asset.ready ? c.asset.topY : 0.95) + 0.05, rad = 0.27;
    // تقاطع بالمستوى الأفقي مع دايرة حول (x,z)
    var ox = e[0] - c.pos[0], oz = e[2] - c.pos[2], a = d[0] * d[0] + d[2] * d[2], b = 2 * (ox * d[0] + oz * d[2]), cc = ox * ox + oz * oz - rad * rad;
    var disc = b * b - 4 * a * cc; if(disc < 0 || a < 1e-9) return;
    var sq = Math.sqrt(disc), ts = [(-b - sq) / (2 * a), (-b + sq) / (2 * a)];
    for(var i = 0; i < 2; i++){ var t = ts[i]; if(t <= 0) continue; var yy = e[1] + d[1] * t; if(yy >= 0.02 && yy <= top){ if(t < bt){ bt = t; best = id; } break; } }
  });
  return best;
};
/* اتجاه لاعب برّا الشاشة (للأسهم على الأطراف): -1 يسار، 1 يمين */
Scene.prototype.sideOf = function(id){
  var c = this.chars[id]; if(!c) return 0;
  var a = this.aimAt([c.pos[0], 0.7, c.pos[2]]), d = wrapPi(a[0] - this.cam.yaw);
  return d < 0 ? -1 : 1;
};

/* ---------------------------- الوضعية والحركة ---------------------------- */
var ARM_T = { L: norm3([0.22, -0.84, 0.48]), R: norm3([-0.22, -0.84, 0.48]) };
var FORE_T = { L: norm3([-0.34, -0.42, 0.84]), R: norm3([0.34, -0.42, 0.84]) };
/* لو العضد لازق بالجنب (شائع بالموديلات): نحرك الساعد بس من الكوع، واليد ترتاح على الفخذ قدّام */
var FORE_L = { L: norm3([-0.3, -0.3, 0.9]), R: norm3([0.3, -0.3, 0.9]) };
Scene.prototype.think = function(c, t, dt){
  var st = c.st, k = c.k, ph = this.phase, alive = st.alive !== false, self = this;
  k.sleep = damp(k.sleep, st.sleep ? 1 : 0, 2.2, dt);
  k.ghost = damp(k.ghost, !alive ? 1 : 0, 1.6, dt);
  var lvl = clamp(st.talk || 0, 0, 1);
  k.lvl = damp(k.lvl, lvl, lvl > k.lvl ? 18 : 5, dt);
  k.talk = damp(k.talk, lvl > 0.05 ? 1 : 0, lvl > 0.05 ? 6 : 1.4, dt);
  k.nod = Math.sin(t * 7.2 + c.seed) * k.lvl * 1.1 + Math.sin(t * 2.9 + c.seed) * k.talk * 0.5;
  // الفم يمشي مع الصوت (مقاطع مثل الكلام)، والعيون ترمش، وتتسكّر وقت النوم
  var syl = Math.abs(Math.sin(t * 10.5 + c.seed) * Math.sin(t * 6.1 + c.seed * 1.7));
  var open = lvl > 0.04 && alive ? clamp(k.lvl * 1.3, 0, 1) * (0.35 + 0.65 * syl) : 0;
  k.mouth = damp(k.mouth || 0, open, 24, dt);
  c.blinkT = (c.blinkT == null ? 1 + Math.random() * 4 : c.blinkT) - dt;
  if(c.blinkT <= 0){ c.blinkT = 2.4 + Math.random() * 4.2; c.blinkS = t; if(Math.random() < 0.18) c.blinkT = 0.28; }
  var bl = c.blinkS != null ? t - c.blinkS : 9, blink = bl < 0.17 ? Math.sin(Math.PI * bl / 0.17) : 0;
  k.lid = Math.max(blink, smooth((k.sleep - 0.25) / 0.6));
  k.sel = damp(k.sel, st.sel ? 1 : 0, 8, dt); k.pick = damp(k.pick, st.pick ? 1 : 0, 6, dt); k.tgt = damp(k.tgt, st.target ? 1 : 0, 6, dt);
  k.maf = damp(k.maf, st.maf ? 1 : 0, 4, dt); k.off = damp(k.off, st.off ? 1 : 0, 3, dt); k.hov = damp(k.hov, this.hover === c.id ? 1 : 0, 10, dt);
  k.turn = damp(k.turn || 0, st.turn ? 1 : 0, 5, dt);                // دوره بالكلام (أدوار النقاش)
  // إيماءة باليد وقت الكلام (يمين أو يسار)
  if(k.talk > 0.5 && !c.gestOn && Math.random() < dt * 0.55){ c.gestOn = true; c.gestT = 1.1 + Math.random() * 1.8; c.gside = Math.random() < 0.65 ? 1 : 0; }
  if(c.gestOn){ c.gest = Math.min(1, c.gest + dt * 3); c.gestT -= dt; if(c.gestT <= 0 || k.talk < 0.25) c.gestOn = false; }
  else c.gest = Math.max(0, c.gest - dt * 1.8);
  // حركات صغيرة وهو ساكت: يميل، يعدّل جلسته، يحك دقنه
  c.fidT -= dt;
  if(c.fidT <= 0 && k.talk < 0.3 && k.sleep < 0.3){ c.fidT = 3 + Math.random() * 6; c.fid = Math.floor(Math.random() * 3) + 1; c.fidK = 0; }
  if(c.fid){ c.fidK += dt / 1.8; if(c.fidK >= 1){ c.fid = 0; c.fidK = 0; } }
  k.lean = damp(k.lean, k.talk * 0.12 + (c.fid === 1 ? Math.sin(Math.PI * c.fidK) * 0.1 : 0), 3, dt);
  // وين يطالع
  var target = null, best = 0.06;
  if((this.meTalk || 0) > best){ target = this.eyeNow || this.eye; best = this.meTalk; }
  this.order.forEach(function(id){ var o = self.chars[id]; if(!o || o === c) return; var l = o.st.talk || 0; if(l > best && o.st.alive !== false){ best = l; target = [o.pos[0], 0.82, o.pos[2]]; } });
  if(!target){
    c.lookT -= dt;
    if(c.lookT <= 0){
      c.lookT = 1.8 + Math.random() * 3.6;
      var r = Math.random();
      if(r < 0.3) c.look = [0, 0.32, 0];
      else if(r < 0.55) c.look = this.eye || [0, 0.86, 1.3];
      else { var ids = this.order.filter(function(x){ return x !== c.id; }); var o2 = ids.length ? this.chars[ids[Math.floor(Math.random() * ids.length)]] : null; c.look = o2 ? [o2.pos[0], 0.82, o2.pos[2]] : [0, 0.32, 0]; }
    }
    target = c.look || [0, 0.32, 0];
  }
  if(ph === "night" && st.sleep) target = [0, 0.3, 0];
  var hx = c.pos[0], hz = c.pos[2], hy = 0.82;
  var dx = target[0] - hx, dy = target[1] - hy, dz = target[2] - hz;
  var cs = Math.cos(-c.face), sn = Math.sin(-c.face);
  var lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs;
  var yaw = clamp(Math.atan2(lx, lz), -1.1, 1.1), pitch = clamp(-Math.atan2(dy, Math.hypot(lx, lz)), -0.3, 0.42);
  k.yaw = damp(k.yaw, yaw, 4.2, dt); k.pitch = damp(k.pitch, pitch, 4.2, dt);
};
Scene.prototype.pose = function(c, t){
  var A = c.asset, R = A.rest, nb = R.length, k = c.k, q = [];
  for(var i = 0; i < nb; i++) q.push([0, 0, 0, 1]);
  var bi = A.bi, sd = c.seed;
  var br = Math.sin(t * (1.15 + (sd % 0.25)) + sd) * (k.sleep > 0.5 ? 1.5 : 1);
  var sway = Math.sin(t * 0.43 + sd) * 0.03 + Math.sin(t * 0.27 + sd * 2) * 0.02;
  var slump = k.sleep * 0.18 - k.ghost * 0.04;
  var fidRoll = c.fid === 2 ? Math.sin(Math.PI * c.fidK) * 0.08 : 0;
  q[bi.spine] = qmul(qaxis(0, 1, 0, sway * 1.4 + k.yaw * 0.16), qaxis(1, 0, 0, slump * 0.5 + 0.03 + k.lean));
  q[bi.chest] = qmul(qaxis(1, 0, 0, br * 0.022 + slump * 0.5 + k.nod * 0.02), qaxis(0, 0, 1, sway * 0.8 + fidRoll));
  var yaw = k.yaw, pitch = k.pitch + k.sleep * 0.46 + k.nod * 0.12;
  q[bi.neck] = qmul(qaxis(0, 1, 0, yaw * 0.42), qaxis(1, 0, 0, pitch * 0.4));
  q[bi.head] = qmul(qmul(qaxis(0, 1, 0, yaw * 0.58), qaxis(1, 0, 0, pitch * 0.6)), qaxis(0, 0, 1, Math.sin(t * 0.6 + sd) * 0.05 + k.sleep * 0.1 + k.talk * Math.sin(t * 2.3 + sd) * 0.05));
  var keep = A.meta.keep || [], am = A.meta.arm || {};
  ["L", "R"].forEach(function(s, si){
    var mode = keep.indexOf(s) >= 0 ? "none" : (am[s] || "upper");
    if(mode === "none") return;
    var u = bi["upperArm" + s], l = bi["lowerArm" + s];
    var tu = ARM_T[s], tl = mode === "lower" ? FORE_L[s] : FORE_T[s];
    var g = (c.gside === si) ? smooth(c.gest) : 0;
    if(c.fid === 3 && si === 1) g = Math.max(g, Math.sin(Math.PI * c.fidK) * 0.7);
    if(g > 0){
      var sx = s === "L" ? 1 : -1, wav = Math.sin(t * 5.5 + sd) * 0.18 * g;
      tu = norm3([tu[0] + sx * 0.08 * g, tu[1] + 0.42 * g, tu[2] + 0.34 * g]);
      tl = norm3([tl[0] * (1 - g) - sx * 0.1 * g + wav, tl[1] * (1 - g) + 0.55 * g, tl[2] * (1 - g) + 0.7 * g]);
    }
    var parentQ = qmul(q[bi.spine], q[bi.chest]);
    var qu = mode === "lower" ? [0, 0, 0, 1] : qfromto(R[u].d, qrot(qinv(parentQ), tu));
    q[u] = qu;
    q[l] = qfromto(R[l].d, qrot(qinv(qmul(parentQ, qu)), tl));
  });
  var J = A.meta.joints, P = A.meta.parent, M = c.mats || (c.mats = new Float32Array(16 * nb)), W = [];
  for(var b = 0; b < nb; b++){
    var loc = pivotMat(q[b], J[b]), w = P[b] < 0 ? loc : mul(W[P[b]], loc);
    W.push(w); M.set(w, b * 16);
  }
  return M;
};
Scene.prototype.modelOf = function(c, t){
  var k = c.k, m = new Float32Array(16), a = c.face, cs = Math.cos(a), sn = Math.sin(a);
  var lift = k.ghost * (0.1 + Math.sin(t * 1.3 + c.seed) * 0.035);
  m[0] = cs; m[2] = -sn; m[5] = 1; m[8] = sn; m[10] = cs; m[15] = 1;
  m[12] = c.pos[0]; m[13] = c.pos[1] + lift; m[14] = c.pos[2];
  return m;
};

/* ---------------------------- الرسم ---------------------------- */
Scene.prototype.resize = function(){
  var cv = this.cv, w = Math.max(1, Math.round(this.vw * this.dpr)), h = Math.max(1, Math.round(this.vh * this.dpr));
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; cv.style.width = this.vw + "px"; cv.style.height = this.vh + "px"; }
};
Scene.prototype.frame = function(now){
  if(this.lost || !this.roomReady) return;
  var gl = this.gl, t = (now - this.t0) / 1000, dt = this.last ? clamp((now - this.last) / 1000, 0, 0.1) : 0.016; this.last = now; this.clock = t;
  var mood = MOODS[this.phase] || MOODS.lobby, cm = this.cm || (this.cm = JSON.parse(JSON.stringify(mood)));
  ["lamp", "can", "moon", "amb"].forEach(function(n){ for(var i = 0; i < 3; i++) cm[n][i] = damp(cm[n][i], mood[n][i], 1.1, dt); });
  ["sat", "dim", "night", "bright"].forEach(function(n){ cm[n] = damp(cm[n], mood[n], 1.1, dt); });
  this.updateCam(t, dt);
  this.resize();
  gl.viewport(0, 0, this.cv.width, this.cv.height);
  gl.clearColor(0.02, 0.015, 0.012, 1); gl.clearDepth(1); gl.depthMask(true); gl.colorMask(true, true, true, true);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND);
  var proj = this.proj, view = this.view, fl = 0.9 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1);
  var tint = [1, 1, 1];
  if(this.phase === "vote") tint = [1.04, 0.9, 0.86];
  // 1) الغرفة (الرسمة على الجدران والأرض)
  var E = this.pEnv; gl.useProgram(E.p); gl.disable(gl.CULL_FACE);
  gl.uniformMatrix4fv(E.U.uProj, false, proj); gl.uniformMatrix4fv(E.U.uView, false, view); gl.uniformMatrix4fv(E.U.uPaint, false, this.paintM);
  gl.uniform1f(E.U.uNightK, cm.night); gl.uniform1f(E.U.uBright, cm.bright); gl.uniform3fv(E.U.uLamp, this.lampPos); gl.uniform3fv(E.U.uTint, tint);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tx.day); gl.uniform1i(E.U.uDay, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tx.night); gl.uniform1i(E.U.uNight, 1);
  gl.bindVertexArray(this.env.vao); gl.drawElements(gl.TRIANGLES, this.env.n, gl.UNSIGNED_INT, 0);
  gl.activeTexture(gl.TEXTURE0);
  // 2) الزولية والطاولة
  var T = this.pTex; gl.useProgram(T.p);
  gl.uniformMatrix4fv(T.U.uProj, false, proj); gl.uniformMatrix4fv(T.U.uView, false, view); gl.uniform1i(T.U.uTex, 0);
  gl.uniform1f(T.U.uNightK, cm.night); gl.uniform3fv(T.U.uLamp, this.lampPos);
  var bt = [tint[0] * cm.bright, tint[1] * cm.bright, tint[2] * cm.bright];
  gl.uniform3fv(T.U.uTint, bt); gl.uniform1f(T.U.uShade, 0.6);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.bindTexture(gl.TEXTURE_2D, this.tx.carpet); gl.bindVertexArray(this.carpet.vao); gl.drawElements(gl.TRIANGLES, this.carpet.n, gl.UNSIGNED_SHORT, 0);
  gl.disable(gl.BLEND);
  gl.uniform1f(T.U.uShade, 0.0);
  gl.bindVertexArray(this.table.vao);
  gl.bindTexture(gl.TEXTURE_2D, this.tx.table); gl.drawElements(gl.TRIANGLES, this.tableN.top, gl.UNSIGNED_SHORT, 0);
  gl.uniform1f(T.U.uShade, 0.5);
  gl.bindTexture(gl.TEXTURE_2D, this.tx.apron); gl.drawElements(gl.TRIANGLES, this.tableN.apron, gl.UNSIGNED_SHORT, this.tableN.top * 2);
  gl.uniform3fv(T.U.uTint, [0.25 * bt[0], 0.18 * bt[1], 0.14 * bt[2]]);
  gl.bindTexture(gl.TEXTURE_2D, this.tx.apron); gl.drawElements(gl.TRIANGLES, this.tableN.base, gl.UNSIGNED_SHORT, (this.tableN.top + this.tableN.apron) * 2);
  // 3) الشخصيات
  var self = this, list = this.order.map(function(id){ return self.chars[id]; }).filter(function(c){ return c && c.asset && c.asset.ready; });
  list.forEach(function(c){ self.think(c, t, dt); c.M = self.pose(c, t); });
  var U = this.pChar.U;
  gl.useProgram(this.pChar.p);
  gl.uniformMatrix4fv(U.uProj, false, proj); gl.uniformMatrix4fv(U.uView, false, view);
  gl.uniform3fv(U.uCam, this.eyeNow); gl.uniform3fv(U.uLampPos, this.lampPos); gl.uniform3fv(U.uCanPos, this.canPos);
  gl.uniform3f(U.uLampCol, cm.lamp[0], cm.lamp[1], cm.lamp[2]); gl.uniform3f(U.uCanCol, cm.can[0] * fl, cm.can[1] * fl, cm.can[2] * fl);
  gl.uniform3fv(U.uMoonDir, norm3([0.55, 0.45, -0.7])); gl.uniform3f(U.uMoonCol, cm.moon[0], cm.moon[1], cm.moon[2]);
  gl.uniform3f(U.uAmb, cm.amb[0], cm.amb[1], cm.amb[2]); gl.uniform1f(U.uSat, cm.sat);
  gl.uniform1f(U.uFocal, this.proj[5] * 0.5 * this.vh);
  gl.uniform1i(U.uTex, 0); gl.activeTexture(gl.TEXTURE0);
  gl.enable(gl.CULL_FACE);
  var ghosts = [];
  list.forEach(function(c){
    var k = c.k, born = clamp((now - c.born) / 600, 0, 1), rim = [0, 0, 0], rk = 0;
    if(k.maf > 0.01){ rim = [1.0, 0.25, 0.18]; rk = 0.9 * k.maf; }
    if(k.tgt > 0.01){ rim = [1.0, 0.2, 0.15]; rk = Math.max(rk, 1.2 * k.tgt); }
    if(k.sel > 0.01){ rim = [1.0, 0.82, 0.45]; rk = Math.max(rk, 1.3 * k.sel); }
    if(k.hov > 0.01 && k.pick > 0.5){ if(k.sel < 0.5) rim = [1.0, 0.95, 0.85]; rk = Math.max(rk, 0.9 * k.hov); }
    if(k.turn > 0.01 && rk < 0.5){ rim = [1.0, 0.84, 0.5]; rk = Math.max(rk, (0.5 + 0.2 * Math.sin(t * 3.2)) * k.turn); }
    if(k.talk > 0.01 && rk < 0.4){ rim = [0.62, 1.0, 0.7]; rk = Math.max(rk, 0.5 * k.talk * (0.6 + k.lvl)); }
    c.draw = { model: self.modelOf(c, t), rim: rim, rk: rk, dim: cm.dim * (1 - 0.32 * k.sleep) * (1 - 0.45 * k.off), alpha: born };
    if(k.ghost > 0.02 || born < 1){ ghosts.push(c); return; }
    self.drawChar(c, 1, 0);
  });
  // 4) الظل والدواير على الزولية
  gl.disable(gl.CULL_FACE); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(this.pDec.p); var DU = this.pDec.U;
  gl.uniformMatrix4fv(DU.uProj, false, proj); gl.uniformMatrix4fv(DU.uView, false, view); gl.uniform1f(DU.uTime, t);
  gl.bindVertexArray(this.quad);
  this.order.forEach(function(id){
    var c = self.chars[id]; if(!c) return;
    var k = c.k, has = c.asset && c.asset.ready, ring = [0, 0, 0, 0], dash = 0;
    if(k.sel > 0.02) ring = [1.0, 0.8, 0.42, 0.9 * k.sel];
    else if(k.tgt > 0.02) ring = [1.0, 0.25, 0.18, 0.85 * k.tgt];
    else if(k.pick > 0.02){ ring = [1.0, 0.94, 0.82, (0.35 + 0.45 * k.hov) * k.pick]; dash = 1; }
    else if(k.turn > 0.02) ring = [1.0, 0.84, 0.48, (0.62 + 0.25 * Math.sin(t * 3.2)) * k.turn];
    else if(k.talk > 0.02) ring = [0.55, 1.0, 0.65, 0.5 * k.talk * (0.5 + k.lvl)];
    else if(k.maf > 0.02) ring = [1.0, 0.3, 0.2, 0.45 * k.maf];
    gl.uniform4f(DU.uC, c.pos[0], 0.008, c.pos[2], 0.5);
    gl.uniform4f(DU.uRing, ring[0], ring[1], ring[2], ring[3]); gl.uniform1f(DU.uDash, dash);
    gl.uniform1f(DU.uShadow, has ? 0.5 * (1 - k.ghost * 0.8) : 0.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  gl.depthMask(true);
  // 5) الأشياء المقصوصة (من الأبعد للأقرب)
  this.drawSprites(cm, tint);
  // 6) الأشباح
  if(ghosts.length){
    gl.useProgram(this.pChar.p); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    ghosts.forEach(function(c){
      gl.depthMask(true); gl.colorMask(false, false, false, false); self.drawChar(c, 0, 1);
      gl.colorMask(true, true, true, true); gl.depthMask(false); self.drawChar(c, 0, 2);
    });
    gl.depthMask(true);
  }
  // 7) التوهج والغبار (يضاف)
  gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
  var G = this.pGlow; gl.useProgram(G.p);
  gl.uniformMatrix4fv(G.U.uProj, false, proj); gl.uniformMatrix4fv(G.U.uView, false, view);
  gl.uniform3fv(G.U.uR, this.camR); gl.uniform3fv(G.U.uU, this.camU);
  gl.bindVertexArray(this.gquad);
  var nk = cm.night;
  function glow(p, size, col, k){ gl.uniform3fv(G.U.uPos, p); gl.uniform1f(G.U.uSize, size); gl.uniform3fv(G.U.uCol, col); gl.uniform1f(G.U.uK, k); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  glow(this.lampPos, 0.75, [1.0, 0.62, 0.3], 0.34 * fl * (1 - 0.45 * nk));
  this.flames.forEach(function(f, i){ var ff = 0.82 + 0.18 * Math.sin(t * (8 + i) + i * 2.1) * Math.sin(t * 3.3 + i); glow(f, 0.16, [1.0, 0.72, 0.38], 0.55 * ff); glow(f, 0.05, [1.0, 0.9, 0.7], 0.6 * ff); });
  (this.R.lamps || []).forEach(function(l, i){ var ff = 0.88 + 0.12 * Math.sin(t * (5.3 + i) + i); glow([l[0], l[1], l[2]], 0.32 * l[3], [1.0, 0.6, 0.28], 0.4 * ff); });
  if(this.R.window) glow(this.R.window, 1.25, [0.35, 0.5, 1.0], 0.1 + 0.18 * nk);
  var D = this.pDust; gl.useProgram(D.p);
  gl.uniformMatrix4fv(D.U.uProj, false, proj); gl.uniformMatrix4fv(D.U.uView, false, view); gl.uniform1f(D.U.uTime, t);
  gl.uniform1f(D.U.uPx, 2.2 * this.dpr * this.vh / 900); gl.uniform3fv(D.U.uCol, nk > 0.5 ? [0.55, 0.65, 1.0] : [1.0, 0.82, 0.55]);
  gl.bindVertexArray(this.dust); gl.drawArrays(gl.POINTS, 0, this.dustN);
  gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
};
Scene.prototype.drawSprites = function(cm, tint){
  var gl = this.gl, S = this.pSpr, eye = this.eyeNow, list = this.sprites.slice();
  list.sort(function(a, b){ return Math.hypot(b.pos[0] - eye[0], b.pos[2] - eye[2]) - Math.hypot(a.pos[0] - eye[0], a.pos[2] - eye[2]); });
  var pos = new Float32Array(list.length * 18), uv = new Float32Array(list.length * 12), o = 0, u = 0;
  list.forEach(function(s){
    var dx = eye[0] - s.pos[0], dz = eye[2] - s.pos[2], l = Math.hypot(dx, dz) || 1, rx = dz / l, rz = -dx / l;   // يمين بالنسبة للكاميرا
    var x0 = -s.ax * s.w, x1 = (1 - s.ax) * s.w, yb = -(1 - s.ay) * s.h, yt = s.ay * s.h;
    var P = function(a, y){ return [s.pos[0] + rx * a, s.pos[1] + y, s.pos[2] + rz * a]; };
    var c = [P(x0, yb), P(x1, yb), P(x1, yt), P(x0, yb), P(x1, yt), P(x0, yt)];
    c.forEach(function(p){ pos[o++] = p[0]; pos[o++] = p[1]; pos[o++] = p[2]; });
    var r = s.uv, u0 = r[0], v0 = r[1], u1 = r[0] + r[2], v1 = r[1] + r[3];
    [[u0, v1], [u1, v1], [u1, v0], [u0, v1], [u1, v0], [u0, v0]].forEach(function(q){ uv[u++] = q[0]; uv[u++] = q[1]; });
  });
  if(!this.sprVao){
    this.sprVao = gl.createVertexArray(); gl.bindVertexArray(this.sprVao);
    this.sprPB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.sprPB); gl.bufferData(gl.ARRAY_BUFFER, pos.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(S.A.aPos); gl.vertexAttribPointer(S.A.aPos, 3, gl.FLOAT, false, 0, 0);
    this.sprUB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.sprUB); gl.bufferData(gl.ARRAY_BUFFER, uv.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(S.A.aUv); gl.vertexAttribPointer(S.A.aUv, 2, gl.FLOAT, false, 0, 0);
  }
  gl.bindVertexArray(this.sprVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.sprPB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.sprUB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, uv);
  gl.useProgram(S.p);
  gl.uniformMatrix4fv(S.U.uProj, false, this.proj); gl.uniformMatrix4fv(S.U.uView, false, this.view);
  gl.uniform1i(S.U.uTex, 0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tx.spr);
  gl.uniform1f(S.U.uNightK, cm.night); gl.uniform3fv(S.U.uTint, [tint[0] * cm.bright, tint[1] * cm.bright, tint[2] * cm.bright]);
  gl.disable(gl.CULL_FACE);
  // مرتين: الصلب (يكتب عمق)، بعدين الحواف الناعمة
  gl.disable(gl.BLEND); gl.uniform1f(S.U.uCut, 0.55); gl.drawArrays(gl.TRIANGLES, 0, list.length * 6);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.uniform1f(S.U.uCut, 0.02); gl.drawArrays(gl.TRIANGLES, 0, list.length * 6);
  gl.depthMask(true); gl.disable(gl.BLEND);
};
Scene.prototype.drawChar = function(c, outline, mode){
  var gl = this.gl, A = c.asset, U = this.pChar.U, d = c.draw, M = A.meta;
  gl.bindVertexArray(A.vao); gl.bindTexture(gl.TEXTURE_2D, A.tex);
  gl.uniformMatrix4fv(U.uModel, false, d.model); gl.uniformMatrix4fv(U.uB, false, c.M);
  gl.uniform3fv(U.uQh, M.half); gl.uniform3fv(U.uQc, M.ctr);
  gl.uniform3fv(U.uRimCol, d.rim); gl.uniform1f(U.uRimK, d.rk); gl.uniform1f(U.uDim, d.dim);
  var ghost = c.k.ghost > 0.02 ? c.k.ghost : 0, alpha = mode === 0 ? 1 : d.alpha;
  gl.uniform1f(U.uGhost, ghost); gl.uniform1f(U.uAlpha, alpha);
  gl.uniform1f(U.uBlend, M.blend ? 1 : 0);
  var sd = M.lm && M.lm.side; gl.uniform1f(U.uSideOn, sd ? 1 : 0); gl.uniform3fv(U.uSide, sd || [0.8, 0.6, 0.45]);
  var fc = M.lm && M.lm.face, Z4 = [0, 0, 0, 0];
  if(fc){
    gl.uniform4fv(U.uMouth, fc.m || Z4); gl.uniform4fv(U.uEyeL, fc.el || Z4); gl.uniform4fv(U.uEyeR, fc.er || Z4);
    gl.uniform3fv(U.uSkin, fc.skin || [0.85, 0.6, 0.45]);
    gl.uniform1f(U.uMouthK, fc.m ? (c.k.mouth || 0) : 0); gl.uniform1f(U.uLid, (fc.el || fc.er) ? (c.k.lid || 0) : 0);
  } else { gl.uniform1f(U.uMouthK, 0); gl.uniform1f(U.uLid, 0); }
  if(mode === 2){ gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
  var type = A.i32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
  gl.uniform1f(U.uOutPass, 0); gl.uniform1f(U.uOut, 0); gl.cullFace(gl.BACK);
  gl.drawElements(gl.TRIANGLES, A.n, type, 0);
  if(outline && !ghost){
    gl.cullFace(gl.FRONT); gl.uniform1f(U.uOutPass, 1); gl.uniform1f(U.uOut, 1.2);
    gl.drawElements(gl.TRIANGLES, A.n, type, 0);
    gl.cullFace(gl.BACK);
  }
  if(mode === 2) gl.disable(gl.BLEND);
};
Scene.prototype.start = function(onFrame){
  var self = this; this.running = true;
  function loop(now){
    if(!self.running) return;
    requestAnimationFrame(loop);
    if(document.hidden) return;
    var gap = self.slow > 0 ? 30 : 0;
    if(self.prev && now - self.prev < gap) return;
    var t0 = performance.now();
    self.frame(now);
    var spent = performance.now() - t0;
    self.prev = now;
    self.avg = self.avg ? self.avg * 0.95 + spent * 0.05 : spent;
    if(self.avg > 22 && self.dpr > 1){ self.dpr = Math.max(1, self.dpr - 0.25); self.avg = 12; }
    if(self.avg > 26) self.slow = 1;
    if(onFrame) onFrame(self);
  }
  requestAnimationFrame(loop);
};
Scene.prototype.stop = function(){ this.running = false; };
Scene.prototype.destroy = function(){ this.destroyed = true; this.running = false; this.lost = true; var e = this.gl.getExtension("WEBGL_lose_context"); if(e) e.loseContext(); };

function supported(){
  try{ var c = document.createElement("canvas"), g = c.getContext("webgl2"); if(!g) return false; var e = g.getExtension("WEBGL_lose_context"); if(e) e.loseContext(); return true; }catch(err){ return false; }
}
root.Mafia3D = { Scene: Scene, supported: supported, version: 3 };
})(window);
