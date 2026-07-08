/* ---------- HELPERS ---------- */
export function rand(min,max){ return Math.random()*(max-min)+min; }
export function ri(min,max){ return Math.floor(rand(min,max+1)); }
export function chance(p){ return Math.random()<p; }
export function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// Deterministic pseudo-random value in [0,1) for a pair of integers, used to
// give tiles stable per-cell texture (speckles, cracks, grain) that doesn't
// flicker between frames the way Math.random() would.
export function hash2(x,y){
  const s = Math.sin(x*127.1 + y*311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Lighten (amt>0) or darken (amt<0) a '#rrggbb' color by amt (-255..255).
export function shade(hex, amt){
  const num = parseInt(hex.slice(1),16);
  let r = (num>>16) + amt, g = ((num>>8)&0xff) + amt, b = (num&0xff) + amt;
  r = clamp(r,0,255); g = clamp(g,0,255); b = clamp(b,0,255);
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
