import { TILE, REACH, AIR, ALTAR, WORLD_W, WORLD_H, BEDROCK,
         TREEWOOD, LEAF, JUNGLEWOOD, JUNGLELEAF } from './constants.js';
import { clamp, ri, chance } from './utils.js';
import { state, world } from './state.js';
import { tileAt, setTile, tileDef, tileSolid, strikeMeteor } from './worldgen.js';
import { ITEMS } from './tiles.js';
import { hotbarItem, addItem, removeItem, countItem } from './inventory.js';
import { spawnParticles } from './particles.js';
import { damagePlayer } from './player.js';
import { hitBoss, spawnBoss, spawnMiniBoss } from './boss.js';
import { msg } from './ui.js';

/* ---------- MINING / INTERACTION ---------- */
export function screenToWorld(sx,sy){
  return { x: sx + state.camX, y: sy + state.camY };
}
export function worldToTile(wx,wy){ return { tx: Math.floor(wx/TILE), ty: Math.floor(wy/TILE) }; }

export function reachOk(tx,ty){
  const p = state.player;
  const pcx = p.x+p.w/2, pcy = p.y+p.h/2;
  const d = Math.hypot(pcx-(tx*TILE+TILE/2), pcy-(ty*TILE+TILE/2));
  return d <= REACH*TILE;
}

export function currentTool(){
  const it = hotbarItem();
  if(it && ITEMS[it.id] && ITEMS[it.id].tool) return ITEMS[it.id];
  return null;
}

export function tryMob(){
  const p = state.player;
  const reachPx = 34 + (currentTool()&&currentTool().range?currentTool().range-24:0);
  let best=null, bestD=9999;
  for(const m of state.mobs){
    const mcx=m.x+m.w/2, mcy=m.y+m.h/2;
    const d = Math.hypot(mcx-(p.x+p.w/2), mcy-(p.y+p.h/2));
    if(d<reachPx && d<bestD){ best=m; bestD=d; }
  }
  return best;
}

export function doAttack(){
  const now = performance.now();
  const tool = currentTool();
  const cd = tool && tool.tool==='hammer' ? 550 : 260;
  if(now - state.lastAttack < cd) return;
  state.lastAttack = now;
  state.swingStart = now;
  const dmg = tool ? (tool.dmg||5) : 3;

  if(tool && tool.tool==='bow' && countItem('arrow')>0){
    removeItem('arrow',1);
    const p = state.player;
    state.projectiles.push({ x:p.x+p.w/2, y:p.y+p.h/2, vx: p.facing*7, vy:-1, life:1800, from:'player', dmg });
    return;
  }
  if(tool && tool.tool==='flail'){
    // Flail: swing a heavy fiery ball in an arc in front, knocking mobs back and
    // igniting them. Hits everything in the swing wedge, not just one target.
    const p = state.player, reach = tool.range||50;
    const pcx = p.x+p.w/2, pcy = p.y+p.h/2;
    for(const m of state.mobs){
      const ddx=(m.x+m.w/2)-pcx, ddy=(m.y+m.h/2)-pcy;
      if(Math.abs(ddx)<=reach && Math.abs(ddy)<=42 && ddx*p.facing>=-14){
        m.hp -= dmg; m.vx += p.facing*4.5; m.vy -= 2.5;
        m.burn = Math.max(m.burn||0, 1500);
        spawnParticles(m.x+m.w/2, m.y+m.h/2, tool.color||'#ff8a3c', 5);
      }
    }
    if(state.boss){ const b=state.boss, ddx=(b.x+b.w/2)-pcx, ddy=(b.y+b.h/2)-pcy;
      if(Math.abs(ddx)<=reach+18 && Math.abs(ddy)<=50) hitBoss(dmg); }
    return;
  }
  if(tool && tool.tool==='boomerang'){
    // Boomerang: hurl toward the cursor; it flies out, then homes back to you,
    // damaging mobs along the whole path (see updateProjectiles).
    const p = state.player;
    const ang = Math.atan2((state.mouse.y+state.camY)-(p.y+p.h/2), (state.mouse.x+state.camX)-(p.x+p.w/2));
    const sp = 8.5;
    state.projectiles.push({ x:p.x+p.w/2, y:p.y+p.h/2, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp,
      life:1600, from:'player', dmg, color:tool.color||'#ff6a3c', straight:true, fiery:true,
      boomerang:true, outT:340, hitMobs:new Set() });
    return;
  }
  const target = tryMob();
  if(target){ target.hp -= dmg; spawnParticles(target.x+target.w/2,target.y+target.h/2,'#fff',4); }
  if(state.boss){
    const b=state.boss;
    const p=state.player;
    const d = Math.hypot((b.x+b.w/2)-(p.x+p.w/2),(b.y+b.h/2)-(p.y+p.h/2));
    if(d < 60) hitBoss(dmg);
  }
}

