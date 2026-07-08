import { AIR, TILE } from './constants.js';
import { state, world } from './state.js';
import { ITEMS } from './tiles.js';
import { tileAt, setTile, tileDef } from './worldgen.js';
import { canvas } from './canvas.js';
import { toggleInv, toggleSettings, toggleShop, renderHotbar } from './ui.js';
import { hotbarItem, removeItem } from './inventory.js';
import { screenToWorld, worldToTile, reachOk, tryMob, doAttack, doSpecial, tryAltarInteract, openChest, throwBomb, useConsumable } from './combat.js';

function nearVillager(){
  if(!world || !world.villager) return false;
  const p = state.player;
  const vx = world.villager.tx*TILE, vy = world.villager.ty*TILE;
  return Math.hypot((p.x+p.w/2)-vx, (p.y+p.h/2)-vy) < 3*TILE;
}

export function initInput(){
  window.addEventListener('keydown', e=>{
    state.keys[e.key.toLowerCase()] = true;
    if(e.key.toLowerCase()==='e'){ toggleInv(); }
    if(e.key.toLowerCase()==='q'){ doSpecial(); }
    if(e.key==='Escape'){ if(state.shopOpen) toggleShop(); else toggleSettings(); }
    const n = parseInt(e.key);
    if(n>=1 && n<=8){ state.hotbarSel = n-1; renderHotbar(); }
    if(e.key===' ') e.preventDefault();
  });
  window.addEventListener('keyup', e=>{ state.keys[e.key.toLowerCase()] = false; });

  document.getElementById('settingsbtn').addEventListener('click', toggleSettings);
  document.getElementById('specialbtn').addEventListener('click', ()=>doSpecial());

  canvas.addEventListener('contextmenu', e=>e.preventDefault());
  canvas.addEventListener('mousemove', e=>{ state.mouse.x=e.clientX; state.mouse.y=e.clientY; });
  canvas.addEventListener('mousedown', e=>{
    state.mouse.down=true; state.mouse.button=e.button;
    handleClick(e.clientX,e.clientY,e.button);
  });
  canvas.addEventListener('mouseup', ()=>{ state.mouse.down=false; state.mining=null; if(state.mineHits) state.mineHits.clear(); });
}

function handleClick(sx,sy,button){
  if(state.invOpen || state.settingsOpen || state.shopOpen) return;
  const w = screenToWorld(sx,sy);
  const { tx,ty } = worldToTile(w.x,w.y);

  if(button===2){
    const it = hotbarItem();
    const t = tileAt(tx,ty);
    const inReach = reachOk(tx,ty);
    // shop
    if(world.villager && Math.abs(tx-world.villager.tx)<=1 && Math.abs(ty-world.villager.ty)<=1 && nearVillager()){ toggleShop(); return; }
    // interact with chest / altar when in reach
    if(inReach && tileDef(t).isChest){ openChest(tx,ty); return; }
    if(inReach && tileDef(t).isAltar){ tryAltarInteract(tx,ty); return; }
    // drink a potion (consumable)
    if(it && ITEMS[it.id] && ITEMS[it.id].heal){ useConsumable(); renderHotbar(); return; }
    // throw TNT toward the cursor (any distance)
    if(it && ITEMS[it.id] && ITEMS[it.id].throwable){ throwBomb(); removeItem(it.id,1); renderHotbar(); return; }
    // place a block when in reach
    if(inReach && t===AIR && it && ITEMS[it.id] && ITEMS[it.id].place){
      setTile(tx,ty, ITEMS[it.id].place); removeItem(it.id,1); renderHotbar(); return;
    }
    // otherwise, right-click casts the held weapon's special
    if(it && ITEMS[it.id] && ITEMS[it.id].special){ doSpecial(); return; }
    return;
  }

  // left click
  if(!reachOk(tx,ty)) return;
  const m = tryMob();
  if(m || state.boss){ doAttack(); return; }
  const t = tileAt(tx,ty);
  if(t!==AIR && t!==undefined && tileDef(t).isAltar){ tryAltarInteract(tx,ty); return; } // click altar to summon boss
  const it2 = hotbarItem();
  const isPick = it2 && ITEMS[it2.id] && ITEMS[it2.id].tool==='pick';
  // Pickaxes mine (handled continuously in updateMining — just hold and drag).
  // Everything else swings a weapon; weapons never mine.
  if(!isPick) doAttack();
}
