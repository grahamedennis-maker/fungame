import { TILE, WORLD_W, WORLD_H } from './constants.js';
import { ri, chance, clamp } from './utils.js';
import { state, world } from './state.js';
import { tileAt, tileSolid } from './worldgen.js';
import { moveEntity, damagePlayer } from './player.js';
import { addItem } from './inventory.js';
import { spawnParticles } from './particles.js';

export const MOB_TYPES = {
  slime:    { name:'Cave Slime', w:16,h:12, hp:18, dmg:6, speed:0.7, color:'#4fd67a', drop:{coin:2}, contactCd:800 },
  zombie:   { name:'Zombie', w:12,h:24, hp:34, dmg:10, speed:1.05, color:'#5b7a4a', drop:{coin:4}, contactCd:900 },
  skeleton: { name:'Dungeon Skeleton', w:12,h:24, hp:30, dmg:8, speed:0.85, color:'#d8d8c0', drop:{coin:5,thunder_shard:1}, ranged:true, contactCd:1200 },
};

export function spawnMob(type, x, y){
  const def = MOB_TYPES[type];
  state.mobs.push({ type, x, y, w:def.w, h:def.h, vx:0, vy:0, hp:def.hp, maxhp:def.hp,
    onGround:false, contactTimer:0, shootTimer:ri(500,1500), facing:1 });
}

export function isNight(){
  const f = (state.time % state.dayLength)/state.dayLength;
  return f>0.5;
}
export function dayFrac(){ return (state.time % state.dayLength)/state.dayLength; }

export function inDungeonArea(tx,ty){
  const d = world.dungeon;
  return tx>=d.x-4 && tx<=d.x+d.w+4 && ty>=d.y-2 && ty<=d.y+d.h+2;
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

  if(inDungeonArea(ptx,pty) && chance(0.8)){
    const ox = clamp(ptx + ri(-10,10), 2, WORLD_W-3);
    const oy = clamp(pty + ri(-3,3), 2, WORLD_H-6);
    if(!tileSolid(tileAt(ox,oy))) spawnMob('skeleton', ox*TILE, oy*TILE);
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
    if(dist < 260){
      m.vx = m.facing*def.speed*TILE/16;
      if(def.ranged && dist<200){ m.vx *= 0.3; }
    } else m.vx *= 0.9;
    if(m.type==='slime' && m.onGround && chance(0.02)) m.vy = -7;
    moveEntity(m, dt);

    if(def.ranged){
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
