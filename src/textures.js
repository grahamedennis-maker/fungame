import { TILES } from './tiles.js';
import { DIRT, GRASS, STONE, WOODT, COAL, IRON, GOLD, BEDROCK, BRICK,
         COPPER, TIN, LEAD, SILVER, TUNGSTEN, PLATINUM, OBSIDIAN, COBALT, TITANIUM, METEORITE, METEORDEBRIS,
         BRICKGLOW, SAND, DUNGFLOOR, CLOUD, SKYBRICK, SNOW, ICE, CACTUS,
         JUNGLEGRASS, TREEWOOD, MOSS, MUD, JUNGLEWOOD } from './constants.js';
import { hash2, fbm, shade } from './utils.js';

/* ---------- PROCEDURAL TILE-TEXTURE ATLAS ----------
   Each texturable tile is baked into N 16x16 procedural variants ONCE at load
   (buildAtlas), into a single offscreen atlas canvas. The render loop then blits
   one variant per cell (chosen deterministically per tile coord) plus a baked
   edge-frame overlay — replacing the old per-frame fillRect/shade() detail with
   two drawImage calls. Modeled on the glowSprite() cache + the icons.js drawer
   pattern. Bake-time cost only; the frame loop just does drawImage. */

const TS = 16;

// small deterministic rng so a variant bakes the same every load
function rng(seed){ let s=(seed>>>0)||1; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }

// smooth fbm mottle of the base color across the cell (2px blocks keep bake cheap)
function fillMottle(g, color, v, id, amt){
  const ox=(id*13+v*97)%64, oy=(id*29+v*53)%64;
  const step = amt/3;                         // 7 discrete tones per block:
  for(let y=0;y<TS;y+=2) for(let x=0;x<TS;x+=2){ //   3 dark, the exact colour, 3 light
    const n=fbm((x+ox)/5.5,(y+oy)/5.5,2);
    let lvl = Math.round((n-0.5)*7);           // spread noise across -3..+3 bands
    lvl = lvl<-3 ? -3 : lvl>3 ? 3 : lvl;
    g.fillStyle=shade(color, Math.round(lvl*step));
    g.fillRect(x,y,2,2);
  }
}

