import { TILE, REACH, AIR, ALTAR, COAL, IRON, GOLD, THORIUM } from './constants.js';
import { clamp, ri } from './utils.js';
import { state } from './state.js';
import { tileAt, setTile, tileDef, tileSolid } from './worldgen.js';
import { ITEMS } from './tiles.js';
import { hotbarItem, addItem, removeItem, countItem } from './inventory.js';
import { spawnParticles } from './particles.js';
import { damagePlayer } from './player.js';
import { hitBoss, spawnBoss } from './boss.js';
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
  const dmg = tool ? (tool.dmg||5) : 3;

  if(tool && tool.tool==='bow' && countItem('arrow')>0){
    removeItem('arrow',1);
    const p = state.player;
    state.projectiles.push({ x:p.x+p.w/2, y:p.y+p.h/2, vx: p.facing*7, vy:-1, life:1800, from:'player', dmg });
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

export function updateMining(dt){
  if(!state.mining) { document.getElementById('mining').style.display='none'; return; }
  const { tx,ty } = state.mining;
  const t = tileAt(tx,ty);
  const def = tileDef(t);
  if(t===AIR || !reachOk(tx,ty)){ state.mining=null; return; }
  const tool = currentTool();
  const power = tool && tool.tool==='pick' ? tool.power : 0.45;
  const tier = tool && tool.tool==='pick' ? tool.tier : -1;
  if(def.tier>0 && tier<def.tier){
    msg('Need a better pickaxe for '+def.name); state.mining=null; return;
  }
  state.mining.progress += power*dt*0.9;
  const need = def.hardness*20;
  document.getElementById('mining').style.display='block';
  const sx = tx*TILE - state.camX, sy = ty*TILE - state.camY;
  const mel = document.getElementById('mining');
  mel.style.left = (sx-5)+'px'; mel.style.top = (sy-10)+'px';
  document.getElementById('miningfill').style.width = clamp(100*state.mining.progress/need,0,100)+'%';
  if(state.mining.progress>=need){
    if(def.isChest){ openChest(tx,ty); }
    else if(def.isAltar){ /* handled on right click */ }
    else {
      if(def.drop) addItem(def.drop,1);
      if(t===COAL||t===IRON||t===GOLD||t===THORIUM) msg('Found '+def.name+'!');
      setTile(tx,ty,AIR);
    }
    state.mining=null;
  }
}

const dungeonLoot = ['thunder_shard','gold_bar','iron_bar','storm_core','arrow'];
export function openChest(tx,ty){
  setTile(tx,ty,AIR);
  const rolls = ri(2,3);
  for(let i=0;i<rolls;i++){
    const id = dungeonLoot[ri(0,dungeonLoot.length-1)];
    const n = id==='arrow'?ri(4,10):ri(1,3);
    addItem(id,n);
  }
  msg('Opened a dungeon chest!');
}

export function tryAltarInteract(tx,ty){
  if(tileAt(tx,ty)!==ALTAR) return false;
  if(state.boss){ msg('The Storm King is already unleashed!'); return true; }
  if(state.bossDefeated===false && state.bossCooldown>0){ msg('The altar is quiet... for now.'); return true; }
  spawnBoss();
  return true;
}

export function updateProjectiles(dt){
  const p = state.player;
  for(let i=state.projectiles.length-1;i>=0;i--){
    const pr = state.projectiles[i];
    pr.x += pr.vx*dt; pr.y += pr.vy*dt; pr.vy += 0.12*dt;
    pr.life -= dt*16.7;
    const tx = Math.floor(pr.x/TILE), ty = Math.floor(pr.y/TILE);
    let hit=false;
    if(tileSolid(tileAt(tx,ty))) hit=true;
    if(pr.from==='mob' && Math.abs(pr.x-(p.x+p.w/2))<14 && Math.abs(pr.y-(p.y+p.h/2))<16){
      damagePlayer(pr.dmg); hit=true;
    }
    if(pr.from==='player' && state.boss && state.boss.hp>0){
      const b=state.boss;
      if(pr.x>b.x && pr.x<b.x+b.w && pr.y>b.y && pr.y<b.y+b.h){ hitBoss(pr.dmg); hit=true; }
    }
    if(pr.from==='player'){
      for(const m of state.mobs){
        if(pr.x>m.x && pr.x<m.x+m.w && pr.y>m.y && pr.y<m.y+m.h){ m.hp-=pr.dmg; hit=true; break; }
      }
    }
    if(pr.life<=0 || hit) state.projectiles.splice(i,1);
  }
}