// Drink a potion from the hotbar (health, etc.).
export function useConsumable(){
  const it = hotbarItem();
  if(!it) return false;
  const def = ITEMS[it.id];
  if(!def) return false;
  const p = state.player;
  if(def.heal){
    if(p.hp >= p.maxhp){ msg('Already at full health'); return true; }
    p.hp = Math.min(p.maxhp, p.hp + def.heal);
    removeItem(it.id, 1);
    spawnParticles(p.x+p.w/2, p.y+p.h/2, '#5ce87a', 14);
    msg('+'+def.heal+' HP');
    return true;
  }
  return false;
}

/* ---------- LEGENDARY SPECIAL ATTACKS ---------- */
export const SPECIAL_CD = 4500; // ms between special uses

export function specialReady(){
  const tool = currentTool();
  if(!tool || !tool.special) return false;
  return performance.now() - state.specialCd >= (tool.specialCd || SPECIAL_CD);
}

// Damage every mob (and the boss) overlapping a world-space box.
function damageBox(x0,y0,x1,y1,dmg,knock){
  for(const m of state.mobs){
    if(m.x+m.w>x0 && m.x<x1 && m.y+m.h>y0 && m.y<y1){
      m.hp -= dmg;
      if(knock) m.vx += (m.x < (x0+x1)/2 ? -1 : 1) * knock, m.vy = -4;
      spawnParticles(m.x+m.w/2, m.y+m.h/2, '#fff', 5);
    }
  }
  if(state.boss){
    const b=state.boss;
    if(b.x+b.w>x0 && b.x<x1 && b.y+b.h>y0 && b.y<y1) hitBoss(dmg);
  }
}