/* ---- per-material bakers: paint one 16x16 cell in local coords ---- */
function bakeStone(g,def,v,id){
  fillMottle(g,def.color,v,id,30);
  const r=rng(id*131+v*977);
  g.strokeStyle=shade(def.color,-40); g.lineWidth=1;
  for(let i=0,n=2+(r()<0.5?1:0);i<n;i++){
    let cx=r()*14+1, cy=r()*6+1; g.beginPath(); g.moveTo(cx,cy);
    for(let s=0,segs=2+(r()*2|0);s<segs;s++){ cx+=r()*6-1; cy+=r()*6+1; g.lineTo(cx,cy); }
    g.stroke();
  }
  g.fillStyle=shade(def.color,22);  for(let i=0;i<3;i++) g.fillRect((r()*14|0)+1,(r()*14|0)+1,1,1); // glints
  g.fillStyle=shade(def.color,-40); for(let i=0;i<3;i++) g.fillRect((r()*14|0)+1,(r()*14|0)+1,1,1); // pits
  if(r()<0.18){ g.fillStyle='#3d6b3a'; g.fillRect(2+(r()*10|0),2+(r()*10|0),3,2); } // moss fleck
}
function bakeOre(g,def,v,id){
  // Ore = grey stone with the ore colour showing only as embedded nuggets, so it
  // reads as ore *inside* stone. Meteorite is its own rock, so it keeps its colour.
  const host = (id===METEORITE) ? def : (TILES[STONE] || def);
  bakeStone(g,host,v,id);                 // host rock
  const r=rng(id*613+v*271);
  for(let i=0,nug=2+(r()*2|0);i<nug;i++){
    const cx=3+(r()*9|0), cy=3+(r()*9|0), s=2+(r()*2|0);
    g.fillStyle=shade(def.dot,-45); g.fillRect(cx-1,cy-1,s+2,s+2); // dark rim
    g.fillStyle=def.dot;            g.fillRect(cx,cy,s,s);         // gem body
    g.fillStyle=shade(def.dot,70);  g.fillRect(cx,cy,1,1);         // bright facet
  }
}
function bakeDirt(g,def,v,id){
  fillMottle(g,def.color,v,id,30);
  const r=rng(id*97+v*811);
  g.fillStyle=shade(def.color,-26); for(let i=0;i<3;i++) g.fillRect((r()*13|0)+1,(r()*13|0)+1,2,2); // clumps
  g.fillStyle=shade(def.color,16);  for(let i=0;i<2;i++) g.fillRect((r()*13|0)+1,(r()*13|0)+1,2,2); // pebbles
}
function bakeSand(g,def,v,id){
  fillMottle(g,def.color,v,id,16);
  const r=rng(id*71+v*401);
  for(let y=2;y<15;y+=3){ g.fillStyle=shade(def.color,r()<0.5?-14:14); g.fillRect(1+(r()*3|0),y+(r()*2|0),8+(r()*4|0),1); }
}
function bakeGrain(g,def,v,id){          // wood / cactus vertical ribs
  fillMottle(g,def.color,v,id,14);
  g.fillStyle=shade(def.color,-24); g.fillRect(3,0,2,TS); g.fillRect(10,0,2,TS);
  g.fillStyle=shade(def.color,16);  g.fillRect(6,0,1,TS);
}
function bakeTop(g,def,v,id){            // grass/snow-topped body (overhang tufts stay runtime)
  fillMottle(g,def.color,v,id,22);
  const top=def.top||def.color;
  g.fillStyle=top; g.fillRect(0,0,TS,4);
  g.fillStyle=shade(top,18); g.fillRect(0,0,TS,1);           // bright rim
  g.fillStyle=shade(top,-22);
  const r=rng(id*211+v*659);
  for(let i=0;i<3;i++) g.fillRect((r()*13|0)+1,1+(r()*2|0),1,2);
}
function bakeBrick(g,def,v,id){          // v = row parity (0/1) for coursing stagger
  fillMottle(g,def.color,v,id,12);
  g.fillStyle=shade(def.color,-32); g.fillRect(0,7,TS,1);    // mortar course
  const vx=v?8:0; g.fillRect(vx,0,1,8); g.fillRect((vx+8)%16,8,1,8);
  g.fillStyle=shade(def.color,16); g.fillRect(0,0,TS,1);     // top highlight
}
function bakeIce(g,def,v,id){
  fillMottle(g,def.color,v,id,14);
  g.fillStyle=shade(def.color,40); g.fillRect(3,3,5,1); g.fillRect(9,8,4,1); // glint streaks
}
function bakeMoss(g,def,v,id){          // gray stone body speckled with green moss
  fillMottle(g,'#6f6f6f',v,id,26);
  const r=rng(id*151+v*331);
  for(let i=0;i<6;i++){ g.fillStyle=(i%2)?'#4f8a3f':'#3d6b32'; g.fillRect((r()*13|0),(r()*13|0), 2+(r()*2|0), 2+(r()*2|0)); }
  g.fillStyle='#63a84c'; g.fillRect((r()*12|0)+1,(r()*4|0),3,1);
}
function bakeDefault(g,def,v,id){
  fillMottle(g,def.color,v,id,18);
  g.fillStyle=shade(def.color,20); g.fillRect(2,2,3,1);
}

// atlas config: [id, baker, variantCount, variantMode]
const CFG = [
  [STONE,bakeStone,6,'hash'], [BEDROCK,bakeStone,4,'hash'],
  [DIRT,bakeDirt,4,'hash'], [SAND,bakeSand,4,'hash'],
  [COAL,bakeOre,4,'hash'], [IRON,bakeOre,4,'hash'], [GOLD,bakeOre,4,'hash'],
  [COPPER,bakeOre,4,'hash'], [TIN,bakeOre,4,'hash'], [LEAD,bakeOre,4,'hash'], [SILVER,bakeOre,4,'hash'],
  [TUNGSTEN,bakeOre,4,'hash'], [PLATINUM,bakeOre,4,'hash'], [OBSIDIAN,bakeOre,4,'hash'], [COBALT,bakeOre,4,'hash'],
  [TITANIUM,bakeOre,4,'hash'], [METEORITE,bakeOre,4,'hash'], [METEORDEBRIS,bakeStone,4,'hash'],
  [GRASS,bakeTop,3,'hash'], [SNOW,bakeTop,3,'hash'], [JUNGLEGRASS,bakeTop,3,'hash'],
  [WOODT,bakeGrain,3,'hash'], [CACTUS,bakeGrain,2,'hash'], // placed wood stays a square plank block
  [MUD,bakeDirt,4,'hash'],                                  // (tree trunks TREEWOOD/JUNGLEWOOD are drawn as round bark, not atlas)
  [BRICK,bakeBrick,2,'row'], [BRICKGLOW,bakeBrick,2,'row'], [DUNGFLOOR,bakeBrick,2,'row'], [SKYBRICK,bakeBrick,2,'row'],
  [CLOUD,bakeDefault,3,'hash'], [ICE,bakeIce,3,'hash'], [MOSS,bakeMoss,4,'hash'],
];
const MAXV = 6;
export const ATLAS_IDS = new Set(CFG.map(c=>c[0]));
const meta = new Map();
CFG.forEach(([id,,n,mode],i)=> meta.set(id,{row:i,n,mode}));

