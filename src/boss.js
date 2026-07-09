import { TILE, WORLD_W, WORLD_H, ALTAR, BRICK, AIR } from './constants.js';
import { chance, clamp, ri } from './utils.js';
import { state, world } from './state.js';
import { tileAt, setTile } from './worldgen.js';
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
  // The Fallen Knight — a huge GROUND boss (6 blocks tall) fought in a sealed
  // stone-brick arena. He's invulnerable except when his sword is stuck in the
  // ground and he's straining to pull it out; hit the glowing crack on his back
  // then. 15 back-hits kill him. Uses hp as the 15-hit counter.
  knight: {
    name:'The Fallen Knight', color:'#5b6472', dark:'#333a44', trim:'#8a94a4', eye:'#ff5a4a', crack:'#ff8a3c',
    w:46, h:94, hp:15, maxhp:15, ground:true,
    drop:{ coin:250, titanium_bar:8, cobalt_bar:5, meteorite_bar:3, meteorite_sword:1 },
    projColor:'#c0c8d4',
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

/* ---------- THE FALLEN KNIGHT (ground boss) ---------- */
export function spawnKnight(arena){
  const def = BOSS_TYPES.knight;
  const floorY = (arena.y0 + arena.h - 3) * TILE;     // top of the arena floor bricks
  const cx = (arena.x0 + arena.w/2) * TILE;
  state.boss = {
    type:'knight', x: cx + 7*TILE, y: floorY - def.h, w:def.w, h:def.h,
    hp:def.hp, maxhp:def.maxhp, vx:0, vy:0, facing:-1, t:0,
    groundY: floorY, onGround:true, arena,
    mode:'approach', modeTimer:1100, atkCount:0, pullTimer:0, roarTimer:0, backHits:0, shake:0,
  };
  document.getElementById('bossname').textContent = def.name;
  document.getElementById('bosshud').style.display='block';
  msg('⚔ The Fallen Knight rises! Strike the glowing crack on his back while his sword is stuck. ⚔');
}
function knightRect(p, x, y, w, h){ return p.x+p.w>x && p.x<x+w && p.y+p.h>y && p.y<y+h; }
function knightResetFlags(b){ b.stomped=false; b.spiked=false; b.slammed=false; }
function knightStartAttack(b, atk){
  b.pendingAtk = atk; b.mode='wind';
  b.modeTimer = atk==='slam'?650 : atk==='spikedrag'?720 : 420;
  knightResetFlags(b);
}
function updateKnight(b, def, dt){
  const p = state.player;
  b.t = (b.t||0)+dt;
  const pcx=p.x+p.w/2, bcx=b.x+b.w/2, dx=pcx-bcx;
  // gravity + rest on the arena floor
  b.vy += 0.55*dt; b.y += b.vy*dt;
  if(b.y+b.h >= b.groundY){ b.y=b.groundY-b.h; b.vy=0; b.onGround=true; } else b.onGround=false;
  b.modeTimer -= dt*16.7;
  if(b.mode==='approach') b.facing = dx>0?1:-1;      // facing LOCKS once he commits (so you can circle to his back)
  b.shake = (b.mode==='pull') ? Math.sin(b.t*22)*2 : 0;

  switch(b.mode){
    case 'approach':
      b.vx = Math.sign(dx)*Math.min(Math.abs(dx)*0.02, 1.15); b.x += b.vx*dt;
      if(b.modeTimer<=0){
        b.atkCount=(b.atkCount||0)+1;
        const close = Math.abs(dx)<95;
        let atk = (b.atkCount%3===0) ? 'slam' : (!close ? 'spikedrag' : (chance(0.5)?'stab':'stomp'));
        knightStartAttack(b, atk);
      }
      break;
    case 'wind':
      b.vx=0;
      if(b.modeTimer<=0){ b.mode=b.pendingAtk; b.modeTimer = b.pendingAtk==='stab'?380:b.pendingAtk==='stomp'?320:b.pendingAtk==='spikedrag'?260:220; }
      break;
    case 'stab': {                                     // thrust — a low hitbox you can JUMP over
      b.vx=0; const reach=64, hy=b.y+b.h*0.56, hh=16;
      const hx = b.facing>0 ? b.x+b.w : b.x-reach;
      if(knightRect(p,hx,hy,reach,hh)) damagePlayer(20);
      if(b.modeTimer<=0){ b.mode='recover'; b.modeTimer=480; }
      break;
    }
    case 'stomp':                                      // stomp — stuns the grounded player
      b.vx=0;
      if(!b.stomped){ b.stomped=true;
        state.flashes.push({color:'rgba(120,120,140,0.28)',life:130});
        for(let i=0;i<18;i++) spawnParticles(bcx+ri(-30,30), b.groundY, '#9aa0ac', 1);
        if(p.onGround && Math.abs(pcx-bcx)<140){ p.stun=1700; p.vy=-3; msg('Stunned!'); }
      }
      if(b.modeTimer<=0){ b.mode='recover'; b.modeTimer=520; }
      break;
    case 'spikedrag':                                  // rakes the ground -> a line of 5-block spikes
      b.vx=0;
      if(!b.spiked){ b.spiked=true;
        for(let i=1;i<=6;i++){ const sx=bcx + b.facing*(i*22);
          state.spikes.push({ x:sx, topY:b.groundY, len:80, life:3000, max:3000, grow:0, delay:i*80 }); }
        msg('The Knight rakes the ground — spikes erupt!');
      }
      if(b.modeTimer<=0){ b.mode='recover'; b.modeTimer=520; }
      break;
    case 'slam':                                       // slam sword into ground -> stuck; strain to pull it out
      b.vx=0;
      if(!b.slammed){ b.slammed=true;
        for(let i=0;i<20;i++) spawnParticles(bcx+b.facing*30, b.groundY, '#c0c8d4', 1);
        state.flashes.push({color:'rgba(160,170,190,0.22)',life:130});
        b.mode='pull'; b.pullTimer=3500;
      }
      break;
    case 'pull':                                       // 3.5s vulnerable window — hit his back!
      b.vx=0; b.pullTimer -= dt*16.7;
      if(b.pullTimer<=0){ for(let i=0;i<12;i++) spawnParticles(bcx, b.y+b.h*0.5, '#c0c8d4', 1); b.mode='approach'; b.modeTimer=1000; knightResetFlags(b); }
      break;
    case 'roar': {                                     // 2s roar knockback after a back-hit
      b.vx=0; b.roarTimer -= dt*16.7;
      const away = Math.sign(pcx-bcx)||1; p.vx = away*6.5;
      if(b.roarTimer<=0){ if(b.pullTimer>0) b.mode='pull'; else { b.mode='approach'; b.modeTimer=1000; knightResetFlags(b); } }
      break;
    }
    case 'recover':
      b.vx=0; if(b.modeTimer<=0){ b.mode='approach'; b.modeTimer=ri(650,1200); knightResetFlags(b); }
      break;
  }
  // keep him inside the arena
  const ax0=(b.arena.x0+1)*TILE, ax1=(b.arena.x0+b.arena.w-1)*TILE;
  b.x = clamp(b.x, ax0, ax1-b.w);
  // walking-into-him contact damage (not while stuck/roaring)
  if(b.mode!=='pull' && b.mode!=='roar' && b.mode!=='slam' &&
     Math.abs(bcx-pcx)<b.w/2+6 && p.y+p.h>b.y && p.y<b.y+b.h) damagePlayer(14);
  document.getElementById('bosshpfill').style.width = (100*b.hp/b.maxhp)+'%';
}

// Ground spikes (from spikedrag) rise, damage the player, and fade after 3s.
export function updateSpikes(dt){
  const p=state.player;
  for(let i=state.spikes.length-1;i>=0;i--){
    const s=state.spikes[i];
    if(s.delay>0){ s.delay-=dt*16.7; continue; }
    s.life -= dt*16.7;
    s.grow = Math.min(1, (s.grow||0) + dt*0.12);
    const topY = s.topY - s.len*s.grow;
    if(p.x+p.w>s.x-6 && p.x<s.x+6 && p.y+p.h>topY && p.y<s.topY) damagePlayer(12);
    if(s.life<=0) state.spikes.splice(i,1);
  }
}

// Trigger a sealed-arena fight when the player walks inside; shut the gate.
export function updateArena(dt){
  if(state.boss || !world) return;
  const arenas = world.arenas||[];
  const p=state.player, px=(p.x+p.w/2)/TILE, py=(p.y+p.h/2)/TILE;
  for(const a of arenas){
    if(a.triggered || a.cleared) continue;
    if(px>a.x0+2 && px<a.x0+a.w-2 && py>a.y0+2 && py<a.y0+a.h-2){
      a.triggered = true;
      for(let gy=a.gateY; gy<a.gateY+a.gateH; gy++){ setTile(a.gateX,gy,BRICK); setTile(a.gateX-1,gy,BRICK); } // seal the gate
      state.flashes.push({color:'rgba(0,0,0,0.4)',life:200});
      msg('The gate slams shut behind you!');
      spawnKnight(a);
    }
  }
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
  if(b.type==='knight'){
    // invulnerable unless straining to pull his sword out, and only on his BACK
    if(b.mode!=='pull'){ spawnParticles(b.x+b.w/2, b.y+b.h*0.5, '#dfe4ec', 3); return; } // clang
    const p=state.player, side=Math.sign((p.x+p.w/2)-(b.x+b.w/2));
    if(side !== -b.facing){ spawnParticles(b.x+b.w/2, b.y+b.h*0.4, '#dfe4ec', 2); return; } // not the back
    b.hp -= 1; b.backHits=(b.backHits||0)+1;
    const crackX = b.x + (b.facing>0 ? 4 : b.w-4);
    for(let i=0;i<9;i++) spawnParticles(crackX, b.y+b.h*0.42, BOSS_TYPES.knight.crack, 1);
    b.roarTimer=2000; b.mode='roar';                    // roar + knockback for 2s
    state.flashes.push({color:'rgba(255,120,60,0.18)', life:170});
    msg('The Knight roars! ('+b.backHits+'/15)');
    if(b.hp<=0) defeatBoss();
    return;
  }
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
  if(b.type==='knight' && b.arena){                 // unseal the gate so you can leave
    const a=b.arena; a.cleared=true; a.triggered=false;
    for(let gy=a.gateY; gy<a.gateY+a.gateH; gy++){ setTile(a.gateX,gy,AIR); setTile(a.gateX-1,gy,AIR); }
    state.spikes.length=0;
  }
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
  updateArena(dt);
  updateSpikes(dt);
  if(!state.boss){ if(state.bossCooldown>0) state.bossCooldown -= dt*16.7; return; }
  const b=state.boss, p=state.player, def=BOSS_TYPES[b.type];
  if(b.type==='knight'){ updateKnight(b, def, dt); return; }
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
