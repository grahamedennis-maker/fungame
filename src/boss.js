import { TILE, WORLD_W, WORLD_H, ALTAR } from './constants.js';
import { chance, clamp, ri } from './utils.js';
import { state, world } from './state.js';
import { tileAt } from './worldgen.js';
import { damagePlayer } from './player.js';
import { spawnParticles } from './particles.js';
import { addItem } from './inventory.js';
import { msg } from './ui.js';

/* ---------- BOSSES ----------
   Three themed bosses, one per dungeon. Each has its own stats, colors,
   attack set and legendary drop. `tag` links a boss to the dungeon whose
   altar summons it. */
export const BOSS_TYPES = {
  storm: {
    name:'The Storm King', color:'#6b4fa8', chargeColor:'#9b6fff', eye:'#c98cff',
    w:60, h:52, hp:900, drop:{ thunder_shard:4, storm_core:6, coin:120, thunder_hammer:1, terra_blade:1 },
    projColor:'#c98cff', attacks:['volley','charge','nova','boltStorm'],
  },
  magma: {
    name:'Cinder Colossus', color:'#7a2e18', chargeColor:'#ff6a2c', eye:'#ffcf5a',
    w:64, h:56, hp:1050, drop:{ ember_core:6, gold_bar:6, coin:120, fire_sword:1, sunfury:1 },
    projColor:'#ff8a3c', attacks:['fireRain','charge','meteor','radialBurst'],
  },
  frost: {
    name:'Glacial Warden', color:'#2b5a7a', chargeColor:'#8fe0ff', eye:'#e8faff',
    w:58, h:54, hp:980, drop:{ frost_core:6, iron_bar:8, coin:120, water_trident:1, nights_edge:1 },
    projColor:'#bfefff', attacks:['iceSpread','summon','blizzard','nova'],
  },
  // Mini-boss summoned when you claim the relic legendary from its altar.
  guardian: {
    name:'Relic Guardian', color:'#6a5a3a', chargeColor:'#c9b06a', eye:'#ffe08a',
    w:44, h:42, hp:480, drop:{ coin:90, gold_bar:3, thunder_shard:2 },
    projColor:'#ffe08a', attacks:['volley','charge','nova'],
  },
};

export function spawnBoss(tag){
  const type = BOSS_TYPES[tag] ? tag : 'storm';
  const def = BOSS_TYPES[type];
  const alt = findAltar(tag);
  const x = alt ? alt.x*TILE - def.w/2 : (WORLD_W-24)*TILE;
  const y = alt ? (alt.y-9)*TILE : 60*TILE;
  state.boss = { type, x, y, w:def.w, h:def.h, hp:def.hp, maxhp:def.hp,
    vx:0, vy:0, phase:1, attackTimer:1500, mode:'move', modeTimer:1600, facing:1, t:0, orbA:0, orbDir:1, chargeVY:0 };
  document.getElementById('bossname').textContent = def.name;
  document.getElementById('bosshud').style.display='block';
  msg(def.name + ' awakens!');
}

// Spawn a mini-boss at a world position (used when claiming the relic).
export function spawnMiniBoss(wx, wy){
  const def = BOSS_TYPES.guardian;
  state.boss = { type:'guardian', x:wx-def.w/2, y:wy-def.h-4, w:def.w, h:def.h,
    hp:def.hp, maxhp:def.hp, vx:0, vy:0, phase:1, attackTimer:1200, mode:'move', modeTimer:1600, facing:1, t:0, orbA:0, orbDir:1, chargeVY:0 };
  document.getElementById('bossname').textContent = def.name;
  document.getElementById('bosshud').style.display='block';
  msg('⚔ The Relic Guardian rises to reclaim its treasure! ⚔');
}

// Find the altar tile of the given dungeon (falls back to any altar).
export function findAltar(tag){
  const dgns = world.dungeons || [];
  const d = dgns.find(dd=>dd.tag===tag) || dgns[0];
  if(d && d.altar && tileAt(d.altar.x,d.altar.y)===ALTAR) return d.altar;
  for(const dd of dgns){
    if(dd.altar && tileAt(dd.altar.x,dd.altar.y)===ALTAR) return dd.altar;
  }
  return null;
}

export function hitBoss(dmg){
  const b = state.boss; if(!b) return;
  b.hp -= dmg;
  spawnParticles(b.x+b.w/2,b.y+b.h/2, BOSS_TYPES[b.type].projColor,5);
  if(b.hp<=0) defeatBoss();
}

