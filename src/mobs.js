import { TILE, WORLD_W, WORLD_H } from './constants.js';
import { ri, chance, clamp } from './utils.js';
import { state, world } from './state.js';
import { tileAt, tileSolid } from './worldgen.js';
import { moveEntity, damagePlayer } from './player.js';
import { addItem } from './inventory.js';
import { spawnParticles } from './particles.js';

export const MOB_TYPES = {
  slime:    { name:'Cave Slime', w:16,h:12, hp:18, dmg:6, speed:0.7, color:'#4fd67a', drop:{coin:6}, contactCd:800 },
  zombie:   { name:'Zombie', w:12,h:24, hp:34, dmg:10, speed:1.05, color:'#5b7a4a', drop:{coin:12}, contactCd:900 },
  skeleton: { name:'Storm Skeleton', w:12,h:24, hp:30, dmg:8, speed:0.85, color:'#d8d8c0', drop:{coin:14,thunder_shard:1,storm_core:1}, ranged:true, contactCd:1200 },
  // boss-themed dungeon mobs
  magma_imp:{ name:'Magma Imp', w:14,h:14, hp:26, dmg:12, speed:1.2, color:'#ff6a2c', drop:{coin:15,ember_core:1}, contactCd:700, jumpy:true },
  frost_wraith:{ name:'Frost Wraith', w:14,h:22, hp:38, dmg:11, speed:0.95, color:'#8fe0ff', drop:{coin:15,frost_core:1}, ranged:true, contactCd:1000 },
};

// which mob type haunts each dungeon theme
export const DUNGEON_MOB = { magma:'magma_imp', frost:'frost_wraith', storm:'skeleton' };

function inArena(x, y){
  const tx=x/TILE, ty=y/TILE;
  for(const a of (world && world.arenas || [])){
    if(tx>a.x0-2 && tx<a.x0+a.w+2 && ty>a.y0-2 && ty<a.y0+a.h+2) return true;
  }
  return false;
}
export function spawnMob(type, x, y){
  if(inArena(x,y)) return;            // boss arenas stay clear of regular mobs
  const def = MOB_TYPES[type];
  state.mobs.push({ type, x, y, w:def.w, h:def.h, vx:0, vy:0, hp:def.hp, maxhp:def.hp,
    onGround:false, contactTimer:0, shootTimer:ri(500,1500), facing:1 });
}

export function isNight(){
  const f = (state.time % state.dayLength)/state.dayLength;
  return f>0.5;
}
export function dayFrac(){ return (state.time % state.dayLength)/state.dayLength; }

// Returns the dungeon whose bounds contain the tile, or null.
export function dungeonAt(tx,ty){
  for(const d of (world.dungeons||[])){
    if(tx>=d.x-4 && tx<=d.x+d.w+4 && ty>=d.y-2 && ty<=d.y+d.h+2) return d;
  }
  return null;
}
export function inDungeonArea(tx,ty){ return !!dungeonAt(tx,ty); }

export function inCaveArea(tx,ty){
  const caves = world.caves || [];
  for(const c of caves){
    if(tx>=c.x0 && tx<=c.x1 && ty>=c.y0 && ty<=c.y1) return true;
  }
  return false;
}