export function doSpecial(){
  const tool = currentTool();
  if(!tool || !tool.special){ msg('Equip a legendary weapon first.'); return; }
  if(!specialReady()) return;
  const p = state.player;
  const pcx = p.x+p.w/2, pcy = p.y+p.h/2;

  state.specialCd = performance.now();
  state.swingStart = performance.now();

  if(tool.special==='lightning'){
    // Lightning falls from the sky in a 3-block-wide spread centered on the
    // aimed tile, smiting anything in those columns.
    const w = screenToWorld(state.mouse.x, state.mouse.y);
    const centerTx = Math.floor(w.x/TILE);
    for(let c=-1;c<=1;c++){
      const colX = (centerTx+c)*TILE;
      state.zaps.push({ x:colX+TILE/2, y0:0, y1:WORLD_H*TILE, life:320 });
      state.zaps.push({ x:colX+TILE/2+4, y0:0, y1:WORLD_H*TILE, life:180 }); // forked bolt
      damageBox(colX, 0, colX+TILE, WORLD_H*TILE, tool.dmg*1.4, 6);
      spawnParticles(colX+TILE/2, w.y, '#bcd8ff', 18);
      spawnParticles(colX+TILE/2, w.y, '#ffffff', 8);
    }
    state.flashes.push({ color:'rgba(190,216,255,0.35)', life:160 });
    state.waves.push({ x:w.x, y:w.y, r:6, max:70, life:260, color:'190,216,255' });
    msg('⚡ Thunderstrike!');
  } else if(tool.special==='wave'){
    // Tidal burst: shoves nearby mobs away from the player and damages them.
    const R = 160;
    for(const m of state.mobs){
      const mx=m.x+m.w/2, my=m.y+m.h/2;
      const d = Math.hypot(mx-pcx, my-pcy);
      if(d<R){
        m.hp -= tool.dmg;
        const nx=(mx-pcx)/(d||1), ny=(my-pcy)/(d||1);
        m.vx += nx*12; m.vy = ny*8 - 3;
        spawnParticles(mx,my,'#8fdcff',9);
      }
    }
    if(state.boss){
      const b=state.boss, d=Math.hypot(b.x+b.w/2-pcx, b.y+b.h/2-pcy);
      if(d<R+40) hitBoss(tool.dmg);
    }
    state.waves.push({ x:pcx, y:pcy, r:10, max:R, life:420, color:'120,220,255' });
    state.waves.push({ x:pcx, y:pcy, r:6, max:R*0.6, life:300, color:'180,240,255' });
    for(let i=0;i<20;i++) spawnParticles(pcx, pcy, '#6fd0ff', 1);
    msg('🌊 Tide Surge!');
  } else if(tool.special==='magma'){
    // Fan of magma bolts erupting forward + a burst of embers.
    for(let a=-3;a<=3;a++){
      state.projectiles.push({ x:pcx, y:pcy, vx:p.facing*(5+Math.abs(a)*0.3), vy:a*1.2-1,
        life:1500, from:'player', dmg:tool.dmg, color:'#ff7a2c', fiery:true });
    }
    for(let i=0;i<26;i++) spawnParticles(pcx+p.facing*12, pcy, i%2?'#ff6a2c':'#ffcf5a', 1);
    state.waves.push({ x:pcx+p.facing*10, y:pcy, r:6, max:60, life:260, color:'255,140,50' });
    state.flashes.push({ color:'rgba(255,120,40,0.22)', life:140 });
    msg('🔥 Magma Burst!');
  } else if(tool.special==='volley'){
    // Sky-splitting fan of glowing arrows.
    for(let a=-4;a<=4;a++){
      state.projectiles.push({ x:pcx, y:pcy, vx:p.facing*7, vy:a*1.0,
        life:1700, from:'player', dmg:tool.dmg, color:'#bcefff', straight:true });
    }
    for(let i=0;i<16;i++) spawnParticles(pcx, pcy, '#bcefff', 1);
    msg('🏹 Tempest Volley!');
  } else if(tool.special==='slam'){
    // Thor's Hammer: SLOW, heavy ground slam. A shockwave hurls back and hurts
    // everything around you and lightning crashes at the impact — powerful, but
    // not an insta-kill, and on a long cooldown.
    const R = 140, gy = pcy + p.h/2;
    for(const m of state.mobs){
      const mx=m.x+m.w/2, my=m.y+m.h/2, d=Math.hypot(mx-pcx, my-gy);
      if(d<R){
        m.hp -= 55;
        const nx=(mx-pcx)/(d||1);
        m.vx += nx*13; m.vy = -8;
        spawnParticles(mx,my,'#bcd8ff',8);
      }
    }
    if(state.boss){
      const b=state.boss, d=Math.hypot(b.x+b.w/2-pcx, b.y+b.h/2-gy);
      if(d<R+40) hitBoss(85); // strong, but boss survives (not insta-kill)
    }
    state.waves.push({ x:pcx, y:gy, r:8, max:R, life:460, color:'200,216,255' });
    state.waves.push({ x:pcx, y:gy, r:4, max:R*0.55, life:320, color:'255,255,255' });
    for(let c=-2;c<=2;c++) state.zaps.push({ x:pcx+c*TILE*1.4, y0:0, y1:gy, life:300 });
    for(let i=0;i<34;i++) spawnParticles(pcx, gy, i%3?'#e8faff':'#9fb8e8', 1);
    state.flashes.push({ color:'rgba(210,220,255,0.4)', life:200 });
    msg('🔨 GROUND SLAM!');
  } else if(tool.special==='beam'){
    // Blade beam: a fast slashing projectile that pierces every mob in its line.
    const dir = p.facing;
    const color = tool.beam || '#bfffd0';
    state.projectiles.push({ x:pcx, y:pcy, vx:dir*12, vy:0, life:900, from:'player',
      dmg:Math.round(tool.dmg*1.3), color, straight:true, pierce:true, beam:true, hitMobs:new Set() });
    for(let i=0;i<16;i++) spawnParticles(pcx+dir*14, pcy+ri(-8,8), color, 1);
    state.waves.push({ x:pcx+dir*10, y:pcy, r:6, max:52, life:220, color:'150,255,190' });
    msg('⚔ Blade Beam!');
  } else if(tool.special==='boomerang'){
    // Flamarang storm: a fan of three homing fiery boomerangs.
    for(let a=-1;a<=1;a++){
      const ang = (p.facing>0?0:Math.PI) + a*0.34;
      state.projectiles.push({ x:pcx, y:pcy, vx:Math.cos(ang)*9.5, vy:Math.sin(ang)*9.5-1,
        life:1700, from:'player', dmg:tool.dmg, color:'#ff8a3c', straight:true, fiery:true,
        boomerang:true, outT:400, hitMobs:new Set() });
    }
    for(let i=0;i<16;i++) spawnParticles(pcx, pcy, '#ff8a3c', 1);
    msg('🔥 Flamarang Storm!');
  }
}

