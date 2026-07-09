import { ITEMS } from './tiles.js';
import { shade } from './utils.js';

/* ---------- ITEM ICON SHAPES ----------
   Small canvas-drawn icons so items read as distinct objects (ore chunk,
   ingot, blade, gem...) instead of flat colored squares. Each drawer paints
   into a size x size canvas passed via ctx. */

function chunk(ctx,color,size){
  ctx.fillStyle = shade(color,-35);
  ctx.beginPath();
  ctx.moveTo(size*0.15,size*0.38); ctx.lineTo(size*0.4,size*0.08); ctx.lineTo(size*0.78,size*0.18);
  ctx.lineTo(size*0.92,size*0.55); ctx.lineTo(size*0.66,size*0.92); ctx.lineTo(size*0.24,size*0.86);
  ctx.lineTo(size*0.08,size*0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size*0.22,size*0.42); ctx.lineTo(size*0.43,size*0.18); ctx.lineTo(size*0.72,size*0.26);
  ctx.lineTo(size*0.82,size*0.52); ctx.lineTo(size*0.6,size*0.78); ctx.lineTo(size*0.3,size*0.72);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(color,55);
  ctx.beginPath();
  ctx.moveTo(size*0.32,size*0.32); ctx.lineTo(size*0.48,size*0.22); ctx.lineTo(size*0.52,size*0.36);
  ctx.closePath(); ctx.fill();
}

// A placeable block: a beveled square tile (lit top/left, shaded bottom/right,
// dark outline) with a little surface texture — reads like a solid block.
function block(ctx,color,size){
  const s=size, m=Math.round(s*0.13), w=s-2*m, b=Math.max(1,Math.round(s*0.09));
  ctx.fillStyle=color; ctx.fillRect(m,m,w,w);
  ctx.fillStyle=shade(color,30);  ctx.fillRect(m,m,w,b); ctx.fillRect(m,m,b,w);              // lit top/left
  ctx.fillStyle=shade(color,-34); ctx.fillRect(m,m+w-b,w,b); ctx.fillRect(m+w-b,m,b,w);      // shaded bottom/right
  ctx.fillStyle=shade(color,-58);                                                            // dark outline
  ctx.fillRect(m,m,w,1); ctx.fillRect(m,m,1,w); ctx.fillRect(m,m+w-1,w,1); ctx.fillRect(m+w-1,m,1,w);
  ctx.fillStyle=shade(color,-16); ctx.fillRect(m+Math.round(w*0.32),m+Math.round(w*0.4),Math.max(1,Math.round(s*0.1)),Math.max(1,Math.round(s*0.1)));
  ctx.fillStyle=shade(color,20);  ctx.fillRect(m+Math.round(w*0.58),m+Math.round(w*0.62),Math.max(1,Math.round(s*0.08)),Math.max(1,Math.round(s*0.08)));
}
// An ore chunk: a grey stone block with nuggets of the ore's colour embedded,
// matching how ore now reads in the world (flecks inside stone).
function ore(ctx,color,size){
  block(ctx,'#7d7d7d',size);
  const s=size, m=Math.round(s*0.13), w=s-2*m;
  const nug=(nx,ny,r)=>{ const x=m+Math.round(w*nx), y=m+Math.round(w*ny), d=Math.max(2,Math.round(s*r));
    ctx.fillStyle=shade(color,-42); ctx.fillRect(x-1,y-1,d+2,d+2);
    ctx.fillStyle=color;            ctx.fillRect(x,y,d,d);
    ctx.fillStyle=shade(color,70);  ctx.fillRect(x,y,Math.max(1,Math.round(s*0.04)),Math.max(1,Math.round(s*0.04))); };
  nug(0.24,0.26,0.15); nug(0.55,0.52,0.13); nug(0.34,0.62,0.1);
}

