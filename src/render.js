import { WORLD_W, WORLD_H, TILE, AIR, DIRT, GRASS, STONE, WOODT, LEAF,
         BRICK, BRICKGLOW, CHEST, ALTAR, TORCH, CRAFT_TABLE, FURNACE, SAND, DUNGFLOOR,
         LADDER, VINE, TREEWOOD, WATER, DRIPSTONE, GLOWSHROOM, JUNGLELEAF, JUNGLEWOOD } from './constants.js';
import { clamp, hash2, shade } from './utils.js';
import { state, world } from './state.js';
import { TILES, ITEMS } from './tiles.js';
import { MOB_TYPES, dayFrac } from './mobs.js';
import { BOSS_TYPES } from './boss.js';
import { canvas, ctx } from './canvas.js';
import { hotbarItem } from './inventory.js';
import { drawItemIcon } from './icons.js';
import { ATLAS_IDS, drawBodyTile, drawEdgeTile, buildAtlas } from './textures.js';

// Cached radial-glow sprites. Building a CanvasGradient + fill for every glowing
// tile, torch and light source every frame is a major per-frame cost; instead we
// bake each (color, radius) gradient into a small offscreen canvas once and blit
// it with drawImage, which is far cheaper and reused across all matching sources.
const glowSprites = new Map();
function glowSprite(color, radius, inner){
  const key = color+'|'+radius+'|'+(inner||0);
  let s = glowSprites.get(key);
  if(s) return s;
  const d = Math.ceil(radius*2);
  s = document.createElement('canvas'); s.width=d; s.height=d;
  const g = s.getContext('2d');
  const rg = g.createRadialGradient(radius,radius,inner||0, radius,radius,radius);
  rg.addColorStop(0,color); rg.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=rg; g.fillRect(0,0,d,d);
  glowSprites.set(key,s);
  return s;
}
// blit a cached glow centered at (cx,cy)
function drawGlow(g, color, radius, cx, cy, inner){
  const spr = glowSprite(color, radius, inner);
  g.drawImage(spr, cx-radius, cy-radius);
}

// Build a rounded-rect path over one tile cell, rounding only the corners that
// are exposed to open space so terrain reads as organic rather than a hard grid.
// tl/tr/br/bl are booleans (round that corner) — radius r.
// A cell is "open" (not a solid neighbor) if it's off-world, air, or a
// non-solid tile — used to decide which tile corners to round.
function tileOpen(tx,ty){
  if(tx<0||tx>=WORLD_W||ty<0||ty>=WORLD_H) return false;
  const t = world.grid[ty][tx];
  return t===AIR || !(TILES[t] && TILES[t].solid);
}
// Cross-type blend: where an atlas tile borders a DIFFERENT solid atlas tile
// (e.g. dirt/stone, stone/sand, grass/dirt), dither a few pixels of the
// neighbour's colour across the shared edge so the layers bleed into each other
// (8-bit-style transitions) instead of meeting at a hard square line.
function blendEdge(t, tx, ty, dx, dy){
  const nb = [[tx,ty-1,0],[tx,ty+1,1],[tx-1,ty,2],[tx+1,ty,3]];
  for(const [nx,ny,side] of nb){
    if(nx<0||ny<0||nx>=WORLD_W||ny>=WORLD_H) continue;
    const nt = world.grid[ny][nx];
    if(nt===t || !ATLAS_IDS.has(nt)) continue;
    const nd = TILES[nt]; if(!nd || !nd.solid) continue;
    ctx.fillStyle = nd.color;
    for(let i=0;i<TILE;i+=2){
      const h = hash2(tx*7+i+side, ty*11+side*3);
      if(h<0.5) continue;
      const d = h<0.8 ? 1 : 3; // most specks shallow, a few deeper -> ragged transition
      if(side===0) ctx.fillRect(dx+i, dy, 2, d);
      else if(side===1) ctx.fillRect(dx+i, dy+TILE-d, 2, d);
      else if(side===2) ctx.fillRect(dx, dy+i, d, 2);
      else ctx.fillRect(dx+TILE-d, dy+i, d, 2);
    }
  }
}
function roundTilePath(g, x, y, s, r, tl, tr, br, bl){
  g.beginPath();
  g.moveTo(x + (tl?r:0), y);
  g.lineTo(x + s - (tr?r:0), y);
  if(tr) g.quadraticCurveTo(x+s, y, x+s, y+r);
  g.lineTo(x+s, y + s - (br?r:0));
  if(br) g.quadraticCurveTo(x+s, y+s, x+s-r, y+s);
  g.lineTo(x + (bl?r:0), y+s);
  if(bl) g.quadraticCurveTo(x, y+s, x, y+s-r);
  g.lineTo(x, y + (tl?r:0));
  if(tl) g.quadraticCurveTo(x, y, x+r, y);
  g.closePath();
}

const SWING_DUR = 240;
// Terraria-style overhead melee sweep, expressed as the icon's rotation (the
// upright icon points straight up = 0). The blade winds up behind the head and
// sweeps down in front of the player, pivoting at the grip.
const SWING_START = -0.63;   // up-and-back
const SWING_END   =  2.37;   // down-and-front  (≈ 172° arc)
const SWING_REST  =  0.40;   // idle ready pose (blade up, slightly forward)

