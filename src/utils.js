/* ---------- HELPERS ---------- */
export function rand(min,max){ return Math.random()*(max-min)+min; }
export function ri(min,max){ return Math.floor(rand(min,max+1)); }
export function chance(p){ return Math.random()<p; }
export function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