function bar(ctx,color,size){
  ctx.fillStyle = shade(color,-28);
  ctx.beginPath();
  ctx.moveTo(size*0.13,size*0.42); ctx.lineTo(size*0.3,size*0.28); ctx.lineTo(size*0.72,size*0.28);
  ctx.lineTo(size*0.9,size*0.42); ctx.lineTo(size*0.9,size*0.7); ctx.lineTo(size*0.72,size*0.84);
  ctx.lineTo(size*0.3,size*0.84); ctx.lineTo(size*0.13,size*0.7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size*0.17,size*0.42); ctx.lineTo(size*0.32,size*0.32); ctx.lineTo(size*0.7,size*0.32);
  ctx.lineTo(size*0.85,size*0.42); ctx.lineTo(size*0.85,size*0.68); ctx.lineTo(size*0.7,size*0.8);
  ctx.lineTo(size*0.32,size*0.8); ctx.lineTo(size*0.17,size*0.68); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(color,65);
  ctx.fillRect(size*0.24,size*0.38,size*0.5,size*0.05);
}

function pickaxe(ctx,color,size){
  // Build head+handle in a canonical upright pose (handle straight down the
  // middle, head centered on top), then rotate the whole assembly around the
  // icon's true center so the two pieces stay aligned instead of the handle
  // pivoting off some arbitrary off-center point.
  ctx.save();
  ctx.translate(size*0.5,size*0.5);
  ctx.rotate(-Math.PI/4);
  ctx.translate(-size*0.5,-size*0.5);

  ctx.fillStyle = '#7a5230';
  ctx.fillRect(size*0.455,size*0.32,size*0.09,size*0.56);

  ctx.fillStyle = shade(color,-25);
  ctx.beginPath();
  ctx.moveTo(size*0.1,size*0.34); ctx.quadraticCurveTo(size*0.5,size*0.02,size*0.9,size*0.34);
  ctx.quadraticCurveTo(size*0.5,size*0.24,size*0.1,size*0.34); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size*0.15,size*0.31); ctx.quadraticCurveTo(size*0.5,size*0.08,size*0.85,size*0.31);
  ctx.quadraticCurveTo(size*0.5,size*0.22,size*0.15,size*0.31); ctx.closePath(); ctx.fill();

  ctx.restore();
}

// Sword icon modelled on the reference copper sword (drawn pointing up; the
// held/swing code rotates it): a long metal blade with a dark outline, a bright
// centre highlight and a lit bevel, a metal crossguard with quillon knobs that
// matches the blade, an OLIVE wrapped grip, and a blocky metal pommel. `color`
// tints all the metal so every material (copper/iron/gold…) reads distinct.
function sword(ctx,color,size,def){
  const s=size, cx=s*0.5;
  const dark=shade(color,-46), lit=shade(color,40), hi=shade(color,82);
  const gy=s*0.60, gh=s*0.075;                       // crossguard
  // blade outline
  ctx.fillStyle=dark;
  ctx.beginPath();
  ctx.moveTo(cx, s*0.05); ctx.lineTo(cx+s*0.115, s*0.17); ctx.lineTo(cx+s*0.10, gy);
  ctx.lineTo(cx-s*0.10, gy); ctx.lineTo(cx-s*0.115, s*0.17); ctx.closePath(); ctx.fill();
  // blade fill
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(cx, s*0.085); ctx.lineTo(cx+s*0.088, s*0.185); ctx.lineTo(cx+s*0.078, gy-s*0.012);
  ctx.lineTo(cx-s*0.078, gy-s*0.012); ctx.lineTo(cx-s*0.088, s*0.185); ctx.closePath(); ctx.fill();
  // lit left bevel
  ctx.fillStyle=lit;
  ctx.beginPath();
  ctx.moveTo(cx, s*0.10); ctx.lineTo(cx, gy-s*0.02); ctx.lineTo(cx-s*0.062, gy-s*0.02);
  ctx.lineTo(cx-s*0.078, s*0.19); ctx.closePath(); ctx.fill();
  // bright centre highlight + squared tip glint
  ctx.fillStyle=hi;
  ctx.fillRect(cx-Math.max(1,s*0.018), s*0.15, Math.max(1,s*0.03), gy-s*0.22);
  ctx.fillStyle=lit; ctx.fillRect(cx-s*0.02, s*0.07, s*0.045, s*0.045);
  // crossguard (metal, matches blade) with quillon knobs
  ctx.fillStyle=dark;  ctx.fillRect(cx-s*0.27, gy+gh*0.55, s*0.54, gh*0.6);
  ctx.fillStyle=color; ctx.fillRect(cx-s*0.27, gy, s*0.54, gh);
  ctx.fillStyle=lit;   ctx.fillRect(cx-s*0.27, gy, s*0.54, Math.max(1,s*0.018));
  ctx.fillStyle=color; ctx.fillRect(cx-s*0.31, gy+s*0.004, s*0.06, gh-s*0.008);
  ctx.fillStyle=color; ctx.fillRect(cx+s*0.25, gy+s*0.004, s*0.06, gh-s*0.008);
  // wrapped grip — colour per weapon (brown by default; copper uses an olive wrap)
  const grip=(def && def.grip) || '#6a4326', gripD=shade(grip,-34);
  ctx.fillStyle=grip;  ctx.fillRect(cx-s*0.05, gy+gh, s*0.10, s*0.20);
  ctx.fillStyle=gripD; for(let yy=gy+gh+s*0.028; yy<gy+gh+s*0.18; yy+=s*0.05) ctx.fillRect(cx-s*0.05, yy, s*0.10, Math.max(1,s*0.016));
  // blocky metal pommel (matches blade — no circle)
  ctx.fillStyle=dark;  ctx.fillRect(cx-s*0.06, gy+gh+s*0.20, s*0.12, s*0.06);
  ctx.fillStyle=color; ctx.fillRect(cx-s*0.05, gy+gh+s*0.205, s*0.10, s*0.05);
  ctx.fillStyle=lit;   ctx.fillRect(cx-s*0.035, gy+gh+s*0.21, s*0.035, s*0.018);
}