// The bright crescent smear that follows the blade through its arc — the
// signature Terraria "slash". Drawn in the hand's (facing-flipped) frame as a
// widening, brightening arc from the swing's start to the blade's current angle.
function drawSlash(hx, hy, facing, rotNow, size, def){
  const R = size*0.92;
  const a0 = SWING_START - Math.PI/2;          // icon rot -> actual blade angle
  const a1 = rotNow      - Math.PI/2;
  const col = (def && def.glow) ? '#ffffff' : (def && def.color) || '#ffe6a0';
  ctx.save();
  ctx.translate(hx,hy);
  if(facing<0) ctx.scale(-1,1);
  ctx.lineCap='round';
  const steps = 10;
  for(let i=0;i<steps;i++){
    const f0 = i/steps, f1 = (i+1)/steps;       // f=1 is the leading (current) edge
    ctx.globalAlpha = 0.55*f1*f1;               // brightest & thickest at the tip
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5 + 5.5*f1;
    ctx.beginPath();
    ctx.arc(0,0,R, a0+(a1-a0)*f0, a0+(a1-a0)*f1);
    ctx.stroke();
  }
  ctx.globalAlpha=1; ctx.lineWidth=1; ctx.lineCap='butt';
}

function drawHeldTool(p, psx, psy){
  const held = hotbarItem();
  if(!held) return;
  const def = ITEMS[held.id];
  const tool = def && def.tool;
  const t = (performance.now() - state.swingStart) / SWING_DUR;
  const active = t>=0 && t<1;
  const size = 22;
  const handX = psx + p.w/2 + p.facing*4, handY = psy + p.h*0.44;

  // Bow: aim the weapon toward the cursor with a short recoil kick,
  // instead of an overhead swing.
  if(tool==='bow'){
    const ang = Math.atan2(state.mouse.y - handY, state.mouse.x - handX);
    const kick = active ? Math.sin(t*Math.PI)*3 : 0;
    ctx.save();
    ctx.translate(handX - Math.cos(ang)*kick, handY - Math.sin(ang)*kick);
    ctx.rotate(ang + Math.PI/2);           // icon points up at 0 -> align to aim
    ctx.translate(-size*0.5, -size*0.62);
    drawItemIcon(ctx, held.id, size);
    ctx.restore();
    return;
  }

  // Melee (sword / hammer / pick / bare hand): wide overhead arc pivoting at the
  // grip, eased so it snaps through the middle of the swing.
  const e = active ? (1 - (1-t)*(1-t)) : 1;                 // ease-out
  const rot = active ? (SWING_START + (SWING_END-SWING_START)*e) : SWING_REST;
  if(active && (tool==='sword' || tool==='hammer' || tool==='flail')) drawSlash(handX, handY, p.facing, rot, size, def);
  ctx.save();
  ctx.translate(handX,handY);
  if(p.facing<0) ctx.scale(-1,1);
  ctx.rotate(rot);
  ctx.translate(-size*0.5, -size*0.82);       // pivot at the grip so the blade sweeps out
  drawItemIcon(ctx, held.id, size);
  ctx.restore();
}

/* ---------- RENDERING ---------- */
function skyColor(){
  const f = dayFrac(); // 0 = dawn->day, 0.5 = dusk->night
  // build a soft cycle: day 0-0.5, night 0.5-1
  const t = Math.sin(f*Math.PI*2 - Math.PI/2)*0.5+0.5; // 0 at deepest night, 1 at noon
  const topDay=[100,181,246], topNight=[10,10,30];
  const botDay=[190,230,255], botNight=[30,20,55];
  const lerp=(a,b,x)=>Math.round(a+(b-a)*x);
  const top = `rgb(${lerp(topNight[0],topDay[0],t)},${lerp(topNight[1],topDay[1],t)},${lerp(topNight[2],topDay[2],t)})`;
  const bot = `rgb(${lerp(botNight[0],botDay[0],t)},${lerp(botNight[1],botDay[1],t)},${lerp(botNight[2],botDay[2],t)})`;
  return {top,bot,t};
}

