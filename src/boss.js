import { TILE, WORLD_W, WORLD_H, ALTAR } from './constants.js';
import { chance, clamp } from './utils.js';
import { state, world } from './state.js';
import { tileAt } from './worldgen.js';
import { damagePlayer } from './player.js';
import { spawnParticles } from './particles.js';
import { addItem } from './inventory.js';
import { msg } from './ui.js';

/* ---------- BOSS ---------- */
export function spawnBoss(){
  const alt = findAltar();
  const x = alt ? alt.x*TILE : (WORLD_W-24)*TILE;
  const y = alt ? (alt.y-8)*TILE : 60*TILE;
  state.boss = { x, y, w:60, h:52, hp:900, maxhp:900, vx:0, vy:0, phase:1,
    attackTimer:1500, mode:'move', modeTimer:0, facing:1 };
  document.getElementById('bosshud').style.display='block';
  msg('The Storm King awakens!');
}
export function findAltar(){
  const d = world.dungeon;
  for(let y=d.y;y<d.y+d.h+2;y++) for(let x=d.x-4;x<d.x+d.w+4;x++){
    if(tileAt(x,y)===ALTAR) return {x,y};
  }
  return null;
}
export function hitBoss(dmg){
  const b = state.boss; if(!b) return;
  b.hp -= dmg;
  spawnParticles(b.x+b.w/2,b.y+b.h/2,'#c98cff',5);
  if(b.hp<=0) defeatBoss();
}
export function defeatBoss(){
  const b = state.boss;
  msg('The Storm King has fallen!');
  addItem('thunder_shard', 4);
  addItem('storm_core', 2);
  addItem('gold_bar', 6);
  spawnParticles(b.x+b.w/2,b.y+b.h/2,'#ffd700',30);
  state.boss = null;
  state.bossCooldown = 60000;
  document.getElementById('bosshud').style.display='none';
}
export function updateBoss(dt){
  if(!state.boss){ if(state.bossCooldown>0) state.bossCooldown -= dt*16.7; return; }
  const b = state.boss, p = state.player;
  b.phase = b.hp < b.maxhp*0.35 ? 3 : (b.hp<b.maxhp*0.7 ? 2 : 1);
  const speedMul = b.phase===3?1.8:(b.phase===2?1.3:1);
  const dx = (p.x+p.w/2) - (b.x+b.w/2);
  b.facing = dx>0?1:-1;
  b.attackTimer -= dt*16.7;
  b.modeTimer -= dt*16.7;

  if(b.mode==='move'){
    b.vx = clamp(dx*0.01,-2.6,2.6)*speedMul;
    b.vy += Math.sin(state.time*0.002)*0.02;
    b.y += Math.sin(state.time*0.004)*0.4;
    if(b.attackTimer<=0){
      b.attackTimer = b.phase===3?900:1500;
      if(chance(0.5)){
        b.mode='charge'; b.modeTimer=600; b.chargeVX = clamp(dx*0.04,-6,6)*speedMul;
      } else {
        for(let a=-1;a<=1;a++) state.projectiles.push({x:b.x+b.w/2,y:b.y+b.h/2,vx:a*3+dx*0.005,vy:2.4,life:3000,from:'mob',dmg:b.phase===3?18:12});
      }
    }
  } else if(b.mode==='charge'){
    b.vx = b.chargeVX;
    if(b.modeTimer<=0) b.mode='move';
  }
  b.x += b.vx*dt;
  b.x = clamp(b.x, 4*TILE, (WORLD_W-8)*TILE-b.w);
  b.y = clamp(b.y, 20*TILE, (WORLD_H-20)*TILE);

  if(Math.abs((b.x+b.w/2)-(p.x+p.w/2))<b.w/2+8 && Math.abs((b.y+b.h/2)-(p.y+p.h/2))<b.h/2+10){
    damagePlayer(b.phase===3?22:16);
  }
  document.getElementById('bosshpfill').style.width = (100*b.hp/b.maxhp)+'%';
}