const MINE_SWING = 240;            // ms per pickaxe swing (matches the visual swing)
export const MINE_ARC = Math.PI*0.75; // 135° sweep the pick head arcs through, ending at the aim

// Tree material — trunks, branches (also wood), and foliage. Chopped slower than
// ground and never swept up by the pickaxe's multi-block dig line.
export const isTreeTile = t => t===TREEWOOD || t===JUNGLEWOOD || t===LEAF || t===JUNGLELEAF;

// Chip one block: accrue swing damage, break it (and drop/collapse) when done.
function strikeTile(tx, ty, tool, hx, hy){
  const t = tileAt(tx,ty), def = tileDef(t);
  if(t===AIR || t===undefined || def.isAltar || def.isChest || !def.solid) return;
  if(!reachOk(tx,ty)) return;
  if(def.tier>0 && tool.tier<def.tier) return; // need a stronger pickaxe
  const key = tx+','+ty;
  const need = def.hardness*15 * (isTreeTile(t) ? 2.2 : 1); // trees take longer to chop
  const prog = (state.mineHits.get(key)||0) + tool.power*dt_cache*2.6;
  if(prog>=need){
    if(def.drop) addItem(def.drop,1);
    if(def.ore) msg('Found '+def.name+'!');
    setTile(tx,ty,AIR);
    dislodgeAbove(tx,ty); // tree wood/leaves above lose support and fall
    state.mineHits.delete(key);
    spawnParticles(tx*TILE+8, ty*TILE+8, def.color, 8);
  } else {
    state.mineHits.set(key, prog);
    if(chance(0.4)) spawnParticles(hx, hy, def.color, 1);
  }
}

