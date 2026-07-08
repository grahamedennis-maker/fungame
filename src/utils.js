/* ---------- HELPERS ---------- */
export function rand(min,max){ return Math.random()*(max-min)+min; }
export function ri(min,max){ return Math.floor(rand(min,max+1)); }
export function chance(p){ return Math.random()<p; }
export function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// Deterministic pseudo-random value in [0,1) for a pair of integers, used to
// give tiles stable per-cell texture (speckles, cracks, grain) that doesn't
// flicker between frames the way Math.random() would. Uses a cheap integer
// bit-mix (Math.imul) rather than Math.sin — this runs several times per tile
// per frame, so avoiding the trig call is a real render-time saving.
export function hash2(x,y){
  let h = Math.imul((x|0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((y|0) ^ 0x27d4eb2f, 0xc2b2ae35);
  h = Math.imul(h ^ (h>>>15), 0x85ebca6b);
  h ^= h>>>13;
  return (h>>>0) / 4294967296;
}

// Smooth value noise + fractal (fbm) built on hash2. Continuous in [0,1),
// unlike hash2's per-integer jumps. Used only when baking tile textures at
// load, so the smoothstep/multi-octave cost never touches the frame loop.
export function valueNoise(x,y){
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x-xi, yf = y-yi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);   // smoothstep
  const a = hash2(xi,yi),   b = hash2(xi+1,yi);
  const c = hash2(xi,yi+1), d = hash2(xi+1,yi+1);
  return a*(1-u)*(1-v) + b*u*(1-v) + c*(1-u)*v + d*u*v;
}
export function fbm(x,y,oct=2){
  let sum=0, amp=0.5, freq=1, norm=0;
  for(let i=0;i<oct;i++){ sum += amp*valueNoise(x*freq,y*freq); norm += amp; amp*=0.5; freq*=2; }
  return sum/norm;
}

// Lighten (amt>0) or darken (amt<0) a '#rrggbb' color by amt (-255..255).
export function shade(hex, amt){
  const num = parseInt(hex.slice(1),16);
  let r = (num>>16) + amt, g = ((num>>8)&0xff) + amt, b = (num&0xff) + amt;
  r = clamp(r,0,255); g = clamp(g,0,255); b = clamp(b,0,255);
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