function drawTorchTile(sx,sy){
  ctx.fillStyle = '#5a3d22';
  ctx.fillRect(sx+7,sy+6,2,10);
  const g = ctx.createRadialGradient(sx+8,sy+5,1,sx+8,sy+5,9);
  g.addColorStop(0,'#fff2b0'); g.addColorStop(0.5,'#ff9a3c'); g.addColorStop(1,'rgba(255,120,20,0)');
  ctx.fillStyle=g;
  ctx.beginPath(); ctx.arc(sx+8,sy+5,8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff2b0';
  ctx.fillRect(sx+7,sy+3,2,3);
}

function drawLadderTile(sx,sy){
  ctx.fillStyle = '#9c6b3a';
  ctx.fillRect(sx+2,sy,3,TILE+1); ctx.fillRect(sx+TILE-5,sy,3,TILE+1); // rails
  ctx.fillStyle = '#7a4f28';
  ctx.fillRect(sx+2,sy+3,TILE-4,2); ctx.fillRect(sx+2,sy+10,TILE-4,2);  // rungs
}

function drawVineTile(sx,sy){
  ctx.fillStyle = '#357a30';
  ctx.fillRect(sx+6,sy,4,TILE+1); // main strand
  ctx.fillStyle = '#4fae44';
  const h = hash2(sx,sy);
  ctx.fillRect(sx+(h>0.5?1:11),sy+3,4,3);  // leaf
  ctx.fillRect(sx+(h>0.5?10:2),sy+10,4,3); // leaf
}

// Translucent water: cave background behind it, blue tint, and a wavy surface
// highlight where its top is open.
function drawWaterTile(tx,ty,sx,sy){
  const surfY = world.surface[tx];
  if(ty > surfY+1){ const depth=ty-surfY, h=hash2(tx,ty);
    ctx.fillStyle = depth<9 ? (h>0.5?'#4a3320':'#402c1b') : (h>0.5?'#33333c':'#2b2b33');
    ctx.fillRect(sx,sy,TILE+1,TILE+1); }
  ctx.fillStyle = 'rgba(38,108,190,0.6)';
  ctx.fillRect(sx,sy,TILE+1,TILE+1);
  const above = world.grid[ty-1] ? world.grid[ty-1][tx] : 0;
  if(above!==WATER){
    ctx.fillStyle='rgba(150,215,255,0.5)';
    ctx.fillRect(sx, sy + ((Math.floor(state.time/280)+tx)%2), TILE+1, 2); // gentle ripple
  }
}
// Dripstone spike — points down as a stalactite (solid ceiling above) or up as a
// stalagmite (solid floor below).
function drawDripstone(tx,ty,sx,sy){
  const down = !tileOpen(tx,ty-1); // solid above => hanging stalactite
  ctx.fillStyle = '#6f6a63';
  ctx.beginPath();
  if(down){ ctx.moveTo(sx+2,sy); ctx.lineTo(sx+14,sy); ctx.lineTo(sx+8,sy+15); }
  else    { ctx.moveTo(sx+2,sy+TILE); ctx.lineTo(sx+14,sy+TILE); ctx.lineTo(sx+8,sy+1); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade('#6f6a63',-22);
  ctx.fillRect(sx+7, down?sy+2:sy+5, 2, 9);
  ctx.fillStyle = shade('#6f6a63',26);
  ctx.fillRect(down?sx+4:sx+9, down?sy+1:sy+4, 2, 4);
}
// Glowing cave mushroom (soft light + capped stalk).
function drawGlowshroom(sx,sy){
  drawGlow(ctx, '#7fffe0', 12, sx+8, sy+8, 1);
  ctx.fillStyle='#e6ded0'; ctx.fillRect(sx+7,sy+8,2,7);          // stalk
  ctx.fillStyle='#5fd0b8'; ctx.beginPath(); ctx.arc(sx+8,sy+7,4,0,Math.PI*2); ctx.fill(); // cap
  ctx.fillStyle='#bfffe8'; ctx.fillRect(sx+6,sy+5,1,1); ctx.fillRect(sx+10,sy+6,1,1); // spots
}

function isWood(tx,ty){ const row=world.grid[ty]; const tt=row?row[tx]:0; return tt===TREEWOOD||tt===JUNGLEWOOD; }
// Tree trunk/branch rendered as rounded, cylindrically-shaded bark instead of a
// square block — vertical runs are trunks, horizontal runs are branch limbs.
function drawBark(def, tx, ty, sx, sy){
  const col = def.color;
  const wU=isWood(tx,ty-1), wD=isWood(tx,ty+1), wL=isWood(tx-1,ty), wR=isWood(tx+1,ty);
  if(!wU && !wD && (wL||wR)){                      // horizontal branch / root limb
    const y0=sy+4, hh=TILE-8;
    ctx.fillStyle=shade(col,-32); ctx.fillRect(sx, y0-1, TILE+1, hh+2);
    ctx.fillStyle=col;            ctx.fillRect(sx, y0, TILE+1, hh);
    ctx.fillStyle=shade(col,20);  ctx.fillRect(sx, y0, TILE+1, 1);
    ctx.fillStyle=shade(col,-20); ctx.fillRect(sx, y0+hh-1, TILE+1, 1);
    return;
  }
  // vertical trunk: a rounded column ~12px wide, 2px of background at each side
  const x0=sx+2, w=TILE-4, topCap=!wU?2:0, botCap=!wD?2:0;
  ctx.fillStyle=shade(col,-34); ctx.fillRect(x0-1, sy, w+2, TILE+1);           // dark rounded edge
  ctx.fillStyle=col;            ctx.fillRect(x0, sy+topCap, w, TILE+1-topCap-botCap);
  ctx.fillStyle=shade(col,22);  ctx.fillRect(x0+2, sy, 2, TILE+1);              // lit side (cylinder)
  ctx.fillStyle=shade(col,-22); ctx.fillRect(x0+w-3, sy, 2, TILE+1);           // shaded side
  ctx.fillStyle=shade(col,-14); ctx.fillRect(x0+5, sy, 1, TILE+1);             // bark grain
  const h=hash2(tx,ty);
  if(h>0.82){ ctx.fillStyle=shade(col,-30); ctx.fillRect(x0+4, sy+6, 3,3); ctx.fillStyle=shade(col,12); ctx.fillRect(x0+5, sy+7, 1,1); } // knot
}
// Leaves as an overlapping foliage blob so the canopy reads as a smooth organic
// mass rather than a grid of square clumps.
function drawFoliage(def, tx, ty, sx, sy){
  const col=def.color, cx=sx+8, cy=sy+8;
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2); ctx.fill(); // blobs merge into neighbours
  const h=hash2(tx,ty), h2=hash2(tx*3+1, ty*5+2);
  ctx.fillStyle=shade(col,20);  ctx.beginPath(); ctx.arc(cx-3,cy-3,3.2,0,Math.PI*2); ctx.fill(); // sun highlight
  ctx.fillStyle=shade(col,-26); ctx.beginPath(); ctx.arc(cx+3,cy+3,2.6,0,Math.PI*2); ctx.fill(); // shadow clump
  if(h*h2>0.72){ ctx.fillStyle='#e05a6a'; ctx.fillRect(cx-1,cy-1,2,2); }        // berry
}

// Overhanging grass blades + the occasional flower, drawn above a surface-exposed
// grass/snow tile. The tile body/top band is baked into the atlas; only these
// tufts that poke ABOVE the cell stay a (cheap, surface-only) runtime pass.
function drawGrassOverhang(t, def, sx, sy, tx, ty){
  const top = def.top || def.color;
  // Bumpy grass fringe along the whole top edge so the surface line is ragged
  // and organic, not a ruler-straight square edge.
  ctx.fillStyle = top;
  for(let i=0;i<TILE;i+=2){
    const hh = hash2(tx*13+i, ty*7);
    const up = hh<0.32 ? 0 : (hh<0.72 ? 1 : 2); // 0-2px grass bumps
    if(up) ctx.fillRect(sx+i, sy-up, 2, up);
  }
  const h = hash2(tx,ty), h2 = hash2(tx*3.1+7, ty*5.7+3), h3 = hash2(tx*5+3, ty*2+9);
  ctx.fillStyle = shade(top,-26); // grass blades poking up (varied heights)
  if(h>0.4) ctx.fillRect(sx+2+Math.floor(h*3), sy-4, 2, 4);
  if(h2>0.5) ctx.fillRect(sx+9+Math.floor(h2*4), sy-3, 2, 3);
  if(h3>0.62) ctx.fillRect(sx+6+Math.floor(h3*4), sy-6, 1, 6); // occasional tall blade
  if(t===GRASS && h*h2>0.5){ // lush forest wildflowers (varied colors, on a stem)
    const cols=['#e8637f','#e8d24a','#8a6ae8','#f4f4f4','#e88a3c'];
    const fc = cols[Math.floor(h3*997)%cols.length];
    const fx = sx+4+Math.floor(h*7);
    ctx.fillStyle = shade(top,-30); ctx.fillRect(fx, sy-4, 1, 4);          // stem
    ctx.fillStyle = fc; ctx.fillRect(fx-1, sy-6, 3, 2); ctx.fillRect(fx, sy-7, 1, 3); // petals
    ctx.fillStyle = '#ffe6a0'; ctx.fillRect(fx, sy-6, 1, 1);               // center
  }
}

function roundBlob(x,y,w,h,r){
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,   x+w,y+h, r);
  ctx.arcTo(x+w,y+h, x,  y+h, r);
  ctx.arcTo(x,  y+h, x,  y,   r);
  ctx.arcTo(x,  y,   x+w,y,   r);
  ctx.closePath(); ctx.fill();
}

