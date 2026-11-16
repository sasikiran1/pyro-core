/*
 * Raymarched flame volume. Scene units: 1 unit = 10 cm. The rod lies on the
 * z axis (radius 0.05 = 5 mm); forced flow runs along +x. The temperature
 * field has the same shape as fieldAt() in combustionEngine.ts, plus 3D
 * simplex noise so the flame breathes.
 */
import * as THREE from 'three'

export const flameVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

export const flameFragment = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform float uTime;
uniform float uFlameT;     // K, ambient when not burning
uniform float uAmbient;    // K
uniform float uStandoff;   // scene units
uniform float uFlowFrac;   // 0..1 of full damper
uniform float uSoot;       // 0..1
uniform float uBurning;    // 0 or 1 (smoothed in JS)
uniform int uMode;         // 0 visible, 1 MWIR, 2 CO
uniform float uGravity;    // 0..1 fraction of Earth gravity

// --- 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT) ---
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

const float R_ROD = 0.0635;   // 6.35 mm
const float X_TIP = -0.35;    // upstream tip of the rod; the rod runs downstream along +x

// Distance from the rod's capsule-shaped surface envelope, flame radius and
// a downstream envelope. Returns (shell distance, inside flag, local flame radius, envelope).
vec4 shellOf(vec3 p) {
  vec3 q = p;
  if (uGravity > 0.01 && q.x > X_TIP) {
    float dxG = q.x - X_TIP;
    q.y -= uGravity * 0.18 * sqrt(dxG);
  }
  float rf = R_ROD + uStandoff;
  float dx = q.x - X_TIP;
  float flicker = uGravity > 0.01 ? sin(uTime * 14.0) * 0.08 * uGravity : 0.0;
  float n = snoise(vec3(q.x * 6.0 - uTime * (0.6 + 2.0 * uFlowFrac), q.y * 9.0, q.z * 9.0)) * 0.16
          + snoise(q * 19.0 + uTime * 1.5) * 0.06 + flicker;
  float d;
  float rLocal = rf;
  float env = 1.0;
  if (dx < 0.0) {
    // upstream cap: the flow pushes the flame closer to the tip
    d = length(vec3(dx * (1.0 + 1.6 * uFlowFrac), q.y, q.z));
  } else {
    // concurrent flame sleeve along the rod, longer at higher flow, tapering downstream
    float len = 0.18 + 0.9 * uFlowFrac;
    d = length(q.yz);
    rLocal = mix(rf, R_ROD + 0.35 * uStandoff, smoothstep(0.0, len, dx));
    env = 1.0 - smoothstep(len * 0.7, len, dx);
  }
  d *= 1.0 + n * (0.5 + uFlowFrac);
  return vec4(d, d < rLocal ? 1.0 : 0.0, rLocal, env);
}

// Temperature from an already computed shell (shellOf is the expensive part: two noise calls).
float temperatureFrom(vec4 s) {
  if (uBurning < 0.01) return uAmbient;
  float rf = s.z;
  float w = 0.025 + 0.02 * (1.0 - uFlowFrac);
  float prof = s.y > 0.5 ? 1.0 - 0.35 * (1.0 - s.x / rf) : exp(-pow((s.x - rf) / w, 2.0));
  return uAmbient + (uFlameT - uAmbient) * prof * s.w * uBurning;
}

vec3 ironbow(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.0, 0.0, 0.05);
  vec3 c1 = vec3(0.25, 0.0, 0.45);
  vec3 c2 = vec3(0.75, 0.05, 0.45);
  vec3 c3 = vec3(0.98, 0.45, 0.05);
  vec3 c4 = vec3(1.0, 0.85, 0.2);
  vec3 c5 = vec3(1.0, 1.0, 0.95);
  if (t < 0.2) return mix(c0, c1, t / 0.2);
  if (t < 0.4) return mix(c1, c2, (t - 0.2) / 0.2);
  if (t < 0.6) return mix(c2, c3, (t - 0.4) / 0.2);
  if (t < 0.8) return mix(c3, c4, (t - 0.6) / 0.2);
  return mix(c4, c5, (t - 0.8) / 0.2);
}

// approximate visible colour of glowing soot at temperature T
vec3 sootColour(float T) {
  float t = clamp((T - 1000.0) / 1000.0, 0.0, 1.0);
  return mix(vec3(0.8, 0.18, 0.02), vec3(1.0, 0.82, 0.45), t);
}