let atlas = null, edgeAtlas = null;

// which baked variant a given cell uses — pure fn of coords, so no per-frame flicker
export function variantOf(id,tx,ty){
  const m=meta.get(id); if(!m) return 0;
  if(m.mode==='row') return (ty & 1) % m.n;
  return (hash2(tx,ty)*m.n)|0;
}

// baked exposed-edge frame: dark bevel + 1px outline + soft dark corners, keyed
// by a 4-bit mask (U=1,R=2,D=4,L=8). Tile-agnostic, semi-transparent overlay.
function bakeEdge(g,mask){
  const U=mask&1,R=mask&2,D=mask&4,L=mask&8;
  const outline='rgba(10,7,5,0.9)', bevel='rgba(0,0,0,0.26)', hi='rgba(255,255,255,0.10)';
  if(U){ g.fillStyle=bevel; g.fillRect(0,0,TS,3); g.fillStyle=hi; g.fillRect(0,3,TS,1); g.fillStyle=outline; g.fillRect(0,0,TS,1); }
  if(D){ g.fillStyle=bevel; g.fillRect(0,TS-3,TS,3); g.fillStyle=outline; g.fillRect(0,TS-1,TS,1); }
  if(L){ g.fillStyle=bevel; g.fillRect(0,0,3,TS); g.fillStyle=outline; g.fillRect(0,0,1,TS); }
  if(R){ g.fillStyle=bevel; g.fillRect(TS-3,0,3,TS); g.fillStyle=outline; g.fillRect(TS-1,0,1,TS); }
  g.fillStyle='rgba(6,4,3,0.55)'; // soft dark corners where two exposed sides meet
  if(U&&L){ g.fillRect(0,0,3,1); g.fillRect(0,0,1,3); }
  if(U&&R){ g.fillRect(TS-3,0,3,1); g.fillRect(TS-1,0,1,3); }
  if(D&&L){ g.fillRect(0,TS-1,3,1); g.fillRect(0,TS-3,1,3); }
  if(D&&R){ g.fillRect(TS-3,TS-1,3,1); g.fillRect(TS-1,TS-3,1,3); }
}

export function buildAtlas(){
  if(atlas) return; // idempotent — build once, never on resize
  atlas = document.createElement('canvas');
  atlas.width = MAXV*TS; atlas.height = CFG.length*TS;
  const g = atlas.getContext('2d');
  for(const [id,baker,n] of CFG){
    const def = TILES[id], row = meta.get(id).row;
    for(let v=0; v<n; v++){
      g.save();
      g.beginPath(); g.rect(v*TS,row*TS,TS,TS); g.clip(); // clip so detail can't bleed into neighbors
      g.translate(v*TS,row*TS);
      baker(g,def,v,id);
      g.restore();
    }
  }
  edgeAtlas = document.createElement('canvas');
  edgeAtlas.width = 16*TS; edgeAtlas.height = TS;
  const e = edgeAtlas.getContext('2d');
  for(let mask=1; mask<16; mask++){ e.save(); e.translate(mask*TS,0); bakeEdge(e,mask); e.restore(); }
}

export function drawBodyTile(ctx,id,tx,ty,dx,dy){
  if(!atlas) return;
  const m=meta.get(id), v=variantOf(id,tx,ty);
  ctx.drawImage(atlas, v*TS, m.row*TS, TS,TS, dx,dy, TS,TS);
}
export function drawEdgeTile(ctx,mask,dx,dy){
  if(!edgeAtlas || !mask) return;
  ctx.drawImage(edgeAtlas, mask*TS, 0, TS,TS, dx,dy, TS,TS);
}
