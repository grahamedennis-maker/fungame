import { TILE, WORLD_W, WORLD_H, ALTAR } from './constants.js';
import { chance, clamp } from './utils.js';
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
    projColor:'#c98cff', attacks:['volley','charge'],
  },
  magma: {
    name:'Cinder Colossus', color:'#7a2e18', chargeColor:'#ff6a2c', eye:'#ffcf5a',
    w:64, h:56, hp:1050, drop:{ ember_core:6, gold_bar:6, coin:120, fire_sword:1, sunfury:1 },
    projColor:'#ff8a3c', attacks:['fireRain','charge'],
  },
  frost: {
    name:'Glacial Warden', color:'#2b5a7a', chargeColor:'#8fe0ff', eye:'#e8faff',
    w:58, h:54, hp:980, drop:{ frost_core:6, iron_bar:8, coin:120, water_trident:1, nights_edge:1 },
    projColor:'#bfefff', attacks:['iceSpread','summon'],
  },
  // Mini-boss summoned when you claim the relic legendary from its altar.
  guardian: {
    name:'Relic Guardian', color:'#6a5a3a', chargeColor:'#c9b06a', eye:'#ffe08a',
    w:44, h:42, hp:480, drop:{ coin:90, gold_bar:3, thunder_shard:2 },
    projColor:'#ffe08a', attacks:['volley','charge'],
  },
};

export function spawnBoss(tag){
  const type = BOSS_TYPES[tag] ? tag : 'storm';
  const def = BOSS_TYPES[type];
  const alt = findAltar(tag);
  const x = alt ? alt.x*TILE - def.w/2 : (WORLD_W-24)*TILE;
  const y = alt ? (alt.y-9)*TILE : 60*TILE;
  state.boss = { type, x, y, w:def.w, h:def.h, hp:def.hp, maxhp:def.hp,
    vx:0, vy:0, phase:1, attackTimer:1500, mode:'move', modeTimer:0, facing:1 };
  document.getElementById('bossname').textContent = def.name;
  document.getElementById('bosshud').style.display='block';
  msg(def.name + ' awakens!');
}

// Spawn a mini-boss at a world position (used when claiming the relic).
export function spawnMiniBoss(wx, wy){
  const def = BOSS_TYPES.guardian;
  state.boss = { type:'guardian', x:wx-def.w/2, y:wy-def.h-4, w:def.w, h:def.h,
    hp:def.hp, maxhp:def.hp, vx:0, vy:0, phase:1, attackTimer:1200, mode:'move', modeTimer:0, facing:1 };
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

export function updateBoss(dt){
  if(!state.boss){ if(state.bossCooldown>0) state.bossCooldown -= dt*16.7; return; }
  const b = state.boss, p = state.player;
  const def = BOSS_TYPES[b.type];
  b.phase = b.hp < b.maxhp*0.35 ? 3 : (b.hp<b.maxhp*0.7 ? 2 : 1);
  const speedMul = b.phase===3?1.8:(b.phase===2?1.3:1);
  const dx = (p.x+p.w/2) - (b.x+b.w/2);
  const dmgUp = b.phase===3?6:(b.phase===2?3:0);
  b.facing = dx>0?1:-1;
  b.attackTimer -= dt*16.7;
  b.modeTimer -= dt*16.7;

  if(b.mode==='move'){
    b.vx = clamp(dx*0.01,-2.6,2.6)*speedMul;
    b.y += Math.sin(state.time*0.004)*0.4;
    if(b.attackTimer<=0){
      b.attackTimer = b.phase===3?900:1500;
      const atk = def.attacks[Math.floor(chance(0.5)?0:1) % def.attacks.length];
      doBossAttack(b, def, atk, dx, dmgUp);
    }
  } else if(b.mode==='charge'){
    b.vx = b.chargeVX;
    if(b.modeTimer<=0) b.mode='move';
  }
  b.x += b.vx*dt;
  b.x = clamp(b.x, 4*TILE, (WORLD_W-8)*TILE-b.w);
  b.y = clamp(b.y, 8*TILE, (WORLD_H-20)*TILE);

  if(Math.abs((b.x+b.w/2)-(p.x+p.w/2))<b.w/2+8 && Math.abs((b.y+b.h/2)-(p.y+p.h/2))<b.h/2+10){
    damagePlayer(16+dmgUp);
  }
  document.getElementById('bosshpfill').style.width = (100*b.hp/b.maxhp)+'%';
}

function doBossAttack(b, def, atk, dx, dmgUp){
  const p = state.player;
  switch(atk){
    case 'charge':
      b.mode='charge'; b.modeTimer=600; b.chargeVX = clamp(dx*0.04,-6,6)*(b.phase===3?1.8:1);
      break;
    case 'volley':
      shootSpread(b, def, dx, 3, 3, 2.4, 12+dmgUp);
      break;
    case 'fireRain': // rain fireballs from above across the arena
      for(let i=0;i<5;i++){
        const fx = p.x + (i-2)*40 + (chance(0.5)?8:-8);
        state.projectiles.push({ x:fx, y:b.y-40, vx:0, vy:3.2, life:4000, from:'mob', dmg:14+dmgUp, color:def.projColor });
      }
      break;
    case 'iceSpread': // wide fan of icy shards
      shootSpread(b, def, dx, 6, 5, 1.8, 11+dmgUp);
      break;
    case 'summon': // call frost wraiths to its side (imported lazily to avoid cycle)
      import('./mobs.js').then(m=>{
        for(let i=0;i<2;i++){
          const ox = clamp((b.x/TILE)+ (i?4:-4), 3, WORLD_W-4);
          m.spawnMob('frost_wraith', ox*TILE, b.y);
        }
      });
      msg(def.name+' summons wraiths!');
      break;
  }
}