// Bosses rendered as menacing Terraria-style creatures: a large themed body, a
// big glowing eye whose pupil tracks the player, and a jagged fanged maw.
function drawBoss(b, bd){
  const sx=b.x-state.camX, sy=b.y-state.camY, W=b.w, H=b.h;
  const cx=sx+W/2, cy=sy+H/2;
  const p=state.player;
  const look=Math.atan2((p.y+p.h/2)-(b.y+b.h/2), (p.x+p.w/2)-(b.x+b.w/2));
  const body=b.mode==='charge'?bd.chargeColor:bd.color;

  // ---- BODY (themed silhouette) ----
  ctx.fillStyle = body;
  if(b.type==='magma'){
    roundBlob(sx+2,sy+6,W-4,H-6,12);
    ctx.fillStyle=shade(body,-32); // horns
    ctx.beginPath(); ctx.moveTo(sx+10,sy+10); ctx.lineTo(sx-4,sy-14); ctx.lineTo(sx+24,sy+6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx+W-10,sy+10); ctx.lineTo(sx+W+4,sy-14); ctx.lineTo(sx+W-24,sy+6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#ffcf5a'; ctx.lineWidth=2; // lava cracks
    ctx.beginPath(); ctx.moveTo(sx+14,sy+22); ctx.lineTo(sx+22,sy+36); ctx.lineTo(sx+16,sy+H-6);
    ctx.moveTo(sx+W-16,sy+24); ctx.lineTo(sx+W-26,sy+40); ctx.stroke(); ctx.lineWidth=1;
  } else if(b.type==='frost'){
    ctx.beginPath(); // faceted ice golem
    ctx.moveTo(cx,sy-6); ctx.lineTo(sx+W,sy+16); ctx.lineTo(sx+W-6,sy+H);
    ctx.lineTo(sx+6,sy+H); ctx.lineTo(sx,sy+16); ctx.closePath(); ctx.fill();
    ctx.fillStyle=shade(body,55); // shard crown
    for(let i=0;i<3;i++){ const ix=cx-16+i*16;
      ctx.beginPath(); ctx.moveTo(ix,sy+4); ctx.lineTo(ix+4,sy-16); ctx.lineTo(ix+8,sy+4); ctx.closePath(); ctx.fill(); }
    for(let i=0;i<4;i++){ const ix=sx+12+i*((W-24)/3); // icicles
      ctx.beginPath(); ctx.moveTo(ix,sy+H-3); ctx.lineTo(ix+6,sy+H-3); ctx.lineTo(ix+3,sy+H+12); ctx.closePath(); ctx.fill(); }
  } else {
    // storm / guardian: a floating eyeball-orb with a jagged lightning crown
    roundBlob(sx+2,sy+2,W-4,H-4,Math.min(W,H)/2);
    ctx.fillStyle=shade(body,-28);
    for(let i=0;i<5;i++){ const ix=sx+8+i*((W-16)/4);
      ctx.beginPath(); ctx.moveTo(ix,sy+6); ctx.lineTo(ix+4,sy-12); ctx.lineTo(ix+8,sy+6); ctx.closePath(); ctx.fill(); }
  }

  // ---- BIG TRACKING EYE ----
  const eyeR=Math.min(W,H)*0.30, eyeX=cx, eyeY=cy-H*0.06;
  ctx.fillStyle='#f4f0ff';
  ctx.beginPath(); ctx.arc(eyeX,eyeY,eyeR,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(170,50,80,0.45)'; ctx.lineWidth=1; // blood veins
  for(let i=0;i<4;i++){ const a=i/4*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(eyeX+Math.cos(a)*eyeR*0.35, eyeY+Math.sin(a)*eyeR*0.35);
    ctx.lineTo(eyeX+Math.cos(a+0.3)*eyeR, eyeY+Math.sin(a+0.3)*eyeR); ctx.stroke(); }
  const ix2=eyeX+Math.cos(look)*eyeR*0.42, iy2=eyeY+Math.sin(look)*eyeR*0.42; // iris follows player
  const g=ctx.createRadialGradient(ix2,iy2,1,ix2,iy2,eyeR*0.65);
  g.addColorStop(0,bd.eye); g.addColorStop(1,shade(bd.eye,-60));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ix2,iy2,eyeR*0.6,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#0a0510'; ctx.beginPath(); ctx.arc(ix2,iy2,eyeR*0.28,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(ix2-eyeR*0.18,iy2-eyeR*0.18,eyeR*0.12,0,Math.PI*2); ctx.fill();

  // ---- JAGGED MAW ----
  const mawW=W*0.5, mawX=cx-mawW/2, mawY=sy+H-8, teeth=5;
  ctx.fillStyle='#1a0a12'; ctx.fillRect(mawX,mawY,mawW,6);
  ctx.fillStyle='#f4f0ff';
  for(let i=0;i<teeth;i++){ const tx=mawX+i*(mawW/teeth);
    ctx.beginPath(); ctx.moveTo(tx,mawY); ctx.lineTo(tx+mawW/teeth/2,mawY+5); ctx.lineTo(tx+mawW/teeth,mawY); ctx.closePath(); ctx.fill(); }
}

// Parallax sky: celestial body, stars, drifting clouds and distant hills.
function drawBackground(sky){
  const f = dayFrac();
  const night = f > 0.5;
  // stars fade in as the sky darkens (sky.t: 0 = deep night, 1 = noon)
  if(sky.t < 0.55){
    const a = (0.55 - sky.t)*1.8;
    for(let i=0;i<90;i++){
      const sx = (i*151.3) % canvas.width;
      const sy = (i*97.1) % (canvas.height*0.62);
      const tw = Math.sin(state.time*0.0015 + i*1.3)*0.5+0.5;
      ctx.fillStyle = `rgba(255,255,255,${a*tw})`;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
  // sun / moon arcing across the sky
  const phase = night ? (f-0.5)*2 : f*2;
  const bx = canvas.width*phase;
  const by = canvas.height*0.52 - Math.sin(phase*Math.PI)*canvas.height*0.4;
  if(night){
    ctx.fillStyle = '#e8ecff';
    ctx.beginPath(); ctx.arc(bx,by,15,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = sky.top;
    ctx.beginPath(); ctx.arc(bx+6,by-3,13,0,Math.PI*2); ctx.fill(); // crescent
  } else {
    const g = ctx.createRadialGradient(bx,by,4,bx,by,34);
    g.addColorStop(0,'#fff6c8'); g.addColorStop(0.4,'#ffe071'); g.addColorStop(1,'rgba(255,224,113,0)');
    ctx.fillStyle=g; ctx.fillRect(bx-40,by-40,80,80);
  }
  // two parallax hill layers (drawn only where sky shows — behind the world)
  const dayBright = clamp(sky.t+0.15,0.15,1);
  function hills(baseFrac, amp, par, shade){
    const baseY = canvas.height*baseFrac;
    ctx.beginPath(); ctx.moveTo(0,canvas.height);
    const off = state.camX*par;
    for(let x=0;x<=canvas.width;x+=14){
      const wx = x+off;
      const y = baseY + Math.sin(wx*0.006)*amp + Math.sin(wx*0.017+2)*amp*0.4;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(canvas.width,canvas.height); ctx.closePath();
    const c = Math.round(shade*dayBright);
    ctx.fillStyle = `rgb(${c},${c+14},${Math.round((c+30)*0.9)})`;
    ctx.fill();
  }
  hills(0.62, 46, 0.25, 70);
  hills(0.72, 34, 0.45, 52);
  // drifting clouds (fade out at night)
  const cloudA = clamp((sky.t-0.2)*1.4,0,0.8);
  if(cloudA>0.02){
    ctx.fillStyle = `rgba(255,255,255,${cloudA})`;
    for(let i=0;i<7;i++){
      const span = canvas.width+260;
      let cx = ((i*230 + state.time*0.006*(1+i*0.08)) % span) - 130;
      const cy = 40 + (i*53 % Math.max(1,canvas.height*0.32));
      for(const [ox,oy,r] of [[0,0,20],[20,4,26],[44,0,18],[22,-8,16]]) {
        ctx.beginPath(); ctx.arc(cx+ox,cy+oy,r,0,Math.PI*2); ctx.fill();
      }
    }
  }
}

let offCanvas = null;

export function render(){
  buildAtlas(); // idempotent safety net: guarantees the tile atlas exists before any blit
  const p = state.player;
  state.camX = clamp(p.x - canvas.width/2, 0, WORLD_W*TILE - canvas.width);
  state.camY = clamp(p.y - canvas.height/2, -200, WORLD_H*TILE - canvas.height);

  const sky = skyColor();
  const grad = ctx.createLinearGradient(0,0,0,canvas.height);
  grad.addColorStop(0, sky.top); grad.addColorStop(1, sky.bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  drawBackground(sky);

  const x0 = Math.max(0, Math.floor(state.camX/TILE)-1);
  const x1 = Math.min(WORLD_W-1, Math.ceil((state.camX+canvas.width)/TILE)+1);
  const y0 = Math.max(0, Math.floor(state.camY/TILE)-1);
  const y1 = Math.min(WORLD_H-1, Math.ceil((state.camY+canvas.height)/TILE)+1);

  const underground = p.y/TILE > (world.surface[clamp(Math.floor(p.x/TILE),0,WORLD_W-1)]+3);

  // Light sources gathered during the single tile pass below, so the torch-glow
  // and darkness passes iterate these short lists instead of re-scanning the
  // whole viewport grid two more times. Screen-space centers (valid this frame).
  const torchLights = [];  // {x,y}
  const dimLights = [];     // {x,y} — brick/altar ambient glow (for darkness)

  for(let ty=y0; ty<=y1; ty++){
    for(let tx=x0; tx<=x1; tx++){
      const t = world.grid[ty][tx];
      if(t===AIR){
        // underground air pockets show a dark cave "background wall" (dirt near
        // the surface, stone deeper) instead of open sky — a Terraria-style look
        const surfY = world.surface[tx];
        if(ty > surfY+1){
          const depth = ty - surfY, h = hash2(tx,ty), h2 = hash2(tx*3+1, ty*5+2);
          const sx0 = tx*TILE - state.camX, sy0 = ty*TILE - state.camY, light = depth<9;
          ctx.fillStyle = light ? (h>0.5?'#4a3320':'#402c1b') : (h>0.5?'#33333c':'#2b2b33');
          ctx.fillRect(sx0,sy0,TILE+1,TILE+1);
          // rough rock-wall dither so the cave background reads as chipped stone, not a flat square
          ctx.fillStyle = light ? '#2f2013' : '#22222b';
          ctx.fillRect(sx0+Math.floor(h*11), sy0+Math.floor(h2*11), 3,3);
          if(h2>0.55) ctx.fillRect(sx0+1+Math.floor(h2*10), sy0+1+Math.floor(h*9), 2,2);
          if(h>0.6){ ctx.fillStyle = light ? '#57432a' : '#3c3c4a'; ctx.fillRect(sx0+2+Math.floor(h2*8), sy0+3, 2,2); }
        }
        continue;
      }
      const def = TILES[t];
      const sx = tx*TILE - state.camX, sy = ty*TILE - state.camY;

      if(t===TORCH){ drawTorchTile(sx,sy); torchLights.push({x:sx+TILE/2, y:sy+TILE/2}); continue; }
      if(t===LADDER){ drawLadderTile(sx,sy); continue; }
      if(t===VINE){ drawVineTile(sx,sy); continue; }
      if(t===WATER){ drawWaterTile(tx,ty,sx,sy); continue; }
      if(t===DRIPSTONE){ drawDripstone(tx,ty,sx,sy); continue; }
      if(t===GLOWSHROOM){ drawGlowshroom(sx,sy); dimLights.push({x:sx+8, y:sy+8}); continue; }
      if(t===TREEWOOD || t===JUNGLEWOOD){ drawBark(def, tx, ty, sx, sy); continue; }
      if(t===LEAF || t===JUNGLELEAF){ drawFoliage(def, tx, ty, sx, sy); continue; }

      const oL = tileOpen(tx-1,ty), oR = tileOpen(tx+1,ty), oU = tileOpen(tx,ty-1), oD = tileOpen(tx,ty+1);

      if(ATLAS_IDS.has(t)){
        // Baked procedural texture: one drawImage for the body variant + one for
        // the exposed-edge frame overlay. Exposed corners are rounded (clipped)
        // so the terrain silhouette reads organic instead of a hard grid.
        const dx = Math.floor(sx), dy = Math.floor(sy); // integer-align so 16px cells tile seamlessly
        const cTL=oL&&oU, cTR=oR&&oU, cBR=oR&&oD, cBL=oL&&oD;
        let clipped=false;
        if(cTL||cTR||cBR||cBL){
          const surfY=world.surface[tx];
          if(ty>surfY+1){ ctx.fillStyle=(ty-surfY)<9?'#3f2c1a':'#2f2f38'; ctx.fillRect(dx,dy,TILE+1,TILE+1); } // cave backing behind cut corners
          ctx.save(); roundTilePath(ctx, dx, dy, TILE+1, 5, cTL, cTR, cBR, cBL); ctx.clip(); clipped=true;
        }
        drawBodyTile(ctx, t, tx, ty, dx, dy);
        blendEdge(t, tx, ty, dx, dy); // dither different-type borders so layers bleed together
        const mask = (oU?1:0)|(oR?2:0)|(oD?4:0)|(oL?8:0);
        if(mask) drawEdgeTile(ctx, mask, dx, dy);
        if(clipped) ctx.restore();
        if(def.top && oU) drawGrassOverhang(t, def, sx, sy, tx, ty); // surface tufts/flowers
      } else {
        // Legacy runtime detail for the few non-atlas tiles (leaves + furniture).
        const cTL = oL&&oU, cTR = oR&&oU, cBR = oR&&oD, cBL = oL&&oD;
        let clipped = false;
        if(cTL||cTR||cBR||cBL){
          const surfY = world.surface[tx];
          if(ty > surfY+1){ ctx.fillStyle = (ty-surfY)<9 ? '#3f2c1a' : '#2f2f38'; ctx.fillRect(sx,sy,TILE+1,TILE+1); }
          ctx.save();
          roundTilePath(ctx, sx, sy, TILE+1, 6, cTL, cTR, cBR, cBL); // leaves/furniture: softer, less-square corners
          ctx.clip();
          clipped = true;
        }
        ctx.fillStyle = def.color;
        ctx.fillRect(sx,sy,TILE+1,TILE+1);
        if(t!==LEAF){
          ctx.fillStyle = shade(def.color,24);
          if(oU) ctx.fillRect(sx,sy,TILE+1,2);
          if(oL) ctx.fillRect(sx,sy,2,TILE+1);
          ctx.fillStyle = shade(def.color,-30);
          if(oD) ctx.fillRect(sx,sy+TILE-2,TILE+1,2);
          if(oR) ctx.fillRect(sx+TILE-2,sy,2,TILE+1);
          ctx.fillStyle = shade(def.color,-52);
          if(oU) ctx.fillRect(sx,sy,TILE+1,1);
          if(oD) ctx.fillRect(sx,sy+TILE-1,TILE+1,1);
          if(oL) ctx.fillRect(sx,sy,1,TILE+1);
          if(oR) ctx.fillRect(sx+TILE-1,sy,1,TILE+1);
        }
        const h = hash2(tx,ty), h2 = hash2(tx*3.1+7,ty*5.7+3);
        if(t===LEAF || t===JUNGLELEAF){
          // dappled foliage: color variation + darker clumps + light highlights + berries
          if((tx+ty*3)%3===0){ ctx.fillStyle=shade(def.color,20); ctx.fillRect(sx,sy,TILE+1,TILE+1); }
          ctx.fillStyle = shade(def.color,-24);
          ctx.fillRect(sx+2+Math.floor(h*4), sy+2+Math.floor(h2*4), 3,3);
          ctx.fillRect(sx+9+Math.floor(h2*4), sy+8+Math.floor(h*4), 2,2);
          ctx.fillStyle = shade(def.color,26);
          ctx.fillRect(sx+3+Math.floor(h2*8), sy+3+Math.floor(h*8), 2,2);
          if(h*h2>0.72){ ctx.fillStyle='#e05a6a'; ctx.fillRect(sx+6,sy+6,2,2); } // berry
        } else if(t===CRAFT_TABLE){
          ctx.fillStyle = shade(def.color,28);
          ctx.fillRect(sx+1,sy+1,TILE-1,3);
          ctx.fillStyle = shade(def.color,-32);
          ctx.fillRect(sx+2,sy+9,2,6); ctx.fillRect(sx+TILE-4,sy+9,2,6);
        } else if(t===FURNACE){
          ctx.fillStyle='#141414';
          ctx.fillRect(sx+4,sy+7,8,7);
        } else if(t===CHEST){
          ctx.fillStyle = shade(def.color,-32);
          ctx.fillRect(sx,sy+6,TILE+1,2);
          ctx.fillStyle='#2a1c08';
          ctx.fillRect(sx+7,sy+7,2,3);
        }
        if(clipped){ ctx.restore(); }
      }
      if(def.glow){
        ctx.globalAlpha=0.6;
        drawGlow(ctx, def.glow, 9, sx+8, sy+8, 1);
        ctx.globalAlpha=1;
        if(t===BRICKGLOW || t===ALTAR) dimLights.push({x:sx+8, y:sy+8});
      }
    }
  }

  // mining cracks on partially-broken blocks (swing-collision damage)
  if(state.mineHits) for(const [k,prog] of state.mineHits){
    const c = k.indexOf(','); const tx=+k.slice(0,c), ty=+k.slice(c+1);
    if(tx<x0||tx>x1||ty<y0||ty>y1) continue;
    const sx=tx*TILE-state.camX, sy=ty*TILE-state.camY;
    const a=clamp(prog/22,0.18,0.85);
    ctx.strokeStyle=`rgba(15,10,8,${a})`; ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(sx+3,sy+2); ctx.lineTo(sx+7,sy+7); ctx.lineTo(sx+5,sy+13);
    ctx.moveTo(sx+12,sy+3); ctx.lineTo(sx+9,sy+8); ctx.lineTo(sx+13,sy+14);
    if(prog>10){ ctx.moveTo(sx+2,sy+9); ctx.lineTo(sx+8,sy+11); }
    ctx.stroke();
  }

  // torches light glow (from the list gathered in the tile pass)
  for(const L of torchLights) drawGlow(ctx, 'rgba(255,180,80,0.35)', 70, L.x, L.y, 2);

  // particles
  for(const pt of state.particles){
    ctx.globalAlpha = clamp(pt.life/500,0,1);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x-state.camX-2, pt.y-state.camY-2, 4,4);
    ctx.globalAlpha=1;
  }

  // mobs
  for(const m of state.mobs){
    const sx = m.x-state.camX, sy = m.y-state.camY;
    ctx.fillStyle = MOB_TYPES[m.type].color;
    ctx.fillRect(sx,sy,m.w,m.h);
    // elemental status tints
    if(m.freeze>0){ ctx.fillStyle='rgba(140,224,255,0.5)'; ctx.fillRect(sx,sy,m.w,m.h); }
    if(m.burn>0){ ctx.fillStyle='rgba(255,120,40,0.42)'; ctx.fillRect(sx,sy,m.w,m.h); }
    if(m.shock>0 && Math.floor(state.time/80)%2===0){ ctx.fillStyle='rgba(232,250,255,0.65)'; ctx.fillRect(sx,sy,m.w,m.h); }
    ctx.fillStyle='#000a'; ctx.fillRect(sx,sy-6,m.w,3);
    ctx.fillStyle='#e05353'; ctx.fillRect(sx,sy-6,m.w*clamp(m.hp/MOB_TYPES[m.type].hp,0,1),3);
  }

  // falling blocks (dislodged tree wood/leaves tumbling down)
  for(const b of state.falling){
    const bx = b.x-state.camX, by = b.y-state.camY;
    const def = TILES[b.tile];
    ctx.fillStyle = def.color; ctx.fillRect(bx,by,TILE,TILE);
    ctx.fillStyle = shade(def.color,26); ctx.fillRect(bx,by,TILE,2); ctx.fillRect(bx,by,2,TILE);
    ctx.fillStyle = shade(def.color,-30); ctx.fillRect(bx,by+TILE-2,TILE,2); ctx.fillRect(bx+TILE-2,by,2,TILE);
  }

  // projectiles (boss/special shots carry their own color)
  for(const pr of state.projectiles){
    ctx.fillStyle = pr.color || '#ffdf80';
    const s = pr.beam ? 8 : (pr.fiery ? 5 : 4);
    if(pr.beam){ // elongate the beam along its travel direction
      const horiz = Math.abs(pr.vx) >= Math.abs(pr.vy);
      const w = horiz ? 16 : s, h = horiz ? s : 16;
      ctx.fillRect(pr.x-state.camX-w/2, pr.y-state.camY-h/2, w, h);
    } else {
      ctx.fillRect(pr.x-state.camX-s/2,pr.y-state.camY-s/2,s,s);
    }
  }

  // TNT bombs (blink faster as the fuse runs down)
  for(const b of state.bombs){
    const bx=b.x-state.camX, by=b.y-state.camY;
    const blink = Math.floor(state.time/Math.max(60,b.fuse/4))%2===0;
    ctx.fillStyle = blink ? '#ff5a3a' : '#c23a2a';
    ctx.fillRect(bx-5,by-5,10,10);
    ctx.fillStyle='#eee'; ctx.font='6px monospace'; ctx.fillText('TNT',bx-7,by+2);
    ctx.fillStyle='#ffd070'; ctx.fillRect(bx-1,by-8,2,3); // fuse spark
  }

  // lightning bolts (Thor's Hammer special)
  for(const z of state.zaps){
    const a = clamp(z.life/280,0,1);
    ctx.strokeStyle = `rgba(190,216,255,${a})`;
    ctx.lineWidth = 3; ctx.beginPath();
    let zx = z.x - state.camX;
    ctx.moveTo(zx, z.y0 - state.camY);
    for(let yy=z.y0; yy<z.y1; yy+=24){
      ctx.lineTo(zx + (hash2(zx,yy)-0.5)*10, yy - state.camY);
    }
    ctx.stroke(); ctx.lineWidth = 1;
  }
  // expanding rings (wave / slam / burst effects)
  for(const w of state.waves){
    const a = clamp(w.life/360,0,1);
    ctx.strokeStyle = `rgba(${w.color||'120,220,255'},${a})`;
    ctx.lineWidth = 4; ctx.beginPath();
    ctx.arc(w.x-state.camX, w.y-state.camY, w.r, 0, Math.PI*2); ctx.stroke();
    ctx.lineWidth = 1;
  }

  // relic shrines: legendary weapons hovering over their cave altars
  for(const r of (world.relics||[])){
    if(r.taken) continue;
    if(r.x<x0-2||r.x>x1+2||r.y<y0-3||r.y>y1+3) continue; // only visible ones
    const rx = r.x*TILE - state.camX, ry = r.y*TILE - state.camY;
    const bob = Math.sin(state.time*0.004)*3;
    const g = ctx.createRadialGradient(rx+8,ry-2,1,rx+8,ry-2,26);
    g.addColorStop(0,'rgba(255,240,160,0.55)'); g.addColorStop(1,'rgba(255,240,160,0)');
    ctx.fillStyle=g; ctx.fillRect(rx-18,ry-28,52,52);
    ctx.save(); ctx.translate(rx-3, ry-22+bob); drawItemIcon(ctx, r.item, 22); ctx.restore();
  }

  // villager
  if(world.villager){
    const vx = world.villager.tx*TILE - state.camX, vy = world.villager.ty*TILE - state.camY;
    ctx.fillStyle='#6b8f4a'; ctx.fillRect(vx+1,vy+8,12,14);      // robe
    ctx.fillStyle='#e8c9a0'; ctx.fillRect(vx+3,vy+1,8,8);        // head
    ctx.fillStyle='#3a2a1a'; ctx.fillRect(vx+3,vy+1,8,3);        // hair
    ctx.fillStyle='#ffe08a'; ctx.fillRect(vx-3,vy-8,20,7);       // "shop" tag
    ctx.fillStyle='#3a2a1a'; ctx.font='6px monospace'; ctx.fillText('SHOP',vx-2,vy-2);
  }

  // boss
  if(state.boss){
    const b = state.boss;
    const bd = BOSS_TYPES[b.type] || BOSS_TYPES.storm;
    drawBoss(b, bd);
  }

  // player
  const psx = p.x-state.camX, psy = p.y-state.camY;
  if(p.invuln>0 && Math.floor(state.time/100)%2===0){ ctx.globalAlpha=0.4; }
  ctx.fillStyle = '#e8c07a';
  ctx.fillRect(psx,psy,p.w,p.h);
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(psx,psy+p.h-8,p.w,8);
  ctx.globalAlpha=1;
  drawHeldTool(p, psx, psy);

  // darkness overlay when underground (lit by player + torches)
  if(underground){
    if(!offCanvas || offCanvas.width!==canvas.width || offCanvas.height!==canvas.height){
      offCanvas = document.createElement('canvas');
      offCanvas.width = canvas.width; offCanvas.height = canvas.height;
    }
    const octx = offCanvas.getContext('2d');
    octx.clearRect(0,0,offCanvas.width,offCanvas.height);
    octx.fillStyle='rgba(4,2,10,0.86)';
    octx.fillRect(0,0,offCanvas.width,offCanvas.height);
    octx.globalCompositeOperation='destination-out';
    // Punch light holes with cached black-glow sprites (source alpha erases the
    // darkness). Reuses the torch/brick lists gathered during the tile pass.
    const lightAt = (sx,sy,r)=>drawGlow(octx, 'rgba(0,0,0,1)', r, sx, sy, 0);
    lightAt(psx+p.w/2, psy+p.h/2, 150);
    for(const L of torchLights) lightAt(L.x, L.y, 130);
    for(const L of dimLights)   lightAt(L.x, L.y, 60);
    octx.globalCompositeOperation='source-over';
    ctx.drawImage(offCanvas,0,0);
  }

  // full-screen special-attack flashes (drawn last, over everything)
  for(const f of state.flashes){
    const a = clamp(f.life/200,0,1);
    ctx.fillStyle = f.color.replace(/[\d.]+\)$/, (a*0.4).toFixed(2)+')');
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }
}