function trident(ctx,color,size){
  ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = Math.max(1,size*0.06);
  ctx.beginPath(); ctx.moveTo(size*0.5,size*0.42); ctx.lineTo(size*0.5,size*0.95); ctx.stroke();
  ctx.fillStyle = color;
  // three prongs
  ctx.fillRect(size*0.26,size*0.1,size*0.06,size*0.34);
  ctx.fillRect(size*0.47,size*0.05,size*0.06,size*0.39);
  ctx.fillRect(size*0.68,size*0.1,size*0.06,size*0.34);
  ctx.fillRect(size*0.26,size*0.4,size*0.48,size*0.06); // crossbar
  ctx.fillStyle = shade(color,60);
  ctx.beginPath(); ctx.moveTo(size*0.29,size*0.1); ctx.lineTo(size*0.32,size*0.02); ctx.lineTo(size*0.35,size*0.1); ctx.fill();
}

function bow(ctx,color,size){
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1,size*0.07);
  ctx.beginPath(); ctx.arc(size*0.28,size*0.5,size*0.42,-Math.PI*0.36,Math.PI*0.36); ctx.stroke();
  ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = Math.max(1,size*0.025);
  ctx.beginPath(); ctx.moveTo(size*0.58,size*0.16); ctx.lineTo(size*0.58,size*0.84); ctx.stroke();
}

function hammer(ctx,color,size){
  // Same canonical-pose-then-rotate-around-center approach as pickaxe(): draw
  // the head centered on the icon and the handle straight down the middle,
  // then rotate the assembly as one piece.
  ctx.save();
  ctx.translate(size*0.5,size*0.5);
  ctx.rotate(-Math.PI/4);
  ctx.translate(-size*0.5,-size*0.5);

  ctx.fillStyle = '#7a5230';
  ctx.fillRect(size*0.455,size*0.34,size*0.09,size*0.55);

  ctx.fillStyle = shade(color,-30);
  ctx.fillRect(size*0.22,size*0.12,size*0.56,size*0.32);
  ctx.fillStyle = color;
  ctx.fillRect(size*0.25,size*0.15,size*0.5,size*0.24);
  ctx.fillStyle = shade(color,70);
  ctx.fillRect(size*0.28,size*0.17,size*0.44,size*0.05);

  ctx.restore();
}