export function defeatBoss(){
  const b = state.boss;
  const def = BOSS_TYPES[b.type];
  msg(def.name + ' has fallen!');
  for(const k in def.drop) addItem(k, def.drop[k]);
  const legendary = Object.keys(def.drop).find(k=>k.endsWith('_sword')||k.endsWith('_trident')||k.endsWith('_hammer')||k.endsWith('_bow'));
  if(legendary) msg('You obtained a legendary weapon!');
  spawnParticles(b.x+b.w/2,b.y+b.h/2,'#ffd700',30);
  state.boss = null;
  state.bossDefeated = true;
  state.bossCooldown = 20000;
  document.getElementById('bosshud').style.display='none';
}

function shootSpread(b, def, dx, count, spread, vy, dmg){
  for(let a=0;a<count;a++){
    const f = count>1 ? (a/(count-1)-0.5) : 0;
    state.projectiles.push({ x:b.x+b.w/2, y:b.y+b.h/2,
      vx: f*spread + dx*0.004, vy, life:3000, from:'mob', dmg, color:def.projColor });
  }
}

// pick + fire one of the boss's attacks
function chooseAttack(b, def, dx, dmgUp){
  doBossAttack(b, def, def.attacks[ri(0, def.attacks.length-1)], dx, dmgUp);
}
function startHover(b){
  b.mode='hover'; b.modeTimer=ri(2400,3800); b.orbDir=chance(0.5)?1:-1;
  const p=state.player;
  b.orbA = Math.atan2((b.y+b.h/2)-(p.y+p.h/2), (b.x+b.w/2)-(p.x+p.w/2));
}
function startTeleport(b, def){
  b.mode='teleport'; b.modeTimer=420;
  for(let i=0;i<18;i++) spawnParticles(b.x+b.w/2, b.y+b.h/2, def.projColor, 1);
}

export function updateBoss(dt){
  if(!state.boss){ if(state.bossCooldown>0) state.bossCooldown -= dt*16.7; return; }
  const b=state.boss, p=state.player, def=BOSS_TYPES[b.type];
  b.phase = b.hp<b.maxhp*0.35 ? 3 : (b.hp<b.maxhp*0.7 ? 2 : 1);
  const speedMul = b.phase===3?1.9:(b.phase===2?1.35:1);
  const dmgUp = b.phase===3?6:(b.phase===2?3:0);
  const pcx=p.x+p.w/2, pcy=p.y+p.h/2, bcx=b.x+b.w/2, bcy=b.y+b.h/2;
  const dx=pcx-bcx, dy=pcy-bcy, dist=Math.hypot(dx,dy)||1;
  b.facing = dx>0?1:-1;
  b.t = (b.t||0)+dt;
  b.attackTimer -= dt*16.7;
  b.modeTimer -= dt*16.7;

  if(b.mode==='move'){
    // hover-approach: ease toward a preferred stand-off distance while weaving
    const push = dist>150 ? 1 : -1;
    b.vx += (dx/dist)*push*0.09*speedMul*dt;
    b.vx = clamp(b.vx, -3.2*speedMul, 3.2*speedMul);
    b.vy = Math.sin(b.t*3.0)*1.3 + clamp(dy*0.012,-1.6,1.6);
    if(b.attackTimer<=0){ b.attackTimer = b.phase===3?700:1150; chooseAttack(b,def,dx,dmgUp); }
    if(b.modeTimer<=0){
      b.modeTimer = ri(2400,3800);
      if(b.phase>=2 && chance(0.35)) startTeleport(b,def);
      else if(chance(0.6)) startHover(b);
    }
  } else if(b.mode==='hover'){
    // orbit the player, strafing around them
    b.orbA += 0.02*speedMul*b.orbDir*dt*8;
    const R=145, tx=pcx+Math.cos(b.orbA)*R-b.w/2, ty=pcy+Math.sin(b.orbA)*R*0.55-b.h/2-16;
    b.vx=(tx-b.x)*0.09; b.vy=(ty-b.y)*0.09;
    if(b.attackTimer<=0){ b.attackTimer = b.phase===3?650:1000; chooseAttack(b,def,dx,dmgUp); }
    if(b.modeTimer<=0){ b.mode='move'; b.modeTimer=ri(1800,3000); }
  } else if(b.mode==='charge'){
    b.vx=b.chargeVX; b.vy=b.chargeVY||0;
    if(b.modeTimer<=0){ b.mode='move'; b.modeTimer=1400; }
  } else if(b.mode==='teleport'){
    b.vx*=0.8; b.vy*=0.8;
    if(b.modeTimer<=0){
      b.x = clamp(pcx + (chance(0.5)?-1:1)*ri(90,150) - b.w/2, 4*TILE, (WORLD_W-8)*TILE-b.w);
      b.y = clamp(pcy - ri(20,90), 8*TILE, (WORLD_H-20)*TILE);
      for(let i=0;i<20;i++) spawnParticles(b.x+b.w/2, b.y+b.h/2, def.projColor, 1);
      b.mode='move'; b.modeTimer=ri(1600,2600);
      chooseAttack(b, def, pcx-(b.x+b.w/2), dmgUp); // strike right after blinking in
    }
  }

  b.x += b.vx*dt; b.y += b.vy*dt;
  b.x = clamp(b.x, 4*TILE, (WORLD_W-8)*TILE-b.w);
  b.y = clamp(b.y, 8*TILE, (WORLD_H-20)*TILE);

  if(Math.abs((b.x+b.w/2)-pcx)<b.w/2+8 && Math.abs((b.y+b.h/2)-pcy)<b.h/2+10) damagePlayer(16+dmgUp);
  document.getElementById('bosshpfill').style.width = (100*b.hp/b.maxhp)+'%';
}