let dt_cache = 1;
// Swing-collision mining: with a pickaxe held, the tool swings toward the cursor
// and breaks whatever blocks the arc sweeps through — the aimed block plus the
// block under the swinging pick-head as it arcs. Blocks accumulate damage across
// swings (harder tiles take more), and untouched blocks slowly heal.
export function updateMining(dt){
  document.getElementById('mining').style.display='none'; // legacy bar unused
  const tool = currentTool();
  if(!tool || tool.tool!=='pick'){ if(state.mineHits) state.mineHits.clear(); return; }
  if(!state.mineHits) state.mineHits = new Map();
  dt_cache = dt;

  const p = state.player;
  const handX = p.x+p.w/2, handY = p.y+p.h*0.44;
  // Aim direction comes from the cursor, but the pick only reaches the blocks
  // right NEXT TO the character — you can't mine a distant block through others.
  const cwx = state.mouse.x+state.camX, cwy = state.mouse.y+state.camY;
  const aim = Math.atan2(cwy-handY, cwx-handX);
  const now = performance.now();
  const t = clamp((now-state.swingStart)/MINE_SWING, 0, 1);

  // Digging straight down mines only the single block directly beneath you — no
  // wedge — so you can sink a clean 1-wide shaft without gouging the sides.
  const downward = Math.sin(aim) > 0.78;   // aim within ~40° of straight down
  if(downward){
    const bx = handX + Math.cos(aim)*TILE*1.4, by = handY + Math.sin(aim)*TILE*1.4;
    strikeTile(Math.floor(bx/TILE), Math.floor(by/TILE), tool, bx, by);
  } else {
    // Swing-collision mining: the pick head sweeps a ~135° arc finishing in the aim
    // direction. Every GROUND tile (ore/stone/dirt — never wood or trees) the arc
    // has swept through so far this swing keeps taking hits, so a full swing clears
    // the wedge it collides with in the direction you're hitting. Sampled across the
    // swept angle and a few depths to give the wedge width and thickness.
    const seen = new Set();
    const startAng = aim - MINE_ARC;
    const leadAng  = startAng + MINE_ARC*t;               // how far the head has swept this frame
    const ASTEPS = 8;
    for(let s=0; s<=ASTEPS; s++){
      const a = startAng + (leadAng-startAng)*(s/ASTEPS);
      for(const rd of [1.1, 1.7, 2.3]){
        const dist = TILE*rd;
        const hx = handX + Math.cos(a)*dist, hy = handY + Math.sin(a)*dist;
        const tx = Math.floor(hx/TILE), ty = Math.floor(hy/TILE);
        const k = tx+','+ty; if(seen.has(k)) continue; seen.add(k);
        if(isTreeTile(tileAt(tx,ty))) continue;            // the swing never chews wood/leaves
        strikeTile(tx, ty, tool, hx, hy);
      }
    }
    // Pointing directly at a tree still chops it (one slow block at a time) — the
    // aim ray is sampled at the nearest couple of tiles so close trunks register.
    for(const rd of [1.1, 1.7]){
      const ax = handX + Math.cos(aim)*TILE*rd, ay = handY + Math.sin(aim)*TILE*rd;
      if(isTreeTile(tileAt(Math.floor(ax/TILE), Math.floor(ay/TILE))))
        { strikeTile(Math.floor(ax/TILE), Math.floor(ay/TILE), tool, ax, ay); break; }
    }
  }

  if(now - state.swingStart > MINE_SWING) state.swingStart = now; // keep swinging
  // heal blocks that aren't currently being struck so progress doesn't linger
  for(const [k,v] of state.mineHits){ const nv=v-dt*0.35; if(nv<=0) state.mineHits.delete(k); else state.mineHits.set(k,nv); }
}