function flail(ctx,color,size){
  // wooden handle
  ctx.strokeStyle='#6e4a28'; ctx.lineWidth=Math.max(2,size*0.08); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(size*0.16,size*0.9); ctx.lineTo(size*0.36,size*0.56); ctx.stroke();
  // chain
  ctx.strokeStyle='#9a9a9a'; ctx.lineWidth=Math.max(1,size*0.045);
  ctx.beginPath(); ctx.moveTo(size*0.36,size*0.56); ctx.lineTo(size*0.58,size*0.34); ctx.stroke();
  // spiked ball
  const cx=size*0.64, cy=size*0.3, r=size*0.19;
  ctx.fillStyle=shade(color,-25);
  for(let a=0;a<8;a++){ const an=a/8*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(an)*r, cy+Math.sin(an)*r);
    ctx.lineTo(cx+Math.cos(an)*r*1.55, cy+Math.sin(an)*r*1.55);
    ctx.lineTo(cx+Math.cos(an+0.5)*r, cy+Math.sin(an+0.5)*r);
    ctx.closePath(); ctx.fill(); }
  ctx.fillStyle=color; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=shade(color,60); ctx.beginPath(); ctx.arc(cx-r*0.3,cy-r*0.3,r*0.35,0,Math.PI*2); ctx.fill();
}

function boomerang(ctx,color,size){
  ctx.strokeStyle=color; ctx.lineWidth=Math.max(2,size*0.17); ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(size*0.24,size*0.22); ctx.lineTo(size*0.52,size*0.62); ctx.lineTo(size*0.82,size*0.4);
  ctx.stroke();
  ctx.strokeStyle=shade(color,55); ctx.lineWidth=Math.max(1,size*0.055);
  ctx.beginPath();
  ctx.moveTo(size*0.27,size*0.24); ctx.lineTo(size*0.52,size*0.56); ctx.lineTo(size*0.78,size*0.4);
  ctx.stroke();
  ctx.lineCap='butt'; ctx.lineJoin='miter';
}

function arrow(ctx,color,size){
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = Math.max(1,size*0.06);
  ctx.beginPath(); ctx.moveTo(size*0.2,size*0.82); ctx.lineTo(size*0.76,size*0.24); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size*0.76,size*0.24); ctx.lineTo(size*0.58,size*0.2); ctx.lineTo(size*0.8,size*0.02);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.moveTo(size*0.22,size*0.8); ctx.lineTo(size*0.08,size*0.72); ctx.lineTo(size*0.14,size*0.92);
  ctx.closePath(); ctx.fill();
}

