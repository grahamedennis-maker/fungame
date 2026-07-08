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

function ore(ctx,color,size){
  chunk(ctx,color,size);
  ctx.fillStyle = shade(color,80);
  ctx.fillRect(size*0.6,size*0.5,size*0.06,size*0.06);
  ctx.fillRect(size*0.4,size*0.62,size*0.05,size*0.05);
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

function sword(ctx,color,size){
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size*0.5,size*0.05); ctx.lineTo(size*0.62,size*0.56); ctx.lineTo(size*0.38,size*0.56);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(color,-35);
  ctx.fillRect(size*0.47,size*0.05,size*0.06,size*0.5);
  ctx.fillStyle = '#8a7a3c';
  ctx.fillRect(size*0.26,size*0.56,size*0.48,size*0.08);
  ctx.fillStyle = '#5a3d22';
  ctx.fillRect(size*0.43,size*0.64,size*0.14,size*0.3);
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
  if(def.glow) return gem;
  return chunk;
}

export function drawItemIcon(ctx, id, size){
  const def = ITEMS[id];
  if(!def) return;
  pick(id,def)(ctx, def.color, size);
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