/* ---------- FALLING BLOCKS (Terraria-style tree collapse) ---------- */
// Tiles that tumble when the block beneath them is removed. Only natural tree
// trunks (TREEWOOD) and leaves fall — wood the player places to build (WOODT)
// stays put, so structures don't collapse.
const FALLABLE = new Set([TREEWOOD, LEAF, JUNGLEWOOD, JUNGLELEAF]);
// When a tile is cleared, the entire connected tree resting on top of it comes
// down: flood-fill the attached fallable region (trunk + branches + leaves) from
// just above the gap. Wood tumbles as physics blocks (so it still drops wood);
// leaves burst into particles. The gap itself is AIR, so the fill climbs up and
// out through the crown without descending the stump below the cut.
export function dislodgeAbove(tx,ty){
  if(!FALLABLE.has(tileAt(tx,ty-1))) return;
  const stack = [[tx, ty-1]], seen = new Set();
  let cap = 0;
  while(stack.length && cap < 1200){
    const [x,y] = stack.pop();
    if(x<0 || x>=WORLD_W || y<=0) continue;
    const k = x+','+y;
    if(seen.has(k)) continue;
    const t = tileAt(x,y);
    if(!FALLABLE.has(t)) continue;
    seen.add(k); cap++;
    setTile(x,y,AIR);
    if(t===TREEWOOD || t===JUNGLEWOOD) state.falling.push({ x:x*TILE, y:y*TILE, vy:1, tile:t });
    else spawnParticles(x*TILE+8, y*TILE+8, tileDef(t).color, 3); // leaves burst
    // climb up and sideways (and down-diagonals for drooping leaf clumps), but
    // never straight down — that would eat the stump left below the cut.
    stack.push([x,y-1],[x-1,y],[x+1,y],[x-1,y-1],[x+1,y-1],[x-1,y+1],[x+1,y+1]);
  }
}
// Night-time meteor shower: streaks fall from the sky near the player. Most burn
// up harmlessly; a rare "strike" reaches the ground and gouges a fresh meteor
// crater (1–3 meteorite blocks) — a dynamic way to find meteorite. See render's
// drawMeteors + shooting-star sky flecks for the visuals.
export function updateMeteors(dt){
  if(!world || !state.player) return;
  const f = (state.time % 180000)/180000;             // dayFrac; night ≈ 0.5–1
  const night = f>0.52 && f<0.99;
  if(night && state.meteors.length<4 && chance(0.006*dt)){
    const p = state.player;
    const tx = clamp((p.x/TILE|0) + ri(-42,42), 6, WORLD_W-6);
    const strike = chance(0.4);
    state.meteors.push({ x:tx*TILE - 240, y:-70, vx:5.4, vy:6.4, strike, life:2000 });
  }
  for(let i=state.meteors.length-1;i>=0;i--){
    const m = state.meteors[i];
    m.x += m.vx*dt; m.y += m.vy*dt; m.life -= dt;
    const col = clamp(m.x/TILE|0, 0, WORLD_W-1);
    const groundY = world.surface[col]*TILE;
    if(m.strike && m.y >= groundY){
      strikeMeteor(col);
      spawnParticles(m.x, groundY, '#ff8a4a', 22);
      state.flashes.push({ color:'rgba(255,150,90,1)', life:220 });
      msg('A meteor struck the surface!');
      state.meteors.splice(i,1); continue;
    }
    // cosmetic streaks burn up above the ground; anything expired/off-map is culled
    if(m.life<=0 || m.x<0 || m.x>WORLD_W*TILE || (!m.strike && m.y>groundY-90) || m.y>groundY+8){
      state.meteors.splice(i,1);
    }
  }
}
export function updateFalling(dt){
  if(!state.falling.length) return;
  for(const b of state.falling){ b.vy = Math.min(b.vy + 0.5*dt, 16); b.y += b.vy*dt; }
  // Settle the lowest blocks first so a falling stack re-lands in order without
  // two blocks racing for the same cell.
  state.falling.sort((a,b)=>b.y-a.y);
  const remain = [];
  for(const b of state.falling){
    const tx = Math.floor((b.x+TILE/2)/TILE);
    const belowTy = Math.floor((b.y+TILE)/TILE);
    if(belowTy>=WORLD_H || tileSolid(tileAt(tx,belowTy))){
      const restTy = belowTy-1;
      if(restTy>=0 && restTy<WORLD_H && tileAt(tx,restTy)===AIR) setTile(tx,restTy,b.tile);
      else { const d = tileDef(b.tile).drop; if(d) addItem(d,1); } // no room — pop as an item
    } else remain.push(b);
  }
  state.falling = remain;
}

const dungeonLoot = ['thunder_shard','gold_bar','iron_bar','storm_core','arrow'];
const LEGENDARIES = ['thunder_hammer','water_trident','fire_sword','tempest_bow',
                     'nights_edge','terra_blade','sunfury','flamarang'];