vec2 hitBox(vec3 ro, vec3 rd) {
  vec3 inv = 1.0 / rd;
  vec3 t0 = (uBoxMin - ro) * inv;
  vec3 t1 = (uBoxMax - ro) * inv;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  return vec2(max(max(tmin.x, tmin.y), tmin.z), min(min(tmax.x, tmax.y), tmax.z));
}

void main() {
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorld - ro);
  vec2 tb = hitBox(ro, rd);
  float t0 = max(tb.x, 0.0);
  float t1 = tb.y;
  if (t1 <= t0) discard;
  const int STEPS = 72;
  float dt = (t1 - t0) / float(STEPS);
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  for (int i = 0; i < STEPS; i++) {
    float t = t0 + (float(i) + jitter) * dt;
    vec3 p = ro + rd * t;
    // stop at the rod surface
    if (p.x > X_TIP && length(p.yz) < R_ROD) break;
    if (p.x <= X_TIP && length(p - vec3(X_TIP, 0.0, 0.0)) < R_ROD) break;
    // Cheap test without noise: far from the flame envelope nothing is emitted, so skip the two noise calls.
    float dxT = p.x - X_TIP;
    float rough = dxT < 0.0 ? length(vec3(dxT * (1.0 + 1.6 * uFlowFrac), p.y, p.z)) : length(p.yz);
    if (uBurning < 0.01 || rough > (R_ROD + uStandoff) * 1.9 + 0.08 || dxT > 0.18 + 0.9 * uFlowFrac) continue;
    vec4 s = shellOf(p);
    float T = temperatureFrom(s);
    float heat = clamp((T - uAmbient) / max(uFlameT - uAmbient, 1.0), 0.0, 1.0);
    vec3 emit = vec3(0.0);
    float a = 0.0;
    if (uMode == 0) {
      float sootZone = s.y * smoothstep(0.55, 1.0, s.x / s.z) * heat;
      emit = sootColour(T) * sootZone * uSoot * 9.0
           + vec3(0.15, 0.35, 1.0) * pow(heat, 3.0) * (0.25 + 0.6 * (1.0 - uSoot)) * 1.6;
      a = sootZone * uSoot * 0.9 + pow(heat, 3.0) * 0.04;
    } else if (uMode == 1) {
      float tn = (T - 300.0) / 1200.0;
      emit = ironbow(tn) * 6.0 * sqrt(heat);
      a = sqrt(heat) * 0.8;
    } else {
      float co = uBurning * s.y * s.w * exp(-pow((s.x / s.z - 0.72) / 0.3, 2.0));
      emit = mix(vec3(0.1, 0.9, 0.3), vec3(1.0, 0.15, 0.1), co) * co * 2.0;
      a = co * 0.5;
    }
    col += (1.0 - alpha) * emit * dt * 12.0;
    alpha += (1.0 - alpha) * clamp(a * dt * 12.0, 0.0, 1.0);
    if (alpha > 0.97) break;
  }
  gl_FragColor = vec4(col, clamp(alpha + length(col) * 0.15, 0.0, 1.0));
}
`

export function createFlameMaterial(boxMin: THREE.Vector3, boxMax: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    vertexShader: flameVertex,
    fragmentShader: flameFragment,
    uniforms: {
      uBoxMin: { value: boxMin },
      uBoxMax: { value: boxMax },
      uTime: { value: 0 },
      uFlameT: { value: 295 },
      uAmbient: { value: 295 },
      uStandoff: { value: 0.05 },
      uFlowFrac: { value: 0.5 },
      uSoot: { value: 1 },
      uBurning: { value: 0 },
      uMode: { value: 0 },
      uGravity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  })
}

/** Same ironbow palette in JS, for the rod surface and legends. */
export function ironbowRGB(t: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0, [0, 0, 0.05]], [0.2, [0.25, 0, 0.45]], [0.4, [0.75, 0.05, 0.45]],
    [0.6, [0.98, 0.45, 0.05]], [0.8, [1, 0.85, 0.2]], [1, [1, 1, 0.95]],
  ]
  const x = Math.min(1, Math.max(0, t))
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [a, ca] = stops[i - 1]
      const [b, cb] = stops[i]
      const f = (x - a) / (b - a)
      return [ca[0] + (cb[0] - ca[0]) * f, ca[1] + (cb[1] - ca[1]) * f, ca[2] + (cb[2] - ca[2]) * f]
    }
  }
  return stops[stops.length - 1][1]
}