let spawnTimer = 0;
export function updateSpawning(dt){
  spawnTimer -= dt*16.7;
  if(spawnTimer>0) return;
  spawnTimer = ri(2200,4200);
  if(state.mobs.length>18) return;
  const p = state.player;
  const ptx = Math.floor(p.x/TILE), pty = Math.floor(p.y/TILE);
  const openSky = !tileSolid(tileAt(ptx,pty-1)) && pty < world.surface[clamp(ptx,0,WORLD_W-1)]+2;

  const dgn = dungeonAt(ptx,pty);
  if(dgn && chance(0.8)){
    const type = DUNGEON_MOB[dgn.tag] || 'skeleton';
    for(let tries=0;tries<12;tries++){
      const ox = clamp(ptx + ri(-10,10), 2, WORLD_W-3);
      const oy = clamp(pty + ri(-4,4), 2, WORLD_H-6);
      if(!tileSolid(tileAt(ox,oy)) && !tileSolid(tileAt(ox,oy+1))){
        spawnMob(type, ox*TILE, oy*TILE); break;
      }
    }
    return;
  }
  if(!openSky && inCaveArea(ptx,pty) && chance(0.85)){
    spawnTimer = ri(1200,2600);
    for(let tries=0;tries<10;tries++){
      const ox = clamp(ptx + ri(-12,12), 2, WORLD_W-3);
      const oy = clamp(pty + ri(-8,8), 25, WORLD_H-6);
      if(!tileSolid(tileAt(ox,oy)) && !tileSolid(tileAt(ox,oy+1))){
        spawnMob(chance(0.55)?'zombie':'slime', ox*TILE, oy*TILE); break;
      }
    }
    return;
  }
  if(openSky && isNight() && chance(0.85)){
    const dir = chance(0.5)?-1:1;
    const ox = clamp(ptx + dir*ri(10,16), 1, WORLD_W-2);
    let oy = world.surface[clamp(ox,0,WORLD_W-1)]-2;
    spawnMob('zombie', ox*TILE, oy*TILE);
    return;
  }
  if(!openSky && chance(0.7)){
    for(let tries=0;tries<10;tries++){
      const ox = clamp(ptx + ri(-14,14), 2, WORLD_W-3);
      const oy = clamp(pty + ri(-8,8), 25, WORLD_H-6);
      if(!tileSolid(tileAt(ox,oy)) && !tileSolid(tileAt(ox,oy+1))){
        spawnMob('slime', ox*TILE, oy*TILE); break;
      }
    }
  }
}

export function updateMobs(dt){
  const p = state.player;
  for(let i=state.mobs.length-1;i>=0;i--){
    const m = state.mobs[i];
    const def = MOB_TYPES[m.type];
    const dx = (p.x - m.x);
    const dist = Math.abs(dx);
    m.facing = dx>0?1:-1;

    // elemental status effects (from whips): burn = damage over time,
    // freeze = heavily slowed, shock = stunned + zapped.
    const ms = dt*16.7;
    let speedMul = 1;
    if(m.burn>0){ m.burn-=ms; m.burnTick=(m.burnTick||0)-ms; if(m.burnTick<=0){ m.hp-=4; m.burnTick=300; spawnParticles(m.x+m.w/2, m.y, '#ff7a2c', 2); } }
    if(m.freeze>0){ m.freeze-=ms; speedMul=0.18; }
    if(m.shock>0){ m.shock-=ms; speedMul=0; m.shockTick=(m.shockTick||0)-ms; if(m.shockTick<=0){ m.hp-=2; m.shockTick=250; spawnParticles(m.x+m.w/2, m.y+m.h/2, '#e8faff', 2); } }

    if(dist < 260){
      m.vx = m.facing*def.speed*speedMul*TILE/16;
      if(def.ranged && dist<200){ m.vx *= 0.3; }
    } else m.vx *= 0.9;
    if((m.type==='slime' || def.jumpy) && m.onGround && speedMul>0 && chance(0.02)) m.vy = -7;
    moveEntity(m, dt);

    if(def.ranged && !(m.freeze>0) && !(m.shock>0)){
      m.shootTimer -= dt*16.7;
      if(m.shootTimer<=0 && dist<220 && dist>20){
        m.shootTimer = ri(1400,2200);
        state.projectiles.push({ x:m.x+m.w/2, y:m.y+m.h/2, vx: (dx>0?1:-1)*4.2, vy:-1.5, life:2000, from:'mob', dmg:def.dmg });
      }
    }
    m.contactTimer -= dt*16.7;
    if(dist<18 && Math.abs(p.y-m.y)<28 && m.contactTimer<=0){
      damagePlayer(def.dmg);
      m.contactTimer = def.contactCd;
      p.vx += (dx>0?-1:1)*2;
    }
    if(m.hp<=0){
      for(const k in def.drop) addItem(k, def.drop[k]);
      spawnParticles(m.x+m.w/2, m.y+m.h/2, def.color, 8);
      state.mobs.splice(i,1);
    }
    if(m.y>WORLD_H*TILE+400) state.mobs.splice(i,1);
  }
}