// even ring of projectiles in all directions
function radialShot(b, def, count, speed, dmg, spin){
  const bcx=b.x+b.w/2, bcy=b.y+b.h/2;
  for(let i=0;i<count;i++){
    const a=(i/count)*Math.PI*2 + (spin||0);
    state.projectiles.push({ x:bcx, y:bcy, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed,
      life:3200, from:'mob', dmg, color:def.projColor, straight:true });
  }
}

function doBossAttack(b, def, atk, dx, dmgUp){
  const p=state.player, bcx=b.x+b.w/2, bcy=b.y+b.h/2;
  switch(atk){
    case 'charge':
      b.mode='charge'; b.modeTimer=560;
      b.chargeVX = clamp(dx*0.05,-7,7)*(b.phase===3?1.7:1);
      b.chargeVY = clamp((p.y+p.h/2-bcy)*0.04,-3,3);
      break;
    case 'volley':    shootSpread(b, def, dx, 3, 3, 2.4, 12+dmgUp); break;
    case 'iceSpread': shootSpread(b, def, dx, 6, 5, 1.8, 11+dmgUp); break;
    case 'fireRain': // fireballs rain from above across the arena
      for(let i=0;i<5;i++){ const fx=p.x+(i-2)*40+(chance(0.5)?8:-8);
        state.projectiles.push({ x:fx, y:bcy-60, vx:0, vy:3.2, life:4000, from:'mob', dmg:14+dmgUp, color:def.projColor }); }
      break;
    case 'meteor': // heavier, angled meteor shower (scales with phase)
      for(let i=0,n=6+b.phase*2;i<n;i++){ const fx=p.x+(i-n/2)*30+ri(-14,14);
        state.projectiles.push({ x:fx, y:bcy-80, vx:(p.x-fx)*0.004, vy:2.6+ri(0,3), life:4200, from:'mob', dmg:14+dmgUp, color:def.projColor, fiery:true }); }
      break;
    case 'nova':       radialShot(b, def, 10+b.phase*2, 3.2, 12+dmgUp, b.t*0.2); break;
    case 'radialBurst': radialShot(b, def, 8, 3.6, 12+dmgUp, 0); radialShot(b, def, 8, 2.4, 12+dmgUp, Math.PI/8); break;
    case 'blizzard': // dense slow fan of shards toward the player
      for(let i=0;i<10;i++){ const a=Math.atan2(p.y-bcy, p.x-bcx)+(i-5)*0.16;
        state.projectiles.push({ x:bcx, y:bcy, vx:Math.cos(a)*2.2, vy:Math.sin(a)*2.2, life:3600, from:'mob', dmg:9+dmgUp, color:def.projColor, straight:true }); }
      break;
    case 'boltStorm': // lightning strikes rain around the player
      for(let i=0;i<3+b.phase;i++){
        const zx = p.x+p.w/2 + ri(-90,90);
        state.zaps.push({ x:zx, y0:0, y1:WORLD_H*TILE, life:280 });
        if(Math.abs((p.x+p.w/2)-zx)<18) damagePlayer(14+dmgUp);
        spawnParticles(zx, p.y, def.projColor, 6);
      }
      state.flashes.push({ color:'rgba(200,180,255,0.25)', life:140 });
      break;
    case 'summon': // call themed minions (lazy import to avoid a cycle)
      import('./mobs.js').then(m=>{
        const type = b.type==='magma'?'magma_imp':(b.type==='frost'?'frost_wraith':'skeleton');
        for(let i=0;i<2;i++){ const ox=clamp((b.x/TILE)+(i?4:-4),3,WORLD_W-4); m.spawnMob(type, ox*TILE, b.y); }
      });
      msg(def.name+' summons minions!');
      break;
  }
}