function torchIcon(ctx,color,size){
  ctx.fillStyle = '#6b4a2c';
  ctx.fillRect(size*0.42,size*0.38,size*0.16,size*0.54);
  const g = ctx.createRadialGradient(size*0.5,size*0.28,1,size*0.5,size*0.28,size*0.3);
  g.addColorStop(0,'#fff2b0'); g.addColorStop(0.55,color); g.addColorStop(1,'rgba(255,120,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(size*0.5,size*0.28,size*0.28,0,Math.PI*2); ctx.fill();
}

function potion(ctx,color,size){
  ctx.fillStyle = '#cfd8e0'; // neck
  ctx.fillRect(size*0.42,size*0.12,size*0.16,size*0.16);
  ctx.fillStyle = shade(color,-30);
  ctx.beginPath(); ctx.arc(size*0.5,size*0.62,size*0.28,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(size*0.5,size*0.63,size*0.22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = shade(color,60);
  ctx.beginPath(); ctx.arc(size*0.42,size*0.55,size*0.06,0,Math.PI*2); ctx.fill(); // shine
  ctx.fillStyle = '#8a6a3c';
  ctx.fillRect(size*0.4,size*0.08,size*0.2,size*0.06); // cork
}

function coin(ctx,color,size){
  ctx.fillStyle = shade(color,-30);
  ctx.beginPath(); ctx.arc(size*0.5,size*0.5,size*0.4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(size*0.5,size*0.5,size*0.33,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = shade(color,55);
  ctx.beginPath(); ctx.arc(size*0.38,size*0.38,size*0.08,0,Math.PI*2); ctx.fill();
}

function gem(ctx,color,size){
  ctx.fillStyle = shade(color,-28);
  ctx.beginPath();
  ctx.moveTo(size*0.5,size*0.06); ctx.lineTo(size*0.87,size*0.4); ctx.lineTo(size*0.65,size*0.94);
  ctx.lineTo(size*0.35,size*0.94); ctx.lineTo(size*0.13,size*0.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size*0.5,size*0.18); ctx.lineTo(size*0.72,size*0.42); ctx.lineTo(size*0.58,size*0.82);
  ctx.lineTo(size*0.42,size*0.82); ctx.lineTo(size*0.28,size*0.42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(color,70);
  ctx.beginPath();
  ctx.moveTo(size*0.5,size*0.22); ctx.lineTo(size*0.58,size*0.4); ctx.lineTo(size*0.42,size*0.4);
  ctx.closePath(); ctx.fill();
}

function brickIcon(ctx,color,size){
  ctx.fillStyle = shade(color,-25); ctx.fillRect(0,0,size,size);
  ctx.fillStyle = color;
  ctx.fillRect(size*0.04,size*0.06,size*0.42,size*0.38);
  ctx.fillRect(size*0.54,size*0.06,size*0.42,size*0.38);
  ctx.fillRect(size*0.26,size*0.56,size*0.44,size*0.4);
}

function tableIcon(ctx,color,size){
  ctx.fillStyle = shade(color,25);
  ctx.fillRect(size*0.08,size*0.32,size*0.84,size*0.14);
  ctx.fillStyle = shade(color,-30);
  ctx.fillRect(size*0.16,size*0.46,size*0.1,size*0.42);
  ctx.fillRect(size*0.74,size*0.46,size*0.1,size*0.42);
}

function furnaceIcon(ctx,color,size){
  ctx.fillStyle = shade(color,-15);
  ctx.fillRect(size*0.12,size*0.08,size*0.76,size*0.84);
  ctx.fillStyle = '#181818';
  ctx.fillRect(size*0.3,size*0.42,size*0.4,size*0.36);
  const g = ctx.createRadialGradient(size*0.5,size*0.62,1,size*0.5,size*0.62,size*0.22);
  g.addColorStop(0,'#ffcf80'); g.addColorStop(1,'rgba(255,120,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(size*0.5,size*0.62,size*0.2,0,Math.PI*2); ctx.fill();
}

function pick(id, def){
  if(id==='torch') return torchIcon;
  if(id==='coin') return coin;
  if(id==='arrow') return arrow;
  if(id==='crafting_table') return tableIcon;
  if(id==='furnace') return furnaceIcon;
  if(id==='brick') return brickIcon;
  if(id==='water_trident') return trident;
  if(def.heal) return potion;
  if(def.tool==='pick') return pickaxe;
  if(def.tool==='sword') return sword;
  if(def.tool==='bow') return bow;
  if(def.tool==='hammer') return hammer;
  if(def.tool==='flail') return flail;
  if(def.tool==='boomerang') return boomerang;
  if(id.endsWith('_bar')) return bar;
  if(id.endsWith('_ore') || id==='coal') return ore;
  if(def.place) return block;          // placeable blocks (dirt/stone/wood/obsidian/…)
  if(def.glow) return gem;
  return chunk;
}

export function drawItemIcon(ctx, id, size){
  const def = ITEMS[id];
  if(!def) return;
  pick(id,def)(ctx, def.color, size, def);
}

export function iconEl(id, size=32){
  const cv = document.createElement('canvas');
  cv.className = 'icon';
  cv.width = size; cv.height = size;
  const def = ITEMS[id];
  if(def && def.glow) cv.style.boxShadow = '0 0 8px '+def.color;
  drawItemIcon(cv.getContext('2d'), id, size);
  return cv;
}