const ENHANCED = ['frost_edge','ember_axe','volt_bow','storm_maul'];
export function openChest(tx,ty){
  setTile(tx,ty,AIR);
  addItem('coin', ri(20,45)); // chests always hold a pile of coins
  const rolls = ri(2,3);
  for(let i=0;i<rolls;i++){
    const id = dungeonLoot[ri(0,dungeonLoot.length-1)];
    const n = id==='arrow'?ri(4,10):ri(1,3);
    addItem(id,n);
  }
  let found = false;
  // ~18% chance the chest also holds a random legendary weapon
  if(chance(0.18)){
    const lg = LEGENDARIES[ri(0,LEGENDARIES.length-1)];
    addItem(lg,1);
    msg('✦ A legendary weapon gleams inside! ✦');
    found = true;
  }
  // 20% chance for enhanced gear (a special-powered weapon below legendary tier)
  if(chance(0.20)){
    const eg = ENHANCED[ri(0,ENHANCED.length-1)];
    addItem(eg,1);
    msg('You found enhanced gear: '+ITEMS[eg].name+'!');
    found = true;
  }
  if(!found) msg('Opened a dungeon chest!');
}

export function tryAltarInteract(tx,ty){
  if(tileAt(tx,ty)!==ALTAR) return false;
  // Relic shrine: claim the legendary resting on this cave altar.
  for(const relic of (world.relics||[])){
    if(!relic.taken && relic.x===tx && relic.y===ty){
      addItem(relic.item,1);
      relic.taken = true;
      setTile(tx,ty,AIR);
      msg('✦ You lift the '+ITEMS[relic.item].name+' from the shrine! ✦');
      spawnParticles(tx*TILE+8, ty*TILE+8, '#ffe08a', 24);
      spawnMiniBoss(tx*TILE+8, ty*TILE); // taking it awakens a mini-boss guardian
      return true;
    }
  }
  if(state.boss){ msg('A guardian is already unleashed!'); return true; }
  if(state.bossCooldown>0){ msg('The altar is quiet... for now.'); return true; }
  // Which dungeon's altar is this? Pass its theme so the right boss spawns.
  let tag = 'storm';
  for(const d of (world.dungeons||[])){
    if(d.altar && Math.abs(d.altar.x-tx)<=1 && Math.abs(d.altar.y-ty)<=1){ tag = d.tag; break; }
  }
  spawnBoss(tag);
  return true;
}

/* ---------- TNT ---------- */
export function throwBomb(){
  const p = state.player;
  const w = screenToWorld(state.mouse.x, state.mouse.y);
  const ang = Math.atan2(w.y-(p.y+p.h/2), w.x-(p.x+p.w/2));
  state.bombs.push({ x:p.x+p.w/2, y:p.y+p.h/2, vx:Math.cos(ang)*5, vy:Math.sin(ang)*5-2, fuse:1300 });
}
function explode(wx,wy){
  const cx=Math.floor(wx/TILE), cy=Math.floor(wy/TILE), R=3;
  for(let dy=-R;dy<=R;dy++) for(let dx=-R;dx<=R;dx++){
    if(dx*dx+dy*dy>R*R) continue;
    const tx=cx+dx, ty=cy+dy, t=tileAt(tx,ty), def=tileDef(t);
    if(t!==AIR && t!==BEDROCK && !def.isAltar && !def.isChest) setTile(tx,ty,AIR);
  }
  const rad=R*TILE+8;
  for(const m of state.mobs){
    if(Math.hypot(m.x+m.w/2-wx, m.y+m.h/2-wy)<rad){ m.hp-=65; m.vx+=(m.x<wx?-1:1)*6; m.vy=-5; }
  }
  if(state.boss && Math.hypot(state.boss.x+state.boss.w/2-wx, state.boss.y+state.boss.h/2-wy)<rad+24) hitBoss(75);
  const p=state.player;
  if(Math.hypot(p.x+p.w/2-wx, p.y+p.h/2-wy)<rad) damagePlayer(22);
  spawnParticles(wx,wy,'#ff8a3c',34);
  state.waves.push({ x:wx, y:wy, r:6, max:rad, life:320 });
}
export function updateBombs(dt){
  for(let i=state.bombs.length-1;i>=0;i--){
    const b=state.bombs[i];
    b.vx*=0.99; b.vy += 0.32*dt;
    let nx=b.x+b.vx*dt;
    if(!tileSolid(tileAt(Math.floor(nx/TILE),Math.floor(b.y/TILE)))) b.x=nx; else b.vx*=-0.4;
    let ny=b.y+b.vy*dt;
    if(!tileSolid(tileAt(Math.floor(b.x/TILE),Math.floor(ny/TILE)))) b.y=ny; else { b.vy*=-0.3; b.vx*=0.7; }
    b.fuse -= dt*16.7;
    if(b.fuse<=0){ explode(b.x,b.y); state.bombs.splice(i,1); }
  }
}

export function updateEffects(dt){
  const ms = dt*16.7;
  for(let i=state.zaps.length-1;i>=0;i--){ state.zaps[i].life-=ms; if(state.zaps[i].life<=0) state.zaps.splice(i,1); }
  for(let i=state.waves.length-1;i>=0;i--){
    const w=state.waves[i]; w.life-=ms; w.r += (w.max-w.r)*0.18*dt;
    if(w.life<=0) state.waves.splice(i,1);
  }
  for(let i=state.flashes.length-1;i>=0;i--){ state.flashes[i].life-=ms; if(state.flashes[i].life<=0) state.flashes.splice(i,1); }
}

export function updateProjectiles(dt){
  const p = state.player;
  for(let i=state.projectiles.length-1;i>=0;i--){
    const pr = state.projectiles[i];
    pr.age = (pr.age||0) + dt*16.7;
    // Boomerangs fly out, then curve back to the player and vanish on return.
    if(pr.boomerang && pr.age>pr.outT){
      const cx=p.x+p.w/2, cy=p.y+p.h/2;
      const ang=Math.atan2(cy-pr.y, cx-pr.x), sp=10;
      pr.vx=Math.cos(ang)*sp; pr.vy=Math.sin(ang)*sp;
      if(Math.hypot(cx-pr.x, cy-pr.y)<16){ state.projectiles.splice(i,1); continue; }
    }
    pr.x += pr.vx*dt; pr.y += pr.vy*dt;
    if(!pr.straight && !pr.boomerang) pr.vy += (pr.fiery?0.05:0.12)*dt;
    pr.life -= dt*16.7;
    if(pr.fiery && chance(0.6)) spawnParticles(pr.x, pr.y, '#ff8a3c', 1);
    const tx = Math.floor(pr.x/TILE), ty = Math.floor(pr.y/TILE);
    let hit=false;
    // beams stop at walls; boomerangs fly over terrain
    if(!pr.boomerang && tileSolid(tileAt(tx,ty))) hit=true;
    if(pr.from==='mob' && Math.abs(pr.x-(p.x+p.w/2))<14 && Math.abs(pr.y-(p.y+p.h/2))<16){
      damagePlayer(pr.dmg); hit=true;
    }
    if(pr.from==='player' && state.boss && state.boss.hp>0){
      const b=state.boss;
      if(pr.x>b.x && pr.x<b.x+b.w && pr.y>b.y && pr.y<b.y+b.h){
        if(pr.pierce||pr.boomerang){ if(!pr.hitBossDone){ hitBoss(pr.dmg); pr.hitBossDone=true; } }
        else { hitBoss(pr.dmg); hit=true; }
      }
    }
    if(pr.from==='player'){
      for(const m of state.mobs){
        if(pr.x>m.x && pr.x<m.x+m.w && pr.y>m.y && pr.y<m.y+m.h){
          if(pr.hitMobs){ if(pr.hitMobs.has(m)) continue; pr.hitMobs.add(m); } // pierce/boomerang: once per mob
          m.hp-=pr.dmg;
          if(!pr.pierce && !pr.boomerang){ hit=true; break; }
        }
      }
    }
    if(pr.life<=0 || hit) state.projectiles.splice(i,1);
  }
}
